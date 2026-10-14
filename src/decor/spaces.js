// Decoratable spaces: where furniture may be placed (rectangles minus keep-out areas), which walls
// can be painted or papered (with door openings left clear), and the floor area for flooring.
// Every space has the same ID as its room/property, so permissions follow the room's rental.
import { PLAZA, P, CORRIDOR, ELEVATOR, PLAZA_ROOMS, DOOR_U } from '../config/plaza.js'

const CEIL = PLAZA.floorH - 0.3
const S0 = 0.3, S1 = CORRIDOR.v0 - 0.075
const N0 = CORRIDOR.v1 + 0.075, N1 = 27.7
const DADO = 0.9 // exterior walls are glass above this height

const xz = (u, v) => [P.X(u), P.Z(v)]

function plazaSpace(room) {
  const f = room.floor
  const south = room.side === 'south'
  const v0 = south ? S0 : N0, v1 = south ? S1 : N1
  const corridorV = south ? v1 : v0
  const door = { at: P.X(DOOR_U), width: 1.25, height: 2.4 }
  const notch = south ? [] : [[P.X(0), P.X(ELEVATOR.u1 + 0.2), P.Z(ELEVATOR.v0 - 0.2), P.Z(ELEVATOR.v1 + 0.2)]]
  const floors = south
    ? [[P.X(0.3), P.X(27.7), P.Z(v0), P.Z(v1)]]
    : [[P.X(ELEVATOR.u1 + 0.2), P.X(27.7), P.Z(v0), P.Z(v1)], [P.X(0.3), P.X(ELEVATOR.u1 + 0.2), P.Z(ELEVATOR.v1 + 0.2), P.Z(v1)]]
  // walls: [x0, z0] → [x1, z1], height, openings along the wall, normal pointing into the room
  const walls = [
    { a: xz(south ? 0.3 : ELEVATOR.u1 + 0.2, corridorV), b: xz(27.7, corridorV), h: CEIL, openings: [door], normal: [0, south ? -1 : 1] },
    { a: xz(0.3, south ? v0 : v1), b: xz(27.7, south ? v0 : v1), h: DADO, openings: [], normal: [0, south ? 1 : -1] },
    { a: xz(0.3, south ? v0 : ELEVATOR.v1 + 0.2), b: xz(0.3, south ? v1 : v1), h: DADO, openings: [], normal: [1, 0] },
    { a: xz(27.7, v0), b: xz(27.7, v1), h: DADO, openings: [], normal: [-1, 0] },
  ]
  return {
    id: room.id,
    name: `${room.name} (${room.id})`,
    floorY: P.Y(f),
    ceiling: CEIL,
    rect: [P.X(0.3) + 0.15, P.X(27.7) - 0.15, P.Z(v0) + 0.15, P.Z(v1) - 0.15],
    keepOut: [...notch, [P.X(DOOR_U - 1.2), P.X(DOOR_U + 1.2), P.Z(corridorV) - (south ? 1.4 : 0), P.Z(corridorV) + (south ? 0 : 1.4)]], // doorway swing
    floors,
    walls,
    door: room.id,
  }
}

export const DECOR_SPACES = PLAZA_ROOMS.map(plazaSpace)
export const spaceById = (id) => DECOR_SPACES.find((s) => s.id === id) || null

/** The space a foot position is in. */
export function spaceAt(p) {
  for (const s of DECOR_SPACES) {
    const [x0, x1, z0, z1] = s.rect
    if (p.x > x0 - 0.3 && p.x < x1 + 0.3 && p.z > z0 - 0.3 && p.z < z1 + 0.3 && Math.abs(p.y - s.floorY) < 1.6) return s
  }
  return null
}

/** Is an item with footprint [w, , d] at (x, z) rotated by yaw fully inside the space? */
export function fits(space, item, x, z, yaw) {
  const [w, , d] = item.size
  const c = Math.cos(yaw), s = Math.sin(yaw)
  const corners = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([lx, lz]) => [x + lx * c + lz * s, z - lx * s + lz * c])
  const [x0, x1, z0, z1] = space.rect
  if (!corners.every(([cx, cz]) => cx >= x0 && cx <= x1 && cz >= z0 && cz <= z1)) return false
  if (item.flat) return true // rugs can go anywhere on the floor
  const minX = Math.min(...corners.map((q) => q[0])), maxX = Math.max(...corners.map((q) => q[0]))
  const minZ = Math.min(...corners.map((q) => q[1])), maxZ = Math.max(...corners.map((q) => q[1]))
  return !space.keepOut.some(([a, b, c2, d2]) => maxX > a && minX < b && maxZ > c2 && minZ < d2)
}
