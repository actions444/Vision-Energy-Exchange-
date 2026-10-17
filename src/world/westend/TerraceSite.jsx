import { useMemo } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { surface } from '../materials.js'
import { assetMats } from '../assets/materials.js'
import { Builder } from '../facade/kit.js'
import { Pad, Disc, PicnicTable, TrashCan, BikeRack, Pergola } from '../assets/park/ParkKit.jsx'
import ApartmentBlock from '../assets/apartment/ApartmentBlock.jsx'
import { aptLayout } from '../assets/apartment/buildApartment.js'
import { Bench, StreetLamp, Bollard } from '../props.jsx'
import { FlowerBed, Lawn, Trees, Hedge } from '../flora/Plants.jsx'
import { Palms } from '../flora/Palms.jsx'
import { StaticBatch } from '../batch.jsx'
import { BrandSign } from '../signs.jsx'
import { CURB, APT_A, COURTYARD, LOT } from '../../config/westend.js'

// Meadowbrook Terrace: Building A (the modular apartment kit), its shared courtyard, resident parking, rear walk,
// bin store and landscaping. Phase 1 builds one complete block; the same kit makes the other blocks later.

const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }
const Y = CURB

function ParkingLot() {
  const A = assetMats()
  const geos = useMemo(() => {
    const B = new Builder()
    const y = Y + 0.012
    const rows = [{ z0: LOT.z0 + 1.5, z1: LOT.z0 + 1.5 + 5.4 }, { z0: LOT.z1 - 1.5 - 5.4, z1: LOT.z1 - 1.5 }]
    const x0 = LOT.x0 + 1.2, n = 22, w = 2.6
    for (const [ri, r] of rows.entries()) {
      for (let i = 0; i <= n; i++) B.quad('paint', x0 + i * w, y, (r.z0 + r.z1) / 2, 0.1, r.z1 - r.z0, 0, { up: true })
      B.quad('paint', x0 + (n * w) / 2, y, ri ? r.z0 : r.z1, n * w, 0.1, 0, { up: true }) // aisle edge line
      for (let i = 0; i < n; i++) B.box('stop', x0 + i * w + w / 2, Y + 0.07, ri ? r.z1 - 0.55 : r.z0 + 0.55, 1.5, 0.13, 0.2) // wheel stops
    }
    // two accessible stalls beside the rear entrance walk: blue bars + hatched access aisle
    const r = rows[1], ax = x0 + 8 * w
    for (let k = 0; k < 2; k++) B.quad('blue', ax + k * w + w / 2, y + 0.001, (r.z0 + r.z1) / 2, 2.4, 5.2, 0, { up: true })
    for (let k = 0; k < 4; k++) B.quad('paint', ax + 2 * w + 0.5 + k * 0.5, y + 0.002, (r.z0 + r.z1) / 2, 0.1, 5.2, 0, { up: true })
    // aisle direction arrows
    for (let k = 0; k < 4; k++) { const ax2 = LOT.x0 + 9 + k * 14; B.quad('paint', ax2, y, (LOT.z0 + LOT.z1) / 2, 2.2, 0.2, 0, { up: true }); B.quad('paint', ax2 + 1.0, y, (LOT.z0 + LOT.z1) / 2, 0.2, 0.9, 0, { up: true }) }
    return B.merged()
  }, [])
  const lampXs = [-186, -166, -146]
  return (
    <group>
      <Pad x0={LOT.x0} x1={LOT.x1} z0={LOT.z0} z1={LOT.z1} y={Y} mat={A.lot} lift={0.012} />
      {geos.paint && <mesh geometry={geos.paint} material={A.paintWhite} receiveShadow />}
      {geos.blue && <mesh geometry={geos.blue} material={A.paintBlue} />}
      {geos.stop && <mesh geometry={geos.stop} material={A.f.concrete} castShadow receiveShadow />}
      {lampXs.map((x) => <StreetLamp key={x} position={[x, Y, (LOT.z0 + LOT.z1) / 2 + 0.2]} yaw={x % 2 ? 0 : Math.PI} height={6} double />)}
      {/* planted strip along the north edge, trees between stalls ends */}
      <FlowerBed x={-167} z={LOT.z0 + 0.6} w={58} d={1.0} y={Y} seed={41} />
      <Trees trees={[-192, -176, -160, -144].map((x, i) => [x + 3, Y, LOT.z0 + 0.7, 0.9 + hash(i) * 0.2])} />
    </group>
  )
}

/** Brick bin store: three-sided enclosure with two wheeled dumpsters. */
function BinStore({ position }) {
  const A = assetMats()
  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[2.2, 0.9, 0.12]} position={[0, 0.9, -1.4]} />
        <CuboidCollider args={[0.12, 0.9, 1.4]} position={[-2.2, 0.9, 0]} />
        <CuboidCollider args={[0.12, 0.9, 1.4]} position={[2.2, 0.9, 0]} />
        <CuboidCollider args={[0.9, 0.6, 0.6]} position={[-1.0, 0.6, -0.6]} />
        <CuboidCollider args={[0.9, 0.6, 0.6]} position={[1.0, 0.6, -0.6]} />
      </RigidBody>
      <mesh position={[0, 0.9, -1.4]} material={A.f.brick} castShadow receiveShadow><boxGeometry args={[4.5, 1.8, 0.25]} /></mesh>
      {[-2.2, 2.2].map((x) => <mesh key={x} position={[x, 0.9, 0]} material={A.f.brick} castShadow receiveShadow><boxGeometry args={[0.25, 1.8, 2.8]} /></mesh>)}
      {[-1.0, 1.0].map((x, i) => (
        <group key={x} position={[x, 0, -0.6]}>
          <mesh position={[0, 0.6, 0]} material={i ? A.teal : A.f.steel} castShadow><boxGeometry args={[1.7, 1.1, 1.1]} /></mesh>
          <mesh position={[0, 1.17, 0.05]} rotation={[-0.06, 0, 0]} material={A.rubberBlack}><boxGeometry args={[1.76, 0.07, 1.16]} /></mesh>
          {[-0.7, 0.7].map((wx) => <mesh key={wx} position={[wx, 0.1, 0.45]} rotation={[0, 0, Math.PI / 2]} material={A.rubberBlack}><cylinderGeometry args={[0.1, 0.1, 0.08, 12]} /></mesh>)}
        </group>
      ))}
    </group>
  )
}

export default function TerraceSite() {
  const A = assetMats()
  const L = useMemo(() => aptLayout(APT_A), [])
  const cx = L.cx
  const pavers = surface('pavers', 1 / 1.2, 1 / 1.2, { color: '#cfc7bb' })
  const walk = surface('concrete', 1 / 2.4, 1 / 2.4, { color: '#c9c6bf' })
  const cyz = (COURTYARD.z0 + COURTYARD.z1) / 2
  const plazaZ = -66
  const skip = useMemo(() => [[cx - 1.8, cx + 1.8, COURTYARD.z0, COURTYARD.z1], [COURTYARD.x0, COURTYARD.x1, plazaZ - 1.2, plazaZ + 1.2], [cx, plazaZ, 5.0], [-150, -148, -62, -57, 0], [-153, -143, -66, -58]], [cx, plazaZ])
  const trees = useMemo(() => {
    const out = []
    const clear = (x, z) => !(Math.abs(x - cx) < 4 || Math.abs(z - plazaZ) < 3 || Math.hypot(x - cx, z - plazaZ) < 7 || (x > -155 && x < -142 && z > -68 && z < -56))
    for (let i = 0; i < 80 && out.length < 12; i++) {
      const x = COURTYARD.x0 + 5 + hash(i * 3.3) * (COURTYARD.x1 - COURTYARD.x0 - 10), z = -73 + hash(i * 5.7) * 17
      if (!clear(x, z) || out.some((o) => Math.hypot(o[0] - x, o[2] - z) < 8)) continue
      out.push([x, Y, z, 0.95 + hash(i * 1.9) * 0.4])
    }
    return out
  }, [cx])
  const palms = useMemo(() => [[cx - 6.5, Y, -75.6, 1, 0.4, 'royal'], [cx + 6.5, Y, -75.6, 1, 1.4, 'royal'], [cx - 6, Y, plazaZ + 6, 1, 2.1, 'coconut'], [cx + 6, Y, plazaZ - 6, 1, 3.1, 'coconut'], [-195, Y, -76, 1, 4, 'areca'], [-139, Y, -76, 1, 5, 'areca'], [-195, Y, -57, 1, 6, 'coconut'], [-139, Y, -57, 1, 7, 'coconut']], [cx])
  const benches = useMemo(() => {
    const b = []
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; b.push([[cx + Math.cos(a) * 4.4, Y, plazaZ + Math.sin(a) * 4.4], Math.atan2(-Math.cos(a), -Math.sin(a))]) }
    b.push([[cx - 3.3, Y, -62], Math.PI / 2], [[cx + 3.3, Y, -62], -Math.PI / 2], [[cx - 3.3, Y, -72], Math.PI / 2], [[cx + 3.3, Y, -72], -Math.PI / 2])
    return b
  }, [cx])
  return (
    <>
      <ApartmentBlock spec={APT_A} />
      <StaticBatch name="terrace-site">
        <ParkingLot />
        {/* rear walk (resident entrance), front terrace, courtyard paths and plaza */}
        <Pad x0={LOT.x0} x1={LOT.x1} z0={LOT.z1 + 0.0} z1={APT_A.z0 - 0.0} y={Y} mat={walk} lift={0.012} />
        <Pad x0={COURTYARD.x0} x1={COURTYARD.x1} z0={APT_A.z1} z1={APT_A.z1 + 0.0 + 0.001} y={Y} mat={walk} lift={0.012} />
        <Lawn x0={COURTYARD.x0} x1={COURTYARD.x1} z0={COURTYARD.z0 + 3.2} z1={COURTYARD.z1} y={Y} skip={skip} />
        <Pad x0={cx - 1.6} x1={cx + 1.6} z0={APT_A.z1} z1={COURTYARD.z1} y={Y} mat={pavers} lift={0.017} />
        <Pad x0={COURTYARD.x0} x1={COURTYARD.x1} z0={plazaZ - 1.1} z1={plazaZ + 1.1} y={Y} mat={A.gravel} lift={0.012} />
        <Disc x={cx} z={plazaZ} r={5.4} y={Y} mat={pavers} lift={0.026} />
        <Pad x0={-155} x1={-142} z0={-68} z1={-56} y={Y} mat={A.gravel} lift={0.012} />
        {/* entrance apron + steps to the lobby doors */}
        <Pad x0={cx - 4.6} x1={cx + 4.6} z0={APT_A.z1} z1={APT_A.z1 + 3.2} y={Y} mat={surface('concrete', 1 / 1.6, 1 / 1.6, { color: '#bdb8ae' })} lift={0.034} />
        {/* centre round planter with a palm */}
        <RigidBody type="fixed" colliders={false} position={[cx, Y, plazaZ]}><CuboidCollider args={[1.6, 0.25, 1.6]} position={[0, 0.25, 0]} /></RigidBody>
        <mesh position={[cx, Y + 0.25, plazaZ]} material={A.f.granite} castShadow receiveShadow><cylinderGeometry args={[1.7, 1.8, 0.5, 32]} /></mesh>
        <mesh position={[cx, Y + 0.51, plazaZ]} rotation={[-Math.PI / 2, 0, 0]} material={A.mulch}><circleGeometry args={[1.55, 28]} /></mesh>
        <Palms palms={[[cx, Y + 0.5, plazaZ, 0.9, 0.2, 'royal']]} collide={false} />
        {/* shared amenities: pergola with seating and a grill nook */}
        <Pergola position={[-148, Y, -62]} yaw={0} w={5.2} d={4.2} />
        <PicnicTable position={[-148, Y + 0.004, -62]} yaw={0} />
        {benches.map(([p, yaw], i) => <Bench key={i} position={p} yaw={yaw} />)}
        <TrashCan position={[cx + 4.2, Y, -77]} /><TrashCan position={[-143, Y, -58]} />
        <BikeRack position={[cx + 9.5, Y, -76.2]} yaw={0} n={6} />
        {/* courtyard edge hedge with a gate where the main walk goes through to the park */}
        <Hedge position={[(COURTYARD.x0 + cx - 1.8) / 2, Y, COURTYARD.z1 + 0.4]} size={[cx - 1.8 - COURTYARD.x0, 1.1, 0.8]} />
        <Hedge position={[(cx + 1.8 + COURTYARD.x1) / 2, Y, COURTYARD.z1 + 0.4]} size={[COURTYARD.x1 - cx - 1.8, 1.1, 0.8]} />
        {/* beds under the patios */}
        {L.units.map((u) => <FlowerBed key={u.id} x={(u.mirror ? u.x1 - 2.7 : u.x0 + 2.7)} z={APT_A.z1 + 3.0} w={4.2} d={1.3} y={Y} seed={50 + u.id} />)}
        <Trees trees={trees} />
        <Palms palms={palms} />
        {/* exterior lighting: bollards along the walk, lamps at the plaza and corners */}
        {Array.from({ length: 6 }, (_, i) => [cx - 2.0, cx + 2.0].map((x) => <Bollard key={i + ':' + x} position={[x, Y, APT_A.z1 + 5 + i * 3.6]} />))}
        {[[cx - 6, plazaZ], [cx + 6, plazaZ], [-190, -62], [-144, -75], [-190, -75]].map(([x, z], i) => <StreetLamp key={i} position={[x, Y, z]} yaw={i * 1.7} height={4.6} />)}
        <BinStore position={[-141, Y, -99.2 + 0.0]} />
        {/* address plaque on the rear walk */}
        <BrandSign text="MEADOWBROOK TERRACE" sub="RESIDENT PARKING · CALL BEFORE TOWING" position={[-167.15, Y + 2.6, APT_A.z0 - 0.05]} rotation={[0, Math.PI, 0]} width={3.2} size={100} color="#f4f1ea" />
      </StaticBatch>
    </>
  )
}
