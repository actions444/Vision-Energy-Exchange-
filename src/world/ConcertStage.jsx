import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface } from './materials.js'
import { registerLightAnchor } from '../state/environment.js'
import { registerLoad, switchedMaterial, zoneLit } from '../state/power.js'
import { useMusic } from '../music/engine.js'
import { canvasTexture, wrapText } from './canvasText.js'
import { FONTS } from '../config/theme.js'
import { HumanoidCrowd, makeCrowd } from '../npc/HumanoidCrowd.jsx'

// The Grand Concert Stage: a raised stage with a truss and lighting rig, a full-width LED wall
// that shows the track playing in the Records library, and a tiered audience of fans. The crowd
// is visual: a few hundred NPC fans bob and sway to the beat in a handful of instanced draw calls.
// Real visitors can stand on the floor in front of the stage. Multiplayer rooms cap how many
// visitors can share one space (MAX_PER_ROOM on the server), so the crowd here is the NPC kind.

export const STAGE = { cx: 96, cz: 40, facing: Math.PI, w: 26, d: 12, h: 1.4, crowdRows: 9, crowdCols: 34 }
const FANS_PER_ROW = STAGE.crowdCols
const FANS = STAGE.crowdRows * FANS_PER_ROW
const ZONE = 'stage'

const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }

function ledTexture() {
  return canvasTexture(1280, 480, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, '#120a20'); g.addColorStop(1, '#2a0f3a')
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
    const m = useMusic.getState()
    const title = m.track?.title || 'Grand Concert Stage'
    const artist = m.track?.artist || 'Vision Storms Records'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#e0559f'; ctx.font = `600 26px ${FONTS.mono}`
    ctx.fillText((m.status === 'playing' ? 'NOW PLAYING' : 'LIVE ON THE GRAND STAGE').toUpperCase(), w / 2, 90)
    ctx.fillStyle = '#f4f1ea'; ctx.font = `800 84px ${FONTS.display}`
    wrapText(ctx, title, w / 2, 220, w - 160, 88)
    ctx.fillStyle = '#2fd0c4'; ctx.font = `500 34px ${FONTS.mono}`
    ctx.fillText(artist, w / 2, 400)
  })
}

export default function ConcertStage() {
  const m = getMaterials()
  const { cx, cz, facing, w, d, h } = STAGE
  const deckMat = useMemo(() => surface('wood', 6, 3, { color: '#2a2024', roughness: 0.6 }), [])
  const trussMat = m.aluminum
  const ledMat = useMemo(() => new THREE.MeshBasicMaterial({ map: ledTexture(), toneMapped: false }), [])
  const hasTrack = useMusic((s) => s.track?.id)
  useEffect(() => {
    // refresh the LED card when the track changes
    const t = ledTexture()
    ledMat.map?.dispose()
    ledMat.map = t
    ledMat.needsUpdate = true
  }, [hasTrack, ledMat])
  useEffect(() => registerLoad({ zone: ZONE, watts: 9000 }), [])

  // stage lights: coloured anchors across the truss, switched by the stage zone
  useEffect(() => {
    const cols = ['#ff4fb0', '#7a5cff', '#2fd0c4', '#ffd36b']
    const offs = cols.map((c, i) => registerLightAnchor({
      position: new THREE.Vector3(cx - 9 + i * 6, h + 6.2, cz), color: c, intensity: 30, distance: 16, range: 60, zone: ZONE,
    }))
    return () => offs.forEach((o) => o())
  }, [cx, cz, h])

  // the audience: humanoid fans on tiers in front of the stage (local frame, the group faces them)
  const fans = useMemo(() => makeCrowd(FANS, (i) => {
    const row = Math.floor(i / FANS_PER_ROW), col = i % FANS_PER_ROW
    return {
      x: (col - (FANS_PER_ROW - 1) / 2) * 0.74 + (hash(i) - 0.5) * 0.22,
      z: d / 2 + 1.8 + row * 0.95 + (hash(i * 3) - 0.5) * 0.18,
      scale: 1,
      raiseChance: 0.14,
    }
  }), [d])
  // the crowd reads the beat every frame through this getter (a prop would go stale between renders)
  const lampMat = useMemo(() => switchedMaterial(new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#ffd9ff', emissiveIntensity: 1.6 }), ZONE, 1.6, 0.05), [])
  const beatRef = useRef(0)
  useFrame(() => {
    beatRef.current = zoneLit(ZONE) && useMusic.getState().status === 'playing' ? 1 : 0.25
  })
  return (
    <group position={[cx, 0, cz]} rotation={[0, facing, 0]}>
      {/* deck, steps and the front lip */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[w / 2, h / 2, d / 2]} position={[0, h / 2, 0]} />
      </RigidBody>
      <mesh position={[0, h - 0.06, 0]} material={deckMat} receiveShadow castShadow><boxGeometry args={[w, 0.12, d]} /></mesh>
      <mesh position={[0, h / 2, 0]} material={surface('concrete', 4, 1)} castShadow><boxGeometry args={[w - 0.3, h - 0.12, d - 0.3]} /></mesh>
      <mesh position={[0, h / 2, d / 2 + 0.02]} material={m.blackSteel}><boxGeometry args={[w + 0.2, h, 0.06]} /></mesh>
      {/* LED wall at the back, with a steel frame */}
      <mesh position={[0, h + 4.6, -d / 2 + 0.3]} material={m.blackSteel}><boxGeometry args={[w * 0.82 + 0.3, 6.1, 0.3]} /></mesh>
      <mesh position={[0, h + 4.6, -d / 2 + 0.16]} material={ledMat}><planeGeometry args={[w * 0.82, 5.5]} /></mesh>
      {/* truss over the stage */}
      {[-w * 0.42, w * 0.42].map((x) => (
        <mesh key={x} position={[x, h + 3.2, 0]} material={trussMat} castShadow><boxGeometry args={[0.3, 6.4, 0.3]} /></mesh>
      ))}
      <mesh position={[0, h + 6.3, 0]} rotation={[0, 0, Math.PI / 2]} material={trussMat} castShadow><cylinderGeometry args={[0.16, 0.16, w * 0.84, 10]} /></mesh>
      {/* lighting bars and fixtures */}
      {[-9, -3, 3, 9].map((x, i) => (
        <mesh key={i} position={[x, h + 6.0, 0]} material={lampMat}><boxGeometry args={[1.2, 0.2, 0.4]} /></mesh>
      ))}
      {/* front-of-house speakers */}
      {[-w * 0.5 - 0.6, w * 0.5 + 0.6].map((x) => (
        <mesh key={x} position={[x, h + 1.4, d / 2 - 0.4]} material={m.blackSteel} castShadow><boxGeometry args={[1.1, 2.6, 1.0]} /></mesh>
      ))}
      {/* the audience */}
      <HumanoidCrowd fans={fans} beat={() => beatRef.current} />
      {/* floor for the crowd */}
      <mesh position={[0, 0.005, d / 2 + 8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w + 8, 16]} />
        <meshStandardMaterial color="#1b1820" roughness={0.9} />
      </mesh>
    </group>
  )
}
