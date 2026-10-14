import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { canvasTexture } from './canvasText.js'
import { elevator, useElevatorUI, arrivalListeners } from './elevator.js'
import { PLAZA, P, ELEVATOR } from '../config/plaza.js'
import { registerInteractable, playerState } from '../state/runtime.js'
import { audioCore } from '../audio/core.js'
import { FONTS } from '../config/theme.js'

// Elevator lighting: LED ceiling strips and a gold kick strip in the car, illuminated floor
// buttons, floor-number displays (in the car and above every hall door), door-frame lighting,
// up/down arrival lanterns and an arrival chime. Purely visual/audio: movement and controls
// stay in elevator.js and PlazaBuilding.jsx.

const LIT = '#ffd27a'
const OFF = '#2a2b30'

/** One texture shared by every display: current floor + travel arrow. */
let displayTex = null
let shown = ''
function display() {
  if (!displayTex) displayTex = canvasTexture(256, 128, () => {})
  return displayTex
}
function drawDisplay(floor, dir) {
  const key = floor + ':' + dir
  if (key === shown) return
  shown = key
  const tex = display()
  const ctx = tex.image.getContext('2d')
  ctx.fillStyle = '#07080b'; ctx.fillRect(0, 0, 256, 128)
  ctx.fillStyle = '#7ef0e2'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = `800 84px ${FONTS.mono}`
  ctx.fillText(String(floor + 1), 150, 68)
  if (dir) {
    ctx.fillStyle = dir > 0 ? '#7ef0a0' : '#ffb3a0'
    ctx.beginPath()
    if (dir > 0) { ctx.moveTo(56, 40); ctx.lineTo(84, 84); ctx.lineTo(28, 84) } else { ctx.moveTo(56, 88); ctx.lineTo(84, 44); ctx.lineTo(28, 44) }
    ctx.fill()
  }
  tex.needsUpdate = true
}

const mat = (color, intensity) => new THREE.MeshStandardMaterial({ color: '#1a1b1f', emissive: color, emissiveIntensity: intensity, toneMapped: false, roughness: 0.4 })

/** Ding-dong (up) or single ding (down), only audible near the shaft on that floor or in the car. */
function chime(dir) {
  try {
    const core = audioCore()
    if (core.ctx.state !== 'running') return
    const t0 = core.ctx.currentTime + 0.02
    const notes = dir < 0 ? [880 * 0.75] : [880, 880 * 0.8]
    notes.forEach((f, i) => {
      const o = core.ctx.createOscillator(), g = core.ctx.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, t0 + i * 0.32)
      g.gain.linearRampToValueAtTime(0.18, t0 + i * 0.32 + 0.01)
      g.gain.exponentialRampToValueAtTime(0.001, t0 + i * 0.32 + 1.2)
      o.connect(g).connect(core.sum)
      o.start(t0 + i * 0.32); o.stop(t0 + i * 0.32 + 1.25)
    })
  } catch {}
}

/** Lights that live inside the moving car (render as children of the car's rigid body). */
export function CarLights({ cw, cd }) {
  const strip = useMemo(() => mat('#f4f7ff', 2.2), [])
  const kick = useMemo(() => mat('#c9a96a', 1.6), [])
  const buttons = useMemo(() => Array.from({ length: PLAZA.floors }, () => mat(LIT, 0)), [])
  const dispMat = useMemo(() => new THREE.MeshBasicMaterial({ map: display(), toneMapped: false }), [])
  useFrame(() => {
    const ui = useElevatorUI.getState()
    buttons.forEach((m, f) => { m.emissiveIntensity = ui.lit.includes(f) ? 2.4 : 0.15 })
    drawDisplay(ui.floor, ui.direction)
  })
  const y = 2.47
  const n = PLAZA.floors
  return (
    <group>
      {/* LED strips around the ceiling edge and along the floor */}
      {[[0, -cd / 2 + 0.08, cw - 0.2, 0.03], [0, cd / 2 - 0.08, cw - 0.2, 0.03]].map(([x, z, w, d], i) => <mesh key={'s' + i} position={[x, y, z]} material={strip}><boxGeometry args={[w, 0.02, d]} /></mesh>)}
      {[-1, 1].map((s) => <mesh key={'sx' + s} position={[s * (cw / 2 - 0.08), y, 0]} material={strip}><boxGeometry args={[0.03, 0.02, cd - 0.2]} /></mesh>)}
      {[-1, 1].map((s) => <mesh key={'k' + s} position={[s * (cw / 2 - 0.06), 0.06, 0]} material={kick}><boxGeometry args={[0.02, 0.025, cd - 0.3]} /></mesh>)}
      <mesh position={[0, 0.06, cd / 2 - 0.06]} material={kick}><boxGeometry args={[cw - 0.3, 0.025, 0.02]} /></mesh>
      {/* car operating panel: display + one illuminated button per floor */}
      <group position={[cw / 2 - 0.05, 1.25, -cd / 2 + 0.55]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0, -0.005]}><boxGeometry args={[0.32, 0.9, 0.02]} /><meshStandardMaterial color="#c9ccd2" metalness={1} roughness={0.25} /></mesh>
        <mesh position={[0, 0.32, 0.007]} material={dispMat}><planeGeometry args={[0.22, 0.11]} /></mesh>
        {Array.from({ length: n }, (_, f) => (
          <mesh key={f} position={[(f % 2 ? 0.06 : -0.06), 0.12 - Math.floor(f / 2) * 0.1, 0.012]} rotation={[Math.PI / 2, 0, 0]} material={buttons[f]}>
            <cylinderGeometry args={[0.03, 0.03, 0.012, 20]} />
          </mesh>
        ))}
      </group>
      {/* the display also faces the doors, above them */}
      <mesh position={[0, 2.3, -cd / 2 + 0.07]} material={dispMat}><planeGeometry args={[0.36, 0.18]} /></mesh>
    </group>
  )
}

/** Hall fixtures on every floor: position display, lanterns, lit call button, door-frame light. */
export function HallLights() {
  const n = PLAZA.floors
  const call = useMemo(() => Array.from({ length: n }, () => mat(LIT, 0.15)), [n])
  const up = useMemo(() => Array.from({ length: n }, () => mat('#5dff9a', 0)), [n])
  const down = useMemo(() => Array.from({ length: n }, () => mat('#ff6a5a', 0)), [n])
  const frame = useMemo(() => Array.from({ length: n }, () => mat('#ffe7c2', 0.4)), [n])
  const dispMat = useMemo(() => new THREE.MeshBasicMaterial({ map: display(), toneMapped: false }), [])
  const arrival = useRef(null)
  useEffect(() => {
    const on = (a) => {
      arrival.current = a
      // chime only for people near this floor's doors or inside the car
      const p = playerState.position
      const near = Math.abs(p.y - P.Y(a.floor)) < 2 && Math.hypot(p.x - P.X((ELEVATOR.u0 + ELEVATOR.u1) / 2), p.z - P.Z(ELEVATOR.v0)) < 9
      if (near) chime(a.dir)
    }
    arrivalListeners.add(on)
    return () => arrivalListeners.delete(on)
  }, [])
  useFrame(() => {
    const ui = useElevatorUI.getState()
    const a = arrival.current
    const fresh = a && performance.now() - a.at < 6000
    for (let f = 0; f < n; f++) {
      call[f].emissiveIntensity = ui.lit.includes(f) ? 2.4 : 0.15
      const here = fresh && a.floor === f
      const blink = here ? 1.6 + Math.sin(performance.now() / 120) * 0.6 : 0
      up[f].emissiveIntensity = here && a.dir >= 0 ? blink : 0.05
      down[f].emissiveIntensity = here && a.dir <= 0 ? blink : 0.05
      const open = Math.abs(elevator.y - P.Y(f)) < 0.01 ? elevator.door : 0
      frame[f].emissiveIntensity = 0.4 + open * 2.2
    }
  })
  const cx = P.X((ELEVATOR.doorU0 + ELEVATOR.doorU1) / 2)
  const z = P.Z(ELEVATOR.v0 - 0.2)
  const dw = ELEVATOR.doorU1 - ELEVATOR.doorU0
  return Array.from({ length: n }, (_, f) => {
    const y = P.Y(f)
    return (
      <group key={f}>
        {/* position indicator above the door (faces the corridor: -z) */}
        <mesh position={[cx, y + ELEVATOR.doorH + 0.25, z - 0.03]} rotation={[0, Math.PI, 0]} material={dispMat}><planeGeometry args={[0.44, 0.22]} /></mesh>
        {/* arrival lanterns beside the door */}
        <mesh position={[P.X(ELEVATOR.doorU0 - 0.25), y + 1.95, z - 0.03]} rotation={[0, Math.PI, 0]} material={up[f]}><circleGeometry args={[0.07, 3]} /></mesh>
        <mesh position={[P.X(ELEVATOR.doorU0 - 0.25), y + 1.72, z - 0.03]} rotation={[0, Math.PI, Math.PI]} material={down[f]}><circleGeometry args={[0.07, 3]} /></mesh>
        {/* lit call button (sits on the existing call plate) */}
        <mesh position={[P.X(ELEVATOR.doorU1 + 0.25), y + 1.15, z + 0.015]} rotation={[Math.PI / 2, 0, 0]} material={call[f]}><cylinderGeometry args={[0.035, 0.035, 0.015, 20]} /></mesh>
        {/* door-frame light strips: brighten while the doors are open on this floor */}
        <mesh position={[cx, y + ELEVATOR.doorH + 0.005, z - 0.035]} material={frame[f]}><boxGeometry args={[dw, 0.02, 0.02]} /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[cx + s * (dw / 2 + 0.005), y + ELEVATOR.doorH / 2, z - 0.035]} material={frame[f]}><boxGeometry args={[0.02, ELEVATOR.doorH, 0.02]} /></mesh>)}
      </group>
    )
  })
}
