// Reign Estate: a private mansion north of Vision Motors & Skyport. All coordinates are world
// metres. The front door faces +z (south, toward the motor court).
export const CURB = 0.15
export const FLOOR = CURB + 0.9 // raised ground floor
export const HOUSE = { x0: 80, x1: 118, z0: -86, z1: -60 }
export const CX = 99 // centre line of the house
export const FOYER = { x0: 92, x1: 106 }
export const H_WING = 6.4 // wing wall height above FLOOR
export const H_MAIN = 9.6 // double-height foyer

export const ESTATE = { x0: 77, x1: 121, z0: -100, z1: -36 }
export const GATE_Z = -37.2

// portico platform and entrance steps (6 risers of 0.15)
export const PORTICO = { x0: 90, x1: 108, z0: -60, z1: -57 }
export const STEPS = { x0: 94, x1: 104, zFront: -53.5, rise: 0.15, run: 0.7, n: 5 }

// grand stair: runs north (towards -z) from the foyer floor up to the gallery
export const STAIR = { x0: 98, x1: 102, zStart: -69.6, rise: 0.2, run: 0.45, n: 23 }
export const GALLERY = { y: FLOOR + STAIR.rise * STAIR.n, z0: -86, z1: -80 }
export const STAIR_END_Z = STAIR.zStart - STAIR.run * STAIR.n // -79.95

/** Height of the walkable surface at (x,z): used by the cinematic actors. */
export function floorY(x, z) {
  if (x > STAIR.x0 && x < STAIR.x1 && z < STAIR.zStart && z > STAIR_END_Z) {
    const k = Math.min(STAIR.n, Math.max(1, Math.ceil((STAIR.zStart - z) / STAIR.run)))
    return FLOOR + STAIR.rise * k
  }
  if (x > FOYER.x0 && x < FOYER.x1 && z <= STAIR_END_Z && z > GALLERY.z0) return GALLERY.y
  if (x > HOUSE.x0 && x < HOUSE.x1 && z > HOUSE.z0 && z < HOUSE.z1) return FLOOR
  if (x > PORTICO.x0 && x < PORTICO.x1 && z >= PORTICO.z0 && z < PORTICO.z1) return FLOOR
  if (x > STEPS.x0 && x < STEPS.x1 && z < STEPS.zFront && z >= PORTICO.z1) {
    const k = Math.min(STEPS.n, Math.max(0, Math.ceil((STEPS.zFront - z) / STEPS.run)))
    return CURB + STEPS.rise * k
  }
  return CURB
}

/** Shared door override: the cinematic opens or closes the front doors (null = proximity). */
export const mansionState = { doorsForce: null }
