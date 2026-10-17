import * as THREE from 'three'
import { Builder, Frame, punch, metricUV } from '../../facade/kit.js'

// Modular apartment-building generator. Everything is assembled from reusable component functions
// (wall with real openings, window unit, slider door, balcony, entrance canopy, roof kit, ring course) and written
// into one merged geometry per material, so a whole building is about a dozen draw calls.
//
// Plan (all dimensions in metres; x runs west to east along the building, the front faces +z):
//
//   [ unit ][ unit ] [ core ] [ unit ][ unit ]      one storey, repeated `floors` times
//   --------------- corridor (north) ------------   rear windows + rear entrance at the core
//
// Walls are 0.35 m thick, so every window sits in a real reveal. The core holds the lobby and the stair well.

const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }
const NORMAL = { '+x': [1, 0], '-x': [-1, 0], '+z': [0, 1], '-z': [0, -1] }

export const APT = {
  T: 0.35, // outer wall
  PART: 0.2, // interior party / corridor wall
  UNIT_W: 9, // each apartment is 9 m wide ...
  CORE_W: 6, // ... the core (lobby + stairs) is 6 m
  CORRIDOR: 1.65,
  SLAB: 0.3,
}

/** Everything the React side needs to know about a building's plan, derived from the footprint. */
export function aptLayout(spec) {
  const { x0, z1, z0 } = spec
  const T = APT.T
  const floors = spec.floors ?? 3, floorH = spec.floorH ?? 3.0
  const xi0 = x0 + T
  const xs = [xi0, xi0 + APT.UNIT_W, xi0 + 2 * APT.UNIT_W, xi0 + 2 * APT.UNIT_W + APT.CORE_W, xi0 + 3 * APT.UNIT_W + APT.CORE_W, xi0 + 4 * APT.UNIT_W + APT.CORE_W]
  const x1 = xs[5] + T
  const zc0 = z0 + T, zc1 = zc0 + APT.CORRIDOR
  const zu0 = zc1 + APT.PART, zu1 = z1 - T
  const cx = (xs[2] + xs[3]) / 2
  const units = [
    { id: 0, x0: xs[0], x1: xs[1], mirror: false },
    { id: 1, x0: xs[1], x1: xs[2], mirror: false },
    { id: 2, x0: xs[3], x1: xs[4], mirror: true },
    { id: 3, x0: xs[4], x1: xs[5], mirror: true },
  ]
  // stair well sits at the north end of the core, beside the corridor (west column of the core)
  const well = { x0: xs[2] + 0.1, x1: xs[2] + 3.0, z0: zu0, z1: zu0 + 3.6 }
  return { ...spec, floors, floorH, x1, xi0, xs, zc0, zc1, zu0, zu1, cx, units, well, h: floors * floorH, D: zu1 - zu0 }
}

/** Unit-local (u east 0..9, v south 0..D) -> world, honouring mirroring. */
export const unitToWorld = (L, unit, u, v) => [unit.mirror ? unit.x1 - u : unit.x0 + u, L.zu0 + v]

/** Window / door openings of one unit on the front (south) wall, as [u0, u1, kind]. */
export const FRONT_OPENINGS = [[1.2, 3.8, 'slider'], [6.4, 8.2, 'window']]

export function buildApartmentShell(rawSpec) {
  const L = aptLayout(rawSpec)
  const { x0, x1, z0, z1, base, floors, floorH, h, seed = 1 } = L
  const T = APT.T
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0
  const B = new Builder()
  const sampleSet = new Set((L.sample || []).map((s) => `${s.floor}:${s.unit}`))
  const isSample = (floor, unit) => sampleSet.has(`${floor}:${unit}`)

  // ---------------- frames (one per face; '+z' is the front) ----------------
  const faces = ['+x', '-x', '+z', '-z']
  const fr = {}
  for (const f of faces) {
    const [nx, nz] = NORMAL[f]
    const ox = nx > 0 ? x1 : nx < 0 ? x0 : cx, oz = nz > 0 ? z1 : nz < 0 ? z0 : cz
    const along = nx !== 0 ? d : w
    const isMain = f === '+z' || f === '-z'
    fr[f] = { F: new Frame(B, ox, oz, nx, nz, base), half: (isMain ? along : along - 2 * T) / 2 }
  }
  const lxOf = (f, wx, wz) => fr[f].F.lx(wx, wz)
  const span = (f, wa, wb) => { // world interval on this face -> local [a, b]
    const a = f === '+z' || f === '-z' ? lxOf(f, wa, cz) : lxOf(f, cx, wa)
    const b = f === '+z' || f === '-z' ? lxOf(f, wb, cz) : lxOf(f, cx, wb)
    return a < b ? [a, b] : [b, a]
  }

  // ---------------- openings ----------------
  const holes = { '+x': [], '-x': [], '+z': [], '-z': [] }
  const windows = [] // {f, a, b, v0, v1, kind, floor, unit}
  const addOpening = (f, wa, wb, v0, v1, kind, floor, unit) => {
    const [a, b] = span(f, wa, wb)
    holes[f].push({ x0: a, x1: b, v0, v1 })
    windows.push({ f, a, b, v0, v1, kind, floor, unit })
  }
  for (let k = 0; k < floors; k++) {
    const v = k * floorH
    for (const u of L.units) {
      // front: balcony slider + bedroom window
      for (const [ua, ub, kind] of FRONT_OPENINGS) {
        const [wa] = unitToWorld(L, u, ua, 0), [wb] = unitToWorld(L, u, ub, 0)
        const lo = Math.min(wa, wb), hi = Math.max(wa, wb)
        if (kind === 'slider') addOpening('+z', lo, hi, v + 0.04, v + 2.3, 'slider', k, u.id)
        else addOpening('+z', lo, hi, v + 0.9, v + 2.4, 'window', k, u.id)
      }
      // rear: a small corridor-side window by each unit door
      const [dwx] = unitToWorld(L, u, 8.0, 0)
      addOpening('-z', dwx - 0.5, dwx + 0.5, v + 1.1, v + 2.3, 'window', k, u.id)
    }
    // core: tall stair windows, front and rear
    if (k > 0) addOpening('+z', L.cx - 1.3, L.cx + 1.3, v + 0.5, v + 2.5, 'window', k, -1)
    // end walls: kitchen window + living window for the two end units (z positions from the unit plan)
    for (const [f, u] of [['-x', L.units[0]], ['+x', L.units[3]]]) {
      addOpening(f, L.zu0 + 1.0, L.zu0 + 2.6, v + 0.9, v + 2.4, 'window', k, u.id)
      addOpening(f, L.zu0 + 6.2, L.zu0 + 7.8, v + 0.9, v + 2.4, 'window', k, u.id)
    }
  }
  // ground floor of the core: front door with side lights, rear door
  const doorHalf = 1.1, doorH = 2.5
  {
    const [a, b] = span('+z', L.cx - doorHalf - 0.9, L.cx + doorHalf + 0.9)
    holes['+z'].push({ x0: a, x1: b, v0: 0, v1: 3.0 })
    const [ra, rb] = span('-z', L.cx + 0.4, L.cx + 0.4 + doorHalf * 2)
    holes['-z'].push({ x0: ra, x1: rb, v0: 0, v1: doorH + 0.3 })
  }

  // ---------------- walls: brick at the foot and across the core, stucco above ----------------
  const bandV = floorH + 0.0 // brick up to the first floor line
  const clip = (hs, va, vb) => hs.map((q) => ({ x0: q.x0, x1: q.x1, v0: Math.max(q.v0, va), v1: Math.min(q.v1, vb) })).filter((q) => q.v1 > q.v0 + 1e-4)
  const coreWorld = [L.xs[2] - 0.1, L.xs[3] + 0.1]
  for (const f of faces) {
    const { F, half } = fr[f]
    const coreLocal = f === '+z' || f === '-z' ? span(f, coreWorld[0], coreWorld[1]) : null
    for (const [va, vb, defKey] of [[0, bandV, 'brick'], [bandV, h, 'render']]) {
      const ps = punch(-half, half, va, vb, clip(holes[f], va, vb))
      for (const p of ps) {
        // pieces straddling the core edges are split so the core can be brick over its full height
        const cuts = [p.x0]
        if (coreLocal) for (const c of coreLocal) if (c > p.x0 + 1e-3 && c < p.x1 - 1e-3) cuts.push(c)
        cuts.push(p.x1)
        cuts.sort((a, b) => a - b)
        for (let i = 0; i + 1 < cuts.length; i++) {
          const a = cuts[i], b = cuts[i + 1]
          const mid = (a + b) / 2
          const inCore = coreLocal && mid > coreLocal[0] && mid < coreLocal[1] && (f === '+z')
          const key = inCore ? 'brick' : defKey
          F.span(key, a, b, p.v0, p.v1, -T, 0)
          F.quad('plaster', mid, (p.v0 + p.v1) / 2, -T - 0.003, b - a, p.v1 - p.v0, { inward: true, metric: true })
        }
      }
    }
  }

  // ---------------- window units (recessed, framed, sills, lintels) ----------------
  const REC = 0.2
  for (const wn of windows) {
    const { f, a, b, v0, v1, kind } = wn
    const F = fr[f].F
    const ww = b - a, wh = v1 - v0, mid = (a + b) / 2
    const FW = 0.06
    const sample = wn.unit >= 0 && isSample(wn.floor, wn.unit)
    // frame: jambs, head, sill, glazing bars
    F.span('frame', a, a + FW, v0, v1, -REC - 0.05, -REC + 0.05)
    F.span('frame', b - FW, b, v0, v1, -REC - 0.05, -REC + 0.05)
    F.span('frame', a, b, v1 - FW, v1, -REC - 0.05, -REC + 0.05)
    F.span('frame', a, b, v0, v0 + FW, -REC - 0.05, -REC + 0.05)
    if (kind === 'slider') {
      F.span('frame', mid - 0.03, mid + 0.03, v0, v1, -REC - 0.07, -REC + 0.07) // meeting stile
      F.span('frame', mid + 0.1, mid + 0.13, v0 + 1.0, v0 + 1.35, -REC + 0.04, -REC + 0.1) // handle
    } else if (ww > 1.3) F.span('frame', mid - 0.025, mid + 0.025, v0, v1, -REC - 0.04, -REC + 0.04)
    if (kind === 'window' && wh > 1.0) F.span('frame', a, b, v0 + wh * 0.62 - 0.02, v0 + wh * 0.62 + 0.02, -REC - 0.04, -REC + 0.04) // transom light
    if (!(sample && kind === 'slider')) F.quad('glass', mid, (v0 + v1) / 2, -REC, ww - 0.02, wh - 0.02) // (sample units get a real door leaf + fixed pane from the React side)
    // what you glimpse through the glass of a closed-off unit: curtained rooms, some lit at night
    if (!sample && wn.unit >= 0) {
      const cell = Math.floor(hash(seed * 31 + wn.floor * 7 + wn.unit * 3 + Math.round(a)) * 4)
      const rr = hash(seed * 17 + wn.floor * 5 + wn.unit + Math.round(b * 3))
      const row = rr < 0.42 ? 0 : rr < 0.68 ? 1 : rr < 0.86 ? 2 : 3
      F.quad('glazing', mid, (v0 + v1) / 2, -T + 0.05, ww - 0.1, wh - 0.1, { uv: [cell / 4 + 0.004, 1 - (row / 4 + 0.25) + 0.004, cell / 4 + 0.246, 1 - row / 4 - 0.004] })
    }
    if (kind === 'window') {
      // sill (sloped look: two stacked boxes), lintel with a drip edge
      F.span('stone', a - 0.08, b + 0.08, v0 - 0.07, v0 + 0.01, -0.28, 0.1)
      F.span('stone', a - 0.08, b + 0.08, v0 - 0.1, v0 - 0.07, -0.3, 0.06)
      F.span('stone', a - 0.08, b + 0.08, v1 - 0.01, v1 + 0.15, -0.34, 0.04)
      const sh = 0.5 // rain streak below the sill
      F.quad('streak', mid, v0 - 0.1 - sh / 2, 0.006, ww + 0.1, sh)
    } else {
      F.span('stone', a - 0.08, b + 0.08, v1 - 0.01, v1 + 0.16, -0.34, 0.04) // slider lintel
      F.span('stone', a - 0.04, b + 0.04, v0 - 0.06, v0 + 0.0, -0.3, 0.08) // threshold
    }
  }

  // ---------------- entrance: frame, side lights, stone surround, canopy with a teal LED strip ----------------
  {
    const F = fr['+z'].F
    const c = lxOf('+z', L.cx, cz)
    const dH = doorH
    const hw = doorHalf + 0.9
    // door frame + transom + side lights (the leaves themselves are real swinging doors)
    F.span('frame', c - doorHalf - 0.06, c - doorHalf + 0.04, 0, dH, -REC - 0.06, -REC + 0.06)
    F.span('frame', c + doorHalf - 0.04, c + doorHalf + 0.06, 0, dH, -REC - 0.06, -REC + 0.06)
    F.span('frame', c - doorHalf, c + doorHalf, dH, dH + 0.07, -REC - 0.06, -REC + 0.06)
    F.span('frame', c - hw, c - hw + 0.06, 0, 3.0, -REC - 0.05, -REC + 0.05)
    F.span('frame', c + hw - 0.06, c + hw, 0, 3.0, -REC - 0.05, -REC + 0.05)
    F.span('frame', c - hw, c + hw, 2.94, 3.0, -REC - 0.05, -REC + 0.05)
    for (const s of [-1, 1]) {
      const sa = s < 0 ? c - hw + 0.06 : c + doorHalf + 0.06, sb = s < 0 ? c - doorHalf - 0.06 : c + hw - 0.06
      F.quad('glass', (sa + sb) / 2, 1.5, -REC, sb - sa, 2.9)
      F.span('frame', (sa + sb) / 2 - 0.02, (sa + sb) / 2 + 0.02, 0.1, 2.9, -REC - 0.03, -REC + 0.03)
    }
    F.quad('glass', c, (dH + 0.07 + 2.94) / 2, -REC, doorHalf * 2, 2.94 - dH - 0.07)
    // stone surround + threshold + two steps up from the courtyard walk (sit 0.15 above the pavement)
    F.span('stone', c - hw - 0.16, c - hw, 0, 3.4, -0.34, 0.1)
    F.span('stone', c + hw, c + hw + 0.16, 0, 3.4, -0.34, 0.1)
    F.span('stone', c - hw - 0.16, c + hw + 0.16, 3.0, 3.4, -0.34, 0.1)
    // canopy: thin concrete plate on two steel hangers, LED strip along the soffit edge
    F.span('concrete', c - 2.6, c + 2.6, 3.45, 3.62, 0, 1.9)
    F.span('stone', c - 2.6, c + 2.6, 3.62, 3.66, 0, 1.9)
    F.span('concrete', c - 2.6, c + 2.6, 2.85, 3.45, 1.76, 1.9) // fascia board that carries the building name
    F.span('accentStrip', c - 2.5, c + 2.5, 3.43, 3.46, 1.82, 1.86)
    for (const s of [-1, 1]) F.span('rail', c + s * 2.45 - 0.02, c + s * 2.45 + 0.02, 3.62, 4.4, 0.04, 0.08)
    // wall lamps either side + house number plaque
    for (const s of [-1, 1]) F.span('sconce', c + s * (hw + 0.5) - 0.08, c + s * (hw + 0.5) + 0.08, 2.2, 2.5, 0.0, 0.1)
  }
  // rear entrance canopy
  {
    const F = fr['-z'].F
    const c = lxOf('-z', L.cx + 0.4 + doorHalf, cz)
    F.span('frame', c - doorHalf - 0.05, c - doorHalf + 0.05, 0, doorH, -REC - 0.05, -REC + 0.05)
    F.span('frame', c + doorHalf - 0.05, c + doorHalf + 0.05, 0, doorH, -REC - 0.05, -REC + 0.05)
    F.span('frame', c - doorHalf, c + doorHalf, doorH, doorH + 0.08, -REC - 0.05, -REC + 0.05)
    F.quad('glass', c, doorH + 0.15 + 0.07, -REC, doorHalf * 2, 0.14)
    F.span('concrete', c - 1.6, c + 1.6, doorH + 0.35, doorH + 0.5, 0, 1.2)
    F.span('sconce', c - 1.4, c - 1.25, doorH + 0.05, doorH + 0.3, 0.0, 0.1)
  }

  // ---------------- balconies (front) and patios (ground) ----------------
  const balconies = []
  for (let k = 0; k < floors; k++) {
    for (const u of L.units) {
      const [wa] = unitToWorld(L, u, 0.7, 0), [wb] = unitToWorld(L, u, 4.7, 0)
      const lo = Math.min(wa, wb), hi = Math.max(wa, wb)
      const [a, b] = span('+z', lo, hi)
      const F = fr['+z'].F
      const v = k * floorH, dep = k === 0 ? 1.8 : 1.6
      if (k === 0) {
        // ground-floor patio: paved slab flush with the sill, low planter wall along the front
        F.span('concrete', a, b, 0.0, 0.05, 0, dep)
        F.span('stone', a, b, 0.0, 0.5, dep - 0.2, dep)
      } else {
        F.span('concrete', a, b, v - 0.22, v - 0.02, 0, dep) // slab
        F.span('stone', a - 0.02, b + 0.02, v - 0.1, v + 0.1, dep - 0.08, dep + 0.02) // thicker front fascia
        F.span('concrete', a, b, v - 0.02, v + 0.0, 0, dep) // thin top finish plane (separates from the room floor)
        // steel balustrade: top rail, bottom rail, posts, balusters (three sides)
        const rt = v + 1.05
        const side = (x0l, x1l, z0l, z1l) => {
          F.span('rail', x0l, x1l, rt - 0.04, rt, z0l, z1l) // top rail
          F.span('rail', x0l, x1l, v + 0.06, v + 0.1, z0l, z1l) // bottom rail
        }
        side(a + 0.02, b - 0.02, dep - 0.06, dep - 0.02)
        side(a + 0.02, a + 0.06, 0.06, dep - 0.02)
        side(b - 0.06, b - 0.02, 0.06, dep - 0.02)
        const nb = Math.round((b - a) / 0.12)
        for (let i = 1; i < nb; i++) { const x = a + ((b - a) * i) / nb; F.span('rail', x - 0.01, x + 0.01, v + 0.1, rt - 0.04, dep - 0.05, dep - 0.03) }
        const nd = Math.round(dep / 0.12)
        for (let i = 1; i < nd; i++) { const z = (dep * i) / nd; F.span('rail', a + 0.03, a + 0.05, v + 0.1, rt - 0.04, z - 0.01, z + 0.01); F.span('rail', b - 0.05, b - 0.03, v + 0.1, rt - 0.04, z - 0.01, z + 0.01) }
        for (const x of [a + 0.04, (a + b) / 2, b - 0.04]) F.span('rail', x - 0.025, x + 0.025, v, rt, dep - 0.075, dep - 0.015) // front posts
        F.span('rail', a + 0.02, a + 0.06, v, rt, 0.04, 0.08)
        F.span('rail', b - 0.06, b - 0.02, v, rt, 0.04, 0.08)
        // soffit light (night)
        F.span('sconce', (a + b) / 2 - 0.1, (a + b) / 2 + 0.1, v - 0.26, v - 0.22, dep * 0.5 - 0.1, dep * 0.5 + 0.1)
        balconies.push({ floor: k, unit: u.id, a, b, dep, v })
      }
    }
  }

  // ---------------- horizontal bands and rings ----------------
  const ring = (key, v0, v1, outset, th, skipFront = null) => {
    const X0 = x0 - outset, X1 = x1 + outset, Z0 = z0 - outset, Z1 = z1 + outset
    const mid = base + (v0 + v1) / 2, hh = v1 - v0
    B.box(key, cx, mid, Z0 + th / 2, X1 - X0, hh, th)
    if (skipFront) { B.box(key, (X0 + skipFront[0]) / 2, mid, Z1 - th / 2, skipFront[0] - X0, hh, th); B.box(key, (skipFront[1] + X1) / 2, mid, Z1 - th / 2, X1 - skipFront[1], hh, th) }
    else B.box(key, cx, mid, Z1 - th / 2, X1 - X0, hh, th)
    B.box(key, X0 + th / 2, mid, cz, th, hh, Z1 - Z0 - 2 * th)
    B.box(key, X1 - th / 2, mid, cz, th, hh, Z1 - Z0 - 2 * th)
  }
  ring('granite', 0, 0.55, 0.05, T + 0.05, [L.cx - doorHalf - 1.1, L.cx + doorHalf + 1.1])
  for (let k = 1; k < floors; k++) ring('stone', k * floorH - 0.12, k * floorH + 0.1, 0.05, 0.14, k === 1 ? null : null)
  const PAR = 0.95
  ring('render', h, h + PAR, 0, 0.3)
  ring('stone', h + PAR, h + PAR + 0.1, 0.06, 0.42)
  ring('stone', h - 0.3, h - 0.05, 0.1, 0.2) // eaves cornice

  // ---------------- roof kit ----------------
  B.quad('roof', cx, base + h + 0.02, cz, w - 0.6, d - 0.6, 0, { up: true, metric: true })
  const roofY = base + h
  const unit = (ux, uz, uw, ud, uh, key = 'galv') => { B.box('steel', ux, roofY + uh / 2 + 0.2, uz, uw, uh, ud); B.box(key, ux, roofY + uh + 0.24, uz, uw + 0.06, 0.08, ud + 0.06); B.box('concrete', ux, roofY + 0.1, uz, uw + 0.4, 0.2, ud + 0.4) }
  // heat-pump condensers and a vent stack row (all clear of the parapet)
  for (let i = 0; i < 6; i++) unit(L.xi0 + 5 + i * 6.2, z0 + d * 0.62 + (i % 2) * 0.5, 1.5, 1.0, 1.0)
  // stair bulkhead over the stair well, with a service door
  {
    const sx0 = L.well.x0 - 0.2, sx1 = L.well.x1 + 0.2, sz0 = L.well.z0 - 0.2, sz1 = L.well.z1 + 0.2
    B.box('render', (sx0 + sx1) / 2, roofY + 1.35, (sz0 + sz1) / 2, sx1 - sx0, 2.7, sz1 - sz0)
    B.box('stone', (sx0 + sx1) / 2, roofY + 2.78, (sz0 + sz1) / 2, sx1 - sx0 + 0.3, 0.16, sz1 - sz0 + 0.3)
    B.box('frame', (sx0 + sx1) / 2, roofY + 1.05, sz1 + 0.01, 1.0, 2.1, 0.06) // service door (south side)
    B.box('rail', (sx0 + sx1) / 2 + 0.35, roofY + 1.05, sz1 + 0.05, 0.05, 0.05, 0.05)
  }
  // roof hatch rails, vent pipes, antenna mast
  for (let i = 0; i < 5; i++) { const g = new THREE.CylinderGeometry(0.06, 0.06, 0.9, 10); metricUV(g, 0, 0, 0); g.translate(L.xi0 + 3 + i * 7.4, roofY + 0.5, z0 + 3.2); B.add('galv', g) }
  { const g = new THREE.CylinderGeometry(0.03, 0.04, 4, 8); g.translate(x1 - 4, roofY + 2.0, z1 - 3); B.add('galv', g) }
  // elevated water tank on a steel stand (cylinder + legs)
  {
    const tx = x0 + 6.5, tz = z0 + 4.2
    const g = new THREE.CylinderGeometry(1.0, 1.0, 1.8, 20); metricUV(g, 0, 0, 0); g.translate(tx, roofY + 2.9, tz); B.add('steel', g)
    for (const [dx, dz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) B.box('rail', tx + dx, roofY + 1.0, tz + dz, 0.1, 2.0, 0.1)
    B.box('rail', tx, roofY + 2.0, tz, 1.7, 0.08, 1.7)
    const cap = new THREE.ConeGeometry(1.05, 0.4, 20); cap.translate(tx, roofY + 4.0, tz); metricUV(cap, 0, 0, 0); B.add('steel', cap)
  }

  // ---------------- downpipes with brackets (front corners and either side of the core) ----------------
  for (const xw of [x0 + 0.6, x1 - 0.6, L.xs[2] - 0.3, L.xs[3] + 0.3]) {
    B.box('steel', xw, base + (h - 0.4) / 2, z1 + 0.05, 0.1, h - 0.4, 0.1)
    for (let k = 0; k <= floors; k++) B.box('rail', xw, base + 0.4 + k * (h / floors) * 0.9, z1 + 0.05, 0.14, 0.04, 0.14)
  }
  // wear: grime at the foot of the walls
  for (const f of faces) { const { F, half } = fr[f]; F.quad('grime', 0, 0.95, 0.008, half * 2, 0.9) }

  return { geos: B.merged(), layout: L, windows, balconies }
}
