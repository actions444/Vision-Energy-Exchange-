import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, CylinderCollider, TrimeshCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { Builder } from '../../facade/kit.js'
import { registerInteractable } from '../../../state/runtime.js'
import { nightLit } from '../../../state/environment.js'
import { CURB } from '../../../config/westend.js'
import { indMats } from './IndustrialKit.jsx'
import { landfillSoilMaps, haulRoadMaps } from './textures.js'
import { buildGrid, heightAt, FORMS, ROADS, ROAD_W, POND, debrisFor } from './landfillTerrain.js'

// Landfill parts: the ground (one height function drives mesh, physics and every placed object), haul-road ribbons, instanced waste
// debris, boom gates, weighbridge decks, a gas flare, windsock, monitoring wells, tyre stacks and simple earth-moving machines.

const LIFT = 0.012 // terrain sits a hair above the kerb-height block slab so the two never z-fight

export function LandfillGround() {
  const M = indMats()
  const grid = useMemo(() => buildGrid(1), [])
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = grid.pos.slice()
    for (let i = 1; i < pos.length; i += 3) pos[i] += LIFT
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(grid.col, 3))
    g.setAttribute('uv', new THREE.BufferAttribute(grid.uv, 2))
    g.setIndex(new THREE.BufferAttribute(grid.idx, 1))
    g.computeVertexNormals(); g.computeBoundingSphere()
    return g
  }, [grid])
  const mat = useMemo(() => {
    const m = landfillSoilMaps()
    return new THREE.MeshStandardMaterial({ map: m.map, bumpMap: m.bump, bumpScale: 2.2, vertexColors: true, roughness: 1, metalness: 0 })
  }, [])
  const roads = useMemo(() => {
    const rm = haulRoadMaps()
    const out = []
    ROADS.forEach((R, ri) => {
      const S = R.samples, n = S.length
      const pos = new Float32Array(n * 6), uv = new Float32Array(n * 4), idx = []
      let s = 0
      for (let i = 0; i < n; i++) {
        const a = S[Math.max(0, i - 1)], b = S[Math.min(n - 1, i + 1)]
        let tx = b.x - a.x, tz = b.z - a.z; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl
        const nx = -tz, nz = tx
        if (i > 0) s += Math.hypot(S[i].x - S[i - 1].x, S[i].z - S[i - 1].z)
        for (const [k, sd] of [[0, -1], [1, 1]]) {
          const x = S[i].x + nx * sd * ROAD_W / 2, z = S[i].z + nz * sd * ROAD_W / 2
          pos[i * 6 + k * 3] = x; pos[i * 6 + k * 3 + 1] = CURB + heightAt(x, z) + LIFT + 0.014 + ri * 0.003; pos[i * 6 + k * 3 + 2] = z
          uv[i * 4 + k * 2] = k; uv[i * 4 + k * 2 + 1] = s / 8
        }
        if (i < n - 1) { const q = i * 2; idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3) }
      }
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx)
      g.computeVertexNormals(); g.computeBoundingSphere()
      out.push(g)
    })
    return { geos: out, mat: new THREE.MeshStandardMaterial({ map: rm.map, bumpMap: rm.bump, bumpScale: 1.6, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }) }
  }, [])
  return (
    <group>
      <mesh geometry={geo} material={mat} receiveShadow castShadow />
      {roads.geos.map((g, i) => <mesh key={i} geometry={g} material={roads.mat} receiveShadow />)}
      <RigidBody type="fixed" colliders={false}>
        <TrimeshCollider args={[Array.from(grid.pos).map((v, i) => (i % 3 === 1 ? v + LIFT : v)), Array.from(grid.idx)]} />
      </RigidBody>
      <LeachatePond />
    </group>
  )
}

function LeachatePond() {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2c332c', roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.92, envMapIntensity: 1.6 }), [])
  return <mesh position={[POND.x, CURB + 0.75, POND.z]} rotation={[-Math.PI / 2, 0, 0]} material={m}><circleGeometry args={[POND.r + 0.1, 40]} /></mesh>
}

// ---------------------------------------------------------------------------------------------------------------
/** Instanced debris on the landfill landforms: bags, boxes, planks, chunks, sheets and drums. Visual only (no colliders). */
export function DebrisField() {
  const groups = useMemo(() => {
    const items = []
    const counts = { fresh: 3000, green: 420, rubble: 460, scrap: 320 }
    for (const f of FORMS) if (counts[f.kind]) items.push(...debrisFor(f, counts[f.kind]))
    const by = {}
    for (const it of items) (by[it.kind] ||= []).push(it)
    return by
  }, [])
  const geos = useMemo(() => ({
    bag: (() => { const g = new THREE.IcosahedronGeometry(0.3, 0); const pa = g.attributes.position; for (let i = 0; i < pa.count; i++) { const k = 0.8 + 0.4 * Math.abs(Math.sin(pa.getX(i) * 91 + pa.getY(i) * 47 + pa.getZ(i) * 33)); pa.setXYZ(i, pa.getX(i) * k, pa.getY(i) * k, pa.getZ(i) * k) } g.scale(1.2, 0.7, 0.95); g.computeVertexNormals(); return g })(),
    box: new THREE.BoxGeometry(0.55, 0.4, 0.42),
    plank: new THREE.BoxGeometry(1.4, 0.06, 0.14),
    chunk: new THREE.DodecahedronGeometry(0.3, 0),
    sheet: new THREE.BoxGeometry(1.1, 0.025, 0.8),
    drum: new THREE.CylinderGeometry(0.27, 0.27, 0.82, 12),
  }), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, metalness: 0, flatShading: true }), [])
  return (
    <group userData={{ noBatch: true }}>
      {Object.entries(groups).map(([kind, items]) => <DebrisBatch key={kind} geo={geos[kind]} mat={mat} items={items} kind={kind} />)}
    </group>
  )
}
function DebrisBatch({ geo, mat, items, kind }) {
  const ref = useRef()
  useEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color()
    items.forEach((it, i) => {
      const k = it.s
      e.set(it.tilt[0], it.ry, it.tilt[1]); q.setFromEuler(e)
      s.set(k * (kind === 'sheet' ? 1.1 : 1), k, k * (kind === 'plank' ? 1 : 1))
      p.set(it.x, it.y + LIFT + (kind === 'drum' ? 0.25 : kind === 'bag' ? 0.06 : 0.1) * k, it.z)
      m.compose(p, q, s); ref.current.setMatrixAt(i, m)
      c.setHex(it.color).multiplyScalar(0.55 + ((i * 53) % 10) / 28); ref.current.setColorAt(i, c)
    })
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [items])
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} castShadow receiveShadow frustumCulled={false} />
}

// ---------------------------------------------------------------------------------------------------------------
/**
 * Boom gate. `dir` = unit vector from the post along the closed arm. Starts RAISED so the lane is open; interact to lower or raise it.
 * The arm is a kinematic body, so a lowered arm blocks people and vehicles exactly where you see it.
 */
export function BoomGate({ id, x, z, dir = [1, 0], y = CURB, length = 3.6, label = 'boom gate' }) {
  const M = indMats()
  const [down, setDown] = useState(false)
  const body = useRef(), ang = useRef(1.45)
  const yaw = Math.atan2(-dir[1], dir[0])
  const q = useMemo(() => new THREE.Quaternion(), []), e = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), [])
  const stripes = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 32
    const g = c.getContext('2d')
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#d33a2f' : '#f1f0ea'; g.fillRect(i * 32, 0, 32, 32) }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, metalness: 0.1 })
  }, [])
  const st = useRef({ down })
  st.current.down = down
  useEffect(() => registerInteractable(id, {
    position: new THREE.Vector3(x + dir[0] * length * 0.4, y + 1.1, z + dir[1] * length * 0.4),
    radius: 2.6,
    label: () => (st.current.down ? `Raise ${label}` : `Lower ${label}`),
    onInteract: () => setDown((d) => !d),
  }), [id, label]) // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, dt) => {
    ang.current += ((down ? 0 : 1.45) - ang.current) * (1 - Math.exp(-3 * Math.min(dt, 0.05)))
    e.set(0, yaw, ang.current); q.setFromEuler(e)
    body.current?.setNextKinematicRotation(q)
  })
  const lamp = useMemo(() => nightLit(new THREE.MeshStandardMaterial({ color: '#7a1a14', emissive: '#ff3b2a', roughness: 0.4 }), 2.5, 0.4), [])
  return (
    <group>
      <mesh position={[x - dir[0] * 0.0, y + 0.6, z]} material={M.steelDark} castShadow><boxGeometry args={[0.5, 1.2, 0.5]} /></mesh>
      <mesh position={[x, y + 1.24, z]} material={M.safety} castShadow><boxGeometry args={[0.56, 0.08, 0.56]} /></mesh>
      <mesh position={[x - dir[0] * 0.0, y + 0.12, z]} material={M.A.f.concrete} receiveShadow><boxGeometry args={[0.9, 0.24, 0.9]} /></mesh>
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.25, 0.6, 0.25]} position={[x, y + 0.6, z]} /></RigidBody>
      <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[x, y + 1.05, z]} rotation={[0, yaw, 1.45]}>
        <CuboidCollider args={[length / 2, 0.06, 0.05]} position={[length / 2 + 0.25, 0, 0]} />
        <group userData={{ noBatch: true }}>
          <mesh position={[length / 2 + 0.25, 0, 0]} material={stripes} castShadow><boxGeometry args={[length, 0.1, 0.07]} /></mesh>
          <mesh position={[length + 0.25, 0, 0]} material={lamp}><boxGeometry args={[0.12, 0.14, 0.14]} /></mesh>
        </group>
      </RigidBody>
    </group>
  )
}

/** Weighbridge deck: tread-plate platform with load-cell housings. Flush enough (8 cm) to drive or walk over. L along z. */
export function ScaleDeck({ x, z, y = CURB, w = 3.4, l = 14 }) {
  const M = indMats()
  const g = useMemo(() => {
    const t = M.tread
    void t
    const tex = M.tread.map.clone(); tex.needsUpdate = true; tex.repeat.set(w / 0.5, l / 0.5)
    return new THREE.MeshStandardMaterial({ map: tex, bumpMap: M.tread.bumpMap, bumpScale: 1.2, roughness: 0.5, metalness: 0.7 })
  }, [w, l])
  return (
    <group>
      <mesh position={[x, y + 0.08, z]} material={g} receiveShadow castShadow><boxGeometry args={[w, 0.06, l]} /></mesh>
      <mesh position={[x, y + 0.04, z]} material={M.steelDark} castShadow><boxGeometry args={[w + 0.2, 0.08, l + 0.2]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[x + s * (w / 2 + 0.2), y + 0.11, z]} material={M.hazard}><boxGeometry args={[0.18, 0.04, l + 0.2]} /></mesh>)}
      {[-1, 1].flatMap((s) => [-1, 0, 1].map((k) => <mesh key={s + ':' + k} position={[x + s * (w / 2 + 0.35), y + 0.2, z + k * (l / 2 - 0.6)]} material={M.steel} castShadow><boxGeometry args={[0.24, 0.3, 0.32]} /></mesh>))}
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[w / 2 + 0.1, 0.055, l / 2]} position={[x, y + 0.055, z]} /></RigidBody>
    </group>
  )
}

/** Landfill-gas flare: steel stack with a flame that flickers and glows after dark; low fenced pad. */
export function GasFlare({ x, z, y = CURB }) {
  const M = indMats()
  const flame = useRef(), glow = useRef()
  const fm = useMemo(() => nightLit(new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: '#ff7a18', emissiveIntensity: 1.2, transparent: true, opacity: 0.85, depthWrite: false }), 3, 1.6), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (flame.current) { const k = 0.85 + 0.25 * Math.sin(t * 9) * Math.sin(t * 3.7 + 1); flame.current.scale.set(0.9 + 0.1 * Math.sin(t * 7), k, 0.9 + 0.1 * Math.cos(t * 6)) }
    void glow
  })
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.2, 0]} material={M.A.f.concrete} receiveShadow castShadow><boxGeometry args={[4.4, 0.4, 4.4]} /></mesh>
      <mesh position={[0, 3.4, 0]} material={M.steel} castShadow><cylinderGeometry args={[0.5, 0.58, 6, 16]} /></mesh>
      <mesh position={[0, 6.55, 0]} material={M.steelDark}><cylinderGeometry args={[0.58, 0.5, 0.3, 16]} /></mesh>
      <group ref={flame} position={[0, 7.0, 0]} userData={{ noBatch: true }}>
        <mesh material={fm}><coneGeometry args={[0.45, 1.5, 12]} /></mesh>
        <mesh position={[0, -0.1, 0]} scale={[0.6, 0.8, 0.6]} material={fm}><coneGeometry args={[0.45, 1.3, 10]} /></mesh>
      </group>
      {[0, 1, 2].map((i) => <mesh key={i} position={[Math.cos(i * 2.1) * 1.4, 0.9, Math.sin(i * 2.1) * 1.4]} material={M.steel} castShadow rotation={[0, 0, 0]}><cylinderGeometry args={[0.1, 0.1, 1.2, 8]} /></mesh>)}
      <mesh position={[1.6, 0.9, 0]} material={M.safetyRed} castShadow><boxGeometry args={[0.7, 1.0, 0.5]} /></mesh>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[3.3, 0.55]} position={[0, 3.3, 0]} />
        <CuboidCollider args={[2.2, 0.2, 2.2]} position={[0, 0.2, 0]} />
        <CuboidCollider args={[0.35, 0.5, 0.25]} position={[1.6, 0.9, 0]} />
      </RigidBody>
    </group>
  )
}

/** Wind sock on a pole (moves slowly in a breeze). */
export function Windsock({ x, z, y = CURB, h = 6 }) {
  const M = indMats()
  const sock = useRef()
  const mat = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 32
    const g = c.getContext('2d')
    for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#f1f0ea' : '#e0622a'; g.fillRect(i * 22, 0, 22, 32) }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, side: THREE.DoubleSide })
  }, [])
  useFrame(({ clock }) => { if (sock.current) sock.current.rotation.y = 0.8 + Math.sin(clock.elapsedTime * 0.35) * 0.35 })
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, h / 2, 0]} material={M.steel} castShadow><cylinderGeometry args={[0.05, 0.08, h, 8]} /></mesh>
      <group ref={sock} position={[0, h, 0]} userData={{ noBatch: true }}>
        <mesh position={[0.7, -0.05, 0]} rotation={[0, 0, -Math.PI / 2 + 0.2]} material={mat} castShadow><cylinderGeometry args={[0.1, 0.32, 1.5, 12, 1, true]} /></mesh>
      </group>
      <RigidBody type="fixed" colliders={false}><CylinderCollider args={[h / 2, 0.08]} position={[0, h / 2, 0]} /></RigidBody>
    </group>
  )
}

/** Groundwater / gas monitoring wells: capped pipe in a locked steel cover, painted post. */
export function MonitorWells({ pts }) {
  const M = indMats()
  return (
    <>
      {pts.map(([x, z], i) => {
        const y = CURB + heightAt(x, z) + LIFT
        return (
          <group key={i} position={[x, y, z]}>
            <mesh position={[0, 0.5, 0]} material={M.steel} castShadow><cylinderGeometry args={[0.11, 0.11, 1.0, 10]} /></mesh>
            <mesh position={[0, 1.02, 0]} material={M.safety}><cylinderGeometry args={[0.13, 0.13, 0.08, 10]} /></mesh>
            <mesh position={[0, 0.06, 0]} material={M.A.f.concrete}><boxGeometry args={[0.5, 0.12, 0.5]} /></mesh>
          </group>
        )
      })}
      <RigidBody type="fixed" colliders={false}>
        {pts.map(([x, z], i) => <CylinderCollider key={i} args={[0.5, 0.13]} position={[x, CURB + heightAt(x, z) + 0.5, z]} />)}
      </RigidBody>
    </>
  )
}

/** Stacked tyres (stockpile of end-of-life tyres), instanced tori. Stacks of 5 in rows. */
export function TyreStacks({ origin, rows = 3, cols = 5, spacing = 1.6 }) {
  const ref = useRef()
  const items = useMemo(() => {
    const a = []
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const n = 3 + ((r * 7 + c * 3) % 4)
      for (let k = 0; k < n; k++) a.push([origin[0] + c * spacing, CURB + heightAt(origin[0] + c * spacing, origin[1] + r * spacing) + LIFT + 0.1 + k * 0.2, origin[1] + r * spacing, (k * 0.7 + r + c) % 6.28])
    }
    return a
  }, [])
  const geo = useMemo(() => { const g = new THREE.TorusGeometry(0.34, 0.14, 10, 18); g.rotateX(Math.PI / 2); return g }, [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#171718', roughness: 0.95 }), [])
  useEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3()
    items.forEach((it, i) => { e.set(0, it[3], 0); q.setFromEuler(e); p.set(it[0], it[1], it[2]); m.compose(p, q, s); ref.current.setMatrixAt(i, m) })
    ref.current.instanceMatrix.needsUpdate = true
  }, [items])
  return (
    <>
      <instancedMesh ref={ref} args={[geo, mat, items.length]} castShadow receiveShadow frustumCulled={false} />
      <RigidBody type="fixed" colliders={false}>
        {Array.from({ length: rows * cols }, (_, i) => { const r = Math.floor(i / cols), c = i % cols; const x = origin[0] + c * spacing, z = origin[1] + r * spacing; return <CylinderCollider key={i} args={[0.5, 0.48]} position={[x, CURB + heightAt(x, z) + 0.5, z]} /> })}
      </RigidBody>
    </>
  )
}

/**
 * Earth-moving machines built from boxes and cylinders, parked props (they do not move). Not a copy of any manufacturer's design.
 * 'dozer': tracked bulldozer (blade, push arms, rams, cab, exhaust). 'compactor': four-wheel steel-drum landfill compactor
 * (articulated body, toothed drums, dozer blade, cab). Local +x is the front.
 */
export function TrackedMachine({ x, z, yaw = 0, kind = 'compactor' }) {
  const M = indMats()
  const y = CURB + heightAt(x, z) + LIFT
  const paint = useMemo(() => new THREE.MeshStandardMaterial({ color: kind === 'dozer' ? '#d9a21b' : '#cfd3d4', roughness: 0.5, metalness: 0.3 }), [kind])
  const trim = useMemo(() => new THREE.MeshStandardMaterial({ color: kind === 'dozer' ? '#2b2b2b' : '#c4541c', roughness: 0.55, metalness: 0.3 }), [kind])
  const lamp = M.A.sconce
  const teeth = useMemo(() => Array.from({ length: 14 }, (_, i) => (i / 14) * Math.PI * 2), [])
  const cab = (cx, cy) => (
    <group position={[cx, cy, 0]}>
      <mesh material={M.steelDark} castShadow><boxGeometry args={[1.9, 0.12, 2.0]} /></mesh>
      <mesh position={[0, 0.75, 0]} material={M.A.f.glass}><boxGeometry args={[1.7, 1.3, 1.8]} /></mesh>
      {[[-0.85, -0.9], [0.85, -0.9], [-0.85, 0.9], [0.85, 0.9]].map(([a, b], i) => <mesh key={i} position={[a, 0.75, b]} material={M.steelDark}><boxGeometry args={[0.1, 1.35, 0.1]} /></mesh>)}
      <mesh position={[0, 1.45, 0]} material={M.steelDark} castShadow><boxGeometry args={[2.1, 0.1, 2.2]} /></mesh>
      <mesh position={[0.9, 1.52, 0.7]} material={lamp}><boxGeometry args={[0.12, 0.1, 0.4]} /></mesh>
      <mesh position={[0.9, 1.52, -0.7]} material={lamp}><boxGeometry args={[0.12, 0.1, 0.4]} /></mesh>
      <mesh position={[0, 0.3, 0.0]} material={M.rubber}><boxGeometry args={[0.5, 0.5, 0.6]} /></mesh>
    </group>
  )
  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[2.5, 1.0, 1.5]} position={[0, 1.2, 0]} />
        <CuboidCollider args={[0.25, 0.8, 1.9]} position={[kind === 'dozer' ? 3.5 : 3.7, 0.9, 0]} />
      </RigidBody>
      {kind === 'dozer' ? (
        <>
          {[-1, 1].map((s) => (
            <group key={s} position={[0, 0.55, s * 1.3]}>
              <mesh material={M.rubber} castShadow><boxGeometry args={[4.4, 0.5, 0.75]} /></mesh>
              <mesh position={[0, 0.3, 0]} material={M.steelDark} castShadow><boxGeometry args={[3.7, 0.5, 0.7]} /></mesh>
              {[-1.9, 1.9].map((dx) => <mesh key={dx} position={[dx, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.rubber} castShadow><cylinderGeometry args={[0.55, 0.55, 0.75, 16]} /></mesh>)}
              {Array.from({ length: 16 }, (_, i) => <mesh key={i} position={[-2.1 + i * 0.28, -0.3, 0]} material={M.steelDark}><boxGeometry args={[0.1, 0.1, 0.82]} /></mesh>)}
              {[-1.3, -0.4, 0.5, 1.4].map((dx) => <mesh key={dx} position={[dx, -0.22, s * 0.0]} rotation={[Math.PI / 2, 0, 0]} material={M.steel}><cylinderGeometry args={[0.22, 0.22, 0.8, 10]} /></mesh>)}
            </group>
          ))}
          <mesh position={[0, 1.35, 0]} material={paint} castShadow receiveShadow><boxGeometry args={[4.2, 1.1, 2.1]} /></mesh>
          <mesh position={[1.7, 1.95, 0]} material={paint} castShadow><boxGeometry args={[1.5, 0.5, 1.9]} /></mesh>
          <mesh position={[1.7, 2.22, 0]} material={trim}><boxGeometry args={[1.4, 0.08, 0.5]} /></mesh>
          {cab(-0.6, 2.0)}
          <mesh position={[-1.5, 2.6, 0.8]} material={M.steelDark}><cylinderGeometry args={[0.1, 0.1, 1.1, 8]} /></mesh>
          <mesh position={[-2.2, 1.35, 0]} material={M.steelDark} castShadow><boxGeometry args={[0.4, 0.8, 1.9]} /></mesh>
          {[-1, 1].map((s) => (
            <group key={s}>
              <mesh position={[2.6, 0.75, s * 1.55]} rotation={[0, 0, 0.12]} material={trim} castShadow><boxGeometry args={[2.0, 0.25, 0.25]} /></mesh>
              <mesh position={[3.1, 1.3, s * 1.1]} rotation={[0, 0, -0.65]} material={M.steel}><cylinderGeometry args={[0.07, 0.07, 1.2, 8]} /></mesh>
            </group>
          ))}
          <mesh position={[3.6, 1.0, 0]} rotation={[0, 0, 0.0]} material={M.steelDark} castShadow><boxGeometry args={[0.28, 1.4, 3.8]} /></mesh>
          <mesh position={[3.72, 1.8, 0]} material={M.steel}><boxGeometry args={[0.3, 0.12, 3.9]} /></mesh>
        </>
      ) : (
        <>
          {/* rear body + front body joined at an articulation; four toothed steel drums */}
          <mesh position={[-1.5, 1.45, 0]} material={paint} castShadow receiveShadow><boxGeometry args={[2.8, 1.2, 2.0]} /></mesh>
          <mesh position={[1.6, 1.3, 0]} material={paint} castShadow receiveShadow><boxGeometry args={[2.4, 0.9, 1.9]} /></mesh>
          <mesh position={[0.15, 1.35, 0]} material={M.steelDark}><boxGeometry args={[0.5, 1.0, 1.2]} /></mesh>
          <mesh position={[-2.7, 1.55, 0]} material={trim} castShadow><boxGeometry args={[0.35, 0.9, 1.9]} /></mesh>
          {cab(-1.2, 2.15)}
          <mesh position={[-2.4, 2.65, 0.7]} material={M.steelDark}><cylinderGeometry args={[0.09, 0.09, 1.0, 8]} /></mesh>
          {[[-1.8, 1.15], [-1.8, -1.15], [1.9, 1.15], [1.9, -1.15]].map(([dx, dz], i) => (
            <group key={i} position={[dx, 0.85, dz]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} material={M.steel} castShadow><cylinderGeometry args={[0.85, 0.85, 0.95, 20]} /></mesh>
              {teeth.map((a, k) => <mesh key={k} position={[Math.cos(a) * 0.92, Math.sin(a) * 0.92, 0]} rotation={[0, 0, a + Math.PI / 2]} material={M.steelDark}><boxGeometry args={[0.18, 0.2, 0.9]} /></mesh>)}
            </group>
          ))}
          <mesh position={[3.7, 0.9, 0]} material={M.steelDark} castShadow><boxGeometry args={[0.35, 1.2, 3.5]} /></mesh>
          {[-1, 1].map((s) => <mesh key={s} position={[3.1, 1.0, s * 1.5]} rotation={[0, 0, 0.1]} material={trim}><boxGeometry args={[1.4, 0.2, 0.2]} /></mesh>)}
        </>
      )}
      <mesh position={[kind === 'dozer' ? 2.5 : 2.8, 1.45, 0.7]} material={lamp}><boxGeometry args={[0.1, 0.18, 0.3]} /></mesh>
      <mesh position={[kind === 'dozer' ? 2.5 : 2.8, 1.45, -0.7]} material={lamp}><boxGeometry args={[0.1, 0.18, 0.3]} /></mesh>
    </group>
  )
}

void Builder
