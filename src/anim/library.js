// The shared, cross-avatar Animation Gallery library. Every skinned character model that gets
// imported (assets/assetStore.js's register(), called on upload and on restore from IndexedDB)
// contributes whatever named clips it ships to this pool, one per category it can fill (first
// contributor wins, unless an admin has assigned a specific clip by hand - see assignOverride,
// driven by ui/AnimationAdmin.jsx). assets/PlacedAssets.jsx's ImportedAvatar then borrows from
// this pool - retargeted onto its own skeleton (anim/retarget.js) - for any category its own file
// doesn't have a clip for. This is what lets an uploaded avatar perform a pose it never shipped
// itself, as long as some other uploaded avatar's clip for that category exists.
import { ANIM_CATEGORIES } from './categories.js'
import { buildBoneMap } from './humanoid.js'

const OVR_KEY = 'vsw-anim-overrides'
const loadOverrides = () => { try { return JSON.parse(localStorage.getItem(OVR_KEY) || '{}') } catch { return {} } }
const saveOverrides = (o) => { try { localStorage.setItem(OVR_KEY, JSON.stringify(o)) } catch { /* best effort */ } }

// category -> { clip, boneMap, srcHipsY, sourceId, sourceName, clipName, manual }
const pool = new Map()
let overrides = loadOverrides() // category -> { assetId, clipName }
const listeners = new Set()
const notify = () => { for (const fn of listeners) fn() }

function entryFor(id, name, info, clip) {
  const boneMap = buildBoneMap(info.scene)
  if (!boneMap.Hips) return null // not a recognizable humanoid rig - nothing safe to retarget from it
  const hipsBone = info.scene.getObjectByName(boneMap.Hips)
  return { clip, boneMap, srcHipsY: hipsBone ? hipsBone.position.y : null, sourceId: id, sourceName: name, clipName: clip.name }
}

/** Called once per imported character model, as soon as it's parsed. Only skinned models with
 * real animation clips have anything to contribute. */
export function contribute(id, name, info) {
  if (!info?.skinned || !info.animations?.length) return
  let added = false
  for (const [key, re] of Object.entries(ANIM_CATEGORIES)) {
    if (pool.has(key)) continue // an earlier contributor or a manual override already fills this
    const clip = info.animations.find((a) => re.test(a.name))
    if (!clip) continue
    const entry = entryFor(id, name, info, clip)
    if (!entry) continue
    pool.set(key, entry)
    added = true
  }
  if (added) notify()
}

/** Force a specific clip (from a specific already-registered model) into a category, overriding
 * whatever auto-matched there - for clips whose name doesn't say what pose they are. Persists
 * across reloads (keyed by asset id + clip name, reapplied by reapplyOverrides once that asset is
 * back in the registry). */
export function assignOverride(registry, assetId, clipName, category) {
  const info = registry.get(assetId)
  if (!info || !ANIM_CATEGORIES[category]) return false
  const clip = info.animations.find((a) => a.name === clipName)
  if (!clip) return false
  const entry = entryFor(assetId, info.name, info, clip)
  if (!entry) return false
  entry.manual = true
  pool.set(category, entry)
  overrides[category] = { assetId, clipName }
  saveOverrides(overrides)
  notify()
  return true
}

/** Drop a manual override and let whatever auto-matches naturally (from the next contribute())
 * fill the category instead. */
export function clearOverride(category) {
  delete overrides[category]
  saveOverrides(overrides)
  pool.delete(category)
  notify()
}

/** Re-apply every saved override against the current registry - call once after
 * assets/assetStore.js's restore() has re-registered every saved model, since assignOverride
 * needs that model's info already in the registry. */
export function reapplyOverrides(registry) {
  for (const [category, { assetId, clipName }] of Object.entries(overrides)) {
    assignOverride(registry, assetId, clipName, category)
  }
}

export function getLibraryClip(category) { return pool.get(category) || null }
export function listFilledCategories() { return [...pool.keys()] }
export function allEntries() { return [...pool.entries()].map(([category, v]) => ({ category, ...v })) }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) }
