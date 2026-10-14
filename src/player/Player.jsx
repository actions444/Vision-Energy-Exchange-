import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CapsuleCollider, useRapier } from '@react-three/rapier'
import * as THREE from 'three'
import { input } from '../input/input.js'
import { playerState, cameraState, SPAWN, findNearestInteractable } from '../state/runtime.js'
import { useStore } from '../state/store.js'
import { useAssets, registry } from '../assets/assetStore.js'
import Avatar from './Avatar.jsx'
import { ImportedAvatar } from '../assets/PlacedAssets.jsx'
import { net, peerData } from '../net/netManager.js'
import { elevator } from '../world/elevator.js'

const WALK = 2.6
const RUN = 6.2
const JUMP = 6.4
const GRAVITY = 22
const CAPSULE_HALF = 0.5
const CAPSULE_R = 0.35

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

export default function Player() {
  const body = useRef()
  const collider = useRef()
  const visual = useRef()
  const controller = useRef()
  const { world, rapier } = useRapier()
  const sitAnim = useRef(null)
  const profile = useStore((s) => s.profile)
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
    if (visual.current) visual.current.visible = useStore.getState().phase === 'playing'

    // ---------- sitting ----------
    if (playerState.sitRequest) {
      const seat = playerState.sitRequest
      playerState.sitRequest = null
      if (!seat.occupiedBy && !playerState.seated && !seatTakenByOther(seat)) {
        seat.occupiedBy = 'me'
        playerState.seated = seat
        const p0 = b.translation()
        sitAnim.current = { from: { x: p0.x, y: p0.y, z: p0.z }, t: 0 }
        playerState.sit = 1
        playerState.sitHeight = seat.height
        playerState.emote = null
        v.current.set(0, 0, 0)
      }
    }
    if (playerState.seated) {
      const seat = playerState.seated
      const wantStand = input.interact && !panelOpen
      input.interact = false
      input.jump = false
      if (wantStand || playerState.respawn || playerState.teleport) {
        // stand up in front of the seat
        seat.occupiedBy = null
        playerState.seated = null
        playerState.sit = 0
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
          useStore.getState().setPrompt({ id: 'stand', label: 'Stand up' })
        }
        return
      }
    }

    // --- desired horizontal velocity, relative to camera yaw ---
    const yaw = cameraState.yaw
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw)
    const rx = Math.cos(yaw), rz = -Math.sin(yaw)
    let mx = 0, my = 0
    if (playing && !panelOpen) { mx = input.move.x; my = input.move.y }
    const mag = Math.min(1, Math.hypot(mx, my))
    const speed = (input.run ? RUN : WALK) * (input.joystick.active ? Math.min(1, mag * 1.15) : mag)
    let dx = fx * my + rx * mx
    let dz = fz * my + rz * mx
    const dl = Math.hypot(dx, dz)
    if (dl > 0) { dx /= dl; dz /= dl }
    const target = new THREE.Vector3(dx * speed, 0, dz * speed)
    const accel = playerState.grounded ? 14 : 4
    v.current.x += (target.x - v.current.x) * (1 - Math.exp(-accel * dt))
    v.current.z += (target.z - v.current.z) * (1 - Math.exp(-accel * dt))

    // --- vertical ---
    if (playerState.grounded) {
      playerState.vy = -1
      if (playing && !panelOpen && input.jump) { playerState.vy = JUMP; playerState.grounded = false; input.jump = false }
    } else {
      playerState.vy -= GRAVITY * dt
    }

    // riding the elevator: the car carries you; its floor is excluded from the collision query
    const riding = elevator.contains(playerState.position)
    if (riding) { playerState.vy = 0; input.jump = false }
    const desired = { x: v.current.x * dt, y: riding ? 0 : playerState.vy * dt, z: v.current.z * dt }
    c.computeColliderMovement(col, desired, undefined, undefined, riding ? (other) => !elevator.carHandles.has(other.handle) : undefined)
    const m = c.computedMovement()
    const grounded = riding || c.computedGrounded()
    const p = b.translation()
    const next = { x: p.x + m.x, y: riding ? elevator.y : p.y + m.y, z: p.z + m.z }
    // hit head on ceiling
    if (playerState.vy > 0 && m.y < desired.y * 0.5) playerState.vy = 0
    playerState.grounded = grounded && playerState.vy <= 0.01

    // fell out of the world
    if (next.y < -25 || playerState.respawn) {
      playerState.respawn = false
      next.x = SPAWN.x; next.y = SPAWN.y + 1; next.z = SPAWN.z; v.current.set(0, 0, 0)
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

    // interactions
    const near = playing ? findNearestInteractable(playerState.position) : null
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
      <group ref={visual} rotation={[0, playerState.yaw, 0]} visible={phase === 'playing'}>
        {useImported ? (
          <ImportedAvatar assetId={avatarCfg.assetId} facing={avatarCfg.facing} state={playerState} />
        ) : (
          <Avatar state={playerState} accent={profile.accent} skin={profile.skin} />
        )}
      </group>
    </RigidBody>
  )
}
