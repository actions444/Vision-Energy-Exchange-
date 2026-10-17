import { useEffect, useMemo, useState } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, signatureMarble, blackMarble } from './materials.js'
import { Sofa, Table, Rug, DiningSet, CeilingLight } from './furniture.jsx'
import { PottedPlant } from './Vegetation.jsx'
import { BrandSign } from './signs.jsx'
import { SingleDoor, DoubleDoor } from './Door.jsx'
import { Block } from './jobkit.jsx'
import { SunsetBar, OutdoorShower } from './TerraceFurniture.jsx'
import { LightAnchor } from './props.jsx'
import { useEnvTune } from './envTune.js'
import { nightLit } from '../state/environment.js'
import { ISLE, VY } from '../config/island.js'
import { NEON } from '../config/theme.js'

// Isla Serena Pool Lounge, indoors: black marble floor and walls, a dropped ceiling with LED coves,
// a lounge with sofas, the Lagoon Bar, Terrace Dining, and the Changing Rooms with a door, lockers
// and a shower. Everything is placed in world metres; the walls and roof are built in Island.jsx.

const v = ISLE.villa
const IX0 = v.x0 + 0.4, IX1 = v.x1 - 0.4, IZ0 = v.z0 + 0.4, IZ1 = v.z1 - 0.4 // inside faces of the walls
const CX = (v.x0 + v.x1) / 2
const FY = VY + 0.02
const CEIL = VY + v.h - 0.03

let M
const mats = () => {
  if (M) return M
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o })
  M = {
    ceiling: std('#16131d', { roughness: 0.9 }),
    plaster: std('#17141f', { roughness: 0.85 }),
    gold: std('#c9a96a', { roughness: 0.25, metalness: 0.9 }),
    pink: new THREE.MeshStandardMaterial({ color: NEON.pink, emissive: NEON.pink, emissiveIntensity: 2.4, toneMapped: false }),
    teal: new THREE.MeshStandardMaterial({ color: NEON.teal, emissive: NEON.teal, emissiveIntensity: 2.4, toneMapped: false }),
    purple: new THREE.MeshStandardMaterial({ color: NEON.purple, emissive: NEON.purple, emissiveIntensity: 2.6, toneMapped: false }),
    yellow: nightLit(new THREE.MeshStandardMaterial({ color: NEON.yellow, emissive: NEON.yellow, toneMapped: false }), 2.2, 0.8),
    cushionPink: std(NEON.pink, { roughness: 0.9 }),
    cushionTeal: std(NEON.teal, { roughness: 0.9 }),
    cushionYellow: std(NEON.yellow, { roughness: 0.9 }),
    cushionPurple: std(NEON.purple, { roughness: 0.9 }),
    locker: (c) => std(c, { roughness: 0.4, metalness: 0.5 }),
    mirror: new THREE.MeshStandardMaterial({ color: '#c9d4e0', roughness: 0.03, metalness: 1, envMapIntensity: 1.6 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#bcd7e6', roughness: 0.04, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }),
  }
  return M
}

/** The black marble used for the villa's walls and floor: the signature veins, turned down for a large surface. */
const villaMarbles = new Set()
export function villaMarble(rx, ry) {
  const m = signatureMarble(rx, ry).clone()
  m.emissiveIntensity = 0.4
  m.clearcoat = 0.25
  m.roughness = 0.22
  villaMarbles.add(m) // reflects a fraction of the sky (see EnvTune), so it reads black, not like a mirror of the sky
  return m
}
function EnvTune() {
  useEnvTune(() => Array.from(villaMarbles, (m) => [m, 0.22]))
  return null
}

function Ceiling() {
  const m = mats()
  const W = IX1 - IX0, D = IZ1 - IZ0
  const y = CEIL - 0.04
  return (
    <group>
      <mesh position={[CX, CEIL, (IZ0 + IZ1) / 2]} material={m.ceiling}><boxGeometry args={[W, 0.05, D]} /></mesh>
      {/* LED coves: hot pink along the long walls, teal along the ends, a purple ring around the lounge */}
      {[IZ0 + 0.25, IZ1 - 0.25].map((z) => <mesh key={z} position={[CX, y, z]} material={m.pink}><boxGeometry args={[W - 0.6, 0.03, 0.05]} /></mesh>)}
      {[IX0 + 0.25, IX1 - 0.25].map((x) => <mesh key={x} position={[x, y, (IZ0 + IZ1) / 2]} material={m.teal}><boxGeometry args={[0.05, 0.03, D - 0.6]} /></mesh>)}
      {[[295.5, -94.6, 7.2, 5.8]].map(([cx, cz, w, d]) => (
        <group key={cx}>
          {[cz - d / 2, cz + d / 2].map((z) => <mesh key={z} position={[cx, y, z]} material={m.purple}><boxGeometry args={[w, 0.03, 0.04]} /></mesh>)}
          {[cx - w / 2, cx + w / 2].map((x) => <mesh key={x} position={[x, y, cz]} material={m.purple}><boxGeometry args={[0.04, 0.03, d]} /></mesh>)}
        </group>
      ))}
      {[[293, -85], [301, -85], [309, -85], [293, -93], [301, -93], [309, -93]].map(([x, z], i) => (
        <CeilingLight key={i} position={[x, CEIL - 0.04, z]} size={[0.7, 0.7]} intensity={13} distance={12} color={i % 3 === 1 ? '#ffd2e8' : '#ffe6c7'} zone="island" />
      ))}
    </group>
  )
}

function Lounge() {
  const m = mats()
  const tableTop = useMemo(() => villaMarble(0.6, 0.6), [])
  const pillow = (x, y, z, mat, ry = 0) => <mesh position={[x, y, z]} rotation={[0.2, ry, 0]} material={mat} castShadow><boxGeometry args={[0.46, 0.4, 0.14]} /></mesh>
  return (
    <group>
      <Rug position={[295.5, FY, -94.6]} size={[6.8, 5.4]} color="#1a1130" />
      <Sofa position={[295.5, FY, -97.7]} yaw={0} length={4.2} color="#3b1d63" label="Sit on lounge sofa" />
      <Sofa position={[292.5, FY, -94.5]} yaw={Math.PI / 2} length={3.4} color="#0d5558" label="Sit on lounge sofa" />
      <Sofa position={[298.5, FY, -94.5]} yaw={-Math.PI / 2} length={3.4} color="#0d5558" label="Sit on lounge sofa" />
      <Table position={[295.5, FY, -94.6]} size={[1.9, 1.1]} height={0.42} top={tableTop} />
      {/* accent cushions on the sofas */}
      {pillow(294.2, FY + 0.7, -97.2, m.cushionPink)}
      {pillow(296.8, FY + 0.7, -97.2, m.cushionYellow)}
      {pillow(292.9, FY + 0.65, -93.4, m.cushionPink, Math.PI / 2)}
      {pillow(298.1, FY + 0.65, -95.6, m.cushionTeal, Math.PI / 2)}
      <mesh position={[295.5, FY + 0.45, -94.6]} material={m.gold}><cylinderGeometry args={[0.16, 0.16, 0.04, 20]} /></mesh>
      <BrandSign text="POOL LOUNGE" sub="ISLA SERENA" position={[CX, 2.55 + VY, IZ0 + 0.06]} width={5.6} color="#f4efff" glow={NEON.pink} size={150} />
      <mesh position={[CX, 2.55 + VY, IZ0 + 0.03]} material={mats().plaster}><boxGeometry args={[6.2, 1.5, 0.04]} /></mesh>
      <LightAnchor position={[295.5, VY + 2.8, -94.5]} color="#c77bff" intensity={10} distance={9} night />
    </group>
  )
}

/** A small changing-room suite in the front-west corner: partition walls, a door, a bench, lockers and a shower. */
function ChangingRooms() {
  const m = mats()
  const px = 292.6, pz = -87.0 // partition lines
  const H = 3.1
  const door = { z0: -84.8, z1: -83.7 }
  const lockerColors = ['#e0559f', '#2fd0c4', '#9b4fe0', '#ffe83d', '#e0559f']
  return (
    <group>
      {/* partition: east wall with a doorway, and the back wall */}
      <Block position={[px, VY + H / 2, (pz + door.z0) / 2]} size={[0.15, H, door.z0 - pz]} material={m.plaster} />
      <Block position={[px, VY + H / 2, (door.z1 + IZ1) / 2]} size={[0.15, H, IZ1 - door.z1]} material={m.plaster} />
      <Block position={[px, VY + (H + 2.3) / 2, (door.z0 + door.z1) / 2]} size={[0.15, H - 2.3, door.z1 - door.z0]} material={m.plaster} />
      <Block position={[(IX0 + px) / 2, VY + H / 2, pz]} size={[px - IX0, H, 0.15]} material={m.plaster} />
      <mesh position={[px + 0.09, VY + 2.28, (door.z0 + door.z1) / 2]} material={m.gold}><boxGeometry args={[0.03, 0.04, door.z1 - door.z0 + 0.1]} /></mesh>
      <SingleDoor id="door-changing" hinge={[px, VY, door.z0]} width={door.z1 - door.z0} height={2.3} baseYaw={-Math.PI / 2} openAngle={-1.5} label="changing room door" style="black" />
      <BrandSign text="CHANGING ROOMS" sub="SHOWERS · LOCKERS" position={[px + 0.1, VY + 2.65, (door.z0 + door.z1) / 2]} rotation={[0, Math.PI / 2, 0]} width={1.9} color="#f4efff" glow={NEON.teal} size={120} />
      {/* privacy panel over the front window, with a mirror */}
      <Block position={[(IX0 + px) / 2, VY + 1.75, IZ1 - 0.1]} size={[px - IX0, 3.5, 0.12]} material={m.plaster} cast={false} />
      <mesh position={[290.4, VY + 1.55, IZ1 - 0.2]} rotation={[0, Math.PI, 0]} material={m.mirror}><planeGeometry args={[1.8, 1.4]} /></mesh>
      {/* bench against the back partition */}
      <Sofa position={[290.0, FY, pz + 0.55]} yaw={0} length={2.2} color="#14121a" label="Sit on bench" />
      {/* lockers along the west wall */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.27, 0.95, 1.4]} position={[IX0 + 0.28, VY + 0.95, -84.2]} />
      </RigidBody>
      {lockerColors.map((c, i) => (
        <group key={i} position={[IX0 + 0.27, VY, -85.5 + i * 0.56]}>
          <mesh position={[0, 0.95, 0]} material={m.locker('#1b1826')} castShadow><boxGeometry args={[0.5, 1.9, 0.54]} /></mesh>
          <mesh position={[0.26, 0.95, 0]} material={m.locker(c)}><boxGeometry args={[0.02, 1.7, 0.48]} /></mesh>
          <mesh position={[0.28, 1.1, 0.15]} material={m.gold}><boxGeometry args={[0.02, 0.18, 0.025]} /></mesh>
        </group>
      ))}
      {/* shower with a glass screen */}
      <OutdoorShower id="villa-shower-in" position={[291.5, FY, -82.5]} yaw={Math.PI} />
      <mesh position={[291.5 + 0.0, VY + 1.1, -83.5]} material={m.glass} userData={{ noBatch: true }}><boxGeometry args={[1.1, 2.2, 0.04]} /></mesh>
      <LightAnchor position={[290, VY + 2.8, -84.4]} color="#ffe6c7" intensity={9} distance={7} />
    </group>
  )
}

function Dining() {
  const top = useMemo(() => villaMarble(0.5, 0.5), [])
  return (
    <group>
      <DiningSet position={[306.4, FY, -85.6]} round chairs={4} size={1.2} color="#14121a" top={top} />
      <DiningSet position={[309.8, FY, -85.6]} round chairs={4} size={1.2} color="#14121a" top={top} />
      <BrandSign text="TERRACE DINING" sub="TABLES BY THE GLASS" position={[IX1 - 0.06, VY + 3.0, -85.6]} rotation={[0, -Math.PI / 2, 0]} width={2.6} color="#f4efff" glow={NEON.yellow} size={110} />
    </group>
  )
}

export default function VillaInterior() {
  const m = mats()
  const floor = useMemo(() => villaMarble(7, 4.5), [])
  return (
    <group>
      <mesh position={[CX, FY - 0.03, (IZ0 + IZ1) / 2]} material={floor} receiveShadow><boxGeometry args={[IX1 - IX0 + 0.3, 0.06, IZ1 - IZ0 + 0.3]} /></mesh>
      {/* gold skirting round the room */}
      {[[CX, IZ0 + 0.03, IX1 - IX0, 0.03], [CX, IZ1 - 0.03, IX1 - IX0, 0.03]].map(([x, z, w, d], i) => <mesh key={i} position={[x, FY + 0.06, z]} material={m.gold}><boxGeometry args={[w, 0.12, d]} /></mesh>)}
      {[[IX0 + 0.03], [IX1 - 0.03]].map(([x], i) => <mesh key={'s' + i} position={[x, FY + 0.06, (IZ0 + IZ1) / 2]} material={m.gold}><boxGeometry args={[0.03, 0.12, IZ1 - IZ0]} /></mesh>)}
      <EnvTune />
      <Ceiling />
      <Lounge />
      <ChangingRooms />
      <Dining />
      <SunsetBar id="lagoon-bar" x={311.2} y={FY} z={-92.5} length={9} sign="LAGOON BAR" sub="COCKTAILS · MOCKTAILS · BITES" pergola={false} menu="LAGOON BAR · Mango Rum Cooler · Teal Lagoon · Pink Hibiscus Spritz · Yellow Sun Lemonade · small plates (menu only: serving isn't part of this build)" />
      <PottedPlant position={[IX1 - 0.7, FY, IZ1 - 0.7]} kind="areca" scale={1.6} pot="#0b0b0e" />
      <PottedPlant position={[IX0 + 0.7, FY, IZ0 + 0.7]} kind="fiddle" scale={1.6} pot="#0b0b0e" />
      <PottedPlant position={[298.9, FY, IZ0 + 0.55]} kind="fiddle" scale={1.5} pot="#0b0b0e" />
      <PottedPlant position={[303.1, FY, IZ0 + 0.55]} kind="areca" scale={1.5} pot="#0b0b0e" />
      <PottedPlant position={[IX1 - 0.7, FY, IZ0 + 0.7]} kind="fiddle" scale={1.6} pot="#0b0b0e" />
      {/* the entrance: double glass doors onto the terrace */}
      <DoubleDoor id="door-villa" center={[CX, VY, v.z1 - 0.2]} halfWidth={1.3} height={3.2} facing={0} accent="#c9a96a" label="lounge doors" />
      <BrandSign text="POOL LOUNGE" sub="ISLA SERENA · OPEN DAILY" position={[CX, VY + 3.4, IZ1 - 0.06]} rotation={[0, Math.PI, 0]} width={3.2} color="#f4efff" glow={NEON.pink} size={110} />
    </group>
  )
}
