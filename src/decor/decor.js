// Decorating: who may decorate which space, the saved design of every space, the design being
// edited (with undo), and saving it.
//
// A design is a document `decor/<spaceId>`:
//   { items: [{ uid, itemId, x, z, yaw }], floor, wall: { kind: 'paint'|'paper', id }, light, door,
//     updatedAt, by }
// Who may change it: the owner (any space) or the renter of that room right now. On a self-hosted
// server the server re-checks the renter's booking before saving (server/storeApi.js); in the
// rental preview sandbox (no server) designs are saved on this device only.
import { create } from 'zustand'
import { backend, useBackend } from '../backend/backend.js'
import { useRentals, rentalAccess } from '../rentals/client.js'
import { spaceById, fits } from './spaces.js'
import { itemById } from './catalog.jsx'
import { logAccess } from '../admin/audit.js'

const EMPTY = { items: [], floor: null, wall: null, light: null, door: null }
const LS = (id) => 'vsw-decor-' + id
const uid = () => 'd' + Math.random().toString(36).slice(2, 9)

export const useDecor = create(() => ({
  saved: {}, // spaceId -> design (what everyone sees)
  open: false, // decorate menu open
  spaceId: null, // space being decorated
  draft: null, // design being edited
  dirty: false,
  undo: [],
  placing: null, // { itemId, uid?, x, z, yaw, valid }
  selected: null, // uid of the selected placed item
  allowed: null, // null = checking, { ok, how, reason }
  saving: false,
  message: null,
}))

let started = false
export function startDecor() {
  if (started) return
  started = true
  const api = backend()
  if (api) api.sub('decor', (docs) => useDecor.setState(() => ({ saved: { ...localDesigns(), ...Object.fromEntries(docs.map(({ id, ...d }) => [id, d])) } })))
  else useDecor.setState({ saved: localDesigns() })
}
function localDesigns() {
  const out = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith('vsw-decor-')) out[k.slice(10)] = { ...JSON.parse(localStorage.getItem(k)), local: true }
    }
  } catch {}
  return out
}

/** Can this visitor decorate `spaceId`? */
export async function checkAllowed(spaceId) {
  if (useBackend.getState().admin) return { ok: true, how: 'owner' }
  const room = useRentals.getState().rooms.find((r) => r.id === spaceId)
  if (!room) return { ok: false, reason: 'This space is not available to rent, so only the owner can decorate it.' }
  try { if (await rentalAccess.isRenter(spaceId)) return { ok: true, how: 'renter' } } catch {}
  return { ok: false, reason: 'You can decorate a space while you rent it. Rent this room, or sign in as its renter.' }
}

export async function openDecorator(spaceId) {
  const space = spaceById(spaceId)
  if (!space) return
  useDecor.setState({ open: true, spaceId, allowed: null, placing: null, selected: null, undo: [], message: null })
  const allowed = await checkAllowed(spaceId)
  const saved = useDecor.getState().saved[spaceId] || EMPTY
  useDecor.setState({ allowed, draft: JSON.parse(JSON.stringify({ ...EMPTY, ...saved })), dirty: false })
  if (allowed.ok && allowed.how === 'owner') {
    const room = useRentals.getState().rooms.find((r) => r.id === spaceId)
    if (room?.now && room.now.visibility !== 'public') logAccess({ kind: 'inspect', roomId: spaceId, roomName: room.name, detail: 'opened the decorator in a privately booked space' })
  }
}
export function closeDecorator(force = false) {
  const s = useDecor.getState()
  if (s.dirty && !force) { useDecor.setState({ message: 'You have unsaved changes. Save them, or choose Discard.' }); return false }
  useDecor.setState({ open: false, placing: null, selected: null, draft: null, dirty: false, undo: [], message: null })
  return true
}

// ---------- editing (every change is undoable) ----------
function edit(fn) {
  const s = useDecor.getState()
  if (!s.draft || !s.allowed?.ok) return
  const before = JSON.parse(JSON.stringify(s.draft))
  const next = JSON.parse(JSON.stringify(s.draft))
  fn(next)
  useDecor.setState({ draft: next, dirty: true, undo: [...s.undo.slice(-49), before], message: null })
}
export function undo() {
  const s = useDecor.getState()
  if (!s.undo.length) return
  useDecor.setState({ draft: s.undo[s.undo.length - 1], undo: s.undo.slice(0, -1), dirty: true, placing: null, selected: null })
}
export const setFloor = (id) => edit((d) => { d.floor = id })
export const setWall = (kind, id) => edit((d) => { d.wall = id ? { kind, id } : null })
export const setLight = (id) => edit((d) => { d.light = id })
export const setDoor = (id) => edit((d) => { d.door = id })

/** Start placing a new item (or moving a placed one), in front of the avatar. */
export function beginPlace(itemId, fromUid = null, start) {
  const s = useDecor.getState()
  if (!s.allowed?.ok) return
  const existing = fromUid ? s.draft.items.find((i) => i.uid === fromUid) : null
  const yaw = existing?.yaw ?? start?.yaw ?? 0
  useDecor.setState({ placing: { itemId, uid: fromUid, x: 0, z: 0, yaw, valid: false, follow: !existing }, selected: null })
  movePlacing(existing?.x ?? start?.x ?? 0, existing?.z ?? start?.z ?? 0) // snaps and checks the spot
}
export function movePlacing(x, z) {
  const s = useDecor.getState()
  if (!s.placing) return
  const space = spaceById(s.spaceId)
  const item = itemById(s.placing.itemId)
  const sx = Math.round(x * 10) / 10, sz = Math.round(z * 10) / 10
  useDecor.setState({ placing: { ...s.placing, x: sx, z: sz, valid: !!(space && item && fits(space, item, sx, sz, s.placing.yaw)) } })
}
export function rotatePlacing(delta) {
  const s = useDecor.getState()
  if (!s.placing) return
  const yaw = s.placing.yaw + delta
  const space = spaceById(s.spaceId)
  const item = itemById(s.placing.itemId)
  useDecor.setState({ placing: { ...s.placing, yaw, valid: !!(space && item && fits(space, item, s.placing.x, s.placing.z, yaw)) } })
}
export function nudgePlacing(dx, dz) { const p = useDecor.getState().placing; if (p) { useDecor.setState({ placing: { ...p, follow: false } }); movePlacing(p.x + dx, p.z + dz) } }
export function confirmPlace() {
  const p = useDecor.getState().placing
  if (!p || !p.valid) { useDecor.setState({ message: 'That spot is outside this space or blocks the doorway.' }); return }
  edit((d) => {
    if (p.uid) { const it = d.items.find((i) => i.uid === p.uid); if (it) Object.assign(it, { x: p.x, z: p.z, yaw: p.yaw }) } else d.items.push({ uid: uid(), itemId: p.itemId, x: p.x, z: p.z, yaw: p.yaw })
  })
  useDecor.setState({ placing: null })
}
export const cancelPlace = () => useDecor.setState({ placing: null })
export const removeItem = (u) => { edit((d) => { d.items = d.items.filter((i) => i.uid !== u) }); useDecor.setState({ selected: null }) }
export function rotateItem(u, delta) {
  const s = useDecor.getState()
  const it = s.draft?.items.find((i) => i.uid === u)
  const space = spaceById(s.spaceId)
  if (!it || !space) return
  if (!fits(space, itemById(it.itemId), it.x, it.z, it.yaw + delta)) { useDecor.setState({ message: 'Rotating it there would push it outside the space.' }); return }
  edit((d) => { const x = d.items.find((i) => i.uid === u); x.yaw += delta })
}

// ---------- saving ----------
export async function saveDesign() {
  const s = useDecor.getState()
  if (!s.draft || !s.allowed?.ok) return
  const doc = { items: s.draft.items, floor: s.draft.floor, wall: s.draft.wall, light: s.draft.light, door: s.draft.door, updatedAt: new Date().toISOString(), by: s.allowed.how }
  useDecor.setState({ saving: true, message: null })
  const api = backend()
  try {
    if (api && (s.allowed.how === 'owner' || useRentals.getState().mode === 'server')) {
      const token = useRentals.getState().customer?.token
      await api.set('decor/' + s.spaceId, doc, s.allowed.how === 'renter' && token ? { 'x-customer-token': token } : undefined)
      try { localStorage.removeItem(LS(s.spaceId)) } catch {}
      useDecor.setState((st) => ({ saved: { ...st.saved, [s.spaceId]: doc }, dirty: false, saving: false, message: 'Saved. Everyone who visits sees this design.' }))
    } else {
      localStorage.setItem(LS(s.spaceId), JSON.stringify(doc))
      useDecor.setState((st) => ({ saved: { ...st.saved, [s.spaceId]: { ...doc, local: true } }, dirty: false, saving: false, message: 'Saved on this device (rental preview mode: designs are shared once rentals run on a server).' }))
    }
  } catch (e) {
    useDecor.setState({ saving: false, message: 'Could not save: ' + (e.message || e) })
  }
}
export function discardChanges() {
  const s = useDecor.getState()
  const saved = s.saved[s.spaceId] || EMPTY
  useDecor.setState({ draft: JSON.parse(JSON.stringify({ ...EMPTY, ...saved })), dirty: false, undo: [], placing: null, selected: null, message: null })
}

/** The design to render for a space: the draft while editing it, otherwise the saved one. */
export function designFor(spaceId, st = useDecor.getState()) {
  if (st.open && st.spaceId === spaceId && st.draft) return st.draft
  return st.saved[spaceId] || null
}
