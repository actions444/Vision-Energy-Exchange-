import { create } from 'zustand'
import { AVATAR_ACCENTS, SKIN_TONES } from '../config/theme.js'

const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

function loadProfile() {
  try {
    const raw = localStorage.getItem('vsw-profile')
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

const saved = loadProfile()

export const useStore = create((set, get) => ({
  // 'start' = title screen with cinematic camera, 'playing' = avatar control
  phase: 'start',
  mode: 'single', // 'single' | 'multi'
  isTouch: coarse,

  profile: saved || {
    name: 'Guest',
    accent: AVATAR_ACCENTS[0],
    skin: SKIN_TONES[1],
  },
  setProfile: (p) => {
    const profile = { ...get().profile, ...p }
    try { localStorage.setItem('vsw-profile', JSON.stringify(profile)) } catch {}
    set({ profile })
  },

  settings: { quality: coarse ? 'low' : 'high', drawDist: coarse ? 'near' : 'far', bloom: true, rain: true, traffic: coarse ? 'light' : 'normal', aircraft: true, aircraftSound: true, avatarStyle: 'classic', npcVoice: true },
  setSetting: (k, v) => set((s) => ({ settings: { ...s.settings, [k]: v } })),

  // nearest interactable the avatar can use right now
  prompt: null,
  setPrompt: (prompt) => set({ prompt }),

  // HTML overlays
  panel: null, // { type: 'content', id } | { type: 'assets' } | { type: 'settings' } | { type: 'help' }
  openPanel: (panel) => set({ panel }),
  closePanel: () => set({ panel: null }),

  toast: null,
  showToast: (text) => {
    const id = Math.random()
    set({ toast: { text, id } })
    setTimeout(() => { if (get().toast?.id === id) set({ toast: null }) }, 3200)
  },

  enterWorld: (mode) => set({ phase: 'playing', mode, panel: null }),
  exitWorld: () => set({ phase: 'start', panel: null, prompt: null }),

  // gallery media state
  media: { audio: null, video: null }, // { title } when playing
  setMedia: (m) => set((s) => ({ media: { ...s.media, ...m } })),
}))
