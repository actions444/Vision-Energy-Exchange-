// Steel Wolves M.C.: a second biker clubhouse lot, same no-shop meetup pattern as Iron Horse
// (world/BikerMeetup.jsx) but its own gang, its own corner of Maple Court and a cooler, steel-blue
// palette instead of Iron Horse's rust-and-neon look.
export const LOT = { x0: -202, x1: -166, z0: 99, z1: 120 }
export const GROUND = 0.15
export const WALL_Z = LOT.z1 - 0.3 // backdrop hugs the north edge this time (facing the road to the south)
export const WALL_H = 5.0
export const CX = (LOT.x0 + LOT.x1) / 2
export const CZ = (LOT.z0 + LOT.z1) / 2
export const BIKE_ROW_Z = LOT.z1 - 4.4
export const BIKE_ROW_X = [-198, -192, -186, -180, -174, -168]
export const BIKE_HEADING = Math.PI / 2
