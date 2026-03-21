import fs from 'fs'
import path from 'path'
import { tokenManager } from './token-manager.js'
import { cache } from './cache.js'
import { getProfile } from './header-profile.js'
import { findCapturedRequest } from './api-logger.js'

const CONFIG_PATH = path.resolve('data/config.json')

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
  } catch {
    return JSON.parse(fs.readFileSync(path.resolve('config.default.json'), 'utf-8'))
  }
}

async function stockbitFetch(endpoint, params = {}, { appendParams = {} } = {}) {
  const token = tokenManager.getToken()
  if (!token) throw new Error('No access token captured yet')

  const config = loadConfig()
  const url = new URL(config.stockbitBaseUrl + endpoint)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  // Support repeated query params (e.g. filter_stocks appearing multiple times)
  for (const [k, values] of Object.entries(appendParams)) {
    for (const v of values) {
      url.searchParams.append(k, v)
    }
  }

  const cacheKey = url.toString()
  const cached = cache.get(cacheKey)
  if (cached) {
    console.log(`[stockbit-client] ${url} → cache hit`)
    return cached
  }

  // Try per-endpoint captured request first, then global profile, then hardcoded fallback
  const captured = findCapturedRequest(endpoint)
  let headers
  let body = undefined
  let method = 'GET'

  if (captured) {
    headers = { ...captured.headers, authorization: `Bearer ${token}`, host: url.hostname }
    // Remove per-request transport headers
    for (const h of ['content-length', 'content-encoding', 'transfer-encoding', 'connection', 'keep-alive', 'proxy-connection', 'proxy-authorization']) {
      delete headers[h]
    }
    body = captured.body || undefined
    method = captured.method || 'GET'
  } else {
    const profile = getProfile()
    if (profile) {
      headers = { ...profile.headers, authorization: `Bearer ${token}`, host: url.hostname }
    } else {
      headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'User-Agent': 'Stockbit-iOS/5.0',
      }
    }
  }

  const fetchOptions = { method, headers }
  if (body && method !== 'GET' && method !== 'HEAD') {
    fetchOptions.body = body
  }

  console.log(`[stockbit-client] ${method} ${url}`)
  const res = await fetch(url.toString(), fetchOptions)

  if (!res.ok) {
    const text = await res.text()
    console.log(`[stockbit-client] ${method} ${url} → ${res.status} ERROR`)
    throw new Error(`Stockbit API ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  console.log(`[stockbit-client] ${method} ${url} → ${res.status}`)
  cache.set(cacheKey, data)
  return data
}

const TIMEFRAME_MAP = { '1d': 'today', '1w': '1week', '1m': '1month', '3m': '3months', '1y': '1year' }

export async function fetchIHSG(range = '1d') {
  const config = loadConfig()
  const timeframe = TIMEFRAME_MAP[range] || 'today'
  const [chart, info] = await Promise.all([
    stockbitFetch(config.endpoints.ihsgChart, { is_include_previous_historical: '1', timeframe }),
    stockbitFetch(config.endpoints.ihsgInfo),
  ])
  // Normalize into the shape the frontend expects
  const infoData = info?.data || {}
  return {
    data: {
      close: parseFloat(infoData.price) || 0,
      change: parseFloat(infoData.change) || 0,
      percent: infoData.percentage ?? 0,
      prices: chart?.data?.prices || [],
    },
  }
}

async function fetchMarketMover(moverType, limit = 20) {
  const config = loadConfig()
  const raw = await stockbitFetch(
    config.endpoints.marketMover,
    { limit: String(limit), mover_type: moverType },
    { appendParams: { filter_stocks: config.marketMoverFilterStocks } },
  )
  // Normalize mover_list into flat stock objects the frontend expects
  const list = raw?.data?.mover_list || []
  return {
    data: list.map((item) => ({
      symbol: item.stock_detail?.code || '',
      company_name: item.stock_detail?.name || '',
      price: item.price ?? 0,
      change_pct: item.change?.percentage ?? 0,
      value: item.value?.raw ?? 0,
      volume: item.volume?.raw ?? 0,
    })),
  }
}

export function fetchTopGainers() {
  return fetchMarketMover('MOVER_TYPE_TOP_GAINER')
}

export function fetchTopLosers() {
  return fetchMarketMover('MOVER_TYPE_TOP_LOSER')
}

export function fetchTopValue() {
  return fetchMarketMover('MOVER_TYPE_TOP_VALUE')
}

export function fetchTopVolume() {
  return fetchMarketMover('MOVER_TYPE_TOP_VOLUME')
}

export async function fetchMarketSummary() {
  const config = loadConfig()
  return stockbitFetch(config.endpoints.marketSummary)
}
