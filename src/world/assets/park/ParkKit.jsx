import { useEffect, useMemo } from 'react'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { surface } from '../../materials.js'
import { assetMats } from '../materials.js'
import { useSeats } from '../../../state/seats.js'
import { registerInteractable } from '../../../state/runtime.js'
import { useStore } from '../../../state/store.js'
import { SingleDoor } from '../../Door.jsx'
import { Toilet, Vanity, LightSwitch } from '../../Interior.jsx'
import { CeilingLight } from '../../furniture.jsx'
import { BrandSign } from '../../signs.jsx'
import { boxGeo } from '../../facade/kit.js'

// Reusable park pieces. Every piece is built from real parts (no flat-coloured boxes): weathered timber with grain,
// galvanised and powder-coated steel with roughness variation, poured rubber, mulch and decomposed granite.
// Pieces have colliders; anything you can sit on registers a seat. Local +z is the front of each piece.

const local = (pos, yaw, x, y, z) => [pos[0] + x * Math.cos(yaw) + z * Math.sin(yaw), pos[1] + y, pos[2] - x * Math.sin(yaw) + z * Math.cos(yaw)]
const woodMat = () => surface('wood', 1, 0.45, { color: '#a58660', roughness: 0.78 })
const woodDark = () => surface('wood', 1, 0.45, { color: '#6f5238', roughness: 0.8 })

/** A flat rectangle of surface (path, plaza, pad) with metre UVs so textures keep their scale across pieces. */
export function Pad({ x0, x1, z0, z1, y, mat, lift = 0.006, shadow = true }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2)
    const p = g.attributes.position, uv = new Float32Array(p.count * 2)
    for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) + (x0 + x1) / 2; uv[i * 2 + 1] = p.getZ(i) + (z0 + z1) / 2 }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.translate((x0 + x1) / 2, y + lift, (z0 + z1) / 2)
    return g
  }, [x0, x1, z0, z1, y, lift])
  return <mesh geometry={geo} material={mat} receiveShadow={shadow} />
}
/** Round paved plaza with metre UVs. */
export function Disc({ x, z, r, y, mat, lift = 0.008 }) {
  const geo = useMemo(() => {
    const g = new THREE.CircleGeometry(r, 48); g.rotateX(-Math.PI / 2)
    const p = g.attributes.position, uv = new Float32Array(p.count * 2)
    for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) + x; uv[i * 2 + 1] = p.getZ(i) + z }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.translate(x, y + lift, z)
    return g
  }, [x, z, r, y, lift])
  return <mesh geometry={geo} material={mat} receiveShadow />
}

export function PicnicTable({ position, yaw = 0 }) {
  const A = assetMats()
  const seats = useMemo(() => [-1, 1].flatMap((s) => [-0.45, 0.45].map((x) => ({ position: local(position, yaw, x, 0.46, s * 0.62), yaw: yaw + (s > 0 ? Math.PI : 0), height: 0.46, label: 'Sit at picnic table' }))), [position[0], position[1], position[2], yaw]) // eslint-disable-line react-hooks/exhaustive-deps
  useSeats(seats, [seats])
  const w = woodMat()
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[0.95, 0.38, 0.4]} position={[0, 0.38, 0]} />
      {[-1, 1].map((s) => <CuboidCollider key={s} args={[0.95, 0.22, 0.14]} position={[0, 0.22, s * 0.62]} />)}
      {/* slatted top, benches, angled legs and braces */}
      {[-0.3, -0.1, 0.1, 0.3].map((z) => <mesh key={z} position={[0, 0.74, z]} material={w} castShadow receiveShadow><boxGeometry args={[1.9, 0.04, 0.17]} /></mesh>)}
      {[-1, 1].map((s) => [-0.07, 0.07].map((o) => <mesh key={s + ':' + o} position={[0, 0.45, s * 0.62 + o * 1.05]} material={w} castShadow receiveShadow><boxGeometry args={[1.9, 0.04, 0.13]} /></mesh>))}
      {[-0.75, 0.75].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          {[-1, 1].map((s) => <mesh key={s} position={[0, 0.38, s * 0.3]} rotation={[s * 0.38, 0, 0]} material={A.galv} castShadow><boxGeometry args={[0.06, 0.82, 0.05]} /></mesh>)}
          <mesh position={[0, 0.4, 0]} material={A.galv}><boxGeometry args={[0.05, 0.05, 1.5]} /></mesh>
          <mesh position={[0, 0.7, 0]} material={A.galv}><boxGeometry args={[0.05, 0.05, 0.75]} /></mesh>
        </group>
      ))}
    </RigidBody>
  )
}

export function TrashCan({ position, color = '#2f4a3a' }) {
  const A = assetMats()
  const body = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.6 }), [color])
  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <CylinderCollider args={[0.5, 0.28]} position={[0, 0.5, 0]} />
      <mesh position={[0, 0.48, 0]} material={body} castShadow><cylinderGeometry args={[0.28, 0.25, 0.96, 20, 1, true]} /></mesh>
      <mesh position={[0, 0.02, 0]} material={body}><cylinderGeometry args={[0.25, 0.25, 0.04, 20]} /></mesh>
      {[0.12, 0.5, 0.86].map((y) => <mesh key={y} position={[0, y, 0]} material={A.galv}><cylinderGeometry args={[0.285, 0.285, 0.035, 20]} /></mesh>)}
      <mesh position={[0, 0.99, 0]} material={body} castShadow><cylinderGeometry args={[0.2, 0.3, 0.08, 20]} /></mesh>
      <mesh position={[0, 1.04, 0]} material={A.rubberBlack}><cylinderGeometry args={[0.12, 0.12, 0.03, 16]} /></mesh>
    </RigidBody>
  )
}

export function DrinkingFountain({ position, yaw = 0 }) {
  const A = assetMats()
  useEffect(() => registerInteractable('fountain-' + position[0].toFixed(1) + position[2].toFixed(1), {
    position: new THREE.Vector3(position[0], position[1] + 0.9, position[2]), radius: 1.6, label: 'Drink water',
    onInteract: () => useStore.getState().showToast('Cool, fresh water.'),
  }), [position[0], position[2]]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[0.2, 0.55, 0.2]} position={[0, 0.55, 0]} />
      <mesh position={[0, 0.5, 0]} material={A.f.concrete} castShadow><boxGeometry args={[0.36, 1.0, 0.36]} /></mesh>
      <mesh position={[0, 1.02, 0.02]} material={A.galv}><boxGeometry args={[0.5, 0.06, 0.46]} /></mesh>
      <mesh position={[0, 1.0, 0.04]} material={A.galv}><cylinderGeometry args={[0.15, 0.1, 0.07, 18]} /></mesh>
      <mesh position={[0, 1.1, -0.1]} material={A.galv}><cylinderGeometry args={[0.018, 0.018, 0.14, 8]} /></mesh>
      <mesh position={[0, 1.17, -0.04]} rotation={[Math.PI / 2, 0, 0]} material={A.galv}><cylinderGeometry args={[0.015, 0.015, 0.14, 8]} /></mesh>
      <mesh position={[0.1, 0.78, 0.19]} material={A.galv}><boxGeometry args={[0.1, 0.1, 0.02]} /></mesh>
    </RigidBody>
  )
}

export function BikeRack({ position, yaw = 0, n = 5 }) {
  const A = assetMats()
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[(n * 0.35) / 2, 0.45, 0.06]} position={[0, 0.45, 0]} />
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[(i - (n - 1) / 2) * 0.35, 0.45, 0]} material={A.galv} castShadow><torusGeometry args={[0.3, 0.02, 8, 18, Math.PI]} /></mesh>
      ))}
    </RigidBody>
  )
}

/** Swing set: A-frame ends, top beam, three swings (two belt seats you can sit on, one bucket). */
export function SwingSet({ position, yaw = 0 }) {
  const A = assetMats()
  const seats = useMemo(() => [-0.8, 0.0].map((x) => ({ position: local(position, yaw, x, 0.52, 0), yaw, height: 0.52, label: 'Sit on swing' })), [position[0], position[1], position[2], yaw]) // eslint-disable-line react-hooks/exhaustive-deps
  useSeats(seats, [seats])
  const H = 2.4, W = 3.4
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      {[-1, 1].map((s) => [-1, 1].map((b) => <CuboidCollider key={s + ':' + b} args={[0.06, H / 2, 0.06]} position={[s * W / 2 + 0, H / 2, b * 0.6]} />))}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (W / 2), 0, 0]}>
          {[-1, 1].map((b) => <mesh key={b} position={[0, H / 2, b * 0.3]} rotation={[-b * 0.26, 0, 0]} material={A.teal} castShadow><cylinderGeometry args={[0.05, 0.055, H * 1.04, 12]} /></mesh>)}
          <mesh position={[0, 0.8, 0]} material={A.teal}><boxGeometry args={[0.05, 0.04, 1.0]} /></mesh>
        </group>
      ))}
      <mesh position={[0, H, 0]} rotation={[0, 0, Math.PI / 2]} material={A.galv} castShadow><cylinderGeometry args={[0.055, 0.055, W + 0.3, 12]} /></mesh>
      {[-0.8, 0.0, 0.8].map((x, i) => (
        <group key={x} position={[x, 0, 0]}>
          {[-0.2, 0.2].map((o) => <mesh key={o} position={[o, (H + 0.52) / 2, 0]} material={A.galv}><cylinderGeometry args={[0.008, 0.008, H - 0.5, 6]} /></mesh>)}
          {i < 2
            ? <mesh position={[0, 0.5, 0]} material={A.rubberBlack} castShadow><boxGeometry args={[0.46, 0.04, 0.2]} /></mesh>
            : <group position={[0, 0.45, 0]}>
                <mesh material={A.yellow} castShadow><boxGeometry args={[0.42, 0.28, 0.42]} /></mesh>
                <mesh position={[0, 0.08, 0.2]} material={A.rubberBlack}><boxGeometry args={[0.36, 0.1, 0.02]} /></mesh>
              </group>}
        </group>
      ))}
    </RigidBody>
  )
}

/** Slide tower: 1.5 m deck on four posts with a roof, rung ladder, guard panels, a 3 m slide with side rails. */
export function SlideTower({ position, yaw = 0 }) {
  const A = assetMats()
  const D = 1.5, S = 1.2
  const slideLen = 3.3
  const ang = Math.atan2(D - 0.25, slideLen * 0.92)
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[S / 2, 0.06, S / 2]} position={[0, D, 0]} />
      {[-1, 1].map((a) => [-1, 1].map((b) => <CuboidCollider key={a + ':' + b} args={[0.05, (D + 1.0) / 2, 0.05]} position={[a * S / 2, (D + 1.0) / 2, b * S / 2]} />))}
      <CuboidCollider args={[0.55 / 2, D / 2, slideLen / 2]} position={[0, D / 2, S / 2 + slideLen * 0.46]} rotation={[ang, 0, 0]} />
      {/* posts, deck, roof */}
      {[-1, 1].map((a) => [-1, 1].map((b) => <mesh key={a + ':' + b} position={[a * S / 2, (D + 1.0) / 2, b * S / 2]} material={A.yellow} castShadow><boxGeometry args={[0.09, D + 1.0, 0.09]} /></mesh>))}
      <mesh position={[0, D, 0]} material={woodMat()} castShadow receiveShadow><boxGeometry args={[S + 0.1, 0.07, S + 0.1]} /></mesh>
      {[-1, 1].map((k) => <mesh key={k} position={[0, D + 1.18, k * 0.33]} rotation={[k * 0.5, 0, 0]} material={A.teal} castShadow><boxGeometry args={[S + 0.5, 0.04, 0.82]} /></mesh>)}
      {/* guard panels on the sides without ladder / slide */}
      {[-1, 1].map((a) => <mesh key={a} position={[a * S / 2, D + 0.52, 0]} material={A.violet} castShadow><boxGeometry args={[0.04, 0.8, S - 0.1]} /></mesh>)}
      <mesh position={[0, D + 0.52, -S / 2]} material={A.violet} castShadow><boxGeometry args={[S - 0.1, 0.8, 0.04]} /></mesh>
      {/* rung ladder up the back (-z) face */}
      {[-1, 1].map((a) => <mesh key={a} position={[a * 0.28, D / 2, -S / 2 - 0.3]} rotation={[Math.atan2(0.6, D), 0, 0]} material={A.galv} castShadow><boxGeometry args={[0.04, Math.hypot(0.6, D), 0.04]} /></mesh>)}
      {Array.from({ length: 6 }, (_, i) => { const y = 0.3 + i * 0.24; return <mesh key={i} position={[0, y, -S / 2 - 0.6 * (1 - y / D)]} material={A.galv}><boxGeometry args={[0.56, 0.03, 0.04]} /></mesh> })}
      {/* slide: bed + two side rails + lip, running out toward +z */}
      <group position={[0, D - 0.05, S / 2]} rotation={[ang, 0, 0]}>
        <mesh position={[0, -0.04, slideLen / 2]} material={A.galv} castShadow><boxGeometry args={[0.5, 0.05, slideLen]} /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[s * 0.27, 0.02, slideLen / 2]} material={A.teal} castShadow><boxGeometry args={[0.05, 0.14, slideLen]} /></mesh>)}
      </group>
      <mesh position={[0, 0.07, S / 2 + slideLen * 0.92 + 0.15]} material={A.galv}><boxGeometry args={[0.5, 0.05, 0.4]} /></mesh>
    </RigidBody>
  )
}

export function Seesaw({ position, yaw = 0 }) {
  const A = assetMats()
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[1.2, 0.3, 0.2]} position={[0, 0.3, 0]} />
      <mesh position={[0, 0.2, 0]} material={A.galv} castShadow><boxGeometry args={[0.1, 0.4, 0.3]} /></mesh>
      <mesh position={[0, 0.42, 0]} rotation={[0, 0, 0.1]} material={A.yellow} castShadow><boxGeometry args={[2.4, 0.07, 0.28]} /></mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 1.0, 0.42 + s * -0.1 * 1.0 * 0 - s * 0.1, 0]}>
          <mesh position={[0, 0.05, 0]} material={A.rubberBlack}><boxGeometry args={[0.3, 0.05, 0.3]} /></mesh>
          <mesh position={[0, 0.18, -0.05]} material={A.galv}><boxGeometry args={[0.02, 0.22, 0.02]} /></mesh>
        </group>
      ))}
    </RigidBody>
  )
}

export function SpringRider({ position, yaw = 0, color = 'pink' }) {
  const A = assetMats()
  const m = A[color]
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CylinderCollider args={[0.35, 0.28]} position={[0, 0.35, 0]} />
      <mesh position={[0, 0.03, 0]} material={A.rubberBlack}><cylinderGeometry args={[0.2, 0.2, 0.06, 14]} /></mesh>
      <mesh position={[0, 0.25, 0]} material={A.galv} castShadow><cylinderGeometry args={[0.09, 0.09, 0.4, 14]} /></mesh>
      {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[0, 0.08 + i * 0.065, 0]} rotation={[Math.PI / 2, 0, 0]} material={A.galv}><torusGeometry args={[0.09, 0.012, 6, 16]} /></mesh>)}
      <mesh position={[0, 0.55, 0]} rotation={[0.1, 0, 0]} material={m} castShadow><boxGeometry args={[0.28, 0.26, 0.7]} /></mesh>
      <mesh position={[0, 0.72, 0.36]} material={m} castShadow><boxGeometry args={[0.22, 0.3, 0.22]} /></mesh>
      <mesh position={[0, 0.88, 0.4]} material={m} castShadow><boxGeometry args={[0.18, 0.18, 0.28]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.14, 0.58, 0.28]} material={A.galv}><cylinderGeometry args={[0.012, 0.012, 0.22, 6]} /></mesh>)}
      <mesh position={[0, 0.7, 0.22]} rotation={[0, 0, Math.PI / 2]} material={A.galv}><cylinderGeometry args={[0.012, 0.012, 0.34, 6]} /></mesh>
    </RigidBody>
  )
}

export function Sandbox({ position, size = [2.6, 2.6] }) {
  const A = assetMats()
  const sand = useMemo(() => A.gravel.clone(), [A])
  useMemo(() => { sand.color = new THREE.Color('#f1deb2') }, [sand])
  const [w, d] = size
  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      {[[0, d / 2, w, 0.16], [0, -d / 2, w, 0.16]].map(([x, z, ww, dd], i) => <CuboidCollider key={i} args={[ww / 2, 0.15, dd / 2]} position={[x, 0.15, z]} />)}
      {[[w / 2, 0], [-w / 2, 0]].map(([x, z], i) => <CuboidCollider key={'s' + i} args={[0.08, 0.15, d / 2]} position={[x, 0.15, z]} />)}
      {[[0, d / 2, w + 0.16, 0.16], [0, -d / 2, w + 0.16, 0.16]].map(([x, z, ww, dd], i) => <mesh key={i} position={[x, 0.15, z]} material={woodDark()} castShadow receiveShadow><boxGeometry args={[ww, 0.3, dd]} /></mesh>)}
      {[[w / 2, 0], [-w / 2, 0]].map(([x, z], i) => <mesh key={'s' + i} position={[x, 0.15, z]} material={woodDark()} castShadow receiveShadow><boxGeometry args={[0.16, 0.3, d]} /></mesh>)}
      <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]} material={sand} receiveShadow><planeGeometry args={[w, d]} /></mesh>
      <mesh position={[0.5, 0.2, 0.3]} material={A.pink}><cylinderGeometry args={[0.08, 0.06, 0.12, 12]} /></mesh>
      <mesh position={[0.2, 0.17, 0.6]} rotation={[0, 0.6, 0]} material={A.yellow}><boxGeometry args={[0.05, 0.02, 0.2]} /></mesh>
    </RigidBody>
  )
}

/** Open timber pergola (four posts, beams, rafters), used over seating. */
export function Pergola({ position, yaw = 0, w = 4.2, d = 3.6, h = 2.7 }) {
  const wd = woodDark(), wl = woodMat()
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      {[-1, 1].map((a) => [-1, 1].map((b) => <CuboidCollider key={a + ':' + b} args={[0.1, h / 2, 0.1]} position={[a * (w / 2 - 0.1), h / 2, b * (d / 2 - 0.1)]} />))}
      {[-1, 1].map((a) => [-1, 1].map((b) => <mesh key={a + ':' + b} position={[a * (w / 2 - 0.1), h / 2, b * (d / 2 - 0.1)]} material={wd} castShadow><boxGeometry args={[0.18, h, 0.18]} /></mesh>))}
      {[-1, 1].map((b) => <mesh key={b} position={[0, h + 0.1, b * (d / 2 - 0.1)]} material={wd} castShadow><boxGeometry args={[w + 0.5, 0.2, 0.14]} /></mesh>)}
      {Array.from({ length: Math.round(w / 0.42) }, (_, i) => <mesh key={i} position={[-w / 2 + 0.2 + i * 0.42, h + 0.25, 0]} material={wl} castShadow><boxGeometry args={[0.07, 0.1, d + 0.5]} /></mesh>)}
      {[-1, 1].map((a) => <mesh key={a} position={[a * (w / 2 - 0.1), h * 0.8, 0]} rotation={[0, 0, a * 0.7]} material={wd}><boxGeometry args={[0.06, 0.5, 0.06]} /></mesh>)}
    </RigidBody>
  )
}

/** Perimeter fence: steel rail fence with a gate opening. `gap` = [a, b] along the chosen side to leave open. */
export function RailFence({ x0, x1, z0, z1, y, h = 1.1, gap = null, gapSide = 'z1' }) {
  const A = assetMats()
  const runs = []
  const add = (side, xa, xb, za, zb) => {
    if (gap && side === gapSide) {
      const horiz = side === 'z0' || side === 'z1'
      const lo = horiz ? xa : za, hi = horiz ? xb : zb
      if (gap[0] > lo) runs.push(horiz ? [xa, gap[0], za, zb] : [xa, xb, za, gap[0]])
      if (gap[1] < hi) runs.push(horiz ? [gap[1], xb, za, zb] : [xa, xb, gap[1], zb])
    } else runs.push([xa, xb, za, zb])
  }
  add('z0', x0, x1, z0, z0); add('z1', x0, x1, z1, z1); add('x0', x0, x0, z0, z1); add('x1', x1, x1, z0, z1)
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {runs.map(([xa, xb, za, zb], i) => <CuboidCollider key={i} args={[Math.max(0.05, (xb - xa) / 2), h / 2, Math.max(0.05, (zb - za) / 2)]} position={[(xa + xb) / 2, y + h / 2, (za + zb) / 2]} />)}
      </RigidBody>
      {runs.map(([xa, xb, za, zb], i) => {
        const len = Math.hypot(xb - xa, zb - za), horiz = Math.abs(xb - xa) > Math.abs(zb - za)
        const n = Math.max(1, Math.round(len / 0.12))
        return (
          <group key={i} position={[(xa + xb) / 2, y, (za + zb) / 2]} rotation={[0, horiz ? 0 : Math.PI / 2, 0]}>
            {[0.05, h - 0.05].map((yy) => <mesh key={yy} position={[0, yy, 0]} material={A.rail} castShadow><boxGeometry args={[len, 0.05, 0.04]} /></mesh>)}
            {Array.from({ length: n + 1 }, (_, k) => <mesh key={k} position={[-len / 2 + (len * k) / n, h / 2, 0]} material={A.rail}><boxGeometry args={[0.018, h - 0.1, 0.018]} /></mesh>)}
            {Array.from({ length: Math.floor(len / 2.4) + 2 }, (_, k) => <mesh key={'p' + k} position={[-len / 2 + (len * k) / (Math.floor(len / 2.4) + 1), h / 2, 0]} material={A.rail} castShadow><boxGeometry args={[0.07, h + 0.05, 0.07]} /></mesh>)}
          </group>
        )
      })}
    </group>
  )
}

/** Restroom building: brick + render, flat roof with fascia, two single-user rooms (toilet, basin, light, working door). */
export function Restrooms({ position, yaw = 0, zone = 'park-restroom', idPrefix = 'park-restroom' }) {
  const A = assetMats(), f = A.f
  const W = 9.0, Dp = 5.0, H = 3.0, T = 0.3
  const roomW = 2.7
  // local frame: front (doors) faces +z. Door positions along x
  const doorXs = [-2.2, 2.2]
  const pieces = useMemo(() => {
    const g = []
    const add = (k, cx, cy, cz, sx, sy, sz, solid = true) => g.push([k, cx, cy, cz, sx, sy, sz, solid])
    // walls (front wall has two door gaps)
    add('brick', 0, H / 2, -Dp / 2 + T / 2, W, H, T) // back
    add('brick', -W / 2 + T / 2, H / 2, 0, T, H, Dp) // west
    add('brick', W / 2 - T / 2, H / 2, 0, T, H, Dp) // east
    const zf = Dp / 2 - T / 2
    let x = -W / 2
    for (const dx of doorXs) { const a = dx - 0.5, b = dx + 0.5; add('brick', (x + a) / 2, H / 2, zf, a - x, H, T); add('brick', dx, (2.15 + H) / 2, zf, 1.0, H - 2.15, T); x = b }
    add('brick', (x + W / 2) / 2, H / 2, zf, W / 2 - x, H, T)
    // partition between the two rooms + utility closet in the middle
    add('render', -0.9, H / 2, 0, 0.12, H - 0.3, Dp - 2 * T)
    add('render', 0.9, H / 2, 0, 0.12, H - 0.3, Dp - 2 * T)
    // roof slab + overhang fascia, plinth
    add('concrete', 0, H + 0.12, 0, W + 0.9, 0.24, Dp + 0.9)
    add('stone', 0, H + 0.3, 0, W + 1.0, 0.12, Dp + 1.0)
    // granite base course: a thin visual band round the back and sides (not solid, so the doorways stay level)
    add('granite', 0, 0.2, -Dp / 2 - 0.02, W + 0.08, 0.4, 0.04 + T, false)
    add('granite', -W / 2 - 0.02 + 0.0, 0.2, 0, 0.04 + T, 0.4, Dp, false)
    add('granite', W / 2 + 0.02, 0.2, 0, 0.04 + T, 0.4, Dp, false)
    return g
  }, [])
  return (
    <>
    <group position={position} rotation={[0, yaw, 0]}>
      <RigidBody type="fixed" colliders={false}>
        {pieces.filter((q) => q[7]).map(([k, cx, cy, cz, sx, sy, sz], i) => <CuboidCollider key={i} args={[sx / 2, sy / 2, sz / 2]} position={[cx, cy, cz]} />)}
      </RigidBody>
      {pieces.map(([k, cx, cy, cz, sx, sy, sz], i) => {
        const mat = { brick: f.brick, render: f.plaster, concrete: f.concrete, stone: f.stone, granite: f.granite }[k]
        const g = boxGeo(sx, sy, sz, cx + position[0], cy, cz + position[2])
        g.translate(-position[0], 0, -position[2]) // metre UVs from world position, mesh placed in the group's local space
        return <mesh key={i} geometry={g} material={mat} castShadow receiveShadow />
      })}
      {/* high ventilation louvres, door signs, house lamps */}
      {doorXs.map((dx, i) => (
        <group key={dx}>
          <mesh position={[dx, 2.62, Dp / 2 + 0.005]} material={A.galv}><boxGeometry args={[0.9, 0.3, 0.02]} /></mesh>
          {Array.from({ length: 5 }, (_, k) => <mesh key={k} position={[dx, 2.52 + k * 0.06, Dp / 2 + 0.02]} material={A.rail}><boxGeometry args={[0.86, 0.015, 0.02]} /></mesh>)}
          <BrandSign text={i ? 'MEN' : 'WOMEN'} position={[dx, 2.35, Dp / 2 + 0.02]} width={0.9} size={90} color="#f4f1ea" />
          <mesh position={[dx + (i ? 0.9 : -0.9), 2.5, Dp / 2 + 0.07]} material={A.sconce}><boxGeometry args={[0.16, 0.3, 0.12]} /></mesh>
        </group>
      ))}
      <mesh position={[0, 0.011, 0]} rotation={[-Math.PI / 2, 0, 0]} material={surface('tile', 6, 4, { color: '#bdb9b1' })}><planeGeometry args={[W - 2 * T, Dp - 2 * T]} /></mesh>
    </group>
    {/* the rooms (world-space fixtures: doors, toilets, basins, lights register their own anchors) */}
    {doorXs.map((dx, i) => (
      <group key={'r' + dx}>
        <SingleDoor id={`${idPrefix}-door-${i}`} hinge={local(position, yaw, dx - 0.5, 0, Dp / 2 - T / 2)} width={1.0} height={2.15} baseYaw={yaw} openAngle={1.55} label={i ? 'men’s restroom door' : 'women’s restroom door'} />
        <Toilet position={local(position, yaw, dx - (i ? -0.55 : 0.55), 0, -Dp / 2 + T + 0.4)} yaw={yaw} />
        <Vanity position={local(position, yaw, dx + (i ? 0.62 : -0.62), 0, 0.6)} yaw={yaw + (i ? -Math.PI / 2 : Math.PI / 2)} width={0.9} zone={zone} />
        <CeilingLight position={local(position, yaw, dx, H - 0.03, 0)} size={[0.7, 0.5]} zone={zone} intensity={10} distance={5} watts={14} />
      </group>
    ))}
    <LightSwitch position={local(position, yaw, 0, 1.25, Dp / 2 - T - 0.05)} yaw={yaw + Math.PI} zone={zone} />
    </>
  )
}

/** Name board on two timber posts with night lighting. */
export function ParkSign({ position, yaw = 0, text, sub }) {
  const A = assetMats()
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[1.5, 1.0, 0.12]} position={[0, 1.0, 0]} />
      {[-1.35, 1.35].map((x) => <mesh key={x} position={[x, 0.95, 0]} material={woodDark()} castShadow><boxGeometry args={[0.2, 1.9, 0.2]} /></mesh>)}
      <mesh position={[0, 1.55, 0]} material={A.f.granite} castShadow><boxGeometry args={[3.0, 0.8, 0.12]} /></mesh>
      <BrandSign text={text} sub={sub} position={[0, 1.55, 0.07]} width={2.9} size={120} color="#f4f1ea" />
    </RigidBody>
  )
}
