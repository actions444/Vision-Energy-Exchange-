// Background air traffic: an airliner and a private jet crossing the sky on changing routes, and
// a helicopter circling the city. Real-size models built from simple shapes (cheap to draw),
// navigation lights (red left, green right, white tail, flashing red beacon and white strobes)
// that stay visible day and night, and engine sound that rises and falls with distance through
// the shared audio graph (so the visitor's volume and mute apply). Not player-controlled yet.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { audioCore, hasAudio } from '../audio/core.js'
import { useStore } from '../state/store.js'
import { nightLit } from '../state/environment.js'

/** Live aircraft groups (debugging and tests). */
export const airState = {}

const rand = (() => { let s = 12345; return () => { s = (s * 16807) % 2147483647; return s / 2147483647 } })()

function newRoute(alt, speed) {
  const a = rand() * Math.PI * 2
  const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a))
  const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar((rand() - 0.5) * 500)
  const half = 1300
  return { start: side.clone().addScaledVector(dir, -half).setY(alt + (rand() - 0.5) * 60), dir, len: half * 2, speed, s: 0, wait: 0 }
}

/** Navigation lights as screen-space points (visible at any distance). */
function NavLights({ steady, blink, beaconRef }) {
  const geo = (pts) => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flatMap((p) => p.pos), 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(pts.flatMap((p) => new THREE.Color(p.color).toArray()), 3))
    return g
  }
  const steadyGeo = useMemo(() => geo(steady), [steady])
  const blinkGeo = useMemo(() => geo(blink), [blink])
  const mat = useMemo(() => new THREE.PointsMaterial({ size: 5, sizeAttenuation: false, vertexColors: true, fog: false, toneMapped: false, transparent: true, depthWrite: false }), [])
  return (
    <>
      <points geometry={steadyGeo} material={mat} />
      <points ref={beaconRef} geometry={blinkGeo} material={mat} />
    </>
  )
}

function useAircraftMats(livery) {
  return useMemo(() => ({
    body: new THREE.MeshStandardMaterial({ color: '#f3f3f1', roughness: 0.35, metalness: 0.3 }),
    belly: new THREE.MeshStandardMaterial({ color: '#b9bcc2', roughness: 0.4, metalness: 0.4 }),
    tail: new THREE.MeshStandardMaterial({ color: livery, roughness: 0.4, metalness: 0.3 }),
    dark: new THREE.MeshStandardMaterial({ color: '#2a2c31', roughness: 0.5, metalness: 0.5 }),
    window: nightLit(new THREE.MeshStandardMaterial({ color: '#1a2230', roughness: 0.2, emissive: '#ffd9a0' }), 1.2, 0),
  }), [livery])
}

/** ~38 m twin-engine airliner, forward = +x. */
function Airliner({ livery = '#5b2a86' }) {
  const m = useAircraftMats(livery)
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]} material={m.body}><cylinderGeometry args={[2, 2, 30, 16]} /></mesh>
      <mesh position={[15, 0, 0]} scale={[2.6, 1, 1]} material={m.body}><sphereGeometry args={[2, 16, 12]} /></mesh>
      <mesh position={[-18.5, 0.6, 0]} rotation={[0, 0, Math.PI / 2]} material={m.body}><coneGeometry args={[2, 7, 16]} /></mesh>
      <mesh position={[0, -1.2, 0]} rotation={[0, 0, Math.PI / 2]} material={m.belly}><cylinderGeometry args={[1.6, 1.6, 26, 12]} /></mesh>
      <mesh position={[-1, -0.8, 0]} rotation={[0, 0.32, 0]} material={m.body}><boxGeometry args={[6, 0.45, 34]} /></mesh>
      {[-1, 1].map((k) => <mesh key={k} position={[2, -2.1, k * 6]} rotation={[0, 0, Math.PI / 2]} material={m.dark}><cylinderGeometry args={[1.15, 1.0, 4.2, 14]} /></mesh>)}
      <mesh position={[-18, 1.2, 0]} rotation={[0, 0.4, 0]} material={m.body}><boxGeometry args={[3.2, 0.25, 12]} /></mesh>
      <mesh position={[-17.5, 4.5, 0]} rotation={[0, 0, -0.5]} material={m.tail}><boxGeometry args={[5, 6.5, 0.35]} /></mesh>
      {/* brand stripe and cabin windows */}
      {[-1, 1].map((k) => <mesh key={'s' + k} position={[0, 0.4, k * 2.0]} material={m.tail}><boxGeometry args={[28, 0.35, 0.05]} /></mesh>)}
      {[-1, 1].map((k) => <mesh key={'w' + k} position={[1, 0.95, k * 1.97]} material={m.window}><boxGeometry args={[24, 0.25, 0.04]} /></mesh>)}
    </group>
  )
}

/** ~20 m business jet with tail-mounted engines and a T-tail. */
function BizJet({ livery = '#127a74' }) {
  const m = useAircraftMats(livery)
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]} material={m.body}><cylinderGeometry args={[1.05, 1.05, 15, 14]} /></mesh>
      <mesh position={[7.5, 0, 0]} scale={[2.6, 1, 1]} material={m.body}><sphereGeometry args={[1.05, 14, 10]} /></mesh>
      <mesh position={[-9.5, 0.3, 0]} rotation={[0, 0, Math.PI / 2]} material={m.body}><coneGeometry args={[1.05, 4, 14]} /></mesh>
      <mesh position={[0.5, -0.6, 0]} rotation={[0, 0.35, 0]} material={m.body}><boxGeometry args={[3, 0.25, 17]} /></mesh>
      {[-1, 1].map((k) => <mesh key={k} position={[-6.5, 0.6, k * 1.6]} rotation={[0, 0, Math.PI / 2]} material={m.dark}><cylinderGeometry args={[0.55, 0.5, 2.6, 12]} /></mesh>)}
      <mesh position={[-9.5, 2.4, 0]} rotation={[0, 0, -0.55]} material={m.tail}><boxGeometry args={[2.6, 3.6, 0.22]} /></mesh>
      <mesh position={[-10.6, 4.1, 0]} rotation={[0, 0.35, 0]} material={m.tail}><boxGeometry args={[1.6, 0.18, 6]} /></mesh>
      {[-1, 1].map((k) => <mesh key={'w' + k} position={[1.5, 0.35, k * 1.03]} material={m.window}><boxGeometry args={[7, 0.3, 0.03]} /></mesh>)}
    </group>
  )
}

/** ~13 m helicopter; main and tail rotors spin. */
function Helicopter({ rotorRef, tailRef }) {
  const m = useAircraftMats('#1d1b24')
  const blade = useMemo(() => new THREE.MeshStandardMaterial({ color: '#202124', transparent: true, opacity: 0.75 }), [])
  return (
    <group>
      <mesh scale={[1.9, 1.15, 1.1]} material={m.tail}><sphereGeometry args={[1.3, 16, 12]} /></mesh>
      <mesh position={[1.3, 0.25, 0]} scale={[1.1, 0.9, 1.05]} material={m.window}><sphereGeometry args={[1.0, 14, 10]} /></mesh>
      <mesh position={[-4.2, 0.35, 0]} rotation={[0, 0, Math.PI / 2 + 0.06]} material={m.tail}><cylinderGeometry args={[0.18, 0.4, 6, 10]} /></mesh>
      <mesh position={[-7, 1.0, 0]} rotation={[0, 0, -0.4]} material={m.tail}><boxGeometry args={[1.2, 1.6, 0.12]} /></mesh>
      {[-1, 1].map((k) => <mesh key={k} position={[0, -1.6, k * 1.0]} material={m.dark}><boxGeometry args={[3.4, 0.08, 0.08]} /></mesh>)}
      <mesh position={[0, 1.55, 0]} material={m.dark}><cylinderGeometry args={[0.12, 0.12, 0.6, 8]} /></mesh>
      <group ref={rotorRef} position={[0, 1.85, 0]}>
        {[0, 1, 2, 3].map((k) => <mesh key={k} rotation={[0, (k * Math.PI) / 2, 0]} position={[0, 0, 0]} material={blade}><boxGeometry args={[11, 0.05, 0.35]} /></mesh>)}
      </group>
      <group ref={tailRef} position={[-7.1, 1.1, 0.15]}>
        {[0, 1].map((k) => <mesh key={k} rotation={[0, 0, (k * Math.PI) / 2]} material={blade}><boxGeometry args={[1.8, 0.18, 0.04]} /></mesh>)}
      </group>
    </group>
  )
}

/** Looping filtered noise whose loudness follows the aircraft's distance from the camera. */
function useEngineSound(kind, groupRef) {
  const enabled = useStore((s) => s.settings.aircraftSound !== false)
  const node = useRef(null)
  useEffect(() => {
    if (!enabled) return
    let stopped = false
    let t = 0
    const tryStart = () => {
      if (stopped) return
      if (!hasAudio() || audioCore().ctx.state !== 'running') { t = setTimeout(tryStart, 1500); return }
      const { ctx, sum } = audioCore()
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
      const d = buf.getChannelData(0)
      let b = 0
      for (let i = 0; i < d.length; i++) { b = 0.97 * b + 0.03 * (Math.random() * 2 - 1); d[i] = b * 3 } // brown-ish noise
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = kind === 'jet' ? 900 : kind === 'heli' ? 260 : 420
      const gain = ctx.createGain(); gain.gain.value = 0
      src.connect(lp); lp.connect(gain)
      let out = gain
      let lfo = null
      if (kind === 'heli') {
        // rotor "whop": amplitude modulation at the blade-pass rate
        const am = ctx.createGain(); am.gain.value = 0.55
        lfo = ctx.createOscillator(); lfo.frequency.value = 17
        const depth = ctx.createGain(); depth.gain.value = 0.45
        lfo.connect(depth); depth.connect(am.gain)
        gain.connect(am); out = am
        lfo.start()
      }
      out.connect(sum)
      src.start()
      node.current = { ctx, gain, src, lfo, out }
    }
    tryStart()
    return () => {
      stopped = true
      clearTimeout(t)
      const n = node.current
      if (n) { try { n.src.stop(); n.lfo?.stop(); n.out.disconnect() } catch { /* already stopped */ } }
      node.current = null
    }
  }, [enabled, kind])
  const base = kind === 'airliner' ? 0.55 : kind === 'jet' ? 0.4 : 0.5
  const ref = kind === 'heli' ? 90 : 160
  return (camera) => {
    const n = node.current
    if (!n || !groupRef.current) return
    const dist = groupRef.current.position.distanceTo(camera.position)
    n.gain.gain.setTargetAtTime(base / (1 + (dist / ref) ** 2), n.ctx.currentTime, 0.3)
  }
}

function Plane({ kind, livery, airKey, altOffset = 0, speedMul = 1 }) {
  const g = useRef(), beacon = useRef()
  const route = useRef(null)
  const base = kind === 'airliner' ? { alt: 320, speed: 72, wait: [8, 30] } : { alt: 230, speed: 62, wait: [20, 50] }
  const cfg = useMemo(() => ({ alt: base.alt + altOffset, speed: base.speed * speedMul, wait: base.wait }), [base.alt, base.speed, base.wait, altOffset, speedMul])
  const steady = useMemo(() => (kind === 'airliner'
    ? [{ pos: [-1, -0.8, -17.2], color: '#ff2a2a' }, { pos: [-1, -0.8, 17.2], color: '#20ff60' }, { pos: [-21.5, 1, 0], color: '#ffffff' }]
    : [{ pos: [0.5, -0.6, -8.6], color: '#ff2a2a' }, { pos: [0.5, -0.6, 8.6], color: '#20ff60' }, { pos: [-11.5, 4, 0], color: '#ffffff' }]), [kind])
  const blink = useMemo(() => (kind === 'airliner'
    ? [{ pos: [0, 2.2, 0], color: '#ff3020' }, { pos: [0, -2.2, 0], color: '#ff3020' }]
    : [{ pos: [0, 1.2, 0], color: '#ff3020' }]), [kind])
  const sound = useEngineSound(kind === 'airliner' ? 'airliner' : 'jet', g)
  const key = airKey || kind
  useEffect(() => { airState[key] = g.current; return () => { delete airState[key] } }, [key])
  useFrame(({ camera, clock }, dt) => {
    if (!route.current) { route.current = newRoute(cfg.alt, cfg.speed); route.current.s = rand() * route.current.len }
    const r = route.current
    airState[kind + 'Route'] = r
    if (r.wait > 0) { r.wait -= dt; g.current.visible = false; return }
    r.s += r.speed * Math.min(dt, 0.1)
    if (r.s > r.len) { route.current = newRoute(cfg.alt, cfg.speed); route.current.wait = cfg.wait[0] + rand() * (cfg.wait[1] - cfg.wait[0]); return }
    g.current.visible = true
    g.current.position.copy(r.start).addScaledVector(r.dir, r.s)
    g.current.rotation.set(0, Math.atan2(-r.dir.z, r.dir.x), 0)
    if (beacon.current) beacon.current.visible = (clock.elapsedTime % 1.2) < 0.15
    sound(camera)
  })
  return (
    <group ref={g} visible={false}>
      {kind === 'airliner' ? <Airliner livery={livery} /> : <BizJet livery={livery} />}
      <NavLights steady={steady} blink={blink} beaconRef={beacon} />
    </group>
  )
}

function Heli() {
  const g = useRef(), rotor = useRef(), tail = useRef(), beacon = useRef()
  const steady = useMemo(() => [{ pos: [0, 0.2, -1.4], color: '#ff2a2a' }, { pos: [0, 0.2, 1.4], color: '#20ff60' }, { pos: [-7.4, 0.8, 0], color: '#ffffff' }], [])
  const blink = useMemo(() => [{ pos: [0, -1.4, 0], color: '#ff3020' }], [])
  const sound = useEngineSound('heli', g)
  useEffect(() => { airState.heli = g.current; return () => { delete airState.heli } }, [])
  const orbit = { cx: 10, cz: 20, r: 170, alt: 90, speed: 22 }
  useFrame(({ camera, clock }, dt) => {
    const t = clock.elapsedTime
    const a = (t * orbit.speed) / orbit.r
    const x = orbit.cx + Math.cos(a) * orbit.r, z = orbit.cz + Math.sin(a) * orbit.r
    g.current.position.set(x, orbit.alt + Math.sin(t * 0.3) * 6, z)
    // flying anticlockwise: forward is the tangent; bank into the turn, nose slightly down
    const heading = Math.atan2(-(Math.cos(a)), -Math.sin(a))
    g.current.rotation.set(0, heading, 0)
    g.current.rotateX(-0.12)
    g.current.rotateZ(-0.08)
    if (rotor.current) rotor.current.rotation.y += Math.min(dt, 0.05) * 38
    if (tail.current) tail.current.rotation.z += Math.min(dt, 0.05) * 60
    if (beacon.current) beacon.current.visible = (t % 1.0) < 0.15
    sound(camera)
  })
  return (
    <group ref={g}>
      <Helicopter rotorRef={rotor} tailRef={tail} />
      <NavLights steady={steady} blink={blink} beaconRef={beacon} />
    </group>
  )
}

// ---------------- hot air balloons ----------------
// Slow, silent, purely decorative - a handful of candy-striped balloons drifting on a long,
// lazy circuit high over the city, bobbing gently. No engine sound; just a soft creak.
let stripeTex = null
function stripeTexture(a, b) {
  const key = a + '|' + b
  stripeTex = stripeTex || new Map()
  if (stripeTex.has(key)) return stripeTex.get(key)
  const c = document.createElement('canvas'); c.width = 256; c.height = 32
  const g = c.getContext('2d')
  const n = 10
  for (let i = 0; i < n; i++) { g.fillStyle = i % 2 === 0 ? a : b; g.fillRect((i / n) * 256, 0, 256 / n, 32) }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace
  stripeTex.set(key, t)
  return t
}

function Balloon({ colorA, colorB, orbit }) {
  const g = useRef()
  const envelope = useMemo(() => new THREE.MeshStandardMaterial({ map: stripeTexture(colorA, colorB), roughness: 0.7 }), [colorA, colorB])
  const basket = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6b4a2f', roughness: 0.9 }), [])
  const rope = useMemo(() => new THREE.MeshStandardMaterial({ color: '#201a14', roughness: 0.9 }), [])
  const flame = useMemo(() => nightLit(new THREE.MeshStandardMaterial({ color: '#2a1206', emissive: '#ff9a3c', emissiveIntensity: 1.2 }), 0.8, 0.8), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const a = orbit.phase + (t * orbit.speed) / orbit.r
    const x = orbit.cx + Math.cos(a) * orbit.r, z = orbit.cz + Math.sin(a) * orbit.r
    g.current.position.set(x, orbit.alt + Math.sin(t * 0.12 + orbit.phase) * 5, z)
    g.current.rotation.y = a + Math.PI / 2
  })
  return (
    <group ref={g}>
      <mesh position={[0, 7, 0]} scale={[1, 1.25, 1]} material={envelope} castShadow><sphereGeometry args={[4, 20, 16]} /></mesh>
      <mesh position={[0, 2.6, 0]} material={rope}><cylinderGeometry args={[1.3, 2.9, 5.2, 10, 1, true]} /></mesh>
      <mesh position={[0, 0, 0]} material={basket} castShadow><boxGeometry args={[2.1, 1.3, 2.1]} /></mesh>
      <mesh position={[0, 0.75, 0]} material={flame}><coneGeometry args={[0.3, 0.6, 8]} /></mesh>
    </group>
  )
}

const BALLOONS = [
  { colorA: '#e8461e', colorB: '#f2efe6', orbit: { cx: -20, cz: 40, r: 140, alt: 150, speed: 4.5, phase: 0 } },
  { colorA: '#2fd0c4', colorB: '#f2efe6', orbit: { cx: -20, cz: 40, r: 150, alt: 165, speed: 4.5, phase: 2.1 } },
  { colorA: '#9b4fe0', colorB: '#f2efe6', orbit: { cx: -20, cz: 40, r: 160, alt: 142, speed: 4.5, phase: 4.2 } },
  { colorA: '#e8c35a', colorB: '#1b1b1f', orbit: { cx: -20, cz: 40, r: 170, alt: 178, speed: 4.5, phase: 5.6 } },
]

export default function AirTraffic() {
  return (
    <group>
      <Plane kind="airliner" airKey="airliner" livery="#5b2a86" />
      <Plane kind="airliner" airKey="airliner2" livery="#2f6fd1" altOffset={28} speedMul={0.85} />
      <Plane kind="jet" airKey="jet" livery="#127a74" />
      <Plane kind="jet" airKey="jet2" livery="#c9a96a" altOffset={-24} speedMul={1.15} />
      <Heli />
      {BALLOONS.map((b, i) => <Balloon key={i} {...b} />)}
    </group>
  )
}
