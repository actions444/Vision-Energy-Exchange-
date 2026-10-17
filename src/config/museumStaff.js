import { go, hold, HELPERS } from './staff.js'
import { MUS_FLOOR } from './museum.js'

// Staff of the Museum of American Heritage (format: see config/staff.js). Avatar yaw: 0 faces +z (south), PI faces -z (north).
const { N, S, E, W } = HELPERS
const FY = MUS_FLOOR

export const MUSEUM_AREA = { x: 47, z: -103, r: 80 }

export const MUSEUM_STAFF = [
  {
    id: 'ada', name: 'Ada', title: 'Visitor Services', y: FY, skin: '#c68e63', speed: 0.9,
    look: { build: 'f', hairStyle: 'bob', hair: '#1d1d2b', eyes: '#2a170e', lips: '#9a3c4a', modest: true, blazer: true, top: '#1f2f5c', bottom: '#1f2f5c', shoe: '#14121a', badge: true, pendant: '#d4af5a' },
    start: [29.5, -111.7, S],
    plan: [
      hold(26, { yaw: S, g: ['open', 'point'], talk: 0.3, label: 'Welcoming visitors at the information desk' }),
      go([[27.8, -111.7]]),
      hold(10, { yaw: S, g: ['read'], carry: 'tablet', label: 'Checking the day\'s tour schedule' }),
      go([[31.3, -111.7]]),
      hold(9, { face: [31.2, -96.4], g: ['point'], talk: 0.25, label: 'Pointing visitors to the map table' }),
      go([[29.5, -111.7]]),
    ],
    lines: [
      'Welcome to the Museum of American Heritage. Admission is always free. Start with the map table, then follow the halls around the rotunda.',
      'Every exhibit has a placard. Press E in front of one to read it and stamp your passport.',
      'Try the exhibits that move: ring the bell, play the piano, tap the telegraph key, or put a record on the jukebox.',
    ],
  },
  {
    id: 'walt', name: 'Walt', title: 'Security', y: FY, skin: '#8a5a3b', speed: 0.85,
    look: { build: 'm', hair: '#101010', eyes: '#2a170e', top: '#f1f1ee', shirt: '#f1f1ee', tie: '#1c2433', bottom: '#1c2433', shoe: '#14121a', cap: '#1c2433', badge: true },
    start: [27.5, -99.5, E],
    plan: [
      hold(8, { yaw: E, g: ['blow'], carry: 'radio', label: 'Checking in by radio' }),
      go([[34.6, -99.6], [38.6, -101.5], [43.5, -99.8], [47, -99.8]]),
      hold(6, { face: [47, -103], g: ['brow'], label: 'Keeping an eye on the rotunda' }),
      go([[51, -99.8], [54.5, -103], [59.5, -103]]),
      hold(6, { yaw: E, g: ['brow'], label: 'Watching the Flight and Space hall' }),
      go([[60.4, -98.5], [63.25, -94.6], [63.25, -91.8], [56, -91.8], [47, -91.9], [40.2, -91.9], [38.2, -90.6], [36.4, -89.6]]),
      hold(5, { yaw: W, g: ['brow'], label: 'Watching the lunch counter' }),
      go([[33, -91.6], [33.5, -94.4], [34.8, -96.2], [34.8, -99.6], [27.5, -99.5]]),
    ],
    lines: [
      'Please do not climb on the exhibits. You can sit on the benches and the lunch counter stools, and you can ring the bell.',
      'Quiet day. I walk a loop through every hall about every ten minutes.',
      'The T. rex is a cast, but it is well guarded anyway.',
    ],
  },
  {
    id: 'iris', shift: [9, 17], name: 'Iris', title: 'Tour Guide', y: FY, skin: '#6b4630', speed: 0.95,
    look: { build: 'f', hairStyle: 'afro', hair: '#171212', eyes: '#2a170e', lips: '#8a2f3f', modest: true, blazer: true, top: '#7a2330', bottom: '#2a2330', shoe: '#14121a', glasses: true, glassesColor: '#c9a24a', badge: true },
    start: [33, -101, E],
    plan: [
      hold(12, { yaw: E, g: ['open', 'point'], talk: 0.4, label: 'Starting a tour in the foyer' }),
      go([[37.4, -101], [43, -100.4], [46.5, -100.2]]),
      hold(12, { face: [47, -103], g: ['point', 'open'], talk: 0.4, label: 'Telling the story of the Liberty Bell' }),
      go([[44.8, -106.4]]),
      hold(10, { face: [41.6, -108.4], g: ['open', 'point'], talk: 0.4, label: 'Explaining the Declaration of Independence' }),
      go([[49.8, -105.8], [54.5, -103.2], [59.2, -103.2]]),
      hold(10, { face: [63.2, -108.6], g: ['point', 'open'], talk: 0.4, label: 'Pointing out the Wright brothers\' aeroplane' }),
      go([[60.6, -100.6]]),
      hold(9, { face: [63, -99], g: ['point'], talk: 0.4, label: 'Describing Lindbergh\'s Atlantic flight' }),
      go([[59, -103], [54.5, -103], [51, -99.8], [43.5, -99.8], [38.6, -101.5], [33, -101]]),
    ],
    lines: [
      'I am running a tour: foyer, rotunda, then the Flight and Space hall. Walk with me and read the placards as we go.',
      'The Liberty Bell was cast in 1752, cracked, and recast twice in 1753. This replica is made to be rung.',
      'Lindbergh flew New York to Paris in about thirty-three and a half hours, alone, in May 1927.',
    ],
  },
  {
    id: 'nora', shift: [9, 17], name: 'Nora', title: 'Conservator', y: FY, skin: '#f0cba6', speed: 0.8,
    look: { build: 'f', hairStyle: 'bun', hair: '#8a6a3a', eyes: '#4a6a8a', lips: '#b0645a', modest: true, casual: true, top: '#f1f1ee', bottom: '#2a2f3a', shoe: '#d8d2c4', apron: '#d8d2c4', apronTrim: '#8f8a7e', glasses: true, glassesColor: '#2a2a31' },
    start: [62, -114.3, S],
    plan: [
      hold(14, { face: [63, -117.4], g: ['wipe'], carry: 'brush', label: 'Dusting the mineral case with a soft brush' }),
      go([[56.5, -114.3]]),
      hold(10, { face: [50, -117.3], g: ['read'], carry: 'tablet', label: 'Logging the condition of the T. rex mounts' }),
      go([[44.5, -114.3]]),
      hold(10, { face: [47, -117.3], g: ['wipe'], carry: 'brush', label: 'Brushing dust from the dais' }),
      go([[56.5, -114.3], [62, -114.3]]),
    ],
    lines: [
      'Dust is the enemy. A soft brush and a steady hand, and never touch the glass with bare fingers.',
      'This T. rex is a cast, taken from a real skeleton. Casts let a lot of museums show the same animal.',
      'Amethyst fades if it sits in strong sunlight for years, so the case lights are LED and low.',
    ],
  },
  {
    id: 'tess', shift: [10, 18], name: 'Tess', title: 'Docent · Voices for Equality', y: FY, skin: '#e8b98e', speed: 0.9,
    look: { build: 'f', hairStyle: 'bob', hair: '#5b3a29', eyes: '#2f4a3a', lips: '#a8424a', modest: true, blazer: true, top: '#2f5d5a', bottom: '#2a2330', shoe: '#14121a', badge: true },
    start: [33, -89.8, S],
    plan: [
      hold(26, { yaw: S, g: ['open', 'point'], talk: 0.4, label: 'Telling the story of the Greensboro sit-ins' }),
      go([[29.6, -91.2]]),
      hold(14, { face: [25.4, -89.4], g: ['point', 'open'], talk: 0.35, label: 'Explaining the Golden Door' }),
      go([[33, -91.2], [33, -89.8]]),
    ],
    lines: [
      'On February 1, 1960, four college students sat down at a lunch counter in Greensboro and asked to be served. They kept coming back.',
      'Sit on a stool and think about how long they waited. The counter was desegregated that summer.',
      'The torch beside the Golden Door stands for the Statue of Liberty. Millions of immigrants sailed beneath her.',
    ],
  },
]
