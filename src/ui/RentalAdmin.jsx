import { useEffect, useState } from 'react'
import { Panel } from './UI.jsx'
import { useRentals } from '../rentals/client.js'
import { FEATURES, money } from '../../shared/rentals.js'
import { PLAZA_ROOMS } from '../config/plaza.js'
import { ROOM_INFO } from '../config/roomInfo.js'
import { backend, useBackend } from '../backend/backend.js'
import { playerState, cameraState } from '../state/runtime.js'
import { useStore } from '../state/store.js'
import { useRentDraft } from '../rentals/preview.js'

const fmt = (iso) => new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
const localInput = (iso) => { const d = new Date(iso); const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 16) }
const STATUS = { pending_payment: 'Unpaid', pending_approval: 'Needs approval', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled', completed: 'Completed', expired: 'Expired' }

// Owner dashboard: rentable rooms, prices, availability, requests, assignments, revenue.
export default function RentalAdmin() {
  const r = useRentals()
  const [tab, setTab] = useState('requests')
  const [err, setErr] = useState(null)
  const load = () => r.loadAdmin().then(() => setErr(null)).catch((e) => setErr(e.message))
  useEffect(() => { load() }, [r.mode, r.apiBase, r.adminToken]) // eslint-disable-line react-hooks/exhaustive-deps
  const s = r.adminState
  const pending = s?.bookings.filter((b) => b.status === 'pending_approval') || []
  const act = (...a) => r.adminDo(...a).then(() => setErr(null)).catch((e) => setErr(e.message))

  return (
    <Panel title="Rentals admin" eyebrow={r.mode === 'server' ? `Server · payments: ${s?.paymentMode || '…'}` : 'Preview sandbox (this browser only)'} wide>
      <div className="seg tabs" role="tablist">
        {[['requests', `Requests${pending.length ? ` (${pending.length})` : ''}`], ['prices', 'Prices'], ['rooms', 'Rooms'], ['bookings', 'Bookings'], ['assign', 'Assign'], ['revenue', 'Revenue'], ['connect', 'Server']].map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {err && <p className="error">{err}</p>}
      {!s && tab !== 'connect' && <p className="hint">{r.mode === 'server' ? 'Enter your owner token in the Server tab.' : 'Loading…'}</p>}
      {s && tab === 'requests' && <Requests s={s} act={act} />}
      {s && tab === 'prices' && <Prices s={s} act={act} />}
      {s && tab === 'rooms' && <Rooms s={s} act={act} />}
      {s && tab === 'bookings' && <Bookings s={s} act={act} />}
      {s && tab === 'assign' && <Assign s={s} act={act} />}
      {s && tab === 'revenue' && <Revenue s={s} />}
      {tab === 'connect' && <Connect reload={load} />}
    </Panel>
  )
}

function Requests({ s, act }) {
  const list = s.bookings.filter((b) => b.status === 'pending_approval')
  const [reason, setReason] = useState('')
  if (!list.length) return <p className="hint">No requests waiting. Paid bookings that need your approval show up here.</p>
  return (
    <div className="admin-list">
      {list.map((b) => (
        <div className="admin-row" key={b.id}>
          <div className="grow">
            <b>{b.roomId} · {b.customerName}</b>
            <small>{fmt(b.start)} → {fmt(b.end)} · {b.guests} guests · {b.visibility} · {money(b.amount, b.currency)} {b.payment.test ? '(test payment)' : `paid via ${b.payment.provider}`}</small>
          </div>
          <button className="btn primary" onClick={() => act('decide', b.id, true)}>Approve</button>
          <input aria-label="Reason" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} style={{ maxWidth: 180 }} />
          <button className="btn ghost" onClick={() => act('decide', b.id, false, reason)}>Reject</button>
        </div>
      ))}
    </div>
  )
}

// Price categories: introductory monthly prices the owner can change at any time.
function Prices({ s, act }) {
  const [list, setList] = useState(() => (s.categories || []).map((c) => ({ ...c })))
  useEffect(() => { setList((s.categories || []).map((c) => ({ ...c }))) }, [s.categories])
  const [msg, setMsg] = useState(null)
  const dirty = JSON.stringify(list) !== JSON.stringify(s.categories || [])
  const roomsIn = (id) => s.rooms.filter((r) => r.category === id)
  const save = async () => { await act('setCategories', list); setMsg('Saved. Existing bookings keep the price they were made at.') }
  return (
    <div className="admin-list">
      <p className="hint">Monthly prices by property type. Change a price, save, then use “Apply to rooms” to give every room in that category the new monthly price. Bookings that already exist are never changed. Hourly event rates are set per room (Rooms tab).</p>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Category</th><th>Per month ($)</th><th>Rooms</th><th></th></tr></thead>
          <tbody>
            {list.map((c, i) => (
              <tr key={c.id}>
                <td><input aria-label="Category name" value={c.name} onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} /></td>
                <td><input aria-label={'Monthly price for ' + c.name} type="number" min={0} step="0.01" value={(c.month / 100).toFixed(2)} onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, month: Math.round(+e.target.value * 100) } : x)))} style={{ width: 90 }} /></td>
                <td>{roomsIn(c.id).map((r) => r.id).join(', ') || '—'}</td>
                <td><button className="btn ghost small" disabled={dirty || !roomsIn(c.id).length} onClick={() => act('applyCategory', c.id).then(() => setMsg(`${c.name}: rooms now ${money(c.month)}/month.`))}>Apply to rooms</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row-actions">
        <button className="btn ghost" onClick={() => setList([...list, { id: 'category-' + (list.length + 1), name: 'New category', month: 999 }])}>Add category</button>
        <button className="btn primary" disabled={!dirty} onClick={save}>Save prices</button>
      </div>
      {msg && <p className="hint">{msg}</p>}
      <p className="hint">Payments: no money is charged until a payment provider is configured on the server. Monthly rentals are single 30-day payments; automatic monthly billing is not switched on.</p>
    </div>
  )
}

function Rooms({ s, act }) {
  const [sel, setSel] = useState(s.rooms[0]?.id)
  const room = s.rooms.find((x) => x.id === sel)
  const [draft, setDraft] = useState(null)
  useEffect(() => { setDraft(room ? JSON.parse(JSON.stringify(room)) : null) }, [sel, s]) // eslint-disable-line react-hooks/exhaustive-deps
  const [nu, setNu] = useState({ id: '', space: '' })
  const unrented = PLAZA_ROOMS.filter((p) => !s.rooms.some((r) => r.id === p.id))
  const create = () => {
    const base = PLAZA_ROOMS.find((p) => p.id === nu.space)
    act('createRoom', { id: nu.id || base?.id, name: base?.name || nu.id, kind: base?.kind || 'Rental space', floor: (base?.floor ?? 0) + 1, occupancy: base?.occupancy || 10, category: 'standard-room', prices: { hour: 0, day: 0, week: 0, month: (s.categories || []).find((c) => c.id === 'standard-room')?.month || 999 }, features: ['welcome'] })
    setNu({ id: '', space: '' })
  }
  const dollars = (c) => (c / 100).toFixed(2)
  return (
    <div className="admin-split">
      <div className="admin-side">
        {s.rooms.map((x) => (
          <button key={x.id} className={'pick' + (x.id === sel ? ' on' : '')} onClick={() => setSel(x.id)}>{x.id}<small>{x.name}{x.active ? '' : ' · off'}</small></button>
        ))}
        <div className="fields">
          <select aria-label="Space" value={nu.space} onChange={(e) => setNu({ ...nu, space: e.target.value, id: e.target.value })}>
            <option value="">Make a space rentable…</option>
            {unrented.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.name}</option>)}
          </select>
          <input aria-label="Room ID" placeholder="Unique ID, e.g. VSP-101" value={nu.id} onChange={(e) => setNu({ ...nu, id: e.target.value.toUpperCase() })} />
          <button className="btn primary" disabled={!nu.id} onClick={create}>Create rentable room</button>
        </div>
      </div>
      {draft && (
        <div className="admin-main fields">
          <div className="fields two">
            <label className="field"><span>Name</span><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
            <label className="field"><span>Max occupancy</span><input type="number" min={1} value={draft.occupancy} onChange={(e) => setDraft({ ...draft, occupancy: +e.target.value })} /></label>
          </div>
          <div className="fields two">
            <label className="field"><span>Price category</span>
              <select value={draft.category || ''} onChange={(e) => { const c = (s.categories || []).find((x) => x.id === e.target.value); setDraft({ ...draft, category: e.target.value || null, prices: c ? { ...draft.prices, month: c.month } : draft.prices }) }}>
                <option value="">No category (custom prices)</option>
                {(s.categories || []).map((c) => <option key={c.id} value={c.id}>{c.name} · {money(c.month)}/month</option>)}
              </select>
            </label>
            <label className="row toggle compact"><span><b>Event venue</b><small>Can also be booked by the hour.</small></span><input type="checkbox" checked={!!draft.eventVenue} onChange={(e) => setDraft({ ...draft, eventVenue: e.target.checked, prices: { ...draft.prices, hour: e.target.checked ? draft.prices.hour || 499 : 0 } })} /></label>
          </div>
          <div className="fields four">
            {['month', 'week', 'day', 'hour'].map((k) => (
              <label key={k} className="field"><span>Per {k} ($){k === 'hour' ? ' · events' : ''}{k !== 'month' ? ' · 0 = not offered' : ''}</span><input type="number" min={0} step="0.01" value={dollars(draft.prices[k])} onChange={(e) => setDraft({ ...draft, prices: { ...draft.prices, [k]: Math.round(+e.target.value * 100) } })} /></label>
            ))}
          </div>
          <label className="row toggle"><span><b>Available for rent</b><small>Turn off to hide it from customers.</small></span><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /></label>
          <label className="row toggle"><span><b>Approve automatically after payment</b><small>Off means you approve each request.</small></span><input type="checkbox" checked={draft.autoApprove} onChange={(e) => setDraft({ ...draft, autoApprove: e.target.checked })} /></label>
          <label className="row toggle"><span><b>Open to visitors when not rented</b></span><input type="checkbox" checked={draft.openWhenVacant} onChange={(e) => setDraft({ ...draft, openWhenVacant: e.target.checked })} /></label>
          <div className="field">
            <span>Renters may customise</span>
            <div className="checks">
              {Object.entries(FEATURES).map(([k, f]) => (
                <label key={k}><input type="checkbox" checked={draft.features.includes(k)} onChange={(e) => setDraft({ ...draft, features: e.target.checked ? [...draft.features, k] : draft.features.filter((x) => x !== k) })} /> {f.label}</label>
              ))}
            </div>
          </div>
          <ListingEditor draft={draft} setDraft={setDraft} />
          <Blackouts draft={draft} setDraft={setDraft} />
          <button className="btn primary" onClick={() => act('updateRoom', draft.id, draft)}>Save {draft.id}</button>
        </div>
      )}
    </div>
  )
}

function Blackouts({ draft, setDraft }) {
  const [b, setB] = useState({ start: '', end: '', reason: '' })
  return (
    <div className="field">
      <span>Unavailable dates</span>
      {draft.blackouts.map((x, i) => (
        <div className="admin-row" key={i}><span className="grow">{fmt(x.start)} → {fmt(x.end)} {x.reason && `· ${x.reason}`}</span><button className="btn ghost" onClick={() => setDraft({ ...draft, blackouts: draft.blackouts.filter((_, j) => j !== i) })}>Remove</button></div>
      ))}
      <div className="admin-row">
        <input type="datetime-local" aria-label="From" value={b.start} onChange={(e) => setB({ ...b, start: e.target.value })} />
        <input type="datetime-local" aria-label="To" value={b.end} onChange={(e) => setB({ ...b, end: e.target.value })} />
        <input aria-label="Reason" placeholder="Reason" value={b.reason} onChange={(e) => setB({ ...b, reason: e.target.value })} />
        <button className="btn" disabled={!b.start || !b.end} onClick={() => { setDraft({ ...draft, blackouts: [...draft.blackouts, { start: new Date(b.start).toISOString(), end: new Date(b.end).toISOString(), reason: b.reason }] }); setB({ start: '', end: '', reason: '' }) }}>Add</button>
      </div>
    </div>
  )
}

function Bookings({ s, act }) {
  const [edit, setEdit] = useState(null)
  const list = [...s.bookings].reverse()
  if (!list.length) return <p className="hint">No bookings yet.</p>
  return (
    <div className="admin-list">
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>ID</th><th>Room</th><th>Customer</th><th>Start</th><th>End</th><th>Amount</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {list.map((b) => (
              <tr key={b.id}>
                <td>{b.id}</td><td>{b.roomId}</td><td>{b.customerName}</td>
                <td>{edit?.id === b.id ? <input type="datetime-local" value={edit.start} onChange={(e) => setEdit({ ...edit, start: e.target.value })} /> : fmt(b.start)}</td>
                <td>{edit?.id === b.id ? <input type="datetime-local" value={edit.end} onChange={(e) => setEdit({ ...edit, end: e.target.value })} /> : fmt(b.end)}</td>
                <td className="num">{money(b.amount, b.currency)}{b.payment.test ? ' (test)' : ''}{b.payment.refundDue ? ' · refund due' : ''}</td>
                <td>{STATUS[b.status] || b.status}</td>
                <td className="actions">
                  {edit?.id === b.id ? (
                    <><button className="btn primary" onClick={() => { act('setTimes', b.id, new Date(edit.start).toISOString(), new Date(edit.end).toISOString()); setEdit(null) }}>Save</button><button className="btn ghost" onClick={() => setEdit(null)}>Cancel</button></>
                  ) : ['pending_payment', 'pending_approval', 'approved'].includes(b.status) && (
                    <><button className="btn" onClick={() => setEdit({ id: b.id, start: localInput(b.start), end: localInput(b.end) })}>Change dates</button><button className="btn ghost" onClick={() => act('cancel', b.id)}>Cancel</button></>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Assign({ s, act }) {
  const [f, setF] = useState({ roomId: s.rooms[0]?.id || '', name: '', email: '', start: '', end: '', visibility: 'private', amount: '0', note: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  return (
    <form className="fields" onSubmit={(e) => { e.preventDefault(); act('assign', { roomId: f.roomId, customer: { name: f.name, email: f.email }, start: new Date(f.start).toISOString(), end: new Date(f.end).toISOString(), visibility: f.visibility, amount: Math.round(+f.amount * 100), note: f.note }) }}>
      <p className="hint">Give a customer a room directly, for example after an offline payment or as a complimentary booking.</p>
      <label className="field"><span>Room</span><select value={f.roomId} onChange={set('roomId')}>{s.rooms.map((r) => <option key={r.id} value={r.id}>{r.id} · {r.name}</option>)}</select></label>
      <div className="fields two">
        <label className="field"><span>Customer name</span><input value={f.name} onChange={set('name')} /></label>
        <label className="field"><span>Customer email</span><input type="email" value={f.email} onChange={set('email')} /></label>
        <label className="field"><span>Starts</span><input type="datetime-local" value={f.start} onChange={set('start')} /></label>
        <label className="field"><span>Expires</span><input type="datetime-local" value={f.end} onChange={set('end')} /></label>
        <label className="field"><span>Amount received ($)</span><input type="number" min={0} step="0.01" value={f.amount} onChange={set('amount')} /></label>
        <label className="field"><span>Note</span><input value={f.note} onChange={set('note')} placeholder="e.g. paid by invoice" /></label>
      </div>
      <button className="btn primary" type="submit" disabled={!f.email || !f.start || !f.end}>Assign room</button>
    </form>
  )
}

function Revenue({ s }) {
  const rv = s.revenue
  const months = Object.entries(rv.byMonth).sort()
  return (
    <div className="fields">
      <div className="stats">
        <div><small>Collected</small><b>{money(rv.total)}</b></div>
        <div><small>Paid bookings</small><b>{rv.count}</b></div>
        <div><small>Refunds due</small><b>{money(rv.refundsDue)}</b></div>
        <div><small>Test payments (not revenue)</small><b>{money(rv.testTotal)}</b></div>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Room</th><th className="num">Revenue</th></tr></thead>
          <tbody>{Object.entries(rv.byRoom).map(([k, v]) => <tr key={k}><td>{k}</td><td className="num">{money(v)}</td></tr>)}</tbody>
        </table>
      </div>
      {months.length > 0 && (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Month</th><th className="num">Revenue</th></tr></thead>
            <tbody>{months.map(([k, v]) => <tr key={k}><td>{k}</td><td className="num">{money(v)}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      <h3>History</h3>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>When</th><th>Event</th><th>Detail</th></tr></thead>
          <tbody>{[...s.log].reverse().slice(0, 60).map((l, i) => <tr key={i}><td>{fmt(l.at)}</td><td>{l.type}</td><td>{l.bookingId || l.roomId || l.customerId || ''}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  )
}

function Connect({ reload }) {
  const r = useRentals()
  const [url, setUrl] = useState(r.apiBase || 'http://localhost:8787')
  const [token, setToken] = useState(r.adminToken || '')
  return (
    <div className="fields">
      <p>The rental server makes every access and payment decision. Run <code>npm run server</code>, then connect here with the owner token it prints (or the <code>ADMIN_TOKEN</code> you set).</p>
      <div className="seg small">
        <button className={r.mode === 'preview' ? 'on' : ''} onClick={() => r.setBackend('preview').then(reload)}>Preview sandbox</button>
        <button className={r.mode === 'server' ? 'on' : ''} onClick={() => r.setBackend('server', url).then(reload)}>Rental server</button>
      </div>
      <label className="field"><span>Server address</span><input id="rental-api" value={url} onChange={(e) => setUrl(e.target.value)} /></label>
      <label className="field"><span>Owner token</span><input id="rental-token" type="password" value={token} onChange={(e) => setToken(e.target.value)} /></label>
      <button className="btn primary" onClick={() => { r.setAdminToken(token); r.setBackend('server', url).then(reload) }}>Connect</button>
      <p className="hint">Payments: set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET on the server for real checkout (verified by webhook), or DEV_PAYMENTS=1 for labelled test payments. Customer sign-in is a development placeholder (name + email, no verification) until a real identity provider is added.</p>
    </div>
  )
}

/** What customers see in the listing: description, furniture, amenities, photos, tour start. */
function ListingEditor({ draft, setDraft }) {
  const info = ROOM_INFO[draft.id] || {}
  const canUpload = useBackend((s) => s.admin && s.canWriteFiles)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const lines = (v) => v.split('\n').map((x) => x.trim()).filter(Boolean)
  const upload = async (files) => {
    setBusy(true); setErr(null)
    try {
      const added = []
      for (const f of files) {
        if (!/^image\/(png|jpeg|webp)$/.test(f.type)) throw new Error('Photos must be JPG, PNG or WebP.')
        const up = await backend().upload(f, f.type)
        added.push({ url: up.url || backend().url(up.ref), caption: f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ') })
      }
      setDraft({ ...draft, photos: [...(draft.photos || []), ...added].slice(0, 12) })
    } catch (e) { setErr(e.message) }
    setBusy(false)
  }
  const preview = () => { useRentDraft.setState({ roomId: draft.id, view: 'preview' }); useStore.getState().openPanel({ type: 'rent' }) }
  return (
    <div className="fields listing-editor">
      <b>Listing</b>
      <label className="field"><span>Description</span><textarea rows={2} value={draft.description || ''} placeholder={info.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
      <div className="fields two">
        <label className="field"><span>Furniture included (one per line)</span><textarea rows={4} value={(draft.furniture || []).join('\n')} placeholder={(info.furniture || []).join('\n')} onChange={(e) => setDraft({ ...draft, furniture: lines(e.target.value) })} /></label>
        <label className="field"><span>Amenities (one per line)</span><textarea rows={4} value={(draft.amenities || []).join('\n')} placeholder={(info.amenities || []).join('\n')} onChange={(e) => setDraft({ ...draft, amenities: lines(e.target.value) })} /></label>
      </div>
      <small className="hint">Empty fields show the built-in description (shown greyed out).</small>
      <div className="field">
        <span>Photos ({(draft.photos || []).length}/12) · live photos of the room are added automatically</span>
        <div className="photo-strip">
          {(draft.photos || []).map((p, i) => (
            <div key={p.url + i} className="photo-item">
              <img src={p.url} alt="" />
              <input aria-label="Caption" value={p.caption} onChange={(e) => setDraft({ ...draft, photos: draft.photos.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)) })} />
              <button type="button" className="btn ghost small" onClick={() => setDraft({ ...draft, photos: draft.photos.filter((_, j) => j !== i) })}>Remove</button>
            </div>
          ))}
        </div>
        {canUpload ? (
          <label className="btn file">{busy ? 'Uploading…' : 'Upload photos'}<input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(e) => { upload([...e.target.files]); e.target.value = '' }} /></label>
        ) : <small className="hint">Photo uploads need the owner to be signed in to the shared storage (hosted page or your server).</small>}
        {err && <p className="error">{err}</p>}
      </div>
      <div className="row-actions">
        <button type="button" className="btn small" onClick={() => { const p = playerState.position; setDraft({ ...draft, tourStart: [+p.x.toFixed(2), +(p.y + 0.1).toFixed(2), +p.z.toFixed(2), +cameraState.yaw.toFixed(3)] }) }}>Set tour start to where I'm standing</button>
        {draft.tourStart && <button type="button" className="btn ghost small" onClick={() => setDraft({ ...draft, tourStart: null })}>Use the default tour start</button>}
        <button type="button" className="btn ghost small" onClick={preview}>Preview listing</button>
      </div>
      <small className="hint">Furniture in the room itself: walk in (owner access) and use Decorate. Save {draft.id} below to apply listing changes.</small>
    </div>
  )
}
