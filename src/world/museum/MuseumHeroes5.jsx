import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { registerInteractable, playerState } from '../../state/runtime.js'
import { useStore } from '../../state/store.js'
import { useSeats } from '../../state/seats.js'
import { nightLit } from '../../state/environment.js'
import { inst, playMelody, SUSANNA, startJukebox, stopJukebox, jukeboxOn } from '../../audio/instruments.js'
import { mm, canvasTex, Placard, Bar, Instances, FY, hash } from './kit.jsx'

// Sound of America: a grand piano that plays "Oh! Susanna" (keys move with the notes), a drum kit, an electric guitar
// and amp, and a jukebox with a generated 12-bar blues shuffle. All sound is synthesized live; there are no audio files.

const clockOf = () => ({ t: 0 })
const near = (x, z, r) => Math.hypot(playerState.position.x - x, playerState.position.z - z) < r

// ------------------------------------------------------------------ grand piano
const WHITE_PC = new Set([0, 2, 4, 5, 7, 9, 11])
const WHITES = []
for (let m = 21; m <= 108; m++) if (WHITE_PC.has(m % 12)) WHITES.push(m)
const KW = 1.22 / WHITES.length
const whiteX = (m) => (WHITES.indexOf(m) - (WHITES.length - 1) / 2) * KW
const BLACKS = []
for (let m = 21; m <= 108; m++) if (!WHITE_PC.has(m % 12)) BLACKS.push(m)
const blackX = (m) => (whiteX(m - 1) + whiteX(m + 1)) / 2

function sheetTex() {
  return canvasTex(512, 320, (g, w, h) => {
    g.fillStyle = '#f6f0df'; g.fillRect(0, 0, w, h)
    g.fillStyle = '#3a2f22'; g.font = 'italic 700 26px Georgia, serif'; g.textAlign = 'center'; g.fillText('Oh! Susanna', w / 2, 36)
    g.font = 'italic 15px Georgia, serif'; g.fillText('Stephen Foster, 1848', w / 2, 56)
    g.strokeStyle = '#3a2f22'; g.lineWidth = 1.3
    for (const sy of [95, 205]) {
      for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(24, sy + i * 12); g.lineTo(w - 24, sy + i * 12); g.stroke() }
      g.font = '58px serif'; g.fillStyle = '#3a2f22'; g.textAlign = 'left'; g.fillText('\u{1D11E}', 28, sy + 48)
    }
    const stepY = (m) => { const names = { 60: 0, 62: 1, 64: 2, 65: 3, 67: 4, 69: 5 }; return names[m] ?? 0 }
    SUSANNA.slice(0, 32).forEach(([m], i) => {
      const row = i < 16 ? 0 : 1, col = i % 16
      const sy = row ? 205 : 95
      const x = 84 + col * 24, y = sy + 62 - stepY(m) * 6
      g.fillStyle = '#2b2118'; g.beginPath(); g.ellipse(x, y, 6, 4.4, -0.3, 0, 7); g.fill()
      g.beginPath(); g.moveTo(x + 5.4, y); g.lineTo(x + 5.4, y - 28); g.stroke()
    })
  })
}

function Keyboard({ pressed }) {
  const white = useRef(), black = useRef()
  const prev = useRef(new Set())
  const o = useMemo(() => new THREE.Object3D(), [])
  const setKey = (ref, i, x, y, len, sx, down) => {
    o.position.set(x, y - (down ? 0.012 : 0), len / 2); o.rotation.set(down ? 0.02 : 0, 0, 0); o.scale.set(sx, 1, len); o.updateMatrix()
    ref.current.setMatrixAt(i, o.matrix)
  }
  useLayoutEffect(() => {
    WHITES.forEach((m, i) => setKey(white, i, whiteX(m), 0.735, 0.15, KW * 0.93, false))
    BLACKS.forEach((m, i) => setKey(black, i, blackX(m), 0.757, 0.095, 0.012 / 0.012 * 0.0135, false))
    white.current.instanceMatrix.needsUpdate = true; black.current.instanceMatrix.needsUpdate = true
    white.current.computeBoundingSphere(); black.current.computeBoundingSphere()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(() => {
    const cur = pressed.current
    let changed = false
    for (const m of cur) if (!prev.current.has(m)) { changed = true; apply(m, true) }
    for (const m of prev.current) if (!cur.has(m)) { changed = true; apply(m, false) }
    if (changed) { prev.current = new Set(cur); white.current.instanceMatrix.needsUpdate = true; black.current.instanceMatrix.needsUpdate = true }
  })
  const apply = (m, down) => {
    if (WHITE_PC.has(m % 12)) setKey(white, WHITES.indexOf(m), whiteX(m), 0.735, 0.15, KW * 0.93, down)
    else setKey(black, BLACKS.indexOf(m), blackX(m), 0.757, 0.095, 0.0135, down)
  }
  const geo = useMemo(() => new THREE.BoxGeometry(1, 0.022, 1), [])
  return (
    <>
      <instancedMesh ref={white} args={[geo, null, WHITES.length]} castShadow><meshStandardMaterial color="#f4f1e8" roughness={0.35} /></instancedMesh>
      <instancedMesh ref={black} args={[geo, null, BLACKS.length]} castShadow><meshStandardMaterial color="#141416" roughness={0.3} /></instancedMesh>
    </>
  )
}

function pianoOutline() {
  const s = new THREE.Shape()
  s.moveTo(-0.78, 0); s.lineTo(0.78, 0); s.lineTo(0.78, 0.6)
  s.bezierCurveTo(0.78, 1.4, 0.45, 1.95, -0.1, 2.15); s.lineTo(-0.78, 2.15); s.closePath()
  return s
}
function stringsTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#b08a3a'; g.fillRect(0, 0, w, h)
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, 'rgba(255,230,150,0.5)'); gr.addColorStop(1, 'rgba(90,60,10,0.4)'); g.fillStyle = gr; g.fillRect(0, 0, w, h)
    g.strokeStyle = 'rgba(40,30,20,0.9)'; g.lineWidth = 1.2
    for (let i = 0; i < 70; i++) { const t = i / 69; g.beginPath(); g.moveTo(40 + t * 420, 500); g.lineTo(60 + t * 300, 40 + (1 - t) * 40); g.stroke() }
    g.fillStyle = 'rgba(60,40,10,0.7)'; for (const [x, y] of [[120, 260], [260, 160], [380, 330], [200, 400]]) { g.beginPath(); g.arc(x, y, 34, 0, 7); g.fill() }
  })
}

export function GrandPiano({ position, yaw = 0 }) {
  const [x, z] = position
  const m = mm()
  const pressed = useRef(new Set())
  const run = useRef({ ev: null, t0: 0 })
  const clk = useRef(clockOf())
  const sheet = useMemo(sheetTex, [])
  const plate = useMemo(stringsTex, [])
  const body = useMemo(() => new THREE.ExtrudeGeometry(pianoOutline(), { depth: 0.2, bevelEnabled: false, curveSegments: 24 }), [])
  const rim = useMemo(() => { const g = new THREE.ShapeGeometry(pianoOutline(), 24); g.rotateX(-Math.PI / 2); return g }, [])
  const gloss = m.blackGloss
  useFrame(({ clock }) => {
    clk.current.t = clock.elapsedTime
    const r = run.current
    if (r.ev) {
      const t = clock.elapsedTime - r.t0
      const s = new Set()
      for (const e of r.ev) if (t >= e.at && t < e.at + e.dur) s.add(e.midi)
      pressed.current = s
      if (t > r.ev[r.ev.length - 1].at + 1.2) { r.ev = null; pressed.current = new Set() }
    }
  })
  const f = [Math.sin(yaw), Math.cos(yaw)]
  useEffect(() => registerInteractable('piano-play', {
    position: new THREE.Vector3(x + f[0] * 1.0, FY + 1, z + f[1] * 1.0),
    radius: 2.0,
    label: () => (run.current.ev ? 'The piano is playing...' : 'Play "Oh! Susanna" on the piano'),
    onInteract: () => {
      if (run.current.ev) return
      run.current = { ev: playMelody(SUSANNA, 108), t0: clk.current.t }
      useStore.getState().showToast('The grand piano plays "Oh! Susanna" (Stephen Foster, 1848).')
    },
  }), [x, z]) // eslint-disable-line react-hooks/exhaustive-deps
  useSeats([{ id: 'mus-piano-bench', position: [x + f[0] * 0.75, FY + 0.5, z + f[1] * 0.75], yaw: yaw + Math.PI, height: 0.5, label: 'Sit at the piano bench' }], [x, z])
  return (
    <>
      <group position={[x, FY, z]} rotation={[0, yaw, 0]}>
        <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.8, 0.5, 1.1]} position={[0, 0.5, -1.1]} /><CuboidCollider args={[0.62, 0.1, 0.2]} position={[0, 0.8, 0.1]} /></RigidBody>
        {/* case: rim extrusion, interior plate with strings, propped lid */}
        <mesh geometry={body} position={[0, 0.72, 0]} rotation={[-Math.PI / 2, 0, 0]} material={gloss} castShadow />
        <mesh geometry={rim} position={[0, 0.925, -0.02]} scale={[0.96, 1, 0.97]}><meshStandardMaterial map={plate} roughness={0.35} metalness={0.5} side={THREE.DoubleSide} /></mesh>
        <group position={[-0.78, 0.93, 0]} rotation={[0, 0, 0.72]}>
          <mesh geometry={rim} position={[0.78, 0, 0]} castShadow><meshPhysicalMaterial color="#0e0e10" roughness={0.12} clearcoat={1} side={THREE.DoubleSide} /></mesh>
        </group>
        <Bar a={[0.3, 0.94, -1.3]} b={[0.05, 1.5, -1.2]} r={0.012} material={m.brass} seg={5} />
        {/* key bed, cheeks, fallboard, music desk */}
        <mesh position={[0, 0.72, 0.1]} material={gloss}><boxGeometry args={[1.5, 0.05, 0.4]} /></mesh>
        {[-0.7, 0.7].map((sx) => <mesh key={sx} position={[sx, 0.77, 0.08]} material={gloss}><boxGeometry args={[0.1, 0.18, 0.46]} /></mesh>)}
        <mesh position={[0, 0.88, -0.1]} material={gloss}><boxGeometry args={[1.5, 0.18, 0.06]} /></mesh>
        <mesh position={[0, 1.05, -0.1]} rotation={[-0.3, 0, 0]} material={gloss}><boxGeometry args={[0.8, 0.3, 0.02]} /></mesh>
        <mesh position={[0, 1.06, -0.085]} rotation={[-0.3, 0, 0]}><planeGeometry args={[0.7, 0.26]} /><meshStandardMaterial map={sheet} roughness={0.85} /></mesh>
        <mesh position={[0, 0.725, 0.31]} material={m.brass}><boxGeometry args={[1.5, 0.014, 0.012]} /></mesh>
        <group position={[0, 0.0, 0.16]}>
          <Keyboard pressed={pressed} />
        </group>
        {/* legs, castors, pedal lyre */}
        {[[-0.62, 0.0], [0.62, 0.0], [-0.1, -1.95]].map(([lx, lz], i) => (
          <group key={i} position={[lx, 0, lz]}>
            <mesh position={[0, 0.34, 0]} material={gloss} castShadow><cylinderGeometry args={[0.05, 0.07, 0.68, 12]} /></mesh>
            <mesh position={[0, 0.03, 0]} material={m.brass}><cylinderGeometry args={[0.045, 0.04, 0.06, 10]} /></mesh>
          </group>
        ))}
        <mesh position={[0, 0.25, 0.04]} material={gloss}><boxGeometry args={[0.28, 0.4, 0.05]} /></mesh>
        {[-0.07, 0, 0.07].map((px) => <mesh key={px} position={[px, 0.07, 0.12]} material={m.brass}><boxGeometry args={[0.04, 0.018, 0.16]} /></mesh>)}
        {/* bench */}
        <group position={[0, 0, 0.75]}>
          <mesh position={[0, 0.46, 0]} material={m.velvet} castShadow><boxGeometry args={[0.8, 0.1, 0.36]} /></mesh>
          <mesh position={[0, 0.39, 0]} material={gloss}><boxGeometry args={[0.76, 0.06, 0.32]} /></mesh>
          {[[-0.34, -0.12], [0.34, -0.12], [-0.34, 0.12], [0.34, 0.12]].map(([bx, bz], i) => <mesh key={i} position={[bx, 0.19, bz]} material={gloss}><cylinderGeometry args={[0.025, 0.02, 0.38, 8]} /></mesh>)}
        </group>
      </group>
      <Placard id="piano" position={[x + f[0] * 0.2 + 1.55, 0, z + f[1] * 0.2 + 0.9]} yaw={yaw + Math.PI / 2} y={FY} />
    </>
  )
}

// ------------------------------------------------------------------ drum kit
export function DrumKit({ position, yaw = 0 }) {
  const [x, z] = position
  const m = mm()
  const shell = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#8f1d3a', roughness: 0.25, metalness: 0.2, clearcoat: 1 }), [])
  const head = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f1efe8', roughness: 0.55 }), [])
  const cym = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d9b34c', roughness: 0.22, metalness: 1 }), [])
  const hit = useRef({ kick: 0, snare: 0, hat: 0, tom1: 0, tom2: 0, crash: 0 })
  const refs = useRef({})
  const run = useRef({ ev: null, t0: 0, i: 0 })
  const clk = useRef(clockOf())
  useFrame(({ clock }, dt) => {
    clk.current.t = clock.elapsedTime
    const r = run.current, H = hit.current
    if (r.ev) {
      const t = clock.elapsedTime - r.t0
      while (r.i < r.ev.length && r.ev[r.i].t <= t) { H[r.ev[r.i].k] = 1; r.i++ }
      if (r.i >= r.ev.length && t > r.ev[r.ev.length - 1].t + 1.5) r.ev = null
    }
    for (const k in H) H[k] = Math.max(0, H[k] - dt * 6)
    const R = refs.current
    if (R.kick) R.kick.scale.setScalar(1 - H.kick * 0.04)
    if (R.snare) R.snare.position.y = 0.78 - H.snare * 0.012
    if (R.tom1) R.tom1.position.y = 0.92 - H.tom1 * 0.012
    if (R.tom2) R.tom2.position.y = 0.52 - H.tom2 * 0.012
    if (R.hat) R.hat.position.y = 0.97 - H.hat * 0.02
    if (R.crash) R.crash.rotation.set(-0.25 + Math.sin(clock.elapsedTime * 32) * H.crash * 0.08, 0, 0.12 + Math.cos(clock.elapsedTime * 28) * H.crash * 0.08)
  })
  const f = [Math.sin(yaw), Math.cos(yaw)]
  useEffect(() => registerInteractable('drums-play', {
    position: new THREE.Vector3(x + f[0] * 1.3, FY + 1, z + f[1] * 1.3),
    radius: 2.0,
    label: () => (run.current.ev ? 'Drums...' : 'Play the drums'),
    onInteract: () => {
      if (run.current.ev) return
      const ev = [], S = 0.125
      const add = (step, k, bar) => { ev.push({ t: bar * 16 * S + step * S + 0.05, k }); inst.drum(k, bar * 16 * S + step * S + 0.05) }
      for (let bar = 0; bar < 3; bar++) {
        for (let s = 0; s < 16; s++) {
          if (s % 2 === 0) add(s, 'hat', bar)
          if ([0, 7, 8].includes(s)) add(s, 'kick', bar)
          if ([4, 12].includes(s) && !(bar === 2 && s === 12)) add(s, 'snare', bar)
        }
      }
      add(0, 'crash', 0); add(12, 'tom1', 2); add(13, 'tom1', 2); add(14, 'tom2', 2); add(15, 'tom2', 2); add(0, 'crash', 3)
      ev.sort((a, b) => a.t - b.t)
      run.current = { ev, t0: clk.current.t, i: 0 }
      useStore.getState().showToast('The kit plays a beat. Jazz drummers combined bass drum, snare and cymbals into one instrument.')
    },
  }), [x, z]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k) => (el) => { if (el) refs.current[k] = el }
  const Drum = ({ r, h, ...rest }) => (
    <group {...rest}>
      <mesh material={shell} castShadow><cylinderGeometry args={[r, r, h, 28]} /></mesh>
      <mesh position={[0, h / 2 + 0.003, 0]} material={head}><cylinderGeometry args={[r * 0.97, r * 0.97, 0.008, 28]} /></mesh>
      {[h / 2 - 0.01, -h / 2 + 0.01].map((yy) => <mesh key={yy} position={[0, yy, 0]} material={m.chrome}><cylinderGeometry args={[r + 0.006, r + 0.006, 0.014, 28]} /></mesh>)}
    </group>
  )
  return (
    <>
      <group position={[x, FY, z]} rotation={[0, yaw, 0]}>
        <RigidBody type="fixed" colliders={false}><CylinderCollider args={[0.5, 1.15]} position={[0, 0.5, 0]} /></RigidBody>
        <mesh position={[0, 0.01, 0]} receiveShadow><cylinderGeometry args={[1.45, 1.45, 0.02, 32]} /><meshStandardMaterial color="#3d2a4d" roughness={1} /></mesh>
        <group ref={set('kick')} position={[0, 0.34, 0.4]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={shell} castShadow><cylinderGeometry args={[0.34, 0.34, 0.42, 28]} /></mesh>
          <mesh position={[0, 0, 0.215]} rotation={[Math.PI / 2, 0, 0]} material={head}><cylinderGeometry args={[0.33, 0.33, 0.01, 28]} /></mesh>
          <mesh position={[0, 0, 0.22]} rotation={[Math.PI / 2, 0, 0]} material={m.chrome}><torusGeometry args={[0.335, 0.012, 6, 28]} /></mesh>
        </group>
        <mesh position={[0, 0.07, -0.2]} material={m.chrome}><boxGeometry args={[0.1, 0.04, 0.3]} /></mesh>
        <group ref={set('tom1')} position={[-0.2, 0.92, 0.38]} rotation={[0.25, 0, 0]}><Drum r={0.15} h={0.17} /></group>
        <group position={[0.24, 0.93, 0.38]} rotation={[0.25, 0, 0]}><Drum r={0.17} h={0.19} /></group>
        <group ref={set('snare')} position={[-0.38, 0.78, -0.1]} rotation={[0.08, 0, 0]}><Drum r={0.18} h={0.15} /></group>
        <Bar a={[-0.38, 0.0, -0.1]} b={[-0.38, 0.72, -0.1]} r={0.012} material={m.chrome} seg={6} />
        <group ref={set('tom2')} position={[0.78, 0.52, 0.12]}><Drum r={0.23} h={0.4} />{[0, 2.1, 4.2].map((a, i) => <Bar key={i} a={[Math.cos(a) * 0.2, -0.2, Math.sin(a) * 0.2]} b={[Math.cos(a) * 0.25, -0.52, Math.sin(a) * 0.25]} r={0.012} material={m.chrome} seg={5} />)}</group>
        {/* hi-hat, crash, ride */}
        <Bar a={[-0.88, 0.0, -0.05]} b={[-0.88, 0.93, -0.05]} r={0.012} material={m.chrome} seg={6} />
        <group ref={set('hat')} position={[-0.88, 0.97, -0.05]}><mesh material={cym}><cylinderGeometry args={[0.18, 0.18, 0.012, 28]} /></mesh><mesh position={[0, -0.03, 0]} material={cym}><cylinderGeometry args={[0.18, 0.18, 0.012, 28]} /></mesh></group>
        <Bar a={[-0.5, 0.0, 0.5]} b={[-0.5, 1.4, 0.5]} r={0.012} material={m.chrome} seg={6} />
        <group ref={set('crash')} position={[-0.5, 1.42, 0.5]} rotation={[-0.25, 0, 0.12]}><mesh material={cym}><cylinderGeometry args={[0.24, 0.22, 0.01, 30]} /></mesh><mesh position={[0, 0.012, 0]} material={cym}><sphereGeometry args={[0.04, 10, 6]} /></mesh></group>
        <Bar a={[0.7, 0.0, 0.6]} b={[0.7, 1.2, 0.6]} r={0.012} material={m.chrome} seg={6} />
        <mesh position={[0.7, 1.22, 0.6]} rotation={[-0.15, 0, -0.08]} material={cym}><cylinderGeometry args={[0.28, 0.26, 0.01, 30]} /></mesh>
        {/* throne */}
        <mesh position={[0, 0.5, -0.78]} material={m.black} castShadow><cylinderGeometry args={[0.18, 0.17, 0.09, 20]} /></mesh>
        <Bar a={[0, 0.0, -0.78]} b={[0, 0.46, -0.78]} r={0.02} material={m.chrome} seg={6} />
        {[0, 2.1, 4.2].map((a, i) => <Bar key={i} a={[0, 0.2, -0.78]} b={[Math.cos(a) * 0.3, 0.0, -0.78 + Math.sin(a) * 0.3]} r={0.012} material={m.chrome} seg={5} />)}
      </group>
      <Placard id="drums" position={[x - 1.8, 0, z + 1.9]} yaw={0} y={FY} />
    </>
  )
}

// ------------------------------------------------------------------ electric guitar and amp
function guitarShape() {
  const half = [[0, -0.34], [0.1, -0.335], [0.17, -0.285], [0.19, -0.2], [0.16, -0.09], [0.125, 0.0], [0.14, 0.08], [0.175, 0.14], [0.165, 0.21], [0.125, 0.285], [0.085, 0.225], [0.07, 0.17], [0.03, 0.16]]
  const pts = [...half.map(([x, y]) => new THREE.Vector2(x, y)), ...half.slice().reverse().map(([x, y]) => new THREE.Vector2(-x, y))]
  const c = new THREE.SplineCurve(pts.concat([pts[0]]))
  return new THREE.Shape(c.getPoints(120))
}
export function ElectricGuitar({ position, yaw = Math.PI / 2 }) {
  const [x, z] = position
  const m = mm()
  const body = useMemo(() => { const g = new THREE.ExtrudeGeometry(guitarShape(), { depth: 0.04, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2, curveSegments: 40 }); g.translate(0, 0, -0.02); return g }, [])
  const pink = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#e0559f', roughness: 0.18, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.06 }), [])
  const guard = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f1ece0', roughness: 0.4 }), [])
  const strings = useRef([])
  const glow = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ff9a3c', emissive: '#ff5a1a', emissiveIntensity: 0.4, roughness: 0.4 }), [])
  const run = useRef({ t0: -10, n: 0 }), clk = useRef(clockOf())
  useFrame(({ clock }) => {
    clk.current.t = clock.elapsedTime
    const t = clock.elapsedTime - run.current.t0
    const a = t < 1.6 ? Math.exp(-t * 2.6) : 0
    strings.current.forEach((s, i) => { if (s) s.position.x = (i - 2.5) * 0.0075 + Math.sin(clock.elapsedTime * (60 + i * 9)) * a * 0.004 })
    glow.emissiveIntensity = 0.4 + a * 3
  })
  const f = [Math.sin(yaw), Math.cos(yaw)]
  const CHORDS = [[40, [0, 7, 12, 16, 19, 24], 'E'], [45, [0, 7, 12, 16, 19], 'A'], [38, [0, 7, 12, 18, 21], 'D'], [43, [0, 7, 12, 16, 19, 24], 'G']]
  useEffect(() => registerInteractable('guitar-strum', {
    position: new THREE.Vector3(x + f[0] * 1.0, FY + 1, z + f[1] * 1.0),
    radius: 2.0,
    label: 'Strum the electric guitar',
    onInteract: () => {
      const [root, shape, name] = CHORDS[run.current.n++ % CHORDS.length]
      inst.strum(root, shape)
      run.current.t0 = clk.current.t
      useStore.getState().showToast(`You strummed an ${name} chord. Solid-body electric guitars went into regular production around 1950.`)
    },
  }), [x, z]) // eslint-disable-line react-hooks/exhaustive-deps
  const frets = useMemo(() => Array.from({ length: 17 }, (_, i) => ({ p: [0, 0.16 + 0.04 + i * 0.033, 0.014], s: [0.052, 0.004, 0.006] })), [])
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  return (
    <>
      <group position={[x, FY, z]} rotation={[0, yaw, 0]}>
        <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.5, 0.5, 0.35]} position={[0, 0.5, 0]} /></RigidBody>
        {/* stand */}
        {[0, 2.1, 4.2].map((a, i) => <Bar key={i} a={[0, 0.5, 0]} b={[Math.cos(a) * 0.32, 0.0, Math.sin(a) * 0.32]} r={0.012} material={m.black} seg={5} />)}
        <Bar a={[0, 0.5, 0]} b={[0, 0.78, 0]} r={0.014} material={m.black} seg={5} />
        <group position={[0.0, 1.0, 0.05]} rotation={[-0.12, 0, 0.0]}>
          {/* body, pickguard, hardware */}
          <mesh geometry={body} material={pink} castShadow />
          <mesh position={[0.0, -0.04, 0.025]} scale={[0.82, 0.9, 1]}><shapeGeometry args={[guitarShape()]} /><meshStandardMaterial color="#f1ece0" roughness={0.4} /></mesh>
          {[-0.015, 0.045, 0.105].map((py, i) => <group key={i} position={[0, py - 0.03, 0.03]}><mesh material={m.black}><boxGeometry args={[0.1, 0.03, 0.012]} /></mesh>{[-0.03, -0.01, 0.01, 0.03].map((px) => <mesh key={px} position={[px, 0, 0.008]} material={m.chrome}><cylinderGeometry args={[0.004, 0.004, 0.006, 6]} /></mesh>)}</group>)}
          <mesh position={[0, -0.23, 0.03]} material={m.chrome}><boxGeometry args={[0.1, 0.03, 0.014]} /></mesh>
          {[[0.08, -0.2], [0.115, -0.15], [0.14, -0.1]].map(([kx, ky], i) => <mesh key={i} position={[kx, ky, 0.04]} rotation={[Math.PI / 2, 0, 0]} material={m.black}><cylinderGeometry args={[0.014, 0.014, 0.022, 10]} /></mesh>)}
          {/* neck: fretboard, frets, headstock, pegs, strings */}
          <mesh position={[0, 0.16 + 0.31, 0.0]} material={m.oak}><boxGeometry args={[0.046, 0.62, 0.022]} /></mesh>
          <mesh position={[0, 0.16 + 0.31, 0.012]} material={m.walnutSolid}><boxGeometry args={[0.052, 0.58, 0.006]} /></mesh>
          <Instances geometry={box} material={m.chrome} items={frets} />
          <mesh position={[0, 0.86, 0.005]} rotation={[0, 0, 0]} material={pink} castShadow><boxGeometry args={[0.07, 0.16, 0.018]} /></mesh>
          {[-1, 1].map((s) => [0, 1, 2].map((k) => <mesh key={`${s}${k}`} position={[s * 0.046, 0.82 + k * 0.045, 0.012]} rotation={[0, 0, Math.PI / 2]} material={m.chrome}><cylinderGeometry args={[0.008, 0.008, 0.02, 8]} /></mesh>))}
          {Array.from({ length: 6 }, (_, i) => <mesh key={i} ref={(el) => (strings.current[i] = el)} position={[(i - 2.5) * 0.0075, 0.3, 0.02]} material={m.chrome}><boxGeometry args={[0.002, 0.95, 0.002]} /></mesh>)}
        </group>
      </group>
      {/* amp stack beside the stand */}
      <group position={[x + f[1] * -1.0 + f[0] * -0.3, FY, z + f[0] * 1.0 + f[1] * -0.3]} rotation={[0, yaw, 0]}>
        <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.38, 0.3, 0.2]} position={[0, 0.3, 0]} /></RigidBody>
        <mesh position={[0, 0.3, 0]} castShadow><boxGeometry args={[0.76, 0.6, 0.36]} /><meshStandardMaterial color="#1c1a22" roughness={0.85} /></mesh>
        <mesh position={[0, 0.26, 0.185]}><planeGeometry args={[0.66, 0.42]} /><meshStandardMaterial color="#8c7d5a" roughness={1} /></mesh>
        <mesh position={[0, 0.54, 0.185]} material={m.brass}><boxGeometry args={[0.7, 0.05, 0.01]} /></mesh>
        {[-0.24, -0.08, 0.08, 0.24].map((kx) => <mesh key={kx} position={[kx, 0.54, 0.195]} rotation={[Math.PI / 2, 0, 0]} material={m.chrome}><cylinderGeometry args={[0.018, 0.018, 0.02, 10]} /></mesh>)}
        <mesh position={[0.3, 0.54, 0.195]} material={glow}><sphereGeometry args={[0.014, 8, 6]} /></mesh>
        <mesh position={[0, 0.62, 0]} rotation={[0, 0, Math.PI / 2]} material={m.chrome}><cylinderGeometry args={[0.012, 0.012, 0.3, 8]} /></mesh>
      </group>
      <Placard id="guitar" position={[x + f[0] * 1.5, 0, z + f[1] * 1.5 - 1.0]} yaw={yaw} y={FY} />
    </>
  )
}

// ------------------------------------------------------------------ jukebox
export function Jukebox({ position, yaw = Math.PI / 2 }) {
  const [x, z] = position
  const m = mm()
  const shape = useMemo(() => { const s = new THREE.Shape(); s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0.5, 1.15); s.absarc(0, 1.15, 0.5, 0, Math.PI, false); s.lineTo(-0.5, 0); return s }, [])
  const body = useMemo(() => { const g = new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3, curveSegments: 32 }); g.translate(0, 0, -0.28); return g }, [shape])
  const shell = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#b33a1d', roughness: 0.22, metalness: 0.15, clearcoat: 1 }), [])
  const neonA = useMemo(() => nightLit(new THREE.MeshStandardMaterial({ color: '#ff4fa0', emissive: '#ff4fa0', emissiveIntensity: 1.2, toneMapped: false }), 3, 1.2), [])
  const neonB = useMemo(() => nightLit(new THREE.MeshStandardMaterial({ color: '#2fd0c4', emissive: '#2fd0c4', emissiveIntensity: 1.2, toneMapped: false }), 3, 1.2), [])
  const plat = useRef(), arm = useRef()
  const state = useRef({ on: false, t: 0 })
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const playing = jukeboxOn()
    state.current.on = playing
    neonA.color.setHSL((t * (playing ? 0.35 : 0.05)) % 1, 0.85, 0.6); neonA.emissive.copy(neonA.color)
    neonB.color.setHSL((t * (playing ? 0.35 : 0.05) + 0.5) % 1, 0.85, 0.6); neonB.emissive.copy(neonB.color)
    if (plat.current && playing) plat.current.rotation.y += Math.min(dt, 0.05) * 3.5
    if (arm.current) arm.current.rotation.y = THREE.MathUtils.lerp(arm.current.rotation.y, playing ? 0.35 : -0.15, 0.08)
    if (playing && !near(x, z, 22)) { stopJukebox(); useStore.getState().showToast('The jukebox falls quiet as you walk away.') }
  })
  const f = [Math.sin(yaw), Math.cos(yaw)]
  useEffect(() => registerInteractable('jukebox-play', {
    position: new THREE.Vector3(x + f[0] * 0.9, FY + 1, z + f[1] * 0.9),
    radius: 1.9,
    label: () => (jukeboxOn() ? 'Stop the jukebox' : 'Play a record'),
    onInteract: () => {
      if (jukeboxOn()) { stopJukebox(); return }
      if (startJukebox()) useStore.getState().showToast('A 12-bar blues shuffle, played live by the jukebox. Jukeboxes spread through diners in the 1930s.')
      else useStore.getState().showToast('Turn the sound on (any key or click) and try again.')
    },
  }), [x, z]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stopJukebox(), [])
  const buttons = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ x: -0.19 + (i % 4) * 0.126, y: 0.42 - Math.floor(i / 4) * 0.07 })), [])
  return (
    <>
      <group position={[x, FY, z]} rotation={[0, yaw, 0]}>
        <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.55, 0.9, 0.3]} position={[0, 0.9, 0]} /></RigidBody>
        <mesh geometry={body} material={shell} castShadow />
        <mesh position={[0, 0.05, 0]} material={m.chrome}><boxGeometry args={[1.08, 0.1, 0.58]} /></mesh>
        {/* record window: platter, record, arm */}
        <mesh position={[0, 0.92, 0.27]} material={m.black}><boxGeometry args={[0.78, 0.5, 0.02]} /></mesh>
        <group position={[0, 0.92, 0.28]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={m.steel}><cylinderGeometry args={[0.22, 0.22, 0.01, 28]} /></mesh>
          <group ref={plat} position={[0, 0.0, 0.01]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.2, 0.2, 0.008, 36]} /><meshStandardMaterial color="#0c0c10" roughness={0.3} metalness={0.3} /></mesh>
            <mesh position={[0, 0, 0.006]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.07, 0.07, 0.003, 20]} /><meshStandardMaterial color="#e8c24a" roughness={0.5} /></mesh>
            {[0.1, 0.13, 0.16].map((rr) => <mesh key={rr} position={[0, 0, 0.005]}><ringGeometry args={[rr, rr + 0.004, 40]} /><meshBasicMaterial color="#30303a" /></mesh>)}
          </group>
          <group ref={arm} position={[0.28, 0.15, 0.03]}><Bar a={[0, 0, 0]} b={[-0.25, -0.12, 0]} r={0.008} material={m.chrome} seg={5} /></group>
        </group>
        <mesh position={[0, 0.92, 0.305]} material={m.glass} userData={{ noBatch: true }}><boxGeometry args={[0.8, 0.52, 0.01]} /></mesh>
        {/* speaker grille and selection panel */}
        <mesh position={[0, 0.22, 0.27]} material={m.black}><boxGeometry args={[0.78, 0.4, 0.02]} /></mesh>
        {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[0, 0.07 + i * 0.04, 0.285]} material={m.chrome}><boxGeometry args={[0.72, 0.008, 0.008]} /></mesh>)}
        <mesh position={[0, 0.62, 0.27]} material={m.chrome}><boxGeometry args={[0.8, 0.12, 0.02]} /></mesh>
        {buttons.map((b, i) => <mesh key={i} position={[b.x * 0.9 - 0.0, 0.62 + (i % 2 ? 0.0 : 0.0), 0.285]} material={i % 3 === 0 ? neonA : i % 3 === 1 ? neonB : m.brass}><cylinderGeometry args={[0.013, 0.013, 0.01, 8]} /></mesh>).slice(0, 8)}
        <mesh position={[0.34, 0.42, 0.28]} material={m.brass}><boxGeometry args={[0.07, 0.1, 0.012]} /></mesh>
        {/* neon: arch tubes and side runs */}
        <mesh position={[0, 1.15, 0.275]} material={neonA}><torusGeometry args={[0.44, 0.016, 8, 40, Math.PI]} /></mesh>
        <mesh position={[0, 1.15, 0.275]} material={neonB}><torusGeometry args={[0.37, 0.012, 8, 40, Math.PI]} /></mesh>
        {[-1, 1].map((sx) => <mesh key={sx} position={[sx * 0.47, 0.6, 0.275]} material={sx > 0 ? neonB : neonA}><boxGeometry args={[0.02, 1.0, 0.02]} /></mesh>)}
        <mesh position={[0, 1.78, 0]} rotation={[0, 0, 0]} material={m.chrome}><sphereGeometry args={[0.05, 10, 8]} /></mesh>
      </group>
      <Placard id="jukebox" position={[x + f[0] * 1.7 - 0.9 * f[1], 0, z + f[1] * 1.7 - 0.9 * f[0]]} yaw={yaw} y={FY} />
    </>
  )
}
