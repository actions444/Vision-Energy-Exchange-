import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, signatureMarble, blackMarble } from './materials.js'
import { useSeats } from '../state/seats.js'
import { registerInteractable } from '../state/runtime.js'
import { useStore } from '../state/store.js'
import { BrandSign } from './signs.jsx'
import { LightAnchor } from './props.jsx'
import { PottedPlant } from './Vegetation.jsx'
import { nightLit } from '../state/environment.js'
import { NEON } from '../config/theme.js'

// Usable furniture for the Isla Serena pool lounge. Everything has a collider; anything you can sit on
// registers seats (a Sit prompt appears when you walk up). Local +z is the front of each piece, and every
// piece is built around a floor point, so `position` is where it touches the deck.

const local = (pos, yaw, x, y, z) => [pos[0] + x * Math.cos(yaw) + z * Math.sin(yaw), pos[1] + y, pos[2] - x * Math.sin(yaw) + z * Math.cos(yaw)]
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o })
let K
function kit() {
  if (K) return K
  const m = getMaterials()
  K = {
    steel: m.blackSteel,
    chrome: m.chrome,
    cushion: std('#1d1b24', { roughness: 0.85 }),
    cream: std('#efe9f5', { roughness: 0.9 }),
    gold: std('#c9a96a', { roughness: 0.25, metalness: 0.9 }),
    pink: std(NEON.pink, { roughness: 0.8 }),
    teal: std(NEON.teal, { roughness: 0.8 }),
    purple: std(NEON.purple, { roughness: 0.8 }),
    yellow: std(NEON.yellow, { roughness: 0.8 }),
    ledPink: new THREE.MeshStandardMaterial({ color: NEON.pink, emissive: NEON.pink, emissiveIntensity: 2.4, toneMapped: false }),
    ledTeal: new THREE.MeshStandardMaterial({ color: NEON.teal, emissive: NEON.teal, emissiveIntensity: 2.4, toneMapped: false }),
    ledPurple: new THREE.MeshStandardMaterial({ color: NEON.purple, emissive: NEON.purple, emissiveIntensity: 2.6, toneMapped: false }),
    drape: new THREE.MeshStandardMaterial({ color: '#f4efff', roughness: 1, side: THREE.DoubleSide, transparent: true, opacity: 0.55, depthWrite: false }),
    canopy: new THREE.MeshStandardMaterial({ color: '#f4efff', roughness: 0.95, side: THREE.DoubleSide }),
    flame: nightLit(new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: '#ff7a1a', roughness: 0.6, toneMapped: false }), 3, 1.2),
    glassBottle: (c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.1, roughness: 0.2, toneMapped: false }),
    water: new THREE.MeshStandardMaterial({ color: '#bfe9ff', transparent: true, opacity: 0.45, depthWrite: false, roughness: 0.2 }),
  }
  return K
}
const ACCENTS = ['pink', 'teal', 'purple', 'yellow']

/** A reclining sun lounger: black steel frame, charcoal cushions, a coloured towel. Sit prompt on the cushion. */
export function SunLounger({ position, yaw = 0, accent = 0 }) {
  const k = kit()
  useSeats([{ position: local(position, yaw, 0, 0.42, -0.05), yaw, height: 0.42, label: 'Relax on lounger' }], [position[0], position[1], position[2], yaw])
  const towel = k[ACCENTS[accent % 4]]
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[0.38, 0.22, 0.95]} position={[0, 0.22, 0]} />
      <CuboidCollider args={[0.38, 0.3, 0.2]} position={[0, 0.5, -0.78]} />
      {[[-0.34, 0.9], [0.34, 0.9], [-0.34, -0.9], [0.34, -0.9]].map(([x, z], i) => <mesh key={i} position={[x, 0.12, z]} material={k.steel}><boxGeometry args={[0.04, 0.24, 0.04]} /></mesh>)}
      {[-0.34, 0.34].map((x) => <mesh key={x} position={[x, 0.25, 0]} material={k.steel}><boxGeometry args={[0.04, 0.04, 1.9]} /></mesh>)}
      <mesh position={[0, 0.3, 0.22]} material={k.cushion} castShadow receiveShadow><boxGeometry args={[0.7, 0.12, 1.3]} /></mesh>
      <mesh position={[0, 0.5, -0.66]} rotation={[0.95, 0, 0]} material={k.cushion} castShadow><boxGeometry args={[0.7, 0.11, 0.9]} /></mesh>
      <mesh position={[0, 0.375, 0.6]} material={towel}><boxGeometry args={[0.72, 0.02, 0.55]} /></mesh>
      <mesh position={[0, 0.375, 0.6]} material={k.cream}><boxGeometry args={[0.73, 0.021, 0.08]} /></mesh>
    </RigidBody>
  )
}

/** A side table: black marble top on a chrome pillar. */
export function SideTable({ position }) {
  const k = kit()
  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <CylinderCollider args={[0.26, 0.26]} position={[0, 0.26, 0]} />
      <mesh position={[0, 0.5, 0]} material={blackMarble('#c9a96a', 0.6, 0.6)} castShadow><cylinderGeometry args={[0.28, 0.28, 0.04, 28]} /></mesh>
      <mesh position={[0, 0.25, 0]} material={k.chrome}><cylinderGeometry args={[0.03, 0.03, 0.5, 8]} /></mesh>
      <mesh position={[0, 0.015, 0]} material={k.steel}><cylinderGeometry args={[0.2, 0.2, 0.03, 20]} /></mesh>
    </RigidBody>
  )
}

/** A daybed cabana: marble base, cream mattress with accent pillows, four posts, a canopy and side drapes. Seats two. */
export function Cabana({ position, yaw = 0, accent = 0 }) {
  const k = kit()
  useSeats([
    { position: local(position, yaw, -0.5, 0.52, 0), yaw, height: 0.52, label: 'Sit on daybed' },
    { position: local(position, yaw, 0.5, 0.52, 0), yaw, height: 0.52, label: 'Sit on daybed' },
  ], [position[0], position[1], position[2], yaw])
  const [w, d] = [2.5, 2.2]
  const posts = [[-1, -1], [1, -1], [-1, 1], [1, 1]]
  const c1 = k[ACCENTS[accent % 4]], c2 = k[ACCENTS[(accent + 1) % 4]], c3 = k[ACCENTS[(accent + 2) % 4]]
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[w / 2, 0.26, d / 2]} position={[0, 0.26, 0]} />
      {posts.map(([a, b], i) => <CuboidCollider key={i} args={[0.04, 1.3, 0.04]} position={[a * (w / 2 + 0.05), 1.3, b * (d / 2 + 0.05)]} />)}
      <mesh position={[0, 0.15, 0]} material={signatureMarble(0.8, 0.8)} castShadow receiveShadow><boxGeometry args={[w, 0.3, d]} /></mesh>
      <mesh position={[0, 0.02, 0]} material={k.ledPurple}><boxGeometry args={[w + 0.02, 0.03, d + 0.02]} /></mesh>
      <mesh position={[0, 0.41, 0]} material={k.cream} castShadow receiveShadow><boxGeometry args={[w - 0.2, 0.22, d - 0.2]} /></mesh>
      {[[-0.8, c1], [-0.2, c2], [0.5, c3]].map(([x, mt], i) => <mesh key={i} position={[x, 0.65, -d / 2 + 0.3]} rotation={[0.25, 0, (i - 1) * 0.12]} material={mt} castShadow><boxGeometry args={[0.55, 0.32, 0.14]} /></mesh>)}
      {posts.map(([a, b], i) => (
        <group key={i} position={[a * (w / 2 + 0.05), 0, b * (d / 2 + 0.05)]}>
          <mesh position={[0, 1.3, 0]} material={k.steel}><boxGeometry args={[0.06, 2.6, 0.06]} /></mesh>
          <mesh position={[0, 2.62, 0]} material={k.gold}><sphereGeometry args={[0.06, 12, 8]} /></mesh>
        </group>
      ))}
      <mesh position={[0, 2.62, 0]} material={k.canopy} castShadow><boxGeometry args={[w + 0.5, 0.07, d + 0.5]} /></mesh>
      <mesh position={[0, 2.57, d / 2 + 0.22]} material={k.ledPink}><boxGeometry args={[w + 0.4, 0.025, 0.025]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * (w / 2 + 0.05), 1.35, 0]} rotation={[0, Math.PI / 2, 0]} material={k.drape} userData={{ noBatch: true }}><planeGeometry args={[d, 2.3]} /></mesh>)}
      <LightAnchor position={local(position, yaw, 0, 2.4, 0)} color={accent % 2 ? '#ff5cae' : '#4be8dc'} intensity={7} distance={6} night />
    </RigidBody>
  )
}

/** A bar stool you can sit on, facing a given yaw. */
export function BarStool({ position, yaw = 0 }) {
  const k = kit()
  useSeats([{ position: [position[0], position[1] + 0.74, position[2]], yaw, height: 0.74, label: 'Sit at the bar' }], [position[0], position[1], position[2], yaw])
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CylinderCollider args={[0.37, 0.21]} position={[0, 0.37, 0]} />
      <mesh position={[0, 0.7, 0]} material={k.cushion} castShadow><cylinderGeometry args={[0.2, 0.19, 0.09, 24]} /></mesh>
      <mesh position={[0, 0.74, 0]} material={k.gold}><torusGeometry args={[0.2, 0.012, 6, 28]} /></mesh>
      <mesh position={[0, 0.35, 0]} material={k.chrome}><cylinderGeometry args={[0.025, 0.025, 0.7, 8]} /></mesh>
      <mesh position={[0, 0.3, 0]} material={k.chrome}><torusGeometry args={[0.17, 0.01, 6, 24]} /></mesh>
      <mesh position={[0, 0.01, 0]} material={k.steel}><cylinderGeometry args={[0.2, 0.2, 0.02, 20]} /></mesh>
    </RigidBody>
  )
}

/** A parasol on a weighted base. */
export function Parasol({ position, tilt = 0.08, color = '#f4efff', trim = NEON.pink }) {
  const k = kit()
  const canopy = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.95, side: THREE.DoubleSide }), [color])
  const trimM = useMemo(() => new THREE.MeshStandardMaterial({ color: trim, roughness: 0.8 }), [trim])
  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <CylinderCollider args={[1.2, 0.06]} position={[0, 1.2, 0]} />
      <CylinderCollider args={[0.1, 0.28]} position={[0, 0.1, 0]} />
      <mesh position={[0, 0.07, 0]} material={blackMarble('#c9a96a', 0.4, 0.4)}><cylinderGeometry args={[0.28, 0.3, 0.14, 20]} /></mesh>
      <group rotation={[tilt, 0, 0]}>
        <mesh position={[0, 1.2, 0]} material={k.chrome}><cylinderGeometry args={[0.025, 0.025, 2.4, 8]} /></mesh>
        <mesh position={[0, 2.38, 0]} material={canopy} castShadow><coneGeometry args={[1.55, 0.5, 16, 1, true]} /></mesh>
        <mesh position={[0, 2.14, 0]} rotation={[Math.PI / 2, 0, 0]} material={trimM}><torusGeometry args={[1.5, 0.015, 6, 40]} /></mesh>
        <mesh position={[0, 2.66, 0]} material={k.gold}><sphereGeometry args={[0.04, 10, 8]} /></mesh>
      </group>
    </RigidBody>
  )
}

/** A gas fire bowl: black marble, a low flame that glows after dark. */
export function FireBowl({ position }) {
  const k = kit()
  const flame = useRef()
  useFrame((st) => { if (flame.current) { const t = st.clock.elapsedTime; flame.current.scale.set(1, 1 + Math.sin(t * 9) * 0.12 + Math.sin(t * 15) * 0.06, 1) } })
  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <CylinderCollider args={[0.28, 0.4]} position={[0, 0.28, 0]} />
      <mesh position={[0, 0.25, 0]} material={signatureMarble(0.5, 0.5)} castShadow><cylinderGeometry args={[0.42, 0.36, 0.5, 28]} /></mesh>
      <mesh position={[0, 0.51, 0]} material={k.gold}><torusGeometry args={[0.42, 0.015, 8, 32]} /></mesh>
      <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} material={k.steel}><circleGeometry args={[0.4, 24]} /></mesh>
      <mesh ref={flame} position={[0, 0.7, 0]} material={k.flame} userData={{ noBatch: true }}><coneGeometry args={[0.2, 0.42, 10]} /></mesh>
      <LightAnchor position={[position[0], position[1] + 0.8, position[2]]} color="#ff9a4a" intensity={9} distance={7} night />
    </RigidBody>
  )
}

/** A poolside rinse shower: press E to run the water. */
export function OutdoorShower({ position, yaw = 0, id = 'villa-shower' }) {
  const k = kit()
  const [on, setOn] = useState(false)
  const stream = useRef()
  const onRef = useRef(on)
  onRef.current = on
  useEffect(() => registerInteractable(id, {
    position: new THREE.Vector3(position[0], position[1] + 1, position[2]),
    radius: 1.6,
    label: () => (onRef.current ? 'Turn the shower off' : 'Rinse off'),
    onInteract: () => { setOn((v) => !v); useStore.getState().showToast(onRef.current ? 'Shower off' : 'Rinse off: the shower runs warm') },
  }), [position[0], position[1], position[2]]) // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((st) => { if (stream.current) { stream.current.visible = onRef.current; stream.current.material.opacity = 0.3 + Math.sin(st.clock.elapsedTime * 30) * 0.08 } })
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[0.45, 0.04, 0.45]} position={[0, 0.04, 0]} />
      <CylinderCollider args={[1.1, 0.05]} position={[0, 1.1, -0.35]} />
      <mesh position={[0, 0.04, 0]} material={signatureMarble(0.4, 0.4)} receiveShadow><boxGeometry args={[0.9, 0.08, 0.9]} /></mesh>
      <mesh position={[0, 1.1, -0.35]} material={k.chrome}><cylinderGeometry args={[0.025, 0.025, 2.2, 10]} /></mesh>
      <mesh position={[0, 2.2, -0.2]} rotation={[0, 0, 0]} material={k.chrome}><cylinderGeometry args={[0.2, 0.2, 0.03, 20]} /></mesh>
      <mesh position={[0, 2.2, -0.28]} rotation={[Math.PI / 2, 0, 0]} material={k.chrome}><cylinderGeometry args={[0.02, 0.02, 0.16, 8]} /></mesh>
      <mesh ref={stream} position={[0, 1.1, -0.2]} material={k.water} visible={false} userData={{ noBatch: true }}><cylinderGeometry args={[0.2, 0.28, 2.1, 14, 1, true]} /></mesh>
      <mesh position={[0, 1.25, -0.34]} material={k.ledTeal}><boxGeometry args={[0.04, 0.12, 0.012]} /></mesh>
    </RigidBody>
  )
}

/** A tall planter: black marble box with a palm or ficus. */
export function DeckPlanter({ position, kind = 'areca', scale = 1.7 }) {
  const k = kit()
  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.4, 0.3, 0.4]} position={[0, 0.3, 0]} />
        <mesh position={[0, 0.3, 0]} material={signatureMarble(0.4, 0.4)} castShadow><boxGeometry args={[0.8, 0.6, 0.8]} /></mesh>
        <mesh position={[0, 0.615, 0]} material={k.gold}><boxGeometry args={[0.84, 0.03, 0.84]} /></mesh>
      </RigidBody>
      <PottedPlant position={[0, 0.5, 0]} kind={kind} scale={scale} pot="#0b0b0e" />
    </group>
  )
}

/**
 * Sunset Bar: a marble-topped bar with bar stools, a lit back bar of bottles, a pergola and a neon sign.
 * Runs north-south along the east edge of the deck; the customer side faces west (-x).
 * (x, y, z) is the floor point of the front counter's centre line.
 */
export function SunsetBar({ x, y, z, length = 6.4, id = 'sunset-bar', sign = 'SUNSET BAR', sub = 'SWIM-UP COCKTAILS', pergola = true, menu }) {
  const k = kit()
  const L = length
  useEffect(() => registerInteractable(id, {
    position: new THREE.Vector3(x - 1.3, y + 1, z),
    radius: 2.6,
    label: 'Check the drinks menu',
    onInteract: () => useStore.getState().showToast(menu || `${sign} · Mango Rum Cooler · Teal Lagoon · Pink Hibiscus Spritz · Yellow Sun Lemonade (menu only: serving isn't part of this build)`),
  }), [x, y, z]) // eslint-disable-line react-hooks/exhaustive-deps
  const bottleColors = ['#ff2e9a', '#00e5d0', '#a33cff', '#ffe83d', '#ffffff']
  const posts = [[-0.9, -1], [-0.9, 1], [3.0, -1], [3.0, 1]]
  return (
    <>
      <group position={[x, y, z]}>
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[0.42, 0.55, L / 2]} position={[0, 0.55, 0]} />
          <CuboidCollider args={[0.5, 1.45, L / 2 + 0.2]} position={[2.5, 1.45, 0]} />
          {pergola && posts.map(([px, sgn], i) => <CuboidCollider key={i} args={[0.06, 1.45, 0.06]} position={[px, 1.45, sgn * (L / 2 + 0.2)]} />)}
        </RigidBody>
        <mesh position={[0, 0.5, 0]} material={signatureMarble(L / 3, 0.4)} castShadow receiveShadow><boxGeometry args={[0.8, 1.0, L]} /></mesh>
        <mesh position={[0, 1.04, 0]} material={blackMarble('#c9a96a', L / 3, 0.4)} castShadow><boxGeometry args={[1.05, 0.08, L + 0.1]} /></mesh>
        <mesh position={[-0.41, 0.3, 0]} material={k.ledPink}><boxGeometry args={[0.02, 0.03, L - 0.2]} /></mesh>
        <mesh position={[-0.5, 0.28, 0]} material={k.chrome} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.02, 0.02, L - 0.3, 8]} /></mesh>
        {/* back bar: a marble wall unit with two glass shelves of lit bottles */}
        <mesh position={[2.5, 1.45, 0]} material={blackMarble('#c9a96a', 2, 2)} castShadow><boxGeometry args={[1.0, 2.9, L + 0.4]} /></mesh>
        {[1.35, 1.78].map((hy, r) => (
          <group key={r}>
            <mesh position={[1.98, hy, 0]} material={k.gold}><boxGeometry args={[0.28, 0.025, L - 0.3]} /></mesh>
            {Array.from({ length: 11 }, (_, i) => {
              const h = 0.22 + ((i + r) % 3) * 0.05
              return <mesh key={i} position={[1.98, hy + 0.025 + h / 2, (i - 5) * 0.52]} material={k.glassBottle(bottleColors[(i + r * 2) % 5])}><cylinderGeometry args={[0.04, 0.05, h, 10]} /></mesh>
            })}
          </group>
        ))}
        <mesh position={[1.96, 1.55, 0]} material={k.ledTeal}><boxGeometry args={[0.02, 0.02, L - 0.4]} /></mesh>
        <mesh position={[1.96, 1.98, 0]} material={k.ledPink}><boxGeometry args={[0.02, 0.02, L - 0.4]} /></mesh>
        <BrandSign text={sign} sub={sub} position={[1.97, 2.5, 0]} rotation={[0, -Math.PI / 2, 0]} width={5.2} color="#f4efff" glow={NEON.teal} size={150} />
        {pergola && (
          <>
        {posts.map(([px, sgn], i) => <mesh key={i} position={[px, 1.45, sgn * (L / 2 + 0.2)]} material={k.steel}><boxGeometry args={[0.12, 2.9, 0.12]} /></mesh>)}
        {[-1, 1].map((sgn) => <mesh key={sgn} position={[1.05, 2.92, sgn * (L / 2 + 0.2)]} material={k.steel}><boxGeometry args={[4.1, 0.14, 0.14]} /></mesh>)}
        {Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[1.05, 2.97, (i - 5.5) * (L + 0.4) / 12]} material={k.steel}><boxGeometry args={[4.1, 0.05, 0.08]} /></mesh>)}
        {[-2, 0, 2].map((pz) => <mesh key={pz} position={[0.2, 2.85, pz]} material={k.ledPink}><boxGeometry args={[0.8, 0.02, 0.02]} /></mesh>)}
          </>
        )}
        <LightAnchor position={[0.4, 2.6, -1.6]} color="#ff7bbd" intensity={12} distance={9} night />
        <LightAnchor position={[0.4, 2.6, 1.6]} color="#5cf0e4" intensity={12} distance={9} night />
      </group>
      {Array.from({ length: Math.floor((L - 1) / 1.2) + 1 }, (_, i) => (i - (Math.floor((L - 1) / 1.2)) / 2) * 1.2).map((sz) => <BarStool key={sz} position={[x - 1.0, y, z + sz]} yaw={Math.PI / 2} />)}
    </>
  )
}
