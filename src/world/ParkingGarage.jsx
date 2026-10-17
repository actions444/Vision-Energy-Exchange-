import { useEffect, useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import * as THREE from 'three'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { BrandSign } from './signs.jsx'
import { SITE, CENTER, GROUND_Y, MODEL_URL, SCALE, HEIGHT, DEPTH, ZONE } from '../config/parkingGarage.js'

// ============================================================================
// STORMLINE PARKING GARAGE
// The one imported art asset in this project (a Tripo3D model the player supplied), everything
// else here is procedural. Scaled and dropped onto its site east of the Employment District.
// Collision is a hand-built approximation (flat deck slabs + ramps) since the import itself has
// no physics of its own — same approach the rest of the city uses for interiors.
// ============================================================================

export default function ParkingGarage() {
  const gltf = useLoader(GLTFLoader, MODEL_URL, (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder)
  })
  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true)
    clone.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
    return clone
  }, [gltf])

  return (
    <group>
      <group position={[CENTER.x, GROUND_Y, CENTER.z]} scale={SCALE}>
        <primitive object={scene} />
      </group>
      <Colliders />
      <BrandSign text="STORMLINE PARKING" sub="4 LEVELS · OPEN 24/7" position={[CENTER.x, GROUND_Y + HEIGHT + 0.9, SITE.z0 - 0.3]} rotation={[0, Math.PI, 0]} width={16} color="#8fe8ff" glow="#ff2fa0" size={120} />
    </group>
  )
}

// Provisional collision: a simple stack of flat deck colliders at estimated level heights, plus
// the ground floor. Levels are refined after visually inspecting the rendered model in-game.
function Colliders() {
  const w = (SITE.x1 - SITE.x0) / 2 - 0.6
  const d = DEPTH / 2 - 0.6
  const cx = CENTER.x, cz = CENTER.z
  const levelYs = [0, 1, 2, 3].map((i) => GROUND_Y + i * (HEIGHT / 4))
  return (
    <RigidBody type="fixed" colliders={false}>
      {levelYs.map((y, i) => (
        <CuboidCollider key={i} args={[w, 0.15, d]} position={[cx, y + 0.15, cz]} />
      ))}
    </RigidBody>
  )
}
