import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { getMaterials, signatureMarble, surface } from './materials.js'
import { Wall, Gate } from './jobkit.jsx'
import { DoubleDoor } from './Door.jsx'
import { BrandSign } from './signs.jsx'
import { Fountain, Planter } from './props.jsx'
import { ClothingRack, Mannequin, Shelf, Counter, CeilingLight, Plant } from './furniture.jsx'
import { registerInteractable } from '../state/runtime.js'
import { useStore } from '../state/store.js'
import { canvasTexture } from './canvasText.js'
import { FONTS } from '../config/theme.js'
import { MALL, GROUND, T, H } from '../config/mall.js'

// ============================================================================
// VISION STORMS EXCHANGES — SHOPPING MALL (Phase 1: functional mall)
// Per the user's "Master Build Prompt" and their confirmed answers: same game as the existing
// Three.js city (not a separate project), built now with a mock/placeholder product catalog —
// real Shopify Storefront API products are a later phase, once the user shares a Storefront API
// token. Phase 1 scope here: one grand entrance, one central atrium, four working storefronts
// with basic product interactions (open a panel, browse mock products, "buy" with VSE credits).
// Escalators, the 20-room cinema wing, the academy, music store and admin dashboard are later
// phases per the spec's own phase plan (section 12) and are not attempted in this pass.
// ============================================================================

const { x0, x1, z0, z1 } = MALL
const CX = (x0 + x1) / 2
const RECT = { x0, x1, z0, z1 }
const NEON = { purple: '#9b4fe0', pink: '#ff2fa0', teal: '#2fd0c4', gold: '#e8c35a' }

export default function Mall() {
  return (
    <Gate x0={x0 - 6} x1={x1 + 6} z0={z0 - 6} z1={z1 + 6}>
      <MallShell />
      <MallInterior />
    </Gate>
  )
}

// ---------------------------------------------------------------------------
// Shell: four exterior walls (mostly glass, per the spec's "large glass storefronts"), floor,
// flat roof, and the grand double-door entrance on the south (approach) side.
// ---------------------------------------------------------------------------
function MallShell() {
  const m = getMaterials()
  const curtain = m.windows(2, 6, 3)
  const w = x1 - x0, d = z1 - z0
  const glassOpenings = (lo, hi, h = H - 1.4, sill = 0.6) => {
    const out = []
    for (let at = lo + 4; at < hi - 2; at += 8) out.push({ at, half: 3.2, glass: true, h, sill })
    return out
  }
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[w / 2, 0.1, d / 2]} position={[CX, GROUND - 0.1, (z0 + z1) / 2]} />
      </RigidBody>
      <mesh position={[CX, GROUND, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={signatureMarble(6, 10)} receiveShadow>
        <planeGeometry args={[w, d]} />
      </mesh>
      <mesh position={[CX, GROUND + H, (z0 + z1) / 2]} rotation={[Math.PI / 2, 0, 0]} material={m.blackSteel}>
        <planeGeometry args={[w, d]} />
      </mesh>
      <Wall side="s" rect={RECT} h={H} t={T} ext={curtain} int={m.glass} y={GROUND}
        openings={[{ at: CX, half: 3.4, h: H - 1.2 }]} />
      <Wall side="n" rect={RECT} h={H} t={T} ext={curtain} int={m.glass} y={GROUND} openings={glassOpenings(x0, x1)} />
      <Wall side="w" rect={RECT} h={H} t={T} ext={curtain} int={m.glass} y={GROUND} openings={glassOpenings(z0, z1)} />
      <Wall side="e" rect={RECT} h={H} t={T} ext={curtain} int={m.glass} y={GROUND} openings={glassOpenings(z0, z1)} />
      <DoubleDoor id="mall-entrance" center={[CX, GROUND, z0]} halfWidth={3.4} height={H - 1.2} facing={Math.PI} accent={NEON.pink} label="mall entrance" />
      <BrandSign text="VISION STORMS" sub="ENERGY EXCHANGES  ·  THE MALL" position={[CX, GROUND + H - 1.3, z0 - 0.25]} rotation={[0, Math.PI, 0]} width={16} color="#f4f1ea" glow={NEON.purple} />
      {/* four corner pillars with a running neon strip, cycling the spec's accent palette */}
      {[[x0 + 1.4, z0 + 1.4, NEON.purple], [x1 - 1.4, z0 + 1.4, NEON.pink], [x0 + 1.4, z1 - 1.4, NEON.teal], [x1 - 1.4, z1 - 1.4, NEON.gold]].map(([px, pz, c], i) => (
        <group key={i}>
          <mesh position={[px, GROUND + H / 2, pz]} material={m.blackSteel} castShadow><boxGeometry args={[0.7, H, 0.7]} /></mesh>
          <mesh position={[px, GROUND + H / 2, pz]} material={m.neon(c, 2.2)}><boxGeometry args={[0.1, H - 0.4, 0.72]} /></mesh>
        </group>
      ))}
    </group>
  )
}

// ---------------------------------------------------------------------------
// Interior: the fountain atrium plus the four Phase-1 storefronts (Women's Clothing, Men's
// Clothing, Electronics, Beauty & Cosmetics), two along each long wall.
// ---------------------------------------------------------------------------
function MallInterior() {
  const m = getMaterials()
  const midZ = (z0 + z1) / 2
  const bays = [
    { storeId: 'womens', x: x0 + 9, z: midZ - 10, yaw: Math.PI / 2, accent: NEON.pink },
    { storeId: 'mens', x: x0 + 9, z: midZ + 10, yaw: Math.PI / 2, accent: NEON.teal },
    { storeId: 'electronics', x: x1 - 9, z: midZ - 10, yaw: -Math.PI / 2, accent: NEON.purple },
    { storeId: 'beauty', x: x1 - 9, z: midZ + 10, yaw: -Math.PI / 2, accent: NEON.gold },
  ]
  return (
    <group>
      <Fountain position={[CX, GROUND, midZ]} radius={3.4} />
      <CeilingLight position={[CX, GROUND + H - 0.3, midZ - 10]} size={[2.4, 1.6]} color="#ffe3f4" zone="mall" intensity={20} distance={14} />
      <CeilingLight position={[CX, GROUND + H - 0.3, midZ + 10]} size={[2.4, 1.6]} color="#e3f7ff" zone="mall" intensity={20} distance={14} />
      {bays.map((b) => <Storefront key={b.storeId} {...b} />)}
    </group>
  )
}

function Storefront({ storeId, x, z, yaw, accent }) {
  const m = getMaterials()
  const STORE_NAMES = { womens: "WOMEN'S CLOTHING", mens: "MEN'S CLOTHING", electronics: 'ELECTRONICS', beauty: 'BEAUTY & COSMETICS' }
  const board = useMemo(() => canvasTexture(1024, 280, (ctx, w, h) => {
    ctx.fillStyle = '#0c0a12'; ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = accent; ctx.font = `800 64px ${FONTS.display}`; ctx.textAlign = 'center'
    ctx.fillText(STORE_NAMES[storeId] || storeId, w / 2, h / 2 + 22)
  }), [storeId, accent])
  useEffect(() => registerInteractable('mall-' + storeId, {
    position: new THREE.Vector3(x, 1.2, z + Math.sin(yaw) * -1.6),
    radius: 2.4,
    label: 'Browse ' + (STORE_NAMES[storeId] || storeId).toLowerCase(),
    onInteract: () => useStore.getState().openPanel({ type: 'mall', storeId }),
  }), [storeId, x, z, yaw]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <group position={[x, GROUND, z]} rotation={[0, yaw, 0]}>
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.4, 0.55, 1.8]} position={[0, 0.55, -2.4]} /></RigidBody>
      <mesh position={[0, H - 1.6, -3.4]} material={m.neon(accent, 0.4)}>
        <planeGeometry args={[5.6, 1.7]} />
        <meshBasicMaterial map={board} toneMapped={false} />
      </mesh>
      <Counter position={[0, 0, -2.4]} yaw={0} length={3.6} height={1.0} depth={0.7} top="marble" face="#15131a" />
      <ClothingRack position={[-2.6, 0, -0.6]} yaw={Math.PI / 2} seed={2} />
      <ClothingRack position={[2.6, 0, -0.6]} yaw={-Math.PI / 2} seed={5} />
      <Mannequin position={[-2.6, 0, 1.4]} yaw={Math.PI / 4} color={accent} />
      <Mannequin position={[2.6, 0, 1.4]} yaw={-Math.PI / 4} color={accent} />
      <Shelf position={[0, 0, 2.4]} yaw={Math.PI} width={2.6} height={2.0} books={false} />
      <Planter position={[-3.2, 0, 3.0]} />
      <Planter position={[3.2, 0, 3.0]} />
    </group>
  )
}
