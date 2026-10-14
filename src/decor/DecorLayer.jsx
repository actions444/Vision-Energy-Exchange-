import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useDecor, designFor, movePlacing } from './decor.js'
import { DECOR_SPACES, spaceById } from './spaces.js'
import { itemById, floorMaterial, wallMaterial, LIGHT_PRESETS } from './catalog.jsx'
import { LightAnchor } from '../world/props.jsx'
import { playerState } from '../state/runtime.js'

// Renders every space's design (saved, or the draft being edited) and the placement preview.
export default function DecorLayer() {
  const st = useDecor()
  return (
    <group userData={{ noBatch: true }}>
      {DECOR_SPACES.map((s) => {
        const d = designFor(s.id, st)
        return d ? <SpaceDesign key={s.id} space={s} design={d} selected={st.open && st.spaceId === s.id ? st.selected : null} hide={st.placing?.uid} /> : null
      })}
      {st.open && st.placing && <Ghost />}
    </group>
  )
}

function SpaceDesign({ space, design, selected, hide }) {
  const y = space.floorY
  return (
    <group>
      {design.floor && space.floors.map(([x0, x1, z0, z1], i) => {
        const m = floorMaterial(design.floor, x1 - x0, z1 - z0)
        return m && <mesh key={'f' + i} position={[(x0 + x1) / 2, y + 0.012, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={m} receiveShadow><planeGeometry args={[x1 - x0, z1 - z0]} /></mesh>
      })}
      {design.wall && space.walls.map((w, i) => <WallFinish key={'w' + i} wall={w} y={y} finish={design.wall} />)}
      {design.light && (() => {
        const p = LIGHT_PRESETS.find((x) => x.id === design.light)
        const [x0, x1, z0, z1] = space.rect
        return p && [0.3, 0.7].map((k) => <LightAnchor key={design.light + k} position={[x0 + (x1 - x0) * k, y + space.ceiling - 0.5, (z0 + z1) / 2]} color={p.color} intensity={p.intensity} distance={12} range={30} />)
      })()}
      {design.items.filter((it) => it.uid !== hide).map((it) => {
        const item = itemById(it.itemId)
        if (!item) return null
        return (
          <group key={it.uid + ':' + it.x + ':' + it.z + ':' + it.yaw}>
            {item.render([it.x, y, it.z], it.yaw)}
            {selected === it.uid && <Outline item={item} x={it.x} y={y} z={it.z} yaw={it.yaw} color="#ffd27a" />}
          </group>
        )
      })}
    </group>
  )
}

/** Paint or wallpaper over one wall, leaving door openings clear. Inset 1.5 cm into the room. */
function WallFinish({ wall, y, finish }) {
  const [ax, az] = wall.a, [bx, bz] = wall.b
  const len = Math.hypot(bx - ax, bz - az)
  const dir = [(bx - ax) / len, (bz - az) / len]
  const rotY = Math.atan2(wall.normal[0], wall.normal[1]) // plane faces +z by default
  const pieces = useMemo(() => {
    const out = []
    let t = 0
    const ops = [...wall.openings].map((o) => ({ ...o, t: Math.abs(dir[0]) > 0.5 ? (o.at - ax) / dir[0] : (o.at - az) / dir[1] })).sort((a, b) => a.t - b.t)
    for (const o of ops) {
      const s0 = o.t - o.width / 2, s1 = o.t + o.width / 2
      if (s0 > t) out.push([t, s0, 0, wall.h])
      if (wall.h > o.height) out.push([s0, s1, o.height, wall.h])
      t = s1
    }
    if (t < len) out.push([t, len, 0, wall.h])
    return out
  }, [wall]) // eslint-disable-line react-hooks/exhaustive-deps
  return pieces.map(([s0, s1, h0, h1], i) => {
    const m = wallMaterial(finish.kind, finish.id, s1 - s0, h1 - h0)
    if (!m) return null
    const mid = (s0 + s1) / 2
    return (
      <mesh key={i} position={[ax + dir[0] * mid + wall.normal[0] * 0.015, y + (h0 + h1) / 2, az + dir[1] * mid + wall.normal[1] * 0.015]} rotation={[0, rotY, 0]} material={m}>
        <planeGeometry args={[s1 - s0, h1 - h0]} />
      </mesh>
    )
  })
}

function Outline({ item, x, y, z, yaw, color }) {
  const [w, h, d] = item.size
  return (
    <mesh position={[x, y + Math.max(h, 0.05) / 2, z]} rotation={[0, yaw, 0]}>
      <boxGeometry args={[w + 0.06, Math.max(h, 0.05) + 0.04, d + 0.06]} />
      <meshBasicMaterial color={color} wireframe transparent opacity={0.9} toneMapped={false} />
    </mesh>
  )
}

/** Placement preview: follows a spot 2 m in front of the avatar until nudged; green = allowed. */
function Ghost() {
  const p = useDecor((s) => s.placing)
  const spaceId = useDecor((s) => s.spaceId)
  const space = spaceById(spaceId)
  const box = useRef()
  const fill = useMemo(() => new THREE.MeshBasicMaterial({ color: '#4fe0a0', transparent: true, opacity: 0.28, depthWrite: false, toneMapped: false }), [])
  useFrame(() => {
    const cur = useDecor.getState().placing
    if (!cur) return
    if (cur.follow) {
      const yaw = playerState.yaw
      const x = playerState.position.x + Math.sin(yaw) * 2.2, z = playerState.position.z + Math.cos(yaw) * 2.2
      if (Math.abs(x - cur.x) > 0.05 || Math.abs(z - cur.z) > 0.05) movePlacing(x, z)
    }
    fill.color.set(cur.valid ? '#4fe0a0' : '#ff5a5a')
  })
  const item = itemById(p.itemId)
  if (!item || !space) return null
  const [w, h, d] = item.size
  const hh = Math.max(h, 0.05)
  return (
    <group position={[p.x, space.floorY, p.z]} rotation={[0, p.yaw, 0]}>
      <mesh ref={box} position={[0, hh / 2, 0]} material={fill}><boxGeometry args={[w, hh, d]} /></mesh>
      <mesh position={[0, hh / 2, 0]}><boxGeometry args={[w, hh, d]} /><meshBasicMaterial color={p.valid ? '#4fe0a0' : '#ff5a5a'} wireframe toneMapped={false} /></mesh>
      {/* front marker: which way the piece faces */}
      <mesh position={[0, 0.02, d / 2 + 0.15]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.1, 3]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
    </group>
  )
}
