// Residential city expansion — First Demonstration item 1 (per the user's own spec, section 8):
// "One three-story luxury mansion with a swimming pool and balconies." Footprint checked against
// every box in City.jsx's RESERVED list - well south of the Mall/Hospital, clear of everything.
export const LOT = { x0: 40, x1: 92, z0: 140, z1: 186 }
export const GROUND = 0.15
export const T = 0.3
export const FH = 3.3 // floor-to-floor height

export const HOUSE = { x0: 48, x1: 84, z0: 146, z1: 164 }
export const GARAGE = { x0: 48, x1: 56, z0: 146, z1: 164 }
export const STAIR = { x0: 56, x1: 59.4, zA: 148, zB: 155.4, landing: 1.6 }
export const BALCONY = { x0: 58, x1: 76, z0: HOUSE.z1, z1: HOUSE.z1 + 3 }
export const POOL = { x0: 58, x1: 74, z0: 168, z1: 180 }
