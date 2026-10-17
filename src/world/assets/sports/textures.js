import * as THREE from 'three'

// Procedural surface textures for the sports grounds: a mown football field with real markings, a soccer pitch,
// a painted basketball court and chain-link fencing. Everything is drawn on canvases at load time (no image files).

const YARD = 0.9144
export const FOOTBALL = {
  yard: YARD,
  length: 120 * YARD, // goal line to goal line is 100 yd, plus two 10 yd end zones
  width: (160 / 3) * YARD, // 53 1/3 yd
  endZone: 10 * YARD,
  apron: 3.2, // painted/mown surround included in the texture
}
export const SOCCER = { length: 80, width: 50, apron: 3 }
export const BASKETBALL = { length: 28.65, width: 15.24, apron: 2.4 }

const cache = new Map()
const memo = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k) }
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
function toTex(c, { repeat = null, srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = aniso
  t.wrapS = t.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping
  if (repeat) t.repeat.set(repeat[0], repeat[1])
  t.needsUpdate = true
  return t
}

/** fine speckle + blade streaks over a region of a canvas (turf, acrylic grain) */
function grain(g, w, h, { n = 90000, alpha = 0.07, streak = false, seed = 1 } = {}) {
  for (let i = 0; i < n; i++) {
    const x = hash(i * 3.7 + seed) * w, y = hash(i * 5.3 + seed * 2) * h
    const dark = hash(i * 9.1 + seed) > 0.5
    g.fillStyle = dark ? `rgba(0,20,0,${alpha})` : `rgba(255,255,190,${alpha * 0.8})`
    if (streak) g.fillRect(x, y, 1.2, 2 + hash(i) * 4); else g.fillRect(x, y, 1.5, 1.5)
  }
}

/** tiling blade-noise bump map for turf */
export function turfBump() {
  return memo('turfBump', () => {
    const c = canvas(256, 256), g = c.getContext('2d')
    g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 9000; i++) { const v = 90 + hash(i) * 110 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(hash(i * 2.1) * 256, hash(i * 4.7) * 256, 1.4, 2 + hash(i * 6.3) * 3) }
    return toTex(c, { repeat: [60, 60], srgb: false })
  })
}

// ---------------------------------------------------------------------------------------------------------------
// American football: 2048 x 4096 canvas, u across the field (53 1/3 yd + apron), v along it (120 yd + apron).
// Texture orientation after the plane is laid flat: v runs along world z. Numbers are upright toward the near sideline.
// ---------------------------------------------------------------------------------------------------------------
export function footballTexture({ endA = { color: '#0f6f70', text: 'MEADOWBROOK' }, endB = { color: '#4b2a86', text: 'STORMS' } } = {}) {
  return memo('football:' + endA.text + endB.text, () => {
    const F = FOOTBALL
    const totalW = F.width + 2 * F.apron, totalL = F.length + 2 * F.apron
    const W = 1536, H = 3072
    const c = canvas(W, H), g = c.getContext('2d')
    const px = W / totalW, py = H / totalL // pixels per metre across / along
    const X = (m) => (m + totalW / 2) * px // field-local metres (centre origin) -> pixel
    const Yp = (m) => (m + totalL / 2) * py
    // base turf + mowing stripes every 5 yd, light/dark alternating
    g.fillStyle = '#3a7a34'; g.fillRect(0, 0, W, H)
    g.fillStyle = '#2f6a2c'; g.fillRect(0, 0, W, Yp(-F.length / 2)); g.fillRect(0, Yp(F.length / 2), W, H) // apron slightly darker
    g.fillRect(0, 0, X(-F.width / 2), H); g.fillRect(X(F.width / 2), 0, W, H)
    for (let k = 0; k < 24; k++) {
      const y0 = -F.length / 2 + k * 5 * YARD
      g.fillStyle = k % 2 ? 'rgba(210,240,150,0.10)' : 'rgba(0,40,0,0.10)'
      g.fillRect(X(-F.width / 2 - F.apron), Yp(y0), px * (F.width + 2 * F.apron), 5 * YARD * py)
    }
    grain(g, W, H, { n: 160000, alpha: 0.06, streak: true, seed: 3 })
    // wear between the hashes
    for (const gy of [-0.35 * F.length / 2, 0.35 * F.length / 2, 0]) {
      const grd = g.createRadialGradient(X(0), Yp(gy), 0, X(0), Yp(gy), 14 * py)
      grd.addColorStop(0, 'rgba(120,105,60,0.22)'); grd.addColorStop(1, 'rgba(120,105,60,0)')
      g.fillStyle = grd; g.fillRect(X(-12), Yp(gy - 14), 24 * px, 28 * py)
    }
    // end zones
    const ez = (y0, y1, e) => {
      g.fillStyle = e.color; g.fillRect(X(-F.width / 2), Yp(y0), F.width * px, (y1 - y0) * py)
      for (let k = 0; k < 400; k++) { g.fillStyle = hash(k * 1.3 + y0) > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)'; g.fillRect(X(-F.width / 2) + hash(k * 2.7 + y0) * F.width * px, Yp(y0) + hash(k * 4.1) * (y1 - y0) * py, 2, 8) }
    }
    ez(-F.length / 2, -F.length / 2 + F.endZone, endA)
    ez(F.length / 2 - F.endZone, F.length / 2, endB)
    // end-zone lettering (reads along the end zone, from the sideline)
    const lettering = (yc, text, flip) => {
      g.save(); g.translate(X(0), Yp(yc)); g.rotate(flip ? -Math.PI / 2 : Math.PI / 2)
      g.fillStyle = 'rgba(255,255,255,0.92)'; g.font = `900 ${Math.round(3.9 * px)}px "Arial Black", Impact, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'
      g.fillText(text, 0, 0); g.restore()
    }
    lettering(-F.length / 2 + F.endZone / 2, endA.text, false)
    lettering(F.length / 2 - F.endZone / 2, endB.text, true)
    // line work
    const lw = 0.15 // 6 in
    g.fillStyle = '#f3f1ea'
    const hline = (y, x0 = -F.width / 2, x1 = F.width / 2, w = lw) => g.fillRect(X(x0), Yp(y) - (w * py) / 2, (x1 - x0) * px, w * py)
    const vline = (x, y0, y1, w = lw) => g.fillRect(X(x) - (w * px) / 2, Yp(y0), w * px, (y1 - y0) * py)
    vline(-F.width / 2 + lw / 2, -F.length / 2, F.length / 2, lw * 1.0); vline(F.width / 2 - lw / 2, -F.length / 2, F.length / 2, lw * 1.0) // sidelines
    hline(-F.length / 2 + lw / 2); hline(F.length / 2 - lw / 2) // end lines
    for (let i = 0; i <= 20; i++) { // goal lines + every 5 yd
      const y = -F.length / 2 + F.endZone + i * 5 * YARD
      hline(y, -F.width / 2, F.width / 2, i === 0 || i === 20 ? lw * 1.2 : lw)
    }
    // hash marks (college width: 40 ft in from the sideline gap; ticks at every yard, 2 ft long) and sideline ticks
    const hashX = 6.17 // metres from field centre: inbound lines (college 40 ft between)
    for (let y = 0; y <= 100; y++) {
      const wy = -F.length / 2 + F.endZone + y * YARD
      if (y % 5 === 0) continue
      for (const sx of [-1, 1]) {
        vline(sx * hashX, wy - lw / 2 - 0.0, wy + lw / 2, 0.6) // tick across the hash line
        g.fillRect(X(sx * (F.width / 2 - 0.62)), Yp(wy) - (lw * py) / 2, 0.6 * px, lw * py) // sideline ticks
      }
    }
    // yard numerals every 10 yd, 12 yd in from the sideline; tops toward the near sideline
    g.fillStyle = '#f6f4ee'; g.textAlign = 'center'; g.textBaseline = 'middle'
    const nums = ['10', '20', '30', '40', '50', '40', '30', '20', '10']
    nums.forEach((n, i) => {
      const y = -F.length / 2 + F.endZone + (i + 1) * 10 * YARD
      for (const sx of [-1, 1]) {
        g.save(); g.translate(X(sx * (F.width / 2 - 10.2)), Yp(y)); g.rotate(sx < 0 ? -Math.PI / 2 : Math.PI / 2)
        g.font = `800 ${Math.round(1.85 * px)}px Arial, Helvetica, sans-serif`
        g.fillText(n.split('').join(' '), 0, 0); g.restore()
      }
    })
    // midfield emblem: a bolt in a ring
    g.save(); g.translate(X(0), Yp(0)); g.fillStyle = 'rgba(255,255,255,0.9)'
    g.beginPath(); g.arc(0, 0, 4.4 * px, 0, Math.PI * 2); g.lineWidth = 0.35 * px; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.stroke()
    g.fillStyle = '#f2c23a'; g.beginPath()
    const s = 3.4 * px
    g.moveTo(0.25 * s, -1.2 * s); g.lineTo(-0.7 * s, 0.15 * s); g.lineTo(-0.05 * s, 0.15 * s); g.lineTo(-0.3 * s, 1.2 * s); g.lineTo(0.7 * s, -0.25 * s); g.lineTo(0.05 * s, -0.25 * s); g.closePath(); g.fill()
    g.restore()
    return toTex(c, { aniso: 12 })
  })
}

// ---------------------------------------------------------------------------------------------------------------
// Soccer pitch (community size 80 x 50 m): mown stripes, halfway line, circle, penalty and goal areas, spots, arcs.
// Canvas 2048 wide along the length (u), 1280 across (v).
// ---------------------------------------------------------------------------------------------------------------
export function soccerTexture() {
  return memo('soccer', () => {
    const S = SOCCER, totalL = S.length + 2 * S.apron, totalW = S.width + 2 * S.apron
    const W = 2304, H = Math.round(2304 * totalW / totalL)
    const c = canvas(W, H), g = c.getContext('2d')
    const px = W / totalL, py = H / totalW
    const X = (m) => (m + totalL / 2) * px, Yp = (m) => (m + totalW / 2) * py
    g.fillStyle = '#3c7d36'; g.fillRect(0, 0, W, H)
    for (let k = 0; k < 14; k++) { g.fillStyle = k % 2 ? 'rgba(210,240,150,0.10)' : 'rgba(0,40,0,0.10)'; g.fillRect(X(-S.length / 2 - S.apron + k * (totalL / 14)), 0, (totalL / 14) * px, H) }
    grain(g, W, H, { n: 120000, alpha: 0.06, streak: true, seed: 8 })
    g.strokeStyle = '#f3f1ea'; g.fillStyle = '#f3f1ea'; g.lineWidth = 0.12 * px
    const rect = (x0, z0, x1, z1) => g.strokeRect(X(x0), Yp(z0), (x1 - x0) * px, (z1 - z0) * py)
    rect(-S.length / 2, -S.width / 2, S.length / 2, S.width / 2)
    g.beginPath(); g.moveTo(X(0), Yp(-S.width / 2)); g.lineTo(X(0), Yp(S.width / 2)); g.stroke()
    g.beginPath(); g.ellipse(X(0), Yp(0), 7.3 * px, 7.3 * py, 0, 0, Math.PI * 2); g.stroke()
    const spot = (x, z) => { g.beginPath(); g.ellipse(X(x), Yp(z), 0.18 * px, 0.18 * py, 0, 0, Math.PI * 2); g.fill() }
    spot(0, 0)
    for (const s of [-1, 1]) {
      const gl = s * S.length / 2
      rect(Math.min(gl, gl - s * 13.5), -14.5, Math.max(gl, gl - s * 13.5), 14.5) // penalty area
      rect(Math.min(gl, gl - s * 4.5), -6.5, Math.max(gl, gl - s * 4.5), 6.5) // goal area
      spot(gl - s * 9.5, 0)
      g.beginPath(); const a0 = Math.acos((13.5 - 9.5) / 7.3) // penalty arc outside the area
      g.ellipse(X(gl - s * 9.5), Yp(0), 7.3 * px, 7.3 * py, 0, s < 0 ? -a0 : Math.PI - a0, s < 0 ? a0 : Math.PI + a0, s > 0); g.stroke()
      for (const z of [-S.width / 2, S.width / 2]) { g.beginPath(); g.ellipse(X(gl), Yp(z), 1 * px, 1 * py, 0, 0, Math.PI * 2); g.stroke() } // corner arcs (full circles are clipped by the pitch edge in reality; kept as quarter marks)
    }
    return toTex(c, { aniso: 12 })
  })
}

// ---------------------------------------------------------------------------------------------------------------
// Outdoor basketball court (NCAA-style 28.65 x 15.24 m): teal acrylic, violet key, 3-point arcs, circles, lines.
// ---------------------------------------------------------------------------------------------------------------
export function basketballTexture() {
  return memo('basketball', () => {
    const B = BASKETBALL, totalL = B.length + 2 * B.apron, totalW = B.width + 2 * B.apron
    const W = 1536, H = Math.round(1536 * totalW / totalL)
    const c = canvas(W, H), g = c.getContext('2d')
    const px = W / totalL, py = H / totalW
    const X = (m) => (m + totalL / 2) * px, Yp = (m) => (m + totalW / 2) * py
    g.fillStyle = '#2b4e5a'; g.fillRect(0, 0, W, H) // out-of-bounds: deep slate teal
    g.fillStyle = '#2f8d95'; g.fillRect(X(-B.length / 2), Yp(-B.width / 2), B.length * px, B.width * py) // court
    // keys (painted violet), 4.88 m wide, 5.8 m long
    g.fillStyle = '#6a3fa8'
    for (const s of [-1, 1]) { const gl = s * B.length / 2; g.fillRect(X(Math.min(gl, gl - s * 5.8)), Yp(-2.44), 5.8 * px, 4.88 * py) }
    grain(g, W, H, { n: 140000, alpha: 0.05, seed: 5 })
    g.strokeStyle = '#f4f2ec'; g.fillStyle = '#f4f2ec'; g.lineWidth = 0.1 * px
    const rect = (x0, z0, x1, z1) => g.strokeRect(X(x0), Yp(z0), (x1 - x0) * px, (z1 - z0) * py)
    rect(-B.length / 2, -B.width / 2, B.length / 2, B.width / 2)
    g.beginPath(); g.moveTo(X(0), Yp(-B.width / 2)); g.lineTo(X(0), Yp(B.width / 2)); g.stroke()
    g.beginPath(); g.ellipse(X(0), Yp(0), 1.83 * px, 1.83 * py, 0, 0, Math.PI * 2); g.stroke()
    for (const s of [-1, 1]) {
      const gl = s * B.length / 2, ft = gl - s * 5.8
      rect(Math.min(gl, ft), -2.44, Math.max(gl, ft), 2.44) // key
      g.beginPath(); g.ellipse(X(ft), Yp(0), 1.83 * px, 1.83 * py, 0, s < 0 ? -Math.PI / 2 : Math.PI / 2, s < 0 ? Math.PI / 2 : 1.5 * Math.PI); g.stroke() // free-throw semicircle (outer)
      // three-point line: 6.02 m arc about the hoop (1.575 m from the baseline), straight 0.9 m in from each sideline
      const hx = gl - s * 1.575, r = 6.02, zc = B.width / 2 - 0.9
      const a = Math.asin(zc / r)
      g.beginPath(); g.ellipse(X(hx), Yp(0), r * px, r * py, 0, s < 0 ? -a : Math.PI - a, s < 0 ? a : Math.PI + a, s > 0); g.stroke()
      for (const z of [-zc, zc]) { g.beginPath(); g.moveTo(X(hx - s * Math.sqrt(r * r - zc * zc)), Yp(z)); g.lineTo(X(gl), Yp(z)); g.stroke() }
      g.beginPath(); g.ellipse(X(hx), Yp(0), 1.22 * px, 1.22 * py, 0, s < 0 ? -Math.PI / 2 : Math.PI / 2, s < 0 ? Math.PI / 2 : 1.5 * Math.PI); g.stroke() // restricted area
    }
    return toTex(c, { aniso: 12 })
  })
}

/** chain-link: diamond mesh on a transparent canvas, repeats across a fence panel (1 tile = 0.6 m) */
export function chainLinkTexture() {
  return memo('chain', () => {
    const c = canvas(128, 128), g = c.getContext('2d')
    g.clearRect(0, 0, 128, 128)
    g.strokeStyle = 'rgba(190,196,202,0.95)'; g.lineWidth = 3.2
    for (let k = -1; k <= 2; k++) {
      g.beginPath(); g.moveTo(-64 + k * 64, 0); g.lineTo(64 + k * 64, 128); g.stroke()
      g.beginPath(); g.moveTo(192 + k * 64, 0); g.lineTo(64 + k * 64, 128); g.stroke()
    }
    const t = toTex(c, { repeat: [1, 1], aniso: 4 })
    return t
  })
}

/** brushed aluminium (bleacher planks) */
export function brushedTexture() {
  return memo('brushed', () => {
    const c = canvas(256, 64), g = c.getContext('2d')
    g.fillStyle = '#b9bdc2'; g.fillRect(0, 0, 256, 64)
    for (let i = 0; i < 1600; i++) { const v = 150 + hash(i) * 80 | 0; g.fillStyle = `rgba(${v},${v},${v + 4},0.35)`; g.fillRect(hash(i * 3.1) * 256, hash(i * 7.7) * 64, 30 + hash(i * 5) * 120, 1) }
    return toTex(c, { repeat: [1, 1] })
  })
}
