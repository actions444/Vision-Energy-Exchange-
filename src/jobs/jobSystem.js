/**
 * VISION STORMS WORLD - Job System
 *
 * Gameplay loops that earn players real money:
 * - Police officer shifts with mission variety
 * - Firefighter emergency response missions
 * - Garbage truck driver GPS-tracked routes
 * - Delivery driver multi-stop routes
 * - School teacher educational content delivery
 * - Uber-style ride sharing (Vision Rides)
 * - Content creator studio work
 *
 * Every job ties to the economy and real money earnings
 */

import { create } from 'zustand'

export const useJobSystem = create((set, get) => ({
  // ===== JOB REGISTRY =====
  jobs: {}, // jobId -> job data
  playerJobs: {}, // playerId -> [jobIds] (jobs the player is working)
  activeShifts: {}, // shiftId -> shift data
  jobHistory: [], // Completed jobs

  // ===== CREATE JOB LISTING =====
  createJobListing: (jobData) => {
    // jobData = {
    //   title, employer, description, location, payRate
    //   requirements, hoursPerDay, maxEarningsPerDay
    //   difficulty, skills_required
    // }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const job = {
      id: jobId,
      title: jobData.title,
      employer: jobData.employer,
      description: jobData.description,
      location: jobData.location,
      payRate: jobData.payRate, // per hour or per mission
      payType: jobData.payType || 'hourly', // 'hourly' or 'per_mission'
      requirements: jobData.requirements || [],
      hoursPerDay: jobData.hoursPerDay || 8,
      maxEarningsPerDay: jobData.maxEarningsPerDay,
      difficulty: jobData.difficulty || 'medium', // easy, medium, hard, expert
      skills_required: jobData.skills_required || [],
      skillsGained: jobData.skillsGained || [],
      availablePositions: jobData.availablePositions || 1,
      filledPositions: 0,
      applicationDeadline: jobData.applicationDeadline || null,
      createdAt: Date.now(),
      applications: []
    }

    set(state => ({
      jobs: {
        ...state.jobs,
        [jobId]: job
      }
    }))

    return {
      success: true,
      jobId: jobId,
      title: job.title,
      employer: job.employer,
      payRate: job.payRate,
      message: `${job.title} position created at ${job.employer}`
    }
  },

  // ===== APPLY FOR JOB =====
  applyForJob: (playerId, jobId) => {
    const job = get().jobs[jobId]
    if (!job) return { success: false, error: 'Job not found' }

    if (job.filledPositions >= job.availablePositions) {
      return { success: false, error: 'No positions available' }
    }

    const applicationId = `app_${Date.now()}`
    const application = {
      id: applicationId,
      playerId: playerId,
      jobId: jobId,
      status: 'approved', // Auto-approve for this game
      appliedAt: Date.now()
    }

    set(state => ({
      jobs: {
        ...state.jobs,
        [jobId]: {
          ...job,
          filledPositions: job.filledPositions + 1,
          applications: [...job.applications, application]
        }
      },
      playerJobs: {
        ...state.playerJobs,
        [playerId]: [...(state.playerJobs[playerId] || []), jobId]
      }
    }))

    return {
      success: true,
      applicationId: applicationId,
      jobTitle: job.title,
      employer: job.employer,
      startDate: new Date(Date.now() + 86400000).toLocaleDateString(),
      message: `Congratulations! You've been hired as a ${job.title} at ${job.employer}`,
      startingSalary: job.payRate,
      benefitsSummary: 'Performance bonuses, skill development, community recognition'
    }
  },

  // ===== START JOB SHIFT =====
  startJobShift: (playerId, jobId) => {
    const job = get().jobs[jobId]
    if (!job) return { success: false, error: 'Job not found' }

    const shiftId = `shift_${Date.now()}`
    const shift = {
      id: shiftId,
      playerId: playerId,
      jobId: jobId,
      jobTitle: job.title,
      employer: job.employer,
      location: job.location,
      startTime: Date.now(),
      endTime: Date.now() + (job.hoursPerDay * 3600000), // hours to ms
      hoursScheduled: job.hoursPerDay,
      hourlyPay: job.payRate,
      status: 'active',
      earnings: 0,
      missionsCompleted: 0,
      taskList: generateJobTasks(job.title, job.hoursPerDay)
    }

    set(state => ({
      activeShifts: {
        ...state.activeShifts,
        [shiftId]: shift
      }
    }))

    return {
      success: true,
      shiftId: shiftId,
      jobTitle: job.title,
      shiftDuration: `${job.hoursPerDay} hours`,
      estimatedEarnings: Math.floor(job.payRate * job.hoursPerDay),
      tasks: shift.taskList.length,
      message: `Your shift at ${job.employer} has started!`,
      instructions: getJobInstructions(job.title)
    }
  },

  // ===== COMPLETE JOB TASK =====
  completeJobTask: (shiftId, taskIndex) => {
    const shift = get().activeShifts[shiftId]
    if (!shift) return { success: false, error: 'Shift not found' }

    if (taskIndex >= shift.taskList.length) {
      return { success: false, error: 'Invalid task' }
    }

    const task = shift.taskList[taskIndex]
    const taskEarnings = Math.floor(shift.hourlyPay / 8) // divide hourly rate by tasks per hour

    const updatedShift = {
      ...shift,
      missionsCompleted: shift.missionsCompleted + 1,
      earnings: shift.earnings + taskEarnings,
      taskList: shift.taskList.map((t, i) =>
        i === taskIndex ? { ...t, completed: true } : t
      )
    }

    set(state => ({
      activeShifts: {
        ...state.activeShifts,
        [shiftId]: updatedShift
      }
    }))

    return {
      success: true,
      taskCompleted: task.description,
      earningsThisTask: taskEarnings,
      totalEarningsThisShift: updatedShift.earnings,
      tasksRemainingToday: shift.taskList.length - updatedShift.missionsCompleted,
      feedback: generateTaskFeedback(task.type, 'success')
    }
  },

  // ===== END JOB SHIFT =====
  endJobShift: (shiftId, playerId) => {
    const shift = get().activeShifts[shiftId]
    if (!shift) return { success: false, error: 'Shift not found' }

    const totalTime = Date.now() - shift.startTime
    const totalHours = totalTime / 3600000
    const finalEarnings = Math.floor(shift.hourlyPay * totalHours)

    const completedJob = {
      ...shift,
      status: 'completed',
      endTime: Date.now(),
      actualHours: parseFloat(totalHours.toFixed(2)),
      finalEarnings: finalEarnings,
      performanceBonus: Math.floor(finalEarnings * 0.1), // 10% bonus for good work
      totalWithBonus: finalEarnings + Math.floor(finalEarnings * 0.1)
    }

    // Remove from active shifts
    const { [shiftId]: removed, ...remainingShifts } = get().activeShifts

    set(state => ({
      activeShifts: remainingShifts,
      jobHistory: [...state.jobHistory, completedJob]
    }))

    return {
      success: true,
      shiftId: shiftId,
      jobTitle: shift.jobTitle,
      hoursWorked: completedJob.actualHours,
      basePay: finalEarnings,
      performanceBonus: Math.floor(finalEarnings * 0.1),
      totalEarnings: completedJob.totalWithBonus,
      message: `Great work! Your shift at ${shift.employer} is complete.`,
      balance: completedJob.totalWithBonus,
      skillsGained: getJobSkills(shift.jobTitle, completedJob.missionsCompleted)
    }
  },

  // ===== POLICE OFFICER JOB =====
  createPoliceOfficerJob: () => {
    return get().createJobListing({
      title: 'Police Officer',
      employer: 'Vision Storms Police Department',
      description:
        'Patrol the city, respond to calls, write citations, help community members understand their rights.',
      location: 'police_station',
      payRate: 2000, // Credits per hour
      payType: 'hourly',
      hoursPerDay: 8,
      maxEarningsPerDay: 16000,
      difficulty: 'hard',
      requirements: [
        'High school diploma',
        'No felony record',
        'Community respect'
      ],
      skillsGained: [
        'Law enforcement',
        'Community relations',
        'Decision making under pressure'
      ]
    })
  },

  // ===== FIREFIGHTER JOB =====
  createFirefighterJob: () => {
    return get().createJobListing({
      title: 'Firefighter',
      employer: 'Vision Storms Fire Department',
      description:
        'Respond to emergency calls, save lives, prevent fires, assist in rescue operations.',
      location: 'fire_station',
      payRate: 2200,
      payType: 'hourly',
      hoursPerDay: 12, // Firefighter shifts are longer
      maxEarningsPerDay: 26400,
      difficulty: 'expert',
      requirements: ['Physical fitness', 'Courage', 'Training'],
      skillsGained: ['Emergency response', 'Teamwork', 'Life-saving skills']
    })
  },

  // ===== GARBAGE COLLECTOR JOB =====
  createGarbageCollectorJob: () => {
    return get().createJobListing({
      title: 'Sanitation Worker / Garbage Collector',
      employer: 'City Sanitation Services',
      description: 'Collect trash from residential and commercial areas using GPS-guided routes.',
      location: 'sanitation_depot',
      payRate: 1800,
      payType: 'per_mission',
      hoursPerDay: 8,
      maxEarningsPerDay: 14400, // 45 stops per day at ~$320 per stop
      difficulty: 'medium',
      requirements: ['Reliable transportation', 'Work ethic', 'Basic training'],
      skillsGained: ['Route optimization', 'Time management', 'Physical endurance']
    })
  },

  // ===== DELIVERY DRIVER JOB =====
  createDeliveryDriverJob: () => {
    return get().createJobListing({
      title: 'Delivery Driver',
      employer: 'Vision Delivery Services',
      description: 'Deliver packages to customers across the city using GPS navigation.',
      location: 'delivery_depot',
      payRate: 250, // Per delivery
      payType: 'per_mission',
      hoursPerDay: 8,
      maxEarningsPerDay: 12500, // ~50 deliveries per day
      difficulty: 'medium',
      requirements: ['Valid driver license', 'Customer service skills'],
      skillsGained: ['Navigation', 'Customer service', 'Time management']
    })
  },

  // ===== SCHOOL TEACHER JOB =====
  createTeacherJob: () => {
    return get().createJobListing({
      title: 'School Teacher',
      employer: 'Trinity Reign Academy',
      description:
        'Teach financial education, business fundamentals, and personal development to students.',
      location: 'trinity_academy',
      payRate: 2500,
      payType: 'hourly',
      hoursPerDay: 6,
      maxEarningsPerDay: 15000,
      difficulty: 'hard',
      requirements: ['Education degree or equivalent', 'Communication skills'],
      skillsGained: ['Teaching', 'Curriculum design', 'Leadership']
    })
  },

  // ===== VISION RIDES DRIVER =====
  createVisionRidesDriver: () => {
    return get().createJobListing({
      title: 'Vision Rides Driver',
      employer: 'Vision Rides (Ride Sharing)',
      description: 'Drive passengers around the city, earn money per ride, collect tips.',
      location: 'vision_rides_hub',
      payRate: 1500, // Per completed ride
      payType: 'per_mission',
      hoursPerDay: 8,
      maxEarningsPerDay: 12000, // ~8 rides per hour
      difficulty: 'easy',
      requirements: ['Driver license', 'Clean record', 'Excellent customer service'],
      skillsGained: ['Navigation', 'Customer service', 'Time management']
    })
  },

  // ===== GET JOB LISTINGS =====
  getJobListings: () => {
    return Object.values(get().jobs).map(job => ({
      jobId: job.id,
      title: job.title,
      employer: job.employer,
      description: job.description,
      payRate: job.payRate,
      difficulty: job.difficulty,
      openPositions: job.availablePositions - job.filledPositions
    }))
  },

  // ===== GET PLAYER JOBS =====
  getPlayerJobs: (playerId) => {
    const jobIds = get().playerJobs[playerId] || []
    return jobIds.map(id => get().jobs[id])
  },

  // ===== GET ACTIVE SHIFTS =====
  getActiveShifts: (playerId) => {
    return Object.values(get().activeShifts).filter(
      shift => shift.playerId === playerId && shift.status === 'active'
    )
  },

  // ===== JOB STATS =====
  getJobStats: (playerId) => {
    const playerJobs = get().playerJobs[playerId] || []
    const completedJobs = get().jobHistory.filter(j => j.playerId === playerId)

    const totalEarnings = completedJobs.reduce((sum, job) => sum + job.totalWithBonus, 0)
    const averageEarningsPerShift = completedJobs.length > 0
      ? Math.floor(totalEarnings / completedJobs.length)
      : 0

    return {
      jobsWorking: playerJobs.length,
      shiftsCompleted: completedJobs.length,
      totalEarnings: totalEarnings,
      averagePerShift: averageEarningsPerShift,
      skillsLearned: getUniqueSkills(completedJobs),
      reputation: calculateReputation(completedJobs)
    }
  }
}))

// ===== HELPER FUNCTIONS =====

function generateJobTasks(jobTitle, hoursPerDay) {
  // Each hour has 8 tasks (roughly 7.5 minute tasks)
  const taskCount = hoursPerDay * 8
  const tasks = []

  const taskTypes = {
    'Police Officer': [
      'Patrol neighborhood',
      'Respond to call',
      'Write citation',
      'Help community member',
      'De-escalate situation',
      'File report',
      'Community outreach',
      'Check on welfare'
    ],
    'Firefighter': [
      'Respond to emergency',
      'Rescue person',
      'Extinguish fire',
      'Medical assistance',
      'Equipment check',
      'Training drill',
      'Community education',
      'Station maintenance'
    ],
    'Sanitation Worker': [
      'Pick up trash can',
      'Empty into truck',
      'Return trash can',
      'Check for hazards',
      'Recycle sorting',
      'Route navigation',
      'Equipment maintenance',
      'Safety check'
    ],
    'Delivery Driver': [
      'Pick up package',
      'Navigate to address',
      'Deliver package',
      'Get signature',
      'Return to depot',
      'Update GPS',
      'Customer service',
      'Record delivery'
    ],
    'School Teacher': [
      'Teach lesson',
      'Grade assignments',
      'Answer questions',
      'Facilitate discussion',
      'Assign homework',
      'One-on-one help',
      'Class management',
      'Curriculum planning'
    ]
  }

  const jobTaskTypes = taskTypes[jobTitle] || ['Work', 'Complete task', 'Assist', 'Finish job']

  for (let i = 0; i < taskCount; i++) {
    const taskType = jobTaskTypes[i % jobTaskTypes.length]
    tasks.push({
      index: i,
      description: taskType,
      type: taskType.toLowerCase().replace(' ', '_'),
      completed: false,
      quality: 'good'
    })
  }

  return tasks
}

function getJobInstructions(jobTitle) {
  const instructions = {
    'Police Officer': 'Patrol areas, respond to calls, help community members, understand their rights.',
    'Firefighter': 'Respond to emergencies, save lives, prevent fires, assist in rescues.',
    'Sanitation Worker': 'Follow GPS route, collect all trash cans, return them, maintain equipment.',
    'Delivery Driver': 'Collect packages, navigate to addresses, deliver, get signatures.',
    'School Teacher': 'Teach engaging lessons, answer student questions, grade work, inspire learning.',
    'Vision Rides Driver': 'Accept rides, navigate to passengers, drive safely, provide great service.'
  }

  return instructions[jobTitle] || 'Complete your job tasks to earn money!'
}

function generateTaskFeedback(taskType, outcome) {
  if (outcome === 'success') {
    return `Great! You completed the ${taskType} task successfully. Keep it up!`
  }
  return `The ${taskType} task is complete, but there's room for improvement.`
}

function getJobSkills(jobTitle, taskCount) {
  const baseSKills = {
    'Police Officer': ['law_enforcement', 'community_relations', 'crisis_management'],
    'Firefighter': ['emergency_response', 'rescue', 'teamwork'],
    'Sanitation Worker': ['efficiency', 'reliability', 'physical_fitness'],
    'Delivery Driver': ['navigation', 'customer_service', 'time_management'],
    'School Teacher': ['teaching', 'communication', 'leadership']
  }

  return baseSKills[jobTitle] || []
}

function getUniqueSkills(completedJobs) {
  const skillSet = new Set()
  completedJobs.forEach(job => {
    const skills = getJobSkills(job.jobTitle, job.missionsCompleted)
    skills.forEach(skill => skillSet.add(skill))
  })
  return Array.from(skillSet)
}

function calculateReputation(completedJobs) {
  // Reputation based on number of jobs completed
  // Each job = 10 reputation points
  return completedJobs.length * 10
}

export function getJobCount() {
  return Object.keys(useJobSystem.getState().jobs).length
}

export function getAllJobs() {
  return useJobSystem.getState().jobs
}
