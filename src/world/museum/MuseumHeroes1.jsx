import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { registerInteractable } from '../../state/runtime.js'
import { useStore } from '../../state/store.js'
import { useSeats } from '../../state/seats.js'
import { inst } from '../../audio/instruments.js'
import { mm, canvasTex, parchmentTex, Placard, Plinth, GlassCase, FY, hash, ledMat, Bar } from './kit.jsx'

// Founding & Democracy, Voices for Equality and the foyer: the US map table, Liberty Bell replica, the Declaration and
// Constitution facsimiles, the flag, an eagle, the lunch counter and the Golden Door. All original geometry.

const fwd = (yaw, d) => [Math.sin(yaw) * d, Math.cos(yaw) * d]

// ------------------------------------------------------------------ flag
function flagTex() {
  return canvasTex(760, 400, (g, w, h) => {
    const sh = h / 13
    for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#f4f2ee' : '#b22234'; g.fillRect(0, i * sh, w, sh + 1) }
    const cw = w * 0.4, ch = sh * 7
    g.fillStyle = '#3c3b6e'; g.fillRect(0, 0, cw, ch)
    g.fillStyle = '#fff'
    const star = (x, y, r) => { g.beginPath(); for (let p = 0; p < 10; p++) { const a = -Math.PI / 2 + (p * Math.PI) / 5, rr = p % 2 ? r * 0.4 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) } g.closePath(); g.fill() }
    for (let row = 0; row < 9; row++) {
      const n = row % 2 ? 5 : 6
      for (let k = 0; k < n; k++) star(cw * ((row % 2 ? 2 : 1) + k * 2) / 12.2 + cw * 0.0, ch * (row + 1) / 10, ch * 0.05)
    }
  })
}
let _flagTex
export function Flag({ width = 1.9, height = 1, amp = 0.12, speed = 2.2, position = [0, 0, 0], rotation = [0, 0, 0] }) {
  const tex = (_flagTex ||= flagTex())
  const geo = useMemo(() => { const g = new THREE.PlaneGeometry(width, height, 22, 12); g.translate(width / 2, 0, 0); return g }, [width, height])
  const orig = useMemo(() => geo.attributes.position.array.slice(), [geo])
  const phase = useMemo(() => Math.random() * 6, [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase, p = geo.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = orig[i * 3], y = orig[i * 3 + 1], k = x / width
      p.setZ(i, (Math.sin(x * 4.2 - t * speed + y * 0.9) * 0.7 + Math.sin(x * 7.1 - t * speed * 1.3) * 0.3) * amp * k)
      p.setY(i, y - k * k * 0.03 * Math.sin(t * 0.8))
    }
    p.needsUpdate = true
    geo.computeVertexNormals()
  })
  return <mesh geometry={geo} position={position} rotation={rotation} userData={{ noBatch: true }} frustumCulled={false} castShadow><meshStandardMaterial map={tex} roughness={0.85} side={THREE.DoubleSide} /></mesh>
}

/** A flagpole. Outdoors: tall white pole. Indoors (`indoor`): brass pole on a marble base with its placard. position = [x, y, z]. */
export function FlagPole({ position, h = 9, indoor = false, yaw = 0, placard }) {
  const m = mm()
  const [px, py, pz] = position
  const fw = indoor ? 1.9 : 2.1
  return (
    <>
      <group position={[px, py, pz]}>
        <RigidBody type="fixed" colliders={false}><CylinderCollider args={[0.3, indoor ? 0.55 : 0.2]} position={[0, 0.3, 0]} /></RigidBody>
        {indoor ? (
          <>
            <mesh position={[0, 0.16, 0]} material={m.stoneSmooth} castShadow><cylinderGeometry args={[0.6, 0.66, 0.32, 28]} /></mesh>
            <mesh position={[0, 0.34, 0]} material={m.brass}><cylinderGeometry args={[0.48, 0.52, 0.06, 28]} /></mesh>
          </>
        ) : <mesh position={[0, 0.2, 0]} material={m.stoneSmooth}><cylinderGeometry args={[0.28, 0.34, 0.4, 16]} /></mesh>}
        <mesh position={[0, h / 2, 0]} material={indoor ? m.brass : m.chrome} castShadow><cylinderGeometry args={[0.04, 0.05, h, 12]} /></mesh>
        <mesh position={[0, h + 0.05, 0]} material={m.brass}><sphereGeometry args={[0.1, 14, 10]} /></mesh>
        <group position={[0.02, h - 0.62, 0]} rotation={[0, indoor ? yaw : Math.PI / 2, 0]}>
          <Flag width={fw} height={fw / 1.9} amp={indoor ? 0.09 : 0.2} speed={indoor ? 1.6 : 2.6} />
        </group>
      </group>
      {placard && <Placard id={placard} position={[px + Math.sin(yaw) * 1.5, 0, pz + Math.cos(yaw) * 1.5]} yaw={yaw} y={py} />}
    </>
  )
}

// ------------------------------------------------------------------ eagle
export function EagleStatue({ position }) {
  const m = mm()
  const feathers = useMemo(() => Array.from({ length: 7 }, (_, i) => i), [])
  return (
    <Plinth position={[position[0], 0, position[1]]} size={[1.0, 1.1, 1.0]} material={m.stoneSmooth}>
      <group position={[0, 0.05, 0]}>
        <mesh position={[0, 0.09, 0]} material={m.bronze}><cylinderGeometry args={[0.36, 0.4, 0.1, 22]} /></mesh>
        <mesh position={[0, 0.5, 0]} scale={[0.26, 0.4, 0.3]} material={m.bronze} castShadow><sphereGeometry args={[1, 20, 14]} /></mesh>
        <mesh position={[0, 0.95, 0.06]} scale={[0.13, 0.15, 0.14]} material={m.bronze}><sphereGeometry args={[1, 16, 12]} /></mesh>
        <mesh position={[0, 0.93, 0.22]} rotation={[Math.PI / 2 + 0.5, 0, 0]} material={m.brass}><coneGeometry args={[0.055, 0.2, 8]} /></mesh>
        {[-1, 1].map((s) => <group key={s} position={[s * 0.2, 0.62, -0.02]} rotation={[0, 0, s * -0.35]}>
          {feathers.map((i) => (
            <mesh key={i} position={[s * (0.22 + i * 0.1), 0.15 + i * 0.075, -i * 0.01]} rotation={[0, 0, s * (-0.6 - i * 0.07)]} material={m.bronze} castShadow>
              <boxGeometry args={[0.1, 0.62 - i * 0.04, 0.025]} />
            </mesh>
          ))}
        </group>)}
        {[-1, 0, 1].map((i) => <mesh key={i} position={[i * 0.07, 0.22, -0.3]} rotation={[0.9, i * 0.25, 0]} material={m.bronze}><boxGeometry args={[0.07, 0.36, 0.02]} /></mesh>)}
        {[-1, 1].map((s) => <mesh key={s} position={[s * 0.1, 0.16, 0.05]} material={m.brass}><boxGeometry args={[0.03, 0.2, 0.03]} /></mesh>)}
      </group>
    </Plinth>
  )
}

// ------------------------------------------------------------------ Liberty Bell
const bellProfile = () => [[0.47, 0], [0.485, 0.025], [0.47, 0.07], [0.43, 0.14], [0.385, 0.27], [0.34, 0.42], [0.3, 0.58], [0.265, 0.73], [0.23, 0.87], [0.185, 0.98], [0.12, 1.06], [0.05, 1.1], [0, 1.11]].map(([r, y]) => new THREE.Vector2(r, y))
function bandTex() {
  return canvasTex(2048, 96, (g, w, h) => {
    g.clearRect(0, 0, w, h)
    g.fillStyle = 'rgba(30,18,6,0.85)'; g.font = '700 54px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillText('PROCLAIM LIBERTY THROUGHOUT ALL THE LAND UNTO ALL THE INHABITANTS THEREOF', w / 2, h / 2)
  })
}

export function LibertyBell({ position }) {
  const [x, z] = position
  const m = mm()
  const swing = useRef()
  const st = useRef({ amp: 0, t0: 0 })
  const prof = useMemo(bellProfile, [])
  const band = useMemo(() => bandTex(), [])
  const bronze = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9a7440', roughness: 0.42, metalness: 0.85, side: THREE.DoubleSide }), [])
  useFrame(({ clock }) => {
    if (!swing.current) return
    const t = clock.elapsedTime - st.current.t0
    swing.current.rotation.x = st.current.amp > 0.002 ? st.current.amp * Math.exp(-0.32 * t) * Math.sin(2.5 * t) : 0
  })
  const clockRef = useRef({ t: 0 })
  useFrame(({ clock }) => { clockRef.current.t = clock.elapsedTime })
  useEffect(() => registerInteractable('ring-bell', {
    position: new THREE.Vector3(x - 1.0, FY + 1, z + 1.9),
    radius: 2.3,
    label: 'Ring the Liberty Bell replica',
    onInteract: () => {
      st.current = { amp: 0.4, t0: clockRef.current.t || 0 }
      inst.bell()
      useStore.getState().showToast('The replica bell rings. The original cracked and has not been rung since 1846.')
    },
  }), [x, z])
  // yoke posts + crossbeam; the bell hangs from the beam and swings about it
  const BEAM = 2.35
  return (
    <>
    <group position={[x, FY, z]}>
      <RigidBody type="fixed" colliders={false}><CylinderCollider args={[0.2, 1.5]} position={[0, 0.2, 0]} /></RigidBody>
      <mesh position={[0, 0.12, 0]} material={m.stoneSmooth} receiveShadow castShadow><cylinderGeometry args={[1.5, 1.55, 0.24, 40]} /></mesh>
      <mesh position={[0, 0.26, 0]} material={m.brass}><cylinderGeometry args={[1.42, 1.42, 0.04, 40]} /></mesh>
      <mesh position={[0, 0.3, 0]} material={m.navy}><cylinderGeometry args={[1.3, 1.3, 0.04, 40]} /></mesh>
      {[-1, 1].map((s) => <group key={s}>
        <mesh position={[s * 0.82, BEAM / 2 + 0.28, 0]} material={m.walnutSolid} castShadow><boxGeometry args={[0.18, BEAM, 0.18]} /></mesh>
        <mesh position={[s * 0.82, 0.38, 0]} material={m.brass}><boxGeometry args={[0.26, 0.12, 0.26]} /></mesh>
        <mesh position={[s * 0.82, BEAM + 0.3, 0]} material={m.brass}><sphereGeometry args={[0.13, 12, 10]} /></mesh>
      </group>)}
      <mesh position={[0, BEAM + 0.16, 0]} material={m.walnutSolid} castShadow><boxGeometry args={[1.95, 0.2, 0.22]} /></mesh>
      <group ref={swing} position={[0, BEAM + 0.06, 0]} userData={{ noBatch: true }}>
        <mesh position={[0, -0.12, 0]} material={m.walnutSolid}><boxGeometry args={[0.5, 0.16, 0.24]} /></mesh>
        <group position={[0, -1.27, 0]}>
          <mesh material={bronze} castShadow><latheGeometry args={[prof, 44]} /></mesh>
          <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.bronze}><torusGeometry args={[0.455, 0.02, 8, 44]} /></mesh>
          <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.bronze}><torusGeometry args={[0.41, 0.014, 8, 44]} /></mesh>
          <mesh position={[0, 0.48, 0]}><cylinderGeometry args={[0.318, 0.352, 0.22, 44, 1, true]} /><meshBasicMaterial map={band} transparent depthWrite={false} side={THREE.FrontSide} /></mesh>
          {/* the famous crack */}
          {[[0.2, 0.0], [0.28, 0.02], [0.36, 0.0], [0.46, 0.025], [0.55, 0.0], [0.62, 0.015]].map(([y, dx], i) => <mesh key={i} position={[0.04 + dx, y, 0.41 - y * 0.2]} rotation={[0, 0, (i % 2 ? 0.25 : -0.2)]} material={m.black}><boxGeometry args={[0.012, 0.09, 0.008]} /></mesh>)}
          <mesh position={[0, 0.2, 0]} material={m.bronze}><sphereGeometry args={[0.07, 10, 8]} /></mesh>
        </group>
      </group>
    </group>
    <Placard id="bell" position={[x + 1.5, 0, z + 2.5]} yaw={0} y={FY} />
    </>
  )
}

// ------------------------------------------------------------------ Declaration / Constitution
const DECL_LINES = ['When in the Course of human events, it', 'becomes necessary for one people to dissolve', 'the political bands which have connected them', 'with another, and to assume among the powers', 'of the earth, the separate and equal station', 'to which the Laws of Nature entitle them...', [0], [0], [0], [0], [0], [0], [0], [0]]
const CONST_LINES = ['of the United States, in Order to form a more', 'perfect Union, establish Justice, insure', 'domestic Tranquility, provide for the common', 'defence, promote the general Welfare, and secure', 'the Blessings of Liberty to ourselves and our', 'Posterity, do ordain and establish this', 'Constitution for the United States of America.', [0], [0], [0], [0], [0]]
export function DocumentCase({ id, position, yaw = 0 }) {
  const [x, z] = position
  const m = mm()
  const tex = useMemo(() => (id === 'declaration'
    ? parchmentTex(['IN CONGRESS,', 'July 4, 1776.'], DECL_LINES, { sub: 'The unanimous Declaration of the thirteen united States of America', w: 640, h: 800, seed: 3 })
    : parchmentTex(['We the People'], CONST_LINES, { w: 640, h: 800, seed: 9, sig: true })), [id])
  const label = useMemo(() => canvasTex(256, 48, (g, w, h) => { g.fillStyle = '#17202e'; g.fillRect(0, 0, w, h); g.fillStyle = '#cfa94e'; g.font = '700 22px sans-serif'; g.textAlign = 'center'; g.fillText('FACSIMILE · PRINTED REPLICA', w / 2, 31) }), [])
  const led = useMemo(() => ledMat(), [])
  const [fx, fz] = fwd(yaw, 1.6)
  return (
    <group>
      <group position={[x, FY, z]} rotation={[0, yaw, 0]}>
        <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.7, 0.65, 0.5]} position={[0, 0.65, 0]} /></RigidBody>
        <mesh position={[0, 0.45, 0]} material={m.walnutSolid} castShadow><boxGeometry args={[1.4, 0.9, 0.95]} /></mesh>
        <mesh position={[0, 0.9, 0]} material={m.brass}><boxGeometry args={[1.46, 0.05, 1.0]} /></mesh>
        <mesh position={[0, 0.43, 0.48]}><planeGeometry args={[0.7, 0.13]} /><meshBasicMaterial map={label} /></mesh>
        <group position={[0, 1.15, 0]} rotation={[-0.45, 0, 0]}>
          <mesh position={[0, 0, 0]} material={m.black}><boxGeometry args={[1.18, 1.46, 0.04]} /></mesh>
          <mesh position={[0, 0, 0.025]}><planeGeometry args={[1.0, 1.26]} /><meshStandardMaterial map={tex} roughness={0.8} /></mesh>
          <mesh position={[0, 0, 0.09]} material={m.glass} userData={{ noBatch: true }}><boxGeometry args={[1.14, 1.42, 0.02]} /></mesh>
          <mesh position={[0, 0.76, 0.06]} material={m.brass}><boxGeometry args={[1.24, 0.06, 0.14]} /></mesh>
          <mesh position={[0, 0.745, 0.12]} material={led}><boxGeometry args={[1.1, 0.012, 0.04]} /></mesh>
        </group>
        {[-1, 1].map((s) => <mesh key={s} position={[s * 0.64, 1.25, -0.08]} rotation={[-0.45, 0, 0]} material={m.brass}><boxGeometry args={[0.06, 1.5, 0.08]} /></mesh>)}
      </group>
      <Placard id={id} position={[x + fx, 0, z + fz]} yaw={yaw} y={FY} reach={0.8} />
    </group>
  )
}

// ------------------------------------------------------------------ map table
const US = [[-123.0, 49.0], [-95.2, 49.0], [-94.6, 48.7], [-93.0, 48.6], [-91.5, 48.1], [-89.6, 48.0], [-88.2, 47.4], [-86.5, 46.5], [-84.6, 46.5], [-83.4, 46.0], [-82.5, 43.0], [-83.1, 42.1], [-82.7, 41.5], [-79.0, 42.7], [-76.5, 43.6], [-74.7, 45.0], [-71.5, 45.0], [-70.8, 45.2], [-70.3, 46.3], [-69.2, 47.45], [-68.3, 47.35], [-67.8, 47.07], [-67.8, 45.7], [-67.0, 44.8], [-68.5, 44.3], [-70.2, 43.6], [-70.7, 42.9], [-70.9, 42.3], [-70.0, 41.8], [-71.0, 41.5], [-72.0, 41.3], [-73.7, 40.9], [-74.0, 40.5], [-74.1, 39.7], [-75.0, 38.9], [-75.2, 38.0], [-75.9, 37.1], [-76.3, 36.9], [-75.5, 35.3], [-77.0, 34.6], [-78.5, 33.9], [-79.9, 32.7], [-81.1, 31.6], [-81.4, 30.4], [-80.6, 28.4], [-80.0, 26.8], [-80.1, 25.5], [-81.1, 25.2], [-81.8, 26.4], [-82.7, 27.8], [-82.8, 29.2], [-84.0, 30.1], [-85.4, 29.7], [-86.5, 30.4], [-88.0, 30.3], [-89.4, 30.2], [-89.4, 29.0], [-90.6, 29.1], [-92.0, 29.6], [-93.8, 29.7], [-95.0, 29.2], [-96.8, 28.2], [-97.4, 27.0], [-97.2, 25.9], [-99.1, 26.4], [-99.5, 27.5], [-100.6, 28.9], [-101.4, 29.8], [-102.4, 29.8], [-103.1, 29.0], [-104.5, 29.6], [-104.7, 30.2], [-106.5, 31.8], [-108.2, 31.8], [-108.2, 31.3], [-111.1, 31.3], [-114.8, 32.5], [-117.1, 32.5], [-117.3, 33.1], [-118.4, 33.8], [-119.2, 34.1], [-120.6, 34.6], [-121.9, 36.6], [-122.5, 37.7], [-123.8, 39.4], [-124.4, 40.4], [-124.1, 42.0], [-124.5, 42.8], [-124.1, 44.0], [-123.9, 46.2], [-124.1, 46.9], [-124.7, 48.4], [-123.1, 48.2]]
function mapTex() {
  return canvasTex(1536, 960, (g, w, h) => {
    const ocean = g.createLinearGradient(0, 0, 0, h); ocean.addColorStop(0, '#2c5b82'); ocean.addColorStop(1, '#1d4163'); g.fillStyle = ocean; g.fillRect(0, 0, w, h)
    g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 1
    for (let x = 0; x < w; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke() }
    for (let y = 0; y < h; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke() }
    const mw = 940, mx0 = 40, my0 = 70
    const k = 0.79 // cos(38 deg)
    const px = (lon) => mx0 + (lon + 125) * k * (mw / (60 * k)), py = (lat) => my0 + (50 - lat) * (mw / (60 * k)) * 1.0
    g.beginPath(); US.forEach(([lo, la], i) => (i ? g.lineTo(px(lo), py(la)) : g.moveTo(px(lo), py(la)))); g.closePath()
    const land = g.createLinearGradient(0, 0, w, 0); land.addColorStop(0, '#6d9a62'); land.addColorStop(0.5, '#c4b377'); land.addColorStop(1, '#7ca56d')
    g.fillStyle = land; g.fill(); g.strokeStyle = '#f4efe2'; g.lineWidth = 4; g.stroke()
    // a few large rivers and lakes for orientation
    g.strokeStyle = 'rgba(70,130,190,0.9)'; g.lineWidth = 3
    g.beginPath(); for (const [lo, la] of [[-89.1, 47.5], [-93, 44], [-91, 40], [-90.2, 37], [-90.2, 33], [-91.2, 30], [-89.2, 29.1]]) g.lineTo(px(lo), py(la)); g.stroke()
    g.beginPath(); for (const [lo, la] of [[-106, 40], [-100, 38], [-95, 38.5], [-90.2, 38.7]]) g.lineTo(px(lo), py(la)); g.stroke()
    g.fillStyle = '#5fa0d8'; for (const [lo, la, r] of [[-87.2, 43.8, 26], [-84.5, 44.0, 18], [-80.9, 42.2, 16], [-85.8, 47.0, 26]]) { g.beginPath(); g.ellipse(px(lo), py(la), r * 0.5, r, 0, 0, 7); g.fill() }
    // Washington, D.C.
    const dc = [px(-77.0), py(38.9)]
    g.fillStyle = '#a8322d'; g.beginPath(); for (let p = 0; p < 10; p++) { const a = -Math.PI / 2 + (p * Math.PI) / 5, rr = p % 2 ? 7 : 18; g.lineTo(dc[0] + Math.cos(a) * rr, dc[1] + Math.sin(a) * rr) } g.closePath(); g.fill()
    g.fillStyle = '#fff'; g.font = '700 22px sans-serif'; g.fillText('Washington, D.C.', dc[0] - 30, dc[1] + 40)
    g.font = '700 26px Georgia, serif'; g.fillStyle = 'rgba(20,35,20,0.7)'; g.textAlign = 'center'
    g.fillText('UNITED STATES', px(-98), py(38)); g.font = '18px Georgia, serif'; g.fillText('fifty states · one nation', px(-98), py(38) + 26)
    g.textAlign = 'left'
    // Alaska and Hawaii insets
    g.fillStyle = '#6d9a62'; g.strokeStyle = '#f4efe2'; g.lineWidth = 3
    g.beginPath(); g.moveTo(70, 780); g.lineTo(140, 740); g.lineTo(220, 750); g.lineTo(250, 800); g.lineTo(200, 810); g.lineTo(190, 850); g.lineTo(150, 830); g.lineTo(120, 870); g.lineTo(80, 850); g.closePath(); g.fill(); g.stroke()
    g.fillStyle = '#fff'; g.font = '700 20px sans-serif'; g.fillText('ALASKA', 110, 800)
    for (const [x, y, r] of [[350, 830, 14], [372, 842, 9], [330, 818, 7], [392, 852, 12], [420, 868, 22]]) { g.fillStyle = '#6d9a62'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke() }
    g.fillStyle = '#fff'; g.fillText('HAWAII', 330, 800)
    // museum plan on the right
    const ox = 1010, oy = 80, sc = 11.2
    const X = (mx) => ox + (mx - 24) * sc / 2.0, Z = (mz) => oy + (mz + 122) * sc / 2.0
    g.fillStyle = 'rgba(244,239,226,0.95)'; g.fillRect(ox - 30, oy - 50, 500, 460)
    g.fillStyle = '#17202e'; g.font = '700 26px Georgia, serif'; g.fillText('MUSEUM PLAN', ox - 8, oy - 14)
    const room = (x0, z0, x1, z1, col, label) => { g.fillStyle = col; g.fillRect(X(x0), Z(z0), X(x1) - X(x0), Z(z1) - Z(z0)); g.strokeStyle = '#17202e'; g.lineWidth = 2; g.strokeRect(X(x0), Z(z0), X(x1) - X(x0), Z(z1) - Z(z0)); g.fillStyle = '#17202e'; g.font = '700 15px sans-serif'; g.textAlign = 'center'; label.split('\n').forEach((l, i) => g.fillText(l, (X(x0) + X(x1)) / 2, (Z(z0) + Z(z1)) / 2 + 5 + i * 16 - (label.includes('\n') ? 8 : 0))) }
    room(24.5, -113, 37, -93, '#f0e6c8', 'FOYER')
    room(37, -113, 57, -93, '#f6d5cf', 'ROTUNDA\nFounding &\nDemocracy')
    room(24.5, -121.5, 37, -113, '#dccbef', 'SOUND OF\nAMERICA')
    room(37, -121.5, 69.5, -113, '#cfe8d6', 'LAND & LIFE')
    room(57, -113, 69.5, -93, '#cfdcf4', 'FLIGHT &\nSPACE')
    room(37, -93, 69.5, -84.5, '#f0d8bf', 'INDUSTRY & INNOVATION')
    room(24.5, -93, 37, -84.5, '#f3d9b4', 'VOICES FOR\nEQUALITY')
    g.textAlign = 'left'
    g.fillStyle = '#a8322d'; g.beginPath(); g.moveTo(X(24) - 4, Z(-103)); g.lineTo(X(24) - 28, Z(-103) - 12); g.lineTo(X(24) - 28, Z(-103) + 12); g.closePath(); g.fill()
    g.fillStyle = '#17202e'; g.font = '700 14px sans-serif'; g.fillText('ENTRANCE', X(24) - 14, Z(-103) + 32)
  }, { aniso: 8 })
}
export function MapTable({ position }) {
  const [x, z] = position
  const m = mm()
  const tex = useMemo(() => mapTex(), [])
  return (
    <group>
      <group position={[x, FY, z]}>
        <RigidBody type="fixed" colliders={false}><CuboidCollider args={[1.7, 0.5, 1.1]} position={[0, 0.5, 0]} /></RigidBody>
        <mesh position={[0, 0.55, 0]} material={m.walnutSolid} castShadow><boxGeometry args={[2.6, 0.9, 1.5]} /></mesh>
        <mesh position={[0, 0.2, 0]} material={m.brass}><boxGeometry args={[2.7, 0.04, 1.6]} /></mesh>
        <group position={[0, 1.12, 0]} rotation={[-0.2, 0, 0]}>
          <mesh material={m.walnutSolid} castShadow><boxGeometry args={[3.3, 0.1, 2.1]} /></mesh>
          <mesh position={[0, 0.056, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[3.1, 1.94]} /><meshStandardMaterial map={tex} roughness={0.5} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.22} /></mesh>
          <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.glass} userData={{ noBatch: true }}><planeGeometry args={[3.1, 1.94]} /></mesh>
          {[[-1.66, 0], [1.66, 0]].map(([dx], i) => <mesh key={i} position={[dx, 0.04, 0]} material={m.brass}><boxGeometry args={[0.05, 0.1, 2.14]} /></mesh>)}
          {[-1.06, 1.06].map((dz, i) => <mesh key={i} position={[0, 0.04, dz]} material={m.brass}><boxGeometry args={[3.36, 0.1, 0.05]} /></mesh>)}
        </group>
      </group>
      <Placard id="map" position={[x + 2.0, 0, z + 1.2]} yaw={Math.PI / 2 + 0.5} y={FY} reach={0.8} />
    </group>
  )
}

// ------------------------------------------------------------------ lunch counter (Greensboro sit-in)
function FiguresAndStools({ x0, z, n, dx, figures }) {
  const m = mm()
  const bronze = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3a2f27', roughness: 0.5, metalness: 0.6 }), [])
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const sx = x0 + i * dx
        return (
          <group key={i} position={[sx, FY, z]}>
            <mesh position={[0, 0.34, 0]} material={m.chrome}><cylinderGeometry args={[0.04, 0.04, 0.64, 10]} /></mesh>
            <mesh position={[0, 0.03, 0]} material={m.chrome}><cylinderGeometry args={[0.2, 0.22, 0.05, 20]} /></mesh>
            <mesh position={[0, 0.25, 0.1]} rotation={[Math.PI / 2, 0, 0]} material={m.chrome}><torusGeometry args={[0.15, 0.012, 6, 20]} /></mesh>
            <mesh position={[0, 0.68, 0]} material={m.red} castShadow><cylinderGeometry args={[0.22, 0.2, 0.1, 22]} /></mesh>
            <mesh position={[0, 0.63, 0]} material={m.chrome}><cylinderGeometry args={[0.215, 0.215, 0.025, 22]} /></mesh>
            {i < figures && <group>
              {/* seated bronze figure facing the counter (+z) */}
              <mesh position={[0, 1.02, -0.02]} material={bronze} castShadow><boxGeometry args={[0.36, 0.5, 0.2]} /></mesh>
              <mesh position={[0, 1.4, 0]} material={bronze}><sphereGeometry args={[0.11, 14, 10]} /></mesh>
              <mesh position={[0, 0.82, 0.22]} rotation={[Math.PI / 2 - 0.1, 0, 0]} material={bronze}><boxGeometry args={[0.28, 0.5, 0.12]} /></mesh>
              {[-1, 1].map((s) => <mesh key={s} position={[s * 0.21, 1.0, 0.12]} rotation={[0.8, 0, 0]} material={bronze}><boxGeometry args={[0.08, 0.4, 0.08]} /></mesh>)}
              {[-1, 1].map((s) => <mesh key={s} position={[s * 0.1, 0.4, 0.34]} material={bronze}><boxGeometry args={[0.12, 0.5, 0.14]} /></mesh>)}
            </group>}
          </group>
        )
      })}
    </>
  )
}
export function LunchCounter({ position }) {
  const [x, z] = position
  const m = mm()
  const N = 8, DX = 1.1, X0 = x - 4.0
  const seats = useMemo(() => Array.from({ length: 4 }, (_, i) => ({ id: `mus-stool-${i}`, position: [X0 + (4 + i) * DX, FY + 0.73, z - 1.0], yaw: 0, height: 0.73, label: 'Sit at the lunch counter' })), [X0, z])
  useSeats(seats, [x, z])
  const plaque = useMemo(() => canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#17202e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#cfa94e'; g.lineWidth = 5; g.strokeRect(8, 8, w - 16, h - 16)
    g.fillStyle = '#cfa94e'; g.textAlign = 'center'; g.font = '700 26px Georgia, serif'; g.fillText('GREENSBORO, NORTH CAROLINA', w / 2, 52)
    g.fillStyle = '#f4efe2'; g.font = '700 30px Georgia, serif'; g.fillText('February 1, 1960', w / 2, 92)
    g.font = '24px Georgia, serif'
    ;['Ezell Blair Jr.', 'Franklin McCain', 'Joseph McNeil', 'David Richmond'].forEach((n, i) => g.fillText(n, w / 2, 134 + i * 30))
    g.fillStyle = '#9fb0cc'; g.font = 'italic 18px Georgia, serif'; g.fillText('They sat down. They asked to be served.', w / 2, 246)
  }), [])
  const sign = useMemo(() => canvasTex(512, 128, (g, w, h) => { g.fillStyle = '#7b1d22'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f4efe2'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = '#f4efe2'; g.font = '700 58px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LUNCH COUNTER', w / 2, h / 2 + 2) }), [])
  return (
    <group>
      <group position={[x, FY, z]}>
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[4.5, 0.55, 0.38]} position={[0, 0.55, 0]} />
          <CuboidCollider args={[4.5, 1, 0.3]} position={[0, 1, 1.15]} />
        </RigidBody>
        {/* counter: red front, formica top with chrome rail */}
        <mesh position={[0, 0.5, 0]} material={m.red} castShadow receiveShadow><boxGeometry args={[9, 1.0, 0.7]} /></mesh>
        <mesh position={[0, 1.02, 0]} receiveShadow><boxGeometry args={[9.1, 0.06, 0.8]} /><meshStandardMaterial color="#d8d2c4" roughness={0.3} /></mesh>
        <mesh position={[0, 1.03, -0.4]} material={m.chrome}><boxGeometry args={[9.14, 0.07, 0.04]} /></mesh>
        <mesh position={[0, 0.08, -0.38]} material={m.chrome}><boxGeometry args={[9, 0.12, 0.03]} /></mesh>
        <mesh position={[0, 0.2, -0.5]} rotation={[0, 0, Math.PI / 2]} material={m.chrome}><cylinderGeometry args={[0.03, 0.03, 9, 10]} /></mesh>
        {/* back bar */}
        <mesh position={[0, 1.1, 1.15]} material={m.walnutSolid} castShadow><boxGeometry args={[9, 2.2, 0.5]} /></mesh>
        <mesh position={[0, 1.4, 0.88]}><planeGeometry args={[8.6, 0.9]} /><meshStandardMaterial color="#9fbfd0" roughness={0.04} metalness={0.9} /></mesh>
        {[1.15, 1.75, 2.1].map((y, i) => <mesh key={i} position={[0, y, 0.9]} material={m.chrome}><boxGeometry args={[8.2, 0.03, 0.2]} /></mesh>)}
        {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[-3.6 + i * 0.9, 1.79 + (i % 3) * 0.0, 0.9]}><cylinderGeometry args={[0.07, 0.06, 0.1, 10]} /><meshStandardMaterial color="#f4f2ee" roughness={0.3} /></mesh>)}
        {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[-3.5 + i * 1.0, 1.1 + 0.06, 0.9]}><cylinderGeometry args={[0.065, 0.075, 0.12, 10]} /><meshStandardMaterial color="#cfd6d8" roughness={0.1} metalness={0.5} transparent opacity={0.75} /></mesh>)}
        {/* coffee urn and a pie dome on the counter */}
        <mesh position={[-3.4, 1.4, 0.1]} material={m.chrome} castShadow><cylinderGeometry args={[0.2, 0.22, 0.6, 20]} /></mesh>
        <mesh position={[-3.4, 1.74, 0.1]} material={m.chrome}><sphereGeometry args={[0.21, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
        <mesh position={[0.8, 1.06, 0.1]} material={m.white}><cylinderGeometry args={[0.28, 0.28, 0.04, 22]} /></mesh>
        <mesh position={[0.8, 1.2, 0.1]} material={m.glass}><sphereGeometry args={[0.28, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
        <mesh position={[0.8, 1.12, 0.1]}><cylinderGeometry args={[0.22, 0.22, 0.07, 18]} /><meshStandardMaterial color="#c58a3a" roughness={0.8} /></mesh>
        {[-1.4, 2.4, 3.6].map((cx, i) => <mesh key={i} position={[cx, 1.19, 0.1]} material={m.chrome}><boxGeometry args={[0.16, 0.22, 0.1]} /></mesh>)}
        {/* signs */}
        <mesh position={[0, 3.1, 0.88]}><planeGeometry args={[2.6, 0.65]} /><meshBasicMaterial map={sign} /></mesh>
        <mesh position={[3.4, 2.9, 0.88]}><planeGeometry args={[1.3, 0.65]} /><meshStandardMaterial map={plaque} roughness={0.5} emissive="#fff" emissiveMap={plaque} emissiveIntensity={0.2} /></mesh>
      </group>
      <FiguresAndStools x0={X0} z={z - 1.0} n={N} dx={DX} figures={4} />
      <Placard id="lunch-counter" position={[x - 4.4, 0, z - 3.0]} yaw={Math.PI} y={FY} />
    </group>
  )
}

// ------------------------------------------------------------------ the Golden Door and the torch
function Flame({ position }) {
  const ref = useRef()
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffb23e', transparent: true, opacity: 0.92, toneMapped: false }), [])
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.scale.set(1 + Math.sin(t * 11) * 0.08, 1 + Math.sin(t * 7 + 1) * 0.18, 1 + Math.cos(t * 9) * 0.08)
    ref.current.rotation.z = Math.sin(t * 5) * 0.08
  })
  return (
    <group position={position}>
      <mesh ref={ref} position={[0, 0.28, 0]} material={mat} userData={{ noBatch: true }}><coneGeometry args={[0.15, 0.6, 12]} /></mesh>
      <mesh position={[0, 0.16, 0]}><sphereGeometry args={[0.1, 10, 8]} /><meshBasicMaterial color="#fff2b0" toneMapped={false} /></mesh>
    </group>
  )
}
export function GoldenDoor({ position, yaw = 0 }) {
  const [x, z] = position
  const m = mm()
  const patina = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5fa395', roughness: 0.55, metalness: 0.5 }), [])
  const glow = useMemo(() => ledMat('#ffd27a', 2.0), [])
  const poem = useMemo(() => canvasTex(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffe7ac'); gr.addColorStop(1, '#f4b860'); g.fillStyle = gr; g.fillRect(0, 0, w, h)
    g.fillStyle = '#4a2f12'; g.textAlign = 'center'; g.font = 'italic 30px Georgia, serif'
    ;['"Give me your tired, your poor,', 'Your huddled masses yearning', 'to breathe free..."'].forEach((l, i) => g.fillText(l, w / 2, 90 + i * 42))
    g.font = '600 20px Georgia, serif'; g.fillText('Emma Lazarus, "The New Colossus," 1883', w / 2, 238)
  }), [])
  const [fx, fz] = fwd(yaw, 2.6)
  return (
    <group>
      <group position={[x, FY, z]} rotation={[0, yaw, 0]}>
        {/* arch of light */}
        {[-1, 1].map((s) => <mesh key={s} position={[s * 1.25, 1.7, 0]} material={m.brass} castShadow><boxGeometry args={[0.22, 3.4, 0.3]} /></mesh>)}
        <mesh position={[0, 3.4, 0]} rotation={[0, 0, 0]} material={m.brass}><torusGeometry args={[1.25, 0.12, 10, 40, Math.PI]} /></mesh>
        <mesh position={[0, 1.7, -0.02]} material={glow}><planeGeometry args={[2.4, 3.4]} /></mesh>
        <mesh position={[0, 3.4, -0.02]} material={glow}><circleGeometry args={[1.2, 32, 0, Math.PI]} /></mesh>
        <mesh position={[0, 0.9, -0.0]} material={m.black} userData={{ noBatch: true }}><boxGeometry args={[0.01, 0.01, 0.01]} /></mesh>
        <mesh position={[0, 2.3, 0.03]}><planeGeometry args={[1.9, 0.95]} /><meshStandardMaterial map={poem} roughness={0.5} emissive="#fff" emissiveMap={poem} emissiveIntensity={0.15} /></mesh>
        <RigidBody type="fixed" colliders={false}><CuboidCollider args={[1.4, 1.7, 0.2]} position={[0, 1.7, 0]} /></RigidBody>
        {/* the torch: raised arm, hand, cup and flame */}
        <group position={[2.6, 0, 0.8]}>
          <mesh position={[0, 0.15, 0]} material={m.stoneSmooth}><cylinderGeometry args={[0.45, 0.5, 0.3, 20]} /></mesh>
          <mesh position={[0, 1.2, 0]} material={patina} castShadow><cylinderGeometry args={[0.2, 0.24, 1.8, 16]} /></mesh>
          <mesh position={[0, 2.2, 0]} material={patina}><sphereGeometry args={[0.24, 16, 12]} /></mesh>
          {[0, 1, 2, 3].map((i) => <mesh key={i} position={[Math.cos(i * 1.57) * 0.19, 2.42, Math.sin(i * 1.57) * 0.19]} rotation={[0, 0, 0]} material={patina}><capsuleGeometry args={[0.045, 0.28, 4, 8]} /></mesh>)}
          <mesh position={[0, 2.62, 0]} material={m.brass}><cylinderGeometry args={[0.32, 0.18, 0.2, 20, 1, true]} /></mesh>
          <mesh position={[0, 2.78, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.brass}><torusGeometry args={[0.32, 0.03, 8, 24]} /></mesh>
          <Flame position={[0, 2.72, 0]} />
        </group>
        <RigidBody type="fixed" colliders={false}><CylinderCollider args={[1.4, 0.4]} position={[2.6, 1.4, 0.8]} /></RigidBody>
        {/* trunks and bags that held everything a family could carry */}
        <group position={[-2.2, 0, 0.9]} rotation={[0, 0.3, 0]}>
          {[[0, 0.28, 0, 1.1, 0.56, 0.62, '#6a4a2e'], [0.05, 0.78, 0.0, 0.95, 0.44, 0.55, '#4e3a2a'], [0.1, 1.15, 0.02, 0.7, 0.32, 0.45, '#7a5a3a']].map(([tx, ty, tz, w, hh, d, col], i) => (
            <group key={i} position={[tx, ty, tz]} rotation={[0, i * 0.12, 0]}>
              <mesh castShadow><boxGeometry args={[w, hh, d]} /><meshStandardMaterial color={col} roughness={0.75} /></mesh>
              {[-0.3, 0.3].map((sx) => <mesh key={sx} position={[sx * w, 0, d / 2 + 0.005]} material={m.black}><boxGeometry args={[0.05, hh + 0.01, 0.01]} /></mesh>)}
              {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([cx, cy], k) => <mesh key={k} position={[cx * w / 2, cy * hh / 2, d / 2]} material={m.brass}><boxGeometry args={[0.07, 0.07, 0.05]} /></mesh>)}
              <mesh position={[0, 0, d / 2 + 0.01]} material={m.brass}><boxGeometry args={[0.1, 0.1, 0.02]} /></mesh>
            </group>
          ))}
          <mesh position={[0.95, 0.24, 0.1]} rotation={[0, -0.4, 0]}><boxGeometry args={[0.6, 0.48, 0.3]} /><meshStandardMaterial color="#5a3a52" roughness={0.9} /></mesh>
          <mesh position={[0.95, 0.54, 0.1]} rotation={[0, -0.4, 0]} material={m.brass}><torusGeometry args={[0.18, 0.015, 6, 14, Math.PI]} /></mesh>
        </group>
        <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.7, 0.7, 0.5]} position={[-2.2, 0.7, 0.9]} /></RigidBody>
      </group>
      <Placard id="golden-door" position={[x + fx, 0, z + fz]} yaw={yaw} y={FY} reach={0.8} />
    </group>
  )
}
