import { WebSocketServer } from 'ws'

let wss = null

export function initWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws) => {
    console.log('[ws] Client connected')
    ws.on('close', () => console.log('[ws] Client disconnected'))
  })
}

export function broadcast(event, data) {
  if (!wss) return
  const msg = JSON.stringify({ event, data })
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(msg)
    }
  }
}
