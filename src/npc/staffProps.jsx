import * as THREE from 'three'

// Hand props for the museum and gym crews (the pool crew's props live in StaffNpcs.jsx).
let M = null
const m = () => M || (M = {
  steel: new THREE.MeshStandardMaterial({ color: '#c9ccd4', roughness: 0.25, metalness: 0.9 }),
  black: new THREE.MeshStandardMaterial({ color: '#111116', roughness: 0.4, metalness: 0.4 }),
  rubber: new THREE.MeshStandardMaterial({ color: '#1a1a1e', roughness: 0.9 }),
  wood: new THREE.MeshStandardMaterial({ color: '#a8764a', roughness: 0.6 }),
  bristle: new THREE.MeshStandardMaterial({ color: '#d8c7a0', roughness: 0.95 }),
  screen: new THREE.MeshStandardMaterial({ color: '#0f1830', emissive: '#4a7bd8', emissiveIntensity: 0.6, roughness: 0.3 }),
  teal: new THREE.MeshStandardMaterial({ color: '#2fd0c4', roughness: 0.4 }),
  pink: new THREE.MeshStandardMaterial({ color: '#ff2e9a', roughness: 0.5 }),
  bottle: new THREE.MeshPhysicalMaterial({ color: '#7fe8ff', roughness: 0.15, transparent: true, opacity: 0.7 }),
})

function Brush() {
  return (
    <group rotation={[0.6, 0, 0]}>
      <mesh position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]} material={m().wood}><cylinderGeometry args={[0.012, 0.012, 0.28, 8]} /></mesh>
      <mesh position={[0, 0, 0.28]} material={m().bristle}><boxGeometry args={[0.06, 0.03, 0.09]} /></mesh>
    </group>
  )
}
function Dumbbell() {
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh material={m().steel}><cylinderGeometry args={[0.015, 0.015, 0.2, 8]} /></mesh>
      {[-0.1, 0.1].map((y) => <mesh key={y} position={[0, y, 0]} material={m().rubber}><cylinderGeometry args={[0.055, 0.055, 0.05, 14]} /></mesh>)}
    </group>
  )
}
function Tablet() {
  return (
    <group>
      <mesh material={m().black}><boxGeometry args={[0.2, 0.28, 0.012]} /></mesh>
      <mesh position={[0, 0, 0.008]} material={m().screen}><boxGeometry args={[0.18, 0.25, 0.004]} /></mesh>
    </group>
  )
}
function Bottle() {
  return (
    <group>
      <mesh material={m().bottle}><cylinderGeometry args={[0.03, 0.03, 0.2, 12]} /></mesh>
      <mesh position={[0, 0.115, 0]} material={m().teal}><cylinderGeometry args={[0.022, 0.03, 0.03, 12]} /></mesh>
    </group>
  )
}
function Radio() {
  return (
    <group>
      <mesh material={m().black}><boxGeometry args={[0.05, 0.1, 0.03]} /></mesh>
      <mesh position={[0.015, 0.08, 0]} material={m().black}><cylinderGeometry args={[0.004, 0.004, 0.08, 4]} /></mesh>
    </group>
  )
}
function Towel() {
  return (
    <group>
      <mesh material={m().teal}><boxGeometry args={[0.3, 0.05, 0.2]} /></mesh>
      <mesh position={[0, 0.05, 0]} material={m().pink}><boxGeometry args={[0.3, 0.05, 0.2]} /></mesh>
    </group>
  )
}

export const EXTRA_PROPS = {
  brush: { C: Brush, pos: [0.22, 1.1, 0.25] },
  dumbbell: { C: Dumbbell, pos: [0.3, 0.95, 0.2] },
  tablet: { C: Tablet, pos: [0, 1.15, 0.3], rot: [-0.5, 0, 0] },
  bottle: { C: Bottle, pos: [0.22, 1.2, 0.28] },
  radio: { C: Radio, pos: [-0.12, 1.45, 0.12] },
  towel: { C: Towel, pos: [0, 1.05, 0.3] },
}
