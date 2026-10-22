// Building and business system for GTA-style city

export const BUILDING_TYPES = {
  grocery: 'Grocery Store',
  restaurant: 'Restaurant',
  gas_station: 'Gas Station',
  bank: 'Bank',
  hospital: 'Hospital',
  police_station: 'Police Station',
  courthouse: 'Courthouse',
  apartment: 'Apartment Complex',
  office: 'Office Building',
  shop: 'Retail Shop',
  bar: 'Bar/Club',
  gym: 'Gym',
  school: 'School',
  parking: 'Parking Garage'
}

export const BUILDINGS = {
  // ===== GROCERY STORES =====
  main_grocery: {
    id: 'main_grocery',
    name: 'Main Street Market',
    type: 'grocery',
    position: { x: 50, y: 0, z: 10 },
    radius: 25,
    emoji: '🛒',
    description: 'Full grocery store - food, drinks, supplies',
    openHours: { open: 6, close: 23 },
    inventory: {
      food: ['milk', 'bread', 'eggs', 'vegetables', 'meat', 'snacks'],
      drinks: ['water', 'juice', 'coffee', 'soda'],
      supplies: ['medicine', 'hygiene', 'cleaning']
    },
    npcs: 5,
    interiorSize: { width: 30, depth: 40, height: 8 },
    entrances: 2,
    cameras: true,
    till: true
  },

  // ===== RESTAURANTS =====
  burger_place: {
    id: 'burger_place',
    name: "Joe's Burgers",
    type: 'restaurant',
    position: { x: -20, y: 0, z: 40 },
    radius: 20,
    emoji: '🍔',
    description: 'Fast food restaurant - quick meals',
    openHours: { open: 7, close: 22 },
    menu: [
      { item: 'Burger', price: 8, time: 120 },
      { item: 'Fries', price: 3, time: 60 },
      { item: 'Drink', price: 2, time: 30 },
      { item: 'Combo', price: 12, time: 150 }
    ],
    seating: 20,
    npcs: 4,
    interiorSize: { width: 25, depth: 30, height: 8 },
    cameras: true,
    till: true
  },

  fancy_restaurant: {
    id: 'fancy_restaurant',
    name: 'The Platinum',
    type: 'restaurant',
    position: { x: 80, y: 0, z: 60 },
    radius: 25,
    emoji: '🍽️',
    description: 'Fine dining - expensive meals',
    openHours: { open: 11, close: 23 },
    menu: [
      { item: 'Steak', price: 45, time: 300 },
      { item: 'Fish', price: 40, time: 280 },
      { item: 'Pasta', price: 35, time: 240 },
      { item: 'Wine', price: 60, time: 0 }
    ],
    seating: 40,
    npcs: 8,
    interiorSize: { width: 40, depth: 50, height: 9 },
    cameras: true,
    till: true,
    valet: true
  },

  // ===== GAS STATIONS =====
  gas_station_main: {
    id: 'gas_station_main',
    name: 'Quick Gas',
    type: 'gas_station',
    position: { x: 120, y: 0, z: -80 },
    radius: 30,
    emoji: '⛽',
    description: 'Gas station - fuel and snacks',
    openHours: { open: 0, close: 24 }, // 24/7
    pumps: 6,
    npcs: 2,
    interiorSize: { width: 20, depth: 20, height: 6 },
    cameras: true,
    till: true
  },

  // ===== BANK =====
  central_bank: {
    id: 'central_bank',
    name: 'Central Bank',
    type: 'bank',
    position: { x: 0, y: 0, z: 0 },
    radius: 30,
    emoji: '🏦',
    description: 'Bank - deposit, withdraw, loans',
    openHours: { open: 8, close: 17 },
    vault: true,
    security: 'high',
    cameras: 12,
    guards: 4,
    npcs: 8,
    interiorSize: { width: 40, depth: 50, height: 10 },
    tellers: 3,
    officeRooms: 5
  },

  // ===== HOSPITAL =====
  general_hospital: {
    id: 'general_hospital',
    name: 'General Hospital',
    type: 'hospital',
    position: { x: -100, y: 0, z: 100 },
    radius: 40,
    emoji: '🏥',
    description: 'Hospital - medical care, emergencies',
    openHours: { open: 0, close: 24 }, // 24/7
    beds: 50,
    emergencyRoom: true,
    surgeryRooms: 3,
    pharmacy: true,
    npcs: 20,
    interiorSize: { width: 60, depth: 70, height: 12 },
    cameras: true,
    guards: 6,
    doctors: 8
  },

  // ===== POLICE STATION =====
  police_station: {
    id: 'police_station',
    name: 'Central Police Station',
    type: 'police_station',
    position: { x: 200, y: 0, z: 0 },
    radius: 35,
    emoji: '🚔',
    description: 'Police station - arrests, bail, booking',
    openHours: { open: 0, close: 24 }, // 24/7
    cells: 12,
    booking: true,
    interrogation: 4,
    dispatch: true,
    security: 'maximum',
    cameras: 20,
    guards: 15,
    npcs: 30,
    interiorSize: { width: 50, depth: 60, height: 10 }
  },

  // ===== COURTHOUSE =====
  courthouse: {
    id: 'courthouse',
    name: 'District Courthouse',
    type: 'courthouse',
    position: { x: 150, y: 0, z: -100 },
    radius: 35,
    emoji: '⚖️',
    description: 'Courthouse - trials, bail, sentencing',
    openHours: { open: 8, close: 17 },
    courtrooms: 4,
    bailBond: true,
    records: true,
    judges: 4,
    npcs: 25,
    interiorSize: { width: 50, depth: 60, height: 12 },
    cameras: 8,
    security: 'high',
    lawLibrary: true
  },

  // ===== APARTMENTS =====
  apartment_complex: {
    id: 'apartment_complex',
    name: 'Westside Apartments',
    type: 'apartment',
    position: { x: -150, y: 0, z: 50 },
    radius: 40,
    emoji: '🏢',
    description: 'Residential apartments - rent, live',
    openHours: { open: 0, close: 24 },
    units: 40,
    hasGym: true,
    hasPool: true,
    hasParking: true,
    npcs: 30,
    interiorSize: { width: 60, depth: 80, height: 20 },
    maintenanceOffice: true
  },

  // ===== SHOPS =====
  clothing_store: {
    id: 'clothing_store',
    name: 'Style Central',
    type: 'shop',
    position: { x: 30, y: 0, z: 50 },
    radius: 20,
    emoji: '👕',
    description: 'Clothing store - change outfit',
    openHours: { open: 9, close: 20 },
    inventory: ['shirts', 'pants', 'shoes', 'jackets', 'hats'],
    npcs: 3,
    interiorSize: { width: 25, depth: 30, height: 8 },
    cameras: true,
    till: true
  },

  electronics_store: {
    id: 'electronics_store',
    name: 'TechHub',
    type: 'shop',
    position: { x: 70, y: 0, z: 30 },
    radius: 20,
    emoji: '💻',
    description: 'Electronics store - buy gadgets',
    openHours: { open: 10, close: 20 },
    inventory: ['phones', 'laptops', 'tablets', 'cameras'],
    npcs: 4,
    interiorSize: { width: 25, depth: 30, height: 8 },
    cameras: true,
    till: true,
    security: 'medium'
  },

  // ===== GYM =====
  fitness_gym: {
    id: 'fitness_gym',
    name: 'Power Gym',
    type: 'gym',
    position: { x: -80, y: 0, z: -60 },
    radius: 25,
    emoji: '💪',
    description: 'Gym - exercise, train, improve stats',
    openHours: { open: 5, close: 23 },
    equipment: ['weights', 'treadmill', 'boxing', 'yoga'],
    trainers: 3,
    npcs: 15,
    interiorSize: { width: 40, depth: 50, height: 8 },
    showers: true,
    locker_rooms: true
  }
}

// Get building by ID
export function getBuilding(id) {
  return BUILDINGS[id]
}

// Get buildings by type
export function getBuildingsByType(type) {
  return Object.values(BUILDINGS).filter(b => b.type === type)
}

// Get all buildings organized by type
export function getBuildingsCategorized() {
  const result = {}
  Object.keys(BUILDING_TYPES).forEach(type => {
    result[type] = getBuildingsByType(type)
  })
  return result
}

// Get buildings near position
export function getBuildingsNearby(position, maxDistance = 200) {
  return Object.values(BUILDINGS).filter(building => {
    const dx = building.position.x - position.x
    const dz = building.position.z - position.z
    const distance = Math.hypot(dx, dz)
    return distance <= maxDistance
  })
}

// Check if position is inside building
export function isInBuilding(position, building) {
  const dx = Math.abs(building.position.x - position.x)
  const dz = Math.abs(building.position.z - position.z)
  return dx <= building.radius && dz <= building.radius
}

// Get closest building
export function getClosestBuilding(position) {
  let closest = null
  let minDistance = Infinity

  Object.values(BUILDINGS).forEach(building => {
    const dx = building.position.x - position.x
    const dz = building.position.z - position.z
    const distance = Math.hypot(dx, dz)

    if (distance < minDistance) {
      minDistance = distance
      closest = building
    }
  })

  return closest
}
