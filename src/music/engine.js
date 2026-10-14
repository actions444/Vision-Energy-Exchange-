// Room music engine (Web Audio API).
//
// - A small pool of "decks". Switching rooms fades the current deck out while a fresh deck
//   fades the next playlist in, so there is never a hard cut, even if you run back and forth
//   through a doorway.
// - Track files play through <audio> elements routed into Web Audio (streams long MP3s
//   without decoding them whole). Generated demo tracks play from AudioBuffers.
// - Licensed radio streams play through their own <audio> element (cross-origin streams
//   can't be routed through Web Audio without CORS), with the same fades applied by script.
// - Each playlist remembers where it was, so walking back into a room resumes its music.
// - Volume and mute live on one gain node for every source and persist across rooms and visits.
// - Everything is local to this visitor: in multiplayer each person hears their own room.
import { create } from 'zustand'
import { audioCore, resumeAudio } from '../audio/core.js'
import { useMusicLibrary, resolveTrackSource, resolveArt, getStoredBlob } from './library.js'
import { zoneById } from '../config/rooms.js'

const PREFS = 'vsw-audio'
const ZONE_FADE = 2.5
const TRACK_FADE = 0.8

function loadPrefs() {
  try { return { volume: 0.7, muted: false, ...JSON.parse(localStorage.getItem(PREFS) || '{}') } } catch { return { volume: 0.7, muted: false } }
}
const prefs = loadPrefs()

export const useMusic = create(() => ({
  zoneId: null,
  zoneName: '',
  playlistId: null,
  playlistName: '',
  kind: 'tracks',
  track: null, // { id, title, artist }
  art: null,
  status: 'idle', // idle | loading | playing | silent | blocked | error | embed
  error: null,
  embedUrl: null,
  volume: prefs.volume,
  muted: prefs.muted,
  enabled: false,
}))

// tiny silent WAV, used to "unlock" <audio> elements inside a user gesture on mobile
const SILENT_WAV = (() => {
  const n = 800, b = new ArrayBuffer(44 + n * 2), v = new DataView(b)
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  w(36, 'data'); v.setUint32(40, n * 2, true)
  let s = ''
  new Uint8Array(b).forEach((x) => { s += String.fromCharCode(x) })
  return 'data:audio/wav;base64,' + btoa(s)
})()

class Deck {
  constructor(core, engine) {
    this.core = core
    this.engine = engine
    this.gain = core.ctx.createGain()
    this.gain.gain.value = 0
    this.gain.connect(core.musicBus)
    this.el = new Audio()
    this.el.crossOrigin = 'anonymous'
    this.el.preload = 'auto'
    this.el.playsInline = true
    this.elNode = null
    this.radio = new Audio()
    this.radio.preload = 'none'
    this.radio.playsInline = true
    this.mode = null
    this.src = null
    this.level = 0 // fade level 0..1 (mirrors gain, also drives radio volume)
    this.rampTimer = null
    this.stopTimer = null
    this.onEnded = null
    this.reserved = false // claimed by a switch that is still loading its source
    this.owner = 0
  }
  get busy() { return this.mode !== null || this.reserved }
  prime() {
    for (const a of [this.el, this.radio]) {
      if (a.src) continue
      try { a.src = SILENT_WAV; a.play().then(() => a.pause()).catch(() => {}) } catch {}
    }
  }
  position() {
    if (this.mode === 'buffer') return this.core.ctx.currentTime - this.startedAt
    if (this.mode === 'element') return this.el.currentTime || 0
    return 0
  }
  duration() {
    if (this.mode === 'buffer') return this.src?.buffer?.duration || 0
    if (this.mode === 'element') return this.el.duration || 0
    return Infinity
  }
  playBuffer(buffer, offset) {
    const s = this.core.ctx.createBufferSource()
    s.buffer = buffer
    s.connect(this.gain)
    const off = Math.max(0, Math.min(offset, buffer.duration - 0.5))
    s.start(0, off)
    this.startedAt = this.core.ctx.currentTime - off
    s.onended = () => { if (this.src === s && this.mode === 'buffer') this.onEnded?.() }
    this.src = s
    this.mode = 'buffer'
  }
  async playElement(url, offset) {
    if (!this.elNode) {
      this.elNode = this.core.ctx.createMediaElementSource(this.el)
      this.elNode.connect(this.gain)
    }
    const el = this.el
    el.onended = null
    el.src = url
    this.mode = 'element'
    await new Promise((res, rej) => {
      const ok = () => { cleanup(); res() }
      const bad = () => { cleanup(); rej(new Error('media-error')) }
      const cleanup = () => { el.removeEventListener('loadedmetadata', ok); el.removeEventListener('error', bad) }
      el.addEventListener('loadedmetadata', ok)
      el.addEventListener('error', bad)
      el.load()
    })
    if (offset > 0 && offset < el.duration - 3) el.currentTime = offset
    el.onended = () => { if (this.mode === 'element') this.onEnded?.() }
    await el.play()
  }
  async playStream(url) {
    this.mode = 'stream'
    this.radio.src = url
    this.applyStreamVolume()
    await this.radio.play()
  }
  applyStreamVolume() {
    const e = this.engine
    this.radio.volume = Math.max(0, Math.min(1, this.level * e.userLevel() * e.duckLevel))
  }
  fadeTo(target, secs) {
    clearInterval(this.rampTimer)
    const ctx = this.core.ctx
    const g = this.gain.gain
    const now = ctx.currentTime
    g.cancelScheduledValues(now)
    g.setValueAtTime(g.value, now)
    g.linearRampToValueAtTime(target, now + Math.max(0.01, secs))
    // mirror the ramp for stream decks (their volume is set from script)
    const from = this.level
    const t0 = performance.now()
    this.rampTimer = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / (secs * 1000))
      this.level = from + (target - from) * k
      if (this.mode === 'stream') this.applyStreamVolume()
      if (k >= 1) clearInterval(this.rampTimer)
    }, 40)
  }
  stopAfter(secs) {
    clearTimeout(this.stopTimer)
    this.stopTimer = setTimeout(() => this.stopNow(), secs * 1000 + 60)
  }
  stopNow() {
    this.reserved = false
    clearTimeout(this.stopTimer)
    clearInterval(this.rampTimer)
    this.onEnded = null
    if (this.mode === 'buffer') { try { this.src.stop() } catch {} }
    if (this.mode === 'element') { this.el.pause(); this.el.onended = null }
    if (this.mode === 'stream') { this.radio.pause(); this.radio.removeAttribute('src'); this.radio.load() }
    this.src = null
    this.mode = null
    this.level = 0
    this.gain.gain.cancelScheduledValues(0)
    this.gain.gain.value = 0
  }
}

function shuffled(n, avoidFirst) {
  const a = [...Array(n).keys()]
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  if (n > 1 && a[0] === avoidFirst) [a[0], a[1]] = [a[1], a[0]]
  return a
}

export const musicEngine = {
  core: null,
  decks: [],
  active: null,
  currentPid: null,
  zoneId: null,
  token: 0,
  progress: new Map(), // playlistId -> { order, pos, offset, n }
  ducked: false,
  duckLevel: 1,

  ensure() {
    if (this.core) return this.core
    this.core = audioCore()
    this.applyVolume()
    return this.core
  },
  userLevel() {
    const { volume, muted } = useMusic.getState()
    return muted ? 0 : volume * volume
  },
  /** Claim an idle deck for `token` (a deck that is fading out or loading is never reused). */
  deck(token) {
    this.ensure()
    let d = this.decks.find((x) => !x.busy)
    if (!d && this.decks.length < 4) { d = new Deck(this.core, this); this.decks.push(d) }
    if (!d) { d = this.decks.filter((x) => x !== this.active).sort((a, b) => a.level - b.level)[0]; d.stopNow() }
    clearTimeout(d.stopTimer)
    d.reserved = true
    d.owner = token
    return d
  },
  /** Release a deck whose switch was superseded, without touching a newer owner. */
  abandon(d, token) {
    if (d.owner === token) d.stopNow()
  },

  /** Call from a user gesture (Enter button, first tap). Safe to call repeatedly. */
  unlock() {
    this.ensure()
    resumeAudio()
    while (this.decks.length < 3) this.decks.push(new Deck(this.core, this))
    this.decks.forEach((d) => d.prime())
    const running = this.core.ctx.state === 'running'
    useMusic.setState({ enabled: true })
    if (running && useMusic.getState().status === 'blocked') {
      if (this.active?.mode === 'buffer') useMusic.setState({ status: 'playing' })
      else this.retry()
    }
    return running
  },
  retry() {
    const pid = this.currentPid
    this.currentPid = null
    this.switchPlaylist(pid, 0.6)
  },

  setZone(zoneId) {
    if (zoneId === this.zoneId) return
    this.zoneId = zoneId
    const z = zoneById(zoneId)
    useMusic.setState({ zoneId, zoneName: z?.name || '' })
    const pid = useMusicLibrary.getState().assignments[zoneId] ?? null
    this.switchPlaylist(pid, ZONE_FADE)
  },

  saveProgress() {
    if (!this.currentPid || !this.active) return
    const pr = this.progress.get(this.currentPid)
    if (pr && this.active.mode !== 'stream') pr.offset = this.active.position()
  },

  async switchPlaylist(pid, fade = ZONE_FADE) {
    this.ensure()
    if (pid === this.currentPid && (this.active?.busy || useMusic.getState().status === 'embed')) return
    const token = ++this.token
    this.saveProgress()
    const old = this.active
    if (old) { old.fadeTo(0, fade); old.stopAfter(fade); old.onEnded = null }
    this.active = null
    this.currentPid = pid

    const lib = useMusicLibrary.getState()
    const pl = lib.playlists.find((p) => p.id === pid)
    if (!pl) {
      useMusic.setState({ playlistId: null, playlistName: '', track: null, art: null, status: 'silent', embedUrl: null, kind: 'tracks' })
      return
    }
    useMusic.setState({ playlistId: pid, playlistName: pl.name, kind: pl.kind, embedUrl: null, error: null })

    if (pl.kind === 'embed') {
      useMusic.setState({ status: 'embed', embedUrl: pl.embedUrl, track: { title: pl.name, artist: 'Live radio' }, art: await resolveArt(pl) })
      return
    }
    if (pl.kind === 'stream') {
      const d = this.deck(token)
      this.active = d
      useMusic.setState({ status: 'loading', track: { title: pl.name, artist: 'Live radio' }, art: await resolveArt(pl) })
      try {
        await d.playStream(pl.streamUrl)
        d.reserved = false
        if (token !== this.token) return this.abandon(d, token)
        d.fadeTo(1, fade)
        useMusic.setState({ status: 'playing' })
      } catch (e) {
        if (token !== this.token) return this.abandon(d, token)
        this.fail(e, d)
      }
      return
    }
    if (!pl.trackIds.length) {
      useMusic.setState({ status: 'silent', track: null, art: await resolveArt(pl) })
      return
    }
    await this.startTrack(token, pl, fade, false)
  },

  async startTrack(token, pl, fade, advance) {
    const lib = useMusicLibrary.getState()
    let pr = this.progress.get(pl.id)
    const n = pl.trackIds.length
    if (!pr || pr.n !== n || pr.shuffle !== !!pl.shuffle) {
      pr = { order: pl.shuffle ? shuffled(n) : [...Array(n).keys()], pos: 0, offset: 0, n, shuffle: !!pl.shuffle }
      this.progress.set(pl.id, pr)
    }
    if (advance) {
      pr.pos++
      pr.offset = 0
      if (pr.pos >= n) { const last = pr.order[n - 1]; pr.order = pl.shuffle ? shuffled(n, last) : pr.order; pr.pos = 0 }
    }
    const track = lib.tracks.find((t) => t.id === pl.trackIds[pr.order[pr.pos]])
    if (!track) { useMusic.setState({ status: 'error', error: 'A track in this playlist is missing.' }); return }
    const d = this.deck(token)
    this.active = d
    useMusic.setState({ status: 'loading', track: { id: track.id, title: track.title, artist: track.artist }, error: null })
    resolveArt(track).then((art) => { if (token === this.token) useMusic.setState({ art }) })
    try {
      const src = await resolveTrackSource(track)
      if (token !== this.token) return this.abandon(d, token)
      if (src.type === 'buffer') d.playBuffer(src.buffer, pr.offset)
      else {
        try {
          await d.playElement(src.url, pr.offset)
        } catch (e) {
          if (e?.name === 'NotAllowedError' || !src.blobKey) throw e
          // some hosts block blob: media; decode the stored file in memory instead
          const blob = await getStoredBlob(src.blobKey)
          const buf = await this.core.ctx.decodeAudioData(await blob.arrayBuffer())
          if (token !== this.token) return this.abandon(d, token)
          d.el.pause()
          d.mode = null
          d.playBuffer(buf, pr.offset)
        }
      }
      d.reserved = false
      if (token !== this.token) return this.abandon(d, token)
      d.onEnded = () => {
        if (this.active !== d) return
        const t = this.token
        d.stopAfter(0.05)
        const cur = useMusicLibrary.getState().playlists.find((p) => p.id === this.currentPid)
        if (cur && cur.kind === 'tracks' && cur.trackIds.length) this.startTrack(t, cur, TRACK_FADE, true)
      }
      d.fadeTo(1, fade)
      useMusic.setState({ status: this.core.ctx.state === 'running' ? 'playing' : 'blocked' })
    } catch (e) {
      if (token !== this.token) return this.abandon(d, token)
      this.fail(e, d)
    }
  },

  fail(e, d) {
    d.stopNow()
    if (this.active === d) this.active = null
    if (e?.name === 'NotAllowedError') {
      useMusic.setState({ status: 'blocked', error: null })
      this.currentPid = useMusic.getState().playlistId
    } else {
      useMusic.setState({ status: 'error', error: useMusic.getState().kind === 'stream' ? 'The radio stream could not be reached. Check the stream address and that it allows web playback.' : 'This track could not be played on this device.' })
    }
  },

  next() {
    const pl = useMusicLibrary.getState().playlists.find((p) => p.id === this.currentPid)
    if (!pl || pl.kind !== 'tracks' || !pl.trackIds.length) return
    const token = ++this.token
    const old = this.active
    if (old) { old.onEnded = null; old.fadeTo(0, TRACK_FADE); old.stopAfter(TRACK_FADE) }
    this.active = null
    this.startTrack(token, pl, TRACK_FADE, true)
  },

  stopAll(fade = 1.2) {
    this.token++
    this.saveProgress()
    for (const d of this.decks) if (d.busy) { d.onEnded = null; d.fadeTo(0, fade); d.stopAfter(fade) }
    this.active = null
    this.currentPid = null
    this.zoneId = null
    useMusic.setState({ zoneId: null, zoneName: '', status: 'idle', track: null, art: null, embedUrl: null })
  },

  setVolume(v) {
    useMusic.setState({ volume: Math.max(0, Math.min(1, v)) })
    this.applyVolume()
  },
  setMuted(m) {
    useMusic.setState({ muted: m })
    this.applyVolume()
  },
  applyVolume() {
    const { volume, muted } = useMusic.getState()
    try { localStorage.setItem(PREFS, JSON.stringify({ volume, muted })) } catch {}
    if (!this.core) return
    const g = this.core.userGain.gain
    const now = this.core.ctx.currentTime
    g.cancelScheduledValues(now)
    g.setTargetAtTime(this.userLevel(), now, 0.05)
    this.decks.forEach((d) => d.mode === 'stream' && d.applyStreamVolume())
  },
  /** Lower room music while a gallery kiosk plays something. */
  setDucked(on) {
    this.ensure()
    this.ducked = on
    this.duckLevel = on ? 0.08 : 1
    const g = this.core.duck.gain
    const now = this.core.ctx.currentTime
    g.cancelScheduledValues(now)
    g.setTargetAtTime(this.duckLevel, now, on ? 0.15 : 0.6)
    this.decks.forEach((d) => d.mode === 'stream' && d.applyStreamVolume())
  },
}

// React to admin changes: reassigning the current room, or editing its playlist.
useMusicLibrary.subscribe((s, prev) => {
  const e = musicEngine
  if (!e.zoneId) return
  const pid = s.assignments[e.zoneId] ?? null
  const prevPid = prev.assignments[e.zoneId] ?? null
  const pl = s.playlists.find((p) => p.id === pid)
  const prevPl = prev.playlists.find((p) => p.id === pid)
  if (pid !== prevPid) { e.switchPlaylist(pid, 1.5); return }
  if (pl && prevPl && (pl.streamUrl !== prevPl.streamUrl || pl.embedUrl !== prevPl.embedUrl || pl.kind !== prevPl.kind || (pl.trackIds.length && !prevPl.trackIds.length))) {
    e.currentPid = null
    e.switchPlaylist(pid, 1.5)
  }
})

// First tap/click/key anywhere also unlocks audio (mobile browsers require a gesture).
if (typeof window !== 'undefined') {
  const onGesture = () => {
    if (!useMusic.getState().enabled) return
    if (musicEngine.unlock()) {
      window.removeEventListener('pointerdown', onGesture, true)
      window.removeEventListener('keydown', onGesture, true)
    }
  }
  window.addEventListener('pointerdown', onGesture, true)
  window.addEventListener('keydown', onGesture, true)
}
