import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { getMaterials, surface } from './materials.js'
import { Wall, Gate } from './jobkit.jsx'
import { UStair, Rail } from './Justice.jsx'
import { SingleDoor } from './Door.jsx'
import { BrandSign } from './signs.jsx'
import { Trees, Lawn, Bench, Planter } from './props.jsx'
import { Sofa, Table, Rug, Plant, CeilingLight, Chair } from './furniture.jsx'
import { Bed, NightStand, KitchenRun, MailboxBank } from './assets/apartment/furnishings.jsx'
import { LOT, GROUND, T, FH, FLOORS, BLDG, UNIT_COUNT, STAIR, WALK, PARKING, LAUNDRY } from '../config/apts1.js'

// ============================================================================
// RESIDENTIAL CITY EXPANSION — First Demonstration, item 2 (user's own spec, section 8):
// "One four-story apartment complex with multiple accessible units." Standard tier per the
// spec's own section 2: two to four stories, exterior stairs, private balconies, parking lot,
// a laundry room, mailboxes, a dumpster, landscaping. Every unit's front door and balcony door
// actually work and every floor is reached by real exterior stairs, not a teleport. Two units
// (ground floor and top floor) are furnished in full to demonstrate "accessible units"; the rest
// are walk-in shells with a door, floor and balcony, ready to furnish the same way as the others
// (luxury/high-rise tiers, property ownership/rent and the owner builder are separate spec items).
// ============================================================================

const { x0, x1, z0, z1 } = BLDG
const UW = (x1 - x0) / UNIT_COUNT
const unitCX = (i) => x0 + UW * (i + 0.5)
const unitDivX = (i) => x0 + UW * i // partition between unit i-1 and i, i = 1..UNIT_COUNT-1
const RECT = { x0, x1, z0, z1 }
const H1 = FH - 0.3
const floorY = (k) => GROUND + k * FH

export default function ApartmentsStandard() {
  return (
    <Gate x0={LOT.x0 - 6} x1={LOT.x1 + 6} z0={LOT.z0 - 6} z1={LOT.z1 + 6} pad={10}>
      <Grounds />
      {Array.from({ length: FLOORS }, (_, k) => <Floor key={k} k={k} />)}
      <ExteriorStair />
      <LaundryRoom />
      <BrandSign text="MAPLE GARDEN APARTMENTS" sub="STANDARD RESIDENCES · UNITS 1-16" position={[(x0 + x1) / 2, GROUND + 3.4, z0 - WALK.z1 + WALK.z0 - 0.3]} rotation={[0, Math.PI, 0]} width={12} color="#2a241c" glow="#6ea8c9" />
    </Gate>
  )
}

// ---------------------------------------------------------------------------
// One floor: the building shell for that storey (south wall with unit doors, north wall with
// balcony doors, partitions between units), the floor/ceiling slab, and that floor's units.
// ---------------------------------------------------------------------------
function Floor({ k }) {
  const m = getMaterials()
  const y = floorY(k)
  const brick = surface('brick', (x1 - x0) / 4, 1.4, { color: k % 2 ? '#b97a5a' : '#c98868' })
  const doorOpenings = Array.from({ length: UNIT_COUNT }, (_, i) => ({ at: unitCX(i), half: 1.0, h: 2.3 }))
  const balconyOpenings = Array.from({ length: UNIT_COUNT }, (_, i) => ({ at: unitCX(i), half: 0.9, h: 2.2 }))
  const partitions = Array.from({ length: UNIT_COUNT - 1 }, (_, i) => unitDivX(i + 1))

  return (
    <group>
      <Wall side="s" rect={RECT} h={H1} t={T} ext={brick} int={surface('plaster', 2, 1)} y={y} openings={doorOpenings} />
      <Wall side="n" rect={RECT} h={H1} t={T} ext={brick} int={surface('plaster', 2, 1)} y={y} openings={balconyOpenings} />
      <Wall side="w" rect={RECT} h={H1} t={T} ext={brick} int={surface('plaster', 2, 1)} y={y} openings={[]} />
      <Wall side="e" rect={RECT} h={H1} t={T} ext={brick} int={surface('plaster', 2, 1)} y={y} openings={[]} />

      {/* unit partitions (full solid, no connecting door - each unit is self-contained) */}
      <RigidBody type="fixed" colliders={false}>
        {partitions.map((px) => <CuboidCollider key={px} args={[0.07, H1 / 2, (z1 - z0) / 2 - T / 2]} position={[px, y + H1 / 2, (z0 + z1) / 2]} />)}
      </RigidBody>
      {partitions.map((px) => (
        <mesh key={px} position={[px, y + H1 / 2, (z0 + z1) / 2]} material={surface('plaster', 1, 2, { color: '#e6e1d6' })}><boxGeometry args={[0.14, H1, z1 - z0 - T]} /></mesh>
      ))}

      {/* floor slab (no holes: stair and breezeway are outside the building footprint) */}
      {k > 0 && (
        <group>
          <RigidBody type="fixed" colliders={false}><CuboidCollider args={[(x1 - x0) / 2, 0.12, (z1 - z0) / 2]} position={[(x0 + x1) / 2, y - 0.1, (z0 + z1) / 2]} /></RigidBody>
          <mesh position={[(x0 + x1) / 2, y - 0.1, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={surface('tile', 4, 2)} receiveShadow>
            <planeGeometry args={[x1 - x0 - T, z1 - z0 - T]} />
          </mesh>
        </group>
      )}
      {/* roof on the top floor */}
      {k === FLOORS - 1 && (
        <group>
          <RigidBody type="fixed" colliders={false}><CuboidCollider args={[(x1 - x0) / 2, 0.15, (z1 - z0) / 2]} position={[(x0 + x1) / 2, y + H1 + 0.15, (z0 + z1) / 2]} /></RigidBody>
          <mesh position={[(x0 + x1) / 2, y + H1 + 0.15, (z0 + z1) / 2]} material={m.blackSteel}><boxGeometry args={[x1 - x0, 0.3, z1 - z0]} /></mesh>
        </group>
      )}

      {/* exterior breezeway deck + rail in front of this floor's unit doors (ground floor walks on grade) */}
      {k > 0 && (
        <group>
          <RigidBody type="fixed" colliders={false}><CuboidCollider args={[(WALK.x1 - WALK.x0) / 2, 0.1, (WALK.z1 - WALK.z0) / 2]} position={[(WALK.x0 + WALK.x1) / 2, y, (WALK.z0 + WALK.z1) / 2]} /></RigidBody>
          <mesh position={[(WALK.x0 + WALK.x1) / 2, y, (WALK.z0 + WALK.z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={m.blackSteel}>
            <planeGeometry args={[WALK.x1 - WALK.x0, WALK.z1 - WALK.z0]} />
          </mesh>
          <Rail a={[WALK.x0, WALK.z0]} b={[WALK.x1, WALK.z0]} y={y} style="glass" h={1.0} />
        </group>
      )}

      {Array.from({ length: UNIT_COUNT }, (_, i) => <Unit key={i} i={i} y={y} furnished={k === 0 && i < 1} />)}
    </group>
  )
}

/** One apartment unit: front door, a small balcony, and either a full furnished interior or a
 * bare, walkable shell (both count as "accessible" - the player can open the door and walk in). */
function Unit({ i, y, furnished }) {
  const cx = unitCX(i)
  const uz0 = z0 + 0.6, uz1 = z1 - 0.6
  return (
    <group>
      <SingleDoor id={`apts1-door-${i}-${y.toFixed(1)}`} hinge={[cx - 1.0, y, z0 + T / 2]} width={2.0} height={2.3} baseYaw={0} openAngle={1.4} label={`unit ${100 * Math.round((y - GROUND) / FH + 1) + i + 1} door`} />
      <Balcony cx={cx} y={y} />
      {furnished ? (
        <group>
          <Rug position={[cx, y + 0.01, (uz0 + uz1) / 2]} size={[UW - 1.6, z1 - z0 - 2]} color="#cfc6b4" />
          <Bed position={[cx - UW / 4, y, uz1 - 1.1]} yaw={Math.PI} color="#6e5a86" size={[1.4, 1.9]} />
          <NightStand position={[cx - UW / 4 - 1.1, y, uz1 - 2.0]} yaw={Math.PI} />
          <Sofa position={[cx + UW / 4, y, uz0 + 1.0]} yaw={0} length={2.0} color="#3a3f4a" label="Sit on the sofa" />
          <Table position={[cx + UW / 4, y, uz0 + 2.0]} size={[1.0, 0.6]} height={0.4} top="wood" />
          <KitchenRun position={[cx + UW / 2 - 0.5, y, (uz0 + uz1) / 2]} yaw={-Math.PI / 2} length={3.0} fridge={false} />
          <Plant position={[cx - UW / 2 + 0.6, y, uz0 + 0.6]} scale={0.9} />
          <CeilingLight position={[cx, GROUND + 2.6 + y - GROUND, (uz0 + uz1) / 2]} size={[1.2, 0.9]} color="#fff1dc" zone="apts1" intensity={14} distance={8} />
        </group>
      ) : (
        <Rug position={[cx, y + 0.01, (uz0 + uz1) / 2]} size={[UW - 2, z1 - z0 - 2.2]} color="#d9d3c5" />
      )}
    </group>
  )
}

function Balcony({ cx, y }) {
  const m = getMaterials()
  const bz0 = z1, bz1 = z1 + 1.6, bx0 = cx - 1.1, bx1 = cx + 1.1
  return (
    <group>
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[(bx1 - bx0) / 2, 0.1, (bz1 - bz0) / 2]} position={[cx, y, (bz0 + bz1) / 2]} /></RigidBody>
      <mesh position={[cx, y, (bz0 + bz1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={m.blackSteel}><planeGeometry args={[bx1 - bx0, bz1 - bz0]} /></mesh>
      <Rail a={[bx0, bz1]} b={[bx1, bz1]} y={y} style="glass" h={1.0} />
      <Rail a={[bx0, bz0]} b={[bx0, bz1]} y={y} style="glass" h={1.0} />
      <Rail a={[bx1, bz0]} b={[bx1, bz1]} y={y} style="glass" h={1.0} />
      <Chair position={[cx, y, bz1 - 0.4]} yaw={Math.PI} color="#2a2a2e" />
      <Planter position={[bx1 - 0.3, y, bz0 + 0.3]} />
    </group>
  )
}

// ---------------------------------------------------------------------------
// Exterior stair: open steel stair at the west end, climbing ground -> floor2 -> floor3 -> floor4
// through the breezeways.
// ---------------------------------------------------------------------------
function ExteriorStair() {
  return (
    <group>
      {Array.from({ length: FLOORS - 1 }, (_, k) => (
        <group key={k}>
          <UStair x0={STAIR.x0} x1={STAIR.x1} zA={STAIR.z0} zB={STAIR.z1} y={floorY(k)} rise={FH} landing={1.2} />
          <Rail a={[STAIR.x0, STAIR.z0]} b={[STAIR.x0, STAIR.z1 - 1.2]} y={floorY(k) + FH} style="glass" h={1.0} />
        </group>
      ))}
    </group>
  )
}

// ---------------------------------------------------------------------------
// Grounds: parking lot, mailbox bank, dumpster enclosure, lawn and trees.
// ---------------------------------------------------------------------------
function Grounds() {
  const m = getMaterials()
  return (
    <group>
      <Lawn x0={LOT.x0} x1={LOT.x1} z0={LOT.z0} z1={LOT.z1} skip={[[PARKING.x0, PARKING.x1, PARKING.z0, PARKING.z1]]} />
      {/* parking lot with painted stalls */}
      <mesh position={[(PARKING.x0 + PARKING.x1) / 2, GROUND + 0.012, (PARKING.z0 + PARKING.z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={surface('asphalt', 6, 1)} receiveShadow>
        <planeGeometry args={[PARKING.x1 - PARKING.x0, PARKING.z1 - PARKING.z0]} />
      </mesh>
      {Array.from({ length: 10 }, (_, i) => {
        const sx = PARKING.x0 + 1 + i * ((PARKING.x1 - PARKING.x0 - 2) / 9)
        return <mesh key={i} position={[sx, GROUND + 0.015, (PARKING.z0 + PARKING.z1) / 2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.08, PARKING.z1 - PARKING.z0 - 1]} /><meshStandardMaterial color="#e8e4da" /></mesh>
      })}
      <MailboxBank position={[LOT.x0 + 3, GROUND, z0 - 1]} yaw={Math.PI / 2} cols={4} rows={4} startNumber={101} />
      {/* dumpster enclosure */}
      <group position={[LOT.x1 - 6, GROUND, LOT.z1 - 6]}>
        <mesh position={[0, 0.9, 0]} material={m.blackSteel} castShadow><boxGeometry args={[3.2, 1.8, 2.0]} /></mesh>
        <RigidBody type="fixed" colliders={false}><CuboidCollider args={[1.8, 1.0, 1.3]} position={[0, 1.0, 0]} /></RigidBody>
        {[-1, 1].map((s) => <mesh key={s} position={[s * 2.0, 0.75, 1.5]} material={surface('concrete', 1, 1)}><boxGeometry args={[0.15, 1.5, 0.15]} /></mesh>)}
      </group>
      <Trees trees={[[LOT.x0 + 2, GROUND, LOT.z1 - 2, 1.1], [LOT.x1 - 2, GROUND, LOT.z1 - 2, 1.0], [WALK.x0 - 1.5, GROUND, z0 - 2, 1.2]]} />
      <Bench position={[WALK.x0 - 1.5, GROUND, z0 - 3.4]} yaw={Math.PI} />
      <Planter position={[LOT.x0 + 3, GROUND, z0 - 2.6]} />
    </group>
  )
}

function LaundryRoom() {
  const m = getMaterials()
  const { x0: lx0, x1: lx1, z0: lz0, z1: lz1 } = LAUNDRY
  const rect = { x0: lx0, x1: lx1, z0: lz0, z1: lz1 }
  const wall = surface('plaster', 2, 1, { color: '#e3ded2' })
  const n = 4
  return (
    <group>
      <Wall side="s" rect={rect} h={2.6} t={T} ext={wall} int={wall} y={GROUND} openings={[{ at: (lx0 + lx1) / 2, half: 1.0, glass: true, h: 2.2, sill: 0 }]} />
      <Wall side="n" rect={rect} h={2.6} t={T} ext={wall} int={wall} y={GROUND} openings={[]} />
      <Wall side="e" rect={rect} h={2.6} t={T} ext={wall} int={wall} y={GROUND} openings={[]} />
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[(lx1 - lx0) / 2, 1.3, 0.05]} position={[(lx0 + lx1) / 2, 1.3, lz0 + T / 2]} /></RigidBody>
      <mesh position={[(lx0 + lx1) / 2, 2.6, (lz0 + lz1) / 2]} material={m.blackSteel}><boxGeometry args={[lx1 - lx0, 0.1, lz1 - lz0]} /></mesh>
      <mesh position={[(lx0 + lx1) / 2, 0.005, (lz0 + lz1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={surface('tile', 2, 2, { color: '#e9e6df' })} receiveShadow>
        <planeGeometry args={[lx1 - lx0 - T, lz1 - lz0 - T]} />
      </mesh>
      <BrandSign text="LAUNDRY" sub="COIN & CARD" position={[(lx0 + lx1) / 2, 2.0, lz0 - 0.1]} rotation={[0, Math.PI, 0]} width={3.4} color="#1a2a3a" glow="#6ea8c9" />
      {Array.from({ length: n }, (_, i) => {
        const mx = lx0 + 1 + i * ((lx1 - lx0 - 2) / (n - 1))
        return (
          <RigidBody key={i} type="fixed" colliders={false} position={[mx, GROUND, lz1 - 0.6]}>
            <CuboidCollider args={[0.35, 0.45, 0.35]} position={[0, 0.45, 0]} />
            <mesh position={[0, 0.45, 0]} material={getMaterials().chrome} castShadow receiveShadow><boxGeometry args={[0.68, 0.9, 0.68]} /></mesh>
            <mesh position={[0, 0.45, 0.35]} material={getMaterials().glass}><circleGeometry args={[0.24, 20]} /></mesh>
          </RigidBody>
        )
      })}
    </group>
  )
}
