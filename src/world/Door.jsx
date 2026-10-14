import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { registerInteractable } from '../state/runtime.js'
import { getMaterials } from './materials.js'

// A hinged door leaf with a real physics collider that swings with it.
// `hinge` is the hinge position, the leaf extends along its local +x by `width`.
// `baseYaw` orients the closed leaf, `openAngle` is the swing (sign chooses direction).
export function DoorLeaf({ hinge, width, height, baseYaw = 0, openAngle = 1.55, open, accent, thickness = 0.12 }) {
  const body = useRef()
  const angle = useRef(0)
  const q = useMemo(() => new THREE.Quaternion(), [])
  const e = useMemo(() => new THREE.Euler(), [])
  const mats = getMaterials()
  const glow = useMemo(() => mats.neon(accent, 2.5), [accent, mats])

  useFrame((_, dt) => {
    const target = open ? openAngle : 0
    angle.current += (target - angle.current) * (1 - Math.exp(-4 * Math.min(dt, 0.05)))
    e.set(0, baseYaw + angle.current, 0)
    q.setFromEuler(e)
    body.current?.setNextKinematicRotation(q)
  })

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={hinge} rotation={[0, baseYaw, 0]}>
      <CuboidCollider args={[width / 2, height / 2, thickness / 2]} position={[width / 2, height / 2, 0]} />
      {/* frame + smoked glass panel + neon pull bar */}
      <mesh position={[width / 2, height / 2, 0]} material={mats.darkMetal} castShadow>
        <boxGeometry args={[width, height, thickness]} />
      </mesh>
      <mesh position={[width / 2, height / 2 + 0.1, 0]} material={mats.glass}>
        <boxGeometry args={[width - 0.3, height - 0.6, thickness + 0.02]} />
      </mesh>
      <mesh position={[width - 0.22, height / 2, 0]} material={glow}>
        <boxGeometry args={[0.05, 1.3, thickness + 0.14]} />
      </mesh>
    </RigidBody>
  )
}

/**
 * Double door with one shared interaction point.
 * center: doorway centre on the floor; halfWidth: half the opening; facing: yaw of the outward normal.
 * Doors swing inward (away from `facing`).
 */
export function DoubleDoor({ id, center, halfWidth, height, facing = 0, accent = '#a33cff', label = 'doors' }) {
  const [open, setOpen] = useState(false)
  const openRef = useRef(open)
  openRef.current = open

  const cos = Math.cos(facing), sin = Math.sin(facing)
  // local x axis of the doorway (to the right when looking at the facade from outside)
  const right = [cos, 0, -sin]
  const leftHinge = [center[0] - right[0] * halfWidth, center[1], center[2] - right[2] * halfWidth]
  const rightHinge = [center[0] + right[0] * halfWidth, center[1], center[2] + right[2] * halfWidth]

  useEffect(() => registerInteractable(id, {
    position: new THREE.Vector3(center[0], center[1] + 1, center[2]),
    radius: 2.8,
    label: () => (openRef.current ? `Close ${label}` : `Open ${label}`),
    onInteract: () => setOpen((o) => !o),
  }), [id, center, label])

  return (
    <>
      <DoorLeaf hinge={leftHinge} width={halfWidth} height={height} baseYaw={facing} openAngle={1.6} open={open} accent={accent} />
      <DoorLeaf hinge={rightHinge} width={halfWidth} height={height} baseYaw={facing + Math.PI} openAngle={-1.6} open={open} accent={accent} />
    </>
  )
}
