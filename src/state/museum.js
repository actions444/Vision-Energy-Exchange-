import { create } from 'zustand'
import { EXHIBITS } from '../config/museum.js'

// Museum passport: which placards you have read. Saved on this device only (localStorage).
const KEY = 'vsw-museum'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null } }
const saved = load() || {}

export const useMuseum = create((set, get) => ({
  stamps: saved.stamps || {}, // { [exhibitId]: true }
  current: null, // exhibit id shown in the panel
  tab: 'exhibit',
  open: (id) => {
    const stamps = get().stamps
    if (!stamps[id]) {
      const next = { ...stamps, [id]: true }
      set({ stamps: next })
      try { localStorage.setItem(KEY, JSON.stringify({ stamps: next })) } catch { /* private mode */ }
    }
    set({ current: id, tab: 'exhibit' })
  },
  setTab: (tab) => set({ tab }),
  reset: () => { set({ stamps: {} }); try { localStorage.removeItem(KEY) } catch { /* ignore */ } },
}))

export const stampCount = (stamps) => EXHIBITS.filter((e) => stamps[e.id]).length
export const nextUnseen = (stamps) => EXHIBITS.find((e) => !stamps[e.id]) || null
