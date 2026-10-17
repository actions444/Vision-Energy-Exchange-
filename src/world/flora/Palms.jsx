import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { buildPalm } from './palm.js'
import { buildTree } from './tree.js'
import { floraMats, tickWind } from './mats.js'
import { hash } from './tex.js'

// Instanced, LOD'd palm groves. Each species has several geometry VARIANTS (different trunk curve, height, frond
// count and arrangement); every placed palm picks a variant and then adds its own yaw, scale and leaf tint, so no
// two neighbours read as clones. Per frame we only re-bucket instances into LOD meshes when the camera has moved.

const VARIANTS = 5
const HYST = 5
/** per kind: geometry builder, materials, LOD distances, trunk collider */
const KINDS = {
  palm: {
    build: (sp, v, lod) => buildPalm(sp, v * 7 + 1 + (sp === 'royal' ? 100 : sp === 'areca' ? 200 : 0), lod),
    trunkMat: (sp) => floraMats.bark(sp === 'royal' ? 'royal' : 'coconut'),
    crownMat: (sp, lod) => (lod === 0 ? floraMats.leaflet() : floraMats.comb()),
    near: 22, far: 62,
    collider: (sp) => (sp === 'areca' ? [0.5, 0.05] : sp === 'royal' ? [3, 0.32] : [3, 0.24]),
  },
  tree: {
    build: (sp, v, lod) => buildTree(sp, v * 5 + 2, lod),
    trunkMat: () => floraMats.bark('tree'),
    crownMat: (sp) => floraMats.cluster(sp === 'ficus' ? 'ficus' : 'oak'),
    near: 26, far: 70,
    collider: () => [1.6, 0.26],
  },
}
const geoCache = new Map()
const queue = []
let building = false

function requestGeo(kind, species, variant, lod, cb) {
  const key = `${kind}|${species}|${variant}|${lod}`
  const hit = geoCache.get(key)
  if (hit?.done) return hit
  if (!hit) { geoCache.set(key, { done: false, cbs: [cb] }); queue.push([kind, species, variant, lod, key]) }
  else hit.cbs.push(cb)
  return null
}
function pump() {
  if (building || !queue.length) return
  building = true
  const [kind, species, variant, lod, key] = queue.shift()
  const res = KINDS[kind].build(species, variant, lod)
  const e = geoCache.get(key)
  e.done = true; e.res = res
  e.cbs.forEach((f) => f())
  building = false
}

export function Grove({ kind = 'palm', palms, species = 'coconut', collide = true }) {
  const K = KINDS[kind]
  const { camera } = useThree()
  // bucket palms by variant
  const groups = useMemo(() => {
    const g = Array.from({ length: VARIANTS }, () => [])
    palms.forEach((p, i) => {
      const sp = p[5] || species
      const v = Math.floor(hash(p[0] * 3.1 + p[2] * 1.7 + i) * VARIANTS)
      g[v].push({ x: p[0], y: p[1], z: p[2], s: (p[3] ?? 1) * (0.92 + hash(i * 5.3 + p[0]) * 0.2), yaw: p[4] ?? hash(i * 2.7) * 6.28, sp, i, tint: new THREE.Color().setRGB(0.92 + hash(i * 3.3) * 0.16, 0.95 + hash(i * 7.7) * 0.1, 0.9 + hash(i * 9.1) * 0.1) })
    })
    // a group per (species, variant)
    const out = []
    g.forEach((list, v) => {
      const bySp = {}
      list.forEach((l) => (bySp[l.sp] ||= []).push(l))
      Object.entries(bySp).forEach(([sp, items]) => out.push({ sp, v, items }))
    })
    return out
  }, [palms, species])

  const refs = useRef([]) // per group: { trunk:[3 meshes], crown:[3 meshes], lod:Int8Array }
  const last = useRef({ pos: new THREE.Vector3(1e9, 0, 0), frame: 0 })
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const mk = (sp, lod, kind) => {
    const m = new THREE.InstancedMesh(new THREE.BufferGeometry(), kind === 'trunk' ? K.trunkMat(sp) : K.crownMat(sp, lod), 1)
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; m.count = 0
    m.customDepthMaterial = floraMats.depth(m.material)
    m.userData.noBatch = true
    return m
  }
  const meshes = useMemo(() => groups.map(({ sp, items }) => {
    const trunk = [0, 1, 2].map((l) => { const m = mk(sp, l, 'trunk'); m.instanceMatrix = new THREE.InstancedBufferAttribute(new Float32Array(items.length * 16), 16); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); return m })
    const crown = [0, 1, 2].map((l) => { const m = mk(sp, l, 'crown'); m.instanceMatrix = new THREE.InstancedBufferAttribute(new Float32Array(items.length * 16), 16); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(items.length * 3), 3); return m })
    return { trunk, crown, lod: new Int8Array(items.length).fill(-1), ready: [false, false, false] }
  }), [groups]) // eslint-disable-line react-hooks/exhaustive-deps
  refs.current = meshes
  useEffect(() => () => meshes.forEach((m) => [...m.trunk, ...m.crown].forEach((x) => x.dispose())), [meshes])

  useFrame((st) => {
    tickWind(st.clock.elapsedTime)
    pump()
    const cam = camera.position
    const L = last.current
    L.frame++
    const moved = cam.distanceToSquared(L.pos) > 4
    if (!moved && L.frame % 90 !== 0 && !meshes.some((m) => m.dirty)) return
    L.pos.copy(cam)
    groups.forEach(({ sp, v, items }, gi) => {
      const M = meshes[gi]
      const counts = [0, 0, 0]
      items.forEach((it, k) => {
        const d = Math.hypot(it.x - cam.x, it.z - cam.z)
        const cur = M.lod[k]
        let lod = d < K.near ? 0 : d < K.far ? 1 : 2
        if (cur >= 0) { // hysteresis: keep the current level until clearly past its edge
          if (cur === 0 && d < K.near + HYST) lod = 0
          else if (cur === 1 && d > K.near - HYST && d < K.far + HYST) lod = 1
          else if (cur === 2 && d > K.far - HYST) lod = 2
        }
        // fall back to a lower level that already exists while the wanted one is being built
        let use = lod
        const need = (l) => { const e = requestGeo(kind, sp, v, l, () => { M.dirty = true }); return !!e }
        if (!need(lod)) { use = [0, 1, 2].filter((l) => geoCache.get(`${kind}|${sp}|${v}|${l}`)?.done).sort((a, b) => Math.abs(a - lod) - Math.abs(b - lod))[0] ?? -1 }
        M.lod[k] = use
        if (use < 0) return
        dummy.position.set(it.x, it.y, it.z); dummy.rotation.set(0, it.yaw, 0); dummy.scale.setScalar(it.s); dummy.updateMatrix()
        const i = counts[use]++
        M.trunk[use].setMatrixAt(i, dummy.matrix)
        M.crown[use].setMatrixAt(i, dummy.matrix)
        M.crown[use].setColorAt(i, it.tint)
      })
      for (let l = 0; l < 3; l++) {
        const tr = M.trunk[l], cr = M.crown[l]
        const e = geoCache.get(`${kind}|${sp}|${v}|${l}`)
        if (e?.done && tr.geometry !== e.res.trunk) { tr.geometry = e.res.trunk; cr.geometry = e.res.crown }
        tr.count = cr.count = counts[l]
        tr.instanceMatrix.needsUpdate = cr.instanceMatrix.needsUpdate = true
        cr.instanceColor.needsUpdate = true
      }
    })
    meshes.forEach((m) => { m.dirty = false })
  })

  return (
    <group userData={{ noBatch: true }}>
      {meshes.map((M, gi) => <group key={gi}>{[...M.trunk, ...M.crown].map((m, i) => <primitive key={i} object={m} />)}</group>)}
      {collide && (
        <RigidBody type="fixed" colliders={false}>
          {palms.map(([x, y, z, s = 1, , sp], i) => {
            const [hh, rad] = K.collider(sp || species)
            return <CylinderCollider key={i} args={[hh * s, rad * s]} position={[x, y + hh * s, z]} />
          })}
        </RigidBody>
      )}
    </group>
  )
}

export const Palms = (props) => <Grove kind="palm" {...props} />
export const TreeGrove = (props) => <Grove kind="tree" species="oak" {...props} />

/** A single palm, for one-off placements. */
export function PalmTree({ position, scale = 1, yaw = 0, species = 'coconut' }) {
  const palms = useMemo(() => [[position[0], position[1], position[2], scale, yaw, species]], [position[0], position[1], position[2], scale, yaw, species]) // eslint-disable-line react-hooks/exhaustive-deps
  return <Palms palms={palms} />
}
