import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface, signatureMarble } from './materials.js'
import { Wall, Gate, Block } from './jobkit.jsx'
import { DoubleDoor } from './Door.jsx'
import { BrandSign, Plaque } from './signs.jsx'
import { CeilingLight, PendantLight } from './furniture.jsx'
import { Palms } from './Vegetation.jsx'
import { registerLightAnchor, nightLit } from '../state/environment.js'
import { registerLoad, switchedMaterial } from '../state/power.js'
import { useMusic } from '../music/engine.js'
import { canvasTexture, wrapText } from './canvasText.js'
import { FONTS } from '../config/theme.js'
import { HALL, PLATFORM, PLATFORM_Y, HALL_FLOOR, HALL_H, HALL_CEIL, HALL_ZONE, HALL_BAL_Y, CURB } from '../config/concerthall.js'

// ============================================================================
// THE REIGN ARENA
// A GTA-style luxury indoor concert hall: a lion-head waterfall centrepiece greets visitors in
// the lobby, a two-level seating bowl (ground stalls + balcony) faces a lit stage with a moving
// colour-wash rig, and glowing teal aisle runways lead every row. Interiors draw only when the
// camera is near (Gate). Exterior shell always renders & collides.
// ============================================================================

const H = HALL
const FLY = HALL_FLOOR
const CX = (H.x0 + H.x1) / 2, CZ = (H.z0 + H.z1) / 2
const W = H.x1 - H.x0, D = H.z1 - H.z0
const T = 0.5
const RECT = { x0: H.x0, x1: H.x1, z0: H.z0, z1: H.z1 }
const CEILY = FLY + HALL_CEIL
const TOPY = CURB + HALL_H
const DOOR_X = CX
const ZONE = HALL_ZONE

const LOBBY_Z1 = H.z0 + 7 // lobby depth (z0..LOBBY_Z1)
const AISLE_HALF = 1.2
const STAGE_Z0 = H.z1 - 3.2, STAGE_Z1 = H.z1 - 0.4
const STAGE_H = 1.3
const SEAT_Z0 = LOBBY_Z1 + 1 // nearest-to-lobby (back, highest) row edge
const SEAT_Z1 = STAGE_Z0 - 0.7 // nearest-to-stage (front, lowest) row edge
const ROWS = 6
const TIER = 0.38
const SEAT_SP = 1.05
const SEATS_PER_ROW = 12
const BAL_FRONT_Z = H.z0 + 9 // balcony overhangs the lobby; its front rail looks out over the stalls

let M
function mats() {
  if (M) return M
  M = {
    gold: new THREE.MeshStandardMaterial({ color: '#c9a25a', roughness: 0.25, metalness: 0.9 }),
    goldDark: new THREE.MeshStandardMaterial({ color: '#7a5e30', roughness: 0.3, metalness: 0.85 }),
    black: new THREE.MeshPhysicalMaterial({ color: '#0b0a0d', roughness: 0.15, metalness: 0.4, clearcoat: 1 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#8fa8c8', roughness: 0.04, transparent: true, opacity: 0.2, depthWrite: false }),
    carpetRed: surface('carpet', 4, 4, { color: '#4a0f16', roughness: 0.85 }),
  }
  return M
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const ctx = c.getContext('2d'); draw(ctx, w, h)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}

// ---------------- lion-head waterfall ----------------
function waterStreakTex() {
  return canvasTex(64, 256, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(180,225,235,0.0)'; ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * w, len = 20 + Math.random() * 60
      const g = ctx.createLinearGradient(0, 0, 0, len)
      g.addColorStop(0, 'rgba(210,240,245,0)'); g.addColorStop(0.5, 'rgba(210,240,245,0.5)'); g.addColorStop(1, 'rgba(210,240,245,0)')
      ctx.fillStyle = g
      ctx.fillRect(x, Math.random() * h, 1.4, len)
    }
  })
}

/** A gilded lion-head relief mounted on the wall, pouring a sheet of water into a lobby pool. */
function LionWaterfall({ position }) {
  const m = mats()
  const [x, y, z] = position
  const waterMat = getMaterials().water
  const sheetTex = useMemo(() => {
    const t = waterStreakTex()
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(3, 2)
    return t
  }, [])
  const sheetMat = useMemo(() => new THREE.MeshStandardMaterial({ map: sheetTex, transparent: true, opacity: 0.85, color: '#cdeef2', roughness: 0.15, metalness: 0.1, depthWrite: false }), [sheetTex])
  const poolRef = useRef()
  const mane = useMemo(() => {
    const out = []
    const n = 22
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const r = 0.95 + (i % 3) * 0.08
      out.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, s: 0.3 + (i % 4) * 0.05, rot: a })
    }
    return out
  }, [])
  useFrame((_, dt) => {
    sheetTex.offset.y -= dt * 1.4
    if (poolRef.current) poolRef.current.position.y = y - 2.55 + Math.sin(performance.now() * 0.002) * 0.01
  })
  return (
    <group position={[x, y, z]}>
      {/* mane tufts in a ring around the face */}
      {mane.map((t, i) => (
        <mesh key={i} position={[t.x, t.y, -0.12]} rotation={[0, 0, t.rot]} material={i % 2 ? m.goldDark : m.gold} castShadow>
          <coneGeometry args={[t.s * 0.55, t.s, 6]} />
        </mesh>
      ))}
      {/* face plate */}
      <mesh position={[0, 0, 0]} material={m.gold} castShadow><sphereGeometry args={[0.95, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.62]} /></mesh>
      {/* brow ridge + ears */}
      {[-0.55, 0.55].map((ex) => (
        <mesh key={ex} position={[ex, 0.72, -0.1]} material={m.goldDark} castShadow><sphereGeometry args={[0.22, 12, 10]} /></mesh>
      ))}
      {/* eyes */}
      {[-0.32, 0.32].map((ex) => (
        <mesh key={ex} position={[ex, 0.14, 0.8]} material={m.black}><sphereGeometry args={[0.1, 10, 10]} /></mesh>
      ))}
      {/* muzzle */}
      <mesh position={[0, -0.28, 0.86]} material={m.goldDark} castShadow><sphereGeometry args={[0.4, 16, 12]} /></mesh>
      {/* open mouth: the water spout */}
      <mesh position={[0, -0.52, 0.95]} rotation={[0.3, 0, 0]} material={m.black}><boxGeometry args={[0.46, 0.22, 0.3]} /></mesh>
      {/* falling water sheet */}
      <mesh position={[0, -1.7, 1.0]} material={sheetMat} userData={{ noBatch: true }}>
        <planeGeometry args={[0.9, 2.3]} />
      </mesh>
      {/* basin lip + pool */}
      <mesh position={[0, -2.55, 1.6]} material={surface('limestone', 2, 1, { color: '#d9d2c0' })} castShadow receiveShadow>
        <cylinderGeometry args={[1.95, 2.05, 0.5, 40]} />
      </mesh>
      <mesh ref={poolRef} position={[0, -2.3, 1.6]} rotation={[-Math.PI / 2, 0, 0]} material={waterMat}>
        <circleGeometry args={[1.8, 40]} />
      </mesh>
      {/* gold crest plaque above the head */}
      <mesh position={[0, 1.25, -0.2]} material={m.gold}><boxGeometry args={[1.5, 0.22, 0.08]} /></mesh>
    </group>
  )
}

// ---------------- stairs to the balcony ----------------
function Staircase({ x, z0, dirZ, rise, run, n, w = 1.9 }) {
  const m = mats()
  const ledMat = useMemo(() => nightLit(new THREE.MeshStandardMaterial({ color: '#bfeeea', emissive: '#2fd0c4', emissiveIntensity: 2.4, toneMapped: false }), 2.4, 1.6), [])
  const stepH = rise / n, stepD = run / n
  const steps = useMemo(() => Array.from({ length: n }, (_, i) => ({
    y: FLY + (i + 1) * stepH,
    z: z0 + dirZ * (i + 0.5) * stepD,
  })), [n, stepH, stepD, z0, dirZ])
  const ang = Math.atan2(rise, run) * (dirZ > 0 ? 1 : -1)
  const L = Math.hypot(rise, run)
  const rampCz = z0 + dirZ * run / 2
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[w / 2, 0.12, L / 2]} position={[x, FLY + rise / 2, rampCz]} rotation={[ang, 0, 0]} />
        <CuboidCollider args={[w / 2 + 0.1, 0.6, 0.1]} position={[x, FLY + rise + 0.6, z0 + dirZ * (run + 0.3)]} />
      </RigidBody>
      {steps.map((s, i) => (
        <group key={i}>
          <mesh position={[x, s.y - 0.02, s.z]} material={m.carpetRed} castShadow receiveShadow><boxGeometry args={[w, 0.04, stepD]} /></mesh>
          <mesh position={[x, s.y - stepH / 2, s.z - dirZ * (stepD / 2 - 0.01)]} material={m.black}><boxGeometry args={[w - 0.02, stepH - 0.02, 0.02]} /></mesh>
          <mesh position={[x - w / 2 + 0.06, s.y + 0.006, s.z]} material={ledMat}><boxGeometry args={[0.03, 0.012, stepD - 0.06]} /></mesh>
          <mesh position={[x + w / 2 - 0.06, s.y + 0.006, s.z]} material={ledMat}><boxGeometry args={[0.03, 0.012, stepD - 0.06]} /></mesh>
        </group>
      ))}
      {/* glass + chrome balustrade on the open edge */}
      {[-1, 1].map((side) => (
        <group key={side} position={[x + side * (w / 2 + 0.05), FLY + rise / 2 + 0.55, rampCz]} rotation={[ang, 0, 0]}>
          <mesh material={m.glass} userData={{ noBatch: true }}><boxGeometry args={[0.03, 1.0, L]} /></mesh>
          <mesh position={[0, 0.52, 0]} material={getMaterials().chrome}><boxGeometry args={[0.07, 0.06, L]} /></mesh>
        </group>
      ))}
    </group>
  )
}

// ---------------- the centre aisle: a smooth lit ramp between the two seating blocks ----------------
function AisleRamp({ z0, z1, y0, y1 }) {
  const m = getMaterials()
  const ledMat = useMemo(() => nightLit(new THREE.MeshStandardMaterial({ color: '#bfeeea', emissive: '#2fd0c4', emissiveIntensity: 2.6, toneMapped: false }), 2.6, 1.8), [])
  const dotMat = useMemo(() => nightLit(new THREE.MeshStandardMaterial({ color: '#e9e9ee', emissive: '#d8d8e4', emissiveIntensity: 2, toneMapped: false }), 2, 1.4), [])
  const len = z1 - z0
  const rise = y1 - y0
  const ang = Math.atan2(rise, len)
  const L = Math.hypot(rise, len)
  const cz = (z0 + z1) / 2, cy = (y0 + y1) / 2
  const dots = useMemo(() => Array.from({ length: Math.floor(len / 1.4) }, (_, i) => z0 + 0.7 + i * 1.4), [len, z0])
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[AISLE_HALF, 0.12, L / 2]} position={[CX, cy, cz]} rotation={[ang, 0, 0]} />
      </RigidBody>
      <mesh position={[CX, cy, cz]} rotation={[ang, 0, 0]} material={m.carpetRed} receiveShadow><boxGeometry args={[AISLE_HALF * 2, 0.08, L]} /></mesh>
      {[-AISLE_HALF + 0.08, AISLE_HALF - 0.08].map((dx) => (
        <mesh key={dx} position={[CX + dx, cy + 0.045, cz]} rotation={[ang, 0, 0]} material={ledMat}><boxGeometry args={[0.035, 0.012, L - 0.3]} /></mesh>
      ))}
      {dots.map((z, i) => {
        const t = (z - z0) / len
        const y = y0 + rise * t + 0.05
        return <mesh key={i} position={[CX, y, z]} rotation={[-Math.PI / 2, 0, 0]} material={dotMat}><circleGeometry args={[0.06, 10]} /></mesh>
      })}
    </group>
  )
}

// ---------------- instanced stadium seating (teal leather, chrome frame) ----------------
function SeatBlock({ rows, cols, cx, z0, dirZ, rowDepth, tier, spacing, floorY, faceSign }) {
  const gm = getMaterials()
  const cushion = gm.leather('#0d6e6e')
  const chrome = gm.chrome
  const base = useRef(), back = useRef(), legL = useRef(), legR = useRef()
  const n = rows * cols
  const seats = useMemo(() => {
    const out = []
    for (let r = 0; r < rows; r++) {
      const z = z0 + dirZ * (r + 0.5) * rowDepth
      const y = floorY + r * tier
      for (let c = 0; c < cols; c++) {
        const x = cx + (c - (cols - 1) / 2) * spacing
        out.push({ x, y, z })
      }
    }
    return out
  }, [rows, cols, cx, z0, dirZ, rowDepth, tier, spacing, floorY])
  useEffect(() => {
    const o = new THREE.Object3D()
    seats.forEach((s, i) => {
      o.rotation.set(0, 0, 0)
      o.position.set(s.x, s.y + 0.26, s.z); o.scale.set(0.76, 0.5, 0.78); o.updateMatrix(); base.current.setMatrixAt(i, o.matrix)
      o.rotation.set(faceSign * -0.24, 0, 0)
      o.position.set(s.x, s.y + 0.72, s.z - faceSign * 0.34); o.scale.set(0.76, 0.86, 0.14); o.updateMatrix(); back.current.setMatrixAt(i, o.matrix)
      o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1)
      o.position.set(s.x - 0.42, s.y, s.z); o.updateMatrix(); legL.current.setMatrixAt(i, o.matrix)
      o.position.set(s.x + 0.42, s.y, s.z); o.updateMatrix(); legR.current.setMatrixAt(i, o.matrix)
    })
    for (const r of [base, back, legL, legR]) { r.current.instanceMatrix.needsUpdate = true; r.current.computeBoundingSphere() }
  }, [seats, faceSign])
  // one solid collider per row so the aisle and gaps stay walkable
  const rowBlocks = useMemo(() => {
    const out = []
    for (let r = 0; r < rows; r++) {
      const z = z0 + dirZ * (r + 0.5) * rowDepth
      out.push({ x: cx, y: floorY + r * tier, z, width: cols * spacing })
    }
    return out
  }, [rows, cols, cx, z0, dirZ, rowDepth, tier, floorY, spacing])
  return (
    <group userData={{ noBatch: true }}>
      <RigidBody type="fixed" colliders={false}>
        {rowBlocks.map((r, i) => <CuboidCollider key={i} args={[r.width / 2, 0.5, rowDepth / 2 - 0.05]} position={[r.x, r.y + 0.4, r.z]} />)}
      </RigidBody>
      <instancedMesh ref={base} args={[null, cushion, n]} castShadow receiveShadow><boxGeometry /></instancedMesh>
      <instancedMesh ref={back} args={[null, cushion, n]} castShadow><boxGeometry /></instancedMesh>
      <instancedMesh ref={legL} args={[null, chrome, n]}><cylinderGeometry args={[0.04, 0.04, 0.5, 8]} /></instancedMesh>
      <instancedMesh ref={legR} args={[null, chrome, n]}><cylinderGeometry args={[0.04, 0.04, 0.5, 8]} /></instancedMesh>
    </group>
  )
}

/** Both left and right blocks for one tiered seating deck (ground stalls or the balcony loge). */
function SeatingDeck({ rows, cols, z0, dirZ, rowDepth, tier, spacing, floorY, faceSign }) {
  const gap = AISLE_HALF + spacing * 0.5
  return (
    <>
      <SeatBlock rows={rows} cols={cols} cx={CX - gap - (cols * spacing) / 2} z0={z0} dirZ={dirZ} rowDepth={rowDepth} tier={tier} spacing={spacing} floorY={floorY} faceSign={faceSign} />
      <SeatBlock rows={rows} cols={cols} cx={CX + gap + (cols * spacing) / 2} z0={z0} dirZ={dirZ} rowDepth={rowDepth} tier={tier} spacing={spacing} floorY={floorY} faceSign={faceSign} />
    </>
  )
}

// ---------------- the stage: platform, LED backdrop, truss + colour-wash lighting rig ----------------
function Stage() {
  const m = getMaterials()
  const deckMat = useMemo(() => surface('wood', 5, 2, { color: '#241a1e' }), [])
  const ledTexture = () => canvasTexture(1280, 420, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, '#190a24'); g.addColorStop(1, '#330f3e')
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
    const track = useMusic.getState()
    ctx.textAlign = 'center'
    ctx.fillStyle = '#e0559f'; ctx.font = `600 24px ${FONTS.mono}`
    ctx.fillText((track.status === 'playing' ? 'NOW PLAYING' : 'LIVE AT THE REIGN ARENA').toUpperCase(), w / 2, 80)
    ctx.fillStyle = '#f4f1ea'; ctx.font = `800 70px ${FONTS.display}`
    wrapText(ctx, track.track?.title || 'The Reign Arena', w / 2, 190, w - 140, 76)
    ctx.fillStyle = '#2fd0c4'; ctx.font = `500 30px ${FONTS.mono}`
    ctx.fillText(track.track?.artist || 'Vision Storms Records', w / 2, 340)
  })
  const ledMat = useMemo(() => new THREE.MeshBasicMaterial({ map: ledTexture(), toneMapped: false }), [])
  const hasTrack = useMusic((s) => s.track?.id)
  useEffect(() => { const t = ledTexture(); ledMat.map?.dispose(); ledMat.map = t; ledMat.needsUpdate = true }, [hasTrack, ledMat])
  useEffect(() => registerLoad({ zone: ZONE, watts: 11000 }), [])

  const sw = 22, sd = STAGE_Z1 - STAGE_Z0
  const scz = (STAGE_Z0 + STAGE_Z1) / 2
  const lampMat = useMemo(() => switchedMaterial(new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#ffd9ff', emissiveIntensity: 1.6 }), ZONE, 1.6, 0.05), [])

  // colour-wash lighting rig across the truss, like the outdoor stage but indoors & brighter (small room)
  useEffect(() => {
    const cols = ['#ff4fb0', '#7a5cff', '#2fd0c4', '#ffd36b', '#4fd1ff']
    const offs = cols.map((c, i) => registerLightAnchor({
      position: new THREE.Vector3(CX - 10 + i * 5, FLY + STAGE_H + 6.4, scz), color: c, intensity: 34, distance: 18, range: 60, zone: ZONE,
    }))
    return () => offs.forEach((o) => o())
  }, [scz])

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[sw / 2, STAGE_H / 2, sd / 2]} position={[CX, FLY + STAGE_H / 2, scz]} />
      </RigidBody>
      <mesh position={[CX, FLY + STAGE_H - 0.05, scz]} material={deckMat} receiveShadow castShadow><boxGeometry args={[sw, 0.1, sd]} /></mesh>
      <mesh position={[CX, FLY + STAGE_H / 2, scz]} material={surface('concrete', 4, 1)} castShadow><boxGeometry args={[sw - 0.3, STAGE_H - 0.1, sd - 0.3]} /></mesh>
      {/* gold lip along the front edge */}
      <mesh position={[CX, FLY + STAGE_H, STAGE_Z0 + 0.02]} material={mats().gold}><boxGeometry args={[sw, 0.06, 0.06]} /></mesh>
      {/* LED backdrop against the back wall */}
      <mesh position={[CX, FLY + STAGE_H + 3.6, H.z1 - 0.32]} material={getMaterials().blackSteel}><boxGeometry args={[sw * 0.84 + 0.3, 4.8, 0.3]} /></mesh>
      <mesh position={[CX, FLY + STAGE_H + 3.6, H.z1 - 0.18]} material={ledMat}><planeGeometry args={[sw * 0.84, 4.3]} /></mesh>
      {/* truss */}
      {[-sw * 0.42, sw * 0.42].map((dx) => (
        <mesh key={dx} position={[CX + dx, FLY + STAGE_H + 3.2, scz]} material={getMaterials().aluminum} castShadow><boxGeometry args={[0.3, 6.4, 0.3]} /></mesh>
      ))}
      <mesh position={[CX, FLY + STAGE_H + 6.3, scz]} rotation={[0, 0, Math.PI / 2]} material={getMaterials().aluminum} castShadow><cylinderGeometry args={[0.15, 0.15, sw * 0.84, 10]} /></mesh>
      {[-10, -5, 0, 5, 10].map((dx, i) => (
        <mesh key={i} position={[CX + dx, FLY + STAGE_H + 6.0, scz]} material={lampMat}><boxGeometry args={[1.1, 0.2, 0.4]} /></mesh>
      ))}
      {/* front-of-house speaker stacks */}
      {[-sw / 2 - 0.7, sw / 2 + 0.7].map((dx) => (
        <mesh key={dx} position={[CX + dx, FLY + 1.5, STAGE_Z0 - 0.2]} material={getMaterials().blackSteel} castShadow><boxGeometry args={[1.1, 2.8, 1.0]} /></mesh>
      ))}
    </group>
  )
}

// ---------------- exterior shell ----------------
function Exterior() {
  const m = mats()
  const ext = useMemo(() => {
    const tex = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#0c0b10'; g.fillRect(0, 0, w, h)
      for (let x = 0; x < w; x += 96) { g.fillStyle = '#17141d'; g.fillRect(x, 0, 3, h) }
      g.fillStyle = 'rgba(201,162,90,0.12)'
      for (let y = 40; y < h; y += 140) g.fillRect(0, y, w, 2)
    }, { repeat: [W / 4, 2] })
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, metalness: 0.4 })
  }, [])
  const inner = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2630', roughness: 0.75 }), [])
  const roof = useMemo(() => new THREE.MeshStandardMaterial({ color: '#15131a', roughness: 0.7, metalness: 0.25 }), [])
  const marquee = [{ at: DOOR_X, half: 3.4, h: 3.4 }]
  const pcx = (PLATFORM.x0 + PLATFORM.x1) / 2, pcz = (PLATFORM.z0 + PLATFORM.z1) / 2
  const palms = useMemo(() => [
    [PLATFORM.x0 + 2.4, PLATFORM_Y, PLATFORM.z0 + 3, 0.62, 0.4],
    [PLATFORM.x1 - 2.4, PLATFORM_Y, PLATFORM.z0 + 3, 0.58, 1.5],
    [PLATFORM.x0 + 2.4, PLATFORM_Y, PLATFORM.z1 - 3, 0.6, 2.2],
    [PLATFORM.x1 - 2.4, PLATFORM_Y, PLATFORM.z1 - 3, 0.56, 0.9],
  ], [])
  return (
    <group>
      {/* the arena's own platform, rising from the sea: a submerged apron collider at the water's
          edge so visitors can walk straight up out of the water, and a raised paved deck on top */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[(PLATFORM.x1 - PLATFORM.x0) / 2, 0.1, (PLATFORM.z1 - PLATFORM.z0) / 2]} position={[pcx, 0.1, pcz]} />
        <CuboidCollider args={[(PLATFORM.x1 - PLATFORM.x0) / 2 - 1.6, 0.25, (PLATFORM.z1 - PLATFORM.z0) / 2 - 1.6]} position={[pcx, PLATFORM_Y - 0.25, pcz]} />
      </RigidBody>
      <mesh position={[pcx, PLATFORM_Y - 0.26, pcz]} material={surface('concrete', 8, 7, { color: '#8d8a84' })} receiveShadow>
        <boxGeometry args={[PLATFORM.x1 - PLATFORM.x0 - 3.2, 0.5, PLATFORM.z1 - PLATFORM.z0 - 3.2]} />
      </mesh>
      <mesh position={[pcx, PLATFORM_Y - 0.01, pcz]} material={surface('limestone', 6, 5, { color: '#d9d2c0' })} receiveShadow>
        <boxGeometry args={[PLATFORM.x1 - PLATFORM.x0 - 3.2, 0.03, PLATFORM.z1 - PLATFORM.z0 - 3.2]} />
      </mesh>
      {/* gold edge trim around the platform */}
      <mesh position={[pcx, PLATFORM_Y + 0.01, PLATFORM.z0 + 1.6]} material={m.gold}><boxGeometry args={[PLATFORM.x1 - PLATFORM.x0 - 3.2, 0.03, 0.08]} /></mesh>
      <mesh position={[pcx, PLATFORM_Y + 0.01, PLATFORM.z1 - 1.6]} material={m.gold}><boxGeometry args={[PLATFORM.x1 - PLATFORM.x0 - 3.2, 0.03, 0.08]} /></mesh>
      {/* a short dock reaching toward the mainland, for boats and jet skis */}
      <Block position={[PLATFORM.x0 - 4, PLATFORM_Y - 0.26, pcz]} size={[8.2, 0.5, 4.5]} material={surface('wood', 2, 1, { color: '#5a3d26' })} />
      <Palms palms={palms} />
      <Wall side="s" rect={RECT} h={HALL_H} t={T} ext={ext} int={inner} y={CURB} openings={marquee} />
      <Wall side="n" rect={RECT} h={HALL_H} t={T} ext={ext} int={inner} y={CURB} />
      <Wall side="w" rect={RECT} h={HALL_H} t={T} ext={ext} int={inner} y={CURB} openings={[{ at: H.z0 + 20, half: 3.5, glass: true, h: TOPY - CURB - 1, sill: 2 }]} />
      <Wall side="e" rect={RECT} h={HALL_H} t={T} ext={ext} int={inner} y={CURB} openings={[{ at: H.z0 + 20, half: 3.5, glass: true, h: TOPY - CURB - 1, sill: 2 }]} />
      <mesh position={[CX, TOPY, CZ]} material={roof} receiveShadow castShadow><boxGeometry args={[W + 0.4, 0.3, D + 0.4]} /></mesh>
      {/* gold cornice trim */}
      <mesh position={[CX, TOPY - 0.3, H.z0 - T / 2 - 0.02]} material={m.gold}><boxGeometry args={[W, 0.12, 0.1]} /></mesh>
      {/* marquee canopy + crest */}
      <mesh position={[CX, CURB + 3.5, H.z0 - 0.6]} material={m.black} castShadow><boxGeometry args={[7.2, 0.14, 1.6]} /></mesh>
      <mesh position={[CX, CURB + 3.5, H.z0 - 1.35]} material={m.gold}><boxGeometry args={[7.2, 0.05, 0.08]} /></mesh>
      <BrandSign text="THE REIGN ARENA" sub="LUXURY LIVE MUSIC HALL" position={[CX, CURB + 5.4, H.z0 - 0.02]} rotation={[0, Math.PI, 0]} width={9} color="#f4e9c8" glow="#c9a25a" size={150} />
      <BrandSign text="THE REIGN ARENA" sub="LUXURY LIVE MUSIC HALL" position={[CX, CURB + 5.4, H.z0 + 0.02]} width={9} color="#f4e9c8" glow="#c9a25a" size={150} />
      <Plaque lines={['THE REIGN ARENA', 'Concerts · Private Events']} position={[DOOR_X + 3.8, CURB + 1.6, H.z0 - 0.02]} rotation={[0, Math.PI, 0]} width={1.1} />
      {/* entrance doors */}
      <DoubleDoor id="reign-arena-doors" center={[DOOR_X, CURB + 1.7, H.z0]} halfWidth={1.7} height={3.0} facing={Math.PI} accent="#c9a25a" label="the arena doors" finish="bronze" />
    </group>
  )
}

// ---------------- interior ----------------
function Interior() {
  const m = mats()
  const floorMat = useMemo(() => signatureMarble(6, 6), [])
  const lobbyRug = useMemo(() => surface('carpet', 2, 1, { color: '#3a0d12' }), [])

  const stairXs = [H.x0 + 4.2, H.x1 - 4.2]

  return (
    <group>
      {/* lobby floor */}
      <mesh position={[CX, FLY + 0.005, (H.z0 + LOBBY_Z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={floorMat}>
        <planeGeometry args={[W - 1, LOBBY_Z1 - H.z0 - 0.4]} />
      </mesh>
      <mesh position={[CX, FLY + 0.008, LOBBY_Z1 - 2.6]} rotation={[-Math.PI / 2, 0, 0]} material={lobbyRug}>
        <planeGeometry args={[6, 3.6]} />
      </mesh>
      {Array.from({ length: 3 }, (_, i) => (
        <CeilingLight key={i} position={[H.x0 + 8 + i * ((W - 16) / 2), CEILY - 0.1, (H.z0 + LOBBY_Z1) / 2]} zone={ZONE} size={[1.4, 1.4]} intensity={26} distance={15} />
      ))}
      <PendantLight position={[CX, CEILY - 0.1, LOBBY_Z1 - 3]} drop={1.6} zone={ZONE} color="#ffe3b0" />

      {/* the lion-head waterfall centrepiece, facing the entrance */}
      <LionWaterfall position={[CX, FLY + 2.95, LOBBY_Z1 - 0.3]} />
      <CylinderCollider args={[0.5, 1.95]} position={[CX, FLY + 0.5, LOBBY_Z1 - 1.4]} />

      {/* short feature wall the lion is mounted on, open archways either side into the hall */}
      <mesh position={[CX, FLY + 2.95, LOBBY_Z1 - 0.02]} material={m.black}><boxGeometry args={[5.4, 5.9, 0.26]} /></mesh>

      {/* stairs up to the balcony, flanking the lobby */}
      <Staircase x={stairXs[0]} z0={H.z0 + 1.8} dirZ={1} rise={HALL_BAL_Y - FLY} run={5} n={16} />
      <Staircase x={stairXs[1]} z0={H.z0 + 1.8} dirZ={1} rise={HALL_BAL_Y - FLY} run={5} n={16} />
      <BrandSign text="UP TO THE LOGE" position={[stairXs[0] - 1.3, FLY + 2.2, H.z0 + 2.2]} rotation={[0, Math.PI / 2, 0]} width={2.1} color="#f4efff" glow="#2fd0c4" size={120} />

      {/* main hall floor (under the risers, between lobby and stage) */}
      <mesh position={[CX, FLY + 0.004, (LOBBY_Z1 + STAGE_Z0) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={floorMat}>
        <planeGeometry args={[W - 1, STAGE_Z0 - LOBBY_Z1]} />
      </mesh>

      {/* ground-floor seating bowl + lit centre aisle */}
      <SeatingDeck rows={ROWS} cols={SEATS_PER_ROW} z0={SEAT_Z0} dirZ={1} rowDepth={(SEAT_Z1 - SEAT_Z0) / ROWS} tier={TIER} spacing={SEAT_SP} floorY={FLY} faceSign={1} />
      <AisleRamp z0={SEAT_Z0} z1={SEAT_Z1} y0={FLY + (ROWS - 1) * TIER} y1={FLY} />
      <CeilingLight position={[CX, CEILY - 0.1, (SEAT_Z0 + SEAT_Z1) / 2]} zone={ZONE} size={[1.8, 1.8]} intensity={28} distance={20} />
      <CeilingLight position={[H.x0 + 9, CEILY - 0.1, SEAT_Z0 + 4]} zone={ZONE} size={[1.4, 1.4]} intensity={20} distance={15} />
      <CeilingLight position={[H.x1 - 9, CEILY - 0.1, SEAT_Z0 + 4]} zone={ZONE} size={[1.4, 1.4]} intensity={20} distance={15} />

      {/* the stage */}
      <Stage />

      {/* balcony slab + front rail */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[(W - 2) / 2, 0.15, (BAL_FRONT_Z - H.z0) / 2]} position={[CX, HALL_BAL_Y - 0.15, (H.z0 + BAL_FRONT_Z) / 2]} />
        <CuboidCollider args={[(W - 2) / 2, 0.55, 0.08]} position={[CX, HALL_BAL_Y + 0.55, BAL_FRONT_Z]} />
      </RigidBody>
      <mesh position={[CX, HALL_BAL_Y - 0.15, (H.z0 + BAL_FRONT_Z) / 2]} material={surface('concrete', 6, 3, { color: '#201d26' })} receiveShadow castShadow>
        <boxGeometry args={[W - 2, 0.3, BAL_FRONT_Z - H.z0]} />
      </mesh>
      <mesh position={[CX, HALL_BAL_Y + 0.42, BAL_FRONT_Z]} material={m.gold}><boxGeometry args={[W - 2, 0.06, 0.08]} /></mesh>
      <mesh position={[CX, HALL_BAL_Y + 0.72, BAL_FRONT_Z]} material={m.glass} userData={{ noBatch: true }}><boxGeometry args={[W - 2.1, 0.6, 0.03]} /></mesh>

      {/* balcony (loge) seating: a flat two-row deck overlooking the stage */}
      <SeatingDeck rows={2} cols={SEATS_PER_ROW} z0={H.z0 + 2.2} dirZ={1} rowDepth={2.3} tier={0} spacing={SEAT_SP} floorY={HALL_BAL_Y} faceSign={1} />
      <mesh position={[CX, HALL_BAL_Y + 0.005, H.z0 + 3.9]} rotation={[-Math.PI / 2, 0, 0]} material={m.carpetRed}>
        <planeGeometry args={[AISLE_HALF * 2, BAL_FRONT_Z - H.z0 - 1]} />
      </mesh>
      {Array.from({ length: Math.floor((BAL_FRONT_Z - 2 - (H.z0 + 2.5)) / 1.4) }, (_, i) => H.z0 + 2.5 + i * 1.4).map((z, i) => (
        <mesh key={i} position={[CX, HALL_BAL_Y + 0.02, z]} rotation={[-Math.PI / 2, 0, 0]} material={nightLit(new THREE.MeshStandardMaterial({ color: '#e9e9ee', emissive: '#2fd0c4', emissiveIntensity: 2, toneMapped: false }), 2, 1.4)}>
          <circleGeometry args={[0.06, 10]} />
        </mesh>
      ))}
      <CeilingLight position={[CX, CEILY - 0.1, H.z0 + 5]} zone={ZONE} size={[1.6, 1.6]} intensity={26} distance={16} />
      <CeilingLight position={[H.x0 + 8, CEILY - 0.1, H.z0 + 5]} zone={ZONE} size={[1.4, 1.4]} intensity={20} distance={14} />
      <CeilingLight position={[H.x1 - 8, CEILY - 0.1, H.z0 + 5]} zone={ZONE} size={[1.4, 1.4]} intensity={20} distance={14} />
      <PendantLight position={[CX, HALL_BAL_Y + 3.2, H.z0 + 4]} drop={1.2} zone={ZONE} color="#ffe3b0" />
    </group>
  )
}

export default function ConcertHall() {
  return (
    <group>
      <Exterior />
      <Gate x0={H.x0} x1={H.x1} z0={H.z0} z1={H.z1} pad={16}>
        <Interior />
      </Gate>
    </group>
  )
}
