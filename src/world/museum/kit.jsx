import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { surface } from '../materials.js'
import { nightLit } from '../../state/environment.js'
import { switchedMaterial } from '../../state/power.js'
import { registerInteractable } from '../../state/runtime.js'
import { useStore } from '../../state/store.js'
import { useMuseum } from '../../state/museum.js'
import { EXHIBIT, MUS_ZONE, MUS_FLOOR } from '../../config/museum.js'

// Shared pieces for the museum: canvas textures, materials, the exhibit placard (opens the info panel and stamps
// the passport), pedestals, glass cases and columns. Everything is built in code; there are no model files.

export const FY = MUS_FLOOR // finished floor height
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

// ---------------------------------------------------------------- textures
function veins(g, w, h, n, seed, color = 'rgba(120,112,100,', maxA = 0.35) {
  for (let i = 0; i < n; i++) {
    let x = hash(seed + i * 3.1) * w, y = hash(seed + i * 5.7) * h
    g.strokeStyle = color + (0.05 + hash(seed + i) * maxA) + ')'
    g.lineWidth = 0.5 + hash(seed + i * 2.2) * 1.6
    g.beginPath(); g.moveTo(x, y)
    let a = hash(seed + i * 7.7) * 6.28
    for (let k = 0; k < 14; k++) {
      a += (hash(seed + i * 11 + k) - 0.5) * 1.2
      x += Math.cos(a) * (14 + hash(seed + k * 3 + i) * 26); y += Math.sin(a) * (14 + hash(seed + k * 4 + i) * 26)
      g.lineTo(x, y)
    }
    g.stroke()
  }
}

/** Cream and grey checkered marble, 2x2 tiles per texture; repeat so one tile is ~1.6 m. */
export function marbleFloorTex(rx, ry) {
  return canvasTex(1024, 1024, (g, w, h) => {
    for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) {
      const dark = (tx + ty) % 2
      const x0 = tx * 512, y0 = ty * 512
      const grd = g.createLinearGradient(x0, y0, x0 + 512, y0 + 512)
      grd.addColorStop(0, dark ? '#bdb7ab' : '#f1ecde'); grd.addColorStop(1, dark ? '#aaa397' : '#e5dfcf')
      g.fillStyle = grd; g.fillRect(x0, y0, 512, 512)
      g.save(); g.beginPath(); g.rect(x0, y0, 512, 512); g.clip()
      g.translate(x0, y0); veins(g, 512, 512, 12, tx * 7 + ty * 13 + 1, dark ? 'rgba(90,85,78,' : 'rgba(150,140,120,', 0.3)
      g.restore()
    }
    g.fillStyle = 'rgba(70,60,45,0.55)'
    g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h); g.fillRect(w / 2 - 1.5, 0, 3, h); g.fillRect(0, h / 2 - 1.5, w, 3)
  }, { repeat: [rx, ry] })
}

/** Inlaid rotunda floor: compass star, rings, and thirteen stars for the original states. */
export function rotundaFloorTex() {
  return canvasTex(1536, 1536, (g, w, h) => {
    const cx = w / 2, cy = h / 2
    const R = w / 2 - 8
    const grd = g.createRadialGradient(cx, cy, 0, cx, cy, R)
    grd.addColorStop(0, '#f3eedf'); grd.addColorStop(1, '#e4dccb')
    g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill()
    g.save(); g.beginPath(); g.arc(cx, cy, R, 0, 7); g.clip(); veins(g, w, h, 40, 4, 'rgba(150,138,115,', 0.25); g.restore()
    const ring = (r, wd, col) => { g.strokeStyle = col; g.lineWidth = wd; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke() }
    ring(R - 6, 12, '#1f2f5c'); ring(R - 26, 4, '#c9a24a'); ring(R * 0.80, 6, '#c9a24a'); ring(R * 0.66, 10, '#a8322d'); ring(R * 0.66 - 14, 3, '#c9a24a'); ring(R * 0.30, 6, '#1f2f5c')
    // 16-point compass star
    const star = (r0, r1, n, col, a0 = -Math.PI / 2) => {
      g.fillStyle = col; g.beginPath()
      for (let i = 0; i < n * 2; i++) { const a = a0 + (i * Math.PI) / n, r = i % 2 ? r0 : r1; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) }
      g.closePath(); g.fill()
    }
    star(R * 0.10, R * 0.62, 8, '#1f2f5c')
    star(R * 0.08, R * 0.42, 8, '#c9a24a', -Math.PI / 2 + Math.PI / 8)
    star(R * 0.05, R * 0.28, 4, '#a8322d', -Math.PI / 2 + Math.PI / 4)
    g.fillStyle = '#c9a24a'; g.beginPath(); g.arc(cx, cy, R * 0.045, 0, 7); g.fill()
    // thirteen stars on the outer band
    for (let i = 0; i < 13; i++) {
      const a = -Math.PI / 2 + (i / 13) * Math.PI * 2, r = R * 0.9
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r
      g.fillStyle = '#1f2f5c'; g.beginPath()
      for (let k = 0; k < 10; k++) { const aa = a + Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? 11 : 26; g.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr) }
      g.closePath(); g.fill()
    }
  }, { aniso: 8 })
}

/** Aged paper with a heading and rows of handwriting-like strokes. */
export function parchmentTex(heading, lines, { w = 640, h = 800, sub, sig = true, seed = 3 } = {}) {
  return canvasTex(w, h, (g) => {
    const grd = g.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.8)
    grd.addColorStop(0, '#f1e3bd'); grd.addColorStop(1, '#cfb27a')
    g.fillStyle = grd; g.fillRect(0, 0, w, h)
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(110,80,40,${0.02 + hash(seed + i) * 0.04})`; g.beginPath(); g.arc(hash(seed + i * 2.1) * w, hash(seed + i * 4.3) * h, 4 + hash(seed + i * 6.1) * 22, 0, 7); g.fill() }
    g.strokeStyle = 'rgba(80,55,25,0.45)'; g.lineWidth = 3; g.strokeRect(22, 22, w - 44, h - 44)
    g.fillStyle = '#2b1d10'; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.font = `italic 700 ${Math.round(w * 0.075)}px Georgia, serif`
    heading.forEach((t, i) => g.fillText(t, w / 2, 90 + i * w * 0.09))
    if (sub) { g.font = `italic ${Math.round(w * 0.04)}px Georgia, serif`; g.fillText(sub, w / 2, 90 + heading.length * w * 0.09 + 18) }
    g.textAlign = 'left'; g.font = `italic ${Math.round(w * 0.034)}px Georgia, serif`
    const y0 = 90 + heading.length * w * 0.09 + (sub ? 54 : 24)
    const step = Math.round(w * 0.044)
    let y = y0
    for (const ln of lines) {
      if (y > h - 120) break
      if (typeof ln === 'string') { g.fillText(ln, 56, y) } else { // [x0, x1]: a stroke row
        g.strokeStyle = 'rgba(43,29,16,0.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(56, y)
        for (let x = 56; x < w - 56; x += 9) g.lineTo(x, y + Math.sin(x * 0.4 + y) * 2.4 + (hash(x + y) - 0.5) * 3)
        g.stroke()
      }
      y += step
    }
    if (sig) {
      g.strokeStyle = 'rgba(30,20,10,0.8)'; g.lineWidth = 2.2
      for (let i = 0; i < 5; i++) {
        g.beginPath(); const sx = 70 + (i % 3) * 170, sy = h - 90 + Math.floor(i / 3) * 30
        g.moveTo(sx, sy)
        for (let k = 1; k < 8; k++) g.quadraticCurveTo(sx + k * 14 - 6, sy - 18 + hash(i * 9 + k) * 36, sx + k * 14, sy + (hash(i * 3 + k) - 0.5) * 12)
        g.stroke()
      }
    }
  })
}

// ---------------------------------------------------------------- materials
let MM
export function mm() {
  if (MM) return MM
  const std = (color, roughness = 0.6, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra })
  MM = {
    stone: surface('limestone', 4, 2, { color: '#ece5d4' }),
    stoneSmooth: std('#ede7d8', 0.55),
    plaster: surface('plaster', 6, 2, { color: '#efe9db' }),
    walnut: surface('wood', 4, 2, { color: '#5a3a28' }),
    walnutSolid: std('#4a3022', 0.5),
    oak: surface('wood', 4, 2, { color: '#b58a5a' }),
    brass: std('#cfa94e', 0.28, 0.9),
    bronze: std('#7a5a34', 0.4, 0.85),
    chrome: std('#d4d8dc', 0.15, 1),
    steel: std('#8d9298', 0.35, 0.8),
    black: std('#1c1d20', 0.45, 0.2),
    blackGloss: new THREE.MeshPhysicalMaterial({ color: '#0e0e10', roughness: 0.12, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08 }),
    navy: std('#1f2f5c', 0.7),
    red: std('#a8322d', 0.7),
    velvet: std('#6e1f26', 0.95),
    white: std('#f2f0ea', 0.5),
    cream: std('#e9dfc6', 0.8),
    glass: new THREE.MeshPhysicalMaterial({ color: '#d6e6ee', roughness: 0.03, metalness: 0, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }),
    bone: std('#e6dabd', 0.7),
    rust: std('#7b4a30', 0.8, 0.3),
    canvas: std('#e6d9b8', 0.95, 0, { side: THREE.DoubleSide }),
    felt: std('#2a4a38', 0.95),
    ceiling: std('#f1ece0', 0.9),
    mgreen: std('#2f5a44', 0.7),
    lampGlow: nightLit(std('#fff3d6', 0.6, 0, { emissive: '#ffd89a', emissiveIntensity: 0.9 }), 1.4, 0.7),
  }
  return MM
}

/** An emissive display-light strip that follows the museum power zone. */
export function ledMat(color = '#fff2d8', on = 2.2) {
  return switchedMaterial(new THREE.MeshStandardMaterial({ color: '#fff', emissive: color, emissiveIntensity: on, toneMapped: false }), MUS_ZONE, on, 0.02)
}

// ---------------------------------------------------------------- placard
const placardTex = (e) => canvasTex(512, 256, (g, w, h) => {
  g.fillStyle = '#17202e'; g.fillRect(0, 0, w, h)
  g.strokeStyle = '#cfa94e'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20)
  g.textAlign = 'center'; g.fillStyle = '#cfa94e'; g.font = '700 22px sans-serif'; g.fillText(e.hall.toUpperCase(), w / 2, 56)
  g.fillStyle = '#f4efe2'
  const words = e.title.split(' '); let line = '', y = 118; g.font = '700 38px Georgia, serif'
  const out = []
  for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > w - 70 && line) { out.push(line); line = wd } else line = t }
  out.push(line)
  out.slice(0, 2).forEach((l, i) => g.fillText(l, w / 2, y + i * 44))
  g.fillStyle = '#9fb0cc'; g.font = 'italic 24px Georgia, serif'; g.fillText(e.kicker, w / 2, h - 46)
  g.fillStyle = '#cfa94e'; g.font = '600 20px sans-serif'; g.fillText('PRESS E TO READ', w / 2, h - 20)
})

/**
 * A brass-stand placard. `position` is the stand's base on the floor, `yaw` the direction the plate faces
 * (0 faces +z). Standing in front of it shows "Read: title"; interacting opens the panel and stamps the passport.
 */
export function Placard({ id, position, yaw = 0, y = FY, height = 0.95, reach = 0.8 }) {
  const e = EXHIBIT[id]
  const tex = useMemo(() => placardTex(e), [e])
  const m = mm()
  const f = [Math.sin(yaw), Math.cos(yaw)]
  useEffect(() => registerInteractable('exhibit-' + id, {
    position: new THREE.Vector3(position[0] + f[0] * reach, y + 1, position[2] + f[1] * reach),
    radius: 2.5,
    label: () => `Read: ${e.title}`,
    onInteract: () => { useMuseum.getState().open(id); useStore.getState().openPanel({ type: 'exhibit' }) },
  }), [id, position[0], position[2]]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group position={[position[0], y, position[2]]} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.03, 0]} material={m.brass} castShadow><cylinderGeometry args={[0.17, 0.2, 0.06, 16]} /></mesh>
      <mesh position={[0, height / 2, 0]} material={m.brass}><cylinderGeometry args={[0.025, 0.03, height, 8]} /></mesh>
      <group position={[0, height + 0.05, 0.02]} rotation={[-0.45, 0, 0]}>
        <mesh material={m.brass}><boxGeometry args={[0.68, 0.36, 0.03]} /></mesh>
        <mesh position={[0, 0, 0.0165]}><planeGeometry args={[0.62, 0.31]} /><meshStandardMaterial map={tex} roughness={0.5} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.18} /></mesh>
      </group>
    </group>
  )
}

// ---------------------------------------------------------------- pedestal / case / column
/** A solid plinth with a collider. Local origin is the centre of its base on the floor. */
export function Plinth({ position, size = [1, 0.9, 1], yaw = 0, material, round = false, y = FY, children, collide = true }) {
  const m = mm()
  const mat = material || m.stoneSmooth
  return (
    <group position={[position[0], y, position[2]]} rotation={[0, yaw, 0]}>
      {collide && <RigidBody type="fixed" colliders={false}>{round ? <CylinderCollider args={[size[1] / 2, size[0] / 2]} position={[0, size[1] / 2, 0]} /> : <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} position={[0, size[1] / 2, 0]} />}</RigidBody>}
      <mesh position={[0, size[1] / 2, 0]} material={mat} castShadow receiveShadow>{round ? <cylinderGeometry args={[size[0] / 2, size[0] / 2, size[1], 28]} /> : <boxGeometry args={size} />}</mesh>
      <mesh position={[0, size[1] + 0.02, 0]} material={m.brass}>{round ? <cylinderGeometry args={[size[0] / 2 + 0.03, size[0] / 2 + 0.03, 0.04, 28]} /> : <boxGeometry args={[size[0] + 0.06, 0.04, size[2] + 0.06]} />}</mesh>
      <group position={[0, size[1] + 0.04, 0]}>{children}</group>
    </group>
  )
}

/** A glass vitrine on a dark base, with an LED strip. Children sit on its floor (local y=0). */
export function GlassCase({ position, size = [1.4, 1.2, 0.9], base = 0.8, yaw = 0, y = FY, children, light = true }) {
  const m = mm()
  const led = useMemo(() => ledMat(), [])
  return (
    <group position={[position[0], y, position[2]]} rotation={[0, yaw, 0]}>
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[size[0] / 2, (base + size[1]) / 2, size[2] / 2]} position={[0, (base + size[1]) / 2, 0]} /></RigidBody>
      <mesh position={[0, base / 2, 0]} material={m.walnutSolid} castShadow receiveShadow><boxGeometry args={[size[0] + 0.06, base, size[2] + 0.06]} /></mesh>
      <mesh position={[0, base + 0.01, 0]} material={m.felt}><boxGeometry args={[size[0], 0.02, size[2]]} /></mesh>
      <group position={[0, base + 0.02, 0]}>{children}</group>
      <mesh position={[0, base + size[1] / 2, 0]} material={m.glass} userData={{ noBatch: true }}><boxGeometry args={size.map((v, i) => (i === 1 ? size[1] : v))} /></mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => <mesh key={i} position={[sx * size[0] / 2, base + size[1] / 2, sz * size[2] / 2]} material={m.brass}><boxGeometry args={[0.025, size[1], 0.025]} /></mesh>)}
      <mesh position={[0, base + size[1] + 0.02, 0]} material={m.brass}><boxGeometry args={[size[0] + 0.04, 0.04, size[2] + 0.04]} /></mesh>
      {light && <mesh position={[0, base + size[1] - 0.02, 0]} material={led}><boxGeometry args={[size[0] * 0.8, 0.012, 0.05]} /></mesh>}
    </group>
  )
}

const fluteTex = (() => { let t; return () => (t ||= canvasTex(256, 16, (g, w, h) => { g.fillStyle = '#e8e1d1'; g.fillRect(0, 0, w, h); for (let i = 0; i < 16; i++) { const x = (i / 16) * w; const gr = g.createLinearGradient(x, 0, x + w / 16, 0); gr.addColorStop(0, 'rgba(120,108,88,0.55)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.2)'); gr.addColorStop(1, 'rgba(120,108,88,0.55)'); g.fillStyle = gr; g.fillRect(x, 0, w / 16, h) } })) })()

/** A fluted column with base and capital. position = centre of the base on the floor. */
export function Column({ position, h = 9, r = 0.5, y = FY, collide = true, cap = true }) {
  const m = mm()
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: fluteTex(), bumpMap: fluteTex(), bumpScale: 1.4, color: '#f0eadb', roughness: 0.6 }), [])
  const sh = h - 0.7 - (cap ? 0.9 : 0.2)
  return (
    <group position={[position[0], y, position[2]]}>
      {collide && <RigidBody type="fixed" colliders={false}><CylinderCollider args={[h / 2, r * 1.1]} position={[0, h / 2, 0]} /></RigidBody>}
      <mesh position={[0, 0.18, 0]} material={m.stoneSmooth} castShadow><boxGeometry args={[r * 2.7, 0.36, r * 2.7]} /></mesh>
      <mesh position={[0, 0.5, 0]} material={m.stoneSmooth} castShadow><cylinderGeometry args={[r * 1.18, r * 1.3, 0.28, 24]} /></mesh>
      <mesh position={[0, 0.7 + sh / 2, 0]} material={mat} castShadow><cylinderGeometry args={[r * 0.88, r, sh, 24]} /></mesh>
      {cap && <>
        <mesh position={[0, h - 0.7, 0]} material={m.stoneSmooth}><cylinderGeometry args={[r * 1.12, r * 0.88, 0.3, 24]} /></mesh>
        <mesh position={[0, h - 0.4, 0]} material={m.stoneSmooth}><cylinderGeometry args={[r * 1.5, r * 1.12, 0.4, 24]} /></mesh>
        <mesh position={[0, h - 0.1, 0]} material={m.stoneSmooth} castShadow><boxGeometry args={[r * 3.2, 0.2, r * 3.2]} /></mesh>
      </>}
    </group>
  )
}

// ---------------------------------------------------------------- small helpers
/** A bar between two points (cylinder). Returns a mesh. */
export function Bar({ a, b, r = 0.03, r2, material, seg = 8 }) {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b)
    const d = vb.clone().sub(va), len = d.length()
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())
    return { pos: va.clone().add(vb).multiplyScalar(0.5), quat: q, len }
  }, [a[0], a[1], a[2], b[0], b[1], b[2]]) // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh position={pos} quaternion={quat} material={material}><cylinderGeometry args={[r2 ?? r, r, len, seg]} /></mesh>
}

/** Hanging wires from ceiling points to anchor points on an object. */
export function Wires({ from, to, material }) {
  const m = material || mm().steel
  return <>{from.map((f, i) => <Bar key={i} a={f} b={to[i]} r={0.006} material={m} seg={4} />)}</>
}

/** Gently animates a group (sway / spin / bob). Marked noBatch so it moves. */
export function Mover({ children, position = [0, 0, 0], sway = 0, spin = 0, bob = 0, speed = 1, phase = 0, rotation = [0, 0, 0] }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    const g = ref.current; if (!g) return
    const t = clock.elapsedTime * speed + phase
    if (sway) { g.rotation.z = rotation[2] + Math.sin(t * 0.6) * sway; g.rotation.x = rotation[0] + Math.cos(t * 0.45) * sway * 0.6 }
    if (spin) g.rotation.y = rotation[1] + t * spin
    if (bob) g.position.y = position[1] + Math.sin(t) * bob
  })
  return <group ref={ref} position={position} rotation={rotation} userData={{ noBatch: true }}>{children}</group>
}

/** Four-point spotlight pool anchor: just registers light with the shared pool via LightAnchor-like effect (see props.jsx). */
export { LightAnchor } from '../props.jsx'

/** Instanced copies of one geometry. items: [{ p:[x,y,z], s?:[sx,sy,sz], r?:[rx,ry,rz], c?: color }] */
export function Instances({ geometry, material, items, castShadow = false, receiveShadow = false }) {
  const ref = useRef()
  useLayoutEffect(() => {
    const o = new THREE.Object3D(), col = new THREE.Color()
    items.forEach((it, i) => {
      o.position.set(...it.p); o.rotation.set(...(it.r || [0, 0, 0])); o.scale.set(...(it.s || [1, 1, 1])); o.updateMatrix()
      ref.current.setMatrixAt(i, o.matrix)
      if (it.c) ref.current.setColorAt(i, col.set(it.c))
    })
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [items])
  return <instancedMesh ref={ref} args={[geometry, material, items.length]} castShadow={castShadow} receiveShadow={receiveShadow} />
}
