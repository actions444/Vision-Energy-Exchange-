/**
 * VISION STORMS WORLD - Multiplayer System
 *
 * Real-time synchronization of:
 * - Player positions and rotations
 * - NPC positions and states
 * - Building interactions
 * - World events
 * - Chat and communication
 */

import { create } from 'zustand'

export const useMultiplayerSystem = create((set, get) => ({
  // ===== CONNECTION STATE =====
  connection: {
    connected: false,
    connectionId: null,
    serverUrl: 'wss://vision-storms-world.example.com',
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    lastHeartbeat: null
  },

  // ===== ACTIVE PLAYERS =====
  activePlayers: {}, // playerId -> { position, rotation, name, avatar, state, lastUpdate }
  localPlayerId: null,

  // ===== CHAT SYSTEM =====
  chatMessages: [], // Array of messages with timestamp, sender, content
  globalChat: true, // true = global, false = proximity

  // ===== EVENTS TO SYNC =====
  pendingUpdates: [], // Queue of player updates to send to server
  eventQueue: [], // Queue of game events (building interactions, etc)

  // ===== SERVER COMMUNICATION =====
  ws: null, // WebSocket connection

  // ===== INITIALIZE MULTIPLAYER =====
  initializeMultiplayer: async (playerId, playerName) => {
    try {
      const ws = new WebSocket(get().connection.serverUrl)

      ws.onopen = () => {
        console.log('Connected to Vision Storms World server')

        set(state => ({
          connection: {
            ...state.connection,
            connected: true,
            connectionId: generateConnectionId(),
            lastHeartbeat: Date.now()
          },
          localPlayerId: playerId,
          ws
        }))

        // Send handshake to server
        get().sendToServer({
          type: 'PLAYER_JOIN',
          playerId,
          playerName,
          timestamp: Date.now()
        })

        // Start heartbeat
        get().startHeartbeat()
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        get().handleServerMessage(data)
      }

      ws.onclose = () => {
        console.log('Disconnected from server')
        set(state => ({
          connection: {
            ...state.connection,
            connected: false
          }
        }))

        // Attempt reconnect
        if (get().connection.reconnectAttempts < get().connection.maxReconnectAttempts) {
          setTimeout(() => {
            set(state => ({
              connection: {
                ...state.connection,
                reconnectAttempts: state.connection.reconnectAttempts + 1
              }
            }))
            get().initializeMultiplayer(playerId, playerName)
          }, 2000 * Math.pow(2, get().connection.reconnectAttempts))
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    } catch (error) {
      console.error('Failed to initialize multiplayer:', error)
    }
  },

  // ===== HEARTBEAT (Keep connection alive) =====
  startHeartbeat: () => {
    setInterval(() => {
      if (get().connection.connected) {
        get().sendToServer({
          type: 'HEARTBEAT',
          timestamp: Date.now()
        })

        set(state => ({
          connection: {
            ...state.connection,
            lastHeartbeat: Date.now()
          }
        }))
      }
    }, 30000) // Every 30 seconds
  },

  // ===== PLAYER UPDATE (Every frame) =====
  updatePlayerPosition: (position, rotation, state) => {
    set(state => ({
      pendingUpdates: [
        ...state.pendingUpdates,
        {
          type: 'PLAYER_MOVE',
          playerId: state.localPlayerId,
          position,
          rotation,
          state,
          timestamp: Date.now()
        }
      ]
    }))
  },

  // ===== BATCH SEND UPDATES (60 FPS sync) =====
  syncUpdates: () => {
    const updates = get().pendingUpdates
    const events = get().eventQueue

    if (updates.length > 0 || events.length > 0) {
      // Send last update only (not all, to reduce bandwidth)
      const lastUpdate = updates[updates.length - 1]

      get().sendToServer({
        type: 'BATCH_UPDATE',
        updates: lastUpdate ? [lastUpdate] : [],
        events: events,
        timestamp: Date.now()
      })

      // Clear queues
      set(state => ({
        pendingUpdates: [],
        eventQueue: []
      }))
    }
  },

  // ===== SEND TO SERVER =====
  sendToServer: (data) => {
    if (get().connection.connected && get().ws) {
      try {
        get().ws.send(JSON.stringify(data))
      } catch (error) {
        console.error('Failed to send data to server:', error)
      }
    }
  },

  // ===== HANDLE SERVER MESSAGES =====
  handleServerMessage: (data) => {
    switch (data.type) {
      case 'PLAYER_JOIN':
        get().onPlayerJoin(data)
        break
      case 'PLAYER_MOVE':
        get().onPlayerMove(data)
        break
      case 'PLAYER_LEAVE':
        get().onPlayerLeave(data)
        break
      case 'CHAT_MESSAGE':
        get().onChatMessage(data)
        break
      case 'WORLD_EVENT':
        get().onWorldEvent(data)
        break
      case 'BUILDING_INTERACTION':
        get().onBuildingInteraction(data)
        break
      case 'PLAYERS_LIST':
        get().onPlayersList(data)
        break
      default:
        console.warn('Unknown message type:', data.type)
    }
  },

  // ===== PLAYER EVENTS =====
  onPlayerJoin: (data) => {
    console.log(`${data.playerName} joined the world`)

    set(state => ({
      activePlayers: {
        ...state.activePlayers,
        [data.playerId]: {
          id: data.playerId,
          name: data.playerName,
          position: data.position || { x: 0, y: 1.8, z: 0 },
          rotation: data.rotation || { x: 0, y: 0, z: 0 },
          avatar: data.avatar || 'default',
          state: 'idle',
          joinedAt: Date.now(),
          lastUpdate: Date.now()
        }
      }
    }))
  },

  onPlayerMove: (data) => {
    set(state => ({
      activePlayers: {
        ...state.activePlayers,
        [data.playerId]: {
          ...state.activePlayers[data.playerId],
          position: data.position,
          rotation: data.rotation,
          state: data.state,
          lastUpdate: Date.now()
        }
      }
    }))
  },

  onPlayerLeave: (data) => {
    console.log(`${data.playerName} left the world`)

    set(state => {
      const newPlayers = { ...state.activePlayers }
      delete newPlayers[data.playerId]
      return { activePlayers: newPlayers }
    })
  },

  onPlayersList: (data) => {
    // Initial player list from server
    set(state => ({
      activePlayers: data.players.reduce((acc, player) => {
        acc[player.id] = {
          ...player,
          lastUpdate: Date.now()
        }
        return acc
      }, {})
    }))
  },

  // ===== CHAT MESSAGES =====
  sendChatMessage: (content, isGlobal = true) => {
    const message = {
      id: generateMessageId(),
      playerId: get().localPlayerId,
      playerName: 'Player', // Will be set on server
      content,
      timestamp: Date.now(),
      global: isGlobal
    }

    // Add to local chat immediately
    set(state => ({
      chatMessages: [...state.chatMessages, message]
    }))

    // Send to server
    get().sendToServer({
      type: 'CHAT_MESSAGE',
      ...message
    })
  },

  onChatMessage: (data) => {
    set(state => ({
      chatMessages: [...state.chatMessages, data]
    }))
  },

  // ===== WORLD EVENTS =====
  broadcastEvent: (eventType, eventData) => {
    set(state => ({
      eventQueue: [
        ...state.eventQueue,
        {
          type: eventType,
          data: eventData,
          playerId: state.localPlayerId,
          timestamp: Date.now()
        }
      ]
    }))
  },

  onWorldEvent: (data) => {
    console.log('World event:', data)
    // Handle world events (building fires, NPCs spawning, etc)
    // Trigger appropriate game reactions
  },

  // ===== BUILDING INTERACTIONS =====
  interactWithBuilding: (buildingId, interactionType) => {
    set(state => ({
      eventQueue: [
        ...state.eventQueue,
        {
          type: 'BUILDING_INTERACTION',
          buildingId,
          interactionType,
          playerId: state.localPlayerId,
          timestamp: Date.now()
        }
      ]
    }))
  },

  onBuildingInteraction: (data) => {
    console.log(`${data.playerId} interacted with building ${data.buildingId}`)
    // Update building state based on interaction
  },

  // ===== PROXIMITY CHAT =====
  getProximityChatMessages: (playerPosition, range = 50) => {
    return get().chatMessages.filter(msg => {
      if (msg.global) return false

      // Check if message sender is in range
      const sender = get().activePlayers[msg.playerId]
      if (!sender) return false

      const distance = Math.sqrt(
        Math.pow(sender.position.x - playerPosition.x, 2) +
        Math.pow(sender.position.z - playerPosition.z, 2)
      )

      return distance <= range
    })
  },

  // ===== DISCONNECT =====
  disconnect: () => {
    if (get().ws) {
      get().ws.close()
    }

    set(state => ({
      connection: {
        ...state.connection,
        connected: false
      }
    }))
  }
}))

// ===== HELPER FUNCTIONS =====

function generateConnectionId() {
  return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function getActivePlayers() {
  return get().activePlayers
}

export function getChatMessages(limit = 50) {
  const messages = get().chatMessages
  return messages.slice(-limit)
}
