import React, { useState } from 'react'
import { useAnimationSystem } from '../state/animationSystem'
import { useAnimationKeyboard, getHotkeyInfo } from '../hooks/useAnimationKeyboard'
import { AnimationPicker } from './AnimationPicker'
import '../style/animationHUD.css'

/**
 * Animation HUD Component
 * Displays quick-access animation buttons and animation picker modal
 */
export function AnimationHUD() {
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [showHotkeys, setShowHotkeys] = useState(false)
  const playAnimation = useAnimationSystem(state => state.playAnimation)
  const stopAnimation = useAnimationSystem(state => state.stopAnimation)
  const currentAnimation = useAnimationSystem(state => state.currentAnimation)

  // Enable keyboard shortcuts
  useAnimationKeyboard()

  // Quick action animations
  const quickAnimations = [
    { id: 'wave', name: 'Wave', emoji: '👋', hotkey: 'E' },
    { id: 'laugh_01', name: 'Laugh', emoji: '😂', hotkey: 'L' },
    { id: 'dance_01', name: 'Dance', emoji: '💃', hotkey: 'D' },
    { id: 'hug', name: 'Hug', emoji: '🤗', hotkey: 'H' },
    { id: 'thumbs_up', name: 'Thumbs Up', emoji: '👍', hotkey: null },
    { id: 'victory', name: 'Victory', emoji: '🏆', hotkey: 'V' },
    { id: 'flex', name: 'Flex', emoji: '💪', hotkey: 'F' },
    { id: 'clap', name: 'Clap', emoji: '👏', hotkey: 'C' }
  ]

  const handleQuickAnimation = (animationId) => {
    playAnimation(animationId)
  }

  return (
    <>
      {/* Quick Animation Buttons */}
      <div className="animation-hud">
        {/* Main Animation Controls */}
        <div className="animation-controls">
          {/* Stop Button */}
          <button
            className="animation-control-btn stop-btn"
            onClick={stopAnimation}
            title="Stop current animation (ESC)"
            disabled={!currentAnimation}
          >
            ⏹️
          </button>

          {/* Animation Picker Toggle */}
          <button
            className="animation-control-btn picker-btn"
            onClick={() => setIsPickerOpen(true)}
            title="Open animation library (A)"
          >
            🎬
          </button>

          {/* Hotkey Reference Toggle */}
          <button
            className="animation-control-btn hotkey-btn"
            onClick={() => setShowHotkeys(!showHotkeys)}
            title="Show keyboard shortcuts"
          >
            ⌨️
          </button>
        </div>

        {/* Quick Access Buttons */}
        <div className="quick-animations">
          {quickAnimations.map((anim) => (
            <button
              key={anim.id}
              className={`quick-anim-btn ${
                currentAnimation?.id === anim.id ? 'playing' : ''
              }`}
              onClick={() => handleQuickAnimation(anim.id)}
              title={`${anim.name}${anim.hotkey ? ` (${anim.hotkey})` : ''}`}
            >
              <span className="emoji">{anim.emoji}</span>
              <span className="label">{anim.name}</span>
              {anim.hotkey && <span className="hotkey">{anim.hotkey}</span>}
            </button>
          ))}
        </div>

        {/* Hotkey Reference */}
        {showHotkeys && <HotkeyReference onClose={() => setShowHotkeys(false)} />}
      </div>

      {/* Animation Picker Modal */}
      <AnimationPicker isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} />
    </>
  )
}

/**
 * Hotkey Reference Panel
 */
function HotkeyReference({ onClose }) {
  const hotkeyInfo = getHotkeyInfo()

  return (
    <div className="hotkey-reference">
      <div className="hotkey-reference-header">
        <h3>🎮 Keyboard Shortcuts</h3>
        <button className="close" onClick={onClose}>✕</button>
      </div>
      <div className="hotkey-grid">
        {hotkeyInfo.map((info) => (
          <div key={info.key} className="hotkey-item">
            <kbd className="hotkey-key">{info.key}</kbd>
            <span className="hotkey-label">{info.animationId}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
