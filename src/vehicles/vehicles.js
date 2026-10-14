// Vehicle catalog and the shared "who is driving what" state.
// Vehicles are data: adding a model means adding an entry here (body dimensions, wheels,
// engine, paint), not new physics code. Imported GLB bodies can replace the built-in body later.
import { create } from 'zustand'

export const VEHICLE_TYPES = {
  'luxury-suv': {
    name: 'Sovereign SUV',
    kind: 'Full-size luxury SUV',
    length: 5.4, width: 2.06, height: 1.95,
    wheelBase: 3.1, track: 1.74, wheelRadius: 0.41, wheelWidth: 0.3,
    mass: 2000, // kg (set directly, with a low centre of mass)
    com: 0.25, // centre of mass height above the chassis origin (wheel hubs are at 0.55 - 0.32)
    engineForce: 4200, // N per wheel at full throttle (all-wheel drive)
    reverseForce: 1800,
    brakeForce: 90,
    maxSpeed: 24, // m/s (~86 km/h, ~54 mph) – this is a city
    maxSteer: 0.55,
    suspension: { rest: 0.32, stiffness: 40, compression: 4.4, relaxation: 4.0, travel: 0.25, maxForce: 30000 },
    friction: 2.0, // tyre grip: enough to corner, low enough to slide before tipping
    driverSeat: [0.0, 0.96, -0.45], // seat surface, local: forward (+x), up, right (+z)
    passengerSeats: [[0.0, 0.96, 0.45], [-1.1, 0.96, -0.45], [-1.1, 0.96, 0.45]],
  },
}

// One drivable vehicle per spawn for now (Phase 2). Positions are on the lot behind the Plaza.
export const VEHICLE_SPAWNS = [
  { id: 'suv-1', type: 'luxury-suv', position: [-55, 0.9, 49], heading: Math.PI / 2, paint: '#121216', accent: '#c9a96a' },
]

export const useDriving = create(() => ({
  vehicleId: null, // the vehicle this visitor is driving
  speed: 0, // m/s, for the HUD
  gear: 'D',
}))

/** Live chassis bodies by vehicle id (debugging, tests, future multiplayer sync). */
export const vehicleBodies = new Map()
/** flip/reset actions of each vehicle (HUD buttons and keys call these) */
export const vehicleActions = new Map()

/** Road centre lines used to find a safe place to put a stuck car back: [x0,z0,x1,z1, heading] */
export const ROAD_LINES = [
  [-3, -18, -3, 108, Math.PI / 2], // avenue lanes (heading h: forward = (cos h, 0, -sin h))
  [3, -18, 3, 108, -Math.PI / 2],
  [-108, 17, 108, 17, 0],
  [-108, 23, 108, 23, Math.PI],
  [-94, 49, -54, 49, 0], // parking lot aisle
]
