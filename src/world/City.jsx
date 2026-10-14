import { useEffect, useMemo } from 'react'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials } from './materials.js'
import { neonSignTexture } from './canvasText.js'
import { NEON, FONTS } from '../config/theme.js'
import { registerInteractable } from '../state/runtime.js'
import { useStore } from '../state/store.js'
import { GALLERY } from './layout.js'
import { DoubleDoor } from './Door.jsx'
import { RecordsInterior, LoungeInterior } from './Rooms.jsx'

// Walkable city: wet asphalt avenue and cross street, raised marble sidewalks (curbs are
// climbable steps), neon curb lights, streetlights, plaza planters, entertainment venues and
// a skyline. Every solid thing has a collider.

const CURB = 0.15
const AVENUE = { x0: -6, x1: 6, z0: -26, z1: 110 }
const CROSS = { z0: 14, z1: 26, x0: -110, x1: 110 }

export default function City() {
  const mats = getMaterials()
  const m = useMemo(() => ({
    road: mats.road(24, 24),
    walk: mats.sidewalk(16, 16),
    plaza: mats.marbleFloor(4, 3),
    stripe: new THREE.MeshStandardMaterial({ color: '#e9e4f5', roughness: 0.5, emissive: '#30283f' }),
    teal: mats.neon(NEON.teal, 2.6),
    pink: mats.neon(NEON.pink, 2.6),
    yellow: mats.neon(NEON.yellow, 3),
    purple: mats.neon(NEON.purple, 3),
  }), [mats])

  // sidewalk blocks: [x0, x1, z0, z1]
  const blocks = [
    [-110, AVENUE.x0, CROSS.z1, 110],
    [AVENUE.x1, 110, CROSS.z1, 110],
    [-110, AVENUE.x0, -110, CROSS.z0],
    [AVENUE.x1, 110, -110, CROSS.z0],
    [AVENUE.x0, AVENUE.x1, -110, AVENUE.z0], // gallery plaza
  ]

  return (
    <group>
      {/* ground / road */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[120, 0.5, 120]} position={[0, -0.5, 0]} />
        {blocks.map(([x0, x1, z0, z1], i) => (
          <CuboidCollider key={i} args={[(x1 - x0) / 2, CURB / 2, (z1 - z0) / 2]} position={[(x0 + x1) / 2, CURB / 2, (z0 + z1) / 2]} />
        ))}
      </RigidBody>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={m.road} receiveShadow>
        <planeGeometry args={[240, 240]} />
      </mesh>
      {blocks.map(([x0, x1, z0, z1], i) => (
        <mesh key={i} position={[(x0 + x1) / 2, CURB / 2, (z0 + z1) / 2]} material={i === 4 ? m.plaza : m.walk} receiveShadow>
          <boxGeometry args={[x1 - x0, CURB, z1 - z0]} />
        </mesh>
      ))}

      {/* lane markings */}
      {Array.from({ length: 16 }, (_, i) => -20 + i * 8).filter((z) => z < CROSS.z0 - 3 || z > CROSS.z1 + 2).map((z) => (
        <mesh key={'d' + z} position={[0, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]} material={m.stripe}><planeGeometry args={[0.18, 3.5]} /></mesh>
      ))}
      {Array.from({ length: 22 }, (_, i) => -100 + i * 9).filter((x) => Math.abs(x) > 9).map((x) => (
        <mesh key={'c' + x} position={[x, 0.01, 20]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} material={m.stripe}><planeGeometry args={[0.18, 3.5]} /></mesh>
      ))}
      {/* crosswalks */}
      {Array.from({ length: 8 }, (_, i) => -4.9 + i * 1.4).map((x) => (
        <group key={'x' + x}>
          <mesh position={[x, 0.012, CROSS.z0 - 1.8]} rotation={[-Math.PI / 2, 0, 0]} material={m.stripe}><planeGeometry args={[0.7, 2.6]} /></mesh>
          <mesh position={[x, 0.012, CROSS.z1 + 1.8]} rotation={[-Math.PI / 2, 0, 0]} material={m.stripe}><planeGeometry args={[0.7, 2.6]} /></mesh>
        </group>
      ))}

      {/* neon curb lights along the avenue */}
      {[[AVENUE.x0, -26, CROSS.z0], [AVENUE.x1, -26, CROSS.z0], [AVENUE.x0, CROSS.z1, 110], [AVENUE.x1, CROSS.z1, 110]].map(([x, z0, z1], i) => (
        <mesh key={'curb' + i} position={[x, CURB + 0.02, (z0 + z1) / 2]} material={i % 2 ? m.teal : m.pink}>
          <boxGeometry args={[0.06, 0.04, z1 - z0]} />
        </mesh>
      ))}
      <mesh position={[0, CURB + 0.02, AVENUE.z0]} material={m.yellow}><boxGeometry args={[12, 0.04, 0.06]} /></mesh>

      {/* streetlights */}
      {[-20, -6, 36, 50, 64, 78].flatMap((z) => [[-7.2, z, 1], [7.2, z, -1]]).map(([x, z, dir], i) => (
        <StreetLight key={'sl' + i} position={[x, CURB, z]} dir={dir} color={i % 4 < 2 ? NEON.teal : NEON.pink} light={i < 4} />
      ))}
      {[-40, -26, 26, 40].flatMap((x) => [[x, 12.8, -1], [x, 27.2, 1]]).map(([x, z, dir], i) => (
        <StreetLight key={'cl' + i} position={[x, CURB, z]} dir={dir} axis="z" color={i % 2 ? NEON.purple : NEON.yellow} light={false} />
      ))}

      {/* plaza planters + benches in front of the gallery */}
      {[[-4.2, -29], [4.2, -29]].map(([x, z], i) => (
        <Planter key={i} position={[x, CURB, z]} color={i ? NEON.teal : NEON.pink} />
      ))}

      {/* venues: Storms Records and Neon Lounge are enterable; the others open in later milestones */}
      <Venue id="cinema" name="VISION CINEMA" sub="NOW SHOWING · AI FILMS" color={NEON.purple} accent={NEON.yellow} x0={-34} x1={-10} z0={-22} z1={8} h={16} facing="+x" seed={1} />
      <Venue id="records" name="STORMS RECORDS" sub="VINYL · STEMS · MERCH" color={NEON.teal} accent={NEON.pink} x0={10} x1={30} z0={-20} z1={6} h={12} facing="-x" seed={2} interior={<RecordsInterior x0={10} x1={30} z0={-20} z1={6} />} />
      <Venue id="books" name="REIGN BOOKS" sub="EBOOKS · AUDIOBOOKS" color={NEON.yellow} accent={NEON.purple} x0={-30} x1={-10} z0={32} z1={52} h={14} facing="+x" seed={3} />
      <Venue id="lounge" name="NEON LOUNGE" sub="LIVE SETS · LISTENING PARTIES" color={NEON.pink} accent={NEON.teal} x0={10} x1={32} z0={32} z1={56} h={10} facing="-x" seed={4} interior={<LoungeInterior x0={10} x1={32} z0={32} z1={56} />} />

      <Skyline />
    </group>
  )
}

function StreetLight({ position, dir = 1, axis = 'x', color, light }) {
  const mats = getMaterials()
  const glow = useMemo(() => mats.neon(color, 4), [mats, color])
  const arm = axis === 'x' ? [dir * 1.1, 0, 0] : [0, 0, dir * 1.1]
  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <CylinderCollider args={[3, 0.12]} position={[0, 3, 0]} />
      <mesh position={[0, 3, 0]} material={mats.darkMetal} castShadow><cylinderGeometry args={[0.07, 0.11, 6, 12]} /></mesh>
      <mesh position={[arm[0] / 2, 6, arm[2] / 2]} rotation={axis === 'x' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]} material={mats.darkMetal}>
        <cylinderGeometry args={[0.05, 0.05, 1.2, 8]} />
      </mesh>
      <mesh position={[arm[0], 5.92, arm[2]]} material={glow}><boxGeometry args={[axis === 'x' ? 0.7 : 0.18, 0.06, axis === 'x' ? 0.18 : 0.7]} /></mesh>
      <mesh position={[0, 0.9, 0]} material={glow}><boxGeometry args={[0.03, 1.2, 0.16]} /></mesh>
      {light && <pointLight position={[arm[0], 5.5, arm[2]]} color={color} intensity={14} distance={16} decay={1.5} />}
    </RigidBody>
  )
}

function Planter({ position, color }) {
  const mats = getMaterials()
  const glow = useMemo(() => mats.neon(color, 2.5), [mats, color])
  const leaves = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0f2a24', roughness: 0.8, emissive: '#05201b' }), [])
  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <CuboidCollider args={[1.2, 0.35, 0.6]} position={[0, 0.35, 0]} />
      <mesh position={[0, 0.35, 0]} material={mats.marbleWall(1, 0.4)} castShadow receiveShadow><boxGeometry args={[2.4, 0.7, 1.2]} /></mesh>
      <mesh position={[0, 0.71, 0]} material={glow}><boxGeometry args={[2.42, 0.03, 1.22]} /></mesh>
      {[-0.7, 0, 0.7].map((x, i) => (
        <mesh key={x} position={[x, 0.95 + i * 0.05, 0]} material={leaves}><icosahedronGeometry args={[0.38, 1]} /></mesh>
      ))}
    </RigidBody>
  )
}

// Venue building with marquee, neon blades and a window tower. Pass `interior` to make it
// enterable: it then gets real walls, a working double door and the interior you supply.
// Without `interior` it's a closed exterior with a locked door that opens in a later milestone.
const SHELL_T = 0.4
const SHELL_H = 6
const DOOR_HALF = 1.6
const DOOR_H = 3.6

function Venue({ id, name, sub, color, accent, x0, x1, z0, z1, h, facing, seed, interior }) {
  const mats = getMaterials()
  const w = x1 - x0, d = z1 - z0
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
  const sign = useMemo(() => neonSignTexture(name, color, { size: 160 }), [name, color])
  const subTex = useMemo(() => neonSignTexture(sub, accent, { size: 64, font: FONTS.mono, weight: 500, height: 128 }), [sub, accent])
  const tower = useMemo(() => mats.windows(seed, 2, Math.max(1, Math.round(h / 8))), [mats, seed, h])
  const podium = useMemo(() => mats.marbleWall(3, 0.6), [mats])
  const floor = useMemo(() => mats.marbleFloor(3, 3), [mats])
  const ceiling = useMemo(() => new THREE.MeshStandardMaterial({ color: '#07060c', roughness: 0.6, metalness: 0.3 }), [])
  const glow = useMemo(() => mats.neon(color, 3), [mats, color])
  const glow2 = useMemo(() => mats.neon(accent, 3), [mats, accent])
  // facade on the avenue side
  const fx = facing === '+x' ? x1 : x0
  const s = facing === '+x' ? 1 : -1
  const yaw = facing === '+x' ? Math.PI / 2 : -Math.PI / 2
  const enterable = !!interior

  useEffect(() => {
    if (enterable) return
    return registerInteractable('venue-' + id, {
      position: new THREE.Vector3(fx + s * 0.8, CURB, cz),
      radius: 3,
      label: `${name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())} · opens soon`,
      onInteract: () => useStore.getState().showToast(`${name} is built in a later milestone. The Reign Gallery, Storms Records and Neon Lounge are open.`),
    })
  }, [id, enterable])

  // enterable shell: [x, y, z, sx, sy, sz] boxes in world space
  const t = SHELL_T, IH = SHELL_H
  const facadeX = fx - s * t / 2
  const backX = (facing === '+x' ? x0 : x1) + s * t / 2
  const segA = cz - DOOR_HALF - z0
  const segB = z1 - (cz + DOOR_HALF)
  const shell = enterable ? [
    [backX, CURB + IH / 2, cz, t, IH, d],
    [cx, CURB + IH / 2, z0 + t / 2, w, IH, t],
    [cx, CURB + IH / 2, z1 - t / 2, w, IH, t],
    [facadeX, CURB + IH / 2, z0 + segA / 2, t, IH, segA],
    [facadeX, CURB + IH / 2, z1 - segB / 2, t, IH, segB],
    [facadeX, CURB + DOOR_H + (IH - DOOR_H) / 2, cz, t, IH - DOOR_H, DOOR_HALF * 2],
  ] : []
  const roofY = CURB + IH + 0.15

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {enterable ? (
          <>
            {shell.map(([x, y, z, sx, sy, sz], i) => <CuboidCollider key={i} args={[sx / 2, sy / 2, sz / 2]} position={[x, y, z]} />)}
            <CuboidCollider args={[w / 2, (h - IH) / 2, d / 2]} position={[cx, CURB + IH + (h - IH) / 2, cz]} />
          </>
        ) : (
          <CuboidCollider args={[w / 2, h / 2, d / 2]} position={[cx, CURB + h / 2, cz]} />
        )}
      </RigidBody>
      {enterable ? (
        <>
          {shell.map(([x, y, z, sx, sy, sz], i) => (
            <mesh key={i} position={[x, y, z]} material={podium} castShadow receiveShadow><boxGeometry args={[sx, sy, sz]} /></mesh>
          ))}
          <mesh position={[cx, roofY, cz]} material={ceiling}><boxGeometry args={[w, 0.3, d]} /></mesh>
          <mesh position={[cx, CURB + 0.004, cz]} rotation={[-Math.PI / 2, 0, 0]} material={floor} receiveShadow><planeGeometry args={[w - t * 2, d - t * 2]} /></mesh>
          <DoubleDoor id={'door-' + id} center={[facadeX, CURB, cz]} halfWidth={DOOR_HALF} height={DOOR_H} facing={facing === '+x' ? Math.PI / 2 : -Math.PI / 2} accent={accent} label={`${name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())} doors`} />
          {interior}
        </>
      ) : (
        <mesh position={[cx, CURB + 3, cz]} material={podium} castShadow receiveShadow><boxGeometry args={[w, 6, d]} /></mesh>
      )}
      <mesh position={[cx, CURB + 6 + (h - 6) / 2 + (enterable ? 0.15 : 0), cz]} material={tower} castShadow><boxGeometry args={[w - 0.4, h - 6 - (enterable ? 0.3 : 0), d - 0.4]} /></mesh>
      <mesh position={[cx, CURB + h + 0.05, cz]} material={glow}><boxGeometry args={[w, 0.1, d]} /></mesh>
      <group position={[fx, CURB, cz]} rotation={[0, yaw, 0]}>
        {/* marquee */}
        <mesh position={[0, 7.8, 0.06]}>
          <planeGeometry args={[Math.min(d - 2, 16), Math.min(d - 2, 16) / 4]} />
          <meshBasicMaterial map={sign} transparent toneMapped={false} depthWrite={false} />
        </mesh>
        <mesh position={[0, 5.4, 1.5]} material={mats.darkMetal}><boxGeometry args={[Math.min(d - 4, 12), 0.5, 3]} /></mesh>
        <mesh position={[0, 5.4, 3.02]}>
          <planeGeometry args={[Math.min(d - 4, 12), 0.5]} />
          <meshBasicMaterial map={subTex} transparent toneMapped={false} />
        </mesh>
        <mesh position={[0, 5.12, 1.5]} rotation={[Math.PI / 2, 0, 0]} material={glow2}><planeGeometry args={[Math.min(d - 4, 12) - 0.4, 2.6]} /></mesh>
        {enterable ? (
          <>
            <mesh position={[-DOOR_HALF - 0.08, DOOR_H / 2, 0.06]} material={glow}><boxGeometry args={[0.1, DOOR_H, 0.1]} /></mesh>
            <mesh position={[DOOR_HALF + 0.08, DOOR_H / 2, 0.06]} material={glow}><boxGeometry args={[0.1, DOOR_H, 0.1]} /></mesh>
            <mesh position={[0, DOOR_H + 0.08, 0.06]} material={glow}><boxGeometry args={[DOOR_HALF * 2 + 0.26, 0.1, 0.1]} /></mesh>
          </>
        ) : (
          <>
            {/* locked doors */}
            <mesh position={[0, 1.8, 0.04]} material={mats.glass}><boxGeometry args={[3.4, 3.6, 0.1]} /></mesh>
            <mesh position={[0, 1.8, 0.1]} material={glow}><boxGeometry args={[0.05, 3.6, 0.05]} /></mesh>
            <mesh position={[0, 3.66, 0.1]} material={glow}><boxGeometry args={[3.5, 0.08, 0.08]} /></mesh>
          </>
        )}
        {/* vertical neon blades */}
        {[-1, 1].map((k) => (
          <mesh key={k} position={[k * (d / 2 - 0.4), (h + 0.2) / 2, 0.12]} material={k > 0 ? glow : glow2}><boxGeometry args={[0.12, h, 0.12]} /></mesh>
        ))}
      </group>
    </group>
  )
}

// Background towers. Close ones have colliders; all use emissive window textures.
function Skyline() {
  const mats = getMaterials()
  const towers = useMemo(() => {
    const out = []
    let seed = 7
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    const spots = [
      [-30, -48], [30, -48], [-42, -30], [42, -30], [-26, -70], [26, -70], [0, -78],
      [-50, 0], [50, 0], [-48, 44], [48, 44], [-30, 72], [30, 72], [-60, -60], [60, -60],
      [-70, 20], [70, 20], [-22, 92], [22, 92], [-80, 70], [80, 70], [-90, -20], [90, -20],
    ]
    for (const [x, z] of spots) {
      if (x > GALLERY.minX - 4 && x < GALLERY.maxX + 4 && z > GALLERY.minZ - 4 && z < GALLERY.maxZ + 4) continue
      const w = 10 + rnd() * 10
      const d = 10 + rnd() * 10
      const h = 28 + rnd() * 60
      out.push({ x, z, w, d, h, seed: Math.floor(rnd() * 3), accent: [NEON.purple, NEON.pink, NEON.teal, NEON.yellow][Math.floor(rnd() * 4)] })
    }
    return out
  }, [])
  const matsBySeed = useMemo(() => [0, 1, 2].map((s) => mats.windows(s + 10, 3, 5)), [mats])
  const accents = useMemo(() => Object.fromEntries([NEON.purple, NEON.pink, NEON.teal, NEON.yellow].map((c) => [c, mats.neon(c, 3)])), [mats])
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {towers.map((t, i) => (
          <CuboidCollider key={i} args={[t.w / 2, t.h / 2, t.d / 2]} position={[t.x, CURB + t.h / 2, t.z]} />
        ))}
      </RigidBody>
      {towers.map((t, i) => (
        <group key={i} position={[t.x, CURB, t.z]}>
          <mesh position={[0, t.h / 2, 0]} material={matsBySeed[t.seed]}><boxGeometry args={[t.w, t.h, t.d]} /></mesh>
          <mesh position={[0, t.h + 0.1, 0]} material={accents[t.accent]}><boxGeometry args={[t.w + 0.1, 0.2, t.d + 0.1]} /></mesh>
          <mesh position={[t.w / 2, t.h / 2, t.d / 2]} material={accents[t.accent]}><boxGeometry args={[0.15, t.h, 0.15]} /></mesh>
          {i % 3 === 0 && (
            <mesh position={[0, t.h + 4, 0]} material={accents[t.accent]}><cylinderGeometry args={[0.08, 0.08, 8, 6]} /></mesh>
          )}
        </group>
      ))}
    </group>
  )
}
