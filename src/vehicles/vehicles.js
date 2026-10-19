// Vehicle catalog and the shared "who is driving what" state.
// Vehicles are data: adding a model means adding an entry here (body dimensions, wheels,
// engine, paint), not new physics code. Imported GLB bodies can replace the built-in body later.
import { create } from 'zustand'
import { CURB as MCURB, BAYS_X, BAY_Z, BIKE_Z, BIKE_X, BIKE_HEADING, PADS } from '../config/motors.js'
import { CART_BAY, PLATFORM_Y as GOLF_Y } from '../config/parkGolf.js'
import { BIKE_ROW_Z, BIKE_ROW_X, BIKE_HEADING as CLUB_BIKE_HEADING } from '../config/bikerMeetup.js'

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

  // ---- Vision Motors & Skyport lineup. Original designs in familiar classes (no real-brand
  // shapes or badges): a three-row crossover, an ultra-luxury saloon, a silent electric sedan,
  // a floating-roof luxury SUV, a retro two-door off-roader, a three-wheeled roadster and two motorcycles.
  'crossover-7': {
    name: 'Meridian 7',
    kind: 'Three-row crossover',
    length: 5.0, width: 1.98, height: 1.78,
    wheelBase: 2.95, track: 1.68, wheelRadius: 0.39, wheelWidth: 0.28,
    mass: 2050, com: 0.22,
    engineForce: 4000, reverseForce: 1800, brakeForce: 92,
    maxSpeed: 25, maxSteer: 0.56,
    suspension: { rest: 0.31, stiffness: 41, compression: 4.4, relaxation: 4.0, travel: 0.24, maxForce: 30000 },
    friction: 2.0,
    driverSeat: [0.1, 0.9, -0.44],
    passengerSeats: [[0.1, 0.9, 0.44], [-0.85, 0.9, -0.44], [-0.85, 0.9, 0.44]],
    style: 'crossover',
    colliders: [{ half: [2.5, 0.4, 0.97], at: [0, 0.9, 0] }, { half: [1.35, 0.33, 0.88], at: [-0.4, 1.6, 0] }],
  },
  'limo-regent': {
    name: 'Regent Saloon',
    kind: 'Ultra-luxury saloon',
    length: 5.7, width: 2.0, height: 1.62,
    wheelBase: 3.5, track: 1.7, wheelRadius: 0.38, wheelWidth: 0.28,
    mass: 2500, com: 0.2,
    engineForce: 4100, reverseForce: 1800, brakeForce: 108,
    maxSpeed: 26, maxSteer: 0.5,
    suspension: { rest: 0.3, stiffness: 44, compression: 4.4, relaxation: 4.2, travel: 0.2, maxForce: 36000 },
    friction: 2.1,
    driverSeat: [0.55, 0.8, -0.44],
    passengerSeats: [[0.55, 0.8, 0.44], [-0.9, 0.8, -0.44], [-0.9, 0.8, 0.44]],
    style: 'limo',
    colliders: [{ half: [2.85, 0.36, 0.98], at: [0, 0.86, 0] }, { half: [1.45, 0.3, 0.88], at: [-0.2, 1.46, 0] }],
  },
  'ev-sedan': {
    name: 'Volt S Sedan',
    kind: 'Electric sedan',
    length: 4.97, width: 1.96, height: 1.44,
    wheelBase: 2.96, track: 1.66, wheelRadius: 0.36, wheelWidth: 0.27,
    mass: 1950, com: 0.15,
    engineForce: 4500, reverseForce: 1900, brakeForce: 96,
    maxSpeed: 29, maxSteer: 0.55,
    suspension: { rest: 0.28, stiffness: 46, compression: 4.4, relaxation: 4.2, travel: 0.18, maxForce: 30000 },
    friction: 2.2,
    driverSeat: [-0.1, 0.76, -0.42],
    passengerSeats: [[-0.1, 0.76, 0.42], [-1.1, 0.76, -0.42], [-1.1, 0.76, 0.42]],
    style: 'ev',
    colliders: [{ half: [2.5, 0.32, 0.95], at: [0, 0.8, 0] }, { half: [1.3, 0.26, 0.85], at: [-0.35, 1.34, 0] }],
  },
  // Full-size electric luxury SUV: tall slab-sided body, flat roof, full-width light bar. Original design.
  'ev-suv-xl': {
    name: 'Monarch IQ',
    kind: 'Full-size electric luxury SUV',
    length: 5.45, width: 2.1, height: 1.98,
    wheelBase: 3.2, track: 1.76, wheelRadius: 0.43, wheelWidth: 0.31,
    mass: 2900, com: 0.23,
    engineForce: 5000, reverseForce: 2100, brakeForce: 112,
    maxSpeed: 26, maxSteer: 0.52,
    suspension: { rest: 0.34, stiffness: 42, compression: 4.5, relaxation: 4.1, travel: 0.27, maxForce: 38000 },
    friction: 2.0,
    driverSeat: [0.0, 1.0, -0.46],
    passengerSeats: [[0.0, 1.0, 0.46], [-1.0, 1.0, -0.46], [-1.0, 1.0, 0.46]],
    style: 'evsuv',
    colliders: [{ half: [2.7, 0.44, 1.0], at: [0, 0.96, 0] }, { half: [1.55, 0.4, 0.94], at: [-0.3, 1.72, 0] }],
  },
  // Personal watercraft: rides the shallows of the lagoon (the sea in this world is solid at water level).
  'jet-ski': {
    name: 'Tidal Jet Ski',
    kind: 'Personal watercraft',
    layout: 'trike', cy: 0.68, hideWheels: true,
    length: 3.0, width: 1.2, height: 1.15,
    wheelBase: 1.9, track: 0.9, wheelRadius: 0.22, wheelWidth: 0.2,
    mass: 430, com: 0.14, inertia: { x: 150, y: 300, z: 280 },
    engineForce: 1250, reverseForce: 450, brakeForce: 30,
    maxSpeed: 30, maxSteer: 0.52,
    suspension: { rest: 0.18, stiffness: 36, compression: 4.0, relaxation: 3.8, travel: 0.14, maxForce: 9000 },
    friction: 1.6,
    driverSeat: [-0.3, 0.64, 0],
    passengerSeats: [[-0.95, 0.66, 0]],
    style: 'jetski',
    stab: { k: 2800, c: 800 },
    colliders: [{ half: [1.45, 0.2, 0.52], at: [0, 0.32, 0] }],
  },
  // Open-top boxy luxury off-roader for the beach and the shallows. Original design.
  'beach-4x4': {
    name: 'Bastion Open 4x4',
    kind: 'Open-top luxury off-roader',
    length: 4.9, width: 2.0, height: 1.95,
    wheelBase: 2.9, track: 1.7, wheelRadius: 0.47, wheelWidth: 0.34,
    mass: 2400, com: 0.3,
    engineForce: 4600, reverseForce: 2000, brakeForce: 100,
    maxSpeed: 25, maxSteer: 0.6,
    suspension: { rest: 0.38, stiffness: 34, compression: 4.0, relaxation: 3.6, travel: 0.36, maxForce: 34000 },
    friction: 2.2,
    driverSeat: [0.05, 1.04, -0.45],
    passengerSeats: [[0.05, 1.04, 0.45], [-0.95, 1.04, -0.45], [-0.95, 1.04, 0.45]],
    style: 'opengx',
    colliders: [{ half: [2.45, 0.44, 0.97], at: [0, 1.0, 0] }],
  },
  'highland-suv': {
    name: 'Highland SUV',
    kind: 'Luxury SUV, floating roof',
    variant: 'floating', cabLen: 2.8,
    length: 5.05, width: 2.04, height: 1.87,
    wheelBase: 2.99, track: 1.72, wheelRadius: 0.41, wheelWidth: 0.3,
    mass: 2250, com: 0.25,
    engineForce: 4200, reverseForce: 1800, brakeForce: 100,
    maxSpeed: 24, maxSteer: 0.55,
    suspension: { rest: 0.33, stiffness: 40, compression: 4.4, relaxation: 4.0, travel: 0.27, maxForce: 32000 },
    friction: 2.0,
    driverSeat: [0.0, 0.96, -0.45],
    passengerSeats: [[0.0, 0.96, 0.45], [-1.0, 0.96, -0.45], [-1.0, 0.96, 0.45]],
    style: 'suv',
    colliders: [{ half: [2.5, 0.42, 0.99], at: [0, 0.92, 0] }, { half: [1.4, 0.34, 0.9], at: [-0.3, 1.62, 0] }],
  },
  'retro-4x4': {
    name: 'Pioneer 4x4',
    kind: 'Retro two-door off-roader',
    variant: 'retro',
    length: 4.2, width: 1.9, height: 1.95,
    wheelBase: 2.5, track: 1.64, wheelRadius: 0.45, wheelWidth: 0.33,
    mass: 1900, com: 0.3,
    engineForce: 4000, reverseForce: 1900, brakeForce: 86,
    maxSpeed: 22, maxSteer: 0.62,
    suspension: { rest: 0.38, stiffness: 34, compression: 4.0, relaxation: 3.6, travel: 0.36, maxForce: 30000 },
    friction: 2.2,
    driverSeat: [0.05, 1.0, -0.43],
    passengerSeats: [[0.05, 1.0, 0.43], [-0.85, 1.0, -0.43], [-0.85, 1.0, 0.43]],
    style: 'offroad',
    colliders: [{ half: [2.1, 0.42, 0.93], at: [0, 0.98, 0] }, { half: [1.25, 0.4, 0.88], at: [-0.2, 1.78, 0] }],
  },
  // three wheels: two steering wheels in front, one driven wheel behind
  'sling-roadster': {
    name: 'Sling Roadster',
    kind: 'Three-wheel open roadster',
    layout: 'trike', cy: 0.5,
    length: 3.9, width: 2.0, height: 1.2,
    wheelBase: 2.45, track: 1.72, wheelRadius: 0.34, wheelWidth: 0.26,
    mass: 800, com: 0.16, inertia: { x: 330, y: 700, z: 640 },
    engineForce: 1750, reverseForce: 900, brakeForce: 36,
    maxSpeed: 30, maxSteer: 0.58,
    suspension: { rest: 0.26, stiffness: 46, compression: 4.2, relaxation: 4.0, travel: 0.18, maxForce: 12000 },
    friction: 2.2,
    driverSeat: [-0.2, 0.62, -0.4],
    passengerSeats: [[-0.2, 0.62, 0.4]],
    style: 'sling',
    stab: { k: 3800, c: 1000 },
    colliders: [{ half: [1.95, 0.3, 0.98], at: [0, 0.64, 0] }],
  },
  // two wheels: the stability assist holds it upright, the body leans into turns
  'cruiser-bike': {
    name: 'Outlaw Cruiser',
    kind: 'Cruiser motorcycle',
    layout: 'bike', cy: 0.45, lean: 0.42,
    length: 2.3, width: 0.9, height: 1.2,
    wheelBase: 1.55, track: 0, wheelRadius: 0.35, wheelWidth: 0.17,
    mass: 330, com: 0.3, inertia: { x: 38, y: 90, z: 110 },
    engineForce: 800, reverseForce: 350, brakeForce: 15,
    maxSpeed: 28, maxSteer: 0.5,
    suspension: { rest: 0.22, stiffness: 38, compression: 3.6, relaxation: 3.4, travel: 0.18, maxForce: 5200 },
    friction: 2.4,
    driverSeat: [-0.1, 0.78, 0],
    passengerSeats: [[-0.72, 0.8, 0]],
    style: 'cruiser',
    stab: { k: 3200, c: 480 },
    colliders: [{ half: [1.0, 0.3, 0.2], at: [0, 0.56, 0] }],
  },
  'sport-bike': {
    name: 'Razor Sport Bike',
    kind: 'Sport motorcycle',
    layout: 'bike', cy: 0.45, lean: 0.55,
    length: 2.1, width: 0.7, height: 1.15,
    wheelBase: 1.4, track: 0, wheelRadius: 0.31, wheelWidth: 0.2,
    mass: 250, com: 0.28, inertia: { x: 28, y: 65, z: 85 },
    engineForce: 900, reverseForce: 300, brakeForce: 14,
    maxSpeed: 36, maxSteer: 0.4,
    suspension: { rest: 0.22, stiffness: 40, compression: 3.6, relaxation: 3.4, travel: 0.16, maxForce: 4600 },
    friction: 2.5,
    driverSeat: [-0.05, 0.78, 0],
    passengerSeats: [[-0.62, 0.8, 0]],
    style: 'sportbike',
    stab: { k: 2400, c: 380 },
    colliders: [{ half: [0.9, 0.28, 0.18], at: [0, 0.54, 0] }],
  },
  // Long, laid-back chopper for the Iron Horse M.C. clubhouse: raked-out cruiser stance, heavy
  // chrome, unhurried power. Reuses the cruiser body (same silhouette, different tune/paint).
  'chopper-bike': {
    name: 'Vagabond Chopper',
    kind: 'Custom chopper',
    layout: 'bike', cy: 0.45, lean: 0.36,
    length: 2.5, width: 0.9, height: 1.15,
    wheelBase: 1.7, track: 0, wheelRadius: 0.37, wheelWidth: 0.18,
    mass: 360, com: 0.32, inertia: { x: 40, y: 95, z: 118 },
    engineForce: 760, reverseForce: 320, brakeForce: 13,
    maxSpeed: 24, maxSteer: 0.42,
    suspension: { rest: 0.22, stiffness: 36, compression: 3.6, relaxation: 3.4, travel: 0.17, maxForce: 5200 },
    friction: 2.4,
    driverSeat: [-0.12, 0.76, 0],
    passengerSeats: [[-0.76, 0.78, 0]],
    style: 'cruiser',
    stab: { k: 3200, c: 480 },
    colliders: [{ half: [1.1, 0.3, 0.2], at: [0, 0.56, 0] }],
  },
  // Light, high-travel dirt bike for rough ground: fast and twitchy, knobby-tyre handling.
  // Reuses the sport-bike body (same silhouette, different tune/paint).
  'dirt-bike': {
    name: 'Trailhawk MX',
    kind: 'Dirt bike',
    layout: 'bike', cy: 0.45, lean: 0.5,
    length: 2.0, width: 0.65, height: 1.2,
    wheelBase: 1.35, track: 0, wheelRadius: 0.33, wheelWidth: 0.18,
    mass: 190, com: 0.3, inertia: { x: 24, y: 55, z: 72 },
    engineForce: 700, reverseForce: 260, brakeForce: 12,
    maxSpeed: 26, maxSteer: 0.46,
    suspension: { rest: 0.3, stiffness: 32, compression: 3.2, relaxation: 3.0, travel: 0.28, maxForce: 4200 },
    friction: 2.3,
    driverSeat: [-0.02, 0.8, 0],
    passengerSeats: [[-0.58, 0.82, 0]],
    style: 'sportbike',
    stab: { k: 2200, c: 340 },
    colliders: [{ half: [0.85, 0.28, 0.17], at: [0, 0.54, 0] }],
  },
  // Small open-top utility cart for Emerald Links: slow, light, two bench seats. Free to drive.
  'golf-cart': {
    name: 'Fairway Cart',
    kind: 'Golf cart',
    length: 2.7, width: 1.3, height: 1.75,
    wheelBase: 1.85, track: 1.1, wheelRadius: 0.24, wheelWidth: 0.16,
    mass: 380, com: 0.2,
    engineForce: 950, reverseForce: 450, brakeForce: 40,
    maxSpeed: 9, maxSteer: 0.6,
    suspension: { rest: 0.2, stiffness: 30, compression: 3.6, relaxation: 3.4, travel: 0.16, maxForce: 8000 },
    friction: 1.9,
    driverSeat: [0.05, 0.98, -0.32],
    passengerSeats: [[0.05, 0.98, 0.32], [-0.75, 0.98, -0.32], [-0.75, 0.98, 0.32]],
    style: 'opengx',
    colliders: [{ half: [1.35, 0.42, 0.65], at: [0, 0.78, 0] }],
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
// Vision Motors & Skyport (east side). Bays run north-south along the west edge, nose to the east.
const E = (id, type, x, z, heading, paint, accent) => ({ id, type, position: [x, MCURB + 0.55, z], heading, paint, accent })
VEHICLE_SPAWNS.push(
  E('regent-1', 'limo-regent', BAYS_X, BAY_Z[0], 0, '#0f1114', '#d8c28a'),
  E('volt-1', 'ev-sedan', BAYS_X, BAY_Z[1], 0, '#d9dde2', '#4fb8ff'),
  E('meridian-1', 'crossover-7', BAYS_X, BAY_Z[2], 0, '#7a1b24', '#c9ccd2'),
  E('highland-1', 'highland-suv', BAYS_X, BAY_Z[3], 0, '#2b4a3a', '#c9a96a'),
  E('pioneer-1', 'retro-4x4', BAYS_X, BAY_Z[4], 0, '#e8e2cf', '#c0392b'),
  E('estate-limo', 'limo-regent', 91.8, -51.3, Math.PI / 2, '#0b0c0f', '#d8c28a'),
  E('estate-monarch', 'ev-suv-xl', 99.0, -51.2, Math.PI / 2, '#f1f2f4', '#9fd0ff'),
  // Isla Serena: jet skis parked along the sandbar's shore, and the open-top 4x4 on the shoal
  ...[['#1fb8c9', '#ffffff'], ['#f2f2f4', '#e0245e'], ['#ffb400', '#1b1b1f'], ['#2255d6', '#ffffff']].map(([paint, accent], i) => (
    { id: 'jetski-' + (i + 1), type: 'jet-ski', position: [187 + i * 7.5, 0.35, -73.6 - (i % 2) * 0.8], heading: -0.35 + i * 0.12, paint, accent }
  )),
  { id: 'bastion-1', type: 'beach-4x4', position: [215, 0.9, -69], heading: Math.PI / 2 + 0.4, paint: '#5fd6dc', accent: '#d63b2e' },
  E('estate-volt', 'ev-sedan', 107.6, -51.0, Math.PI / 2, '#e9ecef', '#6fb2ff'),
  E('sling-1', 'sling-roadster', BAYS_X, BAY_Z[5], 0, '#e0a010', '#15161a'),
  E('sling-2', 'sling-roadster', BAYS_X, BAY_Z[6], 0, '#1f6fd1', '#e9eef5'),
  E('cruiser-1', 'cruiser-bike', BIKE_X[0], BIKE_Z, BIKE_HEADING, '#16171a', '#c9a96a'),
  E('cruiser-2', 'cruiser-bike', BIKE_X[1], BIKE_Z, BIKE_HEADING, '#7a1b24', '#d6d8dc'),
  E('razor-1', 'sport-bike', BIKE_X[2], BIKE_Z, BIKE_HEADING, '#e8461e', '#15161a'),
  E('razor-2', 'sport-bike', BIKE_X[3], BIKE_Z, BIKE_HEADING, '#1d6fd1', '#e9eef5'),
  // Iron Horse M.C. clubhouse lot: a row of bikes parked nose-in against the brick backdrop,
  // free to ride off whenever someone wants to go.
  { id: 'club-cruiser-1', type: 'cruiser-bike', position: [BIKE_ROW_X[0], MCURB + 0.55, BIKE_ROW_Z], heading: CLUB_BIKE_HEADING, paint: '#16171a', accent: '#c9a96a' },
  { id: 'club-chopper-1', type: 'chopper-bike', position: [BIKE_ROW_X[1], MCURB + 0.55, BIKE_ROW_Z], heading: CLUB_BIKE_HEADING, paint: '#7a1b24', accent: '#e8c75a' },
  { id: 'club-chopper-2', type: 'chopper-bike', position: [BIKE_ROW_X[2], MCURB + 0.55, BIKE_ROW_Z], heading: CLUB_BIKE_HEADING, paint: '#1b1b1f', accent: '#2fd3c3' },
  { id: 'club-cruiser-2', type: 'cruiser-bike', position: [BIKE_ROW_X[3], MCURB + 0.55, BIKE_ROW_Z], heading: CLUB_BIKE_HEADING, paint: '#2b4a3a', accent: '#f2c94c' },
  { id: 'club-razor-1', type: 'sport-bike', position: [BIKE_ROW_X[4], MCURB + 0.55, BIKE_ROW_Z], heading: CLUB_BIKE_HEADING, paint: '#e8461e', accent: '#15161a' },
  { id: 'club-dirt-1', type: 'dirt-bike', position: [BIKE_ROW_X[5], MCURB + 0.55, BIKE_ROW_Z], heading: CLUB_BIKE_HEADING, paint: '#ffb400', accent: '#1b1b1f' },
  // Emerald Links: a row of golf carts parked outside the clubhouse, free to drive.
  ...[['#f4f1ea', '#2f5a3c'], ['#f4f1ea', '#1f2f5c'], ['#e8e2cf', '#2f5a3c'], ['#f4f1ea', '#c9a24a']].map(([paint, accent], i) => (
    { id: 'cart-' + (i + 1), type: 'golf-cart', position: [CART_BAY.x + i * 2.2, GOLF_Y + 0.55, CART_BAY.z], heading: Math.PI / 2, paint, accent }
  )),
)
/** The jets sit on the Skyport pads (flight model in Jet.jsx). */
export const JET_SPAWNS = [
  { id: 'jet-1', type: 'stormer', position: [PADS[0].x, MCURB + 0.05, PADS[0].z], heading: 0, paint: '#bfc6ce', accent: '#1fb7a7' },
  { id: 'jet-2', type: 'cruiser-jet', position: [PADS[1].x, MCURB + 0.05, PADS[1].z], heading: 0, paint: '#15171b', accent: '#d9b25a' },
]
export const JET_TYPES = {
  stormer: {
    name: 'Stormer VTOL Jet', kind: 'Light vertical-takeoff jet',
    maxSpeed: 62, cruise: 46, accel: 14, climb: 15, turn: 1.15, style: 'stormer',
    seat: [1.2, 0.2, 0], length: 13, span: 9,
  },
  'cruiser-jet': {
    name: 'Skyline Cruiser Jet', kind: 'Executive vertical-takeoff jet',
    maxSpeed: 52, cruise: 38, accel: 10, climb: 12, turn: 0.9, style: 'cruiser',
    seat: [2.2, 0.2, -0.4], length: 16, span: 12,
  },
}

/** Parking stalls [row, index] left empty for the drivable vehicles above. */
export const RESERVED_STALLS = [[0, 1], [0, 9], [1, 3]]

export const useDriving = create(() => ({
  vehicleId: null, // the vehicle this visitor is driving
  speed: 0, // m/s, for the HUD
  gear: 'D',
  alt: null, // metres above the ground while flying
}))

/**
 * Build a drivable VEHICLE_TYPES-shaped entry for an imported model (see assets/assetStore.js -
 * a library asset of kind 'vehicle', placed in the world and marked drivable from the Asset
 * library panel). Dimensions come straight from the model's measured bounding box; physics
 * (mass, engine/brake force, suspension) are scaled from the closest built-in car by length, so
 * an imported sedan-sized model drives roughly like Aurelia Sedan and a truck-sized one drives
 * roughly like Voltline Pickup, without having to hand-tune every import. The visual body is the
 * model itself (style: 'imported'), not a procedural shape - see BodyFor/ImportedBody in Vehicle.jsx.
 */
export function vehicleTypeForImport(asset, inst) {
  const size = asset.size // [x, y, z] in the model's own units
  const length = Math.max(1.6, size[0] * inst.scale)
  const width = Math.max(0.8, size[2] * inst.scale)
  const height = Math.max(0.9, size[1] * inst.scale)
  // scale every tuning number off a reference sedan by length, so bigger models get
  // proportionally more mass, engine force and wheelbase instead of driving identically
  const ref = VEHICLE_TYPES['luxury-sedan']
  const k = length / ref.length
  const wheelBase = Math.max(1.0, length * 0.58)
  const track = Math.max(0.7, width * 0.82)
  const wheelRadius = THREE_clamp(height * 0.19, 0.22, 0.5)
  return {
    name: asset.name,
    kind: 'Imported vehicle',
    length, width, height,
    wheelBase, track, wheelRadius, wheelWidth: wheelRadius * 0.72,
    mass: Math.round(ref.mass * k * k * 0.6 + ref.mass * 0.25),
    com: height * 0.14,
    engineForce: Math.round(ref.engineForce * k),
    reverseForce: Math.round(ref.reverseForce * k),
    brakeForce: Math.round(ref.brakeForce * Math.sqrt(k)),
    maxSpeed: ref.maxSpeed,
    maxSteer: ref.maxSteer,
    suspension: { ...ref.suspension, rest: height * 0.16, travel: height * 0.1 },
    friction: ref.friction,
    driverSeat: [length * 0.08, height * 0.5, -width * 0.22],
    passengerSeats: [[length * 0.08, height * 0.5, width * 0.22], [-length * 0.25, height * 0.5, -width * 0.22], [-length * 0.25, height * 0.5, width * 0.22]],
    style: 'imported',
    assetId: asset.id,
    modelScale: inst.scale,
    hideWheels: true, // the imported model brings its own wheels; no separate wheel spin for now
    colliders: [{ half: [length / 2 - 0.05, height * 0.42, width / 2 - 0.05], at: [0, height * 0.46, 0] }],
  }
}
const THREE_clamp = (v, a, b) => Math.min(b, Math.max(a, v))

/** Wheel positions in chassis space: [x, z, steered]. Four wheels by default, a trike or a bike by layout. */
export function wheelLayout(T) {
  const L = T.wheelBase / 2, W = T.track / 2
  if (T.layout === 'bike') return [[L, 0, 1], [-L, 0, 0]]
  if (T.layout === 'trike') return [[L, -W, 1], [L, W, 1], [-L, 0, 0]]
  return [[L, -W, 1], [L, W, 1], [-L, -W, 0], [-L, W, 0]]
}

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
  [102, -30, 102, 9, -Math.PI / 2], // Vision Motors court, north-south lane (heading south)
  [96, -10, 112, -10, 0],
]
