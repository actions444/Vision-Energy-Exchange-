import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, useRapier } from '@react-three/rapier'
import * as THREE from 'three'
import { input } from '../input/input.js'
import { playerState, cameraState, registerInteractable } from '../state/runtime.js'
import { registerLightAnchor, nightLit } from '../state/environment.js'
import { useStore } from '../state/store.js'
import { audioCore, hasAudio } from '../audio/core.js'
import Avatar from '../player/Avatar.jsx'
import { JET_SPAWNS, JET_TYPES, useDriving, vehicleBodies, vehicleActions } from './vehicles.js'
import { priceOf } from '../config/vehicleShop.js'
import { useJobs } from '../state/jobs.js'

// Player-flyable VTOL jets (vertical take-off and landing) on the Skyport pads.
//   W / S  more / less thrust (it holds its speed when you let go)    A / D  turn (and bank)
//   Space  climb          Shift  descend          E  get out (only on the ground, stopped)
// Arcade flight: speed and altitude are integrated directly, with ray casts for the ground, rooftops and
// buildings, so it is easy to fly and hard to get stuck. F levels the jet, R returns it to its pad.

const FLOOR_AT = 0.04
const AREA = 560 // flight area half-size (metres)
const CEILING = 280
const tmp = new THREE.Vector3()

export default function Jets() {
  return JET_SPAWNS.map((s) => <Jet key={s.id} spawn={s} />)
}

function wingGeo(pts, thick) {
  // pts: [x, spanwise] pairs of one wing (spanwise >= 0); shape y = -span so rotateX(-90°) puts it on +z
  const sh = new THREE.Shape(pts.map(([x, s]) => new THREE.Vector2(x, -s)))
  const g = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: false })
  g.rotateX(-Math.PI / 2)
  g.translate(0, -thick / 2, 0)
  return g
}
function finGeo(pts, thick) {
  const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)))
  const g = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: false })
  g.translate(0, 0, -thick / 2)
  return g
}

function Jet({ spawn }) {
  const T = JET_TYPES[spawn.type]
  const { world, rapier } = useRapier()
  const body = useRef()
  const root = useRef() // visual root (rotated by heading, pitch, bank)
  const gear = useRef()
  const glowRef = useRef()
  const fanGlow = useRef()
  const strobe = useRef()
  const driverRef = useRef()
  const [piloted, setPiloted] = useState(false)
  const profile = useStore((s) => s.profile)
  const driverState = useMemo(() => ({ position: new THREE.Vector3(), yaw: 0, speed: 0, grounded: true, sit: 1, sitHeight: 0.42, emote: null }), [])
  const prevCam = useRef(null)
  const handles = useRef(new Set())
  const f = useRef({
    pos: new THREE.Vector3(...spawn.position), h: spawn.heading, speed: 0, target: 0, vs: 0,
    pitch: 0, bank: 0, thrust: 0, grounded: true, lastToast: 0, piloted: false, altitude: 0, bump: 0,
  })

  // ---- materials ----
  const mats = useMemo(() => ({
    body: new THREE.MeshPhysicalMaterial({ color: spawn.paint, roughness: 0.28, metalness: 0.6, clearcoat: 1, clearcoatRoughness: 0.1 }),
    accent: new THREE.MeshStandardMaterial({ color: spawn.accent, roughness: 0.35, metalness: 0.8 }),
    dark: new THREE.MeshStandardMaterial({ color: '#1c1e22', roughness: 0.55, metalness: 0.6 }),
    metal: new THREE.MeshStandardMaterial({ color: '#b9bec6', roughness: 0.3, metalness: 1 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#0b1522', roughness: 0.04, metalness: 0.3, transparent: true, opacity: 0.6, clearcoat: 1 }),
    tire: new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.9 }),
    glow: new THREE.MeshBasicMaterial({ color: '#ffb066', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }),
    fan: new THREE.MeshBasicMaterial({ color: '#8fd8ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }),
    red: new THREE.MeshBasicMaterial({ color: '#ff2a2a', toneMapped: false }),
    green: new THREE.MeshBasicMaterial({ color: '#20ff60', toneMapped: false }),
    white: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
    window: nightLit(new THREE.MeshStandardMaterial({ color: '#1a2230', roughness: 0.2, emissive: '#ffd9a0' }), 1.2, 0),
  }), [spawn.paint, spawn.accent])
  const geos = useMemo(() => {
    if (T.style === 'stormer') {
      return {
        wing: wingGeo([[1.8, 0.4], [-1.7, 4.5], [-2.7, 4.5], [-2.9, 0.4]], 0.12),
        stab: wingGeo([[0.6, 0.4], [-0.8, 2.3], [-1.6, 2.3], [-1.6, 0.4]], 0.08),
        fin: finGeo([[0.9, 0], [-0.9, 0], [-1.5, 1.7], [-0.4, 1.7]], 0.09),
      }
    }
    return {
      wing: wingGeo([[1.6, 0.9], [-1.4, 5.8], [-2.6, 5.8], [-2.6, 0.9]], 0.2),
      stab: wingGeo([[0.8, 0.0], [-0.6, 2.6], [-1.6, 2.6], [-1.6, 0.0]], 0.1),
      fin: finGeo([[1.4, 0], [-1.6, 0], [-2.0, 2.6], [-0.2, 2.6]], 0.16),
    }
  }, [T.style])

  // ---- physics body (kinematic: moved by the flight model; solid when parked) ----
  useEffect(() => {
    let raf = 0
    const reg = () => {
      const rb = body.current
      if (!rb) { raf = requestAnimationFrame(reg); return }
      for (let i = 0; i < rb.numColliders(); i++) handles.current.add(rb.collider(i).handle)
      cameraState.ignore ||= new Set()
      handles.current.forEach((h) => cameraState.ignore.add(h))
      vehicleBodies.set(spawn.id, { body: rb, controller: null, door: () => doorPos(), jet: f.current })
    }
    reg()
    return () => { cancelAnimationFrame(raf); vehicleBodies.delete(spawn.id); handles.current.forEach((h) => cameraState.ignore?.delete(h)) }
  }, [world]) // eslint-disable-line react-hooks/exhaustive-deps

  const doorPos = () => {
    const s = f.current
    // beside the cockpit, on the right-hand side, just outside the wing root
    const r = new THREE.Vector3(Math.sin(s.h), 0, Math.cos(s.h))
    const fw = new THREE.Vector3(Math.cos(s.h), 0, -Math.sin(s.h))
    return new THREE.Vector3(s.pos.x, s.pos.y + 1, s.pos.z).addScaledVector(r, T.span / 2 - 1.0).addScaledVector(fw, T.seat[0] * 0.2)
  }

  const groundAt = (x, z, fromY) => {
    const hit = world.castRay(new rapier.Ray({ x, y: fromY, z }, { x: 0, y: -1, z: 0 }), 400, true, undefined, undefined, undefined, undefined,
      (c) => !handles.current.has(c.handle) && c.handle !== playerState.colliderHandle && !c.isSensor())
    return Math.max(0, hit ? fromY - hit.timeOfImpact : 0)
  }
  const rayDist = (o, d, max) => {
    const hit = world.castRay(new rapier.Ray(o, d), max, true, undefined, undefined, undefined, undefined,
      (c) => !handles.current.has(c.handle) && c.handle !== playerState.colliderHandle && !c.isSensor())
    return hit ? hit.timeOfImpact : Infinity
  }

  // ---- engine sound (only while flying it) ----
  const sound = useRef(null)
  const startSound = () => {
    if (sound.current || !hasAudio() || audioCore().ctx.state !== 'running') return
    const { ctx, sum } = audioCore()
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = buf.getChannelData(0)
    let b = 0
    for (let i = 0; i < d.length; i++) { b = 0.97 * b + 0.03 * (Math.random() * 2 - 1); d[i] = b * 3 }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500
    const gain = ctx.createGain(); gain.gain.value = 0
    src.connect(lp); lp.connect(gain); gain.connect(sum)
    src.start()
    sound.current = { ctx, src, lp, gain }
  }
  const stopSound = () => {
    const s = sound.current
    if (!s) return
    try { s.gain.gain.setTargetAtTime(0, s.ctx.currentTime, 0.1); setTimeout(() => { try { s.src.stop(); s.gain.disconnect() } catch { /* stopped */ } }, 500) } catch { /* ignore */ }
    sound.current = null
  }
  useEffect(() => stopSound, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- getting in and out ----
  const price = priceOf(spawn.id)
  const enter = () => {
    if (useDriving.getState().vehicleId || playerState.seated) return
    if (price && !useJobs.getState().buyVehicle(spawn.id, price, T.name)) return // toast already shown
    const col = world.getCollider(playerState.colliderHandle)
    col?.setEnabled(false)
    prevCam.current = { distance: cameraState.distance, pitch: cameraState.pitch }
    cameraState.distance = 17
    cameraState.pitch = 0.2
    playerState.vehicle = { id: spawn.id, exit }
    playerState.sit = 1
    playerState.sitHeight = 0.42
    f.current.piloted = true
    useDriving.setState({ vehicleId: spawn.id })
    useStore.setState({ driving: T.name })
    setPiloted(true)
    startSound()
    useStore.getState().showToast('W/S thrust · A/D turn · Space climb · Shift descend · land, then press E to get out')
  }
  function exit() {
    const s = f.current
    if (!s.grounded || s.speed > 3) { useStore.getState().showToast('Land first: stop, set it down on the ground, then press E.'); return false }
    const spot = doorPos()
    const gy = groundAt(spot.x, spot.z, spot.y + 3)
    const pc = world.getCollider(playerState.colliderHandle)
    pc?.parent()?.setTranslation({ x: spot.x, y: gy + 0.55, z: spot.z }, true)
    pc?.setEnabled(true)
    playerState.vehicle = null
    playerState.sit = 0
    playerState.teleport = [spot.x, gy + 0.2, spot.z]
    playerState.yaw = s.h + Math.PI / 2
    if (prevCam.current) Object.assign(cameraState, prevCam.current)
    s.piloted = false
    s.target = 0
    useDriving.setState({ vehicleId: null, speed: 0, alt: null })
    useStore.setState({ driving: null })
    setPiloted(false)
    stopSound()
    return true
  }
  useEffect(() => registerInteractable('vehicle-' + spawn.id, {
    position: () => doorPos(),
    radius: 4.2,
    label: () => {
      if (useDriving.getState().vehicleId) return T.name
      if (price && !useJobs.getState().vehicles.includes(spawn.id)) return `Buy the ${T.name} · ${price} cr`
      return `Fly the ${T.name}`
    },
    onInteract: () => { if (!useDriving.getState().vehicleId) enter() },
  }), []) // eslint-disable-line react-hooks/exhaustive-deps

  const level = () => { const s = f.current; s.vs = 0; s.bank = 0; s.pitch = 0; useStore.getState().showToast('Leveled out.'); return true }
  const reset = () => {
    const s = f.current
    s.pos.set(...spawn.position); s.h = spawn.heading; s.speed = 0; s.target = 0; s.vs = 0; s.bank = 0; s.pitch = 0; s.grounded = true
    useStore.getState().showToast(`${T.name} is back on its pad.`)
    return true
  }
  useEffect(() => { vehicleActions.set(spawn.id, { flip: level, reset }); return () => vehicleActions.delete(spawn.id) }) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- headlight / landing light ----
  useEffect(() => {
    const a = { position: new THREE.Vector3(), color: '#fff1d6', intensity: 0, distance: 30, night: true, range: 90 }
    const off = registerLightAnchor(a)
    let raf
    const loop = () => { a.position.set(f.current.pos.x, f.current.pos.y + 3, f.current.pos.z); a.intensity = f.current.piloted ? 30 : 0; raf = requestAnimationFrame(loop) }
    loop()
    return () => { off(); cancelAnimationFrame(raf) }
  }, [])

  // ---- flight model, every frame ----
  useFrame(({ clock }, dtRaw) => {
    const s = f.current
    const rb = body.current
    if (!rb || !root.current) return
    const dt = Math.min(dtRaw, 1 / 20)
    const st = useStore.getState()
    const live = s.piloted && st.phase === 'playing' && !st.panel
    const fw = tmp.set(Math.cos(s.h), 0, -Math.sin(s.h))
    const fx = fw.x, fz = fw.z

    if (s.piloted || !s.grounded || s.speed > 0.05) {
      // controls
      const thr = live ? input.move.y : 0
      s.target = THREE.MathUtils.clamp(s.target + thr * T.accel * dt, 0, T.maxSpeed)
      const climb = live ? (input.brake ? 1 : 0) - (input.run ? 1 : 0) : 0 // Space is `brake` (Player clears `jump` while riding)
      const turnIn = live ? input.move.x : 0
      const gy = groundAt(s.pos.x, s.pos.z, s.pos.y + 2)
      const alt = s.pos.y - gy
      s.altitude = alt
      s.grounded = alt <= FLOOR_AT + 0.08
      // speed follows the thrust setting; the ground adds rolling drag
      const k = s.grounded ? 0.6 : 1.1
      s.speed += (s.target - s.speed) * Math.min(1, dt * k)
      if (s.grounded && s.target < 1) s.speed = Math.max(0, s.speed - 6 * dt)
      // vertical speed
      const vsT = climb * T.climb
      s.vs += (vsT - s.vs) * Math.min(1, dt * 2.2)
      if (!climb && !s.grounded && Math.abs(s.vs) < 0.3) s.vs = 0
      if (s.pos.y > CEILING && s.vs > 0) s.vs = 0
      if (s.grounded && s.vs < 0) s.vs = 0
      // turning (slow on the ground, full in the air); heading increases to the left
      const rate = T.turn * (s.grounded ? 0.35 * Math.min(1, s.speed / 6) : 0.4 + 0.6 * Math.min(1, s.speed / 20))
      let dh = -turnIn * rate * dt
      // leaving the flight area: turn back toward the city
      if (Math.abs(s.pos.x) > AREA || Math.abs(s.pos.z) > AREA) {
        const want = Math.atan2(s.pos.z, -s.pos.x)
        let d = want - s.h
        d = Math.atan2(Math.sin(d), Math.cos(d))
        dh = Math.sign(d) * Math.min(Math.abs(d), 1.6 * dt)
        if (s.piloted && performance.now() - s.lastToast > 4000) { s.lastToast = performance.now(); st.showToast('Leaving the flight area. Turning back toward the city.') }
      }
      s.h += dh
      s.bank += ((-turnIn * 0.55 * (s.grounded ? 0 : 1)) - s.bank) * Math.min(1, dt * 3)
      s.pitch += ((s.vs / T.climb) * 0.3 - s.pitch) * Math.min(1, dt * 3)

      // move, with ray checks ahead (nose and both wing tips) and above
      const step = s.speed * dt
      if (step > 0.001) {
        const ahead = step + T.length * 0.55
        const hy = s.pos.y + 1.4
        const rx = Math.sin(s.h), rz = Math.cos(s.h)
        let dMin = Infinity
        for (const off of [0, T.span * 0.45, -T.span * 0.45]) {
          const d = rayDist({ x: s.pos.x + rx * off, y: hy, z: s.pos.z + rz * off }, { x: fx, y: 0, z: fz }, ahead + 0.5)
          dMin = Math.min(dMin, d)
        }
        if (dMin < ahead) {
          s.pos.x -= fx * 0.6; s.pos.z -= fz * 0.6
          s.speed = 0; s.target = 0
          if (s.piloted && performance.now() - s.lastToast > 2500) { s.lastToast = performance.now(); st.showToast('You touched a building and the jet stopped. Climb (Space) or turn away.') }
        } else { s.pos.x += fx * step; s.pos.z += fz * step }
      }
      let ny = s.pos.y + s.vs * dt
      if (s.vs > 0.1) {
        const up = rayDist({ x: s.pos.x, y: s.pos.y + 1.5, z: s.pos.z }, { x: 0, y: 1, z: 0 }, s.vs * dt + 1.2)
        if (up < s.vs * dt + 1.0) { ny = s.pos.y; s.vs = 0 }
      }
      // ground under the new position (rooftops count)
      const g2 = groundAt(s.pos.x, s.pos.z, Math.max(ny, s.pos.y) + 2)
      if (ny <= g2 + FLOOR_AT) { ny = g2 + FLOOR_AT; if (s.vs < 0) s.vs = 0 }
      s.pos.y = ny
      s.thrust = Math.min(1, 0.25 + s.target / T.maxSpeed * 0.75 + (climb > 0 ? 0.3 : 0))
    }

    // pose and physics body
    const root_ = root.current
    root_.rotation.set(s.bank, s.h, s.pitch, 'YZX')
    root_.position.copy(s.pos)
    rb.setNextKinematicTranslation({ x: s.pos.x, y: s.pos.y, z: s.pos.z })
    const q = root_.quaternion
    rb.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
    if (gear.current) gear.current.visible = s.altitude < 10
    if (glowRef.current) { mats.glow.opacity = s.piloted ? 0.35 + s.thrust * 0.5 : 0; glowRef.current.scale.y = 0.6 + s.thrust * 1.6 }
    const hover = s.piloted && (s.speed < 22 && !s.grounded || s.vs > 1)
    mats.fan.opacity += ((hover ? 0.5 : 0) - mats.fan.opacity) * Math.min(1, dt * 5)
    if (strobe.current) strobe.current.visible = (clock.elapsedTime % 1.3) < 0.12

    if (!s.piloted) return
    // the pilot rides along; the camera follows the nose
    tmp.set(s.pos.x, s.pos.y + (T.style === 'stormer' ? 1.3 : 1.6) + T.seat[1] - 0.42, s.pos.z)
    playerState.position.copy(tmp).addScaledVector(new THREE.Vector3(Math.cos(s.h), 0, -Math.sin(s.h)), T.seat[0])
    playerState.yaw = s.h + Math.PI / 2
    playerState.speed = 0
    let d = (s.h - Math.PI / 2) - cameraState.yaw
    d = Math.atan2(Math.sin(d), Math.cos(d))
    cameraState.yaw += d * (1 - Math.exp(-(s.speed > 1 ? 2.4 : 0.5) * dt))
    useDriving.setState({ speed: s.speed, gear: s.grounded ? 'GND' : s.speed < 14 ? 'HVR' : 'FLT', alt: Math.round(s.altitude) })
    const sd = sound.current
    if (sd) { sd.gain.gain.setTargetAtTime(0.18 + s.thrust * 0.5, sd.ctx.currentTime, 0.15); sd.lp.frequency.setTargetAtTime(320 + s.thrust * 1100, sd.ctx.currentTime, 0.15) }
  })

  const stormer = T.style === 'stormer'
  const Y = stormer ? 1.3 : 1.6 // fuselage centre above the belly
  return (
    <>
      <RigidBody ref={body} type="kinematicPosition" colliders={false} position={spawn.position} userData={{ vehicle: spawn.id }}>
        {stormer ? (
          <>
            <CuboidCollider args={[5.8, 0.65, 0.65]} position={[0.2, Y, 0]} />
            <CuboidCollider args={[2.0, 0.1, 4.5]} position={[-1.2, Y - 0.1, 0]} />
          </>
        ) : (
          <>
            <CuboidCollider args={[7.4, 0.95, 0.95]} position={[0.2, Y, 0]} />
            <CuboidCollider args={[2.2, 0.12, 5.8]} position={[-1.2, Y - 0.1, 0]} />
          </>
        )}
      </RigidBody>
      <group ref={root} position={spawn.position} rotation={[0, spawn.heading, 0]} userData={{ noBatch: true }}>
        <group position={[0, Y, 0]}>
          {stormer ? <StormerShape mats={mats} geos={geos} glowRef={glowRef} strobe={strobe} /> : <CruiserShape mats={mats} geos={geos} glowRef={glowRef} strobe={strobe} />}
          {/* vertical-lift glow under the belly */}
          <group ref={fanGlow}>
            {[stormer ? 1.6 : 2.2, stormer ? -2.2 : -2.6].map((x) => (
              <mesh key={x} position={[x, -0.9, 0]} rotation={[Math.PI, 0, 0]} material={mats.fan}><coneGeometry args={[0.9, 2.6, 18, 1, true]} /></mesh>
            ))}
          </group>
          {piloted && (
            <group ref={driverRef} position={[T.seat[0], T.seat[1] - 0.7, T.seat[2]]} rotation={[0, Math.PI / 2, 0]} scale={0.92}>
              <Avatar state={driverState} accent={profile.accent} skin={profile.skin} />
            </group>
          )}
        </group>
        {/* landing gear: three struts with wheels (retracts out of sight in the air) */}
        <group ref={gear}>
          {(stormer ? [[2.6, 0], [-1.6, 0.9], [-1.6, -0.9]] : [[4.0, 0], [-1.8, 1.3], [-1.8, -1.3]]).map(([x, z], i) => (
            <group key={i} position={[x, 0, z]}>
              <mesh position={[0, Y / 2 + 0.1, 0]} material={mats.metal}><cylinderGeometry args={[0.07, 0.07, Y - 0.2, 8]} /></mesh>
              <mesh position={[0, 0.28, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.tire}><cylinderGeometry args={[0.28, 0.28, 0.2, 14]} /></mesh>
            </group>
          ))}
        </group>
      </group>
    </>
  )
}

function Wings({ mats, geos, tail, span = 1 }) {
  return (
    <>
      <mesh geometry={geos.wing} material={mats.body} castShadow />
      <mesh geometry={geos.wing} material={mats.body} scale={[1, 1, -1]} castShadow />
      <mesh geometry={geos.stab} material={mats.body} position={tail} castShadow />
      <mesh geometry={geos.stab} material={mats.body} position={tail} scale={[1, 1, -1]} castShadow />
    </>
  )
}

/** ~13 m single-seat VTOL jet: blended fuselage, swept wings, twin canted tail fins, round nozzle. */
function StormerShape({ mats, geos, glowRef, strobe }) {
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]} material={mats.body} castShadow><cylinderGeometry args={[0.66, 0.7, 7.5, 18]} /></mesh>
      <mesh position={[5.6, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={mats.body} castShadow><coneGeometry args={[0.66, 3.8, 18]} /></mesh>
      <mesh position={[-4.5, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.body} castShadow><cylinderGeometry args={[0.7, 0.55, 1.6, 16]} /></mesh>
      <mesh position={[2.4, 0.55, 0]} scale={[2.2, 0.72, 0.72]} material={mats.glass}><sphereGeometry args={[0.8, 18, 12]} /></mesh>
      <mesh position={[2.6, 0.12, 0]} rotation={[0, 0, 0]} material={mats.dark}><boxGeometry args={[1.5, 0.12, 1.3]} /></mesh>
      <Wings mats={mats} geos={geos} tail={[-3.8, 0.1, 0]} />
      {[-1, 1].map((k) => (
        <group key={k}>
          <mesh geometry={geos.fin} material={mats.body} position={[-3.9, 0.45, k * 0.8]} rotation={[k * 0.35, 0, 0]} castShadow />
          <mesh position={[-3.7, 1.35, k * 1.2]} rotation={[k * 0.35, 0, 0]} material={mats.accent}><boxGeometry args={[0.9, 0.5, 0.1]} /></mesh>
          <mesh position={[1.8, -0.1, k * 0.82]} material={mats.dark}><boxGeometry args={[2.0, 0.55, 0.38]} /></mesh>
          <mesh position={[-1.5, 0.11, k * 4.3]} material={k > 0 ? mats.green : mats.red}><boxGeometry args={[0.25, 0.1, 0.25]} /></mesh>
          <mesh position={[0, 0.07, k * 2.4]} material={mats.accent}><boxGeometry args={[2.2, 0.02, 0.18]} /></mesh>
        </group>
      ))}
      {/* nozzle and afterburner glow */}
      <mesh position={[-5.5, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.dark}><cylinderGeometry args={[0.5, 0.42, 0.7, 16, 1, true]} /></mesh>
      <mesh ref={glowRef} position={[-6.4, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.glow}><coneGeometry args={[0.42, 2.0, 14, 1, true]} /></mesh>
      <mesh ref={strobe} position={[-4.4, 1.7, 0]} material={mats.white}><boxGeometry args={[0.18, 0.18, 0.18]} /></mesh>
    </group>
  )
}

/** ~16 m executive VTOL jet: round fuselage with a window row, straight wings, T-tail, two rear engines. */
function CruiserShape({ mats, geos, glowRef, strobe }) {
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]} material={mats.body} castShadow><cylinderGeometry args={[0.95, 0.95, 9.4, 20]} /></mesh>
      <mesh position={[6.2, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={mats.body} castShadow><coneGeometry args={[0.95, 3.2, 20]} /></mesh>
      <mesh position={[-5.6, 0.1, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.body} castShadow><cylinderGeometry args={[0.95, 0.5, 2.8, 18]} /></mesh>
      <mesh position={[4.2, 0.45, 0]} scale={[1.7, 0.6, 0.95]} material={mats.glass}><sphereGeometry args={[0.8, 16, 10]} /></mesh>
      {[-1, 1].map((k) => (
        <group key={k}>
          <mesh position={[0.6, 0.35, k * 0.94]} material={mats.window}><boxGeometry args={[6.4, 0.3, 0.04]} /></mesh>
          <mesh position={[0, -0.12, k * 0.95]} material={mats.accent}><boxGeometry args={[8.4, 0.12, 0.05]} /></mesh>
          <mesh position={[-4.6, 0.55, k * 1.55]} rotation={[0, 0, Math.PI / 2]} material={mats.dark} castShadow><cylinderGeometry args={[0.5, 0.45, 2.4, 16]} /></mesh>
          <mesh ref={k > 0 ? glowRef : undefined} position={[-6.2, 0.55, k * 1.55]} rotation={[0, 0, Math.PI / 2]} material={mats.glow}><coneGeometry args={[0.4, 1.6, 12, 1, true]} /></mesh>
          <mesh position={[-0.9, 0.15, k * 5.6]} material={k > 0 ? mats.green : mats.red}><boxGeometry args={[0.3, 0.12, 0.3]} /></mesh>
        </group>
      ))}
      <mesh geometry={geos.wing} material={mats.body} position={[0.2, -0.45, 0]} castShadow />
      <mesh geometry={geos.wing} material={mats.body} position={[0.2, -0.45, 0]} scale={[1, 1, -1]} castShadow />
      <mesh geometry={geos.fin} material={mats.accent} position={[-5.2, 0.9, 0]} castShadow />
      <mesh geometry={geos.stab} material={mats.body} position={[-6.2, 3.45, 0]} castShadow />
      <mesh geometry={geos.stab} material={mats.body} position={[-6.2, 3.45, 0]} scale={[1, 1, -1]} castShadow />
      <mesh ref={strobe} position={[-7.0, 3.6, 0]} material={mats.white}><boxGeometry args={[0.2, 0.2, 0.2]} /></mesh>
    </group>
  )
}
