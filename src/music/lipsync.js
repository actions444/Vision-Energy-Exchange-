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
