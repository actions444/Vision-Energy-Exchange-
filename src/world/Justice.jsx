import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface, blackMarble, signatureMarble } from './materials.js'
import { registerInteractable } from '../state/runtime.js'
import { useStore } from '../state/store.js'
import { registerLightAnchor } from '../state/environment.js'
import { DoubleDoor, SingleDoor } from './Door.jsx'
import { RenovatedShell, EntranceDressing } from './facade/Renovated.jsx'
import { facadeMats } from './facade/materials.js'
import { BrandSign } from './signs.jsx'
import { Chair, Table, Counter, Sofa, Shelf, Plant, CeilingLight, PendantLight, WallScreen } from './furniture.jsx'
import { Bench, Planter } from './props.jsx'
import { HumanoidCrowd, makeCrowd } from '../npc/HumanoidCrowd.jsx'
import { Chandelier } from './Chandelier.jsx'
import { useJustice } from '../state/justice.js'
import { canvasTexture } from './canvasText.js'
import { ElevatorCar } from './ElevatorCar.jsx'
import { carById, carHole } from '../config/elevators.js'
import { Gate } from './jobkit.jsx'
import { FONTS } from '../config/theme.js'
import { speakLine } from '../audio/tts.js'

// ============================================================================
// VISION STORMS JUSTICE & REHABILITATION DISTRICT
// ----------------------------------------------------------------------------
// A civic campus at the north end of the avenue. Phase 1 (this file) delivers a
// working Police Headquarters with an accessible jail section, institutional
// interiors, NPC staff and inmates, and an OPTIONAL fictional roleplay system
// with clear exit and report options. Everything is fiction: players can never
// detain or imprison other players. Secure areas are freely walkable so nobody
// is ever trapped. The remaining buildings (county jail, state prison,
// courthouse, rehabilitation center, visitor center) expand from here.
// ============================================================================

// Campus footprint (also reserved from the skyline in City.jsx)
export const JUSTICE = { x0: 14, x1: 116, z0: 70, z1: 120 }
export const GROUND = 0.15 // campus sits on the raised sidewalk

const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }

// ---------------------------------------------------------------------------
// Reusable institutional building shell: four walls with one doorway, floor,
// ceiling, flat roof, physics colliders, and a working double door. Children
// are the interior, rendered in world space (so place furniture with absolute
// coordinates). `doorSide` is 'south' | 'north' | 'east' | 'west'.
// ---------------------------------------------------------------------------
export const T = 0.4 // wall thickness

/**
 * Rectangle pieces that tile a slab (ax0..ax1 x az0..az1) minus any holes. Used for the floor
 * slabs of multi-storey buildings, which have openings for the elevator shaft and the stairs.
 */
function slabPieces(ax0, ax1, az0, az1, holes) {
  const xs = [ax0, ax1]
  for (const h of holes) {
    if (h.x0 > ax0 && h.x0 < ax1) xs.push(h.x0)
    if (h.x1 > ax0 && h.x1 < ax1) xs.push(h.x1)
  }
  xs.sort((a, b) => a - b)
  const out = []
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i], b = xs[i + 1]
    if (b - a < 1e-6) continue
    const cuts = holes.filter((h) => h.x0 < b - 1e-6 && h.x1 > a + 1e-6).map((h) => [Math.max(az0, h.z0), Math.min(az1, h.z1)]).sort((p, q) => p[0] - q[0])
    let z = az0
    for (const [c0, c1] of cuts) {
      if (c0 > z + 1e-6) out.push({ x0: a, x1: b, z0: z, z1: c0 })
      z = Math.max(z, c1)
    }
    if (z < az1 - 1e-6) out.push({ x0: a, x1: b, z0: z, z1: az1 })
  }
  return out
}

/**
 * `h` is the height of ONE floor. With `floors` > 1 the building is `floors * h` tall: floor slabs
 * (with `holes` for the elevator shaft and stairs, each {x0,x1,z0,z1}), a facade of window bands and
 * ledges on the upper floors (`windowSeed`), and `upperFloorMat` as the upper floor surface.
 */
export function JusticeBuilding({
  id, x0, x1, z0, z1, h = 5, floors = 1, holes = [], upperFloorMat, windowSeed, doorSide = 'south', doorHalf = 1.2, doorH = 2.8,
  wall = 'concrete', wallColor = '#9a958c', floorMat, doorAccent = '#2f6fe0',
  doorLabel = 'doors', roofColor = '#6f6a63', children,
  sign, signWidth = 8, trim, groundWindows = false, upperW, upperH, parts, canopyW = 6.2, seed = 3, noDressing = false,
}) {
  const w = x1 - x0, d = z1 - z0
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
  const y0 = GROUND
  const H = floors * h // total height
  const ceil = useMemo(() => new THREE.MeshStandardMaterial({ color: '#edeae4', roughness: 0.95 }), [])
  const floor = floorMat || surface('tile', Math.max(2, w / 3), Math.max(2, d / 3))
  const upper = upperFloorMat || surface('tile', Math.max(2, w / 3), Math.max(2, d / 3), { color: '#cfcac0' })

  const doorPos = {
    south: [cx, y0, z0], north: [cx, y0, z1], west: [x0, y0, cz], east: [x1, y0, cz],
  }[doorSide]
  const doorFacing = { south: Math.PI, north: 0, west: -Math.PI / 2, east: Math.PI / 2 }[doorSide]
  const horizontal = doorSide === 'south' || doorSide === 'north'

  // collider walls (full height). The wall carrying the door is split into two jambs + a lintel.
  const walls = []
  const addSolid = (side) => {
    if (side === 'south') walls.push([cx, y0 + H / 2, z0 + T / 2, w, H, T])
    if (side === 'north') walls.push([cx, y0 + H / 2, z1 - T / 2, w, H, T])
    if (side === 'west') walls.push([x0 + T / 2, y0 + H / 2, cz, T, H, d])
    if (side === 'east') walls.push([x1 - T / 2, y0 + H / 2, cz, T, H, d])
  }
  const addDoored = (side) => {
    if (horizontal) {
      const wz = side === 'south' ? z0 + T / 2 : z1 - T / 2
      const segA = (cx - doorHalf) - x0, segB = x1 - (cx + doorHalf)
      walls.push([x0 + segA / 2, y0 + H / 2, wz, segA, H, T])
      walls.push([x1 - segB / 2, y0 + H / 2, wz, segB, H, T])
      walls.push([cx, y0 + doorH + (H - doorH) / 2, wz, doorHalf * 2, H - doorH, T])
    } else {
      const wx = side === 'west' ? x0 + T / 2 : x1 - T / 2
      const segA = (cz - doorHalf) - z0, segB = z1 - (cz + doorHalf)
      walls.push([wx, y0 + H / 2, z0 + segA / 2, T, H, segA])
      walls.push([wx, y0 + H / 2, z1 - segB / 2, T, H, segB])
      walls.push([wx, y0 + doorH + (H - doorH) / 2, cz, T, H - doorH, doorHalf * 2])
    }
  }
  for (const side of ['south', 'north', 'west', 'east']) (side === doorSide ? addDoored : addSolid)(side)

  // renovated facade: punched openings with reveals, frames, string courses, cornice, parapet
  const spec = useMemo(() => {
    const facing = { south: '-z', north: '+z', west: '-x', east: '+x' }[doorSide]
    const at = horizontal ? cx : cz
    const gw = groundWindows === false ? false : groundWindows.map((g) => ({ at: at + g.off, half: g.half, v0: g.v0 ?? 0.9, v1: g.v1 ?? 3.4 }))
    return {
      x0, x1, z0, z1, h: H, ih: h, facing, base: y0, seed, wall: wall === 'limestone' ? 'stone' : wall, wallColor, trim: trim || (wall === 'concrete' ? 'granite' : 'stone'),
      door: { at, half: doorHalf, h: doorH }, groundWindows: gw, floorH: floors > 1 ? h : undefined, plasterAll: true,
      signClear: sign ? signWidth / 2 + 0.6 : 0, upperW, upperH, parapetH: 1.1, T,
      openings: {},
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // floor slabs between storeys, with openings (the top floor's slab is the roof)
  const slabs = useMemo(() => {
    const out = []
    for (let k = 1; k < floors; k++) for (const p of slabPieces(x0, x1, z0, z1, holes)) out.push({ ...p, y: y0 + k * h - 0.15 })
    return out
  }, [floors, x0, x1, z0, z1, h, holes]) // eslint-disable-line react-hooks/exhaustive-deps
  const slabMat = useMemo(() => [ceil, ceil, upper, ceil, ceil, ceil], [ceil, upper])

  return (
    <group>
      {/* colliders: the walls, the floor slabs, plus a roof slab so you can't walk through the top */}
      <RigidBody type="fixed" colliders={false}>
        {walls.map(([mx, my, mz, sx, sy, sz], i) => (
          <CuboidCollider key={i} args={[sx / 2, sy / 2, sz / 2]} position={[mx, my, mz]} />
        ))}
        {slabs.map((p, i) => (
          <CuboidCollider key={'s' + i} args={[(p.x1 - p.x0) / 2, 0.15, (p.z1 - p.z0) / 2]} position={[(p.x0 + p.x1) / 2, p.y, (p.z0 + p.z1) / 2]} />
        ))}
        <CuboidCollider args={[w / 2, 0.25, d / 2]} position={[cx, y0 + H + 0.25, cz]} />
      </RigidBody>

      <RenovatedShell spec={spec} />
      {slabs.map((p, i) => (
        <mesh key={'s' + i} position={[(p.x0 + p.x1) / 2, p.y, (p.z0 + p.z1) / 2]} material={slabMat} receiveShadow>
          <boxGeometry args={[p.x1 - p.x0, 0.3, p.z1 - p.z0]} />
        </mesh>
      ))}

      {/* ground floor and the top-floor ceiling */}
      <mesh position={[cx, y0 + 0.01, cz]} rotation={[-Math.PI / 2, 0, 0]} material={floor} receiveShadow>
        <planeGeometry args={[w - T, d - T]} />
      </mesh>
      <mesh position={[cx, y0 + H - 0.1, cz]} material={ceil}><boxGeometry args={[w - T, 0.2, d - T]} /></mesh>

      {/* entrance: marble-and-brass surround, lettered fascia, canopy with downlights, lamps, planters */}
      {!noDressing && (
        <EntranceDressing
          origin={[doorPos[0], doorPos[2]]} base={y0} name={sign?.name} sub={sign?.sub} doorHalf={doorHalf} doorH={doorH} yaw={doorFacing}
          signWidth={signWidth} canopyW={canopyW} apron={[Math.min(12, 2 * doorHalf + 8), 3.2]} benchAt={doorHalf + 3.2} planterAt={doorHalf + 1.6}
          parts={{ sign: !!sign, forecourt: false, ...parts }}
        />
      )}
      <DoubleDoor id={'justice-door-' + id} center={doorPos} halfWidth={doorHalf} height={doorH} facing={doorFacing} accent={doorAccent} label={doorLabel} finish="bronze" />

      {/* interior furniture, cells, NPCs, dialogue kiosks etc. — only rendered while the camera is
          inside or near the building, same as Casino/Museum/Library/Gym */}
      <Gate x0={x0} x1={x1} z0={z0} z1={z1} pad={8}>
        {children}
      </Gate>
    </group>
  )
}

/**
 * An interior wall across the building at depth `z`, from x0 to x1, with one doorway of half-width
 * `gapHalf` centred on `gapCx`. The wall continues over the doorway (a lintel above `doorH`), so
 * there is no hole above the door.
 */
export function Partition({ z, x0, x1, gapCx, gapHalf, doorH, h = 5.2, material }) {
  const parts = [
    { c: (x0 + gapCx - gapHalf) / 2, w: gapCx - gapHalf - x0, y0: 0, hh: h },
    { c: (gapCx + gapHalf + x1) / 2, w: x1 - (gapCx + gapHalf), y0: 0, hh: h },
    { c: gapCx, w: gapHalf * 2, y0: doorH, hh: h - doorH }, // lintel
  ]
  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        {parts.map((s, i) => <CuboidCollider key={i} args={[s.w / 2, s.hh / 2, T / 2]} position={[s.c, GROUND + s.y0 + s.hh / 2, z]} />)}
      </RigidBody>
      {parts.map((s, i) => (
        <mesh key={i} position={[s.c, GROUND + s.y0 + s.hh / 2, z]} material={material} castShadow receiveShadow><boxGeometry args={[s.w, s.hh, T]} /></mesh>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Cell hardware
// ---------------------------------------------------------------------------

/** A static run of vertical steel bars `width` long, `height` tall, in a wall plane (local +x run). */
export function BarRun({ position, yaw = 0, width = 2.4, height = 2.4 }) {
  const m = getMaterials()
  const n = Math.max(2, Math.round(width / 0.16))
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, height - 0.04, 0]} material={m.blackSteel}><boxGeometry args={[width, 0.08, 0.08]} /></mesh>
      <mesh position={[0, 0.04, 0]} material={m.blackSteel}><boxGeometry args={[width, 0.08, 0.08]} /></mesh>
      <mesh position={[0, height / 2, 0]} material={m.blackSteel}><boxGeometry args={[width, 0.06, 0.06]} /></mesh>
      {Array.from({ length: n + 1 }, (_, i) => (
        <mesh key={i} position={[-width / 2 + i * (width / n), height / 2, 0]} material={m.darkMetal}>
          <cylinderGeometry args={[0.022, 0.022, height, 8]} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * An openable barred cell gate. Hinged like a door but drawn as bars. Fiction: anyone can open
 * it from either side, so no player is ever trapped. `hinge` on the floor, leaf runs along local
 * +x by `width`, `baseYaw` orients it, sign of `openAngle` picks the swing.
 */
export function BarGate({ id, hinge, width = 1.0, height = 2.4, baseYaw = 0, openAngle = 1.5, label = 'cell gate' }) {
  // reuse SingleDoor's swing+interaction by wrapping a bar leaf would need DoorLeaf internals;
  // simplest robust approach: a SingleDoor provides the collider+swing, and we overlay bars by
  // using style 'glass' (see-through) — but to keep real bars we render our own kinematic leaf.
  return (
    <SingleDoorBars id={id} hinge={hinge} width={width} height={height} baseYaw={baseYaw} openAngle={openAngle} label={label} />
  )
}

// A bar-leaf version of SingleDoor (kinematic physics leaf that swings on interact).
function SingleDoorBars({ id, hinge, width = 1.0, height = 2.4, baseYaw = 0, openAngle = 1.5, label = 'cell gate' }) {
  const m = getMaterials()
  const [open, setOpen] = useState(false)
  const openRef = useRef(open); openRef.current = open
  const body = useRef(); const angle = useRef(0)
  const q = useMemo(() => new THREE.Quaternion(), []); const e = useMemo(() => new THREE.Euler(), [])
  const c = Math.cos(baseYaw), s = Math.sin(baseYaw)
  const mid = useMemo(() => new THREE.Vector3(hinge[0] + (c * width) / 2, hinge[1] + 1, hinge[2] - (s * width) / 2), [hinge[0], hinge[1], hinge[2], c, s, width])
  useEffect(() => registerInteractable(id, {
    position: mid, radius: 1.9,
    label: () => (openRef.current ? `Close ${label}` : `Open ${label}`),
    onInteract: () => setOpen((o) => !o),
  }), [id, label, mid])
  useFrame((_, dt) => {
    const target = open ? openAngle : 0
    angle.current += (target - angle.current) * (1 - Math.exp(-5 * Math.min(dt, 0.05)))
    e.set(0, baseYaw + angle.current, 0); q.setFromEuler(e)
    body.current?.setNextKinematicRotation(q)
  })
  const n = Math.max(2, Math.round(width / 0.14))
  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={hinge} rotation={[0, baseYaw, 0]}>
      <CuboidCollider args={[width / 2, height / 2, 0.05]} position={[width / 2, height / 2, 0]} />
      <group userData={{ noBatch: true }}>
        <mesh position={[width / 2, height - 0.04, 0]} material={m.blackSteel}><boxGeometry args={[width, 0.08, 0.07]} /></mesh>
        <mesh position={[width / 2, 0.06, 0]} material={m.blackSteel}><boxGeometry args={[width, 0.1, 0.07]} /></mesh>
        <mesh position={[width / 2, height / 2, 0]} material={m.blackSteel}><boxGeometry args={[width, 0.05, 0.05]} /></mesh>
        {Array.from({ length: n + 1 }, (_, i) => (
          <mesh key={i} position={[0.03 + i * ((width - 0.06) / n), height / 2, 0]} material={m.darkMetal}><cylinderGeometry args={[0.02, 0.02, height, 8]} /></mesh>
        ))}
        {/* lock plate */}
        <mesh position={[width - 0.08, height * 0.46, 0]} material={m.chrome}><boxGeometry args={[0.1, 0.18, 0.1]} /></mesh>
      </group>
    </RigidBody>
  )
}

/** A steel bunk (optionally stacked). */
export function Bunk({ position, yaw = 0, stacked = false }) {
  const m = getMaterials()
  const frame = m.blackSteel
  const mattress = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2b3a4a', roughness: 0.9 }), [])
  const pillow = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c9ccd0', roughness: 0.9 }), [])
  const Bed = ({ y }) => (
    <group position={[0, y, 0]}>
      <mesh position={[0, 0, 0]} material={frame}><boxGeometry args={[0.95, 0.1, 1.95]} /></mesh>
      <mesh position={[0, 0.09, 0]} material={mattress} castShadow><boxGeometry args={[0.9, 0.12, 1.9]} /></mesh>
      <mesh position={[0, 0.16, -0.72]} material={pillow}><boxGeometry args={[0.7, 0.1, 0.4]} /></mesh>
    </group>
  )
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[0.5, 0.35, 1.0]} position={[0, 0.35, 0]} />
      {stacked && <CuboidCollider args={[0.5, 0.2, 1.0]} position={[0, 1.15, 0]} />}
      {[[-0.45, -0.9], [0.45, -0.9], [-0.45, 0.9], [0.45, 0.9]].map(([x, z], i) => (
        <mesh key={i} position={[x, (stacked ? 0.65 : 0.3), z]} material={frame}><boxGeometry args={[0.06, stacked ? 1.3 : 0.6, 0.06]} /></mesh>
      ))}
      <Bed y={0.55} />
      {stacked && <Bed y={1.15} />}
    </RigidBody>
  )
}

/** A stainless combination toilet-sink, the standard cell fixture. */
export function CellFixture({ position, yaw = 0 }) {
  const steel = getMaterials().chrome
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[0.28, 0.5, 0.22]} position={[0, 0.5, 0]} />
      <mesh position={[0, 0.78, -0.02]} material={steel}><boxGeometry args={[0.5, 0.5, 0.18]} /></mesh>
      <mesh position={[0, 0.3, 0.06]} material={steel}><boxGeometry args={[0.44, 0.4, 0.4]} /></mesh>
      <mesh position={[0, 0.5, 0.06]} material={steel}><cylinderGeometry args={[0.2, 0.2, 0.12, 20]} /></mesh>
      <mesh position={[0, 1.02, -0.04]} material={steel}><boxGeometry args={[0.34, 0.12, 0.2]} /></mesh>
    </RigidBody>
  )
}

/** A simple institutional ID-sign on a wall ("BOOKING", "CELL BLOCK A", …). */
export function RoomSign({ text, position, rotation = [0, 0, 0], width = 2.4, color = '#0e2a5c', glow = '#8fb6ff' }) {
  return <BrandSign text={text} position={position} rotation={rotation} width={width} size={92} color={color} glow={glow} />
}

// ---------------------------------------------------------------------------
// A talking NPC: a dialogue point co-located with a humanoid figure.
// `lines` is an array; each interact advances to the next line and loops.
// ---------------------------------------------------------------------------
export function useNpcDialogue(id, position, label, lines) {
  useEffect(() => {
    let i = 0
    return registerInteractable(id, {
      position: new THREE.Vector3(position[0], position[1] + 1, position[2]),
      radius: 2.4,
      label: () => label,
      onInteract: () => { const line = lines[i % lines.length]; useStore.getState().showToast(line); speakLine(line, { id }); i++ },
    })
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

// ---------------------------------------------------------------------------
// POLICE HEADQUARTERS  (+ accessible jail section behind the secure door)
// Footprint x[18,56] z[80,112]. South half = public hall + booking. North half
// = the holding wing (cell block). Player approaches from the south forecourt.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Shared building blocks for the multi-storey Justice buildings
// ---------------------------------------------------------------------------

/**
 * A switchback (U-shaped) staircase between two floors. Footprint x0..x1 by zA..zB, where zA is the
 * south edge you step on and off at. Flight A climbs north to a half-landing; flight B climbs back
 * south to the upper floor. Each flight has a ramp collider (so walking is smooth), treads, risers,
 * a glass balustrade and a steel handrail.
 */
export function UStair({ x0, x1, zA, zB, y, rise, landing = 1.6 }) {
  const m = getMaterials()
  const W = x1 - x0, fw = (W - 0.2) / 2
  const run = (zB - zA) - landing
  const half = rise / 2
  const ang = Math.atan2(half, run)
  const len = Math.hypot(run, half)
  const N = Math.max(8, Math.round(half / 0.19))
  const rs = half / N, ts = run / N
  const tread = useMemo(() => surface('concrete', 1, 1, { color: '#a29e96' }), [])
  const flights = [
    { xc: x0 + fw / 2, dz: 1, y0: y, z0: zA },
    { xc: x1 - fw / 2, dz: -1, y0: y + half, z0: zA + run },
  ]
  return (
    <group>
      {flights.map((f, fi) => {
        const rotX = f.dz > 0 ? -ang : ang
        const ny = Math.cos(ang), nz = f.dz > 0 ? -Math.sin(ang) : Math.sin(ang)
        const zm = f.z0 + (f.dz * run) / 2, ym = f.y0 + half / 2 + rs / 2
        const outerX = fi === 0 ? x0 + 0.04 : x1 - 0.04
        const innerX = f.xc + (fi === 0 ? 1 : -1) * (fw / 2)
        return (
          <group key={fi}>
            <RigidBody type="fixed" colliders={false}>
              <CuboidCollider args={[fw / 2, 0.1, len / 2]} position={[f.xc, ym - ny * 0.1, zm - nz * 0.1]} rotation={[rotX, 0, 0]} />
            </RigidBody>
            {Array.from({ length: N }, (_, i) => {
              const zc = f.z0 + f.dz * (i + 0.5) * ts
              const top = f.y0 + (i + 1) * rs
              return (
                <group key={i}>
                  <mesh position={[f.xc, top - 0.03, zc]} material={tread} castShadow receiveShadow><boxGeometry args={[fw, 0.06, ts + 0.03]} /></mesh>
                  <mesh position={[f.xc, top - rs / 2, zc - f.dz * (ts / 2)]} material={tread}><boxGeometry args={[fw, rs, 0.03]} /></mesh>
                </group>
              )
            })}
            <mesh position={[f.xc, ym - 0.2, zm]} rotation={[rotX, 0, 0]} material={tread}><boxGeometry args={[fw, 0.2, len]} /></mesh>
            {[outerX, innerX].map((rx, ri) => (
              <group key={ri}>
                <mesh position={[rx, ym + ny * 0.95, zm + nz * 0.95]} rotation={[rotX, 0, 0]} material={m.chrome}><boxGeometry args={[0.05, 0.05, len]} /></mesh>
                <mesh position={[rx, ym + ny * 0.5, zm + nz * 0.5]} rotation={[rotX, 0, 0]} material={m.glass}><boxGeometry args={[0.02, 0.85, len]} /></mesh>
              </group>
            ))}
          </group>
        )
      })}
      {/* the half-landing */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[W / 2, 0.1, landing / 2]} position={[(x0 + x1) / 2, y + half - 0.1, zB - landing / 2]} />
      </RigidBody>
      <mesh position={[(x0 + x1) / 2, y + half - 0.1, zB - landing / 2]} material={tread} receiveShadow><boxGeometry args={[W, 0.2, landing]} /></mesh>
    </group>
  )
}

/**
 * A walled room with one working door, built from wall boxes (with colliders) that run the full
 * floor height. `doorAt` is the door's centre along its wall. Doors swing into the room.
 * `glassSide` makes that side's wall glass (an office front, an observation window).
 */
export function BoxRoom({ id, x0, x1, z0, z1, y = GROUND, h = 5.2, doorSide = 'south', doorAt, doorW = 1.1, doorH = 2.3, glassSide, color = '#d8d3ca', label = 'door', doorStyle }) {
  const m = getMaterials()
  const t = 0.14
  const wall = useMemo(() => surface('plaster', 2, 1.5, { color }), [color])
  const pieces = []
  const mk = (horiz, fixed, mid, len, cy, hh, glass) => pieces.push({ c: horiz ? [mid, cy, fixed] : [fixed, cy, mid], s: horiz ? [len, hh, t] : [t, hh, len], glass })
  for (const side of ['south', 'north', 'west', 'east']) {
    const horiz = side === 'south' || side === 'north'
    const fixed = side === 'south' ? z0 + t / 2 : side === 'north' ? z1 - t / 2 : side === 'west' ? x0 + t / 2 : x1 - t / 2
    const a0 = horiz ? x0 : z0, a1 = horiz ? x1 : z1
    const glass = glassSide === side
    if (doorSide === side) {
      const g0 = doorAt - doorW / 2, g1 = doorAt + doorW / 2
      if (g0 - a0 > 0.02) mk(horiz, fixed, (a0 + g0) / 2, g0 - a0, y + h / 2, h, glass)
      if (a1 - g1 > 0.02) mk(horiz, fixed, (g1 + a1) / 2, a1 - g1, y + h / 2, h, glass)
      mk(horiz, fixed, doorAt, doorW, y + doorH + (h - doorH) / 2, h - doorH, false)
    } else mk(horiz, fixed, (a0 + a1) / 2, a1 - a0, y + h / 2, h, glass)
  }
  const hinge = doorSide === 'south' ? [doorAt - doorW / 2, y, z0 + t / 2]
    : doorSide === 'north' ? [doorAt - doorW / 2, y, z1 - t / 2]
    : doorSide === 'west' ? [x0 + t / 2, y, doorAt - doorW / 2]
    : [x1 - t / 2, y, doorAt - doorW / 2]
  const baseYaw = doorSide === 'south' || doorSide === 'north' ? 0 : -Math.PI / 2
  const openAngle = doorSide === 'south' ? -1.5 : doorSide === 'north' ? 1.5 : doorSide === 'west' ? 1.5 : -1.5
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {pieces.map((p, i) => <CuboidCollider key={i} args={[p.s[0] / 2, p.s[1] / 2, p.s[2] / 2]} position={p.c} />)}
      </RigidBody>
      {pieces.map((p, i) => (
        <mesh key={i} position={p.c} material={p.glass ? m.glass : wall} castShadow={!p.glass} receiveShadow={!p.glass}><boxGeometry args={p.s} /></mesh>
      ))}
      <SingleDoor id={id + '-door'} hinge={hinge} width={doorW} height={doorH} baseYaw={baseYaw} openAngle={openAngle} label={label} style={doorStyle} />
    </group>
  )
}

/** A wall-mounted live-dispatch map screen (fictional city, painted at startup). */
function DispatchScreen({ position, yaw = 0, size = [6, 3.2] }) {
  const m = getMaterials()
  const screen = useMemo(() => new THREE.MeshBasicMaterial({
    toneMapped: false,
    map: canvasTexture(640, 340, (ctx, w, h) => {
      ctx.fillStyle = '#05080f'; ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = 'rgba(80,140,255,0.22)'; ctx.lineWidth = 1
      for (let x = 0; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
      for (let y = 0; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
      ctx.strokeStyle = 'rgba(160,190,255,0.55)'; ctx.lineWidth = 6
      ctx.beginPath(); ctx.moveTo(w * 0.5, 44); ctx.lineTo(w * 0.5, h); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, h * 0.58); ctx.lineTo(w, h * 0.58); ctx.stroke()
      const cols = ['#ff3b3b', '#3b7bff', '#2fd0c4', '#ffd36b']
      for (let i = 0; i < 14; i++) { ctx.fillStyle = cols[i % 4]; ctx.beginPath(); ctx.arc(40 + hash(i * 3) * (w - 80), 70 + hash(i * 7) * (h - 110), 7, 0, Math.PI * 2); ctx.fill() }
      ctx.fillStyle = '#7ef0e2'; ctx.font = `700 22px ${FONTS.mono}`; ctx.textAlign = 'left'
      ctx.fillText('VISION STORMS PD · LIVE DISPATCH (FICTIONAL)', 16, 30)
    }),
  }), [])
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0, -0.04]} material={m.blackSteel}><boxGeometry args={[size[0] + 0.2, size[1] + 0.2, 0.08]} /></mesh>
      <mesh material={screen}><planeGeometry args={size} /></mesh>
    </group>
  )
}

/**
 * A parked police cruiser (an original design, not drivable): black and white body, tinted glass,
 * "POLICE" on the doors, and a light bar that flashes red and blue in a three-flash pattern, with
 * matching coloured light that sweeps over the pavement and nearby walls.
 */
export function Cruiser({ position, yaw = 0 }) {
  const m = getMaterials()
  const black = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0f1013', roughness: 0.32, metalness: 0.6 }), [])
  const white = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e9eaee', roughness: 0.32, metalness: 0.5 }), [])
  const tint = useMemo(() => new THREE.MeshStandardMaterial({ color: '#16202b', roughness: 0.08, metalness: 0.85 }), [])
  const tyre = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0b0b0d', roughness: 0.9 }), [])
  const red = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a0808', emissive: '#ff2020', emissiveIntensity: 0.1, toneMapped: false }), [])
  const blue = useMemo(() => new THREE.MeshStandardMaterial({ color: '#080b2a', emissive: '#2a5bff', emissiveIntensity: 0.1, toneMapped: false }), [])
  const lamp = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff2cc', emissiveIntensity: 1.2, toneMapped: false }), [])
  const tail = useMemo(() => new THREE.MeshStandardMaterial({ color: '#300', emissive: '#ff1a1a', emissiveIntensity: 1.0, toneMapped: false }), [])
  const anchors = useMemo(() => {
    const off = (dx) => new THREE.Vector3(position[0] + Math.cos(yaw) * dx, GROUND + 2.2, position[2] - Math.sin(yaw) * dx)
    return [
      { position: off(-0.5), color: new THREE.Color('#ff2020'), intensity: 0, distance: 13, range: 34 },
      { position: off(0.5), color: new THREE.Color('#2a5bff'), intensity: 0, distance: 13, range: 34 },
    ]
  }, [position[0], position[2], yaw]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const offs = anchors.map((a) => registerLightAnchor(a)); return () => offs.forEach((o) => o()) }, [anchors])
  useFrame(() => {
    // three red flashes, a gap, three blue flashes, a gap (about 110 ms per step)
    const ph = Math.floor(performance.now() / 110) % 14
    const redOn = ph < 5 && ph % 2 === 0
    const blueOn = ph >= 7 && ph < 12 && ph % 2 === 1
    red.emissiveIntensity = redOn ? 3.4 : 0.1
    blue.emissiveIntensity = blueOn ? 3.4 : 0.1
    anchors[0].intensity = redOn ? 16 : 0
    anchors[1].intensity = blueOn ? 16 : 0
  })
  return (
    <group position={[position[0], GROUND, position[2]]} rotation={[0, yaw, 0]}>
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.97, 0.75, 2.35]} position={[0, 0.75, 0]} /></RigidBody>
      <mesh position={[0, 0.62, 0]} material={black} castShadow><boxGeometry args={[1.9, 0.62, 4.7]} /></mesh>
      <mesh position={[0, 0.68, -0.15]} material={white} castShadow><boxGeometry args={[1.93, 0.5, 2.3]} /></mesh>
      <mesh position={[0, 1.18, -0.3]} material={tint} castShadow><boxGeometry args={[1.62, 0.56, 2.25]} /></mesh>
      <mesh position={[0, 1.49, -0.3]} material={white}><boxGeometry args={[1.66, 0.06, 2.3]} /></mesh>
      <mesh position={[-0.3, 1.58, -0.3]} material={red}><boxGeometry args={[0.55, 0.1, 0.34]} /></mesh>
      <mesh position={[0.3, 1.58, -0.3]} material={blue}><boxGeometry args={[0.55, 0.1, 0.34]} /></mesh>
      {[-0.65, 0.65].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.74, 2.36]} material={lamp}><boxGeometry args={[0.42, 0.12, 0.06]} /></mesh>
          <mesh position={[x, 0.74, -2.36]} material={tail}><boxGeometry args={[0.42, 0.1, 0.06]} /></mesh>
        </group>
      ))}
      {[[-0.96, 1.45], [0.96, 1.45], [-0.96, -1.45], [0.96, -1.45]].map(([x, z], i) => (
        <group key={i} position={[x, 0.34, z]}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={tyre}><cylinderGeometry args={[0.34, 0.34, 0.24, 18]} /></mesh>
          <mesh position={[x > 0 ? 0.13 : -0.13, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={m.chrome}><cylinderGeometry args={[0.18, 0.18, 0.02, 14]} /></mesh>
        </group>
      ))}
      <BrandSign text="POLICE" position={[0.975, 0.7, -0.15]} rotation={[0, Math.PI / 2, 0]} width={1.5} size={64} color="#0e2a5c" glow="#8fb6ff" />
      <BrandSign text="POLICE" position={[-0.975, 0.7, -0.15]} rotation={[0, -Math.PI / 2, 0]} width={1.5} size={64} color="#0e2a5c" glow="#8fb6ff" />
    </group>
  )
}

// ---------------------------------------------------------------------------
// POLICE HEADQUARTERS: three floors with a real elevator and a switchback staircase.
// Footprint x[18,56] z[80,112].
//   Floor 1: public hall + booking (black marble), and Cell Block A behind the secure door.
//   Floor 2: Detectives & Records: open-plan desks, records shelves, interview rooms, captain's office.
//   Floor 3: Command & Briefing: briefing room with a dispatch screen, chief's office, break room.
// ---------------------------------------------------------------------------
const PHQ = { x0: 18, x1: 56, z0: 80, z1: 112 }
const PHQ_FH = 5.2
const PHQ_STAIR = { x0: 50.4, x1: 53.8, zA: 88, zB: 95.4, landing: 1.6 }
const phqY = (k) => GROUND + k * PHQ_FH

function PoliceHQ() {
  const m = getMaterials()
  const { x0, x1, z0, z1 } = PHQ
  const cx = (x0 + x1) / 2
  const secureZ = 96 // divider between public hall (south) and cell block (north)
  const lobbyFloor = useMemo(() => blackMarble('#2f6fe0', 6, 5), []) // public-facing: polished black marble, blue vein
  const cellFloor = useMemo(() => surface('concrete', 10, 8, { color: '#8d8a84' }), [])
  const carpet = useMemo(() => surface('carpet', 9, 7, { color: '#4b525c' }), [])
  const car = carById('phq')
  const holes = useMemo(() => [carHole(car), { x0: PHQ_STAIR.x0, x1: PHQ_STAIR.x1, z0: PHQ_STAIR.zA, z1: PHQ_STAIR.zB - PHQ_STAIR.landing }], [car])
  const y2 = phqY(1), y3 = phqY(2)

  // NPCs: floor 1 desk sergeant, officers, receptionist, correctional officer and three inmates; floor 2
  // detectives, records clerk and the captain; floor 3 the chief, a briefing sergeant and an officer.
  const officers = useMemo(() => {
    const NAVY = '#1c2746', SLATE = '#3a4652', ORANGE = '#e4701e', TAN = '#b9a67e', SUIT = '#2d3038', SHIRT = '#d9d6cf'
    const list = [
      { x: cx + 6, y: GROUND, z: 86.5, yaw: Math.PI, shirt: NAVY, pants: '#0f1626' },       // desk sergeant behind counter
      { x: 22.5, y: GROUND, z: 87, yaw: -Math.PI / 2, shirt: NAVY, pants: '#0f1626' },       // patrol officer, lobby
      { x: cx - 2, y: GROUND, z: 93.5, yaw: 0.6, shirt: NAVY, pants: '#0f1626' },            // booking officer
      { x: cx + 9.5, y: GROUND, z: 90, yaw: Math.PI / 2, shirt: TAN, pants: '#2a2a30' },     // receptionist
      { x: cx, y: GROUND, z: 99.5, yaw: 0, shirt: SLATE, pants: '#232a33' },                 // correctional officer, cell corridor
      { x: 24, y: GROUND, z: 104, yaw: Math.PI / 2, shirt: ORANGE, pants: ORANGE },          // inmate, cell 1
      { x: 24, y: GROUND, z: 108.5, yaw: Math.PI / 2, shirt: ORANGE, pants: ORANGE },        // inmate, cell 2
      { x: 50, y: GROUND, z: 106, yaw: -Math.PI / 2, shirt: ORANGE, pants: ORANGE },         // inmate, shared cell
      { x: 28.5, y: y2, z: 100.2, yaw: 0, shirt: SHIRT, pants: SUIT },                       // detective
      { x: 40.5, y: y2, z: 100.2, yaw: 0, shirt: '#8b6a4a', pants: SUIT },                   // detective
      { x: 38, y: y2, z: 109.9, yaw: Math.PI, shirt: '#4a4f57', pants: '#1b1d22' },          // records clerk
      { x: 40.4, y: y2, z: 84.4, yaw: Math.PI / 2, shirt: NAVY, pants: '#0f1626' },          // captain
      { x: 52.2, y: y3, z: 105, yaw: -Math.PI / 2, shirt: '#0f1626', pants: '#0f1626' },     // chief
      { x: 30, y: y3, z: 109.2, yaw: Math.PI, shirt: NAVY, pants: '#0f1626' },               // briefing sergeant
      { x: 44, y: y3, z: 84.2, yaw: 0, shirt: NAVY, pants: '#0f1626' },                      // officer in the break room
    ]
    return makeCrowd(list.length, (i) => ({ x: list[i].x, y: list[i].y, z: list[i].z, yaw: list[i].yaw, raiseChance: 0 })).map((f, i) => ({
      ...f, shirt: list[i].shirt, pants: list[i].pants, armsUp: 0, bounce: 0.25,
    }))
  }, [cx, y2, y3])

  const monitorDesks = useMemo(() => [27, 33, 39, 45].flatMap((x) => [99, 104].map((z) => [x, z])), [])
  const lights = (y, zone, pts) => pts.map(([lx, lz], i) => (
    <CeilingLight key={zone + i} position={[lx, y + 4.9, lz]} size={[1.4, 1.4]} intensity={18} distance={12} zone={zone} watts={56} color="#fbf2e2" />
  ))

  return (
    <group>
      <JusticeBuilding
        id="phq" x0={x0} x1={x1} z0={z0} z1={z1} h={PHQ_FH} floors={3} holes={holes} upperFloorMat={carpet} windowSeed={2}
        doorSide="south" doorHalf={1.2} doorH={2.8}
        wall="limestone" wallColor="#d9dde1" doorAccent="#2f6fe0" doorLabel="Police HQ doors"
        floorMat={lobbyFloor} seed={21} sign={{ name: 'POLICE HEADQUARTERS', sub: 'VISION STORMS CITY' }} signWidth={8.4}
        groundWindows={[-15, -9.5, 9.5, 15].map((off) => ({ off, half: 1.9, v0: 0.9, v1: 3.7 }))}
      >

        {/* an interior partition wall separating the public hall from the cell block, with a
            single secure door in it (openable from both sides — fiction, nobody is ever trapped).
            Door opening spans x[22,24]; left segment x[18,22], right segment x[24,56]. */}
        <Partition z={secureZ} x0={x0} x1={x1} gapCx={23} gapHalf={1} doorH={3.2} h={PHQ_FH} material={surface('concrete', 2, 1.2, { color: '#8f8c86' })} />
        <SingleDoor id="phq-secure" hinge={[22, GROUND, secureZ]} width={2.0} height={3.2} baseYaw={0} openAngle={1.4} label="secure area" style="black" />
        {/* cell-block floor overlay (concrete, over the marble) */}
        <mesh position={[cx, GROUND + 0.015, 104.5]} rotation={[-Math.PI / 2, 0, 0]} material={cellFloor} receiveShadow>
          <planeGeometry args={[x1 - x0 - T, z1 - secureZ - T]} />
        </mesh>

        {/* the real elevator (3 floors) and the staircase beside the staff office */}
        <ElevatorCar cfg={car} />
        <UStair x0={PHQ_STAIR.x0} x1={PHQ_STAIR.x1} zA={PHQ_STAIR.zA} zB={PHQ_STAIR.zB} y={phqY(0)} rise={PHQ_FH} landing={PHQ_STAIR.landing} />
        <UStair x0={PHQ_STAIR.x0} x1={PHQ_STAIR.x1} zA={PHQ_STAIR.zA} zB={PHQ_STAIR.zB} y={phqY(1)} rise={PHQ_FH} landing={PHQ_STAIR.landing} />
        {[1, 2].map((k) => (
          <group key={'g' + k}>
            <Rail a={[PHQ_STAIR.x0, PHQ_STAIR.zA]} b={[PHQ_STAIR.x0, PHQ_STAIR.zB - PHQ_STAIR.landing]} y={phqY(k)} style="glass" h={1.0} />
            <Rail a={[PHQ_STAIR.x1, PHQ_STAIR.zA]} b={[PHQ_STAIR.x1, PHQ_STAIR.zB - PHQ_STAIR.landing]} y={phqY(k)} style="glass" h={1.0} />
            <Rail a={[PHQ_STAIR.x0, PHQ_STAIR.zB - PHQ_STAIR.landing]} b={[PHQ_STAIR.x1, PHQ_STAIR.zB - PHQ_STAIR.landing]} y={phqY(k)} style="glass" h={1.0} />
            {k === 2 && <Rail a={[PHQ_STAIR.x0, PHQ_STAIR.zA]} b={[PHQ_STAIR.x0 + 1.7, PHQ_STAIR.zA]} y={phqY(k)} style="glass" h={1.0} />}
          </group>
        ))}
        <RoomSign text="STAIRS" position={[52.1, GROUND + 3.4, 95.74]} rotation={[0, Math.PI, 0]} width={2.0} />

        {/* ---------------- FLOOR 1: PUBLIC HALL ---------------- */}
        {/* reception counter + desk sergeant station */}
        <Counter position={[cx + 6, GROUND, 86]} yaw={Math.PI} length={9} height={1.1} depth={0.9} top="marble" face="#20242b" />
        <RoomSign text="VISION STORMS POLICE" position={[cx + 6, GROUND + 3.4, 80.45]} rotation={[0, 0, 0]} width={9} color="#0e2a5c" glow="#8fb6ff" />
        {/* waiting area */}
        <Sofa position={[22, GROUND, 84]} yaw={Math.PI / 2} length={3.2} color="#2a3550" />
        <Sofa position={[22, GROUND, 88.2]} yaw={Math.PI / 2} length={3.2} color="#2a3550" />
        <Table position={[24.4, GROUND, 86]} size={[1.0, 0.6]} height={0.5} top="#20242b" />
        <Plant position={[20.5, GROUND, 82.5]} scale={1.1} />
        <Plant position={[53, GROUND, 82.5]} scale={1.1} />
        {/* booking desk + stations */}
        <RoomSign text="BOOKING" position={[cx - 6, GROUND + 3.6, 95.6]} rotation={[0, Math.PI, 0]} width={3.2} />
        <Counter position={[cx - 2, GROUND, 94]} yaw={0} length={4.5} height={1.0} depth={0.8} top="marble" face="#23262c" />
        <mesh position={[cx - 2, GROUND + 1.25, 93.9]} material={m.blackSteel}><boxGeometry args={[0.5, 0.35, 0.4]} /></mesh>
        <mesh position={[cx + 3, GROUND + 1.6, 95.5]} rotation={[0, Math.PI, 0]} material={m.blackSteel}><boxGeometry args={[1.6, 2.2, 0.08]} /></mesh>
        <WallScreen position={[cx + 3, GROUND + 1.9, 95.4]} yaw={Math.PI} size={[1.2, 0.8]} />
        {/* staff office corner */}
        <RoomSign text="STAFF" position={[52.5, GROUND + 3.4, 83.2]} rotation={[0, -Math.PI / 2, 0]} width={2.2} />
        <Table position={[52, GROUND, 86]} size={[1.6, 0.9]} height={0.75} top="wood" />
        <Chair position={[52, GROUND, 87]} yaw={Math.PI} color="#2a2f38" />
        <Chair position={[52, GROUND, 84.8]} yaw={0} color="#3b3f46" />
        <Shelf position={[55.3, GROUND, 86]} yaw={-Math.PI / 2} width={3} height={2.2} />

        {/* ---------------- FLOOR 1: CELL BLOCK A ---------------- */}
        <RoomSign text="CELL BLOCK A" position={[cx, GROUND + 3.8, 96.6]} rotation={[0, 0, 0]} width={4} color="#3a1111" glow="#ff9d7a" />
        <Cell id="a1" x0={20} x1={27} z0={101} z1={106} gate="south" label="Cell A1" shared={false} />
        <Cell id="a2" x0={20} x1={27} z0={106} z1={111} gate="south" label="Cell A2" shared={false} />
        <Cell id="a3" x0={45} x1={54} z0={101} z1={111} gate="west" label="Shared Cell A3" shared />
        <RoomSign text="MEDICAL · COUNSELING" position={[cx + 2, GROUND + 3.4, 111.4]} rotation={[0, Math.PI, 0]} width={4} color="#0e3a2a" glow="#8fffd6" />
        <Table position={[33, GROUND, 109.5]} size={[1.4, 0.8]} height={0.75} top="wood" />
        <Chair position={[33, GROUND, 110.6]} yaw={Math.PI} color="#2f4636" />
        <Chair position={[33, GROUND, 108.4]} yaw={0} color="#2f4636" />
        <mesh position={[38, GROUND + 1.0, 110.8]} material={m.chrome}><boxGeometry args={[1.8, 0.5, 0.7]} /></mesh>

        {/* ---------------- FLOOR 2: DETECTIVES & RECORDS ---------------- */}
        <RoomSign text="DETECTIVES & RECORDS" position={[cx, y2 + 4.1, z1 - T / 2 - 0.06]} rotation={[0, Math.PI, 0]} width={6.2} />
        {monitorDesks.map(([x, z]) => (
          <group key={x + ':' + z}>
            <Table position={[x, y2, z]} size={[1.7, 0.8]} height={0.75} top="wood" />
            <Chair position={[x, y2, z + 0.95]} yaw={Math.PI} color="#2a2f38" />
            <WallScreen position={[x, y2 + 0.99, z - 0.22]} yaw={0} size={[0.6, 0.36]} />
          </group>
        ))}
        {[26, 30.5, 35, 39.5, 44, 48.5].map((x) => <Shelf key={x} position={[x, y2, z1 - T / 2 - 0.18]} yaw={Math.PI} width={3.4} height={2.4} />)}
        <BoxRoom id="phq-int-a" x0={23} x1={29} z0={82} z1={88.5} y={y2} h={PHQ_FH} doorSide="north" doorAt={26} glassSide="east" label="interview room" />
        <Table position={[26, y2, 85.4]} size={[1.6, 0.8]} height={0.75} top="wood" />
        <Chair position={[26, y2, 84.4]} yaw={0} color="#3b3f46" label="Sit in the interview room" />
        <Chair position={[26, y2, 86.4]} yaw={Math.PI} color="#3b3f46" label="Sit in the interview room" />
        <RoomSign text="INTERVIEW A" position={[26, y2 + 3.0, 88.56]} rotation={[0, 0, 0]} width={2.0} color="#3a1111" glow="#ff9d7a" />
        <BoxRoom id="phq-int-b" x0={30} x1={36} z0={82} z1={88.5} y={y2} h={PHQ_FH} doorSide="north" doorAt={33} glassSide="west" label="interview room" />
        <Table position={[33, y2, 85.4]} size={[1.6, 0.8]} height={0.75} top="wood" />
        <Chair position={[33, y2, 84.4]} yaw={0} color="#3b3f46" label="Sit in the interview room" />
        <Chair position={[33, y2, 86.4]} yaw={Math.PI} color="#3b3f46" label="Sit in the interview room" />
        <RoomSign text="INTERVIEW B" position={[33, y2 + 3.0, 88.56]} rotation={[0, 0, 0]} width={2.0} color="#3a1111" glow="#ff9d7a" />
        <BoxRoom id="phq-capt" x0={38} x1={47} z0={82} z1={88.5} y={y2} h={PHQ_FH} doorSide="north" doorAt={42.5} glassSide="north" label="captain's office" doorStyle="glass" />
        <RoomSign text="CAPTAIN" position={[42.5, y2 + 3.2, 88.56]} rotation={[0, 0, 0]} width={2.2} />
        <Table position={[43, y2, 84.2]} size={[2.0, 0.9]} height={0.76} top="wood" />
        <Chair position={[43, y2, 83.1]} yaw={0} color="#2a2f38" />
        <Chair position={[42, y2, 86.2]} yaw={Math.PI} color="#3b3f46" />
        <Chair position={[44, y2, 86.2]} yaw={Math.PI} color="#3b3f46" />
        <Plant position={[46, y2, 83]} scale={1.1} />
        <Plant position={[20.4, y2, 88.4]} scale={1.1} />

        {/* ---------------- FLOOR 3: COMMAND & BRIEFING ---------------- */}
        <RoomSign text="COMMAND & BRIEFING" position={[cx, y3 + 4.1, z1 - T / 2 - 0.06]} rotation={[0, Math.PI, 0]} width={6.2} />
        <DispatchScreen position={[30, y3 + 2.5, z1 - T / 2 - 0.12]} yaw={Math.PI} size={[7.2, 3.5]} />
        {[100, 102.2, 104.4, 106.6].map((z) => [24, 26.4, 28.8, 31.2, 33.6, 36].map((x) => (
          <Chair key={x + ':' + z} position={[x, y3, z]} yaw={0} color="#26303f" label="Take a seat in the briefing" />
        )))}
        <Counter position={[30, y3, 108.6]} yaw={Math.PI} length={1.6} height={1.1} depth={0.7} top="wood" face="#2a2f38" />
        <BoxRoom id="phq-chief" x0={42} x1={55.4} z0={99} z1={110.6} y={y3} h={PHQ_FH} doorSide="west" doorAt={104.5} glassSide="west" label="chief's office" doorStyle="glass" />
        <RoomSign text="CHIEF OF POLICE" position={[41.88, y3 + 3.2, 104.5]} rotation={[0, -Math.PI / 2, 0]} width={2.8} />
        <Table position={[50, y3, 105]} size={[2.4, 1.0]} height={0.76} top="wood" yaw={Math.PI / 2} />
        <Chair position={[51.2, y3, 105]} yaw={-Math.PI / 2} color="#1b1d22" />
        <Chair position={[48.2, y3, 104]} yaw={Math.PI / 2} color="#3b3f46" />
        <Chair position={[48.2, y3, 106]} yaw={Math.PI / 2} color="#3b3f46" />
        <Sofa position={[44, y3, 108.2]} yaw={0} length={2.4} color="#2a3550" />
        <Plant position={[54.6, y3, 109.8]} scale={1.2} />
        <Counter position={[43.5, y3, 80.9]} yaw={0} length={5} height={1.0} depth={0.6} top="wood" face="#2a2f38" />
        <RoomSign text="BREAK ROOM" position={[43.5, y3 + 3.4, 80.45]} width={2.6} />
        <Table position={[44, y3, 84.8]} size={[1.2, 1.2]} height={0.75} top="wood" round />
        <Chair position={[44, y3, 83.6]} yaw={0} color="#3b3f46" />
        <Chair position={[44, y3, 86.0]} yaw={Math.PI} color="#3b3f46" />
        <Plant position={[47.6, y3, 82]} scale={1.2} />
        <Plant position={[20.4, y3, 88.4]} scale={1.1} />

        {/* lighting, switched per floor so each can be turned off and costs its own power */}
        {lights(GROUND, 'police-hq', [[26, 86], [40, 86], [30, 93], [48, 90], [26, 104], [40, 104], [50, 107]])}
        {lights(y2, 'police-hq-2', [[27, 86], [33, 86], [42, 86], [30, 100], [42, 100], [30, 108], [46, 108], [26, 92]])}
        {lights(y3, 'police-hq-3', [[30, 103], [38, 103], [47, 104], [44, 85], [30, 91], [26, 108], [36, 108]])}
      </JusticeBuilding>

      {/* NPC staff, inmates and detectives */}
      <group userData={{ noBatch: true }}>
        <HumanoidCrowd fans={officers} beat={0} castShadow />
      </group>

      {/* two parked police cruisers on the forecourt, lights flashing */}
      <Cruiser position={[47, 0, 74.4]} yaw={0.12} />
      <Cruiser position={[52, 0, 74.9]} yaw={-0.1} />

      {/* dialogue + roleplay interactables */}
      <PoliceDialogue cx={cx} />
      <PoliceUpperDialogue y2={y2} y3={y3} />
    </group>
  )
}

/** Talking points for the detectives' and command floors. */
function PoliceUpperDialogue({ y2, y3 }) {
  useNpcDialogue('npc-detective-1', [28.5, y2, 100.2], 'Talk to detective', [
    'Detective: Every case here is a story. We follow the evidence wherever it leads, and nobody is guilty until the court says so.',
    'Detective: The interview rooms next door have one-way glass. Everything in them is roleplay.',
  ])
  useNpcDialogue('npc-detective-2', [40.5, y2, 100.2], 'Talk to detective', [
    'Detective: Records are on the north wall. In real life, files like those are strictly confidential.',
  ])
  useNpcDialogue('npc-records', [38, y2, 109.9], 'Talk to records clerk', [
    'Records Clerk: I keep the paperwork straight. Mistakes in records can change someone\'s life, so we double-check everything.',
  ])
  useNpcDialogue('npc-captain', [40.4, y2, 84.4], 'Talk to the captain', [
    'Captain: Welcome to the second floor. If you want to see where it all goes next, the courthouse is across the plaza.',
  ])
  useNpcDialogue('npc-chief', [52.2, y3, 105], 'Talk to the Chief of Police', [
    'Chief: Good policing is about trust. This whole district is a fictional teaching space, and everyone here is an NPC or a visitor like you.',
    'Chief: If any scenario ever stops feeling right, open a roleplay kiosk and press End scenario.',
  ])
  useNpcDialogue('npc-briefing', [30, y3, 109.2], 'Talk to briefing sergeant', [
    'Sergeant: The dispatch map is fictional, but the idea is real: clear information, calm decisions.',
  ])
  useNpcDialogue('npc-break', [44, y3, 84.2], 'Talk to officer', [
    'Officer: Coffee machine is broken again. Some things are the same in every precinct.',
  ])
  return null
}

/** A cell room: three bar/solid walls + an openable barred gate, a bunk, and a fixture. */
export function Cell({ id, x0, x1, z0, z1, y = GROUND, gate = 'south', label = 'Cell', shared = false }) {
  const m = getMaterials()
  const w = x1 - x0, d = z1 - z0
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
  const h = 2.8
  const concrete = surface('concrete', 2, 1.2, { color: '#7f7c77' })
  // solid walls on the three non-gate sides; the gate side gets bars with a gate opening
  const solidSides = ['south', 'north', 'west', 'east'].filter((s) => s !== gate)
  const wallBox = {
    south: [cx, y + h / 2, z0 + 0.08, w, h, 0.16],
    north: [cx, y + h / 2, z1 - 0.08, w, h, 0.16],
    west: [x0 + 0.08, y + h / 2, cz, 0.16, h, d],
    east: [x1 - 0.08, y + h / 2, cz, 0.16, h, d],
  }
  const gateCenter = { south: [cx, z0], north: [cx, z1], west: [x0, cz], east: [x1, cz] }[gate]
  const gateYaw = { south: 0, north: Math.PI, west: -Math.PI / 2, east: Math.PI / 2 }[gate]
  const gateRun = (gate === 'south' || gate === 'north') ? w : d
  const gateHalf = 0.55 // gate opening is 1.1 wide; bars fill the rest
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {solidSides.map((s, i) => { const [mx, my, mz, sx, sy, sz] = wallBox[s]; return <CuboidCollider key={i} args={[sx / 2, sy / 2, sz / 2]} position={[mx, my, mz]} /> })}
      </RigidBody>
      {solidSides.map((s, i) => { const [mx, my, mz, sx, sy, sz] = wallBox[s]; return (
        <mesh key={i} position={[mx, my, mz]} material={concrete} castShadow receiveShadow><boxGeometry args={[sx, sy, sz]} /></mesh>
      ) })}
      {/* barred front: a bar run each side of the gate opening */}
      {(() => {
        const horiz = gate === 'south' || gate === 'north'
        const sideLen = (gateRun - gateHalf * 2) / 2
        const yaw = horiz ? 0 : Math.PI / 2
        const base = horiz ? gateCenter[0] : gateCenter[1]
        const fixed = horiz ? gateCenter[1] : gateCenter[0]
        const runs = [-1, 1].map((dir) => {
          const c = base + dir * (gateHalf + sideLen / 2)
          return horiz ? [c, fixed] : [fixed, c]
        })
        return runs.map(([bx, bz], i) => (
          <BarRun key={i} position={[bx, y, bz]} yaw={yaw} width={sideLen} height={h} />
        ))
      })()}
      {/* the openable gate */}
      <BarGate id={'cell-' + id} hinge={[gateCenter[0] - (gate === 'south' || gate === 'north' ? gateHalf : 0), y, gateCenter[1] - (gate === 'west' || gate === 'east' ? gateHalf : 0)]} width={1.1} height={h} baseYaw={gateYaw} openAngle={1.4} label={label} />
      {/* ceiling */}
      <mesh position={[cx, y + h, cz]} material={new THREE.MeshStandardMaterial({ color: '#d7d4ce', roughness: 0.95 })}><boxGeometry args={[w, 0.1, d]} /></mesh>
      {/* furniture */}
      {shared ? (
        <>
          <Bunk position={[x0 + 1.1, y, z0 + 1.6]} yaw={0} stacked />
          <Bunk position={[x1 - 1.1, y, z0 + 1.6]} yaw={0} stacked />
          <CellFixture position={[cx, y, z1 - 0.6]} yaw={Math.PI} />
        </>
      ) : (
        <>
          <Bunk position={[x1 - 0.9, y, cz]} yaw={Math.PI / 2} />
          <CellFixture position={[x0 + 0.5, y, z1 - 0.7]} yaw={Math.PI / 4} />
        </>
      )}
      <RoomSign text={label.toUpperCase()} position={gate === 'south' ? [cx, y + h - 0.2, z0 - 0.02] : gate === 'west' ? [x0 - 0.02, y + h - 0.2, cz] : [cx, y + h - 0.2, z0 + 0.02]} rotation={gate === 'west' ? [0, -Math.PI / 2, 0] : [0, 0, 0]} width={1.8} color="#3a1111" glow="#ff9d7a" />
    </group>
  )
}

/** NPC dialogue + the optional fictional roleplay system (clear exit + report). */
function PoliceDialogue({ cx }) {
  // Desk sergeant
  useNpcDialogue('npc-sergeant', [cx + 6, GROUND, 87], 'Talk to Desk Sergeant', [
    'Desk Sergeant: Welcome to Vision Storms Police HQ. This is a fictional roleplay space. Use the kiosk by the door to start or stop a scenario anytime.',
    'Desk Sergeant: Booking is to the left, the cell block is through the secure door. You can walk anywhere; nothing here can hold you against your will.',
  ])
  // Receptionist
  useNpcDialogue('npc-reception', [cx + 9.5, GROUND, 90], 'Talk to Receptionist', [
    'Receptionist: Hi! The courthouse is just east of here. The county jail, state prison, rehabilitation center and visitor center are coming to this district soon.',
    'Receptionist: If a scenario ever makes you uncomfortable, open the kiosk by the door and press End scenario. It stops right away.',
  ])
  // Correctional officer
  useNpcDialogue('npc-co', [cx, GROUND, 99.5], 'Talk to Correctional Officer', [
    'Correctional Officer: This is Cell Block A — all roleplay. The gates open from both sides, so no one is ever locked in.',
    'Correctional Officer: We run rehabilitation activities here: classes, counseling and library time. More of those open as the district grows.',
  ])
  // Inmate (educational)
  useNpcDialogue('npc-inmate', [24, GROUND, 104], 'Talk to Resident (roleplay)', [
    'Resident: In this story I\'m working through a rehab program — classes in the morning, counseling in the afternoon.',
    'Resident: It\'s all pretend. You can leave the cell or the building whenever you want.',
  ])

  // The roleplay kiosk at the entrance: start / exit+report, with the consent rules spelled out.
  useEffect(() => {
    return registerInteractable('phq-roleplay-kiosk', {
      position: new THREE.Vector3(cx, GROUND + 1, 80.9),
      radius: 2.6,
      label: () => 'Justice roleplay kiosk',
      onInteract: () => { useJustice.getState().openMenu('booking'); useStore.getState().openPanel({ type: 'justice' }) },
    })
  }, [cx])

  // A clearly-marked exit + report point just inside the door.
  useEffect(() => {
    return registerInteractable('phq-exit-report', {
      position: new THREE.Vector3(cx + 2.4, GROUND + 1, 81.6),
      radius: 2.2,
      label: () => 'Roleplay: stop or report',
      onInteract: () => { useJustice.getState().openMenu(null); useStore.getState().openPanel({ type: 'justice' }) },
    })
  }, [cx])

  return null
}

// ---------------------------------------------------------------------------
// COURTHOUSE
// Footprint x[64,110] z[80,112]. South = public lobby (signature black marble, chandeliers,
// artwork, information desk, waiting). A partition at z=90 with double doors leads to the
// courtroom: public gallery, bar rail with a gate, attorney tables, jury box, witness stand,
// clerk's desk and the judge's bench on a raised dais.
// ---------------------------------------------------------------------------
const COURT = { x0: 64, x1: 110, z0: 80, z1: 112 }
const COURT_PART_Z = 90
const GOLD = () => getMaterials().shared('justiceGold', () => new THREE.MeshStandardMaterial({ color: '#c9a96a', metalness: 1, roughness: 0.25 }))
const DARK_WOOD = () => surface('wood', 2, 1, { color: '#4a3020' })

/** A low rail/balustrade between two floor points, with a collider. `style` is 'wood' or 'glass'. */
export function Rail({ a, b, h = 1.05, y = GROUND, style = 'wood' }) {
  const dx = b[0] - a[0], dz = b[1] - a[1]
  const L = Math.hypot(dx, dz)
  const yaw = Math.atan2(-dz, dx)
  const m = getMaterials()
  const wood = DARK_WOOD()
  return (
    <RigidBody type="fixed" colliders={false} position={[(a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2]} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[L / 2, h / 2, 0.07]} position={[0, h / 2, 0]} />
      {style === 'glass' ? (
        <>
          <mesh position={[0, h - 0.025, 0]} material={m.chrome}><boxGeometry args={[L, 0.05, 0.06]} /></mesh>
          <mesh position={[0, h / 2 - 0.02, 0]} material={m.glass}><boxGeometry args={[L, h - 0.1, 0.02]} /></mesh>
        </>
      ) : (
        <>
          <mesh position={[0, h - 0.04, 0]} material={wood} castShadow><boxGeometry args={[L, 0.08, 0.16]} /></mesh>
          <mesh position={[0, (h - 0.08) / 2 + 0.05, 0]} material={wood} castShadow><boxGeometry args={[L, h - 0.18, 0.08]} /></mesh>
        </>
      )}
    </RigidBody>
  )
}

/** Framed abstract artwork, painted at startup in the brand colours (pink, purple, teal, gold). */
export function Artwork({ position, rotation = [0, 0, 0], size = [4.4, 2.6], seed = 1 }) {
  const m = getMaterials()
  const art = useMemo(() => new THREE.MeshBasicMaterial({
    toneMapped: false,
    map: canvasTexture(880, 520, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h)
      g.addColorStop(0, '#0d0b14'); g.addColorStop(1, '#1d1230')
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
      const cols = ['#e0559f', '#9b4fe0', '#2fd0c4', '#c9a96a']
      for (let i = 0; i < 9; i++) {
        ctx.strokeStyle = cols[(i + seed) % 4]
        ctx.globalAlpha = 0.55 + hash(i + seed * 9) * 0.4
        ctx.lineWidth = 3 + hash(i * 3 + seed) * 8
        ctx.beginPath()
        ctx.arc(w * (0.15 + hash(i * 7 + seed) * 0.7), h * (0.2 + hash(i * 11 + seed) * 0.6), 40 + hash(i * 5 + seed) * 190, 0, Math.PI * (0.6 + hash(i + seed) * 1.4))
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }),
  }), [seed])
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.05]} material={GOLD()}><boxGeometry args={[size[0] + 0.28, size[1] + 0.28, 0.08]} /></mesh>
      <mesh position={[0, 0, -0.005]} material={m.blackSteel}><boxGeometry args={[size[0] + 0.08, size[1] + 0.08, 0.05]} /></mesh>
      <mesh material={art}><planeGeometry args={size} /></mesh>
    </group>
  )
}

/** Scales of Justice sculpture on a black marble plinth. */
function Scales({ position }) {
  const gold = GOLD()
  const marble = useMemo(() => blackMarble('#c9a96a', 1, 1), [])
  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.7, 0.5, 0.7]} position={[0, 0.5, 0]} />
      </RigidBody>
      <mesh position={[0, 0.5, 0]} material={marble} castShadow><boxGeometry args={[1.4, 1.0, 1.4]} /></mesh>
      <mesh position={[0, 1.04, 0]} material={gold}><cylinderGeometry args={[0.45, 0.5, 0.08, 24]} /></mesh>
      <mesh position={[0, 1.95, 0]} material={gold} castShadow><cylinderGeometry args={[0.05, 0.07, 1.8, 12]} /></mesh>
      <mesh position={[0, 2.88, 0]} material={gold}><sphereGeometry args={[0.1, 14, 10]} /></mesh>
      <mesh position={[0, 2.78, 0]} material={gold}><boxGeometry args={[1.7, 0.05, 0.05]} /></mesh>
      {[-0.8, 0.8].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          {[-0.18, 0.18].map((z) => <mesh key={z} position={[0, 2.5, z]} rotation={[z > 0 ? -0.5 : 0.5, 0, 0]} material={gold}><cylinderGeometry args={[0.006, 0.006, 0.6, 4]} /></mesh>)}
          <mesh position={[0, 2.22, 0]} material={gold}><cylinderGeometry args={[0.28, 0.2, 0.05, 22]} /></mesh>
        </group>
      ))}
    </group>
  )
}

function Courthouse() {
  const m = getMaterials()
  const { x0, x1, z0, z1 } = COURT
  const cx = (x0 + x1) / 2
  const H = 6.4
  const floor = useMemo(() => signatureMarble(10, 4), [])
  const wood = useMemo(() => surface('wood', 14, 6, { color: '#6a4a35' }), [])
  const gold = GOLD()
  const pew = '#4a3326'

  // signature lighting in the lobby: pink / purple / teal washes, switched with the courthouse zone
  useEffect(() => {
    const cols = ['#e0559f', '#9b4fe0', '#2fd0c4']
    const offs = cols.map((c, i) => registerLightAnchor({ position: new THREE.Vector3(70 + i * 17, GROUND + 4.2, 84.5), color: c, intensity: 14, distance: 14, range: 40, zone: 'courthouse' }))
    return () => offs.forEach((o) => o())
  }, [])

  const staff = useMemo(() => {
    const ROBE = '#101114', NAVY = '#1c2746', CHAR = '#2d3038', SLATE = '#3a4652', TAN = '#b9a67e', GREY = '#4a4f57'
    const list = [
      { x: 87, y: GROUND + 0.5, z: 110.5, yaw: Math.PI, shirt: ROBE, pants: ROBE },       // judge on the dais
      { x: 76.8, y: GROUND, z: 102.7, yaw: 0, shirt: CHAR, pants: '#16171b' },            // attorney (left table)
      { x: 97.2, y: GROUND, z: 102.7, yaw: 0, shirt: NAVY, pants: '#10131f' },            // attorney (right table)
      { x: 100.2, y: GROUND, z: 100.9, yaw: -Math.PI / 2, shirt: SLATE, pants: '#232a33' }, // bailiff
      { x: 95, y: GROUND, z: 108.3, yaw: Math.PI, shirt: GREY, pants: '#1b1d22' },          // court clerk
      { x: 96.5, y: GROUND, z: 86, yaw: Math.PI, shirt: TAN, pants: '#2a2a30' },            // information desk
      { x: 80.4, y: GROUND, z: 82, yaw: Math.PI, shirt: SLATE, pants: '#232a33' },          // security officer
    ]
    return makeCrowd(list.length, (i) => ({ x: list[i].x, y: list[i].y, z: list[i].z, yaw: list[i].yaw, raiseChance: 0 })).map((f, i) => ({
      ...f, shirt: list[i].shirt, pants: list[i].pants, armsUp: 0, bounce: 0.2,
    }))
  }, [])

  const openMenu = (id) => { useJustice.getState().openMenu(id || null); useStore.getState().openPanel({ type: 'justice' }) }
  useNpcDialogue('npc-judge', [87, GROUND + 0.5, 110.5], 'Talk to Judge Reyes', [
    'Judge Reyes: Welcome to the Vision Storms County court. Everything in here is a teaching story. Try a scenario at the kiosk in the lobby.',
    'Judge Reyes: A real court decides cases on evidence and the law, and both sides always get to be heard.',
  ])
  useNpcDialogue('npc-attorney-1', [76.8, GROUND, 102.7], 'Talk to attorney', [
    'Attorney: My job is to present my client\'s side honestly. The judge or jury decides who is right.',
    'Attorney: Practice a case in the small claims scenario. You can play a juror or a trainee attorney.',
  ])
  useNpcDialogue('npc-attorney-2', [97.2, GROUND, 102.7], 'Talk to attorney', [
    'Attorney: Evidence has to be shown to the other side too. That\'s part of what makes a hearing fair.',
  ])
  useNpcDialogue('npc-bailiff', [100.2, GROUND, 100.9], 'Talk to bailiff', [
    'Bailiff: I keep order in the courtroom. Nobody is held here: the doors open from both sides.',
  ])
  useNpcDialogue('npc-clerk', [95, GROUND, 108.3], 'Talk to court clerk', [
    'Clerk: I keep the case files and call the cases. Pick a scenario at the lobby kiosk and I\'ll call it.',
  ])
  useNpcDialogue('npc-court-info', [96.5, GROUND, 86], 'Talk to information desk', [
    'Information: The courtroom is through the double doors. The gallery is open to everyone.',
    'Information: The kiosk by the desk starts a courtroom scenario. You can end it at any step.',
  ])
  useNpcDialogue('npc-court-guard', [80.4, GROUND, 82], 'Talk to security officer', [
    'Security: Welcome. No detaining or arresting of visitors happens here. This is a teaching space.',
  ])

  useEffect(() => registerInteractable('court-kiosk', {
    position: new THREE.Vector3(91.5, GROUND + 1, 87.4), radius: 2.4,
    label: () => 'Courtroom scenarios',
    onInteract: () => openMenu(null),
  }), [])
  useEffect(() => registerInteractable('court-exit-report', {
    position: new THREE.Vector3(84.4, GROUND + 1, 81.7), radius: 2.2,
    label: () => 'Roleplay: stop or report',
    onInteract: () => openMenu(null),
  }), [])

  return (
    <group>
      <JusticeBuilding
        id="court" x0={x0} x1={x1} z0={z0} z1={z1} h={H} doorSide="south" doorHalf={1.5} doorH={3.2}
        wall="limestone" wallColor="#e6dfcf" doorAccent="#c9a96a" doorLabel="Courthouse doors" floorMat={floor} roofColor="#8a847a"
        seed={5} parts={{ sign: false, canopy: false, planters: false, benches: false }}
        groundWindows={[-12, -7.5, 7.5, 12].map((off) => ({ off, half: 1.3, v0: 1.0, v1: 4.9 }))}
      >
        {/* facade: columns, entablature, name */}
        {Array.from({ length: 8 }, (_, i) => x0 + 4 + i * ((x1 - x0 - 8) / 7)).filter((x) => Math.abs(x - cx) > 2.6).map((x) => (
          <group key={x}>
            <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.5, H / 2, 0.5]} position={[x, GROUND + H / 2, z0 - 1.6]} /></RigidBody>
            <mesh position={[x, GROUND + H / 2, z0 - 1.6]} material={facadeMats().stone} castShadow receiveShadow><cylinderGeometry args={[0.46, 0.5, H, 20]} /></mesh>
            <mesh position={[x, GROUND + 0.2, z0 - 1.6]} material={facadeMats().granite} castShadow><boxGeometry args={[1.2, 0.4, 1.2]} /></mesh>
          </group>
        ))}
        <mesh position={[cx, GROUND + H + 0.4, z0 - 1.2]} material={facadeMats().stone} castShadow receiveShadow><boxGeometry args={[x1 - x0 - 2, 0.9, 3.6]} /></mesh>
        <BrandSign text="COURTHOUSE" sub="VISION STORMS COUNTY" position={[cx, GROUND + H + 0.45, z0 - 3.02]} rotation={[0, Math.PI, 0]} width={14} size={140} color="#2b2b2e" glow="#ffffff" />
        <BrandSign text="VISION STORMS COUNTY COURTHOUSE" position={[cx, GROUND + 5.3, z0 + 0.25]} width={12} size={110} color="#f4f1ea" glow="#c9a6ff" />

        {/* ---------------- LOBBY ---------------- */}
        <Partition z={COURT_PART_Z} x0={x0} x1={x1} gapCx={cx} gapHalf={1.6} doorH={3.4} h={H} material={surface('limestone', 8, 1.4, { color: '#bdb6a7' })} />
        <DoubleDoor id="court-door" center={[cx, GROUND, COURT_PART_Z]} halfWidth={1.6} height={3.4} facing={Math.PI} accent="#c9a96a" label="courtroom doors" />
        <Artwork position={[75, GROUND + 3.0, COURT_PART_Z - T / 2 - 0.02]} rotation={[0, Math.PI, 0]} seed={1} />
        <Artwork position={[99, GROUND + 3.0, COURT_PART_Z - T / 2 - 0.02]} rotation={[0, Math.PI, 0]} seed={2} />
        <RoomSign text="COURTROOM" position={[cx, GROUND + 4.6, COURT_PART_Z - T / 2 - 0.03]} rotation={[0, Math.PI, 0]} width={3.4} color="#1a1020" glow="#c9a6ff" />
        <Scales position={[cx, GROUND, 85.2]} />
        <Chandelier position={[cx, GROUND + H - 0.1, 85.2]} type="crystal" size={1.7} drop={1.6} zone="courthouse" watts={240} />
        <Chandelier position={[73, GROUND + H - 0.1, 85.2]} type="gold" size={1.0} drop={1.1} zone="courthouse" watts={140} />
        <Chandelier position={[101, GROUND + H - 0.1, 85.2]} type="gold" size={1.0} drop={1.1} zone="courthouse" watts={140} />
        {/* information desk and the scenario kiosk */}
        <Counter position={[96.5, GROUND, 84.6]} yaw={Math.PI} length={7} height={1.1} depth={0.9} top="marble" face="#16141c" />
        <mesh position={[91.5, GROUND + 0.55, 87.4]} material={m.blackSteel} castShadow><boxGeometry args={[0.7, 1.1, 0.5]} /></mesh>
        <mesh position={[91.5, GROUND + 1.25, 87.25]} rotation={[-0.3, 0, 0]} material={m.neon('#9b4fe0', 1.6)}><boxGeometry args={[0.6, 0.4, 0.04]} /></mesh>
        {/* waiting area */}
        <Sofa position={[66.6, GROUND, 83.5]} yaw={Math.PI / 2} length={3.0} color="#2a2336" />
        <Sofa position={[66.6, GROUND, 87.2]} yaw={Math.PI / 2} length={3.0} color="#2a2336" />
        <Sofa position={[107.4, GROUND, 88.0]} yaw={-Math.PI / 2} length={3.0} color="#2a2336" />
        <Table position={[68.4, GROUND, 85.3]} size={[0.9, 0.6]} height={0.5} top="#16141c" />
        <Plant position={[65.6, GROUND, 81.4]} scale={1.3} />
        <Plant position={[108.4, GROUND, 81.4]} scale={1.3} />
        <Plant position={[65.6, GROUND, 88.8]} scale={1.3} />
        <Plant position={[108.4, GROUND, 88.8]} scale={1.3} />

        {/* ---------------- COURTROOM ---------------- */}
        <mesh position={[cx, GROUND + 0.015, (COURT_PART_Z + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={wood} receiveShadow>
          <planeGeometry args={[x1 - x0 - T, z1 - COURT_PART_Z - T]} />
        </mesh>
        {/* panelling behind the bench, and the court seal sign */}
        <mesh position={[cx, GROUND + 2.0, z1 - T / 2 - 0.04]} material={DARK_WOOD()}><boxGeometry args={[x1 - x0 - T - 0.2, 4.0, 0.08]} /></mesh>
        <RoomSign text="VISION STORMS COUNTY COURT" position={[cx, GROUND + 4.9, z1 - T / 2 - 0.1]} rotation={[0, Math.PI, 0]} width={9} color="#1a1020" glow="#c9a6ff" />
        {/* public gallery: pews on both sides of a centre aisle, facing the bench */}
        {[93.2, 95.4, 97.6].map((z) => (
          [69, 74.4, 79.8, 94.2, 99.6, 105].map((x) => <Sofa key={x + ':' + z} position={[x, GROUND, z]} yaw={0} length={4.6} color={pew} label="Sit in the gallery" />)
        ))}
        {/* the bar: a rail across the room with a swinging gate for the well */}
        <Rail a={[x0 + T / 2, 99.5]} b={[cx - 1.2, 99.5]} />
        <Rail a={[cx + 1.2, 99.5]} b={[x1 - T / 2, 99.5]} />
        <SingleDoor id="court-bar-gate" hinge={[cx - 1.2, GROUND, 99.5]} width={2.4} height={1.1} baseYaw={0} openAngle={1.5} label="bar gate" />
        {/* attorney tables and chairs */}
        {[79, 95].map((x) => (
          <group key={x}>
            <Table position={[x, GROUND, 103.4]} size={[2.8, 0.9]} height={0.76} top="wood" />
            <Chair position={[x - 0.7, GROUND, 102.3]} yaw={0} color="#2a2f38" label="Sit at counsel table" />
            <Chair position={[x + 0.7, GROUND, 102.3]} yaw={0} color="#2a2f38" label="Sit at counsel table" />
          </group>
        ))}
        {/* witness stand (west of the bench) */}
        <Counter position={[78.6, GROUND, 106.8]} yaw={Math.PI} length={1.8} height={1.2} depth={0.8} top="wood" face="#3b2a1d" />
        <Chair position={[78.6, GROUND, 108.0]} yaw={Math.PI} color="#3b2a1d" label="Take the witness stand" />
        {/* clerk's desk */}
        <Counter position={[95, GROUND, 107]} yaw={Math.PI} length={3} height={1.05} depth={0.8} top="wood" face="#3b2a1d" />
        {/* the judge's dais, bench and high-backed chair */}
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[6.1, 0.25, 1.6]} position={[cx, GROUND + 0.25, 110.2]} />
          <CuboidCollider args={[0.8, 0.125, 1.0]} position={[cx + 7.0, GROUND + 0.125, 110.4]} />
        </RigidBody>
        <mesh position={[cx, GROUND + 0.25, 110.2]} material={DARK_WOOD()} castShadow receiveShadow><boxGeometry args={[12.2, 0.5, 3.2]} /></mesh>
        <mesh position={[cx + 7.0, GROUND + 0.125, 110.4]} material={DARK_WOOD()} castShadow><boxGeometry args={[1.6, 0.25, 2.0]} /></mesh>
        <Counter position={[cx, GROUND + 0.5, 109.2]} yaw={Math.PI} length={7} height={1.15} depth={0.8} top="wood" face="#3b2a1d" />
        <mesh position={[cx, GROUND + 1.55, 111.4]} material={m.leather('#1b1312')} castShadow><boxGeometry args={[1.0, 1.9, 0.18]} /></mesh>
        <mesh position={[cx, GROUND + 0.95, 110.9]} material={m.leather('#1b1312')}><boxGeometry args={[0.9, 0.12, 0.8]} /></mesh>
        <mesh position={[cx, GROUND + 1.0, 109.18]} material={gold}><boxGeometry args={[7.1, 0.04, 0.84]} /></mesh>
        {/* jury box: two tiered rows facing west, open at the south end */}
        <RigidBody type="fixed" colliders={false}><CuboidCollider args={[1.7, 0.175, 3.9]} position={[107.9, GROUND + 0.175, 106]} /></RigidBody>
        <mesh position={[107.9, GROUND + 0.175, 106]} material={DARK_WOOD()} castShadow receiveShadow><boxGeometry args={[3.4, 0.35, 7.8]} /></mesh>
        <Rail a={[101.6, 103.4]} b={[101.6, 109.8]} h={1.0} />
        {[103.8, 105.6, 107.4, 109.0].map((z) => (
          <group key={z}>
            <Chair position={[104.3, GROUND, z]} yaw={-Math.PI / 2} color="#3a2b27" label="Take a juror's seat" />
            <Chair position={[107.9, GROUND + 0.35, z]} yaw={-Math.PI / 2} color="#3a2b27" label="Take a juror's seat" />
          </group>
        ))}

        {/* lighting (switched on the courthouse zone) */}
        {[[72, 95], [87, 95], [102, 95], [72, 105], [87, 104], [102, 105]].map(([lx, lz], i) => (
          <CeilingLight key={i} position={[lx, GROUND + H - 0.3, lz]} size={[1.6, 1.6]} intensity={20} distance={13} zone="courthouse" watts={56} color="#fbf0dc" />
        ))}
        {[[70, 82.5], [104, 82.5]].map(([lx, lz], i) => (
          <CeilingLight key={'l' + i} position={[lx, GROUND + H - 0.3, lz]} size={[1.4, 1.4]} intensity={14} distance={12} zone="courthouse" watts={48} color="#fff1dc" />
        ))}
      </JusticeBuilding>

      <group userData={{ noBatch: true }}>
        <HumanoidCrowd fans={staff} beat={0} castShadow />
      </group>
    </group>
  )
}

// ---------------------------------------------------------------------------
// District grounds: approach road, forecourt, signage, landscaping. Connects
// the campus to the existing avenue (which already carries road to z=110).
// ---------------------------------------------------------------------------
function DistrictGrounds() {
  const asphalt = surface('asphalt', 6, 10)
  const pavers = surface('pavers', 8, 4)
  return (
    <group>
      {/* approach drive: an asphalt apron from the avenue's north end up to the campus */}
      <mesh position={[0, GROUND + 0.005, 112]} rotation={[-Math.PI / 2, 0, 0]} material={asphalt} receiveShadow>
        <planeGeometry args={[16, 20]} />
      </mesh>
      {/* forecourt plaza in front of the Police HQ */}
      <mesh position={[37, GROUND + 0.008, 76]} rotation={[-Math.PI / 2, 0, 0]} material={pavers} receiveShadow>
        <planeGeometry args={[46, 10]} />
      </mesh>
      {/* the courthouse forecourt, joined to the HQ's by a paved walk */}
      <mesh position={[87, GROUND + 0.008, 75.5]} rotation={[-Math.PI / 2, 0, 0]} material={pavers} receiveShadow>
        <planeGeometry args={[52, 11]} />
      </mesh>
      {/* a connecting paver path from the avenue apron to the forecourt */}
      <mesh position={[18, GROUND + 0.008, 74]} rotation={[-Math.PI / 2, 0, 0]} material={pavers} receiveShadow>
        <planeGeometry args={[40, 5]} />
      </mesh>
      {/* district monument sign */}
      <group position={[10, GROUND, 72]}>
        <mesh position={[0, 1.4, 0]} material={blackMarble('#9b4fe0', 1, 1)} castShadow><boxGeometry args={[0.6, 2.8, 7]} /></mesh>
        <BrandSign text="VISION STORMS" sub="JUSTICE & REHABILITATION DISTRICT" position={[0.33, 1.7, 0]} rotation={[0, Math.PI / 2, 0]} width={6.4} size={120} color="#f4f1ea" glow="#c9a6ff" />
      </group>
      {/* landscaping along the forecourt */}
      {[16, 26, 48, 58].map((x) => <Planter key={x} position={[x, GROUND, 79.5]} size={[1.4, 0.7, 1.4]} />)}
      {[[20, 74.5], [54, 74.5]].map(([x, z], i) => <Bench key={i} position={[x, GROUND, z]} yaw={0} />)}
    </group>
  )
}

// ---------------------------------------------------------------------------
export default function JusticeDistrict() {
  return (
    <group>
      <DistrictGrounds />
      <PoliceHQ />
      <Courthouse />
    </group>
  )
}
