// Weapon definitions for GTA-style combat

export const WEAPON_CATEGORIES = {
  melee: 'Melee',
  handgun: 'Handguns',
  rifle: 'Rifles',
  shotgun: 'Shotguns',
  sniper: 'Sniper',
  throwable: 'Throwables',
  special: 'Special'
}

export const WEAPONS = {
  // ===== MELEE WEAPONS =====
  fists: {
    id: 'fists',
    name: 'Fists',
    category: 'melee',
    damage: 10,
    range: 2,
    fireRate: 0.8,
    ammo: -1, // Infinite
    animation: 'punch',
    emoji: '👊',
    description: 'Basic hand-to-hand combat'
  },
  bat: {
    id: 'bat',
    name: 'Baseball Bat',
    category: 'melee',
    damage: 35,
    range: 3,
    fireRate: 1.2,
    ammo: -1,
    animation: 'punch', // Can use punch animation
    emoji: '⚾',
    description: 'Melee weapon - good damage'
  },
  knife: {
    id: 'knife',
    name: 'Knife',
    category: 'melee',
    damage: 40,
    range: 2,
    fireRate: 1.5,
    ammo: -1,
    animation: 'punch',
    emoji: '🔪',
    description: 'Fast melee weapon'
  },
  crowbar: {
    id: 'crowbar',
    name: 'Crowbar',
    category: 'melee',
    damage: 45,
    range: 2.5,
    fireRate: 1.0,
    ammo: -1,
    animation: 'punch',
    emoji: '⚒️',
    description: 'Heavy melee weapon'
  },

  // ===== HANDGUNS =====
  pistol: {
    id: 'pistol',
    name: 'Pistol',
    category: 'handgun',
    damage: 25,
    range: 50,
    fireRate: 0.15,
    ammo: 50,
    maxAmmo: 250,
    animation: 'punch', // Placeholder
    emoji: '🔫',
    description: 'Standard handgun'
  },
  revolver: {
    id: 'revolver',
    name: 'Revolver',
    category: 'handgun',
    damage: 45,
    range: 60,
    fireRate: 0.2,
    ammo: 12,
    maxAmmo: 120,
    animation: 'punch',
    emoji: '🔫',
    description: 'High damage, slow fire rate'
  },

  // ===== RIFLES =====
  smg: {
    id: 'smg',
    name: 'SMG',
    category: 'rifle',
    damage: 18,
    range: 40,
    fireRate: 0.06, // Fast fire rate
    ammo: 120,
    maxAmmo: 600,
    animation: 'punch',
    emoji: '🔫',
    description: 'Automatic submachine gun'
  },
  rifle: {
    id: 'rifle',
    name: 'Assault Rifle',
    category: 'rifle',
    damage: 35,
    range: 100,
    fireRate: 0.1,
    ammo: 120,
    maxAmmo: 480,
    animation: 'punch',
    emoji: '🔫',
    description: 'Powerful automatic rifle'
  },

  // ===== SHOTGUN =====
  shotgun: {
    id: 'shotgun',
    name: 'Shotgun',
    category: 'shotgun',
    damage: 60,
    range: 20,
    fireRate: 0.8, // Slow, powerful
    ammo: 8,
    maxAmmo: 48,
    animation: 'punch',
    emoji: '🔫',
    description: 'Short range, high damage'
  },

  // ===== SNIPER RIFLE =====
  sniper: {
    id: 'sniper',
    name: 'Sniper Rifle',
    category: 'sniper',
    damage: 100,
    range: 200,
    fireRate: 0.5, // Slow
    ammo: 10,
    maxAmmo: 50,
    animation: 'punch',
    emoji: '🎯',
    description: 'One-shot kill at range'
  },

  // ===== THROWABLES =====
  grenade: {
    id: 'grenade',
    name: 'Hand Grenade',
    category: 'throwable',
    damage: 80,
    range: 30,
    fireRate: 0.5,
    ammo: 5,
    maxAmmo: 25,
    animation: 'punch',
    emoji: '💣',
    description: 'Explosive throwable'
  },
  molotov: {
    id: 'molotov',
    name: 'Molotov Cocktail',
    category: 'throwable',
    damage: 50,
    range: 25,
    fireRate: 0.4,
    ammo: 5,
    maxAmmo: 25,
    animation: 'punch',
    emoji: '🔥',
    description: 'Fire throwable - area damage'
  },

  // ===== SPECIAL =====
  rocket: {
    id: 'rocket',
    name: 'Rocket Launcher',
    category: 'special',
    damage: 150,
    range: 150,
    fireRate: 1.0,
    ammo: 3,
    maxAmmo: 12,
    animation: 'punch',
    emoji: '🚀',
    description: 'Ultimate destructive weapon'
  }
}

// Get weapon by ID
export function getWeapon(id) {
  return WEAPONS[id]
}

// Get weapons by category
export function getWeaponsByCategory(category) {
  return Object.values(WEAPONS).filter(w => w.category === category)
}

// Get all weapons organized by category
export function getWeaponsCategorized() {
  const result = {}
  Object.keys(WEAPON_CATEGORIES).forEach(cat => {
    result[cat] = getWeaponsByCategory(cat)
  })
  return result
}

// Weapon spawn locations
export const WEAPON_SPAWNS = [
  { weapon: 'pistol', location: 'downtown', x: 0, y: 1, z: 10 },
  { weapon: 'bat', location: 'park', x: -100, y: 0.5, z: 50 },
  { weapon: 'rifle', location: 'industrial', x: 200, y: 1, z: 100 },
  { weapon: 'shotgun', location: 'warehouse', x: 150, y: 1, z: 80 },
  { weapon: 'sniper', location: 'rooftop', x: 50, y: 30, z: 0 },
  { weapon: 'grenade', location: 'armory', x: 100, y: 0.5, z: -50 }
]
