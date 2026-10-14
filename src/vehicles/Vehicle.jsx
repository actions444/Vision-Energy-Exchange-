import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, useRapier, useBeforePhysicsStep } from '@react-three/rapier'
import * as THREE from 'three'
import { input } from '../input/input.js'
import { playerState, cameraState, registerInteractable } from '../state/runtime.js'
import { registerLightAnchor, nightLit, env } from '../state/environment.js'
import { useStore } from '../state/store.js'
import { getMaterials } from '../world/materials.js'
import Avatar from '../player/Avatar.jsx'
import { VEHICLE_TYPES, VEHICLE_SPAWNS, useDriving, vehicleBodies } from './vehicles.js'

// Drivable vehicles: a dynamic Rapier rigid body (the chassis) with a ray-cast vehicle
// controller — four wheels with suspension, tyre friction, engine force, brakes and steering.
// Chassis local axes: forward +x, up +y, right +z.

export default function Vehicles() {
  return VEHICLE_SPAWNS.map((s) => <Vehicle key={s.id} spawn={s} />)
}

const tmpV = new THREE.Vector3()
const tmpQ = new THREE.Quaternion()
const FWD = new THREE.Vector3(1, 0, 0)

function Vehicle({ spawn }) {
  const T = VEHICLE_TYPES[spawn.type]
  const { world, rapier } = useRapier()
  const body = useRef()
  const ctl = useRef(null)
  const wheelRefs = useRef([])
  const steer = useRef(0)
  const driverRef = useRef()
  const tail = useRef()
  const [driving, setDriving] = useState(false)
  const profile = useStore((s) => s.profile)
  const driverState = useMemo(() => ({ position: new THREE.Vector3(), yaw: 0, speed: 0, grounded: true, sit: 1, sitHeight: 0.42, emote: null }), [])
  const prevCam = useRef(null)
  const colHandles = useRef(new Set())

  const L = T.wheelBase / 2, W = T.track / 2, CY = 0.55
  const wheelPos = [[L, -W], [L, W], [-L, -W], [-L, W]]

  // ---- physics: create the controller once the chassis exists ----
  useEffect(() => {
    let vc = null
    let raf = 0
    const make = () => {
      const rb = body.current
      if (!rb) { raf = requestAnimationFrame(make); return }
      vc = world.createVehicleController(rb)
      const s = T.suspension
      wheelPos.forEach(([x, z], i) => {
        vc.addWheel({ x, y: CY, z }, { x: 0, y: -1, z: 0 }, { x: 0, y: 0, z: 1 }, s.rest, T.wheelRadius) // axle × down = forward (+x)
        vc.setWheelSuspensionStiffness(i, s.stiffness)
        vc.setWheelSuspensionCompression(i, s.compression)
        vc.setWheelSuspensionRelaxation(i, s.relaxation)
        vc.setWheelMaxSuspensionTravel(i, s.travel)
        vc.setWheelMaxSuspensionForce(i, s.maxForce)
        vc.setWheelFrictionSlip(i, T.friction)
        vc.setWheelSideFrictionStiffness(i, 1)
      })
      ctl.current = vc
      vehicleBodies.set(spawn.id, { body: rb, controller: vc, door: () => toWorld([0.2, 0, -(W + 0.6)]) })
      for (let i = 0; i < rb.numColliders(); i++) colHandles.current.add(rb.collider(i).handle)
      cameraState.ignore ||= new Set()
      colHandles.current.forEach((h) => cameraState.ignore.add(h))
    }
    make()
    return () => {
      cancelAnimationFrame(raf)
      if (vc) { try { world.removeVehicleController(vc) } catch {} }
      ctl.current = null
      vehicleBodies.delete(spawn.id)
      colHandles.current.forEach((h) => cameraState.ignore?.delete(h))
    }
  }, [world]) // eslint-disable-line react-hooks/exhaustive-deps

  const heading = () => {
    const r = body.current.rotation()
    tmpQ.set(r.x, r.y, r.z, r.w)
    tmpV.copy(FWD).applyQuaternion(tmpQ)
    return Math.atan2(-tmpV.z, tmpV.x)
  }
  const toWorld = (local, out = new THREE.Vector3()) => {
    const r = body.current.rotation(), t = body.current.translation()
    tmpQ.set(r.x, r.y, r.z, r.w)
    return out.set(...local).applyQuaternion(tmpQ).add(tmpV.set(t.x, t.y, t.z))
  }

  // ---- getting in and out ----
  const enter = () => {
    if (useDriving.getState().vehicleId || playerState.seated) return
    const col = world.getCollider(playerState.colliderHandle)
    col?.setEnabled(false)
    prevCam.current = { distance: cameraState.distance, pitch: cameraState.pitch }
    cameraState.distance = 8
    cameraState.pitch = 0.24
    body.current.wakeUp()
    playerState.vehicle = { id: spawn.id, exit }
    playerState.sit = 1
    playerState.sitHeight = 0.42
    useDriving.setState({ vehicleId: spawn.id })
    useStore.setState({ driving: T.name })
    setDriving(true)
  }
  function exit() {
    const v = ctl.current?.currentVehicleSpeed() || 0
    if (Math.abs(v) > 3) { useStore.getState().showToast('Slow down to get out.'); return false }
    // step out on the driver's side, or the other side if something is in the way
    const shape = new rapier.Capsule(0.5, 0.35)
    let spot = null
    for (const side of [-1, 1]) {
      const p = toWorld([0.3, 0.6, side * (W + 1.1)])
      const hit = world.intersectionWithShape(p, { x: 0, y: 0, z: 0, w: 1 }, shape, undefined, undefined, undefined, undefined, (c) => !colHandles.current.has(c.handle) && c.handle !== playerState.colliderHandle)
      if (!hit) { spot = p; break }
    }
    if (!spot) spot = toWorld([-(T.length / 2 + 1.2), 0.6, 0])
    // move the avatar's body out of the car before its collider comes back, so it never shoves the car
    const pc = world.getCollider(playerState.colliderHandle)
    pc?.parent()?.setTranslation({ x: spot.x, y: spot.y - 0.35, z: spot.z }, true)
    pc?.setEnabled(true)
    playerState.vehicle = null
    playerState.sit = 0
    playerState.teleport = [spot.x, spot.y - 0.35, spot.z]
    playerState.yaw = heading() + Math.PI / 2
    if (prevCam.current) Object.assign(cameraState, prevCam.current)
    useDriving.setState({ vehicleId: null, speed: 0 })
    useStore.setState({ driving: null })
    setDriving(false)
    return true
  }

  useEffect(() => registerInteractable('vehicle-' + spawn.id, {
    position: () => (body.current ? toWorld([0.2, 0, -(W + 0.6)]) : new THREE.Vector3(...spawn.position)),
    radius: 2.2,
    label: () => (useDriving.getState().vehicleId ? `${T.name}` : `Drive the ${T.name}`),
    onInteract: () => { if (!useDriving.getState().vehicleId) enter() },
  }), []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- controls → wheel forces, before every physics step ----
  useBeforePhysicsStep((w) => {
    const vc = ctl.current
    if (!vc) return
    const me = useDriving.getState().vehicleId === spawn.id
    const st = useStore.getState()
    const live = me && st.phase === 'playing' && !st.panel
    const speed = vc.currentVehicleSpeed()
    let throttle = live ? input.move.y : 0
    const steerIn = live ? -input.move.x : 0
    let engine = 0, brake = 0
    if (throttle > 0.05) {
      if (speed < -0.8) brake = T.brakeForce * throttle // rolling back: brake first
      else engine = speed < T.maxSpeed ? T.engineForce * throttle * (1 - Math.max(0, speed) / (T.maxSpeed * 1.15)) : 0
    } else if (throttle < -0.05) {
      if (speed > 0.8) brake = T.brakeForce * -throttle
      else engine = speed > -6 ? -T.reverseForce * -throttle : 0
    } else {
      brake = me ? T.brakeForce * 0.18 : T.brakeForce * 0.5 // engine braking / parked
    }
    if (live && input.brake) { brake = T.brakeForce * 1.4; engine = 0 }
    const maxSteer = T.maxSteer * (1 - Math.min(0.65, (Math.abs(speed) / T.maxSpeed) * 0.75))
    steer.current += (steerIn * maxSteer - steer.current) * 0.1
    for (let i = 0; i < 4; i++) {
      vc.setWheelEngineForce(i, engine)
      vc.setWheelBrake(i, brake)
      vc.setWheelSteering(i, i < 2 ? steer.current : 0)
    }
    vc.updateVehicle(1 / 60, undefined, undefined, (c) => c.handle !== playerState.colliderHandle && !c.isSensor())
  })

  // ---- visuals, driver, camera ----
  useFrame((_, dt) => {
    const vc = ctl.current
    const rb = body.current
    if (!vc || !rb) return
    for (let i = 0; i < 4; i++) {
      const g = wheelRefs.current[i]
      if (!g) continue
      const susp = vc.wheelSuspensionLength(i) ?? T.suspension.rest
      g.position.set(wheelPos[i][0], CY - susp, wheelPos[i][1])
      g.rotation.set(0, vc.wheelSteering(i) || 0, 0)
      g.children[0].rotation.z = -(vc.wheelRotation(i) || 0)
    }
    const speed = vc.currentVehicleSpeed()
    if (tail.current) tail.current.emissiveIntensity = (useDriving.getState().vehicleId === spawn.id && (input.brake || (input.move.y < -0.05 && speed > 0.5))) ? 3 : 0.4 + 1.2 * envNight()
    if (useDriving.getState().vehicleId !== spawn.id) return
    // the avatar rides in the driver's seat; the camera follows the car
    const seat = toWorld(T.driverSeat)
    playerState.position.set(seat.x, seat.y - 0.42, seat.z)
    playerState.yaw = heading() + Math.PI / 2
    playerState.speed = 0
    const h = heading()
    let d = (h - Math.PI / 2) - cameraState.yaw
    d = Math.atan2(Math.sin(d), Math.cos(d))
    cameraState.yaw += d * (1 - Math.exp(-(Math.abs(speed) > 1 ? 2.2 : 0.4) * dt))
    useDriving.setState({ speed: Math.abs(speed), gear: speed < -0.3 ? 'R' : 'D' })
  })

  // headlights at night (one pooled light that rides with the car)
  useEffect(() => {
    const a = { position: new THREE.Vector3(), color: '#fff1d6', intensity: 26, distance: 22, night: true, range: 60, follow: undefined }
    const off = registerLightAnchor(a)
    let raf
    const loop = () => { if (body.current) a.position.copy(toWorld([T.length / 2 + 2.5, 0.8, 0])); raf = requestAnimationFrame(loop) }
    loop()
    return () => { off(); cancelAnimationFrame(raf) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <RigidBody ref={body} type="dynamic" colliders={false} position={spawn.position} rotation={[0, spawn.heading, 0]} linearDamping={0.05} angularDamping={0.8} ccd canSleep={false} userData={{ vehicle: spawn.id }}>
      {/* heavy floor pan keeps the centre of mass low so the SUV doesn't roll in turns */}
      <CuboidCollider args={[1.9, 0.08, 0.8]} position={[0, 0.42, 0]} density={1400} friction={0.4} />
      <CuboidCollider args={[T.length / 2, 0.42, T.width / 2 - 0.04]} position={[0, 0.92, 0]} density={70} friction={0.4} />
      <CuboidCollider args={[1.5, 0.36, T.width / 2 - 0.12]} position={[-0.35, 1.65, 0]} density={40} friction={0.4} />
      <SuvBody T={T} paint={spawn.paint} accent={spawn.accent} tailRef={tail} />
      {wheelPos.map(([x, z], i) => (
        <group key={i} ref={(g) => (wheelRefs.current[i] = g)} position={[x, CY - T.suspension.rest, z]}>
          <Wheel T={T} side={z < 0 ? -1 : 1} />
        </group>
      ))}
      {driving && (
        <group ref={driverRef} position={[T.driverSeat[0], T.driverSeat[1] - 0.42, T.driverSeat[2]]} rotation={[0, Math.PI / 2, 0]}>
          <Avatar state={driverState} accent={profile.accent} skin={profile.skin} />
        </group>
      )}
    </RigidBody>
  )
}

const envNight = () => env.night || 0

function Wheel({ T, side }) {
  const m = getMaterials()
  const tire = m.shared('tire', () => new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.9 }))
  const rim = m.shared('rimChrome', () => new THREE.MeshStandardMaterial({ color: '#c9ccd2', roughness: 0.2, metalness: 1 }))
  const r = T.wheelRadius, w = T.wheelWidth
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={tire} castShadow><cylinderGeometry args={[r, r, w, 28]} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, side * (w / 2 + 0.002)]} material={rim}><cylinderGeometry args={[r * 0.68, r * 0.68, 0.02, 24]} /></mesh>
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <mesh key={k} position={[0, 0, side * (w / 2 + 0.012)]} rotation={[0, 0, (k * Math.PI) / 3]} material={rim}><boxGeometry args={[r * 1.2, 0.05, 0.02]} /></mesh>
      ))}
    </group>
  )
}

/** Full-size luxury SUV body: boxy upright shape, tall chrome grille, vertical light bars. */
function SuvBody({ T, paint, accent, tailRef }) {
  const m = getMaterials()
  const mats = useMemo(() => {
    const body = new THREE.MeshPhysicalMaterial({ color: paint, roughness: 0.22, metalness: 0.75, clearcoat: 1, clearcoatRoughness: 0.08 })
    const trim = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.3, metalness: 1 })
    const glass = new THREE.MeshPhysicalMaterial({ color: '#0d1116', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.55 })
    const head = nightLit(new THREE.MeshStandardMaterial({ color: '#e9eef5', emissive: '#fff6e0', roughness: 0.1 }), 3, 0.25)
    const tail = new THREE.MeshStandardMaterial({ color: '#4a0608', emissive: '#ff1a1a', emissiveIntensity: 0.4, roughness: 0.3 })
    const plastic = new THREE.MeshStandardMaterial({ color: '#16171a', roughness: 0.8 })
    const interior = new THREE.MeshStandardMaterial({ color: '#2a2220', roughness: 0.7 })
    return { body, trim, glass, head, tail, plastic, interior }
  }, [paint, accent])
  useEffect(() => { tailRef.current = mats.tail }, [mats, tailRef])
  const Lh = T.length / 2, Wh = T.width / 2
  return (
    <group userData={{ noBatch: true }}>
      {/* lower body + hood + cabin */}
      <mesh position={[0, 0.92, 0]} material={mats.body} castShadow receiveShadow><boxGeometry args={[T.length, 0.78, T.width]} /></mesh>
      <mesh position={[Lh - 0.85, 1.36, 0]} material={mats.body} castShadow><boxGeometry args={[1.7, 0.12, T.width - 0.06]} /></mesh>
      <mesh position={[-0.35, 1.68, 0]} material={mats.body} castShadow><boxGeometry args={[3.0, 0.62, T.width - 0.16]} /></mesh>
      <mesh position={[-0.35, 2.0, 0]} material={mats.plastic}><boxGeometry args={[2.9, 0.04, T.width - 0.3]} /></mesh>
      {/* glass: windscreen, side windows, rear */}
      <mesh position={[1.17, 1.66, 0]} rotation={[0, 0, 0.42]} material={mats.glass}><boxGeometry args={[0.04, 0.66, T.width - 0.26]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[-0.35, 1.7, s * (Wh - 0.075)]} material={mats.glass}><boxGeometry args={[2.8, 0.5, 0.02]} /></mesh>)}
      <mesh position={[-1.86, 1.7, 0]} material={mats.glass}><boxGeometry args={[0.03, 0.5, T.width - 0.3]} /></mesh>
      {/* pillars */}
      {[0.9, -0.3, -1.55].flatMap((x) => [-1, 1].map((s) => <mesh key={x + ':' + s} position={[x, 1.7, s * (Wh - 0.07)]} material={mats.plastic}><boxGeometry args={[0.1, 0.62, 0.04]} /></mesh>))}
      {/* grille, headlights, tail lights, trim */}
      <mesh position={[Lh + 0.005, 1.0, 0]} material={mats.trim}><boxGeometry args={[0.02, 0.5, 1.1]} /></mesh>
      {[-0.1, 0, 0.1, 0.2].map((y) => <mesh key={y} position={[Lh + 0.012, 0.92 + y, 0]} material={mats.plastic}><boxGeometry args={[0.01, 0.03, 1.04]} /></mesh>)}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[Lh + 0.01, 1.1, s * (Wh - 0.28)]} material={mats.head}><boxGeometry args={[0.02, 0.12, 0.4]} /></mesh>
          <mesh position={[Lh + 0.01, 0.85, s * (Wh - 0.12)]} material={mats.head}><boxGeometry args={[0.02, 0.42, 0.06]} /></mesh>
          <mesh position={[-Lh - 0.01, 1.2, s * (Wh - 0.1)]} material={mats.tail}><boxGeometry args={[0.02, 0.62, 0.1]} /></mesh>
          {/* mirrors, running boards, door handles */}
          <mesh position={[0.95, 1.45, s * (Wh + 0.1)]} material={mats.body}><boxGeometry args={[0.18, 0.16, 0.2]} /></mesh>
          <mesh position={[0, 0.48, s * (Wh + 0.08)]} material={mats.plastic}><boxGeometry args={[2.8, 0.05, 0.2]} /></mesh>
          {[0.45, -0.75].map((x) => <mesh key={x} position={[x, 1.28, s * (Wh + 0.01)]} material={mats.trim}><boxGeometry args={[0.22, 0.03, 0.02]} /></mesh>)}
        </group>
      ))}
      <mesh position={[0, 0.6, 0]} material={mats.trim}><boxGeometry args={[T.length + 0.02, 0.03, T.width + 0.02]} /></mesh>
      {/* bumpers and wheel arches */}
      <mesh position={[Lh - 0.05, 0.62, 0]} material={mats.plastic}><boxGeometry args={[0.2, 0.2, T.width + 0.02]} /></mesh>
      <mesh position={[-Lh + 0.05, 0.62, 0]} material={mats.plastic}><boxGeometry args={[0.2, 0.2, T.width + 0.02]} /></mesh>
      {/* seats and dash visible through the glass */}
      <mesh position={[0.75, 1.32, 0]} material={mats.interior}><boxGeometry args={[0.4, 0.24, T.width - 0.3]} /></mesh>
      {[[0.0, -0.45], [0.0, 0.45], [-1.1, 0]].map(([x, z], i) => (
        <group key={i}>
          <mesh position={[x, 0.9, z]} material={mats.interior}><boxGeometry args={[0.55, 0.12, i === 2 ? 1.5 : 0.55]} /></mesh>
          <mesh position={[x - 0.3, 1.22, z]} rotation={[0, 0, -0.18]} material={mats.interior}><boxGeometry args={[0.1, 0.6, i === 2 ? 1.5 : 0.55]} /></mesh>
        </group>
      ))}
    </group>
  )
}
