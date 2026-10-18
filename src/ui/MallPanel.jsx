import { useState } from 'react'
import { Panel } from './UI.jsx'
import { useJobs } from '../state/jobs.js'
import { STORES, storeById } from '../config/mall.js'

/** A single Phase-1 storefront's product browser. Mock catalog only (no real Shopify order
 * behind these yet) - see config/mall.js. "Buy" spends VSE credits and marks the item owned,
 * the same pattern CinemaPanel/DecorPanel already use for purchases. */
export default function MallPanel({ storeId }) {
  const [active, setActive] = useState(storeId || STORES[0].id)
  const store = storeById(active) || STORES[0]
  const owned = useJobs((s) => s.ownedMall)
  const buy = useJobs((s) => s.buyMallItem)

  return (
    <Panel title={store.name} eyebrow="Vision Storms Exchanges · Mall" wide>
      <div className="chips tabs" role="tablist">
        {STORES.map((s) => (
          <button key={s.id} role="tab" aria-selected={active === s.id} className={'chip-btn' + (active === s.id ? ' on' : '')} onClick={() => setActive(s.id)}>{s.name}</button>
        ))}
      </div>
      <p className="note" style={{ marginTop: 10 }}>{store.tagline} · placeholder catalog, real Shopify products will replace these once connected</p>
      <div className="item-grid">
        {store.products.map((p) => {
          const have = owned.includes(p.id)
          return (
            <button key={p.id} className="item-card" onClick={() => buy(p)} disabled={have}>
              <b>{p.name}</b>
              <small className={'price-tag' + (have ? ' owned' : '')}>{have ? 'Owned' : `${p.price} cr`}</small>
            </button>
          )
        })}
      </div>
    </Panel>
  )
}
