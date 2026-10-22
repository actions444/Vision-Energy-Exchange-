/**
 * VISION STORMS WORLD - Vision Rides Transportation System
 *
 * Trinity's signature rideshare service
 * - Fleet: 2025/2026 Cadillac Escalade IQ (multiple colors)
 * - Booking system: Call from anywhere, get pickup
 * - Photorealistic NPC drivers
 * - Real driving routes to destination
 * - Visual map integration
 */

import { create } from 'zustand'

export const useVisionRidesSystem = create((set, get) => ({
  // ===== VEHICLE FLEET =====
  fleet: {
    escaladeIQ_2026: {
      id: 'escalade_iq_2026',
      name: '2026 Cadillac Escalade IQ',
      capacity: 7, // passengers
      features: ['luxury', 'electric', 'autonomous_ready', 'premium_sound'],
      colors: [
        'onyx_black',
        'pearl_white',
        'champagne',
        'dark_granite',
        'cherry_red',
        'midnight_blue'
      ],
      basePrice: 2.50, // per mile
      waitingCharge: 0.35, // per minute
      minRide: 5.00 // minimum charge
    }
  },

  // ===== ACTIVE RIDES =====
  activeRides: {}, // rideId -> ride data
  availableVehicles: [], // Fleet of available cars
  rideHistory: [], // Completed rides

  // ===== DRIVERS =====
  drivers: {}, // driverId -> driver profile (photorealistic NPC)
  assignedDrivers: {}, // rideId -> driverId
  driverRatings: {}, // driverId -> { rating, reviews_count, trips_completed }

  // ===== PLAYER WALLET =====
  playerWallet: {
    balance: 0, // Starting credits
    currency: 'Vision Credits',
    totalSpent: 0,
    totalRides: 0,
    favoriteDestinations: []
  },

  // ===== PRICING & SURGE =====
  pricing: {
    baseMileRate: 2.50,
    baseMinuteRate: 0.35,
    minimumFare: 5.00,
    surgeMultiplier: 1.0, // Increases during peak times
    peakHours: ['7:00-9:00', '12:00-13:00', '17:00-19:00'],
    longDistanceFee: 0.25 // per mile over 20 miles
  },

  // ===== BOOKING SYSTEM =====
  requestRide: (playerPosition, destination, rideType = 'regular') => {
    const rideId = generateRideId()
    const distance = calculateDistance(playerPosition, destination)
    const estimatedFare = calculateFare(distance, get().pricing)
    const estimatedTime = calculateETA(distance)

    const newRide = {
      id: rideId,
      playerId: 'player', // Will be set from game state
      pickup: playerPosition,
      destination: destination,
      rideType: rideType, // 'regular', 'xl', 'lux'
      status: 'searching', // searching, accepted, arrived, in_progress, completed, cancelled
      requestedAt: Date.now(),
      estimatedFare: estimatedFare,
      actualFare: 0,
      estimatedTime: estimatedTime, // minutes
      distance: distance, // meters
      driverId: null,
      driverArrivalTime: null,
      pickupTime: null,
      dropoffTime: null,
      rating: 0,
      notes: ''
    }

    set(state => ({
      activeRides: {
        ...state.activeRides,
        [rideId]: newRide
      }
    }))

    // Find nearest available driver
    setTimeout(() => {
      get().assignDriver(rideId)
    }, 1000) // Simulate search delay

    return {
      rideId,
      estimatedFare,
      estimatedTime,
      status: 'searching'
    }
  },

  // ===== ASSIGN DRIVER =====
  assignDriver: (rideId) => {
    const ride = get().activeRides[rideId]
    if (!ride) return

    // Find closest available driver
    const drivers = Object.values(get().drivers)
    let closestDriver = null
    let minDistance = Infinity

    drivers.forEach(driver => {
      if (driver.available && driver.currentRide === null) {
        const dist = calculateDistance(driver.position, ride.pickup)
        if (dist < minDistance) {
          minDistance = dist
          closestDriver = driver
        }
      }
    })

    if (closestDriver) {
      const arrivalTime = Math.ceil(minDistance / 20) // Approx seconds to arrive

      set(state => ({
        activeRides: {
          ...state.activeRides,
          [rideId]: {
            ...state.activeRides[rideId],
            status: 'accepted',
            driverId: closestDriver.id,
            driverArrivalTime: Date.now() + (arrivalTime * 1000)
          }
        },
        drivers: {
          ...state.drivers,
          [closestDriver.id]: {
            ...closestDriver,
            available: false,
            currentRide: rideId
          }
        }
      }))

      return {
        assigned: true,
        driverId: closestDriver.id,
        driverName: closestDriver.name,
        driverRating: closestDriver.rating,
        vehicleColor: closestDriver.vehicleColor,
        arrivalTime: arrivalTime
      }
    }

    return { assigned: false }
  },

  // ===== DRIVER ARRIVED =====
  driverArrived: (rideId) => {
    set(state => ({
      activeRides: {
        ...state.activeRides,
        [rideId]: {
          ...state.activeRides[rideId],
          status: 'waiting_for_passenger',
          pickupTime: Date.now()
        }
      }
    }))
  },

  // ===== START RIDE =====
  startRide: (rideId) => {
    set(state => ({
      activeRides: {
        ...state.activeRides,
        [rideId]: {
          ...state.activeRides[rideId],
          status: 'in_progress'
        }
      }
    }))

    return {
      status: 'in_progress',
      destination: get().activeRides[rideId].destination
    }
  },

  // ===== COMPLETE RIDE =====
  completeRide: (rideId, playerRating = 5, playerNotes = '') => {
    const ride = get().activeRides[rideId]
    if (!ride) return

    const totalCost = ride.estimatedFare // Could adjust based on actual distance
    const finalFare = Math.max(ride.estimatedFare, get().pricing.minimumFare)

    set(state => ({
      activeRides: {
        ...state.activeRides,
        [rideId]: {
          ...state.activeRides[rideId],
          status: 'completed',
          dropoffTime: Date.now(),
          actualFare: finalFare,
          rating: playerRating,
          notes: playerNotes
        }
      },
      playerWallet: {
        ...state.playerWallet,
        balance: state.playerWallet.balance - finalFare,
        totalSpent: state.playerWallet.totalSpent + finalFare,
        totalRides: state.playerWallet.totalRides + 1
      },
      drivers: {
        ...state.drivers,
        [ride.driverId]: {
          ...state.drivers[ride.driverId],
          available: true,
          currentRide: null,
          tripsCompleted: (state.drivers[ride.driverId].tripsCompleted || 0) + 1
        }
      },
      rideHistory: [...state.rideHistory, ride]
    }))

    // Update driver rating
    get().updateDriverRating(ride.driverId, playerRating)

    return {
      status: 'completed',
      totalCost: finalFare,
      distance: ride.distance,
      duration: ride.dropoffTime - ride.pickupTime
    }
  },

  // ===== CANCEL RIDE =====
  cancelRide: (rideId, reason = 'user_cancelled') => {
    const ride = get().activeRides[rideId]
    if (!ride) return

    // Refund if already charged
    if (ride.status === 'completed') {
      set(state => ({
        playerWallet: {
          ...state.playerWallet,
          balance: state.playerWallet.balance + ride.actualFare
        }
      }))
    }

    // Free up driver
    if (ride.driverId) {
      set(state => ({
        drivers: {
          ...state.drivers,
          [ride.driverId]: {
            ...state.drivers[ride.driverId],
            available: true,
            currentRide: null
          }
        }
      }))
    }

    set(state => ({
      activeRides: {
        ...state.activeRides,
        [rideId]: {
          ...state.activeRides[rideId],
          status: 'cancelled',
          reason: reason
        }
      }
    }))
  },

  // ===== DRIVER MANAGEMENT =====
  createDriver: (driverData) => {
    const driverId = generateDriverId()
    const driver = {
      id: driverId,
      name: driverData.name,
      avatar: driverData.avatar, // Photorealistic NPC face
      rating: 5.0,
      reviews: 0,
      tripsCompleted: 0,
      position: driverData.startPosition,
      available: true,
      currentRide: null,
      vehicleColor: driverData.vehicleColor || 'onyx_black',
      licenseNumber: driverData.licenseNumber,
      yearsExperience: driverData.yearsExperience || 5
    }

    set(state => ({
      drivers: {
        ...state.drivers,
        [driverId]: driver
      }
    }))

    return driver
  },

  updateDriverRating: (driverId, newRating) => {
    const driver = get().drivers[driverId]
    if (!driver) return

    const totalRating = driver.rating * driver.reviews + newRating
    const newReviews = driver.reviews + 1
    const avgRating = totalRating / newReviews

    set(state => ({
      drivers: {
        ...state.drivers,
        [driverId]: {
          ...driver,
          rating: parseFloat(avgRating.toFixed(1)),
          reviews: newReviews
        }
      }
    }))
  },

  // ===== SURGE PRICING =====
  updateSurgePricing: (multiplier) => {
    set(state => ({
      pricing: {
        ...state.pricing,
        surgeMultiplier: multiplier
      }
    }))
  },

  // ===== RIDE HISTORY =====
  getRideHistory: () => {
    return get().rideHistory
  },

  getTotalSpent: () => {
    return get().playerWallet.totalSpent
  },

  getFavoriteDestinations: () => {
    return get().playerWallet.favoriteDestinations
  },

  addFavoriteDestination: (destination) => {
    set(state => ({
      playerWallet: {
        ...state.playerWallet,
        favoriteDestinations: [...state.playerWallet.favoriteDestinations, destination]
      }
    }))
  }
}))

// ===== HELPER FUNCTIONS =====

function generateRideId() {
  return `ride_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function generateDriverId() {
  return `driver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function calculateDistance(pos1, pos2) {
  // Euclidean distance in meters
  const dx = pos2.x - pos1.x
  const dz = pos2.z - pos1.z
  return Math.sqrt(dx * dx + dz * dz)
}

function calculateFare(distanceMeters, pricing) {
  const distanceMiles = distanceMeters / 1609.34
  let fare = distanceMiles * pricing.baseMileRate

  // Long distance fee
  if (distanceMiles > 20) {
    fare += (distanceMiles - 20) * pricing.longDistanceFee
  }

  // Apply surge multiplier
  fare *= pricing.surgeMultiplier

  // Minimum fare
  return Math.max(fare, pricing.minimumFare)
}

function calculateETA(distanceMeters) {
  // Average speed: 30 mph = 48 km/h
  const distanceKm = distanceMeters / 1000
  const avgSpeed = 48 // km/h
  const timeHours = distanceKm / avgSpeed
  return Math.ceil(timeHours * 60) // Convert to minutes
}

export function getActiveRides() {
  const state = useVisionRidesSystem.getState()
  return Object.values(state.activeRides)
}

export function getPlayerWallet() {
  const state = useVisionRidesSystem.getState()
  return state.playerWallet
}

export function getFleet() {
  const state = useVisionRidesSystem.getState()
  return state.fleet
}
