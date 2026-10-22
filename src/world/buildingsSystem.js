/**
 * VISION STORMS WORLD - Buildings & Downtown Infrastructure System
 *
 * Physical spaces where gameplay happens:
 * - Banks (multiple, different architectures)
 * - IRS/Tax office
 * - Apartments (10+ stories, multiple units)
 * - Restaurants
 * - Retail shops
 * - Offices
 * - Educational buildings
 * - Government buildings
 *
 * All buildings have:
 * - Walkable interiors
 * - NPCs with jobs
 * - Interactive objects
 * - Educational content
 * - Economic integration
 */

import { create } from 'zustand'

export const useBuildingsSystem = create((set, get) => ({
  // ===== DOWNTOWN DISTRICT =====
  downtown: {
    location: { x: 100, y: 0, z: 100 },
    gridSize: '2km x 2km',
    buildings: {}
  },

  // ===== BANKS =====
  banks: {
    bank_of_vision_1: {
      id: 'bank_1',
      name: 'Bank of Vision - Downtown Branch',
      location: { x: 150, y: 0, z: 150 },
      type: 'commercial_bank',
      exteriorStyle: 'modern_glass',
      stories: 12,
      capacity: 500,
      hours: '9am-5pm weekdays, 9am-1pm Saturday',
      features: ['teller_area', 'loan_office', 'vault', 'atm', 'safe_deposit_boxes'],
      interiors: {
        lobby: {
          id: 'lobby_bank_1',
          name: 'Main Lobby',
          capacity: 100,
          features: ['atms', 'teller_line', 'seating', 'information_desk']
        },
        teller_area: {
          id: 'tellers_bank_1',
          name: 'Teller Services',
          capacity: 50,
          teller_windows: 8,
          features: ['deposits', 'withdrawals', 'account_services']
        },
        loan_office: {
          id: 'loans_bank_1',
          name: 'Loan Office',
          capacity: 20,
          features: ['loan_applications', 'mortgage_services', 'financial_planning']
        },
        vault: {
          id: 'vault_bank_1',
          name: 'Vault Area',
          capacity: 10,
          features: ['safe_deposit_boxes', 'secured_storage'],
          security_level: 'high'
        }
      },
      npcs: ['npc_teller_1', 'npc_teller_2', 'npc_loan_officer_1'],
      services: [
        'Account opening',
        'Deposits/withdrawals',
        'Loan applications',
        'Mortgage services',
        'Safe deposit boxes',
        'Financial planning'
      ]
    },

    bank_of_vision_2: {
      id: 'bank_2',
      name: 'Bank of Vision - Westside Branch',
      location: { x: 120, y: 0, z: 180 },
      type: 'commercial_bank',
      exteriorStyle: 'classical_stone',
      stories: 8,
      capacity: 350,
      npcs: ['npc_teller_3', 'npc_teller_4']
    },

    bank_of_vision_3: {
      id: 'bank_3',
      name: 'Bank of Vision - Eastside Branch',
      location: { x: 180, y: 0, z: 120 },
      type: 'commercial_bank',
      exteriorStyle: 'modern_brick',
      stories: 10,
      capacity: 450,
      npcs: ['npc_teller_5', 'npc_teller_6']
    }
  },

  // ===== IRS / TAX OFFICE =====
  irs_office: {
    id: 'irs_main',
    name: 'Vision Storms IRS Federal Building',
    location: { x: 160, y: 0, z: 160 },
    type: 'government',
    exteriorStyle: 'government_modern',
    stories: 15,
    capacity: 1000,
    purpose: 'Tax education, form filing, financial documentation',
    interiors: {
      lobby: {
        id: 'irs_lobby',
        name: 'Main Lobby',
        capacity: 200,
        features: ['information_kiosk', 'seating', 'directory']
      },
      tax_services: {
        id: 'irs_tax',
        name: 'Tax Services Department',
        capacity: 150,
        features: [
          'tax_form_assistance',
          'filing_help',
          '1040_education',
          '1099_forms',
          'deduction_planning'
        ]
      },
      documents_floor: {
        id: 'irs_docs',
        name: 'Financial Documents Display Floor',
        capacity: 300,
        features: [
          'trust_documents',
          'ein_information',
          'business_forms',
          'whistleblower_forms',
          'educational_exhibits'
        ]
      },
      forms_library: {
        id: 'irs_forms',
        name: 'Forms & Publication Library',
        capacity: 100,
        features: [
          'all_irs_forms_1099_1040',
          'trust_establishment_docs',
          'EIN_application',
          'business_structure_info'
        ]
      },
      training_center: {
        id: 'irs_training',
        name: 'Financial Literacy Training Center',
        capacity: 200,
        features: [
          'classroom_setup',
          'video_library',
          'interactive_exhibits',
          'expert_seminars'
        ]
      }
    },
    npcs: [
      'npc_irs_agent_1',
      'npc_irs_agent_2',
      'npc_tax_educator_1',
      'npc_financial_advisor_1'
    ],
    educational_focus: [
      'Understanding 1099 forms',
      'EIN and business setup',
      'Trust documentation',
      'Whistleblower procedures',
      'Tax deductions and strategies'
    ]
  },

  // ===== APARTMENTS =====
  apartment_complexes: {
    vision_tower_residence: {
      id: 'apt_complex_1',
      name: 'Vision Tower Residences',
      location: { x: 130, y: 0, z: 170 },
      type: 'residential_highrise',
      stories: 15,
      total_units: 180,
      rent_prices: {
        studio: 90000, // $900/month
        one_bedroom: 120000, // $1,200
        two_bedroom: 180000 // $1,800
      },
      amenities: [
        'Lobby with concierge',
        'Fitness center',
        'Rooftop garden',
        'Laundry facilities',
        'Security system',
        'Parking garage'
      ],
      units: {
        floor_1: {
          id: 'floor_1',
          units: [
            { unit_num: '101', type: 'studio', status: 'available' },
            { unit_num: '102', type: 'one_bedroom', status: 'occupied' },
            { unit_num: '103', type: 'one_bedroom', status: 'available' }
          ]
        }
        // Additional floors follow same pattern
      }
    }
  },

  // ===== RESTAURANTS =====
  restaurants: {
    upscale_dining: {
      id: 'restaurant_1',
      name: 'Trinity\'s Table (Fine Dining)',
      location: { x: 140, y: 0, z: 140 },
      type: 'fine_dining',
      capacity: 150,
      cuisine: 'International fusion',
      priceRange: '$25-60 per entree',
      features: ['fine_dining', 'wine_list', 'private_rooms'],
      hours: '11am-10pm daily'
    },
    casual_dining: {
      id: 'restaurant_2',
      name: 'Vision Cafe',
      location: { x: 145, y: 0, z: 145 },
      type: 'casual_restaurant',
      capacity: 80,
      cuisine: 'American casual',
      priceRange: '$10-20 per entree',
      features: ['counter_service', 'seating', 'takeout'],
      hours: '7am-9pm daily'
    },
    fast_casual: {
      id: 'restaurant_3',
      name: 'Quick Bites',
      location: { x: 142, y: 0, z: 142 },
      type: 'fast_casual',
      capacity: 50,
      cuisine: 'Healthy bowls & sandwiches',
      priceRange: '$8-15 per item',
      hours: '6am-8pm daily'
    }
  },

  // ===== RETAIL SHOPS =====
  retail_shops: {
    furniture_store: {
      id: 'shop_furniture',
      name: 'Vision Home Furniture',
      location: { x: 135, y: 0, z: 135 },
      type: 'furniture_retail',
      capacity: 100,
      features: ['showroom', 'custom_orders', 'delivery_service'],
      products: [
        'Living room sets',
        'Bedroom furniture',
        'Dining sets',
        'Office desks',
        'Decorative items'
      ]
    },
    grocery_market: {
      id: 'shop_grocery',
      name: 'Vision Market',
      location: { x: 125, y: 0, z: 125 },
      type: 'grocery_store',
      capacity: 200,
      aisles: 12,
      features: ['produce', 'meats', 'dairy', 'pantry', 'checkout'],
      hours: '8am-10pm daily'
    },
    clothing_boutique: {
      id: 'shop_clothing',
      name: 'Trinity Threads',
      location: { x: 155, y: 0, z: 155 },
      type: 'clothing_retail',
      capacity: 60,
      features: ['mens', 'womens', 'kids', 'shoes', 'accessories']
    }
  },

  // ===== EDUCATIONAL BUILDINGS =====
  education_buildings: {
    trinity_academy: {
      id: 'school_academy',
      name: 'Trinity Reign Academy',
      location: { x: 110, y: 0, z: 110 },
      type: 'educational_institution',
      stories: 5,
      capacity: 500,
      features: [
        'Classrooms',
        'Computer labs',
        'Library',
        'Auditorium',
        'Athletic facilities'
      ],
      courses: [
        'Financial literacy',
        'Business fundamentals',
        'Creative entrepreneurship',
        'Personal development',
        'Spiritual education'
      ],
      classrooms: 20,
      npcs: ['npc_teacher_1', 'npc_teacher_2', 'npc_instructor_1']
    }
  },

  // ===== GOVERNMENT BUILDINGS =====
  government_buildings: {
    courthouse: {
      id: 'court_main',
      name: 'Vision Storms Courthouse',
      location: { x: 170, y: 0, z: 170 },
      type: 'government',
      stories: 8,
      capacity: 400,
      features: [
        'Courtrooms (3)',
        'Judge chambers',
        'Clerk office',
        'Legal library',
        'Jury room'
      ],
      purpose: 'Traffic court, civil cases, legal education'
    },

    police_station: {
      id: 'police_main',
      name: 'Vision Storms Police Department',
      location: { x: 100, y: 0, z: 100 },
      type: 'government_services',
      stories: 3,
      capacity: 200,
      features: [
        'Dispatch center',
        'Officer bullpen',
        'Holding cells',
        'Evidence room',
        'Training area',
        'Public counter'
      ],
      npcs: ['npc_officer_1', 'npc_dispatcher_1'],
      services: [
        'Report filing',
        'Traffic citations',
        'Rights education',
        'Police training'
      ]
    },

    fire_station: {
      id: 'fire_main',
      name: 'Vision Storms Fire Department',
      location: { x: 95, y: 0, z: 105 },
      type: 'government_services',
      capacity: 150,
      features: [
        'Bay area (trucks)',
        'Sleeping quarters',
        'Training facility',
        'Equipment storage',
        'Kitchen/dining'
      ],
      npcs: ['npc_firefighter_1', 'npc_fire_chief_1']
    }
  },

  // ===== PLAYER HOMES SYSTEM =====
  playerHomes: {}, // playerId -> home data

  // ===== ENTER BUILDING =====
  enterBuilding: (playerId, buildingId) => {
    // Find building
    let building = null
    let buildingType = null

    const allBuildings = {
      ...get().banks,
      ...get().restaurants,
      ...get().retail_shops,
      ...get().education_buildings,
      ...get().government_buildings,
      [get().irs_office.id]: get().irs_office
    }

    building = Object.values(allBuildings).find(b => b.id === buildingId)

    if (!building) return { success: false, error: 'Building not found' }

    return {
      success: true,
      buildingId: buildingId,
      buildingName: building.name,
      type: building.type,
      interiors: building.interiors || {},
      npcs: building.npcs || [],
      features: building.features || [],
      capacity: building.capacity,
      message: `You've entered ${building.name}`
    }
  },

  // ===== BUY/RENT HOME =====
  purchaseHome: (playerId, apartmentId, unitType, creditAmount) => {
    const complex = get().apartment_complexes[apartmentId]
    if (!complex) return { success: false }

    const price = complex.rent_prices[unitType]
    if (creditAmount < price) {
      return { success: false, error: 'Insufficient funds' }
    }

    const homeId = `home_${playerId}_${Date.now()}`
    const home = {
      id: homeId,
      playerId: playerId,
      complex: complex.name,
      unitType: unitType,
      monthlyRent: price,
      furnishings: [],
      customizations: [],
      purchasedAt: Date.now()
    }

    set(state => ({
      playerHomes: {
        ...state.playerHomes,
        [playerId]: home
      }
    }))

    return {
      success: true,
      homeId: homeId,
      complex: complex.name,
      unitType: unitType,
      monthlyRent: price,
      message: `Congratulations! You now own a ${unitType} in ${complex.name}`
    }
  },

  // ===== CUSTOMIZE HOME =====
  customizeHome: (playerId, furnishings) => {
    const home = get().playerHomes[playerId]
    if (!home) return { success: false }

    const updatedHome = {
      ...home,
      furnishings: furnishings,
      lastCustomized: Date.now()
    }

    set(state => ({
      playerHomes: {
        ...state.playerHomes,
        [playerId]: updatedHome
      }
    }))

    return {
      success: true,
      homeId: home.id,
      furnishings: furnishings,
      message: 'Your home has been customized!'
    }
  }
}))

// ===== HELPER FUNCTIONS =====

export function getDowntownBuildings() {
  const system = useBuildingsSystem.getState()
  return {
    banks: system.banks,
    irs: system.irs_office,
    apartments: system.apartment_complexes,
    restaurants: system.restaurants,
    retail: system.retail_shops,
    education: system.education_buildings,
    government: system.government_buildings
  }
}

export function getPlayerHome(playerId) {
  return useBuildingsSystem.getState().playerHomes[playerId] || null
}

export function getAvailableApartments() {
  const complexes = useBuildingsSystem.getState().apartment_complexes
  return Object.values(complexes).map(c => ({
    id: c.id,
    name: c.name,
    units: c.total_units,
    prices: c.rent_prices
  }))
}
