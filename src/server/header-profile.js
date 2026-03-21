import fs from 'fs'
import path from 'path'
import { getLatestExodusHeaders } from './api-logger.js'

const PROFILE_PATH = path.resolve('data/header-profile.json')
const MIN_UPDATE_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

const EXCLUDED_HEADERS = new Set([
  'host',
  'content-length',
  'content-encoding',
  'transfer-encoding',
  'connection',
  'keep-alive',
  'proxy-connection',
  'proxy-authorization',
])

let profile = null

// Load from disk on startup
try {
  if (fs.existsSync(PROFILE_PATH)) {
    profile = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf-8'))
  }
} catch {
  profile = null
}

function save() {
  fs.mkdirSync(path.dirname(PROFILE_PATH), { recursive: true })
  fs.writeFileSync(PROFILE_PATH, JSON.stringify(profile, null, 2))
}

export function updateProfile(headers) {
  // Skip if current profile is fresh enough
  if (profile && (Date.now() - profile.capturedAt) < MIN_UPDATE_INTERVAL_MS) {
    return
  }

  const filtered = {}
  for (const [key, value] of Object.entries(headers)) {
    if (!EXCLUDED_HEADERS.has(key.toLowerCase())) {
      filtered[key.toLowerCase()] = value
    }
  }

  profile = {
    headers: filtered,
    capturedAt: Date.now(),
  }
  save()
}

export function getProfile() {
  if (!profile) {
    const headers = getLatestExodusHeaders()
    if (headers) {
      updateProfile(headers)
    }
  }
  return profile
}

export function clearProfile() {
  profile = null
  try {
    fs.unlinkSync(PROFILE_PATH)
  } catch { /* file may not exist */ }
}
