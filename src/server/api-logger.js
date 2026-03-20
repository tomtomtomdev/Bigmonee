import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const LOG_PATH = path.resolve('data/api-log.json')
const BODY_SIZE_LIMIT = 100 * 1024 // 100KB
const MAX_LOGS = 500

let logs = []
const logDetails = new Map()

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

try {
  if (fs.existsSync(LOG_PATH)) {
    logs = JSON.parse(fs.readFileSync(LOG_PATH, 'utf-8'))
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

  logDetails.set(id, {
    requestHeaders: maskSensitiveHeaders(requestHeaders),
    requestBody: storedRequestBody,
    requestBodyTruncated,
    responseHeaders: responseHeaders || {},
    responseBody: storedResponseBody,
    responseBodyTruncated,
  })

  logs.unshift(entry)
  if (logs.length > MAX_LOGS) {
    const removed = logs.splice(MAX_LOGS)
    for (const old of removed) {
      logDetails.delete(old.id)
    }
  }

  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true })
  fs.writeFileSync(LOG_PATH, JSON.stringify(logs, null, 2))

  return entry
}

export function getLogs() {
  return logs
}

export function getLogDetail(id) {
  const summary = logs.find((l) => l.id === id)
  if (!summary) return null
  const detail = logDetails.get(id) || {}
  return { ...summary, ...detail }
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
