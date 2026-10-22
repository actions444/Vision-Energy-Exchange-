import { create } from 'zustand'

export const useVehicleCombat = create((set, get) => ({
  // Vehicle combat state
  vehiclesInCombat: {}, // vehicleId -> { health, armor, weapon, ammo }
  activeVehicleWeapons: {},

  // Weapon mounts
  VEHICLE_WEAPONS: {
    car: 'pistol', // Light vehicles - pistol
    truck: 'rifle', // Heavy vehicles - rifle
    tank: 'cannon', // Tank - explosive cannon
    motorcycle: 'smg' // Fast - submachine gun
  },

  // ===== VEHICLE DAMAGE SYSTEM =====
  initializeVehicle: (vehicleId, vehicleType) => {
    const healthMap = {
      motorcycle: 60,
      car: 100,
      truck: 150,
      tank: 300,
      bike: 50
    }

    set(state => ({
      vehiclesInCombat: {
        ...state.vehiclesInCombat,
        [vehicleId]: {
          id: vehicleId,
          type: vehicleType,
          health: healthMap[vehicleType] || 100,
          maxHealth: healthMap[vehicleType] || 100,
          armor: 0,
          maxArmor: vehicleType === 'tank' ? 100 : 50,
          weapon: get().VEHICLE_WEAPONS[vehicleType] || 'pistol',
          ammo: 200,
          maxAmmo: 200,
          isDestroyed: false,
          onFire: false,
          smokeLevel: 0,
          wheels: 4,
          damageParts: {
            engine: 0,
            transmission: 0,
            chassis: 0,
            tires: [0, 0, 0, 0]
          }
        }
      }
    }))
  },

  damageVehicle: (vehicleId, amount, damageType = 'generic') => {
    set(state => {
      const vehicle = state.vehiclesInCombat[vehicleId]
      if (!vehicle) return state

      let damage = amount
      let newArmor = vehicle.armor
      let newHealth = vehicle.health
      let newSmokeLevel = vehicle.smokeLevel
      let wheels = vehicle.wheels

      // Armor absorption
      if (newArmor > 0) {
        const armorAbsorb = Math.min(damage * 0.4, newArmor)
        damage -= armorAbsorb
        newArmor -= armorAbsorb
      }

      // Engine damage increases smoke
      if (damageType === 'engine') {
        newSmokeLevel = Math.min(newSmokeLevel + 0.3, 1)
      }

      // Tire damage reduces handling
      if (damageType === 'tire') {
        const tire = Math.floor(Math.random() * 4)
        wheels = Math.max(0, wheels - 1)
      }

      newHealth = Math.max(newHealth - damage, 0)

      // Vehicle destroyed at 0 health
      const isDestroyed = newHealth <= 0
      const onFire = newHealth < (vehicle.maxHealth * 0.25)

      return {
        vehiclesInCombat: {
          ...state.vehiclesInCombat,
          [vehicleId]: {
            ...vehicle,
            health: newHealth,
            armor: newArmor,
            isDestroyed,
            onFire,
            smokeLevel: newSmokeLevel,
            wheels
          }
        }
      }
    })
  },

  repairVehicle: (vehicleId, amount) => {
    set(state => {
      const vehicle = state.vehiclesInCombat[vehicleId]
      if (!vehicle) return state

      return {
        vehiclesInCombat: {
          ...state.vehiclesInCombat,
          [vehicleId]: {
            ...vehicle,
            health: Math.min(vehicle.health + amount, vehicle.maxHealth),
            smokeLevel: Math.max(vehicle.smokeLevel - 0.2, 0),
            onFire: false
          }
        }
      }
    })
  },

  armorVehicle: (vehicleId, amount) => {
    set(state => {
      const vehicle = state.vehiclesInCombat[vehicleId]
      if (!vehicle) return state

      return {
        vehiclesInCombat: {
          ...state.vehiclesInCombat,
          [vehicleId]: {
            ...vehicle,
            armor: Math.min(vehicle.armor + amount, vehicle.maxArmor)
          }
        }
      }
    })
  },

  // ===== VEHICLE WEAPONS =====
  fireVehicleWeapon: (vehicleId, targetPos) => {
    const vehicle = get().vehiclesInCombat[vehicleId]
    if (!vehicle || vehicle.ammo <= 0 || vehicle.isDestroyed) {
      return { hit: false, damage: 0 }
    }

    // Reduce ammo
    set(state => ({
      vehiclesInCombat: {
        ...state.vehiclesInCombat,
        [vehicleId]: {
          ...vehicle,
          ammo: Math.max(vehicle.ammo - 1, 0)
        }
      }
    }))

    // Calculate hit based on vehicle type and condition
    const baseAccuracy = {
      pistol: 0.7,
      smg: 0.6,
      rifle: 0.85,
      cannon: 0.9
    }

    let accuracy = baseAccuracy[vehicle.weapon] || 0.7

    // Reduce accuracy if vehicle is damaged
    accuracy *= (vehicle.health / vehicle.maxHealth)

    const hit = Math.random() < accuracy
    const damage = hit ? 40 : 0

    return {
      hit,
      damage,
      weapon: vehicle.weapon,
      ammo: vehicle.ammo - 1
    }
  },

  reloadVehicleWeapon: (vehicleId, ammoAmount) => {
    set(state => {
      const vehicle = state.vehiclesInCombat[vehicleId]
      if (!vehicle) return state

      return {
        vehiclesInCombat: {
          ...state.vehiclesInCombat,
          [vehicleId]: {
            ...vehicle,
            ammo: Math.min(vehicle.ammo + ammoAmount, vehicle.maxAmmo)
          }
        }
      }
    })
  },

  // ===== VEHICLE HANDLING =====
  getHandlingPenalty: (vehicleId) => {
    const vehicle = get().vehiclesInCombat[vehicleId]
    if (!vehicle) return 1

    // Damage reduces handling
    const healthPenalty = vehicle.health / vehicle.maxHealth
    const tirePenalty = vehicle.wheels / 4

    return (healthPenalty * 0.7) + (tirePenalty * 0.3)
  },

  getTopSpeed: (vehicleId) => {
    const vehicle = get().vehiclesInCombat[vehicleId]
    if (!vehicle) return 100

    const speedMap = {
      motorcycle: 180,
      car: 150,
      truck: 100,
      tank: 80,
      bike: 160
    }

    let topSpeed = speedMap[vehicle.type] || 150

    // Damage reduces top speed
    topSpeed *= get().getHandlingPenalty(vehicleId)

    return topSpeed
  },

  // ===== VEHICLE DESTRUCTION =====
  destroyVehicle: (vehicleId) => {
    set(state => ({
      vehiclesInCombat: {
        ...state.vehiclesInCombat,
        [vehicleId]: {
          ...state.vehiclesInCombat[vehicleId],
          isDestroyed: true,
          health: 0,
          onFire: true,
          smokeLevel: 1
        }
      }
    }))
  },

  explodeVehicle: (vehicleId, explosionRadius = 50, explosionDamage = 100) => {
    get().destroyVehicle(vehicleId)

    // Damage all nearby vehicles
    return {
      explosionRadius,
      explosionDamage,
      affectedVehicles: Object.keys(get().vehiclesInCombat)
        .filter(id => id !== vehicleId)
    }
  },

  // ===== VEHICLE STATS =====
  getVehicleHealth: (vehicleId) => {
    const vehicle = get().vehiclesInCombat[vehicleId]
    return vehicle ? (vehicle.health / vehicle.maxHealth) * 100 : 0
  },

  getVehicleArmor: (vehicleId) => {
    const vehicle = get().vehiclesInCombat[vehicleId]
    return vehicle ? (vehicle.armor / vehicle.maxArmor) * 100 : 0
  },

  isVehicleDestroyed: (vehicleId) => {
    const vehicle = get().vehiclesInCombat[vehicleId]
    return vehicle ? vehicle.isDestroyed : true
  },

  getVehicleInfo: (vehicleId) => {
    return get().vehiclesInCombat[vehicleId]
  },

  getVehicleStats: (vehicleId) => {
    const vehicle = get().vehiclesInCombat[vehicleId]
    if (!vehicle) return null

    return {
      health: Math.round(get().getVehicleHealth(vehicleId)),
      armor: Math.round(get().getVehicleArmor(vehicleId)),
      ammo: vehicle.ammo,
      maxAmmo: vehicle.maxAmmo,
      weapon: vehicle.weapon,
      topSpeed: Math.round(get().getTopSpeed(vehicleId)),
      handling: Math.round(get().getHandlingPenalty(vehicleId) * 100),
      isOnFire: vehicle.onFire,
      wheels: vehicle.wheels,
      type: vehicle.type
    }
  },

  removeVehicle: (vehicleId) => {
    set(state => {
      const newVehicles = { ...state.vehiclesInCombat }
      delete newVehicles[vehicleId]
      return { vehiclesInCombat: newVehicles }
    })
  },

  getAllVehicles: () => {
    return Object.values(get().vehiclesInCombat)
  },

  getIntactVehicles: () => {
    return Object.values(get().vehiclesInCombat).filter(v => !v.isDestroyed)
  }
}))
