// Brings other 3D formats into the world by converting them to GLB in the browser:
// OBJ (+ MTL and textures), FBX, STL, PLY, Collada (DAE), 3MF, VRML/WRL. glTF/GLB are handled by gltfImport.js.
import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js'
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js'
import { VRMLLoader } from 'three/examples/jsm/loaders/VRMLLoader.js'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

export const MODEL_EXT = ['obj', 'fbx', 'stl', 'ply', 'dae', '3mf', 'wrl', 'vrml']
const base = (p) => decodeURIComponent(String(p).split(/[\\/]/).pop())
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp', tga: 'image/x-tga' }

/** `side` is a Map of sidecar files by base name (MTL, textures). Texture URLs in the model are redirected to them. */
function manager(side) {
  const urls = new Map()
  const m = new THREE.LoadingManager()
  m.setURLModifier((url) => {
    const f = side.get(base(url))
    if (!f) return url
    if (!urls.has(f)) urls.set(f, URL.createObjectURL(new Blob([f], { type: MIME[base(url).split('.').pop().toLowerCase()] || 'application/octet-stream' })))
    return urls.get(f)
  })
  return m
}

const plain = (geometry) => {
  const hasColor = !!geometry.getAttribute('color')
  if (!geometry.getAttribute('normal')) geometry.computeVertexNormals()
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: hasColor ? 0xffffff : 0xb9bcc6, vertexColors: hasColor, roughness: 0.6, metalness: 0.1 }))
}

export async function modelToGLB(file, side = new Map()) {
  const ext = file.name.split('.').pop().toLowerCase()
  const mgr = manager(side)
  let root
  if (ext === 'obj') {
    const loader = new OBJLoader(mgr)
    const mtlName = [...side.keys()].find((k) => k.toLowerCase().endsWith('.mtl'))
    if (mtlName) {
      const mats = new MTLLoader(mgr).parse(new TextDecoder().decode(side.get(mtlName)), '')
      mats.preload()
      loader.setMaterials(mats)
    }
    root = loader.parse(await file.text())
    root.traverse((o) => { if (o.isMesh && !o.material) o.material = new THREE.MeshStandardMaterial({ color: 0xb9bcc6, roughness: 0.6 }) })
  } else if (ext === 'fbx') root = new FBXLoader(mgr).parse(await file.arrayBuffer(), '')
  else if (ext === 'stl') root = plain(new STLLoader().parse(await file.arrayBuffer()))
  else if (ext === 'ply') root = plain(new PLYLoader().parse(await file.arrayBuffer()))
  else if (ext === 'dae') root = new ColladaLoader(mgr).parse(await file.text(), '').scene
  else if (ext === '3mf') root = new ThreeMFLoader(mgr).parse(await file.arrayBuffer())
  else if (ext === 'wrl' || ext === 'vrml') root = new VRMLLoader(mgr).parse(await file.text(), '')
  else throw new Error('Unsupported 3D format .' + ext)
  // STL/3MF/PLY are often Z-up in millimetres: the world normalises size on import, so only orientation matters here
  if (ext === 'stl' || ext === 'ply' || ext === '3mf') root.rotation.x = -Math.PI / 2
  const scene = new THREE.Scene()
  scene.add(root)
  scene.updateMatrixWorld(true)
  const bytes = await new GLTFExporter().parseAsync(scene, { binary: true, onlyVisible: false, maxTextureSize: 2048 })
  if (!(bytes instanceof ArrayBuffer)) throw new Error('Could not convert the model')
  return bytes
}
