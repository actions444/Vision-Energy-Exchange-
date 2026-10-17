import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { HumanoidCrowd, makeCrowd } from '../npc/HumanoidCrowd.jsx'
import { registerInteractable, playerState } from '../state/runtime.js'
import { useStore } from '../state/store.js'
import { useEnv } from '../state/environment.js'
import { PED_GRID } from '../config/pedGrid.js'
import { FIRST, LINES, PED_COUNT } from '../config/pedestrians.js'
import { signalState } from '../vehicles/Traffic.jsx'
import { speakLine } from '../audio/tts.js'

// Townspeople who roam the whole open world on foot. There are no fixed routes: each one picks a place anywhere in
// the part of town they can walk to (parks, plazas, sidewalks, forecourts, courtyards), plans a way there around
// buildings and furniture on a baked walkability grid (config/pedGrid.js, measured from the game's own physics
// world), walks it, stands around for a bit, and picks somewhere else. They cross streets only at the painted
// crosswalks, and on the cross street only while the cars are held at red. They stay out of building interiors and
// the private estate, never push the player, step aside for you, and at night most go home. They are drawn with the
// instanced humanoid renderer, so the whole crowd costs a handful of draw calls.

const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }
const lerpAngle = (a, b, k) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * Math.min(1, k) }

const { x0: GX0, z0: GZ0, nx: NX, nz: NZ } = PED_GRID
const N = NX * NZ
const heightOf = (v) => (v - 1) * 0.05 - 0.06
const cellX = (x) => Math.floor(x - GX0 + 0.25)
const cellZ = (z) => Math.floor(z - GZ0 + 0.25)
const centreX = (ci) => GX0 + ci + 0.25
const centreZ = (cj) => GZ0 + cj + 0.25
const STEP_OK = 3 // height classes (0.05 m each) a pedestrian can step between neighbouring cells

// ---- the walkability grid ------------------------------------------------------------------------------------
let GRID = null
function grid() {
  if (GRID) return GRID
  const raw = Uint8Array.from(atob(PED_GRID.rle), (c) => c.charCodeAt(0))
  const val = new Uint8Array(N)
  for (let i = 0, o = 0; i < raw.length; i += 2) { val.fill(raw[i], o, o + raw[i + 1]); o += raw[i + 1] }
  // cells touching a blocked cell cost a little more, so people keep to the middle of a walkway
  const edge = new Uint8Array(N)
  for (let j = 1; j < NZ - 1; j++) for (let i = 1; i < NX - 1; i++) {
    const c = j * NX + i
    if (val[c] && (!val[c - 1] || !val[c + 1] || !val[c - NX] || !val[c + NX])) edge[c] = 1
  }
  // connected regions
  const comp = new Int32Array(N).fill(-1)
  const regions = []
  for (let s = 0; s < N; s++) {
    if (!val[s] || comp[s] >= 0) continue
    const id = regions.length, cells = [], st = [s]; comp[s] = id
    while (st.length) {
      const c = st.pop(); cells.push(c)
      const ci = c % NX
      const nb = [ci > 0 ? c - 1 : -1, ci < NX - 1 ? c + 1 : -1, c - NX, c + NX]
      for (const n of nb) if (n >= 0 && n < N && val[n] && comp[n] < 0 && Math.abs(val[n] - val[c]) <= STEP_OK) { comp[n] = id; st.push(n) }
    }
    regions.push(cells)
  }
  GRID = { val, edge, comp, regions }
  return GRID
}

// ---- path finding (A* over the 1 m grid, 8 directions) ---------------------------------------------------------
const DX = [1, -1, 0, 0, 1, 1, -1, -1], DZ = [0, 0, 1, -1, 1, -1, 1, -1], COST = [1, 1, 1, 1, 1.414, 1.414, 1.414, 1.414]
const gS = new Float32Array(N), seen = new Int32Array(N), closed = new Int32Array(N), par = new Int32Array(N)
const HEAP = 1 << 20
const heapC = new Int32Array(HEAP), heapF = new Float32Array(HEAP)
let heapN = 0, stampN = 0
function push(c, f) {
  if (heapN >= HEAP) return
  let i = heapN++
  while (i > 0) { const p = (i - 1) >> 1; if (heapF[p] <= f) break; heapC[i] = heapC[p]; heapF[i] = heapF[p]; i = p }
  heapC[i] = c; heapF[i] = f
}
function pop() {
  const top = heapC[0]; heapN--
  if (heapN > 0) {
    const c = heapC[heapN], f = heapF[heapN]; let i = 0
    for (;;) {
      let k = 2 * i + 1; if (k >= heapN) break
      if (k + 1 < heapN && heapF[k + 1] < heapF[k]) k++
      if (heapF[k] >= f) break
      heapC[i] = heapC[k]; heapF[i] = heapF[k]; i = k
    }
    heapC[i] = c; heapF[i] = f
  }
  return top
}
/** can a person walk the straight line between two cell centres? */
function clearLine(val, a, b) {
  const ax = centreX(a % NX), az = centreZ((a / NX) | 0), bx = centreX(b % NX), bz = centreZ((b / NX) | 0)
  const d = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(d / 0.4))
  let prev = val[a]
  for (let k = 1; k <= n; k++) {
    const x = ax + ((bx - ax) * k) / n, z = az + ((bz - az) * k) / n
    const ci = cellX(x), cj = cellZ(z)
    if (ci < 0 || cj < 0 || ci >= NX || cj >= NZ) return false
    const v = val[cj * NX + ci]
    if (!v || Math.abs(v - prev) > STEP_OK) return false
    prev = v
  }
  return true
}
/** a flat [x, z, x, z, ...] list of waypoints from cell s to cell t, or null */
function findPath(s, t) {
  const { val, edge } = grid()
  const stamp = ++stampN
  heapN = 0
  const tx = t % NX, tz = (t / NX) | 0
  const h = (c) => { const dx = Math.abs((c % NX) - tx), dz = Math.abs(((c / NX) | 0) - tz); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz) }
  gS[s] = 0; seen[s] = stamp; par[s] = -1; push(s, h(s))
  let expanded = 0, found = false
  while (heapN > 0) {
    const c = pop()
    if (c === t) { found = true; break }
    if (closed[c] === stamp) continue
    closed[c] = stamp
    if (++expanded > 70000) return null
    const ci = c % NX, cj = (c / NX) | 0
    for (let k = 0; k < 8; k++) {
      const a = ci + DX[k], b = cj + DZ[k]
      if (a < 0 || b < 0 || a >= NX || b >= NZ) continue
      const n = b * NX + a
      const vn = val[n]
      if (!vn || Math.abs(vn - val[c]) > STEP_OK) continue
      if (k >= 4 && (!val[cj * NX + a] || !val[b * NX + ci])) continue
      const ng = gS[c] + COST[k] + (edge[n] ? 0.7 : 0)
      if (seen[n] !== stamp || ng < gS[n]) { seen[n] = stamp; gS[n] = ng; par[n] = c; push(n, ng + h(n)) }
    }
  }
  if (!found) return null
  const cells = []
  for (let c = t; c >= 0; c = par[c]) cells.push(c)
  cells.reverse()
  // straighten: keep a waypoint only where the straight line to the next one would clip something
  const out = [], first = cells[0]
  out.push(centreX(first % NX), centreZ((first / NX) | 0))
  let i = 0
  while (i < cells.length - 1) {
    let j = Math.min(cells.length - 1, i + 14)
    while (j > i + 1 && !clearLine(val, cells[i], cells[j])) j--
    const c = cells[j]
    out.push(centreX(c % NX), centreZ((c / NX) | 0))
    i = j
  }
  return out
}

// ---- the crowd -----------------------------------------------------------------------------------------------
const CROSS_Z0 = 13.7, CROSS_Z1 = 26.3 // the cross street (cars run here); the avenue has no traffic
let simOffset = 0 // test hook: lets the fast-forward simulation move the signal clock too
const signalNow = () => signalState(performance.now() / 1000 + simOffset)

function plan() {
  const { regions } = grid()
  const usable = regions.map((cells, id) => ({ id, cells })).filter((r) => r.cells.length >= 500)
  const total = usable.reduce((a, r) => a + r.cells.length, 0)
  const walkers = []
  for (const r of usable) {
    const want = Math.max(1, Math.round((PED_COUNT * r.cells.length) / total))
    const placed = []
    for (let k = 0; k < want; k++) {
      let cell = r.cells[0]
      for (let tries = 0; tries < 40; tries++) {
        const c = r.cells[Math.floor(hash(r.id * 977 + k * 31 + tries * 7.7) * r.cells.length)]
        cell = c
        const x = centreX(c % NX), z = centreZ((c / NX) | 0)
        if (placed.every((p) => Math.hypot(p[0] - x, p[1] - z) > 14)) break
      }
      placed.push([centreX(cell % NX), centreZ((cell / NX) | 0)])
      const i = walkers.length
      walkers.push({ region: r.id, cell, name: FIRST[(i * 7 + 3) % FIRST.length], line: LINES[(i * 3 + 1) % LINES.length], speed: 0.95 + hash(i * 5.1) * 0.5, night: hash(i * 9.7) < 0.3, lat: (hash(i * 2.9) - 0.5) * 0.56 })
    }
  }
  return walkers
}

export default function Pedestrians() {
  const { walkers, fans, state } = useMemo(() => {
    const walkers = plan()
    const { val } = grid()
    const fans = makeCrowd(walkers.length, (i) => { const c = walkers[i].cell; return { x: centreX(c % NX), z: centreZ((c / NX) | 0), y: heightOf(val[c]), yaw: hash(i) * 6.28, raiseChance: 0 } })
    const state = walkers.map((w, i) => {
      fans[i].walk = 0; fans[i].gait = hash(i) * 6; fans[i].armsUp = 0
      return { phase: 'wait', timer: hash(i * 4.4) * 6, path: null, pi: 0, px: fans[i].x, pz: fans[i].z, side: 0, lx: 0, lz: 0, resume: false }
    })
    return { walkers, fans, state }
  }, [])

  useEffect(() => {
    const v = new THREE.Vector3()
    const offs = walkers.map((w, i) => registerInteractable('npc-ped-' + i, {
      position: () => v.set(fans[i].x, fans[i].hidden ? -500 : fans[i].y + 1, fans[i].z),
      radius: 1.6,
      label: () => `Talk to ${w.name}`,
      onInteract: () => { useStore.getState().showToast(`${w.name}: "${w.line}"`); speakLine(w.line, { id: w.name }) },
    }))
    return () => offs.forEach((o) => o())
  }, [fans, walkers])

  const stepAll = (dt) => {
    const { val, comp, regions } = grid()
    const hour = useEnv.getState().time
    const dark = hour >= 23 || hour < 6
    const pp = playerState.position
    let searches = 0
    const sig = signalNow()
    walkers.forEach((w, i) => {
      const f = fans[i], s = state[i]
      f.hidden = dark && !w.night
      if (f.hidden) return
      const near = Math.hypot(f.x - pp.x, f.z - pp.z)
      if (s.phase === 'wait') {
        s.timer -= dt
        f.walk = Math.max(0, f.walk - dt * 6)
        if (near < 2.2) f.yaw = lerpAngle(f.yaw, Math.atan2(pp.x - f.x, pp.z - f.z), dt * 3) // glance at you
        if (s.timer <= 0 && s.resume && s.path) { s.resume = false; s.phase = 'move'; return }
        if (s.timer <= 0 && searches < 2) {
          // pick somewhere new anywhere in the part of town this person can walk to
          const here = cellZ(s.pz) * NX + cellX(s.px)
          const cells = regions[w.region]
          let path = null
          for (let tries = 0; tries < 6 && !path; tries++) {
            const c = cells[Math.floor(Math.random() * cells.length)]
            const d = Math.hypot(centreX(c % NX) - s.px, centreZ((c / NX) | 0) - s.pz)
            if (d < 25 || d > 190) continue
            searches++
            path = val[here] ? findPath(here, c) : null
          }
          if (path && path.length > 2) { s.path = path; s.pi = 2; s.phase = 'move' } else s.timer = 1 + Math.random() * 3
        }
        return
      }
      // moving along the planned waypoints
      const p = s.path
      const tx = p[s.pi], tz = p[s.pi + 1]
      const here = cellZ(s.pz) * NX + cellX(s.px)
      const ahead = cellZ(tz) * NX + cellX(tx)
      // wait at the kerb until the cars are held at red before stepping onto the cross street
      if (val[ahead] > 0 && val[ahead] <= 3 && val[here] > 3 && tz > CROSS_Z0 && tz < CROSS_Z1 && !(sig.cross === 'red' && sig.t >= 16.5 && sig.t <= 21)) {
        f.walk = Math.max(0, f.walk - dt * 6); return
      }
      const dx = tx - s.px, dz = tz - s.pz
      const d = Math.hypot(dx, dz)
      // give way: if the player is right in front, pause a moment
      if (near < 1.1 && dx * (pp.x - f.x) + dz * (pp.z - f.z) > 0) { f.walk = Math.max(0, f.walk - dt * 6); return }
      const step = w.speed * dt
      if (d <= step + 0.05) {
        s.px = tx; s.pz = tz
        s.pi += 2
        if (s.pi >= p.length) {
          s.phase = 'wait'; s.path = null; s.resume = false
          s.timer = Math.random() < 0.6 ? 2 + Math.random() * 7 : 0.3 + Math.random() * 1.5 // stand about for a while
          f.yaw += (Math.random() - 0.5) * 1.6
        } else if (Math.random() < 0.1) { s.phase = 'wait'; s.timer = 1.5 + Math.random() * 3.5; s.resume = true } // stop and look around
      } else {
        const ux = dx / d, uz = dz / d
        s.px += ux * step; s.pz += uz * step
        // walk a little to one side so two people passing each other do not overlap (only where there is room)
        const lx = -uz * w.lat, lz = ux * w.lat
        const oc = cellZ(s.pz + lz) * NX + cellX(s.px + lx), base = cellZ(s.pz) * NX + cellX(s.px)
        const want = val[oc] && Math.abs(val[oc] - val[base]) <= 2 ? 1 : 0
        s.side += (want - s.side) * Math.min(1, dt * 2)
        s.lx = lx * s.side; s.lz = lz * s.side
        f.yaw = lerpAngle(f.yaw, Math.atan2(dx, dz), dt * 8)
        f.walk = Math.min(1, f.walk + dt * 6)
        f.gait += step * 4.6
      }
      f.x = s.px + s.lx; f.z = s.pz + s.lz
      const c = cellZ(s.pz) * NX + cellX(s.px)
      if (val[c]) f.y += (heightOf(val[c]) - f.y) * Math.min(1, dt * 10)
    })
  }
  useFrame((st, dtRaw) => stepAll(Math.min(dtRaw, 0.1)))
  // test hook: run the simulation faster than the frame rate (the headless renderer draws about one frame in five seconds)
  useEffect(() => {
    window.__vswPeds = { fans, walkers, state, grid, PED_GRID, step: (dt, n = 1) => { for (let k = 0; k < n; k++) { simOffset += dt; stepAll(dt) } } }
    return () => { delete window.__vswPeds }
  }, [fans, walkers, state]) // eslint-disable-line react-hooks/exhaustive-deps

  return <HumanoidCrowd fans={fans} beat={0} castShadow={false} roam />
}
