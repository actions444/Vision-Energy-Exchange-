import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ZONES } from '../config/rooms.js'
import { playerState } from '../state/runtime.js'
import { useStore } from '../state/store.js'
import { musicEngine } from './engine.js'
import { useMusicAdmin } from './adminState.js'

const volume = (z) => (z.bounds[1][0] - z.bounds[0][0]) * (z.bounds[1][1] - z.bounds[0][1]) * (z.bounds[1][2] - z.bounds[0][2])
const SORTED = [...ZONES].sort((a, b) => volume(a) - volume(b)) // smallest (most specific) first
const DWELL = 0.25 // seconds inside a new zone before switching, so doorways don't flicker

export function zoneAt(p) {
  for (const z of SORTED) {
    const [min, max] = z.bounds
    if (p.x >= min[0] && p.x <= max[0] && p.y >= min[1] && p.y <= max[1] && p.z >= min[2] && p.z <= max[2]) return z.id
  }
  return null
}

// 3D trigger zones: checks the local avatar against every zone volume each frame and tells the
// music engine when it has entered a different one. Remote players never affect this.
export default function MusicZones() {
  const pending = useRef({ id: null, since: 0 })
  const probe = useRef(new THREE.Vector3())
  const show = useMusicAdmin((s) => s.showZones)

  useFrame(({ clock }) => {
    if (useStore.getState().phase !== 'playing') return
    probe.current.copy(playerState.position).y += 1
    const id = zoneAt(probe.current)
    if (id === musicEngine.zoneId) { pending.current.id = null; return }
    const t = clock.elapsedTime
    if (pending.current.id !== id) pending.current = { id, since: t }
    else if (t - pending.current.since >= DWELL || musicEngine.zoneId === null) musicEngine.setZone(id)
  })

  if (!show) return null
  return ZONES.filter((z) => z.id !== 'streets').map((z) => {
    const [min, max] = z.bounds
    const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]]
    const c = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]
    return (
      <mesh key={z.id} position={c}>
        <boxGeometry args={size} />
        <meshBasicMaterial color="#ffe83d" wireframe transparent opacity={0.6} toneMapped={false} />
      </mesh>
    )
  })
}
