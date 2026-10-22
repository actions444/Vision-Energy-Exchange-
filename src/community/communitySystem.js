/**
 * VISION STORMS WORLD - Community System
 *
 * Building the society Trinity envisions:
 * - Shared community resources (toiletries, clothing)
 * - Intergenerational support (elders cook, youth work)
 * - Youth employment opportunities (trash collection, chores)
 * - Community contribution system
 *
 * Digital prototype of physical community model
 */

import { create } from 'zustand'

export const useCommunitySystem = create((set, get) => ({
  // ===== SHARED COMMUNITY BUCKETS =====
  communityBuckets: {
    front_door_bucket: {
      id: 'bucket_front',
      location: 'Front Entrance Area',
      purpose: 'Shared Toiletries & Essentials',
      items: [
        {
          itemType: 'soap',
          quantity: 20,
          brand: 'Community Soap',
          contributed_by: []
        },
        {
          itemType: 'towels',
          quantity: 15,
          quality: 'premium',
          contributed_by: []
        },
        {
          itemType: 'perfume',
          quantity: 8,
          varieties: ['vanilla', 'lavender', 'fresh'],
          contributed_by: []
        },
        {
          itemType: 'cologne',
          quantity: 8,
          varieties: ['woody', 'fresh', 'spicy'],
          contributed_by: []
        },
        {
          itemType: 'deodorant',
          quantity: 20,
          varieties: ['unisex', 'mens', 'womens'],
          contributed_by: []
        },
        {
          itemType: 'shampoo',
          quantity: 12,
          types: ['for all hair types'],
          contributed_by: []
        },
        {
          itemType: 'toothbrush',
          quantity: 30,
          contributed_by: []
        },
        {
          itemType: 'toothpaste',
          quantity: 15,
          contributed_by: []
        }
      ],
      lastRestocked: Date.now(),
      communityContributors: 0
    }
  },

  // ===== COMMUNITY CONTRIBUTION =====
  contributions: {}, // contributorId -> [list of contributions]
  contributionLeaderboard: [],

  // ===== INTERGENERATIONAL COMMUNITY AREAS =====
  communitySpaces: {
    elder_relaxation_area: {
      id: 'space_elders',
      name: 'Elder Relaxation & Recreation',
      location: { x: 500, y: 0, z: 500 },
      amenities: [
        {
          id: 'jacuzzi_1',
          name: 'Heated Jacuzzi',
          capacity: 10,
          features: ['massage jets', 'temperature control', 'seating']
        },
        {
          id: 'jacuzzi_2',
          name: 'Second Jacuzzi',
          capacity: 10,
          features: ['massage jets', 'temperature control', 'seating']
        },
        {
          id: 'lounge_area',
          name: 'Comfortable Lounge',
          capacity: 20,
          features: ['comfortable seating', 'shaded areas', 'resting spots']
        }
      ],
      activities: [
        'Relax and socialize',
        'Supervise youth activities',
        'Share wisdom with younger generation',
        'Cook and prepare meals'
      ]
    },
    community_kitchen: {
      id: 'kitchen_main',
      name: 'Community Kitchen',
      location: { x: 480, y: 0, z: 480 },
      capacity: 30,
      equipment: [
        'Commercial ovens',
        'Stovetops',
        'Food preparation stations',
        'Dining tables'
      ],
      purpose: 'Elders cook, community eats together',
      schedules: [
        { time: '7:00 AM', meal: 'Breakfast', chef: 'Rotating elders' },
        { time: '12:00 PM', meal: 'Lunch', chef: 'Rotating elders' },
        { time: '6:00 PM', meal: 'Dinner', chef: 'Rotating elders' }
      ]
    }
  },

  // ===== CONTRIBUTION TRACKING =====
  addCommunityContribution: (playerId, itemType, quantity, description = '') => {
    const contributionId = `contrib_${Date.now()}`

    const contribution = {
      id: contributionId,
      playerId: playerId,
      itemType: itemType,
      quantity: quantity,
      description: description,
      timestamp: Date.now(),
      contribution_value: calculateContributionValue(itemType, quantity),
      community_impact: calculateImpact(quantity)
    }

    set(state => ({
      contributions: {
        ...state.contributions,
        [playerId]: [...(state.contributions[playerId] || []), contribution]
      }
    }))

    // Update bucket
    get().updateCommunityBucket(itemType, quantity)

    return {
      success: true,
      contributionId: contributionId,
      itemType: itemType,
      quantity: quantity,
      message: `Thank you for contributing to the community! ${quantity} ${itemType}(s) added to shared bucket.`,
      impact: `This helps ${Math.floor(quantity * 2)} community members`,
      reward: calculateContributionReward(itemType, quantity)
    }
  },

  // ===== YOUTH JOBS (Age 11-18) =====
  youthJobs: {
    trash_can_delivery: {
      id: 'job_trash_delivery',
      name: 'Trash Can Service (Bring Down/Take Up)',
      ageMin: 11, // 5th grade
      ageMax: 18, // 12th grade
      description: 'Take trash cans from houses to curb (morning), bring back from curb (evening)',
      payPerAction: 250, // Credits per can
      actionsPerDay: 20, // Up to 20 cans per shift
      maxEarningsPerDay: 5000, // 250 * 20
      timeRequirement: '1-2 hours per day',
      responsibilities: [
        'Morning: Take trash cans from house to curb',
        'Evening: Bring trash cans from curb back to house',
        'Be respectful of community property',
        'Work responsibly and on time',
        'Learn responsibility and work ethic'
      ],
      skillsLearned: [
        'Responsibility',
        'Work ethic',
        'Time management',
        'Community service',
        'Earning money'
      ],
      availability: 'Daily, flexible hours'
    },
    yard_work: {
      id: 'job_yard_work',
      name: 'Yard Maintenance & Landscaping',
      ageMin: 12,
      ageMax: 18,
      description: 'Mow lawns, rake leaves, maintain community gardens',
      payPerHour: 1500, // Credits
      maxHoursPerDay: 4,
      responsibilities: [
        'Mow lawns for community members',
        'Rake leaves and maintain landscaping',
        'Keep community areas beautiful',
        'Work safely with equipment'
      ],
      skillsLearned: [
        'Landscaping skills',
        'Equipment operation',
        'Property maintenance',
        'Environmental care'
      ]
    },
    delivery_assistant: {
      id: 'job_delivery',
      name: 'Community Delivery Assistant',
      ageMin: 13,
      ageMax: 18,
      description: 'Help deliver community donations and supplies',
      payPerDelivery: 300,
      maxDeliveriesPerDay: 15,
      maxEarningsPerDay: 4500,
      responsibilities: [
        'Deliver clothing, shoes, goods to community members',
        'Handle items carefully',
        'Record deliveries',
        'Help organize community supplies'
      ]
    }
  },

  // ===== REGISTER YOUTH FOR JOB =====
  registerYouthForJob: (playerId, jobId, playerAge) => {
    const job = get().youthJobs[jobId]
    if (!job) return { success: false, error: 'Job not found' }

    if (playerAge < job.ageMin || playerAge > job.ageMax) {
      return {
        success: false,
        error: `This job is for ages ${job.ageMin}-${job.ageMax}. You are ${playerAge}.`
      }
    }

    return {
      success: true,
      jobId: jobId,
      jobName: job.name,
      payRate: job.payPerAction || job.payPerHour,
      maxEarningsPerDay: job.maxEarningsPerDay,
      message: `Welcome to ${job.name}! You can start earning money today.`,
      skillsYouWillLearn: job.skillsLearned
    }
  },

  // ===== ELDER COOKING SYSTEM =====
  scheduleElderCooking: (elderId, mealType, recipeList, servings = 50) => {
    const scheduleId = `cook_${Date.now()}`

    const cookingSchedule = {
      id: scheduleId,
      elderId: elderId,
      mealType: mealType, // breakfast, lunch, dinner
      recipes: recipeList,
      servings: servings,
      scheduledTime: Date.now(),
      status: 'scheduled', // scheduled, cooking, ready_to_serve, completed
      reward: 5000, // Credits for cooking for community
      youngPeopleWhoWillEat: 0
    }

    return {
      success: true,
      scheduleId: scheduleId,
      elder: elderId,
      meal: mealType,
      servings: servings,
      reward: 5000,
      message: `${mealType} is being prepared! The younger generation will benefit from your care.`
    }
  },

  // ===== UPDATE COMMUNITY BUCKET =====
  updateCommunityBucket: (itemType, quantity) => {
    set(state => ({
      communityBuckets: {
        ...state.communityBuckets,
        'front_door_bucket': {
          ...state.communityBuckets['front_door_bucket'],
          items: state.communityBuckets['front_door_bucket'].items.map(item => {
            if (item.itemType === itemType) {
              return {
                ...item,
                quantity: item.quantity + quantity
              }
            }
            return item
          })
        }
      }
    }))
  },

  // ===== TAKE FROM BUCKET =====
  takeFromCommunityBucket: (playerId, itemType, quantity = 1) => {
    const bucket = get().communityBuckets['front_door_bucket']
    const item = bucket.items.find(i => i.itemType === itemType)

    if (!item || item.quantity < quantity) {
      return { success: false, error: 'Item not available in sufficient quantity' }
    }

    // Update bucket
    set(state => ({
      communityBuckets: {
        ...state.communityBuckets,
        'front_door_bucket': {
          ...state.communityBuckets['front_door_bucket'],
          items: state.communityBuckets['front_door_bucket'].items.map(i => {
            if (i.itemType === itemType) {
              return { ...i, quantity: i.quantity - quantity }
            }
            return i
          })
        }
      }
    }))

    return {
      success: true,
      itemType: itemType,
      quantity: quantity,
      message: `You took ${quantity} ${itemType}(s) from community bucket. Thank the community members who contributed!`,
      reminder: 'When you can, contribute back to the bucket so others can benefit too.'
    }
  },

  // ===== COMMUNITY STATS =====
  getCommunityStats: () => {
    const bucket = get().communityBuckets['front_door_bucket']
    const contributions = Object.values(get().contributions).flat()

    const totalContributions = contributions.length
    const uniqueContributors = Object.keys(get().contributions).length

    return {
      totalContributions: totalContributions,
      uniqueContributors: uniqueContributors,
      bucketStatus: {
        itemCount: bucket.items.length,
        totalItems: bucket.items.reduce((sum, i) => sum + i.quantity, 0),
        lastRestocked: new Date(bucket.lastRestocked).toLocaleDateString()
      },
      communityHealth: 'Strong - Community members are supporting each other'
    }
  }
}))

// ===== HELPER FUNCTIONS =====

function calculateContributionValue(itemType, quantity) {
  const values = {
    'soap': 50,
    'towels': 100,
    'perfume': 200,
    'cologne': 200,
    'deodorant': 75,
    'shampoo': 75,
    'toothbrush': 25,
    'toothpaste': 50
  }

  return (values[itemType] || 50) * quantity
}

function calculateImpact(quantity) {
  // Each item can help 1-2 community members
  return Math.floor(quantity * 1.5)
}

function calculateContributionReward(itemType, quantity) {
  const baseReward = calculateContributionValue(itemType, quantity)
  return Math.floor(baseReward * 0.1) // 10% of contribution value as reward
}

export function getCommunityStats() {
  return useCommunitySystem.getState().getCommunityStats()
}

export function getYouthJobs() {
  return useCommunitySystem.getState().youthJobs
}
