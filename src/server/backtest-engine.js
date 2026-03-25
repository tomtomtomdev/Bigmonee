import fs from 'fs'
import path from 'path'
import { loadSnapshots, getSnapshotDates } from './snapshot-collector.js'
import { tokenManager } from './token-manager.js'

const CONFIG_PATH = path.resolve('data/config.json')
const PRICE_CACHE_PATH = path.resolve('data/price-cache.json')
const RESULT_PATH = path.resolve('data/backtest-result.json')
const BATCH_SIZE = 3
const BATCH_DELAY = 500 // ms between batches
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

const INSTITUTIONAL_BROKERS = ['ML', 'CS', 'UB', 'YP', 'KZ', 'CG', 'BK', 'GS', 'JP', 'MS']

function loadConfig() {
  const defaults = JSON.parse(fs.readFileSync(path.resolve('config.default.json'), 'utf-8'))
  try {
    const user = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
    return { ...defaults, ...user, endpoints: { ...defaults.endpoints, ...user.endpoints } }
  } catch {
    return defaults
  }
}

// --- Price Cache ---
function loadPriceCache() {
  try {
    const data = JSON.parse(fs.readFileSync(PRICE_CACHE_PATH, 'utf-8'))
    if (Date.now() - (data._timestamp || 0) > CACHE_TTL) return {}
    return data
  } catch {
    return {}
  }
}

function savePriceCache(cache) {
  cache._timestamp = Date.now()
  fs.writeFileSync(PRICE_CACHE_PATH, JSON.stringify(cache))
}

// --- Price Fetching with Rate Limiting ---
async function fetchPriceHistory(symbol) {
  const token = tokenManager.getToken()
  if (!token) return {}
  const config = loadConfig()
  const endpoint = config.endpoints.stockChart.replace('{symbol}', symbol)
  const url = new URL(config.stockbitBaseUrl + endpoint)
  url.searchParams.set('chart_type', 'PRICE_CHART_TYPE_LINE')
  url.searchParams.set('is_include_previous_historical', '1')
  url.searchParams.set('timeframe', '1year')

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'Bigmonee/1.0' },
    })
    const data = await res.json()
    const prices = data?.data?.prices || []
    const priceMap = {}
    for (const p of prices) {
      if (!p.formatted_date || !p.value) continue
      const date = p.formatted_date.slice(0, 10) // "2026-03-17"
      priceMap[date] = parseFloat(p.value)
    }
    return priceMap
  } catch {
    return {}
  }
}

async function fetchAllPrices(symbols) {
  const cache = loadPriceCache()
  const toFetch = symbols.filter((s) => !cache[s])
  console.log(`[backtest] Price cache: ${symbols.length - toFetch.length} cached, ${toFetch.length} to fetch`)

  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const batch = toFetch.slice(i, i + BATCH_SIZE)
    const results = await Promise.allSettled(batch.map(fetchPriceHistory))
    for (let j = 0; j < batch.length; j++) {
      if (results[j].status === 'fulfilled') cache[batch[j]] = results[j].value
    }
    if (i + BATCH_SIZE < toFetch.length) await new Promise((r) => setTimeout(r, BATCH_DELAY))
  }

  savePriceCache(cache)
  return cache
}

// --- Scoring from Snapshot (no API calls) ---
function scoreFromSnapshot(stock) {
  let score = 0
  const signals = []
  const phase = stock.phase || ''

  if (phase === 'Heavy Acc') { score += 2; signals.push('bandar:Heavy Acc') }
  else if (phase === 'Strong Acc') { score += 2; signals.push('bandar:Strong Acc') }
  else if (phase === 'Acc') { score += 1; signals.push('bandar:Acc') }

  if (stock.foreignFlowRaw > 0) { score += 1; signals.push('foreign:Inflow') }
  if (stock.screenerCount >= 3) { score += 1; signals.push(`screeners:${stock.screenerCount}`) }

  const topBuyers = stock.topBuyers || []
  if (topBuyers.some((c) => INSTITUTIONAL_BROKERS.includes(c))) {
    score += 1
    signals.push(`broker:${topBuyers.filter((c) => INSTITUTIONAL_BROKERS.includes(c)).join(',')}`)
  }

  return { score, signals }
}

function getPrice(priceMap, symbol, date) {
  const prices = priceMap[symbol] || {}
  if (prices[date]) return prices[date]
  // Find closest date (within 5 days forward)
  const d = new Date(date)
  for (let i = 1; i <= 5; i++) {
    d.setDate(d.getDate() + 1)
    const key = d.toISOString().slice(0, 10)
    if (prices[key]) return prices[key]
  }
  return null
}

function getLatestPrice(priceMap, symbol) {
  const prices = priceMap[symbol] || {}
  const dates = Object.keys(prices).sort()
  return dates.length ? prices[dates[dates.length - 1]] : null
}

// --- Main Backtest ---
export async function runBacktest(options = {}) {
  const settings = {
    initialCash: 100_000_000,
    maxPositionPct: 10,
    maxPositions: 10,
    convictionThreshold: 3,
    stopLossPct: -10,
    takeProfitPct: 25,
    ...options,
  }

  const snapshots = loadSnapshots(90) // load all available
  if (snapshots.length < 2) {
    return { error: 'Need at least 2 daily snapshots to run backtest. Collect more snapshots first.' }
  }

  // Chronological order
  snapshots.sort((a, b) => a.date.localeCompare(b.date))

  // Filter out snapshots without valid stocks arrays
  const validSnapshots = snapshots.filter(s => Array.isArray(s?.stocks) && s.stocks.length > 0)
  if (validSnapshots.length < 2) {
    return { error: 'Need at least 2 valid snapshots with stock data to run backtest.' }
  }

  // Collect all symbols
  const allSymbols = new Set()
  for (const snap of validSnapshots) {
    for (const stock of snap.stocks) allSymbols.add(stock.symbol)
  }

  console.log(`[backtest] ${validSnapshots.length} snapshots, ${allSymbols.size} unique symbols`)

  // Fetch price histories (rate-limited)
  const priceMap = await fetchAllPrices([...allSymbols])

  // Simulate
  let cash = settings.initialCash
  const positions = [] // { symbol, shares, avgPrice, entryDate, conviction, signals }
  const trades = [] // completed trades
  const equityCurve = []

  for (const snapshot of validSnapshots) {
    const date = snapshot.date

    // Score stocks from snapshot
    const scored = snapshot.stocks
      .map((s) => ({ ...s, ...scoreFromSnapshot(s) }))
      .sort((a, b) => b.score - a.score)

    // Check sells first
    for (let i = positions.length - 1; i >= 0; i--) {
      const pos = positions[i]
      const price = getPrice(priceMap, pos.symbol, date)
      if (!price) continue

      const pnlPct = ((price - pos.avgPrice) / pos.avgPrice) * 100
      const stockInSnap = scored.find((s) => s.symbol === pos.symbol)
      const phase = stockInSnap?.phase || ''

      let exitReason = null
      if (pnlPct <= settings.stopLossPct) exitReason = `Stop loss (${pnlPct.toFixed(1)}%)`
      else if (pnlPct >= settings.takeProfitPct) exitReason = `Take profit (${pnlPct.toFixed(1)}%)`
      else if (phase === 'Strong Dist' || phase === 'Dist') exitReason = `Phase: ${phase}`

      if (exitReason) {
        const value = pos.shares * price
        cash += value
        trades.push({
          symbol: pos.symbol, entry: pos.entryDate, entryPrice: pos.avgPrice,
          exit: date, exitPrice: price, returnPct: pnlPct,
          conviction: pos.conviction, signals: pos.signals, exitReason,
        })
        positions.splice(i, 1)
      }
    }

    // Check buys
    const heldSymbols = new Set(positions.map((p) => p.symbol))
    for (const stock of scored) {
      if (stock.score < settings.convictionThreshold) break
      if (heldSymbols.has(stock.symbol)) continue
      if (positions.length >= settings.maxPositions) break

      const price = getPrice(priceMap, stock.symbol, date)
      if (!price || price <= 0) continue

      const budget = cash * (settings.maxPositionPct / 100)
      const shares = Math.floor(budget / price / 100) * 100
      if (shares < 100) continue

      const cost = shares * price
      if (cost > cash) continue

      cash -= cost
      positions.push({
        symbol: stock.symbol, shares, avgPrice: price, entryDate: date,
        conviction: stock.score, signals: stock.signals,
      })
      heldSymbols.add(stock.symbol)
    }

    // Equity curve
    let posValue = 0
    for (const pos of positions) {
      const price = getPrice(priceMap, pos.symbol, date) || pos.avgPrice
      posValue += pos.shares * price
    }
    equityCurve.push({ date, value: cash + posValue })
  }

  // Close remaining positions at latest price
  for (const pos of positions) {
    const price = getLatestPrice(priceMap, pos.symbol) || pos.avgPrice
    const pnlPct = ((price - pos.avgPrice) / pos.avgPrice) * 100
    cash += pos.shares * price
    trades.push({
      symbol: pos.symbol, entry: pos.entryDate, entryPrice: pos.avgPrice,
      exit: 'OPEN', exitPrice: price, returnPct: pnlPct,
      conviction: pos.conviction, signals: pos.signals, exitReason: 'Still open',
    })
  }

  // Calculate stats
  const wins = trades.filter((t) => t.returnPct > 0)
  const losses = trades.filter((t) => t.returnPct <= 0)
  const totalReturnPct = ((cash - settings.initialCash) / settings.initialCash) * 100

  // Max drawdown from equity curve
  let maxDrawdown = 0
  let peak = equityCurve[0]?.value || settings.initialCash
  for (const point of equityCurve) {
    if (point.value > peak) peak = point.value
    const dd = ((point.value - peak) / peak) * 100
    if (dd < maxDrawdown) maxDrawdown = dd
  }

  // Signal performance
  const signalStats = {}
  for (const trade of trades) {
    for (const sig of trade.signals) {
      const key = sig.includes(':') ? sig.split(':')[0] + ':*' : sig
      if (!signalStats[key]) signalStats[key] = { trades: 0, wins: 0, totalReturn: 0 }
      signalStats[key].trades++
      if (trade.returnPct > 0) signalStats[key].wins++
      signalStats[key].totalReturn += trade.returnPct
    }
  }
  const signalPerformance = {}
  for (const [key, stats] of Object.entries(signalStats)) {
    signalPerformance[key] = {
      trades: stats.trades,
      winRate: stats.trades > 0 ? Math.round((stats.wins / stats.trades) * 100) : 0,
      avgReturn: stats.trades > 0 ? Math.round((stats.totalReturn / stats.trades) * 100) / 100 : 0,
    }
  }

  const avgWinPct = wins.length ? wins.reduce((s, t) => s + t.returnPct, 0) / wins.length : 0
  const avgLossPct = losses.length ? losses.reduce((s, t) => s + t.returnPct, 0) / losses.length : 0
  const grossProfit = wins.reduce((s, t) => s + t.returnPct, 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.returnPct, 0))

  const result = {
    summary: {
      totalReturn: cash - settings.initialCash,
      totalReturnPct: Math.round(totalReturnPct * 100) / 100,
      winRate: trades.length ? Math.round((wins.length / trades.length) * 100) : 0,
      avgWinPct: Math.round(avgWinPct * 100) / 100,
      avgLossPct: Math.round(avgLossPct * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      profitFactor: grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? Infinity : 0,
      totalTrades: trades.length,
      daysSimulated: validSnapshots.length,
    },
    trades,
    equityCurve,
    signalPerformance,
    settings,
    ranAt: new Date().toISOString(),
  }

  // Persist result
  fs.writeFileSync(RESULT_PATH, JSON.stringify(result, null, 2))
  return result
}

export function getLatestResult() {
  try {
    return JSON.parse(fs.readFileSync(RESULT_PATH, 'utf-8'))
  } catch {
    return null
  }
}
