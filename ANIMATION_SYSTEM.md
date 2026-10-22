# Animation & Motion System

Complete animation system with 50+ animations and motion sequencing for Vision Storms World.

## Overview

The animation system provides:
- **50+ animations** across 7 categories (idle, emotes, social, work, dance, sport, special)
- **Animation picker UI** - grid interface to browse and select animations
- **Quick access** - keyboard shortcuts for instant playback
- **Motion sequencing** - chain multiple animations together
- **Animation blending** - smooth transitions between animations
- **State management** - Zustand store for animation state

## Architecture

### Core Files

1. **`src/config/animations.js`**
   - 50+ animation definitions organized by category
   - Animation metadata (duration, loopable, description)
   - Keyboard hotkey mappings

2. **`src/state/animationSystem.js`**
   - Zustand store managing animation playback
   - Queue system for sequential animations
   - Motion sequencing for complex chains
   - Animation blending and transitions

3. **`src/ui/AnimationPicker.jsx`**
   - Grid UI for browsing animations by category
   - Category tabs (Emotes, Dance, Work, etc.)
   - Animation tiles with hover info
   - Currently playing indicator

4. **`src/ui/AnimationHUD.jsx`**
   - Quick-access animation buttons
   - Animation control panel (stop, open picker)
   - Keyboard shortcut reference
   - 8 most-used animations

5. **`src/hooks/useAnimationKeyboard.js`**
   - Keyboard event handling for hotkeys
   - Hotkey info utilities
   - Non-intrusive input detection

## Animation Library

### Categories & Animations

```
Idle & Movement (5)
├─ idle, idle_think, idle_phone, walk, run

Emotes (17)
├─ wave, laugh_01, laugh_02, cry, shocked, angry
├─ confused, shrug, nod, headshake, point
├─ thumbs_up, thumbs_down, clap, salute

Social (8)
├─ hug, handshake, kiss_hand, bow
├─ sit_ground, sit_chair, stretch

Work (8)
├─ work_type, work_write, lift_heavy, carry_box
├─ work_cook, work_clean, work_garden, work_build

Dance (5)
├─ dance_01, dance_02, dance_03, dance_twerk, dance_salsa

Sport/Fitness (6)
├─ jump, jump_rope_01, jump_rope_02, punch, kick, boxing

Special (10)
├─ flex, victory, defeat, sleep, meditate, yoga
├─ make_a_cup_of_tea, look_around
```

## Usage

### Basic Animation Playback

```javascript
import { useAnimationSystem } from '@state/animationSystem'

function MyComponent() {
  const playAnimation = useAnimationSystem(state => state.playAnimation)
  
  return (
    <button onClick={() => playAnimation('wave')}>
      Wave
    </button>
  )
}
```

### One-Shot Emotes

```javascript
const playEmote = useAnimationSystem(state => state.playEmote)
playEmote('laugh_01')  // Plays and stops when complete
```

### Animation Queue

```javascript
const playAnimation = useAnimationSystem(state => state.playAnimation)

// Queue animations to play in sequence
playAnimation('wave', { queue: true })
playAnimation('laugh_01', { queue: true })
```

### Motion Sequences

```javascript
const playMotionSequence = useAnimationSystem(state => state.playMotionSequence)

// Complex chain: dance -> pose -> emote
playMotionSequence([
  'dance_01',
  'victory',
  'clap'
], { loop: false, delayBetween: 0.5 })
```

### Animation Blending

```javascript
const blendToAnimation = useAnimationSystem(state => state.blendToAnimation)

// Smooth 0.5s transition to new animation
blendToAnimation('dance_01', 0.5)
```

### Keyboard Shortcuts

Automatically enabled with `useAnimationKeyboard()` hook:

```
E - Wave
L - Laugh
D - Dance
H - Hug
S - Sit Down
F - Flex
V - Victory
SPACE - Jump
C - Clap
P - Point
A - Open Animation Picker (not in hotkeys, but in UI)
```

## Integration with Avatar System

To integrate with your avatar rendering:

```javascript
// In your avatar component
const currentAnimation = useAnimationSystem(state => state.currentAnimation)
const animationProgress = useAnimationSystem(state => state.animationProgress)
const updateAnimationProgress = useAnimationSystem(state => state.updateAnimationProgress)

useFrame(() => {
  // Update animation progress each frame
  updateAnimationProgress()
  
  // Use currentAnimation.id and animationProgress (0-1)
  // to drive your avatar's animation blending
  if (currentAnimation) {
    // Apply animation to avatar mesh
    const action = actions[currentAnimation.id]
    if (action) {
      action.play()
      // Handle looping/completion based on animationProgress
    }
  }
})
```

## UI Components

### Animation Picker

Opens with 🎬 button in the HUD. Shows:
- Category tabs (Idle, Emotes, Dance, etc.)
- Animated tiles with emojis
- Hover tooltips with duration & loopable info
- Currently playing indicator
- Responsive grid layout

### Animation HUD

Always visible at bottom of screen. Shows:
- ⏹️ Stop button
- 🎬 Animation Picker toggle
- ⌨️ Keyboard shortcuts reference
- 8 quick-access buttons
- 📱 Fully responsive for mobile

## Keyboard Shortcuts

Press `⌨️` button in HUD to see all available hotkeys.

Quick access from anywhere:
- **E** - Wave (emote/greet)
- **L** - Laugh (emote/reaction)
- **D** - Dance (social/expression)
- **H** - Hug (social/greeting)
- **S** - Sit Down (social/rest)
- **F** - Flex (special/show off)
- **V** - Victory (special/celebration)
- **Space** - Jump (sport/movement)
- **C** - Clap (emote/applause)
- **P** - Point (emote/gesture)

## State Management

The animation system uses Zustand for state:

```javascript
export const useAnimationSystem = create((set, get) => ({
  // Current animation
  currentAnimation: null,
  animationProgress: 0,
  isPlaying: false,
  
  // Queue and sequences
  animationQueue: [],
  motionSequence: [],
  sequenceIndex: 0,
  isLooping: false,
  
  // Methods
  playAnimation(animationId, options = {}),
  stopAnimation(),
  updateAnimationProgress(),
  addToAnimationQueue(animationId, options),
  clearAnimationQueue(),
  playMotionSequence(animationIds, options),
  advanceMotionSequence(),
  blendToAnimation(animationId, blendDuration),
  playEmote(emoteId),
  getAnimationDuration(animationId),
  getAnimationInfo(animationId),
  getCurrentAnimationInfo(),
  isAnimationPlaying(animationId)
}))
```

## API Reference

### Methods

#### `playAnimation(animationId, options = {})`
Play an animation
- **animationId**: String ID from ANIMATIONS
- **options.loop**: Boolean (default: anim.loopable)
- **options.queue**: Boolean (default: false) - add to queue instead of interrupting

#### `stopAnimation()`
Stop current animation and clear queue

#### `updateAnimationProgress()`
Update animation progress (call from game loop each frame)

#### `playEmote(emoteId)`
Play a one-shot emote

#### `playMotionSequence(animationIds, options = {})`
Play multiple animations in sequence
- **animationIds**: Array of animation IDs
- **options.loop**: Boolean (default: false)
- **options.delayBetween**: Number in seconds (default: 0)

#### `blendToAnimation(animationId, blendDuration = 0.5)`
Smooth transition to new animation

#### `getAnimationInfo(animationId)`
Get animation metadata

#### `isAnimationPlaying(animationId)`
Check if specific animation is current

## Styling

All styles are contained in:
- `src/style/animationPicker.css` - Picker panel styles
- `src/style/animationHUD.css` - HUD button styles

Both use:
- Gold accent color (#c9a96a)
- Dark theme (rgba backgrounds)
- Smooth animations & transitions
- Responsive layouts for mobile

## Performance

- **Minimal overhead**: Zustand store with no unnecessary re-renders
- **Efficient UI**: Animation picker renders only visible tiles
- **Optimized styling**: CSS animations use GPU acceleration
- **Keyboard handling**: Event delegation with input detection
- **Memory efficient**: No animation data loaded until needed

## Next Steps

1. **Avatar Integration**: Connect to your avatar's animation system
2. **Sound Effects**: Add audio for animations
3. **NPC Animations**: Use for NPC behavior system
4. **Job Animations**: Map job tasks to work animations
5. **Dance Floor**: Create synchronized dance experiences
6. **Live Events**: Trigger animations during performances

## Debugging

Access animation state in console:
```javascript
window.__vsw.useAnimationSystem.getState()
```

Check current animation:
```javascript
window.__vsw.useAnimationSystem.getState().currentAnimation
```

Play animation from console:
```javascript
window.__vsw.useAnimationSystem.getState().playAnimation('victory')
```

## Browser Support

Works in all modern browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Credits

Animation system built for Vision Storms World.
Designed to integrate seamlessly with Three.js/React Three Fiber.
