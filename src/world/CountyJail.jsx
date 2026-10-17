import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface, blackMarble } from './materials.js'
import { registerInteractable } from '../state/runtime.js'
import { useStore } from '../state/store.js'
import { registerLightAnchor } from '../state/environment.js'
import { SingleDoor } from './Door.jsx'
import { BrandSign } from './signs.jsx'
import { Chair, Table, Counter, Sofa, Shelf, Plant, CeilingLight, WallScreen } from './furniture.jsx'
import { Bench, StreetLamp } from './props.jsx'
import { HumanoidCrowd, makeCrowd } from '../npc/HumanoidCrowd.jsx'
import { useJustice } from '../state/justice.js'
import { canvasTexture } from './canvasText.js'
import { ElevatorCar } from './ElevatorCar.jsx'
import { carById, carHole } from '../config/elevators.js'
import {
  JusticeBuilding, BarGate, Cell, UStair, BoxRoom, Rail, RoomSign, Cruiser, useNpcDialogue, GROUND, T,
} from './Justice.jsx'

// ============================================================================
// COUNTY JAIL  (fictional, Vision Storms County)
// Footprint x[-56,-18] z[80,112], three floors of 4.6 m with a real elevator and a staircase.
//   Floor 1  Intake, booking, a holding cell, visitation windows, dining hall, library, medical,
//            counseling and a classroom. A fenced recreation yard sits against the west wall.
//   Floor 2  Housing Pod 2: officer station, day room, 12 cells around a pod floor.
//   Floor 3  Housing Pod 3: the same plan, with a group-counseling circle in the day room.
// Everything is roleplay with NPCs. Every cell gate and door opens from both sides, so nobody is
// ever locked in. A roleplay kiosk and an exit/report point stand just inside the entrance.
// ============================================================================

export const JAIL = { x0: -56, x1: -18, z0: 80, z1: 112 }
export const JAIL_YARD = { x0: -76, x1: -56, z0: 82, z1: 108 }
export const FH = 4.6
const STAIR = { x0: -22.4, x1: -19, zA: 88, zB: 95.4, landing: 1.6 }
const PZ = 96 // the secure partition
export const jy = (k) => GROUND + k * FH
export const CO = '#3a4652', DEPUTY = '#b9a67e', ORANGE = '#e4701e', SCRUBS = '#2f8f87', WHITE = '#e6e6e0'

// ---------------------------------------------------------------------------
// The secure partition on one floor: solid wall, a secure door, and (floor 1) the visiting windows.
// ---------------------------------------------------------------------------
export function JailPartition({ k, windows, ox = 0, idp = 'jail' }) {
  const m = getMaterials()
  const y = jy(k)
  const wall = useMemo(() => surface('concrete', 2, 1.2, { color: '#8f8c86' }), [])
  const doorH = 3.2
  const pieces = []
  const solid = (a, b, y0 = 0, hh = FH) => pieces.push({ c: ox + (a + b) / 2, w: b - a, y0, hh })
  solid(-56, -47.5)
  solid(-47.5, -45.5, doorH, FH - doorH) // lintel over the secure door
  if (windows) {
    solid(-45.5, -35.5)
    solid(-35.5, -23.5, 0, 1.0)
    pieces.push({ c: ox - 29.5, w: 12, y0: 1.0, hh: 1.7, glass: true })
    solid(-35.5, -23.5, 2.7, FH - 2.7)
    solid(-23.5, -18)
  } else solid(-45.5, -18)
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {pieces.map((p, i) => <CuboidCollider key={i} args={[p.w / 2, p.hh / 2, T / 2]} position={[p.c, y + p.y0 + p.hh / 2, PZ]} />)}
      </RigidBody>
      {pieces.map((p, i) => (
        <mesh key={i} position={[p.c, y + p.y0 + p.hh / 2, PZ]} material={p.glass ? m.glass : wall} castShadow={!p.glass} receiveShadow={!p.glass}>
          <boxGeometry args={[p.w, p.hh, p.glass ? 0.08 : T]} />
        </mesh>
      ))}
      <SingleDoor id={idp + '-secure-' + k} hinge={[ox - 47.5, y, PZ]} width={2.0} height={doorH} baseYaw={0} openAngle={1.4} label="secure area" style="black" />
    </group>
  )
}

/** A flashing amber beacon (the jail's entrance and the transport bus), coloured light on the walls. */
export function Beacon({ position, anchorAt, rate = 520, color = '#ffb020' }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a1a05', emissive: color, emissiveIntensity: 0.2, toneMapped: false }), [color])
  const anchor = useMemo(() => ({ position: new THREE.Vector3(...(anchorAt || position)), color: new THREE.Color(color), intensity: 0, distance: 12, range: 34 }), [position[0], position[1], position[2], color]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => registerLightAnchor(anchor), [anchor])
  useFrame(() => {
    const on = Math.floor(performance.now() / rate) % 2 === 0
    mat.emissiveIntensity = on ? 3.2 : 0.2
    anchor.intensity = on ? 14 : 0
  })
  return (
    <group position={position}>
      <mesh position={[0, -0.12, 0]} material={getMaterials().blackSteel}><cylinderGeometry args={[0.16, 0.2, 0.1, 14]} /></mesh>
      <mesh material={mat}><sphereGeometry args={[0.17, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
    </group>
  )
}

/** Chain-link fence run between two ground points: posts, mesh panel, barbed top, collider. */
export function FenceRun({ a, b, h = 3.4, mesh }) {
  const m = getMaterials()
  const dx = b[0] - a[0], dz = b[1] - a[1]
  const len = Math.hypot(dx, dz)
  const yaw = -Math.atan2(dz, dx)
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const posts = Math.max(2, Math.round(len / 3) + 1)
  return (
    <group position={[mid[0], GROUND, mid[1]]} rotation={[0, yaw, 0]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[len / 2, h / 2, 0.06]} position={[0, h / 2, 0]} />
      </RigidBody>
      <mesh position={[0, h / 2, 0]} material={mesh(len)}><planeGeometry args={[len, h]} /></mesh>
      {Array.from({ length: posts }, (_, i) => (
        <mesh key={i} position={[-len / 2 + (i * len) / (posts - 1), (h + 0.3) / 2, 0]} material={m.darkMetal}><cylinderGeometry args={[0.05, 0.05, h + 0.3, 8]} /></mesh>
      ))}
      <mesh position={[0, h, 0]} rotation={[0, 0, Math.PI / 2]} material={m.darkMetal}><cylinderGeometry args={[0.035, 0.035, len, 6]} /></mesh>
      {/* the coil of razor wire along the top */}
      <mesh position={[0, h + 0.3, 0.05]} rotation={[0, 0, Math.PI / 2]} material={m.chrome}><cylinderGeometry args={[0.1, 0.1, len, 8]} /></mesh>
      <mesh position={[0, h + 0.12, 0.05]} rotation={[0.5, 0, 0]} material={m.darkMetal}><boxGeometry args={[len, 0.04, 0.4]} /></mesh>
    </group>
  )
}

/** The recreation yard: asphalt court with painted lines, a hoop, benches, a pull-up frame and a fence. */
function RecYard() {
  const m = getMaterials()
  const { x0, x1, z0, z1 } = JAIL_YARD
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
  const court = useMemo(() => new THREE.MeshStandardMaterial({
    roughness: 0.95,
    map: canvasTexture(512, 400, (ctx, w, h) => {
      ctx.fillStyle = '#566272'; ctx.fillRect(0, 0, w, h)
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
        tex.repeat.set(len / 1.2, 3.4 / 1.2)
        cache.set(key, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, color: '#aab0b8' }))
      }
      return cache.get(key)
    }
  }, [])
  const steel = m.darkMetal
  return (
    <group>
      <mesh position={[cx, GROUND + 0.01, cz]} rotation={[-Math.PI / 2, 0, 0]} material={surface('asphalt', 5, 6)} receiveShadow><planeGeometry args={[x1 - x0, z1 - z0]} /></mesh>
      <mesh position={[cx + 1, GROUND + 0.02, cz]} rotation={[-Math.PI / 2, 0, 0]} material={court} receiveShadow><planeGeometry args={[15, 11.8]} /></mesh>
      {/* fence: west, north, south (with a gate) */}
      <FenceRun a={[x0, z0]} b={[x0, z1]} mesh={fence} />
      <FenceRun a={[x0, z1]} b={[x1, z1]} mesh={fence} />
      <FenceRun a={[x0, z0]} b={[-67.5, z0]} mesh={fence} />
      <FenceRun a={[-65.7, z0]} b={[x1, z0]} mesh={fence} />
      <BarGate id="jail-yard-gate" hinge={[-67.5, GROUND, z0]} width={1.8} height={3.0} baseYaw={0} openAngle={-1.5} label="yard gate" />
      {/* basketball hoop at the west end, facing east */}
      <group position={[x0 + 1.6, GROUND, cz + 1]}>
        <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.1, 1.6, 0.1]} position={[0, 1.6, 0]} /></RigidBody>
        <mesh position={[0, 1.6, 0]} material={steel}><cylinderGeometry args={[0.07, 0.09, 3.2, 10]} /></mesh>
        <mesh position={[0.45, 3.1, 0]} material={m.blackSteel}><boxGeometry args={[0.8, 0.04, 0.1]} /></mesh>
        <mesh position={[0.85, 3.3, 0]} material={m.glass}><boxGeometry args={[0.05, 0.9, 1.4]} /></mesh>
        <mesh position={[1.05, 3.08, 0]} rotation={[Math.PI / 2, 0, 0]} material={new THREE.MeshStandardMaterial({ color: '#e0521c', roughness: 0.4 })}><torusGeometry args={[0.23, 0.02, 8, 18]} /></mesh>
      </group>
      {/* pull-up frame and benches */}
      <group position={[x0 + 3.5, GROUND, z1 - 2.2]}>
        <RigidBody type="fixed" colliders={false}><CuboidCollider args={[1.3, 1.2, 0.1]} position={[0, 1.2, 0]} /></RigidBody>
        {[-1.2, 1.2].map((x) => <mesh key={x} position={[x, 1.2, 0]} material={steel}><cylinderGeometry args={[0.06, 0.06, 2.4, 8]} /></mesh>)}
        <mesh position={[0, 2.35, 0]} rotation={[0, 0, Math.PI / 2]} material={m.chrome}><cylinderGeometry args={[0.04, 0.04, 2.5, 8]} /></mesh>
        <mesh position={[0, 1.9, 0]} rotation={[0, 0, Math.PI / 2]} material={m.chrome}><cylinderGeometry args={[0.04, 0.04, 2.5, 8]} /></mesh>
      </group>
      {[[-62, 105.6], [-70, 105.6], [-62, 84.8]].map(([x, z], i) => <Bench key={i} position={[x, GROUND, z]} yaw={i < 2 ? Math.PI : 0} />)}
      <StreetLamp position={[x0 + 2.5, GROUND, z0 + 2.5]} height={7} />
      <StreetLamp position={[x1 - 2.5, GROUND, z1 - 2.5]} height={7} />
      <BrandSign text="RECREATION YARD" sub="SUPERVISED · ALL ROLEPLAY" position={[-66.6, GROUND + 4.4, z0 - 0.1]} rotation={[0, Math.PI, 0]} width={6} size={110} color="#f4f1ea" glow="#ffd9a0" />
    </group>
  )
}

/** A guard tower standing past the yard's north-west corner. Decorative, with a sweeping spotlight. */
export function GuardTower({ position }) {
  const m = getMaterials()
  const concrete = useMemo(() => surface('concrete', 1, 2, { color: '#8d8a84' }), [])
  const anchor = useMemo(() => ({ position: new THREE.Vector3(position[0] + 1, GROUND + 7.4, position[2]), color: new THREE.Color('#fff2d0'), intensity: 14, distance: 22, range: 40 }), [position[0], position[2]]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => registerLightAnchor(anchor), [anchor])
  useFrame(() => {
    const t = performance.now() / 3200
    anchor.position.set(position[0] + 5 + Math.cos(t) * 5, GROUND + 3.5, position[2] - 6 + Math.sin(t) * 6)
  })
  return (
    <group position={[position[0], GROUND, position[2]]}>
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[1.2, 3.6, 1.2]} position={[0, 3.6, 0]} /></RigidBody>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => <mesh key={i} position={[x * 0.9, 2.5, z * 0.9]} material={concrete} castShadow><boxGeometry args={[0.3, 5, 0.3]} /></mesh>)}
      <mesh position={[0, 5.1, 0]} material={concrete} castShadow><boxGeometry args={[3.0, 0.25, 3.0]} /></mesh>
      <mesh position={[0, 6.2, 0]} material={m.glass}><boxGeometry args={[2.6, 1.9, 2.6]} /></mesh>
      {[[0, 1.3], [0, -1.3]].map(([x, z], i) => <mesh key={i} position={[x, 6.2, z]} material={m.blackSteel}><boxGeometry args={[2.7, 0.12, 0.12]} /></mesh>)}
      <mesh position={[0, 7.3, 0]} material={m.blackSteel} castShadow><boxGeometry args={[3.2, 0.25, 3.2]} /></mesh>
      <mesh position={[0.9, 7.0, 0]} material={m.chrome}><boxGeometry args={[0.35, 0.3, 0.5]} /></mesh>
    </group>
  )
}

/** The sheriff's transport bus: white and orange, barred windows, a flashing amber beacon. */
export function TransportBus({ position, yaw = 0 }) {
  const m = getMaterials()
  const body = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e9e8e2', roughness: 0.4, metalness: 0.25 }), [])
  const stripe = useMemo(() => new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.45 }), [])
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#12171d', roughness: 0.15, metalness: 0.7 }), [])
  const tyre = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0b0b0d', roughness: 0.9 }), [])
  return (
    <group position={[position[0], GROUND, position[2]]} rotation={[0, yaw, 0]}>
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[1.3, 1.4, 4.6]} position={[0, 1.4, 0]} /></RigidBody>
      <mesh position={[0, 1.5, 0]} material={body} castShadow><boxGeometry args={[2.5, 2.2, 9.2]} /></mesh>
      <mesh position={[0, 0.7, 0]} material={stripe}><boxGeometry args={[2.52, 0.32, 9.22]} /></mesh>
      {[-1.26, 1.26].map((x) => (
        <group key={x}>
          {Array.from({ length: 6 }, (_, i) => (
            <group key={i} position={[x, 1.95, -3.5 + i * 1.4]}>
              <mesh material={dark}><boxGeometry args={[0.04, 0.55, 1.0]} /></mesh>
              {[-0.3, -0.1, 0.1, 0.3].map((z) => <mesh key={z} position={[x > 0 ? 0.04 : -0.04, 0, z]} material={m.blackSteel}><boxGeometry args={[0.03, 0.55, 0.03]} /></mesh>)}
            </group>
          ))}
        </group>
      ))}
      <mesh position={[0, 1.9, 4.61]} material={dark}><boxGeometry args={[2.2, 0.9, 0.04]} /></mesh>
      {[[-1.1, 3], [1.1, 3], [-1.1, -3], [1.1, -3]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.45, z]} rotation={[0, 0, Math.PI / 2]} material={tyre}><cylinderGeometry args={[0.45, 0.45, 0.35, 16]} /></mesh>
      ))}
      <BrandSign text="COUNTY SHERIFF" sub="TRANSPORT" position={[1.27, 1.0, 0]} rotation={[0, Math.PI / 2, 0]} width={4} size={90} color="#1d2430" glow="#ffe0b0" />
      <BrandSign text="COUNTY SHERIFF" sub="TRANSPORT" position={[-1.27, 1.0, 0]} rotation={[0, -Math.PI / 2, 0]} width={4} size={90} color="#1d2430" glow="#ffe0b0" />
      <Beacon position={[0, 2.78, 3.6]} anchorAt={[position[0] + 3.6, GROUND + 2.9, position[2]]} rate={420} />
    </group>
  )
}

/** The kiosk pillar and sign by the entrance: the optional, fictional roleplay with exit and report. */
function JailKiosks() {
  const m = getMaterials()
  useEffect(() => {
    const offs = [
      registerInteractable('jail-roleplay-kiosk', {
        position: new THREE.Vector3(-33.5, GROUND + 1, 81.2),
        radius: 2.6,
        label: () => 'Justice roleplay kiosk',
        onInteract: () => { useJustice.getState().openMenu('rehab'); useStore.getState().openPanel({ type: 'justice' }) },
      }),
      registerInteractable('jail-exit-report', {
        position: new THREE.Vector3(-40.5, GROUND + 1, 81.4),
        radius: 2.2,
        label: () => 'Roleplay: stop or report',
        onInteract: () => { useJustice.getState().openMenu(null); useStore.getState().openPanel({ type: 'justice' }) },
      }),
    ]
    return () => offs.forEach((o) => o())
  }, [])
  return (
    <group>
      {[-33.5, -40.5].map((x, i) => (
        <group key={x} position={[x, GROUND, 81.0]}>
          <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.3, 0.65, 0.18]} position={[0, 0.65, 0]} /></RigidBody>
          <mesh position={[0, 0.65, 0]} material={m.blackSteel} castShadow><boxGeometry args={[0.6, 1.3, 0.36]} /></mesh>
          <mesh position={[0, 1.0, 0.19]} rotation={[-0.35, 0, 0]}><planeGeometry args={[0.46, 0.3]} /><meshBasicMaterial color={i === 0 ? '#2fd0c4' : '#ffb020'} toneMapped={false} /></mesh>
        </group>
      ))}
      <RoomSign text="ROLEPLAY KIOSK" position={[-33.5, GROUND + 2.3, 80.46]} width={2.4} color="#0e3a2a" glow="#8fffd6" />
      <RoomSign text="EXIT · REPORT" position={[-40.5, GROUND + 2.3, 80.46]} width={2.4} color="#3a1111" glow="#ffb09a" />
    </group>
  )
}

/** All talking points. Floor 1 NPCs at ground level, upper floors at their own heights. */
function JailDialogue({ y2, y3 }) {
  useNpcDialogue('jail-deputy', [-44, GROUND, 87], 'Talk to Intake Deputy', [
    'Deputy: Welcome to Vision Storms County Jail. This is a fictional roleplay space: everyone here is an NPC or a visitor like you.',
    'Deputy: Stop a scenario any time at the kiosk by the door. You can leave any room or building whenever you like; nothing here can hold you.',
  ])
  useNpcDialogue('jail-booking', [-41.5, GROUND, 94.3], 'Talk to Booking Officer', [
    'Booking Officer: Booking means identity, property inventory, a health screening and a phone call. Everything is logged and returned on release.',
  ])
  useNpcDialogue('jail-holding', [-53, GROUND, 83.5], 'Talk to the detainee (roleplay)', [
    'Detainee: In this story I\'m waiting to be seen. Holding cells are short stays: a few hours, then a hearing or release.',
  ])
  useNpcDialogue('jail-visit-v', [-31, GROUND, 94], 'Talk to the visitor', [
    'Visitor: I come every week. Contact with family is one of the strongest things that helps people succeed after release.',
  ])
  useNpcDialogue('jail-visit-r', [-31, GROUND, 97.8], 'Talk to the resident (roleplay)', [
    'Resident: Visits are the best part of the week. It\'s all pretend here, but the idea is real: stay connected.',
  ])
  useNpcDialogue('jail-co-door', [-46.5, GROUND, 97.3], 'Talk to Correctional Officer', [
    'Correctional Officer: The secure area is all roleplay and every door opens from both sides. Dining, library, medical, counseling and class are down the corridor.',
  ])
  useNpcDialogue('jail-cook', [-46, GROUND, 106.1], 'Talk to kitchen staff', [
    'Kitchen Staff: Three meals a day. In real facilities, special diets for health or faith are required to be accommodated.',
  ])
  useNpcDialogue('jail-medical', [-33, GROUND, 107.5], 'Talk to Nurse', [
    'Nurse: Everyone gets a health screening, and care is a right here, not a favor. Mental health care is part of that.',
  ])
  useNpcDialogue('jail-counselor', [-27.5, GROUND, 108], 'Talk to Counselor', [
    'Counselor: Counseling is about handling stress and building a plan: housing, work and support. Press E at the kiosk to follow a program day.',
  ])
  useNpcDialogue('jail-teacher', [-21.5, GROUND, 109.6], 'Talk to Teacher', [
    'Teacher: Today\'s class: reading a pay stub and writing a resume. Education programs are one of the best-studied ways to reduce repeat offenses.',
  ])
  useNpcDialogue('jail-librarian', [-50.5, GROUND, 109.8], 'Talk to Librarian', [
    'Librarian: Law books, novels, study guides. Reading time counts toward the program, and the quiet is the point.',
  ])
  useNpcDialogue('jail-yard-co', [-60, GROUND, 96], 'Talk to yard officer', [
    'Yard Officer: Fresh air and exercise are required daily in most facilities. The yard gate opens from inside, too.',
  ])
  useNpcDialogue('jail-station-2', [-41.5, y2, 85.4], 'Talk to Pod Officer', [
    'Pod Officer: Floor two is Housing Pod 2. Cells open from both sides in this story. Staff walk the pod on a schedule, day and night.',
  ])
  useNpcDialogue('jail-nurse-2', [-48.5, y2, 88.6], 'Talk to Nurse', [
    'Nurse: Medication rounds are twice a day. I also check on anyone who feels unwell between rounds.',
  ])
  useNpcDialogue('jail-station-3', [-41.5, y3, 85.4], 'Talk to Pod Officer', [
    'Pod Officer: Floor three is Housing Pod 3, the program pod. Residents here take classes and counseling each day.',
  ])
  useNpcDialogue('jail-group', [-29, y3, 88.5], 'Talk to group counselor', [
    'Group Counselor: Group sessions work on listening and accountability. Everyone gets a turn, and nobody has to share more than they\'re comfortable with.',
  ])
  return null
}

export function CountyJail() {
  const m = getMaterials()
  const { x0, x1, z0, z1 } = JAIL
  const cx = (x0 + x1) / 2
  const car = carById('jail')
  const y2 = jy(1), y3 = jy(2)
  const lobbyFloor = useMemo(() => blackMarble('#e4701e', 6, 5), []) // public lobby: polished black marble, amber vein
  const cellFloor = useMemo(() => surface('concrete', 10, 8, { color: '#8d8a84' }), [])
  const carpet = useMemo(() => surface('concrete', 9, 7, { color: '#9b978f' }), [])
  const holes = useMemo(() => [carHole(car), { x0: STAIR.x0, x1: STAIR.x1, z0: STAIR.zA, z1: STAIR.zB - STAIR.landing }], [car])

  const people = useMemo(() => {
    const L = []
    const add = (x, y, z, yaw, shirt, pants = '#232a33') => L.push({ x, y, z, yaw, shirt, pants })
    // floor 1
    add(-44, GROUND, 87, Math.PI, DEPUTY, '#2a2a30')            // intake deputy
    add(-41.5, GROUND, 94.3, Math.PI, DEPUTY, '#2a2a30')        // booking officer
    add(-53, GROUND, 83.5, Math.PI / 2, ORANGE, ORANGE)         // detainee in the holding cell
    add(-31, GROUND, 94, 0, '#8b6a4a', '#2a2a30')               // visitor
    add(-31, GROUND, 97.8, Math.PI, ORANGE, ORANGE)             // resident at the window
    add(-46.5, GROUND, 97.3, Math.PI, CO)                       // officer at the secure door
    add(-46, GROUND, 104.1, Math.PI, ORANGE, ORANGE)            // dining line
    add(-43.6, GROUND, 104.1, Math.PI, ORANGE, ORANGE)
    add(-46, GROUND, 106.1, Math.PI, WHITE, '#222')             // kitchen staff
    add(-43, GROUND, 106.1, Math.PI, WHITE, '#222')
    add(-33, GROUND, 107.5, Math.PI, SCRUBS, SCRUBS)            // nurse
    add(-27.5, GROUND, 108, Math.PI, '#6a5a8a', '#2a2a30')      // counselor
    add(-21.5, GROUND, 109.6, Math.PI, '#4a6a8a', '#2a2a30')    // teacher
    add(-50.5, GROUND, 109.8, Math.PI, '#7a6a4a', '#2a2a30')    // librarian
    add(-43, GROUND, 110.4, Math.PI, ORANGE, ORANGE)            // resident reading
    add(-38.5, GROUND, 100.6, Math.PI / 2, CO)                  // officer in the corridor
    add(-60, GROUND, 96, Math.PI / 2, CO)                       // yard officer
    add(-65, GROUND, 90, 0.6, ORANGE, ORANGE)                   // yard residents
    add(-70, GROUND, 99, -1.2, ORANGE, ORANGE)
    add(-64, GROUND, 103, 2.4, ORANGE, ORANGE)
    // floors 2 and 3
    for (const y of [y2, y3]) {
      add(-41.5, y, 85.4, Math.PI, CO)                          // pod officer in the station
      add(-50, y, 98, 0, CO)                                    // officer in the pod vestibule
      add(-40, y, 99, -1.4, ORANGE, ORANGE)                     // resident in a cell
      add(-53.4, y, 108.2, 0.4, ORANGE, ORANGE)                 // resident in a cell
      add(-30, y, 104.4, 0, ORANGE, ORANGE)                     // resident at the pod table
    }
    add(-48.5, y2, 88.6, 0, SCRUBS, SCRUBS)                     // nurse on rounds
    add(-26, y2, 91, 0, CO)                                     // officer in the day room
    add(-29, y3, 88.5, 0, '#6a5a8a', '#2a2a30')                 // group counselor
    add(-30.9, y3, 86.9, 0.5, ORANGE, ORANGE)
    add(-27.2, y3, 90.2, 3.6, ORANGE, ORANGE)
    return makeCrowd(L.length, (i) => ({ x: L[i].x, y: L[i].y, z: L[i].z, yaw: L[i].yaw, raiseChance: 0 })).map((f, i) => ({
      ...f, shirt: L[i].shirt, pants: L[i].pants, armsUp: 0, bounce: 0.25,
    }))
  }, [y2, y3])

  const lights = (y, zone, pts) => pts.map(([lx, lz], i) => (
    <CeilingLight key={zone + i} position={[lx, y + FH - 0.3, lz]} size={[1.4, 1.4]} intensity={18} distance={12} zone={zone} watts={56} color="#f7efe0" />
  ))

  // a day-room / pod furnishing for floors 2 and 3
  const pod = (k) => {
    const y = jy(k)
    const cells = []
    for (let i = 0; i < 8; i++) {
      const xa = -55.4 + i * 4.5
      cells.push(<Cell key={'n' + i} id={`p${k + 1}-n${i + 1}`} x0={xa} x1={xa + 4.5} z0={106.5} z1={111.5} y={y} gate="south" label={`Cell ${k + 1}${String.fromCharCode(65 + i)}`} shared={k === 2 && i === 7} />)
    }
    for (let i = 0; i < 4; i++) {
      const xa = -42.2 + i * 4.6
      cells.push(<Cell key={'s' + i} id={`p${k + 1}-s${i + 1}`} x0={xa} x1={xa + 4.6} z0={96.6} z1={101.6} y={y} gate="north" label={`Cell ${k + 1}${String.fromCharCode(73 + i)}`} />)
    }
    return (
      <group>
        <RoomSign text={`FLOOR ${k + 1} · HOUSING POD ${k + 1}`} position={[-55.35, y + 3.3, 89]} rotation={[0, Math.PI / 2, 0]} width={3.4} color="#3a1d05" glow="#ffc07a" />
        <RoomSign text="SECURE AREA · HOUSING" position={[-46.5, y + 3.7, PZ - 0.25]} rotation={[0, Math.PI, 0]} width={3.2} color="#3a1111" glow="#ff9d7a" />
        <RoomSign text="STAIRS" position={[-20.7, y + 3.4, 95.74]} rotation={[0, Math.PI, 0]} width={2.0} />
        {/* officer station: a glass-fronted room with a desk and monitors */}
        <BoxRoom id={`jail-station-${k + 1}`} x0={-46} x1={-37} z0={82} z1={89} y={y} h={FH} doorSide="west" doorAt={85.5} glassSide="north" label="officer station" doorStyle="glass" />
        <Table position={[-41.5, y, 83.9]} size={[3.2, 0.9]} height={0.75} top="wood" />
        <Chair position={[-41.5, y, 84.9]} yaw={Math.PI} color="#2a2f38" />
        <WallScreen position={[-41.5, y + 1.55, 82.2]} yaw={0} size={[2.2, 0.6]} />
        <RoomSign text="OFFICER STATION" position={[-45.88, y + 3.3, 85.5]} rotation={[0, -Math.PI / 2, 0]} width={2.6} />
        {/* day room */}
        <RoomSign text="DAY ROOM" position={[-29.5, y + 3.4, 80.45]} width={2.6} />
        {k === 1 ? (
          <>
            <WallScreen position={[-29.5, y + 2.1, 80.5]} yaw={0} size={[3.2, 1.8]} id="screen-county-dayroom" zone="county-jail-2" name="County Jail day room" />
            <Sofa position={[-31.5, y, 84.5]} yaw={Math.PI} length={2.6} color="#3a4452" />
            <Sofa position={[-27.5, y, 84.5]} yaw={Math.PI} length={2.6} color="#3a4452" />
            <Table position={[-30, y, 89.5]} size={[2.2, 0.9]} height={0.75} top="wood" />
            {[-31.1, -28.9].flatMap((x) => [88.5, 90.5].map((z) => <Chair key={x + ':' + z} position={[x, y, z]} yaw={z > 89.5 ? Math.PI : 0} color="#3b3f46" />))}
          </>
        ) : (
          <>
            {Array.from({ length: 6 }, (_, i) => {
              const a = (i / 6) * Math.PI * 2
              const dx = Math.cos(a) * 1.9, dz = Math.sin(a) * 1.9
              return <Chair key={i} position={[-29 + dx, y, 88.5 + dz]} yaw={Math.atan2(-dx, -dz)} color="#3b3f46" label="Join the group circle" />
            })}
            <RoomSign text="GROUP COUNSELING" position={[-29.5, y + 3.4, 80.45]} width={3.2} color="#0e3a2a" glow="#8fffd6" />
          </>
        )}
        <Plant position={[-54.6, y, 82.4]} scale={1.1} />
        <Plant position={[-24, y, 82.4]} scale={1.1} />
        {/* pod floor and cells */}
        <RoomSign text={`POD ${k + 1} DAY AREA`} position={[-30, y + 3.8, 104.1]} width={3.6} color="#3a1d05" glow="#ffc07a" />
        {cells}
        <Table position={[-37, y, 104.2]} size={[2.4, 1.0]} height={0.75} top="wood" />
        <Table position={[-30, y, 104.2]} size={[2.4, 1.0]} height={0.75} top="wood" />
        <Table position={[-23, y, 104.2]} size={[2.4, 1.0]} height={0.75} top="wood" />
        {[-37, -30, -23].flatMap((x) => [103.2, 105.2].map((z) => <Chair key={x + ':' + z} position={[x, y, z]} yaw={z > 104.2 ? Math.PI : 0} color="#7a7468" />))}
      </group>
    )
  }

  return (
    <group>
      <JusticeBuilding
        id="jail" x0={x0} x1={x1} z0={z0} z1={z1} h={FH} floors={3} holes={holes} upperFloorMat={carpet} windowSeed={5}
        doorSide="south" doorHalf={1.2} doorH={2.8}
        wall="concrete" wallColor="#cfcbc2" doorAccent="#e4701e" doorLabel="County Jail doors"
        floorMat={lobbyFloor} roofColor="#5f5c57" seed={31} upperW={1.6} upperH={1.4}
        sign={{ name: 'COUNTY JAIL', sub: 'VISION STORMS COUNTY · DETENTION' }} signWidth={7.6}
      >
        <Beacon position={[cx - 3.4, GROUND + 3.9, z0 - 0.3]} rate={520} />
        <Beacon position={[cx + 3.4, GROUND + 3.9, z0 - 0.3]} rate={520} color="#ff5a3c" />

        <JailPartition k={0} windows />
        <JailPartition k={1} />
        <JailPartition k={2} />
        {/* concrete floor in the secure part of the ground floor */}
        <mesh position={[(x0 + x1) / 2, GROUND + 0.015, 104]} rotation={[-Math.PI / 2, 0, 0]} material={cellFloor} receiveShadow>
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

        {/* ---------------- FLOOR 1: INTAKE LOBBY ---------------- */}
        <JailKiosks />
        <RoomSign text="INTAKE & BOOKING" position={[-44, GROUND + 3.5, 80.46]} width={4.6} color="#3a1d05" glow="#ffc07a" />
        <Counter position={[-44, GROUND, 86]} yaw={Math.PI} length={8} height={1.1} depth={0.9} top="marble" face="#20242b" />
        <Counter position={[-41.5, GROUND, 93.2]} yaw={0} length={4} height={1.0} depth={0.8} top="marble" face="#23262c" />
        <mesh position={[-41.5, GROUND + 1.22, 93.1]} material={m.blackSteel}><boxGeometry args={[0.5, 0.3, 0.4]} /></mesh>
        <RoomSign text="BOOKING" position={[-41.5, GROUND + 3.4, 95.6]} rotation={[0, Math.PI, 0]} width={2.8} />
        <Cell id="jail-hold" x0={-55.6} x1={-50} z0={81} z1={86} y={GROUND} gate="east" label="Holding Cell" />
        <RoomSign text="HOLDING" position={[-52.8, GROUND + 3.4, 80.46]} width={2.4} color="#3a1111" glow="#ff9d7a" />
        {/* waiting area */}
        <Sofa position={[-31, GROUND, 81.6]} yaw={0} length={3.2} color="#2a3550" />
        <Sofa position={[-26.5, GROUND, 81.6]} yaw={0} length={3.2} color="#2a3550" />
        <Plant position={[-24, GROUND, 81.4]} scale={1.1} />
        <Plant position={[-54.6, GROUND, 90]} scale={1.1} />

        {/* ---------------- FLOOR 1: VISITATION WINDOWS ---------------- */}
        <RoomSign text="VISITATION" position={[-29.5, GROUND + 3.6, 95.6]} rotation={[0, Math.PI, 0]} width={3.4} />
        <Counter position={[-29.5, GROUND, 95.3]} yaw={0} length={12} height={0.95} depth={0.5} top="wood" face="#3a3a40" />
        <Counter position={[-29.5, GROUND, 96.7]} yaw={0} length={12} height={0.95} depth={0.5} top="wood" face="#3a3a40" />
        {[-32.5, -29.5, -26.5].map((x) => (
          <group key={x}>
            <mesh position={[x, GROUND + 1.25, 95.3]} material={m.blackSteel}><boxGeometry args={[0.05, 0.6, 0.5]} /></mesh>
            <mesh position={[x, GROUND + 1.25, 96.7]} material={m.blackSteel}><boxGeometry args={[0.05, 0.6, 0.5]} /></mesh>
          </group>
        ))}
        {[-34, -28, -25].map((x) => <Chair key={'v' + x} position={[x, GROUND, 94.4]} yaw={0} color="#3b3f46" label="Sit at the visiting window" />)}
        {[-34, -28, -25].map((x) => <Chair key={'r' + x} position={[x, GROUND, 97.6]} yaw={Math.PI} color="#7a7468" label="Sit at the visiting window" />)}

        {/* ---------------- FLOOR 1: DINING HALL ---------------- */}
        <RoomSign text="DINING HALL" position={[-52, GROUND + 3.5, PZ + 0.25]} rotation={[0, 0, 0]} width={3.2} color="#0e3a2a" glow="#8fffd6" />
        {[-52.5, -41.5].flatMap((x) => [100, 103.2].map((z) => (
          <group key={x + ':' + z}>
            <Table position={[x, GROUND, z]} size={[4.4, 0.9]} height={0.75} top="wood" />
            {[-1, 1].flatMap((dx) => [-0.95, 0.95].map((dz) => <Chair key={dx + ':' + dz} position={[x + dx, GROUND, z + dz]} yaw={dz > 0 ? Math.PI : 0} color="#7a7468" />))}
          </group>
        )))}
        <Counter position={[-45.5, GROUND, 105.2]} yaw={Math.PI} length={8} height={1.05} depth={0.8} top="marble" face="#22262c" />
        <mesh position={[-45.5, GROUND + 1.45, 105.5]} material={m.chrome}><boxGeometry args={[7.4, 0.08, 0.5]} /></mesh>
        <RoomSign text="MEALS · 7 · 12 · 5" position={[-45.5, GROUND + 3.0, 105.6]} rotation={[0, Math.PI, 0]} width={3.2} color="#0e3a2a" glow="#8fffd6" />

        {/* ---------------- FLOOR 1: LIBRARY ---------------- */}
        <BoxRoom id="jail-library" x0={-55.6} x1={-37.5} z0={107.2} z1={111.6} y={GROUND} h={FH} doorSide="south" doorAt={-54.2} label="library" />
        <RoomSign text="LIBRARY" position={[-54.2, GROUND + 3.2, 107.1]} rotation={[0, Math.PI, 0]} width={2.0} />
        {[-53, -49, -45, -41].map((x) => <Shelf key={x} position={[x, GROUND, 111.4]} yaw={Math.PI} width={3.4} height={2.3} />)}
        <Table position={[-47, GROUND, 109.2]} size={[2.6, 1.0]} height={0.75} top="wood" />
        {[-48, -46].map((x) => <Chair key={x} position={[x, GROUND, 108.1]} yaw={0} color="#3b3f46" label="Sit in the library" />)}

        {/* ---------------- FLOOR 1: MEDICAL / COUNSELING / CLASSROOM ---------------- */}
        <BoxRoom id="jail-medical" x0={-35.5} x1={-30.5} z0={101.5} z1={111.6} y={GROUND} h={FH} doorSide="south" doorAt={-33} label="medical room" />
        <RoomSign text="MEDICAL" position={[-33, GROUND + 3.2, 101.4]} rotation={[0, Math.PI, 0]} width={2.0} color="#0e3a2a" glow="#8fffd6" />
        <mesh position={[-31.6, GROUND + 0.55, 108.4]} material={m.chrome} castShadow><boxGeometry args={[0.9, 0.5, 2.0]} /></mesh>
        <mesh position={[-31.6, GROUND + 0.85, 107.6]} material={new THREE.MeshStandardMaterial({ color: '#e8eef0', roughness: 0.8 })}><boxGeometry args={[0.8, 0.12, 1.2]} /></mesh>
        <Shelf position={[-34.9, GROUND, 109]} yaw={-Math.PI / 2} width={3} height={2.0} books={false} />
        <BoxRoom id="jail-counsel" x0={-30} x1={-25} z0={101.5} z1={111.6} y={GROUND} h={FH} doorSide="south" doorAt={-27.5} label="counseling room" />
        <RoomSign text="COUNSELING" position={[-27.5, GROUND + 3.2, 101.4]} rotation={[0, Math.PI, 0]} width={2.2} color="#0e3a2a" glow="#8fffd6" />
        <Sofa position={[-27.5, GROUND, 104.2]} yaw={0} length={2.2} color="#3a4a5a" />
        <Chair position={[-27.5, GROUND, 106.8]} yaw={Math.PI} color="#6a5a8a" label="Sit in counseling" />
        <Plant position={[-25.8, GROUND, 110.5]} scale={1.1} />
        <BoxRoom id="jail-class" x0={-24.5} x1={-18.4} z0={101.5} z1={111.6} y={GROUND} h={FH} doorSide="south" doorAt={-21.5} label="classroom" />
        <RoomSign text="CLASSROOM" position={[-21.5, GROUND + 3.2, 101.4]} rotation={[0, Math.PI, 0]} width={2.2} />
        <WallScreen position={[-21.5, GROUND + 1.9, 111.4]} yaw={Math.PI} size={[3.4, 1.7]} />
        {[104.4, 106.2].flatMap((z) => [-23.2, -21.4, -19.6].map((x) => <Chair key={x + ':' + z} position={[x, GROUND, z]} yaw={0} color="#3b3f46" label="Sit in class" />))}

        {/* ---------------- FLOORS 2 AND 3: HOUSING PODS ---------------- */}
        {pod(1)}
        {pod(2)}

        {/* lighting, switched per floor */}
        {lights(GROUND, 'county-jail-1', [[-46, 85], [-32, 85], [-46, 91], [-38, 91], [-48, 100], [-42, 105], [-32, 99], [-24, 99], [-33, 106], [-27.5, 106], [-21.5, 106], [-47, 109.4], [-30, 92]])}
        {lights(y2, 'county-jail-2', [[-50, 87], [-41.5, 86], [-30, 87], [-24, 92], [-48, 99], [-38, 104], [-30, 104], [-22, 104], [-50, 109], [-38, 109], [-26, 109], [-35, 98.5]])}
        {lights(y3, 'county-jail-3', [[-50, 87], [-41.5, 86], [-30, 87], [-24, 92], [-48, 99], [-38, 104], [-30, 104], [-22, 104], [-50, 109], [-38, 109], [-26, 109], [-35, 98.5]])}
      </JusticeBuilding>

      <group userData={{ noBatch: true }}>
        <HumanoidCrowd fans={people} beat={0} castShadow />
      </group>
      <JailDialogue y2={y2} y3={y3} />

      <RecYard />
      <GuardTower position={[-78.2, 0, 110.5]} />

      {/* the forecourt: pavers, a cruiser with flashing lights, the sheriff's transport bus */}
      <group>
        <mesh position={[-36, GROUND + 0.008, 75.5]} rotation={[-Math.PI / 2, 0, 0]} material={surface('pavers', 8, 4)} receiveShadow>
          <planeGeometry args={[46, 10]} />
        </mesh>
        <mesh position={[-8, GROUND + 0.008, 74]} rotation={[-Math.PI / 2, 0, 0]} material={surface('pavers', 3, 1)} receiveShadow>
          <planeGeometry args={[12, 5]} />
        </mesh>
        <mesh position={[-66, GROUND + 0.008, 77]} rotation={[-Math.PI / 2, 0, 0]} material={surface('pavers', 3, 2)} receiveShadow>
          <planeGeometry args={[12, 9]} />
        </mesh>
        <TransportBus position={[-48.5, 0, 75]} yaw={Math.PI / 2} />
        <Cruiser position={[-23, 0, 74.4]} yaw={-0.1} />
        {[[-52, 79.4], [-30, 79.4]].map(([x, z], i) => <group key={i} position={[x, GROUND, z]}><StreetLamp position={[0, 0, 0]} height={6.5} /></group>)}
      </group>
    </group>
  )
}

export default CountyJail
