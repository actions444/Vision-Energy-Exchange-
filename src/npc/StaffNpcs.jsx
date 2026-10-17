import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import Avatar from '../player/Avatar.jsx'
import { playerState, registerInteractable } from '../state/runtime.js'
import { useStore } from '../state/store.js'
import { useEnv } from '../state/environment.js'
import { onDuty, useNpcShifts } from '../state/npcShifts.js'
import { sfx } from '../audio/sfx.js'
import { POOL } from '../config/island.js'
import { STAFF, STAFF_AREA, DECK } from '../config/staff.js'
import { EXTRA_PROPS } from './staffProps.jsx'
import { speakLine } from '../audio/tts.js'

// Staff NPCs of the Isla Serena Pool Lounge. Same realistic "social" avatar as the player, driven by a
// script (config/staff.js): walk the work lanes, carry a tray or towels, shake a cocktail, skim the pool,
// water the planters. They look up and wave when you come close, step aside-pause when you stand in their
// way, and press E talks to them. The lifeguard also watches the water (see `lifeguard()` below).

// Shifts: a roster entry may carry `shift: [from, to]` (in-game hours, may wrap past midnight) as its default work
// time; the owner can change it in Owner tools → NPC work times (state/npcShifts.js). Outside the shift the person is
// not on site: hidden and not talkable. Key posts (lifeguard, reception, bartenders, trainer) default to always on.
const lerpAngle = (a, b, k) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * Math.min(1, k) }
const CARRY_GESTURE = { tray: 'tray', trayEmpty: 'tray', towels: 'hold', net: 'hold', can: 'reach', clipboard: 'read', shaker: 'shake', glass: 'reach', brush: 'wipe', dumbbell: 'hold', tablet: 'read', towel: 'hold' }

// ---------------------------------------------------------------- hand props
let PM = null
const pm = () => PM || (PM = {
  steel: new THREE.MeshStandardMaterial({ color: '#c9ccd4', roughness: 0.25, metalness: 0.9 }),
  gold: new THREE.MeshStandardMaterial({ color: '#c9a96a', roughness: 0.3, metalness: 0.9 }),
  black: new THREE.MeshStandardMaterial({ color: '#111116', roughness: 0.35, metalness: 0.4 }),
  white: new THREE.MeshStandardMaterial({ color: '#f6f3ee', roughness: 0.85 }),
  teal: new THREE.MeshStandardMaterial({ color: '#2fd0c4', roughness: 0.8 }),
  pink: new THREE.MeshStandardMaterial({ color: '#ff2e9a', roughness: 0.8 }),
  yellow: new THREE.MeshStandardMaterial({ color: '#ffe83d', roughness: 0.8 }),
  green: new THREE.MeshStandardMaterial({ color: '#2f8a5a', roughness: 0.55, metalness: 0.2 }),
  paper: new THREE.MeshStandardMaterial({ color: '#f3eedf', roughness: 0.9 }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#dff9ff', roughness: 0.05, transmission: 0.0, transparent: true, opacity: 0.45 }),
  drinkTeal: new THREE.MeshStandardMaterial({ color: '#13d8c8', emissive: '#0aa59a', emissiveIntensity: 0.25, roughness: 0.3 }),
  drinkPink: new THREE.MeshStandardMaterial({ color: '#ff4fa8', emissive: '#c0246f', emissiveIntensity: 0.25, roughness: 0.3 }),
  drinkYellow: new THREE.MeshStandardMaterial({ color: '#ffd23f', emissive: '#b08a00', emissiveIntensity: 0.2, roughness: 0.3 }),
  net: new THREE.MeshStandardMaterial({ color: '#2a3a46', roughness: 0.9, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
})

function Drink({ x = 0, z = 0, mat = 'drinkTeal', h = 0.13 }) {
  const m = pm()
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2 + 0.008, 0]} material={m.glass}><cylinderGeometry args={[0.036, 0.028, h, 12]} /></mesh>
      <mesh position={[0, h * 0.4, 0]} material={m[mat]}><cylinderGeometry args={[0.031, 0.026, h * 0.72, 12]} /></mesh>
    </group>
  )
}

function Tray({ full }) {
  const m = pm()
  return (
    <group>
      <mesh material={m.black}><cylinderGeometry args={[0.21, 0.21, 0.016, 24]} /></mesh>
      <mesh position={[0, 0.009, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.gold}><torusGeometry args={[0.205, 0.006, 6, 28]} /></mesh>
      {full && (
        <group position={[0, 0.008, 0]}>
          <Drink x={-0.08} z={0.04} mat="drinkTeal" />
          <Drink x={0.07} z={0.06} mat="drinkPink" />
          <Drink x={0.0} z={-0.07} mat="drinkYellow" />
        </group>
      )}
    </group>
  )
}

function Towels() {
  const m = pm()
  return (
    <group>
      {[[m.white, 0], [m.teal, 0.075], [m.white, 0.15], [m.pink, 0.225]].map(([mat, y], i) => (
        <mesh key={i} position={[0, y, 0]} material={mat}><boxGeometry args={[0.34, 0.07, 0.24]} /></mesh>
      ))}
    </group>
  )
}

function Shaker() {
  const m = pm()
  return (
    <group>
      <mesh material={m.steel}><cylinderGeometry args={[0.05, 0.036, 0.15, 14]} /></mesh>
      <mesh position={[0, 0.1, 0]} material={m.steel}><cylinderGeometry args={[0.036, 0.05, 0.06, 14]} /></mesh>
      <mesh position={[0, 0.138, 0]} material={m.gold}><sphereGeometry args={[0.018, 8, 6]} /></mesh>
    </group>
  )
}

function Net() {
  const m = pm()
  // pole held at the hip, tipping down toward the water; local +z is forward, the net frame sits at the far end
  return (
    <group rotation={[0.62, 0, 0]}>
      <mesh position={[0, 0, 1.25]} rotation={[Math.PI / 2, 0, 0]} material={m.steel}><cylinderGeometry args={[0.012, 0.012, 2.9, 8]} /></mesh>
      <group position={[0, 0, 2.7]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={m.steel}><torusGeometry args={[0.2, 0.012, 6, 20]} /></mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={m.net}><circleGeometry args={[0.2, 20]} /></mesh>
      </group>
    </group>
  )
}

function Can() {
  const m = pm()
  return (
    <group rotation={[0, 0, 0]}>
      <mesh material={m.green}><cylinderGeometry args={[0.1, 0.1, 0.2, 14]} /></mesh>
      <mesh position={[0, 0.13, 0.0]} rotation={[0, 0, Math.PI / 2]} material={m.green}><torusGeometry args={[0.07, 0.01, 6, 14, Math.PI]} /></mesh>
      <mesh position={[0, 0.06, 0.2]} rotation={[0.9, 0, 0]} material={m.green}><cylinderGeometry args={[0.014, 0.022, 0.3, 8]} /></mesh>
      <mesh position={[0, 0.17, 0.33]} rotation={[0.9, 0, 0]} material={m.steel}><cylinderGeometry args={[0.04, 0.025, 0.03, 10]} /></mesh>
    </group>
  )
}

function Clipboard() {
  const m = pm()
  return (
    <group>
      <mesh material={m.black}><boxGeometry args={[0.24, 0.32, 0.012]} /></mesh>
      <mesh position={[0, 0, 0.008]} material={m.paper}><boxGeometry args={[0.21, 0.28, 0.004]} /></mesh>
      <mesh position={[0, 0.15, 0.012]} material={m.gold}><boxGeometry args={[0.09, 0.025, 0.012]} /></mesh>
    </group>
  )
}

// where each prop sits relative to the figure (origin on the floor, facing +z)
const PROPS = {
  tray: { C: () => <Tray full />, pos: [0, 1.02, 0.34] },
  trayEmpty: { C: () => <Tray />, pos: [0, 1.02, 0.34] },
  towels: { C: Towels, pos: [0, 1.0, 0.34] },
  shaker: { C: Shaker, pos: [0.18, 1.42, 0.3] },
  glass: { C: () => <Drink x={0} z={0} mat="drinkPink" h={0.16} />, pos: [0, 1.085, 0.82] },
  net: { C: Net, pos: [0.26, 1.02, 0.2] },
  can: { C: Can, pos: [-0.2, 0.98, 0.36] },
  clipboard: { C: Clipboard, pos: [0.0, 1.12, 0.3], rot: [-0.5, 0, 0] },
}

/** A towel cart for the pool attendant: steel frame, shelves, stacks of rolled towels. */
function TowelCart({ position, yaw = 0 }) {
  const m = pm()
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[0.5, 0.45, 0.28]} position={[0, 0.5, 0]} />
      {[[-0.46, -0.24], [0.46, -0.24], [-0.46, 0.24], [0.46, 0.24]].map(([x, z], i) => <mesh key={i} position={[x, 0.46, z]} material={m.steel}><boxGeometry args={[0.03, 0.88, 0.03]} /></mesh>)}
      {[0.18, 0.55, 0.92].map((y) => <mesh key={y} position={[0, y, 0]} material={m.steel}><boxGeometry args={[1.0, 0.025, 0.54]} /></mesh>)}
      {[[-0.46, 0.06, -0.24], [0.46, 0.06, -0.24], [-0.46, 0.06, 0.24], [0.46, 0.06, 0.24]].map(([x, y, z], i) => <mesh key={i} position={[x, y, z]} rotation={[0, 0, Math.PI / 2]} material={m.black}><cylinderGeometry args={[0.05, 0.05, 0.04, 12]} /></mesh>)}
      {[[-0.28, 0.21], [0.05, 0.21], [-0.2, 0.58], [0.2, 0.58]].map(([x, y], i) => (
        <group key={i} position={[x, y, 0]}>
          {[[m.white, 0], [m.teal, 0.075], [m.white, 0.15], [m.pink, 0.225]].map(([mat, dy], j) => <mesh key={j} position={[0, dy + 0.04, 0]} material={mat}><boxGeometry args={[0.36, 0.07, 0.4]} /></mesh>)}
        </group>
      ))}
      <mesh position={[0, 0.95, 0.27]} material={m.gold}><boxGeometry args={[1.0, 0.02, 0.02]} /></mesh>
    </RigidBody>
  )
}

// ---------------------------------------------------------------- lifeguard: watches the water and the deck
const GUARD_POINTS = (() => {
  // places on the north coping from which the lifeguard can reach every part of the pool
  const out = []
  for (let x = POOL.x0 + 1; x <= POOL.x1 - 1; x += 2) out.push([x, POOL.z0 - POOL.rim * 0.7])
  return out
})()
const DECK_RECT = { x0: 285.4, x1: 316.6, z0: -81.2, z1: -68.4 }
const onDeck = (p) => p.x > DECK_RECT.x0 && p.x < DECK_RECT.x1 && p.z > DECK_RECT.z0 && p.z < DECK_RECT.z1 && p.y > DECK - 0.5 && p.y < DECK + 1.5

/** A crew of working avatars. `staff` is a roster (config/staff.js format), `area` {x, z, r} is where they are drawn. */
export function StaffCrew({ staff = STAFF, area = STAFF_AREA, name = 'staff', place = 'Isla Serena Pool Lounge', children, floorY = DECK }) {
  const root = useRef()
  const { camera } = useThree()
  const refs = useRef([])
  const propRefs = useRef([])
  const sim = useMemo(() => staff.map((r, i) => {
    const [sx, sz, sy] = r.start
    return {
      r, x: sx, z: sz, y: r.y, yaw: sy, ai: 0, ph: 'new', wp: 0, t: 0, gi: 0, gT: 0, greetCool: 0, waveAt: 0, lines: 0,
      avatar: { speed: 0, grounded: true, emote: null, sit: 0, sitHeight: 0.45, sing: 0, gesture: null },
      carry: null, over: null, ruleCool: 0, whistled: false,
    }
  }), [])

  useEffect(() => { useNpcShifts.getState().register(staff.map((r) => ({ id: name + ':' + r.id, name: r.name, title: r.title, place, def: r.shift || null }))) }, [staff, name, place])

  // staggered start so the shifts do not move in lock-step
  useEffect(() => { sim.forEach((s, i) => { s.ai = (i * 3) % s.r.plan.length; const a = s.r.plan[s.ai]; if (a.k === 'go') { s.x = a.path[0][0]; s.z = a.path[0][1] } else if (a.k === 'hold' && s.ai > 0) { const prev = s.r.plan[s.ai - 1]; if (prev?.k === 'go') { const e = prev.path[prev.path.length - 1]; s.x = e[0]; s.z = e[1] } } }) }, [sim])

  useEffect(() => {
    const offs = sim.map((s) => {
      const v = new THREE.Vector3()
      return registerInteractable('staff-' + s.r.id, {
        position: () => v.set(s.x, s.off ? -500 : s.y + 1, s.z),
        radius: 2.2,
        label: () => `Talk to ${s.r.name} · ${s.r.title}`,
        onInteract: () => {
          const line = s.r.lines[s.lines++ % s.r.lines.length]
          useStore.getState().showToast(`${s.r.name} (${s.r.title}): "${line}"`)
          speakLine(line, { id: s.r.name })
          s.greetCool = 20
        },
      })
    })
    return () => offs.forEach((o) => o())
  }, [sim])

  const clock = useRef(0)
  const tick = (dt, time) => {
    const pp = playerState.position
    const inWater = playerState.swim === 'swim' && playerState.headUnder
    const hour = useEnv.getState().time
    sim.forEach((s, i) => {
      const r = s.r, av = s.avatar
      const working = onDuty(name + ':' + r.id, r.shift, hour)
      if (!working) {
        if (!s.off) { s.off = true; const g0 = refs.current[i]; if (g0) g0.visible = false }
        return
      }
      if (s.off) { // clocking in: back to the start of the routine
        s.off = false; s.ai = 0; s.ph = 'new'; s.x = r.start[0]; s.z = r.start[1]; s.yaw = r.start[2]; s.carry = null; s.over = null
        const g0 = refs.current[i]; if (g0) g0.visible = true
      }
      const dxp = pp.x - s.x, dzp = pp.z - s.z
      const dp = Math.hypot(dxp, dzp)
      const playerHere = dp < 3.2 && Math.abs(pp.y - s.y) < 2.5
      let walking = false
      let act = r.plan[s.ai]

      // ---- lifeguard overrides: someone is in trouble, or has just been pulled out, or is running on the deck ----
      if (r.role === 'lifeguard') {
        s.ruleCool -= dt
        const drowning = playerState.swim === 'swim' && playerState.headUnder && playerState.breath < 0.45
        const rescued = playerState.rescuedAt !== undefined && time - playerState.rescuedAt < 9
        const running = playerState.speed > 4.6 && playerState.grounded && onDeck(pp) && dp < 14 && !playerState.vehicle
        if (drowning && (!s.over || s.over.k !== 'alert')) {
          let best = GUARD_POINTS[0], bd = 1e9
          for (const p of GUARD_POINTS) { const d = Math.abs(p[0] - pp.x); if (d < bd) { bd = d; best = p } }
          s.over = { k: 'alert', target: best, whistled: false }
        } else if (!drowning && s.over?.k === 'alert' && !rescued) s.over = null
        if (rescued && !s.over) s.over = { k: 'assist', until: time + 8 }
        if (s.over?.k === 'assist' && (time > s.over.until || !rescued)) s.over = null
        if (running && !s.over && s.ruleCool <= 0 && !drowning) {
          s.ruleCool = 60
          s.over = { k: 'warn', until: time + 3.2, whistled: false }
        }
        if (s.over?.k === 'warn' && time > s.over.until) s.over = null
      }

      if (s.over) {
        const o = s.over
        let tgt = null, speed = r.speed * 2.6
        if (o.k === 'alert') tgt = o.target
        else if (o.k === 'assist') { const d = Math.max(dp, 0.01); tgt = [pp.x - (dxp / d) * 1.3, pp.z - (dzp / d) * 1.3] }
        const dx = tgt ? tgt[0] - s.x : 0, dz = tgt ? tgt[1] - s.z : 0, d = Math.hypot(dx, dz)
        if (tgt && d > 0.12) {
          const step = Math.min(d, speed * dt)
          s.x += (dx / d) * step; s.z += (dz / d) * step
          s.yaw = lerpAngle(s.yaw, Math.atan2(dx, dz), dt * 9)
          av.speed = speed; walking = true
          av.gesture = null; av.sing = 0; av.workout = null; av.sit = 0
          s.carry = null
        } else {
          av.speed = Math.max(0, av.speed - dt * 8)
          s.yaw = lerpAngle(s.yaw, Math.atan2(dxp, dzp), dt * 8)
          av.gesture = o.k === 'assist' ? 'open' : 'blow'
          av.sing = o.k === 'assist' ? 0.3 : 0
          if ((o.k === 'alert' || o.k === 'warn') && !o.whistled) {
            o.whistled = true
            if (dp < 40) sfx.whistle()
            if (o.k === 'warn') useStore.getState().showToast('Marcus (Lifeguard): "Walk on the pool deck, please!"')
          }
        }
        s.t = 0
        av.emote = null
      } else if (act.k === 'go' || act.k === 'hold') {
        if (s.ph === 'new') {
          s.ph = act.k === 'go' ? 'go' : 'hold'
          s.wp = 0; s.t = act.t || 0; s.gi = 0; s.gT = 0
          if (act.carry !== undefined) s.carry = act.carry
          else if (act.k === 'hold') s.carry = null
        }
        if (act.k === 'go') {
          if (act.carry !== undefined) s.carry = act.carry; else s.carry = null
          const tgt = act.path[Math.min(s.wp, act.path.length - 1)]
          const dx = tgt[0] - s.x, dz = tgt[1] - s.z
          const d = Math.hypot(dx, dz)
          const speed = r.speed
          const step = speed * dt
          // pause when the player stands right in front of the staff member
          const ahead = d > 0.01 ? (dxp * dx + dzp * dz) / (d * Math.max(dp, 0.01)) : 0
          const blocked = playerHere && dp < 1.35 && ahead > 0.35
          if (blocked) av.speed = Math.max(0, av.speed - dt * 8)
          else if (d <= step) {
            s.x = tgt[0]; s.z = tgt[1]; s.wp++
            if (s.wp >= act.path.length) { s.ai = (s.ai + 1) % r.plan.length; s.ph = 'new'; return }
          } else {
            s.x += (dx / d) * step; s.z += (dz / d) * step
            s.yaw = lerpAngle(s.yaw, Math.atan2(dx, dz), dt * 7)
            av.speed = speed; walking = true
          }
          av.workout = null; av.sit = 0
          av.gesture = act.g ? act.g[0] : (CARRY_GESTURE[act.carry] && act.carry !== 'shaker' && act.carry !== 'glass' ? CARRY_GESTURE[act.carry] : null)
          av.sing = 0
        } else {
          av.speed = Math.max(0, av.speed - dt * 8)
          s.t -= dt
          const yawT = act.face ? Math.atan2(act.face[0] - s.x, act.face[1] - s.z) : act.yaw
          if (yawT !== undefined && !(playerHere && !act.stay)) s.yaw = lerpAngle(s.yaw, yawT + (act.sweep ? Math.sin(time * 0.45 + i) * act.sweep : 0), dt * (act.sweep ? 1.4 : 4))
          const gs = act.g || []
          s.gT += dt
          if (s.gT > 4.5) { s.gT = 0; s.gi++ }
          av.gesture = gs.length ? gs[s.gi % gs.length] : null
          av.workout = act.wk || null // gym: a workout pose (see player/workoutPose.js)
          av.sit = act.sit ? 1 : 0; av.sitHeight = act.sitH || 0.45
          av.sing = act.talk ? act.talk * (playerHere ? 0.8 : 0.5 + 0.5 * Math.sin(time * 0.7 + i)) : 0
          if (s.t <= 0 && !(playerHere && r.role === 'bartender' && act.talk)) { s.ai = (s.ai + 1) % r.plan.length; s.ph = 'new' }
        }
      }

      // greet the player: look up and wave once in a while (not while carrying something)
      s.greetCool -= dt
      const exercising = !!(act && act.k === 'hold' && act.wk && !s.over) // members mid-set ignore visitors
      const busy = exercising || s.carry === 'tray' || s.carry === 'towels' || s.carry === 'net' || s.carry === 'can' || s.over
      if (playerHere && !walking && s.greetCool <= 0 && !busy) {
        s.greetCool = 30; s.waveAt = time + 1.8
        s.yaw = Math.atan2(dxp, dzp)
      }
      av.emote = time < s.waveAt && !busy ? 'wave' : null
      if (playerHere && !walking && !busy && !s.over) s.yaw = lerpAngle(s.yaw, Math.atan2(dxp, dzp), dt * 3)

      const g = refs.current[i]
      if (g) { g.position.set(s.x, s.y, s.z); g.rotation.y = s.yaw }
      const pr = propRefs.current[i]
      if (pr) for (const k in pr) {
        const on = s.carry === k
        pr[k].visible = on
        if (on && k === 'shaker') pr[k].position.y = PROPS.shaker.pos[1] + (av.gesture === 'shake' ? Math.sin(time * 15) * 0.045 : 0)
      }
    })
  }
  useFrame((st, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1)
    const c = camera.position
    const near = Math.hypot(c.x - area.x, c.z - area.z) < area.r
    if (root.current) root.current.visible = near
    clock.current = st.clock.elapsedTime
    tick(dt, st.clock.elapsedTime)
  })
  useEffect(() => {
    const reg = { sim, refs, tick: (dt, n = 1) => { for (let i = 0; i < n; i++) { clock.current += dt; tick(dt, clock.current) } } }
    window.__vswCrews = window.__vswCrews || {}
    window.__vswCrews[name] = reg
    if (name === 'staff') window.__vswStaff = reg
    return () => { delete window.__vswCrews[name]; if (name === 'staff') delete window.__vswStaff }
  }, [sim]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <group ref={root} userData={{ noBatch: true }}>
      {children}
      {staff.map((r, i) => {
        const used = new Set(r.plan.map((a) => a.carry).filter(Boolean))
        propRefs.current[i] = propRefs.current[i] || {}
        return (
          <group key={r.id} ref={(el) => { refs.current[i] = el }} scale={r.scale || 1}>
            <Avatar state={sim[i].avatar} skin={r.skin} look={{ social: true, noVisor: true, ...r.look, eyes: r.look.eyes || '#3a2316' }} />
            {[...used].map((k) => {
              const P = PROPS[k] || EXTRA_PROPS[k]
              return (
                <group key={k} ref={(el) => { if (el) propRefs.current[i][k] = el }} position={P.pos} rotation={P.rot || [0, 0, 0]} visible={false}>
                  <P.C />
                </group>
              )
            })}
          </group>
        )
      })}
    </group>
  )
}

/** The Isla Serena pool lounge crew. */
export default function StaffNpcs() {
  return (
    <StaffCrew staff={STAFF} area={STAFF_AREA} name="staff">
      <TowelCart position={[313.7, DECK, -79.45]} yaw={0} />
    </StaffCrew>
  )
}
