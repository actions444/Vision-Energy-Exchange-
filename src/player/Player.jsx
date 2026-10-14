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
import { net } from '../net/netManager.js'
import { elevator } from '../world/elevator.js'

const WALK = 2.6
const RUN = 6.2
const JUMP = 6.4
const GRAVITY = 22
const CAPSULE_HALF = 0.5
const CAPSULE_R = 0.35

// Third-person character: Rapier kinematic character controller (slopes, steps/curbs,
// snap-to-ground, sliding along walls) plus camera-relative movement.
export default function Player() {
  const body = useRef()
  const collider = useRef()
  const visual = useRef()
  const controller = useRef()
  const { world } = useRapier()
  const profile = useStore((s) => s.profile)
  const phase = useStore((s) => s.phase)
  const avatarCfg = useAssets((s) => s.avatar)
  const v = useRef(new THREE.Vector3())
  const lastPrompt = useRef(null)

  useEffect(() => {
    const c = world.createCharacterController(0.04)
    c.enableAutostep(0.4, 0.25, true)
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
      if (!seat.occupiedBy && !playerState.seated) {
        seat.occupiedBy = 'me'
        playerState.seated = seat
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
        const fx = Math.sin(seat.yaw), fz = Math.cos(seat.yaw)
        const out = { x: seat.position[0] + fx * 0.75, y: seat.floorY + 0.05, z: seat.position[2] + fz * 0.75 }
        if (!playerState.respawn && !playerState.teleport) { b.setNextKinematicTranslation(out); playerState.position.set(out.x, out.y, out.z) }
        useStore.getState().setPrompt(null)
        lastPrompt.current = null
      } else {
        const at = { x: seat.position[0], y: seat.floorY, z: seat.position[2] }
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
