/**
 * VISION STORMS WORLD - Trauma Recovery & Healing System
 *
 * Educational system teaching how to overcome:
 * - Diseases & psychological conditions
 * - Abuse, molestation, trauma
 * - Toxicity from parenting/relationships
 * - Mental health challenges through faith/prayer
 *
 * Based on Trinity's philosophy: prayer and knowledge help overcome anything
 */

import { create } from 'zustand'

export const useTraumaRecoverySystem = create((set, get) => ({
  // ===== COURSES =====
  courses: {
    overcoming_abuse_101: {
      id: 'overcoming_abuse_101',
      title: 'Overcoming Abuse: Know You Are Not Alone',
      level: 'foundational',
      price: 14900, // $149
      duration: '8 weeks',
      modules: [
        {
          id: 'module_1',
          title: 'Recognizing Abuse: Physical, Emotional, Psychological',
          topics: [
            'Types of abuse (physical, emotional, verbal, psychological, financial)',
            'How abuse affects the brain and body',
            'Recognizing patterns of manipulation',
            'Breaking the silence'
          ],
          videoHours: 3,
          interactiveExercises: 5
        },
        {
          id: 'module_2',
          title: 'Abuse from Family Members: When Home is Not Safe',
          topics: [
            'Parent abuse (physical punishment, emotional cruelty)',
            'Sibling abuse',
            'Extended family dynamics',
            'Generational trauma cycles',
            'Finding safety'
          ],
          videoHours: 3,
          interactiveExercises: 4
        },
        {
          id: 'module_3',
          title: 'Psychological Recovery: Healing Your Mind',
          topics: [
            'PTSD and trauma responses',
            'Anxiety and hypervigilance',
            'Depression from abuse',
            'Trust issues and relationships',
            'Meditation and mindfulness'
          ],
          videoHours: 3,
          interactiveExercises: 6
        },
        {
          id: 'module_4',
          title: 'Faith as Foundation: Prayer, Spiritual Healing',
          topics: [
            'Role of faith in recovery',
            'Prayer practices for trauma',
            'Spiritual protection (Yahweh protection)',
            'Connecting with divine love',
            'Forgiveness (for yourself, not for abuser)'
          ],
          videoHours: 2,
          interactiveExercises: 4
        },
        {
          id: 'module_5',
          title: 'Rebuilding Life: Creating Safety & Healthy Relationships',
          topics: [
            'Setting boundaries',
            'Recognizing healthy vs unhealthy relationships',
            'Building support systems',
            'Creating new normal',
            'Moving forward'
          ],
          videoHours: 2,
          interactiveExercises: 5
        }
      ],
      certificate: true
    },

    overcoming_molestation: {
      id: 'overcoming_molestation',
      title: 'I Am An Overcomer: Healing from Molestation & Sexual Abuse',
      level: 'foundational',
      price: 16900, // $169
      duration: '10 weeks',
      modules: [
        {
          id: 'module_1',
          title: 'What Happened Was NOT Your Fault',
          topics: [
            'Shame vs. guilt: understanding the difference',
            'Victim-blaming and why it\'s wrong',
            'Reclaiming your truth',
            'Healing starts with self-compassion'
          ],
          videoHours: 2
        },
        {
          id: 'module_2',
          title: 'Bodily Autonomy: Your Body Is Yours',
          topics: [
            'Consent education',
            'Recognizing unsafe touch',
            'Trauma responses (freezing, dissociation)',
            'Physical healing practices'
          ],
          videoHours: 3,
          interactiveExercises: 4
        },
        {
          id: 'module_3',
          title: 'Recovery from Family Member Abuse',
          topics: [
            'When the abuser is trusted family',
            'Breaking cycles: protecting your own children',
            'Confrontation vs. healing (you choose)',
            'Legal options if desired'
          ],
          videoHours: 2,
          interactiveExercises: 3
        },
        {
          id: 'module_4',
          title: 'Mental & Spiritual Healing',
          topics: [
            'Trauma responses and triggers',
            'Prayer and faith in recovery',
            'Forgiving yourself (not the abuser)',
            'Spiritual cleansing and protection'
          ],
          videoHours: 3,
          interactiveExercises: 5
        },
        {
          id: 'module_5',
          title: 'Reclaiming Your Life & Power',
          topics: [
            'From survivor to overcomer',
            'Building healthy sexuality',
            'Healthy relationships',
            'Finding purpose beyond trauma'
          ],
          videoHours: 2,
          interactiveExercises: 4
        }
      ],
      certificate: true
    },

    psychological_games_101: {
      id: 'psychological_games_101',
      title: 'Recognize the Games: Psychological Manipulation & How to Beat It',
      level: 'intermediate',
      price: 12900, // $129
      duration: '6 weeks',
      modules: [
        {
          id: 'module_1',
          title: 'Common Psychological Games & Manipulation Tactics',
          topics: [
            'Gaslighting: making you question reality',
            'Lying by omission',
            'Triangulation: using others against you',
            'Love-bombing and devaluation cycles',
            'Playing victim while abusing others'
          ],
          videoHours: 2,
          interactiveExercises: 4
        },
        {
          id: 'module_2',
          title: 'Medical Gaslighting: When Doctors Dismiss You',
          topics: [
            'Being told you have something you don\'t (quota systems)',
            'Being dismissed when something IS wrong',
            'Getting second opinions',
            'Advocating for your health'
          ],
          videoHours: 2,
          interactiveExercises: 3
        },
        {
          id: 'module_3',
          title: 'System Gaslighting: When Institutions Deny Your Reality',
          topics: [
            'Medical system quota pressure',
            'Law enforcement intimidation',
            'Financial institutions gaslighting',
            'Institutional racism and minimization'
          ],
          videoHours: 2,
          interactiveExercises: 3
        }
      ],
      certificate: true
    },

    mens_mental_health_not_weak: {
      id: 'mens_mental_health',
      title: 'Men Are Human Too: Breaking Toxic Masculinity',
      level: 'foundational',
      price: 11900, // $119
      duration: '6 weeks',
      modules: [
        {
          id: 'module_1',
          title: 'Toxic Parenting: How We Create Damaged Men',
          topics: [
            'Calling boys weak (how it damages them)',
            'Dismissing boys\' emotions',
            'Teaching boys anger is the only acceptable emotion',
            'Creating generational trauma',
            'Reparenting yourself'
          ],
          videoHours: 2,
          interactiveExercises: 3
        },
        {
          id: 'module_2',
          title: 'Men\'s Emotions Are Valid',
          topics: [
            'Boys cry too (and should be allowed to)',
            'Fear, shame, loneliness in men',
            'Vulnerability is strength, not weakness',
            'Asking for help is brave'
          ],
          videoHours: 2,
          interactiveExercises: 3
        },
        {
          id: 'module_3',
          title: 'Breaking the Cycle: Raising Boys Right',
          topics: [
            'Caring equally for sons and daughters',
            'Teaching emotional intelligence to boys',
            'Safe expression of all emotions',
            'Creating men who respect others'
          ],
          videoHours: 2,
          interactiveExercises: 3
        }
      ],
      certificate: true
    }
  },

  // ===== PLAYER PROGRESS =====
  playerCourses: {}, // courseId -> { enrolledAt, progress, modules_completed, certificate_earned }
  playerTrigggers: [], // Trauma triggers player has identified
  healingJournal: [], // Journal entries

  // ===== ENROLLMENT =====
  enrollInCourse: (playerId, courseId) => {
    const course = get().courses[courseId]
    if (!course) return { success: false, error: 'Course not found' }

    set(state => ({
      playerCourses: {
        ...state.playerCourses,
        [courseId]: {
          enrolledAt: Date.now(),
          progress: 0,
          modules_completed: [],
          certificate_earned: false,
          status: 'in_progress'
        }
      }
    }))

    return {
      success: true,
      courseId,
      courseName: course.title,
      message: 'You are not alone. This course will help you heal.'
    }
  },

  // ===== WATCH VIDEO =====
  completeVideo: (courseId, moduleId) => {
    const enrollment = get().playerCourses[courseId]
    if (!enrollment) return { success: false }

    set(state => ({
      playerCourses: {
        ...state.playerCourses,
        [courseId]: {
          ...enrollment,
          modules_completed: [...enrollment.modules_completed, moduleId],
          progress: calculateProgress(courseId)
        }
      }
    }))

    return { success: true, progress: enrollment.progress }
  },

  // ===== ADD JOURNAL ENTRY =====
  addJournalEntry: (content, triggers = []) => {
    set(state => ({
      healingJournal: [
        ...state.healingJournal,
        {
          id: `journal_${Date.now()}`,
          content,
          triggers,
          date: new Date(),
          mood: 'processing'
        }
      ]
    }))
  },

  // ===== GET CERTIFICATE =====
  getCertificate: (courseId) => {
    const course = get().courses[courseId]
    const enrollment = get().playerCourses[courseId]

    if (!course || !enrollment) return null

    const completionPercent = enrollment.modules_completed.length / course.modules.length * 100

    if (completionPercent >= 100) {
      const cert = {
        id: `cert_${Date.now()}`,
        courseTitle: course.title,
        studentName: 'Player', // Will be set from game state
        completedDate: new Date(),
        certificateNumber: generateCertificateNumber(),
        message: 'You are an overcomer. You have done the work. You deserve this.',
        signature: 'Trinity Reign'
      }

      set(state => ({
        playerCourses: {
          ...state.playerCourses,
          [courseId]: {
            ...enrollment,
            certificate_earned: true,
            certificate: cert
          }
        }
      }))

      return cert
    }

    return null
  }
}))

// ===== HELPER FUNCTIONS =====

function calculateProgress(courseId) {
  const state = useTraumaRecoverySystem.getState()
  const course = state.courses[courseId]
  const enrollment = state.playerCourses[courseId]

  if (!course || !enrollment) return 0

  return Math.floor(
    (enrollment.modules_completed.length / course.modules.length) * 100
  )
}

function generateCertificateNumber() {
  return `TR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
}

export function getCourses() {
  return useTraumaRecoverySystem.getState().courses
}

export function getPlayerProgress(courseId) {
  const state = useTraumaRecoverySystem.getState()
  return state.playerCourses[courseId] || null
}
