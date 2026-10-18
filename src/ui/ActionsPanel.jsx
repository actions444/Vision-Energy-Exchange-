import { useState } from 'react'
import { Panel } from './UI.jsx'
import { playerState } from '../state/runtime.js'

// General emotes/actions, usable anywhere (not just on the Grand Concert Stage - see
// PerformancePanel.jsx for the stage/singing version, which drives these same poses while
// performing). Wave/Clap/Bow/Point are one-shot gestures that auto-clear themselves after a
// few seconds (see playerState.gestureUntil in player/Player.jsx).
const GESTURE_SECS = { clap: 2.2, bow: 2.2, point: 1.8 }

// The full pose set staff NPCs use on the job (StaffNpcs.jsx) and performers use on stage
// (PerformancePanel.jsx) - the avatar component (player/Avatar.jsx) already understands every
// one of these via playerState.gesture, NPCs just had a UI for them and the player didn't.
// These are holds, not one-shots: pick one and it stays until you pick it again or something
// else overrides it (sitting, dancing, a scripted moment). Only one can be active at a time.
const POSES = [
  ['read', 'Read', 'Hold something up to read, like a book or sign'],
  ['write', 'Write', 'Work at a desk or table'],
  ['hold', 'Hold hands', 'Both hands out, waist height'],
  ['reach', 'Reach', 'Reach out with one hand'],
  ['open', 'Arms open', 'Welcoming, both arms out'],
  ['chest', 'Hand to chest', ''],
  ['tray', 'Carry a tray', 'Both forearms level, like carrying something'],
  ['shake', 'Shake', 'Shaking something hard, like a cocktail shaker'],
  ['stir', 'Stir', ''],
  ['wipe', 'Wipe', 'Sweep one arm side to side, like wiping a counter'],
  ['brow', 'Shield eyes', 'Hand to the brow, scanning the distance'],
  ['blow', 'Whistle', 'Hand to the mouth'],
]

export default function ActionsPanel() {
  const dancing = playerState.dancing
  const working = playerState.workout === 'squat'
  const [pose, setPose] = useState(playerState.gesture && POSES.some(([id]) => id === playerState.gesture) ? playerState.gesture : null)

  const gesture = (g, secs) => {
    playerState.gesture = g
    playerState.gestureUntil = performance.now() / 1000 + secs
  }
  const togglePose = (id) => {
    const next = pose === id ? null : id
    setPose(next)
    playerState.gesture = next
    playerState.gestureUntil = Infinity // held, not timed - cleared by picking another pose or None
  }

  return (
    <Panel title="Actions" eyebrow="Your avatar" wide>
      <div className="fields">
        <p className="hint">General emotes anyone can use, anywhere - not tied to the concert stage.</p>
        <div className="row-actions">
          <button className="btn" onClick={() => { playerState.emote = 'wave'; playerState.emoteUntil = performance.now() / 1000 + 1.5 }}>Wave</button>
          <button className="btn" onClick={() => gesture('clap', GESTURE_SECS.clap)}>Clap</button>
          <button className="btn" onClick={() => gesture('bow', GESTURE_SECS.bow)}>Bow</button>
          <button className="btn" onClick={() => gesture('point', GESTURE_SECS.point)}>Point</button>
        </div>
        <label className="row toggle">
          <span><b>Dance</b><small>Loops a dance sway until you turn it off.</small></span>
          <input type="checkbox" defaultChecked={dancing} onChange={(e) => { playerState.dancing = e.target.checked }} />
        </label>
        <label className="row toggle">
          <span><b>Exercise</b><small>A standing workout pose - no gym machine needed.</small></span>
          <input type="checkbox" defaultChecked={working} onChange={(e) => { playerState.workout = e.target.checked ? 'squat' : null }} />
        </label>

        <p className="eyebrow" style={{ marginTop: 10 }}>Poses</p>
        <p className="hint">The same hand poses staff use on the job - carrying a tray, shaking a drink, wiping a counter, reading, writing, and more. Pick one to hold it, tap it again to stop.</p>
        <div className="chips" style={{ flexWrap: 'wrap', overflow: 'visible' }}>
          {POSES.map(([id, label, title]) => (
            <button key={id} className={'chip-btn' + (pose === id ? ' on' : '')} title={title || undefined} onClick={() => togglePose(id)}>{label}</button>
          ))}
        </div>
        <p className="note">Wave, Clap, Bow and Point play once and stop on their own. Dance, Exercise and the poses above stay on until you switch them off.</p>
      </div>
    </Panel>
  )
}
