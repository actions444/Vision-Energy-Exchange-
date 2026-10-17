import { Panel } from './UI.jsx'
import { useStore } from '../state/store.js'
import { getCar } from '../world/cars.js'

/** Floor picker for a generic elevator car (the Justice & Rehabilitation District). */
export default function CarPanel({ id }) {
  const car = getCar(id)
  return car ? <Picker car={car} /> : null
}

function Picker({ car }) {
  const ui = car.useUI()
  const close = useStore((s) => s.closePanel)
  const { floors, labels, names, name } = car.cfg
  return (
    <Panel title="Elevator" eyebrow={`${name} · ${ui.moving ? (ui.direction > 0 ? 'going up' : 'going down') : 'floor ' + labels[ui.floor]}`}>
      <div className="elevator-buttons">
        {Array.from({ length: floors }, (_, i) => floors - 1 - i).map((f) => (
          <button
            key={f}
            id={`car-floor-${f}`}
            className={'floor-btn' + (ui.floor === f ? ' on' : '') + (ui.lit.includes(f) ? ' lit' : '')}
            onClick={() => { car.call(f); close() }}
          >
            <b>{labels[f]}</b><small>{names[f]}</small>
          </button>
        ))}
      </div>
    </Panel>
  )
}
