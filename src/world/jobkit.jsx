import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { CURB } from '../config/jobs.js'

// Small building kit for the Employment District: walls with door and window openings, an
// interior visibility gate, and a few shared fixtures.

const FACES = ['+x', '-x', '+y', '-y', '+z', '-z'] // BoxGeometry face order
export const wallMats = (ext, int, inward) => FACES.map((f) => (f === inward ? int : ext))

/**
 * Interiors are only drawn while the camera is inside (or close to) the building.
 * `pad` widens the box so the doorway view isn't cut off.
 */
export function Gate({ x0, x1, z0, z1, pad = 0.5, children }) {
  const ref = useRef()
  const { camera } = useThree()
  useFrame(() => {
    const c = camera.position
    if (ref.current) ref.current.visible = c.x > x0 - pad && c.x < x1 + pad && c.z > z0 - pad && c.z < z1 + pad
  })
  return <group ref={ref} userData={{ noBatch: true }}>{children}</group>
}

const glassMat = new THREE.MeshPhysicalMaterial({ color: '#bcd7e6', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
const frameMat = new THREE.MeshStandardMaterial({ color: '#1b1b1f', roughness: 0.4, metalness: 0.6 })

/**
 * One wall of a rectangular building.
 *  side: 's' (low z) | 'n' (high z) | 'w' (low x) | 'e' (high x); rect is the building's outer footprint.
 *  openings: [{ at, half, h?, glass?, sill? }] positions along the wall. Without `glass` it is a doorway
 *  (lintel above h, default 3.6); with `glass` it is a window (sill below, glass pane, header above).
 */
export function Wall({ side, rect, h, t = 0.4, openings = [], ext, int, y = CURB, invisible = false }) {
  const { x0, x1, z0, z1 } = rect
  const alongX = side === 's' || side === 'n'
  const lo = alongX ? x0 : z0
  const hi = alongX ? x1 : z1
  const fixed = side === 's' ? z0 + t / 2 : side === 'n' ? z1 - t / 2 : side === 'w' ? x0 + t / 2 : x1 - t / 2
  const inward = side === 's' ? '+z' : side === 'n' ? '-z' : side === 'w' ? '+x' : '-x'
  const material = useMemo(() => wallMats(ext, int, inward), [ext, int, inward])
  const pieces = []
  let cur = lo
  for (const o of [...openings].sort((p, q) => p.at - q.at)) {
    const a = o.at - o.half, b = o.at + o.half
    if (a > cur) pieces.push({ a: cur, b: a, y0: 0, y1: h })
    const top = o.h ?? 3.6
    if (o.glass) {
      const sill = o.sill ?? 0.9
      pieces.push({ a, b, y0: 0, y1: sill }, { a, b, y0: top, y1: h }, { a, b, y0: sill, y1: top, glass: true })
    } else pieces.push({ a, b, y0: top, y1: h })
    cur = b
  }
  if (cur < hi) pieces.push({ a: cur, b: hi, y0: 0, y1: h })

  const place = (p) => {
    const len = p.b - p.a, hh = p.y1 - p.y0
    const mid = (p.a + p.b) / 2
    const pos = alongX ? [mid, y + p.y0 + hh / 2, fixed] : [fixed, y + p.y0 + hh / 2, mid]
    const size = alongX ? [len, hh, t] : [t, hh, len]
    return { pos, size }
  }
  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        {pieces.map((p, i) => {
          const { pos, size } = place(p)
          return <CuboidCollider key={i} args={[size[0] / 2, size[1] / 2, size[2] / 2]} position={pos} />
        })}
      </RigidBody>
      {!invisible && pieces.map((p, i) => {
        const { pos, size } = place(p)
        if (p.glass) {
          const len = p.b - p.a
          const n = Math.max(1, Math.round(len / 1.6))
          const gsize = alongX ? [len, size[1], 0.05] : [0.05, size[1], len]
          return (
            <group key={i}>
              <mesh position={pos} material={glassMat} userData={{ noBatch: true }}><boxGeometry args={gsize} /></mesh>
              {Array.from({ length: n + 1 }, (_, k) => {
                const m = p.a + (len * k) / n
                const mp = alongX ? [m, pos[1], fixed] : [fixed, pos[1], m]
                const ms = alongX ? [0.07, size[1], 0.12] : [0.12, size[1], 0.07]
                return <mesh key={k} position={mp} material={frameMat}><boxGeometry args={ms} /></mesh>
              })}
            </group>
          )
        }
        return <mesh key={i} position={pos} material={material} castShadow receiveShadow><boxGeometry args={size} /></mesh>
      })}
    </>
  )
}

/** A solid box with a collider. */
export function Block({ position, size, material, collide = true, cast = true }) {
  return (
    <group position={position}>
      {collide && <RigidBody type="fixed" colliders={false}><CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} /></RigidBody>}
      <mesh material={material} castShadow={cast} receiveShadow><boxGeometry args={size} /></mesh>
    </group>
  )
}

/** Wall-mounted or free-standing kiosk: a body, a glowing screen and a label. Faces local +z. */
export function Kiosk({ position, yaw = 0, color = '#1b1b1f', screen = '#d9b86a', width = 0.6, height = 1.3, collide = true }) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {collide && <RigidBody type="fixed" colliders={false}><CuboidCollider args={[width / 2, height / 2, 0.2]} position={[0, height / 2, 0]} /></RigidBody>}
      <mesh position={[0, height / 2, 0]} castShadow><boxGeometry args={[width, height, 0.36]} /><meshStandardMaterial color={color} roughness={0.35} metalness={0.5} /></mesh>
      <mesh position={[0, height * 0.78, 0.19]} rotation={[-0.3, 0, 0]}><planeGeometry args={[width * 0.78, 0.3]} /><meshBasicMaterial color={screen} toneMapped={false} /></mesh>
    </group>
  )
}
