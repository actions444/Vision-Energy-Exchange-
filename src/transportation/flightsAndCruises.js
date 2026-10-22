/**
 * VISION STORMS WORLD - Flights & Cruises System
 *
 * Transportation beyond land:
 * - Commercial flights (Vision Airways)
 * - Cruise ships (Vision Cruises)
 * - Multiple decks with activities
 * - Real bookings & travel experiences
 */

import { create } from 'zustand'

export const useFlightsAndCruisesSystem = create((set, get) => ({
  // ===== VISION AIRWAYS =====
  airlines: {
    vision_airways: {
      id: 'airline_vision',
      name: 'Vision Airways',
      tagline: 'Elevate Your Journey',
      fleetSize: 25,
      aircraft: [
        {
          id: 'plane_1',
          type: 'Boeing 787 Dreamliner',
          capacity: 330,
          range: '14825 km',
          cruisingSpeed: '913 km/h',
          amenities: [
            'First Class (40 seats)',
            'Business Class (70 seats)',
            'Economy Plus (80 seats)',
            'Economy (140 seats)',
            'In-flight entertainment',
            'WiFi throughout',
            'Premium meals'
          ]
        },
        {
          id: 'plane_2',
          type: 'Airbus A350',
          capacity: 350,
          range: '15000 km',
          cruisingSpeed: '945 km/h',
          amenities: [
            'First Class (48 seats)',
            'Business Class (80 seats)',
            'Premium Economy (48 seats)',
            'Economy (174 seats)',
            'Advanced IFE system',
            'Onboard bar & lounge',
            'Noise reduction technology'
          ]
        }
      ]
    }
  },

  // ===== FLIGHT ROUTES =====
  routes: {
    vision_hub: {
      id: 'airport_hub',
      name: 'Vision Storms International Airport',
      location: { x: 0, y: 100, z: 0 },
      capacity: 50000, // passengers per day
      terminals: 3
    }
  },

  flightRoutes: {
    vst_to_nyc: {
      id: 'route_vst_nyc',
      departureAirport: 'Vision Storms Terminal',
      arrivalAirport: 'New York (JFK)',
      distanceKm: 3500,
      flightDuration: 380, // minutes
      frequency: '3x daily',
      basePrice: 19999, // $199.99
      aircraftAssigned: 'plane_1'
    },
    vst_to_la: {
      id: 'route_vst_la',
      departureAirport: 'Vision Storms Terminal',
      arrivalAirport: 'Los Angeles (LAX)',
      distanceKm: 3800,
      flightDuration: 420,
      frequency: '2x daily',
      basePrice: 17999, // $179.99
      aircraftAssigned: 'plane_2'
    },
    vst_to_miami: {
      id: 'route_vst_miami',
      departureAirport: 'Vision Storms Terminal',
      arrivalAirport: 'Miami (MIA)',
      distanceKm: 2000,
      flightDuration: 240,
      frequency: '4x daily',
      basePrice: 12999, // $129.99
      aircraftAssigned: 'plane_1'
    },
    vst_to_caribbean: {
      id: 'route_vst_caribbean',
      departureAirport: 'Vision Storms Terminal',
      arrivalAirport: 'Caribbean Resort Area',
      distanceKm: 2500,
      flightDuration: 300,
      frequency: '2x daily',
      basePrice: 14999, // $149.99
      aircraftAssigned: 'plane_2'
    }
  },

  // ===== FLIGHT BOOKINGS =====
  bookFlight: (playerId, routeId, seatClass = 'economy', passengerCount = 1) => {
    const route = get().flightRoutes[routeId]
    if (!route) return { success: false, error: 'Route not found' }

    const seatPrices = {
      'economy': route.basePrice,
      'premium_economy': Math.floor(route.basePrice * 1.5),
      'business': Math.floor(route.basePrice * 3),
      'first': Math.floor(route.basePrice * 5)
    }

    const pricePerPassenger = seatPrices[seatClass] || route.basePrice
    const totalPrice = pricePerPassenger * passengerCount
    const bookingId = `flight_${Date.now()}`

    const booking = {
      id: bookingId,
      playerId: playerId,
      routeId: routeId,
      departure: route.departureAirport,
      arrival: route.arrivalAirport,
      seatClass: seatClass,
      passengerCount: passengerCount,
      totalPrice: totalPrice,
      departureTime: generateDepartureTime(),
      seatNumbers: generateSeatNumbers(seatClass, passengerCount),
      status: 'confirmed',
      bookingDate: Date.now(),
      checkInOpen: true
    }

    set(state => ({
      // Track booking (implementation varies)
    }))

    return {
      success: true,
      bookingId: bookingId,
      route: `${route.departureAirport} → ${route.arrivalAirport}`,
      flightDuration: `${Math.floor(route.flightDuration / 60)}h ${route.flightDuration % 60}m`,
      seatClass: seatClass,
      passengers: passengerCount,
      totalPrice: totalPrice,
      seats: booking.seatNumbers,
      message: 'Booking confirmed! Check-in opens 24 hours before departure.',
      experience: `Enjoy your ${route.flightDuration / 60}-hour flight with Vision Airways`
    }
  },

  // ===== VISION CRUISES =====
  cruiseLine: {
    vision_cruises: {
      id: 'cruise_vision',
      name: 'Vision Cruises',
      tagline: 'Voyage Into Tomorrow',
      fleet: [
        {
          id: 'ship_1',
          name: 'Vision Horizon',
          capacity: 4500,
          decks: 18,
          gross_tonnage: 200000,
          length_meters: 362,
          maxSpeed_knots: 22,
          amenities: [
            'Theater (2000 seats)',
            'Multiple restaurants',
            'Swimming pools (4)',
            'Nightclubs',
            'Casinos',
            'Spa & wellness',
            'Fitness center',
            'Educational lectures',
            'Kids programs',
            'Entertainment shows nightly'
          ]
        },
        {
          id: 'ship_2',
          name: 'Vision Dreams',
          capacity: 5000,
          decks: 20,
          gross_tonnage: 220000,
          length_meters: 380,
          maxSpeed_knots: 23,
          amenities: [
            'Theater (2500 seats)',
            'Multiple fine dining restaurants',
            'Swimming pools (5) + lazy river',
            'Multiple nightclubs',
            'High-end casino',
            'Full-service spa',
            'Fitness center',
            'Broadway-style shows',
            'Exclusive lounges',
            'Kids entertainment'
          ]
        }
      ]
    }
  },

  // ===== CRUISE ITINERARIES =====
  cruiseItineraries: {
    caribbean_7day: {
      id: 'cruise_caribbean',
      name: '7-Day Caribbean Escape',
      ship: 'Vision Horizon',
      duration: 7, // days
      ports: [
        { name: 'Vision Storms Port', days: 2, activities: 'Embark, last day' },
        { name: 'Miami, Florida', days: 1, activities: 'Beach, city exploration' },
        { name: 'Cayman Islands', days: 1, activities: 'Diving, water sports' },
        { name: 'Jamaica', days: 1, activities: 'Island exploration, local culture' },
        { name: 'Haiti', days: 1, activities: 'Historical tours, local experiences' },
        { name: 'Turks & Caicos', days: 1, activities: 'Pristine beaches, snorkeling' }
      ],
      basePricePerPerson: {
        'interior_cabin': 89999, // $899.99
        'oceanview_cabin': 124999, // $1,249.99
        'balcony_cabin': 179999, // $1,799.99
        'suite': 299999 // $2,999.99
      },
      onboardActivities: [
        'Educational seminars',
        'Entertainment shows',
        'Sports & activities',
        'Spa treatments',
        'Dining experiences',
        'Casino',
        'Night clubs',
        'Youth programs'
      ]
    },
    alaska_10day: {
      id: 'cruise_alaska',
      name: '10-Day Alaska Voyage',
      ship: 'Vision Dreams',
      duration: 10,
      ports: [
        { name: 'Vision Storms Port', days: 2 },
        { name: 'Juneau, Alaska', days: 1, activities: 'Glacier tours, wildlife' },
        { name: 'Ketchikan, Alaska', days: 1, activities: 'Native culture, hiking' },
        { name: 'Prince Rupert, Canada', days: 1, activities: 'Mountain views, nature' },
        { name: 'Inside Passage', days: 5, activities: 'Scenic cruising, wildlife watching' }
      ],
      basePricePerPerson: {
        'interior_cabin': 129999,
        'oceanview_cabin': 174999,
        'balcony_cabin': 249999,
        'suite': 449999
      },
      specialFeatures: [
        'Expert naturalists onboard',
        'Whale watching',
        'Glacier tours',
        'Northern lights education',
        'Documentary screenings'
      ]
    }
  },

  // ===== BOOK CRUISE =====
  bookCruise: (playerId, itineraryId, cabinType = 'balcony_cabin', cabinCount = 1) => {
    const itinerary = get().cruiseItineraries[itineraryId]
    if (!itinerary) return { success: false, error: 'Cruise not found' }

    const pricePerCabin = itinerary.basePricePerPerson[cabinType]
    const totalPrice = pricePerCabin * cabinCount
    const bookingId = `cruise_${Date.now()}`

    return {
      success: true,
      bookingId: bookingId,
      cruiseName: itinerary.name,
      duration: `${itinerary.duration} days`,
      ship: itinerary.ship,
      cabinType: cabinType,
      cabinCount: cabinCount,
      totalPrice: totalPrice,
      ports: itinerary.ports.map(p => p.name),
      activities: itinerary.onboardActivities,
      message: `Your ${itinerary.name} is booked! Embark on an unforgettable voyage.`,
      specialFeatures: itinerary.specialFeatures || []
    }
  },

  // ===== ONBOARD EXPERIENCES =====
  onboardExperiences: {
    dining: {
      mainDiningRoom: {
        name: 'Main Dining Room',
        capacity: 1500,
        courses: 'Multi-course meals daily',
        dress: 'Formal, Smart Casual'
      },
      buffet: {
        name: 'Lido Buffet',
        capacity: 2000,
        cuisine: 'International',
        openHours: '6am-11pm'
      },
      specialtyRestaurants: [
        'French bistro',
        'Italian trattoria',
        'Asian fusion',
        'Brazilian churrascaria',
        'Sushi bar'
      ]
    },
    entertainment: {
      theater: 'Broadway-style shows nightly',
      liveMusic: 'Jazz, pop, classical throughout ship',
      nightclubs: '3-4 clubs with different themes',
      comedy: 'Comedy shows and open mic nights',
      educational: 'Lectures on destinations and culture'
    },
    activities: {
      fitness: 'Classes, gym, yoga, pilates',
      spa: 'Full service spa treatments',
      waterSports: 'When at sea ports',
      kids: 'Age-appropriate programs',
      sports: 'Basketball, volleyball, mini golf'
    }
  }
}))

// ===== HELPER FUNCTIONS =====

function generateDepartureTime() {
  // Random departure time between 6am and 6pm
  const hour = Math.floor(Math.random() * 13) + 6
  return `${hour}:00`
}

function generateSeatNumbers(seatClass, count) {
  const seatRanges = {
    'economy': '15A-40Z',
    'premium_economy': '10A-14Z',
    'business': '2A-9Z',
    'first': '1A-1F'
  }

  const seats = []
  for (let i = 0; i < count; i++) {
    seats.push(`${seatRanges[seatClass]}_${i + 1}`)
  }
  return seats
}

export function getAirlines() {
  return useFlightsAndCruisesSystem.getState().airlines
}

export function getFlightRoutes() {
  return useFlightsAndCruisesSystem.getState().flightRoutes
}

export function getCruiseItineraries() {
  return useFlightsAndCruisesSystem.getState().cruiseItineraries
}
