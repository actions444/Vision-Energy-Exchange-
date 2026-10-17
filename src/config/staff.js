import { VY } from './island.js'

// Staff of the Isla Serena Pool Lounge: full-avatar NPCs that work scripted shifts.
// A plan is a loop of acts:
//   go(path, o)    walk the waypoints [[x, z], ...]
//   hold(t, o)     stand and work for t seconds: o = { yaw | face:[x,z], g: gesture(s), carry, talk, sweep, label }
// `carry` shows a prop in the hands (tray, trayEmpty, towels, shaker, glass, net, can, clipboard).
// Gestures come from the avatar: tray, shake, wipe, brow, blow, stir, reach, hold, open, point, write, read, chest.

export const DECK = VY + 0.02 // terrace and lounge floor
export const ROOF_Y = VY + 3.6 + 0.46 // sky deck (see SkyDeck.jsx)
export const STAFF_AREA = { x: 301, z: -88, r: 95 } // staff are drawn when the camera is within r of this point

// avatar yaw: 0 faces +z (south, toward the pool from the villa), PI faces -z (north)
const N = Math.PI, S = 0, E = Math.PI / 2, W = -Math.PI / 2

export const go = (path, o = {}) => ({ k: 'go', path, ...o })
export const hold = (t, o = {}) => ({ k: 'hold', t, ...o })
const rev = (p) => p.slice().reverse()

// ------------------------------------------------------------------ shared lanes on the pool deck
const LANE_G = -77.2 // lifeguard lane: along the north coping
const LANE_S = -78.05 // service lane, one step further from the water
const BAR_PICK = [311.5, -75.5] // in front of the Sunset Bar, between two stools
const BAR_BACK_X = 314.2 // behind the Sunset Bar counter

// ------------------------------------------------------------------ the roster
export const STAFF = [
  {
    id: 'marcus', name: 'Marcus', title: 'Lifeguard', y: DECK, skin: '#8a5a3b', speed: 0.85, role: 'lifeguard',
    look: { build: 'm', hair: '#0d0a08', eyes: '#2a170e', top: '#e63946', sleeveless: true, casual: true, bottom: '#14243f', shoe: '#f4f4f4', cap: '#e63946', whistle: '#ffd23f', glasses: true, glassesColor: '#141414' },
    start: [306, LANE_G, S],
    plan: [
      hold(26, { yaw: S, g: ['brow'], sweep: 0.55, label: 'Watching the deep end' }),
      go([[300.5, LANE_G]]),
      hold(20, { yaw: S, g: ['brow'], sweep: 0.5, label: 'Watching the middle of the pool' }),
      go([[302.3, LANE_G + 0.25]]),
      hold(7, { yaw: N, g: ['hold'], label: 'Checking the rescue ring' }),
      go([[296.5, LANE_G]]),
      hold(22, { yaw: S, g: ['brow'], sweep: 0.5, label: 'Watching the shallow end' }),
      go([[294.2, LANE_G], [293.6, -75.9]]),
      hold(6, { yaw: E, g: ['point'], label: 'Checking the steps and ladders' }),
      go([[294.2, LANE_G], [300.5, LANE_G]]),
    ],
    lines: [
      'Swim as long as you like. If you stay under too long I will blow the whistle and bring you out.',
      'No running on the deck, and no diving in the shallow end. The deep end is by the board.',
      'The water is three metres at the deep end. Use the ladders on the north wall or the steps at the west end to get out.',
      'Hold C to dive and Space to come back up. Push off the wall with Space if you want a quick start.',
    ],
  },
  {
    id: 'dani', shift: [9, 19], name: 'Dani', title: 'Pool Attendant', y: DECK, skin: '#e8b98e', speed: 1.1,
    look: { build: 'f', hairStyle: 'bun', hair: '#2a130d', eyes: '#3b2314', lips: '#b04a4a', modest: true, top: '#2fd0c4', bottom: '#f4efff', shoe: '#f4f4f4', cap: '#2fd0c4', casual: true },
    start: [313.7, -78.4, N],
    plan: [
      hold(5, { yaw: N, g: ['hold'], carry: 'towels', label: 'Loading rolled towels from the towel cart' }),
      go([[313.7, LANE_S], [309.8, LANE_S]], { carry: 'towels' }),
      hold(4, { yaw: N, g: ['reach'], carry: 'towels', label: 'Setting out fresh towels on the loungers' }),
      go([[307.4, LANE_S]], { carry: 'towels' }),
      hold(4, { yaw: N, g: ['reach'], carry: 'towels', label: 'Setting out fresh towels on the loungers' }),
      go([[294.6, LANE_S]], { carry: 'towels' }),
      hold(4, { yaw: N, g: ['reach'], carry: 'towels', label: 'Setting out fresh towels on the loungers' }),
      go([[292.2, LANE_S]], { carry: 'towels' }),
      hold(4, { yaw: N, g: ['reach'], carry: 'towels', label: 'Setting out fresh towels on the loungers' }),
      go([[291.4, LANE_S], [291.9, -73.7]]),
      hold(30, { yaw: E, g: ['hold'], carry: 'net', label: 'Skimming leaves off the pool with the net' }),
      go([[291.4, LANE_S], [300, LANE_S], [313.7, LANE_S], [313.7, -78.4]]),
    ],
    lines: [
      'Fresh towels on every lounger. The pink ones go fast.',
      'I skim the pool every morning and again after lunch. The wind blows petals in from the planters.',
      'Need a towel? Take one from the cart by the east planters.',
    ],
  },
  {
    id: 'jules', name: 'Jules', title: 'Bartender · Sunset Bar', y: DECK, skin: '#5c3b28', speed: 0.9, role: 'bartender',
    look: { build: 'm', hair: '#0b0910', beard: true, eyes: '#1d130d', top: '#14121a', shirt: '#f4efff', tie: '#ff2e9a', bottom: '#14121a', apron: '#1b1826', apronTrim: '#c9a96a' },
    start: [BAR_BACK_X, -74.4, W],
    plan: [
      go([[BAR_BACK_X, -74.4]]),
      hold(9, { yaw: W, g: ['shake'], carry: 'shaker', label: 'Shaking a Mango Rum Cooler' }),
      go([[BAR_BACK_X, -75.4]]),
      hold(5, { yaw: W, g: ['reach'], carry: 'glass', label: 'Plating a drink for the server' }),
      go([[BAR_BACK_X, -73.3]]),
      hold(10, { yaw: W, g: ['wipe'], label: 'Wiping down the bar' }),
      go([[BAR_BACK_X, -72.2]]),
      hold(9, { yaw: W, g: ['stir'], label: 'Muddling mint for a Teal Lagoon' }),
      go([[BAR_BACK_X, -71.4]]),
      hold(7, { yaw: W, g: ['open', 'chest'], talk: 0.35, label: 'Chatting with the guests at the bar' }),
    ],
    lines: [
      'Today\'s specials: Mango Rum Cooler, Teal Lagoon, Pink Hibiscus Spritz, Yellow Sun Lemonade. Mocktails on request.',
      'I have been behind this bar since the doors opened. Best seat in the house is the one facing the water.',
      'Tara takes the drinks round to the loungers. Wave her down if you want one on the deck.',
    ],
  },
  {
    id: 'tara', shift: [10, 22], name: 'Tara', title: 'Terrace Server', y: DECK, skin: '#d9a37a', speed: 1.15,
    look: { build: 'f', hair: '#1a1a1a', eyes: '#2a170e', lips: '#a0344f', blazer: true, modest: true, top: '#14121a', bottom: '#14121a', shoe: '#14121a', apron: '#e0559f', apronTrim: '#c9a96a' },
    start: [BAR_PICK[0], BAR_PICK[1], E],
    plan: [
      hold(8, { face: [BAR_BACK_X, -75.4], g: ['reach'], label: 'Collecting drinks from the Sunset Bar' }),
      go([[311.5, LANE_S], [309.4, LANE_S]], { carry: 'tray' }),
      hold(5, { yaw: N, g: ['tray'], carry: 'tray', label: 'Serving the east loungers' }),
      go([[300.5, LANE_S], [294.0, LANE_S], [291.5, LANE_S]], { carry: 'tray' }),
      hold(4, { yaw: N, g: ['tray'], carry: 'tray', label: 'Serving the west loungers' }),
      go([[291.5, -75.6]], { carry: 'tray' }),
      hold(5, { yaw: W, g: ['tray'], carry: 'tray', label: 'Serving the cabana' }),
      go([[291.5, -71.7]], { carry: 'trayEmpty' }),
      hold(5, { yaw: W, g: ['tray'], carry: 'trayEmpty', label: 'Clearing glasses at the second cabana' }),
      go([[291.5, LANE_S], [300.5, LANE_S], [311.5, LANE_S], BAR_PICK], { carry: 'trayEmpty' }),
    ],
    lines: [
      'Drinks on the deck? Just sit on a lounger and I will be around. The Pink Hibiscus Spritz is the favourite.',
      'Careful on the deck, the marble gets slick near the pool.',
      'I do the loop from the bar to the cabanas about every ten minutes.',
    ],
  },
  {
    id: 'ro', shift: [6, 16], name: 'Ro', title: 'Groundskeeper', y: DECK, skin: '#b07a52', speed: 0.9,
    look: { build: 'm', hair: '#2a1a10', beard: false, eyes: '#2f1d12', top: '#3d7a4a', casual: true, bottom: '#4a4033', shoe: '#3a2a18', cap: '#c9b38a' },
    start: [298.3, -79.1, N],
    plan: [
      hold(14, { yaw: N, g: ['reach'], carry: 'can', label: 'Watering the fiddle-leaf fig' }),
      go([[301, -79.1], [303.7, -79.1]], { carry: 'can' }),
      hold(14, { yaw: N, g: ['reach'], carry: 'can', label: 'Watering the fiddle-leaf fig' }),
      go([[309.0, -78.9], [315.0, -78.9]], { carry: 'can' }),
      hold(12, { yaw: N, g: ['reach'], carry: 'can', label: 'Watering the areca palm' }),
      go([[309.0, -78.9], [303.7, -78.9], [298.3, -78.9]], { carry: 'can' }),
    ],
    lines: [
      'The fig likes morning water and the palm likes the afternoon. Everything here gets watered twice a day.',
      'Salt air is hard on leaves. I rinse the big ones down every Sunday.',
    ],
  },
  // ---------------------------------------------------------------- inside the Pool Lounge
  {
    id: 'camille', shift: [10, 20], name: 'Camille', title: 'Lounge Host', y: DECK, skin: '#f1c8a4', speed: 1.0,
    look: { build: 'f', hairStyle: 'bob', hair: '#3a2a40', eyes: '#3a2316', lips: '#b0334f', modest: true, blazer: true, top: '#3b1d63', bottom: '#14121a', shoe: '#14121a', badge: true, pendant: '#d4af5a' },
    start: [298.8, -83.6, S],
    plan: [
      hold(24, { yaw: S, g: ['write', 'open'], carry: 'clipboard', talk: 0.25, label: 'Greeting guests at the door' }),
      go([[300.0, -86.6], [300.2, -91.0], [300.4, -92.9]]),
      hold(9, { yaw: W, g: ['open', 'point'], talk: 0.3, label: 'Showing guests to the lounge seating' }),
      go([[300.2, -91.0], [303.0, -86.0], [308.1, -83.5]]),
      hold(9, { yaw: N, g: ['point', 'open'], talk: 0.3, label: 'Checking the Terrace Dining tables' }),
      go([[303.0, -83.8], [298.8, -83.6]]),
    ],
    lines: [
      'Welcome to the Isla Serena Pool Lounge. Lounge seating is on the left, Terrace Dining by the window, and the Lagoon Bar at the back.',
      'The changing rooms are in the west corner, with lockers and a shower. Pool is straight through the glass doors.',
      'Take the stairs up the west side to the Sky Deck. Zoe is making Sunset Spritzes up there.',
    ],
  },
  {
    id: 'andre', name: 'Andre', title: 'Bartender · Lagoon Bar', y: DECK, skin: '#8a5a3b', speed: 0.9, role: 'bartender',
    look: { build: 'm', hair: '#0b0b0e', eyes: '#1d130d', glasses: true, glassesColor: '#2a2a31', top: '#1b1826', shirt: '#f4efff', tie: '#2fd0c4', bottom: '#14121a', apron: '#0b0b0e', apronTrim: '#ffe83d' },
    start: [312.4, -95.4, W],
    plan: [
      hold(9, { yaw: W, g: ['shake'], carry: 'shaker', label: 'Shaking a Teal Lagoon' }),
      go([[312.4, -94.2]]),
      hold(5, { yaw: W, g: ['reach'], carry: 'glass', label: 'Plating a drink for the runner' }),
      go([[312.4, -92.4]]),
      hold(10, { yaw: W, g: ['wipe'], label: 'Wiping down the bar' }),
      go([[312.4, -90.8]]),
      hold(9, { yaw: W, g: ['stir'], label: 'Stirring a Pink Hibiscus Spritz' }),
      go([[312.4, -89.4]]),
      hold(8, { yaw: W, g: ['open', 'chest'], talk: 0.35, label: 'Chatting with the guests at the bar' }),
      go([[312.4, -95.4]]),
    ],
    lines: [
      'Lagoon Bar: cocktails, mocktails and small plates. Everything is made to order.',
      'The Teal Lagoon is our signature. Blue curacao, lime and a lot of ice.',
      'Leo runs the drinks to the dining tables. If you sit by the window he will find you.',
    ],
  },
  {
    id: 'leo', shift: [11, 21], name: 'Leo', title: 'Food & Drink Runner', y: DECK, skin: '#e8b98e', speed: 1.15,
    look: { build: 'm', hair: '#6b4a2a', eyes: '#3a2316', casual: true, top: '#f4efff', bottom: '#14121a', shoe: '#14121a', apron: '#14121a', apronTrim: '#2fd0c4' },
    start: [309.6, -93.1, E],
    plan: [
      hold(7, { face: [312.4, -94.2], g: ['reach'], label: 'Collecting drinks from the Lagoon Bar' }),
      go([[309.0, -90.0], [308.1, -87.8], [307.6, -84.9]], { carry: 'tray' }),
      hold(5, { face: [306.4, -85.6], g: ['tray'], carry: 'tray', label: 'Serving the first dining table' }),
      go([[308.1, -84.2], [309.05, -84.85]], { carry: 'tray' }),
      hold(5, { face: [309.8, -85.6], g: ['tray'], carry: 'trayEmpty', label: 'Serving the second dining table' }),
      go([[308.1, -87.8], [309.0, -90.0], [309.6, -93.1]], { carry: 'trayEmpty' }),
    ],
    lines: [
      'Window tables first, then the bar. That is the whole job, and I love it.',
      'Careful, hot plates coming through!',
    ],
  },
  // ---------------------------------------------------------------- Sky Deck
  {
    id: 'zoe', shift: [17, 24], name: 'Zoe', title: 'Mixologist · Sky Bar', y: ROOF_Y, skin: '#f1c8a4', speed: 0.9, role: 'bartender',
    look: { build: 'f', hairStyle: 'bun', hair: '#c9a96a', eyes: '#5c7a8a', lips: '#c2405e', modest: true, top: '#14121a', casual: true, bottom: '#14121a', shoe: '#14121a', apron: '#6b2fb3', apronTrim: '#ffe83d', hoops: true },
    start: [313.6, -82.0, W],
    plan: [
      hold(9, { yaw: W, g: ['shake'], carry: 'shaker', label: 'Shaking a Sunset Spritz' }),
      go([[313.6, -82.9]]),
      hold(8, { yaw: W, g: ['stir'], label: 'Building a Pink Hibiscus Spritz' }),
      go([[313.6, -83.7]]),
      hold(9, { yaw: W, g: ['wipe'], label: 'Wiping down the Sky Bar' }),
      go([[313.6, -82.4]]),
      hold(8, { yaw: W, g: ['open', 'chest'], talk: 0.35, label: 'Chatting with guests on the Sky Deck' }),
      go([[313.6, -82.0]]),
    ],
    lines: [
      'The Sunset Spritz is best an hour before dark, when the whole lagoon turns pink.',
      'Sky Bar: spritzes and mocktails, with the best view on the island.',
    ],
  },
]

export const HELPERS = { N, S, E, W, rev }
