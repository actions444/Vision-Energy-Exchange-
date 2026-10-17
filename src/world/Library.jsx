import { useEffect, useMemo, useRef } from 'react'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface } from './materials.js'
import { Chair, Table, Counter, Rug, Plant, CeilingLight, PendantLight } from './furniture.jsx'
import { BrandSign } from './signs.jsx'
import { RoomSign } from './Justice.jsx'
import { DoubleDoor } from './Door.jsx'
import { RenovatedShell, KitBlock } from './facade/Renovated.jsx'
import { facadeMats } from './facade/materials.js'
import { signatureMarble } from './materials.js'
import { Wall, Gate, Block } from './jobkit.jsx'
import { Trees, Lawn, Bench, StreetLamp, FlowerBed, LightAnchor } from './props.jsx'
import { nightLit } from '../state/environment.js'
import { LIB, LIB_H, LIB_DOOR_Z, LIB_ZONE, CURB, STATIONS, BOARD_SIDE, patronSeat, READING, READ_SEATS, STACK_X, STACK_ROWS, STACK_SIGNS, AISLES, STORY, PROJECTS, TEACHERS } from '../config/library.js'

// ============================================================================
// VISION STORMS PUBLIC LIBRARY
// A single-storey civic library in the south-west block. Front door on the avenue side (east) under a
// portico; inside: circulation desk, stacks, reading room, four project tables (Project Lab), the Story
// Circle for children, a community wall. The teachers and visitors are in LibraryPeople.jsx.
// ============================================================================

const CEIL = 5.4
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  return t
}

let M
function mats() {
  if (M) return M
  M = {
    brick: surface('brick', 14, 3.2, { color: '#b9836a' }),
    plaster: surface('plaster', 6, 2, { color: '#efe7d8' }),
    stone: surface('limestone', 3, 2, { color: '#e4dccb' }),
    roof: new THREE.MeshStandardMaterial({ color: '#4b4540', roughness: 0.7 }),
    wood: surface('wood', 12, 8, { color: '#a67c52' }),
    woodDark: new THREE.MeshStandardMaterial({ color: '#5b3d27', roughness: 0.6 }),
    ceiling: new THREE.MeshStandardMaterial({ color: '#f3efe6', roughness: 0.9 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#bcd7e6', roughness: 0.05, transparent: true, opacity: 0.2, depthWrite: false }),
    white: new THREE.MeshStandardMaterial({ color: '#f5f5f2', roughness: 0.5 }),
    steel: new THREE.MeshStandardMaterial({ color: '#8d9298', roughness: 0.35, metalness: 0.8 }),
    black: new THREE.MeshStandardMaterial({ color: '#202124', roughness: 0.5 }),
    brass: new THREE.MeshStandardMaterial({ color: '#c9a24a', roughness: 0.35, metalness: 0.8 }),
    paper: new THREE.MeshStandardMaterial({ color: '#f1ede2', roughness: 0.9 }),
    lampShade: nightLit(new THREE.MeshStandardMaterial({ color: '#fff0d0', emissive: '#ffcf8a', emissiveIntensity: 0.9, roughness: 0.8 }), 1.2, 0.5),
  }
  return M
}

/** An NPC-only chair (same height as a real one, but it does not offer a Sit button). */
export function NpcChair({ position, yaw = 0, color = '#5b6b7a' }) {
  const fabric = useMemo(() => getMaterials().fabric(color), [color])
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.44, 0.02]} material={fabric} castShadow><boxGeometry args={[0.48, 0.07, 0.46]} /></mesh>
      <mesh position={[0, 0.74, -0.2]} rotation={[-0.08, 0, 0]} material={fabric} castShadow><boxGeometry args={[0.46, 0.5, 0.06]} /></mesh>
      {[[-0.2, 0.2], [0.2, 0.2], [-0.2, -0.18], [0.2, -0.18]].map(([x, z], i) => <mesh key={i} position={[x, 0.2, z]} material={mats().steel}><cylinderGeometry args={[0.015, 0.015, 0.4, 6]} /></mesh>)}
    </group>
  )
}

/** A floor cushion for the Story Circle. */
function Pouf({ position, color }) {
  return (
    <mesh position={[position[0], position[1] + 0.14, position[2]]} castShadow receiveShadow>
      <cylinderGeometry args={[0.3, 0.32, 0.28, 20]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  )
}

/** All the bookshelf rows in one go: boards, uprights, backs and ~10 000 book spines in two instanced meshes. */
function Stacks() {
  const frame = useRef(), books = useRef()
  const L = STACK_X[1] - STACK_X[0], cx = (STACK_X[0] + STACK_X[1]) / 2
  const BAYS = 7, BAY = L / BAYS
  const H = 2.7
  const LEVELS = [0.12, 0.62, 1.12, 1.62, 2.12]
  const parts = useMemo(() => {
    const p = [] // [x, y, z, sx, sy, sz] in world space
    for (const [z, yaw] of STACK_ROWS) {
      const s = Math.cos(yaw) // +1 faces north, -1 faces south
      const W = (lx, y, lz, sx, sy, sz) => p.push([cx + s * lx, CURB + y, z + s * lz, sx, sy, sz])
      W(0, H / 2, -0.18, L, H, 0.04) // back
      for (let b = 0; b <= BAYS; b++) W(-L / 2 + b * BAY, H / 2, 0, 0.04, H, 0.4) // uprights
      for (const y of [...LEVELS, H]) W(0, y - 0.02, 0, L, 0.035, 0.4) // boards
    }
    return p
  }, [])
  const spines = useMemo(() => {
    const out = []
    let n = 0
    for (const [z, yaw] of STACK_ROWS) {
      const s = Math.cos(yaw)
      for (const lv of LEVELS) {
        let x = -L / 2 + 0.06
        while (x < L / 2 - 0.1) {
          const w = 0.03 + hash(n * 3.1) * 0.05, h = 0.2 + hash(n * 5.7) * 0.15, d = 0.2 + hash(n * 2.3) * 0.06
          n++
          if (hash(n * 9.1) < 0.045) { x += 0.12; continue } // gaps
          const lean = hash(n * 4.4) < 0.04 ? 0.18 : 0
          out.push({ x: cx + s * (x + w / 2), y: CURB + lv + 0.02 + h / 2, z: z + s * 0.04, w, h, d, lean: lean * s, hue: hash(n * 1.7), l: 0.3 + hash(n * 6.3) * 0.25, sat: 0.3 + hash(n * 8.8) * 0.3 })
          x += w + 0.004
        }
      }
    }
    return out
  }, [])
  useEffect(() => {
    const o = new THREE.Object3D(), c = new THREE.Color()
    parts.forEach(([x, y, z, sx, sy, sz], i) => { o.position.set(x, y, z); o.rotation.set(0, 0, 0); o.scale.set(sx, sy, sz); o.updateMatrix(); frame.current.setMatrixAt(i, o.matrix) })
    frame.current.instanceMatrix.needsUpdate = true
    spines.forEach((b, i) => {
      o.position.set(b.x, b.y, b.z); o.rotation.set(0, 0, b.lean); o.scale.set(b.w, b.h, b.d); o.updateMatrix(); books.current.setMatrixAt(i, o.matrix)
      c.setHSL(b.hue, b.sat, b.l); books.current.setColorAt(i, c)
    })
    books.current.instanceMatrix.needsUpdate = true
    books.current.instanceColor.needsUpdate = true
    frame.current.computeBoundingSphere(); books.current.computeBoundingSphere()
  }, [parts, spines])
  const woodDark = mats().woodDark
  return (
    <group>
      <instancedMesh ref={frame} args={[null, woodDark, parts.length]} castShadow receiveShadow frustumCulled={false}><boxGeometry args={[1, 1, 1]} /></instancedMesh>
      <instancedMesh ref={books} args={[null, null, spines.length]} frustumCulled={false}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial roughness={0.75} /></instancedMesh>
      <RigidBody type="fixed" colliders={false}>
        {STACK_ROWS.map(([z], i) => <CuboidCollider key={i} args={[L / 2, H / 2, 0.22]} position={[cx, CURB + H / 2, z]} />)}
      </RigidBody>
    </group>
  )
}

function Whiteboard({ station, project, position, yaw = Math.PI }) {
  const tex = useMemo(() => canvasTex(640, 400, (g, w, h) => {
    g.fillStyle = '#f7f7f4'; g.fillRect(0, 0, w, h)
    g.fillStyle = '#1d3a6b'; g.fillRect(0, 0, w, 62)
    g.fillStyle = '#fff'; g.font = '700 34px sans-serif'; g.textBaseline = 'middle'; g.fillText(station.name.toUpperCase(), 22, 32)
    g.fillStyle = '#c0392b'; g.font = '600 25px sans-serif'; g.textBaseline = 'alphabetic'; g.fillText('Today: ' + project.title, 22, 100)
    g.fillStyle = '#233'; g.font = '22px sans-serif'
    project.steps.forEach((s, i) => g.fillText(`${i + 1}. ${s[0]}`, 26, 146 + i * 42))
    g.strokeStyle = '#2a6fd0'; g.lineWidth = 3; g.beginPath(); g.moveTo(26, 360); g.bezierCurveTo(140, 330, 240, 392, 340, 356); g.stroke()
  }), [station.id])
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 1.55, 0]} material={mats().steel}><boxGeometry args={[2.05, 1.32, 0.04]} /></mesh>
      <mesh position={[0, 1.55, 0.025]}><planeGeometry args={[1.97, 1.24]} /><meshStandardMaterial map={tex} roughness={0.4} /></mesh>
      {[-0.9, 0.9].map((x) => <mesh key={x} position={[x, 0.45, -0.05]} material={mats().steel}><boxGeometry args={[0.05, 0.9, 0.05]} /></mesh>)}
      <mesh position={[0, 0.82, -0.05]} material={mats().steel}><boxGeometry args={[2.0, 0.04, 0.1]} /></mesh>
    </group>
  )
}

/** Small props that tell you what each project table is for. All positions are relative to the table top centre. */
function TableProps({ id, position }) {
  const m = mats()
  const top = 0.78
  const screen = useMemo(() => id === 'code' ? canvasTex(256, 160, (g, w, h) => {
    g.fillStyle = '#10151f'; g.fillRect(0, 0, w, h)
    const cols = ['#7ee787', '#79c0ff', '#ffa657', '#d2a8ff']
    for (let i = 0; i < 9; i++) { g.fillStyle = cols[i % 4]; g.fillRect(14 + (i % 3) * 14, 14 + i * 14, 40 + ((i * 53) % 110), 6) }
    g.fillStyle = '#ffd33d'; g.fillRect(190, 90, 26, 26)
  }) : null, [id])
  const screenMat = useMemo(() => screen && new THREE.MeshStandardMaterial({ map: screen, emissive: '#ffffff', emissiveMap: screen, emissiveIntensity: 0.55 }), [screen])
  if (id === 'writing') return (
    <group position={position}>
      {[-1.2, 0, 1.2].map((x, i) => <mesh key={i} position={[x, top + 0.012, 0.1]} rotation={[0, (i - 1) * 0.18, 0]} material={m.paper}><boxGeometry args={[0.5, 0.025, 0.36]} /></mesh>)}
      <mesh position={[0.65, top + 0.05, -0.28]} material={m.woodDark}><cylinderGeometry args={[0.06, 0.06, 0.1, 12]} /></mesh>
      {[0, 1, 2].map((i) => <mesh key={i} position={[0.65 + (i - 1) * 0.02, top + 0.16, -0.28]} rotation={[0, 0, (i - 1) * 0.2]}><cylinderGeometry args={[0.006, 0.006, 0.14, 6]} /><meshStandardMaterial color={['#c0392b', '#2a6fd0', '#2f855a'][i]} /></mesh>)}
      <mesh position={[-0.55, top + 0.05, -0.25]} material={m.paper}><boxGeometry args={[0.32, 0.08, 0.24]} /></mesh>
    </group>
  )
  if (id === 'maker') return (
    <group position={position}>
      <mesh position={[-0.9, top + 0.14, 0]} rotation={[-0.5, 0.2, 0]}><boxGeometry args={[0.5, 0.025, 0.36]} /><meshStandardMaterial color="#1c3f8f" roughness={0.3} metalness={0.4} /></mesh>
      <mesh position={[-0.3, top + 0.02, 0.1]}><boxGeometry args={[0.42, 0.03, 0.16]} /><meshStandardMaterial color="#e9e4d6" roughness={0.6} /></mesh>
      {['#e53e3e', '#38a169', '#3182ce', '#ecc94b'].map((c, i) => <mesh key={c} position={[-0.42 + i * 0.1, top + 0.06, 0.1]}><sphereGeometry args={[0.022, 10, 8]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.6} /></mesh>)}
      <mesh position={[0.5, top + 0.1, -0.1]} material={m.steel}><boxGeometry args={[0.24, 0.2, 0.2]} /></mesh>
      <mesh position={[0.5, top + 0.26, -0.1]} material={m.steel}><cylinderGeometry args={[0.02, 0.02, 0.14, 8]} /></mesh>
      <mesh position={[1.05, top + 0.03, 0.15]} material={m.black}><boxGeometry args={[0.3, 0.05, 0.14]} /></mesh>
    </group>
  )
  if (id === 'art') return (
    <group position={position}>
      {['#d1495b', '#edae49', '#00798c', '#30638e', '#66a182'].map((c, i) => <mesh key={c} position={[-1.2 + i * 0.28, top + 0.012, 0.15 - (i % 2) * 0.12]}><cylinderGeometry args={[0.07, 0.07, 0.02, 14]} /><meshStandardMaterial color={c} roughness={0.5} /></mesh>)}
      <mesh position={[0.6, top + 0.012, 0.05]} rotation={[0, 0.3, 0]}><boxGeometry args={[0.5, 0.02, 0.38]} /><meshStandardMaterial color="#e9d9b5" roughness={0.9} /></mesh>
      <mesh position={[1.1, top + 0.012, 0.2]}><boxGeometry args={[0.28, 0.02, 0.22]} /><meshStandardMaterial color="#9ec5a8" roughness={0.9} /></mesh>
      <mesh position={[0.0, top + 0.07, -0.3]} material={m.woodDark}><cylinderGeometry args={[0.07, 0.06, 0.14, 12]} /></mesh>
    </group>
  )
  // code
  return (
    <group position={position}>
      {[-0.95, 0.15].map((x, i) => (
        <group key={i} position={[x, top, 0.1]} rotation={[0, i ? -0.15 : 0.12, 0]}>
          <mesh position={[0, 0.01, 0]} material={m.steel}><boxGeometry args={[0.42, 0.02, 0.3]} /></mesh>
          <mesh position={[0, 0.16, -0.14]} rotation={[-0.2, 0, 0]} material={m.steel}><boxGeometry args={[0.42, 0.3, 0.015]} /></mesh>
          <mesh position={[0, 0.163, -0.131]} rotation={[-0.2, 0, 0]} material={screenMat}><planeGeometry args={[0.38, 0.26]} /></mesh>
        </group>
      ))}
      <mesh position={[1.1, top + 0.38, -0.2]} material={m.black}><boxGeometry args={[0.7, 0.42, 0.03]} /></mesh>
      <mesh position={[1.1, top + 0.38, -0.183]} material={screenMat}><planeGeometry args={[0.66, 0.38]} /></mesh>
      <mesh position={[1.1, top + 0.1, -0.2]} material={m.black}><boxGeometry args={[0.06, 0.2, 0.06]} /></mesh>
      <mesh position={[0.65, top + 0.08, 0.25]}><sphereGeometry args={[0.045, 10, 8]} /><meshStandardMaterial color="#ffd33d" roughness={0.4} /></mesh>
    </group>
  )
}

function ReadingTable({ t, size, i }) {
  const m = mats()
  const [x, z] = t
  return (
    <group>
      <Table position={[x, CURB, z]} size={size} height={0.76} />
      {[-1.35, 0, 1.35].map((dx) => (
        <group key={dx}>
          <Chair position={[x + dx, CURB, z - 1.0]} yaw={0} color="#7a5a3c" />
          <Chair position={[x + dx, CURB, z + 1.0]} yaw={Math.PI} color="#7a5a3c" />
        </group>
      ))}
      {[-1.2, 1.2].map((dx) => (
        <group key={dx} position={[x + dx, CURB + 0.76, z]}>
          <mesh position={[0, 0.02, 0]} material={m.brass}><cylinderGeometry args={[0.1, 0.12, 0.04, 14]} /></mesh>
          <mesh position={[0, 0.2, 0]} material={m.brass}><cylinderGeometry args={[0.012, 0.012, 0.36, 6]} /></mesh>
          <mesh position={[0, 0.4, 0]} material={m.lampShade}><cylinderGeometry args={[0.1, 0.17, 0.2, 16, 1, true]} /></mesh>
        </group>
      ))}
      <PendantLight position={[x, CURB + CEIL, z]} drop={1.2} zone={LIB_ZONE} />
    </group>
  )
}

function Interior() {
  const m = mats()
  const B = LIB
  const W = B.x1 - B.x0, D = B.z1 - B.z0, cx = (B.x0 + B.x1) / 2, cz = (B.z0 + B.z1) / 2
  const floor = useMemo(() => surface('wood', W / 4, D / 4, { color: '#c9a273', roughness: 0.45 }), [])
  const ST = Object.values(STATIONS)
  const projOf = (stId) => PROJECTS[TEACHERS.find((t) => t.station === stId)?.project]
  const lights = useMemo(() => {
    const out = []
    for (const z of AISLES) for (const x of [-87, -81]) out.push([x, z])
    for (const x of [-70, -63, -56]) out.push([x, -66])
    for (const x of [-69, -62, -55]) for (const z of [-49]) out.push([x, z])
    out.push([-52, -62], [-52, -48], [-84, -44], [-79, -44], [-72, -42.5], [-52, -42.5])
    return out
  }, [])
  return (
    <group>
      {/* floor and ceiling */}
      <mesh position={[cx, CURB + 0.002, cz]} rotation={[-Math.PI / 2, 0, 0]} material={floor} receiveShadow><planeGeometry args={[W - 0.8, D - 0.8]} /></mesh>
      <mesh position={[cx, CURB + CEIL + 0.02, cz]} rotation={[Math.PI / 2, 0, 0]} material={m.ceiling}><planeGeometry args={[W - 0.8, D - 0.8]} /></mesh>
      {lights.map(([x, z], i) => <CeilingLight key={i} position={[x, CURB + CEIL, z]} size={[1.6, 0.6]} intensity={13} distance={10} zone={LIB_ZONE} />)}

      {/* circulation desk near the door */}
      <Counter position={[-53.2, CURB, -63.8]} yaw={Math.PI / 2} length={5.6} depth={0.8} top="wood" face="#7b5434" />
      <mesh position={[-53.2, CURB + 1.13, -63.8]} material={m.black}><boxGeometry args={[0.16, 0.04, 0.5]} /></mesh>
      <RoomSign text="CHECK-OUT" position={[-52.3, CURB + 3.2, -63.8]} rotation={[0, Math.PI / 2, 0]} width={2.8} color="#4a3320" glow="#ffd9a6" />
      {/* a small card catalogue / new arrivals stand opposite the desk */}
      <Counter position={[-52.6, CURB, -52.0]} yaw={Math.PI / 2} length={3.2} depth={0.7} top="wood" face="#7b5434" />
      <RoomSign text="NEW ARRIVALS" position={[-51.8, CURB + 2.5, -52.0]} rotation={[0, Math.PI / 2, 0]} width={2.6} color="#4a3320" glow="#ffd9a6" />
      {[0, 1, 2, 3, 4, 5].map((i) => <mesh key={i} position={[-52.6 + (i % 2) * 0.1, CURB + 1.1 + 0.05 + (i >> 1) * 0.0, -53.2 + i * 0.5]} rotation={[0, i * 0.4, 0]}><boxGeometry args={[0.2, 0.03, 0.28]} /><meshStandardMaterial color={['#c0392b', '#2a6fd0', '#2f855a', '#d69e2e', '#6b46c1', '#dd6b20'][i]} /></mesh>)}

      {/* stacks */}
      <Stacks />
      {STACK_SIGNS.map((t, i) => {
        const z = AISLES[i]
        return (
          <group key={t}>
            <mesh position={[-76.2, CURB + 3.5, z]} material={m.black}><boxGeometry args={[0.1, 0.7, 2.4]} /></mesh>
            <BrandSign text={t} position={[-76.14, CURB + 3.5, z]} rotation={[0, Math.PI / 2, 0]} width={2.3} color="#f4f1ea" glow="#ffe9c4" size={110} />
            <mesh position={[-76.2, CURB + 4.25, z]} material={m.steel}><boxGeometry args={[0.02, 1.4, 0.02]} /></mesh>
          </group>
        )
      })}

      {/* reading room along the south windows */}
      {READING.map((r, i) => <ReadingTable key={i} {...r} i={i} />)}
      {READ_SEATS.map(([x, z, yaw], i) => <NpcChair key={'rs' + i} position={[x, CURB, z]} yaw={yaw} color="#7a5a3c" />)}
      <RoomSign text="READING ROOM" position={[-63, CURB + 4.3, -74.9]} width={4.6} color="#4a3320" glow="#ffd9a6" />
      <Rug position={[-63, CURB, -70.5]} size={[17, 4.6]} color="#7a6350" />
      {[[-73.5, -74.6], [-51.5, -74.6]].map(([x, z]) => <Plant key={x} position={[x, CURB, z]} scale={1.3} kind="fiddle" />)}

      {/* project lab: four tables, each with a board, props, seats */}
      <RoomSign text="PROJECT LAB" position={[-62.5, CURB + 4.3, -40.9]} rotation={[0, Math.PI, 0]} width={4.6} color="#1d3a6b" glow="#8fb6ff" />
      <Rug position={[-62.5, CURB, -49]} size={[20, 13.5]} color="#456080" />
      {ST.map((s) => {
        const [tx, tz] = s.t
        const proj = projOf(s.id)
        return (
          <group key={s.id}>
            <Table position={[tx, CURB, tz]} size={s.size} height={0.78} />
            <TableProps id={s.id} position={[tx, CURB, tz]} />
            {[0, 1.2].map((dx) => <Chair key={dx} position={[tx + dx, CURB, tz - 1.0]} yaw={0} color="#3d5a80" />)}
            <NpcChair position={[patronSeat(s)[0], CURB, patronSeat(s)[1]]} yaw={0} color="#3d5a80" />
            {proj && <Whiteboard station={s} project={proj} position={[tx + BOARD_SIDE[s.id] * 3.2, CURB, tz + 0.9]} yaw={-BOARD_SIDE[s.id] * Math.PI / 2} />}
            <mesh position={[tx, CURB + 3.4, tz]} material={m.steel}><boxGeometry args={[0.02, CEIL - 3.4, 0.02]} /></mesh>
            <mesh position={[tx, CURB + 3.4, tz]} material={m.black}><boxGeometry args={[2.8, 0.55, 0.08]} /></mesh>
            <BrandSign text={s.name.toUpperCase()} position={[tx, CURB + 3.4, tz - 0.05]} rotation={[0, Math.PI, 0]} width={2.7} color="#f4f1ea" glow="#cfe0ff" size={96} />
            <BrandSign text={s.name.toUpperCase()} position={[tx, CURB + 3.4, tz + 0.05]} width={2.7} color="#f4f1ea" glow="#cfe0ff" size={96} />
          </group>
        )
      })}
      {/* an easel with a canvas at the Art Studio */}
      <group position={[-73.4, CURB, -47.0]} rotation={[0, 0.9, 0]}>
        {[-0.3, 0.3].map((x) => <mesh key={x} position={[x, 0.85, 0]} rotation={[0, 0, x * -0.5]} material={m.woodDark}><boxGeometry args={[0.05, 1.7, 0.05]} /></mesh>)}
        <mesh position={[0, 1.15, 0.12]}><boxGeometry args={[0.8, 0.6, 0.03]} /><meshStandardMaterial color="#e7d3a4" roughness={0.9} /></mesh>
        <mesh position={[-0.12, 1.2, 0.14]}><planeGeometry args={[0.3, 0.24]} /><meshStandardMaterial color="#3a86c8" /></mesh>
        <mesh position={[0.16, 1.1, 0.14]}><planeGeometry args={[0.22, 0.3]} /><meshStandardMaterial color="#e07a5f" /></mesh>
      </group>

      {/* story circle */}
      <RoomSign text="STORY CIRCLE" position={[-84.5, CURB + 3.7, -41.0]} rotation={[0, Math.PI, 0]} width={3.6} color="#2f5d5a" glow="#bff0d4" />
      <Rug position={[(STORY.x0 + STORY.x1) / 2 - 0.5, CURB, -44.2]} size={[11, 4.6]} color="#2f6f73" />
      <Rug position={[(STORY.x0 + STORY.x1) / 2 - 0.5, CURB + 0.003, -44.2]} size={[6.4, 3.2]} color="#e0a83a" />
      {['#e76f51', '#2a9d8f', '#e9c46a', '#8ab17d', '#6d597a', '#f4a261', '#457b9d', '#b56576'].map((c, i) => <Pouf key={i} position={[-88.2 + (i % 4) * 1.5, CURB, -45.4 + Math.floor(i / 4) * 1.6]} color={c} />)}
      {[-90, -88.4, -86.8, -85.2, -83.6, -82.0].map((x, i) => (
        <group key={x} position={[x, CURB, -41.3]}>
          <mesh position={[0, 0.45, 0]}><boxGeometry args={[1.5, 0.9, 0.32]} /><meshStandardMaterial color={['#e76f51', '#2a9d8f', '#e9c46a', '#457b9d', '#8ab17d', '#b56576'][i]} roughness={0.7} /></mesh>
          {[0, 1, 2, 3, 4, 5, 6].map((b) => <mesh key={b} position={[-0.6 + b * 0.2, 0.62, 0.17]}><boxGeometry args={[0.07, 0.3, 0.1]} /><meshStandardMaterial color={`hsl(${(b * 53 + i * 31) % 360},55%,52%)`} /></mesh>)}
        </group>
      ))}
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[5.4, 0.45, 0.2]} position={[-86, CURB + 0.45, -41.3]} /></RigidBody>
      {/* reading chair for the storyteller (NPC) */}
      <NpcChair position={[-80.2, CURB, -44.3]} yaw={-Math.PI / 2} color="#8a5a3c" />

      {/* community wall at the entrance side */}
      <CommunityWall />
      <Plant position={[-49.6, CURB, -41.2]} scale={1.4} kind="areca" />
      <Plant position={[-49.6, CURB, -74.6]} scale={1.4} kind="fiddle" />
    </group>
  )
}

function CommunityWall() {
  const tex = useMemo(() => canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#f2ece0'; g.fillRect(0, 0, w, h)
    const cols = ['#e76f51', '#2a9d8f', '#e9c46a', '#457b9d', '#8ab17d', '#6d597a', '#f4a261', '#b56576']
    for (let i = 0; i < 12; i++) {
      const x = 14 + i * 82, y = 18 + hash(i * 3.3) * 40
      g.fillStyle = '#fffdf6'; g.fillRect(x, y, 68, 90); g.strokeStyle = '#c8bfae'; g.strokeRect(x, y, 68, 90)
      g.fillStyle = cols[i % 8]; g.fillRect(x + 8, y + 8, 52, 40)
      g.fillStyle = cols[(i + 3) % 8]; g.beginPath(); g.arc(x + 20, y + 28, 12, 0, 7); g.fill()
      g.fillStyle = '#9a917f'; g.fillRect(x + 8, y + 56, 40, 4); g.fillRect(x + 8, y + 66, 30, 4)
    }
    g.fillStyle = '#3a3126'; g.font = '700 30px Georgia, serif'; g.textAlign = 'center'; g.fillText('COMMUNITY WALL: finished projects live here', w / 2, 224)
  }), [])
  return (
    <group position={[LIB.x1 - 0.44, CURB + 2.5, -45]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh><planeGeometry args={[7, 1.75]} /><meshStandardMaterial map={tex} roughness={0.8} /></mesh>
    </group>
  )
}

const LIB_SPEC = {
  x0: LIB.x0, x1: LIB.x1, z0: LIB.z0, z1: LIB.z1, h: LIB_H + 0.9, ih: LIB_H, base: CURB, facing: '+x', wall: 'brick', seed: 7,
  door: { at: LIB_DOOR_Z, half: 1.2, h: 2.8 },
  groundWindows: [{ at: -70, half: 3.0, v0: 0.1, v1: 4.8 }, { at: -46.5, half: 2.6, v0: 0.1, v1: 4.8 }],
  openings: {
    '-z': [-82, -74, -66, -58, -50].map((at) => ({ at, half: 2.2, v0: 0.9, v1: 4.6 })),
    '+z': [-82, -74, -66, -58, -50].map((at) => ({ at, half: 2.2, v0: 0.9, v1: 4.6 })),
  },
}

export default function Library() {
  const m = mats()
  const B = LIB
  const W = B.x1 - B.x0, D = B.z1 - B.z0, cx = (B.x0 + B.x1) / 2, cz = (B.z0 + B.z1) / 2
  const rect = { x0: B.x0, x1: B.x1, z0: B.z0, z1: B.z1 }
  const trees = useMemo(() => [[-44, CURB, -44, 1.1], [-44, CURB, -72, 1.05], [-36, CURB, -48, 1.2], [-36, CURB, -68, 1.15], [-28, CURB, -42, 1.0], [-28, CURB, -74, 1.0]], [])
  return (
    <group>
      {/* shell: colliders from the Wall pieces, visuals from the renovation kit */}
      <Wall side="s" rect={rect} h={LIB_H} t={0.4} ext={m.brick} int={m.plaster} y={CURB} invisible
        openings={[-82, -74, -66, -58, -50].map((at) => ({ at, half: 2.2, glass: true, h: 4.6, sill: 0.9 }))} />
      <Wall side="n" rect={rect} h={LIB_H} t={0.4} ext={m.brick} int={m.plaster} y={CURB} invisible
        openings={[-82, -74, -66, -58, -50].map((at) => ({ at, half: 2.2, glass: true, h: 4.6, sill: 0.9 }))} />
      <Wall side="w" rect={rect} h={LIB_H} t={0.4} ext={m.brick} int={m.plaster} y={CURB} invisible />
      <Wall side="e" rect={rect} h={LIB_H} t={0.4} ext={m.brick} int={m.plaster} y={CURB} invisible
        openings={[{ at: -70, half: 3.0, glass: true, h: 4.8, sill: 0.1 }, { at: LIB_DOOR_Z, half: 1.2, h: 2.8 }, { at: -46.5, half: 2.6, glass: true, h: 4.8, sill: 0.1 }]} />
      <RenovatedShell spec={LIB_SPEC} />
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[(W + 1.2) / 2, 0.45, (D + 1.2) / 2]} position={[cx, CURB + LIB_H + 0.45, cz]} /></RigidBody>
      {/* entrance bay: taller stone tower with the sign, portico canopy and columns (renovated: cut stone, cornice, marble sign panel) */}
      {/* the tower is built around the doorway: two piers, and a lintel block over the door */}
      <KitBlock position={[B.x1 + 0.5, CURB + 4.9, LIB_DOOR_Z - 4.25]} size={[1.4, 9.8, 5.5]} mat="stoneWall" />
      <KitBlock position={[B.x1 + 0.5, CURB + 4.9, LIB_DOOR_Z + 4.25]} size={[1.4, 9.8, 5.5]} mat="stoneWall" />
      <KitBlock position={[B.x1 + 0.5, CURB + 6.6, LIB_DOOR_Z]} size={[1.4, 6.4, 3.0]} mat="stoneWall" />
      <KitBlock position={[B.x1 + 0.6, CURB + 3.35, LIB_DOOR_Z]} size={[1.6, 0.18, 3.4]} mat="granite" collide={false} />
      <KitBlock position={[B.x1 + 0.62, CURB + 9.95, LIB_DOOR_Z]} size={[1.8, 0.3, 14.6]} mat="stone" collide={false} />
      <KitBlock position={[B.x1 + 0.7, CURB + 9.7, LIB_DOOR_Z]} size={[1.6, 0.2, 14.2]} mat="stone" collide={false} />
      {[-1, 1].map((k) => <KitBlock key={k} position={[B.x1 + 1.28, CURB + 4.9, LIB_DOOR_Z + k * 6.95]} size={[0.25, 9.6, 0.5]} mat="stone" collide={false} />)}
      <KitBlock position={[B.x1 + 3.2, CURB + 4.6, LIB_DOOR_Z]} size={[5.6, 0.35, 10]} mat="stoneWall" collide={false} />
      <KitBlock position={[B.x1 + 3.2, CURB + 4.84, LIB_DOOR_Z]} size={[5.8, 0.12, 10.2]} mat="stone" collide={false} />
      <mesh position={[B.x1 + 3.2, CURB + 4.41, LIB_DOOR_Z]} rotation={[Math.PI / 2, 0, 0]} material={facadeMats().bronze}><planeGeometry args={[5.4, 9.8]} /></mesh>
      {[-1.8, -0.6, 0.6, 1.8].flatMap((dx) => [-3.2, 0, 3.2].map((dz) => <mesh key={dx + ':' + dz} position={[B.x1 + 3.2 + dx * 0.9, CURB + 4.4, LIB_DOOR_Z + dz]} material={facadeMats().lamp}><cylinderGeometry args={[0.08, 0.08, 0.02, 12]} /></mesh>))}
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[2.8, 0.2, 5]} position={[B.x1 + 3.2, CURB + 4.6, LIB_DOOR_Z]} /></RigidBody>
      {[-5.4 + LIB_DOOR_Z + 0.4, 4.6 + LIB_DOOR_Z].map((z) => (
        <group key={z}>
          <KitBlock position={[B.x1 + 5.6, CURB + 2.3, z]} size={[0.5, 4.6, 0.5]} mat="stone" />
          <KitBlock position={[B.x1 + 5.6, CURB + 0.2, z]} size={[0.74, 0.4, 0.74]} mat="granite" collide={false} />
          <KitBlock position={[B.x1 + 5.6, CURB + 4.4, z]} size={[0.7, 0.24, 0.7]} mat="stone" collide={false} />
        </group>
      ))}
      <mesh position={[B.x1 + 1.2, CURB + 6.8, LIB_DOOR_Z]} rotation={[0, Math.PI / 2, 0]} material={signatureMarble(3, 1)}><boxGeometry args={[11.6, 2.8, 0.14]} /></mesh>
      {[-1, 1].map((k) => <mesh key={k} position={[B.x1 + 1.24, CURB + 6.8 + k * 1.43, LIB_DOOR_Z]} material={facadeMats().brass}><boxGeometry args={[0.2, 0.04, 11.7]} /></mesh>)}
      <BrandSign text="PUBLIC LIBRARY" sub="VISION STORMS · READ · LEARN · CREATE" position={[B.x1 + 1.3, CURB + 6.8, LIB_DOOR_Z]} rotation={[0, Math.PI / 2, 0]} width={10.6} color="#f4f1ea" glow="#ffe9c4" size={150} />
      {/* open-book emblem over the door */}
      <group position={[B.x1 + 1.3, CURB + 8.55, LIB_DOOR_Z]} rotation={[0, Math.PI / 2, 0]}>
        {[-1, 1].map((s) => <mesh key={s} position={[s * 0.5, 0, 0]} rotation={[0, 0, s * -0.22]} material={m.white}><boxGeometry args={[0.95, 0.12, 0.7]} /></mesh>)}
        <mesh position={[0, 0.06, 0]} material={m.brass}><boxGeometry args={[0.07, 0.07, 0.72]} /></mesh>
      </group>
      <DoubleDoor id="door-library" center={[B.x1 - 0.2, CURB, LIB_DOOR_Z]} halfWidth={1.2} height={2.8} facing={Math.PI / 2} accent="#c9a24a" label="Library doors" finish="bronze" />
      <mesh position={[B.x1 + 1.3, CURB + 2.1, LIB_DOOR_Z + 2.7]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[1.1, 0.6]} /><meshStandardMaterial color="#17202e" /></mesh>
      <BrandSign text="OPEN 9 TO 9" sub="LIBRARY CARDS ARE FREE" position={[B.x1 + 1.27, CURB + 2.1, LIB_DOOR_Z + 2.7]} rotation={[0, Math.PI / 2, 0]} width={1.1} color="#ffe9c4" glow="#ffd9a6" size={120} />

      {/* forecourt: lawns, trees, a path to the avenue, benches, a book-return box and outdoor reading tables */}
      <Lawn x0={B.x1 + 6.5} x1={B.x1 + 26} z0={B.z0 + 1} z1={LIB_DOOR_Z - 3} y={CURB} />
      <Lawn x0={B.x1 + 6.5} x1={B.x1 + 26} z0={LIB_DOOR_Z + 3} z1={B.z1 - 1} y={CURB} />
      <Lawn x0={B.x1 + 1.5} x1={B.x1 + 6.5} z0={B.z0 + 1} z1={LIB_DOOR_Z - 7} y={CURB} />
      <Lawn x0={B.x1 + 1.5} x1={B.x1 + 6.5} z0={LIB_DOOR_Z + 7} z1={B.z1 - 1} y={CURB} />
      <Trees trees={trees} />
      <FlowerBed x={B.x1 + 3.5} z={B.z0 + 4} w={4} d={2.4} seed={11} />
      <FlowerBed x={B.x1 + 3.5} z={B.z1 - 4} w={4} d={2.4} seed={12} />
      <Bench position={[B.x1 + 9, CURB, LIB_DOOR_Z - 4.6]} yaw={-Math.PI / 2} />
      <Bench position={[B.x1 + 9, CURB, LIB_DOOR_Z + 4.6]} yaw={-Math.PI / 2} />
      <Bench position={[B.x1 + 16, CURB, LIB_DOOR_Z - 4.6]} yaw={Math.PI / 2} />
      <Bench position={[B.x1 + 16, CURB, LIB_DOOR_Z + 4.6]} yaw={Math.PI / 2} />
      <group position={[B.x1 + 4.5, CURB, LIB_DOOR_Z - 6.2]}>
        <Block position={[0, 0.55, 0]} size={[0.7, 1.1, 0.55]} material={m.brass} />
        <mesh position={[-0.37, 0.8, 0]}><planeGeometry args={[0.45, 0.12]} /><meshStandardMaterial color="#17202e" /></mesh>
      </group>
      <BrandSign text="BOOK RETURN" position={[B.x1 + 4.5, CURB + 1.45, LIB_DOOR_Z - 6.2]} rotation={[0, Math.PI / 2, 0]} width={1.3} color="#ffe9c4" glow="#ffd9a6" size={110} />
      {[[B.x1 + 20, LIB_DOOR_Z - 12], [B.x1 + 20, LIB_DOOR_Z + 12]].map(([x, z], i) => (
        <group key={i}>
          <Table position={[x, CURB, z]} size={[1.9, 1.1]} height={0.76} />
          {[[0, 0.95, Math.PI], [0, -0.95, 0]].map(([dx, dz, yaw], k) => <Chair key={k} position={[x + dx, CURB, z + dz]} yaw={yaw} color="#8a5a3c" />)}
          <mesh position={[x, CURB + 2.6, z]}><coneGeometry args={[1.7, 0.45, 16]} /><meshStandardMaterial color={i ? '#2a9d8f' : '#e76f51'} roughness={0.8} side={THREE.DoubleSide} /></mesh>
          <mesh position={[x, CURB + 1.3, z]} material={m.steel}><cylinderGeometry args={[0.03, 0.03, 2.6, 8]} /></mesh>
        </group>
      ))}
      {[-8.5, 8.5].map((dz) => <StreetLamp key={dz} position={[B.x1 + 9, CURB, LIB_DOOR_Z + dz]} yaw={-Math.PI / 2} />)}
      <LightAnchor position={[B.x1 + 4, CURB + 4, LIB_DOOR_Z]} color="#ffe2b8" intensity={18} distance={14} night />
      <LightAnchor position={[cx, CURB + 4.5, cz]} color="#ffeccc" intensity={22} distance={26} night />

      {/* interior drawn only while you are at or near the building */}
      <Gate x0={B.x0} x1={B.x1} z0={B.z0} z1={B.z1} pad={10}>
        <Interior />
      </Gate>
    </group>
  )
}
