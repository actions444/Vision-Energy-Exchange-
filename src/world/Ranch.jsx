import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { surface } from './materials.js'
import { ParkSign, RailFence } from './assets/park/ParkKit.jsx'
import { Bollard } from './props.jsx'
import { registerInteractable } from '../state/runtime.js'
import { useStore } from '../state/store.js'
import { useJobs } from '../state/jobs.js'
import { RANCH, GROUND, ROAD_Z, PLOTS, animalById } from '../config/ranch.js'

// Vision Storms Ranch: six fenced, buyable land plots in Maple Court. Walk up to a lot's sign to
// buy it (real credits, ui/LandPanel.jsx + state/jobs.js buyPlot), then once it's yours, the same
// sign opens the panel to stock it with horses, cattle, sheep or pigs. Animals are procedural - low
// poly, no rig - but each one is a real owned record, not just set dressing.

export { RANCH }
const fmt = (n) => Math.round(n).toLocaleString('en-US')

let MATS
function mats() {
  if (MATS) return MATS
  MATS = {
    dirt: new THREE.MeshStandardMaterial({ color: '#7a6a4e', roughness: 1 }),
  }
  return MATS
}

/** One procedural, low-poly farm animal. No skeleton - just primitives, with a gentle idle sway so
 * the herd doesn't look frozen. `kind` picks size/shape/colour from config/ranch.js's ANIMALS. */
function Animal({ kind, x, z, seed = 0 }) {
  const info = animalById(kind)
  const ref = useRef()
  const body = useMemo(() => new THREE.MeshStandardMaterial({ color: info?.color || '#aaa', roughness: 0.85 }), [info?.color])
  const accent = useMemo(() => new THREE.MeshStandardMaterial({ color: info?.accent || '#333', roughness: 0.75 }), [info?.accent])
  // per-kind proportions: [bodyW, bodyH, bodyD, legH, headSize, hasHorns, hasSnout, hasEars]
  const P = {
    horse: { bw: 0.55, bh: 0.75, bd: 1.35, legH: 0.85, head: 0.32, horns: false, snout: 0.22, ears: 0.12 },
    cattle: { bw: 0.7, bh: 0.85, bd: 1.3, legH: 0.6, head: 0.36, horns: true, snout: 0.2, ears: 0.14 },
    sheep: { bw: 0.42, bh: 0.5, bd: 0.75, legH: 0.32, head: 0.22, horns: false, snout: 0.1, ears: 0.1 },
    pig: { bw: 0.45, bh: 0.42, bd: 0.75, legH: 0.26, head: 0.24, horns: false, snout: 0.14, ears: 0.1 },
  }[kind] || { bw: 0.5, bh: 0.6, bd: 1, legH: 0.5, head: 0.28, horns: false, snout: 0.15, ears: 0.1 }
  const yaw = useMemo(() => (Math.sin(seed * 37.1) * 0.5 + 0.5) * Math.PI * 2, [seed])
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime * 0.8 + seed * 5
    ref.current.rotation.y = yaw + Math.sin(t * 0.3) * 0.08
    ref.current.children[1] && (ref.current.children[1].rotation.x = -0.1 + Math.sin(t) * 0.06) // head bob
  })
  const groundY = P.legH
  return (
    <group ref={ref} position={[x, GROUND, z]}>
      <mesh position={[0, groundY, 0]} material={body} castShadow>
        <boxGeometry args={[P.bw, P.bh * 0.6, P.bd]} />
      </mesh>
      <mesh position={[0, groundY + P.bh * 0.3 + P.head * 0.5, P.bd / 2 + P.head * 0.3]} material={body} castShadow>
        <boxGeometry args={[P.head, P.head, P.head * 1.1]} />
      </mesh>
      <mesh position={[0, groundY + P.bh * 0.3 + P.head * 0.45, P.bd / 2 + P.head * 0.8]} material={accent}>
        <boxGeometry args={[P.snout, P.snout * 0.6, P.snout]} />
      </mesh>
      {P.horns && [-1, 1].map((s) => (
        <mesh key={s} position={[s * P.head * 0.35, groundY + P.bh * 0.3 + P.head * 0.9, P.bd / 2 + P.head * 0.25]} rotation={[0, 0, s * 0.3]} material={accent}>
          <coneGeometry args={[0.03, 0.18, 6]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => [-1, 1].map((t2) => (
        <mesh key={s + ':' + t2} position={[s * P.bw * 0.32, groundY / 2, t2 * P.bd * 0.32]} material={accent} castShadow>
          <cylinderGeometry args={[0.045, 0.05, groundY, 6]} />
        </mesh>
      )))}
      {/* tail */}
      <mesh position={[0, groundY + P.bh * 0.25, -P.bd / 2 - 0.05]} material={accent}>
        <cylinderGeometry args={[0.02, 0.03, 0.22, 5]} />
      </mesh>
    </group>
  )
}

/** The fenced lot, its sale/manage sign, and (once owned) the herd standing on it. */
function Plot({ plot }) {
  const owned = useJobs((s) => s.ownedLand.includes(plot.id))
  const herd = useJobs((s) => s.livestock[plot.id] || [])
  const openPanel = useStore((s) => s.openPanel)
  const cx = (plot.x0 + plot.x1) / 2
  const ground = useMemo(() => surface('grass', (plot.x1 - plot.x0) / 4, (plot.z1 - plot.z0) / 4, { color: owned ? '#5a7a3a' : '#6a7a52' }), [plot.x0, plot.x1, plot.z0, plot.z1, owned])

  useEffect(() => registerInteractable('land-' + plot.id, {
    position: new THREE.Vector3(cx, GROUND + 1.6, plot.z0 - 0.4),
    radius: 3.2,
    label: owned ? `Manage ${plot.name}` : `Buy ${plot.name} — ${fmt(plot.price)} cr`,
    onInteract: () => openPanel({ type: 'land', plotId: plot.id }),
  }), [owned, plot.id, plot.name, plot.price, cx])

  // spread owned animals across the lot in a stable (seeded) layout
  const slots = useMemo(() => {
    const cols = 3
    const out = []
    for (let i = 0; i < herd.length; i++) {
      const col = i % cols, row = Math.floor(i / cols)
      out.push({
        x: plot.x0 + 3 + col * ((plot.x1 - plot.x0 - 6) / Math.max(1, cols - 1)),
        z: plot.z0 + 4 + row * 6,
      })
    }
    return out
  }, [herd.length, plot.x0, plot.x1, plot.z0])

  return (
    <group>
      <mesh position={[cx, GROUND + 0.006, (plot.z0 + plot.z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={ground} receiveShadow>
        <planeGeometry args={[plot.x1 - plot.x0, plot.z1 - plot.z0]} />
      </mesh>
      <RailFence x0={plot.x0} x1={plot.x1} z0={plot.z0} z1={plot.z1} y={GROUND} gap={[cx - 1.4, cx + 1.4]} gapSide="z0" />
      <ParkSign position={[cx, GROUND, plot.z0 - 0.6]} text={owned ? plot.name : 'FOR SALE'} sub={owned ? `${herd.length}/6 animals` : `${plot.name} · ${fmt(plot.price)} CR`} />
      {owned && herd.map((a, i) => <Animal key={a.id} kind={a.kind} x={slots[i]?.x ?? cx} z={slots[i]?.z ?? plot.z0 + 4} seed={i + 1} />)}
    </group>
  )
}

export default function Ranch() {
  const m = mats()
  const w = RANCH.x1 - RANCH.x0, d = RANCH.z1 - RANCH.z0
  const cx = (RANCH.x0 + RANCH.x1) / 2, cz = (RANCH.z0 + RANCH.z1) / 2
  return (
    <group>
      {/* the whole block's base ground, dirt road frontage along the south edge */}
      <mesh position={[cx, GROUND + 0.003, cz]} rotation={[-Math.PI / 2, 0, 0]} material={m.dirt} receiveShadow>
        <planeGeometry args={[w + 4, d + 4]} />
      </mesh>
      <mesh position={[cx, GROUND + 0.01, ROAD_Z]} rotation={[-Math.PI / 2, 0, 0]} material={m.dirt} receiveShadow>
        <planeGeometry args={[w + 8, 3.2]} />
      </mesh>
      <Bollard position={[RANCH.x0 - 1, GROUND, ROAD_Z]} />
      <Bollard position={[RANCH.x1 + 1, GROUND, ROAD_Z]} />
      {PLOTS.map((plot) => <Plot key={plot.id} plot={plot} />)}
    </group>
  )
}
