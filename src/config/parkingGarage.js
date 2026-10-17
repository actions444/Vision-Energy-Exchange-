// Stormline Parking Garage: a four-level neon-lit parking structure east of the Employment
// District and north of Vision Motors & Skyport, built from an imported model (the one real
// imported art asset in this project — everything else is procedural) rather than hand-coded
// geometry. See src/world/ParkingGarage.jsx for how it's placed, collided and lit.
export const GROUND_Y = 0.15 // matches City.CURB
export const SITE = { x0: 86, x1: 120, z0: 32, z1: 68 }
export const CENTER = { x: (SITE.x0 + SITE.x1) / 2, z: (SITE.z0 + SITE.z1) / 2 }
export const MODEL_URL = '/models/parking-garage.glb'

// The source model's own bounding box (from gltf-transform inspect): roughly 0.983 x 0.335 x 0.684
// local units, already centred on x/z with its floor at local y = 0.
export const MODEL_BBOX = { x: 0.9834, y: 0.33479, z: 0.68366 }
export const SCALE = (SITE.x1 - SITE.x0) / MODEL_BBOX.x // uniform scale to hit the target footprint width

export const HEIGHT = MODEL_BBOX.y * SCALE // total building height at this scale
export const DEPTH = MODEL_BBOX.z * SCALE // total building depth (z) at this scale

export const ZONE = 'parking-garage'
export const AREA = { x: CENTER.x, z: CENTER.z, r: 55 }
