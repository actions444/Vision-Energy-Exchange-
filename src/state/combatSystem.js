import { create } from 'zustand'
import { getWeapon, WEAPONS } from '../config/weapons'

export const useCombatSystem = create((set, get) => ({
  // Weapon inventory
  weapons: {
    fists: { id: 'fists', ammo: -1, maxAmmo: -1 } // Always have fists
  },
  currentWeaponId: 'fists',

  // Combat state
  health: 100,
  maxHealth: 100,
  armor: 0,
  maxArmor: 100,
  isInCombat: false,
  lastAttackTime: 0,

  // ===== WEAPON MANAGEMENT =====
  pickupWeapon: (weaponId) => {
    const weapon = getWeapon(weaponId)
    if (!weapon) return

    set(state => {
      const newWeapons = { ...state.weapons }
      if (newWeapons[weaponId]) {
        // Already have this weapon, add ammo
        if (weapon.ammo > 0) {
          newWeapons[weaponId].ammo = Math.min(
            newWeapons[weaponId].ammo + weapon.ammo,
            weapon.maxAmmo
          )
        }
      } else {
        // New weapon
        newWeapons[weaponId] = {
          id: weaponId,
          ammo: weapon.ammo,
          maxAmmo: weapon.maxAmmo
        }
      }

      return { weapons: newWeapons }
    })
  },

  dropWeapon: (weaponId) => {
    if (weaponId === 'fists') return // Can't drop fists

    set(state => {
      const newWeapons = { ...state.weapons }
      delete newWeapons[weaponId]

      // Switch to fists if dropping current weapon
      const currentId = state.currentWeaponId === weaponId ? 'fists' : state.currentWeaponId
      return { weapons: newWeapons, currentWeaponId: currentId }
    })
  },

  switchWeapon: (weaponId) => {
    const state = get()
    if (!state.weapons[weaponId]) return
    set({ currentWeaponId: weaponId })
  },

  nextWeapon: () => {
    const state = get()
    const weaponIds = Object.keys(state.weapons)
    const currentIndex = weaponIds.indexOf(state.currentWeaponId)
    const nextIndex = (currentIndex + 1) % weaponIds.length
    set({ currentWeaponId: weaponIds[nextIndex] })
  },

  previousWeapon: () => {
    const state = get()
    const weaponIds = Object.keys(state.weapons)
    const currentIndex = weaponIds.indexOf(state.currentWeaponId)
    const prevIndex = (currentIndex - 1 + weaponIds.length) % weaponIds.length
    set({ currentWeaponId: weaponIds[prevIndex] })
  },

  // ===== AMMO MANAGEMENT =====
  addAmmo: (weaponId, amount) => {
    set(state => {
      const weapon = getWeapon(weaponId)
      if (!weapon || !state.weapons[weaponId]) return state

      const newWeapons = { ...state.weapons }
      newWeapons[weaponId] = {
        ...newWeapons[weaponId],
        ammo: Math.min(
          newWeapons[weaponId].ammo + amount,
          weapon.maxAmmo
        )
      }
      return { weapons: newWeapons }
    })
  },

  useAmmo: (weaponId, amount = 1) => {
    set(state => {
      if (!state.weapons[weaponId]) return state

      const newWeapons = { ...state.weapons }
      newWeapons[weaponId] = {
        ...newWeapons[weaponId],
        ammo: Math.max(newWeapons[weaponId].ammo - amount, 0)
      }
      return { weapons: newWeapons }
    })
  },

  // ===== COMBAT ACTIONS =====
  attack: (targetId, targetPos) => {
    const state = get()
    const now = Date.now()
    const weapon = getWeapon(state.currentWeaponId)

    if (!weapon) return { damage: 0, hit: false }

    // Check fire rate
    if (now - state.lastAttackTime < weapon.fireRate * 1000) {
      return { damage: 0, hit: false, reason: 'fire_rate' }
    }

    // Check ammo (if applicable)
    if (weapon.ammo > 0 && state.weapons[state.currentWeaponId].ammo <= 0) {
      return { damage: 0, hit: false, reason: 'no_ammo' }
    }

    // Use ammo
    if (weapon.ammo > 0) {
      get().useAmmo(state.currentWeaponId, 1)
    }

    // Calculate hit (simple distance-based)
    const distance = Math.hypot(
      targetPos.x - state.position?.x || 0,
      targetPos.y - state.position?.y || 0,
      targetPos.z - state.position?.z || 0
    )

    const hit = distance <= weapon.range

    set({ lastAttackTime: now, isInCombat: true })

    return {
      damage: hit ? weapon.damage : 0,
      hit,
      weaponId: state.currentWeaponId,
      weapon: weapon.name
    }
  },

  // ===== HEALTH & ARMOR =====
  takeDamage: (amount, source = 'generic') => {
    set(state => {
      let damage = amount
      let newArmor = state.armor

      // Armor absorbs some damage
      if (newArmor > 0) {
        const armorAbsorb = Math.min(damage * 0.5, newArmor)
        damage -= armorAbsorb
        newArmor -= armorAbsorb
      }

      let newHealth = Math.max(state.health - damage, 0)

      return {
        health: newHealth,
        armor: newArmor,
        isInCombat: true
      }
    })

    // Death handling
    if (get().health <= 0) {
      get().die(source)
    }
  },

  heal: (amount) => {
    set(state => ({
      health: Math.min(state.health + amount, state.maxHealth)
    }))
  },

  addArmor: (amount) => {
    set(state => ({
      armor: Math.min(state.armor + amount, state.maxArmor)
    }))
  },

  die: (source = 'generic') => {
    // Handle death - respawn, lose weapons, etc.
    set({
      health: get().maxHealth,
      armor: 0,
      weapons: { fists: { id: 'fists', ammo: -1, maxAmmo: -1 } },
      currentWeaponId: 'fists',
      isInCombat: false
    })

    // Trigger respawn event
    console.log(`Player died from: ${source}`)
  },

  // ===== UTILITY =====
  getWeaponInfo: (weaponId) => {
    return getWeapon(weaponId)
  },

  getCurrentWeapon: () => {
    const state = get()
    return getWeapon(state.currentWeaponId)
  },

  getWeaponList: () => {
    return Object.keys(get().weapons).map(id => ({
      id,
      ...getWeapon(id),
      currentAmmo: get().weapons[id].ammo
    }))
  },

  getHealthPercent: () => {
    const state = get()
    return (state.health / state.maxHealth) * 100
  },

  getArmorPercent: () => {
    const state = get()
    return (state.armor / state.maxArmor) * 100
  },

  exitCombat: () => {
    set({ isInCombat: false })
  },

  resetCombat: () => {
    set({
      weapons: { fists: { id: 'fists', ammo: -1, maxAmmo: -1 } },
      currentWeaponId: 'fists',
      health: 100,
      armor: 0,
      isInCombat: false,
      lastAttackTime: 0
    })
  }
}))
