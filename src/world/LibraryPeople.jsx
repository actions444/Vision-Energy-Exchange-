import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import Avatar from '../player/Avatar.jsx'
import { playerState, registerInteractable } from '../state/runtime.js'
import { useStore } from '../state/store.js'
import { useEnv } from '../state/environment.js'
import { onDuty, useNpcShifts } from '../state/npcShifts.js'
import { useLibrary, live } from '../state/library.js'
import { LIB, CURB, STATIONS, BOARD_SIDE, teacherSpot, patronSeat, READ_SEATS, AISLES, TEACHERS, LIBRARIAN, PATRONS, BOOKS, PROJECTS } from '../config/library.js'
import { speakLine } from '../audio/tts.js'

// The people of the library: a head librarian, six AI teachers and a handful of community visitors.
// Everyone is the same realistic "social" avatar the player can use, driven by a small script: walk
// along the library's lanes, browse the stacks, sit and read, teach at a project table, help a visitor,
// read aloud at the Story Circle. They look up and wave when you come close; press E to talk.

const L1 = -58.7, L2 = -48.3, CORR = -75.2
const NORTH = 0, SOUTH = Math.PI, EAST = Math.PI / 2, WEST = -Math.PI / 2
const SEAT_H = 0.47

// ---- route helpers (every activity starts and ends on lane L1; paths are reversible) ----
const endX = (s) => s.t[0] - BOARD_SIDE[s.id] * 2.4 // the open end of a table (the side without the board)
const pathTeacher = (s) => { const [tx] = s.t, sz = teacherSpot(s)[1], ex = endX(s); return [[ex, L1], [ex, sz], [tx, sz]] }
const pathPatron = (s) => {
  const [sx, sz] = patronSeat(s)
  return s.t[1] < -49 ? [[sx, L1], [sx, sz - 0.8]] : [[endX(s), L1], [endX(s), L2], [sx, L2], [sx, sz - 0.8]]
}
const pathShelf = (aisle, x) => [[CORR, L1], [CORR, AISLES[aisle]], [x, AISLES[aisle]]]
const behind = ([x, z, yaw], d = 0.8) => [x - Math.sin(yaw) * d, z - Math.cos(yaw) * d]
const pathReadSeat = (i) => { const s = READ_SEATS[i]; const [bx, bz] = behind(s, 1.0); return [[s[0], L1], [bx, -66], [bx, bz]] }
const pathDesk = [[-54.2, L1], [-54.2, -63.4]]
const pathStory = (tx = -79.4) => [[CORR, L1], [CORR, L2], [CORR, -44.3], [tx, -44.3]]
const pathDoor = [[-50.5, L1]]
const rev = (p) => p.slice().reverse()

// ---- act builders ----
const go = (path, label, inb) => ({ k: 'go', path, label, in: !!inb })
const hold = (t, o = {}) => ({ k: 'hold', t, ...o })
const sit = (seat, t, o = {}) => ({ k: 'sit', seat, t, ...o })
/** walk in, do something, walk back to the main lane */
const visit = (path, acts, label) => [go(path, label, true), ...acts, go(rev(path))]

function planTeacher(t) {
  const st = t.station && STATIONS[t.station]
  const book = BOOKS[t.book]
  const proj = PROJECTS[t.project]
  const gesture = ['open', 'point', 'chest', 'open', 'hold']
  const teach = (n) => ({ ...hold(n, { g: gesture, talk: 0.35, label: `Teaching ${proj.title} at the ${st?.name || 'Story Circle'}` }) })
  if (t.id === 'whitfield') {
    return [
      ...visit(pathStory(), [sit([-80.2, -44.3, WEST], 55, { g: ['read'], talk: 0.45, book: true, bookColor: '#e07a5f', label: `Reading "${book.title}" aloud at the Story Circle` })], 'Heading to the Story Circle'),
      ...visit(pathShelf(0, -84), [hold(9, { yaw: NORTH, g: ['read'], book: true, label: 'Choosing a picture book in Fiction' })], 'Heading to Fiction'),
      ...visit(pathReadSeat(2), [sit(READ_SEATS[2], 28, { g: ['read'], book: true, bookColor: '#e07a5f', label: `Reading "${book.title}" in the Reading Room` })], 'Heading to the Reading Room'),
    ]
  }
  if (t.id === 'brooks') {
    return [
      ...visit(pathShelf(2, -86), [hold(10, { yaw: SOUTH, g: ['read'], book: true, label: 'Browsing History' })], 'Heading to History'),
      ...visit(pathReadSeat(3), [sit(READ_SEATS[3], 30, { g: ['read'], book: true, bookColor: '#8c6d3a', label: `Reading "${book.title}" in the Reading Room` })], 'Heading to the Reading Room'),
      ...visit(pathDesk, [hold(10, { yaw: EAST, g: ['open'], talk: 0.35, label: 'Chatting with the head librarian' })], 'Stopping by the desk'),
      ...visit(pathPatron(STATIONS.writing), [hold(14, { yaw: NORTH, g: ['point'], talk: 0.3, label: 'Helping a visitor with a budget plan' })], 'Helping a visitor'),
    ]
  }
  const s = st
  const sp = teacherSpot(s)
  const board = BOARD_SIDE[s.id] > 0 ? EAST : WEST
  return [
    ...visit(pathTeacher(s), [hold(48, { yaw: board, g: gesture, talk: 0.38, label: teach(0).label })], `Heading to the ${s.name}`),
    ...visit(pathPatron(s), [hold(16, { yaw: NORTH, g: ['point', 'write'], talk: 0.3, label: `Helping a visitor with ${proj.title}` })], 'Checking on a visitor'),
    ...visit(pathShelf(t.id === 'okafor' ? 0 : t.id === 'bell' ? 1 : t.id === 'vargas' ? 3 : 1, t.id === 'kim' ? -85 : -83), [hold(8, { yaw: t.id === 'vargas' ? SOUTH : NORTH, g: ['read'], book: true, label: `Browsing the stacks for the ${s.name}` })], 'Browsing the stacks'),
    ...visit(pathReadSeat(t.id === 'okafor' || t.id === 'vargas' ? 0 : 1), [sit(READ_SEATS[t.id === 'okafor' || t.id === 'vargas' ? 0 : 1], 26, { g: ['read'], book: true, bookColor: ['#3d5a80', '#8c4a3a', '#2f6a4f', '#6b4a8a'][t.id.length % 4], label: `Reading "${book.title}" in the Reading Room` })], 'Heading to the Reading Room'),
  ]
}

function planLibrarian() {
  return [
    ...visit(pathDesk, [hold(42, { yaw: EAST, g: ['write', 'hold'], label: 'Checking books in and out at the desk' })], 'Heading to the desk'),
    ...visit(pathShelf(1, -80), [hold(14, { yaw: NORTH, g: ['read'], book: true, bookColor: '#2a6fd0', label: 'Reshelving books in Science' })], 'Reshelving'),
    ...visit(pathDesk, [hold(30, { yaw: EAST, g: ['open', 'write'], talk: 0.3, label: 'Helping a visitor find a book' })], 'Heading to the desk'),
    ...visit(pathReadSeat(1), [sit(READ_SEATS[1], 14, { g: ['read'], book: true, bookColor: '#2f6a4f', label: `Reading "${BOOKS.carter.title}" on her break` })], 'Taking a break'),
  ]
}

function planPatron(p) {
  const S = STATIONS[p.home]
  if (p.home === 'read') {
    return [
      ...visit(pathReadSeat(2), [sit(READ_SEATS[2], 70, { g: ['read'], book: true, bookColor: '#8c4a3a', label: 'Reading in the Reading Room' })], 'Heading to the Reading Room'),
      ...visit(pathShelf(2, -87), [hold(10, { yaw: SOUTH, g: ['read'], book: true, label: 'Browsing History' })], 'Browsing'),
    ]
  }
  if (p.home === 'story') {
    return [{ k: 'go', in: true, path: [[CORR, L1], [CORR, L2], [CORR, -44.3], [-83.6, -44.8], [-83.6, -46.2]], label: 'Heading to the Story Circle' }, sit([-85.2, -45.4, EAST, 0.3], 9999, { g: ['hold'], label: 'Listening to the story', kid: true })]
  }
  return [
    ...visit(pathPatron(S), [sit([...patronSeat(S), NORTH], 62, { g: ['write'], label: `Working on ${PROJECTS[TEACHERS.find((t) => t.station === S.id).project].title}` })], `Heading to the ${S.name}`),
    ...visit(pathShelf(p.id === 'jordan' ? 0 : p.id === 'priya' ? 1 : p.id === 'mateo' ? 3 : 2, -81), [hold(9, { yaw: p.id === 'mateo' ? SOUTH : NORTH, g: ['read'], book: true, label: 'Looking for a book for the project' })], 'Browsing'),
  ]
}

const ROSTER = [
  { ...LIBRARIAN, role: 'librarian', shift: [8, 20], plan: planLibrarian(), start: { x: -54.2, z: -63.4, yaw: EAST } },
  ...TEACHERS.map((t) => ({ ...t, role: 'teacher', shift: [9, 18], plan: planTeacher(t) })),
  ...PATRONS.map((p) => ({ ...p, role: 'patron', shift: [10, 19], plan: planPatron(p), subject: 'Library visitor', kid: p.id === 'mei', scale: p.id === 'mei' ? 0.78 : 1 })),
]

// stagger the starting points of the loops so nobody moves in lock-step
ROSTER.forEach((r, i) => {
  const inb = r.plan.map((a, k) => (a.in ? k : -1)).filter((k) => k >= 0)
  r.offset = inb[i % inb.length]
  r.bookColor = ['#3d5a80', '#8c4a3a', '#2f6a4f', '#6b4a8a', '#c0793a', '#2a6fd0', '#e07a5f'][i % 7]
})

const lerpAngle = (a, b, k) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * Math.min(1, k) }

function Book({ color = '#3d5a80' }) {
  return (
    <group>
      <mesh position={[0, 0, -0.012]}><boxGeometry args={[0.2, 0.27, 0.012]} /><meshStandardMaterial color={color} roughness={0.6} /></mesh>
      <mesh position={[0, 0, 0.004]}><boxGeometry args={[0.185, 0.25, 0.02]} /><meshStandardMaterial color="#f3eedf" roughness={0.9} /></mesh>
      <mesh position={[0, 0, 0.016]}><boxGeometry args={[0.2, 0.27, 0.006]} /><meshStandardMaterial color={color} roughness={0.6} /></mesh>
    </group>
  )
}

export default function LibraryPeople() {
  const root = useRef()
  const { camera } = useThree()
  const refs = useRef([])
  const bookRefs = useRef([])
  const sim = useMemo(() => ROSTER.map((r, i) => {
    const first = r.start || { x: -50.5, z: L1, yaw: WEST }
    return {
      r, x: first.x, z: first.z, yaw: first.yaw ?? WEST, ai: r.offset, ph: 'new', wp: 0, t: 0, sitT: 0, from: null, to: null, approach: null,
      avatar: { speed: 0, grounded: true, emote: null, sit: 0, sitHeight: SEAT_H, sing: 0, gesture: null },
      waveAt: 0, greetCool: 0, gi: 0, gT: 0, book: false, bookColor: '#3d5a80',
    }
  }), [])

  // start each person near the lane so they walk in rather than pop in
  useEffect(() => {
    sim.forEach((s, i) => {
      const a = s.r.plan[s.ai]
      if (a?.k === 'go') { s.x = a.path[0][0]; s.z = a.path[0][1] }
    })
  }, [sim])

  useEffect(() => {
    const v = new THREE.Vector3()
    const offs = sim.map((s, i) => registerInteractable('lib-npc-' + s.r.id, {
      position: () => v.set(s.x, s.off ? -500 : CURB + 1, s.z),
      radius: 2.4,
      label: () => `Talk to ${s.r.name} · ${s.r.subject}`,
      onInteract: () => {
        if (s.r.role === 'patron') {
          const line = { jordan: 'I am writing a mini-book about my grandmother\'s kitchen.', priya: 'My night-light finally charges in the window. Ask Dr. Bell how it works!', mateo: 'I am collaging the corner store where I grew up.', lily: 'My game has a cat that dodges falling fish. It is harder than it sounds.', hall: 'Retired, finally have time to read all of these.', mei: 'Shh, the story is about to start!' }[s.r.id]
          useStore.getState().showToast(`${s.r.name}: "${line}"`)
          speakLine(line, { id: s.r.name })
          return
        }
        useLibrary.getState().open(s.r.id, 'teacher')
        useStore.getState().openPanel({ type: 'library' })
      },
    }))
    return () => offs.forEach((o) => o())
  }, [sim])

  useEffect(() => { useNpcShifts.getState().register(ROSTER.map((r) => ({ id: 'library:' + r.id, name: r.name, title: r.subject || r.title || r.role, place: 'Public Library', def: r.shift || null }))) }, [])

  const tick = (dt, time) => {
    const pp = playerState.position
    const hour = useEnv.getState().time
    sim.forEach((s, i) => {
      const r = s.r
      if (!onDuty('library:' + r.id, r.shift, hour)) { // off shift: not in the building
        if (!s.off) { s.off = true; const g0 = refs.current[i]; if (g0) g0.visible = false }
        return
      }
      if (s.off) { s.off = false; s.ph = 'new'; const g0 = refs.current[i]; if (g0) g0.visible = true }
      const a = r.plan[s.ai]
      const av = s.avatar
      const dxp = pp.x - s.x, dzp = pp.z - s.z
      const dp = Math.hypot(dxp, dzp)
      const playerHere = dp < 3.4 && Math.abs(pp.y - CURB) < 2.5
      let walking = false

      if (s.ph === 'new') {
        s.ph = a.k === 'go' ? 'go' : 'hold'
        s.wp = 0; s.t = a.t || 0
        live[r.id] = a.label || ''
      }

      if (a.k === 'go') {
        if (s.ph === 'go' && a.in && s.wp === 0 && s.t === 0 && !s.started) { s.started = true; s.book = false }
        const tgt = a.path[Math.min(s.wp, a.path.length - 1)]
        const dx = tgt[0] - s.x, dz = tgt[1] - s.z
        const d = Math.hypot(dx, dz)
        const speed = r.role === 'patron' ? 1.05 : 1.25
        const step = speed * dt
        const blocked = playerHere && d > 0.1 && dp < 1.7 && r.role !== 'patron'
        if (blocked) {
          av.speed = Math.max(0, av.speed - dt * 8) // pause for a moment when you step in front of someone
        } else if (d <= step) {
          s.x = tgt[0]; s.z = tgt[1]; s.wp++
          if (s.wp >= a.path.length) { s.ai = (s.ai + 1) % r.plan.length; s.ph = 'new'; s.started = false; return }
        } else {
          s.x += (dx / d) * step; s.z += (dz / d) * step
          s.yaw = lerpAngle(s.yaw, Math.atan2(dx, dz), dt * 7)
          av.speed = speed; walking = true
        }
        av.gesture = s.book ? 'read' : null
        av.sing = 0
        if (a.label) live[r.id] = a.label
      } else if (a.k === 'hold') {
        av.speed = Math.max(0, av.speed - dt * 8)
        s.t -= dt
        if (a.yaw !== undefined && !playerHere) s.yaw = lerpAngle(s.yaw, a.yaw, dt * 4)
        const gs = a.g || []
        s.gT += dt
        if (s.gT > 4.5) { s.gT = 0; s.gi++ }
        av.gesture = gs.length ? gs[s.gi % gs.length] : null
        av.sing = a.talk && playerHere ? a.talk * 0.7 : a.talk ? a.talk * (0.5 + 0.5 * Math.sin(time * 0.7 + i)) : 0
        if (a.book) s.book = true
        live[r.id] = a.label || ''
        if (s.t <= 0 && !(playerHere && r.role === 'teacher')) { s.ai = (s.ai + 1) % r.plan.length; s.ph = 'new' }
      } else if (a.k === 'sit') {
        const [sx, sz, syaw, sh = SEAT_H] = a.seat
        const k = (a.kid ? 0.78 : 1) || 1
        if (s.ph === 'hold' || s.ph === 'go') {
          // begin: remember where we stand and glide into the seat
          s.ph = 'in'; s.from = [s.x, s.z]; s.sitT = 0; s.t = a.t
          s.approach = [s.x, s.z]
        }
        if (s.ph === 'in') {
          s.sitT += dt
          const u = Math.min(1, s.sitT / 0.8)
          s.x = s.from[0] + (sx - s.from[0]) * u; s.z = s.from[1] + (sz - s.from[1]) * u
          s.yaw = lerpAngle(s.yaw, syaw, dt * 6)
          av.sit = 1; av.sitHeight = sh / k; av.speed = 0
          if (u >= 1) { s.ph = 'seated' }
        } else if (s.ph === 'seated') {
          s.t -= dt
          av.sit = 1; av.sitHeight = sh / k; av.speed = 0
          s.yaw = lerpAngle(s.yaw, syaw, dt * 6)
          const gs = a.g || []
          s.gT += dt
          if (s.gT > 6) { s.gT = 0; s.gi++ }
          av.gesture = gs.length ? gs[s.gi % gs.length] : null
          av.sing = a.talk ? a.talk * (0.55 + 0.45 * Math.sin(time * 0.8 + i)) : 0
          s.book = !!a.book
          live[r.id] = a.label || ''
          if (s.t <= 0) { s.ph = 'out'; s.sitT = 0; s.from = [s.x, s.z]; av.gesture = null; av.sing = 0 }
        } else if (s.ph === 'out') {
          s.sitT += dt
          const u = Math.min(1, s.sitT / 0.8)
          s.x = s.from[0] + (s.approach[0] - s.from[0]) * u; s.z = s.from[1] + (s.approach[1] - s.from[1]) * u
          av.sit = 0; av.sitHeight = SEAT_H; av.speed = 0; s.book = false
          if (u >= 1) { s.ai = (s.ai + 1) % r.plan.length; s.ph = 'new' }
        }
      }
      if (a.k !== 'sit') { av.sit = 0 }

      // greet the player: look up, wave once in a while (not while carrying or reading a book)
      s.greetCool -= dt
      if (playerHere && !walking && s.greetCool <= 0 && !s.book && a.k !== 'sit') {
        s.greetCool = 25; s.waveAt = time + 1.8
        s.yaw = Math.atan2(dxp, dzp)
        live[r.id + ':greeted'] = time
      }
      av.emote = time < s.waveAt ? 'wave' : null
      if (playerHere && !walking && a.k !== 'sit') s.yaw = lerpAngle(s.yaw, Math.atan2(dxp, dzp), dt * 3)

      const g = refs.current[i]
      if (g) {
        g.position.set(s.x, CURB, s.z)
        g.rotation.y = s.yaw
      }
      const b = bookRefs.current[i]
      if (b) {
        b.visible = s.book
        if (s.book) {
          b.position.set(0, av.sit ? 0.92 : 1.3, 0.46)
          b.rotation.set(-0.45, 0, 0)
        }
      }
    })
  }
  const clock = useRef(0)
  useFrame((st, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1)
    const c = camera.position
    const near = c.x > LIB.x0 - 14 && c.x < LIB.x1 + 40 && c.z > LIB.z0 - 14 && c.z < LIB.z1 + 14
    if (root.current) root.current.visible = near
    clock.current = st.clock.elapsedTime
    tick(dt, st.clock.elapsedTime)
  })
  useEffect(() => { window.__vswLib = { sim, tick: (dt, n = 1) => { for (let i = 0; i < n; i++) { clock.current += dt; tick(dt, clock.current) } } }; return () => { delete window.__vswLib } }, [sim]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <group ref={root}>
      {ROSTER.map((r, i) => (
        <group key={r.id} ref={(el) => { refs.current[i] = el }} scale={r.scale || 1}>
          <Avatar state={sim[i].avatar} skin={r.skin} look={{ social: true, noVisor: true, ...r.look, eyes: r.look.eyes || '#3a2316' }} />
          <group ref={(el) => { bookRefs.current[i] = el }} visible={false}><Book color={r.bookColor} /></group>
        </group>
      ))}
    </group>
  )
}
