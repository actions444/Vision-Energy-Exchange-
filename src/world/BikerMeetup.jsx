import { useMemo } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface } from './materials.js'
import { nightLit } from '../state/environment.js'
import { BrandSign, Plaque } from './signs.jsx'
import { Bench, Bollard, LightAnchor } from './props.jsx'
import { DiningSet } from './furniture.jsx'
import { LOT, GROUND, WALL_Z, WALL_H, CX, CZ } from '../config/bikerMeetup.js'

// Iron Horse M.C. clubhouse lot: a low-key open-air biker hangout. A graffiti-tagged brick wall
// backs the lot, string lights and a neon sign hang over the yard, a fire barrel and a couple of
// picnic tables give people somewhere to sit, and a row of drivable motorcycles (see
// vehicles/vehicles.js, config/bikerMeetup.js) leans against the wall ready to ride. No shop, no
// panel - just a place riders can meet up.

export { LOT }

function FireBarrel({ position }) {
  const drum = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4a2a1a', roughness: 0.75, metalness: 0.3 }), [])
  const band = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1b1b1f', roughness: 0.5, metalness: 0.7 }), [])
  const fire = useMemo(() => nightLit(new THREE.MeshStandardMaterial({ color: '#2a1206', emissive: '#ff7a1f', emissiveIntensity: 1.6, roughness: 0.6 }), 1, 0.7), [])
  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.32, 0.4, 0.32]} position={[0, 0.4, 0]} />
      </RigidBody>
      <mesh position={[0, 0.4, 0]} material={drum} castShadow><cylinderGeometry args={[0.32, 0.28, 0.8, 16]} /></mesh>
      {[0.2, 0.5].map((y) => <mesh key={y} position={[0, y, 0]} material={band}><cylinderGeometry args={[0.33, 0.33, 0.04, 16]} /></mesh>)}
      <mesh position={[0, 0.82, 0]} material={fire}><coneGeometry args={[0.22, 0.5, 10]} /></mesh>
      <LightAnchor position={[position[0], position[1] + 0.9, position[2]]} color="#ff8a3c" intensity={26} distance={10} night range={26} />
    </group>
  )
}

/** A bulb on a sagging catenary string, strung between two anchor points. */
function LightString({ a, b, sag = 0.5, count = 7 }) {
  const m = getMaterials()
  const bulb = useMemo(() => nightLit(new THREE.MeshStandardMaterial({ color: '#2a2016', emissive: '#ffcf7a', emissiveIntensity: 1.4 }), 1, 0.4), [])
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
  const brick = useMemo(() => surface('brick', (LOT.x1 - LOT.x0) / 4, WALL_H / 3, { color: '#5a3b32' }), [])
  const cap = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2a2d', roughness: 0.7 }), [])
  const w = LOT.x1 - LOT.x0
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[w / 2, WALL_H / 2, 0.3]} position={[CX, WALL_H / 2, WALL_Z]} />
      </RigidBody>
      <mesh position={[CX, WALL_H / 2, WALL_Z]} material={brick} castShadow receiveShadow><boxGeometry args={[w, WALL_H, 0.6]} /></mesh>
      <mesh position={[CX, WALL_H + 0.05, WALL_Z]} material={cap}><boxGeometry args={[w + 0.2, 0.1, 0.7]} /></mesh>
      <BrandSign text="IRON HORSE" sub="M.C. · RIDERS WELCOME" position={[CX, WALL_H - 1.1, WALL_Z + 0.32]} width={11} color="#f2efe6" glow="#ff5a3c" />
      <Plaque lines={['IRON HORSE M.C.', 'Park up. Hang out. Ride on.']} position={[LOT.x0 + 3, 1.5, WALL_Z + 0.32]} width={1.3} />
    </group>
  )
}

export default function BikerMeetup() {
  const ground = useMemo(() => surface('asphalt', (LOT.x1 - LOT.x0) / 5, (LOT.z1 - LOT.z0) / 5, { color: '#2c2c30' }), [])
  const w = LOT.x1 - LOT.x0, d = LOT.z1 - LOT.z0
  const cx = CX, cz = CZ
  return (
    <group>
      <mesh position={[cx, GROUND + 0.006, cz]} rotation={[-Math.PI / 2, 0, 0]} material={ground} receiveShadow><planeGeometry args={[w, d]} /></mesh>
      <Backdrop />
      {/* string lights strung from the wall out over the yard */}
      <LightString a={[LOT.x0 + 3, WALL_H - 0.3, WALL_Z]} b={[cx, 4.6, cz + 6]} />
      <LightString a={[cx, 4.6, cz + 6]} b={[LOT.x1 - 3, WALL_H - 0.3, WALL_Z]} />
      {/* fire barrel and seating in the open middle of the yard */}
      <FireBarrel position={[cx, GROUND, cz - 1]} />
      <DiningSet position={[LOT.x0 + 9, GROUND, LOT.z1 - 4.5]} chairs={4} size={1.1} color="#2f2a26" top="#4a3a2c" />
      <DiningSet position={[LOT.x1 - 9, GROUND, LOT.z1 - 4.5]} chairs={4} size={1.1} color="#2f2a26" top="#4a3a2c" />
      <Bench position={[LOT.x0 + 1.4, GROUND, cz]} yaw={-Math.PI / 2} length={2.2} />
      <Bench position={[LOT.x1 - 1.4, GROUND, cz]} yaw={Math.PI / 2} length={2.2} />
      {/* entrance markers at the open (north) side of the lot */}
      <Bollard position={[LOT.x0 + 2, GROUND, LOT.z1 - 0.6]} />
      <Bollard position={[LOT.x1 - 2, GROUND, LOT.z1 - 0.6]} />
    </group>
  )
}
