// Vision Storms World relay server.
// A small real-time backend: visitors join a room, and the server relays position, emote
// and chat messages to everyone else in that room. Run with `npm run server`.
// Deploy to any Node host that supports WebSockets (Render, Railway, Fly.io, a VPS) and
// enter its wss:// address in the Multiplayer option of the title screen.
import { WebSocketServer } from 'ws'
import http from 'node:http'

const PORT = Number(process.env.PORT || 8787)
const MAX_PER_ROOM = Number(process.env.MAX_PER_ROOM || 50)

const rooms = new Map() // room -> Map(id -> { ws, info })
const rid = () => Math.random().toString(36).slice(2, 10)

const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f]/g, '').slice(0, n)
const cleanInfo = (info = {}) => ({
  name: clean(info.name, 20) || 'Guest',
  accent: /^#[0-9a-f]{6}$/i.test(info.accent) ? info.accent : '#a33cff',
  skin: /^#[0-9a-f]{6}$/i.test(info.skin) ? info.skin : '#d9a37a',
})

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, players: [...rooms.values()].reduce((a, r) => a + r.size, 0) }))
    return
  }
  res.writeHead(200, { 'content-type': 'text/plain' })
  res.end('Vision Storms World relay is running.')
})

const wss = new WebSocketServer({ server, maxPayload: 4 * 1024 })

function broadcast(room, from, msg) {
  const data = JSON.stringify(msg)
  for (const [id, peer] of rooms.get(room) || []) {
    if (id !== from && peer.ws.readyState === 1) peer.ws.send(data)
  }
}

wss.on('connection', (ws) => {
  let id = null
  let room = null
  let lastChat = 0
  ws.isAlive = true
  ws.on('pong', () => { ws.isAlive = true })

  ws.on('message', (raw) => {
    let msg
    try { msg = JSON.parse(raw) } catch { return }
    if (!id) {
      if (msg.t !== 'join') return
      room = clean(msg.room, 32) || 'lobby'
      if (!rooms.has(room)) rooms.set(room, new Map())
      const members = rooms.get(room)
      if (members.size >= MAX_PER_ROOM) { ws.send(JSON.stringify({ t: 'full' })); ws.close(); return }
      id = rid()
      const info = cleanInfo(msg.info)
      ws.send(JSON.stringify({ t: 'welcome', id, peers: [...members].map(([pid, p]) => ({ id: pid, info: p.info })) }))
      members.set(id, { ws, info })
      broadcast(room, id, { t: 'join', id, info })
      return
    }
    switch (msg.t) {
      case 'state':
        if (!Array.isArray(msg.p) || msg.p.length !== 3 || !msg.p.every(Number.isFinite)) return
        broadcast(room, id, { t: 'state', id, p: msg.p, y: +msg.y || 0, s: +msg.s || 0, g: msg.g ? 1 : 0 })
        break
      case 'emote':
        broadcast(room, id, { t: 'emote', id, e: clean(msg.e, 16) })
        break
      case 'chat': {
        const now = Date.now()
        if (now - lastChat < 500) return
        lastChat = now
        const text = clean(msg.text, 140).trim()
        if (text) broadcast(room, id, { t: 'chat', id, text })
        break
      }
    }
  })

  ws.on('close', () => {
    if (!id || !room) return
    const members = rooms.get(room)
    members?.delete(id)
    broadcast(room, id, { t: 'leave', id })
    if (members && members.size === 0) rooms.delete(room)
  })
})

// drop dead connections
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue }
    ws.isAlive = false
    ws.ping()
  }
}, 15000)

server.listen(PORT, () => console.log(`Vision Storms World relay listening on :${PORT}`))
