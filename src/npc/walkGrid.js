// Where people can stand: reads the same baked walkability grid the street pedestrians use
// (config/pedGrid.js, 1 m cells over x -130..120, z -130..130). A cell is 0 where nobody may walk (walls,
// furniture, water, roads off the crosswalks, interiors, private land); otherwise it encodes the ground height.
import { PED_GRID } from '../config/pedGrid.js'

const { x0: GX0, z0: GZ0, nx: NX, nz: NZ } = PED_GRID
const N = NX * NZ
const heightOf = (v) => (v - 1) * 0.05 - 0.06
export const STEP_OK = 0.16 // the most a person steps up or down between neighbouring cells (metres)

let VAL = null
function cells() {
  if (VAL) return VAL
  const raw = Uint8Array.from(atob(PED_GRID.rle), (c) => c.charCodeAt(0))
  VAL = new Uint8Array(N)
  for (let i = 0, o = 0; i < raw.length; i += 2) { VAL.fill(raw[i], o, o + raw[i + 1]); o += raw[i + 1] }
  return VAL
}

const cellOf = (x, z) => {
  const i = Math.floor(x - GX0 + 0.25), j = Math.floor(z - GZ0 + 0.25)
  if (i < 0 || j < 0 || i >= NX || j >= NZ) return -1
  return j * NX + i
}

// The cross street, where traffic drives (same band as CROSS_Z0..CROSS_Z1 in world/Pedestrians.jsx). The grid
// marks its crosswalks walkable for the street pedestrians, who wait for the lights; wandering NPCs, which do not
// follow the signals, keep off it entirely.
export const CAR_STREET = { z0: 13.7, z1: 26.3 }
const onCarStreet = (z) => z > CAR_STREET.z0 && z < CAR_STREET.z1

/** Ground height at (x, z), or null when nobody may stand there (or it is outside the mapped area). */
export function groundAt(x, z) {
  if (onCarStreet(z)) return null
  const c = cellOf(x, z)
  if (c < 0) return null
  const v = cells()[c]
  return v ? heightOf(v) : null
}

/** The closest standable spot to (x, z) within `maxR` metres, as { x, z, y }, or null if there is none. */
export function nearestStandable(x, z, maxR = 14) {
  const here = groundAt(x, z)
  if (here !== null) return { x, z, y: here }
  for (let r = 1; r <= maxR; r++) {
    // walk the ring of cells r metres out
    for (let k = -r; k <= r; k++) {
      for (const [dx, dz] of [[k, -r], [k, r], [-r, k], [r, k]]) {
        const y = groundAt(x + dx, z + dz)
        if (y !== null) return { x: x + dx, z: z + dz, y }
      }
    }
  }
  return null
}
