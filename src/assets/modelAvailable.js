// Checks that a model file can really be fetched before a loader is mounted for it.
//
// Why: React Three Fiber reports every loader error to the page (via reportError) even when an error
// boundary catches it, so a missing model shows up as a "background error" although the scene recovers.
// Checking first lets a building switch to its fallback cleanly when its model is not hosted, and only a
// real, unexpected failure reaches the error log.
//
// A host that does not have the file often answers with its HTML page instead of a 404, so an HTML
// response counts as "not available" too.
const cache = new Map()

export function modelAvailable(url) {
  if (!url) return Promise.resolve(false)
  if (cache.has(url)) return cache.get(url)
  const check = (async () => {
    const ok = (res) => res.ok && !/text\/html/i.test(res.headers.get('content-type') || '')
    try {
      const head = await fetch(url, { method: 'HEAD', cache: 'force-cache' })
      if (head.status !== 405 && head.status !== 501) return ok(head)
    } catch { /* fall through to a ranged GET */ }
    try {
      const get = await fetch(url, { headers: { range: 'bytes=0-15' }, cache: 'force-cache' })
      if (!ok(get)) return false
      // a real GLB starts with the magic bytes "glTF"
      const buf = new Uint8Array(await get.arrayBuffer())
      return buf.length >= 4 && buf[0] === 0x67 && buf[1] === 0x6c && buf[2] === 0x54 && buf[3] === 0x46
    } catch {
      return false
    }
  })()
  cache.set(url, check)
  return check
}
