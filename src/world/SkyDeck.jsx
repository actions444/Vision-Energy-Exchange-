import { useMemo } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { blackMarble } from './materials.js'
import { BrandSign } from './signs.jsx'
import { LightAnchor } from './props.jsx'
import { SunLounger, SideTable, Cabana, Parasol, FireBowl, DeckPlanter, SunsetBar } from './TerraceFurniture.jsx'
import { Sofa, Table, Rug } from './furniture.jsx'
import { villaMarble } from './VillaInterior.jsx'
import { ISLE, VY } from '../config/island.js'
import { NEON } from '../config/theme.js'

// Isla Serena Sky Lounge: the villa's roof as a second deck, reached by a real staircase on the west side.
//   - 22 solid steps (0.18 m rise, 0.30 m run) from the terrace up to the roof, with a glass guard on the open side
//   - a roof collider, a marble deck, glass railings with colliders all round (one gap at the top of the stairs)
//   - furniture: a Sky Bar, sofas round a fire bowl, daybed cabanas, loungers, planters
// Roof geometry matches the slab built in Island.jsx (stone cap top at VY + h + 0.46).

const v = ISLE.villa
const CX = (v.x0 + v.x1) / 2
export const ROOF = VY + v.h + 0.46
const RX0 = CX - 15.3, RX1 = CX + 15.3 // roof slab x range
const RZ0 = (v.z0 + v.z1) / 2 + 1.6 - 11.7, RZ1 = (v.z0 + v.z1) / 2 + 1.6 + 11.7 // z range (back to front edge)
const STAIR = { x: RX0 - 0.7, w: 1.5, z0: v.z1 - 0.5, n: 22, run: 0.3 } // stair x centre, width, first step z (counts toward -z)
const RISE = (ROOF - VY) / STAIR.n
const ZTOP = STAIR.z0 - STAIR.n * STAIR.run // z of the far end of the top step
const GATE = [ZTOP + 0.6, ZTOP - 0.9 + 0.0] // the opening in the west rail at the top of the stairs: z from -> to
const UV = { x0: 296, x1: 315, z0: -98.8, z1: -88.4 } // footprint of the upper volume (solid) on the roof

let M
const mats = () => {
  if (M) return M
  M = {
    step: blackMarble('#c9a96a', 0.3, 0.3),
    glass: new THREE.MeshPhysicalMaterial({ color: '#bcd7e6', roughness: 0.04, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
    rail: new THREE.MeshStandardMaterial({ color: '#c9a96a', roughness: 0.25, metalness: 0.9 }),
    ledTeal: new THREE.MeshStandardMaterial({ color: NEON.teal, emissive: NEON.teal, emissiveIntensity: 2.4, toneMapped: false }),
    ledPink: new THREE.MeshStandardMaterial({ color: NEON.pink, emissive: NEON.pink, emissiveIntensity: 2.4, toneMapped: false }),
    plinth: new THREE.MeshStandardMaterial({ color: '#17141f', roughness: 0.6 }),
  }
  return M
}

/** A straight glass guard with a gold top rail and posts: a collider along its length. a, b = [x, z]. */
function Guard({ a, b, y = ROOF, h = 1.1 }) {
  const m = mats()
  const len = Math.hypot(b[0] - a[0], b[1] - a[1])
  const yaw = Math.atan2(-(b[1] - a[1]), b[0] - a[0])
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const posts = Math.max(2, Math.round(len / 2.4) + 1)
  return (
    <group position={[mid[0], y, mid[1]]} rotation={[0, yaw, 0]}>
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[len / 2, h / 2, 0.05]} position={[0, h / 2, 0]} /></RigidBody>
      <mesh position={[0, h / 2, 0]} material={m.glass} userData={{ noBatch: true }}><boxGeometry args={[len, h - 0.1, 0.03]} /></mesh>
      <mesh position={[0, h, 0]} material={m.rail}><boxGeometry args={[len, 0.05, 0.08]} /></mesh>
      {Array.from({ length: posts }, (_, i) => <mesh key={i} position={[-len / 2 + (len * i) / (posts - 1), h / 2, 0]} material={m.rail}><boxGeometry args={[0.05, h, 0.06]} /></mesh>)}
    </group>
  )
}

function Stairs() {
  const m = mats()
  const steps = useMemo(() => Array.from({ length: STAIR.n }, (_, i) => {
    const top = VY + (i + 1) * RISE
    return { z: STAIR.z0 - (i + 0.5) * STAIR.run, top }
  }), [])
  const run = STAIR.n * STAIR.run
  const rise = ROOF - VY
  const ang = Math.atan2(rise, run)
  const L = Math.hypot(run, rise)
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {/* the walking surface is a smooth ramp through the middle of every tread (the character controller's auto-step
            can't reliably climb treads narrower than the capsule); the blocks below only fill the space under it */}
        {steps.map((s, i) => { const h = Math.max(0.05, s.top - VY - RISE * 0.5 - 0.06); return <CuboidCollider key={i} args={[STAIR.w / 2, h / 2, STAIR.run / 2]} position={[STAIR.x, VY + h / 2, s.z]} /> })}
        <CuboidCollider args={[STAIR.w / 2, 0.15, L / 2]} position={[STAIR.x, VY + RISE * 0.5 + (STAIR.n * RISE) / 2 - Math.cos(ang) * 0.15, STAIR.z0 - run / 2 - Math.sin(ang) * 0.15]} rotation={[ang, 0, 0]} />
      </RigidBody>
      {steps.map((s, i) => (
        <group key={i}>
          <mesh position={[STAIR.x, s.top - 0.02, s.z]} material={m.step} castShadow receiveShadow><boxGeometry args={[STAIR.w, 0.04, STAIR.run]} /></mesh>
          <mesh position={[STAIR.x, s.top - RISE / 2, s.z + STAIR.run / 2 - 0.01]} material={m.plinth}><boxGeometry args={[STAIR.w - 0.02, RISE - 0.04, 0.02]} /></mesh>
          <mesh position={[STAIR.x, s.top + 0.003, s.z + STAIR.run / 2 - 0.02]} material={i % 2 ? m.ledTeal : m.ledPink}><boxGeometry args={[STAIR.w - 0.1, 0.012, 0.025]} /></mesh>
        </group>
      ))}
      {/* sloped glass guard on the open (west) side, and a gold handrail on the wall side */}
      <group position={[STAIR.x - STAIR.w / 2 - 0.04, VY + rise / 2 + 0.55, STAIR.z0 - run / 2]} rotation={[ang, 0, 0]}>
        <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.05, 0.55, L / 2]} /></RigidBody>
        <mesh material={m.glass} userData={{ noBatch: true }}><boxGeometry args={[0.03, 1.0, L]} /></mesh>
        <mesh position={[0, 0.52, 0]} material={m.rail}><boxGeometry args={[0.07, 0.05, L]} /></mesh>
      </group>
      <group position={[STAIR.x + STAIR.w / 2 + 0.03, VY + rise / 2 + 0.9, STAIR.z0 - run / 2]} rotation={[ang, 0, 0]}>
        <mesh material={m.rail}><boxGeometry args={[0.05, 0.05, L]} /></mesh>
      </group>
      {/* signage at the foot of the stairs */}
      <mesh position={[v.x0 - 0.04, VY + 2.2, v.z1 - 2.4]} material={m.plinth}><boxGeometry args={[0.04, 0.9, 2.2]} /></mesh>
      <BrandSign text="SKY LOUNGE" sub="STAIRS TO THE ROOF DECK" position={[v.x0 - 0.07, VY + 2.2, v.z1 - 2.4]} rotation={[0, -Math.PI / 2, 0]} width={2.0} color="#f4efff" glow={NEON.teal} size={120} />
    </group>
  )
}

export default function SkyDeck() {
  const m = mats()
  const deckFront = useMemo(() => villaMarble(8, 3), [])
  const deckBack = useMemo(() => villaMarble(3, 3), [])
  const tableTop = useMemo(() => villaMarble(0.6, 0.6), [])
  const Y = ROOF + 0.012
  return (
    <group>
      {/* the roof you can stand on (the roof slab itself had no collider) and the solid upper volume on it */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[(RX1 - RX0) / 2, 0.3, (RZ1 - RZ0) / 2]} position={[CX, ROOF - 0.3, (RZ0 + RZ1) / 2]} />
        <CuboidCollider args={[(UV.x1 - UV.x0) / 2, 1.6, (UV.z1 - UV.z0) / 2]} position={[(UV.x0 + UV.x1) / 2, ROOF + 1.6, (UV.z0 + UV.z1) / 2]} />
      </RigidBody>
      <mesh position={[CX, Y - 0.01, (UV.z1 + RZ1) / 2]} material={deckFront} receiveShadow><boxGeometry args={[RX1 - RX0, 0.02, RZ1 - UV.z1]} /></mesh>
      <mesh position={[(RX0 + UV.x0) / 2, Y - 0.01, (RZ0 + UV.z1) / 2]} material={deckBack} receiveShadow><boxGeometry args={[UV.x0 - RX0, 0.02, UV.z1 - RZ0]} /></mesh>
      <mesh position={[(UV.x1 + RX1) / 2, Y - 0.01, (RZ0 + UV.z1) / 2]} material={deckBack} receiveShadow><boxGeometry args={[RX1 - UV.x1, 0.02, UV.z1 - RZ0]} /></mesh>
      <mesh position={[(UV.x0 + UV.x1) / 2, Y - 0.01, (RZ0 + UV.z0) / 2]} material={deckBack} receiveShadow><boxGeometry args={[UV.x1 - UV.x0, 0.02, UV.z0 - RZ0]} /></mesh>
      <mesh position={[CX, ROOF + 0.015, RZ1 - 0.04]} material={m.ledTeal}><boxGeometry args={[RX1 - RX0, 0.03, 0.05]} /></mesh>

      {/* guards all round; the west side is open at the top of the stairs */}
      <Guard a={[RX0 + 0.05, RZ1 - 0.1]} b={[RX1 - 0.05, RZ1 - 0.1]} />
      <Guard a={[RX1 - 0.1, RZ1 - 0.1]} b={[RX1 - 0.1, RZ0 + 0.1]} />
      <Guard a={[RX1 - 0.05, RZ0 + 0.1]} b={[RX0 + 0.05, RZ0 + 0.1]} />
      <Guard a={[RX0 + 0.1, RZ0 + 0.1]} b={[RX0 + 0.1, GATE[1]]} />
      <Guard a={[RX0 + 0.1, GATE[0]]} b={[RX0 + 0.1, RZ1 - 0.1]} />

      <Stairs />

      {/* furniture */}
      <Rug position={[300.4, ROOF, -82.2]} size={[7.4, 4.6]} color="#1a1130" />
      <Sofa position={[300.4, ROOF, -84.6]} yaw={0} length={3.6} color="#3b1d63" label="Sit on sky sofa" />
      <Sofa position={[296.2, ROOF, -82.0]} yaw={Math.PI / 2} length={3.0} color="#0d5558" label="Sit on sky sofa" />
      <Sofa position={[304.6, ROOF, -82.0]} yaw={-Math.PI / 2} length={3.0} color="#0d5558" label="Sit on sky sofa" />
      <Table position={[300.4, ROOF, -81.8]} size={[1.8, 1.0]} height={0.42} top={tableTop} />
      <FireBowl position={[300.4, ROOF, -79.4]} />
      <Cabana position={[291.0, ROOF, -93.5]} yaw={Math.PI / 2} accent={2} />
      <Cabana position={[291.0, ROOF, -97.5]} yaw={Math.PI / 2} accent={3} />
      <SunLounger position={[291.4, ROOF, -80.2]} yaw={0} accent={0} />
      <SunLounger position={[293.6, ROOF, -80.2]} yaw={0} accent={1} />
      <SideTable position={[292.5, ROOF, -80.6]} />
      <Parasol position={[292.5, ROOF, -78.8]} color="#f4efff" trim={NEON.teal} />
      <SunsetBar id="sky-bar" x={312.4} y={ROOF} z={-82.4} length={4.8} sign="SKY BAR" sub="SUNSET SPRITZ · MOCKTAILS" pergola={false} menu="SKY BAR · Sunset Spritz · Teal Lagoon · Pink Hibiscus Spritz · Yellow Sun Lemonade (menu only: serving isn't part of this build)" />
      <DeckPlanter position={[RX0 + 0.8, ROOF, RZ1 - 0.8]} kind="areca" />
      <DeckPlanter position={[RX1 - 0.8, ROOF, RZ1 - 0.8]} kind="areca" />
      <DeckPlanter position={[RX0 + 0.8, ROOF, RZ0 + 0.8]} kind="fiddle" scale={1.5} />
      <DeckPlanter position={[UV.x0 - 0.8, ROOF, UV.z1 + 0.6]} kind="fiddle" scale={1.5} />
      {/* a marble sign plinth at the top of the stairs */}
      <mesh position={[RX0 + 1.4, ROOF + 0.6, GATE[0] + 1.4]} material={m.plinth} castShadow><boxGeometry args={[0.18, 1.2, 1.6]} /></mesh>
      <BrandSign text="SKY LOUNGE" sub="SUNSET · BAR · VIEWS" position={[RX0 + 1.5, ROOF + 0.7, GATE[0] + 1.4]} rotation={[0, Math.PI / 2, 0]} width={1.5} color="#f4efff" glow={NEON.pink} size={110} />
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.1, 0.6, 0.8]} position={[RX0 + 1.4, ROOF + 0.6, GATE[0] + 1.4]} /></RigidBody>
      <LightAnchor position={[300, ROOF + 2.4, -83]} color="#c77bff" intensity={14} distance={16} night />
      <LightAnchor position={[292, ROOF + 2.4, -95]} color="#ff5cae" intensity={10} distance={12} night />
    </group>
  )
}
