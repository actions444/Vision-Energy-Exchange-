import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CapsuleCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { playerState } from '../state/runtime.js'
import { useJobs } from '../state/jobs.js'
import { useStore } from '../state/store.js'
import { outfit } from '../state/jobs.js'
import { OUTFITS } from '../config/outfits.js'

// Pyramid treasure configuration
const PYRAMID_COLORS = [
  { name: 'Gold', hex: '#FFD700', reward: 'credits', amount: [500, 2000] },
  { name: 'Silver', hex: '#C0C0C0', reward: 'credits', amount: [200, 800] },
  { name: 'Emerald', hex: '#50C878', reward: 'outfit', amount: null },
  { name: 'Sapphire', hex: '#0F52BA', reward: 'outfit', amount: null },
  { name: 'Ruby', hex: '#E0115F', reward: 'outfit', amount: null },
  { name: 'Diamond', hex: '#FFFFFF', reward: 'credits', amount: [5000, 15000] },
  { name: 'Amethyst', hex: '#9966CC', reward: 'outfit', amount: null },
]

// Pyramid positions scattered around the world
const PYRAMID_SPAWNS = [
  { x: 0, z: 0, name: 'Central Plaza' },
  { x: 50, z: 50, name: 'East Quarter' },
  { x: -50, z: 50, name: 'North Quarter' },
  { x: 50, z: -50, name: 'South Quarter' },
  { x: -50, z: -50, name: 'West Quarter' },
  { x: 100, z: 0, name: 'Far East' },
  { x: -100, z: 0, name: 'Far West' },
  { x: 0, z: 100, name: 'Far North' },
  { x: 0, z: -100, name: 'Far South' },
  { x: 75, z: 75, name: 'Northeast Ridge' },
  { x: -75, z: 75, name: 'Northwest Ridge' },
  { x: 75, z: -75, name: 'Southeast Ridge' },
  { x: -75, z: -75, name: 'Southwest Ridge' },
]

function PyramidMesh({ color, collected }) {
  const meshRef = useRef()
  const rotationRef = useRef(0)

  useFrame(() => {
    if (meshRef.current && !collected) {
      rotationRef.current += 0.01
      meshRef.current.rotation.y = rotationRef.current
      meshRef.current.position.y = 1.2 + Math.sin(rotationRef.current * 2) * 0.3
    }
  })

  return (
    <mesh ref={meshRef} position={[0, 1.2, 0]} scale={collected ? 0 : 1}>
      <tetrahedronGeometry args={[0.6]} />
      <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} emissive={color} emissiveIntensity={0.3} />
    </mesh>
  )
}

function PyramidItem({ spawn, colorConfig }) {
  const collected = useRef(false)
  // state, not just the ref, so the pyramid actually leaves the scene once collected
  const [gone, setGone] = useState(false)
  const meshRef = useRef()

  useFrame(() => {
    if (collected.current) return
    const dist = Math.hypot(playerState.position.x - spawn.x, playerState.position.z - spawn.z)
    if (dist < 2) {
      collected.current = true
      setGone(true)

      // Distribute reward
      if (colorConfig.reward === 'credits') {
        const amount = colorConfig.amount[0] + Math.random() * (colorConfig.amount[1] - colorConfig.amount[0])
        const credits = Math.round(amount)
        const { spend } = useJobs.getState()
        spend(-credits, 'treasure', `Treasure: ${colorConfig.name} Pyramid`)
        useStore.getState().showToast(`+${credits} credits from ${colorConfig.name} Pyramid! 💰`)
      } else if (colorConfig.reward === 'outfit') {
        const outfitKeys = Object.keys(OUTFITS)
        const randomOutfit = outfitKeys[Math.floor(Math.random() * outfitKeys.length)]
        useStore.getState().updateProfile({ preset: randomOutfit })
        outfit.setState({ preset: randomOutfit })
        useStore.getState().showToast(`New outfit unlocked from ${colorConfig.name} Pyramid! 👗`)
      }

      useStore.getState().showToast(`Found a ${colorConfig.name} Pyramid at ${spawn.name}!`)
    }
  })

  if (gone) return null

  return (
    <RigidBody type="fixed" position={[spawn.x, 0.8, spawn.z]}>
      <CapsuleCollider args={[0.6, 0.6]} />
      <PyramidMesh color={colorConfig.hex} collected={collected.current} />
    </RigidBody>
  )
}

export default function TreasurePyramids() {
  const pyramids = useMemo(() => {
    return PYRAMID_SPAWNS.map((spawn, i) => {
      const colorIdx = i % PYRAMID_COLORS.length
      return { spawn, colorConfig: PYRAMID_COLORS[colorIdx], key: i }
    })
  }, [])

  return (
    <>
      {pyramids.map((pyr) => (
        <PyramidItem key={pyr.key} spawn={pyr.spawn} colorConfig={pyr.colorConfig} />
      ))}
    </>
  )
}
