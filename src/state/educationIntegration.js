import { create } from 'zustand'

/**
 * Educational Integration System
 *
 * Step 1: Wire scenarios into gameplay flow
 * Step 2: Track player progress across all systems
 * Step 3: NPC autonomy - NPCs teach independently
 * Step 4: Interactive choices - player decisions matter
 * Step 5: Statistics dashboard - see all progress
 */

export const useEducationIntegration = create((set, get) => ({
  // ===== STEP 1: SCENARIO INTEGRATION =====
  // Wire educational scenarios into gameplay flow

  activeScenarios: {}, // scenarioId -> { type, npcId, status, triggered }
  scenarioTriggers: {}, // Define when scenarios trigger

  // Trigger points in the game
  TRIGGER_TYPES: {
    traffic_stop: 'traffic_stop',         // When police stop an NPC
    crime_arrest: 'crime_arrest',         // When NPC commits crime
    court_appearance: 'court_appearance', // Court date
    business_start: 'business_start',     // Starting a business
    enrollment: 'enrollment',             // Taking a course
    marriage_event: 'marriage_event',     // Relationship milestone
    health_issue: 'health_issue'          // Health/STD issue
  },

  // Queue scenarios to trigger
  queueScenario: (triggerType, data) => {
    const scenarioId = `scenario_${triggerType}_${Date.now()}`

    set(state => ({
      activeScenarios: {
        ...state.activeScenarios,
        [scenarioId]: {
          scenarioId,
          triggerType,
          data,
          status: 'queued',
          triggeredAt: new Date(),
          playerViewed: false,
          playerCompleted: false
        }
      }
    }))

    return scenarioId
  },

  // Trigger a scenario in gameplay
  triggerScenario: (scenarioId) => {
    set(state => {
      const scenario = state.activeScenarios[scenarioId]
      if (!scenario) return state

      return {
        activeScenarios: {
          ...state.activeScenarios,
          [scenarioId]: {
            ...scenario,
            status: 'active',
            displayedAt: new Date()
          }
        }
      }
    })
  },

  // Player completes/views scenario
  completeScenario: (scenarioId) => {
    set(state => {
      const scenario = state.activeScenarios[scenarioId]
      if (!scenario) return state

      return {
        activeScenarios: {
          ...state.activeScenarios,
          [scenarioId]: {
            ...scenario,
            status: 'completed',
            playerViewed: true,
            playerCompleted: true,
            completedAt: new Date()
          }
        }
      }
    })
  },

  getActiveScenarios: () => {
    return Object.values(get().activeScenarios).filter(s => s.status === 'active')
  },

  getQueuedScenarios: () => {
    return Object.values(get().activeScenarios).filter(s => s.status === 'queued')
  },

  // ===== STEP 2: PLAYER PROGRESS TRACKING =====
  // Comprehensive progress tracking across all systems

  playerProgress: {
    educationStats: {
      coursesEnrolled: 0,
      coursesCompleted: 0,
      certificatesEarned: 0,
      videosWatched: 0,
      lessonsLearned: []
    },
    policeEncounters: {
      stops: 0,
      arrests: 0,
      courtAppearances: 0,
      scenarios: []
    },
    relationshipStats: {
      marriages: 0,
      divorces: 0,
      counselingSessions: 0,
      conversations: []
    },
    businessStats: {
      businessesStarted: 0,
      businessesOperating: 0,
      contentCreated: 0,
      earnings: 0
    },
    healthStats: {
      stdsLearned: [],
      remediesDiscovered: [],
      healingSessions: 0
    },
    spiritualStats: {
      churchVisits: 0,
      gaiaTeachings: 0,
      spiritualPractices: []
    }
  },

  // Record progress event
  recordProgress: (category, event, details = {}) => {
    set(state => {
      const newProgress = { ...state.playerProgress }

      // Update category stats
      if (newProgress[category]) {
        newProgress[category] = {
          ...newProgress[category],
          ...details
        }
      }

      return {
        playerProgress: newProgress
      }
    })
  },

  addLessonLearned: (lesson, source) => {
    set(state => ({
      playerProgress: {
        ...state.playerProgress,
        educationStats: {
          ...state.playerProgress.educationStats,
          lessonsLearned: [
            ...state.playerProgress.educationStats.lessonsLearned,
            {
              lesson,
              source,
              learnedAt: new Date()
            }
          ]
        }
      }
    }))
  },

  // ===== STEP 3: NPC AUTONOMY =====
  // NPCs teach independently and behave autonomously

  npcTeachers: {}, // npcId -> { name, specialty, students, sessions }
  npcBehaviors: {}, // npcId -> { schedule, routines, teachings }

  registerNPCTeacher: (npcId, name, specialty) => {
    set(state => ({
      npcTeachers: {
        ...state.npcTeachers,
        [npcId]: {
          npcId,
          name,
          specialty,
          students: [],
          sessionsHeld: 0,
          peopleHelped: 0
        }
      }
    }))
  },

  // NPC holds teaching session
  npcTeachingSession: (npcId, studentsCount = 1) => {
    set(state => {
      const teacher = state.npcTeachers[npcId]
      if (!teacher) return state

      return {
        npcTeachers: {
          ...state.npcTeachers,
          [npcId]: {
            ...teacher,
            sessionsHeld: teacher.sessionsHeld + 1,
            peopleHelped: teacher.peopleHelped + studentsCount
          }
        }
      }
    })
  },

  // NPC routine behavior
  setNPCRoutine: (npcId, routine) => {
    set(state => ({
      npcBehaviors: {
        ...state.npcBehaviors,
        [npcId]: {
          ...state.npcBehaviors[npcId],
          ...routine,
          lastUpdated: new Date()
        }
      }
    }))
  },

  // Get NPC teaching impact
  getNPCImpact: (npcId) => {
    const teacher = get().npcTeachers[npcId]
    if (!teacher) return null

    return {
      name: teacher.name,
      specialty: teacher.specialty,
      sessionsHeld: teacher.sessionsHeld,
      peopleHelpedLifetime: teacher.peopleHelped,
      students: teacher.students,
      impactScore: teacher.sessionsHeld * teacher.students.length
    }
  },

  // ===== STEP 4: INTERACTIVE CHOICES =====
  // Player decisions affect outcomes

  currentChoiceScene: null,
  playerChoiceHistory: [], // Track all choices made

  presentChoice: (sceneId, question, options) => {
    set({
      currentChoiceScene: {
        sceneId,
        question,
        options, // [{ id, text, consequence, outcome }]
        presentedAt: new Date()
      }
    })
  },

  makeChoice: (choiceId, optionId) => {
    set(state => {
      const scene = state.currentChoiceScene
      if (!scene) return state

      const option = scene.options.find(opt => opt.id === optionId)
      if (!option) return state

      return {
        playerChoiceHistory: [
          ...state.playerChoiceHistory,
          {
            sceneId: scene.sceneId,
            choiceId,
            optionId,
            optionText: option.text,
            consequence: option.consequence,
            outcome: option.outcome,
            madeAt: new Date()
          }
        ],
        currentChoiceScene: null
      }
    })
  },

  // Get consequence of choice
  getChoiceConsequence: (choiceId) => {
    const choice = get().playerChoiceHistory.find(c => c.choiceId === choiceId)
    return choice ? choice.consequence : null
  },

  // Track choice themes
  getChoicePatterns: () => {
    const history = get().playerChoiceHistory
    const patterns = {
      selfishChoices: 0,
      compassionateChoices: 0,
      honestChoices: 0,
      avoidantChoices: 0
    }

    history.forEach(choice => {
      // Analyze choice consequences to determine theme
      if (choice.consequence?.affectsOthers) patterns.selfishChoices++
      if (choice.consequence?.helpsOthers) patterns.compassionateChoices++
      if (choice.consequence?.truthful) patterns.honestChoices++
      if (choice.consequence?.avoids) patterns.avoidantChoices++
    })

    return patterns
  },

  // ===== STEP 5: STATISTICS DASHBOARD =====
  // Comprehensive statistics page

  getDashboardStats: () => {
    const progress = get().playerProgress
    const choices = get().playerChoiceHistory
    const npcTeachers = Object.values(get().npcTeachers)

    return {
      education: {
        coursesEnrolled: progress.educationStats.coursesEnrolled,
        coursesCompleted: progress.educationStats.coursesCompleted,
        certificatesEarned: progress.educationStats.certificatesEarned,
        videosWatched: progress.educationStats.videosWatched,
        lessonsLearned: progress.educationStats.lessonsLearned.length,
        completionRate: progress.educationStats.coursesEnrolled > 0
          ? Math.round((progress.educationStats.coursesCompleted / progress.educationStats.coursesEnrolled) * 100)
          : 0
      },

      policeEncounters: {
        trafficStops: progress.policeEncounters.stops,
        arrests: progress.policeEncounters.arrests,
        courtAppearances: progress.policeEncounters.courtAppearances,
        safetyRate: progress.policeEncounters.stops > 0
          ? Math.round(((progress.policeEncounters.stops - progress.policeEncounters.arrests) / progress.policeEncounters.stops) * 100)
          : 0
      },

      relationships: {
        marriages: progress.relationshipStats.marriages,
        divorces: progress.relationshipStats.divorces,
        counselingSessions: progress.relationshipStats.counselingSessions,
        activeConversations: progress.relationshipStats.conversations.length
      },

      business: {
        businessesStarted: progress.businessStats.businessesStarted,
        operating: progress.businessStats.businessesOperating,
        contentCreated: progress.businessStats.contentCreated,
        earnings: progress.businessStats.earnings
      },

      health: {
        stdsLearned: progress.healthStats.stdsLearned.length,
        remediesDiscovered: progress.healthStats.remediesDiscovered.length,
        healingSessions: progress.healthStats.healingSessions
      },

      spiritual: {
        churchVisits: progress.spiritualStats.churchVisits,
        gaiaTeachings: progress.spiritualStats.gaiaTeachings,
        practices: progress.spiritualStats.spiritualPractices.length
      },

      choices: {
        totalChoicesMade: choices.length,
        compassionateChoices: get().getChoicePatterns().compassionateChoices,
        honestChoices: get().getChoicePatterns().honestChoices,
        selfishChoices: get().getChoicePatterns().selfishChoices
      },

      npcImpact: {
        teachersActive: npcTeachers.length,
        totalSessionsHeld: npcTeachers.reduce((sum, t) => sum + t.sessionsHeld, 0),
        totalPeopleHelped: npcTeachers.reduce((sum, t) => sum + t.peopleHelped, 0)
      },

      overallProgress: Math.round(
        (progress.educationStats.coursesCompleted * 10 +
         progress.relationshipStats.counselingSessions * 5 +
         progress.businessStats.businessesOperating * 8 +
         progress.healthStats.healingSessions * 3) / 100
      )
    }
  },

  // Get progress timeline
  getProgressTimeline: () => {
    const history = get().playerChoiceHistory
    return history.map((choice, idx) => ({
      eventNumber: idx + 1,
      event: choice.optionText,
      consequence: choice.consequence,
      date: choice.madeAt
    }))
  },

  // Get educational impact
  getEducationalImpact: () => {
    const progress = get().playerProgress
    const lessons = progress.educationStats.lessonsLearned

    return {
      totalLessonsLearned: lessons.length,
      lessonsBySource: lessons.reduce((acc, l) => {
        acc[l.source] = (acc[l.source] || 0) + 1
        return acc
      }, {}),
      topicsMastered: lessons.filter(l => l.lesson.includes('Master')).length,
      developingTopics: lessons.filter(l => l.lesson.includes('Learning')).length
    }
  },

  // Reset progress
  resetProgress: () => {
    set({
      playerProgress: {
        educationStats: {
          coursesEnrolled: 0,
          coursesCompleted: 0,
          certificatesEarned: 0,
          videosWatched: 0,
          lessonsLearned: []
        },
        policeEncounters: {
          stops: 0,
          arrests: 0,
          courtAppearances: 0,
          scenarios: []
        },
        relationshipStats: {
          marriages: 0,
          divorces: 0,
          counselingSessions: 0,
          conversations: []
        },
        businessStats: {
          businessesStarted: 0,
          businessesOperating: 0,
          contentCreated: 0,
          earnings: 0
        },
        healthStats: {
          stdsLearned: [],
          remediesDiscovered: [],
          healingSessions: 0
        },
        spiritualStats: {
          churchVisits: 0,
          gaiaTeachings: 0,
          spiritualPractices: []
        }
      },
      playerChoiceHistory: [],
      activeScenarios: {}
    })
  }
}))
