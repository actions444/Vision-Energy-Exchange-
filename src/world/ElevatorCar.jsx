import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface, signatureMarble } from './materials.js'
import { canvasTexture } from './canvasText.js'
import { createCar, registerCar } from './cars.js'
import { chime } from './ElevatorLights.jsx'
import { BrandSign } from './signs.jsx'
import { registerInteractable, playerState } from '../state/runtime.js'
import { registerLightAnchor } from '../state/environment.js'
import { useStore } from '../state/store.js'
import { carHallPoint } from '../config/elevators.js'
import { FONTS } from '../config/theme.js'

// A real elevator for the Justice & Rehabilitation District. Shaft walls, a car that carries the
// player between floors, sliding hall doors that open only where the car is, a floor-number
// display in the car and above every hall door, lit buttons, arrival lanterns, a chime, and
// colour-flashing lights (the LED ring and door frames cycle pink / purple / teal / gold / red /
// blue, faster while the car moves, and strobe when it arrives). Music comes from the car's own
// music zone (config/rooms.js), exactly like the Plaza elevator.

const PALETTE = ['#ff4fb0', '#7a5cff', '#2fd0c4', '#ffd36b', '#ff5a3c', '#4aa3ff']
const DOOR_H = 2.4
const LEAF = 1.0 // each of the two hall-door leaves

const mat = (color, intensity) => new THREE.MeshStandardMaterial({ color: '#1a1b1f', emissive: color, emissiveIntensity: intensity, toneMapped: false, roughness: 0.4 })

/** One floor-number display texture per car: the current floor and an up/down arrow. */
function makeDisplay(accent) {
  const tex = canvasTexture(256, 128, () => {})
  let shown = ''
  return {
    tex,
    draw(label, dir) {
      const key = label + ':' + dir
      if (key === shown) return
      shown = key
      const ctx = tex.image.getContext('2d')
      ctx.fillStyle = '#07080b'; ctx.fillRect(0, 0, 256, 128)
      ctx.strokeStyle = accent; ctx.lineWidth = 4; ctx.strokeRect(4, 4, 248, 120)
      ctx.fillStyle = '#7ef0e2'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.font = `800 84px ${FONTS.mono}`
      ctx.fillText(String(label), 150, 68)
      if (dir) {
        ctx.fillStyle = dir > 0 ? '#7ef0a0' : '#ffb3a0'
        ctx.beginPath()
        if (dir > 0) { ctx.moveTo(56, 40); ctx.lineTo(84, 84); ctx.lineTo(28, 84) } else { ctx.moveTo(56, 88); ctx.lineTo(84, 44); ctx.lineTo(28, 44) }
        ctx.fill()
      }
      tex.needsUpdate = true
    },
  }
}

export function ElevatorCar({ cfg }) {
  const m = getMaterials()
  const { x0, x1, z0, z1, baseY, floorH, floors, hall, labels, names, accent } = cfg
  const ctl = useMemo(() => createCar(cfg), [cfg])
  const cw = x1 - x0, cd = z1 - z0
  const ccx = (x0 + x1) / 2, ccz = (z0 + z1) / 2
  const s = hall === 'south' ? -1 : 1 // which way the hall is (sign of z)
  const rotHall = s < 0 ? Math.PI : 0 // plane faces the hall
  const rotIn = s < 0 ? 0 : Math.PI // plane faces into the car from the door face
  const frontZ = hall === 'south' ? z0 - 0.1 : z1 + 0.1
  const backZ = hall === 'south' ? z1 + 0.1 : z0 - 0.1
  const top = baseY + floors * floorH
  const midY = (baseY + top) / 2
  const Y = ctl.Y

  const car = useRef()
  const carCollider = useRef()
  const doorBodies = useRef([])
  const plaster = useMemo(() => surface('plaster', 1, 3, { color: '#c9c6bf' }), [])
  const wood = useMemo(() => surface('wood', 1, 1, { color: '#6a4a35' }), [])
  const display = useMemo(() => makeDisplay(accent), [accent])
  const dispMat = useMemo(() => new THREE.MeshBasicMaterial({ map: display.tex, toneMapped: false }), [display])

  // lights: one ring material shared by the car's LED strips, per-floor hall fixtures
  const ring = useMemo(() => mat('#ff4fb0', 1.2), [])
  const kick = useMemo(() => mat('#c9a96a', 1.6), [])
  const btn = useMemo(() => Array.from({ length: floors }, () => mat('#ffd27a', 0.15)), [floors])
  const hallBtn = useMemo(() => Array.from({ length: floors }, () => mat('#ffd27a', 0.15)), [floors])
  const up = useMemo(() => Array.from({ length: floors }, () => mat('#5dff9a', 0.05)), [floors])
  const down = useMemo(() => Array.from({ length: floors }, () => mat('#ff6a5a', 0.05)), [floors])
  const frame = useMemo(() => Array.from({ length: floors }, () => mat(accent, 0.5)), [floors, accent])
  const anchor = useMemo(() => ({ position: new THREE.Vector3(ccx, baseY + 2, ccz), color: new THREE.Color('#ff4fb0'), intensity: 10, distance: 7, range: 16, follow: () => ctl.y + 2.0 }), [ccx, ccz, baseY, ctl])
  const tmp = useMemo(() => new THREE.Color(), [])

  useEffect(() => registerCar(ctl), [ctl])
  useEffect(() => registerLightAnchor(anchor), [anchor])

  // interactions: a call button on every floor, and the floor picker in the car
  useEffect(() => {
    const offs = []
    const [hx, hz] = carHallPoint(cfg)
    for (let f = 0; f < floors; f++) {
      offs.push(registerInteractable(`car-${cfg.id}-call-${f}`, {
        position: new THREE.Vector3(hx, Y(f) + 1, hz),
        radius: 1.7,
        label: () => (ctl.floor === f && ctl.state === 'idle' ? 'Elevator is here' : 'Call elevator'),
        onInteract: () => ctl.call(f),
      }))
    }
    offs.push(registerInteractable(`car-${cfg.id}-panel`, {
      position: () => new THREE.Vector3(ccx, ctl.y + 1, ccz),
      radius: 1.3,
      label: 'Choose a floor',
      onInteract: () => useStore.getState().openPanel({ type: 'car', id: cfg.id }),
    }))
    return () => offs.forEach((o) => o())
  }, [cfg, ctl, floors, ccx, ccz]) // eslint-disable-line react-hooks/exhaustive-deps

  // arrival chime, only for people at that floor's doors or inside the car
  useEffect(() => {
    const [hx, hz] = carHallPoint(cfg)
    const on = (a) => {
      const p = playerState.position
      const near = Math.abs(p.y - Y(a.floor)) < 2 && Math.hypot(p.x - hx, p.z - hz) < 9
      if (near || ctl.contains(p)) chime(a.dir)
    }
    ctl.arrivalListeners.add(on)
    return () => ctl.arrivalListeners.delete(on)
  }, [cfg, ctl]) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    ctl.update(dt)
    if (car.current) car.current.setNextKinematicTranslation({ x: ccx, y: ctl.y, z: ccz })
    if (carCollider.current) ctl.carHandles = new Set([carCollider.current.handle])

    // hall doors: only the floor where the car stands opens
    for (let f = 0; f < floors; f++) {
      const open = Math.abs(ctl.y - Y(f)) < 0.01 ? ctl.door : 0
      const ease = open * open * (3 - 2 * open)
      for (let k = 0; k < 2; k++) {
        const b = doorBodies.current[f * 2 + k]
        if (!b) continue
        const base = ccx + (k ? 0.5 : -0.5) * LEAF
        b.setNextKinematicTranslation({ x: base + (k ? 1 : -1) * ease * (LEAF - 0.08), y: Y(f) + DOOR_H / 2, z: frontZ })
      }
    }

    // colour-flashing lights: slow colour drift at rest, fast flashing while moving, strobe on arrival
    const now = performance.now()
    const ui = ctl.useUI.getState()
    const busy = ctl.state === 'moving' || ctl.state === 'closing'
    const fresh = ui.arrival && now - ui.arrival.at < 4500
    const rate = busy ? 190 : fresh ? 140 : 1100
    tmp.set(PALETTE[Math.floor(now / rate) % PALETTE.length])
    const on = busy || fresh ? (Math.floor(now / (rate / 2)) % 2 ? 2.8 : 0.45) : 1.3
    ring.emissive.copy(tmp); ring.emissiveIntensity = on
    anchor.color.copy(tmp); anchor.intensity = busy || fresh ? (on > 1 ? 16 : 4) : 9

    for (let f = 0; f < floors; f++) {
      const lit = ui.lit.includes(f)
      btn[f].emissiveIntensity = lit ? 2.4 : 0.15
      hallBtn[f].emissiveIntensity = lit ? 2.4 : 0.15
      const here = fresh && ui.arrival.floor === f
      const blink = here ? 1.6 + Math.sin(now / 120) * 0.6 : 0
      up[f].emissiveIntensity = here && ui.arrival.dir >= 0 ? blink : 0.05
      down[f].emissiveIntensity = here && ui.arrival.dir <= 0 ? blink : 0.05
      const open = Math.abs(ctl.y - Y(f)) < 0.01 ? ctl.door : 0
      if (here || (open > 0 && open < 1)) { frame[f].emissive.copy(tmp); frame[f].emissiveIntensity = on }
      else { frame[f].emissive.set(accent); frame[f].emissiveIntensity = 0.5 + open * 1.0 }
    }
    display.draw(labels[Math.max(0, Math.min(floors - 1, ui.floor))], ui.direction)
  })

  const wallH = top - baseY
  const jambW = (cw + 0.4) / 2 - LEAF // width of each front jamb (door opening is 2 * LEAF wide)
  return (
    <group>
      {/* ---------------- shaft walls (static) ---------------- */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[(cw + 0.4) / 2, wallH / 2, 0.1]} position={[ccx, midY, backZ]} />
        {[x0 - 0.1, x1 + 0.1].map((x) => <CuboidCollider key={x} args={[0.1, wallH / 2, (cd + 0.4) / 2]} position={[x, midY, ccz]} />)}
        {[-1, 1].map((k) => <CuboidCollider key={k} args={[jambW / 2, wallH / 2, 0.1]} position={[ccx + k * (LEAF + jambW / 2), midY, frontZ]} />)}
        {Array.from({ length: floors }, (_, f) => (
          <group key={f}>
            <CuboidCollider args={[LEAF, (floorH - DOOR_H) / 2, 0.1]} position={[ccx, Y(f) + DOOR_H + (floorH - DOOR_H) / 2, frontZ]} />
            <CuboidCollider args={[LEAF, 0.15, 0.1]} position={[ccx, Y(f) - 0.15, frontZ]} />
          </group>
        ))}
      </RigidBody>
      <mesh position={[ccx, midY, backZ]} material={plaster}><boxGeometry args={[cw + 0.4, wallH, 0.2]} /></mesh>
      {[x0 - 0.1, x1 + 0.1].map((x) => <mesh key={x} position={[x, midY, ccz]} material={plaster}><boxGeometry args={[0.2, wallH, cd + 0.4]} /></mesh>)}
      {[-1, 1].map((k) => <mesh key={k} position={[ccx + k * (LEAF + jambW / 2), midY, frontZ]} material={plaster}><boxGeometry args={[jambW, wallH, 0.2]} /></mesh>)}
      {Array.from({ length: floors }, (_, f) => (
        <group key={f}>
          <mesh position={[ccx, Y(f) + DOOR_H + (floorH - DOOR_H) / 2, frontZ]} material={plaster}><boxGeometry args={[LEAF * 2, floorH - DOOR_H, 0.2]} /></mesh>
          <mesh position={[ccx, Y(f) - 0.15, frontZ]} material={m.aluminum}><boxGeometry args={[LEAF * 2, 0.3, 0.2]} /></mesh>
        </group>
      ))}

      <group userData={{ noBatch: true }}>
        {/* ---------------- the car ---------------- */}
        <RigidBody ref={car} type="kinematicPosition" colliders={false} position={[ccx, ctl.y, ccz]}>
          <CuboidCollider ref={carCollider} args={[cw / 2 - 0.02, 0.06, cd / 2 - 0.02]} position={[0, -0.06, 0]} />
          <mesh position={[0, -0.06, 0]} material={signatureMarble(1, 1)} receiveShadow><boxGeometry args={[cw, 0.12, cd]} /></mesh>
          <mesh position={[0, 2.55, 0]} material={m.aluminum}><boxGeometry args={[cw, 0.08, cd]} /></mesh>
          <mesh position={[0, 2.5, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[cw * 0.55, cd * 0.55]} /><meshStandardMaterial color="#fff" emissive="#fff3e2" emissiveIntensity={1.3} /></mesh>
          {/* side walls in wood, back wall brushed steel with a mirror */}
          {[-1, 1].map((k) => <mesh key={k} position={[k * (cw / 2 - 0.03), 1.27, 0]} material={wood}><boxGeometry args={[0.04, 2.55, cd]} /></mesh>)}
          <mesh position={[0, 1.27, -s * (cd / 2 - 0.03)]} material={m.aluminum}><boxGeometry args={[cw, 2.55, 0.04]} /></mesh>
          <mesh position={[0, 1.4, -s * (cd / 2 - 0.06)]} rotation={[0, s < 0 ? Math.PI : 0, 0]}><planeGeometry args={[cw * 0.7, 1.5]} /><meshStandardMaterial color="#cfd6dc" metalness={1} roughness={0.04} /></mesh>
          {[-1, 1].map((k) => <mesh key={'h' + k} position={[k * (cw / 2 - 0.1), 0.95, 0]} material={m.chrome}><boxGeometry args={[0.04, 0.04, cd - 0.3]} /></mesh>)}
          {/* colour-flashing LED ring around the ceiling, gold kick strips low */}
          {[-1, 1].map((k) => <mesh key={'rz' + k} position={[0, 2.47, k * (cd / 2 - 0.08)]} material={ring}><boxGeometry args={[cw - 0.2, 0.02, 0.04]} /></mesh>)}
          {[-1, 1].map((k) => <mesh key={'rx' + k} position={[k * (cw / 2 - 0.08), 2.47, 0]} material={ring}><boxGeometry args={[0.04, 0.02, cd - 0.2]} /></mesh>)}
          {[-1, 1].map((k) => <mesh key={'k' + k} position={[k * (cw / 2 - 0.06), 0.06, 0]} material={kick}><boxGeometry args={[0.02, 0.025, cd - 0.3]} /></mesh>)}
          {/* operating panel: display + one lit button per floor */}
          <group position={[cw / 2 - 0.05, 1.25, s * (cd / 2 - 0.55)]} rotation={[0, -Math.PI / 2, 0]}>
            <mesh position={[0, 0, -0.005]}><boxGeometry args={[0.32, 0.9, 0.02]} /><meshStandardMaterial color="#c9ccd2" metalness={1} roughness={0.25} /></mesh>
            <mesh position={[0, 0.32, 0.007]} material={dispMat}><planeGeometry args={[0.22, 0.11]} /></mesh>
            {Array.from({ length: floors }, (_, f) => (
              <mesh key={f} position={[f % 2 ? 0.06 : -0.06, 0.12 - Math.floor(f / 2) * 0.1, 0.012]} rotation={[Math.PI / 2, 0, 0]} material={btn[f]}>
                <cylinderGeometry args={[0.03, 0.03, 0.012, 20]} />
              </mesh>
            ))}
          </group>
          {/* floor number above the doors, inside the car */}
          <mesh position={[0, 2.3, s * (cd / 2 - 0.07)]} rotation={[0, rotIn, 0]} material={dispMat}><planeGeometry args={[0.36, 0.18]} /></mesh>
        </RigidBody>

        {/* ---------------- hall doors + fixtures on every floor ---------------- */}
        {Array.from({ length: floors * 2 }, (_, i) => {
          const f = Math.floor(i / 2), k = i % 2
          return (
            <RigidBody key={i} ref={(b) => (doorBodies.current[i] = b)} type="kinematicPosition" colliders={false} position={[ccx + (k ? 0.5 : -0.5) * LEAF, Y(f) + DOOR_H / 2, frontZ]}>
              <CuboidCollider args={[LEAF / 2, DOOR_H / 2, 0.03]} />
              <mesh material={m.aluminum} castShadow><boxGeometry args={[LEAF, DOOR_H, 0.05]} /></mesh>
            </RigidBody>
          )
        })}
        {Array.from({ length: floors }, (_, f) => {
          const hz = frontZ + s * 0.13
          return (
            <group key={f}>
              {/* position indicator, lanterns, call button and a colour-flashing door frame */}
              <mesh position={[ccx, Y(f) + DOOR_H + 0.28, hz]} rotation={[0, rotHall, 0]} material={dispMat}><planeGeometry args={[0.44, 0.22]} /></mesh>
              <mesh position={[ccx - 1.35, Y(f) + 1.95, hz]} rotation={[0, rotHall, 0]} material={up[f]}><circleGeometry args={[0.07, 3]} /></mesh>
              <mesh position={[ccx - 1.35, Y(f) + 1.72, hz]} rotation={[0, rotHall, Math.PI]} material={down[f]}><circleGeometry args={[0.07, 3]} /></mesh>
              <mesh position={[ccx + 1.35, Y(f) + 1.15, hz - s * 0.005]} material={m.blackSteel}><boxGeometry args={[0.12, 0.25, 0.02]} /></mesh>
              <mesh position={[ccx + 1.35, Y(f) + 1.15, hz + s * 0.012]} rotation={[Math.PI / 2, 0, 0]} material={hallBtn[f]}><cylinderGeometry args={[0.035, 0.035, 0.015, 20]} /></mesh>
              <mesh position={[ccx, Y(f) + DOOR_H + 0.01, hz - s * 0.02]} material={frame[f]}><boxGeometry args={[LEAF * 2 + 0.1, 0.04, 0.03]} /></mesh>
              {[-1, 1].map((k) => <mesh key={k} position={[ccx + k * (LEAF + 0.02), Y(f) + DOOR_H / 2, hz - s * 0.02]} material={frame[f]}><boxGeometry args={[0.04, DOOR_H, 0.03]} /></mesh>)}
              <BrandSign text={`FLOOR ${labels[f]}`} sub={names[f]} position={[ccx, Y(f) + DOOR_H + 0.85, hz]} rotation={[0, rotHall, 0]} width={2.4} size={80} color="#f4f1ea" glow="#c9a6ff" />
            </group>
          )
        })}
      </group>
    </group>
  )
}
