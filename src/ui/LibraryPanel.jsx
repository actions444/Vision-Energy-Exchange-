import { useEffect, useRef, useState } from 'react'
import { Panel } from './UI.jsx'
import { useLibrary, live, askTeacher, canAsk, fallbackTip } from '../state/library.js'
import { TEACHERS, LIBRARIAN, PROJECTS, BOOKS } from '../config/library.js'

const ALL = [LIBRARIAN, ...TEACHERS]
const person = (id) => ALL.find((p) => p.id === id) || TEACHERS[0]

/** Talk to a library teacher, join their project, tick off the steps, earn a badge. Progress is saved on this device. */
export default function LibraryPanel() {
  const lib = useLibrary()
  const t = person(lib.teacherId || TEACHERS[0].id)
  const isLib = t.id === LIBRARIAN.id
  const [tab, setTab] = useState(isLib ? 'badges' : lib.view === 'projects' ? 'project' : 'talk')
  useEffect(() => { setTab(isLib ? 'badges' : 'talk') }, [t.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const proj = !isLib && t.project ? PROJECTS[t.project] : null
  return (
    <Panel title={t.name} eyebrow={`Vision Storms Public Library · ${t.subject}`} wide>
      <div className="chips tabs" role="tablist">
        {!isLib && <button role="tab" id="lib-tab-talk" aria-selected={tab === 'talk'} className={'chip-btn' + (tab === 'talk' ? ' on' : '')} onClick={() => setTab('talk')}>Talk</button>}
        {proj && <button role="tab" id="lib-tab-project" aria-selected={tab === 'project'} className={'chip-btn' + (tab === 'project' ? ' on' : '')} onClick={() => setTab('project')}>Project</button>}
        <button role="tab" id="lib-tab-badges" aria-selected={tab === 'badges'} className={'chip-btn' + (tab === 'badges' ? ' on' : '')} onClick={() => setTab('badges')}>My library card</button>
        <button role="tab" id="lib-tab-staff" aria-selected={tab === 'staff'} className={'chip-btn' + (tab === 'staff' ? ' on' : '')} onClick={() => setTab('staff')}>Teachers</button>
      </div>
      {tab === 'talk' && !isLib && <Talk t={t} proj={proj} goProject={() => setTab('project')} />}
      {tab === 'project' && proj && <Project t={t} proj={proj} />}
      {tab === 'badges' && <Card />}
      {tab === 'staff' && <Staff pick={(id) => { useLibrary.getState().open(id, 'teacher') }} />}
      <p className="note">Teachers here are AI characters. Your project progress and badges are saved on this device only.</p>
    </Panel>
  )
}

function Talk({ t, proj, goProject }) {
  const lib = useLibrary()
  const [msgs, setMsgs] = useState(() => [{ role: 'assistant', content: t.greeting }])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [ai, setAi] = useState(null)
  const ctl = useRef(null)
  const end = useRef(null)
  useEffect(() => { setMsgs([{ role: 'assistant', content: t.greeting }]); setText('') }, [t.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { let on = true; canAsk().then((v) => on && setAi(v)); return () => { on = false } }, [])
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [msgs])
  const book = BOOKS[t.book]
  const prog = proj && lib.progress[proj.id]
  const stepsDone = prog ? prog.steps.filter(Boolean).length : 0

  const send = async (q) => {
    q = (q ?? text).trim()
    if (!q || busy) return
    setText('')
    const history = [...msgs.filter((m, i) => !(i === 0 && m.role === 'assistant')), { role: 'user', content: q }]
    setMsgs((m) => [...m, { role: 'user', content: q }, { role: 'assistant', content: '…' }])
    setBusy(true)
    try {
      if (!ai) throw { code: 'unavailable' }
      ctl.current = new AbortController()
      let latest = ''
      const out = await askTeacher(t, history, { project: proj, stepsDone }, { signal: ctl.current.signal, onText: ({ text: tx }) => { latest = tx; setMsgs((m) => [...m.slice(0, -1), { role: 'assistant', content: tx }]) } })
      setMsgs((m) => [...m.slice(0, -1), { role: 'assistant', content: out || latest }])
    } catch (e) {
      const fb = e?.code === 'unavailable' || e?.code === 'not_granted'
        ? scripted(t, q, proj, stepsDone)
        : e?.code === 'aborted' ? 'Okay, I will stop there.' : `${t.short} looks a little busy right now. Here is a tip while you wait: ${fallbackTip(t.id)}`
      setMsgs((m) => [...m.slice(0, -1), { role: 'assistant', content: fb }])
    } finally { setBusy(false); ctl.current = null }
  }

  return (
    <div className="lib-talk">
      <p>{t.bio}</p>
      <p className="note" id="lib-now">Right now: {live[t.id] || 'getting ready'}</p>
      {book && (
        <div className="notice">
          Currently reading <strong>{book.title}</strong> by {book.by}. {book.note}
        </div>
      )}
      <div className="lib-chat" style={{ display: 'grid', gap: 8, margin: '12px 0', maxHeight: 260, overflowY: 'auto' }} aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} style={{ justifySelf: m.role === 'user' ? 'end' : 'start', maxWidth: '86%', padding: '8px 12px', borderRadius: 14, background: m.role === 'user' ? 'rgba(201,169,106,.25)' : 'rgba(255,255,255,.07)', fontSize: 14, lineHeight: 1.4 }}>
            {m.role === 'assistant' && <strong style={{ display: 'block', fontSize: 11, opacity: .7 }}>{t.short}</strong>}{m.content}
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="chips">
        {['What are you reading?', 'Give me a tip', proj ? 'Help with my project' : 'What can I learn here?'].map((q) => (
          <button key={q} className="chip-btn" onClick={() => send(q)} disabled={busy}>{q}</button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send() }} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input id="lib-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={`Ask ${t.short} something…`} style={{ flex: 1 }} aria-label={`Ask ${t.short}`} />
        {busy && ai ? <button type="button" onClick={() => ctl.current?.abort()}>Stop</button> : <button type="submit" disabled={busy || !text.trim()}>Ask</button>}
      </form>
      <p className="note">{ai === null ? 'Checking whether live answers are available…' : ai ? `Live answers use your own Claude account the first time you ask (you will be asked to allow it).` : 'Live answers are not available in this copy of the world, so teachers reply with prepared tips and project help.'}</p>
      {proj && <button className="cta-secondary" style={{ marginTop: 8 }} onClick={goProject}>See the project: {proj.title}</button>}
    </div>
  )
}

/** Pre-written replies used when live answers are not available. */
function scripted(t, q, proj, done) {
  const l = q.toLowerCase()
  const b = BOOKS[t.book]
  if (l.includes('reading') || l.includes('book')) return b ? `${b.title} by ${b.by}. ${b.note}` : 'I am between books, any recommendations?'
  if (proj && (l.includes('project') || l.includes('help'))) {
    const next = proj.steps.findIndex((_, i) => i >= done)
    return done >= proj.steps.length ? `You have finished every step of "${proj.title}". Well done: share it on the Community Wall.` : `Next up for "${proj.title}": ${proj.steps[Math.max(0, next)][0]}. ${proj.steps[Math.max(0, next)][1]}`
  }
  if (l.includes('learn')) return `${t.subject}: ask me about it, or try one of my projects. Everything here is free.`
  return fallbackTip(t.id)
}

function Project({ t, proj }) {
  const lib = useLibrary()
  const prog = lib.progress[proj.id]
  const [fb, setFb] = useState(null)
  const done = prog ? prog.steps.filter(Boolean).length : 0
  return (
    <div className="lib-project">
      <h3 style={{ margin: '4px 0' }}>{proj.title}</h3>
      <p>{proj.blurb}</p>
      <p className="note">About {proj.time} · led by {t.short} · earns the <strong>{proj.badge}</strong> badge</p>
      {!prog ? (
        <button id="lib-join" className="cta" onClick={() => { lib.join(proj.id); setFb(`${t.short}: ${t.greeting}`) }}>Join this project</button>
      ) : (
        <>
          <div className="meter-row"><div className="meter accent"><span className="meter-label">Progress</span><strong>{done} / {proj.steps.length}</strong><em>{prog.done ? `${proj.badge} badge earned` : 'steps done'}</em></div></div>
          <ol style={{ display: 'grid', gap: 8, paddingLeft: 0, listStyle: 'none' }}>
            {proj.steps.map((s, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 12, background: prog.steps[i] ? 'rgba(111,207,151,.12)' : 'rgba(255,255,255,.05)' }}>
                <input type="checkbox" id={`lib-step-${i}`} checked={prog.steps[i]} onChange={() => { const r = lib.toggleStep(proj.id, i); setFb(r?.ticked ? `${t.short}: ${proj.steps[i][2]}${r.justDone ? ` You earned the ${proj.badge} badge!` : ''}` : null) }} style={{ marginTop: 4 }} />
                <label htmlFor={`lib-step-${i}`}><strong>{i + 1}. {s[0]}</strong><br /><span style={{ fontSize: 13, opacity: .85 }}>{s[1]}</span></label>
              </li>
            ))}
          </ol>
          {fb && <p className="notice" id="lib-feedback">{fb}</p>}
          <button className="chip-btn" onClick={() => { lib.reset(proj.id); setFb(null) }}>Start over</button>
        </>
      )}
    </div>
  )
}

function Card() {
  const lib = useLibrary()
  const started = Object.keys(lib.progress)
  return (
    <div>
      <div className="meter-row">
        <div className="meter accent"><span className="meter-label">Badges</span><strong>{lib.badges.length}</strong><em>{lib.badges.join(' · ') || 'none yet'}</em></div>
        <div className="meter"><span className="meter-label">Projects started</span><strong>{started.length}</strong><em>of {Object.keys(PROJECTS).length}</em></div>
      </div>
      <ul style={{ paddingLeft: 18, display: 'grid', gap: 6 }}>
        {Object.values(PROJECTS).map((p) => {
          const pr = lib.progress[p.id]
          const n = pr ? pr.steps.filter(Boolean).length : 0
          return <li key={p.id}><strong>{p.title}</strong>: {pr ? (pr.done ? 'finished' : `${n} of ${p.steps.length} steps`) : 'not started'}</li>
        })}
      </ul>
      <p className="note">Library cards are free. Ask Ms. Carter at the check-out desk, or any teacher, to start a project.</p>
    </div>
  )
}

function Staff({ pick }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {ALL.map((p) => (
        <button key={p.id} className="chip-btn" style={{ textAlign: 'left', whiteSpace: 'normal', padding: 10 }} onClick={() => pick(p.id)}>
          <strong>{p.name}</strong> · {p.subject}<br /><span style={{ fontWeight: 400, opacity: .8 }}>{live[p.id] || 'in the library'}</span>
        </button>
      ))}
    </div>
  )
}
