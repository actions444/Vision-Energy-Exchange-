// Seeing a room before renting it:
//  - live photos: real renders of the actual room from five viewpoints (PhotoBooth.jsx)
//  - virtual tour: the visitor is placed inside the room, read-only, and can return to the
//    listing with their booking form untouched
//  - visit: walk to the room's door in the real building
// While a room that someone else has booked privately is photographed or toured, the renter's
// own decorations and any visitors inside are hidden ("privacy mask").
import { create } from 'zustand'
import { playerState, cameraState } from '../state/runtime.js'
import { useStore } from '../state/store.js'
import { useRentals } from './client.js'
import { useBackend } from '../backend/backend.js'
import { photoViews, tourSpot, doorSpot } from '../config/roomInfo.js'
import { spaceById } from '../decor/spaces.js'
import { closeDecorator } from '../decor/decor.js'

export const usePreview = create(() => ({
  tour: null, // { roomId, name, ret: { pos, yaw, cam } }
  mask: null, // spaceId whose renter content is hidden
  photos: {}, // roomId -> { at, images: [{ label, url }] }
  shooting: null, // roomId being photographed
}))

/** Booking form drafts and the rent panel's place, so returning from a tour restores them. */
export const useRentDraft = create(() => ({ tab: 'browse', roomId: null, view: null, forms: {} }))
export const setForm = (roomId, patch) => useRentDraft.setState((s) => ({ forms: { ...s.forms, [roomId]: { ...(s.forms[roomId] || {}), ...patch } } }))

/** Should this visitor see the room without the current renter's content? */
function needsMask(roomId) {
  if (useBackend.getState().admin) return false
  const room = useRentals.getState().rooms.find((r) => r.id === roomId)
  const mine = useRentals.getState().myBookings?.some((b) => b.roomId === roomId && b.status === 'approved' && new Date(b.start) <= new Date() && new Date(b.end) > new Date())
  return !!(room?.now && room.now.visibility !== 'public' && !mine)
}

/** Is the point inside the masked room? (used to hide other visitors there) */
export function inMaskedRoom(x, y, z) {
  const id = usePreview.getState().mask
  const s = id && spaceById(id)
  if (!s) return false
  const [x0, x1, z0, z1] = s.rect
  return x > x0 - 0.2 && x < x1 + 0.2 && z > z0 - 0.2 && z < z1 + 0.2 && Math.abs(y - s.floorY) < 2
}

// ---------- live photos ----------
let job = null
export const photoJob = () => job
/** Render the room from its viewpoints. Cached for 2 minutes. */
export function takePhotos(roomId, force = false) {
  const cached = usePreview.getState().photos[roomId]
  if (!force && cached && Date.now() - cached.at < 120000) return
  if (job) return
  const views = photoViews(roomId)
  if (!views.length) return
  job = { roomId, views, i: 0, wait: 4, images: [], hadMask: usePreview.getState().mask }
  usePreview.setState({ shooting: roomId, mask: needsMask(roomId) ? roomId : usePreview.getState().mask })
  playerState.hideAvatar = true
  cameraState.override = views[0]
}
export function finishPhotos() {
  if (!job) return
  const { roomId, images, hadMask } = job
  job = null
  cameraState.override = null
  playerState.hideAvatar = false
  usePreview.setState((s) => ({ shooting: null, mask: s.tour ? s.mask : hadMask, photos: { ...s.photos, [roomId]: { at: Date.now(), images } } }))
}

// ---------- virtual tour ----------
export function startTour(roomId) {
  const room = useRentals.getState().rooms.find((r) => r.id === roomId)
  const spot = room?.tourStart ? { position: room.tourStart.slice(0, 3), yaw: room.tourStart[3] } : tourSpot(roomId)
  if (!spot) return
  closeDecorator(true)
  const p = playerState.position
  usePreview.setState({
    tour: { roomId, name: room?.name || roomId, ret: { pos: [p.x, p.y + 0.1, p.z], yaw: playerState.yaw, cam: { yaw: cameraState.yaw, pitch: cameraState.pitch, distance: cameraState.distance } } },
    mask: needsMask(roomId) ? roomId : null,
  })
  playerState.teleport = spot.position
  cameraState.yaw = spot.yaw
  cameraState.pitch = 0.18
  useRentDraft.setState({ view: 'tour', roomId })
  useStore.getState().closePanel()
}
/** Leave the tour and go back to where you were, with the listing open as you left it. */
export function endTour() {
  const t = usePreview.getState().tour
  if (!t) return
  playerState.teleport = t.ret.pos
  Object.assign(cameraState, t.ret.cam)
  usePreview.setState({ tour: null, mask: null })
  useRentDraft.setState({ view: 'preview', roomId: t.roomId })
  useStore.getState().openPanel({ type: 'rent' })
}

/** Walk-in visit: go to the corridor outside the room's door. */
export function visitRoom(roomId) {
  const d = doorSpot(roomId)
  if (!d) return
  playerState.teleport = d.position
  cameraState.yaw = d.yaw
  cameraState.pitch = 0.2
  useStore.getState().closePanel()
  useStore.getState().showToast(`${d.building}, floor ${d.floor}: the door is in front of you. Take the elevator or stairs to come back down.`)
}
