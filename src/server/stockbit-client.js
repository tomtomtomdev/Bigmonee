import fs from 'fs'
import path from 'path'
import { tokenManager } from './token-manager.js'
import { cache } from './cache.js'
import { getProfile } from './header-profile.js'

const CONFIG_PATH = path.resolve('data/config.json')

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
  } catch {
    return JSON.parse(fs.readFileSync(path.resolve('config.default.json'), 'utf-8'))
  }
}

async function stockbitFetch(endpoint, params = {}) {
  const token = tokenManager.getToken()
  if (!token) throw new Error('No access token captured yet')

  const config = loadConfig()
  const url = new URL(config.stockbitBaseUrl + endpoint)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }

  const cacheKey = url.toString()
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const profile = getProfile()
  let headers
  if (profile) {
    headers = { ...profile.headers, authorization: `Bearer ${token}`, host: url.hostname }
  } else {
    headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'User-Agent': 'Stockbit-iOS/5.0',
    }
  }

  const res = await fetch(url.toString(), { headers })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Stockbit API ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  cache.set(cacheKey, data)
  return data
}

export async function fetchIHSG(range = '1d') {
  const config = loadConfig()
  return stockbitFetch(config.endpoints.ihsgChart, { range })
}

export async function fetchTopGainers() {
  const config = loadConfig()
  return stockbitFetch(config.endpoints.topGainers, { page: '1', per_page: '20' })
}

export async function fetchTopLosers() {
  const config = loadConfig()
  return stockbitFetch(config.endpoints.topLosers, { page: '1', per_page: '20' })
}

export async function fetchTopValue() {
  const config = loadConfig()
  return stockbitFetch(config.endpoints.topValue, { page: '1', per_page: '20' })
}

export async function fetchTopVolume() {
  const config = loadConfig()
  return stockbitFetch(config.endpoints.topVolume, { page: '1', per_page: '20' })
}

export async function fetchMarketSummary() {
  const config = loadConfig()
  return stockbitFetch(config.endpoints.marketSummary)
}
