import { useMemo } from 'react'
import { surface } from '../materials.js'
import { assetMats } from '../assets/materials.js'
import { Pad, Disc, PicnicTable, TrashCan, DrinkingFountain, BikeRack, SwingSet, SlideTower, Seesaw, SpringRider, Sandbox, Pergola, RailFence, Restrooms, ParkSign } from '../assets/park/ParkKit.jsx'
import { Bench, StreetLamp, Bollard } from '../props.jsx'
import { FlowerBed, Lawn, Trees, Hedge } from '../flora/Plants.jsx'
import { Palms } from '../flora/Palms.jsx'
import { StaticBatch } from '../batch.jsx'
import { CURB, PARK } from '../../config/westend.js'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'

// Meadowbrook Park: a neighbourhood park beside Meadowbrook Terrace. Everything is built from the park kit
// (assets/park/ParkKit.jsx) and the flora system. Paths are kept clear: nothing is placed inside a path rectangle,
// and the lawn is not scattered with tufts on paving.
//
// Layout (x west->east, z north->south):  north gate (courtyard) -> main promenade with palms -> central plaza ->
// loop path -> picnic grove (north-east), playground (south-west, fenced), restrooms (east), south gate on the boulevard.

const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }
export const PX = -168.65 // main promenade
const PZ = -20 // plaza / cross-path z
const Y = CURB

// rectangles that must stay clear of trees and tufts: [x0, x1, z0, z1]
const MAIN = [PX - 1.5, PX + 1.5, PARK.z0 - 4, PARK.z1 + 2]
const CROSS = [PARK.x0, PARK.x1, PZ - 1.2, PZ + 1.2]
const PLAY = [-198, -183, -2, 10]
const GATE = [-183, -170.15, 1, 5] // gravel walk from the promenade to the playground gate
const PICNIC = [-158, -136, -47, -26]
const RESTROOM = [-146, -139, -9, 1]
const STUB = [-152, -146, -6, -2]
const RING_R = 20.2

export default function MeadowbrookPark() {
  const A = assetMats()
  const gravel = A.gravel
  const pavers = surface('pavers', 1 / 1.2, 1 / 1.2, { color: '#cfc7bb' })
  const ringCircles = useMemo(() => Array.from({ length: 40 }, (_, i) => { const a = (i / 40) * Math.PI * 2; return [PX + Math.cos(a) * RING_R, PZ + Math.sin(a) * RING_R, 2.2] }), [])
  const skip = useMemo(() => [
    [PX, PZ, 7.6], MAIN, CROSS, PLAY, GATE, PICNIC, [RESTROOM[0] - 5, RESTROOM[1] + 1, RESTROOM[2] - 1, RESTROOM[3] + 1], ...ringCircles,
  ], [ringCircles])

  const clear = (x, z, pad = 1.2) => {
    const inR = (r) => x > r[0] - pad && x < r[1] + pad && z > r[2] - pad && z < r[3] + pad
    if ([MAIN, CROSS, PLAY, STUB, RESTROOM, PICNIC, GATE].some(inR)) return false
    if (Math.hypot(x - PX, z - PZ) < 9) return false
    if (Math.abs(Math.hypot(x - PX, z - PZ) - RING_R) < 3.2) return false
    return true
  }
  // scattered shade trees (clear of paths), denser toward the edges
  const trees = useMemo(() => {
    const out = []
    for (let i = 0; i < 90 && out.length < 26; i++) {
      const x = PARK.x0 + 4 + hash(i * 3.3) * (PARK.x1 - PARK.x0 - 8), z = PARK.z0 + 4 + hash(i * 5.7) * (PARK.z1 - PARK.z0 - 8)
      if (!clear(x, z, 2.2)) continue
      if (out.some((o) => Math.hypot(o[0] - x, o[2] - z) < 7.5)) continue
      out.push([x, Y, z, 0.95 + hash(i * 1.9) * 0.45])
    }
    return out
  }, [])
  // palms: royal palms flank the main promenade, coconut palms ring the plaza, areca clumps by the playground
  const palms = useMemo(() => {
    const out = []
    for (let z = PARK.z0 + 4; z < PARK.z1 - 2; z += 9) { if (Math.abs(z - PZ) < 9) continue; out.push([PX - 3.4, Y, z, 1, hash(z) * 6.28, 'royal'], [PX + 3.4, Y, z + 4.5, 1, hash(z + 2) * 6.28, 'royal']) }
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; out.push([PX + Math.cos(a) * 9.4, Y, PZ + Math.sin(a) * 9.4, 0.95, hash(i * 7) * 6.28, 'coconut']) }
    out.push([-193, Y, -16, 1, 1, 'areca'], [-178, Y, 10, 1, 2, 'areca'], [-189, Y, -8, 1, 3, 'coconut'])
    return out
  }, [])
  const lamps = useMemo(() => {
    const l = []
    for (let z = PARK.z0 + 6; z < PARK.z1; z += 14) { if (Math.abs(z - PZ) < 6) continue; l.push([[PX - 2.2, Y, z], Math.PI / 2], [[PX + 2.2, Y, z + 7], -Math.PI / 2]) }
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; l.push([[PX + Math.cos(a) * 8.2, Y, PZ + Math.sin(a) * 8.2], a + Math.PI / 2]) }
    l.push([[-179, Y, 3], 0], [[-148, Y, -37], 0], [[-152, Y, -5], 0])
    return l
  }, [])
  const benches = useMemo(() => {
    const b = []
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; b.push([[PX + Math.cos(a) * 6.3, Y, PZ + Math.sin(a) * 6.3], Math.atan2(-Math.cos(a), -Math.sin(a))]) } // face the plaza centre
    b.push([[PX - 2.45, Y, -36], Math.PI / 2], [[PX + 2.45, Y, -4], -Math.PI / 2], [[PX - 2.45, Y, 8.4], Math.PI / 2])
    b.push([[-180.4, Y, 7.4], -Math.PI / 2], [[-180.4, Y, 10.0], -Math.PI / 2]) // outside the playground fence, facing it
    b.push([[-150, Y, -9.4], Math.PI]) // by the restrooms
    return b
  }, [])

  return (
    <StaticBatch name="meadowbrook-park">
      {/* surfaces */}
      <Lawn x0={PARK.x0} x1={PARK.x1} z0={PARK.z0} z1={PARK.z1} y={Y} skip={skip} />
      <Pad x0={MAIN[0]} x1={MAIN[1]} z0={PARK.z0} z1={PARK.z1} y={Y} mat={pavers} />
      <Pad x0={CROSS[0]} x1={CROSS[1]} z0={CROSS[2]} z1={CROSS[3]} y={Y} mat={gravel} lift={0.012} />
      <Disc x={PX} z={PZ} r={7.2} y={Y} mat={pavers} lift={0.022} />
      {/* loop path: a ring of decomposed granite around the plaza */}
      <mesh position={[PX, Y + 0.005, PZ]} rotation={[-Math.PI / 2, 0, 0]} material={gravel} receiveShadow>
        <ringGeometry args={[RING_R - 1.2, RING_R + 1.2, 72]} />
      </mesh>
      <Pad x0={PLAY[0]} x1={PLAY[1]} z0={PLAY[2]} z1={PLAY[3]} y={Y} mat={A.rubber} lift={0.026} />
      <Pad x0={PICNIC[0]} x1={PICNIC[1]} z0={PICNIC[2]} z1={PICNIC[3]} y={Y} mat={gravel} lift={0.012} />
      <Pad x0={GATE[0]} x1={GATE[1]} z0={GATE[2]} z1={GATE[3]} y={Y} mat={gravel} lift={0.012} />
      <Pad x0={STUB[0]} x1={STUB[1]} z0={STUB[2]} z1={STUB[3]} y={Y} mat={gravel} lift={0.012} />
      <Pad x0={RESTROOM[0] - 6.5} x1={RESTROOM[0] - 0.4} z0={-6.5} z1={-1.5} y={Y} mat={pavers} lift={0.017} />
      <mesh position={[PX, Y + 0.012, PZ]} rotation={[-Math.PI / 2, 0, 0]} material={surface('limestone', 1, 1, { color: '#b9b2a4' })}><ringGeometry args={[3.3, 3.7, 40]} /></mesh>

      {/* central plaza: low planter ring with a palm, benches around */}
      <RigidBody type="fixed" colliders={false} position={[PX, Y, PZ]}>
        <CylinderCollider args={[0.25, 3.3]} position={[0, 0.25, 0]} />
      </RigidBody>
      <mesh position={[PX, Y + 0.25, PZ]} material={A.f.granite} castShadow receiveShadow><cylinderGeometry args={[3.3, 3.4, 0.5, 40]} /></mesh>
      <mesh position={[PX, Y + 0.52, PZ]} rotation={[-Math.PI / 2, 0, 0]} material={A.mulch}><circleGeometry args={[3.0, 36]} /></mesh>
      <Palms palms={[[PX, Y + 0.5, PZ, 1.05, 0.7, 'royal']]} collide={false} />
      <FlowerBed x={PX - 1.7} z={PZ + 1.2} w={1.8} d={1.2} y={Y + 0.5} seed={31} shrubs={false} />
      <FlowerBed x={PX + 1.7} z={PZ - 1.2} w={1.8} d={1.2} y={Y + 0.5} seed={33} shrubs={false} />

      {/* playground */}
      <RailFence x0={PLAY[0]} x1={PLAY[1]} z0={PLAY[2]} z1={PLAY[3]} y={Y} gap={[1.2, 4.8]} gapSide="x1" />
      <SwingSet position={[-192, Y + 0.008, 1.8]} yaw={0} />
      <SlideTower position={[-187.5, Y + 0.008, 3.2]} yaw={0} />
      <Seesaw position={[-193.5, Y + 0.008, 6.6]} yaw={Math.PI / 2} />
      {['teal', 'pink', 'yellow', 'violet'].map((c, i) => <SpringRider key={c} position={[-196 + i * 1.7, Y + 0.008, 8.8]} yaw={0.4 + i * 0.5} color={c} />)}
      <Sandbox position={[-187.2, Y + 0.008, 7.2]} />
      <DrinkingFountain position={[-181.2, Y, -0.6]} yaw={-Math.PI / 2} />
      <Hedge position={[-199.2, Y, 4]} size={[0.6, 1.1, 12]} />

      {/* picnic grove */}
      {[[-153, -43, 0.2], [-146, -43, -0.2], [-153, -34, 0.1], [-146, -34, 0]].map(([x, z, r], i) => <PicnicTable key={i} position={[x, Y + 0.004, z]} yaw={r} />)}
      <Pergola position={[-139, Y, -38]} yaw={Math.PI / 2} w={4.6} d={3.6} />
      <PicnicTable position={[-139, Y + 0.004, -38]} yaw={Math.PI / 2} />
      <Grill position={[-141.5, Y, -45]} />
      <TrashCan position={[-150, Y, -46]} /><TrashCan position={[-150, Y, -31]} /><TrashCan position={[-143, Y, -28.5]} />

      {/* restrooms (east side, doors facing the plaza) */}
      <Restrooms position={[-142.5, Y, -4]} yaw={-Math.PI / 2} />

      {/* furniture along the paths */}
      {benches.map(([p, yaw], i) => <Bench key={i} position={p} yaw={yaw} />)}
      <TrashCan position={[PX + 2.1, Y, -34]} /><TrashCan position={[PX - 2.1, Y, 6]} /><TrashCan position={[PX + 6.8, Y, PZ + 3]} />
      <BikeRack position={[PX + 3.8, Y, PARK.z0 + 3]} yaw={0} />
      {lamps.map(([p, yaw], i) => <StreetLamp key={i} position={p} yaw={yaw} height={4.4} />)}
      {Array.from({ length: 8 }, (_, i) => <Bollard key={i} position={[PX + (i % 2 ? 1.75 : -1.75), Y, PARK.z0 + 6 + i * 7.6]} />)}
      <ParkSign position={[PX - 5.2, Y, PARK.z1 - 1.6]} yaw={0} text="MEADOWBROOK PARK" sub="OPEN DAILY · DAWN TO DUSK" />

      {/* landscaping */}
      <Trees trees={trees} />
      <Palms palms={palms} />
      <FlowerBed x={PX - 6} z={PARK.z1 - 3.6} w={5} d={2.2} y={Y} seed={21} />
      <FlowerBed x={PX + 6} z={PARK.z1 - 3.6} w={5} d={2.2} y={Y} seed={22} />
      <FlowerBed x={PX - 6} z={PARK.z0 + 3} w={5} d={2.2} y={Y} seed={23} />
      <FlowerBed x={PX + 6} z={PARK.z0 + 3} w={5} d={2.2} y={Y} seed={24} />
      <FlowerBed x={-196} z={-30} w={3} d={8} y={Y} seed={25} />
      <FlowerBed x={-138} z={-17} w={3} d={9} y={Y} seed={26} />
    </StaticBatch>
  )
}

/** Charcoal grill on a post, for the picnic grove. */
function Grill({ position }) {
  const A = assetMats()
  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <CuboidCollider args={[0.35, 0.5, 0.25]} position={[0, 0.5, 0]} />
      <mesh position={[0, 0.45, 0]} material={A.rail} castShadow><cylinderGeometry args={[0.04, 0.04, 0.9, 8]} /></mesh>
      <mesh position={[0, 0.95, 0]} material={A.rail} castShadow><boxGeometry args={[0.6, 0.16, 0.42]} /></mesh>
      <mesh position={[0, 1.04, 0]} material={A.galv}><boxGeometry args={[0.58, 0.01, 0.4]} /></mesh>
      <mesh position={[0, 0.07, 0]} material={A.f.concrete}><boxGeometry args={[0.4, 0.14, 0.4]} /></mesh>
    </RigidBody>
  )
}
