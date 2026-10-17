import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { surface } from './materials.js'

// The bay east of the city: a sandy beach slope into a green-blue sea. The surface has layered
// waves, a shallow reef floor, and a population of sea life: schools of fish, dolphins that circle
// and leap, sharks patrolling, and a humpback whale that surfaces and blows. Everything that
// swims follows a closed path, so the sea feels alive without any simulation cost.

export const OCEAN = { beachX: 120, slopeX: 150, floorY: -6, surfaceY: 0, x0: 120, x1: 340, z0: -120, z1: 120 }
const WATER = '#1ea9a0' // green-blue
const WATER_DEEP = '#0f7f86'

/** Wave height at a world position: layered swells, cross chop and a fast ripple (shared with the lagoon water). */
export const waveH = (x, z, t) => 0.16 * Math.sin(0.09 * x + 0.9 * t) + 0.1 * Math.sin(0.12 * z - 0.7 * t + 1.3) +
  0.05 * Math.sin(0.35 * x + 0.25 * z + 1.9 * t) + 0.03 * Math.sin(0.7 * x - 1.1 * z + 2.6 * t)
/** The shallow lagoon has its own bright water, so the open-sea surface leaves this rectangle out. */
export const LAGOON_CUT = { x0: 150, x1: 334, z0: -118, z1: -58 }

const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }

// ---------------- body shapes ----------------
/** A lathe body whose length runs along +z (head forward), built from a width profile s(t), t 0 = head. */
function bodyGeo(L, W, shape) {
  const pts = []
  const N = 30
  for (let i = 0; i <= N; i++) {
    const t = i / N
    pts.push(new THREE.Vector2(Math.max(0.0005, W * shape(t)), (t - 0.5) * L))
  }
  const g = new THREE.LatheGeometry(pts, 24)
  g.rotateX(-Math.PI / 2) // lathe axis Y -> world Z, with t = 0 (the head) at +z
  g.computeVertexNormals()
  return g
}
const dolphinShape = (t) => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.55) * (0.92 + 0.08 * (1 - t))
const sharkShape = (t) => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.58)), 0.48) * (0.9 + 0.1 * (1 - t))
const whaleShape = (t) => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.7)), 0.42) * (1.0 - 0.12 * t)
const fishShape = (t) => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.55)), 0.62)

/** A flat fin in the body's vertical plane. `pts` are [z, y] pairs in body space. */
function finGeo(pts, thick = 0.03) {
  const s = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)))
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false })
  g.translate(0, 0, -thick / 2)
  g.rotateY(-Math.PI / 2) // shape x -> world z (along the body), extrusion -> world x (thickness)
  g.computeVertexNormals()
  return g
}

// ---------------- water surface ----------------
function Water() {
  const { x0, x1, z0, z1 } = OCEAN
  const w = x1 - x0, d = z1 - z0
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(w, d, 110, 120)
    g.rotateX(-Math.PI / 2)
    g.userData.base = Float32Array.from(g.attributes.position.array)
    // drop the triangles over the lagoon (its own surface is drawn by the island)
    const base = g.userData.base, idx = g.index.array, keep = []
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i], b = idx[i + 1], c = idx[i + 2]
      const mx = cx + (base[a * 3] + base[b * 3] + base[c * 3]) / 3, mz = cz + (base[a * 3 + 2] + base[b * 3 + 2] + base[c * 3 + 2]) / 3
      if (mx > LAGOON_CUT.x0 && mx < LAGOON_CUT.x1 && mz > LAGOON_CUT.z0 && mz < LAGOON_CUT.z1) continue
      keep.push(a, b, c)
    }
    g.setIndex(keep)
    return g
  }, [w, d])
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: WATER, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.74,
    clearcoat: 0.8, clearcoatRoughness: 0.1, envMapIntensity: 1.3, depthWrite: false,
  }), [])
  const ref = useRef()
  useFrame((st) => {
    const t = st.clock.elapsedTime
    const pos = geo.attributes.position, base = geo.userData.base
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3] + cx, z = base[i * 3 + 2] + cz
      // layered swells: long rollers, cross chop and a fast ripple
      const h = waveH(x, z, t)
      pos.setY(i, OCEAN.surfaceY + h)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
  })
  return <mesh ref={ref} geometry={geo} material={mat} position={[(x0 + x1) / 2, 0, (z0 + z1) / 2]} renderOrder={2} />
}

// ---------------- beach and reef floor ----------------
function Shore() {
  const { beachX, slopeX, floorY, x1, z0, z1 } = OCEAN
  const sand = surface('limestone', 6, 24, { color: '#e3d1a6' })
  const reef = surface('limestone', 30, 30, { color: '#2c7f7f' })
  const dx = slopeX - beachX, dy = 0.15 - floorY
  const len = Math.hypot(dx, dy)
  const ang = -Math.atan2(dy, dx)
  const cx = (beachX + slopeX) / 2, cy = (0.15 + floorY) / 2
  return (
    <group>
      {/* the sloping sand, a rigid collider so you can walk down to the water */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[len / 2, 0.3, (z1 - z0) / 2]} position={[cx, cy, (z0 + z1) / 2]} rotation={[0, 0, ang]} />
        {/* the reef floor under the water */}
        <CuboidCollider args={[(x1 - slopeX) / 2, 0.3, (z1 - z0) / 2]} position={[(slopeX + x1) / 2, floorY - 0.3, (z0 + z1) / 2]} />
      </RigidBody>
      <mesh position={[cx, cy, (z0 + z1) / 2]} rotation={[0, 0, ang]} material={sand} receiveShadow>
        <boxGeometry args={[len, 0.6, z1 - z0]} />
      </mesh>
      <mesh position={[(slopeX + x1) / 2, floorY, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={reef} receiveShadow>
        <planeGeometry args={[x1 - slopeX, z1 - z0]} />
      </mesh>
    </group>
  )
}

// ---------------- fish schools ----------------
const SCHOOLS = [
  { cx: 190, cz: -20, R: 14, n: 140, speed: 2.2, depth: -1.8, color: '#9fb8c8', dir: 1, seed: 1 },
  { cx: 240, cz: 30, R: 18, n: 120, speed: 1.8, depth: -3.2, color: '#f2c94c', dir: -1, seed: 2 },
  { cx: 165, cz: 40, R: 9, n: 90, speed: 2.6, depth: -2.4, color: '#5aa7d6', dir: 1, seed: 3 },
]
const FISH_TOTAL = SCHOOLS.reduce((a, s) => a + s.n, 0)

function Fish() {
  const ref = useRef()
  const geo = useMemo(() => bodyGeo(0.5, 0.075, fishShape), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.4 }), [])
  const fish = useMemo(() => {
    const out = []
    SCHOOLS.forEach((s) => {
      for (let i = 0; i < s.n; i++) out.push({ s, i, ox: (hash(i * 3 + s.seed) - 0.5) * 5, oy: (hash(i * 7 + s.seed) - 0.5) * 1.2, oz: (hash(i * 11 + s.seed) - 0.5) * 4 })
    })
    return out
  }, [])
  // each fish keeps its school colour; set once, the instance matrices move them every frame
  useEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    fish.forEach((f, idx) => mesh.setColorAt(idx, new THREE.Color(f.s.color)))
    mesh.instanceColor.needsUpdate = true
  }, [fish])
  const o = useMemo(() => new THREE.Object3D(), [])
  useFrame((st) => {
    const t = st.clock.elapsedTime
    const mesh = ref.current
    if (!mesh) return
    fish.forEach((f, idx) => {
      const { s } = f
      const th = (f.i / s.n) * Math.PI * 2 * 0.2 + (t * s.speed / s.R) * s.dir + s.seed
      const px = s.cx + Math.cos(th) * s.R + f.ox * 0.3
      const pz = s.cz + Math.sin(th) * s.R + f.oz * 0.3
      const py = s.depth + Math.sin(t * 0.7 + f.i) * 0.2 + f.oy
      const vx = -Math.sin(th) * s.dir, vz = Math.cos(th) * s.dir
      // a little wobble side to side so the school doesn't read as a rigid ring
      const wob = Math.sin(t * 6 + f.i * 0.7) * 0.12
      o.position.set(px + vz * wob, py, pz - vx * wob)
      o.rotation.set(0, Math.atan2(vx, vz), 0)
      o.scale.setScalar(0.8 + hash(f.i * 5 + s.seed) * 0.5)
      o.updateMatrix()
      mesh.setMatrixAt(idx, o.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[geo, mat, FISH_TOTAL]} />
}

// ---------------- swimming animals ----------------
/**
 * One animal on a closed path: a circle of radius R around (cx, cz), at `depth` (a function of
 * the angle lets dolphins leap). The body rolls side to side and the tail beats.
 */
function Swimmer({ cx, cz, R, speed, depth, phase = 0, dir = 1, leap = 0, children, tailRef, bodyRef, scale = 1 }) {
  const g = useRef()
  useFrame((st) => {
    const t = st.clock.elapsedTime
    const th = phase + (t * speed / R) * dir
    const x = cx + Math.cos(th) * R, z = cz + Math.sin(th) * R
    const vx = -Math.sin(th) * dir, vz = Math.cos(th) * dir
    const y = depth + (leap > 0 ? Math.max(0, Math.sin(th * 2.0)) ** 3 * leap : 0)
    if (g.current) {
      g.current.position.set(x, y, z)
      g.current.rotation.set(0, Math.atan2(vx, vz), 0)
    }
    if (bodyRef?.current) bodyRef.current.rotation.set(0, 0, Math.sin(t * 2.4 + phase) * 0.06 * scale)
    if (tailRef?.current) tailRef.current.rotation.set(0, Math.sin(t * 5.2 + phase) * 0.45, 0)
  })
  return <group ref={g} scale={scale}>{children}</group>
}

function Dolphin({ cx, cz, R, speed, phase, dir }) {
  const L = 2.8
  const body = useMemo(() => bodyGeo(L, 0.4, dolphinShape), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5f7d92', roughness: 0.4, metalness: 0.1 }), [])
  const belly = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e8eef2', roughness: 0.5 }), [])
  const fin = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4a6376', roughness: 0.5, side: THREE.DoubleSide }), [])
  const dorsal = useMemo(() => finGeo([[0.55, 0.36], [0.05, 0.36], [0.28, 0.82]], 0.03), [])
  const flipper = useMemo(() => finGeo([[0.5, -0.1], [0.1, -0.1], [0.3, -0.42]], 0.02), [])
  const tailRef = useRef(), bodyRef = useRef()
  const flukeGeo = useMemo(() => new THREE.SphereGeometry(0.5, 12, 8), [])
  return (
    <Swimmer cx={cx} cz={cz} R={R} speed={speed} depth={-0.7} leap={1.9} phase={phase} dir={dir} tailRef={tailRef} bodyRef={bodyRef}>
      <group ref={bodyRef}>
        <mesh geometry={body} material={mat} castShadow />
        <mesh geometry={dorsal} material={fin} castShadow />
        <mesh geometry={flipper} material={fin} position={[0.2, 0, 0.1]} />
        <mesh geometry={flipper} material={fin} position={[-0.2, 0, 0.1]} rotation={[0, Math.PI, 0]} />
        <mesh position={[0, -0.1, 0.2]} scale={[0.25, 0.12, 0.8]} material={belly} />
        <group ref={tailRef} position={[0, 0, -L / 2]}>
          <mesh position={[-0.28, 0, -0.22]} rotation={[0, 0, -0.1]} scale={[0.36, 0.035, 0.24]} geometry={flukeGeo} material={fin} castShadow />
          <mesh position={[0.28, 0, -0.22]} rotation={[0, 0, 0.1]} scale={[0.36, 0.035, 0.24]} geometry={flukeGeo} material={fin} castShadow />
        </group>
      </group>
    </Swimmer>
  )
}

function Shark({ cx, cz, R, speed, phase, dir, depth = -2.2 }) {
  const L = 4.2
  const body = useMemo(() => bodyGeo(L, 0.52, sharkShape), [])
  const top = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4e5f6e', roughness: 0.45 }), [])
  const belly = useMemo(() => new THREE.MeshStandardMaterial({ color: '#dfe5ea', roughness: 0.5 }), [])
  const fin = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3d4a57', roughness: 0.5, side: THREE.DoubleSide }), [])
  const dorsal = useMemo(() => finGeo([[1.25, 0.46], [0.55, 0.46], [0.8, 1.15]], 0.05), [])
  const upper = useMemo(() => finGeo([[-1.7, 0.05], [-2.35, 0.75], [-2.5, 0.8], [-2.25, 0.02]], 0.05), [])
  const lower = useMemo(() => finGeo([[-1.7, -0.05], [-2.25, -0.4], [-2.35, -0.36], [-2.2, 0.0]], 0.05), [])
  const pectoral = useMemo(() => finGeo([[0.8, -0.15], [0.3, -0.15], [0.5, -0.7]], 0.03), [])
  const tailRef = useRef(), bodyRef = useRef()
  return (
    <Swimmer cx={cx} cz={cz} R={R} speed={speed} depth={depth} phase={phase} dir={dir} tailRef={tailRef} bodyRef={bodyRef}>
      <group ref={bodyRef}>
        <mesh geometry={body} material={top} castShadow />
        <mesh position={[0, -0.12, 0]} scale={[0.5, 0.25, 0.9]} material={belly}><sphereGeometry args={[0.5, 14, 10]} /></mesh>
        <mesh geometry={dorsal} material={fin} castShadow />
        <mesh geometry={pectoral} material={fin} position={[0.2, 0, 0]} />
        <mesh geometry={pectoral} material={fin} position={[-0.2, 0, 0]} rotation={[0, Math.PI, 0]} />
        <group ref={tailRef}>
          <mesh geometry={upper} material={fin} castShadow />
          <mesh geometry={lower} material={fin} castShadow />
        </group>
      </group>
    </Swimmer>
  )
}

function Whale({ cx, cz, R, speed, phase, dir }) {
  const L = 9
  const body = useMemo(() => bodyGeo(L, 1.25, whaleShape), [])
  const back = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2b3a4a', roughness: 0.55 }), [])
  const belly = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d9e2e8', roughness: 0.6 }), [])
  const fin = useMemo(() => new THREE.MeshStandardMaterial({ color: '#23303d', roughness: 0.6, side: THREE.DoubleSide }), [])
  const flukeGeo = useMemo(() => new THREE.SphereGeometry(0.5, 14, 8), [])
  const pectoral = useMemo(() => finGeo([[2.0, -0.4], [1.0, -0.4], [1.5, -1.6]], 0.08), [])
  const tailRef = useRef(), bodyRef = useRef(), spout = useRef()
  useFrame((st) => {
    // blow every ~9 seconds: a short burst of mist above the blowhole
    const t = st.clock.elapsedTime % 9
    const k = t < 1.6 ? t / 1.6 : 0
    if (spout.current) {
      spout.current.visible = k > 0
      spout.current.scale.setScalar(0.2 + k * 1.1)
      spout.current.material.opacity = Math.max(0, 0.7 - k * 0.5)
    }
  })
  const spoutMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#f3fbff', transparent: true, opacity: 0.6, depthWrite: false }), [])
  return (
    <Swimmer cx={cx} cz={cz} R={R} speed={speed} depth={-2.8} phase={phase} dir={dir} tailRef={tailRef} bodyRef={bodyRef} scale={1}>
      <group ref={bodyRef}>
        <mesh geometry={body} material={back} castShadow />
        <mesh position={[0, -0.35, 0.5]} scale={[0.9, 0.5, 4.5]} material={belly}><sphereGeometry args={[0.8, 14, 10]} /></mesh>
        <mesh geometry={pectoral} material={fin} castShadow />
        <mesh geometry={pectoral} material={fin} position={[0, 0, 0]} rotation={[0, Math.PI, 0]} />
        <group ref={tailRef} position={[0, 0, -L / 2]}>
          <mesh position={[-1.1, 0, -0.2]} rotation={[0, 0, -0.08]} scale={[1.2, 0.09, 0.6]} geometry={flukeGeo} material={fin} castShadow />
          <mesh position={[1.1, 0, -0.2]} rotation={[0, 0, 0.08]} scale={[1.2, 0.09, 0.6]} geometry={flukeGeo} material={fin} castShadow />
        </group>
        <mesh ref={spout} position={[0, 1.7, L / 2 - 1.4]} material={spoutMat}><sphereGeometry args={[0.35, 10, 8]} /></mesh>
      </group>
    </Swimmer>
  )
}

// ---------------- the bay ----------------
export default function Ocean() {
  // noBatch: the animals and the water move every frame, so they must not be merged into the static city
  return (
    <group userData={{ noBatch: true }}>
      <Shore />
      <Water />
      <Fish />
      <Dolphin cx={190} cz={-6} R={24} speed={7} phase={0} dir={1} />
      <Dolphin cx={190} cz={-6} R={24} speed={7} phase={Math.PI} dir={1} />
      <Dolphin cx={225} cz={50} R={20} speed={6} phase={1.3} dir={-1} />
      <Shark cx={215} cz={-10} R={42} speed={6} phase={0} dir={1} />
      <Shark cx={260} cz={20} R={36} speed={5} phase={2.2} dir={-1} depth={-3.2} />
      <Whale cx={275} cz={42} R={55} speed={4} phase={0.6} dir={1} />
    </group>
  )
}
