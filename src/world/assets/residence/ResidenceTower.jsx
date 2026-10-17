import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { Block } from '../../jobkit.jsx'
import { surface, blackMarble, getMaterials } from '../../materials.js'
import { SingleDoor, DoubleDoor } from '../../Door.jsx'
import { BrandSign, Plaque } from '../../signs.jsx'
import { Bed, NightStand, Wardrobe, KitchenRun } from '../apartment/furnishings.jsx'
import { Sofa, Table, Rug, Plant, Chair, Stool, DiningSet, CeilingLight, PendantLight, ClothingRack, Mannequin } from '../../furniture.jsx'
import { Toilet, Vanity, Shower, TowelRail, LightSwitch } from '../../Interior.jsx'
import { registerInteractable, playerState } from '../../../state/runtime.js'
import { useStore } from '../../../state/store.js'
import { speakLine } from '../../../audio/tts.js'
import { BUILT_RESIDENTS } from '../../../config/residences.js'
import { TOWER, CORE, STAIR_SPAN, UNIT, Y } from '../../../config/residenceTower.js'
import { SIGNATURE_ROOMS } from './residentRooms.jsx'

// Reign Residences: a new residence tower (src/config/residenceTower.js has the footprint), built
// entirely from the shared kit - Block (walls), the furniture/Interior/apartment-furnishings
// components, Door.jsx, signs.jsx - the same pieces every other building in this world uses.
// Nothing here replaces or deletes any existing building; the tower stands on its own footprint
// west of the Reign Estate (which is untouched).
//
// What's functional: the building entrance, the stair (walk up, guard-railed, a real sloped
// collider like the Vision Storms Plaza's own flights), an elevator call panel per floor
// (teleports you to the next floor - the same teleport mechanic the Places menu and the airport
// departures board already use, not an animated rising car like the Plaza's), every door in the
// five built residences, every sofa/chair/stool/bed (sit, and a bed doubles as "sleep"), a fitted
// kitchen with a working collider in every lounge, closets that open the real outfit picker
// (Settings > Appearance), light switches, a "Talk to <name>" greeting per resident spoken aloud
// through the browser's text-to-speech when NPC voices are on (Settings > Sound - the same
// audio/tts.js system the city's other talking NPCs use), and a name plaque at each resident's
// door. What's scenery (for now): floors 6+ are reserved for the rest of the character roster -
// see the `built: false` entries in src/config/residences.js.

/** Shows its children only while the camera is near the tower (interiors aren't drawn across town). */
function NearGate({ bounds, margin = 26, children }) {
  const ref = useRef()
  const { camera } = useThree()
  useFrame(() => {
    const c = camera.position
    if (ref.current) ref.current.visible = c.x > bounds[0] - margin && c.x < bounds[1] + margin && c.z > bounds[2] - margin && c.z < bounds[3] + margin
  })
  return <group ref={ref} userData={{ noBatch: true }}>{children}</group>
}

function segments(a, b, gaps) {
  const sorted = [...gaps].sort((p, q) => p[0] - q[0])
  const out = []
  let cur = a
  for (const [ga, gb] of sorted) { if (ga > cur) out.push([cur, ga]); cur = Math.max(cur, gb) }
  if (cur < b) out.push([cur, b])
  return out
}
/** Wall running north-south (along z) at a fixed x, from za to zb, with door gaps. */
function WallNS({ x, za, zb, y0, h, gaps = [], t = 0.15, material }) {
  return segments(za, zb, gaps).map(([sa, sb], i) => (sb - sa > 0.02) && (
    <Block key={i} position={[x, y0 + h / 2, (sa + sb) / 2]} size={[t, h, sb - sa]} material={material} />
  ))
}
/** Wall running east-west (along x) at a fixed z, from xa to xb, with door gaps. */
function WallEW({ z, xa, xb, y0, h, gaps = [], t = 0.15, material }) {
  return segments(xa, xb, gaps).map(([sa, sb], i) => (sb - sa > 0.02) && (
    <Block key={i} position={[(sa + sb) / 2, y0 + h / 2, z]} size={[sb - sa, h, t]} material={material} />
  ))
}

// the entry doorway: a gap in the CORE/UNIT wall (x = UNIT.x0), within the landing band
const ENTRY_GAP = [UNIT.z0 + 2, UNIT.z0 + 6]

/** One built resident's suite: lounge, signature room, bedroom, closet, bathroom, reading nook. */
function ResidentSuite({ resident, floor }) {
  const y0 = Y(floor)
  const h = TOWER.floorH - 0.3
  const c = resident.colors
  const zone = 'residence-' + resident.id
  const ox = UNIT.x0, oz = UNIT.z0 // local (0,0) of this unit
  const P = (u, v, y = 0) => [ox + u, y0 + y, oz + v]
  const wallMat = surface('plaster', 1, 1, { color: '#efece6' })
  const floorMat = resident.id === 'trinity-reign'
    ? blackMarble([c.accent, c.gold, c.teal], 5, 5)
    : surface('wood', 1 / 1.6, 1 / 1.6, { color: '#c9b79a' })
  const bathTile = surface('tile', 1 / 0.3, 1 / 0.3, { color: '#e2dfda', roughness: 0.3 })

  // signature room local origin (world): u16..30, v0..18
  const sox = ox + 16, soz = oz + 0
  const SigP = (u, v, y = 0) => [sox + u, y0 + y, soz + v]
  const SignatureRoom = SIGNATURE_ROOMS[resident.signature]

  return (
    <group>
      {/* floor + ceiling */}
      <mesh position={[(UNIT.x0 + UNIT.x1) / 2, y0 - 0.01, (UNIT.z0 + UNIT.z1) / 2]} material={floorMat} receiveShadow>
        <boxGeometry args={[UNIT.x1 - UNIT.x0, 0.02, UNIT.z1 - UNIT.z0]} />
      </mesh>
      <mesh position={[(UNIT.x0 + UNIT.x1) / 2, y0 + h - 0.01, (UNIT.z0 + UNIT.z1) / 2]} material={surface('plaster', 1, 1)}>
        <boxGeometry args={[UNIT.x1 - UNIT.x0, 0.02, UNIT.z1 - UNIT.z0]} />
      </mesh>
      {/* bathroom tile */}
      <mesh position={[ox + 18, y0 + 0.006, oz + 21]} material={bathTile}><boxGeometry args={[8, 0.012, 6]} /></mesh>

      {/* wall between the public corridor (CORE) and this private unit, with the entry gap */}
      <WallNS x={ox} za={oz + 0} zb={oz + 30} y0={y0} h={h} gaps={[ENTRY_GAP]} material={wallMat} />
      {/* interior walls */}
      <WallNS x={ox + 16} za={oz + 0} zb={oz + 18} y0={y0} h={h} gaps={[[oz + 7, oz + 10]]} material={wallMat} />
      <WallEW z={oz + 18} xa={ox + 0} xb={ox + 30} y0={y0} h={h} gaps={[[ox + 4, ox + 7], [ox + 24, ox + 27]]} material={wallMat} />
      <WallNS x={ox + 14} za={oz + 18} zb={oz + 30} y0={y0} h={h} gaps={[[oz + 19, oz + 21], [oz + 25, oz + 27]]} material={wallMat} />
      <WallNS x={ox + 22} za={oz + 18} zb={oz + 24} y0={y0} h={h} material={wallMat} />
      <WallEW z={oz + 24} xa={ox + 14} xb={ox + 22} y0={y0} h={h} material={wallMat} />
      <WallNS x={ox + 22} za={oz + 24} zb={oz + 30} y0={y0} h={h} material={wallMat} />

      {/* doors (baseYaw picks which local axis the leaf swings along: 0 = along x, for walls that
          run east-west; ±PI/2 = along z, for walls that run north-south) */}
      <SingleDoor id={`residence-${resident.id}-entry`} hinge={[ox, y0, ENTRY_GAP[0]]} width={ENTRY_GAP[1] - ENTRY_GAP[0]} height={2.5} baseYaw={-Math.PI / 2} openAngle={1.5} label={`${resident.name}'s door`} />
      <SingleDoor id={`residence-${resident.id}-bed`} hinge={[ox + 4, y0, oz + 18]} width={3} height={2.3} baseYaw={0} openAngle={1.5} label="bedroom door" />
      <SingleDoor id={`residence-${resident.id}-nook`} hinge={[ox + 24, y0, oz + 18]} width={3} height={2.3} baseYaw={0} openAngle={-1.5} label="door" />
      <SingleDoor id={`residence-${resident.id}-bath`} hinge={[ox + 14, y0, oz + 19]} width={2} height={2.3} baseYaw={-Math.PI / 2} openAngle={1.5} label="bathroom door" />
      <SingleDoor id={`residence-${resident.id}-closet`} hinge={[ox + 14, y0, oz + 25]} width={2} height={2.3} baseYaw={-Math.PI / 2} openAngle={1.5} label="closet door" />
      <SingleDoor id={`residence-${resident.id}-sig`} hinge={[ox + 16, y0, oz + 7]} width={3} height={2.3} baseYaw={-Math.PI / 2} openAngle={1.5} label={resident.rooms.find((r) => /studio|office|room|workspace/i.test(r)) || 'door'} />

      {/* lounge: u0..16, v0..18 */}
      <Rug position={P(8, 9, 0)} size={[7, 7]} color={c.dark} />
      <Sofa position={P(2.2, 9)} yaw={Math.PI / 2} length={2.6} color={c.primary} />
      <Sofa position={P(8, 2.2)} yaw={0} length={2.8} color={c.accent} />
      <Table position={P(5.2, 5.2)} yaw={0} size={[1.4, 0.8]} height={0.42} top="marble" />
      <Chair position={P(5.2, 8.6)} yaw={Math.PI} color={c.teal} />
      <DiningSet position={P(13, 14.6)} round chairs={4} size={1.2} color={c.dark} top="marble" />
      <Plant position={P(1, 16.6)} scale={1.3} kind="fiddle" />
      <Plant position={P(15.2, 1.2)} scale={1.2} kind="areca" />
      <PendantLight position={P(8, 0, 9)} color={c.accent} zone={zone} />
      <CeilingLight position={P(2.5, 0, 2.5)} size={[1.1, 0.7]} color="#fff1dc" zone={zone} intensity={14} distance={8} />
      <CeilingLight position={P(13, 0, 14.6)} size={[1.1, 0.7]} color="#fff1dc" zone={zone} intensity={14} distance={8} />
      <LightSwitch position={P(0.3, 1.3, 3.5)} yaw={Math.PI / 2} zone={zone} />

      {/* kitchen run, fitted against the lounge's back (north) wall */}
      <KitchenRun position={P(8, 0, 0.4)} yaw={0} length={6} fridge />
      <Stool position={P(6.2, 1.5)} color={c.dark} />
      <Stool position={P(7.4, 1.5)} color={c.dark} />
      <CeilingLight position={P(8, 0, 0.8)} size={[1.0, 0.6]} color="#fff1dc" zone={zone} intensity={12} distance={6} />

      {/* a quick "talk to <name>" greeting, voiced through the browser's text-to-speech when the
          player has NPC voices on in Settings (Settings > Sound) */}
      {resident.lines?.length > 0 && <TalkTo id={`residence-${resident.id}`} position={P(8, 1.4, 3)} name={resident.name} lines={resident.lines} />}

      {/* bedroom: u0..14, v18..30 */}
      <Rug position={P(7, 24, 0)} size={[5, 5]} color={c.primary} />
      <Bed position={P(7, 26)} yaw={Math.PI} color={c.accent} frame={c.gold} size={[1.9, 2.1]} />
      <NightStand position={P(5.0, 25)} yaw={0} />
      <NightStand position={P(9.0, 25)} yaw={0} />
      <Wardrobe position={P(1.0, 29.4)} yaw={0} width={2.4} />
      <Plant position={P(13, 29.4)} scale={1.0} kind="snake" />
      <CeilingLight position={P(7, 0, 24)} size={[1.0, 0.6]} color="#fff1dc" zone={zone} intensity={12} distance={7} />

      {/* closet: u14..22, v24..30 - decor + an interactable that opens the outfit picker */}
      <ClothingRack position={P(16.2, 26.5)} yaw={0} seed={resident.floor} />
      <Mannequin position={P(19.6, 26.5)} color={c.primary} />
      <Wardrobe position={P(21.3, 29.4)} yaw={0} width={1.4} />
      <CeilingLight position={P(18, 0, 27)} size={[0.8, 0.5]} color="#fff1dc" zone={zone} intensity={8} distance={5} />
      <ClosetTrigger position={P(18, 1.2, 27)} name={resident.name} />

      {/* bathroom: u14..22, v18..24 */}
      <Toilet position={P(20.5, 22.6)} yaw={Math.PI} />
      <Vanity position={P(15.6, 19.3)} yaw={Math.PI / 2} width={1.3} zone={zone} />
      <Shower position={P(20.3, 19.3)} yaw={0} w={1.2} d={1.2} h={2.2} zone={zone} />
      <TowelRail position={P(18, 22.8, 0.05)} yaw={0} />
      <CeilingLight position={P(18, 0, 21)} size={[0.7, 0.5]} color="#fff1dc" zone={zone} intensity={8} distance={5} />

      {/* reading nook: u22..30, v18..30 */}
      <Rug position={P(26, 24, 0)} size={[5, 8]} color={c.teal} />
      <Sofa position={P(27.5, 20)} yaw={-Math.PI / 2} length={2.0} color={c.accent} />
      <Table position={P(25.5, 20)} yaw={0} size={[0.9, 0.6]} height={0.42} />
      <Plant position={P(28.6, 28.6)} scale={1.1} kind="monstera" />
      <CeilingLight position={P(26, 0, 24)} size={[0.9, 0.6]} color="#fff1dc" zone={zone} intensity={10} distance={6} />

      {/* signature room */}
      {SignatureRoom && <SignatureRoom P={SigP} colors={c} zone={zone} />}

      {/* nameplate at the entry, inside the lounge next to the door */}
      <Plaque lines={[resident.name.toUpperCase(), resident.style || 'Private residence']} position={[ox + 0.08, y0 + 1.9, oz + 4]} rotation={[0, Math.PI / 2, 0]} width={1.5} />
    </group>
  )
}

/**
 * A resident's spoken greeting: each interact shows the line as a toast and, if the player has NPC
 * voices on (Settings > Sound), speaks it aloud through the browser's text-to-speech (`audio/tts.js`
 * - the same system the city's other talking NPCs already use). Cycles through `lines` in order.
 */
function TalkTo({ id, position, name, lines }) {
  useEffect(() => {
    let i = 0
    return registerInteractable(id, {
      position: new THREE.Vector3(...position),
      radius: 2.2,
      label: () => `Talk to ${name}`,
      onInteract: () => {
        const line = lines[i % lines.length]
        useStore.getState().showToast(`${name}: "${line}"`)
        speakLine(line, { id, name })
        i++
      },
    })
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

/** Opens the existing outfit picker (Settings > Appearance) - the "interactive closet" trigger. */
function ClosetTrigger({ position, name }) {
  useEffect(() => registerInteractable('closet-' + name, {
    position: new THREE.Vector3(...position),
    radius: 1.6,
    label: () => `${name}'s closet · change outfit`,
    onInteract: () => useStore.getState().openPanel({ type: 'settings' }),
  }), [position[0], position[1], position[2], name]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

/** Call panel: teleports the visitor to the next floor up (wrapping to the lobby from the top). */
function ElevatorPanel({ floor }) {
  const pos = [CORE.x0 + 5.2, Y(floor) + 1.2, CORE.z1 - 1.4]
  useEffect(() => registerInteractable('elev-' + floor, {
    position: new THREE.Vector3(...pos),
    radius: 1.8,
    label: () => (floor >= TOWER.floors - 1 ? 'Elevator · down to lobby' : 'Elevator · up one floor'),
    onInteract: () => {
      const next = floor >= TOWER.floors - 1 ? 0 : floor + 1
      playerState.teleport = [CORE.x0 + 3, Y(next) + 0.3, CORE.z1 - 2]
      useStore.getState().showToast(`Elevator: arriving at ${next === 0 ? 'the lobby' : 'floor ' + (next + 1)}.`)
    },
  }), [floor]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

/** One flight of stairs from `floor` up to `floor + 1`, with a real sloped collider and a guard rail. */
function Stairs({ floor }) {
  const y0 = Y(floor)
  const steps = 18
  const totalRun = STAIR_SPAN.z1 - STAIR_SPAN.z0 - 1.2 // clearance at both landings
  const run = totalRun / steps
  const rise = TOWER.floorH / steps
  const x0 = CORE.x0 + 0.8, w = 3.0
  const z0 = STAIR_SPAN.z0 + 0.6
  const mat = surface('wood', 1, 1, { color: '#9b8062' })
  const slope = Math.atan2(TOWER.floorH, totalRun)
  const length = Math.hypot(totalRun, TOWER.floorH)
  return (
    <group>
      {Array.from({ length: steps }, (_, i) => (
        <Block key={i} position={[x0 + w / 2, y0 + rise * (i + 1) - 0.08, z0 + run * i + run / 2]} size={[w, rise, run + 0.02]} material={mat} collide={false} />
      ))}
      {/* one sloped collider for the whole flight (individual box-step autostepping is unreliable here) */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[w / 2, 0.14, length / 2]} position={[x0 + w / 2, y0 + TOWER.floorH / 2 - 0.08, z0 + totalRun / 2]} rotation={[-slope, 0, 0]} />
      </RigidBody>
      {/* guard rail along the open edge of the flight */}
      {Array.from({ length: steps + 1 }, (_, i) => (
        <Block key={'r' + i} position={[x0 + w + 0.05, y0 + rise * i + 0.55, z0 + run * i]} size={[0.04, 1.0, 0.04]} material={getMaterials().blackSteel} collide={i % 3 === 0} />
      ))}
      <mesh position={[x0 + w + 0.05, y0 + TOWER.floorH / 2 + 0.5, z0 + totalRun / 2]} rotation={[-slope, 0, 0]} material={getMaterials().blackSteel} castShadow>
        <boxGeometry args={[0.04, 0.04, length]} />
      </mesh>
    </group>
  )
}

export default function ResidenceTower() {
  const f = getMaterials()
  const shellMat = surface('limestone', 2, 2, { color: '#e4ded0' })
  const glassMat = f.glass
  const concrete = surface('concrete', 1, 1)
  const bounds = [TOWER.x0 - 2, TOWER.x1 + 2, TOWER.z0 - 2, TOWER.z1 + 2]
  const cx = (TOWER.x0 + TOWER.x1) / 2
  const topY = Y(TOWER.floors)

  return (
    <group>
      {/* exterior shell: one box per face per floor, so windows read correctly up the facade */}
      {Array.from({ length: TOWER.floors }, (_, k) => {
        const y0 = Y(k), h = TOWER.floorH - 0.2
        return (
          <group key={k}>
            <Block position={[TOWER.x0 + 0.1, y0 + h / 2, (TOWER.z0 + TOWER.z1) / 2]} size={[0.2, h, TOWER.z1 - TOWER.z0]} material={shellMat} />
            <Block position={[TOWER.x1 - 0.1, y0 + h / 2, (TOWER.z0 + TOWER.z1) / 2]} size={[0.2, h, TOWER.z1 - TOWER.z0]} material={shellMat} />
            <Block position={[cx, y0 + h / 2, TOWER.z0 + 0.1]} size={[TOWER.x1 - TOWER.x0, h, 0.2]} material={shellMat} />
            {/* south (front) face: solid band + glazing above waist height, with the entry gap on the ground floor */}
            <Block position={[(TOWER.x0 + cx - 2) / 2, y0 + 0.5, TOWER.z1 - 0.1]} size={[cx - 2 - TOWER.x0, 1.0, 0.2]} material={shellMat} />
            <Block position={[(cx + 2 + TOWER.x1) / 2, y0 + 0.5, TOWER.z1 - 0.1]} size={[TOWER.x1 - cx - 2, 1.0, 0.2]} material={shellMat} />
            {k > 0 && <Block position={[cx, y0 + 0.5, TOWER.z1 - 0.1]} size={[4, 1.0, 0.2]} material={shellMat} />}
            <mesh position={[cx, y0 + (h + 1.0) / 2, TOWER.z1 - 0.1]} material={glassMat}>
              <boxGeometry args={[TOWER.x1 - TOWER.x0 - 1.2, h - 1.0, 0.1]} />
            </mesh>
            {/* floor slab: a stairwell hole over the flight below, on every floor but the ground */}
            {k === 0 ? (
              <Block position={[cx, y0 - 0.1, (TOWER.z0 + TOWER.z1) / 2]} size={[TOWER.x1 - TOWER.x0, 0.2, TOWER.z1 - TOWER.z0]} material={concrete} />
            ) : (
              <>
                <Block position={[(UNIT.x0 + UNIT.x1) / 2, y0 - 0.1, (UNIT.z0 + UNIT.z1) / 2]} size={[UNIT.x1 - UNIT.x0, 0.2, UNIT.z1 - UNIT.z0]} material={concrete} />
                <Block position={[(CORE.x0 + CORE.x1) / 2, y0 - 0.1, (STAIR_SPAN.z1 + TOWER.z1) / 2]} size={[CORE.x1 - CORE.x0, 0.2, TOWER.z1 - STAIR_SPAN.z1]} material={concrete} />
              </>
            )}
          </group>
        )
      })}
      {/* roof */}
      <Block position={[cx, topY + 0.15, (TOWER.z0 + TOWER.z1) / 2]} size={[TOWER.x1 - TOWER.x0, 0.3, TOWER.z1 - TOWER.z0]} material={concrete} />
      <BrandSign text="REIGN RESIDENCES" sub="PRIVATE · BY INVITATION" position={[cx, Y(1) + 0.4, TOWER.z1 + 0.11]} width={5.4} />

      {/* ground-floor entrance */}
      <DoubleDoor id="door-residence-tower-front" center={[cx, TOWER.base, TOWER.z1 - 0.1]} halfWidth={2} height={2.6} facing={0} accent="#c9a96a" label="Reign Residences doors" finish="bronze" />

      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[(TOWER.x1 - TOWER.x0) / 2, 0.1, 0.5]} position={[cx, TOWER.base + 0.05, TOWER.z1 + 0.5]} />
      </RigidBody>

      <NearGate bounds={bounds}>
        {/* lobby directory */}
        <Plaque lines={['LOBBY DIRECTORY', BUILT_RESIDENTS.map((r) => `${r.floor + 1} · ${r.name}`).join('  ·  ')]} position={[TOWER.x0 + 0.08, TOWER.base + 2.0, TOWER.z0 + 4]} rotation={[0, Math.PI / 2, 0]} width={2.2} />
        <Rug position={[cx, TOWER.base, TOWER.z1 - 4]} size={[5, 4]} color="#2a2430" />
        <Plant position={[TOWER.x1 - 1.2, TOWER.base, TOWER.z1 - 1.2]} scale={1.3} kind="fiddle" />
        <Plant position={[cx + 7, TOWER.base, TOWER.z1 - 1.2]} scale={1.2} kind="areca" />
        {Array.from({ length: TOWER.floors - 1 }, (_, k) => <Stairs key={k} floor={k} />)}
        {Array.from({ length: TOWER.floors }, (_, k) => <ElevatorPanel key={'e' + k} floor={k} />)}
        {BUILT_RESIDENTS.map((r) => <ResidentSuite key={r.id} resident={r} floor={r.floor} />)}
      </NearGate>
    </group>
  )
}
