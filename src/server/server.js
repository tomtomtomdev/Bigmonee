import express from 'express'
import http from 'http'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { createProxy, getCACertPath } from '../proxy/proxy.js'
import { tokenManager } from './token-manager.js'
import { initWebSocket, broadcast } from './websocket.js'
import { cache } from './cache.js'
import { getLogs, getLogDetail, searchLogs } from './api-logger.js'
import * as stockbit from './stockbit-client.js'
import { getProfile, clearProfile } from './header-profile.js'

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

// Start MITM proxy
createProxy(PROXY_PORT)

console.log('')
console.log('='.repeat(50))
console.log(`  Bigmonee is running!`)
console.log(`  Dashboard: http://localhost:3000`)
console.log(`  Proxy:     ${LOCAL_IP}:${PROXY_PORT}`)
console.log('='.repeat(50))
console.log('')
