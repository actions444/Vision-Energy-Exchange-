/**
 * VISION STORMS WORLD - Vehicle Mission System
 *
 * Every vehicle has a job:
 * - Fire trucks respond to emergencies
 * - Trash trucks collect garbage with GPS
 * - Delivery trucks visit locations
 * - Ambulances respond to medical calls
 * - Police cars patrol and respond
 *
 * NPCs operate vehicles, complete missions autonomously
 * Players can observe, assist, or take over
 */

import { create } from 'zustand'

export const useVehicleMissionSystem = create((set, get) => ({
  // ===== VEHICLE FLEET =====
  vehicleFleet: {
    fire_department: {
      department: 'Fire Department',
      vehicles: [
        {
          id: 'fire_truck_1',
          type: 'Fire Engine',
          capacity: 6, // crew
          location: { x: 100, y: 0, z: 100 },
          status: 'in_station',
          assignedCrew: ['npc_firefighter_1', 'npc_firefighter_2'],
          equipment: ['ladders', 'hoses', 'pumps', 'rescue_tools'],
          responseTime: '2-5 minutes',
          missionHistory: []
        },
        {
          id: 'ladder_truck_1',
          type: 'Ladder Truck',
          capacity: 8,
          location: { x: 120, y: 0, z: 120 },
          status: 'in_station',
          assignedCrew: ['npc_firefighter_3', 'npc_firefighter_4'],
          equipment: ['extended_ladder', 'rescue_basket', 'descent_device'],
          responseTime: '2-5 minutes'
        },
        {
          id: 'ambulance_1',
          type: 'Medical Ambulance',
          capacity: 2, // paramedics + 1 patient
          location: { x: 110, y: 0, z: 110 },
          status: 'in_station',
          assignedCrew: ['npc_paramedic_1', 'npc_paramedic_2'],
          equipment: ['defibrillator', 'oxygen', 'stretcher', 'medical_supplies']
        }
      ]
    },

    sanitation: {
      department: 'Sanitation Services',
      vehicles: [
        {
          id: 'garbage_truck_1',
          type: 'Residential Garbage Truck',
          capacity: 15, // tons
          location: { x: 200, y: 0, z: 200 },
          status: 'on_route',
          assignedCrew: ['npc_sanitation_1', 'npc_sanitation_2'],
          currentRoute: 'residential_north',
          gpsTracking: true,
          missionsToday: 45, // garbage cans to collect
          missionsCompleted: 12,
          currentMission: 'heading_to_next_stop'
        },
        {
          id: 'garbage_truck_2',
          type: 'Residential Garbage Truck',
          capacity: 15,
          location: { x: 210, y: 0, z: 210 },
          status: 'on_route',
          assignedCrew: ['npc_sanitation_3', 'npc_sanitation_4'],
          currentRoute: 'residential_south',
          gpsTracking: true,
          missionsToday: 45,
          missionsCompleted: 18
        },
        {
          id: 'recycling_truck_1',
          type: 'Recycling Truck',
          capacity: 12,
          location: { x: 220, y: 0, z: 220 },
          status: 'on_route',
          assignedCrew: ['npc_sanitation_5'],
          currentRoute: 'commercial',
          gpsTracking: true
        }
      ]
    },

    police: {
      department: 'Police Department',
      vehicles: [
        {
          id: 'patrol_car_1',
          type: 'Police Sedan',
          capacity: 2,
          location: { x: 150, y: 0, z: 150 },
          status: 'on_patrol',
          assignedCrew: ['npc_officer_1', 'npc_officer_2'],
          patrolArea: 'downtown',
          gpsTracking: true,
          recentMissions: ['traffic_stop', 'welfare_check']
        },
        {
          id: 'patrol_car_2',
          type: 'Police Sedan',
          capacity: 2,
          location: { x: 160, y: 0, z: 160 },
          status: 'responding',
          assignedCrew: ['npc_officer_3', 'npc_officer_4'],
          patrolArea: 'west_side',
          currentMission: 'responding_to_burglary'
        }
      ]
    },

    delivery: {
      department: 'Delivery Services',
      vehicles: [
        {
          id: 'delivery_van_1',
          type: 'Delivery Van',
          capacity: 100, // packages
          location: { x: 180, y: 0, z: 180 },
          status: 'on_route',
          assignedCrew: ['npc_delivery_driver_1'],
          packagesToDeliver: 45,
          packagesDelivered: 23,
          route: 'residential_deliveries'
        }
      ]
    }
  },

  // ===== MISSIONS SYSTEM =====
  activeMissions: {}, // missionId -> mission data
  missionLog: [], // History of all missions

  // ===== GARBAGE COLLECTION MISSIONS (GPS TRACKED) =====
  createGarbageCollectionRoute: (truckId, routeArea, stops = 45) => {
    const truck = get().vehicleFleet.sanitation.vehicles.find(v => v.id === truckId)
    if (!truck) return { success: false }

    const routeId = `route_${Date.now()}`
    const stops_array = generateGarbageStops(routeArea, stops)

    const route = {
      id: routeId,
      truckId: truckId,
      area: routeArea,
      totalStops: stops,
      stops: stops_array,
      status: 'in_progress',
      completedStops: 0,
      estimatedCompletionTime: 180, // minutes
      gpsWaypoints: stops_array.map(s => s.location),
      createdAt: Date.now()
    }

    return {
      success: true,
      routeId: routeId,
      truck: truck.type,
      area: routeArea,
      totalStops: stops,
      firstStop: stops_array[0].address,
      estimatedTime: `${Math.floor(180 / 60)}h ${180 % 60}m`,
      waypoints: stops_array.length
    }
  },

  // ===== EMERGENCY RESPONSE =====
  dispatchEmergency: (emergencyType, location, severity = 'moderate') => {
    const emergencyId = `emergency_${Date.now()}`
    const responseTime = calculateResponseTime(location)

    const emergency = {
      id: emergencyId,
      type: emergencyType, // 'fire', 'medical', 'police', 'accident'
      location: location,
      severity: severity, // 'minor', 'moderate', 'severe', 'critical'
      reportedAt: Date.now(),
      respondingUnits: assignRespondingUnits(emergencyType, severity),
      estimatedArrival: responseTime,
      status: 'dispatched'
    }

    set(state => ({
      activeMissions: {
        ...state.activeMissions,
        [emergencyId]: emergency
      }
    }))

    return {
      success: true,
      emergencyId: emergencyId,
      type: emergencyType,
      severity: severity,
      respondingUnits: emergency.respondingUnits.length,
      estimatedArrival: `${responseTime} seconds`,
      message: `Emergency dispatch confirmed. ${emergency.respondingUnits.length} unit(s) responding.`
    }
  },

  // ===== TRACK VEHICLE =====
  trackVehicle: (vehicleId) => {
    let vehicle = null
    let department = null

    // Search in all departments
    Object.values(get().vehicleFleet).forEach(dept => {
      if (dept.vehicles) {
        const found = dept.vehicles.find(v => v.id === vehicleId)
        if (found) {
          vehicle = found
          department = dept.department
        }
      }
    })

    if (!vehicle) return { success: false, error: 'Vehicle not found' }

    return {
      success: true,
      vehicleId: vehicleId,
      type: vehicle.type,
      department: department,
      status: vehicle.status,
      location: vehicle.location,
      assignedCrew: vehicle.assignedCrew,
      currentMission: vehicle.currentMission || 'standby',
      gpsTracking: vehicle.gpsTracking || false,
      realTimeUpdates: true
    }
  },

  // ===== NPC COMPLETES MISSION =====
  completeVehicleMission: (vehicleId, missionData) => {
    const missionId = `mission_${Date.now()}`

    const mission = {
      id: missionId,
      vehicleId: vehicleId,
      type: missionData.type,
      startTime: Date.now(),
      endTime: Date.now() + (missionData.duration || 0),
      status: 'completed',
      location: missionData.location,
      npcCrew: missionData.crew,
      outcomeSuccess: true,
      details: missionData.details || ''
    }

    set(state => ({
      missionLog: [...state.missionLog, mission]
    }))

    return {
      success: true,
      missionId: missionId,
      mission: mission.type,
      completedAt: new Date(mission.endTime).toLocaleTimeString(),
      outcome: 'Successful',
      message: `${missionData.type} mission completed successfully by NPC crew`
    }
  }
}))

// ===== HELPER FUNCTIONS =====

function calculateResponseTime(location) {
  // Random response time between 2-5 minutes
  return Math.floor(Math.random() * 180) + 120 // seconds
}

function assignRespondingUnits(emergencyType, severity) {
  const units = []

  if (emergencyType === 'fire') {
    units.push('fire_truck_1')
    units.push('ladder_truck_1')
    if (severity === 'critical') units.push('ambulance_1')
  } else if (emergencyType === 'medical') {
    units.push('ambulance_1')
    if (severity === 'critical') units.push('ambulance_1')
  } else if (emergencyType === 'police') {
    units.push('patrol_car_1')
    if (severity === 'severe') units.push('patrol_car_2')
  }

  return units
}

function generateGarbageStops(routeArea, count) {
  const stops = []

  for (let i = 0; i < count; i++) {
    const stop = {
      stopNumber: i + 1,
      address: `${routeArea} - Address ${i + 1}`,
      location: {
        x: 200 + (Math.random() * 50),
        y: 0,
        z: 200 + (Math.random() * 50)
      },
      status: i === 0 ? 'current' : 'pending',
      completed: false
    }
    stops.push(stop)
  }

  return stops
}

export function getVehicleFleet() {
  return useVehicleMissionSystem.getState().vehicleFleet
}

export function getActiveMissions() {
  return useVehicleMissionSystem.getState().activeMissions
}

export function getMissionLog() {
  return useVehicleMissionSystem.getState().missionLog
}
