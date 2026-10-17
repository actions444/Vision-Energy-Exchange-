import { useMemo } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { mm, Placard, GlassCase, FY, hash, Bar, Instances, canvasTex } from './kit.jsx'

// Land & Life: a Tyrannosaurus rex skeleton cast mounted on a dais, and a case of American minerals.

const bone = new THREE.MeshStandardMaterial({ color: '#e7dbbd', roughness: 0.62, metalness: 0.02 })
const boneDark = new THREE.MeshStandardMaterial({ color: '#cbbd9a', roughness: 0.7 })
const socket = new THREE.MeshStandardMaterial({ color: '#241d17', roughness: 1 })

const spineCurve = new THREE.CatmullRomCurve3([
  [0, 3.05, 3.9], [0, 3.35, 3.2], [0, 3.55, 2.3], [0, 3.38, 1.1], [0, 3.15, -0.2], [0, 3.02, -1.0], [0, 2.95, -2.2], [0, 2.72, -3.8], [0, 2.48, -5.2], [0, 2.25, -6.3],
].map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.5)

function Skull() {
  const upper = useMemo(() => {
    const s = new THREE.Shape()
    ;[[1.3, 0.0], [1.28, 0.16], [0.75, 0.27], [0.25, 0.38], [-0.1, 0.44], [-0.45, 0.32], [-0.5, 0.0], [-0.3, -0.1], [0.2, -0.12], [1.3, -0.05]].forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y)))
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 })
    g.translate(0, 0, -0.15)
    g.rotateY(-Math.PI / 2) // extrude along x: shape x (length) -> world z
    return g
  }, [])
  const lower = useMemo(() => {
    const s = new THREE.Shape()
    ;[[1.15, -0.04], [0.2, -0.14], [-0.35, -0.12], [-0.5, 0.0], [-0.42, 0.1], [0.2, 0.0], [1.15, 0.02]].forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y)))
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 })
    g.translate(0, 0, -0.1)
    g.rotateY(-Math.PI / 2)
    return g
  }, [])
  const toothGeo = useMemo(() => new THREE.ConeGeometry(0.035, 0.16, 6), [])
  const upTeeth = useMemo(() => {
    const out = []
    for (let i = 0; i < 13; i++) for (const sx of [-1, 1]) out.push({ p: [sx * 0.13, -0.18 - (i % 3 === 0 ? 0.03 : 0), 1.15 - i * 0.1], s: [1, 1 + (i % 4 === 1 ? 0.35 : 0) - i * 0.02, 1], r: [Math.PI, 0, 0] })
    return out
  }, [])
  const loTeeth = useMemo(() => {
    const out = []
    for (let i = 0; i < 11; i++) for (const sx of [-1, 1]) out.push({ p: [sx * 0.1, 0.08 + 0.06, 1.0 - i * 0.1], s: [0.85, 0.9, 0.85] })
    return out
  }, [])
  return (
    <group>
      <mesh geometry={upper} material={bone} castShadow />
      <Instances geometry={toothGeo} material={bone} items={upTeeth} castShadow />
      {/* eye sockets, nostril, antorbital openings */}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <mesh position={[sx * 0.2, 0.22, 0.0]} scale={[0.04, 0.1, 0.1]} material={socket}><sphereGeometry args={[1, 10, 8]} /></mesh>
          <mesh position={[sx * 0.18, 0.15, 0.62]} scale={[0.04, 0.1, 0.17]} material={socket}><sphereGeometry args={[1, 10, 8]} /></mesh>
          <mesh position={[sx * 0.13, 0.15, 1.17]} scale={[0.04, 0.05, 0.07]} material={socket}><sphereGeometry args={[1, 8, 6]} /></mesh>
          <mesh position={[sx * 0.17, 0.4, 0.15]} scale={[0.08, 0.04, 0.12]} material={boneDark}><sphereGeometry args={[1, 8, 6]} /></mesh>
        </group>
      ))}
      <group position={[0, -0.1, -0.35]} rotation={[0.3, 0, 0]}>
        <group position={[0, 0.0, 0.35]}>
          <mesh geometry={lower} material={bone} castShadow />
          <Instances geometry={toothGeo} material={bone} items={loTeeth} castShadow />
        </group>
      </group>
    </group>
  )
}

function Ribs() {
  const geo = useMemo(() => {
    const list = []
    for (let i = 0; i < 12; i++) {
      const t = 0.28 + (i / 11) * 0.28 // along the back section of the spine curve
      const sp = spineCurve.getPoint(t)
      const k = Math.sin(((i + 1) / 13) * Math.PI) * 0.45 + 0.65 // biggest in the middle
      for (const sx of [-1, 1]) {
        const c = new THREE.CatmullRomCurve3([
          new THREE.Vector3(sx * 0.1, sp.y - 0.05, sp.z), new THREE.Vector3(sx * 0.5 * k, sp.y - 0.2, sp.z + 0.04), new THREE.Vector3(sx * 0.72 * k, sp.y - 0.7 * k, sp.z + 0.1),
          new THREE.Vector3(sx * 0.58 * k, sp.y - 1.3 * k, sp.z + 0.2), new THREE.Vector3(sx * 0.2, sp.y - 1.62 * k, sp.z + 0.3),
        ])
        list.push(new THREE.TubeGeometry(c, 16, 0.024 + (1 - Math.abs(i - 5) / 6) * 0.01, 5, false))
      }
    }
    return mergeGeometries(list)
  }, [])
  return <mesh geometry={geo} material={bone} castShadow />
}

function Vertebrae() {
  const body = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 8), [])
  const spineBox = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const { centra, spines } = useMemo(() => {
    const c = [], s = []
    const N = 44
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1)
      const p = spineCurve.getPoint(t), tg = spineCurve.getTangent(t)
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tg)
      const e = new THREE.Euler().setFromQuaternion(q)
      const r = t < 0.3 ? 0.075 + t * 0.05 : t < 0.5 ? 0.115 : Math.max(0.025, 0.115 * (1 - (t - 0.5) * 1.75))
      c.push({ p: [p.x, p.y, p.z], r: [e.x, e.y, e.z], s: [r, 0.17, r] })
      if (t > 0.22 && t < 0.92) s.push({ p: [p.x, p.y + r + 0.14 * (1 - t), p.z], s: [0.025, 0.2 * (1 - t) + 0.05, 0.05] })
    }
    return { centra: c, spines: s }
  }, [])
  return (
    <>
      <Instances geometry={body} material={bone} items={centra} castShadow />
      <Instances geometry={spineBox} material={boneDark} items={spines} castShadow />
    </>
  )
}

function Leg({ s }) {
  const J = (p, r = 0.06) => <mesh position={p} material={bone}><sphereGeometry args={[r, 10, 8]} /></mesh>
  const hip = [s * 0.44, 2.92, -0.85], knee = [s * 0.56, 1.88, 0.2], ankle = [s * 0.52, 0.85, -0.5], ball = [s * 0.5, 0.14, -0.25]
  const toes = [[-0.2, 0.62], [0, 0.78], [0.2, 0.66]]
  return (
    <group>
      <Bar a={hip} b={knee} r={0.13} r2={0.1} material={bone} /> {J(hip, 0.14)} {J(knee, 0.12)}
      <Bar a={knee} b={ankle} r={0.085} r2={0.075} material={bone} /> {J(ankle, 0.08)}
      <Bar a={ankle} b={ball} r={0.06} material={bone} /> {J(ball, 0.07)}
      {toes.map(([dx, len], i) => {
        const mid = [ball[0] + dx * 0.5 * s, 0.08, ball[2] + len * 0.5], tip = [ball[0] + dx * s * 0.9, 0.04, ball[2] + len]
        return (
          <group key={i}>
            <Bar a={ball} b={mid} r={0.04} material={bone} /> <Bar a={mid} b={tip} r={0.032} material={bone} />
            <mesh position={[tip[0], tip[1] + 0.0, tip[2] + 0.08]} rotation={[Math.PI / 2 + 0.3, 0, 0]} material={boneDark}><coneGeometry args={[0.035, 0.2, 6]} /></mesh>
          </group>
        )
      })}
      <mesh position={[ball[0] - s * 0.1, 0.06, ball[2] - 0.2]} rotation={[-Math.PI / 2 + 0.5, 0, 0]} material={boneDark}><coneGeometry args={[0.03, 0.16, 6]} /></mesh>
    </group>
  )
}

function Skeleton() {
  return (
    <group>
      <Vertebrae />
      <Ribs />
      {/* pelvis: ilium plates, pubic boots, ischia */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.3, 3.18, -0.85]} scale={[0.07, 0.34, 0.72]} material={bone} castShadow><sphereGeometry args={[1, 14, 10]} /></mesh>
          <Bar a={[s * 0.36, 2.98, -0.7]} b={[s * 0.3, 2.35, 0.3]} r={0.06} material={bone} />
          <mesh position={[s * 0.3, 2.28, 0.4]} scale={[0.08, 0.09, 0.28]} material={bone}><sphereGeometry args={[1, 10, 8]} /></mesh>
          <Bar a={[s * 0.34, 2.92, -1.0]} b={[s * 0.2, 2.1, -1.75]} r={0.05} material={bone} />
          <Leg s={s} />
          {/* arm: scapula, humerus, forearm, two claws */}
          <Bar a={[s * 0.3, 3.1, 1.7]} b={[s * 0.34, 2.72, 1.9]} r={0.05} material={bone} />
          <Bar a={[s * 0.34, 2.72, 1.9]} b={[s * 0.34, 2.3, 2.2]} r={0.045} material={bone} />
          <Bar a={[s * 0.34, 2.3, 2.2]} b={[s * 0.36, 2.0, 2.45]} r={0.035} material={bone} />
          {[0, 1].map((k) => <mesh key={k} position={[s * (0.34 + k * 0.05), 1.9, 2.55]} rotation={[Math.PI / 2 + 0.5, 0, 0]} material={boneDark}><coneGeometry args={[0.025, 0.2, 6]} /></mesh>)}
        </group>
      ))}
      {/* skull at the end of the neck, jaw slightly open */}
      <group position={[0, 3.0, 4.1]} rotation={[0.18, 0, 0]}><Skull /></group>
      {/* belly ribs (gastralia) */}
      {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[0, 1.55, 1.9 - i * 0.28]} rotation={[0, 0, Math.PI / 2]} material={boneDark}><cylinderGeometry args={[0.012, 0.012, 0.8 - Math.abs(i - 3.5) * 0.08, 5]} /></mesh>)}
    </group>
  )
}

export function TRex({ position, yaw = 0 }) {
  const [x, z] = position
  const m = mm()
  const ground = useMemo(() => canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#8c7a5c'; g.fillRect(0, 0, w, h)
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${90 + hash(i) * 70},${75 + hash(i * 2) * 60},${55 + hash(i * 3) * 40},${0.25 + hash(i * 5) * 0.4})`; g.fillRect(hash(i * 7) * w, hash(i * 11) * h, 2 + hash(i * 13) * 8, 2 + hash(i * 17) * 6) }
  }, { repeat: [5, 1.6] }), [])
  const DAIS = 0.8
  return (
    <group>
      <group position={[x, FY, z]} rotation={[0, yaw, 0]}>
        <RigidBody type="fixed" colliders={false}><CuboidCollider args={[2.1, DAIS / 2, 6.5]} position={[0, DAIS / 2, 0]} /></RigidBody>
        <mesh position={[0, DAIS / 2, 0]} material={m.stoneSmooth} castShadow receiveShadow><boxGeometry args={[4.0, DAIS, 12.8]} /></mesh>
        <mesh position={[0, DAIS + 0.015, 0]} receiveShadow><boxGeometry args={[3.7, 0.03, 12.5]} /><meshStandardMaterial map={ground} roughness={1} /></mesh>
        <mesh position={[0, DAIS + 0.02, 0]} material={m.brass}><boxGeometry args={[4.06, 0.04, 12.86]} /></mesh>
        {/* rocks */}
        {[[-1.1, 2.0], [1.2, -1.6], [-1.3, -4.0], [1.0, 4.6], [0.2, -5.6]].map(([rx, rz], i) => <mesh key={i} position={[rx, DAIS + 0.2, rz]} rotation={[hash(i), hash(i * 2) * 3, 0]} castShadow><dodecahedronGeometry args={[0.28 + hash(i * 3) * 0.2, 0]} /><meshStandardMaterial color="#7c705e" roughness={1} /></mesh>)}
        <group position={[0, DAIS + 0.02, 0]}>
          <Skeleton />
          {/* steel armature */}
          {[[0, 0, 1.2], [0, 0, -1.4], [0, 0, -4.2]].map(([ax, , az], i) => {
            const t = [0.38, 0.55, 0.78][i], sp = spineCurve.getPoint(t)
            return <Bar key={i} a={[0, 0, az]} b={[0, sp.y - 0.12, sp.z]} r={0.02} material={m.steel} seg={6} />
          })}
        </group>
      </group>
      <Placard id="trex" position={[x + 1.5, 0, z + 2.6]} yaw={0} y={FY} />
    </group>
  )
}

// ------------------------------------------------------------------ triceratops skull
function Frill() {
  const bumpGeo = useMemo(() => new THREE.ConeGeometry(1, 1, 6), [])
  const bumps = useMemo(() => Array.from({ length: 11 }, (_, i) => {
    const a = -Math.PI * 0.62 + (i / 10) * Math.PI * 1.24
    return { p: [Math.sin(a) * 0.62, 0.02, -0.1 - Math.cos(a) * 0.5], r: [0.3, a, 0], s: [0.09, 0.09, 0.05] }
  }), [])
  const frillMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e3d6ab', roughness: 0.65 }), [])
  return (
    <group>
      <mesh position={[0, 0.02, -0.28]} rotation={[0.25, 0, 0]} scale={[1.25, 0.72, 1]} material={frillMat} castShadow>
        <sphereGeometry args={[0.62, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <Instances geometry={bumpGeo} material={bone} items={bumps} castShadow />
    </group>
  )
}

function TriceratopsSkull() {
  const toothGeo = useMemo(() => new THREE.ConeGeometry(0.015, 0.05, 5), [])
  const teeth = useMemo(() => Array.from({ length: 10 }, (_, i) => ({ p: [-0.11 + (i % 5) * 0.055, -0.1, 0.44 - Math.floor(i / 5) * 0.52], r: [Math.PI, 0, 0] })), [])
  return (
    <group position={[0, 0.1, 0.1]}>
      <Frill />
      {/* snout / beak block */}
      <mesh position={[0, -0.02, 0.52]} scale={[0.46, 0.4, 0.95]} material={bone} castShadow><boxGeometry args={[1, 1, 1]} /></mesh>
      <mesh position={[0, -0.14, 0.86]} scale={[0.3, 0.22, 0.26]} material={bone} castShadow><boxGeometry args={[1, 1, 1]} /></mesh>
      {/* cheek flare */}
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.32, -0.08, 0.4]} rotation={[0, s * 0.5, 0]} scale={[0.22, 0.18, 0.1]} material={bone} castShadow><boxGeometry args={[1, 1, 1]} /></mesh>)}
      {/* eye sockets */}
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.28, 0.08, 0.14]} scale={[0.1, 0.12, 0.1]} material={socket}><sphereGeometry args={[1, 10, 8]} /></mesh>)}
      {/* brow horns */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.24, 0.18, 0.1]} rotation={[-0.3, 0, s * -0.12]}>
          <mesh position={[0, 0.3, 0]} material={bone} castShadow><coneGeometry args={[0.07, 0.62, 10]} /></mesh>
        </group>
      ))}
      {/* nasal horn */}
      <group position={[0, -0.02, 0.78]} rotation={[-1.3, 0, 0]}>
        <mesh position={[0, 0.14, 0]} material={bone} castShadow><coneGeometry args={[0.05, 0.3, 10]} /></mesh>
      </group>
      {/* beak tip */}
      <mesh position={[0, -0.2, 1.0]} rotation={[Math.PI / 2, 0, 0]} material={socket}><coneGeometry args={[0.1, 0.1, 10]} /></mesh>
      <Instances geometry={toothGeo} material={bone} items={teeth} />
    </group>
  )
}

/** A Triceratops skull cast in a glass case, standing nearby the T. rex. */
export function Triceratops({ position }) {
  const [x, z] = position
  return (
    <group>
      <GlassCase position={[x, 0, z]} size={[1.9, 1.35, 1.3]} base={0.85} y={FY}>
        <group position={[0, 0.5, 0]} scale={1.25}><TriceratopsSkull /></group>
      </GlassCase>
      <Placard id="triceratops" position={[x, 0, z + 1.5]} yaw={0} y={FY} />
    </group>
  )
}

// ------------------------------------------------------------------ velociraptor skeleton
const raptorSpine = new THREE.CatmullRomCurve3([
  [0, 1.0, 2.65], [0, 1.08, 1.95], [0, 1.15, 1.05], [0, 1.0, 0.15], [0, 0.82, -0.75], [0, 0.6, -1.55], [0, 0.4, -2.25], [0, 0.22, -2.75],
].map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.5)

function RaptorSkull() {
  const toothGeo = useMemo(() => new THREE.ConeGeometry(0.012, 0.04, 5), [])
  const teeth = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ p: [0.02 * (i % 2 ? 1 : -1), -0.05, 0.42 - i * 0.03], r: [Math.PI, 0, 0] })), [])
  const skullGeo = useMemo(() => {
    const s = new THREE.Shape()
    ;[[0.5, 0], [0.47, 0.07], [0.2, 0.1], [-0.1, 0.16], [-0.24, 0.1], [-0.26, 0], [-0.1, -0.03], [0.3, -0.04]].forEach(([zz, y], i) => (i ? s.lineTo(zz, y) : s.moveTo(zz, y)))
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 })
    g.translate(0, 0, -0.07); g.rotateY(-Math.PI / 2)
    return g
  }, [])
  return (
    <group>
      <mesh geometry={skullGeo} material={bone} castShadow />
      <Instances geometry={toothGeo} material={bone} items={teeth} />
      {[-1, 1].map((sx) => <mesh key={sx} position={[sx * 0.075, 0.07, 0.08]} scale={[0.02, 0.045, 0.045]} material={socket}><sphereGeometry args={[1, 8, 6]} /></mesh>)}
    </group>
  )
}

function RaptorBody() {
  const bodyGeo = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 8), [])
  const items = useMemo(() => {
    const out = []
    const N = 30
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1)
      const p = raptorSpine.getPoint(t), tg = raptorSpine.getTangent(t)
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tg)
      const e = new THREE.Euler().setFromQuaternion(q)
      const r = t < 0.35 ? 0.05 + t * 0.03 : Math.max(0.008, 0.07 * (1 - (t - 0.35) * 1.4))
      out.push({ p: [p.x, p.y, p.z], r: [e.x, e.y, e.z], s: [r, 0.07, r] })
    }
    return out
  }, [])
  return <Instances geometry={bodyGeo} material={bone} items={items} castShadow />
}

function RaptorRibs() {
  const bars = []
  for (let i = 0; i < 6; i++) {
    const t = 0.05 + i * 0.045
    const p = raptorSpine.getPoint(t)
    for (const sx of [-1, 1]) bars.push([[0, p.y - 0.02, p.z], [sx * 0.18, p.y - 0.1, p.z + 0.02]])
  }
  return bars.map((pair, i) => <Bar key={i} a={pair[0]} b={pair[1]} r={0.012} material={boneDark} />)
}

function RaptorLeg({ s }) {
  const J = (p, r = 0.025) => <mesh position={p} material={bone}><sphereGeometry args={[r, 8, 6]} /></mesh>
  const hip = [s * 0.13, 1.05, 0.4], knee = [s * 0.16, 0.62, 0.8], ankle = [s * 0.14, 0.28, 0.63], ball = [s * 0.13, 0.05, 0.73]
  const toes = [[-0.07, 0.22], [0, 0.3], [0.07, 0.22]]
  return (
    <group>
      <Bar a={hip} b={knee} r={0.045} r2={0.035} material={bone} /> {J(hip, 0.05)} {J(knee, 0.04)}
      <Bar a={knee} b={ankle} r={0.03} r2={0.025} material={bone} /> {J(ankle, 0.03)}
      <Bar a={ankle} b={ball} r={0.022} material={bone} /> {J(ball, 0.025)}
      {toes.map(([dx, len], i) => {
        const mid = [ball[0] + dx * 0.5 * s, 0.03, ball[2] + len * 0.5], tip = [ball[0] + dx * s, 0.015, ball[2] + len]
        return (
          <group key={i}>
            <Bar a={ball} b={mid} r={0.016} material={bone} /> <Bar a={mid} b={tip} r={0.012} material={bone} />
            <mesh position={[tip[0], tip[1], tip[2] + 0.03]} rotation={[Math.PI / 2 + 0.3, 0, 0]} material={boneDark}><coneGeometry args={[0.015, 0.07, 6]} /></mesh>
          </group>
        )
      })}
      {/* the famous raised sickle claw, held off the ground */}
      <group position={[ball[0] + s * 0.05, 0.14, ball[2] + 0.1]} rotation={[0.9, 0, 0]}>
        <mesh material={boneDark} castShadow><coneGeometry args={[0.028, 0.16, 8]} /></mesh>
      </group>
    </group>
  )
}

function RaptorArm({ s }) {
  const shoulder = [s * 0.1, 1.1, 1.65], elbow = [s * 0.13, 0.85, 1.8], wrist = [s * 0.14, 0.62, 1.85]
  return (
    <group>
      <Bar a={shoulder} b={elbow} r={0.03} material={bone} />
      <Bar a={elbow} b={wrist} r={0.024} material={bone} />
      {[-0.03, 0, 0.03].map((dx, i) => {
        const tip = [wrist[0] + dx, wrist[1] - 0.12, wrist[2] + 0.05]
        return (
          <group key={i}>
            <Bar a={wrist} b={tip} r={0.012} material={bone} />
            <mesh position={tip} rotation={[Math.PI / 2 + 0.4, 0, 0]} material={boneDark}><coneGeometry args={[0.014, 0.06, 6]} /></mesh>
          </group>
        )
      })}
    </group>
  )
}

/** A small Velociraptor skeleton cast, posed mid-stride, with its signature raised sickle claws. */
export function Raptor({ position, yaw = 0 }) {
  const [x, z] = position
  const m = mm()
  const DAIS = 0.5
  return (
    <group>
      <group position={[x, FY, z]} rotation={[0, yaw, 0]}>
        <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.8, DAIS / 2, 3.6]} position={[0, DAIS / 2, 0]} /></RigidBody>
        <mesh position={[0, DAIS / 2, 0]} material={m.stoneSmooth} castShadow receiveShadow><boxGeometry args={[1.6, DAIS, 7.2]} /></mesh>
        <mesh position={[0, DAIS + 0.02, 0]} material={m.brass}><boxGeometry args={[1.66, 0.04, 7.26]} /></mesh>
        <group position={[0, DAIS + 0.02, 0]}>
          <RaptorBody />
          <RaptorRibs />
          {[-1, 1].map((s) => <group key={s}><RaptorLeg s={s} /><RaptorArm s={s} /></group>)}
          <group position={[0, 0.95, 2.75]} rotation={[0.1, 0, 0]}><RaptorSkull /></group>
        </group>
      </group>
      <Placard id="raptor" position={[x + 0.8, 0, z + 1.6]} yaw={0} y={FY} />
    </group>
  )
}

// ------------------------------------------------------------------ minerals
function Crystal({ position, r = 0.03, len = 0.2, rot = [0, 0, 0], mat, tip = 0.35 }) {
  return (
    <group position={position} rotation={rot}>
      <mesh position={[0, len / 2, 0]} material={mat}><cylinderGeometry args={[r, r * 1.05, len, 6]} /></mesh>
      <mesh position={[0, len + len * tip * 0.5, 0]} material={mat}><coneGeometry args={[r, len * tip, 6]} /></mesh>
    </group>
  )
}

function Geode() {
  const amethyst = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#8d4fd6', roughness: 0.15, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.1, emissive: '#3d1a68', emissiveIntensity: 0.55 }), [])
  const rock = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6b6258', roughness: 1 }), [])
  const crystals = useMemo(() => Array.from({ length: 34 }, (_, i) => {
    const a = hash(i * 3.3) * 6.28, rr = Math.sqrt(hash(i * 7.1)) * 0.2
    const tilt = rr * 2.4 + hash(i) * 0.3
    return { p: [Math.cos(a) * rr, 0.02 + (1 - rr * 3) * 0.04, Math.sin(a) * rr], rot: [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt], len: 0.07 + hash(i * 5) * 0.1, r: 0.016 + hash(i * 9) * 0.012 }
  }), [])
  return (
    <group>
      <mesh position={[0, 0.09, 0]} scale={[1.2, 0.8, 1.0]} material={rock} castShadow><sphereGeometry args={[0.3, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      <group position={[0, 0.2, 0]}>
        <mesh position={[0, -0.02, 0]} rotation={[Math.PI, 0, 0]} scale={[1, 0.5, 0.85]}><sphereGeometry args={[0.24, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#4a2a78" roughness={0.6} side={THREE.DoubleSide} /></mesh>
        {crystals.map((c, i) => <Crystal key={i} position={c.p} rot={c.rot} len={c.len} r={c.r} mat={amethyst} />)}
      </group>
    </group>
  )
}

function Turquoise() {
  const geo = useMemo(() => { const g = new THREE.IcosahedronGeometry(1, 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + (Math.sin(p.getX(i) * 6.1) * Math.cos(p.getZ(i) * 5.3) + Math.sin(p.getY(i) * 7.7)) * 0.1; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k) } g.computeVertexNormals(); return g }, [])
  const tq = useMemo(() => new THREE.MeshStandardMaterial({ color: '#35bfc2', roughness: 0.35, metalness: 0.05 }), [])
  const matrix = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.8 }), [])
  const nodules = [[0, 0.1, 0, 0.14, 0.8], [0.22, 0.07, 0.1, 0.1, 1.2], [-0.2, 0.06, 0.12, 0.09, 0.3], [0.05, 0.05, -0.2, 0.11, 2.1], [-0.12, 0.05, -0.12, 0.08, 1.6]]
  return (
    <group>
      {nodules.map(([x, y, z, r, rot], i) => (
        <group key={i} position={[x, y, z]} rotation={[0, rot, 0]}>
          <mesh geometry={geo} scale={[r, r * 0.8, r]} material={tq} castShadow />
          <mesh geometry={geo} position={[r * 0.4, -r * 0.1, r * 0.2]} scale={[r * 0.5, r * 0.3, r * 0.5]} material={matrix} />
        </group>
      ))}
    </group>
  )
}

function Quartz() {
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#f3f6f8', roughness: 0.05, transparent: true, opacity: 0.72, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }), [])
  const pts = [[0, 0, 0.3, 0.05, 0.3], [0.1, 0.02, -0.25, 0.045, 0.22], [-0.1, 0.0, -0.2, 0.04, 0.2], [0.05, 0.1, 0.4, 0.04, 0.18], [-0.04, 0.02, -0.35, 0.05, 0.14], [0.16, -0.03, 0.28, 0.035, 0.12], [-0.15, 0.03, 0.2, 0.035, 0.16]]
  return (
    <group>
      <mesh position={[0, 0.05, 0]} scale={[1.2, 0.5, 1]}><sphereGeometry args={[0.2, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#d8d2c4" roughness={1} /></mesh>
      {pts.map(([x, z, tilt, r, len], i) => <Crystal key={i} position={[x * 1.4, 0.12, z * 1.2]} rot={[tilt * 0.8, i, -tilt * 0.6]} len={len + 0.08} r={r * 0.8} mat={mat} tip={0.4} />)}
    </group>
  )
}

function Pyrite() {
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d6b34a', roughness: 0.18, metalness: 1 }), [])
  const cubes = [[0, 0.07, 0, 0.14, 0.2], [0.13, 0.05, 0.08, 0.1, 0.7], [-0.12, 0.05, 0.05, 0.1, 1.2], [0.04, 0.05, -0.15, 0.11, 0.4], [0.05, 0.17, 0.02, 0.09, 0.9], [-0.15, 0.04, -0.12, 0.08, 0.3]]
  return <group>{cubes.map(([x, y, z, s, r], i) => <mesh key={i} position={[x, y, z]} rotation={[0.1 * i, r, 0.08 * i]} material={gold} castShadow><boxGeometry args={[s, s, s]} /></mesh>)}</group>
}

function Label({ text, position }) {
  const tex = useMemo(() => canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#17202e'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8d9a8'; g.font = '700 28px Georgia, serif'; g.textAlign = 'center'; g.fillText(text, w / 2, 42) }), [text])
  return <mesh position={position} rotation={[-0.5, 0, 0]}><planeGeometry args={[0.36, 0.09]} /><meshBasicMaterial map={tex} /></mesh>
}

export function GemCase({ position }) {
  const [x, z] = position
  const items = [['AMETHYST', <Geode key="a" />], ['TURQUOISE', <Turquoise key="t" />], ['QUARTZ', <Quartz key="q" />], ['PYRITE', <Pyrite key="p" />]]
  const m = mm()
  return (
    <group>
      <GlassCase position={[x, 0, z]} size={[3.2, 0.95, 1.1]} base={0.85} y={FY}>
        {items.map(([name, node], i) => {
          const px = -1.2 + i * 0.8
          return (
            <group key={name} position={[px, 0, 0]}>
              <mesh position={[0, 0.06, 0]} material={m.walnutSolid}><cylinderGeometry args={[0.36, 0.4, 0.12, 24]} /></mesh>
              <group position={[0, 0.12, 0]}>{node}</group>
              <Label text={name} position={[0, 0.05, 0.43]} />
            </group>
          )
        })}
      </GlassCase>
      <Placard id="gems" position={[x, 0, z + 1.5]} yaw={0} y={FY} />
    </group>
  )
}
