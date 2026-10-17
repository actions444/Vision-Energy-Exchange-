// Small generated sound effects for the pool (no audio files needed). They play through the shared
// audio graph, so the visitor's volume and mute settings apply, and stay silent until audio is unlocked.
import { audioCore, hasAudio } from './core.js'

function ready() {
  if (!hasAudio()) return null
  const c = audioCore()
  return c.ctx.state === 'running' ? c : null
}

function noise(c, dur, { type = 'lowpass', freq = 1500, q = 0.7, vol = 0.4, attack = 0.005, from, to } = {}) {
  const ac = c.ctx, len = Math.floor(ac.sampleRate * dur)
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  const src = ac.createBufferSource(); src.buffer = buf
  const f = ac.createBiquadFilter(); f.type = type; f.Q.value = q
  const t = ac.currentTime
  f.frequency.setValueAtTime(from ?? freq, t)
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur)
  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0005, t + dur)
  src.connect(f).connect(g).connect(c.sum)
  src.start(t)
}

export const sfx = {
  /** A splash; power 0..1. */
  splash(power = 0.6) {
    const c = ready(); if (!c) return
    noise(c, 0.35 + power * 0.6, { type: 'lowpass', from: 3500, to: 500, vol: 0.12 + power * 0.4, attack: 0.012 })
    noise(c, 0.18, { type: 'bandpass', freq: 2200, q: 1.2, vol: 0.05 + power * 0.18 })
  },
  /** A small stroke / paddle sound while swimming. */
  stroke() {
    const c = ready(); if (!c) return
    noise(c, 0.22, { type: 'bandpass', freq: 900, q: 0.8, vol: 0.07, attack: 0.03 })
  },
  /** Rising bubbles when diving. */
  bubbles() {
    const c = ready(); if (!c) return
    const ac = c.ctx
    for (let i = 0; i < 4; i++) {
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + i * 0.07 + Math.random() * 0.05
      const f0 = 300 + Math.random() * 400
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 2.2, t + 0.09)
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.11)
      o.connect(g).connect(c.sum); o.start(t); o.stop(t + 0.12)
    }
  },
  /** A breath when you come up for air. */
  gasp() {
    const c = ready(); if (!c) return
    noise(c, 0.5, { type: 'bandpass', from: 700, to: 1600, q: 1.4, vol: 0.16, attack: 0.08 })
  },
  /** A whistle: the lifeguard. */
  whistle() {
    const c = ready(); if (!c) return
    const ac = c.ctx, t = ac.currentTime
    for (const [dt, dur] of [[0, 0.22], [0.3, 0.45]]) {
      const o = ac.createOscillator(), g = ac.createGain()
      o.type = 'triangle'; o.frequency.setValueAtTime(2600, t + dt); o.frequency.linearRampToValueAtTime(2900, t + dt + dur)
      g.gain.setValueAtTime(0.0001, t + dt); g.gain.exponentialRampToValueAtTime(0.1, t + dt + 0.02); g.gain.exponentialRampToValueAtTime(0.0005, t + dt + dur)
      o.connect(g).connect(c.sum); o.start(t + dt); o.stop(t + dt + dur + 0.02)
    }
  },
}
