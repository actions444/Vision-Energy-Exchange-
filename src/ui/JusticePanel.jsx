import { useState } from 'react'
import { Panel } from './UI.jsx'
import { useJustice, SCENARIOS, scenarioById } from '../state/justice.js'

const REPORT_KEY = 'vsw-justice-reports'
function saveReport(entry) {
  try {
    const all = JSON.parse(localStorage.getItem(REPORT_KEY) || '[]')
    all.push(entry)
    localStorage.setItem(REPORT_KEY, JSON.stringify(all.slice(-50)))
    return true
  } catch { return false }
}

/**
 * Justice roleplay. Optional and fictional: every scenario is played with NPCs only, other players
 * are never cast, and "End scenario" is on screen at every step and works instantly.
 * "Report a problem" saves a note on this device. There is no moderator inbox connected yet, and
 * the panel says so instead of implying someone is notified.
 */
export default function JusticePanel() {
  const j = useJustice()
  const [note, setNote] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  const [saved, setSaved] = useState(null)
  const sc = scenarioById(j.scenarioId)

  const submit = () => {
    const ok = saveReport({ at: new Date().toISOString(), scenario: j.scenarioId, step: j.step, note: note.trim() })
    setSaved(ok)
    if (ok) { j.report(); setNote('') }
  }

  const safety = (
    <div className="note" id="justice-safety">
      <strong>Optional roleplay, all fiction.</strong> Scenarios use NPCs only. Other players can never be arrested,
      detained or imprisoned here, and every door in this district opens from both sides. You can stop at any time.
    </div>
  )

  const exitBar = (
    <div className="row-actions">
      <button className="btn primary" id="justice-end" onClick={j.end}>End scenario</button>
      <button className="btn small" id="justice-report-toggle" onClick={() => { setReportOpen((o) => !o); setSaved(null) }}>Report a problem</button>
    </div>
  )

  const report = reportOpen && (
    <div className="note warn" id="justice-report">
      {saved === true || j.reported ? (
        <p>Saved on this device. A moderator inbox isn't connected to this world yet, so nobody has been notified.
          If something is wrong, press <strong>End scenario</strong> and walk away. Nothing here can hold you.</p>
      ) : (
        <>
          <p>Tell us what went wrong (optional). This is saved on this device; it is not sent to anyone yet.</p>
          <textarea id="justice-report-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} style={{ width: '100%' }} />
          <div className="row-actions">
            <button className="btn small" id="justice-report-save" onClick={submit}>Save report</button>
            <button className="btn small" onClick={() => setReportOpen(false)}>Cancel</button>
          </div>
          {saved === false && <p>Could not save on this device.</p>}
        </>
      )}
    </div>
  )

  if (j.view === 'running' && sc) {
    const s = sc.steps[j.step]
    const role = sc.roles.find((r) => r.id === j.roleId)
    return (
      <Panel title={sc.title} eyebrow={`${sc.place} · ${role?.name || ''} · step ${j.step + 1} of ${sc.steps.length}`}>
        <p className="eyebrow">{s.speaker}</p>
        <p id="justice-line">{s.text}</p>
        <div className="row-actions">
          <button className="btn primary" id="justice-next" onClick={j.next}>{j.step + 1 >= sc.steps.length ? 'Finish' : 'Next'}</button>
        </div>
        {exitBar}
        {report}
        {safety}
      </Panel>
    )
  }

  if (j.view === 'done' && sc) {
    return (
      <Panel title="Scenario complete" eyebrow={sc.title}>
        <p>That's the end of the story. Nothing from it affects your account or any record.</p>
        <div className="row-actions">
          <button className="btn primary" id="justice-again" onClick={() => j.openMenu(null)}>Choose another</button>
          <button className="btn small" id="justice-end" onClick={j.end}>Close</button>
        </div>
        {safety}
      </Panel>
    )
  }

  // menu
  return (
    <Panel title="Justice roleplay" eyebrow="Vision Storms Justice & Rehabilitation District">
      {safety}
      {!sc ? (
        <ul className="zone-list">
          {SCENARIOS.map((s) => (
            <li key={s.id}>
              <div>
                <strong>{s.title}</strong>
                <em> · {s.place}</em>
                <p className="hint">{s.blurb}</p>
              </div>
              <button className="btn small" id={'justice-pick-' + s.id} onClick={() => j.pick(s.id)}>Choose</button>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <p><strong>{sc.title}</strong></p>
          <p className="hint">{sc.blurb}</p>
          <p className="eyebrow">Pick your part (all other parts are NPCs)</p>
          <ul className="zone-list">
            {sc.roles.map((r) => (
              <li key={r.id}>
                <div><strong>{r.name}</strong><p className="hint">{r.note}</p></div>
                <button className={'btn small ' + (j.roleId === r.id ? 'primary' : '')} id={'justice-role-' + r.id} onClick={() => j.setRole(r.id)}>
                  {j.roleId === r.id ? 'Selected' : 'Select'}
                </button>
              </li>
            ))}
          </ul>
          <div className="row-actions">
            <button className="btn primary" id="justice-start" disabled={!j.roleId} onClick={j.start}>Start scenario</button>
            <button className="btn small" onClick={() => j.pick(null)}>Back</button>
          </div>
        </>
      )}
      <div className="row-actions">
        <button className="btn small" id="justice-report-toggle" onClick={() => { setReportOpen((o) => !o); setSaved(null) }}>Report a problem</button>
      </div>
      {report}
    </Panel>
  )
}
