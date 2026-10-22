// Complete animation library for all avatar animations
// Categories: idle, emotes, work, social, dance, sport, special

export const ANIMATION_CATEGORIES = {
  idle: 'Idle',
  emote: 'Emotes',
  work: 'Work',
  social: 'Social',
  dance: 'Dance',
  sport: 'Sport',
  special: 'Special'
}

export const ANIMATIONS = {
  // ========== IDLE & MOVEMENT ==========
  idle: {
    id: 'idle',
    name: 'Standing Idle',
    category: 'idle',
    duration: 2.0,
    loopable: true,
    description: 'Default standing position'
  },
  idle_think: {
    id: 'idle_think',
    name: 'Thinking',
    category: 'idle',
    duration: 2.5,
    loopable: true,
    description: 'Contemplative pose'
  },
  idle_phone: {
    id: 'idle_phone',
    name: 'Phone Call',
    category: 'idle',
    duration: 2.0,
    loopable: true,
    description: 'Talking on phone'
  },
  walk: {
    id: 'walk',
    name: 'Walking',
    category: 'idle',
    duration: 1.0,
    loopable: true,
    description: 'Normal walking animation'
  },
  run: {
    id: 'run',
    name: 'Running',
    category: 'idle',
    duration: 0.8,
    loopable: true,
    description: 'Running motion'
  },

  // ========== EMOTES & EXPRESSIONS ==========
  wave: {
    id: 'wave',
    name: 'Wave',
    category: 'emote',
    duration: 1.2,
    loopable: false,
    description: 'Wave hello'
  },
  laugh_01: {
    id: 'laugh_01',
    name: 'Laugh',
    category: 'emote',
    duration: 2.0,
    loopable: false,
    description: 'Laughing animation'
  },
  laugh_02: {
    id: 'laugh_02',
    name: 'Laugh Hard',
    category: 'emote',
    duration: 2.5,
    loopable: false,
    description: 'Heavy laughing'
  },
  cry: {
    id: 'cry',
    name: 'Cry',
    category: 'emote',
    duration: 2.0,
    loopable: false,
    description: 'Crying animation'
  },
  shocked: {
    id: 'shocked',
    name: 'Shocked',
    category: 'emote',
    duration: 1.5,
    loopable: false,
    description: 'Surprised reaction'
  },
  angry: {
    id: 'angry',
    name: 'Angry',
    category: 'emote',
    duration: 1.8,
    loopable: false,
    description: 'Angry pose'
  },
  confused: {
    id: 'confused',
    name: 'Confused',
    category: 'emote',
    duration: 1.5,
    loopable: true,
    description: 'Confused gesture'
  },
  shrug: {
    id: 'shrug',
    name: 'Shrug',
    category: 'emote',
    duration: 1.0,
    loopable: false,
    description: 'Shoulder shrug'
  },
  nod: {
    id: 'nod',
    name: 'Nod Yes',
    category: 'emote',
    duration: 1.2,
    loopable: false,
    description: 'Nodding yes'
  },
  headshake: {
    id: 'headshake',
    name: 'Head Shake',
    category: 'emote',
    duration: 1.2,
    loopable: false,
    description: 'Shaking head no'
  },
  point: {
    id: 'point',
    name: 'Point',
    category: 'emote',
    duration: 1.5,
    loopable: false,
    description: 'Pointing at something'
  },
  thumbs_up: {
    id: 'thumbs_up',
    name: 'Thumbs Up',
    category: 'emote',
    duration: 1.2,
    loopable: false,
    description: 'Thumbs up gesture'
  },
  thumbs_down: {
    id: 'thumbs_down',
    name: 'Thumbs Down',
    category: 'emote',
    duration: 1.2,
    loopable: false,
    description: 'Thumbs down gesture'
  },
  clap: {
    id: 'clap',
    name: 'Clap',
    category: 'emote',
    duration: 1.8,
    loopable: true,
    description: 'Clapping hands'
  },
  salute: {
    id: 'salute',
    name: 'Salute',
    category: 'emote',
    duration: 1.2,
    loopable: false,
    description: 'Military salute'
  },

  // ========== SOCIAL INTERACTIONS ==========
  hug: {
    id: 'hug',
    name: 'Hug',
    category: 'social',
    duration: 2.5,
    loopable: false,
    description: 'Hugging gesture'
  },
  handshake: {
    id: 'handshake',
    name: 'Handshake',
    category: 'social',
    duration: 2.0,
    loopable: false,
    description: 'Shaking hands'
  },
  kiss_hand: {
    id: 'kiss_hand',
    name: 'Kiss Hand',
    category: 'social',
    duration: 1.5,
    loopable: false,
    description: 'Blowing a kiss'
  },
  bow: {
    id: 'bow',
    name: 'Bow',
    category: 'social',
    duration: 2.0,
    loopable: false,
    description: 'Respectful bow'
  },
  sit_ground: {
    id: 'sit_ground',
    name: 'Sit Down',
    category: 'social',
    duration: 1.5,
    loopable: true,
    description: 'Sitting on ground'
  },
  sit_chair: {
    id: 'sit_chair',
    name: 'Sit in Chair',
    category: 'social',
    duration: 1.2,
    loopable: true,
    description: 'Sitting in chair'
  },
  stretch: {
    id: 'stretch',
    name: 'Stretch',
    category: 'social',
    duration: 2.0,
    loopable: false,
    description: 'Full body stretch'
  },

  // ========== WORK ANIMATIONS ==========
  work_type: {
    id: 'work_type',
    name: 'Typing',
    category: 'work',
    duration: 1.5,
    loopable: true,
    description: 'Typing on keyboard'
  },
  work_write: {
    id: 'work_write',
    name: 'Writing',
    category: 'work',
    duration: 1.8,
    loopable: true,
    description: 'Writing on paper'
  },
  lift_heavy: {
    id: 'lift_heavy',
    name: 'Lift Heavy',
    category: 'work',
    duration: 2.0,
    loopable: false,
    description: 'Lifting heavy object'
  },
  carry_box: {
    id: 'carry_box',
    name: 'Carry Box',
    category: 'work',
    duration: 1.0,
    loopable: true,
    description: 'Carrying a box'
  },
  work_cook: {
    id: 'work_cook',
    name: 'Cooking',
    category: 'work',
    duration: 2.0,
    loopable: true,
    description: 'Cooking motion'
  },
  work_clean: {
    id: 'work_clean',
    name: 'Cleaning',
    category: 'work',
    duration: 1.5,
    loopable: true,
    description: 'Sweeping/cleaning'
  },
  work_garden: {
    id: 'work_garden',
    name: 'Gardening',
    category: 'work',
    duration: 2.0,
    loopable: true,
    description: 'Gardening motion'
  },
  work_build: {
    id: 'work_build',
    name: 'Building',
    category: 'work',
    duration: 1.8,
    loopable: true,
    description: 'Construction work'
  },

  // ========== DANCE ANIMATIONS ==========
  dance_01: {
    id: 'dance_01',
    name: 'Dance Step 1',
    category: 'dance',
    duration: 2.0,
    loopable: true,
    description: 'Basic dancing'
  },
  dance_02: {
    id: 'dance_02',
    name: 'Dance Step 2',
    category: 'dance',
    duration: 2.0,
    loopable: true,
    description: 'Hip hop dance'
  },
  dance_03: {
    id: 'dance_03',
    name: 'Dance Step 3',
    category: 'dance',
    duration: 2.0,
    loopable: true,
    description: 'Smooth dance'
  },
  dance_twerk: {
    id: 'dance_twerk',
    name: 'Twerk',
    category: 'dance',
    duration: 2.0,
    loopable: true,
    description: 'Twerking'
  },
  dance_salsa: {
    id: 'dance_salsa',
    name: 'Salsa',
    category: 'dance',
    duration: 2.0,
    loopable: true,
    description: 'Salsa dancing'
  },

  // ========== SPORT/FITNESS ==========
  jump: {
    id: 'jump',
    name: 'Jump',
    category: 'sport',
    duration: 1.2,
    loopable: false,
    description: 'Jumping motion'
  },
  jump_rope_01: {
    id: 'jump_rope_01',
    name: 'Jump Rope 1',
    category: 'sport',
    duration: 1.5,
    loopable: true,
    description: 'Jumping rope'
  },
  jump_rope_02: {
    id: 'jump_rope_02',
    name: 'Jump Rope 2',
    category: 'sport',
    duration: 1.5,
    loopable: true,
    description: 'Double jump rope'
  },
  punch: {
    id: 'punch',
    name: 'Punch',
    category: 'sport',
    duration: 1.0,
    loopable: false,
    description: 'Throwing a punch'
  },
  kick: {
    id: 'kick',
    name: 'Kick',
    category: 'sport',
    duration: 1.2,
    loopable: false,
    description: 'Kicking motion'
  },
  boxing: {
    id: 'boxing',
    name: 'Boxing',
    category: 'sport',
    duration: 1.5,
    loopable: true,
    description: 'Boxing stance'
  },

  // ========== SPECIAL ANIMATIONS ==========
  flex: {
    id: 'flex',
    name: 'Flex Muscles',
    category: 'special',
    duration: 1.5,
    loopable: false,
    description: 'Showing muscles'
  },
  victory: {
    id: 'victory',
    name: 'Victory',
    category: 'special',
    duration: 2.0,
    loopable: false,
    description: 'Victory pose'
  },
  defeat: {
    id: 'defeat',
    name: 'Defeat',
    category: 'special',
    duration: 2.0,
    loopable: false,
    description: 'Defeated pose'
  },
  sleep: {
    id: 'sleep',
    name: 'Sleep',
    category: 'special',
    duration: 2.0,
    loopable: true,
    description: 'Sleeping pose'
  },
  meditate: {
    id: 'meditate',
    name: 'Meditate',
    category: 'special',
    duration: 3.0,
    loopable: true,
    description: 'Meditation pose'
  },
  yoga: {
    id: 'yoga',
    name: 'Yoga Pose',
    category: 'special',
    duration: 2.0,
    loopable: true,
    description: 'Yoga position'
  },
  make_a_cup_of_tea: {
    id: 'make_a_cup_of_tea',
    name: 'Make Tea',
    category: 'special',
    duration: 2.5,
    loopable: false,
    description: 'Making tea'
  },
  look_around: {
    id: 'look_around',
    name: 'Look Around',
    category: 'special',
    duration: 2.0,
    loopable: true,
    description: 'Looking around curious'
  }
}

// Group animations by category
export function getAnimationsByCategory(category) {
  return Object.values(ANIMATIONS).filter(anim => anim.category === category)
}

// Get all animation categories with animations
export function getAnimationsCategorized() {
  const result = {}
  Object.keys(ANIMATION_CATEGORIES).forEach(cat => {
    result[cat] = getAnimationsByCategory(cat)
  })
  return result
}

// Quick lookup by ID
export function getAnimationById(id) {
  return ANIMATIONS[id]
}

// Get keyboard shortcuts for quick access
export const ANIMATION_HOTKEYS = {
  'e': 'wave',           // E = Emote/wave
  'l': 'laugh_01',       // L = Laugh
  'd': 'dance_01',       // D = Dance
  'h': 'hug',            // H = Hug
  's': 'sit_ground',     // S = Sit
  'f': 'flex',           // F = Flex
  'v': 'victory',        // V = Victory
  ' ': 'jump',           // Space = Jump
  'c': 'clap',           // C = Clap
  'p': 'point',          // P = Point
}
