import { useEffect, useMemo, useState } from 'react'
import { Panel } from './UI.jsx'
import { useRentals } from '../rentals/client.js'
import { PLANS, VISIBILITY, FEATURES, money, endFor } from '../../shared/rentals.js'
import { useMusicLibrary } from '../music/library.js'
import { useStore } from '../state/store.js'
import { usePreview, useRentDraft, setForm, takePhotos, startTour, visitRoom } from '../rentals/preview.js'
import { ROOM_INFO, roomArea, doorSpot } from '../config/roomInfo.js'

const STATUS = {
  pending_payment: 'Waiting for payment',
  pending_approval: 'Paid · waiting for owner approval',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  completed: 'Completed',
  expired: 'Expired (not paid)',
}
const fmt = (iso) => new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
const localInput = (d) => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 16) }

// Customer side: pick a room, see prices, choose dates, check out, manage bookings.
export default function RentPanel({ roomId: initial }) {
  const r = useRentals()
  const d = useRentDraft()
  // where the panel is (kept in a store so a virtual tour can bring you back to the same place)
  useEffect(() => {
    if (initial) useRentDraft.setState({ roomId: initial, tab: 'browse', view: 'preview' })
    else if (d.view === 'tour') useRentDraft.setState({ view: 'preview' })
  }, [initial]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { r.refresh() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const tab = d.view === 'preview' ? 'preview' : d.tab
  const roomId = d.roomId
  const setTab = (t) => useRentDraft.setState({ tab: t, view: null })
  const room = r.rooms.find((x) => x.id === roomId)

  return (
    <Panel title="Rent a space" eyebrow={r.mode === 'server' ? 'Vision Storms Plaza' : 'Preview sandbox'} wide>
      {r.mode !== 'server' && (
        <p className="notice">Preview sandbox: bookings are stored in this browser only, payments are simulated, and nothing here is secure. The owner connects the rental server to take real bookings.</p>
      )}
      {r.mode === 'server' && r.paymentMode === 'test' && <p className="notice">This server is in test-payment mode. No money is charged.</p>}
      {r.mode === 'server' && r.paymentMode === 'none' && <p className="notice">Checkout is not available yet: the owner has not connected a payment provider.</p>}
      <div className="seg tabs" role="tablist">
        <button className={tab === 'browse' || tab === 'preview' ? 'on' : ''} onClick={() => setTab('browse')}>Spaces</button>
        <button className={tab === 'book' ? 'on' : ''} onClick={() => setTab('book')} disabled={!room}>Book</button>
        <button className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>My rentals{r.myBookings.length ? ` (${r.myBookings.length})` : ''}</button>
      </div>
      {r.error && <p className="error">{r.error}</p>}
      {tab === 'browse' && <Browse onPick={(id) => useRentDraft.setState({ roomId: id, tab: 'book', view: null })} onView={(id) => useRentDraft.setState({ roomId: id, view: 'preview' })} />}
      {tab === 'preview' && room && <RoomPreview room={room} onBack={() => useRentDraft.setState({ view: null, tab: 'browse' })} onBook={() => useRentDraft.setState({ view: null, tab: 'book' })} />}
      {tab === 'book' && room && <Book room={room} onDone={() => setTab('mine')} />}
      {tab === 'mine' && <Mine />}
    </Panel>
  )
}

const mins = (room) => ['month', 'week', 'day', 'hour'].filter((k) => room.prices[k] > 0)
function availability(room) {
  if (room.now) return room.now.visibility === 'public' ? `In use until ${fmt(room.now.until)} (open to visitors)` : `Booked until ${fmt(room.now.until)}`
  const next = (room.busy || []).filter((b) => new Date(b.start) > new Date()).sort((a, b) => a.start.localeCompare(b.start))[0]
  return next ? `Available now · next booking ${fmt(next.start)}` : 'Available now'
}

function Browse({ onPick, onView }) {
  const rooms = useRentals((s) => s.rooms)
  if (!rooms.length) return <p className="hint">No spaces are offered for rent right now.</p>
  return (
    <div className="admin-list">
      {rooms.map((room) => (
        <div className="admin-row" key={room.id}>
          <div className="grow">
            <b>{room.name} <span className="badge">{room.id}</span></b>
            <small>{room.categoryName ? room.categoryName + ' · ' : ''}{room.kind} · {room.building} · floor {room.floor} · up to {room.occupancy} people{roomArea(room.id) ? ` · ${roomArea(room.id)} m²` : ''}</small>
            <small className={room.now ? 'busy' : 'free'}>{availability(room)}</small>
          </div>
          <button className="btn view-room" id={'view-' + room.id} onClick={() => onView(room.id)}>View room</button>
          <div className="prices">
            {['month', 'week', 'day', 'hour'].filter((k) => room.prices[k] > 0).map((k) => <span key={k}>{money(room.prices[k], room.currency)}<small>/{k}{k === 'hour' ? ' (events)' : ''}</small></span>)}
          </div>
          <button className="btn primary" onClick={() => onPick(room.id)}>Choose</button>
        </div>
      ))}
    </div>
  )
}

function Book({ room, onDone }) {
  const r = useRentals()
  const plans = mins(room)
  // the form lives in a store so it survives viewing the room or taking a tour
  const f = useRentDraft((s) => s.forms[room.id]) || {}
  const field = (k, def) => [f[k] ?? def, (v) => setForm(room.id, { [k]: v })]
  const [plan, setPlan] = field('plan', plans[0])
  const [qty, setQty] = field('qty', 1)
  const [start, setStart] = field('start', (() => { const d = new Date(Date.now() + 3600e3); d.setMinutes(0, 0, 0); return localInput(d) })())
  const [guests, setGuests] = field('guests', 1)
  const [visibility, setVisibility] = field('visibility', 'private')
  const [invites, setInvites] = field('invites', '')
  const [name, setName] = useState(useStore.getState().profile.name || '')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [done, setDone] = useState(null)

  const amount = (room.prices[plan] || 0) * (+qty || 0)
  const end = useMemo(() => { try { return endFor(new Date(start).toISOString(), plan, +qty || 1) } catch { return null } }, [start, plan, qty])
  const clash = end && room.busy.some((b) => new Date(start) < new Date(b.end) && new Date(b.start) < new Date(end))

  const submit = async (e) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      if (!r.customer) await r.signIn(name, email)
      const res = await r.book({ roomId: room.id, plan, quantity: +qty, start: new Date(start).toISOString(), guests: +guests, visibility, invites: invites.split(/[,\n]/) })
      if (res.checkoutUrl) {
        // real payment: hand over to the provider's hosted checkout
        window.open(res.checkoutUrl, '_blank', 'noopener')
        setDone({ booking: res.booking, redirected: true })
      } else setDone({ booking: res.booking })
    } catch (x) {
      setErr(x.message)
    } finally {
      setBusy(false)
    }
  }
  const pay = async () => {
    setBusy(true)
    setErr(null)
    try { const res = await r.testPay(done.booking.id); setDone({ booking: res.booking }) } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }

  if (done) {
    const b = done.booking
    return (
      <div className="fields">
        <div className="receipt">
          <b>{room.name} · {b.id}</b>
          <span>{fmt(b.start)} → {fmt(b.end)}</span>
          <span>{b.quantity} × {money(b.unit, b.currency)} = <b>{money(b.amount, b.currency)}</b></span>
          <span className="badge">{STATUS[b.status]}</span>
        </div>
        {b.status === 'pending_payment' && (done.redirected ? (
          <p className="hint">Checkout opened in a new tab. Your booking updates once the payment provider confirms payment to the server.</p>
        ) : (
          <>
            <p className="notice">Test payment: no card, no money. This only works in the preview sandbox or on a server in test mode.</p>
            <button className="btn primary" onClick={pay} disabled={busy}>Simulate test payment of {money(b.amount, b.currency)}</button>
          </>
        ))}
        {b.status === 'pending_approval' && <p className="hint">Payment recorded. The owner approves or declines each request; you'll see the result in My rentals.</p>}
        {b.status === 'approved' && <p className="hint">Approved. The door to {room.name} opens for you during your booking.</p>}
        {err && <p className="error">{err}</p>}
        <button className="btn" onClick={onDone}>Go to My rentals</button>
      </div>
    )
  }

  return (
    <form className="fields" onSubmit={submit}>
      <div className="admin-row">
        <div className="grow"><b>{room.name} <span className="badge">{room.id}</span></b><small>{room.kind} · {room.building} · floor {room.floor} · up to {room.occupancy} people</small></div>
      </div>
      <RoomActions room={room} />
      <div className="field">
        <span>Rate</span>
        <div className="seg small">
          {plans.map((p) => <button type="button" key={p} className={plan === p ? 'on' : ''} onClick={() => setPlan(p)}>{PLANS[p].label} · {money(room.prices[p], room.currency)}</button>)}
        </div>
        {plan === 'month' && <small className="hint">A month is 30 days, paid once. It does not renew or charge you again automatically.</small>}
        {plan === 'hour' && <small className="hint">Hourly booking is for events in this venue.</small>}
      </div>
      <div className="fields two">
        <label className="field"><span>How many {plan}s</span><input id="rent-qty" type="number" min={1} max={365} value={qty} onChange={(e) => setQty(e.target.value)} /></label>
        <label className="field"><span>Guests (max {room.occupancy})</span><input id="rent-guests" type="number" min={1} max={room.occupancy} value={guests} onChange={(e) => setGuests(e.target.value)} /></label>
      </div>
      <label className="field"><span>Start</span><input id="rent-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></label>
      {end && <p className="hint">Ends {fmt(end)}.{clash ? ' This overlaps an existing booking, pick another time.' : ''}</p>}
      <div className="field">
        <span>Who can come in</span>
        <div className="seg small">
          {Object.entries(VISIBILITY).map(([k, v]) => <button type="button" key={k} className={visibility === k ? 'on' : ''} onClick={() => setVisibility(k)}>{v.split(' (')[0]}</button>)}
        </div>
        <small className="hint">{VISIBILITY[visibility]}</small>
      </div>
      {visibility === 'invite' && <label className="field"><span>Invite (emails or names, comma separated)</span><input id="rent-invites" value={invites} onChange={(e) => setInvites(e.target.value)} placeholder="friend@example.com, Bea" /></label>}
      {!r.customer && (
        <div className="fields two">
          <label className="field"><span>Your name</span><input id="rent-name" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="field"><span>Email</span><input id="rent-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
        </div>
      )}
      {r.customer && <p className="hint">Booking as {r.customer.name} ({r.customer.email}). <button type="button" className="linkish" onClick={r.signOut}>Not you?</button></p>}
      <div className="total"><span>Total</span><b>{money(amount, room.currency)}</b></div>
      {err && <p className="error">{err}</p>}
      <button className="btn primary" type="submit" disabled={busy || clash || !amount}>{busy ? 'Working…' : 'Continue to checkout'}</button>
    </form>
  )
}

function Mine() {
  const r = useRentals()
  const playlists = useMusicLibrary((s) => s.playlists)
  const [err, setErr] = useState(null)
  const [edit, setEdit] = useState({})
  if (!r.customer) return <p className="hint">Book a space to see your rentals here.</p>
  if (!r.myBookings.length) return <p className="hint">No rentals yet.</p>
  const save = async (b) => {
    setErr(null)
    try { await r.customize(b.id, edit[b.id] || {}); setEdit({ ...edit, [b.id]: undefined }); useStore.getState().showToast('Room updated.') } catch (x) { setErr(x.message) }
  }
  return (
    <div className="admin-list">
      {err && <p className="error">{err}</p>}
      {[...r.myBookings].reverse().map((b) => {
        const room = r.rooms.find((x) => x.id === b.roomId)
        const e = { ...b.customization, visibility: b.visibility, invites: b.invites.join(', '), ...(edit[b.id] || {}) }
        const setE = (k, v) => setEdit({ ...edit, [b.id]: { ...(edit[b.id] || {}), [k]: v } })
        return (
          <div key={b.id} className="booking">
            <div className="admin-row">
              <div className="grow"><b>{room?.name || b.roomId} · {b.id}</b><small>{fmt(b.start)} → {fmt(b.end)} · {money(b.amount, b.currency)}{b.payment.test ? ' · test payment' : ''}</small></div>
              <span className="badge">{STATUS[b.status] || b.status}</span>
              {b.status === 'pending_payment' && r.paymentMode === 'test' && <button className="btn primary" onClick={() => r.testPay(b.id).catch((x) => setErr(x.message))}>Test payment</button>}
              {['pending_payment', 'pending_approval', 'approved'].includes(b.status) && <button className="btn ghost" onClick={() => r.cancel(b.id).catch((x) => setErr(x.message))}>Cancel</button>}
            </div>
            {b.status === 'approved' && room && (
              <div className="fields">
                <div className="seg small">
                  {Object.entries(VISIBILITY).map(([k, v]) => <button key={k} className={e.visibility === k ? 'on' : ''} onClick={() => setE('visibility', k)}>{v.split(' (')[0]}</button>)}
                </div>
                {e.visibility === 'invite' && <input aria-label="Invites" value={e.invites} onChange={(x) => setE('invites', x.target.value.split(/[,\n]/))} placeholder="Invite emails or names" />}
                {room.features.includes('signText') && <label className="field"><span>{FEATURES.signText.label}</span><input maxLength={40} value={e.signText || ''} onChange={(x) => setE('signText', x.target.value)} /></label>}
                {room.features.includes('welcome') && <label className="field"><span>{FEATURES.welcome.label}</span><input maxLength={60} value={e.welcome || ''} onChange={(x) => setE('welcome', x.target.value)} /></label>}
                {room.features.includes('wallColor') && <label className="field"><span>{FEATURES.wallColor.label}</span><input type="color" value={e.wallColor || '#3c4a5a'} onChange={(x) => setE('wallColor', x.target.value)} /></label>}
                {room.features.includes('playlist') && (
                  <label className="field"><span>{FEATURES.playlist.label}</span>
                    <select value={e.playlist || ''} onChange={(x) => setE('playlist', x.target.value)}>
                      <option value="">Room default</option>
                      {playlists.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                )}
                <button className="btn primary" onClick={() => save(b)} disabled={!edit[b.id]}>Save room settings</button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** View room / virtual tour / visit, shown above the prices. */
function RoomActions({ room, onView }) {
  return (
    <div className="room-actions">
      <button type="button" className="btn view-room" onClick={() => (onView ? onView() : useRentDraft.setState({ view: 'preview', roomId: room.id }))}>View room</button>
      <button type="button" className="btn" id={'tour-' + room.id} onClick={() => startTour(room.id)}>Take virtual tour</button>
      {doorSpot(room.id) && <button type="button" className="btn ghost" onClick={() => visitRoom(room.id)}>Visit room</button>}
    </div>
  )
}

/** Photos of the actual room + details, with tour / visit / book. */
function RoomPreview({ room, onBack, onBook }) {
  const shots = usePreview((s) => s.photos[room.id])
  const shooting = usePreview((s) => s.shooting === room.id)
  const [i, setI] = useState(0)
  useEffect(() => { takePhotos(room.id) }, [room.id])
  const info = ROOM_INFO[room.id] || {}
  const images = [...(room.photos || []).map((p) => ({ url: p.url, label: p.caption || 'Photo' })), ...(shots?.images || []).map((x) => ({ ...x, live: true }))]
  const cur = images[Math.min(i, images.length - 1)]
  const furniture = room.furniture?.length ? room.furniture : info.furniture || []
  const amenities = room.amenities?.length ? room.amenities : info.amenities || []
  const area = roomArea(room.id)
  return (
    <div className="room-preview">
      <button className="btn ghost small" id="return-listing" onClick={onBack}>← Return to listing</button>
      <div className="gallery">
        {cur ? <img src={cur.url} alt={`${room.name}: ${cur.label}`} /> : <div className="gallery-wait">{shooting ? 'Taking live photos of the room…' : 'No photos yet.'}</div>}
        {cur && <span className="gallery-label">{cur.label}{cur.live ? ' · live view of the room' : ''} · {Math.min(i, images.length - 1) + 1}/{images.length}</span>}
        {images.length > 1 && (
          <>
            <button className="gallery-nav prev" aria-label="Previous photo" onClick={() => setI((i - 1 + images.length) % images.length)}>‹</button>
            <button className="gallery-nav next" aria-label="Next photo" onClick={() => setI((i + 1) % images.length)}>›</button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="thumbs">
          {images.map((im, k) => <button key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={im.label}><img src={im.url} alt="" /></button>)}
          {shooting && <span className="hint small">taking photos…</span>}
        </div>
      )}
      <div className="room-head">
        <div>
          <h3>{room.name} <span className="badge">{room.id}</span></h3>
          <small>{room.building} · floor {room.floor} · up to {room.occupancy} people{area ? ` · ${area} m² · 3.9 m ceilings` : ''}</small>
          <small className={room.now ? 'busy' : 'free'}>{availability(room)}</small>
        </div>
        <div className="prices">{mins(room).map((k) => <span key={k}>{money(room.prices[k], room.currency)}<small>/{k}{k === 'hour' ? ' (events)' : ''}</small></span>)}</div>
      </div>
      <RoomActions room={room} onView={() => takePhotos(room.id, true)} />
      {(room.description || info.description) && <p>{room.description || info.description}</p>}
      <div className="fields two">
        <div><b>Furniture included</b><ul className="ticks">{furniture.map((x) => <li key={x}>{x}</li>)}</ul></div>
        <div><b>Amenities</b><ul className="ticks">{amenities.map((x) => <li key={x}>{x}</li>)}</ul></div>
      </div>
      <div className="row-actions">
        <button className="btn ghost" onClick={onBack}>Return to listing</button>
        <button className="btn primary" id="book-this" onClick={onBook}>Book this room</button>
      </div>
    </div>
  )
}
