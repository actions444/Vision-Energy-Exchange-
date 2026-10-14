// Packs an MP3 file into a standard MP4 (ISO BMFF) container without re-encoding: the MP3
// frames become an MPEG-audio track (object type 0x6B / 0x69). The hosted page's file store
// accepts MP4 but not raw audio, and browsers play MP3-in-MP4. The original MP3 bytes are kept
// whole inside the `mdat` box, so `unpackMp3` can recover them exactly when a browser needs it.

const BITRATES = {
  // [versionKey][layer3 bitrate index] kbps
  1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
}
const RATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] }

function readHeader(b, i) {
  if (b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) return null
  const ver = (b[i + 1] >> 3) & 3 // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
  const layer = (b[i + 1] >> 1) & 3 // 1 = Layer III
  if (ver === 1 || layer !== 1) return null
  const bi = (b[i + 2] >> 4) & 15, si = (b[i + 2] >> 2) & 3, pad = (b[i + 2] >> 1) & 1
  if (bi === 0 || bi === 15 || si === 3) return null
  const kbps = BITRATES[ver === 3 ? 1 : 2][bi]
  const rate = RATES[ver][si]
  const spf = ver === 3 ? 1152 : 576
  const size = Math.floor(((spf / 8) * kbps * 1000) / rate) + pad
  const channels = ((b[i + 3] >> 6) & 3) === 3 ? 1 : 2
  return { size, rate, spf, channels, mpeg1: ver === 3, kbps }
}

/** Parse MP3 frames. @returns {{ frames: {off:number,size:number}[], rate, spf, channels, mpeg1, duration }} */
export function scanMp3(bytes) {
  const b = bytes
  let i = 0
  if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) {
    const sz = (b[6] << 21) | (b[7] << 14) | (b[8] << 7) | b[9]
    i = 10 + sz + (b[5] & 0x10 ? 10 : 0)
  }
  const frames = []
  let first = null
  let maxKbps = 0
  while (i + 4 <= b.length) {
    const h = readHeader(b, i)
    if (h && i + h.size <= b.length) {
      // require the next frame to line up too (avoids false sync words), except at the end
      const nh = i + h.size + 4 <= b.length ? readHeader(b, i + h.size) : h
      if (nh && (!first || (h.rate === first.rate && h.mpeg1 === first.mpeg1))) {
        if (!first) first = h
        frames.push({ off: i, size: h.size })
        if (h.kbps > maxKbps) maxKbps = h.kbps
        i += h.size
        continue
      }
    }
    if (b[i] === 0x54 && b[i + 1] === 0x41 && b[i + 2] === 0x47 && b.length - i === 128) break // ID3v1 tail
    i++
  }
  if (!first || frames.length < 10) throw new Error('This does not look like an MP3 file.')
  return { frames, rate: first.rate, spf: first.spf, channels: first.channels, mpeg1: first.mpeg1, maxKbps, duration: (frames.length * first.spf) / first.rate }
}

// ---- tiny MP4 box writer ----
const enc = new TextEncoder()
function u32(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255] }
function u16(n) { return [(n >> 8) & 255, n & 255] }
function box(type, ...parts) {
  const body = parts.flat(Infinity)
  return [...u32(8 + body.length), ...enc.encode(type), ...body]
}
const full = (v, f) => [v, (f >> 16) & 255, (f >> 8) & 255, f & 255]
const MATRIX = [...u32(0x10000), ...u32(0), ...u32(0), ...u32(0), ...u32(0x10000), ...u32(0), ...u32(0), ...u32(0), ...u32(0x40000000)]
function desc(tag, body) {
  // MPEG-4 descriptor with 4-byte length encoding
  const n = body.length
  return [tag, 0x80 | ((n >> 21) & 127), 0x80 | ((n >> 14) & 127), 0x80 | ((n >> 7) & 127), n & 127, ...body]
}

/**
 * @param {Uint8Array} mp3 original file bytes
 * @returns {{ mp4: Uint8Array, duration: number }}
 */
export function packMp3(mp3) {
  const s = scanMp3(mp3)
  const n = s.frames.length
  const totalSamples = n * s.spf
  const ftyp = box('ftyp', enc.encode('isom'), u32(0x200), enc.encode('isom'), enc.encode('iso2'), enc.encode('mp41'))

  const esds = box('esds', full(0, 0), desc(0x03, [
    ...u16(1), 0,
    ...desc(0x04, [s.mpeg1 ? 0x6b : 0x69, 0x15, 0, 0, 0, ...u32(s.maxKbps * 1000), ...u32(s.maxKbps * 1000)]),
    ...desc(0x06, [0x02]),
  ]))
  const mp4a = box('mp4a', [0, 0, 0, 0, 0, 0], u16(1), u32(0), u32(0), u16(s.channels), u16(16), u16(0), u16(0), u32(s.rate * 65536 >>> 0), esds)
  const stsd = box('stsd', full(0, 0), u32(1), mp4a)
  const stts = box('stts', full(0, 0), u32(1), u32(n), u32(s.spf))
  const stsc = box('stsc', full(0, 0), u32(1), u32(1), u32(1), u32(1))
  const stsz = box('stsz', full(0, 0), u32(0), u32(n), s.frames.map((f) => u32(f.size)))

  // build everything except stco first to learn the moov size, then fill in chunk offsets
  const build = (mdatStart) => {
    const stco = box('stco', full(0, 0), u32(n), s.frames.map((f) => u32(mdatStart + f.off)))
    const stbl = box('stbl', stsd, stts, stsc, stsz, stco)
    const minf = box('minf', box('smhd', full(0, 0), u16(0), u16(0)), box('dinf', box('dref', full(0, 0), u32(1), box('url ', full(0, 1)))), stbl)
    const mdhd = box('mdhd', full(0, 0), u32(0), u32(0), u32(s.rate), u32(totalSamples), u16(0x55c4), u16(0))
    const hdlr = box('hdlr', full(0, 0), u32(0), enc.encode('soun'), u32(0), u32(0), u32(0), enc.encode('SoundHandler'), 0)
    const tkhd = box('tkhd', full(0, 3), u32(0), u32(0), u32(1), u32(0), u32(totalSamples), u32(0), u32(0), u16(0), u16(0), u16(0x100), u16(0), MATRIX, u32(0), u32(0))
    const trak = box('trak', tkhd, box('mdia', mdhd, hdlr, minf))
    const mvhd = box('mvhd', full(0, 0), u32(0), u32(0), u32(s.rate), u32(totalSamples), u32(0x10000), u16(0x100), u16(0), u32(0), u32(0), MATRIX, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], u32(2))
    return box('moov', mvhd, trak)
  }
  const moovLen = build(0).length
  const mdatStart = ftyp.length + moovLen + 8
  const moov = build(mdatStart)
  const out = new Uint8Array(ftyp.length + moov.length + 8 + mp3.length)
  out.set(ftyp, 0)
  out.set(moov, ftyp.length)
  out.set(u32(8 + mp3.length), ftyp.length + moov.length)
  out.set(enc.encode('mdat'), ftyp.length + moov.length + 4)
  out.set(mp3, mdatStart)
  return { mp4: out, duration: s.duration }
}

/** Recover the original MP3 bytes from a file made by packMp3 (the whole mdat payload). */
export function unpackMp3(mp4) {
  const b = mp4 instanceof Uint8Array ? mp4 : new Uint8Array(mp4)
  let i = 0
  while (i + 8 <= b.length) {
    const size = ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0
    const type = String.fromCharCode(b[i + 4], b[i + 5], b[i + 6], b[i + 7])
    if (type === 'mdat') return b.subarray(i + 8, size ? i + size : b.length)
    if (size < 8) break
    i += size
  }
  return null
}
