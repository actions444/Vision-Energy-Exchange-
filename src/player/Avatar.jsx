import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import * as THREE from 'three'
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { applyWorkout } from './workoutPose.js'
import { performanceViseme } from '../music/lipsync.js'
import { blinkAmount } from '../anim/blink.js'
import { twoBoneIK } from '../anim/ik.js'
import { registry } from '../assets/assetStore.js'

// Scratch objects for the idle-stance foot IK below, reused across every Avatar instance each
// frame (R3F's useFrame callbacks run one at a time, never concurrently, so sharing these is
// safe and avoids per-NPC per-frame allocation). See the IK block itself for what they're for.
const ikPos = new THREE.Vector3(), ikQuat = new THREE.Quaternion(), ikOff = new THREE.Vector3(), ikOrigin = new THREE.Vector3(), ikDownRay = { x: 0, y: -1, z: 0 }
const THIGH_LEN = 0.45, SHIN_LEN = 0.43, LEG_LEN = THIGH_LEN + SHIN_LEN

// A picked-up prop held in front of the chest while state.carrying is set (see state/runtime.js,
// world/Carryables.jsx). Shrunk to a consistent hand-held size regardless of the prop's real scale.
function HeldProp({ state }) {
  const c = state.carrying
  const info = c ? registry.get(c.assetId) : null
  const obj = useMemo(() => (info ? skeletonClone(info.scene) : null), [info])
  if (!info || !obj) return null
  const s = 0.32 / (info.size[1] || 1)
  return (
    <group position={[0, 0.02, 0.22]} rotation={[0, Math.PI, 0]} scale={s}>
      <group position={info.offset}><primitive object={obj} /></group>
    </group>
  )
}

// A rigged-by-hand, full-body procedural avatar (hips, spine, head, two-segment arms and legs).
// It is the default player model and the model used for remote players. Animation is
// procedural: walk/run cycles driven by actual movement speed, a jump pose, idle breathing and a wave emote.
//
// `state` is any object with { speed, grounded, emote } that is mutated every frame by its owner.

const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 6, 12)

// Optional extras, used for scripted actors (the Reign Estate duet): look = { gown, longHair, hair, noVisor }.
// `state.sing` (0..1) opens the mouth and lifts the chin; `state.gesture` is one of 'chest' | 'open' | 'reach' | 'hold'.
export default function Avatar({ state, accent = '#a33cff', skin = '#d9a37a', outfit = null, look = null }) {
  const g = useMemo(() => ({
    torso: capsule(0.17, 0.34),
    pelvis: capsule(0.15, 0.08),
    head: new THREE.SphereGeometry(0.125, 24, 18),
    hair: new THREE.SphereGeometry(0.132, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.55),
    visor: new THREE.TorusGeometry(0.118, 0.018, 8, 32, Math.PI * 1.1),
    upperArm: capsule(0.055, 0.22),
    foreArm: capsule(0.048, 0.2),
    hand: new THREE.SphereGeometry(0.055, 12, 10),
    upperLeg: capsule(0.075, 0.32),
    lowerLeg: capsule(0.062, 0.32),
    foot: new THREE.BoxGeometry(0.11, 0.07, 0.26),
    belt: new THREE.TorusGeometry(0.158, 0.016, 8, 32),
    collar: new THREE.TorusGeometry(0.1, 0.02, 8, 24),
    eye: new THREE.SphereGeometry(0.013, 8, 6),
    mouth: new THREE.SphereGeometry(0.03, 10, 8),
    backHair: new THREE.CapsuleGeometry(0.11, 0.42, 6, 12),
    skirt: new THREE.LatheGeometry([[0.12, 0.12], [0.16, 0.02], [0.21, -0.2], [0.3, -0.5], [0.42, -0.78], [0.52, -0.93]].map(([r, y]) => new THREE.Vector2(r, y)), 28),
    train: new THREE.PlaneGeometry(0.95, 1.25, 1, 6),
  }), [])

  const m = useMemo(() => ({
    suit: new THREE.MeshStandardMaterial({ color: '#15121d', roughness: 0.45, metalness: 0.35 }),
    pants: new THREE.MeshStandardMaterial({ color: '#0d0b12', roughness: 0.6, metalness: 0.2 }),
    skin: new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6 }),
    hair: new THREE.MeshStandardMaterial({ color: '#0b0910', roughness: 0.35, metalness: 0.4 }),
    neon: new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 2.2, toneMapped: false }),
    sole: new THREE.MeshStandardMaterial({ color: '#f4efff', emissive: accent, emissiveIntensity: 0.6, roughness: 0.4 }),
    vest: new THREE.MeshStandardMaterial({ color: '#d7f03c', roughness: 0.7 }),
    hat: new THREE.MeshStandardMaterial({ color: '#1d3f8f', roughness: 0.7 }),
    eye: new THREE.MeshStandardMaterial({ color: '#120d10', roughness: 0.3 }),
    mouth: new THREE.MeshStandardMaterial({ color: '#4a1119', roughness: 0.5 }),
    gown: new THREE.MeshStandardMaterial({ color: look?.gown || '#6b2fb3', roughness: 0.32, metalness: 0.25, side: THREE.DoubleSide }),
    longHair: new THREE.MeshStandardMaterial({ color: look?.hair || '#120a10', roughness: 0.4, metalness: 0.3 }),
  }), [accent, skin, look?.gown, look?.hair])
  const sm = useMemo(() => (look?.social ? socialMats(skin, look) : null), [skin, look?.social, look?.gown, look?.hair, look?.eyes, look?.lips, look?.shirt, look?.tie, look?.top, look?.bottom, look?.coat, look?.shoe, look?.barefoot, look?.pattern, look?.pendant, look?.glassesColor]) // eslint-disable-line react-hooks/exhaustive-deps
  const vestRef = useRef(), hatRef = useRef(), seen = useRef(-1), mouthRef = useRef(), trainRef = useRef(), lipRef = useRef()
  const eyeLRef = useRef(), eyeRRef = useRef()
  const blinkSeed = useMemo(() => Math.random() * 1000, [])
  useEffect(() => { seen.current = -1 }, [m]) // materials were rebuilt: re-apply the work uniform

  const r = {
    root: useRef(), hips: useRef(), spine: useRef(), head: useRef(),
    lUA: useRef(), lFA: useRef(), rUA: useRef(), rFA: useRef(),
    lUL: useRef(), lLL: useRef(), rUL: useRef(), rLL: useRef(),
  }
  const anim = useRef({ phase: 0, amp: 0, run: 0, air: 0, wave: 0, t: 0, sit: 0, sing: 0, chest: 0, open: 0, reach: 0, hold: 0, read: 0, write: 0, point: 0, swim: 0, climb: 0, stroke: 0, sp: 0, vd: 0, dv: 0, tray: 0, shake: 0, wipe: 0, brow: 0, blow: 0, stir: 0, wk: 0, wkKind: null, clap: 0, bow: 0, dance: 0, laugh: 0, cry: 0, talk: 0 })
  // idle-stance foot IK (anim/ik.js): ikL/ikR hold the last-solved hip/knee correction per foot,
  // ikTimer throttles how often the ground is actually re-sampled (see the IK block in useFrame).
  const ikL = useRef({ hip: 0, knee: 0 }), ikR = useRef({ hip: 0, knee: 0 }), ikTimer = useRef(Math.random() * 0.25)
  const { world, rapier } = useRapier()

  useFrame((_, dtRaw) => {
    // work uniform (set by the jobs system for the local player): recolour clothes, trim, cap and vest
    if (outfit && seen.current !== outfit.version) {
      seen.current = outfit.version
      const on = !!outfit.suit
      m.suit.color.set(on ? outfit.suit : '#15121d')
      m.pants.color.set(on ? outfit.pants : '#0d0b12')
      m.suit.metalness = on ? 0.05 : 0.35
      m.suit.roughness = on ? 0.8 : 0.45
      const trim = on ? outfit.trim : accent
      m.neon.color.set(trim); m.neon.emissive.set(trim); m.neon.emissiveIntensity = on ? 0.5 : 2.2
      if (vestRef.current) { vestRef.current.visible = !!(on && outfit.vest); if (outfit.vest) m.vest.color.set(outfit.vest) }
      if (hatRef.current) { hatRef.current.visible = !!(on && outfit.hat); if (outfit.hat) m.hat.color.set(outfit.hat) }
    }
    const dt = Math.min(dtRaw, 0.05)
    const a = anim.current
    const speed = state.speed || 0
    const k = (x, target, rate) => x + (target - x) * (1 - Math.exp(-rate * dt))
    a.t += dt
    a.amp = k(a.amp, Math.min(speed / 2.6, 1), 10)
    a.run = k(a.run, THREE.MathUtils.clamp((speed - 3) / 3, 0, 1), 6)
    a.air = k(a.air, state.grounded ? 0 : 1, 12)
    a.wave = k(a.wave, state.emote === 'wave' ? 1 : 0, 8)
    a.sit = k(a.sit, state.sit ? 1 : 0, 9)
    // stride frequency scales with speed (longer strides when running)
    a.phase += dt * (speed > 0.05 ? 3.2 + speed * 1.15 : 0)

    const s = Math.sin(a.phase)
    const swingAmp = a.amp * (0.55 + a.run * 0.45)
    const air = a.air

    // legs: negative x rotation swings the leg forward
    const lSwing = -s * swingAmp
    const rSwing = s * swingAmp
    r.lUL.current.rotation.x = THREE.MathUtils.lerp(lSwing, -0.7, air)
    r.rUL.current.rotation.x = THREE.MathUtils.lerp(rSwing, -0.15, air)
    const lBend = Math.max(0, Math.sin(a.phase + 1.4)) * swingAmp * (1.1 + a.run * 0.8)
    const rBend = Math.max(0, Math.sin(a.phase + 1.4 + Math.PI)) * swingAmp * (1.1 + a.run * 0.8)
    r.lLL.current.rotation.x = THREE.MathUtils.lerp(lBend + 0.04, 1.1, air)
    r.rLL.current.rotation.x = THREE.MathUtils.lerp(rBend + 0.04, 0.5, air)

    // arms counter-swing
    const breath = Math.sin(a.t * 1.8) * 0.03
    r.lUA.current.rotation.x = THREE.MathUtils.lerp(s * swingAmp * 0.9, -0.9, air)
    r.rUA.current.rotation.x = THREE.MathUtils.lerp(-s * swingAmp * 0.9, -0.9, air)
    r.lUA.current.rotation.z = 0.08 + breath * 0.5 + air * 0.5
    r.rUA.current.rotation.z = -0.08 - breath * 0.5 - air * 0.5
    r.lFA.current.rotation.x = -0.15 - a.amp * 0.35 - a.run * 0.9
    r.rFA.current.rotation.x = -0.15 - a.amp * 0.35 - a.run * 0.9

    // wave emote overrides the right arm (avatar's right is -x)
    if (a.wave > 0.01) {
      r.rUA.current.rotation.z = THREE.MathUtils.lerp(r.rUA.current.rotation.z, -2.7, a.wave)
      r.rUA.current.rotation.x = THREE.MathUtils.lerp(r.rUA.current.rotation.x, 0, a.wave)
      r.rFA.current.rotation.x = THREE.MathUtils.lerp(r.rFA.current.rotation.x, 0, a.wave)
      r.rFA.current.rotation.z = Math.sin(a.t * 10) * 0.45 * a.wave
    } else {
      r.rFA.current.rotation.z = 0
    }

    // body bob, lean, breathing
    // (no longer dips the hips on `a.run`: that lowered the whole rig into the ground at a run
    // without shortening the legs to match, so a running avatar's feet visibly sank into the street)
    r.hips.current.position.y = 0.95 + Math.abs(Math.cos(a.phase)) * 0.045 * a.amp + air * 0.05
    r.hips.current.rotation.y = s * 0.08 * a.amp
    r.hips.current.rotation.x = 0 // (the swim pose below pitches the whole body from here)
    r.spine.current.rotation.x = 0.04 + a.run * 0.2 + air * 0.1
    r.spine.current.rotation.y = -s * 0.12 * a.amp
    r.spine.current.scale.set(1, 1 + breath * 0.3, 1 + breath)
    r.head.current.rotation.x = -a.run * 0.12

    // seated pose: thighs forward, shins down, hands resting on the knees
    const st = a.sit
    if (st > 0.001) {
      const L = THREE.MathUtils.lerp
      r.lUL.current.rotation.x = L(r.lUL.current.rotation.x, -1.52, st)
      r.rUL.current.rotation.x = L(r.rUL.current.rotation.x, -1.52, st)
      r.lLL.current.rotation.x = L(r.lLL.current.rotation.x, 1.5, st)
      r.rLL.current.rotation.x = L(r.rLL.current.rotation.x, 1.5, st)
      r.lUA.current.rotation.x = L(r.lUA.current.rotation.x, -0.45, st)
      r.lFA.current.rotation.x = L(r.lFA.current.rotation.x, -0.75, st)
      if (a.wave < 0.5) {
        r.rUA.current.rotation.x = L(r.rUA.current.rotation.x, -0.45, st)
        r.rFA.current.rotation.x = L(r.rFA.current.rotation.x, -0.75, st)
      }
      r.lUA.current.rotation.z = L(r.lUA.current.rotation.z, 0.12, st)
      r.hips.current.position.y = L(r.hips.current.position.y, (state.sitHeight || 0.45) + 0.06, st)
      r.hips.current.position.z = L(0, -0.05, st)
      r.hips.current.rotation.y = L(r.hips.current.rotation.y, 0, st)
      r.spine.current.rotation.x = L(r.spine.current.rotation.x, -0.06, st)
      r.spine.current.rotation.y = L(r.spine.current.rotation.y, 0, st)
    } else r.hips.current.position.z = 0

    // water: treading water when still, a front crawl when moving, and a hand-over-hand pull when climbing out
    a.swim = k(a.swim, state.swim === 'swim' ? 1 : 0, 7)
    a.climb = k(a.climb, state.climb ? 1 : 0, 9)
    if (a.swim > 0.003) {
      const L = THREE.MathUtils.lerp
      const w = a.swim
      a.vd = k(a.vd, state.vdir || 0, 5)
      const mv = Math.max(Math.min(1, speed / 1.4), Math.abs(a.vd) * 0.7) * (1 - a.climb) // 0 treading .. 1 crawling (kicking when diving or rising)
      a.stroke += dt * (3.2 + speed * 1.5)
      a.sp += dt * 5.5
      const cs = Math.sin(a.stroke)
      const body = mv * w
      // body: upright treading, pitched face-down into the stroke, bobbing with the swell
      r.hips.current.rotation.x = L(r.hips.current.rotation.x, Math.max(1.22 * mv, 1.5 * Math.max(0, a.vd)) - 0.25 * Math.max(0, -a.vd), w)
      r.hips.current.position.y = L(r.hips.current.position.y, 0.95 + Math.sin(a.t * 1.7) * 0.02 + (1.08 - 0.95) * mv, w)
      r.hips.current.position.z = 0
      r.spine.current.rotation.x = L(r.spine.current.rotation.x, 0.0, w)
      r.spine.current.rotation.y = L(r.spine.current.rotation.y, -cs * 0.3 * mv, w)
      r.head.current.rotation.x = L(r.head.current.rotation.x, -1.0 * mv + Math.sin(a.t * 1.3) * 0.04, w)
      // legs: flutter kick when swimming, a lazy bicycle when treading
      const kick = Math.sin(a.sp * (0.5 + mv * 1.1))
      r.lUL.current.rotation.x = L(r.lUL.current.rotation.x, kick * (0.3 + 0.35 * mv) - 0.1 - 0.3 * (1 - mv), w)
      r.rUL.current.rotation.x = L(r.rUL.current.rotation.x, -kick * (0.3 + 0.35 * mv) - 0.1 - 0.3 * (1 - mv), w)
      r.lLL.current.rotation.x = L(r.lLL.current.rotation.x, 0.5 + Math.max(0, -kick) * 0.6 * (1 - mv * 0.4), w)
      r.rLL.current.rotation.x = L(r.rLL.current.rotation.x, 0.5 + Math.max(0, kick) * 0.6 * (1 - mv * 0.4), w)
      // arms: alternating overhead reach and pull (crawl), small sculling circles at the sides (treading)
      const armX = (ph) => -1.5 + Math.sin(ph) * 1.55
      const scull = Math.sin(a.sp * 0.9)
      const lx = L(-0.35 + scull * 0.25, armX(a.stroke), mv), rx = L(-0.35 - scull * 0.25, armX(a.stroke + Math.PI), mv)
      r.lUA.current.rotation.x = L(r.lUA.current.rotation.x, lx, w); r.rUA.current.rotation.x = L(r.rUA.current.rotation.x, rx, w)
      r.lUA.current.rotation.z = L(r.lUA.current.rotation.z, 0.75 - 0.6 * mv, w); r.rUA.current.rotation.z = L(r.rUA.current.rotation.z, -0.75 + 0.6 * mv, w)
      r.lFA.current.rotation.x = L(r.lFA.current.rotation.x, -0.9 + Math.cos(a.stroke) * 0.5 * mv, w); r.rFA.current.rotation.x = L(r.rFA.current.rotation.x, -0.9 - Math.cos(a.stroke) * 0.5 * mv, w)
      // climbing out: both arms up to the coping, legs scrambling
      if (a.climb > 0.01) {
        const c = a.climb
        r.hips.current.rotation.x = L(r.hips.current.rotation.x, 0.15, c)
        r.lUA.current.rotation.x = L(r.lUA.current.rotation.x, -2.7 + Math.sin(a.t * 7) * 0.2, c); r.rUA.current.rotation.x = L(r.rUA.current.rotation.x, -2.7 - Math.sin(a.t * 7) * 0.2, c)
        r.lUA.current.rotation.z = L(r.lUA.current.rotation.z, 0.2, c); r.rUA.current.rotation.z = L(r.rUA.current.rotation.z, -0.2, c)
        r.lFA.current.rotation.x = L(r.lFA.current.rotation.x, -0.2, c); r.rFA.current.rotation.x = L(r.rFA.current.rotation.x, -0.2, c)
        r.lUL.current.rotation.x = L(r.lUL.current.rotation.x, -0.9 + Math.sin(a.t * 9) * 0.4, c); r.rUL.current.rotation.x = L(r.rUL.current.rotation.x, -0.9 - Math.sin(a.t * 9) * 0.4, c)
      }
    }

    // leaping head-first (diving board, or C in the air): arms overhead, body pitched forward, legs together
    a.dv = k(a.dv, state.diveAir ? 1 : 0, 10)
    if (a.dv > 0.01) {
      const L = THREE.MathUtils.lerp, c = a.dv
      r.hips.current.rotation.x = L(r.hips.current.rotation.x, 1.35, c)
      r.hips.current.position.y = L(r.hips.current.position.y, 1.0, c)
      r.lUA.current.rotation.x = L(r.lUA.current.rotation.x, -3.0, c); r.rUA.current.rotation.x = L(r.rUA.current.rotation.x, -3.0, c)
      r.lUA.current.rotation.z = L(r.lUA.current.rotation.z, 0.12, c); r.rUA.current.rotation.z = L(r.rUA.current.rotation.z, -0.12, c)
      r.lFA.current.rotation.x = L(r.lFA.current.rotation.x, -0.05, c); r.rFA.current.rotation.x = L(r.rFA.current.rotation.x, -0.05, c)
      r.lUL.current.rotation.x = L(r.lUL.current.rotation.x, 0.1, c); r.rUL.current.rotation.x = L(r.rUL.current.rotation.x, 0.1, c)
      r.lLL.current.rotation.x = L(r.lLL.current.rotation.x, 0.15, c); r.rLL.current.rotation.x = L(r.rLL.current.rotation.x, 0.15, c)
      r.head.current.rotation.x = L(r.head.current.rotation.x, -0.5, c)
    }

    // gym: a workout kind ('run', 'bike', 'press', ...) from the player's machine or a scripted member
    const wkKind = state.workout || null
    if (wkKind) a.wkKind = wkKind
    a.wk = k(a.wk, wkKind ? 1 : 0, 6)
    if (a.wk > 0.01 && a.wkKind) applyWorkout(a.wkKind, r, a.wk, state.sitHeight || 0.45)

    // idle-stance foot IK (anim/ik.js): plants each foot on the ground actually beneath it when
    // standing on a curb, step, or raised slab, instead of floating or sinking. Pure two-bone
    // analytic IK, so it is always geometrically reachable - never a flip or a twisted joint.
    // It only has any effect near a full standing idle: `idleFactor` fades it to exactly 0 the
    // moment the character walks, runs, jumps, sits, swims, climbs, dives, or works out, so it
    // can never fight any of those existing poses. The ground sample itself is throttled (a few
    // times a second, not every frame) since it costs a physics raycast per foot.
    const idleFactor = (1 - a.amp) * (1 - air) * (1 - st) * (1 - a.swim) * (1 - a.climb) * (1 - a.dv) * (1 - a.wk)
    ikTimer.current -= dt
    if (world && rapier && idleFactor > 0.3 && ikTimer.current <= 0) {
      ikTimer.current = 0.25
      r.root.current.getWorldPosition(ikPos)
      r.root.current.getWorldQuaternion(ikQuat)
      const hipY = ikPos.y + 0.95
      for (const side of [0, 1]) {
        const footX = side === 0 ? 0.1 : -0.1
        ikOff.set(footX, 0, 0).applyQuaternion(ikQuat)
        ikOrigin.set(ikPos.x + ikOff.x, hipY + 0.4, ikPos.z + ikOff.z)
        const ray = new rapier.Ray(ikOrigin, ikDownRay)
        const hit = world.castRay(ray, 1.6, true, undefined, undefined, undefined, undefined,
          (c) => c.handle !== state.colliderHandle && !c.isSensor())
        const groundY = hit ? ikOrigin.y - hit.timeOfImpact : ikPos.y
        const dist = THREE.MathUtils.clamp(hipY - groundY, LEG_LEN - 0.22, LEG_LEN)
        const solved = twoBoneIK(THIGH_LEN, SHIN_LEN, dist)
        const target = side === 0 ? ikL.current : ikR.current
        target.hip = solved.hip; target.knee = solved.knee
      }
    }
    if (idleFactor > 0.01) {
      r.lUL.current.rotation.x += -ikL.current.hip * idleFactor
      r.lLL.current.rotation.x += ikL.current.knee * idleFactor
      r.rUL.current.rotation.x += -ikR.current.hip * idleFactor
      r.rLL.current.rotation.x += ikR.current.knee * idleFactor
    }

    // singing: mouth, chin, sway, and a few hand gestures (scripted actors only)
    const sg = state.sing || 0
    a.sing = k(a.sing, sg, 7)
    const gs = state.gesture
    a.chest = k(a.chest, gs === 'chest' ? 1 : 0, 5)
    a.open = k(a.open, gs === 'open' ? 1 : 0, 5)
    a.reach = k(a.reach, gs === 'reach' ? 1 : 0, 5)
    a.hold = k(a.hold, gs === 'hold' ? 1 : 0, 5)
    a.read = k(a.read, gs === 'read' ? 1 : 0, 5)
    a.write = k(a.write, gs === 'write' ? 1 : 0, 5)
    a.point = k(a.point, gs === 'point' ? 1 : 0, 5)
    // job gestures (staff NPCs); also held while carrying a picked-up prop (state.carrying)
    a.tray = k(a.tray, (gs === 'tray' || state.carrying) ? 1 : 0, 5)
    a.shake = k(a.shake, gs === 'shake' ? 1 : 0, 6)
    a.wipe = k(a.wipe, gs === 'wipe' ? 1 : 0, 5)
    a.brow = k(a.brow, gs === 'brow' ? 1 : 0, 5)
    a.blow = k(a.blow, gs === 'blow' ? 1 : 0, 7)
    a.stir = k(a.stir, gs === 'stir' ? 1 : 0, 5)
    a.laugh = k(a.laugh, gs === 'laugh' ? 1 : 0, 6)
    a.cry = k(a.cry, gs === 'cry' ? 1 : 0, 5)
    a.talk = k(a.talk, gs === 'talk' ? 1 : 0, 5)
    // performance gestures: a crowd-facing clap and a bow (see ui/PerformancePanel.jsx)
    a.clap = k(a.clap, gs === 'clap' ? 1 : 0, 7)
    a.bow = k(a.bow, gs === 'bow' ? 1 : 0, 5)
    if (mouthRef.current) {
      // real performers: mouth shape comes from the actual music (precomputed visemes if a track
      // ever has them, else the live audio, split into an "open" and a "wide" component so it
      // reads a bit more like real speech/singing than a single pump - see music/lipsync.js's
      // performanceViseme for exactly what that is and isn't); everyone else keeps the idle wiggle.
      const live = state.performing ? performanceViseme(state.performing.trackId, a.t) : null
      const syl = live ? live.open : Math.abs(Math.sin(a.t * 8.6 + Math.sin(a.t * 2.3) * 2.2))
      const wideSyl = live ? live.wide : 0
      const open = a.sing * (0.25 + syl * 1.5)
      const wide = a.sing * wideSyl * 0.35
      mouthRef.current.scale.set(1.15 + wide, 0.12 + open - wide * 0.4, 0.5)
      if (lipRef.current) lipRef.current.position.y = 0.0925 - Math.min(open, 1.2) * 0.011
    }
    // idle eye blink (anim/blink.js) - a believable cadence, not driven by any clip or audio
    const blink = blinkAmount(a.t, blinkSeed)
    const eyeOpenY = look?.social ? 1 : 1.25
    if (eyeLRef.current) eyeLRef.current.scale.y = eyeOpenY * (1 - blink * 0.9)
    if (eyeRRef.current) eyeRRef.current.scale.y = eyeOpenY * (1 - blink * 0.9)
    if (a.sing > 0.01 || a.chest + a.open + a.reach + a.hold + a.read + a.write + a.point + a.tray + a.shake + a.wipe + a.brow + a.blow + a.stir + a.clap + a.bow + a.laugh + a.cry + a.talk > 0.01) {
      const L = THREE.MathUtils.lerp
      r.head.current.rotation.x = L(r.head.current.rotation.x, -0.16, a.sing)
      r.head.current.rotation.z = Math.sin(a.t * 0.9) * 0.06 * a.sing
      r.spine.current.rotation.y = L(r.spine.current.rotation.y, Math.sin(a.t * 0.7) * 0.07, a.sing)
      r.hips.current.rotation.y = L(r.hips.current.rotation.y, Math.sin(a.t * 0.7 + 1) * 0.05, a.sing)
      const to = (ref, ax, v, w) => { if (w > 0.001) ref.current.rotation[ax] = L(ref.current.rotation[ax], v, Math.min(1, w)) }
      // right hand to the chest
      to(r.rUA, 'x', -0.75, a.chest); to(r.rUA, 'z', 0.3, a.chest); to(r.rFA, 'x', -1.95, a.chest)
      // arms open
      to(r.rUA, 'x', -0.35, a.open); to(r.rUA, 'z', -1.05, a.open); to(r.rFA, 'x', -0.5, a.open)
      to(r.lUA, 'x', -0.35, a.open); to(r.lUA, 'z', 1.05, a.open); to(r.lFA, 'x', -0.5, a.open)
      // left arm reaching toward the partner
      to(r.lUA, 'x', -1.25, a.reach); to(r.lUA, 'z', -0.12, a.reach); to(r.lFA, 'x', -0.35, a.reach)
      // both hands forward (holding hands)
      to(r.lUA, 'x', -0.95, a.hold); to(r.lUA, 'z', -0.1, a.hold); to(r.lFA, 'x', -0.55, a.hold)
      to(r.rUA, 'x', -0.95, a.hold); to(r.rUA, 'z', 0.1, a.hold); to(r.rFA, 'x', -0.55, a.hold)
      // holding a book up to read: both forearms raised in front of the chest
      to(r.lUA, 'x', -0.55, a.read); to(r.lUA, 'z', -0.12, a.read); to(r.lFA, 'x', -1.25, a.read)
      to(r.rUA, 'x', -0.55, a.read); to(r.rUA, 'z', 0.12, a.read); to(r.rFA, 'x', -1.25, a.read)
      // writing / working at a table: forearms out over the desk, the right hand moving a little
      to(r.lUA, 'x', -0.6, a.write); to(r.lUA, 'z', -0.05, a.write); to(r.lFA, 'x', -0.95, a.write)
      to(r.rUA, 'x', -0.6 + Math.sin(a.t * 3.1) * 0.04, a.write); to(r.rUA, 'z', 0.05, a.write); to(r.rFA, 'x', -0.95 + Math.sin(a.t * 5.3) * 0.08, a.write)
      // pointing at a board with the right arm
      to(r.rUA, 'x', -1.35, a.point); to(r.rUA, 'z', -0.35, a.point); to(r.rFA, 'x', -0.12, a.point)
      // carrying a tray: both forearms level at the waist
      to(r.lUA, 'x', -0.3, a.tray); to(r.lUA, 'z', -0.14, a.tray); to(r.lFA, 'x', -1.35, a.tray)
      to(r.rUA, 'x', -0.3, a.tray); to(r.rUA, 'z', 0.14, a.tray); to(r.rFA, 'x', -1.35, a.tray)
      // shaking a cocktail: the right arm up by the shoulder, shaking hard; the left hand steadies the tin
      to(r.rUA, 'x', -1.7 + Math.sin(a.t * 15) * 0.16, a.shake); to(r.rUA, 'z', 0.12, a.shake); to(r.rFA, 'x', -1.5 + Math.sin(a.t * 15 + 1.2) * 0.22, a.shake)
      to(r.lUA, 'x', -1.0, a.shake); to(r.lUA, 'z', -0.2, a.shake); to(r.lFA, 'x', -1.4, a.shake)
      // wiping the counter: one arm out, sweeping side to side
      to(r.rUA, 'x', -0.85, a.wipe); to(r.rUA, 'z', 0.05 + Math.sin(a.t * 3.4) * 0.35, a.wipe); to(r.rFA, 'x', -0.7, a.wipe)
      to(r.lUA, 'x', -0.1, a.wipe)
      // hand to the brow, scanning the water
      to(r.rUA, 'x', -1.55, a.brow); to(r.rUA, 'z', -0.15, a.brow); to(r.rFA, 'x', -2.15, a.brow)
      // blowing a whistle: hand to the mouth
      to(r.rUA, 'x', -1.2, a.blow); to(r.rUA, 'z', 0.12, a.blow); to(r.rFA, 'x', -2.35, a.blow)
      // stirring a pot: both hands forward, a small circle
      to(r.rUA, 'x', -0.75 + Math.sin(a.t * 4) * 0.08, a.stir); to(r.rUA, 'z', 0.1 + Math.cos(a.t * 4) * 0.1, a.stir); to(r.rFA, 'x', -0.8, a.stir)
      to(r.lUA, 'x', -0.5, a.stir); to(r.lUA, 'z', -0.12, a.stir); to(r.lFA, 'x', -0.9, a.stir)
      // clapping toward the crowd: both forearms meet in front of the chest, hands beating together
      to(r.lUA, 'x', -0.7, a.clap); to(r.lUA, 'z', 0.35, a.clap); to(r.lFA, 'x', -1.55 + Math.abs(Math.sin(a.t * 9)) * 0.25, a.clap)
      to(r.rUA, 'x', -0.7, a.clap); to(r.rUA, 'z', -0.35, a.clap); to(r.rFA, 'x', -1.55 + Math.abs(Math.sin(a.t * 9)) * 0.25, a.clap)
      // bowing to the audience: pitch forward from the waist, arms relaxed back
      to(r.spine, 'x', 0.55, a.bow); to(r.head, 'x', 0.3, a.bow)
      to(r.lUA, 'x', 0.3, a.bow); to(r.lUA, 'z', 0.05, a.bow); to(r.rUA, 'x', 0.3, a.bow); to(r.rUA, 'z', -0.05, a.bow)
      // laughing: head tips back and bobs, shoulders shake, both hands come toward the stomach
      to(r.head, 'x', -0.35 + Math.sin(a.t * 10) * 0.05, a.laugh)
      to(r.spine, 'x', -0.08 + Math.abs(Math.sin(a.t * 10)) * 0.05, a.laugh)
      to(r.lUA, 'x', -0.5, a.laugh); to(r.lUA, 'z', 0.25, a.laugh); to(r.lFA, 'x', -1.3, a.laugh)
      to(r.rUA, 'x', -0.5, a.laugh); to(r.rUA, 'z', -0.25, a.laugh); to(r.rFA, 'x', -1.3, a.laugh)
      // crying: head bows, both hands come up to the face, shoulders tremble
      to(r.head, 'x', 0.35, a.cry)
      to(r.spine, 'z', Math.sin(a.t * 6) * 0.04, a.cry)
      to(r.lUA, 'x', -1.5, a.cry); to(r.lUA, 'z', -0.15, a.cry); to(r.lFA, 'x', -2.1, a.cry)
      to(r.rUA, 'x', -1.5, a.cry); to(r.rUA, 'z', 0.15, a.cry); to(r.rFA, 'x', -2.1, a.cry)
      // talking: an idle one-hand gesture with a small head nod, for conversation scenes
      to(r.head, 'x', Math.sin(a.t * 1.6) * 0.05, a.talk)
      to(r.rUA, 'x', -0.55 + Math.sin(a.t * 2.2) * 0.12, a.talk); to(r.rUA, 'z', -0.1, a.talk); to(r.rFA, 'x', -0.9 + Math.sin(a.t * 2.2 + 0.6) * 0.15, a.talk)
    }
    // dancing: an additive sway/bounce layered on top of whatever else is happening (singing,
    // walking, gesturing), so a performer can dance while singing rather than picking one.
    a.dance = k(a.dance, state.dancing ? 1 : 0, 6)
    if (a.dance > 0.01) {
      const d = a.dance, beat = a.t * 5.3 * (state.animSpeed || 1)
      r.hips.current.position.y += Math.abs(Math.sin(beat)) * 0.07 * d
      r.hips.current.rotation.y += Math.sin(beat * 0.5) * 0.18 * d
      r.hips.current.rotation.z = Math.sin(beat * 0.5 + 1) * 0.08 * d
      r.spine.current.rotation.z = Math.sin(beat * 0.5) * 0.12 * d
      r.head.current.rotation.z = Math.sin(beat * 0.5 + 0.6) * 0.08 * d
      r.lUA.current.rotation.z += Math.sin(beat + 1) * 0.3 * d
      r.rUA.current.rotation.z -= Math.sin(beat + 1) * 0.3 * d
      r.lUL.current.rotation.x += Math.sin(beat) * 0.16 * d
      r.rUL.current.rotation.x -= Math.sin(beat) * 0.16 * d
    }
    if (look?.gown) {
      // the train lifts a little when walking
      if (trainRef.current) trainRef.current.rotation.x = -Math.PI / 2 + 0.25 * a.amp * (0.5 + 0.5 * Math.sin(a.phase * 0.5))
    }
  })

  if (look?.social) return <SocialRig r={r} m={m} sm={sm} look={look} mouthRef={mouthRef} lipRef={lipRef} trainRef={trainRef} vestRef={vestRef} hatRef={hatRef} eyeLRef={eyeLRef} eyeRRef={eyeRRef} state={state} />
  return (
    <group ref={r.root}>
      <group ref={r.hips} position={[0, 0.95, 0]}>
        <mesh geometry={g.pelvis} material={m.pants} rotation={[0, 0, Math.PI / 2]} castShadow />
        <mesh geometry={g.belt} material={m.neon} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} />

        {look?.gown && (
          <>
            <mesh geometry={g.skirt} material={m.gown} position={[0, 0.02, 0]} castShadow />
            <mesh ref={trainRef} geometry={g.train} material={m.gown} position={[0, -0.92, -0.55]} rotation={[-Math.PI / 2, 0, 0]} castShadow />
          </>
        )}
        {/* legs */}
        {[[0.1, r.lUL, r.lLL], [-0.1, r.rUL, r.rLL]].map(([x, ul, ll], i) => (
          <group key={i} ref={ul} position={[x, -0.04, 0]}>
            <mesh geometry={g.upperLeg} material={m.pants} position={[0, -0.22, 0]} castShadow />
            <group ref={ll} position={[0, -0.45, 0]}>
              <mesh geometry={g.lowerLeg} material={m.pants} position={[0, -0.2, 0]} castShadow />
              <mesh geometry={g.foot} material={m.sole} position={[0, -0.43, 0.05]} castShadow />
            </group>
          </group>
        ))}

        {/* torso */}
        <group ref={r.spine} position={[0, 0.06, 0]}>
          <HeldProp state={state} />
          <mesh geometry={g.torso} material={m.suit} position={[0, 0.3, 0]} scale={[1.18, 1, 0.82]} castShadow />
          <mesh ref={vestRef} visible={false} material={m.vest} position={[0, 0.3, 0]} scale={[1.18, 1, 0.82]}><capsuleGeometry args={[0.178, 0.2, 6, 12]} /></mesh>
          <mesh geometry={g.collar} material={m.neon} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.58, 0]} />
          {/* neon chest line */}
          <mesh material={m.neon} position={[0, 0.34, 0.145]}>
            <boxGeometry args={[0.025, 0.3, 0.01]} />
          </mesh>

          <group ref={r.head} position={[0, 0.66, 0]}>
            <mesh material={m.skin} position={[0, 0.02, 0]}>
              <cylinderGeometry args={[0.045, 0.05, 0.08, 12]} />
            </mesh>
            <mesh geometry={g.head} material={m.skin} position={[0, 0.15, 0]} castShadow />
            <mesh geometry={g.hair} material={m.hair} position={[0, 0.165, -0.008]} rotation={[-0.25, 0, 0]} />
            <group ref={hatRef} visible={false}>
              <mesh material={m.hat} position={[0, 0.172, -0.005]} castShadow><sphereGeometry args={[0.14, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} /></mesh>
              <mesh material={m.hat} position={[0, 0.185, 0.13]} rotation={[0.1, 0, 0]}><boxGeometry args={[0.2, 0.012, 0.12]} /></mesh>
            </group>
            {!look?.noVisor && <mesh geometry={g.visor} material={m.neon} position={[0, 0.17, 0.0]} rotation={[0, Math.PI * 1.05, 0]} />}
            {/* face: eyes, nose and a mouth that opens while singing */}
            <mesh ref={eyeLRef} geometry={g.eye} material={m.eye} position={[0.045, 0.17, 0.112]} scale={[1, 1.25, 0.8]} />
            <mesh ref={eyeRRef} geometry={g.eye} material={m.eye} position={[-0.045, 0.17, 0.112]} scale={[1, 1.25, 0.8]} />
            <mesh geometry={g.eye} material={m.skin} position={[0, 0.145, 0.124]} scale={[1.1, 1.2, 1.2]} />
            <mesh ref={mouthRef} geometry={g.mouth} material={m.mouth} position={[0, 0.098, 0.113]} scale={[1.15, 0.12, 0.5]} />
            {look?.longHair && <mesh geometry={g.backHair} material={m.longHair} position={[0, -0.07, -0.085]} scale={[1.25, 1, 0.8]} castShadow />}
          </group>

          {/* arms (shoulders at ±0.25) */}
          {[[0.25, r.lUA, r.lFA], [-0.25, r.rUA, r.rFA]].map(([x, ua, fa], i) => (
            <group key={i} ref={ua} position={[x, 0.5, 0]}>
              <mesh geometry={g.upperArm} material={m.suit} position={[0, -0.16, 0]} castShadow />
              <group ref={fa} position={[0, -0.32, 0]}>
                <mesh geometry={g.foreArm} material={m.suit} position={[0, -0.14, 0]} castShadow />
                <mesh material={m.neon} position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.052, 0.01, 6, 16]} />
                </mesh>
                <mesh geometry={g.hand} material={m.skin} position={[0, -0.3, 0]} />
              </group>
            </group>
          ))}
        </group>
      </group>
    </group>
  )
}


/* ======================================================================================
   "Social" look: human proportions, expressive face, styled hair, fashion. Same skeleton and
   animation as the classic avatar (the refs are shared); only the visible meshes differ.
   look = { social: true, build: 'f' | 'm', gown, hair, eyes, lips, shirt, tie, beard, longHair, sleeveless }
   ====================================================================================== */
const V2 = (pts) => pts.map(([r, y]) => new THREE.Vector2(r, y))
let SG = null
function socialGeo() {
  if (SG) return SG
  const lathe = (pts, n = 28) => new THREE.LatheGeometry(V2(pts), n)
  const skirt = (() => {
    const g = new THREE.LatheGeometry(V2([[0.1, 0.1], [0.13, 0.02], [0.18, -0.14], [0.25, -0.38], [0.36, -0.62], [0.47, -0.8], [0.56, -0.93]]), 56)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = p.getY(i)
      const t = Math.min(1, Math.max(0, (0.1 - y) / 1.0)), a = Math.atan2(z, x)
      const k = 1 + Math.sin(a * 11) * 0.035 * t + Math.sin(a * 5 + 1) * 0.03 * t
      p.setX(i, x * k); p.setZ(i, z * k)
    }
    g.computeVertexNormals()
    return g
  })()
  SG = {
    torsoM: lathe([[0.001, 0], [0.13, 0.01], [0.165, 0.1], [0.185, 0.26], [0.2, 0.42], [0.19, 0.53], [0.13, 0.6], [0.055, 0.64], [0.001, 0.645]]),
    torsoF: lathe([[0.001, 0], [0.115, 0.01], [0.135, 0.1], [0.12, 0.2], [0.158, 0.35], [0.168, 0.44], [0.15, 0.52], [0.098, 0.585], [0.05, 0.625], [0.001, 0.635]]),
    skirt,
    train: new THREE.PlaneGeometry(1.0, 1.4, 6, 8),
    coat: new THREE.LatheGeometry(V2([[0.215, 0.58], [0.226, 0.5], [0.205, 0.3], [0.2, 0.1], [0.215, -0.1], [0.24, -0.35], [0.275, -0.62]]), 40, 0.42, Math.PI * 2 - 0.84),
    head: new THREE.SphereGeometry(0.125, 32, 24),
    sphere: new THREE.SphereGeometry(1, 20, 14),
    mouthSm: new THREE.SphereGeometry(0.018, 14, 10),
    upperArm: new THREE.CylinderGeometry(0.052, 0.042, 0.3, 14),
    foreArm: new THREE.CylinderGeometry(0.041, 0.029, 0.28, 14),
    upperLeg: new THREE.CylinderGeometry(0.082, 0.062, 0.46, 14),
    lowerLeg: new THREE.CylinderGeometry(0.058, 0.04, 0.44, 14),
    beard: new THREE.SphereGeometry(0.128, 28, 14, 0, Math.PI * 2, Math.PI * 0.645, Math.PI * 0.24),
    cap: new THREE.SphereGeometry(0.134, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.56),
    lash: new THREE.TorusGeometry(0.024, 0.0045, 6, 14, Math.PI),
    torusSm: new THREE.TorusGeometry(1, 0.1, 8, 28),
    capsule: (r, len) => new THREE.CapsuleGeometry(r, len, 8, 14),
  }
  return SG
}
function socialMats(skin, look) {
  const phys = (o) => new THREE.MeshPhysicalMaterial(o)
  return {
    skin: phys({ color: skin, roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color('#ffb59a'), sheenRoughness: 0.5, clearcoat: 0.06, emissive: new THREE.Color(skin).multiplyScalar(0.07) }),
    hair: phys({ color: look.hair || '#14090d', roughness: 0.55, metalness: 0.05, clearcoat: 0.25, clearcoatRoughness: 0.5 }),
    gown: phys({ color: look.gown || '#6b2fb3', roughness: 0.28, metalness: 0.1, sheen: 1, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.35, clearcoat: 0.25, side: THREE.DoubleSide }),
    sclera: new THREE.MeshStandardMaterial({ color: '#f7f3ef', roughness: 0.25 }),
    iris: new THREE.MeshStandardMaterial({ color: look.eyes || '#5b3a24', roughness: 0.2, emissive: look.eyes || '#5b3a24', emissiveIntensity: 0.25 }),
    pupil: new THREE.MeshBasicMaterial({ color: '#050304' }),
    glint: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
    lash: new THREE.MeshStandardMaterial({ color: '#0a0507', roughness: 0.5 }),
    lips: phys({ color: look.lips || (look.build === 'f' ? '#a8325c' : '#7d3a34'), roughness: 0.25, clearcoat: look.build === 'f' ? 0.9 : 0.2 }),
    mouth: new THREE.MeshBasicMaterial({ color: '#2a070c' }),
    shirt: new THREE.MeshStandardMaterial({ color: look.shirt || '#f6f4f1', roughness: 0.55 }),
    tie: new THREE.MeshStandardMaterial({ color: look.tie || '#111116', roughness: 0.35, metalness: 0.2 }),
    shoe: look.barefoot ? phys({ color: skin, roughness: 0.55 }) : phys({ color: look.shoe || '#0b0b0e', roughness: 0.2, clearcoat: look.shoe ? 0.4 : 1, clearcoatRoughness: 0.1 }),
    gold: new THREE.MeshStandardMaterial({ color: '#d4af5a', metalness: 1, roughness: 0.22 }),
    silver: new THREE.MeshStandardMaterial({ color: '#d7dade', metalness: 1, roughness: 0.2 }),
    top: look.top ? (look.pattern === 'leopard' ? phys({ color: '#ffffff', map: leopardTex(), roughness: 0.4, sheen: 0.7, sheenColor: new THREE.Color('#ffd9a0'), side: THREE.DoubleSide }) : phys({ color: look.top, roughness: 0.62, sheen: 0.3, side: THREE.DoubleSide })) : null,
    bottom: look.bottom ? phys({ color: look.bottom, roughness: 0.5, sheen: 0.4, clearcoat: 0.08 }) : null,
    coat: look.coat ? new THREE.MeshStandardMaterial({ color: look.coat, roughness: 0.8, side: THREE.DoubleSide }) : null,
    satin: new THREE.MeshStandardMaterial({ color: '#050507', roughness: 0.2, metalness: 0.3 }),
    pendant: look.pendant ? new THREE.MeshStandardMaterial({ color: look.pendant, emissive: look.pendant, emissiveIntensity: 0.5, roughness: 0.15, metalness: 0.3 }) : null,
    steth: new THREE.MeshStandardMaterial({ color: '#17181c', roughness: 0.4, metalness: 0.5 }),
    badge: new THREE.MeshStandardMaterial({ color: '#f1f6fb', roughness: 0.5 }),
    glasses: new THREE.MeshStandardMaterial({ color: look.glassesColor || '#1b1b20', roughness: 0.3, metalness: 0.6 }),
  }
}
let LEO = null
function leopardTex() {
  if (LEO) return LEO
  const c = document.createElement('canvas'); c.width = 256; c.height = 256
  const g = c.getContext('2d')
  g.fillStyle = '#c98a3a'; g.fillRect(0, 0, 256, 256)
  let sd = 11
  const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647 }
  for (let i = 0; i < 70; i++) {
    const x = rnd() * 256, y = rnd() * 256, r = 7 + rnd() * 9, a = rnd() * 6
    g.fillStyle = '#6b3d14'; g.beginPath(); g.ellipse(x, y, r, r * 0.7, a, 0, 7); g.fill()
    g.fillStyle = '#d99a4a'; g.beginPath(); g.ellipse(x, y, r * 0.55, r * 0.35, a, 0, 7); g.fill()
    g.strokeStyle = '#1a0d05'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r * 0.95, a, a + 3.6); g.stroke()
  }
  LEO = new THREE.CanvasTexture(c)
  LEO.colorSpace = THREE.SRGBColorSpace
  LEO.wrapS = LEO.wrapT = THREE.RepeatWrapping
  LEO.repeat.set(2, 1.5)
  return LEO
}

function SocialRig({ r, m, sm, look, mouthRef, lipRef, trainRef, vestRef, hatRef, eyeLRef, eyeRRef, state }) {
  const g = socialGeo()
  const F = look.build === 'f'
  const gown = !!look.gown
  const sleeveless = look.sleeveless ?? gown
  const sh = F ? 0.215 : 0.255
  const torso = F ? g.torsoF : g.torsoM
  const topMat = sm.top || m.suit
  const armMat = sleeveless ? sm.skin : sm.coat || topMat
  const legMat = sm.bottom || m.pants
  return (
    <group ref={r.root}>
      <group ref={r.hips} position={[0, 0.95, 0]}>
        <mesh geometry={g.sphere} material={legMat} scale={[F ? 0.165 : 0.16, 0.1, 0.12]} castShadow />
        {gown && (
          <>
            <mesh geometry={g.skirt} material={sm.gown} position={[0, 0.02, 0]} castShadow />
            <mesh ref={trainRef} geometry={g.train} material={sm.gown} position={[0, -0.92, -0.62]} rotation={[-Math.PI / 2, 0, 0]} castShadow />
          </>
        )}
        {/* legs */}
        {[[0.095, r.lUL, r.lLL], [-0.095, r.rUL, r.rLL]].map(([x, ul, ll], i) => (
          <group key={i} ref={ul} position={[x, -0.04, 0]}>
            <mesh geometry={g.upperLeg} material={legMat} position={[0, -0.22, 0]} castShadow />
            <mesh geometry={g.sphere} material={legMat} position={[0, -0.45, 0]} scale={0.06} />
            <group ref={ll} position={[0, -0.45, 0]}>
              <mesh geometry={g.lowerLeg} material={legMat} position={[0, -0.21, 0]} castShadow />
              <mesh geometry={g.sphere} material={sm.shoe} position={[0, -0.45, 0.055]} scale={F ? [0.045, 0.035, 0.12] : [0.052, 0.04, 0.135]} castShadow />
              {F && <mesh material={sm.shoe} position={[0, -0.42, -0.03]}><cylinderGeometry args={[0.012, 0.01, 0.1, 6]} /></mesh>}
            </group>
          </group>
        ))}

        {/* torso */}
        <group ref={r.spine} position={[0, 0.06, 0]}>
          <HeldProp state={state} />
          <mesh geometry={torso} material={topMat} scale={F ? [1.12, 1, 0.84] : [1.22, 1, 0.78]} castShadow />
          <mesh ref={vestRef} visible={false} material={m.vest} position={[0, 0.3, 0]} scale={[1.18, 1, 0.82]}><capsuleGeometry args={[0.178, 0.2, 6, 12]} /></mesh>
          {F ? (
            <>
              <mesh geometry={g.torusSm} material={m.neon} position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.138 * 1.12, 0.138 * 0.84, 0.14]} />
              {/* sweetheart neckline: bare chest, shoulders and collarbone (modest = covered neckline) */}
              {look.modest ? (
                <mesh material={sm.top || m.suit} position={[0, 0.62, 0.01]}><cylinderGeometry args={[0.058, 0.07, 0.07, 14]} /></mesh>
              ) : (
                <>
                  <mesh geometry={g.sphere} material={sm.skin} position={[0, 0.515, 0.092]} scale={[0.118, 0.08, 0.05]} />
                  <mesh geometry={g.sphere} material={sm.skin} position={[0, 0.595, 0.03]} scale={[0.1, 0.05, 0.075]} />
                </>
              )}
            </>
          ) : (
            <>
              {/* shirt, lapels, tie, buttons (casual = crew-neck, no tie) */}
              {look.casual ? (
                <mesh material={sm.skin} position={[0, 0.6, 0.05]} scale={1}><boxGeometry args={[0.07, 0.04, 0.05]} /></mesh>
              ) : (
                <>
                  <mesh material={sm.shirt} position={[0, 0.43, 0.168]}><boxGeometry args={[0.1, 0.3, 0.012]} /></mesh>
                  {[-1, 1].map((sd) => <mesh key={sd} material={sm.top ? sm.top : m.suit} position={[sd * 0.075, 0.43, 0.172]} rotation={[0, 0, -sd * 0.32]} castShadow><boxGeometry args={[0.055, 0.32, 0.02]} /></mesh>)}
                  <mesh material={sm.tie} position={[0, 0.41, 0.178]}><boxGeometry args={[0.028, 0.24, 0.01]} /></mesh>
                  <mesh material={sm.tie} position={[0, 0.535, 0.18]}><boxGeometry args={[0.04, 0.035, 0.014]} /></mesh>
                  {[0.2, 0.3].map((y) => <mesh key={y} geometry={g.sphere} material={sm.gold} position={[0.03, y, 0.185]} scale={0.011} />)}
                  {!look.top && <mesh material={m.neon} position={[-0.1, 0.4, 0.17]}><boxGeometry args={[0.04, 0.04, 0.012]} /></mesh>}
                </>
              )}
            </>
          )}
          {/* wardrobe extras: open overcoat / lab coat, blazer lapels, stethoscope, badge, chains */}
          {sm.coat && (
            <>
              <mesh geometry={g.coat} material={sm.coat} position={[0, 0.02, 0]} scale={F ? [1.1, 1, 0.9] : [1.2, 1, 0.86]} castShadow />
              {[1, -1].map((sd) => <mesh key={sd} material={sm.coat} position={[sd * 0.085, 0.5, F ? 0.1 : 0.14]} rotation={[0.1, 0, -sd * 0.55]}><boxGeometry args={[0.07, 0.2, 0.012]} /></mesh>)}
              {look.turtleneck && <mesh material={sm.top} position={[0, 0.655, 0]}><cylinderGeometry args={[0.062, 0.07, 0.1, 14]} /></mesh>}
            </>
          )}
          {look.blazer && F && (
            <>
              <mesh material={sm.top} position={[0, 0.34, F ? 0.108 : 0.15]}><boxGeometry args={[0.26, 0.3, 0.012]} /></mesh>
              {[1, -1].map((sd) => <mesh key={sd} material={sm.satin} position={[sd * 0.065, 0.43, 0.118]} rotation={[0, 0, -sd * 0.42]}><boxGeometry args={[0.05, 0.28, 0.014]} /></mesh>)}
              <mesh material={sm.skin} position={[0, 0.5, 0.108]}><boxGeometry args={[0.07, 0.14, 0.01]} /></mesh>
              <mesh geometry={g.sphere} material={sm.gold} position={[0.015, 0.25, 0.122]} scale={0.011} />
            </>
          )}
          {look.stethoscope && (
            <>
              <mesh geometry={g.torusSm} material={sm.steth} position={[0, 0.6, 0.02]} rotation={[Math.PI / 2.2, 0, 0]} scale={[0.105, 0.115, 0.1]} />
              <mesh material={sm.steth} position={[0.04, 0.38, 0.16]}><boxGeometry args={[0.012, 0.3, 0.012]} /></mesh>
              <mesh geometry={g.sphere} material={sm.silver} position={[0.04, 0.22, 0.165]} scale={0.026} />
            </>
          )}
          {look.apron && (
            <group>
              <mesh position={[0, 0.28, F ? 0.152 : 0.188]}><boxGeometry args={[0.25, 0.5, 0.012]} /><meshStandardMaterial color={look.apron} roughness={0.8} /></mesh>
              <mesh position={[0, 0.545, F ? 0.14 : 0.176]}><boxGeometry args={[0.15, 0.1, 0.012]} /><meshStandardMaterial color={look.apron} roughness={0.8} /></mesh>
              {[1, -1].map((sd) => <mesh key={sd} position={[sd * 0.065, 0.6, F ? 0.085 : 0.11]} rotation={[0.5, 0, -sd * 0.12]}><boxGeometry args={[0.018, 0.17, 0.008]} /><meshStandardMaterial color={look.apron} roughness={0.8} /></mesh>)}
              {look.apronTrim && <mesh position={[0, 0.045, F ? 0.153 : 0.189]}><boxGeometry args={[0.25, 0.02, 0.014]} /><meshStandardMaterial color={look.apronTrim} roughness={0.6} /></mesh>}
            </group>
          )}
          {look.whistle && (
            <group>
              <mesh geometry={g.torusSm} position={[0, F ? 0.545 : 0.57, F ? 0.07 : 0.06]} rotation={[Math.PI / 2.35, 0, 0]} scale={[0.075, 0.085, 0.09]}><meshStandardMaterial color={look.whistle} roughness={0.5} /></mesh>
              <mesh position={[0.0, F ? 0.45 : 0.475, F ? 0.125 : 0.168]}><boxGeometry args={[0.04, 0.02, 0.025]} /><meshStandardMaterial color={look.whistle} roughness={0.4} metalness={0.3} /></mesh>
            </group>
          )}
          {look.badge && <mesh material={sm.badge} position={[F ? -0.09 : -0.12, 0.34, F ? 0.15 : 0.19]}><boxGeometry args={[0.05, 0.07, 0.006]} /></mesh>}
          {(look.chain || look.pendant) && (
            <>
              <mesh geometry={g.torusSm} material={look.chain === 'silver' ? sm.silver : sm.gold} position={[0, F ? 0.545 : 0.57, F ? 0.07 : 0.06]} rotation={[Math.PI / 2.35, 0, 0]} scale={[0.075, 0.085, 0.09]} />
              {look.pendant && <mesh geometry={g.sphere} material={sm.pendant || sm.gold} position={[0, F ? 0.455 : 0.47, F ? 0.125 : 0.165]} scale={0.014} />}
            </>
          )}
          {/* shoulders */}
          {[1, -1].map((sd) => <mesh key={sd} geometry={g.sphere} material={F && gown ? sm.gown : sleeveless ? sm.skin : sm.coat || topMat} position={[sd * sh, 0.5, 0]} scale={F ? 0.062 : 0.075} />)}

          <group ref={r.head} position={[0, 0.66, 0]}>
            <mesh material={sm.skin} position={[0, 0.02, 0]}><cylinderGeometry args={[F ? 0.04 : 0.05, F ? 0.047 : 0.058, 0.1, 14]} /></mesh>
            <mesh geometry={g.head} material={sm.skin} position={[0, 0.155, 0]} scale={[0.9, 1.07, 0.97]} castShadow />
            <mesh geometry={g.sphere} material={sm.skin} position={[0, 0.085, 0.036]} scale={[0.074, 0.062, 0.07]} />
            {[1, -1].map((sd) => <mesh key={sd} geometry={g.sphere} material={sm.skin} position={[sd * 0.111, 0.15, -0.004]} scale={[0.012, 0.027, 0.02]} />)}
            {/* eyes */}
            {[1, -1].map((sd) => (
              <group key={sd} ref={sd === 1 ? eyeLRef : eyeRRef} position={[sd * 0.045, 0.165, 0.098]}>
                <mesh geometry={g.sphere} material={sm.sclera} scale={[0.027, 0.019, 0.016]} />
                <mesh geometry={g.sphere} material={sm.iris} position={[0, 0, 0.0095]} scale={[0.0165, 0.0165, 0.007]} />
                <mesh geometry={g.sphere} material={sm.pupil} position={[0, 0, 0.0145]} scale={[0.0085, 0.0085, 0.004]} />
                <mesh geometry={g.sphere} material={sm.glint} position={[0.005, 0.006, 0.0175]} scale={[0.0035, 0.0035, 0.002]} />
                <mesh geometry={g.lash} material={sm.lash} position={[0, 0.003, 0.009]} scale={[F ? 1.05 : 0.95, F ? 0.8 : 0.5, 1]} />
                {F && <mesh material={sm.lash} position={[sd * 0.027, 0.012, 0.008]} rotation={[0, 0, sd * 0.5]}><boxGeometry args={[0.014, 0.004, 0.004]} /></mesh>}
                <mesh material={sm.hair} position={[sd * 0.003, 0.034, 0.011]} rotation={[0, 0, sd * (F ? 0.16 : 0.05)]}><boxGeometry args={[0.05, F ? 0.0065 : 0.012, 0.008]} /></mesh>
              </group>
            ))}
            {/* nose */}
            <mesh geometry={g.sphere} material={sm.skin} position={[0, 0.138, 0.119]} scale={[0.0125, 0.017, 0.016]} />
            <mesh geometry={g.sphere} material={sm.skin} position={[0, 0.155, 0.112]} scale={[0.008, 0.02, 0.01]} />
            {/* mouth + lips */}
            <mesh ref={mouthRef} geometry={g.mouthSm} material={sm.mouth} position={[0, 0.098, 0.1]} scale={[1.15, 0.12, 0.5]} />
            <mesh geometry={g.sphere} material={sm.lips} position={[0, 0.1, 0.11]} scale={[F ? 0.024 : 0.022, 0.0085, 0.01]} />
            <mesh ref={lipRef} geometry={g.sphere} material={sm.lips} position={[0, 0.0925, 0.109]} scale={[F ? 0.022 : 0.02, 0.0095, 0.011]} />
            {/* hair */}
            <mesh geometry={g.cap} material={sm.hair} position={[0, 0.162, -0.01]} rotation={[-0.3, 0, 0]} scale={[1, F ? 1.02 : 0.96, 1.02]} castShadow />
            {(F || look.longHair) && !look.hairStyle ? (
              <>
                {/* styled long hair: volume around the head, swept fringe, and a fall behind the shoulders */}
                <mesh geometry={g.sphere} material={sm.hair} position={[0, 0.13, -0.06]} scale={[0.138, 0.175, 0.118]} castShadow />
                <mesh geometry={g.sphere} material={sm.hair} position={[0.03, 0.205, 0.07]} rotation={[0.35, 0, -0.5]} scale={[0.12, 0.034, 0.07]} />
                <mesh geometry={g.sphere} material={sm.hair} position={[-0.075, 0.192, 0.072]} rotation={[0.2, 0, 0.7]} scale={[0.07, 0.032, 0.05]} />
                <mesh geometry={g.capsule(0.1, 0.5)} material={sm.hair} position={[0, -0.14, -0.1]} scale={[1.45, 1, 0.8]} castShadow />
                {[1, -1].map((sd) => <mesh key={sd} geometry={g.sphere} material={sm.hair} position={[sd * 0.122, 0.04, -0.05]} scale={[0.03, 0.15, 0.06]} rotation={[0, 0, sd * 0.05]} />)}
              </>
            ) : (
              <>
                <mesh geometry={g.sphere} material={sm.hair} position={[0, 0.115, -0.092]} scale={[0.122, 0.1, 0.06]} />
                {look.hairStyle === 'bun' && (
                  <>
                    <mesh geometry={g.sphere} material={sm.hair} position={[0, 0.205, -0.1]} scale={0.062} castShadow />
                    <mesh geometry={g.sphere} material={sm.hair} position={[0, 0.17, 0.065]} rotation={[0.3, 0, 0]} scale={[0.115, 0.03, 0.06]} />
                  </>
                )}
                {look.hairStyle === 'afro' && <mesh geometry={g.sphere} material={sm.hair} position={[0, 0.2, -0.02]} scale={[0.165, 0.15, 0.155]} castShadow />}
                {look.hairStyle === 'bob' && (
                  <>
                    <mesh geometry={g.sphere} material={sm.hair} position={[0, 0.1, -0.05]} scale={[0.14, 0.13, 0.12]} castShadow />
                    {[1, -1].map((sd) => <mesh key={sd} geometry={g.sphere} material={sm.hair} position={[sd * 0.118, 0.06, 0.0]} scale={[0.032, 0.09, 0.075]} />)}
                    <mesh geometry={g.sphere} material={sm.hair} position={[0.03, 0.205, 0.07]} rotation={[0.35, 0, -0.5]} scale={[0.12, 0.034, 0.07]} />
                  </>
                )}
              </>
            )}
            {look.glasses && (
              <>
                {[1, -1].map((sd) => <mesh key={'gl' + sd} geometry={g.torusSm} material={sm.glasses} position={[sd * 0.047, 0.165, 0.113]} scale={[0.031, 0.026, 0.03]} />)}
                <mesh material={sm.glasses} position={[0, 0.17, 0.115]}><boxGeometry args={[0.03, 0.006, 0.006]} /></mesh>
                {[1, -1].map((sd) => <mesh key={'ga' + sd} material={sm.glasses} position={[sd * 0.108, 0.168, 0.05]}><boxGeometry args={[0.005, 0.005, 0.12]} /></mesh>)}
              </>
            )}
            {look.beard && (<><mesh geometry={g.beard} material={sm.hair} position={[0, 0.152, 0.004]} scale={[0.9, 1.07, 0.975]} /><mesh material={sm.hair} position={[0, 0.114, 0.113]}><boxGeometry args={[0.05, 0.009, 0.01]} /></mesh></>)}
            <group ref={hatRef} visible={false}>
              <mesh material={m.hat} position={[0, 0.19, -0.005]} castShadow><sphereGeometry args={[0.145, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} /></mesh>
              <mesh material={m.hat} position={[0, 0.2, 0.13]} rotation={[0.1, 0, 0]}><boxGeometry args={[0.2, 0.012, 0.12]} /></mesh>
            </group>
            {look.cap && (
              <group>
                <mesh position={[0, 0.2, -0.005]} castShadow><sphereGeometry args={[0.142, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} /><meshStandardMaterial color={look.cap} roughness={0.7} /></mesh>
                <mesh position={[0, 0.205, 0.13]} rotation={[0.12, 0, 0]}><boxGeometry args={[0.2, 0.012, 0.12]} /><meshStandardMaterial color={look.cap} roughness={0.7} /></mesh>
              </group>
            )}
            {look.chefHat && (
              <group position={[0, 0.2, -0.005]}>
                <mesh castShadow><cylinderGeometry args={[0.125, 0.13, 0.1, 20]} /><meshStandardMaterial color={look.chefHat} roughness={0.8} /></mesh>
                <mesh position={[0, 0.1, 0]} scale={[1, 0.8, 1]}><sphereGeometry args={[0.17, 20, 14]} /><meshStandardMaterial color={look.chefHat} roughness={0.8} /></mesh>
              </group>
            )}
            {look.headset && (
              <group>
                <mesh geometry={g.torusSm} position={[0, 0.17, -0.005]} rotation={[0, Math.PI / 2, 0]} scale={[0.118, 0.118, 0.118]}><meshStandardMaterial color="#111116" roughness={0.4} /></mesh>
                {[1, -1].map((sd) => <mesh key={'hs' + sd} position={[sd * 0.122, 0.13, 0]}><boxGeometry args={[0.03, 0.06, 0.05]} /><meshStandardMaterial color="#111116" roughness={0.4} /></mesh>)}
                <mesh position={[0.105, 0.09, 0.075]} rotation={[0, 0.5, 0.3]}><boxGeometry args={[0.008, 0.008, 0.07]} /><meshStandardMaterial color="#111116" /></mesh>
              </group>
            )}
            {look.hoops && [1, -1].map((sd) => <mesh key={'hp' + sd} geometry={g.torusSm} material={sm.gold} position={[sd * 0.115, 0.115, 0.004]} rotation={[0, Math.PI / 2, 0]} scale={0.026} />)}
            {look.braids && [1, -1].map((sd) => <mesh key={'br' + sd} geometry={g.capsule(0.022, 0.5)} material={sm.hair} position={[sd * 0.1, -0.12, 0.06]} rotation={[0.18, 0, sd * 0.06]} castShadow />)}
            {F && gown && (
              <>
                {/* drop earrings and a necklace */}
                {[1, -1].map((sd) => <mesh key={sd} geometry={g.sphere} material={sm.gold} position={[sd * 0.113, 0.118, 0.004]} scale={0.0085} />)}
              </>
            )}
          </group>

          {/* arms */}
          {[[sh, r.lUA, r.lFA], [-sh, r.rUA, r.rFA]].map(([x, ua, fa], i) => (
            <group key={i} ref={ua} position={[x, 0.5, 0]}>
              <mesh geometry={g.upperArm} material={armMat} position={[0, -0.16, 0]} castShadow />
              <mesh geometry={g.sphere} material={armMat} position={[0, -0.315, 0]} scale={0.045} />
              <group ref={fa} position={[0, -0.32, 0]}>
                <mesh geometry={g.foreArm} material={armMat} position={[0, -0.14, 0]} castShadow />
                {!sleeveless && !sm.coat && <mesh material={sm.shirt} position={[0, -0.275, 0]}><cylinderGeometry args={[0.036, 0.036, 0.035, 12]} /></mesh>}
                {sleeveless && gown && <mesh geometry={g.torusSm} material={sm.gold} position={[0, -0.255, 0]} rotation={[Math.PI / 2, 0, 0]} scale={0.032} />}
                <mesh geometry={g.sphere} material={sm.skin} position={[0, -0.325, 0.004]} scale={[0.036, 0.055, 0.02]} />
                <mesh geometry={g.sphere} material={sm.skin} position={[(i === 0 ? -1 : 1) * 0.03, -0.31, 0.012]} rotation={[0, 0, (i === 0 ? 1 : -1) * 0.5]} scale={[0.011, 0.028, 0.012]} />
              </group>
            </group>
          ))}
        </group>
      </group>
    </group>
  )
}
