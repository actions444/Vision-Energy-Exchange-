/**
 * VISION STORMS WORLD - Voice & Lip Sync System
 *
 * NPCs speak with real voices (Trinity Reign & other creators)
 * Avatars lip sync in real-time
 * Characters perform songs, stage plays, teach courses with voice
 *
 * Powered by voice synthesis + AI lip sync
 */

import { create } from 'zustand'

export const useVoiceAndLipSyncSystem = create((set, get) => ({
  // ===== VOICE PROFILES =====
  voiceProfiles: {
    trinity_reign: {
      id: 'voice_trinity',
      name: 'Trinity Reign',
      description: 'Soothing, educational, powerful',
      language: 'English',
      accent: 'American',
      characteristics: {
        pitch: 'medium',
        speed: 'moderate',
        tone: 'authoritative_but_warm',
        energy: 'calm_yet_commanding'
      },
      voiceFile: '/voices/trinity_reign_base.wav',
      creatorEarningsPercent: 5, // Voice creator gets 5% of game revenue
      audioSamples: [
        {
          id: 'sample_greeting',
          text: 'Welcome to Vision Storms World. I\'m Trinity Reign.',
          duration: 3.5,
          audioUrl: '/voices/trinity/greeting.wav'
        },
        {
          id: 'sample_teaching',
          text: 'You are not alone. This course will help you heal.',
          duration: 4.2,
          audioUrl: '/voices/trinity/teaching.wav'
        }
      ]
    }
  },

  // ===== CHARACTER VOICES =====
  characterVoices: {}, // characterId -> { voiceProfile, customizations }

  // ===== SPEECH SYSTEM =====
  activeConversations: {}, // conversationId -> conversation data

  // ===== LIP SYNC ANIMATION =====
  lipSyncPhonemes: {
    // Phoneme -> mouth shapes
    'A': { mouthOpen: 0.7, lipRound: 0.2 },
    'E': { mouthOpen: 0.5, lipRound: 0.1 },
    'I': { mouthOpen: 0.3, lipRound: 0.4 },
    'O': { mouthOpen: 0.8, lipRound: 0.9 },
    'U': { mouthOpen: 0.5, lipRound: 0.8 },
    'M': { mouthClosed: true, lipPress: 0.8 },
    'N': { mouthOpen: 0.3, tonguePlacement: 'roof' },
    'F': { mouthOpen: 0.4, teethVisible: true },
    'S': { mouthOpen: 0.2, tonguePlacement: 'alveolar' },
    'TH': { tonguePlacement: 'teeth', mouthOpen: 0.4 },
    'CH': { mouthOpen: 0.5, lipRound: 0.3 },
    'SH': { mouthOpen: 0.4, lipRound: 0.5 }
  },

  // ===== CHARACTER SETUP =====
  assignVoiceToCharacter: (characterId, voiceProfileId, customizations = {}) => {
    const voiceProfile = get().voiceProfiles[voiceProfileId]
    if (!voiceProfile) return { success: false, error: 'Voice profile not found' }

    set(state => ({
      characterVoices: {
        ...state.characterVoices,
        [characterId]: {
          voiceProfile: voiceProfile,
          characterId: characterId,
          customizations: {
            pitch: customizations.pitch || 1.0, // 0.5 to 2.0
            speed: customizations.speed || 1.0, // 0.5 to 2.0
            volume: customizations.volume || 1.0,
            emotion: customizations.emotion || 'neutral'
          },
          isReady: true
        }
      }
    }))

    return {
      success: true,
      characterId,
      voiceProfile: voiceProfile.name,
      message: `${voiceProfile.name}'s voice assigned to character`
    }
  },

  // ===== SPEAK WITH LIP SYNC =====
  speakWithLipSync: (characterId, dialogue, options = {}) => {
    const characterVoice = get().characterVoices[characterId]
    if (!characterVoice) return { success: false, error: 'No voice assigned' }

    const conversationId = `conv_${Date.now()}`

    // Convert text to phonemes for lip sync
    const phonemes = textToPhonemes(dialogue)
    const audioData = {
      voiceProfile: characterVoice.voiceProfile.name,
      customizations: characterVoice.customizations,
      duration: estimateDuration(dialogue, characterVoice.customizations.speed),
      emotion: options.emotion || characterVoice.customizations.emotion
    }

    const conversation = {
      id: conversationId,
      characterId: characterId,
      dialogue: dialogue,
      phonemes: phonemes,
      audioData: audioData,
      lipSyncTimings: generateLipSyncTimings(phonemes, audioData.duration),
      emotionalExpression: generateEmotionalExpression(options.emotion),
      startTime: Date.now(),
      endTime: Date.now() + (audioData.duration * 1000),
      isPlaying: true
    }

    set(state => ({
      activeConversations: {
        ...state.activeConversations,
        [conversationId]: conversation
      }
    }))

    return {
      success: true,
      conversationId,
      duration: audioData.duration,
      lipSyncData: conversation.lipSyncTimings,
      message: `${characterVoice.voiceProfile.name} is speaking...`
    }
  },

  // ===== PERFORMANCE MODE (Songs, Stage Plays) =====
  performSong: (characterId, songId, songData) => {
    const characterVoice = get().characterVoices[characterId]
    if (!characterVoice) return { success: false }

    const performanceId = `perf_${Date.now()}`

    const performance = {
      id: performanceId,
      characterId: characterId,
      songId: songId,
      songTitle: songData.title,
      duration: songData.duration,
      lyrics: songData.lyrics,
      voiceProfile: characterVoice.voiceProfile.name,
      // Generate lip sync for entire song
      lipSyncSequence: generateSongLipSync(songData.lyrics, songData.duration),
      animations: {
        bodyMovement: songData.choreography || null,
        facialExpressions: generateFacialExpressions('performance'),
        handGestures: songData.gestures || null
      },
      startTime: Date.now(),
      isPerforming: true
    }

    set(state => ({
      activeConversations: {
        ...state.activeConversations,
        [performanceId]: performance
      }
    }))

    return {
      success: true,
      performanceId,
      songTitle: songData.title,
      duration: songData.duration,
      message: `${characterVoice.voiceProfile.name} is performing: ${songData.title}`
    }
  },

  // ===== TEACHING/COURSE NARRATION =====
  recordCourseNarration: (courseId, moduleId, narratorVoiceId, scriptText) => {
    const voiceProfile = get().voiceProfiles[narratorVoiceId]
    if (!voiceProfile) return { success: false }

    const recordingId = `recording_${Date.now()}`

    const narration = {
      id: recordingId,
      courseId: courseId,
      moduleId: moduleId,
      voiceProfile: voiceProfile.name,
      scriptText: scriptText,
      duration: estimateDuration(scriptText, 1.0),
      audioUrl: `/courses/${courseId}/${moduleId}/narration_${recordingId}.wav`,
      createdAt: Date.now(),
      ready: true
    }

    return {
      success: true,
      recordingId,
      narrator: voiceProfile.name,
      duration: narration.duration,
      audioUrl: narration.audioUrl
    }
  },

  // ===== REAL-TIME CONVERSATION =====
  playerConversation: (characterId, playerDialogue) => {
    const characterVoice = get().characterVoices[characterId]
    if (!characterVoice) return { success: false }

    // In real implementation: NPC response would be generated
    // by AI based on character personality + game state
    const npcResponse = generateNPCResponse(characterId, playerDialogue)

    return get().speakWithLipSync(characterId, npcResponse, {
      emotion: 'responsive'
    })
  },

  // ===== VOICE REVENUE TRACKING =====
  getVoiceCreatorEarnings: (voiceProfileId) => {
    // Calculate earnings for voice creator
    // Based on: usage frequency, character popularity, game revenue share
    return {
      voiceProfileId: voiceProfileId,
      monthlyEarnings: 0, // To be calculated based on usage
      totalEarnings: 0,
      usageCount: 0
    }
  }
}))

// ===== HELPER FUNCTIONS =====

function textToPhonemes(text) {
  // Simple phoneme extraction (in real app: use phoneme library)
  const phonemes = []
  const words = text.split(' ')

  words.forEach(word => {
    const letters = word.toLowerCase().split('')
    letters.forEach(letter => {
      if ('aeiou'.includes(letter)) {
        phonemes.push(letter.toUpperCase())
      } else if (letter === 'n') {
        phonemes.push('N')
      } else if (letter === 'm') {
        phonemes.push('M')
      } else if (letter === 's') {
        phonemes.push('S')
      }
    })
  })

  return phonemes
}

function estimateDuration(text, speed) {
  // Average speaking speed: 150 words per minute
  const wordCount = text.split(' ').length
  const baseTime = (wordCount / 150) * 60 // in seconds
  return baseTime / speed
}

function generateLipSyncTimings(phonemes, totalDuration) {
  const timingsPerPhoneme = totalDuration / phonemes.length

  return phonemes.map((phoneme, index) => ({
    phoneme: phoneme,
    startTime: index * timingsPerPhoneme,
    endTime: (index + 1) * timingsPerPhoneme,
    mouthShape: useVoiceAndLipSyncSystem.getState().lipSyncPhonemes[phoneme] || {}
  }))
}

function generateEmotionalExpression(emotion) {
  const expressions = {
    'neutral': { eyebrows: 0.5, mouthCorners: 0.5, eyeOpening: 0.5 },
    'happy': { eyebrows: 0.6, mouthCorners: 0.8, eyeOpening: 0.7 },
    'sad': { eyebrows: 0.3, mouthCorners: 0.2, eyeOpening: 0.4 },
    'angry': { eyebrows: 0.2, mouthCorners: 0.1, eyeOpening: 0.6 },
    'thoughtful': { eyebrows: 0.4, mouthCorners: 0.4, eyeOpening: 0.5 },
    'responsive': { eyebrows: 0.6, mouthCorners: 0.6, eyeOpening: 0.6 }
  }

  return expressions[emotion] || expressions['neutral']
}

function generateFacialExpressions(performanceType) {
  if (performanceType === 'performance') {
    return {
      expressionIntensity: 0.8,
      blinkFrequency: 1.0, // Normal blinking
      eyeContact: 0.6 // Looking at audience
    }
  }
  return {
    expressionIntensity: 0.5,
    blinkFrequency: 1.0,
    eyeContact: 0.8
  }
}

function generateSongLipSync(lyrics, duration) {
  // Generate lip sync for entire song duration
  // Align phonemes to music beat/timing
  return {
    lyrics: lyrics,
    totalDuration: duration,
    phonemeSequence: textToPhonemes(lyrics),
    beatSync: true, // Sync to music beat
    generatedAt: Date.now()
  }
}

function generateNPCResponse(characterId, playerDialogue) {
  // Placeholder - would use AI/rules engine
  return 'That\'s an interesting perspective. Tell me more.'
}

export function getCharacterVoice(characterId) {
  return useVoiceAndLipSyncSystem.getState().characterVoices[characterId]
}

export function getVoiceProfiles() {
  return useVoiceAndLipSyncSystem.getState().voiceProfiles
}
