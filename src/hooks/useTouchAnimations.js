import { useEffect, useRef } from 'react'
import { useAnimationSystem } from '../state/animationSystem'

/**
 * Mobile touch controls for animations
 * - Swipe gestures to trigger animations
 * - Double-tap for quick emotes
 * - Long-press for menu toggle
 */
export function useTouchAnimations(onMenuToggle) {
  const playAnimation = useAnimationSystem(state => state.playAnimation)
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 })
  const swipeThresholdRef = useRef(50) // pixels
  const doubleTapTimeoutRef = useRef(null)
  const lastTapRef = useRef(0)

  // Swipe gesture animations
  const swipeAnimations = {
    right: 'wave',           // Swipe right = wave
    left: 'dance_01',        // Swipe left = dance
    up: 'jump',              // Swipe up = jump
    down: 'sit_ground'       // Swipe down = sit
  }

  const handleTouchStart = (e) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    }
  }

  const handleTouchEnd = (e) => {
    const { x: startX, y: startY, time: startTime } = touchStartRef.current
    const endX = e.changedTouches[0].clientX
    const endY = e.changedTouches[0].clientY
    const duration = Date.now() - startTime

    // Check for double-tap (quick taps)
    const now = Date.now()
    const isDoubleTap = now - lastTapRef.current < 300

    if (isDoubleTap) {
      // Double-tap for emote
      clearTimeout(doubleTapTimeoutRef.current)
      playAnimation('laugh_01')
      lastTapRef.current = 0
      return
    }

    lastTapRef.current = now

    // Schedule single-tap timeout
    doubleTapTimeoutRef.current = setTimeout(() => {
      lastTapRef.current = 0
    }, 300)

    // Check for swipe
    const deltaX = endX - startX
    const deltaY = endY - startY
    const distance = Math.hypot(deltaX, deltaY)

    // Only detect swipes if touch duration is short (not a pan/drag)
    if (duration < 500 && distance > swipeThresholdRef.current) {
      // Determine swipe direction
      const absDeltaX = Math.abs(deltaX)
      const absDeltaY = Math.abs(deltaY)

      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0) {
          playAnimation(swipeAnimations.right)
        } else {
          playAnimation(swipeAnimations.left)
        }
      } else {
        // Vertical swipe
        if (deltaY < 0) {
          playAnimation(swipeAnimations.up)
        } else {
          playAnimation(swipeAnimations.down)
        }
      }
    } else if (duration > 500 && duration < 1000) {
      // Long-press for menu
      onMenuToggle?.()
    }
  }

  useEffect(() => {
    window.addEventListener('touchstart', handleTouchStart, false)
    window.addEventListener('touchend', handleTouchEnd, false)

    return () => {
      window.removeEventListener('touchstart', handleTouchStart, false)
      window.removeEventListener('touchend', handleTouchEnd, false)
      clearTimeout(doubleTapTimeoutRef.current)
    }
  }, [playAnimation, onMenuToggle])
}

/**
 * Get swipe gesture hints for UI display
 */
export function getSwipeHints() {
  return [
    { direction: '→', animation: 'wave', label: 'Swipe right' },
    { direction: '←', animation: 'dance_01', label: 'Swipe left' },
    { direction: '↑', animation: 'jump', label: 'Swipe up' },
    { direction: '↓', animation: 'sit_ground', label: 'Swipe down' },
    { direction: '👆👆', animation: 'laugh_01', label: 'Double-tap' },
    { direction: '🤏', animation: 'menu', label: 'Long-press' }
  ]
}
