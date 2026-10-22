import { create } from 'zustand'

// Gang definitions
export const GANGS = {
  player: {
    id: 'player',
    name: 'Player Crew',
    color: '#c9a96a',
    reputation: 0,
    members: 1
  },
  downtown_crew: {
    id: 'downtown_crew',
    name: 'Downtown Crew',
    color: '#ff0000',
    reputation: 50,
    members: 8
  },
  industrial_cartel: {
    id: 'industrial_cartel',
    name: 'Industrial Cartel',
    color: '#0066ff',
    reputation: 60,
    members: 12
  },
  park_gang: {
    id: 'park_gang',
    name: 'Park Gang',
    color: '#00ff00',
    reputation: 40,
    members: 6
  },
  waterfront_mafia: {
    id: 'waterfront_mafia',
    name: 'Waterfront Mafia',
    color: '#ffff00',
    reputation: 70,
    members: 15
  }
}

// Territory definitions
export const TERRITORIES = {
  downtown: {
    id: 'downtown',
    name: 'Downtown',
    owner: 'downtown_crew',
    position: { x: 0, y: 0, z: 0 },
    radius: 100,
    income: 500, // Per minute
    strength: 100
  },
  industrial: {
    id: 'industrial',
    name: 'Industrial District',
    owner: 'industrial_cartel',
    position: { x: 200, y: 0, z: 100 },
    radius: 120,
    income: 700,
    strength: 100
  },
  park: {
    id: 'park',
    name: 'Central Park',
    owner: 'park_gang',
    position: { x: -100, y: 0, z: 50 },
    radius: 80,
    income: 300,
    strength: 100
  },
  waterfront: {
    id: 'waterfront',
    name: 'Waterfront',
    owner: 'waterfront_mafia',
    position: { x: -150, y: 0, z: -100 },
    radius: 100,
    income: 800,
    strength: 100
  },
  residential: {
    id: 'residential',
    name: 'Residential',
    owner: null, // Neutral
    position: { x: 100, y: 0, z: -150 },
    radius: 90,
    income: 400,
    strength: 100
  }
}

export const useGangSystem = create((set, get) => ({
  // Player gang info
  playerGang: GANGS.player,
  playerReputation: 0,
  playerTerritories: [],

  // Territory ownership
  territories: { ...TERRITORIES },
  gangTerritories: {
    player: [],
    downtown_crew: ['downtown'],
    industrial_cartel: ['industrial'],
    park_gang: ['park'],
    waterfront_mafia: ['waterfront']
  },

  // Gang relations
  gangRelations: {
    player: {
      downtown_crew: 0, // -100 to 100
      industrial_cartel: 0,
      park_gang: 0,
      waterfront_mafia: 0
    }
  },

  // ===== REPUTATION SYSTEM =====
  addReputation: (amount, source = 'generic') => {
    set(state => ({
      playerReputation: Math.min(state.playerReputation + amount, 1000)
    }))
  },

  subtractReputation: (amount) => {
    set(state => ({
      playerReputation: Math.max(state.playerReputation - amount, 0)
    }))
  },

  getReputation: () => {
    return get().playerReputation
  },

  getReputationLevel: () => {
    const rep = get().playerReputation
    if (rep < 50) return 'Unknown'
    if (rep < 150) return 'Wanted'
    if (rep < 300) return 'Respected'
    if (rep < 500) return 'Feared'
    if (rep < 750) return 'Legend'
    return 'Godlike'
  },

  // ===== GANG RELATIONS =====
  improveRelation: (gangId, amount = 10) => {
    set(state => {
      const newRelations = { ...state.gangRelations }
      if (!newRelations.player) newRelations.player = {}
      newRelations.player[gangId] = Math.min(
        (newRelations.player[gangId] || 0) + amount,
        100
      )
      return { gangRelations: newRelations }
    })
  },

  degradeRelation: (gangId, amount = 10) => {
    set(state => {
      const newRelations = { ...state.gangRelations }
      if (!newRelations.player) newRelations.player = {}
      newRelations.player[gangId] = Math.max(
        (newRelations.player[gangId] || 0) - amount,
        -100
      )
      return { gangRelations: newRelations }
    })
  },

  getRelation: (gangId) => {
    return get().gangRelations.player?.[gangId] || 0
  },

  getRelationStatus: (gangId) => {
    const relation = get().getRelation(gangId)
    if (relation > 50) return 'Allied'
    if (relation > 0) return 'Friendly'
    if (relation === 0) return 'Neutral'
    if (relation > -50) return 'Hostile'
    return 'Enemy'
  },

  // ===== TERRITORY CONTROL =====
  takeTerritoryOver: (territoryId, attackingGang = 'player') => {
    set(state => {
      const territory = state.territories[territoryId]
      if (!territory) return state

      const oldOwner = territory.owner
      const newTerritory = {
        ...territory,
        owner: attackingGang,
        strength: 100
      }

      const newTerritories = {
        ...state.territories,
        [territoryId]: newTerritory
      }

      // Update gang territories
      const newGangTerritories = { ...state.gangTerritories }

      // Remove from old owner
      if (oldOwner) {
        newGangTerritories[oldOwner] = (newGangTerritories[oldOwner] || [])
          .filter(t => t !== territoryId)
      }

      // Add to new owner
      newGangTerritories[attackingGang] = [
        ...(newGangTerritories[attackingGang] || []),
        territoryId
      ]

      return {
        territories: newTerritories,
        gangTerritories: newGangTerritories
      }
    })
  },

  getTerritoryOwner: (territoryId) => {
    return get().territories[territoryId]?.owner
  },

  getTerritoryStrength: (territoryId) => {
    return get().territories[territoryId]?.strength || 0
  },

  damageTerritoryStrength: (territoryId, amount) => {
    set(state => {
      const territory = state.territories[territoryId]
      if (!territory) return state

      const newStrength = Math.max(territory.strength - amount, 0)

      return {
        territories: {
          ...state.territories,
          [territoryId]: {
            ...territory,
            strength: newStrength
          }
        }
      }
    })
  },

  repairTerritoryStrength: (territoryId, amount) => {
    set(state => {
      const territory = state.territories[territoryId]
      if (!territory) return state

      const newStrength = Math.min(territory.strength + amount, 100)

      return {
        territories: {
          ...state.territories,
          [territoryId]: {
            ...territory,
            strength: newStrength
          }
        }
      }
    })
  },

  // ===== INCOME SYSTEM =====
  calculateTerritoryIncome: (territoryId) => {
    const territory = get().territories[territoryId]
    if (!territory) return 0
    return (territory.income * territory.strength) / 100
  },

  calculateTotalIncome: () => {
    const playerTerritories = get().gangTerritories.player || []
    return playerTerritories.reduce((total, territoryId) => {
      return total + get().calculateTerritoryIncome(territoryId)
    }, 0)
  },

  // ===== UTILITY =====
  getTerritoriesOwnedBy: (gangId) => {
    return (get().gangTerritories[gangId] || []).map(id => get().territories[id])
  },

  getTerritoryInfo: (territoryId) => {
    const territory = get().territories[territoryId]
    if (!territory) return null

    const owner = territory.owner ? GANGS[territory.owner] : null
    return {
      ...territory,
      ownerInfo: owner,
      income: get().calculateTerritoryIncome(territoryId)
    }
  },

  getAllTerritories: () => {
    return Object.values(get().territories)
  },

  getGangInfo: (gangId) => {
    return GANGS[gangId]
  },

  getTerritoryNearby: (position, maxDistance = 150) => {
    const territories = get().getAllTerritories()
    return territories.filter(territory => {
      const dx = territory.position.x - position.x
      const dz = territory.position.z - position.z
      const distance = Math.hypot(dx, dz)
      return distance <= maxDistance
    })
  },

  reset: () => {
    set({
      playerGang: GANGS.player,
      playerReputation: 0,
      playerTerritories: [],
      territories: { ...TERRITORIES },
      gangTerritories: {
        player: [],
        downtown_crew: ['downtown'],
        industrial_cartel: ['industrial'],
        park_gang: ['park'],
        waterfront_mafia: ['waterfront']
      },
      gangRelations: {
        player: {
          downtown_crew: 0,
          industrial_cartel: 0,
          park_gang: 0,
          waterfront_mafia: 0
        }
      }
    })
  }
}))
