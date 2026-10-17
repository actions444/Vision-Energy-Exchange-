// Isla Serena: the island district in the bay (east of the city, north of the dolphins).
// World metres. Sea level is y = 0 and the sea is walkable and drivable at that height.
export const VY = 0.45 // villa platform height

export const ISLE = {
  lagoon: { x0: 150, x1: 334, z0: -118, z1: -58, floorY: -0.55 },
  bar: { x: 205, z: -84, len: 56, wid: 14, top: 0.3 },
  platform: { x0: 281, x1: 321, z0: -106, z1: -66 },
  villa: { x0: 287, x1: 315, z0: -99, z1: -81, h: 3.6 },
}

/** The spot where the jet skis and the open-top 4x4 are parked (a shore line on the sandbar's south side). */
export const SKI_LINE = { x: 190, z: -73.2, dx: 6.4, n: 4 }

/** Royal Films 999 headquarters: a studio islet in the lagoon, between the sandbar and the villa. */
export const ROYAL = {
  platform: { x0: 236, x1: 272, z0: -114, z1: -80 },
  building: { x0: 241, x1: 267, z0: -109, z1: -91, h: 5.2 },
}

/**
 * The Isla Serena pool: one real basin (water volume + walls + floor + steps), used by the swim system.
 * Shallow end (steps) at the west, deep end at the east. All numbers are world metres.
 *   surf: water surface; deck: terrace top; the basin floor drops 1.0 m under the surface at the shallow
 *   end and 3.0 m at the deep end, with a long ramp between, and four entry steps of 0.28 m.
 */
const VILLA_CX = (ISLE.villa.x0 + ISLE.villa.x1) / 2
export const POOL = {
  x0: VILLA_CX - 8, x1: VILLA_CX + 8, z0: ISLE.villa.z1 + 4.6, z1: ISLE.villa.z1 + 10,
  rim: 0.5, // coping width around the water
  deck: VY, // collision top of the terrace
  surf: VY - 0.12, // water surface (12 cm under the deck)
  shallow: 1.0, deep: 3.0, // depths (a 3 m deep end is what a 0.55 m board needs)
  stepW: 0.5, nSteps: 3, stepDrop: 0.28, // entry steps at the west end (u = metres from the west wall)
  rampU0: 5.5, rampU1: 10.5, // where the floor slopes from shallow to deep
}

/**
 * The world's ground slab as boxes, with the swimming pool's hole (and its coping ring) cut out.
 * Returns [centerX, centerY, centerZ, halfX, halfY, halfZ] for each piece. `x0..x1`, `z0..z1` is the whole slab.
 */
export function groundPieces(x0, x1, z0, z1, top = 0, thick = 1) {
  const ox0 = POOL.x0 - POOL.rim, ox1 = POOL.x1 + POOL.rim, oz0 = POOL.z0 - POOL.rim, oz1 = POOL.z1 + POOL.rim
  const cy = top - thick / 2, hy = thick / 2
  const box = (a, b, c, d) => [(a + b) / 2, cy, (c + d) / 2, (b - a) / 2, hy, (d - c) / 2]
  return [box(x0, ox0, z0, z1), box(ox1, x1, z0, z1), box(ox0, ox1, z0, oz0), box(ox0, ox1, oz1, z1)]
}
