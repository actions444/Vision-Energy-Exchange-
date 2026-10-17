import { useEffect, useMemo, useRef } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { floraMats, tickWind } from './mats.js'
import { hash } from './tex.js'
import { TreeGrove } from './Palms.jsx'
import { facadeMats } from '../facade/materials.js'
import { boxGeo } from '../facade/kit.js'
import { foliageMat } from '../Vegetation.jsx'

// Groundcover, shrubs, flower beds, planters, lawns and hedges. Everything repeated is instanced; leaves are alpha-cut
// cards from procedural textures; lawns are PBR grass with a normal map plus short, swaying tufts.

function cardGeo(w, h, planes = 2, lift = true, windAmp = 0.05) {
  const p = [], n = [], uv = [], c = [], wv = [], ph = [], idx = []
  for (let k = 0; k < planes; k++) {
    const a = (k / planes) * Math.PI
    const ax = [Math.cos(a), Math.sin(a)]
    const b = p.length / 3
    for (const [sx, sy, u, v] of [[-1, 0, 0, 0], [1, 0, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]]) {
      p.push(ax[0] * sx * w * 0.5, sy * h + (lift ? 0 : -h / 2), ax[1] * sx * w * 0.5)
      n.push(0, 1, 0); uv.push(u, v); c.push(1, 1, 1); wv.push(sy * windAmp); ph.push(k * 1.3)
    }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3))
  g.setAttribute('aWind', new THREE.Float32BufferAttribute(wv, 1)); g.setAttribute('aPhase', new THREE.Float32BufferAttribute(ph, 1))
  g.setIndex(idx)
  return g
}
const geoCache = new Map()
const cached = (k, f) => { if (!geoCache.has(k)) geoCache.set(k, f()); return geoCache.get(k) }

/** a mounded shrub: leaf cards on a hemisphere, normals pointing outward so it shades as one soft mass */
function shrubGeo(seed, n = 26) {
  return cached('shrub' + seed + '|' + n, () => {
    const p = [], nr = [], uv = [], c = [], wv = [], ph = [], idx = []
    for (let k = 0; k < n; k++) {
      const a = hash(k * 3.7 + seed) * Math.PI * 2
      const e = Math.acos(1 - hash(k * 5.3 + seed * 2) * 0.95) // polar angle, denser near the top
      const d = [Math.sin(e) * Math.cos(a), Math.cos(e), Math.sin(e) * Math.sin(a)]
      const r = 0.55 + hash(k * 1.9 + seed) * 0.3
      const ctr = [d[0] * r, 0.15 + Math.max(0, d[1]) * r * 0.9, d[2] * r]
      const size = 0.62 + hash(k * 7.1 + seed) * 0.35
      const roll = hash(k * 9.3 + seed) * Math.PI * 2
      // card basis: tangent plane at the sphere surface
      const t1 = new THREE.Vector3(-d[2], 0, d[0]).normalize()
      if (t1.lengthSq() < 0.01) t1.set(1, 0, 0)
      const nv = new THREE.Vector3(...d)
      const t2 = new THREE.Vector3().crossVectors(nv, t1).normalize()
      const u1 = t1.clone().multiplyScalar(Math.cos(roll)).addScaledVector(t2, Math.sin(roll))
      const u2 = new THREE.Vector3().crossVectors(nv, u1).normalize()
      const b = p.length / 3
      const g = 0.8 + hash(k * 2.3 + seed) * 0.4
      const nrm = nv.clone().lerp(new THREE.Vector3(0, 1, 0), 0.25).normalize()
      for (const [sx, sy, u, v] of [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]]) {
        p.push(ctr[0] + u1.x * sx * size * 0.5 + u2.x * sy * size * 0.5, ctr[1] + u1.y * sx * size * 0.5 + u2.y * sy * size * 0.5, ctr[2] + u1.z * sx * size * 0.5 + u2.z * sy * size * 0.5)
        nr.push(nrm.x, nrm.y, nrm.z); uv.push(u, v); c.push(g * 0.9, g, g * 0.85); wv.push(0.03 * Math.max(0, ctr[1])); ph.push(hash(k + seed) * 6)
      }
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nr, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute('color', new THREE.Float32BufferAttribute(c, 3))
    geo.setAttribute('aWind', new THREE.Float32BufferAttribute(wv, 1)); geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(ph, 1))
    geo.setIndex(idx)
    return geo
  })
}

function useWind() { useFrame((st) => tickWind(st.clock.elapsedTime)) }

// ---------------- Trees ----------------
/** @param {{ trees: [number, number, number, number?][] }} props [x, y, z, scale] */
export function Trees({ trees }) {
  return <TreeGrove palms={trees} species="oak" />
}

// ---------------- Lawn ----------------
const tuftGeo = () => cached('tuft', () => cardGeo(0.5, 0.42, 2, true, 0.07))
/** Walkable lawn: PBR grass plane plus instanced blade tufts (fewer on big lawns), no tufts under the edge band. */
export function Lawn({ x0, x1, z0, z1, y = 0.15, skip = [] }) {
  const w = x1 - x0, d = z1 - z0
  const mesh = useRef()
  const n = Math.min(2600, Math.floor(w * d * 0.7))
  useWind()
  useEffect(() => {
    if (!mesh.current) return
    const o = new THREE.Object3D(), c = new THREE.Color()
    let placed = 0
    for (let a = 0; a < n; a++) {
      const i = placed
      const rx = hash(a * 1.37 + x0 * 3.1), rz = hash(a * 2.91 + z0 * 1.7)
      const px = x0 + 0.25 + rx * (w - 0.5), pz = z0 + 0.25 + rz * (d - 0.5)
      // keep blades off paving: skip = [x0,x1,z0,z1] rects or [cx,cz,r] circles
      if (skip.some((k) => (k.length === 4 ? px > k[0] && px < k[1] && pz > k[2] && pz < k[3] : Math.hypot(px - k[0], pz - k[1]) < k[2]))) continue
      placed++
      o.position.set(px, y + 0.004, pz)
      o.rotation.set(0, hash(i * 7.3) * 6.28, 0)
      const s = 0.6 + hash(i * 4.1) * 0.7
      o.scale.set(s, s * (0.7 + hash(i * 5.9) * 0.6), s)
      o.updateMatrix(); mesh.current.setMatrixAt(i, o.matrix)
      c.setRGB(0.8 + hash(i * 3.3) * 0.35, 0.85 + hash(i * 6.1) * 0.3, 0.7 + hash(i * 8.7) * 0.25)
      mesh.current.setColorAt(i, c)
    }
    mesh.current.count = placed
    mesh.current.instanceMatrix.needsUpdate = true
    mesh.current.instanceColor.needsUpdate = true
    mesh.current.computeBoundingSphere()
  }, [x0, x1, z0, z1, y, n, JSON.stringify(skip)]) // eslint-disable-line react-hooks/exhaustive-deps
  const mat = floraMats.lawn(w / 2.5, d / 2.5)
  return (
    <group>
      <mesh position={[(x0 + x1) / 2, y + 0.004, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={mat} receiveShadow>
        <planeGeometry args={[w, d]} />
      </mesh>
      {n > 0 && <instancedMesh ref={mesh} args={[tuftGeo(), floraMats.grass(), n]} receiveShadow frustumCulled userData={{ noBatch: true }} />}
    </group>
  )
}

// ---------------- Flower bed ----------------
const FLOWER_COLORS = ['#d6223a', '#f2c230', '#8e4fc9', '#ef6aa8', '#fbfbf5', '#f07a2a', '#3d6fd1']
/** Raised bed with a cut-stone curb, bark mulch, clipped shrubs, drifts of perennials and flowers. Colliders on the curb only. */
export function FlowerBed({ x, z, w, d, y = 0.15, seed = 1, shrubs = true, palette = FLOWER_COLORS }) {
  const flowers = useRef(), leaves = useRef(), bushes = useRef()
  useWind()
  const area = w * d
  const nF = Math.min(300, Math.floor(area * 7)), nL = Math.min(520, Math.floor(area * 11)), nB = shrubs ? Math.max(2, Math.floor(area / 3.2)) : 0
  const petal = useMemo(() => foliageMat('blossom'), [])
  const stone = facadeMats().stone
  const t = 0.2, h = 0.34
  const curbGeos = useMemo(() => [[0, -d / 2 + t / 2, w, t], [0, d / 2 - t / 2, w, t], [-w / 2 + t / 2, 0, t, d - 2 * t], [w / 2 - t / 2, 0, t, d - 2 * t]].map(([ox, oz, sx, sz]) => boxGeo(sx, h, sz, x + ox, y + h / 2, z + oz)), [x, z, w, d, y])
  const capGeos = useMemo(() => [[0, -d / 2 + t / 2, w + 0.08, t + 0.06], [0, d / 2 - t / 2, w + 0.08, t + 0.06], [-w / 2 + t / 2, 0, t + 0.06, d - 2 * t], [w / 2 - t / 2, 0, t + 0.06, d - 2 * t]].map(([ox, oz, sx, sz]) => boxGeo(sx, 0.05, sz, x + ox, y + h + 0.025, z + oz)), [x, z, w, d, y])
  useEffect(() => {
    const o = new THREE.Object3D(), c = new THREE.Color()
    const rnd = (i, k) => hash(seed * 1000 + i * 13 + k)
    const top = y + 0.23
    // flowers in drifts: choose a few anchor points per colour, then scatter around them
    const drifts = Array.from({ length: 6 }, (_, k) => ({ x: (rnd(k, 31) - 0.5) * (w - 0.8), z: (rnd(k, 32) - 0.5) * (d - 0.8), c: palette[(k + seed) % palette.length] }))
    for (let i = 0; i < nF; i++) {
      const dr = drifts[Math.floor(rnd(i, 1) * drifts.length)]
      const px = Math.max(-w / 2 + 0.3, Math.min(w / 2 - 0.3, dr.x + (rnd(i, 2) - 0.5) * 1.5)), pz = Math.max(-d / 2 + 0.3, Math.min(d / 2 - 0.3, dr.z + (rnd(i, 4) - 0.5) * 1.3))
      o.position.set(x + px, top + 0.2 + rnd(i, 3) * 0.2, z + pz)
      const s = 0.14 + rnd(i, 5) * 0.08
      o.rotation.set(0, rnd(i, 15) * 6, 0); o.scale.set(s, s, s); o.updateMatrix()
      flowers.current.setMatrixAt(i, o.matrix)
      c.set(dr.c).offsetHSL((rnd(i, 7) - 0.5) * 0.03, 0, (rnd(i, 8) - 0.5) * 0.08)
      flowers.current.setColorAt(i, c)
      // the foliage tuft this blossom sits on
      o.position.set(x + px, top, z + pz); o.scale.set(0.5 + rnd(i, 9) * 0.3, 0.7 + rnd(i, 10) * 0.5, 0.5 + rnd(i, 9) * 0.3); o.updateMatrix()
      if (i < nL) { leaves.current.setMatrixAt(i, o.matrix); c.setRGB(0.7 + rnd(i, 11) * 0.3, 0.9, 0.6 + rnd(i, 12) * 0.3); leaves.current.setColorAt(i, c) }
    }
    for (let i = nF; i < nL; i++) {
      o.position.set(x + (rnd(i, 6) - 0.5) * (w - 0.5), top, z + (rnd(i, 7) - 0.5) * (d - 0.5))
      o.scale.set(0.6, 0.6 + rnd(i, 8) * 0.8, 0.6); o.rotation.set(0, rnd(i, 9) * 6, 0); o.updateMatrix()
      leaves.current.setMatrixAt(i, o.matrix); c.setRGB(0.7 + rnd(i, 11) * 0.3, 0.9, 0.6); leaves.current.setColorAt(i, c)
    }
    // shrubs: spaced along the back and corners, never in the middle of a walkway side
    for (let i = 0; i < nB; i++) {
      const s = 0.5 + rnd(i, 10) * 0.35
      const edge = i % 2 ? 0.28 : -0.28
      o.position.set(x + (rnd(i, 11) - 0.5) * (w - 1.1), top, z + edge * (d - 1.0) + (rnd(i, 12) - 0.5) * 0.3)
      o.rotation.set(0, rnd(i, 13) * 6, 0); o.scale.set(s, s * 0.9, s); o.updateMatrix()
      bushes.current.setMatrixAt(i, o.matrix); c.setRGB(0.85 + rnd(i, 14) * 0.25, 0.95, 0.8); bushes.current.setColorAt(i, c)
    }
    for (const m of [flowers, leaves, bushes]) { if (!m.current) continue; m.current.instanceMatrix.needsUpdate = true; if (m.current.instanceColor) m.current.instanceColor.needsUpdate = true; m.current.computeBoundingSphere() }
  }, [x, z, w, d, y, seed, nF, nL, nB, palette]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[w / 2, h / 2, t / 2]} position={[x, y + h / 2, z - d / 2 + t / 2]} />
        <CuboidCollider args={[w / 2, h / 2, t / 2]} position={[x, y + h / 2, z + d / 2 - t / 2]} />
        <CuboidCollider args={[t / 2, h / 2, d / 2]} position={[x - w / 2 + t / 2, y + h / 2, z]} />
        <CuboidCollider args={[t / 2, h / 2, d / 2]} position={[x + w / 2 - t / 2, y + h / 2, z]} />
      </RigidBody>
      {curbGeos.map((g, i) => <mesh key={i} geometry={g} material={stone} castShadow receiveShadow />)}
      {capGeos.map((g, i) => <mesh key={'c' + i} geometry={g} material={facadeMats().granite} receiveShadow />)}
      <mesh position={[x, y + 0.225, z]} rotation={[-Math.PI / 2, 0, 0]} material={floraMats.mulch((w - 2 * t) / 1.2, (d - 2 * t) / 1.2)} receiveShadow><planeGeometry args={[w - t * 2, d - t * 2]} /></mesh>
      <instancedMesh ref={leaves} args={[cardGeo(0.5, 0.42, 2, true, 0.06), floraMats.grass(), nL]} receiveShadow userData={{ noBatch: true }} />
      <instancedMesh ref={flowers} args={[cardGeo(1, 1, 2, true, 0.04), petal, nF]} userData={{ noBatch: true }} />
      {nB > 0 && <instancedMesh ref={bushes} args={[shrubGeo(seed % 4, 24), floraMats.cluster('shrub'), nB]} castShadow receiveShadow userData={{ noBatch: true }} />}
    </group>
  )
}

// ---------------- Planter ----------------
/** Cut-stone planter with mulch and a clipped boxwood mound. */
export function Planter({ position, size = [1.2, 0.6, 1.2], tall = false }) {
  const stone = facadeMats().stone
  const geo = useMemo(() => boxGeo(size[0], size[1], size[2], 0, size[1] / 2, 0), [size[0], size[1], size[2]]) // eslint-disable-line react-hooks/exhaustive-deps
  const lip = useMemo(() => boxGeo(size[0] + 0.1, 0.06, size[2] + 0.1, 0, size[1] + 0.03, 0), [size[0], size[1], size[2]]) // eslint-disable-line react-hooks/exhaustive-deps
  const mound = useMemo(() => shrubGeo(1, 22), [])
  const r = Math.min(size[0], size[2]) * 0.46
  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} position={[0, size[1] / 2, 0]} />
      <mesh geometry={geo} material={stone} castShadow receiveShadow />
      <mesh geometry={lip} material={facadeMats().granite} receiveShadow />
      <mesh position={[0, size[1] + 0.062, 0]} rotation={[-Math.PI / 2, 0, 0]} material={floraMats.mulch(size[0] / 1.2, size[2] / 1.2)} receiveShadow><planeGeometry args={[size[0] - 0.12, size[2] - 0.12]} /></mesh>
      <mesh geometry={mound} material={floraMats.cluster('shrub')} position={[0, size[1] + 0.06, 0]} scale={[r * 1.25, r * 1.3 * (tall ? 1.4 : 1), r * 1.25]} castShadow userData={{ noBatch: true }} />
    </RigidBody>
  )
}

// ---------------- Hedge ----------------
/** Clipped boxwood hedge: a dark core wrapped in a dense skin of small leaf cards on its top and long faces. */
export function Hedge({ position, size = [4, 1.1, 0.8], yaw = 0 }) {
  const [w, h, d] = size
  useWind()
  const mesh = useRef()
  const core = useMemo(() => new THREE.MeshStandardMaterial({ color: '#35562a', roughness: 1 }), [])
  const n = Math.max(60, Math.round((w * d + 2 * w * h) * 70))
  useEffect(() => {
    const o = new THREE.Object3D(), c = new THREE.Color()
    const top = w * d, side = w * h, tot = top + 2 * side
    for (let i = 0; i < n; i++) {
      const r = hash(i * 1.7) * tot
      let px, py, pz, ry = 0, rx = 0
      if (r < top) { px = (hash(i * 3.1) - 0.5) * w; py = h + (hash(i * 8.3) - 0.35) * 0.2; pz = (hash(i * 5.3) - 0.5) * d; rx = -Math.PI / 2 }
      else if (r < top + side) { px = (hash(i * 3.1) - 0.5) * w; py = hash(i * 5.3) * h; pz = d / 2 + hash(i * 8.9) * 0.14; ry = 0 }
      else { px = (hash(i * 3.1) - 0.5) * w; py = hash(i * 5.3) * h; pz = -d / 2 - hash(i * 8.9) * 0.14; ry = Math.PI }
      o.position.set(px, py, pz); o.rotation.set(rx + (hash(i * 7.1) - 0.5) * 0.5, ry + (hash(i * 9.7) - 0.5) * 0.7, hash(i * 11.3) * 6.28, 'YXZ')
      const s = 0.38 + hash(i * 13.1) * 0.22
      o.scale.set(s, s, s); o.updateMatrix(); mesh.current.setMatrixAt(i, o.matrix)
      c.setRGB(0.95 + hash(i * 2.1) * 0.45, 1.1 + hash(i * 4.4) * 0.3, 0.8 + hash(i * 6.6) * 0.3); mesh.current.setColorAt(i, c)
    }
    mesh.current.instanceMatrix.needsUpdate = true; mesh.current.instanceColor.needsUpdate = true; mesh.current.computeBoundingSphere()
  }, [w, h, d, n])
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[w / 2, h / 2, d / 2]} position={[0, h / 2, 0]} />
      <mesh position={[0, h / 2, 0]} material={core} castShadow receiveShadow><boxGeometry args={[w - 0.1, h - 0.06, d - 0.1]} /></mesh>
      <instancedMesh ref={mesh} args={[cardGeo(1, 1, 1, false, 0.02), floraMats.cluster('boxwood'), n]} castShadow receiveShadow userData={{ noBatch: true }} />
    </RigidBody>
  )
}
