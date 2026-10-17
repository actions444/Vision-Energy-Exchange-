// The world-wide TV guide: what every screen is showing, and when.
//
// A *slot* is a shared document `guide/<id>` written by the owner:
//   { id, target: { type: 'all' | 'venue' | 'screen', value }, mediaId, title, duration,
//     mode: 'daily' | 'once', utcMin (daily: minute of the UTC day it starts), startAt (once: ms) }
// Because a slot is anchored to the wall clock, every visitor works out the same programme and
// the same position in it, so a music video that began at 20:00 is at the same frame for
// everybody. Visitors can't write slots (the owner's backend rules apply, as for screenings).
//
// Screens register themselves here (TVs, wall screens, the cinema auditoriums). A screen picks
// the most specific slot that is airing: its own id beats its venue, which beats "all screens".
import { create } from 'zustand'
import * as THREE from 'three'
import { backend, useBackend } from '../backend/backend.js'
import { useMedia } from '../media/media.js'
import { now } from '../cinema/cinema.js'

const DAY = 86400000

export const useGuide = create(() => ({
  slots: [], // from the shared store
  screens: {}, // id -> { id, name, venue } (only the metadata; positions live in `registry`)
  volume: 0.8,
  muted: false,
  blocked: false, // the browser stopped sound until the visitor taps/clicks
  tick: 0,
}))

/** Live screens in the world: id -> { id, name, venue, obj, zone, power } */
export const registry = new Map()

export function registerScreen(meta) {
  registry.set(meta.id, meta)
  useGuide.setState((s) => (s.screens[meta.id] ? s : { screens: { ...s.screens, [meta.id]: { id: meta.id, name: meta.name, venue: meta.venue } } }))
  return () => { if (registry.get(meta.id) === meta) registry.delete(meta.id) }
}

/** Ids of cinema auditoriums, which play scheduled slots through the cinema player. */
export function registerStaticScreens(list) {
  useGuide.setState((s) => {
    const screens = { ...s.screens }
    for (const x of list) screens[x.id] = { id: x.id, name: x.name, venue: x.venue }
    return { screens }
  })
}

/** Everything a slot can be scheduled onto, for the pickers. */
export function targets() {
  const screens = Object.values(useGuide.getState().screens)
  const venues = [...new Set(screens.map((s) => s.venue))].sort()
  return { screens, venues }
}

let started = false
export function startGuide() {
  const api = backend()
  if (!api || started) return
  started = true
  api.sub('guide', (docs) => useGuide.setState({ slots: docs.map((d) => ({ ...d })) }))
}

const uid = () => 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
async function write(slot) {
  const api = backend()
  if (!api || !useBackend.getState().admin) throw new Error('Only the owner can change the TV guide.')
  useGuide.setState((s) => ({ slots: [...s.slots.filter((x) => x.id !== slot.id), slot] }))
  await api.set('guide/' + slot.id, slot)
}
export async function addSlot({ target, media, mode = 'daily', utcMin = 0, startAt = 0 }) {
  const slot = {
    id: uid(), target, mediaId: media.id, title: media.title || 'Untitled', kind: media.kind,
    duration: media.duration || null, mode, utcMin, startAt, createdAt: new Date().toISOString(),
  }
  await write(slot)
  return slot
}
export async function removeSlot(id) {
  const api = backend()
  if (!api || !useBackend.getState().admin) throw new Error('Only the owner can change the TV guide.')
  useGuide.setState((s) => ({ slots: s.slots.filter((x) => x.id !== id) }))
  await api.del('guide/' + id)
}

/** Local "HH:MM" (what a person types) -> minute of the UTC day, and back. */
export const localToUtcMin = (hh, mm) => {
  const d = new Date(); d.setHours(hh, mm, 0, 0)
  return d.getUTCHours() * 60 + d.getUTCMinutes()
}
export const utcMinToLocal = (utcMin) => {
  const d = new Date(); d.setUTCHours(Math.floor(utcMin / 60), utcMin % 60, 0, 0)
  return d
}
export const clock = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const specificity = (slot, screen) => {
  const t = slot.target || { type: 'all' }
  if (t.type === 'screen') return t.value === screen.id ? 3 : 0
  if (t.type === 'venue') return t.value === screen.venue ? 2 : 0
  return 1
}
const mediaOf = (slot, items) => items.find((m) => m.id === slot.mediaId) || null
const lengthOf = (slot, media) => (media?.duration || slot.duration || 3 * 3600) * 1000

/** The latest start time of a slot at or before t (null for a one-off that has not started). */
function startBefore(slot, t) {
  if (slot.mode === 'once') return slot.startAt <= t ? slot.startAt : null
  const base = (slot.utcMin || 0) * 60000
  return Math.floor((t - base) / DAY) * DAY + base
}
function startAfter(slot, t) {
  if (slot.mode === 'once') return slot.startAt > t ? slot.startAt : null
  const base = (slot.utcMin || 0) * 60000
  return (Math.floor((t - base) / DAY) + 1) * DAY + base
}

/**
 * What a screen is airing at time t, or null. `position` is seconds into the media.
 * Pass `slots`/`items` to test without the stores.
 */
export function programFor(screenId, t = now(), slots = useGuide.getState().slots, items = useMedia.getState().items, screens = useGuide.getState().screens) {
  const screen = screens[screenId] || { id: screenId, venue: '' }
  let best = null
  for (const slot of slots) {
    const sp = specificity(slot, screen)
    if (!sp) continue
    const media = mediaOf(slot, items)
    if (!media || media.published === false) continue
    const start = startBefore(slot, t)
    if (start == null) continue
    const len = lengthOf(slot, media)
    if (t - start >= len) continue
    if (!best || sp > best.sp || (sp === best.sp && start > best.start)) best = { sp, start, slot, media, len }
  }
  if (!best) return null
  return {
    slot: best.slot, media: best.media, start: best.start, endsAt: best.start + best.len,
    position: (t - best.start) / 1000, key: best.slot.id + '@' + best.start,
  }
}

/** The next programmes on a screen within `hours`, soonest first: [{ slot, media, start }]. */
export function upcomingFor(screenId, t = now(), hours = 24, slots = useGuide.getState().slots, items = useMedia.getState().items, screens = useGuide.getState().screens) {
  const screen = screens[screenId] || { id: screenId, venue: '' }
  const out = []
  for (const slot of slots) {
    if (!specificity(slot, screen)) continue
    const media = mediaOf(slot, items)
    if (!media) continue
    let s = startAfter(slot, t)
    while (s != null && s < t + hours * 3600000) {
      out.push({ slot, media, start: s })
      if (slot.mode === 'once') break
      s += DAY
    }
  }
  return out.sort((a, b) => a.start - b.start)
}

// ---------------------------------------------------------------- per-screen draw surface
const surfaces = new Map()
/** A material showing the screen's live feed, or null when it has none right now. */
export function guideSurface(screenId) {
  const f = feeds.byScreen.get(screenId)
  if (!f) return null
  let m = surfaces.get(screenId)
  if (!m) { m = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }); surfaces.set(screenId, m) }
  if (m.map !== f.texture) { m.map = f.texture; m.needsUpdate = true }
  return m
}
/** Filled in by guidePlayer.js each tick. */
export const feeds = { byScreen: new Map() }
