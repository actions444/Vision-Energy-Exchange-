import * as THREE from 'three'
import { Block } from './jobkit.jsx'
import { SUN_DECK_Y } from '../config/sunAtrium.js'
import DinoSkeleton from './DinoSkeletons.jsx'

// Sun Auditorium Museum, stage 1: a tall open atrium on the beach platform. The roof is a steel frame
// with clear glass, so the sun comes straight through. Only code-built geometry, so it works even when
// GLB files are not served (for example in a single-file artifact).
const X0 = 124, X1 = 144, Z0 = -42, Z1 = 2 // inside the platform (x 122..146, z -45..5)
const WALL_H = 9, ROOF_H = 12
const FLOOR_Y = SUN_DECK_Y
const CEIL_Y = FLOOR_Y + ROOF_H
const STONE = new THREE.MeshStandardMaterial({ color: '#e8e2d4', roughness: 0.8 })
const FLOOR = new THREE.MeshStandardMaterial({ color: '#f3efe6', roughness: 0.25, metalness: 0.05 })
const STEEL = new THREE.MeshStandardMaterial({ color: '#b9bec6', roughness: 0.4, metalness: 0.7 })
const GLASS = new THREE.MeshStandardMaterial({ color: '#dff4ff', transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0, depthWrite: false })

const DOOR = { z0: -23, z1: -18 } // gap in the west wall (the entrance from the boardwalk)

function Wall({ x0, x1, z0, z1, h = WALL_H }) {
  const w = x1 - x0, d = z1 - z0
  return <Block position={[(x0 + x1) / 2, FLOOR_Y + h / 2, (z0 + z1) / 2]} size={[w, h, d]} material={STONE} collide />
}

export default function SunAuditoriumMuseum() {
  const cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2
  const beamsX = [], beamsZ = []
  for (let z = Z0; z <= Z1 + 0.01; z += 4) beamsX.push(z)
  for (let x = X0; x <= X1 + 0.01; x += 4) beamsZ.push(x)
  return (
    <group name="sun-auditorium-museum">
      {/* polished floor */}
      <mesh position={[cx, FLOOR_Y + 0.01, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={FLOOR}>
        <planeGeometry args={[X1 - X0, Z1 - Z0]} />
      </mesh>

      {/* stone walls: west wall has the entrance gap; the others are solid stone with clear glass above */}
      <Wall x0={X0 - 0.5} x1={X0} z0={Z0} z1={DOOR.z0} />
      <Wall x0={X0 - 0.5} x1={X0} z0={DOOR.z1} z1={Z1} />
      <Wall x0={X1} x1={X1 + 0.5} z0={Z0} z1={Z1} />
      <Wall x0={X0} x1={X1} z0={Z0 - 0.5} z1={Z0} />
      <Wall x0={X0} x1={X1} z0={Z1} z1={Z1 + 0.5} />

      {/* open glass roof: steel frame and clear panes, no solid roof slab */}
      {beamsX.map((z, i) => (
        <mesh key={'bx' + i} position={[cx, CEIL_Y, z]} material={STEEL}><boxGeometry args={[X1 - X0, 0.25, 0.25]} /></mesh>
      ))}
      {beamsZ.map((x, i) => (
        <mesh key={'bz' + i} position={[x, CEIL_Y, cz]} material={STEEL}><boxGeometry args={[0.25, 0.25, Z1 - Z0]} /></mesh>
      ))}
      <mesh position={[cx, CEIL_Y + 0.02, cz]} rotation={[-Math.PI / 2, 0, 0]} material={GLASS} castShadow={false}>
        <planeGeometry args={[X1 - X0, Z1 - Z0]} />
      </mesh>

      {/* dinosaur skeletons inside the atrium */}
      <DinoSkeleton position={[131, FLOOR_Y, -31]} yaw={0.3} scale={1} />
      <DinoSkeleton position={[138, FLOOR_Y, -11]} yaw={-0.6} scale={0.8} />

      {/* dinosaur skeletons outside on the sand, in front of the entrance */}
      <DinoSkeleton position={[104, 0.15, -15]} yaw={0.4} scale={1} />
      <DinoSkeleton position={[110, 0.15, -36]} yaw={-0.8} scale={0.9} />
    </group>
  )
}
