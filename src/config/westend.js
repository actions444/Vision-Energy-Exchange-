// West End: the new districts west of the original map (x < -130), planned in phases.
// One list of rectangles shared by the world, the walking tests and the Places menu.

export const CURB = 0.15
/** ground slab and boundary of the West End (the original map runs x -130..130) */
export const WEST = { x0: -660, x1: -130, z0: -130, z1: 130 }
export const BOULEVARD = { z0: 14, z1: 26 } // the existing cross street, continued west
export const MAPLE = { x0: -214, x1: -202 }
export const CEDAR = { x0: -318, x1: -306 }

/** raised sidewalk / lot slabs [x0, x1, z0, z1] */
export const BLOCKS = {
  ne: [-202, -132, -120, 14], // Phase 1: Meadowbrook Terrace + Meadowbrook Park
  se: [-202, -132, 26, 120], // Phase 4: Maple Court (reserved)
  nm: [-306, -214, -120, 14], // Phase 2: football grounds (reserved)
  sm: [-306, -214, 26, 120], // Phase 2: soccer + basketball (reserved)
  nw: [-392, -318, -120, 14], // Phase 3: industrial row (reserved)
  sw: [-392, -318, 26, 120], // Phase 3: landfill + recycling (reserved)
}

/** Phase 1 */
export const APT_A = { x0: -190, z0: -92, z1: -79.15, base: CURB, floors: 3, floorH: 3.0, id: 'A', number: '2200', sample: [{ floor: 0, unit: 0 }, { floor: 1, unit: 0 }] }
export const COURTYARD = { x0: -198, x1: -136, z0: -79.15, z1: -54 }
export const LOT = { x0: -198, x1: -136, z0: -118, z1: -94 }
export const PARK = { x0: -200, x1: -134, z0: -50, z1: 12 }

/** Phase 2 (north-middle block): Meadowbrook Field, a football ground with stands, fence, lights and a service plaza */
export const FIELD = { cx: -268, cz: -57, fence: { x0: -304.6, x1: -230.6, z0: -116.6, z1: 2.6 }, plaza: { x0: -230.6, x1: -214, z0: -116, z1: 2.6 }, lot: { x0: -302, x1: -216, z0: 4.6, z1: 13.2 } }
/** Phase 2 (south-middle block): recreation grounds, two basketball courts and a soccer pitch */
export const REC = { fence: { x0: -304.6, x1: -215.4, z0: 28.6, z1: 118 }, courts: [{ cx: -285, cz: 43.6 }, { cx: -235, cz: 43.6 }], pitch: { cx: -259.5, cz: 88 } }


/** Phase 3 (south-west block): Cedar Ridge Landfill (gated, weigh station, haul roads, waste cells) and a separate recycling drop-off */
export const LANDFILL = {
  gateX: -368, // centre of the two-lane entrance (inbound -373..-369.6, outbound -366.4..-363)
  fence: { x0: -390.4, x1: -322.6, z0: 28.6, zMid: 58, z1: 118.4, xStrip: -343 }, // L-shaped compound: north strip x0..xStrip, south part x0..x1
  recycling: { x0: -343, x1: -322.6, z0: 28.6, z1: 58 },
  terrain: { x0: -390.4, x1: -322.6, z0: 58, z1: 118.4 },
}
/** Phase 3 (north-west block): Cedar Works industrial row with the city waste-services depot */
export const INDUSTRIAL = {
  depot: { x0: -388, x1: -322, z0: -22, z1: 11.5 }, // fenced yard next to the boulevard
  yardA: { x0: -388, x1: -322, z0: -72, z1: -26 }, // warehouse unit A + B yard
  yardB: { x0: -388, x1: -322, z0: -116, z1: -76 }, // container yard + warehouse C
}

/** Phase 5 (new, west of the industrial row): Vision Storms International Airport — a terminal,
 *  control tower, apron and a single runway, with its own set of jobs. */
export const AIRPORT = {
  x0: -654, x1: -398, z0: -124, z1: 124,
  apron: { x0: -480, x1: -398, z0: -40, z1: 60 },
  runway: { x0: -654, x1: -490, z0: -10, z1: 30 },
  terminal: { x0: -470, x1: -410, z0: -30, z1: 10 },
  tower: { x: -415, z: -35, r: 3.2, h: 22 },
  gateX: -434, // centre of the entrance road off the boulevard
}

/** Harbor Parade: two shops on the boulevard frontage of the south-east block (Phase 4 Maple Court is still reserved behind them) */
export const PARADE = {
  laundromat: { x0: -197, x1: -177, z0: 31.5, z1: 45.5, doorC: -187 }, // VELVET SUDS LAUNDROMAT
  cleaners: { x0: -165, x1: -145, z0: 31.5, z1: 45.5, doorC: -155 }, // THE IRONING STATION
  plaza: { x0: -177, x1: -165 },
  site: [-202, -132, 53, 120], // what is left of the block for Maple Court
}

/** places the Places menu can take you to: [id, name, [x, y, z], yaw] */
export const SPAWNS = [
  ['west-gate', 'West End gate (boulevard)', [-140, 0.3, 20], Math.PI / 2],
  ['terrace', 'Meadowbrook Terrace entrance', [-168.65, CURB + 0.2, -72], 0],
  ['park', 'Meadowbrook Park', [-167, CURB + 0.2, -34], 0],
  ['field', 'Meadowbrook Field (football)', [-268, CURB + 0.2, 8], 0],
  ['rec', 'Recreation grounds (courts, soccer)', [-260, CURB + 0.2, 27.2], 0],
  ['landfill', 'Cedar Ridge Landfill gate', [-376, CURB + 0.2, 27.4], 0],
  ['recycling', 'Recycling drop-off', [-333, CURB + 0.2, 27.4], 0],
  ['depot', 'Waste-services depot (Cedar Works)', [-355, CURB + 0.2, 13.2], Math.PI],
  ['parade', 'Harbor Parade (laundromat, cleaners)', [-171, CURB + 0.2, 26.9], 0],
  ['airport', 'Vision Storms International Airport', [-440, CURB + 0.2, 20], Math.PI],
]
