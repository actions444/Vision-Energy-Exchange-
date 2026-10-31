import { useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { SITE as GARAGE_SITE } from '../config/parkingGarage.js'
import { CURB } from './City.jsx'
import GLBBoundary from './GLBBoundary.jsx'

// Garage crew: rigged characters in front of Stormline Parking. They patrol the sidewalk on the west
// side of the garage, walking, then standing, looking around, or swimming in place is never used here.
// Models come from public/models (compressed). Visual only, so they never block the player.
const MODELS = { male: '/models/athletic_male.glb', man: '/models/muscular_man.glb' }
const HEIGHT = 1.8
const PATROL_X = GARAGE_SITE.x0 - 5.5 // sidewalk in front of the garage's west face
const WALK_SPEED = 1.1
const PAUSE = 4 // seconds standing at each end
const CREW = [
  { model: 'male', z0: 34, z1: 46, phase: 0 },
  { model: 'man', z0: 40, z1: 56, phase: 1.3 },
  { model: 'male', z0: 50, z1: 64, phase: 2.6 },
  { model: 'man', z0: 36, z1: 60, phase: 3.9 },
]

const pick = (animations, re) => animations.find((a) => re.test(a.name))

function Npc({ scene, animations, z0, z1, phase }) {
  const obj = useMemo(() => { const c = skeletonClone(scene); c.traverse((o) => { if (o.isMesh) o.frustumCulled = false }); return c }, [scene])
  const mixer = useMemo(() => new THREE.AnimationMixer(obj), [obj])
  const actions = useMemo(() => ({
    walk: pick(animations, /^(preset:biped:)?walk/i),
    idle: pick(animations, /standing_relax|look_around|fold_arms/i),
  }), [animations])
  const walk = useMemo(() => actions.walk && mixer.clipAction(actions.walk), [actions, mixer])
  const idle = useMemo(() => actions.idle && mixer.clipAction(actions.idle), [actions, mixer])
  const root = useRef()
  const st = useRef({ t: phase, dir: 1, pause: 0, mode: 'walk' })
  const s = HEIGHT / (new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3()).y || 1)

  useFrame((_, dt) => {
    const g = root.current
    if (!g) return
    const k = st.current
    if (k.mode === 'walk') {
      const z = g.position.z + k.dir * WALK_SPEED * dt
      if ((k.dir > 0 && z >= z1) || (k.dir < 0 && z <= z0)) { k.mode = 'pause'; k.pause = PAUSE; g.position.z = k.dir > 0 ? z1 : z0; k.dir = -k.dir; idle?.reset().fadeIn(0.3).play(); walk?.fadeOut(0.3) }
      else g.position.z = z
      g.rotation.y = k.dir > 0 ? Math.PI / 2 : -Math.PI / 2
      if (k.mode === 'walk' && walk && !walk.isRunning()) walk.reset().fadeIn(0.3).play()
    } else {
      k.pause -= dt
      if (k.pause <= 0) { k.mode = 'walk'; walk?.reset().fadeIn(0.3).play(); idle?.fadeOut(0.3) }
    }
    mixer.update(dt)
  })

  return (
    <group ref={root} position={[PATROL_X, CURB, z0]} rotation={[0, Math.PI / 2, 0]}>
      <primitive object={obj} scale={s} />
    </group>
  )
}

function Loaded({ url, z0, z1, phase }) {
  const gltf = useLoader(GLTFLoader, url, (loader) => { loader.setMeshoptDecoder(MeshoptDecoder) })
  return <Npc scene={gltf.scene} animations={gltf.animations} z0={z0} z1={z1} phase={phase} />
}

export default function GarageCrew() {
  return (
    <GLBBoundary>
      <group name="garage-crew">
        {CREW.map((c, i) => <Loaded key={i} url={MODELS[c.model]} z0={c.z0} z1={c.z1} phase={c.phase} />)}
      </group>
    </GLBBoundary>
  )
}
