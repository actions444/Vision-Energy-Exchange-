import * as THREE from 'three'

// Dinosaur skeletons built from simple bone shapes (no licensed or imported models). Each one is a
// theropod-style frame: skull, spine, ribs, tail, and two hind legs. `scale` sets the size; the
// skeleton is about 6 m long at scale 1 and faces +x before `yaw` is applied.
const BONE = new THREE.MeshStandardMaterial({ color: '#e9e1cc', roughness: 0.7 })
const DARK = new THREE.MeshStandardMaterial({ color: '#8a8270', roughness: 0.8 })

function Vertebra({ x, y, z, r }) {
  return <mesh position={[x, y, z]} material={BONE} castShadow><sphereGeometry args={[r, 10, 8]} /></mesh>
}

function Rib({ x, y, z, len, tilt }) {
  return <mesh position={[x, y, z]} rotation={[0, 0, tilt]} material={BONE}><cylinderGeometry args={[0.05, 0.05, len, 6]} /></mesh>
}

export default function DinoSkeleton({ position = [0, 0, 0], yaw = 0, scale = 1 }) {
  const spine = []
  for (let i = 0; i < 9; i++) spine.push({ x: -2.6 + i * 0.65, y: 2.2 - Math.abs(i - 4) * 0.02, r: 0.22 })
  const tail = []
  for (let i = 0; i < 7; i++) tail.push({ x: -3.2 - i * 0.45, y: 2.1 - i * 0.1, r: 0.2 - i * 0.02 })
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={scale}>
      {/* spine */}
      {spine.map((v, i) => <Vertebra key={'s' + i} x={v.x} y={v.y} z={0} r={v.r} />)}
      {/* tail */}
      {tail.map((v, i) => <Vertebra key={'t' + i} x={v.x} y={v.y} z={0} r={v.r} />)}
      {/* neck and skull */}
      <mesh position={[3.1, 2.9, 0]} rotation={[0, 0, -0.5]} material={BONE}><cylinderGeometry args={[0.16, 0.2, 1.2, 8]} /></mesh>
      <mesh position={[3.9, 3.4, 0]} material={BONE} castShadow><boxGeometry args={[1.5, 0.7, 0.6]} /></mesh>
      <mesh position={[4.45, 3.3, 0]} material={DARK}><boxGeometry args={[0.6, 0.25, 0.5]} /></mesh>
      {/* ribs on each side */}
      {[-1.8, -1.1, -0.4, 0.3, 1.0, 1.7].flatMap((x) => [
        <Rib key={'rl' + x} x={x} y={1.9} z={0.9} len={1.8} tilt={0.25} />,
        <Rib key={'rr' + x} x={x} y={1.9} z={-0.9} len={1.8} tilt={-0.25} />,
      ])}
      {/* hind legs: thigh, shin and foot */}
      {[0.9, -0.9].map((z) => (
        <group key={'leg' + z}>
          <mesh position={[-0.5, 1.0, z]} material={BONE}><cylinderGeometry args={[0.18, 0.14, 2.0, 8]} /></mesh>
          <mesh position={[-0.2, 0.2, z]} material={BONE}><cylinderGeometry args={[0.1, 0.1, 1.2, 6]} /></mesh>
          <mesh position={[0.2, 0.05, z]} material={DARK}><boxGeometry args={[1.0, 0.1, 0.35]} /></mesh>
        </group>
      ))}
      {/* small forelegs */}
      {[0.9, -0.9].map((z) => (
        <mesh key={'fl' + z} position={[1.6, 1.2, z]} material={BONE}><cylinderGeometry args={[0.07, 0.07, 1.2, 6]} /></mesh>
      ))}
    </group>
  )
}
