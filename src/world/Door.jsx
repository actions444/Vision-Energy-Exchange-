import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { registerInteractable } from '../state/runtime.js'
import { useStore } from '../state/store.js'
import { getMaterials, surface } from './materials.js'
import { facadeMats } from './facade/materials.js'

// A hinged door leaf with a real physics collider that swings with it.
// `hinge` is the hinge position, the leaf extends along its local +x by `width`.
// `baseYaw` orients the closed leaf, `openAngle` is the swing (sign chooses direction).
export function DoorLeaf({ hinge, width, height, baseYaw = 0, openAngle = 1.55, open, accent, thickness = 0.12, wood = false, style, finish }) {
  // style (decorating): 'wood' | 'glass' | 'black'
  if (style === 'glass') wood = false
  if (style === 'wood') wood = true
  const black = style === 'black'
  const body = useRef()
  const angle = useRef(0)
  const q = useMemo(() => new THREE.Quaternion(), [])
  const e = useMemo(() => new THREE.Euler(), [])
  const mats = getMaterials()
  const fm = finish === 'bronze' ? facadeMats() : null
  const glow = useMemo(() => (fm ? fm.brass : new THREE.MeshStandardMaterial({ color: accent, roughness: 0.3, metalness: 0.9 })), [accent, fm])

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
      <group userData={{ noBatch: true }}>
      {/* aluminium frame + glass panel + brass pull bar */}
      {(wood || black) && (
        <mesh position={[width / 2, height / 2, 0]} material={black ? mats.shared('doorBlack', () => new THREE.MeshPhysicalMaterial({ color: '#0e0e10', roughness: 0.18, clearcoat: 1 })) : surface('wood', 0.6, 1.2, { color: '#a07c5c' })} castShadow>
          <boxGeometry args={[width, height, thickness]} />
        </mesh>
      )}
      {!wood && !black && (
        <>
          {/* glass door: slim aluminium stiles and rails around a see-through pane, kick plate at the foot */}
          {(fm
            ? [[0.06, height / 2, 0.12, height], [width - 0.06, height / 2, 0.12, height], [width / 2, height - 0.07, width, 0.14], [width / 2, 0.17, width, 0.34], [width / 2, height * 0.5, width, 0.05]]
            : [[0.05, height / 2, 0.1, height], [width - 0.05, height / 2, 0.1, height], [width / 2, height - 0.06, width, 0.12], [width / 2, 0.14, width, 0.28]]
          ).map(([x, y, sx, sy], i) => (
            <mesh key={i} position={[x, y, 0]} material={fm ? fm.bronze : mats.aluminum} castShadow><boxGeometry args={[sx, sy, thickness]} /></mesh>
          ))}
          <mesh position={[width / 2, (height - 0.12 + 0.28) / 2, 0]} material={fm ? fm.glass : mats.glass}>
            <boxGeometry args={[width - 0.2, height - 0.4, 0.03]} />
          </mesh>
        </>
      )}
      <mesh position={[width - 0.12, height * 0.45, 0]} material={glow}>
        <boxGeometry args={[0.04, wood ? 0.3 : Math.min(1.3, height * 0.4), thickness + 0.12]} />
      </mesh>
      </group>
    </RigidBody>
  )
}

/**
 * Double door with one shared interaction point.
 * center: doorway centre on the floor; halfWidth: half the opening; facing: yaw of the outward normal.
 * Doors swing inward (away from `facing`).
 */
export function DoubleDoor({ id, center, halfWidth, height, facing = 0, accent = '#a33cff', label = 'doors', finish }) {
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
      <DoorLeaf hinge={leftHinge} width={halfWidth} height={height} baseYaw={facing} openAngle={1.6} open={open} accent={accent} finish={finish} />
      <DoorLeaf hinge={rightHinge} width={halfWidth} height={height} baseYaw={facing + Math.PI} openAngle={-1.6} open={open} accent={accent} finish={finish} />
    </>
  )
}

/**
 * Single hinged room door. `hinge` is the hinge position on the floor; the leaf extends along
 * local +x (rotated by baseYaw) for `width`; openAngle's sign picks the swing direction.
 * `check` (optional, async) can refuse opening, e.g. a rented private room: () => ({ ok, reason }).
 */
export function SingleDoor({ id, hinge, width = 1.1, height = 2.3, baseYaw = 0, openAngle = 1.5, label = 'door', check, lockedLabel, style }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const st = useRef({ open, busy, locked: false })
  st.current.open = open
  st.current.busy = busy
  st.current.check = check
  st.current.lockedLabel = lockedLabel
  const c = Math.cos(baseYaw), s = Math.sin(baseYaw)
  const mid = new THREE.Vector3(hinge[0] + (c * width) / 2, hinge[1], hinge[2] - (s * width) / 2)

  useEffect(() => registerInteractable(id, {
    position: mid,
    radius: 1.9,
    label: () => (st.current.busy ? 'Checking access…' : st.current.open ? `Close ${label}` : st.current.lockedLabel?.() || `Open ${label}`),
    onInteract: async () => {
      if (st.current.busy) return
      if (st.current.open || !st.current.check) { setOpen((o) => !o); return }
      setBusy(true)
      try {
        const r = await st.current.check()
        if (r.ok) setOpen(true)
        else useStore.getState().showToast(r.reason || 'This door is locked.')
      } catch {
        useStore.getState().showToast('Could not check access right now.')
      } finally {
        setBusy(false)
      }
    },
  }), [id, label]) // eslint-disable-line react-hooks/exhaustive-deps

  return <DoorLeaf hinge={hinge} width={width} height={height} baseYaw={baseYaw} openAngle={openAngle} open={open} accent="#c9a96a" thickness={0.06} wood style={style} />
}
