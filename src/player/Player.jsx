import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CapsuleCollider, useRapier } from '@react-three/rapier'
import * as THREE from 'three'
import { input } from '../input/input.js'
import { playerState, cameraState, SPAWN, findNearestInteractable } from '../state/runtime.js'
import { useStore } from '../state/store.js'
import { useAssets, registry } from '../assets/assetStore.js'
import Avatar from './Avatar.jsx'
import { outfit } from '../state/jobs.js'
import { outfitLook } from '../config/outfits.js'
import { ImportedAvatar } from '../assets/PlacedAssets.jsx'
import { net, peerData } from '../net/netManager.js'
import { elevator } from '../world/elevator.js'
import { findRidingCar } from '../world/cars.js'
import { ZONES } from '../config/rooms.js'
import { waterAt, addRipple, addSplash } from '../state/water.js'
import { sfx } from '../audio/sfx.js'

const WALK = 3.6
const RUN = 8.6
const JUMP = 6.4
const GRAVITY = 22
const CAPSULE_HALF = 0.5
const CAPSULE_R = 0.35
// Water: you wade until the water is deeper than SWIM_DEPTH, then swim with your shoulders at the surface.
const SWIM = 2.0
const SWIM_FAST = 3.5
const SWIM_DEPTH = 1.5 // start swimming at this depth …
const WADE_DEPTH = 1.3 // … and go back to wading below this one (hysteresis, so the edge of the ramp doesn't flicker)
const FLOAT = 1.36 // feet this far under the surface while swimming (shoulders just above the water)
const REACH = 1.45 // how close to the pool wall you must be to climb out
const EYE = 1.5 // the head is under water when the feet are this far below the surface
const BREATH_SECS = 22 // seconds you can stay under on one breath; a lifeguard brings you out at zero
const DIVE_V = 1.7 // swim-down speed (m/s)
const UP_V = 1.9 // swim-up speed (m/s)

// Third-person character: Rapier kinematic character controller (slopes, steps/curbs,
// snap-to-ground, sliding along walls) plus camera-relative movement.
/** Is a remote visitor sitting on this seat? */
function seatTakenByOther(seat) {
  for (const pd of peerData.values()) {
    if (!pd.sit || !pd.to) continue
    if (Math.hypot(pd.to[0] - seat.position[0], pd.to[2] - seat.position[2]) < 0.35 && Math.abs(pd.to[1] - seat.floorY) < 0.6) return true
  }
  return false
}

/**
 * Where to stand up: in front of the seat if that spot is free, otherwise further out, to the
 * sides, or behind. Each candidate is tested with the avatar's own capsule so it never ends up
 * inside a table, another chair or a wall.
 */
function safeStandSpot(seat, world, rapier, col) {
  const fx = Math.sin(seat.yaw), fz = Math.cos(seat.yaw)
  const rx = Math.cos(seat.yaw), rz = -Math.sin(seat.yaw)
  const tries = [...(seat.stand ? [seat.stand] : []), [0.75, 0], [0.95, 0], [0.6, 0], [0.75, 0.8], [0.75, -0.8], [0, 0.9], [0, -0.9], [1.3, 0], [-0.9, 0]]
  const shape = new rapier.Capsule(CAPSULE_HALF, CAPSULE_R)
  const rot = { x: 0, y: 0, z: 0, w: 1 }
  for (const t of tries) {
    const p = Array.isArray(t) && t.length === 3 ? { x: t[0], y: t[1], z: t[2] } : { x: seat.position[0] + fx * t[0] + rx * t[1], y: seat.floorY + 0.05, z: seat.position[2] + fz * t[0] + rz * t[1] }
    const center = { x: p.x, y: p.y + CAPSULE_HALF + CAPSULE_R + 0.03, z: p.z }
    const hit = world.intersectionWithShape(center, rot, shape, undefined, undefined, undefined, undefined, (c) => c.handle !== col.handle && !c.isSensor())
    if (!hit) return p
  }
  return { x: seat.position[0] + fx * 0.75, y: seat.floorY + 0.05, z: seat.position[2] + fz * 0.75 }
}

/** Building entrances and room spawns double as recovery checkpoints. */
function nearestCheckpoint(p) {
  let best = [SPAWN.x, SPAWN.y, SPAWN.z], bd = Infinity
  for (const z of ZONES) {
    const d = Math.hypot(z.spawn[0] - p.x, z.spawn[1] - p.y, z.spawn[2] - p.z)
    if (d < bd) { bd = d; best = z.spawn }
  }
  const d0 = Math.hypot(SPAWN.x - p.x, SPAWN.z - p.z)
  return d0 < bd ? [SPAWN.x, SPAWN.y, SPAWN.z] : best
}

/** A spot near `p` where the avatar's capsule fits and there is floor underneath. */
function freeSpotNear(p, world, rapier, col) {
  const shape = new rapier.Capsule(CAPSULE_HALF, CAPSULE_R)
  const rot = { x: 0, y: 0, z: 0, w: 1 }
  const skip = (c) => c.handle !== col.handle && !c.isSensor()
  for (const r of [0, 0.6, 1.2, 2, 3, 4.5]) {
    for (let k = 0; k < (r ? 12 : 1); k++) {
      const a = (k / 12) * Math.PI * 2
      const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r
      const hit = world.castRay(new rapier.Ray({ x, y: p.y + 1.5, z }, { x: 0, y: -1, z: 0 }), 4, true, undefined, undefined, undefined, undefined, skip)
      if (!hit) continue
      const y = p.y + 1.5 - hit.timeOfImpact
      if (y - p.y > 0.3 || p.y - y > 1.6) continue // not on top of furniture, not down a stairwell
      const center = { x, y: y + CAPSULE_HALF + CAPSULE_R + 0.05, z }
      if (!world.intersectionWithShape(center, rot, shape, undefined, undefined, undefined, undefined, skip)) return [x, y, z]
    }
  }
  return null
}


/** Y of the first solid thing under (x, y, z), or null. */
function floorBelow(world, rapier, x, y, z, col, maxd = 8) {
  const hit = world.castRay(new rapier.Ray({ x, y, z }, { x: 0, y: -1, z: 0 }), maxd, true, undefined, undefined, undefined, undefined, (c) => c.handle !== col.handle && !c.isSensor())
  return hit ? y - hit.timeOfImpact : null
}

/**
 * Where a swimmer at `p` can climb out of water volume `v`: the nearest wall (or ladder) within REACH,
 * with a landing spot on the deck beyond the coping that the avatar's capsule fits in. Null if none.
 */
function climbTarget(v, p, world, rapier, col, reach = REACH) {
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
  const out = v.rim + 0.75
  const zc = clamp(p.z, v.z0 + 0.6, v.z1 - 0.6), xc = clamp(p.x, v.x0 + 0.6, v.x1 - 0.6)
  const cands = [
    { d: p.x - v.x0, hold: [v.x0 + 0.42, p.z], to: [v.x0 - out, zc], yaw: -Math.PI / 2 },
    { d: v.x1 - p.x, hold: [v.x1 - 0.42, p.z], to: [v.x1 + out, zc], yaw: Math.PI / 2 },
    { d: p.z - v.z0, hold: [p.x, v.z0 + 0.42], to: [xc, v.z0 - out], yaw: Math.PI },
    { d: v.z1 - p.z, hold: [p.x, v.z1 - 0.42], to: [xc, v.z1 + out], yaw: 0 },
  ]
  for (const l of v.ladders || []) {
    const d = Math.hypot(p.x - l.x, p.z - l.z) * 0.6 // a ladder within ~2.4 m wins over the bare wall
    cands.push({ d, hold: [l.x, l.z], to: [l.x, l.z + (l.z < (v.z0 + v.z1) / 2 ? -out : out)], yaw: l.z < (v.z0 + v.z1) / 2 ? Math.PI : 0, ladder: true })
  }
  cands.sort((a, b) => a.d - b.d)
  const shape = new rapier.Capsule(CAPSULE_HALF, CAPSULE_R)
  const rot = { x: 0, y: 0, z: 0, w: 1 }
  for (const c of cands) {
    if (c.d > reach) break
    const center = { x: c.to[0], y: v.deck + 0.06 + CAPSULE_HALF + CAPSULE_R, z: c.to[1] }
    const hit = world.intersectionWithShape(center, rot, shape, undefined, undefined, undefined, undefined, (o) => o.handle !== col.handle && !o.isSensor())
    if (!hit) return { hold: c.hold, to: c.to, yaw: c.yaw, ladder: !!c.ladder }
  }
  return null
}

/** The unit direction pointing away from the pool wall if one is within `d` metres of the swimmer's centre, else null. */
function wallPush(v, p, d = 0.7) {
  const a = [[p.x - v.x0, 1, 0], [v.x1 - p.x, -1, 0], [p.z - v.z0, 0, 1], [v.z1 - p.z, 0, -1]].sort((m, n) => m[0] - n[0])[0]
  return a[0] < d ? [a[1], a[2]] : null
}

export default function Player() {
  const body = useRef()
  const collider = useRef()
  const visual = useRef()
  const controller = useRef()
  const { world, rapier } = useRapier()
  const sitAnim = useRef(null)
  const lastSafe = useRef(SPAWN.clone())
  const profile = useStore((s) => s.profile)
  const avatarStyle = useStore((s) => s.settings.avatarStyle)
  const socialLook = useMemo(() => (avatarStyle === 'social' ? { social: true, build: profile.build || 'm', longHair: (profile.build || 'm') === 'f', hair: profile.hair || '#14090d', eyes: profile.eyes || '#4a2f1c', noVisor: true, ...outfitLook(profile.preset, profile.build || 'm') } : null), [avatarStyle, profile.build, profile.hair, profile.eyes, profile.preset])
  const phase = useStore((s) => s.phase)
  const avatarCfg = useAssets((s) => s.avatar)
  const v = useRef(new THREE.Vector3())
  const lastPrompt = useRef(null)

  useEffect(() => {
    const c = world.createCharacterController(0.04)
    // 0.3 m: climbs curbs (0.15) and stair/aisle steps (≤0.18) but never onto sofa seats,
    // chairs or coffee tables (all ≥0.44 m), so the avatar can't end up standing in furniture
    c.enableAutostep(0.3, 0.25, false)
    c.enableSnapToGround(0.35)
    c.setMaxSlopeClimbAngle((50 * Math.PI) / 180)
    c.setMinSlopeSlideAngle((60 * Math.PI) / 180)
    c.setApplyImpulsesToDynamicBodies(true)
    c.setCharacterMass(70)
    controller.current = c
    return () => world.removeCharacterController(c)
  }, [world])

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 30)
    const b = body.current
    const col = collider.current
    const c = controller.current
    if (!b || !col || !c) return
    playerState.colliderHandle = col.handle

    const playing = useStore.getState().phase === 'playing'
    const panelOpen = !!useStore.getState().panel

    // ---------- driving: the avatar rides in the vehicle (Vehicle.jsx moves playerState.position) ----------
    if (playerState.vehicle) {
      if (visual.current) visual.current.visible = false
      b.setNextKinematicTranslation(playerState.position)
      const wantOut = input.interact && !panelOpen
      input.interact = false
      input.jump = false
      if (wantOut) playerState.vehicle.exit()
      if (playerState.vehicle) {
        if (lastPrompt.current !== 'exit-vehicle') {
          lastPrompt.current = 'exit-vehicle'
          useStore.getState().setPrompt({ id: 'exit-vehicle', label: 'Get out' })
        }
        return
      }
    }
    if (visual.current) visual.current.visible = useStore.getState().phase === 'playing' && !playerState.hideAvatar

    // ---------- sitting ----------
    if (playerState.sitRequest) {
      const seat = playerState.sitRequest
      playerState.sitRequest = null
      if (!seat.occupiedBy && !playerState.seated && !seatTakenByOther(seat)) {
        seat.occupiedBy = 'me'
        playerState.seated = seat
        const p0 = b.translation()
        sitAnim.current = { from: { x: p0.x, y: p0.y, z: p0.z }, t: 0 }
        playerState.sit = seat.noSit ? 0 : 1
        playerState.sitHeight = seat.height
        playerState.workout = seat.workout || null
        playerState.emote = null
        v.current.set(0, 0, 0)
      }
    }
    if (playerState.seated) {
      const seat = playerState.seated
      // a workout station can also be left with Space or by walking away (after the glide into position)
      const moveOut = seat.workout && sitAnim.current && sitAnim.current.t >= 1 && Math.hypot(input.move.x, input.move.y) > 0.6
      const wantStand = (input.interact || (seat.workout && input.jump) || moveOut) && !panelOpen
      input.interact = false
      input.jump = false
      if (wantStand || playerState.respawn || playerState.teleport) {
        // stand up in front of the seat
        seat.occupiedBy = null
        playerState.seated = null
        playerState.sit = 0
        playerState.workout = null
        const out = safeStandSpot(seat, world, rapier, col)
        if (!playerState.respawn && !playerState.teleport) { b.setNextKinematicTranslation(out); playerState.position.set(out.x, out.y, out.z) }
        useStore.getState().setPrompt(null)
        lastPrompt.current = null
        v.current.set(0, 0, 0)
        // the stand-up move takes effect on the next physics step: don't let this frame's normal
        // movement (which still reads the seated position) overwrite it
        if (!playerState.respawn && !playerState.teleport) return
      } else {
        // glide into the seat over ~0.35 s while the pose blends from standing to sitting
        const target = { x: seat.position[0], y: seat.floorY, z: seat.position[2] }
        let at = target
        const sa = sitAnim.current
        if (sa && sa.t < 1) {
          sa.t = Math.min(1, sa.t + dt / 0.35)
          const e = sa.t * sa.t * (3 - 2 * sa.t)
          at = { x: sa.from.x + (target.x - sa.from.x) * e, y: sa.from.y + (target.y - sa.from.y) * e, z: sa.from.z + (target.z - sa.from.z) * e }
        }
        b.setNextKinematicTranslation(at)
        playerState.position.set(at.x, at.y, at.z)
        playerState.speed = 0
        playerState.grounded = true
        let d = seat.yaw - playerState.yaw
        d = Math.atan2(Math.sin(d), Math.cos(d))
        playerState.yaw += d * (1 - Math.exp(-14 * dt))
        if (visual.current) visual.current.rotation.y = playerState.yaw
        if (lastPrompt.current !== 'stand') {
          lastPrompt.current = 'stand'
          useStore.getState().setPrompt({ id: 'stand', label: seat.workout ? 'Stop workout' : 'Stand up' })
        }
        return
      }
    }

    // ---------- climbing out of the water: swim to the wall, haul up over the coping, step onto the deck ----------
    if (playerState.climb) {
      const cl = playerState.climb
      if (playerState.respawn || playerState.teleport) { playerState.climb = null }
      else {
        cl.t = Math.min(1, cl.t + dt / cl.dur)
        const S = (x) => x * x * (3 - 2 * x)
        const t = cl.t
        const deckY = cl.deck
        let x, y, z
        if (t < 0.3) { const e = S(t / 0.3); x = cl.from.x + (cl.hold[0] - cl.from.x) * e; z = cl.from.z + (cl.hold[1] - cl.from.z) * e; y = cl.from.y + 0.1 * e }
        else if (t < 0.75) { const e = S((t - 0.3) / 0.45); x = cl.hold[0]; z = cl.hold[1]; y = cl.from.y + 0.1 + (deckY - cl.from.y - 0.1) * e }
        else { const e = S((t - 0.75) / 0.25); x = cl.hold[0] + (cl.to[0] - cl.hold[0]) * e; z = cl.hold[1] + (cl.to[1] - cl.hold[1]) * e; y = deckY }
        b.setNextKinematicTranslation({ x, y, z })
        playerState.position.set(x, y, z)
        playerState.speed = 0
        playerState.grounded = false
        playerState.swim = 'swim'
        let d = cl.yaw - playerState.yaw
        d = Math.atan2(Math.sin(d), Math.cos(d))
        playerState.yaw += d * (1 - Math.exp(-10 * dt))
        if (visual.current) visual.current.rotation.y = playerState.yaw
        input.jump = false; input.interact = false
        if (t >= 1) {
          playerState.climb = null; playerState.swim = null; playerState.grounded = true; playerState.vy = -1
          v.current.set(0, 0, 0)
          addRipple(cl.hold[0], cl.hold[1], state.clock.elapsedTime, 0.04)
        }
        if (lastPrompt.current) { lastPrompt.current = null; useStore.getState().setPrompt(null) }
        return
      }
    }

    // ---------- water: wade in the shallows, swim in the deep ----------
    let mode = null
    let water = null
    if (!playerState.vehicle) {
      const pw = b.translation()
      water = waterAt(pw.x, pw.z)
      if (water) {
        const surf = water.surf
        const fy = floorBelow(world, rapier, pw.x, surf + 0.3, pw.z, col)
        const depth = surf - (fy ?? surf - 6)
        playerState.waterDepth = depth
        if (pw.y < surf - 0.04) mode = (playerState.swim === 'swim' ? depth >= WADE_DEPTH : depth >= SWIM_DEPTH) ? 'swim' : 'wade'
        if (mode && !playerState.swim && playerState.vy < -1.5) {
          const power = Math.min(1, -playerState.vy / 9 + (playerState.diveAir ? 0.25 : 0))
          addSplash(pw.x, surf, pw.z, state.clock.elapsedTime, power)
          sfx.splash(power)
        } else if (mode && !playerState.swim) addRipple(pw.x, pw.z, state.clock.elapsedTime, 0.03)
        if (mode) playerState.diveAir = false
      }
    }
    playerState.swim = mode
    // ---------- breath: the head under the surface uses it up, coming up refills it; at zero a lifeguard helps you out ----------
    {
      const pw = b.translation()
      const hu = mode === 'swim' && !!water && pw.y + EYE < water.surf
      if (hu !== playerState.headUnder) {
        if (hu) sfx.bubbles()
        else if (playerState.breath < 0.65) sfx.gasp()
        playerState.headUnder = hu
      }
      if (hu) {
        playerState.breath = Math.max(0, playerState.breath - dt / BREATH_SECS)
        playerState._bubT = (playerState._bubT || 0) + dt
        if (playerState._bubT > 2.2) { playerState._bubT = 0; sfx.bubbles() }
        if (playerState.breath <= 0 && !playerState.climb) {
          const rescue = climbTarget(water, pw, world, rapier, col, 99)
          const to = rescue ? rescue.to : [water.x0 - 1.2, water.z0 + (water.z1 - water.z0) / 2]
          playerState.teleport = [to[0], water.deck + 0.05, to[1]]
          playerState.breath = 1
          playerState.rescuedAt = state.clock.elapsedTime
          sfx.whistle()
          addSplash(pw.x, water.surf, pw.z, state.clock.elapsedTime, 0.5)
          useStore.getState().showToast('Whistle! The lifeguard pulled you out of the water. Catch your breath, then dive again when you are ready.')
        }
      } else playerState.breath = Math.min(1, playerState.breath + dt * (mode === 'swim' ? 0.5 : 1))
    }
    // leaping head-first: C / Ctrl in the air; the diving board's launch also lands here
    if (playerState.launch) {
      const L = playerState.launch
      playerState.launch = null
      v.current.set(L.vx, 0, L.vz)
      playerState.vy = L.vy
      playerState.grounded = false
      playerState.yaw = L.yaw
      playerState.diveAir = true
      playerState.emote = null
    }
    if (!mode && !playerState.grounded && playing && input.dive && !playerState.vehicle) playerState.diveAir = true
    if (playerState.grounded && !mode) playerState.diveAir = false
    if (!mode && playerState.vy < 0 && !playerState.grounded && water) playerState.vy = Math.max(playerState.vy, -12)

    // --- desired horizontal velocity, relative to camera yaw ---
    const yaw = cameraState.yaw
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw)
    const rx = Math.cos(yaw), rz = -Math.sin(yaw)
    let mx = 0, my = 0
    if (playing && !panelOpen) { mx = input.move.x; my = input.move.y }
    const mag = Math.min(1, Math.hypot(mx, my))
    const baseSpeed = mode === 'swim' ? (input.run ? SWIM_FAST : SWIM) : mode === 'wade' ? (input.run ? RUN * 0.55 : WALK * 0.72) : (input.run ? RUN : WALK)
    const speed = baseSpeed * (input.joystick.active ? Math.min(1, mag * 1.15) : mag)
    let dx = fx * my + rx * mx
    let dz = fz * my + rz * mx
    const dl = Math.hypot(dx, dz)
    if (dl > 0) { dx /= dl; dz /= dl }
    const target = new THREE.Vector3(dx * speed, 0, dz * speed)
    const accel = mode === 'swim' ? 5 : playerState.grounded ? 14 : playerState.diveAir ? 0.7 : 4
    v.current.x += (target.x - v.current.x) * (1 - Math.exp(-accel * dt))
    v.current.z += (target.z - v.current.z) * (1 - Math.exp(-accel * dt))

    // --- vertical ---
    // climb-out check: near a wall at the surface, Space or E hauls you out (the prompt appears too). Underwater next to a
    // wall, Space is a push-off instead: a kick away from the wall, like a tumble turn.
    let climb = null
    let nearSurface = false
    if (mode === 'swim') {
      const pw = b.translation()
      nearSurface = pw.y > water.surf - FLOAT - 0.45
      if (playing && !panelOpen && nearSurface) {
        climb = climbTarget(water, pw, world, rapier, col)
        if (climb && (input.jump || input.interact)) {
          input.jump = false; input.interact = false
          playerState.climb = { t: 0, dur: 1.35, from: { x: pw.x, y: pw.y, z: pw.z }, hold: climb.hold, to: climb.to, yaw: climb.yaw, deck: water.deck }
          v.current.set(0, 0, 0)
          return
        }
      }
      if (playing && !panelOpen && !nearSurface && input.jump) {
        const dir = wallPush(water, pw)
        if (dir) { v.current.x = dir[0] * 4.2; v.current.z = dir[1] * 4.2; sfx.splash(0.25); addRipple(pw.x, pw.z, state.clock.elapsedTime, 0.03) }
      }
    }
    if (mode === 'swim') {
      // 3D swimming: hold Space to rise, C / Ctrl to dive; let go underwater and buoyancy carries you up. A plunge from a
      // jump or dive keeps its downward momentum and fades over about a second.
      const pw = b.translation()
      const surfY = water.surf - FLOAT
      const bob = Math.sin(state.clock.elapsedTime * 1.7) * 0.025
      const down = playing && !panelOpen && input.dive
      const up = playing && !panelOpen && input.up
      const atSurface = pw.y >= surfY - 0.02
      let vt
      if (down) vt = -DIVE_V
      else if (atSurface) vt = (surfY + bob - pw.y) * 5
      else if (up) vt = UP_V
      else vt = Math.min(0.9, 0.35 + (surfY - pw.y) * 1.4)
      playerState.vy += (vt - playerState.vy) * (1 - Math.exp(-3.5 * dt))
      playerState.vy = THREE.MathUtils.clamp(playerState.vy, -9, 4)
      playerState.vdir = down ? 1 : (!atSurface && playerState.vy > 0.5 ? -1 : 0)
      playerState.grounded = false
      input.jump = false
    } else if (playerState.grounded) {
      playerState.vdir = 0
      playerState.vy = -1
      if (playing && !panelOpen && input.jump) { playerState.vy = mode === 'wade' ? JUMP * 0.7 : JUMP; playerState.grounded = false; input.jump = false }
    } else {
      playerState.vdir = 0
      playerState.vy -= GRAVITY * (mode === 'wade' ? 0.6 : 1) * dt
    }

    // riding the elevator: the car carries you; its floor is excluded from the collision query
    // (the Plaza has its own car; every other elevator is a generic car from world/cars.js)
    const ridingCar = elevator.contains(playerState.position) ? elevator : findRidingCar(playerState.position)
    const riding = !!ridingCar
    if (riding) { playerState.vy = 0; input.jump = false }
    const desired = { x: v.current.x * dt, y: riding ? 0 : playerState.vy * dt, z: v.current.z * dt }
    c.computeColliderMovement(col, desired, undefined, undefined, riding ? (other) => !ridingCar.carHandles.has(other.handle) : undefined)
    const m = c.computedMovement()
    const grounded = riding || c.computedGrounded()
    const p = b.translation()
    const next = { x: p.x + m.x, y: riding ? ridingCar.y : p.y + m.y, z: p.z + m.z }
    // hit head on ceiling
    if (playerState.vy > 0 && m.y < desired.y * 0.5) playerState.vy = 0
    playerState.grounded = mode === 'swim' ? false : grounded && playerState.vy <= 0.01

    // remember the last safe place we stood (recovery checkpoint)
    if (grounded && next.y > -1 && Math.abs(next.x) < 126 && Math.abs(next.z) < 126) lastSafe.current.set(next.x, next.y, next.z)
    // fell out of the world: back to the nearest checkpoint (a building entrance or the last safe spot)
    if (next.y < -12) {
      const s = nearestCheckpoint(lastSafe.current)
      next.x = s[0]; next.y = s[1] + 0.3; next.z = s[2]; v.current.set(0, 0, 0)
      useStore.getState().showToast('You fell out of the world and were brought back to safety.')
    }
    if (playerState.respawn) {
      playerState.respawn = false
      next.x = SPAWN.x; next.y = SPAWN.y + 1; next.z = SPAWN.z; v.current.set(0, 0, 0); playerState.swim = null; playerState.breath = 1; playerState.headUnder = false; playerState.diveAir = false
    }
    // "Unstuck": the nearest free spot around you, else the nearest checkpoint
    if (playerState.unstuck) {
      playerState.unstuck = false
      const s = freeSpotNear(next, world, rapier, col) || nearestCheckpoint(next)
      next.x = s[0]; next.y = s[1] + 0.1; next.z = s[2]; v.current.set(0, 0, 0)
      useStore.getState().showToast('Moved you to a clear spot nearby.')
    }
    if (playerState.teleport) {
      ;[next.x, next.y, next.z] = playerState.teleport
      playerState.teleport = null
      v.current.set(0, 0, 0)
    }
    b.setNextKinematicTranslation(next)

    // actual speed (after collisions) drives animation
    const actual = Math.hypot(m.x, m.z) / Math.max(dt, 1e-4)
    playerState.speed = THREE.MathUtils.lerp(playerState.speed, actual, 0.35)
    playerState.position.set(next.x, next.y, next.z)
    if (mode && actual > 0.5) {
      const nowT = state.clock.elapsedTime
      if (nowT - (playerState.rippleT || 0) > (mode === 'swim' ? 0.28 : 0.4)) { playerState.rippleT = nowT; if (mode === 'swim' && Math.random() < 0.3) sfx.stroke(); addRipple(next.x, next.z, nowT, mode === 'swim' ? 0.028 : 0.018) }
    }

    // face movement direction
    if (target.lengthSq() > 0.01) {
      const want = Math.atan2(dx, dz)
      let d = want - playerState.yaw
      d = Math.atan2(Math.sin(d), Math.cos(d))
      playerState.yaw += d * (1 - Math.exp(-12 * dt))
    }
    if (visual.current) visual.current.rotation.y = playerState.yaw

    // emotes
    if (input.emote) {
      playerState.emote = input.emote
      playerState.emoteUntil = state.clock.elapsedTime + 2.4
      net.sendEmote(input.emote)
      input.emote = null
    }
    if (playerState.emote && (state.clock.elapsedTime > playerState.emoteUntil || playerState.speed > 1)) playerState.emote = null

    // performance gestures (clap/bow/point from the Performance panel): one-shot, auto-clears
    if (playerState.gesture && state.clock.elapsedTime > playerState.gestureUntil) playerState.gesture = null

    // interactions
    const near = climb ? { id: 'climb-out', def: { label: climb.ladder ? 'Climb the ladder out' : 'Climb out of the pool', onInteract: () => {} } } : playing ? findNearestInteractable(playerState.position, !!mode) : null
    const label = near ? (typeof near.def.label === 'function' ? near.def.label() : near.def.label) : null
    const key = near ? near.id + label : null
    if (key !== lastPrompt.current) {
      lastPrompt.current = key
      useStore.getState().setPrompt(near ? { id: near.id, label } : null)
    }
    if (input.interact) {
      input.interact = false
      if (near && !panelOpen) near.def.onInteract()
    }
  })

  const useImported = avatarCfg && registry.has(avatarCfg.assetId)
  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={SPAWN.toArray()} enabledRotations={[false, false, false]}>
      <CapsuleCollider ref={collider} args={[CAPSULE_HALF, CAPSULE_R]} position={[0, CAPSULE_HALF + CAPSULE_R, 0]} />
      {/* small cosmetic lift: the rig's feet sit a few cm below its own root in both poses (confirmed
          live - feet visibly sink into the street), and this is purely visual (it never touches
          playerState.position, so seats/vehicles/interactable ranges are unaffected) */}
      <group ref={visual} position={[0, 0.035, 0]} rotation={[0, playerState.yaw, 0]} visible={phase === 'playing'}>
        {useImported ? (
          <ImportedAvatar assetId={avatarCfg.assetId} facing={avatarCfg.facing} state={playerState} />
        ) : (
          <Avatar state={playerState} accent={profile.accent} skin={profile.skin} outfit={outfit} look={socialLook} />
        )}
      </group>
    </RigidBody>
  )
}
