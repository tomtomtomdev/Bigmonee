import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const LOG_PATH = path.resolve('data/api-log.json')
const DETAILS_DIR = path.resolve('data/details')
const CAPTURED_PATH = path.resolve('data/api-captured-requests.json')
const BODY_SIZE_LIMIT = 100 * 1024 // 100KB
const MAX_LOGS = 500

let logs = []
const logDetails = new Map()
// Raw (unmasked) request data per URL path for replay by stockbit-client
const capturedRequests = new Map()

const SENSITIVE_HEADERS = ['authorization', 'cookie', 'set-cookie', 'x-api-key']

function maskSensitiveHeaders(headers) {
  if (!headers) return {}
  const masked = { ...headers }
  for (const key of Object.keys(masked)) {
    if (SENSITIVE_HEADERS.includes(key.toLowerCase())) {
      const val = String(masked[key])
      masked[key] = val.length > 8 ? val.slice(0, 4) + '****' + val.slice(-4) : '****'
    }
  }
  return masked
}

function isTextContent(contentType) {
  if (!contentType) return false
  return contentType.includes('json') || contentType.includes('text') || contentType.includes('xml') || contentType.includes('javascript')
}

function saveDetail(id, detail) {
  fs.mkdirSync(DETAILS_DIR, { recursive: true })
  fs.writeFileSync(path.join(DETAILS_DIR, `${id}.json`), JSON.stringify(detail))
}

function loadDetail(id) {
  try {
    const filePath = path.join(DETAILS_DIR, `${id}.json`)
    if (fs.existsSync(filePath)) {
      const detail = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      logDetails.set(id, detail)
      return detail
    }
  } catch { /* ignore */ }
  return null
}

function deleteDetail(id) {
  try {
    const filePath = path.join(DETAILS_DIR, `${id}.json`)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  } catch { /* ignore */ }
}

function saveCaptured() {
  fs.mkdirSync(path.dirname(CAPTURED_PATH), { recursive: true })
  fs.writeFileSync(CAPTURED_PATH, JSON.stringify(Object.fromEntries(capturedRequests)))
}

// Load persisted state
try {
  if (fs.existsSync(LOG_PATH)) {
    logs = JSON.parse(fs.readFileSync(LOG_PATH, 'utf-8'))
  }
} catch { /* ignore */ }

try {
  if (fs.existsSync(CAPTURED_PATH)) {
    const obj = JSON.parse(fs.readFileSync(CAPTURED_PATH, 'utf-8'))
    for (const [urlPath, data] of Object.entries(obj)) {
      capturedRequests.set(urlPath, data)
    }
  }
} catch { /* ignore */ }

export function logRequest({ method, url, host, statusCode, contentType, responseSize, requestHeaders, requestBody, responseHeaders, responseBody }) {
  const id = crypto.randomUUID()

  const entry = {
    id,
    method,
    url,
    host,
    statusCode,
    contentType,
    responseSize,
    timestamp: new Date().toISOString(),
  }

  // Store detail separately
  let storedRequestBody = null
  let storedResponseBody = null
  let requestBodyTruncated = false
  let responseBodyTruncated = false

  if (requestBody && isTextContent(contentType)) {
    if (Buffer.byteLength(requestBody, 'utf-8') > BODY_SIZE_LIMIT) {
      storedRequestBody = requestBody.slice(0, BODY_SIZE_LIMIT)
      requestBodyTruncated = true
    } else {
      storedRequestBody = requestBody
    }
  }

  if (responseBody && isTextContent(contentType)) {
    if (Buffer.byteLength(responseBody, 'utf-8') > BODY_SIZE_LIMIT) {
      storedResponseBody = responseBody.slice(0, BODY_SIZE_LIMIT)
      responseBodyTruncated = true
    } else {
      storedResponseBody = responseBody
    }
  }

  const detail = {
    requestHeaders: maskSensitiveHeaders(requestHeaders),
    requestBody: storedRequestBody,
    requestBodyTruncated,
    responseHeaders: responseHeaders || {},
    responseBody: storedResponseBody,
    responseBodyTruncated,
  }

  logDetails.set(id, detail)
  saveDetail(id, detail)

  // Store raw request data keyed by URL path (without query string) for replay
  if (requestHeaders && host?.endsWith('.stockbit.com')) {
    try {
      const urlPath = new URL(url).pathname
      capturedRequests.set(urlPath, {
        headers: { ...requestHeaders },
        body: requestBody || null,
        method,
        capturedAt: entry.timestamp,
      })
    } catch { /* invalid url */ }
  }

  logs.unshift(entry)
  if (logs.length > MAX_LOGS) {
    const removed = logs.splice(MAX_LOGS)
    for (const old of removed) {
      logDetails.delete(old.id)
      deleteDetail(old.id)
    }
  }

  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true })
  fs.writeFileSync(LOG_PATH, JSON.stringify(logs, null, 2))
  saveCaptured()

  return entry
}

export function getLogs() {
  return logs
}

export function clearLogs() {
  for (const log of logs) {
    deleteDetail(log.id)
  }
  logs.length = 0
  logDetails.clear()
  fs.writeFileSync(LOG_PATH, '[]')
}

export function getLogDetail(id) {
  const summary = logs.find((l) => l.id === id)
  if (!summary) return null
  let detail = logDetails.get(id)
  if (!detail) detail = loadDetail(id) || {}
  return { ...summary, ...detail }
}

export function findCapturedRequest(urlPath) {
  return capturedRequests.get(urlPath) || null
}

export function getLatestExodusHeaders() {
  const entry = logs.find((l) => l.host === 'exodus.stockbit.com')
  if (!entry) return null
  let detail = logDetails.get(entry.id)
  if (!detail) detail = loadDetail(entry.id)
  return detail?.requestHeaders || null
}

export function searchLogs({ query, method, statusCode } = {}) {
  let results = logs
  if (query) {
    const q = query.toLowerCase()
    results = results.filter((l) => l.url.toLowerCase().includes(q))
  }
  if (method) {
    results = results.filter((l) => l.method === method.toUpperCase())
  }
  if (statusCode) {
    const code = Number(statusCode)
    if (!isNaN(code)) {
      results = results.filter((l) => l.statusCode === code)
    }
  }
  return results
}
