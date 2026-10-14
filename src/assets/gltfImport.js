// GLB / GLTF import pipeline for Tripo 3D and Meshy AI exports (and any other glTF 2.0 file).
//
// - .glb files are parsed directly from bytes.
// - .gltf files are packed into a single GLB in memory, together with any .bin and texture
//   files selected alongside them (or embedded as data: URIs). Packing means nothing is fetched
//   over the network, which keeps imports working inside sandboxed pages.
// - Draco- and Meshopt-compressed meshes are supported with decoders bundled into the app.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import dracoDecoderSource from 'three/examples/jsm/libs/draco/gltf/draco_decoder.js?raw'

// DRACOLoader normally downloads its decoder; serve the bundled JS decoder from memory instead.
class BundledDracoLoader extends DRACOLoader {
  constructor() {
    super()
    this.setDecoderConfig({ type: 'js' })
  }
  _loadLibrary(url) {
    if (url === 'draco_decoder.js') return Promise.resolve(dracoDecoderSource)
    return Promise.reject(new Error('Draco library not bundled: ' + url))
  }
}

let loader
function getLoader() {
  if (loader) return loader
  loader = new GLTFLoader()
  loader.setDRACOLoader(new BundledDracoLoader())
  loader.setMeshoptDecoder(MeshoptDecoder)
  // Decode embedded textures through <img> + blob: URLs rather than fetch(), which some
  // sandboxed hosts block.
  loader.register((parser) => {
    parser.textureLoader = new THREE.TextureLoader(parser.options.manager)
    return { name: 'vsw_image_textures' }
  })
  return loader
}

export function parseGLB(arrayBuffer) {
  return new Promise((resolve, reject) => {
    try {
      getLoader().parse(arrayBuffer, '', resolve, (err) => reject(err instanceof Error ? err : new Error(String(err?.message || err))))
    } catch (e) {
      reject(e)
    }
  })
}

// ---------- .gltf -> .glb packing ----------
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', ktx2: 'image/ktx2' }
const base = (p) => decodeURIComponent(p.split(/[\\/]/).pop())

function dataUriToBytes(uri) {
  const comma = uri.indexOf(',')
  const meta = uri.slice(5, comma)
  const data = uri.slice(comma + 1)
  if (meta.endsWith(';base64')) {
    const bin = atob(data)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return { bytes: out, mime: meta.replace(';base64', '') }
  }
  return { bytes: new TextEncoder().encode(decodeURIComponent(data)), mime: meta }
}

/**
 * @param {string} jsonText contents of the .gltf
 * @param {Map<string, ArrayBuffer>} files sidecar files by base filename
 * @returns {ArrayBuffer} a GLB
 */
export function packGLTF(jsonText, files) {
  const json = JSON.parse(jsonText)
  const missing = []
  const resolveUri = (uri) => {
    if (uri.startsWith('data:')) return dataUriToBytes(uri)
    const buf = files.get(base(uri))
    if (!buf) { missing.push(base(uri)); return null }
    const ext = base(uri).split('.').pop().toLowerCase()
    return { bytes: new Uint8Array(buf), mime: MIME[ext] }
  }

  // Concatenate every buffer into one BIN chunk, 4-byte aligned.
  const chunks = []
  let offset = 0
  const bufferOffsets = []
  for (const b of json.buffers || []) {
    const res = b.uri ? resolveUri(b.uri) : null
    const bytes = res ? res.bytes : new Uint8Array(b.byteLength)
    bufferOffsets.push(offset)
    chunks.push(bytes)
    offset += bytes.byteLength
    const pad = (4 - (offset % 4)) % 4
    if (pad) { chunks.push(new Uint8Array(pad)); offset += pad }
  }
  for (const bv of json.bufferViews || []) {
    bv.byteOffset = (bv.byteOffset || 0) + bufferOffsets[bv.buffer]
    bv.buffer = 0
  }
  // Move external / data-URI images into bufferViews.
  json.bufferViews = json.bufferViews || []
  for (const img of json.images || []) {
    if (!img.uri) continue
    const res = resolveUri(img.uri)
    if (!res) continue
    json.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: res.bytes.byteLength })
    img.bufferView = json.bufferViews.length - 1
    img.mimeType = img.mimeType || res.mime || 'image/png'
    delete img.uri
    chunks.push(res.bytes)
    offset += res.bytes.byteLength
    const pad = (4 - (offset % 4)) % 4
    if (pad) { chunks.push(new Uint8Array(pad)); offset += pad }
  }
  if (missing.length) {
    throw new Error('This .gltf needs these files too: ' + [...new Set(missing)].join(', ') + '. Select them together with the .gltf, or export as .glb.')
  }
  json.buffers = offset > 0 ? [{ byteLength: offset }] : []

  let jsonBytes = new TextEncoder().encode(JSON.stringify(json))
  const jsonPad = (4 - (jsonBytes.byteLength % 4)) % 4
  if (jsonPad) {
    const padded = new Uint8Array(jsonBytes.byteLength + jsonPad).fill(0x20)
    padded.set(jsonBytes)
    jsonBytes = padded
  }
  const total = 12 + 8 + jsonBytes.byteLength + (offset > 0 ? 8 + offset : 0)
  const out = new ArrayBuffer(total)
  const dv = new DataView(out)
  const u8 = new Uint8Array(out)
  dv.setUint32(0, 0x46546c67, true) // 'glTF'
  dv.setUint32(4, 2, true)
  dv.setUint32(8, total, true)
  dv.setUint32(12, jsonBytes.byteLength, true)
  dv.setUint32(16, 0x4e4f534a, true) // 'JSON'
  u8.set(jsonBytes, 20)
  if (offset > 0) {
    let p = 20 + jsonBytes.byteLength
    dv.setUint32(p, offset, true)
    dv.setUint32(p + 4, 0x004e4942, true) // 'BIN\0'
    p += 8
    for (const c of chunks) { u8.set(c, p); p += c.byteLength }
  }
  return out
}

/**
 * Turn a user's file selection into one or more GLB byte buffers.
 * @param {File[]} fileList
 * @returns {Promise<{ name: string, bytes: ArrayBuffer }[]>}
 */
export async function filesToGLBs(fileList) {
  const files = [...fileList]
  const out = []
  const side = new Map()
  for (const f of files) {
    const ext = f.name.split('.').pop().toLowerCase()
    if (ext !== 'glb' && ext !== 'gltf') side.set(f.name, await f.arrayBuffer())
  }
  for (const f of files) {
    const ext = f.name.split('.').pop().toLowerCase()
    const name = f.name.replace(/\.(glb|gltf)$/i, '')
    if (ext === 'glb') out.push({ name, bytes: await f.arrayBuffer() })
    if (ext === 'gltf') out.push({ name, bytes: packGLTF(await f.text(), side) })
  }
  if (!out.length) throw new Error('Choose a .glb or .gltf file. Tripo 3D and Meshy AI can both export GLB.')
  return out
}

/** Prepare a parsed glTF for the world: shadows, stats, normalised bounds. */
export function analyse(gltf) {
  const scene = gltf.scene || gltf.scenes?.[0]
  let tris = 0
  let skinned = false
  scene.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true
      o.receiveShadow = true
      const geo = o.geometry
      tris += geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3
      if (o.isSkinnedMesh) skinned = true
      // keep huge AI-generated textures from looking blurry at angles
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      for (const m of mats) {
        if (m?.map) m.map.anisotropy = 4
      }
    }
  })
  scene.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(scene)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  return {
    scene,
    animations: gltf.animations || [],
    tris: Math.round(tris),
    skinned,
    size: size.toArray(),
    // offset that puts the model's base at y=0 and centres it on x/z
    offset: [-center.x, -box.min.y, -center.z],
  }
}
