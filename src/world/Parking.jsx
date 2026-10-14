// Plaza parking lot: asphalt with painted stalls, wheel stops, granite curbs with a driveway,
// planted islands (trees, lamps) at the row ends and mid-row, a pedestrian crossing over the
// aisle, direction arrows and a paved walkway to the plaza. Curbs, islands, trees, lamps and
// parked cars all have colliders; the central aisle stays clear for driving.
import { useMemo } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface } from './materials.js'
import { Car, StreetLamp, Trees, FlowerBed } from './props.jsx'

const CAR_COLORS = ['#1d2a44', '#8b1d22', '#e8e8e6', '#2f3134', '#5d6c78', '#0e0f11', '#6b5232', '#a9acb0']
function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }

export const LOT_LAYOUT = { stallW: 2.8, stallD: 5.2, midStall: 6 }

export default function ParkingLot({ x0, x1, z0, z1, y = 0.15 }) {
  const m = getMaterials()
  const w = x1 - x0, d = z1 - z0
  const cx = (x0 + x1) / 2
  const { stallW, stallD, midStall } = LOT_LAYOUT
  const rows = [z0 + 6, z1 - 6]
  const n = Math.floor((w - 8) / stallW)
  const sx = (i) => x0 + 4 + (i + 0.5) * stallW // stall centre
  const capW = 3
  const islands = useMemo(() => rows.flatMap((rz, r) => [
    { x: x0 + 0.6 + capW / 2, z: rz, w: capW, d: stallD - 0.2, lamp: true, r },
    { x: sx(n - 1) + stallW / 2 + 0.2 + capW / 2, z: rz, w: capW, d: stallD - 0.2, lamp: true, r },
    { x: sx(midStall), z: rz, w: stallW - 0.3, d: stallD - 0.2, lamp: false, r },
  ]), [x0, x1, z0, z1]) // eslint-disable-line react-hooks/exhaustive-deps

  const cars = useMemo(() => {
    const out = []
    rows.forEach((rz, r) => {
      for (let i = 0; i < n; i++) if (i !== midStall && hash(i * 7 + r * 31) > 0.45) out.push([sx(i), rz, r ? Math.PI : 0, CAR_COLORS[Math.floor(hash(i + r * 5) * CAR_COLORS.length)]])
    })
    return out
  }, [x0, x1, z0, z1]) // eslint-disable-line react-hooks/exhaustive-deps

  const trees = useMemo(() => islands.map((is, i) => [is.x, y + 0.15, is.z + (is.lamp ? (is.r ? -1.2 : 1.2) : 0), 0.85 + (i % 3) * 0.08]), [islands, y])

  const mats = useMemo(() => ({
    asphalt: surface('asphalt', w / 5, d / 5, { color: '#8a8c90' }),
    paint: m.shared('lotPaint', () => new THREE.MeshStandardMaterial({ color: '#efeee8', roughness: 0.75 })),
    curb: surface('limestone', 4, 0.2, { color: '#a9a49b' }),
    stop: surface('concrete', 0.5, 0.2, { color: '#bdb9b1' }),
    grass: surface('grass', 1, 1.6),
    pavers: surface('pavers', 3, 14),
  }), [m, w, d])

  // perimeter curbs on the west, north and south edges; the east edge is the entrance/exit (towards the plaza)
  const curbs = [
    [x0 + 0.15, (z0 + z1) / 2, 0.3, d],
    [cx, z1 - 0.15, w, 0.3],
    [cx, z0 + 0.15, w, 0.3],
  ]
  const ch = 0.15 // curb height above the lot

  // aisle arrows (two each way) and a zebra crossing between the mid-row islands
  const arrow = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-1.2, -0.12); s.lineTo(0.4, -0.12); s.lineTo(0.4, -0.45); s.lineTo(1.2, 0); s.lineTo(0.4, 0.45); s.lineTo(0.4, 0.12); s.lineTo(-1.2, 0.12); s.closePath()
    return new THREE.ShapeGeometry(s)
  }, [])
  const aisleZ = (rows[0] + rows[1]) / 2
  const zebra = []
  for (let z = rows[0] + stallD / 2 + 0.6; z < rows[1] - stallD / 2 - 0.3; z += 1.2) zebra.push(z)

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {curbs.map(([x, z, sx_, sz], i) => <CuboidCollider key={'c' + i} args={[sx_ / 2, ch / 2, sz / 2]} position={[x, y + ch / 2, z]} />)}
        {islands.map((is, i) => <CuboidCollider key={'i' + i} args={[is.w / 2, ch / 2, is.d / 2]} position={[is.x, y + ch / 2, is.z]} />)}
      </RigidBody>

      <mesh position={[cx, y + 0.005, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={mats.asphalt} receiveShadow><planeGeometry args={[w, d]} /></mesh>

      {/* stall lines and wheel stops */}
      {rows.map((rz, r) => Array.from({ length: n + 1 }, (_, i) => (
        <mesh key={r + '-' + i} position={[x0 + 4 + i * stallW, y + 0.01, rz]} rotation={[-Math.PI / 2, 0, 0]} material={mats.paint}><planeGeometry args={[0.12, stallD]} /></mesh>
      )))}
      {rows.map((rz, r) => <mesh key={'back' + r} position={[x0 + 4 + (n * stallW) / 2, y + 0.01, rz + (r ? 1 : -1) * (stallD / 2)]} rotation={[-Math.PI / 2, 0, 0]} material={mats.paint}><planeGeometry args={[n * stallW, 0.12]} /></mesh>)}
      {rows.map((rz, r) => Array.from({ length: n }, (_, i) => i !== midStall && (
        <mesh key={'ws' + r + i} position={[sx(i), y + 0.06, rz + (r ? 1 : -1) * (stallD / 2 - 0.55)]} material={mats.stop} castShadow><boxGeometry args={[1.7, 0.12, 0.16]} /></mesh>
      )))}

      {/* direction arrows and the pedestrian crossing */}
      {[[x0 + 12, -1], [x0 + 30, -1], [x0 + 14, 1], [x0 + 32, 1]].map(([x, k], i) => (
        <mesh key={'ar' + i} geometry={arrow} position={[x, y + 0.011, aisleZ + k * 2.6]} rotation={[-Math.PI / 2, 0, k > 0 ? Math.PI : 0]} material={mats.paint} />
      ))}
      {zebra.map((z) => <mesh key={'zb' + z} position={[sx(midStall), y + 0.012, z]} rotation={[-Math.PI / 2, 0, 0]} material={mats.paint}><planeGeometry args={[3, 0.6]} /></mesh>)}

      {/* curbs */}
      {curbs.map(([x, z, sx_, sz], i) => <mesh key={'cm' + i} position={[x, y + ch / 2, z]} material={mats.curb} castShadow receiveShadow><boxGeometry args={[sx_, ch, sz]} /></mesh>)}

      {/* islands: granite curb ring, grass, a tree; lamps on the end caps; flowers mid-row */}
      {islands.map((is, i) => (
        <group key={'is' + i}>
          <mesh position={[is.x, y + ch / 2, is.z]} material={mats.curb} castShadow receiveShadow><boxGeometry args={[is.w, ch, is.d]} /></mesh>
          <mesh position={[is.x, y + ch + 0.003, is.z]} rotation={[-Math.PI / 2, 0, 0]} material={mats.grass} receiveShadow><planeGeometry args={[is.w - 0.3, is.d - 0.3]} /></mesh>
          {is.lamp && <StreetLamp position={[is.x, y + ch, is.z + (is.r ? 1.3 : -1.3)]} yaw={Math.PI / 2} double height={8} />}
        </group>
      ))}
      <Trees trees={trees} />
      {islands.filter((is) => !is.lamp).map((is, i) => <FlowerBed key={'fb' + i} x={is.x} z={is.z + (is.r ? 1.7 : -1.7)} w={1.6} d={1.2} y={y + ch} seed={40 + i} shrubs={false} />)}

      {cars.map(([x, z, yaw, color], i) => <Car key={i} position={[x, y, z]} yaw={yaw} color={color} />)}

      {/* paved walkway between the lot and the plaza */}
      <mesh position={[x1 + 4, y + 0.004, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={mats.pavers} receiveShadow><planeGeometry args={[7, d]} /></mesh>
    </group>
  )
}
