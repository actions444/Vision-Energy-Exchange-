// Reign Residences: a new residence tower, west of the Reign Estate mansion grounds (which is
// untouched). One character's fully furnished private suite per floor, grown upward over time as
// more residences are built (see src/config/residences.js's `built` flags). Ground floor is the
// building lobby (stairs + elevator core only, no resident).
//
// All coordinates are world metres. The building faces +z (south), matching the Reign Estate
// across the street.
export const CURB = 0.15
export const TOWER = {
  x0: 40, x1: 76, // 36 m wide
  z0: -100, z1: -70, // 30 m deep
  base: CURB,
  floorH: 3.6,
  floors: 19, // 0 = lobby, 1..18 = the eighteen built residences (4 family members still to come)
}

// vertical circulation core: a corridor along the west edge of the building, full depth, with the
// stair flight built in its southern 8 m and an elevator call landing at its northern end
export const CORE = { x0: TOWER.x0, x1: TOWER.x0 + 6, z0: TOWER.z0, z1: TOWER.z1 }
export const STAIR_SPAN = { z0: TOWER.z0, z1: TOWER.z0 + 8 } // where the stair flight sits within the core

// each floor's private unit occupies the rest of the footprint (local u = worldX - UNIT.x0 (0..30),
// v = worldZ - UNIT.z0 (0..30))
export const UNIT = { x0: CORE.x1, x1: TOWER.x1, z0: TOWER.z0, z1: TOWER.z1 } // 30 x 30 m

export const Y = (floor) => TOWER.base + floor * TOWER.floorH
