import Pedestrians from './Pedestrians.jsx'
import { useEffect, useMemo, useRef } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface, surfaceHD, signatureMarble } from './materials.js'
import { registerInteractable } from '../state/runtime.js'
import { useStore } from '../state/store.js'
import { GALLERY } from './layout.js'
import { RenovatedShell, EntranceDressing } from './facade/Renovated.jsx'
import { DoubleDoor } from './Door.jsx'
import { RecordsInterior, LoungeInterior } from './Rooms.jsx'
import { CinemaInterior, CINEMA, TOWER_IH } from './Cinema.jsx'
import CinemaExterior, { CINEMA_FRONT } from './CinemaExterior.jsx'
import PlazaParking from './Parking.jsx'
import PlazaBuilding, { PLAZA } from './PlazaBuilding.jsx'
import { BrandSign } from './signs.jsx'
import { Trees, FlowerBed, Bench, StreetLamp, Bollard, Fountain, ParkingLot, Planter, Lawn } from './props.jsx'
import { nightLit } from '../state/environment.js'
import { StaticBatch } from './batch.jsx'
import ConcertStage from './ConcertStage.jsx'
import Ocean, { OCEAN } from './Ocean.jsx'
import WestEnd from './westend/WestEnd.jsx'
import JusticeDistrict, { JUSTICE } from './Justice.jsx'
import CountyJail, { JAIL, JAIL_YARD } from './CountyJail.jsx'
import StatePrison, { PRISON, PRISON_YARD } from './StatePrison.jsx'
import RehabCenter, { REHAB } from './RehabCenter.jsx'
import JobDistrict, { DISTRICT, WASH_B } from './JobDistrict.jsx'
import MotorCourt, { MOTORS } from './MotorCourt.jsx'
import Island from './Island.jsx'
import Mansion from './Mansion.jsx'
import ResidenceTower from './assets/residence/ResidenceTower.jsx'
import Library from './Library.jsx'
import LibraryPeople from './LibraryPeople.jsx'
import Museum from './museum/Museum.jsx'
import Gym from './gym/Gym.jsx'
import ConcertHall from './ConcertHall.jsx'
import ParkGolf from './ParkGolf.jsx'
import Casino from './Casino.jsx'
import ParkingGarage from './ParkingGarage.jsx'
import { SITE as GARAGE_SITE } from '../config/parkingGarage.js'
import { LIB } from '../config/library.js'
import { groundPieces } from '../config/island.js'
import { EXTRA_COLLIDERS } from '../config/extraColliders.js'
import { useFrame, useThree } from '@react-three/fiber'

// Commercial district: asphalt avenue and cross street with real lane markings, concrete
// sidewalks with curbs, street trees and commercial streetlights, a landscaped square with a
// fountain, a parking lot, the Reign Gallery, Vision Storms Plaza, storefront venues and a skyline.

export const CURB = 0.15
const AVENUE = { x0: -6, x1: 6, z0: -26, z1: 110 }
const CROSS = { z0: 14, z1: 26 }
const SQUARE = { x0: 36, x1: 72, z0: -38, z1: 6 }
const LOT = { x0: -98, x1: -52, z0: 32, z1: 66 }

export default function City() {
  const paintWhite = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ecebe6', roughness: 0.7 }), [])
  const paintYellow = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e3b52c', roughness: 0.7 }), [])

  // sidewalk / plaza slabs (raised 15 cm, the curb is a walkable step)
  const blocks = [
    [-120, AVENUE.x0, CROSS.z1, 120],
    [AVENUE.x1, 120, CROSS.z1, 120],
    [-120, AVENUE.x0, -120, CROSS.z0],
    [AVENUE.x1, 120, -120, CROSS.z0],
    [AVENUE.x0, AVENUE.x1, -120, AVENUE.z0],
  ]
  const road = surface('asphalt', 60, 60)

  const streetTrees = useMemo(() => {
    const t = []
    for (let z = -18; z <= 100; z += 14) {
      if (z > CROSS.z0 - 6 && z < CROSS.z1 + 6) continue
      const nearPlaza = Math.abs(z - (PLAZA.z0 + PLAZA.z1) / 2) < 5
      const nearVenue = Math.abs(z + 7) < 4 || Math.abs(z - 44) < 4
      const nearCinema = Math.abs(z - CINEMA_FRONT.cz) < CINEMA_FRONT.half + 1 // keep the portico clear
      if (!nearPlaza && !nearCinema) t.push([-8.6, CURB, z, 0.95 + ((z * 7) % 5) * 0.04])
      if (!nearVenue) t.push([8.6, CURB, z, 1 + ((z * 3) % 5) * 0.04])
    }
    for (let x = -100; x <= 100; x += 16) {
      if (Math.abs(x) < 14) continue
      t.push([x, CURB, CROSS.z0 - 2.6, 1], [x + 8, CURB, CROSS.z1 + 2.6, 1])
    }
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2
      t.push([(SQUARE.x0 + SQUARE.x1) / 2 + Math.cos(a) * 17, CURB, (SQUARE.z0 + SQUARE.z1) / 2 + Math.sin(a) * 18, 1.1 + (i % 3) * 0.1])
    }
    for (let x = LOT.x0 + 4; x < LOT.x1; x += 9) t.push([x, CURB, LOT.z1 + 3, 1.15]) // shade trees along the lot's north sidewalk
    return t
  }, [])

  const lamps = useMemo(() => {
    const l = []
    for (let z = -20; z <= 100; z += 24) {
      if (z > CROSS.z0 - 4 && z < CROSS.z1 + 4) continue
      l.push([[-7.3, CURB, z], -Math.PI / 2], [[7.3, CURB, z + 12], Math.PI / 2])
    }
    for (let x = -96; x <= 96; x += 32) { if (Math.abs(x) < 12) continue; l.push([[x, CURB, CROSS.z0 - 1.3], Math.PI], [[x + 16, CURB, CROSS.z1 + 1.3], 0]) }
    return l
  }, [])

  return (
    <StaticBatch name="city">
      {/* ground, road and sidewalks */}
      <RigidBody type="fixed" colliders={false}>
        {/* the ground runs east to the bay so the beach and the sea are walkable */}
        {/* (the Isla Serena swimming pool is cut out of the ground slab) */}
        {groundPieces(-130, OCEAN.x1 + 5, -130, 130).map(([x, y, z, hx, hy, hz], i) => <CuboidCollider key={'g' + i} args={[hx, hy, hz]} position={[x, y, z]} />)}
        {/* invisible world boundary: nobody drives or walks off the edge of the map */}
        {[[OCEAN.x1 + 4.5, 0, 0.5, 130], [(OCEAN.x1 + 5 - 130) / 2, 129.5, (OCEAN.x1 + 5 + 130) / 2, 0.5], [(OCEAN.x1 + 5 - 130) / 2, -129.5, (OCEAN.x1 + 5 + 130) / 2, 0.5]].map(([x, z, hx, hz], i) => <CuboidCollider key={'edge' + i} args={[hx, 20, hz]} position={[x, 19.5, z]} />)}
        {blocks.map(([x0, x1, z0, z1], i) => (
          <CuboidCollider key={i} args={[(x1 - x0) / 2, CURB / 2, (z1 - z0) / 2]} position={[(x0 + x1) / 2, CURB / 2, (z0 + z1) / 2]} />
        ))}
      </RigidBody>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={road} receiveShadow><planeGeometry args={[260, 260]} /></mesh>
      {blocks.map(([x0, x1, z0, z1], i) => (
        <mesh key={i} position={[(x0 + x1) / 2, CURB / 2, (z0 + z1) / 2]} material={surface('concrete', (x1 - x0) / 3, (z1 - z0) / 3)} receiveShadow>
          <boxGeometry args={[x1 - x0, CURB, z1 - z0]} />
        </mesh>
      ))}
      {/* granite curbs along the avenue */}
      {[[AVENUE.x0 - 0.15, -26, CROSS.z0], [AVENUE.x1 + 0.15, -26, CROSS.z0], [AVENUE.x0 - 0.15, CROSS.z1, 110], [AVENUE.x1 + 0.15, CROSS.z1, 110]].map(([x, z0, z1], i) => (
        <mesh key={'curb' + i} position={[x, CURB / 2 + 0.005, (z0 + z1) / 2]} material={surface('limestone', 0.2, (z1 - z0) / 4, { color: '#a9a49b' })}>
          <boxGeometry args={[0.3, CURB + 0.01, z1 - z0]} />
        </mesh>
      ))}

      {/* lane markings: double yellow centre line, dashed white lanes, stop bars, zebra crosswalks */}
      {[[-26, CROSS.z0 - 4], [CROSS.z1 + 4, 110]].map(([z0, z1], i) => (
        <group key={'cl' + i}>
          {[-0.14, 0.14].map((dx) => <mesh key={dx} position={[dx, 0.012, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={paintYellow}><planeGeometry args={[0.12, z1 - z0]} /></mesh>)}
          {Array.from({ length: Math.floor((z1 - z0) / 9) }, (_, k) => z0 + 4 + k * 9).map((z) => [-3, 3].map((x) => (
            <mesh key={x + ':' + z} position={[x, 0.012, z]} rotation={[-Math.PI / 2, 0, 0]} material={paintWhite}><planeGeometry args={[0.13, 3]} /></mesh>
          )))}
        </group>
      ))}
      {[[-110, -10], [10, 110]].map(([x0, x1], i) => (
        <group key={'cc' + i}>
          {[-0.14, 0.14].map((dz) => <mesh key={dz} position={[(x0 + x1) / 2, 0.012, 20 + dz]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} material={paintYellow}><planeGeometry args={[0.12, x1 - x0]} /></mesh>)}
        </group>
      ))}
      {Array.from({ length: 9 }, (_, i) => -4.8 + i * 1.2).map((x) => (
        <group key={'zx' + x}>
          <mesh position={[x, 0.013, CROSS.z0 - 2]} rotation={[-Math.PI / 2, 0, 0]} material={paintWhite}><planeGeometry args={[0.6, 3]} /></mesh>
          <mesh position={[x, 0.013, CROSS.z1 + 2]} rotation={[-Math.PI / 2, 0, 0]} material={paintWhite}><planeGeometry args={[0.6, 3]} /></mesh>
        </group>
      ))}
      {Array.from({ length: 8 }, (_, i) => 15 + i * 1.4).map((z) => (
        <group key={'zz' + z}>
          <mesh position={[-8.2, 0.013, z + 0.2]} rotation={[-Math.PI / 2, 0, 0]} material={paintWhite}><planeGeometry args={[3, 0.6]} /></mesh>
          <mesh position={[8.2, 0.013, z + 0.2]} rotation={[-Math.PI / 2, 0, 0]} material={paintWhite}><planeGeometry args={[3, 0.6]} /></mesh>
        </group>
      ))}
      {[[-3, CROSS.z0 - 4], [3, CROSS.z1 + 4]].map(([x, z]) => (
        <mesh key={'stop' + x} position={[x, 0.013, z]} rotation={[-Math.PI / 2, 0, 0]} material={paintWhite}><planeGeometry args={[5.6, 0.45]} /></mesh>
      ))}

      <Trees trees={streetTrees} />
      {lamps.map(([p, yaw], i) => <StreetLamp key={i} position={p} yaw={yaw} />)}

      {/* Reign Gallery forecourt */}
      <FlowerBed x={-4} z={-29.3} w={3.6} d={2.4} seed={2} />
      <FlowerBed x={4} z={-29.3} w={3.6} d={2.4} seed={3} />
      <Bench position={[-9, CURB, -28]} yaw={Math.PI / 2} />
      <Bench position={[9, CURB, -28]} yaw={-Math.PI / 2} />
      {[-2.4, 2.4].map((x) => <Bollard key={x} position={[x, CURB, -27]} />)}

      <Square />

      {/* parking for the plaza */}
      <PlazaParking {...LOT} y={CURB} />

      <PlazaBuilding />

      {/* storefront venues */}
      <Venue id="cinema" name="VISION CINEMA" sub="CINEMA · NOW SHOWING" x0={CINEMA.x0} x1={CINEMA.x1} z0={CINEMA.z0} z1={CINEMA.z1} h={TOWER_IH + 2} ih={TOWER_IH} facing="+x" seed={1} wall="limestone" floorKind="none" frontage renovated doorHalf={1.3} doorH={2.8} kitSpec={{ groundWindows: false, pilasters: false, upper: ['+x'] }} interior={<CinemaInterior />} />
      <CinemaExterior />
      <ConcertStage />
      <Ocean />
      <JusticeDistrict />
      <CountyJail />
      <StatePrison />
      <RehabCenter />
      <JobDistrict />
      <Pedestrians />
      <WestEnd />
      <MotorCourt />
      <Mansion />
      <ResidenceTower />
      <Island />
      <Library />
      <Museum />
      <Gym />
      <ConcertHall />
      <ParkGolf />
      <Casino />
      <ParkingGarage />
      <RigidBody type="fixed" colliders={false}>
        {EXTRA_COLLIDERS.map(([x, y, z, hx, hy, hz], i) => <CuboidCollider key={i} args={[hx, hy, hz]} position={[x, y, z]} />)}
      </RigidBody>
      <LibraryPeople />
      <Venue id="records" name="STORMS RECORDS" sub="VINYL · STEMS · MERCH" x0={10} x1={30} z0={-20} z1={6} h={12} facing="-x" seed={2} wall="brick" renovated interior={<RecordsInterior x0={10} x1={30} z0={-20} z1={6} />} />
      <Venue id="lounge" name="VISION MUSIC LOUNGE" sub="LOUNGE · LIVE SETS" x0={10} x1={32} z0={32} z1={56} h={10} facing="-x" seed={4} wall="limestone" renovated interior={<LoungeInterior x0={10} x1={32} z0={32} z1={56} />} />
      <FlowerBed x={8.3} z={-15} w={1.6} d={5} seed={4} />
      <FlowerBed x={8.3} z={1} w={1.6} d={5} seed={5} />
      <FlowerBed x={8.3} z={36} w={1.6} d={5} seed={6} />
      <FlowerBed x={8.3} z={52} w={1.6} d={5} seed={7} />

      <Skyline />
    </StaticBatch>
  )
}

/** Venue interiors render only when the camera is inside the building (they're behind walls). */
function Interior({ x0, x1, z0, z1, peek, children }) {
  const ref = useRef()
  const { camera } = useThree()
  useFrame(() => {
    const c = camera.position
    // `peek` (renovated venues with real windows): also draw the interior from the street in front of the glass
    const px0 = peek ? peek.x0 : x0 - 0.5, px1 = peek ? peek.x1 : x1 + 0.5
    if (ref.current) ref.current.visible = c.x > px0 && c.x < px1 && c.z > z0 - 0.5 && c.z < z1 + 0.5
  })
  return <group ref={ref} userData={{ noBatch: true }}>{children}</group>
}

function Square() {
  const cx = (SQUARE.x0 + SQUARE.x1) / 2, cz = (SQUARE.z0 + SQUARE.z1) / 2
  const benches = useMemo(() => {
    const out = []
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8
      // face the fountain: avatar forward (+z) rotated by yaw points toward the centre
      out.push([[cx + Math.cos(a) * 9.5, CURB, cz + Math.sin(a) * 9.5], Math.atan2(-Math.cos(a), -Math.sin(a))])
    }
    return out
  }, [cx, cz])
  return (
    <group>
      <Lawn x0={SQUARE.x0} x1={SQUARE.x1} z0={SQUARE.z0} z1={SQUARE.z1} y={CURB} skip={[[cx, cz, 12.6], [cx - 2.5, cx + 2.5, SQUARE.z0, SQUARE.z1], [SQUARE.x0, SQUARE.x1, cz - 2.5, cz + 2.5]]} />
      {/* Realism upgrade demo: this block's pavers use surfaceHD (a derived normal map, so raking
          light catches real edges between stones) to preview the pass before it rolls out further. */}
      <mesh position={[cx, CURB + 0.008, cz]} rotation={[-Math.PI / 2, 0, 0]} material={surfaceHD('pavers', 6, 6)} receiveShadow><circleGeometry args={[12, 48]} /></mesh>
      <mesh position={[cx, CURB + 0.007, cz]} rotation={[-Math.PI / 2, 0, 0]} material={surfaceHD('pavers', 2, 11)}><planeGeometry args={[4, SQUARE.z1 - SQUARE.z0]} /></mesh>
      <mesh position={[cx, CURB + 0.007, cz]} rotation={[-Math.PI / 2, 0, 0]} material={surfaceHD('pavers', 9, 2)}><planeGeometry args={[SQUARE.x1 - SQUARE.x0, 4]} /></mesh>
      <Fountain position={[cx, CURB, cz]} radius={4} />
      {benches.map(([p, yaw], i) => <Bench key={i} position={p} yaw={yaw} />)}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <FlowerBed key={i} x={cx + sx * 11.5} z={cz + sz * 13} w={6} d={4} seed={10 + i} />
      ))}
      {[[-1, 0], [1, 0], [0, -1], [0, 1]].map(([sx, sz], i) => <Bollard key={i} position={[cx + sx * 12.6 + sx * 0.6, CURB, cz + sz * 12.6 + (sx ? 2.6 : 0)]} />)}
      <StreetLamp position={[SQUARE.x0 + 2, CURB, cz + 4]} yaw={0} double />
      <StreetLamp position={[SQUARE.x1 - 2, CURB, cz - 4]} yaw={0} double />
      <mesh position={[SQUARE.x0 + 0.6, CURB + 0.6, cz - 8]} material={surface('limestone', 1, 0.3)} castShadow><boxGeometry args={[0.6, 1.2, 6.4]} /></mesh>
      <BrandSign text="ENERGY EXCHANGES SQUARE" position={[SQUARE.x0 + 0.29, CURB + 0.72, cz - 8]} rotation={[0, -Math.PI / 2, 0]} width={6} size={120} color="#2b2b2e" glow="#ffffff" />
    </group>
  )
}

// ---------------- Venue ----------------
// Commercial building with a storefront, awning, branded signage and office floors above.
// Pass `interior` to make it enterable (real walls, working double doors, the interior you give).
const SHELL_T = 0.4
const SHELL_H = 6
const DOOR_HALF = 1.6
const DOOR_H = 3.6

/** Per-face materials for a wall box: plaster on the face pointing into the room, `ext` elsewhere. */
export function wallMaterials(ext, int, inward) {
  const order = ['+x', '-x', '+y', '-y', '+z', '-z'] // BoxGeometry face order
  return order.map((f) => (f === inward ? int : ext))
}

function Venue({ id, name, sub, x0, x1, z0, z1, h, facing, seed, interior, wall = 'limestone', ih = SHELL_H, floorKind, frontage = false, renovated = false, doorHalf, doorH, kitSpec }) {
  const mats = getMaterials()
  const w = x1 - x0, d = z1 - z0
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
  const tower = mats.windows(seed, Math.round(w / 4), Math.max(1, Math.round((h - ih) / 4)))
  const ext = surface(wall, wall === 'brick' ? d / 3 : d / 6, wall === 'brick' ? 2 : 1.2)
  const plaster = surface('plaster', 4, 2)
  const floor = signatureMarble(Math.max(2, Math.round(w / 5)), Math.max(2, Math.round(d / 5)))
  const ceiling = useMemo(() => new THREE.MeshStandardMaterial({ color: '#efede8', roughness: 0.9 }), [])
  const fx = facing === '+x' ? x1 : x0
  const s = facing === '+x' ? 1 : -1
  const yaw = facing === '+x' ? Math.PI / 2 : -Math.PI / 2
  const enterable = !!interior
  const kind = sub.split('·')[0].trim().toLowerCase()

  useEffect(() => {
    if (enterable) return
    return registerInteractable('venue-' + id, {
      position: new THREE.Vector3(fx + s * 0.8, CURB, cz),
      radius: 3,
      label: `Vision ${kind} · opens soon`,
      onInteract: () => useStore.getState().showToast(`The ${kind} opens in a later stage. The Energy Exchanges Plaza, Vision Cinema, Reign Gallery, Storms Records and Vision Music Lounge are open.`),
    })
  }, [id, enterable]) // eslint-disable-line react-hooks/exhaustive-deps

  const t = SHELL_T, IH = ih
  // renovated venues get human-scale doors (a 2.0 m pair, 2.4 m tall, with a transom above)
  const DH = renovated ? (doorHalf ?? 1.0) : DOOR_HALF, DHT = renovated ? (doorH ?? 2.4) : DOOR_H
  const facadeX = fx - (s * t) / 2
  const backX = (facing === '+x' ? x0 : x1) + (s * t) / 2
  const segA = cz - DH - z0
  const segB = z1 - (cz + DH)
  const inX = facing === '+x' ? '-x' : '+x'
  const shell = enterable ? [
    [backX, CURB + IH / 2, cz, t, IH, d, facing === '+x' ? '+x' : '-x'],
    [cx, CURB + IH / 2, z0 + t / 2, w, IH, t, '+z'],
    [cx, CURB + IH / 2, z1 - t / 2, w, IH, t, '-z'],
    [facadeX, CURB + IH / 2, z0 + segA / 2, t, IH, segA, inX],
    [facadeX, CURB + IH / 2, z1 - segB / 2, t, IH, segB, inX],
    [facadeX, CURB + DHT + (IH - DHT) / 2, cz, t, IH - DHT, DH * 2, inX],
  ] : []

  const rshell = renovated && enterable
  const spec = { x0, x1, z0, z1, h, ih: IH, facing, base: CURB, door: { half: DH, h: DHT }, wall: wall === 'brick' ? 'brick' : 'stone', seed, ...kitSpec }
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {enterable ? (
          <>
            {shell.map(([x, y, z, sx, sy, sz], i) => <CuboidCollider key={i} args={[sx / 2, sy / 2, sz / 2]} position={[x, y, z]} />)}
            <CuboidCollider args={[w / 2, (h - IH) / 2, d / 2]} position={[cx, CURB + IH + (h - IH) / 2, cz]} />
          </>
        ) : (
          <CuboidCollider args={[w / 2, h / 2, d / 2]} position={[cx, CURB + h / 2, cz]} />
        )}
      </RigidBody>
      {enterable ? (
        <>
          {rshell ? <RenovatedShell spec={spec} /> : shell.map(([x, y, z, sx, sy, sz, inward], i) => (
            <mesh key={i} position={[x, y, z]} material={wallMaterials(ext, plaster, inward)} castShadow receiveShadow><boxGeometry args={[sx, sy, sz]} /></mesh>
          ))}
          <mesh position={[cx, CURB + IH + 0.15, cz]} material={ceiling}><boxGeometry args={rshell ? [w - t * 2, 0.3, d - t * 2] : [w, 0.3, d]} /></mesh>
          {floorKind !== 'none' && <mesh position={[cx, CURB + 0.004, cz]} rotation={[-Math.PI / 2, 0, 0]} material={floor} receiveShadow><planeGeometry args={[w - t * 2, d - t * 2]} /></mesh>}
          <DoubleDoor id={'door-' + id} center={[facadeX, CURB, cz]} halfWidth={DH} height={DHT} facing={yaw} accent="#c9a96a" label={`${kind} doors`} finish={rshell ? 'bronze' : undefined} />
          <Interior x0={x0} x1={x1} z0={z0} z1={z1} peek={rshell ? { x0: facing === '+x' ? x0 - 0.5 : x0 - 22, x1: facing === '+x' ? x1 + 22 : x1 + 0.5 } : undefined}>{interior}</Interior>
        </>
      ) : (
        <mesh position={[cx, CURB + IH / 2, cz]} material={ext} castShadow receiveShadow><boxGeometry args={[w, IH, d]} /></mesh>
      )}
      {rshell && frontage ? null : rshell ? (
        <EntranceDressing origin={[fx, cz]} base={CURB} name={name} sub={sub} doorHalf={DH} doorH={DHT} yaw={yaw} signWidth={Math.min(d - 6, 7)} />
      ) : (
        <>
          <mesh position={[cx, CURB + IH + (h - IH) / 2 + (enterable ? 0.15 : 0), cz]} material={tower} castShadow><boxGeometry args={[w - 0.6, h - IH - (enterable ? 0.3 : 0), d - 0.6]} /></mesh>
          <mesh position={[cx, CURB + h + 0.25, cz]} material={surface('concrete', 2, 0.2)}><boxGeometry args={[w, 0.5, d]} /></mesh>
          <mesh position={[cx, CURB + IH + 0.1, cz]} material={surface('limestone', 4, 0.2)}><boxGeometry args={[w + 0.3, 0.3, d + 0.3]} /></mesh>
          <group position={[fx, CURB, cz]} rotation={[0, yaw, 0]}>
            {/* a custom frontage (e.g. the cinema portico) brings its own sign and canopy */}
            {!frontage && <BrandSign text={name} sub={sub} position={[0, 5.0, 0.08]} width={Math.min(d - 3, 14)} />}
            {!frontage && <mesh position={[0, 3.95, 1.2]} material={mats.blackSteel} castShadow><boxGeometry args={[Math.min(d - 4, 11), 0.16, 2.4]} /></mesh>}
            {[-1, 1].map((k) => (
              <group key={k} position={[k * (DOOR_HALF + 2.6), 0, 0.03]}>
                <mesh position={[0, 1.9, 0]} material={mats.glass}><boxGeometry args={[4.2, 3.0, 0.06]} /></mesh>
                <mesh position={[0, 3.45, 0]} material={mats.aluminum}><boxGeometry args={[4.3, 0.1, 0.1]} /></mesh>
                <mesh position={[0, 0.38, 0]} material={mats.aluminum}><boxGeometry args={[4.3, 0.1, 0.1]} /></mesh>
                {[-2.1, 0, 2.1].map((mx) => <mesh key={mx} position={[mx, 1.9, 0]} material={mats.aluminum}><boxGeometry args={[0.08, 3.1, 0.1]} /></mesh>)}
              </group>
            ))}
            {!enterable && (
              <>
                <mesh position={[0, 1.8, 0.04]} material={mats.glass}><boxGeometry args={[3.2, 3.6, 0.08]} /></mesh>
                <mesh position={[0, 3.65, 0.05]} material={mats.aluminum}><boxGeometry args={[3.3, 0.1, 0.1]} /></mesh>
                <mesh position={[0, 1.8, 0.05]} material={mats.aluminum}><boxGeometry args={[0.06, 3.6, 0.1]} /></mesh>
              </>
            )}
          </group>
        </>
      )}
    </group>
  )
}

// ---------------- Skyline ----------------
const RESERVED = [
  [-12, 12, -130, 130],
  [-130, 130, 10, 30],
  [GALLERY.minX - 6, GALLERY.maxX + 6, GALLERY.minZ - 6, GALLERY.maxZ + 6],
  [-102, -10, 28, 70],
  [SQUARE.x0 - 4, SQUARE.x1 + 4, SQUARE.z0 - 4, SQUARE.z1 + 4],
  [-38, 34, -26, 60],
  [JUSTICE.x0 - 4, JUSTICE.x1 + 4, JUSTICE.z0 - 4, JUSTICE.z1 + 4], // Justice & Rehabilitation District
  [JAIL_YARD.x0 - 8, JAIL.x1 + 4, JAIL.z0 - 14, JAIL.z1 + 14], // County Jail, its yard and forecourt
  [PRISON.x0 - 8, PRISON.x1 + 6, PRISON.z0 - 14, PRISON_YARD.z1 + 6], // State Prison, its yard and forecourt
  [REHAB.x0 - 14, REHAB.x1 + 4, REHAB.z0 - 2, REHAB.z1 + 6], // Rehabilitation Center and its approach
  [DISTRICT.x0 - 2, DISTRICT.x1 + 2, DISTRICT.z0 - 2, DISTRICT.z1 + 2], // Employment District (Job Center, Post Office, car wash)
  [WASH_B.x0 - 3, WASH_B.x0 + WASH_B.w + 3, 26, 56], // second car wash
  [MOTORS.x0 - 2, MOTORS.x1 + 3, MOTORS.z0 - 4, MOTORS.z1 + 2], // Vision Motors & Skyport (court, canopy, jet pads)
  [74, 126, -106, -34], // Reign Estate (mansion, grounds)
  [LIB.x0 - 4, LIB.x1 + 30, LIB.z0 - 4, LIB.z1 + 4], // Public Library and its forecourt
  [12, 74, -128, -80], // Museum of American Heritage, portico and grounds
  [22, 74, -84, -44], // Storm Athletic Club and its forecourt
  [GARAGE_SITE.x0 - 3, GARAGE_SITE.x1 + 3, GARAGE_SITE.z0 - 3, GARAGE_SITE.z1 + 3], // Stormline Parking Garage
]
function Skyline() {
  const mats = getMaterials()
  const towers = useMemo(() => {
    const out = []
    let seed = 7
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    const spots = [[-30, -50], [30, -52], [-44, -30], [-24, -72], [26, -74], [0, -82], [-52, 0], [90, 2], [52, 44], [-30, 80], [30, 80],
      [-62, -60], [62, -64], [86, -30], [-80, 90], [80, 76], [-90, -24], [-22, 98], [22, 98], [-80, 4], [96, 40], [-110, 60]]
    for (const [x, z] of spots) {
      const w = 12 + rnd() * 10, d = 12 + rnd() * 10, h = 24 + rnd() * 56
      const hit = RESERVED.some(([a, b, c, e]) => x + w / 2 > a && x - w / 2 < b && z + d / 2 > c && z - d / 2 < e)
      if (!hit) out.push({ x, z, w, d, h, seed: Math.floor(rnd() * 4), stone: rnd() > 0.55 })
    }
    return out
  }, [])
  const crown = useMemo(() => nightLit(new THREE.MeshStandardMaterial({ color: '#c9c6bf', emissive: '#ffe7c4', roughness: 0.6 }), 0.8, 0), [])
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {towers.map((t, i) => <CuboidCollider key={i} args={[t.w / 2, t.h / 2, t.d / 2]} position={[t.x, CURB + t.h / 2, t.z]} />)}
      </RigidBody>
      {towers.map((t, i) => (
        <group key={i} position={[t.x, CURB, t.z]}>
          <mesh position={[0, 3, 0]} material={surface(t.stone ? 'limestone' : 'concrete', t.w / 6, 1)} castShadow><boxGeometry args={[t.w + 0.4, 6, t.d + 0.4]} /></mesh>
          <mesh position={[0, 6 + (t.h - 6) / 2, 0]} material={mats.windows(t.seed + 4, Math.round(t.w / 4), Math.round((t.h - 6) / 4))} castShadow><boxGeometry args={[t.w, t.h - 6, t.d]} /></mesh>
          <mesh position={[0, t.h + 0.4, 0]} material={crown}><boxGeometry args={[t.w + 0.2, 0.8, t.d + 0.2]} /></mesh>
        </group>
      ))}
    </group>
  )
}
