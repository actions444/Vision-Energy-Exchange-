// Pure rules for the player's saved avatar profile (no browser or store imports, so they run in tests).
//
// A profile is the avatar the player builds once: name, build, outfit preset, accent colour and skin tone,
// plus `updatedAt` (ms) so two copies (this device and the player's account) can be compared.

const HEX = /^#[0-9a-fA-F]{6}$/

/**
 * Keep only known fields with sane values. Anything else in a stored document is dropped, so a damaged or
 * edited document can never inject unexpected data into the game. Returns null for an empty/invalid input.
 */
export function cleanProfile(p) {
  if (!p || typeof p !== 'object') return null
  const out = {}
  if (typeof p.name === 'string') out.name = p.name.slice(0, 20)
  if (p.build === 'f' || p.build === 'm') out.build = p.build
  if (typeof p.preset === 'string' && /^[a-z0-9_-]{1,40}$/i.test(p.preset)) out.preset = p.preset
  if (typeof p.accent === 'string' && HEX.test(p.accent)) out.accent = p.accent
  if (typeof p.skin === 'string' && HEX.test(p.skin)) out.skin = p.skin
  if (Number.isFinite(p.updatedAt) && p.updatedAt > 0) out.updatedAt = Math.floor(p.updatedAt)
  return Object.keys(out).length ? out : null
}

/**
 * Decide which copy wins when the game starts.
 * - No account copy yet: keep this device's profile and save it to the account (push).
 * - Account copy is newer (or this device has never been edited): use the account copy.
 * - This device is newer: keep it and save it to the account.
 * Returns { profile, push }.
 */
export function chooseProfile(local, cloud) {
  const l = cleanProfile(local)
  const c = cleanProfile(cloud)
  if (!c) return { profile: l, push: !!l }
  if (!l) return { profile: c, push: false }
  const lt = l.updatedAt || 0
  const ct = c.updatedAt || 0
  if (lt > ct) return { profile: l, push: true }
  return { profile: c, push: false }
}
