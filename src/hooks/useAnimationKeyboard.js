import { useEffect } from 'react'
import { useAnimationSystem } from '../state/animationSystem'
import { ANIMATION_HOTKEYS } from '../config/animations'

/**
 * Hook to handle keyboard shortcuts for quick animation playback
 * Registers hotkeys based on ANIMATION_HOTKEYS config
 */
export function useAnimationKeyboard() {
  const playAnimation = useAnimationSystem(state => state.playAnimation)

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Don't trigger if user is typing in an input
      if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA' ||
        event.target.contentEditable === 'true'
      ) {
        return
      }

      // Handle space bar specially (prevent page scroll)
      if (event.code === 'Space') {
        const key = ' '
        if (ANIMATION_HOTKEYS[key]) {
          event.preventDefault()
          playAnimation(ANIMATION_HOTKEYS[key])
        }
      } else {
        // Handle regular key presses (case-insensitive)
        const key = event.key.toLowerCase()
        if (ANIMATION_HOTKEYS[key]) {
          event.preventDefault()
          playAnimation(ANIMATION_HOTKEYS[key])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [playAnimation])
}

/**
 * Get hotkey information for UI display
 */
export function getHotkeyInfo() {
  return Object.entries(ANIMATION_HOTKEYS).map(([key, animationId]) => ({
    key: key === ' ' ? 'SPACE' : key.toUpperCase(),
    animationId,
    displayKey: key === ' ' ? '␣' : key
  }))
}

/**
 * Format hotkey for display
 */
export function formatHotkey(key) {
  if (key === ' ') return 'SPACE'
  return key.toUpperCase()
}
