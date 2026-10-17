import { useMemo } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface } from './materials.js'
import { Trees, FlowerBed, Bench, StreetLamp, Lawn } from './props.jsx'
import { BrandSign } from './signs.jsx'
import JobCenter from './JobCenter.jsx'
import PostOffice from './PostOffice.jsx'
import CarWash from './CarWash.jsx'
import Workers from './Workers.jsx'
import JobDirector from './JobDirector.jsx'
import { DISTRICT, JC, PO, WASH_A, WASH_B, STOPS, CURB } from '../config/jobs.js'

// The Employment District: Job Center, Post Office, two car washes, a courtyard and the street furniture
// that the jobs use (mailboxes, delivery posts). Everything is on the raised sidewalk.

export { DISTRICT, JC, PO, WASH_A, WASH_B }

function MailBox({ x, z, yaw = 0 }) {
  const blue = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1d3f8f', roughness: 0.45, metalness: 0.3 }), [])
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0b1020', roughness: 0.6 }), [])
  return (
    <group position={[x, CURB, z]} rotation={[0, yaw, 0]}>
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.28, 0.55, 0.24]} position={[0, 0.55, 0]} /></RigidBody>
      <mesh position={[0, 0.35, 0]} material={blue} castShadow><boxGeometry args={[0.5, 0.7, 0.44]} /></mesh>
      <mesh position={[0, 0.85, 0]} rotation={[0, 0, Math.PI / 2]} material={blue} castShadow><cylinderGeometry args={[0.22, 0.22, 0.5, 14, 1, false, 0, Math.PI]} /></mesh>
      <mesh position={[0, 0.75, 0.225]} material={dark}><boxGeometry args={[0.32, 0.04, 0.02]} /></mesh>
      <mesh position={[0, 0.1, 0]} material={dark}><boxGeometry args={[0.55, 0.2, 0.48]} /></mesh>
    </group>
  )
}

function AddressPost({ x, z, yaw = 0 }) {
  const m = getMaterials()
  const brass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c9a24a', roughness: 0.35, metalness: 0.8 }), [])
  return (
    <group position={[x, CURB, z]} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.5, 0]} material={m.blackSteel} castShadow><cylinderGeometry args={[0.04, 0.05, 1.0, 8]} /></mesh>
      <mesh position={[0, 1.0, 0]} material={brass} castShadow><boxGeometry args={[0.3, 0.2, 0.08]} /></mesh>
      <mesh position={[0, 0.96, 0.05]} material={m.blackSteel}><boxGeometry args={[0.2, 0.03, 0.02]} /></mesh>
    </group>
  )
}

export default function JobDistrict() {
  const m = getMaterials()
  const D = DISTRICT
  const trees = useMemo(() => [[74, CURB, 57, 1.05], [80, CURB, 61, 1.1], [77, CURB, 66, 1.0], [34.4, CURB, 66, 1.0], [68, CURB, 67, 0.95]], [])
  const mailboxes = ['mb-lounge', 'mb-north', 'mb-far', 'mb-plazaN', 'mb-plazaS'].map((id) => STOPS[id])
  const posts = ['ad-lounge', 'ad-plaza', 'ad-records', 'ad-cinema', 'ad-gallery', 'ad-jobs'].map((id) => STOPS[id])
  return (
    <group>
      {/* paved ground for the whole district (sits just above the sidewalk) */}
      <mesh position={[(D.x0 + D.x1) / 2, CURB + 0.006, (D.z0 - 1.8 + D.z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={surface('pavers', (D.x1 - D.x0) / 3, (D.z1 - D.z0) / 3)} receiveShadow>
        <planeGeometry args={[D.x1 - D.x0, D.z1 - D.z0 + 1.8]} />
      </mesh>
      <Lawn x0={72} x1={82} z0={55} z1={68.5} y={CURB + 0.004} />
      <Trees trees={trees} />

      <JobCenter />
      <PostOffice />
      <CarWash site={WASH_A} zone="car-wash-a" />
      <CarWash site={WASH_B} zone="car-wash-b" />

      {/* courtyard: planters, lamps, benches */}
      {[[56.5, 51.5], [66.5, 51.5], [72.5, 51.5], [78, 51.5]].map(([x, z], i) => <FlowerBed key={i} x={x} z={z} w={2.2} d={1.2} y={CURB} seed={20 + i} />)}
      {[[61.5, 51.4], [75.2, 51.4], [34.4, 40]].map(([x, z], i) => <StreetLamp key={i} position={[x, CURB, z]} yaw={0} />)}
      <Bench position={[68.5, CURB, 56.2]} yaw={Math.PI} />
      <Bench position={[62, CURB, 55.2]} yaw={Math.PI} length={1.6} />

      {/* gateway banner over the gap between the Lounge and the car wash */}
      {[32.4, 35.6].map((x) => <mesh key={x} position={[x, CURB + 3.2, 29.6]} material={m.blackSteel} castShadow><cylinderGeometry args={[0.1, 0.12, 6.4, 8]} /></mesh>)}
      <mesh position={[34, CURB + 5.6, 29.6]} material={m.blackSteel} castShadow><boxGeometry args={[4.2, 1.5, 0.2]} /></mesh>
      <BrandSign text="EMPLOYMENT DISTRICT" sub="JOBS · POST OFFICE · CAR WASH" position={[34, CURB + 5.6, 29.48]} rotation={[0, Math.PI, 0]} width={4.0} color="#f4f1ea" glow="#ffe2a0" size={120} />

      {/* mailboxes and delivery posts used by the mail jobs */}
      {mailboxes.map((s) => <MailBox key={s.id} x={s.x + (s.x > 0 ? 0.8 : -0.8)} z={s.z} yaw={s.x > 0 ? Math.PI / 2 : -Math.PI / 2} />)}
      {posts.map((s) => <AddressPost key={s.id} x={s.x + (s.x > 30 ? 0 : s.x > 0 ? 0.6 : -0.6)} z={s.x > 30 ? s.z - 0.8 : s.z + (s.id === 'ad-gallery' ? -0.4 : 0)} yaw={0} />)}

      <Workers />
      <JobDirector />
    </group>
  )
}
