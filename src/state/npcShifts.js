// NPC work times. Every NPC in the world registers itself here with its default hours (or none = always on
// duty). The owner can override any of them in Owner tools → NPC work times: custom hours, always on duty,
// or off duty (not in the world). Overrides are stored on this device and take effect immediately.
import { create } from 'zustand'

const KEY = 'vsw-npc-shifts'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} } }
const save = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)) } catch {} }

export const useNpcShifts = create((set, get) => ({
  overrides: load(), // id -> { mode: 'always' } | { mode: 'off' } | { mode: 'shift', from, to }   (hours 0..24, a shift may wrap midnight)
  directory: {}, // id -> { id, name, title, place, def: [from, to] | null }  (filled by the NPC systems as they mount)
  setOverride: (id, ov) => { const overrides = { ...get().overrides, [id]: ov }; save(overrides); set({ overrides }) },
  clearOverride: (id) => { const overrides = { ...get().overrides }; delete overrides[id]; save(overrides); set({ overrides }) },
  clearAll: () => { save({}); set({ overrides: {} }) },
  register: (list) => {
    const directory = { ...get().directory }
    let changed = false
    for (const e of list) { const old = directory[e.id]; if (!old || old.name !== e.name || old.title !== e.title || old.place !== e.place || String(old.def) !== String(e.def)) { directory[e.id] = e; changed = true } }
    if (changed) set({ directory })
  },
}))

/** The hours in force for one NPC: the owner's override if there is one, otherwise the default. */
export function hoursFor(id, def) {
  const ov = useNpcShifts.getState().overrides[id]
  if (ov) return ov
  return def ? { mode: 'shift', from: def[0], to: def[1] } : { mode: 'always' }
}

/** Is this NPC working at `hour` (0..24)? `def` is the NPC's default [from, to] or null/undefined for always. */
export function onDuty(id, def, hour) {
  const h = hoursFor(id, def)
  if (h.mode === 'always') return true
  if (h.mode === 'off') return false
  return h.from <= h.to ? hour >= h.from && hour < h.to : hour >= h.from || hour < h.to
}

export const fmtHour = (h) => { const m = Math.round(h * 60) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0') }
export const parseHour = (s) => { const [a, b] = String(s).split(':').map(Number); return (a || 0) + (b || 0) / 60 }
