// Shared content store for a self-hosted Vision Storms World:
//   - documents (media catalog, music setup, screenings, model placements) in data/store.json
//   - uploaded files (songs, covers, videos, movies, audiobooks, e-books, 3D models) in data/files/
// Anyone may read published content; only the owner (ADMIN_TOKEN) may write, upload or delete.
// `drafts` is owner-only for reading too. Files are served with HTTP range support so long
// videos and audio stream and seek.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const SEG = /^[A-Za-z0-9_.:-]{1,80}$/
const PRIVATE = new Set(['drafts', 'audit'])
const TYPES = new Set([
  'audio/mpeg', 'audio/mp4', 'audio/aac', 'video/mp4', 'video/webm', 'video/quicktime',
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain', 'text/markdown',
  'model/gltf-binary', 'application/octet-stream', 'application/json',
])

export function createStoreApi({ dataDir, isAdmin, maxUpload = Number(process.env.MAX_UPLOAD_BYTES || 2 * 1024 ** 3), maxStorage = Number(process.env.MAX_STORAGE_BYTES || 50 * 1024 ** 3) }) {
  const FILE = path.join(dataDir, 'store.json')
  const FILES = path.join(dataDir, 'files')
  fs.mkdirSync(FILES, { recursive: true })
  let docs = {}
  try { docs = JSON.parse(fs.readFileSync(FILE, 'utf8')) } catch {}
  let saving = null
  const save = () => {
    clearTimeout(saving)
    saving = setTimeout(() => {
      const tmp = FILE + '.tmp'
      fs.writeFileSync(tmp, JSON.stringify(docs))
      fs.renameSync(tmp, FILE)
    }, 50)
  }
  const usage = () => {
    let bytes = 0, files = 0
    for (const f of fs.readdirSync(FILES)) if (!f.endsWith('.json')) { files++; bytes += fs.statSync(path.join(FILES, f)).size }
    return { files, bytes, maxFiles: 100000, maxBytes: maxStorage }
  }

  const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)) }
  const readBody = async (req, limit) => {
    let raw = ''
    for await (const c of req) { raw += c; if (raw.length > limit) throw Object.assign(new Error('too large'), { code: 413 }) }
    return raw
  }

  /** @returns {Promise<boolean>} true when the request was handled */
  return async function handle(req, res, url) {
    const p = url.pathname
    // ---- files ----
    if (req.method === 'GET' && p.startsWith('/files/')) {
      const ref = p.slice(7)
      if (!/^[a-z0-9]{8,40}$/.test(ref)) return json(res, 404, { error: 'Not found.' }), true
      const file = path.join(FILES, ref)
      let meta
      try { meta = JSON.parse(fs.readFileSync(file + '.json', 'utf8')) } catch { return json(res, 404, { error: 'Not found.' }), true }
      const size = fs.statSync(file).size
      const headers = { 'content-type': meta.type, 'accept-ranges': 'bytes', 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'; sandbox" }
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '')
      if (range && (range[1] || range[2])) {
        let start = range[1] ? +range[1] : size - +range[2]
        let end = range[1] && range[2] ? Math.min(+range[2], size - 1) : size - 1
        if (start < 0) start = 0
        if (start >= size || start > end) { res.writeHead(416, { 'content-range': `bytes */${size}` }); return res.end(), true }
        res.writeHead(206, { ...headers, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1 })
        fs.createReadStream(file, { start, end }).pipe(res)
        return true
      }
      res.writeHead(200, { ...headers, 'content-length': size })
      fs.createReadStream(file).pipe(res)
      return true
    }
    // only our own routes: the rentals API also lives under /api/admin/
    if (!p.startsWith('/api/store') && !/^\/api\/admin\/(files|usage|whoami)(\/|$)/.test(p)) return false
    const admin = isAdmin(req)

    try {
      if (req.method === 'GET' && p === '/api/admin/whoami') return json(res, 200, { admin }), true
      if (req.method === 'GET' && p === '/api/admin/usage') {
        if (!admin) return json(res, 401, { error: 'Owner sign-in required.' }), true
        return json(res, 200, { usage: usage() }), true
      }
      if (req.method === 'POST' && p === '/api/admin/files') {
        if (!admin) return json(res, 401, { error: 'Owner sign-in required.' }), true
        const type = String(req.headers['content-type'] || '').split(';')[0].trim()
        if (!TYPES.has(type)) return json(res, 415, { error: `Files of type ${type || 'unknown'} can't be stored.` }), true
        const declared = Number(req.headers['content-length'] || 0)
        if (declared > maxUpload) return json(res, 413, { error: `That file is over the ${Math.round(maxUpload / 1048576)} MB upload limit.` }), true
        const u = usage()
        if (u.bytes + declared > maxStorage) return json(res, 507, { error: 'The server is out of storage space for uploads.' }), true
        const ref = crypto.randomBytes(12).toString('hex')
        const file = path.join(FILES, ref)
        const out = fs.createWriteStream(file)
        let size = 0
        try {
          for await (const chunk of req) {
            size += chunk.length
            if (size > maxUpload) throw Object.assign(new Error('too large'), { code: 413 })
            if (!out.write(chunk)) await new Promise((r) => out.once('drain', r))
          }
          await new Promise((r, j) => out.end((e) => (e ? j(e) : r())))
        } catch (e) {
          out.destroy()
          fs.rmSync(file, { force: true })
          return json(res, e.code === 413 ? 413 : 500, { error: e.code === 413 ? 'That file is too large.' : 'Upload failed.' }), true
        }
        if (!size) { fs.rmSync(file, { force: true }); return json(res, 400, { error: 'The file is empty.' }), true }
        fs.writeFileSync(file + '.json', JSON.stringify({ type, size, at: new Date().toISOString() }))
        return json(res, 201, { ref, size, type }), true
      }
      const fm = /^\/api\/admin\/files\/([a-z0-9]{8,40})$/.exec(p)
      if (req.method === 'DELETE' && fm) {
        if (!admin) return json(res, 401, { error: 'Owner sign-in required.' }), true
        fs.rmSync(path.join(FILES, fm[1]), { force: true })
        fs.rmSync(path.join(FILES, fm[1]) + '.json', { force: true })
        return json(res, 200, { ok: true }), true
      }

      // ---- documents: /api/store/<collection> and /api/store/<collection>/<id> ----
      const parts = p.replace(/^\/api\/store\/?/, '').split('/').filter(Boolean)
      if (!parts.length || parts.length > 2 || !parts.every((s) => SEG.test(s))) return json(res, 404, { error: 'Not found.' }), true
      const [col, id] = parts
      if (PRIVATE.has(col) && !admin) return json(res, 401, { error: 'Owner sign-in required.' }), true
      if (req.method === 'GET') {
        if (!id) return json(res, 200, { docs: Object.entries(docs[col] || {}).map(([k, v]) => ({ id: k, ...v })) }), true
        return json(res, 200, { doc: docs[col]?.[id] ?? null }), true
      }
      if (!id) return json(res, 405, { error: 'Write a single document.' }), true
      if (!admin) return json(res, 401, { error: 'Owner sign-in required.' }), true
      if (req.method === 'PUT') {
        const raw = await readBody(req, 256 * 1024)
        let data
        try { data = JSON.parse(raw) } catch { return json(res, 400, { error: 'Send JSON.' }), true }
        if (!data || typeof data !== 'object' || Array.isArray(data)) return json(res, 400, { error: 'A document is a JSON object.' }), true
        ;(docs[col] ||= {})[id] = data
        save()
        return json(res, 200, { ok: true }), true
      }
      if (req.method === 'DELETE') {
        if (docs[col]) delete docs[col][id]
        save()
        return json(res, 200, { ok: true }), true
      }
      return json(res, 405, { error: 'Method not allowed.' }), true
    } catch (e) {
      return json(res, e.code === 413 ? 413 : 500, { error: e.code === 413 ? 'Too large.' : 'Server error.' }), true
    }
  }
}
