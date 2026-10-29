import { CITIES } from '../config/worldMap.js'
import { I45 } from '../config/i45.js'
import { useStore } from '../state/store.js'
import { playerState } from '../state/runtime.js'

// Colours per area, matching the other project's map.
const AREA_COLORS = {
  downtown: '#ff7edb',
  suburban: '#6cf7c2',
  commercial: '#6cd0ff',
  east_texas: '#ffd36c',
  industrial: '#ff9f6c',
  lake_recreation: '#8cff6c',
  suburban_residential: '#c08cff',
  beach_waterfront: '#6cc2ff',
}

const VB_W = 600
const VB_H = 480
const PAD = 60

/**
 * WORLD MAP panel: the eight Texas destinations on a schematic map, with a list to travel
 * to any built destination. Opened from the WORLD MAP button in the HUD's top nav.
 * Built cities teleport the player; unbuilt cities are shown as disabled.
 */
export default function WorldMap() {
  const close = useStore((s) => s.closePanel)
  const showToast = useStore((s) => s.showToast)

  const xs = CITIES.map((c) => c.map[0])
  const zs = CITIES.map((c) => c.map[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minZ = Math.min(...zs)
  const maxZ = Math.max(...zs)
  const spanX = Math.max(maxX - minX, 1)
  const spanZ = Math.max(maxZ - minZ, 1)
  const project = ([x, z]) => ({
    px: PAD + ((x - minX) / spanX) * (VB_W - PAD * 2),
    py: PAD + ((z - minZ) / spanZ) * (VB_H - PAD * 2),
  })
  const hub = project(CITIES[0].map)

  const goTo = (city) => {
    if (!city.built) return
    if (city.id === 'houston') playerState.respawn = true
    else if (city.id === 'galveston') playerState.teleport = [...I45.arrivalTeleport]
    close()
    showToast(city.id === 'galveston' ? 'Welcome to Galveston' : 'Welcome to Houston')
  }

  return (
    <div className="panel-wrap" onPointerDown={(e) => { if (e.target === e.currentTarget) close() }}>
      <section className="panel wide" role="dialog" aria-label="Texas World Map">
        <header>
          <div>
            <p className="eyebrow">Travel</p>
            <h2>Texas World Map</h2>
          </div>
          <button className="close" onClick={close} aria-label="Close">Close</button>
        </header>
        <p className="muted">Click a built city on the map or in the list to travel there. Galveston is reached by the I-45 bridge.</p>

        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="worldmap-svg" role="img" aria-label="Map of Southeast Texas destinations">
          {CITIES.filter((c) => c.id !== 'houston').map((c) => {
            const b = project(c.map)
            return (
              <line key={'road-' + c.id} x1={hub.px} y1={hub.py} x2={b.px} y2={b.py} stroke="rgba(255,255,255,0.18)" strokeWidth={2} strokeDasharray="6 5" />
            )
          })}
          {CITIES.map((c) => {
            const { px, py } = project(c.map)
            const color = c.built ? AREA_COLORS[c.area] ?? '#ffffff' : '#555'
            const isHub = c.id === 'houston'
            return (
              <g
                key={c.id}
                transform={`translate(${px}, ${py})`}
                className="worldmap-pin"
                role="button"
                tabIndex={c.built ? 0 : -1}
                aria-disabled={!c.built}
                aria-label={c.built ? `Travel to ${c.name}` : `${c.name}, not built yet`}
                onClick={() => goTo(c)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') goTo(c) }}
                style={{ cursor: c.built ? 'pointer' : 'not-allowed', opacity: c.built ? 1 : 0.5 }}
              >
                <circle r={isHub ? 12 : 8} fill={color} stroke="#0a0714" strokeWidth={2} />
                <text y={isHub ? -20 : -14} textAnchor="middle" className="worldmap-label">{c.name}</text>
              </g>
            )
          })}
        </svg>

        <section className="dir-group">
          <h3>Texas Destinations</h3>
          <div className="dir-grid">
            {CITIES.map((c) => (
              <button key={c.id} className="dir-btn" disabled={!c.built} onClick={() => goTo(c)} title={c.built ? '' : 'Not built in this world yet'}>
                <strong>{c.name}</strong>
                <br />
                <span className="muted small">{c.built ? c.description : 'Not built in this world yet'}</span>
              </button>
            ))}
          </div>
        </section>
      </section>
    </div>
  )
}
