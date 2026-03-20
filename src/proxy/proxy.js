import { Proxy } from 'http-mitm-proxy'
import path from 'path'
import fs from 'fs'
import { setupInterceptor } from './interceptor.js'

const SSL_CA_DIR = path.resolve('data/certs')

export function createProxy(port = 8001) {
  fs.mkdirSync(SSL_CA_DIR, { recursive: true })

  const proxy = new Proxy()

  setupInterceptor(proxy)

  proxy.listen({ port, host: '0.0.0.0', sslCaDir: SSL_CA_DIR, silent: true }, () => {
    console.log(`[proxy] MITM proxy listening on 0.0.0.0:${port}`)
    console.log(`[proxy] CA cert dir: ${SSL_CA_DIR}`)
  })

  return proxy
}

export function getCACertPath() {
  // http-mitm-proxy stores CA in sslCaDir/certs/ca.pem
  const paths = [
    path.join(SSL_CA_DIR, 'certs', 'ca.pem'),
    path.join(SSL_CA_DIR, 'ca.pem'),
  ]
  for (const p of paths) {
    if (fs.existsSync(p)) return p
  }
  return null
}
