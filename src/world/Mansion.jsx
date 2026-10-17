import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { surface, signatureMarble, blackMarble } from './materials.js'
import { Gate, Wall, Block } from './jobkit.jsx'
import { DoorLeaf } from './Door.jsx'
import { Chandelier } from './Chandelier.jsx'
import { Chair, Stool, Sofa, Table, Rug, Plant, Shelf, CeilingLight, Counter } from './furniture.jsx'
import { Trees, FlowerBed, StreetLamp, Fountain, Lawn, LightAnchor } from './props.jsx'
import { BrandSign } from './signs.jsx'
import { nightLit } from '../state/environment.js'
import { registerInteractable, playerState } from '../state/runtime.js'
import { startCine } from '../state/cine.js'
import {
  CURB, FLOOR, HOUSE, CX, FOYER, H_WING, H_MAIN, PORTICO, STEPS, STAIR, GALLERY, STAIR_END_Z, GATE_Z, mansionState,
} from '../config/mansion.js'

export { HOUSE }

// Reign Estate: a gated mansion with a portico, a double-height marble foyer under a crystal
// chandelier, a grand stair up to a gallery, a music room with a grand piano and fireplace,
// and a candle-lit dining hall. The front doors open as you approach. Everything uses absolute
// world coordinates (lights, seats and colliders register world positions).

const ZONE = 'mansion'
const Y = FLOOR
let M
function mats() {
  if (M) return M
  M = {
    marbleWhite: new THREE.MeshStandardMaterial({ color: '#e8e3da', roughness: 0.24, metalness: 0.04 }),
    carpet: new THREE.MeshStandardMaterial({ color: '#5b2a8c', roughness: 0.95 }),
    brass: new THREE.MeshStandardMaterial({ color: '#c9a35a', metalness: 1, roughness: 0.28 }),
    iron: new THREE.MeshStandardMaterial({ color: '#141417', metalness: 0.7, roughness: 0.4 }),
    ceiling: new THREE.MeshStandardMaterial({ color: '#efe9e2', roughness: 0.95 }),
    stone: surface('limestone', 8, 1.2),
    stoneFine: surface('limestone', 1, 1),
    extWall: surface('limestone', 6, 1.4),
    foyerWall: surface('plaster', 4, 3, { color: '#cfc4e6' }),
    musicWall: surface('plaster', 4, 2, { color: '#7d5a86' }),
    diningWall: surface('plaster', 4, 2, { color: '#cdb88f' }),
    pavers: surface('pavers', 11, 9),
    piano: new THREE.MeshPhysicalMaterial({ color: '#07070a', roughness: 0.14, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 }),
    flame: new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: '#ff8a1f', emissiveIntensity: 3, toneMapped: false }),
    wood: surface('wood', 3, 3, { color: '#8a5a38' }),
    slate: new THREE.MeshStandardMaterial({ color: '#3a3d46', roughness: 0.75, metalness: 0.1 }),
    shutter: new THREE.MeshStandardMaterial({ color: '#1f3a2e', roughness: 0.55 }),
    quoin: new THREE.MeshStandardMaterial({ color: '#f1ebe0', roughness: 0.8 }),
    limeWhite: new THREE.MeshStandardMaterial({ color: '#f3efe6', roughness: 0.6 }),
    planter: new THREE.MeshStandardMaterial({ color: '#8c8579', roughness: 0.85 }),
    soil: new THREE.MeshStandardMaterial({ color: '#2b1f17', roughness: 1 }),
    trunk: new THREE.MeshStandardMaterial({ color: '#4a3626', roughness: 0.9 }),
    leaf: new THREE.MeshStandardMaterial({ color: '#2f5f2c', roughness: 0.95 }),
    lantern: nightLit(new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffd596', roughness: 0.4 }), 3.2, 0.1),
  }
  return M
}

/* ------------------------------------------------------------------ paintings */
function artTexture(seed) {
  const c = document.createElement('canvas')
  c.width = 384; c.height = 512
  const g = c.getContext('2d')
  const pals = [['#1a0b33', '#7a3cff', '#e08fd0', '#f2c76b'], ['#071a2b', '#1fb7a7', '#8be3d6', '#f0dca8'], ['#2b0a1c', '#c2307a', '#f08aa8', '#f6d9a0'], ['#101018', '#d9b25a', '#f6e7b8', '#7a5af0']]
  const p = pals[seed % pals.length]
  const gr = g.createLinearGradient(0, 0, 384, 512)
  gr.addColorStop(0, p[0]); gr.addColorStop(1, p[1])
  g.fillStyle = gr; g.fillRect(0, 0, 384, 512)
  let s = seed * 9301 + 17
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
  for (let i = 0; i < 9; i++) {
    g.globalAlpha = 0.25 + rnd() * 0.5
    g.fillStyle = p[1 + Math.floor(rnd() * 3)]
    g.beginPath()
    g.ellipse(rnd() * 384, rnd() * 512, 30 + rnd() * 120, 20 + rnd() * 90, rnd() * 3, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 0.9; g.strokeStyle = p[3]; g.lineWidth = 3
  for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(0, 90 + i * 70 + rnd() * 30); g.bezierCurveTo(120, rnd() * 512, 260, rnd() * 512, 384, 60 + i * 80); g.stroke() }
  g.globalAlpha = 1
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  return t
}
const artMats = new Map()
function Painting({ position, yaw = 0, w = 1.6, h = 2.1, seed = 1 }) {
  const m = mats()
  const mat = useMemo(() => {
    if (!artMats.has(seed)) artMats.set(seed, new THREE.MeshStandardMaterial({ map: artTexture(seed), roughness: 0.55 }))
    return artMats.get(seed)
  }, [seed])
  return (
    <group position={position} rotation={[0, yaw, 0]} userData={{ noBatch: true }}>
      <mesh material={m.brass}><boxGeometry args={[w + 0.22, h + 0.22, 0.07]} /></mesh>
      <mesh position={[0, 0, 0.04]} material={mat}><planeGeometry args={[w, h]} /></mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ doors */
function FrontDoors() {
  const [open, setOpen] = useState(false)
  const last = useRef(false)
  useFrame(() => {
    const p = playerState.position
    const near = Math.hypot(p.x - CX, p.z - (HOUSE.z1 + 1.5)) < 5.2 && p.z > HOUSE.z0 - 5
    const want = mansionState.doorsForce ?? near
    if (want !== last.current) { last.current = want; setOpen(want) }
  })
  const m = mats()
  const dz = HOUSE.z1 - 0.2
  return (
    <>
      <DoorLeaf hinge={[CX - 1.6, Y, dz]} width={1.6} height={3.5} baseYaw={0} openAngle={1.6} open={open} accent="#c9a35a" style="black" />
      <DoorLeaf hinge={[CX + 1.6, Y, dz]} width={1.6} height={3.5} baseYaw={Math.PI} openAngle={-1.6} open={open} accent="#c9a35a" style="black" />
      {/* transom + door surround */}
      <mesh position={[CX, Y + 3.58, dz]} material={m.brass}><boxGeometry args={[3.5, 0.08, 0.5]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[CX + s * 1.75, Y + 1.8, dz]} material={m.stoneFine}><boxGeometry args={[0.22, 3.6, 0.55]} /></mesh>)}
    </>
  )
}

/* ------------------------------------------------------------------ shell */
function Cornice({ x0, x1, z0, z1, y, h = 0.45, o = 0.5, mat }) {
  const m = mats()
  const w = x1 - x0, d = z1 - z0, mt = mat || m.stoneFine, e = o * 0.3
  return (
    <>
      <mesh position={[(x0 + x1) / 2, y, z0 - e]} material={mt} castShadow><boxGeometry args={[w + o + 0.2, h, o]} /></mesh>
      <mesh position={[(x0 + x1) / 2, y, z1 + e]} material={mt} castShadow><boxGeometry args={[w + o + 0.2, h, o]} /></mesh>
      <mesh position={[x0 - e, y, (z0 + z1) / 2]} material={mt} castShadow><boxGeometry args={[o, h, d]} /></mesh>
      <mesh position={[x1 + e, y, (z0 + z1) / 2]} material={mt} castShadow><boxGeometry args={[o, h, d]} /></mesh>
    </>
  )
}

function Pediment() {
  const m = mats()
  const geo = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-9.6, 0); s.lineTo(9.6, 0); s.lineTo(0, 2.6); s.lineTo(-9.6, 0)
    return new THREE.ExtrudeGeometry(s, { depth: 3.2, bevelEnabled: false })
  }, [])
  return <mesh geometry={geo} material={m.stoneFine} position={[CX, Y + 7.2, PORTICO.z0 + 0.0]} castShadow />
}

function Portico() {
  const m = mats()
  const xs = [91.4, 94.6, 103.4, 106.6]
  const zc = PORTICO.z1 - 0.7
  return (
    <>
      <Block position={[CX, CURB + 0.45, (PORTICO.z0 + PORTICO.z1) / 2]} size={[PORTICO.x1 - PORTICO.x0, 0.9, PORTICO.z1 - PORTICO.z0]} material={m.stoneFine} />
      <mesh position={[CX, Y + 0.004, (PORTICO.z0 + PORTICO.z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={blackMarble('#c9a96a', 6, 1.5)} receiveShadow>
        <planeGeometry args={[PORTICO.x1 - PORTICO.x0 - 0.3, PORTICO.z1 - PORTICO.z0 - 0.2]} />
      </mesh>
      {xs.map((x) => (
        <group key={x}>
          <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.34, 3.4, 0.34]} position={[x, Y + 3.2, zc]} /></RigidBody>
          <mesh position={[x, Y + 0.2, zc]} material={m.stoneFine} castShadow><boxGeometry args={[0.9, 0.4, 0.9]} /></mesh>
          <mesh position={[x, Y + 3.3, zc]} material={m.stoneFine} castShadow><cylinderGeometry args={[0.32, 0.38, 5.8, 20]} /></mesh>
          <mesh position={[x, Y + 6.2, zc]} material={m.brass} castShadow><boxGeometry args={[0.95, 0.3, 0.95]} /></mesh>
        </group>
      ))}
      {/* entablature + pediment */}
      <mesh position={[CX, Y + 6.8, (PORTICO.z0 + PORTICO.z1) / 2 - 0.2]} material={m.stoneFine} castShadow><boxGeometry args={[19.2, 0.8, 3.6]} /></mesh>
      <Pediment />
      <BrandSign text="REIGN ESTATE" sub="· Private Residence ·" position={[CX, Y + 8.4, PORTICO.z0 + 3.24]} width={9} color="#e9d9a8" glow="#ffe9b0" size={130} />
      {/* steps */}
      {Array.from({ length: STEPS.n }, (_, i) => {
        const k = STEPS.n - i // k=n nearest the platform
        const z1 = STEPS.zFront - STEPS.run * (k - 1) // front edge of step k (k=1 is the lowest, at the front)
        const top = STEPS.rise * k
        return <Block key={k} position={[CX, CURB + top / 2, z1 - STEPS.run / 2]} size={[STEPS.x1 - STEPS.x0, top, STEPS.run]} material={m.marbleWhite} />
      })}
      {/* lanterns and uplights */}
      {[-2.6, 2.6].map((dx) => (
        <group key={dx}>
          <mesh position={[CX + dx, Y + 2.7, HOUSE.z1 + 0.15]} material={m.lantern}><boxGeometry args={[0.24, 0.45, 0.22]} /></mesh>
          <mesh position={[CX + dx, Y + 2.99, HOUSE.z1 + 0.15]} material={m.iron}><boxGeometry args={[0.3, 0.06, 0.28]} /></mesh>
          <LightAnchor position={[CX + dx, Y + 2.6, HOUSE.z1 + 0.9]} color="#ffd9a0" intensity={14} distance={11} night range={45} />
        </group>
      ))}
      {[93, 105].map((x) => <LightAnchor key={x} position={[x, CURB + 0.4, -50]} color="#ffcf8f" intensity={16} distance={14} night range={50} />)}
    </>
  )
}


/* ------------------------------------------------------------------ realism details */
/** Casing, projecting sill, keystone lintel and shutters around a window. Local +z points out of the wall. */
function WindowTrim({ at, wall, half, sill, top, shutters = true, y0 = Y }) {
  const m = mats()
  const { x0, x1, z0, z1 } = HOUSE
  const cfg = { n: [at, z1, 0], s: [at, z0, Math.PI], w: [x0, at, -Math.PI / 2], e: [x1, at, Math.PI / 2] }[wall]
  const hgt = top - sill, mid = y0 + sill + hgt / 2
  return (
    <group position={[cfg[0], 0, cfg[1]]} rotation={[0, cfg[2], 0]}>
      <mesh position={[0, y0 + sill - 0.07, 0.17]} material={m.stoneFine} castShadow><boxGeometry args={[half * 2 + 0.55, 0.14, 0.4]} /></mesh>
      <mesh position={[0, y0 + top + 0.14, 0.1]} material={m.stoneFine} castShadow><boxGeometry args={[half * 2 + 0.5, 0.28, 0.24]} /></mesh>
      <mesh position={[0, y0 + top + 0.34, 0.14]} material={m.stoneFine} castShadow><boxGeometry args={[0.34, 0.2, 0.28]} /></mesh>
      {[-1, 1].map((sd) => (
        <group key={sd}>
          <mesh position={[sd * (half + 0.1), mid, 0.06]} material={m.stoneFine} castShadow><boxGeometry args={[0.2, hgt + 0.1, 0.16]} /></mesh>
          {shutters && (
            <mesh position={[sd * (half + 0.5), mid, 0.05]} material={m.shutter} castShadow><boxGeometry args={[0.62, hgt, 0.07]} /></mesh>
          )}
        </group>
      ))}
    </group>
  )
}

function Quoins() {
  const m = mats()
  const ref = useRef()
  const list = useMemo(() => {
    const out = []
    const { x0, x1, z0, z1 } = HOUSE
    const corners = [[x0, z1, -1, 1], [x1, z1, 1, 1], [x0, z0, -1, -1], [x1, z0, 1, -1]]
    for (const [cx, cz, sx, sz] of corners) {
      for (let k = 0; k < 11; k++) {
        const y = Y + 0.3 + k * 0.56, wd = k % 2 ? 0.95 : 0.6, wd2 = k % 2 ? 0.6 : 0.95
        out.push([cx + sx * (-0.2), y, cz + sz * (-0.2) + sz * 0.0, 0.38 + 0, 0.5, wd2 * 1.0, sx, sz, wd]) // face on z side
      }
    }
    return out
  }, [])
  useEffect(() => {
    const o = new THREE.Object3D()
    let i = 0
    for (const [cx, y, cz, , , wd2, sx, sz, wd] of list) {
      // block on the x-facing wall and on the z-facing wall
      o.position.set(cx + sx * 0.0 - sx * wd / 2 + sx * 0.2, y, cz + sz * 0.22); o.scale.set(wd, 0.5, 0.44); o.rotation.set(0, 0, 0); o.updateMatrix(); ref.current.setMatrixAt(i++, o.matrix)
      o.position.set(cx + sx * 0.22, y, cz - sz * wd2 / 2 + sz * 0.2); o.scale.set(0.44, 0.5, wd2); o.updateMatrix(); ref.current.setMatrixAt(i++, o.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [list])
  return <instancedMesh ref={ref} args={[null, m.quoin, list.length * 2]} castShadow><boxGeometry args={[1, 1, 1]} /></instancedMesh>
}

/** Balustrade along a roof edge (axis-aligned segments) plus corner urns. */
function RoofRail({ segs }) {
  const m = mats()
  const ref = useRef()
  const spots = useMemo(() => {
    const out = []
    for (const [x0, z0, x1, z1, y] of segs) {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(len / 0.2)
      for (let i = 0; i <= n; i++) out.push([x0 + ((x1 - x0) * i) / n, y + 0.45, z0 + ((z1 - z0) * i) / n])
    }
    return out
  }, [segs])
  useEffect(() => {
    const o = new THREE.Object3D()
    spots.forEach((p, i) => { o.position.set(...p); o.updateMatrix(); ref.current.setMatrixAt(i, o.matrix) })
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [spots])
  const urn = useMemo(() => new THREE.LatheGeometry([[0.0, 0], [0.22, 0], [0.22, 0.12], [0.14, 0.2], [0.12, 0.34], [0.26, 0.55], [0.3, 0.72], [0.22, 0.85], [0.1, 0.92], [0.0, 0.95]].map(([r, y]) => new THREE.Vector2(r, y)), 14), [])
  return (
    <>
      <instancedMesh ref={ref} args={[null, m.limeWhite, spots.length]}><cylinderGeometry args={[0.045, 0.06, 0.8, 8]} /></instancedMesh>
      {segs.map(([x0, z0, x1, z1, y], i) => (
        <group key={i}>
          <mesh position={[(x0 + x1) / 2, y + 0.9, (z0 + z1) / 2]} material={m.stoneFine} castShadow><boxGeometry args={[Math.abs(x1 - x0) + 0.16, 0.12, Math.abs(z1 - z0) + 0.16]} /></mesh>
          <mesh position={[(x0 + x1) / 2, y + 0.04, (z0 + z1) / 2]} material={m.stoneFine}><boxGeometry args={[Math.abs(x1 - x0) + 0.2, 0.1, Math.abs(z1 - z0) + 0.2]} /></mesh>
          {[[x0, z0], [x1, z1]].map(([ux, uz], k) => (
            <mesh key={k} geometry={urn} position={[ux, y + 0.96, uz]} material={m.stoneFine} castShadow />
          ))}
        </group>
      ))}
    </>
  )
}

function Hedge({ x0, z0, x1, z1, h = 1.0, y = CURB, seed = 1 }) {
  const ref = useRef()
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2e5a2a', roughness: 0.96 }), [])
  const geo = useMemo(() => { const g = new THREE.IcosahedronGeometry(1, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + Math.sin(p.getX(i) * 12.3 + p.getY(i) * 7.1) * 0.12; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k) } g.computeVertexNormals(); return g }, [])
  const list = useMemo(() => {
    const out = []
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.floor(len / 0.42))
    let sd = seed * 977
    const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647 }
    for (let i = 0; i <= n; i++) for (let r = 0; r < 2; r++) {
      const t = i / n
      out.push([x0 + (x1 - x0) * t + (rnd() - 0.5) * 0.15, y + h * (0.35 + rnd() * 0.25) + r * h * 0.2, z0 + (z1 - z0) * t + (rnd() - 0.5) * 0.15, 0.42 + rnd() * 0.1, h * 0.5 + rnd() * 0.1])
    }
    return out
  }, [x0, z0, x1, z1, h, seed])
  useEffect(() => {
    const o = new THREE.Object3D(), c = new THREE.Color()
    list.forEach(([x, yy, z, r, hh], i) => { o.position.set(x, yy, z); o.scale.set(r, hh, r); o.rotation.set(0, i, 0); o.updateMatrix(); ref.current.setMatrixAt(i, o.matrix); c.setHSL(0.28 + (i % 7) * 0.006, 0.45, 0.15 + (i % 5) * 0.012); ref.current.setColorAt(i, c) })
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [list])
  return <instancedMesh ref={ref} args={[geo, mat, list.length]} castShadow receiveShadow />
}

function Topiary({ position, r = 0.5 }) {
  const m = mats()
  return (
    <group position={position}>
      <mesh position={[0, 0.4, 0]} material={m.planter} castShadow><cylinderGeometry args={[0.42, 0.34, 0.8, 16]} /></mesh>
      <mesh position={[0, 0.82, 0]} material={m.soil}><cylinderGeometry args={[0.38, 0.38, 0.04, 16]} /></mesh>
      <mesh position={[0, 1.0, 0]} material={m.trunk}><cylinderGeometry args={[0.03, 0.04, 0.5, 6]} /></mesh>
      <mesh position={[0, 1.55, 0]} material={m.leaf} castShadow><sphereGeometry args={[r, 18, 14]} /></mesh>
    </group>
  )
}

function StepRails() {
  const m = mats()
  const L = Math.hypot(STEPS.zFront - PORTICO.z1, STEPS.rise * STEPS.n)
  const ang = Math.atan2(STEPS.rise * STEPS.n, STEPS.zFront - PORTICO.z1)
  const zMid = (STEPS.zFront + PORTICO.z1) / 2
  return (
    <>
      {[STEPS.x0 + 0.08, STEPS.x1 - 0.08].map((x) => (
        <group key={x} position={[x, CURB + 0.375 + 0.45, zMid]} rotation={[ang, 0, 0]}>
          <mesh material={m.iron}><boxGeometry args={[0.05, 0.05, L]} /></mesh>
          <mesh position={[0, -0.4, 0]} material={m.iron}><boxGeometry args={[0.04, 0.04, L]} /></mesh>
          {Array.from({ length: Math.floor(L / 0.28) }, (_, i) => <mesh key={i} position={[0, -0.2, -L / 2 + 0.14 + i * 0.28]} material={m.iron}><boxGeometry args={[0.025, 0.4, 0.025]} /></mesh>)}
        </group>
      ))}
    </>
  )
}

function Drapes({ x, z, yaw, half, bottom, top, color = '#4a1c70' }) {
  const m = mats()
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide }), [color])
  return (
    <group position={[x, 0, z]} rotation={[0, yaw, 0]} userData={{ noBatch: true }}>
      <mesh position={[0, top + 0.12, 0.2]} material={m.brass}><cylinderGeometry args={[0.025, 0.025, half * 2 + 0.9, 8]} /></mesh>
      {[-1, 1].map((sd) => (
        <group key={sd}>
          {[0, 1, 2].map((k) => <mesh key={k} position={[sd * (half + 0.12 + k * 0.17), (bottom + top) / 2, 0.22 + (k % 2) * 0.05]} material={mat}><boxGeometry args={[0.2, top - bottom + 0.1, 0.1]} /></mesh>)}
        </group>
      ))}
    </group>
  )
}

function Baseboards() {
  const m = mats()
  // foyer side walls: segments that skip the cased openings into the wings
  const segs = [[-85.6, -77.0], [-74.0, -66.6], [-63.4, -60.4]]
  return (
    <>
      {[FOYER.x0 + 0.24, FOYER.x1 - 0.24].map((x) => segs.map(([a, b], i) => (
        <group key={x + '_' + i}>
          <mesh position={[x, Y + 0.14, (a + b) / 2]} material={m.limeWhite}><boxGeometry args={[0.06, 0.28, b - a]} /></mesh>
          <mesh position={[x, Y + 1.15, (a + b) / 2]} material={m.limeWhite}><boxGeometry args={[0.07, 0.08, b - a]} /></mesh>
          {(() => {
            const cnt = Math.max(1, Math.floor((b - a) / 1.3)), w = (b - a) / cnt
            return Array.from({ length: cnt }, (_, k) => <mesh key={k} position={[x - Math.sign(x - CX) * 0.02, Y + 0.68, a + w * (k + 0.5)]} material={m.limeWhite}><boxGeometry args={[0.03, 0.66, w - 0.22]} /></mesh>)
          })()}
        </group>
      )))}
    </>
  )
}

/** From a distance the rooms are hidden, so each window gets a dark interior with a warm night glow instead of a see-through house. */
const WINDOWS = [
  ...[83.4, 88.6, 109.4, 114.6].map((at) => ({ wall: 'n', at, half: 1.15, sill: 0.9, top: 5.2 })),
  ...[94.9, 103.1].map((at) => ({ wall: 'n', at, half: 0.85, sill: 1.0, top: 4.9 })),
  ...[84, 88.4, 110.5, 114.4].map((at) => ({ wall: 's', at, half: 1.15, sill: 0.9, top: 5.2 })),
  ...[-65.5, -72.3, -79.5].flatMap((at) => [{ wall: 'w', at, half: 1.15, sill: 0.9, top: 5.2 }, { wall: 'e', at, half: 1.15, sill: 0.9, top: 5.2 }]),
]
function WindowBackdrops() {
  const ref = useRef()
  const { camera } = useThree()
  const mat = useMemo(() => nightLit(new THREE.MeshStandardMaterial({ color: '#2a2230', emissive: '#ffb066', roughness: 1, side: THREE.DoubleSide }), 1.1, 0.03), [])
  useFrame(() => {
    const c = camera.position, pad = 9
    const inside = c.x > HOUSE.x0 - pad && c.x < HOUSE.x1 + pad && c.z > HOUSE.z0 - pad && c.z < PORTICO.z1 + pad
    if (ref.current) ref.current.visible = !inside
  })
  const { x0, x1, z0, z1 } = HOUSE
  return (
    <group ref={ref} userData={{ noBatch: true }}>
      {WINDOWS.map((w, i) => {
        const cfg = { n: [w.at, z1 - 0.55, 0], s: [w.at, z0 + 0.55, Math.PI], w: [x0 + 0.55, w.at, -Math.PI / 2], e: [x1 - 0.55, w.at, Math.PI / 2] }[w.wall]
        return <mesh key={i} position={[cfg[0], Y + (w.sill + w.top) / 2, cfg[1]]} rotation={[0, cfg[2], 0]} material={mat}><planeGeometry args={[w.half * 2, w.top - w.sill]} /></mesh>
      })}
    </group>
  )
}

function Shell() {
  const m = mats()
  const { x0, x1, z0, z1 } = HOUSE
  const wing = (a, b) => ({ x0: a, x1: b, z0, z1 })
  const winsZ = (zs, extra = {}) => zs.map((at) => ({ at, half: 1.15, glass: true, sill: 0.9, h: 5.2, ...extra }))
  return (
    <>
      {/* plinth */}
      <Block position={[(x0 + x1) / 2, CURB + 0.45, (z0 + z1) / 2]} size={[x1 - x0 + 0.8, 0.9, z1 - z0 + 0.8]} material={m.stoneFine} />
      {/* ---- exterior walls ---- */}
      <Wall side="n" rect={wing(x0, FOYER.x0)} h={H_WING} y={Y} ext={m.extWall} int={m.musicWall} openings={winsZ([83.4, 88.6])} />
      <Wall side="n" rect={wing(FOYER.x1, x1)} h={H_WING} y={Y} ext={m.extWall} int={m.diningWall} openings={winsZ([109.4, 114.6])} />
      <Wall side="n" rect={wing(FOYER.x0, FOYER.x1)} h={H_MAIN} y={Y} ext={m.extWall} int={m.foyerWall}
        openings={[{ at: 94.9, half: 0.85, glass: true, sill: 1.0, h: 4.9 }, { at: CX, half: 1.75, h: 3.6 }, { at: 103.1, half: 0.85, glass: true, sill: 1.0, h: 4.9 }]} />
      <Wall side="s" rect={wing(x0, FOYER.x0)} h={H_WING} y={Y} ext={m.extWall} int={m.musicWall} openings={winsZ([84, 88.4])} />
      <Wall side="s" rect={wing(FOYER.x1, x1)} h={H_WING} y={Y} ext={m.extWall} int={m.diningWall} openings={winsZ([110.5, 114.4])} />
      <Wall side="s" rect={wing(FOYER.x0, FOYER.x1)} h={H_MAIN} y={Y} ext={m.extWall} int={m.foyerWall}
        openings={[{ at: CX, half: 2.4, glass: true, sill: 5.3, h: 9.0 }]} />
      <Wall side="w" rect={HOUSE} h={H_WING} y={Y} ext={m.extWall} int={m.musicWall} openings={winsZ([-65.5, -72.3, -79.5])} />
      <Wall side="e" rect={HOUSE} h={H_WING} y={Y} ext={m.extWall} int={m.diningWall} openings={winsZ([-65.5, -72.3, -79.5])} />
      {/* ---- foyer partitions (double height, cased openings into the wings, clerestory windows above the wing roofs) ---- */}
      <Wall side="e" rect={{ x0: x0, x1: FOYER.x0 + 0.2, z0, z1 }} h={H_MAIN} y={Y} ext={m.foyerWall} int={m.musicWall}
        openings={[{ at: -80.5, half: 1.8, glass: true, sill: 6.8, h: 9.2 }, { at: -75.5, half: 1.5, h: 4.4 }, { at: -70, half: 1.8, glass: true, sill: 6.8, h: 9.2 }, { at: -65, half: 1.5, h: 4.4 }]} />
      <Wall side="w" rect={{ x0: FOYER.x1 - 0.2, x1: x1, z0, z1 }} h={H_MAIN} y={Y} ext={m.foyerWall} int={m.diningWall}
        openings={[{ at: -80.5, half: 1.8, glass: true, sill: 6.8, h: 9.2 }, { at: -75.5, half: 1.5, h: 4.4 }, { at: -70, half: 1.8, glass: true, sill: 6.8, h: 9.2 }, { at: -65, half: 1.5, h: 4.4 }]} />
      {/* ---- roofs ---- */}
      <Block position={[(x0 + FOYER.x0) / 2, Y + H_WING + 0.25, (z0 + z1) / 2]} size={[FOYER.x0 - x0 + 0.8, 0.5, z1 - z0 + 0.8]} material={m.ceiling} />
      <Block position={[(x1 + FOYER.x1) / 2, Y + H_WING + 0.25, (z0 + z1) / 2]} size={[x1 - FOYER.x1 + 0.8, 0.5, z1 - z0 + 0.8]} material={m.ceiling} />
      <Block position={[CX, Y + H_MAIN + 0.25, (z0 + z1) / 2]} size={[FOYER.x1 - FOYER.x0 + 0.8, 0.5, z1 - z0 + 0.8]} material={m.ceiling} />
      {[[(x0 + FOYER.x0) / 2, FOYER.x0 - x0 + 0.6, H_WING], [(x1 + FOYER.x1) / 2, x1 - FOYER.x1 + 0.6, H_WING], [CX, FOYER.x1 - FOYER.x0 + 0.6, H_MAIN]].map(([cx, w, h]) => (
        <mesh key={cx} position={[cx, Y + h + 0.53, (z0 + z1) / 2]} material={m.slate} receiveShadow><boxGeometry args={[w, 0.06, z1 - z0 + 0.6]} /></mesh>
      ))}
      {[[84.5, -64], [113.5, -82]].map(([cx, cz]) => (
        <group key={cx}>
          <mesh position={[cx, Y + H_WING + 1.5, cz]} material={m.extWall} castShadow><boxGeometry args={[1.4, 2.2, 1.4]} /></mesh>
          <mesh position={[cx, Y + H_WING + 2.65, cz]} material={m.stoneFine}><boxGeometry args={[1.7, 0.2, 1.7]} /></mesh>
        </group>
      ))}
      <Cornice x0={x0 - 0.2} x1={FOYER.x0} z0={z0 - 0.2} z1={z1 + 0.2} y={Y + H_WING + 0.2} />
      <Cornice x0={FOYER.x1} x1={x1 + 0.2} z0={z0 - 0.2} z1={z1 + 0.2} y={Y + H_WING + 0.2} />
      <Cornice x0={FOYER.x0 + 0.4} x1={FOYER.x1 - 0.4} z0={z0 - 0.2} z1={z1 + 0.2} y={Y + H_MAIN + 0.2} />
      {/* realism: window casings and shutters, quoins, base + string courses, roof balustrade */}
      {[83.4, 88.6, 109.4, 114.6].map((x) => <WindowTrim key={'n' + x} wall="n" at={x} half={1.15} sill={0.9} top={5.2} />)}
      {[94.9, 103.1].map((x) => <WindowTrim key={'n' + x} wall="n" at={x} half={0.85} sill={1.0} top={4.9} shutters={false} />)}
      {[84, 88.4].map((x) => <WindowTrim key={'s' + x} wall="s" at={x} half={1.15} sill={0.9} top={5.2} />)}
      {[110.5, 114.4].map((x) => <WindowTrim key={'s' + x} wall="s" at={x} half={1.15} sill={0.9} top={5.2} />)}
      {[-65.5, -72.3, -79.5].map((z) => <WindowTrim key={'w' + z} wall="w" at={z} half={1.15} sill={0.9} top={5.2} />)}
      {[-65.5, -72.3, -79.5].map((z) => <WindowTrim key={'e' + z} wall="e" at={z} half={1.15} sill={0.9} top={5.2} />)}
      <Quoins />
      <Cornice x0={x0} x1={x1} z0={z0} z1={z1} y={Y + 0.2} h={0.4} o={0.36} mat={m.quoin} />
      <Cornice x0={x0} x1={FOYER.x0} z0={z0} z1={z1} y={Y + 5.75} h={0.22} o={0.3} />
      <Cornice x0={FOYER.x1} x1={x1} z0={z0} z1={z1} y={Y + 5.75} h={0.22} o={0.3} />
      <RoofRail segs={[
        [x0 - 0.1, z1 + 0.1, FOYER.x0 - 0.1, z1 + 0.1, Y + H_WING + 0.53], [x0 - 0.1, z0 - 0.1, FOYER.x0 - 0.1, z0 - 0.1, Y + H_WING + 0.53], [x0 - 0.1, z0 - 0.1, x0 - 0.1, z1 + 0.1, Y + H_WING + 0.53],
        [FOYER.x1 + 0.1, z1 + 0.1, x1 + 0.1, z1 + 0.1, Y + H_WING + 0.53], [FOYER.x1 + 0.1, z0 - 0.1, x1 + 0.1, z0 - 0.1, Y + H_WING + 0.53], [x1 + 0.1, z0 - 0.1, x1 + 0.1, z1 + 0.1, Y + H_WING + 0.53],
        [FOYER.x0 + 0.5, z1 + 0.1, FOYER.x1 - 0.5, z1 + 0.1, Y + H_MAIN + 0.53], [FOYER.x0 + 0.5, z0 - 0.1, FOYER.x1 - 0.5, z0 - 0.1, Y + H_MAIN + 0.53],
      ]} />
      {[[84.5, -64], [113.5, -82]].map(([cx, cz]) => [[-0.4, -0.4], [0.4, 0.4], [-0.4, 0.4], [0.4, -0.4]].map(([dx, dz], i) => (
        <mesh key={cx + '_' + i} position={[cx + dx, Y + H_WING + 2.95, cz + dz]} material={m.planter}><cylinderGeometry args={[0.1, 0.12, 0.34, 8]} /></mesh>
      )))}
      <WindowBackdrops />
      <FrontDoors />
      <Portico />
      <StepRails />
      <Topiary position={[PORTICO.x0 + 0.7, Y, PORTICO.z1 - 0.6]} />
      <Topiary position={[PORTICO.x1 - 0.7, Y, PORTICO.z1 - 0.6]} />
      <Topiary position={[96.0, Y, PORTICO.z1 - 0.5]} r={0.4} />
      <Topiary position={[102.0, Y, PORTICO.z1 - 0.5]} r={0.4} />
    </>
  )
}

/* ------------------------------------------------------------------ foyer */
function Stairs() {
  const m = mats()
  const { x0, x1, zStart, rise, run, n } = STAIR
  const w = x1 - x0, cx = (x0 + x1) / 2
  const slope = Math.atan2(rise * n, run * n)
  const L = Math.hypot(rise * n, run * n)
  const zMid = zStart - (run * n) / 2
  const yMid = Y + 0.2 + rise * n / 2 + 0.5
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const k = i + 1, top = rise * k
        return (
          <group key={k}>
            <RigidBody type="fixed" colliders={false}>
              <CuboidCollider args={[w / 2, top / 2, run / 2]} position={[cx, Y + top / 2, zStart - (k - 0.5) * run]} />
              {/* tall invisible side guards so nobody slips off the stair edge */}
              <CuboidCollider args={[0.13, (top + 1.2) / 2, run / 2]} position={[x0, Y + (top + 1.2) / 2, zStart - (k - 0.5) * run]} />
              <CuboidCollider args={[0.13, (top + 1.2) / 2, run / 2]} position={[x1, Y + (top + 1.2) / 2, zStart - (k - 0.5) * run]} />
            </RigidBody>
            <mesh position={[cx, Y + top / 2, zStart - (k - 0.5) * run]} material={m.marbleWhite} castShadow receiveShadow><boxGeometry args={[w, top, run]} /></mesh>
            {/* purple runner */}
            <mesh position={[cx, Y + top / 2 + 0.006, zStart - (k - 0.5) * run + 0.005]} material={m.carpet}><boxGeometry args={[2.4, top + 0.012, run + 0.01]} /></mesh>
          </group>
        )
      })}
      {[x0, x1].map((x) => (
        <group key={x} position={[x, 0, zMid]} rotation={[slope, 0, 0]}>
          <group position={[0, yMid, 0]}>
            <mesh material={m.marbleWhite} castShadow><boxGeometry args={[0.26, 1.0, L]} /></mesh>
            <mesh position={[0, 0.54, 0]} material={m.brass}><boxGeometry args={[0.2, 0.07, L + 0.05]} /></mesh>
          </group>
        </group>
      ))}
    </>
  )
}

function Balusters({ x0, x1, z, y }) {
  const m = mats()
  const ref = useRef()
  const n = Math.floor((x1 - x0) / 0.22)
  useEffect(() => {
    const o = new THREE.Object3D()
    for (let i = 0; i < n; i++) { o.position.set(x0 + 0.11 + i * 0.22, y + 0.5, z); o.updateMatrix(); ref.current.setMatrixAt(i, o.matrix) }
    ref.current.instanceMatrix.needsUpdate = true
  }, [x0, x1, z, y, n])
  return (
    <>
      <instancedMesh ref={ref} args={[null, m.iron, n]} frustumCulled={false}><boxGeometry args={[0.03, 0.9, 0.03]} /></instancedMesh>
      <mesh position={[(x0 + x1) / 2, y + 1.0, z]} material={m.brass}><boxGeometry args={[x1 - x0, 0.07, 0.12]} /></mesh>
      <mesh position={[(x0 + x1) / 2, y + 0.05, z]} material={m.brass}><boxGeometry args={[x1 - x0, 0.06, 0.1]} /></mesh>
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[(x1 - x0) / 2, 0.6, 0.06]} position={[(x0 + x1) / 2, y + 0.6, z]} /></RigidBody>
    </>
  )
}

function Foyer() {
  const m = mats()
  const zc = (HOUSE.z0 + HOUSE.z1) / 2
  const pw = FOYER.x1 - FOYER.x0 - 0.4
  return (
    <>
      <mesh position={[CX, Y + 0.004, zc]} rotation={[-Math.PI / 2, 0, 0]} material={signatureMarble(7, 13)} receiveShadow>
        <planeGeometry args={[pw, HOUSE.z1 - HOUSE.z0 - 0.4]} />
      </mesh>
      {/* runner carpet from the doors to the stair */}
      <mesh position={[CX, Y + 0.012, -64.8]} rotation={[-Math.PI / 2, 0, 0]} material={m.carpet}><planeGeometry args={[2.4, 9.2]} /></mesh>
      <Stairs />
      <Baseboards />
      <Drapes x={CX} z={HOUSE.z0 + 0.45} yaw={0} half={2.4} bottom={Y + 5.1} top={Y + 9.2} color="#5a2490" />
      {/* gallery */}
      <Block position={[CX, GALLERY.y - 0.2, (GALLERY.z0 + GALLERY.z1) / 2]} size={[pw, 0.4, GALLERY.z1 - GALLERY.z0 - 0.2]} material={m.marbleWhite} />
      <mesh position={[CX, GALLERY.y + 0.004, (GALLERY.z0 + GALLERY.z1) / 2 - 0.1]} rotation={[-Math.PI / 2, 0, 0]} material={signatureMarble(5, 1.4)}>
        <planeGeometry args={[pw - 0.1, GALLERY.z1 - GALLERY.z0 - 0.5]} />
      </mesh>
      <Balusters x0={FOYER.x0 + 0.2} x1={STAIR.x0 - 0.15} z={GALLERY.z1 - 0.06} y={GALLERY.y} />
      <Balusters x0={STAIR.x1 + 0.15} x1={FOYER.x1 - 0.2} z={GALLERY.z1 - 0.06} y={GALLERY.y} />
      {/* crown moulding */}
      {[[CX, Y + H_MAIN - 0.2, FOYER.x0 + 0.5, 0.3, 26, true], [CX, Y + H_MAIN - 0.2, FOYER.x1 - 0.5, 0.3, 26, true]].map(([, y, x, t, len], i) => (
        <mesh key={i} position={[x, y, zc]} material={m.brass}><boxGeometry args={[0.16, 0.3, len - 0.4]} /></mesh>
      ))}
      <Chandelier position={[CX, Y + H_MAIN - 0.05, -69.5]} type="crystal" size={3.0} drop={3.2} intensity={34} zone={ZONE} watts={420} />
      <Chandelier position={[CX, Y + H_MAIN - 0.05, -63.4]} type="gold" size={1.1} drop={1.2} intensity={16} zone={ZONE} watts={180} />
      <CeilingLight position={[CX, Y + H_MAIN - 0.02, -83]} size={[5, 1]} intensity={16} zone={ZONE} color="#ffd9a6" />
      <CeilingLight position={[CX, Y + 4.55, -84]} size={[8, 0.6]} intensity={10} zone={ZONE} color="#ffd9a6" />
      <LightAnchor position={[CX, Y + 7.5, -84.4]} color="#8f7bff" intensity={20} distance={12} night range={50} />
      {/* wall art */}
      <Painting position={[FOYER.x0 + 0.3, Y + 3.5, -70]} yaw={Math.PI / 2} w={2.0} h={2.7} seed={0} />
      <Painting position={[FOYER.x1 - 0.3, Y + 3.5, -70]} yaw={-Math.PI / 2} w={2.0} h={2.7} seed={2} />
      <Painting position={[FOYER.x0 + 0.3, Y + 3.4, -80.5]} yaw={Math.PI / 2} w={1.6} h={2.2} seed={3} />
      <Painting position={[FOYER.x1 - 0.3, Y + 3.4, -80.5]} yaw={-Math.PI / 2} w={1.6} h={2.2} seed={1} />
      {/* consoles with vases */}
      {[[FOYER.x0 + 0.65, Math.PI / 2], [FOYER.x1 - 0.65, -Math.PI / 2]].map(([x, yaw]) => (
        <group key={x}>
          <Table position={[x, Y, -70]} yaw={yaw} size={[0.5, 2.2]} height={0.85} top="marble" />
          <mesh position={[x, Y + 1.25, -70]} material={m.brass}><cylinderGeometry args={[0.1, 0.16, 0.8, 16]} /></mesh>
          <mesh position={[x, Y + 1.85, -70]} material={m.flame}><sphereGeometry args={[0.07, 8, 8]} /></mesh>
        </group>
      ))}
      <Plant position={[FOYER.x0 + 0.9, Y, -61.5]} scale={1.5} />
      <Plant position={[FOYER.x1 - 0.9, Y, -61.5]} scale={1.5} />
      <Plant position={[FOYER.x0 + 0.9, Y, -84.8]} scale={1.5} />
      <Plant position={[FOYER.x1 - 0.9, Y, -84.8]} scale={1.5} />
      <Plant position={[FOYER.x0 + 0.8, GALLERY.y, -85]} scale={1.2} />
      <Plant position={[FOYER.x1 - 0.8, GALLERY.y, -85]} scale={1.2} />
    </>
  )
}

/* ------------------------------------------------------------------ music room */
function PianoKeys() {
  const mat = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 128
    const g = c.getContext('2d')
    g.fillStyle = '#f4efe6'; g.fillRect(0, 0, 1024, 128)
    g.strokeStyle = '#8a8478'; g.lineWidth = 2
    const wk = 1024 / 52
    for (let i = 0; i <= 52; i++) { g.beginPath(); g.moveTo(i * wk, 0); g.lineTo(i * wk, 128); g.stroke() }
    g.fillStyle = '#0c0c0f'
    for (let i = 0; i < 52; i++) { const o = i % 7; if (o === 1 || o === 4 || o === 0 || o === 3 || o === 5) { if (o === 0 && i === 0) { /* A0 has a black key too */ } g.fillRect((i + 1) * wk - wk * 0.3, 0, wk * 0.6, 78) } }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.35 })
  }, [])
  return <mesh position={[0, 0.745, 0.99]} rotation={[-Math.PI / 2, 0, 0]} material={mat}><planeGeometry args={[1.42, 0.2]} /></mesh>
}

/** A grand piano built from an extruded outline. Keyboard faces local +z. */
function GrandPiano({ position, yaw = 0 }) {
  const m = mats()
  const outline = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-0.75, 0); s.lineTo(0.75, 0); s.lineTo(0.75, 1.2)
    s.bezierCurveTo(0.7, 1.95, 0.4, 2.2, 0.08, 2.25)
    s.bezierCurveTo(-0.35, 2.0, -0.75, 1.7, -0.75, 1.0)
    s.lineTo(-0.75, 0)
    return s
  }, [])
  const body = useMemo(() => { const g = new THREE.ExtrudeGeometry(outline, { depth: 0.3, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.015, bevelSegments: 2 }); g.rotateX(-Math.PI / 2); return g }, [outline])
  const lid = useMemo(() => { const g = new THREE.ExtrudeGeometry(outline, { depth: 0.035, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(-0.75, 0, 0); return g }, [outline])
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.78, 0.5, 1.1]} position={[0, 0.5, -0.2]} />
      </RigidBody>
      <group position={[0, 0, 0.85]}>
        <mesh geometry={body} position={[0, 0.72, 0]} rotation={[0, 0, 0]} material={m.piano} castShadow>{/* shape y -> -z */}</mesh>
        <group position={[0.75, 1.02, 0]} rotation={[0, 0, -0.62]}>
          <mesh geometry={lid} material={m.piano} castShadow />
        </group>
        <mesh position={[0.74, 1.06, -0.3]} rotation={[0, 0, -0.1]} material={m.piano}><cylinderGeometry args={[0.012, 0.012, 0.55, 6]} /></mesh>
        <PianoKeys />
        <mesh position={[0, 0.78, 0.9]} material={m.piano}><boxGeometry args={[1.46, 0.08, 0.04]} /></mesh>
        {[[-0.68, 0.0], [0.68, 0.0], [0.0, -2.0]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.36, z + (i === 2 ? 0.3 : 0.15)]} material={m.piano} castShadow><cylinderGeometry args={[0.045, 0.06, 0.74, 10]} /></mesh>
        ))}
        <mesh position={[0, 0.12, 0.4]} material={m.brass}><boxGeometry args={[0.6, 0.04, 0.16]} /></mesh>
      </group>
    </group>
  )
}

function Fireplace({ x, z, yaw }) {
  const m = mats()
  const fm = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ff9a2e', emissive: '#ff6a10', emissiveIntensity: 2.8, toneMapped: false }), [])
  useFrame(({ clock }) => { fm.emissiveIntensity = 2.6 + Math.sin(clock.elapsedTime * 13) * 0.5 + Math.sin(clock.elapsedTime * 5.3) * 0.4 })
  return (
    <group position={[x, Y, z]} rotation={[0, yaw, 0]}>
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[1.6, 1.3, 0.4]} position={[0, 1.3, 0.3]} /></RigidBody>
      <mesh position={[0, 1.3, 0.3]} material={m.stoneFine} castShadow><boxGeometry args={[3.2, 2.6, 0.7]} /></mesh>
      <mesh position={[0, 1.0, 0.66]} material={m.iron}><boxGeometry args={[1.7, 1.2, 0.05]} /></mesh>
      <mesh position={[0, 2.68, 0.38]} material={m.brass}><boxGeometry args={[3.5, 0.12, 0.9]} /></mesh>
      <mesh position={[0, 0.5, 0.68]} material={fm}><coneGeometry args={[0.35, 0.65, 6]} /></mesh>
      <mesh position={[0.35, 0.4, 0.68]} material={fm}><coneGeometry args={[0.22, 0.45, 6]} /></mesh>
      <mesh position={[-0.35, 0.38, 0.68]} material={fm}><coneGeometry args={[0.2, 0.4, 6]} /></mesh>
    </group>
  )
}

function MusicRoom() {
  const m = mats()
  const x0 = HOUSE.x0 + 0.4, x1 = FOYER.x0 - 0.2, z0 = HOUSE.z0 + 0.4, z1 = HOUSE.z1 - 0.4
  return (
    <>
      <mesh position={[(x0 + x1) / 2, Y + 0.004, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={surface('wood', 4, 8)} receiveShadow><planeGeometry args={[x1 - x0, z1 - z0]} /></mesh>
      <Rug position={[85.4, Y + 0.02, -66]} size={[5.5, 4.2]} color="#5a2a7c" />
      <Rug position={[85.6, Y + 0.02, -77]} size={[3.6, 3.8]} color="#2a2a44" />
      <GrandPiano position={[85.4, Y, -77.6]} yaw={Math.PI / 2} />
      <Stool position={[87.3, Y, -77.4]} color="#2a1a14" />
      <Fireplace x={HOUSE.x0 + 0.5} z={-66} yaw={Math.PI / 2} />
      <LightAnchor position={[82.4, Y + 1.2, -66]} color="#ff9a4a" intensity={14} distance={9} range={40} />
      <Sofa position={[88.4, Y, -66]} yaw={-Math.PI / 2} length={2.8} color="#4a2a6a" />
      <Chair position={[85.4, Y, -62.6]} yaw={Math.PI} color="#6a3a8a" />
      <Chair position={[85.4, Y, -69.4]} yaw={0} color="#6a3a8a" />
      <Shelf position={[HOUSE.x0 + 0.9, Y, -72.4]} yaw={Math.PI / 2} width={2.4} height={3.4} />
      <Shelf position={[HOUSE.x0 + 0.9, Y, -82.2]} yaw={Math.PI / 2} width={2.4} height={3.4} />
      <Painting position={[86, Y + 3.5, HOUSE.z0 + 0.5]} yaw={0} w={2.4} h={1.8} seed={0} />
      <Painting position={[90.2, Y + 3.4, -63]} yaw={-Math.PI / 2 + 0.0} w={1.4} h={1.9} seed={2} />
      <Plant position={[90.8, Y, -84.8]} scale={1.4} />
      <Plant position={[81.2, Y, -61.2]} scale={1.4} />
      <Chandelier position={[85.5, Y + H_WING - 0.05, -69]} type="gold" size={1.2} drop={1.3} intensity={22} zone={ZONE} watts={200} />
      <Chandelier position={[85.5, Y + H_WING - 0.05, -79]} type="gold" size={1.0} drop={1.1} intensity={18} zone={ZONE} watts={160} />
      <mesh position={[(x0 + x1) / 2, Y + H_WING - 0.01, (z0 + z1) / 2]} rotation={[Math.PI / 2, 0, 0]} material={m.ceiling}><planeGeometry args={[x1 - x0, z1 - z0]} /></mesh>
    </>
  )
}

/* ------------------------------------------------------------------ dining hall */
function Candelabra({ position }) {
  const m = mats()
  return (
    <group position={position}>
      <mesh position={[0, 0.22, 0]} material={m.brass}><cylinderGeometry args={[0.02, 0.05, 0.44, 8]} /></mesh>
      <mesh position={[0, 0.02, 0]} material={m.brass}><cylinderGeometry args={[0.1, 0.12, 0.04, 12]} /></mesh>
      {[-0.1, 0, 0.1].map((dx) => (
        <group key={dx}>
          <mesh position={[dx, 0.47 - Math.abs(dx) * 0.5, 0]} material={m.marbleWhite}><cylinderGeometry args={[0.014, 0.014, 0.1, 6]} /></mesh>
          <mesh position={[dx, 0.55 - Math.abs(dx) * 0.5, 0]} material={m.flame}><sphereGeometry args={[0.02, 6, 6]} /></mesh>
        </group>
      ))}
      <LightAnchor position={[position[0], position[1] + 0.6, position[2]]} color="#ffb870" intensity={5} distance={5} range={30} />
    </group>
  )
}

function DiningHall() {
  const m = mats()
  const x0 = FOYER.x1 + 0.2, x1 = HOUSE.x1 - 0.4, z0 = HOUSE.z0 + 0.4, z1 = HOUSE.z1 - 0.4
  const tx = 112, tz = -73.4
  const side = [-3.4, -1.7, 0, 1.7, 3.4]
  return (
    <>
      <mesh position={[(x0 + x1) / 2, Y + 0.004, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={blackMarble('#c9a96a', 5, 10)} receiveShadow><planeGeometry args={[x1 - x0, z1 - z0]} /></mesh>
      <Rug position={[tx, Y + 0.02, tz]} size={[5.4, 10]} color="#4a1626" />
      <Table position={[tx, Y, tz]} size={[1.9, 8]} height={0.76} top="wood" />
      {side.map((dz) => (
        <group key={dz}>
          <Chair position={[tx - 1.45, Y, tz + dz]} yaw={Math.PI / 2} color="#2a1a3a" />
          <Chair position={[tx + 1.45, Y, tz + dz]} yaw={-Math.PI / 2} color="#2a1a3a" />
        </group>
      ))}
      <Chair position={[tx, Y, tz - 4.5]} yaw={0} color="#5a1f9a" />
      <Chair position={[tx, Y, tz + 4.5]} yaw={Math.PI} color="#5a1f9a" />
      {[-2.8, 0, 2.8].map((dz) => <Candelabra key={dz} position={[tx, Y + 0.76, tz + dz]} />)}
      {[-1.4, 1.4].map((dz) => <mesh key={dz} position={[tx, Y + 0.78, tz + dz]} material={m.brass}><cylinderGeometry args={[0.2, 0.14, 0.02, 20]} /></mesh>)}
      <Counter position={[HOUSE.x1 - 1.0, Y, -73]} yaw={-Math.PI / 2} length={6} height={0.95} depth={0.7} top="marble" />
      <Painting position={[HOUSE.x1 - 0.5, Y + 3.3, -73]} yaw={-Math.PI / 2} w={3.0} h={2.0} seed={3} />
      <Painting position={[116.4, Y + 3.2, -85.5]} yaw={0} w={1.6} h={2.2} seed={1} />
      <Painting position={[108.2, Y + 3.3, -63]} yaw={Math.PI / 2} w={1.4} h={1.9} seed={0} />
      <Plant position={[107.2, Y, -61.4]} scale={1.4} />
      <Plant position={[117, Y, -84.6]} scale={1.4} />
      <Chandelier position={[tx, Y + H_WING - 0.05, -69.5]} type="gold" size={1.3} drop={1.3} intensity={22} zone={ZONE} watts={220} />
      <Chandelier position={[tx, Y + H_WING - 0.05, -77]} type="gold" size={1.3} drop={1.3} intensity={22} zone={ZONE} watts={220} />
      <mesh position={[(x0 + x1) / 2, Y + H_WING - 0.01, (z0 + z1) / 2]} rotation={[Math.PI / 2, 0, 0]} material={m.ceiling}><planeGeometry args={[x1 - x0, z1 - z0]} /></mesh>
    </>
  )
}

/* ------------------------------------------------------------------ grounds */
function Fence({ x0, x1, z }) {
  const m = mats()
  const ref = useRef()
  const n = Math.floor((x1 - x0) / 0.24)
  useEffect(() => {
    const o = new THREE.Object3D()
    for (let i = 0; i < n; i++) { o.position.set(x0 + 0.12 + i * 0.24, CURB + 0.95, z); o.updateMatrix(); ref.current.setMatrixAt(i, o.matrix) }
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [x0, x1, z, n])
  return (
    <>
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[(x1 - x0) / 2, 1, 0.1]} position={[(x0 + x1) / 2, CURB + 1, z]} /></RigidBody>
      <instancedMesh ref={ref} args={[null, m.iron, n]}><boxGeometry args={[0.035, 1.9, 0.035]} /></instancedMesh>
      {[0.25, 1.85].map((h) => <mesh key={h} position={[(x0 + x1) / 2, CURB + h, z]} material={m.iron}><boxGeometry args={[x1 - x0, 0.06, 0.06]} /></mesh>)}
    </>
  )
}

function Pillar({ x }) {
  const m = mats()
  return (
    <group>
      <Block position={[x, CURB + 1.7, GATE_Z]} size={[0.95, 3.4, 0.95]} material={m.stoneFine} />
      <mesh position={[x, CURB + 3.5, GATE_Z]} material={m.stoneFine}><boxGeometry args={[1.15, 0.2, 1.15]} /></mesh>
      <mesh position={[x, CURB + 3.95, GATE_Z]} material={m.lantern}><boxGeometry args={[0.5, 0.7, 0.5]} /></mesh>
      <mesh position={[x, CURB + 4.4, GATE_Z]} material={m.iron}><coneGeometry args={[0.38, 0.35, 4]} /></mesh>
      <LightAnchor position={[x, CURB + 3.9, GATE_Z + 0.7]} color="#ffd9a0" intensity={14} distance={12} night range={50} />
    </group>
  )
}

function Grounds() {
  const m = mats()
  const trees = useMemo(() => [
    [80, CURB, -42, 1.1], [118, CURB, -42, 1.1], [84, CURB, -53, 1.2], [114, CURB, -53, 1.2], [79, CURB, -64, 1.3], [119.5, CURB, -64, 1.3],
    [78.5, CURB, -78, 1.3], [120, CURB, -78, 1.3], [84, CURB, -93, 1.4], [92, CURB, -95, 1.3], [106, CURB, -95, 1.3], [114, CURB, -93, 1.4], [99, CURB, -97, 1.5],
    [88, CURB, -91, 1.0], [110, CURB, -91, 1.0],
  ], [])
  return (
    <>
      <Lawn x0={77} x1={121} z0={-100} z1={-36.6} y={CURB} skip={[[87.6, 110.4, -54, -36], [93, 105, -37.2, -33], [HOUSE.x0 - 1, HOUSE.x1 + 1, HOUSE.z0 - 1, HOUSE.z1 + 0.5], [PORTICO.x0 - 0.5, PORTICO.x1 + 0.5, PORTICO.z0, STEPS.zFront + 0.5]]} />
      {/* court of pavers from the gate to the steps */}
      <mesh position={[99, CURB + 0.016, (-53.5 - 37.2) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={m.pavers} receiveShadow><planeGeometry args={[22, 16.3]} /></mesh>
      <mesh position={[99, CURB + 0.017, (-37.2 - 33.9) / 2 - 0.0]} rotation={[-Math.PI / 2, 0, 0]} material={m.pavers} receiveShadow><planeGeometry args={[10, 3.3]} /></mesh>
      {/* gold inlay ring */}
      <mesh position={[99, CURB + 0.03, -45.5]} rotation={[-Math.PI / 2, 0, 0]} userData={{ noBatch: true }}><ringGeometry args={[4.1, 4.3, 48]} /><meshStandardMaterial color="#c9a35a" metalness={0.9} roughness={0.35} polygonOffset polygonOffsetFactor={-2} /></mesh>
      <Fountain position={[90.2, CURB, -46]} radius={2.2} />
      <Fountain position={[107.8, CURB, -46]} radius={2.2} />
      {/* fence + gate */}
      <Fence x0={ESTATE_X0} x1={93.5} z={GATE_Z} />
      <Fence x0={104.5} x1={ESTATE_X1} z={GATE_Z} />
      <Pillar x={93.4} />
      <Pillar x={104.6} />
      {/* gate leaves swung open */}
      {[[-1, 93.9], [1, 104.1]].map(([s, x]) => (
        <group key={x} position={[x, CURB, GATE_Z]} rotation={[0, s * 1.35, 0]}>
          <mesh position={[s * 1.9, 1.1, 0]} material={m.iron}><boxGeometry args={[3.8, 2.0, 0.05]} /></mesh>
          {[-1.6, -0.8, 0, 0.8, 1.6].map((dx) => <mesh key={dx} position={[s * 1.9 + dx, 1.1, 0]} material={m.brass}><boxGeometry args={[0.04, 1.8, 0.06]} /></mesh>)}
        </group>
      ))}
      {/* side fences and hedges */}
      <FlowerBed x={86} z={-43} w={8} d={3} seed={3} />
      <FlowerBed x={112} z={-43} w={8} d={3} seed={5} />
      <FlowerBed x={87.5} z={-56.5} w={5} d={3} seed={7} />
      <FlowerBed x={110.5} z={-56.5} w={5} d={3} seed={9} />
      {/* clipped hedges: along the fence, the foundation and the estate edges */}
      <Hedge x0={78.2} z0={GATE_Z + 1.2} x1={92.2} z1={GATE_Z + 1.2} h={1.1} seed={1} />
      <Hedge x0={106} z0={GATE_Z + 1.2} x1={120} z1={GATE_Z + 1.2} h={1.1} seed={2} />
      <Hedge x0={80.4} z0={-58.9} x1={90} z1={-58.9} h={0.85} seed={3} />
      <Hedge x0={108} z0={-58.9} x1={117.6} z1={-58.9} h={0.85} seed={4} />
      <Hedge x0={77.8} z0={-38.5} x1={77.8} z1={-98} h={1.5} seed={5} />
      <Hedge x0={120.2} z0={-38.5} x1={120.2} z1={-98} h={1.5} seed={6} />
      <Hedge x0={78} z0={-99.4} x1={120} z1={-99.4} h={1.7} seed={7} />
      {/* court kerbs */}
      {[[88, -45.25, 0.3, 16.5], [110, -45.25, 0.3, 16.5]].map(([x, z, w, d]) => <mesh key={x} position={[x, CURB + 0.06, z]} material={m.stoneFine} receiveShadow><boxGeometry args={[w, 0.14, d]} /></mesh>)}
      <Trees trees={trees} />
      {[[92, -40.5], [106, -40.5], [92, -51], [106, -51]].map(([x, z]) => <StreetLamp key={x + '_' + z} position={[x, CURB, z]} height={4.6} />)}
      {/* back terrace lights */}
      <LightAnchor position={[99, 3, -90]} color="#9d8cff" intensity={18} distance={16} night range={60} />
    </>
  )
}
const ESTATE_X0 = 77, ESTATE_X1 = 121

/* ------------------------------------------------------------------ cinematic triggers */
function Triggers() {
  useEffect(() => {
    const mk = (id, x, y, z, r) => registerInteractable(id, {
      position: new THREE.Vector3(x, y, z), radius: r,
      label: () => 'Watch: “Stay” — Trinity & Zion duet (cinematic)',
      onInteract: () => startCine(),
    })
    const offs = [mk('mansion-cine-gate', 99, CURB + 1, GATE_Z + 2.2, 3.4), mk('mansion-cine-foyer', 99, Y + 1, -63.5, 3.2)]
    return () => offs.forEach((o) => o())
  }, [])
  return null
}

export default function Mansion() {
  return (
    <>
      <Shell />
      <Grounds />
      <Triggers />
      <Gate x0={HOUSE.x0} x1={HOUSE.x1} z0={HOUSE.z0} z1={PORTICO.z1} pad={9}>
        <Foyer />
        <MusicRoom />
        <DiningHall />
      </Gate>
    </>
  )
}
