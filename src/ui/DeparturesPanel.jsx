import { Panel } from './UI.jsx'
import { useStore } from '../state/store.js'
import { playerState, cameraState } from '../state/runtime.js'
import { DESTINATIONS } from '../world/westend/Airport.jsx'

// The airport's departures board: pick a "flight" and teleport straight to that part of the
// world. Same teleport mechanic as the owner's Rooms & access panel, just dressed as flights.
export default function DeparturesPanel() {
  const fly = (d) => {
    playerState.teleport = d.pos
    cameraState.yaw = Math.PI
    useStore.getState().closePanel()
  }
  return (
    <Panel title="Departures" eyebrow="Vision Storms International · Terminal A/B" wide>
      <p className="hint">Pick a flight and we'll have you there before the seatbelt sign even turns off.</p>
      <div className="admin-list">
        {DESTINATIONS.map((d) => (
          <div className="admin-row" key={d.flight}>
            <div className="grow"><b>{d.flight}</b><small>{d.to}</small></div>
            <span className="badge">Gate {d.gate}</span>
            <div className="row-actions">
              <button className="btn small" onClick={() => fly(d)}>Board</button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}
