import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// A rigged-by-hand, full-body procedural avatar (hips, spine, head, two-segment arms and legs).
// It is the default player model and the model used for remote players. Animation is
// procedural: walk/run cycles driven by actual movement speed, a jump pose, idle breathing and a wave emote.
//
// `state` is any object with { speed, grounded, emote } that is mutated every frame by its owner.

const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 6, 12)

export default function Avatar({ state, accent = '#a33cff', skin = '#d9a37a' }) {
  const g = useMemo(() => ({
    torso: capsule(0.17, 0.34),
    pelvis: capsule(0.15, 0.08),
    head: new THREE.SphereGeometry(0.125, 24, 18),
    hair: new THREE.SphereGeometry(0.132, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.55),
    visor: new THREE.TorusGeometry(0.118, 0.018, 8, 32, Math.PI * 1.1),
    upperArm: capsule(0.055, 0.22),
    foreArm: capsule(0.048, 0.2),
    hand: new THREE.SphereGeometry(0.055, 12, 10),
    upperLeg: capsule(0.075, 0.32),
    lowerLeg: capsule(0.062, 0.32),
    foot: new THREE.BoxGeometry(0.11, 0.07, 0.26),
    belt: new THREE.TorusGeometry(0.158, 0.016, 8, 32),
    collar: new THREE.TorusGeometry(0.1, 0.02, 8, 24),
  }), [])

  const m = useMemo(() => ({
    suit: new THREE.MeshStandardMaterial({ color: '#15121d', roughness: 0.45, metalness: 0.35 }),
    pants: new THREE.MeshStandardMaterial({ color: '#0d0b12', roughness: 0.6, metalness: 0.2 }),
    skin: new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6 }),
    hair: new THREE.MeshStandardMaterial({ color: '#0b0910', roughness: 0.35, metalness: 0.4 }),
    neon: new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 2.2, toneMapped: false }),
    sole: new THREE.MeshStandardMaterial({ color: '#f4efff', emissive: accent, emissiveIntensity: 0.6, roughness: 0.4 }),
  }), [accent, skin])

  const r = {
    root: useRef(), hips: useRef(), spine: useRef(), head: useRef(),
    lUA: useRef(), lFA: useRef(), rUA: useRef(), rFA: useRef(),
    lUL: useRef(), lLL: useRef(), rUL: useRef(), rLL: useRef(),
  }
  const anim = useRef({ phase: 0, amp: 0, run: 0, air: 0, wave: 0, t: 0, sit: 0 })

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const a = anim.current
    const speed = state.speed || 0
    const k = (x, target, rate) => x + (target - x) * (1 - Math.exp(-rate * dt))
    a.t += dt
    a.amp = k(a.amp, Math.min(speed / 2.6, 1), 10)
    a.run = k(a.run, THREE.MathUtils.clamp((speed - 3) / 3, 0, 1), 6)
    a.air = k(a.air, state.grounded ? 0 : 1, 12)
    a.wave = k(a.wave, state.emote === 'wave' ? 1 : 0, 8)
    a.sit = k(a.sit, state.sit ? 1 : 0, 9)
    // stride frequency scales with speed (longer strides when running)
    a.phase += dt * (speed > 0.05 ? 3.2 + speed * 1.15 : 0)

    const s = Math.sin(a.phase)
    const swingAmp = a.amp * (0.55 + a.run * 0.45)
    const air = a.air

    // legs: negative x rotation swings the leg forward
    const lSwing = -s * swingAmp
    const rSwing = s * swingAmp
    r.lUL.current.rotation.x = THREE.MathUtils.lerp(lSwing, -0.7, air)
    r.rUL.current.rotation.x = THREE.MathUtils.lerp(rSwing, -0.15, air)
    const lBend = Math.max(0, Math.sin(a.phase + 1.4)) * swingAmp * (1.1 + a.run * 0.8)
    const rBend = Math.max(0, Math.sin(a.phase + 1.4 + Math.PI)) * swingAmp * (1.1 + a.run * 0.8)
    r.lLL.current.rotation.x = THREE.MathUtils.lerp(lBend + 0.04, 1.1, air)
    r.rLL.current.rotation.x = THREE.MathUtils.lerp(rBend + 0.04, 0.5, air)

    // arms counter-swing
    const breath = Math.sin(a.t * 1.8) * 0.03
    r.lUA.current.rotation.x = THREE.MathUtils.lerp(s * swingAmp * 0.9, -0.9, air)
    r.rUA.current.rotation.x = THREE.MathUtils.lerp(-s * swingAmp * 0.9, -0.9, air)
    r.lUA.current.rotation.z = 0.08 + breath * 0.5 + air * 0.5
    r.rUA.current.rotation.z = -0.08 - breath * 0.5 - air * 0.5
    r.lFA.current.rotation.x = -0.15 - a.amp * 0.35 - a.run * 0.9
    r.rFA.current.rotation.x = -0.15 - a.amp * 0.35 - a.run * 0.9

    // wave emote overrides the right arm (avatar's right is -x)
    if (a.wave > 0.01) {
      r.rUA.current.rotation.z = THREE.MathUtils.lerp(r.rUA.current.rotation.z, -2.7, a.wave)
      r.rUA.current.rotation.x = THREE.MathUtils.lerp(r.rUA.current.rotation.x, 0, a.wave)
      r.rFA.current.rotation.x = THREE.MathUtils.lerp(r.rFA.current.rotation.x, 0, a.wave)
      r.rFA.current.rotation.z = Math.sin(a.t * 10) * 0.45 * a.wave
    } else {
      r.rFA.current.rotation.z = 0
    }

    // body bob, lean, breathing
    r.hips.current.position.y = 0.95 + Math.abs(Math.cos(a.phase)) * 0.045 * a.amp - a.run * 0.04 + air * 0.05
    r.hips.current.rotation.y = s * 0.08 * a.amp
    r.spine.current.rotation.x = 0.04 + a.run * 0.2 + air * 0.1
    r.spine.current.rotation.y = -s * 0.12 * a.amp
    r.spine.current.scale.set(1, 1 + breath * 0.3, 1 + breath)
    r.head.current.rotation.x = -a.run * 0.12

    // seated pose: thighs forward, shins down, hands resting on the knees
    const st = a.sit
    if (st > 0.001) {
      const L = THREE.MathUtils.lerp
      r.lUL.current.rotation.x = L(r.lUL.current.rotation.x, -1.52, st)
      r.rUL.current.rotation.x = L(r.rUL.current.rotation.x, -1.52, st)
      r.lLL.current.rotation.x = L(r.lLL.current.rotation.x, 1.5, st)
      r.rLL.current.rotation.x = L(r.rLL.current.rotation.x, 1.5, st)
      r.lUA.current.rotation.x = L(r.lUA.current.rotation.x, -0.45, st)
      r.lFA.current.rotation.x = L(r.lFA.current.rotation.x, -0.75, st)
      if (a.wave < 0.5) {
        r.rUA.current.rotation.x = L(r.rUA.current.rotation.x, -0.45, st)
        r.rFA.current.rotation.x = L(r.rFA.current.rotation.x, -0.75, st)
      }
      r.lUA.current.rotation.z = L(r.lUA.current.rotation.z, 0.12, st)
      r.hips.current.position.y = L(r.hips.current.position.y, (state.sitHeight || 0.45) + 0.06, st)
      r.hips.current.position.z = L(0, -0.05, st)
      r.hips.current.rotation.y = L(r.hips.current.rotation.y, 0, st)
      r.spine.current.rotation.x = L(r.spine.current.rotation.x, -0.06, st)
      r.spine.current.rotation.y = L(r.spine.current.rotation.y, 0, st)
    } else r.hips.current.position.z = 0
  })

  return (
    <group ref={r.root}>
      <group ref={r.hips} position={[0, 0.95, 0]}>
        <mesh geometry={g.pelvis} material={m.pants} rotation={[0, 0, Math.PI / 2]} castShadow />
        <mesh geometry={g.belt} material={m.neon} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} />

        {/* legs */}
        {[[0.1, r.lUL, r.lLL], [-0.1, r.rUL, r.rLL]].map(([x, ul, ll], i) => (
          <group key={i} ref={ul} position={[x, -0.04, 0]}>
            <mesh geometry={g.upperLeg} material={m.pants} position={[0, -0.22, 0]} castShadow />
            <group ref={ll} position={[0, -0.45, 0]}>
              <mesh geometry={g.lowerLeg} material={m.pants} position={[0, -0.2, 0]} castShadow />
              <mesh geometry={g.foot} material={m.sole} position={[0, -0.43, 0.05]} castShadow />
            </group>
          </group>
        ))}

        {/* torso */}
        <group ref={r.spine} position={[0, 0.06, 0]}>
          <mesh geometry={g.torso} material={m.suit} position={[0, 0.3, 0]} scale={[1.18, 1, 0.82]} castShadow />
          <mesh geometry={g.collar} material={m.neon} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.58, 0]} />
          {/* neon chest line */}
          <mesh material={m.neon} position={[0, 0.34, 0.145]}>
            <boxGeometry args={[0.025, 0.3, 0.01]} />
          </mesh>

          <group ref={r.head} position={[0, 0.66, 0]}>
            <mesh material={m.skin} position={[0, 0.02, 0]}>
              <cylinderGeometry args={[0.045, 0.05, 0.08, 12]} />
            </mesh>
            <mesh geometry={g.head} material={m.skin} position={[0, 0.15, 0]} castShadow />
            <mesh geometry={g.hair} material={m.hair} position={[0, 0.165, -0.008]} rotation={[-0.25, 0, 0]} />
            <mesh geometry={g.visor} material={m.neon} position={[0, 0.17, 0.0]} rotation={[0, Math.PI * 1.05, 0]} />
          </group>

          {/* arms (shoulders at ±0.25) */}
          {[[0.25, r.lUA, r.lFA], [-0.25, r.rUA, r.rFA]].map(([x, ua, fa], i) => (
            <group key={i} ref={ua} position={[x, 0.5, 0]}>
              <mesh geometry={g.upperArm} material={m.suit} position={[0, -0.16, 0]} castShadow />
              <group ref={fa} position={[0, -0.32, 0]}>
                <mesh geometry={g.foreArm} material={m.suit} position={[0, -0.14, 0]} castShadow />
                <mesh material={m.neon} position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.052, 0.01, 6, 16]} />
                </mesh>
                <mesh geometry={g.hand} material={m.skin} position={[0, -0.3, 0]} />
              </group>
            </group>
          ))}
        </group>
      </group>
    </group>
  )
}
