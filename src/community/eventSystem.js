/**
 * VISION STORMS WORLD - Community Events System
 *
 * Dynamic events that bring the community together:
 * - Scheduled community gatherings
 * - Festival and celebration events
 * - Educational seminars and workshops
 * - Sports competitions and tournaments
 * - Concert and performance events
 * - Job fairs and recruitment events
 * - Social mixers and networking
 * - Emergency community response events
 * - Seasonal celebrations
 *
 * Creates memorable moments and builds community bonds
 */

import { create } from 'zustand'

export const useCommunityEventSystem = create((set, get) => ({
  // ===== EVENT REGISTRY =====
  events: {}, // eventId -> event data
  activeEvents: {}, // events happening right now
  eventHistory: [], // past events
  playerAttendance: {}, // playerId -> [eventIds attended]
  eventNPCs: {}, // eventId -> [npcIds attending]

  // ===== CREATE EVENT =====
  createEvent: (eventData) => {
    // eventData = {
    //   name, type, description, location, date, time
    //   capacity, duration, organizer, activities, rewards
    // }

    const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const event = {
      id: eventId,
      name: eventData.name,
      type: eventData.type, // festival, seminar, concert, sports, networking, emergency
      description: eventData.description,
      category: eventData.category || 'social', // social, educational, entertainment, business, emergency
      location: eventData.location,
      coordinates: eventData.coordinates || null,

      // TIMING
      date: eventData.date, // Unix timestamp
      time: eventData.time,
      duration: eventData.duration || 180, // minutes
      startTime: eventData.date,
      endTime: eventData.date + eventData.duration * 60000,

      // DETAILS
      organizer: eventData.organizer,
      capacity: eventData.capacity || 100,
      attendees: [],
      attendeeCount: 0,
      npcAttendees: eventData.npcAttendees || [],

      // ACTIVITIES
      activities: eventData.activities || [],
      entertainment: eventData.entertainment || [],
      food: eventData.food || [],

      // REWARDS
      rewards: {
        experiencePerAttendee: eventData.rewards?.experience || 50,
        credits: eventData.rewards?.credits || 0,
        reputationPerAttendee: eventData.rewards?.reputation || 25
      },

      // STATUS
      status: 'scheduled', // scheduled, happening, completed, cancelled
      isPublic: eventData.isPublic !== false,
      createdAt: Date.now()
    }

    set(state => ({
      events: {
        ...state.events,
        [eventId]: event
      }
    }))

    return {
      success: true,
      eventId: eventId,
      name: event.name,
      type: event.type,
      location: event.location,
      capacity: event.capacity,
      message: `Event "${event.name}" created successfully!`
    }
  },

  // ===== REGISTER FOR EVENT =====
  registerForEvent: (playerId, eventId) => {
    const event = get().events[eventId]
    if (!event) return { success: false, error: 'Event not found' }

    if (event.attendeeCount >= event.capacity) {
      return { success: false, error: 'Event is at full capacity' }
    }

    if (event.attendees.includes(playerId)) {
      return { success: false, error: 'You are already registered' }
    }

    const updatedEvent = {
      ...event,
      attendees: [...event.attendees, playerId],
      attendeeCount: event.attendeeCount + 1
    }

    set(state => ({
      events: {
        ...state.events,
        [eventId]: updatedEvent
      },
      playerAttendance: {
        ...state.playerAttendance,
        [playerId]: [...(state.playerAttendance[playerId] || []), eventId]
      }
    }))

    return {
      success: true,
      eventId: eventId,
      eventName: event.name,
      eventTime: event.time,
      location: event.location,
      message: `You've registered for "${event.name}"!`,
      details: {
        date: new Date(event.date).toLocaleDateString(),
        time: event.time,
        duration: event.duration,
        attendees: updatedEvent.attendeeCount,
        capacity: event.capacity
      }
    }
  },

  // ===== START EVENT =====
  startEvent: (eventId) => {
    const event = get().events[eventId]
    if (!event) return { success: false }

    const updatedEvent = {
      ...event,
      status: 'happening'
    }

    set(state => ({
      events: {
        ...state.events,
        [eventId]: updatedEvent
      },
      activeEvents: {
        ...state.activeEvents,
        [eventId]: updatedEvent
      }
    }))

    return {
      success: true,
      eventId: eventId,
      eventName: event.name,
      attendees: event.attendeeCount,
      activities: event.activities,
      message: `"${event.name}" is now happening at ${event.location}!`
    }
  },

  // ===== COMPLETE EVENT =====
  completeEvent: (eventId) => {
    const event = get().events[eventId]
    if (!event) return { success: false }

    const completedEvent = {
      ...event,
      status: 'completed'
    }

    // Reward all attendees
    const attendeeRewards = {
      experience: event.rewards.experiencePerAttendee,
      reputation: event.rewards.reputationPerAttendee,
      credits: Math.floor(event.rewards.credits / event.attendeeCount) || 0
    }

    const { [eventId]: removed, ...remainingActive } = get().activeEvents

    set(state => ({
      events: {
        ...state.events,
        [eventId]: completedEvent
      },
      activeEvents: remainingActive,
      eventHistory: [...state.eventHistory, completedEvent]
    }))

    return {
      success: true,
      eventId: eventId,
      eventName: event.name,
      totalAttendees: event.attendeeCount,
      attendeeRewards: attendeeRewards,
      message: `"${event.name}" has concluded! All attendees earned rewards.`
    }
  },

  // ===== FESTIVAL EVENTS =====
  createFestivalEvent: (festivalData) => {
    const eventId = `festival_${Date.now()}`

    const festival = {
      id: eventId,
      name: festivalData.name || 'Community Festival',
      type: 'festival',
      category: 'entertainment',
      description:
        festivalData.description || 'A celebration bringing the community together',
      location: festivalData.location,
      date: festivalData.date,
      time: festivalData.time,
      duration: 240, // 4 hours
      capacity: 500,
      organizer: 'Vision Storms Community',
      activities: [
        'Live music performances',
        'Food vendors',
        'Games and competitions',
        'Community booths',
        'Dance floor',
        'Kids activities',
        'Art exhibitions'
      ],
      entertainment: festivalData.entertainment || ['Live DJ', 'Local bands', 'Performers'],
      food: [
        'Barbecue',
        'Food trucks',
        'Beverage station',
        'Dessert stand',
        'International cuisine'
      ],
      rewards: {
        experience: 100,
        credits: 500,
        reputation: 50
      },
      attendees: [],
      attendeeCount: 0,
      status: 'scheduled',
      isPublic: true,
      createdAt: Date.now()
    }

    set(state => ({
      events: {
        ...state.events,
        [eventId]: festival
      }
    }))

    return {
      success: true,
      eventId: eventId,
      name: festival.name,
      type: 'Festival',
      message: `Festival "${festival.name}" created!`
    }
  },

  // ===== CONCERT EVENTS =====
  createConcertEvent: (concertData) => {
    const eventId = `concert_${Date.now()}`

    const concert = {
      id: eventId,
      name: concertData.name || 'Live Concert',
      type: 'concert',
      category: 'entertainment',
      description:
        concertData.description || 'Join us for an unforgettable musical performance',
      location: concertData.location || 'Vision Storms Theater',
      date: concertData.date,
      time: concertData.time,
      duration: 120,
      capacity: 1000,
      organizer: concertData.artist || 'Trinity Reign',
      artist: concertData.artist,
      genre: concertData.genre || 'Diverse',
      entertainment: [concertData.artist || 'Featured Artist'],
      rewards: {
        experience: 75,
        credits: 250,
        reputation: 40
      },
      attendees: [],
      attendeeCount: 0,
      status: 'scheduled',
      isPublic: true,
      createdAt: Date.now()
    }

    set(state => ({
      events: {
        ...state.events,
        [eventId]: concert
      }
    }))

    return {
      success: true,
      eventId: eventId,
      name: concert.name,
      artist: concert.artist,
      message: `Concert "${concert.name}" created!`
    }
  },

  // ===== EDUCATIONAL SEMINAR =====
  createSeminarEvent: (seminarData) => {
    const eventId = `seminar_${Date.now()}`

    const seminar = {
      id: eventId,
      name: seminarData.name || 'Educational Seminar',
      type: 'seminar',
      category: 'educational',
      description: seminarData.description || 'Learn valuable skills and knowledge',
      location: seminarData.location || 'Trinity Academy',
      date: seminarData.date,
      time: seminarData.time,
      duration: 120,
      capacity: 100,
      organizer: seminarData.speaker || 'Trinity Reign',
      speaker: seminarData.speaker,
      topic: seminarData.topic || 'Life Skills',
      activities: [
        'Educational presentation',
        'Q&A session',
        'Networking',
        'Resource distribution'
      ],
      rewards: {
        experience: 200,
        credits: 500,
        reputation: 75
      },
      attendees: [],
      attendeeCount: 0,
      status: 'scheduled',
      isPublic: true,
      createdAt: Date.now()
    }

    set(state => ({
      events: {
        ...state.events,
        [eventId]: seminar
      }
    }))

    return {
      success: true,
      eventId: eventId,
      name: seminar.name,
      topic: seminar.topic,
      message: `Seminar "${seminar.name}" created!`
    }
  },

  // ===== SPORTS COMPETITION =====
  createSportsEvent: (sportsData) => {
    const eventId = `sports_${Date.now()}`

    const competition = {
      id: eventId,
      name: sportsData.name || 'Sports Competition',
      type: 'sports',
      category: 'entertainment',
      description: sportsData.description || 'Compete and showcase your athletic skills',
      location: sportsData.location || 'Vision Storms Arena',
      date: sportsData.date,
      time: sportsData.time,
      duration: 180,
      capacity: 200,
      organizer: 'Sports Department',
      sport: sportsData.sport || 'Basketball',
      divisions: sportsData.divisions || ['Casual', 'Competitive'],
      activities: [
        'Games and matches',
        'Awards ceremony',
        'Fan activities',
        'Food stands'
      ],
      rewards: {
        experience: 150,
        credits: 1000,
        reputation: 100
      },
      attendees: [],
      attendeeCount: 0,
      status: 'scheduled',
      isPublic: true,
      createdAt: Date.now()
    }

    set(state => ({
      events: {
        ...state.events,
        [eventId]: competition
      }
    }))

    return {
      success: true,
      eventId: eventId,
      name: competition.name,
      sport: competition.sport,
      message: `Sports competition "${competition.name}" created!`
    }
  },

  // ===== GET UPCOMING EVENTS =====
  getUpcomingEvents: (days = 30) => {
    const now = Date.now()
    const futureDate = now + days * 24 * 60 * 60 * 1000

    return Object.values(get().events)
      .filter(e => e.date >= now && e.date <= futureDate && e.status !== 'cancelled')
      .sort((a, b) => a.date - b.date)
  },

  // ===== GET EVENT DETAILS =====
  getEventDetails: (eventId) => {
    return get().events[eventId] || null
  },

  // ===== GET PLAYER EVENTS =====
  getPlayerEvents: (playerId) => {
    const eventIds = get().playerAttendance[playerId] || []
    return eventIds.map(id => get().events[id]).filter(e => e)
  }
}))

export function getEventCount() {
  return Object.keys(useCommunityEventSystem.getState().events).length
}

export function getAllEvents() {
  return useCommunityEventSystem.getState().events
}
