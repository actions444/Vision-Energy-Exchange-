import * as THREE from 'three'
import { hash } from './tex.js'

// Procedural palm geometry. Each call builds one VARIANT of a species (curved, tapered trunk with leaf-scar bark,
// frond bases, and a crown of pinnate fronds made from individual narrow leaflets). Three detail levels:
//   LOD 0  real leaflet blades (opaque, clean shadows)   - used within ~22 m
//   LOD 1  alpha-cut comb ribbons per frond               - ~22-60 m
//   LOD 2  fewer fronds, fewer trunk rings                - beyond 60 m
// Geometry is written straight into typed arrays; one trunk geometry and one crown geometry per variant/LOD.

class Writer {
  constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; this.w = []; this.ph = []; this.i = [] }
  get count() { return this.p.length / 3 }
  v(px, py, pz, nx, ny, nz, u, v, c, w, ph) {
    this.p.push(px, py, pz); this.n.push(nx, ny, nz); this.uv.push(u, v)
    this.c.push(c[0], c[1], c[2]); this.w.push(w); this.ph.push(ph)
    return this.count - 1
  }
  tri(a, b, c) { this.i.push(a, b, c) }
  quad(a, b, c, d) { this.i.push(a, b, c, a, c, d) }
  build() {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3))
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2))
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3))
    g.setAttribute('aWind', new THREE.Float32BufferAttribute(this.w, 1))
    g.setAttribute('aPhase', new THREE.Float32BufferAttribute(this.ph, 1))
    g.setIndex(this.i)
    g.computeBoundingSphere(); g.computeBoundingBox()
    return g
  }
}

const SPECIES = {
  // Cocos nucifera: tall slender curved trunk, long drooping fronds, nut cluster
  coconut: {
    bark: 'coconut', H: [7.2, 10.4], r0: 0.2, r1: 0.125, flare: 0.5, bulge: 0.08, lean: [0.9, 2.4], sCurve: [0.2, 0.7],
    fronds: [17, 23], fLen: [3.9, 5.2], leafMax: [0.85, 1.15], leafW: 0.05, leafPerSide: 50,
    pitchTop: [1.05, 1.3], pitchBot: [-0.75, -0.2], curl: [0.9, 1.5], vfold: -0.14, beta: [0.95, 0.55], crownshaft: 0, boots: 9, nuts: [4, 8],
    hue: [0.0, 0.0], light: [0.9, 1.1],
  },
  // Roystonea: columnar pale trunk, swelling at one third, green crownshaft, upswept plumes
  royal: {
    bark: 'royal', H: [10.5, 14.5], r0: 0.3, r1: 0.2, flare: 0.35, bulge: 0.14, lean: [0.0, 0.5], sCurve: [0.0, 0.18],
    fronds: [13, 16], fLen: [3.8, 5.0], leafMax: [0.85, 1.1], leafW: 0.05, leafPerSide: 50,
    pitchTop: [1.2, 1.45], pitchBot: [-0.25, 0.25], curl: [0.55, 1.0], vfold: 0.3, beta: [1.0, 0.6], crownshaft: 1.5, boots: 0, nuts: [0, 0],
    hue: [0.0, 0.0], light: [0.7, 0.9],
  },
  // Areca / small clumping palm for pots and planters (single stem here, short)
  areca: {
    bark: 'coconut', H: [0.5, 0.85], r0: 0.02, r1: 0.016, flare: 0.1, bulge: 0.0, lean: [0.04, 0.14], sCurve: [0, 0.03],
    fronds: [13, 17], fLen: [1.0, 1.45], leafMax: [0.2, 0.28], leafW: 0.026, leafPerSide: 34,
    pitchTop: [1.0, 1.35], pitchBot: [0.0, 0.45], curl: [1.0, 1.6], vfold: 0.1, beta: [1.0, 0.65], crownshaft: 0.1, boots: 0, nuts: [0, 0],
    hue: [0, 0], light: [1, 1.15],
  },
}
export const PALM_SPECIES = Object.keys(SPECIES)

const lerp = (a, b, t) => a + (b - a) * t
const rr = (rng, [a, b]) => a + (b - a) * rng()
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)

function rngFor(seed) {
  let s = seed * 9301 + 49297
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
}

/** curved tapered trunk with bark UVs; returns { top, tangent, length, radiusTop } */
function addTrunk(W, sp, P, rng, lod) {
  const seg = lod === 0 ? 30 : lod === 1 ? 14 : 7
  const radial = lod === 0 ? 12 : lod === 1 ? 8 : 6
  const H = P.H
  const dirA = rng() * Math.PI * 2
  const lean = P.lean
  const perp = [-Math.sin(dirA), Math.cos(dirA)]
  const pts = [], tans = []
  for (let i = 0; i <= seg; i++) {
    const t = i / seg
    const off = lean * Math.pow(t, 1.7)
    const sc = P.sCurve * Math.sin(Math.PI * t * 1.35)
    pts.push(V(Math.cos(dirA) * off + perp[0] * sc, H * t, Math.sin(dirA) * off + perp[1] * sc))
  }
  for (let i = 0; i <= seg; i++) tans.push(pts[Math.min(seg, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize())
  const ref = V(1, 0, 0)
  const rows = []
  let s = 0
  for (let i = 0; i <= seg; i++) {
    if (i) s += pts[i].distanceTo(pts[i - 1])
    const t = i / seg
    const T = tans[i]
    const A = new THREE.Vector3().crossVectors(ref, T).normalize()
    const B = new THREE.Vector3().crossVectors(T, A).normalize()
    let r = lerp(P.r0, P.r1, Math.pow(t, 0.8))
    r *= 1 + sp.flare * Math.exp(-(t * H) / 0.55)
    r *= 1 + sp.bulge * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (sp.bark === 'royal' ? 1.4 : 0.6) * Math.exp(-Math.pow((t - 0.3) * 2.6, 2) * (sp.bark === 'royal' ? 0.5 : 1))
    r *= 1 + 0.025 * Math.sin(t * H * 4.7 + P.seed)
    rows.push({ p: pts[i], A, B, r, s, t })
  }
  const uRep = Math.max(1, Math.round(2 * Math.PI * ((P.r0 + P.r1) / 2)))
  const base = W.count
  for (let i = 0; i <= seg; i++) {
    const { p, A, B, r, s: ss, t } = rows[i]
    const shade = 0.92 + 0.12 * hash(i * 1.7 + P.seed) - (t < 0.06 ? 0.12 : 0)
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2
      const nx = A.x * Math.cos(a) + B.x * Math.sin(a), ny = A.y * Math.cos(a) + B.y * Math.sin(a), nz = A.z * Math.cos(a) + B.z * Math.sin(a)
      W.v(p.x + nx * r, p.y + ny * r, p.z + nz * r, nx, ny, nz, (j / radial) * uRep, ss / 1.0, [shade, shade, shade], 0.07 * t * t, P.seed)
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < radial; j++) {
    const a = base + i * (radial + 1) + j, b = a + radial + 1
    W.quad(a, b, b + 1, a + 1)
  }
  const top = pts[seg].clone()
  return { top, tangent: tans[seg].clone(), radiusTop: rows[seg].r, rows, pts, tans, length: s }
}

/** dead frond bases: short thick stubs hanging round the top of the trunk (bark material) */
function addBoots(W, sp, trunk, rng, lod) {
  if (!sp.boots || lod > 1) return
  const n = lod === 0 ? sp.boots : Math.ceil(sp.boots / 2)
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rng() * 0.6
    const h = 0.25 + rng() * 0.9
    const idx = Math.max(0, trunk.pts.length - 1 - Math.round(h / (trunk.length / (trunk.pts.length - 1))))
    const row = trunk.rows[idx]
    const out = V(Math.cos(a), 0, Math.sin(a))
    const dir = out.clone().multiplyScalar(0.8).add(V(0, -0.35, 0)).normalize()
    const o = row.p.clone().addScaledVector(out, row.r * 0.9)
    const len = 0.45 + rng() * 0.4, w0 = 0.06 + rng() * 0.03
    const side = new THREE.Vector3().crossVectors(dir, V(0, 1, 0)).normalize()
    const up = new THREE.Vector3().crossVectors(side, dir).normalize()
    const b = W.count
    const ring = [[1, 0], [0, 1], [-1, 0], [0, -1]]
    for (const k2 of [0, 1]) {
      const w = k2 ? 0.015 : w0
      const c = o.clone().addScaledVector(dir, k2 * len)
      for (const [x, y] of ring) {
        const nrm = side.clone().multiplyScalar(x).addScaledVector(up, y)
        W.v(c.x + nrm.x * w, c.y + nrm.y * w, c.z + nrm.z * w, nrm.x, nrm.y, nrm.z, x * 0.25 + 0.5, k2 * 0.3 + h, [0.7, 0.62, 0.5], 0.05 * row.t, 3)
      }
    }
    for (let i = 0; i < 4; i++) W.quad(b + i, b + 4 + i, b + 4 + ((i + 1) % 4), b + ((i + 1) % 4))
  }
}

// atlas coordinates (see tex.leafletMaps): blade u 0.14..0.61; pale-green swatch u 0.88,v 0.25; brown swatch u 0.88,v 0.75
const BLADE_U0 = 0.14, BLADE_U1 = 0.61

function addCrownshaft(W, sp, trunk) {
  if (!sp.crownshaft) return
  const H = sp.crownshaft
  const T = trunk.tangent
  const A = new THREE.Vector3().crossVectors(V(1, 0, 0), T).normalize()
  const B = new THREE.Vector3().crossVectors(T, A).normalize()
  const n = 10, rings = 4
  const b = W.count
  for (let i = 0; i <= rings; i++) {
    const t = i / rings
    const c = trunk.top.clone().addScaledVector(T, t * H)
    const r = trunk.radiusTop * (1.05 - 0.2 * t) * (i === 0 ? 1 : 1) * (1 + 0.08 * Math.sin(Math.PI * t))
    for (let j = 0; j <= n; j++) {
      const a = (j / n) * Math.PI * 2
      const nx = A.x * Math.cos(a) + B.x * Math.sin(a), ny = A.y * Math.cos(a) + B.y * Math.sin(a), nz = A.z * Math.cos(a) + B.z * Math.sin(a)
      W.v(c.x + nx * r, c.y + ny * r, c.z + nz * r, nx, ny, nz, 0.88, 0.75, [0.62, 0.8, 0.45], 0.05, 5)
    }
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < n; j++) { const a = b + i * (n + 1) + j; W.quad(a, a + n + 1, a + n + 2, a + 1) }
}

function addNuts(W, sp, trunk, rng, lod) {
  const [lo, hi] = sp.nuts
  if (!hi || lod > 1) return
  const n = Math.round(lo + rng() * (hi - lo))
  const geo = new THREE.IcosahedronGeometry(1, lod === 0 ? 1 : 0)
  const pos = geo.attributes.position
  const idx = geo.index ? geo.index.array : null
  for (let k = 0; k < n; k++) {
    const a = rng() * Math.PI * 2, d = 0.12 + rng() * 0.12
    const c = trunk.top.clone().add(V(Math.cos(a) * d, -0.32 - rng() * 0.2, Math.sin(a) * d))
    const s = 0.1 + rng() * 0.03
    const b = W.count
    const tint = [0.6 + rng() * 0.3, 0.72 + rng() * 0.2, 0.34]
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i) * 1.25, z = pos.getZ(i)
      const l = Math.hypot(x, y, z) || 1
      W.v(c.x + x * s, c.y + y * s, c.z + z * s, x / l, y / l, z / l, 0.88, 0.25, tint, 0.08, 7)
    }
    if (idx) for (let i = 0; i < idx.length; i += 3) W.tri(b + idx[i], b + idx[i + 1], b + idx[i + 2])
    else for (let i = 0; i < pos.count; i += 3) W.tri(b + i, b + i + 1, b + i + 2)
  }
  geo.dispose()
}

/**
 * One pinnate frond. LOD 0: rachis tube + individual leaflet blades. LOD>=1: two alpha-cut comb ribbons.
 * `base` is the frond origin, `yaw` its azimuth, `pitch0` the launch angle above horizontal.
 */
function addFrond(W, sp, F, lod, rng) {
  const { base, yaw, pitch0, L, curl, leafMax, tint, twist, wind } = F
  const K = lod === 0 ? 14 : lod === 1 ? 8 : 5
  const hd = V(Math.cos(yaw), 0, Math.sin(yaw))
  const S0 = V(-Math.sin(yaw), 0, Math.cos(yaw))
  // rachis path
  const pts = [base.clone()], tan = []
  let p = pitch0
  const step = L / K
  for (let k = 1; k <= K; k++) {
    const t = k / K
    p = pitch0 - curl * Math.pow(t, 1.5)
    const d = hd.clone().multiplyScalar(Math.cos(p)).add(V(0, Math.sin(p), 0))
    pts.push(pts[k - 1].clone().addScaledVector(d, step))
  }
  for (let k = 0; k <= K; k++) tan.push(pts[Math.min(K, k + 1)].clone().sub(pts[Math.max(0, k - 1)]).normalize())
  const frameAt = (k) => {
    const T = tan[k]
    const ang = twist * (k / K)
    const S = S0.clone().applyAxisAngle(T, ang)
    const U = new THREE.Vector3().crossVectors(S, T).normalize()
    return { T, S, U }
  }
  const pAt = (t) => { // position/frame by fraction along the rachis
    const f = Math.min(K - 1e-6, Math.max(0, t * K)), k = Math.floor(f), m = f - k
    const a = frameAt(k), b = frameAt(k + 1)
    return { P: pts[k].clone().lerp(pts[k + 1], m), T: a.T.clone().lerp(b.T, m).normalize(), S: a.S.clone().lerp(b.S, m).normalize(), U: a.U.clone().lerp(b.U, m).normalize() }
  }
  const phase = rng() * 6.28
  const tintV = (k) => [tint[0] * k, tint[1] * k, tint[2] * k]

  // rachis (all LODs for lod 0; thin tube); LOD1+ gets a simple 2-sided stripe so the card has a spine
  if (lod === 0) {
    const b = W.count
    for (let k = 0; k <= K; k++) {
      const { S, U } = frameAt(k)
      const r = lerp(0.045, 0.01, k / K) * (L / 4)
      for (let j = 0; j < 4; j++) {
        const a = (j / 4) * Math.PI * 2
        const n = S.clone().multiplyScalar(Math.cos(a)).addScaledVector(U, Math.sin(a))
        W.v(pts[k].x + n.x * r, pts[k].y + n.y * r, pts[k].z + n.z * r, n.x, n.y, n.z, 0.88, 0.75 + 0.02 * k / K, tintV(0.82), wind * (k / K) * 0.9, phase)
      }
    }
    for (let k = 0; k < K; k++) for (let j = 0; j < 4; j++) { const a = b + k * 4 + j, c = b + k * 4 + (j + 1) % 4; W.quad(a, c, c + 4, a + 4) }
  }

  if (lod === 0) {
    // leaflets
    const NL = sp.leafPerSide
    for (const side of [-1, 1]) {
      for (let i = 0; i < NL; i++) {
        const t = 0.1 + (i / (NL - 1)) * 0.885
        const { P, T, S, U } = pAt(t)
        const prof = Math.pow(Math.sin(Math.PI * Math.min(1, 0.06 + t * 0.97)), 0.7) // long mid-frond, short at both ends
        const len = leafMax * (0.35 + 0.65 * prof) * (0.88 + rng() * 0.24)
        const beta = lerp(sp.beta[0], sp.beta[1], t) + (rng() - 0.5) * 0.12 // angle from the rachis toward the tip
        const dir = S.clone().multiplyScalar(side * Math.sin(beta)).addScaledVector(T, Math.cos(beta)).addScaledVector(U, sp.vfold * (0.6 + 0.6 * rng()))
        dir.normalize()
        const droop = 0.35 + 0.45 * rng() + t * 0.35
        // blade strip: 3 segments
        const segs = 3
        const stat = []
        for (let j = 0; j <= segs; j++) {
          const u = j / segs
          const c = P.clone().addScaledVector(dir, len * u).addScaledVector(U, -droop * len * u * u * 0.55)
          stat.push(c)
        }
        const wmax = sp.leafW * (0.9 + rng() * 0.3) * (L / 4)
        const shade = (0.86 + rng() * 0.28) * (0.9 + 0.12 * t)
        const b = W.count
        for (let j = 0; j <= segs; j++) {
          const u = j / segs
          const tg = stat[Math.min(segs, j + 1)].clone().sub(stat[Math.max(0, j - 1)]).normalize()
          const nref = U.clone().addScaledVector(S, -side * sp.vfold * 0.8).normalize()
          const wv = new THREE.Vector3().crossVectors(nref, tg).normalize()
          const nrm = new THREE.Vector3().crossVectors(tg, wv).normalize()
          nrm.lerp(V(0, 1, 0), 0.32).normalize() // soft, foliage-like shading
          const w = wmax * (1 - Math.pow(u, 1.8)) * (0.45 + 0.55 * Math.min(1, u * 6))
          const aw = wind * (0.25 + 0.75 * t) * (0.55 + 0.6 * u)
          const c = stat[j]
          W.v(c.x - wv.x * w, c.y - wv.y * w, c.z - wv.z * w, nrm.x, nrm.y, nrm.z, BLADE_U0, u, tintV(shade), aw, phase + i * 0.13)
          W.v(c.x + wv.x * w, c.y + wv.y * w, c.z + wv.z * w, nrm.x, nrm.y, nrm.z, BLADE_U1, u, tintV(shade), aw, phase + i * 0.13)
        }
        for (let j = 0; j < segs; j++) { const a = b + j * 2; W.quad(a, a + 1, a + 3, a + 2) }
      }
    }
  } else {
    // comb ribbons: rachis -> leaflet tips, textured with the alpha-cut comb (uv.x 0.5 at the spine)
    for (const side of [-1, 1]) {
      const b = W.count
      for (let k = 0; k <= K; k++) {
        const t = k / K
        const { P, T, S, U } = pAt(Math.min(0.999, t))
        const prof = Math.pow(Math.sin(Math.PI * Math.min(1, 0.06 + t * 0.97)), 0.7)
        const len = leafMax * (0.35 + 0.65 * prof)
        const beta = lerp(sp.beta[0], sp.beta[1], t)
        const dir = S.clone().multiplyScalar(side * Math.sin(beta)).addScaledVector(T, Math.cos(beta) * 0.55).addScaledVector(U, sp.vfold * 0.9).normalize()
        const tip = P.clone().addScaledVector(dir, len * 1.05).addScaledVector(U, -(0.35 + t * 0.35) * len * 0.5)
        const nrm = V(0, 1, 0).lerp(U, 0.5).normalize()
        const cc = tintV(0.95)
        const aw = wind * (0.25 + 0.75 * t)
        // v along the frond: texture comb base is at the bottom (v=0)
        W.v(P.x, P.y, P.z, nrm.x, nrm.y, nrm.z, 0.5, t, cc, aw * 0.5, phase)
        W.v(tip.x, tip.y, tip.z, nrm.x, nrm.y, nrm.z, side > 0 ? 1 : 0, t, cc, aw, phase)
      }
      for (let k = 0; k < K; k++) { const a = b + k * 2; if (side > 0) W.quad(a, a + 1, a + 3, a + 2); else W.quad(a, a + 2, a + 3, a + 1) }
    }
  }
}

/**
 * @returns { trunk: BufferGeometry, crown: BufferGeometry, height, crownTop: Vector3, species }
 */
export function buildPalm(species, seed, lod = 0) {
  const sp = SPECIES[species]
  const rng = rngFor(seed * 17 + 3)
  const P = {
    seed, H: rr(rng, sp.H), r0: sp.r0 * (0.92 + rng() * 0.2), r1: sp.r1 * (0.92 + rng() * 0.2),
    lean: rr(rng, sp.lean), sCurve: rr(rng, sp.sCurve) * (rng() < 0.5 ? -1 : 1),
  }
  const T = new Writer(), C = new Writer()
  const trunk = addTrunk(T, sp, P, rng, lod)
  addBoots(T, sp, trunk, rng, lod)
  addCrownshaft(C, sp, trunk)
  addNuts(C, sp, trunk, rng, lod)

  const crown = trunk.top.clone().addScaledVector(trunk.tangent, sp.crownshaft || 0)
  let nF = Math.round(rr(rng, sp.fronds))
  if (lod === 2) nF = Math.max(7, Math.round(nF * 0.6))
  const hueJ = 0
  for (let f = 0; f < nF; f++) {
    // golden-angle spiral: young fronds stand up in the middle, old ones hang low around the edge
    const t = f / (nF - 1 || 1)
    const yaw = f * 2.39996 + rng() * 0.3
    const pitch0 = lerp(rr(rng, sp.pitchTop), rr(rng, sp.pitchBot), Math.pow(t, 0.85))
    const L = rr(rng, sp.fLen) * (0.78 + 0.28 * Math.sin(Math.PI * Math.min(1, 0.3 + t * 0.75)))
    const curl = rr(rng, sp.curl) * (0.8 + 0.5 * t)
    const g = 0.88 + rng() * 0.26
    const tint = [g * (0.95 + rng() * 0.1), g * (0.98 + rng() * 0.08), g * 0.92]
    addFrond(C, sp, {
      base: crown.clone().add(V(0, -0.04 * t, 0)), yaw, pitch0, L, curl, leafMax: rr(rng, sp.leafMax) * (L / 4),
      tint, twist: (rng() - 0.5) * 0.9, wind: 0.34 * (L / 4.2) * (0.7 + 0.5 * (1 - t) * 0 + 0.5 * t),
    }, lod, rng)
  }
  const out = { trunk: T.build(), crown: C.build(), height: P.H, crownTop: crown, species }
  return out
}
