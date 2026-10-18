import { VY } from './island.js'

// Vision Grand Hotel: a resort on its own islet in the Isla Serena lagoon, west of Royal Films 999
// and clear of the sandbar/ski line. Same "platform in open water" pattern as Royal Films and the
// Casino - see world/RoyalFilms.jsx and config/island.js's ROYAL for the sibling layout.
export const HOTEL = {
  platform: { x0: 150, x1: 206, z0: -116, z1: -96 },
  building: { x0: 160, x1: 200, z0: -112, z1: -100, h: 6.4 },
}
export const HOTEL_Y = VY

// Nightly room tiers, booked and paid for at the front desk (real credits, same wallet as
// everywhere else). Booking is a real transaction recorded in `hotelStay` (state/jobs.js) - there
// is no separate private instanced room to walk into; the three room types below are furnished,
// walk-up displays in the lobby so you can see what each tier looks like.
export const HOTEL_TIERS = [
  { id: 'standard', name: 'Standard Room', price: 45, desc: 'A queen bed, nightstand and a water view.' },
  { id: 'suite', name: 'Suite', price: 110, desc: 'A larger room with a sitting area and the best light in the house.' },
  { id: 'penthouse', name: 'Penthouse', price: 240, desc: 'The top-floor corner room, lounge furniture and a private balcony.' },
]
export const hotelTierById = (id) => HOTEL_TIERS.find((t) => t.id === id)
