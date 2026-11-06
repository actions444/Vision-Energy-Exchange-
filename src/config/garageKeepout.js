// Nobody stands, waits or walks in front of the Stormline Parking Garage: a zone of the garage footprint plus 6 m.
// Used by the street crowd (world/Pedestrians.jsx, which blocks these cells in its walkability grid) and by the
// NPC system (npc/walkGrid.js, which uses a wider 10 m zone).
import { SITE as GARAGE_SITE } from './parkingGarage.js'

export const GARAGE_KEEPOUT = {
  x0: GARAGE_SITE.x0 - 6, x1: GARAGE_SITE.x1 + 6,
  z0: GARAGE_SITE.z0 - 6, z1: GARAGE_SITE.z1 + 6,
}

export const inGarageKeepout = (x, z, zone = GARAGE_KEEPOUT) =>
  x >= zone.x0 && x <= zone.x1 && z >= zone.z0 && z <= zone.z1
