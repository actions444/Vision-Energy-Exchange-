import { useMemo } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface } from './materials.js'
import { nightLit } from '../state/environment.js'
import { BrandSign, Plaque } from './signs.jsx'
import { Bollard, LightAnchor } from './props.jsx'
import { Chair, Speaker, Microphone } from './furniture.jsx'
import { PicnicTable, Pergola, RailFence } from './assets/park/ParkKit.jsx'
import { LOT, GROUND, WALL_Z, WALL_H, CX, CZ, STAGE_Z } from '../config/risingVoices.js'

// Rising Voices: a community/activist clubhouse next to Steel Wolves in Maple Court - an open-air
// meeting yard with a small stage, rows of folding chairs, a mural wall and a flyer table. Same
// honest scope as the two biker lots: a place to gather, no shop, no panel behind it.

export { LOT }

/** A hand-painted picket sign on a stick, planted in the ground near the stage or along the fence. */
function PicketSign({ position, yaw = 0, text, color = '#d6432f' }) {
  const stick = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6b4f3a', roughness: 0.8 }), [])
  const board = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.75 }), [color])
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.55, 0]} material={stick} castShadow><cylinderGeometry args={[0.025, 0.025, 1.1, 6]} /></mesh>
      <mesh position={[0, 1.2, 0]} material={board} castShadow><boxGeometry args={[0.7, 0.42, 0.04]} /></mesh>
      <BrandSign text={text} position={[0, 1.2, 0.03]} width={0.62} color="#f6f2e8" glow={color} size={70} />
    </group>
  )
}

function Stage() {
  const m = getMaterials()
  const deck = useMemo(() => surface('wood', 4, 1.5, { color: '#6b4a32' }), [])
  const w = 7.2, d = 2.6, h = 0.45
  return (
    <group position={[CX, 0, STAGE_Z]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[w / 2, h / 2, d / 2]} position={[0, h / 2, 0]} />
      </RigidBody>
      <mesh position={[0, h - 0.02, 0]} material={deck} castShadow receiveShadow><boxGeometry args={[w, 0.08, d]} /></mesh>
      <mesh position={[0, h / 2 - 0.04, 0]} material={m.blackSteel}><boxGeometry args={[w - 0.1, h - 0.1, d - 0.1]} /></mesh>
      <Microphone position={[0, h, -0.6]} yaw={Math.PI} />
      <Speaker position={[-w / 2 + 0.6, h, d / 2 - 0.4]} yaw={Math.PI * 0.75} />
      <Speaker position={[w / 2 - 0.6, h, d / 2 - 0.4]} yaw={-Math.PI * 0.75} />
    </group>
  )
}

function MuralWall() {
  const plaster = useMemo(() => surface('plaster', (LOT.x1 - LOT.x0) / 4, WALL_H / 2.4, { color: '#e8dfca' }), [])
  const cap = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2a2d', roughness: 0.7 }), [])
  const w = LOT.x1 - LOT.x0
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[w / 2, WALL_H / 2, 0.3]} position={[CX, WALL_H / 2, WALL_Z]} />
      </RigidBody>
      <mesh position={[CX, WALL_H / 2, WALL_Z]} material={plaster} castShadow receiveShadow><boxGeometry args={[w, WALL_H, 0.6]} /></mesh>
      <mesh position={[CX, WALL_H + 0.05, WALL_Z]} material={cap}><boxGeometry args={[w + 0.2, 0.1, 0.7]} /></mesh>
      <BrandSign text="RISING VOICES" sub="COMMUNITY · ACTION · CHANGE" position={[CX, WALL_H - 1.0, WALL_Z - 0.32]} rotation={[0, Math.PI, 0]} width={10} color="#2a2420" glow="#d6432f" />
      <Plaque lines={['RISING VOICES', 'Show up. Speak up. Look out for each other.']} position={[LOT.x0 + 3, 1.5, WALL_Z - 0.32]} rotation={[0, Math.PI, 0]} width={1.3} />
    </group>
  )
}

export default function RisingVoices() {
  const ground = useMemo(() => surface('concrete', (LOT.x1 - LOT.x0) / 5, (LOT.z1 - LOT.z0) / 5, { color: '#8a857a' }), [])
  const w = LOT.x1 - LOT.x0, d = LOT.z1 - LOT.z0
  const cx = CX, cz = CZ
  const rows = useMemo(() => Array.from({ length: 3 }, (_, r) => LOT.z0 + 6 + r * 1.4), [])
  const seats = useMemo(() => Array.from({ length: 6 }, (_, i) => LOT.x0 + 6 + i * 4.2), [])
  return (
    <group>
      <mesh position={[cx, GROUND + 0.006, cz]} rotation={[-Math.PI / 2, 0, 0]} material={ground} receiveShadow><planeGeometry args={[w, d]} /></mesh>
      <RailFence x0={LOT.x0} x1={LOT.x1} z0={LOT.z0} z1={LOT.z1} y={GROUND} gap={[cx - 3, cx + 3]} gapSide="z0" />
      <MuralWall />
      <Stage />
      {/* rows of folding chairs facing the stage */}
      {rows.map((z, r) => seats.map((x, i) => <Chair key={r + ':' + i} position={[x, GROUND, z]} yaw={0} color={r % 2 ? '#d6432f' : '#2f2f33'} label="Sit and listen" />))}
      {/* a pergola-shaded flyer table off to the side */}
      <Pergola position={[LOT.x0 + 4.5, GROUND, LOT.z0 + 3.5]} yaw={0} w={3.4} d={3.2} h={2.5} />
      <PicnicTable position={[LOT.x0 + 4.5, GROUND, LOT.z0 + 3.5]} yaw={Math.PI / 2} />
      <PicketSign position={[LOT.x1 - 3, GROUND, LOT.z0 + 3]} yaw={0.3} text="RISE UP" color="#d6432f" />
      <PicketSign position={[LOT.x1 - 5.2, GROUND, LOT.z0 + 4.4]} yaw={-0.2} text="WE VOTE" color="#1f6fd1" />
      <PicketSign position={[LOT.x1 - 2.2, GROUND, LOT.z0 + 5.4]} yaw={0.1} text="UNITY" color="#2f8a4a" />
      <Bollard position={[cx - 3.2, GROUND, LOT.z0 + 0.6]} />
      <Bollard position={[cx + 3.2, GROUND, LOT.z0 + 0.6]} />
      <LightAnchor position={[cx, WALL_H + 0.6, WALL_Z]} color="#f2e6c8" intensity={22} distance={16} night />
    </group>
  )
}
