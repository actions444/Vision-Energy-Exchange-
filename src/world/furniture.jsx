import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface } from './materials.js'
import { useSeats } from '../state/seats.js'
import { registerLightAnchor } from '../state/environment.js'

// Interior furniture. Every piece has a collider; anything you can sit on registers seats,
// so a Sit button appears when you walk up to it. Local +z is the front of each piece.

const local = (pos, yaw, x, y, z) => [pos[0] + x * Math.cos(yaw) + z * Math.sin(yaw), pos[1] + y, pos[2] - x * Math.sin(yaw) + z * Math.cos(yaw)]
const matCache = new Map()
const solid = (color, roughness = 0.6, metalness = 0) => {
  const k = color + roughness + metalness
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color, roughness, metalness }))
  return matCache.get(k)
}

export function Chair({ position, yaw = 0, color = '#3b3f46', label = 'Sit on chair' }) {
  const m = getMaterials()
  useSeats([{ position: local(position, yaw, 0, 0.47, 0.02), yaw, height: 0.47, label }], [position[0], position[1], position[2], yaw])
  const fabric = m.fabric(color)
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[0.24, 0.24, 0.24]} position={[0, 0.24, 0]} />
      <mesh position={[0, 0.44, 0.02]} material={fabric} castShadow><boxGeometry args={[0.48, 0.07, 0.46]} /></mesh>
      <mesh position={[0, 0.74, -0.2]} rotation={[-0.08, 0, 0]} material={fabric} castShadow><boxGeometry args={[0.46, 0.5, 0.06]} /></mesh>
      {[[-0.2, 0.2], [0.2, 0.2], [-0.2, -0.18], [0.2, -0.18]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.2, z]} material={m.blackSteel}><cylinderGeometry args={[0.015, 0.015, 0.4, 6]} /></mesh>
      ))}
    </RigidBody>
  )
}

export function Stool({ position, color = '#2f2f33' }) {
  const m = getMaterials()
  useSeats([{ position: [position[0], position[1] + 0.76, position[2]], yaw: Math.PI, height: 0.76, label: 'Sit on stool' }], [position[0], position[1], position[2]])
  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <CylinderCollider args={[0.38, 0.2]} position={[0, 0.38, 0]} />
      <mesh position={[0, 0.74, 0]} material={m.leather(color)} castShadow><cylinderGeometry args={[0.2, 0.18, 0.08, 20]} /></mesh>
      <mesh position={[0, 0.37, 0]} material={m.chrome}><cylinderGeometry args={[0.025, 0.025, 0.74, 8]} /></mesh>
      <mesh position={[0, 0.02, 0]} material={m.chrome}><cylinderGeometry args={[0.18, 0.18, 0.03, 20]} /></mesh>
    </RigidBody>
  )
}

export function Sofa({ position, yaw = 0, length = 2.2, color = '#5a6270', label = 'Sit on sofa' }) {
  const m = getMaterials()
  const n = Math.max(1, Math.round(length / 0.75))
  const seats = useMemo(() => Array.from({ length: n }, (_, i) => ({
    position: local(position, yaw, (i - (n - 1) / 2) * (length - 0.4) / n, 0.44, 0.08), yaw, height: 0.44, label,
  })), [position[0], position[1], position[2], yaw, length]) // eslint-disable-line react-hooks/exhaustive-deps
  useSeats(seats, [seats])
  const fabric = m.fabric(color)
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[length / 2, 0.22, 0.42]} position={[0, 0.22, 0]} />
      <CuboidCollider args={[length / 2, 0.4, 0.1]} position={[0, 0.4, -0.36]} />
      <mesh position={[0, 0.2, 0]} material={fabric} castShadow receiveShadow><boxGeometry args={[length, 0.4, 0.86]} /></mesh>
      <mesh position={[0, 0.66, -0.34]} material={fabric} castShadow><boxGeometry args={[length, 0.55, 0.2]} /></mesh>
      {[-1, 1].map((k) => <mesh key={k} position={[k * (length / 2 - 0.09), 0.5, 0]} material={fabric} castShadow><boxGeometry args={[0.18, 0.28, 0.86]} /></mesh>)}
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[(i - (n - 1) / 2) * (length - 0.4) / n, 0.43, 0.05]} material={fabric}><boxGeometry args={[(length - 0.45) / n - 0.03, 0.08, 0.66]} /></mesh>
      ))}
    </RigidBody>
  )
}

export function Table({ position, yaw = 0, size = [1.6, 0.9], height = 0.75, top = 'wood', round = false }) {
  const m = getMaterials()
  const topMat = top === 'wood' ? surface('wood', 1, 1) : top === 'marble' ? m.marbleWall(0.5, 0.5) : solid(top, 0.4)
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      {round ? <CylinderCollider args={[height / 2, size[0] / 2]} position={[0, height / 2, 0]} /> : <CuboidCollider args={[size[0] / 2, height / 2, size[1] / 2]} position={[0, height / 2, 0]} />}
      {round ? (
        <>
          <mesh position={[0, height - 0.02, 0]} material={topMat} castShadow receiveShadow><cylinderGeometry args={[size[0] / 2, size[0] / 2, 0.04, 32]} /></mesh>
          <mesh position={[0, height / 2, 0]} material={m.blackSteel}><cylinderGeometry args={[0.04, 0.04, height, 8]} /></mesh>
          <mesh position={[0, 0.02, 0]} material={m.blackSteel}><cylinderGeometry args={[0.25, 0.25, 0.04, 16]} /></mesh>
        </>
      ) : (
        <>
          <mesh position={[0, height - 0.025, 0]} material={topMat} castShadow receiveShadow><boxGeometry args={[size[0], 0.05, size[1]]} /></mesh>
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => (
            <mesh key={i} position={[a * (size[0] / 2 - 0.06), (height - 0.05) / 2, b * (size[1] / 2 - 0.06)]} material={m.blackSteel}><boxGeometry args={[0.05, height - 0.05, 0.05]} /></mesh>
          ))}
        </>
      )}
    </RigidBody>
  )
}

/** Table with chairs around it (all seats registered). */
export function DiningSet({ position, round = true, chairs = 4, size = 1.0, color = '#6b4f3a' }) {
  const items = useMemo(() => Array.from({ length: chairs }, (_, i) => {
    const a = (i / chairs) * Math.PI * 2
    const r = size / 2 + 0.38
    return { p: [position[0] + Math.sin(a) * r, position[1], position[2] + Math.cos(a) * r], yaw: a + Math.PI }
  }), [position[0], position[1], position[2], chairs, size]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group>
      <Table position={position} round={round} size={[size, size]} />
      {items.map((c, i) => <Chair key={i} position={c.p} yaw={c.yaw} color={color} />)}
    </group>
  )
}

export function Counter({ position, yaw = 0, length = 4, height = 1.05, depth = 0.7, top = 'marble', face = '#2d2a27' }) {
  const m = getMaterials()
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[length / 2, height / 2, depth / 2]} position={[0, height / 2, 0]} />
      <mesh position={[0, (height - 0.05) / 2, 0]} material={surface('wood', length / 2, 0.6, { color: face })} castShadow receiveShadow><boxGeometry args={[length, height - 0.05, depth]} /></mesh>
      <mesh position={[0, height - 0.025, 0.02]} material={top === 'marble' ? m.marbleWall(1, 0.3) : surface('wood', 2, 0.3)} castShadow><boxGeometry args={[length + 0.06, 0.05, depth + 0.1]} /></mesh>
    </RigidBody>
  )
}

export function Rug({ position, size = [3, 2], color = '#6d5a4a', yaw = 0 }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color, map: surface('carpet', 1, 1).map, roughness: 1 }), [color])
  return (
    <mesh position={[position[0], position[1] + 0.008, position[2]]} rotation={[-Math.PI / 2, 0, yaw]} material={mat} receiveShadow>
      <planeGeometry args={size} />
    </mesh>
  )
}

export function Plant({ position, scale = 1 }) {
  const pot = solid('#d9d5cd', 0.7)
  const leaf = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3e6b34', roughness: 0.85, flatShading: true }), [])
  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <CylinderCollider args={[0.3 * scale, 0.25 * scale]} position={[0, 0.3 * scale, 0]} />
      <mesh position={[0, 0.25 * scale, 0]} material={pot} castShadow><cylinderGeometry args={[0.24 * scale, 0.18 * scale, 0.5 * scale, 16]} /></mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[Math.cos(i * 1.3) * 0.15 * scale, (0.75 + i * 0.12) * scale, Math.sin(i * 1.3) * 0.15 * scale]} rotation={[0.3 * Math.cos(i), i, 0.3 * Math.sin(i)]} material={leaf} castShadow>
          <icosahedronGeometry args={[0.28 * scale, 0]} />
        </mesh>
      ))}
    </RigidBody>
  )
}

/** Recessed ceiling light panel + a light anchor for the shared light pool. */
export function CeilingLight({ position, size = [1.2, 1.2], intensity = 22, color = '#fff1dc', distance = 11 }) {
  const mat = getMaterials().shared('ceilLight' + color, () => new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: color, emissiveIntensity: 0.9 }))
  useEffect(() => (intensity > 0 ? registerLightAnchor({ position: new THREE.Vector3(position[0], position[1] - 0.6, position[2]), color, intensity, distance, range: 40 }) : undefined), [position[0], position[1], position[2], intensity]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]} material={mat}>
      <planeGeometry args={size} />
    </mesh>
  )
}

export function PendantLight({ position, drop = 1.2, color = '#ffd9a6' }) {
  const m = getMaterials()
  const glow = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fff3df', emissive: color, emissiveIntensity: 2 }), [color])
  useEffect(() => registerLightAnchor({ position: new THREE.Vector3(position[0], position[1] - drop - 0.3, position[2]), color, intensity: 10, distance: 7, range: 30 }), [position[0], position[1], position[2]]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group position={position}>
      <mesh position={[0, -drop / 2, 0]} material={m.blackSteel}><cylinderGeometry args={[0.006, 0.006, drop, 4]} /></mesh>
      <mesh position={[0, -drop - 0.08, 0]} material={m.blackSteel}><coneGeometry args={[0.2, 0.18, 20, 1, true]} /></mesh>
      <mesh position={[0, -drop - 0.15, 0]} material={glow}><sphereGeometry args={[0.07, 12, 8]} /></mesh>
    </group>
  )
}

export function ClothingRack({ position, yaw = 0, seed = 1 }) {
  const m = getMaterials()
  const cols = ['#1f2a44', '#b23a3a', '#e9e4d8', '#3d5a40', '#c9a24a', '#5c3d6e', '#222222', '#8fa7c4']
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[0.75, 0.75, 0.3]} position={[0, 0.75, 0]} />
      <mesh position={[0, 1.55, 0]} rotation={[0, 0, Math.PI / 2]} material={m.chrome}><cylinderGeometry args={[0.015, 0.015, 1.5, 8]} /></mesh>
      {[-0.72, 0.72].map((x) => <mesh key={x} position={[x, 0.78, 0]} material={m.chrome}><cylinderGeometry args={[0.015, 0.015, 1.56, 8]} /></mesh>)}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[-0.6 + i * 0.15, 1.12, 0]} material={solid(cols[(i + seed) % cols.length], 0.9)} castShadow>
          <boxGeometry args={[0.06, 0.82, 0.5]} />
        </mesh>
      ))}
    </RigidBody>
  )
}

export function Mannequin({ position, yaw = 0, color = '#1f2a44' }) {
  const body = solid('#e8e4dc', 0.4)
  const cloth = solid(color, 0.85)
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CylinderCollider args={[0.9, 0.25]} position={[0, 0.9, 0]} />
      <mesh position={[0, 0.04, 0]} material={getMaterials().chrome}><cylinderGeometry args={[0.22, 0.22, 0.04, 20]} /></mesh>
      <mesh position={[0, 0.5, 0]} material={getMaterials().chrome}><cylinderGeometry args={[0.02, 0.02, 0.9, 6]} /></mesh>
      <mesh position={[0, 1.25, 0]} material={cloth} castShadow><capsuleGeometry args={[0.19, 0.5, 6, 12]} /></mesh>
      <mesh position={[0, 1.72, 0]} material={body}><sphereGeometry args={[0.1, 16, 12]} /></mesh>
    </RigidBody>
  )
}

export function Shelf({ position, yaw = 0, width = 2, height = 2.2, books = true }) {
  const wood = surface('wood', 1, 1, { color: '#8a6f55' })
  const ref = useRef()
  const n = books ? 60 : 0
  useEffect(() => {
    if (!n) return
    const o = new THREE.Object3D(), c = new THREE.Color()
    for (let i = 0; i < n; i++) {
      const row = i % 4, k = Math.floor(i / 4)
      const h = 0.22 + ((i * 37) % 10) / 70
      o.position.set(-width / 2 + 0.12 + k * ((width - 0.24) / (n / 4)), 0.3 + row * (height / 4) + h / 2, 0.02)
      o.scale.set(1, h / 0.3, 1); o.updateMatrix()
      ref.current.setMatrixAt(i, o.matrix)
      c.setHSL(((i * 53) % 100) / 100, 0.35, 0.35 + ((i * 7) % 10) / 40)
      ref.current.setColorAt(i, c)
    }
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.instanceColor.needsUpdate = true
  }, [n, width, height])
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[width / 2, height / 2, 0.2]} position={[0, height / 2, 0]} />
      <mesh position={[0, height / 2, -0.18]} material={wood}><boxGeometry args={[width, height, 0.04]} /></mesh>
      {[0, 1, 2, 3, 4].map((r) => <mesh key={r} position={[0, 0.27 + r * (height / 4) - 0.03, 0]} material={wood} castShadow><boxGeometry args={[width, 0.03, 0.38]} /></mesh>)}
      {[-1, 1].map((k) => <mesh key={k} position={[k * width / 2, height / 2, 0]} material={wood}><boxGeometry args={[0.03, height, 0.38]} /></mesh>)}
      {n > 0 && <instancedMesh ref={ref} args={[null, null, n]}><boxGeometry args={[0.05, 0.3, 0.26]} /><meshStandardMaterial roughness={0.8} /></instancedMesh>}
    </RigidBody>
  )
}

/** Wall-mounted display. Pass a material (e.g. a video or shader screen) or get a dark panel. */
export function WallScreen({ position, yaw = 0, size = [3, 1.7], material }) {
  const m = getMaterials()
  const off = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0d0e10', roughness: 0.15, metalness: 0.4 }), [])
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0, -0.03]} material={m.blackSteel}><boxGeometry args={[size[0] + 0.08, size[1] + 0.08, 0.05]} /></mesh>
      <mesh material={material || off}><planeGeometry args={size} /></mesh>
    </group>
  )
}

export function Speaker({ position, yaw = 0, scale = 1 }) {
  const m = getMaterials()
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[0.18 * scale, 0.3 * scale, 0.18 * scale]} position={[0, 0.3 * scale, 0]} />
      <mesh position={[0, 0.3 * scale, 0]} material={solid('#1b1b1d', 0.5)} castShadow><boxGeometry args={[0.36 * scale, 0.6 * scale, 0.34 * scale]} /></mesh>
      <mesh position={[0, 0.22 * scale, 0.171 * scale]} material={m.blackSteel}><circleGeometry args={[0.12 * scale, 20]} /></mesh>
      <mesh position={[0, 0.46 * scale, 0.171 * scale]} material={m.chrome}><circleGeometry args={[0.04 * scale, 16]} /></mesh>
    </RigidBody>
  )
}

export function Microphone({ position, yaw = 0 }) {
  const m = getMaterials()
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.12, 0]} material={m.blackSteel}><cylinderGeometry args={[0.01, 0.01, 0.24, 6]} /></mesh>
      <mesh position={[0, 0.26, 0.04]} rotation={[0.5, 0, 0]} material={m.chrome}><capsuleGeometry args={[0.03, 0.08, 4, 10]} /></mesh>
      <mesh position={[0, 0.005, 0]} material={m.blackSteel}><cylinderGeometry args={[0.06, 0.06, 0.01, 12]} /></mesh>
    </group>
  )
}

/** Fabric acoustic panels on a wall. */
export function AcousticPanels({ position, yaw = 0, cols = 4, rows = 2, color = '#3c4652' }) {
  const fab = getMaterials().fabric(color)
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {Array.from({ length: cols * rows }, (_, i) => (
        <mesh key={i} position={[(i % cols - (cols - 1) / 2) * 0.95, Math.floor(i / cols) * 0.95, 0]} material={fab}><boxGeometry args={[0.85, 0.85, 0.06]} /></mesh>
      ))}
    </group>
  )
}

/** Gently spinning ceiling fan, purely decorative. */
export function CeilingFan({ position }) {
  const ref = useRef()
  const m = getMaterials()
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 2 })
  return (
    <group position={position}>
      <mesh position={[0, -0.15, 0]} material={m.blackSteel}><cylinderGeometry args={[0.02, 0.02, 0.3, 6]} /></mesh>
      <group ref={ref} position={[0, -0.32, 0]}>
        {[0, 1, 2, 3].map((i) => <mesh key={i} rotation={[0, (i * Math.PI) / 2, 0]} position={[Math.cos((i * Math.PI) / 2) * 0.45, 0, -Math.sin((i * Math.PI) / 2) * 0.45]} material={surface('wood', 0.3, 0.3)}><boxGeometry args={[0.8, 0.02, 0.16]} /></mesh>)}
        <mesh material={m.blackSteel}><cylinderGeometry args={[0.1, 0.1, 0.08, 16]} /></mesh>
      </group>
    </group>
  )
}
