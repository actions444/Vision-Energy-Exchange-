// A small, generic two-bone IK solver (hip -> knee -> ankle), used for idle-stance foot ground
// adaptation (see player/Avatar.jsx: when a character is standing still on a curb, step, or
// raised slab, this lets the planted foot's leg bend just enough to actually reach the ground
// under it instead of floating above it or sinking through it).
//
// This is plain analytic geometry (the law of cosines applied to a two-bone chain), not a guess
// or an approximation: given the two fixed bone lengths and the straight-line distance the chain
// needs to span right now, it returns the exact hip-pitch and knee-bend angles that place the
// ankle exactly `dist` away from the hip, with the knee bending forward (the only physically
// sensible direction for a leg). When `dist` equals the fully extended length (flat ground,
// standing straight), both angles are exactly 0, so this only ever *adds* a correction on top of
// whatever pose is already playing - it never fights or overrides it.
import * as THREE from 'three'

/**
 * @param {number} l1 upper bone length (hip -> knee)
 * @param {number} l2 lower bone length (knee -> ankle)
 * @param {number} dist desired hip -> ankle distance. Clamped to the range the chain can
 *   actually reach, so this never produces NaN/garbage even for an out-of-range request.
 * @returns {{hip:number, knee:number}} radians. `hip` is the extra forward pitch to add to the
 *   upper bone's existing rotation; `knee` is the extra forward bend to add to the lower bone's.
 *   Both are 0 when `dist` is the fully extended length (l1 + l2).
 */
export function twoBoneIK(l1, l2, dist) {
  const maxD = l1 + l2 - 0.0005 // avoid acos(±1) landing exactly on a degenerate 0/0 boundary
  const minD = Math.abs(l1 - l2) + 0.0005
  const d = THREE.MathUtils.clamp(dist, minD, maxD)

  // Interior angle at the knee for a triangle with sides l1, l2, d (law of cosines), expressed as
  // the *bend away from straight* (0 when d = l1 + l2, growing as d shrinks).
  const cosKnee = THREE.MathUtils.clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1)
  const knee = Math.PI - Math.acos(cosKnee)

  // Angle at the hip between the hip->ankle line (straight down, in our use case) and the upper
  // bone in the solved triangle - the forward pitch needed so the ankle still lands directly
  // under the hip once the knee has bent.
  const cosHip = THREE.MathUtils.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)
  const hip = Math.acos(cosHip)

  return { hip, knee }
}
