// The Reign Arena: a GTA-style luxury concert hall on its own platform out in the open water
// east of the Motor Court & Skyport, reachable by walking or driving straight across the sea
// (same as everywhere else in the bay) or landing a jet ski on the dock. No bridge needed.
export const PLATFORM_Y = 0.5 // walkable platform top, above sea level (y = 0)
export const PLATFORM = { x0: 148, x1: 190, z0: 18, z1: 56 }
export const HALL = { x0: 152, x1: 186, z0: 22, z1: 52 } // the building footprint, inset from the platform edge
export const HALL_FLOOR = PLATFORM_Y // the ground floor sits directly on the platform
export const HALL_H = 11 // exterior wall / shell height above the floor
export const HALL_CEIL = 9.4 // interior ceiling height over the hall (truss + lights live under this)
export const HALL_ZONE = 'concerthall'
export const HALL_AREA = { x: (HALL.x0 + HALL.x1) / 2, z: (HALL.z0 + HALL.z1) / 2, r: 90 }
export const HALL_BAL_Y = HALL_FLOOR + 4.3 // balcony floor level (one level up)
export const CURB = PLATFORM_Y // kept for code shared with land-based wall helpers
