import { useEffect, useState } from 'react'
import { Panel } from './UI.jsx'
import { useEnv, WEATHER, formatTime } from '../state/environment.js'
import { useStore } from '../state/store.js'
import { net, usePeers } from '../net/netManager.js'
import { elevator, useElevatorUI } from '../world/elevator.js'
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
    ['rentals', 'Rentals', 'Rentable rooms, prices, availability, requests, assignments and revenue.'],
    ['music', 'Music', 'Upload music, build playlists, choose what every room plays.'],
    ['media', 'Media library', 'Upload songs, album covers, music videos, movies, audiobooks and e-books. Publish what visitors see.'],
    ['assets', '3D assets', 'Import GLB/GLTF models and place them in the world.'],
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
        {mode === 'multi' && <p className="hint">{peersAdmin ? 'Changes are shared with everyone in this room.' : 'Only the owner can change time and weather for everyone (join with the owner token). Your changes stay on your screen.'}</p>}
      </div>
    </Panel>
  )
}

/** Floor picker shown inside the elevator car. */
export function ElevatorPanel() {
  const ui = useElevatorUI()
  const close = useStore((s) => s.closePanel)
  const names = ['Lobby · Bistro · Threads', 'Screening Room · Studio 202', 'Boardroom · Skyline Suite']
  return (
    <Panel title="Elevator" eyebrow={ui.moving ? (ui.direction > 0 ? 'Going up' : 'Going down') : `Floor ${ui.floor + 1}`}>
      <div className="elevator-buttons">
        {Array.from({ length: PLAZA.floors }, (_, i) => PLAZA.floors - 1 - i).map((f) => (
          <button key={f} className={'floor-btn' + (ui.floor === f ? ' on' : '')} onClick={() => { elevator.call(f); close() }}>
            <b>{f + 1}</b><small>{names[f]}</small>
          </button>
        ))}
      </div>
    </Panel>
  )
}
