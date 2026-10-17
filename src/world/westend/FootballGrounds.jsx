import { useMemo } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { surface } from '../materials.js'
import { assetMats } from '../assets/materials.js'
import { Builder } from '../facade/kit.js'
import { Pad } from '../assets/park/ParkKit.jsx'
import { Restrooms, PicnicTable, TrashCan, BikeRack, DrinkingFountain } from '../assets/park/ParkKit.jsx'
import { PlayingSurface, ChainLinkFence, Bleachers, FootballGoal, LightTower, Scoreboard, Ball } from '../assets/sports/SportsKit.jsx'
import { FOOTBALL } from '../assets/sports/textures.js'
import { Bench, StreetLamp, Bollard } from '../props.jsx'
import { Trees, Lawn } from '../flora/Plants.jsx'
import { Palms } from '../flora/Palms.jsx'
import { StaticBatch } from '../batch.jsx'
import { BrandSign } from '../signs.jsx'
import { CURB, FIELD } from '../../config/westend.js'

// Meadowbrook Field (Phase 2): a regulation-size American football field (120 x 53 1/3 yd with both end zones),
// goalposts, home and visitor stands, team benches, fence with two gates, four floodlight towers, scoreboard, a service
// plaza with restrooms and a concession building (no interior), and an overflow lot.
// Real: walking, sitting in the stands, collision, kicking/throwing the loose balls, working restroom doors and lights.
// Scenery only: scoring, teams, the scoreboard digits, the concession stand (closed shell with painted service windows).

const Y = CURB
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }

function Concession({ position, yaw = 0 }) {
  const A = assetMats(), f = A.f
  const W = 9, Dp = 5, H = 3.3
  const awning = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1fa89e', roughness: 0.7 }), [])
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#17181a', roughness: 0.95 }), [])
  const c = Math.cos(yaw), s = Math.sin(yaw)
  const world = (x, z) => [position[0] + x * c + z * s, position[2] - x * s + z * c]
  // masonry with two service-window openings on the front (+z)
  const pieces = useMemo(() => {
    const out = []
    const add = (k, cx, cy, cz, sx, sy, sz) => out.push([k, cx, cy, cz, sx, sy, sz])
    const T = 0.3, zf = Dp / 2 - T / 2
    add('brick', 0, H / 2, -Dp / 2 + T / 2, W, H, T); add('brick', -W / 2 + T / 2, H / 2, 0, T, H, Dp); add('brick', W / 2 - T / 2, H / 2, 0, T, H, Dp)
    const wins = [-2.2, 2.2]
    let x = -W / 2
    for (const wx of wins) { const a = wx - 1.1, b = wx + 1.1; add('brick', (x + a) / 2, H / 2, zf, a - x, H, T); add('brick', wx, 0.45, zf, 2.2, 0.9, T); add('brick', wx, (2.5 + H) / 2, zf, 2.2, H - 2.5, T); x = b }
    add('brick', (x + W / 2) / 2, H / 2, zf, W / 2 - x, H, T)
    add('concrete', 0, H + 0.1, 0, W + 0.7, 0.2, Dp + 0.7)
    add('concrete', 0, 0.9, 0, W - 0.6, 1.8, Dp - 0.6) // solid core: the shell has no interior
    return out
  }, [])
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <RigidBody type="fixed" colliders={false}>
        {pieces.map(([k, cx, cy, cz, sx, sy, sz], i) => <CuboidCollider key={i} args={[sx / 2, sy / 2, sz / 2]} position={[cx, cy, cz]} />)}
        <CuboidCollider args={[W / 2, 0.55, 0.45]} position={[0, 0.55, Dp / 2 + 0.55]} />{/* counter shelf */}
      </RigidBody>
      {pieces.map(([k, cx, cy, cz, sx, sy, sz], i) => {
        if (cy === 0.9 && sy === 1.8) return null
        const mat = { brick: f.brick, concrete: f.concrete }[k]
        const g = new THREE.BoxGeometry(sx, sy, sz)
        // metre UVs from the world position of this piece
        const [wx, wz] = world(cx, cz)
        const p = g.attributes.position, uv = g.attributes.uv, n = g.attributes.normal
        for (let v = 0; v < p.count; v++) {
          const px = p.getX(v), py = p.getY(v), pz = p.getZ(v), nx = Math.abs(n.getX(v)), nz = Math.abs(n.getZ(v)), ny = Math.abs(n.getY(v))
          const u = nx > 0.5 ? pz + wz : px + wx, w = ny > 0.5 ? pz + wz : py + cy
          uv.setXY(v, u, w)
        }
        g.translate(cx, cy, cz)
        return <mesh key={i} geometry={g} material={mat} castShadow receiveShadow />
      })}
      {[-2.2, 2.2].map((wx) => (
        <group key={wx}>
          <mesh position={[wx, 1.7, Dp / 2 - 0.5]} material={dark}><boxGeometry args={[2.1, 1.5, 0.1]} /></mesh>
          <mesh position={[wx, 0.93, Dp / 2 + 0.55]} material={f.steel} castShadow receiveShadow><boxGeometry args={[2.4, 0.06, 0.9]} /></mesh>
          <mesh position={[wx, 2.95, Dp / 2 + 0.55]} rotation={[0.35, 0, 0]} material={awning} castShadow><boxGeometry args={[2.6, 0.05, 1.5]} /></mesh>
        </group>
      ))}
      <BrandSign text="CONCESSIONS" sub="SERVICE WINDOWS · SCENERY ONLY" position={[0, 3.62, Dp / 2 + 0.36]} width={4.4} size={96} color="#f4f1ea" />
    </group>
  )
}

export default function FootballGrounds() {
  const A = assetMats()
  const { cx, cz, fence, plaza, lot } = FIELD
  const walk = surface('concrete', 1 / 2.4, 1 / 2.4, { color: '#c9c6bf' })
  const pavers = surface('pavers', 1 / 1.2, 1 / 1.2, { color: '#cfc7bb' })
  const fl = FOOTBALL.length / 2, fw = FOOTBALL.width / 2, ap = FOOTBALL.apron
  const skip = useMemo(() => [[cx - fw - ap, cx + fw + ap, cz - fl - ap, cz + fl + ap]], [])
  // lot stalls
  const lotGeo = useMemo(() => {
    const B = new Builder(), y = Y + 0.03
    const n = 32, w = 2.6, x0 = lot.x0 + 1.2
    for (let i = 0; i <= n; i++) B.quad('paint', x0 + i * w, y, lot.z1 - 2.8, 0.1, 5.4, 0, { up: true })
    B.quad('paint', x0 + (n * w) / 2, y, lot.z1 - 5.5, n * w, 0.1, 0, { up: true })
    for (let i = 0; i < n; i++) B.box('stop', x0 + i * w + w / 2, Y + 0.07, lot.z1 - 0.7, 1.5, 0.13, 0.2)
    for (let k = 0; k < 6; k++) { const ax = lot.x0 + 14 + k * 14; B.quad('paint', ax, y, lot.z0 + 1.4, 2.0, 0.2, 0, { up: true }); B.quad('paint', ax + 0.9, y, lot.z0 + 1.4, 0.2, 0.8, 0, { up: true }) }
    return B.merged()
  }, [])
  const trees = useMemo(() => {
    const out = []
    for (let x = -228; x > -300; x -= 12) out.push([x, Y, 6.4, 1 + hash(x) * 0.2])
    for (let z = -110; z < -2; z += 15) out.push([-217.5, Y, z + hash(z) * 3, 0.95 + hash(z + 1) * 0.25])
    return out
  }, [])
  const palms = useMemo(() => [[-224, Y, -62, 1, 0.3, 'royal'], [-224, Y, -52, 1, 1.4, 'royal'], [-229, Y, 6.4, 1, 2.2, 'coconut'], [-300, Y, 6.4, 1, 3.1, 'coconut']], [])
  // team benches (6 per side) on the sideline just outside the field apron
  const teamBenches = useMemo(() => {
    const b = []
    for (let i = 0; i < 6; i++) { const z = cz - 13 + i * 5.2; b.push([[cx - fw - 1.2, Y, z], Math.PI / 2], [[cx + fw + 1.2, Y, z], -Math.PI / 2]) }
    return b
  }, [])
  const endZ = [cz - fl, cz + fl]
  return (
    <StaticBatch name="football-grounds">
      {/* ground: mown apron inside the fence, the marked field on top, concrete walks */}
      <Lawn x0={fence.x0} x1={fence.x1} z0={fence.z0} z1={fence.z1} y={Y} skip={skip} />
      <PlayingSurface kind="football" cx={cx} cz={cz} y={Y + 0.03} />
      <Pad x0={cx - 2} x1={cx + 2} z0={cz + fl + ap} z1={fence.z1 + 3} y={Y} mat={walk} lift={0.012} />
      <Pad x0={fence.x1 - 0.1} x1={plaza.x1} z0={plaza.z0} z1={plaza.z1} y={Y} mat={pavers} lift={0.012} />
      <Pad x0={fence.x1 - 6} x1={fence.x1 + 4} z0={cz - 2} z1={cz + 2} y={Y} mat={walk} lift={0.02} />
      <Pad x0={lot.x0} x1={lot.x1} z0={lot.z0} z1={lot.z1} y={Y} mat={A.lot} lift={0.012} />
      {lotGeo.paint && <mesh geometry={lotGeo.paint} material={A.paintWhite} />}
      {lotGeo.stop && <mesh geometry={lotGeo.stop} material={A.f.concrete} castShadow receiveShadow />}

      {/* fence: gates south (to the lot) and east (to the plaza) */}
      <ChainLinkFence x0={fence.x0} x1={fence.x1} z0={fence.z0} z1={fence.z1} y={Y} h={2.6} gaps={[{ side: 'z1', a: cx - 2, b: cx + 2 }, { side: 'x1', a: cz - 32, b: cz - 28 }]} />

      {/* goalposts at both end lines, stands on both sidelines */}
      <FootballGoal position={[cx, Y + 0.03, endZ[0]]} yaw={0} />
      <FootballGoal position={[cx, Y + 0.03, endZ[1]]} yaw={Math.PI} />
      <Bleachers position={[cx - fw - ap - 0.8, Y, cz]} yaw={-Math.PI / 2} length={42} rows={8} label="Sit in the home stand" />
      <Bleachers position={[cx + fw + ap + 0.8, Y, cz]} yaw={Math.PI / 2} length={42} rows={8} label="Sit in the visitors’ stand" />
      {teamBenches.map(([p, yaw], i) => <Bench key={i} position={p} yaw={yaw} length={2.4} />)}

      {/* floodlight towers at the four corners, scoreboard behind the north end zone */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => <LightTower key={i} position={[cx + sx * 33, Y, cz + sz * 56.5]} height={24} aim={[-sx, -sz]} />)}
      <Scoreboard position={[cx, Y, fence.z0 + 1.0]} yaw={0} />

      {/* balls on the field: kick, throw */}
      <Ball id="ball-football-1" kind="football" position={[cx - 3, Y + 0.04, cz + 1]} />
      <Ball id="ball-football-2" kind="football" position={[cx + 4, Y + 0.04, cz - 8]} />

      {/* entrance: stone sign pylons + gate lamps at the south gate */}
      {[-3.2, 3.2].map((dx) => <mesh key={dx} position={[cx + dx, Y + 1.0, fence.z1 + 0.6]} material={A.f.stone} castShadow receiveShadow><boxGeometry args={[0.7, 2.0, 0.7]} /></mesh>)}
      <RigidBody type="fixed" colliders={false}>{[-3.2, 3.2].map((dx) => <CuboidCollider key={dx} args={[0.35, 1.0, 0.35]} position={[cx + dx, Y + 1.0, fence.z1 + 0.6]} />)}</RigidBody>
      <BrandSign text="MEADOWBROOK FIELD" sub="COMMUNITY FOOTBALL GROUND" position={[cx, Y + 3.1, fence.z1 + 0.6]} width={6.4} size={100} color="#f4f1ea" />
      <RigidBody type="fixed" colliders={false}>{[-3, 3].map((dx) => <CuboidCollider key={dx} args={[0.07, 1.55, 0.07]} position={[cx + dx, Y + 1.55, fence.z1 + 0.6]} />)}</RigidBody>
      {[-3, 3].map((dx) => <mesh key={dx} position={[cx + dx, Y + 1.55, fence.z1 + 0.6]} material={A.rail}><boxGeometry args={[0.1, 3.1, 0.1]} /></mesh>)}

      {/* east service plaza: restrooms (working doors + lights), concession shell, tables, bins, fountain, planting */}
      <Restrooms position={[-219.8, Y, -86]} yaw={-Math.PI / 2} zone="field-restroom" idPrefix="field-restroom" />
      <Concession position={[-219.8, Y, -30]} yaw={-Math.PI / 2} />
      {[[-226, -45], [-226, -41], [-226, -73], [-226, -69]].map(([x, z], i) => <PicnicTable key={i} position={[x, Y + 0.012, z]} yaw={Math.PI / 2} />)}
      <DrinkingFountain position={[-226.8, Y, -78]} yaw={-Math.PI / 2} />
      <TrashCan position={[-227, Y, -50]} /><TrashCan position={[-227, Y, -64]} /><TrashCan position={[-227, Y, -92]} />
      <BikeRack position={[-217.5, Y, -60]} yaw={Math.PI / 2} />
      {[-110, -96, -62, -46, -16, -4].map((z, i) => <StreetLamp key={i} position={[-228.4, Y, z]} yaw={-Math.PI / 2} height={5} />)}
      {Array.from({ length: 5 }, (_, i) => <Bollard key={i} position={[-231.6, Y, -66 - i * 3.4 - 0]} />)}
      <Trees trees={trees} />
      <Palms palms={palms} />
      {[-300, -280, -256, -234].map((x, i) => <StreetLamp key={'l' + i} position={[x, Y, lot.z0 + 3.2]} yaw={Math.PI} height={6} />)}
    </StaticBatch>
  )
}
