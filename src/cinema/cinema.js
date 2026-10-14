// Movie screens: synchronized screenings, private viewing, and the one video player a visitor uses.
//
// A *screening* is a shared document `screenings/<screenId>` written by the owner:
//   { movieId, title, state: 'playing' | 'paused' | 'stopped', startedAt, position, updatedAt }
// `startedAt` is the wall-clock time (ms) at which the movie's 0:00 played. Every visitor in the
// auditorium computes the same position from it and keeps their own <video> within a fraction of a
// second of it, so everyone watches the same frame (multiplayer or not). Visitors can't write it.
//
// When no screening is running a visitor can start a *private* viewing that only they see.
import { create } from 'zustand'
import * as THREE from 'three'
import { backend, useBackend } from '../backend/backend.js'
import { useMedia, fileUrl } from '../media/media.js'
import { audioCore } from '../audio/core.js'
import { useMusic } from '../music/engine.js'

export const SCREENS = {
  'cinema-1': { id: 'cinema-1', name: 'Auditorium 1', venue: 'Vision Cinema', zone: 'cinema-1' },
  'cinema-2': { id: 'cinema-2', name: 'Auditorium 2', venue: 'Vision Cinema', zone: 'cinema-2' },
  'VSP-201': { id: 'VSP-201', name: 'Screening Room', venue: 'Vision Storms Energy Exchanges Plaza', zone: 'VSP-201' },
}
export const screenForZone = (zoneId) => Object.values(SCREENS).find((s) => s.zone === zoneId) || null

const PREF = 'vsw-movie-audio'
const prefs = (() => { try { return { volume: 0.85, muted: false, ...JSON.parse(localStorage.getItem(PREF) || '{}') } } catch { return { volume: 0.85, muted: false } } })()

export const useCinema = create(() => ({
  shared: {}, // screenId -> screening doc
  local: {}, // screenId -> private viewing { movieId, title, state, startedAt, position }
  active: null, // screenId the visitor is in
  status: 'idle', // idle | loading | playing | paused | blocked | error | ended
  error: null,
  aspect: 16 / 9,
  hasFrame: false,
  volume: prefs.volume,
  muted: prefs.muted,
  clockOffset: 0,
}))

/** Movies and music videos visitors can watch (published only). */
export function watchable(items = useMedia.getState().items) {
  return items.filter((m) => (m.kind === 'movie' || m.kind === 'video') && m.published)
}
export const now = () => Date.now() + useCinema.getState().clockOffset

/** The session that drives a screen: the shared screening, else this visitor's private one. */
export function sessionFor(screenId, st = useCinema.getState()) {
  const over = (x) => {
    if (x.state !== 'playing') return false
    const d = x.duration || useMedia.getState().items.find((m) => m.id === x.movieId)?.duration
    return !!d && positionOf(x) > d + 4 // finished
  }
  const s = st.shared[screenId]
  if (s && s.state !== 'stopped' && s.movieId && !over(s)) return { ...s, shared: true }
  const l = st.local[screenId]
  if (l && l.state !== 'stopped' && !over(l)) return { ...l, shared: false }
  return null
}
export function positionOf(sess) {
  if (!sess) return 0
  if (sess.state === 'playing') return Math.max(0, (now() - sess.startedAt) / 1000)
  return sess.position || 0
}

// ---------------- shared screenings (owner) ----------------
let started = false
export async function startCinema() {
  const api = backend()
  if (!api || started) return
  started = true
  api.sub('screenings', (docs) => useCinema.setState({ shared: Object.fromEntries(docs.map(({ id, ...d }) => [id, d])) }))
  // self-hosted server: line our clock up with the server's so screenings sync across devices
  const b = useBackend.getState()
  if (b.kind === 'server') {
    try {
      const t0 = Date.now()
      const j = await (await fetch(b.serverUrl.replace(/\/$/, '') + '/health', { cache: 'no-store' })).json()
      const t1 = Date.now()
      if (j.now) useCinema.setState({ clockOffset: j.now - (t0 + t1) / 2 })
    } catch {}
  }
}

async function writeShared(screenId, doc) {
  const api = backend()
  if (!api || !useBackend.getState().admin) throw new Error('Only the owner can run screenings for everyone.')
  const full = { ...doc, updatedAt: new Date().toISOString() }
  useCinema.setState((s) => ({ shared: { ...s.shared, [screenId]: full } }))
  await api.set('screenings/' + screenId, full)
}

export const shared = {
  start: (screenId, movie, lead = 3) => writeShared(screenId, { movieId: movie.id, title: movie.title, duration: movie.duration || null, state: 'playing', startedAt: now() + lead * 1000, position: 0 }),
  pause: (screenId) => { const s = useCinema.getState().shared[screenId]; if (s) return writeShared(screenId, { ...s, state: 'paused', position: positionOf(s) }) },
  resume: (screenId) => { const s = useCinema.getState().shared[screenId]; if (s) return writeShared(screenId, { ...s, state: 'playing', startedAt: now() - (s.position || 0) * 1000 + 1500 }) },
  seek: (screenId, pos) => {
    const s = useCinema.getState().shared[screenId]
    if (!s) return
    return writeShared(screenId, s.state === 'playing' ? { ...s, startedAt: now() - pos * 1000 + 1000 } : { ...s, position: pos })
  },
  stop: (screenId) => { const s = useCinema.getState().shared[screenId]; if (s) return writeShared(screenId, { ...s, state: 'stopped' }) },
}

// ---------------- private viewing ----------------
const setLocal = (screenId, v) => useCinema.setState((s) => ({ local: { ...s.local, [screenId]: v } }))
export const privateView = {
  start: (screenId, movie) => { unlockCinema(); setLocal(screenId, { movieId: movie.id, title: movie.title, duration: movie.duration || null, state: 'playing', startedAt: now() + 300, position: 0 }) },
  pause: (screenId) => { const l = useCinema.getState().local[screenId]; if (l) setLocal(screenId, { ...l, state: 'paused', position: positionOf(l) }) },
  resume: (screenId) => { unlockCinema(); const l = useCinema.getState().local[screenId]; if (l) setLocal(screenId, { ...l, state: 'playing', startedAt: now() - (l.position || 0) * 1000 }) },
  seek: (screenId, pos) => { const l = useCinema.getState().local[screenId]; if (l) setLocal(screenId, l.state === 'playing' ? { ...l, startedAt: now() - pos * 1000 } : { ...l, position: pos }) },
  stop: (screenId) => setLocal(screenId, null),
}

// ---------------- the visitor's video player ----------------
let video = null
let texture = null
let gainNode = null
let srcNode = null
let loadedFor = null // movieId currently loaded
let wantedUrl = null

function ensureVideo() {
  if (video) return video
  video = document.createElement('video')
  video.crossOrigin = 'anonymous'
  video.playsInline = true
  video.setAttribute('playsinline', '')
  video.setAttribute('webkit-playsinline', '')
  video.preload = 'auto'
  video.addEventListener('loadedmetadata', () => { if (video.videoWidth) useCinema.setState({ aspect: video.videoWidth / video.videoHeight }) })
  video.addEventListener('playing', () => useCinema.setState({ status: 'playing', hasFrame: true, error: null }))
  video.addEventListener('waiting', () => { if (useCinema.getState().status === 'playing') useCinema.setState({ status: 'loading' }) })
  video.addEventListener('error', () => {
    if (!video.getAttribute('src')) return
    console.warn('cinema video error', video.error?.code, video.error?.message)
    useCinema.setState({ status: 'error', error: video.error?.code === 4 ? 'This movie\'s format is not supported on this device (MP4/H.264 or WebM work best).' : 'This movie could not be loaded. Check your connection and try again.' })
  })
  texture = new THREE.VideoTexture(video)
  texture.colorSpace = THREE.SRGBColorSpace
  return video
}
export const cinemaTexture = () => (ensureVideo(), texture)
export const cinemaVideo = () => video

function route() {
  if (srcNode) return
  try {
    const core = audioCore()
    gainNode = core.ctx.createGain()
    srcNode = core.ctx.createMediaElementSource(video)
    srcNode.connect(gainNode)
    gainNode.connect(core.sum)
  } catch { srcNode = null }
  applyVolume()
}
function applyVolume() {
  const { volume, muted } = useCinema.getState()
  const v = muted ? 0 : volume * volume
  if (gainNode) { gainNode.gain.value = v; video.volume = 1 } else if (video) video.volume = v
}
export function setMovieVolume(v) { useCinema.setState({ volume: v, muted: false }); savePrefs(); applyVolume() }
export function setMovieMuted(m) { useCinema.setState({ muted: m }); savePrefs(); applyVolume() }
function savePrefs() { const { volume, muted } = useCinema.getState(); try { localStorage.setItem(PREF, JSON.stringify({ volume, muted })) } catch {} }

/** Call inside a tap/click: lets mobile browsers start the movie with sound. */
export function unlockCinema() {
  const v = ensureVideo()
  route()
  if (!v.getAttribute('src')) {
    v.muted = true
    v.play().catch(() => {}).finally(() => { v.pause(); v.muted = false })
  } else if (useCinema.getState().status === 'blocked') {
    v.play().then(() => useCinema.setState({ status: 'playing' })).catch(() => {})
  }
}

function unload() {
  if (!video) return
  video.pause()
  video.removeAttribute('src')
  video.load()
  loadedFor = null
  wantedUrl = null
  useCinema.setState({ status: 'idle', hasFrame: false })
}

/** Runs every ~400 ms: keeps the local video on the right movie, state and position. */
async function tick() {
  const st = useCinema.getState()
  const zone = useMusic.getState().zoneId
  const screen = screenForZone(zone)
  const active = screen?.id || null
  if (active !== st.active) useCinema.setState({ active })
  const sess = active ? sessionFor(active, st) : null
  if (!sess) { if (loadedFor) unload(); return }
  const movie = useMedia.getState().items.find((m) => m.id === sess.movieId)
  if (!movie) { if (loadedFor) unload(); useCinema.setState({ status: 'error', error: 'This movie is no longer in the library.' }); return }
  const v = ensureVideo()
  route()
  if (loadedFor !== movie.id) {
    loadedFor = movie.id
    const url = await fileUrl(movie.file)
    wantedUrl = url
    useCinema.setState({ status: 'loading', hasFrame: false, error: null })
    v.src = url
    v.load()
  }
  const target = positionOf(sess)
  const dur = v.duration || movie.duration || Infinity
  if (target >= dur - 0.2 && sess.state === 'playing') {
    if (!v.paused) v.pause()
    if (useCinema.getState().status !== 'ended') useCinema.setState({ status: 'ended' })
    return
  }
  if (sess.state === 'paused') {
    if (!v.paused) v.pause()
    if (v.readyState >= 1 && Math.abs(v.currentTime - target) > 0.3) v.currentTime = target
    if (st.status !== 'paused' && st.status !== 'error') useCinema.setState({ status: 'paused' })
    return
  }
  // playing: wait for the start time, then follow the shared clock
  if (target <= 0) { if (!v.paused) v.pause(); if (v.readyState >= 1 && v.currentTime > 0.1) v.currentTime = 0; return }
  if (v.readyState < 1) return
  const drift = v.currentTime - target
  if (Math.abs(drift) > 0.8 || v.paused) {
    v.playbackRate = 1
    if (Math.abs(drift) > 0.25) v.currentTime = Math.min(target, dur - 0.3)
  } else if (Math.abs(drift) > 0.12) {
    v.playbackRate = drift > 0 ? 0.96 : 1.04 // ease back in sync without a visible jump
  } else v.playbackRate = 1
  if (v.paused) {
    try {
      await v.play()
    } catch (e) {
      if (e?.name === 'NotAllowedError') useCinema.setState({ status: 'blocked' })
    }
  }
}

let timer = null
export function runCinema() {
  if (timer) return
  timer = setInterval(() => { tick().catch((e) => console.warn('cinema', e)) }, 400)
}

/** Seconds into the current session's movie, for the UI. */
export function cinemaTiming() {
  const st = useCinema.getState()
  const sess = st.active ? sessionFor(st.active, st) : null
  if (!sess) return null
  return { position: positionOf(sess), duration: (video && Number.isFinite(video.duration) && video.duration) || sess.duration || null, session: sess }
}
