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

/**
 * @param {string} id
 * @param {{ position: THREE.Vector3 | (() => THREE.Vector3), radius?: number, label: string | (() => string), onInteract: () => void }} def
 */
export function registerInteractable(id, def) {
  interactables.set(id, def)
  return () => interactables.delete(id)
}

const tmp = new THREE.Vector3()
export function findNearestInteractable(pos) {
  let best = null
  let bestD = Infinity
  for (const [id, def] of interactables) {
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
