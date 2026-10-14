// Seats: every chair, couch, bench and stool registers here. Walking up to one shows a Sit
// button; sitting aligns the avatar with the seat until the visitor chooses Stand.
import { useEffect } from 'react'
import * as THREE from 'three'
import { registerInteractable, playerState } from './runtime.js'
import { peerData } from '../net/netManager.js'

function takenByPeer(seat) {
  for (const pd of peerData.values()) if (pd.sit && pd.to && Math.hypot(pd.to[0] - seat.position[0], pd.to[2] - seat.position[2]) < 0.35 && Math.abs(pd.to[1] - seat.floorY) < 0.6) return true
  return false
}

export const seats = new Map() // id -> seat
let counter = 0

/**
 * seat = {
 *   position: [x, y, z]  centre of the sitting surface (world)
 *   yaw: number          direction the sitter faces (radians, avatar forward = +z rotated by yaw)
 *   height: number       seat surface height above the floor it stands on (default 0.45)
 *   label?: string       e.g. 'Sit on bench'
 *   stand?: [x, y, z]    optional safe standing spot (otherwise the player finds a free one)
 * }
 * Occupancy: `occupiedBy` is set while this visitor sits; seats a remote visitor is sitting on
 * are detected from multiplayer positions and refused too.
 */
export function registerSeat(def) {
  const id = def.id || 'seat-' + ++counter
  const seat = { height: 0.45, label: 'Sit', ...def, id }
  seat.floorY = seat.position[1] - seat.height
  seats.set(id, seat)
  const off = registerInteractable(id, {
    position: new THREE.Vector3(seat.position[0], seat.floorY, seat.position[2]),
    radius: 1.3,
    label: () => (seat.occupiedBy || takenByPeer(seat) ? 'Seat taken' : seat.label),
    onInteract: () => { if (!seat.occupiedBy && !takenByPeer(seat)) playerState.sitRequest = seat },
  })
  return () => { off(); seats.delete(id) }
}

/** Register a list of seats for the lifetime of a component. */
export function useSeats(list, deps = []) {
  useEffect(() => {
    const offs = list.map((s) => registerSeat(s))
    return () => offs.forEach((f) => f())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/** Seat positions for a row of `n` seats along a local x axis, rotated by yaw around `center`. */
export function seatRow(center, yaw, n, spacing, height = 0.45, label = 'Sit') {
  const out = []
  const c = Math.cos(yaw), s = Math.sin(yaw)
  for (let i = 0; i < n; i++) {
    const lx = (i - (n - 1) / 2) * spacing
    out.push({ position: [center[0] + lx * c, center[1] + height, center[2] - lx * s], yaw, height, label })
  }
  return out
}
