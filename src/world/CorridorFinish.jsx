import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { surface, blackMarble } from './materials.js'
import { PLAZA, P, CORRIDOR, ELEVATOR, DOOR_U, STAIRS } from '../config/plaza.js'
import { Chandelier } from './Chandelier.jsx'

// Luxury finish for the Plaza's lobby and corridors (replaces the bare plaster-and-tile look):
// polished black marble with gold veins, a plum runner, walnut wainscoting with a brass rail,
// warm upper walls with panel moulding, crown moulding with a warm LED cove, wall sconces,
// walnut door casings and chandeliers. Purely visual: walls, doors and colliders are unchanged.

const EXT = 0.3, PART = 0.15
const CEIL = PLAZA.floorH - 0.3
const WAINSCOT = 1.05
const D0 = DOOR_U - 0.6, D1 = DOOR_U + 0.6, DH = 2.4

const MATS = {}
const m = () => {
  if (MATS.ok) return MATS
  Object.assign(MATS, {
    ok: true,
    walnut: surface('wood', 6, 0.5, { color: '#5a3d2b' }),
    upper: new THREE.MeshStandardMaterial({ color: '#cbbca6', roughness: 0.9 }),
    brass: new THREE.MeshStandardMaterial({ color: '#c9a35a', metalness: 1, roughness: 0.3 }),
    moulding: new THREE.MeshStandardMaterial({ color: '#ddd2c0', roughness: 0.6 }),
    cove: new THREE.MeshStandardMaterial({ color: '#fff3e0', emissive: '#ffcf8f', emissiveIntensity: 1.4, toneMapped: false }),
    sconce: new THREE.MeshStandardMaterial({ color: '#fff6e6', emissive: '#ffd59a', emissiveIntensity: 1.8, toneMapped: false }),
    runner: surface('carpet', 1, 12, { color: '#3e2240' }),
    runnerEdge: new THREE.MeshStandardMaterial({ color: '#b8955a', roughness: 0.5 }),
    ceilingPanel: new THREE.MeshStandardMaterial({ color: '#efe8dc', roughness: 0.85 }),
  })
  return MATS
}

/** The two corridor walls of one floor: [u0, u1, v (wall face in the corridor), normal z]. */
function walls() {
  return [
    { u0: EXT, u1: 28 - EXT, v: CORRIDOR.v0 + PART / 2 + 0.012, n: 1 },
    { u0: ELEVATOR.u1 + 0.2, u1: 28 - EXT, v: CORRIDOR.v1 - PART / 2 - 0.012, n: -1 },
  ]
}
/** Corridor floor of floor f as rectangles [u0,u1,v0,v1], leaving the stairwell opening clear. */
function floorRects(f) {
  const v0 = CORRIDOR.v0 + PART / 2, v1 = CORRIDOR.v1 - PART / 2
  const hole = f > 0 ? STAIRS.find((st) => st.fromFloor === f - 1) : null
  if (!hole) return [[EXT, 28 - EXT, v0, v1]]
  const out = [[EXT, hole.u0, v0, v1], [hole.u1, 28 - EXT, v0, v1]]
  if (hole.v0 > v0) out.push([hole.u0, hole.u1, v0, hole.v0])
  if (hole.v1 < v1) out.push([hole.u0, hole.u1, hole.v1, v1])
  return out
}
/** Wall pieces between openings (the room door). */
const segments = (w) => [[w.u0, D0], [D1, w.u1]]

/** Instanced thin boxes: panel moulding frames and sconces for every floor. */
function useInstances(list) {
  const ref = useRef()
  useEffect(() => {
    const o = new THREE.Object3D()
    list.forEach(([x, y, z, sx, sy, sz], i) => { o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.updateMatrix(); ref.current.setMatrixAt(i, o.matrix) })
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [list])
  return ref
}

export default function CorridorFinish() {
  const M = m()
  const floors = Array.from({ length: PLAZA.floors }, (_, f) => f)
  const marble = useMemo(() => blackMarble('#c9a96a', 9, 3), [])

  // moulding frames (4 bars each) on the upper walls, and sconce pairs between them
  const { bars, sconces } = useMemo(() => {
    const bars = [], sconces = []
    for (const f of floors) {
      const y = P.Y(f)
      for (const w of walls()) for (const [a, b] of segments(w)) {
        const len = b - a
        const n = Math.max(1, Math.round(len / 2.6))
        const pw = len / n
        for (let i = 0; i < n; i++) {
          const cu = a + pw * (i + 0.5)
          const fw = pw - 0.5, y0 = y + WAINSCOT + 0.25, y1 = y + CEIL - 0.55
          const z = P.Z(w.v) + w.n * 0.012
          bars.push([P.X(cu), y0, z, fw, 0.04, 0.02], [P.X(cu), y1, z, fw, 0.04, 0.02], [P.X(cu - fw / 2), (y0 + y1) / 2, z, 0.04, y1 - y0, 0.02], [P.X(cu + fw / 2), (y0 + y1) / 2, z, 0.04, y1 - y0, 0.02])
          if (i < n - 1 && len > 3) sconces.push([P.X(a + pw * (i + 1)), y + 2.05, P.Z(w.v) + w.n * 0.07, 0.14, 0.32, 0.1])
        }
      }
    }
    return { bars, sconces }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const barRef = useInstances(bars)
  const sconceRef = useInstances(sconces)

  return (
    <group userData={{ noBatch: true }}>
      <instancedMesh ref={barRef} args={[null, M.moulding, bars.length]}><boxGeometry /></instancedMesh>
      <instancedMesh ref={sconceRef} args={[null, M.sconce, sconces.length]}><boxGeometry /></instancedMesh>
      {floors.map((f) => {
        const y = P.Y(f)
        const cv = (CORRIDOR.v0 + CORRIDOR.v1) / 2
        return (
          <group key={f}>
            {/* black marble floor + plum runner with brass edging */}
            {floorRects(f).map(([u0, u1, v0, v1], i) => (
              <mesh key={'mf' + i} position={[P.X((u0 + u1) / 2), y + 0.004, P.Z((v0 + v1) / 2)]} rotation={[-Math.PI / 2, 0, 0]} material={marble} receiveShadow><planeGeometry args={[u1 - u0, v1 - v0]} /></mesh>
            ))}
            <mesh position={[P.X(16.6), y + 0.007, P.Z(cv)]} rotation={[-Math.PI / 2, 0, 0]} material={M.runner}><planeGeometry args={[21.6, 1.7]} /></mesh>
            {[-0.88, 0.88].map((d) => <mesh key={d} position={[P.X(16.6), y + 0.008, P.Z(cv + d)]} rotation={[-Math.PI / 2, 0, 0]} material={M.runnerEdge}><planeGeometry args={[21.6, 0.05]} /></mesh>)}
            {/* coffered ceiling panel with a warm LED cove along both sides */}
            {/* (starts past the stairwell so the opening above the stairs stays open) */}
            <mesh position={[P.X(18.9), y + CEIL - 0.006, P.Z(cv)]} rotation={[Math.PI / 2, 0, 0]} material={M.ceilingPanel}><planeGeometry args={[17.2, 4.6]} /></mesh>
            {[-2.35, 2.35].map((d) => <mesh key={'cove' + d} position={[P.X(18.9), y + CEIL - 0.02, P.Z(cv + d)]} material={M.cove}><boxGeometry args={[17.2, 0.025, 0.05]} /></mesh>)}
            {walls().map((w, wi) => (
              <group key={wi}>
                {segments(w).map(([a, b], si) => {
                  const cu = (a + b) / 2, len = b - a
                  const z = P.Z(w.v)
                  const rot = w.n > 0 ? 0 : Math.PI
                  return (
                    <group key={si}>
                      <mesh position={[P.X(cu), y + WAINSCOT / 2, z]} rotation={[0, rot, 0]} material={M.walnut}><planeGeometry args={[len, WAINSCOT]} /></mesh>
                      <mesh position={[P.X(cu), y + (WAINSCOT + CEIL) / 2, z]} rotation={[0, rot, 0]} material={M.upper}><planeGeometry args={[len, CEIL - WAINSCOT]} /></mesh>
                      <mesh position={[P.X(cu), y + WAINSCOT, z + w.n * 0.02]} material={M.brass}><boxGeometry args={[len, 0.035, 0.04]} /></mesh>
                      <mesh position={[P.X(cu), y + 0.06, z + w.n * 0.015]} material={M.walnut}><boxGeometry args={[len, 0.12, 0.03]} /></mesh>
                      <mesh position={[P.X(cu), y + CEIL - 0.09, z + w.n * 0.04]} material={M.moulding}><boxGeometry args={[len, 0.16, 0.08]} /></mesh>
                    </group>
                  )
                })}
                {/* over-door header in the same finish, and a walnut casing around the doorway */}
                <mesh position={[P.X(DOOR_U), y + (DH + CEIL) / 2, P.Z(w.v)]} rotation={[0, w.n > 0 ? 0 : Math.PI, 0]} material={M.upper}><planeGeometry args={[D1 - D0, CEIL - DH]} /></mesh>
                <mesh position={[P.X(DOOR_U), y + DH + 0.06, P.Z(w.v) + w.n * 0.03]} material={M.walnut}><boxGeometry args={[D1 - D0 + 0.3, 0.14, 0.06]} /></mesh>
                {[D0 - 0.07, D1 + 0.07].map((u) => <mesh key={u} position={[P.X(u), y + DH / 2, P.Z(w.v) + w.n * 0.03]} material={M.walnut}><boxGeometry args={[0.14, DH, 0.06]} /></mesh>)}
                <mesh position={[P.X(DOOR_U), y + DH + 0.2, P.Z(w.v) + w.n * 0.05]} material={M.sconce}><boxGeometry args={[0.5, 0.04, 0.04]} /></mesh>
              </group>
            ))}
            {/* chandeliers: a grand crystal one over the lobby, gold ones upstairs */}
            {f === 0 ? (
              <>
                <Chandelier position={[P.X(15), y + CEIL, P.Z(cv)]} type="crystal" size={1.15} drop={0.75} intensity={14} />
                <Chandelier position={[P.X(11.5), y + CEIL, P.Z(cv)]} type="crystal" size={0.75} drop={0.55} light={false} />
                <Chandelier position={[P.X(23), y + CEIL, P.Z(cv)]} type="crystal" size={0.75} drop={0.55} light={false} />
              </>
            ) : [12, 17.5, 23].map((u) => <Chandelier key={u} position={[P.X(u), y + CEIL, P.Z(cv)]} type={f === 1 ? 'gold' : 'modern'} size={0.75} drop={0.55} light={false} />)}
          </group>
        )
      })}
    </group>
  )
}
