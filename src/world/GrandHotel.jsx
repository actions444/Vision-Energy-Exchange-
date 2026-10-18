import { useEffect, useMemo } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { surface } from './materials.js'
import { Wall, Block } from './jobkit.jsx'
import { Sofa, Table, Rug, Counter, CeilingLight, PendantLight, Plant, Shelf } from './furniture.jsx'
import { Bed, NightStand } from './assets/apartment/furnishings.jsx'
import { Palms, PottedPlant } from './Vegetation.jsx'
import { LightAnchor } from './props.jsx'
import { BrandSign } from './signs.jsx'
import { nightLit } from '../state/environment.js'
import { registerInteractable } from '../state/runtime.js'
import { useStore } from '../state/store.js'
import { HOTEL, HOTEL_Y as VY } from '../config/hotel.js'

// Vision Grand Hotel: a resort on its own islet in the Isla Serena lagoon (west of Royal Films
// 999). Real here: walking, collision, a working front desk you press E at to book and pay for a
// room (ui/HotelPanel.jsx, real credits out of the wallet - config/hotel.js, state/jobs.js
// bookHotel/checkOutHotel). The three room tiers are furnished walk-up displays in the lobby so
// you can see what each one looks like before booking; there is no separate private instanced
// room behind a locked door - booking is an economy transaction, same honest scope as the Jobs
// panel's other purchases (businesses, vehicles).

let M
function mats() {
  if (M) return M
  M = {
    sand: new THREE.MeshStandardMaterial({ color: '#f1eadb', roughness: 1 }),
    paver: surface('limestone', 4, 4, { color: '#e8e0cf' }),
    wallExt: surface('plaster', 4, 2, { color: '#f4ede0' }),
    wallInt: surface('plaster', 4, 2, { color: '#fbf6ec' }),
    roof: new THREE.MeshStandardMaterial({ color: '#2a3a4a', roughness: 0.55, metalness: 0.2 }),
    gold: new THREE.MeshStandardMaterial({ color: '#c9a35a', metalness: 0.85, roughness: 0.3 }),
    led: nightLit(new THREE.MeshStandardMaterial({ color: '#ffe3ad', emissive: '#ffcf8f', emissiveIntensity: 1.8, toneMapped: false }), 1.5, 0.8),
    counterTop: new THREE.MeshPhysicalMaterial({ color: '#efe7d6', roughness: 0.15, metalness: 0.1, clearcoat: 1 }),
    floor: new THREE.MeshStandardMaterial({ color: '#e6dcc6', roughness: 0.2, metalness: 0.05 }),
  }
  return M
}

function RoomDisplay({ x, z0, z1, label, price, color }) {
  const m = mats()
  const cz = (z0 + z1) / 2
  return (
    <group>
      <Rug position={[x, VY + 0.03, cz]} size={[3.4, z1 - z0 - 1]} color={color} />
      <Bed position={[x, VY, z1 - 1.4]} yaw={Math.PI} color={color} size={[1.5, 2.0]} />
      <NightStand position={[x + 1.1, VY, z1 - 2.0]} yaw={0} />
      <PottedPlant position={[x - 1.5, VY, z0 + 0.8]} kind="areca" scale={1.1} />
      <BrandSign text={label} sub={`${price} cr / night`} position={[x, VY + 2.5, cz]} width={3.2} color="#2a2420" glow="#c9a35a" size={110} />
    </group>
  )
}

function FrontDesk({ position }) {
  const m = mats()
  useEffect(() => registerInteractable('hotel-frontdesk', {
    position: new THREE.Vector3(...position),
    radius: 2,
    label: 'Front desk',
    onInteract: () => useStore.getState().openPanel({ type: 'hotel' }),
  }), [position])
  return (
    <group position={position}>
      <Counter position={[0, 0, 0]} length={6} height={1.1} depth={0.9} top="marble" face="#efe7d6" />
      <mesh position={[0, 1.12, 0.46]} material={m.counterTop}><boxGeometry args={[6.1, 0.06, 0.2]} /></mesh>
      <mesh position={[0, 0.4, 0.46]} material={m.led}><boxGeometry args={[5.6, 0.04, 0.02]} /></mesh>
    </group>
  )
}

export default function GrandHotel() {
  const m = mats()
  const P = HOTEL.platform, B = HOTEL.building
  const cx = (B.x0 + B.x1) / 2, cz = (B.z0 + B.z1) / 2
  const rect = { x0: B.x0, x1: B.x1, z0: B.z0, z1: B.z1 }
  const W = B.x1 - B.x0, D = B.z1 - B.z0
  const palms = useMemo(() => [[P.x0 + 3, VY, P.z0 + 3, 0.6, 0.3], [P.x1 - 3, VY, P.z0 + 3, 0.56, 1.4], [P.x0 + 3, VY, P.z1 - 3, 0.58, 2.6], [P.x1 - 3, VY, P.z1 - 3, 0.6, 1.9]], [])
  return (
    <group>
      {/* islet */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[(P.x1 - P.x0) / 2, 0.1, (P.z1 - P.z0) / 2]} position={[(P.x0 + P.x1) / 2, 0.1, (P.z0 + P.z1) / 2]} />
        <CuboidCollider args={[(P.x1 - P.x0) / 2 - 2.4, 0.225, (P.z1 - P.z0) / 2 - 2.4]} position={[(P.x0 + P.x1) / 2, VY - 0.225, (P.z0 + P.z1) / 2]} />
      </RigidBody>
      <mesh position={[(P.x0 + P.x1) / 2, -0.12, (P.z0 + P.z1) / 2]} scale={[(P.x1 - P.x0) / 2 + 3, 0.5, (P.z1 - P.z0) / 2 + 3]} material={m.sand} receiveShadow><sphereGeometry args={[1, 40, 16]} /></mesh>
      <mesh position={[(P.x0 + P.x1) / 2, VY - 0.255, (P.z0 + P.z1) / 2]} material={m.sand} receiveShadow><boxGeometry args={[P.x1 - P.x0 - 4.8, 0.45, P.z1 - P.z0 - 4.8]} /></mesh>
      <mesh position={[(P.x0 + P.x1) / 2, VY - 0.015, (P.z0 + P.z1) / 2]} material={m.paver} receiveShadow><boxGeometry args={[P.x1 - P.x0 - 4.8, 0.03, P.z1 - P.z0 - 4.8]} /></mesh>

      {/* shell */}
      <Wall side="w" rect={rect} h={B.h} t={0.4} ext={m.wallExt} int={m.wallInt} y={VY} />
      <Wall side="e" rect={rect} h={B.h} t={0.4} ext={m.wallExt} int={m.wallInt} y={VY} />
      <Wall side="n" rect={rect} h={B.h} t={0.4} ext={m.wallExt} int={m.wallInt} y={VY} />
      <Wall side="s" rect={rect} h={B.h} t={0.4} ext={m.wallExt} int={m.wallInt} y={VY}
        openings={[{ at: cx, half: 3.2, glass: true, h: 3.8, sill: 0.1 }]} />
      <Block position={[cx, VY + B.h + 0.2, cz]} size={[W + 1.4, 0.4, D + 1.4]} material={m.roof} collide={false} />
      <mesh position={[cx, VY + B.h + 0.42, B.z0 + 0.65]} material={m.led}><boxGeometry args={[W + 1.4, 0.05, 0.05]} /></mesh>
      <mesh position={[B.x0 - 0.65, VY + B.h + 0.42, cz]} material={m.led}><boxGeometry args={[0.05, 0.05, D + 1.4]} /></mesh>
      <mesh position={[B.x1 + 0.65, VY + B.h + 0.42, cz]} material={m.led}><boxGeometry args={[0.05, 0.05, D + 1.4]} /></mesh>

      {/* facade sign + canopy */}
      <Block position={[cx, VY + 4.0, B.z0 - 1.6]} size={[7.2, 0.18, 3.4]} material={m.gold} collide={false} />
      <BrandSign text="VISION GRAND HOTEL" sub="RESORT · SPA · SUITES" position={[cx, VY + B.h - 1.0, B.z0 - 0.02]} width={13} color="#2a2420" glow="#c9a35a" size={120} />

      {/* lobby floor + front desk */}
      <mesh position={[cx, VY + 0.025, cz]} rotation={[-Math.PI / 2, 0, 0]} material={m.floor} receiveShadow><planeGeometry args={[W - 0.5, D - 0.5]} /></mesh>
      <FrontDesk position={[cx, VY, B.z0 + 2.2]} />
      <Rug position={[cx, VY + 0.05, cz + 2]} size={[6, 3]} color="#8a6a3a" />
      <Sofa position={[cx - 2.4, VY, cz + 3.4]} yaw={0} length={2.6} color="#c9a35a" />
      <Sofa position={[cx + 2.4, VY, cz + 3.4]} yaw={0} length={2.6} color="#c9a35a" />
      <Table position={[cx, VY, cz + 2.2]} size={[1.4, 0.8]} height={0.4} top="marble" />
      <Shelf position={[B.x0 + 0.5, VY, cz]} yaw={Math.PI / 2} width={2.2} height={2.0} />

      {/* three room-tier displays, side by side toward the back of the lobby */}
      <RoomDisplay x={B.x0 + 6} z0={B.z1 - 6} z1={B.z1 - 1} label="STANDARD" price={45} color="#6e8aa8" />
      <RoomDisplay x={cx} z0={B.z1 - 6} z1={B.z1 - 1} label="SUITE" price={110} color="#8a6a3a" />
      <RoomDisplay x={B.x1 - 6} z0={B.z1 - 6} z1={B.z1 - 1} label="PENTHOUSE" price={240} color="#5a2a62" />

      <PottedPlant position={[B.x0 + 1.2, VY, B.z0 + 1.2]} kind="fiddle" scale={1.4} />
      <PottedPlant position={[B.x1 - 1.2, VY, B.z0 + 1.2]} kind="areca" scale={1.5} />
      {[cz - 2, cz + 2].map((z, i) => <PendantLight key={i} position={[cx, VY + B.h - 0.05, z]} drop={1.3} color="#ffd9a6" zone="hotel" />)}
      <CeilingLight position={[cx, VY + B.h - 0.05, B.z1 - 3]} size={[2, 2]} intensity={16} distance={12} color="#fff1dc" zone="hotel" />
      <LightAnchor position={[cx, VY + 2.4, B.z0 - 2]} color="#ffcf8f" intensity={20} distance={14} night />
      <Palms palms={palms} />
    </group>
  )
}
