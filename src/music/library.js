// Music library: tracks, playlists (track lists, licensed radio streams or authorised embed
// players) and which playlist each room/zone plays.
//
// Sources, in load order (later wins):
//   1. built-in demo playlists (synthesised in the browser, see generate.js)
//   2. public/music/manifest.json shipped with the site (what every visitor hears)
//   3. edits made in the Music admin on this device (saved in IndexedDB)
import { create } from 'zustand'
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
].map((t) => ({ ...t, artist: DEMO_ARTIST, source: 'generated', demo: true }))

const DEMO_PLAYLISTS = [
  { id: 'pl-gallery', name: 'Gallery Nights', kind: 'tracks', trackIds: ['t-marble-rain', 't-velvet-hour'], shuffle: false, demo: true },
  { id: 'pl-records', name: 'Storms Records Rotation', kind: 'tracks', trackIds: ['t-crate-digger', 't-needle-drop'], shuffle: true, demo: true },
  { id: 'pl-lounge', name: 'Neon Lounge Live', kind: 'tracks', trackIds: ['t-after-hours', 't-purple-static'], shuffle: true, demo: true },
  { id: 'pl-streets', name: 'City Storm', kind: 'tracks', trackIds: ['t-thunder-avenue', 't-wet-asphalt'], shuffle: false, demo: true },
  { id: 'pl-lobby', name: 'Plaza Lobby', kind: 'tracks', trackIds: ['t-welcome-desk', 't-velvet-hour'], shuffle: false, demo: true },
  { id: 'pl-bistro', name: 'Bistro Sessions', kind: 'tracks', trackIds: ['t-corner-booth', 't-late-brunch', 't-marble-rain'], shuffle: true, demo: true },
  { id: 'pl-threads', name: 'Threads Runway', kind: 'tracks', trackIds: ['t-runway-glow', 't-fitting-room'], shuffle: true, demo: true },
  { id: 'pl-screening', name: 'Screening Room', kind: 'tracks', trackIds: ['t-feature-presentation', 't-thunder-avenue'], shuffle: false, demo: true },
  { id: 'pl-studio', name: 'Studio 202 Reel', kind: 'tracks', trackIds: ['t-booth-session', 't-mixdown'], shuffle: true, demo: true },
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
  if (item.artKey) return blobUrl(item.artKey)
  if (item.art) return item.art
  if (item.source === 'generated') return demoArt(item)
  return null
}

// ---------- audio sources ----------
const bufferCache = new Map()
/** @returns {Promise<{ type: 'buffer', buffer: AudioBuffer } | { type: 'url', url: string, blobKey?: string }>} */
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
  return { type: 'url', url: track.url }
}

// ---------- store ----------
let saveTimer
function persist() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const { tracks, playlists, assignments } = useMusicLibrary.getState()
    db.put('meta', 'music-state', {
      tracks: tracks.filter((t) => !t.fromManifest),
      playlists: playlists.filter((p) => !p.fromManifest),
      assignments,
      removedIds: useMusicLibrary.getState().removed,
    }).catch(() => {})
  }, 250)
}

export const useMusicLibrary = create((set, get) => ({
  loaded: false,
  tracks: DEMO_TRACKS,
  playlists: DEMO_PLAYLISTS,
  assignments: defaultAssignments(),
  removed: [],
  busy: null,
  error: null,

  async init() {
    // 2. shipped manifest
    try {
      const res = await fetch('music/manifest.json', { cache: 'no-cache' })
      if (res.ok) {
        const m = await res.json()
        const mt = (m.tracks || []).map((t) => ({ id: t.id, title: t.title, artist: t.artist || '', source: 'url', url: t.file, art: t.art || null, fromManifest: true }))
        const mp = (m.playlists || []).map((p) => ({ kind: 'tracks', trackIds: [], shuffle: false, ...p, fromManifest: true }))
        set((s) => ({
          tracks: [...s.tracks.filter((t) => !mt.some((x) => x.id === t.id)), ...mt],
          playlists: [...s.playlists.filter((p) => !mp.some((x) => x.id === p.id)), ...mp],
          assignments: { ...s.assignments, ...(m.assignments || {}) },
        }))
      }
    } catch {}
    // 3. local admin edits
    try {
      const saved = await db.get('meta', 'music-state')
      if (saved) {
        set((s) => {
          const tracks = [...s.tracks]
          for (const t of saved.tracks || []) {
            const i = tracks.findIndex((x) => x.id === t.id)
            if (i >= 0) tracks[i] = { ...tracks[i], ...t }
            else tracks.push(t)
          }
          const playlists = [...s.playlists]
          for (const p of saved.playlists || []) {
            const i = playlists.findIndex((x) => x.id === p.id)
            if (i >= 0) playlists[i] = { ...playlists[i], ...p }
            else playlists.push(p)
          }
          const removed = new Set(saved.removedIds || [])
          return { removed: [...removed], tracks: tracks.filter((t) => !removed.has(t.id)), playlists: playlists.filter((p) => !removed.has(p.id)), assignments: { ...s.assignments, ...(saved.assignments || {}) } }
        })
      }
    } catch {}
    set({ loaded: true })
  },

  async uploadTracks(files, playlistId) {
    set({ busy: 'Reading files…', error: null })
    const added = []
    try {
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

  updateTrack(id, patch) { set((s) => ({ tracks: s.tracks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })); persist() },
  async setArt(kind, id, file) {
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
    set({ tracks: DEMO_TRACKS, playlists: DEMO_PLAYLISTS, assignments: defaultAssignments(), removed: [] })
    await get().init()
  },

  exportManifest() {
    const { tracks, playlists, assignments } = get()
    const used = tracks.filter((t) => t.source !== 'generated')
    return {
      version: 1,
      tracks: used.map((t) => ({ id: t.id, title: t.title, artist: t.artist, file: t.source === 'url' ? t.url : `music/${t.fileName || t.id + '.mp3'}`, art: t.art || (t.artKey ? `music/art/${t.id}.jpg` : undefined) })),
      playlists: playlists.filter((p) => !p.demo).map(({ demo, fromManifest, artKey, ...p }) => p),
      assignments,
    }
  },
}))

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
