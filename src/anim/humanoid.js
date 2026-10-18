// A minimal humanoid bone schema and a best-effort resolver that maps an arbitrary skeleton's own
// bone names onto it. This is what makes cross-skeleton retargeting possible: two different
// uploaded rigs (Tripo, Meshy, Mixamo-style exports - the common case for AI-generated characters,
// which is why the existing sit-fallback logic below already strips a "mixamorig:" prefix) rarely
// share exact bone names, but they almost always share this same set of body parts. Build each
// skeleton's map once, and a clip can be moved from one to the other by renaming its tracks
// through the shared canonical keys rather than needing identical bone names.
//
// This is deliberately simple - no finger bones, no twist bones, no scale correction beyond the
// hips' vertical offset (see anim/retarget.js) - good enough for a believable walk, dance, sit or
// gesture on a similarly-proportioned biped, not a general-purpose rigging tool.

// Checked in this order: more specific patterns first (Spine2 before Spine1 before Spine,
// ForeArm before Arm, UpLeg before Leg) so a bone is only ever claimed once, by its best match.
const ORDER = [
  ['Hips', /hips?$|pelvis/i, false],
  ['Spine2', /spine ?2|upper ?chest/i, false],
  ['Spine1', /spine ?1/i, false],
  ['Spine', /spine|chest/i, false],
  ['Neck', /neck/i, false],
  ['Head', /head$/i, false],
  ['Shoulder', /shoulder|clavicle/i, true],
  ['ForeArm', /fore ?arm|lower ?arm/i, true],
  ['Arm', /arm$/i, true],
  ['Hand', /hand$/i, true],
  ['UpLeg', /up ?leg|thigh/i, true],
  ['Leg', /leg$|calf|shin/i, true],
  ['Foot', /foot$/i, true],
  ['ToeBase', /toe/i, true],
]
const isLeft = (n) => /left|_l\b|\.l\b|^l[A-Z_.]/i.test(n)
const isRight = (n) => /right|_r\b|\.r\b|^r[A-Z_.]/i.test(n)

/** canonical body-part key -> that skeleton's actual bone name (e.g. "Hips", "LeftForeArm"). */
export function buildBoneMap(root) {
  const bones = []
  root.traverse((o) => { if (o.isBone) bones.push(o) })
  const claimed = new Set()
  const map = {}
  for (const [part, re, sided] of ORDER) {
    for (const b of bones) {
      if (claimed.has(b)) continue
      const n = b.name.replace(/^mixamorig:?/i, '')
      if (!re.test(n)) continue
      if (sided) {
        if (isLeft(n) && !map['Left' + part]) { map['Left' + part] = b.name; claimed.add(b) }
        else if (isRight(n) && !map['Right' + part]) { map['Right' + part] = b.name; claimed.add(b) }
      } else if (!map[part]) {
        map[part] = b.name; claimed.add(b)
      }
    }
  }
  return map
}

const cache = new WeakMap()
/** Same as buildBoneMap, but computed once per skeleton root and cached (every clip retargeted
 * onto the same avatar reuses it). */
export function getBoneMap(root) {
  if (cache.has(root)) return cache.get(root)
  const m = buildBoneMap(root)
  cache.set(root, m)
  return m
}
