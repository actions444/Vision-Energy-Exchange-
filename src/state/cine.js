// Cinematic director state. startCine() takes over the camera, hides the player's avatar, freezes
// movement (via a panel), sets dusk, quiets the city music and starts the score; stopCine()
// puts everything back. The per-frame work lives in world/CineStage.jsx.
import { create } from 'zustand'
import { useStore } from './store.js'
import { useEnv } from './environment.js'
import { cameraState, playerState } from './runtime.js'
import { useDriving } from '../vehicles/vehicles.js'
import { musicEngine } from '../music/engine.js'
import { startScore, stopScore } from '../audio/score.js'
import { mansionState } from '../config/mansion.js'
import { START_HOUR, cameraAt } from '../config/cine.js'

export const useCine = create(() => ({ active: false, caption: null, fade: 1, title: 0, shot: 0, who: null }))
export const cine = { t: 0, hold: false, saved: null, unsub: null }

export function startCine() {
  const st = useStore.getState()
  if (useCine.getState().active || st.phase !== 'playing') return false
  if (useDriving.getState().vehicleId) return false // get out of the vehicle first
  const env = useEnv.getState()
  cine.saved = { time: env.time, running: env.running, weather: env.weather, panel: st.panel, hide: playerState.hideAvatar }
  cine.t = 0
  useEnv.getState().set({ time: START_HOUR, running: false, weather: 'clear' })
  useStore.getState().openPanel({ type: 'cine' })
  playerState.hideAvatar = true
  mansionState.doorsForce = false
  const c = cameraAt(0)
  cameraState.override = { pos: c.pos, look: c.look }
  try { musicEngine.setDucked(true) } catch {}
  startScore()
  useCine.setState({ active: true, caption: null, fade: 1, title: 0, shot: 1, who: null })
  // Esc (which closes the panel) or any other panel change ends the film
  cine.unsub = useStore.subscribe((s) => { if (useCine.getState().active && s.panel?.type !== 'cine') stopCine() })
  return true
}

export function stopCine() {
  if (!useCine.getState().active) return
  cine.unsub?.(); cine.unsub = null
  const sv = cine.saved
  stopScore()
  try { musicEngine.setDucked(false) } catch {}
  cameraState.override = null
  mansionState.doorsForce = null
  playerState.hideAvatar = !!sv?.hide
  if (sv) useEnv.getState().set({ time: sv.time, running: sv.running, weather: sv.weather })
  if (useStore.getState().panel?.type === 'cine') useStore.getState().closePanel()
  window.__vswCam && (window.__vswCam.fov = 55, window.__vswCam.updateProjectionMatrix())
  useCine.setState({ active: false, caption: null, fade: 0, title: 0 })
}
