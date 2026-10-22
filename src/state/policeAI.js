import { create } from 'zustand'

// Police patrol routes
export const PATROL_ROUTES = {
  downtown: [
    { x: 0, y: 0, z: 0 },
    { x: 50, y: 0, z: 30 },
    { x: 80, y: 0, z: -50 },
    { x: -60, y: 0, z: -40 },
    { x: -40, y: 0, z: 60 }
  ],
  industrial: [
    { x: 200, y: 0, z: 100 },
    { x: 250, y: 0, z: 80 },
    { x: 280, y: 0, z: 150 },
    { x: 200, y: 0, z: 200 }
  ],
  park: [
    { x: -100, y: 0, z: 50 },
    { x: -150, y: 0, z: 80 },
    { x: -120, y: 0, z: 20 },
    { x: -70, y: 0, z: 40 }
  ]
}

// Police AI states
const POLICE_STATES = {
  IDLE: 'idle',
  PATROL: 'patrol',
  ALERT: 'alert',
  CHASE: 'chase',
  AMBUSH: 'ambush',
  RETREAT: 'retreat'
}

export const usePoliceAI = create((set, get) => ({
  // Active police units with enhanced AI
  policeUnits: [],
  policePatrols: {},

  // Global police state
  policeLevel: 0,
  alertRadius: 100,
  reinforcementCooldown: 0,

  // ===== POLICE SPAWNING =====
  spawnPatrol: (area, policeCount = 2) => {
    const route = PATROL_ROUTES[area]
    if (!route) return

    const newUnits = []
    for (let i = 0; i < policeCount; i++) {
      newUnits.push({
        id: `police_patrol_${Date.now()}_${i}`,
        type: 'patrol',
        state: POLICE_STATES.PATROL,
        health: 30,
        maxHealth: 30,
        position: { ...route[0] },
        target: null,
        route: route,
        routeIndex: 0,
        speed: 4,
        weapon: 'pistol',
        detectionRange: 80,
        sightAngle: 120, // Field of view in degrees
        lastSeen: null,
        inCombat: false,
        wantedLevel: 0
      })
    }

    set(state => ({
      policeUnits: [...state.policeUnits, ...newUnits],
      policePatrols: {
        ...state.policePatrols,
        [area]: newUnits.map(u => u.id)
      }
    }))
  },

  spawnSwatTeam: (position, count = 4) => {
    const newUnits = []
    for (let i = 0; i < count; i++) {
      newUnits.push({
        id: `police_swat_${Date.now()}_${i}`,
        type: 'swat',
        state: POLICE_STATES.ALERT,
        health: 50,
        maxHealth: 50,
        position: {
          x: position.x + (Math.random() * 20 - 10),
          y: position.y,
          z: position.z + (Math.random() * 20 - 10)
        },
        target: position,
        route: [],
        routeIndex: 0,
        speed: 5,
        weapon: 'rifle',
        detectionRange: 120,
        sightAngle: 150,
        lastSeen: null,
        inCombat: true,
        wantedLevel: 0
      })
    }

    set(state => ({
      policeUnits: [...state.policeUnits, ...newUnits]
    }))
  },

  // ===== POLICE AI BEHAVIOR =====
  updatePoliceAI: (playerPos, playerHealth, deltaTime) => {
    set(state => {
      const updatedUnits = state.policeUnits.map(unit => {
        let newUnit = { ...unit }
        const dx = playerPos.x - unit.position.x
        const dz = playerPos.z - unit.position.z
        const distance = Math.hypot(dx, dz)

        // Detection
        const canSee = distance <= unit.detectionRange

        if (canSee) {
          newUnit.lastSeen = playerPos
          newUnit.state = POLICE_STATES.CHASE
        } else if (newUnit.lastSeen) {
          // Move to last seen position
          const ldx = newUnit.lastSeen.x - newUnit.position.x
          const ldz = newUnit.lastSeen.z - newUnit.position.z
          const ldist = Math.hypot(ldx, ldz)

          if (ldist > 5) {
            const angle = Math.atan2(ldz, ldx)
            newUnit.position.x += Math.cos(angle) * unit.speed * deltaTime
            newUnit.position.z += Math.sin(angle) * unit.speed * deltaTime
            newUnit.state = POLICE_STATES.ALERT
          } else {
            newUnit.lastSeen = null
            newUnit.state = POLICE_STATES.PATROL
          }
        } else if (newUnit.state === POLICE_STATES.PATROL && unit.route.length > 0) {
          // Patrol behavior
          const waypoint = unit.route[unit.routeIndex]
          const wx = waypoint.x - newUnit.position.x
          const wz = waypoint.z - newUnit.position.z
          const wdist = Math.hypot(wx, wz)

          if (wdist > 5) {
            const angle = Math.atan2(wz, wx)
            newUnit.position.x += Math.cos(angle) * unit.speed * 0.5 * deltaTime
            newUnit.position.z += Math.sin(angle) * unit.speed * 0.5 * deltaTime
          } else {
            newUnit.routeIndex = (unit.routeIndex + 1) % unit.route.length
          }
        }

        // Chase behavior
        if (newUnit.state === POLICE_STATES.CHASE && canSee) {
          const angle = Math.atan2(dz, dx)
          newUnit.position.x += Math.cos(angle) * unit.speed * deltaTime
          newUnit.position.z += Math.sin(angle) * unit.speed * deltaTime
          newUnit.target = playerPos
          newUnit.inCombat = true
        }

        // Retreat if health low
        if (newUnit.health < newUnit.maxHealth * 0.3) {
          newUnit.state = POLICE_STATES.RETREAT
          // Move away from player
          const angle = Math.atan2(dz, dx) + Math.PI
          newUnit.position.x += Math.cos(angle) * unit.speed * deltaTime
          newUnit.position.z += Math.sin(angle) * unit.speed * deltaTime
        }

        return newUnit
      })

      return { policeUnits: updatedUnits }
    })
  },

  // ===== POLICE UNITS MANAGEMENT =====
  removePoliceUnit: (policeId) => {
    set(state => ({
      policeUnits: state.policeUnits.filter(u => u.id !== policeId)
    }))
  },

  damagePoliceUnit: (policeId, damage) => {
    set(state => {
      const updatedUnits = state.policeUnits.map(unit => {
        if (unit.id === policeId) {
          return {
            ...unit,
            health: Math.max(unit.health - damage, 0)
          }
        }
        return unit
      })

      return { policeUnits: updatedUnits }
    })
  },

  getPoliceInRange: (playerPos, range = 50) => {
    return get().policeUnits.filter(unit => {
      const dx = playerPos.x - unit.position.x
      const dz = playerPos.z - unit.position.z
      const distance = Math.hypot(dx, dz)
      return distance <= range && unit.health > 0
    })
  },

  getPoliceCount: () => {
    return get().policeUnits.filter(u => u.health > 0).length
  },

  getActiveChasers: () => {
    return get().policeUnits.filter(
      u => u.state === POLICE_STATES.CHASE && u.health > 0
    )
  },

  // ===== AMBUSH MECHANICS =====
  planAmbush: (area, playerPos) => {
    // AI spawns SWAT team ahead of player
    const ambushPos = {
      x: playerPos.x + 80,
      y: playerPos.y,
      z: playerPos.z + 80
    }

    get().spawnSwatTeam(ambushPos, 3)
  },

  enableAmbush: (area) => {
    const ambushPos = PATROL_ROUTES[area]?.[2]
    if (ambushPos) {
      get().planAmbush(area, ambushPos)
    }
  },

  // ===== UTILITY =====
  getAllPolice: () => {
    return get().policeUnits
  },

  clearAllPolice: () => {
    set({ policeUnits: [], policePatrols: {} })
  },

  getPoliceStats: () => {
    const units = get().policeUnits
    return {
      total: units.length,
      alive: units.filter(u => u.health > 0).length,
      chasing: units.filter(u => u.state === POLICE_STATES.CHASE).length,
      swat: units.filter(u => u.type === 'swat').length
    }
  }
}))
