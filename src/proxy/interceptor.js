import zlib from 'zlib'
import { tokenManager } from '../server/token-manager.js'
import { logRequest } from '../server/api-logger.js'
import { broadcast } from '../server/websocket.js'
import { updateProfile } from '../server/header-profile.js'

const STOCKBIT_HOSTS = ['api.stockbit.com', 'exodus.stockbit.com', 'ustradingapi.stockbit.com']

function isStockbitHost(host) {
  if (!host) return false
  return STOCKBIT_HOSTS.some((h) => host === h) || host.endsWith('.stockbit.com')
}

function extractToken(headers) {
  const auth = headers['authorization'] || headers['Authorization']
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim()
  }
  return null
}

function decompressBody(buf, encoding) {
  return new Promise((resolve, reject) => {
    if (!encoding || encoding === 'identity') {
      return resolve(buf)
    }
    const enc = encoding.toLowerCase()
    if (enc === 'gzip' || enc === 'x-gzip') {
      zlib.gunzip(buf, (err, result) => (err ? reject(err) : resolve(result)))
    } else if (enc === 'deflate') {
      zlib.inflate(buf, (err, result) => (err ? reject(err) : resolve(result)))
    } else if (enc === 'br') {
      zlib.brotliDecompress(buf, (err, result) => (err ? reject(err) : resolve(result)))
    } else {
      resolve(buf)
    }
  })
}

export function setupInterceptor(proxy) {
  // Extract token from request headers
  proxy.onRequest(function (ctx, callback) {
    const host = ctx.clientToProxyRequest.headers.host?.split(':')[0]
    const method = ctx.clientToProxyRequest.method
    const url = ctx.clientToProxyRequest.url

    // Extract token from request Authorization header
    const token = extractToken(ctx.clientToProxyRequest.headers)
    if (token && isStockbitHost(host)) {
      tokenManager.setToken(token)
      broadcast('token:captured', tokenManager.info())
    }

    // Learn header profile from requests to api.stockbit.com
    if (isStockbitHost(host)) {
      updateProfile(ctx.clientToProxyRequest.headers)
    }

    // For Stockbit hosts, accumulate response body to log and inspect
    if (isStockbitHost(host)) {
      const fullUrl = `https://${host}${url}`
      const responseChunks = []
      const requestChunks = []
      const requestHeaders = { ...ctx.clientToProxyRequest.headers }

      // Capture request body
      ctx.onRequestData(function (ctx, chunk, callback) {
        requestChunks.push(chunk)
        return callback(null, chunk)
      })

      ctx.onResponseData(function (ctx, chunk, callback) {
        responseChunks.push(chunk)
        return callback(null, chunk) // pass through unchanged
      })

      ctx.onResponseEnd(function (ctx, callback) {
        const rawBody = Buffer.concat(responseChunks)
        const encoding = ctx.serverToProxyResponse.headers['content-encoding']
        const statusCode = ctx.serverToProxyResponse.statusCode
        const contentType = ctx.serverToProxyResponse.headers['content-type'] || ''
        const responseHeaders = { ...ctx.serverToProxyResponse.headers }

        const requestBody = requestChunks.length > 0 ? Buffer.concat(requestChunks).toString('utf-8') : null

        // Decompress and inspect response body for tokens
        decompressBody(rawBody, encoding)
          .then((decompressed) => {
            const responseBodyStr = decompressed.toString('utf-8')

            // Log the intercepted request with full data
            logRequest({
              method,
              url: fullUrl,
              host,
              statusCode,
              contentType,
              responseSize: rawBody.length,
              requestHeaders,
              requestBody,
              responseHeaders,
              responseBody: responseBodyStr,
            })

            if (contentType.includes('json')) {
              try {
                const json = JSON.parse(responseBodyStr)
                if (json.data?.access_token) {
                  tokenManager.setToken(json.data.access_token)
                  broadcast('token:captured', tokenManager.info())
                }
              } catch { /* not valid json */ }
            }
          })
          .catch((err) => {
            console.error(`[proxy] Decompress error for ${fullUrl}:`, err.message)
            // Still log even if decompression fails
            logRequest({
              method,
              url: fullUrl,
              host,
              statusCode,
              contentType,
              responseSize: rawBody.length,
              requestHeaders,
              requestBody,
              responseHeaders,
              responseBody: null,
            })
          })
          .finally(() => {
            callback()
          })
      })
    }

    callback()
  })

  proxy.onError(function (ctx, err) {
    console.error('[proxy] Error:', err.message)
  })
}
