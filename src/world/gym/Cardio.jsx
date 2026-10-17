import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { gm, gymTextures, gymNear, useUse, registerStation, Box, Cyl, Rod, Hull, textTex, FLY } from './kit.jsx'

// Cardio machines. Every machine is drawn facing local +z (the exerciser stands/sits near the local origin looking +z) and
// is placed with a yaw, like seats. Moving parts follow the shared workout clock (see useUse), so they stay in step with the
// avatar's pose: belts scroll, flywheels spin, pedals and handles move whenever someone is on the machine.

const screenCache = {}
const screenMat = (lines, fg = '#7fe9ff') => screenCache[lines.join('|') + fg] || (screenCache[lines.join('|') + fg] = new THREE.MeshBasicMaterial({ map: textTex(lines, 256, 128, { fg }), toneMapped: false }))

// ------------------------------------------------------------------ treadmill
export function Treadmill({ id, x, z, yaw, auto = false }) {
  const m = gm(), T = gymTextures()
  const u = useUse(id, 'run', auto)
  const beltTex = useMemo(() => { const t = T.belt.clone(); t.needsUpdate = true; t.repeat.set(1, 5); return t }, [T])
  const beltMat = useMemo(() => new THREE.MeshStandardMaterial({ map: beltTex, roughness: 0.9 }), [beltTex])
  const scr = useMemo(() => screenMat(['9.0 km/h', 'RUN'], '#9bff8a'), [])
  useFrame((_, dt) => { if (gymNear.v && u.current.w > 0.01) beltTex.offset.y -= u.current.w * Math.min(dt, 0.1) * 8 })
  useEffect(() => registerStation({ skip: auto, id, label: 'Run on the treadmill', kind: 'run', x, z, yaw, lz: -0.12, y: FLY + 0.235, h: 0, radius: 2.0, stand: undefined }), [id, x, z, yaw])
  return (
    <group position={[x, FLY, z]} rotation={[0, yaw, 0]}>
      <Hull size={[0.85, 0.5, 1.95]} pos={[0, 0.25, 0]} />
      <Box p={[0, 0.12, -0.05]} s={[0.84, 0.14, 1.9]} m={m.frame} cast />
      <mesh position={[0, 0.213, -0.07]} material={beltMat}><boxGeometry args={[0.64, 0.035, 1.58]} /></mesh>
      {[-1, 1].map((s) => <Box key={s} p={[s * 0.37, 0.235, -0.07]} s={[0.1, 0.1, 1.62]} m={m.matteBlack} />)}
      <Cyl p={[0, 0.215, -0.88]} r={[0.05, 0.05]} h={0.66} m={m.steel} rot={[0, 0, Math.PI / 2]} />
      <Box p={[0, 0.25, 0.8]} s={[0.84, 0.3, 0.34]} m={m.frame} cast />
      <Box p={[0, 0.2, 0.8]} s={[0.86, 0.04, 0.36]} m={m.neonTeal} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Rod a={[s * 0.38, 0.35, 0.78]} b={[s * 0.38, 1.12, 0.72]} r={0.025} m={m.black} />
          <Rod a={[s * 0.38, 1.0, 0.7]} b={[s * 0.4, 0.96, -0.3]} r={0.022} m={m.black} />
          <Rod a={[s * 0.4, 0.96, -0.1]} b={[s * 0.4, 0.96, -0.3]} r={0.026} m={m.grip} />
        </group>
      ))}
      <group position={[0, 1.2, 0.66]} rotation={[0.42, Math.PI, 0]}>
        <Box s={[0.66, 0.3, 0.07]} m={m.frame} />
        <mesh position={[0, 0.02, 0.04]} material={scr}><planeGeometry args={[0.5, 0.18]} /></mesh>
        <Box p={[0, -0.12, 0.042]} s={[0.4, 0.02, 0.005]} m={m.neonTeal} />
      </group>
      <Rod a={[0, 1.18, 0.7]} b={[0, 1.02, 0.7]} r={0.03} m={m.black} />
    </group>
  )
}

// ------------------------------------------------------------------ spin bike
export function SpinBike({ id, x, z, yaw, auto = false, color = 'frameRed' }) {
  const m = gm()
  const u = useUse(id, 'bike', auto)
  const wheel = useRef(), crank = useRef(), pedL = useRef(), pedR = useRef()
  const scr = useMemo(() => screenMat(['85 rpm', 'SPIN'], '#ffd37a'), [])
  useFrame(() => {
    if (!gymNear.v) return
    const s = u.current
    const spin = s.w > 0.01 ? s.ph : 0
    if (wheel.current) wheel.current.rotation.x = s.w > 0.01 ? s.ph * 2.2 : wheel.current.rotation.x
    if (crank.current) crank.current.rotation.x = spin
    if (pedL.current) pedL.current.rotation.x = -spin
    if (pedR.current) pedR.current.rotation.x = -spin
  })
  useEffect(() => registerStation({ skip: auto, id, label: 'Ride the spin bike', kind: 'bike', x, z, yaw, lz: -0.27, y: FLY, h: 1.0, seated: true, radius: 1.9, stand: undefined }), [id, x, z, yaw])
  return (
    <group position={[x, FLY, z]} rotation={[0, yaw, 0]}>
      <Hull size={[0.7, 1.0, 1.25]} pos={[0, 0.5, 0.05]} />
      <Box p={[0, 0.045, 0]} s={[0.1, 0.07, 1.25]} m={m.frame} />
      {[-0.52, 0.52].map((zz) => <Box key={zz} p={[0, 0.03, zz]} s={[0.62, 0.05, 0.1]} m={m.matteBlack} />)}
      <Rod a={[0, 0.07, -0.06]} b={[0, 0.96, -0.18]} r={0.04} m={m[color]} />
      <Rod a={[0, 0.07, 0.34]} b={[0, 0.45, 0.2]} r={0.04} m={m[color]} />
      <Rod a={[0, 0.07, 0.42]} b={[0, 1.08, 0.44]} r={0.036} m={m[color]} />
      <Box p={[0, 1.0, -0.27]} s={[0.2, 0.07, 0.3]} m={m.pad} />
      <Box p={[0, 1.02, -0.13]} s={[0.1, 0.05, 0.1]} m={m.pad} />
      <Rod a={[-0.2, 1.1, 0.46]} b={[0.2, 1.1, 0.46]} r={0.022} m={m.black} />
      {[-1, 1].map((s) => <Rod key={s} a={[s * 0.2, 1.1, 0.46]} b={[s * 0.24, 1.04, 0.3]} r={0.026} m={m.grip} />)}
      <group position={[0, 1.2, 0.48]} rotation={[0.5, Math.PI, 0]}><Box s={[0.2, 0.13, 0.05]} m={m.frame} /><mesh position={[0, 0, 0.03]} material={scr}><planeGeometry args={[0.17, 0.1]} /></mesh></group>
      {/* flywheel behind a clear guard */}
      <group ref={wheel} position={[0, 0.34, 0.36]}>
        <Cyl r={[0.26, 0.26]} h={0.07} m={m.steel} rot={[0, 0, Math.PI / 2]} seg={28} />
        <Cyl r={[0.2, 0.2]} h={0.09} m={m.black} rot={[0, 0, Math.PI / 2]} seg={20} />
        <Box p={[0, 0.2, 0]} s={[0.1, 0.04, 0.04]} m={m.frameRed} />
      </group>
      {/* crank and pedals */}
      <group position={[0, 0.34, 0.0]}>
        <Cyl r={[0.04, 0.04]} h={0.5} m={m.steel} rot={[0, 0, Math.PI / 2]} />
        <group ref={crank}>
          <Rod a={[0.14, 0, 0]} b={[0.14, 0.17, 0]} r={0.018} m={m.steel} />
          <Rod a={[-0.14, 0, 0]} b={[-0.14, -0.17, 0]} r={0.018} m={m.steel} />
          <group position={[0.18, 0.17, 0]} ref={pedL}><Box s={[0.09, 0.025, 0.16]} m={m.black} /></group>
          <group position={[-0.18, -0.17, 0]} ref={pedR}><Box s={[0.09, 0.025, 0.16]} m={m.black} /></group>
        </group>
      </group>
    </group>
  )
}

// ------------------------------------------------------------------ elliptical
export function Elliptical({ id, x, z, yaw, auto = false }) {
  const m = gm()
  const u = useUse(id, 'ellip', auto)
  const pedL = useRef(), pedR = useRef(), armL = useRef(), armR = useRef()
  const scr = useMemo(() => screenMat(['CROSS', 'TRAINER'], '#b48aff'), [])
  useFrame(() => {
    if (!gymNear.v) return
    const s = u.current, a = s.w > 0.01 ? s.ph : 0, sn = Math.sin(a), cs = Math.cos(a)
    if (pedL.current) pedL.current.position.set(0.2, 0.26 + 0.045 * cs, -0.1 + sn * 0.17)
    if (pedR.current) pedR.current.position.set(-0.2, 0.26 - 0.045 * cs, -0.1 - sn * 0.17)
    if (armL.current) armL.current.rotation.x = sn * 0.38
    if (armR.current) armR.current.rotation.x = -sn * 0.38
  })
  useEffect(() => registerStation({ skip: auto, id, label: 'Use the elliptical', kind: 'ellip', x, z, yaw, lz: -0.12, y: FLY + 0.3, h: 0, radius: 1.9 }), [id, x, z, yaw])
  return (
    <group position={[x, FLY, z]} rotation={[0, yaw, 0]}>
      <Hull size={[0.75, 0.5, 1.6]} pos={[0, 0.25, 0]} />
      <Box p={[0, 0.1, 0]} s={[0.74, 0.12, 1.55]} m={m.frame} cast />
      <Box p={[0, 0.3, -0.62]} s={[0.74, 0.4, 0.36]} m={m.frameWhite} cast />
      <Box p={[0, 0.34, -0.8]} s={[0.76, 0.02, 0.02]} m={m.neonPurple} />
      <group ref={pedL} position={[0.2, 0.26, -0.1]}><Box s={[0.2, 0.05, 0.4]} m={m.matteBlack} /><Box p={[0, 0.03, 0]} s={[0.16, 0.012, 0.34]} m={m.grip} /></group>
      <group ref={pedR} position={[-0.2, 0.26, -0.1]}><Box s={[0.2, 0.05, 0.4]} m={m.matteBlack} /><Box p={[0, 0.03, 0]} s={[0.16, 0.012, 0.34]} m={m.grip} /></group>
      <Rod a={[0, 0.12, 0.6]} b={[0, 1.35, 0.78]} r={0.05} m={m.frameWhite} />
      <Box p={[0, 0.5, 0.64]} s={[0.46, 0.5, 0.18]} m={m.frameWhite} />
      <group position={[0, 1.42, 0.74]} rotation={[0.5, Math.PI, 0]}><Box s={[0.42, 0.2, 0.06]} m={m.frame} /><mesh position={[0, 0, 0.035]} material={scr}><planeGeometry args={[0.34, 0.14]} /></mesh></group>
      {[[0.3, armL], [-0.3, armR]].map(([sx, ref], i) => (
        <group key={i} ref={ref} position={[sx, 1.35, 0.74]}>
          <Rod a={[0, 0, 0]} b={[0, -0.92, 0.12]} r={0.024} m={m.black} />
          <Rod a={[0, -0.28, 0.03]} b={[0, -0.28, -0.42]} r={0.026} m={m.grip} />
        </group>
      ))}
      <Rod a={[-0.3, 1.35, 0.74]} b={[0.3, 1.35, 0.74]} r={0.025} m={m.black} />
    </group>
  )
}

// ------------------------------------------------------------------ rowing machine
export function Rower({ id, x, z, yaw, auto = false }) {
  const m = gm()
  const u = useUse(id, 'row', auto)
  const seat = useRef(), handle = useRef(), fly = useRef(), strap = useRef()
  const scr = useMemo(() => screenMat(['2:05 /500', 'ROW'], '#7fe9ff'), [])
  useFrame(() => {
    if (!gymNear.v) return
    const s = u.current
    const d = s.w > 0.01 ? 0.5 + 0.5 * Math.sin(s.ph) : 0.5 // 0 = catch, 1 = finish
    const hz = 0.2 - 0.4 * d - 0.1
    if (seat.current) seat.current.position.z = hz
    if (handle.current) handle.current.position.set(0, 0.95 - 0.12 * d, hz + 0.72 - 0.5 * d)
    if (fly.current && s.w > 0.01) fly.current.rotation.z = s.ph * 2.5
  })
  useEffect(() => registerStation({ skip: auto, id, label: 'Row', kind: 'row', x, z, yaw, lz: -0.1, y: FLY, h: 0.45, seated: true, radius: 1.9 }), [id, x, z, yaw])
  return (
    <group position={[x, FLY, z]} rotation={[0, yaw, 0]}>
      <Hull size={[0.6, 0.6, 2.3]} pos={[0, 0.3, 0.1]} />
      <Box p={[0, 0.3, 0.1]} s={[0.1, 0.08, 2.25]} m={m.steel} />
      {[-0.95, 1.1].map((zz) => <Box key={zz} p={[0, 0.15, zz]} s={[0.5, 0.04, 0.07]} m={m.matteBlack} />)}
      <Rod a={[0, 0.15, -0.95]} b={[0, 0.3, -0.95]} r={0.03} m={m.black} />
      <group ref={seat} position={[0, 0.4, 0.0]}><Box s={[0.32, 0.07, 0.32]} m={m.pad} /><Box p={[0, -0.06, 0]} s={[0.16, 0.06, 0.2]} m={m.black} /></group>
      {/* flywheel cage at the front */}
      <group position={[0, 0.5, 1.02]}>
        <Box p={[0, -0.18, 0]} s={[0.4, 0.1, 0.4]} m={m.frame} />
        <group ref={fly}><Cyl r={[0.24, 0.24]} h={0.14} m={m.black} rot={[Math.PI / 2, 0, 0]} seg={24} /><Cyl r={[0.16, 0.16]} h={0.16} m={m.steel} rot={[Math.PI / 2, 0, 0]} seg={14} /></group>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={m.glass}><cylinderGeometry args={[0.27, 0.27, 0.16, 24, 1, true]} /></mesh>
      </group>
      <Rod a={[0, 0.62, 1.0]} b={[0, 0.95, 0.8]} r={0.012} m={m.steel} />
      <group position={[0, 1.0, 0.9]} rotation={[0.4, Math.PI, 0]}><Box s={[0.3, 0.2, 0.05]} m={m.frame} /><mesh position={[0, 0, 0.03]} material={scr}><planeGeometry args={[0.26, 0.15]} /></mesh></group>
      <Rod a={[0, 0.5, 1.02]} b={[0, 0.8, 1.05]} r={0.02} m={m.black} />
      <group ref={handle} position={[0, 0.95, 0.8]}><Rod a={[-0.22, 0, 0]} b={[0.22, 0, 0]} r={0.022} m={m.grip} /></group>
      {/* footplates */}
      {[-1, 1].map((s) => <Box key={s} p={[s * 0.17, 0.42, 0.78]} s={[0.14, 0.04, 0.3]} m={m.matteBlack} r={[-0.5, 0, 0]} />)}
    </group>
  )
}
