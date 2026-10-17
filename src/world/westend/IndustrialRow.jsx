import { useMemo } from 'react'
import { surface } from '../materials.js'
import { assetMats } from '../assets/materials.js'
import { Builder } from '../facade/kit.js'
import { Pad, TrashCan } from '../assets/park/ParkKit.jsx'
import { ChainLinkFence } from '../assets/sports/SportsKit.jsx'
import { MetalBuilding, SteelDoor, RollOffBin, SafetyBollards, Containers, PalletStacks, RefuseTruck, FuelIsland, Canopy, Trailer, Racking, indMats } from '../assets/industrial/IndustrialKit.jsx'
import { Table, Chair, Counter, Shelf, CeilingLight, Plant } from '../furniture.jsx'
import { LightSwitch } from '../Interior.jsx'
import { StreetLamp } from '../props.jsx'
import { Trees } from '../flora/Plants.jsx'
import { StaticBatch } from '../batch.jsx'
import { BrandSign } from '../signs.jsx'
import { CURB, INDUSTRIAL } from '../../config/westend.js'

// Cedar Works (Phase 3, north-west block): the city waste-services depot beside the boulevard, then warehouses and a container yard.
// Real here: walking, collision, the depot yard's personnel gate, office door + furnished office, warehouse A's walk-in door and racked interior,
// power switches. Scenery only: the garage and dock roll-up doors are closed, warehouse B / the yard cabin are locked, trucks, trailers and
// containers are parked props (none move or can be driven), nothing is collected or delivered.

const Y = CURB
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }
const { depot: D, yardA: YA, yardB: YB } = INDUSTRIAL

export default function IndustrialRow() {
  const A = assetMats(), M = indMats()
  const tileMat = useMemo(() => surface('tile', 1 / 0.6, 1 / 0.6, { color: '#b9b5aa', roughness: 0.4 }), [])
  const asphalt = useMemo(() => surface('asphalt', 1 / 4.33, 1 / 4.33), [])
  const stacks = useMemo(() => {
    const out = []
    let k = 0
    for (const zr of [-112, -108.4, -88.5, -84.9]) for (let c = 0; c < 5; c++) {
      const n = 1 + Math.floor(hash(zr * 3 + c * 7) * 3)
      for (let l = 0; l < n; l++) out.push({ x: -383 + c * 7.0, z: zr, level: l, rot: 0, c: k++ + c, jit: (hash(zr + c + l) - 0.5) * 0.02 })
    }
    return out
  }, [])
  const pallets = useMemo(() => [[-348, -108], [-346.5, -104.5], [-343, -108], [-341, -96], [-337, -92.5], [-334, -98.5], [-345, -89]].map(([x, z], i) => ({ x, z, kind: i % 3 === 0 ? 'sack' : 'box' })), [])
  const trees = useMemo(() => { const out = []; for (let z = -112; z <= 6; z += 14) out.push([-319.8, Y, z + hash(z) * 3, 0.9 + hash(z + 3) * 0.2]); return out }, [])
  return (
    <>
      <StaticBatch name="cedar-works">
        {/* ============ waste-services depot ============ */}
        <Pad x0={D.x0} x1={D.x1} z0={D.z0} z1={D.z1} y={Y} mat={M.yard} lift={0.006} />
        <Pad x0={-358} x1={-344} z0={D.z1 - 9} z1={D.z1} y={Y} mat={asphalt} lift={0.012} />
        <Pad x0={-346} x1={-334} z0={-20} z1={-9} y={Y} mat={tileMat} lift={0.014} />
        <ChainLinkFence x0={D.x0} x1={D.x1} z0={D.z0} z1={D.z1} y={Y} h={2.4}
          gaps={[{ side: 'z1', a: -356, b: -346 }, { side: 'z1', a: -361.2, b: -360 }, { side: 'x1', a: -8, b: -4 }]} />
        <BrandSign text="CITY WASTE SERVICES" sub="COLLECTION DEPOT · AUTHORISED ENTRY" position={[-351, Y + 3.1, D.z1 + 0.05]} width={7.5} size={100} color="#f4f1ea" />
        <mesh position={[-351, Y + 3.1, D.z1 - 0.05]} material={M.steelDark}><boxGeometry args={[7.6, 1.5, 0.08]} /></mesh>
        {[-355, -347].map((x) => <mesh key={x} position={[x, Y + 1.5, D.z1]} material={M.steelDark} castShadow><boxGeometry args={[0.18, 3, 0.18]} /></mesh>)}
        <SafetyBollards y={Y} pts={[[-384, -5.2], [-378.5, -5.2], [-373, -5.2], [-367.5, -5.2], [-362, -5.2]]} />
        {[[-388.6, 6], [-372, -2], [-354, 8], [-334, 8], [-330, -22.4]].map(([x, z], i) => <StreetLamp key={i} position={[x, Y, z]} yaw={i % 2 ? Math.PI / 2 : -Math.PI / 2} height={7} />)}
        {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[-346 + i * 2.3, Y + 0.02, -14.5]} material={M.steelDark}><boxGeometry args={[1.8, 0.03, 0.2]} /></mesh>)}
        <FuelIsland x={-330} z={-1} y={Y} />
        {[[-17], [-11], [-5]].map(([z], i) => <RollOffBin key={i} position={[-325.4, Y, z]} yaw={Math.PI / 2} colour={['#6c6f75', '#2f5f8a', '#9a7545'][i]} label={['SCRAP', 'DEPOT SKIP', 'CARDBOARD'][i]} />)}
        <TrashCan position={[-348.5, Y, 7]} />

        {/* ============ warehouse yard A ============ */}
        <Pad x0={YA.x0} x1={YA.x1} z0={YA.z0} z1={YA.z1} y={Y} mat={M.yard} lift={0.006} />
        <ChainLinkFence x0={YA.x0} x1={YA.x1} z0={YA.z0} z1={YA.z1} y={Y} h={2.4}
          gaps={[{ side: 'z1', a: -356, b: -348 }, { side: 'x1', a: -52, b: -44 }]} />
        {[[-388.6, -30], [-354, -29], [-326, -48], [-326, -66]].map(([x, z], i) => <StreetLamp key={i} position={[x, Y, z]} yaw={i % 2 ? Math.PI / 2 : -Math.PI / 2} height={7} />)}
        <SafetyBollards y={Y} pts={[[-360.1, -48.6], [-354.3, -48.6], [-349.5, -48.6], [-346.5, -48.6], [-334, -48.6]]} />

        {/* ============ container yard B ============ */}
        <Pad x0={YB.x0} x1={YB.x1} z0={YB.z0} z1={YB.z1} y={Y} mat={M.yard} lift={0.006} />
        <ChainLinkFence x0={YB.x0} x1={YB.x1} z0={YB.z0} z1={YB.z1} y={Y} h={2.4}
          gaps={[{ side: 'x1', a: -98, b: -90 }, { side: 'z1', a: -358, b: -350 }]} />
        {[[-388.6, -80], [-352, -78], [-326, -96], [-326, -112]].map(([x, z], i) => <StreetLamp key={i} position={[x, Y, z]} yaw={i % 2 ? Math.PI / 2 : -Math.PI / 2} height={7} />)}
        <BrandSign text="CEDAR WORKS" sub="INDUSTRIAL ROW · VISITORS REPORT TO THE GATE" position={[-320.1, Y + 2.3, -94]} rotation={[0, Math.PI / 2, 0]} width={5.4} size={100} color="#f4f1ea" />
        <mesh position={[-320.12, Y + 1.15, -94]} material={M.steelDark}><boxGeometry args={[0.08, 2.3, 5.6]} /></mesh>
      </StaticBatch>

      {/* ---------- depot buildings ---------- */}
      <MetalBuilding x0={-386} x1={-362} z0={-21} z1={-7} y={Y} h={7.2} roof="gable" pitch={0.1} wall="grey" roofMat="roofDark"
        openings={[
          ...[-383, -377.5, -372, -366.5].map((c) => ({ wall: '+z', c, w: 4.4, h: 4.8, kind: 'rollup', colour: '#cfd2d2' })),
          { wall: '+z', c: -363.6, w: 1.0, h: 2.1, kind: 'locked', colour: '#6f777d' },
          { wall: '-x', c: -14, w: 3, h: 1.0, sill: 5.6, kind: 'window', mullions: 2 },
        ]}
        sign={{ text: 'CITY WASTE SERVICES', sub: 'GARAGE & WORKSHOP', position: [-374, Y + 6.2, -6.82], width: 9, size: 110 }} />
      <MetalBuilding x0={-361} x1={-349} z0={-21} z1={-12} y={Y} h={3.2} roof="gable" pitch={0.08} wall="white" roofMat="roofGrey" ceiling={2.9} lining
        openings={[
          { wall: '+z', c: -355, w: 1.0, h: 2.1, kind: 'door', id: 'depot-office-door', label: 'depot office door', swing: 1, glazed: true },
          { wall: '+z', c: -358.6, w: 1.8, h: 1.2, sill: 0.95, kind: 'window' },
          { wall: '+z', c: -351.4, w: 1.8, h: 1.2, sill: 0.95, kind: 'window' },
          { wall: '+x', c: -16.5, w: 1.8, h: 1.2, sill: 0.95, kind: 'window' },
          { wall: '-z', c: -355, w: 2.2, h: 1.2, sill: 0.95, kind: 'window' },
        ]}
        sign={{ text: 'DEPOT OFFICE', position: [-355, Y + 2.65, -11.82], width: 2.8, size: 96 }} />
      <Pad x0={-360.8} x1={-349.2} z0={-20.8} z1={-12.2} y={Y} mat={tileMat} lift={0.02} />
      <Counter position={[-355, Y + 0.02, -16.2]} yaw={0} length={3} top="wood" depth={0.6} height={1.05} face="#43484d" />
      <Table position={[-358.6, Y + 0.02, -19.3]} yaw={Math.PI} size={[1.5, 0.75]} height={0.75} top="wood" />
      <Chair position={[-358.6, Y + 0.02, -18.4]} yaw={0} color="#33414b" label="Sit at the desk" />
      <Table position={[-351.6, Y + 0.02, -19.3]} yaw={Math.PI} size={[1.5, 0.75]} height={0.75} top="wood" />
      <Chair position={[-351.6, Y + 0.02, -18.4]} yaw={0} color="#33414b" label="Sit at the desk" />
      <Shelf position={[-349.7, Y + 0.02, -16]} yaw={-Math.PI / 2} width={1.6} height={1.8} books={false} />
      <Plant position={[-359.9, Y + 0.02, -13.1]} scale={0.8} kind="snake" />
      <CeilingLight position={[-356.5, Y + 2.88, -16.5]} size={[1.2, 0.5]} zone="depot-office" intensity={16} distance={8} watts={36} />
      <CeilingLight position={[-353, Y + 2.88, -16.5]} size={[1.2, 0.5]} zone="depot-office" intensity={14} distance={8} watts={36} />
      <LightSwitch position={[-356.1, Y + 1.25, -12.2]} yaw={Math.PI} zone="depot-office" />
      <Canopy x0={-346} x1={-334} z0={-20} z1={-9} y={Y} h={5.6} />
      <RefuseTruck position={[-340, Y + 0.02, -14.5]} yaw={Math.PI / 2} colour="#2f7a62" />
      {Array.from({ length: 6 }, (_, i) => <RefuseTruck key={i} position={[-383.5 + i * 3.75, Y + 0.02, 4.8]} yaw={Math.PI / 2} colour={i === 2 ? '#2a6fc0' : '#2f7a62'} />)}

      {/* ---------- warehouse A (walk-in) and B (locked) ---------- */}
      <MetalBuilding x0={-386} x1={-350} z0={-70} z1={-50} y={Y} h={8.5} roof="gable" pitch={0.1} wall="sand" roofMat="roofGrey"
        openings={[
          ...[-381, -375, -369, -363, -357].map((c) => ({ wall: '+z', c, w: 3.4, h: 4.2, kind: 'rollup', colour: '#d8d9d4' })),
          { wall: '+z', c: -352.2, w: 1.0, h: 2.1, kind: 'door', id: 'warehouse-a-door', label: 'warehouse A door', swing: 1 },
          { wall: '-x', c: -60, w: 8, h: 1.2, sill: 6.6, kind: 'window', mullions: 5 },
          { wall: '-z', c: -368, w: 18, h: 1.2, sill: 6.6, kind: 'window', mullions: 11 },
        ]}
        sign={{ text: 'UNION PALLET & CRATE CO.', sub: 'WAREHOUSE A · RECEIVING AT THE DOCKS', position: [-368, Y + 7.3, -49.82], width: 12, size: 110 }} />
      <Pad x0={-385.8} x1={-350.2} z0={-69.8} z1={-50.2} y={Y} mat={M.yard} lift={0.02} />
      <Racking x0={-384} x1={-356} z={-67} y={Y + 0.02} />
      <Racking x0={-384} x1={-356} z={-62.6} y={Y + 0.02} />
      <Racking x0={-384} x1={-356} z={-58.2} y={Y + 0.02} />
      <PalletStacks y={Y + 0.02} spots={[{ x: -354.3, z: -60, kind: 'box' }, { x: -354.3, z: -64, kind: 'sack' }, { x: -354.3, z: -67.5, kind: 'box' }]} />
      {[-374, -362].map((x, i) => <CeilingLight key={i} position={[x, Y + 8.3, -60]} size={[1.6, 0.6]} zone="warehouse-a" intensity={34} distance={16} watts={90} />)}
      <LightSwitch position={[-350.2, Y + 1.25, -52.6]} yaw={Math.PI / 2} zone="warehouse-a" />
      {[-381, -369, -357].map((x, i) => <Trailer key={x} position={[x, Y + 0.02, -42.9]} yaw={-Math.PI / 2} colour={['#d8dbdc', '#c7d4de', '#e1ddd2'][i]} label={['CEDAR FREIGHT', 'WESTGATE HAULAGE', 'STORMLINE'][i]} />)}

      <MetalBuilding x0={-346} x1={-324} z0={-70} z1={-50} y={Y} h={7.5} roof="gable" pitch={0.1} wall="blue" roofMat="roofGrey"
        openings={[
          ...[-341, -335, -329].map((c) => ({ wall: '+z', c, w: 3.4, h: 4.2, kind: 'rollup', colour: '#dcdcd6' })),
          { wall: '+z', c: -325.6, w: 1.0, h: 2.1, kind: 'locked', colour: '#6f777d' },
        ]}
        sign={{ text: 'EASTBROOK SUPPLY', sub: 'WAREHOUSE B · TRADE COUNTER CLOSED', position: [-335, Y + 6.4, -49.82], width: 8.4, size: 110 }} />

      {/* ---------- container yard ---------- */}
      <Containers y={Y} stacks={stacks} />
      <PalletStacks y={Y + 0.02} spots={pallets} />
      <MetalBuilding x0={-338} x1={-330} z0={-86} z1={-82} y={Y} h={2.8} roof="flat" wall="white" roofMat="roofDark"
        openings={[
          { wall: '-z', c: -334, w: 0.95, h: 2.05, kind: 'locked', colour: '#6f777d' },
          { wall: '-z', c: -331.4, w: 1.2, h: 1.0, sill: 1.0, kind: 'window', mullions: 0 },
        ]}
        sign={{ text: 'YARD CONTROL', position: [-334, Y + 2.45, -86.12], rotation: [0, Math.PI, 0], width: 2.4, size: 90 }} />
      <SteelDoor id="depot-ped-gate" hinge={[-361.2, Y, D.z1]} width={1.14} height={2.0} baseYaw={0} openAngle={1.55} label="depot personnel gate" colour="#8c9296" />
      <Trees trees={trees} />
    </>
  )
}
