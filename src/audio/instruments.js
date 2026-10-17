// Generated instruments for the museum's playable exhibits (bell, piano, drums, guitar, telegraph, jukebox).
// Nothing is sampled: every sound is built from oscillators and filtered noise, through the shared audio graph, so
// the visitor's volume and mute apply. Everything stays silent until the audio context is unlocked.
import { audioCore, hasAudio } from './core.js'

function ready() {
  if (!hasAudio()) return null
  const c = audioCore()
  return c.ctx.state === 'running' ? c : null
}

export const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12)

/** One tone with an envelope. `partials` = [[ratio, gain], ...]. */
function tone(c, { f, t = 0, dur = 0.6, vol = 0.2, type = 'sine', partials, attack = 0.005, decay, detune = 0, dest, filt }) {
  const ac = c.ctx, t0 = ac.currentTime + t
  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack)
  g.gain.exponentialRampToValueAtTime(0.0004, t0 + (decay ?? dur))
  let out = g
  if (filt) { const bf = ac.createBiquadFilter(); bf.type = filt.type || 'lowpass'; bf.frequency.value = filt.f; bf.Q.value = filt.q ?? 0.7; g.connect(bf); out = bf }
  out.connect(dest || c.sum)
  const list = partials || [[1, 1]]
  for (const [r, pg] of list) {
    const o = ac.createOscillator(), og = ac.createGain()
    o.type = type; o.frequency.value = f * r; o.detune.value = detune
    og.gain.value = pg
    o.connect(og).connect(g)
    o.start(t0); o.stop(t0 + dur + 0.05)
  }
}

function noiseHit(c, { t = 0, dur = 0.2, type = 'bandpass', f = 4000, q = 1, vol = 0.2, attack = 0.002, to }) {
  const ac = c.ctx, len = Math.floor(ac.sampleRate * dur)
  const buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  const src = ac.createBufferSource(); src.buffer = buf
  const bf = ac.createBiquadFilter(); bf.type = type; bf.Q.value = q
  const t0 = ac.currentTime + t
  bf.frequency.setValueAtTime(f, t0); if (to) bf.frequency.exponentialRampToValueAtTime(to, t0 + dur)
  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0004, t0 + dur)
  src.connect(bf).connect(g).connect(c.sum)
  src.start(t0)
}

export const inst = {
  /** A large bronze bell: strike tone plus inharmonic partials, long decay. */
  bell() {
    const c = ready(); if (!c) return
    const base = 196 // G3
    const P = [[0.5, 0.5, 5.5], [1, 1, 4.5], [1.19, 0.6, 3.6], [1.5, 0.45, 3.0], [2.0, 0.55, 2.6], [2.52, 0.3, 1.8], [3.0, 0.22, 1.4], [4.1, 0.14, 1.0]]
    for (const [r, g, d] of P) tone(c, { f: base * r, vol: 0.16 * g, dur: d, decay: d, attack: 0.004, partials: [[1, 1], [1.004, 0.5]] })
    noiseHit(c, { dur: 0.12, f: 1800, q: 0.6, vol: 0.12 })
  },
  /** A piano-ish note: a few partials with a hammer click, quick decay. */
  piano(m, vol = 0.22, t = 0) {
    const c = ready(); if (!c) return
    const f = midiHz(m), d = 1.1 + Math.max(0, (84 - m)) * 0.02
    tone(c, { f, t, vol, dur: d, decay: d, attack: 0.003, type: 'triangle', partials: [[1, 1], [2, 0.42], [3, 0.2], [4.01, 0.1]], filt: { type: 'lowpass', f: 3400 } })
    noiseHit(c, { t, dur: 0.04, f: 2400, q: 1, vol: 0.04 })
  },
  /** One drum or cymbal: 'kick' | 'snare' | 'hat' | 'tom1' | 'tom2' | 'crash'. */
  drum(kind, t = 0) {
    const c = ready(); if (!c) return
    const ac = c.ctx, t0 = ac.currentTime + t
    if (kind === 'kick' || kind === 'tom1' || kind === 'tom2') {
      const [f0, f1, vol] = kind === 'kick' ? [140, 45, 0.7] : kind === 'tom1' ? [220, 110, 0.5] : [160, 80, 0.5]
      const o = ac.createOscillator(), g = ac.createGain()
      o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + 0.14)
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + (kind === 'kick' ? 0.32 : 0.4))
      o.connect(g).connect(c.sum); o.start(t0); o.stop(t0 + 0.45)
      if (kind === 'kick') noiseHit(c, { t, dur: 0.03, f: 900, q: 0.7, vol: 0.12 })
    } else if (kind === 'snare') {
      noiseHit(c, { t, dur: 0.2, type: 'highpass', f: 1800, q: 0.7, vol: 0.34 })
      tone(c, { f: 190, t, vol: 0.22, dur: 0.12, decay: 0.12, type: 'triangle' })
    } else if (kind === 'hat') noiseHit(c, { t, dur: 0.07, type: 'highpass', f: 7000, q: 0.8, vol: 0.14 })
    else noiseHit(c, { t, dur: 1.4, type: 'highpass', f: 5200, q: 0.5, vol: 0.2, attack: 0.004 })
  },
  /** A guitar chord: root MIDI note + intervals, strummed down, with a little crunch. */
  strum(root = 40, shape = [0, 7, 12, 16, 19, 24]) {
    const c = ready(); if (!c) return
    shape.forEach((iv, i) => {
      tone(c, { f: midiHz(root + iv), t: i * 0.035, vol: 0.09, dur: 1.8, decay: 1.8, attack: 0.004, type: 'sawtooth', partials: [[1, 1], [2, 0.3]], filt: { type: 'lowpass', f: 1700, q: 2.2 } })
    })
  },
  /** One telegraph tick: a dit or a dah at 640 Hz. */
  beep(dur = 0.08, t = 0) {
    const c = ready(); if (!c) return
    tone(c, { f: 640, t, vol: 0.12, dur, decay: dur, attack: 0.004, type: 'square', filt: { type: 'lowpass', f: 1600 } })
  },
  /** Short mechanical clicks for a key or a jukebox button. */
  click(t = 0) {
    const c = ready(); if (!c) return
    noiseHit(c, { t, dur: 0.03, type: 'bandpass', f: 2600, q: 2, vol: 0.12 })
  },
}

// ---------- Morse ----------
const MORSE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..' }
/** Schedule a Morse message as beeps; returns [{ at, dur }] so the exhibit can flash its lamp and press its key in time. */
export function morseSchedule(text, unit = 0.09) {
  const out = []
  let t = 0
  for (const w of text.toUpperCase().split(/\s+/)) {
    for (const ch of w) {
      const code = MORSE[ch]; if (!code) continue
      for (const s of code) { const dur = s === '.' ? unit : unit * 3; out.push({ at: t, dur }); t += dur + unit }
      t += unit * 2
    }
    t += unit * 4
  }
  return out
}
export function playMorse(text) {
  const sched = morseSchedule(text)
  for (const s of sched) inst.beep(s.dur, s.at)
  return sched
}

// ---------- "Oh! Susanna" (Stephen Foster, 1848; public domain) ----------
// [midi, beats] in C major, 4/4.
const OS = (() => {
  const n = (m, b) => [m, b]
  const C = 60, D = 62, E = 64, F = 65, G = 67, A = 69
  return [
    n(C, 0.5), n(D, 0.5), n(E, 1), n(G, 1), n(G, 1.5), n(A, 0.5), n(G, 1), n(E, 1), n(C, 1), n(D, 0.5), n(E, 0.5), n(E, 1), n(D, 1), n(C, 0.5), n(D, 0.5), n(C, 3),
    n(C, 0.5), n(D, 0.5), n(E, 1), n(G, 1), n(G, 1.5), n(A, 0.5), n(G, 1), n(E, 1), n(C, 1), n(D, 0.5), n(E, 0.5), n(E, 1), n(D, 1), n(D, 1), n(C, 3),
    n(F, 2), n(F, 1), n(A, 1), n(A, 2), n(A, 1), n(G, 1), n(G, 1), n(E, 1), n(C, 1), n(D, 1), n(C, 2), n(D, 1), n(F, 1), n(E, 3),
  ]
})()
export const SUSANNA = OS

/** Play a melody [[midi, beats], ...] on the piano. Returns [{ midi, at, dur }] (seconds). */
export function playMelody(mel, bpm = 112, vol = 0.22) {
  const spb = 60 / bpm
  let t = 0.05
  const out = []
  for (const [m, b] of mel) {
    inst.piano(m, vol, t)
    inst.piano(m - 12, vol * 0.4, t)
    out.push({ midi: m, at: t, dur: Math.max(0.2, b * spb * 0.9) })
    t += b * spb
  }
  return out
}

// ---------- Jukebox: a 12-bar blues shuffle in C, generated live ----------
let juke = null
/** Start the jukebox: a 12-bar shuffle scheduled one bar at a time (so Stop is immediate). Returns false if audio is locked. */
export function startJukebox() {
  stopJukebox()
  const c = ready(); if (!c) return false
  const spb = 60 / 108
  const prog = [0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7] // I I I I IV IV I I V IV I V (semitones from C)
  const walk = [0, 4, 7, 9, 12, 9, 7, 4]
  let bar = 0
  const play = () => {
    const root = 36 + prog[bar % 12]
    for (let i = 0; i < 8; i++) {
      const tt = (i >> 1) * spb + (i % 2 ? spb * 0.66 : 0)
      tone(c, { f: midiHz(root + 12 + walk[i]), t: tt, vol: 0.17, dur: spb * 0.5, decay: spb * 0.5, type: 'triangle', filt: { type: 'lowpass', f: 700 } })
    }
    for (const beat of [1, 3]) for (const iv of [0, 4, 7, 10]) inst.piano(root + 24 + iv, 0.05, beat * spb)
    for (let b = 0; b < 4; b++) {
      inst.drum(b % 2 === 0 ? 'kick' : 'snare', b * spb)
      inst.drum('hat', b * spb); inst.drum('hat', b * spb + spb * 0.66)
    }
    bar++
  }
  play()
  juke = { id: setInterval(play, spb * 4 * 1000) }
  return true
}
export function stopJukebox() {
  if (juke) { clearInterval(juke.id); juke = null }
}
export const jukeboxOn = () => !!juke
