import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { playerState } from '../../state/runtime.js'
import { registerSeat } from '../../state/seats.js'
import { OMEGA, clockT } from '../../config/workout.js'
import { GYM_FLOOR, GYM_AREA } from '../../config/gym.js'

// Shared parts for the gym: materials, canvas textures, the animation hook that keeps every machine in step with whoever
// is using it, and a one-line way to register a workout station. All art is procedural.

export const FLY = GYM_FLOOR
export const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }

export function canvasTex(w, h, draw, { repeat, aniso = 4, srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = aniso
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]) }
  return t
}

const std = (color, rough = 0.5, metal = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra })

let _M = null
/** Shared gym materials (created once). */
export function gm() {
  if (_M) return _M
  const plate = (c) => std(c, 0.45, 0.45)
  _M = {
    steel: std('#9ea4ac', 0.34, 0.9), chrome: std('#d8dde3', 0.14, 1), black: std('#16171b', 0.45, 0.55), matteBlack: std('#0f1013', 0.7, 0.2),
    frame: std('#202228', 0.4, 0.6), frameRed: std('#c42a2f', 0.4, 0.5), frameBlue: std('#1e55c4', 0.4, 0.5), frameWhite: std('#e9ebee', 0.4, 0.3),
    pad: std('#101114', 0.62), padRed: std('#b3202a', 0.55), padBlue: std('#1f4fb5', 0.55), padGrey: std('#3b3f47', 0.65),
    rubber: std('#1a1c20', 0.92), grip: std('#0b0c0e', 0.95),
    plateBlack: plate('#141416'), plateRed: plate('#c82d2d'), plateBlue: plate('#2a58c8'), plateYellow: plate('#e4b92a'), plateGreen: plate('#2c9b4a'),
    weight: std('#2b2e34', 0.4, 0.75), weightSel: std('#d7a21e', 0.35, 0.7),
    neonTeal: new THREE.MeshStandardMaterial({ color: '#0e2a2a', emissive: '#1de9d6', emissiveIntensity: 1.8, toneMapped: false }),
    neonPurple: new THREE.MeshStandardMaterial({ color: '#1c0f2b', emissive: '#a33cff', emissiveIntensity: 1.8, toneMapped: false }),
    neonRed: new THREE.MeshStandardMaterial({ color: '#2a0c0c', emissive: '#ff3b3b', emissiveIntensity: 1.6, toneMapped: false }),
    screen: new THREE.MeshBasicMaterial({ color: '#7fe9ff', toneMapped: false }),
    screenOff: std('#06080b', 0.2, 0.2),
    glass: new THREE.MeshPhysicalMaterial({ color: '#bcd7e6', roughness: 0.04, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }),
    wood: std('#a9774c', 0.6), woodDark: std('#6e4a2d', 0.6), cedar: std('#b98a56', 0.7),
    towel: std('#f1f1f4', 0.95), white: std('#f4f5f7', 0.5), chalk: std('#ececec', 0.9),
    kettle: std('#1b1c20', 0.45, 0.6), ball: std('#c4472b', 0.7), mat: std('#2b9d9a', 0.9),
  }
  return _M
}

// ---------------------------------------------------------------- textures
let _T = null
export function gymTextures() {
  if (_T) return _T
  _T = {
    floor: canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#4a4f59'; g.fillRect(0, 0, w, h)
      for (let i = 0; i < 2600; i++) { const v = 55 + hash(i) * 60; g.fillStyle = `rgba(${v},${v + 2},${v + 8},0.55)`; g.fillRect(hash(i * 2.1) * w, hash(i * 3.7) * h, 2 + hash(i * 5.1) * 3, 2 + hash(i * 7.3) * 3) }
      for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${hash(i) > 0.5 ? '210,110,60' : '70,160,190'},0.35)`; g.fillRect(hash(i * 9.1) * w, hash(i * 4.3) * h, 3, 3) }
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 3; g.strokeRect(1, 1, w - 2, h - 2)
    }, { repeat: [34, 30] }),
    belt: canvasTex(64, 128, (g, w, h) => {
      g.fillStyle = '#17181c'; g.fillRect(0, 0, w, h)
      g.fillStyle = '#2a2c33'; for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 6)
      g.fillStyle = '#d8d8dc'; g.fillRect(2, 0, 3, h); g.fillRect(w - 5, 0, 3, h)
    }, { repeat: [1, 8] }),
    mirror: canvasTex(512, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h)
      gr.addColorStop(0, '#d3e4ee'); gr.addColorStop(0.45, '#9fbdcf'); gr.addColorStop(0.5, '#e6f1f7'); gr.addColorStop(1, '#8aa9bd')
      g.fillStyle = gr; g.fillRect(0, 0, w, h)
      g.fillStyle = 'rgba(255,255,255,0.16)'; g.beginPath(); g.moveTo(w * 0.1, 0); g.lineTo(w * 0.28, 0); g.lineTo(w * 0.1 + 40, h); g.lineTo(w * 0.1 - 60, h); g.fill()
    }),
    wall: canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#d9d9dc'; g.fillRect(0, 0, w, h)
      for (let i = 0; i < 1800; i++) { const v = 190 + hash(i) * 50; g.fillStyle = `rgba(${v},${v},${v + 4},0.18)`; g.fillRect(hash(i * 2.9) * w, hash(i * 1.7) * h, 3, 3) }
      g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h)
    }, { repeat: [10, 2] }),
    turf: canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#2f8a48'; g.fillRect(0, 0, w, h)
      for (let i = 0; i < 3000; i++) { g.fillStyle = hash(i) > 0.5 ? '#3a9d54' : '#25733b'; g.fillRect(hash(i * 2.3) * w, hash(i * 4.1) * h, 2, 5) }
      g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(0, h * 0.5 - 3, w, 6)
    }, { repeat: [1, 1] }),
    scenic: canvasTex(1024, 256, (g, w, h) => { // a long scenic video strip for the TVs
      const sky = g.createLinearGradient(0, 0, 0, h * 0.6); sky.addColorStop(0, '#2d6bd6'); sky.addColorStop(1, '#f2c9a0')
      g.fillStyle = sky; g.fillRect(0, 0, w, h)
      for (let layer = 0; layer < 3; layer++) {
        g.fillStyle = ['#7f6f9c', '#5b5278', '#2f3a52'][layer]
        g.beginPath(); g.moveTo(0, h)
        for (let x = 0; x <= w; x += 16) g.lineTo(x, h * (0.5 + layer * 0.12) - Math.abs(Math.sin(x * 0.011 + layer * 2)) * 60 - Math.sin(x * 0.03 + layer) * 10)
        g.lineTo(w, h); g.fill()
      }
      g.fillStyle = '#ffeaa0'; g.beginPath(); g.arc(w * 0.72, h * 0.28, 26, 0, 7); g.fill()
      g.fillStyle = '#243024'; g.fillRect(0, h * 0.86, w, h * 0.14)
    }, { repeat: [0.5, 1] }),
  }
  _T.scenic.wrapS = THREE.RepeatWrapping
  return _T
}

// ---------------------------------------------------------------- animation sync
/** True while the camera is near enough for the gym to be worth animating (set once per frame by the tracker). */
export const gymNear = { v: false }

/**
 * `ref.current = { w, ph }` kept up to date every frame: w eases 0..1 while the machine is in use (by the player on this
 * station, or always for `auto` machines used by scripted members); ph is the phase of the shared workout clock.
 */
export function useUse(id, kind, auto = false, rate = 6) {
  const st = useRef({ w: auto ? 1 : 0, ph: 0, using: false })
  useFrame((_, dt) => {
    if (!gymNear.v) return
    const s = st.current
    s.using = auto || playerState.seated?.id === id
    const target = s.using ? 1 : 0
    if (Math.abs(s.w - target) > 0.001) s.w += (target - s.w) * (1 - Math.exp(-rate * Math.min(dt, 0.1)))
    else s.w = target
    s.ph = clockT() * (OMEGA[kind] || 3)
  })
  return st
}

/** Local → world for a station offset in a machine's frame (x lateral, z forward), given the machine at [x, z] with yaw. */
export function stationPos(x, z, yaw, lx, lz) {
  const c = Math.cos(yaw), s = Math.sin(yaw)
  return [x + lx * c + lz * s, z - lx * s + lz * c]
}

/**
 * Register a workout station (a seat the player is locked to).
 * `seated` stations put the avatar on a seat of height `h` above `floorY`; standing ones have h = 0 and noSit.
 */
export function registerStation({ id, label, kind, x, z, yaw, lx = 0, lz = 0, y, h = 0, seated = false, radius = 1.7, stand, skip = false }) {
  if (skip) return undefined // machines used by scripted members are not for visitors
  const [px, pz] = stationPos(x, z, yaw, lx, lz)
  return registerSeat({ id, label, workout: kind, noSit: !seated, position: [px, y + h, pz], yaw, height: h, radius, stand })
}

// ---------------------------------------------------------------- tiny element helpers
export const Box = ({ p = [0, 0, 0], s, m, r, cast = false }) => <mesh position={p} rotation={r} material={m} castShadow={cast}><boxGeometry args={s} /></mesh>
export const Cyl = ({ p = [0, 0, 0], r = [0.05, 0.05], h = 0.1, m, rot, seg = 14 }) => <mesh position={p} rotation={rot} material={m}><cylinderGeometry args={[r[0], r[1], h, seg]} /></mesh>

/** A rod between two local points. */
export function Rod({ a, b, r = 0.02, m, seg = 8 }) {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b)
    const d = vb.clone().sub(va), len = d.length()
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())
    return { pos: va.clone().add(vb).multiplyScalar(0.5), quat: q, len }
  }, [a[0], a[1], a[2], b[0], b[1], b[2]]) // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh position={pos} quaternion={quat} material={m}><cylinderGeometry args={[r, r, len, seg]} /></mesh>
}

/** Fixed collider box in a machine's local frame. */
export function Hull({ size, pos = [0, 0, 0] }) {
  return <RigidBody type="fixed" colliders={false}><CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} position={pos} /></RigidBody>
}

/** The shared canvas-text label (small console screens, signs). */
export function textTex(lines, w = 256, h = 96, { bg = '#07151a', fg = '#7fe9ff', font = '700 34px system-ui, sans-serif' } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h)
    g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'
    lines.forEach((t, i) => g.fillText(t, w / 2, (h * (i + 1)) / (lines.length + 1)))
  })
}

export { GYM_AREA }
