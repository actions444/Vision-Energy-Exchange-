// Where Vision Storms World keeps shared, persistent data (media catalog, music playlists,
// screenings, 3D model placements) and uploaded files. Three interchangeable backends:
//
//  'hosted' - the Claude-hosted page: `db` (documents), `assets` (files) and `user` (who is
//             viewing). Only the artifact's owner/editors get upload and write access; the
//             platform enforces it, visitors just read.
//  'server' - the Node server in /server (self-hosting): REST + file storage on disk, owner token.
//  'local'  - development only: this browser's IndexedDB. Never offered to visitors.
//
// Every backend implements the same small interface:
//   docs:  sub(collection, cb) / subDoc(path, cb) / set(path, data) / del(path)
//   files: upload(blob, contentType) -> { ref, url, size } / remove(ref) / url(ref)
import { create } from 'zustand'
import * as idb from '../assets/idb.js'

export const useBackend = create(() => ({
  kind: 'detecting', // 'detecting' | 'hosted' | 'server' | 'local' | 'none'
  admin: false, // may upload and change shared content
  owner: false,
  canWriteFiles: false,
  usage: null, // { files, bytes, maxFiles, maxBytes }
  maxFileBytes: 20 * 1024 * 1024,
  serverUrl: '',
  error: null,
}))

let impl = null
export const backend = () => impl

// ---------------- hosted page (Claude artifact capabilities) ----------------
async function hosted() {
  const c = window.claude
  if (!c?.use) return null
  const [db, user] = await Promise.all([c.use('db'), c.use('user')])
  if (!db) return null
  const assets = await c.use('assets')
  const canEdit = (await user?.canEdit()) ?? false
  const isOwner = (await user?.isOwner()) ?? false
  const subs = new Set()
  const api = {
    kind: 'hosted',
    sub(collection, cb) {
      const un = db.collection(collection).onSnapshot((snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), (e) => console.warn('db', collection, e.code))
      subs.add(un)
      return un
    },
    subDoc(path, cb) {
      const un = db.doc(path).onSnapshot((d) => cb(d.exists ? d.data() : null), (e) => console.warn('db', path, e.code))
      subs.add(un)
      return un
    },
    async getDoc(path) { const d = await db.doc(path).get(); return d.exists ? d.data() : null },
    set: (path, data) => db.doc(path).set(JSON.parse(JSON.stringify(data))),
    del: (path) => db.doc(path).delete(),
    async upload(blob, contentType) {
      if (!assets) throw new Error('Only the owner can upload.')
      try {
        const r = await assets.upload(blob, { type: contentType })
        return { ref: r.id, url: r.url, size: r.sizeBytes }
      } catch (e) {
        const msg = {
          too_large: 'That file is over the 20 MB limit for files stored with the hosted page.',
          unsupported_type: 'That file type cannot be stored here.',
          quota_or_state: 'The page is out of storage space. Delete files you no longer need.',
          rate_limited: 'Uploading too quickly. Wait a moment and try again.',
        }[e?.code]
        throw new Error(msg || e?.message || 'Upload failed.')
      }
    },
    async remove(ref) { if (assets) await assets.delete(ref) },
    url: (ref) => (ref ? '/_blob/' + ref : null),
    async usage() { if (!assets) return null; try { return (await assets.list()).usage } catch { return null } },
  }
  useBackend.setState({ kind: 'hosted', admin: canEdit && !!assets, owner: isOwner, canWriteFiles: !!assets, maxFileBytes: 20 * 1024 * 1024 })
  return api
}

// ---------------- self-hosted Node server ----------------
export function serverApi(base, token) {
  const b = base.replace(/\/$/, '')
  const req = async (method, path, body, headers = {}) => {
    const res = await fetch(b + path, {
      method,
      headers: { ...(token ? { authorization: 'Bearer ' + token } : {}), ...(body && !(body instanceof Blob) ? { 'content-type': 'application/json' } : {}), ...headers },
      body: body instanceof Blob ? body : body ? JSON.stringify(body) : undefined,
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || `Request failed (${res.status}).`)
    return json
  }
  const polls = new Set()
  const poll = (fn, ms = 8000) => { fn(); const t = setInterval(fn, ms); polls.add(t); return () => { clearInterval(t); polls.delete(t) } }
  const kick = new Set() // refresh subscribers after our own writes
  return {
    kind: 'server',
    sub(collection, cb) {
      const run = () => req('GET', `/api/store/${collection}`).then((r) => cb(r.docs)).catch(() => {})
      kick.add(run)
      const stop = poll(run)
      return () => { stop(); kick.delete(run) }
    },
    subDoc(path, cb) {
      const run = () => req('GET', `/api/store/${path}`).then((r) => cb(r.doc)).catch(() => {})
      kick.add(run)
      const stop = poll(run, path.startsWith('screenings') || path.startsWith('live') ? 2500 : 8000)
      return () => { stop(); kick.delete(run) }
    },
    async getDoc(path) { return (await req('GET', `/api/store/${path}`)).doc },
    async set(path, data, headers) { await req('PUT', `/api/store/${path}`, data, headers); kick.forEach((f) => f()) },
    async del(path) { await req('DELETE', `/api/store/${path}`); kick.forEach((f) => f()) },
    async upload(blob, contentType) {
      const r = await req('POST', '/api/admin/files', blob, { 'content-type': contentType })
      return { ref: r.ref, url: b + '/files/' + r.ref, size: r.size }
    },
    async remove(ref) { await req('DELETE', `/api/admin/files/${ref}`) },
    url: (ref) => (ref ? b + '/files/' + ref : null),
    async usage() { try { return (await req('GET', '/api/admin/usage')).usage } catch { return null } },
    async whoami() { try { return (await req('GET', '/api/admin/whoami')).admin === true } catch { return false } },
  }
}

// ---------------- development: this browser only ----------------
function local() {
  const listeners = new Map()
  const notify = (collection) => (listeners.get(collection) || []).forEach((f) => f())
  const urls = new Map()
  const all = async (collection) => {
    const docs = (await idb.get('meta', 'store:' + collection).catch(() => null)) || {}
    return Object.entries(docs).map(([id, d]) => ({ id, ...d }))
  }
  const split = (path) => { const i = path.lastIndexOf('/'); return [path.slice(0, i), path.slice(i + 1)] }
  return {
    kind: 'local',
    sub(collection, cb) {
      const run = () => all(collection).then(cb)
      listeners.set(collection, [...(listeners.get(collection) || []), run])
      run()
      return () => listeners.set(collection, (listeners.get(collection) || []).filter((f) => f !== run))
    },
    subDoc(path, cb) {
      const [c, id] = split(path)
      const run = () => all(c).then((docs) => { const d = docs.find((x) => x.id === id); cb(d ? (({ id: _, ...rest }) => rest)(d) : null) })
      listeners.set(c, [...(listeners.get(c) || []), run])
      run()
      return () => listeners.set(c, (listeners.get(c) || []).filter((f) => f !== run))
    },
    async getDoc(path) { const [c, id] = split(path); const d = (await all(c)).find((x) => x.id === id); return d || null },
    async set(path, data) {
      const [c, id] = split(path)
      const docs = (await idb.get('meta', 'store:' + c).catch(() => null)) || {}
      docs[id] = JSON.parse(JSON.stringify(data))
      await idb.put('meta', 'store:' + c, docs)
      notify(c)
    },
    async del(path) {
      const [c, id] = split(path)
      const docs = (await idb.get('meta', 'store:' + c).catch(() => null)) || {}
      delete docs[id]
      await idb.put('meta', 'store:' + c, docs)
      notify(c)
    },
    async upload(blob, contentType) {
      const ref = 'f' + Math.random().toString(36).slice(2, 12)
      await idb.put('music', 'file:' + ref, new Blob([blob], { type: contentType }))
      return { ref, url: URL.createObjectURL(blob), size: blob.size }
    },
    async remove(ref) { await idb.del('music', 'file:' + ref) },
    url(ref) { return ref ? urls.get(ref) || null : null },
    async resolveUrl(ref) {
      if (urls.has(ref)) return urls.get(ref)
      const blob = await idb.get('music', 'file:' + ref)
      if (!blob) return null
      const u = URL.createObjectURL(blob)
      urls.set(ref, u)
      return u
    },
    async usage() { return null },
  }
}

const read = (k) => { try { return localStorage.getItem(k) || '' } catch { return '' } }

/** Figure out which backend this page has. Safe to call once at startup. */
export async function detectBackend() {
  try {
    const h = await hosted()
    if (h) { impl = h; return impl }
  } catch (e) { console.warn('hosted backend unavailable', e) }
  // self-hosted: same-origin server, or the address the owner saved
  const candidates = [read('vsw-server-url'), location.protocol.startsWith('http') ? location.origin : ''].filter(Boolean)
  for (const base of candidates) {
    try {
      const r = await fetch(base.replace(/\/$/, '') + '/health', { cache: 'no-store' })
      if (!r.ok) continue
      const j = await r.json()
      if (!j.ok) continue
      const token = read('vsw-owner-token')
      impl = serverApi(base, token)
      const admin = token ? await impl.whoami() : false
      useBackend.setState({ kind: 'server', admin, owner: admin, canWriteFiles: admin, serverUrl: base, maxFileBytes: 2 * 1024 * 1024 * 1024 })
      return impl
    } catch { /* not this one */ }
  }
  if (import.meta.env.DEV) {
    impl = local()
    useBackend.setState({ kind: 'local', admin: true, owner: true, canWriteFiles: true, maxFileBytes: 200 * 1024 * 1024 })
    return impl
  }
  useBackend.setState({ kind: 'none', admin: false })
  return null
}

/** Owner signs in to a self-hosted server with their token. */
export async function ownerSignIn(url, token) {
  const api = serverApi(url, token)
  const ok = await api.whoami()
  if (!ok) throw new Error('That owner token was not accepted by the server.')
  try { localStorage.setItem('vsw-server-url', url); localStorage.setItem('vsw-owner-token', token) } catch {}
  impl = api
  useBackend.setState({ kind: 'server', admin: true, owner: true, canWriteFiles: true, serverUrl: url })
  return true
}
