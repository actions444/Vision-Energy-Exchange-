import * as THREE from 'three'
import { CURB } from './City.jsx'

// A visual bus shelter on the east sidewalk of the main avenue, facing the road.
// Visual only: no colliders, so it can never trap the player.
const GLASS = new THREE.MeshStandardMaterial({ color: '#9fd3e8', transparent: true, opacity: 0.35, roughness: 0.1 })
const STEEL = new THREE.MeshStandardMaterial({ color: '#8a9099', roughness: 0.5, metalness: 0.6 })
const BENCH = new THREE.MeshStandardMaterial({ color: '#5b3d2a', roughness: 0.8 })
const SIGN = new THREE.MeshStandardMaterial({ color: '#1f7a46', emissive: '#14592f', emissiveIntensity: 0.6 })

export default function BusStop({ position = [8.6, CURB, 40] }) {
  return (
    <group name="bus-stop-1" position={position}>
      {/* roof */}
      <mesh position={[0, 2.4, 0]} material={STEEL} castShadow><boxGeometry args={[2.6, 0.12, 1.6]} /></mesh>
      {/* back glass */}
      <mesh position={[0, 1.25, -0.72]} material={GLASS}><boxGeometry args={[2.6, 2.2, 0.04]} /></mesh>
      {/* side glass */}
      <mesh position={[-1.27, 1.25, 0]} material={GLASS}><boxGeometry args={[0.04, 2.2, 1.6]} /></mesh>
      {/* posts */}
      {[[-1.27, -0.72], [1.27, -0.72], [-1.27, 0.72], [1.27, 0.72]].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.2, z]} material={STEEL}><boxGeometry args={[0.07, 2.4, 0.07]} /></mesh>
      ))}
      {/* bench */}
      <mesh position={[0, 0.45, -0.35]} material={BENCH} castShadow><boxGeometry args={[1.9, 0.08, 0.45]} /></mesh>
      {/* route sign on a pole at the kerb */}
      <mesh position={[1.7, 1.6, 0.9]} material={STEEL}><cylinderGeometry args={[0.04, 0.04, 3.0, 8]} /></mesh>
      <mesh position={[1.7, 2.9, 0.9]} material={SIGN}><boxGeometry args={[0.5, 0.5, 0.05]} /></mesh>
    </group>
  )
}
