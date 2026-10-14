import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface } from './materials.js'
import { nightLit, registerLightAnchor } from '../state/environment.js'
import { useSeats } from '../state/seats.js'

// Street furniture and landscaping shared by the city and buildings. Repeated things
// (trees, shrubs, flowers) are instanced so hundreds of them cost a handful of draw calls.

const rot = (yaw, x, z) => [x * Math.cos(yaw) + z * Math.sin(yaw), -x * Math.sin(yaw) + z * Math.cos(yaw)]
function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }

// ---------------- Trees ----------------
/** @param {{ trees: [number, number, number, number?][] }} props  [x, y, z, scale] */
export function Trees({ trees }) {
  const trunk = useRef(), crown = useRef()
  const trunkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: 0.95 }), [])
  const leafMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.9 }), [])
  const crownGeo = useMemo(() => { const g = new THREE.IcosahedronGeometry(1, 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + (Math.sin(p.getX(i) * 9.1) * Math.cos(p.getZ(i) * 7.3) + Math.sin(p.getY(i) * 11.7)) * 0.07; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k) } g.computeVertexNormals(); return g }, [])
  const blobs = 4
  useEffect(() => {
    const d = new THREE.Object3D(), c = new THREE.Color()
    trees.forEach(([x, y, z, s = 1], i) => {
      d.position.set(x, y + 1.6 * s, z); d.rotation.set(0, hash(i) * 6, 0); d.scale.set(s, s, s); d.updateMatrix()
      trunk.current.setMatrixAt(i, d.matrix)
      for (let b = 0; b < blobs; b++) {
        const a = (b / blobs) * Math.PI * 2 + hash(i + b) * 2
        const r = b === 0 ? 0 : 1.1 * s
        d.position.set(x + Math.cos(a) * r, y + (3.6 + (b === 0 ? 1.1 : hash(i * 3 + b) * 0.8)) * s, z + Math.sin(a) * r)
        const k = (b === 0 ? 1.9 : 1.4 + hash(i + b * 7) * 0.4) * s
        d.scale.set(k, k * 0.85, k); d.rotation.set(hash(b) * 3, hash(i) * 3, 0); d.updateMatrix()
        crown.current.setMatrixAt(i * blobs + b, d.matrix)
        c.setHSL(0.25 + hash(i * 5 + b) * 0.07, 0.38 + hash(i + 9) * 0.18, 0.16 + hash(i * 2 + b) * 0.08)
        crown.current.setColorAt(i * blobs + b, c)
      }
    })
    trunk.current.instanceMatrix.needsUpdate = true
    crown.current.instanceMatrix.needsUpdate = true
    crown.current.instanceColor.needsUpdate = true
  }, [trees])
  return (
    <>
      <instancedMesh ref={trunk} args={[null, null, trees.length]} material={trunkMat} castShadow>
        <cylinderGeometry args={[0.13, 0.22, 3.2, 8]} />
      </instancedMesh>
      <instancedMesh ref={crown} args={[crownGeo, leafMat, trees.length * blobs]} castShadow receiveShadow />
      <RigidBody type="fixed" colliders={false}>
        {trees.map(([x, y, z, s = 1], i) => <CylinderCollider key={i} args={[1.5 * s, 0.25 * s]} position={[x, y + 1.5 * s, z]} />)}
      </RigidBody>
    </>
  )
}

// ---------------- Flower bed ----------------
const FLOWER_COLORS = ['#d6223a', '#f2c230', '#8e4fc9', '#ef6aa8', '#fbfbf5', '#f07a2a', '#3d6fd1']
/** Raised bed with stone curb, mulch, shrubs and flowers. Walkable around, colliders on the curb only. */
export function FlowerBed({ x, z, w, d, y = 0.15, seed = 1, shrubs = true, palette = FLOWER_COLORS }) {
  const flowers = useRef(), leaves = useRef(), bushes = useRef()
  const curb = surface('limestone', 1, 0.2)
  const soil = surface('soil', w / 2, d / 2)
  const area = w * d
  const nF = Math.min(420, Math.floor(area * 9)), nL = Math.floor(nF * 0.7), nB = shrubs ? Math.max(2, Math.floor(area / 4)) : 0
  const petal = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.7 }), [])
  const leaf = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3f6a2a', roughness: 0.9 }), [])
  const bushMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), [])
  useEffect(() => {
    const o = new THREE.Object3D(), c = new THREE.Color()
    const rnd = (i, k) => hash(seed * 1000 + i * 13 + k)
    for (let i = 0; i < nF; i++) {
      // flowers grouped into drifts of one colour
      const drift = Math.floor(rnd(i, 1) * 5)
      o.position.set(x + (rnd(i, 2) - 0.5) * (w - 0.5), y + 0.32 + rnd(i, 3) * 0.18, z + (rnd(i, 4) - 0.5) * (d - 0.5))
      const s = 0.06 + rnd(i, 5) * 0.05
      o.scale.set(s, s * 0.7, s); o.updateMatrix()
      flowers.current.setMatrixAt(i, o.matrix)
      c.set(palette[(drift + Math.floor(o.position.x * 0.7 + o.position.z * 0.4) + seed) % palette.length])
      flowers.current.setColorAt(i, c)
    }
    for (let i = 0; i < nL; i++) {
      o.position.set(x + (rnd(i, 6) - 0.5) * (w - 0.4), y + 0.24, z + (rnd(i, 7) - 0.5) * (d - 0.4))
      o.scale.set(0.12, 0.1 + rnd(i, 8) * 0.1, 0.12); o.rotation.set(0, rnd(i, 9) * 3, 0); o.updateMatrix()
      leaves.current.setMatrixAt(i, o.matrix)
    }
    for (let i = 0; i < nB; i++) {
      const s = 0.35 + rnd(i, 10) * 0.3
      o.position.set(x + (rnd(i, 11) - 0.5) * (w - 1), y + 0.3 + s * 0.6, z + (rnd(i, 12) - 0.5) * (d - 1))
      o.scale.set(s, s * 0.85, s); o.updateMatrix()
      bushes.current.setMatrixAt(i, o.matrix)
      c.setHSL(0.27 + rnd(i, 13) * 0.06, 0.45, 0.2 + rnd(i, 14) * 0.08)
      bushes.current.setColorAt(i, c)
    }
    flowers.current.instanceMatrix.needsUpdate = true
    flowers.current.instanceColor.needsUpdate = true
    leaves.current.instanceMatrix.needsUpdate = true
    if (nB) { bushes.current.instanceMatrix.needsUpdate = true; bushes.current.instanceColor.needsUpdate = true }
  }, [x, z, w, d, y, seed, nF, nL, nB, palette])
  const t = 0.18, h = 0.32
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[w / 2, h / 2, t / 2]} position={[x, y + h / 2, z - d / 2 + t / 2]} />
        <CuboidCollider args={[w / 2, h / 2, t / 2]} position={[x, y + h / 2, z + d / 2 - t / 2]} />
        <CuboidCollider args={[t / 2, h / 2, d / 2]} position={[x - w / 2 + t / 2, y + h / 2, z]} />
        <CuboidCollider args={[t / 2, h / 2, d / 2]} position={[x + w / 2 - t / 2, y + h / 2, z]} />
      </RigidBody>
      {[[0, -d / 2 + t / 2, w, t], [0, d / 2 - t / 2, w, t], [-w / 2 + t / 2, 0, t, d], [w / 2 - t / 2, 0, t, d]].map(([ox, oz, sx, sz], i) => (
        <mesh key={i} position={[x + ox, y + h / 2, z + oz]} material={curb} castShadow receiveShadow><boxGeometry args={[sx, h, sz]} /></mesh>
      ))}
      <mesh position={[x, y + 0.22, z]} rotation={[-Math.PI / 2, 0, 0]} material={soil} receiveShadow><planeGeometry args={[w - t * 2, d - t * 2]} /></mesh>
      <instancedMesh ref={leaves} args={[null, leaf, nL]} receiveShadow><coneGeometry args={[1, 1, 5]} /></instancedMesh>
      <instancedMesh ref={flowers} args={[null, petal, nF]}><icosahedronGeometry args={[1, 0]} /></instancedMesh>
      {nB > 0 && <instancedMesh ref={bushes} args={[null, bushMat, nB]} castShadow><icosahedronGeometry args={[1, 1]} /></instancedMesh>}
    </group>
  )
}

// ---------------- Bench ----------------
export function Bench({ position, yaw = 0, length = 2 }) {
  const m = getMaterials()
  const wood = surface('wood', 1, 0.3)
  const [x, y, z] = position
  useSeats([
    { position: [x + rot(yaw, -length / 4, 0)[0], y + 0.46, z + rot(yaw, -length / 4, 0)[1]], yaw, height: 0.46, label: 'Sit on bench' },
    { position: [x + rot(yaw, length / 4, 0)[0], y + 0.46, z + rot(yaw, length / 4, 0)[1]], yaw, height: 0.46, label: 'Sit on bench' },
  ], [x, y, z, yaw, length])
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[length / 2, 0.42, 0.3]} position={[0, 0.42, -0.05]} />
      {[0, 1, 2].map((i) => <mesh key={i} position={[0, 0.44, 0.17 - i * 0.15]} material={wood} castShadow receiveShadow><boxGeometry args={[length, 0.04, 0.12]} /></mesh>)}
      {[0, 1].map((i) => <mesh key={'b' + i} position={[0, 0.62 + i * 0.16, -0.28]} rotation={[-0.15, 0, 0]} material={wood} castShadow><boxGeometry args={[length, 0.11, 0.035]} /></mesh>)}
      {[-1, 1].map((k) => (
        <group key={k} position={[k * (length / 2 - 0.15), 0, 0]}>
          <mesh position={[0, 0.22, 0.12]} material={m.blackSteel}><boxGeometry args={[0.05, 0.44, 0.05]} /></mesh>
          <mesh position={[0, 0.45, -0.25]} material={m.blackSteel}><boxGeometry args={[0.05, 0.9, 0.05]} /></mesh>
          <mesh position={[0, 0.42, -0.05]} material={m.blackSteel}><boxGeometry args={[0.05, 0.04, 0.5]} /></mesh>
        </group>
      ))}
    </RigidBody>
  )
}

// ---------------- Commercial streetlight ----------------
export function StreetLamp({ position, yaw = 0, height = 7, double = false }) {
  const m = getMaterials()
  const head = m.shared('lampHead', () => nightLit(new THREE.MeshStandardMaterial({ color: '#d9d9d6', emissive: '#ffe7c2', roughness: 0.4 }), 4, 0))
  const arms = double ? [1, -1] : [1]
  useEffect(() => {
    const offs = arms.map((k) => {
      const [ax, az] = rot(yaw, 0, k * 1.6)
      return registerLightAnchor({ position: new THREE.Vector3(position[0] + ax, position[1] + height - 0.6, position[2] + az), color: '#ffdcae', intensity: 38, distance: 20, night: true })
    })
    return () => offs.forEach((f) => f())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position[0], position[2], yaw, double, height])
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CylinderCollider args={[height / 2, 0.14]} position={[0, height / 2, 0]} />
      <mesh position={[0, 0.3, 0]} material={m.blackSteel}><cylinderGeometry args={[0.2, 0.24, 0.6, 12]} /></mesh>
      <mesh position={[0, height / 2, 0]} material={m.blackSteel} castShadow><cylinderGeometry args={[0.07, 0.11, height, 10]} /></mesh>
      {arms.map((k) => (
        <group key={k}>
          <mesh position={[0, height - 0.15, k * 0.8]} rotation={[Math.PI / 2, 0, 0]} material={m.blackSteel}><cylinderGeometry args={[0.04, 0.04, 1.6, 8]} /></mesh>
          <mesh position={[0, height - 0.22, k * 1.6]} material={m.blackSteel}><boxGeometry args={[0.36, 0.1, 0.7]} /></mesh>
          <mesh position={[0, height - 0.28, k * 1.6]} material={head}><boxGeometry args={[0.3, 0.02, 0.6]} /></mesh>
        </group>
      ))}
    </RigidBody>
  )
}

// ---------------- Low path light ----------------
export function Bollard({ position }) {
  const m = getMaterials()
  const glow = m.shared('bollardGlow', () => nightLit(new THREE.MeshStandardMaterial({ color: '#cfcfcf', emissive: '#ffe1b5' }), 3, 0))
  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <CylinderCollider args={[0.45, 0.1]} position={[0, 0.45, 0]} />
      <mesh position={[0, 0.4, 0]} material={m.blackSteel}><cylinderGeometry args={[0.09, 0.1, 0.8, 10]} /></mesh>
      <mesh position={[0, 0.72, 0]} material={glow}><cylinderGeometry args={[0.092, 0.092, 0.1, 10]} /></mesh>
    </RigidBody>
  )
}

// ---------------- Fountain ----------------
export function Fountain({ position, radius = 3 }) {
  const m = getMaterials()
  const stone = surface('limestone', 2, 0.3)
  const water = useRef()
  const spray = useRef()
  const N = 360
  const drops = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const p = new Float32Array(N * 3), v = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 * 7, s = 0.6 + hash(i) * 0.9
      v.set([Math.cos(a) * s, 3.2 + hash(i + 3) * 1.4, Math.sin(a) * s], i * 3)
      p.set([0, -10 - hash(i + 7) * 10, 0], i * 3)
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    g.userData.v = v
    g.userData.t = Float32Array.from({ length: N }, (_, i) => hash(i + 11) * 1.3)
    return g
  }, [])
  useFrame((st, dt) => {
    const t = st.clock.elapsedTime
    if (water.current) water.current.position.y = 0.55 + Math.sin(t * 2) * 0.008
    const pos = drops.attributes.position.array, v = drops.userData.v, life = drops.userData.t
    for (let i = 0; i < N; i++) {
      life[i] += Math.min(dt, 0.05)
      if (life[i] > 1.3) life[i] -= 1.3
      const k = life[i]
      pos[i * 3] = v[i * 3] * k
      pos[i * 3 + 1] = 2.25 + v[i * 3 + 1] * k - 4.9 * k * k
      pos[i * 3 + 2] = v[i * 3 + 2] * k
      if (pos[i * 3 + 1] < 0.55) pos[i * 3 + 1] = -50
    }
    drops.attributes.position.needsUpdate = true
  })
  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <CylinderCollider args={[0.3, radius + 0.25]} position={[0, 0.3, 0]} />
      <CylinderCollider args={[1.1, 0.5]} position={[0, 1.1, 0]} />
      <group userData={{ noBatch: true }}>
      <mesh position={[0, 0.3, 0]} material={stone} castShadow receiveShadow><cylinderGeometry args={[radius + 0.25, radius + 0.35, 0.6, 48, 1, true]} /></mesh>
      <mesh position={[0, 0.6, 0]} rotation={[-Math.PI / 2, 0, 0]} material={stone}><ringGeometry args={[radius - 0.05, radius + 0.25, 48]} /></mesh>
      <mesh ref={water} position={[0, 0.55, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.water}><circleGeometry args={[radius - 0.05, 48]} /></mesh>
      <mesh position={[0, 1.1, 0]} material={stone} castShadow><cylinderGeometry args={[0.35, 0.5, 2.2, 20]} /></mesh>
      <mesh position={[0, 1.6, 0]} material={stone} castShadow><cylinderGeometry args={[1.2, 0.45, 0.25, 32]} /></mesh>
      <mesh position={[0, 1.72, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.water}><circleGeometry args={[1.1, 32]} /></mesh>
      <mesh position={[0, 2.25, 0]} material={stone}><sphereGeometry args={[0.18, 16, 12]} /></mesh>
      <points ref={spray} geometry={drops} frustumCulled={false}>
        <pointsMaterial color="#dcebf2" size={0.07} transparent opacity={0.75} depthWrite={false} />
      </points>
      </group>
    </RigidBody>
  )
}

// ---------------- Parked car ----------------
const CAR_COLORS = ['#1d2a44', '#8b1d22', '#e8e8e6', '#2f3134', '#5d6c78', '#0e0f11', '#6b5232', '#a9acb0']
export function Car({ position, yaw = 0, color }) {
  const m = getMaterials()
  const paint = m.shared('carPaint' + color, () => new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.6, envMapIntensity: 1.2 }))
  const tire = m.shared('tire', () => new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.9 }))
  const tail = m.shared('tail', () => nightLit(new THREE.MeshStandardMaterial({ color: '#5a0a0a', emissive: '#ff2222' }), 1.5, 0.2))
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[0.9, 0.7, 2.2]} position={[0, 0.7, 0]} />
      <mesh position={[0, 0.55, 0]} material={paint} castShadow><boxGeometry args={[1.8, 0.6, 4.4]} /></mesh>
      <mesh position={[0, 1.05, -0.2]} material={paint} castShadow><boxGeometry args={[1.6, 0.5, 2.3]} /></mesh>
      <mesh position={[0, 1.06, -0.2]} material={m.glass}><boxGeometry args={[1.62, 0.42, 2.0]} /></mesh>
      <mesh position={[0, 0.62, -2.21]} material={tail}><boxGeometry args={[1.5, 0.1, 0.02]} /></mesh>
      {[[-0.85, 1.4], [0.85, 1.4], [-0.85, -1.4], [0.85, -1.4]].map(([wx, wz], i) => (
        <mesh key={i} position={[wx, 0.34, wz]} rotation={[0, 0, Math.PI / 2]} material={tire}><cylinderGeometry args={[0.34, 0.34, 0.24, 18]} /></mesh>
      ))}
    </RigidBody>
  )
}

// ---------------- Parking lot ----------------
export function ParkingLot({ x0, x1, z0, z1, y = 0.15 }) {
  const w = x1 - x0, d = z1 - z0
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
  const asphalt = surface('asphalt', w / 6, d / 6)
  const paint = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e9e8e2', roughness: 0.7 }), [])
  const rows = [z0 + 6, z1 - 6]
  const stallW = 2.8
  const n = Math.floor((w - 8) / stallW)
  const cars = useMemo(() => {
    const out = []
    rows.forEach((rz, r) => {
      for (let i = 0; i < n; i++) if (hash(i * 7 + r * 31) > 0.45) out.push([x0 + 4 + (i + 0.5) * stallW, rz, r ? Math.PI : 0, CAR_COLORS[Math.floor(hash(i + r * 5) * CAR_COLORS.length)]])
    })
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x0, x1, z0, z1])
  return (
    <group>
      <mesh position={[cx, y + 0.005, cz]} rotation={[-Math.PI / 2, 0, 0]} material={asphalt} receiveShadow><planeGeometry args={[w, d]} /></mesh>
      {rows.map((rz, r) => Array.from({ length: n + 1 }, (_, i) => (
        <mesh key={r + '-' + i} position={[x0 + 4 + i * stallW, y + 0.01, rz]} rotation={[-Math.PI / 2, 0, 0]} material={paint}><planeGeometry args={[0.12, 5.2]} /></mesh>
      )))}
      {cars.map(([x, z, yaw, color], i) => <Car key={i} position={[x, y, z]} yaw={yaw} color={color} />)}
      {[x0 + w * 0.25, x0 + w * 0.75].map((x) => <StreetLamp key={x} position={[x, y, cz]} yaw={0} double height={8} />)}
    </group>
  )
}

// ---------------- Planter box with shrub ----------------
export function Planter({ position, size = [1.2, 0.6, 1.2] }) {
  const stone = surface('concrete', 0.5, 0.3)
  const bush = getMaterials().shared('planterBush', () => new THREE.MeshStandardMaterial({ color: '#36592a', roughness: 0.9 }))
  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} position={[0, size[1] / 2, 0]} />
      <mesh position={[0, size[1] / 2, 0]} material={stone} castShadow receiveShadow><boxGeometry args={size} /></mesh>
      <mesh position={[0, size[1] + 0.35, 0]} material={bush} castShadow><icosahedronGeometry args={[Math.min(size[0], size[2]) * 0.48, 1]} /></mesh>
    </RigidBody>
  )
}

// ---------------- Grass lawn (walkable) ----------------
export function Lawn({ x0, x1, z0, z1, y = 0.15 }) {
  const w = x1 - x0, d = z1 - z0
  return (
    <mesh position={[(x0 + x1) / 2, y + 0.004, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={surface('grass', w / 5, d / 5)} receiveShadow>
      <planeGeometry args={[w, d]} />
    </mesh>
  )
}

/** Registers a point of light with the shared light pool (no real light object of its own). */
export function LightAnchor({ position, color = '#fff0dc', intensity = 20, distance = 12, night = false, range = 50 }) {
  useEffect(() => registerLightAnchor({ position: new THREE.Vector3(...position), color, intensity, distance, night, range }), [position[0], position[1], position[2], color, distance, night]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}
