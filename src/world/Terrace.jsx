import { villaMarble } from './VillaInterior.jsx'
import { POOL, ISLE, VY } from '../config/island.js'
import Pool from './Pool.jsx'
import StaffNpcs from '../npc/StaffNpcs.jsx'
import { LaneRopes, JumpBoard, HotTub, PoolFloats, PoolSigns } from './PoolFeatures.jsx'
import { SunLounger, SideTable, Cabana, Parasol, FireBowl, OutdoorShower, DeckPlanter, SunsetBar } from './TerraceFurniture.jsx'
import { NEON } from '../config/theme.js'
import { blackMarble } from './materials.js'
import * as THREE from 'three'
import { useMemo } from 'react'

// Isla Serena terrace: the black-marble pool deck around the pool, in front of the villa.
const v = ISLE.villa
const X0 = (v.x0 + v.x1) / 2 - 15.6, X1 = (v.x0 + v.x1) / 2 + 15.6 // deck width 31.2
const Z0 = v.z1, Z1 = ISLE.platform.z1 - 2.4 // from the villa wall to the platform's collision edge
const { x0, x1, z0, z1, rim } = POOL
const ox0 = x0 - rim, ox1 = x1 + rim, oz0 = z0 - rim, oz1 = z1 + rim
const TOP = VY + 0.02

/** The four deck slabs around the pool (the pool itself is a hole). */
function Deck() {
  const slabs = [[X0, X1, Z0, oz0], [X0, X1, oz1, Z1], [X0, ox0, oz0, oz1], [ox1, X1, oz0, oz1]]
  const mats = useMemo(() => slabs.map(([a, b, c, d]) => villaMarble((b - a) / 3.2, (d - c) / 3.2)), []) // eslint-disable-line react-hooks/exhaustive-deps
  return slabs.map(([a, b, c, d], i) => (
    <mesh key={i} position={[(a + b) / 2, TOP - 0.03, (c + d) / 2]} material={mats[i]} receiveShadow>
      <boxGeometry args={[b - a, 0.06, d - c]} />
    </mesh>
  ))
}

/** Low marble bollards with a teal light along the south edge of the deck, and a teal LED edge line. */
function EdgeLights() {
  const bollard = useMemo(() => blackMarble('#c9a96a', 0.3, 0.6), [])
  const led = useMemo(() => new THREE.MeshStandardMaterial({ color: NEON.teal, emissive: NEON.teal, emissiveIntensity: 2.4, toneMapped: false }), [])
  const cap = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f4efff', emissive: NEON.teal, emissiveIntensity: 1.6, toneMapped: false }), [])
  const xs = [289, 297, 305, 313]
  return (
    <group>
      <mesh position={[(X0 + X1) / 2, TOP + 0.012, Z1 - 0.05]} material={led}><boxGeometry args={[X1 - X0, 0.025, 0.04]} /></mesh>
      {xs.map((x) => (
        <group key={x} position={[x, TOP, Z1 - 0.5]}>
          <mesh position={[0, 0.28, 0]} material={bollard} castShadow><boxGeometry args={[0.22, 0.56, 0.22]} /></mesh>
          <mesh position={[0, 0.58, 0]} material={cap}><boxGeometry args={[0.2, 0.05, 0.2]} /></mesh>
        </group>
      ))}
    </group>
  )
}

export default function Terrace() {
  const Y = TOP
  return (
    <group>
      <Deck />
      <Pool />
      <LaneRopes />
      <JumpBoard />
      <HotTub />
      <PoolFloats />
      <PoolSigns />
      <StaffNpcs />
      <EdgeLights />
      {/* north row, in front of the villa: loungers facing the pool with side tables, either side of the doorway */}
      <SunLounger position={[297.0, Y, -79.3]} yaw={0} accent={1} />
      <SunLounger position={[294.6, Y, -79.3]} yaw={0} accent={2} />
      <SunLounger position={[312.0, Y, -79.3]} yaw={0} accent={3} />
      <SunLounger position={[309.8, Y, -79.3]} yaw={0} accent={1} />
      <SideTable position={[310.9, Y, -79.7]} />
      <SunLounger position={[307.4, Y, -79.3]} yaw={0} accent={0} />
      {/* south row, facing north over the pool, a parasol between each pair */}
      <SunLounger position={[294.2, Y, -69.5]} yaw={Math.PI} accent={1} />
      <SunLounger position={[296.4, Y, -69.5]} yaw={Math.PI} accent={2} />
      <Parasol position={[295.3, Y, -69.5]} color="#f4efff" trim={NEON.pink} />
      <SunLounger position={[305.6, Y, -69.5]} yaw={Math.PI} accent={3} />
      <SunLounger position={[307.8, Y, -69.5]} yaw={Math.PI} accent={0} />
      <Parasol position={[306.7, Y, -69.5]} color="#f4efff" trim={NEON.teal} />
      <FireBowl position={[299.4, Y, -69.4]} />
      <FireBowl position={[302.6, Y, -69.4]} />
      {/* west: two daybed cabanas facing the pool, the steps between them, and a rinse shower */}
      <Cabana position={[288.6, Y, -75.6]} yaw={Math.PI / 2} accent={0} />
      <Cabana position={[288.6, Y, -71.6]} yaw={Math.PI / 2} accent={1} />
      <OutdoorShower position={[291.2, Y, -69.3]} yaw={Math.PI} />
      {/* east: the Sunset Bar */}
      <SunsetBar x={313} y={Y} z={-73.7} />
      {/* planting */}
      <DeckPlanter position={[286.4, Y, -80.3]} kind="areca" />
      <DeckPlanter position={[315.8, Y, -80.3]} kind="areca" />
      <DeckPlanter position={[298.3, Y, -80.3]} kind="fiddle" scale={1.5} />
      <DeckPlanter position={[303.7, Y, -80.3]} kind="fiddle" scale={1.5} />
      <DeckPlanter position={[286.4, Y, -69.2]} kind="fiddle" scale={1.5} />
      <DeckPlanter position={[315.8, Y, -69.2]} kind="fiddle" scale={1.5} />
    </group>
  )
}
