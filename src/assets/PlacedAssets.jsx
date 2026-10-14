import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, TrimeshCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { useAssets, registry } from './assetStore.js'
import { NEON } from '../config/theme.js'

// Renders every placed imported model with a physics collider so the avatar can walk on,
// into and around it. 'trimesh' gives exact collision (walkable interiors, stairs, ramps);
// 'box' is a cheap bounding box; 'none' is decoration only.
export default function PlacedAssets() {
  const placed = useAssets((s) => s.placed)
  const library = useAssets((s) => s.library)
  const selected = useAssets((s) => s.selected)
  const ids = new Set(library.map((a) => a.id))
  return placed.filter((p) => ids.has(p.assetId) && registry.has(p.assetId)).map((inst) => (
    <PlacedAsset key={inst.iid} inst={inst} selected={selected === inst.iid} />
  ))
}

function buildTrimesh(info, scale) {
  const root = info.scene
  root.updateMatrixWorld(true)
  const verts = []
  const idx = []
  const v = new THREE.Vector3()
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return
    const pos = o.geometry.attributes.position
    const startVert = verts.length / 3
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld)
      verts.push((v.x + info.offset[0]) * scale, (v.y + info.offset[1]) * scale, (v.z + info.offset[2]) * scale)
    }
    if (o.geometry.index) {
      const ix = o.geometry.index.array
      for (let i = 0; i < ix.length; i++) idx.push(ix[i] + startVert)
    } else {
      for (let i = 0; i < pos.count; i++) idx.push(startVert + i)
    }
  })
  return [new Float32Array(verts), new Uint32Array(idx)]
}

function PlacedAsset({ inst, selected }) {
  const info = registry.get(inst.assetId)
  const obj = useMemo(() => skeletonClone(info.scene), [info])
  const { position, rotationY, scale, collider } = inst
  const size = info.size
  const trimesh = useMemo(() => (collider === 'trimesh' ? buildTrimesh(info, scale) : null), [info, scale, collider])

  // play the first animation clip of animated props (e.g. a spinning sign)
  const mixer = useMemo(() => (info.animations.length && !info.skinned ? new THREE.AnimationMixer(obj) : null), [obj, info])
  useEffect(() => {
    if (!mixer) return
    mixer.clipAction(info.animations[0]).play()
    return () => mixer.stopAllAction()
  }, [mixer, info])
  useFrame((_, dt) => mixer?.update(dt))

  const bodyKey = `${position.join(',')}|${rotationY}|${scale}|${collider}`
  const ring = useRef()
  useFrame(({ clock }) => { if (ring.current) ring.current.material.opacity = 0.55 + Math.sin(clock.elapsedTime * 4) * 0.3 })

  const footprint = Math.max(size[0], size[2]) * scale * 0.6 + 0.4
  return (
    <>
      <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
        <group position={info.offset}>
          <primitive object={obj} />
        </group>
      </group>
      {selected && (
        <mesh ref={ring} position={[position[0], position[1] + 0.05, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[footprint, footprint + 0.12, 64]} />
          <meshBasicMaterial color={NEON.yellow} transparent toneMapped={false} />
        </mesh>
      )}
      {collider !== 'none' && (
        <RigidBody key={bodyKey} type="fixed" colliders={false} position={position} rotation={[0, rotationY, 0]}>
          {collider === 'box' ? (
            <CuboidCollider args={[(size[0] * scale) / 2, (size[1] * scale) / 2, (size[2] * scale) / 2]} position={[0, (size[1] * scale) / 2, 0]} />
          ) : (
            <TrimeshCollider args={trimesh} />
          )}
        </RigidBody>
      )}
    </>
  )
}

// ---------- Imported character as the player's avatar ----------
const CLIP_PATTERNS = {
  idle: /idle|stand|breath|rest/i,
  walk: /walk/i,
  run: /run|jog|sprint/i,
  jump: /jump|fall|air/i,
  wave: /wave|greet|hello/i,
}

export function ImportedAvatar({ assetId, facing = 0, state, height = 1.8 }) {
  const info = registry.get(assetId)
  const obj = useMemo(() => {
    const c = skeletonClone(info.scene)
    c.traverse((o) => { if (o.isMesh) o.frustumCulled = false })
    return c
  }, [info])
  const s = height / (info.size[1] || 1)
  const mixer = useMemo(() => new THREE.AnimationMixer(obj), [obj])
  const actions = useMemo(() => {
    const map = {}
    for (const [key, re] of Object.entries(CLIP_PATTERNS)) {
      const clip = info.animations.find((a) => re.test(a.name))
      if (clip) map[key] = mixer.clipAction(clip)
    }
    if (!map.walk && info.animations.length === 1) map.walk = mixer.clipAction(info.animations[0])
    return map
  }, [info, mixer])
  const current = useRef(null)
  const bob = useRef()
  const t = useRef(0)

  useEffect(() => () => mixer.stopAllAction(), [mixer])

  useFrame((_, dt) => {
    t.current += dt
    const sp = state.speed || 0
    let want = 'idle'
    if (!state.grounded && actions.jump) want = 'jump'
    else if (state.emote === 'wave' && actions.wave) want = 'wave'
    else if (sp > 4 && actions.run) want = 'run'
    else if (sp > 0.2) want = actions.walk ? 'walk' : actions.run ? 'run' : 'idle'
    const next = actions[want] || actions.idle || null
    if (next !== current.current) {
      if (current.current) current.current.fadeOut(0.2)
      if (next) next.reset().fadeIn(0.2).play()
      current.current = next
    }
    if (next && (want === 'walk' || want === 'run')) next.timeScale = THREE.MathUtils.clamp(sp / (want === 'run' ? 6 : 2.6), 0.6, 1.6)
    mixer.update(dt)
    // models without clips still get a little life
    if (bob.current) bob.current.position.y = Object.keys(actions).length ? 0 : Math.abs(Math.sin(t.current * (sp > 0.2 ? 9 : 2))) * (sp > 0.2 ? 0.06 : 0.015)
  })

  return (
    <group ref={bob} rotation={[0, (facing * Math.PI) / 180, 0]} scale={s}>
      <group position={info.offset}>
        <primitive object={obj} />
      </group>
    </group>
  )
}
