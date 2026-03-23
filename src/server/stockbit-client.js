import fs from 'fs'
import path from 'path'
import { tokenManager } from './token-manager.js'
import { cache } from './cache.js'
import { getProfile } from './header-profile.js'
import { findCapturedRequest } from './api-logger.js'

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

export async function fetchStockDetail(symbol, { chartTimeframe = 'today' } = {}) {
  const config = loadConfig()
  const ep = (template) => template.replace('{symbol}', symbol)

  const [chart, info, comparison, orderbook, foreignDomestic, brokerSummary, subsidiary, profile, insider] = await Promise.allSettled([
    stockbitFetch(ep(config.endpoints.stockChart), {
      chart_type: 'PRICE_CHART_TYPE_LINE',
      is_include_previous_historical: '1',
      timeframe: chartTimeframe,
    }),
    stockbitFetch(ep(config.endpoints.stockInfo)),
    stockbitFetch(config.endpoints.comparisonRatios, { symbol }),
    stockbitFetch(ep(config.endpoints.stockOrderbook), { limit: '50' }),
    stockbitFetch(ep(config.endpoints.stockForeignDomestic), {
      market_type: 'MARKET_TYPE_REGULAR',
      period: 'PERIOD_RANGE_1D',
    }),
    stockbitFetch(ep(config.endpoints.stockBrokerSummary), {
      investor_type: '1',
      limit: '25',
      market_board: '2',
      period: 'BROKER_SUMMARY_PERIOD_LATEST',
      transaction_type: '1',
    }),
    stockbitFetch(ep(config.endpoints.stockSubsidiary)),
    stockbitFetch(ep(config.endpoints.stockProfile)),
    stockbitFetch(config.endpoints.insiderMajorHolder, { symbols: symbol, limit: '30', page: '1' }),
  ])

  const val = (r) => r.status === 'fulfilled' ? r.value : null

  const infoData = val(info)?.data || {}
  const comparisonData = val(comparison)?.data || {}
  const orderbookData = val(orderbook)?.data || {}
  const fdData = val(foreignDomestic)?.data || {}
  const brokerData = val(brokerSummary)?.data || {}
  const subsidiaryData = val(subsidiary)?.data || {}
  const profileData = val(profile)?.data || {}
  const insiderData = val(insider)?.data || {}

  return {
    data: {
      info: {
        symbol: infoData.symbol || symbol,
        name: infoData.name || '',
        price: parseFloat(infoData.price) || 0,
        change: parseFloat(infoData.change) || 0,
        percent: infoData.percentage ?? 0,
        previous: parseFloat(infoData.previous) || 0,
        sector: infoData.sector || '',
        subSector: infoData.sub_sector || '',
        volume: infoData.volume || '0',
        marketHour: infoData.market_hour || {},
        formattedPrice: infoData.formatted_price || '',
      },
      chart: val(chart)?.data?.prices || [],
      comparison: {
        symbols: comparisonData.symbols || [],
        groups: (comparisonData.metric_groups || []).map((g) => ({
          name: g.metric_group_name,
          metrics: g.metric.map((m) => ({
            name: m.fitem_name,
            ratios: Object.fromEntries(m.ratios.map((r) => [r.symbol, r.value])),
          })),
        })),
      },
      orderbook: {
        average: orderbookData.average ?? 0,
        bid: (orderbookData.bid || []).map((b) => ({
          price: parseFloat(b.price) || 0,
          volume: parseInt(b.volume) || 0,
          queNum: parseInt(b.que_num) || 0,
        })),
        ask: (orderbookData.offer || []).map((a) => ({
          price: parseFloat(a.price) || 0,
          volume: parseInt(a.volume) || 0,
          queNum: parseInt(a.que_num) || 0,
        })),
      },
      foreignDomestic: {
        summary: fdData.summary || {},
      },
      brokerSummary: {
        bandar: brokerData.bandar_detector || {},
        topBuyers: (brokerData.broker_summary?.brokers_buy || []).slice(0, 10).map((b) => ({
          code: b.netbs_broker_code || '',
          type: b.type || '',
          buyValue: parseFloat(b.bval) || 0,
          sellValue: parseFloat(b.bvalv) || 0,
          buyLot: parseInt(b.blot) || 0,
          freq: parseInt(b.freq) || 0,
        })),
        topSellers: (brokerData.broker_summary?.brokers_sell || []).slice(0, 10).map((s) => ({
          code: s.netbs_broker_code || '',
          type: s.type || '',
          sellValue: parseFloat(s.bval) || 0,
          buyValue: parseFloat(s.bvalv) || 0,
          sellLot: parseInt(s.blot) || 0,
          freq: parseInt(s.freq) || 0,
        })),
      },
      subsidiaries: {
        items: (subsidiaryData.subsidiaries || []).map((s) => ({
          name: s.company_name,
          business: s.business_type,
          location: s.location,
          year: s.commercial_year,
          assets: s.total_assets,
          ownership: s.percentage,
        })),
        currency: subsidiaryData.currency || '',
        period: subsidiaryData.last_updated_period || '',
        unit: subsidiaryData.unit || '',
      },
      profile: {
        background: profileData.background || '',
        address: (() => {
          const a = (profileData.address || [])[0] || {}
          return {
            office: a.office || '',
            phone: a.phone || '',
            email: (a.email || [])[0] || '',
            website: a.website || '',
            fax: a.fax || '',
          }
        })(),
        executives: {
          presidentDirector: (profileData.key_executive?.president_director || []).map((e) => e.value),
          directors: (profileData.key_executive?.director || []).map((e) => e.value),
          commissioners: (profileData.key_executive?.commissioner || []).map((e) => e.value),
          independentCommissioners: (profileData.key_executive?.independent_commissioner || []).map((e) => e.value),
        },
        shareholders: (profileData.shareholder || []).map((s) => ({
          name: s.name,
          percentage: s.percentage,
          value: s.value,
          badges: s.badges || [],
        })),
        history: {
          date: profileData.history?.date || '',
          price: profileData.history?.price || '',
          shares: profileData.history?.shares || '',
          amount: profileData.history?.amount || '',
          board: profileData.history?.board || '',
          freeFloat: profileData.history?.free_float || '',
          underwriters: profileData.history?.underwriters || [],
        },
        shareholderTrend: (profileData.shareholder_numbers || []).map((s) => ({
          date: s.shareholder_date,
          total: s.total_share,
          change: s.change,
          changeFormatted: s.change_formatted,
        })),
        beneficiaries: (profileData.beneficiary || []).map((b) => b.name),
      },
      insiderTrading: (insiderData.movement || []).map((m) => ({
        name: m.name,
        date: m.date,
        action: m.action_type,
        previous: m.previous?.value,
        current: m.current?.value,
        change: m.changes?.value,
        changeShares: m.changes?.formatted_value,
        price: m.price_formatted,
        badges: m.badges || [],
      })),
    },
  }
}

export async function fetchMarketSummary() {
  const config = loadConfig()
  return stockbitFetch(config.endpoints.marketSummary)
}

async function screenerPaywallGate() {
  const config = loadConfig()
  await stockbitFetch(config.endpoints.paywallIncrement, {}, {
    method: 'POST',
    body: { feature: 'PAYWALL_FEATURE_SCREENER' },
    skipCache: true,
  })
  const eligibility = await stockbitFetch(config.endpoints.paywallCheck, {
    company: '',
    features: 'PAYWALL_FEATURE_SCREENER',
  }, { skipCache: true })
  const feature = eligibility?.data?.features?.find((f) => f.feature === 'PAYWALL_FEATURE_SCREENER')
  if (feature && !feature.is_eligible) {
    throw new Error('Screener feature is not available for your account')
  }
}

export async function fetchScreenerPresets() {
  const config = loadConfig()
  await screenerPaywallGate()
  // Initial preset load (required before drilling into guru category)
  await stockbitFetch(config.endpoints.screenerPresets, { mobile: '1' }, { skipCache: true })
  const raw = await stockbitFetch(config.endpoints.screenerPresets, { mobile: '1', parent_id: '32' })
  const list = raw?.data || []
  if (!Array.isArray(list)) return { data: [] }
  return {
    data: list.map((p) => ({
      id: p.id ?? p.screenerid ?? p.template_id ?? '',
      name: p.name || p.screen_name || p.title || '',
    })),
  }
}

function analyzePhase(latestBandar, monthBandar, foreignFlow, screeners) {
  const latest = (latestBandar?.broker_accdist || '').toLowerCase()
  const monthly = (monthBandar?.broker_accdist || '').toLowerCase()
  const netForeign = foreignFlow?.net_foreign?.value?.raw ?? 0
  const isForeignInflow = netForeign > 0
  const screenerCount = screeners?.length || 0

  const isLatestAcc = latest.includes('acc')
  const isLatestDist = latest.includes('dist')
  const isMonthlyAcc = monthly.includes('acc')
  const isMonthlyDist = monthly.includes('dist')

  if (latest === 'acc+') return { phase: 'Heavy Acc', confidence: 'high' }
  if (isLatestAcc && isMonthlyDist) return { phase: 'Fake Acc', confidence: 'medium' }
  if (isLatestDist && isMonthlyAcc) return { phase: 'Fake Dist', confidence: 'medium' }
  if (isLatestAcc && isMonthlyAcc) {
    if (isForeignInflow && screenerCount >= 2) return { phase: 'Strong Acc', confidence: 'high' }
    return { phase: 'Acc', confidence: 'medium' }
  }
  if (isLatestDist && isMonthlyDist) {
    if (!isForeignInflow && screenerCount === 0) return { phase: 'Strong Dist', confidence: 'high' }
    return { phase: 'Dist', confidence: 'medium' }
  }
  if (isLatestAcc) return { phase: 'Acc', confidence: 'low' }
  if (isLatestDist) return { phase: 'Dist', confidence: 'low' }
  return { phase: 'Neutral', confidence: 'low' }
}

const BANDAR_TEMPLATE_IDS = ['77', '80', '92', '96', '97', '117', '101', '120']

function extractSymbols(raw) {
  const calcs = raw?.data?.calcs || []
  if (calcs.length > 0) {
    return calcs.map((c) => ({
      symbol: c.company?.symbol || '',
      name: c.company?.name || '',
    }))
  }
  const list = raw?.data?.results || raw?.data?.stocks || raw?.data || []
  if (!Array.isArray(list)) return []
  return list.map((item) => ({
    symbol: item.symbol || item.code || item.ticker || '',
    name: item.company_name || item.name || '',
  }))
}

export async function fetchBandarScan() {
  const config = loadConfig()

  // Paywall gate + preset warmup (required before screener API calls)
  await screenerPaywallGate()
  await stockbitFetch(config.endpoints.screenerPresets, { mobile: '1' }, { skipCache: true })
  await stockbitFetch(config.endpoints.screenerPresets, { mobile: '1', parent_id: '32' }, { skipCache: true })

  // 1. Fetch all screener templates in parallel to get candidate stocks
  const templateResults = await Promise.allSettled(
    BANDAR_TEMPLATE_IDS.map((id) => {
      const endpoint = config.endpoints.screenerTemplate.replace('{id}', id)
      return stockbitFetch(endpoint, { limit: '25', type: 'TEMPLATE_TYPE_GURU' })
    })
  )

  // Merge and deduplicate symbols across all templates
  const symbolMap = new Map()
  templateResults.forEach((result, i) => {
    if (result.status !== 'fulfilled') return
    const screenName = result.value?.data?.screen_name || BANDAR_TEMPLATE_IDS[i]
    for (const s of extractSymbols(result.value)) {
      if (!s.symbol || symbolMap.has(s.symbol)) {
        // Add screener tag to existing entry
        if (s.symbol && symbolMap.has(s.symbol)) {
          symbolMap.get(s.symbol).screeners.push(screenName)
        }
        continue
      }
      symbolMap.set(s.symbol, { ...s, screeners: [screenName] })
    }
  })

  const symbols = [...symbolMap.values()]
    .sort((a, b) => b.screeners.length - a.screeners.length)
    .slice(0, 30)
  if (symbols.length === 0) return { data: [] }

  // 2. For each stock, fetch broker summary + foreign flow in parallel
  const ep = (template, sym) => template.replace('{symbol}', sym)
  // Batch broker+foreign data fetches with concurrency limit to avoid rate limits
  const BATCH_SIZE = 5
  const results = []
  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(batch.map(async (s) => enrichStock(config, ep, s)))
    results.push(...batchResults)
  }

  return { data: results }
}

async function enrichStock(config, ep, { symbol, name, screeners }) {
  const [brokerResult, broker1mResult, fdResult] = await Promise.allSettled([
    stockbitFetch(ep(config.endpoints.stockBrokerSummary, symbol), {
      investor_type: '1',
      limit: '25',
      market_board: '2',
      period: 'BROKER_SUMMARY_PERIOD_LATEST',
      transaction_type: '1',
    }),
    stockbitFetch(ep(config.endpoints.stockBrokerSummary, symbol), {
      investor_type: '1',
      limit: '25',
      market_board: '2',
      period: 'BROKER_SUMMARY_PERIOD_LAST_1_MONTH',
      transaction_type: '1',
    }),
    stockbitFetch(ep(config.endpoints.stockForeignDomestic, symbol), {
      market_type: 'MARKET_TYPE_REGULAR',
      period: 'PERIOD_RANGE_1D',
    }),
  ])

  const brokerData = brokerResult.status === 'fulfilled' ? brokerResult.value?.data : null
  const broker1mData = broker1mResult.status === 'fulfilled' ? broker1mResult.value?.data : null
  const fdData = fdResult.status === 'fulfilled' ? fdResult.value?.data : null

  const bandarDetector = brokerData?.bandar_detector || {}
  const bandar1mDetector = broker1mData?.bandar_detector || {}
  const brokerSummary = brokerData?.broker_summary || {}
  const fdSummary = fdData?.summary || {}

  return {
    symbol,
    name,
    screeners: screeners || [],
    bandar: {
      signal: bandarDetector.broker_accdist || '-',
      top1Pct: bandarDetector.top1?.percent ?? null,
      top3Pct: bandarDetector.top3?.percent ?? null,
      top5Pct: bandarDetector.top5?.percent ?? null,
      totalBuyer: bandarDetector.total_buyer ?? 0,
      totalSeller: bandarDetector.total_seller ?? 0,
      avgPrice: bandarDetector.average ?? 0,
    },
    foreignFlow: {
      netForeignRaw: fdSummary.net_foreign?.value?.raw ?? null,
      netForeignFmt: fdSummary.net_foreign?.value?.formatted || '-',
      netForeignLabel: fdSummary.net_foreign?.label || '',
    },
    topBuyers: (brokerSummary.brokers_buy || []).slice(0, 5).map((b) => ({
      code: b.netbs_broker_code || '',
      type: b.type || '',
      value: parseFloat(b.bval) || 0,
      lot: parseInt(b.blot) || 0,
      avgPrice: parseFloat(b.netbs_buy_avg_price) || 0,
    })),
    topSellers: (brokerSummary.brokers_sell || []).slice(0, 5).map((s) => ({
      code: s.netbs_broker_code || '',
      type: s.type || '',
      value: Math.abs(parseFloat(s.sval)) || 0,
      lot: Math.abs(parseInt(s.slot)) || 0,
      avgPrice: parseFloat(s.netbs_sell_avg_price) || 0,
    })),
    phase: analyzePhase(bandarDetector, bandar1mDetector, fdSummary, screeners),
  }
}

export async function fetchScreenerTemplate(id) {
  const config = loadConfig()
  await screenerPaywallGate()
  const endpoint = config.endpoints.screenerTemplate.replace('{id}', id)
  const raw = await stockbitFetch(endpoint, { limit: '25', type: 'TEMPLATE_TYPE_GURU' })

  // Handle calcs[] format (guru screener templates)
  const calcs = raw?.data?.calcs || []
  if (calcs.length > 0) {
    return {
      data: calcs.map((c) => ({
        symbol: c.company?.symbol || '',
        company_name: c.company?.name || '',
        metrics: (c.results || []).map((r) => ({
          name: r.item,
          value: r.display,
        })),
      })),
      screenName: raw.data.screen_name || '',
      screenDesc: raw.data.screen_desc || '',
    }
  }

  // Fallback for other formats
  const list = raw?.data?.results || raw?.data?.stocks || []
  if (!Array.isArray(list)) return { data: [] }
  return {
    data: list.map((item) => ({
      symbol: item.symbol || item.code || '',
      company_name: item.company_name || item.name || '',
    })),
  }
}
