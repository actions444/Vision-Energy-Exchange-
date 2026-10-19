import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { surface, getMaterials } from '../materials.js'
import { assetMats } from '../assets/materials.js'
import { Wall, Gate, Block } from '../jobkit.jsx'
import { Pad, TrashCan } from '../assets/park/ParkKit.jsx'
import { Chair, Sofa, Table, Counter, Plant, CeilingLight, Shelf } from '../furniture.jsx'
import { Bench, StreetLamp, Bollard, Atm, Planter } from '../props.jsx'
import { BrandSign } from '../signs.jsx'
import { StaticBatch } from '../batch.jsx'
import { registerInteractable } from '../../state/runtime.js'
import { useStore } from '../../state/store.js'
import { TimeClock } from '../JobCenter.jsx'
import { CURB, AIRPORT } from '../../config/westend.js'

// ============================================================================
// VISION STORMS INTERNATIONAL AIRPORT
// A terminal, control tower, apron and single runway west of the industrial row (Phase 5 of the
// West End). Fully procedural, same kit as the rest of the city. Real here: walking, collision,
// a working terminal door, seating, a time clock and four working jobs (gate agent, TSA officer,
// baggage handler, ramp agent) wired into the same job/pay system as everywhere else, and a
// Departures board you can press E at to "fly" to any notable place already in the world.
// Scenery only: the parked aircraft, security scanner, baggage carousel and control tower are
// static props — nothing here is drivable or flyable (the Skyport's VTOL jets already cover
// flying; see MotorCourt.jsx).
// ============================================================================

const Y = CURB
const A = AIRPORT
const FY = Y + 0.02

/** "Destinations" the departures board can send you to: notable places already in the world,
 *  dressed up as flights. Reuses the same teleport mechanic as the Places menu. */
export const DESTINATIONS = [
  { flight: 'VS 101', to: 'Downtown Avenue', gate: 'A1', pos: [0, 0.3, 10] },
  { flight: 'VS 204', to: 'Energy Exchanges Plaza', gate: 'A2', pos: [-28, 0.3, 48] },
  { flight: 'VS 318', to: 'The Jackpot Exchange (Casino)', gate: 'B1', pos: [95, 0.3, 56] },
  { flight: 'VS 442', to: 'Reign Estate (Mansion)', gate: 'B2', pos: [100, 0.3, -70] },
  { flight: 'VS 507', to: 'Isla Serena (Island resort)', gate: 'A3', pos: [301, 1.2, -83] },
  { flight: 'VS 619', to: 'Emerald Links (golf course)', gate: 'B3', pos: [250, 0.3, 60] },
  { flight: 'VS 733', to: 'Meadowbrook Park (West End)', gate: 'A1', pos: [-167, CURB + 0.2, -34] },
  { flight: 'VS 850', to: 'Vision Motors & Skyport', gate: 'B2', pos: [108, 0.3, -20] },
]

function Scanner({ position, yaw = 0 }) {
  const m = assetMats()
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.08, 1.1, 0.5]} position={[-0.55, 1.1, 0]} />
        <CuboidCollider args={[0.08, 1.1, 0.5]} position={[0.55, 1.1, 0]} />
      </RigidBody>
      {[-0.55, 0.55].map((x) => <mesh key={x} position={[x, 1.05, 0]} material={m.galv} castShadow><boxGeometry args={[0.12, 2.1, 0.6]} /></mesh>)}
      <mesh position={[0, 2.15, 0]} material={m.galv} castShadow><boxGeometry args={[1.3, 0.12, 0.6]} /></mesh>
      <mesh position={[0, 1.4, 0]} material={new THREE.MeshStandardMaterial({ color: '#6fb8ff', emissive: '#6fb8ff', emissiveIntensity: 0.6, transparent: true, opacity: 0.35 })}>
        <boxGeometry args={[1.0, 1.6, 0.03]} />
      </mesh>
    </group>
  )
}

function Carousel({ position }) {
  const m = getMaterials()
  const belt = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2d35', roughness: 0.85 }), [])
  const pts = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2
    return [Math.cos(a) * 2.6, Math.sin(a) * 1.6]
  }), [])
  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[2.9, 0.3, 1.9]} position={[0, 0.3, 0]} />
      </RigidBody>
      {pts.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.42, z]} material={belt} castShadow receiveShadow><boxGeometry args={[0.5, 0.12, 0.5]} /></mesh>
      ))}
      <mesh position={[0, 0.3, 0]} material={m.blackSteel}><cylinderGeometry args={[0.15, 0.15, 0.6, 10]} /></mesh>
      {[[2.0, 1.1, 0.3], [-1.6, -1.1, 0.35], [0.4, -1.5, 0.3]].map(([x, z, s], i) => (
        <mesh key={i} position={[x, 0.58, z]} material={new THREE.MeshStandardMaterial({ color: ['#2a5fb0', '#9a2a3a', '#2a8a5a'][i], roughness: 0.6 })} castShadow>
          <boxGeometry args={[s * 1.4, s, s]} />
        </mesh>
      ))}
    </group>
  )
}

/** A single parked, static airliner — boxy fuselage, swept wings, tail fin, two underwing engines. */
function Aircraft({ position, yaw = 0, livery = '#e9edf2', accent = '#1b3a6e' }) {
  const body = useMemo(() => new THREE.MeshStandardMaterial({ color: livery, roughness: 0.4, metalness: 0.3 }), [livery])
  const trim = useMemo(() => new THREE.MeshStandardMaterial({ color: accent, roughness: 0.5 }), [accent])
  const glass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1a2230', roughness: 0.2, metalness: 0.4 }), [])
  return (
    <group position={position} rotation={[0, yaw, 0]} userData={{ noBatch: true }}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1.4, 1.6, 9]} position={[0, 2.1, 0]} />
        <CuboidCollider args={[7, 0.4, 1.2]} position={[0, 2.4, 0]} />
      </RigidBody>
      {/* fuselage */}
      <mesh position={[0, 2.1, 0]} castShadow receiveShadow material={body}><cylinderGeometry args={[1.35, 1.35, 16, 16]} rotation={[Math.PI / 2, 0, 0]} /></mesh>
      <mesh position={[0, 2.1, -8.6]} rotation={[-Math.PI / 2, 0, 0]} material={body}><coneGeometry args={[1.35, 2.6, 16]} /></mesh>
      <mesh position={[0, 2.1, 8.6]} rotation={[Math.PI / 2, 0, 0]} material={body}><coneGeometry args={[1.35, 2.2, 16]} /></mesh>
      {/* cockpit glass */}
      <mesh position={[0, 2.5, -7.6]} rotation={[0.3, 0, 0]} material={glass}><boxGeometry args={[1.5, 0.5, 1.4]} /></mesh>
      {/* stripe */}
      <mesh position={[0, 1.55, 0]} material={trim}><cylinderGeometry args={[1.36, 1.36, 15, 16]} rotation={[Math.PI / 2, 0, 0]} /></mesh>
      {/* swept wings */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 5, 1.5, 1]} rotation={[0, s * 0.12, s * -0.08]} material={body} castShadow>
          <boxGeometry args={[9, 0.22, 2.4]} />
        </mesh>
      ))}
      {/* underwing engines */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 4.4, 0.75, 1.6]} rotation={[Math.PI / 2, 0, 0]} material={new THREE.MeshStandardMaterial({ color: '#3a3f4a', roughness: 0.4 })} castShadow>
          <cylinderGeometry args={[0.62, 0.62, 2.6, 14]} />
        </mesh>
      ))}
      {/* tail fin + horizontal stabilizers */}
      <mesh position={[0, 3.6, -7.4]} rotation={[0, 0, 0]} material={trim} castShadow><boxGeometry args={[0.2, 3.0, 2.6]} /></mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.6, 2.6, -7.2]} rotation={[0, 0, s * -0.1]} material={body}><boxGeometry args={[3.2, 0.16, 1.4]} /></mesh>
      ))}
      {/* windows strip */}
      <mesh position={[0, 2.5, 0]} material={new THREE.MeshStandardMaterial({ color: '#1a2230', emissive: '#6fb8ff', emissiveIntensity: 0.1 })} userData={{ noBatch: true }}>
        <cylinderGeometry args={[1.36, 1.36, 14, 48, 1, true, -0.55, 0.25]} rotation={[Math.PI / 2, 0, 0]} />
      </mesh>
      {/* landing gear */}
      {[[-1.1, -5], [1.1, -5], [-1.1, 4], [1.1, 4], [0, -0.5]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.55, z]} material={new THREE.MeshStandardMaterial({ color: '#111318' })}><cylinderGeometry args={[0.32, 0.32, 0.3, 10]} /></mesh>
      ))}
    </group>
  )
}

function Windsock({ x, z }) {
  const m = getMaterials()
  const sock = useRef()
  const mats = useMemo(() => [new THREE.MeshStandardMaterial({ color: '#ff7a1a', side: THREE.DoubleSide }), new THREE.MeshStandardMaterial({ color: '#f4f4f0', side: THREE.DoubleSide })], [])
  useFrame(({ clock }) => { if (sock.current) sock.current.rotation.y = Math.sin(clock.elapsedTime * 0.25) * 0.5 + 0.2 })
  return (
    <group position={[x, Y, z]}>
      <RigidBody type="fixed" colliders={false}><CylinderCollider args={[3, 0.1]} position={[0, 3, 0]} /></RigidBody>
      <mesh position={[0, 3, 0]} material={m.blackSteel} castShadow><cylinderGeometry args={[0.05, 0.08, 6, 8]} /></mesh>
      <group ref={sock} position={[0, 6, 0]} userData={{ noBatch: true }}>
        {[0, 1, 2, 3].map((k) => (
          <mesh key={k} position={[0.5 + k * 0.62, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats[k % 2]}>
            <cylinderGeometry args={[0.34 - k * 0.055, 0.4 - k * 0.055, 0.62, 12, 1, true]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function ControlTower() {
  const m = assetMats()
  const g = getMaterials()
  const { x, z, r, h } = A.tower
  const glass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8fe8ff', emissive: '#1a3a40', roughness: 0.05, metalness: 0.2 }), [])
  return (
    <group position={[x, Y, z]}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[h / 2, r]} position={[0, h / 2, 0]} />
      </RigidBody>
      <mesh position={[0, h / 2, 0]} material={g.whitePlaster} castShadow receiveShadow><cylinderGeometry args={[r, r * 1.15, h, 16]} /></mesh>
      <mesh position={[0, h + 1.4, 0]} material={glass} castShadow><cylinderGeometry args={[r * 1.8, r * 1.8, 2.8, 16]} /></mesh>
      <mesh position={[0, h + 2.95, 0]} material={m.galv}><cylinderGeometry args={[r * 1.85, r * 1.85, 0.25, 16]} /></mesh>
      <mesh position={[0, h + 4.5, 0]} material={new THREE.MeshStandardMaterial({ color: '#ff2e9a', emissive: '#ff2e9a', emissiveIntensity: 2 })}>
        <sphereGeometry args={[0.25, 10, 8]} />
      </mesh>
      <BrandSign text="TOWER" position={[0, h - 1, r * 1.16 + 0.03]} rotation={[0, 0, 0]} width={2.2} size={100} color="#dff6ff" glow="#6fb8ff" />
    </group>
  )
}

function RunwayMarkings() {
  const white = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f2f2f2', roughness: 0.6 }), [])
  const cz = (A.runway.z0 + A.runway.z1) / 2
  const dashes = []
  for (let x = A.runway.x0 + 10; x < A.runway.x1 - 10; x += 12) dashes.push(x)
  return (
    <group>
      {dashes.map((x) => <mesh key={x} position={[x, Y + 0.012, cz]} rotation={[-Math.PI / 2, 0, 0]} material={white}><planeGeometry args={[6, 0.9]} /></mesh>)}
      {/* threshold stripes at each end */}
      {[A.runway.x0 + 6, A.runway.x1 - 6].map((x) => (
        <group key={x}>
          {[-14, -8.4, -2.8, 2.8, 8.4, 14].map((dz) => (
            <mesh key={dz} position={[x, Y + 0.012, cz + dz]} rotation={[-Math.PI / 2, 0, 0]} material={white}><planeGeometry args={[2.4, 1.4]} /></mesh>
          ))}
        </group>
      ))}
      {/* runway numbers, painted as simple glyph blocks */}
      <BrandSign text="27" position={[A.runway.x0 + 7, Y + 0.02, cz + 5]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} width={2.4} size={100} color="#f2f2f2" glow="#f2f2f2" flat />
      <BrandSign text="09" position={[A.runway.x1 - 7, Y + 0.02, cz - 5]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]} width={2.4} size={100} color="#f2f2f2" glow="#f2f2f2" flat />
    </group>
  )
}

/** Press E at the departures board to pick a "flight" and teleport there. */
function DeparturesBoard({ position }) {
  useEffect(() => registerInteractable('airport-departures', {
    position: new THREE.Vector3(...position),
    radius: 1.8,
    label: 'Check departures',
    onInteract: () => useStore.getState().openPanel({ type: 'departures' }),
  }), [position])
  const g = getMaterials()
  return (
    <group position={position}>
      <mesh position={[0, 1.3, 0]} material={g.blackSteel} castShadow><boxGeometry args={[3.2, 2.0, 0.12]} /></mesh>
      <mesh position={[0, 1.3, 0.07]} material={new THREE.MeshStandardMaterial({ color: '#07131a', emissive: '#0fe0c0', emissiveIntensity: 0.35 })}>
        <planeGeometry args={[3.0, 1.8]} />
      </mesh>
      <BrandSign text="DEPARTURES" sub="PRESS E · PICK A FLIGHT" position={[0, 2.5, 0.08]} width={3.2} size={100} color="#8fe8ff" glow="#0fe0c0" />
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[-1.2 + i * 0.8, 1.3, 0.075]} material={new THREE.MeshStandardMaterial({ color: '#0fe0c0', emissive: '#0fe0c0', emissiveIntensity: 1 })}>
          <planeGeometry args={[0.6, 0.12]} />
        </mesh>
      ))}
    </group>
  )
}

function Terminal() {
  const g = getMaterials()
  const T = A.terminal
  const floor = useMemo(() => surface('tile', 8, 5, { color: '#dcdfe6' }), [])
  const accent = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0e2a4a', roughness: 0.8 }), [])
  const doorHalf = 2.4, doorAt = -440
  const w = T.x1 - T.x0, d = T.z1 - T.z0, h = 5.4
  const holes = []
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[w / 2, 0.15, d / 2]} position={[(T.x0 + T.x1) / 2, Y - 0.15, (T.z0 + T.z1) / 2]} />
        <CuboidCollider args={[w / 2, 0.15, d / 2]} position={[(T.x0 + T.x1) / 2, Y + h, (T.z0 + T.z1) / 2]} />
      </RigidBody>
      <Wall side="w" rect={T} h={h} t={0.4} ext={g.whitePlaster} int={g.whitePlaster} y={Y} openings={[{ at: -12, half: 9, glass: true, h: 4.6, sill: 0.3 }]} />
      <Wall side="e" rect={T} h={h} t={0.4} ext={g.whitePlaster} int={g.whitePlaster} y={Y} openings={[{ at: -12, half: 9, glass: true, h: 4.6, sill: 0.3 }]} />
      <Wall side="n" rect={T} h={h} t={0.4} ext={g.whitePlaster} int={g.whitePlaster} y={Y} openings={[{ at: (T.x0 + T.x1) / 2, half: 9, glass: true, h: 4.6, sill: 0.3 }]} />
      <Wall side="s" rect={T} h={h} t={0.4} ext={g.whitePlaster} int={g.whitePlaster} y={Y} openings={[{ at: doorAt, half: doorHalf, h: 3.2 }]} />
      <mesh position={[(T.x0 + T.x1) / 2, Y + 0.01, (T.z0 + T.z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={floor} receiveShadow>
        <planeGeometry args={[w - 0.8, d - 0.8]} />
      </mesh>
      <mesh position={[(T.x0 + T.x1) / 2, Y + h - 0.1, (T.z0 + T.z1) / 2]} material={g.whitePlaster}><boxGeometry args={[w - 0.8, 0.2, d - 0.8]} /></mesh>

      <Gate x0={T.x0} x1={T.x1} z0={T.z0} z1={T.z1} pad={10}>
        <BrandSign text="VISION STORMS INTERNATIONAL" sub="TERMINAL" position={[(T.x0 + T.x1) / 2, Y + h + 0.6, T.z1 - 0.3]} rotation={[0, Math.PI, 0]} width={16} size={120} color="#8fe8ff" glow="#ff2fa0" />
        {/* check-in hall */}
        <Counter position={[-460, FY, 2]} yaw={0} length={10} height={1.1} depth={0.9} top="marble" face="#0e2a4a" />
        <TimeClock position={[-456.5, Y, 4]} />
        {[-464, -461.3, -458.6, -455.9].map((x, i) => <Chair key={i} position={[x, FY, 0.4]} yaw={Math.PI} color="#0e2a4a" label="Sit and wait" />)}
        <BrandSign text="CHECK-IN" position={[-460, Y + 3.4, 9.6]} rotation={[0, Math.PI, 0]} width={2.6} color="#0e2a4a" glow="#8fe8ff" />
        {/* security */}
        <Scanner position={[-450, FY, -2]} yaw={0} />
        <Counter position={[-452.6, FY, -4]} yaw={Math.PI / 2} length={4} height={1.0} depth={0.7} top="marble" face="#2a3344" />
        <BrandSign text="SECURITY" position={[-450, Y + 3.4, 9.6]} rotation={[0, Math.PI, 0]} width={2.6} color="#0e2a4a" glow="#6fb8ff" />
        {/* baggage claim */}
        <Carousel position={[-440, FY, 2]} />
        <BrandSign text="BAGGAGE CLAIM" position={[-440, Y + 3.4, 9.6]} rotation={[0, Math.PI, 0]} width={3.2} color="#0e2a4a" glow="#8fe8ff" />
        {/* departures board near the entrance */}
        <DeparturesBoard position={[-444.5, Y, 7]} />
        {/* gate seating, overlooking the apron through the west wall glazing */}
        <Shelf position={[-467.5, FY, -8]} yaw={Math.PI / 2} width={2.0} height={1.8} />
        {[['A', -430], ['B', -420]].map(([label, x]) => (
          <group key={label}>
            <BrandSign text={`GATE ${label}`} position={[x, Y + 3.4, -10.6]} rotation={[0, 0, 0]} width={2.6} color="#0e2a4a" glow="#ff2fa0" />
            <Table position={[x, FY, -7]} size={[1.0, 1.0]} height={0.4} top="marble" />
            {[-1.6, 1.6].map((dx) => <Sofa key={dx} position={[x + dx, FY, -8]} yaw={dx < 0 ? -Math.PI / 2 : Math.PI / 2} length={2.4} color="#0e2a4a" />)}
            <Counter position={[x, FY, -5.6]} yaw={Math.PI} length={3} height={1.0} depth={0.7} top="marble" face="#0e2a4a" />
          </group>
        ))}
        <Plant position={[-467, FY, 7.5]} scale={1.4} />
        <Plant position={[-413, FY, 7.5]} scale={1.4} />
        <CeilingLight position={[-460, Y + h - 0.4, 0]} size={[2.2, 2.2]} intensity={20} distance={14} zone="airport" watts={70} />
        <CeilingLight position={[-440, Y + h - 0.4, -2]} size={[2.2, 2.2]} intensity={20} distance={14} zone="airport" watts={70} />
        <CeilingLight position={[-425, Y + h - 0.4, -7]} size={[2.2, 2.2]} intensity={18} distance={14} zone="airport" watts={60} />
      </Gate>
    </group>
  )
}

export default function Airport() {
  const asphalt = useMemo(() => surface('asphalt', 20, 10, { color: '#2a2c30' }), [])
  const apronMat = useMemo(() => surface('concrete', 14, 10, { color: '#9a9c9f' }), [])
  const bollards = [A.apron.x0 + 2, A.apron.x0 + 12]
  return (
    <>
      <StaticBatch name="airport">
        {/* apron (concrete, in front of the terminal) and runway (asphalt, to the west) */}
        <Pad x0={A.apron.x0} x1={A.apron.x1} z0={A.apron.z0} z1={A.apron.z1} y={Y} mat={apronMat} />
        <Pad x0={A.runway.x0} x1={A.apron.x0} z0={A.runway.z0 + 4} z1={A.runway.z1 - 4} y={Y} mat={apronMat} /> {/* taxiway */}
        <Pad x0={A.runway.x0} x1={A.runway.x1} z0={A.runway.z0} z1={A.runway.z1} y={Y} mat={asphalt} />
        <RunwayMarkings />
        <ControlTower />
        <Windsock x={A.terminal.x1 + 10} z={A.tower.z + 4} />
        {/* parked aircraft on the apron, nose toward the terminal */}
        <Aircraft position={[A.terminal.x0 - 14, Y, -16]} yaw={Math.PI / 2} livery="#e9edf2" accent="#1b3a6e" />
        <Aircraft position={[A.terminal.x0 - 14, Y, 24]} yaw={-Math.PI / 2} livery="#f4f1ea" accent="#ff2e9a" />
        {/* boundary + entrance dressing */}
        {bollards.map((x) => <Bollard key={x} position={[x, Y, A.apron.z1 - 1]} />)}
        <Bench position={[A.apron.x0 + 3, Y, A.apron.z1 - 3]} yaw={0} />
        <TrashCan position={[A.apron.x0 + 6, Y, A.apron.z1 - 3]} />
        <Atm id="atm-airport" position={[-466, Y, 9.4]} yaw={Math.PI} />
        <StreetLamp position={[A.apron.x0 + 2, Y, A.apron.z0 + 2]} yaw={0} height={7} double />
        <StreetLamp position={[A.apron.x0 + 2, Y, A.apron.z1 - 2]} yaw={0} height={7} double />
        <Planter position={[-444, Y, 9.6]} />
        <Planter position={[-436, Y, 9.6]} />
      </StaticBatch>
      <Terminal />
    </>
  )
}
