// Plays the TV guide on the screens near the visitor.
//
// Decoding video is the expensive part, so only the few programmes on the screens *nearest* the
// visitor are decoded (MAX_FEEDS at once, within RANGE metres); every screen showing the same
// scheduled slot shares one video. Screens further away keep showing their normal channel and
// pick the programme up mid-way when the visitor walks over, because the position always comes
// from the shared wall clock rather than from when the video was started.
import * as THREE from 'three'
import { playerState } from '../state/runtime.js'
import { fileUrl } from '../media/media.js'
import { now, useCinema, SCREENS } from '../cinema/cinema.js'
import { useGuide, registry, feeds, programFor, registerStaticScreens } from './guide.js'

const MAX_FEEDS = 2
const RANGE = 30 // m: screens further than this don't decode video
const EARSHOT = 14 // m: sound fades out over this distance
const pool = []
const tmp = new THREE.Vector3()

function makeFeed() {
  const video = document.createElement('video')
  video.crossOrigin = 'anonymous'
  video.playsInline = true
  video.setAttribute('playsinline', '')
  video.preload = 'auto'
  video.addEventListener('error', () => { if (video.getAttribute('src')) console.warn('guide video error', video.error?.code) })
  const texture = new THREE.VideoTexture(video)
  texture.colorSpace = THREE.SRGBColorSpace
  return { video, texture, key: null, mediaId: null, token: 0, dist: Infinity, screens: [] }
}
function release(f) {
  f.token++
  f.video.pause()
  f.video.removeAttribute('src')
  f.video.load()
  f.key = null
  f.mediaId = null
}

const attenuate = (d) => {
  if (d <= 3) return 1
  if (d >= EARSHOT) return 0
  const x = 1 - (d - 3) / (EARSHOT - 3)
  return x * x
}

async function drive(f, prog) {
  const v = f.video
  if (f.key !== prog.key || f.mediaId !== prog.media.id) {
    // a different programme (or a different showing of the same slot): load it
    f.key = prog.key
    f.mediaId = prog.media.id
    const token = ++f.token
    const url = await fileUrl(prog.media.file)
    if (f.token !== token) return
    v.src = url
    v.load()
    return
  }
  if (!v.getAttribute('src')) return
  const target = (now() - prog.start) / 1000
  const dur = v.duration || prog.media.duration || Infinity
  if (target >= dur - 0.2) { if (!v.paused) v.pause(); f.ended = true; return }
  f.ended = false
  if (v.readyState < 1) return
  const drift = v.currentTime - target
  if (Math.abs(drift) > 0.8 || v.paused) {
    v.playbackRate = 1
    if (Math.abs(drift) > 0.4) v.currentTime = Math.max(0, Math.min(target, dur - 0.3))
  } else if (Math.abs(drift) > 0.15) v.playbackRate = drift > 0 ? 0.96 : 1.04
  else v.playbackRate = 1
  if (v.paused) {
    try { await v.play() } catch (e) {
      if (e?.name === 'NotAllowedError') {
        // sound needs a tap first: keep the picture going silently until then
        v.muted = true
        if (!useGuide.getState().blocked) useGuide.setState({ blocked: true })
        v.play().catch(() => {})
      }
    }
  }
}

function step() {
  const t = now()
  const me = playerState.position
  const { volume, muted, blocked } = useGuide.getState()
  const inCinema = !!useCinema.getState().active

  const cands = []
  for (const s of registry.values()) {
    if (!s.active()) continue
    const prog = programFor(s.id, t)
    if (!prog) continue
    s.obj.getWorldPosition(tmp)
    const d = tmp.distanceTo(me)
    if (d > RANGE) continue
    cands.push({ s, prog, d })
  }
  cands.sort((a, b) => a.d - b.d)

  // pick the programmes to decode: nearest first, one slot per distinct programme
  const chosen = []
  for (const c of cands) {
    if (chosen.length >= MAX_FEEDS && !chosen.some((x) => x.prog.key === c.prog.key)) continue
    let g = chosen.find((x) => x.prog.key === c.prog.key)
    if (!g) { g = { prog: c.prog, screens: [], dist: c.d }; chosen.push(g) }
    g.screens.push(c.s.id)
    g.dist = Math.min(g.dist, c.d)
  }

  for (const f of pool) if (f.key && !chosen.some((g) => g.prog.key === f.key)) { release(f); f.screens = [] }
  const byScreen = new Map()
  for (const g of chosen) {
    let f = pool.find((x) => x.key === g.prog.key)
    if (!f) {
      f = pool.find((x) => !x.key)
      if (!f && pool.length < MAX_FEEDS) { f = makeFeed(); pool.push(f) }
    }
    if (!f) continue
    f.dist = g.dist
    f.screens = g.screens
    drive(f, g.prog).catch((e) => console.warn('guide', e))
    const v = f.video
    v.muted = muted || blocked || inCinema
    v.volume = Math.max(0, Math.min(1, volume * volume * attenuate(g.dist)))
    // show it only once there is a picture, so a screen never flashes black while loading
    if (v.videoWidth > 0 && !f.ended && !v.paused) for (const id of g.screens) byScreen.set(id, f)
  }
  feeds.byScreen = byScreen
}

let timer = null
export function runGuide() {
  if (timer) return
  registerStaticScreens(Object.values(SCREENS)) // the cinema auditoriums play scheduled slots too
  timer = setInterval(() => { try { step() } catch (e) { console.warn('guide', e) } }, 500)
  // browsers keep sound off until the page has been touched
  const unlock = () => {
    if (!useGuide.getState().blocked) return
    useGuide.setState({ blocked: false })
    for (const f of pool) f.video.muted = false
  }
  for (const ev of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(ev, unlock, { passive: true })
}

/** For the panel: what is decoding right now. */
export const liveFeeds = () => pool.filter((f) => f.key).map((f) => ({ key: f.key, screens: f.screens.slice(), dist: f.dist, playing: !f.video.paused }))
if (typeof window !== 'undefined') window.__guide = { liveFeeds, pool, feeds }
