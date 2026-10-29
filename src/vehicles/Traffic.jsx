// NPC traffic on the cross street, and the traffic signals at the avenue intersection.
//
// Cars drive in their lane (right-hand traffic), keep a safe gap to the car ahead, stop for
// red and amber signals at the stop line, and stop for anything in their lane: the player's
// avatar, the player's car or a parked drivable vehicle. They are kinematic bodies with real
// colliders, so the player can't walk or drive through them. At the end of the street they turn
// back in the other lane. Density comes from Settings (off / light / normal).
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { playerState } from '../state/runtime.js'
import { nightLit } from '../state/environment.js'
import { useStore } from '../state/store.js'
import { getMaterials } from '../world/materials.js'
import { vehicleBodies } from './vehicles.js'

const CURB = 0.15
// cross street: z 14..26, centre z = 20. Eastbound (+x) uses z = 23, westbound uses z = 17.
export const LANES = [
  { z: 23, dir: 1 },
  { z: 17, dir: -1 },
]
const END = 112 // turn back here
const STOP = 10.2 // stop lines at x = -10.2 (eastbound) and x = +10.2 (westbound)
const V_MAX = 11 // m/s (~25 mph)
/** Live NPC car list (debugging and tests). */
export const trafficState = { cars: [] }
export const TRAFFIC_DENSITY = { off: 0, light: 5, normal: 10, heavy: 22 }

// ---------------- signals ----------------
// One 32-second cycle: cross street green 13 s, amber 3 s, all red 1 s; avenue green 12 s,
// amber 3 s (all red the rest). Everyone sees the same clock.
const CYCLE = 32
export function signalState(t = performance.now() / 1000) {
  const c = t % CYCLE
  const cross = c < 13 ? 'green' : c < 16 ? 'amber' : 'red'
  const avenue = c >= 17 && c < 29 ? 'green' : c >= 29 ? 'amber' : 'red'
  return { cross, avenue, t: c }
}

const BODY_STYLES = [
  { name: 'sedan', len: 4.8, wid: 1.85, low: 0.62, cab: 0.48, cabLen: 2.3, cabX: -0.2, colors: ['#1d2a44', '#8b1d22', '#e8e8e6', '#2f3134', '#5d6c78'] },
  { name: 'suv', len: 4.9, wid: 1.95, low: 0.8, cab: 0.6, cabLen: 2.9, cabX: -0.4, colors: ['#0e0f11', '#a9acb0', '#3a4a3e', '#6b5232'] },
  { name: 'taxi', len: 4.8, wid: 1.85, low: 0.62, cab: 0.48, cabLen: 2.3, cabX: -0.2, colors: ['#f2c230'], sign: true },
  { name: 'van', len: 5.4, wid: 2.0, low: 0.9, cab: 0.95, cabLen: 3.9, cabX: -0.6, colors: ['#f1f1ee', '#e6e9ec'] },
  { name: 'ev', len: 4.5, wid: 1.85, low: 0.6, cab: 0.5, cabLen: 2.4, cabX: -0.3, colors: ['#4b2a6e', '#2fd3c3', '#ef6aa8', '#e8e8e6'] },
  // emergency vehicles: on patrol/en route, not parked - they drive the same lanes as everyone
  // else but carry a flashing light bar so they read as actively working, not just traffic.
  { name: 'police', len: 4.9, wid: 1.9, low: 0.64, cab: 0.5, cabLen: 2.4, cabX: -0.2, colors: ['#121722'], lightbar: ['#2a63ff', '#ff2a2a'] },
  { name: 'fire', len: 7.0, wid: 2.3, low: 1.05, cab: 1.25, cabLen: 4.0, cabX: -0.9, colors: ['#b3140f'], lightbar: ['#ff2a2a', '#ff2a2a'] },
  { name: 'ems', len: 5.6, wid: 2.05, low: 0.98, cab: 1.1, cabLen: 3.4, cabX: -0.7, colors: ['#f2f0ea'], lightbar: ['#ff2a2a', '#ffffff'] },
]

function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }

export default function Traffic() {
  const density = useStore((s) => s.settings.traffic ?? 'normal')
  const n = TRAFFIC_DENSITY[density] ?? 0
  const cars = useMemo(() => Array.from({ length: n }, (_, i) => {
    const style = BODY_STYLES[i % BODY_STYLES.length]
    return { id: i, style, color: style.colors[Math.floor(hash(i * 3 + 1) * style.colors.length)], lane: i % 2, x: -END + ((i * 2 * END) / Math.max(1, n)) * 0.98 + hash(i) * 6, v: V_MAX * 0.6 }
  }), [n])
  const sim = useRef(cars)
  sim.current = cars
  const bodies = useRef([])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1)
    const list = sim.current
    trafficState.cars = list
    if (!list.length) return
    const sig = signalState()
    // obstacles: the player and every drivable vehicle (driven or parked)
    const obs = [[playerState.position.x, playerState.position.z]]
    for (const { body } of vehicleBodies.values()) { try { const t = body.translation(); obs.push([t.x, t.z]) } catch { /* removed */ } }
    for (const car of list) {
      const L = LANES[car.lane]
      const half = car.style.len / 2
      let gap = Infinity // free distance in front of this car's bumper
      for (const o of list) {
        if (o === car || o.lane !== car.lane) continue
        const d = (o.x - car.x) * L.dir - (half + o.style.len / 2)
        if (d > -half && d < gap) gap = d
      }
      for (const [ox, oz] of obs) {
        if (Math.abs(oz - L.z) > 2.4) continue
        const d = (ox - car.x) * L.dir - half - 1.2
        if (d > -half && d < gap) gap = d
      }
      // signal: stop at the line on red, and on amber when there is room to stop
      const toLine = (-STOP * L.dir - car.x) * L.dir - half // distance from bumper to stop line
      if (sig.cross !== 'green' && toLine > -0.5) {
        const canStop = toLine > (car.v * car.v) / (2 * 5)
        if (sig.cross === 'red' || canStop) gap = Math.min(gap, toLine)
      }
      const minGap = 2.5
      const want = Math.max(0, Math.min(V_MAX, (gap - minGap) * 0.9))
      const a = want > car.v ? 2.2 : -7
      car.v = want > car.v ? Math.min(want, car.v + a * dt) : Math.max(want, car.v + a * dt)
      if (gap < 0.6) car.v = 0
      car.x += car.v * dt * L.dir
      // end of the street: turn back in the other lane if it is clear
      if (car.x * L.dir > END) {
        const other = 1 - car.lane
        const blocked = list.some((o) => o !== car && o.lane === other && Math.abs(o.x - car.x) < 9)
        if (!blocked) { car.lane = other; car.v = 3 } else { car.x = END * L.dir; car.v = 0 }
      }
      const b = bodies.current[car.id]
      if (b) {
        const Lc = LANES[car.lane]
        b.setNextKinematicTranslation({ x: car.x, y: CURB * 0, z: Lc.z })
        b.setNextKinematicRotation(Lc.dir > 0 ? { x: 0, y: 0, z: 0, w: 1 } : { x: 0, y: 1, z: 0, w: 0 })
        car.spin = (car.spin || 0) + (car.v * dt) / 0.34
      }
    }
  })

  return (
    <>
      {cars.map((c) => (
        <RigidBody key={c.id + ':' + n} ref={(b) => (bodies.current[c.id] = b)} type="kinematicPosition" colliders={false} position={[c.x, 0, LANES[c.lane].z]} rotation={[0, LANES[c.lane].dir > 0 ? 0 : Math.PI, 0]} userData={{ npcCar: c.id }}>
          <CuboidCollider args={[c.style.len / 2, (c.style.low + c.style.cab) / 2, c.style.wid / 2]} position={[0, 0.25 + (c.style.low + c.style.cab) / 2, 0]} />
          <NpcCar car={c} />
        </RigidBody>
      ))}
      <Signals />
    </>
  )
}

/** Simple, cheap body: lower shell, cabin with glass, lamps, four turning wheels. Local forward is +x. */
export function NpcCar({ car }) {
  const s = car.style
  const m = getMaterials()
  const paint = m.shared('npcPaint' + car.color, () => new THREE.MeshStandardMaterial({ color: car.color, roughness: 0.28, metalness: 0.6 }))
  const glass = m.shared('npcGlass', () => new THREE.MeshStandardMaterial({ color: '#0f141a', roughness: 0.1, metalness: 0.5 }))
  const tire = m.shared('tire', () => new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.9 }))
  const head = m.shared('npcHead', () => nightLit(new THREE.MeshStandardMaterial({ color: '#e9eef5', emissive: '#fff4dc' }), 3, 0.2))
  const tail = m.shared('npcTail', () => nightLit(new THREE.MeshStandardMaterial({ color: '#4a0608', emissive: '#ff2020' }), 1.8, 0.3))
  const sign = m.shared('taxiSign', () => nightLit(new THREE.MeshStandardMaterial({ color: '#fff7d6', emissive: '#ffe08a' }), 2, 0.4))
  const lightbar = s.lightbar ? s.lightbar.map((c) => m.shared('lightbar:' + c, () => new THREE.MeshStandardMaterial({ color: '#0a0a0c', emissive: c, emissiveIntensity: 0, toneMapped: false }))) : null
  const wheels = useRef([])
  useFrame((state) => {
    for (const w of wheels.current) if (w) w.rotation.z = -(car.spin || 0)
    if (lightbar) {
      const on = Math.floor(state.clock.elapsedTime * 6) % 2 === 0
      lightbar[0].emissiveIntensity = on ? 5 : 0.1
      lightbar[1].emissiveIntensity = on ? 0.1 : 5
    }
  })
  const Lh = s.len / 2, Wh = s.wid / 2, y0 = 0.25
  return (
    <group userData={{ noBatch: true }}>
      <mesh position={[0, y0 + s.low / 2, 0]} material={paint} castShadow><boxGeometry args={[s.len, s.low, s.wid]} /></mesh>
      <mesh position={[s.cabX, y0 + s.low + s.cab / 2, 0]} material={paint} castShadow><boxGeometry args={[s.cabLen, s.cab, s.wid - 0.14]} /></mesh>
      <mesh position={[s.cabX, y0 + s.low + s.cab * 0.55, 0]} material={glass}><boxGeometry args={[s.cabLen + 0.02, s.cab * 0.6, s.wid - 0.1]} /></mesh>
      {[-1, 1].map((k) => (
        <group key={k}>
          <mesh position={[Lh + 0.01, y0 + s.low * 0.7, k * (Wh - 0.3)]} material={head}><boxGeometry args={[0.02, 0.12, 0.38]} /></mesh>
          <mesh position={[-Lh - 0.01, y0 + s.low * 0.75, k * (Wh - 0.2)]} material={tail}><boxGeometry args={[0.02, 0.12, 0.3]} /></mesh>
        </group>
      ))}
      {s.sign && <mesh position={[s.cabX, y0 + s.low + s.cab + 0.12, 0]} material={sign}><boxGeometry args={[0.25, 0.22, 0.7]} /></mesh>}
      {lightbar && (
        <group position={[s.cabX, y0 + s.low + s.cab + 0.08, 0]}>
          <mesh material={m.shared('lightbarBase', () => new THREE.MeshStandardMaterial({ color: '#0a0a0c', roughness: 0.4 }))}><boxGeometry args={[0.6, 0.1, s.wid - 0.3]} /></mesh>
          <mesh position={[0, 0.07, -(s.wid - 0.3) / 4]} material={lightbar[0]}><boxGeometry args={[0.56, 0.08, (s.wid - 0.3) / 2 - 0.02]} /></mesh>
          <mesh position={[0, 0.07, (s.wid - 0.3) / 4]} material={lightbar[1]}><boxGeometry args={[0.56, 0.08, (s.wid - 0.3) / 2 - 0.02]} /></mesh>
        </group>
      )}
      {[[Lh - 0.85, -Wh + 0.1], [Lh - 0.85, Wh - 0.1], [-Lh + 0.85, -Wh + 0.1], [-Lh + 0.85, Wh - 0.1]].map(([x, z], i) => (
        <group key={i} position={[x, 0.34, z]} ref={(g) => (wheels.current[i] = g)}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={tire}><cylinderGeometry args={[0.34, 0.34, 0.24, 14]} /></mesh>
        </group>
      ))}
    </group>
  )
}

// ---------------- traffic signals at the avenue × cross street intersection ----------------
// One pole on each corner, its head facing the traffic that stops there (right-hand traffic).
const POLES = [
  { pos: [-7.6, 27.6], face: -Math.PI / 2, road: 'cross' }, // eastbound traffic arrives from -x
  { pos: [7.6, 12.4], face: Math.PI / 2, road: 'cross' }, // westbound from +x
  { pos: [7.6, 27.6], face: 0, road: 'avenue' }, // northbound (-z) arrives from +z
  { pos: [-7.6, 12.4], face: Math.PI, road: 'avenue' }, // southbound (+z) arrives from -z
]
function Signals() {
  const m = getMaterials()
  const lamps = useRef([])
  const mats = useMemo(() => ['#ff2a1e', '#ffb21e', '#20e070'].map((c) => POLES.map(() => new THREE.MeshStandardMaterial({ color: '#111', emissive: c, emissiveIntensity: 0.05 }))), [])
  useFrame(() => {
    const s = signalState()
    POLES.forEach((p, i) => {
      const st = s[p.road]
      mats[0][i].emissiveIntensity = st === 'red' ? 3 : 0.05
      mats[1][i].emissiveIntensity = st === 'amber' ? 3 : 0.05
      mats[2][i].emissiveIntensity = st === 'green' ? 3 : 0.05
    })
  })
  useEffect(() => () => mats.flat().forEach((x) => x.dispose()), [mats])
  const paint = m.shared('stopPaint', () => new THREE.MeshStandardMaterial({ color: '#ecebe6', roughness: 0.7 }))
  return (
    <RigidBody type="fixed" colliders={false}>
      {/* cross-street stop lines */}
      <mesh position={[-STOP, 0.013, 23]} rotation={[-Math.PI / 2, 0, 0]} material={paint}><planeGeometry args={[0.45, 5.6]} /></mesh>
      <mesh position={[STOP, 0.013, 17]} rotation={[-Math.PI / 2, 0, 0]} material={paint}><planeGeometry args={[0.45, 5.6]} /></mesh>
      {POLES.map((p, i) => (
        <group key={i} position={[p.pos[0], CURB, p.pos[1]]} rotation={[0, p.face, 0]} userData={{ noBatch: true }}>
          <CylinderCollider args={[2.6, 0.14]} position={[0, 2.6, 0]} />
          <mesh position={[0, 2.6, 0]} material={m.blackSteel} castShadow><cylinderGeometry args={[0.09, 0.12, 5.2, 10]} /></mesh>
          {/* mast arm reaches over the lane (local -x); the head faces the approaching traffic (local +z) */}
          <mesh position={[-2.25, 4.75, 0]} rotation={[0, 0, Math.PI / 2]} material={m.blackSteel}><cylinderGeometry args={[0.055, 0.07, 4.5, 8]} /></mesh>
          <group position={[-4.3, 4.15, 0.05]}>
            <mesh position={[0, 0.58, 0]} material={m.blackSteel}><boxGeometry args={[0.04, 0.12, 0.04]} /></mesh>
            <mesh material={m.blackSteel}><boxGeometry args={[0.36, 1.05, 0.3]} /></mesh>
            {[0, 1, 2].map((k) => (
              <mesh key={k} ref={(el) => (lamps.current[i * 3 + k] = el)} position={[0, 0.32 - k * 0.32, 0.16]} rotation={[Math.PI / 2, 0, 0]} material={mats[k][i]}><cylinderGeometry args={[0.11, 0.11, 0.03, 16]} /></mesh>
            ))}
          </group>
        </group>
      ))}
    </RigidBody>
  )
}
