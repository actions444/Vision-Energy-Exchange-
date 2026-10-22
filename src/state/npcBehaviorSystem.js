import { create } from 'zustand'

// NPC behavior states
export const NPC_STATES = {
  idle: 'idle',
  walking: 'walking',
  driving: 'driving',
  violation: 'violation',
  police_stop: 'police_stop',
  arrest: 'arrest',
  court: 'court',
  home: 'home'
}

// Traffic violations that trigger police stops
export const TRAFFIC_VIOLATIONS = {
  red_light: {
    id: 'red_light',
    name: 'Running Red Light',
    severity: 2,
    fine: 150,
    emoji: '🚨'
  },
  expired_tags: {
    id: 'expired_tags',
    name: 'Expired Registration Tags',
    severity: 1,
    fine: 100,
    emoji: '📋'
  },
  broken_taillight: {
    id: 'broken_taillight',
    name: 'Broken Taillight',
    severity: 1,
    fine: 75,
    emoji: '💡'
  },
  speeding: {
    id: 'speeding',
    name: 'Speeding',
    severity: 2,
    fine: 200,
    emoji: '🏎️'
  },
  unsafe_lane_change: {
    id: 'unsafe_lane_change',
    name: 'Unsafe Lane Change',
    severity: 1,
    fine: 125,
    emoji: '↔️'
  },
  no_seatbelt: {
    id: 'no_seatbelt',
    name: 'No Seatbelt',
    severity: 1,
    fine: 50,
    emoji: '🔗'
  }
}

// Police stop outcomes based on behavior
export const STOP_OUTCOMES = {
  compliant_warning: {
    id: 'compliant_warning',
    name: 'Warning Only',
    npcResponse: 'polite',
    policeAction: 'warning',
    fine: 0,
    jail: false,
    outcome: 'Released with warning'
  },
  compliant_ticket: {
    id: 'compliant_ticket',
    name: 'Ticket Issued',
    npcResponse: 'polite',
    policeAction: 'ticket',
    fine: 100,
    jail: false,
    outcome: 'Released with ticket'
  },
  compliant_arrested: {
    id: 'compliant_arrested',
    name: 'Arrest (Warrant)',
    npcResponse: 'polite',
    policeAction: 'arrest',
    fine: 0,
    jail: true,
    jailDays: 3,
    reason: 'Outstanding warrant discovered during stop',
    outcome: 'Arrested, taken to courthouse for bail hearing'
  },
  resistant_tased: {
    id: 'resistant_tased',
    name: 'Resisted, Tased',
    npcResponse: 'resistant',
    policeAction: 'tase',
    fine: 500,
    jail: true,
    jailDays: 5,
    charges: ['Resisting arrest', 'Original violation'],
    outcome: 'Tased, arrested, court appearance required'
  },
  resistant_arrested: {
    id: 'resistant_arrested',
    name: 'Resisted, Arrested',
    npcResponse: 'hostile',
    policeAction: 'arrest_force',
    fine: 1000,
    jail: true,
    jailDays: 7,
    charges: ['Resisting arrest', 'Assault on officer', 'Original violation'],
    outcome: 'Forcibly arrested, serious charges added'
  },
  hostile_shooting: {
    id: 'hostile_shooting',
    name: 'Armed/Hostile',
    npcResponse: 'hostile_armed',
    policeAction: 'lethal_force',
    fine: 0,
    jail: false,
    alive: false,
    outcome: 'Officer uses lethal force - NPC killed'
  },
  fleeing_chase: {
    id: 'fleeing_chase',
    name: 'Fled - Police Chase',
    npcResponse: 'fleeing',
    policeAction: 'chase',
    fine: 2000,
    jail: true,
    jailDays: 10,
    charges: ['Fleeing police', 'Original violation'],
    outcome: 'Lengthy prison sentence'
  }
}

export const useNPCBehaviorSystem = create((set, get) => ({
  // NPC behaviors and scenarios
  npcs: {}, // npcId -> behavior state
  activeStops: {}, // policeId -> { npcId, outcome, stage }

  // Scenario tracking
  scenarios: {}, // scenarioId -> status
  completedScenarios: []

  // ===== NPC TRAFFIC VIOLATIONS =====
  assignRandomViolation: (npcId) => {
    const violations = Object.values(TRAFFIC_VIOLATIONS)
    const randomViolation = violations[Math.floor(Math.random() * violations.length)]

    set(state => ({
      npcs: {
        ...state.npcs,
        [npcId]: {
          ...state.npcs[npcId],
          violation: randomViolation,
          state: NPC_STATES.violation
        }
      }
    }))
  },

  // ===== POLICE STOP MECHANICS =====
  initiatePoliceStop: (npcId, policeId, violation) => {
    // Determine NPC response based on personality
    const npcResponses = ['compliant', 'nervous', 'resistant', 'hostile_armed']
    const randomResponse = npcResponses[Math.floor(Math.random() * npcResponses.length)]

    set(state => ({
      npcs: {
        ...state.npcs,
        [npcId]: {
          ...state.npcs[npcId],
          state: NPC_STATES.police_stop,
          behavior: randomResponse
        }
      },
      activeStops: {
        ...state.activeStops,
        [policeId]: {
          npcId,
          violation,
          npcBehavior: randomResponse,
          stage: 'initial_stop',
          duration: 0,
          timeElapsed: 0
        }
      }
    }))
  },

  // ===== STOP OUTCOMES - EDUCATIONAL BRANCHES =====
  compliantStop: (policeId) => {
    const stop = get().activeStops[policeId]
    if (!stop) return

    // Compliant NPC - much better outcome
    const outcome = Math.random() < 0.6 ?
      STOP_OUTCOMES.compliant_warning :
      STOP_OUTCOMES.compliant_ticket

    set(state => ({
      activeStops: {
        ...state.activeStops,
        [policeId]: {
          ...stop,
          outcome: outcome,
          stage: 'completed'
        }
      },
      npcs: {
        ...state.npcs,
        [stop.npcId]: {
          ...state.npcs[stop.npcId],
          state: NPC_STATES.home,
          lastOutcome: outcome,
          fine: outcome.fine,
          jail: outcome.jail,
          jailDays: outcome.jailDays || 0
        }
      }
    }))
  },

  resistantStop: (policeId) => {
    const stop = get().activeStops[policeId]
    if (!stop) return

    // Resistant NPC - serious charges added
    const outcome = Math.random() < 0.5 ?
      STOP_OUTCOMES.resistant_tased :
      STOP_OUTCOMES.resistant_arrested

    set(state => ({
      activeStops: {
        ...state.activeStops,
        [policeId]: {
          ...stop,
          outcome: outcome,
          stage: 'completed'
        }
      },
      npcs: {
        ...state.npcs,
        [stop.npcId]: {
          ...state.npcs[stop.npcId],
          state: NPC_STATES.arrest,
          lastOutcome: outcome,
          fine: outcome.fine,
          jail: outcome.jail,
          jailDays: outcome.jailDays,
          charges: outcome.charges,
          needsCourt: true
        }
      }
    }))
  },

  hostileStop: (policeId) => {
    const stop = get().activeStops[policeId]
    if (!stop) return

    // Armed/Hostile NPC - lethal force
    const outcome = STOP_OUTCOMES.hostile_shooting

    set(state => ({
      activeStops: {
        ...state.activeStops,
        [policeId]: {
          ...stop,
          outcome: outcome,
          stage: 'completed'
        }
      },
      npcs: {
        ...state.npcs,
        [stop.npcId]: {
          ...state.npcs[stop.npcId],
          state: 'deceased',
          lastOutcome: outcome,
          alive: false
        }
      }
    }))
  },

  // ===== COURT SYSTEM =====
  scheduleCourtAppearance: (npcId, charges, bail = 5000) => {
    set(state => ({
      npcs: {
        ...state.npcs,
        [npcId]: {
          ...state.npcs[npcId],
          state: NPC_STATES.court,
          charges,
          bail,
          scheduledCourt: true,
          courtDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      }
    }))
  },

  payBail: (npcId, amount) => {
    const npc = get().npcs[npcId]
    if (!npc || amount < npc.bail) return false

    set(state => ({
      npcs: {
        ...state.npcs,
        [npcId]: {
          ...state.npcs[npcId],
          state: NPC_STATES.home,
          bailPaid: true,
          balance: (npc.balance || 0) - amount
        }
      }
    }))

    return true
  },

  holdCourt: (npcId) => {
    const npc = get().npcs[npcId]
    if (!npc || !npc.scheduledCourt) return

    // Sentencing based on charges
    let sentenceDays = 0
    const sentenceMap = {
      'Running red light': 1,
      'Expired tags': 0,
      'Resisting arrest': 5,
      'Assault on officer': 10,
      'Fleeing police': 10
    }

    npc.charges?.forEach(charge => {
      sentenceDays += sentenceMap[charge] || 3
    })

    set(state => ({
      npcs: {
        ...state.npcs,
        [npcId]: {
          ...state.npcs[npcId],
          state: NPC_STATES.home,
          courtAppearanceComplete: true,
          sentenceDays,
          released: sentenceDays === 0,
          jail: sentenceDays > 0
        }
      }
    }))
  },

  // ===== EDUCATIONAL SCENARIOS =====
  getScenarioOutcome: (scenario) => {
    // Returns the lesson from the scenario
    const outcomes = {
      compliant_warning: '✅ Cooperating with police = warning only\nLesson: Compliance de-escalates situations',
      compliant_ticket: '✅ Polite, compliant stop = ticket\nLesson: You may get a ticket, but you\'re safe',
      resistant_tased: '⚠️ Resisting arrest = tased + charges\nLesson: Adding charges increases consequences',
      hostile_armed: '🚨 Armed/Hostile = lethal force\nLesson: Officers use force when threatened',
      compliant_warrant: '⚠️ Outstanding warrant discovered\nLesson: Even minor stops can reveal issues'
    }
    return outcomes[scenario] || 'Unknown outcome'
  },

  // ===== UTILITY =====
  getNPCStatus: (npcId) => {
    return get().npcs[npcId]
  },

  recordScenarioCompletion: (scenarioId, outcome) => {
    set(state => ({
      completedScenarios: [
        ...state.completedScenarios,
        { scenarioId, outcome, timestamp: Date.now() }
      ]
    }))
  },

  getEducationalLessons: () => {
    return {
      lesson1: {
        title: 'The Traffic Stop',
        description: 'How a simple traffic stop can escalate based on behavior',
        points: [
          'Most stops are brief - cooperate and you\'ll be on your way',
          'Stay calm and hands visible',
          'Comply with lawful orders',
          'Know your rights but don\'t resist'
        ]
      },
      lesson2: {
        title: 'Compliance vs. Resistance',
        description: 'Why compliance matters during police encounters',
        points: [
          'Compliant: warning or ticket, released',
          'Resistant: tased, arrested, additional charges',
          'Every action adds to your charges',
          'You can fight in court, not on the street'
        ]
      },
      lesson3: {
        title: 'The Court System',
        description: 'What happens after arrest and how court works',
        points: [
          'Bail hearing determines release amount',
          'You have right to attorney',
          'Charges determine sentence length',
          'Record affects future encounters'
        ]
      },
      lesson4: {
        title: 'Your Rights',
        description: 'Know your legal rights during stops',
        points: [
          'Right to remain silent',
          'Right to refuse search without warrant',
          'Right to attorney',
          'Right to know why you\'re being stopped'
        ]
      }
    }
  }
}))
