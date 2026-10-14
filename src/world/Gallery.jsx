import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials } from './materials.js'
import { GALLERY as G } from './layout.js'
import { DoubleDoor } from './Door.jsx'
import { canvasTexture, wrapText, roundRect } from './canvasText.js'
import { BrandSign } from './signs.jsx'
import { LightAnchor } from './props.jsx'
import { CRAFTS, LATEST, CONNECT, ARTIST } from '../config/portfolio.js'
import { NEON, FONTS } from '../config/theme.js'
import { registerInteractable } from '../state/runtime.js'
import { useStore } from '../state/store.js'
import { getLevels, screenVideo } from '../audio/audio.js'

// The Reign Gallery: the first accessible building. Black marble hall with a working
// double door, seven portfolio kiosks, a latest-drop screening wall, a connect wall and an
// audio-reactive equalizer sculpture.

const W = G.maxX - G.minX
const D = G.maxZ - G.minZ
const CX = (G.minX + G.maxX) / 2
const CZ = (G.minZ + G.maxZ) / 2
const Y0 = G.floorY

export default function Gallery() {
  const mats = getMaterials()
  const m = useMemo(() => ({
    wall: mats.marbleWall(4, 1.5),
    wallSide: mats.marbleWall(3, 1.5),
    floor: mats.marbleFloor(5, 4),
    ceiling: new THREE.MeshStandardMaterial({ color: '#f2f0ec', roughness: 0.9 }),
    // architectural LED lines (warm white) and brushed metal trims instead of neon
    teal: new THREE.MeshStandardMaterial({ color: '#b9a37a', roughness: 0.3, metalness: 0.9 }),
    pink: new THREE.MeshStandardMaterial({ color: '#8f8a83', roughness: 0.4, metalness: 0.8 }),
    purple: new THREE.MeshStandardMaterial({ color: '#fff4e2', emissive: '#ffe9c8', emissiveIntensity: 1.6 }),
    yellow: new THREE.MeshStandardMaterial({ color: '#fff4e2', emissive: '#ffe9c8', emissiveIntensity: 1.2 }),
  }), [mats])


  const H = G.height
  const t = G.wall
  const dh = G.doorHalf
  const frontZ = G.maxZ
  const frontSeg = G.maxX - dh // width of each wall segment beside the doorway
  const L = (G.minX + -dh) / 2 // centre x of left front segment

  return (
    <group>
      {/* ---------- shell colliders ---------- */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[W / 2, H / 2, t / 2]} position={[CX, Y0 + H / 2, G.minZ + t / 2]} />
        <CuboidCollider args={[t / 2, H / 2, D / 2]} position={[G.minX + t / 2, Y0 + H / 2, CZ]} />
        <CuboidCollider args={[t / 2, H / 2, D / 2]} position={[G.maxX - t / 2, Y0 + H / 2, CZ]} />
        <CuboidCollider args={[frontSeg / 2, H / 2, t / 2]} position={[L, Y0 + H / 2, frontZ - t / 2]} />
        <CuboidCollider args={[frontSeg / 2, H / 2, t / 2]} position={[-L, Y0 + H / 2, frontZ - t / 2]} />
        <CuboidCollider args={[dh, (H - G.doorHeight) / 2, t / 2]} position={[0, Y0 + G.doorHeight + (H - G.doorHeight) / 2, frontZ - t / 2]} />
        <CuboidCollider args={[W / 2, 0.2, D / 2]} position={[CX, Y0 + H + 0.2, CZ]} />
        {/* interior floor slab (sits flush with the plaza) */}
        <CuboidCollider args={[W / 2, Y0 / 2, D / 2]} position={[CX, Y0 / 2, CZ]} />
      </RigidBody>

      {/* ---------- shell visuals ---------- */}
      <mesh position={[CX, Y0 + H / 2, G.minZ + t / 2]} material={m.wall} receiveShadow castShadow>
        <boxGeometry args={[W, H, t]} />
      </mesh>
      <mesh position={[G.minX + t / 2, Y0 + H / 2, CZ]} material={m.wallSide} receiveShadow castShadow>
        <boxGeometry args={[t, H, D]} />
      </mesh>
      <mesh position={[G.maxX - t / 2, Y0 + H / 2, CZ]} material={m.wallSide} receiveShadow castShadow>
        <boxGeometry args={[t, H, D]} />
      </mesh>
      {[L, -L].map((x, i) => (
        <mesh key={i} position={[x, Y0 + H / 2, frontZ - t / 2]} material={m.wallSide} receiveShadow castShadow>
          <boxGeometry args={[frontSeg, H, t]} />
        </mesh>
      ))}
      <mesh position={[0, Y0 + G.doorHeight + (H - G.doorHeight) / 2, frontZ - t / 2]} material={m.wallSide}>
        <boxGeometry args={[dh * 2, H - G.doorHeight, t]} />
      </mesh>
      <mesh position={[CX, Y0 + H + 0.2, CZ]} material={m.ceiling} castShadow>
        <boxGeometry args={[W + 0.6, 0.4, D + 0.6]} />
      </mesh>
      <mesh position={[CX, Y0 + 0.005, CZ]} rotation={[-Math.PI / 2, 0, 0]} material={m.floor} receiveShadow>
        <planeGeometry args={[W - t * 2, D - t * 2]} />
      </mesh>

      {/* ---------- facade ---------- */}
      <BrandSign text="REIGN GALLERY" sub="TRINITY REIGN · VISION STORMS" position={[0, Y0 + 6.4, frontZ + 0.03]} width={14} color="#232326" glow="#fff3dc" />
      {/* door frame neon */}
      <mesh position={[-dh - 0.08, Y0 + G.doorHeight / 2, frontZ + 0.05]} material={m.teal}><boxGeometry args={[0.1, G.doorHeight, 0.1]} /></mesh>
      <mesh position={[dh + 0.08, Y0 + G.doorHeight / 2, frontZ + 0.05]} material={m.teal}><boxGeometry args={[0.1, G.doorHeight, 0.1]} /></mesh>
      <mesh position={[0, Y0 + G.doorHeight + 0.08, frontZ + 0.05]} material={m.teal}><boxGeometry args={[dh * 2 + 0.26, 0.1, 0.1]} /></mesh>
      {/* building edge outlines */}
      {[[G.minX, frontZ], [G.maxX, frontZ], [G.minX, G.minZ], [G.maxX, G.minZ]].map(([x, z], i) => (
        <mesh key={i} position={[x, Y0 + H / 2, z]} material={m.pink}><boxGeometry args={[0.14, H + 0.4, 0.14]} /></mesh>
      ))}
      <mesh position={[0, Y0 + H + 0.42, frontZ]} material={m.pink}><boxGeometry args={[W, 0.1, 0.1]} /></mesh>
      {/* canopy */}
      <mesh position={[0, Y0 + G.doorHeight + 0.6, frontZ + 1.6]} material={mats.darkMetal} castShadow>
        <boxGeometry args={[7, 0.18, 3.2]} />
      </mesh>
      <mesh position={[0, Y0 + G.doorHeight + 0.5, frontZ + 1.6]} rotation={[Math.PI / 2, 0, 0]} material={m.yellow}>
        <planeGeometry args={[6.4, 2.8]} />
      </mesh>
      <LightAnchor position={[0, Y0 + 4, frontZ + 2.2]} color="#ffe2b8" intensity={14} distance={12} night />

      <DoubleDoor id="gallery-doors" center={[0, Y0, frontZ - t / 2]} halfWidth={dh} height={G.doorHeight} facing={0} accent={NEON.teal} label="gallery doors" />

      {/* ---------- interior ---------- */}
      <BrandSign text="TRINITY REIGN" position={[0, Y0 + 7.8, G.minZ + t + 0.03]} width={11} color="#26262a" glow="#ffffff" />
      {/* linear LED ceiling lights */}
      {[-9, -3, 3, 9].map((x, i) => (
        <mesh key={x} position={[x, Y0 + H - 0.05, CZ]} material={[m.purple, m.pink, m.teal, m.purple][i]}>
          <boxGeometry args={[0.12, 0.06, D - 2]} />
        </mesh>
      ))}
      {/* floor edge light */}
      {[G.minX + t + 0.05, G.maxX - t - 0.05].map((x, i) => (
        <mesh key={x} position={[x, Y0 + 0.04, CZ]} material={m.pink}><boxGeometry args={[0.06, 0.06, D - 1.2]} /></mesh>
      ))}
      <LightAnchor position={[0, Y0 + 7, CZ + 5]} color="#fff2e0" intensity={30} distance={22} />
      <LightAnchor position={[0, Y0 + 7, CZ - 5]} color="#fff2e0" intensity={26} distance={20} />
      <LightAnchor position={[-9, Y0 + 5, CZ]} color="#ffe9cf" intensity={14} distance={14} />
      <LightAnchor position={[9, Y0 + 5, CZ]} color="#ffe9cf" intensity={14} distance={14} />

      {/* kiosks: three per side wall, three on the back wall */}
      {CRAFTS.slice(0, 3).map((c, i) => (
        <Kiosk key={c.id} content={c} position={[G.minX + t, Y0, G.maxZ - 5 - i * 5.5]} yaw={Math.PI / 2} />
      ))}
      {CRAFTS.slice(3, 6).map((c, i) => (
        <Kiosk key={c.id} content={c} position={[G.maxX - t, Y0, G.maxZ - 5 - i * 5.5]} yaw={-Math.PI / 2} />
      ))}
      <Kiosk content={CRAFTS[6]} position={[-9, Y0, G.minZ + t]} yaw={0} />
      <Kiosk content={CONNECT} position={[9, Y0, G.minZ + t]} yaw={0} />
      <LatestStage />
      <Equalizer position={[0, Y0, CZ + 1.5]} />
    </group>
  )
}

// ---------- Kiosk ----------
function kioskPanelTexture(c) {
  return canvasTexture(1024, 768, (ctx, w, h) => {
    ctx.fillStyle = '#0b0912'
    roundRect(ctx, 0, 0, w, h, 36)
    ctx.fill()
    ctx.strokeStyle = c.color
    ctx.lineWidth = 10
    ctx.shadowColor = c.color
    ctx.shadowBlur = 30
    roundRect(ctx, 14, 14, w - 28, h - 28, 30)
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.fillStyle = c.color
    ctx.font = `500 30px ${FONTS.mono}`
    ctx.fillText(c.spec.toUpperCase(), 70, 120)
    ctx.fillStyle = '#f4efff'
    ctx.font = `800 92px ${FONTS.display}`
    let y = wrapText(ctx, c.title, 70, 230, w - 140, 96)
    ctx.fillStyle = '#c9c1dc'
    ctx.font = `500 38px ${FONTS.body}`
    y = wrapText(ctx, c.blurb, 70, y + 20, w - 140, 52)
    if (c.socials) {
      ctx.font = `700 34px ${FONTS.body}`
      c.socials.slice(0, 2).forEach(([k, v], i) => {
        ctx.fillStyle = '#f4efff'
        ctx.fillText(k, 70, y + 20 + i * 48)
        ctx.fillStyle = c.color
        ctx.fillText(v, 380, y + 20 + i * 48)
      })
    }
    ctx.fillStyle = c.color
    ctx.font = `800 34px ${FONTS.body}`
    ctx.fillText(`${(c.action || 'Open').toUpperCase()} →`, 70, h - 70)
  })
}

function Kiosk({ content: c, position, yaw }) {
  const mats = getMaterials()
  const tex = useMemo(() => kioskPanelTexture(c), [c])
  const glow = useMemo(() => mats.neon(c.color, 0.9), [mats, c.color])
  const ring = useRef()
  const fwd = [Math.sin(yaw), 0, Math.cos(yaw)]
  const ped = [position[0] + fwd[0] * 1.6, position[1], position[2] + fwd[2] * 1.6]

  useEffect(() => registerInteractable('kiosk-' + c.id, {
    position: new THREE.Vector3(ped[0], ped[1], ped[2]),
    radius: 2.4,
    label: `${c.action || 'View'}: ${c.title}`,
    onInteract: () => useStore.getState().openPanel({ type: 'content', id: c.id }),
  }), [c, ped[0], ped[2]])

  useFrame(({ clock }) => {
    if (ring.current) ring.current.material.emissiveIntensity = 1.6 + Math.sin(clock.elapsedTime * 2 + position[2]) * 0.8
  })

  return (
    <group>
      <group position={position} rotation={[0, yaw, 0]}>
        <mesh position={[0, 2.7, 0.06]}>
          <planeGeometry args={[3.4, 2.55]} />
          <meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.9} roughness={0.4} toneMapped={false} />
        </mesh>
        <mesh position={[0, 1.35, 0.05]} material={glow}><boxGeometry args={[3.4, 0.04, 0.04]} /></mesh>
      </group>
      <RigidBody type="fixed" colliders={false} position={ped}>
        <CylinderCollider args={[0.55, 0.45]} position={[0, 0.55, 0]} />
        <mesh position={[0, 0.5, 0]} material={mats.marbleWall(1, 1)} castShadow receiveShadow>
          <cylinderGeometry args={[0.42, 0.48, 1, 32]} />
        </mesh>
        <mesh position={[0, 1.01, 0]} rotation={[Math.PI / 2, 0, 0]} material={glow}>
          <torusGeometry args={[0.42, 0.02, 8, 48]} />
        </mesh>
        <mesh ref={ring} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.9, 1.0, 64]} />
          <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={2} toneMapped={false} transparent opacity={0.8} />
        </mesh>
        <group position={[0, 1.05, 0]} rotation={[0, yaw, 0]}>
          <KioskObject id={c.id} color={c.color} />
        </group>
      </RigidBody>
    </group>
  )
}

// Themed 3D object floating above each pedestal.
function KioskObject({ id, color }) {
  const ref = useRef()
  const spin = useRef()
  const mats = getMaterials()
  const glow = useMemo(() => mats.neon(color, 1.1), [mats, color])
  const screenTex = useMemo(() => (id === 'websites' ? miniSiteTexture() : id === 'ebooks' ? miniBookTexture() : null), [id])

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    if (ref.current) {
      ref.current.position.y = 0.45 + Math.sin(t * 1.4 + id.length) * 0.06
      if (id !== 'websites' && id !== 'music') ref.current.rotation.y += dt * 0.5
    }
    if (spin.current) spin.current.rotation.y += dt * (id === 'recordings' ? 3.5 : 2)
    if (id === 'music' && spin.current) {
      const lv = getLevels(4)
      const s = 1 + (lv ? lv[0] * 0.25 : Math.sin(t * 6) * 0.03)
      spin.current.scale.set(s, s, 1)
      spin.current.rotation.y = 0
    }
  })

  let body = null
  switch (id) {
    case 'music': // studio monitor with pulsing woofer
      body = (
        <>
          <mesh material={mats.darkMetal} castShadow><boxGeometry args={[0.42, 0.62, 0.36]} /></mesh>
          <group ref={spin} position={[0, -0.1, 0.185]}>
            <mesh material={mats.chrome}><circleGeometry args={[0.15, 32]} /></mesh>
            <mesh material={glow} position={[0, 0, 0.002]}><ringGeometry args={[0.15, 0.17, 32]} /></mesh>
          </group>
          <mesh material={glow} position={[0, 0.18, 0.185]}><ringGeometry args={[0.05, 0.065, 24]} /></mesh>
        </>
      )
      break
    case 'lyrics': // microphone
      body = (
        <group rotation={[0.3, 0, 0]}>
          <mesh material={mats.chrome} position={[0, 0.16, 0]}><sphereGeometry args={[0.12, 24, 16]} /></mesh>
          <mesh material={glow} position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.12, 0.012, 8, 32]} /></mesh>
          <mesh material={mats.darkMetal} position={[0, -0.12, 0]}><cylinderGeometry args={[0.045, 0.03, 0.38, 16]} /></mesh>
        </group>
      )
      break
    case 'recordings': // vinyl record
      body = (
        <group rotation={[-0.5, 0, 0]}>
          <group ref={spin}>
            <mesh material={mats.darkMetal}><cylinderGeometry args={[0.32, 0.32, 0.015, 48]} /></mesh>
            <mesh material={glow} position={[0, 0.009, 0]}><cylinderGeometry args={[0.1, 0.1, 0.01, 32]} /></mesh>
            <mesh material={glow} position={[0.2, 0.009, 0]}><boxGeometry args={[0.05, 0.005, 0.01]} /></mesh>
          </group>
        </group>
      )
      break
    case 'films': // camera with spinning reels
      body = (
        <>
          <mesh material={mats.darkMetal} castShadow><boxGeometry args={[0.42, 0.24, 0.2]} /></mesh>
          <mesh material={mats.chrome} position={[0, 0, 0.16]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.07, 0.09, 0.14, 24]} /></mesh>
          <group ref={spin}>
            {[-0.1, 0.12].map((x) => (
              <mesh key={x} material={glow} position={[x, 0.24, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.11, 0.02, 8, 24]} /></mesh>
            ))}
          </group>
        </>
      )
      break
    case 'audiobooks': // headphones
      body = (
        <>
          <mesh material={glow} position={[0, 0.05, 0]}><torusGeometry args={[0.2, 0.022, 8, 32, Math.PI]} /></mesh>
          {[-0.2, 0.2].map((x) => (
            <mesh key={x} material={mats.darkMetal} position={[x, -0.02, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.09, 0.09, 0.08, 24]} /></mesh>
          ))}
        </>
      )
      break
    case 'ebooks': // tablet
      body = (
        <group rotation={[-0.3, 0, 0]}>
          <mesh material={mats.darkMetal}><boxGeometry args={[0.36, 0.48, 0.025]} /></mesh>
          <mesh position={[0, 0, 0.014]}>
            <planeGeometry args={[0.32, 0.43]} />
            <meshBasicMaterial map={screenTex} toneMapped={false} />
          </mesh>
        </group>
      )
      break
    case 'websites': // monitor showing a tiny version of the original site
      body = (
        <>
          <mesh material={mats.darkMetal} position={[0, 0.02, 0]}><boxGeometry args={[0.7, 0.44, 0.04]} /></mesh>
          <mesh position={[0, 0.02, 0.022]}>
            <planeGeometry args={[0.66, 0.4]} />
            <meshBasicMaterial map={screenTex} toneMapped={false} />
          </mesh>
          <mesh material={mats.chrome} position={[0, -0.3, -0.02]}><cylinderGeometry args={[0.02, 0.02, 0.24, 12]} /></mesh>
        </>
      )
      break
    default: // connect: orbiting rings
      body = (
        <group ref={spin}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} material={glow} rotation={[i * 1.05, i * 0.6, 0]}><torusGeometry args={[0.2, 0.015, 8, 40]} /></mesh>
          ))}
          <mesh material={mats.chrome}><sphereGeometry args={[0.07, 16, 12]} /></mesh>
        </group>
      )
  }
  return <group ref={ref}>{body}</group>
}

function miniSiteTexture() {
  return canvasTexture(512, 310, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#16112a'
    ctx.font = `800 64px ${FONTS.display}`
    ctx.fillText('Trinity', 24, 92)
    ctx.fillStyle = NEON.pink
    ctx.fillText('Reign', 24, 150)
    const cols = [NEON.pink, NEON.yellow, NEON.teal, '#ff6a1a', NEON.purple]
    cols.forEach((c, i) => { ctx.fillStyle = c; roundRect(ctx, 24 + i * 92, 180, 84, 26, 13); ctx.fill() })
    cols.forEach((c, i) => { ctx.fillStyle = c; roundRect(ctx, 24 + (i % 3) * 158, 222 + Math.floor(i / 3) * 44, 150, 38, 8); ctx.fill() })
  })
}
function miniBookTexture() {
  return canvasTexture(320, 430, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, NEON.purple)
    g.addColorStop(1, NEON.pink)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#16112a'
    ctx.font = `800 44px ${FONTS.display}`
    wrapText(ctx, 'NEW EBOOK TITLE', 24, 80, w - 48, 48)
    ctx.font = `700 22px ${FONTS.body}`
    ctx.fillText(ARTIST.name.toUpperCase(), 24, h - 30)
  })
}

// ---------- Latest drop stage + screen ----------
function LatestStage() {
  const mats = getMaterials()
  const overlay = useMemo(() => canvasTexture(1600, 900, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(8,6,14,0.55)'
    roundRect(ctx, 60, 60, 720, h - 120, 30)
    ctx.fill()
    ctx.fillStyle = NEON.yellow
    ctx.font = `500 34px ${FONTS.mono}`
    ctx.fillText('LATEST DROP', 110, 150)
    ctx.fillStyle = '#ffffff'
    ctx.font = `800 84px ${FONTS.display}`
    let y = wrapText(ctx, LATEST.title, 110, 250, 620, 88)
    ctx.font = `500 30px ${FONTS.body}`
    ctx.fillStyle = '#d8d0ea'
    y = wrapText(ctx, LATEST.blurb, 110, y + 10, 620, 42)
    ctx.font = `500 32px ${FONTS.mono}`
    LATEST.tracks.forEach(([n, title, time], i) => {
      const yy = y + 40 + i * 58
      ctx.fillStyle = '#9a90b5'
      ctx.fillText(n, 110, yy)
      ctx.fillStyle = '#ffffff'
      ctx.font = `700 34px ${FONTS.body}`
      ctx.fillText(title, 190, yy)
      ctx.font = `500 32px ${FONTS.mono}`
      ctx.fillStyle = '#9a90b5'
      ctx.fillText(time, 640, yy)
    })
  }), [])
  const screenMat = useMemo(() => new THREE.ShaderMaterial({
    toneMapped: false,
    uniforms: { uTime: { value: 0 }, uOverlay: { value: overlay }, uVideo: { value: null }, uUseVideo: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform float uTime; uniform sampler2D uOverlay; uniform sampler2D uVideo; uniform float uUseVideo;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3,289.1))) * 43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
      float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=noise(p)*a; p*=2.1; a*=0.5;} return s; }
      void main(){
        if (uUseVideo > 0.5) { gl_FragColor = vec4(texture2D(uVideo, vUv).rgb, 1.0); return; }
        vec2 p = (vUv - 0.5) * vec2(1.78, 1.0) * 3.0;
        float t = uTime * 0.15;
        float r = length(p);
        float a = atan(p.y, p.x);
        float swirl = fbm(vec2(a * 1.5 + t * 2.0 - r * 1.2, r * 2.0 - t * 3.0));
        float storm = fbm(p * 1.2 + swirl * 2.5 + t);
        vec3 c1 = vec3(0.64, 0.24, 1.0);
        vec3 c2 = vec3(1.0, 0.18, 0.6);
        vec3 c3 = vec3(0.0, 0.9, 0.82);
        vec3 col = mix(c1, c2, smoothstep(0.3, 0.7, storm));
        col = mix(col, c3, smoothstep(0.55, 0.85, swirl) * 0.7);
        col *= 0.25 + storm * 0.9;
        float bolt = smoothstep(0.985, 1.0, sin(a * 7.0 + uTime) * fbm(p * 4.0 + uTime)) ;
        col += vec3(1.0, 0.92, 0.4) * bolt * 2.0;
        vec4 o = texture2D(uOverlay, vUv);
        col = mix(col, o.rgb, o.a);
        gl_FragColor = vec4(col, 1.0);
      }`,
  }), [overlay])
  const videoTex = useRef(null)
  const spot = useRef()
  useEffect(() => {
    const l = spot.current
    l.target.position.set(0, Y0, G.minZ + G.wall + 1)
    l.target.updateMatrixWorld()
  }, [])

  useEffect(() => {
    const onVideo = (v) => {
      videoTex.current?.dispose()
      if (v) {
        videoTex.current = new THREE.VideoTexture(v)
        videoTex.current.colorSpace = THREE.SRGBColorSpace
        screenMat.uniforms.uVideo.value = videoTex.current
        screenMat.uniforms.uUseVideo.value = 1
      } else {
        videoTex.current = null
        screenMat.uniforms.uUseVideo.value = 0
      }
    }
    screenVideo.listeners.add(onVideo)
    if (screenVideo.el) onVideo(screenVideo.el)
    return () => screenVideo.listeners.delete(onVideo)
  }, [screenMat])

  useEffect(() => registerInteractable('latest-drop', {
    position: new THREE.Vector3(0, Y0, G.minZ + 4.6),
    radius: 3,
    label: 'View: latest drop',
    onInteract: () => useStore.getState().openPanel({ type: 'content', id: 'latest' }),
  }), [])

  useFrame(({ clock }) => { screenMat.uniforms.uTime.value = clock.elapsedTime })

  const sz = G.minZ + G.wall
  return (
    <group>
      <mesh position={[0, Y0 + 4.1, sz + 0.06]} material={screenMat}>
        <planeGeometry args={[9.6, 5.4]} />
      </mesh>
      <mesh position={[0, Y0 + 4.1, sz + 0.03]} material={mats.blackSteel}>
        <planeGeometry args={[9.9, 5.7]} />
      </mesh>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[4.8, 0.15, 1.5]} position={[0, Y0 + 0.15, sz + 1.5]} />
        <mesh position={[0, Y0 + 0.15, sz + 1.5]} material={mats.marbleWall(3, 1)} receiveShadow castShadow>
          <boxGeometry args={[9.6, 0.3, 3]} />
        </mesh>
        <mesh position={[0, Y0 + 0.31, sz + 3]} material={mats.aluminum}>
          <boxGeometry args={[9.6, 0.03, 0.05]} />
        </mesh>
      </RigidBody>
      <spotLight ref={spot} position={[0, Y0 + 8, sz + 7]} angle={0.5} penumbra={0.6} intensity={40} distance={20} color="#fff0dc" />
    </group>
  )
}

// ---------- Audio-reactive equalizer sculpture ----------
function Equalizer({ position }) {
  const N = 32
  const mats = getMaterials()
  const mesh = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colors = useMemo(() => {
    const palette = [NEON.pink, NEON.yellow, NEON.teal, NEON.purple]
    return Float32Array.from({ length: N * 3 }, (_, i) => new THREE.Color(palette[Math.floor(i / 3) % 4]).toArray()[i % 3])
  }, [])
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), [])
  const smooth = useRef(new Float32Array(N))

  useEffect(() => {
    const m = mesh.current
    for (let i = 0; i < N; i++) m.setColorAt(i, new THREE.Color(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]))
    m.instanceColor.needsUpdate = true
  }, [colors])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const lv = getLevels(N / 2)
    for (let i = 0; i < N; i++) {
      const band = i < N / 2 ? i : N - 1 - i
      const target = lv ? 0.2 + lv[band] * 3.2 : 0.35 + (Math.sin(t * 2.2 + i * 0.7) * 0.5 + 0.5) * (0.6 + 0.4 * Math.sin(t * 0.7 + i))
      smooth.current[i] += (target - smooth.current[i]) * 0.25
      const h = smooth.current[i]
      const a = (i / N) * Math.PI * 2
      dummy.position.set(Math.cos(a) * 2.1, 0.3 + h / 2, Math.sin(a) * 2.1)
      dummy.rotation.set(0, -a, 0)
      dummy.scale.set(1, h, 1)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <CylinderCollider args={[1.8, 2.5]} position={[0, 1.8, 0]} />
      <mesh position={[0, 0.15, 0]} material={mats.marbleWall(2, 0.3)} receiveShadow>
        <cylinderGeometry args={[2.6, 2.7, 0.3, 64]} />
      </mesh>
      <mesh position={[0, 0.31, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.aluminum}>
        <ringGeometry args={[2.55, 2.62, 64]} />
      </mesh>
      <mesh position={[0, 1.2, 0]} material={mats.chrome} castShadow>
        <cylinderGeometry args={[0.5, 0.7, 1.8, 32]} />
      </mesh>
      <mesh position={[0, 2.3, 0]} material={mats.neon(NEON.pink, 2.5)}>
        <sphereGeometry args={[0.38, 32, 16]} />
      </mesh>
      <instancedMesh ref={mesh} args={[null, null, N]} material={material}>
        <boxGeometry args={[0.22, 1, 0.22]} />
      </instancedMesh>
    </RigidBody>
  )
}
