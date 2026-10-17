import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { registerInteractable } from '../../state/runtime.js'
import { useStore } from '../../state/store.js'
import { playMorse } from '../../audio/instruments.js'
import { mm, Placard, Plinth, Bar, Instances, Mover, FY, hash, canvasTex } from './kit.jsx'

// Industry & Innovation: a 1910s motor car on a turntable, a covered wagon, a wood-burning locomotive and a working
// telegraph key. All original designs in the style of their era: no maker's names, badges or railroad markings.

const spokeGeo = new THREE.BoxGeometry(0.05, 1, 0.05)

/** A spoked wheel, axle along local x. */
function SpokedWheel({ position, r = 0.6, w = 0.12, spokes = 12, wood, iron, tire = 0.04, tireMat }) {
  const items = useMemo(() => Array.from({ length: spokes }, (_, i) => { const a = (i / spokes) * Math.PI * 2; return { p: [0, Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5], r: [a, 0, 0], s: [w * 0.45 / 0.05, r * 0.88, w * 0.45 / 0.05] } }), [spokes, r, w])
  return (
    <group position={position}>
      <Instances geometry={spokeGeo} material={wood} items={items} castShadow />
      <mesh rotation={[0, Math.PI / 2, 0]} material={wood} castShadow><torusGeometry args={[r, w * 0.5, 6, 28]} /></mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} material={tireMat || iron} castShadow><torusGeometry args={[r + w * 0.45, tire, 6, 28]} /></mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} material={iron}><cylinderGeometry args={[r * 0.14, r * 0.14, w * 1.5, 12]} /></mesh>
    </group>
  )
}

// ------------------------------------------------------------------ the automobile
export function ModelCar({ position }) {
  const [x, z] = position
  const m = mm()
  const paint = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#21463a', roughness: 0.25, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12 }), [])
  const leather = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7c4a2a', roughness: 0.7 }), [])
  const topMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.95, side: THREE.DoubleSide }), [])
  const tire = useMemo(() => new THREE.MeshStandardMaterial({ color: '#eee8dc', roughness: 0.8 }), [])
  const lens = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fff3d0', emissive: '#ffe2a0', emissiveIntensity: 0.4, roughness: 0.1 }), [])
  return (
    <>
      <group position={[x, FY, z]}>
        <RigidBody type="fixed" colliders={false}><CylinderCollider args={[0.18, 2.05]} position={[0, 0.18, 0]} /></RigidBody>
        <mesh position={[0, 0.1, 0]} material={m.stoneSmooth} castShadow receiveShadow><cylinderGeometry args={[2.05, 2.1, 0.2, 48]} /></mesh>
        <mesh position={[0, 0.215, 0]} material={m.brass}><cylinderGeometry args={[1.98, 1.98, 0.03, 48]} /></mesh>
        <Mover spin={0.28} position={[0, 0.23, 0]}>
          <group position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            {/* chassis and axles */}
            <mesh position={[0, 0.55, 0]} material={m.black} castShadow><boxGeometry args={[0.9, 0.14, 3.1]} /></mesh>
            {[-1.05, 1.05].map((az) => <mesh key={az} position={[0, 0.5, az]} rotation={[0, 0, Math.PI / 2]} material={m.steel}><cylinderGeometry args={[0.05, 0.05, 1.4, 8]} /></mesh>)}
            {/* passenger tub, bench seat, hood and radiator */}
            <mesh position={[0, 0.95, -0.45]} material={paint} castShadow><boxGeometry args={[1.3, 0.65, 1.7]} /></mesh>
            <mesh position={[0, 1.31, -0.55]} material={leather} castShadow><boxGeometry args={[1.12, 0.12, 0.9]} /></mesh>
            <mesh position={[0, 1.65, -1.0]} rotation={[-0.1, 0, 0]} material={leather} castShadow><boxGeometry args={[1.12, 0.62, 0.12]} /></mesh>
            <mesh position={[0, 1.0, 0.95]} material={paint} castShadow><boxGeometry args={[0.8, 0.62, 1.2]} /></mesh>
            <mesh position={[0, 1.33, 0.95]} rotation={[0, 0, 0]} material={paint}><boxGeometry args={[0.7, 0.04, 1.1]} /></mesh>
            <mesh position={[0, 1.0, 1.58]} material={m.brass} castShadow><boxGeometry args={[0.62, 0.66, 0.1]} /></mesh>
            <mesh position={[0, 1.0, 1.64]} material={m.black}><boxGeometry args={[0.5, 0.52, 0.02]} /></mesh>
            <mesh position={[0, 1.38, 1.6]} material={m.brass}><cylinderGeometry args={[0.05, 0.05, 0.08, 10]} /></mesh>
            {/* cowl, windshield, dash, steering wheel */}
            <mesh position={[0, 1.34, 0.28]} material={paint}><boxGeometry args={[1.3, 0.2, 0.12]} /></mesh>
            <mesh position={[0, 1.58, 0.3]} material={m.glass} userData={{ noBatch: true }}><boxGeometry args={[1.18, 0.4, 0.02]} /></mesh>
            {[-0.6, 0.6].map((sx) => <mesh key={sx} position={[sx, 1.56, 0.3]} material={m.brass}><boxGeometry args={[0.03, 0.46, 0.03]} /></mesh>)}
            <mesh position={[-0.2, 1.3, 0.12]} rotation={[0.9, 0, 0]} material={m.black}><cylinderGeometry args={[0.014, 0.014, 0.5, 6]} /></mesh>
            <mesh position={[-0.2, 1.52, -0.02]} rotation={[0.9, 0, 0]} material={m.walnutSolid}><torusGeometry args={[0.2, 0.014, 6, 20]} /></mesh>
            {/* fenders, running boards */}
            {[-1, 1].map((sx) => [1.05, -1.05].map((az) => (
              <group key={`${sx}${az}`}>
                <mesh position={[sx * 0.72, 0.9, az]} rotation={[0, 0, Math.PI / 2]} material={m.black} castShadow><cylinderGeometry args={[0.52, 0.52, 0.28, 18, 1, true, 0, Math.PI]} /></mesh>
              </group>
            )))}
            {[-1, 1].map((sx) => <mesh key={sx} position={[sx * 0.82, 0.62, -0.2]} material={m.black}><boxGeometry args={[0.3, 0.05, 2.0]} /></mesh>)}
            {/* headlamps and horn */}
            {[-0.5, 0.5].map((sx) => (
              <group key={sx} position={[sx, 1.28, 1.55]}>
                <mesh rotation={[Math.PI / 2, 0, 0]} material={m.brass} castShadow><cylinderGeometry args={[0.15, 0.13, 0.26, 18]} /></mesh>
                <mesh position={[0, 0, 0.14]} rotation={[Math.PI / 2, 0, 0]} material={lens}><circleGeometry args={[0.12, 18]} /></mesh>
              </group>
            ))}
            {/* folded canvas top over four posts */}
            {[[-0.62, -0.1], [0.62, -0.1], [-0.62, -1.15], [0.62, -1.15]].map(([px, pz], i) => <mesh key={i} position={[px, 1.9, pz]} material={m.black}><cylinderGeometry args={[0.018, 0.018, 1.2, 6]} /></mesh>)}
            <mesh position={[0, 2.5, -0.62]} scale={[1.4, 0.12, 1.1]} material={topMat}><sphereGeometry args={[0.5, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
            {/* wheels */}
            {[[1, 1.05, 0.5], [-1, 1.05, 0.5], [1, -1.05, 0.5], [-1, -1.05, 0.5]].map(([sx, az, ay], i) => (
              <SpokedWheel key={i} position={[sx * 0.78, ay, az]} r={0.46} w={0.14} spokes={14} wood={m.oak} iron={m.steel} tireMat={tire} tire={0.06} />
            ))}
            {/* spare tyre on the back */}
            <mesh position={[0, 1.1, -1.5]} rotation={[0, 0, 0]} material={tire}><torusGeometry args={[0.32, 0.06, 8, 24]} /></mesh>
          </group>
        </Mover>
      </group>
      <Placard id="car" position={[x, 0, z - 2.7]} yaw={Math.PI} y={FY} />
    </>
  )
}

// ------------------------------------------------------------------ covered wagon
export function Wagon({ position, yaw = Math.PI / 2 }) {
  const [x, z] = position
  const m = mm()
  const canvas = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e9dfc4', roughness: 0.95, side: THREE.DoubleSide }), [])
  const ribs = useMemo(() => Array.from({ length: 7 }, (_, i) => -1.25 + i * 0.42), [])
  return (
    <>
      <group position={[x, FY, z]} rotation={[0, yaw, 0]}>
        <RigidBody type="fixed" colliders={false}><CuboidCollider args={[1.0, 1.2, 2.3]} position={[0, 1.2, 0]} /></RigidBody>
        <mesh position={[0, 0.05, 0]} material={m.stoneSmooth} receiveShadow><boxGeometry args={[3.4, 0.1, 6.2]} /></mesh>
        <mesh position={[0, 0.12, 0]}><boxGeometry args={[3.2, 0.04, 6.0]} /><meshStandardMaterial color="#8e7a56" roughness={1} /></mesh>
        <group position={[0, 0.1, 0]}>
          {/* boat-shaped bed */}
          <mesh position={[0, 0.95, 0]} material={m.oak} castShadow><boxGeometry args={[1.3, 0.1, 3.0]} /></mesh>
          {[-1, 1].map((sx) => <mesh key={sx} position={[sx * 0.66, 1.3, 0]} rotation={[0, 0, sx * -0.14]} material={m.oak} castShadow><boxGeometry args={[0.07, 0.62, 3.0]} /></mesh>)}
          {[-1, 1].map((az) => <mesh key={az} position={[0, 1.32, az * 1.52]} rotation={[az * 0.1, 0, 0]} material={m.oak}><boxGeometry args={[1.35, 0.6, 0.07]} /></mesh>)}
          {/* canvas bonnet on bows */}
          <mesh position={[0, 1.55, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.9]} material={canvas} castShadow><cylinderGeometry args={[0.78, 0.78, 3.3, 28, 1, true, -Math.PI / 2, Math.PI]} /></mesh>
          {ribs.map((rz, i) => <mesh key={i} position={[0, 1.55, rz * 1.17]} rotation={[0, 0, 0]} material={m.oak}><torusGeometry args={[0.78, 0.018, 6, 20, Math.PI]} /></mesh>)}
          {[-1, 1].map((az) => <mesh key={az} position={[0, 1.55, az * 1.66]} material={canvas}><torusGeometry args={[0.2, 0.18, 6, 16, Math.PI]} /></mesh>)}
          {/* cargo: barrel, crates, bucket, spare wheel spokes */}
          <mesh position={[0.86, 1.1, 0.6]} castShadow><cylinderGeometry args={[0.24, 0.24, 0.5, 14]} /><meshStandardMaterial color="#7a5232" roughness={0.8} /></mesh>
          <mesh position={[-0.92, 1.0, -0.7]} material={m.oak} castShadow><boxGeometry args={[0.36, 0.3, 0.5]} /></mesh>
          <mesh position={[0.92, 0.95, -0.9]} material={m.steel}><cylinderGeometry args={[0.1, 0.08, 0.17, 10]} /></mesh>
          <mesh position={[0, 1.2, 0]} material={m.rust}><boxGeometry args={[0.8, 0.5, 0.9]} /></mesh>
          {/* wheels: big at the back, smaller in front */}
          <SpokedWheel position={[0.76, 0.78, -1.0]} r={0.78} w={0.16} spokes={14} wood={m.oak} iron={m.black} tire={0.05} />
          <SpokedWheel position={[-0.76, 0.78, -1.0]} r={0.78} w={0.16} spokes={14} wood={m.oak} iron={m.black} tire={0.05} />
          <SpokedWheel position={[0.7, 0.56, 1.0]} r={0.56} w={0.14} spokes={12} wood={m.oak} iron={m.black} tire={0.05} />
          <SpokedWheel position={[-0.7, 0.56, 1.0]} r={0.56} w={0.14} spokes={12} wood={m.oak} iron={m.black} tire={0.05} />
          {[-1.0, 1.0].map((az) => <mesh key={az} position={[0, az > 0 ? 0.56 : 0.78, az]} rotation={[0, 0, Math.PI / 2]} material={m.black}><cylinderGeometry args={[0.05, 0.05, 1.6, 8]} /></mesh>)}
          {/* tongue and yoke */}
          <Bar a={[0, 0.75, 1.0]} b={[0, 0.7, 3.0]} r={0.05} material={m.oak} />
          <mesh position={[0, 0.85, 2.85]} rotation={[0, 0, Math.PI / 2]} material={m.walnutSolid}><cylinderGeometry args={[0.05, 0.05, 1.4, 8]} /></mesh>
          {[-0.5, 0.5].map((yx) => <mesh key={yx} position={[yx, 0.85, 2.85]} material={m.walnutSolid}><boxGeometry args={[0.1, 0.26, 0.1]} /></mesh>)}
        </group>
      </group>
      <Placard id="wagon" position={[x, 0, z - 2.5]} yaw={Math.PI} y={FY} />
    </>
  )
}

// ------------------------------------------------------------------ locomotive
const stackGeo = new THREE.LatheGeometry([[0.14, 0], [0.13, 0.28], [0.17, 0.5], [0.3, 0.78], [0.36, 0.98], [0.3, 1.1], [0.2, 1.14], [0.19, 1.1]].map(([r, h]) => new THREE.Vector2(r, h)), 24)

export function Locomotive({ position, yaw = Math.PI / 2 }) {
  const [x, z] = position
  const m = mm()
  const green = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1f4a35', roughness: 0.35, metalness: 0.4 }), [])
  const red = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9b2a24', roughness: 0.5, metalness: 0.3 }), [])
  const lampGlow = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fff0c4', emissive: '#ffd890', emissiveIntensity: 0.6 }), [])
  const logGeo = useMemo(() => new THREE.CylinderGeometry(0.085, 0.085, 1.2, 8), [])
  const logs = useMemo(() => {
    const out = []
    for (let row = 0; row < 4; row++) for (let i = 0; i < 6 - (row > 1 ? 1 : 0); i++) out.push({ p: [-0.5 + i * 0.2 + (row % 2) * 0.1, 1.15 + row * 0.16, -4.6 + (hash(i * 3 + row) - 0.5) * 0.9], r: [Math.PI / 2, 0, Math.PI / 2 + (hash(i + row * 5) - 0.5) * 0.2], s: [1, 1, 1] })
    return out.map((l) => ({ ...l, p: [l.p[0], l.p[1], l.p[2]] }))
  }, [])
  const ties = useMemo(() => Array.from({ length: 24 }, (_, i) => ({ p: [0, 0.2, -5.5 + i * 0.5], s: [2.1, 0.08, 0.18] })), [])
  const cube = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const wheelY = 0.8
  const drivers = [-1.1, -2.6]
  return (
    <>
      <group position={[x, FY, z]} rotation={[0, yaw, 0]}>
        <RigidBody type="fixed" colliders={false}><CuboidCollider args={[1.1, 0.3, 6.2]} position={[0, 0.15, -0.7]} /><CuboidCollider args={[0.9, 1.4, 4.9]} position={[0, 1.7, -0.7]} /></RigidBody>
        {/* ballast bed, ties and rails */}
        <mesh position={[0, 0.1, -0.7]} receiveShadow><boxGeometry args={[2.5, 0.2, 12.2]} /><meshStandardMaterial color="#6e6a63" roughness={1} /></mesh>
        <Instances geometry={cube} material={m.walnutSolid} items={ties.map((t) => ({ ...t, p: [t.p[0], t.p[1] + 0.05, t.p[2] - 0.7] }))} receiveShadow />
        {[-0.7, 0.7].map((rx) => <mesh key={rx} position={[rx, 0.35, -0.7]} material={m.steel} castShadow><boxGeometry args={[0.08, 0.12, 12]} /></mesh>)}
        <group position={[0, 0.2, 0]}>
          {/* frame */}
          <mesh position={[0, 0.82, -0.3]} material={m.black} castShadow><boxGeometry args={[1.55, 0.22, 7.6]} /></mesh>
          <mesh position={[0, 0.82, 3.5]} material={red} castShadow><boxGeometry args={[1.9, 0.34, 0.22]} /></mesh>
          {/* boiler with bands, smokebox, domes, stack, headlamp */}
          <mesh position={[0, 1.75, 1.0]} rotation={[Math.PI / 2, 0, 0]} material={green} castShadow><cylinderGeometry args={[0.58, 0.58, 3.8, 28]} /></mesh>
          {[0.1, 1.3, 2.4].map((bz) => <mesh key={bz} position={[0, 1.75, bz]} rotation={[Math.PI / 2, 0, 0]} material={m.brass}><cylinderGeometry args={[0.595, 0.595, 0.08, 28]} /></mesh>)}
          <mesh position={[0, 1.75, 3.3]} rotation={[Math.PI / 2, 0, 0]} material={m.black} castShadow><cylinderGeometry args={[0.62, 0.62, 0.9, 28]} /></mesh>
          <mesh position={[0, 1.75, 3.77]} rotation={[Math.PI / 2, 0, 0]} material={m.steel}><cylinderGeometry args={[0.56, 0.56, 0.06, 28]} /></mesh>
          <mesh position={[0, 1.75, 3.82]} rotation={[Math.PI / 2, 0, 0]} material={m.brass}><cylinderGeometry args={[0.1, 0.1, 0.05, 14]} /></mesh>
          <mesh geometry={stackGeo} position={[0, 2.3, 3.1]} material={m.black} castShadow />
          <mesh position={[0, 2.5, 1.7]} scale={[0.4, 0.46, 0.4]} material={m.brass} castShadow><sphereGeometry args={[1, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
          <mesh position={[0, 2.38, 1.7]} material={m.brass}><cylinderGeometry args={[0.4, 0.4, 0.2, 18]} /></mesh>
          <mesh position={[0, 2.5, 0.55]} scale={[0.3, 0.32, 0.3]} material={m.brass}><sphereGeometry args={[1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
          <mesh position={[0, 2.35, 0.55]} material={m.brass}><cylinderGeometry args={[0.3, 0.3, 0.2, 16]} /></mesh>
          <Bar a={[0, 2.35, 1.1]} b={[0, 2.8, 1.1]} r={0.02} material={m.brass} />
          <mesh position={[0, 2.95, 1.1]} material={m.brass}><sphereGeometry args={[0.15, 12, 10, 0, Math.PI * 2, 0, Math.PI]} /></mesh>
          <group position={[0, 2.5, 3.78]}>
            <mesh position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]} material={m.brass}><cylinderGeometry args={[0.28, 0.32, 0.4, 18]} /></mesh>
            <mesh position={[0, 0, 0.32]} rotation={[Math.PI / 2, 0, 0]} material={lampGlow}><circleGeometry args={[0.24, 18]} /></mesh>
          </group>
          {/* cylinders, rods, valve gear */}
          {[-1, 1].map((sx) => (
            <group key={sx}>
              <mesh position={[sx * 0.88, 1.0, 2.45]} rotation={[Math.PI / 2, 0, 0]} material={m.black} castShadow><cylinderGeometry args={[0.2, 0.2, 1.0, 14]} /></mesh>
              <Bar a={[sx * 0.9, 1.0, 1.9]} b={[sx * 0.95, 0.95, -1.1]} r={0.05} material={m.steel} />
              <Bar a={[sx * 0.97, 0.95, -1.1]} b={[sx * 0.97, 0.95, -2.6]} r={0.05} material={m.steel} />
              <Bar a={[sx * 0.9, 1.0, 2.0]} b={[sx * 0.9, 1.55, 2.0]} r={0.025} material={m.brass} />
              {/* cab-side handrails */}
              <Bar a={[sx * 0.62, 1.7, 1.9]} b={[sx * 0.62, 1.7, 0.2]} r={0.015} material={m.brass} seg={5} />
            </group>
          ))}
          {/* wheels: two big drivers each side, a four-wheel leading truck */}
          {[-1, 1].map((sx) => drivers.map((dz) => <SpokedWheel key={`${sx}${dz}`} position={[sx * 0.75, wheelY, dz + 0.9]} r={0.78} w={0.16} spokes={14} wood={red} iron={m.black} tire={0.05} tireMat={m.steel} />))}
          {[-1, 1].map((sx) => [2.3, 3.2].map((dz) => <SpokedWheel key={`l${sx}${dz}`} position={[sx * 0.75, 0.42, dz]} r={0.4} w={0.12} spokes={10} wood={m.black} iron={m.black} tire={0.04} tireMat={m.steel} />))}
          {/* cowcatcher */}
          {Array.from({ length: 9 }, (_, i) => { const px = -0.85 + i * 0.2125; return <Bar key={i} a={[px, 0.98, 3.52]} b={[px * 0.15, 0.4, 4.35]} r={0.025} material={m.black} seg={5} /> })}
          <Bar a={[-0.85, 0.98, 3.52]} b={[0, 0.4, 4.35]} r={0.04} material={m.black} /><Bar a={[0.85, 0.98, 3.52]} b={[0, 0.4, 4.35]} r={0.04} material={m.black} />
          <Bar a={[-0.5, 0.7, 3.95]} b={[0.5, 0.7, 3.95]} r={0.03} material={m.black} />
          {/* cab */}
          <mesh position={[0, 2.62, -2.25]} material={m.walnutSolid} castShadow><boxGeometry args={[1.9, 0.1, 1.9]} /></mesh>
          {[[-0.85, -1.4], [0.85, -1.4], [-0.85, -3.1], [0.85, -3.1]].map(([cx, cz], i) => <mesh key={i} position={[cx, 1.8, cz]} material={m.walnutSolid}><boxGeometry args={[0.1, 1.7, 0.1]} /></mesh>)}
          {[-1, 1].map((sx) => <mesh key={sx} position={[sx * 0.85, 1.4, -2.25]} material={green}><boxGeometry args={[0.06, 0.8, 1.7]} /></mesh>)}
          <mesh position={[0, 1.35, -3.15]} material={green}><boxGeometry args={[1.7, 1.6, 0.06]} /></mesh>
          <mesh position={[0, 1.3, -0.7]} rotation={[0, 0, 0]} material={m.black}><boxGeometry args={[0.5, 0.5, 0.3]} /></mesh>
          {/* bell on a bracket */}
          <mesh position={[0, 2.62, 1.05]} material={m.brass}><coneGeometry args={[0.1, 0.16, 14]} /></mesh>
          {/* tender with a stack of firewood */}
          <mesh position={[0, 0.82, -5.0]} material={m.black} castShadow><boxGeometry args={[1.5, 0.2, 2.8]} /></mesh>
          <mesh position={[0, 1.2, -5.0]} material={green} castShadow><boxGeometry args={[1.7, 0.7, 2.6]} /></mesh>
          <Instances geometry={logGeo} material={m.oak} items={logs.map((l) => ({ ...l, p: [l.p[0], l.p[1] + 0.2, l.p[2] - 0.4] }))} castShadow />
          {[-1, 1].map((sx) => [-4.2, -5.6].map((dz) => <SpokedWheel key={`t${sx}${dz}`} position={[sx * 0.75, 0.42, dz]} r={0.4} w={0.12} spokes={10} wood={m.black} iron={m.black} tire={0.04} tireMat={m.steel} />))}
          <Bar a={[0, 0.9, -3.3]} b={[0, 0.9, -3.8]} r={0.05} material={m.black} />
        </group>
      </group>
      <Placard id="locomotive" position={[x - 4.5, 0, z - 3.0]} yaw={Math.PI} y={FY} />
    </>
  )
}

// ------------------------------------------------------------------ telegraph
const MSG = 'WHAT HATH GOD WROUGHT'
export function Telegraph({ position, yaw = -Math.PI / 2 }) {
  const [x, z] = position
  const m = mm()
  const lever = useRef(), lamp = useRef()
  const clockT = useRef(0)
  const run = useRef({ sched: null, t0: 0 })
  const lampMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffe9a8', emissive: '#ffb347', emissiveIntensity: 0.2 }), [])
  useFrame(({ clock }) => {
    clockT.current = clock.elapsedTime
    const r = run.current
    let down = false
    if (r.sched) {
      const t = clock.elapsedTime - r.t0
      down = r.sched.some((s) => t >= s.at && t < s.at + s.dur)
      if (t > r.sched[r.sched.length - 1].at + 1) r.sched = null
    }
    if (lever.current) lever.current.rotation.x = THREE.MathUtils.lerp(lever.current.rotation.x, down ? 0.14 : 0, 0.5)
    lampMat.emissiveIntensity = down ? 3 : 0.25
  })
  const f = [Math.sin(yaw), Math.cos(yaw)]
  useEffect(() => registerInteractable('telegraph-key', {
    position: new THREE.Vector3(x + f[0] * 1.1, FY + 1, z + f[1] * 1.1),
    radius: 2.1,
    label: 'Tap the telegraph key',
    onInteract: () => {
      if (run.current.sched) return
      const sched = playMorse(MSG)
      run.current = { sched, t0: clockT.current }
      useStore.getState().showToast('You tapped out "WHAT HATH GOD WROUGHT" in Morse code, the first long-distance telegraph message (1844).')
    },
  }), [x, z]) // eslint-disable-line react-hooks/exhaustive-deps
  const coil = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b5651d', roughness: 0.4, metalness: 0.8 }), [])
  const jar = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#9ccfc3', roughness: 0.05, transparent: true, opacity: 0.45, depthWrite: false }), [])
  return (
    <>
      <group position={[x, FY, z]} rotation={[0, yaw, 0]}>
        <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.75, 0.45, 0.45]} position={[0, 0.45, 0]} /></RigidBody>
        {/* oak desk */}
        <mesh position={[0, 0.78, 0]} material={m.oak} castShadow><boxGeometry args={[1.5, 0.06, 0.9]} /></mesh>
        <mesh position={[0, 0.74, 0]} material={m.walnutSolid}><boxGeometry args={[1.4, 0.04, 0.8]} /></mesh>
        {[[-0.68, -0.38], [0.68, -0.38], [-0.68, 0.38], [0.68, 0.38]].map(([lx, lz], i) => <mesh key={i} position={[lx, 0.38, lz]} material={m.walnutSolid} castShadow><boxGeometry args={[0.07, 0.76, 0.07]} /></mesh>)}
        <mesh position={[0, 0.2, -0.4]} material={m.walnutSolid}><boxGeometry args={[1.4, 0.4, 0.04]} /></mesh>
        {/* key: base plate, spring, lever, knob */}
        <group position={[-0.1, 0.81, 0.15]}>
          <mesh material={m.walnutSolid}><boxGeometry args={[0.36, 0.03, 0.2]} /></mesh>
          <mesh position={[0, 0.04, -0.05]} material={m.brass}><boxGeometry args={[0.1, 0.05, 0.08]} /></mesh>
          <group position={[0, 0.07, -0.05]}>
            <group ref={lever}>
              <mesh position={[0, 0.01, 0.12]} material={m.brass}><boxGeometry args={[0.03, 0.025, 0.3]} /></mesh>
              <mesh position={[0, 0.045, 0.24]} material={m.black}><sphereGeometry args={[0.04, 12, 10]} /></mesh>
              <mesh position={[0, 0.0, -0.1]} material={m.brass}><boxGeometry args={[0.03, 0.02, 0.12]} /></mesh>
            </group>
          </group>
          <mesh position={[0, 0.03, 0.1]} material={m.brass}><cylinderGeometry args={[0.012, 0.012, 0.05, 6]} /></mesh>
        </group>
        {/* sounder with two coils */}
        <group position={[0.35, 0.81, -0.05]}>
          <mesh material={m.walnutSolid}><boxGeometry args={[0.32, 0.03, 0.24]} /></mesh>
          {[-0.07, 0.07].map((cx) => <mesh key={cx} position={[cx, 0.07, 0]} material={coil} castShadow><cylinderGeometry args={[0.05, 0.05, 0.1, 14]} /></mesh>)}
          <mesh position={[0, 0.16, 0]} material={m.brass}><boxGeometry args={[0.24, 0.02, 0.04]} /></mesh>
          <mesh position={[0, 0.115, 0]} material={m.brass}><boxGeometry args={[0.02, 0.1, 0.02]} /></mesh>
        </group>
        {/* battery jar, wire spool, lamp */}
        <group position={[-0.5, 0.81, -0.2]}>
          <mesh position={[0, 0.1, 0]} material={jar}><cylinderGeometry args={[0.07, 0.07, 0.2, 14]} /></mesh>
          <mesh position={[0, 0.17, 0]} material={m.steel}><cylinderGeometry args={[0.012, 0.012, 0.16, 6]} /></mesh>
        </group>
        <mesh position={[0.55, 0.88, 0.2]} rotation={[Math.PI / 2, 0, 0]} material={coil}><torusGeometry args={[0.06, 0.03, 8, 16]} /></mesh>
        <mesh ref={lamp} position={[0.1, 0.93, -0.28]} material={lampMat}><sphereGeometry args={[0.06, 12, 10]} /></mesh>
        <mesh position={[0.1, 0.84, -0.28]} material={m.brass}><cylinderGeometry args={[0.05, 0.07, 0.1, 10]} /></mesh>
        {/* chair */}
        <group position={[0, 0, 0.85]}>
          <mesh position={[0, 0.45, 0]} material={m.oak}><boxGeometry args={[0.42, 0.05, 0.42]} /></mesh>
          <mesh position={[0, 0.8, 0.2]} material={m.oak}><boxGeometry args={[0.42, 0.5, 0.04]} /></mesh>
          {[[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].map(([cx, cz], i) => <mesh key={i} position={[cx, 0.22, cz]} material={m.oak}><boxGeometry args={[0.04, 0.44, 0.04]} /></mesh>)}
        </group>
      </group>
      <Placard id="telegraph" position={[x + f[0] * 1.9 + 0.0, 0, z + f[1] * 1.9 - 0.9 * f[0]]} yaw={yaw} y={FY} />
    </>
  )
}
