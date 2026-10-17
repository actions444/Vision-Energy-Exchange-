// Vision Motors & Skyport: the vehicle court on the north-east block, across the cross street from the
// Grand Concert Stage. Cars, three-wheelers and motorcycles stand in display bays; the two jets sit on
// landing pads by the beach. Everything is drivable straight off its spot. The entrance is on the south
// edge, facing the cross street (north kerb at z=14).
export const CURB = 0.15
export const MOTORS = { x0: 84, x1: 118, z0: -34, z1: 9.6 }
/** designed with the entrance at +z end; this maps a design z to the world (z grows toward the street) */
const ZM = (z) => 37.6 - z
/** driveway from the cross street into the court */
export const DRIVE = { x: 102, w: 9 }
/** the two landing pads (circles) */
export const PADS = [
  { id: 'pad-1', x: 110.6, z: ZM(38.5), r: 7.4 },
  { id: 'pad-2', x: 110.6, z: ZM(59), r: 7.4 },
]
/** car and trike bays along the west side, nose to the east */
export const BAYS_X = 91.5
export const BAY_Z = [33.5, 38.9, 44.3, 49.7, 55.1, 60.5, 65.9].map(ZM)
/** motorcycle row along the north edge, nose to the south (toward the entrance) */
export const BIKE_Z = ZM(66.8)
export const BIKE_X = [98.4, 99.8, 101.2, 102.6]
export const BIKE_HEADING = -Math.PI / 2
export { ZM }
