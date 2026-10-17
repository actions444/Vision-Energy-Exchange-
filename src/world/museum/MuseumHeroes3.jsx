import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { mm, canvasTex, Placard, Plinth, Bar, Instances, Mover, FY, hash } from './kit.jsx'
import { Flag } from './MuseumHeroes1.jsx'

// Flight & Space: two hanging aircraft models, an Apollo-style command module on a lunar dais and a launch vehicle at
// about 1:12 scale. The aircraft and rocket are original designs inspired by history (no markings or maker badges).

const CEIL_Y = FY + 11

function Spinner({ position, rate = 14, children, axis = 'z' }) {
  const ref = useRef()
  useFrame((_, dt) => { if (ref.current) ref.current.rotation[axis] += Math.min(dt, 0.05) * rate })
  return <group ref={ref} position={position} userData={{ noBatch: true }}>{children}</group>
}

const fabricTex = (() => {
  let t
  return () => (t ||= canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#eadfc4'; g.fillRect(0, 0, w, h)
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(150,125,80,${hash(i) * 0.06})`; g.fillRect(hash(i * 3) * w, hash(i * 5) * h, 3, 2) }
    g.strokeStyle = 'rgba(110,85,50,0.55)'; g.lineWidth = 2
    for (let x = 12; x < w; x += 28) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke() }
    g.strokeStyle = 'rgba(110,85,50,0.7)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h)
  }))
})()

// ------------------------------------------------------------------ biplane
export function Biplane({ position }) {
  const m = mm()
  const fabric = useMemo(() => new THREE.MeshStandardMaterial({ map: fabricTex(), roughness: 0.9, side: THREE.DoubleSide }), [])
  const wood = m.oak
  const [x, y, z] = position
  const S = 3.0
  const struts = useMemo(() => [-2.6, -1.7, -0.85, 0, 0.85, 1.7, 2.6].map((sx) => sx), [])
  return (
    <>
      <Mover position={[x, y, z]} sway={0.025} speed={0.7} rotation={[0, 0.5, 0]}>
        {[0.42, -0.34].map((wy, i) => <mesh key={i} position={[0, wy, 0]} material={fabric} castShadow><boxGeometry args={[S * 2.1, 0.04, 1.05]} /></mesh>)}
        {[0.42, -0.34].map((wy, i) => [-1, 1].map((e) => <mesh key={`${i}${e}`} position={[0, wy, e * 0.53]} material={wood}><boxGeometry args={[S * 2.1, 0.05, 0.03]} /></mesh>))}
        {struts.map((sx, i) => [-0.4, 0.4].map((sz) => <Bar key={`${i}${sz}`} a={[sx, -0.34, sz]} b={[sx, 0.42, sz]} r={0.016} material={wood} seg={6} />))}
        {/* cross-bracing wires */}
        {struts.slice(0, -1).map((sx, i) => <Bar key={'w' + i} a={[sx, -0.34, 0.4]} b={[struts[i + 1], 0.42, 0.4]} r={0.004} material={m.steel} seg={3} />)}
        {/* front elevator and rear rudder */}
        {[0.08, -0.18].map((ey, i) => <mesh key={i} position={[0, ey, 2.1]} material={fabric}><boxGeometry args={[2.3, 0.03, 0.5]} /></mesh>)}
        {[-1, 1].map((sx) => <mesh key={sx} position={[sx * 0.45, 0.15, -2.15]} material={fabric}><boxGeometry args={[0.03, 0.85, 0.52]} /></mesh>)}
        {[-0.35, 0.35].map((sx) => <Bar key={sx} a={[sx, -0.34, 0.1]} b={[sx, 0.1, 2.0]} r={0.012} material={wood} seg={5} />)}
        {[-0.35, 0.35].map((sx) => <Bar key={sx} a={[sx, -0.34, 0.1]} b={[sx * 1.2, 0.15, -2.0]} r={0.012} material={wood} seg={5} />)}
        {/* skids */}
        {[-0.42, 0.42].map((sx) => (
          <group key={sx}>
            <Bar a={[sx, -0.82, 1.9]} b={[sx, -0.82, -1.3]} r={0.025} material={wood} seg={6} />
            <Bar a={[sx, -0.82, 1.9]} b={[sx, -0.62, 2.35]} r={0.02} material={wood} seg={6} />
            {[1.2, 0.2, -0.8].map((sz) => <Bar key={sz} a={[sx, -0.82, sz]} b={[sx, -0.34, sz]} r={0.016} material={wood} seg={5} />)}
          </group>
        ))}
        {/* engine, pilot cradle, chain drive to two pusher propellers */}
        <mesh position={[0.18, -0.22, -0.1]} material={m.black} castShadow><boxGeometry args={[0.55, 0.3, 0.45]} /></mesh>
        <mesh position={[0, -0.3, 0.4]} material={wood}><boxGeometry args={[0.55, 0.04, 0.6]} /></mesh>
        {[-1, 1].map((sx) => (
          <group key={sx}>
            <Bar a={[sx * 0.1, -0.2, -0.1]} b={[sx * 1.0, 0.04, -0.9]} r={0.012} material={m.steel} seg={4} />
            <Spinner position={[sx * 1.0, 0.04, -1.0]} rate={sx * 9}>
              <mesh material={wood}><boxGeometry args={[1.25, 0.12, 0.02]} /></mesh>
              <mesh material={wood} rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[1.25, 0.12, 0.02]} /></mesh>
              <mesh position={[0, 0, 0.0]}><sphereGeometry args={[0.05, 8, 6]} /><meshStandardMaterial color="#c9a24a" metalness={0.9} roughness={0.3} /></mesh>
            </Spinner>
          </group>
        ))}
        {/* hanging wires to the ceiling */}
        {[[-S * 0.8, 0.42, 0.3], [S * 0.8, 0.42, 0.3], [-S * 0.8, 0.42, -0.3], [S * 0.8, 0.42, -0.3]].map(([sx, sy, sz], i) => <Bar key={'h' + i} a={[sx, sy, sz]} b={[sx * 0.5, CEIL_Y - y - 0.4, 0]} r={0.006} material={m.steel} seg={3} />)}
      </Mover>
      <Placard id="biplane" position={[x - 0.8, 0, z + 2.4]} yaw={-Math.PI / 2} y={FY} />
    </>
  )
}

// ------------------------------------------------------------------ monoplane
export function Monoplane({ position }) {
  const m = mm()
  const [x, y, z] = position
  const alu = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d5d8dc', metalness: 0.85, roughness: 0.28 }), [])
  const paint = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e3dcc6', roughness: 0.6, metalness: 0.1 }), [])
  const nose = useMemo(() => { const g = new THREE.LatheGeometry([[0.0, 0], [0.34, 0.01], [0.48, 0.15], [0.52, 0.45], [0.49, 0.85], [0.42, 1.3]].map(([r, h]) => new THREE.Vector2(r, h)), 28); g.rotateX(-Math.PI / 2); return g }, [])
  const body = useMemo(() => { const g = new THREE.LatheGeometry([[0.42, 0], [0.4, 0.4], [0.34, 1.2], [0.24, 2.1], [0.14, 2.9], [0.06, 3.5]].map(([r, h]) => new THREE.Vector2(r, h)), 24); g.rotateX(-Math.PI / 2); return g }, [])
  const wing = useMemo(() => {
    const s = new THREE.Shape()
    ;[[-3.5, 0.4], [-0.8, 0.75], [0.8, 0.75], [3.5, 0.4], [3.5, -0.5], [0.8, -0.75], [-0.8, -0.75], [-3.5, -0.5]].forEach(([wx, wz], i) => (i ? s.lineTo(wx, wz) : s.moveTo(wx, wz)))
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false }); g.rotateX(Math.PI / 2); return g
  }, [])
  const tailPlane = useMemo(() => {
    const s = new THREE.Shape()
    ;[[-1.1, -0.3], [-0.2, 0.3], [0.2, 0.3], [1.1, -0.3], [1.0, -0.5], [-1.0, -0.5]].forEach(([wx, wz], i) => (i ? s.lineTo(wx, wz) : s.moveTo(wx, wz)))
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: false }); g.rotateX(Math.PI / 2); return g
  }, [])
  const fin = useMemo(() => {
    const s = new THREE.Shape()
    ;[[0.0, 0.0], [0.7, 0.0], [0.7, 0.9], [0.3, 1.0], [0.0, 0.7]].forEach(([fz, fy], i) => (i ? s.lineTo(fz, fy) : s.moveTo(fz, fy)))
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: false }); g.translate(-0.35, 0, -0.025); g.rotateY(-Math.PI / 2); return g
  }, [])
  return (
    <>
      <Mover position={[x, y, z]} sway={0.02} speed={0.55} rotation={[0, -0.35, 0]} phase={2}>
        <mesh geometry={nose} position={[0, 0, 1.5]} material={alu} castShadow />
        <mesh geometry={body} position={[0, 0, 0.2]} material={paint} castShadow />
        <mesh position={[0, 0, 1.52]} rotation={[Math.PI / 2, 0, 0]} material={m.black}><torusGeometry args={[0.2, 0.03, 8, 20]} /></mesh>
        {/* wing, struts */}
        <mesh geometry={wing} position={[0, 0.62, 0.25]} material={paint} castShadow />
        {[-1, 1].map((s) => <Bar key={s} a={[s * 0.3, -0.35, 0.4]} b={[s * 1.9, 0.6, 0.35]} r={0.03} material={m.steel} seg={6} />)}
        {/* canopy / fuel tank bump */}
        <mesh position={[0, 0.42, 0.05]} scale={[0.4, 0.22, 0.7]} material={paint}><sphereGeometry args={[1, 14, 10]} /></mesh>
        {/* tail */}
        <mesh geometry={tailPlane} position={[0, 0.04, -2.45]} material={paint} castShadow />
        <mesh geometry={fin} position={[0, 0.1, -2.35]} material={paint} castShadow />
        <Bar a={[0, 0.0, -2.2]} b={[0, -0.28, -2.8]} r={0.012} material={m.steel} seg={4} />
        {/* landing gear */}
        {[-1, 1].map((s) => (
          <group key={s}>
            <Bar a={[s * 0.35, -0.3, 0.35]} b={[s * 0.8, -0.95, 0.5]} r={0.03} material={m.steel} seg={6} />
            <Bar a={[s * 0.35, -0.3, 0.05]} b={[s * 0.8, -0.95, 0.5]} r={0.02} material={m.steel} seg={5} />
            <mesh position={[s * 0.82, -0.95, 0.5]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.36, 0.36, 0.14, 20]} /><meshStandardMaterial color="#1b1b1d" roughness={0.9} /></mesh>
            <mesh position={[s * 0.82, -0.95, 0.5]} rotation={[0, 0, Math.PI / 2]} material={alu}><cylinderGeometry args={[0.2, 0.2, 0.16, 16]} /></mesh>
          </group>
        ))}
        {/* propeller */}
        <Spinner position={[0, 0, 1.52]} rate={16}>
          <mesh material={m.walnutSolid}><boxGeometry args={[0.09, 2.4, 0.03]} /></mesh>
          <mesh material={m.brass} position={[0, 0, 0.0]}><sphereGeometry args={[0.1, 10, 8]} /></mesh>
        </Spinner>
        {[[-2.6, 0.62, 0.3], [2.6, 0.62, 0.3], [-1.1, 0.62, -0.3], [1.1, 0.62, -0.3]].map(([sx, sy, sz], i) => <Bar key={i} a={[sx, sy, sz]} b={[sx * 0.4, CEIL_Y - y - 0.4, 0]} r={0.006} material={m.steel} seg={3} />)}
      </Mover>
      <Placard id="monoplane" position={[x - 0.8, 0, z + 2.8]} yaw={-Math.PI / 2} y={FY} />
    </>
  )
}

// ------------------------------------------------------------------ command module on a lunar dais
function regolithTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#8f8d89'; g.fillRect(0, 0, w, h)
    for (let i = 0; i < 2600; i++) { const v = 110 + hash(i) * 70; g.fillStyle = `rgba(${v},${v - 2},${v - 6},${0.3 + hash(i * 3) * 0.5})`; g.beginPath(); g.arc(hash(i * 7) * w, hash(i * 11) * h, 1 + hash(i * 13) * 4, 0, 7); g.fill() }
    for (let c = 0; c < 6; c++) { const cx = hash(c * 5) * w, cy = hash(c * 9) * h, r = 30 + hash(c * 3) * 55; const gr = g.createRadialGradient(cx, cy, r * 0.2, cx, cy, r); gr.addColorStop(0, 'rgba(60,58,56,0.55)'); gr.addColorStop(0.85, 'rgba(60,58,56,0.15)'); gr.addColorStop(1, 'rgba(200,198,192,0.4)'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill() }
  })
}
export function Capsule({ position }) {
  const [x, z] = position
  const m = mm()
  const moon = useMemo(() => new THREE.MeshStandardMaterial({ map: regolithTex(), roughness: 1 }), [])
  const cone = useMemo(() => new THREE.LatheGeometry([[0.0, 1.62], [0.17, 1.6], [0.2, 1.52], [0.3, 1.34], [0.55, 1.0], [0.8, 0.5], [0.94, 0.14], [0.94, 0.04]].map(([r, h]) => new THREE.Vector2(r, h)), 40), [])
  const shield = useMemo(() => new THREE.LatheGeometry([[0.0, -0.18], [0.35, -0.15], [0.7, -0.04], [0.92, 0.04], [0.94, 0.14]].map(([r, h]) => new THREE.Vector2(r, h)), 40), [])
  const skin = useMemo(() => new THREE.MeshStandardMaterial({ color: '#cfd2d6', metalness: 0.8, roughness: 0.38 }), [])
  const char = useMemo(() => new THREE.MeshStandardMaterial({ color: '#35291f', roughness: 0.9 }), [])
  const win = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1a2230', roughness: 0.05, metalness: 0.4 }), [])
  return (
    <>
      <group position={[x, FY, z]}>
        <RigidBody type="fixed" colliders={false}><CylinderCollider args={[0.25, 1.9]} position={[0, 0.25, 0]} /></RigidBody>
        <mesh position={[0, 0.25, 0]} material={moon} receiveShadow castShadow><cylinderGeometry args={[1.9, 2.0, 0.5, 48]} /></mesh>
        <mesh position={[0, 0.51, 0]} rotation={[-Math.PI / 2, 0, 0]} material={moon}><circleGeometry args={[1.9, 48]} /></mesh>
        <mesh position={[0, 0.505, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.brass}><torusGeometry args={[1.9, 0.03, 6, 60]} /></mesh>
        {/* footprints */}
        {Array.from({ length: 10 }, (_, i) => <mesh key={i} position={[1.2 - i * 0.16, 0.512, 1.2 - i * 0.07 + (i % 2 ? 0.06 : -0.06)]} rotation={[-Math.PI / 2, 0, 0.3]}><planeGeometry args={[0.08, 0.17]} /><meshBasicMaterial color="#5a5855" transparent opacity={0.65} /></mesh>)}
        {/* the capsule, tilted on a cradle, heat shield toward us */}
        <group position={[-0.1, 0.5 + 0.22, -0.1]} rotation={[0.35, 0.4, -0.12]}>
          <group position={[0, 0.55, 0]}>
            <mesh geometry={cone} material={skin} castShadow />
            <mesh geometry={shield} material={char} castShadow />
            {[0, 1, 2, 3, 4].map((i) => { const a = 0.4 + i * 0.5; return <mesh key={i} position={[Math.sin(a) * 0.74, 0.66 + 0.04, Math.cos(a) * 0.74]} rotation={[-0.58, a, 0]} material={win}><boxGeometry args={[0.2, 0.2, 0.03]} /></mesh> })}
            {[0, 1, 2, 3].map((i) => { const a = i * Math.PI / 2 + 0.78; return <mesh key={'r' + i} position={[Math.sin(a) * 0.5, 1.1, Math.cos(a) * 0.5]} rotation={[-0.78, a, 0]} material={m.black}><boxGeometry args={[0.1, 0.1, 0.1]} /></mesh> })}
            <mesh position={[0, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.bronze}><torusGeometry args={[0.42, 0.025, 6, 30]} /></mesh>
            <mesh position={[0, 1.66, 0]} material={m.steel}><cylinderGeometry args={[0.07, 0.15, 0.1, 14]} /></mesh>
          </group>
        </group>
        {[[-0.55, 0.55], [0.55, 0.55], [0, -0.6]].map(([lx, lz], i) => <Bar key={i} a={[lx, 0.52, lz]} b={[-0.1 + lx * 0.4, 0.95, -0.1 + lz * 0.4]} r={0.025} material={m.steel} seg={6} />)}
        {/* a small flag in the dust */}
        <group position={[1.2, 0.5, -0.9]}>
          <mesh position={[0, 0.5, 0]} material={m.chrome}><cylinderGeometry args={[0.012, 0.012, 1.0, 6]} /></mesh>
          <mesh position={[0.28, 0.9, 0]} material={m.chrome}><boxGeometry args={[0.56, 0.01, 0.01]} /></mesh>
          <Flag width={0.5} height={0.26} amp={0.015} speed={0.6} position={[0.0, 0.76, 0]} />
        </group>
      </group>
      <Placard id="capsule" position={[x - 1.0, 0, z + 2.5]} yaw={Math.PI / 2} y={FY} />
    </>
  )
}

// ------------------------------------------------------------------ launch vehicle (1:12 scale)
export function Rocket({ position }) {
  const [x, z] = position
  const m = mm()
  const white = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f1f1ee', roughness: 0.4, metalness: 0.2 }), [])
  const blk = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1b1c1f', roughness: 0.5, metalness: 0.3 }), [])
  const nozzle = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6b665e', roughness: 0.45, metalness: 0.8 }), [])
  const R1 = 0.42, R2 = 0.28
  const stack = [ // [radius, height, material]
    [R1, 3.2, white], [R1, 0.12, blk], [R1, 1.9, white], [R1, 0.08, blk],
  ]
  let y = 0
  const parts = stack.map(([r, h, mt]) => { const p = { r, h, mt, y: y + h / 2 }; y += h; return p })
  const top = y // 5.3
  const noz = [[0, 0], [0.18, 0.18], [-0.18, 0.18], [0.18, -0.18], [-0.18, -0.18]]
  return (
    <>
      <group position={[x, FY, z]}>
        <RigidBody type="fixed" colliders={false}><CylinderCollider args={[0.2, 0.95]} position={[0, 0.2, 0]} /></RigidBody>
        <mesh position={[0, 0.15, 0]} material={m.stoneSmooth} castShadow><cylinderGeometry args={[0.95, 1.0, 0.3, 36]} /></mesh>
        <mesh position={[0, 0.31, 0]} material={m.brass}><cylinderGeometry args={[0.9, 0.9, 0.03, 36]} /></mesh>
        <group position={[0, 0.32, 0]}>
          {parts.map((p, i) => <mesh key={i} position={[0, p.y, 0]} material={p.mt} castShadow><cylinderGeometry args={[p.r, p.r, p.h, 40]} /></mesh>)}
          {/* roll-pattern stripes down the first stage */}
          {[0, 1, 2, 3].map((q) => <mesh key={q} position={[Math.sin(q * Math.PI / 2 + 0.78) * (R1 + 0.003), 1.6, Math.cos(q * Math.PI / 2 + 0.78) * (R1 + 0.003)]} rotation={[0, q * Math.PI / 2 + 0.78, 0]}><planeGeometry args={[0.3, 2.8]} /><meshStandardMaterial color="#1b1c1f" roughness={0.5} /></mesh>)}
          {/* conical interstage, upper stage, instrument ring, adapter cone, service module, command module, escape tower */}
          <mesh position={[0, top + 0.15, 0]} material={white}><cylinderGeometry args={[R2, R1, 0.3, 40]} /></mesh>
          <mesh position={[0, top + 0.95, 0]} material={white} castShadow><cylinderGeometry args={[R2, R2, 1.3, 36]} /></mesh>
          <mesh position={[0, top + 1.65, 0]} material={blk}><cylinderGeometry args={[R2, R2, 0.1, 36]} /></mesh>
          <mesh position={[0, top + 1.975, 0]} material={white}><cylinderGeometry args={[0.16, R2, 0.55, 32]} /></mesh>
          <mesh position={[0, top + 2.5, 0]} material={m.steel}><cylinderGeometry args={[0.16, 0.16, 0.5, 24]} /></mesh>
          <mesh position={[0, top + 2.885, 0]} material={white}><coneGeometry args={[0.16, 0.27, 24]} /></mesh>
          <mesh position={[0, top + 3.32, 0]} material={m.steel}><cylinderGeometry args={[0.01, 0.01, 0.6, 6]} /></mesh>
          {[0, 1, 2, 3].map((i) => <Bar key={i} a={[Math.sin(i * 1.57) * 0.1, top + 3.0, Math.cos(i * 1.57) * 0.1]} b={[Math.sin(i * 1.57) * 0.01, top + 3.55, Math.cos(i * 1.57) * 0.01]} r={0.005} material={m.steel} seg={3} />)}
          <mesh position={[0, top + 3.78, 0]} material={white}><cylinderGeometry args={[0.055, 0.055, 0.3, 14]} /></mesh>
          <mesh position={[0, top + 4.0, 0]} material={blk}><coneGeometry args={[0.055, 0.2, 14]} /></mesh>
          {/* tail fins and the five engine bells */}
          {[0, 1, 2, 3].map((i) => (
            <group key={i} rotation={[0, i * Math.PI / 2 + Math.PI / 4, 0]}>
              <mesh position={[R1 + 0.17, 0.55, 0]} material={blk} castShadow><boxGeometry args={[0.36, 1.0, 0.04]} /></mesh>
              <mesh position={[R1 + 0.17, 0.12, 0]} material={blk}><boxGeometry args={[0.36, 0.1, 0.04]} /></mesh>
            </group>
          ))}
          {noz.map(([nx, nz], i) => <mesh key={i} position={[nx, -0.02, nz]} material={nozzle} castShadow><cylinderGeometry args={[0.13, 0.065, 0.3, 14, 1, true]} /></mesh>)}
        </group>
        {/* display ring brace */}
        <mesh position={[0, 1.5, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.steel}><torusGeometry args={[R1 + 0.06, 0.02, 6, 36]} /></mesh>
        {[0, 1, 2].map((i) => { const a = i * 2.094 + 0.5; return <Bar key={i} a={[Math.sin(a) * (R1 + 0.06), 1.5, Math.cos(a) * (R1 + 0.06)]} b={[Math.sin(a) * 0.9, 0.3, Math.cos(a) * 0.9]} r={0.015} material={m.steel} seg={5} /> })}
      </group>
      <Placard id="rocket" position={[x - 2.0, 0, z + 0.8]} yaw={-Math.PI / 2} y={FY} />
    </>
  )
}
