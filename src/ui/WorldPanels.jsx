import { useSchedule, ACTIONS } from '../state/schedule.js'
import { useEffect, useState } from 'react'
import { Panel } from './UI.jsx'
import { useEnv, WEATHER, formatTime } from '../state/environment.js'
import { useStore } from '../state/store.js'
import { net, usePeers } from '../net/netManager.js'
import { elevator, useElevatorUI } from '../world/elevator.js'
import { floorName } from '../config/plaza.js'
import { PLAZA } from '../config/plaza.js'

/** Small live clock + weather chip for the HUD. */
export function Clock() {
  const [, tick] = useState(0)
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t) }, [])
  const { time, weather } = useEnv.getState()
  return <span className="chip">{formatTime(time)} · {WEATHER[weather].label}</span>
}

/** Owner hub: one place for every admin tool. */
export function AdminHub() {
  const open = useStore((s) => s.openPanel)
  const items = [
    ['world', 'Time & weather', 'Set the time of day, run or pause the cycle, change the weather.'],
    ['access', 'Rooms & access', 'Inspect any room or building, including private bookings (owner entries are logged).'],
    ['npcs', 'NPC work times', 'Set when every staff member, worker and visitor NPC is on duty (start and end hours, always on, or off).'],
    ['rentals', 'Rentals', 'Rentable rooms, prices, availability, requests, assignments and revenue.'],
    ['music', 'Music', 'Upload music, build playlists, choose what every room plays.'],
    ['media', 'Media library', 'Upload songs, album covers, music videos, movies, audiobooks and e-books. Publish what visitors see.'],
    ['assets', '3D assets', 'Import GLB/GLTF models and place them in the world.'],
    ['animations', 'Animations', 'The shared cross-rig animation library - see what every category is filled with, and assign a clip by hand.'],
  ]
  return (
    <Panel title="Owner tools" eyebrow="Admin">
      <div className="admin-list">
        {items.map(([k, t, d]) => (
          <button key={k} className="hub-item" onClick={() => open({ type: k })}><b>{t}</b><small>{d}</small></button>
        ))}
      </div>
    </Panel>
  )
}

/** Time of day + weather. In multiplayer the server only accepts this from the owner. */
export function WorldAdmin() {
  const env = useEnv()
  const mode = useStore((s) => s.mode)
  const peersAdmin = usePeers((s) => s.isAdmin)
  const share = (patch) => {
    env.set(patch)
    const e = { ...useEnv.getState(), ...patch }
    if (mode === 'multi') net.sendEnv({ time: e.time, weather: e.weather, running: e.running, speed: e.speed })
  }
  const presets = [['Sunrise', 6.4], ['Morning', 9], ['Noon', 12.5], ['Afternoon', 16], ['Sunset', 18.6], ['Night', 22]]
  return (
    <Panel title="Time & weather" eyebrow="World">
      <div className="fields">
        <div className="clock-big">{formatTime(env.time)}</div>
        <input id="env-time" type="range" min={0} max={23.99} step={0.05} value={env.time} onChange={(e) => share({ time: +e.target.value })} aria-label="Time of day" />
        <div className="seg small wrap">{presets.map(([l, h]) => <button key={l} onClick={() => share({ time: h })}>{l}</button>)}</div>
        <label className="row toggle">
          <span><b>Run the day/night cycle</b><small>{env.speed === 1 ? 'A full day every 24 minutes.' : `${env.speed} in-world minutes per second.`}</small></span>
          <input id="env-run" type="checkbox" checked={env.running} onChange={(e) => share({ running: e.target.checked })} />
        </label>
        <label className="field"><span>Cycle speed</span>
          <select id="env-speed" value={env.speed} onChange={(e) => share({ speed: +e.target.value })}>
            {[0.25, 0.5, 1, 2, 5, 15, 60].map((v) => <option key={v} value={v}>{v === 1 ? '1× (24-minute day)' : `${v}×`}</option>)}
          </select>
        </label>
        <div className="field"><span>Weather</span>
          <div className="seg small wrap">{Object.entries(WEATHER).map(([k, w]) => <button key={k} className={env.weather === k ? 'on' : ''} onClick={() => share({ weather: k })}>{w.label}</button>)}</div>
        </div>
        <p className="hint">Streetlights, windows and signs switch on automatically after dusk.</p>
        <TimerSection />
        {mode === 'multi' && <p className="hint">{peersAdmin ? 'Changes are shared with everyone in this room.' : 'Only the owner can change time and weather for everyone (join with the owner token). Your changes stay on your screen.'}</p>}
      </div>
    </Panel>
  )
}

/** Automatic timer: pick an in-world hour and an action; it runs once every day. */
function TimerSection() {
  const items = useSchedule((s) => s.items)
  const add = useSchedule((s) => s.add)
  const remove = useSchedule((s) => s.remove)
  const toggleOn = useSchedule((s) => s.toggleOn)
  const [hour, setHour] = useState(22)
  const [action, setAction] = useState('lightsOff')
  return (
    <div className="field">
      <span>Automatic timer</span>
      <div className="row-actions">
        <select id="timer-hour" value={hour} onChange={(e) => setHour(+e.target.value)}>
          {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{formatTime(h)}</option>)}
        </select>
        <select id="timer-action" value={action} onChange={(e) => setAction(e.target.value)}>
          {Object.entries(ACTIONS).map(([k, a]) => <option key={k} value={k}>{a.label}</option>)}
        </select>
        <button className="btn small primary" id="timer-add" onClick={() => add(hour, action)}>Add timer</button>
      </div>
      {items.length === 0 && <p className="hint">No timers. Try "Lights off" at 10:00 PM to keep the bill down overnight.</p>}
      <ul className="zone-list">
        {items.map((it) => (
          <li key={it.id} className={it.off ? 'off' : 'on'}>
            <span className="dot" />
            <span className="zone-name">{formatTime(it.hour)} · {ACTIONS[it.action]?.label || it.action}</span>
            <button className="btn small" onClick={() => toggleOn(it.id)}>{it.off ? 'Enable' : 'Pause'}</button>
            <button className="btn small" onClick={() => remove(it.id)}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Floor picker shown inside the elevator car. */
export function ElevatorPanel() {
  const ui = useElevatorUI()
  const close = useStore((s) => s.closePanel)
  return (
    <Panel title="Elevator" eyebrow={ui.moving ? (ui.direction > 0 ? 'Going up' : 'Going down') : `Floor ${ui.floor + 1}`}>
      <div className="elevator-buttons">
        {Array.from({ length: PLAZA.floors }, (_, i) => PLAZA.floors - 1 - i).map((f) => (
          <button key={f} className={'floor-btn' + (ui.floor === f ? ' on' : '') + (ui.lit.includes(f) ? ' lit' : '')} onClick={() => { elevator.call(f); close() }}>
            <b>{f + 1}</b><small>{floorName(f)}</small>
          </button>
        ))}
      </div>
    </Panel>
  )
}
