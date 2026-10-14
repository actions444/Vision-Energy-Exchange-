// Asset library + world layout.
// - `library`: imported models (metadata in React state, parsed THREE objects in `registry`)
// - `placed`: instances of library models placed in the world, with transform and collider type
// - `avatar`: which library model (if any) replaces the default avatar
// Imported files and the layout are saved in this browser (IndexedDB) so they survive reloads.
// A shipped layout can also be loaded from public/assets/manifest.json (see README).
import { create } from 'zustand'
import { parseGLB, analyse, filesToGLBs } from './gltfImport.js'
import * as db from './idb.js'

export const registry = new Map() // id -> { scene, animations, offset, size, ... }

export const KINDS = {
  building: { label: 'Building', height: 14 },
  venue: { label: 'Venue / theater', height: 10 },
  furniture: { label: 'Furniture', height: 0.9 },
  prop: { label: 'Prop', height: 1.2 },
  character: { label: 'Character', height: 1.8 },
}

const uid = () => Math.random().toString(36).slice(2, 10)

async function register(id, name, kind, bytes, source) {
  const gltf = await parseGLB(bytes)
  const info = analyse(gltf)
  registry.set(id, info)
  return { id, name, kind, tris: info.tris, size: info.size, animations: info.animations.map((a) => a.name), skinned: info.skinned, source, bytes: bytes.byteLength }
}

let saveTimer
function scheduleSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const { placed, avatar } = useAssets.getState()
    db.put('meta', 'layout', { placed: placed.filter((p) => !p.fromManifest), avatar }).catch(() => {})
  }, 300)
}

export const useAssets = create((set, get) => ({
  library: [],
  placed: [],
  avatar: null, // { assetId, facing: 0 | 180 }
  selected: null, // placed instance id
  busy: null,
  error: null,
  persistent: true,

  async importFiles(fileList, kind = 'building') {
    set({ busy: 'Reading files…', error: null })
    try {
      const glbs = await filesToGLBs(fileList)
      const added = []
      for (const { name, bytes } of glbs) {
        set({ busy: `Building ${name}…` })
        const id = uid()
        const item = await register(id, name, kind, bytes, 'import')
        added.push(item)
        db.put('files', id, { id, name, kind, bytes }).catch(() => set({ persistent: false }))
      }
      set((s) => ({ library: [...s.library, ...added], busy: null }))
      return added
    } catch (e) {
      console.error(e)
      set({ busy: null, error: e.message || String(e) })
      return []
    }
  },

  setKind(id, kind) {
    set((s) => ({ library: s.library.map((a) => (a.id === id ? { ...a, kind } : a)) }))
    db.get('files', id).then((rec) => rec && db.put('files', id, { ...rec, kind })).catch(() => {})
  },

  removeAsset(id) {
    registry.delete(id)
    set((s) => ({
      library: s.library.filter((a) => a.id !== id),
      placed: s.placed.filter((p) => p.assetId !== id),
      avatar: s.avatar?.assetId === id ? null : s.avatar,
    }))
    db.del('files', id).catch(() => {})
    scheduleSave()
  },

  /** Place an asset at a world position, scaled to the default height for its kind. */
  place(assetId, position, rotationY = 0) {
    const asset = get().library.find((a) => a.id === assetId)
    if (!asset) return
    const h = asset.size[1] || 1
    const scale = +(KINDS[asset.kind]?.height / h || 1).toFixed(4)
    const inst = {
      iid: uid(),
      assetId,
      position: position.map((v) => +v.toFixed(2)),
      rotationY,
      scale,
      collider: asset.kind === 'building' || asset.kind === 'venue' ? 'trimesh' : 'box',
    }
    set((s) => ({ placed: [...s.placed, inst], selected: inst.iid }))
    scheduleSave()
    return inst
  },

  updatePlaced(iid, patch) {
    set((s) => ({ placed: s.placed.map((p) => (p.iid === iid ? { ...p, ...patch } : p)) }))
    scheduleSave()
  },
  removePlaced(iid) {
    set((s) => ({ placed: s.placed.filter((p) => p.iid !== iid), selected: s.selected === iid ? null : s.selected }))
    scheduleSave()
  },
  select(iid) { set({ selected: iid }) },

  setAvatar(assetId, facing = 0) {
    set({ avatar: assetId ? { assetId, facing } : null })
    scheduleSave()
  },

  exportLayout() {
    const { library, placed, avatar } = get()
    return {
      version: 1,
      assets: library.map((a) => ({ id: a.id, name: a.name, kind: a.kind, file: `assets/${a.name}.glb` })),
      placements: placed.map(({ iid, fromManifest, ...p }) => p),
      avatar,
    }
  },

  /** Restore saved imports + layout from this browser, then merge any shipped manifest. */
  async restore() {
    const library = []
    try {
      const recs = await db.all('files')
      for (const r of recs) {
        try { library.push(await register(r.id, r.name, r.kind, r.bytes, 'import')) } catch (e) { console.warn('Skipping saved asset', r.name, e) }
      }
      const layout = await db.get('meta', 'layout')
      const ids = new Set(library.map((a) => a.id))
      set({
        library,
        placed: (layout?.placed || []).filter((p) => ids.has(p.assetId)),
        avatar: layout?.avatar && ids.has(layout.avatar.assetId) ? layout.avatar : null,
      })
    } catch {
      set({ persistent: false })
    }
    await loadManifest()
  },
}))

// public/assets/manifest.json lets you ship assets with the site itself.
async function loadManifest() {
  let manifest
  try {
    const res = await fetch('assets/manifest.json', { cache: 'no-cache' })
    if (!res.ok) return
    manifest = await res.json()
  } catch {
    return
  }
  const st = useAssets.getState()
  const known = new Set(st.library.map((a) => a.id))
  const added = []
  for (const a of manifest.assets || []) {
    if (known.has(a.id)) continue
    try {
      const res = await fetch(a.file)
      if (!res.ok) throw new Error(res.status)
      added.push(await register(a.id, a.name, a.kind || 'prop', await res.arrayBuffer(), 'manifest'))
    } catch (e) {
      console.warn('Manifest asset failed to load:', a.file, e)
    }
  }
  const ids = new Set([...known, ...added.map((a) => a.id)])
  useAssets.setState((s) => ({
    library: [...s.library, ...added],
    placed: [...s.placed, ...(manifest.placements || []).filter((p) => ids.has(p.assetId)).map((p) => ({ ...p, iid: uid(), fromManifest: true }))],
    avatar: s.avatar || (manifest.avatar && ids.has(manifest.avatar.assetId) ? manifest.avatar : null),
  }))
}
