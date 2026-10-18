import * as THREE from 'three'
import { getBoneMap } from './humanoid.js'

// Moves an AnimationClip captured on one skeleton onto a different one, by renaming each track's
// bone through the canonical humanoid map (anim/humanoid.js) instead of relying on matching bone
// names. Only quaternion tracks (every joint's rotation) and the hips' vertical position carry
// over - no bone scale, and the hips' horizontal motion is dropped, since library clips are meant
// to be ground-locked loops (a walk cycle authored in place, not one that drags the root forward);
// actual movement through the world already comes from the player/vehicle controller, not from
// the clip. The hips' vertical offset is rescaled to the target's own height so a taller or
// shorter rig doesn't float above or sink into the floor.
const cache = new WeakMap() // targetRoot -> Map(sourceClip.uuid -> retargeted clip | null)

/**
 * @param {THREE.AnimationClip} clip - the source clip to move
 * @param {Record<string,string>} srcBoneMap - canonical->bone-name map of the skeleton `clip` was captured on
 * @param {number|null} srcHipsY - that skeleton's hips bone rest height (for rescaling), or null if unknown
 * @param {THREE.Object3D} targetRoot - the skinned model to play the clip on
 */
export function retargetClip(clip, srcBoneMap, srcHipsY, targetRoot) {
  if (!clip || !srcBoneMap || !targetRoot) return null
  let bucket = cache.get(targetRoot)
  if (!bucket) { bucket = new Map(); cache.set(targetRoot, bucket) }
  if (bucket.has(clip.uuid)) return bucket.get(clip.uuid)

  const dstMap = getBoneMap(targetRoot)
  const srcNameToCanon = new Map(Object.entries(srcBoneMap).map(([k, v]) => [v, k]))
  const dstHipsBone = dstMap.Hips ? targetRoot.getObjectByName(dstMap.Hips) : null
  const dstHipsY = dstHipsBone ? dstHipsBone.position.y : null
  const scale = srcHipsY && dstHipsY && srcHipsY > 1e-4 ? dstHipsY / srcHipsY : 1

  const tracks = []
  for (const track of clip.tracks) {
    const dot = track.name.lastIndexOf('.')
    if (dot < 0) continue
    const boneName = track.name.slice(0, dot)
    const prop = track.name.slice(dot + 1)
    const canon = srcNameToCanon.get(boneName)
    if (!canon) continue
    const dstBone = dstMap[canon]
    if (!dstBone) continue
    if (prop === 'quaternion') {
      tracks.push(new THREE.QuaternionKeyframeTrack(dstBone + '.quaternion', track.times.slice(), track.values.slice()))
    } else if (prop === 'position' && canon === 'Hips') {
      const values = track.values.slice()
      for (let i = 0; i < values.length; i += 3) { values[i] = 0; values[i + 2] = 0; values[i + 1] *= scale }
      tracks.push(new THREE.VectorKeyframeTrack(dstBone + '.position', track.times.slice(), values))
    }
  }
  // require a real spread of joints, not just one lucky bone match, before calling this usable
  const result = tracks.length >= 4 ? new THREE.AnimationClip(clip.name, clip.duration, tracks) : null
  bucket.set(clip.uuid, result)
  return result
}
