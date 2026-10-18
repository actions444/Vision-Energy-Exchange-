import { useMemo } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface } from './materials.js'
import { nightLit } from '../state/environment.js'
import { BrandSign, Plaque } from './signs.jsx'
import { Bench, Bollard, LightAnchor, Atm } from './props.jsx'
import { DiningSet } from './furniture.jsx'
import { LOT, GROUND, WALL_Z, WALL_H, CX, CZ } from '../config/steelWolves.js'

// Steel Wolves M.C. clubhouse lot: the second biker meetup, north of the Ranch in Maple Court. Same
// honest scope as Iron Horse (world/BikerMeetup.jsx) - an open-air hangout, no shop, no panel, just
// somewhere riders can park up - but its own gang, its own corner, and a cooler steel-blue palette
// against Iron Horse's rust-and-neon look. The backdrop wall sits at the north edge here (the lot
// opens south, toward the road), so it's a mirror of the Iron Horse layout rather than a copy.

export { LOT }

function FireBarrel({ position }) {
  const drum = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2c333a', roughness: 0.7, metalness: 0.4 }), [])
  const band = useMemo(() => new THREE.MeshStandardMaterial({ color: '#13161a', roughness: 0.5, metalness: 0.7 }), [])
  const fire = useMemo(() => nightLit(new THREE.MeshStandardMaterial({ color: '#0e1a22', emissive: '#4fd4ff', emissiveIntensity: 1.5, roughness: 0.6 }), 1, 0.7), [])
  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.32, 0.4, 0.32]} position={[0, 0.4, 0]} />
      </RigidBody>
      <mesh position={[0, 0.4, 0]} material={drum} castShadow><cylinderGeometry args={[0.32, 0.28, 0.8, 16]} /></mesh>
      {[0.2, 0.5].map((y) => <mesh key={y} position={[0, y, 0]} material={band}><cylinderGeometry args={[0.33, 0.33, 0.04, 16]} /></mesh>)}
      <mesh position={[0, 0.82, 0]} material={fire}><coneGeometry args={[0.22, 0.5, 10]} /></mesh>
      <LightAnchor position={[position[0], position[1] + 0.9, position[2]]} color="#6fd8ff" intensity={26} distance={10} night range={26} />
    </group>
  )
}

function LightString({ a, b, sag = 0.5, count = 7 }) {
  const m = getMaterials()
  const bulb = useMemo(() => nightLit(new THREE.MeshStandardMaterial({ color: '#1a2430', emissive: '#9fe3ff', emissiveIntensity: 1.4 }), 1, 0.4), [])
  const pts = useMemo(() => Array.from({ length: count }, (_, i) => {
    const t = (i + 0.5) / count
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(Math.PI * t) * sag, a[2] + (b[2] - a[2]) * t]
  }), [a[0], a[1], a[2], b[0], b[1], b[2], sag, count]) // eslint-disable-line react-hooks/exhaustive-deps
  const wire = useMemo(() => new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z))), [pts])
  const wireGeo = useMemo(() => new THREE.TubeGeometry(wire, 20, 0.006, 4, false), [wire])
  return (
    <group>
      <mesh geometry={wireGeo} material={m.blackSteel} />
      {pts.map((p, i) => <mesh key={i} position={p} material={bulb}><sphereGeometry args={[0.05, 8, 8]} /></mesh>)}
    </group>
  )
}

function Backdrop() {
  const brick = useMemo(() => surface('brick', (LOT.x1 - LOT.x0) / 4, WALL_H / 3, { color: '#3a4450' }), [])
  const cap = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1c2228', roughness: 0.7 }), [])
  const w = LOT.x1 - LOT.x0
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[w / 2, WALL_H / 2, 0.3]} position={[CX, WALL_H / 2, WALL_Z]} />
      </RigidBody>
      <mesh position={[CX, WALL_H / 2, WALL_Z]} material={brick} castShadow receiveShadow><boxGeometry args={[w, WALL_H, 0.6]} /></mesh>
      <mesh position={[CX, WALL_H + 0.05, WALL_Z]} material={cap}><boxGeometry args={[w + 0.2, 0.1, 0.7]} /></mesh>
      <BrandSign text="STEEL WOLVES" sub="M.C. · RUN WITH THE PACK" position={[CX, WALL_H - 1.1, WALL_Z - 0.32]} rotation={[0, Math.PI, 0]} width={11} color="#e9f2f8" glow="#4fd4ff" />
      <Plaque lines={['STEEL WOLVES M.C.', 'Park up. Hang out. Ride on.']} position={[LOT.x0 + 3, 1.5, WALL_Z - 0.32]} rotation={[0, Math.PI, 0]} width={1.3} />
    </group>
  )
}

export default function SteelWolves() {
  const ground = useMemo(() => surface('asphalt', (LOT.x1 - LOT.x0) / 5, (LOT.z1 - LOT.z0) / 5, { color: '#20242a' }), [])
  const w = LOT.x1 - LOT.x0, d = LOT.z1 - LOT.z0
  const cx = CX, cz = CZ
  return (
    <group>
      <mesh position={[cx, GROUND + 0.006, cz]} rotation={[-Math.PI / 2, 0, 0]} material={ground} receiveShadow><planeGeometry args={[w, d]} /></mesh>
      <Backdrop />
      {/* string lights strung from the wall out over the yard, toward the open (south) side */}
      <LightString a={[LOT.x0 + 3, WALL_H - 0.3, WALL_Z]} b={[cx, 4.6, cz - 6]} />
      <LightString a={[cx, 4.6, cz - 6]} b={[LOT.x1 - 3, WALL_H - 0.3, WALL_Z]} />
      <FireBarrel position={[cx, GROUND, cz + 1]} />
      <DiningSet position={[LOT.x0 + 9, GROUND, LOT.z0 + 4.5]} chairs={4} size={1.1} color="#242a30" top="#33424f" />
      <DiningSet position={[LOT.x1 - 9, GROUND, LOT.z0 + 4.5]} chairs={4} size={1.1} color="#242a30" top="#33424f" />
      <Bench position={[LOT.x0 + 1.4, GROUND, cz]} yaw={-Math.PI / 2} length={2.2} />
      <Bench position={[LOT.x1 - 1.4, GROUND, cz]} yaw={Math.PI / 2} length={2.2} />
      {/* entrance markers at the open (south) side of the lot */}
      <Bollard position={[LOT.x0 + 2, GROUND, LOT.z0 + 0.6]} />
      <Bollard position={[LOT.x1 - 2, GROUND, LOT.z0 + 0.6]} />
      <Atm id="atm-wolves" position={[LOT.x1 - 3.4, GROUND, WALL_Z - 0.9]} yaw={Math.PI} />
    </group>
  )
}
