import { useEffect, useMemo, useState } from 'react'
import { Panel } from './UI.jsx'
import { useRentals } from '../rentals/client.js'
import { PLANS, VISIBILITY, FEATURES, money, endFor } from '../../shared/rentals.js'
import { useMusicLibrary } from '../music/library.js'
import { useStore } from '../state/store.js'

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
  const [tab, setTab] = useState(initial ? 'book' : 'browse')
  const [roomId, setRoomId] = useState(initial || null)
  useEffect(() => { r.refresh() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const room = r.rooms.find((x) => x.id === roomId)

  return (
    <Panel title="Rent a space" eyebrow={r.mode === 'server' ? 'Vision Storms Plaza' : 'Preview sandbox'} wide>
      {r.mode !== 'server' && (
        <p className="notice">Preview sandbox: bookings are stored in this browser only, payments are simulated, and nothing here is secure. The owner connects the rental server to take real bookings.</p>
      )}
      {r.mode === 'server' && r.paymentMode === 'test' && <p className="notice">This server is in test-payment mode. No money is charged.</p>}
      {r.mode === 'server' && r.paymentMode === 'none' && <p className="notice">Checkout is not available yet: the owner has not connected a payment provider.</p>}
      <div className="seg tabs" role="tablist">
        <button className={tab === 'browse' ? 'on' : ''} onClick={() => setTab('browse')}>Spaces</button>
        <button className={tab === 'book' ? 'on' : ''} onClick={() => setTab('book')} disabled={!room}>Book</button>
        <button className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>My rentals{r.myBookings.length ? ` (${r.myBookings.length})` : ''}</button>
      </div>
      {r.error && <p className="error">{r.error}</p>}
      {tab === 'browse' && <Browse onPick={(id) => { setRoomId(id); setTab('book') }} />}
      {tab === 'book' && room && <Book room={room} onDone={() => setTab('mine')} />}
      {tab === 'mine' && <Mine />}
    </Panel>
  )
}

function Browse({ onPick }) {
  const rooms = useRentals((s) => s.rooms)
  if (!rooms.length) return <p className="hint">No spaces are offered for rent right now.</p>
  return (
    <div className="admin-list">
      {rooms.map((room) => (
        <div className="admin-row" key={room.id}>
          <div className="grow">
            <b>{room.name} <span className="badge">{room.id}</span></b>
            <small>{room.kind} · floor {room.floor} · up to {room.occupancy} people{room.now ? ' · in use now' : ''}</small>
          </div>
          <div className="prices">
            {Object.entries(room.prices).filter(([, v]) => v > 0).map(([k, v]) => <span key={k}>{money(v, room.currency)}<small>/{k}</small></span>)}
          </div>
          <button className="btn primary" onClick={() => onPick(room.id)}>Choose</button>
        </div>
      ))}
    </div>
  )
}

function Book({ room, onDone }) {
  const r = useRentals()
  const plans = Object.keys(PLANS).filter((p) => room.prices[p] > 0)
  const [plan, setPlan] = useState(plans[0])
  const [qty, setQty] = useState(1)
  const [start, setStart] = useState(() => { const d = new Date(Date.now() + 3600e3); d.setMinutes(0, 0, 0); return localInput(d) })
  const [guests, setGuests] = useState(1)
  const [visibility, setVisibility] = useState('private')
  const [invites, setInvites] = useState('')
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
      <div className="field">
        <span>Rate</span>
        <div className="seg small">
          {plans.map((p) => <button type="button" key={p} className={plan === p ? 'on' : ''} onClick={() => setPlan(p)}>{PLANS[p].label} · {money(room.prices[p], room.currency)}</button>)}
        </div>
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
