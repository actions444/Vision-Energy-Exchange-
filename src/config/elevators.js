// Elevators for the Justice & Rehabilitation District. Each entry describes one car: the
// interior footprint (x0..x1, z0..z1, metres), the floor height, how many floors it serves and
// which side the hall is on. The 3D car (ElevatorCar.jsx), the music zone (rooms.js) and the
// building slab holes (Justice buildings) all read this one list, so they always agree.
//
// `hall: 'south'` means the doors are on the car's low-z face and riders step out toward -z.

const BASE = 0.15 // top of the raised sidewalk everything stands on

export const CARS = [
  {
    id: 'phq',
    name: 'Police HQ elevator',
    x0: 19.0, x1: 21.7, z0: 91.8, z1: 94.8,
    baseY: BASE, floorH: 5.2, floors: 3, hall: 'south',
    labels: ['1', '2', '3'],
    names: ['Lobby · Booking · Cell Block A', 'Detectives & Records', 'Command & Briefing'],
    accent: '#2f6fe0',
  },
  {
    id: 'jail',
    name: 'County Jail elevator',
    x0: -53.0, x1: -50.3, z0: 91.8, z1: 94.8,
    baseY: BASE, floorH: 4.6, floors: 3, hall: 'south',
    labels: ['1', '2', '3'],
    names: ['Intake · Dining · Visitation', 'Housing Pod 2', 'Housing Pod 3'],
    accent: '#e4701e',
  },
  {
    id: 'prison',
    name: 'State Prison elevator',
    x0: -119.0, x1: -116.3, z0: 91.8, z1: 94.8,
    baseY: BASE, floorH: 4.6, floors: 3, hall: 'south',
    labels: ['1', '2', '3'],
    names: ['Reception · Dining · Visitation', 'Housing Unit A', 'Housing Unit B'],
    accent: '#8aa0b8',
  },
  {
    id: 'rehab',
    name: 'Rehabilitation Center elevator',
    x0: 30.0, x1: 32.7, z0: 122.0, z1: 125.0,
    baseY: BASE, floorH: 4.6, floors: 3, hall: 'south',
    labels: ['1', '2', '3'],
    names: ['Welcome · Café · Fitness', 'Counseling & Groups', 'Education & Careers'],
    accent: '#2fd0c4',
  },
  {
    id: 'hospital',
    name: 'Vision Storms General Hospital elevator',
    x0: 86.0, x1: 88.7, z0: 122.0, z1: 125.0,
    baseY: BASE, floorH: 4.6, floors: 3, hall: 'south',
    labels: ['1', '2', '3'],
    names: ['Reception · ER · Pharmacy', "Patient Rooms", 'Surgery · Doctors\' Offices'],
    accent: '#3fa9e0',
  },
  {
    id: 'cinema',
    name: 'Vision Cinema elevator',
    x0: -15.8, x1: -13.1, z0: -3.0, z1: 0.0,
    baseY: 0.15, floorH: 9.0, floors: 5, hall: 'north',
    labels: ['1', '2', '3', '4', '5'],
    names: ['Lobby · Auditoriums 1-2', 'The Royal Reserve · Emerald · Onyx', 'Blue Steel · Rosewood · Teal Lounge', 'Boutique Screens · 9-15', 'Boutique Screens · 16-22'],
    accent: '#c9a96a',
  },
]

export const carById = (id) => CARS.find((c) => c.id === id)
export const carFloorY = (c, f) => c.baseY + f * c.floorH
export const carTop = (c) => c.baseY + c.floors * c.floorH
/** Where riders stand in the hall to use the call button (world x, z). */
export const carHallPoint = (c, dist = 1.3) => [(c.x0 + c.x1) / 2, c.hall === 'south' ? c.z0 - 0.2 - dist : c.z1 + 0.2 + dist]
/** Slab hole (world rect) the shaft needs in every floor above the ground. */
export const carHole = (c) => ({ x0: c.x0 - 0.2, x1: c.x1 + 0.2, z0: c.z0 - 0.2, z1: c.z1 + 0.2 })
