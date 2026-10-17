import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { gm, gymNear, useUse, registerStation, Box, Cyl, Rod, Hull, FLY } from './kit.jsx'

// Strength equipment: selectorised machines with moving weight stacks, a squat rack, dumbbell rack, heavy bag and a few
// decorative free-weight pieces. Same conventions as Cardio.jsx: drawn facing local +z, placed with x, z, yaw.

const eOf = (s) => (s.w > 0.01 ? 0.5 + 0.5 * Math.sin(s.ph) : 0) // 0 = start of the rep, 1 = fully pressed/pulled

/** A selectorised weight stack; the plates above the pin lift with the rep. */
function Stack({ p = [0, 0, 0], n = 12, sel = 4, u, lift = 0.22, w = 0.4, d = 0.3, big = false }) {
  const m = gm()
  const up = useRef()
  const ph = 0.095
  useFrame(() => { if (gymNear.v && up.current) up.current.position.y = eOf(u.current) * lift })
  const H = n * ph + 0.35
  return (
    <group position={p}>
      <Box p={[0, 0.07, 0]} s={[w + 0.12, 0.1, d + 0.1]} m={m.frame} />
      {[-1, 1].map((s) => <Rod key={s} a={[s * (w / 2 - 0.05), 0.1, 0]} b={[s * (w / 2 - 0.05), H + 0.15, 0]} r={0.014} m={m.chrome} />)}
      {Array.from({ length: sel }, (_, i) => <Box key={i} p={[0, 0.17 + i * ph, 0]} s={[w, ph - 0.012, d]} m={m.weight} />)}
      <group ref={up}>
        {Array.from({ length: n - sel }, (_, i) => <Box key={i} p={[0, 0.17 + (sel + i) * ph, 0]} s={[w, ph - 0.012, d]} m={i === 0 ? m.weightSel : m.weight} />)}
        <Box p={[0, 0.17 + n * ph + 0.01, 0]} s={[w + 0.04, 0.04, d + 0.04]} m={m.black} />
      </group>
      <Box p={[0, H + 0.2, 0]} s={[w + 0.12, 0.07, d + 0.1]} m={m.frame} />
      <Box p={[0, H * 0.6, d / 2 + 0.012]} s={[w * 0.5, H * 0.8, 0.012]} m={m.matteBlack} />
    </group>
  )
}

const Seat = ({ p, s = [0.46, 0.1, 0.44], m }) => <Box p={p} s={s} m={m} />

// ------------------------------------------------------------------ chest press
export function ChestPress({ id, x, z, yaw, auto = false }) {
  const m = gm()
  const u = useUse(id, 'press', auto)
  const arms = useRef()
  useFrame(() => { if (gymNear.v && arms.current) arms.current.position.z = eOf(u.current) * 0.45 })
  useEffect(() => registerStation({ skip: auto, id, label: 'Chest press', kind: 'press', x, z, yaw, lz: -0.05, y: FLY, h: 0.5, seated: true, radius: 1.9 }), [id, x, z, yaw])
  return (
    <group position={[x, FLY, z]} rotation={[0, yaw, 0]}>
      <Hull size={[0.85, 1.2, 1.9]} pos={[0, 0.6, -0.4]} />
      <Box p={[0, 0.05, -0.35]} s={[0.78, 0.08, 1.7]} m={m.frame} />
      <Box p={[0, 0.27, -0.05]} s={[0.18, 0.44, 0.3]} m={m.black} />
      <Seat p={[0, 0.45, -0.05]} m={m.padBlue} />
      <group position={[0, 0.98, -0.34]} rotation={[-0.12, 0, 0]}><Box s={[0.46, 0.8, 0.1]} m={m.padBlue} /></group>
      {[-1, 1].map((s) => <Rod key={s} a={[s * 0.34, 0.08, -0.6]} b={[s * 0.34, 1.8, -0.6]} r={0.045} m={m.frameBlue} />)}
      <Box p={[0, 1.8, -0.6]} s={[0.8, 0.07, 0.1]} m={m.frameBlue} />
      <Box p={[0, 1.18, -0.6]} s={[0.7, 0.07, 0.08]} m={m.frameBlue} />
      <group ref={arms}>
        {[-1, 1].map((s) => (
          <group key={s}>
            <Rod a={[s * 0.3, 1.08, -0.58]} b={[s * 0.3, 1.08, 0.14]} r={0.03} m={m.steel} />
            <Rod a={[s * 0.3, 1.01, 0.14]} b={[s * 0.3, 1.15, 0.14]} r={0.026} m={m.grip} />
          </group>
        ))}
      </group>
      <Stack p={[0, 0, -1.0]} u={u} lift={0.22} />
    </group>
  )
}

// ------------------------------------------------------------------ shoulder press
export function ShoulderPress({ id, x, z, yaw, auto = false }) {
  const m = gm()
  const u = useUse(id, 'shoulder', auto)
  const arms = useRef()
  useFrame(() => { if (gymNear.v && arms.current) arms.current.position.y = eOf(u.current) * 0.85 })
  useEffect(() => registerStation({ skip: auto, id, label: 'Shoulder press', kind: 'shoulder', x, z, yaw, lz: -0.05, y: FLY, h: 0.5, seated: true, radius: 1.9 }), [id, x, z, yaw])
  return (
    <group position={[x, FLY, z]} rotation={[0, yaw, 0]}>
      <Hull size={[0.95, 1.2, 1.9]} pos={[0, 0.6, -0.4]} />
      <Box p={[0, 0.05, -0.35]} s={[0.82, 0.08, 1.7]} m={m.frame} />
      <Box p={[0, 0.27, -0.05]} s={[0.18, 0.44, 0.3]} m={m.black} />
      <Seat p={[0, 0.45, -0.05]} m={m.padRed} />
      <group position={[0, 0.98, -0.34]} rotation={[-0.1, 0, 0]}><Box s={[0.44, 0.85, 0.1]} m={m.padRed} /></group>
      {[-1, 1].map((s) => <Rod key={s} a={[s * 0.4, 0.08, -0.6]} b={[s * 0.4, 2.55, -0.6]} r={0.045} m={m.frameRed} />)}
      <Box p={[0, 2.55, -0.6]} s={[0.9, 0.07, 0.1]} m={m.frameRed} />
      <group ref={arms}>
        {[-1, 1].map((s) => (
          <group key={s}>
            <Rod a={[s * 0.42, 1.25, -0.62]} b={[s * 0.42, 1.25, -0.04]} r={0.03} m={m.steel} />
            <Rod a={[s * 0.34, 1.25, -0.04]} b={[s * 0.5, 1.25, -0.04]} r={0.026} m={m.grip} />
          </group>
        ))}
      </group>
      <Stack p={[0, 0, -1.0]} u={u} lift={0.2} />
    </group>
  )
}

// ------------------------------------------------------------------ lat pulldown
export function LatPulldown({ id, x, z, yaw, auto = false }) {
  const m = gm()
  const u = useUse(id, 'pull', auto)
  const bar = useRef(), cable = useRef()
  useFrame(() => {
    if (!gymNear.v) return
    const e = eOf(u.current), y = 2.1 - 1.0 * e, top = 2.55
    if (bar.current) bar.current.position.y = y
    if (cable.current) { cable.current.position.y = (top + y) / 2; cable.current.scale.y = Math.max(0.05, top - y) }
  })
  useEffect(() => registerStation({ skip: auto, id, label: 'Lat pulldown', kind: 'pull', x, z, yaw, lz: -0.1, y: FLY, h: 0.5, seated: true, radius: 1.9 }), [id, x, z, yaw])
  return (
    <group position={[x, FLY, z]} rotation={[0, yaw, 0]}>
      <Hull size={[1.2, 1.2, 2.4]} pos={[0, 0.6, -0.1]} />
      <Box p={[0, 0.05, -0.05]} s={[0.86, 0.08, 2.0]} m={m.frame} />
      <Seat p={[0, 0.45, -0.1]} m={m.padGrey} />
      <Box p={[0, 0.25, -0.1]} s={[0.18, 0.4, 0.3]} m={m.black} />
      {[-1, 1].map((s) => <Rod key={s} a={[s * 0.5, 0.08, 0.55]} b={[s * 0.5, 2.6, 0.55]} r={0.045} m={m.frame} />)}
      <Box p={[0, 2.6, 0.55]} s={[1.1, 0.08, 0.1]} m={m.frame} />
      <Rod a={[0, 2.55, 0.55]} b={[0, 2.55, -0.95]} r={0.012} m={m.steel} />
      <Cyl p={[0, 2.55, 0.3]} r={[0.09, 0.09]} h={0.04} m={m.steel} rot={[0, 0, Math.PI / 2]} />
      {/* thigh pad on its adjustable arm */}
      <Rod a={[0.4, 0.5, 0.55]} b={[0.32, 0.78, 0.35]} r={0.025} m={m.steel} />
      <Rod a={[-0.4, 0.5, 0.55]} b={[-0.32, 0.78, 0.35]} r={0.025} m={m.steel} />
      <Box p={[0, 0.8, 0.28]} s={[0.55, 0.09, 0.2]} m={m.padGrey} />
      <group ref={bar} position={[0, 2.1, 0.2]}>
        <Rod a={[-0.55, 0, 0]} b={[0.55, 0, 0]} r={0.022} m={m.chrome} />
        {[-0.5, 0.5].map((xx) => <Rod key={xx} a={[xx, 0, -0.05]} b={[xx, 0, 0.05]} r={0.03} m={m.grip} />)}
        <Rod a={[-0.55, 0, 0]} b={[-0.62, -0.05, 0]} r={0.02} m={m.chrome} /><Rod a={[0.55, 0, 0]} b={[0.62, -0.05, 0]} r={0.02} m={m.chrome} />
      </group>
      <mesh ref={cable} position={[0, 2.3, 0.2]} material={m.steel}><cylinderGeometry args={[0.008, 0.008, 1, 6]} /></mesh>
      <Stack p={[0, 0, -1.0]} u={u} lift={0.25} />
    </group>
  )
}

// ------------------------------------------------------------------ leg press
export function LegPress({ id, x, z, yaw, auto = false }) {
  const m = gm()
  const u = useUse(id, 'legpress', auto)
  const sled = useRef()
  useFrame(() => {
    if (!gymNear.v || !sled.current) return
    const e = eOf(u.current)
    sled.current.position.set(0, 0.61 - 0.46 * e, 0.25 + 0.47 * e)
  })
  useEffect(() => registerStation({ skip: auto, id, label: 'Leg press', kind: 'legpress', x, z, yaw, lz: -0.1, y: FLY, h: 0.45, seated: true, radius: 2.0 }), [id, x, z, yaw])
  return (
    <group position={[x, FLY, z]} rotation={[0, yaw, 0]}>
      <Hull size={[1.2, 1.0, 2.7]} pos={[0, 0.5, 0.2]} />
      <Box p={[0, 0.05, 0.1]} s={[0.9, 0.08, 2.5]} m={m.frame} />
      <Seat p={[0, 0.4, -0.1]} s={[0.5, 0.1, 0.46]} m={m.padGrey} />
      <Box p={[0, 0.22, -0.1]} s={[0.2, 0.36, 0.3]} m={m.black} />
      <group position={[0, 0.86, -0.4]} rotation={[-0.3, 0, 0]}><Box s={[0.5, 0.78, 0.1]} m={m.padGrey} /></group>
      {/* rails along the incline, with the sled and its loaded plates riding on them */}
      {[-1, 1].map((s) => <Rod key={s} a={[s * 0.36, 0.76, 0.1]} b={[s * 0.36, 0.06, 0.9]} r={0.03} m={m.steel} />)}
      {[-1, 1].map((s) => <Rod key={s} a={[s * 0.36, 0.3, -0.2]} b={[s * 0.36, 0.76, 0.1]} r={0.03} m={m.frame} />)}
      <group ref={sled} position={[0, 0.61, 0.25]}>
        <group rotation={[-0.75, 0, 0]}><Box s={[0.62, 0.5, 0.05]} m={m.steel} /><Box p={[0, 0, 0.03]} s={[0.5, 0.38, 0.01]} m={m.grip} /></group>
        {[-1, 1].map((s) => <Rod key={s} a={[s * 0.36, 0.0, 0.0]} b={[s * 0.5, 0.0, 0.02]} r={0.035} m={m.steel} />)}
        {[-1, 1].map((s) => [0, 1, 2].map((k) => <Cyl key={s + '' + k} p={[s * (0.45 + k * 0.05), 0, 0.02]} r={[0.2, 0.2]} h={0.045} m={k === 0 ? m.plateRed : k === 1 ? m.plateBlue : m.plateBlack} rot={[0, 0, Math.PI / 2]} seg={20} />))}
      </group>
      <Stack p={[0, 0, -0.85]} u={u} lift={0.22} />
    </group>
  )
}

// ------------------------------------------------------------------ cable crossover (decor: two stacks and a bar)
export function CableCross({ x, z, yaw }) {
  const m = gm()
  return (
    <group position={[x, FLY, z]} rotation={[0, yaw, 0]}>
      <Hull size={[3.4, 1.2, 0.8]} pos={[0, 0.6, -0.1]} />
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 1.5, 0, -0.1]}>
          <Rod a={[0, 0.05, 0]} b={[0, 2.35, 0]} r={0.05} m={m.frame} />
          <Rod a={[s * 0.3, 0.05, 0]} b={[0, 0.05, 0]} r={0.04} m={m.frame} />
          <Box p={[s * -0.03, 1.15, -0.2]} s={[0.12, 2.0, 0.14]} m={m.frame} />
          <Stack p={[s * -0.03, 0, -0.3]} u={{ current: { w: 0, ph: 0 } }} w={0.3} d={0.22} n={14} sel={5} />
          <Box p={[0, 2.35, 0.04]} s={[0.12, 0.12, 0.14]} m={m.steel} />
          <Rod a={[0, 2.3, 0.1]} b={[s * -0.1, 1.35, 0.25]} r={0.007} m={m.steel} />
          <Rod a={[s * -0.1, 1.35, 0.25]} b={[s * -0.1, 1.25, 0.25]} r={0.03} m={m.grip} />
        </group>
      ))}
      <Box p={[0, 2.38, -0.1]} s={[3.1, 0.1, 0.1]} m={m.frame} />
      <Box p={[0, 1.0, -0.2]} s={[0.04, 0.5, 0.02]} m={m.neonRed} />
    </group>
  )
}

// ------------------------------------------------------------------ barbell squat rack
export function SquatRack({ id, x, z, yaw, auto = false }) {
  const m = gm()
  const u = useUse(id, 'squat', auto)
  const bar = useRef()
  useFrame(() => {
    if (!gymNear.v || !bar.current) return
    const s = u.current
    const d = s.w > 0.01 ? 0.5 + 0.5 * Math.sin(s.ph) : 0
    bar.current.position.set(0, 1.5 - 0.42 * d * s.w, -0.12)
  })
  useEffect(() => registerStation({ skip: auto, id, label: 'Barbell squat', kind: 'squat', x, z, yaw, lz: 0, y: FLY + 0.1, h: 0, radius: 1.9 }), [id, x, z, yaw])
  const plates = [[0.0, 0.225, 'plateRed', 0.05], [0.07, 0.2, 'plateBlue', 0.045], [0.135, 0.17, 'plateYellow', 0.035], [0.18, 0.14, 'plateGreen', 0.03]]
  return (
    <group position={[x, FLY, z]} rotation={[0, yaw, 0]}>
      {/* lifting platform: wood with rubber inlay */}
      <Box p={[0, 0.05, -0.05]} s={[2.6, 0.1, 2.0]} m={m.wood} />
      <Box p={[0, 0.052, -0.05]} s={[1.3, 0.1, 2.0]} m={m.rubber} />
      {[[-1, -0.5], [-1, 0.3], [1, -0.5], [1, 0.3]].map(([sx, zz], i) => (
        <group key={i}>
          <Hull size={[0.1, 2.4, 0.1]} pos={[sx * 0.66, 1.2, zz]} />
          <Box p={[sx * 0.66, 1.25, zz]} s={[0.09, 2.3, 0.09]} m={m.frameRed} />
        </group>
      ))}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <Box p={[sx * 0.66, 2.4, -0.1]} s={[0.09, 0.07, 0.9]} m={m.frameRed} />
          <Box p={[sx * 0.66, 1.4, -0.1]} s={[0.09, 0.05, 0.9]} m={m.steel} />      {/* J-hook arms */}
          <Box p={[sx * 0.66, 0.72, -0.1]} s={[0.09, 0.05, 0.9]} m={m.steel} />     {/* safety arms */}
        </group>
      ))}
      <Box p={[0, 2.4, 0.3]} s={[1.3, 0.07, 0.07]} m={m.frameRed} />
      <Box p={[0, 2.4, -0.5]} s={[1.3, 0.07, 0.07]} m={m.frameRed} />
      <Box p={[0, 0.72, 0.3]} s={[1.3, 0.05, 0.05]} m={m.steel} />
      <Box p={[0, 0.72, -0.5]} s={[1.3, 0.05, 0.05]} m={m.steel} />
      <Box p={[0, 1.95, -0.5]} s={[1.3, 0.05, 0.05]} m={m.steel} />
      <Box p={[0, 1.35, 0.4]} s={[0.5, 0.08, 0.02]} m={m.neonRed} />
      <group ref={bar} position={[0, 1.5, -0.12]}>
        <Cyl r={[0.014, 0.014]} h={2.2} m={m.chrome} rot={[0, 0, Math.PI / 2]} seg={8} />
        {[-1, 1].map((s) => <Cyl key={s} p={[s * 0.72, 0, 0]} r={[0.025, 0.025]} h={0.3} m={m.steel} rot={[0, 0, Math.PI / 2]} seg={8} />)}
        {[-1, 1].map((s) => plates.map(([o, r, mat, t], i) => <Cyl key={s + '' + i} p={[s * (0.4 + o + t / 2), 0, 0]} r={[r, r]} h={t} m={m[mat]} rot={[0, 0, Math.PI / 2]} seg={22} />))}
        {[-1, 1].map((s) => <Cyl key={'c' + s} p={[s * 0.78, 0, 0]} r={[0.035, 0.035]} h={0.03} m={m.black} rot={[0, 0, Math.PI / 2]} seg={8} />)}
      </group>
    </group>
  )
}

// ------------------------------------------------------------------ dumbbell rack with a curl station in front of it
export function DumbbellRack({ x, z, yaw }) {
  const m = gm()
  const pairs = useMemo(() => Array.from({ length: 10 }, (_, i) => ({ w: 5 + i * 5, r: 0.045 + i * 0.0065, hl: 0.07 + i * 0.006 })), [])
  return (
    <group position={[x, FLY, z]} rotation={[0, yaw, 0]}>
      <Hull size={[2.5, 1.0, 0.6]} pos={[0, 0.5, 0]} />
      {[-1.1, 0, 1.1].map((xx) => <Box key={xx} p={[xx, 0.42, 0]} s={[0.08, 0.84, 0.5]} m={m.frame} />)}
      {[0.55, 0.85].map((y, row) => (
        <group key={y}>
          <Box p={[0, y, 0.02]} s={[2.4, 0.04, 0.5]} m={m.frame} />
          <Box p={[0, y + 0.0, -0.22]} s={[2.4, 0.07, 0.04]} m={m.black} />
          {pairs.map((p, i) => {
            const px = -1.0 + i * 0.22
            return (
              <group key={i} position={[px, y + 0.02 + p.r, 0.04]}>
                <Cyl r={[0.016, 0.016]} h={0.34} m={m.chrome} rot={[Math.PI / 2, 0, 0]} seg={8} />
                {[-1, 1].map((s) => <Cyl key={s} p={[0, 0, s * (0.07 + p.hl / 2)]} r={[p.r, p.r]} h={p.hl} m={m.kettle} rot={[Math.PI / 2, 0, 0]} seg={6} />)}
              </group>
            )
          })}
        </group>
      ))}
      <Box p={[0, 1.0, -0.22]} s={[2.4, 0.2, 0.03]} m={m.neonTeal} />
    </group>
  )
}

/** Where to stand to curl (in front of the rack, facing the mirror). */
export function CurlStation({ id, x, z, yaw, auto = false }) {
  const u = useUse(id, 'curl', auto)
  void u
  useEffect(() => registerStation({ skip: auto, id, label: 'Dumbbell curls', kind: 'curl', x, z, yaw, lz: 0, y: FLY + 0.01, h: 0, radius: 1.6 }), [id, x, z, yaw])
  return null
}

// ------------------------------------------------------------------ heavy bag
export function HeavyBag({ id, x, z, yaw, auto = false }) {
  const m = gm()
  const u = useUse(id, 'bag', auto)
  const swing = useRef()
  const base = useMemo(() => 1.3 * Math.abs(Math.sin(x * 3.1 + z)), [x, z])
  useFrame((st) => {
    if (!gymNear.v || !swing.current) return
    const s = u.current
    const idle = Math.sin(st.clock.elapsedTime * 0.7 + base) * 0.012
    const hit = s.w > 0.01 ? -(0.05 + 0.11 * Math.abs(Math.sin(s.ph))) * s.w : 0
    swing.current.rotation.x += (hit + idle - swing.current.rotation.x) * 0.25
  })
  useEffect(() => registerStation({ skip: auto, id, label: 'Hit the heavy bag', kind: 'bag', x, z, yaw, lz: 0, y: FLY + 0.01, h: 0, radius: 1.8 }), [id, x, z, yaw])
  return (
    <group position={[x, FLY, z]} rotation={[0, yaw, 0]}>
      <Hull size={[0.45, 1.6, 0.45]} pos={[0, 0.8, 0.82]} />
      <group ref={swing} position={[0, 3.2, 0.82]}>
        <Rod a={[0, 0, 0]} b={[0, -1.2, 0]} r={0.01} m={m.steel} />
        <Cyl p={[0, -1.25, 0]} r={[0.07, 0.07]} h={0.08} m={m.steel} />
        <Cyl p={[0, -1.85, 0]} r={[0.19, 0.19]} h={1.15} m={m.frameRed} seg={20} />
        <mesh position={[0, -1.275, 0]}><sphereGeometry args={[0.19, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#c42a2f" roughness={0.6} /></mesh>
        <mesh position={[0, -2.425, 0]} rotation={[Math.PI, 0, 0]}><sphereGeometry args={[0.19, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#c42a2f" roughness={0.6} /></mesh>
        {[-1.4, -1.85, -2.3].map((y) => <Cyl key={y} p={[0, y, 0]} r={[0.196, 0.196]} h={0.035} m={m.black} seg={20} />)}
      </group>
      {/* floor mat */}
      <Box p={[0, 0.012, 0.4]} s={[1.5, 0.024, 2.0]} m={m.rubber} />
    </group>
  )
}

// ------------------------------------------------------------------ decorative free weights
export function WeightBench({ x, z, yaw, bar = true }) {
  const m = gm()
  return (
    <group position={[x, FLY, z]} rotation={[0, yaw, 0]}>
      <Hull size={[0.5, 0.5, 1.3]} pos={[0, 0.25, 0]} />
      <Box p={[0, 0.43, 0]} s={[0.3, 0.1, 1.2]} m={m.padRed} />
      {[-0.5, 0.5].map((zz) => <Box key={zz} p={[0, 0.2, zz]} s={[0.46, 0.04, 0.07]} m={m.frame} />)}
      <Box p={[0, 0.2, 0]} s={[0.06, 0.4, 0.06]} m={m.frame} />
      {bar && (
        <group position={[0, 1.0, -0.45]}>
          {[-1, 1].map((s) => <Box key={s} p={[s * 0.5, -0.5, 0.0]} s={[0.05, 1.0, 0.05]} m={m.frame} />)}
          <Cyl r={[0.014, 0.014]} h={2.2} m={m.chrome} rot={[0, 0, Math.PI / 2]} seg={8} p={[0, 0.0, 0.0]} />
          {[-1, 1].map((s) => [[0.5, 0.225, 'plateBlue', 0.05], [0.56, 0.2, 'plateYellow', 0.04]].map(([o, r, mat, t], i) => <Cyl key={s + '' + i} p={[s * (o + 0.0), 0, 0]} r={[r, r]} h={t} m={m[mat]} rot={[0, 0, Math.PI / 2]} seg={22} />))}
        </group>
      )}
    </group>
  )
}

export function PlateTree({ x, z, yaw = 0 }) {
  const m = gm()
  const mats = ['plateRed', 'plateBlue', 'plateYellow', 'plateGreen', 'plateBlack']
  return (
    <group position={[x, FLY, z]} rotation={[0, yaw, 0]}>
      <Hull size={[0.6, 1.4, 0.6]} pos={[0, 0.7, 0]} />
      <Box p={[0, 0.04, 0]} s={[0.6, 0.08, 0.6]} m={m.frame} />
      <Rod a={[0, 0.08, 0]} b={[0, 1.4, 0]} r={0.03} m={m.steel} />
      {[-1, 1].map((s) => <Rod key={s} a={[s * 0.18, 0.4, 0]} b={[s * 0.18, 1.2, 0]} r={0.02} m={m.steel} />)}
      {Array.from({ length: 7 }, (_, i) => <Cyl key={i} p={[0, 0.17 + i * 0.075, 0]} r={[0.22 - (i % 3) * 0.02, 0.22 - (i % 3) * 0.02]} h={0.06} m={m[mats[i % 5]]} seg={20} />)}
    </group>
  )
}

export function KettlebellRack({ x, z, yaw }) {
  const m = gm()
  return (
    <group position={[x, FLY, z]} rotation={[0, yaw, 0]}>
      <Hull size={[1.7, 0.9, 0.7]} pos={[0, 0.45, 0]} />
      <Box p={[0, 0.28, 0]} s={[1.6, 0.05, 0.6]} m={m.frame} />
      <Box p={[0, 0.58, 0]} s={[1.6, 0.05, 0.6]} m={m.frame} />
      {[-0.75, 0.75].map((xx) => <Box key={xx} p={[xx, 0.32, 0]} s={[0.05, 0.64, 0.6]} m={m.frame} />)}
      {[0.31, 0.61].map((y, r) => Array.from({ length: 6 }, (_, i) => {
        const rad = 0.08 + i * 0.012 + r * 0.03
        return (
          <group key={r + '' + i} position={[-0.6 + i * 0.24, y + rad, 0]}>
            <mesh material={m.kettle}><sphereGeometry args={[rad, 14, 10]} /></mesh>
            <mesh position={[0, rad * 1.05, 0]} material={m.kettle}><torusGeometry args={[rad * 0.55, 0.014, 6, 14, Math.PI]} /></mesh>
            <Box p={[0, 0, rad * 0.9]} s={[0.07, 0.04, 0.005]} m={m.neonTeal} />
          </group>
        )
      }))}
    </group>
  )
}
