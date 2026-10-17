import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface, signatureMarble } from '../../materials.js'
import { assetMats } from '../materials.js'
import { Builder } from '../../facade/kit.js'
import { registerInteractable } from '../../../state/runtime.js'
import { nightLit } from '../../../state/environment.js'
import { switchedMaterial } from '../../../state/power.js'
import { CeilingLight } from '../../furniture.jsx'
import { LightSwitch } from '../../Interior.jsx'
import { BrandSign } from '../../signs.jsx'
import { payForIroning, IRON_PRICE } from '../../../state/jobs.js'
import { canvasTexture } from '../../canvasText.js'

// Shop kit: a GTA-style luxury storefront in black gloss, granite and polished black marble, lit with pink, teal and purple neon.
// Everything is generated (no downloaded assets) and axis-aligned in world space so the doors can use world coordinates.
// Real here: the glass door, collision on every wall and fixture, seating, the zone light switch. Scenery: machines, garments, mirrors.

export const NEON = { pink: '#ff3fae', teal: '#25e6d3', purple: '#9b4dff' }
const HEX = { pink: 0xff3fae, teal: 0x25e6d3, purple: 0x9b4dff }

let cache
export function shopMats() {
  if (cache) return cache
  const A = assetMats(), G = getMaterials()
  const neon = (hex) => nightLit(new THREE.MeshStandardMaterial({ color: '#0a0a0c', emissive: hex, toneMapped: false }), 3.2, 0.9)
  cache = {
    gloss: new THREE.MeshPhysicalMaterial({ color: '#0c0c10', roughness: 0.22, metalness: 0.2, clearcoat: 0.9, clearcoatRoughness: 0.12 }),
    matte: new THREE.MeshStandardMaterial({ color: '#131318', roughness: 0.8 }),
    wall: surface('plaster', 1 / 3, 1 / 3, { color: '#202027', roughness: 0.7 }),
    granite: surface('limestone', 1 / 2, 1 / 2, { color: '#202026', roughness: 0.3 }),
    paving: surface('pavers', 1 / 2.4, 1 / 2.4, { color: '#2a2930', roughness: 0.5 }),
    steel: new THREE.MeshStandardMaterial({ color: '#2b2c33', roughness: 0.28, metalness: 0.85 }),
    chrome: G.chrome,
    brass: new THREE.MeshStandardMaterial({ color: '#b89455', roughness: 0.28, metalness: 1 }),
    glass: A.f.glass,
    tealGlass: new THREE.MeshStandardMaterial({ color: '#0f4650', roughness: 0.04, metalness: 0.7, emissive: '#0d7f86', emissiveIntensity: 0.18 }),
    roof: new THREE.MeshStandardMaterial({ color: '#1a1a1c', roughness: 0.95 }),
    mirror: new THREE.MeshStandardMaterial({ color: '#c9d2dc', roughness: 0.03, metalness: 1, envMapIntensity: 1.6 }),
    pink: neon(NEON.pink), teal: neon(NEON.teal), purple: neon(NEON.purple),
  }
  return cache
}
const zoneNeon = {}
/** Indoor neon that follows the shop's light switch. */
export function neonZ(colour, zone) {
  const k = colour + zone
  return (zoneNeon[k] ||= switchedMaterial(new THREE.MeshStandardMaterial({ color: '#0a0a0c', emissive: NEON[colour], toneMapped: false }), zone, 3, 0.25))
}

const Box = ({ m, p, s, ...r }) => <mesh position={p} material={m} {...r}><boxGeometry args={s} /></mesh>
const hashN = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }

// ---------------------------------------------------------------------------------------------------------------
/** Hinged glass door in a wall along x: hinge at the low end of the gap, swings into the shop (inward = +z). */
export function GlassDoor({ id, hinge, width = 1.4, height = 2.6, openAngle = -1.55, label = 'door' }) {
  const [open, setOpen] = useState(false)
  const body = useRef(), angle = useRef(0)
  const q = useMemo(() => new THREE.Quaternion(), []), e = useMemo(() => new THREE.Euler(), [])
  const M = shopMats()
  const st = useRef({ open }); st.current.open = open
  useEffect(() => registerInteractable(id, {
    position: new THREE.Vector3(hinge[0] + width / 2, hinge[1] + 1, hinge[2]),
    radius: 2.1,
    label: () => (st.current.open ? `Close ${label}` : `Open ${label}`),
    onInteract: () => setOpen((o) => !o),
  }), [id, label]) // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, dt) => {
    angle.current += ((open ? openAngle : 0) - angle.current) * (1 - Math.exp(-4 * Math.min(dt, 0.05)))
    e.set(0, angle.current, 0); q.setFromEuler(e)
    body.current?.setNextKinematicRotation(q)
  })
  const f = 0.07
  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={hinge}>
      <CuboidCollider args={[width / 2, height / 2, 0.05]} position={[width / 2, height / 2, 0]} />
      <group userData={{ noBatch: true }}>
        <Box m={M.gloss} p={[f / 2, height / 2, 0]} s={[f, height, 0.07]} />
        <Box m={M.gloss} p={[width - f / 2, height / 2, 0]} s={[f, height, 0.07]} />
        <Box m={M.gloss} p={[width / 2, height - f / 2, 0]} s={[width, f, 0.07]} />
        <Box m={M.gloss} p={[width / 2, 0.14, 0]} s={[width, 0.28, 0.07]} />
        <Box m={M.glass} p={[width / 2, (height + 0.28) / 2 - 0.03, 0]} s={[width - 2 * f, height - 0.28 - f, 0.025]} />
        {/* long brass pull bar on the free edge, both faces */}
        {[-1, 1].map((k) => <Box key={k} m={M.brass} p={[width - 0.2, height * 0.5, k * 0.09]} s={[0.035, 0.9, 0.035]} />)}
      </group>
    </RigidBody>
  )
}

// ---------------------------------------------------------------------------------------------------------------
/**
 * The shell: a flat-roofed shop with a glazed front on the z0 side (facing -z), a door gap at door.c, a marble floor, dark walls,
 * cove lighting on the zone switch, a neon fascia sign and a canopy. Children are the furnishings (absolute coordinates).
 */
export function ShopShell({ x0, x1, z0, z1, y, zone, door, name, sub, colour = 'pink', accent = 'teal', sideSign = null, children }) {
  const M = shopMats()
  const T = 0.3, IH = 3.5, FH = 4.9, SH = 4.3
  const W = x1 - x0, D = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
  const dw = door.w || 1.4, dl = door.c - dw / 2, dr = door.c + dw / 2
  const ix0 = x0 + T, ix1 = x1 - T, iz1 = z1 - T
  const parts = useMemo(() => {
    const B = new Builder()
    const Wd = (k, a, b, v0, v1, za, zb) => B.box(k, (a + b) / 2, y + (v0 + v1) / 2, (za + zb) / 2, b - a, v1 - v0, zb - za)
    // front wall: granite plinth, gloss piers, steel mullions, glass bays, door transom, fascia
    for (const [a, b] of [[x0, dl - 0.3], [dr + 0.3, x1]]) Wd('granite', a, b, 0, 0.7, z0, z0 + T)
    Wd('gloss', x0, x0 + 0.5, 0.7, 3.3, z0, z0 + T); Wd('gloss', x1 - 0.5, x1, 0.7, 3.3, z0, z0 + T)
    Wd('gloss', dl - 0.3, dl, 0, 3.3, z0, z0 + T); Wd('gloss', dr, dr + 0.3, 0, 3.3, z0, z0 + T)
    Wd('granite', dl - 0.3, dl, 0, 0.7, z0 - 0.04, z0 + T); Wd('granite', dr, dr + 0.3, 0, 0.7, z0 - 0.04, z0 + T)
    for (const [a, b] of [[x0 + 0.5, dl - 0.3], [dr + 0.3, x1 - 0.5]]) {
      const n = Math.max(1, Math.round((b - a) / 3.2)), pw = (b - a) / n
      for (let i = 0; i < n; i++) {
        B.box('glass', a + pw * (i + 0.5), y + 2.0, z0 + T / 2, pw - 0.04, 2.6, 0.03)
        if (i) Wd('steel', a + pw * i - 0.04, a + pw * i + 0.04, 0.7, 3.3, z0 + 0.02, z0 + T - 0.02)
      }
    }
    B.box('glass', door.c, y + 3.0, z0 + T / 2, dw, 0.6, 0.03)
    Wd('steel', dl, dr, 2.7, 2.74, z0 + 0.02, z0 + T - 0.02)
    Wd('gloss', x0 - 0.08, x1 + 0.08, 3.3, FH, z0 - 0.12, z0 + T)
    Wd('brass', x0 - 0.1, x1 + 0.1, FH, FH + 0.06, z0 - 0.14, z0 + T + 0.02) // coping
    // side and rear walls: gloss outside, plaster inside, granite plinth, coping
    for (const [a, b, za, zb, ia, ib, iza, izb] of [
      [x0, x0 + T, z0, z1, x0 + 0.2, x0 + T, z0 + T, z1 - T], [x1 - T, x1, z0, z1, x1 - T, x1 - 0.2, z0 + T, z1 - T],
    ]) { Wd('gloss', a, b, 0.7, SH, za, zb); Wd('granite', a - 0.03, b + 0.03, 0, 0.7, za, zb); Wd('wall', ia, ib, 0.02, IH, iza, izb) }
    Wd('gloss', x0, x1, 0.7, SH, z1 - T, z1); Wd('granite', x0, x1, 0, 0.7, z1 - 0.1, z1 + 0.03)
    Wd('brass', x0, x1, SH, SH + 0.05, z1 - T, z1 + 0.03); Wd('brass', x0 - 0.02, x0 + T + 0.02, SH, SH + 0.05, z0, z1); Wd('brass', x1 - T - 0.02, x1 + 0.02, SH, SH + 0.05, z0, z1)
    Wd('wall', ix0, ix1, 0.02, IH, iz1 - 0.1, iz1) // rear plaster under the marble feature
    // roof slab, parapet cap, plant room
    Wd('roof', x0, x1, IH, IH + 0.25, z0, z1)
    Wd('steel', cx - 3.2, cx - 0.4, IH + 0.25, IH + 1.15, cz - 1, cz + 1); Wd('steel', cx + 1.6, cx + 4.0, IH + 0.25, IH + 0.95, cz - 1, cz + 1)
    // coffered ceiling: gloss beams with a brass edge
    for (let i = 1; i < Math.round(W / 3.3); i++) { const bx = x0 + (W * i) / Math.round(W / 3.3); Wd('gloss', bx - 0.12, bx + 0.12, IH - 0.16, IH, z0 + T, z1 - T); Wd('brass', bx - 0.13, bx + 0.13, IH - 0.17, IH - 0.15, z0 + T, z1 - T) }
    for (let j = 1; j < Math.round(D / 3.5); j++) { const bz = z0 + (D * j) / Math.round(D / 3.5); Wd('gloss', x0 + T, x1 - T, IH - 0.16, IH, bz - 0.12, bz + 0.12); Wd('brass', x0 + T, x1 - T, IH - 0.17, IH - 0.15, bz - 0.13, bz + 0.13) }
    // fascia neon, flush strips on the pier edges
    Wd('pink', x0 - 0.06, x1 + 0.06, 3.3, 3.36, z0 - 0.16, z0 - 0.12)
    Wd('teal', x0 - 0.06, x1 + 0.06, FH - 0.1, FH - 0.05, z0 - 0.16, z0 - 0.12)
    Wd('purple', x0 + 1.2, x1 - 1.2, 3.2, 3.26, z0 - 1.3, z0 - 0.2) // canopy underglow
    Wd('gloss', x0 + 1.0, x1 - 1.0, 3.26, 3.3, z0 - 1.4, z0 - 0.12) // canopy slab
    Wd('brass', x0 + 1.0, x1 - 1.0, 3.3, 3.34, z0 - 1.42, z0 - 1.36) // canopy lip
    // vertical neon at the front corners, both sides
    for (const sx of [x0 - 0.1, x1 + 0.1]) Wd(colour === 'pink' ? 'teal' : 'pink', sx - 0.03, sx + 0.03, 0.7, 3.3, z0 - 0.04, z0 + 0.08)
    // side-wall louvres
    for (let i = 0; i < 9; i++) {
      for (const sx of [x0 - 0.06, x1 + 0.06]) Wd('steel', sx - 0.03, sx + 0.03, 0.9 + i * 0.32, 0.96 + i * 0.32, z1 - 5.5, z1 - 1.5)
    }
    return B.merged()
  }, [x0, x1, z0, z1, y, door.c, dw, colour])
  const matFor = { gloss: M.gloss, granite: M.granite, steel: M.steel, glass: M.glass, wall: M.wall, roof: M.roof, brass: M.brass, pink: M.pink, teal: M.teal, purple: M.purple }
  const floorMat = useMemo(() => signatureMarble(W / 3, D / 3), [W, D])
  const featureMat = useMemo(() => signatureMarble(W / 3, IH / 3), [W])
  const ceilMat = M.matte
  const cove = useMemo(() => [neonZ('pink', zone), neonZ('teal', zone), neonZ('purple', zone)], [zone])
  return (
    <group>
      {Object.entries(parts).map(([k, g]) => <mesh key={k} geometry={g} material={matFor[k]} castShadow={k !== 'glass'} receiveShadow />)}
      {/* floors, ceiling, feature wall */}
      <mesh position={[(ix0 + ix1) / 2, y + 0.02, (z0 + T + iz1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={floorMat} receiveShadow><planeGeometry args={[ix1 - ix0, iz1 - z0 - T]} /></mesh>
      <mesh position={[(ix0 + ix1) / 2, y + IH - 0.01, (z0 + T + iz1) / 2]} rotation={[Math.PI / 2, 0, 0]} material={ceilMat}><planeGeometry args={[ix1 - ix0, iz1 - z0 - T]} /></mesh>
      <mesh position={[(ix0 + ix1) / 2, y + IH / 2 + 0.02, iz1 - 0.1 - 0.005]} rotation={[0, Math.PI, 0]} material={featureMat} receiveShadow><planeGeometry args={[ix1 - ix0, IH - 0.04]} /></mesh>
      {/* cove strips on the zone switch: pink along both side walls, teal on the rear, purple on the front */}
      <Box m={cove[0]} p={[ix0 + 0.06, y + IH - 0.14, (z0 + iz1) / 2]} s={[0.06, 0.04, iz1 - z0 - T - 0.4]} />
      <Box m={cove[0]} p={[ix1 - 0.06, y + IH - 0.14, (z0 + iz1) / 2]} s={[0.06, 0.04, iz1 - z0 - T - 0.4]} />
      <Box m={cove[1]} p={[cx, y + IH - 0.14, iz1 - 0.16]} s={[ix1 - ix0 - 0.4, 0.04, 0.06]} />
      <Box m={cove[2]} p={[cx, y + IH - 0.14, z0 + T + 0.12]} s={[ix1 - ix0 - 0.4, 0.04, 0.06]} />
      <Box m={cove[1]} p={[cx, y + 0.28, iz1 - 0.14]} s={[ix1 - ix0 - 0.4, 0.035, 0.03]} />
      {/* fascia sign */}
      <BrandSign text={name} sub={sub} position={[cx, y + 4.12, z0 - 0.125]} rotation={[0, Math.PI, 0]} width={Math.min(6.6, W * 0.34)} size={140} color={colour === 'pink' ? '#ff6ec4' : '#5ff2e4'} glow={NEON[colour]} />
      {sideSign && <BrandSign text={sideSign.text} sub={sideSign.sub} position={sideSign.position} rotation={sideSign.rotation} width={sideSign.width || 4.6} size={130} color={colour === 'pink' ? '#ff6ec4' : '#5ff2e4'} glow={NEON[colour]} />}
      {/* colliders: front (two pieces around the door), sides, rear */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[(dl - x0) / 2, IH / 2 + 0.2, T / 2]} position={[(x0 + dl) / 2, y + IH / 2, z0 + T / 2]} />
        <CuboidCollider args={[(x1 - dr) / 2, IH / 2 + 0.2, T / 2]} position={[(dr + x1) / 2, y + IH / 2, z0 + T / 2]} />
        <CuboidCollider args={[T / 2, IH / 2 + 0.2, D / 2]} position={[x0 + T / 2, y + IH / 2, cz]} />
        <CuboidCollider args={[T / 2, IH / 2 + 0.2, D / 2]} position={[x1 - T / 2, y + IH / 2, cz]} />
        <CuboidCollider args={[W / 2, IH / 2 + 0.2, T / 2]} position={[cx, y + IH / 2, z1 - T / 2]} />
      </RigidBody>
      <GlassDoor id={`${zone}-door`} hinge={[dl, y, z0 + T / 2]} width={dw} label={`${name.toLowerCase()} door`} />
      <LightSwitch position={[dr + 0.15, y + 1.25, z0 + T + 0.02]} yaw={Math.PI} zone={zone} />
      {/* ceiling light panels on the switch: a soft lavender white so the neon still reads */}
      {Array.from({ length: Math.max(2, Math.round(W / 6.5)) }).flatMap((_, i, a) => [z0 + D * 0.3, z0 + D * 0.68].map((zz, j) => (
        <CeilingLight key={i + '-' + j} position={[x0 + (W * (i + 0.5)) / a.length, y + IH - 0.02, zz]} size={[1.8, 0.3]} intensity={8} distance={11} color="#f1e6ff" zone={zone} watts={40} />
      )))}
      {children}
    </group>
  )
}

// ---------------------------------------------------------------------------------------------------------------
function bankGeometry(kind, n, zone) {
  const B = new Builder()
  const add = (key, g, x, y, z) => { g.translate(x, y, z); B.add(key, g) }
  const pitch = kind === 'washer' ? 0.78 : 0.8
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * pitch
    if (kind === 'washer') {
      B.box('steel', x, 0.45, 0, 0.72, 0.9, 0.72)
      B.box('matte', x, 0.93, 0, 0.74, 0.06, 0.76)
      B.box('gloss', x, 0.82, 0.365, 0.62, 0.14, 0.02)
      B.box('disp', x + 0.12, 0.83, 0.378, 0.2, 0.04, 0.01)
      add('chrome', new THREE.TorusGeometry(0.235, 0.03, 10, 28), x, 0.46, 0.37)
      add('tealGlass', new THREE.CylinderGeometry(0.21, 0.21, 0.04, 24).rotateX(Math.PI / 2), x, 0.46, 0.375)
    } else {
      B.box('steel', x, 1.0, 0, 0.76, 2.0, 0.82)
      B.box('gloss', x, 1.0, 0.02, 0.78, 0.04, 0.84)
      for (const yy of [0.5, 1.5]) {
        add('chrome', new THREE.TorusGeometry(0.27, 0.03, 10, 30), x, yy - 0.04, 0.42)
        add('tealGlass', new THREE.CylinderGeometry(0.245, 0.245, 0.04, 26).rotateX(Math.PI / 2), x, yy - 0.04, 0.425)
        B.box('disp', x, yy + 0.38, 0.425, 0.3, 0.04, 0.01)
      }
    }
  }
  return B.merged()
}
/** A row of front-loading washers or a wall of stacked dryers. Local +z is the front. */
export function MachineBank({ position, yaw = 0, kind = 'washer', n = 8, zone }) {
  const M = shopMats()
  const geos = useMemo(() => bankGeometry(kind, n), [kind, n])
  const disp = useMemo(() => neonZ(kind === 'washer' ? 'pink' : 'purple', zone), [kind, zone])
  const mats = { steel: M.steel, matte: M.matte, gloss: M.gloss, chrome: M.chrome, tealGlass: M.tealGlass, disp }
  const pitch = kind === 'washer' ? 0.78 : 0.8, h = kind === 'washer' ? 0.96 : 2.0, d = kind === 'washer' ? 0.76 : 0.84
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[(n * pitch) / 2, h / 2, d / 2]} position={[0, h / 2, 0]} />
      {Object.entries(geos).map(([k, g]) => <mesh key={k} geometry={g} material={mats[k]} castShadow receiveShadow />)}
    </RigidBody>
  )
}

// ---------------------------------------------------------------------------------------------------------------
/** Service counter: gloss body, brass kick, black-marble top, pink under-glow. Local +z is the customer side. */
export function LuxCounter({ position, yaw = 0, length = 4, depth = 0.7, height = 1.05, zone }) {
  const M = shopMats()
  const top = useMemo(() => signatureMarble(length / 2, 0.5), [length])
  const glow = useMemo(() => neonZ('pink', zone), [zone])
  const front = useMemo(() => signatureMarble(length / 2, 0.4), [length])
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[length / 2, height / 2, depth / 2]} position={[0, height / 2, 0]} />
      <Box m={M.gloss} p={[0, (height - 0.05) / 2 + 0.06, 0]} s={[length, height - 0.11, depth]} castShadow receiveShadow />
      <Box m={M.brass} p={[0, 0.03, 0.01]} s={[length + 0.02, 0.06, depth + 0.02]} />
      <Box m={top} p={[0, height - 0.025, 0.03]} s={[length + 0.06, 0.05, depth + 0.12]} castShadow receiveShadow />
      <Box m={glow} p={[0, 0.12, depth / 2 + 0.003]} s={[length - 0.2, 0.025, 0.01]} />
      <Box m={M.brass} p={[0, height - 0.06, depth / 2 + 0.002]} s={[length, 0.02, 0.01]} />
      <mesh position={[0, 0.58, depth / 2 + 0.006]} material={front} receiveShadow><planeGeometry args={[length - 0.12, 0.78]} /></mesh>
      {Array.from({ length: Math.floor(length / 0.9) + 1 }, (_, i) => <Box key={i} m={M.brass} p={[-length / 2 + 0.06 + i * ((length - 0.12) / Math.floor(length / 0.9)), 0.58, depth / 2 + 0.012]} s={[0.025, 0.8, 0.012]} />)}
    </RigidBody>
  )
}

/** Folding / coffee table with a black-marble top on brass legs. */
export function LuxTable({ position, yaw = 0, size = [2.4, 1.0], height = 0.92 }) {
  const M = shopMats()
  const top = useMemo(() => signatureMarble(size[0] / 2, size[1] / 2), [size[0], size[1]])
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[size[0] / 2, height / 2, size[1] / 2]} position={[0, height / 2, 0]} />
      <Box m={top} p={[0, height - 0.03, 0]} s={[size[0], 0.06, size[1]]} castShadow receiveShadow />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <Box key={i} m={M.brass} p={[a * (size[0] / 2 - 0.08), (height - 0.06) / 2, b * (size[1] / 2 - 0.08)]} s={[0.05, height - 0.06, 0.05]} />)}
      <Box m={M.brass} p={[0, 0.22, 0]} s={[size[0] - 0.2, 0.025, 0.03]} />
    </RigidBody>
  )
}

/** Soap / change vending machine with a lit face. */
export function VendingMachine({ position, yaw = 0, colour = 'teal', zone }) {
  const M = shopMats()
  const glow = useMemo(() => neonZ(colour, zone), [colour, zone])
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[0.45, 0.95, 0.35]} position={[0, 0.95, 0]} />
      <Box m={M.gloss} p={[0, 0.95, 0]} s={[0.9, 1.9, 0.7]} castShadow />
      <Box m={M.tealGlass} p={[-0.1, 1.2, 0.355]} s={[0.55, 1.0, 0.02]} />
      {[0, 1, 2, 3].map((i) => <Box key={i} m={glow} p={[-0.1, 0.8 + i * 0.26, 0.37]} s={[0.5, 0.025, 0.01]} />)}
      <Box m={glow} p={[0.3, 1.45, 0.36]} s={[0.1, 0.3, 0.012]} />
      <Box m={M.chrome} p={[0.3, 0.9, 0.36]} s={[0.12, 0.2, 0.03]} />
      <Box m={M.matte} p={[0, 0.3, 0.355]} s={[0.7, 0.3, 0.02]} />
    </RigidBody>
  )
}

/** Wheeled laundry cart with folded linen in the house colours. */
export function LaundryCart({ position, yaw = 0, seed = 1 }) {
  const M = shopMats()
  const cols = ['#c23d8c', '#1f9f95', '#6e45c9', '#cfcbe0']
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[0.38, 0.5, 0.52]} position={[0, 0.5, 0]} />
      <Box m={M.steel} p={[0, 0.22, 0]} s={[0.76, 0.04, 1.04]} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <Box key={i} m={M.chrome} p={[a * 0.36, 0.56, b * 0.5]} s={[0.025, 0.7, 0.025]} />)}
      {[[0, 0.9, 0.5, 0.76, 0.025, 0.025], [0, 0.9, -0.5, 0.76, 0.025, 0.025], [0.36, 0.9, 0, 0.025, 0.025, 1.0], [-0.36, 0.9, 0, 0.025, 0.025, 1.0]].map(([x, y, z, a, b, c], i) => <Box key={'r' + i} m={M.chrome} p={[x, y, z]} s={[a, b, c]} />)}
      {[0.32, 0.5, 0.68].map((yy, i) => <mesh key={i} position={[0, yy, (hashN(seed + i) - 0.5) * 0.1]} material={getMaterials().fabric(cols[(seed + i) % 4])}><boxGeometry args={[0.6, 0.12, 0.8]} /></mesh>)}
    </RigidBody>
  )
}

/** A wall of cubbies holding folded linen (the wash-and-fold pickup). Local +z is the front. */
export function Cubbies({ position, yaw = 0, cols = 6, rows = 4 }) {
  const M = shopMats()
  const g = useMemo(() => {
    const B = new Builder()
    const cw = 0.55, ch = 0.5, wd = 0.45
    const W = cols * cw, H = rows * ch
    B.box('gloss', 0, H / 2, -wd / 2 + 0.01, W + 0.06, H, 0.04)
    for (let i = 0; i <= cols; i++) B.box('gloss', -W / 2 + i * cw, H / 2, 0, 0.03, H, wd)
    for (let j = 0; j <= rows; j++) B.box('gloss', 0, j * ch, 0, W, 0.03, wd)
    for (let j = 0; j < rows; j++) B.box('brass', 0, j * ch + 0.015, wd / 2, W, 0.012, 0.012)
    const pal = ['pink', 'teal', 'purple', 'white']
    const stacks = {}
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const k = Math.floor(hashN(i * 7 + j * 13 + 1) * 4), n = 1 + Math.floor(hashN(i + j * 5) * 3)
      for (let s = 0; s < n; s++) B.box('f' + k, -W / 2 + (i + 0.5) * cw, j * ch + 0.04 + 0.075 + s * 0.12, 0.02, 0.42, 0.11, 0.34)
    }
    return { geos: B.merged(), W, H, cw, ch, wd, rows }
  }, [cols, rows])
  const fabrics = useMemo(() => ['#ff6ab9', '#35d9c9', '#9a6bff', '#ece9f4'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 })), [])
  const mats = { gloss: M.gloss, brass: M.brass, f0: fabrics[0], f1: fabrics[1], f2: fabrics[2], f3: fabrics[3] }
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[g.W / 2, g.H / 2, g.wd / 2]} position={[0, g.H / 2, 0]} />
      {Object.entries(g.geos).map(([k, geo]) => <mesh key={k} geometry={geo} material={mats[k]} castShadow receiveShadow />)}
    </RigidBody>
  )
}

/**
 * Hanging garments in clear bags on two ceiling rails. `along` is 'x' or 'z' (the direction the rails run). Local origin: first rail
 * line centre. Instanced, so ~140 garments cost one draw call.
 */
export function GarmentRows({ position, along = 'x', length = 8, rows = 2, y = 0 }) {
  const M = shopMats()
  const ref = useRef()
  const per = Math.floor(length / 0.12)
  const n = per * rows
  useEffect(() => {
    const o = new THREE.Object3D(), c = new THREE.Color()
    const pal = ['#f4f1fa', '#f4f1fa', '#2b2b33', '#3b3b46', '#ff8fcb', '#58eadb', '#b18cff', '#1e1e24', '#d7d2e6']
    let k = 0
    for (let r = 0; r < rows; r++) for (let i = 0; i < per; i++) {
      const t = -length / 2 + (i + 0.5) * (length / per)
      const h = 1.0 + hashN(k * 3.1) * 0.35
      const px = along === 'x' ? t : r * 0.55, pz = along === 'x' ? r * 0.55 : t
      o.position.set(px, y + 2.25 - h / 2, pz)
      o.rotation.set(0, 0.25 * (hashN(k) - 0.5), 0)
      o.scale.set(1, h, 1); o.updateMatrix(); ref.current.setMatrixAt(k, o.matrix)
      c.set(pal[Math.floor(hashN(k * 5.7) * pal.length)]); ref.current.setColorAt(k, c); k++
    }
    ref.current.instanceMatrix.needsUpdate = true; ref.current.instanceColor.needsUpdate = true
  }, [per, rows, length, along, y])
  const garmentGeo = useMemo(() => { const g = new THREE.CylinderGeometry(0.15, 0.27, 1, 10, 1); g.scale(1, 1, 0.38); g.translate(0, 0, 0); if (along === 'z') g.rotateY(Math.PI / 2); return <primitive object={g} attach="geometry" /> }, [along])
  const cw = along === 'x' ? length : 0.7, cd = along === 'x' ? 0.7 : length
  return (
    <group position={position}>
      <instancedMesh ref={ref} args={[undefined, undefined, n]} castShadow userData={{ noBatch: true }} frustumCulled={false}>
        {garmentGeo}
        <meshStandardMaterial roughness={0.5} metalness={0} />
      </instancedMesh>
      {Array.from({ length: rows }, (_, r) => (
        <group key={r}>
          <mesh position={along === 'x' ? [0, y + 2.3, r * 0.55] : [r * 0.55, y + 2.3, 0]} rotation={along === 'x' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]} material={M.chrome}><cylinderGeometry args={[0.016, 0.016, length, 8]} /></mesh>
        </group>
      ))}
      {[-1, 1].map((k) => <Box key={k} m={M.chrome} p={along === 'x' ? [k * length / 2, y + 2.65, 0.27] : [0.27, y + 2.65, k * length / 2]} s={[0.025, 0.7, 0.025]} />)}
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[cw / 2, 0.65, cd / 2]} position={[position[0] + (along === 'x' ? 0 : (rows - 1) * 0.275), position[1] + y + 1.65, position[2] + (along === 'x' ? (rows - 1) * 0.275 : 0)]} /></RigidBody>
    </group>
  )
}

/** Steam press with ironing board. Local +z is where the presser stands. */
export function PressStation({ position, yaw = 0 }) {
  const M = shopMats()
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[0.45, 0.6, 0.4]} position={[-0.7, 0.6, 0]} />
      <CuboidCollider args={[0.7, 0.45, 0.2]} position={[0.55, 0.45, 0]} />
      {/* press: cabinet, lower pad, raised arm, head, brass wheel */}
      <Box m={M.gloss} p={[-0.7, 0.45, 0]} s={[0.8, 0.9, 0.7]} castShadow />
      <Box m={M.steel} p={[-0.7, 0.94, 0]} s={[0.76, 0.08, 0.5]} />
      <Box m={M.steel} p={[-0.7, 1.45, -0.12]} s={[0.12, 0.9, 0.12]} />
      <Box m={M.chrome} p={[-0.7, 1.28, 0.1]} s={[0.74, 0.12, 0.46]} castShadow />
      <Box m={M.brass} p={[-0.28, 0.6, 0.2]} s={[0.06, 0.06, 0.06]} />
      <Box m={M.pink} p={[-0.7, 0.55, 0.351]} s={[0.3, 0.04, 0.01]} />
      {/* ironing board: padded top on a chrome frame, with an iron */}
      <Box m={M.matte} p={[0.55, 0.93, 0]} s={[1.4, 0.05, 0.38]} castShadow />
      <Box m={M.chrome} p={[0.55, 0.46, 0]} s={[1.0, 0.02, 0.02]} />
      {[-0.4, 0.4].map((x) => <Box key={x} m={M.chrome} p={[0.55 + x, 0.46, 0]} s={[0.02, 0.92, 0.3]} />)}
      <Box m={M.gloss} p={[0.9, 1.0, 0.02]} s={[0.26, 0.07, 0.12]} />
      <Box m={M.teal} p={[0.9, 1.04, 0.02]} s={[0.12, 0.012, 0.03]} />
    </RigidBody>
  )
}

/** A fitting mirror on a lit round pedestal. Local +z faces the room. */
export function FittingMirror({ position, yaw = 0 }) {
  const M = shopMats()
  const ring = useMemo(() => neonZ('purple', 'cleaners'), [])
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[0.7, 1.1, 0.06]} position={[0, 1.1, 0]} />
      <Box m={M.brass} p={[0, 1.15, 0]} s={[1.3, 2.3, 0.06]} />
      <Box m={M.mirror} p={[0, 1.15, 0.035]} s={[1.18, 2.18, 0.012]} />
      <mesh position={[0, 0.06, 1.0]} material={M.gloss} receiveShadow><cylinderGeometry args={[0.9, 0.9, 0.12, 36]} /></mesh>
      <mesh position={[0, 0.125, 1.0]} rotation={[Math.PI / 2, 0, 0]} material={ring}><torusGeometry args={[0.86, 0.018, 8, 48]} /></mesh>
    </RigidBody>
  )
}

/** Free-standing neon pylon for the plaza. */
export function Pylon({ position, yaw = 0, title, sub }) {
  const M = shopMats()
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[0.7, 2.6, 0.2]} position={[0, 2.6, 0]} />
      <Box m={M.granite} p={[0, 0.2, 0]} s={[1.6, 0.4, 0.5]} castShadow />
      <Box m={M.gloss} p={[0, 2.7, 0]} s={[1.4, 4.7, 0.3]} castShadow />
      <Box m={M.brass} p={[0, 5.08, 0]} s={[1.46, 0.06, 0.34]} />
      <Box m={M.pink} p={[-0.62, 2.7, 0.16]} s={[0.04, 4.4, 0.02]} />
      <Box m={M.teal} p={[0.62, 2.7, 0.16]} s={[0.04, 4.4, 0.02]} />
      <Box m={M.purple} p={[0, 0.44, 0.16]} s={[1.2, 0.04, 0.02]} />
      {[1, -1].map((k) => <group key={k} rotation={[0, k > 0 ? 0 : Math.PI, 0]}>
        <BrandSign text={title} sub={sub} position={[0, 3.6, 0.17]} width={1.3} size={150} color="#ff6ec4" glow="#ff3fae" />
      </group>)}
    </RigidBody>
  )
}

// ---------------------------------------------------------------------------------------------------------------
/** A free-standing ironing board with an iron resting on its stand. Decorative only. Local +z is the working side. */
export function IroningBoard({ position, yaw = 0, on = true }) {
  const M = shopMats()
  const glow = useMemo(() => neonZ('teal', 'cleaners'), [])
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[0.75, 0.46, 0.22]} position={[0, 0.46, 0]} />
      <Box m={M.matte} p={[0, 0.9, 0]} s={[1.4, 0.05, 0.38]} castShadow />
      <Box m={M.chrome} p={[0, 0.46, 0]} s={[1.0, 0.02, 0.02]} />
      {[-0.4, 0.4].map((x) => <Box key={x} m={M.chrome} p={[x, 0.46, 0]} s={[0.02, 0.88, 0.3]} />)}
      {/* the iron, nose toward +z */}
      <group position={[0.35, 0.95, 0.03]}>
        <Box m={M.gloss} p={[0, 0, 0]} s={[0.26, 0.07, 0.14]} castShadow />
        <Box m={M.chrome} p={[0, 0.045, -0.02]} s={[0.1, 0.03, 0.06]} />
        <Box m={on ? glow : M.chrome} p={[0, 0.02, 0.075]} s={[0.1, 0.012, 0.02]} />
      </group>
    </RigidBody>
  )
}

/** A grid of ironing boards, each with an iron: the tailoring floor the owner asked for. `cols`×`rows` boards, 1.6m apart. */
export function IroningFloor({ position, yaw = 0, cols = 5, rows = 4, gap = 1.6 }) {
  const n = cols * rows
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {Array.from({ length: n }, (_, i) => {
        const c = i % cols, r = Math.floor(i / cols)
        const x = (c - (cols - 1) / 2) * gap, z = (r - (rows - 1) / 2) * (gap * 0.85)
        return <IroningBoard key={i} position={[x, 0, z]} yaw={r % 2 ? Math.PI : 0} />
      })}
    </group>
  )
}

/** A till at the counter: body, screen, keypad and a brass coin tray. Decorative — it does not take payment. */
/** A real working register: press E to pay for a same-visit pressing (real credits leave the
 * player's wallet, a toast confirms it, a receipt line is added to the ledger). Give each one a
 * unique `id` so they don't fight over the same interaction point. */
export function CashRegister({ position, yaw = 0, id }) {
  const M = shopMats()
  const screen = useMemo(() => neonZ('teal', 'cleaners'), [])
  useEffect(() => {
    if (!id) return
    return registerInteractable(id, {
      position: new THREE.Vector3(position[0], position[1] + 0.3, position[2]),
      radius: 1.3,
      label: `Pay for pressing (${IRON_PRICE} cr)`,
      onInteract: () => payForIroning(id),
    })
  }, [id, position]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <Box m={M.gloss} p={[0, 0.1, 0]} s={[0.34, 0.2, 0.3]} castShadow />
      <Box m={M.matte} p={[0, 0.23, 0.02]} s={[0.3, 0.06, 0.24]} />
      <Box m={screen} p={[0, 0.31, -0.06]} s={[0.17, 0.1, 0.012]} />
      {Array.from({ length: 9 }, (_, i) => (
        <Box key={i} m={M.chrome} p={[-0.08 + (i % 3) * 0.08, 0.265, 0.07 + Math.floor(i / 3) * 0.055]} s={[0.05, 0.012, 0.045]} />
      ))}
      <Box m={M.brass} p={[0, 0.035, 0]} s={[0.36, 0.03, 0.32]} />
    </group>
  )
}

/** A rolling floor rack of hanging garments on empty and loaded hangers. Local +z is the side the hangers show. */
export function HangerRack({ position, yaw = 0, n = 16 }) {
  const M = shopMats()
  const ref = useRef()
  useEffect(() => {
    const o = new THREE.Object3D(), c = new THREE.Color()
    const pal = ['#f4f1fa', '#2b2b33', '#ff8fcb', '#58eadb', '#b18cff', '#d7d2e6', '#1e1e24']
    for (let i = 0; i < n; i++) {
      const t = -0.9 + (i + 0.5) * (1.8 / n)
      const h = 0.75 + hashN(i * 2.3) * 0.3
      o.position.set(t, 1.62 - h / 2, 0)
      o.rotation.set(0, 0.2 * (hashN(i) - 0.5), 0)
      o.scale.set(1, h, 1); o.updateMatrix(); ref.current.setMatrixAt(i, o.matrix)
      c.set(pal[Math.floor(hashN(i * 4.1) * pal.length)]); ref.current.setColorAt(i, c)
    }
    ref.current.instanceMatrix.needsUpdate = true; ref.current.instanceColor.needsUpdate = true
  }, [n])
  const garmentGeo = useMemo(() => { const g = new THREE.CylinderGeometry(0.13, 0.22, 1, 8, 1); g.scale(1, 1, 0.3); return g }, [])
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[1.0, 0.85, 0.3]} position={[0, 0.85, 0]} />
      {[-1, 1].map((k) => (
        <group key={k}>
          <mesh position={[k * 0.95, 0.85, 0]} material={M.chrome}><cylinderGeometry args={[0.02, 0.02, 1.7, 8]} /></mesh>
          {[0, 1.68].map((yy) => <mesh key={yy} position={[k * 0.95, yy, 0.18 * (k > 0 ? 1 : -1)]} rotation={[Math.PI / 2, 0, 0]} material={M.chrome}><cylinderGeometry args={[0.37, 0.37, 0.02, 8, 1, false, 0, Math.PI]} /></mesh>)}
        </group>
      ))}
      <mesh position={[0, 1.62, 0]} rotation={[0, 0, Math.PI / 2]} material={M.chrome}><cylinderGeometry args={[0.016, 0.016, 1.9, 8]} /></mesh>
      {[[-0.9, 0.82, -0.02], [0.9, 0.82, -0.02], [-0.9, 0.82, 0.3], [0.9, 0.82, 0.3]].map((p, i) => (
        <mesh key={i} position={p} material={M.chrome}><sphereGeometry args={[0.04, 10, 8]} /></mesh>
      ))}
      <instancedMesh ref={ref} args={[garmentGeo, undefined, n]} castShadow userData={{ noBatch: true }} frustumCulled={false}>
        <meshStandardMaterial roughness={0.55} />
      </instancedMesh>
    </RigidBody>
  )
}

let bagCanvas
function bagTexture(brand) {
  if (bagCanvas?.brand === brand) return bagCanvas.tex
  const c = document.createElement('canvas'); c.width = 256; c.height = 256
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#17171c'; ctx.fillRect(0, 0, 256, 256)
  ctx.strokeStyle = '#5ff2e4'; ctx.lineWidth = 6; ctx.strokeRect(10, 10, 236, 236)
  ctx.fillStyle = '#5ff2e4'; ctx.textAlign = 'center'
  ctx.font = '700 22px system-ui, sans-serif'
  const words = brand.split(' ')
  let line = '', y = 108, lines = []
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > 210 && line) { lines.push(line); line = w } else line = t }
  lines.push(line)
  for (const l of lines) { ctx.fillText(l.toUpperCase(), 128, y); y += 28 }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  bagCanvas = { brand, tex }
  return tex
}

/**
 * A branded paper bag reading "Thanks from <brand>" on both faces — the takeaway bags by the counter.
 * `stack` draws a few leaning against each other instead of one standing bag.
 */
export function ThanksBag({ position, yaw = 0, scale = 1, stack = false, brand = 'Thanks from The Purple Ironing Station' }) {
  const M = shopMats()
  const tex = useMemo(() => bagTexture(brand), [brand])
  const face = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), [tex])
  const one = (p, r, s) => (
    <group position={p} rotation={[0, r, 0]} scale={s}>
      <Box m={M.matte} p={[0, 0.22, 0]} s={[0.26, 0.44, 0.14]} castShadow />
      <mesh position={[0, 0.24, 0.071]} material={face}><planeGeometry args={[0.2, 0.24]} /></mesh>
      <mesh position={[0, 0.24, -0.071]} rotation={[0, Math.PI, 0]} material={face}><planeGeometry args={[0.2, 0.24]} /></mesh>
      {[-0.07, 0.07].map((x) => <mesh key={x} position={[x, 0.46, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.chrome}><torusGeometry args={[0.03, 0.006, 6, 12]} /></mesh>)}
    </group>
  )
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={scale}>
      {stack
        ? [[-0.16, 0.12, -0.25], [0.12, -0.08, 0.3], [0.0, 0, 0]].map(([x, r, lean], i) => one([x, 0, 0], r + lean * 0, i))
        : one([0, 0, 0], 0, 0)}
    </group>
  )
}

// A handful of procedural abstract canvases, drawn once and shared by every FramedArt instance that
// asks for the same `seed` — simple generative brush strokes in the shop's neon palette, not a
// reproduction of any real artwork.
const artCache = new Map()
function artTexture(seed) {
  if (artCache.has(seed)) return artCache.get(seed)
  const palettes = [
    ['#120d1c', '#ff8fcb', '#58eadb', '#b18cff'],
    ['#0d1a1c', '#58eadb', '#ffd27a', '#f4f1fa'],
    ['#1a0d18', '#b18cff', '#ff8fcb', '#58eadb'],
  ]
  const pal = palettes[seed % palettes.length]
  const tex = canvasTexture(512, 640, (ctx, w, h) => {
    ctx.fillStyle = pal[0]; ctx.fillRect(0, 0, w, h)
    const rnd = (n) => { const s = Math.sin((n + seed * 97) * 12.9898) * 43758.5453; return s - Math.floor(s) }
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = pal[1 + (i % (pal.length - 1))]
      ctx.lineWidth = 10 + rnd(i) * 50
      ctx.globalAlpha = 0.55 + rnd(i * 3) * 0.3
      ctx.beginPath()
      const x0 = rnd(i * 2) * w, y0 = rnd(i * 2 + 1) * h
      ctx.moveTo(x0, y0)
      ctx.bezierCurveTo(rnd(i * 5) * w, rnd(i * 5 + 1) * h, rnd(i * 7) * w, rnd(i * 7 + 1) * h, rnd(i * 11) * w, rnd(i * 11 + 1) * h)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  })
  artCache.set(seed, tex)
  return tex
}
/** A framed canvas on a wall — press-and-go decor, same honesty level as every other canvas-texture
 * prop in this project (a procedural abstract piece, not a real artwork). */
export function FramedArt({ position, yaw = 0, seed = 0, w = 0.9, h = 1.2 }) {
  const M = shopMats()
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: artTexture(seed), roughness: 0.7 }), [seed])
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <Box m={M.matte} p={[0, 0, -0.025]} s={[w + 0.08, h + 0.08, 0.04]} castShadow />
      <mesh position={[0, 0, -0.002]} material={mat}><planeGeometry args={[w, h]} /></mesh>
    </group>
  )
}
