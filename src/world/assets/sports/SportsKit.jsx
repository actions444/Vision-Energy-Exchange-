import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, CylinderCollider, BallCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { Builder } from '../../facade/kit.js'
import { assetMats } from '../materials.js'
import { nightLit, registerLightAnchor } from '../../../state/environment.js'
import { useSeats } from '../../../state/seats.js'
import { registerInteractable, playerState } from '../../../state/runtime.js'
import { BrandSign } from '../../signs.jsx'
import { footballTexture, soccerTexture, basketballTexture, turfBump, chainLinkTexture, brushedTexture, FOOTBALL, SOCCER, BASKETBALL } from './textures.js'

// Reusable sports-ground parts: marked playing surfaces, chain-link fence, bleachers, goalposts, soccer goals,
// basketball hoops, floodlight towers, scoreboard and a kickable ball. All procedural; nothing here loads a file.
// What is real gameplay here: you can walk and sit everywhere, the structures collide, and balls can be kicked.
// What is scenery only: scoring, teams, a game clock, the scoreboard digits.

const rot = (yaw, x, z) => [x * Math.cos(yaw) + z * Math.sin(yaw), -x * Math.sin(yaw) + z * Math.cos(yaw)]

/** world position of a point given in a yawed group's local frame */
const toWorld = (pos, yaw, x, y, z) => { const [dx, dz] = rot(yaw, x, z); return [pos[0] + dx, pos[1] + y, pos[2] + dz] }

// ---------------------------------------------------------------------------------------------------------------
export function PlayingSurface({ kind, cx, cz, y, football }) {
  const { geo, mat } = useMemo(() => {
    let tex, w, l, rough = 0.95
    if (kind === 'football') { tex = footballTexture(football); w = FOOTBALL.width + 2 * FOOTBALL.apron; l = FOOTBALL.length + 2 * FOOTBALL.apron }
    else if (kind === 'soccer') { tex = soccerTexture(); w = SOCCER.length + 2 * SOCCER.apron; l = SOCCER.width + 2 * SOCCER.apron }
    else { tex = basketballTexture(); w = BASKETBALL.length + 2 * BASKETBALL.apron; l = BASKETBALL.width + 2 * BASKETBALL.apron; rough = 0.62 }
    const g = new THREE.PlaneGeometry(w, l); g.rotateX(-Math.PI / 2)
    const m = new THREE.MeshStandardMaterial({ map: tex, roughness: rough, metalness: 0 })
    if (kind !== 'basketball') { m.bumpMap = turfBump(); m.bumpScale = 0.9 }
    return { geo: g, mat: m }
  }, [kind])
  return <mesh geometry={geo} material={mat} position={[cx, y, cz]} receiveShadow />
}

// ---------------------------------------------------------------------------------------------------------------
/** Chain-link fence round a rectangle; `gaps` = [{ side: 'x0'|'x1'|'z0'|'z1', a, b }] are walk-through openings (a..b along that side). */
export function ChainLinkFence({ x0, x1, z0, z1, y, h = 2.4, gaps = [], postGap = 3 }) {
  const A = assetMats()
  const link = useMemo(() => {
    const t = chainLinkTexture()
    return new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.8 })
  }, [])
  const { geo, runs } = useMemo(() => {
    const B = new Builder()
    const rs = []
    const sides = [['z0', x0, x1, z0, z0], ['z1', x0, x1, z1, z1], ['x0', z0, z1, x0, x0], ['x1', z0, z1, x1, x1]]
    for (const [side, a, b, c] of sides) {
      let list = [[a, b]]
      for (const g of gaps.filter((q) => q.side === side)) list = list.flatMap(([s, e]) => (g.b <= s || g.a >= e ? [[s, e]] : [[s, Math.max(s, g.a)], [Math.min(e, g.b), e]])).filter(([s, e]) => e - s > 0.2)
      for (const [s, e] of list) rs.push({ horiz: side[0] === 'z', s, e, c })
    }
    for (const r of rs) {
      const len = r.e - r.s, n = Math.max(1, Math.ceil(len / postGap))
      for (let k = 0; k <= n; k++) {
        const t = r.s + (len * k) / n
        const px = r.horiz ? t : r.c, pz = r.horiz ? r.c : t
        B.box('post', px, y + h / 2, pz, 0.1, h + 0.15, 0.1)
      }
      const mid = (r.s + r.e) / 2
      const cx = r.horiz ? mid : r.c, cz = r.horiz ? r.c : mid
      B.box('post', cx, y + h + 0.05, cz, r.horiz ? len : 0.07, 0.07, r.horiz ? 0.07 : len) // top rail
      B.box('post', cx, y + 0.12, cz, r.horiz ? len : 0.05, 0.05, r.horiz ? 0.05 : len) // bottom tension wire
      B.quad('link', cx, y + h / 2 + 0.06, cz, len, h - 0.1, r.horiz ? 0 : Math.PI / 2, { uv: [0, 0, len / 0.5, (h - 0.1) / 0.5] })
    }
    return { geo: B.merged(), runs: rs }
  }, [x0, x1, z0, z1, y, h, JSON.stringify(gaps), postGap])
  return (
    <group>
      {geo.post && <mesh geometry={geo.post} material={A.galv} castShadow />}
      {geo.link && <mesh geometry={geo.link} material={link} />}
      <RigidBody type="fixed" colliders={false}>
        {runs.map((r, i) => <CuboidCollider key={i} args={r.horiz ? [(r.e - r.s) / 2, h / 2, 0.06] : [0.06, h / 2, (r.e - r.s) / 2]} position={r.horiz ? [(r.s + r.e) / 2, y + h / 2, r.c] : [r.c, y + h / 2, (r.s + r.e) / 2]} />)}
      </RigidBody>
    </group>
  )
}

// ---------------------------------------------------------------------------------------------------------------
/**
 * Aluminium bleachers. Local frame: x along the stand, front edge at z = 0, rows climb toward +z, so the stand faces -z.
 * yaw rotates it into the world. Visual steps are real planks; walking uses one ramp under the planks (the same trick as the
 * apartment stairs, since 42 cm risers are more than the player autosteps).
 */
export function Bleachers({ position, yaw = 0, length = 30, rows = 10, seatRows = [2, 5, 8], seatEvery = 2.4, label = 'Sit in the stands' }) {
  const A = assetMats()
  const brushed = useMemo(() => new THREE.MeshStandardMaterial({ map: brushedTexture(), roughness: 0.42, metalness: 0.85 }), [])
  const R = 0.42, D = 0.8, f0 = 0.25
  const yf = (i) => f0 + i * R
  const geo = useMemo(() => {
    const B = new Builder()
    for (let i = 0; i < rows; i++) {
      B.box('plank', 0, yf(i) - 0.025, i * D + 0.16, length, 0.05, 0.32) // foot plank
      for (const dz of [-0.075, 0.075]) B.box('plank', 0, yf(i) + 0.425, i * D + 0.62 + dz, length, 0.05, 0.14) // seat boards
      B.box('plank', 0, yf(i) + 0.2, i * D + 0.5, length, 0.28, 0.02) // riser board under the seat (closed look)
    }
    // concourse behind the last row
    const zEnd = rows * D
    B.box('plank', 0, yf(rows - 1) - 0.025, zEnd + 0.2, length, 0.05, 1.4)
    // frames every 3 m: raked stringer + legs
    const n = Math.ceil(length / 3)
    const slope = Math.atan2(R, D), len = Math.hypot(rows * D, rows * R)
    for (let k = 0; k <= n; k++) {
      const x = -length / 2 + (length * k) / n
      const g = new THREE.BoxGeometry(0.08, 0.12, len)
      g.rotateX(-slope); g.translate(x, f0 + (rows * R) / 2 - 0.22, (rows * D) / 2 + 0.2)
      B.add('frame', g)
      for (let i = 0; i < rows; i += 3) B.box('frame', x, (yf(i) + 0.0) / 2 - 0.2, i * D + 0.3, 0.07, yf(i) + 0.2, 0.07)
      B.box('frame', x, (yf(rows - 1) - 0.1) / 2, zEnd + 0.8, 0.09, yf(rows - 1) - 0.1, 0.09)
    }
    // guard rails: back and the two ends (follow the rake)
    const top = yf(rows - 1)
    for (const dy of [1.05, 0.55]) B.box('rail', 0, top + dy, zEnd + 0.85, length, 0.05, 0.05)
    for (let k = 0; k <= n * 2; k++) B.box('rail', -length / 2 + (length * k) / (n * 2), top + 0.55, zEnd + 0.85, 0.05, 1.1, 0.05)
    for (const sx of [-1, 1]) {
      const g = new THREE.BoxGeometry(0.05, 0.05, len)
      g.rotateX(-slope); g.translate(sx * (length / 2 - 0.03), f0 + (rows * R) / 2 + 0.9, (rows * D) / 2 + 0.2)
      B.add('rail', g)
      const g2 = new THREE.BoxGeometry(0.05, 0.05, len)
      g2.rotateX(-slope); g2.translate(sx * (length / 2 - 0.03), f0 + (rows * R) / 2 + 0.45, (rows * D) / 2 + 0.2)
      B.add('rail', g2)
      for (let i = 0; i < rows; i += 2) B.box('rail', sx * (length / 2 - 0.03), yf(i) + 0.5, i * D + 0.4, 0.05, 1.0, 0.05)
      B.box('rail', sx * (length / 2 - 0.03), top + 0.55, zEnd + 0.85, 0.05, 1.1, 0.05)
    }
    return B.merged()
  }, [length, rows])
  const slope = Math.atan2(R, D)
  // ramp: surface line y(z) = f0 + (z - 0.16) * R / D, from z = -0.4 up to the last foot plank
  const za = -0.4, zb = (rows - 1) * D + 0.2, ySurf = (z) => f0 + ((z - 0.16) * R) / D
  const rampLen = (zb - za) / Math.cos(slope), zm = (za + zb) / 2, ym = ySurf(zm)
  const nrm = [Math.cos(slope), -Math.sin(slope)] // surface normal (y, z)
  const rampCenter = (off) => [ym + nrm[0] * off, zm + nrm[1] * off] // off < 0 digs into the slope, > 0 lifts above it
  const seats = useMemo(() => {
    const out = []
    const n = Math.floor(length / seatEvery)
    for (const r of seatRows) for (let k = 0; k < n; k++) {
      const lx = -length / 2 + seatEvery / 2 + k * seatEvery
      const p = toWorld(position, yaw, lx, yf(r) + 0.45 + 0.025, r * D + 0.62)
      out.push({ position: p, yaw: yaw + Math.PI, height: 0.45, label })
    }
    return out
  }, [position[0], position[1], position[2], yaw, length, rows])
  useSeats(seats, [seats])
  const top = yf(rows - 1)
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {geo.plank && <mesh geometry={geo.plank} material={brushed} castShadow receiveShadow />}
      {geo.frame && <mesh geometry={geo.frame} material={A.galv} castShadow />}
      {geo.rail && <mesh geometry={geo.rail} material={A.rail} castShadow />}
      <RigidBody type="fixed" colliders={false}>
        {/* walk-up ramp through the foot planks */}
        <CuboidCollider args={[length / 2 - 0.1, 0.1, rampLen / 2]} position={[0, rampCenter(-0.1)[0], rampCenter(-0.1)[1]]} rotation={[-slope, 0, 0]} />
        {/* concourse deck behind the last row */}
        <CuboidCollider args={[length / 2, 0.1, (D + 0.74) / 2]} position={[0, top - 0.1, ((rows - 1) * D + 0.16 + rows * D + 0.9) / 2]} />
        {/* back guard rail and side rails following the rake */}
        <CuboidCollider args={[length / 2, 0.55, 0.04]} position={[0, top + 0.55, rows * D + 0.85]} />
        {[-1, 1].map((sx) => <CuboidCollider key={sx} args={[0.04, 0.55, rampLen / 2]} position={[sx * (length / 2 - 0.03), rampCenter(0.55)[0], rampCenter(0.55)[1]]} rotation={[-slope, 0, 0]} />)}
        {[-1, 1].map((sx) => <CuboidCollider key={'e' + sx} args={[0.04, 0.55, 0.9]} position={[sx * (length / 2 - 0.03), top + 0.55, (rows - 1) * D + 0.16 + 0.9]} />)}
      </RigidBody>
    </group>
  )
}

// ---------------------------------------------------------------------------------------------------------------
/** American football goalpost: padded gooseneck base, 3.05 m crossbar 5.64 m wide, uprights 6.1 m above it. Local +z points into the field. */
export function FootballGoal({ position, yaw = 0 }) {
  const A = assetMats()
  const pad = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1c4f9a', roughness: 0.8 }), [])
  const geo = useMemo(() => {
    const B = new Builder()
    const half = 2.82
    // crossbar, uprights
    const cyl = (key, x0, y0, z0, x1, y1, z1, r) => {
      const a = new THREE.Vector3(x0, y0, z0), b = new THREE.Vector3(x1, y1, z1), d = b.clone().sub(a), len = d.length()
      const g = new THREE.CylinderGeometry(r, r, len, 10); g.translate(0, len / 2, 0)
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z)
      const uv = new Float32Array(g.attributes.position.count * 2); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); B.add(key, g)
    }
    cyl('y', -half, 3.05, 0, half, 3.05, 0, 0.055)
    for (const s of [-1, 1]) cyl('y', s * half, 3.05, 0, s * half, 9.15, 0, 0.045)
    cyl('y', 0, 0, -0.35, 0, 2.6, -0.35, 0.095) // main post, set back
    cyl('y', 0, 2.6, -0.35, 0, 3.05, 0, 0.095) // gooseneck bend toward the field
    // ribbons on top of the uprights
    for (const s of [-1, 1]) B.box('rib', s * half, 9.05, 0, 0.02, 0.9, 0.012)
    return B.merged()
  }, [])
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {geo.y && <mesh geometry={geo.y} material={A.yellow} castShadow />}
      {geo.rib && <mesh geometry={geo.rib} material={A.paintWhite} />}
      <mesh position={[0, 1.0, -0.35]} material={pad} castShadow><cylinderGeometry args={[0.16, 0.16, 2.0, 14]} /></mesh>
      <mesh position={[0, 0.1, -0.35]} material={A.f.concrete}><cylinderGeometry args={[0.32, 0.38, 0.2, 14]} /></mesh>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[1.5, 0.16]} position={[0, 1.5, -0.35]} />
        <CuboidCollider args={[2.85, 0.06, 0.06]} position={[0, 3.05, 0]} />
      </RigidBody>
    </group>
  )
}

// ---------------------------------------------------------------------------------------------------------------
/** Floodlight tower: tapered steel pole, lamp frame with 3 x 4 heads that glow after dark, plus one pooled real light. */
export function LightTower({ position, height = 24, yaw = 0, aim = [0, 0] }) {
  const A = assetMats()
  const head = useMemo(() => nightLit(new THREE.MeshStandardMaterial({ color: '#d8d8d4', emissive: '#fff1d2', roughness: 0.35 }), 6, 0), [])
  const geo = useMemo(() => {
    const B = new Builder()
    B.box('frame', 0, height + 0.2, 0.0, 4.6, 0.12, 0.16)
    B.box('frame', 0, height + 3.0, 0.0, 4.6, 0.12, 0.16)
    for (const x of [-2.3, 2.3]) B.box('frame', x, height + 1.6, 0, 0.12, 3.0, 0.16)
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) {
      B.box('lamp', -1.7 + k * 1.13, height + 0.65 + r * 0.95, 0.12, 0.84, 0.64, 0.1)
      B.box('hood', -1.7 + k * 1.13, height + 0.65 + r * 0.95, 0.04, 0.9, 0.7, 0.1)
    }
    return B.merged()
  }, [height])
  useEffect(() => {
    const at = new THREE.Vector3(position[0] + aim[0] * 6, position[1] + height - 1.5, position[2] + aim[1] * 6)
    return registerLightAnchor({ position: at, color: '#fff1d8', intensity: 420, distance: 85, night: true })
  }, [position[0], position[2], height])
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} material={A.galv} castShadow><cylinderGeometry args={[0.2, 0.36, height, 12]} /></mesh>
      <mesh position={[0, 0.25, 0]} material={A.f.concrete}><cylinderGeometry args={[0.6, 0.7, 0.5, 14]} /></mesh>
      <group rotation={[0, Math.atan2(aim[0], aim[1]), 0]}>
        {geo.frame && <mesh geometry={geo.frame} material={A.rail} castShadow />}
        {geo.hood && <mesh geometry={geo.hood} material={A.rail} />}
        {geo.lamp && <mesh geometry={geo.lamp} material={head} />}
      </group>
      <RigidBody type="fixed" colliders={false}><CylinderCollider args={[height / 2, 0.36]} position={[0, height / 2, 0]} /></RigidBody>
    </group>
  )
}

// ---------------------------------------------------------------------------------------------------------------
/** Scoreboard on two posts. The digits are a painted sign: there is no game clock or scoring behind it. */
export function Scoreboard({ position, yaw = 0, width = 9, home = 'MEADOWBROOK', away = 'STORMS' }) {
  const A = assetMats()
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {[-1, 1].map((s) => <mesh key={s} position={[s * (width / 2 - 0.6), 3.2, 0]} material={A.galv} castShadow><boxGeometry args={[0.25, 6.4, 0.25]} /></mesh>)}
      <mesh position={[0, 6.2, 0]} material={A.rubberBlack} castShadow><boxGeometry args={[width, 2.6, 0.35]} /></mesh>
      <BrandSign text="00 : 00" sub={`${home} · ${away}`} position={[0, 6.2, 0.2]} width={width - 0.8} size={140} color="#ffd34d" glow="#ffbf3a" />
      <mesh position={[0, 7.65, 0]} material={A.rail}><boxGeometry args={[width + 0.2, 0.2, 0.45]} /></mesh>
      <RigidBody type="fixed" colliders={false}>
        {[-1, 1].map((s) => <CuboidCollider key={s} args={[0.14, 3.2, 0.14]} position={[s * (width / 2 - 0.6), 3.2, 0]} />)}
      </RigidBody>
    </group>
  )
}

// ---------------------------------------------------------------------------------------------------------------
/** Soccer goal: 7.32 x 2.44 m frame with net. Local +z points out onto the pitch. */
export function SoccerGoal({ position, yaw = 0, w = 7.32, h = 2.44, depth = 1.8 }) {
  const A = assetMats()
  const net = useMemo(() => new THREE.MeshStandardMaterial({ map: chainLinkTexture(), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, color: '#e9ebee', roughness: 0.9 }), [])
  const nets = useMemo(() => {
    const B = new Builder()
    const q = (cx, cy, cz, ww, hh, ry, uvw, uvh) => B.quad('net', cx, cy, cz, ww, hh, ry, { uv: [0, 0, uvw, uvh] })
    q(0, h / 2, -depth, w, h, 0, w / 0.12, h / 0.12) // back
    for (const s of [-1, 1]) q(s * w / 2, h / 2, -depth / 2, depth, h, Math.PI / 2, depth / 0.12, h / 0.12) // sides
    const tg = new THREE.PlaneGeometry(w, depth); tg.rotateX(Math.PI / 2); tg.translate(0, h, -depth / 2)
    const uv = tg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / 0.12), uv.getY(i) * (depth / 0.12))
    B.add('net', tg)
    return B.merged()
  }, [w, h, depth])
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {[-1, 1].map((s) => <mesh key={s} position={[s * w / 2, h / 2, 0]} material={A.paintWhite} castShadow><cylinderGeometry args={[0.06, 0.06, h, 10]} /></mesh>)}
      <mesh position={[0, h, 0]} rotation={[0, 0, Math.PI / 2]} material={A.paintWhite} castShadow><cylinderGeometry args={[0.06, 0.06, w + 0.12, 10]} /></mesh>
      {[-1, 1].map((s) => <mesh key={'b' + s} position={[s * w / 2, h / 2, -depth]} material={A.galv}><cylinderGeometry args={[0.03, 0.03, h, 8]} /></mesh>)}
      {nets.net && <mesh geometry={nets.net} material={net} />}
      <RigidBody type="fixed" colliders={false}>
        {[-1, 1].map((s) => <CylinderCollider key={s} args={[h / 2, 0.07]} position={[s * w / 2, h / 2, 0]} />)}
        <CuboidCollider args={[w / 2, 0.06, 0.06]} position={[0, h, 0]} />
        <CuboidCollider args={[w / 2, h / 2, 0.05]} position={[0, h / 2, -depth]} />
        {[-1, 1].map((s) => <CuboidCollider key={'s' + s} args={[0.05, h / 2, depth / 2]} position={[s * w / 2, h / 2, -depth / 2]} />)}
      </RigidBody>
    </group>
  )
}

// ---------------------------------------------------------------------------------------------------------------
/** Basketball hoop on a pole behind the baseline. Local +x points onto the court; the pole stands 1.1 m behind the baseline at x = 0. */
export function BasketballHoop({ position, yaw = 0 }) {
  const A = assetMats()
  const board = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#dfe9ee', roughness: 0.15, transmission: 0.25, thickness: 0.05, transparent: true, opacity: 0.85 }), [])
  const rim = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e0541f', roughness: 0.4, metalness: 0.6 }), [])
  const netMat = useMemo(() => new THREE.MeshStandardMaterial({ map: chainLinkTexture(), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, color: '#f2f2f2' }), [])
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 1.7, 0]} material={A.rail} castShadow><cylinderGeometry args={[0.11, 0.14, 3.4, 12]} /></mesh>
      <mesh position={[0, 0.06, 0]} material={A.f.concrete}><cylinderGeometry args={[0.35, 0.4, 0.12, 16]} /></mesh>
      <mesh position={[0, 0.95, 0]} material={A.teal}><cylinderGeometry args={[0.15, 0.15, 1.6, 12]} /></mesh>
      <mesh position={[0.9, 3.1, 0]} rotation={[0, 0, Math.PI / 2]} material={A.rail}><cylinderGeometry args={[0.05, 0.05, 1.8, 8]} /></mesh>
      <mesh position={[1.85, 3.35, 0]} material={board} castShadow><boxGeometry args={[0.05, 1.07, 1.83]} /></mesh>
      <mesh position={[1.82, 3.15, 0]} material={A.paintWhite}><boxGeometry args={[0.02, 0.45, 0.59]} /></mesh>
      <mesh position={[2.12, 3.05, 0]} rotation={[Math.PI / 2, 0, 0]} material={rim} castShadow><torusGeometry args={[0.23, 0.012, 8, 24]} /></mesh>
      <mesh position={[2.12, 2.85, 0]} material={netMat}><cylinderGeometry args={[0.22, 0.15, 0.4, 14, 1, true]} /></mesh>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[1.7, 0.13]} position={[0, 1.7, 0]} />
        <CuboidCollider args={[0.04, 0.5, 0.9]} position={[1.85, 3.35, 0]} />
      </RigidBody>
    </group>
  )
}

// ---------------------------------------------------------------------------------------------------------------
const BALLS = {
  soccer: { r: 0.11, mass: 0.43, color: '#f4f4f0', accent: '#1b1c1e', label: 'Kick the soccer ball', power: 7.5, up: 2.2, bounce: 0.6 },
  basketball: { r: 0.12, mass: 0.6, color: '#d8691f', accent: '#201a14', label: 'Shoot the basketball', power: 6.5, up: 5.2, bounce: 0.78 },
  football: { r: 0.14, mass: 0.42, color: '#7a4a2a', accent: '#f1eee6', label: 'Throw the football', power: 9.5, up: 4.5, bounce: 0.35 },
}
/** A loose ball (dynamic body). Press the action button next to it to kick, shoot or throw it the way you are facing. Local only: not synced between players. */
export function Ball({ id, position, kind = 'soccer' }) {
  const cfg = BALLS[kind]
  const body = useRef()
  const vec = useMemo(() => new THREE.Vector3(...position), [])
  const mat = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128
    const g = c.getContext('2d'); g.fillStyle = cfg.color; g.fillRect(0, 0, 256, 128)
    g.strokeStyle = cfg.accent; g.fillStyle = cfg.accent; g.lineWidth = 3
    if (kind === 'soccer') for (let i = 0; i < 9; i++) { g.beginPath(); const x = 20 + (i % 5) * 52, y = 30 + Math.floor(i / 5) * 62; for (let k = 0; k < 5; k++) { const a = (k / 5) * 6.283 + 0.3; g.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14) } g.closePath(); g.fill() }
    else if (kind === 'basketball') { for (const x of [0, 128, 256]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke() } g.beginPath(); g.moveTo(0, 64); g.lineTo(256, 64); g.stroke(); g.beginPath(); g.arc(64, 64, 52, -1.2, 1.2); g.stroke(); g.beginPath(); g.arc(192, 64, 52, Math.PI - 1.2, Math.PI + 1.2); g.stroke() }
    else { g.fillRect(100, 56, 56, 16); for (let k = 0; k < 5; k++) g.fillRect(104 + k * 11, 48, 3, 32) }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
    return new THREE.MeshStandardMaterial({ map: t, roughness: kind === 'basketball' ? 0.8 : 0.55 })
  }, [kind])
  useEffect(() => registerInteractable(id, {
    position: vec,
    radius: 1.7,
    label: () => cfg.label,
    onInteract: () => {
      const b = body.current
      if (!b) return
      const y = playerState.yaw
      const s = cfg.power
      b.wakeUp()
      b.setLinvel({ x: Math.sin(y) * s, y: cfg.up, z: Math.cos(y) * s }, true)
      b.setAngvel({ x: Math.cos(y) * 6, y: 0, z: -Math.sin(y) * 6 }, true)
    },
  }), [id])
  useFrame(() => { const b = body.current; if (b) { const t = b.translation(); vec.set(t.x, t.y - cfg.r, t.z); if (t.y < -5) { b.setTranslation({ x: position[0], y: position[1] + 0.5, z: position[2] }, true); b.setLinvel({ x: 0, y: 0, z: 0 }, true) } } })
  return (
    <RigidBody ref={body} type="dynamic" colliders={false} position={[position[0], position[1] + cfg.r, position[2]]} linearDamping={0.35} angularDamping={0.5} ccd>
      <BallCollider args={[cfg.r]} restitution={cfg.bounce} friction={0.7} mass={cfg.mass} />
      {kind === 'football' ? <mesh material={mat} castShadow scale={[1.0, 0.7, 0.7]}><sphereGeometry args={[cfg.r * 1.15, 16, 12]} /></mesh> : <mesh material={mat} castShadow><sphereGeometry args={[cfg.r, 16, 12]} /></mesh>}
    </RigidBody>
  )
}
