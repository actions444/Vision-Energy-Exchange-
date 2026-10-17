import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useCine, cine, stopCine } from '../state/cine.js'
import { cameraState } from '../state/runtime.js'
import { mansionState } from '../config/mansion.js'
import { DURATION, actor, cameraAt, captionAt, doorsOpenAt, fadeAt, titleAt } from '../config/cine.js'
import Avatar from '../player/Avatar.jsx'

// Plays the "Stay" duet: moves the camera along the shot list, puppets the two actors, drives
// the doors, captions and fade. All timing comes from config/cine.js (a pure function of cine.t).

const TRINITY = { accent: '#e07bff', skin: '#a8714f', outfit: { version: 1, suit: '#6a2bb8', pants: '#6a2bb8', trim: '#e9c46a' }, look: { social: true, build: 'f', gown: '#6a2bb8', longHair: true, hair: '#150a12', eyes: '#5a3a22', lips: '#a8325c', noVisor: true } }
const ZION = { accent: '#e8e8f0', skin: '#6a4230', outfit: { version: 1, suit: '#0a0a0e', pants: '#0a0a0e', trim: '#8a63d8' }, look: { social: true, build: 'm', beard: true, hair: '#08070a', eyes: '#2a1a10', shirt: '#f6f4f1', tie: '#111116', noVisor: true } }

function Actor({ who, cfg }) {
  const g = useRef()
  const state = useMemo(() => ({ speed: 0, grounded: true, emote: null, sit: 0, sitHeight: 0.45, sing: 0, gesture: null }), [])
  useFrame(() => {
    const a = actor(who, cine.t)
    g.current.position.set(a.x, a.y, a.z)
    g.current.rotation.y = a.yaw
    state.speed = a.speed; state.sing = a.sing; state.gesture = a.gesture
  })
  return <group ref={g}><Avatar state={state} accent={cfg.accent} skin={cfg.skin} outfit={cfg.outfit} look={cfg.look} /></group>
}

/** Film lighting: a warm key from the camera side and a cool rim from behind the singers, re-aimed every frame. */
function CineLights() {
  const key = useRef(), rim = useRef(), fill = useRef()
  useFrame(() => {
    const T = actor('t', cine.t), Z = actor('z', cine.t)
    const mx = (T.x + Z.x) / 2, my = (T.y + Z.y) / 2 + 1.3, mz = (T.z + Z.z) / 2
    const c = cameraState.override
    const cx = c?.pos?.[0] ?? mx, cz = c?.pos?.[2] ?? mz + 4
    let dx = cx - mx, dz = cz - mz
    const d = Math.hypot(dx, dz) || 1
    dx /= d; dz /= d
    if (key.current) key.current.position.set(mx + dx * 2.6 - dz * 1.4, my + 1.2, mz + dz * 2.6 + dx * 1.4)
    if (rim.current) rim.current.position.set(mx - dx * 2.4 + dz * 1.2, my + 1.0, mz - dz * 2.4 - dx * 1.2)
    if (fill.current) fill.current.position.set(mx + dx * 3 + dz * 2.5, my - 0.2, mz + dz * 3 - dx * 2.5)
  })
  return (
    <>
      <pointLight ref={key} color="#ffcf9c" intensity={6} distance={11} decay={1.6} />
      <pointLight ref={rim} color="#8fb6ff" intensity={12} distance={10} decay={1.6} />
      <pointLight ref={fill} color="#d9a8ff" intensity={2.5} distance={9} decay={1.8} />
    </>
  )
}

/** Keeps the depth-of-field focus on whatever the camera is looking at. */
export function CineFocus({ dofRef }) {
  useFrame(() => {
    const dof = dofRef.current
    const c = cameraState.override
    if (!dof || !c || !useCine.getState().active) return
    const d = Math.hypot(c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2])
    dof.circleOfConfusionMaterial.worldFocusDistance = Math.max(0.5, d)
  })
  return null
}

export default function CineStage() {
  const active = useCine((s) => s.active)
  const { camera } = useThree()
  const last = useRef({ fade: -1, title: -1, cap: null, shot: 0 })

  useFrame((_, dtRaw) => {
    if (!useCine.getState().active) return
    if (!cine.hold) cine.t += Math.min(dtRaw, 0.1)
    if (cine.t >= DURATION) { stopCine(); return }
    const t = cine.t
    const c = cameraAt(t)
    cameraState.override = { pos: c.pos, look: c.look }
    if (Math.abs(camera.fov - c.fov) > 0.01) { camera.fov = c.fov; camera.updateProjectionMatrix() }
    mansionState.doorsForce = doorsOpenAt(t)
    const cap = captionAt(t), fade = Math.round(fadeAt(t) * 50) / 50, title = Math.round(titleAt(t) * 50) / 50
    const L = last.current
    if (cap !== L.cap || fade !== L.fade || title !== L.title || c.shot !== L.shot) {
      L.cap = cap; L.fade = fade; L.title = title; L.shot = c.shot
      useCine.setState({ caption: cap ? { text: cap.text, who: cap.who } : null, fade, title, shot: c.shot })
    }
  })

  if (!active) return null
  return (
    <>
      <Actor who="t" cfg={TRINITY} />
      <Actor who="z" cfg={ZION} />
      <CineLights />
    </>
  )
}
