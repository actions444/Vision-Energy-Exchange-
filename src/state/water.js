// Water volumes and the swim system's shared state (kept outside React: read every frame).
//
// A volume is a rectangle of the world whose surface is at `surf`. The player controller asks
// waterAt(x, z) each frame: inside a volume the avatar wades (shallow) or swims (deep), climbs out
// at the edge, and makes ripples that the water mesh draws.
const volumes = new Map()

/** Register a rectangle of water. Returns a cleanup function. */
export function registerWater(v) {
  volumes.set(v.id, v)
  return () => volumes.delete(v.id)
}

/** The water volume covering this x,z (or null). `v.surfAt(x, z, t)` gives the surface height, default `v.surf`. */
export function waterAt(x, z) {
  for (const v of volumes.values()) if (x > v.x0 && x < v.x1 && z > v.z0 && z < v.z1) return v
  return null
}

export const waterFx = {
  under: false, // the camera is below a water surface (blue tint overlay)
  ripples: [], // { x, z, t0, amp }: expanding rings the water mesh displays
  splashes: [], // { x, y, z, t0, power }: foam bursts
}

/** A ring on the water surface. */
export function addRipple(x, z, t, amp = 0.03) {
  const r = waterFx.ripples
  r.push({ x, z, t0: t, amp })
  if (r.length > 14) r.shift()
}

/** A splash: foam droplets plus three rings, scaled by `power` 0..1. */
export function addSplash(x, y, z, t, power = 0.6) {
  waterFx.splashes.push({ x, y, z, t0: t, power })
  if (waterFx.splashes.length > 6) waterFx.splashes.shift()
  addRipple(x, z, t, 0.05 * power + 0.02)
  addRipple(x, z, t + 0.12, 0.035 * power + 0.01)
}

/** Ripple height of the rings at x,z, for the water mesh. */
export function rippleAt(x, z, t) {
  let h = 0
  for (const r of waterFx.ripples) {
    const age = t - r.t0
    if (age < 0 || age > 4) continue
    const R = 1.7 * age
    const d = Math.hypot(x - r.x, z - r.z) - R
    h += r.amp * Math.exp(-age * 0.95) * Math.cos(9 * d) * Math.exp(-(d * d) / 0.4)
  }
  return h
}
