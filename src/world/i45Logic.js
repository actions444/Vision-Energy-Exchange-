// Pure I-45 traffic and arrival logic. No three.js or physics imports, so it runs under `node --test`.

export const TRAFFIC = { vMax: 24, minGap: 6, accel: 3, brake: 8, k: 0.8, carLen: 4.6 }

/**
 * Advance every car in one lane by dt seconds. Cars are mutated in place.
 * `dir` is +1 (travelling +x) or -1 (travelling -x). Each car keeps a safe
 * distance behind the nearest car ahead of it. Cars that reach the far end
 * re-enter at the near end.
 */
export function stepLane(cars, dt, { dir, xMin, xMax, vMax = TRAFFIC.vMax }) {
  const start = dir > 0 ? xMin : xMax
  const end = dir > 0 ? xMax : xMin
  for (const c of cars) {
    let gap = Infinity
    for (const o of cars) {
      if (o === c) continue
      const d = (o.x - c.x) * dir // distance ahead of c in its direction of travel
      if (d > 0) gap = Math.min(gap, d - TRAFFIC.carLen)
    }
    const want = gap === Infinity ? vMax : Math.max(0, Math.min(vMax, (gap - TRAFFIC.minGap) * TRAFFIC.k))
    c.v = want > c.v ? Math.min(want, c.v + TRAFFIC.accel * dt) : Math.max(want, c.v - TRAFFIC.brake * dt)
    c.v = Math.max(0, c.v)
    c.x += c.v * dt * dir
    if ((c.x - end) * dir > 0) c.x = start
  }
  return cars
}

/** True when the point (x, z) lies inside the box {x0, x1, z0, z1}. */
export function inBox(x, z, box) {
  return x >= box.x0 && x <= box.x1 && z >= box.z0 && z <= box.z1
}
