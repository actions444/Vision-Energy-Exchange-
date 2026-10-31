// Sun-atrium museum site on the beach, east of the city. Stage 1 is only the raised platform.
// The beach slopes from x=120 (about y 0.15) down to x=150 (about y -6), so the deck stands on stilts.
export const SUN_SITE = { x0: 122, x1: 146, z0: -45, z1: 5 }
export const SUN_DECK_Y = 1.2 // top of the deck above sea level
export const SUN_BEACH = { x0: 120, x1: 150, yAt120: 0.15, yAt150: -6 }
export const beachY = (x) => SUN_BEACH.yAt120 + ((x - SUN_BEACH.x0) / (SUN_BEACH.x1 - SUN_BEACH.x0)) * (SUN_BEACH.yAt150 - SUN_BEACH.yAt120)
