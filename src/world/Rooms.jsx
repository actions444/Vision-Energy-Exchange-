import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials } from './materials.js'
import { neonSignTexture, canvasTexture } from './canvasText.js'
import { NEON } from '../config/theme.js'
import { getLevels } from '../audio/core.js'
import { useMusicLibrary, demoArt } from '../music/library.js'

// Interiors for the two enterable venues. Both react to whatever the room's music is playing.
const FLOOR = 0.15
const PALETTE = [NEON.pink, NEON.purple, NEON.teal, NEON.yellow]

// ---------------- Storms Records (music store) ----------------
export function RecordsInterior({ x0, x1, z0, z1 }) {
  const mats = getMaterials()
  const cz = (z0 + z1) / 2
  const sign = useMemo(() => neonSignTexture('STORMS RECORDS', NEON.teal, { size: 150 }), [])
  const crateMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1b1626', roughness: 0.5, metalness: 0.4 }), [])
  const islands = [[17, z0 + 7], [23.5, z0 + 7], [17, z1 - 6], [23.5, z1 - 6]]
  const light1 = useRef()

  useFrame(({ clock }) => {
    const lv = getLevels(4)
    if (light1.current) light1.current.intensity = 18 + (lv ? lv[0] * 30 : Math.sin(clock.elapsedTime) * 3)
  })

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {islands.map(([x, z], i) => <CuboidCollider key={i} args={[1.9, 0.5, 0.7]} position={[x, FLOOR + 0.5, z]} />)}
        <CuboidCollider args={[0.55, 0.55, 2.4]} position={[x1 - 3.2, FLOOR + 0.55, cz]} />
      </RigidBody>

      {/* record crates with sleeves */}
      {islands.map(([x, z], i) => (
        <group key={i} position={[x, FLOOR, z]}>
          <mesh position={[0, 0.5, 0]} material={crateMat} castShadow receiveShadow><boxGeometry args={[3.8, 1, 1.4]} /></mesh>
          <mesh position={[0, 1.005, 0]} material={mats.neon(PALETTE[i], 2.5)}><boxGeometry args={[3.82, 0.02, 1.42]} /></mesh>
          <Sleeves seed={i} />
        </group>
      ))}

      {/* counter with spinning turntable */}
      <group position={[x1 - 3.2, FLOOR, cz]}>
        <mesh position={[0, 0.55, 0]} material={mats.marbleWall(1, 1)} castShadow receiveShadow><boxGeometry args={[1.1, 1.1, 4.8]} /></mesh>
        <mesh position={[-0.56, 0.9, 0]} material={mats.neon(NEON.pink, 2.5)}><boxGeometry args={[0.02, 0.04, 4.8]} /></mesh>
        <Turntable position={[0, 1.12, -1.2]} color={NEON.teal} />
        <mesh position={[0, 1.25, 1.4]} material={mats.darkMetal}><boxGeometry args={[0.5, 0.3, 0.4]} /></mesh>
      </group>

      {/* album wall on the back wall */}
      <AlbumWall position={[x1 - 0.42, FLOOR + 3, cz]} rotationY={-Math.PI / 2} width={14} height={3.6} />
      <mesh position={[x1 - 0.41, FLOOR + 5.3, cz]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[9, 2.25]} />
        <meshBasicMaterial map={sign} transparent toneMapped={false} depthWrite={false} />
      </mesh>
      {/* neon shelf lines on the side walls */}
      {[z0 + 0.45, z1 - 0.45].map((z, i) => (
        <group key={z}>
          {[1.2, 2.4, 3.6].map((y) => (
            <mesh key={y} position={[(x0 + x1) / 2 + 1, FLOOR + y, z]} material={mats.neon(i ? NEON.pink : NEON.purple, 2.2)}><boxGeometry args={[(x1 - x0) - 6, 0.05, 0.08]} /></mesh>
          ))}
        </group>
      ))}
      <pointLight ref={light1} position={[(x0 + x1) / 2, FLOOR + 5, cz]} color="#c9b2ff" intensity={18} distance={22} decay={1.3} />
    </group>
  )
}

function Sleeves({ seed }) {
  const ref = useRef()
  const n = 36
  useEffect(() => {
    const d = new THREE.Object3D()
    const c = new THREE.Color()
    for (let i = 0; i < n; i++) {
      const row = i % 2
      d.position.set(-1.7 + Math.floor(i / 2) * 0.19, 1.15, row ? 0.3 : -0.3)
      d.rotation.set(0, 0, -0.25 + Math.sin(i * 7.3 + seed) * 0.08)
      d.updateMatrix()
      ref.current.setMatrixAt(i, d.matrix)
      c.set(PALETTE[(i + seed) % 4]).multiplyScalar(0.35 + ((i * 37 + seed * 11) % 10) / 14)
      ref.current.setColorAt(i, c)
    }
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.instanceColor.needsUpdate = true
  }, [seed])
  return (
    <instancedMesh ref={ref} args={[null, null, n]} castShadow>
      <boxGeometry args={[0.02, 0.36, 0.5]} />
      <meshStandardMaterial roughness={0.4} metalness={0.1} />
    </instancedMesh>
  )
}

function Turntable({ position, color }) {
  const mats = getMaterials()
  const disc = useRef()
  useFrame((_, dt) => { if (disc.current) disc.current.rotation.y += dt * 3.5 })
  return (
    <group position={position}>
      <mesh material={mats.darkMetal}><boxGeometry args={[0.6, 0.06, 0.6]} /></mesh>
      <group ref={disc} position={[0, 0.05, 0]}>
        <mesh material={mats.darkMetal}><cylinderGeometry args={[0.24, 0.24, 0.01, 40]} /></mesh>
        <mesh position={[0, 0.007, 0]} material={mats.neon(color, 2)}><cylinderGeometry args={[0.07, 0.07, 0.01, 24]} /></mesh>
      </group>
      <mesh position={[0.22, 0.08, 0.18]} rotation={[0, 0.5, 0]} material={mats.chrome}><boxGeometry args={[0.02, 0.02, 0.28]} /></mesh>
    </group>
  )
}

// Grid of album covers built from the music library's artwork.
function AlbumWall({ position, rotationY, width, height }) {
  const tracks = useMusicLibrary((s) => s.tracks)
  const tex = useMemo(() => canvasTexture(1400, 360, (ctx, w, h) => { ctx.fillStyle = '#07060c'; ctx.fillRect(0, 0, w, h) }), [])
  useEffect(() => {
    const ctx = tex.image.getContext('2d')
    const covers = tracks.filter((t) => t.source === 'generated').map((t) => demoArt(t))
    const cols = 8, rows = 2, size = 150, gap = (1400 - cols * size) / (cols + 1)
    let live = true
    covers.length && Promise.all(Array.from({ length: cols * rows }, (_, i) => new Promise((res) => {
      const img = new Image()
      img.onload = () => res(img)
      img.onerror = () => res(null)
      img.src = covers[i % covers.length]
    }))).then((imgs) => {
      if (!live) return
      ctx.fillStyle = '#07060c'
      ctx.fillRect(0, 0, 1400, 360)
      imgs.forEach((img, i) => {
        const x = gap + (i % cols) * (size + gap)
        const y = 20 + Math.floor(i / cols) * (size + 20)
        if (img) ctx.drawImage(img, x, y, size, size)
      })
      tex.needsUpdate = true
    })
    return () => { live = false }
  }, [tracks, tex])
  return (
    <mesh position={position} rotation={[0, rotationY, 0]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.6} toneMapped={false} />
    </mesh>
  )
}

// ---------------- Neon Lounge (club) ----------------
export function LoungeInterior({ x0, x1, z0, z1 }) {
  const mats = getMaterials()
  const cz = (z0 + z1) / 2
  const floorCx = (x0 + x1) / 2 - 0.5
  const sign = useMemo(() => neonSignTexture('NEON LOUNGE', NEON.pink, { size: 160 }), [])
  const sofa = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a1240', roughness: 0.8 }), [])
  const l1 = useRef()
  const l2 = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const lv = getLevels(4)
    const beat = lv ? lv[0] : 0.3 + Math.sin(t * 2) * 0.2
    if (l1.current) { l1.current.intensity = 10 + beat * 40; l1.current.color.setHSL((t * 0.05) % 1, 0.9, 0.6) }
    if (l2.current) l2.current.intensity = 8 + (lv ? lv[2] * 30 : 6)
  })

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {/* DJ stage (a step up), booth, bar and sofas */}
        <CuboidCollider args={[1.6, 0.175, 5]} position={[x1 - 2.0, FLOOR + 0.175, cz]} />
        <CuboidCollider args={[0.45, 0.55, 2]} position={[x1 - 2.2, FLOOR + 0.35 + 0.55, cz]} />
        <CuboidCollider args={[6, 0.55, 0.5]} position={[floorCx - 1, FLOOR + 0.55, z1 - 1.4]} />
        <CuboidCollider args={[4, 0.3, 0.6]} position={[floorCx - 1, FLOOR + 0.3, z0 + 1.1]} />
      </RigidBody>

      <DanceFloor position={[floorCx, FLOOR + 0.01, cz]} />

      {/* stage + DJ booth */}
      <mesh position={[x1 - 2.0, FLOOR + 0.175, cz]} material={mats.marbleWall(1, 2)} receiveShadow><boxGeometry args={[3.2, 0.35, 10]} /></mesh>
      <mesh position={[x1 - 3.62, FLOOR + 0.36, cz]} material={mats.neon(NEON.teal, 3)}><boxGeometry args={[0.04, 0.03, 10]} /></mesh>
      <group position={[x1 - 2.2, FLOOR + 0.35, cz]}>
        <mesh position={[0, 0.55, 0]} material={mats.darkMetal} castShadow><boxGeometry args={[0.9, 1.1, 4]} /></mesh>
        <mesh position={[-0.46, 0.55, 0]} material={mats.neon(NEON.pink, 3)}><boxGeometry args={[0.02, 0.6, 3.6]} /></mesh>
        <Turntable position={[0, 1.13, -1]} color={NEON.pink} />
        <Turntable position={[0, 1.13, 1]} color={NEON.yellow} />
        <mesh position={[0, 1.15, 0]} material={mats.darkMetal}><boxGeometry args={[0.5, 0.08, 0.6]} /></mesh>
      </group>
      <mesh position={[x1 - 0.41, FLOOR + 4.4, cz]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[10, 2.5]} />
        <meshBasicMaterial map={sign} transparent toneMapped={false} depthWrite={false} />
      </mesh>
      <Speakers x={x1 - 2.2} z={[cz - 4, cz + 4]} />

      {/* bar */}
      <group position={[floorCx - 1, FLOOR, z1 - 1.4]}>
        <mesh position={[0, 0.55, 0]} material={mats.marbleWall(3, 0.3)} castShadow receiveShadow><boxGeometry args={[12, 1.1, 1]} /></mesh>
        <mesh position={[0, 1.11, -0.5]} material={mats.neon(NEON.yellow, 3)}><boxGeometry args={[12, 0.03, 0.03]} /></mesh>
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={i} position={[-5 + i * 1.65, 0.38, -1.05]} material={mats.chrome}><cylinderGeometry args={[0.2, 0.06, 0.76, 16]} /></mesh>
        ))}
      </group>
      {/* sofas */}
      <group position={[floorCx - 1, FLOOR, z0 + 1.1]}>
        <mesh position={[0, 0.25, 0]} material={sofa}><boxGeometry args={[8, 0.5, 1.2]} /></mesh>
        <mesh position={[0, 0.7, -0.45]} material={sofa}><boxGeometry args={[8, 0.6, 0.3]} /></mesh>
        <mesh position={[0, 0.02, 0.62]} material={mats.neon(NEON.purple, 2.5)}><boxGeometry args={[8, 0.03, 0.03]} /></mesh>
      </group>

      <MirrorBall position={[floorCx, FLOOR + 5.2, cz]} />
      <Beams position={[floorCx, FLOOR + 5.7, cz]} />
      <pointLight ref={l1} position={[floorCx, FLOOR + 4.5, cz]} intensity={20} distance={20} decay={1.3} />
      <pointLight ref={l2} position={[x1 - 4, FLOOR + 3, cz]} color={NEON.teal} intensity={10} distance={12} decay={1.5} />
    </group>
  )
}

// 8x8 tiles that light up with the music's frequency bands.
function DanceFloor({ position }) {
  const N = 8, S = 1.15
  const ref = useRef()
  const colors = useMemo(() => PALETTE.map((c) => new THREE.Color(c)), [])
  const tmp = useMemo(() => new THREE.Color(), [])
  useEffect(() => {
    const d = new THREE.Object3D()
    for (let i = 0; i < N * N; i++) {
      d.position.set((i % N - (N - 1) / 2) * S, 0, (Math.floor(i / N) - (N - 1) / 2) * S)
      d.updateMatrix()
      ref.current.setMatrixAt(i, d.matrix)
      ref.current.setColorAt(i, colors[i % 4])
    }
    ref.current.instanceMatrix.needsUpdate = true
  }, [colors])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const lv = getLevels(8)
    for (let i = 0; i < N * N; i++) {
      const x = i % N, y = Math.floor(i / N)
      const band = lv ? lv[Math.abs(x - 3.5) | 0] : 0
      const wave = lv ? band * 1.6 : 0.35 + 0.35 * Math.sin(t * 2 + x * 0.6 + y * 0.4)
      const on = Math.max(0.06, Math.min(1.3, wave - Math.abs(y - 3.5) * (lv ? 0.08 : 0)))
      tmp.copy(colors[(x + y + Math.floor(t * 1.5)) % 4]).multiplyScalar(on)
      ref.current.setColorAt(i, tmp)
    }
    ref.current.instanceColor.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[null, null, N * N]} position={position} rotation={[0, 0, 0]}>
      <boxGeometry args={[S - 0.06, 0.02, S - 0.06]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
}

function Speakers({ x, z }) {
  const mats = getMaterials()
  const cones = useRef([])
  useFrame(() => {
    const lv = getLevels(4)
    const s = 1 + (lv ? lv[0] * 0.3 : 0)
    cones.current.forEach((c) => c && c.scale.set(s, s, 1))
  })
  return z.map((zz, i) => (
    <RigidBody key={i} type="fixed" colliders={false} position={[x, 0.5, zz]}>
      <CuboidCollider args={[0.5, 1.1, 0.5]} position={[0, 1.1, 0]} />
      <mesh position={[0, 1.1, 0]} material={mats.darkMetal} castShadow><boxGeometry args={[1, 2.2, 1]} /></mesh>
      {[0.6, 1.6].map((y, k) => (
        <mesh key={y} ref={(el) => (cones.current[i * 2 + k] = el)} position={[-0.51, y, 0]} rotation={[0, -Math.PI / 2, 0]} material={mats.chrome}>
          <circleGeometry args={[k ? 0.2 : 0.34, 24]} />
        </mesh>
      ))}
    </RigidBody>
  ))
}

function MirrorBall({ position }) {
  const ref = useRef()
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.6 })
  return (
    <group position={position}>
      <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.01, 0.01, 1, 4]} /><meshBasicMaterial color="#555" /></mesh>
      <mesh ref={ref}>
        <icosahedronGeometry args={[0.45, 2]} />
        <meshStandardMaterial color="#ffffff" metalness={1} roughness={0.05} flatShading envMapIntensity={2.5} />
      </mesh>
    </group>
  )
}

// Sweeping light beams (additive cones).
function Beams({ position }) {
  const group = useRef()
  const mats = useMemo(() => PALETTE.map((c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })), [])
  const geo = useMemo(() => { const g = new THREE.ConeGeometry(0.9, 5.5, 24, 1, true); g.translate(0, -2.75, 0); return g }, [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const lv = getLevels(4)
    group.current?.children.forEach((b, i) => {
      b.rotation.x = Math.sin(t * 0.7 + i * 1.7) * 0.55
      b.rotation.z = Math.cos(t * 0.5 + i * 2.1) * 0.55
      b.material.opacity = 0.06 + (lv ? lv[i % 4] * 0.25 : 0.06)
    })
  })
  return (
    <group ref={group} position={position}>
      {mats.map((m, i) => <mesh key={i} geometry={geo} material={m} position={[(i - 1.5) * 1.6, 0, 0]} />)}
    </group>
  )
}
