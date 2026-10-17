import { PLAZA, P, PLAZA_ROOMS, ELEVATOR, roomBounds } from './plaza.js'
import { CARS, carTop, carHallPoint } from './elevators.js'

// Cinema tower geometry, duplicated here (not imported) on purpose: world/Cinema.jsx and
// world/CinemaTower.jsx already import each other, and this config module is itself imported
// very early in the module graph, so pulling from either of them here risks a circular-import
// dead zone. These numbers must match CINEMA / PART_X / TOWER_FLOOR_H in world/Cinema.jsx and
// the per-floor room lists in world/CinemaTower.jsx.
const TOWER_CINEMA = { x0: -34, x1: -10, z0: -22, z1: 8, floor: 0.15 }
const TOWER_PART_X = -17
const TOWER_FLOOR_H = 9
const TOWER_ROOMS_BY_FLOOR = [
  null, // floor 0 = ground, handled by the cinema-1/cinema-2 zones above
  [['cinema-3', 'The Royal Reserve'], ['cinema-4', 'Emerald Room'], ['cinema-5', 'Onyx Room']],
  [['cinema-6', 'Blue Steel'], ['cinema-7', 'Rosewood Room'], ['cinema-8', 'Teal Lounge']],
  [['cinema-9', 'Burgundy Room'], ['cinema-10', 'Graphite Room'], ['cinema-11', 'Lavender Room'], ['cinema-12', 'Navy Room'], ['cinema-13', 'Copper Room'], ['cinema-14', 'Jade Room'], ['cinema-15', 'Blush Room']],
  [['cinema-16', 'Crimson Room'], ['cinema-17', 'Slate Room'], ['cinema-18', 'Lilac Room'], ['cinema-19', 'Amber Room'], ['cinema-20', 'Forest Room'], ['cinema-21', 'Sapphire Room'], ['cinema-22', 'Orchid Room']],
]
function towerSliceZ(z0, z1, n, gap = 0.3) {
  const w = (z1 - z0 - gap * (n - 1)) / n
  const out = []
  let z = z0
  for (let i = 0; i < n; i++) { out.push([z, z + w]); z += w + gap }
  return out
}

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
    bounds: [[-400, -10, -130], [130, 80, 130]],
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
    name: 'Vision Music Lounge',
    kind: 'Club',
    bounds: [[10, -1, 32], [32, 6.6, 56]],
    playlist: 'pl-lounge',
    spawn: [13, 0.3, 44],
    yaw: -Math.PI / 2,
  },
]

// Vision Storms Cinema: lobby (light music) and two auditoriums (the movie is the sound)
ZONES.push(
  { id: 'cinema', name: 'Vision Cinema', kind: 'Cinema lobby', bounds: [[-34, -1, -22], [-10, 9.4, 8]], playlist: 'pl-screening', spawn: [-12, 0.3, -7], yaw: -Math.PI / 2 },
  { id: 'cinema-1', name: 'Auditorium 1', kind: 'Movie theater', bounds: [[-33.6, -1, -21.6], [-17.15, 9.4, -7.15]], playlist: null, spawn: [-18.2, 0.3, -20.85], yaw: -Math.PI / 2 },
  { id: 'cinema-2', name: 'Auditorium 2', kind: 'Movie theater', bounds: [[-33.6, -1, -6.85], [-17.15, 9.4, 7.6]], playlist: null, spawn: [-18.2, 0.3, 6.85], yaw: -Math.PI / 2 },
)

// The 4 upper floors of the Vision Cinema tower: one corridor/landing zone per floor (same
// "pl-screening" lounge playlist as the ground lobby) and one zone per auditorium (null — the
// movie is the sound, same as cinema-1/cinema-2). Without these, the upper floors would fall
// through to whichever zone's bounds happen to reach that height (the city streets zone reaches
// up to y=80), which is the wrong music entirely.
for (let f = 1; f < TOWER_ROOMS_BY_FLOOR.length; f++) {
  const rooms = TOWER_ROOMS_BY_FLOOR[f]
  if (!rooms) continue
  const y0 = TOWER_CINEMA.floor + f * TOWER_FLOOR_H, y1 = y0 + TOWER_FLOOR_H - 0.3
  ZONES.push({
    id: `cinema-floor-${f + 1}`,
    name: `Vision Cinema · Floor ${f + 1}`,
    kind: 'Cinema corridor',
    bounds: [[TOWER_CINEMA.x0, y0 - 0.5, TOWER_CINEMA.z0], [TOWER_CINEMA.x1, y1, TOWER_CINEMA.z1]],
    playlist: 'pl-screening',
    spawn: [-13.5, y0 + 0.3, 1],
    yaw: Math.PI,
  })
  const slices = towerSliceZ(TOWER_CINEMA.z0 + 0.4, TOWER_CINEMA.z1 - 0.4, rooms.length)
  rooms.forEach(([screenId, name], i) => {
    const [z0, z1] = slices[i]
    ZONES.push({
      id: screenId,
      name: `${name} (${screenId})`,
      kind: 'Movie theater',
      bounds: [[TOWER_CINEMA.x0 + 0.4, y0 - 0.5, z0], [TOWER_PART_X - 0.15, y1, z1]],
      playlist: null,
      spawn: [TOWER_CINEMA.x0 + 7, y0 + 0.3, (z0 + z1) / 2],
      yaw: -Math.PI / 2,
    })
  })
}

// Vision Storms Plaza: the building (lobby, corridors, stairs) plus one zone per room
ZONES.push({
  id: 'plaza',
  name: 'Vision Storms Energy Exchanges Plaza',
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

// Vision Storms Justice & Rehabilitation District — Phase 1: Police HQ + Cell Block A.
// Footprint x[18,56] z[80,112]; one indoor zone covers the hall and the cell block.
ZONES.push({
  id: 'police-hq',
  name: 'Police Headquarters',
  kind: 'Civic · Justice District',
  bounds: [[18, -1, 80], [56, 16.4, 112]], // three floors
  playlist: 'pl-lobby',
  spawn: [37, 0.3, 83],
  yaw: 0,
})

ZONES.push({
  id: 'county-jail',
  name: 'County Jail',
  kind: 'Civic · Justice District',
  bounds: [[-56, -1, 80], [-18, 14.6, 112]], // three floors
  playlist: 'pl-lobby',
  spawn: [-37, 0.3, 83],
  yaw: 0,
})

ZONES.push({
  id: 'state-prison',
  name: 'State Prison',
  kind: 'Civic · Justice District',
  bounds: [[-122, -1, 80], [-84, 14.6, 112]], // three floors
  playlist: 'pl-lobby',
  spawn: [-103, 0.3, 83],
  yaw: 0,
})

ZONES.push({
  id: 'rehab-center',
  name: 'Rehabilitation Center',
  kind: 'Civic · Justice District',
  bounds: [[18, -1, 114], [56, 14.6, 128]], // three floors
  playlist: 'pl-lobby',
  spawn: [22, 0.3, 121],
  yaw: -Math.PI / 2,
})

ZONES.push({
  id: 'library',
  name: 'Public Library',
  kind: 'Civic · Library',
  bounds: [[-92, -1, -76], [-48, 7, -40]],
  playlist: 'pl-lobby',
  spawn: [-46, 0.3, -58],
  yaw: Math.PI / 2,
})

ZONES.push({
  id: 'museum',
  name: 'Museum of American Heritage',
  kind: 'Civic · Museum',
  bounds: [[24, -1, -122], [70, 19, -84]],
  playlist: null,
  spawn: [22, 0.3, -103],
  yaw: -Math.PI / 2,
})

ZONES.push({
  id: 'gym',
  name: 'Storm Athletic Club',
  kind: 'Civic · Gym',
  bounds: [[34, -1, -78], [68, 12, -48]],
  playlist: null,
  spawn: [30, 0.3, -63],
  yaw: -Math.PI / 2,
})

ZONES.push({
  id: 'job-center',
  name: 'Job Center',
  kind: 'Civic · Employment District',
  bounds: [[54, -1, 30], [76, 12, 48]],
  playlist: 'pl-lobby',
  spawn: [63, 0.3, 28.6],
  yaw: 0,
})

ZONES.push({
  id: 'post-office',
  name: 'Post Office',
  kind: 'Civic · Employment District',
  bounds: [[40, -1, 54], [62, 8, 66]],
  playlist: 'pl-lobby',
  spawn: [51, 0.3, 52.6],
  yaw: 0,
})

ZONES.push({
  id: 'car-wash-a',
  name: 'Storm Shine Express Wash',
  kind: 'Civic · Employment District',
  bounds: [[36, -1, 30], [50, 8, 52]],
  playlist: 'pl-lobby',
  spawn: [43, 0.3, 28.6],
  yaw: 0,
})

ZONES.push({
  id: 'car-wash-b',
  name: 'Quick Bay Wash',
  kind: 'Civic · Employment District',
  bounds: [[-122, -1, 30], [-108, 8, 52]],
  playlist: 'pl-lobby',
  spawn: [-115, 0.3, 28.6],
  yaw: 0,
})

ZONES.push({
  id: 'courthouse',
  name: 'Courthouse',
  kind: 'Civic · Justice District',
  bounds: [[64, -1, 80], [110, 7.0, 112]],
  playlist: 'pl-lobby',
  spawn: [87, 0.3, 82],
  yaw: 0,
})

// every Justice-district elevator car gets the same soft elevator music as the Plaza car
for (const c of CARS) {
  const [hx, hz] = carHallPoint(c, 1.8)
  ZONES.push({
    id: 'elev-' + c.id,
    name: c.name,
    kind: 'Elevator',
    bounds: [[c.x0, c.baseY - 0.5, c.z0], [c.x1, carTop(c), c.z1]],
    playlist: 'pl-elevator',
    spawn: [hx, c.baseY + 0.3, hz],
    yaw: c.hall === 'south' ? Math.PI : 0,
  })
}

export const zoneById = (id) => ZONES.find((z) => z.id === id)

ZONES.push({
  id: 'mansion',
  name: 'Reign Estate',
  kind: 'Private residence',
  bounds: [[78, -1, -88], [120, 14, -57]],
  playlist: 'pl-lobby',
  spawn: [99, 1.1, -63],
  yaw: Math.PI,
})
