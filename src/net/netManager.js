import { create } from 'zustand'
import { SoloAdapter, TabAdapter, WebSocketAdapter } from './adapters.js'
import { useEnv } from '../state/environment.js'

// React-facing summary of the session (who's here, status, chat log).
export const usePeers = create(() => ({
  status: 'offline', // 'offline' | 'connecting' | 'online' | 'error'
  transport: 'solo',
  error: null,
  peers: [], // [{ id, name, accent, skin }]
  chat: [], // [{ id, name, text, at, self }]
}))

// Per-frame peer data lives outside React.
// peerData.get(id) = { info, from, to, t0, t1, yaw, speed, grounded, emote, emoteUntil, bubble, bubbleUntil }
export const peerData = new Map()

const SEND_HZ = 15

export const net = {
  adapter: new SoloAdapter(),
  selfId: 'me',
  selfInfo: null,
  lastSend: 0,

  async connect(kind, { room = 'lobby', url, info, adminToken }) {
    this.disconnect()
    this.selfInfo = info
    const adapter = kind === 'tabs' ? new TabAdapter() : kind === 'server' ? new WebSocketAdapter(url) : new SoloAdapter()
    usePeers.setState({ status: kind === 'solo' ? 'offline' : 'connecting', transport: kind, error: null, peers: [], chat: [] })
    try {
      this.selfId = await adapter.connect({
        room,
        info,
        adminToken,
        onMessage: (m) => this.receive(m),
        onStatus: (s) => usePeers.setState({ status: s }),
      })
      this.adapter = adapter
      if (kind !== 'solo') usePeers.setState({ status: 'online', isAdmin: !!adapter.admin || kind === 'tabs' })
      return true
    } catch (e) {
      usePeers.setState({ status: 'error', error: e.message })
      this.adapter = new SoloAdapter()
      return false
    }
  },

  disconnect() {
    this.adapter?.close()
    this.adapter = new SoloAdapter()
    peerData.clear()
    usePeers.setState({ status: 'offline', transport: 'solo', peers: [], error: null })
  },

  receive(m) {
    if (!m || !m.id || m.id === this.selfId) return
    if (m.t === 'env') {
      // owner changed time of day / weather for everyone
      useEnv.getState().set({ time: m.time, weather: m.weather, running: m.running, speed: m.speed })
      return
    }
    const now = performance.now()
    let pd = peerData.get(m.id)
    if (m.t === 'join') {
      if (!pd) {
        pd = { info: m.info, from: null, to: null, t0: now, t1: now, yaw: 0, speed: 0, grounded: true, emote: null, emoteUntil: 0, bubble: null, bubbleUntil: 0 }
        peerData.set(m.id, pd)
      } else pd.info = m.info
      this.syncList()
      return
    }
    if (m.t === 'leave') {
      peerData.delete(m.id)
      this.syncList()
      return
    }
    if (!pd) {
      // state from someone we haven't been introduced to yet
      pd = { info: { name: 'Visitor', accent: '#00e5d0', skin: '#d9a37a' }, from: null, to: null, t0: now, t1: now, yaw: 0, speed: 0, grounded: true, emote: null, emoteUntil: 0, bubble: null, bubbleUntil: 0 }
      peerData.set(m.id, pd)
      this.syncList()
    }
    if (m.t === 'state') {
      pd.from = pd.to ? [...pd.to] : m.p
      pd.to = m.p
      pd.t0 = now
      pd.t1 = now + 1000 / SEND_HZ
      pd.targetYaw = m.y
      pd.speed = m.s
      pd.grounded = !!m.g
      pd.sit = m.st ? 1 : 0
      pd.swim = m.sw ? 'swim' : null
      pd.sitHeight = m.sh || 0.45
    } else if (m.t === 'emote') {
      pd.emote = m.e
      pd.emoteUntil = now + 2400
    } else if (m.t === 'chat') {
      const text = String(m.text || '').slice(0, 140)
      pd.bubble = text
      pd.bubbleUntil = now + 6000
      pd.bubbleRev = (pd.bubbleRev || 0) + 1
      usePeers.setState((s) => ({ chat: [...s.chat.slice(-30), { id: m.id, name: pd.info?.name || 'Visitor', text, at: Date.now() }] }))
    }
  },

  syncList() {
    usePeers.setState({ peers: [...peerData.entries()].map(([id, pd]) => ({ id, ...pd.info })) })
  },

  /** Called every frame by the player sync component; throttled to SEND_HZ. */
  tickSend(now, ps) {
    if (this.adapter.kind === 'solo') return
    if (now - this.lastSend < 1000 / SEND_HZ) return
    this.lastSend = now
    this.adapter.send({
      t: 'state',
      p: [+ps.position.x.toFixed(3), +ps.position.y.toFixed(3), +ps.position.z.toFixed(3)],
      y: +ps.yaw.toFixed(3),
      s: +ps.speed.toFixed(2),
      g: ps.grounded ? 1 : 0,
      st: ps.sit ? 1 : 0,
      sw: ps.swim === 'swim' ? 1 : 0,
      sh: +(ps.sitHeight || 0.45).toFixed(2),
    })
  },
  sendEmote(e) { this.adapter.send({ t: 'emote', e }) },
  /** Owner only (the server ignores everyone else): share time of day + weather. */
  sendEnv(env) { this.adapter.send({ t: 'env', ...env }) },
  sendChat(text) {
    const clean = text.trim().slice(0, 140)
    if (!clean) return
    this.adapter.send({ t: 'chat', text: clean })
    usePeers.setState((s) => ({ chat: [...s.chat.slice(-30), { id: this.selfId, name: this.selfInfo?.name || 'You', text: clean, at: Date.now(), self: true }] }))
  },
}
