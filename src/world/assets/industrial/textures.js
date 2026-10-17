import * as THREE from 'three'

// Procedural surfaces for the industrial / waste district: corrugated metal cladding, shipping-container steel,
// diamond-plate, compacted dirt road with wheel ruts, bare landfill soil, and a decal-style waste debris sheet.
// Everything is painted on canvases at load time (no image files) and cached.

const cache = new Map()
const memo = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k) }
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }
const h2 = (a, b, c = 0) => hash(a * 12.9898 + b * 78.233 + c * 37.719)

function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
function toTex(c, { srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = aniso
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.needsUpdate = true
  return t
}
const shade = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return `#${c.getHexString()}` }

/** Corrugated sheet: ribs 76 mm apart (one tile = 0.76 m wide, 1.52 m tall), rust streaks near the seams, paint chalking. */
export function corrugatedMaps(hex) {
  return memo('corr|' + hex, () => {
    const W = 256, Hh = 512
    const col = canvas(W, Hh), cx = col.getContext('2d')
    const bump = canvas(W, Hh), bx = bump.getContext('2d')
    cx.fillStyle = hex; cx.fillRect(0, 0, W, Hh)
    const ribs = 10, rw = W / ribs
    for (let i = 0; i < ribs; i++) {
      const g = cx.createLinearGradient(i * rw, 0, (i + 1) * rw, 0)
      g.addColorStop(0, 'rgba(0,0,0,0.28)'); g.addColorStop(0.5, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0.28)')
      cx.fillStyle = g; cx.fillRect(i * rw, 0, rw, Hh)
      const gb = bx.createLinearGradient(i * rw, 0, (i + 1) * rw, 0)
      gb.addColorStop(0, '#303030'); gb.addColorStop(0.5, '#f0f0f0'); gb.addColorStop(1, '#303030')
      bx.fillStyle = gb; bx.fillRect(i * rw, 0, rw, Hh)
    }
    // weathering: vertical streaks (run-off), darker lower edge, a few rust blooms
    for (let i = 0; i < 70; i++) {
      const x = h2(i, 1) * W, w = 1 + h2(i, 2) * 4, y0 = h2(i, 3) * Hh * 0.6, l = 60 + h2(i, 4) * 300
      const a = 0.04 + h2(i, 5) * 0.10
      cx.fillStyle = h2(i, 6) < 0.4 ? `rgba(110,62,32,${a})` : `rgba(20,20,20,${a})`
      cx.fillRect(x, y0, w, l)
    }
    for (let i = 0; i < 14; i++) {
      const x = h2(i, 7) * W, y = h2(i, 8) * Hh, r = 6 + h2(i, 9) * 22
      const g = cx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, 'rgba(120,64,30,0.30)'); g.addColorStop(1, 'rgba(120,64,30,0)')
      cx.fillStyle = g; cx.fillRect(x - r, y - r, 2 * r, 2 * r)
    }
    for (let i = 0; i < 1500; i++) { cx.fillStyle = `rgba(${h2(i, 10) < 0.5 ? '255,255,255' : '0,0,0'},${h2(i, 11) * 0.05})`; cx.fillRect(h2(i, 12) * W, h2(i, 13) * Hh, 1.5, 1.5) }
    const rough = canvas(64); const rx = rough.getContext('2d'); rx.fillStyle = '#cfcfcf'; rx.fillRect(0, 0, 64, 64)
    for (let i = 0; i < 200; i++) { const g = 140 + h2(i, 14) * 100; rx.fillStyle = `rgb(${g},${g},${g})`; rx.fillRect(h2(i, 15) * 64, h2(i, 16) * 64, 4, 8) }
    const map = toTex(col); map.repeat.set(1 / 0.76, 1 / 1.52)
    const bumpT = toTex(bump, { srgb: false }); bumpT.repeat.copy(map.repeat)
    const roughT = toTex(rough, { srgb: false }); roughT.repeat.set(1 / 1.5, 1 / 1.5)
    return { map, bump: bumpT, rough: roughT }
  })
}

/** Shipping-container side: vertical ribs, door-end detail not needed (end faces get the same sheet). Tile = 2.44 m x 2.6 m. */
export function containerMaps(hex, label) {
  return memo('cont|' + hex + label, () => {
    const W = 512, Hh = 512
    const col = canvas(W, Hh), c = col.getContext('2d')
    c.fillStyle = hex; c.fillRect(0, 0, W, Hh)
    const ribs = 26, rw = W / ribs
    for (let i = 0; i < ribs; i++) {
      const g = c.createLinearGradient(i * rw, 0, (i + 1) * rw, 0)
      g.addColorStop(0, 'rgba(0,0,0,0.3)'); g.addColorStop(0.5, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0.3)')
      c.fillStyle = g; c.fillRect(i * rw, 18, rw, Hh - 36)
    }
    // frame rails top/bottom
    c.fillStyle = shade(hex, 0.78); c.fillRect(0, 0, W, 18); c.fillRect(0, Hh - 18, W, 18)
    // stencilled name and number
    c.fillStyle = 'rgba(240,240,235,0.92)'; c.font = '700 54px Arial'; c.textAlign = 'center'
    c.fillText(label, W / 2, 130)
    c.font = '600 22px monospace'; c.fillText(String(100000 + Math.floor(h2(label.length, 5) * 899999)) + ' 6', W / 2, 168)
    c.font = '600 14px monospace'; c.fillText('MAX GROSS 30480 KG', W / 2, 192)
    for (let i = 0; i < 60; i++) { // scrapes and dents
      const x = h2(i, 21) * W, y = 20 + h2(i, 22) * (Hh - 40), l = 10 + h2(i, 23) * 60
      c.strokeStyle = `rgba(${h2(i, 24) < 0.5 ? '210,150,100' : '30,30,30'},${0.08 + h2(i, 25) * 0.18})`; c.lineWidth = 1 + h2(i, 26) * 2
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + (h2(i, 27) - 0.5) * 12, y + l); c.stroke()
    }
    for (let i = 0; i < 12; i++) { // rust at the bottom edge
      const x = h2(i, 28) * W
      const g = c.createLinearGradient(0, Hh - 70, 0, Hh)
      g.addColorStop(0, 'rgba(110,60,28,0)'); g.addColorStop(1, 'rgba(110,60,28,0.35)')
      c.fillStyle = g; c.fillRect(x, Hh - 70, 18 + h2(i, 29) * 50, 70)
    }
    const map = toTex(col); map.repeat.set(1 / 2.44, 1 / 2.6)
    return { map }
  })
}

/** Steel diamond tread plate (scale decks, ramps). 0.5 m tile. */
export function treadMaps() {
  return memo('tread', () => {
    const S = 256
    const col = canvas(S), c = col.getContext('2d'), bump = canvas(S), b = bump.getContext('2d')
    c.fillStyle = '#6d7276'; c.fillRect(0, 0, S, S); b.fillStyle = '#505050'; b.fillRect(0, 0, S, S)
    const n = 8, d = S / n
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      for (const [ox, oy, ang] of [[0.25, 0.25, 0.8], [0.75, 0.75, -0.8]]) {
        const x = (i + ox) * d, y = (j + oy) * d
        c.save(); c.translate(x, y); c.rotate(ang); c.fillStyle = 'rgba(210,214,218,0.85)'; c.fillRect(-d * 0.32, -d * 0.07, d * 0.64, d * 0.14); c.restore()
        b.save(); b.translate(x, y); b.rotate(ang); b.fillStyle = '#f0f0f0'; b.fillRect(-d * 0.32, -d * 0.07, d * 0.64, d * 0.14); b.restore()
      }
    }
    for (let i = 0; i < 4000; i++) { c.fillStyle = `rgba(${h2(i, 31) < 0.5 ? '40,40,40' : '200,200,200'},${h2(i, 32) * 0.08})`; c.fillRect(h2(i, 33) * S, h2(i, 34) * S, 2, 2) }
    const map = toTex(col); map.repeat.set(1 / 0.5, 1 / 0.5)
    const bumpT = toTex(bump, { srgb: false }); bumpT.repeat.copy(map.repeat)
    return { map, bump: bumpT }
  })
}

/** Compacted haul road: pale crushed rock with two darker wheel ruts, scattered stones. u runs across the road (0..1), v along it, 8 m tile. */
export function haulRoadMaps() {
  return memo('haul', () => {
    const W = 256, Hh = 512
    const col = canvas(W, Hh), c = col.getContext('2d'), bump = canvas(W, Hh), b = bump.getContext('2d')
    c.fillStyle = '#9a8c75'; c.fillRect(0, 0, W, Hh); b.fillStyle = '#808080'; b.fillRect(0, 0, W, Hh)
    for (let i = 0; i < 6000; i++) {
      const x = h2(i, 41) * W, y = h2(i, 42) * Hh, r = 0.6 + h2(i, 43) * 1.8, k = h2(i, 44)
      c.fillStyle = k < 0.3 ? 'rgba(220,208,184,0.7)' : k < 0.6 ? 'rgba(104,92,74,0.7)' : 'rgba(150,134,108,0.7)'
      c.beginPath(); c.arc(x, y, r, 0, 7); c.fill()
      const g = 100 + k * 130; b.fillStyle = `rgb(${g},${g},${g})`; b.beginPath(); b.arc(x, y, r, 0, 7); b.fill()
    }
    for (const rx of [W * 0.3, W * 0.7]) { // wheel ruts
      const g = c.createLinearGradient(rx - 22, 0, rx + 22, 0)
      g.addColorStop(0, 'rgba(70,58,44,0)'); g.addColorStop(0.5, 'rgba(70,58,44,0.42)'); g.addColorStop(1, 'rgba(70,58,44,0)')
      c.fillStyle = g; c.fillRect(rx - 22, 0, 44, Hh)
      const gb = b.createLinearGradient(rx - 22, 0, rx + 22, 0)
      gb.addColorStop(0, 'rgba(60,60,60,0)'); gb.addColorStop(0.5, 'rgba(60,60,60,0.6)'); gb.addColorStop(1, 'rgba(60,60,60,0)')
      b.fillStyle = gb; b.fillRect(rx - 22, 0, 44, Hh)
    }
    // soft shoulders fade
    const e = c.createLinearGradient(0, 0, W, 0); e.addColorStop(0, 'rgba(120,98,70,0.35)'); e.addColorStop(0.12, 'rgba(120,98,70,0)'); e.addColorStop(0.88, 'rgba(120,98,70,0)'); e.addColorStop(1, 'rgba(120,98,70,0.35)')
    c.fillStyle = e; c.fillRect(0, 0, W, Hh)
    const map = toTex(col); map.wrapS = THREE.ClampToEdgeWrapping
    const bumpT = toTex(bump, { srgb: false }); bumpT.wrapS = THREE.ClampToEdgeWrapping
    return { map, bump: bumpT }
  })
}

/** Landfill ground: cover soil and clay with stones and sparse dry grass. Painted greyer than park mulch. 6 m tile. */
export function landfillSoilMaps() {
  return memo('soil', () => {
    const S = 512
    const col = canvas(S), c = col.getContext('2d'), bump = canvas(S), b = bump.getContext('2d')
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, S, S); b.fillStyle = '#808080'; b.fillRect(0, 0, S, S)
    // value noise blotches (kept near-white so the vertex colours drive hue)
    for (let i = 0; i < 260; i++) {
      const x = h2(i, 51) * S, y = h2(i, 52) * S, r = 10 + h2(i, 53) * 50, k = 205 + h2(i, 54) * 50
      const g = c.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, `rgba(${k},${k},${k},0.5)`); g.addColorStop(1, `rgba(${k},${k},${k},0)`)
      c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r)
    }
    for (let i = 0; i < 5200; i++) {
      const x = h2(i, 55) * S, y = h2(i, 56) * S, r = 0.5 + h2(i, 57) * 1.3, k = h2(i, 58)
      const v = k < 0.35 ? 170 : k < 0.7 ? 226 : 200
      c.fillStyle = `rgba(${v},${v - 6},${v - 14},0.38)`; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill()
      const g = 90 + k * 140; b.fillStyle = `rgb(${g},${g},${g})`; b.beginPath(); b.arc(x, y, r, 0, 7); b.fill()
    }
    for (let i = 0; i < 160; i++) { // dry grass tufts
      const x = h2(i, 59) * S, y = h2(i, 60) * S
      c.strokeStyle = `rgba(${150 + h2(i, 61) * 40},${140 + h2(i, 62) * 30},80,0.5)`; c.lineWidth = 1
      for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + (k - 2) * 2.5, y - 6 - h2(i, 63 + k) * 7); c.stroke() }
    }
    const map = toTex(col); map.repeat.set(1 / 6, 1 / 6)
    const bumpT = toTex(bump, { srgb: false }); bumpT.repeat.copy(map.repeat)
    return { map, bump: bumpT }
  })
}

/** Concrete apron with oil stains, expansion joints and tyre marks. 4 m tile. */
export function yardConcreteMaps() {
  return memo('yardc', () => {
    const S = 512
    const col = canvas(S), c = col.getContext('2d')
    c.fillStyle = '#a7a59f'; c.fillRect(0, 0, S, S)
    for (let i = 0; i < 360; i++) {
      const x = h2(i, 71) * S, y = h2(i, 72) * S, r = 8 + h2(i, 73) * 46, k = 150 + h2(i, 74) * 60
      const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${k},${k},${k - 4},0.28)`); g.addColorStop(1, `rgba(${k},${k},${k},0)`)
      c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r)
    }
    for (let i = 0; i < 9; i++) { // oil stains
      const x = h2(i, 75) * S, y = h2(i, 76) * S, r = 8 + h2(i, 77) * 26
      const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(30,28,26,0.35)'); g.addColorStop(1, 'rgba(30,28,26,0)')
      c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r)
    }
    c.strokeStyle = 'rgba(40,40,40,0.55)'; c.lineWidth = 2 // joints on a 4 m grid (tile = 4 m)
    c.strokeRect(1, 1, S - 2, S - 2)
    for (let i = 0; i < 3000; i++) { c.fillStyle = `rgba(${h2(i, 78) < 0.5 ? '255,255,255' : '0,0,0'},${h2(i, 79) * 0.06})`; c.fillRect(h2(i, 80) * S, h2(i, 81) * S, 2, 2) }
    const map = toTex(col); map.repeat.set(1 / 4, 1 / 4)
    return { map }
  })
}
