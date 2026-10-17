import { useEffect, useState } from 'react'
import { Panel } from './UI.jsx'
import { useBackend } from '../backend/backend.js'
import { useMedia } from '../media/media.js'
import { now } from '../cinema/cinema.js'
import {
  useGuide, programFor, upcomingFor, addSlot, removeSlot, targets, localToUtcMin, utcMinToLocal, clock,
} from '../guide/guide.js'
import { liveFeeds } from '../guide/guidePlayer.js'

const fmt = (s) => {
  if (!Number.isFinite(s)) return '–:––'
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60)
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0')
}
const whenLabel = (ms) => {
  const d = new Date(ms)
  const today = new Date()
  const tomorrow = new Date(today.getTime() + 86400000)
  const day = d.toDateString() === today.toDateString() ? 'Today' : d.toDateString() === tomorrow.toDateString() ? 'Tomorrow' : d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  return `${day} ${clock(d)}`
}
const targetLabel = (t, screens) => {
  if (!t || t.type === 'all') return 'All screens'
  if (t.type === 'venue') return t.value
  return screens[t.value]?.name || t.value
}

/** The TV guide: what every screen is showing now and later, and (for the owner) the schedule editor. */
export default function GuidePanel() {
  const admin = useBackend((s) => s.admin)
  const { slots, screens, volume, muted, blocked } = useGuide()
  const items = useMedia((s) => s.items)
  const [, tick] = useState(0)
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t) }, [])
  const t = now()
  const list = Object.values(screens)
  const airing = list.map((s) => ({ s, p: programFor(s.id, t, slots, items, screens) })).filter((x) => x.p)
  const venues = [...new Set(airing.map((x) => x.s.venue))].sort()
  const nextUp = slots
    .map((slot) => {
      const media = items.find((m) => m.id === slot.mediaId)
      const start = slot.mode === 'once' ? slot.startAt : (() => {
        const base = (slot.utcMin || 0) * 60000
        return (Math.floor((t - base) / 86400000) + 1) * 86400000 + base
      })()
      return { slot, media, start }
    })
    .sort((a, b) => a.start - b.start)
  const feeds = liveFeeds()

  return (
    <Panel title="TV guide" eyebrow="Every screen in the world">
      <div className="fields">
        <p className="hint">{list.length} screens are on the guide. The guide runs on the real clock, so everyone sees the same programme at the same moment. TVs you switch to another channel step out of the guide; switch them back off and on to rejoin it.</p>

        <p className="eyebrow">On air now</p>
        {airing.length === 0 && <p className="hint">Nothing is scheduled to be airing right now. Screens show their usual channels.</p>}
        {venues.map((v) => (
          <div key={v} className="admin-list">
            {airing.filter((x) => x.s.venue === v).map(({ s, p }) => (
              <div className="admin-row" key={s.id} data-screen={s.id}>
                <div className="grow"><b>{p.media.title}{p.media.kind === 'video' ? ' · music video' : ''}</b><small>{s.name} · {s.venue}</small></div>
                <span className="badge live">{fmt(p.position)} / {fmt((p.endsAt - p.start) / 1000)}</span>
              </div>
            ))}
          </div>
        ))}
        {feeds.length > 0 && <p className="hint">Decoding video on the {feeds.length === 1 ? 'nearest screen' : feeds.length + ' nearest screens'} only, to keep things smooth; the rest pick up mid-programme when you walk over.</p>}

        <div className="row">
          <span><b>Screen sound</b><small>Only changes what you hear. It fades with distance from the screen.</small></span>
          <div className="row-actions">
            <button className="btn ghost small" onClick={() => useGuide.setState({ muted: !muted })}>{muted ? 'Unmute' : 'Mute'}</button>
            <input id="guide-volume" type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume} onChange={(e) => useGuide.setState({ volume: +e.target.value, muted: false })} aria-label="Screen volume" />
          </div>
        </div>
        {blocked && <p className="hint">Your browser is holding screen sound back until you tap or click anywhere.</p>}

        <p className="eyebrow">Schedule</p>
        {nextUp.length === 0 && <p className="hint">{admin ? 'Nothing scheduled yet. Add a programme below.' : 'The owner has not scheduled anything yet.'}</p>}
        <div className="admin-list">
          {nextUp.map(({ slot, media, start }) => (
            <div className="admin-row" key={slot.id} data-slot={slot.id}>
              <div className="grow">
                <b>{media?.title || slot.title}{!media ? ' (removed from the library)' : ''}</b>
                <small>{targetLabel(slot.target, screens)} · {slot.mode === 'daily' ? `daily at ${clock(utcMinToLocal(slot.utcMin))}` : `once, ${whenLabel(slot.startAt)}`} · next {whenLabel(start)}</small>
              </div>
              {admin && <button className="btn ghost small" onClick={() => removeSlot(slot.id)}>Remove</button>}
            </div>
          ))}
        </div>

        {admin ? <Editor /> : null}
      </div>
    </Panel>
  )
}

function Editor() {
  const items = useMedia((s) => s.items)
  const screens = useGuide((s) => s.screens)
  const media = items.filter((m) => (m.kind === 'video' || m.kind === 'movie') && m.published)
  const { venues } = targets()
  const list = Object.values(screens).sort((a, b) => (a.venue + a.name).localeCompare(b.venue + b.name))
  const [type, setType] = useState('all')
  const [value, setValue] = useState('')
  const [pick, setPick] = useState('')
  const [mode, setMode] = useState('daily')
  const [time, setTime] = useState('20:00')
  const [err, setErr] = useState(null)
  const [done, setDone] = useState(null)
  useEffect(() => { if (!pick && media[0]) setPick(media[0].id) }, [media.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = media.find((m) => m.id === pick)
  const target = type === 'all' ? { type } : { type, value: value || (type === 'venue' ? venues[0] : list[0]?.id) }
  const run = async (fn) => { setErr(null); setDone(null); try { await fn() } catch (e) { setErr(e.message || String(e)) } }

  const add = () => run(async () => {
    const [hh, mm] = time.split(':').map(Number)
    await addSlot({ target, media: chosen, mode, utcMin: localToUtcMin(hh, mm), startAt: mode === 'once' ? onceAt(hh, mm) : 0 })
    setDone('Added to the guide.')
  })
  const playNow = () => run(async () => {
    await addSlot({ target, media: chosen, mode: 'once', startAt: Date.now() + 3000 })
    setDone('Starting in a few seconds on the chosen screens.')
  })

  return (
    <div className="fields" id="guide-editor">
      <p className="eyebrow">Add a programme</p>
      {media.length === 0 ? <p className="hint">Publish a music video or movie in Owner tools → Media library first.</p> : (
        <>
          <div className="field">
            <span>Show</span>
            <select id="guide-media" value={pick} onChange={(e) => setPick(e.target.value)}>
              {media.map((m) => <option key={m.id} value={m.id}>{m.title}{m.kind === 'video' ? ' (music video)' : ' (movie)'}{m.duration ? ` · ${fmt(m.duration)}` : ''}</option>)}
            </select>
          </div>
          <div className="field">
            <span>On</span>
            <select id="guide-target-type" value={type} onChange={(e) => { setType(e.target.value); setValue('') }}>
              <option value="all">Every screen</option>
              <option value="venue">All screens in a place</option>
              <option value="screen">One screen</option>
            </select>
          </div>
          {type === 'venue' && (
            <div className="field"><span>Place</span>
              <select id="guide-venue" value={value || venues[0] || ''} onChange={(e) => setValue(e.target.value)}>{venues.map((v) => <option key={v} value={v}>{v}</option>)}</select>
            </div>
          )}
          {type === 'screen' && (
            <div className="field"><span>Screen</span>
              <select id="guide-screen" value={value || list[0]?.id || ''} onChange={(e) => setValue(e.target.value)}>{list.map((s) => <option key={s.id} value={s.id}>{s.venue} · {s.name}</option>)}</select>
            </div>
          )}
          <div className="field">
            <span>When</span>
            <div className="row-actions">
              <select id="guide-mode" value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="daily">Every day at</option>
                <option value="once">Once, next time it is</option>
              </select>
              <input id="guide-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <small className="hint">Times are your local time ({Intl.DateTimeFormat().resolvedOptions().timeZone}); other visitors see them in theirs.</small>
          <div className="row-actions">
            <button className="btn primary" id="guide-add" disabled={!chosen} onClick={add}>Add to guide</button>
            <button className="btn" id="guide-now" disabled={!chosen} onClick={playNow}>Play now</button>
          </div>
        </>
      )}
      {done && <p className="hint">{done}</p>}
      {err && <p className="error">{err}</p>}
    </div>
  )
}

/** The next moment at local hh:mm (today if still ahead, otherwise tomorrow). */
function onceAt(hh, mm) {
  const d = new Date()
  d.setHours(hh, mm, 0, 0)
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1)
  return d.getTime()
}
