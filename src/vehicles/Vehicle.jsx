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
import { VEHICLE_TYPES, VEHICLE_SPAWNS, useDriving, vehicleBodies, vehicleActions, ROAD_LINES, wheelLayout } from './vehicles.js'
import { JetSkiBody, OpenGBody, EvSuvBody, CrossoverBody, LimoBody, EvBody, SlingBody, CruiserBody, SportBikeBody, BikeFront, useBodyMats } from './Bodies.jsx'
import { priceOf } from '../config/vehicleShop.js'
import { useJobs } from '../state/jobs.js'

// Drivable vehicles: a dynamic Rapier rigid body (the chassis) with a ray-cast vehicle
// controller — four wheels with suspension, tyre friction, engine force, brakes and steering.
// Chassis local axes: forward +x, up +y, right +z.

export default function Vehicles() {
  return VEHICLE_SPAWNS.map((s) => <Vehicle key={s.id} spawn={s} />)
}

/** How upright a body is: 1 = wheels down, 0 = on its side, -1 = on its roof. */
function upDot(rb) { const r = rb.rotation(); return 1 - 2 * (r.x * r.x + r.z * r.z) }
const quatY = (h) => ({ x: 0, y: Math.sin(h / 2), z: 0, w: Math.cos(h / 2) })

/**
 * Stability assist: a torque that rights the body when it rolls or pitches (like real
 * stability control plus a low centre of gravity), so curbs, planters and crashes don't tip
 * the car over. Yaw is untouched, so steering feels the same.
 */
function stabilise(rb, dt, T) {
  if (!rb) return
  const r = rb.rotation()
  const ux = 2 * (r.x * r.y - r.w * r.z), uz = 2 * (r.y * r.z + r.w * r.x)
  const av = rb.angvel()
  const k = T?.stab?.k ?? 9000, c = T?.stab?.c ?? 2500
  rb.applyTorqueImpulse({ x: (-uz * k - av.x * c) * dt, y: 0, z: (ux * k - av.z * c) * dt }, true)
}

const tmpV = new THREE.Vector3()
const tmpQ = new THREE.Quaternion()
const FWD = new THREE.Vector3(1, 0, 0)

function Vehicle({ spawn }) {
  const T = VEHICLE_TYPES[spawn.type]
  const { world, rapier } = useRapier()
  if (typeof window !== 'undefined') { window.__vswWorld = world; window.__vswRapier = rapier }
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

  const W = T.track / 2, CY = T.cy ?? 0.55
  const layout = useMemo(() => wheelLayout(T), [T])
  const wheelPos = layout // [x, z, steered]
  const nW = layout.length
  const leanRef = useRef()
  const leanVal = useRef(0)
  const groundLocal = CY - T.suspension.rest - T.wheelRadius // height of the ground under the chassis origin

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
      // mass set directly with a low centre of mass (colliders carry no mass): stable in turns
      rb.setAdditionalMassProperties(T.mass, { x: 0, y: T.com, z: 0 }, T.inertia || { x: 900, y: 5000, z: 4700 }, { w: 1, x: 0, y: 0, z: 0 }, true)
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
  const price = priceOf(spawn.id) // 0 for the free starter fleet
  const enter = () => {
    if (useDriving.getState().vehicleId || playerState.seated) return
    if (price && !useJobs.getState().buyVehicle(spawn.id, price, T.name)) return // toast already shown
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
    label: () => {
      if (useDriving.getState().vehicleId) return T.name
      if (price && !useJobs.getState().vehicles.includes(spawn.id)) return `Buy the ${T.name} · ${price} cr`
      return `Drive the ${T.name}`
    },
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
    for (let i = 0; i < nW; i++) {
      vc.setWheelEngineForce(i, engine)
      vc.setWheelBrake(i, brake)
      vc.setWheelSteering(i, wheelPos[i][2] ? steer.current : 0)
    }
    vc.updateVehicle(1 / 60, undefined, undefined, (c) => c.handle !== playerState.colliderHandle && !c.isSensor())
    stabilise(body.current, 1 / 60, T)
    watchdog(1 / 60)
  })

  // ---- staying upright, recovery ----
  const overSince = useRef(0)
  function watchdog(dt) {
    const rb = body.current
    if (!rb) return
    const t = rb.translation()
    // fell out of the world, or left the map: put it back on the nearest road
    if (t.y < -6 || t.x > 340 || t.x < -127 || Math.abs(t.z) > 127) { reset(); return }
    const up = upDot(rb)
    if (up < 0.35 && Math.hypot(rb.linvel().x, rb.linvel().z) < 2) {
      overSince.current += dt
      if (overSince.current > 3) { overSince.current = 0; flip(true) } // automatic recovery after 3 s on its side/roof
    } else overSince.current = 0
  }
  const carShape = useMemo(() => new rapier.Cuboid(T.length / 2, 0.8, T.width / 2), [rapier]) // eslint-disable-line react-hooks/exhaustive-deps
  const clearAt = (x, y, z, h) => !world.intersectionWithShape({ x, y: y + 0.95, z }, quatY(h), carShape, undefined, undefined, undefined, undefined, (c) => !colHandles.current.has(c.handle) && c.handle !== playerState.colliderHandle && !c.isSensor())
  /** Upright the car where it is (or the nearest clear spot around it), facing the way it was facing. */
  function flip(auto = false) {
    const rb = body.current
    if (!rb) return false
    const t = rb.translation()
    const h = heading()
    const ground = groundY(t.x, t.z, t.y + 2)
    for (const r of [0, 2.5, 4, 6, 9]) {
      for (let k = 0; k < (r ? 8 : 1); k++) {
        const a = (k / 8) * Math.PI * 2
        const x = t.x + Math.cos(a) * r, z = t.z + Math.sin(a) * r
        const gy = r ? groundY(x, z, t.y + 2) : ground
        if (gy === null || !clearAt(x, gy, z, h)) continue
        place(x, gy, z, h)
        useStore.getState().showToast(auto ? `${T.name} was on its side, so it was turned upright.` : `${T.name} is upright again.`)
        return true
      }
    }
    return reset()
  }
  /** Put the car on the nearest clear spot on a road. */
  function reset() {
    const rb = body.current
    if (!rb) return false
    const t = rb.translation()
    const cands = []
    for (const [x0, z0, x1, z1, hd] of ROAD_LINES) {
      const len = Math.hypot(x1 - x0, z1 - z0)
      for (let d = 0; d <= len; d += 4) cands.push([x0 + ((x1 - x0) * d) / len, z0 + ((z1 - z0) * d) / len, hd])
    }
    cands.sort((a, b) => Math.hypot(a[0] - t.x, a[1] - t.z) - Math.hypot(b[0] - t.x, b[1] - t.z))
    for (const [x, z, hd] of cands.slice(0, 60)) {
      const gy = groundY(x, z, 5)
      if (gy === null || !clearAt(x, gy, z, hd)) continue
      place(x, gy, z, hd)
      useStore.getState().showToast(`${T.name} was moved to the nearest clear spot on the road.`)
      return true
    }
    const s = spawn.position
    place(s[0], 0.15, s[2], spawn.heading)
    return true
  }
  function place(x, y, z, h) {
    const rb = body.current
    rb.setTranslation({ x, y: y + 0.6, z }, true)
    rb.setRotation(quatY(h), true)
    rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
    rb.setAngvel({ x: 0, y: 0, z: 0 }, true)
    steer.current = 0
  }
  function groundY(x, z, fromY) {
    const hit = world.castRay(new rapier.Ray({ x, y: fromY, z }, { x: 0, y: -1, z: 0 }), 40, true, undefined, undefined, undefined, undefined, (c) => !colHandles.current.has(c.handle) && c.handle !== playerState.colliderHandle && !c.isSensor())
    return hit ? fromY - hit.timeOfImpact : null
  }
  useEffect(() => {
    vehicleActions.set(spawn.id, { flip: () => flip(false), reset })
    return () => vehicleActions.delete(spawn.id)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- visuals, driver, camera ----
  useFrame((_, dt) => {
    const vc = ctl.current
    const rb = body.current
    if (!vc || !rb) return
    for (let i = 0; i < nW; i++) {
      const g = wheelRefs.current[i]
      if (!g) continue
      const susp = vc.wheelSuspensionLength(i) ?? T.suspension.rest
      g.position.set(wheelPos[i][0], CY - susp, wheelPos[i][1])
      g.rotation.set(0, vc.wheelSteering(i) || 0, 0)
      g.children[0].rotation.z = -(vc.wheelRotation(i) || 0)
    }
    const speed = vc.currentVehicleSpeed()
    if (T.lean && leanRef.current) {
      // lean into the turn (pivoting at the ground): left steer (+) leans left (-x rotation)
      const want = -(steer.current / T.maxSteer) * T.lean * Math.min(1, Math.abs(speed) / 9)
      leanVal.current += (want - leanVal.current) * Math.min(1, dt * 6)
      const a = leanVal.current
      leanRef.current.rotation.x = a
      leanRef.current.position.set(0, groundLocal * (1 - Math.cos(a)), -groundLocal * Math.sin(a))
    }
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
      {/* massless colliders: mass and a low centre of mass are set directly (see setAdditionalMassProperties) */}
      {T.colliders.map((c, i) => <CuboidCollider key={i} args={c.half} position={c.at} density={0} friction={0.3} />)}
      <group ref={leanRef}>
        <BodyFor T={T} paint={spawn.paint} accent={spawn.accent} tailRef={tail} />
        {wheelPos.map(([x, z, steered], i) => (
          <group key={i} ref={(g) => (wheelRefs.current[i] = g)} position={[x, CY - T.suspension.rest, z]}>
            {T.hideWheels ? <group /> : <Wheel T={T} side={z < 0 ? -1 : 1} front={!!steered} paint={spawn.paint} accent={spawn.accent} />}
          </group>
        ))}
        {driving && (
          <group ref={driverRef} position={[T.driverSeat[0], T.driverSeat[1] - 0.42, T.driverSeat[2]]} rotation={[0, Math.PI / 2, 0]}>
            <Avatar state={driverState} accent={profile.accent} skin={profile.skin} />
          </group>
        )}
      </group>
    </RigidBody>
  )
}

const envNight = () => env.night || 0

function BodyFor({ T, paint, accent, tailRef }) {
  const props = { T, paint, accent, tailRef }
  switch (T.style) {
    case 'suv': return <SuvBody {...props} />
    case 'jetski': return <JetSkiBody {...props} />
    case 'opengx': return <OpenGBody {...props} />
    case 'evsuv': return <EvSuvBody {...props} />
    case 'crossover': return <CrossoverBody {...props} />
    case 'limo': return <LimoBody {...props} />
    case 'ev': return <EvBody {...props} />
    case 'sling': return <SlingBody {...props} />
    case 'cruiser': return <CruiserBody {...props} />
    case 'sportbike': return <SportBikeBody {...props} />
    default: return <StyledBody {...props} />
  }
}

function BikeFork({ T, paint, accent }) {
  const mats = useBodyMats(paint, accent, null)
  return <BikeFront T={T} sport={T.style === 'sportbike'} mats={mats} />
}

function Wheel({ T, side, front, paint, accent }) {
  const m = getMaterials()
  const tire = m.shared('tire', () => new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.9 }))
  const rim = m.shared('rimChrome', () => new THREE.MeshStandardMaterial({ color: '#c9ccd2', roughness: 0.2, metalness: 1 }))
  const r = T.wheelRadius, w = T.wheelWidth
  const bikeFront = T.layout === 'bike' && front
  return (
    <>
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={tire} castShadow><cylinderGeometry args={[r, r, w, 28]} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, side * (w / 2 + 0.002)]} material={rim}><cylinderGeometry args={[r * 0.68, r * 0.68, 0.02, 24]} /></mesh>
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <mesh key={k} position={[0, 0, side * (w / 2 + 0.012)]} rotation={[0, 0, (k * Math.PI) / 3]} material={rim}><boxGeometry args={[r * 1.2, 0.05, 0.02]} /></mesh>
      ))}
    </group>
    {bikeFront && <BikeFork T={T} paint={paint} accent={accent} />}
    </>
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
  const cl = T.cabLen ?? 3.0 // cabin length
  const floating = T.variant === 'floating'
  return (
    <group userData={{ noBatch: true }}>
      {/* lower body + hood + cabin */}
      <mesh position={[0, 0.92, 0]} material={mats.body} castShadow receiveShadow><boxGeometry args={[T.length, 0.78, T.width]} /></mesh>
      <mesh position={[Lh - 0.85, 1.36, 0]} material={mats.body} castShadow><boxGeometry args={[1.7, 0.12, T.width - 0.06]} /></mesh>
      <mesh position={[-0.35, 1.68, 0]} material={floating ? mats.plastic : mats.body} castShadow><boxGeometry args={[cl, 0.62, T.width - 0.16]} /></mesh>
      {floating
        ? <mesh position={[-0.35, 2.02, 0]} material={mats.body} castShadow><boxGeometry args={[cl + 0.1, 0.07, T.width - 0.06]} /></mesh>
        : <mesh position={[-0.35, 2.0, 0]} material={mats.plastic}><boxGeometry args={[cl - 0.1, 0.04, T.width - 0.3]} /></mesh>}
      {floating && [-1, 1].map((s) => <mesh key={'fl' + s} position={[Lh - 0.9, 1.28, s * 0.5]} material={mats.trim}><boxGeometry args={[1.2, 0.02, 0.03]} /></mesh>)}
      {/* glass: windscreen, side windows, rear */}
      <mesh position={[1.17, 1.66, 0]} rotation={[0, 0, 0.42]} material={mats.glass}><boxGeometry args={[0.04, 0.66, T.width - 0.26]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[-0.35, 1.7, s * (Wh - 0.075)]} material={mats.glass}><boxGeometry args={[cl - 0.2, 0.5, 0.02]} /></mesh>)}
      <mesh position={[-0.35 - cl / 2 - 0.01, 1.7, 0]} material={mats.glass}><boxGeometry args={[0.03, 0.5, T.width - 0.3]} /></mesh>
      {/* pillars */}
      {[0.9, -0.3, -0.35 - cl / 2 + 0.2].flatMap((x) => [-1, 1].map((s) => <mesh key={x + ':' + s} position={[x, 1.7, s * (Wh - 0.07)]} material={mats.plastic}><boxGeometry args={[0.1, 0.62, 0.04]} /></mesh>))}
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

const box = (key, mat, pos, size, rot) => <mesh key={key} position={pos} rotation={rot} material={mat} castShadow><boxGeometry args={size} /></mesh>

/** Original body designs for the sedan, the electric pickup and the off-roader. */
function StyledBody({ T, paint, accent, tailRef }) {
  const m = useBodyMats(paint, accent, tailRef)
  const Lh = T.length / 2, Wh = T.width / 2
  const parts = []
  const seats = (xs, y) => xs.forEach((x, i) => {
    parts.push(box('sb' + i, m.interior, [x, y, 0], [0.5, 0.12, T.width - 0.5]))
    parts.push(box('sr' + i, m.interior, [x - 0.28, y + 0.3, 0], [0.1, 0.55, T.width - 0.5], [0, 0, -0.18]))
  })
  if (T.style === 'sedan') {
    // long, low saloon: sloping windscreen and fastback, full-width light bars
    parts.push(box('lo', m.body, [0, 0.8, 0], [T.length, 0.62, T.width]))
    parts.push(box('hood', m.body, [Lh - 0.85, 1.12, 0], [1.7, 0.06, T.width - 0.08], [0, 0, -0.05]))
    parts.push(box('cab', m.body, [-0.35, 1.36, 0], [2.0, 0.46, T.width - 0.2]))
    parts.push(box('roof', m.body, [-0.4, 1.6, 0], [1.6, 0.05, T.width - 0.28]))
    parts.push(box('ws', m.glass, [0.95, 1.36, 0], [0.04, 0.6, T.width - 0.3], [0, 0, 0.95]))
    parts.push(box('rw', m.glass, [-1.6, 1.34, 0], [0.04, 0.62, T.width - 0.32], [0, 0, -1.0]))
    ;[-1, 1].forEach((k) => {
      parts.push(box('sw' + k, m.glass, [-0.35, 1.4, k * (Wh - 0.1)], [1.9, 0.34, 0.02]))
      parts.push(box('hl' + k, m.head, [Lh + 0.01, 0.98, k * (Wh - 0.32)], [0.02, 0.08, 0.5]))
      parts.push(box('mr' + k, m.body, [0.75, 1.2, k * (Wh + 0.08)], [0.16, 0.12, 0.16]))
      parts.push(box('dh' + k, m.chrome, [-0.1, 1.08, k * (Wh + 0.005)], [0.22, 0.025, 0.02]))
    })
    parts.push(box('gr', m.chrome, [Lh + 0.008, 0.78, 0], [0.02, 0.26, 1.0]))
    parts.push(box('drl', m.drl, [Lh + 0.012, 1.05, 0], [0.01, 0.025, T.width - 0.3]))
    parts.push(box('tl', m.tail, [-Lh - 0.01, 1.0, 0], [0.02, 0.07, T.width - 0.2]))
    parts.push(box('belt', m.trim, [0, 1.13, 0], [T.length - 0.4, 0.02, T.width + 0.01]))
    seats([-0.15, -1.2], 0.72)
  } else if (T.style === 'pickup') {
    // electric pickup: smooth closed nose with a light bar, crew cab, open bed with tonneau rails
    parts.push(box('lo', m.body, [0, 0.94, 0], [T.length, 0.84, T.width]))
    parts.push(box('cab', m.body, [0.25, 1.7, 0], [2.3, 0.68, T.width - 0.14]))
    parts.push(box('roof', m.plastic, [0.2, 2.05, 0], [2.1, 0.03, T.width - 0.3]))
    parts.push(box('ws', m.glass, [1.42, 1.7, 0], [0.04, 0.72, T.width - 0.26], [0, 0, 0.5]))
    parts.push(box('bw', m.glass, [-0.9, 1.74, 0], [0.03, 0.42, T.width - 0.4]))
    ;[-1, 1].forEach((k) => {
      parts.push(box('sw' + k, m.glass, [0.2, 1.76, k * (Wh - 0.065)], [2.0, 0.44, 0.02]))
      parts.push(box('bed' + k, m.body, [-1.85, 1.55, k * (Wh - 0.05)], [2.0, 0.42, 0.1]))
      parts.push(box('rail' + k, m.trim, [-1.85, 1.77, k * (Wh - 0.05)], [2.0, 0.03, 0.12]))
      parts.push(box('mr' + k, m.body, [1.1, 1.55, k * (Wh + 0.1)], [0.18, 0.16, 0.2]))
      parts.push(box('fl' + k, m.plastic, [T.wheelBase / 2, 0.98, k * (Wh + 0.03)], [1.15, 0.12, 0.08]))
      parts.push(box('fr' + k, m.plastic, [-T.wheelBase / 2, 0.98, k * (Wh + 0.03)], [1.15, 0.12, 0.08]))
    })
    parts.push(box('tg', m.body, [-Lh + 0.05, 1.55, 0], [0.1, 0.42, T.width - 0.1]))
    parts.push(box('bf', m.plastic, [-1.85, 1.37, 0], [2.0, 0.02, T.width - 0.2]))
    parts.push(box('bar', m.drl, [Lh + 0.012, 1.3, 0], [0.01, 0.05, T.width - 0.1]))
    parts.push(box('hlL', m.head, [Lh + 0.012, 1.18, -(Wh - 0.25)], [0.01, 0.06, 0.32]))
    parts.push(box('hlR', m.head, [Lh + 0.012, 1.18, Wh - 0.25], [0.01, 0.06, 0.32]))
    parts.push(box('tl', m.tail, [-Lh - 0.01, 1.62, 0], [0.02, 0.05, T.width - 0.1]))
    parts.push(box('bump', m.plastic, [Lh - 0.05, 0.62, 0], [0.2, 0.22, T.width + 0.02]))
    parts.push(box('bumpR', m.plastic, [-Lh + 0.05, 0.62, 0], [0.2, 0.22, T.width + 0.02]))
    seats([0.45, -0.5], 0.96)
  } else {
    // short off-roader: upright glass, flared arches, roof rack, round lamps, rear spare wheel
    parts.push(box('lo', m.body, [0, 0.98, 0], [T.length, 0.84, T.width]))
    parts.push(box('cab', m.body, [-0.25, 1.78, 0], [2.9, 0.78, T.width - 0.12]))
    parts.push(box('ws', m.glass, [1.22, 1.78, 0], [0.04, 0.66, T.width - 0.3], [0, 0, 0.16]))
    if (T.variant === 'retro') {
      parts.push(box('roofc', m.trim, [-0.25, 2.2, 0], [2.7, 0.07, T.width - 0.08])) // contrasting roof panel
      parts.push(box('sidec', m.trim, [Lh - 0.9, 1.4, 0], [0.9, 0.02, T.width - 0.1]))
    } else {
      parts.push(box('rack', m.plastic, [-0.3, 2.22, 0], [2.6, 0.06, T.width - 0.2]))
      ;[-0.9, 0, 0.9].forEach((x) => parts.push(box('rb' + x, m.plastic, [x - 0.3, 2.28, 0], [0.05, 0.06, T.width - 0.15])))
    }
    ;[-1, 1].forEach((k) => {
      parts.push(box('sw' + k, m.glass, [-0.3, 1.86, k * (Wh - 0.055)], [2.6, 0.5, 0.02]))
      ;[T.wheelBase / 2, -T.wheelBase / 2].forEach((x) => parts.push(box('fl' + k + x, m.plastic, [x, 1.12, k * (Wh + 0.07)], [1.25, 0.16, 0.16])))
      parts.push(<mesh key={'hl' + k} position={[Lh + 0.01, 1.2, k * (Wh - 0.32)]} rotation={[0, 0, Math.PI / 2]} material={m.head}><cylinderGeometry args={[0.13, 0.13, 0.04, 18]} /></mesh>)
      parts.push(box('mr' + k, m.plastic, [1.0, 1.55, k * (Wh + 0.1)], [0.16, 0.16, 0.18]))
      parts.push(box('tl' + k, m.tail, [-Lh - 0.01, 1.3, k * (Wh - 0.12)], [0.02, 0.3, 0.12]))
    })
    ;[-0.36, -0.18, 0, 0.18, 0.36].forEach((z) => parts.push(box('gs' + z, m.plastic, [Lh + 0.012, 1.15, z], [0.01, 0.34, 0.08])))
    parts.push(box('gf', m.trim, [Lh + 0.008, 1.15, 0], [0.01, 0.4, 0.9]))
    parts.push(box('bump', m.plastic, [Lh - 0.02, 0.66, 0], [0.26, 0.24, T.width + 0.06]))
    parts.push(box('bumpR', m.plastic, [-Lh + 0.02, 0.66, 0], [0.26, 0.24, T.width + 0.06]))
    parts.push(<mesh key="spare" position={[-Lh - 0.16, 1.45, 0]} rotation={[0, 0, Math.PI / 2]} material={m.plastic}><cylinderGeometry args={[0.42, 0.42, 0.28, 22]} /></mesh>)
    parts.push(<mesh key="spareHub" position={[-Lh - 0.31, 1.45, 0]} rotation={[0, 0, Math.PI / 2]} material={m.trim}><cylinderGeometry args={[0.18, 0.18, 0.02, 18]} /></mesh>)
    seats([0.05, -0.95], 1.0)
  }
  return <group userData={{ noBatch: true }}>{parts}</group>
}
