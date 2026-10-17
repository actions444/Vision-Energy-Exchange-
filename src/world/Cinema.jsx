import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface, signatureMarble } from './materials.js'
import { canvasTexture, wrapText } from './canvasText.js'
import { registerInteractable } from '../state/runtime.js'
import { registerLightAnchor } from '../state/environment.js'
import { useSeats } from '../state/seats.js'
import { useStore } from '../state/store.js'
import { SingleDoor } from './Door.jsx'
import { Sofa, Plant, Counter, CeilingLight, Speaker, Table } from './furniture.jsx'
import { useCinema, sessionFor, cinemaTexture, SCREENS, watchable } from '../cinema/cinema.js'
import { useMedia, fileUrl } from '../media/media.js'
import { FONTS } from '../config/theme.js'
import { CinemaTowerFloors } from './CinemaTower.jsx'
import { Atm } from './props.jsx'

// Vision Storms Cinema: a lobby with box office and concessions, and two stadium-seated
// auditoriums with recliners, proportioned screens, aisles, sconces, exit signs and a
// screen & sound control panel. Screens play movies from the media library (cinema.js).

export const CINEMA = { x0: -34, x1: -10, z0: -22, z1: 8, ih: 9, floor: 0.15 }
const T = 0.4 // shell wall thickness
export const PART_X = -17 // lobby / auditorium partition (same x on every floor, so the tower stacks cleanly)
const DIV_Z = -7 // wall between the two ground-floor auditoriums

// The ground floor keeps its original 9m-tall lobby + 2 auditoriums, unchanged. Above it, 4 more
// floors (same footprint, same 9m floor-to-floor height so the proven Auditorium geometry works
// unmodified) carry 20 more screens, reached by a real elevator — see CinemaTower.jsx.
export const TOWER_FLOOR_H = 9
export const TOWER_FLOORS = 5 // ground + 4 upper
export const TOWER_IH = TOWER_FLOORS * TOWER_FLOOR_H // total shell cavity Venue() must provide
export const AUDITORIUMS = [
  { screenId: 'cinema-1', x0: CINEMA.x0 + T, x1: PART_X - 0.15, z0: CINEMA.z0 + T, z1: DIV_Z - 0.15, entry: 'z0' },
  { screenId: 'cinema-2', x0: CINEMA.x0 + T, x1: PART_X - 0.15, z0: DIV_Z + 0.15, z1: CINEMA.z1 - T, entry: 'z1' },
]

// ---------------- shared pieces ----------------
function exitTexture() {
  return canvasTexture(256, 96, (ctx, w, h) => {
    ctx.fillStyle = '#0d3b1e'; ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#5dff8f'; ctx.font = `800 64px ${FONTS.body}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('EXIT', w / 2, h / 2 + 3)
  })
}
let exitMat = null
export function ExitSign({ position, yaw = 0 }) {
  if (!exitMat) exitMat = new THREE.MeshBasicMaterial({ map: exitTexture(), toneMapped: false })
  const m = getMaterials()
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh material={m.blackSteel}><boxGeometry args={[0.62, 0.26, 0.06]} /></mesh>
      <mesh position={[0, 0, 0.032]} material={exitMat}><planeGeometry args={[0.56, 0.21]} /></mesh>
    </group>
  )
}

/** Card shown on a screen when nothing is playing (or before the first frame arrives). */
function useTitleCard(screenId, title) {
  const tex = useMemo(() => canvasTexture(1280, 692, () => {}), [])
  const draw = (lines) => {
    const ctx = tex.image.getContext('2d')
    const w = tex.image.width, h = tex.image.height
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#0c0d12'); g.addColorStop(1, '#1b1d26')
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#c9a96a'; ctx.font = `500 30px ${FONTS.mono}`
    ctx.fillText(lines[0].toUpperCase(), w / 2, h / 2 - 110)
    ctx.fillStyle = '#f4f1ea'; ctx.font = `800 84px ${FONTS.display}`
    wrapText(ctx, lines[1], w / 2, h / 2 - 10, w - 160, 92)
    ctx.fillStyle = '#9aa0ad'; ctx.font = `500 28px ${FONTS.body}`
    ctx.fillText(lines[2] || '', w / 2, h / 2 + 150)
    tex.needsUpdate = true
  }
  useEffect(() => {
    const render = () => {
      const st = useCinema.getState()
      const s = sessionFor(screenId, st)
      const movies = watchable()
      if (s) draw([s.shared ? 'Now showing' : 'Private screening', s.title || 'Feature presentation', s.shared ? (s.state === 'paused' ? 'Intermission' : 'Please take your seats') : 'Only you can see this screening'])
      else if (movies.length) draw([SCREENS[screenId]?.venue || 'Vision Cinema', title, `${movies.length} title${movies.length === 1 ? '' : 's'} available · use the screen controls to start a movie`])
      else draw([SCREENS[screenId]?.venue || 'Vision Cinema', title, 'No movies published yet'])
    }
    render()
    const a = useCinema.subscribe((s, p) => { if (s.shared !== p.shared || s.local !== p.local) render() })
    const b = useMedia.subscribe((s, p) => { if (s.items !== p.items) render() })
    return () => { a(); b() }
  }, [screenId, title]) // eslint-disable-line react-hooks/exhaustive-deps
  return tex
}

/**
 * A cinema screen on a wall: masking frame, title card, and the live movie fitted to the
 * screen's proportions (letterboxed or pillarboxed, never stretched).
 */
export function CinemaScreen({ screenId, position, yaw = 0, width, height, title }) {
  const card = useTitleCard(screenId, title)
  const cardMat = useMemo(() => new THREE.MeshBasicMaterial({ map: card, toneMapped: false }), [card])
  const vidMat = useMemo(() => new THREE.MeshBasicMaterial({ map: cinemaTexture(), toneMapped: false }), [])
  const vid = useRef()
  const cardRef = useRef()
  const m = getMaterials()
  useFrame(() => {
    const st = useCinema.getState()
    const live = st.active === screenId && st.hasFrame && !!sessionFor(screenId, st) && st.status !== 'ended'
    if (vid.current) {
      vid.current.visible = live
      if (live) {
        const a = st.aspect || 16 / 9
        const sa = width / height
        vid.current.scale.set(a > sa ? 1 : a / sa, a > sa ? sa / a : 1, 1)
      }
    }
    if (cardRef.current) cardRef.current.visible = !live
  })
  return (
    <group position={position} rotation={[0, yaw, 0]} userData={{ noBatch: true }}>
      <mesh position={[0, 0, -0.06]}><boxGeometry args={[width + 0.5, height + 0.5, 0.08]} /><meshStandardMaterial color="#060607" roughness={1} /></mesh>
      <mesh position={[0, 0, 0.001]}><planeGeometry args={[width, height]} /><meshBasicMaterial color="#020203" /></mesh>
      <mesh ref={cardRef} position={[0, 0, 0.004]} material={cardMat} scale={[Math.min(1, (height * 1.85) / width), 1, 1]}><planeGeometry args={[width, height]} /></mesh>
      <mesh ref={vid} position={[0, 0, 0.006]} material={vidMat} visible={false}><planeGeometry args={[width, height]} /></mesh>
    </group>
  )
}

/** House lights that dim while a movie plays on `screenId` for this visitor. */
function useHouseLights(screenId, anchors) {
  const regs = useRef([])
  useEffect(() => {
    regs.current = anchors.map((a) => ({ ...a, position: new THREE.Vector3(...a.position), base: a.intensity }))
    const offs = regs.current.map((a) => registerLightAnchor(a))
    return () => offs.forEach((f) => f())
  }, [screenId]) // eslint-disable-line react-hooks/exhaustive-deps
  const level = useRef(1)
  useFrame((_, dt) => {
    const st = useCinema.getState()
    const s = sessionFor(screenId, st)
    const dark = st.active === screenId && s && s.state === 'playing' && st.status !== 'ended'
    level.current += ((dark ? 0.12 : 1) - level.current) * Math.min(1, dt * 1.5)
    for (const a of regs.current) a.intensity = a.base * (a.screenGlow ? (dark ? 1 : 0) : level.current)
  })
  return level
}

// A stylized canvas-drawn gold medallion plaque (not a sculpted 3D lion — a flat procedural
// crest, same honesty level as every other canvas-texture prop in this file).
let lionTex = null
function lionTexture() {
  if (lionTex) return lionTex
  lionTex = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#1a140a'; ctx.fillRect(0, 0, w, h)
    const cx = w / 2, cy = h / 2
    ctx.strokeStyle = '#c9a96a'; ctx.lineWidth = 10
    ctx.beginPath(); ctx.arc(cx, cy, 220, 0, Math.PI * 2); ctx.stroke()
    ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 195, 0, Math.PI * 2); ctx.stroke()
    // mane: a ring of golden strokes radiating out from the head
    ctx.strokeStyle = '#d9b876'
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2
      const r0 = 95, r1 = 150 + (i % 3) * 14
      ctx.lineWidth = 7
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0)
      ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1)
      ctx.stroke()
    }
    // simple stylized face: muzzle, eyes, brow
    ctx.fillStyle = '#e8cf9a'
    ctx.beginPath(); ctx.ellipse(cx, cy + 10, 70, 60, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#2a1f10'
    ctx.beginPath(); ctx.ellipse(cx - 28, cy - 8, 11, 15, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.ellipse(cx + 28, cy - 8, 11, 15, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.moveTo(cx - 16, cy + 18); ctx.lineTo(cx + 16, cy + 18); ctx.lineTo(cx, cy + 34); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = '#2a1f10'; ctx.lineWidth = 4
    ctx.beginPath(); ctx.moveTo(cx, cy + 34); ctx.lineTo(cx, cy + 46); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx - 34, cy + 50); ctx.lineTo(cx, cy + 46); ctx.lineTo(cx + 34, cy + 50); ctx.stroke()
    ctx.fillStyle = '#c9a96a'; ctx.font = `800 26px ${FONTS.display}`; ctx.textAlign = 'center'
    ctx.fillText('VISION CINEMA', cx, cy + 250)
  })
  return lionTex
}
function LionPlaque({ position, yaw }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: lionTexture(), emissive: '#4a3210', emissiveMap: lionTexture(), emissiveIntensity: 0.35, roughness: 0.55 }), [])
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0, 0.02]} material={mat}><circleGeometry args={[1.35, 48]} /></mesh>
    </group>
  )
}

// Instanced recliners: seat bases, cushions, reclined backs, armrests between seats.
function Recliners({ seats, color = '#5a1d24', cupHolders = false }) {
  const base = useRef(), back = useRef(), arm = useRef(), foot = useRef(), cup = useRef()
  const m = getMaterials()
  const leather = m.leather(color)
  const dark = m.leather('#1d1a1c')
  const cupMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0e0e10', metalness: 0.6, roughness: 0.3 }), [])
  const arms = useMemo(() => {
    // one armrest each side of every seat (neighbours share)
    const out = new Map()
    for (const s of seats) for (const side of [-0.5, 0.5]) { const z = +(s.position[2] + side * s.spacing).toFixed(3); out.set(s.row + ':' + z, [s.position[0], s.floorY, z]) }
    return [...out.values()]
  }, [seats])
  useEffect(() => {
    const o = new THREE.Object3D()
    seats.forEach((s, i) => {
      const [x, , z] = s.position
      o.rotation.set(0, 0, 0)
      o.position.set(x, s.floorY + 0.24, z); o.scale.set(0.78, 0.48, s.spacing - 0.16); o.updateMatrix(); base.current.setMatrixAt(i, o.matrix)
      o.position.set(x + 0.42, s.floorY + 0.78, z); o.rotation.set(0, 0, -0.32); o.scale.set(0.2, 0.92, s.spacing - 0.18); o.updateMatrix(); back.current.setMatrixAt(i, o.matrix)
      o.rotation.set(0, 0, 0); o.position.set(x - 0.47, s.floorY + 0.2, z); o.scale.set(0.16, 0.3, s.spacing - 0.2); o.updateMatrix(); foot.current.setMatrixAt(i, o.matrix)
    })
    arms.forEach(([x, y, z], i) => { o.rotation.set(0, 0, 0); o.position.set(x + 0.02, y + 0.33, z); o.scale.set(0.86, 0.66, 0.13); o.updateMatrix(); arm.current.setMatrixAt(i, o.matrix) })
    if (cupHolders && cup.current) arms.forEach(([x, y, z], i) => { o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.position.set(x + 0.3, y + 0.67, z); o.updateMatrix(); cup.current.setMatrixAt(i, o.matrix) })
    for (const r of cupHolders ? [base, back, arm, foot, cup] : [base, back, arm, foot]) { r.current.instanceMatrix.needsUpdate = true; r.current.computeBoundingSphere() }
  }, [seats, arms, cupHolders])
  useSeats(seats.map(({ position, yaw, height, label }) => ({ position, yaw, height, label })), [seats])
  // solid colliders that fit the recliners: one seat block and one backrest block per row,
  // leaving the leg room in front of each row free to walk along
  const rows = useMemo(() => {
    const m = new Map()
    for (const s of seats) {
      const r = m.get(s.row) || { x: s.position[0], y: s.floorY, z0: Infinity, z1: -Infinity, sp: s.spacing }
      r.z0 = Math.min(r.z0, s.position[2] - s.spacing / 2); r.z1 = Math.max(r.z1, s.position[2] + s.spacing / 2)
      m.set(s.row, r)
    }
    return [...m.values()]
  }, [seats])
  return (
    <group userData={{ noBatch: true }}>
      <RigidBody type="fixed" colliders={false}>
        {rows.map((r, i) => (
          <group key={i}>
            <CuboidCollider args={[0.33, 0.25, (r.z1 - r.z0) / 2]} position={[r.x - 0.03, r.y + 0.25, (r.z0 + r.z1) / 2]} />
            <CuboidCollider args={[0.11, 0.58, (r.z1 - r.z0) / 2]} position={[r.x + 0.41, r.y + 0.58, (r.z0 + r.z1) / 2]} />
          </group>
        ))}
      </RigidBody>
      <instancedMesh ref={base} args={[null, leather, seats.length]} castShadow receiveShadow><boxGeometry /></instancedMesh>
      <instancedMesh ref={back} args={[null, leather, seats.length]} castShadow><boxGeometry /></instancedMesh>
      <instancedMesh ref={foot} args={[null, dark, seats.length]}><boxGeometry /></instancedMesh>
      <instancedMesh ref={arm} args={[null, dark, arms.length]} castShadow><boxGeometry /></instancedMesh>
      {cupHolders && <instancedMesh ref={cup} args={[null, cupMat, arms.length]}><cylinderGeometry args={[0.06, 0.06, 0.1, 10]} /></instancedMesh>}
    </group>
  )
}

/** Wall panel that opens the screen & sound controls (also reachable from the HUD). */
function ControlPanel({ position, yaw, screenId }) {
  const m = getMaterials()
  useEffect(() => registerInteractable('screen-ctl-' + screenId, {
    position: new THREE.Vector3(position[0], position[1] - 1.3, position[2]),
    radius: 1.8,
    label: 'Screen & sound controls',
    onInteract: () => useStore.getState().openPanel({ type: 'cinema', screenId }),
  }), [screenId]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh material={m.blackSteel}><boxGeometry args={[0.5, 0.7, 0.05]} /></mesh>
      <mesh position={[0, 0.08, 0.03]}><planeGeometry args={[0.38, 0.3]} /><meshBasicMaterial color="#1c3a52" toneMapped={false} /></mesh>
      {[-0.1, 0, 0.1].map((x) => <mesh key={x} position={[x, -0.2, 0.03]}><circleGeometry args={[0.03, 16]} /><meshBasicMaterial color="#c9a96a" /></mesh>)}
    </group>
  )
}

// ---------------- an auditorium with stadium seating ----------------
/**
 * Screen on the x0 wall (facing +x), rows rise toward x1. A floor-level corridor runs along the
 * entry side to the door in the x1 wall; a stepped aisle on the far side reaches every row.
 */
export function Auditorium({ screenId, x0, x1, z0, z1, entry, floorY, height, rows = 6, rowDepth = 1.75, tier = 0.35, spacing = 1.1, firstRow = 6.4, corridor = 1.5, aisle = 1.2, screenH, seatColor, title, backExit = true, wallColor, cupHolders = false, artKind }) {
  const m = getMaterials()
  const carpet = signatureMarble(4, 4) // floor and step treads: signature black marble
  const riser = surface('carpet', 4, 0.4, { color: '#241c27' })
  // Realism upgrade demo: one room (The Royal Reserve) gets a real quilted normal map on its
  // walls instead of the flat tinted fabric every other auditorium uses, to preview the pass
  // before it's rolled out to the rest of the tower.
  const wallFabric = screenId === 'cinema-3' ? m.fabricHD(wallColor || '#2a2326') : m.fabric(wallColor || '#2a2326')
  const sconceMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f6e3c4', emissive: '#ffcf8f', emissiveIntensity: 1.4, toneMapped: false }), [])
  const stepLight = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffb766', toneMapped: false }), [])
  const zc = (lo, hi) => (lo + hi) / 2
  const sgn = entry === 'z0' ? 1 : -1 // direction from the entry side toward the far side
  const zEntry = entry === 'z0' ? z0 : z1
  const zFar = entry === 'z0' ? z1 : z0
  const seatLo = zEntry + sgn * (corridor + 0.1), seatHi = zFar - sgn * (aisle + 0.1)
  const blockZ0 = Math.min(seatLo, seatHi), blockZ1 = Math.max(seatLo, seatHi)
  const n = Math.max(1, Math.floor((blockZ1 - blockZ0) / spacing))
  const rowX = Array.from({ length: rows }, (_, k) => x0 + firstRow + k * rowDepth)
  const platformZ0 = entry === 'z0' ? zEntry + sgn * corridor : zFar
  const platformZ1 = entry === 'z0' ? zFar : zEntry + sgn * corridor
  const aisleZ0 = Math.min(zFar, zFar - sgn * aisle), aisleZ1 = Math.max(zFar, zFar - sgn * aisle)

  // platforms (tiers) under rows 1..n-1, from each row's front edge to the next one / back wall
  const platforms = rowX.slice(1).map((x, i) => {
    const k = i + 1
    const xa = x - rowDepth / 2, xb = k === rows - 1 ? x1 : rowX[k + 1] - rowDepth / 2
    return { k, xa, xb, h: k * tier }
  })
  // aisle steps: two half-height steps per tier, inside the aisle strip
  const steps = []
  platforms.forEach(({ k, xa }) => {
    steps.push({ xa: xa - rowDepth / 2, xb: xa, h: (k - 0.5) * tier })
  })

  const seats = useMemo(() => {
    const out = []
    rowX.forEach((x, k) => {
      for (let i = 0; i < n; i++) {
        const z = blockZ0 + spacing / 2 + i * spacing + ((blockZ1 - blockZ0) - n * spacing) / 2
        const fy = floorY + k * tier
        out.push({ position: [x, fy + 0.5, z], floorY: fy, yaw: -Math.PI / 2, height: 0.5, label: 'Sit in recliner', row: k, spacing })
      }
    })
    return out
  }, [screenId]) // eslint-disable-line react-hooks/exhaustive-deps

  const sw = Math.min(z1 - z0 - 2.0, (screenH || height - 2.6) * 1.85)
  const sh = sw / 1.85
  const screenY = floorY + 1.2 + sh / 2
  const anchors = useMemo(() => [
    { position: [x0 + firstRow + rowDepth * 2, floorY + height - 1, zc(z0, z1)], color: '#ffd9a8', intensity: 16, distance: 16, range: 30 },
    { position: [x1 - 2, floorY + height - 1.5, zc(z0, z1)], color: '#ffd9a8', intensity: 10, distance: 12, range: 30 },
    { position: [x0 + 2.5, screenY, zc(z0, z1)], color: '#a9c4ff', intensity: 9, distance: 14, screenGlow: true, range: 30 },
  ], [screenId]) // eslint-disable-line react-hooks/exhaustive-deps
  const lights = useHouseLights(screenId, anchors)
  useFrame(() => { sconceMat.emissiveIntensity = 0.25 + 1.2 * lights.current })

  const sconceXs = []
  for (let x = x0 + 3; x < x1 - 1; x += 3.2) sconceXs.push(x)

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {platforms.map(({ k, xa, xb, h }) => <CuboidCollider key={'p' + k} args={[(xb - xa) / 2, h / 2, (platformZ1 - platformZ0) / 2]} position={[zc(xa, xb), floorY + h / 2, zc(platformZ0, platformZ1)]} />)}
        {steps.map(({ xa, xb, h }, i) => <CuboidCollider key={'s' + i} args={[(xb - xa) / 2, h / 2, (aisleZ1 - aisleZ0) / 2]} position={[zc(xa, xb), floorY + h / 2, zc(aisleZ0, aisleZ1)]} />)}
        {/* rail along the corridor edge so nobody steps off the top rows */}
        <CuboidCollider args={[(x1 - rowX[1] + rowDepth / 2) / 2, 0.55 + (rows - 1) * tier / 2, 0.04]} position={[zc(rowX[1] - rowDepth / 2, x1), floorY + 0.55 + (rows - 1) * tier / 2, entry === 'z0' ? platformZ0 : platformZ1]} />
        {/* screen stage */}
        <CuboidCollider args={[0.6, 0.3, (z1 - z0) / 2 - 0.6]} position={[x0 + 0.6, floorY + 0.3, zc(z0, z1)]} />
      </RigidBody>

      {/* floor, tiers and aisle steps */}
      <mesh position={[zc(x0, x1), floorY + 0.006, zc(z0, z1)]} rotation={[-Math.PI / 2, 0, 0]} material={carpet} receiveShadow><planeGeometry args={[x1 - x0, z1 - z0]} /></mesh>
      {platforms.map(({ k, xa, xb, h }) => (
        <group key={'pv' + k}>
          <mesh position={[zc(xa, xb), floorY + h / 2, zc(platformZ0, platformZ1)]} material={[riser, riser, carpet, riser, riser, riser]} receiveShadow><boxGeometry args={[xb - xa, h, platformZ1 - platformZ0]} /></mesh>
          {/* step lights along each riser edge */}
          <mesh position={[xa - 0.002, floorY + h - 0.04, zc(aisleZ0, aisleZ1)]} rotation={[0, -Math.PI / 2, 0]} material={stepLight}><planeGeometry args={[aisleZ1 - aisleZ0 - 0.2, 0.025]} /></mesh>
        </group>
      ))}
      {steps.map(({ xa, xb, h }, i) => (
        <group key={'sv' + i}>
          <mesh position={[zc(xa, xb), floorY + h / 2, zc(aisleZ0, aisleZ1)]} material={[riser, riser, carpet, riser, riser, riser]}><boxGeometry args={[xb - xa, h, aisleZ1 - aisleZ0]} /></mesh>
          <mesh position={[xa - 0.002, floorY + h - 0.04, zc(aisleZ0, aisleZ1)]} rotation={[0, -Math.PI / 2, 0]} material={stepLight}><planeGeometry args={[aisleZ1 - aisleZ0 - 0.2, 0.025]} /></mesh>
        </group>
      ))}
      {/* glass + steel rail along the corridor edge of every tier */}
      {platforms.map(({ k, xa, xb, h }) => (
        <group key={'rail' + k} position={[zc(xa, xb), floorY + h, entry === 'z0' ? platformZ0 : platformZ1]}>
          <mesh position={[0, 0.5, 0]} material={m.glass}><boxGeometry args={[xb - xa, 0.9, 0.03]} /></mesh>
          <mesh position={[0, 0.97, 0]} material={m.blackSteel}><boxGeometry args={[xb - xa, 0.05, 0.07]} /></mesh>
        </group>
      ))}

      <Recliners seats={seats} color={seatColor} cupHolders={cupHolders} />

      {/* screen, stage, speakers */}
      <mesh position={[x0 + 0.6, floorY + 0.3, zc(z0, z1)]} material={m.blackSteel}><boxGeometry args={[1.2, 0.6, z1 - z0 - 1.2]} /></mesh>
      <CinemaScreen screenId={screenId} position={[x0 + 0.08, screenY, zc(z0, z1)]} yaw={Math.PI / 2} width={sw} height={sh} title={title} />
      <Speaker position={[x0 + 0.5, floorY + 0.6, z0 + 0.6]} yaw={Math.PI / 2} scale={2.2} />
      <Speaker position={[x0 + 0.5, floorY + 0.6, z1 - 0.6]} yaw={Math.PI / 2} scale={2.2} />
      {sconceXs.filter((_, i) => i % 2).map((x) => [z0 + 0.15, z1 - 0.15].map((z) => <Speaker key={x + ':' + z} position={[x, floorY + Math.max(2.1, height - 3.2), z]} yaw={z < zc(z0, z1) ? 0 : Math.PI} scale={0.8} />))}

      {/* acoustic fabric on the side walls, sconces, ceiling */}
      {[z0 + 0.02, z1 - 0.02].map((z) => (
        <mesh key={'wf' + z} position={[zc(x0, x1), floorY + height / 2, z]} rotation={[0, z < zc(z0, z1) ? 0 : Math.PI, 0]} material={wallFabric}><planeGeometry args={[x1 - x0, height]} /></mesh>
      ))}
      {sconceXs.flatMap((x) => [z0 + 0.08, z1 - 0.08].map((z) => (
        <mesh key={'sc' + x + z} position={[x, floorY + 2.6 + (x - x0 > firstRow ? Math.min(rows - 1, Math.max(0, (x - x0 - firstRow) / rowDepth)) * tier : 0), z]} material={sconceMat}>
          <boxGeometry args={[0.36, 0.5, 0.1]} />
        </mesh>
      )))}
      <mesh position={[zc(x0, x1), floorY + height - 0.02, zc(z0, z1)]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[x1 - x0, z1 - z0]} /><meshStandardMaterial color="#141217" roughness={1} /></mesh>

      {artKind === 'lion' && <LionPlaque position={[zc(x0, x1), floorY + height * 0.55, z0 + 0.03]} yaw={0} />}
      {artKind === 'lion' && <LionPlaque position={[zc(x0, x1), floorY + height * 0.55, z1 - 0.03]} yaw={Math.PI} />}

      {/* exit signs over the entrance and at the front by the screen */}
      {backExit && <ExitSign position={[x1 - 0.06, floorY + 2.95, zEntry + sgn * corridor / 2]} yaw={-Math.PI / 2} />}
      <ExitSign position={[x0 + 2.2, floorY + 2.7, zEntry + sgn * 0.05]} yaw={entry === 'z0' ? 0 : Math.PI} />
      <ControlPanel screenId={screenId} position={[x1 - 1.3, floorY + 1.45, zEntry + sgn * 0.04]} yaw={entry === 'z0' ? 0 : Math.PI} />
    </group>
  )
}

// ---------------- the cinema building's interior ----------------
function PosterFrame({ position, yaw, index }) {
  const m = getMaterials()
  const tex = useMemo(() => canvasTexture(400, 600, (ctx, w, h) => { ctx.fillStyle = '#16141c'; ctx.fillRect(0, 0, w, h) }), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.55, toneMapped: false }), [tex])
  useEffect(() => {
    let live = true
    const draw = async () => {
      const movies = watchable()
      const mv = movies[index % Math.max(1, movies.length)]
      const ctx = tex.image.getContext('2d')
      const w = 400, h = 600
      ctx.fillStyle = '#16141c'; ctx.fillRect(0, 0, w, h)
      if (mv?.cover) {
        const url = await fileUrl(mv.cover)
        const img = new Image()
        img.crossOrigin = 'anonymous'
        await new Promise((r) => { img.onload = r; img.onerror = r; img.src = url })
        if (!live) return
        if (img.naturalWidth) {
          const s = Math.max(w / img.naturalWidth, (h - 120) / img.naturalHeight)
          ctx.drawImage(img, (w - img.naturalWidth * s) / 2, (h - 120 - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s)
        }
      }
      ctx.fillStyle = 'rgba(10,9,14,.9)'; ctx.fillRect(0, h - 120, w, 120)
      ctx.fillStyle = '#c9a96a'; ctx.font = `500 18px ${FONTS.mono}`; ctx.textAlign = 'center'
      ctx.fillText(mv ? 'NOW SHOWING' : 'COMING SOON', w / 2, h - 82)
      ctx.fillStyle = '#f4f1ea'; ctx.font = `800 30px ${FONTS.display}`
      wrapText(ctx, mv?.title || 'Vision Storms Pictures', w / 2, h - 44, w - 40, 32)
      tex.needsUpdate = true
    }
    draw()
    const un = useMedia.subscribe((s, p) => { if (s.items !== p.items) draw() })
    return () => { live = false; un() }
  }, [index, tex])
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0, -0.03]} material={m.aluminum || m.chrome}><boxGeometry args={[1.1, 1.6, 0.05]} /></mesh>
      <mesh material={mat}><planeGeometry args={[1, 1.5]} /></mesh>
    </group>
  )
}

function BoxOffice({ position }) {
  useEffect(() => registerInteractable('cinema-showtimes', {
    position: new THREE.Vector3(...position),
    radius: 2.2,
    label: 'Showtimes',
    onInteract: () => useStore.getState().openPanel({ type: 'cinema', screenId: null }),
  }), []) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

function Concessions({ x, z }) {
  const m = getMaterials()
  const board = useMemo(() => canvasTexture(1024, 300, (ctx, w, h) => {
    ctx.fillStyle = '#121016'; ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#c9a96a'; ctx.font = `800 54px ${FONTS.display}`; ctx.textAlign = 'center'
    ctx.fillText('CONCESSIONS', w / 2, 70)
    ctx.font = `500 32px ${FONTS.body}`; ctx.fillStyle = '#f4f1ea'
    ;[['Popcorn', 'Nachos', 'Soft drinks'], ['Candy', 'Hot dogs', 'Iced tea']].forEach((col, i) => col.forEach((t, j) => ctx.fillText(t, w * (0.3 + i * 0.4), 140 + j * 52)))
  }), [])
  const popcorn = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f3d36b', emissive: '#f0b440', emissiveIntensity: 0.5, roughness: 0.9 }), [])
  return (
    <group>
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.4, 0.55, 3.2]} position={[x, CINEMA.floor + 0.55, z]} /></RigidBody>
      <Counter position={[x, CINEMA.floor, z]} yaw={Math.PI / 2} length={6.4} />
      <group position={[x - 0.05, CINEMA.floor + 1.05, z - 2.2]}>
        <mesh position={[0, 0.35, 0]} material={m.glass}><boxGeometry args={[0.6, 0.7, 0.6]} /></mesh>
        <mesh position={[0, 0.2, 0]} material={popcorn}><boxGeometry args={[0.52, 0.32, 0.52]} /></mesh>
        <mesh position={[0, 0.74, 0]} material={m.neon('#e0312f', 1.2)}><boxGeometry args={[0.64, 0.08, 0.64]} /></mesh>
      </group>
      {[0.6, 1.2].map((dz) => <mesh key={dz} position={[x, CINEMA.floor + 1.2, z + dz]} material={m.darkMetal}><cylinderGeometry args={[0.12, 0.12, 0.3, 16]} /></mesh>)}
      <mesh position={[PART_X + 0.17, CINEMA.floor + 3.4, z]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[5, 1.46]} />
        <meshBasicMaterial map={board} toneMapped={false} />
      </mesh>
    </group>
  )
}

function DoorNumber({ position, text }) {
  const tex = useMemo(() => canvasTexture(512, 134, (ctx, w, h) => { ctx.fillStyle = '#121016'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#f4f1ea'; ctx.font = `700 46px ${FONTS.body}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, w / 2, h / 2 + 2) }), [text])
  return (
    <mesh position={position} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[1.6, 0.42]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  )
}

export function CinemaInterior() {
  const m = getMaterials()
  const { x1, z0, z1, ih, floor } = CINEMA
  const plaster = surface('plaster', 4, 2, { color: '#2a2428' })
  const lobbyCarpet = signatureMarble(3, 6)
  const wallH = ih
  // partition with two auditorium doorways, and the dividing wall
  const doors = AUDITORIUMS.map((a) => ({ z: a.entry === 'z0' ? a.z0 + 0.75 : a.z1 - 0.75, a }))
  const DW = 1.3, DH = 2.5
  const partSegs = []
  let cur = z0 + T
  for (const d of [...doors].sort((p, q) => p.z - q.z)) { partSegs.push([cur, d.z - DW / 2]); cur = d.z + DW / 2 }
  partSegs.push([cur, z1 - T])

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {partSegs.map(([a, b], i) => b > a && <CuboidCollider key={i} args={[0.15, wallH / 2, (b - a) / 2]} position={[PART_X, floor + wallH / 2, (a + b) / 2]} />)}
        {doors.map((d, i) => <CuboidCollider key={'h' + i} args={[0.15, (wallH - DH) / 2, DW / 2]} position={[PART_X, floor + DH + (wallH - DH) / 2, d.z]} />)}
        <CuboidCollider args={[(PART_X - CINEMA.x0 - T) / 2, wallH / 2, 0.15]} position={[(CINEMA.x0 + T + PART_X) / 2, floor + wallH / 2, DIV_Z]} />
      </RigidBody>
      {partSegs.map(([a, b], i) => b > a && <mesh key={i} position={[PART_X, floor + wallH / 2, (a + b) / 2]} material={plaster} receiveShadow><boxGeometry args={[0.3, wallH, b - a]} /></mesh>)}
      {doors.map((d, i) => <mesh key={'hv' + i} position={[PART_X, floor + DH + (wallH - DH) / 2, d.z]} material={plaster}><boxGeometry args={[0.3, wallH - DH, DW]} /></mesh>)}
      <mesh position={[(CINEMA.x0 + T + PART_X) / 2, floor + wallH / 2, DIV_Z]} material={plaster}><boxGeometry args={[PART_X - CINEMA.x0 - T, wallH, 0.3]} /></mesh>
      {doors.map((d, i) => (
        <group key={'d' + i}>
          <SingleDoor id={'aud-door-' + d.a.screenId} hinge={[PART_X + 0.16, floor, d.z - DW / 2 + 0.05]} width={DW - 0.1} height={DH - 0.05} baseYaw={-Math.PI / 2} openAngle={-1.5} label={SCREENS[d.a.screenId].name + ' door'} />
          <DoorNumber position={[PART_X + 0.16, floor + DH + 0.45, d.z]} text={SCREENS[d.a.screenId].name.toUpperCase()} />
        </group>
      ))}

      {/* lobby */}
      <mesh position={[(PART_X + x1) / 2, floor + 0.006, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={lobbyCarpet} receiveShadow><planeGeometry args={[x1 - PART_X - T, z1 - z0 - T * 2]} /></mesh>
      <Concessions x={PART_X + 1.2} z={-7} />
      <BoxOffice position={[PART_X + 2.4, floor, -7]} />
      {[[-12, -21.5, 0], [-15, -21.5, 0], [-12, 7.5, Math.PI], [-15, 7.5, Math.PI]].map(([x, z, yaw], i) => <PosterFrame key={i} position={[x, floor + 1.9, z]} yaw={yaw} index={i} />)}
      <Sofa position={[-13.5, floor, -17.5]} yaw={Math.PI / 2} length={2.4} color="#3a2a33" label="Sit on lounge sofa" />
      <Sofa position={[-13.5, floor, 3.5]} yaw={Math.PI / 2} length={2.4} color="#3a2a33" label="Sit on lounge sofa" />
      <Table position={[-12.4, floor, -17.5]} size={[0.6, 1.2]} height={0.45} />
      <Table position={[-12.4, floor, 3.5]} size={[0.6, 1.2]} height={0.45} />
      <Plant position={[-10.9, floor, -20.8]} scale={1.2} />
      <Plant position={[-10.9, floor, 6.8]} scale={1.2} />
      {[-18, -12, -2, 4].map((z) => <CeilingLight key={z} position={[-13.5, floor + 5.6, z]} size={[1.4, 1.4]} intensity={10} color="#ffe2bf" />)}
      <mesh position={[(PART_X + x1) / 2, floor + 5.8, (z0 + z1) / 2]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[x1 - PART_X, z1 - z0]} /><meshStandardMaterial color="#1b171c" roughness={0.9} /></mesh>
      <ExitSign position={[x1 - 0.42, floor + 3.9, -7]} yaw={-Math.PI / 2} />
      <Atm id="atm-cinema-lobby" position={[x1 - 0.7, floor, 1.0]} yaw={-Math.PI / 2} />

      {AUDITORIUMS.map((a, i) => (
        <Auditorium key={a.screenId} {...a} floorY={floor} height={ih} title={SCREENS[a.screenId].name} seatColor={i ? '#24304a' : '#5a1d24'} />
      ))}
      <CinemaTowerFloors />
    </group>
  )
}
