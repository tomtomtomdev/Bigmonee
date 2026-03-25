import express from 'express'
import http from 'http'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { createProxy, getCACertPath } from '../proxy/proxy.js'
import { tokenManager } from './token-manager.js'
import { initWebSocket, broadcast } from './websocket.js'
import { cache } from './cache.js'
import { getLogs, getLogDetail, searchLogs, clearLogs } from './api-logger.js'
import * as stockbit from './stockbit-client.js'
import { getProfile, clearProfile } from './header-profile.js'
import { loadPortfolio, resetPortfolio, updateSettings } from './virtual-portfolio.js'
import { scanConviction } from './conviction-scanner.js'
import { runTradeEngine, getPortfolioWithPrices } from './trade-engine.js'
import { collectSnapshot, loadSnapshot, getSnapshotDates } from './snapshot-collector.js'
import { calculateMomentum } from './momentum.js'
import { runBacktest, getLatestResult } from './backtest-engine.js'

// Load config
const CONFIG_PATH = path.resolve('data/config.json')
const DEFAULT_CONFIG = path.resolve('config.default.json')

if (!fs.existsSync(CONFIG_PATH)) {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true })
  fs.copyFileSync(DEFAULT_CONFIG, CONFIG_PATH)
}

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))

// Get local IP
function getLocalIP() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address
    }
  }
  return '127.0.0.1'
}

const LOCAL_IP = getLocalIP()
const BACKEND_PORT = config.backendPort || 3001
const PROXY_PORT = config.proxyPort || 8001

// Express
const app = express()
app.use(express.json())

// Serve built frontend in production
const distPath = path.resolve('dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
}

// --- API Routes ---

// Status
app.get('/api/status', (req, res) => {
  res.json({
    proxy: { running: true, host: LOCAL_IP, port: PROXY_PORT },
    token: tokenManager.info(),
    localIP: LOCAL_IP,
  })
})

// Token
app.get('/api/token', (req, res) => {
  res.json(tokenManager.info())
})

app.delete('/api/token', (req, res) => {
  tokenManager.clear()
  cache.clear()
  res.json({ ok: true })
})

// CA Certificate
app.get('/api/cert', (req, res) => {
  const certPath = getCACertPath()
  if (!certPath) {
    return res.status(404).json({ error: 'CA certificate not yet generated. Start the proxy first.' })
  }
  res.setHeader('Content-Type', 'application/x-pem-file')
  res.setHeader('Content-Disposition', 'attachment; filename="bigmonee-ca.pem"')
  res.sendFile(certPath)
})

// IHSG
app.get('/api/ihsg', async (req, res) => {
  try {
    const range = req.query.range || '1d'
    const data = await stockbit.fetchIHSG(range)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Top Movers
app.get('/api/top-gainers', async (req, res) => {
  try {
    res.json(await stockbit.fetchTopGainers())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/top-losers', async (req, res) => {
  try {
    res.json(await stockbit.fetchTopLosers())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/top-value', async (req, res) => {
  try {
    res.json(await stockbit.fetchTopValue())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/top-volume', async (req, res) => {
  try {
    res.json(await stockbit.fetchTopVolume())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Stock Detail
app.get('/api/stock/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params
    const { timeframe } = req.query
    res.json(await stockbit.fetchStockDetail(symbol.toUpperCase(), { chartTimeframe: timeframe }))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Top Brokers
app.get('/api/top-brokers', async (req, res) => {
  try {
    const { period, sort } = req.query
    res.json(await stockbit.fetchTopBrokers({ period, sort }))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Market Summary
app.get('/api/market-summary', async (req, res) => {
  try {
    res.json(await stockbit.fetchMarketSummary())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Screener
app.get('/api/screener/presets', async (req, res) => {
  try {
    res.json(await stockbit.fetchScreenerPresets())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/screener/templates/:id', async (req, res) => {
  try {
    res.json(await stockbit.fetchScreenerTemplate(req.params.id))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Bandar Flow
app.get('/api/bandar-scan', async (req, res) => {
  try {
    res.json(await stockbit.fetchBandarScan())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Trading Platform
app.get('/api/portfolio', async (req, res) => {
  try {
    res.json(await getPortfolioWithPrices())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/portfolio/trades', (req, res) => {
  const portfolio = loadPortfolio()
  res.json(portfolio.trades.slice().reverse())
})

app.put('/api/portfolio/settings', express.json(), (req, res) => {
  try {
    res.json(updateSettings(req.body))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/portfolio/reset', express.json(), (req, res) => {
  try {
    res.json(resetPortfolio(req.body?.initialCash))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/conviction-scan', async (req, res) => {
  try {
    res.json(await scanConviction())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/portfolio/run-engine', async (req, res) => {
  try {
    res.json(await runTradeEngine())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Backtest
app.post('/api/backtest', async (req, res) => {
  try {
    res.json(await runBacktest(req.body || {}))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/backtest/latest', (req, res) => {
  const result = getLatestResult()
  if (!result) return res.json(null)
  res.json(result)
})

// Snapshots & Momentum
app.post('/api/snapshots/collect', async (req, res) => {
  try {
    res.json(await collectSnapshot())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/snapshots', (req, res) => {
  res.json(getSnapshotDates())
})

app.get('/api/snapshots/:date', (req, res) => {
  const snapshot = loadSnapshot(req.params.date)
  if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' })
  res.json(snapshot)
})

app.get('/api/momentum', (req, res) => {
  try {
    res.json(calculateMomentum(7))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Insider Feed
app.get('/api/insider-feed', async (req, res) => {
  try {
    res.json(await stockbit.fetchInsiderFeed(req.query.period_type))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Broker Activity
app.get('/api/broker-activity', async (req, res) => {
  try {
    const { broker_code, from, to, investor_type, transaction_type } = req.query
    if (!broker_code || !from) return res.status(400).json({ error: 'broker_code and from are required' })
    res.json(await stockbit.fetchBrokerActivity({
      brokerCode: broker_code, from, to, investorType: investor_type, transactionType: transaction_type,
    }))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Sectors
app.get('/api/sectors', async (req, res) => {
  try {
    res.json(await stockbit.fetchSectorList())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Indexes
app.get('/api/indexes', async (req, res) => {
  try {
    res.json(await stockbit.fetchIndexList())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/indexes/:parent/:id/companies', async (req, res) => {
  try {
    res.json(await stockbit.fetchIndexCompanies(req.params.parent, req.params.id))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// API Explorer
app.get('/api/discovered-endpoints', (req, res) => {
  const { q, method, status } = req.query
  if (q || method || status) {
    return res.json(searchLogs({ query: q, method, statusCode: status }))
  }
  res.json(getLogs())
})

app.get('/api/discovered-endpoints/:id', (req, res) => {
  const detail = getLogDetail(req.params.id)
  if (!detail) return res.status(404).json({ error: 'Not found' })
  res.json(detail)
})

app.delete('/api/discovered-endpoints', (req, res) => {
  clearLogs()
  res.json({ ok: true })
})

// Header Profile
app.get('/api/header-profile', (req, res) => {
  const profile = getProfile()
  if (!profile) return res.json(null)
  // Mask sensitive header values for display
  const masked = { ...profile.headers }
  if (masked.authorization) masked.authorization = masked.authorization.slice(0, 15) + '...'
  if (masked.cookie) masked.cookie = masked.cookie.slice(0, 20) + '...'
  res.json({ headers: masked, capturedAt: profile.capturedAt })
})

app.delete('/api/header-profile', (req, res) => {
  clearProfile()
  res.json({ ok: true })
})

// Config
app.get('/api/config', (req, res) => {
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
    res.json(cfg)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/config', (req, res) => {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(req.body, null, 2))
    cache.clear()
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// SPA fallback
app.get('/{*path}', (req, res) => {
  if (fs.existsSync(path.join(distPath, 'index.html'))) {
    res.sendFile(path.join(distPath, 'index.html'))
  } else {
    res.status(404).json({ error: 'Frontend not built. Run in dev mode or build first.' })
  }
})

// Start
const server = http.createServer(app)
initWebSocket(server)

// Forward token events to WebSocket
tokenManager.on('captured', (info) => broadcast('token:captured', info))
tokenManager.on('cleared', () => broadcast('token:cleared', {}))

server.listen(BACKEND_PORT, () => {
  console.log(`[server] Backend API on http://localhost:${BACKEND_PORT}`)
  console.log(`[server] Cert download: http://${LOCAL_IP}:${BACKEND_PORT}/api/cert`)
})

// Auto-collect snapshots at market open (09:15 WIB) and close (16:15 WIB)
// Checks every 15 minutes, only collects once per target hour per day
const snapshotTracker = { lastDate: null, collectedHours: new Set() }

setInterval(async () => {
  if (!tokenManager.getToken()) return
  const now = new Date()
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000) // UTC to WIB
  const hour = wib.getUTCHours()
  const date = wib.toISOString().slice(0, 10)

  // Reset tracker on new day
  if (snapshotTracker.lastDate !== date) {
    snapshotTracker.lastDate = date
    snapshotTracker.collectedHours.clear()
  }

  // Collect at 09:xx and 16:xx WIB, once per hour per day
  if ((hour === 9 || hour === 16) && !snapshotTracker.collectedHours.has(hour)) {
    snapshotTracker.collectedHours.add(hour)
    try {
      await collectSnapshot()
      console.log(`[snapshot] Auto-collected at ${hour}:xx WIB (${date})`)
    } catch (err) {
      console.log(`[snapshot] Auto-collect failed at ${hour}:xx WIB:`, err.message)
      snapshotTracker.collectedHours.delete(hour) // retry next interval
    }
  }
}, 15 * 60 * 1000) // check every 15 minutes

// Start MITM proxy
createProxy(PROXY_PORT)

console.log('')
console.log('='.repeat(50))
console.log(`  Bigmonee is running!`)
console.log(`  Dashboard: http://localhost:3000`)
console.log(`  Proxy:     ${LOCAL_IP}:${PROXY_PORT}`)
console.log('='.repeat(50))
console.log('')
