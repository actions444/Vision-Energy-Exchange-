import { useEffect, useState } from 'react'
import { Panel } from './UI.jsx'
import { useLights, ZONES, RATE, billFor } from '../state/power.js'
import { useRentals } from '../rentals/client.js'
import { money, credits } from '../../shared/rentals.js'

const fmtW = (w) => (w >= 1000 ? (w / 1000).toFixed(2) + ' kW' : Math.round(w) + ' W')

/**
 * Lights & power. Every area can be switched off here or at the switch by its door, and the
 * meter shows what the lights are costing: it runs on in-world time, so leaving the whole Plaza
 * lit through the night gets expensive.
 */
export default function LightsPanel() {
  const { master, off, watts, kWh } = useLights()
  const { toggle, setMaster, allOn, allOff, resetMeter } = useLights.getState()
  const perUsd = useRentals((s) => s.creditsPerUsd) || 100
  const [, tick] = useState(0)
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t) }, [])

  const bill = billFor(kWh)
  const groups = [...new Set(ZONES.map((z) => z.group))]
  const litCount = ZONES.filter((z) => master && !off.includes(z.id)).length

  return (
    <Panel title="Lights & power" eyebrow="Vision Storms Energy Exchanges">
      <div className="meter-row">
        <div className="meter">
          <span className="meter-label">Drawing now</span>
          <strong id="power-watts">{fmtW(watts)}</strong>
          <em>{litCount} of {ZONES.length} areas lit</em>
        </div>
        <div className="meter">
          <span className="meter-label">Metered</span>
          <strong id="power-kwh">{kWh.toFixed(2)} kWh</strong>
          <em>at {money(RATE)} per kWh</em>
        </div>
        <div className="meter accent">
          <span className="meter-label">Bill so far</span>
          <strong id="power-bill">{money(bill)}</strong>
          <em>{credits(bill, perUsd).toLocaleString('en-US')} VSE credits</em>
        </div>
      </div>

      <div className="row-actions">
        <button className={'btn ' + (master ? 'primary' : '')} id="power-master" onClick={() => setMaster(!master)}>
          {master ? 'Main breaker: on' : 'Main breaker: off'}
        </button>
        <button className="btn small" id="power-all-on" onClick={allOn}>All on</button>
        <button className="btn small" id="power-all-off" onClick={allOff}>All off</button>
        <button className="btn small" id="power-reset" onClick={resetMeter}>Reset meter</button>
      </div>
      {!master && <p className="note warn">The main breaker is off, so every light is dark and nothing is metered — TVs and jacuzzi heaters are off too.</p>}

      {groups.map((g) => (
        <div key={g}>
          <p className="eyebrow">{g}</p>
          <ul className="zone-list">
            {ZONES.filter((z) => z.group === g).map((z) => {
              const on = master && !off.includes(z.id)
              return (
                <li key={z.id} className={on ? 'on' : 'off'}>
                  <span className="dot" />
                  <span className="zone-name">{z.name}</span>
                  <button className={'btn small ' + (on ? '' : 'primary')} id={'zone-' + z.id} disabled={!master} onClick={() => toggle(z.id)}>
                    {on ? 'Turn off' : 'Turn on'}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      <p className="note">
        Every room also has a switch on the wall beside its door — walk up and press use. Jacuzzi heaters (1.5 kW), showers
        and TVs (140 W) only draw while they are on, and they show up here too.
      </p>
    </Panel>
  )
}
