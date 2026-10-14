// Demo-music synthesiser running in a Web Worker: plain-JS DSP mixed straight into a
// Float32Array, so rendering a ~50 s track takes a fraction of a second and never blocks the 3D view.
const SR = 32000

function rng(seed) {
  let s = seed >>> 0 || 1
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12)

const PROGS = {
  lofi: [[0, 3, 7, 10, 14], [5, 8, 12, 15], [-4, 0, 3, 7, 10], [-2, 2, 5, 9]],
  house: [[0, 3, 7, 10], [-4, 0, 3, 7], [-2, 2, 5, 9], [-5, -2, 2, 5]],
  synthwave: [[0, 3, 7], [-4, 0, 3], [-7, -3, 0], [-2, 2, 5]],
  trap: [[0, 3, 7], [0, 3, 7], [-4, 0, 3], [-5, -1, 2]],
  ambient: [[0, 7, 10, 14], [-4, 3, 7, 12], [-7, 0, 3, 10], [-2, 5, 9, 14]],
  // R&B / soul: major-seventh and ninth voicings (I maj9 - vi m9 - ii m9 - V 13sus)
  rnb: [[0, 4, 7, 11, 14], [-3, 0, 4, 7, 11], [2, 5, 9, 12, 16], [-5, 0, 2, 5, 9]],
  // relaxing instrumental (bookstore): gentle major-key piano arpeggios
  piano: [[0, 4, 7, 11], [-3, 0, 4, 7], [-7, -3, 0, 4], [-5, -1, 2, 7]],
}

function render({ style, bpm, bars, root, seed }) {
  const r = rng(seed)
  const beat = 60 / bpm
  const barLen = beat * 4
  const len = bars * barLen + 2
  const N = Math.ceil(len * SR)
  const out = new Float32Array(N)

  const mix = (buf, t, g = 1) => {
    const o = Math.floor(t * SR)
    const n = Math.min(buf.length, N - o)
    for (let i = 0; i < n; i++) out[o + i] += buf[i] * g
  }
  const noiseArr = (n) => { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = r() * 2 - 1; return a }

  // ---- one-shot drum samples ----
  const mkKick = (p0, p1, d) => {
    const n = Math.floor(d * SR), a = new Float32Array(n)
    let ph = 0
    for (let i = 0; i < n; i++) {
      const t = i / SR
      const f = p1 + (p0 - p1) * Math.exp(-t * 28)
      ph += (2 * Math.PI * f) / SR
      a[i] = Math.sin(ph) * Math.exp(-t * (5 / d)) + (i < 60 ? (r() - 0.5) * 0.3 : 0)
    }
    return a
  }
  const svf = (input, fc, q, mode) => {
    const f = 2 * Math.sin((Math.PI * fc) / SR)
    let low = 0, band = 0
    const a = new Float32Array(input.length)
    for (let i = 0; i < input.length; i++) {
      low += f * band
      const high = input[i] - low - q * band
      band += f * high
      a[i] = mode === 'band' ? band : mode === 'high' ? high : low
    }
    return a
  }
  const decay = (a, d) => { for (let i = 0; i < a.length; i++) a[i] *= Math.exp(-(i / SR) * (5 / d)); return a }
  const mkSnare = (d) => {
    const n = Math.floor(d * SR)
    const a = decay(svf(noiseArr(n), 1800, 0.9, 'band'), d)
    let ph = 0
    for (let i = 0; i < n; i++) { const t = i / SR; ph += (2 * Math.PI * (180 + 60 * Math.exp(-t * 30))) / SR; a[i] = a[i] * 1.4 + Math.sin(ph) * Math.exp(-t * 30) * 0.6 }
    return a
  }
  const mkHat = (d) => decay(svf(noiseArr(Math.floor(d * SR)), 7500, 0.6, 'high'), d)
  const mkClap = () => {
    const n = Math.floor(0.25 * SR), a = svf(noiseArr(n), 1400, 0.5, 'band')
    for (let i = 0; i < n; i++) { const t = i / SR; const burst = t < 0.036 ? Math.exp(-((t % 0.012) * 300)) : Math.exp(-(t - 0.036) * 22); a[i] *= burst * 1.5 }
    return a
  }

  // ---- tonal notes ----
  const note = (t, f, d, { wave = 'sine', v = 0.2, a = 0.01, rel = 0.08, lp = 0, detune = 0, glideTo = 0, trem = 0 } = {}) => {
    const o = Math.floor(t * SR)
    const n = Math.min(Math.floor((d + rel) * SR), N - o)
    const fd = f * Math.pow(2, detune / 1200)
    const k = lp ? 1 - Math.exp((-2 * Math.PI * lp) / SR) : 1
    let ph = r(), y = 0
    for (let i = 0; i < n; i++) {
      const tt = i / SR
      const freq = glideTo ? fd + (glideTo - fd) * Math.min(1, tt / (d * 0.6)) : fd
      ph += freq / SR
      ph -= Math.floor(ph)
      let s
      if (wave === 'sine') s = Math.sin(2 * Math.PI * ph)
      else if (wave === 'saw') s = 2 * ph - 1
      else if (wave === 'square') s = ph < 0.5 ? 1 : -1
      else s = 1 - 4 * Math.abs(ph - 0.5) // triangle
      y += k * (s - y)
      let env = tt < a ? tt / a : tt < d ? 1 : Math.max(0, 1 - (tt - d) / rel)
      if (trem) env *= 1 - trem * (0.5 + 0.5 * Math.sin(tt * 2 * Math.PI * 4.5))
      out[o + i] += y * env * v
    }
  }
  const pluck = (t, f, v, d, wave = 'triangle') => {
    const o = Math.floor(t * SR), n = Math.min(Math.floor(d * SR), N - o)
    let ph = 0
    for (let i = 0; i < n; i++) {
      ph += f / SR; ph -= Math.floor(ph)
      const s = wave === 'sine' ? Math.sin(2 * Math.PI * ph) : wave === 'saw' ? 2 * ph - 1 : 1 - 4 * Math.abs(ph - 0.5)
      out[o + i] += s * v * Math.exp(-(i / SR) * (4 / d))
    }
  }

  const kick = mkKick(style === 'trap' ? 90 : 130, style === 'trap' ? 38 : 45, style === 'trap' ? 0.55 : 0.36)
  const snare = mkSnare(style === 'synthwave' ? 0.38 : 0.2)
  const hat = mkHat(0.04)
  const ohat = mkHat(0.22)
  const clap = mkClap()
  const prog = PROGS[style]
  const scale = [0, 2, 3, 5, 7, 8, 10, 12, 14, 15]
  const pent = [0, 3, 5, 7, 10, 12, 15]

  for (let bar = 0; bar < bars; bar++) {
    const t0 = bar * barLen
    const chord = prog[bar % prog.length]
    const section = bar < 2 ? 'intro' : bar >= bars - 2 ? 'outro' : 'main'
    const drums = section !== 'intro' || style === 'house'

    if (style === 'lofi') {
      const swing = beat / 12
      chord.forEach((n, i) => note(t0, midi(root + 12 + n), barLen, { wave: 'tri', v: 0.045, a: 0.05, rel: 0.3, lp: 1500, detune: i % 2 ? 6 : -6, trem: 0.25 }))
      note(t0, midi(root - 12 + chord[0]), beat * 1.8, { v: 0.3, a: 0.02, lp: 300 })
      note(t0 + beat * 2.5, midi(root - 12 + chord[0]), beat * 1.3, { v: 0.25, a: 0.02, lp: 300 })
      if (drums) {
        mix(kick, t0, 0.8); mix(kick, t0 + beat * 2.5, 0.6)
        mix(snare, t0 + beat, 0.3); mix(snare, t0 + beat * 3, 0.3)
        for (let i = 0; i < 8; i++) mix(hat, t0 + i * beat / 2 + (i % 2 ? swing : 0), i % 2 ? 0.12 : 0.18)
      }
      if (section === 'main') for (let i = 0; i < 8; i++) if (r() < 0.32) pluck(t0 + i * beat / 2, midi(root + 24 + pent[Math.floor(r() * pent.length)]), 0.07, 0.7, 'sine')
      for (let i = 0; i < 30; i++) { const o = Math.floor((t0 + r() * barLen) * SR); if (o < N) out[o] += (r() - 0.5) * 0.25 }
    }

    if (style === 'house') {
      for (let b = 0; b < 4; b++) {
        if (section !== 'outro' || b < 2) mix(kick, t0 + b * beat, 0.95)
        mix(ohat, t0 + b * beat + beat / 2, 0.16)
        for (let s = 0; s < 4; s++) mix(hat, t0 + b * beat + s * beat / 4, 0.07)
        if (b % 2 === 1 && drums) mix(clap, t0 + b * beat, 0.35)
        if (section !== 'intro') note(t0 + b * beat + beat / 2, midi(root - 12 + chord[0]), beat * 0.4, { wave: 'saw', v: 0.18, lp: 380 })
      }
      if (section === 'main') [1.5, 3.5].forEach((p) => chord.forEach((n) => note(t0 + p * beat, midi(root + 12 + n), beat * 0.3, { wave: 'square', v: 0.03, lp: 2200 })))
      if (bar % 4 === 0) chord.forEach((n) => note(t0, midi(root + n), barLen * 4, { wave: 'saw', v: 0.02, a: 1.2, rel: 1, lp: 900 }))
    }

    if (style === 'synthwave') {
      if (drums) {
        mix(kick, t0, 0.95); mix(kick, t0 + beat * 2, 0.95)
        mix(snare, t0 + beat, 0.4); mix(snare, t0 + beat * 3, 0.4)
        for (let i = 0; i < 8; i++) mix(hat, t0 + i * beat / 2, 0.08)
      }
      for (let i = 0; i < 8; i++) note(t0 + i * beat / 2, midi(root - 12 + chord[0]), beat * 0.42, { wave: 'saw', v: 0.14, lp: 520 })
      if (section !== 'intro') for (let i = 0; i < 16; i++) pluck(t0 + i * beat / 4, midi(root + 12 + chord[i % chord.length] + (i % 8 >= 4 ? 12 : 0)), 0.045, 0.2, 'saw')
      chord.forEach((n, i) => note(t0, midi(root + n), barLen, { wave: 'saw', v: 0.025, a: 0.6, rel: 0.4, lp: 1300, detune: i * 7 - 7 }))
    }

    if (style === 'trap') {
      if (drums) {
        mix(kick, t0, 0.95); mix(kick, t0 + beat * 1.75, 0.75); if (r() < 0.6) mix(kick, t0 + beat * 3.5, 0.6)
        mix(snare, t0 + beat * 2, 0.5)
        for (let i = 0; i < 8; i++) {
          if (r() < 0.2 && section === 'main') for (let k = 0; k < 4; k++) mix(hat, t0 + i * beat / 2 + k * beat / 8, 0.09)
          else mix(hat, t0 + i * beat / 2, 0.13)
        }
      }
      const nextRoot = prog[(bar + 1) % prog.length][0]
      note(t0, midi(root - 12 + chord[0]), barLen * 0.9, { v: 0.42, a: 0.005, rel: 0.1, glideTo: bar % 2 ? midi(root - 12 + nextRoot) : 0 })
      if (section !== 'intro') for (let i = 0; i < 4; i++) if (r() < 0.55) pluck(t0 + i * beat + (r() < 0.3 ? beat / 2 : 0), midi(root + 24 + scale[Math.floor(r() * 7)]), 0.06, 0.9)
    }

    if (style === 'rnb') {
      const swing = beat / 6
      // electric piano: soft triangle + sine with slow tremolo, comped on 1 and the "and" of 2
      ;[0, beat * 1.5 + swing].forEach((p, k) => chord.forEach((n, i) => note(t0 + p, midi(root + 12 + n), k ? beat * 1.8 : beat * 1.3, { wave: i % 2 ? 'sine' : 'tri', v: 0.04, a: 0.012, rel: 0.5, lp: 2000, trem: 0.3 })))
      // round sub bass with a passing note
      note(t0, midi(root - 12 + chord[0]), beat * 1.6, { v: 0.32, a: 0.02, lp: 260 })
      note(t0 + beat * 2.5 + swing, midi(root - 12 + chord[0] + 7), beat * 0.9, { v: 0.24, a: 0.02, lp: 260 })
      note(t0 + beat * 3.5 + swing, midi(root - 12 + prog[(bar + 1) % prog.length][0] - 1), beat * 0.45, { v: 0.2, a: 0.02, lp: 260 })
      if (drums) {
        mix(kick, t0, 0.75); mix(kick, t0 + beat * 1.5 + swing, 0.45); mix(kick, t0 + beat * 2.75, 0.5)
        mix(snare, t0 + beat, 0.22); mix(snare, t0 + beat * 3, 0.26)
        for (let i = 0; i < 8; i++) mix(hat, t0 + i * beat / 2 + (i % 2 ? swing : 0), i % 2 ? 0.07 : 0.11)
      }
      // a few vocal-like lead notes (sine with slow attack, glide)
      if (section === 'main' && bar % 2 === 1) for (let i = 0; i < 3; i++) if (r() < 0.7) note(t0 + i * beat + beat / 2, midi(root + 24 + pent[Math.floor(r() * 5)]), beat * 0.9, { v: 0.05, a: 0.08, rel: 0.4, glideTo: r() < 0.3 ? midi(root + 24 + pent[Math.floor(r() * 5)]) : 0 })
    }

    if (style === 'piano') {
      // broken-chord piano with long release, a slow left hand and occasional melody
      note(t0, midi(root - 12 + chord[0]), barLen * 0.95, { wave: 'tri', v: 0.09, a: 0.006, rel: 1.6, lp: 700 })
      for (let i = 0; i < 8; i++) {
        const n = chord[[0, 1, 2, 3, 2, 1, 2, 3][i] % chord.length]
        pluck(t0 + i * beat / 2 + (r() - 0.5) * 0.02, midi(root + 12 + n), 0.06 + r() * 0.02, 2.2, 'tri')
      }
      if (section === 'main' && r() < 0.8) pluck(t0 + beat * (r() < 0.5 ? 0 : 2), midi(root + 24 + chord[Math.floor(r() * chord.length)]), 0.07, 3, 'sine')
    }

    if (style === 'ambient') {
      if (bar % 2 === 0) chord.forEach((n, i) => note(t0, midi(root + n), barLen * 2, { wave: 'saw', v: 0.028, a: 2.5, rel: 1.5, lp: 650, detune: (i - 1.5) * 8 }))
      note(t0, midi(root - 24 + chord[0]), barLen, { v: 0.16, a: 1.5, rel: 1, lp: 200 })
      for (let i = 0; i < 3; i++) if (r() < 0.5) pluck(t0 + r() * barLen, midi(root + 24 + pent[Math.floor(r() * pent.length)]), 0.05, 2.5, 'sine')
      if (r() < 0.18) {
        const d = 3.5, th = svf(noiseArr(Math.floor(d * SR)), 120, 0.7, 'low')
        for (let i = 0; i < th.length; i++) { const t = i / SR; th[i] *= Math.min(1, t * 3) * Math.exp(-t * 1.2) * 3 }
        mix(th, t0 + r() * barLen, 0.5)
      }
    }
  }

  if (style === 'ambient') {
    // continuous rain bed
    const rain = svf(noiseArr(N), 2400, 1.4, 'band')
    for (let i = 0; i < N; i++) out[i] += rain[i] * 0.05
  }

  // master: lo-fi darkening, fades, soft clip + normalise
  if (style === 'piano' || style === 'rnb') {
    // small room reverb: a few feedback-free taps
    const taps = [[0.031, 0.22], [0.057, 0.18], [0.089, 0.14], [0.13, 0.1], [0.19, 0.07]]
    const dry = out.slice()
    for (const [d, g] of taps) { const o = Math.floor(d * SR); for (let i = o; i < N; i++) out[i] += dry[i - o] * g }
  }
  if (style === 'lofi') { let y = 0; const k = 1 - Math.exp((-2 * Math.PI * 3200) / SR); for (let i = 0; i < N; i++) { y += k * (out[i] - y); out[i] = y } }
  const fadeIn = Math.min(2, barLen) * SR, fadeOut = 2.8 * SR
  let peak = 0
  for (let i = 0; i < N; i++) {
    let g = 1
    if (i < fadeIn) g = i / fadeIn
    if (i > N - fadeOut) g = Math.max(0, (N - i) / fadeOut)
    out[i] = Math.tanh(out[i] * 1.2) * g
    const a = Math.abs(out[i]); if (a > peak) peak = a
  }
  const norm = peak > 0 ? 0.85 / peak : 1
  for (let i = 0; i < N; i++) out[i] *= norm
  return out
}

self.onmessage = (e) => {
  const { id, spec } = e.data
  try {
    const data = render(spec)
    self.postMessage({ id, data, sampleRate: SR }, [data.buffer])
  } catch (err) {
    self.postMessage({ id, error: String(err?.message || err) })
  }
}
