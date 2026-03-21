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

async function stockbitFetch(endpoint, params = {}, { appendParams = {}, method: methodOverride, body: bodyOverride, skipCache = false } = {}) {
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
  if (!skipCache) {
    const cached = cache.get(cacheKey)
    if (cached) {
      console.log(`[stockbit-client] ${url} → cache hit`)
      return cached
    }
  }

  // Try per-endpoint captured request first, then global profile, then hardcoded fallback
  const captured = findCapturedRequest(endpoint)
  let headers
  let body = bodyOverride ?? undefined
  let method = methodOverride || 'GET'

  if (captured && !methodOverride) {
    headers = { ...captured.headers, authorization: `Bearer ${token}`, host: url.hostname }
    // Remove per-request transport headers
    for (const h of ['content-length', 'content-encoding', 'transfer-encoding', 'connection', 'keep-alive', 'proxy-connection', 'proxy-authorization']) {
      delete headers[h]
    }
    body = body ?? captured.body ?? undefined
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

  if (bodyOverride && typeof bodyOverride === 'object') {
    headers['content-type'] = 'application/json'
    body = JSON.stringify(bodyOverride)
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

export async function fetchTopBrokers({ period = 'TB_PERIOD_LAST_1_DAY', sort = 'TB_SORT_BY_TOTAL_VALUE' } = {}) {
  const config = loadConfig()

  // Paywall gate: increment counter then check eligibility
  await stockbitFetch(config.endpoints.paywallIncrement, {}, {
    method: 'POST',
    body: { feature: 'PAYWALL_FEATURE_TOP_BROKER' },
    skipCache: true,
  })
  const eligibility = await stockbitFetch(config.endpoints.paywallCheck, {
    company: '',
    features: 'PAYWALL_FEATURE_TOP_BROKER',
  }, { skipCache: true })
  const feature = eligibility?.data?.features?.find((f) => f.feature === 'PAYWALL_FEATURE_TOP_BROKER')
  if (feature && !feature.is_eligible) {
    throw new Error('Top Broker feature is not available for your account')
  }

  const raw = await stockbitFetch(config.endpoints.topBroker, {
    market_type: '1',
    order: 'ORDER_BY_DESC',
    period,
    sort,
  })
  const list = raw?.data?.list || []
  return {
    data: {
      date: raw?.data?.date || {},
      list: list.map((b) => ({
        code: b.code || '',
        name: b.name || '',
        group: b.group || '',
        total_value: Number(b.total_value) || 0,
        net_value: Number(b.net_value) || 0,
        buy_value: Number(b.buy_value) || 0,
        sell_value: Number(b.sell_value) || 0,
        total_volume: Number(b.total_volume) || 0,
        total_frequency: Number(b.total_frequency) || 0,
      })),
    },
  }
}

export async function fetchMarketSummary() {
  const config = loadConfig()
  return stockbitFetch(config.endpoints.marketSummary)
}
