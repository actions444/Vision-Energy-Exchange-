// Vision Cinema frontage: a grand portico on the avenue with marble columns, a lit marquee,
// a vertical blade sign, poster light boxes, a red-carpet entrance with brass stanchions,
// polished granite paving, planters, flower beds and benches. Every solid piece people could
// walk into has a collider; the glass doors themselves are the Venue's working DoubleDoor.
import { useEffect, useMemo, useRef } from 'react'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface, blackMarble } from './materials.js'
import { nightLit } from '../state/environment.js'
import { BrandSign } from './signs.jsx'
import { Bench, FlowerBed, LightAnchor } from './props.jsx'
import { CINEMA } from './Cinema.jsx'

const CURB = 0.15
export const CINEMA_FRONT = {
  x: CINEMA.x1, // facade (faces +x, onto the avenue)
  cz: (CINEMA.z0 + CINEMA.z1) / 2, // door centre
  depth: 3.2, // portico depth over the sidewalk
  half: 7, // portico half-length along the facade
}
const GOLD = '#d9b86a'

function posterTexture(title, sub, hue) {
  const c = document.createElement('canvas')
  c.width = 256; c.height = 384
  const g = c.getContext('2d')
  const grad = g.createLinearGradient(0, 0, 0, 384)
  grad.addColorStop(0, `hsl(${hue},55%,22%)`)
  grad.addColorStop(0.6, `hsl(${(hue + 40) % 360},60%,12%)`)
  grad.addColorStop(1, '#050507')
  g.fillStyle = grad; g.fillRect(0, 0, 256, 384)
  // a soft "key art" glow and horizon
  const r = g.createRadialGradient(128, 150, 10, 128, 150, 140)
  r.addColorStop(0, `hsla(${(hue + 180) % 360},90%,70%,0.85)`); r.addColorStop(1, 'transparent')
  g.fillStyle = r; g.fillRect(0, 0, 256, 384)
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 230, 256, 154)
  g.fillStyle = '#f5ecd6'; g.textAlign = 'center'
  g.font = '700 30px Georgia, serif'; g.fillText(title, 128, 290)
  g.font = '500 14px Helvetica, Arial, sans-serif'; g.fillStyle = GOLD; g.fillText(sub, 128, 318)
  g.strokeStyle = GOLD; g.lineWidth = 4; g.strokeRect(8, 8, 240, 368)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function bladeTexture() {
  const c = document.createElement('canvas')
  c.width = 128; c.height = 768
  const g = c.getContext('2d')
  g.fillStyle = '#0c0c0f'; g.fillRect(0, 0, 128, 768)
  g.strokeStyle = GOLD; g.lineWidth = 6; g.strokeRect(6, 6, 116, 756)
  g.fillStyle = '#fff4dc'; g.textAlign = 'center'; g.font = '700 84px Georgia, serif'
  'CINEMA'.split('').forEach((ch, i) => g.fillText(ch, 64, 120 + i * 112))
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Small warm bulbs around the marquee (one instanced mesh). */
function MarqueeBulbs({ x, y0, y1, z0, z1 }) {
  const ref = useRef()
  const pts = useMemo(() => {
    const p = []
    for (let z = z0; z <= z1 + 1e-3; z += 0.36) p.push([x, y0, z], [x, y1, z])
    for (let y = y0 + 0.36; y < y1 - 0.1; y += 0.36) p.push([x, y, z0], [x, y, z1])
    return p
  }, [x, y0, y1, z0, z1])
  const mat = useMemo(() => nightLit(new THREE.MeshStandardMaterial({ color: '#fff1cf', emissive: '#ffd690', roughness: 0.3 }), 3.2, 0.6), [])
  useEffect(() => {
    const o = new THREE.Object3D()
    pts.forEach((p, i) => { o.position.set(...p); o.updateMatrix(); ref.current.setMatrixAt(i, o.matrix) })
    ref.current.instanceMatrix.needsUpdate = true
  }, [pts])
  return <instancedMesh ref={ref} args={[null, mat, pts.length]}><icosahedronGeometry args={[0.055, 1]} /></instancedMesh>
}

export default function CinemaExterior() {
  const m = getMaterials()
  const { x: fx, cz, depth, half } = CINEMA_FRONT
  const ox = fx + depth // outer edge of the portico (towards the street)
  const colX = ox - 0.35
  const colZ = [cz - 6.2, cz - 2.6, cz + 2.6, cz + 6.2]
  const top = CURB + 4.75, slab = 0.42
  const colH = top - slab - CURB

  const mats = useMemo(() => ({
    granite: blackMarble(GOLD, 2, 6),
    column: m.marbleWall(0.6, 2),
    stone: surface('limestone', 1, 0.4, { color: '#d8d2c6' }),
    gold: m.shared('cinemaGold', () => new THREE.MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: 0.28 })),
    goldGlow: m.shared('cinemaGoldGlow', () => nightLit(new THREE.MeshStandardMaterial({ color: GOLD, emissive: '#ffcf70', metalness: 0.6, roughness: 0.3 }), 1.6, 0.15)),
    soffit: m.shared('cinemaSoffit', () => new THREE.MeshStandardMaterial({ color: '#1a1716', roughness: 0.6 })),
    down: m.shared('cinemaDown', () => nightLit(new THREE.MeshStandardMaterial({ color: '#f5efe2', emissive: '#ffe6bd' }), 3.5, 0.4)),
    carpet: m.shared('redCarpet', () => new THREE.MeshStandardMaterial({ color: '#7d0f19', map: surface('carpet', 1, 4).map, roughness: 1 })),
    rope: m.shared('velvetRope', () => new THREE.MeshStandardMaterial({ color: '#8d1020', roughness: 0.8 })),
    blade: m.shared('cinemaBlade', () => { const t = bladeTexture(); return nightLit(new THREE.MeshStandardMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, roughness: 0.5 }), 1.3, 0.15) }),
    up: m.shared('cinemaUplight', () => nightLit(new THREE.MeshStandardMaterial({ color: '#ffe3b0', emissive: '#ffd08a' }), 4, 0.3)),
    topiary: m.shared('topiary', () => new THREE.MeshStandardMaterial({ color: '#2f5426', roughness: 0.9, flatShading: true })),
  }), [m])
  const posters = useMemo(() => [
    posterTexture('PREMIERE', 'NOW SHOWING', 280),
    posterTexture('MIDNIGHT', 'COMING SOON', 200),
    posterTexture('VISION', 'ORIGINALS', 330),
    posterTexture('ENCORE', 'LIVE ON SCREEN', 20),
  ], [])
  const posterMats = useMemo(() => posters.map((t) => nightLit(new THREE.MeshStandardMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, roughness: 0.35 }), 0.9, 0.35)), [posters])
  const posterZ = [cz - 10.6, cz - 8.2, cz + 8.2, cz + 10.6]
  const downs = []
  for (let i = 0; i < 2; i++) for (let k = -3; k <= 3; k++) downs.push([fx + 0.9 + i * 1.3, cz + k * 1.9])

  return (
    <group>
      {/* colliders: columns, planters, stanchion posts */}
      <RigidBody type="fixed" colliders={false}>
        {colZ.map((z) => <CylinderCollider key={z} args={[colH / 2, 0.36]} position={[colX, CURB + colH / 2, z]} />)}
        {[cz - half + 0.2, cz + half - 0.2].map((z) => <CylinderCollider key={'pl' + z} args={[0.5, 0.62]} position={[fx + 1.4, CURB + 0.5, z]} />)}
        {[-1, 1].flatMap((k) => [fx + 0.9, fx + 2.1].map((x) => <CylinderCollider key={k + ':' + x} args={[0.48, 0.09]} position={[x, CURB + 0.48, cz + k * 1.45]} />))}
      </RigidBody>

      {/* polished black granite forecourt and red carpet */}
      <mesh position={[fx + (depth + 0.8) / 2, CURB + 0.004, cz]} rotation={[-Math.PI / 2, 0, 0]} material={mats.granite} receiveShadow><planeGeometry args={[depth + 0.8, half * 2 + 1]} /></mesh>
      <mesh position={[fx + (depth + 0.8) / 2, CURB + 0.008, cz]} rotation={[-Math.PI / 2, 0, 0]} material={mats.carpet} receiveShadow><planeGeometry args={[depth + 0.8, 2.4]} /></mesh>
      {[-1.22, 1.22].map((dz) => <mesh key={dz} position={[fx + (depth + 0.8) / 2, CURB + 0.01, cz + dz]} rotation={[-Math.PI / 2, 0, 0]} material={mats.gold}><planeGeometry args={[depth + 0.8, 0.05]} /></mesh>)}

      {/* brass stanchions with velvet ropes either side of the carpet */}
      {[-1, 1].map((k) => (
        <group key={k}>
          {[fx + 0.9, fx + 2.1].map((x) => (
            <group key={x} position={[x, CURB, cz + k * 1.45]}>
              <mesh position={[0, 0.03, 0]} material={mats.gold}><cylinderGeometry args={[0.16, 0.18, 0.06, 16]} /></mesh>
              <mesh position={[0, 0.5, 0]} material={mats.gold}><cylinderGeometry args={[0.03, 0.03, 0.95, 10]} /></mesh>
              <mesh position={[0, 0.99, 0]} material={mats.gold}><sphereGeometry args={[0.06, 12, 8]} /></mesh>
            </group>
          ))}
          <mesh position={[fx + 1.5, CURB + 0.86, cz + k * 1.45]} rotation={[0, 0, Math.PI / 2]} material={mats.rope}><cylinderGeometry args={[0.025, 0.025, 1.2, 8]} /></mesh>
        </group>
      ))}

      {/* columns: stone plinth, white marble shaft, gold capital, uplight */}
      {colZ.map((z) => (
        <group key={z} position={[colX, CURB, z]}>
          <mesh position={[0, 0.16, 0]} material={mats.stone} castShadow receiveShadow><boxGeometry args={[0.8, 0.32, 0.8]} /></mesh>
          <mesh position={[0, 0.32 + (colH - 0.62) / 2, 0]} material={mats.column} castShadow><cylinderGeometry args={[0.26, 0.3, colH - 0.62, 24]} /></mesh>
          <mesh position={[0, colH - 0.24, 0]} material={mats.gold} castShadow><cylinderGeometry args={[0.38, 0.27, 0.2, 24]} /></mesh>
          <mesh position={[0, colH - 0.08, 0]} material={mats.stone}><boxGeometry args={[0.78, 0.16, 0.78]} /></mesh>
          {[-1, 1].map((k) => <mesh key={k} position={[k * 0.48, 0.34, 0]} material={mats.up}><cylinderGeometry args={[0.07, 0.07, 0.04, 12]} /></mesh>)}
        </group>
      ))}

      {/* portico canopy: black slab, gold fascia, warm downlights in the soffit */}
      <mesh position={[fx + depth / 2, top - slab / 2, cz]} material={m.blackSteel} castShadow receiveShadow><boxGeometry args={[depth, slab, half * 2]} /></mesh>
      <mesh position={[fx + depth / 2, top - slab - 0.005, cz]} rotation={[Math.PI / 2, 0, 0]} material={mats.soffit}><planeGeometry args={[depth - 0.1, half * 2 - 0.1]} /></mesh>
      <mesh position={[ox + 0.01, top - slab / 2, cz]} material={mats.goldGlow}><boxGeometry args={[0.04, 0.1, half * 2]} /></mesh>
      {[-1, 1].map((k) => <mesh key={k} position={[fx + depth / 2, top - slab / 2, cz + k * (half + 0.01)]} material={mats.goldGlow}><boxGeometry args={[depth, 0.1, 0.04]} /></mesh>)}
      {downs.map(([x, z], i) => <mesh key={i} position={[x, top - slab - 0.012, z]} rotation={[Math.PI / 2, 0, 0]} material={mats.down}><circleGeometry args={[0.12, 16]} /></mesh>)}

      {/* illuminated marquee on the canopy edge */}
      <mesh position={[ox - 0.35, top + 1.0, cz]} material={m.blackSteel} castShadow><boxGeometry args={[0.5, 2.0, 11]} /></mesh>
      <BrandSign text="VISION CINEMA" sub="NOW SHOWING · LUXURY RECLINERS" position={[ox - 0.09, top + 1.0, cz]} rotation={[0, Math.PI / 2, 0]} width={7.2} color="#fff6e2" glow="#ffe2a8" />
      <MarqueeBulbs x={ox - 0.08} y0={top + 0.12} y1={top + 1.88} z0={cz - 5.3} z1={cz + 5.3} />
      <mesh position={[ox - 0.35, top + 2.05, cz]} material={mats.goldGlow}><boxGeometry args={[0.56, 0.1, 11.06]} /></mesh>

      {/* vertical blade sign on the facade corner */}
      <group position={[fx + 0.7, CURB + 9.3, CINEMA.z1 - 0.6]}>
        <mesh material={m.blackSteel} castShadow><boxGeometry args={[1.2, 7.4, 0.22]} /></mesh>
        {[-1, 1].map((k) => <mesh key={k} position={[0, 0, k * 0.115]} rotation={[0, k < 0 ? Math.PI : 0, 0]} material={mats.blade}><planeGeometry args={[1.0, 6.9]} /></mesh>)}
        <mesh position={[-0.65, 0, 0]} material={mats.gold}><boxGeometry args={[0.1, 7.5, 0.3]} /></mesh>
      </group>

      {/* poster light boxes either side of the entrance */}
      {posterZ.map((z, i) => (
        <group key={z} position={[fx + 0.07, CURB + 2.0, z]} rotation={[0, Math.PI / 2, 0]}>
          <mesh material={mats.gold}><boxGeometry args={[1.42, 2.12, 0.1]} /></mesh>
          <mesh position={[0, 0, 0.056]} material={posterMats[i]}><planeGeometry args={[1.28, 1.92]} /></mesh>
        </group>
      ))}

      {/* landscaping: flower beds under the posters, topiary planters at the portico ends, benches */}
      <FlowerBed x={fx + 0.45} z={cz - 9.4} w={0.8} d={3.6} seed={21} shrubs={false} />
      <FlowerBed x={fx + 0.45} z={cz + 9.4} w={0.8} d={3.6} seed={22} shrubs={false} />
      {[cz - half + 0.2, cz + half - 0.2].map((z) => (
        <group key={z} position={[fx + 1.4, CURB, z]}>
          <mesh position={[0, 0.45, 0]} material={blackMarble(GOLD, 1, 1)} castShadow receiveShadow><cylinderGeometry args={[0.6, 0.5, 0.9, 24]} /></mesh>
          <mesh position={[0, 0.91, 0]} material={mats.gold}><torusGeometry args={[0.58, 0.03, 8, 32]} /></mesh>
          <mesh position={[0, 1.55, 0]} material={mats.topiary} castShadow><coneGeometry args={[0.45, 1.5, 9]} /></mesh>
          <mesh position={[0, 1.05, 0]} material={mats.topiary} castShadow><sphereGeometry args={[0.5, 10, 8]} /></mesh>
        </group>
      ))}
      <Bench position={[fx + 0.55, CURB, cz - 12.4]} yaw={Math.PI / 2} />
      <Bench position={[fx + 0.55, CURB, cz + 12.4]} yaw={Math.PI / 2} />

      {/* lighting: two warm pools under the canopy and two column washes (night only) */}
      <LightAnchor position={[fx + 1.6, top - 0.8, cz - 3.5]} color="#ffe2b6" intensity={26} distance={11} night />
      <LightAnchor position={[fx + 1.6, top - 0.8, cz + 3.5]} color="#ffe2b6" intensity={26} distance={11} night />
    </group>
  )
}
