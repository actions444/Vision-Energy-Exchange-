import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Facade kit: builds a renovated building shell as a few merged geometries (one per material).
// Walls are made from brick pieces AROUND real openings (so windows have 0.2 m reveals), with
// stone sills and lintels, bronze frames, pilasters, string course, cornice, parapet and coping.
// Everything is axis-aligned in world space with world-metre UVs, so the textures in
// facade/materials.js line up across pieces and walls.

const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }

/** UV in metres from the world position of each vertex (box faces pick their two in-plane axes). */
export function metricUV(g, cx = 0, cy = 0, cz = 0) {
  const p = g.attributes.position, n = g.attributes.normal
  const uv = new Float32Array(p.count * 2)
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + cx, y = p.getY(i) + cy, z = p.getZ(i) + cz
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i))
    if (ax >= ay && ax >= az) { uv[i * 2] = z; uv[i * 2 + 1] = y }
    else if (az >= ay) { uv[i * 2] = x; uv[i * 2 + 1] = y }
    else { uv[i * 2] = x; uv[i * 2 + 1] = z }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
}

export class Builder {
  constructor() { this.parts = {} }
  add(key, g) { (this.parts[key] ||= []).push(g) }
  box(key, cx, cy, cz, sx, sy, sz) {
    if (sx < 1e-4 || sy < 1e-4 || sz < 1e-4) return
    const g = new THREE.BoxGeometry(sx, sy, sz)
    metricUV(g, cx, cy, cz)
    g.translate(cx, cy, cz)
    this.add(key, g)
  }
  /** a flat quad; `ry` rotates about Y (normal +z -> (sin ry, 0, cos ry)); `up` makes a horizontal quad facing +y */
  quad(key, cx, cy, cz, w, h, ry, { up = false, metric = false, uv = null } = {}) {
    const g = new THREE.PlaneGeometry(w, h)
    if (up) g.rotateX(-Math.PI / 2); else g.rotateY(ry)
    if (metric) metricUV(g, cx, cy, cz)
    if (uv) { // [u0, v0, u1, v1]
      const a = g.attributes.uv
      for (let i = 0; i < a.count; i++) a.setXY(i, uv[0] + a.getX(i) * (uv[2] - uv[0]), uv[1] + a.getY(i) * (uv[3] - uv[1]))
    }
    g.translate(cx, cy, cz)
    this.add(key, g)
  }
  merged() {
    const out = {}
    for (const [k, list] of Object.entries(this.parts)) {
      const m = mergeGeometries(list, false)
      list.forEach((g) => g.dispose())
      if (m) { m.computeBoundingSphere(); out[k] = m }
    }
    return out
  }
}

/** A wall's local frame: origin on the outer face centre, `n` = outward, local x along the wall, v up from `base`. */
export class Frame {
  constructor(B, ox, oz, nx, nz, base) {
    this.B = B; this.ox = ox; this.oz = oz; this.nx = nx; this.nz = nz; this.base = base
    this.tx = -nz; this.tz = nx
    this.ry = Math.atan2(nx, nz)
  }
  /** local x of a world position along this wall */
  lx(wx, wz) { return (wx - this.ox) * this.tx + (wz - this.oz) * this.tz }
  pos(lx, lv, lz) { return [this.ox + this.tx * lx + this.nx * lz, this.base + lv, this.oz + this.tz * lx + this.nz * lz] }
  box(key, lx, lv, lz, w, h, dep) {
    const [x, y, z] = this.pos(lx, lv, lz)
    this.B.box(key, x, y, z, Math.abs(this.tx) * w + Math.abs(this.nx) * dep, h, Math.abs(this.tz) * w + Math.abs(this.nz) * dep)
  }
  /** box spanning local x0..x1, v0..v1, z0..z1 */
  span(key, x0, x1, v0, v1, z0, z1) { this.box(key, (x0 + x1) / 2, (v0 + v1) / 2, (z0 + z1) / 2, x1 - x0, v1 - v0, z1 - z0) }
  quad(key, lx, lv, lz, w, h, { inward = false, metric = false, uv = null } = {}) {
    const [x, y, z] = this.pos(lx, lv, lz)
    this.B.quad(key, x, y, z, w, h, inward ? this.ry + Math.PI : this.ry, { metric, uv })
  }
}

/** Slice a wall rectangle (x0..x1, v0..v1) around rectangular holes into solid pieces. */
export function punch(x0, x1, v0, v1, holes) {
  const vs = new Set([v0, v1])
  holes.forEach((h) => { vs.add(h.v0); vs.add(h.v1) })
  const arr = [...vs].sort((a, b) => a - b)
  let pieces = []
  for (let i = 0; i < arr.length - 1; i++) {
    const va = arr[i], vb = arr[i + 1]
    if (vb - va < 1e-4) continue
    const hs = holes.filter((h) => h.v0 <= va + 1e-6 && h.v1 >= vb - 1e-6).sort((a, b) => a.x0 - b.x0)
    let x = x0
    for (const h of hs) { if (h.x0 > x + 1e-4) pieces.push({ x0: x, x1: h.x0, v0: va, v1: vb }); x = Math.max(x, h.x1) }
    if (x1 > x + 1e-4) pieces.push({ x0: x, x1, v0: va, v1: vb })
  }
  // merge vertically stacked pieces with identical extents
  pieces.sort((a, b) => a.x0 - b.x0 || a.x1 - b.x1 || a.v0 - b.v0)
  const out = []
  for (const p of pieces) {
    const l = out[out.length - 1]
    if (l && Math.abs(l.x0 - p.x0) < 1e-4 && Math.abs(l.x1 - p.x1) < 1e-4 && Math.abs(l.v1 - p.v0) < 1e-4) l.v1 = p.v1
    else out.push({ ...p })
  }
  return out
}


/** Evenly spaced bays across [a, b] with a pier at both ends. */
export function bays(a, b, pw, target) {
  const L = b - a
  if (L < pw + 1.2) return []
  const n = Math.max(1, Math.round((L - pw) / (target + pw)))
  const bw = (L - (n + 1) * pw) / n
  return Array.from({ length: n }, (_, i) => [a + pw + i * (bw + pw), a + pw + i * (bw + pw) + bw])
}

const NORMAL = { '+x': [1, 0], '-x': [-1, 0], '+z': [0, 1], '-z': [0, -1] }
const OPPOSITE = { '+x': '-x', '-x': '+x', '+z': '-z', '-z': '+z' }
export const FACING_YAW = { '+x': Math.PI / 2, '-x': -Math.PI / 2, '+z': 0, '-z': Math.PI }

/**
 * Build a renovated shell.
 * spec: {
 *   x0, x1, z0, z1, h, ih, facing: '+x'|'-x'|'+z'|'-z', base, seed,
 *   wall: 'brick'|'stone'|'concrete'|'render', trim: 'stone'|'granite'..., (material keys, see facade/materials.js)
 *   door: { at, half, h },                 // front door; `at` = world coordinate along the front wall (default: centred)
 *   groundWindows: true | false | [{ at, half, v0, v1 }],   // front shopfront windows (true = automatic bays)
 *   openings: { '+x': [{ at, half, v0?, v1?, door? }], ... },   // extra ground openings on other faces
 *   upper: true | false | ['+x', ...],     // storeys above `ih` get punched windows (default true, all faces)
 *   sillV, headV, pilasters, parapet
 * }
 */
export function buildShell(spec) {
  const { x0, x1, z0, z1, h, ih, facing, base, seed = 1 } = spec
  const T = spec.T ?? 0.4
  const wallKey = ({ stone: 'stoneWall' })[spec.wall] || spec.wall || 'brick'
  const trimKey = spec.trim || 'stone'
  const SILL = spec.sillV ?? 0.7, HEAD = spec.headV ?? 3.6
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
  const w = x1 - x0, d = z1 - z0
  const B = new Builder()
  const front = facing, rear = OPPOSITE[facing]
  const onX = front === '+x' || front === '-x'
  const faces = ['+x', '-x', '+z', '-z']
  const frames = {}
  for (const f of faces) {
    const [nx, nz] = NORMAL[f]
    const ox = nx > 0 ? x1 : nx < 0 ? x0 : cx, oz = nz > 0 ? z1 : nz < 0 ? z0 : cz
    const along = nx !== 0 ? d : w // wall length along its own axis
    const isMain = f === front || f === rear
    frames[f] = { fr: new Frame(B, ox, oz, nx, nz, base), half: (isMain ? along : along - 2 * T) / 2, full: along / 2 }
  }
  const PW = 0.8
  const FIX = spec.floorH // real storey height (windows line up with the slabs)
  const nFloors = FIX ? Math.max(0, Math.round((h - ih) / FIX)) : h - ih > 2.2 ? Math.max(1, Math.round((h - ih) / 3.1)) : 0
  const fh = nFloors ? (h - ih) / nFloors : 0
  const upperRows = Array.from({ length: nFloors }, (_, k) => {
    const v0 = ih + k * fh + (FIX ? 0.9 : Math.min(0.62, fh * 0.2))
    return [v0, v0 + (FIX ? Math.min(spec.upperH ?? 2.0, fh - 1.9) : Math.min(1.8, fh * 0.55))]
  })
  const upperOn = (f) => spec.upper === false ? false : Array.isArray(spec.upper) ? spec.upper.includes(f) : true

  const holes = { '+x': [], '-x': [], '+z': [], '-z': [] }
  const windows = []
  const addWin = (f, a, b, v0, v1, extra = {}) => {
    holes[f].push({ x0: a, x1: b, v0, v1 })
    windows.push({ f, fr: frames[f].fr, x0: a, x1: b, v0, v1, ...extra })
  }
  const lxOf = (f, at) => (f === '+x' || f === '-x' ? frames[f].fr.lx(cx, at) : frames[f].fr.lx(at, cz))

  // ---- front: door, shopfront ----
  const F = frames[front]
  const hasDoor = spec.door !== null
  const dh = spec.door?.half ?? 1.0, dH = spec.door?.h ?? 2.4
  const doorC = spec.door?.at != null ? lxOf(front, spec.door.at) : 0
  const doorTop = dH + 0.7
  if (hasDoor) holes[front].push({ x0: doorC - dh, x1: doorC + dh, v0: 0, v1: doorTop })
  const frontBays = []
  if (spec.groundWindows === false) { /* blank ground floor */ }
  else if (Array.isArray(spec.groundWindows)) {
    for (const g of spec.groundWindows) { const c = lxOf(front, g.at); frontBays.push([c - g.half, c + g.half, g.v0 ?? SILL, g.v1 ?? HEAD]) }
  } else {
    const sides = hasDoor ? [[-F.half, doorC - dh], [doorC + dh, F.half]] : [[-F.half, F.half]]
    for (const [a, b] of sides) for (const [p, q] of bays(a, b, PW, 3.0)) frontBays.push([p, q, SILL, HEAD])
  }
  frontBays.forEach(([a, b, v0, v1], i) => addWin(front, a, b, v0, v1, { upper: false, mull: Math.max(0, Math.round((b - a) / 1.7) - 1), transom: v1 - v0 > 2.5 ? v1 - 0.65 : null, key: i }))

  // ---- other ground openings ----
  for (const f of faces) {
    for (const o of spec.openings?.[f] || []) {
      const fr = frames[f].fr
      const c = lxOf(f, o.at)
      const v0 = o.door ? 0 : (o.v0 ?? SILL), v1 = o.v1 ?? (o.door ? 3.0 : HEAD)
      if (o.door) {
        holes[f].push({ x0: c - o.half, x1: c + o.half, v0, v1 })
        windows.push({ f, fr, x0: c - o.half, x1: c + o.half, v0, v1, doorway: true, key: 900 })
      } else addWin(f, c - o.half, c + o.half, v0, v1, { upper: false, mull: Math.max(0, Math.round((o.half * 2) / 1.7) - 1), transom: v1 - v0 > 2.5 ? v1 - 0.65 : null, key: 500 + Math.round(o.at) })
    }
  }

  // ---- upper floors ----
  if (nFloors) {
    for (const f of faces) {
      if (!upperOn(f)) continue
      let cols
      if (f === front && frontBays.length && !FIX) {
        cols = frontBays.map(([a, b]) => [a, b])
        if (hasDoor && (spec.groundWindows === true || spec.groundWindows === undefined)) cols.push([doorC - 0.85, doorC + 0.85])
      } else cols = bays(-frames[f].half, frames[f].half, PW, spec.upperW ?? (f === front ? 3.0 : 3.2))
      const sc = f === front && hasDoor ? spec.signClear : 0 // keep the first row clear of the entrance sign
      upperRows.forEach(([v0, v1], r) => cols.forEach(([a, b], i) => {
        if (sc && r === 0 && b > doorC - sc && a < doorC + sc) return
        addWin(f, a, b, v0, v1, { upper: true, mull: b - a > 2 ? 1 : 0, key: r * 20 + i + faces.indexOf(f) * 100 })
      }))
    }
  }

  // ---- wall pieces + inner plaster on the ground floor ----
  for (const f of faces) {
    const { fr, half } = frames[f]
    const ps = punch(-half, half, 0, h, holes[f])
    for (const p of ps) {
      fr.span(wallKey, p.x0, p.x1, p.v0, p.v1, -T, 0)
      const gv1 = Math.min(p.v1, spec.plasterAll ? h : ih)
      if (gv1 > p.v0 + 1e-3) fr.quad(spec.inner || 'plaster', (p.x0 + p.x1) / 2, (p.v0 + gv1) / 2, -T - 0.003, p.x1 - p.x0, gv1 - p.v0, { inward: true, metric: true })
    }
  }

  // ---- window units ----
  const REC = 0.2 // glass sits this far behind the outer face
  for (const wn of windows) {
    const { fr, x0: a, x1: b, v0, v1 } = wn
    const ww = b - a, wh = v1 - v0, mid = (a + b) / 2
    if (wn.doorway) { fr.span(trimKey, a - 0.1, b + 0.1, v1 - 0.004, v1 + 0.2, -0.4, 0.05); continue }
    const FW = 0.065
    fr.span('bronze', a, a + FW, v0, v1, -REC - 0.05, -REC + 0.05)
    fr.span('bronze', b - FW, b, v0, v1, -REC - 0.05, -REC + 0.05)
    fr.span('bronze', a, b, v1 - FW, v1, -REC - 0.05, -REC + 0.05)
    fr.span('bronze', a, b, v0, v0 + FW + (wn.upper ? 0 : 0.1), -REC - 0.05, -REC + 0.05)
    for (let k = 1; k <= (wn.mull || 0); k++) { const mx = a + (ww * k) / ((wn.mull || 0) + 1); fr.span('bronze', mx - 0.03, mx + 0.03, v0, v1, -REC - 0.04, -REC + 0.04) }
    if (wn.transom) fr.span('bronze', a, b, wn.transom - 0.03, wn.transom + 0.03, -REC - 0.04, -REC + 0.04)
    fr.quad('glass', mid, (v0 + v1) / 2, -REC, ww - 0.02, wh - 0.02)
    fr.span(trimKey, a - 0.1, b + 0.1, v0 - 0.08, v0 + 0.004, -0.32, 0.1)
    fr.span(trimKey, a - 0.1, b + 0.1, v0 - 0.1, v0 - 0.08, -0.32, 0.06)
    fr.span(trimKey, a - 0.1, b + 0.1, v1 - 0.004, v1 + (wn.upper ? 0.16 : 0.22), -0.4, 0.05)
    const sh = Math.min(0.55, v0 - 0.1 - (wn.upper ? ih + 0.3 : 0.5))
    if (sh > 0.08) fr.quad('streak', mid, v0 - 0.1 - sh / 2, 0.006, ww + 0.1, sh)
    if (wn.upper || spec.groundGlazing) {
      const cell = Math.floor(hash(seed * 31 + wn.key * 7 + 3) * 4), rr = hash(seed * 17 + wn.key * 5 + 1)
      const row = rr < 0.42 ? 0 : rr < 0.68 ? 1 : rr < 0.86 ? 2 : 3
      const u0 = cell / 4, v0u = row / 4
      fr.quad('glazing', mid, (v0 + v1) / 2, -T + 0.04, ww - 0.1, wh - 0.1, { uv: [u0 + 0.004, 1 - (v0u + 0.25) + 0.004, u0 + 0.246, 1 - v0u - 0.004] })
    }
  }
  // transom over the front door
  if (hasDoor) {
    const fr = F.fr, a = doorC - dh, b = doorC + dh, v0 = dH + 0.08, v1 = doorTop
    fr.span('bronze', a, b, dH, dH + 0.08, -REC - 0.05, -REC + 0.05)
    fr.span('bronze', a, a + 0.05, dH, v1, -REC - 0.05, -REC + 0.05)
    fr.span('bronze', b - 0.05, b, dH, v1, -REC - 0.05, -REC + 0.05)
    fr.span('bronze', a, b, v1 - 0.05, v1, -REC - 0.05, -REC + 0.05)
    fr.span('bronze', doorC - 0.03, doorC + 0.03, v0, v1, -REC - 0.04, -REC + 0.04)
    fr.quad('glass', doorC, (v0 + v1) / 2, -REC, b - a - 0.02, v1 - v0 - 0.02)
    fr.span(trimKey, a - 0.1, b + 0.1, v1 - 0.004, v1 + 0.2, -0.4, 0.05)
  }

  // ---- pilasters: centred in the gaps between openings ----
  if (spec.pilasters !== false) {
    for (const f of faces) {
      const { fr, half } = frames[f]
      const xs = holes[f].map((o) => [o.x0, o.x1]).sort((p, q) => p[0] - q[0])
      const merged = []
      for (const r of xs) { const l = merged[merged.length - 1]; if (l && r[0] <= l[1] + 0.05) l[1] = Math.max(l[1], r[1]); else merged.push([...r]) }
      const edges = [-half, ...merged.flat(), half]
      for (let i = 0; i + 1 < edges.length; i += 2) {
        const a = edges[i], b = edges[i + 1]
        if (b - a < 0.9) continue
        const n = b - a > 6 ? Math.floor((b - a) / 3.5) : 1
        for (let k = 0; k < n; k++) {
          const px = n === 1 ? (a + b) / 2 : a + ((b - a) * (k + 0.5)) / n
          const pwid = Math.min(0.5, b - a - 0.3)
          fr.span(wallKey, px - pwid / 2, px + pwid / 2, 0.5, h - 0.3, 0, 0.15)
        }
      }
    }
  }

  // ---- rings: plinth, string course, cornice, parapet ----
  const ring = (key, v0, v1, outset, th, gap = null) => {
    const X0 = x0 - outset, X1 = x1 + outset, Z0 = z0 - outset, Z1 = z1 + outset
    const mid = base + (v0 + v1) / 2, hh = v1 - v0
    const main = (f, gapSpec) => {
      const [nx, nz] = NORMAL[f]
      if (onX) {
        const xo = nx > 0 ? X1 : X0, xc = xo - (nx * th) / 2
        if (!gapSpec) B.box(key, xc, mid, cz, th, hh, Z1 - Z0)
        else {
          B.box(key, xc, mid, (Z0 + gapSpec[0]) / 2, th, hh, gapSpec[0] - Z0)
          B.box(key, xc, mid, (gapSpec[1] + Z1) / 2, th, hh, Z1 - gapSpec[1])
        }
      } else {
        const zo = nz > 0 ? Z1 : Z0, zc = zo - (nz * th) / 2
        if (!gapSpec) B.box(key, cx, mid, zc, X1 - X0, hh, th)
        else {
          B.box(key, (X0 + gapSpec[0]) / 2, mid, zc, gapSpec[0] - X0, hh, th)
          B.box(key, (gapSpec[1] + X1) / 2, mid, zc, X1 - gapSpec[1], hh, th)
        }
      }
    }
    main(front, gap)
    main(rear, null)
    if (onX) {
      const fxo = front === '+x' ? X1 : X0, bxo = rear === '+x' ? X1 : X0
      const lo = Math.min(fxo, bxo) + th, hi = Math.max(fxo, bxo) - th
      B.box(key, (lo + hi) / 2, mid, Z0 + th / 2, hi - lo, hh, th)
      B.box(key, (lo + hi) / 2, mid, Z1 - th / 2, hi - lo, hh, th)
    } else {
      const fzo = front === '+z' ? Z1 : Z0, bzo = rear === '+z' ? Z1 : Z0
      const lo = Math.min(fzo, bzo) + th, hi = Math.max(fzo, bzo) - th
      B.box(key, X0 + th / 2, mid, (lo + hi) / 2, th, hh, hi - lo)
      B.box(key, X1 - th / 2, mid, (lo + hi) / 2, th, hh, hi - lo)
    }
  }
  const doorGap = hasDoor ? (() => { const wc = onX ? cz + F.fr.tz * doorC : cx + F.fr.tx * doorC; return [wc - dh, wc + dh] })() : null
  ring('granite', 0, 0.5, 0.06, T + 0.06, doorGap)
  if (h - ih > 1.5) { ring(trimKey, ih - 0.08, ih + 0.22, 0.12, 0.2); ring(trimKey, ih + 0.22, ih + 0.3, 0.07, 0.15) }
  for (let k = 1; k < nFloors; k++) ring(trimKey, ih + k * fh - 0.1, ih + k * fh + 0.1, 0.08, 0.12) // floor-line courses
  ring(trimKey, h - 0.42, h - 0.1, 0.1, 0.22)
  ring(trimKey, h - 0.1, h, 0.18, 0.3)
  if (spec.parapet !== false) {
    const PAR = spec.parapetH ?? 0.95
    ring(wallKey, h, h + PAR, 0, 0.34)
    ring(trimKey, h + PAR, h + PAR + 0.09, 0.07, 0.48)
  }
  B.quad('roof', cx, base + h + 0.012, cz, w - 0.68, d - 0.68, 0, { up: true, metric: true })

  // ---- wear: grime at the foot of the walls, downpipes, rooftop plant ----
  for (const f of faces) {
    const { fr, half } = frames[f]
    const segs = f === front && hasDoor ? [[-half, doorC - dh], [doorC + dh, half]] : [[-half, half]]
    for (const [a, b] of segs) if (b - a > 0.5) fr.quad('grime', (a + b) / 2, 0.95, 0.008, b - a, 0.9)
  }
  ;[-1, 1].forEach((k) => F.fr.span('bronze', k * (F.full - 0.4) - 0.05, k * (F.full - 0.4) + 0.05, 0.1, h - 0.45, 0.16, 0.26))
  if (spec.parapet !== false) {
    const unit = (ux, uz, uw, ud, uh) => { B.box('steel', ux, base + h + uh / 2, uz, uw, uh, ud); B.box('bronze', ux, base + h + uh + 0.04, uz, uw + 0.1, 0.08, ud + 0.1) }
    unit(cx + w * 0.12, cz - d * 0.2, Math.min(3.2, w * 0.2), Math.min(2.0, d * 0.2), 1.5)
    unit(cx - w * 0.14, cz + d * 0.18, Math.min(2.6, w * 0.18), Math.min(1.8, d * 0.2), 1.3)
  }
  return { geos: B.merged(), layout: { frontBays, doorC, dh, dH, doorTop } }
}

/** A box with world-metre UVs, centred at (cx, cy, cz) in whatever space the mesh will sit in. */
export function boxGeo(sx, sy, sz, cx = 0, cy = 0, cz = 0) {
  const g = new THREE.BoxGeometry(sx, sy, sz)
  metricUV(g, cx, cy, cz)
  g.translate(cx, cy, cz)
  return g
}
