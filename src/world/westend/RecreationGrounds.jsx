import { useMemo } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { surface } from '../materials.js'
import { assetMats } from '../assets/materials.js'
import { Pad, PicnicTable, TrashCan, BikeRack, DrinkingFountain, Pergola } from '../assets/park/ParkKit.jsx'
import { PlayingSurface, ChainLinkFence, SoccerGoal, BasketballHoop, LightTower, Ball, Bleachers } from '../assets/sports/SportsKit.jsx'
import { SOCCER, BASKETBALL } from '../assets/sports/textures.js'
import { Bench, StreetLamp, Bollard } from '../props.jsx'
import { Trees, Lawn, Hedge } from '../flora/Plants.jsx'
import { Palms } from '../flora/Palms.jsx'
import { StaticBatch } from '../batch.jsx'
import { BrandSign } from '../signs.jsx'
import { CURB, REC } from '../../config/westend.js'

// Recreation grounds (Phase 2): two full-size outdoor basketball courts and a community soccer pitch (80 x 50 m).
// Real: walking, sitting, collision, goals and hoops as solid objects, loose balls you can kick or shoot.
// Scenery only: no scoring, no teams, no shot detection through the hoops, no game clock.

const Y = CURB
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }

export default function RecreationGrounds() {
  const A = assetMats()
  const { fence, courts, pitch } = REC
  const walk = surface('concrete', 1 / 2.4, 1 / 2.4, { color: '#c9c6bf' })
  const pavers = surface('pavers', 1 / 1.2, 1 / 1.2, { color: '#cfc7bb' })
  const bl = BASKETBALL.length / 2, bw = BASKETBALL.width / 2, bap = BASKETBALL.apron
  const sl = SOCCER.length / 2, sw = SOCCER.width / 2, sap = SOCCER.apron
  const gx = (fence.x0 + fence.x1) / 2
  const skip = useMemo(() => [
    ...courts.map((c) => [c.cx - bl - bap, c.cx + bl + bap, c.cz - bw - bap, c.cz + bw + bap]),
    [pitch.cx - sl - sap, pitch.cx + sl + sap, pitch.cz - sw - sap, pitch.cz + sw + sap],
    [gx - 8.6, gx + 8.6, 28, 60],
  ], [])
  const trees = useMemo(() => {
    const out = []
    for (let x = -300; x < -218; x += 13) out.push([x + hash(x) * 3, Y, 116.2, 1 + hash(x + 3) * 0.25])
    for (const x of [-220, -300]) for (let z = 66; z < 112; z += 16) out.push([x > -260 ? fence.x1 - 0.8 : fence.x0 + 0.8, Y, z, 0.9 + hash(z) * 0.2])
    return out
  }, [])
  const palms = useMemo(() => [[gx - 5.5, Y, 56.6, 1, 0.5, 'coconut'], [gx + 5.5, Y, 56.6, 1, 1.5, 'coconut'], [gx - 5.5, Y, 30.4, 1, 2.5, 'royal'], [gx + 5.5, Y, 30.4, 1, 3.5, 'royal']], [])
  const benches = useMemo(() => {
    const b = []
    for (const c of courts) for (const k of [-1, 1]) for (const dx of [-6, 6]) b.push([[c.cx + dx, Y, c.cz + k * (bw + 1.4)], k < 0 ? 0 : Math.PI]) // face the court: north benches (z smaller) face +z
    for (let i = 0; i < 4; i++) b.push([[pitch.cx - 24 + i * 16, Y, pitch.cz + sw + sap + 0.8], Math.PI])
    return b
  }, [])
  return (
    <StaticBatch name="recreation-grounds">
      <Lawn x0={fence.x0} x1={fence.x1} z0={fence.z0} z1={fence.z1} y={Y} skip={skip} />
      {courts.map((c, i) => <PlayingSurface key={i} kind="basketball" cx={c.cx} cz={c.cz} y={Y + 0.03} />)}
      <PlayingSurface kind="soccer" cx={pitch.cx} cz={pitch.cz} y={Y + 0.03} />
      {/* paved plaza between the courts, entrance walk from the boulevard, walk to the pitch */}
      <Pad x0={gx - 8.6} x1={gx + 8.6} z0={fence.z0} z1={60} y={Y} mat={pavers} lift={0.012} />
      <Pad x0={gx - 2} x1={gx + 2} z0={26} z1={fence.z0 + 0.5} y={Y} mat={walk} lift={0.02} />

      <ChainLinkFence x0={fence.x0} x1={fence.x1} z0={fence.z0} z1={fence.z1} y={Y} h={2.6} gaps={[{ side: 'z0', a: gx - 2, b: gx + 2 }]} />
      {/* inner fence: courts are caged (4 m) with one gate each on the plaza side; the pitch is open */}
      {courts.map((c, i) => (
        <ChainLinkFence key={i} x0={c.cx - bl - bap + 0.3} x1={c.cx + bl + bap - 0.3} z0={c.cz - bw - bap + 0.3} z1={c.cz + bw + bap - 0.3} y={Y} h={3.6}
          gaps={[{ side: 'z0', a: c.cx + (i ? -11 : 11) - 1.6, b: c.cx + (i ? -11 : 11) + 1.6 }, { side: 'z1', a: c.cx - 1.6, b: c.cx + 1.6 }, { side: i ? 'x0' : 'x1', a: c.cz - 5.8, b: c.cz - 2.6 }]} />
      ))}
      {/* hoops: pole 1.1 m behind each baseline, backboards face the court */}
      {courts.map((c, i) => (
        <group key={'h' + i}>
          <BasketballHoop position={[c.cx - bl - 1.1, Y + 0.03, c.cz]} yaw={0} />
          <BasketballHoop position={[c.cx + bl + 1.1, Y + 0.03, c.cz]} yaw={Math.PI} />
          <Ball id={`ball-basket-${i}`} kind="basketball" position={[c.cx, Y + 0.04, c.cz + 1]} />
        </group>
      ))}
      {/* soccer goals at both ends of the pitch (local +z points onto the pitch) */}
      <SoccerGoal position={[pitch.cx - sl, Y + 0.03, pitch.cz]} yaw={Math.PI / 2} />
      <SoccerGoal position={[pitch.cx + sl, Y + 0.03, pitch.cz]} yaw={-Math.PI / 2} />
      <Ball id="ball-soccer-1" kind="soccer" position={[pitch.cx, Y + 0.04, pitch.cz]} />
      <Ball id="ball-soccer-2" kind="soccer" position={[pitch.cx - 30, Y + 0.04, pitch.cz + 6]} />
      {/* a small stand on the pitch's north touchline */}
      <Bleachers position={[pitch.cx + 11, Y, pitch.cz - sw - sap - 1.0]} yaw={Math.PI} length={14} rows={4} seatRows={[1, 3]} seatEvery={2.4} label="Sit on the touchline stand" />
      {/* plaza dressing */}
      <Pergola position={[gx, Y, 36]} yaw={0} w={5.2} d={4.2} />
      <PicnicTable position={[gx, Y + 0.012, 36]} yaw={0} />
      <DrinkingFountain position={[gx - 6.6, Y, 31.6]} yaw={Math.PI} />
      <TrashCan position={[gx + 6.8, Y, 33]} /><TrashCan position={[gx - 6.8, Y, 55]} /><TrashCan position={[gx + 6.8, Y, 55]} />
      <BikeRack position={[gx + 6.6, Y, 31.8]} yaw={0} />
      {benches.map(([p, yaw], i) => <Bench key={i} position={p} yaw={yaw} length={2.4} />)}
      <Hedge position={[gx - 6, Y, 30.6]} size={[8, 1.1, 0.8]} /><Hedge position={[gx + 6, Y, 30.6]} size={[8, 1.1, 0.8]} />
      {[[-1, 0], [1, 0]].map(([sx], i) => <LightTower key={i} position={[pitch.cx + sx * 44, Y, pitch.cz]} height={16} aim={[-sx, 0]} />)}
      {[[-1, -1], [1, -1]].map(([sx, sz], i) => <LightTower key={'c' + i} position={[gx + sx * 40, Y, 61]} height={14} aim={[-sx, -0.6]} />)}
      {[gx - 14, gx - 6.5].map((x, i) => <StreetLamp key={"p" + i} position={[x, Y, 58.4]} yaw={Math.PI / 2} height={5} />)}
      <BrandSign text="RECREATION GROUNDS" sub="BASKETBALL · SOCCER · OPEN DAILY" position={[gx, Y + 3.0, 29.4]} width={6.8} size={96} color="#f4f1ea" />
      <RigidBody type="fixed" colliders={false}>{[-3.4, 3.4].map((dx) => <CuboidCollider key={dx} args={[0.07, 1.5, 0.07]} position={[gx + dx, Y + 1.5, 29.4]} />)}</RigidBody>
      {[-3.4, 3.4].map((dx) => <mesh key={dx} position={[gx + dx, Y + 1.5, 29.4]} material={A.rail}><boxGeometry args={[0.1, 3.0, 0.1]} /></mesh>)}
      <Trees trees={trees} />
      <Palms palms={palms} />
      {Array.from({ length: 6 }, (_, i) => <Bollard key={i} position={[gx + (i % 2 ? 2.6 : -2.6), Y, [31.5, 40, 47][Math.floor(i / 2)]]} />)}
    </StaticBatch>
  )
}
