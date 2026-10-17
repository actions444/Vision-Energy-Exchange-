import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CylinderCollider, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { surface } from './materials.js'
import { buildPalm } from './flora/palm.js'
import { floraMats, tickWind } from './flora/mats.js'

// Realistic planting. Leaves, fronds and blossoms are alpha-cut cards drawn from procedural
// canvases rather than blobs of geometry, which is how they read as real foliage and still cost
// almost nothing: a whole avenue of palms is a handful of instanced draw calls.

function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }
function cv(w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  draw(c.getContext('2d'), w, h)
  return c
}
const texCache = new Map()
function foliageTex(kind) {
  if (texCache.has(kind)) return texCache.get(kind)
  const t = new THREE.CanvasTexture(DRAW[kind]())
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  texCache.set(kind, t)
  return t
}
const matCache = new Map()
/** One shared alpha-cut material per foliage card, two-sided so leaves read from both faces. */
function foliageMat(kind, opts = {}) {
  const key = kind + JSON.stringify(opts)
  if (matCache.has(key)) return matCache.get(key)
  const tex = foliageTex(kind)
  const m = new THREE.MeshStandardMaterial({
    map: tex, transparent: false, alphaTest: 0.4,
    side: THREE.DoubleSide, roughness: 0.78, metalness: 0,
    ...opts,
  })
  matCache.set(key, m)
  return m
}

const DRAW = {
  // pinnate palm frond: a midrib with a hundred leaflets, longest in the middle
  frond: () => cv(256, 1024, (ctx, w, h) => {
    const cx = w / 2
    const rib = (t) => cx + Math.sin(t * 1.4) * 10
    for (const side of [-1, 1]) {
      for (let i = 0; i < 74; i++) {
        const t = 0.04 + (i / 74) * 0.94
        const y = h - t * h
        const len = (w * 0.47) * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.55) * (0.82 + hash(i * 3.1 + side) * 0.32)
        const droop = 26 + t * 48
        const x0 = rib(t)
        const g = ctx.createLinearGradient(x0, y, x0 + side * len, y + droop)
        const l = 20 + t * 12 + hash(i * 7) * 7
        g.addColorStop(0, `hsl(${94 + hash(i) * 16}, 46%, ${l}%)`)
        g.addColorStop(1, `hsl(${88 + hash(i * 2) * 20}, 40%, ${l + 11}%)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.moveTo(x0, y + 3)
        ctx.quadraticCurveTo(x0 + side * len * 0.55, y + droop * 0.12, x0 + side * len, y + droop)
        ctx.quadraticCurveTo(x0 + side * len * 0.5, y + droop * 0.5, x0, y - 3)
        ctx.closePath(); ctx.fill()
      }
    }
    // midrib
    ctx.strokeStyle = '#4e6b28'; ctx.lineWidth = 7
    ctx.beginPath(); ctx.moveTo(rib(0), h)
    for (let t = 0; t <= 1; t += 0.05) ctx.lineTo(rib(t), h - t * h)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(190,215,140,0.5)'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(rib(0), h)
    for (let t = 0; t <= 1; t += 0.05) ctx.lineTo(rib(t) + 1, h - t * h)
    ctx.stroke()
  }),

  // broad split leaf (monstera)
  monstera: () => cv(512, 512, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h * 0.75, 20, w / 2, h * 0.4, w * 0.6)
    g.addColorStop(0, '#1f4420'); g.addColorStop(1, '#3f7a30')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(w / 2, h - 6)
    ctx.bezierCurveTo(w * 0.02, h * 0.74, w * 0.06, h * 0.1, w / 2, 10)
    ctx.bezierCurveTo(w * 0.94, h * 0.1, w * 0.98, h * 0.74, w / 2, h - 6)
    ctx.fill()
    // veins
    ctx.strokeStyle = 'rgba(176,214,142,0.55)'; ctx.lineWidth = 3
    for (let i = 1; i < 9; i++) {
      const t = i / 9
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(w / 2, h - 10 - t * (h - 40))
        ctx.quadraticCurveTo(w / 2 + s * w * 0.2, h - 20 - t * (h - 40) - 10, w / 2 + s * w * (0.46 - t * 0.3), h - 40 - t * (h - 40) - 18)
        ctx.stroke()
      }
    }
    ctx.strokeStyle = '#9ccb78'; ctx.lineWidth = 6
    ctx.beginPath(); ctx.moveTo(w / 2, h - 4); ctx.lineTo(w / 2, 20); ctx.stroke()
    // the characteristic splits
    ctx.globalCompositeOperation = 'destination-out'
    for (let i = 0; i < 7; i++) {
      const t = 0.12 + (i / 7) * 0.76
      for (const s of [-1, 1]) {
        if (hash(i * 5 + s) < 0.22) continue
        const y = h - 14 - t * (h - 60)
        ctx.beginPath()
        ctx.moveTo(w / 2 + s * 22, y)
        ctx.quadraticCurveTo(w / 2 + s * w * 0.3, y - 10, w / 2 + s * w * (0.42 - t * 0.2), y - 26 - hash(i) * 10)
        ctx.lineTo(w / 2 + s * w * (0.42 - t * 0.2), y + 6 + hash(i * 3) * 12)
        ctx.quadraticCurveTo(w / 2 + s * w * 0.28, y + 14, w / 2 + s * 20, y + 14)
        ctx.closePath(); ctx.fill()
      }
    }
    ctx.globalCompositeOperation = 'source-over'
  }),


  // one glossy fiddle-leaf fig leaf: narrow base, broad rounded top, pale midrib and herringbone veins
  fiddleLeaf: () => cv(256, 384, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, h, 0, 0)
    g.addColorStop(0, '#1d4220'); g.addColorStop(0.55, '#2f6a2a'); g.addColorStop(1, '#3d7d32')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(w / 2, h - 2)
    ctx.bezierCurveTo(w * 0.34, h * 0.88, w * 0.08, h * 0.62, w * 0.04, h * 0.36)
    ctx.bezierCurveTo(w * 0.02, h * 0.12, w * 0.3, 4, w / 2, 6)
    ctx.bezierCurveTo(w * 0.7, 4, w * 0.98, h * 0.12, w * 0.96, h * 0.36)
    ctx.bezierCurveTo(w * 0.92, h * 0.62, w * 0.66, h * 0.88, w / 2, h - 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(214,232,160,0.5)'; ctx.lineWidth = 2
    for (let i = 1; i < 12; i++) {
      const y = h - 20 - i * ((h - 50) / 12)
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(w / 2, y); ctx.quadraticCurveTo(w / 2 + s * w * 0.22, y - 12, w / 2 + s * w * (0.2 + 0.2 * Math.sin((i / 12) * 3.1)), y - 34); ctx.stroke() }
    }
    ctx.strokeStyle = '#cfe29a'; ctx.lineWidth = 5
    ctx.beginPath(); ctx.moveTo(w / 2, h - 2); ctx.lineTo(w / 2, 14); ctx.stroke()
  }),

  // one snake-plant blade: dark green, pale banding, yellow margin
  sword: () => cv(64, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, h, 0, 0)
    g.addColorStop(0, '#1f4a27'); g.addColorStop(1, '#3d7a39')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(w * 0.12, h); ctx.quadraticCurveTo(w * 0.02, h * 0.5, w / 2, 2); ctx.quadraticCurveTo(w * 0.98, h * 0.5, w * 0.88, h)
    ctx.closePath(); ctx.fill()
    ctx.save(); ctx.clip()
    ctx.strokeStyle = 'rgba(176,206,120,0.32)'; ctx.lineWidth = 5
    for (let y = 20; y < h; y += 26) { ctx.beginPath(); ctx.moveTo(0, y + hash(y) * 8); ctx.lineTo(w, y + 10 + hash(y * 3) * 10); ctx.stroke() }
    ctx.strokeStyle = '#c8c35a'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(w * 0.12, h); ctx.quadraticCurveTo(w * 0.02, h * 0.5, w / 2, 2); ctx.quadraticCurveTo(w * 0.98, h * 0.5, w * 0.88, h); ctx.stroke()
    ctx.restore()
  }),

  // glossy oval leaf (fiddle-leaf fig, rubber plant, hedge foliage)
  broad: () => cv(256, 256, (ctx, w, h) => {
    for (let k = 0; k < 7; k++) {
      const cx = 40 + hash(k * 3) * (w - 80), cy = 40 + hash(k * 7) * (h - 80)
      const r = 34 + hash(k * 11) * 26, a = hash(k * 5) * 3
      const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
      g.addColorStop(0, `hsl(${100 + hash(k) * 24}, 44%, ${15 + hash(k * 2) * 10}%)`)
      g.addColorStop(1, `hsl(${96 + hash(k * 4) * 26}, 48%, ${28 + hash(k * 6) * 12}%)`)
      ctx.fillStyle = g
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a)
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.62, r, 0, 0, 7); ctx.fill()
      ctx.strokeStyle = 'rgba(190,220,150,0.45)'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(0, r * 0.9); ctx.lineTo(0, -r * 0.9); ctx.stroke()
      ctx.restore()
    }
  }),

  // upright sword leaves (snake plant, flax)
  blade: () => cv(256, 256, (ctx, w, h) => {
    for (let i = 0; i < 16; i++) {
      const x = 16 + (i / 16) * (w - 32) + hash(i) * 8
      const lean = (hash(i * 3) - 0.5) * 48
      const top = 16 + hash(i * 5) * 70
      const bw = 7 + hash(i * 7) * 7
      const g = ctx.createLinearGradient(x, h, x + lean, top)
      g.addColorStop(0, `hsl(${100 + hash(i) * 20}, 40%, ${14 + hash(i * 2) * 8}%)`)
      g.addColorStop(1, `hsl(${92 + hash(i * 4) * 26}, 46%, ${30 + hash(i * 6) * 14}%)`)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(x - bw, h)
      ctx.quadraticCurveTo(x - bw * 0.5 + lean * 0.5, (h + top) / 2, x + lean, top)
      ctx.quadraticCurveTo(x + bw * 0.5 + lean * 0.5, (h + top) / 2, x + bw, h)
      ctx.closePath(); ctx.fill()
    }
  }),

  // grass tuft for lawns and bed edges
  tuft: () => cv(128, 128, (ctx, w, h) => {
    for (let i = 0; i < 26; i++) {
      const x = 6 + hash(i) * (w - 12)
      const lean = (hash(i * 3) - 0.5) * 34
      const top = 18 + hash(i * 5) * 62
      ctx.strokeStyle = `hsl(${88 + hash(i) * 26}, ${38 + hash(i * 2) * 20}%, ${18 + hash(i * 4) * 18}%)`
      ctx.lineWidth = 2.6 + hash(i * 7) * 2
      ctx.beginPath(); ctx.moveTo(x, h)
      ctx.quadraticCurveTo(x + lean * 0.4, (h + top) / 2, x + lean, top)
      ctx.stroke()
    }
  }),

  // a blossom card: five petals, used for every flower bed
  blossom: () => cv(128, 128, (ctx, w, h) => {
    const cx = w / 2, cy = h / 2
    ctx.fillStyle = '#ffffff'
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      ctx.save(); ctx.translate(cx + Math.cos(a) * 24, cy + Math.sin(a) * 24); ctx.rotate(a)
      ctx.beginPath(); ctx.ellipse(0, 0, 26, 19, 0, 0, 7); ctx.fill(); ctx.restore()
    }
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 20)
    g.addColorStop(0, '#ffe68a'); g.addColorStop(0.55, '#f6c445'); g.addColorStop(1, 'rgba(246,196,69,0)')
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 20, 0, 7); ctx.fill()
  }),
}

/** Crossed quads: two (or three) planes through the same axis so a card reads from any angle. */
function crossGeo(w, h, planes = 2, lift = true) {
  const parts = []
  for (let i = 0; i < planes; i++) {
    const g = new THREE.PlaneGeometry(w, h, 1, 3)
    if (lift) g.translate(0, h / 2, 0)
    g.rotateY((i / planes) * Math.PI)
    parts.push(g)
  }
  if (parts.length === 1) return parts[0]
  const merged = mergeGeometries(parts, false)
  parts.forEach((g) => g.dispose())
  return merged
}
const geoCache = new Map()
const cross = (w, h, planes = 2, lift = true) => {
  const k = `${w}|${h}|${planes}|${lift}`
  if (!geoCache.has(k)) geoCache.set(k, crossGeo(w, h, planes, lift))
  return geoCache.get(k)
}

// A frond: a plane bent downward along its length so the crown arcs instead of sticking out flat.
function frondGeo() {
  if (geoCache.has('frond')) return geoCache.get('frond')
  const g = new THREE.PlaneGeometry(0.72, 2.6, 2, 10)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const t = (p.getY(i) + 1.3) / 2.6 // 0 at the base, 1 at the tip
    p.setZ(i, -Math.pow(t, 2.1) * 1.15) // droop
    p.setX(i, p.getX(i) * (1 - t * 0.25))
  }
  g.rotateX(-Math.PI / 2)
  g.translate(0, 0, -1.3)
  g.computeVertexNormals()
  geoCache.set('frond', g)
  return g
}

export { Palms, PalmTree } from './flora/Palms.jsx'

const POTS = {
  monstera: { card: 'monstera', leaves: 9, size: 0.62, spread: 0.3, lift: 0.55, pot: '#cf7f4e', planes: 1, tilt: 0.75 },
  fiddle: { card: 'broad', leaves: 7, size: 0.78, spread: 0.26, lift: 0.75, pot: '#e4ded2', planes: 2, tilt: 0.3 },
  areca: { card: 'frond', leaves: 10, size: 0.95, spread: 0.2, lift: 0.5, pot: '#9aa0a6', planes: 1, tilt: 0.55 },
  snake: { card: 'blade', leaves: 4, size: 0.9, spread: 0.1, lift: 0.1, pot: '#2d3136', planes: 2, tilt: 0.06 },
  fern: { card: 'tuft', leaves: 7, size: 0.72, spread: 0.2, lift: 0.3, pot: '#b9b2a4', planes: 2, tilt: 0.5 },
}

/**
 * A realistic potted plant: a glazed pot, dark soil and alpha-cut foliage. Kinds:
 * monstera, fiddle (fiddle-leaf fig), areca (palm), snake, fern.
 */

/** a single bent, cupped leaf blade: length along +x, width along z, drooping toward -y; uv u=across, v=along */
const bladeCache = new Map()
function bladeGeo(len, wid, bend, cup) {
  const k = [len, wid, bend, cup].join('|')
  if (bladeCache.has(k)) return bladeCache.get(k)
  const SEG = 7, pos = [], uv = [], idx = []
  for (let i = 0; i <= SEG; i++) for (let j = 0; j <= 2; j++) {
    const t = i / SEG, u = j / 2
    pos.push(t * len, -bend * t * t - cup * Math.pow(2 * (u - 0.5), 2) * 0.5 * Math.sin(Math.PI * Math.min(1, t * 1.2)), (u - 0.5) * wid * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, 0.15 + t * 0.9))))
    uv.push(u, t)
  }
  for (let i = 0; i < SEG; i++) for (let j = 0; j < 2; j++) { const a = i * 3 + j; idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4) }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx)
  g.computeVertexNormals()
  bladeCache.set(k, g)
  return g
}
let petioleMat
const getPetiole = () => (petioleMat ||= new THREE.MeshStandardMaterial({ color: '#5b6a38', roughness: 0.7 }))
let woodMat
const getTrunk = () => (woodMat ||= new THREE.MeshStandardMaterial({ color: '#6b5a44', roughness: 0.9 }))
const LEAF = {
  fiddle: { tex: 'fiddleLeaf', rough: 0.45, trunk: true },
  monstera: { tex: 'monstera', rough: 0.5 },
  snake: { tex: 'sword', rough: 0.55 },
}
const arecaCache = new Map()
const arecaGeo = (v) => { if (!arecaCache.has(v)) arecaCache.set(v, buildPalm('areca', 300 + v * 11, 0)); return arecaCache.get(v) }

export function PottedPlant({ position, kind = 'monstera', scale = 1, yaw = 0, pot: potColor }) {
  const cfg = POTS[kind] || POTS.monstera
  const arecaV = Math.floor(hash(position[0] * 1.3 + position[2] * 2.1) * 3)
  useFrame((st) => { if (kind === 'areca') tickWind(st.clock.elapsedTime) })
  const potMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: potColor || cfg.pot, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 }), [potColor, cfg.pot])
  const soil = useMemo(() => surface('soil', 0.4, 0.4), [])
  const leafMat = useMemo(() => (LEAF[kind] ? foliageMat(LEAF[kind].tex, { roughness: LEAF[kind].rough }) : foliageMat(cfg.card)), [cfg.card, kind])
  const plan = useMemo(() => {
    const out = [], H = (n) => hash(position[0] * 3.7 + position[2] * 1.9 + n * 13.1)
    if (kind === 'fiddle') {
      for (let i = 0; i < 16; i++) {
        const t = i / 15
        out.push({ at: [0, 0.38 + t * 0.62, 0], az: i * 2.39996 + H(i), pet: 0.05, pe: 0.5, el: 0.35 + (1 - t) * 0.45 + H(i + 40) * 0.3, len: 0.34 - t * 0.06 + H(i + 20) * 0.07, wid: 0.3, bend: 0.07 + H(i + 5) * 0.05, cup: 0.03 })
      }
    } else if (kind === 'monstera') {
      for (let i = 0; i < 9; i++) {
        const pe = 0.95 + H(i) * 0.5
        out.push({ at: [0, 0, 0], az: i * 2.39996 + H(i + 9), pet: 0.32 + H(i + 3) * 0.3, pe, el: -0.15 + H(i + 7) * 0.55, len: 0.36 + H(i + 11) * 0.1, wid: 0.36 + H(i + 13) * 0.08, bend: 0.1, cup: 0.04 })
      }
    } else if (kind === 'snake') {
      for (let i = 0; i < 9; i++) out.push({ at: [Math.cos(i * 2.4) * 0.03, 0, Math.sin(i * 2.4) * 0.03], az: i * 2.39996, pet: 0, pe: 0, el: 1.25 + H(i) * 0.3, len: 0.55 + H(i + 4) * 0.28, wid: 0.075, bend: 0.06 + H(i + 6) * 0.08, cup: 0 })
    }
    return out
  }, [kind, position[0], position[2]]) // eslint-disable-line react-hooks/exhaustive-deps
  const leaves = useMemo(() => Array.from({ length: cfg.leaves }, (_, i) => {
    const a = yaw + (i / cfg.leaves) * Math.PI * 2 + hash(i * 3) * 0.6
    const up = cfg.lift + hash(i * 7) * 0.5
    return { a, up, tilt: cfg.tilt * (0.6 + hash(i * 5) * 0.8), s: (0.75 + hash(i * 11) * 0.5) }
  }), [cfg, yaw])
  const S = scale
  const r = 0.26 * S
  return (
    <RigidBody type="fixed" colliders={false} position={position} userData={{ noBatch: true }}>
      <CylinderCollider args={[0.32 * S, r * 1.08]} position={[0, 0.32 * S, 0]} />
      <mesh position={[0, 0.3 * S, 0]} material={potMat} castShadow receiveShadow><cylinderGeometry args={[r, r * 0.74, 0.6 * S, 24, 1]} /></mesh>
      <mesh position={[0, 0.61 * S, 0]} rotation={[Math.PI / 2, 0, 0]} material={potMat} castShadow><torusGeometry args={[r, 0.022 * S, 8, 26]} /></mesh>
      <mesh position={[0, 0.585 * S, 0]} rotation={[-Math.PI / 2, 0, 0]} material={soil}><circleGeometry args={[r * 0.96, 22]} /></mesh>
      {kind === 'areca' && [0, 1, 2, 3].map((k) => {
        const a = k * 1.9 + hash(position[0] + k * 3.1) * 1.2
        const rr = k === 0 ? 0 : 0.09 * S
        const g = arecaGeo((arecaV + k) % 3)
        return (
          <group key={k} position={[Math.cos(a) * rr, 0.585 * S, Math.sin(a) * rr]} rotation={[0, a * 2.3 + yaw, 0]} scale={S * (k === 0 ? 1.0 : 0.7 + hash(k * 5.7 + position[2]) * 0.25)}>
            <mesh geometry={g.trunk} material={floraMats.bark('coconut')} castShadow />
            <mesh geometry={g.crown} material={floraMats.leaflet()} customDepthMaterial={floraMats.depth(floraMats.leaflet())} castShadow />
          </group>
        )
      })}
      {kind !== 'areca' && LEAF[kind] && (
        <group position={[0, 0.585 * S, 0]} scale={S}>
          {plan.map((e, i) => (
            <group key={i} position={e.at} rotation={[0, e.az, 0]}>
              {e.pet > 0 && <mesh position={[(e.pet / 2) * Math.cos(e.pe), (e.pet / 2) * Math.sin(e.pe), 0]} rotation={[0, 0, e.pe - Math.PI / 2]} material={getPetiole()} castShadow><cylinderGeometry args={[0.006, 0.01, e.pet, 5]} /></mesh>}
              <group position={[e.pet * Math.cos(e.pe), e.pet * Math.sin(e.pe), 0]} rotation={[0, 0, e.el]}>
                <mesh geometry={bladeGeo(e.len, e.wid, e.bend, e.cup)} material={leafMat} castShadow />
              </group>
            </group>
          ))}
          {LEAF[kind].trunk && <mesh position={[0, 0.5, 0]} material={getTrunk()} castShadow><cylinderGeometry args={[0.012, 0.022, 1.0, 7]} /></mesh>}
        </group>
      )}
      {kind !== 'areca' && !LEAF[kind] && leaves.map((l, i) => (
        <mesh key={'s' + i} position={[Math.cos(l.a) * cfg.spread * 0.4 * S, (0.58 + l.up * 0.5) * S, Math.sin(l.a) * cfg.spread * 0.4 * S]} rotation={[Math.sin(l.a) * l.tilt * 0.5, 0, -Math.cos(l.a) * l.tilt * 0.5]} material={getStem()}>
          <cylinderGeometry args={[0.012 * S, 0.018 * S, l.up * S, 5]} />
        </mesh>
      ))}
      {kind !== 'areca' && !LEAF[kind] && leaves.map((l, i) => (
        <mesh key={i} geometry={cross(cfg.size * l.s * S, cfg.size * l.s * S * 1.15, cfg.planes, true)} material={leafMat} position={[Math.cos(l.a) * cfg.spread * S, (0.6 + l.up) * S, Math.sin(l.a) * cfg.spread * S]} rotation={[l.tilt * 0.9, -l.a, 0, 'YXZ']} castShadow />
      ))}
    </RigidBody>
  )
}
let stemMat
const getStem = () => (stemMat ||= new THREE.MeshStandardMaterial({ color: '#4c6b2e', roughness: 0.85 }))

/** A clipped hedge: a solid core wrapped in foliage cards so the surface reads as leaves. */
export function Hedge({ position, size = [4, 1.1, 0.8], yaw = 0 }) {
  const [w, h, d] = size
  const core = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1d3317', roughness: 0.95 }), [])
  const leaf = useMemo(() => foliageMat('broad'), [])
  const cards = useMemo(() => {
    const out = []
    const n = Math.max(6, Math.round(w * d * 9))
    for (let i = 0; i < n; i++) {
      out.push([(hash(i) - 0.5) * w, h * (0.15 + hash(i * 3) * 0.9), (hash(i * 7) - 0.5) * d, hash(i * 5) * 6])
    }
    return out
  }, [w, h, d])
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[w / 2, h / 2, d / 2]} position={[0, h / 2, 0]} />
      <mesh position={[0, h / 2, 0]} material={core} castShadow receiveShadow><boxGeometry args={[w - 0.12, h - 0.1, d - 0.12]} /></mesh>
      {cards.map(([x, y, z, a], i) => (
        <mesh key={i} geometry={cross(0.42, 0.42, 2, false)} material={leaf} position={[x, y, z]} rotation={[0, a, hash(i * 11) * 0.8]} castShadow />
      ))}
    </RigidBody>
  )
}

export { foliageMat, foliageTex, cross as foliageCard }
