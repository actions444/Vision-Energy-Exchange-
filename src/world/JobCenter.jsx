import { useEffect, useMemo } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface, signatureMarble } from './materials.js'
import { registerInteractable } from '../state/runtime.js'
import { useStore } from '../state/store.js'
import { Chair, Table, Counter, Sofa, Plant, CeilingLight, ClothingRack, Mannequin, Rug } from './furniture.jsx'
import { BrandSign } from './signs.jsx'
import { Chandelier } from './Chandelier.jsx'
import { Artwork, RoomSign } from './Justice.jsx'
import { DoubleDoor } from './Door.jsx'
import { RenovatedShell, EntranceDressing } from './facade/Renovated.jsx'
import { Wall, Gate, Kiosk, Block } from './jobkit.jsx'
import { canvasTexture } from './canvasText.js'
import { FONTS } from '../config/theme.js'
import { nightLit } from '../state/environment.js'
import { JC, CURB, JOBS, UNIFORMS } from '../config/jobs.js'

// ============================================================================
// JOB CENTER  (Vision Storms Employment District)
// Hiring hall on the west (reception, job board, seating), uniform shop and payroll desk on the east.
// Polished black marble, a crystal chandelier and artwork, like the district's other public buildings.
// Footprint x[54,76] z[30,48]; the front door faces the cross street (south).
// ============================================================================

const H = 7.2 // outer wall height
const JC_SPEC = {
  x0: JC.x0, x1: JC.x1, z0: JC.z0, z1: JC.z1, h: H + 4, ih: H, base: CURB, facing: '-z', wall: 'stone', seed: 11,
  door: { at: 63, half: 1.1, h: 2.6 },
  groundWindows: [{ at: 57.8, half: 2.2, v0: 0.9, v1: 3.8 }, { at: 70.5, half: 4, v0: 0.9, v1: 3.8 }],
  openings: { '+z': [{ at: 70.2, half: 0.9, door: true, v1: 3.0 }], '+x': [{ at: 40, half: 3, v0: 0.9, v1: 3.8 }] },
}
const CEIL = 6.6
const ZONE = 'job-center'
const PART_X = 66 // partition between the hiring hall and the shop wing

function boardTexture() {
  const cats = [...new Set(JOBS.map((j) => j.cat))]
  return canvasTexture(1280, 640, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, '#0d0a14'); g.addColorStop(1, '#1d1530')
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
    ctx.textAlign = 'left'
    ctx.fillStyle = '#d9b86a'; ctx.font = `800 70px ${FONTS.display}`
    ctx.fillText('NOW HIRING', 60, 110)
    ctx.fillStyle = '#f4f1ea'; ctx.font = `500 30px ${FONTS.mono}`
    ctx.fillText(`${JOBS.length} jobs · paid weekly, bi-weekly, monthly or yearly`, 60, 160)
    ctx.fillStyle = '#2fd0c4'; ctx.font = `600 34px ${FONTS.mono}`
    cats.forEach((c, i) => {
      const n = JOBS.filter((j) => j.cat === c).length
      const x = 60 + (i % 2) * 600, y = 250 + Math.floor(i / 2) * 70
      ctx.fillText(`${c}`.toUpperCase(), x, y)
      ctx.fillStyle = '#f4f1ea'; ctx.fillText(String(n), x + 440, y); ctx.fillStyle = '#2fd0c4'
    })
    ctx.fillStyle = '#e0559f'; ctx.font = `600 30px ${FONTS.mono}`
    ctx.fillText('Use a kiosk below to hire on. Uniform shop next door.', 60, 590)
  })
}

export default function JobCenter() {
  const m = getMaterials()
  const ext = useMemo(() => surface('limestone', 6, 1.2), [])
  const plaster = useMemo(() => surface('plaster', 4, 2), [])
  const marble = useMemo(() => signatureMarble(6, 5), [])
  const ceiling = useMemo(() => new THREE.MeshStandardMaterial({ color: '#efede8', roughness: 0.9 }), [])
  const upper = useMemo(() => m.windows(11, 6, 1), [m])
  const board = useMemo(() => {
    const t = boardTexture()
    return nightLit(new THREE.MeshStandardMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.9, roughness: 0.4 }), 1, 0.7)
  }, [])
  const R = JC
  const cx = (R.x0 + R.x1) / 2, cz = (R.z0 + R.z1) / 2
  const w = R.x1 - R.x0, d = R.z1 - R.z0
  const open = useStore((s) => s.openPanel)

  useEffect(() => {
    const at = (x, z) => new THREE.Vector3(x, CURB + 1, z)
    const panel = (tab) => () => open({ type: 'jobs', tab })
    const offs = [
      registerInteractable('jc-board', { position: at(57.4, 40.5), radius: 3.6, label: () => 'Job board · hire on', onInteract: panel('jobs') }),
      registerInteractable('jc-shop', { position: at(72, 33.4), radius: 2.4, label: () => 'Uniform shop · buy uniforms', onInteract: panel('uniforms') }),
      registerInteractable('jc-payroll', { position: at(72.4, 40.5), radius: 2.2, label: () => 'Payroll desk · pay schedule & ledger', onInteract: panel('pay') }),
    ]
    return () => offs.forEach((o) => o())
  }, [open])

  // uniform-coloured mannequins for the shop window
  const uniforms = Object.values(UNIFORMS)

  return (
    <group>
      {/* shell: colliders from the Wall pieces, visuals from the renovation kit (brick-free limestone, recessed glazing) */}
      <Wall side="s" rect={R} h={H} ext={ext} int={plaster} invisible
        openings={[{ at: 63, half: 1.1, h: 2.6 }, { at: 57.8, half: 2.2, glass: true, h: 3.8 }, { at: 70.5, half: 4, glass: true, h: 3.8 }]} />
      <Wall side="n" rect={R} h={H} ext={ext} int={plaster} invisible openings={[{ at: 70.2, half: 0.9, h: 3.0 }]} />
      <Wall side="w" rect={R} h={H} ext={ext} int={plaster} invisible />
      <Wall side="e" rect={R} h={H} ext={ext} int={plaster} invisible openings={[{ at: 40, half: 3, glass: true, h: 3.8 }]} />
      <RenovatedShell spec={JC_SPEC} />
      <mesh position={[cx, CURB + H + 0.15, cz]} material={ceiling}><boxGeometry args={[w - 0.8, 0.3, d - 0.8]} /></mesh>
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[(w - 0.6) / 2, 2.2, (d - 0.6) / 2]} position={[cx, CURB + H + 2.2, cz]} /></RigidBody>
      <EntranceDressing origin={[63, R.z0]} base={CURB} name="JOB CENTER" sub="HIRING · UNIFORMS · PAYROLL" doorHalf={1.1} doorH={2.6} yaw={Math.PI} signWidth={7.6} parts={{ forecourt: false, benches: false }} />
      <DoubleDoor id="door-jobcenter" center={[63, CURB, R.z0 + 0.2]} halfWidth={1.1} height={2.6} facing={Math.PI} accent="#c9a96a" label="Job Center doors" finish="bronze" />
      <DoubleDoor id="door-jobcenter-n" center={[70.2, CURB, R.z1 - 0.2]} halfWidth={0.9} height={3.0} facing={0} accent="#c9a96a" label="courtyard doors" finish="bronze" />

      <Gate x0={R.x0} x1={R.x1} z0={R.z0} z1={R.z1} pad={9}>
        <group>
          <mesh position={[cx, CURB + 0.014, cz]} rotation={[-Math.PI / 2, 0, 0]} material={marble} receiveShadow><planeGeometry args={[w - 0.8, d - 0.8]} /></mesh>
          {/* partition: hall | shop, with a wide arch */}
          <Wall side="w" rect={{ x0: PART_X, x1: PART_X + 0.3, z0: R.z0 + 0.4, z1: R.z1 - 0.4 }} h={CEIL} t={0.3} ext={plaster} int={plaster}
            openings={[{ at: 38, half: 2.2, h: 3.4 }]} />

          {/* ---- hiring hall ---- */}
          <Chandelier position={[60, CURB + CEIL, 40]} type="crystal" size={1.4} drop={1.3} zone={ZONE} />
          {[[57, 34], [63, 34], [57, 40], [63, 44], [57, 45]].map(([x, z], i) => <CeilingLight key={i} position={[x, CURB + CEIL - 0.02, z]} zone={ZONE} intensity={16} />)}
          {/* reception counter (visitors stand on the south side) */}
          <Counter position={[60.7, CURB, 34.6]} yaw={Math.PI} length={5.4} depth={0.7} />
          <Block position={[58.2, CURB + 0.55, 33.7]} size={[0.5, 1.1, 0.5]} material={m.blackSteel} />
          <mesh position={[58.2, CURB + 1.13, 33.7]} rotation={[-0.4, 0, 0]}><planeGeometry args={[0.42, 0.28]} /><meshBasicMaterial color="#2fd0c4" toneMapped={false} /></mesh>
          <RoomSign text="RECEPTION" position={[60.7, CURB + 3.0, 36.3]} rotation={[0, Math.PI, 0]} width={3} color="#2a1d05" glow="#ffd98a" />
          {/* job board: wall display and three kiosks */}
          <mesh position={[54.43, CURB + 3.2, 40.5]} rotation={[0, Math.PI / 2, 0]} material={board}><planeGeometry args={[9.6, 4.8]} /></mesh>
          {[37.5, 40.5, 43.5].map((z) => <Kiosk key={z} position={[56.2, CURB, z]} yaw={Math.PI / 2} screen="#d9b86a" />)}
          {/* seating */}
          <Rug position={[63.6, CURB + 0.01, 42]} size={[3, 4]} color="#3a2f4a" />
          <Sofa position={[65.2, CURB, 42.6]} yaw={-Math.PI / 2} length={2.6} color="#3c3350" />
          <Chair position={[62.4, CURB, 40.6]} yaw={Math.PI / 2} color="#3c3350" />
          <Chair position={[62.4, CURB, 44.2]} yaw={Math.PI / 2} color="#3c3350" />
          {/* bins and plants */}
          <Block position={[63.6, CURB + 0.4, 38.6]} size={[0.5, 0.8, 0.5]} material={m.chrome} />
          <Plant position={[55.4, CURB, 31.4]} scale={1.2} />
          <Plant position={[65.0, CURB, 47.0]} scale={1.2} />
          {/* back office: cabinets, copier, desk */}
          {[56.6, 57.4, 58.2].map((x) => <Block key={x} position={[x, CURB + 0.7, 47.2]} size={[0.74, 1.4, 0.7]} material={m.aluminum} />)}
          <Block position={[61.2, CURB + 0.55, 47.1]} size={[0.9, 1.1, 0.7]} material={m.blackSteel} />
          <Table position={[63.6, CURB, 45.7]} size={[1.6, 0.8]} />
          <Chair position={[63.6, CURB, 46.7]} yaw={Math.PI} color="#2b2f38" />
          <TimeClock position={[64.5, CURB, 31.6]} />
          {/* art */}
          <Artwork position={[60.6, CURB + 4.4, 47.78]} rotation={[0, Math.PI, 0]} size={[4.2, 2.2]} seed={5} />
          <Artwork position={[60.6, CURB + 4.4, 30.62]} rotation={[0, 0, 0]} size={[3.2, 1.8]} seed={6} />

          {/* ---- uniform shop and payroll ---- */}
          {[[69, 34], [74, 34], [70, 40], [72, 45]].map(([x, z], i) => <CeilingLight key={'s' + i} position={[x, CURB + CEIL - 0.02, z]} zone={ZONE} intensity={14} />)}
          <Counter position={[72, CURB, 34.6]} yaw={Math.PI} length={3.2} depth={0.7} />
          <RoomSign text="UNIFORM SHOP" position={[72, CURB + 3.0, 36.3]} rotation={[0, Math.PI, 0]} width={3.2} color="#0e2a5c" glow="#8fb6ff" />
          {uniforms.slice(0, 4).map((u, i) => <Mannequin key={u.id} position={[67.6 + i * 1.8, CURB, 31.6]} yaw={Math.PI} color={u.suit} />)}
          <ClothingRack position={[68.2, CURB, 47.0]} yaw={Math.PI} seed={2} />
          <ClothingRack position={[72.2, CURB, 47.0]} yaw={Math.PI} seed={5} />
          <Counter position={[73.6, CURB, 40.5]} yaw={-Math.PI / 2} length={3.4} depth={0.7} />
          <RoomSign text="PAYROLL & CREDIT" position={[75.55, CURB + 3.0, 40.5]} rotation={[0, -Math.PI / 2, 0]} width={3.2} color="#0e3a2a" glow="#8fffd6" />
          <Plant position={[67.0, CURB, 31.2]} scale={1.1} />
          <Plant position={[75.0, CURB, 31.2]} scale={1.1} />
        </group>
      </Gate>
    </group>
  )
}

/** Time clock: clock in or out for jobs based at the Job Center. */
export function TimeClock({ position, label = 'Time clock' }) {
  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.22, 0.6, 0.2]} position={[0, 0.6, 0]} /></RigidBody>
      <mesh position={[0, 0.6, 0]} castShadow><boxGeometry args={[0.44, 1.2, 0.36]} /><meshStandardMaterial color="#1b1b1f" roughness={0.4} metalness={0.5} /></mesh>
      <mesh position={[0, 1.0, 0.19]}><planeGeometry args={[0.32, 0.2]} /><meshBasicMaterial color="#4fe0a0" toneMapped={false} /></mesh>
      <mesh position={[0, 0.74, 0.19]}><planeGeometry args={[0.2, 0.08]} /><meshBasicMaterial color="#ffb020" toneMapped={false} /></mesh>
    </group>
  )
}
