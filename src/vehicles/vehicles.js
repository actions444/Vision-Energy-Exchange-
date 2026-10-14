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
    mass: 2600, // kg
    engineForce: 4200, // N per wheel at full throttle (all-wheel drive)
    reverseForce: 1800,
    brakeForce: 90,
    maxSpeed: 24, // m/s (~86 km/h, ~54 mph) – this is a city
    maxSteer: 0.55,
    suspension: { rest: 0.32, stiffness: 34, compression: 4.4, relaxation: 3.4, travel: 0.25, maxForce: 30000 },
    friction: 2.6,
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
