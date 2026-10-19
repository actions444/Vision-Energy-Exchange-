import { Panel } from './UI.jsx'
import { playerState } from '../state/runtime.js'

// General emotes/actions, usable anywhere (not just on the Grand Concert Stage - see
// PerformancePanel.jsx for the stage/singing version, which drives these same poses while
// performing). Dance/Exercise are toggles; Wave/Clap/Bow/Point are one-shot gestures that
// auto-clear themselves after a few seconds (see playerState.gestureUntil in player/Player.jsx).
const GESTURE_MS = { clap: 2200, bow: 2200, point: 1800 }

export default function ActionsPanel() {
  const dancing = playerState.dancing
  const working = playerState.workout === 'squat'

  return (
    <Panel title="Actions" eyebrow="Your avatar">
      <div className="fields">
        <p className="hint">General emotes anyone can use, anywhere - not tied to the concert stage.</p>
        <div className="row-actions">
          <button className="btn" onClick={() => { playerState.emote = 'wave'; playerState.emoteUntil = performance.now() + 1500 }}>Wave</button>
          <button className="btn" onClick={() => { playerState.gesture = 'clap'; playerState.gestureUntil = performance.now() + GESTURE_MS.clap }}>Clap</button>
          <button className="btn" onClick={() => { playerState.gesture = 'bow'; playerState.gestureUntil = performance.now() + GESTURE_MS.bow }}>Bow</button>
          <button className="btn" onClick={() => { playerState.gesture = 'point'; playerState.gestureUntil = performance.now() + GESTURE_MS.point }}>Point</button>
        </div>
        <label className="row toggle">
          <span><b>Dance</b><small>Loops a dance sway until you turn it off.</small></span>
          <input type="checkbox" defaultChecked={dancing} onChange={(e) => { playerState.dancing = e.target.checked }} />
        </label>
        <label className="row toggle">
          <span><b>Exercise</b><small>A standing workout pose - no gym machine needed.</small></span>
          <input type="checkbox" defaultChecked={working} onChange={(e) => { playerState.workout = e.target.checked ? 'squat' : null }} />
        </label>
        <p className="note">Dance and Exercise stay on until you switch them off here (or by sitting at a real gym machine, for Exercise). Wave, Clap, Bow and Point play once and stop on their own.</p>
      </div>
    </Panel>
  )
}
