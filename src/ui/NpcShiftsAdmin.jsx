import { Panel } from './UI.jsx'
import { useEnv } from '../state/environment.js'
import { useNpcShifts, onDuty, hoursFor, fmtHour, parseHour } from '../state/npcShifts.js'

// Owner tools → NPC work times: every NPC in the world, grouped by place. Per person: default hours, custom hours,
// always on duty, or off duty (not in the world). Changes apply immediately and are stored on this device.
const MODES = [['default', 'Default hours'], ['shift', 'Custom hours'], ['always', 'Always on duty'], ['off', 'Off duty']]

function Row({ e, hour }) {
  const ov = useNpcShifts((s) => s.overrides[e.id])
  const set = useNpcShifts((s) => s.setOverride)
  const clear = useNpcShifts((s) => s.clearOverride)
  const mode = !ov ? 'default' : ov.mode
  const eff = hoursFor(e.id, e.def)
  const working = onDuty(e.id, e.def, hour)
  const defTxt = e.def ? `${fmtHour(e.def[0])}–${fmtHour(e.def[1])}` : 'all day'
  const change = (m) => {
    if (m === 'default') clear(e.id)
    else if (m === 'shift') set(e.id, { mode: 'shift', from: eff.from ?? e.def?.[0] ?? 8, to: eff.to ?? e.def?.[1] ?? 17 })
    else set(e.id, { mode: m })
  }
  return (
    <div className="admin-row" style={{ flexWrap: 'wrap', gap: 8 }}>
      <div className="grow"><b>{e.name}</b><small>{e.title} · default {defTxt}</small></div>
      <span className={'badge' + (working ? ' live' : '')}>{working ? 'On duty now' : 'Off duty now'}</span>
      <select aria-label={`Work mode for ${e.name}`} value={mode} onChange={(ev) => change(ev.target.value)}>
        {MODES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      {mode === 'shift' && (
        <span className="row-actions">
          <label>Start <input type="time" value={fmtHour(ov.from)} onChange={(ev) => set(e.id, { ...ov, from: parseHour(ev.target.value) })} aria-label={`${e.name} start time`} /></label>
          <label>End <input type="time" value={fmtHour(ov.to)} onChange={(ev) => set(e.id, { ...ov, to: parseHour(ev.target.value) })} aria-label={`${e.name} end time`} /></label>
        </span>
      )}
      {ov && <button className="btn ghost small" onClick={() => clear(e.id)}>Reset</button>}
    </div>
  )
}

export default function NpcShiftsAdmin() {
  const dir = useNpcShifts((s) => s.directory)
  const overrides = useNpcShifts((s) => s.overrides)
  const clearAll = useNpcShifts((s) => s.clearAll)
  const hour = useEnv((s) => s.time)
  const list = Object.values(dir)
  const places = [...new Set(list.map((e) => e.place))]
  const bulk = (fn) => list.forEach((e) => fn(e))
  const set = useNpcShifts((s) => s.setOverride)
  return (
    <Panel title="NPC work times" eyebrow="Owner · staff & people" wide>
      <p className="hint">In-world time is {fmtHour(hour)}. Set when each NPC is at work. Outside their hours they leave the world and can't be talked to; a shift may run past midnight (for example 22:00–06:00). Stored on this device.</p>
      <div className="row-actions" style={{ marginBottom: 8 }}>
        <button className="btn small" onClick={() => bulk((e) => set(e.id, { mode: 'always' }))}>Everyone always on duty</button>
        <button className="btn ghost small" onClick={clearAll} disabled={!Object.keys(overrides).length}>Reset all to default hours</button>
      </div>
      {!list.length && <p className="hint">NPCs register as the world loads. Walk the world for a moment and reopen this screen.</p>}
      {places.map((pl) => (
        <section key={pl}>
          <h3>{pl}</h3>
          <div className="admin-list">
            {list.filter((e) => e.place === pl).map((e) => <Row key={e.id} e={e} hour={hour} />)}
          </div>
        </section>
      ))}
    </Panel>
  )
}
