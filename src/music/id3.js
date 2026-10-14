// Minimal ID3v2.3 / v2.4 reader: title, artist, album and the embedded cover picture.
function readText(data) {
  const enc = data[0]
  const body = data.subarray(1)
  let s
  if (enc === 0) s = String.fromCharCode(...body)
  else if (enc === 3) s = new TextDecoder('utf-8').decode(body)
  else s = new TextDecoder(enc === 2 ? 'utf-16be' : 'utf-16').decode(body)
  return s.replace(/\u0000/g, '').trim()
}
export function parseID3(buf) {
  const u8 = new Uint8Array(buf)
  const out = {}
  if (u8.length < 10 || u8[0] !== 0x49 || u8[1] !== 0x44 || u8[2] !== 0x33) return out
  const ver = u8[3]
  if (ver < 3) return out
  const ss = (p) => (u8[p] << 21) | (u8[p + 1] << 14) | (u8[p + 2] << 7) | u8[p + 3]
  const u32 = (p) => ((u8[p] << 24) | (u8[p + 1] << 16) | (u8[p + 2] << 8) | u8[p + 3]) >>> 0
  const end = Math.min(u8.length, 10 + ss(6))
  let p = 10
  if (u8[5] & 0x40) p += ver === 4 ? ss(10) : u32(10) + 4
  while (p + 10 < end) {
    const id = String.fromCharCode(u8[p], u8[p + 1], u8[p + 2], u8[p + 3])
    if (!/^[A-Z0-9]{4}$/.test(id)) break
    const size = ver === 4 ? ss(p + 4) : u32(p + 4)
    const data = u8.subarray(p + 10, p + 10 + size)
    try {
      if (id === 'TIT2') out.title = readText(data)
      if (id === 'TPE1') out.artist = readText(data)
      if (id === 'TALB') out.album = readText(data)
      if (id === 'APIC' && !out.picture) {
        const enc = data[0]
        let i = 1
        let mime = ''
        while (i < data.length && data[i] !== 0) mime += String.fromCharCode(data[i++])
        i += 2 // null + picture type
        if (enc === 1 || enc === 2) { while (i + 1 < data.length && !(data[i] === 0 && data[i + 1] === 0)) i += 2; i += 2 }
        else { while (i < data.length && data[i] !== 0) i++; i += 1 }
        out.picture = new Blob([data.slice(i)], { type: mime.includes('/') ? mime : 'image/jpeg' })
      }
    } catch {}
    p += 10 + size
  }
  return out
}

