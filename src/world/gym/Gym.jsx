import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { surface } from '../materials.js'
import { Wall, Gate, Block } from '../jobkit.jsx'
import { DoubleDoor } from '../Door.jsx'
import { BrandSign } from '../signs.jsx'
import { Trees, Lawn, Bench, StreetLamp, FlowerBed, LightAnchor } from '../props.jsx'
import { CeilingLight, Plant, Sofa } from '../furniture.jsx'
import { nightLit } from '../../state/environment.js'
import { playerState } from '../../state/runtime.js'
import { useStore } from '../../state/store.js'
import { useGym, stepSession } from '../../state/gym.js'
import { GYM, GYM_FLOOR, GYM_H, GYM_ZONE, GYM_DOOR_Z, GYM_AREA, CURB } from '../../config/gym.js'
import { gm, gymTextures, gymNear, canvasTex, Box, Cyl } from './kit.jsx'
import { Treadmill, SpinBike, Elliptical, Rower } from './Cardio.jsx'
import { ChestPress, ShoulderPress, LatPulldown, LegPress, CableCross, SquatRack, DumbbellRack, CurlStation, HeavyBag, WeightBench, PlateTree, KettlebellRack } from './Strength.jsx'
import { Reception, Lockers, JuiceBar, BarStools, Sauna, TVRow, MirrorWall, Turf, WaterFountain, TowelStation, Scale, ProteinVending } from './GymExtras.jsx'
import GymCrew from './GymCrew.jsx'

// ============================================================================
// STORM ATHLETIC CLUB
// A modern gym on the lawn south of the Museum of American Heritage. Glass west facade with the entrance, a lobby with front desk,
// sauna and juice bar, and a main floor of cardio machines, selectorised strength machines, racks, a boxing row and a turf zone.
// Interiors are drawn only when you are near (Gate). Machines are in Cardio.jsx / Strength.jsx.
// ============================================================================

const G = GYM
const FLY = GYM_FLOOR
const WH = GYM_H + (FLY - CURB) // wall height from the sidewalk
const CX = (G.x0 + G.x1) / 2, CZ = (G.z0 + G.z1) / 2
const W = G.x1 - G.x0, D = G.z1 - G.z0
const T = 0.5
const RECT = { x0: G.x0, x1: G.x1, z0: G.z0, z1: G.z1 }
const IX0 = G.x0 + T, IX1 = G.x1 - T, IZ0 = G.z0 + T, IZ1 = G.z1 - T
const CEILY = FLY + GYM_H
const TOPY = CURB + WH

// ------------------------------------------------------------------ tracker (runs even when you are far away)
function WorkoutTracker() {
  const { camera } = useThree()
  const cur = useRef({ s: null, acc: 0, last: null })
  useFrame((_, dtRaw) => {
    const c = camera.position
    gymNear.v = Math.hypot(c.x - GYM_AREA.x, c.z - GYM_AREA.z) < GYM_AREA.r
    const dt = Math.min(dtRaw, 0.1)
    const k = playerState.workout
    const r = cur.current
    if (k) {
      if (!r.s || r.s.kind !== k) { r.s = stepSession(null, k, 0); r.acc = 0 }
      r.s = stepSession(r.s, k, dt)
      r.acc += dt
      if (r.acc > 0.25) { r.acc = 0; useGym.getState().setSession(r.s) }
    } else if (r.s) {
      const totals = useGym.getState().finish(r.s)
      if (totals) {
        const s = r.s
        const dist = s.unit === 'km' ? ` · ${s.dist.toFixed(2)} km` : s.unit === 'm' ? ` · ${Math.round(s.dist)} m` : ''
        const mm = Math.floor(s.t / 60), ss = Math.floor(s.t % 60)
        useStore.getState().showToast(`${s.name} done: ${mm}:${String(ss).padStart(2, '0')} · ${Math.round(s.kcal)} kcal${dist} · ${s.reps} reps`)
      }
      r.s = null
      useGym.getState().setSession(null)
    }
  })
  return null
}

// ------------------------------------------------------------------ exterior
function Exterior() {
  const m = gm()
  const ext = useMemo(() => {
    const tex = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#2b2e35'; g.fillRect(0, 0, w, h)
      for (let x = 0; x < w; x += 128) { g.fillStyle = '#1f2127'; g.fillRect(x, 0, 4, h); g.fillStyle = '#3a3e47'; g.fillRect(x + 4, 0, 2, h) }
      for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(255,255,255,${0.02 + (i % 7) * 0.004})`; g.fillRect((i * 37) % w, (i * 91) % h, 2, 2) }
    }, { repeat: [W / 3, 2.4] })
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.3 })
  }, [])
  const inner = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8c929d', roughness: 0.85 }), [])
  const roof = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4b4e55', roughness: 0.9 }), [])
  const lampMat = useMemo(() => nightLit(new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffe1a8', roughness: 0.5 }), 1.8, 0.1), [])
  const clere = [42, 50, 58, 66].map((at) => ({ at, half: 3.2, glass: true, h: WH - 0.6, sill: 4.8 }))
  return (
    <group>
      {/* floor slab: one 15 cm step up from the sidewalk */}
      <Block position={[CX, (CURB + FLY) / 2, CZ]} size={[W + 0.2, FLY - CURB, D + 0.2]} material={surface('concrete', 10, 8, { color: '#bdbdbd' })} />
      <Wall side="w" rect={RECT} h={WH} t={T} ext={ext} int={inner} y={CURB}
        openings={[{ at: GYM_DOOR_Z, half: 1.6, h: 3.4 }, { at: -70.9, half: 5.5, glass: true, h: 4.5, sill: 0.15 }, { at: -55.2, half: 5.4, glass: true, h: 4.5, sill: 0.15 }]} />
      <Wall side="s" rect={RECT} h={WH} t={T} ext={ext} int={inner} y={CURB} openings={clere} />
      <Wall side="n" rect={RECT} h={WH} t={T} ext={ext} int={inner} y={CURB} openings={clere} />
      <Wall side="e" rect={RECT} h={WH} t={T} ext={ext} int={inner} y={CURB} openings={[-72, -63, -54].map((at) => ({ at, half: 3.0, glass: true, h: WH - 0.6, sill: 4.8 }))} />
      {/* roof slab with a low parapet, rooftop plant */}
      <Block position={[CX, TOPY + 0.15, CZ]} size={[W + 0.6, 0.3, D + 0.6]} material={roof} />
      {[[CX, G.z0 - 0.15, W + 0.6, 0.3], [CX, G.z1 + 0.15, W + 0.6, 0.3]].map(([x, z, sx, sz], i) => <Block key={'p' + i} position={[x, TOPY + 0.6, z]} size={[sx, 0.6, sz]} material={ext} collide={false} />)}
      {[[G.x0 - 0.15, CZ, 0.3, D], [G.x1 + 0.15, CZ, 0.3, D]].map(([x, z, sx, sz], i) => <Block key={'q' + i} position={[x, TOPY + 0.6, z]} size={[sx, 0.6, sz]} material={ext} collide={false} />)}
      {[[44, -66, 4, 1.4, 2.6], [56, -60, 3, 1.2, 2], [62, -70, 5, 1.2, 1.4]].map(([x, z, sx, sy, sz], i) => <Block key={'h' + i} position={[x, TOPY + 0.3 + sy / 2 + 0.2, z]} size={[sx, sy, sz]} material={m.frameWhite} collide={false} />)}
      {/* teal and purple accent reveals along the facade */}
      <Box p={[G.x0 - 0.04, CURB + 4.62, CZ]} s={[0.1, 0.1, D]} m={m.neonTeal} />
      <Box p={[G.x0 - 0.04, CURB + 4.45, CZ]} s={[0.1, 0.06, D]} m={m.neonPurple} />
      <BrandSign text="STORM ATHLETIC CLUB" sub="TRAIN · RECOVER · REPEAT" position={[G.x0 - 0.08, CURB + 6.15, CZ]} rotation={[0, -Math.PI / 2, 0]} width={15} color="#f4f1ff" glow="#a33cff" size={190} />
      {/* entrance: glass double doors, canopy with downlights */}
      <DoubleDoor id="door-gym" center={[G.x0 + 0.2, FLY, GYM_DOOR_Z]} halfWidth={1.55} height={3.3} facing={-Math.PI / 2} accent="#1de9d6" label="gym doors" />
      <Block position={[G.x0 - 2.0, CURB + 4.1, GYM_DOOR_Z]} size={[4.2, 0.22, 8]} material={ext} collide={false} />
      <Box p={[G.x0 - 2.0, CURB + 3.96, GYM_DOOR_Z]} s={[4.0, 0.04, 7.8]} m={m.neonTeal} />
      {[-3.6, 3.6].map((dz) => <Box key={dz} p={[G.x0 - 3.7, CURB + 2.05, GYM_DOOR_Z + dz]} s={[0.12, 4.1, 0.12]} m={m.frame} />)}
      {[-2.4, 0, 2.4].map((dz) => <mesh key={dz} position={[G.x0 - 2.4, CURB + 3.93, GYM_DOOR_Z + dz]} material={lampMat}><sphereGeometry args={[0.13, 12, 8]} /></mesh>)}
      <LightAnchor position={[G.x0 - 2.4, CURB + 3.6, GYM_DOOR_Z]} color="#ffe6c0" intensity={20} distance={14} night />
      <LightAnchor position={[G.x0 - 1.4, CURB + 5.0, CZ - 8]} color="#c9a6ff" intensity={14} distance={16} night />
      <LightAnchor position={[G.x0 - 1.4, CURB + 5.0, CZ + 8]} color="#9ff2ea" intensity={14} distance={16} night />
      {/* forecourt and approach from Heritage Walk */}
      <mesh position={[(G.x0 - 4.2 + 17) / 2 + 0.0, CURB + 0.006, GYM_DOOR_Z]} rotation={[-Math.PI / 2, 0, 0]} material={surface('pavers', 3, 4)} receiveShadow><planeGeometry args={[G.x0 - 4.2 - 12.5 + 8.4, 3.4]} /></mesh>
      <mesh position={[G.x0 - 2.4, CURB + 0.007, GYM_DOOR_Z]} rotation={[-Math.PI / 2, 0, 0]} material={surface('pavers', 2, 3)} receiveShadow><planeGeometry args={[4.8, 10]} /></mesh>
      <Bench position={[G.x0 - 1.6, CURB, GYM_DOOR_Z - 6.2]} yaw={-Math.PI / 2} />
      <Bench position={[G.x0 - 1.6, CURB, GYM_DOOR_Z + 6.2]} yaw={-Math.PI / 2} />
      <FlowerBed x={G.x0 - 2.6} z={GYM_DOOR_Z - 9.6} w={4.2} d={1.6} seed={31} />
      <FlowerBed x={G.x0 - 2.6} z={GYM_DOOR_Z + 9.6} w={4.2} d={1.6} seed={32} />
      <Trees trees={useMemo(() => [[G.x0 - 5, CURB, -50.5, 1.0], [G.x0 - 5, CURB, -75.5, 1.0], [G.x1 + 3, CURB, -52, 1.2], [G.x1 + 3, CURB, -74, 1.1], [CX, CURB, G.z1 + 3.5, 1.0], [CX + 8, CURB, G.z1 + 3.5, 1.1], [CX - 8, CURB, G.z1 + 3.5, 1.0]], [])} />
      {/* bike rack at the east end of the forecourt */}
      {[0, 1, 2, 3].map((i) => <group key={i} position={[G.x0 - 2.8, CURB, -72.2 + i * 0.5]}><mesh position={[0, 0.4, 0]} rotation={[0, 0, 0]} material={m.steel}><torusGeometry args={[0.32, 0.018, 6, 20, Math.PI]} /></mesh></group>)}
    </group>
  )
}

// ------------------------------------------------------------------ interior
function Interior() {
  const m = gm()
  const T2 = gymTextures()
  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({ map: T2.floor, roughness: 0.92 }), [T2])
  const ceilMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2c32', roughness: 0.9 }), [])
  const lights = useMemo(() => [40, 50, 60].flatMap((x) => [-75, -68.5, -62, -55.5, -50.5].map((z) => [x, z])), [])
  const neon = (x0, x1, z, mat) => <Box key={z + mat.uuid} p={[(x0 + x1) / 2, CEILY - 0.4, z]} s={[x1 - x0, 0.05, 0.08]} m={mat} />
  return (
    <group>
      {/* floor: dark speckled rubber, with a teal walkway line from the door */}
      <mesh position={[CX, FLY + 0.004, CZ]} rotation={[-Math.PI / 2, 0, 0]} material={floorMat} receiveShadow><planeGeometry args={[W - 1, D - 1]} /></mesh>
      <Box p={[(IX0 + 47) / 2, FLY + 0.01, GYM_DOOR_Z]} s={[47 - IX0, 0.006, 0.14]} m={m.neonTeal} />
      <Box p={[47, FLY + 0.01, -63]} s={[0.12, 0.006, 28]} m={m.neonPurple} />
      {/* ceiling, beams, lights */}
      <mesh position={[CX, CEILY, CZ]} rotation={[Math.PI / 2, 0, 0]} material={ceilMat}><planeGeometry args={[W - 1, D - 1]} /></mesh>
      {[-76, -70, -64, -58, -52].map((z) => <Box key={z} p={[CX, CEILY - 0.22, z]} s={[W - 1, 0.44, 0.3]} m={m.matteBlack} />)}
      {[-73, -67, -61, -55].map((z, i) => neon(36, 66, z, i % 2 ? m.neonPurple : m.neonTeal))}
      {lights.map(([x, z], i) => <CeilingLight key={i} position={[x, CEILY - 0.03, z]} size={[2.6, 0.4]} intensity={i % 2 ? 0 : 22} distance={13} zone={GYM_ZONE} watts={60} />)}
      {/* big logo above the front desk and motivational lettering */}
      <BrandSign text="STORM ATHLETIC" sub="CLUB" position={[39.5, FLY + 4.3, IZ0 + 0.06]} rotation={[0, 0, 0]} width={7} color="#ffffff" glow="#a33cff" size={170} />
      <BrandSign text="STRONGER EVERY DAY" position={[IX1 - 0.06, FLY + 4.4, -54]} rotation={[0, -Math.PI / 2, 0]} width={7} color="#ffffff" glow="#1de9d6" size={150} />
      <BrandSign text="EARN YOUR REST DAY" position={[IX1 - 0.06, FLY + 4.4, -70]} rotation={[0, -Math.PI / 2, 0]} width={7} color="#ffffff" glow="#a33cff" size={150} />

      {/* ---- lobby: reception, lockers, sauna, juice bar, waiting area */}
      <Reception x={39.5} z={-74.6} yaw={0} />
      <Lockers x={44.8} z={IZ0 + 0.3} yaw={0} n={6} hue={190} />
      <Lockers x={IX0 + 0.3} z={-71.5} yaw={Math.PI / 2} n={4} hue={280} />
      <Sofa position={[36.6, FLY, -68.6]} yaw={Math.PI / 2} length={2.2} color="#2f3340" />
      <Box p={[38.5, FLY + 0.22, -68.6]} s={[0.7, 0.04, 1.2]} m={m.cedar} />
      <Plant position={[36.0, FLY, -66.8]} scale={1.1} />
      <Plant position={[46.2, FLY, -62.0]} scale={1.0} />
      <WaterFountain x={46.6} z={-58.2} yaw={-Math.PI / 2} />
      <TowelStation x={46.6} z={-60.0} yaw={-Math.PI / 2} />
      <Scale x={36.4} z={-65.0} />
      <Sauna rect={{ x0: IX0, x1: 39.5, z0: -59.6, z1: -54.6 }} doorZ={-57.1} />
      <JuiceBar x={43.5} z={-51.0} yaw={Math.PI} />
      <BarStools x={43.5} z={-51.0} yaw={Math.PI} />
      <ProteinVending x={IX0 + 0.5} z={-51.0} yaw={Math.PI / 2} />

      {/* ---- boxing row just north of the walkway */}
      {[38, 41, 44].map((x, i) => <HeavyBag key={i} id={'gym-bag-' + i} x={x} z={-69.4} yaw={0} />)}

      {/* ---- cardio floor: treadmills facing the TVs on the north wall */}
      <TVRow xs={[51, 54, 57, 60, 63]} z={IZ0 + 0.08} />
      {[49.5, 52.5, 55.5, 58.5, 61.5, 64.5].map((x, i) => <Treadmill key={i} id={'gym-tm-' + i} x={x} z={-74.6} yaw={Math.PI} auto={i === 2} />)}
      {[49.5, 52.5, 55.5].map((x, i) => <Elliptical key={i} id={'gym-el-' + i} x={x} z={-69.3} yaw={Math.PI} />)}
      {[59, 61.4, 63.8, 66.2].map((x, i) => <SpinBike key={i} id={'gym-bike-' + i} x={x} z={-69.3} yaw={Math.PI} auto={i === 1} color={i % 2 ? 'frameBlue' : 'frameRed'} />)}
      {[50, 53, 56].map((x, i) => <Rower key={i} id={'gym-row-' + i} x={x} z={-64.2} yaw={Math.PI} />)}

      {/* ---- turf zone */}
      <Turf x={63} z={-61.5} w={8} d={4} />
      <KettlebellRack x={59.8} z={-63.6} yaw={Math.PI / 2} />

      {/* ---- strength row (users face north) */}
      <ChestPress id="gym-chest" x={49} z={-57.6} yaw={Math.PI} auto />
      <ShoulderPress id="gym-shoulder" x={52.4} z={-57.6} yaw={Math.PI} />
      <LatPulldown id="gym-lat" x={55.8} z={-57.6} yaw={Math.PI} />
      <LegPress id="gym-legpress" x={59.8} z={-57.2} yaw={Math.PI} />
      <CableCross x={64.6} z={-57.0} yaw={0} />

      {/* ---- free weights, facing the mirror wall */}
      <SquatRack id="gym-squat-0" x={50} z={-52.5} yaw={0} />
      <SquatRack id="gym-squat-1" x={55} z={-52.5} yaw={0} auto />
      <WeightBench x={59.4} z={-52.3} yaw={0} />
      <PlateTree x={61.5} z={-49.9} />
      <DumbbellRack x={65.0} z={-54.0} yaw={0} />
      <CurlStation id="gym-curl" x={65.0} z={-51.9} yaw={0} />
      <MirrorWall x0={47.5} x1={IX1} z={IZ1 - 0.04} side={-1} />
      <Plant position={[IX1 - 0.5, FLY, IZ0 + 0.6]} scale={1.2} />
      <Plant position={[IX1 - 0.5, FLY, IZ1 - 0.6]} scale={1.2} />
    </group>
  )
}

export default function Gym() {
  return (
    <group>
      <WorkoutTracker />
      <Exterior />
      <Gate x0={G.x0} x1={G.x1} z0={G.z0} z1={G.z1} pad={14}>
        <Interior />
      </Gate>
      <GymCrew />
    </group>
  )
}
