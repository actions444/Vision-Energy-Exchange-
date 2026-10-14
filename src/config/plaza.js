// Vision Storms Plaza: a three-floor commercial building. Everything about its rooms lives here
// so the 3D building, the music zones and the rental system all agree on IDs and positions.
//
// Local plan coordinates: u runs west->east (0..28), v runs south->north (0..28).
// The street entrance is on the east facade (u = 28) facing the avenue.

export const PLAZA = { x0: -44, x1: -16, z0: 34, z1: 62, floors: 3, floorH: 4.2, base: 0.15, code: 'VSP' }
export const P = {
  X: (u) => PLAZA.x0 + u,
  Z: (v) => PLAZA.z0 + v,
  Y: (floor) => PLAZA.base + floor * PLAZA.floorH,
}

// Corridor band and the vertical core
export const CORRIDOR = { v0: 10, v1: 18 }
export const ELEVATOR = { u0: 0.3, u1: 3.0, v0: 18, v1: 21, doorU0: 0.6, doorU1: 2.6, doorH: 2.4 }
export const STAIRS = [
  // F1 -> F2 rises toward the west; F2 -> F3 rises toward the east
  { fromFloor: 0, u0: 3, u1: 10, v0: 15.6, v1: 17.6, up: 'west' },
  { fromFloor: 1, u0: 3, u1: 10, v0: 10.4, v1: 12.4, up: 'east' },
]
export const DOOR_U = 20 // room doors on the corridor walls (centre)

/**
 * The six furnished rooms. `side` is which side of the corridor the room is on.
 * `rentable` rooms appear in the rental system by default (the owner can add more).
 */
export const PLAZA_ROOMS = [
  { id: 'VSP-101', floor: 0, side: 'south', name: 'Vision Storms Bistro', kind: 'Restaurant', playlist: 'pl-bistro', occupancy: 60 },
  { id: 'VSP-102', floor: 0, side: 'north', name: 'Storms Threads', kind: 'Clothing store', playlist: 'pl-threads', occupancy: 30 },
  { id: 'VSP-201', floor: 1, side: 'south', name: 'Screening Room', kind: 'Movie theater', playlist: 'pl-screening', occupancy: 32, rentable: true },
  { id: 'VSP-202', floor: 1, side: 'north', name: 'Studio 202', kind: 'Music & podcast studio', playlist: 'pl-studio', occupancy: 8, rentable: true },
  { id: 'VSP-301', floor: 2, side: 'south', name: 'Boardroom', kind: 'Conference room', playlist: 'pl-conference', occupancy: 12, rentable: true },
  { id: 'VSP-302', floor: 2, side: 'north', name: 'Skyline Suite', kind: 'Private rental suite', playlist: 'pl-suite', occupancy: 6, rentable: true },
]

/** World-space bounds [[x,y,z],[x,y,z]] of a room (for music zones and access checks). */
export function roomBounds(room) {
  const y0 = P.Y(room.floor) - 0.5
  const y1 = P.Y(room.floor) + PLAZA.floorH - 0.4
  const v0 = room.side === 'south' ? 0.3 : CORRIDOR.v1
  const v1 = room.side === 'south' ? CORRIDOR.v0 : 27.7
  const u0 = room.side === 'north' ? ELEVATOR.u1 + 0.2 : 0.3
  return [[P.X(u0), y0, P.Z(v0)], [P.X(27.7), y1, P.Z(v1)]]
}

export const roomById = (id) => PLAZA_ROOMS.find((r) => r.id === id)
