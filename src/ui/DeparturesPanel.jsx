import { Panel } from './UI.jsx'
import { useStore } from '../state/store.js'
import { useJobs } from '../state/jobs.js'
import { playerState, cameraState } from '../state/runtime.js'
import { DESTINATIONS } from '../world/westend/Airport.jsx'

const fmt = (n) => Math.round(n).toLocaleString('en-US')

// The airport's departures board: book and pay for a "flight" (real credits, out of the wallet,
// same economy as everywhere else), then teleport straight to that part of the world. Same
// teleport mechanic as the owner's Rooms & access panel, just dressed as flights.
export default function DeparturesPanel() {
  const wallet = useJobs((s) => s.wallet)
  const spend = useJobs((s) => s.spend)
  const fly = (d) => {
    if (!spend(d.price, 'flight', `Flight ${d.flight} to ${d.to}`)) return
    playerState.teleport = d.pos
    cameraState.yaw = Math.PI
    useStore.getState().closePanel()
  }
  return (
    <Panel title="Departures" eyebrow="Vision Storms International · Terminal A/B" wide>
      <p className="hint">Book a flight and we'll have you there before the seatbelt sign even turns off. Fare comes out of your wallet ({fmt(wallet)} cr on hand).</p>
      <div className="admin-list">
        {DESTINATIONS.map((d) => (
          <div className="admin-row" key={d.flight}>
            <div className="grow"><b>{d.flight}</b><small>{d.to}</small></div>
            <span className="badge">Gate {d.gate}</span>
            <b>{fmt(d.price)} cr</b>
            <div className="row-actions">
              <button className="btn small primary" disabled={wallet < d.price} onClick={() => fly(d)}>Board</button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}
