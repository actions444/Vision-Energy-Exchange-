import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { blackMarble } from './materials.js'
import { BrandSign } from './signs.jsx'
import { LightAnchor } from './props.jsx'
import { nightLit } from '../state/environment.js'
import { POOL } from '../config/island.js'
import { NEON } from '../config/theme.js'
import { registerWater, waterFx, rippleAt } from '../state/water.js'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { env } from '../state/environment.js'
import { useStore } from '../state/store.js'

// The Isla Serena pool: a real basin you can wade into by the steps, swim in, and climb out of.
//   - collision: a floor profile (four steps, a flat shallow end, a long ramp, a flat deep end) and four
//     walls. The terrace around it is carved out of the platform collider (see UpperPlatformColliders),
//     so there is nothing to walk on across the water.
//   - look: mosaic-tiled basin that darkens with depth, animated caustics on the floor, a transparent
//     rippling surface that reflects the sky and the lights, and LED strips glowing under the water.
//   - the water volume is registered with state/water.js, which the player controller reads.

const { x0, x1, z0, z1, rim, deck, surf } = POOL
const W = x1 - x0, D = z1 - z0
const CX = (x0 + x1) / 2, CZ = (z0 + z1) / 2
const DEEP_Y = surf - POOL.deep, SHALLOW_Y = surf - POOL.shallow
const COPING = deck + 0.04 // top of the coping stones (4 cm proud of the deck)

/** The floor profile as [u, y] points, u = metres from the west wall. Vertical jumps are the step risers. */
export const PROFILE = (() => {
  const pts = []
  const top = deck - POOL.stepDrop // top of the first step
  let u = 0
  for (let i = 0; i < POOL.nSteps; i++) {
    const y = top - i * POOL.stepDrop
    pts.push([u, y], [u + POOL.stepW, y])
    u += POOL.stepW
  }
  pts.push([u, SHALLOW_Y], [POOL.rampU0, SHALLOW_Y], [POOL.rampU1, DEEP_Y], [W, DEEP_Y])
  return pts
})()

/** Floor height at u (metres from the west wall). */
export function floorAt(u) {
  let y = PROFILE[0][1]
  for (let i = 0; i < PROFILE.length - 1; i++) {
    const [ua, ya] = PROFILE[i], [ub, yb] = PROFILE[i + 1]
    if (u >= ua && u <= ub) y = ub === ua ? Math.max(ya, yb) : ya + ((yb - ya) * (u - ua)) / (ub - ua)
  }
  return y
}

// ---------------- procedural textures ----------------
const tex = (c, rx = 1, ry = 1, srgb = true) => {
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(rx, ry)
  t.anisotropy = 8
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Small square mosaic tiles in slightly varied light aqua, with pale grout. Vertex colours tint it by depth. */
function mosaicTexture() {
  const N = 16, S = 512, c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')
  g.fillStyle = '#d9f4f2'; g.fillRect(0, 0, S, S)
  let seed = 11
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  const cell = S / N
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const v = 224 + Math.floor(rnd() * 28)
    g.fillStyle = `rgb(${v - 16},${v + 2},${v})`
    g.fillRect(i * cell + 1.5, j * cell + 1.5, cell - 3, cell - 3)
    const gr = g.createLinearGradient(i * cell, j * cell, (i + 1) * cell, (j + 1) * cell)
    gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(0,40,60,0.12)')
    g.fillStyle = gr; g.fillRect(i * cell + 1.5, j * cell + 1.5, cell - 3, cell - 3)
  }
  return tex(c, 1, 1)
}

/** A seamless animated-looking caustic web (light bent by the surface), used additively over the basin floor. */
function causticTexture() {
  const S = 256, c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')
  const img = g.createImageData(S, S)
  const T = Math.PI * 2
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const fx = x / S, fy = y / S
    const h = Math.sin(T * (2 * fx + fy)) + Math.sin(T * (3 * fy - fx) + 1.3) + Math.sin(T * (fx + 4 * fy) + 2.1) + 0.7 * Math.sin(T * (5 * fx - 2 * fy) + 0.4)
    const k = Math.pow(1 / (1 + h * h * 9), 1.6)
    const i = (y * S + x) * 4
    const v = Math.min(255, k * 330)
    img.data[i] = v * 0.85; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255
  }
  g.putImageData(img, 0, 0)
  return tex(c, 1, 1)
}

/** A seamless tangent-space normal map of small crossing wavelets. */
function waterNormalTexture() {
  const S = 256, c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')
  const img = g.createImageData(S, S)
  const T = Math.PI * 2
  const hgt = (x, y) => {
    const fx = x / S, fy = y / S
    return Math.sin(T * (3 * fx + 2 * fy)) * 0.5 + Math.sin(T * (2 * fx - 4 * fy) + 1.1) * 0.35 + Math.sin(T * (6 * fx + fy) + 2.3) * 0.2 + Math.sin(T * (fx - 7 * fy) + 0.6) * 0.15
  }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = hgt(x + 1, y) - hgt(x - 1, y), dy = hgt(x, y + 1) - hgt(x, y - 1)
    const nx = -dx * 0.9, ny = -dy * 0.9, nz = 1
    const l = Math.hypot(nx, ny, nz)
    const i = (y * S + x) * 4
    img.data[i] = ((nx / l) * 0.5 + 0.5) * 255; img.data[i + 1] = ((ny / l) * 0.5 + 0.5) * 255; img.data[i + 2] = ((nz / l) * 0.5 + 0.5) * 255; img.data[i + 3] = 255
  }
  g.putImageData(img, 0, 0)
  return tex(c, 6, 2, false)
}

// ---------------- geometry ----------------
const SHALLOW_C = new THREE.Color('#38c4cc'), DEEP_C = new THREE.Color('#0b5f94')
const depthColor = (y, out = new THREE.Color()) => out.copy(SHALLOW_C).lerp(DEEP_C, THREE.MathUtils.clamp((surf - y) / POOL.deep, 0, 1) ** 0.8)

/** Quads for the basin floor and risers: one per profile segment, each with its own normal. */
function floorGeometry(lift = 0) {
  const pos = [], nor = [], uv = [], col = [], idx = []
  const c = new THREE.Color()
  let arc = 0
  for (let i = 0; i < PROFILE.length - 1; i++) {
    const [ua, ya] = PROFILE[i], [ub, yb] = PROFILE[i + 1]
    const du = ub - ua, dy = yb - ya
    const len = Math.hypot(du, dy)
    const nx = -dy / len, ny = du / len // up-and-toward-the-pool side
    const base = pos.length / 3
    for (const [u, y, a] of [[ua, ya, arc], [ub, yb, arc + len]]) {
      for (const z of [z0, z1]) {
        pos.push(x0 + u + nx * lift * 0, y + ny * lift, z)
        nor.push(nx, ny, 0)
        uv.push((z - z0) / 1.2, a / 1.2)
        depthColor(y, c); col.push(c.r, c.g, c.b)
      }
    }
    idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2)
    arc += len
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setIndex(idx)
  return g
}

/** The two long side walls (inside faces) and the two end walls, tiled from the floor up to the coping. */
function wallGeometry() {
  const pos = [], nor = [], uv = [], col = [], idx = []
  const c = new THREE.Color()
  const quad = (a, b, cc, d, n, uvs) => {
    const base = pos.length / 3
    for (const [p, t] of [[a, uvs[0]], [b, uvs[1]], [cc, uvs[2]], [d, uvs[3]]]) {
      pos.push(...p); nor.push(...n); uv.push(...t)
      depthColor(p[1], c); col.push(c.r, c.g, c.b)
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }
  for (let i = 0; i < PROFILE.length - 1; i++) {
    const [ua, ya] = PROFILE[i], [ub, yb] = PROFILE[i + 1]
    if (ub === ua) continue // risers have no wall
    for (const [z, nz] of [[z0, 1], [z1, -1]]) {
      const A = [x0 + ua, ya, z], B = [x0 + ub, yb, z], C = [x0 + ub, deck, z], Dd = [x0 + ua, deck, z]
      const t = (p) => [p[0] / 1.2, p[1] / 1.2]
      if (nz > 0) quad(A, B, C, Dd, [0, 0, 1], [t(A), t(B), t(C), t(Dd)])
      else quad(B, A, Dd, C, [0, 0, -1], [t(B), t(A), t(Dd), t(C)])
    }
  }
  // west end above the first step, east end full height
  const top0 = PROFILE[0][1]
  const w = (x, yb, nx) => {
    const A = [x, yb, z0], B = [x, yb, z1], C = [x, deck, z1], Dd = [x, deck, z0]
    const t = (p) => [p[2] / 1.2, p[1] / 1.2]
    if (nx > 0) quad(A, B, C, Dd, [1, 0, 0], [t(A), t(B), t(C), t(Dd)])
    else quad(B, A, Dd, C, [-1, 0, 0], [t(B), t(A), t(Dd), t(C)])
  }
  w(x0, top0, 1)
  w(x1, DEEP_Y, -1)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setIndex(idx)
  return g
}

/** Colliders for the basin: the floor profile, four walls. Everything is fixed. */
function BasinColliders() {
  const thick = 0.3
  const parts = []
  // steps: solid blocks from far below up to each tread
  for (let i = 0; i < POOL.nSteps; i++) {
    const top = PROFILE[i * 2][1]
    parts.push({ c: [x0 + POOL.stepW * (i + 0.5), (top - 2.5) / 2, CZ], h: [POOL.stepW / 2, (top + 2.5) / 2, D / 2] })
  }
  const uS = POOL.nSteps * POOL.stepW
  // shallow floor
  parts.push({ c: [x0 + (uS + POOL.rampU0) / 2, SHALLOW_Y - thick / 2, CZ], h: [(POOL.rampU0 - uS) / 2, thick / 2, D / 2] })
  // deep floor
  parts.push({ c: [x0 + (POOL.rampU1 + W) / 2, DEEP_Y - thick / 2, CZ], h: [(W - POOL.rampU1) / 2, thick / 2, D / 2] })
  // walls under and around the water, up to the coping
  const wallTop = COPING, wallBot = DEEP_Y - 0.6
  const wh = (wallTop - wallBot) / 2, wy = (wallTop + wallBot) / 2
  parts.push({ c: [x0 - rim / 2, wy, CZ], h: [rim / 2, wh, D / 2 + rim] })
  parts.push({ c: [x1 + rim / 2, wy, CZ], h: [rim / 2, wh, D / 2 + rim] })
  parts.push({ c: [CX, wy, z0 - rim / 2], h: [W / 2, wh, rim / 2] })
  parts.push({ c: [CX, wy, z1 + rim / 2], h: [W / 2, wh, rim / 2] })
  // the ramp
  const du = POOL.rampU1 - POOL.rampU0, dy = DEEP_Y - SHALLOW_Y
  const len = Math.hypot(du, dy), ang = Math.atan2(dy, du)
  const mid = [x0 + POOL.rampU0 + du / 2, SHALLOW_Y + dy / 2]
  return (
    <RigidBody type="fixed" colliders={false}>
      {parts.map((p, i) => <CuboidCollider key={i} args={p.h} position={p.c} />)}
      <CuboidCollider args={[len / 2, thick / 2, D / 2]} position={[mid[0] + Math.sin(ang) * (thick / 2), mid[1] - Math.cos(ang) * (thick / 2), CZ]} rotation={[0, 0, ang]} />
    </RigidBody>
  )
}

/**
 * The upper platform's collider, with the pool (and its coping ring) cut out of it. This replaces the single
 * slab that used to run under the decorative pool and let you walk across the water.
 */
export function UpperPlatformColliders({ P, top }) {
  const ox0 = x0 - rim, ox1 = x1 + rim, oz0 = z0 - rim, oz1 = z1 + rim
  const X0 = P.x0 + 2.4, X1 = P.x1 - 2.4, Z0 = P.z0 + 2.4, Z1 = P.z1 - 2.4
  const hy = 0.225, cy = top - 0.225
  const box = (a, b, c, d, y = cy, h = hy) => ({ c: [(a + b) / 2, y, (c + d) / 2], h: [(b - a) / 2, h, (d - c) / 2] })
  const parts = [box(X0, X1, Z0, oz0), box(X0, X1, oz1, Z1), box(X0, ox0, oz0, oz1), box(ox1, X1, oz0, oz1)]
  // the low sand apron under the whole platform (top 0.2) also has the pool cut out
  const low = [box(P.x0, P.x1, P.z0, oz0, 0.1, 0.1), box(P.x0, P.x1, oz1, P.z1, 0.1, 0.1), box(P.x0, ox0, oz0, oz1, 0.1, 0.1), box(ox1, P.x1, oz0, oz1, 0.1, 0.1)]
  return (
    <RigidBody type="fixed" colliders={false}>
      {[...parts, ...low].map((p, i) => <CuboidCollider key={i} args={p.h} position={p.c} />)}
    </RigidBody>
  )
}

/** The platform's sand fill and stone cap, cut around the pool so the basin is open to the sky. */
export function PlatformFill({ P, y, sand, stone }) {
  const ox0 = x0 - rim, ox1 = x1 + rim, oz0 = z0 - rim, oz1 = z1 + rim
  const X0 = P.x0 + 2.4, X1 = P.x1 - 2.4, Z0 = P.z0 + 2.4, Z1 = P.z1 - 2.4
  const rects = [[X0, X1, Z0, oz0], [X0, X1, oz1, Z1], [X0, ox0, oz0, oz1], [ox1, X1, oz0, oz1]]
  return rects.map(([a, b, c, d], i) => (
    <group key={i}>
      <mesh position={[(a + b) / 2, y - 0.265, (c + d) / 2]} material={sand} receiveShadow><boxGeometry args={[b - a, 0.43, d - c]} /></mesh>
      <mesh position={[(a + b) / 2, y - 0.035, (c + d) / 2]} material={stone} receiveShadow><boxGeometry args={[b - a, 0.03, d - c]} /></mesh>
    </group>
  ))
}

// ---------------- the surface ----------------
export const surfaceH = (x, z, t) => 0.006 * Math.sin(1.7 * x + 1.1 * t) + 0.005 * Math.sin(2.3 * z - 0.9 * t + 1.2) + 0.003 * Math.sin(3.1 * (x + z) + 1.7 * t) + rippleAt(x, z, t)

/** Cheap surface for low quality: a transparent physical material over the (animated) grid, sky reflected from the scene environment. */
function PoolSurfaceFlat() {
  const nx = 64, nz = 22
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(W, D, nx, nz)
    g.rotateX(-Math.PI / 2)
    g.userData.base = Float32Array.from(g.attributes.position.array)
    return g
  }, [])
  const normal = useMemo(() => waterNormalTexture(), [])
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#0a9fc0', transparent: true, opacity: 0.42, roughness: 0.03, metalness: 0, clearcoat: 0.0, clearcoatRoughness: 0.05,
    normalMap: normal, normalScale: new THREE.Vector2(0.28, 0.28), depthWrite: false, side: THREE.DoubleSide,
    ior: 1.33, specularIntensity: 0.35,
  }), [normal])
  useFrame((st) => {
    const t = st.clock.elapsedTime
    const pos = geo.attributes.position, base = geo.userData.base
    for (let i = 0; i < pos.count; i++) pos.setY(i, surfaceH(base[i * 3] + CX, base[i * 3 + 2] + CZ, t))
    pos.needsUpdate = true
    geo.computeVertexNormals()
    normal.offset.set((t * 0.012) % 1, (t * 0.008) % 1)
  })
  return <mesh geometry={geo} material={mat} position={[CX, surf, CZ]} renderOrder={4} userData={{ noBatch: true }} />
}

// The real surface: a planar reflection of the world (three.js Reflector), distorted by moving wavelets, blended by Fresnel
// (looking straight down you see the tiles through the water, at a low angle you see the sky and the villa), tinted by depth,
// with a bright foam line where the water meets the walls and sun glints. From underneath it is a pale blue ceiling.
const WATER_SHADER = {
  name: 'PoolWaterShader',
  uniforms: {
    color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
    tNormal: { value: null }, time: { value: 0 }, size: { value: new THREE.Vector2(W, D) },
    shallow: { value: new THREE.Color('#4fe3e0') }, deep: { value: new THREE.Color('#0c8fc4') },
    sunDir: { value: new THREE.Vector3(0.3, 0.9, 0.3) }, light: { value: 1 }, glint: { value: 1 },
    ramp: { value: new THREE.Vector4(POOL.nSteps * POOL.stepW, POOL.rampU0, POOL.rampU1, POOL.deep / POOL.shallow) },
  },
  vertexShader: /* glsl */`
    uniform mat4 textureMatrix; uniform vec2 size;
    varying vec4 vProj; varying vec3 vWorld; varying vec3 vNg; varying vec2 vLocal;
    void main() {
      vProj = textureMatrix * vec4(position, 1.0);
      vLocal = vec2(position.x + size.x * 0.5, size.y * 0.5 - position.y); // metres from the west wall (x) and the north wall (z)
      vNg = vec3(normal.x, normal.z, -normal.y);
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorld = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform sampler2D tNormal; uniform float time; uniform vec2 size;
    uniform vec3 shallow; uniform vec3 deep; uniform vec3 sunDir; uniform float light; uniform float glint; uniform vec4 ramp;
    varying vec4 vProj; varying vec3 vWorld; varying vec3 vNg; varying vec2 vLocal;
    void main() {
      vec2 w1 = texture2D(tNormal, vLocal * 0.33 + vec2(time * 0.031, time * 0.019)).xy * 2.0 - 1.0;
      vec2 w2 = texture2D(tNormal, vLocal * 0.57 + vec2(-time * 0.022, time * 0.037)).xy * 2.0 - 1.0;
      vec2 wv = (w1 + w2) * 0.5;
      vec3 N = normalize(vec3(vNg.x + wv.x * 0.45, vNg.y, vNg.z - wv.y * 0.45));
      vec3 V = normalize(cameraPosition - vWorld);
      // depth along the pool: steps, shallow flat, ramp, deep flat (matches the basin profile)
      float u = vLocal.x;
      float d = mix(0.2, 1.0, smoothstep(ramp.x - 0.1, ramp.x + 0.2, u));
      d = mix(d, ramp.w, smoothstep(ramp.y, ramp.z, u));
      if (!gl_FrontFacing) {
        // seen from below: a pale ceiling with the sky bending in
        gl_FragColor = vec4(mix(vec3(0.12, 0.55, 0.72), vec3(0.55, 0.86, 0.95), pow(max(dot(-V, vec3(0.0, -1.0, 0.0)), 0.0), 2.0)) * light, 0.5);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        return;
      }
      float fres = 0.03 + 0.97 * pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 4.0);
      vec4 pr = vProj; pr.xy += wv * 0.05 * pr.w;
      vec3 refl = texture2DProj(tDiffuse, pr).rgb;
      vec3 body = mix(shallow, deep, clamp((d - 0.2) / 0.8, 0.0, 1.0)) * (0.35 + 0.65 * light);
      // foam: a bright meniscus line along the walls, broken up by the wavelets
      float edge = min(min(vLocal.x, size.x - vLocal.x), min(vLocal.y, size.y - vLocal.y));
      float foam = smoothstep(0.2, 0.0, edge) * (0.55 + 0.45 * w1.x);
      // sun glints
      vec3 L = normalize(sunDir);
      float spec = pow(max(dot(reflect(-L, N), V), 0.0), 260.0) * glint;
      vec3 col = mix(body, refl, fres);
      col += vec3(1.0, 0.97, 0.9) * spec * 3.0;
      col = mix(col, vec3(0.95, 1.0, 1.0), foam * 0.8);
      float alpha = clamp(0.24 + 0.2 * d + fres * 0.7 + foam * 0.6 + spec, 0.0, 0.97);
      gl_FragColor = vec4(col, alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}

function PoolSurfaceReflective({ res, every }) {
  const normal = useMemo(() => waterNormalTexture(), [])
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(W, D, 64, 22) // XY plane, rotated flat below; waves displace local z (= world up)
    g.userData.base = Float32Array.from(g.attributes.position.array)
    return g
  }, [])
  const reflector = useMemo(() => {
    const r = new Reflector(geo, { textureWidth: res, textureHeight: Math.round(res * D / W * 1.6), clipBias: 0.003, multisample: 0, shader: WATER_SHADER })
    r.rotation.x = -Math.PI / 2
    r.position.set(CX, surf, CZ)
    const m = r.material
    m.transparent = true; m.depthWrite = false; m.side = THREE.DoubleSide
    m.uniforms.tNormal.value = normal
    r.renderOrder = 4
    r.userData.noBatch = true
    const orig = r.onBeforeRender
    let n = 0
    r.onBeforeRender = function (renderer, scene, camera, ...rest) { if (n++ % every === 0) orig.call(this, renderer, scene, camera, ...rest) } // reflections refresh every few frames
    return r
  }, [geo, normal, res, every])
  useEffect(() => () => reflector.dispose(), [reflector])
  useFrame((st) => {
    const t = st.clock.elapsedTime
    const pos = geo.attributes.position, base = geo.userData.base
    for (let i = 0; i < pos.count; i++) pos.setZ(i, surfaceH(base[i * 3] + CX, CZ - base[i * 3 + 1], t))
    pos.needsUpdate = true
    geo.computeVertexNormals()
    const u = reflector.material.uniforms
    u.time.value = t
    u.sunDir.value.copy(env.sunDir)
    const day = env.day
    u.light.value = 0.18 + 0.82 * day
    u.glint.value = day * (1 - env.cloud * 0.8)
  })
  return <primitive object={reflector} />
}

function PoolSurface() {
  const quality = useStore((s) => s.settings.quality)
  if (quality === 'low') return <PoolSurfaceFlat />
  return quality === 'high' ? <PoolSurfaceReflective res={768} every={2} /> : <PoolSurfaceReflective res={384} every={3} />
}

/** Foam droplets thrown up by splashes (a small ballistic particle pool). */
function SplashFoam() {
  const N = 90
  const ref = useRef()
  const parts = useMemo(() => Array.from({ length: N }, (_, i) => {
    const a = (i * 2.399963) % (Math.PI * 2)
    const r = 0.35 + ((i * 0.618) % 1) * 1.1
    return { vx: Math.cos(a) * r, vz: Math.sin(a) * r, vy: 2.4 + ((i * 0.37) % 1) * 2.4 }
  }), [])
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3).fill(-1e4), 3)); return g }, [])
  useFrame((st) => {
    const t = st.clock.elapsedTime
    const pos = geo.attributes.position
    let n = 0
    for (const s of waterFx.splashes) {
      const age = t - s.t0
      if (age < 0 || age > 1.2) continue
      for (let i = 0; i < 15 && n < N; i++, n++) {
        const p = parts[(n * 7) % N]
        const k = 0.6 + s.power * 0.9
        const y = s.y + p.vy * k * age - 4.9 * age * age
        if (y < s.y) { pos.setXYZ(n, 0, -1e4, 0); continue }
        pos.setXYZ(n, s.x + p.vx * k * age * 0.8, y, s.z + p.vz * k * age * 0.8)
      }
    }
    for (; n < N; n++) pos.setXYZ(n, 0, -1e4, 0)
    pos.needsUpdate = true
  })
  return <points ref={ref} geometry={geo} frustumCulled={false} renderOrder={6} userData={{ noBatch: true }}><pointsMaterial color="#f4ffff" size={0.09} transparent opacity={0.85} depthWrite={false} sizeAttenuation /></points>
}

// ---------------- the basin ----------------
export default function Pool() {
  const floor = useMemo(() => floorGeometry(), [])
  const caustic = useMemo(() => floorGeometry(0.006), [])
  const walls = useMemo(() => wallGeometry(), [])
  const mosaic = useMemo(() => mosaicTexture(), [])
  const cTex = useMemo(() => causticTexture(), [])
  const cTex2 = useMemo(() => { const t = causticTexture(); t.repeat.set(0.7, 0.7); return t }, [])
  const tileMat = useMemo(() => new THREE.MeshStandardMaterial({ map: mosaic, vertexColors: true, roughness: 0.5, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.15 }), [mosaic])
  const cMat = useMemo(() => new THREE.MeshBasicMaterial({ map: cTex, color: '#bfffff', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), [cTex])
  const cMat2 = useMemo(() => new THREE.MeshBasicMaterial({ map: cTex2, color: '#9ff0ff', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), [cTex2])
  const coping = useMemo(() => blackMarble('#c9a96a', 3, 1), [])
  const led = useMemo(() => ({
    pink: new THREE.MeshStandardMaterial({ color: NEON.pink, emissive: NEON.pink, emissiveIntensity: 2.4, toneMapped: false }),
    teal: new THREE.MeshStandardMaterial({ color: NEON.teal, emissive: NEON.teal, emissiveIntensity: 2.4, toneMapped: false }),
    purple: new THREE.MeshStandardMaterial({ color: NEON.purple, emissive: NEON.purple, emissiveIntensity: 2.6, toneMapped: false }),
    yellow: nightLit(new THREE.MeshStandardMaterial({ color: NEON.yellow, emissive: NEON.yellow, roughness: 0.4, toneMapped: false }), 2.2, 0.55),
  }), [])
  const chrome = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d8dade', roughness: 0.15, metalness: 1 }), [])
  const ladders = useMemo(() => [CX + 4.2, CX + 6.4].map((x) => ({ x, z: z0 + 0.34 })), [])

  useEffect(() => registerWater({ id: 'villa-pool', x0, x1, z0, z1, surf, deck, rim, ladders }), [ladders])
  useEffect(() => () => { floor.dispose(); caustic.dispose(); walls.dispose() }, [floor, caustic, walls])

  // caustics drift slowly in two directions
  useFrame((st) => {
    const t = st.clock.elapsedTime
    cTex.offset.set((t * 0.018) % 1, (t * 0.011) % 1)
    cTex2.offset.set((-t * 0.013) % 1, (t * 0.017) % 1)
  })

  const ringBoxes = [
    [CX, COPING - 0.04, z0 - rim / 2, W + 2 * rim, 0.08, rim],
    [CX, COPING - 0.04, z1 + rim / 2, W + 2 * rim, 0.08, rim],
    [x0 - rim / 2, COPING - 0.04, CZ, rim, 0.08, D],
    [x1 + rim / 2, COPING - 0.04, CZ, rim, 0.08, D],
  ]
  const ledY = surf - 0.32
  return (
    <group>
      <BasinColliders />
      <mesh geometry={floor} material={tileMat} receiveShadow userData={{ noBatch: true }} />
      <mesh geometry={walls} material={tileMat} receiveShadow userData={{ noBatch: true }} />
      <mesh geometry={caustic} material={cMat} renderOrder={2} userData={{ noBatch: true }} />
      <mesh geometry={caustic} material={cMat2} renderOrder={2} position={[0, 0.002, 0]} userData={{ noBatch: true }} />
      {/* coping: black marble with gold veins, 4 cm proud of the deck, rounded by a light nosing */}
      {ringBoxes.map((b, i) => <mesh key={i} position={[b[0], b[1], b[2]]} material={coping} castShadow receiveShadow><boxGeometry args={[b[3], b[4], b[5]]} /></mesh>)}
      {/* LED strips under the water line: hot pink along the north wall, teal along the south, purple at the ends */}
      <mesh position={[CX, ledY, z0 + 0.04]} material={led.pink} userData={{ noBatch: true }}><boxGeometry args={[W - 0.2, 0.05, 0.04]} /></mesh>
      <mesh position={[CX, ledY, z1 - 0.04]} material={led.teal} userData={{ noBatch: true }}><boxGeometry args={[W - 0.2, 0.05, 0.04]} /></mesh>
      <mesh position={[x1 - 0.04, ledY, CZ]} material={led.purple} userData={{ noBatch: true }}><boxGeometry args={[0.04, 0.05, D - 0.2]} /></mesh>
      {/* yellow step nosings: the entry steps glow gold at night and are visible by day */}
      {Array.from({ length: POOL.nSteps }, (_, i) => (
        <mesh key={i} position={[x0 + POOL.stepW * (i + 1) - 0.03, PROFILE[i * 2][1] + 0.012, CZ]} material={led.yellow} userData={{ noBatch: true }}><boxGeometry args={[0.06, 0.025, D - 0.1]} /></mesh>
      ))}
      {/* depth markers and the steps label on the coping */}
      <BrandSign text="1.0 m" position={[x0 + 3.5, COPING + 0.006, z1 + rim / 2]} rotation={[-Math.PI / 2, 0, 0]} width={1.5} color="#e9d7a4" glow="#c9a96a" size={110} />
      <BrandSign text="2.0 m" position={[x0 + 12.5, COPING + 0.006, z1 + rim / 2]} rotation={[-Math.PI / 2, 0, 0]} width={1.5} color="#e9d7a4" glow="#c9a96a" size={110} />
      <BrandSign text="STEPS" position={[x0 + 0.75, COPING + 0.006, z1 + rim / 2]} rotation={[-Math.PI / 2, 0, 0]} width={1.5} color="#e9d7a4" glow="#c9a96a" size={110} />
      {/* ladders on the north wall at the deep end: chrome rails over the coping, rungs down into the water */}
      {ladders.map((l, i) => {
        const yTop = COPING + 0.9, yBot = surf - 1.0
        return (
          <group key={i} position={[l.x, 0, z0 + 0.08]}>
            {[-0.24, 0.24].map((dx) => (
              <group key={dx}>
                <mesh position={[dx, (yTop + yBot) / 2, 0]} material={chrome} castShadow><cylinderGeometry args={[0.025, 0.025, yTop - yBot, 10]} /></mesh>
                <mesh position={[dx, yTop, -0.24]} rotation={[Math.PI / 2, 0, 0]} material={chrome}><cylinderGeometry args={[0.025, 0.025, 0.48, 10]} /></mesh>
                <mesh position={[dx, yTop - 0.9, -0.48]} material={chrome}><cylinderGeometry args={[0.025, 0.025, 0.9, 10]} /></mesh>
              </group>
            ))}
            {[0.05, -0.25, -0.55, -0.85].map((dy, k) => <mesh key={k} position={[0, surf + dy, 0.03]} rotation={[0, 0, Math.PI / 2]} material={chrome}><cylinderGeometry args={[0.02, 0.02, 0.5, 8]} /></mesh>)}
          </group>
        )
      })}
      <PoolSurface />
      <SplashFoam />
      {/* real light under the water, shared with the world's light pool (night only) */}
      <LightAnchor position={[CX - 4, surf - 0.8, CZ]} color="#2fe6dc" intensity={16} distance={13} night />
      <LightAnchor position={[CX + 4, surf - 1.1, CZ]} color="#b45bff" intensity={16} distance={13} night />
    </group>
  )
}
