import fs from 'fs'
import path from 'path'
import { EventEmitter } from 'events'

const TOKEN_PATH = path.resolve('data/token.json')

class TokenManager extends EventEmitter {
  constructor() {
    super()
    this.token = null
    this.capturedAt = null
    this.load()
  }

  load() {
    try {
      if (fs.existsSync(TOKEN_PATH)) {
        const data = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'))
        this.token = data.token
        this.capturedAt = data.capturedAt
      }
    } catch {
      // ignore
    }
  }

  setToken(token) {
    if (token === this.token) return
    this.token = token
    this.capturedAt = new Date().toISOString()
    fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true })
    fs.writeFileSync(TOKEN_PATH, JSON.stringify({ token: this.token, capturedAt: this.capturedAt }, null, 2))
    this.emit('captured', { token: this.masked(), capturedAt: this.capturedAt })
    console.log(`[token] Captured at ${this.capturedAt}`)
  }

  getToken() {
    return this.token
  }

  masked() {
    if (!this.token) return null
    return this.token.slice(0, 10) + '...' + this.token.slice(-6)
  }

  info() {
    return {
      hasToken: !!this.token,
      masked: this.masked(),
      capturedAt: this.capturedAt,
      ageMinutes: this.capturedAt ? Math.round((Date.now() - new Date(this.capturedAt).getTime()) / 60000) : null,
    }
  }

  clear() {
    this.token = null
    this.capturedAt = null
    try { fs.unlinkSync(TOKEN_PATH) } catch { /* ignore */ }
    this.emit('cleared')
  }
}

export const tokenManager = new TokenManager()
