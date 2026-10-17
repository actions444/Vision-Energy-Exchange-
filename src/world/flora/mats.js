import * as THREE from 'three'
import { barkMaps, leafletMaps, combMaps, leafClusterMap, grassBladeMap, lawnMaps, mulchMaps } from './tex.js'

// Shared PBR plant materials. Wind and leaf translucency are injected into the standard shader, so every
// plant stays a MeshStandardMaterial (lights, shadows, fog and tone mapping all keep working).

export const windU = { uTime: { value: 0 }, uStrength: { value: 1 } }
let lastT = -1
/** call from any useFrame; the first caller of a frame advances the shared clock */
export function tickWind(t) { if (t !== lastT) { lastT = t; windU.uTime.value = t } }

const WIND_VERT_HEAD = `
attribute float aWind;
attribute float aPhase;
uniform float uTime;
uniform float uStrength;
`
const WIND_VERT = `
#include <begin_vertex>
{
  #ifdef USE_INSTANCING
    mat3 imW = mat3(instanceMatrix);
    vec3 iP = instanceMatrix[3].xyz;
  #else
    mat3 imW = mat3(1.0);
    vec3 iP = vec3(0.0);
  #endif
  float s2 = max(dot(imW[0], imW[0]), 1e-4);
  float ph = iP.x * 0.31 + iP.z * 0.23 + aPhase;
  float gust = sin(uTime * 0.9 + ph) * 0.6 + sin(uTime * 1.7 + ph * 1.9) * 0.4;
  float flut = sin(uTime * 3.1 + aPhase * 6.0 + position.x * 2.3 + position.z * 1.7);
  vec3 off = (gust * 0.5 + 0.28) * vec3(0.86, 0.0, 0.5) + flut * 0.1 * vec3(0.3, 1.0, 0.3);
  transformed += ((off * imW) / s2) * aWind * uStrength;
}
`
const TRANS_FRAG_HEAD = `uniform float uTrans;\n`
const TRANS_FRAG = `
#include <lights_fragment_end>
#if NUM_DIR_LIGHTS > 0
{
  vec3 Vv = normalize(vViewPosition);
  float back = pow(clamp(-dot(directionalLights[0].direction, Vv), 0.0, 1.0), 2.0);
  reflectedLight.directDiffuse += diffuseColor.rgb * directionalLights[0].color * back * uTrans;
}
#endif
`

function inject(mat, { wind = true, trans = 0 } = {}) {
  const uTrans = { value: trans }
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = windU.uTime; sh.uniforms.uStrength = windU.uStrength; sh.uniforms.uTrans = uTrans
    if (wind) {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + WIND_VERT_HEAD).replace('#include <begin_vertex>', WIND_VERT)
    }
    if (trans > 0) {
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + TRANS_FRAG_HEAD).replace('#include <lights_fragment_end>', TRANS_FRAG)
    }
  }
  mat.customProgramCacheKey = () => `flora-${wind ? 'w' : ''}${trans > 0 ? 't' : ''}`
  return mat
}

/** shadow-pass material that sways exactly like the visible plant and respects the alpha cut */
function depthFor(mat) {
  const d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: mat.map, alphaTest: mat.alphaTest || 0, side: THREE.DoubleSide })
  return inject(d, { wind: true })
}

const cache = new Map()
const once = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k) }

export const floraMats = {
  bark: (kind = 'coconut') => once('bark' + kind, () => {
    const b = barkMaps(kind)
    const m = new THREE.MeshStandardMaterial({ map: b.map, normalMap: b.normal, normalScale: new THREE.Vector2(1.1, 1.1), roughness: kind === 'royal' ? 0.82 : 0.95, metalness: 0, vertexColors: true })
    return inject(m, { wind: true })
  }),
  /** geometry leaflets: opaque, so they cast clean shadows */
  leaflet: () => once('leaflet', () => {
    const l = leafletMaps()
    const m = new THREE.MeshStandardMaterial({ map: l.map, normalMap: l.normal, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 0.52, metalness: 0, side: THREE.DoubleSide, vertexColors: true })
    return inject(m, { wind: true, trans: 0.55 })
  }),
  /** alpha-cut frond card for distance LOD */
  comb: () => once('comb', () => {
    const c = combMaps()
    const m = new THREE.MeshStandardMaterial({ map: c.map, alphaTest: 0.45, roughness: 0.6, metalness: 0, side: THREE.DoubleSide, vertexColors: true })
    m.customDepthMaterial = null
    return inject(m, { wind: true, trans: 0.5 })
  }),
  cluster: (kind = 'oak') => once('cluster' + kind, () => {
    const c = leafClusterMap(kind)
    const m = new THREE.MeshStandardMaterial({ map: c.map, alphaTest: 0.42, roughness: 0.62, metalness: 0, side: THREE.DoubleSide, vertexColors: true })
    return inject(m, { wind: true, trans: 0.4 })
  }),
  grass: () => once('grassBlade', () => {
    const c = grassBladeMap()
    const m = new THREE.MeshStandardMaterial({ map: c.map, alphaTest: 0.5, roughness: 0.75, metalness: 0, side: THREE.DoubleSide, vertexColors: true })
    return inject(m, { wind: true, trans: 0.25 })
  }),
  lawn: (rx = 1, ry = 1) => once(`lawn${rx.toFixed(2)}|${ry.toFixed(2)}`, () => {
    const l = lawnMaps()
    const rep = (t) => { const c = t.clone(); c.needsUpdate = true; c.repeat.set(rx, ry); return c }
    return new THREE.MeshStandardMaterial({ map: rep(l.map), normalMap: rep(l.normal), normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.96, metalness: 0 })
  }),
  mulch: (rx = 1, ry = 1) => once(`mulch${rx.toFixed(2)}|${ry.toFixed(2)}`, () => {
    const l = mulchMaps()
    const rep = (t) => { const c = t.clone(); c.needsUpdate = true; c.repeat.set(rx, ry); return c }
    return new THREE.MeshStandardMaterial({ map: rep(l.map), normalMap: rep(l.normal), normalScale: new THREE.Vector2(1, 1), roughness: 1, metalness: 0 })
  }),
  depth: (mat) => once('depth' + mat.uuid, () => depthFor(mat)),
}
