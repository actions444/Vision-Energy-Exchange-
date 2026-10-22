/**
 * VISION STORMS WORLD - NPC Daily Routine & Work Assignment System
 *
 * NO IDLE NPCs - Every NPC has:
 * - Daily work schedule with specific times
 * - Job assignments and missions
 * - GPS destinations and routes
 * - Cars with actual missions (delivery, patrol, garbage, etc)
 * - Autonomous work behavior
 * - Dynamic task assignment
 *
 * The world is ALIVE - NPCs are always busy doing something productive
 */

import { create } from 'zustand'

export const useNPCDailyRoutineSystem = create((set, get) => ({
  // ===== NPC ROUTINES =====
  routines: {}, // npcId -> routine data
  workAssignments: {}, // npcId -> current work assignment
  activeVehicles: {}, // vehicleId -> NPC operating it with route
  routineSchedules: {}, // time-based queue of routines

  // ===== CREATE DAILY ROUTINE =====
  createDailyRoutine: (npcId, routineData) => {
    // routineData = {
    //   name, jobRole, location, workStartTime, workEndTime
    //   assignedTasks, vehicles, schedule
    // }

    const routineId = `routine_${npcId}_${Date.now()}`

    const routine = {
      id: routineId,
      npcId: npcId,
      name: routineData.name || `${npcId} Daily Routine`,
      jobRole: routineData.jobRole,
      primaryLocation: routineData.location,

      // DAILY SCHEDULE
      schedule: {
        morningStart: routineData.morningStart || '6:00 AM',
        workStart: routineData.workStart || '9:00 AM',
        workEnd: routineData.workEnd || '5:00 PM',
        eveningEnd: routineData.eveningEnd || '10:00 PM',
        sleepStart: routineData.sleepStart || '10:00 PM'
      },

      // WORK ASSIGNMENT
      workAssignment: {
        jobRole: routineData.jobRole,
        workplace: routineData.location,
        tasksPerHour: routineData.tasksPerHour || 8,
        totalTasksPerDay: routineData.totalTasksPerDay || 64
      },

      // VEHICLE ASSIGNMENT
      vehicleAssignment: routineData.vehicleId || null,
      vehicleType: routineData.vehicleType || null,

      // TASKS & MISSIONS
      dailyTasks: generateDailyTasks(routineData),
      currentTaskIndex: 0,

      // STATUS
      status: 'active',
      lastUpdated: Date.now(),
      createdAt: Date.now()
    }

    set(state => ({
      routines: {
        ...state.routines,
        [npcId]: routine
      }
    }))

    return {
      success: true,
      routineId: routineId,
      npcId: npcId,
      jobRole: routine.jobRole,
      message: `Daily routine created for ${npcId}: ${routine.jobRole} at ${routine.primaryLocation}`
    }
  },

  // ===== ASSIGN VEHICLE TO NPC =====
  assignVehicleToNPC: (npcId, vehicleId, routeData) => {
    // routeData = {
    //   startLocation, destinations, routeType (delivery, patrol, garbage, etc)
    // }

    const assignment = {
      id: `assign_${Date.now()}`,
      npcId: npcId,
      vehicleId: vehicleId,
      routeType: routeData.routeType || 'patrol', // delivery, patrol, garbage, emergency, taxi
      currentLocation: routeData.startLocation,
      destinations: routeData.destinations || [],
      currentDestinationIndex: 0,
      status: 'active',
      speed: 30, // mph (varies by vehicle type)
      gpsTracking: true,
      missionsCompleted: 0,
      totalMissions: routeData.destinations?.length || 0,
      assignedAt: Date.now(),
      nextCheckpoint: routeData.destinations?.[0] || null
    }

    set(state => ({
      workAssignments: {
        ...state.workAssignments,
        [npcId]: assignment
      },
      activeVehicles: {
        ...state.activeVehicles,
        [vehicleId]: assignment
      }
    }))

    return {
      success: true,
      assignmentId: assignment.id,
      npcId: npcId,
      vehicleId: vehicleId,
      routeType: assignment.routeType,
      destinations: assignment.totalMissions,
      message: `${npcId} assigned to ${vehicleId} for ${assignment.routeType} work`
    }
  },

  // ===== UPDATE NPC LOCATION & STATUS =====
  updateNPCWorkProgress: (npcId) => {
    const assignment = get().workAssignments[npcId]
    if (!assignment) return { success: false }

    // Advance to next destination
    const nextIndex = assignment.currentDestinationIndex + 1
    const isDestinationReached = nextIndex < assignment.destinations.length

    const updatedAssignment = {
      ...assignment,
      currentDestinationIndex: nextIndex,
      missionsCompleted: assignment.missionsCompleted + 1,
      nextCheckpoint: isDestinationReached ? assignment.destinations[nextIndex] : null,
      status: isDestinationReached ? 'in_transit' : 'returning_to_station'
    }

    set(state => ({
      workAssignments: {
        ...state.workAssignments,
        [npcId]: updatedAssignment
      }
    }))

    return {
      success: true,
      npcId: npcId,
      missionComplete: true,
      missionsCompleted: updatedAssignment.missionsCompleted,
      totalMissions: updatedAssignment.totalMissions,
      nextDestination: updatedAssignment.nextCheckpoint,
      workStatus: updatedAssignment.status,
      progressPercentage: Math.floor((updatedAssignment.missionsCompleted / updatedAssignment.totalMissions) * 100)
    }
  },

  // ===== POLICE PATROL ROUTINE =====
  createPolicePATROLRoutine: (npcId, patrolAreaData) => {
    const routine = {
      id: `routine_police_${npcId}`,
      npcId: npcId,
      name: `Officer Patrol Route - ${patrolAreaData.area}`,
      jobRole: 'police_officer',
      primaryLocation: patrolAreaData.area,
      schedule: {
        workStart: patrolAreaData.shiftStart || '8:00 AM',
        workEnd: patrolAreaData.shiftEnd || '4:00 PM'
      },
      workAssignment: {
        jobRole: 'police_officer',
        patrolArea: patrolAreaData.area,
        patrolPoints: patrolAreaData.patrolPoints || 12,
        taskType: 'patrol_and_respond'
      },
      vehicleAssignment: patrolAreaData.vehicleId,
      vehicleType: 'police_car',
      dailyTasks: generatePatrolTasks(patrolAreaData.patrolPoints || 12)
    }

    set(state => ({
      routines: {
        ...state.routines,
        [npcId]: routine
      }
    }))

    return {
      success: true,
      jobRole: 'Police Officer',
      patrolArea: patrolAreaData.area,
      patrolPoints: routine.workAssignment.patrolPoints,
      message: `Police patrol route created for ${patrolAreaData.area}`
    }
  },

  // ===== GARBAGE COLLECTION ROUTINE =====
  createGarbageCollectionRoutine: (npcId, routeData) => {
    const stops = generateGarbageCollectionStops(routeData.area, routeData.stopCount || 45)

    const routine = {
      id: `routine_garbage_${npcId}`,
      npcId: npcId,
      name: `Garbage Route - ${routeData.area}`,
      jobRole: 'sanitation_worker',
      primaryLocation: routeData.depot || 'sanitation_depot',
      schedule: {
        workStart: routeData.startTime || '6:00 AM',
        workEnd: routeData.endTime || '2:00 PM'
      },
      workAssignment: {
        jobRole: 'sanitation_worker',
        area: routeData.area,
        stops: stops.length,
        taskType: 'garbage_collection',
        gpsRoute: true
      },
      vehicleAssignment: routeData.vehicleId,
      vehicleType: 'garbage_truck',
      dailyTasks: stops
    }

    set(state => ({
      routines: {
        ...state.routines,
        [npcId]: routine
      }
    }))

    return {
      success: true,
      jobRole: 'Sanitation Worker',
      routeArea: routeData.area,
      totalStops: stops.length,
      estimatedTime: `${Math.floor(stops.length * 2.5)} minutes`,
      message: `Garbage collection route with ${stops.length} stops created`
    }
  },

  // ===== DELIVERY DRIVER ROUTINE =====
  createDeliveryDriverRoutine: (npcId, deliveryData) => {
    const deliveryStops = generateDeliveryStops(deliveryData.startingAddress, deliveryData.deliveryCount || 25)

    const routine = {
      id: `routine_delivery_${npcId}`,
      npcId: npcId,
      name: `Delivery Route - ${deliveryData.area || 'Downtown'}`,
      jobRole: 'delivery_driver',
      primaryLocation: deliveryData.depot || 'delivery_depot',
      schedule: {
        workStart: deliveryData.startTime || '8:00 AM',
        workEnd: deliveryData.endTime || '5:00 PM'
      },
      workAssignment: {
        jobRole: 'delivery_driver',
        area: deliveryData.area || 'Downtown',
        deliveries: deliveryStops.length,
        taskType: 'package_delivery',
        gpsRoute: true
      },
      vehicleAssignment: deliveryData.vehicleId,
      vehicleType: 'delivery_van',
      dailyTasks: deliveryStops
    }

    set(state => ({
      routines: {
        ...state.routines,
        [npcId]: routine
      }
    }))

    return {
      success: true,
      jobRole: 'Delivery Driver',
      deliveriesPerDay: deliveryStops.length,
      area: deliveryData.area,
      totalRoute: `${(deliveryStops.length * 1.2).toFixed(1)} miles`,
      message: `Delivery route with ${deliveryStops.length} deliveries created`
    }
  },

  // ===== TAXI/RIDESHARE ROUTINE =====
  createTaxiDriverRoutine: (npcId, taxiData) => {
    const routine = {
      id: `routine_taxi_${npcId}`,
      npcId: npcId,
      name: 'Vision Rides Driver',
      jobRole: 'taxi_driver',
      primaryLocation: 'vision_rides_hub',
      schedule: {
        workStart: taxiData.startTime || '7:00 AM',
        workEnd: taxiData.endTime || '10:00 PM'
      },
      workAssignment: {
        jobRole: 'taxi_driver',
        taskType: 'passenger_pickups',
        expectedRidesPerDay: 12,
        gpsEnabled: true,
        dynamicRouting: true
      },
      vehicleAssignment: taxiData.vehicleId,
      vehicleType: 'cadillac_escalade',
      status: 'waiting_for_rides',
      totalDailyEarnings: 0
    }

    set(state => ({
      routines: {
        ...state.routines,
        [npcId]: routine
      }
    }))

    return {
      success: true,
      jobRole: 'Taxi Driver',
      vehicle: 'Cadillac Escalade',
      expectedRidesPerDay: 12,
      message: 'Taxi driver routine initialized - ready to accept rides'
    }
  },

  // ===== FIREFIGHTER ROUTINE =====
  createFirefighterRoutine: (npcId, stationData) => {
    const routine = {
      id: `routine_firefighter_${npcId}`,
      npcId: npcId,
      name: `Firefighter - ${stationData.station || 'Station 1'}`,
      jobRole: 'firefighter',
      primaryLocation: stationData.station || 'fire_station',
      schedule: {
        workStart: stationData.shiftStart || '8:00 AM',
        workEnd: stationData.shiftEnd || '8:00 PM' // 12-hour shifts for firefighters
      },
      workAssignment: {
        jobRole: 'firefighter',
        station: stationData.station,
        taskType: 'emergency_response',
        responseTime: '2-5 minutes',
        available24_7: true
      },
      vehicleAssignment: stationData.vehicleId,
      vehicleType: stationData.vehicleType || 'fire_engine',
      status: 'on_duty_at_station',
      responsesPerDay: 0
    }

    set(state => ({
      routines: {
        ...state.routines,
        [npcId]: routine
      }
    }))

    return {
      success: true,
      jobRole: 'Firefighter',
      station: routine.primaryLocation,
      vehicle: routine.vehicleType,
      message: 'Firefighter on duty - ready for emergency response'
    }
  },

  // ===== GET ACTIVE NPCs =====
  getActiveNPCs: () => {
    const routines = Object.values(get().routines)
    return routines.filter(r => r.status === 'active').map(r => ({
      npcId: r.npcId,
      jobRole: r.jobRole,
      location: r.primaryLocation,
      vehicle: r.vehicleType,
      taskProgress: r.currentTaskIndex,
      status: r.status
    }))
  },

  // ===== GET NPC WORK STATUS =====
  getNPCWorkStatus: (npcId) => {
    const routine = get().routines[npcId]
    const assignment = get().workAssignments[npcId]

    if (!routine)
      return {
        status: 'no_routine'
      }

    return {
      npcId: npcId,
      jobRole: routine.jobRole,
      location: routine.primaryLocation,
      vehicle: routine.vehicleType,
      currentTask: routine.dailyTasks[routine.currentTaskIndex],
      tasksCompleted: routine.currentTaskIndex,
      totalTasks: routine.dailyTasks.length,
      workStatus: assignment ? assignment.status : 'idle',
      vehicleLocation: assignment ? assignment.currentLocation : routine.primaryLocation,
      nextDestination: assignment ? assignment.nextCheckpoint : null
    }
  }
}))

// ===== HELPER FUNCTIONS =====

function generateDailyTasks(routineData) {
  const taskCount = routineData.totalTasksPerDay || 64
  const tasks = []

  for (let i = 0; i < taskCount; i++) {
    tasks.push({
      index: i,
      type: routineData.jobRole,
      status: 'pending',
      startTime: new Date(Date.now() + i * 900000).toLocaleTimeString(), // 15 min per task
      completed: false
    })
  }

  return tasks
}

function generatePatrolTasks(patrolPoints) {
  const tasks = []

  for (let i = 0; i < patrolPoints; i++) {
    tasks.push({
      index: i,
      type: 'patrol_checkpoint',
      location: `Patrol Point ${i + 1}`,
      duration: '15 minutes',
      status: 'pending'
    })
  }

  return tasks
}

function generateGarbageCollectionStops(area, count) {
  const stops = []

  for (let i = 0; i < count; i++) {
    stops.push({
      stopNumber: i + 1,
      address: `${area} - Address ${i + 1}`,
      location: {
        x: 200 + Math.random() * 100,
        y: 0,
        z: 200 + Math.random() * 100
      },
      status: 'pending',
      estimatedTime: '3 minutes',
      completed: false
    })
  }

  return stops
}

function generateDeliveryStops(startingAddress, count) {
  const stops = []

  for (let i = 0; i < count; i++) {
    stops.push({
      stopNumber: i + 1,
      address: `Delivery Address ${i + 1}`,
      location: {
        x: 100 + Math.random() * 200,
        y: 0,
        z: 100 + Math.random() * 200
      },
      packageCount: Math.floor(Math.random() * 3) + 1,
      estimatedTime: '5 minutes',
      status: 'pending',
      completed: false
    })
  }

  return stops
}

export function getNPCRoutineCount() {
  return Object.keys(useNPCDailyRoutineSystem.getState().routines).length
}

export function getAllRoutines() {
  return useNPCDailyRoutineSystem.getState().routines
}
