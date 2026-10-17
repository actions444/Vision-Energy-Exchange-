import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface } from './materials.js'
import { registerInteractable, playerState } from '../state/runtime.js'
import { registerLightAnchor } from '../state/environment.js'
import { registerLoad, switchedMaterial } from '../state/power.js'
import { Table, Chair, Shelf, Plant, CeilingLight } from './furniture.jsx'
import { Car } from './props.jsx'
import { BrandSign } from './signs.jsx'
import { DoubleDoor } from './Door.jsx'
import { Wall, Gate, Block, Kiosk } from './jobkit.jsx'
import { TimeClock } from './JobCenter.jsx'
import { WASH_LANE as L, WASH_PRICE, WASH_SECONDS, CURB } from '../config/jobs.js'
import { washes, startWash, payForWash } from '../state/jobs.js'

// ============================================================================
// CAR WASH: an express tunnel with a pay kiosk, an office with a time clock, and detail bays.
// Local frame: u across (+x), v along the tunnel (+z); the entrance faces the street (low z).
//   tunnel   u 4.6..9.0  v 3..19      office  u 0..4.3  v 3.4..11.4      bays  u 10.8..14
// The machine runs a 16 s cycle (foam, brushes, rinse, dryers) when a customer pays at the kiosk.
// NPC customers run it on their own when nobody is nearby. Cosmetic: nothing gets dirty in this build.
// ============================================================================

const clamp01 = (x) => Math.max(0, Math.min(1, x))
const ramp = (a, b, x) => clamp01((x - a) / (b - a))
const BAY_CARS = ['#8b1d22', '#1d2a44', '#e8e8e6']

export default function CarWash({ site, zone }) {
  const m = getMaterials()
  const tile = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e7edf1', roughness: 0.22, metalness: 0.05 }), [])
  const floorDark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2d33', roughness: 0.45, metalness: 0.1 }), [])
  const plaster = useMemo(() => surface('plaster', 3, 2), [])
  const concrete = useMemo(() => surface('concrete', 4, 5), [])
  const roofMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d7dde2', roughness: 0.5, metalness: 0.2 }), [])
  const accent = useMemo(() => new THREE.MeshStandardMaterial({ color: '#12a7e0', roughness: 0.4, metalness: 0.3 }), [])
  const yellow = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e3b52c', roughness: 0.6 }), [])
  const [x0, z0] = [site.x0, site.z0]
  const ofs = (u, v) => new THREE.Vector3(x0 + u, CURB + 1, z0 + v)

  useEffect(() => {
    const off = registerInteractable('wash-pay-' + site.id, {
      position: ofs(3.7, 1.8),
      radius: 4,
      label: () => (washes[site.id].t >= 0 ? 'Wash in progress…' : `Pay for a wash · ${WASH_PRICE} credits`),
      onInteract: () => payForWash(site.id),
    })
    return off
  }, [site.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const vbays = [6, 11, 16]
  return (
    <>
    <group position={[x0, CURB, z0]}>
      {/* aprons */}
      <mesh position={[7, 0.012, 11]} rotation={[-Math.PI / 2, 0, 0]} material={concrete} receiveShadow><planeGeometry args={[14, 22]} /></mesh>
      <mesh position={[6.8, 0.02, 11]} rotation={[-Math.PI / 2, 0, 0]} material={floorDark} receiveShadow><planeGeometry args={[4.4, 16]} /></mesh>
      {[5.55, 8.05].map((u) => <mesh key={u} position={[u, 0.03, 11]} rotation={[-Math.PI / 2, 0, 0]} material={yellow}><planeGeometry args={[0.1, 16]} /></mesh>)}

      {/* tunnel walls, roof and portals */}
      {[[4.3, 4.6], [9.0, 9.3]].map(([a, b]) => (
        <group key={a}>
          <RigidBody type="fixed" colliders={false}><CuboidCollider args={[(b - a) / 2, L.roof / 2, 8]} position={[(a + b) / 2, L.roof / 2, 11]} /></RigidBody>
          <mesh position={[(a + b) / 2, L.roof / 2, 11]} material={tile} castShadow receiveShadow><boxGeometry args={[b - a, L.roof, 16]} /></mesh>
        </group>
      ))}
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[2.6, 0.15, 8.3]} position={[6.8, L.roof + 0.15, 11]} /></RigidBody>
      <mesh position={[6.8, L.roof + 0.15, 11]} material={roofMat} castShadow><boxGeometry args={[5.2, 0.3, 16.6]} /></mesh>
      {[2.75, 19.25].map((v, i) => (
        <group key={v}>
          <mesh position={[6.8, L.roof - 0.4, v]} material={accent} castShadow><boxGeometry args={[5.4, 1.0, 0.5]} /></mesh>
          <BrandSign text={i === 0 ? site.name.toUpperCase() : 'THANK YOU · DRIVE SAFELY'} sub={i === 0 ? `EXPRESS TUNNEL · ${WASH_PRICE} CREDITS` : 'DRY · SHINY · GO'} position={[6.8, L.roof - 0.4, i === 0 ? v - 0.27 : v + 0.27]} rotation={[0, i === 0 ? Math.PI : 0, 0]} width={5.2} color="#ffffff" glow="#bfeaff" size={110} />
        </group>
      ))}

      <WashRig site={site} zone={zone} />

      {/* pay kiosk with a little canopy, and the traffic light */}
      <Kiosk position={[3.7, 0, 1.6]} yaw={Math.PI / 2} screen="#2fd0c4" />
      <mesh position={[3.7, 2.4, 1.6]} material={roofMat} castShadow><boxGeometry args={[1.4, 0.1, 1.2]} /></mesh>
      {[[3.1, 1.1], [4.3, 1.1], [3.1, 2.1], [4.3, 2.1]].map(([u, v], i) => <mesh key={i} position={[u, 1.2, v]} material={m.blackSteel}><cylinderGeometry args={[0.03, 0.03, 2.4, 6]} /></mesh>)}
      <mesh position={[9.7, 1.1, 2.0]} material={m.blackSteel}><cylinderGeometry args={[0.05, 0.05, 2.2, 8]} /></mesh>

      {/* office */}
      <Wall side="s" rect={{ x0: 0, x1: 4.3, z0: 3.4, z1: 11.4 }} y={0} h={3.4} ext={tile} int={plaster} openings={[{ at: 1.95, half: 0.55, h: 2.4 }]} />
      <Wall side="n" rect={{ x0: 0, x1: 4.3, z0: 3.4, z1: 11.4 }} y={0} h={3.4} ext={tile} int={plaster} />
      <Wall side="w" rect={{ x0: 0, x1: 4.3, z0: 3.4, z1: 11.4 }} y={0} h={3.4} ext={tile} int={plaster} openings={[{ at: 8.2, half: 1.4, glass: true, h: 2.6, sill: 0.9 }]} />
      <mesh position={[2.15, 3.5, 7.4]} material={roofMat} castShadow><boxGeometry args={[4.4, 0.2, 8.2]} /></mesh>
      {/* vacuum / detail bays under a long canopy */}
      <mesh position={[12.6, 3.4, 11.5]} material={roofMat} castShadow><boxGeometry args={[3.8, 0.15, 15]} /></mesh>
      {vbays.map((v) => (
        <group key={v}>
          <mesh position={[14.0, 1.0, v + 2.5]} material={m.blackSteel} castShadow><cylinderGeometry args={[0.1, 0.1, 2.0, 8]} /></mesh>
          <mesh position={[14.0, 3.0, v + 2.5]} material={m.blackSteel}><cylinderGeometry args={[0.1, 0.1, 0.8, 8]} /></mesh>
          <mesh position={[13.7, 1.5, v]} material={accent}><boxGeometry args={[0.4, 0.8, 0.5]} /></mesh>
          <mesh position={[13.2, 1.2, v + 0.35]} rotation={[0, 0, Math.PI / 2]} material={m.blackSteel}><torusGeometry args={[0.45, 0.04, 6, 14, Math.PI]} /></mesh>
          <mesh position={[12.6, 0.02, v + 0.1]} rotation={[-Math.PI / 2, 0, 0]} material={yellow}><planeGeometry args={[0.1, 4.2]} /></mesh>
        </group>
      ))}
      <Car position={[13.0, 0, 6.0]} yaw={0} color={BAY_CARS[0]} />
      <Car position={[13.0, 0, 16.0]} yaw={Math.PI} color={BAY_CARS[1]} />

      {/* pylon sign by the street */}
      <mesh position={[12.4, 3.2, 0.8]} material={m.blackSteel} castShadow><cylinderGeometry args={[0.12, 0.14, 6.4, 8]} /></mesh>
      <mesh position={[12.4, 5.6, 0.8]} material={accent} castShadow><boxGeometry args={[2.8, 1.5, 0.3]} /></mesh>
      <BrandSign text="CAR WASH" sub={site.name} position={[12.4, 5.6, 0.62]} rotation={[0, Math.PI, 0]} width={2.7} color="#ffffff" glow="#bfeaff" size={120} />
    </group>

    {/* office door and interior use world coordinates (doors, seats and lights register world positions) */}
    <DoubleDoor id={'door-' + site.id + '-office'} center={[x0 + 1.95, CURB, z0 + 3.6]} halfWidth={0.55} height={2.4} facing={Math.PI} accent="#12a7e0" label="wash office door" />
    <Gate x0={x0} x1={x0 + 4.4} z0={z0 + 3.4} z1={z0 + 11.4}>
      <group>
        <mesh position={[x0 + 2.15, CURB + 0.01, z0 + 7.4]} rotation={[-Math.PI / 2, 0, 0]} material={floorDark}><planeGeometry args={[3.7, 7.6]} /></mesh>
        <Table position={[x0 + 2.0, CURB, z0 + 8.8]} size={[1.6, 0.7]} />
        <Chair position={[x0 + 2.0, CURB, z0 + 9.7]} yaw={Math.PI} color="#2b2f38" />
        <Shelf position={[x0 + 1.0, CURB, z0 + 11.0]} yaw={Math.PI} width={1.6} height={2.0} books={false} />
        <TimeClock position={[x0 + 0.5, CURB, z0 + 6.4]} />
        <Plant position={[x0 + 3.7, CURB, z0 + 10.8]} scale={1} />
        <CeilingLight position={[x0 + 2.0, CURB + 3.35, z0 + 6.5]} zone={zone} intensity={10} />
        <CeilingLight position={[x0 + 2.0, CURB + 3.35, z0 + 9.5]} zone={zone} intensity={10} />
      </group>
    </Gate>
    </>
  )
}

/** The machinery: spinning brushes, foam, rinse, dryers, flashing lights, traffic light and an NPC customer car. */
function WashRig({ site, zone }) {
  const r = useRef({})
  const W = washes[site.id]
  const foamMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true, opacity: 0, depthWrite: false }), [])
  const rinseMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7fd0ff', roughness: 0.1, transparent: true, opacity: 0, depthWrite: false }), [])
  const brushMats = useMemo(() => ['#ff3da6', '#16c6e8'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 })), [])
  const steel = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8e949c', roughness: 0.35, metalness: 0.8 }), [])
  const strips = useMemo(() => [0, 1].map(() => new THREE.MeshBasicMaterial({ color: '#5fd0ff', toneMapped: false })), [])
  const red = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ff2a2a', toneMapped: false }), [])
  const green = useMemo(() => new THREE.MeshBasicMaterial({ color: '#2aff6a', toneMapped: false }), [])
  const paint = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d7c34a', roughness: 0.25, metalness: 0.6 }), [])
  const glass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#223', roughness: 0.1, metalness: 0.5 }), [])
  const tire = useMemo(() => new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.9 }), [])
  const anchors = useMemo(() => [6.0, 12.5].map((v) => ({
    position: new THREE.Vector3(site.x0 + 6.8, CURB + 3.9, site.z0 + v), color: '#5fd0ff', intensity: 12, distance: 9, range: 60, zone,
  })), [site.x0, site.z0, zone])
  useEffect(() => {
    const offs = anchors.map((a) => registerLightAnchor(a))
    offs.push(registerLoad({ zone, watts: () => (W.t >= 0 ? 900 : 120) }))
    return () => offs.forEach((o) => o())
  }, [anchors, zone, W])
  const col = useMemo(() => new THREE.Color(), [])

  useFrame((st, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1)
    const now = st.clock.elapsedTime
    // an NPC customer runs the wash every so often when nobody is near the tunnel
    if (W.t < 0) {
      if (!W.lastNpc) W.lastNpc = now - 30 + (site.id === 'carwashB' ? 8 : 0)
      const p = playerState.position
      const near = p.x > site.x0 + 2 && p.x < site.x0 + 12 && p.z > site.z0 - 3 && p.z < site.z0 + 25
      if (now - W.lastNpc > 45 && !near) startWash(site.id, 'npc')
    } else {
      W.t = (performance.now() - W.start) / 1000
      if (W.t >= WASH_SECONDS) { W.t = -1; W.by = null; W.lastNpc = now }
    }
    const t = W.t, on = t >= 0
    const foam = on ? ramp(0.5, 2, t) * (1 - ramp(7.5, 9, t)) : 0
    const brush = on ? ramp(2.5, 4, t) * (1 - ramp(9.5, 11, t)) : 0
    const rinse = on ? ramp(9, 10, t) * (1 - ramp(12.5, 13.5, t)) : 0
    const dry = on ? ramp(12, 13, t) : 0
    const R = r.current
    foamMat.opacity = foam * 0.62
    rinseMat.opacity = rinse * 0.35
    if (R.foam) R.foam.visible = foam > 0.01
    if (R.rinse) R.rinse.visible = rinse > 0.01
    if (R.brushL) { R.brushL.rotation.y += dt * 16 * brush; R.brushR.rotation.y -= dt * 16 * brush; R.top.rotation.x += dt * 14 * brush }
    if (R.brushL) { R.brushL.position.x = 5.45 + (1 - brush) * -0.5; R.brushR.position.x = 8.15 + (1 - brush) * 0.5; R.topY.position.y = 3.0 - brush * 0.9 }
    if (R.fans) R.fans.forEach((f) => { f.rotation.z += dt * (3 + dry * 45) })
    if (R.foamBlobs) R.foamBlobs.scale.setScalar(0.9 + Math.sin(now * 6) * 0.08)
    // flashing colour lights while running
    col.setHSL((now * 0.6) % 1, 1, 0.55)
    strips.forEach((s, i) => { if (on) s.color.setHSL((now * 0.6 + i * 0.5) % 1, 1, 0.55); else s.color.set('#5fd0ff') })
    anchors.forEach((a, i) => { if (on) { col.setHSL((now * 0.6 + i * 0.5) % 1, 1, 0.55); a.color = '#' + col.getHexString(); a.intensity = 16 } else { a.color = '#bfeaff'; a.intensity = 9 } })
    red.color.set(on ? '#ff2a2a' : '#3a0c0c'); green.color.set(on ? '#0c3a18' : '#2aff6a')
    // NPC customer car rolls through
    if (R.npc) {
      const go = on && W.by === 'npc'
      R.npc.visible = go
      if (go) R.npc.position.z = 2.6 + (t / WASH_SECONDS) * 18
    }
  })

  const set = (k) => (el) => { r.current[k] = el }
  return (
    <group>
      {/* flashing wall strips */}
      <mesh position={[4.63, 2.6, 11]} material={strips[0]}><boxGeometry args={[0.04, 0.12, 15.6]} /></mesh>
      <mesh position={[8.97, 2.6, 11]} material={strips[1]}><boxGeometry args={[0.04, 0.12, 15.6]} /></mesh>
      {/* entrance traffic light: red while a wash runs */}
      <mesh position={[9.7, 2.0, 2.0]} material={red} userData={{ noBatch: true }}><sphereGeometry args={[0.13, 12, 8]} /></mesh>
      <mesh position={[9.7, 1.72, 2.0]} material={green} userData={{ noBatch: true }}><sphereGeometry args={[0.13, 12, 8]} /></mesh>

      {/* foam arch at v 6.5 */}
      <group position={[0, 0, 6.5]}>
        {[4.8, 8.8].map((u) => <mesh key={u} position={[u, 1.3, 0]} material={steel} castShadow><boxGeometry args={[0.16, 2.6, 0.2]} /></mesh>)}
        <mesh position={[6.8, 2.6, 0]} material={steel} castShadow><boxGeometry args={[4.2, 0.16, 0.2]} /></mesh>
        <group ref={set('foam')} visible={false} userData={{ noBatch: true }}>
          <group ref={set('foamBlobs')}>
            <mesh position={[6.8, 1.4, 0.2]} material={foamMat}><boxGeometry args={[3.9, 2.4, 0.9]} /></mesh>
            {[5.2, 6.2, 7.4, 8.4].map((u, i) => <mesh key={u} position={[u, 2.35 - (i % 2) * 0.1, 0.25]} material={foamMat}><sphereGeometry args={[0.45, 10, 8]} /></mesh>)}
          </group>
        </group>
      </group>

      {/* brushes at v 10.5 */}
      <group position={[0, 0, 10.5]}>
        <group ref={set('brushL')} position={[5.45, 0, 0]}>
          <mesh position={[0, 1.1, 0]} material={brushMats[0]} castShadow><cylinderGeometry args={[0.36, 0.36, 2.2, 14]} /></mesh>
          <mesh position={[0, 1.1, 0]} material={steel}><cylinderGeometry args={[0.07, 0.07, 3.2, 8]} /></mesh>
        </group>
        <group ref={set('brushR')} position={[8.15, 0, 0]}>
          <mesh position={[0, 1.1, 0]} material={brushMats[1]} castShadow><cylinderGeometry args={[0.36, 0.36, 2.2, 14]} /></mesh>
          <mesh position={[0, 1.1, 0]} material={steel}><cylinderGeometry args={[0.07, 0.07, 3.2, 8]} /></mesh>
        </group>
        <group ref={set('topY')} position={[6.8, 3.0, 0]}>
          <group ref={set('top')}>
            <mesh rotation={[0, 0, Math.PI / 2]} material={brushMats[0]} castShadow><cylinderGeometry args={[0.32, 0.32, 3.4, 14]} /></mesh>
          </group>
          <mesh position={[0, 0.8, 0]} material={steel}><boxGeometry args={[0.2, 1.2, 0.2]} /></mesh>
        </group>
      </group>

      {/* rinse arch at v 14.5 with spray */}
      <group position={[0, 0, 14.5]}>
        {[4.8, 8.8].map((u) => <mesh key={u} position={[u, 1.3, 0]} material={steel}><boxGeometry args={[0.16, 2.6, 0.2]} /></mesh>)}
        <mesh position={[6.8, 2.6, 0]} material={steel}><boxGeometry args={[4.2, 0.16, 0.2]} /></mesh>
        <group ref={set('rinse')} visible={false} userData={{ noBatch: true }}>
          <mesh position={[6.8, 1.4, 0.5]} material={rinseMat}><boxGeometry args={[3.9, 2.4, 1.2]} /></mesh>
        </group>
      </group>

      {/* dryers at v 17.2: a big fan on each side and one on top */}
      <group position={[0, 0, 17.2]}>
        {[[5.0, 1.3], [8.6, 1.3], [6.8, 3.4]].map(([u, y], i) => (
          <group key={i} position={[u, y, 0]}>
            <mesh material={steel} castShadow><boxGeometry args={[i === 2 ? 3.2 : 0.7, i === 2 ? 0.7 : 1.9, 0.9]} /></mesh>
            <group position={[i === 0 ? 0.36 : i === 1 ? -0.36 : 0, i === 2 ? -0.36 : 0, 0]} rotation={[0, i === 2 ? 0 : Math.PI / 2, 0]}>
              <group ref={(el) => { (r.current.fans ||= [])[i] = el }}>
                <mesh><boxGeometry args={[0.1, 0.9, 0.02]} /><meshStandardMaterial color="#222" /></mesh>
                <mesh rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[0.1, 0.9, 0.02]} /><meshStandardMaterial color="#222" /></mesh>
              </group>
            </group>
          </group>
        ))}
      </group>

      {/* NPC customer car (visual only, no collider) */}
      <group ref={set('npc')} visible={false} position={[6.8, 0, 2.6]} userData={{ noBatch: true }}>
        <mesh position={[0, 0.55, 0]} material={paint} castShadow><boxGeometry args={[1.8, 0.6, 4.4]} /></mesh>
        <mesh position={[0, 1.05, -0.2]} material={paint}><boxGeometry args={[1.6, 0.5, 2.3]} /></mesh>
        <mesh position={[0, 1.06, -0.2]} material={glass}><boxGeometry args={[1.62, 0.42, 2.0]} /></mesh>
        {[[-0.85, 1.4], [0.85, 1.4], [-0.85, -1.4], [0.85, -1.4]].map(([wx, wz], i) => (
          <mesh key={i} position={[wx, 0.34, wz]} rotation={[0, 0, Math.PI / 2]} material={tire}><cylinderGeometry args={[0.34, 0.34, 0.24, 14]} /></mesh>
        ))}
      </group>
    </group>
  )
}
