// Iron Horse M.C. clubhouse lot: an open-air biker hangout south of Reign Estate and west of
// the beach - a graffiti-tagged brick backdrop, a buzzing neon sign, picnic tables, a fire
// barrel and a row of drivable motorcycles leaned up against the wall. Purely a social/decor
// venue (no shop) - just somewhere riders can park up and meet.
export const LOT = { x0: 78, x1: 116, z0: -125, z1: -107 }
export const GROUND = 0.15
export const WALL_Z = LOT.z0 + 0.3 // brick backdrop hugs the south edge
export const WALL_H = 5.0
export const CX = (LOT.x0 + LOT.x1) / 2
export const CZ = (LOT.z0 + LOT.z1) / 2
/** motorcycle parking row along the wall, nose pointing north into the lot */
export const BIKE_ROW_Z = LOT.z0 + 4.4
export const BIKE_ROW_X = [83, 89, 95, 101, 107, 113]
export const BIKE_HEADING = -Math.PI / 2
