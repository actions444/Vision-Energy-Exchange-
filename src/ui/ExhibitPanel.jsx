import { Panel } from './UI.jsx'
import { useMuseum, stampCount } from '../state/museum.js'
import { EXHIBITS, EXHIBIT, MUS_HALLS } from '../config/museum.js'

/** A museum placard: what the exhibit is, the history behind it, and the visitor's passport of stamped exhibits. */
export default function ExhibitPanel() {
  const { current, tab, setTab, stamps, open, reset } = useMuseum()
  const e = EXHIBIT[current] || EXHIBITS[0]
  const n = stampCount(stamps)
  return (
    <Panel title={tab === 'exhibit' ? e.title : 'My passport'} eyebrow={tab === 'exhibit' ? `Museum of American Heritage · ${e.hall} · ${e.kicker}` : 'Museum of American Heritage'} wide>
      <div className="chips tabs" role="tablist">
        <button role="tab" id="mus-tab-exhibit" aria-selected={tab === 'exhibit'} className={'chip-btn' + (tab === 'exhibit' ? ' on' : '')} onClick={() => setTab('exhibit')}>Exhibit</button>
        <button role="tab" id="mus-tab-pass" aria-selected={tab === 'passport'} className={'chip-btn' + (tab === 'passport' ? ' on' : '')} onClick={() => setTab('passport')}>Passport {n}/{EXHIBITS.length}</button>
      </div>
      {tab === 'exhibit' ? (
        <>
          <p style={{ fontSize: 15, lineHeight: 1.55, margin: '12px 0 8px' }}>{e.body}</p>
          <ul className="ticks">{e.facts.map((f, i) => <li key={i}>{f}</li>)}</ul>
          <p className="note">Stamped in your passport · {n} of {EXHIBITS.length} exhibits read. Placards are original summaries of well-documented history.</p>
        </>
      ) : (
        <>
          <p className="note" style={{ marginTop: 10 }}>{n === EXHIBITS.length ? 'Every exhibit stamped: you are a Heritage Explorer. Thank you for visiting.' : 'Read the placard at each exhibit to stamp your passport. Tap an exhibit to read it again.'}</p>
          {MUS_HALLS.map((h) => {
            const list = EXHIBITS.filter((x) => x.hall === h)
            if (!list.length) return null
            return (
              <div key={h} style={{ marginTop: 10 }}>
                <p className="eyebrow">{h}</p>
                <div className="chips" style={{ flexWrap: 'wrap', overflow: 'visible' }}>
                  {list.map((x) => <button key={x.id} className={'chip-btn' + (stamps[x.id] ? ' on' : '')} onClick={() => open(x.id)}>{stamps[x.id] ? '✓ ' : ''}{x.title}</button>)}
                </div>
              </div>
            )
          })}
          <p className="note"><button className="chip-btn" onClick={reset}>Clear my stamps</button> Saved on this device only.</p>
        </>
      )}
    </Panel>
  )
}
