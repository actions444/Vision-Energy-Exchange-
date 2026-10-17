// A simple, local-only "Admin mode" switch for the player playing on this device. It is
// independent of the hosted/self-hosted owner-token system (backend/backend.js): that system
// grants admin to whoever can edit the published page or holds a server owner token, which is
// the right model for a shared/multiplayer deployment, but leaves the person testing or playing
// their own single-player copy of the world with no way to walk into their own paid/private
// rooms without first standing up a server. This flag fills that gap — it only ever affects
// access checks on *this* browser (it isn't sent anywhere, doesn't touch the real rental
// records, and never grants write access to the admin REST API) so it's safe to leave on while
// building and testing.
import { create } from 'zustand'

const LS = 'vsw-dev-admin'
const read = () => { try { return localStorage.getItem(LS) === '1' } catch { return false } }
const write = (v) => { try { v ? localStorage.setItem(LS, '1') : localStorage.removeItem(LS) } catch {} }

export const useDevAdmin = create((set, get) => ({
  on: read(),
  toggle() { const on = !get().on; write(on); set({ on }) },
}))

/** True when this device's player has switched on local admin mode. */
export const isDevAdmin = () => useDevAdmin.getState().on
