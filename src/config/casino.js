// The Jackpot Exchange: a casino on its own platform in the open water between The Reign Arena
// and Harbor Commons / Emerald Links, reachable by walking or driving straight across the sea
// (same as everywhere else in the bay). All games pay out in VSE credits via the player's real
// wallet (src/state/jobs.js) — this is an in-world game economy, not real money.
export const PLATFORM_Y = 0.5 // walkable platform top, above sea level (y = 0)
export const PLATFORM = { x0: 148, x1: 192, z0: 58, z1: 116 }
export const CURB = PLATFORM_Y

// The building footprint, inset from the platform edge, facing south (low z) toward the open
// approach from the sea / the route down from the Reign Arena.
export const HALL = { x0: 151, x1: 189, z0: 62, z1: 112 }
export const FLOOR = PLATFORM_Y
export const H = 9.5 // exterior wall height
export const CEIL = 7.8 // interior ceiling height
export const ZONE = 'casino'
export const AREA = { x: (HALL.x0 + HALL.x1) / 2, z: (HALL.z0 + HALL.z1) / 2, r: 60 }

export const NAME = 'The Jackpot Exchange'

// Slot machines line the west wall, 6 of them.
export const SLOT_COUNT = 6
export const SLOT_X = HALL.x0 + 2.2
export const SLOT_Z0 = HALL.z0 + 8
export const SLOT_SPACING = 5.2

// Roulette and blackjack tables sit in the middle of the floor.
export const ROULETTE = { x: (HALL.x0 + HALL.x1) / 2 + 6, z: (HALL.z0 + HALL.z1) / 2 - 4 }
export const BLACKJACK = { x: (HALL.x0 + HALL.x1) / 2 + 6, z: (HALL.z0 + HALL.z1) / 2 + 10 }

// A small bar along the back (north) wall.
export const BAR = { x0: HALL.x1 - 13, x1: HALL.x1 - 2.5, z: HALL.z1 - 2.6 }
