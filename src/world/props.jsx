import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface } from './materials.js'
import { nightLit, registerLightAnchor } from '../state/environment.js'
import { useSeats } from '../state/seats.js'
import { canvasTexture } from './canvasText.js'
import { registerInteractable } from '../state/runtime.js'
import { useStore } from '../state/store.js'
export { Trees, FlowerBed, Planter, Lawn } from './flora/Plants.jsx'

// Street furniture and landscaping shared by the city and buildings. Repeated things
// (trees, shrubs, flowers) are instanced so hundreds of them cost a handful of draw calls.

const rot = (yaw, x, z) => [x * Math.cos(yaw) + z * Math.sin(yaw), -x * Math.sin(yaw) + z * Math.cos(yaw)]
function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }

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
  const pool = m.shared('lampPool', () => {
    // a soft warm pool of light on the ground under each lamp head (night only, no real light cost)
    const c = document.createElement('canvas'); c.width = c.height = 128
    const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 4, 64, 64, 64)
    r.addColorStop(0, '#ffffff'); r.addColorStop(0.45, '#9a9a9a'); r.addColorStop(1, '#000000')
    g.fillStyle = r; g.fillRect(0, 0, 128, 128)
    const t = new THREE.CanvasTexture(c)
    return nightLit(new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#ffcf8f', emissiveMap: t, alphaMap: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), 0.42, 0)
  })
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
          <mesh position={[0, 0.025, k * 1.6]} rotation={[-Math.PI / 2, 0, 0]} material={pool} renderOrder={1}><circleGeometry args={[height * 0.7, 24]} /></mesh>
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

// ---------------- ATM ----------------
let atmTex = null
function atmScreen() {
  if (atmTex) return atmTex
  atmTex = canvasTexture(256, 320, (ctx, w, h) => {
    ctx.fillStyle = '#071018'; ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#2fd0c4'; ctx.lineWidth = 3; ctx.strokeRect(10, 10, w - 20, h - 20)
    ctx.fillStyle = '#2fd0c4'; ctx.textAlign = 'center'; ctx.font = '700 22px system-ui'
    ctx.fillText('VSE', w / 2, 70)
    ctx.font = '600 16px system-ui'
    ctx.fillText('ATM', w / 2, 96)
    ctx.fillStyle = '#9fb4c4'; ctx.font = '400 13px system-ui'
    ctx.fillText('Deposit · Withdraw', w / 2, h - 40)
    ctx.fillText('Press E', w / 2, h - 20)
  })
  return atmTex
}
/** A real working ATM: press E to open a panel that moves credits between cash (wallet) and the
 * bank (safe). Give each instance a unique `id`. */
export function Atm({ position, yaw = 0, id }) {
  const m = getMaterials()
  const screenMat = useMemo(() => new THREE.MeshBasicMaterial({ map: atmScreen(), toneMapped: false }), [])
  useEffect(() => {
    if (!id) return
    return registerInteractable(id, {
      position: new THREE.Vector3(position[0], position[1] + 1.0, position[2]),
      radius: 1.6,
      label: 'Use ATM',
      onInteract: () => useStore.getState().openPanel({ type: 'atm', id }),
    })
  }, [id, position]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[0.28, 0.75, 0.22]} position={[0, 0.75, 0]} />
      <mesh position={[0, 0.75, 0]} material={m.blackSteel} castShadow><boxGeometry args={[0.56, 1.5, 0.42]} /></mesh>
      <mesh position={[0, 1.05, 0.215]} material={screenMat}><planeGeometry args={[0.34, 0.42]} /></mesh>
      <mesh position={[0, 0.65, 0.215]} material={m.chrome}><boxGeometry args={[0.3, 0.14, 0.012]} /></mesh>
      <mesh position={[0, 0.45, 0.215]} material={m.darkMetal || m.blackSteel}><boxGeometry args={[0.2, 0.06, 0.02]} /></mesh>
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

/** Registers a point of light with the shared light pool (no real light object of its own). */
export function LightAnchor({ position, color = '#fff0dc', intensity = 20, distance = 12, night = false, range = 50 }) {
  useEffect(() => registerLightAnchor({ position: new THREE.Vector3(...position), color, intensity, distance, night, range }), [position[0], position[1], position[2], color, distance, night]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}
