import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CapsuleCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { useNPCSystem } from './npcSystem.js'
import { playerState } from '../state/runtime.js'
import Avatar from '../player/Avatar.jsx'
import { groundAt, nearestStandable, STEP_OK } from './walkGrid.js'

const WALK_SPEED = 2.5
const BEHAVIOR_CHANGE_INTERVAL = 8 // seconds

function createNameTexture(name) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Text
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 32px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(name, canvas.width / 2, canvas.height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearFilter
  return texture
}

function NPCInstance({ npc }) {
  const groupRef = useRef()
  const turnRef = useRef()
  const body = useRef()
  // Stand on real ground: snap the spawn point to the nearest walkable spot (never a road, wall or water).
  const spot = useMemo(() => nearestStandable(npc.position.x, npc.position.z), [npc])
  if (spot) { npc.position.x = spot.x; npc.position.z = spot.z }
  const ground = useRef(spot ? spot.y : 0.15)
  // What the avatar reads every frame: on the ground (so no falling pose), and how fast it moves.
  const pose = useMemo(() => ({ grounded: true, speed: 0 }), [])
  const nameTex = useMemo(() => createNameTexture(npc.name), [npc.name])
  const npcStateRef = useRef({
    behavior: npc.behavior,
    targetPos: npc.targetPos,
    walkDir: { x: 0, z: 0 },
    animTime: npc.animTime,
    lastBehaviorChange: 0,
  })

  const behaviors = ['standing', 'walking', 'idle']

  useFrame((state, dt) => {
    if (!groupRef.current) return
    dt = Math.min(dt, 0.1)
    const npcState = npcStateRef.current
    npcState.animTime += dt
    npcState.lastBehaviorChange += dt

    // Randomly change behavior
    if (npcState.lastBehaviorChange > BEHAVIOR_CHANGE_INTERVAL) {
      const newBehavior = behaviors[Math.floor(Math.random() * behaviors.length)]
      npcState.behavior = newBehavior
      npcState.lastBehaviorChange = 0

      if (newBehavior === 'walking') {
        const angle = Math.random() * Math.PI * 2
        npcState.walkDir = { x: Math.cos(angle), z: Math.sin(angle) }
      }
    }

    // Walk only onto ground people can stand on, without a step too high; otherwise stop and turn away.
    let moving = false
    if (npcState.behavior === 'walking') {
      const nx = npc.position.x + npcState.walkDir.x * WALK_SPEED * dt
      const nz = npc.position.z + npcState.walkDir.z * WALK_SPEED * dt
      // look a little ahead so they turn before reaching a wall or kerb
      const ahead = groundAt(nx + npcState.walkDir.x * 0.6, nz + npcState.walkDir.z * 0.6)
      const y = groundAt(nx, nz)
      if (y !== null && ahead !== null && Math.abs(y - ground.current) <= STEP_OK) {
        npc.position.x = nx
        npc.position.z = nz
        ground.current = y
        moving = true
      } else {
        const angle = Math.atan2(-npcState.walkDir.x, -npcState.walkDir.z) + (Math.random() - 0.5) * 1.6
        npcState.walkDir = { x: Math.sin(angle), z: Math.cos(angle) }
      }
      npc.yaw = Math.atan2(npcState.walkDir.x, npcState.walkDir.z)
    } else if (npcState.behavior === 'idle') {
      // Gentle swaying while idle
      npc.yaw += Math.sin(npcState.animTime) * 0.02
    }

    // Look at nearby players (add life) while standing
    if (!moving) {
      const distToPlayer = Math.hypot(playerState.position.x - npc.position.x, playerState.position.z - npc.position.z)
      if (distToPlayer < 20 && distToPlayer > 0.5) {
        const angleToPlayer = Math.atan2(playerState.position.x - npc.position.x, playerState.position.z - npc.position.z)
        npc.yaw += (angleToPlayer - npc.yaw) * 0.1 // smooth look
      }
    }

    pose.speed = moving ? WALK_SPEED : 0
    // feet on the ground, body upright, facing where they go
    groupRef.current.position.set(npc.position.x, ground.current, npc.position.z)
    if (turnRef.current) turnRef.current.rotation.set(0, npc.yaw, 0)
    // the collider follows the person, so the player bumps into them where they actually are
    body.current?.setNextKinematicTranslation({ x: npc.position.x, y: ground.current + 0.75, z: npc.position.z })
  })

  if (!spot) return null // nowhere safe to stand near this spawn point

  return (
    <>
      <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[spot.x, spot.y + 0.75, spot.z]}>
        <CapsuleCollider args={[0.4, 0.35]} />
      </RigidBody>
      <group ref={groupRef} name={"npc-" + npc.id} position={[spot.x, spot.y, spot.z]}>
        <group ref={turnRef}>
          <Avatar
            state={pose}
            style={{
              social: true,
              build: npc.buildType,
              hair: npc.hairColor,
              eyes: '#8B4513',
              longHair: ['long', 'wavy', 'curly', 'braids'].includes(npc.hairStyle),
              noVisor: true,
            }}
            preset={npc.outfit}
          />
        </group>

        {/* Simple name tag billboard */}
        <mesh position={[0, 2.2, 0]} scale={[0.4, 0.15, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color={0x000000} transparent opacity={0.6} />
        </mesh>
        <mesh position={[0, 2.2, 0.01]} scale={[0.38, 0.13, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={nameTex} transparent />
        </mesh>
      </group>
    </>
  )
}

export default function NPCSpawner() {
  const { npcs } = useNPCSystem()
  // re-check who is near every 2 s as the player moves (it used to be decided once, at the start position)
  const [tick, setTick] = useState(0)
  const acc = useRef(0)
  useFrame((_, dt) => { acc.current += dt; if (acc.current > 2) { acc.current = 0; setTick((t) => t + 1) } })

  // Only render NPCs near the player
  const visibleNPCs = useMemo(() => {
    return npcs.filter(npc => {
      const dist = Math.hypot(playerState.position.x - npc.position.x, playerState.position.z - npc.position.z)
      return dist < 100 // Only render NPCs within 100 meters
    })
  }, [npcs, tick])

  return (
    <>
      {visibleNPCs.map(npc => (
        <NPCInstance key={npc.id} npc={npc} />
      ))}
    </>
  )
}
