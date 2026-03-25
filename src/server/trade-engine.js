import { loadPortfolio, executeBuy, executeSell } from './virtual-portfolio.js'
import { scanConviction } from './conviction-scanner.js'
import { getLatestResult } from './backtest-engine.js'
import { tokenManager } from './token-manager.js'
import { cache } from './cache.js'
import fs from 'fs'
import path from 'path'

const CONFIG_PATH = path.resolve('data/config.json')

function loadConfig() {
  const defaults = JSON.parse(fs.readFileSync(path.resolve('config.default.json'), 'utf-8'))
  try {
    const user = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
    return { ...defaults, ...user, endpoints: { ...defaults.endpoints, ...user.endpoints } }
  } catch {
    return defaults
  }
}

async function fetchPrice(symbol) {
  const token = tokenManager.getToken()
  if (!token) return null
  const config = loadConfig()
  const url = new URL(config.stockbitBaseUrl + config.endpoints.stockInfo.replace('{symbol}', symbol))
  const cached = cache.get(url.toString())
  if (cached) return parseFloat(cached.data?.price) || null
  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'Bigmonee/1.0' },
    })
    const data = await res.json()
    cache.set(url.toString(), data)
    return parseFloat(data?.data?.price) || null
  } catch {
    return null
  }
}

export async function runTradeEngine({ signals: precomputedSignals, force } = {}) {
  // Backtest gate: skip auto-trading if backtest shows bad results
  if (!force) {
    const backtest = getLatestResult()
    if (backtest?.summary) {
      const { totalReturnPct, winRate } = backtest.summary
      if (totalReturnPct < 0 || winRate < 50) {
        return { actions: [], portfolio: await getPortfolioWithPrices(), skipped: true,
                 reason: `Backtest shows ${totalReturnPct}% return, ${winRate}% win rate — engine paused` }
      }
    }
  }

  const portfolio = loadPortfolio()
  const { settings } = portfolio
  const actions = []

  // Step 1: Scan conviction
  const signals = precomputedSignals || await scanConviction()

  // Step 2: Check existing positions for sell signals
  for (const pos of [...portfolio.positions]) {
    const price = await fetchPrice(pos.symbol)
    if (!price) continue

    const pnlPct = ((price - pos.avgPrice) / pos.avgPrice) * 100
    const stockSignal = signals.find((s) => s.symbol === pos.symbol)
    const phase = stockSignal?.phase || ''

    // Stop loss
    if (pnlPct < settings.stopLossPct) {
      executeSell(portfolio, { symbol: pos.symbol, price, reason: `Stop loss (${pnlPct.toFixed(1)}%)` })
      actions.push({ action: 'SELL', symbol: pos.symbol, reason: 'Stop loss', price, pnlPct })
      continue
    }

    // Take profit
    if (pnlPct >= settings.takeProfitPct) {
      executeSell(portfolio, { symbol: pos.symbol, price, reason: `Take profit (${pnlPct.toFixed(1)}%)` })
      actions.push({ action: 'SELL', symbol: pos.symbol, reason: 'Take profit', price, pnlPct })
      continue
    }

    // Phase reversal to distribution
    if (phase === 'Strong Dist' || phase === 'Dist') {
      executeSell(portfolio, { symbol: pos.symbol, price, reason: `Phase reversal: ${phase}` })
      actions.push({ action: 'SELL', symbol: pos.symbol, reason: `Phase: ${phase}`, price, pnlPct })
    }
  }

  // Step 3: Buy high-conviction stocks
  const heldSymbols = new Set(portfolio.positions.map((p) => p.symbol))

  for (const stock of signals) {
    if (stock.score < settings.convictionThreshold) break // sorted by score desc
    if (heldSymbols.has(stock.symbol)) continue
    if (portfolio.positions.length >= settings.maxPositions) break

    const price = await fetchPrice(stock.symbol)
    if (!price || price <= 0) continue

    const positionBudget = portfolio.cash * (settings.maxPositionPct / 100)
    const shares = Math.floor(positionBudget / price / 100) * 100 // IDX lot = 100 shares
    if (shares < 100) continue

    const result = executeBuy(portfolio, {
      symbol: stock.symbol,
      name: stock.name,
      shares,
      price,
      conviction: stock.score,
      signals: stock.signals,
    })

    if (result.ok) {
      actions.push({ action: 'BUY', symbol: stock.symbol, shares, price, conviction: stock.score, signals: stock.signals })
      heldSymbols.add(stock.symbol)
    }
  }

  return { actions, portfolio: await getPortfolioWithPrices() }
}

export async function getPortfolioWithPrices() {
  const portfolio = loadPortfolio()
  let totalValue = portfolio.cash

  const positions = await Promise.all(
    portfolio.positions.map(async (pos) => {
      const currentPrice = await fetchPrice(pos.symbol)
      const current = currentPrice || pos.avgPrice
      const marketValue = pos.shares * current
      const pnl = marketValue - pos.shares * pos.avgPrice
      const pnlPct = ((current - pos.avgPrice) / pos.avgPrice) * 100
      totalValue += marketValue
      return { ...pos, currentPrice: current, marketValue, pnl, pnlPct }
    })
  )

  const invested = positions.reduce((sum, p) => sum + p.shares * p.avgPrice, 0)
  const totalPnl = totalValue - portfolio.initialCash
  const totalPnlPct = ((totalValue - portfolio.initialCash) / portfolio.initialCash) * 100

  return {
    cash: portfolio.cash,
    initialCash: portfolio.initialCash,
    invested,
    totalValue,
    totalPnl,
    totalPnlPct,
    positions,
    settings: portfolio.settings,
  }
}
