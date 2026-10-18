// A small, shared facial-expression helper: an idle eye blink, usable by both the default
// procedural avatar (player/Avatar.jsx, which scales its eye meshes) and an imported skeletal
// avatar with a blink-shaped morph target (assets/PlacedAssets.jsx). Not driven by any animation
// clip or audio signal - just a believable idle cadence, varied per character so a crowd doesn't
// blink in lockstep.
const BLINK_DUR = 0.14 // seconds

/** 0 (open) .. 1 (fully closed) for elapsed time `t` and a per-character `seed` (any number -
 * player id, array index, hash of a name - just needs to differ between characters). */
export function blinkAmount(t, seed = 0) {
  const period = 3.4 + ((Math.abs(seed) * 97) % 1) * 2.4 // ~3.4-5.8s between blinks, varied per character
  const phase = (t + Math.abs(seed) * 13.37) % period
  if (phase > BLINK_DUR) return 0
  const x = phase / BLINK_DUR
  return x < 0.4 ? x / 0.4 : 1 - (x - 0.4) / 0.6 // quick close, slightly slower open
}
