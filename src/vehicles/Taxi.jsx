// NPC taxi service: a couple of cabs with an actual job - wait at a stand, get hailed, drive the
// player to a chosen landmark, drop them off, drive back. Deliberately lightweight: a kinematic
// cab (no Rapier vehicle controller, no road network) that lerps straight toward its target and
// turns to face the way it's going. Good enough to be a real "job" for an NPC car without the
// risk of touching the player's physics-based drivable vehicles.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { playerState, registerInteractable } from '../state/runtime.js'
import { nightLit } from '../state/environment.js'
import { useStore } from '../state/store.js'
import { useJobs } from '../state/jobs.js'
import { getMaterials } from '../world/materials.js'
import { TAXI_STANDS, TAXI_SPEED, fareFor } from '../config/taxi.js'

// Cheap body, same proportions as the background-traffic taxi style.
const STYLE = { len: 4.8, wid: 1.85, low: 0.62, cab: 0.48, cabLen: 2.3, cabX: -0.2 }

/** Live cab list (debugging/tests), mirroring trafficState in Traffic.jsx. */
export const taxiState = { cabs: [] }

function makeCab(stand) {
  return {
    id: stand.id,
    stand,
    pos: new THREE.Vector3(...stand.spawn),
    yaw: 0,
    phase: 'parked', // parked | driving | returning
    destId: null,
    destSpawn: null,
    riderBound: false,
  }
}

export default function Taxis() {
  const cabs = useMemo(() => TAXI_STANDS.map(makeCab), [])
  taxiState.cabs = cabs

  return (
    <>
      {cabs.map((cab) => <Cab key={cab.id} cab={cab} />)}
    </>
  )
}

function Cab({ cab }) {
  const group = useRef()
  const wheels = useRef([])
  const spin = useRef(0)

  // Hail interactable lives at the stand; registered once, but checks phase live so the
  // prompt and behavior stay correct without ever re-registering.
  useEffect(() => registerInteractable('taxi-' + cab.id, {
    position: () => cab.pos,
    radius: 2.6,
    label: () => (cab.phase === 'parked' ? 'Hail a taxi' : 'Taxi on a trip'),
    onInteract: () => {
      if (cab.phase !== 'parked') { useStore.getState().showToast('This cab is already on a trip.'); return }
      if (useStore.getState().panel || playerState.vehicle || playerState.seated) return
      useStore.getState().openPanel({ type: 'taxi', standId: cab.id })
    },
  }), [cab]) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1)
    const g = group.current
    if (cab.phase === 'driving' || cab.phase === 'returning') {
      const target = cab.phase === 'driving' ? cab.destSpawn : cab.stand.spawn
      const tx = target[0], tz = target[2]
      const dx = tx - cab.pos.x, dz = tz - cab.pos.z
      const dist = Math.hypot(dx, dz)
      if (dist < 0.5) {
        if (cab.phase === 'driving') {
          // arrived: drop the rider off right here, then head home empty
          if (playerState.vehicle?.id === 'taxi-' + cab.id) {
            playerState.vehicle = null
            playerState.sit = 0
            playerState.teleport = [cab.pos.x, 0.3, cab.pos.z]
            useStore.getState().showToast('You’ve arrived.')
          }
          cab.phase = 'returning'
        } else {
          cab.pos.set(cab.stand.spawn[0], cab.stand.spawn[1], cab.stand.spawn[2])
          cab.phase = 'parked'
        }
      } else {
        const step = Math.min(dist, TAXI_SPEED * dt)
        cab.pos.x += (dx / dist) * step
        cab.pos.z += (dz / dist) * step
        cab.yaw = Math.atan2(-dz, dx) + Math.PI / 2
        spin.current += step / 0.34
      }
      // carry the rider along while driving to the destination
      if (cab.phase === 'driving' && playerState.vehicle?.id === 'taxi-' + cab.id) {
        playerState.position.set(cab.pos.x, 0.62, cab.pos.z)
        playerState.yaw = cab.yaw
      }
    }
    if (g) {
      g.position.set(cab.pos.x, 0, cab.pos.z)
      g.rotation.y = cab.yaw
    }
    for (const w of wheels.current) if (w) w.rotation.z = -spin.current
  })

  const m = getMaterials()
  const paint = m.shared('taxiPaint', () => new THREE.MeshStandardMaterial({ color: '#f2c230', roughness: 0.28, metalness: 0.6 }))
  const glass = m.shared('taxiGlass', () => new THREE.MeshStandardMaterial({ color: '#aab4c2', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.3 }))
  const tire = m.shared('tire', () => new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.9 }))
  const head = m.shared('taxiHead', () => nightLit(new THREE.MeshStandardMaterial({ color: '#e9eef5', emissive: '#fff4dc' }), 3, 0.2))
  const tail = m.shared('taxiTail', () => nightLit(new THREE.MeshStandardMaterial({ color: '#4a0608', emissive: '#ff2020' }), 1.8, 0.3))
  const sign = m.shared('taxiSign', () => nightLit(new THREE.MeshStandardMaterial({ color: '#fff7d6', emissive: '#ffe08a' }), 2, 0.4))

  const s = STYLE
  const Lh = s.len / 2, Wh = s.wid / 2, y0 = 0.25
  return (
    <group ref={group} userData={{ noBatch: true }}>
      <mesh position={[0, y0 + s.low / 2, 0]} material={paint} castShadow><boxGeometry args={[s.len, s.low, s.wid]} /></mesh>
      <mesh position={[s.cabX, y0 + s.low + s.cab / 2, 0]} material={paint} castShadow><boxGeometry args={[s.cabLen, s.cab, s.wid - 0.14]} /></mesh>
      <mesh position={[s.cabX, y0 + s.low + s.cab * 0.55, 0]} material={glass}><boxGeometry args={[s.cabLen + 0.02, s.cab * 0.6, s.wid - 0.1]} /></mesh>
      {[-1, 1].map((k) => (
        <group key={k}>
          <mesh position={[Lh + 0.01, y0 + s.low * 0.7, k * (Wh - 0.3)]} material={head}><boxGeometry args={[0.02, 0.12, 0.38]} /></mesh>
          <mesh position={[-Lh - 0.01, y0 + s.low * 0.75, k * (Wh - 0.2)]} material={tail}><boxGeometry args={[0.02, 0.12, 0.3]} /></mesh>
        </group>
      ))}
      <mesh position={[s.cabX, y0 + s.low + s.cab + 0.12, 0]} material={sign}><boxGeometry args={[0.25, 0.22, 0.7]} /></mesh>
      {[[Lh - 0.85, -Wh + 0.1], [Lh - 0.85, Wh - 0.1], [-Lh + 0.85, -Wh + 0.1], [-Lh + 0.85, Wh - 0.1]].map(([x, z], i) => (
        <group key={i} position={[x, 0.34, z]} ref={(el) => (wheels.current[i] = el)}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={tire}><cylinderGeometry args={[0.34, 0.34, 0.24, 14]} /></mesh>
        </group>
      ))}
    </group>
  )
}

/** Called from TaxiPanel once the rider picks a destination. Charges the fare, then sends the
 * cab (and the rider, who boards immediately - they're standing right at the stand) on its way. */
export function hailTaxi(standId, destId, destSpawn) {
  const cab = taxiState.cabs.find((c) => c.id === standId)
  if (!cab || cab.phase !== 'parked') return false
  const fare = fareFor(cab.stand.spawn, destSpawn)
  if (!useJobs.getState().spend(fare, 'taxi', `Taxi to ${destId}`)) return false
  cab.destId = destId
  cab.destSpawn = destSpawn
  cab.phase = 'driving'
  playerState.vehicle = { id: 'taxi-' + cab.id, exit: () => exitTaxi(cab) }
  playerState.sit = 1
  playerState.sitHeight = 0.42
  return true
}

function exitTaxi(cab) {
  playerState.vehicle = null
  playerState.sit = 0
  playerState.teleport = [cab.pos.x, 0.3, cab.pos.z]
  if (cab.phase === 'driving') cab.phase = 'returning'
  return true
}
