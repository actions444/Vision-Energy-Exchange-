import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { surface } from './materials.js'
import { Wall, Block, Gate } from './jobkit.jsx'
import { Sofa, Table, Rug, Counter, DiningSet, CeilingLight, Chair } from './furniture.jsx'
import { Palms, PottedPlant } from './Vegetation.jsx'
import { Hedge } from './flora/Plants.jsx'
import { LightAnchor } from './props.jsx'
import { BrandSign } from './signs.jsx'
import { nightLit } from '../state/environment.js'
import { ISLE, VY, POOL } from '../config/island.js'
import { waveH } from './Ocean.jsx'
import RoyalFilms from './RoyalFilms.jsx'
import Terrace from './Terrace.jsx'
import VillaInterior, { villaMarble } from './VillaInterior.jsx'
import SkyDeck from './SkyDeck.jsx'
import { UpperPlatformColliders, PlatformFill } from './Pool.jsx'

// The lagoon floor and surface are cut open over the villa pool, so the pool's own tiles, depth and water are what you see there.
const HOLE = [POOL.x0 - POOL.rim - 0.1, POOL.x1 + POOL.rim + 0.1, POOL.z0 - POOL.rim - 0.1, POOL.z1 + POOL.rim + 0.1]
/** [x0,x1,z0,z1] minus HOLE, as four rectangles. */
function aroundHole(x0, x1, z0, z1) {
  const [a, b, c, d] = HOLE
  return [[x0, x1, z0, c], [x0, x1, d, z1], [x0, a, c, d], [b, x1, c, d]]
}

// Isla Serena: a Caribbean-style island district in the bay. A shallow turquoise lagoon over
// pale sand (the sea surface above it does the colouring), a white sandbar with loungers and
// umbrellas, and a modern villa on its own islet with a reflecting pool, a stepping-stone path
// and a dock. The sea in this world is walkable and drivable at water level, so the lagoon is a
// place to wade, to ride jet skis and to drive across. Everything uses absolute world coordinates.

let M
function mats() {
  if (M) return M
  M = {
    sand: new THREE.MeshStandardMaterial({ color: '#f1eadb', roughness: 1 }),
    sandWet: new THREE.MeshStandardMaterial({ color: '#d9cfb6', roughness: 0.9 }),
    stucco: new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.82 }),
    travertine: surface('limestone', 5, 1.2, { color: '#efe7d6' }),
    stone: surface('limestone', 1.2, 1.2, { color: '#e9e4d8' }),
    deck: surface('wood', 5, 2, { color: '#a67a52' }),
    floor: surface('tile', 7, 5, { color: '#ece6da' }),
    slat: surface('wood', 4, 2, { color: '#6d4a30' }),
    dark: new THREE.MeshStandardMaterial({ color: '#2b2d31', roughness: 0.6, metalness: 0.5 }),
    poolWater: new THREE.MeshPhysicalMaterial({ color: '#31d3d6', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.82, clearcoat: 1 }),
    poolFloor: new THREE.MeshStandardMaterial({ color: '#bfeee9', roughness: 0.5 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#bcd7e6', roughness: 0.04, transparent: true, opacity: 0.25, depthWrite: false }),
    canopy: new THREE.MeshStandardMaterial({ color: '#f7f3ea', roughness: 0.9, side: THREE.DoubleSide }),
    towel: new THREE.MeshStandardMaterial({ color: '#2fb7b0', roughness: 1 }),
    cushion: new THREE.MeshStandardMaterial({ color: '#f2eee6', roughness: 1 }),
    pole: new THREE.MeshStandardMaterial({ color: '#8c8f93', metalness: 0.8, roughness: 0.4 }),
    gravel: new THREE.MeshStandardMaterial({ color: '#d7d2c6', roughness: 1 }),
    lamp: nightLit(new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffd596', roughness: 0.4 }), 3, 0.1),
  }
  return M
}

/** The sea floor of the lagoon: pale rippled sand with darker seagrass and reef patches. */
function Shoal() {
  const { x0, x1, z0, z1, floorY } = ISLE.lagoon
  const tex = useMemo(() => {
    const W = 1024, H = 300
    const c = document.createElement('canvas'); c.width = W; c.height = H
    const g = c.getContext('2d')
    g.fillStyle = '#efe6c8'; g.fillRect(0, 0, W, H)
    let s = 7
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
    for (let i = 0; i < 140; i++) {
      const x = rnd() * W, y = rnd() * H, r = 18 + rnd() * 60
      const gr = g.createRadialGradient(x, y, 0, x, y, r)
      const reef = rnd() > 0.5
      gr.addColorStop(0, reef ? 'rgba(86,120,92,0.55)' : 'rgba(176,160,120,0.4)')
      gr.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r * 1.5, r, 0, 0, 7); g.fill()
    }
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.2
    for (let i = 0; i < 260; i++) {
      const x = rnd() * W, y = rnd() * H, l = 20 + rnd() * 50
      g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + l / 3, y - 3, x + (2 * l) / 3, y + 3, x + l, y); g.stroke()
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
  }, [])
  const geo = useMemo(() => {
    const W = x1 - x0, D = z1 - z0
    const sh = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(W, 0), new THREE.Vector2(W, D), new THREE.Vector2(0, D)])
    const [a, b, c, d] = HOLE // shape coordinates: sx = x - x0, sy = z1 - z
    const hole = new THREE.Path([new THREE.Vector2(a - x0, z1 - d), new THREE.Vector2(a - x0, z1 - c), new THREE.Vector2(b - x0, z1 - c), new THREE.Vector2(b - x0, z1 - d)])
    sh.holes.push(hole)
    const g = new THREE.ShapeGeometry(sh)
    const uv = g.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / W, uv.getY(i) / D)
    return g
  }, [x0, x1, z0, z1])
  return (
    <mesh geometry={geo} position={[x0, floorY, z1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial map={tex} roughness={1} side={THREE.DoubleSide} />
    </mesh>
  )
}

/** The lagoon's bright turquoise surface: the same waves as the open sea, over the same grid, so the two meet cleanly. */
function LagoonWater() {
  const { x0, x1, z0, z1 } = ISLE.lagoon
  const w = x1 - x0, d = z1 - z0
  const geos = useMemo(() => aroundHole(x0, x1, z0, z1).map(([a, b, c, e]) => {
    const g = new THREE.PlaneGeometry(b - a, e - c, Math.max(1, Math.round((b - a) / 2)), Math.max(1, Math.round((e - c) / 2)))
    g.rotateX(-Math.PI / 2)
    g.translate((a + b) / 2 - (x0 + x1) / 2, 0, (c + e) / 2 - (z0 + z1) / 2) // local to the lagoon centre, like the one big grid was
    g.userData.base = Float32Array.from(g.attributes.position.array)
    return g
  }), [x0, x1, z0, z1])
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#27d6cf', roughness: 0.06, metalness: 0, transparent: true, opacity: 0.5, clearcoat: 0.8, clearcoatRoughness: 0.1, envMapIntensity: 1.4, depthWrite: false,
  }), [])
  useFrame((st) => {
    const t = st.clock.elapsedTime
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
    for (const geo of geos) {
      const pos = geo.attributes.position, base = geo.userData.base
      for (let i = 0; i < pos.count; i++) pos.setY(i, waveH(base[i * 3] + cx, base[i * 3 + 2] + cz, t))
      pos.needsUpdate = true
      geo.computeVertexNormals()
    }
  })
  return <group position={[(x0 + x1) / 2, 0, (z0 + z1) / 2]}>{geos.map((geo, i) => <mesh key={i} geometry={geo} material={mat} renderOrder={3} userData={{ noBatch: true }} />)}</group>
}

/** A white sandbar: a low mound with two shallow steps of collider so it can be walked up. */
function Sandbar() {
  const m = mats()
  const { x, z, len, wid, top } = ISLE.bar
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[len / 2 - 3, 0.075, wid / 2 - 1.2]} position={[x, 0.075, z]} />
        <CuboidCollider args={[len / 2 - 9, 0.075, wid / 2 - 2.6]} position={[x, top - 0.075, z]} />
      </RigidBody>
      <mesh position={[x, -0.18, z]} scale={[len / 2, 0.6, wid / 2]} material={m.sand} receiveShadow>
        <sphereGeometry args={[1, 40, 16]} />
      </mesh>
      <mesh position={[x + 0.5, -0.16, z + 0.4]} scale={[len / 2 + 2.2, 0.32, wid / 2 + 2]} material={m.sandWet} receiveShadow>
        <sphereGeometry args={[1, 40, 12]} />
      </mesh>
    </group>
  )
}

function Lounger({ position, yaw = 0 }) {
  const m = mats()
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.3, 0]} material={m.cushion} castShadow><boxGeometry args={[0.72, 0.12, 1.4]} /></mesh>
      <mesh position={[0, 0.5, -0.78]} rotation={[0.9, 0, 0]} material={m.cushion} castShadow><boxGeometry args={[0.72, 0.1, 0.8]} /></mesh>
      <mesh position={[0, 0.37, 0.15]} material={m.towel}><boxGeometry args={[0.74, 0.02, 0.4]} /></mesh>
      {[[-0.3, -0.62], [0.3, -0.62], [-0.3, 0.6], [0.3, 0.6]].map(([x, z], i) => <mesh key={i} position={[x, 0.12, z]} material={m.dark}><boxGeometry args={[0.05, 0.24, 0.05]} /></mesh>)}
    </group>
  )
}

function Umbrella({ position, tilt = 0.12 }) {
  const m = mats()
  return (
    <group position={position} rotation={[tilt, 0, 0]}>
      <mesh position={[0, 1.2, 0]} material={m.pole}><cylinderGeometry args={[0.03, 0.03, 2.4, 8]} /></mesh>
      <mesh position={[0, 2.4, 0]} material={m.canopy} castShadow><coneGeometry args={[1.5, 0.5, 14, 1, true]} /></mesh>
    </group>
  )
}

/** Stepping stones: white slabs over a gravel bed, as in a modern tropical entrance. */
function StonePath({ x, z0, z1, y }) {
  const m = mats()
  const n = Math.floor(Math.abs(z1 - z0) / 1.9)
  const dir = Math.sign(z1 - z0)
  return (
    <group>
      <mesh position={[x, y + 0.012, (z0 + z1) / 2]} material={m.gravel} receiveShadow><boxGeometry args={[3.4, 0.03, Math.abs(z1 - z0)]} /></mesh>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[x, y + 0.04, z0 + dir * (0.95 + i * 1.9)]} material={m.stone} receiveShadow><boxGeometry args={[2.4, 0.05, 1.5]} /></mesh>
      ))}
    </group>
  )
}

/** A reflecting pool: coping stones around a shallow turquoise basin. */
function Pool({ x0, x1, z0, z1, y }) {
  const m = mats()
  const w = x1 - x0, d = z1 - z0
  return (
    <group>
      <mesh position={[(x0 + x1) / 2, y + 0.005, (z0 + z1) / 2]} material={m.poolFloor}><boxGeometry args={[w, 0.01, d]} /></mesh>
      <mesh position={[(x0 + x1) / 2, y + 0.055, (z0 + z1) / 2]} material={m.poolWater} userData={{ noBatch: true }}><boxGeometry args={[w - 0.1, 0.02, d - 0.1]} /></mesh>
      {[[(x0 + x1) / 2, z0 - 0.15, w + 0.6, 0.3], [(x0 + x1) / 2, z1 + 0.15, w + 0.6, 0.3]].map(([px, pz, sw, sd], i) => (
        <mesh key={i} position={[px, y + 0.04, pz]} material={m.stone} castShadow><boxGeometry args={[sw, 0.09, sd]} /></mesh>
      ))}
      {[x0 - 0.15, x1 + 0.15].map((px, i) => <mesh key={'s' + i} position={[px, y + 0.04, (z0 + z1) / 2]} material={m.stone} castShadow><boxGeometry args={[0.3, 0.09, d]} /></mesh>)}
    </group>
  )
}

function Villa() {
  const m = mats()
  const { x0, x1, z0, z1, h } = ISLE.villa
  const cx = (x0 + x1) / 2
  const rect = { x0, x1, z0, z1 }
  const ext = surface('plaster', 4, 2, { color: '#f4f1ea' })
  const int = villaMarble(9, 2.4) // black marble inside
  const doorX = cx
  return (
    <group>
      <Wall side="s" rect={rect} h={h} t={0.4} ext={ext} int={int} y={VY} openings={[{ at: cx - 6, half: 3, glass: true, h: 3.2, sill: 0.9 }, { at: cx + 6, half: 3, glass: true, h: 3.2, sill: 0.9 }]} />
      <Wall side="w" rect={rect} h={h} t={0.4} ext={ext} int={int} y={VY} openings={[{ at: (z0 + z1) / 2, half: 3.4, glass: true, h: 3.3, sill: 0.1 }]} />
      <Wall side="e" rect={rect} h={h} t={0.4} ext={ext} int={int} y={VY} openings={[{ at: (z0 + z1) / 2 - 3, half: 1.2, glass: true, h: 3.0, sill: 0.9 }]} />
      <Wall side="n" rect={rect} h={h} t={0.4} ext={ext} int={int} y={VY}
        openings={[{ at: x0 + 4.5, half: 3.8, glass: true, h: 3.4, sill: 0.1 }, { at: doorX, half: 1.3, h: 3.2 }, { at: x1 - 4.5, half: 3.8, glass: true, h: 3.4, sill: 0.1 }]} />
      {/* interior floor, flat roof slab with a deep overhang, and the upper-storey volume */}
      <Block position={[cx, VY + h + 0.17, (z0 + z1) / 2 + 1.6]} size={[x1 - x0 + 2.4, 0.34, z1 - z0 + 5.2]} material={m.stucco} collide={false} />
      <mesh position={[cx, VY + h + 0.4, (z0 + z1) / 2 + 1.6]} material={m.stone}><boxGeometry args={[x1 - x0 + 2.6, 0.12, z1 - z0 + 5.4]} /></mesh>
      <Block position={[x1 - 9.5, VY + h + 0.34 + 1.5, z0 + 5.4]} size={[19, 3, 10.4]} material={m.slat} collide={false} />
      <mesh position={[x1 - 9.5, VY + h + 0.34 + 1.6, z0 + 10.62]} material={m.glass}><boxGeometry args={[16.5, 2.2, 0.06]} /></mesh>
      <mesh position={[x1 - 9.5, VY + h + 0.34 + 3.18, z0 + 6.2]} material={m.stucco}><boxGeometry args={[20.4, 0.3, 12.2]} /></mesh>
      {/* front columns carrying the overhang */}
      {[x0 - 0.8, cx - 5, cx + 5, x1 + 0.8].map((px, i) => <Block key={i} position={[px, VY + h / 2, z1 + 3.4]} size={[0.38, h, 0.38]} material={m.stone} />)}
      {/* interior: the Pool Lounge (see VillaInterior.jsx) — only rendered while near the villa */}
      <Gate x0={x0} x1={x1} z0={z0} z1={z1} pad={10}>
        <VillaInterior />
      </Gate>
      <BrandSign text="ISLA SERENA" sub="POOL LOUNGE · SWIM · DINE · RELAX" position={[cx, VY + h + 0.78, z1 + 5.85]} width={9} color="#f6f2e8" glow="#fff0d4" size={130} />
    </group>
  )
}

export default function Island() {
  const m = mats()
  const v = ISLE.villa
  const cx = (v.x0 + v.x1) / 2
  const P = ISLE.platform
  const palms = useMemo(() => [
    [P.x0 + 3, VY, P.z0 + 4, 0.93, 0.3], [P.x0 + 2, VY, P.z1 - 8, 0.81, 1.1], [P.x1 - 3, VY, P.z0 + 3, 0.99, 2.2],
    [P.x1 - 2.5, VY, v.z1 + 6, 0.87, 0.7], [P.x0 + 6, VY, v.z1 + 8, 1.05, 1.9], [P.x1 - 6, VY, P.z1 - 9, 0.93, 0.2],
    [P.x0 + 4, VY, v.z0 - 2, 0.74, 2.6], [cx + 10, VY, v.z1 + 12, 0.81, 1.4],
    [ISLE.bar.x - 14, 0.3, ISLE.bar.z - 1, 0.74, 0.5], [ISLE.bar.x + 16, 0.3, ISLE.bar.z + 0.5, 0.81, 1.7], [ISLE.bar.x + 2, 0.3, ISLE.bar.z - 2, 0.68, 2.5],
  ], [])
  // the sand mound under the platform, with the pool's footprint discarded so it doesn't lid the basin from above
  const mound = useMemo(() => {
    const mt = mats().sand.clone()
    mt.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;')
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('void main() {', `void main() {\n if (vWp.x > ${HOLE[0].toFixed(2)} && vWp.x < ${HOLE[1].toFixed(2)} && vWp.z > ${HOLE[2].toFixed(2)} && vWp.z < ${HOLE[3].toFixed(2)}) discard;`)
    }
    mt.customProgramCacheKey = () => 'sandMoundHole'
    return mt
  }, [])
  return (
    <group>
      <Shoal />
      <LagoonWater />
      <Sandbar />
      {/* villa islet: a wide sand apron and a raised platform, with colliders stepped for walking */}
      {/* the upper slab, with the swimming pool cut out of it (nothing to walk across the water on) */}
      <UpperPlatformColliders P={P} top={VY} />
      <mesh position={[(P.x0 + P.x1) / 2, -0.12, (P.z0 + P.z1) / 2]} scale={[(P.x1 - P.x0) / 2 + 3, 0.5, (P.z1 - P.z0) / 2 + 3]} material={mound} receiveShadow userData={{ noBatch: true }}><sphereGeometry args={[1, 40, 16]} /></mesh>
      {/* sand fill and stone cap of the platform, in pieces around the pool so the basin stays open */}
      <PlatformFill P={P} y={VY} sand={m.sand} stone={m.stone} />
      <Villa />
      <RoyalFilms />
      {/* terrace: deck, reflecting pool, loungers, umbrellas */}
      <Terrace />
      <SkyDeck />
      {/* dock: planks on piles from the platform edge out over the water, with steps down to the lagoon */}
      <Block position={[cx, VY - 0.02, P.z1 + 6.5]} size={[3, 0.08, 14]} material={m.deck} />
      <Block position={[cx, 0.2, P.z1 + 14.6]} size={[3, 0.4, 1.4]} material={m.deck} />
      <Block position={[cx, 0.07, P.z1 + 15.9]} size={[3, 0.14, 1.2]} material={m.deck} />
      {[-1.4, 1.4].flatMap((dx) => [0, 4, 8, 12].map((dz) => (
        <mesh key={dx + ':' + dz} position={[cx + dx, VY / 2 - 0.2, P.z1 + 1 + dz]} material={m.dark}><cylinderGeometry args={[0.1, 0.1, 1.2, 8]} /></mesh>
      )))}
      {/* sandbar furniture */}
      {[-6, -2, 2, 6].map((dx, i) => <Lounger key={i} position={[ISLE.bar.x + dx, 0.34, ISLE.bar.z - 1.8]} yaw={0.15 * (i - 1.5)} />)}
      <Umbrella position={[ISLE.bar.x - 4, 0.34, ISLE.bar.z - 3.6]} />
      <Umbrella position={[ISLE.bar.x + 4, 0.34, ISLE.bar.z - 3.6]} />
      <Palms palms={palms} />
      {[[P.x0 + 4, P.z1 - 4], [P.x1 - 4, P.z1 - 4]].map(([x, z], i) => <Hedge key={i} position={[x, VY, z]} size={[5, 1.1, 1]} yaw={0} />)}
      {/* night lamps */}
      {[[cx - 2.4, P.z1 - 3], [cx + 2.4, P.z1 - 3]].map(([x, z], i) => (
        <group key={i}>
          <mesh position={[x, VY + 0.35, z]} material={m.dark}><cylinderGeometry args={[0.07, 0.07, 0.7, 8]} /></mesh>
          <mesh position={[x, VY + 0.78, z]} material={m.lamp}><sphereGeometry args={[0.14, 12, 8]} /></mesh>
          <LightAnchor position={[x, VY + 0.8, z]} color="#ffd9a0" intensity={9} distance={9} night />
        </group>
      ))}
      <LightAnchor position={[cx, VY + 2, v.z1 + 6]} color="#9fe8ee" intensity={14} distance={16} night />
    </group>
  )
}
