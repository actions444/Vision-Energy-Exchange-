import * as THREE from 'three'
import { nightLit } from '../state/environment.js'

// Procedural, tileable PBR textures generated at startup (no image downloads): marble, asphalt,
// concrete, pavers, brick, limestone, grass, soil, wood, carpet, tile, plaster, fabric, glass curtain walls.

function hash(x, y, p) {
  x = ((x % p) + p) % p
  y = ((y % p) + p) % p
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}
function vnoise(x, y, p) {
  const xi = Math.floor(x), yi = Math.floor(y)
  const xf = x - xi, yf = y - yi
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi, p), b = hash(xi + 1, yi, p), c = hash(xi, yi + 1, p), d = hash(xi + 1, yi + 1, p)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
function fbm(x, y, p, oct = 5) {
  let s = 0, amp = 0.5, f = 1
  for (let i = 0; i < oct; i++) { s += vnoise(x * f, y * f, p * f) * amp; amp *= 0.5; f *= 2 }
  return s
}

const hexToRgb = (h) => { const c = new THREE.Color(h); return [c.r * 255, c.g * 255, c.b * 255] }

function makeMarble(size, { base, vein, gold, scale = 4, veinSharp = 14, tint = null }) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(size, size)
  const B = hexToRgb(base), V = hexToRgb(vein), G = hexToRgb(gold), T = tint ? hexToRgb(tint) : null
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size
      const n = fbm(u * scale, v * scale, scale)
      const n2 = fbm(u * scale * 2 + 5.2, v * scale * 2 + 1.3, scale * 2, 4)
      const s1 = Math.sin(Math.PI * 2 * (u * 2 + v) + n * 9)
      const s2 = Math.sin(Math.PI * 2 * (u - v * 3) + n2 * 7)
      const vein1 = Math.pow(1 - Math.abs(s1), veinSharp)
      const vein2 = Math.pow(1 - Math.abs(s2), veinSharp * 2.5) * 0.6
      const cloud = (n - 0.5) * 0.25
      let r = B[0] * (1 + cloud), g = B[1] * (1 + cloud), b = B[2] * (1 + cloud)
      r += (V[0] - r) * vein1 * 0.7 + (G[0] - r) * vein2
      g += (V[1] - g) * vein1 * 0.7 + (G[1] - g) * vein2
      b += (V[2] - b) * vein1 * 0.7 + (G[2] - b) * vein2
      if (T) { const t = Math.max(0, n2 - 0.55) * 0.6; r += (T[0] - r) * t; g += (T[1] - g) * t; b += (T[2] - b) * t }
      const i = (y * size + x) * 4
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 8
  return tex
}

// ---------- realistic surface textures (canvas, generated once) ----------
function canvas(size, draw) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  draw(ctx, size)
  return c
}
// low-frequency mottling: tiny random canvas scaled up with smoothing
function mottle(ctx, size, cells, alpha, light = '#ffffff', dark = '#000000', seed = 1) {
  const m = document.createElement('canvas')
  m.width = m.height = cells
  const mc = m.getContext('2d')
  for (let y = 0; y < cells; y++) for (let x = 0; x < cells; x++) {
    const h = hash(x, y + seed * 31, cells)
    mc.fillStyle = h > 0.5 ? light : dark
    mc.globalAlpha = Math.abs(h - 0.5) * 2
    mc.fillRect(x, y, 1, 1)
  }
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.imageSmoothingEnabled = true
  // draw 3x3 so the scaled noise tiles seamlessly
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) ctx.drawImage(m, i * size, j * size, size, size)
  ctx.restore()
}
function grain(ctx, size, amount, seed = 1) {
  const img = ctx.getImageData(0, 0, size, size)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (hash(i >> 2, seed, 99991) - 0.5) * amount
    d[i] += n; d[i + 1] += n; d[i + 2] += n
  }
  ctx.putImageData(img, 0, 0)
}
function toTex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 8
  return t
}

const TEX = {
  asphalt: () => toTex(canvas(512, (ctx, s) => {
    ctx.fillStyle = '#3a3b3e'; ctx.fillRect(0, 0, s, s)
    mottle(ctx, s, 16, 0.18, '#55565a', '#202124', 2)
    grain(ctx, s, 46, 3)
    ctx.strokeStyle = 'rgba(15,15,17,0.55)'; ctx.lineWidth = 1.2
    for (let i = 0; i < 5; i++) { ctx.beginPath(); let x = hash(i, 1, 97) * s, y = hash(i, 2, 97) * s; ctx.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (hash(i, k + 3, 97) - 0.5) * 60; y += (hash(i, k + 9, 97) - 0.5) * 60; ctx.lineTo(x, y) } ctx.stroke() }
  })),
  asphaltRough: () => toTex(canvas(256, (ctx, s) => {
    ctx.fillStyle = '#d8d8d8'; ctx.fillRect(0, 0, s, s)
    mottle(ctx, s, 6, 0.55, '#ffffff', '#5a5a5a', 7)
  }), false),
  concrete: () => toTex(canvas(512, (ctx, s) => {
    ctx.fillStyle = '#a9a69f'; ctx.fillRect(0, 0, s, s)
    mottle(ctx, s, 12, 0.14, '#d2cfc8', '#8f8c86', 5)
    grain(ctx, s, 22, 4)
    ctx.strokeStyle = 'rgba(70,68,64,0.55)'; ctx.lineWidth = 3
    ctx.strokeRect(1.5, 1.5, s - 3, s - 3)
    ctx.beginPath(); ctx.moveTo(s / 2, 0); ctx.lineTo(s / 2, s); ctx.stroke()
  })),
  pavers: () => toTex(canvas(512, (ctx, s) => {
    ctx.fillStyle = '#6d665d'; ctx.fillRect(0, 0, s, s)
    const w = 64, h = 32
    for (let y = 0; y < s / h; y++) for (let x = -1; x < s / w + 1; x++) {
      const off = y % 2 ? w / 2 : 0
      const v = hash(x + 50, y, 977)
      ctx.fillStyle = `hsl(${30 + v * 12}, ${10 + v * 10}%, ${52 + v * 14}%)`
      ctx.fillRect(x * w + off + 2, y * h + 2, w - 4, h - 4)
    }
    grain(ctx, s, 18, 8)
  })),
  brick: () => toTex(canvas(512, (ctx, s) => {
    ctx.fillStyle = '#b4aa9c'; ctx.fillRect(0, 0, s, s)
    const w = 64, h = 21.33
    for (let y = 0; y < 24; y++) for (let x = -1; x < 9; x++) {
      const off = y % 2 ? w / 2 : 0
      const v = hash(x + 10, y + 3, 977)
      ctx.fillStyle = `hsl(${8 + v * 14}, ${38 + v * 18}%, ${30 + v * 14}%)`
      ctx.fillRect(x * w + off + 2, y * h + 2, w - 4, h - 3.5)
    }
    grain(ctx, s, 26, 9)
  })),
  limestone: () => toTex(canvas(512, (ctx, s) => {
    ctx.fillStyle = '#bdb19b'; ctx.fillRect(0, 0, s, s)
    mottle(ctx, s, 10, 0.16, '#cfc5b0', '#9c907a', 11)
    grain(ctx, s, 16, 12)
    ctx.strokeStyle = 'rgba(120,110,95,0.6)'; ctx.lineWidth = 2
    for (let y = 0; y <= s; y += s / 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s, y); ctx.stroke() }
    for (let r = 0; r < 4; r++) for (let x = 0; x <= s; x += s / 2) { const xx = x + (r % 2 ? s / 4 : 0); ctx.beginPath(); ctx.moveTo(xx, r * s / 4); ctx.lineTo(xx, (r + 1) * s / 4); ctx.stroke() }
  })),
  grass: () => toTex(canvas(512, (ctx, s) => {
    // lawn: three scales of colour variation (worn/dry patches, lush patches), then layered blades
    // with dark bases and sunlit tips, and a sprinkle of clover. Tiles seamlessly.
    ctx.fillStyle = '#466628'; ctx.fillRect(0, 0, s, s)
    mottle(ctx, s, 4, 0.22, '#7d9444', '#2b4519', 31)
    mottle(ctx, s, 14, 0.3, '#6f8f3f', '#2f4a1e', 13)
    mottle(ctx, s, 40, 0.18, '#86a34c', '#33521f', 37)
    const blade = (i, len, light) => {
      const x = hash(i, 1, 99991) * s, y = hash(i, 2, 99991) * s, v = hash(i, 3, 99991)
      const bend = (hash(i, 4, 99991) - 0.5) * 4
      ctx.strokeStyle = `hsl(${80 + v * 26}, ${38 + v * 22}%, ${light + v * 16}%)`
      ctx.lineWidth = 0.8 + v * 0.8
      for (const ox of [0, -s, s]) for (const oy of [0, -s, s]) {
        if (x + ox < -8 || x + ox > s + 8 || y + oy < -8 || y + oy > s + 8) continue
        ctx.beginPath(); ctx.moveTo(x + ox, y + oy); ctx.quadraticCurveTo(x + ox + bend * 0.3, y + oy - len * 0.6, x + ox + bend, y + oy - len); ctx.stroke()
      }
    }
    for (let i = 0; i < 9000; i++) blade(i, 3 + hash(i, 5, 977) * 3, 14)
    for (let i = 9000; i < 20000; i++) blade(i, 4 + hash(i, 5, 977) * 5, 24)
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = hash(i, 8, 991) > 0.7 ? 'rgba(240,240,225,0.7)' : 'rgba(60,110,40,0.7)'
      ctx.beginPath(); ctx.arc(hash(i, 6, 991) * s, hash(i, 7, 991) * s, 1.2 + hash(i, 9, 991) * 1.4, 0, Math.PI * 2); ctx.fill()
    }
    grain(ctx, s, 14, 33)
  })),
  soil: () => toTex(canvas(256, (ctx, s) => {
    ctx.fillStyle = '#3b2a1e'; ctx.fillRect(0, 0, s, s)
    mottle(ctx, s, 10, 0.3, '#5a412c', '#1f150e', 15)
    for (let i = 0; i < 1400; i++) { ctx.fillStyle = `rgba(${90 + hash(i, 4, 999) * 60},${60 + hash(i, 5, 999) * 40},35,0.6)`; ctx.fillRect(hash(i, 1, 999) * s, hash(i, 2, 999) * s, 2 + hash(i, 3, 999) * 4, 1.5) }
  })),
  wood: () => toTex(canvas(512, (ctx, s) => {
    const planks = 6
    for (let p = 0; p < planks; p++) {
      const v = hash(p, 7, 97)
      ctx.fillStyle = `hsl(${26 + v * 8}, ${38 + v * 12}%, ${34 + v * 12}%)`
      ctx.fillRect(0, (p * s) / planks, s, s / planks)
      for (let g = 0; g < 26; g++) {
        ctx.strokeStyle = `rgba(40,22,10,${0.08 + hash(p, g, 97) * 0.12})`
        ctx.lineWidth = 1 + hash(g, p, 97) * 1.5
        const y = (p * s) / planks + hash(g, p + 9, 97) * (s / planks)
        ctx.beginPath(); ctx.moveTo(0, y)
        for (let x = 0; x <= s; x += 32) ctx.lineTo(x, y + Math.sin(x / 40 + g) * 2)
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(25,14,6,0.6)'
      ctx.fillRect(0, ((p + 1) * s) / planks - 2, s, 2)
    }
  })),
  carpet: () => toTex(canvas(256, (ctx, s) => {
    ctx.fillStyle = '#7d7d7d'; ctx.fillRect(0, 0, s, s)
    grain(ctx, s, 60, 17)
  })),
  tile: () => toTex(canvas(512, (ctx, s) => {
    ctx.fillStyle = '#9d988f'; ctx.fillRect(0, 0, s, s)
    const n = 4, w = s / n
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = hash(x, y, 97)
      ctx.fillStyle = `hsl(36, 10%, ${84 + v * 6}%)`
      ctx.fillRect(x * w + 2, y * w + 2, w - 4, w - 4)
    }
    grain(ctx, s, 10, 19)
  })),
  plaster: () => toTex(canvas(256, (ctx, s) => {
    ctx.fillStyle = '#d8d3ca'; ctx.fillRect(0, 0, s, s)
    mottle(ctx, s, 8, 0.06, '#e6e2da', '#b9b3a8', 21)
    grain(ctx, s, 8, 22)
  })),
  fabric: () => toTex(canvas(128, (ctx, s) => {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, s, s)
    for (let y = 0; y < s; y += 2) { ctx.fillStyle = `rgba(0,0,0,${0.04 + (y % 4 ? 0.03 : 0)})`; ctx.fillRect(0, y, s, 1) }
    grain(ctx, s, 20, 23)
  })),
  curtain: (seed) => {
    // glass curtain wall: 4x4 panes per tile, aluminium mullions; separate night window map
    const color = canvas(256, (ctx, s) => {
      const g = ctx.createLinearGradient(0, 0, 0, s)
      g.addColorStop(0, '#5d6f80'); g.addColorStop(1, '#2f3c49')
      ctx.fillStyle = g; ctx.fillRect(0, 0, s, s)
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { ctx.fillStyle = `rgba(255,255,255,${hash(x + seed, y, 97) * 0.06})`; ctx.fillRect(x * 64 + 3, y * 64 + 3, 58, 58) }
      ctx.fillStyle = '#8f969c'
      for (let i = 0; i <= 4; i++) { ctx.fillRect(i * 64 - 2, 0, 4, s); ctx.fillRect(0, i * 64 - 2, s, 5) }
    })
    const lit = canvas(256, (ctx, s) => {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, s, s)
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
        const v = hash(x + seed * 7, y + seed * 3, 9973)
        if (v < 0.45) continue
        ctx.fillStyle = v > 0.85 ? '#cfe4ff' : '#ffe2b0'
        ctx.globalAlpha = 0.45 + v * 0.5
        ctx.fillRect(x * 64 + 4, y * 64 + 6, 56, 52)
      }
      ctx.globalAlpha = 1
    })
    return { map: toTex(color), emissive: toTex(lit) }
  },
}

const texCache = new Map()
function tex(name, ...args) {
  const key = name + args.join(',')
  if (!texCache.has(key)) texCache.set(key, TEX[name](...args))
  return texCache.get(key)
}
const matCache = new Map()
function repeated(t, rx, ry) {
  const c = t.clone()
  c.repeat.set(rx, ry)
  c.needsUpdate = true
  return c
}
/**
 * Cached PBR material for a named surface, with texture repeat (rx, ry) in tiles.
 * Kinds: asphalt, concrete, pavers, brick, limestone, grass, soil, wood, carpet, tile, plaster, fabric.
 */
export function surface(kind, rx = 1, ry = 1, opts = {}) {
  const key = `${kind}|${rx.toFixed(2)}|${ry.toFixed(2)}|${JSON.stringify(opts)}`
  if (matCache.has(key)) return matCache.get(key)
  const P = {
    asphalt: { roughness: 0.92, metalness: 0 },
    concrete: { roughness: 0.85 },
    pavers: { roughness: 0.8 },
    brick: { roughness: 0.88 },
    limestone: { roughness: 0.7 },
    grass: { roughness: 0.95 },
    soil: { roughness: 1 },
    wood: { roughness: 0.55 },
    carpet: { roughness: 1 },
    tile: { roughness: 0.25 },
    plaster: { roughness: 0.9 },
    fabric: { roughness: 0.95 },
  }[kind]
  const m = new THREE.MeshStandardMaterial({ map: repeated(tex(kind), rx, ry), ...P, ...opts })
  if (kind === 'asphalt') m.roughnessMap = repeated(tex('asphaltRough'), rx / 3, ry / 3)
  matCache.set(key, m)
  return m
}

/**
 * Polished black marble with fine veins that glow faintly in a brand accent colour
 * (purple, pink, teal or gold). The veins are an emissive map, so they read as subtly
 * illuminated in low light without lighting the room.
 */
const blackMarbleCache = new Map()
export function blackMarble(accent = '#c9a96a', rx = 2, ry = 2) {
  const key = accent + '|' + rx + '|' + ry
  if (blackMarbleCache.has(key)) return blackMarbleCache.get(key)
  const size = 512
  const base = makeMarble(size, { base: '#0b0b0e', vein: '#3a3842', gold: accent, scale: 3, veinSharp: 26 })
  // emissive: only the brightest accent veins
  const c = document.createElement('canvas')
  c.width = c.height = size
  const src = base.image.getContext('2d').getImageData(0, 0, size, size)
  const out = c.getContext('2d').createImageData(size, size)
  const A = hexToRgb(accent)
  for (let i = 0; i < src.data.length; i += 4) {
    const l = (src.data[i] + src.data[i + 1] + src.data[i + 2]) / 3
    const k = Math.max(0, Math.min(1, (l - 34) / 50)) ** 1.5
    out.data[i] = A[0] * k; out.data[i + 1] = A[1] * k; out.data[i + 2] = A[2] * k; out.data[i + 3] = 255
  }
  c.getContext('2d').putImageData(out, 0, 0)
  const em = new THREE.CanvasTexture(c)
  em.colorSpace = THREE.SRGBColorSpace
  em.wrapS = em.wrapT = THREE.RepeatWrapping
  for (const t of [base, em]) t.repeat.set(rx, ry)
  const m = new THREE.MeshPhysicalMaterial({ map: base, emissive: '#ffffff', emissiveMap: em, emissiveIntensity: 0.55, roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1 })
  blackMarbleCache.set(key, m)
  return m
}

let cache
export function getMaterials() {
  if (cache) return cache
  // white Carrara marble (gallery) and polished grey stone floors
  const marbleTex = makeMarble(512, { base: '#dcd8d0', vein: '#aaa59d', gold: '#c9c2b6', scale: 3, veinSharp: 30 })
  const marbleFloorTex = makeMarble(512, { base: '#b9b6b1', vein: '#6d6a67', gold: '#d8d4cc', scale: 3, veinSharp: 18 })

  const mk = (t, repeat, opts) => new THREE.MeshStandardMaterial({ map: repeated(t, repeat[0], repeat[1]), ...opts })
  const curtainMats = new Map()
  // every factory below is cached by its arguments so identical surfaces share one material
  // (shared materials are what lets static batching merge meshes into a few draw calls)
  const memo = new Map()
  const once = (key, make) => { if (!memo.has(key)) memo.set(key, make()); return memo.get(key) }

  cache = {
    marbleTex,
    marbleFloorTex,
    marbleWall: (rx = 1, ry = 1) => once(`mw${rx}|${ry}`, () => mk(marbleTex, [rx, ry], { roughness: 0.25, metalness: 0, envMapIntensity: 0.8 })),
    marbleFloor: (rx = 1, ry = 1) => once(`mf${rx}|${ry}`, () => mk(marbleFloorTex, [rx, ry], { roughness: 0.18, metalness: 0, envMapIntensity: 0.9 })),
    sidewalk: (rx, ry) => surface('concrete', rx, ry),
    road: (rx, ry) => surface('asphalt', rx, ry),
    /** glass curtain wall; windows light up at night */
    windows: (seed, rx, ry) => {
      const key = `${seed % 4}|${rx}|${ry}`
      if (curtainMats.has(key)) return curtainMats.get(key)
      const t = tex('curtain', seed % 4)
      const m = new THREE.MeshStandardMaterial({ map: repeated(t.map, rx, ry), emissive: '#ffffff', emissiveMap: repeated(t.emissive, rx, ry), roughness: 0.08, metalness: 0.75, envMapIntensity: 1.2 })
      nightLit(m, 1.1, 0)
      curtainMats.set(key, m)
      return m
    },
    neon: (color, intensity = 3) => once(`neon${color}|${intensity}`, () => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, toneMapped: false })),
    glass: new THREE.MeshStandardMaterial({ color: '#4c5a66', roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.38, envMapIntensity: 1.4 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#d4d6da', roughness: 0.15, metalness: 1 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: '#2a2c30', roughness: 0.4, metalness: 0.8 }),
    aluminum: new THREE.MeshStandardMaterial({ color: '#a7abb0', roughness: 0.35, metalness: 0.9 }),
    blackSteel: new THREE.MeshStandardMaterial({ color: '#17181b', roughness: 0.5, metalness: 0.7 }),
    water: new THREE.MeshStandardMaterial({ color: '#3d6f84', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.82, envMapIntensity: 1.5 }),
    leather: (color = '#3b2a20') => once('leather' + color, () => new THREE.MeshStandardMaterial({ color, roughness: 0.55 })),
    fabric: (color = '#5b6470') => once('fabric' + color, () => new THREE.MeshStandardMaterial({ color, map: tex('fabric'), roughness: 0.95 })),
    shared: once,
  }
  return cache
}
