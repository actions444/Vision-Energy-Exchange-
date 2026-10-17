import * as THREE from 'three'
import { OMEGA, clockT } from '../config/workout.js'

// Gym poses for the procedural avatar. Called every frame from Avatar.jsx with a blend weight `w` (0..1);
// each pose overwrites the joint rotations it needs, blended on top of whatever walk/sit pose is already set.
// Conventions (see Avatar.jsx): negative x rotation swings a leg/arm forward, forearm x<0 bends the elbow,
// the spine leans forward with positive x, hips.position.y is 0.95 when standing.

const L = THREE.MathUtils.lerp
const sm = (x) => 0.5 + 0.5 * Math.sin(x) // 0..1 smooth

/** Which workout kinds start from the seated pose (the avatar's hips sit at the seat height). */
export const SEATED_KINDS = new Set(['bike', 'row', 'press', 'shoulder', 'pull', 'legpress'])

export function applyWorkout(kind, r, w, sitHeight = 0.45) {
  const ph = clockT() * (OMEGA[kind] || 3)
  const set = (ref, ax, v) => { ref.current.rotation[ax] = L(ref.current.rotation[ax], v, w) }
  const hipsY = (y) => { r.hips.current.position.y = L(r.hips.current.position.y, y, w) }
  const s = Math.sin(ph), c = Math.cos(ph)
  switch (kind) {
    case 'run': {
      const bend = (p) => Math.max(0, Math.sin(p + 1.4)) * 1.55 + 0.12
      set(r.lUL, 'x', -s * 1.0); set(r.rUL, 'x', s * 1.0)
      set(r.lLL, 'x', bend(ph)); set(r.rLL, 'x', bend(ph + Math.PI))
      set(r.lUA, 'x', s * 0.95); set(r.rUA, 'x', -s * 0.95)
      set(r.lUA, 'z', 0.1); set(r.rUA, 'z', -0.1)
      set(r.lFA, 'x', -1.55); set(r.rFA, 'x', -1.55)
      hipsY(0.89 + Math.abs(c) * 0.06)
      set(r.spine, 'x', 0.22); set(r.spine, 'y', -s * 0.12); set(r.hips, 'y', s * 0.08)
      set(r.head, 'x', -0.1)
      break
    }
    case 'ellip': {
      set(r.lUL, 'x', -0.35 - s * 0.35); set(r.rUL, 'x', -0.35 + s * 0.35)
      set(r.lLL, 'x', 0.3 + Math.max(0, s) * 0.3); set(r.rLL, 'x', 0.3 + Math.max(0, -s) * 0.3)
      set(r.lUA, 'x', -0.85 + s * 0.5); set(r.rUA, 'x', -0.85 - s * 0.5)
      set(r.lUA, 'z', 0.12); set(r.rUA, 'z', -0.12)
      set(r.lFA, 'x', -0.35); set(r.rFA, 'x', -0.35)
      hipsY(0.9 + Math.abs(s) * 0.02)
      set(r.spine, 'x', 0.1)
      break
    }
    case 'bike': {
      // seated, leaning onto the bars, pedalling
      set(r.lUL, 'x', -1.05 + s * 0.45); set(r.rUL, 'x', -1.05 - s * 0.45)
      set(r.lLL, 'x', 1.3 - s * 0.55); set(r.rLL, 'x', 1.3 + s * 0.55)
      set(r.lUA, 'x', -0.95); set(r.rUA, 'x', -0.95); set(r.lUA, 'z', 0.12); set(r.rUA, 'z', -0.12)
      set(r.lFA, 'x', -0.3); set(r.rFA, 'x', -0.3)
      hipsY(sitHeight + 0.06)
      set(r.spine, 'x', 0.5)
      set(r.head, 'x', -0.35)
      break
    }
    case 'row': {
      // seated, legs driving and arms pulling the handle to the ribs
      const d = sm(ph) // 0 = catch (arms reaching), 1 = finish (arms in)
      set(r.lUL, 'x', -1.35 + d * 0.35); set(r.rUL, 'x', -1.35 + d * 0.35)
      set(r.lLL, 'x', 1.9 - d * 1.55); set(r.rLL, 'x', 1.9 - d * 1.55)
      set(r.lUA, 'x', -1.35 + d * 1.15); set(r.rUA, 'x', -1.35 + d * 1.15)
      set(r.lUA, 'z', 0.1); set(r.rUA, 'z', -0.1)
      set(r.lFA, 'x', -0.15 - d * 1.75); set(r.rFA, 'x', -0.15 - d * 1.75)
      hipsY(sitHeight + 0.06)
      r.hips.current.position.z = L(r.hips.current.position.z, 0.2 - 0.4 * d, w) // the seat slides along the rail
      set(r.spine, 'x', 0.35 - d * 0.7)
      break
    }
    case 'press': {
      // seated chest press: hands at the chest, pushing straight out
      const e = sm(ph)
      set(r.lUA, 'x', -1.0 - e * 0.55); set(r.rUA, 'x', -1.0 - e * 0.55)
      set(r.lUA, 'z', 0.5 - e * 0.3); set(r.rUA, 'z', -0.5 + e * 0.3)
      set(r.lFA, 'x', -1.95 + e * 1.8); set(r.rFA, 'x', -1.95 + e * 1.8)
      hipsY(sitHeight + 0.06)
      set(r.spine, 'x', -0.12)
      break
    }
    case 'shoulder': {
      const e = sm(ph)
      set(r.lUA, 'x', -0.5 - e * 2.3); set(r.rUA, 'x', -0.5 - e * 2.3)
      set(r.lUA, 'z', 0.95 - e * 0.55); set(r.rUA, 'z', -0.95 + e * 0.55)
      set(r.lFA, 'x', -1.9 + e * 1.75); set(r.rFA, 'x', -1.9 + e * 1.75)
      hipsY(sitHeight + 0.06)
      set(r.spine, 'x', -0.08)
      break
    }
    case 'pull': {
      // lat pulldown: bar from overhead to the collarbones
      const e = sm(ph) // 0 = arms up, 1 = bar down at the chest
      set(r.lUA, 'x', -2.8 + e * 2.15); set(r.rUA, 'x', -2.8 + e * 2.15)
      set(r.lUA, 'z', 0.75 - e * 0.35); set(r.rUA, 'z', -0.75 + e * 0.35)
      set(r.lFA, 'x', -0.2 - e * 1.5); set(r.rFA, 'x', -0.2 - e * 1.5)
      hipsY(sitHeight + 0.06)
      set(r.spine, 'x', -0.14 - e * 0.1)
      break
    }
    case 'legpress': {
      const e = sm(ph) // 0 = knees in, 1 = legs pressed out
      set(r.lUL, 'x', -1.95 + e * 0.7); set(r.rUL, 'x', -1.95 + e * 0.7)
      set(r.lLL, 'x', 2.1 - e * 1.9); set(r.rLL, 'x', 2.1 - e * 1.9)
      set(r.lUA, 'x', -0.35); set(r.rUA, 'x', -0.35); set(r.lFA, 'x', -0.8); set(r.rFA, 'x', -0.8)
      hipsY(sitHeight + 0.06)
      set(r.spine, 'x', -0.3)
      break
    }
    case 'squat': {
      const d = sm(ph) // 0 = standing, 1 = bottom
      set(r.lUL, 'x', -1.3 * d); set(r.rUL, 'x', -1.3 * d)
      set(r.lLL, 'x', 1.45 * d); set(r.rLL, 'x', 1.45 * d)
      hipsY(0.95 - 0.4 * d)
      set(r.spine, 'x', 0.05 + 0.4 * d)
      set(r.lUA, 'x', -0.15); set(r.rUA, 'x', -0.15); set(r.lUA, 'z', 1.0); set(r.rUA, 'z', -1.0)
      set(r.lFA, 'x', -2.25); set(r.rFA, 'x', -2.25)
      set(r.head, 'x', -0.12 - 0.15 * d)
      break
    }
    case 'curl': {
      const a1 = sm(ph), a2 = sm(ph + Math.PI)
      set(r.lUA, 'x', -0.05 - a1 * 0.2); set(r.rUA, 'x', -0.05 - a2 * 0.2)
      set(r.lUA, 'z', 0.1); set(r.rUA, 'z', -0.1)
      set(r.lFA, 'x', -0.12 - a1 * 2.0); set(r.rFA, 'x', -0.12 - a2 * 2.0)
      set(r.lUL, 'x', -0.04); set(r.rUL, 'x', 0.04)
      hipsY(0.95 - 0.03 * sm(ph * 2))
      set(r.spine, 'x', 0.03)
      break
    }
    case 'bag': {
      // boxing stance, alternating jabs and crosses
      const pl = Math.max(0, Math.sin(ph)), pr = Math.max(0, Math.sin(ph + Math.PI))
      set(r.lUL, 'x', -0.3); set(r.rUL, 'x', 0.28)
      set(r.lLL, 'x', 0.45); set(r.rLL, 'x', 0.5)
      set(r.lUA, 'x', -1.0 - pl * 0.55); set(r.rUA, 'x', -1.0 - pr * 0.55)
      set(r.lUA, 'z', 0.1); set(r.rUA, 'z', -0.1)
      set(r.lFA, 'x', -2.1 + pl * 1.95); set(r.rFA, 'x', -2.1 + pr * 1.95)
      hipsY(0.89 + Math.abs(c) * 0.025)
      set(r.spine, 'x', 0.16); set(r.spine, 'y', (pr - pl) * 0.28)
      set(r.head, 'x', -0.05)
      break
    }
    default:
  }
}
