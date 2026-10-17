// Synthesised score for the "Stay" duet: electric-piano chords, bass, a soft R&B groove and two
// vocal-style lead voices (formant synthesis: a sung "ah/oh" on the melody of each lyric line).
// This is a stand-in bed generated in the browser, NOT a recorded vocal performance; the lyric
// captions carry the words. Everything is scheduled up front against the AudioContext clock,
// and stopScore() fades it out and halts every source.
import { audioCore } from './core.js'
import { LYRICS } from '../config/cine.js'

const BEAT = 0.875 // 68.57 bpm: one bar = 3.5 s
const BAR = BEAT * 4
const GRID0 = 0.5 // bar 0 starts here (singing starts on bar 9)
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12)

const CHORDS = [
  { root: 45, notes: [57, 60, 64, 67, 71] }, // Am9
  { root: 41, notes: [53, 57, 60, 64, 67] }, // Fmaj9
  { root: 38, notes: [50, 53, 57, 60, 64] }, // Dm9
  { root: 40, notes: [52, 56, 59, 62, 65] }, // E7b9
]
const chordAt = (bar) => CHORDS[((bar + 3) % 4 + 4) % 4]

// melodies: [midi, weight]; the last note is held
const MEL = [
  { z: [57, 60, 64, 64, 62, 60, 57, 60] },
  { t: [69, 72, 72, 76, 74, 72, 69, 72] },
  { z: [62, 65, 65, 69, 65, 62, 60] },
  { t: [71, 74, 76, 76, 74, 71, 68] },
  { z: [57, 60, 64, 64, 60, 57], t: [64, 67, 71, 71, 67, 64] },
  { t: [72, 76, 76, 74, 72, 69] },
  { z: [57, 62, 62, 65, 64, 62] },
  { z: [56, 59, 59, 64, 62, 59, 57, 57], t: [68, 71, 71, 76, 74, 71, 69, 69] },
  { t: [76, 72], hold: [1, 2.2] },
  { z: [57, 60, 64, 62, 60, 57], t: [69, 72, 76, 74, 72, 69, 64], long: true },
]

let run = null

function reverbIR(ctx, secs = 2.6) {
  const n = Math.floor(ctx.sampleRate * secs)
  const b = ctx.createBuffer(2, n, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c)
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6)
  }
  return b
}
function noiseBuffer(ctx, secs = 0.5) {
  const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * secs), ctx.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return b
}

export function startScore() {
  stopScore(true)
  let core
  try { core = audioCore() } catch { return false }
  const { ctx, sum } = core
  if (ctx.state !== 'running') { ctx.resume().catch(() => {}) }
  const t0 = ctx.currentTime + 0.15
  const src = []
  const master = ctx.createGain()
  master.gain.value = 0.0001
  master.gain.setTargetAtTime(0.9, t0, 0.8)
  const dry = ctx.createGain(); dry.gain.value = 0.8
  const wet = ctx.createGain(); wet.gain.value = 0.42
  const conv = ctx.createConvolver(); conv.buffer = reverbIR(ctx)
  const bus = ctx.createGain()
  bus.connect(dry); bus.connect(conv); conv.connect(wet)
  dry.connect(master); wet.connect(master); master.connect(sum)
  const noise = noiseBuffer(ctx)
  const at = (s) => t0 + s

  const tone = (type, freq, s, dur, vol, { attack = 0.01, rel = 0.3, detune = 0, dest = bus } = {}) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = detune
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, at(s))
    g.gain.linearRampToValueAtTime(vol, at(s) + attack)
    g.gain.setTargetAtTime(0.0001, at(s) + Math.max(attack, dur - rel), rel / 3)
    o.connect(g); g.connect(dest)
    o.start(at(s)); o.stop(at(s) + dur + rel)
    src.push(o)
    return o
  }
  const hit = (s, { freq = 8000, q = 0.7, type = 'highpass', vol = 0.05, dur = 0.05 } = {}) => {
    const n = ctx.createBufferSource(); n.buffer = noise
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q
    const g = ctx.createGain()
    g.gain.setValueAtTime(vol, at(s)); g.gain.exponentialRampToValueAtTime(0.0001, at(s) + dur)
    n.connect(f); f.connect(g); g.connect(bus)
    n.start(at(s)); n.stop(at(s) + dur + 0.05)
    src.push(n)
  }
  const kick = (s, vol = 0.34) => {
    const o = ctx.createOscillator(); o.type = 'sine'
    o.frequency.setValueAtTime(130, at(s)); o.frequency.exponentialRampToValueAtTime(42, at(s) + 0.16)
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, at(s)); g.gain.exponentialRampToValueAtTime(0.0001, at(s) + 0.3)
    o.connect(g); g.connect(master); o.start(at(s)); o.stop(at(s) + 0.35); src.push(o)
  }

  // a sung vowel: sawtooth through three formant filters, with vibrato that deepens as the note is held
  const FORMANTS = { ah: [[800, 8, 1], [1150, 10, 0.5], [2900, 14, 0.15]], oh: [[450, 8, 1], [800, 10, 0.45], [2830, 14, 0.12]], ee: [[330, 8, 1], [2000, 12, 0.4], [3000, 14, 0.15]] }
  const voice = (midi, s, dur, vol, vowel = 'ah') => {
    const o = ctx.createOscillator(); o.type = 'sawtooth'
    const f = mtof(midi)
    o.frequency.setValueAtTime(f * 0.97, at(s)); o.frequency.linearRampToValueAtTime(f, at(s) + 0.07)
    const lfo = ctx.createOscillator(); lfo.frequency.value = 5.3
    const lg = ctx.createGain(); lg.gain.setValueAtTime(0, at(s)); lg.gain.linearRampToValueAtTime(f * 0.011, at(s) + Math.min(dur, 0.9))
    lfo.connect(lg); lg.connect(o.frequency)
    const out = ctx.createGain()
    out.gain.setValueAtTime(0.0001, at(s)); out.gain.linearRampToValueAtTime(vol, at(s) + 0.06)
    out.gain.setTargetAtTime(0.0001, at(s) + dur - 0.05, 0.07)
    for (const [fr, q, gain] of FORMANTS[vowel]) {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fr; bp.Q.value = q
      const gg = ctx.createGain(); gg.gain.value = gain
      o.connect(bp); bp.connect(gg); gg.connect(out)
    }
    out.connect(bus)
    o.start(at(s)); o.stop(at(s) + dur + 0.4); lfo.start(at(s)); lfo.stop(at(s) + dur + 0.4)
    src.push(o, lfo)
  }

  const bars = Math.ceil((80 - GRID0) / BAR) + 1
  for (let b = 0; b < bars; b++) {
    const s = GRID0 + b * BAR
    const c = chordAt(b)
    const swell = s > 14 ? 1 : 0.7
    const final = s >= 74
    // pad: soft detuned triangles under the whole bar
    c.notes.forEach((n, i) => {
      tone('triangle', mtof(n), s, BAR + 0.5, 0.032 * swell, { attack: 0.6, rel: 1.2, detune: -5 + i * 2 })
      tone('sine', mtof(n - 12), s, BAR + 0.5, 0.02 * swell, { attack: 0.8, rel: 1.2 })
    })
    // electric piano: a rolling pattern of eighths from the chord tones
    if (s >= 7 && !final) {
      const pat = [0, 2, 3, 4, 3, 2, 1, 2]
      pat.forEach((k, i) => {
        const when = s + i * (BEAT / 2)
        const n = c.notes[k % c.notes.length] + (i % 4 === 3 ? 12 : 0)
        tone('sine', mtof(n), when, 0.9, 0.05, { attack: 0.004, rel: 0.8 })
        tone('sine', mtof(n) * 2.001, when, 0.35, 0.012, { attack: 0.002, rel: 0.3 })
      })
    } else if (final && s < 78) {
      c.notes.forEach((n, i) => tone('sine', mtof(n + 12), s + i * 0.18, 3.2, 0.03, { attack: 0.01, rel: 2 }))
    }
    // bass + groove from the first bar before the vocal
    if (s >= 28 && !final) {
      tone('sine', mtof(c.root), s, BEAT * 1.9, 0.2, { attack: 0.02, rel: 0.4 })
      tone('sine', mtof(c.root), s + BEAT * 2.5, BEAT * 1.2, 0.17, { attack: 0.02, rel: 0.3 })
      tone('sawtooth', mtof(c.root + 12), s, 0.4, 0.02, { attack: 0.01, rel: 0.2 })
      kick(s); kick(s + BEAT * 2.5, 0.26)
      hit(s + BEAT, { type: 'bandpass', freq: 1900, q: 0.8, vol: 0.09, dur: 0.14 })
      hit(s + BEAT * 3, { type: 'bandpass', freq: 1900, q: 0.8, vol: 0.09, dur: 0.14 })
      for (let i = 0; i < 8; i++) hit(s + i * (BEAT / 2), { freq: 7500, vol: i % 2 ? 0.018 : 0.01, dur: 0.04 })
    }
  }

  // lead voices
  LYRICS.forEach((l, li) => {
    const m = MEL[li]
    const dur = l.t1 - l.t0 - 0.25
    ;['z', 't'].forEach((who) => {
      const notes = m[who]
      if (!notes) return
      const w = notes.map((_, i) => (m.hold ? m.hold[i] : i === notes.length - 1 ? (m.long ? 2.2 : 1.6) : 1))
      const sum_ = w.reduce((a, b) => a + b, 0)
      let cur = l.t0
      notes.forEach((n, i) => {
        const d = (w[i] / sum_) * dur
        const vowel = i % 3 === 0 ? 'oh' : i % 3 === 1 ? 'ah' : 'ee'
        voice(n, cur, Math.max(0.2, d * 0.96), who === 'z' ? 0.07 : 0.062, vowel)
        cur += d
      })
    })
  })

  run = { ctx, master, src }
  return true
}

export function stopScore(immediate = false) {
  if (!run) return
  const { ctx, master, src } = run
  run = null
  try {
    master.gain.cancelScheduledValues(ctx.currentTime)
    master.gain.setTargetAtTime(0.0001, ctx.currentTime, immediate ? 0.02 : 0.25)
  } catch {}
  setTimeout(() => {
    src.forEach((s) => { try { s.stop() } catch {} })
    try { master.disconnect() } catch {}
  }, immediate ? 60 : 1200)
}
