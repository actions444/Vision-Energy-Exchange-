import { CURB, LANDFILL } from '../../../config/westend.js'

// Landfill ground. One pure height function describes the whole compound (waste cells, capped mound, stockpiles, the leachate pond and the
// haul roads cut into it); the mesh, the physics trimesh, the road ribbons and every object placed on the ground all read that same function,
// so nothing floats or sinks. Pure JS (no three.js) so it can be checked in node: slopes, road gradients, spawn clearance.

export const TR = LANDFILL.terrain
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const lerp = (a, b, t) => a + (b - a) * t
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }
const vnoise = (x, z, seed) => { // smooth value noise in [0,1]
  const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi
  const a = hash(xi * 57 + zi * 131 + seed), b = hash((xi + 1) * 57 + zi * 131 + seed), c = hash(xi * 57 + (zi + 1) * 131 + seed), d = hash((xi + 1) * 57 + (zi + 1) * 131 + seed)
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz)
  return lerp(lerp(a, b, u), lerp(c, d, u), v)
}

/** Landforms: kind drives colour and the debris scattered on it. rx/rz are the footprint radii where the form reaches zero height. */
export const FORMS = [
  { id: 'cellA', kind: 'fresh', x: -374, z: 103, rx: 14, rz: 12, h: 4.6, flat: 0.12 },    // active waste cell, the tallest mound
  { id: 'cellB', kind: 'capped', x: -345, z: 97, rx: 11.5, rz: 15, h: 4.2, flat: 0.1 },     // closed cell under a grassed clay cap
  { id: 'soil', kind: 'soil', x: -355, z: 69, rx: 8.5, rz: 7.5, h: 2.6, flat: 0.15 },      // cover-soil stockpile
  { id: 'green', kind: 'green', x: -357, z: 110, rx: 7.5, rz: 6.5, h: 2.2, flat: 0.1 },   // chipped green waste
  { id: 'rubble', kind: 'rubble', x: -384, z: 70, rx: 7.5, rz: 6.5, h: 2.0, flat: 0.1 },  // broken concrete and brick
  { id: 'scrap', kind: 'scrap', x: -384.5, z: 80.5, rx: 6.5, rz: 5.5, h: 1.8, flat: 0.1 }, // baled and loose scrap metal
  { id: 'pondBerm', kind: 'soil', x: -334, z: 68, rx: 9, rz: 8, h: 1.4, flat: 0.5 }, // low earth berm round the leachate pond
]
export const POND = { x: -334, z: 68, r: 5.5, depth: 1.0 }
/** Haul roads (centre lines), width 6.4 m. */
export const ROAD_W = 6.4
export const ROADS = [
  { id: 'main', pts: [[-366, 57.5], [-366, 67], [-362, 76], [-361, 86], [-362, 92]] },
  { id: 'west', pts: [[-366, 66], [-376, 71], [-382, 76]] },
  { id: 'east', pts: [[-362, 76], [-352, 80], [-340, 80], [-331, 83], [-329, 93], [-330, 104], [-333, 110]] },
  // hammerhead turnarounds at the ends of the dead-end roads
  { id: 'hMain', flatTo: 'main', pts: [[-367.5, 92], [-356.5, 92]] },
  { id: 'hWest', flatTo: 'west', pts: [[-386, 73], [-379, 79]] },
  { id: 'hEast', flatTo: 'east', pts: [[-338, 110], [-327, 110]] },
]

const formH = (f, x, z) => {
  const dx = (x - f.x) / f.rx, dz = (z - f.z) / f.rz
  const r = Math.hypot(dx, dz)
  if (r >= 1) return 0
  // plateau mound: rises quickly then flattens; noise keeps it lumpy
  const t = 1 - smooth(f.flat, 1, r)
  const n = 0.9 + 0.2 * vnoise(x * 0.16, z * 0.16, f.x | 0)
  return f.h * t * lerp(1, n, smooth(0.05, 0.6, r))
}

/** height of the ground above the kerb level, before the roads are cut in */
export function baseHeight(x, z) {
  let h = 0
  for (const f of FORMS) h += formH(f, x, z)
  const pd = Math.hypot(x - POND.x, z - POND.z)
  if (pd < POND.r + 3) h -= POND.depth * (1 - smooth(POND.r - 1.5, POND.r + 2.2, pd))
  // fine undulation so flat ground is never dead flat
  h += (vnoise(x * 0.5, z * 0.5, 7) - 0.5) * 0.18 * smooth(0.5, 3, Math.abs(h) + 0.6)
  return h
}

// ---- roads: sample, smooth the grade and slope-limit it ------------------------------------------------------------
const roadSamples = (() => {
  const all = []
  for (const R of ROADS) {
    const pts = []
    for (let i = 0; i < R.pts.length - 1; i++) {
      const [ax, az] = R.pts[i], [bx, bz] = R.pts[i + 1]
      const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 1))
      for (let k = i === 0 ? 0 : 1; k <= n; k++) pts.push({ x: lerp(ax, bx, k / n), z: lerp(az, bz, k / n) })
    }
    if (R.flatTo) { // hammerhead turnaround: flat at the height where its parent road ends
      const parent = ROADS.find((q) => q.id === R.flatTo), hh = parent.samples.at(-1).h
      pts.forEach((p) => all.push({ x: p.x, z: p.z, h: hh, road: R.id }))
      R.samples = pts.map((p) => ({ x: p.x, z: p.z, h: hh }))
      continue
    }
    const base = pts.map((p) => baseHeight(p.x, p.z))
    let h = base.map((_, i) => { let s = 0, c = 0; for (let j = -7; j <= 7; j++) { const k = i + j; if (k >= 0 && k < base.length) { s += base[k]; c++ } } return s / c })
    h[0] = Math.min(h[0], 0)
    const MAX = 0.2 // 11 degrees
    // lower envelope of the smoothed ground: never above the land it crosses, never steeper than MAX
    for (let it = 0; it < 3; it++) {
      for (let i = 1; i < h.length; i++) h[i] = Math.min(h[i], h[i - 1] + MAX)
      for (let i = h.length - 2; i >= 0; i--) h[i] = Math.min(h[i], h[i + 1] + MAX)
    }
    pts.forEach((p, i) => all.push({ x: p.x, z: p.z, h: h[i], road: R.id }))
    R.samples = pts.map((p, i) => ({ x: p.x, z: p.z, h: h[i] }))
  }
  return all
})()

/** final ground height above the kerb level (0 at the fence) */
export function heightAt(x, z) {
  const edge = Math.min(smooth(0, 4, x - TR.x0), smooth(0, 4, TR.x1 - x), smooth(0, 4, z - TR.z0), smooth(0, 4, TR.z1 - z))
  let T = baseHeight(x, z)
  let best = 1e9, sw = 0, sh = 0
  for (const s of roadSamples) {
    const d2 = (s.x - x) * (s.x - x) + (s.z - z) * (s.z - z)
    if (d2 < best) best = d2
    if (d2 < 900) { const q = 1 / ((d2 + 3) * (d2 + 3)); sw += q; sh += q * s.h } // inverse-distance blend: no cliffs where two roads meet
  }
  const bh = sw > 0 ? sh / sw : 0
  const d = Math.sqrt(best)
  const bw = Math.max(5.3, Math.abs(T - bh) * 2.6) // the cut or fill batter is never steeper than ~21 degrees
  const w = smooth(ROAD_W / 2 + 0.3, ROAD_W / 2 + 0.3 + bw, d)
  return Math.max(0, lerp(bh, T, w)) * edge
}

/** terrain grid: positions (Float32Array xyz), indices (Uint32Array), vertex colours (Float32Array rgb), counts */
export function buildGrid(step = 1) {
  const nx = Math.round((TR.x1 - TR.x0) / step) + 1, nz = Math.round((TR.z1 - TR.z0) / step) + 1
  const pos = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2)
  const idx = new Uint32Array((nx - 1) * (nz - 1) * 6)
  const L = (v) => Math.pow(v / 255, 2.2) // vertex colours are linear; the hex values here are sRGB
  const C = (hex) => [L((hex >> 16) & 255), L((hex >> 8) & 255), L(hex & 255)]
  const cDirt = C(0x8d7b5f), cClay = C(0x7a6850), cGrass = C(0x6f7e49), cDark = C(0x4a423b), cSoil = C(0x927d5c)
  const forms = FORMS.map((f) => ({ ...f }))
  const kindCol = { fresh: C(0x4a4038), capped: cGrass, soil: cSoil, green: C(0x594530), rubble: C(0x8f8b84), scrap: C(0x6c5a4b) }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = TR.x0 + i * step, z = TR.z0 + j * step, v = j * nx + i
    const h = heightAt(x, z)
    pos[v * 3] = x; pos[v * 3 + 1] = CURB + h; pos[v * 3 + 2] = z
    uv[v * 2] = x; uv[v * 2 + 1] = z
    // colour: dirt base, then each landform's colour weighted by its footprint, slope darkening, noise
    let c = cDirt.slice()
    const nz1 = vnoise(x * 0.35, z * 0.35, 3), nz2 = vnoise(x * 1.7, z * 1.7, 9)
    c = c.map((q, k) => q * (0.86 + 0.28 * nz1) * (0.94 + 0.12 * nz2))
    for (const f of forms) {
      const r = Math.hypot((x - f.x) / f.rx, (z - f.z) / f.rz)
      if (r >= 1) continue
      let wgt = smooth(0.95, 0.55, r)
      let tc = kindCol[f.kind]
      if (f.kind === 'fresh') { // cover soil on the lower flanks, raw waste on the upper face and top
        const up = smooth(0.35, 0.7, h / f.h)
        tc = tc.map((q, k) => lerp(cClay[k], q, up))
        wgt = smooth(1, 0.35, r)
      }
      if (f.kind === 'capped') tc = tc.map((q, k) => q * (0.9 + 0.2 * vnoise(x * 0.8, z * 0.8, 21)))
      c = c.map((q, k) => lerp(q, tc[k], wgt))
    }
    const e = smooth(0, 1.5, Math.min(x - TR.x0, TR.x1 - x, z - TR.z0, TR.z1 - z))
    for (let k = 0; k < 3; k++) col[v * 3 + k] = c[k]
    void e
  }
  let t = 0
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1
    idx[t++] = a; idx[t++] = c; idx[t++] = b
    idx[t++] = b; idx[t++] = c; idx[t++] = d
  }
  return { pos, col, uv, idx, nx, nz }
}

/** steepest grade (degrees) found in the grid; used by the node check and the walk tests */
export function maxSlopeDeg(step = 1) {
  let m = 0, at = null
  for (let x = TR.x0; x < TR.x1; x += step) for (let z = TR.z0; z < TR.z1; z += step) {
    const h = heightAt(x, z), hx = heightAt(x + step, z), hz = heightAt(x, z + step)
    const s = Math.atan(Math.max(Math.abs(hx - h), Math.abs(hz - h)) / step) * 57.2958
    if (s > m) { m = s; at = [x, z] }
  }
  return { deg: m, at }
}

/** Debris for a landform: [{ x, z, y, kind, s, ry, color }] with y from the ground function. Deterministic. */
export function debrisFor(form, count) {
  const out = []
  const R = (i, k) => hash(i * 7.31 + k * 13.7 + (form.x | 0) * 0.17 + (form.z | 0) * 0.29)
  const palette = {
    fresh: [['bag', 0x9a9a92], ['bag', 0x9a9a92], ['bag', 0x7a7c78], ['bag', 0x7a7c78], ['bag', 0x1b1b1d], ['bag', 0x1b1b1d], ['bag', 0x2a2c2e], ['bag', 0x4a5a66], ['bag', 0x4d5a48], ['bag', 0x6e6150], ['box', 0x8a6f4c], ['box', 0x9a7d58], ['box', 0x7c6446], ['box', 0x6b563d], ['plank', 0x6a4e34], ['plank', 0x4e3a28], ['chunk', 0x5b5651], ['chunk', 0x48443f], ['sheet', 0x8e9192], ['sheet', 0x6f7273], ['bag', 0x8f8c80], ['bag', 0x34303a], ['bag', 0x3c3a36], ['chunk', 0x403c36], ['box', 0x7a6248], ['plank', 0x5a4632], ['bag', 0x2a2a28], ['bag', 0x55524a]],
    green: [['plank', 0x6b4a2f], ['plank', 0x84603c], ['chunk', 0x4a3a28], ['chunk', 0x3d4a2a]],
    rubble: [['chunk', 0x8e8a83], ['chunk', 0x9a9690], ['chunk', 0xa65a42], ['chunk', 0x74706a], ['plank', 0x464646]],
    scrap: [['sheet', 0xa9a49d], ['sheet', 0x8a5a3c], ['chunk', 0x5e5148], ['drum', 0x8c3a2a], ['plank', 0x6a6f74], ['sheet', 0xb9bdbf]],
    soil: [], capped: [],
  }[form.kind] || []
  if (!palette.length) return out
  for (let i = 0; i < count; i++) {
    const a = R(i, 1) * Math.PI * 2, r = Math.sqrt(R(i, 2)) * 0.92
    const x = form.x + Math.cos(a) * r * form.rx, z = form.z + Math.sin(a) * r * form.rz
    if (x < TR.x0 + 2 || x > TR.x1 - 2 || z < TR.z0 + 2 || z > TR.z1 - 2) continue
    // keep road surfaces clear
    let near = 1e9
    for (const s of roadSamples) near = Math.min(near, Math.hypot(s.x - x, s.z - z))
    if (near < ROAD_W / 2 + 0.2) continue
    const [kind, color] = palette[Math.floor(R(i, 3) * palette.length)]
    out.push({ x, z, y: CURB + heightAt(x, z), kind, color, s: 0.38 + R(i, 4) * 0.6, ry: R(i, 5) * 6.28, tilt: [(R(i, 6) - 0.5) * 0.8, (R(i, 7) - 0.5) * 0.8] })
  }
  return out
}
