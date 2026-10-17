import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { HumanoidCrowd, makeCrowd } from '../npc/HumanoidCrowd.jsx'
import { registerInteractable } from '../state/runtime.js'
import { useStore } from '../state/store.js'
import { useEnv } from '../state/environment.js'
import { onDuty, useNpcShifts } from '../state/npcShifts.js'
import { JOBS, STOPS, WASH_A, WASH_B, cwWorld, CURB } from '../config/jobs.js'
import { speakLine } from '../audio/tts.js'

// NPC workers. Each one has a job (with that job's uniform colours) and a script: a list of waypoints
// where they wait and "work" (arms at the task) and walk between. Walking uses the humanoid's leg
// animation. They are visual and walk through doors like ghosts; nobody here collides with the player.
// Press E next to one to talk.

const job = (id) => JOBS.find((j) => j.id === id)
const pt = (id, wait = 3, act = 'work', face) => ({ x: STOPS[id].x, z: STOPS[id].z, wait, act, face })
const at = (x, z, wait = 0, act = 'stand', face) => ({ x, z, wait, act, face })
const cw = (w, k, wait = 4, act = 'work', face) => pt(`${w.id}:${k}`, wait, act, face)
const cwAt = (w, u, v, wait = 0, act = 'stand', face) => { const [x, z] = cwWorld(w, u, v); return at(x, z, wait, act, face) }

// shared walking lanes from the Post Office out to the avenue
const OUT = [at(64, 62.5, 4, 'work'), at(64, 53.1), at(52, 53.1), at(34.4, 53.1), at(34.4, 30.2), at(8.6, 30.2)]
const BACK = [...OUT].reverse().map((p, i, a) => (i === a.length - 1 ? { ...p, wait: 5, act: 'work' } : { ...p, wait: 0, act: 'stand' }))

const SOUTH = Math.PI, NORTH = 0, WEST = -Math.PI / 2, EAST = Math.PI / 2

const WORKERS = [
  // mail on the street
  { name: 'Rosa', job: 'mail-carrier', line: 'Route 4 today: the lounge and the plaza. Bring a coat, it gets windy by the avenue.', speed: 1.5, loop: 'cycle', path: [
    ...OUT.slice(0, 5), at(8.6, 30.2), at(8.7, 44, 3, 'work'), at(8.6, 30.2), at(6.5, 28.2), at(-6.5, 28.2), at(-8.4, 30.2), at(-8.4, 48, 3, 'work'),
    at(-8.4, 30.2), at(-6.5, 28.2), at(6.5, 28.2), at(8.6, 30.2), ...BACK.slice(1)] },
  { name: 'Dev', job: 'mail-carrier', line: 'South route. Records and the cinema get the heaviest bags.', speed: 1.5, loop: 'cycle', path: [
    ...OUT.slice(0, 5), at(8.6, 30.2), at(8.2, 27), at(8.2, 12.5), at(8.7, -7, 3, 'work'), at(8.2, 12.5), at(8.2, 27), at(8.6, 30.2), ...BACK.slice(1)] },
  { name: 'Tom', job: 'mail-collector', line: 'Collecting from every blue box on the avenue. People mail more than you would think.', speed: 1.4, loop: 'cycle', path: [
    ...OUT.slice(0, 5), at(8.6, 30.2), at(7.2, 44, 3, 'work'), at(7.2, 62, 3, 'work'), at(7.2, 92, 3, 'work'), at(-7.2, 90), at(-7.2, 62, 3, 'work'), at(-7.2, 40, 3, 'work'),
    at(-6.5, 28.2), at(6.5, 28.2), at(8.6, 30.2), ...BACK.slice(1)] },
  // city services
  { name: 'Jim', job: 'street-sweeper', line: 'Sweeping the avenue. Leaves in the morning, confetti after concerts.', speed: 1.0, loop: 'pingpong', path: [at(6.7, 31, 5, 'work', EAST), at(6.7, 43, 5, 'work', EAST), at(6.7, 56, 5, 'work', EAST)] },
  { name: 'Maria', job: 'gardener', line: 'These planters get thirsty. I water at sunrise.', speed: 1.1, loop: 'cycle', path: [pt('gr-1', 6, 'work', NORTH), pt('gr-2', 6, 'work', NORTH), pt('gr-3', 6, 'work', NORTH), pt('gr-4', 6, 'work', NORTH), at(70, 53.1), at(56, 53.1)] },
  { name: 'Ray', job: 'security-guard', line: 'District security. Everything is quiet, and I intend to keep it that way.', speed: 1.2, loop: 'cycle', path: [
    pt('gd-court', 4, 'stand', SOUTH), pt('gd-po', 4, 'stand', NORTH), at(52, 48.5), at(52, 31.5), at(52, 29.6), pt('gd-jc', 4, 'stand', SOUTH), pt('gd-cw', 4, 'stand', SOUTH), at(52, 29.6), at(52, 48.5), at(52, 53.1)] },
  // stage crew
  { name: 'Sam', job: 'stagehand', line: 'Load-in starts at noon. The rig weighs more than it looks.', speed: 1.1, loop: 'pingpong', path: [at(80.8, 41, 5, 'work', WEST), at(80.8, 47, 5, 'work', WEST)] },
  { name: 'Kai', job: 'stagehand', line: 'Checking the lights before the show.', speed: 1.1, loop: 'pingpong', path: [at(94, 49.2, 5, 'work', SOUTH), at(104, 49.2, 5, 'work', SOUTH)] },
  // Post Office staff
  { name: 'Nora', job: 'postal-clerk', line: 'Next window, please. Stamps, parcels and P.O. boxes are all here.', speed: 1, loop: 'cycle', path: [at(47.5, 62.0, 99, 'work', SOUTH)] },
  { name: 'Walt', job: 'postal-clerk', line: 'Need a parcel weighed? I am your man.', speed: 1, loop: 'cycle', path: [at(52.5, 62.0, 99, 'work', SOUTH)] },
  { name: 'Ines', job: 'mail-sorter', line: 'Letters in the left tray, parcels on the right. Every route gets its own bundle.', speed: 1, loop: 'cycle', path: [at(47.2, 63.4, 99, 'work', NORTH)] },
  { name: 'Omar', job: 'mail-sorter', line: 'The morning bags are the biggest. I am almost through them.', speed: 1, loop: 'cycle', path: [at(51.3, 63.4, 99, 'work', NORTH)] },
  { name: 'Lou', job: 'mail-sorter', line: 'Bundling outgoing mail for the truck.', speed: 1, loop: 'cycle', path: [at(55.4, 63.4, 99, 'work', NORTH)] },
  { name: 'Hank', job: 'mail-sorter', line: 'Loading the cage. Wheels on these things never go straight.', speed: 1, loop: 'pingpong', path: [at(56.4, 63.0, 5, 'work', EAST), at(59.6, 62.2, 4, 'work', EAST)] },
  // Job Center staff
  { name: 'Alicia', job: 'receptionist', line: 'Welcome to the Job Center. The job board is on the west wall; the uniform shop is through the arch.', speed: 1, loop: 'cycle', path: [at(61.3, 35.4, 99, 'work', SOUTH)] },
  { name: 'Greg', job: 'office-clerk', line: 'Applications are processed same day. Mostly.', speed: 1, loop: 'cycle', path: [at(59.3, 46.3, 99, 'work', NORTH)] },
  { name: 'Bea', job: 'janitor', line: 'Marble shows every footprint. That is job security.', speed: 0.9, loop: 'cycle', path: [at(58.5, 37, 5, 'work', NORTH), at(62, 37, 5, 'work', NORTH), at(62, 43.5, 5, 'work', SOUTH), at(58.5, 43.5, 5, 'work', SOUTH)] },
  { name: 'Leo', job: 'retail-clerk', line: 'Every job has its own uniform. Buy yours here, then clock in at the right place.', speed: 1, loop: 'cycle', path: [at(70.6, 35.6, 99, 'work', SOUTH)] },
  { name: 'Tess', job: 'retail-clerk', line: 'Restocking sizes. Everyone is a medium until they try it on.', speed: 1, loop: 'pingpong', path: [at(69.6, 45.0, 6, 'work', NORTH), at(70.9, 45.0, 6, 'work', NORTH)] },
  { name: 'Paul', job: 'office-clerk', line: 'Payroll. Weekly, bi-weekly, monthly or yearly. Longer periods pay a bonus.', speed: 1, loop: 'cycle', path: [at(74.7, 40.5, 99, 'work', WEST)] },
]
// both car washes get the same crew
for (const w of [WASH_A, WASH_B]) {
  WORKERS.push(
    { name: w === WASH_A ? 'Lena' : 'Gus', job: 'wash-attendant', line: 'Pre-rinse, foam, towel. The tunnel does the rest.', speed: 1.1, loop: 'cycle',
      path: [cw(w, 'prerinse', 5), cw(w, 'foam', 5), cw(w, 'towel', 6), cw(w, 'foam', 4)] },
    { name: w === WASH_A ? 'Marco' : 'Ivy', job: 'detailer', line: 'Vacuum, then polish. Details are what people remember.', speed: 1.0, loop: 'cycle',
      path: [cw(w, 'vac1', 6), cw(w, 'vac2', 5), cw(w, 'polish', 7), cw(w, 'vac2', 4)] },
    { name: w === WASH_A ? 'Priya' : 'Dale', job: 'wash-host', line: `Pay at the kiosk and drive into the tunnel. Wait for the green light.`, speed: 1, loop: 'pingpong',
      path: [cw(w, 'kiosk', 6, 'work', EAST), cwAt(w, 4.0, 0.2, 3, 'stand', EAST)] },
    { name: w === WASH_A ? 'Dan' : 'Kit', job: 'wash-host', line: 'Office is open. The time clock is on the wall.', speed: 1, loop: 'cycle',
      path: [cwAt(w, 2.0, 7.9, 99, 'work', NORTH)] },
  )
}

// default work times by job (the owner can change any of them in Owner tools → NPC work times)
const JOB_HOURS = { 'mail-carrier': [8, 17], 'mail-collector': [9, 16], 'street-sweeper': [5, 13], gardener: [6, 14], 'wash-attendant': [8, 19], detailer: [8, 19], 'wash-host': [8, 19] }
const wid = (w) => 'city:' + w.name.toLowerCase()
const wdef = (w) => w.shift || JOB_HOURS[w.job] || null

const lerpAngle = (a, b, k) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * Math.min(1, k) }

export default function Workers() {
  const { fans, state } = useMemo(() => {
    const base = makeCrowd(WORKERS.length, (i) => ({ x: WORKERS[i].path[0].x, z: WORKERS[i].path[0].z, y: CURB, yaw: WORKERS[i].path[0].face ?? 0, raiseChance: 0 }))
    const st = WORKERS.map((w, i) => {
      const j = job(w.job)
      base[i].shirt = j.shirt; base[i].pants = j.pants; base[i].y = CURB; base[i].walk = 0; base[i].gait = 0; base[i].armsUp = 0
      return { i: 0, dir: 1, phase: 'wait', timer: 1 + (i % 5) * 0.7 }
    })
    return { fans: base, state: st }
  }, [])

  useEffect(() => {
    const v = new THREE.Vector3()
    const offs = WORKERS.map((w, i) => registerInteractable('npc-worker-' + i, {
      position: () => v.set(fans[i].x, fans[i].hidden ? -500 : CURB + 1, fans[i].z),
      radius: 1.6,
      label: () => `Talk to ${w.name} · ${job(w.job).title}`,
      onInteract: () => { useStore.getState().showToast(`${w.name} (${job(w.job).title}): "${w.line}"`); speakLine(w.line, { id: w.name }) },
    }))
    return () => offs.forEach((o) => o())
  }, [fans])

  useEffect(() => { useNpcShifts.getState().register(WORKERS.map((w) => ({ id: wid(w), name: w.name, title: job(w.job).title, place: 'City services & job district', def: wdef(w) }))) }, [])

  useFrame((st, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1)
    const t = st.clock.elapsedTime
    const hour = useEnv.getState().time
    WORKERS.forEach((w, i) => {
      const f = fans[i], s = state[i]
      const working = onDuty(wid(w), wdef(w), hour)
      f.hidden = !working
      if (!working) return
      const wp = w.path[s.i]
      if (s.phase === 'wait') {
        s.timer -= dt
        f.walk = Math.max(0, f.walk - dt * 6)
        f.armsUp = wp.act === 'work' ? 0.6 + 0.3 * Math.sin(t * 4.5 + f.phase) : 0
        if (wp.face !== undefined) f.yaw = lerpAngle(f.yaw, wp.face, dt * 6)
        if (s.timer <= 0 && w.path.length > 1) {
          if (w.loop === 'pingpong') { if (s.i + s.dir >= w.path.length || s.i + s.dir < 0) s.dir *= -1; s.i += s.dir } else s.i = (s.i + 1) % w.path.length
          s.phase = 'move'
        }
      } else {
        const tgt = w.path[s.i]
        const dx = tgt.x - f.x, dz = tgt.z - f.z
        const d = Math.hypot(dx, dz)
        const step = w.speed * dt
        f.armsUp = 0
        if (d <= step) {
          f.x = tgt.x; f.z = tgt.z; s.phase = 'wait'; s.timer = tgt.wait
        } else {
          f.x += (dx / d) * step; f.z += (dz / d) * step
          f.yaw = lerpAngle(f.yaw, Math.atan2(dx, dz), dt * 8)
          f.walk = Math.min(1, f.walk + dt * 6)
          f.gait += step * 4.6
        }
      }
    })
  })

  return <HumanoidCrowd fans={fans} beat={0} castShadow={false} roam />
}
