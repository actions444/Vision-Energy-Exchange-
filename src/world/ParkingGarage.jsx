import { useEffect, useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import * as THREE from 'three'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { getMaterials, surface } from './materials.js'
import { nightLit } from '../state/environment.js'
import { BrandSign } from './signs.jsx'
import { SITE, CENTER, GROUND_Y, MODEL_URL, SCALE, HEIGHT, DEPTH, ZONE } from '../config/parkingGarage.js'
import GLBBoundary from './GLBBoundary.jsx'

// ============================================================================
// STORMLINE PARKING GARAGE
// The one imported art asset in this project (a Tripo3D model the player supplied), everything
// else here is procedural. Scaled and dropped onto its site east of the Employment District.
// Collision is a hand-built approximation (flat deck slabs + ramps) since the import itself has
// no physics of its own — same approach the rest of the city uses for interiors.
//
// Wrapped in GLBBoundary: this model isn't available inside the Claude artifact preview (.glb
// files there 404), so a failed load just skips the visible model there instead of taking the
// whole app down. The deck colliders and sign still render either way.
// ============================================================================

export default function ParkingGarage() {
  return (
    <GLBBoundary fallback={<ParkingGarageShell />}>
      <ParkingGarageModel />
    </GLBBoundary>
  )
}

// Procedural stand-in for the imported model: used whenever the real .glb can't load (always
// true inside the Claude artifact preview - see GLBBoundary.jsx). A real four-level open-deck
// structure built from primitives, not just an empty collider box, so the site never looks
// like a hole in the city when the import is unavailable.
let PGM
function pgMats() {
  if (PGM) return PGM
  const m = getMaterials()
  PGM = {
    deck: surface('concrete', 8, 6, { color: '#8a8d92' }),
    column: m.blackSteel,
    parapet: new THREE.MeshStandardMaterial({ color: '#c3c7cc', roughness: 0.55, metalness: 0.25 }),
    fin: new THREE.MeshStandardMaterial({ color: '#2a2d33', roughness: 0.4, metalness: 0.7, side: THREE.DoubleSide }),
    neonPink: nightLit(new THREE.MeshStandardMaterial({ color: '#ff2fa0', emissive: '#ff2fa0', emissiveIntensity: 1.6 }), 2.6, 0.08),
    neonBlue: nightLit(new THREE.MeshStandardMaterial({ color: '#2fd0c4', emissive: '#2fd0c4', emissiveIntensity: 1.6 }), 2.6, 0.08),
    lamp: nightLit(new THREE.MeshStandardMaterial({ color: '#fff2d6', emissive: '#ffdca0', emissiveIntensity: 1.2 }), 3, 0.1),
  }
  return PGM
}
const pgHash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }
const PG_CAR_COLORS = ['#1d2a44', '#8b1d22', '#e8e8e6', '#2f3134', '#5d6c78', '#4b2a6e']

/** A few boxy parked-car silhouettes on a level, just for visual interest. */
function ParkedCars({ y, n = 7 }) {
  const w = SITE.x1 - SITE.x0, d = DEPTH
  const cars = useMemo(() => Array.from({ length: n }, (_, i) => ({
    x: CENTER.x + (pgHash(i * 3.1 + y) - 0.5) * (w - 6),
    z: CENTER.z + (pgHash(i * 7.7 + y) - 0.5) * (d - 5),
    yaw: pgHash(i * 11.3 + y) > 0.5 ? 0 : Math.PI / 2,
    color: PG_CAR_COLORS[Math.floor(pgHash(i * 5.3 + y) * PG_CAR_COLORS.length)],
  })), [y, n, w, d])
  return (
    <>
      {cars.map((c, i) => (
        <mesh key={i} position={[c.x, y + 0.5, c.z]} rotation={[0, c.yaw, 0]} castShadow>
          <boxGeometry args={[4.3, 1.1, 1.8]} />
          <meshStandardMaterial color={c.color} roughness={0.3} metalness={0.5} />
        </mesh>
      ))}
    </>
  )
}

/** One deck level: slab, low parapet with a neon trim strip, and perimeter light fixtures. */
function Level({ y, i }) {
  const mm = pgMats()
  const w = SITE.x1 - SITE.x0, d = DEPTH
  const neon = i % 2 ? mm.neonBlue : mm.neonPink
  return (
    <group>
      <mesh position={[CENTER.x, y, CENTER.z]} material={mm.deck} receiveShadow castShadow>
        <boxGeometry args={[w, 0.3, d]} />
      </mesh>
      {/* low parapet wall around the open-air edge */}
      <mesh position={[CENTER.x, y + 0.75, CENTER.z - d / 2 + 0.1]} material={mm.parapet} castShadow><boxGeometry args={[w, 1.1, 0.2]} /></mesh>
      <mesh position={[CENTER.x, y + 0.75, CENTER.z + d / 2 - 0.1]} material={mm.parapet} castShadow><boxGeometry args={[w, 1.1, 0.2]} /></mesh>
      <mesh position={[CENTER.x - w / 2 + 0.1, y + 0.75, CENTER.z]} material={mm.parapet} castShadow><boxGeometry args={[0.2, 1.1, d]} /></mesh>
      <mesh position={[CENTER.x + w / 2 - 0.1, y + 0.75, CENTER.z]} material={mm.parapet} castShadow><boxGeometry args={[0.2, 1.1, d]} /></mesh>
      {/* neon trim along the top edge of the parapet, alternating colour by level */}
      <mesh position={[CENTER.x, y + 1.32, CENTER.z - d / 2 + 0.1]} material={neon}><boxGeometry args={[w - 0.4, 0.05, 0.05]} /></mesh>
      <mesh position={[CENTER.x, y + 1.32, CENTER.z + d / 2 - 0.1]} material={neon}><boxGeometry args={[w - 0.4, 0.05, 0.05]} /></mesh>
      {/* ceiling light fixtures for the level above */}
      {[-w / 3, 0, w / 3].map((dx) => (
        <mesh key={dx} position={[CENTER.x + dx, y + HEIGHT / 4 - 0.2, CENTER.z]} material={mm.lamp}><boxGeometry args={[2.2, 0.08, 0.4]} /></mesh>
      ))}
      <ParkedCars y={y + 0.15} n={6} />
    </group>
  )
}

/** Perforated metal fins across the long (x-facing) sides, purely decorative cladding. */
function Fins() {
  const mm = pgMats()
  const w = SITE.x1 - SITE.x0
  const n = Math.floor(w / 1.1)
  const xs = Array.from({ length: n }, (_, i) => SITE.x0 + 0.55 + i * 1.1)
  return (
    <>
      {[SITE.z0, SITE.z1].map((z) => (
        <group key={z}>
          {xs.map((x, i) => (
            <mesh key={i} position={[x, GROUND_Y + HEIGHT / 2, z]} rotation={[0, i % 2 ? 0.15 : -0.15, 0]} material={mm.fin}>
              <boxGeometry args={[0.08, HEIGHT - 0.3, 0.9]} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  )
}

function ParkingGarageShell() {
  const mm = pgMats()
  const levelYs = [0, 1, 2, 3].map((i) => GROUND_Y + i * (HEIGHT / 4))
  const w = SITE.x1 - SITE.x0, d = DEPTH
  return (
    <group>
      <Colliders />
      {/* corner support columns, ground to roof */}
      {[-1, 1].map((sx) => [-1, 1].map((sz) => (
        <mesh key={sx + '_' + sz} position={[CENTER.x + sx * (w / 2 - 0.5), GROUND_Y + HEIGHT / 2, CENTER.z + sz * (d / 2 - 0.5)]} material={mm.column} castShadow>
          <boxGeometry args={[0.5, HEIGHT, 0.5]} />
        </mesh>
      )))}
      {[-1, 0, 1].map((sx) => (
        <mesh key={sx} position={[CENTER.x + sx * (w / 3), GROUND_Y + HEIGHT / 2, CENTER.z]} material={mm.column} castShadow>
          <boxGeometry args={[0.4, HEIGHT, 0.4]} />
        </mesh>
      ))}
      {levelYs.map((y, i) => <Level key={i} y={y} i={i} />)}
      {/* roof slab */}
      <mesh position={[CENTER.x, GROUND_Y + HEIGHT + 0.1, CENTER.z]} material={mm.deck} castShadow><boxGeometry args={[w, 0.3, d]} /></mesh>
      <Fins />
      <BrandSign text="STORMLINE PARKING" sub="4 LEVELS · OPEN 24/7" position={[CENTER.x, GROUND_Y + HEIGHT + 0.9, SITE.z0 - 0.3]} rotation={[0, Math.PI, 0]} width={16} color="#8fe8ff" glow="#ff2fa0" size={120} />
    </group>
  )
}

function ParkingGarageModel() {
  const gltf = useLoader(GLTFLoader, MODEL_URL, (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder)
  })
  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true)
    clone.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
    return clone
  }, [gltf])

  return (
    <group>
      <group position={[CENTER.x, GROUND_Y, CENTER.z]} scale={SCALE}>
        <primitive object={scene} />
      </group>
      <Colliders />
      <BrandSign text="STORMLINE PARKING" sub="4 LEVELS · OPEN 24/7" position={[CENTER.x, GROUND_Y + HEIGHT + 0.9, SITE.z0 - 0.3]} rotation={[0, Math.PI, 0]} width={16} color="#8fe8ff" glow="#ff2fa0" size={120} />
    </group>
  )
}

// Provisional collision: a simple stack of flat deck colliders at estimated level heights, plus
// the ground floor. Levels are refined after visually inspecting the rendered model in-game.
function Colliders() {
  const w = (SITE.x1 - SITE.x0) / 2 - 0.6
  const d = DEPTH / 2 - 0.6
  const cx = CENTER.x, cz = CENTER.z
  const levelYs = [0, 1, 2, 3].map((i) => GROUND_Y + i * (HEIGHT / 4))
  return (
    <RigidBody type="fixed" colliders={false}>
      {levelYs.map((y, i) => (
        <CuboidCollider key={i} args={[w, 0.15, d]} position={[cx, y + 0.15, cz]} />
      ))}
    </RigidBody>
  )
}
