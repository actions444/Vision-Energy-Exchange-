/**
 * VISION STORMS WORLD - NPC & AI System
 *
 * Photorealistic Non-Player Characters:
 * - Daily routines and work schedules
 * - Emotional states and reactions
 * - Multiple AI personalities
 * - Job assignments and responsibilities
 * - Conversations and interactions
 * - Autonomous world movement
 *
 * NPCs make the world feel alive and dynamic
 */

import { create } from 'zustand'

export const useNPCSystem = create((set, get) => ({
  // ===== NPC REGISTRY =====
  npcs: {}, // npcId -> npc data
  npcsByRole: {}, // role -> [npcIds]
  npcsByLocation: {}, // locationId -> [npcIds]

  // ===== CREATE NPC =====
  createNPC: (npcData) => {
    // npcData = {
    //   name, age, gender, role, workplace, personality
    //   appearance, backstory, skills
    // }

    const npcId = `npc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const npc = {
      id: npcId,
      name: npcData.name,
      age: npcData.age,
      gender: npcData.gender,
      avatar: npcData.avatar || 'photorealistic_default',
      role: npcData.role, // 'bank_teller', 'firefighter', 'teacher', etc
      workplace: npcData.workplace, // building where they work
      personality: npcData.personality, // 'friendly', 'professional', 'stern', 'warm'
      backstory: npcData.backstory || '',
      skills: npcData.skills || [],

      // STATE
      currentLocation: npcData.workplace,
      currentActivity: 'idle',
      currentEmotion: 'neutral',
      isWorking: false,
      shiftStart: npcData.shiftStart || '9:00 AM',
      shiftEnd: npcData.shiftEnd || '5:00 PM',

      // RELATIONSHIPS
      relationships: {}, // npcId -> relationship_level (-100 to 100)
      memorizedFaces: [], // playerId -> whether NPC recognizes them

      // DAILY ROUTINE
      dailySchedule: generateDailySchedule(npcData),

      // STATS
      happiness: 50,
      stress: 30,
      energy: 80,
      reputation: 0,

      // INTERACTION
      conversationTopics: npcData.conversationTopics || [],
      lastInteractionWith: {}, // playerId -> timestamp
      interactionHistory: [],

      createdAt: Date.now()
    }

    set(state => ({
      npcs: {
        ...state.npcs,
        [npcId]: npc
      },
      npcsByRole: {
        ...state.npcsByRole,
        [npcData.role]: [...(state.npcsByRole[npcData.role] || []), npcId]
      }
    }))

    return {
      success: true,
      npcId: npcId,
      name: npc.name,
      role: npc.role,
      workplace: npc.workplace,
      personality: npc.personality,
      message: `${npc.name} has been created and will work at ${npc.workplace}`
    }
  },

  // ===== NPC MOVEMENT & ACTIVITY =====
  updateNPCActivity: (npcId, activity, location, details = {}) => {
    const npc = get().npcs[npcId]
    if (!npc) return { success: false }

    const updatedNPC = {
      ...npc,
      currentActivity: activity,
      currentLocation: location,
      lastActivityUpdate: Date.now(),
      activityDetails: details
    }

    set(state => ({
      npcs: {
        ...state.npcs,
        [npcId]: updatedNPC
      }
    }))

    return {
      success: true,
      npcId: npcId,
      activity: activity,
      location: location
    }
  },

  // ===== NPC EMOTION SYSTEM =====
  setNPCEmotion: (npcId, emotion, intensity = 0.5) => {
    // emotion: 'happy', 'sad', 'angry', 'stressed', 'neutral', 'excited'
    const npc = get().npcs[npcId]
    if (!npc) return { success: false }

    const emotionalImpact = {
      happy: { happiness: 20, stress: -10, energy: 10 },
      sad: { happiness: -30, stress: 10, energy: -20 },
      angry: { happiness: -20, stress: 30, energy: 5 },
      stressed: { happiness: -15, stress: 40, energy: -15 },
      excited: { happiness: 30, stress: 5, energy: 20 }
    }

    const impact = emotionalImpact[emotion] || {}

    const updatedNPC = {
      ...npc,
      currentEmotion: emotion,
      emotionIntensity: intensity,
      happiness: Math.max(0, Math.min(100, npc.happiness + (impact.happiness || 0))),
      stress: Math.max(0, Math.min(100, npc.stress + (impact.stress || 0))),
      energy: Math.max(0, Math.min(100, npc.energy + (impact.energy || 0)))
    }

    set(state => ({
      npcs: {
        ...state.npcs,
        [npcId]: updatedNPC
      }
    }))

    return {
      success: true,
      npcId: npcId,
      emotion: emotion,
      npcs_new_state: {
        happiness: updatedNPC.happiness,
        stress: updatedNPC.stress,
        energy: updatedNPC.energy
      }
    }
  },

  // ===== NPC CONVERSATION =====
  interactWithNPC: (playerId, npcId, conversationTopic = null) => {
    const npc = get().npcs[npcId]
    if (!npc) return { success: false, error: 'NPC not found' }

    // Check if NPC recognizes player
    const recognizes = npc.memorizedFaces.includes(playerId)

    // Generate conversation based on NPC personality and role
    const conversation = generateConversation(npc, playerId, recognizes, conversationTopic)

    // Update NPC's last interaction
    const updatedNPC = {
      ...npc,
      lastInteractionWith: {
        ...npc.lastInteractionWith,
        [playerId]: Date.now()
      },
      interactionHistory: [
        ...npc.interactionHistory,
        {
          playerId: playerId,
          timestamp: Date.now(),
          topic: conversationTopic
        }
      ],
      memorizedFaces: recognizes ? npc.memorizedFaces : [...npc.memorizedFaces, playerId]
    }

    set(state => ({
      npcs: {
        ...state.npcs,
        [npcId]: updatedNPC
      }
    }))

    return {
      success: true,
      npcName: npc.name,
      npcRole: npc.role,
      recognizes: recognizes,
      conversation: conversation,
      npcEmotion: npc.currentEmotion,
      npcMood: npc.happiness > 70 ? 'very_good' : npc.happiness > 50 ? 'good' : 'neutral'
    }
  },

  // ===== NPC BANK TELLER ROUTINE =====
  createBankTellerNPC: () => {
    const tellerNames = ['Sarah', 'Marcus', 'Jennifer', 'David', 'Amy']
    const name = tellerNames[Math.floor(Math.random() * tellerNames.length)]

    return get().createNPC({
      name: name,
      age: Math.floor(Math.random() * 20) + 25, // 25-45
      gender: Math.random() > 0.5 ? 'M' : 'F',
      role: 'bank_teller',
      workplace: 'bank_1',
      personality: 'professional',
      conversationTopics: [
        'banking_services',
        'account_opening',
        'deposits_withdrawals',
        'loan_information'
      ]
    })
  },

  // ===== NPC FIREFIGHTER ROUTINE =====
  createFirefighterNPC: () => {
    const names = ['Chief Jackson', 'Officer Martinez', 'Captain Lee', 'FF Robinson']
    const name = names[Math.floor(Math.random() * names.length)]

    return get().createNPC({
      name: name,
      age: Math.floor(Math.random() * 15) + 30, // 30-45
      gender: 'M',
      role: 'firefighter',
      workplace: 'fire_station',
      personality: 'stern_but_caring',
      shiftStart: '8:00 AM',
      shiftEnd: '8:00 PM',
      conversationTopics: [
        'emergency_response',
        'fire_safety',
        'rescue_training',
        'community_safety'
      ]
    })
  },

  // ===== NPC TEACHER ROUTINE =====
  createTeacherNPC: () => {
    const names = ['Professor Williams', 'Ms. Chen', 'Mr. Johnson', 'Dr. Patel']
    const name = names[Math.floor(Math.random() * names.length)]

    return get().createNPC({
      name: name,
      age: Math.floor(Math.random() * 20) + 35, // 35-55
      role: 'teacher',
      workplace: 'trinity_academy',
      personality: 'warm_and_encouraging',
      shiftStart: '8:30 AM',
      shiftEnd: '4:30 PM',
      conversationTopics: [
        'financial_education',
        'business_fundamentals',
        'student_progress',
        'career_guidance'
      ]
    })
  },

  // ===== GET NPCs BY LOCATION =====
  getNPCsAtLocation: (locationId) => {
    const allNPCs = get().npcs
    return Object.values(allNPCs).filter(npc => npc.currentLocation === locationId)
  },

  // ===== GET NPCs BY ROLE =====
  getNPCsByRole: (role) => {
    const npcIds = get().npcsByRole[role] || []
    return npcIds.map(id => get().npcs[id])
  },

  // ===== NPC REPUTATION =====
  updateNPCReputation: (npcId, changeAmount) => {
    const npc = get().npcs[npcId]
    if (!npc) return { success: false }

    const updatedNPC = {
      ...npc,
      reputation: Math.max(-100, Math.min(100, npc.reputation + changeAmount))
    }

    set(state => ({
      npcs: {
        ...state.npcs,
        [npcId]: updatedNPC
      }
    }))

    return {
      success: true,
      npcName: npc.name,
      newReputation: updatedNPC.reputation
    }
  }
}))

// ===== HELPER FUNCTIONS =====

function generateDailySchedule(npcData) {
  return {
    morning: {
      time: '6:00 AM - 9:00 AM',
      activity: 'wake_up_and_travel',
      location: 'home'
    },
    work: {
      time: npcData.shiftStart || '9:00 AM',
      end: npcData.shiftEnd || '5:00 PM',
      activity: 'work',
      location: npcData.workplace
    },
    lunch: {
      time: '12:00 PM - 1:00 PM',
      activity: 'lunch_break',
      location: 'nearby_restaurant'
    },
    evening: {
      time: '5:00 PM - 8:00 PM',
      activity: 'travel_home_and_relax',
      location: 'home'
    },
    night: {
      time: '8:00 PM - 6:00 AM',
      activity: 'sleep',
      location: 'home'
    }
  }
}

function generateConversation(npc, playerId, recognizes, topic) {
  const greetings = {
    friendly: `Hi! Nice to see you again!`,
    professional: `Hello. How can I help you?`,
    stern: `What do you need?`,
    warm: `Welcome! It's good to see you.`
  }

  const greeting = recognizes
    ? greetings[npc.personality] || 'Hello!'
    : `Hello, I'm ${npc.name}. Haven't seen you before.`

  return {
    greeting: greeting,
    roleDescription: `I work as a ${npc.role}`,
    availableTopics: npc.conversationTopics,
    selectedTopic: topic || npc.conversationTopics[0],
    npcResponse: generateTopicResponse(npc.role, topic),
    canLearnFrom: true,
    canComplaintTo: npc.role === 'fire_chief' || npc.role === 'police_chief'
  }
}

function generateTopicResponse(role, topic) {
  const responses = {
    bank_teller: {
      banking_services: 'We offer checking, savings, loans, and investment services.',
      account_opening: 'Opening an account is easy! Just bring your ID and proof of address.'
    },
    firefighter: {
      emergency_response: 'We respond 24/7 to emergencies. Safety is our priority.',
      fire_safety: 'Always have working smoke detectors and an evacuation plan.'
    },
    teacher: {
      financial_education: 'Understanding money is critical to your future success.',
      career_guidance: 'Choose work that aligns with your values and skills.'
    }
  }

  return responses[role]?.[topic] || 'That\'s an important topic.'
}

export function getNPCCount() {
  return Object.keys(useNPCSystem.getState().npcs).length
}

export function getAllNPCs() {
  return useNPCSystem.getState().npcs
}
