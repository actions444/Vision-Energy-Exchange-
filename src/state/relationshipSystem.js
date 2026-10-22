import { create } from 'zustand'

/**
 * Relationship & Marriage Counseling System
 *
 * Purpose: Teach healthy relationships, honest communication, STD education, spiritual guidance
 * - Help people understand importance of honesty with partners
 * - Conversations about growing apart, wanting to explore
 * - HIV/STD education and herbal remedies
 * - Spiritual guidance and Mother Gaia teachings
 */

export const RELATIONSHIP_TYPES = {
  dating: 'dating',
  engaged: 'engaged',
  married: 'married',
  separated: 'separated',
  divorced: 'divorced'
}

export const RELATIONSHIP_ISSUES = {
  communication: 'Poor Communication',
  infidelity: 'Infidelity/Trust Issues',
  growing_apart: 'Growing Apart',
  exploring: 'Wanting to Explore',
  financial: 'Financial Stress',
  intimacy: 'Intimacy Issues',
  different_goals: 'Different Life Goals',
  health: 'Health/STD Concerns',
  addiction: 'Addiction Issues',
  family: 'Family Conflicts'
}

export const STD_INFO = {
  hiv: {
    id: 'hiv',
    name: 'HIV (Human Immunodeficiency Virus)',
    description: 'Affects immune system',
    transmission: 'Blood, sexual contact',
    symptoms: 'Flu-like initially, then asymptomatic',
    herbalRemedies: [
      'Moringa (boosts immune system)',
      'Ginger (anti-inflammatory)',
      'Turmeric (anti-viral properties)',
      'St. Johns Wort (immune support)',
      'Astragalus (strengthens immunity)',
      'Garlic (natural antibiotic)'
    ],
    professionalCare: 'Antiretroviral therapy required',
    prevention: 'Safe sex practices, testing, PrEP'
  },
  chlamydia: {
    id: 'chlamydia',
    name: 'Chlamydia',
    description: 'Bacterial infection',
    transmission: 'Sexual contact',
    symptoms: 'Discharge, pain during urination',
    herbalRemedies: [
      'Echinacea (immune boost)',
      'Goldenseal (antibacterial)',
      'Tea tree oil (antimicrobial)',
      'Calendula (healing)',
      'Oregano oil (antibacterial)',
      'Thyme (natural antibiotic)'
    ],
    professionalCare: 'Antibiotics effective',
    prevention: 'Safe sex, regular testing'
  },
  gonorrhea: {
    id: 'gonorrhea',
    name: 'Gonorrhea',
    description: 'Bacterial infection',
    transmission: 'Sexual contact',
    symptoms: 'Discharge, painful urination',
    herbalRemedies: [
      'Uva ursi (urinary support)',
      'Juniper berry (antibacterial)',
      'Garlic (natural antibiotic)',
      'Propolis (antimicrobial)',
      'D-Mannose (urinary health)',
      'Cranberry (UTI support)'
    ],
    professionalCare: 'Antibiotics essential',
    prevention: 'Safe sex practices'
  },
  herpes: {
    id: 'herpes',
    name: 'Herpes Simplex',
    description: 'Viral infection',
    transmission: 'Skin-to-skin contact',
    symptoms: 'Painful blisters, recurrent outbreaks',
    herbalRemedies: [
      'Lysine (amino acid supplement)',
      'Lemon balm (antiviral)',
      'Licorice root (immune support)',
      'Olive leaf (antiviral)',
      'Ginger (inflammation)',
      'Echinacea (immune boost)'
    ],
    professionalCare: 'Antivirals help manage',
    prevention: 'Safe sex, avoid contact during outbreaks'
  },
  hpv: {
    id: 'hpv',
    name: 'HPV (Human Papillomavirus)',
    description: 'Viral infection, can cause warts/cancer',
    transmission: 'Sexual contact',
    symptoms: 'Often asymptomatic, genital warts possible',
    herbalRemedies: [
      'Thuja (immune support)',
      'Bloodroot (topical)',
      'Garlic (antiviral)',
      'St. Johns Wort (antiviral)',
      'Echinacea (immune boost)',
      'Curcumin (anti-inflammatory)'
    ],
    professionalCare: 'Vaccines available, monitoring needed',
    prevention: 'Vaccination, safe sex'
  },
  hepatitis_b: {
    id: 'hepatitis_b',
    name: 'Hepatitis B',
    description: 'Viral infection affecting liver',
    transmission: 'Blood, body fluids, sexual contact',
    symptoms: 'Fatigue, jaundice, liver pain',
    herbalRemedies: [
      'Milk thistle (liver support)',
      'Licorice root (liver protection)',
      'Turmeric (anti-inflammatory)',
      'Dandelion (liver detox)',
      'Artichoke (liver function)',
      'Burdock (blood purification)'
    ],
    professionalCare: 'Vaccine available, medical monitoring',
    prevention: 'Vaccination, safe practices'
  }
}

export const useRelationshipSystem = create((set, get) => ({
  // Player relationships
  playerRelationships: {}, // partnerId -> relationship data
  marriageHistory: [],

  // Counseling
  counselingSessions: [],
  counselor: {
    id: 'counselor_sage',
    name: 'Sage - Marriage Counselor',
    specialty: 'Relationships, Communication, Healing',
    approach: 'Honest dialogue, compassion, truth-telling',
    type: 'NPC',
    emoji: '💬',
    availability: 'Always available'
  },

  // ===== RELATIONSHIP MANAGEMENT =====
  startRelationship: (partnerId, partnerName, type = 'dating') => {
    set(state => ({
      playerRelationships: {
        ...state.playerRelationships,
        [partnerId]: {
          partnerId,
          partnerName,
          type,
          startDate: new Date(),
          trust: 80,
          communication: 70,
          intimacy: 75,
          compatibility: 80,
          issues: [],
          events: [],
          counselingSessions: 0,
          conversationsHad: []
        }
      }
    }))
  },

  // Change relationship status
  updateRelationshipStatus: (partnerId, newStatus) => {
    set(state => {
      const relationship = state.playerRelationships[partnerId]
      if (!relationship) return state

      return {
        playerRelationships: {
          ...state.playerRelationships,
          [partnerId]: {
            ...relationship,
            type: newStatus,
            statusChangedAt: new Date()
          }
        }
      }
    })
  },

  // Add relationship issue
  addRelationshipIssue: (partnerId, issueType, description) => {
    set(state => {
      const relationship = state.playerRelationships[partnerId]
      if (!relationship) return state

      return {
        playerRelationships: {
          ...state.playerRelationships,
          [partnerId]: {
            ...relationship,
            issues: [
              ...relationship.issues,
              {
                type: issueType,
                description,
                addedAt: new Date(),
                resolved: false
              }
            ]
          }
        }
      }
    })
  },

  // ===== COUNSELING CONVERSATIONS =====
  // Start counseling session
  startCounselingSession: (partnerId) => {
    const relationship = get().playerRelationships[partnerId]
    if (!relationship) return null

    const sessionId = `session_${partnerId}_${Date.now()}`

    set(state => ({
      playerRelationships: {
        ...state.playerRelationships,
        [partnerId]: {
          ...state.playerRelationships[partnerId],
          counselingSessions: state.playerRelationships[partnerId].counselingSessions + 1
        }
      },
      counselingSessions: [
        ...state.counselingSessions,
        {
          sessionId,
          partnerId,
          partnerName: relationship.partnerName,
          startDate: new Date(),
          issues: relationship.issues,
          resolutions: [],
          insights: []
        }
      ]
    }))

    return sessionId
  },

  // Counseling topic conversation
  counselingConversation: (sessionId, topic, playerResponse) => {
    const responses = {
      honesty: {
        topic: 'Being Honest About Your Feelings',
        counselorSays: 'Honesty is the foundation of all healthy relationships. Tell your partner the truth - whether you\'re growing apart, wanting to explore, or needing space. They deserve to know.',
        reflection: 'True love means giving your partner the chance to understand what\'s happening with you.',
        lesson: 'Communication builds trust'
      },
      leaving: {
        topic: 'When It\'s Time to Leave',
        counselorSays: 'If you\'ve outgrown the relationship or want to explore something new, your partner deserves to know WHY. Don\'t just disappear or cheat. Have the conversation.',
        reflection: 'A clean, honest break is more respectful than a slow fade or betrayal.',
        lesson: 'Compassion even in endings'
      },
      betrayal: {
        topic: 'Infidelity & Broken Trust',
        counselorSays: 'If you\'ve been with someone else, tell your partner. They may choose to leave, but at least they\'ll have the truth and can make an informed decision.',
        reflection: 'Secrets destroy more relationships than truth ever will.',
        lesson: 'Owning your mistakes is strength'
      },
      health: {
        topic: 'Sexual Health Conversations',
        counselorSays: 'You must discuss sexual health with your partner. If you have an STD or suspect exposure, tell them immediately so they can protect themselves and get tested.',
        reflection: 'Protecting your partner\'s health is an act of love.',
        lesson: 'Health conversations save lives'
      },
      intimacy: {
        topic: 'Rebuilding Intimacy',
        counselorSays: 'Intimacy goes beyond physical. It\'s about emotional openness, vulnerability, and being truly seen by your partner. Are you willing to be that vulnerable?',
        reflection: 'Real intimacy requires real honesty.',
        lesson: 'Vulnerability creates connection'
      },
      separation: {
        topic: 'Healthy Separation',
        counselorSays: 'Sometimes people need space. A healthy separation means clear boundaries, ongoing communication, and honesty about what comes next.',
        reflection: 'Space doesn\'t have to mean the end.',
        lesson: 'Clarity about expectations matters'
      }
    }

    const response = responses[topic] || responses.honesty

    set(state => {
      const session = state.counselingSessions.find(s => s.sessionId === sessionId)
      if (!session) return state

      return {
        counselingSessions: state.counselingSessions.map(s =>
          s.sessionId === sessionId ? {
            ...s,
            insights: [
              ...s.insights,
              {
                topic: response.topic,
                playerSaid: playerResponse,
                counselorSaid: response.counselorSays,
                reflection: response.reflection,
                lesson: response.lesson,
                timestamp: new Date()
              }
            ]
          } : s
        )
      }
    })

    return response
  },

  // Resolve relationship issue
  resolveIssue: (partnerId, issueType, resolution) => {
    set(state => {
      const relationship = state.playerRelationships[partnerId]
      if (!relationship) return state

      return {
        playerRelationships: {
          ...state.playerRelationships,
          [partnerId]: {
            ...relationship,
            issues: relationship.issues.map(issue =>
              issue.type === issueType
                ? { ...issue, resolved: true, resolution, resolvedAt: new Date() }
                : issue
            ),
            trust: Math.min(relationship.trust + 10, 100),
            communication: Math.min(relationship.communication + 10, 100)
          }
        }
      }
    })
  },

  // End relationship
  endRelationship: (partnerId, reason = 'mutual') => {
    set(state => {
      const relationship = state.playerRelationships[partnerId]
      if (!relationship) return state

      const endEvent = {
        partnerId,
        partnerName: relationship.partnerName,
        reason,
        durationMonths: Math.round((Date.now() - relationship.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)),
        durationMonths: Math.round((Date.now() - relationship.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)),
        endDate: new Date(),
        finalStatus: relationship.type
      }

      return {
        marriageHistory: [
          ...state.marriageHistory,
          endEvent
        ],
        playerRelationships: Object.keys(state.playerRelationships)
          .filter(key => key !== partnerId)
          .reduce((acc, key) => {
            acc[key] = state.playerRelationships[key]
            return acc
          }, {})
      }
    })
  },

  // ===== STD EDUCATION =====
  learnAboutSTD: (stdId) => {
    const stdInfo = STD_INFO[stdId]
    if (!stdInfo) return null

    set(state => ({
      playerRelationships: Object.keys(state.playerRelationships).length > 0
        ? state.playerRelationships // Update if in relationship
        : state.playerRelationships,
      // Track in education system
      counselingSessions: [
        ...state.counselingSessions,
        {
          sessionId: `std_education_${stdId}_${Date.now()}`,
          topic: `STD Education: ${stdInfo.name}`,
          learned: stdInfo,
          learnedAt: new Date()
        }
      ]
    }))

    return stdInfo
  },

  discoverHerbalRemedy: (stdId, remedyName) => {
    const stdInfo = STD_INFO[stdId]
    if (!stdInfo || !stdInfo.herbalRemedies.includes(remedyName)) return false

    set(state => ({
      counselingSessions: [
        ...state.counselingSessions,
        {
          sessionId: `remedy_discovered_${stdId}_${Date.now()}`,
          remedy: remedyName,
          forSTD: stdInfo.name,
          discoveredAt: new Date(),
          type: 'remedy_discovery'
        }
      ]
    }))

    return true
  },

  // ===== SPIRITUAL GUIDANCE =====
  spiritualTeachings: [
    {
      id: 'mother_gaia_1',
      name: 'Mother Gaia Creation',
      description: 'Understanding the divine feminine energy of Mother Gaia',
      teachings: [
        'All life comes from Mother Gaia',
        'We are connected to all beings',
        'Nature teaches us about cycles and balance',
        'Healing comes through alignment with nature'
      ]
    },
    {
      id: 'spiritual_connection',
      name: 'Spiritual Connection in Relationships',
      description: 'How spiritual alignment affects relationships',
      teachings: [
        'Relationships are spiritual contracts',
        'Soul connection transcends physical',
        'Honesty aligns you spiritually',
        'Betrayal creates spiritual separation'
      ]
    },
    {
      id: 'healing_path',
      name: 'The Healing Path',
      description: 'Spiritual healing after breakups',
      teachings: [
        'Healing requires releasing grudges',
        'Forgiveness sets you free',
        'Every relationship teaches you something',
        'Growth comes through pain'
      ]
    },
    {
      id: 'divine_love',
      name: 'Divine Love vs Earthly Love',
      description: 'Understanding different types of love',
      teachings: [
        'Divine love is unconditional',
        'Earthly love requires honesty',
        'True love respects free will',
        'Separation can be an act of love'
      ]
    }
  ],

  attendSpiritual Teaching: (teachingId) => {
    const teaching = get().spiritualTeachings.find(t => t.id === teachingId)
    if (!teaching) return null

    return teaching
  },

  // ===== RELATIONSHIP STATISTICS =====
  getRelationshipStats: (partnerId) => {
    const relationship = get().playerRelationships[partnerId]
    if (!relationship) return null

    return {
      partner: relationship.partnerName,
      type: relationship.type,
      duration: Math.round((Date.now() - relationship.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)) + ' months',
      trust: relationship.trust,
      communication: relationship.communication,
      intimacy: relationship.intimacy,
      compatibility: relationship.compatibility,
      activeIssues: relationship.issues.filter(i => !i.resolved).length,
      resolvedIssues: relationship.issues.filter(i => i.resolved).length,
      counselingSessions: relationship.counselingSessions,
      healthScore: Math.round((relationship.trust + relationship.communication + relationship.intimacy + relationship.compatibility) / 4)
    }
  },

  getCounselingHistory: () => {
    return get().counselingSessions
  },

  getMarriageHistory: () => {
    return get().marriageHistory
  },

  // Get relationship advice based on status
  getAdvice: (partnerId) => {
    const relationship = get().playerRelationships[partnerId]
    if (!relationship) return null

    if (relationship.trust < 50) {
      return 'Trust is severely damaged. Consider deep counseling or honest conversation about boundaries.'
    } else if (relationship.communication < 50) {
      return 'Communication has broken down. Start having honest conversations, even if they\'re difficult.'
    } else if (relationship.intimacy < 50) {
      return 'Emotional or physical intimacy has faded. Reconnect through vulnerability and quality time.'
    } else if (relationship.compatibility < 50) {
      return 'Your life goals may no longer align. Have a conversation about your future together.'
    } else {
      return 'Your relationship has a solid foundation. Continue investing in communication and connection.'
    }
  }
}))
