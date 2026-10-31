import * as THREE from 'three'
import { Block } from './jobkit.jsx'
import { SUN_SITE, SUN_DECK_Y, beachY } from '../config/sunAtrium.js'

// Stage 1 of the sun-atrium museum: a raised concrete platform on stilts over the beach slope.
// The deck has one collider so the player can walk on it; the stilts are visual only.
const DECK = new THREE.MeshStandardMaterial({ color: '#d9d4c7', roughness: 0.85 })
const STILT = new THREE.MeshStandardMaterial({ color: '#8b857a', roughness: 0.9 })

export default function SunAtrium() {
  const { x0, x1, z0, z1 } = SUN_SITE
  const w = x1 - x0, d = z1 - z0
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
  const xs = [x0 + 1.5, cx, x1 - 1.5]
  const zs = [z0 + 1.5, cz, z1 - 1.5]
  return (
    <group name="sun-atrium-platform">
      <Block position={[cx, SUN_DECK_Y - 0.15, cz]} size={[w, 0.3, d]} material={DECK} collide={true} />
      {xs.flatMap((x) => zs.map((z) => {
        const bottom = beachY(x) - 0.5
        const h = SUN_DECK_Y - bottom
        return (
          <mesh key={x + ':' + z} position={[x, bottom + h / 2, z]} material={STILT} castShadow>
            <cylinderGeometry args={[0.35, 0.35, h, 10]} />
          </mesh>
        )
      }))}
    </group>
  )
}
