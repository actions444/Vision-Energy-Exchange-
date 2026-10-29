import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { I45 } from '../config/i45.js'
import { stepLane, inBox } from './i45Logic.js'
import { Vehicle } from '../vehicles/Vehicle.jsx'
import { NpcCar } from '../vehicles/Traffic.jsx'
import { vehicleBodies } from '../vehicles/vehicles.js'
import { playerState } from '../state/runtime.js'
import { useStore } from '../state/store.js'

const CONCRETE = new THREE.MeshStandardMaterial({ color: '#8d9096', roughness: 0.9 })
const ASPHALT = new THREE.MeshStandardMaterial({ color: '#2b2d31', roughness: 0.95 })
const PAINT = new THREE.MeshStandardMaterial({ color: '#f2f2ee', roughness: 0.6 })
const RAIL = new THREE.MeshStandardMaterial({ color: '#c7ccd3', roughness: 0.5, metalness: 0.4 })
const SAND = new THREE.MeshStandardMaterial({ color: '#d7c29a', roughness: 1 })
const GRASS = new THREE.MeshStandardMaterial({ color: '#4f7a3a', roughness: 1 })
const GANTRY = new THREE.MeshStandardMaterial({ color: '#7b8189', roughness: 0.6, metalness: 0.5 })
const ARRIVAL = new THREE.MeshStandardMaterial({ color: '#ffd36c', emissive: '#ffb020', emissiveIntensity: 0.8, transparent: true, opacity: 0.55 })

/**
 * A box whose long axis runs from point a to point b (top surface on the line).
 * Used for ramps, the deck and rails, and returns the visual and collider parts.
 */
function Segment({ a, b, width, thick = 0.6, material = ASPHALT, collider = true }) {
  const av = new THREE.Vector3(...a)
  const bv = new THREE.Vector3(...b)
  const len = av.distanceTo(bv)
  const X = bv.clone().sub(av).normalize()
  const Z = new THREE.Vector3(-X.z, 0, X.x)
  if (Z.lengthSq() < 1e-9) Z.set(0, 0, 1)
  Z.normalize()
  const Y = new THREE.Vector3().crossVectors(Z, X).normalize()
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z))
  const e = new THREE.Euler().setFromQuaternion(q)
  const mid = av.clone().add(bv).multiplyScalar(0.5).add(Y.clone().multiplyScalar(-thick / 2))
  const rot = [e.x, e.y, e.z]
  const pos = [mid.x, mid.y, mid.z]
  return (
    <>
      <mesh position={pos} rotation={rot} material={material} receiveShadow castShadow>
        <boxGeometry args={[len, thick, width]} />
      </mesh>
      {collider && <CuboidCollider args={[len / 2, thick / 2, width / 2]} position={pos} rotation={rot} />}
    </>
  )
}

/** Overhead green sign on two posts, readable from the eastbound lanes. */
function Gantry({ x, text }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 1024
    c.height = 160
    const g = c.getContext('2d')
    g.fillStyle = '#1d6b3a'
    g.fillRect(0, 0, c.width, c.height)
    g.strokeStyle = '#ffffff'
    g.lineWidth = 10
    g.strokeRect(12, 12, c.width - 24, c.height - 24)
    g.fillStyle = '#ffffff'
    g.font = 'bold 84px Arial, sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(`I-45  ${text}`, c.width / 2, c.height / 2 + 4)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [text])
  const board = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }), [tex])
  const h = 9
  return (
    <group position={[x, I45.deckY, 0]}>
      {[-14, 14].map((z) => (
        <mesh key={z} position={[0, h / 2, z]} material={GANTRY} castShadow>
          <boxGeometry args={[0.6, h, 0.6]} />
        </mesh>
      ))}
      <mesh position={[0, h + 1.2, 0]} material={GANTRY}>
        <boxGeometry args={[0.5, 0.5, 28]} />
      </mesh>
      <mesh position={[-0.32, h + 0.6, 0]} rotation={[0, -Math.PI / 2, 0]} material={board}>
        <planeGeometry args={[27, 3.2]} />
      </mesh>
    </group>
  )
}

/** Dashed white lane lines on the deck. */
function LaneMarkings() {
  const dashes = useMemo(() => {
    const out = []
    for (const z of [-7.4, -3.8, 3.8, 7.4]) {
      for (let x = I45.deckStartX + 2; x < I45.deckEndX - 2; x += 9) out.push([x + 2.25, z])
    }
    return out
  }, [])
  return dashes.map(([x, z], i) => (
    <mesh key={i} position={[x, I45.deckY + 0.02, z]} material={PAINT} rotation={[0, 0, 0]}>
      <boxGeometry args={[4.5, 0.02, 0.22]} />
    </mesh>
  ))
}

/** Concrete piers under the bay bridge. Visual only, so they never block the car. */
function Piers() {
  const xs = []
  for (let x = I45.deckStartX + 12; x < I45.deckEndX - 8; x += 24) xs.push(x)
  return xs.map((x) =>
    [-6, 6].map((z) => (
      <mesh key={x + ':' + z} position={[x, -1.05, z]} material={CONCRETE}>
        <cylinderGeometry args={[1.1, 1.3, I45.deckY + 5.4, 12]} />
      </mesh>
    )),
  )
}

/** Kinematic traffic on both directions, using the same body style as the street cars. */
function I45Traffic() {
  const style = useMemo(() => ({ len: 4.6, wid: 1.9, low: 0.7, cab: 0.65, cabX: -0.3, cabLen: 2.3 }), [])
  const cars = useMemo(() => {
    const list = []
    const lanes = [
      ...I45.eastLanes.map((z) => ({ z, dir: 1 })),
      ...I45.westLanes.map((z) => ({ z, dir: -1 })),
    ]
    lanes.forEach((lane, li) => {
      for (let i = 0; i < I45.trafficPerLane; i++) {
        const span = I45.deckEndX - I45.deckStartX
        list.push({
          id: li * 10 + i,
          lane: li,
          dir: lane.dir,
          z: lane.z,
          x: I45.deckStartX + ((i + 0.5) * span) / I45.trafficPerLane,
          v: 14,
          spin: 0,
          style,
          color: ['#1f2a44', '#8a1c1c', '#d8d8d2', '#2e5f3c', '#3a3a3a', '#c9a24a'][(li * 3 + i) % 6],
        })
      }
    })
    return list
  }, [style])
  const sim = useRef(cars)
  const bodies = useRef([])
  const xMin = I45.deckStartX + 4
  const xMax = I45.deckEndX - 4

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1)
    const byLane = new Map()
    for (const c of sim.current) {
      if (!byLane.has(c.lane)) byLane.set(c.lane, [])
      byLane.get(c.lane).push(c)
    }
    for (const [, group] of byLane) stepLane(group, dt, { dir: group[0].dir, xMin, xMax })
    for (const c of sim.current) {
      const b = bodies.current[c.id]
      if (!b) continue
      b.setNextKinematicTranslation({ x: c.x, y: I45.deckY, z: c.z })
      b.setNextKinematicRotation(c.dir > 0 ? { x: 0, y: 0, z: 0, w: 1 } : { x: 0, y: 1, z: 0, w: 0 })
      c.spin += (c.v * dt) / 0.34
    }
  })

  return cars.map((c) => (
    <RigidBody
      key={c.id}
      ref={(b) => (bodies.current[c.id] = b)}
      type="kinematicPosition"
      colliders={false}
      position={[c.x, I45.deckY, c.z]}
      rotation={[0, c.dir > 0 ? 0 : Math.PI, 0]}
      userData={{ npcCar: 'i45-' + c.id }}
    >
      <CuboidCollider args={[style.len / 2, (style.low + style.cab) / 2, style.wid / 2]} position={[0, 0.25 + (style.low + style.cab) / 2, 0]} />
      <NpcCar car={c} />
    </RigidBody>
  ))
}

/** Watches the player and the highway car. Arrival fires once per visit to the zone. */
function ArrivalWatch() {
  const inside = useRef(false)
  useFrame(() => {
    const p = playerState.position
    let hit = inBox(p.x, p.z, I45.arrival) && p.y > 1
    const car = vehicleBodies.get(I45.carSpawn.id)
    if (!hit && car) {
      try {
        const t = car.body.translation()
        hit = inBox(t.x, t.z, I45.arrival)
      } catch {
        /* body removed */
      }
    }
    if (hit && !inside.current) {
      inside.current = true
      useStore.getState().showToast('Arrived in Galveston')
      if (typeof window !== 'undefined') window.__i45Arrived = (window.__i45Arrived || 0) + 1
    } else if (!hit) {
      inside.current = false
    }
  })
  return null
}

/**
 * I-45 compressed route: Houston's east edge over the bay to Galveston Island.
 * Renders inside <Physics>. The city boundary wall has a gap for it (see City.jsx).
 */
export default function I45Highway() {
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <Segment a={[I45.landRampX, 0, 0]} b={[I45.deckStartX, I45.deckY, 0]} width={25} />
        <Segment a={[I45.deckStartX, I45.deckY, 0]} b={[I45.deckEndX, I45.deckY, 0]} width={25} />
        <Segment a={[I45.deckEndX, I45.deckY, 0]} b={[I45.downRampEndX, 0, 0]} width={12} />
        <Segment a={[I45.deckStartX, I45.deckY + 0.5, 0]} b={[I45.deckEndX, I45.deckY + 0.5, 0]} width={0.8} thick={0.9} material={CONCRETE} />
        <Segment a={[I45.deckStartX, I45.deckY + 0.4, 12.3]} b={[I45.deckEndX, I45.deckY + 0.4, 12.3]} width={0.4} thick={0.8} material={RAIL} />
        <Segment a={[I45.deckStartX, I45.deckY + 0.4, -12.3]} b={[I45.deckEndX, I45.deckY + 0.4, -12.3]} width={0.4} thick={0.8} material={RAIL} />
        {I45.exits.map((e) => (
          <Segment key={e.id} a={[e.from[0], I45.deckY, e.from[1]]} b={[e.to[0], 0, e.to[1]]} width={8.5} />
        ))}
        {/* Galveston Island ground */}
        <CuboidCollider args={[(I45.island.x1 - I45.island.x0) / 2, 0.5, (I45.island.z1 - I45.island.z0) / 2]} position={[(I45.island.x0 + I45.island.x1) / 2, -0.5, 0]} />
      </RigidBody>

      <LaneMarkings />
      <Piers />

      {I45.gantries.map((g) => (
        <Gantry key={g.x} x={g.x} text={g.text} />
      ))}

      <mesh position={[(I45.island.x0 + I45.island.x1) / 2, -0.25, 0]} material={SAND} receiveShadow>
        <boxGeometry args={[I45.island.x1 - I45.island.x0, 0.5, I45.island.z1 - I45.island.z0]} />
      </mesh>
      <mesh position={[(I45.island.x0 + I45.island.x1) / 2, 0.02, 0]} material={GRASS} receiveShadow>
        <boxGeometry args={[I45.island.x1 - I45.island.x0 - 6, 0.04, I45.island.z1 - I45.island.z0 - 16]} />
      </mesh>

      <mesh position={[(I45.arrival.x0 + I45.arrival.x1) / 2, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} material={ARRIVAL}>
        <ringGeometry args={[8, 12, 40]} />
      </mesh>

      <Vehicle spawn={I45.carSpawn} />
      <I45Traffic />
      <ArrivalWatch />
    </group>
  )
}
