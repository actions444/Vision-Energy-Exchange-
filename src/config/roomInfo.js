// What each rentable room contains, for listings. The owner can change descriptions, furniture
// and amenities per room in Rentals admin; these are the starting texts and must match what is
// actually built in src/world/PlazaRooms.jsx.
import { P, PLAZA, CORRIDOR, DOOR_U, PLAZA_ROOMS } from './plaza.js'
import { spaceById } from '../decor/spaces.js'

export const ROOM_INFO = {
  'VSP-101': {
    description: 'A bistro dining room on the ground floor with a bar, pendant lights and a booth.',
    furniture: ['6 round dining tables with 24 chairs', 'Bar counter with 4 stools', 'Booth sofa and table', 'Shelving', 'Pendant lights'],
    amenities: ['Room music', 'Ground floor, next to the lobby'],
  },
  'VSP-102': {
    description: 'A boutique clothing store with rails, display tables, mannequins and fitting rooms.',
    furniture: ['6 clothing racks', '2 display tables', '2 mannequins', '3 fitting rooms', 'Cash counter', 'Bench', 'Mirror'],
    amenities: ['Room music', 'Ground floor, next to the lobby'],
  },
  'VSP-201': {
    description: 'A small stadium-seated screening room with recliners and a cinema screen, plus a lounge area at the back.',
    furniture: ['24 leather recliners on 4 tiers', '1.85:1 cinema screen', 'Surround speakers', 'Concession counter', 'Lounge sofa'],
    amenities: ['Movie playback from the media library', 'Screen & sound controls', 'Dimming house lights', 'Exit signs', 'Hourly event booking'],
  },
  'VSP-202': {
    description: 'A music and podcast studio with a glass vocal booth, a console desk, a podcast table and a sofa.',
    furniture: ['Console desk with chair and studio monitors', 'Glass vocal booth with microphone', 'Podcast table with 3 chairs and microphones', 'Acoustic wall panels', 'Sofa', 'Pendant light'],
    amenities: ['Plays your music catalog', 'Hourly session booking'],
  },
  'VSP-301': {
    description: 'A boardroom on the top floor with a 7-metre conference table, a presentation screen and city views.',
    furniture: ['7 m conference table', '11 chairs', 'Presentation screen', 'Credenza', 'Whiteboard', '2 plants'],
    amenities: ['Presentation screen', 'Quiet room music', 'Top-floor windows', 'Hourly meeting booking'],
  },
  'VSP-302': {
    description: 'A private top-floor suite with a lounge, a desk, a personal welcome screen and an accent wall you can recolour.',
    furniture: ['2 sofas and an armchair', 'Marble coffee table', 'Area rug', 'Welcome screen', 'Desk and chair', 'Bookshelf', 'Pendant light', '2 plants'],
    amenities: ['Personalised sign and welcome message', 'Accent wall colour', 'Choose your room playlist', 'Decorate with the Decorate menu'],
  },
}

/** Floor area of a room in m² (from the built room's footprint). */
export function roomArea(id) {
  const s = spaceById(id)
  if (!s) return null
  const [x0, x1, z0, z1] = s.rect
  return Math.round((x1 - x0 + 0.3) * (z1 - z0 + 0.3))
}

/** Where a visit starts: the corridor in front of the room's door, facing the door. */
export function doorSpot(id) {
  const r = PLAZA_ROOMS.find((x) => x.id === id)
  if (!r) return null
  const south = r.side === 'south'
  const v = south ? CORRIDOR.v0 + 1.6 : CORRIDOR.v1 - 1.6
  // camera yaw: forward = (-sin yaw, -cos yaw); face the door (south: -z, north: +z)
  return { position: [P.X(DOOR_U), P.Y(r.floor) + 0.2, P.Z(v)], yaw: south ? 0 : Math.PI, floor: r.floor + 1, building: 'Vision Storms Plaza' }
}

/** Where a virtual tour starts: just inside the door, looking into the room. */
export function tourSpot(id) {
  const r = PLAZA_ROOMS.find((x) => x.id === id)
  if (!r) return null
  const south = r.side === 'south'
  const v = south ? CORRIDOR.v0 - 1.4 : CORRIDOR.v1 + 1.4
  // look along the length of the room (towards the west end), not at the window
  return { position: [P.X(DOOR_U - 1.2), P.Y(r.floor) + 0.2, P.Z(v)], yaw: Math.PI / 2 }
}

/**
 * Camera viewpoints for room photos, computed from the room's footprint:
 * entrance, full room, furniture, lighting and another angle.
 */
export function photoViews(id) {
  const s = spaceById(id)
  const r = PLAZA_ROOMS.find((x) => x.id === id)
  if (!s || !r) return []
  const [x0, x1, z0, z1] = s.rect
  const y = s.floorY
  const south = r.side === 'south'
  const doorZ = south ? z1 - 0.3 : z0 + 0.3
  const farZ = south ? z0 + 0.4 : z1 - 0.4
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
  const dx = P.X(DOOR_U)
  return [
    { label: 'Entrance view', pos: [dx, y + 1.65, doorZ], look: [dx - 8, y + 0.7, farZ] },
    { label: 'Full room', pos: [x1 - 0.4, y + 3.3, doorZ], look: [x0 + 6, y + 0.2, farZ] },
    { label: 'Furniture', pos: [cx + 3, y + 1.5, cz], look: [x0 + 3, y + 0.5, cz] },
    { label: 'Lighting', pos: [cx - 6, y + 1.1, doorZ], look: [cx - 6, y + PLAZA.floorH - 0.6, farZ] },
    { label: 'Another angle', pos: [x0 + 0.5, y + 2.4, farZ], look: [x1 - 4, y + 0.8, doorZ] },
  ]
}
