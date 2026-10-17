import * as THREE from 'three'

// Procedural plant textures (canvas, generated once). Every albedo comes with a height map that is
// turned into a tangent-space normal map, so bark, leaves and soil respond to the sun instead of looking printed on.

export const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }

function cv(w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  draw(c.getContext('2d'), w, h)
  return c
}

/** smooth tileable value noise on a canvas-sized grid */
function noiseField(w, h, cells, seed) {
  const gx = cells, gy = Math.max(1, Math.round(cells * h / w))
  const g = new Float32Array(gx * gy)
  for (let i = 0; i < g.length; i++) g[i] = hash(seed * 91.7 + i)
  const f = new Float32Array(w * h)
  const at = (x, y) => g[((y % gy + gy) % gy) * gx + ((x % gx + gx) % gx)]
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = (x / w) * gx, v = (y / h) * gy
    const x0 = Math.floor(u), y0 = Math.floor(v)
    const fx = u - x0, fy = v - y0
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
    f[y * w + x] = (at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx) * (1 - sy) + (at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx) * sy
  }
  return f
}

/** Sobel height->normal map, wrapping at the edges so tiles stay seamless */
function normalFromHeight(hc, strength = 2.2) {
  const w = hc.width, h = hc.height
  const src = hc.getContext('2d').getImageData(0, 0, w, h).data
  const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255
  const out = document.createElement('canvas'); out.width = w; out.height = h
  const ctx = out.getContext('2d'); const img = ctx.createImageData(w, h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x - 1, y) + H(x - 1, y + 1))
    const dy = (H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x, y - 1) + H(x + 1, y - 1))
    let nx = -dx * strength, ny = dy * strength, nz = 1
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l
    const i = (y * w + x) * 4
    img.data[i] = (nx * 0.5 + 0.5) * 255; img.data[i + 1] = (ny * 0.5 + 0.5) * 255; img.data[i + 2] = (nz * 0.5 + 0.5) * 255; img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return out
}

const T = (c, { srgb = true, repeat = false } = {}) => {
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 4
  t.generateMipmaps = true
  t.minFilter = THREE.LinearMipmapLinearFilter
  return t
}

const cache = new Map()
const once = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k) }

/**
 * Palm bark, 1 m x 1 m tile (u around the trunk, v up it). `kind`:
 *  'coconut': grey-tan trunk with a leaf-scar ring every ~13 cm, vertical fibre, lichen patches;
 *  'royal'  : smooth pale-grey concrete-like bark with faint, widely spaced rings and fine cracks.
 */
export function barkMaps(kind) {
  return once('bark' + kind, () => {
    const S = 512
    const n1 = noiseField(S, S, 8, kind === 'royal' ? 3 : 5), n2 = noiseField(S, S, 32, 9), n3 = noiseField(S, S, 4, 13)
    const hc = cv(S, S, () => {}); const hx = hc.getContext('2d'); const hi = hx.createImageData(S, S)
    const cc = cv(S, S, () => {}); const cx = cc.getContext('2d'); const ci = cx.createImageData(S, S)
    const rings = kind === 'royal' ? 4 : 8
    for (let y = 0; y < S; y++) {
      const v = y / S
      // ring profile: a rounded ridge with a dark crease under it, jittered per tile column
      for (let x = 0; x < S; x++) {
        const u = x / S
        const wob = (n1[y * S + x] - 0.5) * 0.06
        const rp = ((v * rings + wob * rings) % 1 + 1) % 1
        let ridge = Math.pow(Math.sin(Math.PI * rp), kind === 'royal' ? 1.6 : 0.9)
        const crease = rp < 0.12 ? 1 - rp / 0.12 : 0
        const fibre = kind === 'royal' ? 0 : (n2[((y * 3) % S) * S + ((x * 2) % S)] - 0.5)
        if (kind === 'tree') {
          const fiss = Math.abs(Math.sin(u * Math.PI * 14 + n1[y * S + x] * 9 + n3[y * S + x] * 3))
          const hT = Math.max(0, Math.min(1, 0.3 + fiss * 0.55 + (n2[y * S + x] - 0.5) * 0.22))
          const i0 = (y * S + x) * 4
          hi.data[i0] = hi.data[i0 + 1] = hi.data[i0 + 2] = hT * 255; hi.data[i0 + 3] = 255
          const sh = 0.86 + n2[y * S + x] * 0.26
          ci.data[i0] = (74 + hT * 64) * sh; ci.data[i0 + 1] = (60 + hT * 50) * sh; ci.data[i0 + 2] = (48 + hT * 38) * sh; ci.data[i0 + 3] = 255
          continue
        }
        let hgt = 0.55 + ridge * (kind === 'royal' ? 0.16 : 0.3) - crease * 0.35 + fibre * 0.22 + (n1[y * S + x] - 0.5) * 0.18
        if (kind === 'royal') hgt += (n2[y * S + x] - 0.5) * 0.1
        hgt = Math.max(0, Math.min(1, hgt))
        const i = (y * S + x) * 4
        hi.data[i] = hi.data[i + 1] = hi.data[i + 2] = hgt * 255; hi.data[i + 3] = 255
        // colour
        const lich = Math.max(0, n3[y * S + x] - 0.62) * 3
        let r, g, b
        if (kind === 'royal') { r = 150 + hgt * 40; g = 146 + hgt * 38; b = 138 + hgt * 34 }
        else { r = 112 + hgt * 62; g = 96 + hgt * 52; b = 76 + hgt * 40 }
        r = r * (1 - crease * 0.45) + lich * 14; g = g * (1 - crease * 0.45) + lich * 20; b = b * (1 - crease * 0.45) + lich * 6
        const tint = 0.88 + n2[y * S + x] * 0.22
        ci.data[i] = r * tint; ci.data[i + 1] = g * tint; ci.data[i + 2] = b * tint; ci.data[i + 3] = 255
      }
    }
    hx.putImageData(hi, 0, 0); cx.putImageData(ci, 0, 0)
    return { map: T(cc, { repeat: true }), normal: T(normalFromHeight(hc, kind === 'royal' ? 1.6 : 2.6), { srgb: false, repeat: true }) }
  })
}

/**
 * Palm leaf atlas 256 x 512. Left 192 px: one narrow leaflet (pointed tip, folded midrib, parallel veins).
 * Right strip: a pale-green swatch (rachis, petioles) and a brown swatch (nuts, dead bases).
 */
export function leafletMaps() {
  return once('leaflet', () => {
    const W = 256, H = 512, LW = 192
    const col = cv(W, H, (g) => {
      g.fillStyle = '#6a8530'; g.fillRect(0, 0, W, H)
      // blade: v=0 at the stem end (bottom of canvas), tapering to a point at the top
      const grad = g.createLinearGradient(0, H, 0, 0)
      grad.addColorStop(0, '#5f7a2c'); grad.addColorStop(0.45, '#7f9b36'); grad.addColorStop(1, '#a1b64a')
      g.fillStyle = grad
      g.beginPath()
      g.moveTo(LW / 2 - 7, H)
      g.bezierCurveTo(LW / 2 - 60, H * 0.7, LW / 2 - 52, H * 0.25, LW / 2, 3)
      g.bezierCurveTo(LW / 2 + 52, H * 0.25, LW / 2 + 60, H * 0.7, LW / 2 + 7, H)
      g.closePath(); g.fill()
      // veins and the folded midrib
      g.strokeStyle = 'rgba(40,64,20,0.35)'; g.lineWidth = 1.5
      for (let i = -5; i <= 5; i++) { g.beginPath(); g.moveTo(LW / 2 + i * 1.5, H); g.quadraticCurveTo(LW / 2 + i * 9, H * 0.5, LW / 2 + i * 1.1, 14); g.stroke() }
      g.strokeStyle = 'rgba(215,230,150,0.75)'; g.lineWidth = 3; g.beginPath(); g.moveTo(LW / 2, H); g.lineTo(LW / 2, 8); g.stroke()
      g.strokeStyle = 'rgba(30,48,14,0.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(LW / 2 + 3, H); g.lineTo(LW / 2 + 1, 12); g.stroke()
      // slight sun-bleached tip
      const tip = g.createLinearGradient(0, 120, 0, 0); tip.addColorStop(0, 'rgba(190,170,90,0)'); tip.addColorStop(1, 'rgba(190,170,90,0.35)')
      g.globalCompositeOperation = 'source-atop'; g.fillStyle = tip; g.fillRect(0, 0, LW, 120); g.globalCompositeOperation = 'source-over'
      // swatches
      g.fillStyle = '#9fb25a'; g.fillRect(LW + 2, 0, W - LW - 4, H / 2 - 2)
      g.fillStyle = '#5b4528'; g.fillRect(LW + 2, H / 2 + 2, W - LW - 4, H / 2 - 4)
    })
    const hc = cv(W, H, (g) => {
      g.fillStyle = '#808080'; g.fillRect(0, 0, W, H)
      g.strokeStyle = '#d0d0d0'; g.lineWidth = 4; g.beginPath(); g.moveTo(LW / 2, H); g.lineTo(LW / 2, 8); g.stroke()
      g.strokeStyle = '#606060'; g.lineWidth = 1.5
      for (let i = -9; i <= 9; i++) { g.beginPath(); g.moveTo(LW / 2 + i * 2.5, H); g.quadraticCurveTo(LW / 2 + i * 8, H * 0.5, LW / 2 + i * 1.3, 14); g.stroke() }
    })
    return { map: T(col), normal: T(normalFromHeight(hc, 1.4), { srgb: false }) }
  })
}

/**
 * Alpha-cut frond comb (LOD cards): the rachis runs up the centre and individual narrow leaflets
 * come off both sides, angled forward and drooping, with real gaps between them so the card is not a paddle.
 */
export function combMaps() {
  return once('comb', () => {
    const W = 256, H = 1024
    const col = cv(W, H, (g) => {
      g.clearRect(0, 0, W, H)
      const cx = W / 2
      const n = 62
      for (const side of [-1, 1]) {
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n
          const y = H - 10 - t * (H - 40)
          const len = (W * 0.47) * Math.pow(Math.sin(Math.PI * Math.min(1, 0.08 + t * 0.95)), 0.6) * (0.86 + hash(i * 3.1 + side * 7) * 0.2)
          const fwd = 34 + (1 - t) * 14 // how far the leaflet tip sits up the card
          const droop = 6 + hash(i + side) * 8
          const x0 = cx + side * 2, x1 = cx + side * len
          const yTip = y - fwd + droop
          const l = 24 + t * 10 + hash(i * 7 + side) * 9
          const gr = g.createLinearGradient(x0, y, x1, yTip)
          gr.addColorStop(0, `hsl(${92 + hash(i) * 10}, 42%, ${l - 4}%)`)
          gr.addColorStop(1, `hsl(${84 + hash(i * 2) * 14}, 40%, ${l + 10}%)`)
          g.fillStyle = gr
          g.beginPath()
          g.moveTo(x0, y + 3)
          g.quadraticCurveTo(cx + side * len * 0.55, y - fwd * 0.35 + 3, x1, yTip)
          g.quadraticCurveTo(cx + side * len * 0.5, y - fwd * 0.4 - 4, x0, y - 3)
          g.closePath(); g.fill()
          g.strokeStyle = 'rgba(200,225,140,0.35)'; g.lineWidth = 1
          g.beginPath(); g.moveTo(x0, y); g.quadraticCurveTo(cx + side * len * 0.55, y - fwd * 0.38, x1, yTip); g.stroke()
        }
      }
      g.strokeStyle = '#6f8a3a'; g.lineWidth = 6; g.beginPath(); g.moveTo(cx, H); g.lineTo(cx, 6); g.stroke()
    })
    return { map: T(col) }
  })
}

/** Broadleaf cluster: several overlapping leaves with veins and gaps, alpha cut. 512 x 512. */
export function leafClusterMap(kind) {
  return once('cluster' + kind, () => {
    const S = 512
    const cfg = {
      oak: { n: 17, rx: 38, ry: 66, h: [92, 118], s: 42, l: 22, lobed: true },
      ficus: { n: 14, rx: 40, ry: 74, h: [96, 128], s: 48, l: 24, lobed: false },
      shrub: { n: 24, rx: 26, ry: 44, h: [94, 126], s: 44, l: 22, lobed: false },
      boxwood: { n: 60, rx: 12, ry: 17, h: [96, 120], s: 50, l: 21, lobed: false },
    }[kind]
    const col = cv(S, S, (g) => {
      g.clearRect(0, 0, S, S)
      for (let k = 0; k < cfg.n; k++) {
        const a = hash(k * 5.3) * Math.PI * 2
        const dist = hash(k * 3.1) * (S * 0.3)
        const x = S / 2 + Math.cos(a) * dist, y = S / 2 + Math.sin(a) * dist
        const rot = hash(k * 7.7) * Math.PI * 2
        const sc = 0.75 + hash(k * 9.1) * 0.5
        const hue = cfg.h[0] + hash(k * 2.2) * (cfg.h[1] - cfg.h[0])
        const light = cfg.l + hash(k * 4.4) * 14
        g.save(); g.translate(x, y); g.rotate(rot); g.scale(sc, sc)
        const gr = g.createLinearGradient(0, cfg.ry, 0, -cfg.ry)
        gr.addColorStop(0, `hsl(${hue}, ${cfg.s}%, ${light - 5}%)`); gr.addColorStop(1, `hsl(${hue - 6}, ${cfg.s + 2}%, ${light + 9}%)`)
        g.fillStyle = gr
        g.beginPath()
        g.moveTo(0, cfg.ry)
        if (cfg.lobed) {
          for (let i = 0; i <= 6; i++) { const t = i / 6; const yy = cfg.ry - t * 2 * cfg.ry; const w = cfg.rx * Math.sin(Math.PI * t) * (0.8 + 0.25 * Math.sin(i * 2.7)); g.lineTo(w, yy) }
          for (let i = 6; i >= 0; i--) { const t = i / 6; const yy = cfg.ry - t * 2 * cfg.ry; const w = cfg.rx * Math.sin(Math.PI * t) * (0.8 + 0.25 * Math.sin(i * 2.7 + 1.3)); g.lineTo(-w, yy) }
        } else {
          g.bezierCurveTo(cfg.rx * 1.25, cfg.ry * 0.5, cfg.rx * 0.9, -cfg.ry * 0.6, 0, -cfg.ry)
          g.bezierCurveTo(-cfg.rx * 0.9, -cfg.ry * 0.6, -cfg.rx * 1.25, cfg.ry * 0.5, 0, cfg.ry)
        }
        g.closePath(); g.fill()
        g.strokeStyle = `hsla(${hue + 16}, 40%, ${light + 22}%, 0.55)`; g.lineWidth = 1.6
        g.beginPath(); g.moveTo(0, cfg.ry); g.lineTo(0, -cfg.ry * 0.9); g.stroke()
        for (let i = 1; i < 6; i++) { const yy = cfg.ry - i * (cfg.ry * 0.3); for (const s of [-1, 1]) { g.beginPath(); g.moveTo(0, yy); g.lineTo(s * cfg.rx * 0.7, yy - cfg.ry * 0.22); g.stroke() } }
        g.restore()
      }
    })
    return { map: T(col) }
  })
}

/** Grass blade patch (alpha cut) for lawn tufts: many tapered blades of varied height, lean and shade. 256 x 256. */
export function grassBladeMap() {
  return once('grass', () => {
    const W = 256, H = 256
    const col = cv(W, H, (g) => {
      g.clearRect(0, 0, W, H)
      for (let i = 0; i < 54; i++) {
        const x = 8 + hash(i * 1.7) * (W - 16)
        const top = 20 + hash(i * 3.3) * 150
        const lean = (hash(i * 5.1) - 0.5) * 70
        const bw = 3 + hash(i * 7.9) * 3.5
        const hue = 76 + hash(i * 2.9) * 34, l = 22 + hash(i * 4.1) * 18
        const gr = g.createLinearGradient(x, H, x + lean, top)
        gr.addColorStop(0, `hsl(${hue + 8}, 42%, ${l - 8}%)`); gr.addColorStop(1, `hsl(${hue - 4}, 52%, ${l + 14}%)`)
        g.fillStyle = gr
        g.beginPath(); g.moveTo(x - bw, H)
        g.quadraticCurveTo(x - bw * 0.4 + lean * 0.35, (H + top) / 2 + 12, x + lean, top)
        g.quadraticCurveTo(x + bw * 0.5 + lean * 0.35, (H + top) / 2 + 12, x + bw, H)
        g.closePath(); g.fill()
      }
    })
    return { map: T(col) }
  })
}

/** Seamless lawn: mown grass with blade noise, clover flecks and patches, plus normal map. 512 px per 2 m. */
export function lawnMaps() {
  return once('lawn', () => {
    const S = 512
    const n1 = noiseField(S, S, 6, 21), n2 = noiseField(S, S, 64, 22), n3 = noiseField(S, S, 24, 23)
    const hc = cv(S, S, () => {}), hx = hc.getContext('2d'), hi = hx.createImageData(S, S)
    const cc = cv(S, S, () => {}), cx = cc.getContext('2d'), ci = cx.createImageData(S, S)
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4
      const blade = n2[((y * 2) % S) * S + ((x * 3) % S)]
      const patch = n1[y * S + x]
      const hgt = 0.45 + (blade - 0.5) * 0.7 + (n3[y * S + x] - 0.5) * 0.3
      hi.data[i] = hi.data[i + 1] = hi.data[i + 2] = Math.max(0, Math.min(1, hgt)) * 255; hi.data[i + 3] = 255
      const dry = Math.max(0, patch - 0.58) * 1.6
      const l = 0.26 + blade * 0.2 + n3[y * S + x] * 0.1
      const r = (52 + l * 90 + dry * 60), g = (84 + l * 120 + dry * 20), b = (30 + l * 40)
      ci.data[i] = r * 0.8; ci.data[i + 1] = g * 0.85; ci.data[i + 2] = b * 0.8; ci.data[i + 3] = 255
    }
    hx.putImageData(hi, 0, 0); cx.putImageData(ci, 0, 0)
    return { map: T(cc, { repeat: true }), normal: T(normalFromHeight(hc, 2.0), { srgb: false, repeat: true }) }
  })
}

/** Bark mulch: chunky wood chips, dark brown, 512 px per metre-ish tile. */
export function mulchMaps() {
  return once('mulch', () => {
    const S = 512
    const hc = cv(S, S, (g) => { g.fillStyle = '#505050'; g.fillRect(0, 0, S, S) })
    const cc = cv(S, S, (g) => { g.fillStyle = '#3a2517'; g.fillRect(0, 0, S, S) })
    const hg = hc.getContext('2d'), cg = cc.getContext('2d')
    for (let i = 0; i < 2600; i++) {
      const x = hash(i * 1.3) * S, y = hash(i * 2.9) * S, a = hash(i * 4.7) * Math.PI, l = 10 + hash(i * 6.1) * 22, w = 3 + hash(i * 8.3) * 5
      const shade = 30 + hash(i * 9.9) * 36
      for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) {
        cg.save(); cg.translate(x + ox, y + oy); cg.rotate(a)
        cg.fillStyle = `rgb(${shade * 1.7 + 36},${shade * 1.1 + 22},${shade * 0.62 + 12})`
        cg.fillRect(-l / 2, -w / 2, l, w)
        cg.fillStyle = 'rgba(20,10,4,0.5)'; cg.fillRect(-l / 2, w / 2 - 1.2, l, 1.2)
        cg.restore()
        hg.save(); hg.translate(x + ox, y + oy); hg.rotate(a)
        hg.fillStyle = `rgb(${130 + hash(i) * 90},${130 + hash(i) * 90},${130 + hash(i) * 90})`; hg.fillRect(-l / 2, -w / 2, l, w)
        hg.restore()
      }
    }
    return { map: T(cc, { repeat: true }), normal: T(normalFromHeight(hc, 3.0), { srgb: false, repeat: true }) }
  })
}
