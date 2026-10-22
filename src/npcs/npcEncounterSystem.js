/**
 * VISION STORMS WORLD - Random NPC Encounter System
 *
 * Dynamic story moments triggered by NPC relationships:
 * - Random encounters based on location and reputation
 * - Relationship-triggered events (friendship, romance, conflict)
 * - Consequence-based encounters (karma, past choices)
 * - Story progression through NPC interactions
 * - Quest generation from conversations
 * - Reputation-gated encounters (need certain reputation level)
 * - Group encounters (multiple NPCs together)
 * - Emergency situations (requiring player intervention)
 *
 * Makes the world feel alive with unpredictable, meaningful moments
 */

import { create } from 'zustand'

export const useNPCEncounterSystem = create((set, get) => ({
  // ===== ENCOUNTER TRACKING =====
  encounters: {}, // encounterId -> encounter data
  encounterHistory: [], // list of past encounters
  activeEncounters: {}, // playerId -> current encounter
  encounterTriggers: {}, // triggers that can spawn encounters

  // ===== TRIGGER RANDOM ENCOUNTER =====
  triggerRandomEncounter: (playerId, playerLocation, npcList) => {
    // npcList = array of NPCs in the current area

    if (!npcList || npcList.length === 0) {
      return { success: false, encounterTriggered: false }
    }

    // Check if encounter should happen (30% chance per NPC)
    const shouldEncounter = npcList.some(npc => Math.random() < 0.3)

    if (!shouldEncounter) {
      return { success: true, encounterTriggered: false }
    }

    // Select random NPC from area
    const selectedNPC = npcList[Math.floor(Math.random() * npcList.length)]

    const encounterId = `encounter_${Date.now()}`
    const encounter = {
      id: encounterId,
      playerId: playerId,
      npcId: selectedNPC.id,
      npcName: selectedNPC.name,
      location: playerLocation,
      type: generateEncounterType(selectedNPC),
      description: '',
      options: [],
      consequences: [],
      started: Date.now(),
      status: 'active'
    }

    // Generate encounter content based on NPC and relationship
    const encounterContent = generateEncounterContent(selectedNPC, playerId, encounter.type)

    const fullEncounter = {
      ...encounter,
      ...encounterContent
    }

    set(state => ({
      activeEncounters: {
        ...state.activeEncounters,
        [playerId]: fullEncounter
      }
    }))

    return {
      success: true,
      encounterTriggered: true,
      encounterId: encounterId,
      npcName: selectedNPC.name,
      npcRole: selectedNPC.role,
      encounterType: fullEncounter.type,
      description: fullEncounter.description,
      encounterOptions: fullEncounter.options
    }
  },

  // ===== RELATIONSHIP-TRIGGERED ENCOUNTER =====
  triggerRelationshipEncounter: (playerId, npcId, relationshipLevel) => {
    // relationshipLevel: -100 to 100
    // Negative = conflict, Positive = friendship/romance

    const encounterId = `rel_encounter_${Date.now()}`

    let encounterType = 'neutral'
    let description = ''
    let options = []

    if (relationshipLevel > 80) {
      encounterType = 'romance_moment'
      description = `${npcId} looks at you with feelings they can no longer hide...`
      options = [
        { text: 'Reciprocate their feelings', consequence: 'relationship_deepens' },
        { text: 'Tell them you just want to be friends', consequence: 'gentle_rejection' },
        { text: 'Tell them you need time to think', consequence: 'relationship_pause' }
      ]
    } else if (relationshipLevel > 50) {
      encounterType = 'friendship_moment'
      description = `${npcId} smiles warmly when they see you. They seem genuinely glad to see you.`
      options = [
        { text: 'Invite them to do something fun', consequence: 'bonding_activity' },
        { text: 'Ask about their life', consequence: 'deep_conversation' },
        { text: 'Just chat casually', consequence: 'pleasant_chat' }
      ]
    } else if (relationshipLevel < -50) {
      encounterType = 'conflict_moment'
      description = `${npcId} sees you and their expression hardens. The air between you feels tense.`
      options = [
        { text: 'Try to apologize and reconcile', consequence: 'reconciliation_attempt' },
        { text: 'Ignore them and walk past', consequence: 'escalate_conflict' },
        { text: 'Ask what their problem is', consequence: 'confrontation' }
      ]
    } else {
      encounterType = 'casual_meeting'
      description = `You run into ${npcId} in the area.`
      options = [
        { text: 'Start a conversation', consequence: 'conversation_starts' },
        { text: 'Exchange pleasantries', consequence: 'polite_greeting' },
        { text: 'Move on with your day', consequence: 'brief_wave' }
      ]
    }

    const encounter = {
      id: encounterId,
      playerId: playerId,
      npcId: npcId,
      type: encounterType,
      description: description,
      options: options,
      relationshipLevel: relationshipLevel,
      started: Date.now(),
      status: 'active'
    }

    set(state => ({
      activeEncounters: {
        ...state.activeEncounters,
        [playerId]: encounter
      }
    }))

    return {
      success: true,
      encounterId: encounterId,
      type: encounterType,
      description: description,
      options: options
    }
  },

  // ===== REPUTATION-GATED ENCOUNTER =====
  triggerReputationEncounter: (playerId, npcId, playerReputation) => {
    // Different encounters unlock at different reputation levels

    let encounter = null

    if (playerReputation >= 200) {
      encounter = {
        type: 'legendary_hero',
        description: `${npcId} approaches you with respect and awe. "I've heard about what you've been doing. You're becoming a legend."`,
        options: [
          { text: 'Accept the recognition', consequence: 'reputation_boost' },
          { text: 'Stay humble', consequence: 'reputation_stable' }
        ]
      }
    } else if (playerReputation >= 100) {
      encounter = {
        type: 'community_helper',
        description: `${npcId} thanks you for all the good work you've been doing. "The community is better because of you."`,
        options: [
          { text: 'Accept humbly', consequence: 'positive_interaction' },
          { text: 'Ask if they need help with anything', consequence: 'quest_offered' }
        ]
      }
    } else if (playerReputation >= 50) {
      encounter = {
        type: 'known_person',
        description: `${npcId} recognizes you. "Hey, I've seen you around. You seem like someone I could trust."`,
        options: [
          { text: 'Build the connection', consequence: 'friendship_starts' },
          { text: 'Stay professional', consequence: 'acquaintance' }
        ]
      }
    } else if (playerReputation < -100) {
      encounter = {
        type: 'trouble_maker',
        description: `${npcId} crosses the street to avoid you. They clearly want nothing to do with you.`,
        options: [
          { text: 'Try to change their mind', consequence: 'redemption_attempt' },
          { text: 'Ignore them', consequence: 'avoid_shame' }
        ]
      }
    }

    if (!encounter) {
      return { success: false, error: 'No encounter available at this reputation level' }
    }

    const encounterId = `rep_encounter_${Date.now()}`
    const fullEncounter = {
      id: encounterId,
      playerId: playerId,
      npcId: npcId,
      playerReputation: playerReputation,
      started: Date.now(),
      status: 'active',
      ...encounter
    }

    set(state => ({
      activeEncounters: {
        ...state.activeEncounters,
        [playerId]: fullEncounter
      }
    }))

    return {
      success: true,
      encounterId: encounterId,
      type: encounter.type,
      description: encounter.description,
      options: encounter.options
    }
  },

  // ===== QUEST GENERATOR FROM ENCOUNTER =====
  generateQuestFromEncounter: (encounterId, questType = 'help') => {
    // questType: 'help', 'retrieve', 'deliver', 'discover', 'resolve'

    const quest = {
      questId: `quest_${Date.now()}`,
      encounterTriggered: encounterId,
      type: questType,
      title: '',
      description: '',
      objectives: [],
      rewards: {
        credits: 0,
        experience: 0,
        reputation: 0
      },
      status: 'active',
      createdAt: Date.now()
    }

    const questTemplates = {
      help: {
        title: 'Help a Friend',
        description: 'An NPC needs your help with something important.',
        objectives: [
          'Talk to the NPC and understand their problem',
          'Complete the task they ask for',
          'Report back with news'
        ],
        rewards: { credits: 500, experience: 100, reputation: 25 }
      },
      retrieve: {
        title: 'Retrieve Lost Item',
        description: 'An NPC lost something valuable. Help them find it.',
        objectives: [
          'Search the area for the item',
          'Overcome obstacles or NPCs in your way',
          'Return the item to the NPC'
        ],
        rewards: { credits: 750, experience: 150, reputation: 30 }
      },
      deliver: {
        title: 'Important Delivery',
        description: 'An NPC needs you to deliver something to another person.',
        objectives: [
          'Receive the item from the NPC',
          'Travel to the destination',
          'Deliver the item safely',
          'Return with confirmation'
        ],
        rewards: { credits: 600, experience: 120, reputation: 20 }
      },
      discover: {
        title: 'Uncover the Truth',
        description: 'An NPC suspects something. Help them investigate.',
        objectives: [
          'Gather information from multiple NPCs',
          'Find clues in various locations',
          'Share your discoveries with the quest giver'
        ],
        rewards: { credits: 800, experience: 200, reputation: 40 }
      },
      resolve: {
        title: 'Resolve Conflict',
        description: 'Two NPCs are in conflict. Help bring peace.',
        objectives: [
          'Talk to both sides',
          'Understand each perspective',
          'Negotiate a solution',
          'Bring them together'
        ],
        rewards: { credits: 1000, experience: 250, reputation: 50 }
      }
    }

    const template = questTemplates[questType] || questTemplates.help

    return {
      ...quest,
      ...template
    }
  },

  // ===== CONSEQUENCE RESOLUTION =====
  resolveEncounterConsequence: (encounterId, consequenceType) => {
    const encounter = Object.values(
      get().activeEncounters
    ).find(e => e.id === encounterId)

    if (!encounter) return { success: false }

    const resolution = {
      consequence: consequenceType,
      relationshipChange: 0,
      reputationChange: 0,
      credits: 0,
      message: ''
    }

    switch (consequenceType) {
      case 'relationship_deepens':
        resolution.relationshipChange = 30
        resolution.message = 'Your relationship has deepened!'
        break
      case 'gentle_rejection':
        resolution.relationshipChange = -10
        resolution.message = 'They appreciate your honesty.'
        break
      case 'bonding_activity':
        resolution.relationshipChange = 20
        resolution.credits = 200
        resolution.message = 'You spent quality time together.'
        break
      case 'deep_conversation':
        resolution.relationshipChange = 25
        resolution.reputationChange = 10
        resolution.message = 'You had a meaningful conversation.'
        break
      case 'reconciliation_attempt':
        resolution.relationshipChange = 20
        resolution.message = 'The conflict begins to heal.'
        break
      case 'escalate_conflict':
        resolution.relationshipChange = -30
        resolution.message = 'The tension between you grows worse.'
        break
      case 'confrontation':
        resolution.relationshipChange = -15
        resolution.message = 'Things got heated, but maybe clearer now.'
        break
      case 'reputation_boost':
        resolution.reputationChange = 50
        resolution.credits = 500
        resolution.message = 'Your reputation has grown!'
        break
      case 'quest_offered':
        resolution.message = 'A new quest has been offered to you!'
        break
      case 'redemption_attempt':
        resolution.relationshipChange = 15
        resolution.reputationChange = 20
        resolution.message = 'You have begun to redeem yourself.'
        break
      default:
        resolution.message = 'The encounter has concluded.'
    }

    // Remove from active encounters
    const { [encounter.playerId]: removed, ...remaining } = get().activeEncounters

    set(state => ({
      activeEncounters: remaining,
      encounterHistory: [...state.encounterHistory, { ...encounter, resolution }]
    }))

    return {
      success: true,
      encounterId: encounterId,
      consequence: consequenceType,
      relationshipChange: resolution.relationshipChange,
      reputationChange: resolution.reputationChange,
      creditsEarned: resolution.credits,
      message: resolution.message
    }
  },

  // ===== GET ENCOUNTER STATUS =====
  getActiveEncounter: (playerId) => {
    return get().activeEncounters[playerId] || null
  },

  // ===== GET ENCOUNTER HISTORY =====
  getEncounterHistory: (playerId) => {
    return get().encounterHistory.filter(e => e.playerId === playerId)
  }
}))

// ===== HELPER FUNCTIONS =====

function generateEncounterType(npc) {
  const types = [
    'casual_meeting',
    'workplace_moment',
    'chance_discovery',
    'dramatic_moment',
    'funny_situation',
    'emotional_moment'
  ]

  // Weight towards job-related for working NPCs
  if (npc.role) {
    types.push('workplace_moment')
    types.push('workplace_moment')
  }

  return types[Math.floor(Math.random() * types.length)]
}

function generateEncounterContent(npc, playerId, encounterType) {
  const descriptions = {
    casual_meeting: `You run into ${npc.name} while going about your day. They wave and smile.`,
    workplace_moment: `${npc.name} is focused on work when you approach. They look up with a professional demeanor.`,
    chance_discovery: `You stumble upon ${npc.name} in an unexpected place. They seem surprised to see you.`,
    dramatic_moment: `${npc.name} appears troubled or upset about something. They seem to need someone to talk to.`,
    funny_situation: `${npc.name} is involved in something amusing and invites you to share in the humor.`,
    emotional_moment: `${npc.name} opens up about something deep and personal. They trust you with their feelings.`
  }

  return {
    description: descriptions[encounterType] || descriptions.casual_meeting,
    options: [
      { text: 'Start a conversation', consequence: 'conversation_starts' },
      { text: 'Exchange pleasantries', consequence: 'polite_greeting' },
      { text: 'Move on', consequence: 'brief_wave' }
    ]
  }
}

export function getEncounterCount() {
  return Object.keys(useNPCEncounterSystem.getState().encounters).length
}

export function getAllEncounters() {
  return useNPCEncounterSystem.getState().encounters
}
