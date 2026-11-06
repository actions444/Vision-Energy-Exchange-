// Nobody stands, waits or walks in front of the Stormline Parking Garage or on the frontage between it and the
// Employment District. The zone is the garage footprint plus 6 m, widened west to the job courtyard (x 56).
// Used by the street crowd (world/Pedestrians.jsx blocks these cells in its walkability grid), the job district
// workers (world/Workers.jsx hides anyone inside it) and the NPC system (npc/walkGrid.js).
import { SITE as GARAGE_SITE } from './parkingGarage.js'

export const GARAGE_KEEPOUT = {
  x0: 56, x1: GARAGE_SITE.x1 + 6,
  z0: 20, z1: GARAGE_SITE.z1 + 12,
}

export const inGarageKeepout = (x, z, zone = GARAGE_KEEPOUT) =>
  x >= zone.x0 && x <= zone.x1 && z >= zone.z0 && z <= zone.z1
