// Turns whatever the owner uploads into something every visitor's browser can play or show.
// - audio: anything this browser can decode (WAV, FLAC, OGG, Opus, AAC, M4A, AIFF, MP3 ...) becomes MP3
// - images: anything this browser can decode (GIF, BMP, AVIF, SVG, ICO, TIFF where supported ...) and HEIC/HEIF
//   photos become JPEG or WebP; PNG, JPEG and WebP are kept as they are
// - video: kept as uploaded; the browser is asked whether it can play it, and the answer is recorded
// Anything else is stored as a plain file so it is never refused for its format.

export const AUDIO_EXT = ['mp3', 'm4a', 'aac', 'wav', 'wave', 'flac', 'ogg', 'oga', 'opus', 'aif', 'aiff', 'aifc', 'caf', 'weba', 'amr', 'wma', 'mka', 'mp2', 'au']
export const VIDEO_EXT = ['mp4', 'm4v', 'webm', 'mov', 'ogv', 'mkv', 'avi', 'wmv', 'flv', '3gp', '3g2', 'mpg', 'mpeg', 'ts', 'mts', 'm2ts', 'qt']
export const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'jfif', 'webp', 'gif', 'bmp', 'avif', 'svg', 'ico', 'heic', 'heif', 'tif', 'tiff', 'apng']
export const DOC_EXT = ['pdf', 'txt', 'md']

export const extOf = (name) => (String(name).split('.').pop() || '').toLowerCase()

/** @returns {'song'|'video'|'cover'|'ebook'|'file'} the best kind for a file; never null */
export function detectKind(file) {
  const e = extOf(file.name)
  const t = file.type || ''
  if (t.startsWith('audio/') || AUDIO_EXT.includes(e)) return 'song'
  if (t.startsWith('video/') || VIDEO_EXT.includes(e)) return 'video'
  if (t.startsWith('image/') || IMAGE_EXT.includes(e)) return 'cover'
  if (DOC_EXT.includes(e) || t === 'application/pdf' || t === 'text/plain' || t === 'text/markdown') return 'ebook'
  return 'file'
}

const VIDEO_MIME = { mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/mp4', qt: 'video/mp4', '3gp': 'video/3gpp', '3g2': 'video/3gpp2', webm: 'video/webm', ogv: 'video/ogg', mkv: 'video/x-matroska', avi: 'video/x-msvideo', wmv: 'video/x-ms-wmv', flv: 'video/x-flv', mpg: 'video/mpeg', mpeg: 'video/mpeg', ts: 'video/mp2t', mts: 'video/mp2t', m2ts: 'video/mp2t' }
export const videoMime = (file) => VIDEO_MIME[extOf(file.name)] || (file.type && file.type.startsWith('video/') ? file.type : 'video/mp4')

/** Decode any audio file this browser understands and encode it as a 128 kbps MP3. */
export async function audioToMp3(file, onStatus = () => {}) {
  onStatus('Decoding audio…')
  const bytes = await file.arrayBuffer()
  const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext
  const ctx = new Ctx(2, 44100, 44100)
  let audio
  try {
    audio = await new Promise((res, rej) => ctx.decodeAudioData(bytes.slice(0), res, rej))
  } catch {
    throw new Error("This browser can't decode that audio format")
  }
  onStatus('Encoding MP3…')
  const { Mp3Encoder } = await import('@breezystack/lamejs')
  const ch = Math.min(2, audio.numberOfChannels)
  const enc = new Mp3Encoder(ch, audio.sampleRate, 128)
  const toI16 = (f) => { const o = new Int16Array(f.length); for (let i = 0; i < f.length; i++) { const s = Math.max(-1, Math.min(1, f[i])); o[i] = s < 0 ? s * 0x8000 : s * 0x7fff } return o }
  const L = toI16(audio.getChannelData(0))
  const R = ch > 1 ? toI16(audio.getChannelData(1)) : null
  const parts = []
  const BLOCK = 1152 * 20
  for (let i = 0; i < L.length; i += BLOCK) {
    const buf = R ? enc.encodeBuffer(L.subarray(i, i + BLOCK), R.subarray(i, i + BLOCK)) : enc.encodeBuffer(L.subarray(i, i + BLOCK))
    if (buf.length) parts.push(new Uint8Array(buf))
    if ((i / BLOCK) % 40 === 0) await new Promise((r) => setTimeout(r, 0)) // keep the page responsive on long files
  }
  const tail = enc.flush()
  if (tail.length) parts.push(new Uint8Array(tail))
  const size = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(size)
  let o = 0
  for (const p of parts) { out.set(p, o); o += p.length }
  return { bytes: out, duration: audio.duration }
}

const loadImg = (blob) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(blob)
  const img = new Image()
  img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("This browser can't read that image format")) }
  img.src = url
})

/** @returns {Promise<{ blob: Blob, type: string, converted: boolean }>} */
export async function imageToWeb(file) {
  const e = extOf(file.name)
  const keep = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)
  if (keep) return { blob: file, type: file.type, converted: false }
  let src = file
  if (e === 'heic' || e === 'heif' || /heic|heif/.test(file.type)) {
    const heic2any = (await import('heic2any')).default
    const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
    src = Array.isArray(out) ? out[0] : out
    return { blob: src, type: 'image/jpeg', converted: true }
  }
  if (e === 'svg' && !file.type) src = new Blob([await file.arrayBuffer()], { type: 'image/svg+xml' })
  const img = await loadImg(src)
  const w = img.naturalWidth || 1024, h = img.naturalHeight || 1024
  const s = Math.min(1, 4096 / Math.max(w, h))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s))
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
  const blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.92))
  if (blob && blob.type === 'image/webp') return { blob, type: 'image/webp', converted: true }
  return { blob: await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92)), type: 'image/jpeg', converted: true }
}

/** Can this browser play the video? Resolves { playable, duration }. */
export function probeVideo(blob) {
  return new Promise((resolve) => {
    const v = document.createElement('video')
    const url = URL.createObjectURL(blob)
    const done = (ok, d) => { URL.revokeObjectURL(url); resolve({ playable: ok, duration: Number.isFinite(d) ? d : null }) }
    v.preload = 'metadata'
    v.onloadedmetadata = () => done(true, v.duration)
    v.onerror = () => done(false, null)
    setTimeout(() => done(false, null), 20000)
    v.src = url
  })
}
