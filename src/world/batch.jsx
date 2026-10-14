import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Static batching: once its children have mounted (and physics has placed them), merges every
// static mesh that shares a material into a single mesh. Hundreds of benches, lamps, chairs and
// wall pieces become a few dozen draw calls, which matters most on phones.
// Mark anything that moves or changes with userData={{ noBatch: true }} on it or a parent.
export function StaticBatch({ children, name = 'batch' }) {
  const ref = useRef()
  useEffect(() => {
    let raf1, raf2, built = []
    const build = () => {
      const root = ref.current
      if (!root) return
      root.updateWorldMatrix(true, true)
      const inv = new THREE.Matrix4().copy(root.matrixWorld).invert()
      const groups = new Map()
      const visit = (o) => {
        if (o.userData.noBatch || o.userData.batched) return
        const base = o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && o.visible && o.geometry?.index && o.geometry.attributes.uv && o.geometry.attributes.normal
        const add = (material, geometry) => {
          if (material.transparent) return false
          const key = `${material.uuid}|${o.castShadow}|${o.receiveShadow}`
          if (!groups.has(key)) groups.set(key, { material, cast: o.castShadow, receive: o.receiveShadow, items: [] })
          groups.get(key).items.push({ mesh: o, geometry })
          return true
        }
        if (base && !Array.isArray(o.material)) add(o.material, o.geometry)
        else if (base && o.geometry.groups.length) {
          // multi-material mesh (e.g. a wall with stone outside, plaster inside): split by group
          const idx = o.geometry.index.array
          let all = true
          for (const g of o.geometry.groups) {
            const mat = o.material[g.materialIndex]
            if (!mat || mat.transparent) { all = false; continue }
            const sub = o.geometry.clone()
            sub.setIndex(Array.from(idx.slice(g.start, g.start + g.count)))
            sub.clearGroups()
            add(mat, sub)
          }
          if (!all) o.userData.keepVisible = true
        }
        for (const c of o.children) visit(c)
      }
      visit(root)
      const hidden = new Set()
      for (const g of groups.values()) {
        const geos = g.items.map(({ mesh, geometry }) => {
          const geo = geometry.clone()
          for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k)
          geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, mesh.matrixWorld))
          return geo
        })
        let merged
        try { merged = mergeGeometries(geos, false) } catch { merged = null }
        geos.forEach((x) => x.dispose())
        if (!merged) continue
        merged.computeBoundingSphere()
        const mesh = new THREE.Mesh(merged, g.material)
        mesh.castShadow = g.cast
        mesh.receiveShadow = g.receive
        mesh.userData.batched = true
        mesh.name = name
        root.add(mesh)
        built.push(mesh)
        g.items.forEach(({ mesh }) => hidden.add(mesh))
      }
      hidden.forEach((m) => { if (!m.userData.keepVisible) { m.visible = false; m.userData.batched = true } })
    }
    // wait two frames so rigid bodies have written their transforms
    raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(build) })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      built.forEach((m) => { m.removeFromParent(); m.geometry.dispose() })
      built = []
    }
  }, [])
  return <group ref={ref}>{children}</group>
}
