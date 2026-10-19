import { useMemo } from 'react'
import * as THREE from 'three'
import { signTexture, plaqueTexture } from './canvasText.js'
import { nightLit } from '../state/environment.js'

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
