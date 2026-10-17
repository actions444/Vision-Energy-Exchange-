import * as THREE from 'three'
import { hash } from './tex.js'

// Procedural broadleaf street/garden trees: a tapered, slightly twisted trunk with root flare, a leader and
// 5-7 scaffold branches with forked twigs, and alpha-cut leaf clusters (crossed quads) placed along the twigs.
// Variants differ in branch layout, height, lean and leaf density. LOD cuts the cluster count and enlarges the cards.

class Writer {
  constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; this.w = []; this.ph = []; this.i = [] }
  get count() { return this.p.length / 3 }
  v(px, py, pz, nx, ny, nz, u, v, c, w, ph) { this.p.push(px, py, pz); this.n.push(nx, ny, nz); this.uv.push(u, v); this.c.push(c[0], c[1], c[2]); this.w.push(w); this.ph.push(ph); return this.count - 1 }
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
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)
function rngFor(seed) { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280 } }

/** a tapered tube along a polyline, bark-mapped (1 m tile); returns the frames */
function tube(W, pts, r0, r1, radial, flare = 0, wind0 = 0, wind1 = 0.1, shade = 1) {
  const n = pts.length
  const ref = V(1, 0, 0)
  let s = 0
  const base = W.count
  for (let i = 0; i < n; i++) {
    if (i) s += pts[i].distanceTo(pts[i - 1])
    const T = pts[Math.min(n - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize()
    const r0v = Math.abs(T.x) > 0.9 ? V(0, 0, 1) : ref
    const A = new THREE.Vector3().crossVectors(r0v, T).normalize()
    const B = new THREE.Vector3().crossVectors(T, A).normalize()
    const t = i / (n - 1)
    const r = (r0 + (r1 - r0) * Math.pow(t, 0.85)) * (1 + flare * Math.exp(-s / 0.5))
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2
      const nx = A.x * Math.cos(a) + B.x * Math.sin(a), ny = A.y * Math.cos(a) + B.y * Math.sin(a), nz = A.z * Math.cos(a) + B.z * Math.sin(a)
      const c = shade * (0.92 + 0.1 * hash(i * 3.1 + j))
      W.v(pts[i].x + nx * r, pts[i].y + ny * r, pts[i].z + nz * r, nx, ny, nz, (j / radial) * Math.max(1, Math.round(2 * Math.PI * r0)), s, [c, c, c], wind0 + (wind1 - wind0) * t, 1)
    }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < radial; j++) { const a = base + i * (radial + 1) + j, b = a + radial + 1; W.quad(a, b, b + 1, a + 1) }
}

/** a gently curving branch from p0 in direction d, length L; returns its points */
function branchPts(p0, d, L, seg, droop, rng) {
  const pts = [p0.clone()]
  const dir = d.clone().normalize()
  const side = V(rng() - 0.5, 0, rng() - 0.5).multiplyScalar(0.6)
  for (let i = 1; i <= seg; i++) {
    dir.add(side.clone().multiplyScalar(0.15)).add(V(0, -droop / seg, 0)).normalize()
    pts.push(pts[i - 1].clone().addScaledVector(dir, L / seg))
  }
  return pts
}

export function buildTree(species, seed, lod = 0) {
  const rng = rngFor(seed * 31 + 7)
  const T = new Writer(), C = new Writer()
  const ficus = species === 'ficus'
  const trunkH = ficus ? 2.4 + rng() * 0.8 : 3.0 + rng() * 0.8
  const lean = V((rng() - 0.5) * 0.35, 0, (rng() - 0.5) * 0.35)
  const radial = lod === 0 ? 10 : lod === 1 ? 7 : 5
  const tp = []
  const n = lod === 0 ? 9 : 5
  for (let i = 0; i <= n; i++) { const t = i / n; tp.push(V(lean.x * t * t * trunkH + Math.sin(t * 5 + seed) * 0.05, trunkH * t, lean.z * t * t * trunkH + Math.cos(t * 4 + seed) * 0.05)) }
  tube(T, tp, 0.21 + rng() * 0.05, 0.12, radial, 0.6, 0, 0.03)
  const top = tp[n].clone()
  const crownC = top.clone().add(V(0, ficus ? 1.9 : 2.5, 0))
  const spread = ficus ? 2.4 : 3.1 + rng() * 0.6
  const nB = lod === 2 ? 4 : 5 + Math.floor(rng() * 3)
  const tips = [] // [position, outward direction]
  // central leader
  const leader = branchPts(top, V(lean.x * 0.3, 1, lean.z * 0.3), ficus ? 2.8 : 3.4, 4, 0, rng)
  tube(T, leader, 0.12, 0.04, radial, 0, 0.03, 0.08)
  tips.push([leader[4], V(0, 1, 0)], [leader[3], V(0.2, 1, 0.1)])
  for (let b = 0; b < nB; b++) {
    const a = (b / nB) * Math.PI * 2 + rng() * 0.7
    const up = 0.55 + rng() * 0.6
    const start = tp[Math.max(4, n - 1 - Math.floor(rng() * 3))].clone()
    const d = V(Math.cos(a), up, Math.sin(a))
    const L = spread * (0.75 + rng() * 0.4)
    const bp = branchPts(start, d, L, 5, 0.25, rng)
    tube(T, bp, 0.085, 0.022, lod === 0 ? 6 : 4, 0, 0.04, 0.12)
    tips.push([bp[5], d], [bp[4], d])
    if (lod < 2) {
      for (let k = 0; k < 2; k++) {
        const s0 = bp[2 + k]
        const dd = d.clone().add(V((rng() - 0.5) * 1.2, 0.6, (rng() - 0.5) * 1.2))
        const tpnt = branchPts(s0, dd, L * 0.45, 3, 0.2, rng)
        tube(T, tpnt, 0.04, 0.012, 4, 0, 0.08, 0.16)
        tips.push([tpnt[3], dd], [tpnt[2], dd])
      }
    }
  }
  // leaf clusters
  const N = lod === 0 ? (ficus ? 150 : 170) : lod === 1 ? 90 : 44
  const S = lod === 0 ? 1.15 : lod === 1 ? 1.65 : 2.4
  const base = ficus ? [0.86, 0.95, 0.82] : [0.92, 1.0, 0.86]
  for (let k = 0; k < N; k++) {
    const [tp0, d] = tips[k % tips.length]
    const jitter = V((rng() - 0.5) * 1.8, (rng() - 0.35) * 1.4, (rng() - 0.5) * 1.8).multiplyScalar(lod === 0 ? 1 : 1.3)
    const c = tp0.clone().add(jitter)
    const size = S * (0.8 + rng() * 0.45)
    const nrm = c.clone().sub(crownC).normalize().lerp(V(0, 1, 0), 0.3).normalize()
    const g = 0.78 + rng() * 0.4
    const col = [base[0] * g, base[1] * g, base[2] * g]
    const planes = lod === 2 ? 2 : 3
    const rot0 = rng() * Math.PI
    for (let p = 0; p < planes; p++) {
      const ang = rot0 + (p / planes) * Math.PI
      const tilt = (rng() - 0.5) * 0.9
      const ax = V(Math.cos(ang), 0, Math.sin(ang))
      const ay = V(-Math.sin(ang) * Math.sin(tilt), Math.cos(tilt), Math.cos(ang) * Math.sin(tilt)).normalize()
      const b = C.count
      const ph = rng() * 6.28
      const w = 0.16 * (c.y / 7)
      for (const [sx, sy, u, v] of [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]]) {
        C.v(c.x + ax.x * sx * size * 0.5 + ay.x * sy * size * 0.5, c.y + ax.y * sx * size * 0.5 + ay.y * sy * size * 0.5, c.z + ax.z * sx * size * 0.5 + ay.z * sy * size * 0.5, nrm.x, nrm.y, nrm.z, u, v, col, w, ph)
      }
      C.quad(b, b + 1, b + 2, b + 3)
    }
  }
  return { trunk: T.build(), crown: C.build(), height: top.y + 4, species }
}
