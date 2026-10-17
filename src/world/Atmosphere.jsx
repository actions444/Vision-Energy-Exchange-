import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { useStore } from '../state/store.js'
import { playerState } from '../state/runtime.js'
import { isIndoors } from './layout.js'
import {
  useEnv, env, WEATHER, sunDirection, moonDirection,
  updateNightMaterials, updateWetMaterials, lightAnchors,
} from '../state/environment.js'
import { tickPower, updatePowerMaterials, zoneLit } from '../state/power.js'
import { updateWindowViews } from './Interior.jsx'
import { tickSchedule } from '../state/schedule.js'

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const C = (h) => new THREE.Color(h)
const FOG = { day: C('#b8c6d4'), golden: C('#d9a682'), night: C('#0b1019'), rain: C('#7c8590') }
const HEMI_SKY = { day: C('#cfe0ff'), golden: C('#ffc9a0'), night: C('#1a2440') }
const HEMI_GROUND = { day: C('#8a7d6a'), night: C('#0c0d12') }
const SUN = { day: C('#fff4e2'), golden: C('#ffb074'), moon: C('#9db4ff') }

// Day/night cycle, physically based sky, moving clouds, rain, thunderstorms, fog, sun/moon
// light with shadows, reflections and the pool of lights that switch on at dusk.
export default function Atmosphere() {
  const { gl, scene, camera } = useThree()
  const quality = useStore((s) => s.settings.quality)
  const drawDist = useStore((s) => s.settings.drawDist)
  const near = drawDist === 'near'
  useEffect(() => { camera.far = near ? 480 : 1200; camera.updateProjectionMatrix() }, [camera, near])
  const showRain = useStore((s) => s.settings.rain)
  const sun = useRef()
  const hemi = useRef()
  const amb = useRef()
  const tmp = useMemo(() => ({ c: new THREE.Color(), c2: new THREE.Color(), v: new THREE.Vector3() }), [])

  // physically based sky (Preetham model)
  const sky = useMemo(() => {
    const s = new Sky()
    s.scale.setScalar(900)
    s.material.uniforms.turbidity.value = 6
    s.material.uniforms.rayleigh.value = 1.6
    s.material.uniforms.mieCoefficient.value = 0.004
    s.material.uniforms.mieDirectionalG.value = 0.82
    s.frustumCulled = false
    s.renderOrder = -10
    return s
  }, [])

  // reflections: re-baked from the sky whenever the sun moves noticeably
  const envBake = useRef({ lastElev: 99, lastCloud: -1, rt: null, pmrem: null, scene: null, sky: null })
  useEffect(() => {
    const b = envBake.current
    b.pmrem = new THREE.PMREMGenerator(gl)
    b.scene = new THREE.Scene()
    b.sky = new Sky()
    b.sky.scale.setScalar(10)
    b.scene.add(b.sky)
    return () => { b.rt?.dispose(); b.pmrem.dispose(); scene.environment = null }
  }, [gl, scene])

  const fog = useMemo(() => new THREE.FogExp2('#b8c6d4', 0.002), [])
  useEffect(() => { scene.fog = fog; return () => { scene.fog = null } }, [scene, fog])

  // night overlay + stars + moon + clouds
  const night = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, transparent: true, fog: false,
    uniforms: { uNight: { value: 0 } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vD; uniform float uNight;
      void main(){ float h = clamp(vD.y, 0.0, 1.0);
        vec3 c = mix(vec3(0.055,0.07,0.12), vec3(0.008,0.012,0.03), pow(h, 0.5));
        gl_FragColor = vec4(c, uNight); }`,
  }), [])
  const stars = useMemo(() => {
    const n = 1600, pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI * 2, y = 0.08 + Math.random() * 0.92, r = Math.sqrt(1 - y * y)
      pos.set([Math.cos(th) * r * 380, y * 380, Math.sin(th) * r * 380], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [])
  const starMat = useMemo(() => new THREE.PointsMaterial({ color: '#eef1ff', size: 1.4, sizeAttenuation: false, fog: false, transparent: true, opacity: 0, depthWrite: false }), [])
  const moon = useRef()
  const clouds = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, transparent: true, fog: false,
    uniforms: { uTime: { value: 0 }, uCover: { value: 0.2 }, uLight: { value: new THREE.Color(1, 1, 1) }, uShade: { value: new THREE.Color(0.6, 0.62, 0.68) }, uFlash: { value: 0 }, uSun: { value: new THREE.Vector3() } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: /* glsl */ `
      varying vec3 vD; uniform float uTime, uCover, uFlash; uniform vec3 uLight, uShade, uSun;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
      float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<6;i++){ s+=noise(p)*a; p=p*2.03+vec2(1.7,9.2); a*=0.5; } return s; }
      void main(){
        if (vD.y < 0.0) discard;
        vec2 uv = vD.xz / (vD.y + 0.12) * 1.4;
        vec2 wind = vec2(uTime * 0.012, uTime * 0.004);
        float n = fbm(uv + wind);
        float d = fbm(uv * 2.0 + wind * 1.6 + n);
        float cov = smoothstep(1.0 - uCover, 1.0 - uCover + 0.32, n * 0.75 + d * 0.35);
        float thick = smoothstep(0.3, 1.0, d);
        float sunGlow = pow(max(dot(normalize(vD), uSun), 0.0), 6.0);
        vec3 col = mix(uLight, uShade, thick * 0.8) + uLight * sunGlow * 0.4;
        col += vec3(0.9, 0.92, 1.0) * uFlash * (0.4 + thick);
        float horizon = smoothstep(0.0, 0.18, vD.y);
        gl_FragColor = vec4(col, cov * horizon * 0.95);
      }`,
  }), [])

  // ----- the frame loop: time, sun, weather, lights -----
  const flash = useRef({ next: 8, t: -10 })
  const indoor = useRef(0) // 0 outside .. 1 inside a building (sky light is mostly blocked)
  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1)
    const E = useEnv.getState()
    if (E.running) {
      let t = E.time + (E.speed * dt) / 60
      if (t >= 24) t -= 24
      useEnv.setState({ time: t })
    }
    const time = useEnv.getState().time
    sunDirection(time, env.sunDir)
    moonDirection(time, env.moonDir)
    env.elevation = Math.asin(env.sunDir.y)
    env.day = smooth(-0.1, 0.18, env.sunDir.y)
    env.night = 1 - smooth(-0.12, 0.06, env.sunDir.y)
    env.golden = smooth(-0.08, 0.04, env.sunDir.y) * (1 - smooth(0.06, 0.32, env.sunDir.y))

    // weather eases in/out
    const W = WEATHER[E.weather] || WEATHER.clear
    const k = 1 - Math.exp(-dt * 0.6)
    env.cloud += (W.cloud - env.cloud) * k
    env.rain += (W.rain - env.rain) * k
    env.storm += (W.storm - env.storm) * k
    env.fog += (W.fog - env.fog) * k
    env.wet += ((W.rain > 0 ? 1 : 0) - env.wet) * (W.rain > 0 ? k * 0.5 : k * 0.08)
    const overcast = smooth(0.5, 1, env.cloud)
    indoor.current += ((isIndoors(camera.position) ? 1 : 0) - indoor.current) * (1 - Math.exp(-dt * 3))
    const shade = 1 - indoor.current

    // lightning
    const f = flash.current
    env.flash = 0
    const tt = state.clock.elapsedTime
    if (env.storm > 0.3) {
      if (tt > f.next) { f.t = tt; f.next = tt + 6 + Math.random() * 14 }
      const e = tt - f.t
      if (e < 0.7) env.flash = Math.max(0, Math.sin(e * 38) * Math.exp(-e * 5)) * env.storm
    }

    // sky
    const u = sky.material.uniforms
    u.sunPosition.value.copy(env.sunDir).multiplyScalar(400)
    u.turbidity.value = 2.4 + overcast * 12
    u.rayleigh.value = 1.2 + env.golden * 1.4 - overcast * 0.8
    night.uniforms.uNight.value = Math.min(1, env.night * 0.97 + overcast * 0.25 * env.day)
    starMat.opacity = env.night * (1 - env.cloud) * 0.95
    if (moon.current) {
      moon.current.position.copy(env.moonDir).multiplyScalar(360)
      moon.current.material.opacity = env.night * (1 - env.cloud * 0.8)
    }

    // clouds lit by the sun (white by day, warm at sunset, dark grey at night/storm)
    clouds.uniforms.uTime.value = tt
    clouds.uniforms.uCover.value = env.cloud
    clouds.uniforms.uSun.value.copy(env.sunDir)
    clouds.uniforms.uFlash.value = env.flash
    tmp.c.setRGB(1, 1, 1).lerp(tmp.c2.setRGB(1, 0.72, 0.5), env.golden).multiplyScalar(0.08 + 0.92 * env.day)
    tmp.c.lerp(tmp.c2.setRGB(0.42, 0.44, 0.48), overcast * 0.7)
    clouds.uniforms.uLight.value.copy(tmp.c)
    clouds.uniforms.uShade.value.copy(tmp.c).multiplyScalar(0.55 - env.storm * 0.2)

    // sun / moon light (one directional light; shadows follow the player)
    const L = sun.current
    if (L) {
      const useSun = env.sunDir.y > -0.05
      const dir = useSun ? env.sunDir : env.moonDir
      const p = playerState.position
      L.position.set(p.x + dir.x * 70, p.y + dir.y * 70, p.z + dir.z * 70)
      L.target.position.set(p.x, p.y, p.z)
      L.target.updateMatrixWorld()
      if (useSun) {
        L.color.copy(SUN.day).lerp(SUN.golden, env.golden)
        L.intensity = (0.15 + 2.1 * env.day) * (1 - overcast * 0.88) * (0.12 + 0.88 * shade)
      } else {
        L.color.copy(SUN.moon)
        L.intensity = 0.28 * (1 - env.cloud * 0.6)
      }
    }
    if (hemi.current) {
      hemi.current.color.copy(HEMI_SKY.night).lerp(HEMI_SKY.day, env.day).lerp(HEMI_SKY.golden, env.golden * 0.5)
      hemi.current.groundColor.copy(HEMI_GROUND.night).lerp(HEMI_GROUND.day, env.day)
      hemi.current.intensity = (0.3 + 0.5 * env.day) * (0.45 + 0.55 * shade) + env.flash * 4 * shade
    }
    if (amb.current) amb.current.intensity = 0.1 + 0.08 * env.day

    // fog
    fog.color.copy(FOG.night).lerp(FOG.day, env.day).lerp(FOG.golden, env.golden * 0.6).lerp(FOG.rain.clone().multiplyScalar(0.2 + 0.8 * env.day), overcast * 0.7)
    fog.density = env.fog * (1 + env.night * 0.4) * (near ? 1.7 : 1)

    // exposure: the sky model is HDR; keep night readable
    gl.toneMappingExposure = (0.46 + env.golden * 0.08 + env.night * 0.44) * (1 - env.storm * 0.22 * shade) + indoor.current * 0.12 * (1 - env.night)

    updateNightMaterials()
    updateWetMaterials()
    // the power meter runs on in-world time: `speed` is in-world minutes per real second
    tickPower((E.running ? (E.speed * dt) / 60 : 0), dt)
    updatePowerMaterials()
    updateWindowViews()
    if (E.running) tickSchedule(useEnv.getState().time)

    // re-bake reflections from the sky when the sun or clouds change enough
    const b = envBake.current
    if (b.pmrem && (Math.abs(env.elevation - b.lastElev) > 0.03 || Math.abs(env.cloud - b.lastCloud) > 0.08)) {
      b.lastElev = env.elevation
      b.lastCloud = env.cloud
      const su = b.sky.material.uniforms
      for (const key of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG']) su[key].value = u[key].value
      su.sunPosition.value.copy(u.sunPosition.value)
      const old = b.rt
      b.rt = b.pmrem.fromScene(b.scene, 0.02)
      scene.environment = b.rt.texture
      old?.dispose()
    }
    scene.environmentIntensity = (0.06 + 0.5 * env.day * (1 - overcast * 0.4)) * (0.5 + 0.5 * shade)
  })

  return (
    <>
      <primitive object={sky} />
      <mesh material={night} scale={890} renderOrder={-9} frustumCulled={false}><sphereGeometry args={[1, 32, 16]} /></mesh>
      <points geometry={stars} material={starMat} frustumCulled={false} renderOrder={-8} />
      <mesh ref={moon} renderOrder={-7}>
        <sphereGeometry args={[9, 24, 12]} />
        <meshBasicMaterial color="#f2f0e6" fog={false} transparent opacity={0} toneMapped={false} />
      </mesh>
      <mesh material={clouds} scale={420} renderOrder={-6} frustumCulled={false}><sphereGeometry args={[1, 48, 24]} /></mesh>
      <ambientLight ref={amb} intensity={0.2} />
      <hemisphereLight ref={hemi} args={['#cfe0ff', '#8a7d6a', 1]} />
      <directionalLight
        ref={sun}
        intensity={2.5}
        castShadow={quality === 'high'}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
        shadow-camera-near={1}
        shadow-camera-far={160}
        shadow-bias={-0.0003}
        shadow-normalBias={0.03}
      />
      <LightPool size={quality === 'high' ? 8 : 5} />
      {showRain && <Rain camera={camera} count={quality === 'high' ? 3000 : 1400} />}
    </>
  )
}

// Fixed pool of point lights that hop to the light anchors nearest the camera.
function LightPool({ size }) {
  const lights = useRef([])
  const { camera } = useThree()
  const timer = useRef(0)
  const picks = useRef([])
  useFrame((_, dt) => {
    timer.current -= dt
    if (timer.current <= 0) {
      timer.current = 0.35
      const cp = camera.position
      for (const a of lightAnchors) if (a.follow) a.position.y = a.follow()
      picks.current = lightAnchors
        .filter((a) => (!a.night || env.night > 0.02) && zoneLit(a.zone))
        .map((a) => [a, a.position.distanceToSquared(cp)])
        .filter(([a, d]) => d < (a.range || 70) * (a.range || 70))
        .sort((x, y) => x[1] - y[1])
        .slice(0, size)
        .map(([a]) => a)
    }
    lights.current.forEach((l, i) => {
      if (!l) return
      const a = picks.current[i]
      if (!a) { l.intensity = 0; return }
      if (a.follow) a.position.y = a.follow()
      l.position.copy(a.position)
      l.color.set(a.color || '#ffd9a8')
      l.distance = a.distance || 14
      const target = (a.intensity || 20) * (a.night ? env.night : 1) * (zoneLit(a.zone) ? 1 : 0)
      l.intensity += (target - l.intensity) * 0.2
    })
  })
  return Array.from({ length: size }, (_, i) => (
    <pointLight key={i} ref={(el) => (lights.current[i] = el)} intensity={0} distance={14} decay={1.6} />
  ))
}

function Rain({ count, camera }) {
  const ref = useRef()
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uAmount: { value: 0 }, uLight: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec3 seed; attribute float tip;
      uniform float uTime; uniform vec3 uCam; uniform float uAmount;
      varying float vA;
      const float SIZE = 50.0; const float H = 28.0;
      void main() {
        vec3 p = seed;
        p.y = mod(seed.y - uTime * (17.0 + fract(seed.x) * 6.0), H);
        p.xz = mod(seed.xz - uCam.xz + SIZE * 0.5, SIZE) - SIZE * 0.5 + uCam.xz;
        p.y += uCam.y - 10.0;
        p += tip * vec3(0.1, -0.8, 0.04);
        float keep = step(fract(seed.z * 7.13), uAmount / 1.4);
        vA = (1.0 - tip) * keep;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: 'uniform float uLight; varying float vA; void main(){ if (vA <= 0.0) discard; gl_FragColor = vec4(vec3(0.75, 0.8, 0.88) * uLight, vA * 0.35 + 0.05); }',
  }), [])
  const geo = useMemo(() => {
    const seeds = new Float32Array(count * 6), tips = new Float32Array(count * 2)
    for (let i = 0; i < count; i++) {
      const s = [Math.random() * 50, Math.random() * 28, Math.random() * 50]
      seeds.set(s, i * 6); seeds.set(s, i * 6 + 3)
      tips[i * 2 + 1] = 1
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 6), 3))
    g.setAttribute('seed', new THREE.BufferAttribute(seeds, 3))
    g.setAttribute('tip', new THREE.BufferAttribute(tips, 1))
    return g
  }, [count])
  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime
    mat.uniforms.uCam.value.copy(camera.position)
    mat.uniforms.uAmount.value = env.rain
    mat.uniforms.uLight.value = 0.25 + 0.75 * env.day + env.flash
    if (ref.current) ref.current.visible = env.rain > 0.02 && !isIndoors(camera.position)
  })
  return <lineSegments ref={ref} geometry={geo} material={mat} frustumCulled={false} />
}
