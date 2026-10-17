// Lights and the power bill.
//
// Every switchable fixture belongs to a zone (a room, the lobby, the cinema...). A zone can be
// switched off from the in-world light switch by its door or from the Lights panel, and each
// fixture declares how many watts it draws. While a zone is lit its load runs the meter, and the
// meter is billed at a flat rate — so leaving every light on all night costs real VSE credits.
//
// `power` is the per-frame mirror (read by the light pool and the material updater, no React
// renders); `useLights` is the React view of the same state.
import { create } from 'zustand'

export const RATE = 19 // US cents per kWh (money() and credits() both work in cents)

/** Switchable zones, in the order the Lights panel lists them. */
export const ZONES = [
  { id: 'lobby', name: 'Plaza lobby & corridors', group: 'Energy Exchanges Plaza' },
  { id: 'VSP-101', name: 'Vision Bistro', group: 'Energy Exchanges Plaza' },
  { id: 'VSP-102', name: 'Storms Threads', group: 'Energy Exchanges Plaza' },
  { id: 'VSP-201', name: 'Screening Room', group: 'Energy Exchanges Plaza' },
  { id: 'VSP-202', name: 'Vision Recording Studio', group: 'Energy Exchanges Plaza' },
  { id: 'VSP-301', name: 'Boardroom', group: 'Energy Exchanges Plaza' },
  { id: 'VSP-302', name: 'Skyline Suite', group: 'Energy Exchanges Plaza' },
  ...Array.from({ length: 8 }, (_, i) => ({ id: `floor-${i + 2}`, name: `Plaza floor ${i + 2} corridors`, group: 'Energy Exchanges Plaza' })),
  { id: 'cinema', name: 'Vision Cinema', group: 'Downtown' },
  { id: 'gallery', name: 'Gallery & Records', group: 'Downtown' },
  { id: 'spa', name: 'Spa terrace', group: 'Downtown' },
  { id: 'police-hq', name: 'Police HQ & Cell Block A', group: 'Justice & Rehabilitation' },
  { id: 'police-hq-2', name: 'Police HQ floor 2 · Detectives', group: 'Justice & Rehabilitation' },
  { id: 'police-hq-3', name: 'Police HQ floor 3 · Command', group: 'Justice & Rehabilitation' },
  { id: 'courthouse', name: 'Courthouse & courtroom', group: 'Justice & Rehabilitation' },
  { id: 'county-jail-1', name: 'County Jail floor 1 · Intake & Dining', group: 'Justice & Rehabilitation' },
  { id: 'county-jail-2', name: 'County Jail floor 2 · Housing Pod 2', group: 'Justice & Rehabilitation' },
  { id: 'state-prison-1', name: 'State Prison floor 1 · Reception & Dining', group: 'Justice & Rehabilitation' },
  { id: 'state-prison-2', name: 'State Prison floor 2 · Housing Unit A', group: 'Justice & Rehabilitation' },
  { id: 'state-prison-3', name: 'State Prison floor 3 · Housing Unit B', group: 'Justice & Rehabilitation' },
  { id: 'rehab-1', name: 'Rehab Center floor 1 · Welcome & Café', group: 'Justice & Rehabilitation' },
  { id: 'rehab-2', name: 'Rehab Center floor 2 · Counseling & Groups', group: 'Justice & Rehabilitation' },
  { id: 'rehab-3', name: 'Rehab Center floor 3 · Education & Careers', group: 'Justice & Rehabilitation' },
  { id: 'county-jail-3', name: 'County Jail floor 3 · Housing Pod 3', group: 'Justice & Rehabilitation' },
  { id: 'job-center', name: 'Job Center', group: 'Employment District' },
  { id: 'post-office', name: 'Post Office', group: 'Employment District' },
  { id: 'car-wash-a', name: 'Storm Shine Express Wash', group: 'Employment District' },
  { id: 'car-wash-b', name: 'Quick Bay Wash', group: 'Employment District' },
  { id: 'mansion', name: 'Reign Estate mansion', group: 'Reign Estate' },
  { id: 'library', name: 'Public Library', group: 'Civic' },
  { id: 'museum', name: 'Museum of American Heritage', group: 'Civic' },
  { id: 'gym', name: 'Storm Athletic Club', group: 'Civic' },
  { id: 'A-lobby', name: 'Terrace Building A lobby & stairs', group: 'Meadowbrook' },
  { id: 'A-1a', name: 'Terrace apartment 1A', group: 'Meadowbrook' },
  { id: 'A-2a', name: 'Terrace apartment 2A', group: 'Meadowbrook' },
  { id: 'park-restroom', name: 'Meadowbrook Park restrooms', group: 'Meadowbrook' },
  { id: 'field-restroom', name: 'Meadowbrook Field restrooms', group: 'Meadowbrook' },
  { id: 'landfill-scale', name: 'Landfill scale house', group: 'Cedar Ridge' },
  { id: 'landfill-office', name: 'Landfill site office', group: 'Cedar Ridge' },
  { id: 'depot-office', name: 'Waste-services depot office', group: 'Cedar Ridge' },
  { id: 'warehouse-a', name: 'Cedar Works warehouse A', group: 'Cedar Ridge' },
  { id: 'laundromat', name: 'Velvet Suds Laundromat', group: 'Harbor Parade' },
  { id: 'cleaners', name: 'The Ironing Station', group: 'Harbor Parade' },
  { id: 'island', name: 'Isla Serena villa', group: 'Isla Serena' },
  { id: 'royal', name: 'Royal Films 999 HQ', group: 'Isla Serena' },
]
export const zoneName = (id) => ZONES.find((z) => z.id === id)?.name || id

const stored = (() => {
  try { return JSON.parse(localStorage.getItem('vsw-power') || '{}') } catch { return {} }
})()

// ---- per-frame mirror ----
export const power = {
  master: stored.master !== false,
  off: new Set(stored.off || []), // zones switched off
  watts: 0,
  kWh: stored.kWh || 0,
}

/** Is this zone lit right now? Fixtures with no zone are always on (street lighting, signs). */
export function zoneLit(zone) {
  if (!zone) return true
  return power.master && !power.off.has(zone)
}

// ---- loads ----
// Anything that draws power registers here. `watts` may be a number or a function (a TV that is
// only drawing while it is switched on).
const loads = new Set()
export function registerLoad(load) {
  loads.add(load)
  return () => loads.delete(load)
}

function save() {
  try {
    localStorage.setItem('vsw-power', JSON.stringify({ master: power.master, off: [...power.off], kWh: power.kWh }))
  } catch {}
}

export const useLights = create((set, get) => ({
  master: power.master,
  off: [...power.off],
  watts: 0,
  kWh: power.kWh,

  /** Flip one zone. */
  toggle: (zone) => {
    if (power.off.has(zone)) power.off.delete(zone)
    else power.off.add(zone)
    save()
    set({ off: [...power.off] })
    return !power.off.has(zone)
  },
  isOn: (zone) => !get().off.includes(zone) && get().master,

  setMaster: (on) => { power.master = on; save(); set({ master: on }) },
  allOn: () => { power.off.clear(); power.master = true; save(); set({ off: [], master: true }) },
  allOff: () => { power.off = new Set(ZONES.map((z) => z.id)); save(); set({ off: ZONES.map((z) => z.id) }) },
  resetMeter: () => { power.kWh = 0; save(); set({ kWh: 0 }) },
}))

/** Current draw in watts, recomputed from the registered loads. */
export function currentWatts() {
  let w = 0
  for (const l of loads) {
    if (!zoneLit(l.zone)) continue
    w += typeof l.watts === 'function' ? l.watts() : l.watts
  }
  return w
}

let pub = 0
/** Advance the meter. `dtHours` is elapsed *in-world* hours, so the bill tracks the day/night clock. */
export function tickPower(dtHours, dtReal) {
  power.watts = currentWatts()
  power.kWh += (power.watts / 1000) * dtHours
  pub -= dtReal
  if (pub <= 0) {
    pub = 0.5
    const s = useLights.getState()
    if (Math.abs(s.watts - power.watts) > 1 || Math.abs(s.kWh - power.kWh) > 0.0005) {
      useLights.setState({ watts: power.watts, kWh: power.kWh })
      save()
    }
  }
}

/** The bill so far, in cents. */
export const billFor = (kWh) => kWh * RATE

// ---- switched emissive materials ----
// Fixture glow (ceiling panels, chandelier bulbs, TV screens) is a material property, so each
// switchable fixture gets its own material and this updater drives it from the zone's state.
const switched = new Map() // material -> { zone, on, off, live? }
export function switchedMaterial(material, zone, on, off = 0) {
  switched.set(material, { zone, on, off })
  return material
}
export function updatePowerMaterials() {
  for (const [m, v] of switched) {
    const t = zoneLit(v.zone) ? v.on : v.off
    if (m.emissiveIntensity !== t) m.emissiveIntensity += (t - m.emissiveIntensity) * 0.35
  }
}
