import { useMemo } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface, signatureMarble } from './materials.js'
import { Chair, Table, Counter, CeilingLight, Plant } from './furniture.jsx'
import { BrandSign } from './signs.jsx'
import { RoomSign } from './Justice.jsx'
import { DoubleDoor } from './Door.jsx'
import { RenovatedShell, EntranceDressing } from './facade/Renovated.jsx'
import { Wall, Gate, Block, Kiosk } from './jobkit.jsx'
import { TimeClock } from './JobCenter.jsx'
import { PO, CURB, STOPS } from '../config/jobs.js'

// ============================================================================
// POST OFFICE (fictional "Vision Storms County Post")
// Lobby with a P.O. box wall and a self-service kiosk, counter windows, a back room with sorting
// tables and a mail cage, a loading dock door and a parked mail truck.
// Footprint x[40,62] z[54,66]; the front door faces the courtyard side (south) and the dock door faces east.
// ============================================================================

const H = 6.4
const PO_SPEC = {
  x0: PO.x0, x1: PO.x1, z0: PO.z0, z1: PO.z1, h: H + 1.0, ih: H, base: CURB, facing: '-z', wall: 'brick', seed: 5,
  door: { at: 51, half: 1.1, h: 2.6 },
  groundWindows: [{ at: 44.5, half: 2.5, v0: 0.9, v1: 3.6 }, { at: 57.5, half: 2.5, v0: 0.9, v1: 3.6 }],
  openings: { '+x': [{ at: 63, half: 0.9, door: true, v1: 2.8 }, { at: 57.6, half: 1.4, v0: 0.9, v1: 3.4 }] },
}
const CEIL = 4.2
const ZONE = 'post-office'
const COUNTER_Z = 61.0

export default function PostOffice() {
  const m = getMaterials()
  const ext = useMemo(() => surface('brick', 6, 1.6), [])
  const plaster = useMemo(() => surface('plaster', 4, 2), [])
  const marble = useMemo(() => signatureMarble(5, 3), [])
  const concrete = useMemo(() => surface('concrete', 5, 2), [])
  const ceiling = useMemo(() => new THREE.MeshStandardMaterial({ color: '#efede8', roughness: 0.9 }), [])
  const brass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c9a24a', roughness: 0.35, metalness: 0.8 }), [])
  const bin = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2b4f9a', roughness: 0.8 }), [])
  const tray = useMemo(() => new THREE.MeshStandardMaterial({ color: '#dcd6c8', roughness: 0.8 }), [])
  const R = PO
  const cx = (R.x0 + R.x1) / 2, cz = (R.z0 + R.z1) / 2
  const w = R.x1 - R.x0, d = R.z1 - R.z0
  const boxes = useMemo(() => {
    const out = []
    for (let r = 0; r < 5; r++) for (let c = 0; c < 8; c++) out.push([40.55, CURB + 0.7 + r * 0.38, 55.9 + c * 0.45])
    return out
  }, [])

  return (
    <group>
      {/* shell: colliders from the Wall pieces, visuals from the renovation kit */}
      <Wall side="s" rect={R} h={H} ext={ext} int={plaster} invisible
        openings={[{ at: 51, half: 1.1, h: 2.6 }, { at: 44.5, half: 2.5, glass: true, h: 3.6 }, { at: 57.5, half: 2.5, glass: true, h: 3.6 }]} />
      <Wall side="n" rect={R} h={H} ext={ext} int={plaster} invisible />
      <Wall side="w" rect={R} h={H} ext={ext} int={plaster} invisible />
      <Wall side="e" rect={R} h={H} ext={ext} int={plaster} invisible openings={[{ at: 63, half: 0.9, h: 2.8 }, { at: 57.6, half: 1.4, glass: true, h: 3.4 }]} />
      <RenovatedShell spec={PO_SPEC} />
      <mesh position={[cx, CURB + H + 0.15, cz]} material={ceiling}><boxGeometry args={[w - 0.8, 0.3, d - 0.8]} /></mesh>
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[w / 2, 0.45, d / 2]} position={[cx, CURB + H + 0.6, cz]} /></RigidBody>
      {/* rooftop plant and flag pole */}
      <Block position={[46, CURB + H + 1.4, 60]} size={[3, 1.0, 2]} material={m.aluminum} cast />
      <mesh position={[41.5, CURB + H + 4, 55]} material={m.chrome}><cylinderGeometry args={[0.04, 0.05, 7, 8]} /></mesh>
      <mesh position={[42.1, CURB + H + 6.9, 55]}><boxGeometry args={[1.2, 0.7, 0.02]} /><meshStandardMaterial color="#b3263a" roughness={0.8} /></mesh>
      {/* sign and entrance */}
      <EntranceDressing origin={[51, R.z0]} base={CURB} name="POST OFFICE" sub="VISION STORMS COUNTY POST" doorHalf={1.1} doorH={2.6} yaw={Math.PI} signWidth={7.2} parts={{ forecourt: false, benches: false }} />
      <DoubleDoor id="door-postoffice" center={[51, CURB, R.z0 + 0.2]} halfWidth={1.1} height={2.6} facing={Math.PI} accent="#c9a96a" label="Post Office doors" finish="bronze" />
      <DoubleDoor id="door-postoffice-dock" center={[R.x1 - 0.2, CURB, 63]} halfWidth={0.9} height={2.8} facing={Math.PI / 2} accent="#8a8f99" label="dock door" finish="bronze" />

      <Gate x0={R.x0} x1={R.x1 + 0.5} z0={R.z0} z1={R.z1} pad={9}>
        <group>
          <mesh position={[cx, CURB + 0.014, cz]} rotation={[-Math.PI / 2, 0, 0]} material={marble} receiveShadow><planeGeometry args={[w - 0.8, d - 0.8]} /></mesh>
          <mesh position={[cx, CURB + 0.02, (COUNTER_Z + R.z1) / 2 + 0.2]} rotation={[-Math.PI / 2, 0, 0]} material={concrete}><planeGeometry args={[w - 0.8, R.z1 - COUNTER_Z - 0.6]} /></mesh>
          {/* lights */}
          {[[44, 57.5], [51, 57.5], [58, 57.5], [45, 63.4], [52, 63.4], [58.5, 63.4]].map(([x, z], i) => <CeilingLight key={i} position={[x, CURB + CEIL - 0.02, z]} zone={ZONE} intensity={14} />)}
          {/* P.O. box wall */}
          <mesh position={[40.49, CURB + 1.5, 57.6]} material={m.blackSteel}><boxGeometry args={[0.06, 2.3, 3.8]} /></mesh>
          {boxes.map((p, i) => <mesh key={i} position={p} material={brass}><boxGeometry args={[0.06, 0.3, 0.4]} /></mesh>)}
          <RoomSign text="P.O. BOXES" position={[40.5, CURB + 3.2, 57.8]} rotation={[0, Math.PI / 2, 0]} width={2.6} color="#0e2a5c" glow="#8fb6ff" />
          {/* self-service and lobby */}
          <Kiosk position={[47.5, CURB, 55.2]} yaw={Math.PI} screen="#4f7dff" />
          <Kiosk position={[49.0, CURB, 55.2]} yaw={Math.PI} screen="#4f7dff" />
          <Table position={[56, CURB, 55.6]} size={[1.8, 0.7]} height={1.0} />
          <Plant position={[41.4, CURB, 54.9]} scale={1.2} />
          <Plant position={[61.0, CURB, 54.9]} scale={1.2} />
          {[44.5, 46, 47.5, 49, 50.5].map((x, i) => (
            <mesh key={i} position={[x, CURB + 0.5, 59.4]} material={m.chrome} castShadow><cylinderGeometry args={[0.04, 0.05, 1.0, 8]} /></mesh>
          ))}
          <mesh position={[47.5, CURB + 0.95, 59.4]} material={bin}><boxGeometry args={[6.0, 0.04, 0.04]} /></mesh>
          {/* counter windows and gate */}
          <Counter position={[48, CURB, COUNTER_Z]} yaw={Math.PI} length={12} depth={0.7} />
          <Counter position={[58.8, CURB, COUNTER_Z]} yaw={Math.PI} length={5.6} depth={0.7} />
          {[45, 50, 58.8].map((x, i) => (
            <mesh key={i} position={[x, CURB + 1.75, COUNTER_Z]} userData={{ noBatch: true }}><boxGeometry args={[i === 2 ? 3.4 : 3.6, 1.3, 0.04]} /><meshPhysicalMaterial color="#bcd7e6" roughness={0.05} transparent opacity={0.22} depthWrite={false} /></mesh>
          ))}
          <mesh position={[48, CURB + 2.5, COUNTER_Z]} material={m.blackSteel}><boxGeometry args={[12, 0.14, 0.14]} /></mesh>
          <RoomSign text="SERVICE WINDOWS" position={[50, CURB + 3.2, COUNTER_Z + 0.2]} rotation={[0, Math.PI, 0]} width={3.4} color="#0e2a5c" glow="#8fb6ff" />
          {/* back room: sorting tables, cages, lockers, time clock */}
          {[45.2, 49.2, 53.4].map((x) => (
            <group key={x}>
              <Table position={[x, CURB, 64.3]} size={[2.4, 1.1]} height={0.95} />
              <mesh position={[x, CURB + 1.0, 64.3]} material={tray}><boxGeometry args={[2.0, 0.06, 0.6]} /></mesh>
            </group>
          ))}
          {[56.8, 58.2].map((x) => <Block key={x} position={[x, CURB + 0.6, 65.1]} size={[1.2, 1.2, 0.8]} material={bin} />)}
            {[62.4, 63.4, 64.4].map((z) => <Block key={z} position={[40.7, CURB + 1.0, z]} size={[0.6, 2.0, 0.9]} material={m.aluminum} />)}
          <TimeClock position={[41.9, CURB, 62.4]} />
          <Chair position={[50, CURB, 62.4]} yaw={Math.PI} color="#2b2f38" />
          <Chair position={[45, CURB, 62.4]} yaw={Math.PI} color="#2b2f38" />
        </group>
      </Gate>

      <MailTruck position={[67.8, CURB, 63]} />
    </group>
  )
}

function MailTruck({ position }) {
  const m = getMaterials()
  const body = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f1f2f4', roughness: 0.35, metalness: 0.3 }), [])
  const blue = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1d3f8f', roughness: 0.5 }), [])
  const tire = useMemo(() => new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.9 }), [])
  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[2.9, 1.5, 1.1]} position={[0, 1.5, 0]} />
      </RigidBody>
      {/* box and cab; the truck backs up to the dock door, nose pointing east */}
      <mesh position={[-0.6, 1.75, 0]} material={body} castShadow><boxGeometry args={[4.4, 2.4, 2.2]} /></mesh>
      <mesh position={[-0.6, 1.9, 1.11]} material={blue}><boxGeometry args={[4.3, 0.3, 0.02]} /></mesh>
      <mesh position={[-0.6, 1.9, -1.11]} material={blue}><boxGeometry args={[4.3, 0.3, 0.02]} /></mesh>
      <mesh position={[2.1, 1.3, 0]} material={body} castShadow><boxGeometry args={[1.5, 1.8, 2.1]} /></mesh>
      <mesh position={[2.86, 1.6, 0]} material={m.glass}><boxGeometry args={[0.03, 0.9, 1.8]} /></mesh>
      <mesh position={[2.86, 0.55, 0]} material={m.blackSteel}><boxGeometry args={[0.1, 0.25, 2.1]} /></mesh>
      {[[-1.9, 1.0], [-1.9, -1.0], [2.0, 1.0], [2.0, -1.0]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.42, z]} rotation={[Math.PI / 2, 0, 0]} material={tire}><cylinderGeometry args={[0.42, 0.42, 0.3, 18]} /></mesh>
      ))}
    </group>
  )
}
