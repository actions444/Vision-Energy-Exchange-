import { useLights, billFor } from '../state/power.js'
import { useStore } from '../state/store.js'
import { money } from '../../shared/rentals.js'

/** HUD readout: what the lights are drawing and what they have cost. Click to open the panel. */
export function PowerChip() {
  const watts = useLights((s) => s.watts)
  const kWh = useLights((s) => s.kWh)
  const master = useLights((s) => s.master)
  const open = useStore((s) => s.openPanel)
  const label = watts >= 1000 ? (watts / 1000).toFixed(1) + ' kW' : Math.round(watts) + ' W'
  return (
    <button
      className={'chip chip-power' + (master ? '' : ' chip-dark')}
      id="hud-power"
      title="Lights & power — click to switch rooms off"
      onClick={() => open({ type: 'lights' })}
    >
      <i className="bolt" />{master ? label : 'Lights off'} · {money(billFor(kWh))}
    </button>
  )
}
