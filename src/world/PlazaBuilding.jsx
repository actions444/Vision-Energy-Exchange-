import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface } from './materials.js'
import { PLAZA, P, CORRIDOR, ELEVATOR, STAIRS, DOOR_U, PLAZA_ROOMS } from '../config/plaza.js'
import { DoubleDoor, SingleDoor } from './Door.jsx'
import { BrandSign, Plaque } from './signs.jsx'
import { FlowerBed, Bench, Planter, Bollard } from './props.jsx'
import { Sofa, Plant, CeilingLight, Counter, Chair } from './furniture.jsx'
import { nightLit, registerLightAnchor } from '../state/environment.js'
import { registerInteractable } from '../state/runtime.js'
import { useStore } from '../state/store.js'
import { elevator } from './elevator.js'
import PlazaRooms from './PlazaRooms.jsx'
import { CarLights, HallLights } from './ElevatorLights.jsx'
import { StaticBatch } from './batch.jsx'
import { rentalAccess } from '../rentals/client.js'
import { useDecor, designFor } from '../decor/decor.js'

export { PLAZA }

// Vision Storms Plaza: a three-floor commercial building with a lobby, corridors, two stair
// flights, a working elevator and six furnished rooms. Plan coordinates (u, v) are converted
// to world space with P.X / P.Z, floor heights with P.Y.

const FH = PLAZA.floorH
const W = PLAZA.x1 - PLAZA.x0 // 28
const EXT = 0.3 // exterior wall thickness
const PART = 0.15 // partition thickness
const SLAB = 0.3
const ENTRY = { v0: 12.2, v1: 15.8, h: 3.4 }
const CEIL = FH - SLAB // clear height of each floor

const boxU = (u0, u1, v0, v1, y0, y1) => [P.X((u0 + u1) / 2), (y0 + y1) / 2, P.Z((v0 + v1) / 2), u1 - u0, y1 - y0, v1 - v0]

/** Split a rectangle minus rectangular holes into boxes (for floor slabs with openings). */
function rectMinusHoles([u0, u1, v0, v1], holes) {
  const us = [...new Set([u0, u1, ...holes.flatMap((h) => [h[0], h[1]]).filter((x) => x > u0 && x < u1)])].sort((a, b) => a - b)
  const vs = [...new Set([v0, v1, ...holes.flatMap((h) => [h[2], h[3]]).filter((x) => x > v0 && x < v1)])].sort((a, b) => a - b)
  const out = []
  for (let j = 0; j < vs.length - 1; j++) {
    let start = null
    for (let i = 0; i < us.length - 1; i++) {
      const cu = (us[i] + us[i + 1]) / 2, cv = (vs[j] + vs[j + 1]) / 2
      const inHole = holes.some((h) => cu > h[0] && cu < h[1] && cv > h[2] && cv < h[3])
      if (!inHole && start === null) start = us[i]
      if ((inHole || i === us.length - 2) && start !== null) {
        out.push([start, inHole ? us[i] : us[i + 1], vs[j], vs[j + 1]])
        start = null
      }
    }
  }
  return out
}

export default function PlazaBuilding() {
  const m = getMaterials()
  const mats = useMemo(() => ({
    stone: surface('limestone', 6, 1),
    stoneInt: surface('plaster', 6, 1),
    curtain: m.windows(2, 7, 1),
    inside: nightLit(new THREE.MeshStandardMaterial({ color: '#9fb0bf', emissive: '#dfe9f3', roughness: 0.15, metalness: 0.1 }), 0.03, 0.26),
    plaster: surface('plaster', 6, 1.2),
    lobbyFloor: m.marbleFloor(6, 2),
    corridorFloor: surface('tile', 7, 2),
    ceiling: new THREE.MeshStandardMaterial({ color: '#d9d5cd', roughness: 0.95 }),
    slabEdge: surface('concrete', 6, 0.2),
    roof: surface('concrete', 8, 8),
    steel: m.blackSteel,
  }), [m])

  // ---------- exterior walls (one collider per facade, visual floor bands) ----------
  const facades = useMemo(() => {
    const parts = []
    // [u0,u1,v0,v1, outward face, name]
    const sides = [
      [0, EXT, 0, 28, '-x'],
      [28 - EXT, 28, 0, 28, '+x'],
      [0, 28, 0, EXT, '-z'],
      [0, 28, 28 - EXT, 28, '+z'],
    ]
    for (const [u0, u1, v0, v1, out] of sides) {
      for (let f = 0; f < PLAZA.floors; f++) {
        const y = P.Y(f)
        const bands = [
          [y - (f === 0 ? PLAZA.base : SLAB), y + 0.9, 'stone'],
          [y + 0.9, y + 3.5, 'glass'],
          [y + 3.5, y + CEIL, 'stone'],
        ]
        for (const [y0, y1, kind] of bands) {
          if (out === '+x' && f === 0 && y0 < y + ENTRY.h) {
            // entrance: split the east facade around the doorway
            parts.push([u0, u1, v0, ENTRY.v0, y0, y1, kind, out])
            parts.push([u0, u1, ENTRY.v1, v1, y0, y1, kind, out])
            if (y1 > y + ENTRY.h) parts.push([u0, u1, ENTRY.v0, ENTRY.v1, y + ENTRY.h, y1, kind, out])
          } else parts.push([u0, u1, v0, v1, y0, y1, kind, out])
        }
      }
    }
    return parts
  }, [])

  const inward = { '-x': '+x', '+x': '-x', '-z': '+z', '+z': '-z' }
  const faceMats = (kind, out) => {
    const order = ['+x', '-x', '+y', '-y', '+z', '-z']
    const ext = kind === 'glass' ? mats.curtain : mats.stone
    const int = kind === 'glass' ? mats.inside : mats.stoneInt
    return order.map((f) => (f === inward[out] ? int : ext))
  }

  // ---------- slabs (floors 2..3 and roof) with stair and shaft openings ----------
  const slabs = useMemo(() => {
    const out = []
    const shaft = [ELEVATOR.u0 - 0.05, ELEVATOR.u1 + 0.1, ELEVATOR.v0, ELEVATOR.v1 + 0.1]
    for (let f = 1; f <= PLAZA.floors; f++) {
      const holes = []
      if (f < PLAZA.floors) holes.push(shaft)
      const s = STAIRS.find((st) => st.fromFloor === f - 1)
      if (s) holes.push([s.u0, s.u1, s.v0, s.v1])
      for (const r of rectMinusHoles([EXT, 28 - EXT, EXT, 28 - EXT], holes)) out.push({ f, r })
    }
    return out
  }, [])

  // ---------- interior partitions per floor ----------
  const partitions = useMemo(() => {
    const out = []
    const d0 = DOOR_U - 0.6, d1 = DOOR_U + 0.6, dh = 2.4
    for (let f = 0; f < PLAZA.floors; f++) {
      const y = P.Y(f), yt = y + CEIL
      // corridor south wall (v = 10) with a door
      out.push(boxU(EXT, d0, CORRIDOR.v0 - PART / 2, CORRIDOR.v0 + PART / 2, y, yt))
      out.push(boxU(d1, 28 - EXT, CORRIDOR.v0 - PART / 2, CORRIDOR.v0 + PART / 2, y, yt))
      out.push(boxU(d0, d1, CORRIDOR.v0 - PART / 2, CORRIDOR.v0 + PART / 2, y + dh, yt))
      // corridor north wall (v = 18) from the shaft to the east wall, with a door
      out.push(boxU(ELEVATOR.u1 + 0.2, d0, CORRIDOR.v1 - PART / 2, CORRIDOR.v1 + PART / 2, y, yt))
      out.push(boxU(d1, 28 - EXT, CORRIDOR.v1 - PART / 2, CORRIDOR.v1 + PART / 2, y, yt))
      out.push(boxU(d0, d1, CORRIDOR.v1 - PART / 2, CORRIDOR.v1 + PART / 2, y + dh, yt))
      // elevator shaft: front wall with door opening, side and back walls
      const fv0 = ELEVATOR.v0 - 0.15, fv1 = ELEVATOR.v0
      out.push(boxU(EXT, ELEVATOR.doorU0, fv0, fv1, y, yt))
      out.push(boxU(ELEVATOR.doorU1, ELEVATOR.u1 + 0.2, fv0, fv1, y, yt))
      out.push(boxU(ELEVATOR.doorU0, ELEVATOR.doorU1, fv0, fv1, y + ELEVATOR.doorH, yt))
      out.push(boxU(ELEVATOR.u1, ELEVATOR.u1 + 0.2, ELEVATOR.v0, ELEVATOR.v1 + 0.2, y - (f ? SLAB : 0), yt))
      out.push(boxU(EXT, ELEVATOR.u1 + 0.2, ELEVATOR.v1, ELEVATOR.v1 + 0.2, y - (f ? SLAB : 0), yt))
    }
    return out
  }, [])

  // interiors (rooms + upper corridors) only render when the camera is inside the building
  const inner = useRef()
  const { camera } = useThree()
  useFrame(() => {
    const c = camera.position
    const inside = c.x > PLAZA.x0 - 0.5 && c.x < PLAZA.x1 + 0.5 && c.z > PLAZA.z0 - 0.5 && c.z < PLAZA.z1 + 0.5 && c.y < P.Y(PLAZA.floors) + 1
    if (inner.current) inner.current.visible = inside
  })

  // corridor lights
  useEffect(() => {
    const offs = []
    for (let f = 0; f < PLAZA.floors; f++) for (const u of [6, 14, 22]) {
      offs.push(registerLightAnchor({ position: new THREE.Vector3(P.X(u), P.Y(f) + CEIL - 0.8, P.Z(14)), color: '#fff0dc', intensity: 8, distance: 10, range: 35 }))
    }
    return () => offs.forEach((o) => o())
  }, [])

  const cx = (PLAZA.x0 + PLAZA.x1) / 2, cz = (PLAZA.z0 + PLAZA.z1) / 2
  const roofY = P.Y(PLAZA.floors)

  return (
    <StaticBatch name="plaza">
      {/* ---- colliders: facades, slabs, partitions, roof parapet ---- */}
      <RigidBody type="fixed" colliders={false}>
        {facades.map(([u0, u1, v0, v1, y0, y1], i) => {
          const [x, y, z, sx, sy, sz] = boxU(u0, u1, v0, v1, y0, y1)
          return <CuboidCollider key={'f' + i} args={[sx / 2, sy / 2, sz / 2]} position={[x, y, z]} />
        })}
        {slabs.map(({ f, r }, i) => {
          const [x, y, z, sx, sy, sz] = boxU(r[0], r[1], r[2], r[3], P.Y(f) - SLAB, P.Y(f))
          return <CuboidCollider key={'s' + i} args={[sx / 2, sy / 2, sz / 2]} position={[x, y, z]} />
        })}
        {partitions.map(([x, y, z, sx, sy, sz], i) => <CuboidCollider key={'p' + i} args={[sx / 2, sy / 2, sz / 2]} position={[x, y, z]} />)}
      </RigidBody>

      {/* ---- facades ---- */}
      {facades.map(([u0, u1, v0, v1, y0, y1, kind, out], i) => {
        const [x, y, z, sx, sy, sz] = boxU(u0, u1, v0, v1, y0, y1)
        return <mesh key={'fv' + i} position={[x, y, z]} material={faceMats(kind, out)} castShadow={kind === 'stone'} receiveShadow><boxGeometry args={[sx, sy, sz]} /></mesh>
      })}
      {/* vertical stone piers outside */}
      {[0, 7, 14, 21, 28].flatMap((t) => [[P.X(t), P.Z(-0.15)], [P.X(t), P.Z(28.15)], [P.X(-0.15), P.Z(t)], [P.X(28.15), P.Z(t)]])
        .filter(([x, z]) => !(Math.abs(x - P.X(28.15)) < 0.01 && z > P.Z(ENTRY.v0 - 0.5) && z < P.Z(ENTRY.v1 + 0.5)))
        .map(([x, z], i) => (
          <mesh key={'pier' + i} position={[x, roofY / 2 + 0.4, z]} material={mats.stone} castShadow><boxGeometry args={[0.45, roofY + 0.8, 0.45]} /></mesh>
        ))}
      {/* roof + parapet */}
      <mesh position={[cx, roofY - SLAB / 2, cz]} material={mats.roof} receiveShadow castShadow><boxGeometry args={[W, SLAB, W]} /></mesh>
      {[[cx, cz - W / 2, W, 0.3], [cx, cz + W / 2, W, 0.3], [cx - W / 2, cz, 0.3, W], [cx + W / 2, cz, 0.3, W]].map(([x, z, sx, sz], i) => (
        <mesh key={'par' + i} position={[x, roofY + 0.45, z]} material={mats.stone}><boxGeometry args={[sx + 0.3, 0.9, sz + 0.3]} /></mesh>
      ))}
      <mesh position={[cx + 4, roofY + 1.2, cz + 6]} material={surface('concrete', 1, 1)}><boxGeometry args={[4, 2.4, 3]} /></mesh>

      {/* ---- slabs: floor finish on top, ceiling underneath, edge band ---- */}
      {slabs.map(({ f, r }, i) => {
        const [x, , z, sx, , sz] = boxU(r[0], r[1], r[2], r[3], 0, 1)
        return (
          <group key={'sv' + i}>
            <mesh position={[x, P.Y(f) - SLAB / 2, z]} material={mats.slabEdge}><boxGeometry args={[sx, SLAB - 0.02, sz]} /></mesh>
            {f < PLAZA.floors && <mesh position={[x, P.Y(f) + 0.002, z]} rotation={[-Math.PI / 2, 0, 0]} material={mats.corridorFloor} receiveShadow><planeGeometry args={[sx, sz]} /></mesh>}
            <mesh position={[x, P.Y(f) - SLAB - 0.002, z]} rotation={[Math.PI / 2, 0, 0]} material={mats.ceiling}><planeGeometry args={[sx, sz]} /></mesh>
          </group>
        )
      })}
      {/* ground floor lobby floor */}
      <mesh position={[P.X(14), P.Y(0) + 0.003, P.Z(14)]} rotation={[-Math.PI / 2, 0, 0]} material={mats.lobbyFloor} receiveShadow><planeGeometry args={[28 - EXT * 2, CORRIDOR.v1 - CORRIDOR.v0]} /></mesh>

      {/* ---- partitions ---- */}
      {partitions.map(([x, y, z, sx, sy, sz], i) => (
        <mesh key={'pv' + i} position={[x, y, z]} material={mats.plaster} castShadow receiveShadow><boxGeometry args={[sx, sy, sz]} /></mesh>
      ))}

      {/* ---- entrance, signage, landscaping ---- */}
      <DoubleDoor id="plaza-entrance" center={[P.X(28 - EXT / 2), P.Y(0), P.Z(14)]} halfWidth={1.8} height={ENTRY.h - 0.1} facing={Math.PI / 2} accent="#c9a96a" label="Vision Storms Plaza doors" />
      <BrandSign text="VISION STORMS PLAZA" sub="SHOPS · STUDIOS · SUITES" position={[P.X(28) + 0.06, P.Y(0) + 5.05, P.Z(14)]} rotation={[0, Math.PI / 2, 0]} width={12} />
      <mesh position={[P.X(28) + 1.6, P.Y(0) + ENTRY.h + 0.35, P.Z(14)]} material={mats.steel} castShadow><boxGeometry args={[3.2, 0.18, 6.4]} /></mesh>
      <FlowerBed x={P.X(28) + 3.3} z={P.Z(6)} w={3} d={9} seed={21} />
      <FlowerBed x={P.X(28) + 3.3} z={P.Z(22)} w={3} d={9} seed={22} />
      <Bench position={[P.X(28) + 5.6, P.Y(0), P.Z(5)]} yaw={Math.PI / 2} />
      <Bench position={[P.X(28) + 5.6, P.Y(0), P.Z(23)]} yaw={Math.PI / 2} />
      <Planter position={[P.X(28) + 1.4, P.Y(0), P.Z(10.6)]} />
      <Planter position={[P.X(28) + 1.4, P.Y(0), P.Z(17.4)]} />
      {[3, 25].map((v) => <Bollard key={v} position={[P.X(28) + 1.2, P.Y(0), P.Z(v)]} />)}
      <mesh position={[P.X(28) + 4.5, P.Y(0) + 0.008, P.Z(14)]} rotation={[-Math.PI / 2, 0, 0]} material={surface('pavers', 3, 1.5)} receiveShadow><planeGeometry args={[9, 5]} /></mesh>
      <FlowerBed x={P.X(-1.6)} z={P.Z(14)} w={2.2} d={20} seed={23} />
      <FlowerBed x={P.X(14)} z={P.Z(29.6)} w={20} d={2.2} seed={24} />
      <FlowerBed x={P.X(14)} z={P.Z(-1.6)} w={20} d={2.2} seed={25} />

      {/* ---- vertical circulation (always rendered: visible from the lobby) ---- */}
      <Stairs />
      <Elevator />

      {/* ---- lobby (ground floor corridor) ---- */}
      <Lobby />

      {/* ---- rooms and upper corridors: culled when the camera is outside ---- */}
      <group ref={inner} userData={{ noBatch: true }}>
        <UpperCorridors />
        <PlazaRooms />
      </group>

      {/* room doors (with rental access checks) */}
      {PLAZA_ROOMS.map((r) => <RoomDoor key={r.id} room={r} />)}
    </StaticBatch>
  )
}

// ---------------- room doors ----------------
function RoomDoor({ room }) {
  const y = P.Y(room.floor)
  const doorStyle = useDecor((st) => designFor(room.id, st)?.door || null)
  useEffect(() => {
    if (!room.rentable) return
    const south = room.side === 'south'
    return registerInteractable('rent-' + room.id, {
      position: new THREE.Vector3(P.X(DOOR_U + 1.6), y, P.Z(south ? CORRIDOR.v0 + 0.8 : CORRIDOR.v1 - 0.8)),
      radius: 0.9,
      label: `Rent ${room.name} (${room.id})`,
      onInteract: () => useStore.getState().openPanel({ type: 'rent', roomId: room.id }),
    })
  }, [room, y])
  const south = room.side === 'south'
  const v = south ? CORRIDOR.v0 : CORRIDOR.v1
  const hinge = [P.X(DOOR_U - 0.6), y, P.Z(v)]
  const plaqueV = south ? CORRIDOR.v0 + PART / 2 + 0.01 : CORRIDOR.v1 - PART / 2 - 0.01
  return (
    <>
      <SingleDoor
        id={'door-' + room.id}
        hinge={hinge}
        width={1.2}
        height={2.35}
        baseYaw={0}
        openAngle={south ? 1.45 : -1.45}
        label={`${room.name} door`}
        check={() => rentalAccess.check(room.id)}
        lockedLabel={() => rentalAccess.label(room.id)}
        style={doorStyle || undefined}
        key={'door-' + (doorStyle || 'wood')}
      />
      <Plaque lines={[room.id, room.name]} position={[P.X(DOOR_U + 1.25), y + 1.55, P.Z(plaqueV)]} rotation={[0, south ? 0 : Math.PI, 0]} width={0.9} />
    </>
  )
}

// ---------------- stairs ----------------
function Stairs() {
  const m = getMaterials()
  const step = surface('wood', 0.5, 0.3, { color: '#b49a7c' })
  const stringer = surface('concrete', 2, 0.5)
  const rise = FH, run = 7, n = 21
  const angle = Math.atan2(rise, run)
  const len = Math.hypot(rise, run)
  return (
    <group>
      {STAIRS.map((s, si) => {
        const y = P.Y(s.fromFloor)
        const west = s.up === 'west'
        const vc = (s.v0 + s.v1) / 2, w = s.v1 - s.v0
        const rot = west ? -angle : angle
        // ramp collider whose top surface passes through each step nosing
        const nx = west ? Math.sin(angle) : -Math.sin(angle), ny = Math.cos(angle)
        const cxU = (s.u0 + s.u1) / 2
        const rampC = [P.X(cxU) - nx * 0.1, y + rise / 2 - ny * 0.1, P.Z(vc)]
        // railing heights follow the slope
        const railY = y + rise / 2 + 0.95
        return (
          <group key={si}>
            <RigidBody type="fixed" colliders={false}>
              <CuboidCollider args={[len / 2, 0.1, w / 2]} position={rampC} rotation={[0, 0, rot]} />
              <CuboidCollider args={[len / 2, 0.55, 0.04]} position={[P.X(cxU), railY - 0.4, P.Z(s.v0 === 15.6 ? s.v0 : s.v1)]} rotation={[0, 0, rot]} />
            </RigidBody>
            {Array.from({ length: n }, (_, i) => {
              const u = west ? s.u1 - (i + 0.5) * (run / n) : s.u0 + (i + 0.5) * (run / n)
              return (
                <mesh key={i} position={[P.X(u), y + (i + 1) * (rise / n) - 0.03, P.Z(vc)]} material={step} castShadow receiveShadow>
                  <boxGeometry args={[run / n + 0.02, 0.06, w]} />
                </mesh>
              )
            })}
            <mesh position={rampC} rotation={[0, 0, rot]} material={stringer}><boxGeometry args={[len, 0.12, w]} /></mesh>
            {/* glass balustrade with steel handrail */}
            {[s.v0, s.v1].map((vv) => (
              <group key={vv}>
                <mesh position={[P.X(cxU), railY - 0.45, P.Z(vv)]} rotation={[0, 0, rot]} material={m.glass}><boxGeometry args={[len, 0.9, 0.02]} /></mesh>
                <mesh position={[P.X(cxU), railY, P.Z(vv)]} rotation={[0, 0, rot]} material={m.chrome}><boxGeometry args={[len, 0.05, 0.05]} /></mesh>
              </group>
            ))}
          </group>
        )
      })}
      {/* guard rails around the floor openings on the upper floors */}
      <RigidBody type="fixed" colliders={false}>
        {STAIRS.map((s, i) => {
          const y = P.Y(s.fromFloor + 1)
          const west = s.up === 'west'
          const sideV = s.v0 === 15.6 ? s.v0 : s.v1 // the side facing the corridor walkway
          const endU = west ? s.u1 : s.u0 // the end away from the arrival point
          return (
            <group key={i}>
              <CuboidCollider args={[(s.u1 - s.u0) / 2, 0.55, 0.04]} position={[P.X((s.u0 + s.u1) / 2), y + 0.55, P.Z(sideV)]} />
              <CuboidCollider args={[0.04, 0.55, (s.v1 - s.v0) / 2]} position={[P.X(endU), y + 0.55, P.Z((s.v0 + s.v1) / 2)]} />
              <mesh position={[P.X((s.u0 + s.u1) / 2), y + 0.5, P.Z(sideV)]} material={getMaterials().glass}><boxGeometry args={[s.u1 - s.u0, 1, 0.02]} /></mesh>
              <mesh position={[P.X((s.u0 + s.u1) / 2), y + 1.02, P.Z(sideV)]} material={getMaterials().chrome}><boxGeometry args={[s.u1 - s.u0, 0.05, 0.05]} /></mesh>
              <mesh position={[P.X(endU), y + 0.5, P.Z((s.v0 + s.v1) / 2)]} material={getMaterials().glass}><boxGeometry args={[0.02, 1, s.v1 - s.v0]} /></mesh>
              <mesh position={[P.X(endU), y + 1.02, P.Z((s.v0 + s.v1) / 2)]} material={getMaterials().chrome}><boxGeometry args={[0.05, 0.05, s.v1 - s.v0]} /></mesh>
            </group>
          )
        })}
      </RigidBody>
    </group>
  )
}

// ---------------- elevator ----------------
function Elevator() {
  const m = getMaterials()
  const car = useRef()
  const carCollider = useRef()
  const doors = useRef([])
  const doorBodies = useRef([])
  const wood = surface('wood', 1, 1, { color: '#7a5a42' })
  const brushed = m.aluminum
  const panelMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#202226', emissive: '#ffd9a0', emissiveIntensity: 0.6 }), [])
  const cw = ELEVATOR.u1 - ELEVATOR.u0, cd = ELEVATOR.v1 - ELEVATOR.v0
  const ccx = P.X((ELEVATOR.u0 + ELEVATOR.u1) / 2), ccz = P.Z((ELEVATOR.v0 + ELEVATOR.v1) / 2)
  const doorW = (ELEVATOR.doorU1 - ELEVATOR.doorU0) / 2
  const doorV = P.Z(ELEVATOR.v0 - 0.2)

  useEffect(() => {
    const offs = []
    // call buttons on every floor
    for (let f = 0; f < PLAZA.floors; f++) {
      offs.push(registerInteractable('elev-call-' + f, {
        position: new THREE.Vector3(P.X((ELEVATOR.doorU0 + ELEVATOR.doorU1) / 2), P.Y(f), P.Z(ELEVATOR.v0 - 1.2)),
        radius: 1.7,
        label: () => (elevator.floor === f && elevator.state === 'idle' ? 'Elevator is here' : 'Call elevator'),
        onInteract: () => elevator.call(f),
      }))
    }
    // floor selector inside the car
    offs.push(registerInteractable('elev-panel', {
      position: () => new THREE.Vector3(ccx, elevator.y, ccz),
      radius: 1.3,
      label: 'Choose a floor',
      onInteract: () => useStore.getState().openPanel({ type: 'elevator' }),
    }))
    offs.push(registerLightAnchor({ position: new THREE.Vector3(ccx, 0, ccz), color: '#fff2e0', intensity: 8, distance: 4, range: 12, follow: () => elevator.y + 2.2 }))
    return () => offs.forEach((o) => o())
  }, [ccx, ccz])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    elevator.update(dt)
    if (car.current) car.current.setNextKinematicTranslation({ x: ccx, y: elevator.y, z: ccz })
    if (carCollider.current) elevator.carHandles = new Set([carCollider.current.handle])
    // shaft doors: only the floor where the car stands opens
    for (let f = 0; f < PLAZA.floors; f++) {
      const open = Math.abs(elevator.y - P.Y(f)) < 0.01 ? elevator.door : 0
      const ease = open * open * (3 - 2 * open)
      for (let k = 0; k < 2; k++) {
        const b = doorBodies.current[f * 2 + k]
        if (!b) continue
        const base = P.X(ELEVATOR.doorU0 + doorW / 2 + k * doorW)
        const off = (k ? 1 : -1) * ease * (doorW - 0.08)
        b.setNextKinematicTranslation({ x: base + off, y: P.Y(f) + ELEVATOR.doorH / 2, z: doorV })
      }
    }
  })

  return (
    <group userData={{ noBatch: true }}>
      {/* car: floor collider rides up and down */}
      <RigidBody ref={car} type="kinematicPosition" colliders={false} position={[ccx, elevator.y, ccz]}>
        <CuboidCollider ref={carCollider} args={[cw / 2 - 0.02, 0.06, cd / 2 - 0.02]} position={[0, -0.06, 0]} />
        <mesh position={[0, -0.06, 0]} material={m.marbleFloor(1, 1)} receiveShadow><boxGeometry args={[cw, 0.12, cd]} /></mesh>
        <mesh position={[0, 2.55, 0]} material={brushed}><boxGeometry args={[cw, 0.08, cd]} /></mesh>
        <mesh position={[0, 2.5, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[cw * 0.6, cd * 0.6]} /><meshStandardMaterial color="#fff" emissive="#fff3e2" emissiveIntensity={1.4} /></mesh>
        <mesh position={[-cw / 2 + 0.03, 1.27, 0]} material={wood}><boxGeometry args={[0.04, 2.55, cd]} /></mesh>
        <mesh position={[cw / 2 - 0.03, 1.27, 0]} material={wood}><boxGeometry args={[0.04, 2.55, cd]} /></mesh>
        <mesh position={[0, 1.27, cd / 2 - 0.03]} material={brushed}><boxGeometry args={[cw, 2.55, 0.04]} /></mesh>
        <mesh position={[0, 0.95, cd / 2 - 0.06]} material={m.chrome}><boxGeometry args={[cw - 0.3, 0.04, 0.04]} /></mesh>
        <CarLights cw={cw} cd={cd} />
      </RigidBody>
      <HallLights />
      {/* shaft doors on every floor */}
      {Array.from({ length: PLAZA.floors * 2 }, (_, i) => {
        const f = Math.floor(i / 2), k = i % 2
        return (
          <RigidBody key={i} ref={(b) => (doorBodies.current[i] = b)} type="kinematicPosition" colliders={false} position={[P.X(ELEVATOR.doorU0 + doorW / 2 + k * doorW), P.Y(f) + ELEVATOR.doorH / 2, doorV]}>
            <CuboidCollider args={[doorW / 2, ELEVATOR.doorH / 2, 0.03]} />
            <mesh ref={(el) => (doors.current[i] = el)} material={brushed} castShadow><boxGeometry args={[doorW, ELEVATOR.doorH, 0.05]} /></mesh>
          </RigidBody>
        )
      })}
      {/* frames, call buttons and floor numbers */}
      {Array.from({ length: PLAZA.floors }, (_, f) => (
        <group key={'fr' + f}>
          <mesh position={[P.X((ELEVATOR.doorU0 + ELEVATOR.doorU1) / 2), P.Y(f) + ELEVATOR.doorH + 0.06, P.Z(ELEVATOR.v0 - 0.17)]} material={m.chrome}><boxGeometry args={[ELEVATOR.doorU1 - ELEVATOR.doorU0 + 0.2, 0.12, 0.04]} /></mesh>
          <mesh position={[P.X(ELEVATOR.doorU1 + 0.25), P.Y(f) + 1.15, P.Z(ELEVATOR.v0 - 0.17)]} material={panelMat}><boxGeometry args={[0.12, 0.25, 0.02]} /></mesh>
          <Plaque lines={[`FLOOR ${f + 1}`, ['Lobby · Bistro · Threads', 'Screening · Studio', 'Boardroom · Suite'][f]]} position={[P.X((ELEVATOR.doorU0 + ELEVATOR.doorU1) / 2), P.Y(f) + ELEVATOR.doorH + 0.78, P.Z(ELEVATOR.v0 - 0.17)]} rotation={[0, Math.PI, 0]} width={1.2} />
        </group>
      ))}
    </group>
  )
}

// ---------------- lobby ----------------
function Lobby() {
  const y = P.Y(0)
  return (
    <group>
      <Counter position={[P.X(24), y, P.Z(16.9)]} yaw={Math.PI} length={3.4} />
      <Chair position={[P.X(24), y, P.Z(17.6)]} yaw={Math.PI} color="#2c2f36" />
      <Sofa position={[P.X(23.5), y, P.Z(10.8)]} yaw={0} length={2.6} color="#7c6b5b" />
      <Sofa position={[P.X(15), y, P.Z(10.8)]} yaw={0} length={2.2} color="#58616c" />
      <Plant position={[P.X(27), y, P.Z(10.8)]} scale={1.2} />
      <Plant position={[P.X(27), y, P.Z(17.3)]} scale={1.2} />
      <Plant position={[P.X(12), y, P.Z(17.3)]} />
      <BrandSign text="VISION STORMS" sub="PLAZA DIRECTORY" position={[P.X(14), y + 2.9, P.Z(CORRIDOR.v1 - PART / 2 - 0.01)]} rotation={[0, Math.PI, 0]} width={4.4} color="#2a2a2c" glow="#ffffff" />
      <Plaque lines={['DIRECTORY', '1 Bistro · Threads   2 Screening · Studio   3 Boardroom · Suite']} position={[P.X(14), y + 1.6, P.Z(CORRIDOR.v1 - PART / 2 - 0.01)]} rotation={[0, Math.PI, 0]} width={3.2} />
      {[6, 14, 22].map((u) => <CeilingLight key={u} position={[P.X(u), y + CEIL - 0.01, P.Z(14)]} size={[2.4, 0.5]} intensity={0} />)}
    </group>
  )
}

function UpperCorridors() {
  return [1, 2].map((f) => {
    const y = P.Y(f)
    return (
      <group key={f}>
        <Sofa position={[P.X(24), y, P.Z(10.8)]} yaw={0} length={2.2} color={f === 1 ? '#5f6b62' : '#6a5d6f'} />
        <Plant position={[P.X(27), y, P.Z(17.3)]} />
        <Plant position={[P.X(13), y, P.Z(17.3)]} />
        {[6, 14, 22].map((u) => <CeilingLight key={u} position={[P.X(u), y + CEIL - 0.01, P.Z(14)]} size={[2.4, 0.5]} intensity={0} />)}
      </group>
    )
  })
}
