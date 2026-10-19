import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { surface } from '../materials.js'
import { assetMats } from '../assets/materials.js'
import { Builder } from '../facade/kit.js'
import { StreetLamp } from '../props.jsx'
import { BrandSign, StreetSign } from '../signs.jsx'
import { StaticBatch } from '../batch.jsx'
import { Pad } from '../assets/park/ParkKit.jsx'
import TerraceSite from './TerraceSite.jsx'
import MeadowbrookPark from './MeadowbrookPark.jsx'
import FootballGrounds from './FootballGrounds.jsx'
import RecreationGrounds from './RecreationGrounds.jsx'
import WasteDistrict from './WasteDistrict.jsx'
import IndustrialRow from './IndustrialRow.jsx'
import HarborParade from './HarborParade.jsx'
import Airport from './Airport.jsx'
import AirportFreeway from './AirportFreeway.jsx'
import { CURB, WEST, BOULEVARD, MAPLE, CEDAR, BLOCKS, PARADE, TOLL } from '../../config/westend.js'
import { playerState } from '../../state/runtime.js'
import { useJobs } from '../../state/jobs.js'
import { useStore } from '../../state/store.js'

// The West End: roads, sidewalks, crossings, lamps and street signs for the new districts west of the original map.
// Phase 1 (built): Meadowbrook Terrace + Meadowbrook Park, north-east block.
// Phases 2-4 (NOT built): their blocks are fenced construction sites so no one walks into an unfinished area.

const PHASES = {
  se: { phase: 4, title: 'PHASE 4 · MAPLE COURT', sub: 'NOT BUILT YET · APARTMENT COMPLEX' },
}

const BX = (b) => ({ x0: b[0], x1: b[1], z0: b[2], z1: b[3] })

/** Painted road markings merged into two draw calls (white + yellow). */
function useMarkings() {
  return useMemo(() => {
    const B = new Builder()
    const y = 0.012
    const midBlv = (BOULEVARD.z0 + BOULEVARD.z1) / 2
    const dash = (key, x0, z0, x1, z1) => { // dashed white line between two points on an axis
      const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz), n = Math.floor(len / 9)
      for (let k = 0; k < n; k++) {
        const t = (4.5 + k * 9) / len
        if (Math.abs(dx) > Math.abs(dz)) B.quad(key, x0 + dx * t, y, z0, 3, 0.13, 0, { up: true }); else B.quad(key, x0, y, z0 + dz * t, 0.13, 3, 0, { up: true })
      }
    }
    const dbl = (x0, z0, x1, z1) => { // double yellow centre line
      const horiz = Math.abs(x1 - x0) > Math.abs(z1 - z0)
      for (const o of [-0.14, 0.14]) horiz ? B.quad('yellow', (x0 + x1) / 2, y, z0 + o, Math.abs(x1 - x0), 0.12, 0, { up: true }) : B.quad('yellow', x0 + o, y, (z0 + z1) / 2, 0.12, Math.abs(z1 - z0), 0, { up: true })
    }
    // boulevard, between the intersections
    const xsB = [[-132, MAPLE.x1 + 4.5 + 0], [MAPLE.x0 - 4.5, CEDAR.x1 + 4.5], [CEDAR.x0 - 4.5, -392]].map(([a, b]) => [Math.max(a, b), Math.min(a, b)])
    xsB.forEach(([a, b]) => { dbl(a, midBlv, b, midBlv); dash('white', a, midBlv - 3, b, midBlv - 3); dash('white', a, midBlv + 3, b, midBlv + 3) })
    // Maple + Cedar (north and south of the boulevard)
    for (const R of [MAPLE, CEDAR]) {
      const cx = (R.x0 + R.x1) / 2
      for (const [a, b] of [[-128, BOULEVARD.z0 - 4.5], [BOULEVARD.z1 + 4.5, 128]]) { dbl(cx, a, cx, b); dash('white', cx - 3, a, cx - 3, b); dash('white', cx + 3, a, cx + 3, b) }
      // stop bars on all four arms + zebra crosswalks
      // zebras across the boulevard arms (walk east-west along the sidewalk across Maple/Cedar): bars run along x
      for (const zz of [BOULEVARD.z0 - 2.2, BOULEVARD.z1 + 2.2]) for (let i = 0; i < 9; i++) B.quad('white', cx - 4.8 + i * 1.2, y + 0.001, zz, 0.6, 3, 0, { up: true })
      // zebras across the boulevard on both sides of the intersection (walk north-south), bars run along z
      for (const xx of [R.x0 - 2.2, R.x1 + 2.2]) for (let i = 0; i < 8; i++) B.quad('white', xx, y + 0.001, 15 + i * 1.4 + 0.2, 3, 0.6, 0, { up: true })
      // stop bars
      B.quad('white', cx - 3, y + 0.001, BOULEVARD.z0 - 4.2, 5.6, 0.45, 0, { up: true })
      B.quad('white', cx + 3, y + 0.001, BOULEVARD.z1 + 4.2, 5.6, 0.45, 0, { up: true })
      B.quad('white', R.x0 - 4.2, y + 0.001, 17.2, 0.45, 5.6, 0, { up: true })
      B.quad('white', R.x1 + 4.2, y + 0.001, 22.8, 0.45, 5.6, 0, { up: true })
    }
    // mid-block crossing of the boulevard between the waste-services depot and the landfill / recycling side
    for (let i = 0; i < 7; i++) B.quad('white', -354.2 + i * 1.4, y + 0.001, midBlv, 0.6, BOULEVARD.z1 - BOULEVARD.z0 - 0.8, 0, { up: true })
    // crossings of the perimeter road (x -132..-120) so the new district is walkable from the original map
    for (const zz of [8, 38, -34, -72]) for (let i = 0; i < 7; i++) B.quad('white', -126, y + 0.001, zz - 4.2 + i * 1.4, 7.2, 0.6, 0, { up: true })
    return B.merged()
  }, [])
}

function Roads() {
  const A = assetMats()
  const road = useMemo(() => surface('asphalt', 270 / 4.33, 260 / 4.33), [])
  const marks = useMarkings()
  const conc = (b) => surface('concrete', (b[1] - b[0]) / 3, (b[3] - b[2]) / 3)
  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[(WEST.x1 - WEST.x0) / 2, 1, (WEST.z1 - WEST.z0) / 2]} position={[(WEST.x0 + WEST.x1) / 2, -1, 0]} />
        {/* invisible boundary of the map: west, north, south */}
        <CuboidCollider args={[0.5, 20, 130]} position={[WEST.x0 + 0.5, 19.5, 0]} />
        <CuboidCollider args={[(WEST.x1 - WEST.x0) / 2, 20, 0.5]} position={[(WEST.x0 + WEST.x1) / 2, 19.5, WEST.z1 - 0.5]} />
        <CuboidCollider args={[(WEST.x1 - WEST.x0) / 2, 20, 0.5]} position={[(WEST.x0 + WEST.x1) / 2, 19.5, WEST.z0 + 0.5]} />
        {Object.values(BLOCKS).map((b, i) => <CuboidCollider key={i} args={[(b[1] - b[0]) / 2, CURB / 2, (b[3] - b[2]) / 2]} position={[(b[0] + b[1]) / 2, CURB / 2, (b[2] + b[3]) / 2]} />)}
        {/* parking-lot driveway: a gentle ramp up the kerb from Maple Avenue (kerb is 15 cm; the ramp makes it drivable) */}
        <CuboidCollider args={[1.6, 0.05, 3.25]} position={[MAPLE.x1 - 1.6, CURB / 2 - 0.05, -107.75]} rotation={[0, 0, Math.atan2(CURB, 3.2)]} />
      </RigidBody>
      <mesh position={[(WEST.x0 + WEST.x1) / 2, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} material={road} receiveShadow><planeGeometry args={[WEST.x1 - WEST.x0, WEST.z1 - WEST.z0]} /></mesh>
      {Object.values(BLOCKS).map((b, i) => (
        <mesh key={i} position={[(b[0] + b[1]) / 2, CURB / 2, (b[2] + b[3]) / 2]} material={conc(b)} receiveShadow><boxGeometry args={[b[1] - b[0], CURB, b[3] - b[2]]} /></mesh>
      ))}
      {/* granite kerb stones along the block edges */}
      <Kerbs />
      {marks.white && <mesh geometry={marks.white} material={A.paintWhite} receiveShadow />}
      {marks.yellow && <mesh geometry={marks.yellow} material={A.paintYellow} receiveShadow />}
      {/* lot driveway ramp (visual) */}
      <mesh position={[MAPLE.x1 - 1.6, CURB / 2 - 0.05, -107.75]} rotation={[0, 0, Math.atan2(CURB, 3.2)]} material={A.f.concrete} receiveShadow><boxGeometry args={[3.2, 0.1, 6.5]} /></mesh>
    </>
  )
}

function Kerbs() {
  const mat = surface('limestone', 0.2, 10, { color: '#a9a49b' })
  const geos = useMemo(() => {
    const B = new Builder()
    for (const b of Object.values(BLOCKS)) {
      const [x0, x1, z0, z1] = b
      B.box('k', (x0 + x1) / 2, CURB / 2 + 0.005, z0 + 0.15, x1 - x0, CURB + 0.01, 0.3)
      B.box('k', (x0 + x1) / 2, CURB / 2 + 0.005, z1 - 0.15, x1 - x0, CURB + 0.01, 0.3)
      B.box('k', x0 + 0.15, CURB / 2 + 0.005, (z0 + z1) / 2, 0.3, CURB + 0.01, z1 - z0)
      B.box('k', x1 - 0.15, CURB / 2 + 0.005, (z0 + z1) / 2, 0.3, CURB + 0.01, z1 - z0)
    }
    return B.merged()
  }, [])
  return geos.k ? <mesh geometry={geos.k} material={mat} receiveShadow /> : null
}

/** Open-road tolling gantry over the boulevard (Tomball Pkwy) - EZ TAG style: two slim posts and
 *  an overhead beam, no booths, nobody stops. The posts use the exact same thin-post pattern as
 *  StreetLamp above (a real CylinderCollider, well outside the travel lanes on both sides); the
 *  beam itself has no collider since nothing in the game reaches 4.6m up over the road. Billing
 *  for actually driving under it lives in WestEnd()'s useFrame below, not here - this component
 *  is just what you see. */
function TollGantry({ x }) {
  const A = assetMats()
  const green = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1d5a45', roughness: 0.45, metalness: 0.1 }), [])
  const legZ0 = BOULEVARD.z0 - 1.5, legZ1 = BOULEVARD.z1 + 1.5, cz = (BOULEVARD.z0 + BOULEVARD.z1) / 2, H = 4.6
  return (
    <group position={[x, 0, 0]}>
      {[legZ0, legZ1].map((z) => (
        <RigidBody key={z} type="fixed" colliders={false} position={[0, 0, z]}>
          <CylinderCollider args={[H / 2, 0.09]} position={[0, H / 2, 0]} />
          <mesh position={[0, H / 2, 0]} material={A.galv} castShadow><cylinderGeometry args={[0.08, 0.1, H, 10]} /></mesh>
        </RigidBody>
      ))}
      <mesh position={[0, H, cz]} material={A.galv} castShadow><boxGeometry args={[0.22, 0.3, legZ1 - legZ0]} /></mesh>
      {[legZ0 + 2, cz, legZ1 - 2].map((z) => (
        <mesh key={'pod' + z} position={[0.14, H - 0.22, z]} material={A.galv}><boxGeometry args={[0.16, 0.16, 0.26]} /></mesh>
      ))}
      {[0, Math.PI].map((r) => (
        <group key={r} position={[0, 0, cz]} rotation={[0, r, 0]}>
          <mesh position={[0, H - 0.8, 0]} material={green}><boxGeometry args={[3.2, 1.1, 0.04]} /></mesh>
          <BrandSign text="TOMBALL PKWY" sub="EZ TAG ONLY · NO STOPPING" position={[0, H - 0.8, 0.03]} width={3.0} size={100} color="#ffffff" glow="#ffffff" />
        </group>
      ))}
    </group>
  )
}

/** Fenced construction site for a block that belongs to a later phase. Honest: says plainly that it is not built. */
function Site({ id, b }) {
  const A = assetMats()
  const { x0, x1, z0, z1 } = BX(b)
  const meta = PHASES[id]
  const inset = 1.2
  const fx0 = x0 + inset, fx1 = x1 - inset, fz0 = z0 + inset, fz1 = z1 - inset
  const H = 2.4
  const geos = useMemo(() => {
    const B = new Builder()
    const wall = (ax, az, bx, bz) => {
      const L = Math.hypot(bx - ax, bz - az)
      const horiz = Math.abs(bz - az) < 1e-6
      const n = Math.ceil(L / 2.4)
      for (let k = 0; k <= n; k++) { const t = k / n; B.box('post', ax + (bx - ax) * t, CURB + H / 2, az + (bz - az) * t, 0.12, H, 0.12) }
      if (horiz) { B.box('panel', (ax + bx) / 2, CURB + H / 2 - 0.05, az, L, H - 0.2, 0.05); B.box('rail', (ax + bx) / 2, CURB + H - 0.04, az, L, 0.08, 0.1) }
      else { B.box('panel', ax, CURB + H / 2 - 0.05, (az + bz) / 2, 0.05, H - 0.2, L); B.box('rail', ax, CURB + H - 0.04, (az + bz) / 2, 0.1, 0.08, L) }
    }
    wall(fx0, fz0, fx1, fz0); wall(fx0, fz1, fx1, fz1); wall(fx0, fz0, fx0, fz1); wall(fx1, fz0, fx1, fz1)
    return B.merged()
  }, [fx0, fx1, fz0, fz1])
  const gravel = surface('concrete', (x1 - x0) / 4, (z1 - z0) / 4, { color: '#b3a58f' })
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
  return (
    <group>
      <Pad x0={fx0} x1={fx1} z0={fz0} z1={fz1} y={CURB} mat={gravel} lift={0.012} />
      {geos.post && <mesh geometry={geos.post} material={A.galv} castShadow />}
      {geos.panel && <mesh geometry={geos.panel} material={surface('wood', 6, 1, { color: '#8e8a82' })} castShadow receiveShadow />}
      {geos.rail && <mesh geometry={geos.rail} material={A.galv} />}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[(fx1 - fx0) / 2, H / 2, 0.08]} position={[cx, CURB + H / 2, fz0]} />
        <CuboidCollider args={[(fx1 - fx0) / 2, H / 2, 0.08]} position={[cx, CURB + H / 2, fz1]} />
        <CuboidCollider args={[0.08, H / 2, (fz1 - fz0) / 2]} position={[fx0, CURB + H / 2, cz]} />
        <CuboidCollider args={[0.08, H / 2, (fz1 - fz0) / 2]} position={[fx1, CURB + H / 2, cz]} />
      </RigidBody>
      {/* sign facing the nearest road (the boulevard side) */}
      {(() => {
        const south = z0 > 20 // block south of the boulevard
        const sz = south ? fz0 - 0.06 : fz1 + 0.06
        return <BrandSign text={meta.title} sub={meta.sub} position={[cx, CURB + 1.5, sz]} rotation={[0, south ? Math.PI : 0, 0]} width={Math.min(14, x1 - x0 - 8)} size={90} color="#f4f1ea" />
      })()}
    </group>
  )
}

export default function WestEnd() {
  const lamps = useMemo(() => {
    const out = []
    // boulevard, both sides, between intersections (arms over the road)
    for (let x = -144; x > -392; x -= 28) {
      if ((x < MAPLE.x1 + 8 && x > MAPLE.x0 - 8) || (x < CEDAR.x1 + 8 && x > CEDAR.x0 - 8)) continue
      out.push([[x, CURB, BOULEVARD.z0 - 0.9], 0], [[x - 14, CURB, BOULEVARD.z1 + 0.9], Math.PI])
    }
    // Maple and Cedar
    for (const R of [MAPLE, CEDAR]) for (let z = -108; z < 120; z += 30) {
      if (Math.abs(z - 20) < 14) continue
      out.push([[R.x1 + 0.9, CURB, z], -Math.PI / 2], [[R.x0 - 0.9, CURB, z + 15], Math.PI / 2])
    }
    return out
  }, [])
  // Tomball Pkwy open-road toll: charge once per pass under the gantry (TOLL.x), only while
  // actually driving (playerState.vehicle is set while in a car/bike - see vehicles/Vehicle.jsx),
  // and only near the boulevard's own z band so walking near x=TOLL.x elsewhere on the map can't
  // trigger it. `side` tracks which side of the gantry the player was on last frame; crossing
  // flips it and fires exactly one charge, so driving back and forth across it charges each pass
  // (as a real EZ TAG gantry would) without ever double-charging a single crossing.
  const tollSide = useRef(null)
  useFrame(() => {
    if (!playerState.vehicle) { tollSide.current = null; return }
    const p = playerState.position
    if (Math.abs(p.z - (BOULEVARD.z0 + BOULEVARD.z1) / 2) > 10) { tollSide.current = null; return }
    const side = p.x < TOLL.x ? -1 : 1
    if (tollSide.current !== null && side !== tollSide.current) {
      if (useJobs.getState().spend(TOLL.fare, 'toll', 'Tomball Pkwy toll (EZ TAG)')) {
        useStore.getState().showToast(`EZ TAG: $${TOLL.fare.toFixed(2)} toll charged - Tomball Pkwy`)
      }
    }
    tollSide.current = side
  })
  return (
    <>
      <StaticBatch name="westend-roads">
        <Roads />
        {lamps.map(([p, yaw], i) => <StreetLamp key={i} position={p} yaw={yaw} height={6.5} />)}
        <StreetSign position={[MAPLE.x1 + 0.7, CURB, BOULEVARD.z0 - 0.7]} text="MAPLE AVE" num="2200 BLOCK" />
        <StreetSign position={[CEDAR.x1 + 0.7, CURB, BOULEVARD.z0 - 0.7]} text="CEDAR AVE" />
        <StreetSign position={[MAPLE.x0 - 0.7, CURB, BOULEVARD.z1 + 0.7]} text="HARBOR BLVD" />
        <StreetSign position={[-350, CURB, BOULEVARD.z0 - 0.7]} text="WEBSTER ST" />
        <StreetSign position={[-180, CURB, BOULEVARD.z1 + 0.7]} text="CAROLYN ST" />
        <StreetSign position={[TOLL.x + 34, CURB, BOULEVARD.z0 - 0.7]} text="TOMBALL PKWY" num="TOLL ROAD 1 MI" />
        <StreetSign position={[-145, CURB, BOULEVARD.z1 + 0.7]} text="TOMBALL PKWY" num="DOWNTOWN 2 MI" />
        <StreetSign position={[-145, CURB, BOULEVARD.z0 - 0.7]} text="SPEED LIMIT" num="65" />
        <TollGantry x={TOLL.x} />
        {Object.entries(PHASES).map(([id]) => <Site key={id} id={id} b={id === 'se' ? PARADE.site : BLOCKS[id]} />)}
      </StaticBatch>
      <MeadowbrookPark />
      <FootballGrounds />
      <RecreationGrounds />
      <WasteDistrict />
      <IndustrialRow />
      <TerraceSite />
      <HarborParade />
      <Airport />
      <AirportFreeway />
    </>
  )
}

