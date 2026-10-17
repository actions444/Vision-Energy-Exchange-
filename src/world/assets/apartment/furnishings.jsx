import { useMemo } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface } from '../../materials.js'
import { useSeats } from '../../../state/seats.js'

// Home furnishings the shared furniture kit does not have: bed, fitted kitchen, wardrobe, nightstand, lamp, console,
// mailbox bank. Same conventions as world/furniture.jsx: local +z is the front of each piece, every piece has a collider,
// and anything you can sit on registers a seat.

const local = (pos, yaw, x, y, z) => [pos[0] + x * Math.cos(yaw) + z * Math.sin(yaw), pos[1] + y, pos[2] - x * Math.sin(yaw) + z * Math.cos(yaw)]
const cache = new Map()
const solid = (color, roughness = 0.6, metalness = 0, extra = {}) => {
  const k = color + roughness + metalness + JSON.stringify(extra)
  if (!cache.has(k)) cache.set(k, new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra }))
  return cache.get(k)
}
const steel = () => solid('#b9bcc0', 0.3, 0.9)

export function Bed({ position, yaw = 0, color = '#7a6a8a', frame = '#6b513c', size = [1.6, 2.0] }) {
  const m = getMaterials()
  const [w, l] = size
  const seats = useMemo(() => [{ position: local(position, yaw, 0, 0.52, l / 2 - 0.2), yaw: yaw + Math.PI, height: 0.52, label: 'Sit on bed' }], [position[0], position[1], position[2], yaw]) // eslint-disable-line react-hooks/exhaustive-deps
  useSeats(seats, [seats])
  const wood = surface('wood', 1, 0.6, { color: frame })
  const linen = m.fabric('#ece8e1'), duvet = m.fabric(color), headboard = m.fabric('#5b5163')
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[w / 2 + 0.05, 0.28, l / 2 + 0.05]} position={[0, 0.28, 0]} />
      <CuboidCollider args={[w / 2 + 0.05, 0.55, 0.06]} position={[0, 0.55, -l / 2 - 0.05]} />
      {/* base with feet, mattress, sheet, folded duvet, pillows, headboard */}
      <mesh position={[0, 0.2, 0]} material={wood} castShadow receiveShadow><boxGeometry args={[w + 0.08, 0.2, l + 0.06]} /></mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <mesh key={i} position={[a * (w / 2), 0.05, b * (l / 2 - 0.05)]} material={wood}><boxGeometry args={[0.07, 0.1, 0.07]} /></mesh>)}
      <mesh position={[0, 0.42, 0.0]} material={linen} castShadow receiveShadow><boxGeometry args={[w, 0.24, l - 0.04]} /></mesh>
      <mesh position={[0, 0.56, 0.32]} material={duvet} castShadow><boxGeometry args={[w + 0.06, 0.1, l * 0.72]} /></mesh>
      <mesh position={[0, 0.605, 0.66]} material={m.fabric('#d9d3c8')}><boxGeometry args={[w + 0.08, 0.04, 0.4]} /></mesh>
      {[-1, 1].map((k) => <mesh key={k} position={[k * (w / 4), 0.64, -l / 2 + 0.34]} rotation={[-0.2, 0, 0]} material={linen} castShadow><boxGeometry args={[w / 2 - 0.1, 0.14, 0.46]} /></mesh>)}
      <mesh position={[0, 0.78, -l / 2 - 0.02]} material={headboard} castShadow><boxGeometry args={[w + 0.14, 0.95, 0.1]} /></mesh>
    </RigidBody>
  )
}

export function NightStand({ position, yaw = 0 }) {
  const wood = surface('wood', 0.6, 0.6, { color: '#6b513c' })
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[0.22, 0.26, 0.22]} position={[0, 0.26, 0]} />
      <mesh position={[0, 0.27, 0]} material={wood} castShadow receiveShadow><boxGeometry args={[0.44, 0.5, 0.44]} /></mesh>
      <mesh position={[0, 0.34, 0.225]} material={steel()}><boxGeometry args={[0.14, 0.012, 0.012]} /></mesh>
      <mesh position={[0, 0.54, 0]} material={wood}><boxGeometry args={[0.48, 0.03, 0.48]} /></mesh>
      <TableLamp position={[0, 0.555, 0]} />
    </RigidBody>
  )
}

export function TableLamp({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]} material={solid('#2b2b2e', 0.4, 0.5)}><cylinderGeometry args={[0.07, 0.08, 0.04, 14]} /></mesh>
      <mesh position={[0, 0.16, 0]} material={solid('#c9a96a', 0.35, 0.9)}><cylinderGeometry args={[0.012, 0.012, 0.26, 8]} /></mesh>
      <mesh position={[0, 0.34, 0]} material={solid('#f3e6cf', 0.9, 0, { emissive: '#ffcf8f', emissiveIntensity: 0.25 })}><cylinderGeometry args={[0.1, 0.15, 0.2, 18, 1, true]} /></mesh>
    </group>
  )
}

export function Wardrobe({ position, yaw = 0, width = 1.8, height = 2.3, depth = 0.6 }) {
  const wood = surface('wood', 1, 1, { color: '#d9d4cb' })
  const n = Math.max(2, Math.round(width / 0.6))
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[width / 2, height / 2, depth / 2]} position={[0, height / 2, 0]} />
      <mesh position={[0, height / 2, 0]} material={wood} castShadow receiveShadow><boxGeometry args={[width, height, depth]} /></mesh>
      {Array.from({ length: n }, (_, i) => { const x = -width / 2 + (width * (i + 0.5)) / n; return (
        <group key={i}>
          <mesh position={[x, height / 2, depth / 2 + 0.006]} material={solid('#cfc9be', 0.7)}><boxGeometry args={[width / n - 0.014, height - 0.1, 0.012]} /></mesh>
          <mesh position={[x + (i % 2 ? -1 : 1) * (width / n / 2 - 0.07), height * 0.5, depth / 2 + 0.03]} material={steel()}><boxGeometry args={[0.014, 0.28, 0.02]} /></mesh>
        </group>
      ) })}
    </RigidBody>
  )
}

/** Fitted kitchen run: base units with stone top and sink, hob, oven, wall units, hood, tiled splashback, fridge at one end. */
export function KitchenRun({ position, yaw = 0, length = 4.2, fridge = true }) {
  const m = getMaterials()
  const door = surface('wood', 1, 1, { color: '#e7e4dd' })
  const dark = surface('wood', 1, 1, { color: '#2f3238' })
  const top = m.marbleWall(1, 0.3)
  const tile = surface('tile', length / 0.6, 1.2, { color: '#eceae5' })
  const L = length - (fridge ? 0.75 : 0)
  const x0 = -length / 2 + (fridge ? 0.75 : 0) // run starts here; fridge occupies the first 0.75 m
  const cx = x0 + L / 2
  const units = Math.max(3, Math.round(L / 0.6))
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[length / 2, 0.45, 0.33]} position={[0, 0.45, 0.0]} />
      {fridge && <CuboidCollider args={[0.38, 0.9, 0.36]} position={[-length / 2 + 0.38, 0.9, 0.02]} />}
      {/* plinth, doors, handles */}
      <mesh position={[cx, 0.05, -0.02]} material={dark}><boxGeometry args={[L, 0.1, 0.56]} /></mesh>
      {Array.from({ length: units }, (_, i) => { const x = x0 + (L * (i + 0.5)) / units; return (
        <group key={i}>
          <mesh position={[x, 0.47, 0.01]} material={door} castShadow receiveShadow><boxGeometry args={[L / units - 0.012, 0.74, 0.6]} /></mesh>
          <mesh position={[x, 0.76, 0.315]} material={steel()}><boxGeometry args={[0.2, 0.014, 0.014]} /></mesh>
        </group>
      ) })}
      <mesh position={[cx, 0.875, 0.03]} material={top} castShadow><boxGeometry args={[L + 0.02, 0.04, 0.66]} /></mesh>
      {/* sink bowl + mixer */}
      <mesh position={[cx - L * 0.25, 0.9, 0.02]} material={steel()}><boxGeometry args={[0.62, 0.012, 0.42]} /></mesh>
      <mesh position={[cx - L * 0.25, 0.94, -0.28]} material={steel()}><cylinderGeometry args={[0.015, 0.018, 0.2, 10]} /></mesh>
      <mesh position={[cx - L * 0.25, 1.03, -0.2]} rotation={[Math.PI / 2, 0, 0]} material={steel()}><cylinderGeometry args={[0.012, 0.012, 0.18, 8]} /></mesh>
      {/* induction hob */}
      <mesh position={[cx + L * 0.2, 0.9, 0.02]} material={solid('#101114', 0.15, 0.2)}><boxGeometry args={[0.6, 0.012, 0.5]} /></mesh>
      {[[-0.14, -0.1], [0.14, -0.1], [-0.14, 0.12], [0.14, 0.12]].map(([a, b], i) => <mesh key={i} position={[cx + L * 0.2 + a, 0.908, 0.02 + b]} rotation={[-Math.PI / 2, 0, 0]} material={solid('#3c3e44', 0.3, 0.4)}><ringGeometry args={[0.07, 0.085, 24]} /></mesh>)}
      {/* splashback + wall units + hood */}
      <mesh position={[cx, 1.2, -0.325]} material={tile}><boxGeometry args={[L, 0.62, 0.02]} /></mesh>
      {Array.from({ length: units }, (_, i) => { const x = x0 + (L * (i + 0.5)) / units; return Math.abs(x - (cx + L * 0.2)) < 0.4 ? null : (
        <mesh key={i} position={[x, 1.82, -0.16]} material={door} castShadow><boxGeometry args={[L / units - 0.012, 0.7, 0.34]} /></mesh>
      ) })}
      <mesh position={[cx + L * 0.2, 1.88, -0.14]} material={steel()} castShadow><boxGeometry args={[0.62, 0.14, 0.4]} /></mesh>
      <mesh position={[cx + L * 0.2, 2.17, -0.2]} material={steel()}><boxGeometry args={[0.22, 0.45, 0.2]} /></mesh>
      {/* fridge-freezer, brushed steel */}
      {fridge && (
        <group position={[-length / 2 + 0.38, 0, 0.02]}>
          <mesh position={[0, 0.9, 0]} material={steel()} castShadow receiveShadow><boxGeometry args={[0.72, 1.8, 0.72]} /></mesh>
          <mesh position={[0, 1.2, 0.365]} material={solid('#222428', 0.5)}><boxGeometry args={[0.7, 0.012, 0.01]} /></mesh>
          {[0.1, -0.1].map((k, i) => <mesh key={i} position={[0.3, i ? 0.8 : 1.45, 0.4]} material={steel()}><boxGeometry args={[0.02, i ? 0.5 : 0.3, 0.03]} /></mesh>)}
        </group>
      )}
    </RigidBody>
  )
}

/** Console table with a drawer, for hallways. */
export function Console({ position, yaw = 0, width = 1.1 }) {
  const wood = surface('wood', 1, 0.6, { color: '#7a5d44' })
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[width / 2, 0.4, 0.18]} position={[0, 0.4, 0]} />
      <mesh position={[0, 0.76, 0]} material={wood} castShadow><boxGeometry args={[width, 0.04, 0.34]} /></mesh>
      <mesh position={[0, 0.68, 0]} material={wood}><boxGeometry args={[width - 0.04, 0.12, 0.32]} /></mesh>
      {[-1, 1].map((a) => [-1, 1].map((b) => <mesh key={a + ':' + b} position={[a * (width / 2 - 0.04), 0.37, b * 0.13]} material={wood}><boxGeometry args={[0.035, 0.74, 0.035]} /></mesh>))}
      <mesh position={[0, 0.68, 0.17]} material={solid('#c9a96a', 0.35, 0.9)}><boxGeometry args={[0.1, 0.014, 0.014]} /></mesh>
    </RigidBody>
  )
}

/** Wall-mounted bank of resident mailboxes (numbered doors, key locks). */
export function MailboxBank({ position, yaw = 0, cols = 6, rows = 2, startNumber = 101 }) {
  const body = solid('#9ea3a8', 0.38, 0.85)
  const label = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 64
    const g = c.getContext('2d'); g.fillStyle = '#f1efe9'; g.fillRect(0, 0, 128, 64); g.fillStyle = '#222'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('A', 64, 34)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 })
  }, [])
  const W = cols * 0.17, H = rows * 0.2
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[W / 2, H / 2, 0.1]} position={[0, 1.25, 0.1]} />
      <mesh position={[0, 1.25, 0.1]} material={solid('#6e7378', 0.45, 0.8)} castShadow><boxGeometry args={[W + 0.04, H + 0.04, 0.2]} /></mesh>
      {Array.from({ length: rows * cols }, (_, i) => { const c = i % cols, r = Math.floor(i / cols); return (
        <group key={i} position={[-W / 2 + 0.085 + c * 0.17, 1.25 + H / 2 - 0.1 - r * 0.2, 0.205]}>
          <mesh material={body}><boxGeometry args={[0.158, 0.188, 0.012]} /></mesh>
          <mesh position={[0, 0.045, 0.008]} material={label}><planeGeometry args={[0.1, 0.045]} /></mesh>
          <mesh position={[0, -0.03, 0.009]} material={solid('#2b2b2e', 0.4, 0.6)}><cylinderGeometry args={[0.014, 0.014, 0.01, 10]} /></mesh>
        </group>
      ) })}
    </RigidBody>
  )
}
