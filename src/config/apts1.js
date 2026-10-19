// Residential city expansion — First Demonstration item 2 (user's own spec, section 8):
// "One four-story apartment complex with multiple accessible units." Built here as a standard-
// tier garden apartment: exterior stairs and an open-air breezeway, not an elevator/interior
// core, per the spec's own STANDARD APARTMENTS list (section 2).
export const LOT = { x0: 100, x1: 150, z0: 140, z1: 186 }
export const GROUND = 0.15
export const T = 0.25
export const FH = 3.0
export const FLOORS = 4
export const BLDG = { x0: 108, x1: 142, z0: 150, z1: 160 }
export const UNIT_COUNT = 4 // per floor
export const STAIR = { x0: BLDG.x0 - 4.0, x1: BLDG.x0 - 0.6, z0: 151.5, z1: 158.5 }
export const WALK = { x0: STAIR.x0, x1: BLDG.x1, z0: BLDG.z0 - 1.8, z1: BLDG.z0 } // exterior breezeway
export const PARKING = { x0: 102, x1: 148, z0: 141, z1: 148 }
export const LAUNDRY = { x0: 142, x1: 149, z0: 150, z1: 158 } // small standalone room, east of the building
