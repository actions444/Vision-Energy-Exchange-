import { useMemo } from 'react'
import * as THREE from 'three'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { surface, getMaterials } from './materials.js'
import { Block } from './jobkit.jsx'
import { DoubleDoor } from './Door.jsx'
import { BrandSign, Plaque } from './signs.jsx'
import { Trees, FlowerBed, Bench, StreetLamp, Lawn } from './props.jsx'
import { PLATFORM, PLATFORM_Y, PARK, POND, GAZEBO, COURSE, CLUBHOUSE, CART_BAY, HOLES } from '../config/parkGolf.js'

// ============================================================================
// EMERALD LINKS & HARBOR COMMONS
// A big public park (west half) and a big golf course (east half) on one broad platform rising from
// the sea south-east of The Reign Arena. Everything is open-air; no interior gates needed.
// ============================================================================

const FY = PLATFORM_Y
const pcx = (PLATFORM.x0 + PLATFORM.x1) / 2, pcz = (PLATFORM.z0 + PLATFORM.z1) / 2
const pw = PLATFORM.x1 - PLATFORM.x0, pd = PLATFORM.z1 - PLATFORM.z0

function Platform() {
  const m = useMemo(() => ({
    concrete: surface('concrete', 10, 9, { color: '#8d8a84' }),
    pavers: surface('pavers', 6, 6, { color: '#c7c0ae' }),
  }), [])
  return (
    <group>
      {/* a submerged apron at the water's edge, so you can walk up out of the sea, and a raised walkable top */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[pw / 2, 0.1, pd / 2]} position={[pcx, 0.1, pcz]} />
        <CuboidCollider args={[pw / 2 - 1.6, 0.25, pd / 2 - 1.6]} position={[pcx, FY - 0.25, pcz]} />
      </RigidBody>
      <mesh position={[pcx, FY - 0.26, pcz]} material={m.concrete} receiveShadow>
        <boxGeometry args={[pw - 3.2, 0.5, pd - 3.2]} />
      </mesh>
      <mesh position={[pcx, FY - 0.01, pcz]} material={m.pavers} receiveShadow>
        <boxGeometry args={[pw - 3.2, 0.03, pd - 3.2]} />
      </mesh>
    </group>
  )
}

// ---------------------------------------------------------------- Harbor Commons (the park)
function Pond() {
  const water = useMemo(() => getMaterials().water, [])
  return (
    <group position={[POND.x, FY + 0.02, POND.z]}>
      <mesh position={[0, -0.03, 0]} material={surface('soil', 2, 2, { color: '#8d9a7c' })} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[Math.max(POND.rx, POND.rz) + 0.6, 40]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[POND.rx, POND.rz, 1]} material={water}>
        <circleGeometry args={[1, 40]} />
      </mesh>
    </group>
  )
}

function Gazebo({ position }) {
  const m = useMemo(() => ({
    wood: surface('wood', 2, 2, { color: '#e8e2d0' }),
    roof: surface('wood', 2, 2, { color: '#3d5a46' }),
  }), [])
  const [x, z] = [position[0], position[1]]
  const r = 3.1, h = 2.6
  const posts = useMemo(() => Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return [Math.cos(a) * r, Math.sin(a) * r] }), [])
  return (
    <group position={[x, FY, z]}>
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[r, 1.2, r]} position={[0, 1.2, 0]} /></RigidBody>
      <mesh position={[0, 0.1, 0]} material={m.wood} receiveShadow castShadow><cylinderGeometry args={[r + 0.3, r + 0.3, 0.2, 24]} /></mesh>
      {posts.map(([px, pz], i) => <mesh key={i} position={[px, h / 2 + 0.2, pz]} material={m.wood} castShadow><cylinderGeometry args={[0.1, 0.1, h, 10]} /></mesh>)}
      <mesh position={[0, h + 0.3, 0]} material={m.roof} castShadow><coneGeometry args={[r + 0.7, 1.3, 8]} /></mesh>
      <mesh position={[0, h + 0.95, 0]} material={m.wood}><sphereGeometry args={[0.14, 10, 8]} /></mesh>
      {posts.map(([px, pz], i) => <mesh key={'r' + i} position={[px * 0.5, h - 0.1, pz * 0.5]} rotation={[0, (i / 8) * Math.PI * 2, 0]} material={m.wood}><boxGeometry args={[0.05, 0.05, r]} /></mesh>)}
    </group>
  )
}

function HarborCommons() {
  const trees = useMemo(() => {
    const list = []
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2
      const rx = 22 + ((i * 37) % 7), rz = 46 + ((i * 53) % 7)
      const x = POND.x + Math.cos(a) * rx * 0.5, z = POND.z + Math.sin(a) * rz * 0.5
      if (x > PARK.x0 + 3 && x < PARK.x1 - 3 && z > PARK.z0 + 3 && z < PARK.z1 - 3) list.push([x, FY, z, 0.9 + ((i * 11) % 5) * 0.08])
    }
    return list
  }, [])
  return (
    <group>
      <Lawn x0={PARK.x0} x1={PARK.x1} z0={PARK.z0} z1={PARK.z1} y={FY} skip={[[POND.x, POND.z, Math.max(POND.rx, POND.rz) + 0.8], [GAZEBO.x, GAZEBO.z, 4]]} />
      <Pond />
      <Gazebo position={[GAZEBO.x, GAZEBO.z]} />
      <Trees trees={trees} />
      {[[PARK.x0 + 6, PARK.z0 + 10], [PARK.x0 + 6, PARK.z1 - 10], [PARK.x1 - 7, PARK.z0 + 14], [PARK.x1 - 7, PARK.z1 - 14]].map(([x, z], i) => (
        <FlowerBed key={i} x={x} z={z} w={5} d={2.6} seed={30 + i} />
      ))}
      {[[POND.x - POND.rx - 2.5, POND.z], [POND.x + POND.rx + 2.5, POND.z]].map(([x, z], i) => <Bench key={i} position={[x, FY, z]} yaw={i ? -Math.PI / 2 : Math.PI / 2} />)}
      <Bench position={[GAZEBO.x - 4, FY, GAZEBO.z]} yaw={Math.PI / 2} />
      <Bench position={[GAZEBO.x + 4, FY, GAZEBO.z]} yaw={-Math.PI / 2} />
      {[PARK.z0 + 8, PARK.z0 + 40, PARK.z0 + 72, PARK.z1 - 8].map((z, i) => <StreetLamp key={i} position={[PARK.x0 + 3, FY, z]} yaw={Math.PI / 2} />)}
      <BrandSign text="HARBOR COMMONS" sub="VISION STORMS CITY PARK" position={[PARK.x0 + 0.1, FY + 2.2, (PARK.z0 + PARK.z1) / 2]} rotation={[0, Math.PI / 2, 0]} width={5.6} color="#eef6ea" glow="#c9f0c4" />
    </group>
  )
}

// ---------------------------------------------------------------- Emerald Links (the golf course)
function Flag({ n, color }) {
  return (
    <group>
      <mesh position={[0, 1.1, 0]} castShadow><cylinderGeometry args={[0.02, 0.02, 2.2, 6]} /><meshStandardMaterial color="#e8e2d0" roughness={0.4} metalness={0.3} /></mesh>
      <mesh position={[0.26, 2.0, 0]}><planeGeometry args={[0.5, 0.32]} /><meshStandardMaterial color={color} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.22, 16]} /><meshStandardMaterial color="#1c1d20" roughness={0.9} /></mesh>
    </group>
  )
}

function TeeMarker({ position, n }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128
    const g = c.getContext('2d')
    g.fillStyle = '#1f2f5c'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill()
    g.strokeStyle = '#eef6ea'; g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.stroke()
    g.fillStyle = '#eef6ea'; g.font = '700 58px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 64, 68)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [n])
  return (
    <group position={[position[0], FY, position[1]]}>
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} material={surface('grass', 1, 1, { color: '#4f9657' })}><circleGeometry args={[2.2, 24]} /></mesh>
      <mesh position={[-1.5, 0.75, -1.5]} rotation={[0, 0, 0]} castShadow><boxGeometry args={[0.3, 1.5, 0.3]} /><meshStandardMaterial color="#e8e2d0" roughness={0.6} /></mesh>
      <mesh position={[-1.5, 1.52, -1.5]} material={new THREE.MeshStandardMaterial({ map: tex })} rotation={[0, Math.PI / 4, 0]}><boxGeometry args={[0.42, 0.42, 0.06]} /></mesh>
      {[[-0.3, -0.5], [0.4, 0.2]].map(([dx, dz], i) => <mesh key={i} position={[dx, 0.21, dz]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.05, 8]} /><meshStandardMaterial color="#f4f1ea" /></mesh>)}
    </group>
  )
}

function Bunker({ position }) {
  return (
    <mesh position={[position[0], FY + 0.04, position[1]]} rotation={[-Math.PI / 2, 0, 0]} material={surface('soil', 3, 3, { color: '#e3cf9c', roughness: 0.95 })} receiveShadow>
      <circleGeometry args={[3.4, 28]} />
    </mesh>
  )
}

function WaterHazard({ hz }) {
  const water = useMemo(() => getMaterials().water, [])
  return (
    <mesh position={[hz.x, FY + 0.03, hz.z]} rotation={[-Math.PI / 2, 0, 0]} scale={[hz.rx, hz.rz, 1]} material={water}>
      <circleGeometry args={[1, 36]} />
    </mesh>
  )
}

function Hole({ hole }) {
  const greenMat = useMemo(() => surface('grass', 3, 3, { color: '#6fc26a', roughness: 0.6 }), [])
  const fairwayMat = useMemo(() => surface('grass', 4, 10, { color: '#5bab5c', roughness: 0.75 }), [])
  const [tx, tz] = hole.tee, [gx, gz] = hole.green
  const dx = gx - tx, dz = gz - tz
  const len = Math.hypot(dx, dz), ang = Math.atan2(dx, dz)
  return (
    <group>
      <mesh position={[(tx + gx) / 2, FY + 0.01, (tz + gz) / 2]} rotation={[-Math.PI / 2, 0, ang]} material={fairwayMat} receiveShadow>
        <planeGeometry args={[9, len]} />
      </mesh>
      <mesh position={[gx, FY + 0.02, gz]} rotation={[-Math.PI / 2, 0, 0]} material={greenMat} receiveShadow>
        <circleGeometry args={[hole.greenR, 40]} />
      </mesh>
      <group position={[gx, 0, gz]}><Flag n={hole.n} color="#d6223a" /></group>
      <TeeMarker position={hole.tee} n={hole.n} />
      {hole.bunker && <Bunker position={hole.bunker} />}
      {hole.water && <WaterHazard hz={hole.water} />}
    </group>
  )
}

function Clubhouse() {
  const m = useMemo(() => ({
    wall: surface('plaster', 4, 2, { color: '#f0ead9' }),
    roof: surface('wood', 3, 2, { color: '#3d5a46' }),
    trim: new THREE.MeshStandardMaterial({ color: '#1f2f5c', roughness: 0.6 }),
  }), [])
  const c = CLUBHOUSE
  const cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2, w = c.x1 - c.x0, d = c.z1 - c.z0
  return (
    <group>
      <Block position={[cx, FY + c.h / 2, cz]} size={[w, c.h, d]} material={m.wall} />
      <mesh position={[cx, FY + c.h + 0.5, cz]} castShadow material={m.roof}><boxGeometry args={[w + 1, 1, d + 1]} /></mesh>
      <mesh position={[cx, FY, cz - d / 2 - 0.02]} material={m.trim}><boxGeometry args={[w, 0.3, 0.06]} /></mesh>
      <DoubleDoor id="clubhouse-doors" center={[cx, FY + 1.2, c.z0]} halfWidth={1.1} height={2.4} facing={Math.PI} accent="#1f2f5c" label="clubhouse doors" finish="bronze" />
      <BrandSign text="EMERALD LINKS" sub="GOLF CLUBHOUSE · CARTS FREE TO DRIVE" position={[cx, FY + c.h + 1.3, cz - d / 2 - 0.05]} rotation={[0, Math.PI, 0]} width={9} color="#eef6ea" glow="#8fe08a" />
      <Plaque lines={['EMERALD LINKS', 'Est. this season']} position={[c.x0 - 0.05, FY + 1.6, cz]} rotation={[0, -Math.PI / 2, 0]} />
    </group>
  )
}

function EmeraldLinks() {
  const roughTrees = useMemo(() => {
    const list = []
    for (let i = 0; i < 26; i++) {
      const x = COURSE.x0 + 3 + ((i * 29) % (COURSE.x1 - COURSE.x0 - 6))
      const z = COURSE.z0 + 3 + ((i * 53) % (COURSE.z1 - COURSE.z0 - 6))
      const nearHole = HOLES.some((h) => Math.hypot(x - h.green[0], z - h.green[1]) < h.greenR + 5 || Math.hypot(x - h.tee[0], z - h.tee[1]) < 5 ||
        (Math.abs((x - h.tee[0]) * (h.green[1] - h.tee[1]) - (z - h.tee[1]) * (h.green[0] - h.tee[0])) / Math.hypot(h.green[0] - h.tee[0], h.green[1] - h.tee[1]) < 5))
      if (!nearHole) list.push([x, FY, z, 0.8 + ((i * 7) % 5) * 0.1])
    }
    return list
  }, [])
  return (
    <group>
      <Lawn x0={COURSE.x0} x1={COURSE.x1} z0={COURSE.z0} z1={COURSE.z1} y={FY} skip={[[CLUBHOUSE.x0 - 1, CLUBHOUSE.x1 + 10, CLUBHOUSE.z0 - 1, CLUBHOUSE.z1 + 1]]} />
      <Clubhouse />
      {HOLES.map((h) => <Hole key={h.n} hole={h} />)}
      <Trees trees={roughTrees} />
      <StreetLamp position={[CART_BAY.x + 2, FY, CART_BAY.z - 3]} yaw={0} />
      <BrandSign text="THE FIRST TEE" position={[HOLES[0].tee[0], FY + 2.2, HOLES[0].tee[1] - 2]} rotation={[0, 0, 0]} width={3.4} color="#eef6ea" glow="#8fe08a" />
    </group>
  )
}

export default function ParkGolf() {
  return (
    <group>
      <Platform />
      <HarborCommons />
      <EmeraldLinks />
    </group>
  )
}
