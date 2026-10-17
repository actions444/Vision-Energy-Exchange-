import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { Builder, punch } from '../../facade/kit.js'
import { assetMats } from '../materials.js'
import { nightLit } from '../../../state/environment.js'
import { registerInteractable } from '../../../state/runtime.js'
import { BrandSign } from '../../signs.jsx'
import { corrugatedMaps, containerMaps, treadMaps, yardConcreteMaps } from './textures.js'

// Reusable industrial parts: corrugated-metal buildings with real openings, steel doors that open, roll-up doors (painted, closed),
// shipping containers, pallets, roll-off bins, a refuse truck, bollards and fuel pumps. Everything is built from boxes and extrusions with
// metre-UVs and generated materials; there are no model files. Buildings are axis-aligned in world space (like the apartment block) so the
// door components can use plain world coordinates.

const cache = new Map()
const memo = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k) }

export function indMats() {
  return memo('ind', () => {
    const A = assetMats()
    const tread = treadMaps(), yard = yardConcreteMaps()
    const std = (o) => new THREE.MeshStandardMaterial(o)
    const corr = (hex, o = {}) => { const m = corrugatedMaps(hex); return std({ map: m.map, bumpMap: m.bump, bumpScale: 1.6, roughnessMap: m.rough, roughness: 1, metalness: 0.35, side: THREE.DoubleSide, ...o }) }
    return {
      A,
      corr,
      sand: corr('#c9c1ab'), grey: corr('#aeb2b3'), green: corr('#6d8274'), blue: corr('#5d7d98'), white: corr('#d9dad4'), roofGrey: corr('#8a8f92'), roofDark: corr('#5d6367'),
      tread: std({ map: tread.map, bumpMap: tread.bump, bumpScale: 1.2, roughness: 0.5, metalness: 0.7 }),
      yard: std({ map: yard.map, roughness: 0.92 }),
      steel: std({ color: '#7f858a', roughness: 0.45, metalness: 0.85 }),
      steelDark: std({ color: '#3a3f44', roughness: 0.5, metalness: 0.75 }),
      safety: std({ color: '#e4b11d', roughness: 0.55, metalness: 0.2 }),
      safetyRed: std({ color: '#b4322a', roughness: 0.55, metalness: 0.2 }),
      rubber: std({ color: '#1a1a1c', roughness: 0.92 }),
      hazard: (() => { // yellow/black diagonal stripes for bollards and edges
        const c = document.createElement('canvas'); c.width = c.height = 128
        const x = c.getContext('2d'); x.fillStyle = '#e4b11d'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#1b1b1b'
        for (let i = -4; i < 8; i++) { x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32 + 16, 0); x.lineTo(i * 32 + 16 + 128, 128); x.lineTo(i * 32 + 128, 128); x.fill() }
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1)
        return std({ map: t, roughness: 0.6 })
      })(),
    }
  })
}

/** Renders only while the camera is near a rectangle. */
export function NearGate({ bounds, margin = 60, children }) {
  const ref = useRef()
  const { camera } = useThree()
  useFrame(() => {
    const c = camera.position
    if (ref.current) ref.current.visible = c.x > bounds[0] - margin && c.x < bounds[1] + margin && c.z > bounds[2] - margin && c.z < bounds[3] + margin
  })
  return <group ref={ref} userData={{ noBatch: true }}>{children}</group>
}

// ---------------------------------------------------------------------------------------------------------------
/** A steel man-door leaf that swings (kinematic collider) and registers an interaction. Same hinge convention as SingleDoor. */
export function SteelDoor({ id, hinge, width = 1.0, height = 2.1, baseYaw = 0, openAngle = 1.55, label = 'door', colour = '#6f777d', glazed = false }) {
  const [open, setOpen] = useState(false)
  const body = useRef(), angle = useRef(0)
  const q = useMemo(() => new THREE.Quaternion(), []), e = useMemo(() => new THREE.Euler(), [])
  const M = indMats()
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.5, metalness: 0.6 }), [colour])
  const st = useRef({ open })
  st.current.open = open
  const c = Math.cos(baseYaw), s = Math.sin(baseYaw)
  useEffect(() => registerInteractable(id, {
    position: new THREE.Vector3(hinge[0] + (c * width) / 2, hinge[1] + 1, hinge[2] - (s * width) / 2),
    radius: 1.9,
    label: () => (st.current.open ? `Close ${label}` : `Open ${label}`),
    onInteract: () => setOpen((o) => !o),
  }), [id, label]) // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, dt) => {
    angle.current += ((open ? openAngle : 0) - angle.current) * (1 - Math.exp(-4 * Math.min(dt, 0.05)))
    e.set(0, baseYaw + angle.current, 0); q.setFromEuler(e)
    body.current?.setNextKinematicRotation(q)
  })
  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={hinge} rotation={[0, baseYaw, 0]}>
      <CuboidCollider args={[width / 2, height / 2, 0.04]} position={[width / 2, height / 2, 0]} />
      <group userData={{ noBatch: true }}>
        <mesh position={[width / 2, height / 2, 0]} material={mat} castShadow><boxGeometry args={[width - 0.02, height - 0.02, 0.05]} /></mesh>
        <mesh position={[width / 2, height * 0.5, 0.0]} material={M.steelDark}><boxGeometry args={[width - 0.2, 0.05, 0.07]} /></mesh>
        {glazed && <mesh position={[width / 2, height * 0.68, 0]} material={M.A.f.glass}><boxGeometry args={[width * 0.5, height * 0.3, 0.07]} /></mesh>}
        <mesh position={[width - 0.14, height * 0.46, 0]} material={M.steel}><boxGeometry args={[0.06, 0.2, 0.12]} /></mesh>
      </group>
    </RigidBody>
  )
}

// ---------------------------------------------------------------------------------------------------------------
/**
 * Corrugated-metal building with real openings. Walls are cut around every opening, so doors, windows and roll-up doors have depth.
 * openings: [{ wall: '-z'|'+z'|'-x'|'+x', c: world coordinate along that wall, w, h, sill = 0, kind: 'door'|'rollup'|'window', id, label, swing = 1, colour }]
 * Working ('door') openings get a SteelDoor that opens; 'rollup' doors are closed painted panels (scenery); 'window' has glass.
 * roof: 'gable' (ridge along the long side) | 'shed' (falls to -z / -x side) | 'flat'.
 */
export function MetalBuilding({ x0, x1, z0, z1, y, h = 5, roof = 'gable', pitch = 0.14, wall = 'sand', roofMat = 'roofGrey', openings = [], plinth = true, sign = null, colliders = true, ceiling = null, lining = false }) {
  const M = indMats()
  const T = 0.14
  const W = x1 - x0, D = z1 - z0
  const plan = useMemo(() => {
    const B = new Builder()
    const cols = []
    const doors = [], rolls = [], wins = []
    const walls = [
      { s: '-z', a: x0, b: x1, c: z0, n: [0, -1], horiz: true },
      { s: '+z', a: x0, b: x1, c: z1, n: [0, 1], horiz: true },
      { s: '-x', a: z0, b: z1, c: x0, n: [-1, 0], horiz: false },
      { s: '+x', a: z0, b: z1, c: x1, n: [1, 0], horiz: false },
    ]
    for (const wl of walls) {
      const holes = openings.filter((o) => o.wall === wl.s).map((o) => ({ x0: o.c - o.w / 2, x1: o.c + o.w / 2, v0: o.sill || 0, v1: (o.sill || 0) + o.h }))
      const pieces = punch(wl.a, wl.b, 0, h, holes)
      for (const p of pieces) {
        const len = p.x1 - p.x0, hh = p.v1 - p.v0, mid = (p.x0 + p.x1) / 2
        const cx = wl.horiz ? mid : wl.c, cz = wl.horiz ? wl.c : mid
        const sx = wl.horiz ? len : T, sz = wl.horiz ? T : len
        B.box('wall', cx, y + p.v0 + hh / 2, cz, sx, hh, sz)
        if (colliders) cols.push([cx, y + p.v0 + hh / 2, cz, sx / 2, hh / 2, sz / 2])
        if (lining) { // plaster lining on the inside face (offices and huts): same openings, 3 cm thick
          const ix = cx - wl.n[0] * (T / 2 + 0.016), iz = cz - wl.n[1] * (T / 2 + 0.016)
          B.box('lining', ix, y + p.v0 + hh / 2, iz, wl.horiz ? len : 0.03, hh, wl.horiz ? 0.03 : len)
        }
      }
      if (plinth) { // precast-concrete base course, skipping door/roll-up openings that reach the floor
        const low = holes.filter((q) => q.v0 < 0.55)
        for (const p of punch(wl.a, wl.b, 0, 0.5, low)) {
          const len = p.x1 - p.x0, mid = (p.x0 + p.x1) / 2
          B.box('plinth', wl.horiz ? mid : wl.c, y + 0.25, wl.horiz ? wl.c : mid, wl.horiz ? len : T + 0.05, 0.5, wl.horiz ? T + 0.05 : len)
        }
      }
      for (const o of openings.filter((q) => q.wall === wl.s)) {
        const sill = o.sill || 0
        const cxo = wl.horiz ? o.c : wl.c, czo = wl.horiz ? wl.c : o.c
        const fr = 0.07
        // reveal frame (steel for doors, aluminium for windows)
        const key = o.kind === 'window' ? 'frame' : 'framesteel'
        const put = (a, b, c2, d2, e2, f2) => B.box(key, a, b, c2, d2, e2, f2)
        const alongW = wl.horiz ? o.w + fr * 2 : T + 0.1, alongD = wl.horiz ? T + 0.1 : o.w + fr * 2
        put(cxo, y + sill + o.h + fr / 2, czo, alongW, fr, alongD) // head
        if (sill > 0) put(cxo, y + sill - fr / 2, czo, alongW, fr, alongD) // sill
        for (const sd of [-1, 1]) put(wl.horiz ? o.c + sd * (o.w / 2 + fr / 2) : cxo, y + sill + o.h / 2, wl.horiz ? czo : o.c + sd * (o.w / 2 + fr / 2), wl.horiz ? fr : T + 0.1, o.h, wl.horiz ? T + 0.1 : fr)
        if (o.kind === 'window') {
          wins.push({ x: cxo, y: y + sill + o.h / 2, z: czo, w: o.w, h: o.h, horiz: wl.horiz })
          const nm = o.mullions ?? Math.max(0, Math.round(o.w / 1.0) - 1)
          for (let k = 1; k <= nm; k++) {
            const t = o.c - o.w / 2 + (o.w * k) / (nm + 1)
            B.box('frame', wl.horiz ? t : cxo, y + sill + o.h / 2, wl.horiz ? czo : t, wl.horiz ? 0.04 : 0.06, o.h, wl.horiz ? 0.06 : 0.04)
          }
        } else if (o.kind === 'rollup' || o.kind === 'locked') rolls.push({ ...o, cx: cxo, cz: czo, horiz: wl.horiz, n: wl.n, y: y + sill })
        else {
          // working door: hinge at the low end of the gap, leaf toward +coordinate (see SingleDoor)
          const hinge = wl.horiz ? [o.c - o.w / 2, y + sill, wl.c] : [wl.c, y + sill, o.c - o.w / 2]
          const sw = ({ '-z': 1.55, '+z': -1.55, '-x': -1.55, '+x': 1.55 }[wl.s]) * (o.swing ?? 1) / 1.55 // default: swings out into the yard; swing: -1 swings in
          doors.push({ ...o, hinge, baseYaw: wl.horiz ? 0 : -Math.PI / 2, openAngle: sw * 1.55, cx: cxo, cz: czo, horiz: wl.horiz, n: wl.n })
        }
      }
    }
    // corner flashing
    for (const [cx, cz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) B.box('trim', cx, y + h / 2, cz, 0.22, h, 0.22)
    // eave beam
    B.box('trim', (x0 + x1) / 2, y + h + 0.02, z0, W + 0.3, 0.18, 0.26); B.box('trim', (x0 + x1) / 2, y + h + 0.02, z1, W + 0.3, 0.18, 0.26)
    B.box('trim', x0, y + h + 0.02, (z0 + z1) / 2, 0.26, 0.18, D + 0.3); B.box('trim', x1, y + h + 0.02, (z0 + z1) / 2, 0.26, 0.18, D + 0.3)
    return { geo: B.merged(), cols, doors, rolls, wins }
  }, [x0, x1, z0, z1, y, h, JSON.stringify(openings), plinth, colliders])

  const roofGeo = useMemo(() => {
    const out = []
    const ridgeAlongX = W >= D
    const span = ridgeAlongX ? D : W, long = ridgeAlongX ? W : D
    const OV = 0.32
    const rise = roof === 'flat' ? 0.0 : roof === 'shed' ? pitch * span : pitch * span / 2
    const slopeLen = roof === 'flat' ? span : Math.hypot(roof === 'shed' ? span : span / 2, rise) + OV
    const ang = Math.atan2(rise, roof === 'shed' ? span : span / 2)
    const panel = (cxp, cyp, czp, sign) => {
      const g = new THREE.BoxGeometry(ridgeAlongX ? long + OV * 2 : slopeLen, 0.07, ridgeAlongX ? slopeLen : long + OV * 2)
      if (ridgeAlongX) g.rotateX(sign * ang); else g.rotateZ(-sign * ang)
      // metre UVs over the panel plane
      const p = g.attributes.position, uv = new Float32Array(p.count * 2)
      for (let i = 0; i < p.count; i++) { uv[i * 2] = ridgeAlongX ? p.getX(i) : p.getZ(i); uv[i * 2 + 1] = ridgeAlongX ? p.getZ(i) : p.getX(i) }
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
      g.translate(cxp, cyp, czp)
      return g
    }
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2
    if (roof === 'gable') {
      if (ridgeAlongX) { out.push(panel(mx, y + h + rise / 2 + 0.05, z0 + span / 4, 1), panel(mx, y + h + rise / 2 + 0.05, z1 - span / 4, -1)) }
      else { out.push(panel(x0 + span / 4, y + h + rise / 2 + 0.05, mz, 1), panel(x1 - span / 4, y + h + rise / 2 + 0.05, mz, -1)) }
    } else if (roof === 'shed') {
      if (ridgeAlongX) out.push(panel(mx, y + h + rise / 2 + 0.05, mz, 1)); else out.push(panel(mx, y + h + rise / 2 + 0.05, mz, 1))
    } else out.push(panel(mx, y + h + 0.1, mz, 0))
    return { panels: out, rise, ridgeAlongX }
  }, [x0, x1, z0, z1, y, h, roof, pitch])

  // gable end triangles in the wall material
  const gables = useMemo(() => {
    if (roof !== 'gable') return null
    const ridgeAlongX = W >= D, span = ridgeAlongX ? D : W, rise = pitch * span / 2
    const shape = new THREE.Shape(); shape.moveTo(-span / 2, 0); shape.lineTo(span / 2, 0); shape.lineTo(0, rise); shape.closePath()
    const mk = (cx, cz, ry) => {
      const g = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false })
      g.translate(0, 0, -T / 2); g.rotateY(ry); g.translate(cx, y + h, cz)
      const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2)
      for (let i = 0; i < p.count; i++) { uv[i * 2] = Math.abs(n.getX(i)) > 0.5 ? p.getZ(i) : p.getX(i); uv[i * 2 + 1] = p.getY(i) }
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
      return g
    }
    return ridgeAlongX ? [mk(x0, (z0 + z1) / 2, Math.PI / 2), mk(x1, (z0 + z1) / 2, Math.PI / 2)] : [mk((x0 + x1) / 2, z0, 0), mk((x0 + x1) / 2, z1, 0)]
  }, [x0, x1, z0, z1, y, h, roof, pitch])

  const wallMat = M[wall] || M.sand
  const roofM = M[roofMat] || M.roofGrey
  const glass = M.A.f.glass
  const night = useMemo(() => nightLit(new THREE.MeshStandardMaterial({ color: '#f2ede2', emissive: '#ffd49a', roughness: 0.5 }), 3.2, 0), [])
  const framesteel = useMemo(() => new THREE.MeshStandardMaterial({ color: '#40464b', roughness: 0.5, metalness: 0.7 }), [])
  return (
    <group>
      {plan.geo.wall && <mesh geometry={plan.geo.wall} material={wallMat} castShadow receiveShadow />}
      {plan.geo.lining && <mesh geometry={plan.geo.lining} material={M.A.f.plaster} receiveShadow />}
      {plan.geo.plinth && <mesh geometry={plan.geo.plinth} material={M.A.f.concrete} castShadow receiveShadow />}
      {plan.geo.frame && <mesh geometry={plan.geo.frame} material={M.A.frame} castShadow />}
      {plan.geo.framesteel && <mesh geometry={plan.geo.framesteel} material={framesteel} castShadow />}
      {plan.geo.trim && <mesh geometry={plan.geo.trim} material={M.steelDark} castShadow />}
      {roofGeo.panels.map((g, i) => <mesh key={i} geometry={g} material={roofM} castShadow receiveShadow />)}
      {gables && gables.map((g, i) => <mesh key={i} geometry={g} material={wallMat} castShadow />)}
      {plan.wins.map((w, i) => <mesh key={i} position={[w.x, w.y, w.z]} material={glass}><boxGeometry args={w.horiz ? [w.w, w.h, 0.04] : [0.04, w.h, w.w]} /></mesh>)}
      {colliders && <RigidBody type="fixed" colliders={false}>
        {plan.cols.map(([cx, cy, cz, hx, hy, hz], i) => <CuboidCollider key={i} args={[hx, hy, hz]} position={[cx, cy, cz]} />)}
        {plan.rolls.map((r, i) => <CuboidCollider key={'r' + i} args={r.horiz ? [r.w / 2, r.h / 2, 0.08] : [0.08, r.h / 2, r.w / 2]} position={[r.cx, r.y + r.h / 2, r.cz]} />)}
      </RigidBody>}
      {plan.rolls.map((r, i) => (r.kind === 'locked' ? <LockedLeaf key={i} r={r} /> : <RollUp key={i} r={r} />))}
      {plan.doors.map((d) => <SteelDoor key={d.id} id={d.id} hinge={d.hinge} width={d.w - 0.02} height={d.h - 0.02} baseYaw={d.baseYaw} openAngle={d.openAngle} label={d.label || 'door'} colour={d.colour || '#6f777d'} glazed={d.glazed} />)}
      {/* wall-pack lights over each working door (glow at night) */}
      {plan.doors.map((d) => <mesh key={'l' + d.id} position={[d.cx + d.n[0] * 0.28, y + d.h + 0.45, d.cz + d.n[1] * 0.28]} material={night}><boxGeometry args={[Math.abs(d.n[1]) * 0.4 + Math.abs(d.n[0]) * 0.12, 0.12, Math.abs(d.n[0]) * 0.4 + Math.abs(d.n[1]) * 0.12]} /></mesh>)}
      {ceiling != null && <mesh position={[(x0 + x1) / 2, y + ceiling, (z0 + z1) / 2]} rotation={[Math.PI / 2, 0, 0]} material={M.A.f.plaster}><planeGeometry args={[W - T, D - T]} /></mesh>}
      {sign && <BrandSign text={sign.text} sub={sign.sub} position={sign.position} rotation={sign.rotation || [0, 0, 0]} width={sign.width || 5} size={sign.size || 100} color={sign.color || '#f4f1ea'} />}
    </group>
  )
}

/** A closed roll-up door: ribbed painted panel, guide rails, a housing box above. Scenery (does not open). */
function RollUp({ r }) {
  const M = indMats()
  const colour = r.colour || '#8a9094'
  const mat = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256
    const x = c.getContext('2d'); x.fillStyle = colour; x.fillRect(0, 0, 64, 256)
    for (let i = 0; i < 32; i++) { x.fillStyle = 'rgba(0,0,0,0.28)'; x.fillRect(0, i * 8 + 5, 64, 3); x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(0, i * 8, 64, 2) }
    for (let i = 0; i < 80; i++) { x.fillStyle = `rgba(${i % 2 ? '30,30,30' : '200,200,200'},0.05)`; x.fillRect((i * 37) % 64, (i * 91) % 256, 6, 2) }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, metalness: 0.5 })
  }, [colour])
  const [dx, dz] = r.n
  const px = r.cx - dx * 0.03, pz = r.cz - dz * 0.03
  return (
    <group>
      <mesh position={[px, r.y + r.h / 2, pz]} material={mat} castShadow><boxGeometry args={r.horiz ? [r.w - 0.02, r.h, 0.06] : [0.06, r.h, r.w - 0.02]} /></mesh>
      <mesh position={[r.cx + dx * 0.16, r.y + r.h + 0.18, r.cz + dz * 0.16]} material={M.steelDark} castShadow><boxGeometry args={r.horiz ? [r.w + 0.3, 0.36, 0.3] : [0.3, 0.36, r.w + 0.3]} /></mesh>
      {[-1, 1].map((sd) => <mesh key={sd} position={[r.horiz ? r.cx + sd * (r.w / 2 + 0.05) : r.cx + dx * 0.08, r.y + r.h / 2, r.horiz ? r.cz + dz * 0.08 : r.cz + sd * (r.w / 2 + 0.05)]} material={M.steelDark}><boxGeometry args={r.horiz ? [0.1, r.h, 0.16] : [0.16, r.h, 0.1]} /></mesh>)}
      <mesh position={[r.cx + dx * 0.12, r.y + 0.4, r.cz + dz * 0.12]} material={M.hazard}><boxGeometry args={r.horiz ? [r.w, 0.8, 0.02] : [0.02, 0.8, r.w]} /></mesh>
    </group>
  )
}

// ---------------------------------------------------------------------------------------------------------------
/** Standard 20 ft containers, instanced (one draw call per colour). stacks: [{ x, z, rot, level }] with `rot` 0 = long side along x. */
export function Containers({ y, stacks }) {
  const defs = [['#a23b2f', 'KESTREL LINE'], ['#2f5f8a', 'NORTHPORT'], ['#2f7a62', 'VERDANT'], ['#c58a2a', 'OCHRE FREIGHT'], ['#6c6f75', 'STORMLINE'], ['#7a3b6e', 'ORCHID CARGO']]
  const L = 6.06, Wd = 2.44, Hc = 2.59
  const groups = useMemo(() => defs.map(([hex, label]) => ({ hex, label, items: [] })), [])
  const placed = useMemo(() => {
    const g = defs.map(([hex, label]) => ({ hex, label, items: [] }))
    stacks.forEach((s, i) => { g[(s.c ?? i) % g.length].items.push(s) })
    return g
  }, [stacks])
  void groups
  return (
    <>
      {placed.map((g, gi) => g.items.length > 0 && (
        <ContainerBatch key={gi} hex={g.hex} label={g.label} items={g.items} y={y} L={L} W={Wd} H={Hc} />
      ))}
      <RigidBody type="fixed" colliders={false}>
        {stacks.map((s, i) => <CuboidCollider key={i} args={s.rot ? [Wd / 2, Hc / 2, L / 2] : [L / 2, Hc / 2, Wd / 2]} position={[s.x, y + (s.level || 0) * Hc + Hc / 2 + 0.05, s.z]} />)}
      </RigidBody>
    </>
  )
}
function ContainerBatch({ hex, label, items, y, L, W, H }) {
  const ref = useRef()
  const mat = useMemo(() => { const m = containerMaps(hex, label); return new THREE.MeshStandardMaterial({ map: m.map, roughness: 0.62, metalness: 0.5 }) }, [hex, label])
  const geo = useMemo(() => {
    const g = new THREE.BoxGeometry(L, H, W)
    const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2)
    for (let i = 0; i < p.count; i++) {
      const ax = Math.abs(n.getX(i)), az = Math.abs(n.getZ(i))
      // u runs left-to-right as seen from outside, so the stencilled names never mirror
      uv[i * 2] = az > 0.5 ? Math.sign(n.getZ(i)) * p.getX(i) + L / 2 : ax > 0.5 ? -Math.sign(n.getX(i)) * p.getZ(i) + W / 2 : p.getX(i)
      uv[i * 2 + 1] = p.getY(i) + H / 2
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    return g
  }, [])
  useEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), pos = new THREE.Vector3()
    items.forEach((it, i) => {
      e.set(0, (it.rot ? Math.PI / 2 : 0) + (it.jit || 0), 0); q.setFromEuler(e)
      pos.set(it.x, y + (it.level || 0) * H + H / 2 + 0.05, it.z)
      m.compose(pos, q, s); ref.current.setMatrixAt(i, m)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [items])
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} castShadow receiveShadow frustumCulled={false} />
}

/** Euro pallets with stacked boxes or sacks (one box per pile; cheap). */
export function PalletStacks({ y, spots }) {
  const A = assetMats()
  const geo = useMemo(() => {
    const B = new Builder()
    spots.forEach((s, i) => {
      const hh = 0.8 + ((i * 37) % 7) * 0.12
      for (let k = 0; k < 3; k++) B.box('wood', s.x, y + 0.04 + 0.05, s.z + (k - 1) * 0.36, 1.2, 0.09, 0.14)
      B.box('wood', s.x, y + 0.02, s.z, 1.2, 0.04, 0.8)
      B.box(s.kind === 'sack' ? 'sack' : 'box', s.x, y + 0.14 + hh / 2, s.z, 1.1, hh, 0.74)
      B.box('wrap', s.x, y + 0.14 + hh / 2, s.z, 1.12, hh + 0.01, 0.76)
    })
    return B.merged()
  }, [spots])
  const mats = useMemo(() => ({
    wood: new THREE.MeshStandardMaterial({ color: '#a8855b', roughness: 0.85 }),
    box: new THREE.MeshStandardMaterial({ color: '#b99466', roughness: 0.9 }),
    sack: new THREE.MeshStandardMaterial({ color: '#d8d3c4', roughness: 0.95 }),
    wrap: new THREE.MeshStandardMaterial({ color: '#dfe9ee', roughness: 0.2, transparent: true, opacity: 0.18, depthWrite: false }),
  }), [])
  void A
  return (
    <>
      {Object.entries(geo).map(([k, g]) => <mesh key={k} geometry={g} material={mats[k]} castShadow receiveShadow />)}
      <RigidBody type="fixed" colliders={false}>{spots.map((s, i) => <CuboidCollider key={i} args={[0.6, 0.55, 0.4]} position={[s.x, y + 0.6, s.z]} />)}</RigidBody>
    </>
  )
}

// ---------------------------------------------------------------------------------------------------------------
/** Large steel roll-off / recycling bin, open top with a painted band and a label. Sides line up with the container texture style. */
export function RollOffBin({ position, yaw = 0, colour = '#2a6fc0', label = 'PAPER', length = 5.2, height = 2.2, width = 2.4, lidStyle = 'open', slot = false }) {
  const M = indMats()
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.55, metalness: 0.35 }), [colour])
  const ribs = useMemo(() => new THREE.MeshStandardMaterial({ color: new THREE.Color(colour).multiplyScalar(0.78), roughness: 0.6, metalness: 0.4 }), [colour])
  const n = Math.round(length / 0.5)
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[length / 2, height / 2, width / 2]} position={[0, height / 2 + 0.12, 0]} />
      </RigidBody>
      <group userData={{}}>
        {/* body: floor, four walls (open top), ribs, rails, wheels */}
        <mesh position={[0, 0.16, 0]} material={M.steelDark} castShadow><boxGeometry args={[length, 0.08, width]} /></mesh>
        <mesh position={[0, height / 2 + 0.12, width / 2 - 0.03]} material={mat} castShadow receiveShadow><boxGeometry args={[length, height, 0.06]} /></mesh>
        <mesh position={[0, height / 2 + 0.12, -width / 2 + 0.03]} material={mat} castShadow receiveShadow><boxGeometry args={[length, height, 0.06]} /></mesh>
        <mesh position={[length / 2 - 0.03, height / 2 + 0.12, 0]} material={mat} castShadow receiveShadow><boxGeometry args={[0.06, height, width]} /></mesh>
        <mesh position={[-length / 2 + 0.03, height / 2 + 0.12, 0]} material={mat} castShadow receiveShadow><boxGeometry args={[0.06, height, width]} /></mesh>
        {Array.from({ length: n }, (_, i) => -length / 2 + (i + 0.5) * (length / n)).flatMap((x) => [1, -1].map((s) => (
          <mesh key={x + ':' + s} position={[x, height / 2 + 0.12, s * (width / 2 + 0.015)]} material={ribs}><boxGeometry args={[0.08, height - 0.1, 0.04]} /></mesh>
        )))}
        <mesh position={[0, height + 0.12, 0]} material={M.steelDark}><boxGeometry args={[length + 0.04, 0.08, width + 0.04]} /></mesh>
        {lidStyle === 'open'
          ? <mesh position={[0, height * 0.66, 0]} material={M.rubber}><boxGeometry args={[length - 0.2, 0.05, width - 0.2]} /></mesh>
          : null}
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <mesh key={i} position={[a * (length / 2 - 0.5), 0.1, b * (width / 2 - 0.1)]} material={M.rubber} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.1, 0.1, 0.12, 12]} /></mesh>)}
        {slot && <mesh position={[0, height * 0.6, width / 2 + 0.035]} material={M.rubber}><boxGeometry args={[1.1, 0.14, 0.02]} /></mesh>}
        {[1, -1].map((s) => <BrandSign key={s} text={label} position={[0, height * 0.62 + 0.12, s * (width / 2 + 0.045)]} rotation={[0, s > 0 ? 0 : Math.PI, 0]} width={Math.min(3.6, length - 0.8)} size={120} color="#ffffff" />)}
      </group>
    </group>
  )
}

/** A simple rear-loader refuse truck (not drivable; a parked prop). Local +x = forward. Real shapes, simple detail, no brand marks. */
export function RefuseTruck({ position, yaw = 0, colour = '#2f7a62', id = 'truck' }) {
  const M = indMats()
  const body = useMemo(() => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.4, metalness: 0.35 }), [colour])
  const cab = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e9e9e4', roughness: 0.35, metalness: 0.3 }), [])
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[3.0, 1.35, 1.2]} position={[-1.3, 1.9, 0]} />
        <CuboidCollider args={[1.1, 1.1, 1.15]} position={[3.15, 1.55, 0]} />
        <CuboidCollider args={[4.4, 0.45, 1.0]} position={[0, 0.7, 0]} />
      </RigidBody>
      <mesh position={[-1.3, 1.9, 0]} material={body} castShadow receiveShadow><boxGeometry args={[6.0, 2.7, 2.4]} /></mesh>
      <mesh position={[-4.35, 1.2, 0]} material={M.steelDark} castShadow><boxGeometry args={[0.55, 1.5, 2.1]} /></mesh>
      <mesh position={[-1.3, 3.28, 0]} material={body}><boxGeometry args={[5.8, 0.12, 2.3]} /></mesh>
      <mesh position={[3.15, 1.55, 0]} material={cab} castShadow><boxGeometry args={[2.2, 2.2, 2.3]} /></mesh>
      <mesh position={[4.27, 1.95, 0]} material={M.A.f.glass}><boxGeometry args={[0.04, 1.0, 2.0]} /></mesh>
      <mesh position={[3.15, 0.55, 0]} material={M.steelDark}><boxGeometry args={[8.4, 0.3, 1.9]} /></mesh>
      {[[-2.6, 1.2], [-2.6, -1.2], [-0.8, 1.2], [-0.8, -1.2], [3.4, 1.15], [3.4, -1.15]].map(([x, z], i) => (
        <group key={i} position={[x, 0.52, z]}><mesh rotation={[Math.PI / 2, 0, 0]} material={M.rubber} castShadow><cylinderGeometry args={[0.52, 0.52, 0.34, 18]} /></mesh><mesh rotation={[Math.PI / 2, 0, 0]} material={M.steel}><cylinderGeometry args={[0.26, 0.26, 0.36, 12]} /></mesh></group>
      ))}
      <mesh position={[-4.1, 2.6, 0]} material={M.safety}><boxGeometry args={[0.1, 0.6, 1.8]} /></mesh>
      <mesh position={[4.3, 0.6, 0.8]} material={M.A.sconce}><boxGeometry args={[0.05, 0.16, 0.3]} /></mesh>
      <mesh position={[4.3, 0.6, -0.8]} material={M.A.sconce}><boxGeometry args={[0.05, 0.16, 0.3]} /></mesh>
    </group>
  )
}

/** Yellow-and-black striped steel bollard (concrete-filled pipe). */
export function SafetyBollards({ pts, y }) {
  const M = indMats()
  return (
    <>
      {pts.map(([x, z], i) => <mesh key={i} position={[x, y + 0.55, z]} material={M.hazard} castShadow><cylinderGeometry args={[0.1, 0.1, 1.1, 12]} /></mesh>)}
      <RigidBody type="fixed" colliders={false}>{pts.map(([x, z], i) => <CylinderCollider key={i} args={[0.55, 0.1]} position={[x, y + 0.55, z]} />)}</RigidBody>
    </>
  )
}

/** Two-nozzle diesel pump island for the depot. */
export function FuelIsland({ x, z, y }) {
  const M = indMats()
  const body = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d9d9d4', roughness: 0.4, metalness: 0.3 }), [])
  return (
    <group>
      <mesh position={[x, y + 0.1, z]} material={M.A.f.concrete} receiveShadow castShadow><boxGeometry args={[1.4, 0.2, 5]} /></mesh>
      {[-1.2, 1.2].map((dz) => (
        <group key={dz} position={[x, y + 0.2, z + dz]}>
          <mesh position={[0, 0.85, 0]} material={body} castShadow><boxGeometry args={[0.6, 1.7, 0.5]} /></mesh>
          <mesh position={[0, 1.3, 0.26]} material={M.A.sconce}><boxGeometry args={[0.36, 0.2, 0.02]} /></mesh>
          <mesh position={[0, 1.76, 0]} material={M.safety}><boxGeometry args={[0.64, 0.12, 0.54]} /></mesh>
          <mesh position={[0.34, 0.9, 0.0]} material={M.rubber}><boxGeometry args={[0.06, 0.6, 0.08]} /></mesh>
        </group>
      ))}
      <mesh position={[x, y + 4.6, z]} material={M.steelDark} castShadow><boxGeometry args={[4.6, 0.25, 7]} /></mesh>
      {[[-2, -3], [2, -3], [-2, 3], [2, 3]].map(([a, b], i) => <mesh key={i} position={[x + a, y + 2.3, z + b]} material={M.steel} castShadow><boxGeometry args={[0.2, 4.6, 0.2]} /></mesh>)}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.7, 0.9, 2.5]} position={[x, y + 0.9, z]} />
        {[[-2, -3], [2, -3], [-2, 3], [2, 3]].map(([a, b], i) => <CuboidCollider key={i} args={[0.1, 2.3, 0.1]} position={[x + a, y + 2.3, z + b]} />)}
      </RigidBody>
    </group>
  )
}

export { yardConcreteMaps }

/** A fixed steel door leaf (locked): flush panel, lever handle, kick plate. Does not open. */
function LockedLeaf({ r }) {
  const M = indMats()
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: r.colour || '#7d8489', roughness: 0.5, metalness: 0.6 }), [r.colour])
  const [dx, dz] = r.n
  const pw = r.horiz ? [r.w - 0.04, r.h - 0.02, 0.05] : [0.05, r.h - 0.02, r.w - 0.04]
  return (
    <group>
      <mesh position={[r.cx - dx * 0.02, r.y + r.h / 2, r.cz - dz * 0.02]} material={mat} castShadow><boxGeometry args={pw} /></mesh>
      <mesh position={[r.cx + dx * 0.07 + (r.horiz ? r.w * 0.36 : 0), r.y + r.h * 0.46, r.cz + dz * 0.07 + (r.horiz ? 0 : r.w * 0.36)]} material={M.steel}><boxGeometry args={[0.1, 0.1, 0.1]} /></mesh>
      <mesh position={[r.cx + dx * 0.05, r.y + 0.15, r.cz + dz * 0.05]} material={M.steelDark}><boxGeometry args={r.horiz ? [r.w - 0.1, 0.3, 0.02] : [0.02, 0.3, r.w - 0.1]} /></mesh>
    </group>
  )
}

/** Open-sided roof on posts (wash bay, fuel canopy, covered store). Posts are solid; the space underneath is walkable. */
export function Canopy({ x0, x1, z0, z1, y, h = 5, roofMat = 'roofGrey' }) {
  const M = indMats()
  const roof = M[roofMat] || M.roofGrey
  const posts = [[x0 + 0.2, z0 + 0.2], [x1 - 0.2, z0 + 0.2], [x0 + 0.2, z1 - 0.2], [x1 - 0.2, z1 - 0.2], [(x0 + x1) / 2, z0 + 0.2], [(x0 + x1) / 2, z1 - 0.2]]
  return (
    <group>
      <mesh position={[(x0 + x1) / 2, y + h + 0.1, (z0 + z1) / 2]} material={roof} castShadow receiveShadow><boxGeometry args={[x1 - x0 + 0.6, 0.12, z1 - z0 + 0.6]} /></mesh>
      <mesh position={[(x0 + x1) / 2, y + h - 0.2, (z0 + z1) / 2]} material={M.steelDark}><boxGeometry args={[x1 - x0, 0.3, 0.3]} /></mesh>
      {posts.map(([px, pz], i) => <mesh key={i} position={[px, y + h / 2, pz]} material={M.steelDark} castShadow><boxGeometry args={[0.28, h, 0.28]} /></mesh>)}
      <RigidBody type="fixed" colliders={false}>{posts.map(([px, pz], i) => <CuboidCollider key={i} args={[0.14, h / 2, 0.14]} position={[px, y + h / 2, pz]} />)}</RigidBody>
    </group>
  )
}

/** Semi-trailer parked at a dock (scenery): box body, landing legs, tandem wheels. Local +x = towards the tractor end. */
export function Trailer({ position, yaw = 0, colour = '#d8dbdc', label = 'CEDAR FREIGHT' }) {
  const M = indMats()
  const body = useMemo(() => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.5, metalness: 0.3 }), [colour])
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[6.2, 1.5, 1.3]} position={[0, 2.0, 0]} /><CuboidCollider args={[5, 0.35, 1]} position={[-0.6, 0.8, 0]} /></RigidBody>
      <mesh position={[0, 2.0, 0]} material={body} castShadow receiveShadow><boxGeometry args={[12.4, 2.9, 2.55]} /></mesh>
      <mesh position={[0, 0.55, 0]} material={M.steelDark}><boxGeometry args={[11, 0.3, 1.5]} /></mesh>
      {[-4.6, -3.3].flatMap((x) => [1, -1].map((s) => <mesh key={x + ':' + s} position={[x, 0.5, s * 1.05]} rotation={[Math.PI / 2, 0, 0]} material={M.rubber} castShadow><cylinderGeometry args={[0.5, 0.5, 0.3, 16]} /></mesh>))}
      {[1, -1].map((s) => <mesh key={s} position={[3.8, 0.7, s * 0.9]} material={M.steel}><boxGeometry args={[0.15, 1.3, 0.15]} /></mesh>)}
      {[1, -1].map((s) => <BrandSign key={s} text={label} position={[0, 2.2, s * 1.285]} rotation={[0, s > 0 ? 0 : Math.PI, 0]} width={5.2} size={110} color="#2a4b6e" />)}
    </group>
  )
}

/** Pallet racking, 3 beam levels, with pallet loads; one solid block per run (aisles stay open). Racks run along x. */
export function Racking({ x0, x1, z, y, levels = 3, depth = 1.1, bayW = 2.7 }) {
  const geo = useMemo(() => {
    const B = new Builder()
    const n = Math.round((x1 - x0) / bayW)
    const bw = (x1 - x0) / n
    for (let i = 0; i <= n; i++) for (const dz of [-depth / 2, depth / 2]) B.box('upright', x0 + i * bw, y + (levels * 1.6 + 0.4) / 2, z + dz, 0.09, levels * 1.6 + 0.4, 0.09)
    for (let l = 0; l < levels; l++) {
      const by = y + 0.5 + l * 1.6
      for (const dz of [-depth / 2, depth / 2]) B.box('beam', (x0 + x1) / 2, by, z + dz, x1 - x0, 0.12, 0.06)
      for (let i = 0; i < n; i++) {
        const cx = x0 + (i + 0.5) * bw
        B.box('deck', cx, by + 0.07, z, bw - 0.1, 0.03, depth - 0.1)
        if ((i * 7 + l * 3) % 5 !== 0) {
          const hh = 0.7 + ((i * 13 + l * 5) % 4) * 0.1
          B.box('load', cx, by + 0.09 + hh / 2, z, bw - 0.4, hh, depth - 0.25)
        }
      }
    }
    return B.merged()
  }, [x0, x1, z, y, levels, depth, bayW])
  const mats = useMemo(() => ({
    upright: new THREE.MeshStandardMaterial({ color: '#2f5f9a', roughness: 0.5, metalness: 0.5 }),
    beam: new THREE.MeshStandardMaterial({ color: '#d0702b', roughness: 0.5, metalness: 0.5 }),
    deck: new THREE.MeshStandardMaterial({ color: '#7d7b74', roughness: 0.7, metalness: 0.5 }),
    load: new THREE.MeshStandardMaterial({ color: '#b99466', roughness: 0.9 }),
  }), [])
  return (
    <>
      {Object.entries(geo).map(([k, g]) => <mesh key={k} geometry={g} material={mats[k]} castShadow receiveShadow />)}
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[(x1 - x0) / 2, (levels * 1.6 + 0.4) / 2, depth / 2]} position={[(x0 + x1) / 2, y + (levels * 1.6 + 0.4) / 2, z]} /></RigidBody>
    </>
  )
}
