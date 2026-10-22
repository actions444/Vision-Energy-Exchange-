import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CapsuleCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { useNPCSystem } from './npcSystem.js'
import { playerState } from '../state/runtime.js'
import Avatar from '../player/Avatar.jsx'

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

    // Update position based on behavior
    if (npcState.behavior === 'walking') {
      npc.position.x += npcState.walkDir.x * WALK_SPEED * dt
      npc.position.z += npcState.walkDir.z * WALK_SPEED * dt
      npc.yaw = Math.atan2(npcState.walkDir.x, npcState.walkDir.z)
    } else if (npcState.behavior === 'idle') {
      // Gentle swaying while idle
      npc.yaw += Math.sin(npcState.animTime) * 0.02
    }

    // Update group position
    groupRef.current.position.set(npc.position.x, 0.2, npc.position.z)

    // Face direction of movement
    if (groupRef.current.children[0]) {
      groupRef.current.children[0].rotation.y = npc.yaw
    }

    // Look at nearby players (add life)
    const distToPlayer = Math.hypot(playerState.position.x - npc.position.x, playerState.position.z - npc.position.z)
    if (distToPlayer < 20 && distToPlayer > 0.5) {
      const angleToPlayer = Math.atan2(playerState.position.x - npc.position.x, playerState.position.z - npc.position.z)
      npc.yaw += (angleToPlayer - npc.yaw) * 0.1 // smooth look
    }
  })

  return (
    <group ref={groupRef} position={[npc.position.x, 0.2, npc.position.z]}>
      <RigidBody type="kinematic" position={[0, 0.8, 0]}>
        <CapsuleCollider args={[0.4, 0.35]} />
        <Avatar
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
      </RigidBody>

      {/* Simple name tag billboard */}
      <mesh position={[0, 2.2, 0]} scale={[0.4, 0.15, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={0x000000} transparent opacity={0.6} />
      </mesh>
      <mesh position={[0, 2.2, 0.01]} scale={[0.38, 0.13, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={createNameTexture(npc.name)} transparent />
      </mesh>
    </group>
  )
}

export default function NPCSpawner() {
  const { npcs } = useNPCSystem()

  // Only render NPCs near the player
  const visibleNPCs = useMemo(() => {
    return npcs.filter(npc => {
      const dist = Math.hypot(playerState.position.x - npc.position.x, playerState.position.z - npc.position.z)
      return dist < 100 // Only render NPCs within 100 meters
    })
  }, [npcs])

  return (
    <>
      {visibleNPCs.map(npc => (
        <NPCInstance key={npc.id} npc={npc} />
      ))}
    </>
  )
}
