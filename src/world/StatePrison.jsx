import { useEffect, useMemo } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface, blackMarble } from './materials.js'
import { registerInteractable } from '../state/runtime.js'
import { useStore } from '../state/store.js'
import { BarGate } from './Justice.jsx'
import { Chair, Table, Counter, Sofa, Shelf, Plant, CeilingLight, WallScreen } from './furniture.jsx'
import { Bench, StreetLamp } from './props.jsx'
import { BrandSign } from './signs.jsx'
import { HumanoidCrowd, makeCrowd } from '../npc/HumanoidCrowd.jsx'
import { useJustice } from '../state/justice.js'
import { canvasTexture } from './canvasText.js'
import { ElevatorCar } from './ElevatorCar.jsx'
import { carById, carHole } from '../config/elevators.js'
import {
  JusticeBuilding, Cell, UStair, BoxRoom, Rail, RoomSign, Cruiser, useNpcDialogue, GROUND, T,
} from './Justice.jsx'
import { JailPartition, Beacon, FenceRun, GuardTower, TransportBus, FH, jy, CO, DEPUTY, ORANGE, SCRUBS, WHITE } from './CountyJail.jsx'

// ============================================================================
// STATE PRISON  (fictional, Vision Storms State Corrections)
// Footprint x[-122,-84] z[80,112], the same three-floor plan family as the County Jail but a
// longer-term facility: reception and booking, visitation windows, a large dining hall, library,
// medical, counseling, classroom and vocational training on floor 1; Housing Unit A on floor 2 and
// Housing Unit B (the program unit) on floor 3; a fenced recreation yard on the north side with two
// guard towers. Everything is roleplay with NPCs. Every cell gate and door opens from both sides,
// so nobody is ever locked in; the roleplay kiosk and the exit/report point stand inside the door.
// ============================================================================

export const PRISON = { x0: -122, x1: -84, z0: 80, z1: 112 }
export const PRISON_YARD = { x0: -122, x1: -84, z0: 112, z1: 127 }
const OX = -66 // x offset from the County Jail's layout
const J = (x) => x + OX
const STAIR = { x0: J(-22.4), x1: J(-19), zA: 88, zB: 95.4, landing: 1.6 }
const PZ = 96
const DARK = '#8a8f96'

function PrisonYard() {
  const m = getMaterials()
  const { x0, x1, z0, z1 } = PRISON_YARD
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
  const court = useMemo(() => new THREE.MeshStandardMaterial({
    roughness: 0.95,
    map: canvasTexture(512, 400, (ctx, w, h) => {
      ctx.fillStyle = '#5a6068'; ctx.fillRect(0, 0, w, h)
      for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(${i % 2 ? 255 : 0},${i % 2 ? 255 : 0},${i % 2 ? 255 : 0},0.035)`; ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3) }
      ctx.strokeStyle = '#e9e6dc'; ctx.lineWidth = 5
      ctx.strokeRect(24, 24, w - 48, h - 48)
      ctx.beginPath(); ctx.moveTo(w / 2, 24); ctx.lineTo(w / 2, h - 24); ctx.stroke()
      ctx.beginPath(); ctx.arc(w / 2, h / 2, 54, 0, Math.PI * 2); ctx.stroke()
      ctx.strokeRect(24, h / 2 - 70, 120, 140)
      ctx.strokeRect(w - 144, h / 2 - 70, 120, 140)
    }),
  }), [])
  const fence = useMemo(() => {
    const cache = new Map()
    return (len) => {
      const key = Math.round(len)
      if (!cache.has(key)) {
        const tex = canvasTexture(128, 128, (ctx, w, hh) => {
          ctx.strokeStyle = 'rgba(190,196,204,0.95)'; ctx.lineWidth = 3
          for (let i = -hh; i < w + hh; i += 16) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + hh, hh); ctx.stroke()
            ctx.beginPath(); ctx.moveTo(i + hh, 0); ctx.lineTo(i, hh); ctx.stroke()
          }
        })
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping
        tex.repeat.set(len / 1.2, 4.2 / 1.2)
        cache.set(key, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, color: '#aab0b8' }))
      }
      return cache.get(key)
    }
  }, [])
  return (
    <group>
      <mesh position={[cx, GROUND + 0.01, cz]} rotation={[-Math.PI / 2, 0, 0]} material={surface('asphalt', 6, 5)} receiveShadow><planeGeometry args={[x1 - x0, z1 - z0]} /></mesh>
      <mesh position={[cx, GROUND + 0.02, cz]} rotation={[-Math.PI / 2, 0, 0]} material={court} receiveShadow><planeGeometry args={[15, 11.8]} /></mesh>
      <FenceRun a={[x0, z0]} b={[x0, z1]} h={4.2} mesh={fence} />
      <FenceRun a={[x0, z1]} b={[x1, z1]} h={4.2} mesh={fence} />
      <FenceRun a={[x1, z0]} b={[x1, 118.4]} h={4.2} mesh={fence} />
      <FenceRun a={[x1, 120.2]} b={[x1, z1]} h={4.2} mesh={fence} />
      {/* the yard gate on the east fence, reached from the path along the building; swings into the yard */}
      <BarGate id="prison-yard-gate" hinge={[x1, GROUND, 118.4]} width={1.8} height={3.0} baseYaw={-Math.PI / 2} openAngle={-1.5} label="yard gate" />
      {/* basketball hoop at the west end */}
      <group position={[x0 + 1.6, GROUND, cz]}>
        <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.1, 1.6, 0.1]} position={[0, 1.6, 0]} /></RigidBody>
        <mesh position={[0, 1.6, 0]} material={m.darkMetal}><cylinderGeometry args={[0.07, 0.09, 3.2, 10]} /></mesh>
        <mesh position={[0.45, 3.1, 0]} material={m.blackSteel}><boxGeometry args={[0.8, 0.04, 0.1]} /></mesh>
        <mesh position={[0.85, 3.3, 0]} material={m.glass}><boxGeometry args={[0.05, 0.9, 1.4]} /></mesh>
        <mesh position={[1.05, 3.08, 0]} rotation={[Math.PI / 2, 0, 0]} material={new THREE.MeshStandardMaterial({ color: '#e0521c', roughness: 0.4 })}><torusGeometry args={[0.23, 0.02, 8, 18]} /></mesh>
      </group>
      {/* a weight area and pull-up frames */}
      <group position={[x1 - 8, GROUND, z1 - 3.2]}>
        <RigidBody type="fixed" colliders={false}><CuboidCollider args={[2.8, 1.2, 0.2]} position={[0, 1.2, 0]} /></RigidBody>
        {[-2.4, 0, 2.4].map((x) => <mesh key={x} position={[x, 1.2, 0]} material={m.darkMetal}><cylinderGeometry args={[0.06, 0.06, 2.4, 8]} /></mesh>)}
        <mesh position={[0, 2.35, 0]} rotation={[0, 0, Math.PI / 2]} material={m.chrome}><cylinderGeometry args={[0.04, 0.04, 5.0, 8]} /></mesh>
        <mesh position={[0, 1.9, 0]} rotation={[0, 0, Math.PI / 2]} material={m.chrome}><cylinderGeometry args={[0.04, 0.04, 5.0, 8]} /></mesh>
      </group>
      {[[-95, 114.4], [-112, 114.4], [-112, 124.8]].map(([x, z], i) => <Bench key={i} position={[x, GROUND, z]} yaw={i < 2 ? 0 : Math.PI} />)}
      <StreetLamp position={[x0 + 2.5, GROUND, z0 + 3]} height={7.5} />
      <StreetLamp position={[x1 - 2.5, GROUND, z1 - 2.5]} height={7.5} />
      <BrandSign text="RECREATION YARD" sub="SUPERVISED · ALL ROLEPLAY" position={[-103, GROUND + 4.9, z1 + 0.1]} rotation={[0, 0, 0]} width={6} size={110} color="#f4f1ea" glow="#ffd9a0" />
    </group>
  )
}

function PrisonKiosks() {
  const m = getMaterials()
  useEffect(() => {
    const offs = [
      registerInteractable('prison-roleplay-kiosk', {
        position: new THREE.Vector3(J(-33.5), GROUND + 1, 81.2),
        radius: 2.6,
        label: () => 'Justice roleplay kiosk',
        onInteract: () => { useJustice.getState().openMenu('reentry'); useStore.getState().openPanel({ type: 'justice' }) },
      }),
      registerInteractable('prison-exit-report', {
        position: new THREE.Vector3(J(-40.5), GROUND + 1, 81.4),
        radius: 2.2,
        label: () => 'Roleplay: stop or report',
        onInteract: () => { useJustice.getState().openMenu(null); useStore.getState().openPanel({ type: 'justice' }) },
      }),
    ]
    return () => offs.forEach((o) => o())
  }, [])
  return (
    <group>
      {[J(-33.5), J(-40.5)].map((x, i) => (
        <group key={x} position={[x, GROUND, 81.0]}>
          <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.3, 0.65, 0.18]} position={[0, 0.65, 0]} /></RigidBody>
          <mesh position={[0, 0.65, 0]} material={m.blackSteel} castShadow><boxGeometry args={[0.6, 1.3, 0.36]} /></mesh>
          <mesh position={[0, 1.0, 0.19]} rotation={[-0.35, 0, 0]}><planeGeometry args={[0.46, 0.3]} /><meshBasicMaterial color={i === 0 ? '#2fd0c4' : '#ffb020'} toneMapped={false} /></mesh>
        </group>
      ))}
      <RoomSign text="ROLEPLAY KIOSK" position={[J(-33.5), GROUND + 2.3, 80.46]} width={2.4} color="#0e3a2a" glow="#8fffd6" />
      <RoomSign text="EXIT · REPORT" position={[J(-40.5), GROUND + 2.3, 80.46]} width={2.4} color="#3a1111" glow="#ffb09a" />
    </group>
  )
}

function PrisonDialogue({ y2, y3 }) {
  const N = (id, x, y, z, label, lines) => useNpcDialogue(id, [J(x), y, z], label, lines) // eslint-disable-line react-hooks/rules-of-hooks
  N('prison-deputy', -44, GROUND, 87, 'Talk to Reception Officer', [
    'Officer: Welcome to Vision Storms State Prison. This is a fictional roleplay space: everyone here is an NPC or a visitor like you.',
    'Officer: Stop a scenario any time at the kiosk by the door. You can leave any room or the building whenever you like; nothing here can hold you.',
  ])
  N('prison-booking', -41.5, GROUND, 94.3, 'Talk to Intake Officer', [
    'Intake Officer: People arrive here after a court has sentenced them. We check identity, inventory property, screen health, and explain the rules and the rights they keep.',
  ])
  N('prison-holding', -53, GROUND, 83.5, 'Talk to the new arrival (roleplay)', [
    'New arrival: First day. They told me about the programs I can sign up for, and how to reach a lawyer or my family.',
  ])
  N('prison-visit-v', -31, GROUND, 94, 'Talk to the visitor', [
    'Visitor: I take two buses to get here every month. Visits matter: people who stay connected to family do better after release.',
  ])
  N('prison-visit-r', -31, GROUND, 97.8, 'Talk to the resident (roleplay)', [
    'Resident: It\'s all pretend here, but the idea is real. A visit changes the whole week.',
  ])
  N('prison-co-door', -46.5, GROUND, 97.3, 'Talk to Correctional Officer', [
    'Correctional Officer: Everything past this door is roleplay and every door opens from both sides. Dining, library, medical, counseling and classes are down the corridor.',
  ])
  N('prison-cook', -46, GROUND, 106.1, 'Talk to kitchen staff', [
    'Kitchen Staff: Three meals a day. Special diets for health or faith have to be honored, and residents work in the kitchen to earn job experience.',
  ])
  N('prison-medical', -33, GROUND, 107.5, 'Talk to Nurse', [
    'Nurse: Health care is a right here, including mental health care. We also plan medication and clinic appointments before anyone is released.',
  ])
  N('prison-counselor', -27.5, GROUND, 108, 'Talk to Counselor', [
    'Counselor: Counseling covers stress, grief and planning ahead. Press E at the kiosk to follow a reentry story.',
  ])
  N('prison-teacher', -21.5, GROUND, 109.6, 'Talk to Vocational Instructor', [
    'Instructor: This is welding and electrical basics. Certificates that employers outside recognize are one of the best-studied ways to reduce repeat offenses.',
  ])
  N('prison-librarian', -50.5, GROUND, 109.8, 'Talk to Librarian', [
    'Librarian: Law books, novels and study guides. Residents earn high-school equivalency diplomas and college credits in this room.',
  ])
  N('prison-yard-co', -60, GROUND, 96, 'Talk to yard officer', [
    'Yard Officer: Fresh air and exercise are required daily. The yard gate opens from inside, too.',
  ])
  N('prison-station-2', -41.5, y2, 85.4, 'Talk to Unit Officer', [
    'Unit Officer: This is Housing Unit A. Cells open from both sides in this story, and staff walk the unit on a schedule day and night.',
  ])
  N('prison-station-3', -41.5, y3, 85.4, 'Talk to Unit Officer', [
    'Unit Officer: Housing Unit B is the program unit. Residents here take classes and counseling each day.',
  ])
  N('prison-case', -29, y3, 88.5, 'Talk to Caseworker', [
    'Caseworker: Reentry planning starts on day one: documents, skills, health care, housing and work. Everyone gets a turn to talk, and nobody has to share more than they\'re comfortable with.',
  ])
  return null
}

export function StatePrison() {
  const m = getMaterials()
  const { x0, x1, z0, z1 } = PRISON
  const cx = (x0 + x1) / 2
  const car = carById('prison')
  const y2 = jy(1), y3 = jy(2)
  const lobbyFloor = useMemo(() => blackMarble('#8aa0b8', 6, 5), []) // public lobby: polished black marble, steel-blue vein
  const cellFloor = useMemo(() => surface('concrete', 10, 8, { color: '#85827c' }), [])
  const upper = useMemo(() => surface('concrete', 9, 7, { color: '#94908a' }), [])
  const holes = useMemo(() => [carHole(car), { x0: STAIR.x0, x1: STAIR.x1, z0: STAIR.zA, z1: STAIR.zB - STAIR.landing }], [car])

  const people = useMemo(() => {
    const L = []
    const add = (x, y, z, yaw, shirt, pants = '#232a33') => L.push({ x: J(x), y, z, yaw, shirt, pants })
    add(-44, GROUND, 87, Math.PI, '#2d3d55', '#1a2230')
    add(-41.5, GROUND, 94.3, Math.PI, '#2d3d55', '#1a2230')
    add(-53, GROUND, 83.5, Math.PI / 2, ORANGE, ORANGE)
    add(-31, GROUND, 94, 0, '#8b6a4a', '#2a2a30')
    add(-31, GROUND, 97.8, Math.PI, ORANGE, ORANGE)
    add(-46.5, GROUND, 97.3, Math.PI, CO)
    add(-46, GROUND, 104.1, Math.PI, ORANGE, ORANGE)
    add(-43.6, GROUND, 104.1, Math.PI, ORANGE, ORANGE)
    add(-46, GROUND, 106.1, Math.PI, WHITE, '#222')
    add(-43, GROUND, 106.1, Math.PI, WHITE, '#222')
    add(-33, GROUND, 107.5, Math.PI, SCRUBS, SCRUBS)
    add(-27.5, GROUND, 108, Math.PI, '#6a5a8a', '#2a2a30')
    add(-21.5, GROUND, 109.6, Math.PI, '#4a6a8a', '#2a2a30')
    add(-50.5, GROUND, 109.8, Math.PI, '#7a6a4a', '#2a2a30')
    add(-43, GROUND, 110.4, Math.PI, ORANGE, ORANGE)
    add(-38.5, GROUND, 100.6, Math.PI / 2, CO)
    L.push({ x: -112, y: GROUND, z: 116, yaw: 0, shirt: CO, pants: '#232a33' })     // yard officer
    L.push({ x: -108, y: GROUND, z: 119, yaw: 0.6, shirt: ORANGE, pants: ORANGE })  // yard residents
    L.push({ x: -98, y: GROUND, z: 122, yaw: -1.2, shirt: ORANGE, pants: ORANGE })
    L.push({ x: -104, y: GROUND, z: 124, yaw: 2.4, shirt: ORANGE, pants: ORANGE })
    for (const y of [y2, y3]) {
      add(-41.5, y, 85.4, Math.PI, CO)
      add(-50, y, 98, 0, CO)
      add(-40, y, 99, -1.4, ORANGE, ORANGE)
      add(-53.4, y, 108.2, 0.4, ORANGE, ORANGE)
      add(-30, y, 104.4, 0, ORANGE, ORANGE)
    }
    add(-48.5, y2, 88.6, 0, SCRUBS, SCRUBS)
    add(-26, y2, 91, 0, CO)
    add(-29, y3, 88.5, 0, '#6a5a8a', '#2a2a30')
    add(-30.9, y3, 86.9, 0.5, ORANGE, ORANGE)
    add(-27.2, y3, 90.2, 3.6, ORANGE, ORANGE)
    return makeCrowd(L.length, (i) => ({ x: L[i].x, y: L[i].y, z: L[i].z, yaw: L[i].yaw, raiseChance: 0 })).map((f, i) => ({
      ...f, shirt: L[i].shirt, pants: L[i].pants, armsUp: 0, bounce: 0.25,
    }))
  }, [y2, y3])

  const lights = (y, zone, pts) => pts.map(([lx, lz], i) => (
    <CeilingLight key={zone + i} position={[J(lx), y + FH - 0.3, lz]} size={[1.4, 1.4]} intensity={18} distance={12} zone={zone} watts={56} color="#f2f2ee" />
  ))

  const unit = (k) => {
    const y = jy(k)
    const cells = []
    for (let i = 0; i < 8; i++) {
      const xa = J(-55.4 + i * 4.5)
      cells.push(<Cell key={'n' + i} id={`pr${k + 1}-n${i + 1}`} x0={xa} x1={xa + 4.5} z0={106.5} z1={111.5} y={y} gate="south" label={`Cell ${k === 1 ? 'A' : 'B'}${i + 1}`} shared={i === 7} />)
    }
    for (let i = 0; i < 4; i++) {
      const xa = J(-42.2 + i * 4.6)
      cells.push(<Cell key={'s' + i} id={`pr${k + 1}-s${i + 1}`} x0={xa} x1={xa + 4.6} z0={96.6} z1={101.6} y={y} gate="north" label={`Cell ${k === 1 ? 'A' : 'B'}${i + 9}`} />)
    }
    return (
      <group>
        <RoomSign text={`FLOOR ${k + 1} · HOUSING UNIT ${k === 1 ? 'A' : 'B'}`} position={[x0 + 0.65, y + 3.3, 89]} rotation={[0, Math.PI / 2, 0]} width={3.6} color="#1d2733" glow="#9fc0e8" />
        <RoomSign text="SECURE AREA · HOUSING" position={[J(-46.5), y + 3.7, PZ - 0.25]} rotation={[0, Math.PI, 0]} width={3.2} color="#3a1111" glow="#ff9d7a" />
        <RoomSign text="STAIRS" position={[J(-20.7), y + 3.4, 95.74]} rotation={[0, Math.PI, 0]} width={2.0} />
        <BoxRoom id={`prison-station-${k + 1}`} x0={J(-46)} x1={J(-37)} z0={82} z1={89} y={y} h={FH} doorSide="west" doorAt={85.5} glassSide="north" label="officer station" doorStyle="glass" />
        <Table position={[J(-41.5), y, 83.9]} size={[3.2, 0.9]} height={0.75} top="wood" />
        <Chair position={[J(-41.5), y, 84.9]} yaw={Math.PI} color="#2a2f38" />
        <WallScreen position={[J(-41.5), y + 1.55, 82.2]} yaw={0} size={[2.2, 0.6]} />
        <RoomSign text="OFFICER STATION" position={[J(-45.88), y + 3.3, 85.5]} rotation={[0, -Math.PI / 2, 0]} width={2.6} />
        <RoomSign text="DAY ROOM" position={[J(-29.5), y + 3.4, 80.45]} width={2.6} />
        {k === 1 ? (
          <>
            <WallScreen position={[J(-29.5), y + 2.1, 80.5]} yaw={0} size={[3.2, 1.8]} id="screen-state-dayroom" zone="state-prison-2" name="State Prison day room" />
            <Sofa position={[J(-31.5), y, 84.5]} yaw={Math.PI} length={2.6} color="#3a4452" />
            <Sofa position={[J(-27.5), y, 84.5]} yaw={Math.PI} length={2.6} color="#3a4452" />
            <Table position={[J(-30), y, 89.5]} size={[2.2, 0.9]} height={0.75} top="wood" />
            {[-31.1, -28.9].flatMap((x) => [88.5, 90.5].map((z) => <Chair key={x + ':' + z} position={[J(x), y, z]} yaw={z > 89.5 ? Math.PI : 0} color="#3b3f46" />))}
          </>
        ) : (
          <>
            {Array.from({ length: 6 }, (_, i) => {
              const a = (i / 6) * Math.PI * 2
              const dx = Math.cos(a) * 1.9, dz = Math.sin(a) * 1.9
              return <Chair key={i} position={[J(-29) + dx, y, 88.5 + dz]} yaw={Math.atan2(-dx, -dz)} color="#3b3f46" label="Join the group circle" />
            })}
            <RoomSign text="REENTRY GROUP" position={[J(-29.5), y + 3.4, 80.45]} width={3.0} color="#0e3a2a" glow="#8fffd6" />
          </>
        )}
        <Plant position={[x0 + 1.4, y, 82.4]} scale={1.1} />
        <Plant position={[J(-24), y, 82.4]} scale={1.1} />
        <RoomSign text={`UNIT ${k === 1 ? 'A' : 'B'} DAY AREA`} position={[J(-30), y + 3.8, 104.1]} width={3.6} color="#1d2733" glow="#9fc0e8" />
        {cells}
        {[-37, -30, -23].map((x) => <Table key={x} position={[J(x), y, 104.2]} size={[2.4, 1.0]} height={0.75} top="wood" />)}
        {[-37, -30, -23].flatMap((x) => [103.2, 105.2].map((z) => <Chair key={x + ':' + z} position={[J(x), y, z]} yaw={z > 104.2 ? Math.PI : 0} color="#7a7468" />))}
      </group>
    )
  }

  return (
    <group>
      <JusticeBuilding
        id="prison" x0={x0} x1={x1} z0={z0} z1={z1} h={FH} floors={3} holes={holes} upperFloorMat={upper} windowSeed={9}
        doorSide="south" doorHalf={1.2} doorH={2.8}
        wall="concrete" wallColor="#a9abaf" doorAccent="#8aa0b8" doorLabel="State Prison doors"
        floorMat={lobbyFloor} roofColor="#55575b" seed={41} upperW={1.4} upperH={1.3}
        sign={{ name: 'STATE PRISON', sub: 'VISION STORMS STATE CORRECTIONS' }} signWidth={7.6}
      >
        <Beacon position={[cx - 3.4, GROUND + 3.9, z0 - 0.3]} rate={620} color="#4aa3ff" />
        <Beacon position={[cx + 3.4, GROUND + 3.9, z0 - 0.3]} rate={620} color="#ff5a3c" />

        <JailPartition k={0} windows ox={OX} idp="prison" />
        <JailPartition k={1} ox={OX} idp="prison" />
        <JailPartition k={2} ox={OX} idp="prison" />
        <mesh position={[cx, GROUND + 0.015, 104]} rotation={[-Math.PI / 2, 0, 0]} material={cellFloor} receiveShadow>
          <planeGeometry args={[x1 - x0 - T, z1 - PZ - T]} />
        </mesh>

        <ElevatorCar cfg={car} />
        <UStair x0={STAIR.x0} x1={STAIR.x1} zA={STAIR.zA} zB={STAIR.zB} y={jy(0)} rise={FH} landing={STAIR.landing} />
        <UStair x0={STAIR.x0} x1={STAIR.x1} zA={STAIR.zA} zB={STAIR.zB} y={jy(1)} rise={FH} landing={STAIR.landing} />
        {[1, 2].map((k) => (
          <group key={'g' + k}>
            <Rail a={[STAIR.x0, STAIR.zA]} b={[STAIR.x0, STAIR.zB - STAIR.landing]} y={jy(k)} style="glass" h={1.0} />
            <Rail a={[STAIR.x1, STAIR.zA]} b={[STAIR.x1, STAIR.zB - STAIR.landing]} y={jy(k)} style="glass" h={1.0} />
            <Rail a={[STAIR.x0, STAIR.zB - STAIR.landing]} b={[STAIR.x1, STAIR.zB - STAIR.landing]} y={jy(k)} style="glass" h={1.0} />
            {k === 2 && <Rail a={[STAIR.x0, STAIR.zA]} b={[STAIR.x0 + 1.7, STAIR.zA]} y={jy(k)} style="glass" h={1.0} />}
          </group>
        ))}

        {/* ---------------- FLOOR 1: RECEPTION ---------------- */}
        <PrisonKiosks />
        <RoomSign text="RECEPTION & INTAKE" position={[J(-44), GROUND + 3.5, 80.46]} width={4.6} color="#1d2733" glow="#9fc0e8" />
        <Counter position={[J(-44), GROUND, 86]} yaw={Math.PI} length={8} height={1.1} depth={0.9} top="marble" face="#20242b" />
        <Counter position={[J(-41.5), GROUND, 93.2]} yaw={0} length={4} height={1.0} depth={0.8} top="marble" face="#23262c" />
        <mesh position={[J(-41.5), GROUND + 1.22, 93.1]} material={m.blackSteel}><boxGeometry args={[0.5, 0.3, 0.4]} /></mesh>
        <RoomSign text="INTAKE" position={[J(-41.5), GROUND + 3.4, 95.6]} rotation={[0, Math.PI, 0]} width={2.4} />
        <Cell id="prison-hold" x0={x0 + 0.4} x1={J(-50)} z0={81} z1={86} y={GROUND} gate="east" label="Holding Cell" />
        <RoomSign text="HOLDING" position={[J(-52.8), GROUND + 3.4, 80.46]} width={2.4} color="#3a1111" glow="#ff9d7a" />
        <Sofa position={[J(-31), GROUND, 81.6]} yaw={0} length={3.2} color="#2a3550" />
        <Sofa position={[J(-26.5), GROUND, 81.6]} yaw={0} length={3.2} color="#2a3550" />
        <Plant position={[J(-24), GROUND, 81.4]} scale={1.1} />
        <Plant position={[x0 + 1.4, GROUND, 90]} scale={1.1} />

        {/* ---------------- FLOOR 1: VISITATION WINDOWS ---------------- */}
        <RoomSign text="VISITATION" position={[J(-29.5), GROUND + 3.6, 95.6]} rotation={[0, Math.PI, 0]} width={3.4} />
        <Counter position={[J(-29.5), GROUND, 95.3]} yaw={0} length={12} height={0.95} depth={0.5} top="wood" face="#3a3a40" />
        <Counter position={[J(-29.5), GROUND, 96.7]} yaw={0} length={12} height={0.95} depth={0.5} top="wood" face="#3a3a40" />
        {[-32.5, -29.5, -26.5].map((x) => (
          <group key={x}>
            <mesh position={[J(x), GROUND + 1.25, 95.3]} material={m.blackSteel}><boxGeometry args={[0.05, 0.6, 0.5]} /></mesh>
            <mesh position={[J(x), GROUND + 1.25, 96.7]} material={m.blackSteel}><boxGeometry args={[0.05, 0.6, 0.5]} /></mesh>
          </group>
        ))}
        {[-34, -28, -25].map((x) => <Chair key={'v' + x} position={[J(x), GROUND, 94.4]} yaw={0} color="#3b3f46" label="Sit at the visiting window" />)}
        {[-34, -28, -25].map((x) => <Chair key={'r' + x} position={[J(x), GROUND, 97.6]} yaw={Math.PI} color="#7a7468" label="Sit at the visiting window" />)}

        {/* ---------------- FLOOR 1: DINING HALL ---------------- */}
        <RoomSign text="DINING HALL" position={[J(-52), GROUND + 3.5, PZ + 0.25]} rotation={[0, 0, 0]} width={3.2} color="#0e3a2a" glow="#8fffd6" />
        {[-52.5, -41.5].flatMap((x) => [100, 103.2].map((z) => (
          <group key={x + ':' + z}>
            <Table position={[J(x), GROUND, z]} size={[4.4, 0.9]} height={0.75} top="wood" />
            {[-1, 1].flatMap((dx) => [-0.95, 0.95].map((dz) => <Chair key={dx + ':' + dz} position={[J(x) + dx, GROUND, z + dz]} yaw={dz > 0 ? Math.PI : 0} color="#7a7468" />))}
          </group>
        )))}
        <Counter position={[J(-45.5), GROUND, 105.2]} yaw={Math.PI} length={8} height={1.05} depth={0.8} top="marble" face="#22262c" />
        <mesh position={[J(-45.5), GROUND + 1.45, 105.5]} material={m.chrome}><boxGeometry args={[7.4, 0.08, 0.5]} /></mesh>
        <RoomSign text="MEALS · 6 · 11:30 · 5" position={[J(-45.5), GROUND + 3.0, 105.6]} rotation={[0, Math.PI, 0]} width={3.4} color="#0e3a2a" glow="#8fffd6" />

        {/* ---------------- FLOOR 1: LIBRARY, MEDICAL, COUNSELING, VOCATIONAL CLASS ---------------- */}
        <BoxRoom id="prison-library" x0={x0 + 0.4} x1={J(-37.5)} z0={107.2} z1={111.6} y={GROUND} h={FH} doorSide="south" doorAt={J(-54.2)} label="library" />
        <RoomSign text="LIBRARY" position={[J(-54.2), GROUND + 3.2, 107.1]} rotation={[0, Math.PI, 0]} width={2.0} />
        {[-53, -49, -45, -41].map((x) => <Shelf key={x} position={[J(x), GROUND, 111.4]} yaw={Math.PI} width={3.4} height={2.3} />)}
        <Table position={[J(-47), GROUND, 109.2]} size={[2.6, 1.0]} height={0.75} top="wood" />
        {[-48, -46].map((x) => <Chair key={x} position={[J(x), GROUND, 108.1]} yaw={0} color="#3b3f46" label="Sit in the library" />)}

        <BoxRoom id="prison-medical" x0={J(-35.5)} x1={J(-30.5)} z0={101.5} z1={111.6} y={GROUND} h={FH} doorSide="south" doorAt={J(-33)} label="medical room" />
        <RoomSign text="MEDICAL" position={[J(-33), GROUND + 3.2, 101.4]} rotation={[0, Math.PI, 0]} width={2.0} color="#0e3a2a" glow="#8fffd6" />
        <mesh position={[J(-31.6), GROUND + 0.55, 108.4]} material={m.chrome} castShadow><boxGeometry args={[0.9, 0.5, 2.0]} /></mesh>
        <mesh position={[J(-31.6), GROUND + 0.85, 107.6]} material={new THREE.MeshStandardMaterial({ color: '#e8eef0', roughness: 0.8 })}><boxGeometry args={[0.8, 0.12, 1.2]} /></mesh>
        <Shelf position={[J(-34.9), GROUND, 109]} yaw={-Math.PI / 2} width={3} height={2.0} books={false} />
        <BoxRoom id="prison-counsel" x0={J(-30)} x1={J(-25)} z0={101.5} z1={111.6} y={GROUND} h={FH} doorSide="south" doorAt={J(-27.5)} label="counseling room" />
        <RoomSign text="COUNSELING" position={[J(-27.5), GROUND + 3.2, 101.4]} rotation={[0, Math.PI, 0]} width={2.2} color="#0e3a2a" glow="#8fffd6" />
        <Sofa position={[J(-27.5), GROUND, 104.2]} yaw={0} length={2.2} color="#3a4a5a" />
        <Chair position={[J(-27.5), GROUND, 106.8]} yaw={Math.PI} color="#6a5a8a" label="Sit in counseling" />
        <Plant position={[J(-25.8), GROUND, 110.5]} scale={1.1} />
        <BoxRoom id="prison-class" x0={J(-24.5)} x1={x1 - 0.4} z0={101.5} z1={111.6} y={GROUND} h={FH} doorSide="south" doorAt={J(-21.5)} label="vocational classroom" />
        <RoomSign text="VOCATIONAL TRAINING" position={[J(-21.5), GROUND + 3.2, 101.4]} rotation={[0, Math.PI, 0]} width={3.0} />
        <WallScreen position={[J(-21.5), GROUND + 1.9, 111.4]} yaw={Math.PI} size={[3.4, 1.7]} id="screen-state-class" zone="state-prison-1" name="State Prison vocational classroom" />
        {/* workbenches with steel vices */}
        {[104.4, 106.6].map((z) => [-23.2, -19.8].map((x) => (
          <group key={x + ':' + z}>
            <Table position={[J(x), GROUND, z]} size={[1.8, 0.8]} height={0.9} top="wood" />
            <mesh position={[J(x), GROUND + 1.0, z - 0.2]} material={m.blackSteel}><boxGeometry args={[0.3, 0.2, 0.2]} /></mesh>
          </group>
        )))}

        {/* ---------------- FLOORS 2 AND 3 ---------------- */}
        {unit(1)}
        {unit(2)}

        {lights(GROUND, 'state-prison-1', [[-46, 85], [-32, 85], [-46, 91], [-38, 91], [-48, 100], [-42, 105], [-32, 99], [-24, 99], [-33, 106], [-27.5, 106], [-21.5, 106], [-47, 109.4], [-30, 92]])}
        {lights(y2, 'state-prison-2', [[-50, 87], [-41.5, 86], [-30, 87], [-24, 92], [-48, 99], [-38, 104], [-30, 104], [-22, 104], [-50, 109], [-38, 109], [-26, 109], [-35, 98.5]])}
        {lights(y3, 'state-prison-3', [[-50, 87], [-41.5, 86], [-30, 87], [-24, 92], [-48, 99], [-38, 104], [-30, 104], [-22, 104], [-50, 109], [-38, 109], [-26, 109], [-35, 98.5]])}
      </JusticeBuilding>

      <group userData={{ noBatch: true }}>
        <HumanoidCrowd fans={people} beat={0} castShadow />
      </group>
      <PrisonDialogue y2={y2} y3={y3} />

      <PrisonYard />
      <GuardTower position={[-124.6, 0, 123]} />
      <GuardTower position={[-81.6, 0, 125.6]} />

      <group>
        <mesh position={[-103, GROUND + 0.008, 75.5]} rotation={[-Math.PI / 2, 0, 0]} material={surface('pavers', 8, 4)} receiveShadow>
          <planeGeometry args={[46, 10]} />
        </mesh>
        <mesh position={[-70, GROUND + 0.008, 77]} rotation={[-Math.PI / 2, 0, 0]} material={surface('pavers', 3, 2)} receiveShadow>
          <planeGeometry args={[22, 9]} />
        </mesh>
        <mesh position={[-81.7, GROUND + 0.008, 100]} rotation={[-Math.PI / 2, 0, 0]} material={surface('pavers', 1, 8)} receiveShadow>
          <planeGeometry args={[4.6, 40]} />
        </mesh>
        <TransportBus position={[-114.5, 0, 75]} yaw={Math.PI / 2} />
        <Cruiser position={[-92, 0, 74.4]} yaw={0.1} />
        {[[-118, 79.4], [-96, 79.4]].map(([x, z], i) => <StreetLamp key={i} position={[x, GROUND, z]} height={6.5} />)}
      </group>
    </group>
  )
}

export default StatePrison
