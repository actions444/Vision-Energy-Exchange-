import { create } from 'zustand'

export const useWantedSystem = create((set, get) => ({
  // Wanted level (0-5 stars)
  wantedLevel: 0,
  maxWantedLevel: 5,

  // Police state
  activePolice: [], // Array of police units chasing player
  policeCount: 0,

  // Wanted timer
  wantedTimer: 0,
  decayRate: 0.1, // Stars decay per second when hidden

  // Crime history
  crimes: [], // Array of crimes committed
  bounty: 0, // Money on player's head

  // Detection
  isDetected: false,
  lastCrimeTime: 0,

  // ===== WANTED LEVEL MANAGEMENT =====
  addWantedLevel: (stars = 1) => {
    set(state => {
      const newLevel = Math.min(state.wantedLevel + stars, state.maxWantedLevel)
      return {
        wantedLevel: newLevel,
        wantedTimer: 0,
        isDetected: true,
        lastCrimeTime: Date.now()
      }
    })

    get().spawnPolice()
  },

  removeWantedLevel: (stars = 1) => {
    set(state => ({
      wantedLevel: Math.max(state.wantedLevel - stars, 0)
    }))
  },

  decayWantedLevel: (deltaTime) => {
    set(state => {
      if (state.wantedLevel === 0) return state

      const newTimer = state.wantedTimer + deltaTime
      const decayAmount = Math.floor(newTimer / 5) // Decay every 5 seconds

      if (decayAmount > 0) {
        return {
          wantedLevel: Math.max(state.wantedLevel - decayAmount, 0),
          wantedTimer: newTimer % 5
        }
      }

      return { wantedTimer: newTimer }
    })
  },

  clearWanted: () => {
    set({
      wantedLevel: 0,
      wantedTimer: 0,
      isDetected: false,
      activePolice: [],
      policeCount: 0
    })
  },

  // ===== CRIME TRACKING =====
  commitCrime: (crimeType, severity = 1) => {
    const crimeData = {
      type: crimeType,
      severity,
      timestamp: Date.now(),
      location: { x: 0, y: 0, z: 0 } // Would be filled with actual position
    }

    set(state => ({
      crimes: [...state.crimes, crimeData],
      bounty: state.bounty + (severity * 50) // $50 per severity level
    }))

    get().addWantedLevel(severity)
  },

  // ===== POLICE SYSTEM =====
  spawnPolice: () => {
    const state = get()
    const wantedLevel = state.wantedLevel

    if (wantedLevel === 0) return

    // Spawn police based on wanted level
    const policeToSpawn = Math.min(wantedLevel * 2, 6)
    const newPolice = []

    for (let i = 0; i < policeToSpawn; i++) {
      newPolice.push({
        id: `police_${Date.now()}_${i}`,
        type: wantedLevel > 3 ? 'swat' : 'patrol',
        health: wantedLevel > 3 ? 50 : 30,
        position: { x: Math.random() * 100 - 50, y: 0, z: Math.random() * 100 - 50 },
        target: null,
        chasing: true,
        weapon: wantedLevel > 3 ? 'rifle' : 'pistol'
      })
    }

    set(state => ({
      activePolice: [...state.activePolice, ...newPolice],
      policeCount: state.activePolice.length + newPolice.length
    }))
  },

  removePoliceUnit: (policeId) => {
    set(state => ({
      activePolice: state.activePolice.filter(p => p.id !== policeId),
      policeCount: state.activePolice.length - 1
    }))
  },

  updatePoliceUnits: (playerPos, deltaTime) => {
    set(state => {
      const updatedPolice = state.activePolice
        .map(unit => {
          // Police AI: chase player
          const dx = playerPos.x - unit.position.x
          const dz = playerPos.z - unit.position.z
          const distance = Math.hypot(dx, dz)

          if (distance > 200) {
            // Too far, give up
            return null
          }

          // Move towards player
          const speed = 5 // Police movement speed
          const angle = Math.atan2(dz, dx)
          unit.position.x += Math.cos(angle) * speed * deltaTime
          unit.position.z += Math.sin(angle) * speed * deltaTime
          unit.target = playerPos

          return unit
        })
        .filter(Boolean) // Remove null units

      return {
        activePolice: updatedPolice,
        policeCount: updatedPolice.length
      }
    })
  },

  // Police units attack
  getPoliceInRange: (playerPos, range = 30) => {
    return get().activePolice.filter(unit => {
      const distance = Math.hypot(
        playerPos.x - unit.position.x,
        playerPos.z - unit.position.z
      )
      return distance <= range
    })
  },

  // ===== EVASION =====
  evadePolice: (distance) => {
    // If player can hide far enough, wanted level decays
    if (distance > 100) {
      get().decayWantedLevel(0.1)
    }
  },

  // ===== BOUNTY =====
  addBounty: (amount) => {
    set(state => ({
      bounty: state.bounty + amount
    }))
  },

  collectBounty: (amount) => {
    set(state => ({
      bounty: Math.max(state.bounty - amount, 0)
    }))
  },

  // ===== UTILITY =====
  getWantedStars: () => {
    return get().wantedLevel
  },

  isWanted: () => {
    return get().wantedLevel > 0
  },

  getCrimeHistory: (limit = 10) => {
    return get().crimes.slice(-limit)
  },

  getCrimeCount: (crimeType) => {
    return get().crimes.filter(c => c.type === crimeType).length
  },

  getPoliceResponse: () => {
    const level = get().wantedLevel
    const responses = [
      'No police',
      'Police dispatched',
      'Police searching',
      'SWAT dispatched',
      'SWAT hunting',
      'All units - shoot on sight'
    ]
    return responses[Math.min(level, 5)]
  },

  reset: () => {
    set({
      wantedLevel: 0,
      maxWantedLevel: 5,
      activePolice: [],
      policeCount: 0,
      wantedTimer: 0,
      crimes: [],
      bounty: 0,
      isDetected: false,
      lastCrimeTime: 0
    })
  }
}))
