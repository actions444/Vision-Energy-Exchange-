import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface } from './materials.js'
import { Wall, Gate, Block } from './jobkit.jsx'
import { DoubleDoor } from './Door.jsx'
import { BrandSign, Plaque } from './signs.jsx'
import { CeilingLight, PendantLight, Counter, Stool } from './furniture.jsx'
import { Atm } from './props.jsx'
import { HumanoidCrowd, makeCrowd } from '../npc/HumanoidCrowd.jsx'
import { registerInteractable, playerState } from '../state/runtime.js'
import { useStore } from '../state/store.js'
import { speakLine } from '../audio/tts.js'
import {
  PLATFORM, PLATFORM_Y, HALL, FLOOR, H, CEIL, ZONE, NAME,
  SLOT_COUNT, SLOT_X, SLOT_Z0, SLOT_SPACING, ROULETTE, BLACKJACK, BAR,
} from '../config/casino.js'

const lerpAngle = (a, b, k) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * Math.min(1, k) }

// ============================================================================
// THE JACKPOT EXCHANGE
// A neon casino floor on its own platform in the open water between The Reign Arena and Harbor
// Commons / Emerald Links. Six slot machines line the west wall, a roulette wheel and a blackjack
// table sit on the floor, and a small bar runs along the back. All three games are real, playable,
// and pay out in VSE credits via the player's wallet (state/casino.js + state/jobs.js).
// ============================================================================

const CX = (HALL.x0 + HALL.x1) / 2, CZ = (HALL.z0 + HALL.z1) / 2
const RECT = { x0: HALL.x0, x1: HALL.x1, z0: HALL.z0, z1: HALL.z1 }
const TOPY = PLATFORM_Y + H

let M
function mats() {
  if (M) return M
  M = {
    gold: new THREE.MeshStandardMaterial({ color: '#c9a25a', roughness: 0.25, metalness: 0.9 }),
    black: new THREE.MeshPhysicalMaterial({ color: '#0b0a0d', roughness: 0.15, metalness: 0.4, clearcoat: 1 }),
    purple: new THREE.MeshStandardMaterial({ color: '#4a1a66', roughness: 0.35, metalness: 0.5, emissive: '#5a0f8a', emissiveIntensity: 0.25 }),
    felt: new THREE.MeshStandardMaterial({ color: '#0e5c38', roughness: 0.9 }),
    feltRed: new THREE.MeshStandardMaterial({ color: '#6a0f1a', roughness: 0.9 }),
    carpet: surface('carpet', 5, 5, { color: '#2a0f1a', roughness: 0.85 }),
    screen: new THREE.MeshStandardMaterial({ color: '#111', emissive: '#ff2fa0', emissiveIntensity: 0.6 }),
  }
  return M
}

export default function Casino() {
  return (
    <>
      <Platform />
      <Shell />
      <Gate x0={RECT.x0} x1={RECT.x1} z0={RECT.z0} z1={RECT.z1} pad={6}>
        <Interior />
      </Gate>
    </>
  )
}

function Platform() {
  const m = getMaterials()
  const { x0, x1, z0, z1 } = PLATFORM
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
  const w = x1 - x0, d = z1 - z0
  return (
    <group>
      {/* submerged apron so the sea never shows a gap at the platform edge */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[w / 2 + 4, 0.1, d / 2 + 4]} position={[cx, 0.1, cz]} />
      </RigidBody>
      {/* raised walkable deck */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[w / 2, PLATFORM_Y / 2, d / 2]} position={[cx, PLATFORM_Y / 2, cz]} />
      </RigidBody>
      <mesh position={[cx, PLATFORM_Y / 2, cz]} material={surface('concrete', w / 3, d / 3)} receiveShadow castShadow>
        <boxGeometry args={[w, PLATFORM_Y, d]} />
      </mesh>
      <mesh position={[cx, PLATFORM_Y + 0.006, cz]} rotation={[-Math.PI / 2, 0, 0]} material={surface('pavers', w / 3, d / 3, { color: '#8d8a84' })} receiveShadow>
        <planeGeometry args={[w - 0.4, d - 0.4]} />
      </mesh>
    </group>
  )
}

function Shell() {
  const m = getMaterials()
  const mm = mats()
  const stone = useMemo(() => surface('limestone', 6, 4, { color: '#1a1a1e' }), [])
  const doorHalf = 1.6
  return (
    <group>
      <Wall side="s" rect={RECT} h={H} ext={mm.black} int={mm.purple} openings={[{ at: CX, half: doorHalf, h: 3.2 }]} />
      <Wall side="n" rect={RECT} h={H} ext={stone} int={mm.purple} />
      <Wall side="w" rect={RECT} h={H} ext={stone} int={mm.purple} />
      <Wall side="e" rect={RECT} h={H} ext={stone} int={mm.purple} />
      {/* flat roof */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[(RECT.x1 - RECT.x0) / 2 + 0.3, 0.2, (RECT.z1 - RECT.z0) / 2 + 0.3]} position={[CX, TOPY + 0.2, CZ]} />
      </RigidBody>
      <mesh position={[CX, TOPY + 0.2, CZ]} material={stone} castShadow>
        <boxGeometry args={[RECT.x1 - RECT.x0 + 0.6, 0.4, RECT.z1 - RECT.z0 + 0.6]} />
      </mesh>

      <DoubleDoor id="casino-doors" center={[CX, PLATFORM_Y + 1.3, RECT.z0]} halfWidth={doorHalf} height={2.6} facing={Math.PI} accent="#ff2fa0" label="The Jackpot Exchange" finish="bronze" />
      <Atm id="atm-casino" position={[RECT.x0 + 4, PLATFORM_Y, RECT.z0 + 2]} yaw={0} />

      {/* marquee */}
      <mesh position={[CX, TOPY - 1.6, RECT.z0 - 0.26]} material={mm.gold} castShadow>
        <boxGeometry args={[14, 2.6, 0.5]} />
      </mesh>
      <BrandSign text="THE JACKPOT EXCHANGE" sub="SLOTS · ROULETTE · BLACKJACK" position={[CX, TOPY - 1.6, RECT.z0 - 0.52]} rotation={[0, Math.PI, 0]} width={13.6} color="#ffd76a" glow="#ff2fa0" size={130} />
      <Plaque lines={['THE JACKPOT EXCHANGE', 'All credits, no cash out the door']} position={[CX + doorHalf + 1.1, PLATFORM_Y + 1.6, RECT.z0 - 0.28]} rotation={[0, Math.PI, 0]} />

      {/* vertical neon trim flanking the entrance */}
      {[-(doorHalf + 0.6), doorHalf + 0.6].map((dx) => (
        <mesh key={dx} position={[CX + dx, PLATFORM_Y + 1.3, RECT.z0 - 0.05]} material={mm.screen}>
          <boxGeometry args={[0.1, 2.6, 0.04]} />
        </mesh>
      ))}
    </group>
  )
}

function Interior() {
  const mm = mats()
  return (
    <group>
      <mesh position={[CX, PLATFORM_Y + 0.006, CZ]} rotation={[-Math.PI / 2, 0, 0]} material={mm.carpet} receiveShadow>
        <planeGeometry args={[HALL.x1 - HALL.x0 - 0.8, HALL.z1 - HALL.z0 - 0.8]} />
      </mesh>

      {/* ceiling lights down the room */}
      {[HALL.z0 + 6, HALL.z0 + 18, HALL.z0 + 30, HALL.z0 + 42].map((z, i) => (
        <CeilingLight key={i} position={[CX, PLATFORM_Y + CEIL - 0.06, z]} size={[2.4, 1.4]} color="#ff6fc4" zone={ZONE} />
      ))}
      <PendantLight position={[ROULETTE.x, PLATFORM_Y + CEIL, ROULETTE.z]} drop={1.6} color="#ffd9a6" zone={ZONE} />
      <PendantLight position={[BLACKJACK.x, PLATFORM_Y + CEIL, BLACKJACK.z]} drop={1.6} color="#ffd9a6" zone={ZONE} />

      <SlotRow />
      <RouletteTable />
      <BlackjackTable />
      <Bar />
      <CasinoHost />
    </group>
  )
}

// ---------------------------------------------------------------------------
// The floor host: greets guests near the entrance, points them toward the games, and has a
// line or two of flavor when you talk to them. A real (if simple) NPC, not just a prop.
const HOST_X = CX + 5, HOST_Z = HALL.z0 + 4.2
const HOST_LINES = [
  'Welcome to The Jackpot Exchange - good luck at the tables tonight.',
  'Slots line the west wall. Roulette and blackjack are straight ahead.',
  'Every table pays out in real VSE credits. The house always smiles, so should you.',
  'New here? Start at the slots - lowest buy-in on the floor.',
]
function CasinoHost() {
  const fans = useMemo(() => {
    const f = makeCrowd(1, () => ({ x: HOST_X, z: HOST_Z, y: PLATFORM_Y, yaw: Math.PI, raiseChance: 0 }))
    f[0].shirt = '#0b0a0d'
    f[0].pants = '#0b0a0d'
    return f
  }, [])
  useEffect(() => {
    const off = registerInteractable('casino-host', {
      position: () => new THREE.Vector3(fans[0].x, PLATFORM_Y + 1, fans[0].z),
      radius: 2.4,
      label: 'Talk to the host',
      onInteract: () => {
        const line = HOST_LINES[Math.floor(Math.random() * HOST_LINES.length)]
        useStore.getState().showToast(`Host: "${line}"`)
        speakLine(line, { id: 'casino-host' })
      },
    })
    return off
  }, [fans])
  useFrame((st) => {
    const f = fans[0]
    const pp = playerState.position
    const near = Math.hypot(f.x - pp.x, f.z - pp.z)
    if (near < 4.5) {
      f.yaw = lerpAngle(f.yaw, Math.atan2(pp.x - f.x, pp.z - f.z), 0.06)
      f.armsUp = 0.35 + 0.35 * Math.sin(st.clock.elapsedTime * 2.4)
    } else {
      f.yaw = lerpAngle(f.yaw, Math.PI, 0.03)
      f.armsUp = 0
    }
  })
  return <HumanoidCrowd fans={fans} beat={0} castShadow roam />
}

// ---------------------------------------------------------------------------
function SlotMachine({ x, z, id }) {
  const mm = mats()
  const m = getMaterials()
  const yaw = Math.PI / 2 // facing into the room (east)
  useEffect(() => {
    const off = registerInteractable('slot-' + id, {
      position: new THREE.Vector3(x + 0.9, PLATFORM_Y + 1.1, z),
      radius: 2.2,
      label: 'Play the slots',
      onInteract: () => useStore.getState().openPanel({ type: 'slots', id }),
    })
    return off
  }, [id, x, z]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group position={[x, PLATFORM_Y, z]} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.9, 0]} material={mm.purple} castShadow><boxGeometry args={[0.7, 1.8, 0.6]} /></mesh>
      <mesh position={[0, 1.35, 0.31]} material={mm.screen}><planeGeometry args={[0.46, 0.34]} /></mesh>
      <mesh position={[0, 0.85, 0.31]} material={mm.gold}><boxGeometry args={[0.56, 0.5, 0.02]} /></mesh>
      {/* lever */}
      <mesh position={[0.4, 1.3, 0]} material={m.blackSteel}><cylinderGeometry args={[0.02, 0.02, 0.5, 6]} /></mesh>
      <mesh position={[0.4, 1.55, 0]} material={mm.gold}><sphereGeometry args={[0.06, 10, 8]} /></mesh>
    </group>
  )
}

function SlotRow() {
  const items = Array.from({ length: SLOT_COUNT }, (_, i) => i)
  return (
    <group>
      {items.map((i) => <SlotMachine key={i} id={i} x={SLOT_X} z={SLOT_Z0 + i * SLOT_SPACING} />)}
    </group>
  )
}

// ---------------------------------------------------------------------------
function RouletteTable() {
  const mm = mats()
  const m = getMaterials()
  useEffect(() => {
    const off = registerInteractable('roulette-table', {
      position: new THREE.Vector3(ROULETTE.x, PLATFORM_Y + 1, ROULETTE.z),
      radius: 2.6,
      label: 'Play roulette',
      onInteract: () => useStore.getState().openPanel({ type: 'roulette' }),
    })
    return off
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group position={[ROULETTE.x, PLATFORM_Y, ROULETTE.z]}>
      <RigidBody type="fixed" colliders={false}><CylinderCollider args={[0.5, 1.3]} position={[0, 0.5, 0]} /></RigidBody>
      <mesh position={[0, 0.5, 0]} material={mm.feltRed} castShadow><cylinderGeometry args={[1.3, 1.3, 1, 24]} /></mesh>
      <mesh position={[0, 1.01, 0]} material={m.blackSteel}><cylinderGeometry args={[0.75, 0.75, 0.04, 24]} /></mesh>
      <mesh position={[0, 1.06, 0]} material={mm.gold}><cylinderGeometry args={[0.72, 0.72, 0.02, 24]} /></mesh>
      <mesh position={[0, 1.1, 0]} material={mm.black}><cylinderGeometry args={[0.1, 0.1, 0.1, 10]} /></mesh>
    </group>
  )
}

// ---------------------------------------------------------------------------
function BlackjackTable() {
  const mm = mats()
  useEffect(() => {
    const off = registerInteractable('blackjack-table', {
      position: new THREE.Vector3(BLACKJACK.x, PLATFORM_Y + 1, BLACKJACK.z),
      radius: 2.6,
      label: 'Play blackjack',
      onInteract: () => useStore.getState().openPanel({ type: 'blackjack' }),
    })
    return off
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group position={[BLACKJACK.x, PLATFORM_Y, BLACKJACK.z]}>
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[1.6, 0.5, 1]} position={[0, 0.5, 0]} /></RigidBody>
      <mesh position={[0, 0.9, 0]} material={mm.felt} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.08, 1.8]} />
      </mesh>
      <mesh position={[0, 0.46, 0]} material={mm.black} castShadow>
        <boxGeometry args={[3.2, 0.9, 1.8]} />
      </mesh>
      <mesh position={[0, 0.95, 0]} material={mm.gold}>
        <torusGeometry args={[1.55, 0.02, 6, 32, Math.PI]} />
      </mesh>
    </group>
  )
}

// ---------------------------------------------------------------------------
function Bar() {
  const m = getMaterials()
  const cx = (BAR.x0 + BAR.x1) / 2
  const len = BAR.x1 - BAR.x0
  return (
    <group>
      <Counter position={[cx, PLATFORM_Y, BAR.z]} yaw={0} length={len} height={1.1} depth={0.7} top="marble" />
      {[-len / 2 + 1.2, -len / 2 + 1.2 + (len - 2.4) / 2, len / 2 - 1.2].map((dx, i) => (
        <Stool key={i} position={[cx + dx, PLATFORM_Y, BAR.z + 1.2]} />
      ))}
    </group>
  )
}
