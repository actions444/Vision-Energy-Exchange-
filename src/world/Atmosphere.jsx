import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { NEON } from '../config/theme.js'
import { useStore } from '../state/store.js'
import { playerState } from '../state/runtime.js'
import { isIndoors } from './layout.js'

// Night sky, stars, storm rain with lightning, fog, moonlight and a neon-tinted
// reflection environment (generated locally with PMREM, no HDR downloads).
export default function Atmosphere() {
  const { gl, scene } = useThree()
  const rain = useStore((s) => s.settings.rain)
  const quality = useStore((s) => s.settings.quality)
  const hemi = useRef()
  const moon = useRef()
  const skyMat = useRef()
  const flash = useRef({ next: 6, t: -10 })

  // neon reflection environment
  useEffect(() => {
    const envScene = new THREE.Scene()
    envScene.background = new THREE.Color('#05040a')
    const box = new THREE.BoxGeometry(1, 1, 1)
    const add = (color, pos, scale, intensity = 1) => {
      const m = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity) }))
      m.position.set(...pos)
      m.scale.set(...scale)
      envScene.add(m)
    }
    add(NEON.purple, [0, 10, 0], [30, 0.5, 30], 0.6)
    add(NEON.pink, [-12, 3, 0], [0.5, 4, 14], 0.7)
    add(NEON.teal, [12, 3, 0], [0.5, 4, 14], 0.55)
    add(NEON.yellow, [0, 4, -12], [6, 0.6, 0.5], 0.5)
    add('#ffffff', [0, 6, 12], [8, 0.6, 0.5], 0.8)
    add(NEON.purple, [0, -3, 0], [30, 0.5, 30], 0.08)
    const pmrem = new THREE.PMREMGenerator(gl)
    const rt = pmrem.fromScene(envScene, 0.04)
    scene.environment = rt.texture
    scene.environmentIntensity = 0.75
    pmrem.dispose()
    return () => { scene.environment = null; rt.dispose() }
  }, [gl, scene])

  const sky = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { uTime: { value: 0 }, uFlash: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * p;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      uniform float uTime;
      uniform float uFlash;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
      float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=noise(p)*a; p*=2.03; a*=0.5; } return s; }
      void main() {
        float h = vDir.y;
        vec3 top = vec3(0.035, 0.02, 0.07);
        vec3 mid = vec3(0.09, 0.03, 0.16);
        vec3 horizon = vec3(0.32, 0.06, 0.30);
        vec3 col = mix(horizon, mid, smoothstep(0.0, 0.18, h));
        col = mix(col, top, smoothstep(0.18, 0.7, h));
        // storm clouds lit from below by the city
        vec2 uv = vDir.xz / max(h + 0.15, 0.05) * 0.6;
        float c = fbm(uv + vec2(uTime * 0.01, uTime * 0.004));
        float clouds = smoothstep(0.45, 0.85, c) * smoothstep(-0.05, 0.25, h);
        vec3 cloudCol = mix(vec3(0.18, 0.05, 0.25), vec3(0.03, 0.18, 0.2), noise(uv * 0.5));
        col = mix(col, cloudCol, clouds * 0.75);
        col += vec3(0.75, 0.7, 1.0) * uFlash * (0.25 + clouds);
        if (h < 0.0) col = mix(horizon * 0.6, vec3(0.02, 0.01, 0.03), smoothstep(0.0, -0.2, h));
        gl_FragColor = vec4(col, 1.0);
      }`,
  }), [])

  const stars = useMemo(() => {
    const n = 1400
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI * 2
      const y = 0.15 + Math.random() * 0.85
      const r = Math.sqrt(1 - y * y)
      pos.set([Math.cos(th) * r * 400, y * 400, Math.sin(th) * r * 400], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    sky.uniforms.uTime.value = t
    // lightning
    const f = flash.current
    let flashAmt = 0
    if (rain) {
      if (t > f.next) { f.t = t; f.next = t + 10 + Math.random() * 18 }
      const e = t - f.t
      if (e < 0.6) flashAmt = Math.max(0, Math.sin(e * 40) * Math.exp(-e * 6))
    }
    sky.uniforms.uFlash.value = flashAmt
    if (hemi.current) hemi.current.intensity = 0.55 + flashAmt * 3
    // keep shadow frustum around the player
    if (moon.current) {
      const p = playerState.position
      moon.current.position.set(p.x - 30, p.y + 50, p.z + 20)
      moon.current.target.position.set(p.x, p.y, p.z)
      moon.current.target.updateMatrixWorld()
    }
  })

  return (
    <>
      <fogExp2 attach="fog" args={['#0d0718', 0.011]} />
      <mesh material={sky} scale={480} renderOrder={-1} frustumCulled={false}>
        <sphereGeometry args={[1, 48, 24]} />
      </mesh>
      <points geometry={stars} frustumCulled={false}>
        <pointsMaterial color="#e8e0ff" size={1.3} sizeAttenuation={false} fog={false} transparent opacity={0.8} />
      </points>
      {/* moon */}
      <mesh position={[-160, 170, -260]}>
        <sphereGeometry args={[12, 32, 16]} />
        <meshBasicMaterial color="#e9e4ff" fog={false} toneMapped={false} />
      </mesh>
      <ambientLight intensity={0.25} color="#8a6cc4" />
      <hemisphereLight ref={hemi} args={['#6a3fb0', '#0b0a12', 0.55]} />
      <directionalLight
        ref={moon}
        color="#a9b8ff"
        intensity={0.9}
        castShadow={quality === 'high'}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-bias={-0.0004}
      />
      {rain && <Rain count={quality === 'high' ? 2600 : 1200} />}
    </>
  )
}

function Rain({ count }) {
  const { camera } = useThree()
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uColor: { value: new THREE.Color('#bfaaff') } },
    vertexShader: /* glsl */ `
      attribute vec3 seed;
      attribute float tip;
      uniform float uTime;
      uniform vec3 uCam;
      varying float vA;
      const float SIZE = 50.0;
      const float H = 28.0;
      void main() {
        vec3 p = seed;
        p.y = mod(seed.y - uTime * (18.0 + fract(seed.x) * 6.0), H);
        p.xz = mod(seed.xz - uCam.xz + SIZE * 0.5, SIZE) - SIZE * 0.5 + uCam.xz;
        p.y += uCam.y - 10.0;
        p += tip * vec3(0.12, -0.75, 0.05);
        vA = (1.0 - tip) * 0.55;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vA;
      void main() { gl_FragColor = vec4(uColor, vA * 0.6 + 0.08); }`,
  }), [])
  const geo = useMemo(() => {
    const seeds = new Float32Array(count * 2 * 3)
    const tips = new Float32Array(count * 2)
    for (let i = 0; i < count; i++) {
      const s = [Math.random() * 50, Math.random() * 28, Math.random() * 50]
      seeds.set(s, i * 6)
      seeds.set(s, i * 6 + 3)
      tips[i * 2] = 0
      tips[i * 2 + 1] = 1
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 2 * 3), 3))
    g.setAttribute('seed', new THREE.BufferAttribute(seeds, 3))
    g.setAttribute('tip', new THREE.BufferAttribute(tips, 1))
    return g
  }, [count])
  const ref = useRef()
  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime
    mat.uniforms.uCam.value.copy(camera.position)
    // no rain indoors
    if (ref.current) ref.current.visible = !isIndoors(camera.position)
  })
  return <lineSegments ref={ref} geometry={geo} material={mat} frustumCulled={false} />
}
