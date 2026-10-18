import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { Sofa, Table, Rug, Plant } from './furniture.jsx'
import { MODEL_URL, SCALE, SIZE } from '../config/skylineSuite.js'
import GLBBoundary from './GLBBoundary.jsx'

// Skyline Suite living room furniture: an imported model dropped onto the suite's existing floor
// (see Suite() in PlazaRooms.jsx, which places this where the old hand-built rug/sofas/table
// used to sit). A simple box collider stands in for per-piece collision/seating — this set is a
// visual upgrade, not a sittable furniture kit like the rest of the room.
//
// Wrapped in GLBBoundary: this model isn't available inside the Claude artifact preview (.glb
// files there 404), so a failed load just skips the furniture there instead of taking the whole
// app down. The collider still lands so the floor space collides the same either way.
export default function SkylineSuiteSet(props) {
  return (
    <GLBBoundary fallback={<SkylineSuiteCollider {...props} />}>
      <SkylineSuiteModel {...props} />
    </GLBBoundary>
  )
}

// Procedural stand-in furniture cluster: used whenever the real .glb can't load (always true
// inside the Claude artifact preview - see GLBBoundary.jsx), so the suite isn't left with an
// empty floor where the sofa and table should be.
function SkylineSuiteCollider({ position, yaw = 0 }) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <Rug position={[0, 0.01, 0]} size={[SIZE.z - 1.2, SIZE.x - 0.6]} yaw={Math.PI / 2} color="#3a3f52" />
      <Sofa position={[0, 0, -SIZE.z / 2 + 1.3]} yaw={0} length={2.6} color="#4a5568" />
      <Table position={[0, 0, 0.4]} size={[1.3, 0.7]} height={0.42} top="wood" />
      <Plant position={[SIZE.x / 2 - 0.6, 0, SIZE.z / 2 - 0.7]} scale={1.1} />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[SIZE.x / 2 - 0.3, SIZE.y / 2, SIZE.z / 2 - 0.3]} position={[0, SIZE.y / 2, 0]} />
      </RigidBody>
    </group>
  )
}

function SkylineSuiteModel({ position, yaw = 0 }) {
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
