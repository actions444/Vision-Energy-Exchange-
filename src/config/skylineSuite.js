// Skyline Suite (VSP-302) living room furniture set: an imported model (user-supplied, Tripo3D),
// the second imported art asset in this project alongside the Stormline Parking Garage —
// everything else in the suite (bathroom, TV, chandelier, windows etc.) stays procedural.
// See src/world/SkylineSuiteSet.jsx for how it's placed and collided.
export const MODEL_URL = '/models/skyline-suite-living-room.glb'

// Source model's own bounding box (from gltf-transform inspect), floor at local y = 0.
export const MODEL_BBOX = { x: 0.76658, y: 0.12656, z: 0.97952 }

// Fit the furniture cluster inside a conservative footprint in the suite's main living area
// (clear of the desk, shelf and mirror elsewhere in the room) rather than filling the whole wall.
const FIT = { x: 10, z: 7 }
export const SCALE = Math.min(FIT.x / MODEL_BBOX.x, FIT.z / MODEL_BBOX.z)
export const SIZE = { x: MODEL_BBOX.x * SCALE, y: MODEL_BBOX.y * SCALE, z: MODEL_BBOX.z * SCALE }
