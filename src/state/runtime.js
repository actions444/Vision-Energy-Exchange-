// Per-frame shared state that must not trigger React renders.
import * as THREE from 'three'

export const playerState = {
  position: new THREE.Vector3(0, 0.2, 8),
  yaw: Math.PI, // facing; avatar local forward is +z
  speed: 0, // horizontal m/s
  grounded: true,
  vy: 0,
  emote: null,
  emoteUntil: 0,
  colliderHandle: null,
  seated: null, // the seat object while sitting
  sit: 0, // 1 while seated (drives the pose; sent to other players)
  workout: null, // gym: the kind of exercise being done ('run', 'press', ...), drives the avatar's workout pose
  sitHeight: 0.45,
  sitRequest: null,
  respawn: false,
  teleport: null,
  swim: null, // null | 'wade' | 'swim' (set by the player controller while in a water volume)
  climb: null, // climb-out animation { t, dur, from, hold, to }
  waterDepth: 0,
  headUnder: false, // the head is below the surface (breath runs down, view tints)
  breath: 1, // 1 full .. 0 empty; a lifeguard brings you out at 0
  vdir: 0, // vertical swim direction for the pose: +1 diving down, -1 rising, 0 level
  diveAir: false, // leaping head-first from the deck or the board
  launch: null, // { vx, vz, vy, yaw }: set by the diving board, consumed by the player controller
  rescuedAt: -1e9, // clock time of the last lifeguard rescue (the staff lifeguard walks over)
}

export const cameraState = {
  yaw: 0,
  pitch: 0.32,
  distance: 5.5,
}

export const SPAWN = new THREE.Vector3(0, 0.3, 10)

// ---- Interactables ----
// Anything the avatar can use registers here. The player loop finds the closest one in range.
const interactables = new Map()
if (typeof window !== 'undefined') window.__vswInter = interactables // test hook: the live interactable registry

/**
 * @param {string} id
 * @param {{ position: THREE.Vector3 | (() => THREE.Vector3), radius?: number, label: string | (() => string), onInteract: () => void }} def
 */
export function registerInteractable(id, def) {
  interactables.set(id, def)
  return () => interactables.delete(id)
}

const tmp = new THREE.Vector3()
export function findNearestInteractable(pos, onlyWater = false) {
  let best = null
  let bestD = Infinity
  for (const [id, def] of interactables) {
    if (onlyWater && !def.water) continue // while wading or swimming only the interactables that work in water
    const p = typeof def.position === 'function' ? def.position() : def.position
    tmp.copy(p)
    const dx = tmp.x - pos.x
    const dz = tmp.z - pos.z
    const dy = Math.abs(tmp.y - (pos.y + 1))
    const d = Math.hypot(dx, dz)
    const r = def.radius ?? 2
    if (d < r && dy < 2.5 && d < bestD) {
      bestD = d
      best = { id, def }
    }
  }
  return best
}
