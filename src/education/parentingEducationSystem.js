/**
 * VISION STORMS WORLD - Parenting Education System
 *
 * Teaching parents:
 * - Practical safety (child in car FIRST with groceries)
 * - Child-specific discipline (not one-size-fits-all)
 * - Treating all children equally (sons != daughters in care)
 * - Real-world scenarios and how to handle them
 *
 * Focused on raising children safely and respecting their individual needs
 */

import { create } from 'zustand'

export const useParentingEducationSystem = create((set, get) => ({
  // ===== COURSES =====
  courses: {
    practical_child_safety_101: {
      id: 'practical_child_safety_101',
      title: 'Real Safety: Protecting Your Child Every Day',
      level: 'foundational',
      price: 9900, // $99
      duration: '4 weeks',
      modules: [
        {
          id: 'module_safety_car',
          title: 'The Car Rule: Child First, Always',
          description: 'Real scenario training: going to grocery store, coming out with items',
          lessons: [
            {
              scenario: 'You\'re coming out of the grocery store with groceries, purse, and your child',
              situation: 'Where does the child go FIRST?',
              wrongAnswer: 'Put groceries in trunk first, then child in car',
              correctAnswer: 'Child in car FIRST. Everything else is replaceable. Your child is not.',
              whyItMatters: 'In emergency (carjacking, natural disaster), if child is already buckled and safe, you can run. If child isn\'t in the car yet, they\'re vulnerable.',
              practicalTips: [
                'Child buckled and safe = you can set down groceries anywhere',
                'Child not in car = you have to hold them and can\'t carry groceries',
                'Make it a routine: ALWAYS child first'
              ],
              actionItems: [
                'Practice this routine at home (without actual groceries)',
                'Tell your child: "You always go in the car first"',
                'Make it a game so they understand priority'
              ]
            },
            {
              scenario: 'Someone approaches your car while you\'re putting things in',
              situation: 'Your child is already in the car (safely buckled)',
              whatToDo: 'You can walk away. Child is safe. Everything else can be dealt with.',
              whyItMatters: 'If child isn\'t in car, you\'re trapped (can\'t leave without child)',
              emergencyPlan: [
                'Child in car buckled = you have options',
                'Dangerous person approaches = you walk away from items',
                'Get to safety first, deal with groceries later'
              ]
            }
          ],
          videoHours: 1,
          interactiveExercises: 3
        },
        {
          id: 'module_emergency_plans',
          title: 'Emergency Escape Plans',
          lessons: [
            {
              scenario: 'Carjacking or suspicious person at car',
              safetyPlan: [
                'Do NOT engage',
                'Walk away if you haven\'t reached your car',
                'If at your car: get child and walk toward crowd/store/police',
                'Items can be replaced; your child cannot'
              ]
            },
            {
              scenario: 'Natural disaster (earthquake, severe weather)',
              safetyPlan: [
                'Child is in car (pre-planned)',
                'You are with child',
                'No discussion - just leave the parking lot',
                'Get to safe location with your child'
              ]
            },
            {
              scenario: 'Abduction attempt',
              safetyPlan: [
                'Child in car, doors locked = safer than on ground',
                'Do NOT stop for anything',
                'Drive to police station',
                'Honk horn, alert other drivers if needed'
              ]
            }
          ],
          videoHours: 1.5
        },
        {
          id: 'module_child_awareness',
          title: 'Teaching Your Child: Safety Awareness, Not Fear',
          lessons: [
            {
              topic: 'Teaching children their instincts matter',
              ageGroup: '4-8',
              whatToTeach: [
                '"If something feels wrong, tell me immediately"',
                '"You are more important than toys, food, or anything else"',
                '"No adult should touch you in private areas"',
                '"You can always say NO to an adult"'
              ],
              howToTeach: [
                'Role play safe vs unsafe scenarios',
                'Read books about body safety',
                'Use proper names for body parts',
                'Praise them for speaking up'
              ]
            },
            {
              topic: 'Teaching children escape routes',
              ageGroup: '6+',
              whatToTeach: [
                'Where is the safest place in your home?',
                'How do you get to a neighbor\'s house?',
                'What do you do if you\'re separated from parent?',
                'Who are trusted adults to ask for help?'
              ],
              practicalDrill: 'Practice escape route monthly (make it a game, not scary)'
            }
          ],
          videoHours: 1.5,
          interactiveExercises: 4
        }
      ],
      certificate: true
    },

    discipline_for_individual_children: {
      id: 'discipline_individual',
      title: 'No One-Size-Fits-All: Discipline for Your Specific Child',
      level: 'intermediate',
      price: 11900, // $119
      duration: '6 weeks',
      modules: [
        {
          id: 'module_personality_types',
          title: 'Understanding Your Child\'s Unique Temperament',
          lessons: [
            {
              temperamentType: 'The Sensitive Child',
              characteristics: 'Feels emotions deeply, shuts down when criticized, needs gentleness',
              mistakesToAvoid: [
                'Harsh tones of voice',
                'Public shaming',
                'Yelling',
                'Comparing to siblings'
              ],
              effectiveDiscipline: [
                'Quiet conversation (not lecture)',
                'Explain impact on others\' feelings',
                'Ask what they learned',
                'Validate their emotions while setting boundary'
              ],
              example: 'Child hit sibling. Sensitive child will cry. Instead of "You\'re so mean", say: "I know you were frustrated. Hitting hurts. What could you do next time?"'
            },
            {
              temperamentType: 'The Stubborn/Strong-Willed Child',
              characteristics: 'Tests boundaries, needs to feel heard, wants choices',
              mistakesToAvoid: [
                'Power struggles',
                'Forcing obedience',
                'Not explaining why',
                'Making them feel controlled'
              ],
              effectiveDiscipline: [
                'Give choices (both acceptable)',
                'Explain the reason',
                'Listen to their perspective',
                'Follow through consistently',
                'Respect their autonomy where possible'
              ],
              example: 'Won\'t put on shoes. Instead of forcing: "Do you want to put on shoes first or socks first?" Child feels control, gets dressed.'
            },
            {
              temperamentType: 'The Social/Extroverted Child',
              characteristics: 'Learns through interaction, needs movement, gets bored easily',
              mistakesToAvoid: [
                'Long timeouts (they\'ll act out)',
                'Expecting quiet obedience',
                'Not explaining anything',
                'Making them feel isolated'
              ],
              effectiveDiscipline: [
                'Keep explanations short and engaging',
                'Use movement-based consequences',
                'Involve them in problem-solving',
                'Praise publicly (they respond well to audience)'
              ]
            },
            {
              temperamentType: 'The Quiet/Observant Child',
              characteristics: 'Watches, thinks, processes slowly, internalizes everything',
              mistakesToAvoid: [
                'Forcing quick responses',
                'Public attention/shame',
                'Assuming silence means agreement',
                'Interrupting their thinking'
              ],
              effectiveDiscipline: [
                'Give processing time',
                'Communicate privately',
                'Ask what they think',
                'Validate their observations',
                'They learn by watching you'
              ]
            }
          ],
          videoHours: 2,
          interactiveExercises: 5
        },
        {
          id: 'module_multiple_children',
          title: 'Managing Different Children Differently (And It\'s OK)',
          lessons: [
            {
              topic: 'Why treating kids "the same" actually hurts them',
              explanation: 'Equal ≠ Same. Sensitive child needs different approach than stubborn child, but both should feel loved.',
              wrongWay: 'Using same discipline for all kids',
              rightWay: 'Using right discipline for each individual child\'s temperament',
              example: 'Timeout works for one child, makes another worse. That\'s OK. Different tools for different kids.'
            },
            {
              topic: 'Fairness from the child\'s perspective',
              lesson: 'Kids understand fairness as "you\'re taking care of my needs", not "you treat me exactly like my sibling"',
              wrongWay: 'Child 1 needs glasses, Child 2 doesn\'t, but you think buying both glasses is "fair"',
              rightWay: 'Each child gets what they need. That IS fair.'
            }
          ],
          videoHours: 1.5
        }
      ],
      certificate: true
    },

    equal_care_all_children: {
      id: 'equal_care_all',
      title: 'We Don\'t Raise Sons and Daughters: We Raise Children',
      level: 'foundational',
      price: 8900, // $89
      duration: '4 weeks',
      modules: [
        {
          id: 'module_equal_emotions',
          title: 'All Children Have Feelings (Yes, Boys Too)',
          lessons: [
            {
              wrongBelief: '"Crying is weak. Boys don\'t cry."',
              truth: 'Boys are human. Humans cry. Crying is healthy.',
              damage: 'Teaching boys to suppress emotions creates:',
              consequences: [
                'Emotional disconnection',
                'Inability to communicate feelings',
                'Aggression as substitute for emotions',
                'Relationship problems as adults',
                'Mental health issues (depression, anxiety, rage)'
              ],
              howToRaise: [
                'Boy cries → comfort and listen',
                'Boy expresses fear → take seriously',
                'Boy is sad → validate it',
                'Boy needs help → praise him for asking',
                'Boy has emotions → normal and healthy'
              ]
            },
            {
              wrongBelief: '"Don\'t be such a girl/weak/B" (calling boys feminine things as insult)',
              truth: 'This teaches boys that feminine = bad, and that their emotions are shameful',
              damage: 'Creates men who:',
              consequences: [
                'Disrespect women (feminine = inferior)',
                'Can\'t connect with partners',
                'Use anger as only emotion',
                'Abuse others to feel powerful',
                'Hate their own sensitivity'
              ],
              howToRaise: [
                'Never use feminine as insult to boy',
                'Never shame emotions as "weak"',
                'Model emotional expression yourself',
                'Tell him it\'s OK to cry',
                'Create safe space for feelings'
              ]
            }
          ],
          videoHours: 1.5,
          interactiveExercises: 3
        },
        {
          id: 'module_household_responsibility',
          title: 'All Children Do Chores (Not Gender-Based)',
          lessons: [
            {
              wrongWay: 'Girls do cooking/cleaning, boys do yard work',
              rightWay: 'All children learn all life skills',
              whyItMatters: [
                'Boys need to know how to cook, clean (they\'ll live alone someday)',
                'Girls need to know repairs, heavy work (independence)',
                'Adult children without basic skills = dependent'
              ],
              choresAllChildrenLearn: [
                'Cooking (basic meals)',
                'Cleaning (bathrooms, dishes, laundry)',
                'Yard work',
                'Basic repairs',
                'Money management',
                'Taking care of others'
              ]
            }
          ],
          videoHours: 1
        }
      ],
      certificate: true
    }
  },

  // ===== PLAYER PROGRESS =====
  playerCourses: {},
  parentingPlans: {}, // Custom plan for each child

  // ===== ENROLLMENT =====
  enrollInCourse: (playerId, courseId) => {
    set(state => ({
      playerCourses: {
        ...state.playerCourses,
        [courseId]: {
          enrolledAt: Date.now(),
          progress: 0,
          completed: false
        }
      }
    }))

    return { success: true, courseId }
  },

  // ===== CREATE PARENTING PLAN =====
  createParentingPlan: (childName, childAge, temperament, challenges = []) => {
    const planId = `plan_${Date.now()}`

    set(state => ({
      parentingPlans: {
        ...state.parentingPlans,
        [planId]: {
          id: planId,
          childName,
          childAge,
          temperament,
          challenges,
          customDisciplineStrategies: generateStrategies(temperament),
          safetyChecklist: generateSafetyChecklist(childAge),
          createdAt: Date.now()
        }
      }
    }))

    return planId
  }
}))

// ===== HELPER FUNCTIONS =====

function generateStrategies(temperament) {
  const strategies = {
    'sensitive': [
      'Use gentle tone',
      'Listen to feelings',
      'Explain impact gently',
      'Validate emotions'
    ],
    'stubborn': [
      'Give choices',
      'Explain why',
      'Listen to perspective',
      'Follow through'
    ],
    'social': [
      'Keep explanations short',
      'Use movement',
      'Public praise',
      'Involve in solving'
    ],
    'observant': [
      'Give processing time',
      'Communicate privately',
      'Ask their thoughts',
      'They learn by watching'
    ]
  }

  return strategies[temperament] || []
}

function generateSafetyChecklist(childAge) {
  if (childAge < 5) {
    return [
      'Car rule: child FIRST before groceries',
      'Teach body safety (no one touches private areas)',
      'Teach trusted adults to talk to',
      'Teach basic phone number'
    ]
  } else if (childAge < 10) {
    return [
      'Car rule still applies',
      'Teach escape routes from home',
      'Teach stranger danger realistically',
      'Teach they can say NO to adults',
      'Know their location/friends'
    ]
  } else {
    return [
      'Teach independence safely',
      'Teach situational awareness',
      'Teach how to get help (police, friends)',
      'Teach boundaries',
      'Trust but verify'
    ]
  }
}

export function getCourses() {
  return useParentingEducationSystem.getState().courses
}
