import { useMemo } from 'react'
import * as THREE from 'three'
import { surface } from '../materials.js'
import { Wall, Gate, Block } from '../jobkit.jsx'
import { DoubleDoor } from '../Door.jsx'
import { BrandSign } from '../signs.jsx'
import { RoomSign } from '../Justice.jsx'
import { Trees, Lawn, Bench, StreetLamp, FlowerBed, LightAnchor } from '../props.jsx'
import { CeilingLight, Plant, Rug, Counter } from '../furniture.jsx'
import { Chandelier } from '../Chandelier.jsx'
import { nightLit } from '../../state/environment.js'
import { useSeats } from '../../state/seats.js'
import { MUSEUM, MUS_FLOOR, MUS_H, MUS_CEIL, MUS_DOOR_Z, MUS_ZONE, ROTUNDA, CURB } from '../../config/museum.js'
import { mm, canvasTex, marbleFloorTex, rotundaFloorTex, Column, FY } from './kit.jsx'
import { Painting, TimelineMural } from './paintings.jsx'
import { MapTable, LibertyBell, DocumentCase, FlagPole, EagleStatue, LunchCounter, GoldenDoor } from './MuseumHeroes1.jsx'
import { TRex, GemCase, Triceratops, Raptor } from './MuseumHeroes2.jsx'
import { Biplane, Monoplane, Capsule, Rocket } from './MuseumHeroes3.jsx'
import { ModelCar, Wagon, Locomotive, Telegraph } from './MuseumHeroes4.jsx'
import { GrandPiano, DrumKit, ElectricGuitar, Jukebox } from './MuseumHeroes5.jsx'
import MuseumCrew from './MuseumCrew.jsx'

// ============================================================================
// MUSEUM OF AMERICAN HERITAGE
// A neoclassical museum on the lot east of the Reign Gallery. West portico, rotunda with a dome, and seven halls
// laid out around it. Interiors are drawn only when you are near (Gate). Exhibits are in MuseumHeroes1-5.
// ============================================================================

const B = MUSEUM
const WH = MUS_H + (FY - CURB) // wall height measured from the sidewalk
const CX = (B.x0 + B.x1) / 2, CZ = (B.z0 + B.z1) / 2
const W = B.x1 - B.x0, D = B.z1 - B.z0
const T = 0.5
const RECT = { x0: B.x0, x1: B.x1, z0: B.z0, z1: B.z1 }
const IX0 = B.x0 + T, IX1 = B.x1 - T, IZ0 = B.z0 + T, IZ1 = B.z1 - T
const CEILY = FY + MUS_CEIL

// ------------------------------------------------------------------ shapes
function slabWithHole(w, d, r, depth) {
  const s = new THREE.Shape()
  s.moveTo(-w / 2, -d / 2); s.lineTo(w / 2, -d / 2); s.lineTo(w / 2, d / 2); s.lineTo(-w / 2, d / 2); s.closePath()
  const hole = new THREE.Path(); hole.absarc(0, 0, r, 0, Math.PI * 2, true); s.holes.push(hole)
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 48 })
  g.rotateX(-Math.PI / 2)
  return g
}

function domeTex() {
  return canvasTex(2048, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, h, 0, 0) // v=0 at the rim (bottom of canvas = apex for a sphere top), see mapping below
    gr.addColorStop(0, '#2c4a86'); gr.addColorStop(0.55, '#41659f'); gr.addColorStop(1, '#a7c4e6')
    g.fillStyle = gr; g.fillRect(0, 0, w, h)
    // coffer ribs
    g.strokeStyle = 'rgba(207,169,78,0.9)'; g.lineWidth = 7
    for (let i = 0; i < 24; i++) { const x = (i / 24) * w; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke() }
    for (const y of [h * 0.12, h * 0.34, h * 0.58, h * 0.8]) { g.lineWidth = 5; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke() }
    // gold stars in each coffer
    for (let i = 0; i < 24; i++) for (let k = 0; k < 4; k++) {
      const x = ((i + 0.5) / 24) * w, y = [h * 0.23, h * 0.46, h * 0.69, h * 0.9][k]
      const r = [20, 18, 15, 12][k]
      g.fillStyle = '#f0cf72'; g.beginPath()
      for (let p = 0; p < 10; p++) { const a = -Math.PI / 2 + (p * Math.PI) / 5, rr = p % 2 ? r * 0.42 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.55 * (1 + k * 0.1)) }
      g.closePath(); g.fill()
    }
  })
}

function Pilasters({ list, y = CURB, h = WH }) {
  const m = mm()
  return list.map(([x, z, sx, sz], i) => <Block key={i} position={[x, y + h / 2, z]} size={[sx, h, sz]} material={m.stoneSmooth} collide={false} />)
}

function Dado({ axis, fixed, a, b, side = 1, skip = [] }) {
  // a wainscot panel run along an inner wall face: axis 'x' = runs along x at z=fixed, 'z' = along z at x=fixed; side pushes it into the room
  const m = mm()
  const segs = []
  let cur = a
  for (const [s0, s1] of [...skip].sort((p, q) => p[0] - q[0])) { if (s0 > cur) segs.push([cur, s0]); cur = Math.max(cur, s1) }
  if (cur < b) segs.push([cur, b])
  return segs.map(([s0, s1], i) => {
    const len = s1 - s0, mid = (s0 + s1) / 2
    const pos = (yy) => (axis === 'x' ? [mid, FY + yy, fixed + side * 0.04] : [fixed + side * 0.04, FY + yy, mid])
    const size = (th, hh) => (axis === 'x' ? [len, hh, th] : [th, hh, len])
    return (
      <group key={i}>
        <mesh position={pos(0.55)} material={m.walnut}><boxGeometry args={size(0.08, 1.1)} /></mesh>
        <mesh position={pos(1.13)} material={m.brass}><boxGeometry args={size(0.12, 0.05)} /></mesh>
        <mesh position={pos(0.06)} material={m.walnutSolid}><boxGeometry args={size(0.12, 0.12)} /></mesh>
      </group>
    )
  })
}

// ------------------------------------------------------------------ exterior
function Exterior() {
  const m = mm()
  const roofGeo = useMemo(() => slabWithHole(W + 1.2, D + 1.2, ROTUNDA.r + 0.35, 0.5), [])
  const roofMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7d7a75', roughness: 0.85 }), [])
  const pedGeo = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(-11.2, 0); s.lineTo(11.2, 0); s.lineTo(0, 3.3); s.closePath()
    return new THREE.ExtrudeGeometry(s, { depth: 4.7, bevelEnabled: false })
  }, [])
  const seal = useMemo(() => canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#1f2f5c'; g.beginPath(); g.arc(w / 2, h / 2, 250, 0, 7); g.fill()
    g.strokeStyle = '#cfa94e'; g.lineWidth = 12; g.beginPath(); g.arc(w / 2, h / 2, 236, 0, 7); g.stroke(); g.lineWidth = 4; g.beginPath(); g.arc(w / 2, h / 2, 170, 0, 7); g.stroke()
    for (let i = 0; i < 13; i++) { const a = -Math.PI / 2 + (i / 13) * Math.PI * 2, x = w / 2 + Math.cos(a) * 203, y = h / 2 + Math.sin(a) * 203; g.fillStyle = '#f0cf72'; g.beginPath(); for (let p = 0; p < 10; p++) { const aa = -Math.PI / 2 + (p * Math.PI) / 5, rr = p % 2 ? 7 : 17; g.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr) } g.closePath(); g.fill() }
    g.fillStyle = '#f4efe2'; g.textAlign = 'center'; g.font = '700 54px Georgia, serif'; g.fillText('E PLURIBUS', w / 2, 238); g.fillText('UNUM', w / 2, 300)
    g.fillStyle = '#f0cf72'; g.font = '700 34px Georgia, serif'; g.fillText('1776', w / 2, 360)
  }), [])
  const cols = useMemo(() => Array.from({ length: 8 }, (_, i) => -112 + i * (18 / 7)), [])
  const lamp = useMemo(() => nightLit(new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffd89a', roughness: 0.5 }), 1.6, 0.1), [])
  const topY = CURB + WH
  return (
    <group>
      {/* podium: two 15 cm steps up from the sidewalk to the museum floor */}
      <Block position={[(15 + 72.5) / 2, 0.15, CZ]} size={[57.5, 0.3, D + 4]} material={surface('limestone', 12, 8, { color: '#d8d1c0' })} />
      <Block position={[(17.5 + 71) / 2, 0.225, CZ]} size={[53.5, 0.45, D + 2]} material={surface('limestone', 11, 8, { color: '#e2dccb' })} />
      {/* walls */}
      <Wall side="w" rect={RECT} h={WH} t={T} ext={m.stone} int={m.plaster} y={CURB}
        openings={[{ at: MUS_DOOR_Z, half: 2.4, h: 5.7 }, { at: -117.5, half: 1.5, glass: true, h: 7.4, sill: 2.4 }, { at: -88.5, half: 1.5, glass: true, h: 7.4, sill: 2.4 }]} />
      <Wall side="s" rect={RECT} h={WH} t={T} ext={m.stone} int={m.plaster} y={CURB}
        openings={[31, 43, 55, 65].map((at) => ({ at, half: 1.7, glass: true, h: 8.4, sill: 2.4 }))} />
      <Wall side="n" rect={RECT} h={WH} t={T} ext={m.stone} int={m.plaster} y={CURB}
        openings={[31, 43, 55, 65].map((at) => ({ at, half: 1.7, glass: true, h: 8.4, sill: 2.4 }))} />
      <Wall side="e" rect={RECT} h={WH} t={T} ext={m.stone} int={m.plaster} y={CURB}
        openings={[-117.5, -108, -98, -88.5].map((at) => ({ at, half: 1.7, glass: true, h: 8.4, sill: 2.4 }))} />
      {/* pilasters, cornice, parapet */}
      <Pilasters list={[26, 37, 49, 61, 68.4].flatMap((x) => [[x, B.z0 - 0.15, 0.9, 0.3], [x, B.z1 + 0.15, 0.9, 0.3]])} />
      <Pilasters list={[-121, -113, -106, -100, -93, -85.2].map((z) => [B.x1 + 0.15, z, 0.3, 0.9])} />
      <Block position={[CX, topY - 0.3, CZ]} size={[W + 1.0, 0.6, D + 1.0]} material={m.stoneSmooth} collide={false} />
      <mesh geometry={roofGeo} position={[CX, topY, CZ]} material={roofMat} receiveShadow />
      {[[CX, B.z0 - 0.6, W + 1.2, 0.5], [CX, B.z1 + 0.6, W + 1.2, 0.5]].map(([x, z, sx, sz], i) => <Block key={'pa' + i} position={[x, topY + 1.0, z]} size={[sx, 1.0, sz]} material={m.stoneSmooth} collide={false} />)}
      {[[B.x0 - 0.6, CZ, 0.5, D + 1.2], [B.x1 + 0.6, CZ, 0.5, D + 1.2]].map(([x, z, sx, sz], i) => <Block key={'pb' + i} position={[x, topY + 1.0, z]} size={[sx, 1.0, sz]} material={m.stoneSmooth} collide={false} />)}

      {/* portico: eight columns, entablature, pediment */}
      {cols.map((z, i) => <Column key={i} position={[20.4, FY, z]} h={9.6} r={0.55} />)}
      <Block position={[22.0, FY + 9.6 + 0.45, MUS_DOOR_Z]} size={[5.6, 0.9, 21.6]} material={m.stoneSmooth} collide={false} />
      <Block position={[21.95, FY + 9.6 + 1.6, MUS_DOOR_Z]} size={[5.3, 1.4, 21.4]} material={m.stone} collide={false} />
      <Block position={[21.5, FY + 9.6 + 2.55, MUS_DOOR_Z]} size={[6.2, 0.5, 22.4]} material={m.stoneSmooth} collide={false} />
      <Block position={[21.9, FY + 9.7, MUS_DOOR_Z]} size={[4.4, 0.2, 21.4]} material={m.stone} collide={false} />
      <BrandSign text="MUSEUM OF AMERICAN HERITAGE" position={[19.28, FY + 11.2, MUS_DOOR_Z]} rotation={[0, -Math.PI / 2, 0]} width={19.5} color="#7a5a22" glow="#d9b86a" size={120} font="Georgia, serif" />
      <mesh geometry={pedGeo} position={[19.3, FY + 12.15, MUS_DOOR_Z]} rotation={[0, Math.PI / 2, 0]} material={m.stoneSmooth} castShadow />
      <mesh position={[19.27, FY + 13.4, MUS_DOOR_Z]} rotation={[0, -Math.PI / 2, 0]}><circleGeometry args={[1.35, 40]} /><meshStandardMaterial map={seal} roughness={0.5} metalness={0.2} /></mesh>
      {/* entrance: double doors, lamps, plaque, flagpoles */}
      <DoubleDoor id="door-museum" center={[B.x0 + 0.2, FY, MUS_DOOR_Z]} halfWidth={2.4} height={5.6} facing={-Math.PI / 2} accent="#cfa94e" label="museum doors" />
      {[-1, 1].map((s) => <mesh key={s} position={[B.x0 - 0.1, FY + 4.2, MUS_DOOR_Z + s * 3.4]} material={lamp}><sphereGeometry args={[0.2, 14, 10]} /></mesh>)}
      <BrandSign text="OPEN DAILY 10 TO 6" sub="ADMISSION IS ALWAYS FREE" position={[B.x0 - 0.06, FY + 2.3, MUS_DOOR_Z + 3.8]} rotation={[0, -Math.PI / 2, 0]} width={1.6} color="#ffe9c4" glow="#ffd9a6" size={120} />
      <LightAnchor position={[21.5, FY + 7.5, MUS_DOOR_Z]} color="#ffe2b8" intensity={26} distance={18} night />
      <LightAnchor position={[21.5, FY + 7.5, MUS_DOOR_Z - 7]} color="#ffe2b8" intensity={16} distance={14} night />
      <LightAnchor position={[21.5, FY + 7.5, MUS_DOOR_Z + 7]} color="#ffe2b8" intensity={16} distance={14} night />

      {/* rotunda drum and dome */}
      <group position={[ROTUNDA.x, topY, ROTUNDA.z]}>
        <mesh position={[0, 1.4, 0]} material={m.stoneSmooth} castShadow><cylinderGeometry args={[ROTUNDA.r + 0.5, ROTUNDA.r + 0.5, 2.8, 48, 1, true]} /></mesh>
        <mesh position={[0, 1.4, 0]} material={m.stoneSmooth}><cylinderGeometry args={[ROTUNDA.r + 0.1, ROTUNDA.r + 0.1, 2.8, 48, 1, true]} /></mesh>
        <mesh position={[0, 2.85, 0]} material={m.stoneSmooth}><cylinderGeometry args={[ROTUNDA.r + 0.8, ROTUNDA.r + 0.8, 0.3, 48]} /></mesh>
        {Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * (ROTUNDA.r + 0.52), 1.4, Math.sin(a) * (ROTUNDA.r + 0.52)]} rotation={[0, -a + Math.PI / 2, 0]} material={m.glass}><boxGeometry args={[1.2, 1.6, 0.05]} /></mesh> })}
        <mesh position={[0, 3.0, 0]} scale={[1, 0.62, 1]} castShadow><sphereGeometry args={[ROTUNDA.r + 0.7, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#e6e1d3" roughness={0.45} metalness={0.15} /></mesh>
        <mesh position={[0, 3.0 + (ROTUNDA.r + 0.7) * 0.62 + 0.35, 0]} material={m.stoneSmooth}><cylinderGeometry args={[1.0, 1.2, 0.8, 20]} /></mesh>
        <mesh position={[0, 3.0 + (ROTUNDA.r + 0.7) * 0.62 + 1.2, 0]} material={m.brass}><sphereGeometry args={[0.55, 20, 14]} /></mesh>
        <mesh position={[0, 3.0 + (ROTUNDA.r + 0.7) * 0.62 + 2.0, 0]} material={m.brass}><coneGeometry args={[0.12, 1.4, 8]} /></mesh>
      </group>

      {/* grounds: forecourt, walk from the avenue, lawns, trees, flags */}
      <mesh position={[11.5, CURB + 0.006, MUS_DOOR_Z]} rotation={[-Math.PI / 2, 0, 0]} material={surface('pavers', 3, 6)} receiveShadow><planeGeometry args={[11, 30]} /></mesh>
      <mesh position={[12.5, CURB + 0.006, -70]} rotation={[-Math.PI / 2, 0, 0]} material={surface('pavers', 1.2, 14)} receiveShadow><planeGeometry args={[5, 52]} /></mesh>
      <Lawn x0={18} x1={72} z0={-84} z1={-46} y={CURB} />
      <Lawn x0={17.5} x1={72} z0={-120} z1={-124.5} y={CURB} />
      <Lawn x0={7} x1={9.5} z0={-120} z1={-86} y={CURB} />
      <Lawn x0={72} x1={86} z0={-120} z1={-46} y={CURB} />
      <FlagPole position={[16.2, CURB, MUS_DOOR_Z - 10]} h={10} />
      <FlagPole position={[16.2, CURB, MUS_DOOR_Z + 10]} h={10} />
      <Trees trees={useMemo(() => [[20, CURB, -70, 1.2], [30, CURB, -81, 1.1], [48, CURB, -81, 1.25], [64, CURB, -81, 1.15], [75, CURB, -66, 1.1], [75, CURB, -52, 1.0], [75, CURB, -90, 1.2], [75, CURB, -110, 1.1], [8, CURB, -118, 1.0], [8, CURB, -88, 1.0]], [])} />
      {[[18.5, -56], [42, -82.4], [57, -82.4]].map(([x, z], i) => <FlowerBed key={i} x={x} z={z} w={5} d={2} seed={21 + i} />)}
      {[-60, -76, -90].map((z) => <StreetLamp key={z} position={[15.2, CURB, z]} yaw={-Math.PI / 2} />)}
      <Bench position={[18.2, CURB, -69]} yaw={-Math.PI / 2} />
      <Bench position={[18.2, CURB, -81]} yaw={-Math.PI / 2} />
      <Bench position={[11, CURB, -112]} yaw={Math.PI / 2} />
      <Bench position={[11, CURB, -94]} yaw={Math.PI / 2} />
      <BrandSign text="HERITAGE WALK" sub="TO THE MUSEUM OF AMERICAN HERITAGE" position={[10.2, CURB + 1.5, -58]} rotation={[0, Math.PI / 2, 0]} width={2.2} color="#f4efe2" glow="#ffe9c4" size={110} />
    </group>
  )
}

// ------------------------------------------------------------------ interior
const PART = { t: 0.4, h: MUS_CEIL }
function Partition({ side, at, from, to, openings = [] }) {
  // a wall run: side 'x' = a wall at x=at running z from..to; 'z' = a wall at z=at running x from..to
  const m = mm()
  const rect = side === 'x' ? { x0: at - PART.t / 2, x1: at + 1, z0: from, z1: to } : { x0: from, x1: to, z0: at - PART.t / 2, z1: at + 1 }
  return <Wall side={side === 'x' ? 'w' : 's'} rect={rect} h={PART.h} t={PART.t} ext={m.plaster} int={m.plaster} y={FY} openings={openings} />
}

// opening trims: brass-edged stone surrounds
function Surround({ side, at, mid, half, h = 5.4 }) {
  const m = mm()
  const pos = (s, y) => (side === 'x' ? [at, FY + y, mid + s] : [mid + s, FY + y, at])
  const th = 0.62
  const sizeV = side === 'x' ? [th, h, 0.4] : [0.4, h, th]
  const sizeH = side === 'x' ? [th, 0.5, half * 2 + 0.8] : [half * 2 + 0.8, 0.5, th]
  return (
    <group>
      {[-1, 1].map((s) => <mesh key={s} position={pos(s * (half + 0.2), h / 2)} material={m.stoneSmooth}><boxGeometry args={sizeV} /></mesh>)}
      <mesh position={pos(0, h + 0.25)} material={m.stoneSmooth}><boxGeometry args={sizeH} /></mesh>
      <mesh position={pos(0, h - 0.02)} material={m.brass}><boxGeometry args={side === 'x' ? [th + 0.04, 0.05, half * 2] : [half * 2, 0.05, th + 0.04]} /></mesh>
    </group>
  )
}

function Interior() {
  const m = mm()
  const floorTex = useMemo(() => marbleFloorTex((IX1 - IX0) / 3.2, (IZ1 - IZ0) / 3.2), [])
  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.2, metalness: 0.05 }), [floorTex])
  const rotTex = useMemo(() => rotundaFloorTex(), [])
  const rotMat = useMemo(() => new THREE.MeshStandardMaterial({ map: rotTex, roughness: 0.18, metalness: 0.05, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), [rotTex])
  const ceilGeo = useMemo(() => slabWithHole(IX1 - IX0, IZ1 - IZ0, ROTUNDA.r + 0.1, 0.3), [])
  const dTex = useMemo(() => domeTex(), [])
  const dome = useMemo(() => new THREE.MeshBasicMaterial({ map: dTex, side: THREE.BackSide }), [dTex])
  const rotCols = useMemo(() => Array.from({ length: 12 }, (_, i) => { const a = ((i + 0.5) / 12) * Math.PI * 2; return [ROTUNDA.x + Math.cos(a) * 8.3, ROTUNDA.z + Math.sin(a) * 8.3] }), [])
  const cx = ROTUNDA.x, cz = ROTUNDA.z
  const lights = useMemo(() => {
    const out = []
    // foyer, rotunda ring, north wing, south wing, east hall, NW + SW rooms
    for (const z of [-109, -103, -97]) out.push([30.5, z])
    for (const a of [0, 1, 2, 3, 4, 5]) out.push([cx + Math.cos(a * 1.0472) * 5.5, cz + Math.sin(a * 1.0472) * 5.5])
    for (const x of [42, 48, 54, 60, 66]) out.push([x, -117.3])
    for (const x of [42, 49, 56, 63, 67.5]) out.push([x, -88.8])
    for (const z of [-109, -103, -97]) out.push([63.2, z])
    for (const [x, z] of [[28, -117.3], [34, -117.3], [28, -88.8], [34, -88.8]]) out.push([x, z])
    return out
  }, [cx, cz])
  // the lunch counter's seats come from LunchCounter itself
  return (
    <group>
      {/* floors, ceiling, dome */}
      <mesh position={[CX, FY + 0.002, CZ]} rotation={[-Math.PI / 2, 0, 0]} material={floorMat} receiveShadow><planeGeometry args={[IX1 - IX0, IZ1 - IZ0]} /></mesh>
      <mesh position={[cx, FY + 0.004, cz]} rotation={[-Math.PI / 2, 0, 0]} material={rotMat} receiveShadow><circleGeometry args={[ROTUNDA.r, 72]} /></mesh>
      <mesh geometry={ceilGeo} position={[CX, CEILY, CZ]} material={m.ceiling} />
      <mesh position={[cx, CEILY, cz]} scale={[1, 0.64, 1]} material={dome}><sphereGeometry args={[ROTUNDA.r + 0.05, 56, 24, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      {/* ring cornice at the dome base and a brass band */}
      <mesh position={[cx, CEILY - 0.15, cz]} rotation={[Math.PI / 2, 0, 0]} material={m.brass}><torusGeometry args={[ROTUNDA.r + 0.02, 0.1, 8, 72]} /></mesh>
      <mesh position={[cx, CEILY - 0.55, cz]} rotation={[Math.PI / 2, 0, 0]} material={m.stoneSmooth}><torusGeometry args={[ROTUNDA.r - 0.05, 0.22, 10, 72]} /></mesh>
      {lights.map(([x, z], i) => <CeilingLight key={i} position={[x, CEILY, z]} size={[1.8, 0.7]} intensity={30} distance={15} zone={MUS_ZONE} />)}
      <Chandelier position={[cx, CEILY + 6.4, cz]} type="crystal" size={2.2} drop={5.6} intensity={20} zone={MUS_ZONE} watts={220} />
      <LightAnchor position={[cx, CEILY + 3, cz]} color="#fff0d2" intensity={34} distance={26} />

      {/* rotunda colonnade */}
      {rotCols.map(([x, z], i) => <Column key={i} position={[x, FY, z]} h={MUS_CEIL - 0.55} r={0.42} />)}

      {/* partitions and their stone surrounds */}
      <Partition side="x" at={37} from={-121.5} to={-113} openings={[{ at: -117.25, half: 2.4, h: 5.6 }]} />
      <Partition side="x" at={37} from={-113} to={-93} openings={[{ at: -103, half: 4, h: 6.2 }]} />
      <Partition side="x" at={37} from={-93} to={-84.5} openings={[{ at: -88.75, half: 2.4, h: 5.6 }]} />
      <Partition side="x" at={57} from={-113} to={-93} openings={[{ at: -103, half: 4, h: 6.2 }]} />
      <Partition side="z" at={-113} from={24.5} to={37} openings={[{ at: 33.5, half: 2.5, h: 5.6 }]} />
      <Partition side="z" at={-113} from={37} to={57} openings={[{ at: 47, half: 4, h: 6.2 }]} />
      <Partition side="z" at={-113} from={57} to={69.5} openings={[{ at: 63.25, half: 3, h: 5.8 }]} />
      <Partition side="z" at={-93} from={24.5} to={37} openings={[{ at: 33.5, half: 2.5, h: 5.6 }]} />
      <Partition side="z" at={-93} from={37} to={57} openings={[{ at: 47, half: 4, h: 6.2 }]} />
      <Partition side="z" at={-93} from={57} to={69.5} openings={[{ at: 63.25, half: 3, h: 5.8 }]} />
      <Surround side="x" at={37} mid={-117.25} half={2.4} h={5.6} /><Surround side="x" at={37} mid={-103} half={4} h={6.2} /><Surround side="x" at={37} mid={-88.75} half={2.4} h={5.6} />
      <Surround side="x" at={57} mid={-103} half={4} h={6.2} />
      <Surround side="z" at={-113} mid={33.5} half={2.5} h={5.6} /><Surround side="z" at={-113} mid={47} half={4} h={6.2} /><Surround side="z" at={-113} mid={63.25} half={3} h={5.8} />
      <Surround side="z" at={-93} mid={33.5} half={2.5} h={5.6} /><Surround side="z" at={-93} mid={47} half={4} h={6.2} /><Surround side="z" at={-93} mid={63.25} half={3} h={5.8} />

      {/* wainscot on the outer walls */}
      <Dado axis="x" fixed={IZ0} a={IX0} b={IX1} side={1} />
      <Dado axis="x" fixed={IZ1} a={IX0} b={IX1} side={-1} />
      <Dado axis="z" fixed={IX1} a={IZ0} b={IZ1} side={-1} />
      <Dado axis="z" fixed={IX0} a={IZ0} b={IZ1} side={1} skip={[[MUS_DOOR_Z - 2.5, MUS_DOOR_Z + 2.5]]} />

      {/* hall names */}
      <RoomSign text="FLIGHT & SPACE" position={[56.7, FY + 7.3, -103]} rotation={[0, -Math.PI / 2, 0]} width={5.4} color="#1f2f5c" glow="#bcd0ff" />
      <RoomSign text="LAND & LIFE" position={[47, FY + 7.3, -112.7]} rotation={[0, 0, 0]} width={4.6} color="#2f5a44" glow="#c6f0d4" />
      <RoomSign text="INDUSTRY & INNOVATION" position={[47, FY + 7.3, -93.3]} rotation={[0, Math.PI, 0]} width={6.4} color="#6b3a22" glow="#ffd9b0" />
      <RoomSign text="FOUNDING & DEMOCRACY" position={[37.3, FY + 7.3, -103]} rotation={[0, Math.PI / 2, 0]} width={6.4} color="#a8322d" glow="#ffd0cc" />
      <RoomSign text="SOUND OF AMERICA" position={[37.3, FY + 6.4, -117.25]} rotation={[0, Math.PI / 2, 0]} width={4.4} color="#4a2f6e" glow="#e0ccff" />
      <RoomSign text="VOICES FOR EQUALITY" position={[37.3, FY + 6.4, -88.75]} rotation={[0, Math.PI / 2, 0]} width={5} color="#7a3b1e" glow="#ffd9b0" />
      <RoomSign text="WELCOME · FREE ADMISSION" position={[24.7, FY + 7.0, MUS_DOOR_Z]} rotation={[0, Math.PI / 2, 0]} width={5.6} color="#1f2f5c" glow="#bcd0ff" />

      {/* foyer */}
      <Rug position={[30.5, FY, MUS_DOOR_Z]} size={[12.2, 2.6]} color="#6e1f26" />
      <Rug position={[30.5, FY + 0.003, MUS_DOOR_Z]} size={[11.6, 2.0]} color="#8b2c33" />
      <Counter position={[29.5, FY, -110.6]} yaw={0} length={4} depth={0.8} top="marble" face="#4a3022" />
      <RoomSign text="INFORMATION" position={[29.5, FY + 3.4, -112.7]} width={3} color="#1f2f5c" glow="#bcd0ff" />
      <MapTable position={[31.2, -96.4]} />
      <TimelineMural position={[24.56, FY + 3.7, -96.7]} yaw={Math.PI / 2} width={6.4} height={1.2} />
      <Painting kind="canyon" position={[24.58, FY + 3.4, -109]} yaw={Math.PI / 2} size={[4.2, 2.6]} />
      <Painting kind="prairie" position={[36.78, FY + 3.2, -110]} yaw={-Math.PI / 2} size={[3.4, 2.1]} />
      <Painting kind="coast" position={[36.78, FY + 3.2, -96]} yaw={-Math.PI / 2} size={[3.4, 2.1]} />
      {[[25.6, -112.2], [25.6, -93.8], [36, -112.2], [36, -93.8]].map(([x, z], i) => <Plant key={i} position={[x, FY, z]} scale={1.5} kind={i % 2 ? 'areca' : 'fiddle'} />)}

      {/* rotunda */}
      <LibertyBell position={[cx, cz]} />
      <DocumentCase id="declaration" position={[41.6, -108.4]} yaw={Math.PI / 4} />
      <DocumentCase id="constitution" position={[52.4, -108.4]} yaw={-Math.PI / 4} />
      <FlagPole position={[41.6, FY, -97.6]} h={5.4} indoor yaw={3 * Math.PI / 4} placard="flag" />
      <EagleStatue position={[52.4, -97.6]} />

      {/* Land & Life: north wing */}
      <TRex position={[50, -117.3]} yaw={Math.PI / 2} />
      <GemCase position={[63, -117.4]} />
      <Triceratops position={[40, -120.6]} />
      <Raptor position={[58.8, -117.3]} />
      <Painting kind="lake" position={[40, FY + 4.3, -113.25]} yaw={Math.PI} size={[3.4, 2.1]} />
      <Painting kind="canyon" position={[54.3, FY + 4.3, -113.25]} yaw={Math.PI} size={[3.4, 2.1]} />
      <Painting kind="prairie" position={[67.8, FY + 4.3, -113.25]} yaw={Math.PI} size={[2.4, 1.5]} />

      {/* Flight & Space: east hall */}
      <Biplane position={[63.2, FY + 6.4, -108.6]} />
      <Monoplane position={[63.0, FY + 8.0, -99.0]} />
      <Capsule position={[66.6, -105.2]} />
      <Rocket position={[66.4, -95.2]} />
      <Painting kind="skyline" position={[57.28, FY + 4.4, -109]} yaw={Math.PI / 2} size={[2.4, 1.5]} light />

      {/* Industry & Innovation: south wing */}
      <Locomotive position={[45.7, -88.8]} yaw={Math.PI / 2} />
      <Wagon position={[55.6, -88.8]} yaw={Math.PI / 2} />
      <ModelCar position={[62.3, -88.8]} />
      <Telegraph position={[67.6, -90.6]} yaw={-Math.PI / 2} />

      {/* Sound of America: north-west room */}
      <GrandPiano position={[29.4, -116.2]} yaw={0} />
      <DrumKit position={[34.2, -119.6]} yaw={0} />
      <ElectricGuitar position={[25.4, -119.0]} yaw={Math.PI / 2} />
      <Jukebox position={[25.35, -114.4]} yaw={Math.PI / 2} />

      {/* Voices for Equality: south-west room */}
      <LunchCounter position={[31.2, -86.4]} />
      <GoldenDoor position={[25.4, -89.4]} yaw={Math.PI / 2} />

      {/* seats */}
      <MuseumBenches />
    </group>
  )
}

/** Leather benches (sit with E). */
function MuseumBenches() {
  const m = mm()
  const list = [[42, -94.7, Math.PI], [52, -94.7, Math.PI], [42, -111.3, 0], [52, -111.3, 0], [36.2, -100.4, -Math.PI / 2], [60, -111.8, 0], [60.5, -94.2, Math.PI], [28, -99, Math.PI / 2], [66, -86.4, Math.PI]]
  // benches hug the walls facing into the room
  const seats = list.map(([x, z, yaw], i) => ({ id: `mus-bench-${i}`, position: [x, FY + 0.46, z], yaw, height: 0.46, label: 'Sit on bench' }))
  useSeats(seats, [])
  return (
    <group>
      {list.map(([x, z, yaw], i) => (
        <group key={i} position={[x, FY, z]} rotation={[0, yaw, 0]}>
          <mesh position={[0, 0.4, 0]} castShadow><boxGeometry args={[1.7, 0.14, 0.55]} /><meshStandardMaterial color="#5b2a2a" roughness={0.7} /></mesh>
          <mesh position={[0, 0.3, 0]} material={m.walnutSolid}><boxGeometry args={[1.6, 0.18, 0.46]} /></mesh>
          {[-0.75, 0.75].map((dx) => <mesh key={dx} position={[dx, 0.12, 0]} material={m.brass}><boxGeometry args={[0.08, 0.24, 0.5]} /></mesh>)}
        </group>
      ))}
    </group>
  )
}

export default function Museum() {
  return (
    <group>
      <Exterior />
      <Gate x0={B.x0} x1={B.x1} z0={B.z0} z1={B.z1} pad={9}>
        <Interior />
      </Gate>
      <MuseumCrew />
    </group>
  )
}
