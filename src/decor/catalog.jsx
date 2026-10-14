import { useEffect, useMemo } from 'react'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { Sofa, Chair, Table, DiningSet, Rug, Plant, Shelf, Speaker, ClothingRack, Mannequin, Stool } from '../world/furniture.jsx'
import { Bench, Planter } from '../world/props.jsx'
import { getMaterials, surface, blackMarble } from '../world/materials.js'
import { registerLightAnchor } from '../state/environment.js'
import { canvasTexture } from '../world/canvasText.js'

// What can be placed or applied when decorating. Items are data + a render function, so new
// products (including uploaded GLB furniture, later) slot in without new editor code.
// The "Starter collection" below is free for anyone allowed to decorate a space; marketplace
// products will add owned items to the same lists.

export const CATEGORIES = [
  ['furniture', 'Furniture'],
  ['lighting', 'Lighting'],
  ['flooring', 'Flooring'],
  ['walls', 'Wall colors'],
  ['wallpaper', 'Wallpaper'],
  ['doors', 'Doors'],
  ['windows', 'Windows'],
  ['decorations', 'Decorations'],
  ['outdoor', 'Outdoor furniture'],
  ['npcs', 'NPC packs'],
  ['pets', 'Pet packs'],
]

// ---- placeable objects: size = footprint [width (local x), height, depth (local z)] ----
export const ITEMS = [
  { id: 'sofa-charcoal', cat: 'furniture', name: 'Three-seat sofa · charcoal', size: [2.2, 0.9, 0.9], render: (p, y) => <Sofa position={p} yaw={y} length={2.2} color="#3a3d44" /> },
  { id: 'sofa-plum', cat: 'furniture', name: 'Three-seat sofa · plum velvet', size: [2.2, 0.9, 0.9], render: (p, y) => <Sofa position={p} yaw={y} length={2.2} color="#4a2a44" /> },
  { id: 'loveseat-teal', cat: 'furniture', name: 'Loveseat · deep teal', size: [1.5, 0.9, 0.9], render: (p, y) => <Sofa position={p} yaw={y} length={1.5} color="#1f4a4a" /> },
  { id: 'chair-dining', cat: 'furniture', name: 'Dining chair', size: [0.5, 0.9, 0.5], render: (p, y) => <Chair position={p} yaw={y} color="#3b3f46" /> },
  { id: 'chair-gold', cat: 'furniture', name: 'Accent chair · gold', size: [0.5, 0.9, 0.5], render: (p, y) => <Chair position={p} yaw={y} color="#8a6d3b" /> },
  { id: 'stool-bar', cat: 'furniture', name: 'Bar stool', size: [0.42, 0.8, 0.42], render: (p) => <Stool position={p} /> },
  { id: 'table-coffee', cat: 'furniture', name: 'Coffee table · walnut', size: [1.2, 0.45, 0.6], render: (p, y) => <Table position={p} yaw={y} size={[1.2, 0.6]} height={0.45} /> },
  { id: 'table-marble', cat: 'furniture', name: 'Dining table · marble', size: [1.8, 0.75, 0.9], render: (p, y) => <Table position={p} yaw={y} size={[1.8, 0.9]} top="marble" /> },
  { id: 'dining-round', cat: 'furniture', name: 'Round dining set (4 chairs)', size: [2.0, 0.9, 2.0], render: (p) => <DiningSet position={p} chairs={4} size={1.0} color="#5b4636" /> },
  { id: 'shelf-books', cat: 'furniture', name: 'Bookshelf', size: [2, 2.2, 0.4], render: (p, y) => <Shelf position={p} yaw={y} width={2} height={2.2} /> },
  { id: 'lamp-floor', cat: 'lighting', name: 'Floor lamp · brass', size: [0.4, 1.7, 0.4], render: (p) => <FloorLamp position={p} /> },
  { id: 'lamp-floor-cool', cat: 'lighting', name: 'Floor lamp · cool white', size: [0.4, 1.7, 0.4], render: (p) => <FloorLamp position={p} color="#e6efff" /> },
  { id: 'lamp-arc', cat: 'lighting', name: 'Arc lamp · teal glow', size: [1.2, 2.0, 0.5], render: (p, y) => <ArcLamp position={p} yaw={y} /> },
  { id: 'rug-plum', cat: 'decorations', name: 'Area rug · plum', size: [3, 0.02, 2], flat: true, render: (p, y) => <Rug position={p} yaw={y} size={[3, 2]} color="#4a2a44" /> },
  { id: 'rug-sand', cat: 'decorations', name: 'Area rug · sand', size: [3, 0.02, 2], flat: true, render: (p, y) => <Rug position={p} yaw={y} size={[3, 2]} color="#b8a58a" /> },
  { id: 'plant-tall', cat: 'decorations', name: 'Potted plant', size: [0.6, 1.4, 0.6], render: (p) => <Plant position={p} scale={1.1} /> },
  { id: 'speaker', cat: 'decorations', name: 'Floor speaker', size: [0.5, 1.0, 0.5], render: (p, y) => <Speaker position={p} yaw={y} scale={1.2} /> },
  { id: 'rack-clothes', cat: 'decorations', name: 'Clothing rack', size: [1.6, 1.6, 0.6], render: (p, y) => <ClothingRack position={p} yaw={y} seed={3} /> },
  { id: 'mannequin', cat: 'decorations', name: 'Display mannequin', size: [0.6, 1.9, 0.6], render: (p, y) => <Mannequin position={p} yaw={y} color="#4a2a44" /> },
  { id: 'bench-park', cat: 'outdoor', name: 'Park bench', size: [2, 0.9, 0.7], render: (p, y) => <Bench position={p} yaw={y} /> },
  { id: 'planter', cat: 'outdoor', name: 'Planter box', size: [1.2, 0.6, 1.2], render: (p) => <Planter position={p} /> },
]
export const itemById = (id) => ITEMS.find((x) => x.id === id)

// ---- surfaces ----
const plain = (color, roughness = 0.9) => new THREE.MeshStandardMaterial({ color, roughness })
const flooringCache = new Map()
export const FLOORS = [
  { id: 'oak', name: 'Light oak', make: (w, d) => surface('wood', w / 2, d / 2, { color: '#c8a77f' }) },
  { id: 'walnut', name: 'Walnut', make: (w, d) => surface('wood', w / 2, d / 2, { color: '#6b4a33' }) },
  { id: 'marble-white', name: 'White marble', make: (w, d) => getMaterials().marbleFloor(w / 3, d / 3) },
  { id: 'marble-black-gold', name: 'Black marble · gold veins', make: (w, d) => blackMarble('#c9a96a', w / 4, d / 4) },
  { id: 'marble-black-purple', name: 'Black marble · purple veins', make: (w, d) => blackMarble('#8f4bd6', w / 4, d / 4) },
  { id: 'marble-black-teal', name: 'Black marble · teal veins', make: (w, d) => blackMarble('#2fb8ad', w / 4, d / 4) },
  { id: 'marble-black-pink', name: 'Black marble · pink veins', make: (w, d) => blackMarble('#d14f93', w / 4, d / 4) },
  { id: 'carpet-charcoal', name: 'Carpet · charcoal', make: (w, d) => surface('carpet', w / 2, d / 2, { color: '#3a3b40' }) },
  { id: 'carpet-plum', name: 'Carpet · plum', make: (w, d) => surface('carpet', w / 2, d / 2, { color: '#4a2a44' }) },
  { id: 'tile-stone', name: 'Stone tile', make: (w, d) => surface('tile', w / 1.5, d / 1.5, { color: '#cfc8bb' }) },
]
export function floorMaterial(id, w, d) {
  const f = FLOORS.find((x) => x.id === id)
  if (!f) return null
  const key = id + '|' + Math.round(w) + '|' + Math.round(d)
  if (!flooringCache.has(key)) flooringCache.set(key, f.make(w, d))
  return flooringCache.get(key)
}

export const WALL_COLORS = [
  { id: 'warm-white', name: 'Warm white', color: '#ece6dc' },
  { id: 'greige', name: 'Greige', color: '#b9b1a6' },
  { id: 'charcoal', name: 'Charcoal', color: '#3a3b40' },
  { id: 'midnight', name: 'Midnight', color: '#1b1f2e' },
  { id: 'royal-purple', name: 'Royal purple', color: '#4b2a6e' },
  { id: 'dusty-pink', name: 'Dusty pink', color: '#c48a9e' },
  { id: 'deep-teal', name: 'Deep teal', color: '#1f4f53' },
  { id: 'champagne', name: 'Champagne gold', color: '#c9b089' },
]
export const WALLPAPERS = [
  { id: 'damask-gold', name: 'Damask · gold on black', bg: '#141317', fg: '#b8955a', pattern: 'damask' },
  { id: 'stripe-plum', name: 'Pinstripe · plum', bg: '#3b2238', fg: '#5b3a57', pattern: 'stripe' },
  { id: 'deco-teal', name: 'Art deco · teal & gold', bg: '#123a3d', fg: '#c9a96a', pattern: 'deco' },
  { id: 'linen', name: 'Linen texture', bg: '#ddd5c8', fg: '#c8bfb1', pattern: 'linen' },
]
const wallCache = new Map()
export function wallMaterial(kind, id, length, height) {
  const key = kind + id + '|' + Math.round(length * 2) + '|' + Math.round(height * 2)
  if (wallCache.has(key)) return wallCache.get(key)
  let m = null
  if (kind === 'paint') { const c = WALL_COLORS.find((x) => x.id === id); if (c) m = plain(c.color, 0.92) }
  if (kind === 'paper') {
    const wp = WALLPAPERS.find((x) => x.id === id)
    if (wp) {
      const tex = wallpaperTexture(wp)
      const t = tex.clone()
      t.needsUpdate = true
      t.repeat.set(length / 1.2, height / 1.2)
      m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 })
    }
  }
  wallCache.set(key, m)
  return m
}
const paperTex = new Map()
function wallpaperTexture(wp) {
  if (paperTex.has(wp.id)) return paperTex.get(wp.id)
  const tex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = wp.bg; ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = wp.fg; ctx.fillStyle = wp.fg
    if (wp.pattern === 'stripe') { for (let x = 0; x < w; x += 32) ctx.fillRect(x, 0, 6, h) }
    if (wp.pattern === 'linen') { ctx.globalAlpha = 0.5; for (let i = 0; i < w; i += 3) { ctx.fillRect(i, 0, 1, h); ctx.fillRect(0, i, w, 1) } ctx.globalAlpha = 1 }
    if (wp.pattern === 'deco') {
      ctx.lineWidth = 3
      for (const [cx, cy] of [[64, 64], [192, 192], [192, 64], [64, 192]]) for (let r = 12; r < 64; r += 14) { ctx.beginPath(); ctx.arc(cx, cy + 32, r, Math.PI, 2 * Math.PI); ctx.stroke() }
    }
    if (wp.pattern === 'damask') {
      ctx.lineWidth = 3
      for (const [cx, cy] of [[64, 64], [192, 192]]) {
        ctx.beginPath(); ctx.ellipse(cx, cy, 26, 44, 0, 0, Math.PI * 2); ctx.stroke()
        ctx.beginPath(); ctx.ellipse(cx, cy, 10, 22, 0, 0, Math.PI * 2); ctx.fill()
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx, cy - 44); ctx.quadraticCurveTo(cx + s * 50, cy - 60, cx + s * 40, cy - 10); ctx.stroke() }
      }
    }
  })
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  paperTex.set(wp.id, tex)
  return tex
}

export const LIGHT_PRESETS = [
  { id: 'warm', name: 'Warm white', color: '#ffd9a8', intensity: 14 },
  { id: 'neutral', name: 'Neutral', color: '#fff4e6', intensity: 14 },
  { id: 'cool', name: 'Cool daylight', color: '#e6efff', intensity: 14 },
  { id: 'dim', name: 'Dim evening', color: '#ffc58a', intensity: 6 },
  { id: 'purple', name: 'Purple mood', color: '#a46cff', intensity: 12 },
  { id: 'teal', name: 'Teal mood', color: '#4fe0d2', intensity: 12 },
]

export const DOOR_STYLES = [
  { id: 'wood', name: 'Walnut door' },
  { id: 'glass', name: 'Glass & aluminium door' },
  { id: 'black', name: 'Black lacquer door' },
]

// ---- small furniture pieces only used by decorating ----
export function FloorLamp({ position, color = '#ffd9a8' }) {
  const m = getMaterials()
  const shade = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f3ead8', emissive: color, emissiveIntensity: 0.9, roughness: 0.8 }), [color])
  useEffect(() => registerLightAnchor({ position: new THREE.Vector3(position[0], position[1] + 1.5, position[2]), color, intensity: 7, distance: 7, range: 25 }), [position[0], position[1], position[2], color]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <CylinderCollider args={[0.8, 0.18]} position={[0, 0.8, 0]} />
      <mesh position={[0, 0.02, 0]} material={m.blackSteel}><cylinderGeometry args={[0.18, 0.2, 0.04, 20]} /></mesh>
      <mesh position={[0, 0.8, 0]} material={m.shared('brass', () => new THREE.MeshStandardMaterial({ color: '#b8955a', metalness: 1, roughness: 0.3 }))}><cylinderGeometry args={[0.015, 0.015, 1.5, 8]} /></mesh>
      <mesh position={[0, 1.55, 0]} material={shade}><cylinderGeometry args={[0.16, 0.22, 0.3, 24, 1, true]} /></mesh>
    </RigidBody>
  )
}
function ArcLamp({ position, yaw = 0 }) {
  const m = getMaterials()
  const glow = useMemo(() => new THREE.MeshStandardMaterial({ color: '#dffcf8', emissive: '#4fe0d2', emissiveIntensity: 1.6, toneMapped: false }), [])
  const tip = [position[0] + Math.sin(yaw) * 0.9, position[1] + 1.75, position[2] + Math.cos(yaw) * 0.9]
  useEffect(() => registerLightAnchor({ position: new THREE.Vector3(tip[0], tip[1] - 0.3, tip[2]), color: '#9ff0e8', intensity: 6, distance: 7, range: 25 }), [tip[0], tip[1], tip[2]]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[0.2, 0.15, 0.2]} position={[0, 0.15, -0.2]} />
      <mesh position={[0, 0.1, -0.2]} material={getMaterials().marbleWall(0.3, 0.3)}><boxGeometry args={[0.4, 0.2, 0.4]} /></mesh>
      <mesh position={[0, 1.05, 0.25]} rotation={[0.5, 0, 0]} material={m.chrome}><cylinderGeometry args={[0.015, 0.015, 2.1, 8]} /></mesh>
      <mesh position={[0, 1.78, 0.9]} material={glow}><sphereGeometry args={[0.16, 20, 12]} /></mesh>
    </RigidBody>
  )
}
