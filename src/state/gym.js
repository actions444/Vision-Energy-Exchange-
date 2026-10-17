import { create } from 'zustand'
import { OMEGA, MET, KIND, BODY_KG } from '../config/workout.js'

// Workout tracking for the gym. The tracker (WorkoutTracker in world/gym/Gym.jsx) feeds `session` while the player is on a
// machine; when they stop, the session is added to lifetime totals kept in localStorage on this device.
// Heart rate is SIMULATED from the exercise's MET value (there is no sensor); calories use the MET formula in config/workout.js.

const KEY = 'vsw-gym'
const blank = () => ({ sessions: 0, seconds: 0, kcal: 0, reps: 0, km: 0, firstDay: null, perKind: {} })
function load() {
  try { const t = JSON.parse(localStorage.getItem(KEY) || 'null'); if (t && typeof t === 'object') return { ...blank(), ...t } } catch { /* storage unavailable */ }
  return blank()
}
function save(t) { try { localStorage.setItem(KEY, JSON.stringify(t)) } catch { /* storage unavailable */ } }

export const useGym = create((set, get) => ({
  session: null, // { kind, name, t, kcal, reps, dist, unit, hr } while exercising
  totals: load(),
  setSession: (session) => set({ session }),
  finish: (s) => {
    if (!s || s.t < 5) return null
    const t = get().totals
    const pk = { ...t.perKind }
    pk[s.kind] = { n: (pk[s.kind]?.n || 0) + 1, seconds: (pk[s.kind]?.seconds || 0) + s.t }
    const next = {
      sessions: t.sessions + 1, seconds: t.seconds + s.t, kcal: t.kcal + s.kcal, reps: t.reps + s.reps,
      km: t.km + (s.unit === 'km' ? s.dist : s.unit === 'm' ? s.dist / 1000 : 0), firstDay: t.firstDay || new Date().toISOString().slice(0, 10), perKind: pk,
    }
    save(next); set({ totals: next })
    return next
  },
  reset: () => { const b = blank(); save(b); set({ totals: b, session: null }) },
}))

/** Pure maths for one tick of a session (used by the tracker and by tests). */
export function stepSession(prev, kind, dt) {
  const k = KIND[kind] || { name: kind }
  const s = prev || { kind, name: k.name, t: 0, kcal: 0, reps: 0, dist: 0, unit: k.unit || null, hr: 78 }
  const t = s.t + dt
  const met = MET[kind] || 5
  const kcal = s.kcal + (met * 3.5 * BODY_KG) / 200 / 60 * dt
  const reps = Math.floor((t * (OMEGA[kind] || 3)) / (Math.PI * 2))
  const dist = k.perRep ? reps * k.perRep : 0
  const target = Math.min(178, 72 + met * 8)
  const hr = s.hr + (target - s.hr) * (1 - Math.exp(-dt / 38))
  return { ...s, t, kcal, reps, dist, hr }
}
