// Saves the player's avatar profile to their own Vision Storms account and loads it on any device.
//
// Where it works: the hosted Vision Storms page, for a signed-in player whose sharing level can write
// data (Contributor or above). The profile lives in that player's private folder
// (data/users/<their id>/avatar), which no one else can read, not even the owner.
// Everywhere else (a self-hosted copy, a signed-out visitor, a view-only player) the profile stays on
// this device, exactly as before, and `useAccount` says so, so the start screen can tell the player.
import { create } from 'zustand'
import { useStore } from './store.js'
import { backend } from '../backend/backend.js'
import { chooseProfile, cleanProfile } from './profileMerge.js'

/** status: 'checking' | 'account' (saved to your account) | 'device' (saved on this device only) */
export const useAccount = create(() => ({ status: 'checking', reason: '' }))

let path = null
let lastSynced = 0 // updatedAt of the last copy we wrote or received, so we never echo it back
let timer = null
let started = false
let current = null // the backend this sync runs against
let unsubs = [] // listeners from the running sync

/** Tests only: forget the previous run so another scenario can start fresh. */
export function _resetProfileSyncForTests() { unsubs.forEach((u) => { try { u?.() } catch {} }); unsubs = []; started = false; path = null; lastSynced = 0; current = null; clearTimeout(timer) }

const saveOnDevice = (profile) => { try { localStorage.setItem('vsw-profile', JSON.stringify(profile)) } catch {} }
const deviceOnly = (reason) => useAccount.setState({ status: 'device', reason })

async function pushToAccount(profile) {
  const api = current
  const doc = cleanProfile(profile)
  if (!api || !path || !doc) return
  try {
    await api.set(path, doc)
    lastSynced = doc.updatedAt || 0
    useAccount.setState({ status: 'account', reason: '' })
  } catch (e) {
    // invalid_argument = this player's sharing level cannot write data, even to their own folder
    deviceOnly('Your access to this game cannot save to an account (Contributor access is needed). Your avatar is saved on this device.')
    path = null
  }
}

/** Call once, after the backend has been detected. `api` defaults to the detected backend (tests pass a stand-in). */
export async function startProfileSync(api = backend()) {
  if (started) return
  started = true
  current = api
  if (!api || api.kind !== 'hosted' || !api.userId) {
    deviceOnly('Accounts work on the hosted Vision Storms page. On this copy your avatar is saved on this device.')
    return
  }
  const id = await api.userId()
  if (!id) { deviceOnly('Sign in to save your avatar to your account. For now it is saved on this device.'); return }
  path = `data/users/${id}/avatar`

  let cloud = null
  try { cloud = await api.getDoc(path) } catch { cloud = null }
  const local = useStore.getState().profile
  const { profile, push } = chooseProfile(local, cloud)
  if (profile && !push) {
    // the account copy wins: show it now and keep this device in step
    const merged = { ...local, ...profile }
    lastSynced = profile.updatedAt || 0
    useStore.setState({ profile: merged })
    saveOnDevice(merged)
    useAccount.setState({ status: 'account', reason: '' })
  } else if (push) {
    await pushToAccount({ ...local, updatedAt: local.updatedAt || Date.now() })
  }
  if (!path) return // saving was refused; stay device-only

  // later edits: save to the account shortly after the player stops changing things
  unsubs.push(useStore.subscribe((s, prev) => {
    if (!path || s.profile === prev.profile) return
    if ((s.profile.updatedAt || 0) <= lastSynced) return
    clearTimeout(timer)
    timer = setTimeout(() => pushToAccount(useStore.getState().profile), 800)
  }))

  // changes made on another device while this one is open
  unsubs.push(api.subDoc(path, (doc) => {
    const c = cleanProfile(doc)
    if (!c) return
    const cur = useStore.getState().profile
    if ((c.updatedAt || 0) <= Math.max(cur.updatedAt || 0, lastSynced)) return
    lastSynced = c.updatedAt
    const merged = { ...cur, ...c }
    useStore.setState({ profile: merged })
    saveOnDevice(merged)
  }))
}
