// Crime missions and heists for GTA-style gameplay

export const CRIME_TYPES = {
  robbery: 'Robbery',
  heist: 'Heist',
  carjack: 'Carjacking',
  theft: 'Theft',
  assassination: 'Assassination',
  trafficking: 'Trafficking',
  turf_war: 'Turf War'
}

export const CRIMES = {
  // ===== ROBBERIES =====
  store_robbery: {
    id: 'store_robbery',
    name: 'Gas Station Robbery',
    type: 'robbery',
    difficulty: 1,
    location: 'downtown',
    reward: 500,
    wanted: 1,
    duration: 120, // seconds
    objectives: [
      'Enter the store',
      'Point gun at clerk',
      'Steal cash register',
      'Escape police',
      'Hide from police for 60 seconds'
    ],
    description: 'Rob a gas station for quick cash',
    emoji: '🏪'
  },

  bank_robbery: {
    id: 'bank_robbery',
    name: 'Bank Heist',
    type: 'heist',
    difficulty: 4,
    location: 'downtown',
    reward: 5000,
    wanted: 4,
    duration: 600,
    objectives: [
      'Get security uniform',
      'Hack security system',
      'Disable cameras',
      'Crack vault',
      'Collect money bags',
      'Get to getaway vehicle',
      'Escape to safehouse'
    ],
    description: 'Professional bank robbery - high risk, high reward',
    emoji: '🏦',
    requirements: {
      minLevel: 10,
      weapons: ['rifle'],
      team: 2
    }
  },

  jewelry_store: {
    id: 'jewelry_store',
    name: 'Jewelry Store Robbery',
    type: 'robbery',
    difficulty: 2,
    location: 'downtown',
    reward: 1500,
    wanted: 2,
    duration: 180,
    objectives: [
      'Enter jewelry store',
      'Break display cases',
      'Collect jewelry',
      'Escape without getting caught'
    ],
    description: 'Rob a jewelry store for valuable items',
    emoji: '💎'
  },

  armory_heist: {
    id: 'armory_heist',
    name: 'Military Armory Heist',
    type: 'heist',
    difficulty: 5,
    location: 'industrial',
    reward: 8000,
    wanted: 5,
    duration: 900,
    objectives: [
      'Infiltrate military base',
      'Plant explosives',
      'Disable guards',
      'Access weapons vault',
      'Steal weapons cache',
      'Escape with wanted level 5'
    ],
    description: 'High-level heist - steal military weapons',
    emoji: '🎖️',
    requirements: {
      minLevel: 20,
      weapons: ['rifle', 'grenade'],
      team: 3
    }
  },

  // ===== CARJACKING =====
  carjack_rare: {
    id: 'carjack_rare',
    name: 'Steal Rare Vehicle',
    type: 'carjack',
    difficulty: 2,
    location: 'downtown',
    reward: 2000,
    wanted: 2,
    duration: 300,
    objectives: [
      'Find target vehicle',
      'Break in or hotwire',
      'Evade owner',
      'Deliver to chop shop'
    ],
    description: 'Steal a high-value vehicle for resale',
    emoji: '🚗'
  },

  carjack_convoy: {
    id: 'carjack_convoy',
    name: 'Hijack Armored Truck',
    type: 'carjack',
    difficulty: 4,
    location: 'downtown',
    reward: 4000,
    wanted: 3,
    duration: 480,
    objectives: [
      'Locate armored truck',
      'Stop the truck',
      'Break into cargo',
      'Defend against guards',
      'Escape with cargo'
    ],
    description: 'Dangerous: steal from moving armored vehicle',
    emoji: '🚛'
  },

  // ===== THEFT =====
  art_theft: {
    id: 'art_theft',
    name: 'Art Gallery Theft',
    type: 'theft',
    difficulty: 3,
    location: 'downtown',
    reward: 3000,
    wanted: 2,
    duration: 300,
    objectives: [
      'Bypass gallery security',
      'Locate valuable paintings',
      'Avoid guards',
      'Exit without detection'
    ],
    description: 'Steal priceless art without alerting guards',
    emoji: '🖼️'
  },

  warehouse_theft: {
    id: 'warehouse_theft',
    name: 'Warehouse Raid',
    type: 'theft',
    difficulty: 2,
    location: 'industrial',
    reward: 2500,
    wanted: 1,
    duration: 240,
    objectives: [
      'Break into warehouse',
      'Find merchandise',
      'Load cargo vehicle',
      'Escape undetected'
    ],
    description: 'Steal merchandise from a warehouse',
    emoji: '📦'
  },

  // ===== ASSASSINATION =====
  hit_rival_gang: {
    id: 'hit_rival_gang',
    name: 'Eliminate Rival Gang Leader',
    type: 'assassination',
    difficulty: 3,
    location: 'downtown',
    reward: 3500,
    wanted: 3,
    duration: 300,
    objectives: [
      'Scout target location',
      'Identify target',
      'Get into position',
      'Eliminate target',
      'Escape location'
    ],
    description: 'Assassinate rival gang leader for turf control',
    emoji: '🎯'
  },

  hit_witness: {
    id: 'hit_witness',
    name: 'Silence Witness',
    type: 'assassination',
    difficulty: 2,
    location: 'downtown',
    reward: 2000,
    wanted: 2,
    duration: 180,
    objectives: [
      'Find witness',
      'Eliminate witness',
      'Leave no evidence'
    ],
    description: 'Quick assassination - silence a witness',
    emoji: '🔫'
  },

  // ===== TRAFFICKING =====
  drug_run: {
    id: 'drug_run',
    name: 'Drug Delivery',
    type: 'trafficking',
    difficulty: 2,
    location: 'downtown',
    reward: 1500,
    wanted: 2,
    duration: 240,
    objectives: [
      'Pick up drugs from supplier',
      'Avoid police',
      'Deliver to dealer',
      'Collect payment'
    ],
    description: 'Transport drugs across city',
    emoji: '🚗'
  },

  weapon_smuggling: {
    id: 'weapon_smuggling',
    name: 'Weapon Smuggling',
    type: 'trafficking',
    difficulty: 3,
    location: 'industrial',
    reward: 3000,
    wanted: 3,
    duration: 360,
    objectives: [
      'Get to border crossing',
      'Avoid customs inspection',
      'Deliver weapons',
      'Escape without arrest'
    ],
    description: 'Smuggle weapons across territory boundaries',
    emoji: '🔫'
  },

  // ===== TURF WARS =====
  turf_takeover: {
    id: 'turf_takeover',
    name: 'Take Over Territory',
    type: 'turf_war',
    difficulty: 4,
    location: 'downtown',
    reward: 5000,
    wanted: 4,
    duration: 600,
    objectives: [
      'Eliminate defending gang',
      'Plant gang flag',
      'Defend against counter-attack',
      'Hold position for 3 minutes'
    ],
    description: 'Gang warfare - take control of territory',
    emoji: '🏴'
  }
}

// Get crime by ID
export function getCrime(id) {
  return CRIMES[id]
}

// Get crimes by type
export function getCrimesByType(type) {
  return Object.values(CRIMES).filter(c => c.type === type)
}

// Get crimes by difficulty
export function getCrimesByDifficulty(difficulty) {
  return Object.values(CRIMES).filter(c => c.difficulty === difficulty)
}

// Get all crimes organized by type
export function getCrimesCategorized() {
  const result = {}
  Object.keys(CRIME_TYPES).forEach(type => {
    result[type] = getCrimesByType(type)
  })
  return result
}

// Mission difficulty to reward multiplier
export function getDifficultyMultiplier(difficulty) {
  const multipliers = {
    1: 1.0,
    2: 1.5,
    3: 2.0,
    4: 2.5,
    5: 3.0
  }
  return multipliers[difficulty] || 1.0
}

// Get recommended level for crime
export function getRecommendedLevel(crime) {
  return crime.difficulty * 5 // Level = difficulty * 5
}
