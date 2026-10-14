import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface } from './materials.js'
import { P, PLAZA, CORRIDOR, ELEVATOR } from '../config/plaza.js'
import {
  Chair, Stool, Sofa, Table, DiningSet, Counter, Rug, Plant, CeilingLight, PendantLight,
  ClothingRack, Mannequin, Shelf, WallScreen, Speaker, Microphone, AcousticPanels,
} from './furniture.jsx'
import { BrandSign } from './signs.jsx'
import { canvasTexture, wrapText } from './canvasText.js'
import { screenVideo } from '../audio/audio.js'
import { useRentals } from '../rentals/client.js'
import { FONTS } from '../config/theme.js'
import { StaticBatch } from './batch.jsx'

// Furnishings for the six Plaza rooms. Every chair, stool and sofa is sittable.
const CEIL = PLAZA.floorH - 0.3
const at = (u, f, v, dy = 0) => [P.X(u), P.Y(f) + dy, P.Z(v)]
const S0 = 0.3, S1 = CORRIDOR.v0 - 0.075 // south room v range
const N0 = CORRIDOR.v1 + 0.075, N1 = 27.7 // north room v range

function RoomFloor({ f, side, material }) {
  const v0 = side === 'south' ? S0 : N0, v1 = side === 'south' ? S1 : N1
  const u0 = side === 'north' ? ELEVATOR.u1 + 0.2 : 0.3
  return (
    <>
      <mesh position={at((u0 + 27.7) / 2, f, (v0 + v1) / 2, 0.005)} rotation={[-Math.PI / 2, 0, 0]} material={material} receiveShadow><planeGeometry args={[27.7 - u0, v1 - v0]} /></mesh>
      {side === 'north' && <mesh position={at((0.3 + u0) / 2, f, (ELEVATOR.v1 + 0.2 + v1) / 2, 0.005)} rotation={[-Math.PI / 2, 0, 0]} material={material} receiveShadow><planeGeometry args={[u0 - 0.3, v1 - ELEVATOR.v1 - 0.2]} /></mesh>}
    </>
  )
}
function RoomLights({ f, side, color = '#fff0dc', intensity = 20, us = [6, 14, 22] }) {
  intensity *= 0.5
  const v = side === 'south' ? (S0 + S1) / 2 : (N0 + N1) / 2
  return us.map((u) => <CeilingLight key={u} position={at(u, f, v, CEIL - 0.01)} size={[1.2, 1.2]} color={color} intensity={intensity} />)
}

// shared big-screen material: an animated title card, or the visitor's video when one is playing
function useScreen(title, subtitle) {
  const card = useMemo(() => canvasTexture(1280, 720, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, '#11131a'); g.addColorStop(1, '#2a2f3c')
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#c9a96a'; ctx.font = `500 30px ${FONTS.mono}`; ctx.textAlign = 'center'
    ctx.fillText(subtitle.toUpperCase(), w / 2, h / 2 - 90)
    ctx.fillStyle = '#f4f1ea'; ctx.font = `800 96px ${FONTS.display}`
    wrapText(ctx, title, w / 2, h / 2 + 10, w - 200, 100)
  }), [title, subtitle])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: card, toneMapped: false }), [card])
  useEffect(() => {
    let vt = null
    const on = (v) => {
      vt?.dispose()
      if (v) { vt = new THREE.VideoTexture(v); vt.colorSpace = THREE.SRGBColorSpace; mat.map = vt } else { vt = null; mat.map = card }
      mat.needsUpdate = true
    }
    screenVideo.listeners.add(on)
    if (screenVideo.el) on(screenVideo.el)
    return () => { screenVideo.listeners.delete(on); vt?.dispose() }
  }, [mat, card])
  return mat
}

export default function PlazaRooms() {
  return (
    <>
      <StaticBatch name="bistro"><Bistro /></StaticBatch>
      <StaticBatch name="threads"><Threads /></StaticBatch>
      <StaticBatch name="screening"><Screening /></StaticBatch>
      <StaticBatch name="studio"><Studio /></StaticBatch>
      <StaticBatch name="boardroom"><Boardroom /></StaticBatch>
      <Suite />
    </>
  )
}

// ---------------- VSP-101 Vision Storms Bistro (restaurant) ----------------
function Bistro() {
  const f = 0
  const m = getMaterials()
  const tables = [[4, 3], [8.5, 3], [13, 3], [4, 7.2], [8.5, 7.2], [13, 7.2]]
  return (
    <group>
      <RoomFloor f={f} side="south" material={surface('tile', 10, 4, { color: '#cdc4b4' })} />
      {tables.map(([u, v], i) => <DiningSet key={i} position={at(u, f, v)} chairs={4} size={0.9} color={['#6b4f3a', '#3f4a3c'][i % 2]} />)}
      {tables.map(([u, v], i) => <PendantLight key={'p' + i} position={at(u, f, v, CEIL)} drop={1.4} />)}
      {/* bar */}
      <Counter position={at(23.5, f, 5)} yaw={Math.PI / 2} length={6} />
      {[3, 4.5, 6, 7.5].map((v) => <Stool key={v} position={at(22.4, f, v)} />)}
      <Shelf position={at(27.4, f, 5)} yaw={-Math.PI / 2} width={5} height={2.4} />
      <Sofa position={at(18, f, 0.85)} yaw={0} length={3.2} color="#7a3b33" label="Sit in booth" />
      <Table position={at(18, f, 1.95)} size={[2.2, 0.8]} />
      <Plant position={at(1, f, 9.3)} scale={1.1} />
      <BrandSign text="VISION STORMS BISTRO" position={[P.X(0.33), P.Y(f) + 2.6, P.Z(5)]} rotation={[0, Math.PI / 2, 0]} width={5} size={120} color="#2b2b2e" glow="#ffffff" />
      <RoomLights f={f} side="south" intensity={14} />
    </group>
  )
}

// ---------------- VSP-102 Storms Threads (clothing store) ----------------
function Threads() {
  const f = 0
  const m = getMaterials()
  const folded = useMemo(() => ['#1f2a44', '#b23a3a', '#e9e4d8', '#3d5a40', '#c9a24a'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 })), [])
  return (
    <group>
      <RoomFloor f={f} side="north" material={surface('wood', 8, 3, { color: '#c8b49c' })} />
      {[8, 12, 16].flatMap((u) => [[u, 24.5], [u, 27]]).map(([u, v], i) => <ClothingRack key={i} position={at(u, f, v)} seed={i} />)}
      {[[10, 20.6], [15, 20.6]].map(([u, v], i) => (
        <group key={i}>
          <Table position={at(u, f, v)} size={[1.8, 0.9]} height={0.85} top="#e6e2da" />
          {[0, 1, 2, 3].map((k) => <mesh key={k} position={at(u - 0.6 + k * 0.4, f, v, 0.9 + (k % 2) * 0.04)} material={folded[(k + i) % 5]} castShadow><boxGeometry args={[0.32, 0.08 + (k % 2) * 0.04, 0.26]} /></mesh>)}
        </group>
      ))}
      <Mannequin position={at(22, f, 19.6)} color="#1f2a44" />
      <Mannequin position={at(24, f, 19.6)} yaw={-0.3} color="#b23a3a" />
      {/* fitting rooms with curtains */}
      {[0, 1, 2].map((k) => (
        <group key={k}>
          <RigidBody type="fixed" colliders={false}>
            <CuboidCollider args={[0.04, 1.1, 0.9]} position={at(4 + k * 1.6, f, 26.8, 1.1)} />
          </RigidBody>
          <mesh position={at(4 + k * 1.6, f, 26.8, 1.1)} material={surface('plaster', 0.4, 0.5)}><boxGeometry args={[0.06, 2.2, 1.8]} /></mesh>
          <mesh position={at(4.8 + k * 1.6, f, 25.92, 1.15)} material={m.fabric('#8c7b6b')}><boxGeometry args={[1.5, 2.0, 0.03]} /></mesh>
        </group>
      ))}
      <Sofa position={at(5.5, f, 22.5)} yaw={0} length={1.6} color="#a89a8a" label="Sit on bench" />
      <Counter position={at(25.5, f, 25)} yaw={-Math.PI / 2} length={2.6} top="wood" />
      <mesh position={at(27.66, f, 22, 1.4)} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[1.8, 2.2]} /><meshStandardMaterial color="#cfd6dc" metalness={1} roughness={0.02} /></mesh>
      <BrandSign text="STORMS THREADS" position={[P.X(16), P.Y(f) + 2.9, P.Z(N1 - 0.03)]} rotation={[0, Math.PI, 0]} width={5} size={120} color="#2b2b2e" glow="#ffffff" />
      <Plant position={at(26.8, f, 19)} />
      <RoomLights f={f} side="north" intensity={18} />
    </group>
  )
}

// ---------------- VSP-201 Screening Room (movie theater) ----------------
function Screening() {
  const f = 1
  const screen = useScreen('Feature Presentation', 'Vision Storms Cinema')
  const rows = [8, 11, 14, 17]
  return (
    <group>
      <RoomFloor f={f} side="south" material={surface('carpet', 8, 3, { color: '#3a2a2e' })} />
      <WallScreen position={at(0.36, f, 5.1, 2.25)} yaw={Math.PI / 2} size={[8, 3.4]} material={screen} />
      {rows.flatMap((u, r) => Array.from({ length: 7 }, (_, i) => [u, 1.6 + i * 1.05, r])).map(([u, v, r], i) => (
        <Chair key={i} position={at(u, f, v)} yaw={-Math.PI / 2} color={r % 2 ? '#6a1f26' : '#5a1a20'} label="Take a seat" />
      ))}
      <Speaker position={at(0.8, f, 0.9)} yaw={Math.PI / 2} scale={1.8} />
      <Speaker position={at(0.8, f, 9.3)} yaw={Math.PI / 2} scale={1.8} />
      <Counter position={at(25.5, f, 3)} yaw={Math.PI / 2} length={3} top="wood" />
      <RoomLights f={f} side="south" color="#ffd9b0" intensity={8} />
    </group>
  )
}

// ---------------- VSP-202 Studio 202 (music & podcast) ----------------
function Studio() {
  const f = 1
  const m = getMaterials()
  const consoleMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1a1b1e', emissive: '#3b6cff', emissiveIntensity: 0.15, roughness: 0.5 }), [])
  return (
    <group>
      <RoomFloor f={f} side="north" material={surface('wood', 7, 3, { color: '#8c6b4f' })} />
      <AcousticPanels position={at(14, f, N1 - 0.06, 1.4)} yaw={Math.PI} cols={8} rows={2} color="#3c4652" />
      <AcousticPanels position={at(27.64, f, 23, 1.4)} yaw={-Math.PI / 2} cols={4} rows={2} color="#5a4a3c" />
      {/* control desk + console + monitors */}
      <Counter position={at(14, f, 25.2)} length={3.4} height={0.8} depth={0.9} top="wood" />
      <mesh position={at(14, f, 25.2, 0.84)} rotation={[-0.3, 0, 0]} material={consoleMat}><boxGeometry args={[2.4, 0.06, 0.6]} /></mesh>
      <Speaker position={at(12.6, f, 25.5, 0.8)} yaw={Math.PI} scale={0.8} />
      <Speaker position={at(15.4, f, 25.5, 0.8)} yaw={Math.PI} scale={0.8} />
      <Chair position={at(14, f, 24.1)} yaw={0} color="#22252b" label="Sit at the console" />
      {/* vocal booth (glass on two sides) */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[2, 1.3, 0.03]} position={at(7, f, 22.5, 1.3)} />
        <CuboidCollider args={[0.03, 1.3, 1.6]} position={at(9, f, 24.1 + 0.3, 1.3)} />
      </RigidBody>
      <mesh position={at(7, f, 22.5, 1.3)} material={m.glass}><boxGeometry args={[4, 2.6, 0.04]} /></mesh>
      <mesh position={at(9, f, 24.4, 1.3)} material={m.glass}><boxGeometry args={[0.04, 2.6, 3.2]} /></mesh>
      <Microphone position={at(6.5, f, 25, 0)} yaw={Math.PI} />
      <mesh position={at(6.5, f, 25, 0.75)} material={m.blackSteel}><cylinderGeometry args={[0.012, 0.012, 1.5, 6]} /></mesh>
      {/* podcast table */}
      <Table position={at(21, f, 22.4)} round size={[1.6, 1.6]} />
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2
        return (
          <group key={i}>
            <Chair position={at(21 + Math.sin(a) * 1.25, f, 22.4 + Math.cos(a) * 1.25)} yaw={a + Math.PI} color="#2e3440" label="Sit at the mic" />
            <Microphone position={at(21 + Math.sin(a) * 0.5, f, 22.4 + Math.cos(a) * 0.5, 0.75)} yaw={a} />
          </group>
        )
      })}
      <PendantLight position={at(21, f, 22.4, CEIL)} drop={1.3} />
      <Sofa position={at(26.9, f, 25)} yaw={-Math.PI / 2} length={2.4} color="#3b3f46" />
      <BrandSign text="STUDIO 202" sub="MUSIC · PODCASTS" position={[P.X(20), P.Y(f) + 2.8, P.Z(N0 + 0.03)]} width={3.6} size={120} color="#2b2b2e" glow="#ffffff" />
      <RoomLights f={f} side="north" color="#ffe2c0" intensity={12} />
    </group>
  )
}

// ---------------- VSP-301 Boardroom (conference) ----------------
function Boardroom() {
  const f = 2
  const screen = useScreen('Boardroom', 'VSP-301 · Vision Storms Plaza')
  return (
    <group>
      <RoomFloor f={f} side="south" material={surface('carpet', 8, 3, { color: '#596069' })} />
      <Table position={at(11, f, 5)} size={[7, 1.5]} top="wood" />
      {[-2.7, -1.35, 0, 1.35, 2.7].flatMap((du) => [[11 + du, 3.65, 0], [11 + du, 6.35, Math.PI]]).map(([u, v, yaw], i) => (
        <Chair key={i} position={at(u, f, v)} yaw={yaw} color="#2b2f36" />
      ))}
      <Chair position={at(15.1, f, 5)} yaw={-Math.PI / 2} color="#2b2f36" />
      <WallScreen position={at(0.36, f, 5, 1.8)} yaw={Math.PI / 2} size={[3.6, 2.0]} material={screen} />
      <Counter position={at(26.9, f, 5)} yaw={-Math.PI / 2} length={4} height={0.9} depth={0.5} top="wood" />
      <mesh position={at(22, f, S0 + 0.03, 1.6)}><planeGeometry args={[3, 1.3]} /><meshStandardMaterial color="#f7f7f5" roughness={0.3} /></mesh>
      <Plant position={at(1, f, 9.2)} />
      <Plant position={at(20.5, f, 9.2)} />
      <RoomLights f={f} side="south" intensity={18} />
    </group>
  )
}

// ---------------- VSP-302 Skyline Suite (private rental) ----------------
function Suite() {
  const f = 2
  const custom = useRentals((s) => s.rooms.find((r) => r.id === 'VSP-302')?.customization) || {}
  const accent = useMemo(() => new THREE.MeshStandardMaterial({ color: custom.wallColor || '#3c4a5a', roughness: 0.85 }), [custom.wallColor])
  const screen = useScreen(custom.welcome || 'Skyline Suite', 'Private rental suite · VSP-302')
  return (
    <group>
      <RoomFloor f={f} side="north" material={surface('wood', 7, 3, { color: '#a58a6c' })} />
      {/* accent wall the renter can recolour */}
      <mesh position={at(16, f, N1 - 0.02, CEIL / 2)} rotation={[0, Math.PI, 0]} material={accent}><planeGeometry args={[23, CEIL]} /></mesh>
      <Rug position={at(16, f, 23.5)} size={[6, 4]} color="#7d6a58" />
      <Sofa position={at(16, f, 21.2)} yaw={0} length={2.8} color="#d3c7b6" />
      <Sofa position={at(16, f, 25.9)} yaw={Math.PI} length={2.8} color="#d3c7b6" />
      <Table position={at(16, f, 23.5)} size={[1.6, 0.8]} height={0.4} top="marble" />
      <Sofa position={at(19.4, f, 23.5)} yaw={-Math.PI / 2} length={1} color="#6f5b4b" label="Sit in armchair" />
      <WallScreen position={at(27.64, f, 23.5, 1.7)} yaw={-Math.PI / 2} size={[3, 1.7]} material={screen} />
      <Table position={at(7, f, 26.6)} size={[1.8, 0.8]} top="wood" />
      <Chair position={at(7, f, 25.8)} yaw={0} color="#2b2f36" label="Sit at the desk" />
      <Shelf position={at(4.5, f, 27.4)} yaw={Math.PI} width={2.2} height={2.2} />
      <Plant position={at(26.8, f, 19)} scale={1.2} />
      <Plant position={at(10.5, f, 19)} />
      <PendantLight position={at(16, f, 23.5, CEIL)} drop={1.1} />
      {custom.signText && <BrandSign text={custom.signText} position={[P.X(16), P.Y(f) + 3.2, P.Z(N1 - 0.05)]} rotation={[0, Math.PI, 0]} width={6} size={110} color="#f4f1ea" />}
      <RoomLights f={f} side="north" intensity={16} />
    </group>
  )
}
