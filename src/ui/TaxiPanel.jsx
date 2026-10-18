import { Panel } from './UI.jsx'
import { useStore } from '../state/store.js'
import { TAXI_DESTINATIONS, TAXI_STANDS, fareFor } from '../config/taxi.js'
import { hailTaxi } from '../vehicles/Taxi.jsx'

/** Destination picker shown when the player hails a taxi. */
export default function TaxiPanel({ standId }) {
  const close = useStore((s) => s.closePanel)
  const stand = TAXI_STANDS.find((s) => s.id === standId)
  if (!stand) return null
  const choices = TAXI_DESTINATIONS.filter((d) => d.id !== stand.zoneId)

  return (
    <Panel title="Hail a Taxi" eyebrow="Pick a destination">
      <div className="elevator-buttons">
        {choices.map((d) => {
          const fare = fareFor(stand.spawn, d.spawn)
          return (
            <button
              key={d.id}
              className="floor-btn"
              onClick={() => {
                if (hailTaxi(standId, d.id, d.spawn)) close()
              }}
            >
              <b>{fare}</b>
              <small>{d.name} &middot; {fare} cr</small>
            </button>
          )
        })}
      </div>
    </Panel>
  )
}
