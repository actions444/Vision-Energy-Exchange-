import { useEffect } from 'react'
import { Panel } from './UI.jsx'
import { ZONES } from '../config/rooms.js'
import { useRentals } from '../rentals/client.js'
import { useAudit, startAudit, logAccess } from '../admin/audit.js'
import { useStore } from '../state/store.js'
import { playerState, cameraState } from '../state/runtime.js'

// Owner tools → Rooms & access: inspect every room and building (including privately booked
// ones) and read the log of owner entries into customers' private spaces.
export default function AdminAccess() {
  const rooms = useRentals((s) => s.rooms)
  const entries = useAudit((s) => s.entries)
  const open = useStore((s) => s.openPanel)
  useEffect(() => { startAudit() }, [])
  const places = ZONES.filter((z) => z.id !== 'streets')
  const go = (z, booking) => {
    if (booking && booking.visibility !== 'public') logAccess({ kind: 'inspect', roomId: z.id, roomName: z.name, detail: `${booking.visibility} booking until ${new Date(booking.until).toLocaleString()}` })
    playerState.teleport = z.spawn
    cameraState.yaw = z.yaw
    useStore.getState().closePanel()
  }
  return (
    <Panel title="Rooms & access" eyebrow="Owner · inspection" wide>
      <p className="hint">As the owner you can open every door and visit every space without renting it. Entering or inspecting a space a customer has booked privately is recorded in the access log below. Customers' privacy settings are never changed.</p>
      <div className="admin-list">
        {places.map((z) => {
          const r = rooms.find((x) => x.id === z.id)
          const b = r?.now
          const status = !r ? 'Not rentable' : b ? `${b.visibility === 'public' ? 'Booked · open' : b.visibility === 'invite' ? 'Booked · invitation only' : 'Booked · private'} until ${new Date(b.until).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : r.active ? 'Available' : 'Not offered'
          return (
            <div className="admin-row" key={z.id}>
              <div className="grow"><b>{z.name}</b><small>{z.kind}</small></div>
              <span className={'badge' + (b && b.visibility !== 'public' ? ' live' : '')}>{status}</span>
              <div className="row-actions">
                <button className="btn small" onClick={() => go(z, b)}>{b && b.visibility !== 'public' ? 'Inspect (logged)' : 'Go there'}</button>
                {r && <button className="btn ghost small" onClick={() => open({ type: 'rentals' })}>Rental & permissions</button>}
              </div>
            </div>
          )
        })}
      </div>
      <h3>Access log</h3>
      {!entries.length ? <p className="hint">No owner entries into private spaces yet.</p> : (
        <ul className="jobs">
          {entries.map((e, i) => (
            <li key={i}><b>{e.roomName}</b><span>{{ entry: 'Opened the door', inspect: 'Inspected', teleport: 'Visited' }[e.kind] || e.kind} · {new Date(e.at).toLocaleString()}{e.detail ? ' · ' + e.detail : ''}</span></li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
