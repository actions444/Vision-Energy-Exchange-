import { getLevels } from '../audio/core.js'

// Lip-sync for performers (see ui/PerformancePanel.jsx, player/Avatar.jsx). Two tiers, with an
// automatic fallback chain so the concert system never depends on an unfinished pipeline:
//
//   1. Precomputed viseme/phoneme timing for a track, if ever supplied (see VISEME_DATA below).
//      Nothing populates this yet - it is the extension point for a future forced-alignment or
//      speech-analysis pass run once per uploaded song. When present for the track that's
//      playing, it wins.
//   2. Live audio-reactive mouth openness: the actual loudness of the music bus right now, read
//      off the same shared analyser every other VU meter in the game uses (src/audio/core.js).
//      This is real synchronization to the real performance, just not phoneme-accurate.
//   3. If neither is available (nothing is playing), the caller's own synthetic idle wiggle.
//
// `performanceMouth` returns a 0..1 openness, or null so the caller knows to use its fallback.

/** trackId -> [{ t: seconds, open: 0..1 }, ...], sorted by t. Populate this once a lip-sync
 *  processing step for uploaded songs exists; until then every lookup simply falls through. */
export const VISEME_DATA = {}

function visemeAt(trackId, time) {
  const track = trackId != null ? VISEME_DATA[trackId] : null
  if (!track || !track.length) return null
  let lo = 0, hi = track.length - 1
  while (lo < hi) { const mid = (lo + hi) >> 1; if (track[mid].t < time) lo = mid + 1; else hi = mid }
  return track[lo]?.open ?? null
}

export function performanceMouth(trackId, trackTime) {
  const viseme = visemeAt(trackId, trackTime)
  if (viseme != null) return viseme
  const levels = getLevels(4) // null when the mix is silent
  if (!levels) return null
  // bands 0-1 of 4 sit roughly in the vocal fundamental range for a 128-point FFT; weight them.
  const vocal = levels[0] * 0.4 + levels[1] * 0.6
  return Math.min(1, vocal * 2.2)
}

/**
 * A slightly richer version of performanceMouth: still real-time audio-reactive, not
 * phoneme-accurate (see the header note - VISEME_DATA is still the real extension point for
 * that), but shapes the mouth with two numbers instead of one, so it reads a bit more like actual
 * speech/singing than a single open/close pump. `open` (0..1) is overall jaw drop, weighted
 * toward the low/vocal-fundamental bands (loud, low-pitched sections open the mouth wider, as in
 * an "ah"/"oh"); `wide` (0..1) favors the higher bands over the low ones, so a brighter, more
 * sibilant moment narrows and widens the mouth rather than just dropping the jaw (closer to an
 * "ee"/consonant shape than a round one). Returns null under the same conditions as
 * performanceMouth (nothing playing and no precomputed viseme track).
 */
export function performanceViseme(trackId, trackTime) {
  const viseme = visemeAt(trackId, trackTime)
  if (viseme != null) return { open: viseme, wide: 0 }
  const levels = getLevels(6)
  if (!levels) return null
  const low = levels[0] * 0.5 + levels[1] * 0.5
  const high = levels[3] * 0.5 + levels[4] * 0.3 + levels[5] * 0.2
  const open = Math.min(1, low * 2.3)
  const wide = Math.min(1, Math.max(0, high - low * 0.4) * 2.6)
  return { open, wide }
}
