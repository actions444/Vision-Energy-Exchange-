import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Humanoid NPCs drawn as instanced body parts. Each figure has the same proportions as the player
// avatar (head, hair, torso, pelvis, arms, forearms, thighs, shins, shoes), so a crowd of hundreds
// costs about fourteen draw calls. Each figure is described by:
//   { x, z, yaw, scale, shirt, pants, skin, hair, armsUp (0..1), phase, bounce (0..1) }
// Positions are in the parent's frame; the parent may be rotated.

const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }

// Part geometry, sized like the Avatar component.
const GEO = {
  head: () => new THREE.SphereGeometry(0.125, 16, 12),
  hair: () => new THREE.SphereGeometry(0.133, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.36),
  torso: () => new THREE.CapsuleGeometry(0.17, 0.34, 4, 10),
  pelvis: () => new THREE.CapsuleGeometry(0.15, 0.08, 4, 10),
  upperArm: () => new THREE.CapsuleGeometry(0.055, 0.22, 3, 8),
  foreArm: () => new THREE.CapsuleGeometry(0.048, 0.2, 3, 8),
  thigh: () => new THREE.CapsuleGeometry(0.075, 0.32, 4, 8),
  shin: () => new THREE.CapsuleGeometry(0.062, 0.32, 4, 8),
  foot: () => new THREE.BoxGeometry(0.11, 0.07, 0.26),
}

// Rest pose offsets, in figure space (origin on the floor, facing +z).
const REST = {
  pelvis: [0, 0.94, 0],
  torso: [0, 1.2, 0],
  head: [0, 1.6, 0.01],
  hair: [0, 1.625, -0.02],
  thighL: [-0.1, 0.72, 0], thighR: [0.1, 0.72, 0],
  shinL: [-0.1, 0.36, 0], shinR: [0.1, 0.36, 0],
  footL: [-0.1, 0.035, 0.05], footR: [0.1, 0.035, 0.05],
  upperArmL: [-0.24, 1.2, 0], upperArmR: [0.24, 1.2, 0],
  foreArmL: [-0.26, 0.92, 0.02], foreArmR: [0.26, 0.92, 0.02],
}

const PARTS = [
  // name, geometry, material key, rest key, colour source
  ['head', 'head', 'skin', 'head', 'skin'],
  ['hair', 'hair', 'hair', 'hair', 'hair'],
  ['torso', 'torso', 'shirt', 'torso', 'shirt'],
  ['pelvis', 'pelvis', 'pants', 'pelvis', 'pants'],
  ['upperArmL', 'upperArm', 'shirt', 'upperArmL', 'shirt'],
  ['upperArmR', 'upperArm', 'shirt', 'upperArmR', 'shirt'],
  ['foreArmL', 'foreArm', 'skin', 'foreArmL', 'skin'],
  ['foreArmR', 'foreArm', 'skin', 'foreArmR', 'skin'],
  ['thighL', 'thigh', 'pants', 'thighL', 'pants'],
  ['thighR', 'thigh', 'pants', 'thighR', 'pants'],
  ['shinL', 'shin', 'pants', 'shinL', 'pants'],
  ['shinR', 'shin', 'pants', 'shinR', 'pants'],
  ['footL', 'foot', 'shoe', 'footL', 'shoe'],
  ['footR', 'foot', 'shoe', 'footR', 'shoe'],
]

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3()
const _e = new THREE.Euler()
const _fig = new THREE.Matrix4(), _loc = new THREE.Matrix4(), _one = new THREE.Vector3(1, 1, 1)
const _q2 = new THREE.Quaternion(), _dir = new THREE.Vector3(), _dir2 = new THREE.Vector3(), _v = new THREE.Vector3()

/**
 * A crowd of humanoid figures. `fans` is the list described above. `beat` is a number, or a function
 * returning 0..1, that drives arm raises and bounce in time with the music.
 */
export function HumanoidCrowd({ fans, beat = 0, time = 0, castShadow = true, roam = false }) {
  const n = fans.length
  const geos = useMemo(() => ({ ...Object.fromEntries(Object.entries(GEO).map(([k, f]) => [k, f()])) }), [])
  const mats = useMemo(() => ({
    skin: new THREE.MeshStandardMaterial({ roughness: 0.6 }),
    hair: new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.2 }),
    shirt: new THREE.MeshStandardMaterial({ roughness: 0.8 }),
    pants: new THREE.MeshStandardMaterial({ roughness: 0.75 }),
    shoe: new THREE.MeshStandardMaterial({ color: '#15121a', roughness: 0.5, metalness: 0.1 }),
  }), [])
  const refs = useRef({})

  // colours per figure
  useEffect(() => {
    const c = new THREE.Color()
    for (const [name, , , , src] of PARTS) {
      const mesh = refs.current[name]
      if (!mesh) continue
      fans.forEach((f, i) => {
        if (src === 'skin') c.set(f.skin)
        else if (src === 'hair') c.set(f.hair)
        else if (src === 'shirt') c.set(f.shirt)
        else if (src === 'pants') c.set(f.pants)
        else c.set('#15121a')
        mesh.setColorAt(i, c)
      })
      mesh.instanceColor.needsUpdate = true
    }
  }, [fans])

  useFrame((st) => {
    const t = st.clock.elapsedTime
    const b = typeof beat === 'function' ? beat() : beat
    const pulse = Math.max(0, Math.sin(t * 3.1)) * b
    fans.forEach((f, i) => {
      // figure transform: position, yaw, scale, and a small bounce on the beat
      const bob = (Math.sin(t * 2.2 + f.phase) * 0.02 + pulse * 0.06 * f.bounce) * f.scale
      const sway = Math.sin(t * 0.9 + f.phase) * 0.05 * (b > 0 ? 1 : 0.3)
      _e.set(0, f.yaw + sway, 0)
      _q.setFromEuler(_e)
      _p.set(f.x, bob + (f.y || 0), f.z)
      { const k = f.hidden ? 0.0001 : f.scale; _s.set(k, k, k) }
      _fig.compose(_p, _q, _s)
      const up = f.armsUp * (0.45 + pulse * 0.55) // 0 arms down, 1 both arms raised
      const walk = f.walk || 0 // 0..1: stride amount for NPCs that walk (workers); crowds leave it unset

      for (const [name, , , rest] of PARTS) {
        const mesh = refs.current[name]
        if (!mesh) continue
        if (name.startsWith('upperArm') || name.startsWith('foreArm')) continue // posed below
        if (walk > 0.001 && (name.startsWith('thigh') || name.startsWith('shin') || name.startsWith('foot'))) continue // walking legs, posed below
        const [x, y, z] = REST[rest]
        _e.set(0, 0, 0); _q.setFromEuler(_e)
        _p.set(x, y, z)
        _loc.compose(_p, _q, _one)
        _m.multiplyMatrices(_fig, _loc)
        mesh.setMatrixAt(i, _m)
      }

      // walking legs: thigh from the hip, shin from the knee, foot from the shin
      if (walk > 0.001) {
        const g = f.gait || 0
        for (const side of [-1, 1]) {
          const key = side < 0 ? 'L' : 'R'
          const ph = g + (side > 0 ? Math.PI : 0)
          const th = Math.sin(ph) * 0.55 * walk
          const bend = Math.max(0, Math.sin(ph + 1.3)) * 0.95 * walk
          const hip = _v.set(side * 0.1, 0.9, 0)
          _e.set(th, 0, 0); _q.setFromEuler(_e)
          _dir.set(0, -1, 0).applyQuaternion(_q)
          _p.copy(hip).addScaledVector(_dir, 0.18)
          _loc.compose(_p, _q, _one); _m.multiplyMatrices(_fig, _loc)
          refs.current['thigh' + key].setMatrixAt(i, _m)
          const knee = hip.clone().addScaledVector(_dir, 0.36)
          _e.set(th + bend, 0, 0); _q2.setFromEuler(_e)
          _dir2.set(0, -1, 0).applyQuaternion(_q2)
          _p.copy(knee).addScaledVector(_dir2, 0.18)
          _loc.compose(_p, _q2, _one); _m.multiplyMatrices(_fig, _loc)
          refs.current['shin' + key].setMatrixAt(i, _m)
          _p.copy(knee).add(_dir.set(0, -0.505, 0.05).applyQuaternion(_q2))
          _loc.compose(_p, _q2, _one); _m.multiplyMatrices(_fig, _loc)
          refs.current['foot' + key].setMatrixAt(i, _m)
        }
      }

      // arms: each arm is a chain from the shoulder (upper arm, then forearm from the elbow).
      // Resting, the arm hangs; raised, it swings up and out. The forearm follows the elbow.
      for (const side of [-1, 1]) {
        const key = side < 0 ? 'L' : 'R'
        const swing = Math.sin(t * 2.0 + f.phase + (side > 0 ? Math.PI : 0)) * 0.1 * (1 - up) * (1 - walk)
          - Math.sin((f.gait || 0) + (side > 0 ? Math.PI : 0)) * 0.5 * walk * (1 - up) // arms swing against the legs
        // arm direction: 0 = hanging straight down, raised = pointing up
        const pitch = -up * 2.8 + swing // rotation about x
        const out = side * (0.08 + up * 0.35) // rotation about z (away from the body)
        _e.set(pitch, 0, out)
        _q.setFromEuler(_e)
        _dir.set(0, -1, 0).applyQuaternion(_q)
        const shoulder = _v.set(side * 0.24, 1.42, 0)
        // upper arm: centre halfway down the upper arm
        const uc = shoulder.clone().addScaledVector(_dir, 0.11)
        _p.copy(uc)
        _loc.compose(_p, _q, _one)
        _m.multiplyMatrices(_fig, _loc)
        refs.current['upperArm' + key].setMatrixAt(i, _m)
        // forearm: hangs from the elbow, bending a little forward as it is raised
        const elbow = shoulder.clone().addScaledVector(_dir, 0.24)
        _e.set(pitch * 0.85 - 0.15 * up - 0.25 * walk, 0, out * 0.9); _q2.setFromEuler(_e)
        _dir2.set(0, -1, 0).applyQuaternion(_q2)
        const fc = elbow.clone().addScaledVector(_dir2, 0.11)
        _p.copy(fc)
        _loc.compose(_p, _q2, _one)
        _m.multiplyMatrices(_fig, _loc)
        refs.current['foreArm' + key].setMatrixAt(i, _m)
      }
    })
    for (const [name] of PARTS) {
      const mesh = refs.current[name]
      if (mesh) mesh.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group>
      {PARTS.map(([name, geoKey, matKey]) => (
        <instancedMesh
          key={name}
          ref={(el) => { refs.current[name] = el }}
          args={[geos[geoKey], mats[matKey], n]}
          castShadow={castShadow}
          frustumCulled={!roam}
        >
          {/* materials are per-part; instance colour gives every figure its own clothes */}
        </instancedMesh>
      ))}
    </group>
  )
}

/** Deterministic figure list: a crowd with varied clothes, skin, hair and poses. */
export function makeCrowd(count, layout) {
  const SKINS = ['#f1c8a4', '#d9a37a', '#b07a52', '#8a5a3b', '#5c3b28', '#e8b98e']
  const HAIRS = ['#0b0910', '#2a1a10', '#6b4a2a', '#c9a96a', '#3a2a40', '#1a1a1a']
  const SHIRTS = ['#2a3352', '#8b1d6e', '#1d6b63', '#d9a441', '#3b2c5a', '#c4413a', '#f0efe9', '#101216', '#e0559f', '#2fd0c4']
  const PANTS = ['#1b1f2a', '#2c2a33', '#3c3a46', '#5a4a3a', '#101216']
  return Array.from({ length: count }, (_, i) => {
    const p = layout(i)
    return {
      x: p.x, y: p.y ?? 0, z: p.z, yaw: p.yaw ?? 0, scale: (p.scale ?? 1) * (0.94 + hash(i * 7) * 0.12),
      skin: SKINS[Math.floor(hash(i * 3) * SKINS.length)],
      hair: HAIRS[Math.floor(hash(i * 5) * HAIRS.length)],
      shirt: SHIRTS[Math.floor(hash(i * 9) * SHIRTS.length)],
      pants: PANTS[Math.floor(hash(i * 11) * PANTS.length)],
      armsUp: hash(i * 13) < (p.raiseChance ?? 0.12) ? 1 : 0,
      phase: hash(i * 17) * Math.PI * 2,
      bounce: 0.6 + hash(i * 19) * 0.4,
    }
  })
}
