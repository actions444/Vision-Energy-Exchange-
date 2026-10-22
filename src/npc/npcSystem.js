import { create } from 'zustand'
import { OUTFITS } from '../config/outfits.js'

// NPC personality types and their characteristics
export const NPC_ROLES = {
  fashionista: { label: 'Fashionista', outfitBias: ['elegant', 'trendy', 'stylish'] },
  casual: { label: 'Casual', outfitBias: ['comfort', 'streetwear', 'sport'] },
  professional: { label: 'Professional', outfitBias: ['business', 'formal'] },
  artist: { label: 'Artist', outfitBias: ['bohemian', 'vintage', 'eclectic'] },
  athlete: { label: 'Athlete', outfitBias: ['sport', 'active', 'fitness'] },
  clubber: { label: 'Clubber', outfitBias: ['party', 'trendy', 'bold'] },
}

const SKIN_TONES = ['#FFD1A3', '#F4A460', '#D2691E', '#8B4513', '#A0522D', '#CD853F', '#DEB887', '#F5DEB3']
const HAIR_STYLES = ['short', 'long', 'wavy', 'curly', 'straight', 'bob', 'pixie', 'braids']
const HAIR_COLORS = ['#000000', '#8B4513', '#D2B48C', '#FFD700', '#FF6347', '#4169E1', '#9370DB', '#FF1493']
const BODY_TYPES = ['m', 'f', 'm', 'f'] // biased toward balanced distribution
const BUILDS = ['athletic', 'slim', 'curvy', 'average', 'muscular']

export function generateRandomNPC(id, location) {
  const role = Object.keys(NPC_ROLES)[Math.floor(Math.random() * Object.keys(NPC_ROLES).length)]
  const buildType = BODY_TYPES[Math.floor(Math.random() * BODY_TYPES.length)]
  const skinTone = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)]
  const hairStyle = HAIR_STYLES[Math.floor(Math.random() * HAIR_STYLES.length)]
  const hairColor = HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)]

  // Randomly pick an outfit that fits the role
  const outfitKeys = Object.keys(OUTFITS)
  const outfit = outfitKeys[Math.floor(Math.random() * outfitKeys.length)]

  const names = ['Alex', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Quinn', 'Sam', 'Taylor', 'Ash', 'Blake', 'Drew', 'Sage', 'River', 'Storm', 'Sky', 'Moon']
  const name = names[Math.floor(Math.random() * names.length)]

  return {
    id,
    name: `${name}_${id}`,
    role,
    buildType,
    skinTone,
    hairStyle,
    hairColor,
    outfit,
    location,
    position: { x: location.x + (Math.random() - 0.5) * 5, z: location.z + (Math.random() - 0.5) * 5 },
    yaw: Math.random() * Math.PI * 2,
    behavior: 'standing', // standing, walking, dancing, sitting
    targetPos: null,
    animTime: Math.random() * 10,
  }
}

// NPC spawn locations across the world
export const NPC_LOCATIONS = [
  { name: 'Central Plaza', x: 0, z: 0, count: 8 },
  { name: 'East Quarter', x: 50, z: 50, count: 6 },
  { name: 'North Quarter', x: -50, z: 50, count: 6 },
  { name: 'South Quarter', x: 50, z: -50, count: 6 },
  { name: 'West Quarter', x: -50, z: -50, count: 6 },
  { name: 'Beach Area', x: 100, z: 0, count: 8 },
  { name: 'Park', x: 0, z: 100, count: 10 },
  { name: 'Mall Entrance', x: -30, z: 20, count: 12 },
  { name: 'Cinema District', x: 40, z: 30, count: 5 },
  { name: 'Garden Area', x: -80, z: 60, count: 7 },
]

export const useNPCSystem = create((set) => {
  const npcs = new Map()
  let nextId = 1

  // Generate all NPCs
  NPC_LOCATIONS.forEach(loc => {
    for (let i = 0; i < loc.count; i++) {
      const npc = generateRandomNPC(nextId++, loc)
      npcs.set(npc.id, npc)
    }
  })

  return {
    npcs: Array.from(npcs.values()),
    npcMap: npcs,

    getNPC(id) {
      return npcs.get(id)
    },

    getNPCsNear(x, z, radius = 50) {
      return Array.from(npcs.values()).filter(npc => {
        const dist = Math.hypot(npc.position.x - x, npc.position.z - z)
        return dist < radius
      })
    },

    updateNPC(id, patch) {
      const npc = npcs.get(id)
      if (npc) {
        Object.assign(npc, patch)
        set({ npcs: Array.from(npcs.values()) })
      }
    },

    setNPCBehavior(id, behavior) {
      const npc = npcs.get(id)
      if (npc) {
        npc.behavior = behavior
        npc.animTime = 0
        set({ npcs: Array.from(npcs.values()) })
      }
    },
  }
})
