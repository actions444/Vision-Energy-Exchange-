// Original demo music, synthesised in the browser (see genWorker.js).
// This gives the three demo rooms real, distinct playlists without shipping any audio files.
// Replace them with your own MP3s in the Music admin (or public/music/manifest.json).

import GenWorker from './genWorker.js?worker&inline'

function rng(seed) {
  let s = seed >>> 0 || 1
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

let worker = null
let nextId = 1
const pending = new Map()
function getWorker() {
  if (worker) return worker
  worker = new GenWorker()
  worker.onmessage = (e) => {
    const { id, data, sampleRate, error } = e.data
    const p = pending.get(id)
    if (!p) return
    pending.delete(id)
    if (error) return p.reject(new Error(error))
    const buf = new AudioBuffer({ length: data.length, sampleRate, numberOfChannels: 1 })
    buf.copyToChannel(data, 0)
    p.resolve(buf)
  }
  return worker
}

/**
 * Render a demo track off the main thread.
 * @param {{ style: 'lofi'|'house'|'synthwave'|'trap'|'ambient', bpm: number, bars: number, root: number, seed: number }} spec
 * @returns {Promise<AudioBuffer>}
 */
export function renderSong(spec) {
  return new Promise((resolve, reject) => {
    const id = nextId++
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ id, spec })
  })
}

/** Album cover drawn on a canvas, returned as a data URL. */
export function coverArt({ title, artist, colors, seed = 1, shape = 'rings' }) {
  const c = document.createElement('canvas')
  c.width = c.height = 320
  const ctx = c.getContext('2d')
  const r = rng(seed)
  const g = ctx.createLinearGradient(0, 0, 320, 320)
  g.addColorStop(0, '#0b0814')
  g.addColorStop(1, colors[1] + '55')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 320, 320)
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 7; i++) {
    ctx.strokeStyle = colors[i % colors.length]
    ctx.lineWidth = 2 + r() * 6
    ctx.shadowColor = colors[i % colors.length]
    ctx.shadowBlur = 16
    ctx.beginPath()
    if (shape === 'rings') ctx.arc(160 + (r() - 0.5) * 60, 140 + (r() - 0.5) * 40, 30 + i * 18, 0, Math.PI * 2)
    else if (shape === 'bars') ctx.rect(30 + i * 40, 230 - r() * 180, 20, 400)
    else { ctx.moveTo(0, 60 + i * 34); ctx.bezierCurveTo(100, r() * 320, 220, r() * 320, 320, 40 + i * 36) }
    ctx.stroke()
  }
  ctx.globalCompositeOperation = 'source-over'
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(8,6,14,0.72)'
  ctx.fillRect(0, 238, 320, 82)
  ctx.fillStyle = '#ffffff'
  ctx.font = '800 26px "Syne", "Arial Black", sans-serif'
  ctx.fillText(title.toUpperCase(), 18, 274, 284)
  ctx.fillStyle = colors[0]
  ctx.font = '600 15px "JetBrains Mono", monospace'
  ctx.fillText(artist.toUpperCase(), 18, 300, 284)
  return c.toDataURL('image/jpeg', 0.86)
}
