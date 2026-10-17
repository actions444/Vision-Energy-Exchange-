// World layout constants shared by city, gallery and effects.
export const GALLERY = {
  minX: -14, maxX: 14,
  minZ: -52, maxZ: -32, // front wall at maxZ, facing +z (toward the avenue)
  height: 9,
  wall: 0.5,
  floorY: 0.15,
  doorHalf: 1.4, // half width of the double doorway (2.8 m pair)
  doorHeight: 3.0,
}

export function insideGallery(p, pad = 0) {
  return p.x > GALLERY.minX - pad && p.x < GALLERY.maxX + pad && p.z > GALLERY.minZ - pad && p.z < GALLERY.maxZ + pad && p.y < GALLERY.height
}

import { ZONES } from '../config/rooms.js'
const INDOOR = ZONES.filter((z) => z.id !== 'streets')
/** True inside any roofed room (used to stop rain falling indoors). */
export function isIndoors(p) {
  return INDOOR.some(({ bounds: [a, b] }) => p.x > a[0] + 0.3 && p.x < b[0] - 0.3 && p.z > a[2] + 0.3 && p.z < b[2] - 0.3 && p.y < b[1])
}
