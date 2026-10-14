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

export const zoneById = (id) => ZONES.find((z) => z.id === id)
