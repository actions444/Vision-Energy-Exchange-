// Vision Storms World server
//  - WebSocket relay for multiplayer (rooms, positions, sitting, emotes, chat, owner-set weather/time)
//  - Rental API (see rentalsApi.js) with owner auth, server-side access checks and payment webhooks
//  - Serves the built site from ../dist when it exists, so one process can host everything
// Run: npm run server   (PORT, ADMIN_TOKEN, DATA_DIR, MAX_UPLOAD_BYTES, MAX_STORAGE_BYTES, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, DEV_PAYMENTS, PUBLIC_URL, CORS_ORIGIN)
import { WebSocketServer } from 'ws'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { createRentalsApi } from './rentalsApi.js'
import { createStoreApi } from './storeApi.js'
import { spaceById } from '../src/decor/spaces.js'

const PORT = Number(process.env.PORT || 8787)
const MAX_PER_ROOM = Number(process.env.MAX_PER_ROOM || 50)
const CORS = process.env.CORS_ORIGIN || '*'
const DIST = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'dist')
const rentals = createRentalsApi()
const DATA_DIR = process.env.DATA_DIR || path.join(path.dirname(new URL(import.meta.url).pathname), 'data')
const bearer = (req) => (/^Bearer (.+)$/.exec(req.headers.authorization || '') || [])[1]
const store = createStoreApi({
  dataDir: DATA_DIR,
  isAdmin: (req) => rentals.isAdminToken(bearer(req)),
  // renters may save the design of the room they are renting right now (checked against bookings)
  canWriteDoc: (req, col, id) => col === 'decor' && req.method === 'PUT' && rentals.isRenter(req, id),
  validateDoc: (col, id, d) => (col === 'decor' ? validateDecor(id, d) : null),
})

const rooms = new Map() // room -> { members: Map(id -> { ws, info, admin }), env }
const rid = () => Math.random().toString(36).slice(2, 10)
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f]/g, '').slice(0, n)
const cleanInfo = (info = {}) => ({
  name: clean(info.name, 20) || 'Guest',
  accent: /^#[0-9a-f]{6}$/i.test(info.accent) ? info.accent : '#a33cff',
  skin: /^#[0-9a-f]{6}$/i.test(info.skin) ? info.skin : '#d9a37a',
})
/** Server-side check of a room design: known space, sane fields, every item inside the room. */
function validateDecor(id, d) {
  const space = spaceById(id)
  if (!space) return 'Unknown space.'
  if (!Array.isArray(d.items) || d.items.length > 300) return 'Too many items.'
  const [x0, x1, z0, z1] = space.rect
  for (const it of d.items) {
    if (typeof it.itemId !== 'string' || it.itemId.length > 60 || ![it.x, it.z, it.yaw].every(Number.isFinite)) return 'Invalid item.'
    if (it.x < x0 || it.x > x1 || it.z < z0 || it.z > z1) return 'An item is outside this space.'
  }
  for (const k of ['floor', 'light', 'door']) if (d[k] != null && (typeof d[k] !== 'string' || d[k].length > 60)) return 'Invalid ' + k + '.'
  if (d.wall != null && (typeof d.wall !== 'object' || !['paint', 'paper'].includes(d.wall.kind))) return 'Invalid wall finish.'
  return null
}
const WEATHERS = new Set(['clear', 'cloudy', 'rain', 'storm'])

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm' }

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', CORS)
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type, x-customer-token, range')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Expose-Headers', 'content-range, accept-ranges, content-length')
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end() }
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' })
    return res.end(JSON.stringify({ ok: true, now: Date.now(), rooms: rooms.size, players: [...rooms.values()].reduce((a, r) => a + r.members.size, 0), payments: rentals.paymentMode }))
  }
  // media library, music setup, screenings, model placements + uploaded files (streams large uploads)
  if (await store(req, res, url)) return
  if (url.pathname.startsWith('/api/')) {
    let raw = ''
    for await (const chunk of req) { raw += chunk; if (raw.length > 1e6) { res.writeHead(413); return res.end() } }
    if (await rentals(req, res, url, raw)) return
  }
  // static site
  if (fs.existsSync(DIST)) {
    const file = path.normalize(path.join(DIST, url.pathname === '/' ? 'index.html' : url.pathname))
    if (file.startsWith(DIST) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' })
      return fs.createReadStream(file).pipe(res)
    }
    res.writeHead(200, { 'content-type': 'text/html' })
    return fs.createReadStream(path.join(DIST, 'index.html')).pipe(res)
  }
  res.writeHead(200, { 'content-type': 'text/plain' })
  res.end('Vision Storms World server is running.')
})

const wss = new WebSocketServer({ server, maxPayload: 4 * 1024 })

function broadcast(room, from, msg) {
  const data = JSON.stringify(msg)
  for (const [id, peer] of rooms.get(room)?.members || []) if (id !== from && peer.ws.readyState === 1) peer.ws.send(data)
}

wss.on('connection', (ws) => {
  let id = null, room = null, lastChat = 0, admin = false
  ws.isAlive = true
  ws.on('pong', () => { ws.isAlive = true })
  ws.on('message', (raw) => {
    let msg
    try { msg = JSON.parse(raw) } catch { return }
    if (!id) {
      if (msg.t !== 'join') return
      room = clean(msg.room, 32) || 'lobby'
      if (!rooms.has(room)) rooms.set(room, { members: new Map(), env: null })
      const r = rooms.get(room)
      if (r.members.size >= MAX_PER_ROOM) { ws.send(JSON.stringify({ t: 'full' })); ws.close(); return }
      id = rid()
      admin = rentals.isAdminToken(msg.adminToken)
      const info = cleanInfo(msg.info)
      ws.send(JSON.stringify({ t: 'welcome', id, admin, env: r.env, peers: [...r.members].map(([pid, p]) => ({ id: pid, info: p.info })) }))
      r.members.set(id, { ws, info, admin })
      broadcast(room, id, { t: 'join', id, info })
      return
    }
    switch (msg.t) {
      case 'state':
        if (!Array.isArray(msg.p) || msg.p.length !== 3 || !msg.p.every(Number.isFinite)) return
        broadcast(room, id, { t: 'state', id, p: msg.p, y: +msg.y || 0, s: +msg.s || 0, g: msg.g ? 1 : 0, st: msg.st ? 1 : 0, sh: Math.min(1.2, Math.max(0, +msg.sh || 0)) })
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
      case 'env': {
        // only the owner may change time of day / weather for everyone
        if (!admin) return
        const env = { time: Math.min(24, Math.max(0, +msg.time || 0)), weather: WEATHERS.has(msg.weather) ? msg.weather : 'clear', running: !!msg.running, speed: Math.min(60, Math.max(0, +msg.speed || 0)), at: Date.now() }
        rooms.get(room).env = env
        broadcast(room, id, { t: 'env', id, ...env })
        break
      }
    }
  })
  ws.on('close', () => {
    if (!id || !room) return
    const r = rooms.get(room)
    r?.members.delete(id)
    broadcast(room, id, { t: 'leave', id })
    if (r && r.members.size === 0) rooms.delete(room)
  })
})

setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue }
    ws.isAlive = false
    ws.ping()
  }
}, 15000)

server.listen(PORT, () => console.log(`Vision Storms World server on :${PORT} (payments: ${rentals.paymentMode})`))
