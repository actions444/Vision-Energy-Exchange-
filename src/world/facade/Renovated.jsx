import { useMemo } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { buildShell, boxGeo } from './kit.js'
import { facadeMats } from './materials.js'
import { BrandSign } from '../signs.jsx'
import { Bench, LightAnchor } from '../props.jsx'
import { signatureMarble, surface } from '../materials.js'

const OPAQUE = ['marble', 'brick', 'stone', 'stoneWall', 'concrete', 'render', 'granite', 'plaster', 'bronze', 'steel', 'roof', 'glazing']
const SOFT = ['glass', 'streak', 'grime'] // transparent: drawn on top, never batched

/** The renovated walls, windows, cornice, parapet and roof of a venue (visual only; colliders stay with the Venue). */
export function RenovatedShell({ spec }) {
  const { geos } = useMemo(() => buildShell(spec), []) // eslint-disable-line react-hooks/exhaustive-deps
  const m = facadeMats()
  const wallKey = ({ stone: 'stoneWall' })[spec.wall] || spec.wall || 'brick'
  const matFor = (k) => (k === wallKey && spec.wallColor ? m.tint(wallKey, spec.wallColor) : m[k])
  return (
    <group>
      {OPAQUE.map((k) => geos[k] && <mesh key={k} geometry={geos[k]} material={matFor(k)} castShadow={k !== 'plaster' && k !== 'glazing' && k !== 'roof'} receiveShadow />)}
      {SOFT.map((k, i) => geos[k] && <mesh key={k} geometry={geos[k]} material={m[k]} renderOrder={2 + i} />)}
    </group>
  )
}

const leafGeo = (() => {
  let g
  return () => {
    if (g) return g
    g = new THREE.IcosahedronGeometry(1, 3)
    g.deleteAttribute('normal'); g.deleteAttribute('uv')
    g = mergeVertices(g) // shared vertices -> smooth normals instead of faceted ones
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2))
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const k = 1 + (Math.sin(p.getX(i) * 9.1) * Math.cos(p.getZ(i) * 7.3) + Math.sin(p.getY(i) * 11.7)) * 0.09
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k)
    }
    g.computeVertexNormals()
    return g
  }
})()

function StonePlanter({ x, z, yaw, base, size = [1.4, 0.62, 0.9], seed = 1 }) {
  const m = facadeMats()
  const turned = Math.abs(Math.sin(yaw)) > 0.5
  const geo = useMemo(() => boxGeo(turned ? size[2] : size[0], size[1], turned ? size[0] : size[2], x, base + size[1] / 2, z), [x, z, base, turned]) // eslint-disable-line react-hooks/exhaustive-deps
  const leaf = useMemo(() => [new THREE.MeshStandardMaterial({ color: '#35552a', roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: '#4d7436', roughness: 0.9 })], [])
  const blobs = [[-0.4, 0.45, 0.0, 0.42, 0], [0.0, 0.62, 0.05, 0.5, 1], [0.42, 0.42, -0.05, 0.38, 0], [-0.15, 0.4, 0.22, 0.3, 1], [0.22, 0.46, 0.2, 0.28, 0]]
  return (
    <group>
      <RigidBody type="fixed" colliders={false} position={[x, base, z]} rotation={[0, yaw, 0]}>
        <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} position={[0, size[1] / 2, 0]} />
      </RigidBody>
      <mesh geometry={geo} material={m.stone} castShadow receiveShadow />
      <group position={[x, base + size[1], z]} rotation={[0, yaw, 0]}>
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} material={surface('soil', 0.6, 0.4)}><planeGeometry args={[size[0] - 0.12, size[2] - 0.12]} /></mesh>
        {blobs.map(([bx, by, bz, r, c], i) => (
          <mesh key={i} position={[bx * (size[0] / 1.4), by, bz]} scale={[r * (1 + seed * 0.02), r * 0.9, r]} geometry={leafGeo()} material={leaf[c]} castShadow />
        ))}
      </group>
    </group>
  )
}

/**
 * Everything on and in front of a renovated entrance: stone-and-marble surround, fascia with clear
 * lettering, steel canopy with downlights, wall lamps, paved forecourt, planters and benches.
 * `origin` = world [x, z] of the door centre on the outer face; yaw turns local +z to point out of the building.
 * `parts` switches pieces off for buildings that bring their own (e.g. the cinema portico).
 */
export function EntranceDressing({ origin, base, name, sub, doorHalf: dh, doorH: dH, yaw, signWidth = 7, parts = {}, apron = [9, 3.4], canopyW = 6.2, benchAt = 4.6, planterAt = 2.7 }) {
  const m = facadeMats()
  const marble = signatureMarble(3, 1)
  const jambMarble = signatureMarble(1, 3)
  const [ox, oz] = origin
  const doorTop = dH + 0.7
  const P = { sign: true, surround: true, canopy: true, lamps: true, forecourt: true, planters: true, benches: true, ...parts }
  const W = (lx, lz) => [ox + Math.sin(yaw) * lz + Math.cos(yaw) * lx, oz + Math.cos(yaw) * lz - Math.sin(yaw) * lx]
  const threshold = useMemo(() => boxGeo(2 * dh + 0.4, 0.03, 1.1, 0, 0, 0), [dh])
  const cw = canopyW, rod = Math.hypot(1.5, 0.75), rodAngle = Math.atan2(-1.5, 0.75)
  const cy = doorTop + 0.5 // canopy height follows the door
  const signY = cy + 1.25
  return (
    <>
      <group position={[ox, base, oz]} rotation={[0, yaw, 0]}>
        {P.sign && (
          <>
            {/* black marble fascia with a brass reveal, carrying the lettering */}
            <mesh position={[0, signY, 0.125]} material={marble} castShadow><boxGeometry args={[signWidth + 0.8, 1.95, 0.25]} /></mesh>
            {[-1, 1].map((k) => <mesh key={k} position={[0, signY + k * 0.99, 0.15]} material={m.brass}><boxGeometry args={[signWidth + 0.9, 0.035, 0.3]} /></mesh>)}
            <BrandSign text={name} sub={sub} position={[0, signY, 0.256]} width={signWidth} />
          </>
        )}
        {P.surround && (
          <>
            {/* entrance surround: black marble jambs and head */}
            {[-1, 1].map((k) => <mesh key={k} position={[k * (dh + 0.15), doorTop / 2, 0.1]} material={jambMarble} castShadow><boxGeometry args={[0.3, doorTop, 0.2]} /></mesh>)}
            <mesh position={[0, doorTop + 0.15, 0.1]} material={marble} castShadow><boxGeometry args={[2 * dh + 0.6, 0.3, 0.2]} /></mesh>
            <mesh position={[0, 0.01, 0.5]} geometry={threshold} material={m.granite} receiveShadow />
          </>
        )}
        {P.canopy && (
          <>
            {/* canopy: thin steel slab, deep fascia, two tension rods, downlights and a concealed strip */}
            <mesh position={[0, cy, 0.75]} material={m.bronze} castShadow><boxGeometry args={[cw, 0.1, 1.5]} /></mesh>
            <mesh position={[0, cy - 0.05, 1.5]} material={m.bronze} castShadow><boxGeometry args={[cw, 0.24, 0.07]} /></mesh>
            {[-1, 1].map((k) => (
              <mesh key={k} position={[k * (cw / 2 - 0.3), cy + 0.4, 0.75]} rotation={[rodAngle, 0, 0]} material={m.steel}><cylinderGeometry args={[0.014, 0.014, rod, 6]} /></mesh>
            ))}
            {[-0.36, -0.15, 0.15, 0.36].map((f) => <mesh key={f} position={[f * cw, cy - 0.055, 1.0]} material={m.lamp}><cylinderGeometry args={[0.075, 0.075, 0.02, 14]} /></mesh>)}
            <mesh position={[0, cy - 0.05, 1.47]} material={m.soffitStrip}><boxGeometry args={[cw - 0.4, 0.02, 0.03]} /></mesh>
          </>
        )}
        {P.lamps && [-1, 1].map((k) => (
          <group key={k} position={[k * (dh + 0.55), 2.15, 0.15]}>
            <mesh position={[0, 0, 0.02]} material={m.brass}><boxGeometry args={[0.1, 0.34, 0.04]} /></mesh>
            <mesh position={[0, 0, 0.1]} material={m.lamp}><cylinderGeometry args={[0.055, 0.055, 0.28, 10]} /></mesh>
            <mesh position={[0, 0.17, 0.1]} material={m.brass}><cylinderGeometry args={[0.07, 0.07, 0.02, 10]} /></mesh>
            <mesh position={[0, -0.17, 0.1]} material={m.brass}><cylinderGeometry args={[0.07, 0.07, 0.02, 10]} /></mesh>
          </group>
        ))}
        {P.forecourt && <mesh position={[0, 0.012, apron[1] / 2]} rotation={[-Math.PI / 2, 0, 0]} material={surface('pavers', apron[0] / 4, apron[1] / 4)} receiveShadow><planeGeometry args={apron} /></mesh>}
      </group>
      {/* soft light on the doors and forecourt after dark */}
      {P.lamps && [-1.6, 1.6].map((lx) => { const [x, z] = W(lx, 1.2); return <LightAnchor key={lx} position={[x, base + cy - 0.3, z]} color="#ffd9a6" intensity={20} distance={9} night /> })}
      {P.benches && [-1, 1].map((k) => { const [x, z] = W(k * benchAt, 1.0); return <Bench key={'b' + k} position={[x, base, z]} yaw={yaw} /> })}
      {P.planters && [-1, 1].map((k, i) => { const [x, z] = W(k * planterAt, 0.55); return <StonePlanter key={'p' + k} x={x} z={z} yaw={yaw} base={base} seed={i + 1} /> })}
    </>
  )
}

/** A solid stone/brick block in renovation materials (world-metre UVs), with an optional collider. */
export function KitBlock({ position, size, mat = 'stoneWall', collide = true, cast = true, color }) {
  const m = facadeMats()
  const geo = useMemo(() => boxGeo(size[0], size[1], size[2], position[0], position[1], position[2]), []) // eslint-disable-line react-hooks/exhaustive-deps
  const material = color ? m.tint(mat, color) : m[mat]
  return (
    <>
      {collide && <RigidBody type="fixed" colliders={false} position={position}><CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} /></RigidBody>}
      <mesh geometry={geo} material={material} castShadow={cast} receiveShadow />
    </>
  )
}
