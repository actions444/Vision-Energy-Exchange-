import * as THREE from 'three'
import { Block } from './jobkit.jsx'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { SUN_SITE, SUN_DECK_Y, beachY } from '../config/sunAtrium.js'

// Raised concrete platform on stilts over the beach slope, with a ramp up from the sand at the entrance.
const DECK = new THREE.MeshStandardMaterial({ color: '#d9d4c7', roughness: 0.85 })
const STILT = new THREE.MeshStandardMaterial({ color: '#8b857a', roughness: 0.9 })
const RAMP = { x0: 108, x1: 122.4, z0: -22.5, z1: -18.5 } // from sand to deck, lined up with the entrance gap

export default function SunAtrium() {
  const { x0, x1, z0, z1 } = SUN_SITE
  const w = x1 - x0, d = z1 - z0
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
  const xs = [x0 + 1.5, cx, x1 - 1.5]
  const zs = [z0 + 1.5, cz, z1 - 1.5]
  // ramp: rises from the sand (beach height at x0 of the ramp) to the deck top
  const rise = SUN_DECK_Y - beachY(RAMP.x0) + 0.15
  const run = RAMP.x1 - RAMP.x0
  const len = Math.hypot(run, rise)
  const angle = Math.atan2(rise, run)
  const rMidX = (RAMP.x0 + RAMP.x1) / 2, rMidY = (beachY(RAMP.x0) + SUN_DECK_Y) / 2
  const rw = RAMP.z1 - RAMP.z0
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
      {/* ramp from the sand up to the deck at the entrance */}
      <RigidBody type="fixed" colliders={false} position={[rMidX, rMidY, (RAMP.z0 + RAMP.z1) / 2]} rotation={[0, 0, angle]}>
        <CuboidCollider args={[len / 2, 0.1, rw / 2]} />
        <mesh material={DECK} castShadow receiveShadow>
          <boxGeometry args={[len, 0.2, rw]} />
        </mesh>
      </RigidBody>
    </group>
  )
}
