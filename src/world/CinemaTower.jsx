// Four more floors above the Vision Cinema lobby, reached by a real elevator — 20 new themed
// auditoriums (cinema-3 .. cinema-22) on top of the original 2 (cinema-1, cinema-2), all wired
// into the same showtimes/screen system. Same footprint and partition-wall x-position as the
// ground floor (PART_X), so the building simply stacks: every floor is 9m tall (same height the
// ground floor's two auditoriums already use, so the proven seating/screen geometry needs no
// retuning), with a floor slab between each pair of floors carrying one hole for the elevator
// shaft. There is no second stairwell — the elevator is the only way up, which is a real
// simplification worth knowing about if this were a building code anywhere but a game.
import { useMemo } from 'react'
import * as THREE from 'three'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { surface, signatureMarble, getMaterials } from './materials.js'
import { SingleDoor } from './Door.jsx'
import { CeilingLight, Plant } from './furniture.jsx'
import { carById, carHole, carFloorY } from '../config/elevators.js'
import { ElevatorCar } from './ElevatorCar.jsx'
import { Auditorium, CINEMA, PART_X, TOWER_FLOOR_H, TOWER_FLOORS, ExitSign } from './Cinema.jsx'
import { SCREENS } from '../cinema/cinema.js'

const T = 0.4

// ---------------- the 20 new rooms, 4 per floor group of 3/3/7/7 ----------------
const FLOOR1 = [ // flagship floor: the gold/white lion room + 2 medium rooms
  { screenId: 'cinema-3', name: 'The Royal Reserve', wallColor: '#f2e7c9', seatColor: '#caa133', cupHolders: true, artKind: 'lion', big: true },
  { screenId: 'cinema-4', name: 'Emerald Room', wallColor: '#17382c', seatColor: '#0e5c3f', cupHolders: true },
  { screenId: 'cinema-5', name: 'Onyx Room', wallColor: '#1c1c20', seatColor: '#2b2b30', cupHolders: true },
]
const FLOOR2 = [ // flagship floor: the blue/silver room + 2 medium rooms, one feminine
  { screenId: 'cinema-6', name: 'Blue Steel', wallColor: '#1c2733', seatColor: '#24478c', cupHolders: true },
  { screenId: 'cinema-7', name: 'Rosewood Room', wallColor: '#3a2430', seatColor: '#8c3a56', cupHolders: true, feminine: true },
  { screenId: 'cinema-8', name: 'Teal Lounge', wallColor: '#163a3a', seatColor: '#1f8a86', cupHolders: true },
]
const FLOOR3 = [ // 7 boutique rooms
  { screenId: 'cinema-9', name: 'Burgundy Room', wallColor: '#2a1518', seatColor: '#5a1d24' },
  { screenId: 'cinema-10', name: 'Graphite Room', wallColor: '#232326', seatColor: '#3a3a3f' },
  { screenId: 'cinema-11', name: 'Lavender Room', wallColor: '#2e2740', seatColor: '#6a5a9c', feminine: true },
  { screenId: 'cinema-12', name: 'Navy Room', wallColor: '#161c2e', seatColor: '#1f2f5c' },
  { screenId: 'cinema-13', name: 'Copper Room', wallColor: '#2e2018', seatColor: '#8a5230' },
  { screenId: 'cinema-14', name: 'Jade Room', wallColor: '#16271f', seatColor: '#1f6a52' },
  { screenId: 'cinema-15', name: 'Blush Room', wallColor: '#3a2530', seatColor: '#c97b94', feminine: true },
]
const FLOOR4 = [ // 7 boutique rooms
  { screenId: 'cinema-16', name: 'Crimson Room', wallColor: '#2a1416', seatColor: '#8a1f2a' },
  { screenId: 'cinema-17', name: 'Slate Room', wallColor: '#20242b', seatColor: '#48505c' },
  { screenId: 'cinema-18', name: 'Lilac Room', wallColor: '#2b2338', seatColor: '#9a7fc9', feminine: true },
  { screenId: 'cinema-19', name: 'Amber Room', wallColor: '#2e2213', seatColor: '#b5742a' },
  { screenId: 'cinema-20', name: 'Forest Room', wallColor: '#16241a', seatColor: '#1f4a2a' },
  { screenId: 'cinema-21', name: 'Sapphire Room', wallColor: '#161f2e', seatColor: '#1f4a8a' },
  { screenId: 'cinema-22', name: 'Orchid Room', wallColor: '#301f33', seatColor: '#a14fa0', feminine: true },
]
export const TOWER_FLOOR_ROOMS = [null, FLOOR1, FLOOR2, FLOOR3, FLOOR4] // index 0 = ground (built separately in Cinema.jsx)
export const FLOOR_NAMES = ['Lobby · Auditoriums 1-2', 'The Royal Reserve · Emerald · Onyx', 'Blue Steel · Rosewood · Teal Lounge', 'Boutique Screens · 7 rooms', 'Boutique Screens · 7 rooms']

/** Evenly slice z0..z1 into `n` rooms with a small gap between each. */
export function sliceZ(z0, z1, n, gap = 0.3) {
  const span = z1 - z0 - gap * (n - 1)
  const w = span / n
  const out = []
  let z = z0
  for (let i = 0; i < n; i++) { out.push([z, z + w]); z += w + gap }
  return out
}

/** Rectangle pieces that tile a slab minus holes (same approach used for the Justice District's
 * multi-storey buildings) — lets the floor slab leave a gap for the elevator shaft. */
function slabPieces(ax0, ax1, az0, az1, holes) {
  const xs = [ax0, ax1]
  for (const h of holes) { if (h.x0 > ax0 && h.x0 < ax1) xs.push(h.x0); if (h.x1 > ax0 && h.x1 < ax1) xs.push(h.x1) }
  xs.sort((a, b) => a - b)
  const out = []
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i], b = xs[i + 1]
    if (b - a < 1e-6) continue
    const cuts = holes.filter((h) => h.x0 < b - 1e-6 && h.x1 > a + 1e-6).map((h) => [Math.max(az0, h.z0), Math.min(az1, h.z1)]).sort((p, q) => p[0] - q[0])
    let z = az0
    for (const [c0, c1] of cuts) { if (c0 > z + 1e-6) out.push({ x0: a, x1: b, z0: z, z1: c0 }); z = Math.max(z, c1) }
    if (z < az1 - 1e-6) out.push({ x0: a, x1: b, z0: z, z1: az1 })
  }
  return out
}

function FloorSlab({ y, hole }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#17151a', roughness: 0.95 }), [])
  const pieces = useMemo(() => slabPieces(CINEMA.x0 + 0.03, CINEMA.x1 - 0.03, CINEMA.z0 + 0.03, CINEMA.z1 - 0.03, [hole]), [hole])
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {pieces.map((p, i) => <CuboidCollider key={i} args={[(p.x1 - p.x0) / 2, 0.15, (p.z1 - p.z0) / 2]} position={[(p.x0 + p.x1) / 2, y - 0.15, (p.z0 + p.z1) / 2]} />)}
      </RigidBody>
      {pieces.map((p, i) => <mesh key={i} material={mat} position={[(p.x0 + p.x1) / 2, y - 0.15, (p.z0 + p.z1) / 2]}><boxGeometry args={[p.x1 - p.x0, 0.3, p.z1 - p.z0]} /></mesh>)}
    </group>
  )
}

function DoorNumber({ position, text }) {
  const m = getMaterials()
  return (
    <mesh position={position} rotation={[0, Math.PI / 2, 0]} material={m.blackSteel}>
      <boxGeometry args={[1.5, 0.4, 0.04]} />
    </mesh>
  )
}

/** One upper floor: a short corridor along the partition wall (with the elevator landing) and
 * the floor's rooms behind doors cut into that same wall — the same pattern the ground floor
 * uses between its lobby and its 2 auditoriums, generalised to N rooms. */
function TowerFloor({ floorY, rooms, car }) {
  const m = getMaterials()
  const { x0, x1, z0, z1 } = CINEMA
  const plaster = surface('plaster', 4, 2, { color: '#242025' })
  const corridorFloor = signatureMarble(3, 6)
  const roomX0 = x0 + T, roomX1 = PART_X - 0.15
  const slices = useMemo(() => sliceZ(z0 + T, z1 - T, rooms.length), [z0, z1, rooms.length])
  const doors = rooms.map((r, i) => ({ z: slices[i][0] + 0.75, room: r, slice: slices[i] }))
  const DW = 1.3, DH = 2.5
  const wallH = TOWER_FLOOR_H
  const partSegs = []
  let cur = z0 + T
  for (const d of [...doors].sort((p, q) => p.z - q.z)) { partSegs.push([cur, d.z - DW / 2]); cur = d.z + DW / 2 }
  partSegs.push([cur, z1 - T])

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {partSegs.map(([a, b], i) => b > a && <CuboidCollider key={i} args={[0.15, wallH / 2, (b - a) / 2]} position={[PART_X, floorY + wallH / 2, (a + b) / 2]} />)}
        {doors.map((d, i) => <CuboidCollider key={'h' + i} args={[0.15, (wallH - DH) / 2, DW / 2]} position={[PART_X, floorY + DH + (wallH - DH) / 2, d.z]} />)}
      </RigidBody>
      {partSegs.map(([a, b], i) => b > a && <mesh key={i} position={[PART_X, floorY + wallH / 2, (a + b) / 2]} material={plaster} receiveShadow><boxGeometry args={[0.3, wallH, b - a]} /></mesh>)}
      {doors.map((d, i) => <mesh key={'hv' + i} position={[PART_X, floorY + DH + (wallH - DH) / 2, d.z]} material={plaster}><boxGeometry args={[0.3, wallH - DH, DW]} /></mesh>)}
      {doors.map((d, i) => (
        <group key={'d' + i}>
          <SingleDoor id={'aud-door-' + d.room.screenId} hinge={[PART_X + 0.16, floorY, d.z - DW / 2 + 0.05]} width={DW - 0.1} height={DH - 0.05} baseYaw={-Math.PI / 2} openAngle={-1.5} label={d.room.name + ' door'} />
          <DoorNumber position={[PART_X + 0.16, floorY + DH + 0.45, d.z]} text={d.room.name.toUpperCase()} />
        </group>
      ))}

      {/* corridor: floor, a couple of ceiling lights, a plant, an exit sign, and the elevator landing */}
      <mesh position={[(PART_X + x1) / 2, floorY + 0.006, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={corridorFloor} receiveShadow><planeGeometry args={[x1 - PART_X - T, z1 - z0 - T * 2]} /></mesh>
      {[-18, -7, 4].map((z) => <CeilingLight key={z} position={[-13.5, floorY + wallH - 0.3, z]} size={[1.2, 1.2]} intensity={9} color="#ffe2bf" />)}
      <Plant position={[-10.9, floorY, -20.8]} scale={1.1} />
      <ExitSign position={[x1 - 0.42, floorY + 3.3, -7]} yaw={-Math.PI / 2} />

      {rooms.map((r) => (
        <Auditorium
          key={r.screenId}
          screenId={r.screenId}
          x0={roomX0} x1={roomX1}
          z0={slices[rooms.indexOf(r)][0]} z1={slices[rooms.indexOf(r)][1]}
          entry="z0"
          floorY={floorY}
          height={wallH}
          rows={r.big ? 7 : 5}
          rowDepth={r.big ? 1.75 : 1.6}
          firstRow={r.big ? 6.4 : 5.0}
          corridor={r.big ? 1.5 : 0.9}
          aisle={r.big ? 1.2 : 0.7}
          spacing={r.big ? 1.1 : 0.95}
          title={r.name}
          seatColor={r.seatColor}
          wallColor={r.wallColor}
          cupHolders={!!r.cupHolders}
          artKind={r.artKind}
        />
      ))}
    </group>
  )
}

/** The whole tower above the ground floor: 4 floors, 20 rooms, one elevator serving all 5. */
export function CinemaTowerFloors() {
  const car = carById('cinema')
  if (!car) return null
  const hole = carHole(car)
  return (
    <group>
      <ElevatorCar cfg={car} />
      {TOWER_FLOOR_ROOMS.map((rooms, f) => {
        if (f === 0 || !rooms) return null
        const y = carFloorY(car, f)
        return (
          <group key={f}>
            <FloorSlab y={y} hole={hole} />
            <TowerFloor floorY={y} rooms={rooms} car={car} />
          </group>
        )
      })}
    </group>
  )
}
