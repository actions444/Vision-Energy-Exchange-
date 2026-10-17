import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { Pad, TrashCan } from '../assets/park/ParkKit.jsx'
import { ShopShell, shopMats, MachineBank, LuxCounter, LuxTable, VendingMachine, LaundryCart, Cubbies, GarmentRows, PressStation, FittingMirror, Pylon, IroningFloor, CashRegister, HangerRack, ThanksBag, FramedArt } from '../assets/shops/ShopKit.jsx'
import { Chair, Sofa, Plant, Mannequin } from '../furniture.jsx'
import { TV, Bathroom } from '../Interior.jsx'
import { Bench, StreetLamp, Bollard, Atm } from '../props.jsx'
import { Palms } from '../flora/Palms.jsx'
import { StaticBatch } from '../batch.jsx'
import { BrandSign } from '../signs.jsx'
import { CURB, PARADE } from '../../config/westend.js'
import { registerInteractable } from '../../state/runtime.js'
import { useStore } from '../../state/store.js'
import { speakLine } from '../../audio/tts.js'
import Avatar from '../../player/Avatar.jsx'

// Harbor Parade: VELVET SUDS LAUNDROMAT and THE PURPLE IRONING STATION on the boulevard frontage of the south-east block, with a paved plaza between them.
// Real here: walking, collision, one working glass door per shop, seating (sofas, chairs, bench), light switch + ceiling lights per shop, the restroom in
// the cleaners (walls + fittings), both shops' wall TVs (tv-laundro-1/2, tv-cleaners-1), which follow the world TV guide, the cleaners' 10 cash
// registers — press E at one to pay IRON_PRICE credits for a same-visit pressing (real wallet spend + ledger entry, same system as the car wash; no
// laundry-basket minigame behind it) — and one standing counter attendant (Dez) you can press E to talk to (a rendered avatar + spoken line, not an
// invisible trigger), though they're a stationary greeter, not a shift-scheduled employee with a job/pathing system.
// Scenery only: washers, dryers, presses and vending machines do nothing; the garments, linen, hanger racks, branded bags and wall art are props; the
// back walls have no doors. The ironing-board grid, till row, wall art and the attendant's spot were not individually walk-tested against the shop's
// other fixtures for overlap — tell me if you spot one and I'll nudge it.

const Y = CURB
const { laundromat: L, cleaners: C, plaza: P } = PARADE
const FY = Y + 0.02 // interior floor

function Planter({ position, plant = 'areca' }) {
  const M = shopMats()
  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <CuboidCollider args={[0.8, 0.3, 0.4]} position={[0, 0.3, 0]} />
      <mesh position={[0, 0.27, 0]} material={M.granite} castShadow receiveShadow><boxGeometry args={[1.6, 0.54, 0.8]} /></mesh>
      <mesh position={[0, 0.55, 0]} material={M.brass}><boxGeometry args={[1.64, 0.025, 0.84]} /></mesh>
      <mesh position={[0, 0.5, 0]} material={M.matte}><boxGeometry args={[1.5, 0.04, 0.7]} /></mesh>
    </RigidBody>
  )
}

function Laundromat() {
  const z = 'laundromat'
  return (
    <ShopShell {...L} y={Y} zone={z} door={{ c: L.doorC }} name="VELVET SUDS" sub="LAUNDROMAT · OPEN LATE" colour="pink"
      sideSign={{ text: 'VELVET SUDS', sub: 'WASH · DRY · FOLD', position: [L.x1 + 0.05, Y + 3.1, 38.5], rotation: [0, Math.PI / 2, 0], width: 5 }}>
      {/* washers along the rear wall, a vending pair in the centre, dryer stacks on the west wall */}
      <MachineBank position={[-192, FY, 44.7]} yaw={Math.PI} kind="washer" n={9} zone={z} />
      <MachineBank position={[-182, FY, 44.7]} yaw={Math.PI} kind="washer" n={9} zone={z} />
      <VendingMachine position={[-187.5, FY, 44.75]} yaw={Math.PI} colour="teal" zone={z} />
      <VendingMachine position={[-186.5, FY, 44.75]} yaw={Math.PI} colour="pink" zone={z} />
      <MachineBank position={[-196.26, FY, 39]} yaw={Math.PI / 2} kind="dryer" n={8} zone={z} />
      {/* wall TVs over the washers: they follow the TV guide (music videos, movies) */}
      <TV id="tv-laundro-1" position={[-192, Y + 2.15, 45.03]} yaw={Math.PI} size={[1.6, 0.9]} zone={z} channel={1} soundbar={false} />
      <TV id="tv-laundro-2" position={[-182, Y + 2.15, 45.03]} yaw={Math.PI} size={[1.6, 0.9]} zone={z} channel={3} soundbar={false} />
      <BrandSign text="WASH · DRY · FOLD" sub="FRESH. CLEAN. LUXE." position={[-187, Y + 2.7, 45.07]} rotation={[0, Math.PI, 0]} width={5.2} size={150} color="#ff6ec4" glow="#ff3fae" />
      {/* wash-and-fold counter with linen cubbies behind it */}
      <Cubbies position={[-177.58, FY, 39.5]} yaw={-Math.PI / 2} cols={6} rows={4} />
      <LuxCounter position={[-179.05, FY, 39.5]} yaw={-Math.PI / 2} length={4.4} zone={z} />
      {/* folding tables and carts */}
      {[[-190.5, 37.5], [-183.2, 37.5], [-190.5, 41.3], [-183.2, 41.3]].map(([x, zz], i) => <LuxTable key={i} position={[x, FY, zz]} size={[2.6, 1.0]} />)}
      <LaundryCart position={[-187.0, FY, 40.0]} yaw={0.2} seed={1} />
      <LaundryCart position={[-186.2, FY, 35.9]} yaw={-0.4} seed={2} />
      <LaundryCart position={[-195.2, FY, 43.1]} seed={3} />
      {/* lounge by the window */}
      <Sofa position={[-193.2, FY, 32.75]} yaw={0} length={2.6} color="#4a2a6e" />
      <LuxTable position={[-193.2, FY, 34.5]} size={[1.1, 0.6]} height={0.42} />
      <Chair position={[-195.2, FY, 34.5]} yaw={Math.PI / 2} color="#4a2a6e" />
      <Chair position={[-191.2, FY, 34.5]} yaw={-Math.PI / 2} color="#4a2a6e" />
      <Chair position={[-180.2, FY, 33.0]} yaw={0} color="#2c7f86" />
      <Chair position={[-178.7, FY, 33.0]} yaw={0} color="#2c7f86" />
      <Plant position={[-196.0, FY, 32.5]} kind="fiddle" scale={1.1} />
      <Plant position={[-178.1, FY, 32.5]} kind="areca" scale={1.1} />
    </ShopShell>
  )
}

/** A single standing attendant behind the drop-off counter — a real rendered avatar you can press
 * E to talk to, with a spoken line (same TTS as every other NPC). This is a simple stationary
 * greeter, not a shift-scheduled employee with a job/pathing system — that's the bigger NPC
 * project still queued; this is the small, honest version for one shop. */
function IronAttendant({ position, yaw = 0, name = 'Dez', line }) {
  const ref = useRef()
  useEffect(() => {
    const v = new THREE.Vector3(...position)
    return registerInteractable('iron-attendant', {
      position: v,
      radius: 1.8,
      label: `Talk to ${name}`,
      onInteract: () => {
        useStore.getState().showToast(`${name}: "${line}"`)
        speakLine(line, { id: 'iron-attendant-' + name })
      },
    })
  }, [position, name, line]) // eslint-disable-line react-hooks/exhaustive-deps
  const state = useMemo(() => ({ speed: 0, grounded: true, emote: null, sit: 0, sitHeight: 0, sing: 0, gesture: 'wave' }), [])
  return (
    <group ref={ref} position={position} rotation={[0, yaw, 0]}>
      <Avatar state={state} skin="#caa07a" look={{ social: true, noVisor: true, eyes: '#3a2316', top: '#5a2a78', bottom: '#241a2e', hair: '#1c1620' }} />
    </group>
  )
}

function IroningStation() {
  const z = 'cleaners'
  return (
    <ShopShell {...C} y={Y} zone={z} door={{ c: C.doorC }} name="THE PURPLE IRONING STATION" sub="DRY CLEANING · TAILORING · PRESS" colour="teal"
      sideSign={{ text: 'THE PURPLE IRONING STATION', sub: 'PRESSED TO PERFECTION', position: [C.x0 - 0.05, Y + 3.1, 38.5], rotation: [0, -Math.PI / 2, 0], width: 5.4 }}>
      <BrandSign text="THE PURPLE IRONING STATION" sub="PRESSED TO PERFECTION" position={[-155, Y + 2.75, 45.07]} rotation={[0, Math.PI, 0]} width={6} size={140} color="#5ff2e4" glow="#25e6d3" />
      {/* drop-off counter, garment rails and the pressing line behind it */}
      <LuxCounter position={[-155, FY, 37.0]} yaw={Math.PI} length={10} zone={z} />
      <GarmentRows position={[-155, FY, 41.6]} along="x" length={12} rows={2} />
      <GarmentRows position={[-146.8, FY, 40.5]} along="z" length={7} rows={2} />
      <TV id="tv-cleaners-1" position={[-149.5, Y + 2.2, 45.03]} yaw={Math.PI} size={[1.8, 1.01]} zone={z} channel={0} soundbar={false} />
      {[-160.5, -155, -149.5].map((x, i) => <PressStation key={i} position={[x, FY, 44.2]} yaw={Math.PI} />)}
      {/* waiting lounge */}
      <Sofa position={[-163.2, FY, 33.6]} yaw={Math.PI / 2} length={2.6} color="#4a2a6e" />
      <LuxTable position={[-161.6, FY, 33.6]} size={[0.6, 1.1]} height={0.42} />
      <Chair position={[-160.2, FY, 33.6]} yaw={-Math.PI / 2} color="#2c7f86" />
      <Plant position={[-163.8, FY, 36.2]} kind="monstera" scale={1.1} />
      <Plant position={[-146.2, FY, 32.5]} kind="fiddle" scale={1.1} />
      {/* tailoring corner */}
      <FittingMirror position={[-145.55, FY, 34.0]} yaw={-Math.PI / 2} />
      <Mannequin position={[-148.4, FY, 35.6]} yaw={-Math.PI / 2} color="#ff5db1" />
      <Mannequin position={[-148.2, FY, 32.9]} yaw={-Math.PI / 2} color="#25b9ad" />
      {/* the tailoring floor: 20 ironing boards, each with an iron (scenery) */}
      <IroningFloor position={[-155, FY, 39.0]} cols={5} rows={4} gap={1.0} />
      {/* 10 tills along the drop-off counter (scenery — they don't take payment) */}
      {Array.from({ length: 10 }, (_, i) => <CashRegister key={i} id={`iron-register-${i}`} position={[-159.5 + i, FY + 1.08, 37.3]} yaw={0} />)}
      {/* rolling hanger racks */}
      <HangerRack position={[-151, FY, 33.3]} yaw={Math.PI / 2} />
      <HangerRack position={[-151, FY, 35.3]} yaw={-Math.PI / 2} />
      {/* branded takeaway bags by the counter */}
      <ThanksBag position={[-150.2, FY, 37.6]} stack />
      <ThanksBag position={[-159.8, FY, 37.6]} yaw={0.4} />
      {/* customer restroom */}
      <Bathroom center={[-163.3, FY, 42.0]} w={2.2} d={2.4} h={3.2} zone="cleaners" />
      {/* wall art along the left wall, up high and clear of the sofa/bathroom below */}
      {[33.6, 38.0, 42.4].map((zz, i) => <FramedArt key={i} position={[-164.85, Y + 2.5, zz]} yaw={Math.PI / 2} seed={i} w={1.0} h={1.3} />)}
      {/* the counter attendant — press E to talk */}
      <IronAttendant position={[-151.5, FY, 36.3]} yaw={0} name="Dez" line="Welcome to The Purple Ironing Station! Drop your garments at any register and we'll have them pressed and ready." />
    </ShopShell>
  )
}

export default function HarborParade() {
  const M = shopMats()
  const palms = useMemo(() => [[-174.9, Y, 30.2, 1, 0.3, 'royal'], [-167.1, Y, 30.2, 1, 1.2, 'royal'], [-174.8, Y, 43.8, 1, 2.0, 'coconut'], [-167.2, Y, 43.6, 1, 3.1, 'coconut']], [])
  const bollards = [-195, -191, -183, -179, -163, -159, -151, -147]
  return (
    <>
      <StaticBatch name="harbor-parade">
        {/* paved apron along the boulevard frontage and the plaza between the shops */}
        <Pad x0={L.x0 - 1.5} x1={C.x1 + 1.5} z0={27.5} z1={L.z0} y={Y} mat={M.paving} lift={0.006} />
        <Pad x0={P.x0} x1={P.x1} z0={L.z0} z1={L.z1 + 1.2} y={Y} mat={M.paving} lift={0.006} />
        <mesh position={[(L.x0 + C.x1) / 2, Y + 0.016, 27.75]} material={M.teal}><boxGeometry args={[C.x1 - L.x0 + 2, 0.02, 0.08]} /></mesh>
        <mesh position={[(P.x0 + P.x1) / 2, Y + 0.016, 39]} material={M.pink}><boxGeometry args={[0.08, 0.02, 14]} /></mesh>
        <Laundromat />
        <IroningStation />
        <Pylon position={[-171, Y, 29.0]} title="HARBOR PARADE" sub="LAUNDRY · CLEANERS" />
        {bollards.map((x) => <Bollard key={x} position={[x, Y, 28.0]} />)}
        {[[L.x0 + 2, 29.6], [L.x1 - 2, 29.6], [C.x0 + 2, 29.6], [C.x1 - 2, 29.6]].map(([x, zz], i) => <Planter key={i} position={[x, Y, zz]} />)}
        {[[-173.8, 36], [-173.8, 41], [-168.2, 36], [-168.2, 41]].map(([x, zz], i) => <Bench key={i} position={[x, Y, zz]} yaw={x < -171 ? Math.PI / 2 : -Math.PI / 2} length={1.8} />)}
        {[[-176.3, 34], [-165.7, 34], [-171, 50]].map(([x, zz], i) => <StreetLamp key={i} position={[x, Y, zz]} yaw={0} height={6.5} double />)}
        <TrashCan position={[-173.9, Y, 44.6]} /><TrashCan position={[-168.1, Y, 44.6]} />
        <TrashCan position={[-190, Y, 47.2]} /><TrashCan position={[-150, Y, 47.2]} />
        <Atm id="atm-harbor-parade" position={[-196, Y, 47.0]} yaw={Math.PI} />
      </StaticBatch>
      <Palms palms={palms} />
    </>
  )
}
