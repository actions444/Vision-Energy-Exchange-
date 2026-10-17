// Emerald Links: a big public park and golf course on their own platform in the open water south-east
// of The Reign Arena, reachable by walking or driving straight across the sea like everywhere else in
// the bay. The west half is the park (Harbor Commons), the east half is the golf course (Emerald Links).
export const PLATFORM_Y = 0.5 // walkable platform top, above sea level (y = 0)
export const PLATFORM = { x0: 195, x1: 320, z0: 10, z1: 115 }
export const CURB = PLATFORM_Y

// Harbor Commons: the park, on the west side of the platform (closer to the city).
export const PARK = { x0: 198, x1: 250, z0: 13, z1: 112 }
export const POND = { x: 224, z: 55, rx: 11, rz: 8 }
export const GAZEBO = { x: 224, z: 30 }

// Emerald Links: the golf course, on the east side of the platform.
export const COURSE = { x0: 253, x1: 317, z0: 13, z1: 112 }
export const CLUBHOUSE = { x0: 254, x1: 270, z0: 15, z1: 27, h: 5.2 }
export const CART_BAY = { x: 263, z: 32 } // where the golf carts are parked, just outside the clubhouse

/** Four holes, laid out end to end down the course. Each has a tee, a green (with the flag) and a
 *  bunker; two also get a pond crossing. Purely a landscape feature, not a playable mini-game. */
export const HOLES = [
  { n: 1, tee: [276, 22], green: [276, 48], greenR: 6.2, bunker: [281, 40] },
  { n: 2, tee: [300, 26], green: [309, 55], greenR: 6.6, bunker: [303, 46], water: { x: 298, z: 48, rx: 7, rz: 5 } },
  { n: 3, tee: [292, 66], green: [268, 78], greenR: 6.0, bunker: [280, 74] },
  { n: 4, tee: [268, 90], green: [300, 100], greenR: 6.8, bunker: [293, 96], water: { x: 283, z: 96, rx: 8, rz: 5.5 } },
]
export const ZONE = 'parkgolf'
export const AREA = { x: (PLATFORM.x0 + PLATFORM.x1) / 2, z: (PLATFORM.z0 + PLATFORM.z1) / 2, r: 110 }
