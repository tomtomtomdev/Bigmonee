const BASE = ''

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export const api = {
  getStatus: () => apiFetch('/api/status'),
  getToken: () => apiFetch('/api/token'),
  deleteToken: () => apiFetch('/api/token', { method: 'DELETE' }),
  getIHSG: (range = '1d') => apiFetch(`/api/ihsg?range=${range}`),
  getTopGainers: () => apiFetch('/api/top-gainers'),
  getTopLosers: () => apiFetch('/api/top-losers'),
  getTopValue: () => apiFetch('/api/top-value'),
  getTopVolume: () => apiFetch('/api/top-volume'),
  getStockDetail: (symbol, params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiFetch(`/api/stock/${symbol}${qs ? `?${qs}` : ''}`)
  },
  getTopBrokers: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiFetch(`/api/top-brokers${qs ? `?${qs}` : ''}`)
  },
  getMarketSummary: () => apiFetch('/api/market-summary'),
  getBandarScan: () => apiFetch('/api/bandar-scan'),
  getScreenerPresets: () => apiFetch('/api/screener/presets'),
  getScreenerTemplate: (id) => apiFetch(`/api/screener/templates/${id}`),
  getDiscoveredEndpoints: () => apiFetch('/api/discovered-endpoints'),
  clearDiscoveredEndpoints: () => apiFetch('/api/discovered-endpoints', { method: 'DELETE' }),
  searchEndpoints: ({ q, method, status } = {}) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (method) params.set('method', method)
    if (status) params.set('status', status)
    const qs = params.toString()
    return apiFetch(`/api/discovered-endpoints${qs ? `?${qs}` : ''}`)
  },
  getEndpointDetail: (id) => apiFetch(`/api/discovered-endpoints/${id}`),
  getHeaderProfile: () => apiFetch('/api/header-profile'),
  deleteHeaderProfile: () => apiFetch('/api/header-profile', { method: 'DELETE' }),
  getConfig: () => apiFetch('/api/config'),
  updateConfig: (config) => apiFetch('/api/config', { method: 'PUT', body: JSON.stringify(config) }),
}
