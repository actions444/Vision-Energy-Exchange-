import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { getMaterials, surface } from './materials.js'
import { Wall, Gate } from './jobkit.jsx'
import { UStair, Rail } from './Justice.jsx'
import { DoubleDoor, SingleDoor } from './Door.jsx'
import { BrandSign } from './signs.jsx'
import { Trees, FlowerBed, Bench, Planter, Lawn } from './props.jsx'
import { Sofa, Table, Rug, Plant, CeilingLight, Counter, Shelf, Chair } from './furniture.jsx'
import { Bed, NightStand, Wardrobe, KitchenRun, Console } from './assets/apartment/furnishings.jsx'
import { LOT, GROUND, T, FH, HOUSE, GARAGE, STAIR, BALCONY, POOL } from '../config/mansion1.js'

// ============================================================================
// RESIDENTIAL CITY EXPANSION — First Demonstration, item 1 (user's own spec, section 8):
// "One three-story luxury mansion with a swimming pool and balconies." A modern two-story house
// (ground + upper floor) plus an open-air rooftop terrace as the third accessible level, reached
// by the same stair. Real stairs (not teleport), a walkable guard-railed balcony off the primary
// bedroom, a backyard pool, driveway and landscaping. Property ownership/rent and the owner
// property builder are later items in the spec's own plan (sections 5-6) and aren't attempted here.
// ============================================================================

const { x0, x1, z0, z1 } = HOUSE
const CX = (x0 + x1) / 2
const RECT = { x0, x1, z0, z1 }
const Y1 = GROUND + FH // upper-floor level
const Y2 = GROUND + FH * 2 // roof-terrace deck level

export default function ResidentialMansion() {
  return (
    <Gate x0={LOT.x0 - 6} x1={LOT.x1 + 6} z0={LOT.z0 - 6} z1={LOT.z1 + 6} pad={10}>
      <Grounds />
      <Shell />
      <Stairway />
      <GroundFloorInterior />
      <UpperFloorInterior />
      <Balcony />
      <RoofTerrace />
    </Gate>
  )
}

// ---------------------------------------------------------------------------
// Shell: ground-floor walls with the entrance + garage opening, upper-floor walls with a
// balcony door, the stairwell-holed floor slab between them, and the roof-deck slab on top
// (same hole, since the stair continues up through it to the open terrace).
// ---------------------------------------------------------------------------
function slabPair(y) {
  const m = getMaterials()
  const deck = m.marbleFloor ? m.marbleFloor(4, 3) : surface('tile', 4, 3)
  // house rect minus the stairwell rect, split into two boxes (stairwell sits in the west band)
  const westZ0 = STAIR.zB, westZ1 = z1 // sliver in front of/behind the stairwell, same x-band
  const pieces = [
    { a0: STAIR.x1, a1: x1, b0: z0, b1: z1 }, // everything east of the stairwell
    { a0: x0, a1: STAIR.x1, b0: westZ0, b1: westZ1 }, // west band, south of the stairwell hole
  ]
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {pieces.map((p, i) => <CuboidCollider key={i} args={[(p.a1 - p.a0) / 2, 0.12, (p.b1 - p.b0) / 2]} position={[(p.a0 + p.a1) / 2, y, (p.b0 + p.b1) / 2]} />)}
      </RigidBody>
      {pieces.map((p, i) => (
        <mesh key={i} position={[(p.a0 + p.a1) / 2, y, (p.b0 + p.b1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={deck} receiveShadow>
          <planeGeometry args={[p.a1 - p.a0, p.b1 - p.b0]} />
        </mesh>
      ))}
    </group>
  )
}

function Shell() {
  const m = getMaterials()
  const stucco = surface('plaster', 3, 2, { color: '#f0ece2' })
  const H1 = FH - 0.3

  return (
    <group>
      {/* ground floor */}
      <Wall side="s" rect={RECT} h={H1} t={T} ext={stucco} int={stucco} y={GROUND}
        openings={[{ at: CX + 6, half: 1.5, h: 2.6 }, { at: (GARAGE.x0 + GARAGE.x1) / 2, half: 3.4, h: 2.5 }, { at: x1 - 3, half: 1.2, glass: true, h: 2.4, sill: 0.9 }]} />
      <Wall side="n" rect={RECT} h={H1} t={T} ext={stucco} int={stucco} y={GROUND}
        openings={[{ at: CX, half: 2.6, h: 2.5 }, { at: x0 + 5, half: 1.3, glass: true, h: 2.4, sill: 0.9 }]} />
      <Wall side="w" rect={RECT} h={H1} t={T} ext={stucco} int={stucco} y={GROUND} openings={[]} />
      <Wall side="e" rect={RECT} h={H1} t={T} ext={stucco} int={stucco} y={GROUND}
        openings={[{ at: (z0 + z1) / 2, half: 2.0, glass: true, h: 2.5, sill: 0.8 }]} />
      <DoubleDoor id="mansion1-entrance" center={[CX + 6, GROUND, z0]} halfWidth={1.5} height={2.6} facing={Math.PI} accent="#c9a35a" label="front door" />
      <DoubleDoor id="mansion1-patio" center={[CX, GROUND, z1]} halfWidth={2.6} height={2.5} facing={0} accent="#2fd0c4" label="patio doors" />

      {slabPair(Y1 - 0.1)}

      {/* upper floor */}
      <Wall side="s" rect={RECT} h={H1} t={T} ext={stucco} int={stucco} y={Y1}
        openings={[{ at: x1 - 4, half: 1.2, glass: true, h: 2.4, sill: 0.9 }, { at: x0 + 4, half: 1.2, glass: true, h: 2.4, sill: 0.9 }]} />
      <Wall side="n" rect={RECT} h={H1} t={T} ext={stucco} int={stucco} y={Y1}
        openings={[{ at: CX - 3.4, half: 1.1, h: 2.3 }]} />
      <Wall side="w" rect={RECT} h={H1} t={T} ext={stucco} int={stucco} y={Y1} openings={[]} />
      <Wall side="e" rect={RECT} h={H1} t={T} ext={stucco} int={stucco} y={Y1}
        openings={[{ at: (z0 + z1) / 2, half: 1.6, glass: true, h: 2.5, sill: 0.8 }]} />
      <SingleDoor id="mansion1-balcony-door" hinge={[CX - 4.4, Y1, z1 - 0.06]} width={2.0} height={2.3} baseYaw={0} openAngle={-1.4} label="balcony door" />

      {slabPair(Y2)}

      {/* flat parapet cap, roughly matching the roof-deck edge, and a brand plaque by the gate */}
      <mesh position={[CX, Y2 + 0.08, (z0 + z1) / 2]} material={m.blackSteel}><boxGeometry args={[x1 - x0 + 0.1, 0.06, z1 - z0 + 0.1]} /></mesh>
      <BrandSign text="4821 SKYLINE RIDGE" sub="A VISION STORMS RESIDENCE" position={[CX, GROUND + 3.2, z0 - 0.2]} rotation={[0, Math.PI, 0]} width={9} color="#2a241c" glow="#c9a35a" />
    </group>
  )
}

// ---------------------------------------------------------------------------
// Stairs: ground -> upper floor -> roof terrace, through the same stairwell footprint.
// ---------------------------------------------------------------------------
function Stairway() {
  return (
    <group>
      <UStair x0={STAIR.x0} x1={STAIR.x1} zA={STAIR.zA} zB={STAIR.zB} y={GROUND} rise={FH} landing={STAIR.landing} />
      <UStair x0={STAIR.x0} x1={STAIR.x1} zA={STAIR.zA} zB={STAIR.zB} y={Y1} rise={FH} landing={STAIR.landing} />
      {[1, 2].map((k) => {
        const y = GROUND + (k - 1) * FH
        return (
          <group key={k}>
            <Rail a={[STAIR.x0, STAIR.zA]} b={[STAIR.x0, STAIR.zB - STAIR.landing]} y={y} style="glass" h={1.0} />
            <Rail a={[STAIR.x1, STAIR.zA]} b={[STAIR.x1, STAIR.zB - STAIR.landing]} y={y} style="glass" h={1.0} />
            <Rail a={[STAIR.x0, STAIR.zB - STAIR.landing]} b={[STAIR.x1, STAIR.zB - STAIR.landing]} y={y} style="glass" h={1.0} />
          </group>
        )
      })}
    </group>
  )
}

// ---------------------------------------------------------------------------
// Ground floor: foyer, living room, fitted kitchen, attached garage bay.
// ---------------------------------------------------------------------------
function GroundFloorInterior() {
  const y = GROUND
  return (
    <group>
      <Rug position={[CX + 3, y + 0.01, z0 + 6]} size={[5, 4]} color="#d8cfc0" />
      <Sofa position={[CX + 1.5, y, z0 + 8.5]} yaw={Math.PI} length={2.6} color="#3a3f4a" label="Sit on the living room sofa" />
      <Sofa position={[CX + 5, y, z0 + 8.5]} yaw={Math.PI} length={1.8} color="#3a3f4a" label="Sit on the living room sofa" />
      <Table position={[CX + 3, y, z0 + 7.2]} size={[1.3, 0.7]} height={0.42} top="wood" />
      <CeilingLight position={[CX + 3, GROUND + 2.9, z0 + 7]} size={[1.6, 1.0]} color="#fff1dc" zone="mansion1" intensity={18} distance={10} />
      <Plant position={[x1 - 1.2, y, z0 + 1.2]} scale={1.3} />
      <Shelf position={[x1 - 0.2, y, z0 + 5]} yaw={-Math.PI / 2} width={2.2} height={2.2} />

      {/* kitchen, along the north wall east of the stair */}
      <KitchenRun position={[CX + 4.5, y, z1 - 0.4]} yaw={Math.PI} length={5.4} />
      <Counter position={[CX + 4.5, y, z1 - 2.6]} yaw={0} length={2.4} height={1.05} depth={0.8} top="marble" face="#2a2a2e" />
      {[-0.8, 0.8].map((dx) => <Chair key={dx} position={[CX + 4.5 + dx, y, z1 - 3.4]} yaw={Math.PI} color="#2a2a2e" />)}

      {/* garage bay floor */}
      <mesh position={[(GARAGE.x0 + GARAGE.x1) / 2, y + 0.01, (GARAGE.z0 + GARAGE.z1) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[GARAGE.x1 - GARAGE.x0 - T, GARAGE.z1 - GARAGE.z0 - T]} />
        <meshStandardMaterial {...{ color: '#9a9a96', roughness: 0.85 }} />
      </mesh>
    </group>
  )
}

// ---------------------------------------------------------------------------
// Upper floor: primary suite with a walk-in closet, a second bedroom, hallway.
// ---------------------------------------------------------------------------
function UpperFloorInterior() {
  const y = Y1
  return (
    <group>
      {/* primary bedroom, opens onto the balcony */}
      <Bed position={[CX - 4, y, z1 - 4]} yaw={0} color="#6e5a86" />
      <NightStand position={[CX - 5.3, y, z1 - 5.6]} yaw={0} />
      <NightStand position={[CX - 2.7, y, z1 - 5.6]} yaw={0} />
      <Wardrobe position={[x0 + 0.4, y, z1 - 1.2]} yaw={Math.PI / 2} width={2.2} />
      <Rug position={[CX - 4, y + 0.01, z1 - 4]} size={[3.4, 3]} color="#c9bfe0" />

      {/* second bedroom */}
      <Bed position={[CX + 4, y, z0 + 3.2]} yaw={Math.PI} color="#4a5a6e" size={[1.4, 1.9]} />
      <NightStand position={[CX + 2.7, y, z0 + 1.8]} yaw={Math.PI} />
      <Wardrobe position={[x1 - 0.4, y, z0 + 4]} yaw={-Math.PI / 2} width={1.8} />

      <Console position={[CX - 0.2, y, STAIR.zB + 1.2]} yaw={Math.PI / 2} />
      <Plant position={[CX - 0.2, y, z1 - 0.6]} scale={1.1} />
    </group>
  )
}

// ---------------------------------------------------------------------------
// Balcony: a walkable, guard-railed cantilevered deck off the primary bedroom, overlooking the
// pool. Floor slab + perimeter rail each have their own collider (no falling through either).
// ---------------------------------------------------------------------------
function Balcony() {
  const m = getMaterials()
  const { x0: bx0, x1: bx1, z0: bz0, z1: bz1 } = BALCONY
  const cx = (bx0 + bx1) / 2
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[(bx1 - bx0) / 2, 0.12, (bz1 - bz0) / 2]} position={[cx, Y1, (bz0 + bz1) / 2]} />
      </RigidBody>
      <mesh position={[cx, Y1, (bz0 + bz1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={surface('wood', 2, 1, { color: '#8a6f55' })} receiveShadow>
        <planeGeometry args={[bx1 - bx0, bz1 - bz0]} />
      </mesh>
      <mesh position={[cx, Y1 - 0.15, (bz0 + bz1) / 2]} material={m.blackSteel}><boxGeometry args={[bx1 - bx0, 0.2, bz1 - bz0]} /></mesh>
      <Rail a={[bx0, bz1]} b={[bx1, bz1]} y={Y1} style="glass" h={1.0} />
      <Rail a={[bx0, bz0]} b={[bx0, bz1]} y={Y1} style="glass" h={1.0} />
      <Rail a={[bx1, bz0]} b={[bx1, bz1]} y={Y1} style="glass" h={1.0} />
      <Chair position={[cx - 1.4, Y1, bz1 - 0.9]} yaw={Math.PI} color="#2a2a2e" />
      <Chair position={[cx + 1.4, Y1, bz1 - 0.9]} yaw={Math.PI} color="#2a2a2e" />
      <Table position={[cx, Y1, bz1 - 0.9]} size={[0.9, 0.9]} height={0.42} round top="marble" />
    </group>
  )
}

// ---------------------------------------------------------------------------
// Rooftop terrace: the open-air third level, reached by the same stair. Perimeter guard rail
// (the roof-deck slab already has its own collider via slabPair), patio furniture, planters.
// ---------------------------------------------------------------------------
function RoofTerrace() {
  const y = Y2
  return (
    <group>
      <Rail a={[x0, z0]} b={[x1, z0]} y={y} style="glass" h={1.0} />
      <Rail a={[x0, z1]} b={[x1, z1]} y={y} style="glass" h={1.0} />
      <Rail a={[x0, z0]} b={[x0, z1]} y={y} style="glass" h={1.0} />
      <Rail a={[x1, z0]} b={[x1, z1]} y={y} style="glass" h={1.0} />
      <Rug position={[CX + 3, y + 0.01, (z0 + z1) / 2]} size={[4, 4]} color="#e4ded0" />
      <Sofa position={[CX + 3, y, z1 - 2.2]} yaw={Math.PI} length={2.6} color="#5b6470" label="Sit on the rooftop lounge sofa" />
      <Table position={[CX + 3, y, z1 - 4.0]} size={[1.1, 0.7]} height={0.42} top="wood" />
      <Planter position={[x0 + 1, y, z0 + 1]} />
      <Planter position={[x1 - 1, y, z0 + 1]} />
      <Planter position={[x0 + 1, y, z1 - 1]} />
      <Planter position={[x1 - 1, y, z1 - 1]} />
    </group>
  )
}

// ---------------------------------------------------------------------------
// Grounds: driveway, front lawn, backyard pool and patio, landscaping.
// ---------------------------------------------------------------------------
function Grounds() {
  const m = getMaterials()
  const pcx = (POOL.x0 + POOL.x1) / 2, pcz = (POOL.z0 + POOL.z1) / 2
  return (
    <group>
      <Lawn x0={LOT.x0} x1={LOT.x1} z0={LOT.z0} z1={LOT.z1} />
      {/* driveway from the street to the garage */}
      <mesh position={[(GARAGE.x0 + GARAGE.x1) / 2, GROUND + 0.012, (LOT.z0 + z0) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={surface('pavers', 3, 4)} receiveShadow>
        <planeGeometry args={[GARAGE.x1 - GARAGE.x0 + 1, z0 - LOT.z0]} />
      </mesh>
      {/* front walk to the entrance */}
      <mesh position={[CX + 6, GROUND + 0.012, (LOT.z0 + z0) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={surface('pavers', 1, 3)} receiveShadow>
        <planeGeometry args={[2, z0 - LOT.z0]} />
      </mesh>
      <Trees trees={[[LOT.x0 + 2, GROUND, LOT.z0 + 1.5, 1.1], [LOT.x0 + 2 + (LOT.x1 - LOT.x0 - 4) / 3, GROUND, LOT.z0 + 1.5, 1.2],
        [LOT.x0 + 2 + 2 * ((LOT.x1 - LOT.x0 - 4) / 3), GROUND, LOT.z0 + 1.5, 1.1], [LOT.x1 - 2, GROUND, LOT.z0 + 1.5, 1.2]]} />
      <FlowerBed x={CX - 2.5} z={LOT.z0 + 0.9} w={9} d={1.2} seed={11} />
      <Bench position={[LOT.x1 - 2, GROUND, LOT.z0 + 2]} yaw={Math.PI} />

      {/* backyard pool: in-ground, light stone coping, pool fence (collision + visual rail) */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[(POOL.x1 - POOL.x0) / 2 + 0.6, 0.3, (POOL.z1 - POOL.z0) / 2 + 0.6]} position={[pcx, GROUND - 0.3, pcz]} />
      </RigidBody>
      <mesh position={[pcx, GROUND - 0.55, pcz]}><boxGeometry args={[POOL.x1 - POOL.x0, 0.9, POOL.z1 - POOL.z0]} /><meshStandardMaterial color="#aee0e8" roughness={0.3} /></mesh>
      <mesh position={[pcx, GROUND - 0.05, pcz]} material={m.water}><boxGeometry args={[POOL.x1 - POOL.x0 - 0.3, 0.1, POOL.z1 - POOL.z0 - 0.3]} /></mesh>
      {/* coping */}
      <mesh position={[pcx, GROUND + 0.02, POOL.z0 - 0.3]} material={surface('limestone', 4, 0.4)} receiveShadow><boxGeometry args={[POOL.x1 - POOL.x0 + 1.2, 0.08, 0.7]} /></mesh>
      <mesh position={[pcx, GROUND + 0.02, POOL.z1 + 0.3]} material={surface('limestone', 4, 0.4)} receiveShadow><boxGeometry args={[POOL.x1 - POOL.x0 + 1.2, 0.08, 0.7]} /></mesh>
      <mesh position={[POOL.x0 - 0.3, GROUND + 0.02, pcz]} material={surface('limestone', 0.4, 3)} receiveShadow><boxGeometry args={[0.7, 0.08, POOL.z1 - POOL.z0]} /></mesh>
      <mesh position={[POOL.x1 + 0.3, GROUND + 0.02, pcz]} material={surface('limestone', 0.4, 3)} receiveShadow><boxGeometry args={[0.7, 0.08, POOL.z1 - POOL.z0]} /></mesh>
      <Rail a={[POOL.x0 - 1.2, POOL.z0 - 1.2]} b={[POOL.x1 + 1.2, POOL.z0 - 1.2]} y={GROUND} style="glass" h={1.1} />
      <Rail a={[POOL.x0 - 1.2, POOL.z1 + 1.2]} b={[POOL.x1 + 1.2, POOL.z1 + 1.2]} y={GROUND} style="glass" h={1.1} />
      <Rail a={[POOL.x0 - 1.2, POOL.z0 - 1.2]} b={[POOL.x0 - 1.2, POOL.z1 + 1.2]} y={GROUND} style="glass" h={1.1} />
      <Rail a={[POOL.x1 + 1.2, POOL.z0 - 1.2]} b={[POOL.x1 + 1.2, POOL.z1 + 1.2]} y={GROUND} style="glass" h={1.1} />
      {/* outdoor kitchen + patio, between the house and the pool */}
      <Counter position={[x0 + 3, GROUND, z1 + 2]} yaw={Math.PI / 2} length={3.2} height={1.0} depth={0.75} top="marble" face="#2a2a2e" />
      <Table position={[x1 - 4, GROUND, z1 + 3]} size={[1.3, 1.3]} height={0.42} round top="marble" />
      {[0, 1, 2, 3].map((i) => <Chair key={i} position={[x1 - 4 + Math.cos((i / 4) * Math.PI * 2) * 1.1, GROUND, z1 + 3 + Math.sin((i / 4) * Math.PI * 2) * 1.1]} yaw={(i / 4) * Math.PI * 2 + Math.PI} color="#2a2a2e" />)}
      <Planter position={[pcx - 6, GROUND, pcz]} tall />
      <Planter position={[pcx + 6, GROUND, pcz]} tall />
    </group>
  )
}
