import { PLAZA, P, PLAZA_ROOMS, ELEVATOR, roomBounds } from './plaza.js'

// Music zones. Each entry is a 3D trigger volume (axis-aligned box, metres) with a default
// playlist. When an avatar is inside several zones (e.g. a store inside a mall), the
// smallest zone wins, so nested rooms just work.
//
// To add a room: add an entry here (and build its geometry). It appears in the Music admin
// automatically, where any playlist can be assigned to it.
export const ZONES = [
  {
    id: 'streets',
    name: 'City Streets',
    kind: 'Outdoors',
    bounds: [[-130, -10, -130], [130, 80, 130]],
    playlist: 'pl-streets',
    spawn: [0, 0.3, 10],
    yaw: 0,
  },
  {
    id: 'gallery',
    name: 'Reign Gallery',
    kind: 'Gallery',
    bounds: [[-14, -1, -52], [14, 9.6, -32]],
    playlist: 'pl-gallery',
    spawn: [0, 0.3, -35],
    yaw: 0,
  },
  {
    id: 'records',
    name: 'Storms Records',
    kind: 'Music store',
    bounds: [[10, -1, -20], [30, 6.6, 6]],
    playlist: 'pl-records',
    spawn: [13, 0.3, -7],
    yaw: -Math.PI / 2,
  },
  {
    id: 'lounge',
    name: 'Neon Lounge',
    kind: 'Club',
    bounds: [[10, -1, 32], [32, 6.6, 56]],
    playlist: 'pl-lounge',
    spawn: [13, 0.3, 44],
    yaw: -Math.PI / 2,
  },
]

// Vision Storms Cinema: lobby (light music) and two auditoriums (the movie is the sound)
ZONES.push(
  { id: 'cinema', name: 'Vision Storms Cinema', kind: 'Cinema lobby', bounds: [[-34, -1, -22], [-10, 9.4, 8]], playlist: 'pl-screening', spawn: [-12, 0.3, -7], yaw: -Math.PI / 2 },
  { id: 'cinema-1', name: 'Auditorium 1', kind: 'Movie theater', bounds: [[-33.6, -1, -21.6], [-17.15, 9.4, -7.15]], playlist: null, spawn: [-18.2, 0.3, -20.85], yaw: -Math.PI / 2 },
  { id: 'cinema-2', name: 'Auditorium 2', kind: 'Movie theater', bounds: [[-33.6, -1, -6.85], [-17.15, 9.4, 7.6]], playlist: null, spawn: [-18.2, 0.3, 6.85], yaw: -Math.PI / 2 },
)

// Vision Storms Plaza: the building (lobby, corridors, stairs) plus one zone per room
ZONES.push({
  id: 'plaza',
  name: 'Vision Storms Plaza',
  kind: 'Lobby & corridors',
  bounds: [[PLAZA.x0, -1, PLAZA.z0], [PLAZA.x1, P.Y(PLAZA.floors), PLAZA.z1]],
  playlist: 'pl-lobby',
  spawn: [PLAZA.x1 - 3, 0.3, (PLAZA.z0 + PLAZA.z1) / 2],
  yaw: Math.PI / 2,
})
// the elevator car (all floors of the shaft): soft optional music while riding
ZONES.push({
  id: 'plaza-elevator',
  name: 'Plaza elevator',
  kind: 'Elevator',
  bounds: [[P.X(ELEVATOR.u0), -1, P.Z(ELEVATOR.v0)], [P.X(ELEVATOR.u1), P.Y(PLAZA.floors), P.Z(ELEVATOR.v1)]],
  playlist: 'pl-elevator',
  spawn: [P.X(1.6), 0.3, P.Z(16.5)],
  yaw: 0,
})
for (const r of PLAZA_ROOMS) {
  const b = roomBounds(r)
  ZONES.push({
    id: r.id,
    name: `${r.name} (${r.id})`,
    kind: `${r.kind} · floor ${r.floor + 1}`,
    bounds: b,
    playlist: r.playlist,
    spawn: [P.X(20), P.Y(r.floor) + 0.2, r.side === 'south' ? P.Z(8.6) : P.Z(19.4)],
    yaw: r.side === 'south' ? 0 : Math.PI,
  })
}

export const zoneById = (id) => ZONES.find((z) => z.id === id)
