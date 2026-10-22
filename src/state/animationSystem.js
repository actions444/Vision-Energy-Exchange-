import { create } from 'zustand'
import { ANIMATIONS, getAnimationById } from '../config/animations'

// Animation state management with queueing and motion sequencing
export const useAnimationSystem = create((set, get) => {
  let animationTimer = null
  let sequenceIndex = 0

  return {
    // Current animation state
    currentAnimation: null,
    animationProgress: 0, // 0-1, where animation is in playback
    animationStartTime: 0,
    isPlaying: false,

    // Animation queue for sequencing
    animationQueue: [],
    isLooping: false,

    // Motion sequence for complex animations
    motionSequence: [],
    sequenceIndex: 0,

    // ===== CURRENT ANIMATION PLAYBACK =====
    playAnimation: (animationId, options = {}) => {
      const anim = getAnimationById(animationId)
      if (!anim) {
        console.warn(`Animation not found: ${animationId}`)
        return
      }

      const { loop = anim.loopable, queue = false } = options

      if (queue && get().isPlaying) {
        // Add to queue instead of interrupting
        get().addToAnimationQueue(animationId, { loop })
        return
      }

      // Clear existing timer
      if (animationTimer) clearTimeout(animationTimer)

      set({
        currentAnimation: anim,
        animationProgress: 0,
        animationStartTime: performance.now(),
        isPlaying: true,
        isLooping: loop && anim.loopable
      })

      // Schedule animation completion
      const duration = anim.duration * 1000 // Convert to ms
      animationTimer = setTimeout(() => {
        const state = get()
        if (state.isLooping) {
          // Restart animation
          get().playAnimation(animationId, { loop: true })
        } else if (state.animationQueue.length > 0) {
          // Play next queued animation
          const next = state.animationQueue.shift()
          get().playAnimation(next.id, { loop: next.loop })
        } else {
          // Return to idle
          set({ isPlaying: false, currentAnimation: null })
        }
      }, duration)
    },

    // Stop current animation
    stopAnimation: () => {
      if (animationTimer) clearTimeout(animationTimer)
      set({
        currentAnimation: null,
        isPlaying: false,
        animationProgress: 0,
        animationQueue: [],
        motionSequence: [],
        sequenceIndex: 0
      })
    },

    // Update animation progress (call from game loop)
    updateAnimationProgress: () => {
      const state = get()
      if (!state.isPlaying || !state.currentAnimation) return

      const elapsed = performance.now() - state.animationStartTime
      const duration = state.currentAnimation.duration * 1000
      const progress = Math.min(elapsed / duration, 1)

      set({ animationProgress: progress })
    },

    // ===== ANIMATION QUEUE =====
    addToAnimationQueue: (animationId, options = {}) => {
      const anim = getAnimationById(animationId)
      if (!anim) {
        console.warn(`Animation not found: ${animationId}`)
        return
      }

      const { loop = anim.loopable } = options

      set(state => ({
        animationQueue: [
          ...state.animationQueue,
          { id: animationId, loop }
        ]
      }))
    },

    // Clear animation queue
    clearAnimationQueue: () => {
      set({ animationQueue: [] })
    },

    // ===== MOTION SEQUENCING (Complex animation chains) =====
    // Example: dance -> pose -> emote
    playMotionSequence: (animationIds, options = {}) => {
      const { loop = false, delayBetween = 0 } = options

      set({
        motionSequence: animationIds.map(id => ({
          id,
          delay: delayBetween
        })),
        sequenceIndex: 0
      })

      // Start first animation
      get().playAnimation(animationIds[0], { loop: false })
    },

    // Advance to next animation in sequence
    advanceMotionSequence: () => {
      const state = get()
      const nextIndex = state.sequenceIndex + 1

      if (nextIndex < state.motionSequence.length) {
        const nextAnim = state.motionSequence[nextIndex]
        set({ sequenceIndex: nextIndex })

        // Play next with optional delay
        if (nextAnim.delay > 0) {
          setTimeout(() => {
            get().playAnimation(nextAnim.id, { loop: false })
          }, nextAnim.delay)
        } else {
          get().playAnimation(nextAnim.id, { loop: false })
        }
      } else {
        // Sequence complete
        set({
          motionSequence: [],
          sequenceIndex: 0,
          isPlaying: false,
          currentAnimation: null
        })
      }
    },

    // ===== ANIMATION BLENDING =====
    // Smooth transition between animations
    blendToAnimation: (animationId, blendDuration = 0.5) => {
      const { currentAnimation, animationProgress } = get()

      if (!currentAnimation) {
        get().playAnimation(animationId)
        return
      }

      // Store blend info for rendering system to use
      set(state => ({
        ...state,
        animationBlendDuration: blendDuration,
        previousAnimation: currentAnimation,
        previousAnimationProgress: animationProgress
      }))

      // Play new animation after blend time
      setTimeout(() => {
        get().playAnimation(animationId)
      }, blendDuration * 1000)
    },

    // ===== QUICK EMOTES (One-shot animations) =====
    playEmote: (emoteId) => {
      const anim = getAnimationById(emoteId)
      if (anim?.category !== 'emote') {
        console.warn(`Not an emote: ${emoteId}`)
        return
      }
      get().playAnimation(emoteId, { loop: false })
    },

    // ===== UTILITY =====
    getAnimationDuration: (animationId) => {
      const anim = getAnimationById(animationId)
      return anim?.duration || 0
    },

    getAnimationInfo: (animationId) => {
      return getAnimationById(animationId)
    },

    // Get current animation info
    getCurrentAnimationInfo: () => {
      return get().currentAnimation
    },

    // Check if specific animation is playing
    isAnimationPlaying: (animationId) => {
      const state = get()
      return state.currentAnimation?.id === animationId && state.isPlaying
    }
  }
})
