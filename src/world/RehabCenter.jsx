import { useEffect, useMemo } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface, blackMarble } from './materials.js'
import { registerInteractable } from '../state/runtime.js'
import { useStore } from '../state/store.js'
import { Chair, Table, Counter, Sofa, Shelf, Plant, CeilingLight, WallScreen } from './furniture.jsx'
import { Bench, Planter, StreetLamp } from './props.jsx'
import { BrandSign } from './signs.jsx'
import { HumanoidCrowd, makeCrowd } from '../npc/HumanoidCrowd.jsx'
import { Chandelier } from './Chandelier.jsx'
import { useJustice } from '../state/justice.js'
import { ElevatorCar } from './ElevatorCar.jsx'
import { carById, carHole } from '../config/elevators.js'
import { JusticeBuilding, UStair, BoxRoom, Rail, RoomSign, Artwork, useNpcDialogue, GROUND } from './Justice.jsx'
import { FH, jy } from './CountyJail.jsx'

// ============================================================================
// REHABILITATION CENTER  (fictional, Vision Storms County)
// A welcoming, open building north of Police HQ: footprint x[18,56] z[114,128], three floors, a
// real elevator and a staircase. No locked doors anywhere. Public-facing spaces use the district's
// polished black marble, a crystal chandelier and artwork.
//   Floor 1  Welcome desk, café, fitness room.
//   Floor 2  Counseling rooms, a group room and a wellness lounge.
//   Floor 3  Computer lab, classroom, library nook and an art-therapy wall.
// ============================================================================

export const REHAB = { x0: 18, x1: 56, z0: 114, z1: 128 }
const STAIR = { x0: 50.4, x1: 53.8, zA: 116, zB: 123.4, landing: 1.6 }
const CASUAL = ['#6b8fb0', '#a8745a', '#7a9a6a', '#b0586a', '#8a7ab0', '#c9a96a']

function RehabKiosks() {
  const m = getMaterials()
  useEffect(() => {
    const offs = [
      registerInteractable('rehab-roleplay-kiosk', {
        position: new THREE.Vector3(19.5, GROUND + 1, 116.2),
        radius: 2.6,
        label: () => 'Justice roleplay kiosk',
        onInteract: () => { useJustice.getState().openMenu('support'); useStore.getState().openPanel({ type: 'justice' }) },
      }),
      registerInteractable('rehab-exit-report', {
        position: new THREE.Vector3(19.5, GROUND + 1, 126.2),
        radius: 2.2,
        label: () => 'Roleplay: stop or report',
        onInteract: () => { useJustice.getState().openMenu(null); useStore.getState().openPanel({ type: 'justice' }) },
      }),
    ]
    return () => offs.forEach((o) => o())
  }, [])
  return (
    <group>
      {[[116.2, '#2fd0c4'], [126.2, '#ffb020']].map(([z, c]) => (
        <group key={z} position={[19.5, GROUND, z]} rotation={[0, Math.PI / 2, 0]}>
          <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.3, 0.65, 0.18]} position={[0, 0.65, 0]} /></RigidBody>
          <mesh position={[0, 0.65, 0]} material={m.blackSteel} castShadow><boxGeometry args={[0.6, 1.3, 0.36]} /></mesh>
          <mesh position={[0, 1.0, 0.19]} rotation={[-0.35, 0, 0]}><planeGeometry args={[0.46, 0.3]} /><meshBasicMaterial color={c} toneMapped={false} /></mesh>
        </group>
      ))}
      <RoomSign text="ROLEPLAY KIOSK" position={[18.47, GROUND + 2.3, 116.2]} rotation={[0, Math.PI / 2, 0]} width={2.4} color="#0e3a2a" glow="#8fffd6" />
      <RoomSign text="EXIT · REPORT" position={[18.47, GROUND + 2.3, 126.2]} rotation={[0, Math.PI / 2, 0]} width={2.4} color="#3a1111" glow="#ffb09a" />
    </group>
  )
}

function RehabDialogue({ y2, y3 }) {
  const N = (id, x, y, z, label, lines) => useNpcDialogue(id, [x, y, z], label, lines) // eslint-disable-line react-hooks/rules-of-hooks
  N('rehab-reception', 24, GROUND, 126.7, 'Talk to Receptionist', [
    'Receptionist: Welcome to the Vision Storms Rehabilitation Center. Everyone here is an NPC or a visitor like you, and there are no locked doors: come and go as you please.',
    'Receptionist: Floor 1 is the café and fitness room, floor 2 is counseling and groups, floor 3 is classes, computers and the library. Use the kiosk by the door to follow a support-group story.',
  ])
  N('rehab-barista', 43, GROUND, 127.2, 'Talk to the barista', [
    'Barista: Coffee, tea, and a muffin that is much better than it looks. Our café is staffed by program graduates, which counts as job experience.',
  ])
  N('rehab-fitness', 44.5, GROUND, 117.8, 'Talk to the fitness instructor', [
    'Instructor: Exercise helps sleep, mood and stress. We start slow and build up; there\'s no competition in here.',
  ])
  N('rehab-counselor', 21.6, y2, 117.2, 'Talk to Counselor', [
    'Counselor: Counseling is a safe place to talk through stress, loss or habits you want to change. What you say here is confidential, with narrow safety exceptions.',
  ])
  N('rehab-counselor-b', 26.9, y2, 117.2, 'Talk to Counselor', [
    'Counselor: Nobody has to have it figured out to walk in. First sessions are mostly about listening.',
  ])
  N('rehab-facilitator', 41.5, y2, 117.8, 'Talk to the group facilitator', [
    'Facilitator: Groups run on three rules: what is said here stays here, one voice at a time, and anyone can pass. Press E at the kiosk by the door to sit in on a first session.',
  ])
  N('rehab-lounge', 42, y2, 126.4, 'Talk to the peer mentor', [
    'Peer Mentor: I\'ve been where you are. I\'m here for coffee, conversation and a ride to an appointment if you need one.',
  ])
  N('rehab-lab', 24, y3, 117.2, 'Talk to the computer lab instructor', [
    'Instructor: Resumes, applications, interview practice. We can also help you set up an email address and find job listings.',
  ])
  N('rehab-teacher', 41.5, y3, 116.2, 'Talk to the teacher', [
    'Teacher: Today\'s class is budgeting and paying down debt. Practical skills help people stay on their feet.',
  ])
  N('rehab-art', 44, y3, 124.6, 'Talk to the art therapist', [
    'Art Therapist: You don\'t have to be good at art. Making something is a way to say what\'s hard to say in words. The pieces on the wall are by participants.',
  ])
  N('rehab-coach', 31.4, y3, 119.4, 'Talk to the job coach', [
    'Job Coach: We\'ll build a resume together, practice an interview, and line up employers who hire people in recovery or after release.',
  ])
  return null
}

export function RehabCenter() {
  const m = getMaterials()
  const { x0, x1, z0, z1 } = REHAB
  const car = carById('rehab')
  const y2 = jy(1), y3 = jy(2)
  const lobbyFloor = useMemo(() => blackMarble('#2fd0c4', 6, 3), []) // public-facing: polished black marble, teal vein
  const carpet = useMemo(() => surface('carpet', 8, 4, { color: '#8f9a9c' }), [])
  const holes = useMemo(() => [carHole(car), { x0: STAIR.x0, x1: STAIR.x1, z0: STAIR.zA, z1: STAIR.zB - STAIR.landing }], [car])

  const people = useMemo(() => {
    const L = []
    const add = (x, y, z, yaw, shirt, pants = '#2a2f38') => L.push({ x, y, z, yaw, shirt, pants })
    add(24, GROUND, 126.7, Math.PI, '#2f6f6a', '#2a2f38')                    // receptionist
    add(43, GROUND, 127.2, Math.PI, '#7a5a3a', '#2a2a30')                    // barista
    add(38.5, GROUND, 120.6, 1.0, CASUAL[0])                                 // café guests
    add(47.5, GROUND, 121.2, -2.0, CASUAL[1])
    add(44.5, GROUND, 117.8, Math.PI, '#2fa89a', '#232a33')                  // fitness instructor
    add(40, GROUND, 116.8, 0.2, CASUAL[2], '#35404a')                        // someone on a treadmill
    add(22.5, GROUND, 118.4, 0.4, CASUAL[3])                                 // waiting
    for (const [x, c] of [[21.6, 0], [26.9, 1]]) add(x, y2, 117.2, Math.PI, '#6a5a8a', '#2a2a30') // counselors
    add(41.5, y2, 117.8, Math.PI, '#2f6f6a', '#2a2a30')                      // group facilitator
    add(44.2, y2, 117.8, 0, CASUAL[4]); add(38.8, y2, 117.8, 0, CASUAL[5])   // group members
    add(42, y2, 126.4, Math.PI, '#5a7a5a', '#2a2a30')                        // peer mentor
    add(26, y2, 124.6, 0.8, CASUAL[0])                                       // lounge guest
    add(24, y3, 117.2, Math.PI, '#4a6a8a', '#2a2a30')                        // lab instructor
    add(41.5, y3, 116.2, 0, '#4a6a8a', '#2a2a30')                            // teacher
    add(44, y3, 124.6, Math.PI, '#b0586a', '#2a2a30')                        // art therapist
    add(31.4, y3, 119.4, Math.PI, '#6a5a8a', '#2a2a30')                      // job coach
    add(46, y3, 125.6, 0.5, CASUAL[2])                                       // artist at work
    return makeCrowd(L.length, (i) => ({ x: L[i].x, y: L[i].y, z: L[i].z, yaw: L[i].yaw, raiseChance: 0 })).map((f, i) => ({
      ...f, shirt: L[i].shirt, pants: L[i].pants, armsUp: 0, bounce: 0.25,
    }))
  }, [y2, y3])

  const lights = (y, zone, pts) => pts.map(([lx, lz], i) => (
    <CeilingLight key={zone + i} position={[lx, y + FH - 0.3, lz]} size={[1.5, 1.5]} intensity={18} distance={12} zone={zone} watts={56} color="#fff3e0" />
  ))
  const easel = (x, y, z, seed) => (
    <group key={seed} position={[x, y, z]}>
      <mesh position={[0, 0.85, 0]} material={m.blackSteel}><boxGeometry args={[0.7, 1.0, 0.05]} /></mesh>
      {[-0.28, 0.28].map((dx) => <mesh key={dx} position={[dx, 0.45, 0.2]} rotation={[0.2, 0, 0]} material={m.darkMetal}><boxGeometry args={[0.04, 0.9, 0.04]} /></mesh>)}
      <Artwork position={[0, 0.9, 0.04]} size={[0.6, 0.8]} seed={seed} />
    </group>
  )

  return (
    <group>
      <JusticeBuilding
        id="rehab" x0={x0} x1={x1} z0={z0} z1={z1} h={FH} floors={3} holes={holes} upperFloorMat={carpet} windowSeed={11}
        doorSide="west" doorHalf={1.2} doorH={2.8}
        wall="limestone" wallColor="#efe2c2" doorAccent="#2fd0c4" doorLabel="Rehabilitation Center doors"
        floorMat={lobbyFloor} roofColor="#8a8579" seed={51} upperW={2.6}
        sign={{ name: 'REHABILITATION CENTER', sub: 'RECOVERY · SKILLS · SUPPORT' }} signWidth={8.6}
        groundWindows={[-5.6, 5.6].map((off) => ({ off, half: 0.9, v0: 0.9, v1: 3.4 }))}
      >

        <ElevatorCar cfg={car} />
        <UStair x0={STAIR.x0} x1={STAIR.x1} zA={STAIR.zA} zB={STAIR.zB} y={jy(0)} rise={FH} landing={STAIR.landing} />
        <UStair x0={STAIR.x0} x1={STAIR.x1} zA={STAIR.zA} zB={STAIR.zB} y={jy(1)} rise={FH} landing={STAIR.landing} />
        {[1, 2].map((k) => (
          <group key={'g' + k}>
            <Rail a={[STAIR.x0, STAIR.zA]} b={[STAIR.x0, STAIR.zB - STAIR.landing]} y={jy(k)} style="glass" h={1.0} />
            <Rail a={[STAIR.x1, STAIR.zA]} b={[STAIR.x1, STAIR.zB - STAIR.landing]} y={jy(k)} style="glass" h={1.0} />
            <Rail a={[STAIR.x0, STAIR.zB - STAIR.landing]} b={[STAIR.x1, STAIR.zB - STAIR.landing]} y={jy(k)} style="glass" h={1.0} />
            {k === 2 && <Rail a={[STAIR.x0, STAIR.zA]} b={[STAIR.x0 + 1.7, STAIR.zA]} y={jy(k)} style="glass" h={1.0} />}
          </group>
        ))}
        <RoomSign text="STAIRS" position={[52.1, GROUND + 3.4, 123.55]} rotation={[0, Math.PI, 0]} width={2.0} />

        {/* ---------------- FLOOR 1: WELCOME, CAFÉ, FITNESS ---------------- */}
        <RehabKiosks />
        <Chandelier position={[28, GROUND + FH - 0.3, 121]} type="crystal" size={1.4} drop={1.2} zone="rehab-1" watts={200} />
        <Chandelier position={[46, GROUND + FH - 0.3, 124]} type="gold" size={0.9} drop={0.9} zone="rehab-1" watts={120} />
        <Artwork position={[36, GROUND + 2.6, z1 - 0.3]} rotation={[0, Math.PI, 0]} size={[3.4, 1.9]} seed={3} />
        <Artwork position={[22, GROUND + 2.6, z0 + 0.5]} rotation={[0, 0, 0]} size={[3.4, 1.9]} seed={5} />
        <RoomSign text="WELCOME" position={[24, GROUND + 3.6, z1 - 0.28]} rotation={[0, Math.PI, 0]} width={3.4} color="#0e3a2a" glow="#8fffd6" />
        <Counter position={[24, GROUND, 125.8]} yaw={Math.PI} length={6} height={1.1} depth={0.9} top="marble" face="#1c2a2a" />
        <Sofa position={[22.6, GROUND, 116.6]} yaw={0} length={3.0} color="#2f5f5a" />
        <Sofa position={[27.2, GROUND, 116.6]} yaw={0} length={3.0} color="#2f5f5a" />
        <Plant position={[19.4, GROUND, 122.6]} scale={1.2} />
        <Plant position={[19.4, GROUND, 119.2]} scale={1.2} />
        <RoomSign text="ELEVATORS" position={[31.35, GROUND + 3.4, 121.9]} rotation={[0, Math.PI, 0]} width={2.2} />
        <RoomSign text="CAFÉ" position={[43, GROUND + 3.4, z1 - 0.28]} rotation={[0, Math.PI, 0]} width={2.4} color="#3a2a12" glow="#ffd9a0" />
        <Counter position={[43, GROUND, 126.4]} yaw={Math.PI} length={8} height={1.05} depth={0.8} top="marble" face="#2a2218" />
        {[38.5, 43, 47.5].map((x) => (
          <group key={x}>
            <Table position={[x, GROUND, 123.2]} size={[1.0, 1.0]} height={0.75} top="wood" round />
            <Chair position={[x, GROUND, 122.3]} yaw={0} color="#3b3f46" label="Sit at the café" />
            <Chair position={[x, GROUND, 124.1]} yaw={Math.PI} color="#3b3f46" label="Sit at the café" />
          </group>
        ))}
        <BoxRoom id="rehab-fit" x0={36.5} x1={48.5} z0={114.6} z1={120.5} y={GROUND} h={FH} doorSide="north" doorAt={40} label="fitness room" doorStyle="glass" glassSide="east" />
        <RoomSign text="FITNESS" position={[40, GROUND + 3.3, 120.6]} width={2.0} />
        {[38, 40, 42].map((x) => (
          <group key={x} position={[x, GROUND, 116.2]}>
            <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.35, 0.6, 0.8]} position={[0, 0.6, 0]} /></RigidBody>
            <mesh position={[0, 0.25, 0]} material={m.blackSteel} castShadow><boxGeometry args={[0.7, 0.35, 1.6]} /></mesh>
            <mesh position={[0, 0.95, 0.7]} material={m.darkMetal}><boxGeometry args={[0.6, 0.5, 0.1]} /></mesh>
          </group>
        ))}
        <mesh position={[46.4, GROUND + 0.45, 115.2]} material={m.darkMetal} castShadow><boxGeometry args={[2.4, 0.9, 0.5]} /></mesh>
        <mesh position={[45, GROUND + 0.015, 118.4]} rotation={[-Math.PI / 2, 0, 0]} material={new THREE.MeshStandardMaterial({ color: '#2f6f6a', roughness: 0.9 })}><planeGeometry args={[3, 1.6]} /></mesh>

        {/* ---------------- FLOOR 2: COUNSELING & GROUPS ---------------- */}
        <RoomSign text="FLOOR 2 · COUNSELING & GROUPS" position={[x0 + 0.65, y2 + 3.3, 118]} rotation={[0, Math.PI / 2, 0]} width={4.2} color="#0e3a2a" glow="#8fffd6" />
        <RoomSign text="STAIRS" position={[52.1, y2 + 3.4, 123.55]} rotation={[0, Math.PI, 0]} width={2.0} />
        {[[19, 24.2, 21.6, 'COUNSELING A'], [24.7, 29.2, 26.9, 'COUNSELING B']].map(([a, b, d, t], i) => (
          <group key={t}>
            <BoxRoom id={'rehab-couns-' + i} x0={a} x1={b} z0={114.6} z1={119.6} y={y2} h={FH} doorSide="north" doorAt={d} label="counseling room" />
            <RoomSign text={t} position={[d, y2 + 3.2, 119.7]} width={2.2} color="#0e3a2a" glow="#8fffd6" />
            <Sofa position={[d, y2, 115.6]} yaw={0} length={2.0} color="#3a5a5a" />
            <Chair position={[d, y2, 118.4]} yaw={Math.PI} color="#6a5a8a" label="Sit in counseling" />
            <Plant position={[b - 0.6, y2, 115.2]} scale={1.0} />
          </group>
        ))}
        <BoxRoom id="rehab-group" x0={34.5} x1={48.5} z0={114.6} z1={121} y={y2} h={FH} doorSide="north" doorAt={41.5} label="group room" doorStyle="glass" glassSide="west" />
        <RoomSign text="GROUP ROOM" position={[41.5, y2 + 3.3, 121.1]} width={2.4} />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2 + 0.2
          const dx = Math.cos(a) * 2.3, dz = Math.sin(a) * 2.3
          return <Chair key={i} position={[41.5 + dx, y2, 117.8 + dz]} yaw={Math.atan2(-dx, -dz)} color="#3b3f46" label="Join the circle" />
        })}
        <RoomSign text="WELLNESS LOUNGE" position={[28, y2 + 3.5, z1 - 0.28]} rotation={[0, Math.PI, 0]} width={3.4} color="#0e3a2a" glow="#8fffd6" />
        <Sofa position={[24, y2, 126.6]} yaw={Math.PI} length={3.2} color="#3a5a5a" />
        <Sofa position={[28.5, y2, 126.6]} yaw={Math.PI} length={3.2} color="#3a5a5a" />
        <Table position={[26.2, y2, 124.4]} size={[1.6, 0.8]} height={0.45} top="wood" />
        <Counter position={[42, y2, 127.0]} yaw={Math.PI} length={4} height={1.0} depth={0.6} top="wood" face="#2a2218" />
        <RoomSign text="TEA & QUIET" position={[42, y2 + 3.2, z1 - 0.28]} rotation={[0, Math.PI, 0]} width={2.4} />
        <Plant position={[36, y2, 126.6]} scale={1.3} />
        <Plant position={[20, y2, 126.6]} scale={1.3} />

        {/* ---------------- FLOOR 3: EDUCATION & CAREERS ---------------- */}
        <RoomSign text="FLOOR 3 · EDUCATION & CAREERS" position={[x0 + 0.65, y3 + 3.3, 118]} rotation={[0, Math.PI / 2, 0]} width={4.2} color="#1d2733" glow="#9fc0e8" />
        <RoomSign text="STAIRS" position={[52.1, y3 + 3.4, 123.55]} rotation={[0, Math.PI, 0]} width={2.0} />
        <BoxRoom id="rehab-lab" x0={19} x1={29.2} z0={114.6} z1={120} y={y3} h={FH} doorSide="north" doorAt={24} label="computer lab" doorStyle="glass" glassSide="east" />
        <RoomSign text="COMPUTER LAB" position={[24, y3 + 3.3, 120.1]} width={2.6} />
        {[116, 118.4].flatMap((z) => [21, 24, 27].map((x) => (
          <group key={x + ':' + z}>
            <Table position={[x, y3, z]} size={[1.7, 0.8]} height={0.75} top="wood" />
            <WallScreen position={[x, y3 + 0.99, z - 0.2]} yaw={0} size={[0.6, 0.36]} />
            <Chair position={[x, y3, z + 0.9]} yaw={Math.PI} color="#2a2f38" />
          </group>
        )))}
        <BoxRoom id="rehab-class" x0={34.5} x1={48.5} z0={114.6} z1={121} y={y3} h={FH} doorSide="north" doorAt={41.5} label="classroom" doorStyle="glass" glassSide="west" />
        <RoomSign text="CLASSROOM" position={[41.5, y3 + 3.3, 121.1]} width={2.4} />
        <WallScreen position={[41.5, y3 + 2.0, 114.85]} yaw={0} size={[4.0, 2.0]} id="screen-rehab-class" zone="rehab-3" name="Rehab Center classroom" />
        {[118, 119.4].flatMap((z) => [38, 40, 42, 44].map((x) => <Chair key={x + ':' + z} position={[x, y3, z]} yaw={Math.PI} color="#3b3f46" label="Sit in class" />))}
        {/* library nook */}
        <RoomSign text="LIBRARY NOOK" position={[26, y3 + 3.7, z1 - 0.28]} rotation={[0, Math.PI, 0]} width={3.0} />
        {[21, 24.6, 28.2, 31.8].map((x) => <Shelf key={x} position={[x, y3, z1 - 0.3]} yaw={Math.PI} width={3.4} height={2.4} />)}
        <Table position={[26, y3, 124.6]} size={[2.4, 1.0]} height={0.75} top="wood" />
        {[25, 27].map((x) => <Chair key={x} position={[x, y3, 123.6]} yaw={0} color="#3b3f46" label="Sit and read" />)}
        <Sofa position={[22, y3, 122.8]} yaw={Math.PI / 2} length={2.2} color="#2f5f5a" />
        {/* art therapy wall */}
        <RoomSign text="ART THERAPY" position={[44, y3 + 3.7, z1 - 0.28]} rotation={[0, Math.PI, 0]} width={3.0} color="#3a1a3a" glow="#ffb0f0" />
        {[39, 44, 49].map((x, i) => <Artwork key={x} position={[x, y3 + 2.2, z1 - 0.3]} rotation={[0, Math.PI, 0]} size={[2.8, 1.6]} seed={7 + i} />)}
        {easel(41, y3, 125.2, 12)}
        {easel(47, y3, 125.2, 13)}
        <Table position={[44, y3, 126.4]} size={[2.4, 0.7]} height={0.8} top="wood" />
        <Plant position={[36, y3, 126.6]} scale={1.2} />

        {lights(GROUND, 'rehab-1', [[22, 118], [22, 124], [36, 118], [33, 125], [43, 118], [48, 123], [41, 125.5], [31.4, 118]])}
        {lights(y2, 'rehab-2', [[21.6, 117], [26.9, 117], [41.5, 118], [31.4, 118], [24, 124], [34, 124], [42, 124], [48, 124]])}
        {lights(y3, 'rehab-3', [[22, 117], [27, 117], [41.5, 118], [31.4, 118], [24, 124], [34, 124], [42, 124], [48, 124]])}
      </JusticeBuilding>

      <group userData={{ noBatch: true }}>
        <HumanoidCrowd fans={people} beat={0} castShadow />
      </group>
      <RehabDialogue y2={y2} y3={y3} />

      {/* the approach from the avenue's north end: pavers, planters, benches and lamps */}
      <group>
        <mesh position={[12.5, GROUND + 0.008, 121]} rotation={[-Math.PI / 2, 0, 0]} material={surface('pavers', 3, 2)} receiveShadow>
          <planeGeometry args={[11, 10]} />
        </mesh>
        {[[14, 116.2], [14, 125.8]].map(([x, z], i) => <Planter key={i} position={[x, GROUND, z]} size={[1.6, 0.7, 1.6]} />)}
        {[[12, 117.2], [12, 124.8]].map(([x, z], i) => <Bench key={i} position={[x, GROUND, z]} yaw={Math.PI / 2} />)}
        {[[16.4, 114.6], [16.4, 127.4]].map(([x, z], i) => <StreetLamp key={i} position={[x, GROUND, z]} height={6} />)}
      </group>
    </group>
  )
}

export default RehabCenter
