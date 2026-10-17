import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Wall } from '../jobkit.jsx'
import { DoubleDoor } from '../Door.jsx'
import { LightAnchor } from '../props.jsx'
import { CeilingLight } from '../furniture.jsx'
import { BrandSign } from '../signs.jsx'
import { useSeats } from '../../state/seats.js'
import { registerInteractable, playerState } from '../../state/runtime.js'
import { useStore } from '../../state/store.js'
import { useGym } from '../../state/gym.js'
import { KIND } from '../../config/workout.js'
import { GYM_ZONE } from '../../config/gym.js'
import { registerScreen, guideSurface } from '../../guide/guide.js'
import { zoneLit } from '../../state/power.js'
import { gm, gymTextures, gymNear, canvasTex, Box, Cyl, Rod, Hull, FLY } from './kit.jsx'

// Everything that is not a machine: reception, juice bar, lockers, sauna, mirror wall, TVs and the functional-training turf.

// ------------------------------------------------------------------ reception desk (staff stand behind it, local -z)
export function Reception({ x, z, yaw = 0 }) {
  const m = gm()
  useEffect(() => registerInteractable('gym-checkin', {
    position: new THREE.Vector3(x, FLY + 1, z + 1.2),
    radius: 2.6,
    label: () => 'Check in · view my gym stats',
    onInteract: () => {
      const t = useGym.getState().totals
      const mins = Math.round(t.seconds / 60)
      const fav = Object.entries(t.perKind || {}).sort((a, b) => b[1].seconds - a[1].seconds)[0]
      const msg = t.sessions
        ? `Welcome back! Since ${t.firstDay}: ${t.sessions} workouts · ${mins} min · ${Math.round(t.kcal)} kcal · ${Math.round(t.reps)} reps${fav ? ` · favourite: ${KIND[fav[0]]?.name || fav[0]}` : ''}. Stats are kept on this device.`
        : 'Welcome to Storm Athletic Club! Free day pass checked in. Walk up to any machine to start a workout; Space or walking away ends it.'
      useStore.getState().showToast(msg)
    },
  }), [x, z])
  return (
    <group position={[x, FLY, z]} rotation={[0, yaw, 0]}>
      <Hull size={[5.0, 1.1, 0.9]} pos={[0, 0.55, 0]} />
      <Box p={[0, 0.5, 0]} s={[5.0, 1.0, 0.8]} m={m.frame} cast />
      <Box p={[0, 1.02, 0.02]} s={[5.1, 0.05, 0.95]} m={m.white} />
      <Box p={[0, 0.55, 0.405]} s={[4.6, 0.05, 0.01]} m={m.neonTeal} />
      <Box p={[0, 0.25, 0.405]} s={[4.6, 0.04, 0.01]} m={m.neonPurple} />
      <Box p={[-1.2, 1.2, -0.05]} s={[0.5, 0.32, 0.04]} m={m.black} r={[0, 0, 0]} />
      <Box p={[1.2, 1.2, -0.05]} s={[0.5, 0.32, 0.04]} m={m.black} />
    </group>
  )
}

// ------------------------------------------------------------------ lockers
export function Lockers({ x, z, yaw = 0, n = 6, hue = 200 }) {
  const m = gm()
  const doors = useMemo(() => Array.from({ length: n }, (_, i) => new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(((hue + i * 14) % 360) / 360, 0.5, 0.42), roughness: 0.45, metalness: 0.5 })), [n, hue])
  return (
    <group position={[x, FLY, z]} rotation={[0, yaw, 0]}>
      <Hull size={[n * 0.42, 2.0, 0.5]} pos={[0, 1.0, 0]} />
      <Box p={[0, 1.0, -0.02]} s={[n * 0.42 + 0.04, 2.0, 0.44]} m={m.frame} />
      {doors.map((dm, i) => {
        const px = (i - (n - 1) / 2) * 0.42
        return (
          <group key={i} position={[px, 0, 0.215]}>
            {[0.5, 1.5].map((y) => (
              <group key={y} position={[0, y, 0]}>
                <mesh material={dm}><boxGeometry args={[0.38, 0.92, 0.02]} /></mesh>
                <Box p={[0, 0.3, 0.012]} s={[0.2, 0.02, 0.004]} m={m.black} />
                <Box p={[0.12, 0, 0.014]} s={[0.025, 0.12, 0.01]} m={m.chrome} />
              </group>
            ))}
          </group>
        )
      })}
    </group>
  )
}

// ------------------------------------------------------------------ juice bar
export function JuiceBar({ x, z, yaw = 0 }) {
  const m = gm()
  const menu = useMemo(() => canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#0c0d11'; g.fillRect(0, 0, w, h)
    g.fillStyle = '#1de9d6'; g.font = '700 38px system-ui, sans-serif'; g.textAlign = 'left'; g.fillText('STORM FUEL BAR', 24, 52)
    g.fillStyle = '#f4f4f6'; g.font = '500 26px system-ui, sans-serif'
    ;['Green Surge smoothie', 'Berry Blast smoothie', 'Protein shake', 'Cold-pressed OJ', 'Electrolyte water'].forEach((t, i) => g.fillText(t, 24, 100 + i * 30))
    g.fillStyle = '#a33cff'; g.fillRect(24, 64, 120, 4)
  }), [])
  return (
    <group position={[x, FLY, z]} rotation={[0, yaw, 0]}>
      <Hull size={[6.0, 1.15, 0.9]} pos={[0, 0.55, 0]} />
      <Box p={[0, 0.5, 0]} s={[6.0, 1.0, 0.75]} m={m.frame} cast />
      <Box p={[0, 1.02, 0.03]} s={[6.1, 0.05, 0.95]} m={m.cedar} />
      <Box p={[0, 0.5, 0.385]} s={[5.6, 0.7, 0.01]} m={m.woodDark} />
      <Box p={[0, 0.95, 0.385]} s={[5.6, 0.03, 0.01]} m={m.neonTeal} />
      {/* back bar: fridge, shelves, blender, menu */}
      <group position={[0, 0, -1.65]}>
        <Hull size={[6.0, 1.0, 0.6]} pos={[0, 0.5, 0]} />
        <Box p={[0, 0.5, 0]} s={[6.0, 1.0, 0.6]} m={m.frame} />
        <Box p={[0, 1.02, 0]} s={[6.1, 0.05, 0.64]} m={m.white} />
        <Box p={[-2.0, 1.0, 0.31]} s={[1.5, 0.95, 0.04]} m={m.glass} />
        {[1.5, 1.9, 2.3].map((y) => <Box key={y} p={[0, y, -0.28]} s={[5.4, 0.04, 0.26]} m={m.cedar} />)}
        {Array.from({ length: 14 }, (_, i) => <Cyl key={i} p={[-2.5 + i * 0.4, 1.58, -0.28]} r={[0.06, 0.05]} h={0.2} m={i % 3 === 0 ? m.neonTeal : i % 3 === 1 ? m.plateYellow : m.ball} />)}
        <group position={[1.2, 1.05, 0]}><Cyl p={[0, 0.17, 0]} r={[0.1, 0.13]} h={0.34} m={m.glass} /><Cyl p={[0, 0.02, 0]} r={[0.15, 0.15]} h={0.1} m={m.black} /></group>
        <mesh position={[2.2, 2.35, -0.29]} rotation={[0, 0, 0]}><planeGeometry args={[1.6, 0.8]} /><meshBasicMaterial map={menu} toneMapped={false} /></mesh>
      </group>
      {[-2.1, -0.7, 0.7, 2.1].map((sx) => <group key={sx}><Hull size={[0.4, 0.8, 0.4]} pos={[sx, 0.4, 1.2]} /><Box p={[sx, 0.0, 1.2]} s={[0.01, 0.01, 0.01]} m={m.black} /></group>)}
    </group>
  )
}

/** The bar stools in front of the juice bar (real seats). */
export function BarStools({ x, z, yaw = 0, xs = [-2.1, -0.7, 0.7, 2.1] }) {
  const m = gm()
  const c = Math.cos(yaw), s = Math.sin(yaw)
  const list = useMemo(() => xs.map((lx, i) => ({ id: 'gym-stool-' + i, position: [x + lx * c + 1.25 * s, FLY + 0.72, z - lx * s + 1.25 * c], yaw: yaw + Math.PI, height: 0.72, label: 'Sit at the juice bar' })), [x, z, yaw])
  useSeats(list, [x, z, yaw])
  return (
    <group position={[x, FLY, z]} rotation={[0, yaw, 0]}>
      {xs.map((sx) => (
        <group key={sx} position={[sx, 0, 1.25]}>
          <Cyl p={[0, 0.7, 0]} r={[0.18, 0.18]} h={0.07} m={m.padRed} seg={20} />
          <Cyl p={[0, 0.36, 0]} r={[0.03, 0.03]} h={0.7} m={m.chrome} seg={8} />
          <Cyl p={[0, 0.04, 0]} r={[0.2, 0.2]} h={0.03} m={m.frame} seg={20} />
          <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.chrome}><torusGeometry args={[0.15, 0.012, 6, 20]} /></mesh>
        </group>
      ))}
    </group>
  )
}

// ------------------------------------------------------------------ sauna
export function Sauna({ rect, doorZ }) {
  const m = gm()
  const { x0, x1, z0, z1 } = rect
  const cedar = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c18b55', roughness: 0.75 }), [])
  const slat = useMemo(() => canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#c4894f'; g.fillRect(0, 0, w, h)
    for (let y = 0; y < h; y += 32) { g.fillStyle = y % 64 ? '#b97b43' : '#cf9a62'; g.fillRect(0, y, w, 30); g.fillStyle = 'rgba(60,30,10,0.35)'; g.fillRect(0, y + 30, w, 2) }
    for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(80,40,15,0.12)'; g.fillRect((i * 37) % w, (i * 53) % h, 18, 1) }
  }, { repeat: [3, 1] }), [])
  const wall = useMemo(() => new THREE.MeshStandardMaterial({ map: slat, roughness: 0.8 }), [slat])
  const glow = useRef(), heat = useRef()
  const H = 2.75
  const doorCenter = [x1, FLY, doorZ]
  const seatsList = useMemo(() => {
    const out = []
    for (const [i, zz] of [z0 + 1.0, (z0 + z1) / 2, z1 - 1.0].entries()) {
      out.push({ id: 'gym-sauna-lo-' + i, position: [x0 + 0.95, FLY + 0.5, zz], yaw: Math.PI / 2, height: 0.5, label: 'Sit in the sauna' })
      out.push({ id: 'gym-sauna-hi-' + i, position: [x0 + 0.4, FLY + 1.0, zz], yaw: Math.PI / 2, height: 1.0, label: 'Sit on the top bench' })
    }
    return out
  }, [x0, z0, z1])
  useSeats(seatsList, [x0, z0, z1])
  useFrame((st) => { if (!gymNear.v) return; if (heat.current) heat.current.emissiveIntensity = 1.3 + Math.sin(st.clock.elapsedTime * 2.1) * 0.25 })
  const heatMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3a0d05', emissive: '#ff5a1f', emissiveIntensity: 1.3, toneMapped: false }), [])
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
  return (
    <group>
      <Wall side="e" rect={{ x0, x1, z0, z1 }} h={H} t={0.2} ext={wall} int={wall} y={FLY} openings={[{ at: doorZ, half: 0.55, h: 2.15 }]} />
      <Wall side="n" rect={{ x0, x1, z0, z1 }} h={H} t={0.2} ext={wall} int={wall} y={FLY} />
      <Wall side="s" rect={{ x0, x1, z0, z1 }} h={H} t={0.2} ext={wall} int={wall} y={FLY} />
      <DoubleDoor id="door-gym-sauna" center={[x1 - 0.1, FLY, doorZ]} halfWidth={0.55} height={2.1} facing={Math.PI / 2} accent="#ffb36b" label="sauna door" />
      <Box p={[cx, FLY + H + 0.05, cz]} s={[x1 - x0, 0.1, z1 - z0]} m={cedar} />
      <mesh position={[cx, FLY + 0.02, cz]} material={wall} receiveShadow><boxGeometry args={[x1 - x0 - 0.2, 0.04, z1 - z0 - 0.2]} /></mesh>
      {/* two-tier benches along the west wall */}
      <Hull size={[0.9, 0.5, z1 - z0 - 0.5]} pos={[x0 + 0.65, FLY + 0.25, cz]} />
      <Box p={[x0 + 0.95, FLY + 0.46, cz]} s={[0.7, 0.07, z1 - z0 - 0.4]} m={cedar} />
      <Box p={[x0 + 0.95, FLY + 0.22, cz]} s={[0.66, 0.4, z1 - z0 - 0.5]} m={m.woodDark} />
      <Box p={[x0 + 0.4, FLY + 0.96, cz]} s={[0.6, 0.07, z1 - z0 - 0.4]} m={cedar} />
      <Box p={[x0 + 0.4, FLY + 0.5, cz]} s={[0.5, 0.9, z1 - z0 - 0.5]} m={m.woodDark} />
      {/* heater with stones, behind a wooden guard, in the south-east corner */}
      <group position={[x1 - 0.7, FLY, z0 + 0.55]}>
        <Hull size={[0.7, 0.9, 0.7]} pos={[0, 0.45, 0]} />
        <Box p={[0, 0.4, 0]} s={[0.5, 0.8, 0.5]} m={m.black} />
        <Box p={[0, 0.2, 0.26]} s={[0.4, 0.3, 0.02]} m={heatMat} />
        {Array.from({ length: 10 }, (_, i) => <mesh key={i} position={[((i % 5) - 2) * 0.09, 0.84 + Math.floor(i / 5) * 0.05, ((i * 7) % 3 - 1) * 0.08]} material={m.kettle}><dodecahedronGeometry args={[0.07, 0]} /></mesh>)}
        {[-0.34, 0.34].map((o) => <Box key={o} p={[o, 0.35, 0.0]} s={[0.03, 0.7, 0.7]} m={cedar} />)}
        <Box p={[0, 0.7, 0.36]} s={[0.7, 0.03, 0.03]} m={cedar} />
      </group>
      <BrandSign text="SAUNA 85°C" sub="TOWEL ON THE BENCH" position={[x1 + 0.02, FLY + 2.5, doorZ + 0.2]} rotation={[0, Math.PI / 2, 0]} width={1.3} color="#ffe1c2" glow="#ffb36b" size={110} />
      <LightAnchor position={[cx, FLY + 2.4, cz]} color="#ffb070" intensity={9} distance={7} zone={GYM_ZONE} />
      <CeilingLight position={[cx, FLY + H - 0.02, cz]} size={[1.2, 0.3]} color="#ffb070" intensity={0} distance={6} zone={GYM_ZONE} watts={20} />
    </group>
  )
}

// ------------------------------------------------------------------ TVs on the north wall: a slow scenic video loop
export function TVRow({ xs, z, y = 3.1 }) {
  const m = gm()
  const T = gymTextures()
  const tex = useMemo(() => { const t = T.scenic.clone(); t.needsUpdate = true; t.repeat.set(0.5, 1); return t }, [T])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), [tex])
  useFrame((st, dt) => { if (gymNear.v) tex.offset.x = (tex.offset.x + Math.min(dt, 0.1) * 0.012) % 1 })
  return (
    <group>
      {xs.map((x, i) => <GymTV key={x} x={x} z={z} y={y} n={i + 1} mat={mat} m={m} />)}
    </group>
  )
}

/** One gym TV: the scenic loop, unless the TV guide has something scheduled for it. */
function GymTV({ x, z, y, n, mat, m }) {
  const grp = useRef()
  const face = useRef()
  const id = 'gym-tv-' + n
  useEffect(() => registerScreen({ id, name: `Gym TV ${n}`, venue: 'Storm Athletic Club', obj: grp.current, active: () => zoneLit(GYM_ZONE) }), [id, n])
  useFrame(() => {
    if (!face.current) return
    const g = zoneLit(GYM_ZONE) ? guideSurface(id) : null
    const want = g || mat
    if (face.current.material !== want) face.current.material = want
  })
  return (
    <group ref={grp} position={[x, FLY + y, z]} rotation={[0, 0, 0]} userData={{ noBatch: true }}>
      <Box s={[1.72, 1.02, 0.06]} m={m.black} />
      <mesh ref={face} position={[0, 0, 0.032]} material={mat}><planeGeometry args={[1.6, 0.9]} /></mesh>
    </group>
  )
}

// ------------------------------------------------------------------ mirror wall with a brand stripe
export function MirrorWall({ x0, x1, z, side = 1 }) {
  const m = gm()
  const T = gymTextures()
  const len = x1 - x0
  const n = Math.round(len / 1.6)
  const mirror = useMemo(() => new THREE.MeshStandardMaterial({ map: T.mirror, roughness: 0.06, metalness: 0.85 }), [T])
  return (
    <group>
      {Array.from({ length: n }, (_, i) => {
        const w = len / n
        return (
          <group key={i} position={[x0 + (i + 0.5) * w, FLY + 1.65, z]}>
            <mesh material={mirror} position={[0, 0, side * 0.02]}><boxGeometry args={[w - 0.04, 2.7, 0.04]} /></mesh>
            <Box p={[(w / 2) - 0.01, 0, side * 0.03]} s={[0.03, 2.74, 0.06]} m={m.black} />
          </group>
        )
      })}
      <Box p={[(x0 + x1) / 2, FLY + 0.12, z + side * 0.05]} s={[len, 0.24, 0.08]} m={m.black} />
      <Box p={[(x0 + x1) / 2, FLY + 3.05, z + side * 0.05]} s={[len, 0.08, 0.08]} m={m.neonTeal} />
    </group>
  )
}

// ------------------------------------------------------------------ functional-training turf with plyo boxes, battle ropes, balls and mats
export function Turf({ x, z, w = 8, d = 4 }) {
  const m = gm()
  const T = gymTextures()
  const turf = useMemo(() => { const t = T.turf.clone(); t.needsUpdate = true; t.repeat.set(w / 4, d / 4); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }) }, [T, w, d])
  const rope = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d4d4d9', roughness: 0.85 }), [])
  return (
    <group position={[x, FLY, z]}>
      <mesh position={[0, 0.012, 0]} material={turf} receiveShadow><boxGeometry args={[w, 0.024, d]} /></mesh>
      {[0.5, 0.65, 0.8].map((h, i) => <group key={i}><Hull size={[0.7, h, 0.55]} pos={[-w / 2 + 1.0 + i * 0.9, h / 2, -d / 2 + 0.6]} /><Box p={[-w / 2 + 1.0 + i * 0.9, h / 2 + 0.024, -d / 2 + 0.6]} s={[0.7, h, 0.55]} m={m.wood} /><Box p={[-w / 2 + 1.0 + i * 0.9, h + 0.02, -d / 2 + 0.6]} s={[0.72, 0.02, 0.57]} m={m.woodDark} /></group>)}
      {[0, 1, 2, 3].map((i) => <mesh key={i} position={[w / 2 - 1.2 + i * 0.3, 0.17, -d / 2 + 0.5 + (i % 2) * 0.25]} material={m.ball}><sphereGeometry args={[0.17, 14, 10]} /></mesh>)}
      {/* battle ropes: a post and two heavy ropes lying in loose curves */}
      <Hull size={[0.3, 1.1, 0.3]} pos={[w / 2 - 0.3, 0.55, d / 2 - 0.4]} />
      <Cyl p={[w / 2 - 0.3, 0.55, d / 2 - 0.4]} r={[0.1, 0.12]} h={1.1} m={m.frame} />
      {[0, 1].map((k) => (
        <mesh key={k} material={rope} position={[0, 0.045, 0]}>
          <tubeGeometry args={[new THREE.CatmullRomCurve3(Array.from({ length: 12 }, (_, i) => new THREE.Vector3(w / 2 - 0.35 - i * 0.28, 0.02 + (i % 2) * 0.03, d / 2 - 0.4 - k * 0.12 + Math.sin(i * 0.9 + k * 2) * 0.28)), false), 40, 0.035, 8, false]} />
        </mesh>
      ))}
      {/* yoga mats, rolled and flat */}
      {[0, 1, 2].map((i) => <Box key={i} p={[-0.2 + i * 0.75, 0.035, d / 2 - 0.9]} s={[0.62, 0.02, 1.7]} m={i === 1 ? m.padBlue : m.mat} />)}
      {[0, 1, 2].map((i) => <Cyl key={i} p={[w / 2 - 2.4 + i * 0.22, 0.12, d / 2 - 0.9]} r={[0.1, 0.1]} h={0.62} m={i % 2 ? m.padRed : m.mat} rot={[Math.PI / 2, 0, 0]} />)}
    </group>
  )
}

// ------------------------------------------------------------------ small amenities
export function WaterFountain({ x, z, yaw = 0 }) {
  const m = gm()
  return (
    <group position={[x, FLY, z]} rotation={[0, yaw, 0]}>
      <Hull size={[0.5, 1.2, 0.35]} pos={[0, 0.6, 0]} />
      <Box p={[0, 0.5, 0]} s={[0.46, 1.0, 0.32]} m={m.chrome} />
      <Box p={[0, 0.98, 0.04]} s={[0.4, 0.05, 0.25]} m={m.black} />
      <Box p={[0, 0.45, 0.165]} s={[0.3, 0.2, 0.01]} m={m.neonTeal} />
      <Rod a={[0, 1.0, 0.1]} b={[0, 1.15, 0.12]} r={0.012} m={m.steel} />
    </group>
  )
}

export function TowelStation({ x, z, yaw = 0 }) {
  const m = gm()
  return (
    <group position={[x, FLY, z]} rotation={[0, yaw, 0]}>
      <Hull size={[0.9, 1.0, 0.5]} pos={[0, 0.5, 0]} />
      <Box p={[0, 0.5, 0]} s={[0.9, 1.0, 0.5]} m={m.frameWhite} />
      {[0, 1, 2, 3].map((i) => <Box key={i} p={[-0.2 + (i % 2) * 0.4, 1.06 + Math.floor(i / 2) * 0.1, 0]} s={[0.34, 0.09, 0.4]} m={m.towel} />)}
      <Box p={[0, 0.5, 0.255]} s={[0.5, 0.35, 0.01]} m={m.black} />
    </group>
  )
}

export function Scale({ x, z, yaw = 0 }) {
  const m = gm()
  return (
    <group position={[x, FLY, z]} rotation={[0, yaw, 0]}>
      <Box p={[0, 0.04, 0]} s={[0.5, 0.06, 0.5]} m={m.black} />
      <Box p={[0, 0.075, 0]} s={[0.46, 0.01, 0.46]} m={m.chrome} />
      <Box p={[0, 0.082, 0.22]} s={[0.18, 0.005, 0.04]} m={m.neonTeal} />
    </group>
  )
}

export function ProteinVending({ x, z, yaw = 0 }) {
  const m = gm()
  const face = useMemo(() => canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#0d0f14'; g.fillRect(0, 0, w, h)
    for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) { g.fillStyle = ['#e84a4a', '#f2b632', '#3ac26a', '#4a90e2', '#a33cff'][(r * 4 + c) % 5]; g.fillRect(14 + c * 58, 30 + r * 62, 44, 48) }
    g.fillStyle = '#1de9d6'; g.font = '700 22px system-ui'; g.fillText('PROTEIN & WATER', 18, 24)
  }), [])
  return (
    <group position={[x, FLY, z]} rotation={[0, yaw, 0]}>
      <Hull size={[0.9, 2.0, 0.8]} pos={[0, 1.0, 0]} />
      <Box p={[0, 1.0, 0]} s={[0.9, 2.0, 0.8]} m={m.frame} />
      <mesh position={[0, 1.15, 0.405]}><planeGeometry args={[0.7, 1.4]} /><meshBasicMaterial map={face} toneMapped={false} /></mesh>
      <Box p={[0, 0.3, 0.405]} s={[0.5, 0.2, 0.01]} m={m.black} />
    </group>
  )
}
