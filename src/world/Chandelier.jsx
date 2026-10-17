import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { registerLightAnchor } from '../state/environment.js'
import { registerLoad, switchedMaterial } from '../state/power.js'

// Reusable chandeliers. Crystals are instanced (one draw call per chandelier), so a lobby can
// have several without hurting phones. `light` adds one pooled point light under the fixture.
//
//   type: 'crystal' | 'gold' | 'modern'
//   position: the ceiling mount point; drop: how far it hangs below the ceiling

// Bulbs, LEDs and the faint sparkle inside the crystals go dark when the room is switched off,
// so each zone gets its own copy of those materials.
const mats = {}
const brass = () => (mats.brass ||= new THREE.MeshStandardMaterial({ color: '#c9a35a', metalness: 1, roughness: 0.28 }))
const crystal = (zone) => (mats['crystal' + (zone || '')] ||= switchedMaterial(new THREE.MeshPhysicalMaterial({ color: '#f4f8ff', metalness: 0.1, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.82, emissive: '#fff3dc', emissiveIntensity: 0.6, envMapIntensity: 2.5 }), zone, 0.6, 0.02))
const bulb = (zone) => (mats['bulb' + (zone || '')] ||= switchedMaterial(new THREE.MeshStandardMaterial({ color: '#fff7e6', emissive: '#ffd9a0', emissiveIntensity: 2.6, toneMapped: false }), zone, 2.6, 0))
const led = (zone) => (mats['led' + (zone || '')] ||= switchedMaterial(new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff1dc', emissiveIntensity: 2.2, toneMapped: false }), zone, 2.2, 0))

function Crystals({ rings, zone }) {
  const ref = useRef()
  const list = useMemo(() => {
    const out = []
    for (const r of rings) for (let i = 0; i < r.n; i++) {
      const a = (i / r.n) * Math.PI * 2
      for (let k = 0; k < r.strand; k++) out.push([Math.cos(a) * r.radius, r.y - 0.07 - k * 0.075, Math.sin(a) * r.radius, 0.022 + (k === r.strand - 1 ? 0.012 : 0)])
    }
    return out
  }, [rings])
  useEffect(() => {
    const o = new THREE.Object3D()
    list.forEach(([x, y, z, s], i) => { o.position.set(x, y, z); o.scale.setScalar(s); o.rotation.set(0, i * 0.7, 0); o.updateMatrix(); ref.current.setMatrixAt(i, o.matrix) })
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [list])
  return <instancedMesh ref={ref} args={[null, crystal(zone), list.length]}><octahedronGeometry args={[1, 0]} /></instancedMesh>
}

export function Chandelier({ position, type = 'crystal', size = 1, drop = 0.9, light = true, color = '#ffe2b8', intensity = 12, zone, watts = 160 }) {
  useEffect(() => {
    if (!light) return
    return registerLightAnchor({ position: new THREE.Vector3(position[0], position[1] - drop - 0.3 * size, position[2]), color, intensity: intensity * size, distance: 10 * size, range: 40, zone })
  }, [position[0], position[1], position[2], light, size, zone]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => registerLoad({ zone, watts: watts * size }), [zone, watts, size])
  const s = size
  const rings = useMemo(() => (type === 'crystal'
    ? [{ radius: 0.55 * s, y: -drop, n: 22, strand: 4 }, { radius: 0.36 * s, y: -drop + 0.28 * s, n: 14, strand: 3 }, { radius: 0.18 * s, y: -drop + 0.5 * s, n: 8, strand: 2 }]
    : type === 'gold' ? [{ radius: 0.5 * s, y: -drop, n: 12, strand: 1 }] : []), [type, s, drop])
  return (
    <group position={position} userData={{ noBatch: true }}>
      {/* canopy + stem */}
      <mesh position={[0, -0.03, 0]} material={brass()}><cylinderGeometry args={[0.16 * s, 0.2 * s, 0.06, 20]} /></mesh>
      <mesh position={[0, -drop / 2, 0]} material={brass()}><cylinderGeometry args={[0.012, 0.012, drop, 6]} /></mesh>
      {type === 'modern' ? (
        <>
          {/* contemporary LED rings */}
          <mesh position={[0, -drop, 0]} rotation={[Math.PI / 2, 0, 0]} material={led(zone)}><torusGeometry args={[0.6 * s, 0.025 * s, 8, 64]} /></mesh>
          <mesh position={[0, -drop + 0.18 * s, 0]} rotation={[Math.PI / 2 + 0.25, 0, 0]} material={led(zone)}><torusGeometry args={[0.42 * s, 0.022 * s, 8, 48]} /></mesh>
          {[0, 1, 2].map((k) => <mesh key={k} position={[Math.cos(k * 2.1) * 0.3 * s, -drop / 2, Math.sin(k * 2.1) * 0.3 * s]} rotation={[0, 0, Math.cos(k * 2.1) * 0.35]} material={brass()}><cylinderGeometry args={[0.006, 0.006, drop, 4]} /></mesh>)}
        </>
      ) : (
        <>
          {rings.map((r, i) => (
            <group key={i}>
              <mesh position={[0, r.y, 0]} rotation={[Math.PI / 2, 0, 0]} material={brass()}><torusGeometry args={[r.radius, 0.014 * s, 6, 40]} /></mesh>
              {/* candle bulbs around the ring */}
              {Array.from({ length: type === 'gold' ? 8 : Math.max(4, Math.round(r.n / 3)) }, (_, k) => {
                const count = type === 'gold' ? 8 : Math.max(4, Math.round(r.n / 3))
                const a = (k / count) * Math.PI * 2
                return <mesh key={k} position={[Math.cos(a) * r.radius, r.y + 0.07, Math.sin(a) * r.radius]} material={bulb(zone)}><sphereGeometry args={[0.03 * s, 8, 6]} /></mesh>
              })}
            </group>
          ))}
          {type === 'gold' && Array.from({ length: 8 }, (_, k) => {
            const a = (k / 8) * Math.PI * 2
            return <mesh key={'arm' + k} position={[Math.cos(a) * 0.25 * s, -drop + 0.06, Math.sin(a) * 0.25 * s]} rotation={[0, -a, Math.PI / 2]} material={brass()}><cylinderGeometry args={[0.01, 0.01, 0.5 * s, 4]} /></mesh>
          })}
          {rings.length > 0 && <Crystals rings={rings} zone={zone} />}
          <mesh position={[0, -drop - 0.12 * s, 0]} material={crystal(zone)}><octahedronGeometry args={[0.07 * s, 0]} /></mesh>
        </>
      )}
    </group>
  )
}
