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
    style: 'suv',
    // chassis colliders (half extents + centre): lower body and cabin
    colliders: [{ half: [2.7, 0.42, 0.99], at: [0, 0.92, 0] }, { half: [1.5, 0.36, 0.91], at: [-0.35, 1.65, 0] }],
  },
  // Original designs (no real-brand shapes or badges): a low luxury saloon, an electric pickup
  // and a short off-roader. Same physics model; each has its own body, weight and tuning.
  'luxury-sedan': {
    name: 'Aurelia Sedan',
    kind: 'Luxury sedan',
    length: 5.2, width: 1.95, height: 1.5,
    wheelBase: 3.1, track: 1.66, wheelRadius: 0.37, wheelWidth: 0.27,
    mass: 1900, com: 0.18,
    engineForce: 3900, reverseForce: 1700, brakeForce: 95,
    maxSpeed: 27, maxSteer: 0.56,
    suspension: { rest: 0.3, stiffness: 44, compression: 4.4, relaxation: 4.2, travel: 0.2, maxForce: 30000 },
    friction: 2.1,
    driverSeat: [-0.15, 0.74, -0.42],
    passengerSeats: [[-0.15, 0.74, 0.42], [-1.2, 0.74, -0.42], [-1.2, 0.74, 0.42]],
    style: 'sedan',
    colliders: [{ half: [2.6, 0.34, 0.95], at: [0, 0.8, 0] }, { half: [1.25, 0.27, 0.86], at: [-0.35, 1.38, 0] }],
  },
  'electric-pickup': {
    name: 'Voltline Pickup',
    kind: 'Electric pickup truck',
    length: 5.8, width: 2.08, height: 1.95,
    wheelBase: 3.6, track: 1.76, wheelRadius: 0.43, wheelWidth: 0.32,
    mass: 2700, com: 0.24, // battery in the floor: very low centre of mass
    engineForce: 5400, reverseForce: 2200, brakeForce: 120,
    maxSpeed: 26, maxSteer: 0.52,
    suspension: { rest: 0.34, stiffness: 42, compression: 4.6, relaxation: 4.2, travel: 0.28, maxForce: 38000 },
    friction: 2.0,
    driverSeat: [0.45, 0.98, -0.46],
    passengerSeats: [[0.45, 0.98, 0.46], [-0.5, 0.98, -0.46], [-0.5, 0.98, 0.46]],
    style: 'pickup',
    colliders: [{ half: [2.9, 0.42, 1.0], at: [0, 0.94, 0] }, { half: [1.15, 0.38, 0.92], at: [0.25, 1.7, 0] }],
  },
  'offroad-4x4': {
    name: 'Ridgeback 4x4',
    kind: 'Off-road SUV',
    length: 4.7, width: 1.98, height: 2.0,
    wheelBase: 2.8, track: 1.7, wheelRadius: 0.46, wheelWidth: 0.34,
    mass: 2150, com: 0.3,
    engineForce: 4300, reverseForce: 2000, brakeForce: 95,
    maxSpeed: 23, maxSteer: 0.6,
    suspension: { rest: 0.38, stiffness: 34, compression: 4.0, relaxation: 3.6, travel: 0.36, maxForce: 32000 },
    friction: 2.2,
    driverSeat: [0.05, 1.02, -0.45],
    passengerSeats: [[0.05, 1.02, 0.45], [-0.95, 1.02, -0.45], [-0.95, 1.02, 0.45]],
    style: 'offroad',
    colliders: [{ half: [2.35, 0.42, 0.97], at: [0, 0.98, 0] }, { half: [1.4, 0.4, 0.92], at: [-0.25, 1.78, 0] }],
  },
}

// Drivable vehicles on the Plaza parking lot. The SUV stays where it always was; the others
// sit in parking stalls kept free for them (see RESERVED_STALLS / Parking.jsx).
export const VEHICLE_SPAWNS = [
  { id: 'suv-1', type: 'luxury-suv', position: [-55, 0.9, 49], heading: Math.PI / 2, paint: '#121216', accent: '#c9a96a' },
  { id: 'sedan-1', type: 'luxury-sedan', position: [-89.8, 0.85, 38.6], heading: -Math.PI / 2, paint: '#4b2a6e', accent: '#d9b86a' },
  { id: 'pickup-1', type: 'electric-pickup', position: [-67.4, 0.95, 38.8], heading: -Math.PI / 2, paint: '#b9bec4', accent: '#2fd3c3' },
  { id: '4x4-1', type: 'offroad-4x4', position: [-84.2, 1.0, 59.4], heading: Math.PI / 2, paint: '#1f4d4a', accent: '#e8c75a' },
]
/** Parking stalls [row, index] left empty for the drivable vehicles above. */
export const RESERVED_STALLS = [[0, 1], [0, 9], [1, 3]]

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
// Right-hand traffic: a car's right is local +z, so northbound (-z) uses x=+3, eastbound (+x) z=23.
export const ROAD_LINES = [
  [3, -18, 3, 108, Math.PI / 2], // avenue lanes (heading h: forward = (cos h, 0, -sin h))
  [-3, -18, -3, 108, -Math.PI / 2],
  [-108, 23, 108, 23, 0],
  [-108, 17, 108, 17, Math.PI],
  [-94, 49, -54, 49, 0], // parking lot aisle
]
