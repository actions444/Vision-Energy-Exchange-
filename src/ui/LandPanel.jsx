import { Panel } from './UI.jsx'
import { useJobs } from '../state/jobs.js'
import { PLOTS, ANIMALS, HOUSE_TIERS, plotById, houseTierById, PLOT_ANIMAL_CAP } from '../config/ranch.js'

const fmt = (n) => Math.round(n).toLocaleString('en-US')

/** Vision Storms Ranch: buy the plot you're standing at, then (once it's yours) stock it with
 * horses, cattle, sheep or pigs - real credits out of the wallet either way, same honest scope as
 * the hotel front desk and the bank. See world/Ranch.jsx for the fenced lots and the animals
 * themselves, state/jobs.js for buyPlot/buyAnimal/sellAnimal. */
export default function LandPanel({ plotId }) {
  const s = useJobs()
  const plot = plotById(plotId) || PLOTS[0]
  const owned = s.ownedLand.includes(plot.id)
  const herd = s.livestock[plot.id] || []
  const houseTierId = s.houses[plot.id]
  const houseTier = houseTierId && houseTierById(houseTierId)

  return (
    <Panel title={plot.name} eyebrow="Vision Storms Ranch · Maple Court">
      <div className="admin-list">
        {!owned ? (
          <div className="admin-row jobs-current">
            <span style={{ flex: 1 }}>
              <b>For sale</b><br />
              <small>Fenced lot, room for up to {PLOT_ANIMAL_CAP} animals once it's yours.</small>
            </span>
            <button className="btn small primary" disabled={s.wallet < plot.price} onClick={() => s.buyPlot(plot.id)}>
              Buy — {fmt(plot.price)} cr
            </button>
          </div>
        ) : (
          <>
            <p className="hint">You own this lot{houseTier ? ` - the ${houseTier.name} is built here` : ''} - {herd.length}/{PLOT_ANIMAL_CAP} animals on it.</p>

            <p className="hint">House</p>
            <ul className="admin-list jobs-list">
              {HOUSE_TIERS.map((t) => (
                <li key={t.id} className="admin-row" id={'house-' + t.id}>
                  <span style={{ flex: 1, minWidth: 200 }}>
                    <b>{t.name}</b> <small>{fmt(t.price)} cr</small><br />
                    <small>{t.desc}</small>
                  </span>
                  <button
                    className={'btn small ' + (houseTierId === t.id ? 'on' : 'primary')}
                    disabled={houseTierId === t.id || s.wallet < t.price}
                    onClick={() => s.buildHouse(plot.id, t.id)}
                  >
                    {houseTierId === t.id ? 'Built' : houseTier ? 'Trade in' : 'Build'}
                  </button>
                </li>
              ))}
            </ul>
            {houseTier && (
              <div className="admin-row">
                <span style={{ flex: 1 }}><small>Demolish the {houseTier.name} for half back.</small></span>
                <button className="btn small danger" onClick={() => s.demolishHouse(plot.id)}>Demolish — +{fmt(Math.round(houseTier.price * 0.5))} cr</button>
              </div>
            )}

            <p className="hint">Livestock</p>
            <ul className="admin-list jobs-list">
              {ANIMALS.map((a) => (
                <li key={a.id} className="admin-row">
                  <span style={{ flex: 1, minWidth: 160 }}><b>{a.name}</b> <small>{fmt(a.price)} cr</small></span>
                  <button
                    className="btn small primary"
                    disabled={s.wallet < a.price || herd.length >= PLOT_ANIMAL_CAP}
                    onClick={() => s.buyAnimal(plot.id, a.id)}
                  >
                    Buy
                  </button>
                </li>
              ))}
            </ul>
            {herd.length > 0 && (
              <>
                <p className="hint">Your herd</p>
                <ul className="admin-list jobs-list">
                  {herd.map((rec) => {
                    const a = ANIMALS.find((x) => x.id === rec.kind)
                    return (
                      <li key={rec.id} className="admin-row">
                        <span style={{ flex: 1 }}>{a?.name || rec.kind}</span>
                        <button className="btn small danger" onClick={() => s.sellAnimal(plot.id, rec.id)}>
                          Sell — {fmt(Math.round((a?.price || 0) * 0.5))} cr
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </>
        )}
        <p className="note">Buying a lot and stocking it with animals is a real purchase (no refund on the lot; animals sell back for half) - same as the businesses and vehicles in the Job Center.</p>
      </div>
    </Panel>
  )
}
