import { useMemo } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { surface, blackMarble } from './materials.js'
import { Wall, Block } from './jobkit.jsx'
import { Sofa, Table, Rug, Counter, CeilingLight, PendantLight } from './furniture.jsx'
import { Palms, PottedPlant } from './Vegetation.jsx'
import { LightAnchor } from './props.jsx'
import { BrandSign } from './signs.jsx'
import { nightLit } from '../state/environment.js'
import { VY, ROYAL } from '../config/island.js'

// Royal Films 999: a dark-glass film-studio headquarters on its own islet in the Isla Serena lagoon.
// A black-marble lobby with violet light lines, a reception counter with the CEO's nameplate, an
// amethyst crystal, framed posters, a crown wall sign and a lounge. Original brand look (purple,
// black and silver). Everything uses absolute world coordinates.

let M
function mats() {
  if (M) return M
  M = {
    sand: new THREE.MeshStandardMaterial({ color: '#f1eadb', roughness: 1 }),
    paver: surface('limestone', 4, 4, { color: '#2a2630' }),
    wallExt: surface('plaster', 4, 2, { color: '#17131f' }),
    wallInt: surface('plaster', 4, 2, { color: '#cfc6e0' }),
    roof: new THREE.MeshStandardMaterial({ color: '#0e0b14', roughness: 0.6, metalness: 0.3 }),
    led: new THREE.MeshStandardMaterial({ color: '#d7b8ff', emissive: '#8a3ffc', emissiveIntensity: 2.4, toneMapped: false }),
    ledSoft: nightLit(new THREE.MeshStandardMaterial({ color: '#c9a8ff', emissive: '#7a35e0', emissiveIntensity: 1.6, toneMapped: false }), 1.6, 0.9),
    black: new THREE.MeshStandardMaterial({ color: '#09080c', roughness: 0.25, metalness: 0.5 }),
    counterTop: new THREE.MeshPhysicalMaterial({ color: '#0b0a10', roughness: 0.12, metalness: 0.3, clearcoat: 1 }),
    amethyst: new THREE.MeshPhysicalMaterial({ color: '#8d4fe8', emissive: '#4a1fa3', emissiveIntensity: 0.6, roughness: 0.08, metalness: 0, transmission: 0.2, thickness: 0.4, clearcoat: 1 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#cfd2d8', metalness: 1, roughness: 0.15 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#9aa2c8', roughness: 0.04, transparent: true, opacity: 0.18, depthWrite: false }),
    frame: new THREE.MeshStandardMaterial({ color: '#c9ccd4', metalness: 0.9, roughness: 0.25 }),
    screen: nightLit(new THREE.MeshStandardMaterial({ color: '#150b2b', emissive: '#7a3cff', emissiveIntensity: 0.7 }), 1.2, 0.6),
  }
  return M
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  return t
}
const crownPath = (g, cx, cy, s) => {
  g.beginPath()
  g.moveTo(cx - s, cy + s * 0.55)
  g.lineTo(cx - s, cy - s * 0.2); g.lineTo(cx - s * 0.5, cy + s * 0.15); g.lineTo(cx, cy - s * 0.55)
  g.lineTo(cx + s * 0.5, cy + s * 0.15); g.lineTo(cx + s, cy - s * 0.2); g.lineTo(cx + s, cy + s * 0.55)
  g.closePath()
}

function Crown({ position, width = 3.2 }) {
  const tex = useMemo(() => canvasTex(512, 320, (g, w, h) => {
    g.clearRect(0, 0, w, h)
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#f3e8ff'); gr.addColorStop(1, '#a77bf0')
    g.fillStyle = gr; crownPath(g, w / 2, h * 0.52, w * 0.36); g.fill()
    g.fillStyle = '#d9c2ff'; [[-1, -0.2], [0, -0.55], [1, -0.2]].forEach(([k, y]) => { g.beginPath(); g.arc(w / 2 + k * w * 0.36, h * 0.52 + y * w * 0.36 - 6, 14, 0, 7); g.fill() })
    g.fillStyle = '#7a35e0'; for (let i = -2; i <= 2; i++) { g.beginPath(); g.arc(w / 2 + i * w * 0.15, h * 0.52 + w * 0.36 * 0.36, 9, 0, 7); g.fill() }
  }), [])
  const mat = useMemo(() => nightLit(new THREE.MeshStandardMaterial({ map: tex, emissive: '#a77bf0', emissiveMap: tex, transparent: true, depthWrite: false, roughness: 0.4 }), 1.4, 0.3), [tex])
  return <mesh position={position} material={mat}><planeGeometry args={[width, width * 0.625]} /></mesh>
}

function Poster({ position, yaw = 0, seed = 1, title }) {
  const tex = useMemo(() => canvasTex(300, 440, (g, w, h) => {
    const pals = [['#0a0620', '#6a2bd8', '#e9b6ff'], ['#050a18', '#2b6ad8', '#9fe0ff'], ['#16060e', '#c2307a', '#ffb3d1'], ['#0c0a05', '#b8892f', '#ffe9a8']]
    const p = pals[seed % pals.length]
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, p[0]); gr.addColorStop(1, p[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h)
    g.fillStyle = p[2]; g.globalAlpha = 0.35; g.beginPath(); g.arc(w * 0.5, h * 0.42, 70 + seed * 6, 0, 7); g.fill(); g.globalAlpha = 1
    g.fillStyle = '#000'; g.globalAlpha = 0.55; g.beginPath(); g.moveTo(w * 0.2, h * 0.75); g.bezierCurveTo(w * 0.3, h * 0.45, w * 0.7, h * 0.45, w * 0.8, h * 0.75); g.lineTo(w * 0.8, h); g.lineTo(w * 0.2, h); g.fill(); g.globalAlpha = 1
    g.fillStyle = '#fff'; g.font = 'bold 34px Georgia, serif'; g.textAlign = 'center'; g.fillText(title, w / 2, 70)
    g.font = '13px sans-serif'; g.fillStyle = p[2]; g.fillText('ROYAL FILMS 999', w / 2, h - 18)
  }), [seed, title])
  const m = mats()
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh material={m.frame} position={[0, 0, -0.02]}><boxGeometry args={[1.5, 2.1, 0.05]} /></mesh>
      <mesh><planeGeometry args={[1.38, 1.98]} /><meshStandardMaterial map={tex} roughness={0.5} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.25} /></mesh>
      <mesh position={[0, -1.25, 0.05]} material={m.led}><boxGeometry args={[1.5, 0.025, 0.02]} /></mesh>
    </group>
  )
}

function Nameplate({ position }) {
  const tex = useMemo(() => canvasTex(640, 220, (g, w, h) => {
    g.fillStyle = '#10091d'; g.fillRect(0, 0, w, h)
    g.strokeStyle = '#a77bf0'; g.lineWidth = 4; g.strokeRect(8, 8, w - 16, h - 16)
    g.textAlign = 'center'; g.fillStyle = '#d7b8ff'; g.font = '48px Georgia, serif'; g.fillText('SERAPHINA REIGN', w / 2, 100)
    g.fillStyle = '#ffffff'; g.font = '24px sans-serif'; g.fillText('CHIEF EXECUTIVE OFFICER', w / 2, 142)
    g.fillStyle = '#a99ac4'; g.font = '20px sans-serif'; g.fillText('ROYAL FILMS 999', w / 2, 178)
  }), [])
  const m = mats()
  return (
    <group position={position} rotation={[-0.32, 0, 0]}>
      <mesh material={m.glass}><boxGeometry args={[0.72, 0.26, 0.03]} /></mesh>
      <mesh position={[0, 0, 0.018]}><planeGeometry args={[0.68, 0.234]} /><meshStandardMaterial map={tex} roughness={0.3} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.35} /></mesh>
    </group>
  )
}

function Crystal({ position }) {
  const m = mats()
  return (
    <group position={position}>
      <mesh material={m.black} position={[0, 0.04, 0]}><cylinderGeometry args={[0.28, 0.32, 0.08, 20]} /></mesh>
      {[[0, 0, 0, 0.3, 0.16, 0], [0.16, 0.0, 0.05, 0.2, 0.3, 0.35], [-0.15, 0, 0.04, 0.22, -0.3, 0.2], [0.04, 0, -0.14, 0.17, 0.2, -0.4], [-0.06, 0, 0.14, 0.15, -0.15, 0.5]].map(([x, y, z, h, rz, rx], i) => (
        <mesh key={i} position={[x, 0.08 + h / 2, z]} rotation={[rx, 0, rz]} material={m.amethyst} castShadow><coneGeometry args={[0.06 + h * 0.12, h * 2.2, 6]} /></mesh>
      ))}
    </group>
  )
}

export default function RoyalFilms() {
  const m = mats()
  const P = ROYAL.platform, B = ROYAL.building
  const cx = (B.x0 + B.x1) / 2
  const rect = { x0: B.x0, x1: B.x1, z0: B.z0, z1: B.z1 }
  const floorTex = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b9b0cc', roughness: 0.18, metalness: 0.15 }), [])
  const palms = useMemo(() => [[P.x0 + 3, VY, P.z1 - 4, 0.62, 0.4], [P.x1 - 3, VY, P.z1 - 4, 0.58, 1.5], [P.x0 + 3, VY, P.z0 + 4, 0.55, 2.2], [P.x1 - 3, VY, P.z0 + 4, 0.6, 0.9]], [])
  const W = B.x1 - B.x0, D = B.z1 - B.z0
  return (
    <group>
      {/* islet */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[(P.x1 - P.x0) / 2, 0.1, (P.z1 - P.z0) / 2]} position={[(P.x0 + P.x1) / 2, 0.1, (P.z0 + P.z1) / 2]} />
        <CuboidCollider args={[(P.x1 - P.x0) / 2 - 2.4, 0.225, (P.z1 - P.z0) / 2 - 2.4]} position={[(P.x0 + P.x1) / 2, VY - 0.225, (P.z0 + P.z1) / 2]} />
      </RigidBody>
      <mesh position={[(P.x0 + P.x1) / 2, -0.12, (P.z0 + P.z1) / 2]} scale={[(P.x1 - P.x0) / 2 + 3, 0.5, (P.z1 - P.z0) / 2 + 3]} material={m.sand} receiveShadow><sphereGeometry args={[1, 40, 16]} /></mesh>
      <mesh position={[(P.x0 + P.x1) / 2, VY - 0.255, (P.z0 + P.z1) / 2]} material={m.sand} receiveShadow><boxGeometry args={[P.x1 - P.x0 - 4.8, 0.45, P.z1 - P.z0 - 4.8]} /></mesh>
      <mesh position={[(P.x0 + P.x1) / 2, VY - 0.015, (P.z0 + P.z1) / 2]} material={m.paver} receiveShadow><boxGeometry args={[P.x1 - P.x0 - 4.8, 0.03, P.z1 - P.z0 - 4.8]} /></mesh>

      {/* shell: dark walls, a wide glass-and-door front, a slab roof edged in violet light */}
      <Wall side="s" rect={rect} h={B.h} t={0.4} ext={m.wallExt} int={m.wallInt} y={VY} />
      <Wall side="w" rect={rect} h={B.h} t={0.4} ext={m.wallExt} int={m.wallInt} y={VY} />
      <Wall side="e" rect={rect} h={B.h} t={0.4} ext={m.wallExt} int={m.wallInt} y={VY} />
      <Wall side="n" rect={rect} h={B.h} t={0.4} ext={m.wallExt} int={m.wallInt} y={VY}
        openings={[{ at: B.x0 + 4.5, half: 3.4, glass: true, h: 3.6, sill: 0.1 }, { at: cx, half: 1.6, h: 3.5 }, { at: B.x1 - 4.5, half: 3.4, glass: true, h: 3.6, sill: 0.1 }]} />
      <Block position={[cx, VY + B.h + 0.2, (B.z0 + B.z1) / 2]} size={[W + 1.4, 0.4, D + 1.4]} material={m.roof} collide={false} />
      <mesh position={[cx, VY + B.h + 0.42, B.z1 + 0.65]} material={m.led}><boxGeometry args={[W + 1.4, 0.05, 0.05]} /></mesh>
      <mesh position={[B.x0 - 0.65, VY + B.h + 0.42, (B.z0 + B.z1) / 2]} material={m.led}><boxGeometry args={[0.05, 0.05, D + 1.4]} /></mesh>
      <mesh position={[B.x1 + 0.65, VY + B.h + 0.42, (B.z0 + B.z1) / 2]} material={m.led}><boxGeometry args={[0.05, 0.05, D + 1.4]} /></mesh>
      <mesh position={[cx, VY + 0.06, B.z1 + 0.22]} material={m.led}><boxGeometry args={[W, 0.05, 0.05]} /></mesh>
      {/* facade sign */}
      <Crown position={[cx, VY + B.h - 1.0, B.z1 + 0.22]} width={2.6} />
      <BrandSign text="ROYAL FILMS 999" sub="DREAM. CREATE. LEGEND." position={[cx, VY + B.h - 2.3, B.z1 + 0.22]} width={11} color="#e9d9ff" glow="#b78cff" size={120} />

      {/* lobby */}
      <mesh position={[cx, VY + 0.025, (B.z0 + B.z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={floorTex} receiveShadow><planeGeometry args={[W - 0.5, D - 0.5]} /></mesh>
      <mesh position={[cx, VY + 3.0, B.z0 + 0.43]} material={m.black}><boxGeometry args={[11.4, 2.6, 0.04]} /></mesh>
      <BrandSign text="ROYAL" sub="FILMS 999" position={[cx, VY + 3.1, B.z0 + 0.46]} width={10} color="#f1e6ff" glow="#b78cff" size={170} />
      <Crown position={[cx, VY + 4.35, B.z0 + 0.46]} width={2.8} />
      <mesh position={[cx, VY + 0.1, B.z0 + 0.44]} material={m.led}><boxGeometry args={[W - 1, 0.04, 0.03]} /></mesh>
      <mesh position={[cx, VY + B.h - 0.25, B.z0 + 0.44]} material={m.led}><boxGeometry args={[W - 1, 0.04, 0.03]} /></mesh>
      {/* reception */}
      <Counter position={[cx, VY, B.z0 + 6]} length={10} height={1.1} depth={1.1} top="marble" face="#0a0810" />
      <mesh position={[cx, VY + 1.12, B.z0 + 6.55]} material={m.counterTop}><boxGeometry args={[10.1, 0.06, 0.3]} /></mesh>
      <mesh position={[cx, VY + 0.38, B.z0 + 6.56]} material={m.led}><boxGeometry args={[9.8, 0.04, 0.02]} /></mesh>
      <Nameplate position={[cx - 3.2, VY + 1.28, B.z0 + 6.3]} />
      <Crystal position={[cx - 4.2, VY + 1.13, B.z0 + 5.7]} />
      <group position={[cx + 3.6, VY + 1.13, B.z0 + 6.1]}>
        <mesh material={m.black}><cylinderGeometry args={[0.1, 0.09, 0.2, 16]} /></mesh>
        {[-0.03, 0, 0.03].map((dx, i) => <mesh key={i} position={[dx, 0.22, 0]} rotation={[0, 0, dx * 4]} material={m.amethyst}><cylinderGeometry args={[0.008, 0.008, 0.2, 6]} /></mesh>)}
      </group>
      {/* screens and posters */}
      {[-6.5, 6.5].map((dx, i) => (
        <group key={i} position={[cx + dx, VY + 1.9, B.z0 + 0.46]}>
          <mesh material={m.frame}><boxGeometry args={[3.4, 2.0, 0.08]} /></mesh>
          <mesh position={[0, 0, 0.045]} material={m.screen}><planeGeometry args={[3.26, 1.86]} /></mesh>
        </group>
      ))}
      <Poster position={[B.x0 + 0.46, VY + 1.9, B.z0 + 5]} yaw={Math.PI / 2} seed={0} title="CROWNED" />
      <Poster position={[B.x0 + 0.46, VY + 1.9, B.z0 + 8.2]} yaw={Math.PI / 2} seed={1} title="AFTERGLOW" />
      <Poster position={[B.x0 + 0.46, VY + 1.9, B.z0 + 11.4]} yaw={Math.PI / 2} seed={2} title="STAY" />
      <Poster position={[B.x1 - 0.46, VY + 1.9, B.z0 + 5]} yaw={-Math.PI / 2} seed={3} title="LEGEND" />
      <Poster position={[B.x1 - 0.46, VY + 1.9, B.z0 + 8.2]} yaw={-Math.PI / 2} seed={0} title="DREAM" />
      <Poster position={[B.x1 - 0.46, VY + 1.9, B.z0 + 11.4]} yaw={-Math.PI / 2} seed={1} title="SERAPH" />
      {/* lounge */}
      <Rug position={[cx, VY + 0.05, B.z1 - 4]} size={[8, 4]} color="#2a1450" />
      <Sofa position={[cx - 3, VY, B.z1 - 6.2]} yaw={0} length={3} color="#3a1d63" />
      <Sofa position={[cx + 3, VY, B.z1 - 6.2]} yaw={0} length={3} color="#3a1d63" />
      <Table position={[cx, VY, B.z1 - 4.4]} size={[1.8, 0.9]} height={0.4} top="marble" />
      <PottedPlant position={[B.x0 + 1.2, VY, B.z1 - 1.2]} kind="fiddle" scale={1.4} />
      <PottedPlant position={[B.x1 - 1.2, VY, B.z1 - 1.2]} kind="areca" scale={1.5} />
      {[-5, 0, 5].map((dx, i) => <PendantLight key={i} position={[cx + dx, VY + B.h - 0.05, B.z0 + 9]} drop={1.4} color="#c9a8ff" zone="royal" />)}
      <CeilingLight position={[cx, VY + B.h - 0.05, B.z1 - 4]} size={[2, 2]} intensity={16} distance={12} color="#d9c2ff" zone="royal" />
      {[B.z0 + 3, B.z0 + 12].flatMap((z) => [-6, 6].map((dx) => <CeilingLight key={z + ':' + dx} position={[cx + dx, VY + B.h - 0.05, z]} size={[2, 2]} intensity={14} distance={11} color="#efe4ff" zone="royal" />))}
      <LightAnchor position={[cx, VY + 2.4, B.z1 + 2]} color="#a77bf0" intensity={20} distance={14} night />
      <Palms palms={palms} />
    </group>
  )
}
