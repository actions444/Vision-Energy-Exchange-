// Network transports. The game only talks to the `NetworkAdapter` shape below, so a hosted
// real-time backend (Colyseus, Socket.IO, Ably, Liveblocks, PartyKit, Supabase Realtime,
// Photon, etc.) can be dropped in by writing one more adapter with the same four methods.
//
// interface NetworkAdapter {
//   connect({ room, info, onMessage, onStatus }): Promise<string /* self id */>
//   send(msg): void            // { t: 'state' | 'chat' | 'emote', ... }
//   close(): void
//   readonly kind: string
// }
//
// Incoming messages always carry the sender's `id`:
//   { t: 'join', id, info }           a peer arrived (info = { name, accent, skin })
//   { t: 'state', id, p, y, s, g }    position [x,y,z], yaw, speed, grounded
//   { t: 'emote', id, e }             e.g. 'wave'
//   { t: 'chat', id, text }
//   { t: 'leave', id }

const rid = () => Math.random().toString(36).slice(2, 10)

/** Single-player: nothing leaves the browser. */
export class SoloAdapter {
  kind = 'solo'
  async connect() { return 'me' }
  send() {}
  close() {}
}

/**
 * Same-browser multiplayer over BroadcastChannel. Open the world in two tabs or windows
 * and each sees the other. Useful for testing the full multiplayer pipeline with no server.
 */
export class TabAdapter {
  kind = 'tabs'
  async connect({ room, info, onMessage, onStatus }) {
    if (typeof BroadcastChannel === 'undefined') throw new Error('This browser does not support tab-to-tab channels.')
    this.id = rid()
    this.info = info
    this.ch = new BroadcastChannel('vsw-room-' + room)
    this.seen = new Map()
    this.ch.onmessage = (ev) => {
      const msg = ev.data
      if (!msg || msg.id === this.id) return
      if (msg.to && msg.to !== this.id) return
      const known = this.seen.has(msg.id)
      this.seen.set(msg.id, performance.now())
      if (msg.t === 'hello') {
        onMessage({ t: 'join', id: msg.id, info: msg.info })
        if (!msg.reply) this.ch.postMessage({ t: 'hello', id: this.id, info: this.info, reply: true, to: msg.id })
        return
      }
      if (msg.t === 'leave') { this.seen.delete(msg.id); onMessage(msg); return }
      if (!known && msg.t === 'state') this.ch.postMessage({ t: 'hello', id: this.id, info: this.info, to: msg.id })
      onMessage(msg)
    }
    // drop peers whose tab closed without saying goodbye
    this.sweep = setInterval(() => {
      const now = performance.now()
      for (const [id, t] of this.seen) if (now - t > 5000) { this.seen.delete(id); onMessage({ t: 'leave', id }) }
    }, 1000)
    this.unload = () => this.close()
    window.addEventListener('pagehide', this.unload)
    this.ch.postMessage({ t: 'hello', id: this.id, info })
    onStatus?.('online')
    return this.id
  }
  send(msg) { try { this.ch?.postMessage({ ...msg, id: this.id }) } catch {} }
  close() {
    if (!this.ch) return
    try { this.ch.postMessage({ t: 'leave', id: this.id }) } catch {}
    this.ch.close()
    this.ch = null
    clearInterval(this.sweep)
    window.removeEventListener('pagehide', this.unload)
  }
}

/** Internet multiplayer through the relay server in /server (or any server speaking the same JSON). */
export class WebSocketAdapter {
  kind = 'server'
  constructor(url) { this.url = url }
  connect({ room, info, onMessage, onStatus }) {
    return new Promise((resolve, reject) => {
      let ws
      try { ws = new WebSocket(this.url) } catch (e) { reject(new Error('Invalid server address.')); return }
      this.ws = ws
      let welcomed = false
      const timer = setTimeout(() => { if (!welcomed) { ws.close(); reject(new Error('The server did not answer within 8 seconds.')) } }, 8000)
      ws.onopen = () => ws.send(JSON.stringify({ t: 'join', room, info }))
      ws.onmessage = (ev) => {
        let msg
        try { msg = JSON.parse(ev.data) } catch { return }
        if (msg.t === 'welcome') {
          welcomed = true
          clearTimeout(timer)
          this.id = msg.id
          onStatus?.('online')
          resolve(msg.id)
          for (const p of msg.peers || []) onMessage({ t: 'join', id: p.id, info: p.info })
          return
        }
        onMessage(msg)
      }
      ws.onerror = () => { if (!welcomed) { clearTimeout(timer); reject(new Error('Could not reach the server at ' + this.url + '.')) } }
      ws.onclose = () => { if (welcomed) onStatus?.('offline') }
    })
  }
  send(msg) { if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(msg)) }
  close() { try { this.ws?.close() } catch {} this.ws = null }
}
