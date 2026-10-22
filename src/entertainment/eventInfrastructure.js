/**
 * VISION STORMS WORLD - Event & Party Infrastructure
 *
 * Players can host and attend parties, concerts, events
 * - Photo booths
 * - Bouncy houses
 * - Blow-up tents (large capacity)
 * - Parks with activities
 * - Trails for exploration
 *
 * Complete event hosting platform
 */

import { create } from 'zustand'

export const useEventInfrastructure = create((set, get) => ({
  // ===== VENUES & LOCATIONS =====
  venues: {
    central_park: {
      id: 'venue_park',
      name: 'Vision Storms Central Park',
      location: { x: 250, y: 0, z: 250 },
      type: 'outdoor_park',
      capacity: 500,
      features: ['grass', 'trees', 'benches', 'walking_paths'],
      eventableAreas: [
        { id: 'area_1', name: 'Main Lawn', capacity: 300 },
        { id: 'area_2', name: 'Forest Trail Head', capacity: 100 },
        { id: 'area_3', name: 'Picnic Area', capacity: 100 }
      ]
    },
    event_plaza: {
      id: 'venue_plaza',
      name: 'Vision Storms Event Plaza',
      location: { x: 280, y: 0, z: 280 },
      type: 'multipurpose_venue',
      capacity: 1000,
      features: ['stage', 'lighting', 'sound_system', 'covered_areas'],
      rentableAreas: [
        { id: 'area_plaza_1', name: 'Main Stage', capacity: 500, pricePerHour: 100 },
        { id: 'area_plaza_2', name: 'DJ Booth', capacity: 200, pricePerHour: 50 }
      ]
    }
  },

  // ===== PHOTO BOOTH SYSTEM =====
  photoBooths: {
    booth_1: {
      id: 'booth_1',
      name: 'Vision Storms Photo Booth',
      location: { x: 260, y: 0, z: 260 },
      isActive: true,
      pricePerPhoto: 5, // Credits
      features: [
        'Green screen capability',
        'Custom filters (Trinity branded)',
        'Props library (hats, signs, accessories)',
        'Instant prints available',
        'Digital copy emailed/saved'
      ],
      props: [
        { id: 'prop_crown', name: 'Gold Crown', category: 'accessories' },
        { id: 'prop_microphone', name: 'Microphone', category: 'stage' },
        { id: 'prop_money', name: 'Money Props', category: 'wealth' },
        { id: 'prop_glasses', name: 'Cool Shades', category: 'accessories' }
      ],
      filters: [
        { id: 'filter_gold', name: 'Gold Luxury', effect: 'gold_tint' },
        { id: 'filter_neon', name: 'Neon Lights', effect: 'neon_glow' },
        { id: 'filter_trinity', name: 'Trinity Vision', effect: 'branded_overlay' }
      ],
      photosPerSession: 4,
      sessionTime: 120 // seconds
    }
  },

  // ===== BOUNCY HOUSE / INFLATABLE SYSTEM =====
  inflatables: {
    bouncy_house_1: {
      id: 'bouncy_1',
      name: 'Giant Bouncy House',
      type: 'bouncy_house',
      capacity: 30,
      location: { x: 270, y: 0, z: 270 },
      dimensions: { width: 20, length: 20, height: 15 }, // meters
      rentalPrice: 75, // Credits per hour
      safetyFeatures: ['padded_walls', 'safety_net', 'entrance_supervision'],
      ageRestrictions: '5-15 years old (adults can supervise)',
      occupancyStatus: 0,
      isRented: false
    },
    blow_up_tent_1: {
      id: 'tent_1',
      name: 'Large Event Tent',
      type: 'blow_up_tent',
      capacity: 200, // People
      location: { x: 275, y: 0, z: 275 },
      dimensions: { width: 30, length: 50, height: 10 }, // meters
      rentalPrice: 150, // Credits per hour
      features: [
        'Climate controlled',
        'LED lighting',
        'Multiple entrance/exits',
        'Tables and chairs (separate)',
        'Sound system ready'
      ],
      safetyFeatures: ['fire_extinguishers', 'emergency_exits', 'ventilation'],
      occupancyStatus: 0,
      isRented: false
    },
    blow_up_tent_2: {
      id: 'tent_2',
      name: 'Medium Event Tent',
      type: 'blow_up_tent',
      capacity: 100,
      location: { x: 265, y: 0, z: 265 },
      dimensions: { width: 20, length: 30, height: 8 },
      rentalPrice: 100,
      features: [
        'Climate controlled',
        'LED lighting',
        'Entrance/exit',
        'Tables included'
      ],
      occupancyStatus: 0,
      isRented: false
    }
  },

  // ===== TRAILS & OUTDOOR ACTIVITIES =====
  trails: {
    forest_trail: {
      id: 'trail_forest',
      name: 'Vision Storms Forest Trail',
      location: { x: 300, y: 0, z: 300 },
      difficulty: 'moderate',
      distance: 5, // km
      estimatedTime: 60, // minutes
      features: [
        'Scenic overlooks',
        'Rest benches',
        'Educational signs (nature, history)',
        'Wildlife spotting opportunities'
      ],
      checkpoint: [
        { id: 'cp_1', name: 'Trail Start', location: { x: 300, y: 0, z: 300 } },
        { id: 'cp_2', name: 'First Overlook', location: { x: 310, y: 10, z: 310 }, reward: 50 },
        { id: 'cp_3', name: 'Forest Heart', location: { x: 320, y: 15, z: 320 }, reward: 100 },
        { id: 'cp_4', name: 'Trail End', location: { x: 330, y: 0, z: 330 }, reward: 200 }
      ]
    },
    riverside_walk: {
      id: 'trail_river',
      name: 'Riverside Walking Path',
      location: { x: 350, y: 0, z: 250 },
      difficulty: 'easy',
      distance: 3,
      estimatedTime: 40,
      features: [
        'River views',
        'Fishing spots',
        'Picnic areas',
        'Wildlife (fish, birds)'
      ],
      points_of_interest: [
        { id: 'poi_1', name: 'Fishing Pier', reward: 25 },
        { id: 'poi_2', name: 'Scenic Viewpoint', reward: 50 }
      ]
    },
    mountain_hike: {
      id: 'trail_mountain',
      name: 'Mountain Peak Challenge',
      location: { x: 400, y: 0, z: 400 },
      difficulty: 'hard',
      distance: 10,
      estimatedTime: 180,
      elevation_gain: 800, // meters
      features: [
        'Challenging terrain',
        'Panoramic summit views',
        'Advanced nature education',
        'Extreme sports integration (rock climbing)'
      ],
      rewards: {
        completion: 500,
        speedRecord: 100,
        photoAlbum: 50
      }
    }
  },

  // ===== PARK & RECREATION AREAS =====
  parks: {
    community_park: {
      id: 'park_community',
      name: 'Community Recreation Park',
      location: { x: 200, y: 0, z: 200 },
      attractions: [
        {
          id: 'att_playground',
          name: 'Playground',
          description: 'Swings, slides, climbing structures',
          ageGroup: '3-12'
        },
        {
          id: 'att_courts',
          name: 'Sports Courts',
          description: 'Basketball, tennis, volleyball',
          capacity: 20
        },
        {
          id: 'att_picnic',
          name: 'Picnic Area',
          description: 'Tables, grills, family gathering',
          capacity: 100
        },
        {
          id: 'att_garden',
          name: 'Community Garden',
          description: 'Plant seeds, learn agriculture',
          plots: 20
        }
      ]
    }
  },

  // ===== EVENT BOOKING SYSTEM =====
  bookedEvents: {}, // eventId -> event data
  eventHistory: [],

  // ===== BOOK VENUE/EQUIPMENT =====
  bookVenue: (playerId, venueId, startTime, duration, eventType, guestList = []) => {
    const venue = get().venues[venueId] || get().inflatables[venueId]
    if (!venue) return { success: false, error: 'Venue not found' }

    if (venue.isRented) {
      return { success: false, error: 'Venue already booked for this time' }
    }

    const eventId = `event_${Date.now()}`
    const cost = (venue.rentalPrice || 0) * duration

    const event = {
      id: eventId,
      playerId: playerId,
      venueId: venueId,
      venueName: venue.name,
      eventType: eventType, // 'party', 'concert', 'gathering', 'celebration'
      startTime: startTime,
      duration: duration, // hours
      guestList: guestList,
      cost: cost,
      status: 'booked',
      createdAt: Date.now(),
      decorations: [],
      catering: null,
      entertainment: null
    }

    set(state => ({
      bookedEvents: {
        ...state.bookedEvents,
        [eventId]: event
      },
      inflatables: {
        ...state.inflatables,
        [venueId]: {
          ...state.inflatables[venueId],
          isRented: true
        }
      }
    }))

    return {
      success: true,
      eventId: eventId,
      venueName: venue.name,
      capacity: venue.capacity,
      totalCost: cost,
      guestSlots: venue.capacity - guestList.length
    }
  },

  // ===== PHOTO BOOTH SESSION =====
  usePhotoBooth: (playerId, boothId, selectedProps = [], selectedFilter = null) => {
    const booth = get().photoBooths[boothId]
    if (!booth) return { success: false }

    const sessionId = `session_${Date.now()}`
    const totalCost = booth.pricePerPhoto * booth.photosPerSession

    const photos = []
    for (let i = 0; i < booth.photosPerSession; i++) {
      photos.push({
        id: `photo_${i + 1}`,
        props: selectedProps,
        filter: selectedFilter,
        timestamp: Date.now() + (i * 1000),
        imageUrl: `/photos/${sessionId}/photo_${i + 1}.jpg`
      })
    }

    return {
      success: true,
      sessionId: sessionId,
      booth: booth.name,
      photos: photos,
      cost: totalCost,
      message: 'Strike a pose! Your photos are being captured...'
    }
  },

  // ===== TRAIL ACTIVITY =====
  startTrailActivity: (playerId, trailId) => {
    const trail = get().trails[trailId]
    if (!trail) return { success: false }

    const activityId = `activity_${Date.now()}`

    return {
      success: true,
      activityId: activityId,
      trailName: trail.name,
      difficulty: trail.difficulty,
      distance: trail.distance,
      estimatedTime: trail.estimatedTime,
      checkpoints: trail.checkpoints || [],
      rewards: trail.rewards || {},
      startTime: Date.now()
    }
  },

  // ===== COMPLETE TRAIL =====
  completeTrail: (activityId, timeSpent, checkpointsReached = []) => {
    let totalReward = 0
    checkpointsReached.forEach(cp => {
      totalReward += cp.reward || 0
    })

    // Bonus for speed
    const speedBonus = 100 - Math.min(timeSpent / 2, 100)

    return {
      success: true,
      activityCompleted: true,
      baseReward: totalReward,
      speedBonus: speedBonus,
      totalReward: totalReward + speedBonus,
      certificate: 'Trail Completion Certificate'
    }
  },

  // ===== GET EVENT CALENDAR =====
  getEventCalendar: (month, year) => {
    const events = Object.values(get().bookedEvents).filter(e => {
      const date = new Date(e.startTime)
      return date.getMonth() === month && date.getFullYear() === year
    })

    return {
      month: month,
      year: year,
      eventsThisMonth: events.length,
      events: events
    }
  }
}))

// ===== HELPER FUNCTIONS =====

export function getAvailableVenues() {
  return useEventInfrastructure.getState().venues
}

export function getTrails() {
  return useEventInfrastructure.getState().trails
}

export function getParks() {
  return useEventInfrastructure.getState().parks
}
