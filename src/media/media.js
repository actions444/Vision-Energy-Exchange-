// Media library: songs, album covers, music videos, audiobooks, e-books, movies.
// Catalog entries are documents in the shared store; the files themselves are stored by the
// backend (see backend/backend.js). Published entries live in `media/`, unpublished drafts in
// `drafts/` (readable only by the owner on the hosted page).
import { create } from 'zustand'
import { backend, useBackend } from '../backend/backend.js'
import { packMp3 } from './mp3mp4.js'
import { parseID3 } from '../music/id3.js'

export const KINDS = {
  song: { label: 'Song', plural: 'Songs', accept: '.mp3,.m4a,audio/mpeg,audio/mp4' },
  audiobook: { label: 'Audiobook chapter', plural: 'Audiobooks', accept: '.mp3,.m4a,audio/mpeg,audio/mp4' },
  cover: { label: 'Album cover', plural: 'Album covers', accept: 'image/jpeg,image/png,image/webp' },
  video: { label: 'Music video', plural: 'Music videos', accept: 'video/mp4,video/webm,.mp4,.webm,.mov' },
  movie: { label: 'Movie or short film', plural: 'Movies', accept: 'video/mp4,video/webm,.mp4,.webm,.mov' },
  ebook: { label: 'E-book', plural: 'E-books', accept: 'application/pdf,.pdf,.txt,.md' },
}

const uid = () => 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
const ext = (name) => (name.split('.').pop() || '').toLowerCase()
const base = (name) => name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()

export function guessKind(file) {
  const e = ext(file.name)
  if (['mp3', 'm4a', 'aac'].includes(e) || file.type.startsWith('audio/')) return 'song'
  if (['mp4', 'webm', 'mov', 'm4v'].includes(e) || file.type.startsWith('video/')) return 'video'
  if (['pdf', 'txt', 'md'].includes(e)) return 'ebook'
  if (file.type.startsWith('image/')) return 'cover'
  return null
}

export const useMedia = create(() => ({
  published: [],
  drafts: [],
  items: [], // published + drafts (drafts only for the owner)
  loaded: false,
  jobs: [], // upload progress: { id, name, status, error }
}))

const setJob = (id, patch) => useMedia.setState((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)) }))

let started = false
export function startMedia() {
  const api = backend()
  if (!api || started) return
  started = true
  const merge = () => {
    const { published, drafts } = useMedia.getState()
    const items = [...published.map((d) => ({ ...d, published: true })), ...drafts.map((d) => ({ ...d, published: false }))]
    items.sort((a, b) => (a.album || '').localeCompare(b.album || '') || (a.order ?? 0) - (b.order ?? 0) || (a.createdAt || '').localeCompare(b.createdAt || ''))
    useMedia.setState({ items, loaded: true })
  }
  api.sub('media', (docs) => { useMedia.setState({ published: docs }); merge() })
  if (useBackend.getState().admin) api.sub('drafts', (docs) => { useMedia.setState({ drafts: docs }); merge() })
}

/** Absolute URL to play/display a stored file. */
export async function fileUrl(ref) {
  const api = backend()
  if (!api || !ref) return null
  return api.resolveUrl ? api.resolveUrl(ref) : api.url(ref)
}
export function fileUrlSync(ref) {
  const api = backend()
  return api && ref ? api.url(ref) : null
}

// ---------------- helpers that read files in the browser ----------------
function probeDuration(blob, kind) {
  return new Promise((resolve) => {
    const el = document.createElement(kind)
    const url = URL.createObjectURL(blob)
    const done = (d) => { URL.revokeObjectURL(url); resolve(Number.isFinite(d) ? d : null) }
    el.preload = 'metadata'
    el.onloadedmetadata = () => done(el.duration)
    el.onerror = () => done(null)
    setTimeout(() => done(null), 30000)
    el.src = url
  })
}

/** Grab a poster frame from a video file (best effort). */
function videoPoster(blob) {
  return new Promise((resolve) => {
    const v = document.createElement('video')
    const url = URL.createObjectURL(blob)
    const fin = (b) => { URL.revokeObjectURL(url); resolve(b) }
    v.muted = true
    v.playsInline = true
    v.preload = 'auto'
    v.onloadeddata = () => { v.currentTime = Math.min(2, (v.duration || 4) / 3) }
    v.onseeked = () => {
      try {
        const c = document.createElement('canvas')
        const s = Math.min(1, 640 / (v.videoWidth || 640))
        c.width = Math.round((v.videoWidth || 640) * s)
        c.height = Math.round((v.videoHeight || 360) * s)
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
        c.toBlob((b) => fin(b), 'image/jpeg', 0.82)
      } catch { fin(null) }
    }
    v.onerror = () => fin(null)
    setTimeout(() => fin(null), 30000)
    v.src = url
  })
}

/** Render page 1 of a PDF as a cover image (best effort). */
async function pdfCover(blob) {
  try {
    const { loadPdf } = await import('./pdf.js')
    const doc = await loadPdf(await blob.arrayBuffer())
    const page = await doc.getPage(1)
    const vp = page.getViewport({ scale: 1 })
    const scale = 600 / vp.height
    const c = document.createElement('canvas')
    const v2 = page.getViewport({ scale })
    c.width = Math.round(v2.width)
    c.height = Math.round(v2.height)
    await page.render({ canvasContext: c.getContext('2d'), viewport: v2 }).promise
    const pages = doc.numPages
    const img = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85))
    return { img, pages }
  } catch (e) {
    console.warn('pdf cover failed', e)
    return { img: null, pages: null }
  }
}

// ---------------- upload ----------------
/**
 * Upload files into the library.
 * @param {File[]} files
 * @param {{ kind?: string, album?: string, artist?: string, book?: string, publish?: boolean }} opts
 */
export async function uploadMedia(files, opts = {}) {
  const api = backend()
  if (!api || !useBackend.getState().admin) throw new Error('Only the owner can upload.')
  const limit = useBackend.getState().maxFileBytes
  const results = []
  for (const file of files) {
    const jobId = uid()
    useMedia.setState((s) => ({ jobs: [...s.jobs, { id: jobId, name: file.name, status: 'Preparing…' }] }))
    try {
      const kind = opts.kind && opts.kind !== 'auto' ? opts.kind : guessKind(file)
      if (!kind) throw new Error('Unsupported file. Use MP3, M4A, MP4, WebM, PDF, TXT, JPG, PNG or WebP.')
      const e = ext(file.name)
      const item = {
        id: uid(),
        kind,
        title: base(file.name),
        artist: opts.artist || '',
        album: opts.album || '',
        book: opts.book || '',
        fileName: file.name,
        createdAt: new Date().toISOString(),
        order: Date.now(),
      }
      let payload = file
      let type = file.type

      if (kind === 'song' || kind === 'audiobook') {
        if (!['mp3', 'm4a', 'mp4'].includes(e) && !/audio\/(mpeg|mp4|x-m4a|aac)/.test(file.type)) throw new Error('Audio must be MP3 or M4A. Convert WAV, FLAC or OGG files to MP3 first.')
        const bytes = new Uint8Array(await file.arrayBuffer())
        if (e === 'mp3' || file.type === 'audio/mpeg') {
          setJob(jobId, { status: 'Reading tags…' })
          const tags = parseID3(bytes.slice(0, Math.min(bytes.length, 4 * 1024 * 1024)).buffer)
          if (tags.title) item.title = tags.title
          if (tags.artist && !opts.artist) item.artist = tags.artist
          if (tags.album && !opts.album) item.album = tags.album
          setJob(jobId, { status: 'Packing MP3…' })
          const { mp4, duration } = packMp3(bytes)
          payload = new Blob([mp4], { type: 'video/mp4' })
          item.container = 'mp4-mp3'
          item.duration = Math.round(duration)
          if (tags.picture) {
            setJob(jobId, { status: 'Uploading cover art…' })
            const img = await api.upload(tags.picture, tags.picture.type === 'image/png' ? 'image/png' : 'image/jpeg')
            item.cover = img.ref
          }
        } else {
          payload = new Blob([bytes], { type: 'video/mp4' })
          item.container = 'native'
          item.duration = Math.round((await probeDuration(payload, 'audio')) || 0) || null
        }
        type = 'video/mp4'
        item.mime = 'audio/mpeg'
        if (kind === 'audiobook' && !item.book) item.book = item.album || 'Untitled audiobook'
      } else if (kind === 'video' || kind === 'movie') {
        type = e === 'webm' || file.type === 'video/webm' ? 'video/webm' : 'video/mp4'
        payload = file.type === type ? file : new Blob([file], { type })
        setJob(jobId, { status: 'Making a poster frame…' })
        const poster = await videoPoster(payload)
        if (poster) item.cover = (await api.upload(poster, 'image/jpeg')).ref
        item.duration = Math.round((await probeDuration(payload, 'video')) || 0) || null
        item.mime = type
      } else if (kind === 'ebook') {
        if (e === 'pdf' || file.type === 'application/pdf') {
          type = 'application/pdf'
          setJob(jobId, { status: 'Rendering the cover…' })
          const { img, pages } = await pdfCover(file)
          if (img) item.cover = (await api.upload(img, 'image/jpeg')).ref
          item.pages = pages
        } else if (['txt', 'md'].includes(e)) {
          type = e === 'md' ? 'text/markdown' : 'text/plain'
          payload = new Blob([await file.text()], { type })
        } else throw new Error('E-books must be PDF, TXT or Markdown. Convert EPUB files to PDF first.')
        item.mime = type
        if (!item.artist) item.artist = opts.artist || 'Trinity Reign'
      } else if (kind === 'cover') {
        type = ['image/png', 'image/webp', 'image/jpeg'].includes(file.type) ? file.type : 'image/jpeg'
        item.mime = type
        if (!item.album) item.album = item.title
      }

      if (payload.size > limit) throw new Error(`This file is ${(payload.size / 1048576).toFixed(1)} MB; the limit here is ${Math.round(limit / 1048576)} MB per file.`)
      setJob(jobId, { status: `Uploading ${(payload.size / 1048576).toFixed(1)} MB…` })
      const up = await api.upload(payload, type)
      item.file = up.ref
      item.size = up.size
      if (kind === 'cover') item.cover = up.ref
      await api.set(`${opts.publish ? 'media' : 'drafts'}/${item.id}`, item)
      setJob(jobId, { status: opts.publish ? 'Published' : 'Saved as draft', done: true })
      results.push(item)
    } catch (err) {
      console.error(err)
      setJob(jobId, { status: 'Failed', error: err.message || String(err), done: true })
    }
  }
  setTimeout(() => useMedia.setState((s) => ({ jobs: s.jobs.filter((j) => !j.done || j.error) })), 6000)
  return results
}

/** Change catalog fields; moving between draft and published when `published` changes. */
export async function updateMedia(item, patch) {
  const api = backend()
  const { published, ...rest } = { ...item, ...patch }
  const wasPub = item.published
  const nowPub = 'published' in patch ? patch.published : wasPub
  const doc = { ...rest, updatedAt: new Date().toISOString() }
  delete doc.published
  await api.set(`${nowPub ? 'media' : 'drafts'}/${item.id}`, doc)
  if (wasPub !== nowPub) await api.del(`${wasPub ? 'media' : 'drafts'}/${item.id}`)
}

/** Delete the entry and its files (cover kept if another entry still uses it). */
export async function deleteMedia(item) {
  const api = backend()
  await api.del(`${item.published ? 'media' : 'drafts'}/${item.id}`)
  const others = useMedia.getState().items.filter((x) => x.id !== item.id)
  const used = new Set(others.flatMap((x) => [x.file, x.cover]))
  for (const ref of new Set([item.file, item.cover])) if (ref && !used.has(ref)) await api.remove(ref).catch(() => {})
}

// ---------------- derived views ----------------
export function albums(items, { includeDrafts = false } = {}) {
  const songs = items.filter((x) => x.kind === 'song' && (includeDrafts || x.published))
  const covers = items.filter((x) => x.kind === 'cover' && (includeDrafts || x.published))
  const map = new Map()
  for (const s of songs) {
    const key = s.album || 'Singles'
    if (!map.has(key)) map.set(key, { title: key, artist: s.artist, cover: null, songs: [] })
    const a = map.get(key)
    a.songs.push(s)
    if (!a.cover && s.cover) a.cover = s.cover
  }
  for (const c of covers) { const a = map.get(c.album); if (a) a.cover = c.cover }
  return [...map.values()]
}

export function audiobooks(items, { includeDrafts = false } = {}) {
  const map = new Map()
  for (const s of items.filter((x) => x.kind === 'audiobook' && (includeDrafts || x.published))) {
    const key = s.book || s.album || 'Audiobook'
    if (!map.has(key)) map.set(key, { title: key, author: s.artist, cover: s.cover, chapters: [] })
    map.get(key).chapters.push(s)
  }
  return [...map.values()]
}
