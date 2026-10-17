import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface } from './materials.js'
import { Trees, FlowerBed, StreetLamp, Bollard, LightAnchor } from './props.jsx'
import { BrandSign, Plaque } from './signs.jsx'
import { nightLit } from '../state/environment.js'
import { MOTORS, DRIVE, PADS, BAYS_X, BAY_Z, BIKE_Z, BIKE_X, CURB, ZM } from '../config/motors.js'
import { VEHICLE_SPAWNS, VEHICLE_TYPES } from '../vehicles/vehicles.js'

// Vision Motors & Skyport: a landscaped vehicle court with a steel canopy over the display bays,
// a motorcycle row, two VTOL landing pads and the signs that go with them. The vehicles
// themselves are drivable bodies (vehicles/Vehicle.jsx, vehicles/Jet.jsx) placed on these spots.

export { MOTORS }

function padTexture(label) {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')
  g.fillStyle = '#2b2d31'; g.beginPath(); g.arc(256, 256, 256, 0, Math.PI * 2); g.fill()
  g.strokeStyle = '#f2efe6'; g.lineWidth = 12; g.beginPath(); g.arc(256, 256, 236, 0, Math.PI * 2); g.stroke()
  g.strokeStyle = '#e6b94a'; g.lineWidth = 6; g.setLineDash([26, 18]); g.beginPath(); g.arc(256, 256, 214, 0, Math.PI * 2); g.stroke(); g.setLineDash([])
  g.fillStyle = '#f2efe6'; g.font = '700 190px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText(label, 256, 250)
  g.font = '700 44px sans-serif'; g.fillStyle = '#e6b94a'
  g.fillText('VTOL', 256, 372)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  return t
}

function Pad({ pad, index }) {
  const tex = useMemo(() => padTexture(String(index + 1)), [index])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), [tex])
  const lamp = useMemo(() => nightLit(new THREE.MeshStandardMaterial({ color: '#d8f5e4', emissive: '#58ffa8', roughness: 0.3 }), 3.2, 0.35), [])
  const lamps = useMemo(() => Array.from({ length: 20 }, (_, i) => { const a = (i / 20) * Math.PI * 2; return [Math.cos(a) * (pad.r + 0.5), Math.sin(a) * (pad.r + 0.5)] }), [pad.r])
  return (
    <group position={[pad.x, CURB, pad.z]}>
      <mesh position={[0, 0.011, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat} receiveShadow><circleGeometry args={[pad.r + 0.2, 48]} /></mesh>
      {lamps.map(([x, z], i) => <mesh key={i} position={[x, 0.04, z]} material={lamp}><cylinderGeometry args={[0.1, 0.12, 0.08, 8]} /></mesh>)}
      <LightAnchor position={[pad.x, CURB + 9, pad.z]} color="#dff6ff" intensity={30} distance={22} night range={70} />
    </group>
  )
}

function Bay({ i, spawn, z }) {
  const T = VEHICLE_TYPES[spawn.type]
  const m = getMaterials()
  const tile = useMemo(() => new THREE.MeshStandardMaterial({ color: '#a9a59c', roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), [])
  const edge = useMemo(() => nightLit(new THREE.MeshStandardMaterial({ color: spawn.accent, emissive: spawn.accent, roughness: 0.4 }), 1.6, 0.35), [spawn.accent])
  return (
    <group>
      <mesh position={[BAYS_X, CURB + 0.009, z]} rotation={[-Math.PI / 2, 0, 0]} material={tile} receiveShadow><planeGeometry args={[6.4, 5.3]} /></mesh>
      <mesh position={[BAYS_X + 3.2, CURB + 0.014, z]} material={edge}><boxGeometry args={[0.08, 0.012, 5.3]} /></mesh>
      <mesh position={[BAYS_X - 3.2, CURB + 0.014, z]} material={edge}><boxGeometry args={[0.08, 0.012, 5.3]} /></mesh>
      {/* placard on a low stand at the nose end, facing the aisle */}
      <group position={[BAYS_X + 4.3, CURB, z + 1.9]}>
        <mesh position={[0, 0.5, 0]} material={m.blackSteel} castShadow><boxGeometry args={[0.12, 1.0, 0.12]} /></mesh>
        <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.08, 0.5, 0.5]} position={[0, 0.5, 0]} /></RigidBody>
        <Plaque lines={[T.name.toUpperCase(), T.kind, 'Press E to drive']} position={[0.09, 1.2, 0]} rotation={[0, Math.PI / 2, 0]} width={1.5} />
      </group>
    </group>
  )
}

function Windsock({ x, z }) {
  const m = getMaterials()
  const sock = useRef()
  const mats = useMemo(() => [new THREE.MeshStandardMaterial({ color: '#ff7a1a', side: THREE.DoubleSide }), new THREE.MeshStandardMaterial({ color: '#f4f4f0', side: THREE.DoubleSide })], [])
  useFrame(({ clock }) => { if (sock.current) sock.current.rotation.y = Math.sin(clock.elapsedTime * 0.25) * 0.5 + 0.2 })
  return (
    <group position={[x, CURB, z]}>
      <RigidBody type="fixed" colliders={false}><CylinderCollider args={[3, 0.1]} position={[0, 3, 0]} /></RigidBody>
      <mesh position={[0, 3, 0]} material={m.blackSteel} castShadow><cylinderGeometry args={[0.05, 0.08, 6, 8]} /></mesh>
      <group ref={sock} position={[0, 6, 0]} userData={{ noBatch: true }}>
        {[0, 1, 2, 3].map((k) => (
          <mesh key={k} position={[0.5 + k * 0.62, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats[k % 2]}>
            <cylinderGeometry args={[0.34 - k * 0.055, 0.4 - k * 0.055, 0.62, 12, 1, true]} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.blackSteel}><torusGeometry args={[0.4, 0.025, 6, 16]} /></mesh>
      </group>
    </group>
  )
}

export default function MotorCourt() {
  const m = getMaterials()
  const M = MOTORS
  const cx = (M.x0 + M.x1) / 2, cz = (M.z0 + M.z1) / 2
  const asphalt = useMemo(() => surface('asphalt', (M.x1 - M.x0) / 5, (M.z1 - M.z0) / 5, { color: '#7d8084' }), [])
  const paint = useMemo(() => new THREE.MeshStandardMaterial({ color: '#efeee8', roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), [])
  const yellow = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e3b52c', roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), [])
  const strip = useMemo(() => nightLit(new THREE.MeshStandardMaterial({ color: '#f6f1e2', emissive: '#fff0cf', roughness: 0.4 }), 3.5, 0.2), [])
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c9a24a', roughness: 0.3, metalness: 0.85 }), [])
  const bays = VEHICLE_SPAWNS.filter((s) => s.position[0] === BAYS_X)
  const bikes = VEHICLE_SPAWNS.filter((s) => s.position[2] === BIKE_Z)
  const trees = useMemo(() => [[M.x0 + 2, CURB, M.z0 + 2, 1.0], [M.x0 + 1.2, CURB, M.z1 - 1.2, 1.0], [M.x1 - 2, CURB, M.z1 - 1.5, 1.0], [M.x1 - 2, CURB, M.z0 + 2, 0.95]], [])
  const SZ = ZM(48.8) // the Skyport sign sits between the two pads
  const roofX0 = 86.5, roofX1 = 98, roofZ0 = ZM(68.6), roofZ1 = ZM(31)
  const roofMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c9ccd0', roughness: 0.45, metalness: 0.35 }), [])
  return (
    <group>
      {/* paving */}
      <mesh position={[cx, CURB + 0.006, cz]} rotation={[-Math.PI / 2, 0, 0]} material={asphalt} receiveShadow><planeGeometry args={[M.x1 - M.x0, M.z1 - M.z0]} /></mesh>
      {/* lane markings: centre line down the court, a stop line at the street, directional arrows */}
      <mesh position={[DRIVE.x, CURB + 0.011, (M.z0 + M.z1) / 2 + 0.2]} rotation={[-Math.PI / 2, 0, 0]} material={yellow}><planeGeometry args={[0.14, M.z1 - M.z0 - 3]} /></mesh>
      <mesh position={[DRIVE.x, CURB + 0.011, M.z1 - 1.2]} rotation={[-Math.PI / 2, 0, 0]} material={paint}><planeGeometry args={[DRIVE.w, 0.4]} /></mesh>
      {[ZM(40), ZM(54)].map((z) => <mesh key={z} position={[DRIVE.x - 2.4, CURB + 0.011, z]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} material={paint}><planeGeometry args={[1.8, 0.3]} /></mesh>)}
      {BAY_Z.flatMap((z) => [z - 2.7, z + 2.7]).map((z, i) => <mesh key={i} position={[BAYS_X + 0.2, CURB + 0.011, z]} rotation={[-Math.PI / 2, 0, 0]} material={paint}><planeGeometry args={[6.6, 0.12]} /></mesh>)}
      {bays.map((s, i) => <Bay key={s.id} i={i} spawn={s} z={s.position[2]} />)}

      {/* motorcycle row: a low tiled strip with an accent edge */}
      <mesh position={[(BIKE_X[0] + BIKE_X[3]) / 2, CURB + 0.009, BIKE_Z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[BIKE_X[3] - BIKE_X[0] + 3.4, 3.6]} />
        <meshStandardMaterial color="#a9a59c" roughness={0.55} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </mesh>
      {BIKE_X.map((x, i) => <mesh key={i} position={[x - 1.25, CURB + 0.011, BIKE_Z]} rotation={[-Math.PI / 2, 0, 0]} material={paint}><planeGeometry args={[0.08, 3.4]} /></mesh>)}
      {bikes.map((s) => {
        const T = VEHICLE_TYPES[s.type]
        return (
          <group key={s.id} position={[s.position[0], CURB, BIKE_Z - 1.9]}>
            <mesh position={[0, 0.45, 0]} material={m.blackSteel} castShadow><boxGeometry args={[0.1, 0.9, 0.1]} /></mesh>
            <Plaque lines={[T.name.toUpperCase(), T.kind, 'Press E to ride']} position={[0, 1.05, 0.06]} rotation={[0, 0, 0]} width={1.5} />
          </group>
        )
      })}

      {/* steel canopy over the display bays, with an under-glow strip and warm spots */}
      <mesh position={[(roofX0 + roofX1) / 2, CURB + 5.2, (roofZ0 + roofZ1) / 2]} material={roofMat} castShadow><boxGeometry args={[roofX1 - roofX0, 0.3, roofZ1 - roofZ0]} /></mesh>
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[(roofX1 - roofX0) / 2, 0.15, (roofZ1 - roofZ0) / 2]} position={[(roofX0 + roofX1) / 2, CURB + 5.2, (roofZ0 + roofZ1) / 2]} /></RigidBody>
      <mesh position={[roofX1 - 0.1, CURB + 5.2, (roofZ0 + roofZ1) / 2]} material={gold}><boxGeometry args={[0.16, 0.34, roofZ1 - roofZ0 + 0.04]} /></mesh>
      {[0, 1, 2, 3].map((k) => <mesh key={k} position={[92 + (k - 1.5) * 2.4, CURB + 5.03, (roofZ0 + roofZ1) / 2]} material={strip}><boxGeometry args={[0.2, 0.04, roofZ1 - roofZ0 - 1.2]} /></mesh>)}
      {[36.2, 47.0, 57.8, 68.4].map(ZM).map((z) => (
        <group key={z}>
          <RigidBody type="fixed" colliders={false}><CylinderCollider args={[2.6, 0.22]} position={[roofX1 - 0.6, CURB + 2.6, z]} /></RigidBody>
          <mesh position={[roofX1 - 0.6, CURB + 2.6, z]} material={m.blackSteel} castShadow><cylinderGeometry args={[0.2, 0.22, 5.2, 12]} /></mesh>
        </group>
      ))}
      {[35, 46, 57, 66].map(ZM).map((z) => <LightAnchor key={z} position={[92, CURB + 4.6, z]} color="#fff0dc" intensity={26} distance={13} night range={60} />)}
      {[32, 66].map(ZM).map((z) => <LightAnchor key={'e' + z} position={[102, CURB + 6, z]} color="#fff0dc" intensity={22} distance={14} night range={60} />)}

      {/* entrance arch with the court sign (dark backing so the lettering reads in daylight) */}
      {[DRIVE.x - 6.2, DRIVE.x + 6.2].map((x) => (
        <group key={x}>
          <RigidBody type="fixed" colliders={false}><CylinderCollider args={[3.7, 0.2]} position={[x, CURB + 3.7, M.z1 - 0.6]} /></RigidBody>
          <mesh position={[x, CURB + 3.7, M.z1 - 0.6]} material={m.blackSteel} castShadow><cylinderGeometry args={[0.16, 0.2, 7.4, 10]} /></mesh>
        </group>
      ))}
      <mesh position={[DRIVE.x, CURB + 6.4, M.z1 - 0.6]} material={m.blackSteel} castShadow><boxGeometry args={[13.2, 2.5, 0.3]} /></mesh>
      <BrandSign text="VISION MOTORS & SKYPORT" sub="CARS · BIKES · JETS" position={[DRIVE.x, CURB + 6.4, M.z1 - 0.43]} rotation={[0, 0, 0]} width={8.8} color="#f4f1ea" glow="#ffe2a0" size={104} />
      <BrandSign text="VISION MOTORS & SKYPORT" sub="CARS · BIKES · JETS" position={[DRIVE.x, CURB + 6.4, M.z1 - 0.77]} rotation={[0, Math.PI, 0]} width={8.8} color="#f4f1ea" glow="#ffe2a0" size={104} />

      {/* the jet pads */}
      {PADS.map((p, i) => <Pad key={p.id} pad={p} index={i} />)}
      <Windsock x={116.5} z={SZ} />
      {/* Skyport sign between the pads, readable from both sides */}
      {[SZ - 2, SZ + 2].map((z) => (
        <group key={z} position={[113, CURB, z]}>
          <mesh position={[0, 1.7, 0]} material={m.blackSteel} castShadow><cylinderGeometry args={[0.09, 0.11, 3.4, 8]} /></mesh>
          <RigidBody type="fixed" colliders={false}><CylinderCollider args={[1.7, 0.12]} position={[0, 1.7, 0]} /></RigidBody>
        </group>
      ))}
      <mesh position={[113, CURB + 3.6, SZ]} rotation={[0, Math.PI / 2, 0]} material={m.blackSteel}><boxGeometry args={[4.0, 1.2, 0.2]} /></mesh>
      <BrandSign text="SKYPORT" sub="VTOL JETS · PRESS E TO FLY" position={[112.88, CURB + 3.6, SZ]} rotation={[0, -Math.PI / 2, 0]} width={3.6} color="#dff6ff" glow="#9ad8ff" size={120} />
      <BrandSign text="SKYPORT" sub="VTOL JETS · PRESS E TO FLY" position={[113.12, CURB + 3.6, SZ]} rotation={[0, Math.PI / 2, 0]} width={3.6} color="#dff6ff" glow="#9ad8ff" size={120} />

      {/* edge of the court: bollards on the beach side, planters and trees along the street and south */}
      {Array.from({ length: 12 }, (_, i) => <Bollard key={i} position={[M.x1 + 0.2, CURB, M.z0 + 2 + i * 4]} />)}
      <Trees trees={trees} />
      {[[90, M.z0 + 2.5], [114, M.z0 + 2.5], [112, M.z1 - 0.6], [88.5, M.z1 - 0.6]].map(([x, z], i) => <FlowerBed key={i} x={x} z={z} w={2.6} d={1.2} y={CURB} seed={40 + i} />)}
      <StreetLamp position={[94.6, CURB, M.z1 - 2.2]} yaw={Math.PI / 2} />
      <StreetLamp position={[106, CURB, M.z0 + 1.2]} yaw={-Math.PI / 2} />
      <StreetLamp position={[106, CURB, SZ]} yaw={-Math.PI / 2} />

      {/* a board by the entrance explaining the controls */}
      <group position={[M.x1 - 4, CURB, M.z1 - 2.4]}>
        <mesh position={[0, 0.7, 0]} material={m.blackSteel} castShadow><boxGeometry args={[0.12, 1.4, 0.12]} /></mesh>
        <Plaque lines={['HOW TO DRIVE & FLY', 'Cars: W/S, A/D, Space brakes, E out', 'Jets: W/S thrust, Space up, Shift down', 'F levels / flips, R resets']} position={[0, 1.6, 0.08]} rotation={[0, 0, 0]} width={2.2} />
      </group>
    </group>
  )
}
