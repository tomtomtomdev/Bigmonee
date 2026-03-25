import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const PORTFOLIO_PATH = path.resolve('data/portfolio.json')

const DEFAULT_SETTINGS = {
  maxPositionPct: 10,
  maxPositions: 10,
  convictionThreshold: 3,
  stopLossPct: -10,
  takeProfitPct: 25,
}

const DEFAULT_PORTFOLIO = {
  cash: 100_000_000,
  initialCash: 100_000_000,
  positions: [],
  trades: [],
  settings: { ...DEFAULT_SETTINGS },
}

export function loadPortfolio() {
  try {
    return JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf-8'))
  } catch {
    return { ...DEFAULT_PORTFOLIO, positions: [], trades: [], settings: { ...DEFAULT_SETTINGS } }
  }
}

export function savePortfolio(portfolio) {
  fs.writeFileSync(PORTFOLIO_PATH, JSON.stringify(portfolio, null, 2))
}

export function executeBuy(portfolio, { symbol, name, shares, price, conviction, signals }) {
  const value = shares * price
  if (value > portfolio.cash) return { error: 'Insufficient cash' }
  if (portfolio.positions.length >= portfolio.settings.maxPositions) {
    const existing = portfolio.positions.find((p) => p.symbol === symbol)
    if (!existing) return { error: 'Max positions reached' }
  }

  portfolio.cash -= value

  const existing = portfolio.positions.find((p) => p.symbol === symbol)
  if (existing) {
    const totalShares = existing.shares + shares
    existing.avgPrice = (existing.avgPrice * existing.shares + price * shares) / totalShares
    existing.shares = totalShares
    existing.conviction = conviction
    existing.signals = signals
  } else {
    portfolio.positions.push({
      symbol, name, shares, avgPrice: price, entryDate: new Date().toISOString().slice(0, 10),
      conviction, signals,
    })
  }

  portfolio.trades.push({
    id: crypto.randomUUID(),
    symbol, name, side: 'BUY', shares, price, value,
    date: new Date().toISOString().slice(0, 10),
    conviction, signals, reason: `Conviction ${conviction}`,
  })

  savePortfolio(portfolio)
  return { ok: true }
}

export function executeSell(portfolio, { symbol, shares, price, reason }) {
  const pos = portfolio.positions.find((p) => p.symbol === symbol)
  if (!pos) return { error: 'Position not found' }

  const sellShares = shares || pos.shares
  const value = sellShares * price
  portfolio.cash += value

  portfolio.trades.push({
    id: crypto.randomUUID(),
    symbol, name: pos.name, side: 'SELL', shares: sellShares, price, value,
    date: new Date().toISOString().slice(0, 10),
    conviction: pos.conviction, signals: pos.signals, reason,
  })

  if (sellShares >= pos.shares) {
    portfolio.positions = portfolio.positions.filter((p) => p.symbol !== symbol)
  } else {
    pos.shares -= sellShares
  }

  savePortfolio(portfolio)
  return { ok: true }
}

export function resetPortfolio(initialCash = 100_000_000) {
  const portfolio = {
    ...DEFAULT_PORTFOLIO,
    cash: initialCash,
    initialCash: initialCash,
    positions: [],
    trades: [],
    settings: { ...DEFAULT_SETTINGS },
  }
  savePortfolio(portfolio)
  return portfolio
}

export function updateSettings(settings) {
  const portfolio = loadPortfolio()
  portfolio.settings = { ...portfolio.settings, ...settings }
  savePortfolio(portfolio)
  return portfolio.settings
}
