// Minimal IndexedDB wrapper. Every call can reject (private windows, blocked storage);
// callers treat persistence as optional.
let dbp
function open() {
  if (dbp) return dbp
  dbp = new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open('vision-storms-world', 2)
      req.onupgradeneeded = () => {
        const db = req.result
        for (const name of ['files', 'meta', 'music']) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    } catch (e) {
      reject(e)
    }
  })
  return dbp
}

function tx(store, mode, fn) {
  return open().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode)
    const req = fn(t.objectStore(store))
    t.oncomplete = () => resolve(req?.result)
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error)
  }))
}

export const put = (store, key, val) => tx(store, 'readwrite', (s) => s.put(val, key))
export const get = (store, key) => tx(store, 'readonly', (s) => s.get(key))
export const del = (store, key) => tx(store, 'readwrite', (s) => s.delete(key))
export const all = (store) => tx(store, 'readonly', (s) => s.getAll())
