import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { MODEL_URL, SCALE, SIZE } from '../config/skylineSuite.js'

// Skyline Suite living room furniture: an imported model dropped onto the suite's existing floor
// (see Suite() in PlazaRooms.jsx, which places this where the old hand-built rug/sofas/table
// used to sit). A simple box collider stands in for per-piece collision/seating — this set is a
// visual upgrade, not a sittable furniture kit like the rest of the room.
export default function SkylineSuiteSet({ position, yaw = 0 }) {
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
    <group position={position} rotation={[0, yaw, 0]}>
      <group scale={SCALE}>
        <primitive object={scene} />
      </group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[SIZE.x / 2 - 0.3, SIZE.y / 2, SIZE.z / 2 - 0.3]} position={[0, SIZE.y / 2, 0]} />
      </RigidBody>
    </group>
  )
}
