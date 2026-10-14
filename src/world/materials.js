import * as THREE from 'three'
import { MARBLE, NEON } from '../config/theme.js'

// Procedural, tileable textures generated at startup: black marble, wet asphalt, tower windows.

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

function makeAsphalt(size) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const n = fbm(x / size * 16, y / size * 16, 16, 3)
    const grain = hash(x, y, size) * 0.25
    const v = 10 + n * 18 + grain * 14
    const i = (y * size + x) * 4
    img.data[i] = v; img.data[i + 1] = v * 0.95; img.data[i + 2] = v * 1.15; img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 8
  // roughness variation = puddles
  const rc = document.createElement('canvas')
  rc.width = rc.height = size
  const rctx = rc.getContext('2d')
  const rimg = rctx.createImageData(size, size)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const n = fbm(x / size * 4 + 9, y / size * 4 + 3, 4, 4)
    const puddle = n > 0.55 ? 0.12 : 0.55
    const v = puddle * 255
    const i = (y * size + x) * 4
    rimg.data[i] = v; rimg.data[i + 1] = v; rimg.data[i + 2] = v; rimg.data[i + 3] = 255
  }
  rctx.putImageData(rimg, 0, 0)
  const rough = new THREE.CanvasTexture(rc)
  rough.wrapS = rough.wrapT = THREE.RepeatWrapping
  return { map: tex, rough }
}

function makeWindows(seed, palette) {
  const w = 256, h = 512
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)
  const cols = 8, rows = 24
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const rnd = hash(c + seed * 13, r + seed * 7, 9999)
    if (rnd < 0.62) continue
    const col = palette[Math.floor(hash(c * 3 + seed, r * 5, 9999) * palette.length)]
    ctx.globalAlpha = 0.35 + rnd * 0.6
    ctx.fillStyle = col
    ctx.fillRect(c * (w / cols) + 6, r * (h / rows) + 5, w / cols - 12, h / rows - 9)
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

let cache
export function getMaterials() {
  if (cache) return cache
  const marbleTex = makeMarble(512, { base: MARBLE.base, vein: MARBLE.vein, gold: MARBLE.gold, tint: NEON.purple })
  const marbleFloorTex = makeMarble(512, { base: '#07060b', vein: '#8a82a0', gold: MARBLE.gold, scale: 3, veinSharp: 18 })
  const asphalt = makeAsphalt(256)
  const windowPalettes = [
    ['#ffe9b0', '#ffd27a', NEON.teal],
    [NEON.purple, '#c9a8ff', '#ffe9b0'],
    [NEON.pink, '#ffd1ea', '#ffe9b0'],
  ]

  const mk = (tex, repeat, opts) => {
    const t = tex.clone()
    t.repeat.set(repeat[0], repeat[1])
    t.needsUpdate = true
    return new THREE.MeshStandardMaterial({ map: t, ...opts })
  }

  cache = {
    marbleTex,
    marbleFloorTex,
    marbleWall: (rx = 1, ry = 1) => mk(marbleTex, [rx, ry], { roughness: 0.22, metalness: 0.15, envMapIntensity: 1 }),
    marbleFloor: (rx = 1, ry = 1) => mk(marbleFloorTex, [rx, ry], { roughness: 0.16, metalness: 0.15, envMapIntensity: 0.7 }),
    sidewalk: (rx, ry) => mk(marbleTex, [rx, ry], { roughness: 0.35, metalness: 0.05, envMapIntensity: 0.7, color: '#d6d0e6' }),
    road: (rx, ry) => {
      const m = asphalt.map.clone(); m.repeat.set(rx, ry); m.needsUpdate = true
      const r = asphalt.rough.clone(); r.repeat.set(rx / 4, ry / 4); r.needsUpdate = true
      return new THREE.MeshStandardMaterial({ map: m, roughnessMap: r, roughness: 1, metalness: 0.3, envMapIntensity: 1.2 })
    },
    windows: (seed, rx, ry) => {
      const t = makeWindows(seed, windowPalettes[seed % 3])
      t.repeat.set(rx, ry)
      return new THREE.MeshStandardMaterial({ color: '#0b0a12', roughness: 0.25, metalness: 0.6, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 1.1 })
    },
    neon: (color, intensity = 3) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, toneMapped: false }),
    glass: new THREE.MeshStandardMaterial({ color: '#1a1530', roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.45, envMapIntensity: 1.5 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#c8c2d8', roughness: 0.15, metalness: 1 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: '#16131f', roughness: 0.35, metalness: 0.8 }),
  }
  return cache
}
