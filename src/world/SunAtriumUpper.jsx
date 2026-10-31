import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Block } from './jobkit.jsx'
import DinoSkeleton from './DinoSkeletons.jsx'
import { SUN_DECK_Y } from '../config/sunAtrium.js'

// Second floor of the Sun Auditorium Museum: a gallery ring around an open well (so you see down to the
// ground floor), with brass railings, one flight of stairs, and an elevator that runs between the floors.
const X0 = 124, X1 = 144, Z0 = -42, Z1 = 2
const FLOOR_Y = SUN_DECK_Y
const UPPER_Y = FLOOR_Y + 6 // second floor level
const WELL = { x0: 128, x1: 140, z0: -36, z1: -8 }
const STAIR = { x0: 124, x1: 126, z0: -42, z1: -37.2, steps: 12 } // climbs toward +z
const SHAFT = { x0: 140, x1: 142.5, z0: -8, z1: -5.5 }
const BRASS = new THREE.MeshStandardMaterial({ color: '#c9a24a', roughness: 0.3, metalness: 0.6 })
const CAR = new THREE.MeshStandardMaterial({ color: '#dfe6ee', roughness: 0.3, metalness: 0.4 })
const STEP = new THREE.MeshStandardMaterial({ color: '#f3efe6', roughness: 0.3 })
const SLAB = new THREE.MeshStandardMaterial({ color: '#e7e1d2', roughness: 0.4 })

const inRect = (x, z, r) => x >= r.x0 && x < r.x1 && z >= r.z0 && z < r.z1

// Gallery floor as merged row runs, leaving the well, the stair opening and the elevator shaft open.
function galleryRuns() {
  const runs = []
  for (let z = Z0; z < Z1; z++) {
    let start = null
    for (let x = X0; x <= X1; x++) {
      const hole = x < X1 && (inRect(x, z, WELL) || inRect(x, z, STAIR) || inRect(x, z, SHAFT))
      const open = x < X1 && !hole
      if (open && start === null) start = x
      if (!open && start !== null) { runs.push({ x0: start, x1: x, z0: z, z1: z + 1 }); start = null }
    }
  }
  return runs
}

function Stair() {
  const { x0, x1, z0, z1, steps } = STAIR
  const rise = (UPPER_Y - FLOOR_Y) / steps
  const run = (z1 - z0) / steps
  const cx = (x0 + x1) / 2
  return (
    <group>
      {Array.from({ length: steps }, (_, i) => (
        <Block key={i} position={[cx, FLOOR_Y + (i + 1) * rise - 0.2, z0 + (i + 0.5) * run]} size={[x1 - x0, 0.4, run]} material={STEP} collide />
      ))}
    </group>
  )
}

// Elevator: a glass car on a rail, moving between the two floors (doors open at each stop).
function Elevator() {
  const car = useRef()
  const cx = (SHAFT.x0 + SHAFT.x1) / 2, cz = (SHAFT.z0 + SHAFT.z1) / 2
  const t = useRef(0)
  useFrame((_, dt) => {
    if (!car.current) return
    t.current += dt
    // 4 s at the ground, 3 s travel, 4 s at the top, 3 s back
    const cycle = t.current % 14
    let y = FLOOR_Y
    if (cycle < 4) y = FLOOR_Y
    else if (cycle < 7) y = FLOOR_Y + (UPPER_Y - FLOOR_Y) * ((cycle - 4) / 3)
    else if (cycle < 11) y = UPPER_Y
    else y = UPPER_Y - (UPPER_Y - FLOOR_Y) * ((cycle - 11) / 3)
    car.current.position.y = y + 1.3
  })
  return (
    <group ref={car} position={[cx, FLOOR_Y, cz]}>
      <mesh position={[0, 1.2, 0]} material={CAR}><boxGeometry args={[2.2, 2.4, 2.2]} /></mesh>
      <mesh position={[0, 2.5, 0]} material={BRASS}><boxGeometry args={[2.3, 0.08, 2.3]} /></mesh>
    </group>
  )
}

function Railings() {
  // brass rail around the open well at waist height on the second floor
  const { x0, x1, z0, z1 } = WELL
  const y = UPPER_Y + 1.1
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
  return (
    <group>
      <mesh position={[cx, y, z0]} material={BRASS}><boxGeometry args={[w, 0.08, 0.08]} /></mesh>
      <mesh position={[cx, y, z1]} material={BRASS}><boxGeometry args={[w, 0.08, 0.08]} /></mesh>
      <mesh position={[x0, y, cz]} material={BRASS}><boxGeometry args={[0.08, 0.08, d]} /></mesh>
      <mesh position={[x1, y, cz]} material={BRASS}><boxGeometry args={[0.08, 0.08, d]} /></mesh>
      {Array.from({ length: 24 }, (_, i) => {
        const f = i / 24
        return [
          <mesh key={'a' + i} position={[x0 + w * f, UPPER_Y + 0.55, z0]} material={BRASS}><boxGeometry args={[0.05, 1.1, 0.05]} /></mesh>,
          <mesh key={'b' + i} position={[x0 + w * f, UPPER_Y + 0.55, z1]} material={BRASS}><boxGeometry args={[0.05, 1.1, 0.05]} /></mesh>,
        ]
      })}
    </group>
  )
}

export default function SunAtriumUpper() {
  const runs = useMemo(() => galleryRuns(), [])
  return (
    <group name="sun-atrium-upper">
      {runs.map((r, i) => (
        <Block key={i} position={[(r.x0 + r.x1) / 2, UPPER_Y - 0.15, (r.z0 + r.z1) / 2]} size={[r.x1 - r.x0, 0.3, r.z1 - r.z0]} material={SLAB} collide />
      ))}
      <Stair />
      <Railings />
      <Elevator />
      <DinoSkeleton position={[134, UPPER_Y, -39]} yaw={0.2} scale={0.7} />
    </group>
  )
}
