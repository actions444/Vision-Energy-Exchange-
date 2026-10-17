import { useMemo } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { surface } from '../materials.js'
import { assetMats } from '../assets/materials.js'
import { Builder } from '../facade/kit.js'
import { Pad, TrashCan, DrinkingFountain } from '../assets/park/ParkKit.jsx'
import { ChainLinkFence } from '../assets/sports/SportsKit.jsx'
import { MetalBuilding, SteelDoor, RollOffBin, SafetyBollards, indMats, NearGate } from '../assets/industrial/IndustrialKit.jsx'
import { LandfillGround, DebrisField, BoomGate, ScaleDeck, GasFlare, Windsock, MonitorWells, TyreStacks, TrackedMachine } from '../assets/industrial/LandfillKit.jsx'
import { heightAt, POND } from '../assets/industrial/landfillTerrain.js'
import { Table, Chair, Counter, Shelf, CeilingLight, Plant } from '../furniture.jsx'
import { LightSwitch } from '../Interior.jsx'
import { StreetLamp, Bench, Bollard } from '../props.jsx'
import { Trees } from '../flora/Plants.jsx'
import { StaticBatch } from '../batch.jsx'
import { BrandSign } from '../signs.jsx'
import { CURB, LANDFILL, BOULEVARD } from '../../config/westend.js'

// Cedar Ridge Landfill + recycling drop-off (Phase 3, south-west block).
// Real here: walking, collision, the personnel gate, scale-house / site-office / shed / attendant-hut doors, lowering and raising the boom
// gates, power switches, and walkable earth mounds with haul roads. Scenery only: the weighbridge does not weigh, nothing is
// dumped or collected, machines and bins do not move, there is no sliding vehicle gate leaf (the vehicle entrance is open between
// gate posts) and no vehicles are provided.

const Y = CURB
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }
const F = LANDFILL.fence, RC = LANDFILL.recycling

/** A drivable ramp up the 15 cm kerb from the boulevard (rises toward +z). Collider and visual. */
function KerbRamp({ x0, x1, zEdge = 26, len = 3.2 }) {
  const A = assetMats()
  const ang = Math.atan2(CURB, len), w = x1 - x0
  const pos = [(x0 + x1) / 2, CURB / 2 - 0.05, zEdge - len / 2]
  return (
    <group>
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[w / 2, 0.05, len / 2 + 0.02]} position={pos} rotation={[-ang, 0, 0]} /></RigidBody>
      <mesh position={pos} rotation={[-ang, 0, 0]} material={A.f.concrete} receiveShadow><boxGeometry args={[w, 0.1, len + 0.04]} /></mesh>
    </group>
  )
}

function StallLines({ x0, z0, n = 6, pitch = 2.7, len = 5, y, flip = false }) {
  const A = assetMats()
  const geo = useMemo(() => {
    const B = new Builder()
    for (let i = 0; i <= n; i++) B.quad('l', x0 + i * pitch, y + 0.03, z0 + len / 2, 0.12, len, 0, { up: true })
    B.quad('l', x0 + (n * pitch) / 2, y + 0.03, flip ? z0 : z0 + len, n * pitch, 0.12, 0, { up: true })
    return B.merged()
  }, [x0, z0, n, pitch, len, y, flip])
  return <mesh geometry={geo.l} material={A.paintWhite} receiveShadow />
}

/** Desk + chair + monitor; the chair is a real seat. */
function Desk({ x, z, y, yaw = 0 }) {
  const mon = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0d1a14', emissive: '#4de3a0', emissiveIntensity: 0.4 }), [])
  const s = Math.sin(yaw), c = Math.cos(yaw)
  return (
    <group>
      <Table position={[x, y, z]} yaw={yaw} size={[1.5, 0.75]} height={0.75} top="wood" />
      <mesh position={[x + s * 0.1, y + 0.95, z + c * 0.1]} rotation={[0, yaw, 0]} material={mon}><boxGeometry args={[0.5, 0.3, 0.04]} /></mesh>
      <mesh position={[x + s * 0.1, y + 0.8, z + c * 0.1]} material={assetMats().rail}><boxGeometry args={[0.08, 0.1, 0.08]} /></mesh>
      <Chair position={[x - s * 0.9, y, z - c * 0.9]} yaw={yaw} color="#33414b" label="Sit at the desk" />
    </group>
  )
}

export default function WasteDistrict() {
  const A = assetMats(), M = indMats()
  const gx = LANDFILL.gateX
  const asphalt = useMemo(() => surface('asphalt', 1 / 4.33, 1 / 4.33), [])
  const conc = useMemo(() => surface('concrete', 1 / 3, 1 / 3, { color: '#bdbab3' }), [])
  const tileMat = useMemo(() => surface('tile', 1 / 0.6, 1 / 0.6, { color: '#b9b5aa', roughness: 0.4 }), [])
  const trees = useMemo(() => {
    const out = []
    for (let x = -386; x <= -330; x += 11) if (Math.abs(x + 338) > 5) out.push([x + hash(x) * 2, Y, 116.0, 1.0 + hash(x + 3) * 0.2])
    for (let z = 64; z <= 112; z += 12) out.push([-320.2, Y, z + hash(z) * 3, 0.95 + hash(z + 3) * 0.2])
    return out
  }, [])
  const lamps = [[-374.8, 36], [-361.6, 52], [-352, 48], [-352, 36]]
  return (
    <>
      <StaticBatch name="waste-district">
        {/* ---------------- ground of the gate strip ---------------- */}
        <Pad x0={F.x0} x1={F.xStrip} z0={F.z0} z1={F.zMid} y={Y} mat={A.gravel} lift={0.006} />
        <Pad x0={gx - 5} x1={gx + 5} z0={26} z1={F.zMid} y={Y} mat={asphalt} lift={0.012} />
        <Pad x0={-378.6} x1={-373} z0={44.5} z1={57.8} y={Y} mat={conc} lift={0.014} />
        <Pad x0={-378.2} x1={-376.6} z0={28.6} z1={42.3} y={Y} mat={conc} lift={0.014} />
        <Pad x0={-385} x1={-376.6} z0={40.7} z1={42.3} y={Y} mat={conc} lift={0.014} />
        <Pad x0={-384.8} x1={-383.2} z0={40} z1={46} y={Y} mat={conc} lift={0.014} />
        {/* staff / visitor lot */}
        <Pad x0={-363} x1={-345} z0={38} z1={57} y={Y} mat={A.lot} lift={0.012} />
        <StallLines x0={-360.5} z0={38.4} n={6} y={Y} />
        <StallLines x0={-360.5} z0={51.6} n={6} y={Y} flip />
        {/* island between the lanes */}
        <mesh position={[gx, Y + 0.075, 44.5]} material={A.f.concrete} receiveShadow castShadow><boxGeometry args={[3.2, 0.15, 23]} /></mesh>
        <mesh position={[gx, Y + 0.16, 33.2]} material={M.hazard}><boxGeometry args={[3.0, 0.02, 0.5]} /></mesh>
        {/* lane stop bars and arrows */}
        <ScaleDeck x={-371.3} z={46} y={Y} w={3.2} l={14} />
        <ScaleDeck x={-364.7} z={46} y={Y} w={3.2} l={14} />
        {/* ---------------- entrance gantry with sign ---------------- */}
        {[-374.8, -361.2].map((x) => <mesh key={x} position={[x, Y + 3.3, 28.4]} material={M.steelDark} castShadow><boxGeometry args={[0.32, 6.6, 0.32]} /></mesh>)}
        <mesh position={[gx + 0.8, Y + 5.55, 28.4]} material={M.steelDark} castShadow><boxGeometry args={[14, 1.5, 0.4]} /></mesh>
        <BrandSign text="CEDAR RIDGE LANDFILL" sub="ALL LOADS WEIGHED · NO HAZARDOUS WASTE" position={[gx + 0.8, Y + 5.55, 28.17]} rotation={[0, Math.PI, 0]} width={9.6} size={110} color="#f4f1ea" />
        <BrandSign text="CEDAR RIDGE LANDFILL" position={[gx + 0.8, Y + 5.55, 28.63]} width={9.6} size={110} color="#f4f1ea" />
        <SafetyBollards y={Y} pts={[[-375.2, 31], [-360.8, 31], [-375.2, 57.2], [-360.8, 57.2]]} />
        {/* personnel entrance notice */}
        <mesh position={[-379.6, Y + 1.2, 28.5]} material={M.steelDark} castShadow><boxGeometry args={[0.1, 2.4, 0.1]} /></mesh>
        <BrandSign text="PERSONNEL ENTRANCE" sub="SIGN IN AT THE SITE OFFICE · HARD HATS BEYOND THE YARD" position={[-379.6, Y + 1.75, 28.28]} rotation={[0, Math.PI, 0]} width={2.4} size={90} color="#f4f1ea" />
        {lamps.map(([x, z], i) => <StreetLamp key={i} position={[x, Y, z]} yaw={x < gx ? Math.PI / 2 : -Math.PI / 2} height={6} />)}
        <Bench position={[-376.2, Y, 36]} yaw={-Math.PI / 2} length={1.8} />
        <TrashCan position={[-376.4, Y, 41]} />
        {/* ---------------- recycling drop-off ground ---------------- */}
        <Pad x0={RC.x0} x1={RC.x1} z0={RC.z0} z1={RC.z1} y={Y} mat={M.yard} lift={0.006} />
        <Pad x0={-337} x1={-329} z0={26} z1={RC.z1 - 4.5} y={Y} mat={asphalt} lift={0.012} />
        <Pad x0={-337} x1={-329} z0={RC.z1 - 6} z1={RC.z1 - 4.5} y={Y} mat={M.yard} lift={0.013} />
        {/* ---------------- fences ---------------- */}
        <ChainLinkFence x0={F.x0} x1={F.xStrip} z0={F.z0} z1={F.zMid} y={Y} h={2.4}
          gaps={[{ side: 'z1', a: F.x0 - 1, b: F.xStrip + 1 }, { side: 'z0', a: -374.4, b: -361.6 }, { side: 'z0', a: -378, b: -376.8 }]} />
        <ChainLinkFence x0={F.x0} x1={F.x1} z0={F.zMid} z1={F.z1} y={Y} h={2.4} gaps={[{ side: 'z0', a: F.x0 - 1, b: F.xStrip }]} />
        <ChainLinkFence x0={RC.x0} x1={RC.x1} z0={RC.z0} z1={RC.z1} y={Y} h={2.2}
          gaps={[{ side: 'x0', a: RC.z0 - 1, b: RC.z1 + 1 }, { side: 'z1', a: RC.x0 - 1, b: RC.x1 + 1 }, { side: 'z0', a: -337, b: -329 }]} />
        <ChainLinkFence x0={POND.x - 8.5} x1={POND.x + 8.5} z0={POND.z - 8.5} z1={POND.z + 8.5} y={Y + 0.3} h={2.0} />
        <mesh position={[POND.x, Y + 1.7, POND.z - 8.4]} material={M.safetyRed}><boxGeometry args={[0.06, 0.06, 0.06]} /></mesh>
        <BrandSign text="DANGER · LEACHATE POND" sub="KEEP OUT · NO SWIMMING" position={[POND.x, Y + 1.9, POND.z - 8.7]} rotation={[0, Math.PI, 0]} width={3.2} size={90} color="#f4f1ea" />
        {/* ---------------- recycling bins: three each side, aisle between ---------------- */}
        {[['GLASS', '#2f7a62', 32.5, -1], ['PAPER', '#2a6fc0', 39, -1], ['CARDBOARD', '#9a7545', 45.5, -1], ['METALS', '#d9a21b', 32.5, 1], ['PLASTICS', '#7647c9', 39, 1], ['E-WASTE', '#d4488f', 45.5, 1]].map(([label, colour, z, side]) => (
          <RollOffBin key={label} position={[side < 0 ? RC.x0 + 2.3 : RC.x1 - 2.3, Y, z]} yaw={Math.PI / 2} colour={colour} label={label} slot />
        ))}
        <BrandSign text="RECYCLING DROP-OFF" sub="SORT YOUR MATERIALS · OPEN DAILY 8-6" position={[-333, Y + 3.2, 28.4]} width={6.4} size={100} color="#f4f1ea" />
        <BrandSign text="RECYCLING DROP-OFF" position={[-333, Y + 3.2, 28.8]} rotation={[0, Math.PI, 0]} width={6.4} size={100} color="#f4f1ea" />
        {[-337.6, -328.4].map((x) => <mesh key={x} position={[x, Y + 1.6, 28.6]} material={A.rail} castShadow><boxGeometry args={[0.14, 3.2, 0.14]} /></mesh>)}
        <mesh position={[-333, Y + 3.0, 28.6]} material={A.rail} castShadow><boxGeometry args={[9.5, 0.12, 0.14]} /></mesh>
        <SafetyBollards y={Y} pts={[[-338.4, 30], [-327.6, 30], [-338.4, 50], [-327.6, 50]]} />
        <TrashCan position={[-338.6, Y, 51]} /><TrashCan position={[-327.4, Y, 51]} />
        <StreetLamp position={[-338.4, Y, 40]} yaw={Math.PI / 2} height={6} />
        <StreetLamp position={[-327.6, Y, 40]} yaw={-Math.PI / 2} height={6} />
        <DrinkingFountain position={[-327.2, Y, 54]} yaw={-Math.PI / 2} />
        {/* hazardous-household drop: locked cage (scenery) */}
        <mesh position={[-340.4, Y + 1.2, 53.5]} material={M.steel} castShadow><boxGeometry args={[3, 2.4, 0.06]} /></mesh>
        <BrandSign text="HOUSEHOLD HAZARDOUS" sub="BATTERIES · PAINT · OIL · SATURDAYS ONLY" position={[-340.4, Y + 1.5, 53.45]} width={2.6} size={80} color="#f4f1ea" />
      </StaticBatch>

      <KerbRamp x0={gx - 5} x1={gx + 5} />
      <KerbRamp x0={-337} x1={-329} />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1.6, 0.1, 11.5]} position={[gx, Y + 0.1, 44.5]} />
        <CuboidCollider args={[0.16, 3.3, 0.16]} position={[-374.8, Y + 3.3, 28.4]} />
        <CuboidCollider args={[0.16, 3.3, 0.16]} position={[-361.2, Y + 3.3, 28.4]} />
        <CuboidCollider args={[0.07, 1.6, 0.07]} position={[-337.6, Y + 1.6, 28.6]} />
        <CuboidCollider args={[0.07, 1.6, 0.07]} position={[-328.4, Y + 1.6, 28.6]} />
      </RigidBody>

      {/* personnel gate (steel door in the fence) */}
      <SteelDoor id="landfill-ped-gate" hinge={[-378, Y, 28.6]} width={1.14} height={2.0} baseYaw={0} openAngle={-1.55} label="personnel gate" colour="#8c9296" />

      {/* boom gates: start raised so the lanes are open; interact to lower them */}
      <BoomGate id="landfill-boom-in" x={-373.35} z={33.5} dir={[1, 0]} length={3.35} label="inbound boom" />
      <BoomGate id="landfill-boom-out" x={-362.65} z={55.8} dir={[-1, 0]} length={3.35} label="outbound boom" />

      {/* ---------------- scale house on the island ---------------- */}
      <MetalBuilding x0={-369.2} x1={-366.8} z0={38.5} z1={44.5} y={Y + 0.15} h={2.8} roof="flat" wall="white" roofMat="roofDark" ceiling={2.65} lining
        openings={[
          { wall: '-x', c: 41.5, w: 2.4, h: 1.15, sill: 0.95, kind: 'window', mullions: 1 },
          { wall: '+x', c: 41.5, w: 2.4, h: 1.15, sill: 0.95, kind: 'window', mullions: 1 },
          { wall: '-z', c: gx, w: 1.4, h: 1.1, sill: 0.95, kind: 'window', mullions: 0 },
          { wall: '+z', c: gx, w: 0.95, h: 2.05, kind: 'door', id: 'landfill-scale-door', label: 'scale house door', swing: 1 },
        ]}
        sign={{ text: 'WEIGHBRIDGE', position: [gx, Y + 0.15 + 2.5, 44.62], width: 1.9, size: 90 }} />
      <Pad x0={-369.0} x1={-367.0} z0={38.6} z1={44.4} y={Y + 0.15} mat={tileMat} lift={0.02} />
      <Desk x={gx} z={39.7} y={Y + 0.17} yaw={Math.PI} zone="landfill-scale" />
      <Shelf position={[-367.15, Y + 0.17, 42.9]} yaw={-Math.PI / 2} width={0.9} height={1.6} books={false} />
      <CeilingLight position={[gx, Y + 0.15 + 2.63, 41.5]} size={[0.8, 0.4]} zone="landfill-scale" intensity={14} distance={6} watts={24} />
      <LightSwitch position={[-367.1, Y + 0.15 + 1.25, 43.8]} yaw={Math.PI / 2} zone="landfill-scale" />

      {/* ---------------- site office (reception + two desks) ---------------- */}
      <MetalBuilding x0={-389.5} x1={-378.5} z0={31} z1={40} y={Y} h={3.0} roof="gable" pitch={0.1} wall="white" roofMat="roofGrey" ceiling={2.75} lining
        openings={[
          { wall: '+z', c: -384, w: 1.0, h: 2.1, kind: 'door', id: 'landfill-office-door', label: 'site office door', swing: 1, glazed: true },
          { wall: '+z', c: -387.6, w: 1.8, h: 1.2, sill: 0.95, kind: 'window' },
          { wall: '+z', c: -380.4, w: 1.8, h: 1.2, sill: 0.95, kind: 'window' },
          { wall: '-z', c: -386, w: 1.8, h: 1.2, sill: 0.95, kind: 'window' },
          { wall: '-z', c: -382, w: 1.8, h: 1.2, sill: 0.95, kind: 'window' },
          { wall: '+x', c: 35.4, w: 1.8, h: 1.2, sill: 0.95, kind: 'window' },
        ]}
        sign={{ text: 'SITE OFFICE', sub: 'CEDAR RIDGE LANDFILL', position: [-384, Y + 2.5, 40.1], width: 3.6, size: 96 }} />
      <Pad x0={-389.3} x1={-378.7} z0={31.1} z1={39.9} y={Y} mat={tileMat} lift={0.02} />
      <Counter position={[-384, Y + 0.02, 36.4]} yaw={0} length={3.2} top="wood" depth={0.6} height={1.05} face="#43484d" />
      <Desk x={-387.6} z={33.2} y={Y + 0.02} yaw={Math.PI} />
      <Desk x={-381.0} z={33.2} y={Y + 0.02} yaw={Math.PI} />
      <Shelf position={[-384, Y + 0.02, 31.4]} yaw={0} width={2.4} height={1.9} books={false} />
      <Chair position={[-388.4, Y + 0.02, 38.8]} yaw={Math.PI / 2} color="#5a6872" label="Sit in the waiting area" />
      <Chair position={[-388.4, Y + 0.02, 37.6]} yaw={Math.PI / 2} color="#5a6872" label="Sit in the waiting area" />
      <Plant position={[-379.4, Y + 0.02, 38.9]} scale={0.8} kind="fiddle" />
      <CeilingLight position={[-386, Y + 2.73, 35.5]} size={[1.2, 0.5]} zone="landfill-office" intensity={16} distance={8} watts={36} />
      <CeilingLight position={[-381, Y + 2.73, 35.5]} size={[1.2, 0.5]} zone="landfill-office" intensity={16} distance={8} watts={36} />
      <LightSwitch position={[-383.1, Y + 1.25, 39.8]} yaw={Math.PI} zone="landfill-office" />

      {/* ---------------- maintenance shed (two roll-up bays + a walk-in door) ---------------- */}
      <MetalBuilding x0={-389.5} x1={-378.5} z0={46} z1={57} y={Y} h={5.2} roof="gable" pitch={0.13} wall="green" roofMat="roofDark"
        openings={[
          { wall: '+x', c: 49.6, w: 3.6, h: 4.0, kind: 'rollup', colour: '#e0e0da' },
          { wall: '+x', c: 54.2, w: 3.6, h: 4.0, kind: 'rollup', colour: '#e0e0da' },
          { wall: '-z', c: -384, w: 1.0, h: 2.1, kind: 'door', id: 'landfill-shed-door', label: 'maintenance shed door', swing: 1 },
          { wall: '-x', c: 51.5, w: 2.0, h: 0.9, sill: 3.4, kind: 'window', mullions: 1 },
        ]}
        sign={{ text: 'MAINTENANCE', position: [-378.35, Y + 4.7, 51.8], rotation: [0, Math.PI / 2, 0], width: 3.4, size: 90 }} />
      <Pad x0={-389.3} x1={-378.7} z0={46.2} z1={56.8} y={Y} mat={M.yard} lift={0.02} />
      <Table position={[-387.6, Y + 0.02, 53.5]} yaw={0} size={[2.4, 0.8]} height={0.95} top="wood" />
      <Shelf position={[-388.6, Y + 0.02, 49]} yaw={Math.PI / 2} width={2.2} height={2.0} books={false} />
      <CeilingLight position={[-384, Y + 4.8, 51.5]} size={[1.4, 0.5]} zone="landfill-office" intensity={22} distance={11} watts={60} />

      {/* ---------------- attendant hut at the recycling drop-off ---------------- */}
      <MetalBuilding x0={-336} x1={-330} z0={RC.z1 - 3.5} z1={RC.z1 - 0.5} y={Y} h={2.7} roof="shed" pitch={0.08} wall="blue" roofMat="roofGrey" ceiling={2.5} lining
        openings={[
          { wall: '-z', c: -333, w: 0.95, h: 2.05, kind: 'door', id: 'recycling-hut-door', label: 'attendant hut door', swing: 1 },
          { wall: '-z', c: -331.2, w: 1.0, h: 1.0, sill: 1.0, kind: 'window', mullions: 0 },
          { wall: '-x', c: RC.z1 - 2, w: 1.4, h: 1.0, sill: 1.0, kind: 'window', mullions: 0 },
        ]} />
      <Pad x0={-335.8} x1={-330.2} z0={RC.z1 - 3.3} z1={RC.z1 - 0.7} y={Y} mat={tileMat} lift={0.02} />
      <Chair position={[-333.6, Y + 0.02, RC.z1 - 1.5]} yaw={Math.PI} color="#3b4f64" label="Sit in the attendant hut" />
      <Table position={[-333.6, Y + 0.02, RC.z1 - 0.9]} yaw={0} size={[1.8, 0.6]} height={0.9} top="wood" />
      <CeilingLight position={[-333, Y + 2.48, RC.z1 - 2]} size={[0.6, 0.4]} zone="landfill-office" intensity={10} distance={5} watts={18} />

      {/* ---------------- the compound: ground, debris, machines ---------------- */}
      <NearGate bounds={[F.x0, F.x1, F.zMid, F.z1]} margin={140}>
        <LandfillGround />
      </NearGate>
      <NearGate bounds={[F.x0, F.x1, F.zMid, F.z1]} margin={95}>
        <DebrisField />
      </NearGate>
      <TrackedMachine x={-356} z={88} yaw={Math.PI * 0.85} kind="compactor" />
      <TrackedMachine x={-370} z={78} yaw={0.6} kind="dozer" />
      <GasFlare x={-338} z={115.2} y={Y} />
      <Windsock x={-345} z={61.5} y={Y} />
      <MonitorWells pts={[[-348, 92], [-342, 100], [-346, 106], [-352, 63]]} />
      <TyreStacks origin={[-347.5, 114]} rows={2} cols={5} />
      <Trees trees={trees} />
      <BrandSign text="ACTIVE TIPPING FACE" sub="AUTHORISED VEHICLES ONLY" position={[-358.6, Y + 1.9, 80.4]} rotation={[0, Math.PI, 0]} width={2.8} size={90} color="#f4f1ea" />
      <mesh position={[-358.6, Y + 0.95, 80.5]} material={M.steelDark}><boxGeometry args={[0.1, 1.9, 0.1]} /></mesh>
    </>
  )
}

void heightAt; void BOULEVARD; void Bollard; void TrashCan
