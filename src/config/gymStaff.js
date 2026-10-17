import { go, hold } from './staff.js'
import { GYM_FLOOR as FY } from './gym.js'

// Staff and members of Storm Athletic Club. Same script format as config/staff.js; the members have a `wk` workout pose and
// stay on their machines (those machines are marked `auto` in Gym.jsx so they move, and are not offered to visitors).
// avatar yaw: 0 faces +z (south), PI faces -z (north)
const N = Math.PI, S = 0

export const GYM_AREA = { x: 51, z: -63, r: 70 }
export { FY }

// station spots (see Gym.jsx for the machine placements these match)
export const SPOTS = {
  treadmill: [55.5, -74.48, FY + 0.235],
  bike: [61.4, -69.03, FY],
  chest: [49, -57.55, FY],
  squat: [55, -52.5, FY + 0.1],
}

export const GYM_STAFF = [
  {
    id: 'jordan', name: 'Jordan', title: 'Front Desk', y: FY, skin: '#c98e63', speed: 0.9, role: 'reception',
    look: { build: 'm', hair: '#15100c', eyes: '#2a170e', top: '#a33cff', casual: true, sleeveless: false, bottom: '#1d1f26', shoe: '#f4f4f4', badge: true },
    start: [39.5, -76.2, S],
    plan: [
      hold(12, { yaw: S, g: ['write'], carry: 'tablet', stay: true, label: 'Checking in members on the tablet' }),
      go([[40.2, -76.2]]),
      hold(9, { yaw: S, g: ['open'], talk: 0.45, label: 'Welcoming people at the desk' }),
      go([[38.8, -76.2]]),
      hold(10, { yaw: S, g: ['read'], carry: 'tablet', stay: true, label: 'Updating the class schedule' }),
      go([[39.5, -76.2]]),
    ],
    lines: [
      'Welcome to Storm Athletic Club. Tap the desk to check in; your stats are kept on this device.',
      'Walk up to any machine and press the button to start. Space or walking away ends the set.',
      'Sauna is by the entrance, juice bar is on the south wall, and the turf is in the middle of the floor.',
    ],
  },
  {
    id: 'mia', name: 'Mia', title: 'Fuel Bar', y: FY, skin: '#e8b98e', speed: 0.9, role: 'bartender',
    look: { build: 'f', hairStyle: 'bun', hair: '#2a130d', eyes: '#3b2314', lips: '#b04a4a', modest: true, top: '#1de9d6', bottom: '#14243f', shoe: '#f4f4f4', apron: '#14243f', apronTrim: '#1de9d6', casual: true },
    start: [43.5, -50.15, N],
    plan: [
      hold(10, { yaw: N, g: ['shake'], carry: 'shaker', label: 'Shaking a protein shake' }),
      go([[44.3, -50.15]]),
      hold(8, { yaw: N, g: ['stir'], label: 'Blending a Green Surge smoothie' }),
      go([[42.8, -50.15]]),
      hold(9, { yaw: N, g: ['reach'], carry: 'glass', talk: 0.4, label: 'Serving a smoothie' }),
      go([[43.5, -50.15]]),
      hold(8, { yaw: N, g: ['wipe'], carry: 'towel', stay: true, label: 'Wiping down the bar' }),
    ],
    lines: [
      'The Green Surge is spinach, banana and pineapple. The protein shake is vanilla.',
      'Take a stool and cool down. Bar service is a menu board only for now, so no order button yet.',
      'Drink water between sets. The fountain is by the lockers.',
    ],
  },
  {
    id: 'reyes', name: 'Coach Reyes', title: 'Personal Trainer', y: FY, skin: '#a8714b', speed: 1.0, role: 'trainer',
    look: { build: 'm', hair: '#0d0a08', eyes: '#2a170e', top: '#ff4f5a', sleeveless: true, casual: true, bottom: '#14141a', shoe: '#f4f4f4', cap: '#14141a', whistle: '#ffd23f' },
    start: [48, -67, S],
    plan: [
      hold(10, { face: [52, -69.3], g: ['point', 'open'], talk: 0.4, label: 'Coaching form on the ellipticals' }),
      go([[58, -67]]),
      hold(10, { face: [61.4, -69.3], g: ['point'], talk: 0.4, label: 'Calling cadence on the spin bikes' }),
      go([[66, -67], [66.4, -61]]),
      hold(8, { face: [63, -61.5], g: ['open'], talk: 0.3, label: 'Setting up a turf circuit' }),
      go([[57, -60.6], [48, -60.6]]),
      hold(10, { face: [49, -57.6], g: ['read'], carry: 'clipboard', label: 'Logging a chest-press set' }),
      go([[48, -55], [53, -55]]),
      hold(10, { face: [55, -52.5], g: ['point', 'open'], talk: 0.4, label: 'Spotting a squat' }),
      go([[48, -55], [47.6, -62], [48, -67]]),
    ],
    lines: [
      'Keep your chest up, knees tracking over your toes. Slow down on the way back up.',
      'Pick a machine, warm up for five minutes, then work your way through the floor.',
      'The calorie counter uses a standard formula. The heart rate is a simulation, not a sensor.',
    ],
  },
  {
    id: 'ollie', shift: [6, 22], name: 'Ollie', title: 'Gym Attendant', y: FY, skin: '#f0cba6', speed: 0.95, role: 'cleaner',
    look: { build: 'm', hair: '#6a4a2a', eyes: '#3a4a2a', top: '#2a2f3a', casual: true, bottom: '#2a2f3a', shoe: '#e8e8ea', cap: '#2a2f3a', badge: true },
    start: [52, -72, S],
    plan: [
      hold(9, { face: [52, -74.6], g: ['wipe'], carry: 'towel', stay: true, label: 'Wiping down the treadmills' }),
      go([[58, -72], [62, -72]]),
      hold(9, { face: [62, -74.6], g: ['wipe'], carry: 'towel', stay: true, label: 'Wiping a treadmill console' }),
      go([[62, -67], [57, -66.5], [52, -66.5]]),
      hold(9, { face: [53, -64.2], g: ['wipe'], carry: 'towel', stay: true, label: 'Wiping down the rowers' }),
      go([[52, -61], [51, -55.2], [58, -55.2]]),
      hold(9, { face: [59.8, -57.6], g: ['wipe'], carry: 'towel', stay: true, label: 'Wiping the leg press pad' }),
      go([[52, -61], [52, -72]]),
    ],
    lines: [
      'Please wipe the machine when you finish. Towels are by the water fountain.',
      'Racks are for squats, benches are for resting between sets. Re-rack your weights.',
    ],
  },
  // ---- members mid-workout (stay on their machine)
  {
    id: 'alex', shift: [5, 11], name: 'Alex', title: 'Member · running', y: SPOTS.treadmill[2], skin: '#e8b98e', speed: 0, role: 'member',
    look: { build: 'm', hair: '#3a2a1a', eyes: '#2a3a4a', top: '#1de9d6', sleeveless: true, casual: true, bottom: '#14243f', shoe: '#ff5a5a' },
    start: [SPOTS.treadmill[0], SPOTS.treadmill[1], N],
    plan: [hold(99999, { yaw: N, wk: 'run', stay: true, label: 'Running on the treadmill' })],
    lines: ['Nine kilometres an hour, steady. Come find me when you have finished a run.'],
  },
  {
    id: 'priya', shift: [6, 20], name: 'Priya', title: 'Member · spin', y: SPOTS.bike[2], skin: '#b57a52', speed: 0, role: 'member',
    look: { build: 'f', hairStyle: 'bun', hair: '#0d0a08', eyes: '#2a170e', lips: '#a8424a', modest: true, top: '#ff7ad9', bottom: '#14141a', shoe: '#f4f4f4', casual: true },
    start: [SPOTS.bike[0], SPOTS.bike[1], N],
    plan: [hold(99999, { yaw: N, wk: 'bike', sit: true, sitH: 1.0, stay: true, label: 'Spinning' })],
    lines: ['Cadence over eighty. The trainer says it is all in the legs.'],
  },
  {
    id: 'sam', shift: [15, 22], name: 'Sam', title: 'Member · chest press', y: SPOTS.chest[2], skin: '#8a5a3b', speed: 0, role: 'member',
    look: { build: 'm', hair: '#0d0a08', eyes: '#2a170e', top: '#ffd23f', sleeveless: true, casual: true, bottom: '#222630', shoe: '#f4f4f4' },
    start: [SPOTS.chest[0], SPOTS.chest[1], N],
    plan: [hold(99999, { yaw: N, wk: 'press', sit: true, sitH: 0.5, stay: true, label: 'Chest press' })],
    lines: ['Third set. Coach is logging them.'],
  },
  {
    id: 'dana', shift: [17, 23.5], name: 'Dana', title: 'Member · squats', y: SPOTS.squat[2], skin: '#f0cba6', speed: 0, role: 'member',
    look: { build: 'f', hair: '#8a6a3a', eyes: '#4a6a8a', lips: '#b0645a', modest: true, top: '#a33cff', bottom: '#14141a', shoe: '#f4f4f4', casual: true },
    start: [SPOTS.squat[0], SPOTS.squat[1], S],
    plan: [hold(99999, { yaw: S, wk: 'squat', stay: true, label: 'Barbell squats' })],
    lines: ['Mirror check on every rep. Depth first, weight later.'],
  },
]
