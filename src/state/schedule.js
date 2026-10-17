// Automatic timer for the world. Each entry fires once per in-world day when the clock passes its
// hour: switch the lights of every zone off or on, change the weather, or set the clock. Stored
// on this device, and it runs whether or not anyone is standing in the world.
import { create } from 'zustand'
import { useEnv } from './environment.js'
import { useLights } from './power.js'

const KEY = 'vsw-schedule'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
const save = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list)) } catch {} }

export const ACTIONS = {
  lightsOff: { label: 'Lights off everywhere', run: () => useLights.getState().allOff() },
  lightsOn: { label: 'Lights on everywhere', run: () => useLights.getState().allOn() },
  weatherClear: { label: 'Weather: clear', run: () => useEnv.setState({ weather: 'clear' }) },
  weatherRain: { label: 'Weather: rain', run: () => useEnv.setState({ weather: 'rain' }) },
  weatherStorm: { label: 'Weather: thunderstorm', run: () => useEnv.setState({ weather: 'storm' }) },
}

export const useSchedule = create((set, get) => ({
  items: load(),
  add: (hour, action) => {
    const items = [...get().items, { id: Math.random().toString(36).slice(2, 8), hour, action, last: -1 }]
    save(items); set({ items })
  },
  remove: (id) => { const items = get().items.filter((i) => i.id !== id); save(items); set({ items }) },
  toggleOn: (id) => {
    const items = get().items.map((i) => (i.id === id ? { ...i, off: !i.off } : i))
    save(items); set({ items })
  },
}))

let lastTime = null
let day = 0
/** Call every frame with the clock's current hour. Fires each entry once when its hour is reached. */
export function tickSchedule(hours) {
  if (lastTime === null) { lastTime = hours; return }
  const items = useSchedule.getState().items
  // the clock wrapped past midnight: a new in-world day
  if (hours < lastTime) day++
  for (const it of items) {
    if (it.off || !ACTIONS[it.action]) continue
    const crossed = lastTime < it.hour && hours >= it.hour
    if (crossed && it.last !== day) {
      it.last = day
      ACTIONS[it.action].run()
    }
  }
  lastTime = hours
}

