/**
 * VISION STORMS WORLD - Avatar Creator System
 *
 * Photorealistic player character customization:
 * - Face generation with diverse features
 * - Skin tone customization
 * - Hair style and color selection
 * - Body type and build options
 * - Clothing and accessories
 * - Tattoos and distinguishing marks
 * - Emote system (expressions)
 * - Avatar evolution (changes with time/gameplay)
 *
 * Creates unique photorealistic characters that represent the player
 */

import { create } from 'zustand'

export const useAvatarCreatorSystem = create((set, get) => ({
  // ===== AVATAR REGISTRY =====
  avatars: {}, // playerId -> avatar data
  avatarTemplates: {}, // template presets

  // ===== CREATE AVATAR =====
  createAvatar: (playerId, avatarData) => {
    // avatarData = {
    //   firstName, lastName, age, gender, skinTone, faceShape
    //   hairStyle, hairColor, eyeColor, build
    //   style, tattoos, accessories
    // }

    const avatarId = `avatar_${playerId}_${Date.now()}`

    const avatar = {
      id: avatarId,
      playerId: playerId,
      firstName: avatarData.firstName,
      lastName: avatarData.lastName,
      displayName: `${avatarData.firstName} ${avatarData.lastName}`,
      age: avatarData.age || 18,
      gender: avatarData.gender || 'non-binary',

      // FACE & APPEARANCE
      appearance: {
        skinTone: avatarData.skinTone || 'medium', // light, fair, medium, olive, tan, dark
        skinTexture: avatarData.skinTexture || 'smooth',
        faceShape: avatarData.faceShape || 'oval', // oval, round, square, heart, oblong, diamond
        eyeColor: avatarData.eyeColor || 'brown',
        eyeSize: avatarData.eyeSize || 'medium',
        noseBridge: avatarData.noseBridge || 'medium', // narrow, medium, wide
        jawline: avatarData.jawline || 'soft',
        cheekbones: avatarData.cheekbones || 'prominent',
        lipSize: avatarData.lipSize || 'medium',
        lipColor: avatarData.lipColor || 'natural'
      },

      // HAIR
      hair: {
        style: avatarData.hairStyle || 'straight', // straight, wavy, curly, coily, kinky
        color: avatarData.hairColor || 'black',
        length: avatarData.hairLength || 'shoulder', // short, shoulder, long, very_long
        texture: avatarData.hairTexture || 'smooth',
        highlight: avatarData.hairHighlight || null
      },

      // BODY
      body: {
        build: avatarData.build || 'athletic', // petite, slim, athletic, average, muscular, stocky
        height: avatarData.height || 5.6, // feet
        bodyType: avatarData.bodyType || 'balanced'
      },

      // STYLE & ACCESSORIES
      style: {
        outfitStyle: avatarData.outfitStyle || 'casual', // casual, streetwear, formal, sporty, bohemian
        currentOutfit: avatarData.currentOutfit || 'casual_starter',
        accessories: avatarData.accessories || [],
        tattoos: avatarData.tattoos || [],
        piercings: avatarData.piercings || [],
        scars: avatarData.scars || []
      },

      // EXPRESSIONS & EMOTES
      currentExpression: 'neutral',
      favoriteEmotes: [],

      // PROGRESSION
      createdAt: Date.now(),
      lastModified: Date.now(),
      characterLevel: 1,
      experiencePoints: 0,
      reputation: 0,
      prestigeLevel: 0,

      // PHYSICAL ATTRIBUTES
      stats: {
        strength: 5,
        speed: 5,
        endurance: 5,
        charm: 5,
        intelligence: 5
      }
    }

    set(state => ({
      avatars: {
        ...state.avatars,
        [playerId]: avatar
      }
    }))

    return {
      success: true,
      avatarId: avatarId,
      displayName: avatar.displayName,
      message: `Welcome, ${avatar.displayName}! Your character has been created.`,
      characterStats: avatar.stats
    }
  },

  // ===== CUSTOMIZE FACE =====
  customizeFace: (playerId, faceOptions) => {
    const avatar = get().avatars[playerId]
    if (!avatar) return { success: false }

    const updatedAvatar = {
      ...avatar,
      appearance: {
        ...avatar.appearance,
        ...faceOptions
      },
      lastModified: Date.now()
    }

    set(state => ({
      avatars: {
        ...state.avatars,
        [playerId]: updatedAvatar
      }
    }))

    return {
      success: true,
      message: 'Face customization updated!',
      appearance: updatedAvatar.appearance
    }
  },

  // ===== CUSTOMIZE HAIR =====
  customizeHair: (playerId, hairOptions) => {
    const avatar = get().avatars[playerId]
    if (!avatar) return { success: false }

    const updatedAvatar = {
      ...avatar,
      hair: {
        ...avatar.hair,
        ...hairOptions
      },
      lastModified: Date.now()
    }

    set(state => ({
      avatars: {
        ...state.avatars,
        [playerId]: updatedAvatar
      }
    }))

    return {
      success: true,
      message: 'Hair customization updated!',
      hair: updatedAvatar.hair
    }
  },

  // ===== CHANGE OUTFIT =====
  changeOutfit: (playerId, outfitId) => {
    const avatar = get().avatars[playerId]
    if (!avatar) return { success: false }

    const updatedAvatar = {
      ...avatar,
      style: {
        ...avatar.style,
        currentOutfit: outfitId
      },
      lastModified: Date.now()
    }

    set(state => ({
      avatars: {
        ...state.avatars,
        [playerId]: updatedAvatar
      }
    }))

    return {
      success: true,
      outfit: outfitId,
      message: `You changed into a new outfit!`
    }
  },

  // ===== ADD ACCESSORY =====
  addAccessory: (playerId, accessoryData) => {
    const avatar = get().avatars[playerId]
    if (!avatar) return { success: false }

    const newAccessory = {
      id: `acc_${Date.now()}`,
      name: accessoryData.name,
      type: accessoryData.type, // jewelry, hat, bag, watch, etc
      rarity: accessoryData.rarity || 'common'
    }

    const updatedAvatar = {
      ...avatar,
      style: {
        ...avatar.style,
        accessories: [...avatar.style.accessories, newAccessory]
      },
      lastModified: Date.now()
    }

    set(state => ({
      avatars: {
        ...state.avatars,
        [playerId]: updatedAvatar
      }
    }))

    return {
      success: true,
      accessoryId: newAccessory.id,
      accessoryName: newAccessory.name,
      message: `${newAccessory.name} added to your style!`
    }
  },

  // ===== ADD TATTOO =====
  addTattoo: (playerId, tattooData) => {
    const avatar = get().avatars[playerId]
    if (!avatar) return { success: false }

    const newTattoo = {
      id: `tat_${Date.now()}`,
      design: tattooData.design,
      location: tattooData.location, // arm, chest, back, leg, neck, etc
      size: tattooData.size || 'medium',
      color: tattooData.color || 'black',
      meaning: tattooData.meaning || ''
    }

    const updatedAvatar = {
      ...avatar,
      style: {
        ...avatar.style,
        tattoos: [...avatar.style.tattoos, newTattoo]
      },
      lastModified: Date.now()
    }

    set(state => ({
      avatars: {
        ...state.avatars,
        [playerId]: updatedAvatar
      }
    }))

    return {
      success: true,
      tattooId: newTattoo.id,
      design: newTattoo.design,
      message: `You got a new tattoo: ${newTattoo.design} on your ${newTattoo.location}!`
    }
  },

  // ===== SET EXPRESSION/EMOTE =====
  setExpression: (playerId, expression) => {
    const avatar = get().avatars[playerId]
    if (!avatar) return { success: false }

    const expressions = [
      'neutral',
      'happy',
      'sad',
      'angry',
      'surprised',
      'excited',
      'concerned',
      'confused'
    ]

    if (!expressions.includes(expression)) {
      return { success: false, error: 'Invalid expression' }
    }

    const updatedAvatar = {
      ...avatar,
      currentExpression: expression
    }

    set(state => ({
      avatars: {
        ...state.avatars,
        [playerId]: updatedAvatar
      }
    }))

    return {
      success: true,
      expression: expression,
      message: `Your avatar is now ${expression}.`
    }
  },

  // ===== FAVORITE EMOTE =====
  addFavoriteEmote: (playerId, emoteId) => {
    const avatar = get().avatars[playerId]
    if (!avatar) return { success: false }

    if (avatar.favoriteEmotes.length >= 6) {
      return { success: false, error: 'Maximum favorite emotes reached (6)' }
    }

    if (avatar.favoriteEmotes.includes(emoteId)) {
      return { success: false, error: 'Already a favorite' }
    }

    const updatedAvatar = {
      ...avatar,
      favoriteEmotes: [...avatar.favoriteEmotes, emoteId]
    }

    set(state => ({
      avatars: {
        ...state.avatars,
        [playerId]: updatedAvatar
      }
    }))

    return {
      success: true,
      emoteId: emoteId,
      message: 'Emote added to favorites!'
    }
  },

  // ===== LEVEL UP AVATAR =====
  levelUpAvatar: (playerId, statsIncrease) => {
    const avatar = get().avatars[playerId]
    if (!avatar) return { success: false }

    const updatedAvatar = {
      ...avatar,
      characterLevel: avatar.characterLevel + 1,
      experiencePoints: 0,
      stats: {
        strength: avatar.stats.strength + (statsIncrease.strength || 1),
        speed: avatar.stats.speed + (statsIncrease.speed || 1),
        endurance: avatar.stats.endurance + (statsIncrease.endurance || 1),
        charm: avatar.stats.charm + (statsIncrease.charm || 1),
        intelligence: avatar.stats.intelligence + (statsIncrease.intelligence || 1)
      }
    }

    set(state => ({
      avatars: {
        ...state.avatars,
        [playerId]: updatedAvatar
      }
    }))

    return {
      success: true,
      newLevel: updatedAvatar.characterLevel,
      message: `${avatar.displayName} reached Level ${updatedAvatar.characterLevel}!`,
      newStats: updatedAvatar.stats
    }
  },

  // ===== GET AVATAR =====
  getAvatar: (playerId) => {
    return get().avatars[playerId] || null
  },

  // ===== GET AVATAR SUMMARY =====
  getAvatarSummary: (playerId) => {
    const avatar = get().avatars[playerId]
    if (!avatar) return null

    return {
      displayName: avatar.displayName,
      age: avatar.age,
      gender: avatar.gender,
      level: avatar.characterLevel,
      reputation: avatar.reputation,
      appearance: `${avatar.appearance.skinTone} skin, ${avatar.hair.color} ${avatar.hair.style} hair, ${avatar.appearance.eyeColor} eyes`,
      style: avatar.style.outfitStyle,
      stats: avatar.stats,
      accessories: avatar.style.accessories.length,
      tattoos: avatar.style.tattoos.length
    }
  },

  // ===== PRESET TEMPLATES =====
  getAvatarTemplates: () => {
    return {
      athletic_warrior: {
        name: 'Athletic Warrior',
        build: 'muscular',
        hair: 'short',
        style: 'sporty'
      },
      creative_artist: {
        name: 'Creative Artist',
        build: 'slim',
        hair: 'long',
        style: 'bohemian'
      },
      business_professional: {
        name: 'Business Professional',
        build: 'athletic',
        style: 'formal'
      },
      streetwear_style: {
        name: 'Streetwear Style',
        build: 'average',
        style: 'streetwear'
      }
    }
  }
}))

export function getAvatarCount() {
  return Object.keys(useAvatarCreatorSystem.getState().avatars).length
}

export function getAllAvatars() {
  return useAvatarCreatorSystem.getState().avatars
}
