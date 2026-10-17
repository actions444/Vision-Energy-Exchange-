import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { nightLit } from '../state/environment.js'

// Original body designs for the Vision Motors lineup. Chassis axes: forward +x, up +y, right +z;
// the origin sits a little above the ground. Everything is built from boxes and a few cylinders so a
// whole lot of vehicles stays cheap to draw. No real-brand shapes, grilles or badges.

export function useBodyMats(paint, accent, tailRef) {
  const mats = useMemo(() => ({
    body: new THREE.MeshPhysicalMaterial({ color: paint, roughness: 0.22, metalness: 0.75, clearcoat: 1, clearcoatRoughness: 0.08 }),
    trim: new THREE.MeshStandardMaterial({ color: accent, roughness: 0.3, metalness: 1 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#d6d8dc', roughness: 0.15, metalness: 1 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#0d1116', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.55 }),
    head: nightLit(new THREE.MeshStandardMaterial({ color: '#e9eef5', emissive: '#fff6e0', roughness: 0.1 }), 3, 0.25),
    drl: nightLit(new THREE.MeshStandardMaterial({ color: accent, emissive: accent, roughness: 0.2 }), 2.2, 0.9),
    tail: new THREE.MeshStandardMaterial({ color: '#4a0608', emissive: '#ff1a1a', emissiveIntensity: 0.4, roughness: 0.3 }),
    plastic: new THREE.MeshStandardMaterial({ color: '#16171a', roughness: 0.8 }),
    interior: new THREE.MeshStandardMaterial({ color: '#2a2220', roughness: 0.7 }),
    leather: new THREE.MeshStandardMaterial({ color: '#c9b79a', roughness: 0.6 }),
    accentSeat: new THREE.MeshStandardMaterial({ color: '#b8352b', roughness: 0.55 }),
    screen: nightLit(new THREE.MeshStandardMaterial({ color: '#0b1a2a', emissive: '#3fb2ff', roughness: 0.2 }), 1.6, 0.8),
  }), [paint, accent])
  useEffect(() => { if (tailRef) tailRef.current = mats.tail }, [mats, tailRef])
  return mats
}

const box = (key, mat, pos, size, rot) => <mesh key={key} position={pos} rotation={rot} material={mat} castShadow><boxGeometry args={size} /></mesh>
const cyl = (key, mat, pos, r, len, rot) => <mesh key={key} position={pos} rotation={rot} material={mat} castShadow><cylinderGeometry args={[r, r, len, 14]} /></mesh>
const seatSet = (parts, m, xs, y, wide, mat) => xs.forEach((x, i) => {
  parts.push(box('sb' + i, mat || m.interior, [x, y, 0], [0.5, 0.12, wide]))
  parts.push(box('sr' + i, mat || m.interior, [x - 0.28, y + 0.3, 0], [0.1, 0.55, wide], [0, 0, -0.18]))
})
const wrap = (parts) => <group userData={{ noBatch: true }}>{parts}</group>

/** Three-row crossover: smooth nose, long glasshouse, tapered tail, roof rails. */
export function CrossoverBody({ T, paint, accent, tailRef }) {
  const m = useBodyMats(paint, accent, tailRef)
  const Lh = T.length / 2, Wh = T.width / 2
  const p = []
  p.push(box('lo', m.body, [0, 0.88, 0], [T.length, 0.7, T.width]))
  p.push(box('hood', m.body, [Lh - 0.8, 1.26, 0], [1.7, 0.08, T.width - 0.08], [0, 0, -0.07]))
  p.push(box('cab', m.body, [-0.45, 1.58, 0], [2.6, 0.62, T.width - 0.16]))
  p.push(box('roof', m.body, [-0.55, 1.92, 0], [2.5, 0.05, T.width - 0.26]))
  p.push(box('rails', m.chrome, [-0.55, 1.97, 0.72], [2.3, 0.03, 0.04]), box('rails2', m.chrome, [-0.55, 1.97, -0.72], [2.3, 0.03, 0.04]))
  p.push(box('ws', m.glass, [0.95, 1.55, 0], [0.04, 0.78, T.width - 0.28], [0, 0, 0.62]))
  p.push(box('rw', m.glass, [-1.85, 1.5, 0], [0.04, 0.8, T.width - 0.34], [0, 0, -0.55]))
  ;[-1, 1].forEach((k) => {
    p.push(box('sw' + k, m.glass, [-0.5, 1.6, k * (Wh - 0.075)], [2.5, 0.42, 0.02]))
    p.push(box('pil' + k, m.plastic, [-0.5, 1.6, k * (Wh - 0.07)], [0.07, 0.46, 0.03]))
    p.push(box('hl' + k, m.head, [Lh + 0.008, 1.05, k * (Wh - 0.36)], [0.02, 0.07, 0.56]))
    p.push(box('hx' + k, m.head, [Lh + 0.008, 0.9, k * (Wh - 0.3)], [0.02, 0.05, 0.3]))
    p.push(box('tl' + k, m.tail, [-Lh - 0.01, 1.12, k * (Wh - 0.2)], [0.02, 0.1, 0.5]))
    p.push(box('mr' + k, m.body, [0.9, 1.4, k * (Wh + 0.1)], [0.18, 0.14, 0.2]))
    p.push(box('dh' + k, m.chrome, [0.4, 1.2, k * (Wh + 0.005)], [0.2, 0.025, 0.02]))
    p.push(box('dh2' + k, m.chrome, [-0.65, 1.2, k * (Wh + 0.005)], [0.2, 0.025, 0.02]))
    p.push(box('clad' + k, m.plastic, [T.wheelBase / 2, 0.66, k * (Wh + 0.015)], [1.0, 0.1, 0.05]))
    p.push(box('clad2' + k, m.plastic, [-T.wheelBase / 2, 0.66, k * (Wh + 0.015)], [1.0, 0.1, 0.05]))
    p.push(box('sill' + k, m.plastic, [0, 0.52, k * (Wh + 0.015)], [2.0, 0.07, 0.06]))
  })
  p.push(box('gr', m.chrome, [Lh + 0.006, 0.82, 0], [0.02, 0.24, 1.15]))
  p.push(box('grb', m.plastic, [Lh + 0.01, 0.82, 0], [0.01, 0.2, 1.05]))
  p.push(box('drl', m.drl, [Lh + 0.01, 1.1, 0], [0.01, 0.02, T.width - 0.9]))
  p.push(box('tb', m.tail, [-Lh - 0.01, 1.14, 0], [0.02, 0.025, T.width - 0.7]))
  p.push(box('bump', m.plastic, [Lh - 0.06, 0.6, 0], [0.2, 0.2, T.width + 0.02]))
  p.push(box('bumpR', m.plastic, [-Lh + 0.06, 0.6, 0], [0.2, 0.2, T.width + 0.02]))
  p.push(box('skid', m.trim, [Lh - 0.03, 0.52, 0], [0.04, 0.05, 0.9]))
  seatSet(p, m, [0.1, -0.85, -1.6], 0.9, T.width - 0.5)
  return wrap(p)
}

/** Ultra-luxury saloon: long bonnet, tall upright grille with a diamond ornament, round lamps, rear-hinged rear doors. */
export function LimoBody({ T, paint, accent, tailRef }) {
  const m = useBodyMats(paint, accent, tailRef)
  const Lh = T.length / 2, Wh = T.width / 2
  const p = []
  p.push(box('lo', m.body, [0, 0.86, 0], [T.length, 0.72, T.width]))
  p.push(box('hood', m.body, [Lh - 1.2, 1.26, 0], [2.4, 0.08, T.width - 0.06]))
  p.push(box('cab', m.body, [-0.4, 1.52, 0], [2.7, 0.5, T.width - 0.2]))
  p.push(box('roof', m.trim, [-0.45, 1.79, 0], [2.4, 0.05, T.width - 0.3]))
  p.push(box('ws', m.glass, [1.0, 1.52, 0], [0.04, 0.58, T.width - 0.3], [0, 0, 0.78]))
  p.push(box('rw', m.glass, [-1.7, 1.5, 0], [0.04, 0.55, T.width - 0.34], [0, 0, -0.8]))
  p.push(box('belt', m.chrome, [0, 1.24, 0], [T.length - 0.3, 0.025, T.width + 0.012]))
  // tall chrome grille with slats, and a diamond ornament on top
  p.push(box('gr', m.chrome, [Lh + 0.012, 1.0, 0], [0.04, 0.64, 0.92]))
  ;[0.82, 0.92, 1.02, 1.12, 1.22].forEach((y) => p.push(box('sl' + y, m.plastic, [Lh + 0.034, y - 0.0, 0], [0.01, 0.05, 0.84])))
  p.push(<mesh key="orn" position={[Lh + 0.02, 1.36, 0]} material={m.chrome} scale={[0.5, 1, 0.5]}><octahedronGeometry args={[0.07]} /></mesh>)
  ;[-1, 1].forEach((k) => {
    p.push(<mesh key={'hl' + k} position={[Lh + 0.012, 1.1, k * (Wh - 0.28)]} rotation={[0, 0, Math.PI / 2]} material={m.head}><cylinderGeometry args={[0.13, 0.13, 0.04, 20]} /></mesh>)
    p.push(box('sw' + k, m.glass, [-0.4, 1.56, k * (Wh - 0.1)], [2.4, 0.34, 0.02]))
    p.push(box('p1' + k, m.plastic, [0.2, 1.52, k * (Wh - 0.095)], [0.05, 0.4, 0.02]))
    p.push(box('p2' + k, m.plastic, [-1.0, 1.52, k * (Wh - 0.095)], [0.05, 0.4, 0.02]))
    p.push(box('seam' + k, m.plastic, [-0.48, 0.92, k * (Wh + 0.004)], [0.02, 0.5, 0.01]))
    p.push(box('fseam' + k, m.plastic, [0.55, 0.92, k * (Wh + 0.004)], [0.02, 0.5, 0.01]))
    p.push(box('dh' + k, m.chrome, [-0.2, 1.12, k * (Wh + 0.006)], [0.2, 0.025, 0.02]))
    p.push(box('mr' + k, m.body, [0.82, 1.3, k * (Wh + 0.08)], [0.16, 0.12, 0.16]))
    p.push(box('tl' + k, m.tail, [-Lh - 0.01, 1.08, k * (Wh - 0.16)], [0.02, 0.32, 0.12]))
    p.push(box('sp' + k, m.chrome, [0, 0.5, k * (Wh + 0.01)], [3.0, 0.03, 0.03]))
  })
  p.push(box('bump', m.chrome, [Lh - 0.04, 0.6, 0], [0.12, 0.14, T.width + 0.02]))
  p.push(box('bumpR', m.chrome, [-Lh + 0.04, 0.6, 0], [0.12, 0.14, T.width + 0.02]))
  seatSet(p, m, [0.55, -0.9], 0.8, T.width - 0.5)
  seatSet(p, m, [-1.5], 0.8, T.width - 0.5, m.leather)
  return wrap(p)
}

/** Electric sedan: closed smooth nose with a light bar, full glass roof, fastback tail, flush handles. */
export function EvBody({ T, paint, accent, tailRef }) {
  const m = useBodyMats(paint, accent, tailRef)
  const Lh = T.length / 2, Wh = T.width / 2
  const p = []
  p.push(box('lo', m.body, [0, 0.78, 0], [T.length, 0.52, T.width]))
  p.push(box('nose', m.body, [Lh - 0.45, 0.95, 0], [1.0, 0.2, T.width - 0.1], [0, 0, -0.16]))
  p.push(box('hood', m.body, [Lh - 1.0, 1.04, 0], [1.4, 0.05, T.width - 0.14], [0, 0, -0.1]))
  p.push(box('cab', m.body, [-0.35, 1.25, 0], [2.4, 0.38, T.width - 0.2]))
  p.push(box('roof', m.glass, [-0.38, 1.46, 0], [2.0, 0.03, T.width - 0.36]))
  p.push(box('ws', m.glass, [0.9, 1.22, 0], [0.04, 0.62, T.width - 0.3], [0, 0, 0.88]))
  p.push(box('rw', m.glass, [-1.55, 1.2, 0], [0.04, 0.7, T.width - 0.34], [0, 0, -0.85]))
  p.push(box('tail', m.body, [-Lh + 0.35, 0.98, 0], [0.8, 0.14, T.width - 0.1], [0, 0, 0.14]))
  p.push(box('spoil', m.plastic, [-Lh + 0.12, 1.1, 0], [0.18, 0.025, T.width - 0.4]))
  p.push(box('bar', m.drl, [Lh - 0.02, 0.92, 0], [0.01, 0.025, T.width - 0.35]))
  p.push(box('tbar', m.tail, [-Lh - 0.005, 1.0, 0], [0.02, 0.04, T.width - 0.25]))
  p.push(box('splitter', m.plastic, [Lh - 0.02, 0.5, 0], [0.12, 0.05, T.width - 0.2]))
  p.push(box('diff', m.plastic, [-Lh + 0.02, 0.52, 0], [0.12, 0.08, T.width - 0.5]))
  p.push(box('dash', m.screen, [0.7, 1.0, 0], [0.04, 0.2, 0.55], [0, 0.25, 0]))
  ;[-1, 1].forEach((k) => {
    p.push(box('hl' + k, m.head, [Lh - 0.2, 0.98, k * (Wh - 0.28)], [0.18, 0.02, 0.36], [0, 0, -0.16]))
    p.push(box('sw' + k, m.glass, [-0.38, 1.28, k * (Wh - 0.09)], [2.1, 0.28, 0.02]))
    p.push(box('mr' + k, m.plastic, [0.72, 1.08, k * (Wh + 0.06)], [0.12, 0.08, 0.14]))
    p.push(box('dh' + k, m.chrome, [-0.1, 1.0, k * (Wh + 0.003)], [0.2, 0.012, 0.01]))
    p.push(box('skirt' + k, m.plastic, [0, 0.5, k * (Wh - 0.02)], [2.4, 0.05, 0.05]))
  })
  p.push(box('seat1', m.interior, [-0.1, 0.74, -0.42], [0.5, 0.12, 0.5]))
  p.push(box('seat2', m.interior, [-0.1, 0.74, 0.42], [0.5, 0.12, 0.5]))
  p.push(box('sr1', m.interior, [-0.38, 1.04, -0.42], [0.1, 0.5, 0.5], [0, 0, -0.2]))
  p.push(box('sr2', m.interior, [-0.38, 1.04, 0.42], [0.1, 0.5, 0.5], [0, 0, -0.2]))
  seatSet(p, m, [-1.1], 0.74, T.width - 0.5)
  return wrap(p)
}

/** Three-wheel open roadster: wide cycle fenders over the front wheels, a narrow tub, a roll hoop. */
export function SlingBody({ T, paint, accent, tailRef }) {
  const m = useBodyMats(paint, accent, tailRef)
  const Lh = T.length / 2, Wh = T.width / 2
  const L = T.wheelBase / 2, W = T.track / 2
  const p = []
  p.push(box('tub', m.body, [0.0, 0.66, 0], [3.1, 0.34, 1.12]))
  p.push(box('nose', m.body, [Lh - 0.55, 0.7, 0], [1.2, 0.26, 0.82]))
  p.push(box('hood', m.body, [0.9, 0.86, 0], [1.4, 0.06, 0.9], [0, 0, -0.06]))
  p.push(box('tailh', m.body, [-1.0, 0.86, 0], [1.1, 0.32, 0.72]))
  p.push(box('tailc', m.body, [-1.55, 0.78, 0], [0.9, 0.22, 0.44]))
  p.push(box('cowl', m.body, [-0.7, 0.88, 0], [0.5, 0.14, 1.0]))
  p.push(box('ws', m.glass, [0.38, 1.02, 0], [0.03, 0.34, 1.3], [0, 0, 0.55]))
  p.push(box('hoop', m.plastic, [-0.8, 1.08, -0.5], [0.06, 0.55, 0.06]), box('hoop2', m.plastic, [-0.8, 1.08, 0.5], [0.06, 0.55, 0.06]))
  p.push(box('bar', m.chrome, [-0.8, 1.36, 0], [0.06, 0.06, 1.06]))
  ;[-1, 1].forEach((k) => {
    p.push(box('ff' + k, m.body, [L, 0.62, k * W], [1.1, 0.07, 0.4]))
    p.push(box('fa' + k, m.body, [L + 0.5, 0.5, k * W], [0.08, 0.2, 0.4], [0, 0, 0.5]))
    p.push(box('arm' + k, m.plastic, [L - 0.2, 0.46, k * (W / 2 + 0.2)], [0.06, 0.06, W - 0.45]))
    p.push(<mesh key={'hl' + k} position={[Lh - 0.06, 0.82, k * 0.34]} rotation={[0, 0, Math.PI / 2]} material={m.head}><cylinderGeometry args={[0.11, 0.11, 0.04, 18]} /></mesh>)
    p.push(box('drl' + k, m.drl, [Lh - 0.03, 0.7, k * 0.52], [0.02, 0.025, 0.2]))
    p.push(box('tl' + k, m.tail, [-Lh + 0.02, 0.85, k * 0.2], [0.02, 0.05, 0.25]))
    p.push(cyl('ex' + k, m.chrome, [-0.2, 0.46, k * 0.62], 0.04, 1.5, [0, 0, Math.PI / 2]))
    p.push(box('seat' + k, m.interior, [-0.2, 0.7, k * 0.4], [0.5, 0.1, 0.5]))
    p.push(box('sb' + k, m.interior, [-0.46, 0.98, k * 0.4], [0.1, 0.5, 0.5], [0, 0, -0.18]))
    p.push(box('mr' + k, m.plastic, [0.4, 1.1, k * 0.7], [0.1, 0.08, 0.1]))
  })
  p.push(box('rf', m.body, [-L, 0.7, 0], [1.1, 0.07, 0.42]))
  p.push(box('arm3', m.plastic, [-L + 0.45, 0.4, 0], [0.9, 0.08, 0.12]))
  p.push(box('stripe', m.trim, [0.1, 0.84, 0], [2.6, 0.01, 0.1]))
  p.push(box('dash', m.plastic, [0.55, 0.84, 0], [0.18, 0.12, 1.0]))
  return wrap(p)
}

/** Fork, bars, lamp and front mudguard that turn with the front wheel (child 1 of the wheel group). */
export function BikeFront({ T, sport, mats }) {
  const r = T.wheelRadius
  const rake = 0.3
  const top = r + 0.62
  const out = []
  ;[-1, 1].forEach((k) => {
    out.push(<mesh key={'f' + k} position={[-rake / 2, top / 2, k * 0.1]} rotation={[0, 0, rake / top]} material={mats.chrome} castShadow><cylinderGeometry args={[0.03, 0.03, Math.hypot(top, rake), 8]} /></mesh>)
  })
  out.push(<mesh key="yoke" position={[-rake, top, 0]} material={mats.plastic}><boxGeometry args={[0.1, 0.07, 0.28]} /></mesh>)
  // bars
  if (sport) {
    out.push(<mesh key="bar" position={[-rake - 0.04, top - 0.04, 0]} rotation={[0, 0, 0.1]} material={mats.chrome}><cylinderGeometry args={[0.018, 0.018, 0.5, 8]} /></mesh>)
    out.push(<mesh key="barr" position={[-rake - 0.04, top - 0.04, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.chrome}><cylinderGeometry args={[0.018, 0.018, 0.5, 8]} /></mesh>)
  } else {
    ;[-1, 1].forEach((k) => out.push(<mesh key={'b' + k} position={[-rake - 0.2, top + 0.14, k * 0.34]} rotation={[0.2, 0, 0]} material={mats.chrome} castShadow><cylinderGeometry args={[0.02, 0.02, 0.5, 8]} /></mesh>))
    out.push(<mesh key="bar" position={[-rake - 0.12, top + 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.chrome} castShadow><cylinderGeometry args={[0.02, 0.02, 0.72, 8]} /></mesh>)
  }
  // lamp
  out.push(<mesh key="lamp" position={[0.04, top - 0.12, 0]} scale={[0.6, 1, 1]} material={mats.head}><sphereGeometry args={[0.13, 14, 10]} /></mesh>)
  out.push(<mesh key="fend" position={[0.0, r + 0.04, 0]} material={mats.body}><boxGeometry args={[sport ? 0.55 : 0.7, 0.03, 0.2]} /></mesh>)
  return <group>{out}</group>
}

/** Cruiser: long and low, big tank, V-twin, high bars, two exhaust pipes, a pillion pad. */
export function CruiserBody({ T, paint, accent, tailRef }) {
  const m = useBodyMats(paint, accent, tailRef)
  const p = []
  p.push(box('eng', m.plastic, [0.1, 0.4, 0], [0.7, 0.4, 0.36]))
  ;[-1, 1].forEach((k) => {
    p.push(<mesh key={'cy' + k} position={[0.3, 0.55, k * 0.24]} rotation={[0, 0, 0.5]} material={m.chrome} castShadow><cylinderGeometry args={[0.1, 0.1, 0.3, 14]} /></mesh>)
    p.push(<mesh key={'cy2' + k} position={[-0.05, 0.56, k * 0.24]} rotation={[0, 0, -0.5]} material={m.chrome} castShadow><cylinderGeometry args={[0.1, 0.1, 0.3, 14]} /></mesh>)
    p.push(cyl('ex' + k, m.chrome, [-0.5, 0.26, k * 0.26], 0.05, 1.3, [0, 0, Math.PI / 2 - 0.06]))
    p.push(box('sb' + k, m.plastic, [-0.62, 0.28, k * 0.09], [0.9, 0.04, 0.04]))
    p.push(box('sa' + k, m.chrome, [-0.2, 0.58, k * 0.3], [0.04, 0.04, 0.04]))
  })
  p.push(<mesh key="tank" position={[0.3, 0.82, 0]} scale={[0.62, 0.28, 0.3]} material={m.body} castShadow><sphereGeometry args={[1, 18, 12]} /></mesh>)
  p.push(box('stripe', m.trim, [0.3, 1.0, 0], [0.5, 0.01, 0.07]))
  p.push(box('seat', m.interior, [-0.3, 0.7, 0], [0.8, 0.1, 0.34]))
  p.push(box('pad', m.interior, [-0.82, 0.76, 0], [0.4, 0.1, 0.3]))
  p.push(box('bk', m.interior, [-0.62, 0.8, 0], [0.04, 0.2, 0.3]))
  p.push(box('rfend', m.body, [-1.0, 0.56, 0], [0.7, 0.03, 0.22], [0, 0, 0.18]))
  p.push(box('tl', m.tail, [-1.3, 0.54, 0], [0.04, 0.05, 0.16]))
  p.push(box('chain', m.plastic, [-0.55, 0.3, 0.13], [1.1, 0.02, 0.02]))
  return wrap(p)
}

/** Sport bike: full fairing, low screen, clip-on bars, a tail cowl and a belly pan. */
export function SportBikeBody({ T, paint, accent, tailRef }) {
  const m = useBodyMats(paint, accent, tailRef)
  const p = []
  p.push(box('eng', m.plastic, [0.05, 0.4, 0], [0.65, 0.4, 0.32]))
  p.push(box('belly', m.body, [0.1, 0.28, 0], [0.9, 0.12, 0.34], [0, 0, 0.1]))
  p.push(box('nose', m.body, [0.62, 0.7, 0], [0.7, 0.36, 0.36], [0, 0, -0.35]))
  p.push(box('fair', m.body, [0.4, 0.62, 0], [0.5, 0.5, 0.42]))
  ;[-1, 1].forEach((k) => {
    p.push(box('fl' + k, m.trim, [0.45, 0.55, k * 0.22], [0.5, 0.16, 0.02], [0, 0, 0.2]))
    p.push(box('sb' + k, m.chrome, [-0.5, 0.42, k * 0.16], [0.5, 0.05, 0.05]))
  })
  p.push(box('tank', m.body, [0.0, 0.9, 0], [0.6, 0.2, 0.3], [0, 0, 0.08]))
  p.push(box('scr', m.glass, [0.62, 1.02, 0], [0.04, 0.3, 0.3], [0, 0, 0.7]))
  p.push(box('seat', m.interior, [-0.38, 0.82, 0], [0.62, 0.09, 0.28]))
  p.push(box('cowl', m.body, [-0.78, 0.9, 0], [0.8, 0.14, 0.26], [0, 0, 0.14]))
  p.push(box('tl', m.tail, [-1.15, 0.94, 0], [0.04, 0.05, 0.2]))
  p.push(cyl('ex', m.chrome, [-0.75, 0.46, 0.2], 0.06, 0.8, [0, 0, Math.PI / 2 - 0.15]))
  p.push(box('swing', m.plastic, [-0.45, 0.28, 0.1], [0.9, 0.05, 0.05]))
  p.push(box('num', m.chrome, [0.82, 0.7, 0], [0.02, 0.16, 0.22]))
  return wrap(p)
}

/** Full-size electric luxury SUV: slab sides, flat roof, tall glasshouse, full-width light bar, blanked nose. */
export function EvSuvBody({ T, paint, accent, tailRef }) {
  const m = useBodyMats(paint, accent, tailRef)
  const Lh = T.length / 2, Wh = T.width / 2
  const p = []
  p.push(box('lo', m.body, [0, 0.92, 0], [T.length, 0.78, T.width]))
  p.push(box('hood', m.body, [Lh - 0.85, 1.36, 0], [1.7, 0.1, T.width - 0.06], [0, 0, -0.04]))
  p.push(box('cab', m.body, [-0.35, 1.72, 0], [3.4, 0.7, T.width - 0.14]))
  p.push(box('roof', m.body, [-0.4, 2.09, 0], [3.3, 0.05, T.width - 0.2]))
  p.push(box('roofglass', m.glass, [-0.4, 2.115, 0], [1.6, 0.01, T.width - 0.6]))
  p.push(box('ws', m.glass, [1.2, 1.72, 0], [0.04, 0.72, T.width - 0.24], [0, 0, 0.45]))
  p.push(box('rw', m.glass, [-2.05, 1.72, 0], [0.04, 0.72, T.width - 0.3], [0, 0, -0.22]))
  p.push(box('spoil', m.plastic, [-Lh + 0.05, 2.12, 0], [0.4, 0.04, T.width - 0.3]))
  ;[-1, 1].forEach((k) => {
    p.push(box('sw' + k, m.glass, [-0.35, 1.76, k * (Wh - 0.07)], [3.3, 0.5, 0.02]))
    p.push(box('p1' + k, m.plastic, [0.5, 1.76, k * (Wh - 0.065)], [0.07, 0.52, 0.03]))
    p.push(box('p2' + k, m.plastic, [-0.85, 1.76, k * (Wh - 0.065)], [0.07, 0.52, 0.03]))
    p.push(box('p3' + k, m.plastic, [-1.85, 1.76, k * (Wh - 0.065)], [0.09, 0.52, 0.03]))
    p.push(box('dh' + k, m.chrome, [0.15, 1.22, k * (Wh + 0.005)], [0.22, 0.025, 0.02]))
    p.push(box('dh2' + k, m.chrome, [-1.2, 1.22, k * (Wh + 0.005)], [0.22, 0.025, 0.02]))
    p.push(box('mr' + k, m.plastic, [1.05, 1.52, k * (Wh + 0.1)], [0.16, 0.14, 0.2]))
    p.push(box('hl' + k, m.head, [Lh + 0.008, 1.2, k * (Wh - 0.28)], [0.02, 0.06, 0.34]))
    p.push(box('hl2' + k, m.head, [Lh + 0.008, 0.92, k * (Wh - 0.3)], [0.02, 0.05, 0.26]))
    p.push(box('tl' + k, m.tail, [-Lh - 0.01, 1.3, k * (Wh - 0.15)], [0.02, 0.5, 0.1]))
    p.push(box('sill' + k, m.plastic, [0, 0.55, k * (Wh + 0.015)], [2.6, 0.08, 0.06]))
    p.push(box('arch' + k, m.plastic, [T.wheelBase / 2, 0.86, k * (Wh + 0.012)], [1.0, 0.04, 0.04]))
    p.push(box('arch2' + k, m.plastic, [-T.wheelBase / 2, 0.86, k * (Wh + 0.012)], [1.0, 0.04, 0.04]))
  })
  p.push(box('bar', m.drl, [Lh + 0.01, 1.3, 0], [0.012, 0.035, T.width - 0.28]))
  p.push(box('face', m.plastic, [Lh + 0.006, 1.0, 0], [0.012, 0.4, T.width - 0.5]))
  p.push(box('tbar', m.tail, [-Lh - 0.01, 1.52, 0], [0.02, 0.03, T.width - 0.3]))
  p.push(box('bump', m.plastic, [Lh - 0.06, 0.62, 0], [0.2, 0.2, T.width + 0.02]))
  p.push(box('bumpR', m.plastic, [-Lh + 0.06, 0.62, 0], [0.2, 0.2, T.width + 0.02]))
  p.push(box('skid', m.trim, [Lh - 0.03, 0.54, 0], [0.04, 0.05, 0.9]))
  p.push(box('dash', m.screen, [0.7, 1.12, 0], [0.04, 0.2, 0.8], [0, 0.25, 0]))
  seatSet(p, m, [0.0, -1.0, -1.7], 1.0, T.width - 0.5)
  return wrap(p)
}

/** Personal watercraft: a V-hull with a bow cap, a saddle, a steering mast and a rear boarding deck. */
export function JetSkiBody({ T, paint, accent, tailRef }) {
  const m = useBodyMats(paint, accent, tailRef)
  const wake = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false }), [])
  const p = []
  p.push(box('hull', m.body, [-0.1, 0.34, 0], [2.5, 0.3, 0.92]))
  p.push(box('bow', m.body, [1.2, 0.46, 0], [1.0, 0.2, 0.72], [0, 0, 0.32]))
  p.push(box('tip', m.body, [1.62, 0.5, 0], [0.5, 0.12, 0.44], [0, 0, 0.55]))
  p.push(box('deck', m.plastic, [-1.2, 0.5, 0], [0.9, 0.06, 0.78]))
  p.push(box('seat', m.interior, [-0.55, 0.62, 0], [1.2, 0.16, 0.42]))
  p.push(box('seatb', m.interior, [-1.1, 0.7, 0], [0.3, 0.2, 0.44]))
  p.push(box('console', m.body, [0.55, 0.66, 0], [0.7, 0.28, 0.62], [0, 0, 0.18]))
  p.push(box('mast', m.chrome, [0.55, 0.98, 0], [0.06, 0.4, 0.06], [0, 0, -0.25]))
  p.push(box('bars', m.plastic, [0.46, 1.16, 0], [0.08, 0.06, 0.72]))
  p.push(box('screen', m.glass, [0.82, 0.92, 0], [0.04, 0.3, 0.52], [0, 0, 0.7]))
  p.push(box('stripe', m.trim, [0, 0.5, 0], [2.4, 0.012, 0.12]))
  ;[-1, 1].forEach((k) => {
    p.push(box('rail' + k, m.trim, [-0.2, 0.52, k * 0.48], [1.9, 0.05, 0.05]))
    p.push(box('mir' + k, m.plastic, [0.7, 1.08, k * 0.4], [0.06, 0.06, 0.1]))
    p.push(box('side' + k, m.trim, [0.2, 0.36, k * 0.47], [1.9, 0.07, 0.015]))
  })
  p.push(box('lamp', m.head, [1.3, 0.5, 0], [0.03, 0.05, 0.3]))
  p.push(box('nozzle', m.plastic, [-1.65, 0.3, 0], [0.2, 0.2, 0.34]))
  p.push(<mesh key="wake" position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} material={wake} userData={{ noBatch: true }}><planeGeometry args={[3.6, 1.7]} /></mesh>)
  return wrap(p)
}

/** Open-top boxy off-roader: slab sides, flared arches, flat bonnet, roll hoop, spare wheel on the tailgate. */
export function OpenGBody({ T, paint, accent, tailRef }) {
  const m = useBodyMats(paint, accent, tailRef)
  const Lh = T.length / 2, Wh = T.width / 2
  const p = []
  p.push(box('lo', m.body, [0, 0.98, 0], [T.length - 0.3, 0.78, T.width - 0.22]))
  p.push(box('hood', m.body, [Lh - 0.75, 1.42, 0], [1.3, 0.1, T.width - 0.4]))
  p.push(box('cowl', m.body, [0.68, 1.5, 0], [0.4, 0.28, T.width - 0.3]))
  p.push(box('tub', m.body, [-1.0, 1.52, 0], [2.0, 0.55, T.width - 0.22]))
  p.push(box('wsf', m.plastic, [0.78, 1.95, 0], [0.06, 0.07, T.width - 0.3]))
  p.push(box('ws', m.glass, [0.82, 1.78, 0], [0.04, 0.5, T.width - 0.34], [0, 0, 0.12]))
  p.push(box('hoop', m.plastic, [-1.55, 1.98, 0], [0.07, 0.08, T.width - 0.3]))
  p.push(box('hoopL', m.plastic, [-1.55, 1.8, -(Wh - 0.15)], [0.07, 0.5, 0.07]), box('hoopR', m.plastic, [-1.55, 1.8, Wh - 0.15], [0.07, 0.5, 0.07]))
  p.push(box('roll', m.chrome, [-0.2, 2.0, 0], [0.05, 0.05, T.width - 0.5]))
  p.push(box('bar', m.chrome, [Lh - 0.05, 0.95, 0], [0.06, 0.1, T.width - 0.1]))
  p.push(<mesh key="spare" position={[-Lh - 0.2, 1.3, 0]} rotation={[0, 0, Math.PI / 2]} material={m.plastic} castShadow><cylinderGeometry args={[0.42, 0.42, 0.28, 18]} /></mesh>)
  ;[-1, 1].forEach((k) => {
    p.push(box('flF' + k, m.plastic, [T.wheelBase / 2, 1.18, k * (Wh - 0.02)], [1.25, 0.18, 0.24]))
    p.push(box('flR' + k, m.plastic, [-T.wheelBase / 2, 1.18, k * (Wh - 0.02)], [1.25, 0.18, 0.24]))
    p.push(<mesh key={'hl' + k} position={[Lh - 0.12, 1.28, k * (Wh - 0.5)]} rotation={[0, 0, Math.PI / 2]} material={m.head}><cylinderGeometry args={[0.15, 0.15, 0.08, 18]} /></mesh>)
    p.push(box('tl' + k, m.tail, [-Lh + 0.12, 1.1, k * (Wh - 0.28)], [0.04, 0.22, 0.14]))
    p.push(box('dh' + k, m.chrome, [-0.05, 1.3, k * (Wh - 0.09)], [0.18, 0.025, 0.02]))
    p.push(box('stripe' + k, m.plastic, [0, 1.02, k * (Wh - 0.1)], [T.length - 0.8, 0.04, 0.012]))
    p.push(box('mir' + k, m.plastic, [0.9, 1.7, k * (Wh + 0.04)], [0.1, 0.16, 0.08]))
    p.push(box('step' + k, m.plastic, [0, 0.55, k * (Wh - 0.08)], [2.4, 0.06, 0.2]))
  })
  p.push(box('grille', m.plastic, [Lh - 0.17, 1.0, 0], [0.04, 0.36, 0.9]))
  p.push(box('drl', m.drl, [Lh - 0.14, 1.28, 0], [0.01, 0.03, 0.5]))
  // red leather seats and dash
  ;[-0.45, 0.45].forEach((z, i) => {
    p.push(box('s1' + i, m.accentSeat || m.interior, [0.05, 1.04, z], [0.5, 0.14, 0.5]))
    p.push(box('s1b' + i, m.accentSeat || m.interior, [-0.28, 1.4, z], [0.1, 0.6, 0.5], [0, 0, -0.12]))
    p.push(box('s2' + i, m.accentSeat || m.interior, [-0.95, 1.04, z], [0.5, 0.14, 0.5]))
    p.push(box('s2b' + i, m.accentSeat || m.interior, [-1.25, 1.4, z], [0.1, 0.6, 0.5], [0, 0, -0.12]))
  })
  p.push(box('dash', m.interior, [0.55, 1.38, 0], [0.3, 0.2, T.width - 0.4]))
  p.push(box('scr', m.screen, [0.42, 1.52, 0], [0.04, 0.16, 0.7], [0, 0.2, 0]))
  return wrap(p)
}
