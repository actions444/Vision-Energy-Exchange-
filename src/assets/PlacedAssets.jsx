import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CuboidCollider, TrimeshCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { useAssets, registry } from './assetStore.js'
import { NEON } from '../config/theme.js'
import { useSeats } from '../state/seats.js'

// Renders every placed imported model with a physics collider so the avatar can walk on,
// into and around it. 'trimesh' gives exact collision (walkable interiors, stairs, ramps);
// 'box' is a cheap bounding box; 'none' is decoration only.
//
// Distance culling: imported models can be the heaviest things in the scene (real triangle
// counts, real textures), so each one's visual hides itself past CULL_DIST from the camera -
// a cheap, big win once more than a handful are placed. Buildings/venues (tall, meant to be
// seen from across the city) get a longer leash than small props. Physics colliders stay
// active regardless of distance so nothing falls through a wall that scrolled off-screen;
// Three's own per-mesh frustum culling (on by default here) handles the rest.
const CULL_DIST = { building: 420, venue: 420, vehicle: 160, landscaping: 140, furniture: 90, prop: 110, character: 160 }
export default function PlacedAssets() {
  const placed = useAssets((s) => s.placed)
  const library = useAssets((s) => s.library)
  const selected = useAssets((s) => s.selected)
  const byId = new Map(library.map((a) => [a.id, a]))
  return placed.filter((p) => byId.has(p.assetId) && registry.has(p.assetId)).map((inst) => (
    <PlacedAsset key={inst.iid} inst={inst} kind={byId.get(inst.assetId).kind} selected={selected === inst.iid} />
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

function PlacedAsset({ inst, kind, selected }) {
  const info = registry.get(inst.assetId)
  const obj = useMemo(() => skeletonClone(info.scene), [info])
  const { position, rotationY, scale, collider } = inst
  const size = info.size
  const trimesh = useMemo(() => (collider === 'trimesh' ? buildTrimesh(info, scale) : null), [info, scale, collider])

  // distance culling: hide the visual (not the collider) once far enough from the camera that
  // it wouldn't be noticed missing; a little hysteresis stops it flicking at the boundary
  const cullDist = CULL_DIST[kind] ?? 140
  const camera = useThree((s) => s.camera)
  const visGroup = useRef()
  const posVec = useMemo(() => new THREE.Vector3(...position), [position])
  useFrame(() => {
    if (!visGroup.current) return
    const d = camera.position.distanceTo(posVec)
    const want = d < (visGroup.current.visible ? cullDist * 1.08 : cullDist)
    if (want !== visGroup.current.visible) visGroup.current.visible = want
  })

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
  // furniture settings: seating points and a seat-shaped collider
  const seatCfg = inst.seats || null
  const W = size[0] * scale, H = size[1] * scale, D = size[2] * scale
  const seatList = useMemo(() => furnitureSeats(inst, W, D), [position[0], position[1], position[2], rotationY, W, D, seatCfg?.count, seatCfg?.height, seatCfg?.depth, seatCfg?.flip]) // eslint-disable-line react-hooks/exhaustive-deps
  useSeats(seatList, [seatList])
  return (
    <>
      <group ref={visGroup} position={position} rotation={[0, rotationY, 0]} scale={scale}>
        <group position={info.offset}>
          <primitive object={obj} />
        </group>
      </group>
      {/* collision preview while selected */}
      {selected && collider !== 'none' && (
        <group position={position} rotation={[0, rotationY, 0]}>
          {(collider === 'seat'
            ? [[W, Math.max(0.05, (seatCfg?.height ?? 0.45) - 0.02), D, 0], [W, H, Math.min(0.15, D * 0.12) * 2, (seatCfg?.flip ? 1 : -1) * (D / 2 - Math.min(0.15, D * 0.12))]]
            : [[W, H, D, 0]]
          ).map(([w, h, d, z], i) => (
            <mesh key={'cp' + i} position={[0, h / 2, z]}>
              <boxGeometry args={[w, h, d]} />
              <meshBasicMaterial color={collider === 'trimesh' ? '#9fb4ff' : '#ff7ac8'} wireframe transparent opacity={0.7} toneMapped={false} />
            </mesh>
          ))}
        </group>
      )}
      {selected && seatList.map((st, i) => (
        <mesh key={'seat' + i} position={[st.position[0], st.position[1] + 0.02, st.position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.16, 24]} />
          <meshBasicMaterial color={NEON.teal} transparent opacity={0.8} toneMapped={false} depthTest={false} />
        </mesh>
      ))}
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
          ) : collider === 'seat' ? (
            // fitted to seating furniture: a block up to the seat, and the backrest along the back
            <>
              <CuboidCollider args={[W / 2, Math.max(0.05, (seatCfg?.height ?? 0.45) - 0.02) / 2, D / 2]} position={[0, Math.max(0.05, (seatCfg?.height ?? 0.45) - 0.02) / 2, 0]} />
              <CuboidCollider args={[W / 2, H / 2, Math.min(0.15, D * 0.12)]} position={[0, H / 2, (seatCfg?.flip ? 1 : -1) * (D / 2 - Math.min(0.15, D * 0.12))]} />
            </>
          ) : (
            <TrimeshCollider args={trimesh} />
          )}
        </RigidBody>
      )}
    </>
  )
}

/**
 * Seats on an imported piece of furniture, spread evenly along its width.
 * inst.seats = { count, height (m above the floor), depth (−0.5 back … 0.5 front, fraction of depth), flip }
 */
function furnitureSeats(inst, W, D) {
  const c = inst.seats
  if (!c || !c.count) return []
  const yaw = inst.rotationY + (c.flip ? Math.PI : 0)
  const cos = Math.cos(inst.rotationY), sin = Math.sin(inst.rotationY)
  const out = []
  for (let i = 0; i < c.count; i++) {
    const lx = (i - (c.count - 1) / 2) * (W / c.count)
    const lz = (c.depth ?? 0.1) * D * (c.flip ? -1 : 1)
    out.push({
      position: [inst.position[0] + lx * cos + lz * sin, inst.position[1] + (c.height ?? 0.45), inst.position[2] - lx * sin + lz * cos],
      yaw, height: c.height ?? 0.45, label: c.count > 1 ? `Sit (seat ${i + 1} of ${c.count})` : 'Sit',
    })
  }
  return out
}

// ---------- Imported character as the player's avatar ----------
const X_AXIS = new THREE.Vector3(1, 0, 0)
const CLIP_PATTERNS = {
  idle: /idle|stand|breath|rest/i,
  walk: /walk/i,
  run: /run|jog|sprint/i,
  jump: /jump|fall|air/i,
  wave: /wave|greet|hello/i,
  sit: /sit|seat|chair/i,
}

// Common bone names in Tripo / Meshy / Mixamo-style rigs, for a fallback seated pose.
const THIGH = /(left|right|^l|^r|_l|_r|\.l|\.r).*(up_?leg|thigh)|(up_?leg|thigh).*(left|right|_l|_r|\.l|\.r)/i
const SHIN = /(left|right|^l|^r|_l|_r|\.l|\.r).*(leg|calf|shin|knee)$|^(mixamorig:)?(left|right)leg$|(calf|shin|knee).*(left|right|_l|_r|\.l|\.r)/i

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
  // fallback sitting: bend thigh and shin bones if the model has no sit animation
  const legBones = useMemo(() => {
    const thighs = [], shins = []
    obj.traverse((o) => {
      if (!o.isBone) return
      const n = o.name.replace(/^mixamorig:?/i, '')
      if (THIGH.test(n) && !/twist|end/i.test(n)) thighs.push({ b: o, q: o.quaternion.clone() })
      else if (SHIN.test(n) && !/up|twist|end|toe|foot/i.test(n)) shins.push({ b: o, q: o.quaternion.clone() })
    })
    return { thighs: thighs.slice(0, 2), shins: shins.slice(0, 2) }
  }, [obj])
  const sitAmt = useRef(0)
  const tmpQ = useMemo(() => new THREE.Quaternion(), [])

  useEffect(() => () => mixer.stopAllAction(), [mixer])

  useFrame((_, dt) => {
    t.current += dt
    const sp = state.speed || 0
    let want = 'idle'
    if (state.sit && actions.sit) want = 'sit'
    else if (!state.grounded && actions.jump) want = 'jump'
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
    // procedural sit for rigs without a sit clip: bend thighs and shins, lower the model
    const animated = Object.keys(actions).length > 0
    sitAmt.current += ((state.sit && !actions.sit ? 1 : 0) - sitAmt.current) * Math.min(1, dt * 8)
    if (legBones.thighs.length && (sitAmt.current > 0.001 || !animated)) {
      for (const { b, q } of legBones.thighs) { if (!animated) b.quaternion.copy(q); b.quaternion.multiply(tmpQ.setFromAxisAngle(X_AXIS, -1.5 * sitAmt.current)) }
      for (const { b, q } of legBones.shins) { if (!animated) b.quaternion.copy(q); b.quaternion.multiply(tmpQ.setFromAxisAngle(X_AXIS, 1.45 * sitAmt.current)) }
    }
    if (bob.current) {
      const drop = -(0.53 * height - ((state.sitHeight || 0.45) + 0.06)) * sitAmt.current
      bob.current.position.y = drop + (animated || state.sit ? 0 : Math.abs(Math.sin(t.current * (sp > 0.2 ? 9 : 2))) * (sp > 0.2 ? 0.06 : 0.015))
    }
  })

  return (
    <group ref={bob} rotation={[0, (facing * Math.PI) / 180, 0]} scale={s}>
      <group position={info.offset}>
        <primitive object={obj} />
      </group>
    </group>
  )
}
