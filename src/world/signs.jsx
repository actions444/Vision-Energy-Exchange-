import { useMemo } from 'react'
import * as THREE from 'three'
import { signTexture, plaqueTexture } from './canvasText.js'
import { nightLit } from '../state/environment.js'
import { assetMats } from './assets/materials.js'

// Branded signage. Letters are lit by the sun during the day and glow (backlit) after dark.
export function BrandSign({ text, sub, position, rotation = [0, 0, 0], width = 10, color = '#f4f1ea', glow = '#ffe9c4', size = 150, font }) {
  const tex = useMemo(() => signTexture(text, { color, size, sub, font }), [text, sub, color, size, font])
  const mat = useMemo(() => nightLit(new THREE.MeshStandardMaterial({ map: tex, emissive: glow, emissiveMap: tex, transparent: true, depthWrite: false, roughness: 0.4, metalness: 0.2 }), 1.4, 0.12), [tex, glow])
  return (
    <mesh position={position} rotation={rotation} material={mat}>
      <planeGeometry args={[width, width / 4]} />
    </mesh>
  )
}

/** Street-name blade sign on a pole, readable from all four sides. Originally local to
 *  world/westend/WestEnd.jsx; moved here (a shared, widely-imported module) so any district can
 *  use it without risking a circular import between two district files. */
export function StreetSign({ position, text, num = '', yaw = 0 }) {
  const A = assetMats()
  const green = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1d5a45', roughness: 0.45, metalness: 0.1 }), [])
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 1.6, 0]} material={A.galv} castShadow><cylinderGeometry args={[0.04, 0.04, 3.2, 8]} /></mesh>
      <mesh position={[0, 3.35, 0]} material={green}><boxGeometry args={[1.5, 0.37, 0.04]} /></mesh>
      <mesh position={[0, 3.35, 0]} material={green}><boxGeometry args={[0.04, 0.37, 1.5]} /></mesh>
      {[0, Math.PI, Math.PI / 2, -Math.PI / 2].map((r, i) => (
        <group key={i} rotation={[0, r, 0]}>
          <BrandSign text={text} sub={num || undefined} position={[0, 3.35, 0.03]} width={1.4} size={110} color="#ffffff" glow="#ffffff" />
        </group>
      ))}
    </group>
  )
}

/** Wall plaque next to a door: e.g. ['VSP-201', 'Music & Podcast Studio']. */
export function Plaque({ lines, position, rotation = [0, 0, 0], width = 0.9 }) {
  const tex = useMemo(() => plaqueTexture(lines), [lines.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps
  const mat = useMemo(() => nightLit(new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, roughness: 0.5 }), 0.5, 0.15), [tex])
  return (
    <mesh position={position} rotation={rotation} material={mat}>
      <planeGeometry args={[width, width / 2]} />
    </mesh>
  )
}
