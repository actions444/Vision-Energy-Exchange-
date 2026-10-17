// Music library: tracks, playlists (track lists, licensed radio streams or authorised embed
// players) and which playlist each room/zone plays.
//
// Sources, in load order (later wins):
//   1. built-in demo playlists (synthesised in the browser, see generate.js)
//   2. public/music/manifest.json shipped with the site
//   3. the shared music setup (`config/music` in the backend store) that the owner edits in the
//      Music admin: playlists, radio stations and room assignments every visitor gets
//   4. songs published in the Media library (backend), as tracks plus automatic playlists:
//      the full catalog and one playlist per album
// Without a backend (plain static hosting) step 3 falls back to this device's IndexedDB.
import { create } from 'zustand'
import { backend, useBackend } from '../backend/backend.js'
import { useMedia, fileUrl, updateMedia, deleteMedia, uploadMedia } from '../media/media.js'
import { unpackMp3 } from '../media/mp3mp4.js'
import * as db from '../assets/idb.js'
import { ZONES } from '../config/rooms.js'
import { NEON } from '../config/theme.js'
import { renderSong, coverArt } from './generate.js'

const uid = (p) => p + '-' + Math.random().toString(36).slice(2, 9)
const DEMO_ARTIST = 'Trinity Reign · demo'

const DEMO_TRACKS = [
  { id: 't-marble-rain', title: 'Marble Rain', gen: { style: 'lofi', bpm: 78, bars: 16, root: 50, seed: 11 }, colors: [NEON.purple, NEON.pink, NEON.teal], shape: 'rings' },
  { id: 't-velvet-hour', title: 'Velvet Hour', gen: { style: 'lofi', bpm: 84, bars: 16, root: 53, seed: 23 }, colors: [NEON.pink, NEON.purple, NEON.yellow], shape: 'waves' },
  { id: 't-crate-digger', title: 'Crate Digger', gen: { style: 'house', bpm: 122, bars: 24, root: 45, seed: 5 }, colors: [NEON.teal, NEON.yellow, NEON.pink], shape: 'bars' },
  { id: 't-needle-drop', title: 'Needle Drop', gen: { style: 'synthwave', bpm: 104, bars: 20, root: 50, seed: 8 }, colors: [NEON.yellow, NEON.pink, NEON.purple], shape: 'waves' },
  { id: 't-after-hours', title: 'After Hours', gen: { style: 'trap', bpm: 140, bars: 24, root: 49, seed: 31 }, colors: [NEON.pink, NEON.teal, NEON.purple], shape: 'bars' },
  { id: 't-purple-static', title: 'Purple Static', gen: { style: 'house', bpm: 118, bars: 24, root: 48, seed: 9 }, colors: [NEON.purple, NEON.teal, NEON.yellow], shape: 'rings' },
  { id: 't-thunder-avenue', title: 'Thunder Avenue', gen: { style: 'ambient', bpm: 64, bars: 12, root: 50, seed: 4 }, colors: [NEON.teal, NEON.purple, '#9fb4ff'], shape: 'waves' },
  { id: 't-wet-asphalt', title: 'Wet Asphalt', gen: { style: 'ambient', bpm: 58, bars: 12, root: 46, seed: 17 }, colors: ['#9fb4ff', NEON.teal, NEON.pink], shape: 'rings' },
  // Vision Storms Plaza
  { id: 't-welcome-desk', title: 'Welcome Desk', gen: { style: 'lofi', bpm: 80, bars: 16, root: 55, seed: 41 }, colors: ['#c9a96a', '#7a8796', '#e8e1d4'], shape: 'waves' },
  { id: 't-corner-booth', title: 'Corner Booth', gen: { style: 'lofi', bpm: 86, bars: 16, root: 52, seed: 52 }, colors: ['#d98c5f', '#7a3b33', '#f2e3c9'], shape: 'rings' },
  { id: 't-late-brunch', title: 'Late Brunch', gen: { style: 'lofi', bpm: 74, bars: 14, root: 57, seed: 63 }, colors: ['#f0c66a', '#8a6f55', '#e8e1d4'], shape: 'waves' },
  { id: 't-runway-glow', title: 'Runway Glow', gen: { style: 'house', bpm: 124, bars: 24, root: 47, seed: 74 }, colors: ['#e9e4d8', '#1f2a44', '#b23a3a'], shape: 'bars' },
  { id: 't-fitting-room', title: 'Fitting Room', gen: { style: 'house', bpm: 120, bars: 24, root: 44, seed: 85 }, colors: ['#3d5a40', '#c9a24a', '#e9e4d8'], shape: 'rings' },
  { id: 't-feature-presentation', title: 'Feature Presentation', gen: { style: 'synthwave', bpm: 96, bars: 20, root: 48, seed: 96 }, colors: ['#6a1f26', '#c9a96a', '#11131a'], shape: 'waves' },
  { id: 't-booth-session', title: 'Booth Session', gen: { style: 'trap', bpm: 136, bars: 24, root: 46, seed: 107 }, colors: ['#3b6cff', '#22252b', '#c9c1dc'], shape: 'bars' },
  { id: 't-mixdown', title: 'Mixdown', gen: { style: 'synthwave', bpm: 100, bars: 20, root: 53, seed: 118 }, colors: ['#5a4a3c', '#3c4652', '#f0c66a'], shape: 'rings' },
  { id: 't-boardroom-calm', title: 'Boardroom Calm', gen: { style: 'ambient', bpm: 62, bars: 12, root: 52, seed: 129 }, colors: ['#596069', '#c9d1d9', '#c9a96a'], shape: 'waves' },
  { id: 't-skyline-suite', title: 'Skyline Suite', gen: { style: 'lofi', bpm: 70, bars: 14, root: 50, seed: 131 }, colors: ['#3c4a5a', '#d3c7b6', '#a58a6c'], shape: 'rings' },
  { id: 't-private-hours', title: 'Private Hours', gen: { style: 'ambient', bpm: 58, bars: 12, root: 55, seed: 142 }, colors: ['#7d6a58', '#3c4a5a', '#e9e4d8'], shape: 'waves' },
  // Vision Music Lounge: R&B / soul
  { id: 't-velvet-rope', title: 'Velvet Rope', gen: { style: 'rnb', bpm: 70, bars: 16, root: 51, seed: 151 }, colors: ['#5a2340', '#c98a5a', '#1c1424'], shape: 'waves' },
  { id: 't-late-checkout', title: 'Late Checkout', gen: { style: 'rnb', bpm: 76, bars: 16, root: 48, seed: 162 }, colors: ['#3a1f4d', '#e0a370', '#120d18'], shape: 'rings' },
  { id: 't-slow-motion', title: 'Slow Motion', gen: { style: 'rnb', bpm: 66, bars: 16, root: 53, seed: 173 }, colors: ['#6b2a3a', '#d8b48a', '#140f16'], shape: 'waves' },
  // elevator
  { id: 't-going-up', title: 'Going Up', gen: { style: 'piano', bpm: 84, bars: 12, root: 60, seed: 214 }, colors: ['#c9a96a', '#e9e4d8', '#3c4652'], shape: 'rings' },
  // Reign Books: relaxing instrumental
  { id: 't-margin-notes', title: 'Margin Notes', gen: { style: 'piano', bpm: 66, bars: 16, root: 55, seed: 181 }, colors: ['#e9e1cf', '#7d5f45', '#3c4a3e'], shape: 'rings' },
  { id: 't-quiet-chapter', title: 'Quiet Chapter', gen: { style: 'piano', bpm: 60, bars: 16, root: 53, seed: 192 }, colors: ['#d8cdb4', '#4c5a48', '#8a6a4a'], shape: 'waves' },
  { id: 't-reading-room', title: 'Reading Room', gen: { style: 'piano', bpm: 72, bars: 16, root: 57, seed: 203 }, colors: ['#efe6d2', '#6a4f3a', '#56645a'], shape: 'rings' },
].map((t) => ({ ...t, artist: DEMO_ARTIST, source: 'generated', demo: true }))

const DEMO_PLAYLISTS = [
  { id: 'pl-gallery', name: 'Gallery Nights', kind: 'tracks', trackIds: ['t-marble-rain', 't-velvet-hour'], shuffle: false, demo: true },
  { id: 'pl-records', name: 'Storms Records Rotation', kind: 'tracks', trackIds: ['t-crate-digger', 't-needle-drop'], shuffle: true, demo: true },
  { id: 'pl-lounge', name: 'Lounge R&B & Soul', kind: 'tracks', trackIds: ['t-velvet-rope', 't-late-checkout', 't-slow-motion'], shuffle: true, demo: true },
  { id: 'pl-club', name: 'Vision Music Lounge Club Night', kind: 'tracks', trackIds: ['t-after-hours', 't-purple-static'], shuffle: true, demo: true },
  { id: 'pl-elevator', name: 'Elevator Music', kind: 'tracks', trackIds: ['t-going-up'], shuffle: false, demo: true },
  { id: 'pl-books', name: 'Reign Books Reading Room', kind: 'tracks', trackIds: ['t-margin-notes', 't-quiet-chapter', 't-reading-room'], shuffle: true, demo: true },
  { id: 'pl-streets', name: 'City Storm', kind: 'tracks', trackIds: ['t-thunder-avenue', 't-wet-asphalt'], shuffle: false, demo: true },
  { id: 'pl-lobby', name: 'Plaza Lobby', kind: 'tracks', trackIds: ['t-welcome-desk', 't-velvet-hour'], shuffle: false, demo: true },
  { id: 'pl-bistro', name: 'Bistro Sessions', kind: 'tracks', trackIds: ['t-corner-booth', 't-late-brunch', 't-marble-rain'], shuffle: true, demo: true },
  { id: 'pl-threads', name: 'Threads Runway', kind: 'tracks', trackIds: ['t-runway-glow', 't-fitting-room'], shuffle: true, demo: true },
  { id: 'pl-screening', name: 'Cinema Lobby', kind: 'tracks', trackIds: ['t-feature-presentation', 't-thunder-avenue'], shuffle: false, demo: true },
  { id: 'pl-studio', name: 'Vision Recording Studio Reel', kind: 'tracks', trackIds: ['t-booth-session', 't-mixdown'], shuffle: true, demo: true },
  { id: 'pl-conference', name: 'Boardroom Calm', kind: 'tracks', trackIds: ['t-boardroom-calm'], shuffle: false, demo: true },
  { id: 'pl-suite', name: 'Skyline Suite', kind: 'tracks', trackIds: ['t-skyline-suite', 't-private-hours'], shuffle: true, demo: true },
]

const defaultAssignments = () => Object.fromEntries(ZONES.map((z) => [z.id, z.playlist || null]))

// ID3 tags (title, artist, embedded cover) are read in id3.js
export { parseID3 } from './id3.js'
import { parseID3 } from './id3.js'

// ---------- object URLs for stored blobs ----------
const urlCache = new Map()
async function blobUrl(key) {
  if (urlCache.has(key)) return urlCache.get(key)
  const blob = await db.get('music', key)
  if (!blob) return null
  const url = URL.createObjectURL(blob)
  urlCache.set(key, url)
  return url
}
export const getStoredBlob = (key) => db.get('music', key)

// ---------- artwork ----------
const artCache = new Map()
export function demoArt(track) {
  if (!artCache.has(track.id)) artCache.set(track.id, coverArt({ title: track.title, artist: 'Trinity Reign', colors: track.colors || [NEON.pink, NEON.purple, NEON.teal], seed: track.gen?.seed || 3, shape: track.shape }))
  return artCache.get(track.id)
}

/** Resolve artwork for a track (or playlist) to an <img>-ready URL. */
export async function resolveArt(item) {
  if (!item) return null
  if (item.cover) return fileUrl(item.cover) // stored in the backend (media library / shared playlists)
  if (item.artKey) return blobUrl(item.artKey)
  if (item.art) return item.art
  if (item.source === 'generated') return demoArt(item)
  if (item.fallbackArt) return resolveArt(item.fallbackArt)
  return null
}

// ---------- audio sources ----------
const bufferCache = new Map()
/**
 * @returns {Promise<{ type: 'buffer', buffer: AudioBuffer } | { type: 'url', url: string, blobKey?: string, bytes?: () => Promise<ArrayBuffer> }>}
 * `bytes` (when present) fetches the file for in-memory decoding if the browser refuses to stream it.
 */
export async function resolveTrackSource(track) {
  if (track.source === 'generated') {
    if (!bufferCache.has(track.id)) bufferCache.set(track.id, renderSong(track.gen))
    return { type: 'buffer', buffer: await bufferCache.get(track.id) }
  }
  if (track.source === 'local') {
    const url = await blobUrl('track:' + track.id)
    if (!url) throw new Error('This track file is missing on this device.')
    return { type: 'url', url, blobKey: 'track:' + track.id }
  }
  if (track.source === 'media') {
    const url = await fileUrl(track.file)
    if (!url) throw new Error('This song is not available.')
    return {
      type: 'url',
      url,
      async bytes() {
        const buf = await (await fetch(url)).arrayBuffer()
        if (track.container === 'mp4-mp3') { const mp3 = unpackMp3(buf); if (mp3) return mp3.slice().buffer }
        return buf
      },
    }
  }
  return { type: 'url', url: track.url }
}

// ---------- composing the library ----------
// base = demo + shipped manifest; config = the owner's shared setup; media = published songs.
let base = { tracks: DEMO_TRACKS, playlists: DEMO_PLAYLISTS, assignments: defaultAssignments() }
let config = null
let lastLocalEdit = 0

function mediaTracks() {
  const admin = useBackend.getState().admin
  return useMedia.getState().items
    .filter((m) => m.kind === 'song' && (m.published || admin))
    .map((m) => ({ id: 'media:' + m.id, mediaId: m.id, title: m.title, artist: m.artist || 'Trinity Reign', album: m.album || '', source: 'media', file: m.file, cover: m.cover || null, container: m.container, duration: m.duration, draft: !m.published, order: m.order }))
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'album'

/** Playlists made automatically from published songs: the whole catalog, and one per album. */
function autoPlaylists(mt, demoFallback) {
  const pub = mt.filter((t) => !t.draft)
  const catalog = {
    id: 'pl-catalog',
    name: 'Trinity Reign · Catalog',
    kind: 'tracks',
    auto: true,
    shuffle: false,
    trackIds: pub.map((t) => t.id),
    cover: pub.find((t) => t.cover)?.cover || null,
  }
  if (!pub.length) {
    // nothing published yet: the studio keeps its demo reel until real songs exist
    const demo = demoFallback.find((p) => p.id === 'pl-studio')
    Object.assign(catalog, { trackIds: demo ? [...demo.trackIds] : [], fallback: true, name: 'Trinity Reign · Catalog (demo until songs are published)', fallbackArt: DEMO_TRACKS.find((t) => t.id === 't-booth-session') })
  }
  const albums = new Map()
  for (const t of pub) {
    if (!t.album) continue
    if (!albums.has(t.album)) albums.set(t.album, { id: 'pl-album-' + slug(t.album), name: t.album, kind: 'tracks', auto: true, album: true, shuffle: false, trackIds: [], cover: null })
    const a = albums.get(t.album)
    a.trackIds.push(t.id)
    if (!a.cover && t.cover) a.cover = t.cover
  }
  for (const c of useMedia.getState().items) if (c.kind === 'cover' && c.published && albums.has(c.album)) albums.get(c.album).cover = c.cover
  return [catalog, ...albums.values()]
}

const RENAMED_PLAYLISTS = { 'Neon Lounge Club Night': 'Vision Music Lounge Club Night', 'Studio 202 Reel': 'Vision Recording Studio Reel' }
function mergeSaved(b, saved) {
  if (!saved) return { tracks: [...b.tracks], playlists: [...b.playlists], assignments: { ...b.assignments }, removed: [] }
  const tracks = [...b.tracks]
  for (const t of saved.tracks || []) {
    const i = tracks.findIndex((x) => x.id === t.id)
    if (i >= 0) tracks[i] = { ...tracks[i], ...t }
    else tracks.push(t)
  }
  const playlists = [...b.playlists]
  for (const p0 of saved.playlists || []) {
    // renamed defaults: a saved copy still carrying the old default name gets the new one
    const p = RENAMED_PLAYLISTS[p0.name] ? { ...p0, name: RENAMED_PLAYLISTS[p0.name] } : p0
    const i = playlists.findIndex((x) => x.id === p.id)
    if (i >= 0) playlists[i] = { ...playlists[i], ...p }
    else playlists.push(p)
  }
  const removed = new Set(saved.removedIds || [])
  return { removed: [...removed], tracks: tracks.filter((t) => !removed.has(t.id)), playlists: playlists.filter((p) => !removed.has(p.id)), assignments: { ...b.assignments, ...(saved.assignments || {}) } }
}

/** Rebuild tracks/playlists from base + shared config + media. */
function compose() {
  const m = mergeSaved(base, config)
  const mt = mediaTracks()
  const autos = autoPlaylists(mt, m.playlists)
  // shared settings for automatic playlists (e.g. shuffle) live in config.autoSettings
  const autoSettings = config?.autoSettings || {}
  const autosWithSettings = autos.map((p) => ({ ...p, ...(autoSettings[p.id] || {}) }))
  const known = new Set([...m.tracks, ...mt].map((t) => t.id))
  useMusicLibrary.setState({
    tracks: [...m.tracks.filter((t) => t.source !== 'media'), ...mt],
    playlists: [...autosWithSettings, ...m.playlists.filter((p) => !p.auto).map((p) => (p.kind === 'tracks' ? { ...p, trackIds: p.trackIds.filter((id) => known.has(id) || !id.startsWith('media:')) } : p))],
    assignments: m.assignments,
    removed: m.removed,
  })
}

// ---------- saving ----------
let saveTimer
function sharedDoc() {
  const { tracks, playlists, assignments, removed } = useMusicLibrary.getState()
  return {
    version: 2,
    // demo-track edits only; uploaded songs live in the media library, device-only files can't be shared
    tracks: tracks.filter((t) => !t.fromManifest && t.source === 'generated').map(({ id, title, artist }) => ({ id, title, artist })),
    playlists: playlists.filter((p) => !p.fromManifest && !p.auto).map(({ fromManifest, ...p }) => p),
    autoSettings: Object.fromEntries(playlists.filter((p) => p.auto && p.shuffle).map((p) => [p.id, { shuffle: true }])),
    assignments,
    removedIds: removed,
    updatedAt: new Date().toISOString(),
  }
}
function localDoc() {
  const { tracks, playlists, assignments, removed } = useMusicLibrary.getState()
  return {
    tracks: tracks.filter((t) => !t.fromManifest && t.source !== 'media'),
    playlists: playlists.filter((p) => !p.fromManifest && !p.auto),
    assignments,
    removedIds: removed,
  }
}
function persist() {
  lastLocalEdit = Date.now()
  const api = backend()
  const sharedMode = !!api && useBackend.getState().admin
  // take the edit into `config` right away, so a library rebuild (e.g. a media update arriving)
  // never brings back the old setup before the save finishes
  config = sharedMode ? sharedDoc() : localDoc()
  clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    if (sharedMode) {
      const doc = sharedDoc()
      try {
        await api.set('config/music', doc)
        useMusicLibrary.setState({ saved: new Date(), error: null })
      } catch (e) {
        useMusicLibrary.setState({ error: 'Could not save the music setup: ' + (e.message || e) })
      }
      return
    }
    db.put('meta', 'music-state', localDoc()).catch(() => {})
  }, 400)
}

export const useMusicLibrary = create((set, get) => ({
  loaded: false,
  tracks: DEMO_TRACKS,
  playlists: DEMO_PLAYLISTS,
  assignments: defaultAssignments(),
  removed: [],
  busy: null,
  error: null,
  saved: null,
  shared: false, // true when the setup comes from the backend (same for every visitor)

  async init() {
    // 2. shipped manifest
    try {
      const res = await fetch('music/manifest.json', { cache: 'no-cache' })
      if (res.ok && (res.headers.get('content-type') || '').includes('json')) {
        const m = await res.json()
        const mt = (m.tracks || []).map((t) => ({ id: t.id, title: t.title, artist: t.artist || '', source: 'url', url: t.file, art: t.art || null, fromManifest: true }))
        const mp = (m.playlists || []).map((p) => ({ kind: 'tracks', trackIds: [], shuffle: false, ...p, fromManifest: true }))
        base = {
          tracks: [...base.tracks.filter((t) => !mt.some((x) => x.id === t.id)), ...mt],
          playlists: [...base.playlists.filter((p) => !mp.some((x) => x.id === p.id)), ...mp],
          assignments: { ...base.assignments, ...(m.assignments || {}) },
        }
      }
    } catch {}
    const api = backend()
    if (api) {
      // 3. the owner's shared setup, live
      set({ shared: true })
      let first = true
      api.subDoc('config/music', async (doc) => {
        if (Date.now() - lastLocalEdit < 2500 && !first) return // our own edit is still being saved
        if (first && !doc && useBackend.getState().admin) {
          // first run with a backend: carry over a setup made earlier on this device
          const old = await db.get('meta', 'music-state').catch(() => null)
          if (old) { config = { ...old, tracks: (old.tracks || []).filter((t) => t.source === 'generated'), playlists: (old.playlists || []).map((p) => ({ ...p, trackIds: (p.trackIds || []).filter((id) => DEMO_TRACKS.some((t) => t.id === id)) })) }; compose(); persist() }
        } else {
          config = doc
          compose()
        }
        first = false
        if (!get().loaded) set({ loaded: true })
      })
      // 4. songs from the media library
      useMedia.subscribe((s, prev) => { if (s.items !== prev.items) compose() })
      compose()
      setTimeout(() => { if (!get().loaded) set({ loaded: true }) }, 4000)
      return
    }
    // no backend: this device's saved setup
    try { config = await db.get('meta', 'music-state') } catch {}
    compose()
    set({ loaded: true })
  },

  /** Upload audio. With a backend the files go to the shared media library (published). */
  async uploadTracks(files, playlistId) {
    set({ busy: 'Reading files…', error: null })
    const added = []
    try {
      if (backend() && useBackend.getState().admin) {
        set({ busy: `Uploading ${files.length} file${files.length === 1 ? '' : 's'} to the media library…` })
        const all = await uploadMedia(files, { kind: 'song', publish: true })
        const items = all.filter((m) => m.kind === 'song') // anything this browser can't decode as audio was stored as a plain file instead
        const failed = useMedia.getState().jobs.filter((j) => j.error)
        if (!items.length) throw new Error(failed[0]?.error || (all.length ? "This browser couldn't decode that audio; it was saved under Media library → Other files." : 'Choose audio files.'))
        added.push(...items.map((m) => ({ id: 'media:' + m.id })))
        if (playlistId) get().addToPlaylist(playlistId, added.map((t) => t.id))
        set({ busy: null, error: failed.length ? `${failed.length} file(s) failed: ${failed[0].error}` : null })
        return added
      }
      for (const f of files) {
        if (!/^audio\//.test(f.type) && !/\.(mp3|m4a|aac|wav|ogg|oga|flac)$/i.test(f.name)) continue
        set({ busy: `Adding ${f.name}…` })
        const id = uid('t')
        const head = await f.slice(0, Math.min(f.size, 4 * 1024 * 1024)).arrayBuffer()
        const tags = parseID3(head)
        await db.put('music', 'track:' + id, f)
        let artKey = null
        if (tags.picture) { artKey = 'art:' + id; await db.put('music', artKey, tags.picture) }
        added.push({ id, title: tags.title || f.name.replace(/\.[^.]+$/, ''), artist: tags.artist || 'Trinity Reign', source: 'local', fileName: f.name, artKey })
      }
      if (!added.length) throw new Error('Choose MP3, M4A, WAV or OGG audio files.')
      set((s) => ({
        tracks: [...s.tracks, ...added],
        playlists: playlistId ? s.playlists.map((p) => (p.id === playlistId ? { ...p, trackIds: [...p.trackIds, ...added.map((t) => t.id)] } : p)) : s.playlists,
        busy: null,
      }))
      persist()
    } catch (e) {
      set({ busy: null, error: e.message.includes('QuotaExceeded') ? 'This device is out of storage space for more tracks.' : e.message })
    }
    return added
  },

  updateTrack(id, patch) {
    const t = get().tracks.find((x) => x.id === id)
    set((s) => ({ tracks: s.tracks.map((x) => (x.id === id ? { ...x, ...patch } : x)) }))
    if (t?.source === 'media') {
      const item = useMedia.getState().items.find((m) => m.id === t.mediaId)
      if (item) mediaEdit(item, patch)
      return
    }
    persist()
  },
  async setArt(kind, id, file) {
    const api = backend()
    if (api && useBackend.getState().admin) {
      set({ busy: 'Uploading artwork…' })
      try {
        const { imageToWeb } = await import('../media/convert.js')
        const img = await imageToWeb(file)
        const up = await api.upload(img.blob, img.type)
        if (kind === 'track') {
          const t = get().tracks.find((x) => x.id === id)
          if (t?.source === 'media') {
            const item = useMedia.getState().items.find((m) => m.id === t.mediaId)
            if (item) await updateMedia(item, { cover: up.ref })
          } else get().updateTrack(id, { cover: up.ref })
        } else get().updatePlaylist(id, { cover: up.ref })
        set({ busy: null })
      } catch (e) { set({ busy: null, error: e.message }) }
      return
    }
    const key = 'art:' + id + ':' + Date.now()
    await db.put('music', key, file)
    if (kind === 'track') get().updateTrack(id, { artKey: key })
    else get().updatePlaylist(id, { artKey: key })
  },
  removeTrack(id) {
    const t = get().tracks.find((x) => x.id === id)
    set((s) => ({
      tracks: s.tracks.filter((x) => x.id !== id),
      playlists: s.playlists.map((p) => ({ ...p, trackIds: p.trackIds.filter((x) => x !== id) })),
    }))
    if (t?.source === 'local') db.del('music', 'track:' + id).catch(() => {})
    if (t?.source === 'media') {
      const item = useMedia.getState().items.find((m) => m.id === t.mediaId)
      if (item) deleteMedia(item).catch((e) => set({ error: e.message }))
    }
    if (t?.demo || t?.fromManifest) markRemoved(id)
    persist()
  },

  createPlaylist(name = 'New playlist') {
    const p = { id: uid('pl'), name, kind: 'tracks', trackIds: [], shuffle: false }
    set((s) => ({ playlists: [...s.playlists, p] }))
    persist()
    return p.id
  },
  updatePlaylist(id, patch) { set((s) => ({ playlists: s.playlists.map((p) => (p.id === id ? { ...p, ...patch } : p)) })); persist() },
  removePlaylist(id) {
    const p = get().playlists.find((x) => x.id === id)
    if (p?.auto) return
    set((s) => ({
      playlists: s.playlists.filter((x) => x.id !== id),
      assignments: Object.fromEntries(Object.entries(s.assignments).map(([z, pid]) => [z, pid === id ? null : pid])),
    }))
    if (p?.demo || p?.fromManifest) markRemoved(id)
    persist()
  },
  addToPlaylist(pid, ids) { set((s) => ({ playlists: s.playlists.map((p) => (p.id === pid ? { ...p, trackIds: [...p.trackIds, ...ids.filter((i) => !p.trackIds.includes(i))] } : p)) })); persist() },
  removeFromPlaylist(pid, index) { set((s) => ({ playlists: s.playlists.map((p) => (p.id === pid ? { ...p, trackIds: p.trackIds.filter((_, i) => i !== index) } : p)) })); persist() },
  moveInPlaylist(pid, index, dir) {
    set((s) => ({
      playlists: s.playlists.map((p) => {
        if (p.id !== pid) return p
        const ids = [...p.trackIds]
        const j = index + dir
        if (j < 0 || j >= ids.length) return p
        ;[ids[index], ids[j]] = [ids[j], ids[index]]
        return { ...p, trackIds: ids }
      }),
    }))
    persist()
  },

  addStation({ name, streamUrl, embedUrl, licenseNote }) {
    const p = { id: uid('radio'), name, kind: streamUrl ? 'stream' : 'embed', streamUrl: streamUrl || '', embedUrl: embedUrl || '', licenseNote, trackIds: [], shuffle: false }
    set((s) => ({ playlists: [...s.playlists, p] }))
    persist()
    return p.id
  },

  assign(zoneId, playlistId) { set((s) => ({ assignments: { ...s.assignments, [zoneId]: playlistId || null } })); persist() },

  async resetDemo() {
    await db.del('meta', 'music-state').catch(() => {})
    config = null
    compose()
    persist()
  },

  exportManifest() {
    const { tracks, playlists, assignments } = get()
    const used = tracks.filter((t) => t.source === 'url' || t.source === 'local')
    return {
      version: 1,
      tracks: used.map((t) => ({ id: t.id, title: t.title, artist: t.artist, file: t.source === 'url' ? t.url : `music/${t.fileName || t.id + '.mp3'}`, art: t.art || (t.artKey ? `music/art/${t.id}.jpg` : undefined) })),
      playlists: playlists.filter((p) => !p.demo && !p.auto).map(({ demo, fromManifest, artKey, ...p }) => p),
      assignments,
    }
  },
}))

// title/artist edits to uploaded songs are written to the media library after typing pauses
const mediaTimers = new Map()
function mediaEdit(item, patch) {
  clearTimeout(mediaTimers.get(item.id))
  const pending = { ...(mediaTimers.get(item.id + ':p') || {}), ...patch }
  mediaTimers.set(item.id + ':p', pending)
  mediaTimers.set(item.id, setTimeout(() => {
    mediaTimers.delete(item.id + ':p')
    const fresh = useMedia.getState().items.find((m) => m.id === item.id) || item
    updateMedia(fresh, pending).catch((e) => useMusicLibrary.setState({ error: e.message }))
  }, 700))
}

function markRemoved(id) {
  useMusicLibrary.setState((s) => ({ removed: [...new Set([...s.removed, id])] }))
}

/** Render the first track of every room's playlist in the background so room changes are instant. */
export async function prewarmDemoTracks() {
  const { assignments, playlists, tracks } = useMusicLibrary.getState()
  const ids = new Set()
  for (const pid of Object.values(assignments)) {
    const p = playlists.find((x) => x.id === pid)
    if (p?.kind === 'tracks') p.trackIds.forEach((id) => ids.add(id))
  }
  for (const id of ids) {
    const t = tracks.find((x) => x.id === id)
    if (!t || t.source !== 'generated' || bufferCache.has(t.id)) continue
    await new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(r, { timeout: 1500 }) : setTimeout(r, 200)))
    try { await resolveTrackSource(t) } catch {}
  }
}
