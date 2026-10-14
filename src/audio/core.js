// One shared Web Audio graph for the whole world.
//
//   room music decks ─► musicBus ─► duck ─┐
//   gallery kiosk audio ─► kioskBus ──────┼─► sum ─► analyser ─► userGain ─► speakers
//
// `userGain` carries the visitor's volume + mute, so those preferences apply to every
// room and every source. The analyser sits before it so visuals still move when muted.
let core = null

export function audioCore() {
  if (core) return core
  const AC = window.AudioContext || window.webkitAudioContext
  const ctx = new AC({ latencyHint: 'playback' })
  const sum = ctx.createGain()
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 128
  analyser.smoothingTimeConstant = 0.8
  const userGain = ctx.createGain()
  sum.connect(analyser)
  analyser.connect(userGain)
  userGain.connect(ctx.destination)
  const musicBus = ctx.createGain()
  const duck = ctx.createGain()
  musicBus.connect(duck)
  duck.connect(sum)
  const kioskBus = ctx.createGain()
  kioskBus.connect(sum)
  core = { ctx, sum, analyser, userGain, musicBus, duck, kioskBus, freq: new Uint8Array(analyser.frequencyBinCount) }
  return core
}

export function hasAudio() { return !!core }

/** Must run inside a user gesture on iOS/Android/Safari the first time. */
export function resumeAudio() {
  const c = audioCore()
  if (c.ctx.state !== 'running') c.ctx.resume().catch(() => {})
  // a one-sample silent buffer "unlocks" output on older iOS
  try {
    const b = c.ctx.createBuffer(1, 1, c.ctx.sampleRate)
    const s = c.ctx.createBufferSource()
    s.buffer = b
    s.connect(c.ctx.destination)
    s.start(0)
  } catch {}
  return c
}

/** 0..1 levels for `bands` frequency bands, or null when everything is silent. */
export function getLevels(bands) {
  if (!core || core.ctx.state !== 'running') return null
  const { analyser, freq } = core
  analyser.getByteFrequencyData(freq)
  const out = new Array(bands)
  const usable = Math.floor(freq.length * 0.75)
  let energy = 0
  for (let i = 0; i < bands; i++) {
    const a = Math.floor((i / bands) * usable)
    const b = Math.max(a + 1, Math.floor(((i + 1) / bands) * usable))
    let s = 0
    for (let j = a; j < b; j++) s += freq[j]
    out[i] = s / (b - a) / 255
    energy += out[i]
  }
  return energy > 0.02 ? out : null
}
