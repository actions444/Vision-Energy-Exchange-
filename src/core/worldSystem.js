/**
 * VISION STORMS WORLD - Core World System
 *
 * Foundation for all gameplay:
 * - Infinite expandable world coordinates
 * - Player movement (walk, run, jump, swim)
 * - Multiplayer synchronization
 * - Building/object placement system
 * - Collision detection
 *
 * This is the FOUNDATION - everything else depends on this
 */

import { create } from 'zustand'

export const useWorldSystem = create((set, get) => ({
  // ===== WORLD STATE =====
  world: {
    name: 'Vision Storms World',
    time_of_day: 12, // 0-23 (24 hour cycle)
    weather: 'clear', // clear, rain, snow, storm
    temperature: 72, // Fahrenheit
    season: 'summer' // spring, summer, fall, winter
  },

  // ===== PLAYER POSITION & MOVEMENT =====
  player: {
    id: null,
    position: { x: 0, y: 1.8, z: 0 }, // x, height, z coordinates
    rotation: { x: 0, y: 0, z: 0 }, // Euler angles for looking direction
    velocity: { x: 0, y: 0, z: 0 }, // Current movement speed
    isGrounded: true,
    isSwimming: false,
    health: 100,
    stamina: 100,
    state: 'idle' // idle, walking, running, jumping, falling, swimming
  },

  // ===== WORLD GRID (Infinite expandable coordinates) =====
  // World divided into 256x256 chunk system
  // Each chunk = 256m x 256m x 128m height
  worldChunks: {}, // chunkKey -> chunk data
  loadedChunks: new Set(), // Currently loaded chunk IDs
  visibilityRange: 3, // Load chunks within 3x3 area around player

  // ===== BUILDINGS & OBJECTS =====
  buildings: {}, // buildingId -> building data
  objects: {}, // objectId -> object data (trees, signs, etc)
  landmarks: {}, // landmarkId -> landmark data (banks, colleges, etc)

  // ===== MULTIPLAYER =====
  otherPlayers: {}, // playerId -> player data (position, avatar, name)
  playerUpdateQueue: [], // Queue for syncing to server

  // ===== PHYSICS =====
  gravity: 9.81, // m/s²
  walkSpeed: 5.5, // m/s (walking)
  runSpeed: 8.0, // m/s (sprinting)
  jumpForce: 5.0, // upward velocity

  // ===== INITIALIZATION =====
  initializeWorld: () => {
    set(state => ({
      world: {
        ...state.world,
        initialized: true,
        loadedAt: new Date()
      }
    }))

    // Load starting area chunks
    get().loadChunkAroundPlayer()
  },

  // ===== CHUNK SYSTEM (Infinite world support) =====
  getChunkKey: (x, z) => {
    // Convert world coordinates to chunk grid
    const chunkX = Math.floor(x / 256)
    const chunkZ = Math.floor(z / 256)
    return `${chunkX},${chunkZ}`
  },

  loadChunkAroundPlayer: () => {
    const player = get().player
    const chunkKey = get().getChunkKey(player.position.x, player.position.z)
    const [cx, cz] = chunkKey.split(',').map(Number)

    const chunksToLoad = []
    const range = get().visibilityRange

    // Load chunks in radius around player
    for (let x = cx - range; x <= cx + range; x++) {
      for (let z = cz - range; z <= cz + range; z++) {
        const key = `${x},${z}`
        if (!get().loadedChunks.has(key)) {
          chunksToLoad.push(key)
        }
      }
    }

    if (chunksToLoad.length > 0) {
      set(state => ({
        loadedChunks: new Set([...state.loadedChunks, ...chunksToLoad])
      }))

      // Generate terrain for new chunks
      chunksToLoad.forEach(key => {
        generateTerrainChunk(key)
      })
    }

    // Unload distant chunks to save memory
    get().unloadDistantChunks()
  },

  unloadDistantChunks: () => {
    const player = get().player
    const chunkKey = get().getChunkKey(player.position.x, player.position.z)
    const [cx, cz] = chunkKey.split(',').map(Number)
    const range = get().visibilityRange + 1

    set(state => {
      const newLoaded = new Set()
      state.loadedChunks.forEach(key => {
        const [x, z] = key.split(',').map(Number)
        // Keep chunk if within unload range
        if (Math.abs(x - cx) <= range && Math.abs(z - cz) <= range) {
          newLoaded.add(key)
        }
      })
      return { loadedChunks: newLoaded }
    })
  },

  // ===== PLAYER MOVEMENT =====
  movePlayer: (direction, inputState) => {
    const player = get().player
    const moveSpeed = inputState.isRunning ? get().runSpeed : get().walkSpeed
    const dt = 0.016 // ~60 FPS

    // Calculate movement direction based on camera + input
    let moveX = 0
    let moveZ = 0

    if (inputState.forward) moveZ -= moveSpeed * dt
    if (inputState.backward) moveZ += moveSpeed * dt
    if (inputState.left) moveX -= moveSpeed * dt
    if (inputState.right) moveX += moveSpeed * dt

    // Update position
    const newPosition = {
      x: player.position.x + moveX,
      y: player.position.y, // Will be affected by gravity/jumping
      z: player.position.z + moveZ
    }

    // Check collisions with buildings
    const collision = checkCollision(newPosition)
    if (!collision) {
      set(state => ({
        player: {
          ...state.player,
          position: newPosition,
          state: (inputState.forward || inputState.backward || inputState.left || inputState.right)
            ? (inputState.isRunning ? 'running' : 'walking')
            : 'idle'
        }
      }))

      // Trigger chunk loading if moved significantly
      if (Math.abs(moveX) > 10 || Math.abs(moveZ) > 10) {
        get().loadChunkAroundPlayer()
      }
    }
  },

  // ===== JUMPING =====
  jump: () => {
    const player = get().player
    if (!player.isGrounded) return // Can't jump mid-air

    set(state => ({
      player: {
        ...state.player,
        velocity: { ...state.player.velocity, y: get().jumpForce },
        isGrounded: false,
        state: 'jumping'
      }
    }))
  },

  // ===== SWIMMING =====
  enterWater: () => {
    set(state => ({
      player: {
        ...state.player,
        isSwimming: true,
        state: 'swimming'
      }
    }))
  },

  exitWater: () => {
    set(state => ({
      player: {
        ...state.player,
        isSwimming: false,
        isGrounded: true
      }
    }))
  },

  // ===== CAMERA CONTROL =====
  rotateCamera: (deltaX, deltaY) => {
    set(state => ({
      player: {
        ...state.player,
        rotation: {
          x: Math.max(-Math.PI / 2, Math.min(Math.PI / 2, state.player.rotation.x - deltaY * 0.01)),
          y: state.player.rotation.y - deltaX * 0.01,
          z: 0
        }
      }
    }))
  },

  // ===== MULTIPLAYER SYNC =====
  updateOtherPlayer: (playerId, position, rotation, state) => {
    set(state => ({
      otherPlayers: {
        ...state.otherPlayers,
        [playerId]: {
          id: playerId,
          position,
          rotation,
          state,
          lastUpdated: Date.now()
        }
      }
    }))
  },

  removeOtherPlayer: (playerId) => {
    set(state => {
      const newPlayers = { ...state.otherPlayers }
      delete newPlayers[playerId]
      return { otherPlayers: newPlayers }
    })
  },

  // ===== BUILDING PLACEMENT =====
  addBuilding: (buildingId, buildingData) => {
    set(state => ({
      buildings: {
        ...state.buildings,
        [buildingId]: {
          id: buildingId,
          ...buildingData,
          created_at: new Date()
        }
      }
    }))
  },

  // ===== OBJECT MANAGEMENT =====
  addObject: (objectId, objectData) => {
    set(state => ({
      objects: {
        ...state.objects,
        [objectId]: {
          id: objectId,
          ...objectData
        }
      }
    }))
  },

  // ===== WORLD TIME =====
  updateWorldTime: (hours) => {
    set(state => ({
      world: {
        ...state.world,
        time_of_day: (state.world.time_of_day + hours) % 24,
        season: calculateSeason((state.world.time_of_day + hours) % 24)
      }
    }))
  },

  // ===== WEATHER =====
  setWeather: (weatherType) => {
    set(state => ({
      world: {
        ...state.world,
        weather: weatherType
      }
    }))
  },

  // ===== PLAYER STATS =====
  takeDamage: (amount) => {
    set(state => ({
      player: {
        ...state.player,
        health: Math.max(0, state.player.health - amount)
      }
    }))
  },

  heal: (amount) => {
    set(state => ({
      player: {
        ...state.player,
        health: Math.min(100, state.player.health + amount)
      }
    }))
  },

  drain_stamina: (amount) => {
    set(state => ({
      player: {
        ...state.player,
        stamina: Math.max(0, state.player.stamina - amount)
      }
    }))
  },

  restore_stamina: (amount) => {
    set(state => ({
      player: {
        ...state.player,
        stamina: Math.min(100, state.player.stamina + amount)
      }
    }))
  }
}))

// ===== HELPER FUNCTIONS =====

function generateTerrainChunk(chunkKey) {
  // Generate terrain for this chunk
  // In real implementation: perlin noise, height maps, biome variation
  const [x, z] = chunkKey.split(',').map(Number)

  return {
    key: chunkKey,
    terrain_height: generateHeightMap(x, z),
    biome: calculateBiome(x, z),
    generated_at: Date.now()
  }
}

function generateHeightMap(x, z) {
  // Simplified perlin noise height map
  // Returns height for each point in chunk
  return (Math.sin(x * 0.1) + Math.cos(z * 0.1)) * 10 + 50 // 40-60m elevation
}

function calculateBiome(x, z) {
  const biomes = ['urban', 'suburban', 'rural', 'forest', 'water', 'mountain']
  const biomeIndex = (Math.abs(x) + Math.abs(z)) % biomes.length
  return biomes[biomeIndex]
}

function calculateSeason(hour) {
  // Simple season calculation based on game time
  const cycleHour = hour % 24
  if (cycleHour < 6) return 'winter'
  if (cycleHour < 12) return 'spring'
  if (cycleHour < 18) return 'summer'
  return 'fall'
}

function checkCollision(position) {
  // Check if position collides with buildings/objects
  // In real implementation: AABB or raycasting
  return false // Placeholder
}

export function getPlayerPosition() {
  const state = useWorldSystem.getState()
  return state.player.position
}

export function getLoadedChunks() {
  const state = useWorldSystem.getState()
  return Array.from(state.loadedChunks)
}

export function getWorldTime() {
  const state = useWorldSystem.getState()
  return state.world.time_of_day
}
