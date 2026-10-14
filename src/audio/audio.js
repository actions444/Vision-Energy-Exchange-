// Gallery kiosk audio (demo beat, a visitor's own track, the screen video).
// While a kiosk sound plays, the room's music is ducked; it fades back when the kiosk stops.
import { useStore } from '../state/store.js'

import { audioCore, resumeAudio } from './core.js'
import { musicEngine } from '../music/engine.js'

export { getLevels } from './core.js'

let ctx, master
let current = null // { stop() }

function ensure() {
  const c = resumeAudio()
  ctx = c.ctx
  master = c.kioskBus
  return ctx
}

export function stopAudio() {
  const had = !!current
  current?.stop()
  current = null
  useStore.getState().setMedia({ audio: null })
  if (had) musicEngine.setDucked(false)
}

/** A generated 92 BPM beat: kick, snare, hats and a sub bass line, scheduled ahead in time. */
export function playDemoBeat() {
  stopAudio()
  const ac = ensure()
  const bpm = 92
  const step = 60 / bpm / 4
  const bassNotes = [43.65, 43.65, 51.91, 49.0] // F1, F1, Ab1, G1 per bar
  let nextTime = ac.currentTime + 0.08
  let n = 0
  let alive = true

  const kick = (t) => {
    const o = ac.createOscillator(), g = ac.createGain()
    o.frequency.setValueAtTime(140, t)
    o.frequency.exponentialRampToValueAtTime(40, t + 0.18)
    g.gain.setValueAtTime(1, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
    o.connect(g).connect(master)
    o.start(t); o.stop(t + 0.42)
  }
  const noise = (t, dur, hp, vol) => {
    const len = Math.floor(ac.sampleRate * dur)
    const buf = ac.createBuffer(1, len, ac.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    const src = ac.createBufferSource()
    src.buffer = buf
    const f = ac.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = hp
    const g = ac.createGain()
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    src.connect(f).connect(g).connect(master)
    src.start(t)
  }
  const bass = (t, f) => {
    const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter()
    o.type = 'sawtooth'
    o.frequency.value = f
    lp.type = 'lowpass'
    lp.frequency.value = 220
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, t + step * 3.5)
    o.connect(lp).connect(g).connect(master)
    o.start(t); o.stop(t + step * 4)
  }
  const pad = (t, f) => {
    for (const mult of [2, 3, 4.76]) {
      const o = ac.createOscillator(), g = ac.createGain()
      o.type = 'triangle'
      o.frequency.value = f * mult
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.04, t + 0.4)
      g.gain.exponentialRampToValueAtTime(0.001, t + step * 16)
      o.connect(g).connect(master)
      o.start(t); o.stop(t + step * 16)
    }
  }

  const schedule = () => {
    if (!alive) return
    while (nextTime < ac.currentTime + 0.25) {
      const s = n % 16
      const bar = Math.floor(n / 16) % 4
      if (s === 0 || s === 10) kick(nextTime)
      if (s === 7 && bar % 2 === 1) kick(nextTime)
      if (s === 4 || s === 12) noise(nextTime, 0.18, 1200, 0.5)
      if (s % 2 === 0) noise(nextTime, 0.04, 7000, s % 4 === 2 ? 0.22 : 0.12)
      if (s === 14 && bar === 3) noise(nextTime, 0.03, 7000, 0.15)
      if (s === 0 || s === 6 || s === 8) bass(nextTime, bassNotes[bar])
      if (s === 0) pad(nextTime, bassNotes[bar])
      nextTime += step
      n++
    }
  }
  musicEngine.setDucked(true)
  const timer = setInterval(schedule, 50)
  schedule()
  current = { stop: () => { alive = false; clearInterval(timer) } }
  useStore.getState().setMedia({ audio: { title: 'Gallery demo beat · 92 BPM' } })
}

/** Play an audio file from the visitor's device (decoded in memory, no upload). */
export async function playFile(file) {
  stopAudio()
  const ac = ensure()
  const buf = await ac.decodeAudioData(await file.arrayBuffer())
  const src = ac.createBufferSource()
  src.buffer = buf
  src.connect(master)
  musicEngine.setDucked(true)
  src.start()
  src.onended = () => { if (current?.src === src) stopAudio() }
  current = { src, stop: () => { try { src.stop() } catch {} } }
  useStore.getState().setMedia({ audio: { title: file.name.replace(/\.[^.]+$/, '') } })
}

// ---------- Gallery screen video ----------
export const screenVideo = { el: null, texture: null, listeners: new Set() }

export function playVideoFile(file) {
  stopVideo()
  return new Promise((resolve, reject) => {
    const v = document.createElement('video')
    v.playsInline = true
    v.loop = true
    v.crossOrigin = 'anonymous'
    v.src = URL.createObjectURL(file)
    v.onerror = () => reject(new Error('This browser could not play that video here. Try an MP4 (H.264) file.'))
    v.onloadeddata = () => {
      v.play().then(() => {
        screenVideo.el = v
        musicEngine.setDucked(true)
        screenVideo.listeners.forEach((fn) => fn(v))
        useStore.getState().setMedia({ video: { title: file.name.replace(/\.[^.]+$/, '') } })
        resolve()
      }).catch(reject)
    }
  })
}

export function stopVideo() {
  const v = screenVideo.el
  if (v) {
    v.pause()
    URL.revokeObjectURL(v.src)
  }
  if (screenVideo.el) musicEngine.setDucked(false)
  screenVideo.el = null
  screenVideo.listeners.forEach((fn) => fn(null))
  useStore.getState().setMedia({ video: null })
}
