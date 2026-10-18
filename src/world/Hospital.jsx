import { useEffect, useMemo } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface } from './materials.js'
import { registerInteractable } from '../state/runtime.js'
import { useStore } from '../state/store.js'
import { Chair, Table, Counter, Sofa, Shelf, Plant, CeilingLight, WallScreen } from './furniture.jsx'
import { Bench, Planter, StreetLamp } from './props.jsx'
import { BrandSign } from './signs.jsx'
import { HumanoidCrowd, makeCrowd } from '../npc/HumanoidCrowd.jsx'
import { ElevatorCar } from './ElevatorCar.jsx'
import { carById, carHole } from '../config/elevators.js'
import { JusticeBuilding, UStair, BoxRoom, Rail, RoomSign, useNpcDialogue, GROUND } from './Justice.jsx'
import { FH, jy } from './CountyJail.jsx'
import { TimeClock } from './JobCenter.jsx'
import { HOSP } from '../config/jobs.js'

// ============================================================================
// VISION STORMS GENERAL HOSPITAL
// A real working hospital east of the Rehabilitation Center, north of the Courthouse: footprint
// x[64,106] z[114,130], three floors, a real elevator and a staircase, no locked doors. Built with
// the same civic-building kit as the Justice campus (so proportions, materials and lighting match
// the rest of the city rather than reading as a separate art style). Muted clinical palette —
// pale walls, grey-green flooring, blue and white accents — instead of the district's nightlife neon.
//   Floor 1  Reception, waiting room, ER bays, pharmacy, imaging.
//   Floor 2  Nurses' station and patient rooms.
//   Floor 3  Operating rooms, doctors' offices, staff lounge.
// ============================================================================

export const HOSPITAL = HOSP
// Layout: a central corridor (x79..91, stairs + elevator + reception/nurses/lounge) flanked by a
// west wing (x64.6..79: imaging+pharmacy, two patient rooms, two doctors' offices) and an east wing
// (x91..106: the ER, two more patient rooms, two operating rooms) - every floor shares the same
// corridor footprint so the stairwell and elevator shaft line up top to bottom, and no room wall
// ever runs through the circulation space. Each wing splits into two full-width bands along z
// (114.6..122 and 122..129.6) rather than being carved into several small boxes, so every room ends
// up noticeably bigger than a standard closet-sized stand-in - and every fixture is kept well off
// the straight line from its door into the room.
const CORR = { x0: 79, x1: 91 }
const WING_W = { x0: 64.6, x1: 79 }
const WING_E = { x0: 91, x1: 106 }
const BAND = { z0: 114.6, zMid: 122, z1: 129.6 }
const STAIR = { x0: 79.2, x1: 82.6, zA: 114.6, zB: 122, landing: 1.6 }

// ---------------------------------------------------------------------------
// Medical equipment primitives (kept local: specific enough to this one building that they don't
// belong in the shared furniture kit).
// ---------------------------------------------------------------------------

function HospitalBed({ position, yaw = 0 }) {
  const m = getMaterials()
  const rail = m.chrome
  const frame = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e7ebee', roughness: 0.5, metalness: 0.3 }), [])
  const mattress = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f4f6f8', roughness: 0.85 }), [])
  const sheet = useMemo(() => new THREE.MeshStandardMaterial({ color: '#dfe7ec', roughness: 0.9 }), [])
  const pillow = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), [])
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[0.5, 0.35, 1.05]} position={[0, 0.5, 0]} />
      {/* castor frame */}
      {[[-0.45, -0.95], [0.45, -0.95], [-0.45, 0.95], [0.45, 0.95]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.12, z]} material={m.darkMetal}><cylinderGeometry args={[0.06, 0.06, 0.1, 10]} /></mesh>
      ))}
      <mesh position={[0, 0.42, 0]} material={frame}><boxGeometry args={[0.92, 0.1, 2.0]} /></mesh>
      <mesh position={[0, 0.58, 0]} material={mattress} castShadow><boxGeometry args={[0.86, 0.18, 1.9]} /></mesh>
      <mesh position={[0, 0.68, 0.1]} material={sheet}><boxGeometry args={[0.88, 0.04, 1.5]} /></mesh>
      <mesh position={[0, 0.72, -0.78]} material={pillow}><boxGeometry args={[0.6, 0.12, 0.34]} /></mesh>
      {/* adjustable head section, raised */}
      <mesh position={[0, 0.82, -0.75]} rotation={[0.35, 0, 0]} material={mattress}><boxGeometry args={[0.84, 0.1, 0.5]} /></mesh>
      {/* side rails */}
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, 0.78, 0]} material={rail}><boxGeometry args={[0.04, 0.3, 1.5]} /></mesh>
      ))}
      {/* footboard */}
      <mesh position={[0, 0.75, 0.98]} material={frame}><boxGeometry args={[0.9, 0.5, 0.06]} /></mesh>
    </RigidBody>
  )
}

function IVStand({ position }) {
  const m = getMaterials()
  const bag = useMemo(() => new THREE.MeshStandardMaterial({ color: '#dfeef5', roughness: 0.2, transparent: true, opacity: 0.85 }), [])
  return (
    <group position={position}>
      <mesh position={[0, 0.03, 0]} material={m.chrome}><cylinderGeometry args={[0.22, 0.22, 0.06, 16]} /></mesh>
      {[0, 120, 240].map((a) => (
        <mesh key={a} position={[Math.cos(a * Math.PI / 180) * 0.19, 0.03, Math.sin(a * Math.PI / 180) * 0.19]} material={m.chrome}>
          <cylinderGeometry args={[0.025, 0.025, 0.08, 8]} />
        </mesh>
      ))}
      <mesh position={[0, 0.85, 0]} material={m.chrome}><cylinderGeometry args={[0.018, 0.018, 1.7, 8]} /></mesh>
      <mesh position={[0, 1.65, 0]} material={m.chrome}><boxGeometry args={[0.3, 0.02, 0.02]} /></mesh>
      <mesh position={[0, 1.42, 0]} material={bag}><boxGeometry args={[0.16, 0.3, 0.05]} /></mesh>
    </group>
  )
}

function VitalsMonitor({ position, yaw = 0 }) {
  const m = getMaterials()
  const screen = useMemo(() => new THREE.MeshStandardMaterial({ color: '#06110a', emissive: '#2fe07a', emissiveIntensity: 0.9, roughness: 0.3 }), [])
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.9, 0]} material={m.darkMetal} castShadow><boxGeometry args={[0.1, 1.5, 0.1]} /></mesh>
      <mesh position={[0, 1.5, 0]} material={m.blackSteel}><boxGeometry args={[0.38, 0.3, 0.3]} /></mesh>
      <mesh position={[0, 1.5, 0.16]} material={screen}><planeGeometry args={[0.3, 0.2]} /></mesh>
    </group>
  )
}

function SurgicalLight({ position }) {
  const m = getMaterials()
  const lamp = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f4f2ea', emissive: '#fff8e8', emissiveIntensity: 1.4 }), [])
  return (
    <group position={position}>
      <mesh position={[0, 0, 0]} material={m.chrome}><cylinderGeometry args={[0.04, 0.04, 0.5, 8]} /></mesh>
      <mesh position={[0, -0.3, 0]} material={m.chrome}><cylinderGeometry args={[0.3, 0.32, 0.12, 20]} /></mesh>
      <mesh position={[0, -0.36, 0]} rotation={[-Math.PI / 2, 0, 0]} material={lamp}><circleGeometry args={[0.26, 20]} /></mesh>
    </group>
  )
}

function OperatingTable({ position, yaw = 0 }) {
  const m = getMaterials()
  const pad = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a3138', roughness: 0.5 }), [])
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[0.4, 0.45, 0.95]} position={[0, 0.55, 0]} />
      <mesh position={[0, 0.5, 0]} material={m.chrome}><cylinderGeometry args={[0.16, 0.2, 0.55, 14]} /></mesh>
      <mesh position={[0, 0.8, 0]} material={m.darkMetal} castShadow><boxGeometry args={[0.7, 0.08, 1.9]} /></mesh>
      <mesh position={[0, 0.86, 0]} material={pad}><boxGeometry args={[0.62, 0.08, 1.8]} /></mesh>
    </RigidBody>
  )
}

const CASUAL = ['#6b8fb0', '#a8745a', '#7a9a6a', '#b0586a', '#8a7ab0', '#c9a96a']

function HospitalKiosk() {
  const open = useStore((s) => s.openPanel)
  useEffect(() => {
    const off = registerInteractable('hospital-jobs', {
      position: new THREE.Vector3(80.4, GROUND + 1, 115.6),
      radius: 2.6,
      label: () => 'Hospital jobs board',
      onInteract: () => open({ type: 'jobs', tab: 'jobs' }),
    })
    return off
  }, [open])
  return null
}

function HospitalDialogue({ y2, y3 }) {
  const N = (id, x, y, z, label, lines) => useNpcDialogue(id, [x, y, z], label, lines) // eslint-disable-line react-hooks/rules-of-hooks
  N('hosp-reception', 83, GROUND, 127.1, 'Talk to the receptionist', [
    "Receptionist: Welcome to Vision Storms General. Reception and the waiting room are right here, the ER is through the east doors, and the pharmacy is to the west.",
    'Receptionist: Floor 2 is patient rooms and the nurses\' station, floor 3 is surgery and the doctors\' offices. Everyone here is an NPC or a visitor like you, and there are no locked doors.',
  ])
  N('hosp-triage', 95, GROUND, 120.4, 'Talk to the triage nurse', [
    "Triage Nurse: We see the most urgent cases first, not whoever walked in first. If it's not an emergency, the front desk can point you toward a regular clinic visit instead.",
  ])
  N('hosp-pharmacist', 70, GROUND, 120.6, 'Talk to the pharmacist', [
    'Pharmacist: Prescriptions get filled here, and I can walk anyone through dosing and interactions before they leave.',
  ])
  N('hosp-nurse-station', 85, y2, 120.6, "Talk to the charge nurse", [
    "Charge Nurse: I run the floor from this station - call button, chart, and I'm already walking that way.",
  ])
  N('hosp-patient', 92, y2, 117.6, 'Talk to the patient', [
    'Patient: The nurses here have been great. Resting up, doctor says a couple more days.',
  ])
  N('hosp-doctor-a', 70, y3, 117.8, 'Talk to Dr. Vance', [
    "Dr. Vance: Rounds, charts, and the odd 2 a.m. page. Long hours, but it's the job I wanted.",
  ])
  N('hosp-doctor-b', 78, y3, 117.8, 'Talk to Dr. Osei', [
    'Dr. Osei: Surgery schedule is tight today, but I always have a minute for questions.',
  ])
  N('hosp-surgeon', 92, y3, 122.0, 'Talk to the surgeon', [
    'Surgeon: Scrub in or stay behind the glass - either way, quiet in the OR, please.',
  ])
  return null
}

export default function Hospital() {
  const m = getMaterials()
  const { x0, x1, z0, z1 } = HOSPITAL
  const car = carById('hospital')
  const y2 = jy(1), y3 = jy(2)
  const lobbyFloor = useMemo(() => surface('tile', 7, 3, { color: '#dfe6e6' }), [])
  const carpet = useMemo(() => surface('carpet', 8, 4, { color: '#b9c3c6' }), [])
  const holes = useMemo(() => [carHole(car), { x0: STAIR.x0, x1: STAIR.x1, z0: STAIR.zA, z1: STAIR.zB - STAIR.landing }], [car])

  const people = useMemo(() => {
    const L = []
    const add = (x, y, z, yaw, shirt, pants = '#2a2f38') => L.push({ x, y, z, yaw, shirt, pants })
    // Floor 1: reception, triage, pharmacy, waiting room
    add(83, GROUND, 127.1, Math.PI, '#dfe7ec', '#1f2a33')                       // receptionist (pale blue scrubs)
    add(95, GROUND, 120.4, 0.2, '#2f6f9a', '#1b2430')                           // triage nurse
    add(97, GROUND, 118.6, -1.6, '#2f6f9a', '#1b2430')                          // ER nurse
    add(70, GROUND, 120.6, 1.0, '#e9eef0', '#1f2a33')                          // pharmacist
    add(80, GROUND, 117.6, 0.4, CASUAL[0])                                     // waiting room visitor
    add(83.5, GROUND, 117.6, -0.4, CASUAL[1])
    add(89, GROUND, 117.4, 0.9, CASUAL[2])
    // Floor 2: nurses' station, patient rooms
    add(85, y2, 120.6, 0, '#2f6f9a', '#1b2430')                                 // charge nurse
    add(70, y2, 118.6, Math.PI, '#2f6f9a', '#1b2430')                           // nurse
    add(99, y2, 118.6, Math.PI, '#2f6f9a', '#1b2430')                           // nurse
    add(92, y2, 117.6, 0.3, CASUAL[3])                                          // patient
    add(73, y2, 117.6, 0.1, CASUAL[4])                                          // patient
    add(73.8, y2, 117.1, -1.4, CASUAL[5])                                       // visitor
    // Floor 3: surgery, doctors' offices
    add(70, y3, 117.8, Math.PI, '#e9eef0', '#1f2a33')                           // doctor A
    add(78, y3, 117.8, Math.PI, '#e9eef0', '#1f2a33')                           // doctor B
    add(92, y3, 122.0, 0, '#a9d4e6', '#1f2a33')                                 // surgeon, blue scrub cap
    add(95, y3, 121.4, 0.6, '#a9d4e6', '#1f2a33')                               // surgical nurse
    add(66.5, y3, 125.8, 1.0, CASUAL[0])                                        // staff lounge
    return makeCrowd(L.length, (i) => ({ x: L[i].x, y: L[i].y, z: L[i].z, yaw: L[i].yaw, raiseChance: 0 })).map((f, i) => ({
      ...f, shirt: L[i].shirt, pants: L[i].pants, armsUp: 0, bounce: 0.25,
    }))
  }, [y2, y3])

  const lights = (y, zone, pts) => pts.map(([lx, lz], i) => (
    <CeilingLight key={zone + i} position={[lx, y + FH - 0.3, lz]} size={[1.5, 1.5]} intensity={18} distance={12} zone={zone} watts={56} color="#f4f8fc" />
  ))

  // Every patient room is a full-width half of a wing's band (roughly 14.4 x 7.6 m), with its only
  // door opening onto the corridor and the bed/monitor pushed to the far wall, well clear of the door.
  const patientRoom = (idRoot, wing, side, zA, zB, label, bedYaw = 0) => {
    const doorAt = (zA + zB) / 2
    const depth = wing.x1 - wing.x0
    const bedX = side === 'east' ? wing.x0 + depth * 0.32 : wing.x0 + depth * 0.68
    const bedZ = zA + (zB - zA) * 0.5
    const chairX = side === 'east' ? bedX + 1.3 : bedX - 1.3
    return (
      <group key={idRoot}>
        <BoxRoom id={idRoot} x0={wing.x0} x1={wing.x1} z0={zA} z1={zB} y={y2} h={FH} doorSide={side} doorAt={doorAt} label="patient room" doorStyle="glass" glassSide="south" />
        <RoomSign text={label} position={[side === 'east' ? wing.x1 - 0.1 : wing.x0 + 0.1, y2 + 3.2, doorAt]} rotation={[0, side === 'east' ? Math.PI / 2 : -Math.PI / 2, 0]} width={2.2} color="#0e2a3a" glow="#8fd6ff" />
        <HospitalBed position={[bedX, y2, bedZ]} yaw={bedYaw} />
        <IVStand position={[bedX, y2, bedZ - 1.2]} />
        <VitalsMonitor position={[bedX, y2, bedZ - 1.8]} yaw={Math.PI / 2} />
        <Chair position={[chairX, y2, bedZ + 1.0]} yaw={side === 'east' ? -Math.PI / 2 : Math.PI / 2} color="#5a7a8a" label="Sit with the patient" />
      </group>
    )
  }

  return (
    <group>
      <JusticeBuilding
        id="hospital" x0={x0} x1={x1} z0={z0} z1={z1} h={FH} floors={3} holes={holes} upperFloorMat={carpet} windowSeed={13}
        doorSide="south" doorHalf={1.6} doorH={3.0}
        wall="concrete" wallColor="#eef3f5" doorAccent="#3fa9e0" doorLabel="Hospital doors"
        floorMat={lobbyFloor} roofColor="#9aa6a6" seed={61} upperW={3.0}
        sign={{ name: 'VISION STORMS GENERAL HOSPITAL', sub: 'EMERGENCY · 24 HOURS' }} signWidth={11}
        groundWindows={[-9, 9].map((off) => ({ off, half: 1.3, v0: 0.9, v1: 3.6 }))}
      >
        <ElevatorCar cfg={car} />
        <UStair x0={STAIR.x0} x1={STAIR.x1} zA={STAIR.zA} zB={STAIR.zB} y={jy(0)} rise={FH} landing={STAIR.landing} />
        <UStair x0={STAIR.x0} x1={STAIR.x1} zA={STAIR.zA} zB={STAIR.zB} y={jy(1)} rise={FH} landing={STAIR.landing} />
        {[1, 2].map((k) => (
          <group key={'g' + k}>
            <Rail a={[STAIR.x0, STAIR.zA]} b={[STAIR.x0, STAIR.zB - STAIR.landing]} y={jy(k)} style="glass" h={1.0} />
            <Rail a={[STAIR.x1, STAIR.zA]} b={[STAIR.x1, STAIR.zB - STAIR.landing]} y={jy(k)} style="glass" h={1.0} />
            <Rail a={[STAIR.x0, STAIR.zB - STAIR.landing]} b={[STAIR.x1, STAIR.zB - STAIR.landing]} y={jy(k)} style="glass" h={1.0} />
          </group>
        ))}
        <RoomSign text="STAIRS" position={[STAIR.x1, GROUND + 3.4, STAIR.zA + 0.3]} rotation={[0, -Math.PI / 2, 0]} width={2.0} />

        {/* ---------------- FLOOR 1: RECEPTION, ER, PHARMACY & IMAGING ---------------- */}
        {/* the main doors are on the z0 (south/front) wall, so the lobby lives in the corridor's
            front band, clear of the stair's x79.2-82.6 footprint */}
        <HospitalKiosk />
        <RoomSign text="RECEPTION" position={[85, GROUND + 3.6, z0 + 0.28]} width={3.4} color="#0e2a3a" glow="#8fd6ff" />
        <Counter position={[85, GROUND, 118.0]} yaw={Math.PI} length={6} height={1.1} depth={0.9} top="marble" face="#1c2a2a" />
        <TimeClock position={[88.0, GROUND, 121.0]} />
        <Sofa position={[84, GROUND, 117.0]} yaw={0} length={3.0} color="#5a7a8a" />
        <Sofa position={[89, GROUND, 117.0]} yaw={0} length={2.4} color="#5a7a8a" />
        {[85, 88, 90.5].map((x) => <Chair key={x} position={[x, GROUND, 120.0]} yaw={Math.PI} color="#5a7a8a" label="Sit in the waiting room" />)}
        <Plant position={[83.2, GROUND, 115.6]} scale={1.2} />
        <Plant position={[90.0, GROUND, 115.6]} scale={1.2} />
        <RoomSign text="ELEVATOR" position={[(car.x0 + car.x1) / 2, GROUND + 3.4, car.z1 + 0.3]} rotation={[0, Math.PI, 0]} width={2.2} />

        <BoxRoom id="hosp-er" x0={91} x1={106} z0={114.6} z1={129.6} y={GROUND} h={FH} doorSide="west" doorAt={122} label="emergency department" doorStyle="glass" glassSide="south" />
        <RoomSign text="EMERGENCY" position={[91.1, GROUND + 3.3, 122]} rotation={[0, -Math.PI / 2, 0]} width={3.0} color="#3a0e0e" glow="#ff9a8f" />
        {[[97, 118], [97, 126], [102.5, 118], [102.5, 126]].map(([x, z], i) => (
          <group key={i}>
            <HospitalBed position={[x, GROUND, z]} yaw={Math.PI / 2} />
            <IVStand position={[x - 0.9, GROUND, z]} />
            <VitalsMonitor position={[x - 0.9, GROUND, z + 0.6]} yaw={Math.PI / 2} />
          </group>
        ))}
        <Counter position={[104.5, GROUND, 122]} yaw={-Math.PI / 2} length={5} height={1.0} depth={0.7} top="marble" face="#1c2a2a" />

        {/* pharmacy and imaging each take a full band of the west wing - full-width rooms instead
            of cramped boxes, with every fixture kept off the door's sightline. Pharmacy sits in the
            front band (nearer the z0 entrance, for walk-up traffic); imaging is in the back band. */}
        <BoxRoom id="hosp-pharmacy" x0={64.6} x1={79} z0={BAND.z0} z1={BAND.zMid} y={GROUND} h={FH} doorSide="east" doorAt={118.3} label="pharmacy" doorStyle="glass" glassSide="south" />
        <RoomSign text="PHARMACY" position={[78.9, GROUND + 3.3, 118.3]} rotation={[0, Math.PI / 2, 0]} width={2.8} color="#0e3a2a" glow="#8fffd6" />
        <Counter position={[70, GROUND, 117.0]} yaw={Math.PI} length={6} height={1.05} depth={0.8} top="marble" face="#1c2a2a" />
        {[67, 76].map((x) => <Shelf key={x} position={[x, GROUND, 115.8]} yaw={0} width={2.6} height={2.0} />)}

        <BoxRoom id="hosp-imaging" x0={64.6} x1={79} z0={BAND.zMid} z1={BAND.z1} y={GROUND} h={FH} doorSide="east" doorAt={125.8} label="imaging room" doorStyle="glass" glassSide="south" />
        <RoomSign text="IMAGING" position={[78.9, GROUND + 3.3, 125.8]} rotation={[0, Math.PI / 2, 0]} width={2.4} color="#1d1830" glow="#c98fff" />
        <VitalsMonitor position={[70, GROUND, 124.0]} yaw={0} />
        <group position={[70, GROUND, 128.2]}>
          <mesh position={[0, 0.9, 0]} castShadow><boxGeometry args={[1.0, 1.8, 2.0]} /><meshStandardMaterial color="#e7ebee" roughness={0.4} metalness={0.3} /></mesh>
          <mesh position={[0, 0.74, 0]} rotation={[-Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.45, 0.45, 0.3, 24]} /><meshStandardMaterial color="#cfd8df" roughness={0.3} metalness={0.5} /></mesh>
        </group>

        {/* ---------------- FLOOR 2: NURSES' STATION & PATIENT ROOMS ---------------- */}
        <RoomSign text="FLOOR 2 · PATIENT CARE" position={[STAIR.x1, y2 + 3.3, 125.8]} rotation={[0, -Math.PI / 2, 0]} width={4.2} color="#0e2a3a" glow="#8fd6ff" />
        <RoomSign text="STAIRS" position={[STAIR.x1, y2 + 3.4, STAIR.zA + 0.3]} rotation={[0, -Math.PI / 2, 0]} width={2.0} />
        <Counter position={[85, y2, 127.4]} yaw={Math.PI} length={6} height={1.1} depth={0.8} top="marble" face="#1c2a2a" />
        <RoomSign text="NURSES' STATION" position={[85, y2 + 3.2, 127.3]} width={3.2} color="#0e2a3a" glow="#8fd6ff" />
        <VitalsMonitor position={[82, y2, 128.0]} yaw={0} />
        <Chair position={[85, y2, 128.8]} yaw={0} color="#2a2f38" />
        {patientRoom('hosp-patient-0', WING_W, 'east', BAND.z0, BAND.zMid, 'ROOM 201', 0)}
        {patientRoom('hosp-patient-1', WING_W, 'east', BAND.zMid, BAND.z1, 'ROOM 202', Math.PI)}
        {patientRoom('hosp-patient-2', WING_E, 'west', BAND.z0, BAND.zMid, 'ROOM 203', Math.PI)}
        {patientRoom('hosp-patient-3', WING_E, 'west', BAND.zMid, BAND.z1, 'ROOM 204', 0)}

        {/* ---------------- FLOOR 3: SURGERY, DOCTORS' OFFICES & STAFF LOUNGE ---------------- */}
        <RoomSign text="FLOOR 3 · SURGERY" position={[STAIR.x1, y3 + 3.3, 125.8]} rotation={[0, -Math.PI / 2, 0]} width={4.2} color="#1d1830" glow="#c98fff" />
        <RoomSign text="STAIRS" position={[STAIR.x1, y3 + 3.4, STAIR.zA + 0.3]} rotation={[0, -Math.PI / 2, 0]} width={2.0} />
        {[[BAND.z0, BAND.zMid, 'DR. VANCE'], [BAND.zMid, BAND.z1, 'DR. OSEI']].map(([za, zb, t], i) => {
          const doorAt = (za + zb) / 2
          const deskZ = za + (zb - za) * 0.4
          return (
            <group key={t}>
              <BoxRoom id={'hosp-office-' + i} x0={64.6} x1={79} z0={za} z1={zb} y={y3} h={FH} doorSide="east" doorAt={doorAt} label="doctor's office" />
              <RoomSign text={t} position={[78.9, y3 + 3.2, doorAt]} rotation={[0, Math.PI / 2, 0]} width={2.2} color="#0e2a3a" glow="#8fd6ff" />
              <Table position={[70, y3, deskZ]} size={[1.4, 0.8]} height={0.75} top="wood" />
              <Chair position={[70, y3, deskZ - 0.9]} yaw={Math.PI} color="#2a2f38" />
              <Chair position={[70, y3, deskZ + 0.9]} yaw={0} color="#5a7a8a" />
              <Shelf position={[65.1, y3, za + 0.5]} yaw={-Math.PI / 2} width={1.6} height={2.0} />
            </group>
          )
        })}
        {[[BAND.z0, BAND.zMid, 'OPERATING ROOM 1'], [BAND.zMid, BAND.z1, 'OPERATING ROOM 2']].map(([za, zb, t], i) => {
          const doorAt = (za + zb) / 2
          const tableZ = za + (zb - za) * 0.55
          return (
            <group key={t}>
              <BoxRoom id={'hosp-or-' + i} x0={91} x1={106} z0={za} z1={zb} y={y3} h={FH} doorSide="west" doorAt={doorAt} label="operating room" doorStyle="glass" glassSide="south" />
              <RoomSign text={t} position={[91.1, y3 + 3.3, doorAt]} rotation={[0, -Math.PI / 2, 0]} width={3.0} color="#1d1830" glow="#c98fff" />
              <OperatingTable position={[99.5, y3, tableZ]} yaw={0} />
              <SurgicalLight position={[99.5, y3 + FH - 1.0, tableZ]} />
            </group>
          )
        })}
        <Sofa position={[84, y3, 117.0]} yaw={0} length={2.6} color="#5a7a8a" />
        <Table position={[88, y3, 117.0]} size={[1.6, 0.9]} height={0.75} top="wood" round />
        <Chair position={[86.6, y3, 117.0]} yaw={Math.PI / 2} color="#2a2f38" />
        <Chair position={[89.4, y3, 117.0]} yaw={-Math.PI / 2} color="#2a2f38" />
        <RoomSign text="STAFF LOUNGE" position={[85, y3 + 3.3, 115.8]} width={2.8} />
        <WallScreen position={[STAIR.x1 + 0.05, y3 + 1.9, 117.0]} yaw={Math.PI / 2} size={[2.2, 1.3]} id="screen-hosp-lounge" zone="hospital-3" name="Hospital staff lounge" />

        {lights(GROUND, 'hospital-1', [[85, 118], [85, 126], [97, 118], [97, 126], [70, 118], [70, 126]])}
        {lights(y2, 'hospital-2', [[85, 127], [70, 118], [70, 126], [98, 118], [98, 126]])}
        {lights(y3, 'hospital-3', [[70, 118], [70, 126], [99, 118], [99, 126], [86, 117]])}
      </JusticeBuilding>

      <group userData={{ noBatch: true }}>
        <HumanoidCrowd fans={people} beat={0} castShadow />
      </group>
      <HospitalDialogue y2={y2} y3={y3} />

      {/* the approach: pavers, planters, benches, lamps and a red-cross pylon sign facing the courtyard */}
      <group>
        <mesh position={[85, GROUND + 0.008, 112]} rotation={[-Math.PI / 2, 0, 0]} material={surface('pavers', 3, 2)} receiveShadow>
          <planeGeometry args={[18, 4]} />
        </mesh>
        {[[76, 112.4], [94, 112.4]].map(([x, z], i) => <Planter key={i} position={[x, GROUND, z]} size={[1.6, 0.7, 1.6]} />)}
        {[[73, 113.2], [97, 113.2]].map(([x, z], i) => <Bench key={i} position={[x, GROUND, z]} yaw={0} />)}
        {[[63.4, 114.6], [106.6, 114.6]].map(([x, z], i) => <StreetLamp key={i} position={[x, GROUND, z]} height={6} />)}
        <group position={[85, GROUND, 110.5]}>
          <mesh position={[0, 1.6, 0]} material={m.blackSteel} castShadow><boxGeometry args={[0.3, 3.2, 0.3]} /></mesh>
          <mesh position={[0, 3.0, 0]}><boxGeometry args={[1.6, 1.0, 0.1]} /><meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} /></mesh>
          <mesh position={[0, 3.0, 0.06]}><boxGeometry args={[0.7, 0.18, 0.02]} /><meshBasicMaterial color="#d32f2f" toneMapped={false} /></mesh>
          <mesh position={[0, 3.0, 0.06]}><boxGeometry args={[0.18, 0.7, 0.02]} /><meshBasicMaterial color="#d32f2f" toneMapped={false} /></mesh>
          <BrandSign text="VISION STORMS GENERAL" sub="EMERGENCY · 24 HOURS" position={[0, 1.2, 0]} width={6} color="#eef3f5" glow="#3fa9e0" size={90} />
        </group>
      </group>
    </group>
  )
}
