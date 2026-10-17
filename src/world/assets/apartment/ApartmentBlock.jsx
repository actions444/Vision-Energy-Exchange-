import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { Builder, punch } from '../../facade/kit.js'
import { surface } from '../../materials.js'
import { assetMats } from '../materials.js'
import { buildApartmentShell, aptLayout, unitToWorld, APT } from './buildApartment.js'
import { DoubleDoor, SingleDoor } from '../../Door.jsx'
import { BrandSign } from '../../signs.jsx'
import { Bench } from '../../props.jsx'
import { Sofa, Table, Rug, Plant, DiningSet, Stool, Chair, Counter, CeilingLight, Shelf } from '../../furniture.jsx'
import { Toilet, Vanity, Shower, TowelRail, LightSwitch, TV } from '../../Interior.jsx'
import { Bed, NightStand, Wardrobe, KitchenRun, Console, MailboxBank } from './furnishings.jsx'
import { registerInteractable } from '../../../state/runtime.js'
import { useStore } from '../../../state/store.js'
import { Lawn } from '../../flora/Plants.jsx'

// A complete apartment building from the modular kit: shell (buildApartment.js), interior shell (corridors,
// party walls, slabs with a stairwell hole, switchback stair with guard rails), a lobby with mailboxes, working doors,
// and fully furnished sample units. Units that are not samples are sealed: their doors say "Residents only".
//
// What is functional: front and rear entrance doors, the stair (walk up and down), corridor doors to the two sample
// units, interior doors (bathroom, bedroom), the glass door to the patio / balcony, seating (sofa, chairs, stools, bed,
// bench), light switches. What is scenery: every other unit's interior, the balconies of other units, the rooftop.

const nameOf = (floor, unit) => `${floor + 1}${'ABCD'[unit]}`

/** Place + collide a door that cannot be opened (residents only). */
function LockedDoor({ id, hinge, width, height, label }) {
  useEffect(() => registerInteractable(id, {
    position: new THREE.Vector3(hinge[0] + width / 2, hinge[1] + 1, hinge[2]),
    radius: 1.8,
    label: () => `${label} · residents only`,
    onInteract: () => useStore.getState().showToast(`${label} is a private residence. The model apartments are 1A (ground floor) and 2A (second floor).`),
  }), [id]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[width / 2, height / 2, 0.06]} position={[hinge[0] + width / 2, hinge[1] + height / 2, hinge[2]]} />
      </RigidBody>
      <mesh position={[hinge[0] + width / 2, hinge[1] + height / 2, hinge[2]]} material={surface('wood', 0.6, 1.2, { color: '#8a6a52' })} castShadow>
        <boxGeometry args={[width, height, 0.06]} />
      </mesh>
    </>
  )
}

/** Shows its children only while the camera is near the building (interiors are not drawn from across town). */
function NearGate({ bounds, margin = 24, children }) {
  const ref = useRef()
  const { camera } = useThree()
  useFrame(() => {
    const c = camera.position
    if (ref.current) ref.current.visible = c.x > bounds[0] - margin && c.x < bounds[1] + margin && c.z > bounds[2] - margin && c.z < bounds[3] + margin
  })
  return <group ref={ref} userData={{ noBatch: true }}>{children}</group>
}

function planBuilding(spec) {
  const L = aptLayout(spec)
  const { base, floors, floorH, xs, zc0, zc1, zu0, zu1, well, cx, z0, z1, x0, x1 } = L
  const T = APT.T, PART = APT.PART
  const shell = buildApartmentShell(spec)
  const I = new Builder() // interior shell
  const cols = [] // [cx, cy, cz, hx, hy, hz]
  const box = (key, xa, xb, ya, yb, za, zb, collide = true) => {
    if (xb - xa < 1e-4 || yb - ya < 1e-4 || zb - za < 1e-4) return
    I.box(key, (xa + xb) / 2, (ya + yb) / 2, (za + zb) / 2, xb - xa, yb - ya, zb - za)
    if (collide) cols.push([(xa + xb) / 2, (ya + yb) / 2, (za + zb) / 2, (xb - xa) / 2, (yb - ya) / 2, (zb - za) / 2])
  }
  const col = (xa, xb, ya, yb, za, zb) => { if (xb - xa > 1e-4 && yb - ya > 1e-4 && zb - za > 1e-4) cols.push([(xa + xb) / 2, (ya + yb) / 2, (za + zb) / 2, (xb - xa) / 2, (yb - ya) / 2, (zb - za) / 2]) }
  const Y = (k) => base + k * floorH
  const h = floors * floorH
  const doorHalf = 1.1
  const sampleSet = new Set((spec.sample || []).map((s) => `${s.floor}:${s.unit}`))

  // ---- ground slab edge, floor slabs (with the stairwell hole), roof slab ----
  const slabRects = (k) => {
    if (k === 0 || k === floors) return [[x0, x1, z0, z1]] // roof slab and the ground floor have no hole
    return [[x0, well.x0, z0, z1], [well.x1, x1, z0, z1], [well.x0, well.x1, z0, well.z0], [well.x0, well.x1, well.z1, z1]]
  }
  for (let k = 1; k <= floors; k++) {
    for (const [xa, xb, za, zb] of slabRects(k)) box('concrete', xa, xb, Y(k) - 0.3, Y(k), za, zb, true)
  }
  // ---- exterior wall colliders (windows are solid; only real doors are gaps) ----
  const front = { z: z1 - T / 2, holes: [] }, rear = { z: z0 + T / 2, holes: [] }
  front.holes.push({ x0: cx - doorHalf, x1: cx + doorHalf, v0: 0, v1: 2.5 })
  rear.holes.push({ x0: cx + 0.4, x1: cx + 0.4 + doorHalf * 2, v0: 0, v1: 2.5 })
  const doorLeafW = 1.3
  const sliderGaps = []
  for (const s of spec.sample || []) {
    const u = L.units[s.unit]
    const [xa] = unitToWorld(L, u, 1.2, 0), [xb] = unitToWorld(L, u, 1.2 + doorLeafW, 0)
    const lo = Math.min(xa, xb), hi = Math.max(xa, xb)
    front.holes.push({ x0: lo, x1: hi, v0: s.floor * floorH + 0.04, v1: s.floor * floorH + 2.3 })
    sliderGaps.push({ ...s, lo, hi })
  }
  for (const f of [front, rear]) {
    for (const p of punch(x0, x1, 0, h, f.holes)) col(p.x0, p.x1, base + p.v0, base + p.v1, f.z - T / 2, f.z + T / 2)
  }
  col(x0, x0 + T, base, base + h, z0 + T, z1 - T)
  col(x1 - T, x1, base, base + h, z0 + T, z1 - T)
  // ---- balcony slabs (visual in the shell; colliders here) and patio slabs ----
  for (let k = 1; k < floors; k++) for (const u of L.units) {
    const [wa] = unitToWorld(L, u, 0.7, 0), [wb] = unitToWorld(L, u, 4.7, 0)
    col(Math.min(wa, wb), Math.max(wa, wb), Y(k) - 0.22, Y(k) - 0.02, z1, z1 + 1.6)
  }
  // balcony guard rails for sample balconies (so the model apartment's balcony is safe to walk on)
  for (const s of spec.sample || []) {
    if (s.floor < 1) continue
    const u = L.units[s.unit]
    const [wa] = unitToWorld(L, u, 0.7, 0), [wb] = unitToWorld(L, u, 4.7, 0)
    const a = Math.min(wa, wb), b = Math.max(wa, wb), y = Y(s.floor)
    col(a, b, y, y + 1.05, z1 + 1.52, z1 + 1.6)
    col(a, a + 0.08, y, y + 1.05, z1, z1 + 1.6)
    col(b - 0.08, b, y, y + 1.05, z1, z1 + 1.6)
  }
  // ground-floor patio of each unit: a 5 cm pad (walkable)
  for (const u of L.units) {
    const [wa] = unitToWorld(L, u, 0.7, 0), [wb] = unitToWorld(L, u, 4.7, 0)
    col(Math.min(wa, wb), Math.max(wa, wb), base, base + 0.05, z1, z1 + 1.8)
    col(Math.min(wa, wb), Math.max(wa, wb), base, base + 0.5, z1 + 1.6, z1 + 1.8) // planter wall along the front of the patio
  }

  // ---- storey by storey: party walls, corridor partitions, common finishes ----
  const unitDoors = [] // {floor, unit, x0, x1, z}
  const wallH = floorH - 0.3
  for (let k = 0; k < floors; k++) {
    const y0 = Y(k)
    const gaps = L.units.map((u) => {
      const [xa] = unitToWorld(L, u, 7.4, 0), [xb] = unitToWorld(L, u, 8.4, 0)
      return { x0: Math.min(xa, xb), x1: Math.max(xa, xb), v0: 0, v1: 2.1, unit: u.id }
    })
    // corridor partition (z zc1 .. zu0): west wing and east wing, door gaps for the four units
    for (const [ra, rb] of [[xs[0], xs[2]], [xs[3], xs[5]]]) {
      const hs = gaps.filter((g) => g.x0 >= ra - 0.01 && g.x1 <= rb + 0.01)
      for (const p of punch(ra, rb, 0, wallH, hs)) box('plaster', p.x0, p.x1, y0 + p.v0, y0 + p.v1, zc1, zu0)
    }
    for (const g of gaps) unitDoors.push({ floor: k, unit: g.unit, x0: g.x0, x1: g.x1, z: (zc1 + zu0) / 2 })
    // party walls between units and around the core
    for (const xw of [xs[1], xs[2], xs[3], xs[4]]) box('plaster', xw - PART / 2, xw + PART / 2, y0, y0 + wallH, zu0, zu1)
    // stair-well wall on the lobby side of the core: none (the stair is open to the lobby); guard rails are added below
  }

  // ---- stair (switchback, 8 + 8 risers per storey) ----
  const R = floorH / 16, TREAD = 0.28
  const flightW = 1.35
  const fx0 = well.x0, fx1 = well.x0 + flightW, gx0 = well.x1 - flightW, gx1 = well.x1
  const landZ0 = well.z0 + 8 * TREAD
  const xc = (fx1 + gx0) / 2 // centre line between the flights
  const stairs = []
  const slopeRail = (xr, zA, zB, yA, yB) => { // posts every ~0.4 m following a flight
    const n = 8
    for (let i = 0; i <= n; i++) { const t = i / n; I.box('rail', xr, yA + (yB - yA) * t + 0.5, zA + (zB - zA) * t, 0.04, 1.0, 0.04) }
    const g = new THREE.BoxGeometry(0.05, 0.05, Math.hypot(zB - zA, yB - yA))
    g.rotateX(-Math.atan2(yB - yA, zB - zA)); g.translate(xr, (yA + yB) / 2 + 1.0, (zA + zB) / 2)
    I.add('rail', setUV(g))
  }
  for (let k = 0; k < floors - 1; k++) {
    const y0 = Y(k)
    for (let i = 1; i <= 8; i++) {
      // flight 1 (west column) climbs from the corridor end southwards; flight 2 (east column) returns north
      const za = well.z0 + (i - 1) * TREAD, zb = well.z0 + i * TREAD
      I.box('stepTop', (fx0 + fx1) / 2, y0 + i * R - 0.03, (za + zb) / 2 + 0.02, flightW, 0.06, TREAD + 0.04)
      I.box('concrete', (fx0 + fx1) / 2, y0 + (i * R - 0.06) / 2, (za + zb) / 2, flightW, i * R - 0.06, TREAD)
      const z2b = landZ0 - (i - 1) * TREAD, z2a = landZ0 - i * TREAD
      const top = y0 + 8 * R + i * R
      I.box('stepTop', (gx0 + gx1) / 2, top - 0.03, (z2a + z2b) / 2 - 0.02, flightW, 0.06, TREAD + 0.04)
      I.box('concrete', (gx0 + gx1) / 2, (top - 0.06 + y0 + 8 * R) / 2, (z2a + z2b) / 2, flightW, i * R - 0.06, TREAD)
    }
    // mid landing (full well width), solid underneath on the ground floor, a slab above the lobby elsewhere
    I.box('concrete', (well.x0 + well.x1) / 2, y0 + 8 * R - 0.1, (landZ0 + well.z1) / 2, well.x1 - well.x0, 0.2, well.z1 - landZ0)
    I.box('stepTop', (well.x0 + well.x1) / 2, y0 + 8 * R + 0.01, (landZ0 + well.z1) / 2, well.x1 - well.x0, 0.02, well.z1 - landZ0)
    col(well.x0, well.x1, y0 + 8 * R - 0.2, y0 + 8 * R, landZ0, well.z1)
    if (k === 0) {
      I.box('concrete', (well.x0 + well.x1) / 2, (y0 + y0 + 8 * R - 0.2) / 2, (landZ0 + well.z1) / 2, well.x1 - well.x0, 8 * R - 0.2, well.z1 - landZ0)
      I.box('concrete', (gx0 + gx1) / 2, (y0 + y0 + 8 * R) / 2, (well.z0 + landZ0) / 2, flightW, 8 * R, landZ0 - well.z0) // solid under flight 2
      col(gx0, gx1, y0, y0 + 8 * R, well.z0, landZ0); col(well.x0, well.x1, y0, y0 + 8 * R - 0.2, landZ0, well.z1)
    }
    // colliders: each flight is a smooth ramp whose top runs just under the nosings (autostepping four risers in a row is unreliable)
    const slope = Math.atan2(7 * R, 7 * TREAD), len = Math.hypot(7 * R, 7 * TREAD)
    const dn = 0.45 * R, hy = 0.1
    // flight 1: from (z0, R - dn) to (z0 + 7T, 8R - dn), rising toward +z
    stairs.push({ ramp: { pos: [(fx0 + fx1) / 2, y0 + 4.5 * R - dn - Math.cos(slope) * hy, well.z0 + 3.5 * TREAD + Math.sin(slope) * hy], half: [flightW / 2, hy, len / 2], rotX: -slope } })
    // flight 2: from (landZ0, 9R - dn) to (landZ0 - 7T, 16R - dn), rising toward -z
    stairs.push({ ramp: { pos: [(gx0 + gx1) / 2, y0 + 12.5 * R - dn - Math.cos(slope) * hy, landZ0 - 3.5 * TREAD - Math.sin(slope) * hy], half: [flightW / 2, hy, len / 2], rotX: slope } })
    // flat treads at the top of each flight (flush with the landing / the floor above)
    col(fx0, fx1, y0 + 8 * R - 0.2, y0 + 8 * R, well.z0 + 7 * TREAD, landZ0)
    col(gx0, gx1, y0 + 16 * R - 0.2, y0 + 16 * R, well.z0, well.z0 + TREAD)
    // balustrade: centre run beside both flights, east edge of flight 2, south edge of the landing, east edge of the landing
    slopeRail(xc, well.z0 + 0.05, landZ0, y0 + R, y0 + 8 * R)
    slopeRail(xc, landZ0, well.z0 + 0.05, y0 + 9 * R, y0 + 16 * R)
    col(fx1, gx0, y0, y0 + 16 * R + 1, well.z0, landZ0) // keeps feet out of the 20 cm gap between the flights
    slopeRail(gx1 - 0.03, landZ0, well.z0 + 0.05, y0 + 9 * R, y0 + 16 * R)
    col(gx1 - 0.05, gx1, y0 + 8 * R, y0 + 16 * R + 1.1, well.z0, landZ0)
    const rail = (xa, xb, za, zb, ya, yb) => { I.box('rail', (xa + xb) / 2, (ya + yb) / 2, (za + zb) / 2, xb - xa, yb - ya, zb - za); col(xa, xb, ya, yb, za, zb) }
    rail(well.x1 - 0.05, well.x1, landZ0, well.z1, y0 + 8 * R, y0 + 8 * R + 1.05)
    rail(well.x0, well.x1, well.z1 - 0.05, well.z1, y0 + 8 * R, y0 + 8 * R + 1.05)
  }
  // guard rails around the stair opening on each upper floor (south and east edges)
  for (let k = 1; k < floors; k++) {
    const y = Y(k)
    const rail = (xa, xb, za, zb) => { I.box('rail', (xa + xb) / 2, y + 0.53, (za + zb) / 2, xb - xa, 1.06, zb - za); col(xa, xb, y, y + 1.1, za, zb) }
    rail(well.x1 - 0.05, well.x1, well.z0 + 0.1, well.z1)
    rail(well.x0, well.x1, well.z1 - 0.05, well.z1)
  }

  // ---- common finishes: tile floors, plaster ceilings ----
  for (let k = 0; k < floors; k++) {
    const y0 = Y(k)
    const lobby = (a, b, c, d) => I.box('tileFloor', (a + b) / 2, y0 + 0.011, (c + d) / 2, b - a, 0.022, d - c)
    lobby(xs[0], xs[5], zc0, zc1 + PART) // corridor
    // core floor (lobby), minus the stair hole on the floors above
    if (k === 0) lobby(xs[2] + PART / 2, xs[3] - PART / 2, zu0, zu1)
    else { lobby(xs[2] + PART / 2, well.x0, zu0, zu1); lobby(well.x1, xs[3] - PART / 2, zu0, zu1); lobby(well.x0, well.x1, well.z1, zu1) }
    const cy = Y(k + 1) - 0.3 - 0.011
    const ceil = (a, b, c, d) => I.box('ceil', (a + b) / 2, cy, (c + d) / 2, b - a, 0.022, d - c)
    ceil(xs[0], xs[5], zc0, zc1 + PART)
    ceil(xs[2] + PART / 2, xs[3] - PART / 2, zu0, zu1)
  }
  // plaster behind the exterior wall inner faces is in the shell; the corridor's rear wall sits on the shell

  return { shell, I, cols, stairs, unitDoors, sliderGaps, L, sampleSet }
}
function setUV(g) { const p = g.attributes.position, uv = new Float32Array(p.count * 2); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g }

// ---------------------------------------------------------------------------------------------------------------
// the apartment itself (furniture + room doors); coordinates are unit-local (u east 0..9, v south 0..D), mirrored by `mirror`
// ---------------------------------------------------------------------------------------------------------------
function Unit({ L, unit, floor, zone, label }) {
  const { base, floorH } = L
  const y0 = base + floor * floorH + 0.022
  const mir = unit.mirror
  const P = (u, v, y = 0) => { const [x, z] = unitToWorld(L, unit, u, v); return [x, y0 + y, z] }
  const Yw = (yaw) => (mir ? -yaw : yaw)
  const wallH = floorH - 0.3
  const T2 = 0.06 // half thickness of room partitions
  const wallsU = [ // [uA, uB, v] horizontal (along u) and [u, vA, vB] vertical
    ['h', 6.0, 9.0, 2.2, [[6.2, 7.1]]],
    ['h', 5.2, 9.0, 5.0, []],
    ['v', 6.0, 2.2, 5.0, []],
    ['v', 5.2, 5.0, L.D, [[5.6, 6.5]]],
  ]
  // convert to world rectangles
  const rects = []
  for (const [kind, a, b, c, gaps] of wallsU) {
    // intervals along the wall that remain after gaps
    const cuts = [[a, b]]
    const spans = []
    let cur = a
    for (const [ga, gb] of gaps) { spans.push([cur, ga]); cur = gb }
    spans.push([cur, b])
    for (const [sa, sb] of spans) {
      if (sb - sa < 1e-3) continue
      if (kind === 'h') { const [xa, z] = unitToWorld(L, unit, sa, c), [xb] = unitToWorld(L, unit, sb, c); rects.push([Math.min(xa, xb), Math.max(xa, xb), z - T2, z + T2, 0, wallH]) }
      else { const [x, za] = unitToWorld(L, unit, a, sa), [, zb] = unitToWorld(L, unit, a, sb); rects.push([x - T2, x + T2, Math.min(za, zb), Math.max(za, zb), 0, wallH]) }
    }
    // lintels over gaps
    for (const [ga, gb] of gaps) {
      if (kind === 'h') { const [xa, z] = unitToWorld(L, unit, ga, c), [xb] = unitToWorld(L, unit, gb, c); rects.push([Math.min(xa, xb), Math.max(xa, xb), z - T2, z + T2, 2.1, wallH]) }
      else { const [x, za] = unitToWorld(L, unit, a, ga), [, zb] = unitToWorld(L, unit, a, gb); rects.push([x - T2, x + T2, Math.min(za, zb), Math.max(za, zb), 2.1, wallH]) }
    }
    void cuts
  }
  const A = assetMats()
  const wall = A.f.plaster
  const bathTile = useMemo(() => surface('tile', 1 / 0.3, 1 / 0.3, { color: '#d4d6d4', roughness: 0.3 }), [])
  // room doors: [kind, gap a, gap b, wall coordinate, swing]
  const doorFor = (kind, ga, gb, c, swing) => {
    if (kind === 'h') {
      const [xa, z] = unitToWorld(L, unit, ga, c), [xb] = unitToWorld(L, unit, gb, c)
      return { hinge: [Math.min(xa, xb), y0, z], width: Math.abs(xb - xa), baseYaw: 0, openAngle: swing > 0 ? -1.55 : 1.55 }
    }
    const [x, za] = unitToWorld(L, unit, ga, c), [, zb] = unitToWorld(L, unit, gb, c)
    const sx = (mir ? -1 : 1) * swing
    return { hinge: [x, y0, Math.min(za, zb)], width: Math.abs(zb - za), baseYaw: -Math.PI / 2, openAngle: sx > 0 ? 1.55 : -1.55 }
  }
  const bathDoor = doorFor('h', 6.2, 7.1, 2.2, +1)
  const bedDoor = doorFor('v', 5.6, 6.5, 5.2, +1)
  const slider = L.sample?.find((s) => s.floor === floor && s.unit === unit.id)
  void slider
  return (
    <group>
      {/* partitions */}
      <RigidBody type="fixed" colliders={false}>
        {rects.map(([xa, xb, za, zb, ya, yb], i) => <CuboidCollider key={i} args={[(xb - xa) / 2, (yb - ya) / 2, (zb - za) / 2]} position={[(xa + xb) / 2, y0 + (ya + yb) / 2, (za + zb) / 2]} />)}
      </RigidBody>
      {rects.map(([xa, xb, za, zb, ya, yb], i) => (
        <mesh key={i} position={[(xa + xb) / 2, y0 + (ya + yb) / 2, (za + zb) / 2]} material={wall} castShadow receiveShadow><boxGeometry args={[xb - xa, yb - ya, zb - za]} /></mesh>
      ))}
      {/* floors and ceilings of the rooms */}
      {(() => {
        const [xa, za] = unitToWorld(L, unit, 0, 0), [xb, zb] = unitToWorld(L, unit, 9, L.D)
        const cxm = (xa + xb) / 2, czm = (za + zb) / 2, w = Math.abs(xb - xa), d = Math.abs(zb - za)
        return (
          <>
            <mesh position={[cxm, y0 - 0.011 + 0.001, czm]} material={surface('wood', 1 / 1.6, 1 / 1.6, { color: '#b99b78', roughness: 0.5 })} receiveShadow><boxGeometry args={[w, 0.022, d]} /></mesh>
            {(() => { const [ta, tb] = unitToWorld(L, unit, 6.06, 2.26), [tc, td] = unitToWorld(L, unit, 8.94, 4.94); return <mesh position={[(ta + tc) / 2, y0 + 0.006, (tb + td) / 2]} material={bathTile} receiveShadow><boxGeometry args={[Math.abs(tc - ta), 0.012, Math.abs(td - tb)]} /></mesh> })()}
            <mesh position={[cxm, y0 + wallH - 0.022 + 0.011, czm]} material={A.f.plaster}><boxGeometry args={[w, 0.022, d]} /></mesh>
            {/* skirting */}
            <mesh position={[(xa + xb) / 2, y0 + 0.06, za + (zb > za ? 0.01 : -0.01)]} material={A.f.plaster}><boxGeometry args={[w, 0.12, 0.02]} /></mesh>
          </>
        )
      })()}
      {/* doors */}
      <SingleDoor id={`apt-${zone}-bath`} hinge={bathDoor.hinge} width={bathDoor.width} height={2.05} baseYaw={bathDoor.baseYaw} openAngle={bathDoor.openAngle} label="bathroom door" />
      <SingleDoor id={`apt-${zone}-bed`} hinge={bedDoor.hinge} width={bedDoor.width} height={2.05} baseYaw={bedDoor.baseYaw} openAngle={bedDoor.openAngle} label="bedroom door" />

      {/* kitchen + island + dining */}
      <KitchenRun position={P(2.6, 0.33)} yaw={0} length={4.2} />
      <Counter position={P(2.5, 2.7, 0)} yaw={0} length={2.0} height={0.95} depth={0.72} top="marble" face="#d9d5cc" />
      <Stool position={P(1.9, 3.35)} />
      <Stool position={P(3.1, 3.35)} />
      <DiningSet position={P(2.8, 5.5)} round chairs={4} size={0.95} />
      {/* living */}
      <Rug position={P(2.6, 8.4, 0)} size={[3.4, 2.6]} color="#8a7f93" />
      <Sofa position={P(0.7, 8.5)} yaw={Yw(Math.PI / 2)} length={2.2} color="#6a7b86" />
      <Table position={P(2.4, 8.5)} yaw={Yw(Math.PI / 2)} size={[1.1, 0.6]} height={0.42} />
      <Chair position={P(3.6, 7.0)} yaw={Yw(-2.4)} color="#a7677f" />
      <TV id={`apt-${zone}-tv`} position={P(5.05, 8.5, 1.15)} yaw={Yw(-Math.PI / 2)} size={[1.3, 0.73]} zone={zone} soundbar={false} />
      <Plant position={P(0.55, 9.8)} scale={0.9} kind="fiddle" />
      <Plant position={P(4.6, 9.8)} scale={0.8} kind="areca" />
      {/* hall */}
      <Console position={P(8.78, 1.2)} yaw={Yw(-Math.PI / 2)} width={1.1} />
      <Rug position={P(7.2, 1.1, 0)} size={[1.2, 2.0]} color="#5d6e74" yaw={0} />
      <LightSwitch position={P(6.12, 1.25, 0)} yaw={Yw(Math.PI / 2)} zone={zone} />
      {/* bath */}
      <Toilet position={P(8.45, 4.7)} yaw={Math.PI} />
      <Vanity position={P(6.35, 3.7)} yaw={Yw(Math.PI / 2)} width={1.1} zone={zone} />
      <Shower position={P(8.4, 2.85)} yaw={0} w={1.1} d={1.1} h={2.2} zone={zone} />
      <TowelRail position={P(7.3, 4.92, 1.15)} yaw={Math.PI} />
      {/* bedroom */}
      <Bed position={P(8.0, 8.0)} yaw={Yw(-Math.PI / 2)} />
      <NightStand position={P(8.75, 6.8)} yaw={Yw(-Math.PI / 2)} />
      <NightStand position={P(8.75, 9.2)} yaw={Yw(-Math.PI / 2)} />
      <Wardrobe position={P(7.3, 5.36)} yaw={0} width={1.8} />
      <Rug position={P(7.0, 8.0, 0)} size={[2.3, 1.9]} color="#6b6174" yaw={Math.PI / 2} />
      <Plant position={P(5.6, 9.9)} scale={0.7} kind="snake" />
      {/* lights (one switch controls the whole apartment) */}
      <CeilingLight position={P(2.4, 7.2, wallH - 0.02)} size={[0.9, 0.5]} zone={zone} intensity={20} distance={9} watts={30} />
      <CeilingLight position={P(2.4, 2.2, wallH - 0.02)} size={[0.9, 0.5]} zone={zone} intensity={18} distance={8} watts={30} />
      <CeilingLight position={P(7.4, 1.0, wallH - 0.02)} size={[0.5, 0.5]} zone={zone} intensity={8} distance={5} watts={12} />
      <CeilingLight position={P(7.4, 3.6, wallH - 0.02)} size={[0.5, 0.5]} zone={zone} intensity={4} distance={4} watts={12} />
      <CeilingLight position={P(7.0, 7.6, wallH - 0.02)} size={[0.9, 0.5]} zone={zone} intensity={14} distance={7} watts={24} />
      {/* name plate on the corridor wall */}
      {label}
    </group>
  )
}

// ---------------------------------------------------------------------------------------------------------------

/**
 * spec: { x0, z0, z1, base, floors, floorH, seed, sample: [{floor, unit}], render: '#e4d6bd', number: '2200', name: 'MEADOWBROOK TERRACE' }
 * (x1 follows from the modular plan: 4 units + core = 42.7 m long)
 */
export default function ApartmentBlock({ spec }) {
  const plan = useMemo(() => planBuilding(spec), []) // eslint-disable-line react-hooks/exhaustive-deps
  const { shell, I, cols, stairs, unitDoors, L } = plan
  const A = assetMats()
  const f = A.f
  const geos = shell.geos
  const ig = useMemo(() => I.merged(), [I])
  const tint = f.tint('render', spec.render || '#e4d6bd')
  const matShell = { brick: f.brick, render: tint, stone: f.stone, granite: f.granite, concrete: f.concrete, plaster: f.plaster, roof: f.roof, steel: f.steel, galv: A.galv, frame: A.frame, rail: A.rail, sconce: A.sconce, accentStrip: A.accentStrip, glazing: f.glazing }
  const tileFloor = useMemo(() => surface('tile', 1 / 0.6, 1 / 0.6, { color: '#c9c5bd', roughness: 0.35 }), [])
  const stepTop = useMemo(() => surface('wood', 1 / 0.9, 1 / 0.9, { color: '#9b8062' }), [])
  const ceilMat = f.plaster
  const matInt = { plaster: f.plaster, concrete: f.concrete, rail: A.rail, tileFloor, stepTop, ceil: ceilMat }
  const { base, floors, floorH, xs, zc0, zc1, zu0, zu1, well, cx, x0, x1, z0, z1 } = L
  const bounds = [x0, x1, z0 - 4, z1 + 6]
  const zoneLobby = `${spec.id || 'apt'}-lobby`
  const sampleZones = (spec.sample || []).map((s) => ({ ...s, zone: `${spec.id || 'apt'}-${nameOf(s.floor, s.unit).toLowerCase()}` }))
  const isSample = (floor, unit) => (spec.sample || []).some((s) => s.floor === floor && s.unit === unit)
  const slidersFor = plan.sliderGaps

  return (
    <group>
      {/* shell: one mesh per material */}
      {Object.keys(matShell).map((k) => geos[k] && <mesh key={k} geometry={geos[k]} material={matShell[k]} castShadow={k !== 'plaster' && k !== 'glazing' && k !== 'roof'} receiveShadow />)}
      {['glass', 'streak', 'grime'].map((k, i) => geos[k] && <mesh key={k} geometry={geos[k]} material={k === 'glass' ? f.glass : f[k]} renderOrder={2 + i} />)}

      {/* physics: exterior walls, slabs, stairs, rails */}
      <RigidBody type="fixed" colliders={false}>
        {cols.map(([x, y, z, hx, hy, hz], i) => <CuboidCollider key={i} args={[hx, hy, hz]} position={[x, y, z]} />)}
        {stairs.map((s, i) => s.ramp && <CuboidCollider key={'s' + i} args={s.ramp.half} position={s.ramp.pos} rotation={[s.ramp.rotX, 0, 0]} />)}
      </RigidBody>

      {/* interior shell (corridors, party walls, stairs, finishes): only while the camera is near */}
      <NearGate bounds={bounds}>
        {Object.keys(ig).map((k) => <mesh key={k} geometry={ig[k]} material={matInt[k]} castShadow receiveShadow />)}
        {/* corridor + lobby lights */}
        {Array.from({ length: floors }, (_, k) => (
          <group key={k}>
            {[xs[0] + 5, xs[1] + 4, cx - 2, cx + 2, xs[4] - 4, xs[5] - 5].map((x, i) => (
              <CeilingLight key={i} position={[x, base + k * floorH + floorH - 0.32, (zc0 + zc1) / 2]} size={[0.9, 0.3]} zone={zoneLobby} intensity={i === 2 || i === 3 ? 16 : 10} distance={8} watts={14} />
            ))}
            <CeilingLight position={[cx + 1.5, base + k * floorH + floorH - 0.32, (zu0 + zu1) / 2 + 1.2]} size={[1.4, 1.0]} zone={zoneLobby} intensity={16} distance={10} watts={26} />
          </group>
        ))}
        {/* lobby: mailboxes, bench, plants, wall sign */}
        <MailboxBank position={[xs[3] - 0.1, base + 0.0, zu1 - 2.6]} yaw={-Math.PI / 2} cols={6} rows={2} />
        <Bench position={[xs[2] + 0.55, base, zu1 - 2.4]} yaw={Math.PI / 2} length={1.8} />
        <Plant position={[xs[2] + 0.55, base, zu1 - 0.7]} scale={1.1} kind="fiddle" />
        <Plant position={[xs[3] - 0.6, base, zu1 - 0.7]} scale={1.0} kind="monstera" />
        <BrandSign text="MEADOWBROOK TERRACE" sub="RESIDENTS · MODEL APARTMENTS 1A & 2A" position={[xs[3] - 0.13, base + 2.0, zu0 + 1.9]} rotation={[0, -Math.PI / 2, 0]} width={3.4} size={110} color="#f4f1ea" />
        <LightSwitch position={[xs[3] - 0.25, base + 1.25, zu0 + 0.6]} yaw={-Math.PI / 2} zone={zoneLobby} />
        {/* the two model apartments */}
        {sampleZones.map((s) => (
          <Unit key={s.zone} L={L} unit={L.units[s.unit]} floor={s.floor} zone={s.zone} label={null} />
        ))}
      </NearGate>

      {/* entrance doors (always present: they are part of the facade) */}
      <DoubleDoor id={`door-${spec.id || 'apt'}-front`} center={[cx, base, z1 - APT.T / 2]} halfWidth={1.1} height={2.5} facing={0} accent="#2fd0c4" label="lobby doors" finish="bronze" />
      <DoubleDoor id={`door-${spec.id || 'apt'}-rear`} center={[cx + 0.4 + 1.1, base, z0 + APT.T / 2]} halfWidth={1.1} height={2.5} facing={Math.PI} accent="#2fd0c4" label="rear doors" finish="bronze" />
      <BrandSign text="MEADOWBROOK TERRACE" sub={`${spec.number || '2200'} MAPLE AVE`} position={[cx, base + 3.15, z1 + 1.915]} rotation={[0, 0, 0]} width={2.4} size={110} color="#f4f1ea" />

      {/* doors off the corridor: the model apartments open, the rest are residents-only */}
      <NearGate bounds={bounds}>
        {unitDoors.map((d) => {
          const hinge = [d.x0, base + d.floor * floorH + 0.022, d.z]
          const sample = isSample(d.floor, d.unit)
          return sample
            ? <SingleDoor key={`${d.floor}:${d.unit}`} id={`apt-${spec.id || 'apt'}-${nameOf(d.floor, d.unit)}-entry`} hinge={hinge} width={d.x1 - d.x0} height={2.05} baseYaw={0} openAngle={-1.55} label={`apartment ${nameOf(d.floor, d.unit)} door`} />
            : <LockedDoor key={`${d.floor}:${d.unit}`} id={`apt-${spec.id || 'apt'}-${nameOf(d.floor, d.unit)}-locked`} hinge={[d.x0, hinge[1], d.z]} width={d.x1 - d.x0} height={2.05} label={`Apartment ${nameOf(d.floor, d.unit)}`} />
        })}
        {/* the glass door + fixed pane of the sample units: patio (ground) or balcony (floor 2) */}
        {slidersFor.map((s, i) => (
          <group key={i}>
            <SingleDoor id={`apt-${spec.id || 'apt'}-${nameOf(s.floor, s.unit)}-slider`} hinge={[s.lo, base + s.floor * floorH + 0.04, z1 - APT.T / 2 - 0.0]} width={s.hi - s.lo} height={2.22} baseYaw={0} openAngle={1.55} label="glass door" style="glass" />
            <mesh position={[s.hi + (s.hi - s.lo) / 2 - 0.0, base + s.floor * floorH + 1.17, z1 - 0.2]} material={f.glass} renderOrder={2}><planeGeometry args={[(s.hi - s.lo) - 0.05, 2.2]} /></mesh>
          </group>
        ))}
      </NearGate>
    </group>
  )
}
export { Lawn }
