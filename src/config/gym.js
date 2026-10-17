import { CURB } from './jobs.js'

// Storm Athletic Club: a modern gym on the lawn south of the Museum of American Heritage.
// Footprint x 34..68, z -78..-48; the entrance faces west, toward Heritage Walk.
export const GYM = { x0: 34, x1: 68, z0: -78, z1: -48 }
export const GYM_FLOOR = CURB + 0.15 // one 15 cm step up from the sidewalk
export const GYM_H = 7.5 // ceiling height above the floor
export const GYM_ZONE = 'gym'
export const GYM_DOOR_Z = -63
export const GYM_AREA = { x: 51, z: -63, r: 70 } // staff are drawn when the camera is within r of this point
export { CURB }
