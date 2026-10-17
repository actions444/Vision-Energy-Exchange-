// "Stay" — Trinity & Zion duet. The shot list, actor choreography, lyrics and score timing
// for the cinematic in the Reign Estate. Everything is a pure function of the clock `t`
// (seconds), so the scene can be played, skipped, or scrubbed to any frame.
import { CX, FLOOR, floorY } from './mansion.js'

export const DURATION = 80
export const TITLE_AT = 74
export const START_HOUR = 18.55

// ---- the song (original words) -------------------------------------------------
// who: 'z' Zion · 't' Trinity · 'b' both. Lines sit on the bar grid of the score (3.5 s per bar).
export const LYRICS = [
  { t0: 32, t1: 35.5, who: 'z', text: 'Candlelight on the marble floor,' },
  { t0: 35.5, t1: 39, who: 't', text: 'I’d walk through any open door —' },
  { t0: 39, t1: 42.5, who: 'z', text: 'if you’re on the other side.' },
  { t0: 42.5, t1: 46, who: 't', text: 'Mm, I’ve been waiting all my life' },
  { t0: 46, t1: 49.5, who: 'b', text: 'to come home to you tonight.' },
  { t0: 49.5, t1: 53, who: 't', text: 'Purple skies are falling down,' },
  { t0: 53, t1: 56.5, who: 'z', text: 'quiet in this sleeping town,' },
  { t0: 56.5, t1: 63.5, who: 'b', text: 'and the whole world fades away…' },
  { t0: 63.5, t1: 67, who: 't', text: 'Stay. Stay.' },
  { t0: 67, t1: 74, who: 'b', text: 'Stay with me, stay.' },
]
export const captionAt = (t) => LYRICS.find((l) => t >= l.t0 && t < l.t1 - 0.15) || null
const singing = (who, t) => {
  const l = captionAt(t)
  return l && (l.who === 'b' || l.who === who) ? 1 : 0
}

// ---- helpers ------------------------------------------------------------------
const clamp01 = (x) => Math.max(0, Math.min(1, x))
export const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x) }
const lerp = (a, b, u) => a + (b - a) * u
const lerp3 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)]

function keyed(keys, t, ease = true) {
  if (t <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1], [t1, v1] = keys[i]
      const u = (t - t0) / (t1 - t0)
      return lerp(v0, v1, ease ? smooth(u) : u)
    }
  }
  return keys[keys.length - 1][1]
}

// ---- choreography ----------------------------------------------------------------
// The couple's centre line z over time (they walk side by side, then stand at the foot of the stair, then climb).
const PATH = [[0, -37.8], [3, -37.8], [15.5, -53.5], [19.5, -57.5], [22.5, -62], [27, -66.3], [56.5, -66.3], [68.5, -79.9], [70.5, -82.1], [999, -82.1]]
function rawZ(t) { return keyed(PATH, t, false) }
/** Moving-average smoothing so every start, stop and corner has a soft ease. */
function pathZ(t, win = 0.9) {
  let s = 0
  for (let i = -2; i <= 2; i++) s += rawZ(t + (i / 2) * win)
  return s / 5
}

// facing: yaw (rad). Walking north = π; singing = ±1.07 (three-quarters to the doors); gallery = 0 (facing the foyer).
const YAW_T = [[0, Math.PI], [27, Math.PI], [29, 1.07], [55, 1.07], [57, Math.PI], [69, Math.PI], [71.5, 2 * Math.PI]]
const YAW_Z = [[0, Math.PI], [27, Math.PI], [29, 5.21], [55, 5.21], [57, Math.PI], [69, Math.PI], [71.5, 0]]

const GEST_T = [[35.5, 39, 'chest'], [42.5, 46, 'chest'], [46, 49.5, 'open'], [49.5, 53, 'reach'], [56.5, 63.5, 'hold'], [63.5, 67, 'open'], [67, 80, 'hold']]
const GEST_Z = [[32, 35.5, 'reach'], [39, 42.5, 'chest'], [46, 49.5, 'open'], [53, 56.5, 'reach'], [56.5, 63.5, 'hold'], [67, 80, 'hold']]
const gesture = (list, t) => list.find(([a, b]) => t >= a && t < b)?.[2] || null

/** Position, facing and animation inputs for one actor at time t. */
export function actor(who, t) {
  const z = pathZ(t)
  const dz = (pathZ(t + 0.05) - pathZ(t - 0.05)) / 0.1
  const x = CX + (who === 't' ? -0.6 : 0.6)
  // step the couple sideways a touch apart on the stair so the runner sits between them
  const y = floorY(x, z)
  return {
    x, y, z,
    yaw: keyed(who === 't' ? YAW_T : YAW_Z, t),
    speed: Math.abs(dz),
    sing: singing(who, t),
    gesture: gesture(who === 't' ? GEST_T : GEST_Z, t),
  }
}

// ---- camera -------------------------------------------------------------------------
const headY = (a) => a.y + 1.82

function wobble(t, amp) {
  return [Math.sin(t * 1.7) * amp, Math.sin(t * 2.3 + 1) * amp * 0.7, Math.sin(t * 1.3 + 2) * amp]
}

const S = [
  // 1 · crane down from the street over the gates, revealing the facade
  { t0: 0, t1: 7.5, fov: [52, 44], f: (u) => ({ pos: lerp3([114, 9.5, -22], [103, 3.8, -30.5], u), look: lerp3([99, 5.5, -62], [99, 3.9, -58], u) }) },
  // 2 · side tracking shot with the couple walking up the drive
  { t0: 7.5, t1: 15, fov: [40, 38], f: (u, c) => ({ pos: [c.mid.x + lerp(3.6, 3.0, u), c.mid.y + 1.3, c.mid.z - lerp(3.6, 3.2, u)], look: [c.mid.x, c.mid.y + 1.15, c.mid.z] }), shake: 0.012 },
  // 3 · backwards tracking shot: the camera retreats ahead of them, through the open doors
  { t0: 15, t1: 21.5, fov: [40, 40], f: (u, c) => ({ pos: [c.mid.x + 0.2, c.mid.y + 1.05, c.mid.z - 4.6], look: [c.mid.x, c.mid.y + 1.2, c.mid.z] }), shake: 0.012 },
  // 4 · following from behind as they cross the threshold
  { t0: 21.5, t1: 28.5, fov: [36, 40], f: (u, c) => ({ pos: [c.mid.x - 0.9, c.mid.y + 1.25 + 0.9 * u, c.mid.z + 5.0], look: [c.mid.x, c.mid.y + 1.3 + 0.4 * u, c.mid.z - 2.2] }), shake: 0.01 },
  // 5 · slow push and tilt up to the chandelier
  { t0: 28.5, t1: 32, fov: [44, 52], f: (u) => ({ pos: [99, 1.55, lerp(-62.3, -63.9, u)], look: [99, lerp(2.2, 8.4, smooth(u)), lerp(-67, -69.5, u)] }) },
  // 6 · arc dolly around the pair (Zion's first line)
  { t0: 32, t1: 35.5, fov: [34, 34], f: (u, c) => { const a = lerp(-0.95, 0.15, u); return { pos: [c.mid.x + Math.sin(a) * 3.9, c.mid.y + 1.55, c.mid.z + Math.cos(a) * 3.9], look: [c.mid.x, c.mid.y + 1.5, c.mid.z] } } },
  // 7 · close-up Trinity
  { t0: 35.5, t1: 39, fov: [30, 28], f: (u, c) => { const a = c.T.yaw - 0.6, d = lerp(1.6, 1.3, u); return { pos: [c.T.x + Math.sin(a) * d, headY(c.T) - 0.05, c.T.z + Math.cos(a) * d], look: [c.T.x, headY(c.T) - 0.02, c.T.z] } }, shake: 0.004 },
  // 8 · close-up Zion
  { t0: 39, t1: 42.5, fov: [30, 28], f: (u, c) => { const a = c.Z.yaw + 0.6, d = lerp(1.6, 1.3, u); return { pos: [c.Z.x + Math.sin(a) * d, headY(c.Z) - 0.05, c.Z.z + Math.cos(a) * d], look: [c.Z.x, headY(c.Z) - 0.02, c.Z.z] } }, shake: 0.004 },
  // 9 · Trinity again from the other side, sliding
  { t0: 42.5, t1: 46, fov: [28, 28], f: (u, c) => { const a = c.T.yaw - 1.0 + u * 0.4, d = lerp(1.7, 1.35, u); return { pos: [c.T.x + Math.sin(a) * d, headY(c.T) - 0.3 + 0.3 * u, c.T.z + Math.cos(a) * d], look: [c.T.x, headY(c.T) - 0.03, c.T.z] } }, shake: 0.004 },
  // 10 · medium two-shot, pulling back
  { t0: 46, t1: 49.5, fov: [36, 40], f: (u, c) => ({ pos: [c.mid.x + 0.3, c.mid.y + 1.6, c.mid.z + lerp(2.6, 4.4, u)], look: [c.mid.x, c.mid.y + 1.55, c.mid.z] }) },
  // 11 · over Zion's shoulder to Trinity
  { t0: 49.5, t1: 53, fov: [32, 30], f: (u, c) => ({ pos: [c.Z.x + 0.45, headY(c.Z) + 0.05, c.Z.z + 0.55 + 0.25 * u], look: [c.T.x, headY(c.T) - 0.04, c.T.z] }) },
  // 12 · over Trinity's shoulder to Zion
  { t0: 53, t1: 56.5, fov: [32, 30], f: (u, c) => ({ pos: [c.T.x - 0.45, headY(c.T) + 0.05, c.T.z + 0.55 + 0.25 * u], look: [c.Z.x, headY(c.Z) - 0.04, c.Z.z] }) },
  // 13 · rear tracking up the stair, rising on a crane
  { t0: 56.5, t1: 69, fov: [38, 42], f: (u, c) => ({ pos: [c.mid.x - 0.6 * smooth(u), c.mid.y + 1.4 + 1.9 * smooth(u), c.mid.z + lerp(4.6, 6.2, u)], look: [c.mid.x, c.mid.y + 1.55 + 0.5 * smooth(u), c.mid.z - 1.4] }), shake: 0.008 },
  // 14 · final wide from the foyer: the couple at the gallery rail under the chandelier
  { t0: 69, t1: 80, fov: [42, 54], f: (u) => ({ pos: lerp3([99, 1.5, -62.2], [99, 2.0, -59.3], smooth(u)), look: lerp3([99, 5.9, -81.5], [99, 6.6, -79], smooth(u)) }) },
]

/** Camera for time t: { pos, look, fov }. */
export function cameraAt(t) {
  const T = actor('t', t), Z = actor('z', t)
  const mid = { x: (T.x + Z.x) / 2, y: (T.y + Z.y) / 2, z: (T.z + Z.z) / 2 }
  const shot = S.find((s) => t >= s.t0 && t < s.t1) || S[S.length - 1]
  const u = clamp01((t - shot.t0) / (shot.t1 - shot.t0))
  const r = shot.f(u, { T, Z, mid, t })
  if (shot.shake) {
    const w = wobble(t, shot.shake)
    r.pos = [r.pos[0] + w[0], r.pos[1] + w[1], r.pos[2] + w[2]]
    r.look = [r.look[0] + w[2] * 0.5, r.look[1] + w[0] * 0.5, r.look[2] + w[1] * 0.5]
  }
  return { pos: r.pos, look: r.look, fov: lerp(shot.fov[0], shot.fov[1], smooth(u)), shot: S.indexOf(shot) + 1 }
}

/** Front doors: closed until the couple arrives, open through the song, closed at the end. */
export const doorsOpenAt = (t) => t >= 16.5 && t < 76

/** Black fade (0..1) at the head and tail. */
export const fadeAt = (t) => Math.max(1 - clamp01(t / 1.4), clamp01((t - (DURATION - 2.2)) / 2.0))
export const titleAt = (t) => clamp01((t - TITLE_AT) / 1.2) * (1 - clamp01((t - (DURATION - 1.6)) / 1.4))

export { FLOOR }
