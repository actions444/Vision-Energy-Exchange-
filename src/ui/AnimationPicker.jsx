import React, { useState, useEffect } from 'react'
import { useAnimationSystem } from '../state/animationSystem'
import { ANIMATION_CATEGORIES, getAnimationsByCategory } from '../config/animations'
import '../style/animationPicker.css'

export function AnimationPicker({ isOpen, onClose }) {
  const [selectedCategory, setSelectedCategory] = useState('emote')
  const [filteredAnimations, setFilteredAnimations] = useState([])
  const [hoveredAnimation, setHoveredAnimation] = useState(null)
  const playAnimation = useAnimationSystem(state => state.playAnimation)
  const currentAnimation = useAnimationSystem(state => state.currentAnimation)

  // Update filtered animations when category changes
  useEffect(() => {
    const anims = getAnimationsByCategory(selectedCategory)
    setFilteredAnimations(anims)
  }, [selectedCategory])

  const handleAnimationClick = (animation) => {
    playAnimation(animation.id)
  }

  if (!isOpen) return null

  return (
    <div className="animation-picker-overlay" onClick={onClose}>
      <div className="animation-picker-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="animation-picker-header">
          <h2>Animation Library</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Category Tabs */}
        <div className="animation-categories-bar">
          {Object.entries(ANIMATION_CATEGORIES).map(([key, label]) => (
            <button
              key={key}
              className={`category-tab ${selectedCategory === key ? 'active' : ''}`}
              onClick={() => setSelectedCategory(key)}
              title={label}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Animations Grid */}
        <div className="animation-grid">
          {filteredAnimations.map((animation) => (
            <div
              key={animation.id}
              className={`animation-tile ${
                currentAnimation?.id === animation.id ? 'playing' : ''
              } ${hoveredAnimation?.id === animation.id ? 'hovered' : ''}`}
              onClick={() => handleAnimationClick(animation)}
              onMouseEnter={() => setHoveredAnimation(animation)}
              onMouseLeave={() => setHoveredAnimation(null)}
              title={animation.description}
            >
              {/* Animation Icon/Thumbnail */}
              <div className="animation-thumbnail">
                <span className="animation-icon">
                  {getAnimationEmoji(animation.category)}
                </span>
              </div>

              {/* Animation Name */}
              <div className="animation-name">{animation.name}</div>

              {/* Playback Indicator */}
              {currentAnimation?.id === animation.id && (
                <div className="playing-indicator">
                  <span className="play-pulse"></span> Playing
                </div>
              )}

              {/* Hover Info */}
              {hoveredAnimation?.id === animation.id && (
                <div className="animation-info-tooltip">
                  <p className="duration">Duration: {animation.duration.toFixed(1)}s</p>
                  <p className="loopable">
                    {animation.loopable ? '🔁 Loopable' : '⏹️ One-shot'}
                  </p>
                  <p className="description">{animation.description}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer Info */}
        <div className="animation-picker-footer">
          <p>
            {currentAnimation
              ? `Currently playing: ${currentAnimation.name}`
              : 'Select an animation to play'}
          </p>
          <p className="hint">💡 Press keyboard shortcuts for quick access (E, L, D, H, etc.)</p>
        </div>
      </div>
    </div>
  )
}

// Helper function to get emoji for animation category
function getAnimationEmoji(category) {
  const emojiMap = {
    idle: '🧍',
    emote: '😊',
    social: '👥',
    work: '💼',
    dance: '💃',
    sport: '⚡',
    special: '✨'
  }
  return emojiMap[category] || '🎬'
}
