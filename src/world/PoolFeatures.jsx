import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { BrandSign } from './signs.jsx'
import { LightAnchor } from './props.jsx'
import { villaMarble } from './VillaInterior.jsx'
import { surfaceH } from './Pool.jsx'
import { POOL } from '../config/island.js'
import { NEON } from '../config/theme.js'
import { registerWater, addRipple, rippleAt } from '../state/water.js'
import { registerInteractable, playerState } from '../state/runtime.js'
import { useSeats } from '../state/seats.js'
import { useStore } from '../state/store.js'
import { env, nightLit } from '../state/environment.js'
import { sfx } from '../audio/sfx.js'

// Isla Serena pool features, all original designs in the brand palette (black marble, gold, hot pink, teal, yellow, purple):
//   LaneRopes   three lanes of floating disc ropes that bob with the water
//   JumpBoard   a 0.55 m jump board over the deep end, with steps up; "Dive off the board" launches a head-first dive
//   HotTub      a raised spa with a stepped entry, bench seats in the water, jets (toggle), bubbles and steam
//   PoolFloats  two float loungers you can sit on, afloat in the deep end
//   PoolSigns   the pool rules, "no diving" markers in the shallow end, a rescue ring on a post

const { x0, x1, z0, z1, rim, surf, deck } = POOL
const W = x1 - x0, D = z1 - z0
const CX = (x0 + x1) / 2, CZ = (z0 + z1) / 2
const FLOOR = deck // collider top of the platform (0.45); the marble deck visuals sit 2 cm above

let M
const mats = () => {
  if (M) return M
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...o })
  M = {
    chrome: std('#d8dade', { roughness: 0.15, metalness: 1 }),
    gold: std('#c9a96a', { roughness: 0.25, metalness: 0.9 }),
    board: new THREE.MeshPhysicalMaterial({ color: '#0c0b10', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }),
    teal: new THREE.MeshStandardMaterial({ color: NEON.teal, emissive: NEON.teal, emissiveIntensity: 2.2, toneMapped: false }),
    pink: new THREE.MeshStandardMaterial({ color: NEON.pink, emissive: NEON.pink, emissiveIntensity: 2.2, toneMapped: false }),
    yellow: nightLit(new THREE.MeshStandardMaterial({ color: NEON.yellow, emissive: NEON.yellow, toneMapped: false }), 2.2, 0.5),
    cord: std('#e9f2f6', { roughness: 0.6 }),
    tile: std('#25b8c0', { roughness: 0.35 }),
    rubber: std('#14121a', { roughness: 0.9 }),
    white: std('#f4f8fb', { roughness: 0.6 }),
  }
  return M
}

// ---------------------------------------------------------------- lane ropes
export function LaneRopes() {
  const m = mats()
  const lanes = [z0 + D / 3, z0 + (2 * D) / 3]
  const xa = x0 + 1.9, xb = x1 - 0.3, step = 0.26
  const n = Math.floor((xb - xa) / step)
  const ref = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useLayoutEffect(() => {
    const c = new THREE.Color()
    const mid = n >> 1
    for (let l = 0; l < lanes.length; l++) for (let i = 0; i < n; i++) {
      const end = i < 6 || i >= n - 6
      const middle = Math.abs(i - mid) < 3
      c.set(end ? NEON.pink : middle ? NEON.yellow : (Math.floor(i / 3) % 2 ? '#f4f8fb' : NEON.teal))
      ref.current.setColorAt(l * n + i, c)
    }
    ref.current.instanceColor.needsUpdate = true
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((st) => {
    const t = st.clock.elapsedTime
    for (let l = 0; l < lanes.length; l++) for (let i = 0; i < n; i++) {
      const x = xa + i * step
      dummy.position.set(x, surf + surfaceH(x, lanes[l], t) + 0.012, lanes[l])
      dummy.rotation.set(0, 0, Math.PI / 2)
      dummy.updateMatrix()
      ref.current.setMatrixAt(l * n + i, dummy.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, n * lanes.length]} frustumCulled={false} userData={{ noBatch: true }}>
        <cylinderGeometry args={[0.062, 0.062, 0.25, 10]} />
        <meshStandardMaterial roughness={0.45} />
      </instancedMesh>
      {lanes.map((z) => (
        <group key={z}>
          <mesh position={[(xa + xb) / 2, surf + 0.008, z]} rotation={[0, 0, Math.PI / 2]} material={m.cord} userData={{ noBatch: true }}><cylinderGeometry args={[0.012, 0.012, xb - xa + 0.4, 6]} /></mesh>
          <mesh position={[xa - 0.12, surf + 0.02, z]} material={m.pink} userData={{ noBatch: true }}><sphereGeometry args={[0.1, 14, 10]} /></mesh>
          <mesh position={[x1 - 0.06, surf - 0.04, z]} material={m.chrome} userData={{ noBatch: true }}><boxGeometry args={[0.05, 0.14, 0.14]} /></mesh>
        </group>
      ))}
    </group>
  )
}

// ---------------------------------------------------------------- jump board
const BOARD = { top: FLOOR + 0.54, sx: x1 + rim + 1.05, tipX: x1 - 1.7 } // top height, stand centre x, x of the board tip
export function JumpBoard() {
  const m = mats()
  const stand = villaMarble(0.4, 0.4)
  const { top, sx, tipX } = BOARD
  const len = sx + 0.5 - tipX
  useEffect(() => registerInteractable('pool-jump-board', {
    position: new THREE.Vector3(tipX + 0.5, top, CZ),
    radius: 1.3,
    label: 'Dive off the board',
    onInteract: () => {
      if (playerState.position.y < top - 0.3) { useStore.getState().showToast('Climb the steps onto the board first.'); return }
      playerState.launch = { vx: -4.6, vz: 0, vy: 5.4, yaw: -Math.PI / 2 }
      sfx.stroke()
    },
  }), [tipX, top])
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.6, 0.27, 0.5]} position={[sx, FLOOR + 0.27, CZ]} />
        <CuboidCollider args={[0.6, 0.135, 0.2]} position={[sx, FLOOR + 0.135, CZ + 0.72]} />
        <CuboidCollider args={[len / 2, 0.04, 0.27]} position={[(sx + 0.5 + tipX) / 2, top - 0.04, CZ]} />
      </RigidBody>
      {/* the stand: black marble block with a gold cap and one step */}
      <mesh position={[sx, FLOOR + 0.26, CZ]} material={stand} castShadow receiveShadow><boxGeometry args={[1.2, 0.54, 1.0]} /></mesh>
      <mesh position={[sx, FLOOR + 0.135, CZ + 0.72]} material={stand} castShadow receiveShadow><boxGeometry args={[1.2, 0.27, 0.4]} /></mesh>
      <mesh position={[sx, FLOOR + 0.28, CZ + 0.93]} material={m.yellow}><boxGeometry args={[1.1, 0.02, 0.03]} /></mesh>
      <mesh position={[sx, FLOOR + 0.55, CZ + 0.72 - 0.2]} material={m.gold}><boxGeometry args={[1.22, 0.025, 0.04]} /></mesh>
      {/* the board: a black glossy plank with a teal edge light, a pink grip strip, and a chrome fulcrum */}
      <mesh position={[(sx + 0.5 + tipX) / 2, top - 0.035, CZ]} material={m.board} castShadow><boxGeometry args={[len, 0.07, 0.52]} /></mesh>
      <mesh position={[(sx + 0.3 + tipX) / 2 + 0.2, top + 0.001, CZ]} material={m.rubber}><boxGeometry args={[len - 0.5, 0.004, 0.4]} /></mesh>
      {[-0.26, 0.26].map((dz) => <mesh key={dz} position={[(sx + 0.5 + tipX) / 2, top - 0.035, CZ + dz]} material={m.teal}><boxGeometry args={[len, 0.02, 0.012]} /></mesh>)}
      <mesh position={[tipX + 0.4, top + 0.003, CZ]} material={m.pink}><boxGeometry args={[0.3, 0.005, 0.4]} /></mesh>
      <mesh position={[x1 + 0.35, top - 0.2, CZ]} rotation={[Math.PI / 2, 0, 0]} material={m.chrome}><cylinderGeometry args={[0.06, 0.06, 0.6, 14]} /></mesh>
      <BrandSign text="JUMP BOARD" sub="DEEP END · FEET FIRST" position={[sx, FLOOR + 1.35, CZ - 0.52]} rotation={[0, Math.PI, 0]} width={1.5} color="#f4efff" glow={NEON.pink} size={100} />
      <mesh position={[sx, FLOOR + 0.95, CZ - 0.505]} material={m.rubber}><boxGeometry args={[1.5, 0.45, 0.02]} /></mesh>
    </group>
  )
}

// ---------------------------------------------------------------- hot tub
const TUB = { cx: 288.4, cz: -78.9, iw: 2.8, id: 2.4, wt: 0.3, wh: 0.96, rise: 0.24, water: 0.78 }
const TUB_SURF = FLOOR + TUB.water
// a soft round sprite so steam and bubbles are not hard-edged squares
let SOFT = null
const softDot = () => {
  if (SOFT) return SOFT
  const c = document.createElement('canvas'); c.width = c.height = 64
  const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.5, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = r; g.fillRect(0, 0, 64, 64)
  SOFT = new THREE.CanvasTexture(c)
  return SOFT
}
const RAMP_A = Math.atan2(0.72, 1.08), RAMP_L = Math.hypot(0.72, 1.08) // tub entry ramps
export function HotTub() {
  const m = mats()
  const { cx, cz, iw, id, wt, wh, rise } = TUB
  const ix0 = cx - iw / 2, ix1 = cx + iw / 2, iz0 = cz - id / 2, iz1 = cz + id / 2
  const marble = useMemo(() => villaMarble(1, 1), [])
  const jets = useRef(false)
  const ref = useRef()
  const bub = useRef()
  const steam = useRef()

  useEffect(() => registerWater({ id: 'villa-spa', x0: ix0, x1: ix1, z0: iz0, z1: iz1, surf: TUB_SURF, deck: FLOOR, rim: wt, ladders: [] }), []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => registerInteractable('villa-spa-jets', {
    position: new THREE.Vector3(ix1 + wt + 0.5, FLOOR + 0.3, iz1 + 0.1), // reachable from the steps, the deck and from inside the tub
    radius: 2.4,
    water: true, // usable while standing in the tub
    label: () => (jets.current ? 'Turn the hot tub jets off' : 'Turn the hot tub jets on'),
    onInteract: () => { jets.current = !jets.current; sfx.splash(0.2); useStore.getState().showToast(jets.current ? 'Jets on: warm, bubbling water.' : 'Jets off.') },
  }), []) // eslint-disable-line react-hooks/exhaustive-deps

  // bench seats in the water: three along the west wall, one on each side wall
  const seats = useMemo(() => {
    const y = FLOOR + 0.42
    const L = 'Sit in the hot tub'
    return [
      { position: [ix0 + 0.3, y, cz - 0.75], yaw: Math.PI / 2, height: 0.42, label: L, water: true },
      { position: [ix0 + 0.3, y, cz], yaw: Math.PI / 2, height: 0.42, label: L, water: true },
      { position: [ix0 + 0.3, y, cz + 0.75], yaw: Math.PI / 2, height: 0.42, label: L, water: true },
      { position: [cx - 0.55, y, iz0 + 0.28], yaw: 0, height: 0.42, label: L, water: true },
      { position: [cx - 0.55, y, iz1 - 0.28], yaw: Math.PI, height: 0.42, label: L, water: true },
    ]
  }, [])
  useSeats(seats, [])

  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(iw, id, 28, 24)
    g.userData.base = Float32Array.from(g.attributes.position.array)
    return g
  }, [])
  const N = 80
  const bgeo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3).fill(-1e4), 3)); return g }, [])
  const sgeo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(40 * 3).fill(-1e4), 3)); return g }, [])
  const wmat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#18c7d2', transparent: true, opacity: 0.55, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide, specularIntensity: 0.6 }), [])
  const rnd = useMemo(() => Array.from({ length: N }, (_, i) => ({ a: ((i * 2.399963) % 6.283), r: 0.2 + ((i * 0.618) % 1) * 0.9, ph: (i * 0.37) % 1, sp: 0.5 + ((i * 0.73) % 1) * 0.6 })), [])

  useFrame((st, dt) => {
    const t = st.clock.elapsedTime
    const on = jets.current
    // surface: gentle swell, boiling when the jets are on, plus rings from anyone moving in it
    const pos = geo.attributes.position, base = geo.userData.base
    const amp = on ? 0.016 : 0.004
    for (let i = 0; i < pos.count; i++) {
      const bx = base[i * 3] + cx, bz = cz - base[i * 3 + 1]
      pos.setZ(i, amp * (Math.sin(5 * bx + 3.1 * t) + Math.sin(4.3 * bz - 2.7 * t + 1.1)) + rippleAt(bx, bz, t) * 0.8)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
    if (on && Math.floor(t * 3) !== Math.floor((t - dt) * 3)) addRipple(ix0 + 0.4 + Math.random() * (iw - 0.8), iz0 + 0.4 + Math.random() * (id - 0.8), t, 0.01)
    // bubbles rising from the jets
    const bp = bgeo.attributes.position
    for (let i = 0; i < N; i++) {
      if (!on) { bp.setXYZ(i, 0, -1e4, 0); continue }
      const p = rnd[i], k = (t * p.sp * 0.45 + p.ph) % 1
      const jx = ix0 + 0.45 + (i % 4) * 0.28, jz = iz0 + 0.5 + ((i >> 2) % 5) * 0.34 // above six wall jets and a floor row
      bp.setXYZ(i, jx + Math.sin(t * 2 + p.a) * 0.06 * k, FLOOR + 0.1 + k * (TUB.water - 0.1), jz + Math.cos(t * 1.7 + p.a) * 0.06 * k)
    }
    bp.needsUpdate = true
    // steam over the water at night or when the jets are running
    const sp = sgeo.attributes.position
    const show = on || env.day < 0.6
    for (let i = 0; i < 40; i++) {
      if (!show) { sp.setXYZ(i, 0, -1e4, 0); continue }
      const p = rnd[i], k = (t * 0.16 * p.sp + p.ph) % 1
      sp.setXYZ(i, cx + Math.cos(p.a) * p.r * 1.1 + Math.sin(t * 0.5 + p.a) * 0.1 * k, TUB_SURF + 0.05 + k * 1.1, cz + Math.sin(p.a) * p.r * 0.9)
    }
    sp.needsUpdate = true
  })

  const wallH = wh / 2
  const gateZ = [cz - 0.6, cz + 0.6]
  const eastSegs = [[iz0 - wt, gateZ[0]], [gateZ[1], iz1 + wt]] // east wall pieces either side of the stepped gate
  return (
    <group ref={ref}>
      <RigidBody type="fixed" colliders={false}>
        {/* walls (collision runs from the platform up to the rim) */}
        <CuboidCollider args={[wt / 2, wallH, (id + 2 * wt) / 2]} position={[ix0 - wt / 2, FLOOR + wallH, cz]} />
        <CuboidCollider args={[iw / 2 + wt, wallH, wt / 2]} position={[cx, FLOOR + wallH, iz0 - wt / 2]} />
        <CuboidCollider args={[iw / 2 + wt, wallH, wt / 2]} position={[cx, FLOOR + wallH, iz1 + wt / 2]} />
        {eastSegs.map(([a, b], i) => <CuboidCollider key={i} args={[wt / 2, wallH, (b - a) / 2]} position={[ix1 + wt / 2, FLOOR + wallH, (a + b) / 2]} />)}
        <CuboidCollider args={[wt / 2, 0.42, 0.6]} position={[ix1 + wt / 2, FLOOR + 0.42, cz]} />
        {/* the entry: the stairs are walked as two smooth ramps (autostepping four 24 cm risers in a row was unreliable):
            up the outside to the 72 cm rim, over the low gate, down the inside into the water. The visual steps follow the same line. */}
        <CuboidCollider args={[(RAMP_L + 0.4) / 2, 0.05, 0.6]} position={[ix1 + wt + 0.54 - 0.0277 + 0.1664, FLOOR + 0.48 - 0.0416 - 0.111, cz]} rotation={[0, 0, -RAMP_A]} />
        <CuboidCollider args={[(RAMP_L + 0.4) / 2, 0.05, 0.6]} position={[ix1 - 0.54 + 0.0277 - 0.1664, FLOOR + 0.48 - 0.0416 - 0.111, cz]} rotation={[0, 0, RAMP_A]} />
        {/* benches */}
        <CuboidCollider args={[0.27, 0.21, id / 2]} position={[ix0 + 0.27, FLOOR + 0.21, cz]} />
        <CuboidCollider args={[0.55, 0.21, 0.25]} position={[cx - 0.55, FLOOR + 0.21, iz0 + 0.25]} />
        <CuboidCollider args={[0.55, 0.21, 0.25]} position={[cx - 0.55, FLOOR + 0.21, iz1 - 0.25]} />
      </RigidBody>
      {/* marble shell, gold rim, tiled floor and benches */}
      <mesh position={[ix0 - wt / 2, FLOOR + wallH, cz]} material={marble} castShadow receiveShadow><boxGeometry args={[wt, wh, id + 2 * wt]} /></mesh>
      <mesh position={[cx, FLOOR + wallH, iz0 - wt / 2]} material={marble} castShadow receiveShadow><boxGeometry args={[iw + 2 * wt, wh, wt]} /></mesh>
      <mesh position={[cx, FLOOR + wallH, iz1 + wt / 2]} material={marble} castShadow receiveShadow><boxGeometry args={[iw + 2 * wt, wh, wt]} /></mesh>
      {eastSegs.map(([a, b], i) => <mesh key={i} position={[ix1 + wt / 2, FLOOR + wallH, (a + b) / 2]} material={marble} castShadow receiveShadow><boxGeometry args={[wt, wh, b - a]} /></mesh>)}
      <mesh position={[ix1 + wt / 2, FLOOR + 0.42, cz]} material={marble} castShadow receiveShadow><boxGeometry args={[wt, 0.84, 1.2]} /></mesh>
      {[[ix0 - wt / 2, cz, 0.04, id + 2 * wt + 0.06], [cx, iz0 - wt / 2, iw + 2 * wt + 0.06, 0.04], [cx, iz1 + wt / 2, iw + 2 * wt + 0.06, 0.04]].map(([x, z, sx, sz], i) => (
        <mesh key={i} position={[x, FLOOR + wh + 0.012, z]} material={m.gold}><boxGeometry args={[i ? sx : wt + 0.06, 0.025, i ? wt + 0.06 : sz]} /></mesh>
      ))}
      <mesh position={[cx, FLOOR + 0.025, cz]} material={m.tile} receiveShadow><boxGeometry args={[iw, 0.04, id]} /></mesh>
      <mesh position={[ix0 + 0.27, FLOOR + 0.21, cz]} material={marble} receiveShadow><boxGeometry args={[0.54, 0.42, id]} /></mesh>
      <mesh position={[cx - 0.55, FLOOR + 0.21, iz0 + 0.25]} material={marble} receiveShadow><boxGeometry args={[1.1, 0.42, 0.5]} /></mesh>
      <mesh position={[cx - 0.55, FLOOR + 0.21, iz1 - 0.25]} material={marble} receiveShadow><boxGeometry args={[1.1, 0.42, 0.5]} /></mesh>
      {/* entry steps (visual): outside up, inside down */}
      {[1, 2, 3].map((k) => <mesh key={'vo' + k} position={[ix1 + wt + 0.18 + (3 - k) * 0.36, FLOOR + (rise * k) / 2, cz]} material={marble} castShadow receiveShadow><boxGeometry args={[0.36, rise * k, 1.2]} /></mesh>)}
      {[3, 2, 1].map((k, j) => <mesh key={'vi' + k} position={[ix1 - 0.18 - j * 0.36, FLOOR + (rise * k) / 2, cz]} material={marble} receiveShadow><boxGeometry args={[0.36, rise * k, 1.2]} /></mesh>)}
      {[1, 2, 3].map((k) => <mesh key={'vn' + k} position={[ix1 + wt + 0.01 + (3 - k) * 0.36, FLOOR + rise * k + 0.003, cz]} material={m.yellow}><boxGeometry args={[0.03, 0.012, 1.1]} /></mesh>)}
      {/* underwater light strips along the inside walls */}
      <mesh position={[ix0 + 0.02, FLOOR + 0.62, cz]} material={m.teal}><boxGeometry args={[0.02, 0.035, id - 0.2]} /></mesh>
      <mesh position={[cx - 0.2, FLOOR + 0.62, iz0 + 0.02]} material={m.pink}><boxGeometry args={[iw - 0.5, 0.035, 0.02]} /></mesh>
      <mesh position={[cx - 0.2, FLOOR + 0.62, iz1 - 0.02]} material={m.pink}><boxGeometry args={[iw - 0.5, 0.035, 0.02]} /></mesh>
      {/* jets control panel on a post, and the sign */}
      <mesh position={[ix1 + wt + 1.1, FLOOR + 0.55, iz1 + 0.2]} material={m.chrome} castShadow><boxGeometry args={[0.08, 1.1, 0.08]} /></mesh>
      <mesh position={[ix1 + wt + 1.1, FLOOR + 1.12, iz1 + 0.2]} material={m.teal}><boxGeometry args={[0.2, 0.1, 0.02]} /></mesh>
      <BrandSign text="HOT TUB" sub="JETS · 5 SEATS · MAX 15 MIN" position={[cx, FLOOR + 0.55, iz1 + wt + 0.02]} width={1.9} color="#f4efff" glow={NEON.teal} size={110} />
      <mesh geometry={geo} material={wmat} position={[cx, TUB_SURF, cz]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={4} userData={{ noBatch: true }} />
      <points geometry={bgeo} frustumCulled={false} renderOrder={6} userData={{ noBatch: true }}><pointsMaterial color="#eaffff" size={0.07} map={softDot()} alphaTest={0.02} transparent opacity={0.85} depthWrite={false} sizeAttenuation /></points>
      <points geometry={sgeo} frustumCulled={false} renderOrder={6} userData={{ noBatch: true }}><pointsMaterial color="#ffffff" size={0.7} map={softDot()} alphaTest={0.01} transparent opacity={0.16} depthWrite={false} sizeAttenuation /></points>
      <LightAnchor position={[cx, FLOOR + 1.1, cz]} color="#2fe6dc" intensity={9} distance={7} night />
    </group>
  )
}

// ---------------------------------------------------------------- floats
function PoolFloat({ x, z, yaw = 0, phase = 0, accent = 0 }) {
  const g = useRef()
  const body = useMemo(() => new RoundedBoxGeometry(0.95, 0.2, 1.9, 4, 0.09), [])
  const cols = [[NEON.teal, '#f4f8fb'], [NEON.pink, '#f4f8fb']][accent % 2]
  useSeats(useMemo(() => [{ position: [x, surf + 0.2, z], yaw: yaw + Math.PI / 2, label: 'Sit on the pool float', water: true }], [x, z, yaw]), [x, z, yaw])
  useFrame((st) => {
    const t = st.clock.elapsedTime
    if (!g.current) return
    g.current.position.y = surf + surfaceH(x, z, t) * 1.5 + Math.sin(t * 1.1 + phase) * 0.008
    g.current.rotation.z = Math.sin(t * 0.9 + phase) * 0.012
    g.current.rotation.x = Math.sin(t * 0.7 + phase * 1.3) * 0.012
  })
  return (
    <group ref={g} position={[x, surf, z]} rotation={[0, yaw, 0]}>
      <mesh geometry={body} position={[0, 0.07, 0]} castShadow><meshStandardMaterial color={cols[1]} roughness={0.55} /></mesh>
      {[-0.6, -0.2, 0.2, 0.6].map((dz) => <mesh key={dz} position={[0, 0.172, dz]}><boxGeometry args={[0.96, 0.02, 0.2]} /><meshStandardMaterial color={cols[0]} roughness={0.55} /></mesh>)}
      <mesh position={[0, 0.2, -0.78]} rotation={[0.35, 0, 0]} castShadow><capsuleGeometry args={[0.13, 0.5, 6, 10]} /><meshStandardMaterial color={NEON.pink} roughness={0.7} /></mesh>
    </group>
  )
}
export function PoolFloats() {
  // the float's long axis runs along x, so its yaw is a quarter turn
  return (
    <group>
      <PoolFloat x={304.3} z={-71.95} yaw={Math.PI / 2} phase={0} accent={0} />
      <PoolFloat x={306.7} z={-72.05} yaw={Math.PI / 2} phase={1.7} accent={1} />
    </group>
  )
}

// ---------------------------------------------------------------- signs and the rescue ring
export function PoolSigns() {
  const m = mats()
  const marble = useMemo(() => villaMarble(0.5, 0.5), [])
  const COPING = deck + 0.04
  const flat = (text, x, z, flip, width = 1.5) => (
    <group position={[x, COPING + 0.006, z]} rotation={[0, flip ? Math.PI : 0, 0]}>
      <BrandSign text={text} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} width={width} color="#e9d7a4" glow="#c9a96a" size={110} />
    </group>
  )
  return (
    <group>
      {/* painted on the coping, readable from the pool side */}
      {flat('NO DIVING', x0 + 2.6, z0 - rim / 2, true, 1.6)}
      {flat('NO DIVING', x0 + 2.6, z1 + rim / 2, false, 1.6)}
      {flat('DEEP END', x1 - 3.2, z0 - rim / 2, true, 1.6)}
      {/* the pool rules on a marble post at the south-west corner */}
      <group position={[291.9, FLOOR, -70.4]}>
        <mesh position={[0, 0.8, 0]} material={marble} castShadow><boxGeometry args={[0.16, 1.6, 0.16]} /></mesh>
        <mesh position={[0, 1.55, 0.02]} material={m.rubber}><boxGeometry args={[1.5, 0.78, 0.04]} /></mesh>
        <BrandSign text="POOL RULES" sub="NO RUNNING · NO DIVING IN SHALLOWS" position={[0, 1.68, -0.002]} rotation={[0, Math.PI, 0]} width={1.4} color="#f4efff" glow={NEON.yellow} size={100} />
        <BrandSign text="SWIM WITH A FRIEND" sub="SPACE UP · C DIVE · LIFEGUARD AT ZERO BREATH" position={[0, 1.4, -0.002]} rotation={[0, Math.PI, 0]} width={1.4} color="#f4efff" glow={NEON.teal} size={90} />
      </group>
      {/* a rescue ring on a post by the ladders */}
      <group position={[302.3, FLOOR, -77.35]}>
        <mesh position={[0, 0.7, 0]} material={m.chrome} castShadow><cylinderGeometry args={[0.03, 0.03, 1.4, 8]} /></mesh>
        <mesh position={[0, 1.15, 0.06]} rotation={[0, 0, 0]} castShadow><torusGeometry args={[0.28, 0.07, 10, 28]} /><meshStandardMaterial color="#f4f8fb" roughness={0.6} /></mesh>
        {[0, 1, 2, 3].map((i) => <mesh key={i} position={[Math.cos((i * Math.PI) / 2) * 0.28, 1.15 + Math.sin((i * Math.PI) / 2) * 0.28, 0.06]} rotation={[0, 0, (i * Math.PI) / 2]}><boxGeometry args={[0.09, 0.15, 0.15]} /><meshStandardMaterial color={NEON.pink} roughness={0.6} /></mesh>)}
      </group>
    </group>
  )
}
