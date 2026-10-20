import { useState } from 'react'
import { Panel } from './UI.jsx'
import { useJobs } from '../state/jobs.js'
import { HOTEL_TIERS, hotelTierById } from '../config/hotel.js'

const fmt = (n) => Math.round(n).toLocaleString('en-US')

/** Vision Grand Hotel front desk: book a room tier for N nights (real credits, out of the
 * wallet), see your current stay, and check out. See world/GrandHotel.jsx for the lobby and the
 * three furnished room displays this is booking against. */
export default function HotelPanel() {
  const s = useJobs()
  const [nights, setNights] = useState(1)
  const stay = s.hotelStay
  const stayTier = stay && hotelTierById(stay.tierId)

  return (
    <Panel title="Vision Grand Hotel" eyebrow="Front desk · Isla Serena">
      <div className="admin-list">
        {stay ? (
          <div className="admin-row jobs-current">
            <span style={{ flex: 1 }}>
              <b>Checked into the {stayTier?.name}</b><br />
              <small>Booked day {stay.bookedDay} · {stay.nights} night{stay.nights === 1 ? '' : 's'}</small>
            </span>
            <button className="btn small danger" onClick={() => s.checkOutHotel()}>Check out</button>
          </div>
        ) : (
          <p className="hint">Pick a room, choose how many nights, and pay at the desk - the fare comes straight out of your wallet.</p>
        )}

        <label className="field">
          <span>Nights</span>
          <input type="number" min="1" max="30" value={nights} onChange={(e) => setNights(Math.max(1, Math.min(30, Math.round(Number(e.target.value) || 1))))} />
        </label>

        <ul className="admin-list jobs-list">
          {HOTEL_TIERS.map((t) => (
            <li key={t.id} className="admin-row" id={'hotel-' + t.id}>
              <span style={{ flex: 1, minWidth: 200 }}>
                <b>{t.name}</b> <small>{fmt(t.price)} cr / night</small><br />
                <small>{t.desc}</small>
              </span>
              <b>{fmt(t.price * nights)} cr</b>
              <button
                className={'btn small ' + (stay?.tierId === t.id ? 'on' : 'primary')}
                disabled={!!stay || s.wallet < t.price * nights}
                onClick={() => s.bookHotel(t.id, nights)}
              >
                {stay?.tierId === t.id ? 'Your room' : 'Book'}
              </button>
            </li>
          ))}
        </ul>
        <p className="note">Booking is a real purchase (no refund on checkout, same as the business stakes and vehicles in the Job Center) - the three rooms in the lobby show what each tier looks like.</p>
      </div>
    </Panel>
  )
}
