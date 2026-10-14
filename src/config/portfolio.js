// Trinity Reign portfolio content, carried over from the original site.
// Edit this file to update what the gallery kiosks show.
import { NEON } from './theme.js'

export const ARTIST = {
  name: 'Trinity Reign',
  roles: 'Producer · Writer · Filmmaker · Storyteller',
  tagline: 'One creator, every medium. Beats and lyrics, AI-made films, audiobooks and ebooks, all built under one name.',
}

// Each craft becomes a kiosk inside the Reign Gallery.
// `items` are what visitors see when they open the kiosk; replace the examples with real titles and links.
export const CRAFTS = [
  {
    id: 'music',
    title: 'Music Production',
    spec: 'Production · BPM · Stems',
    color: NEON.pink,
    blurb: 'Original beats and full productions, from first drum loop to final mix.',
    action: 'Listen',
    items: [{ label: 'Play the gallery demo beat', kind: 'beat' }, { label: 'Load one of your tracks from this device', kind: 'track' }],
  },
  {
    id: 'lyrics',
    title: 'Lyrics & Songwriting',
    spec: 'Verse · Hook · Bridge',
    color: NEON.yellow,
    blurb: 'Words written to be sung: hooks that stick and verses with a story.',
    action: 'Read',
    items: [{ label: 'Example: add a lyric sheet title here' }],
  },
  {
    id: 'recordings',
    title: 'Sound Recordings',
    spec: 'Masters · WAV · 24-bit',
    color: NEON.teal,
    blurb: 'Finished, released recordings ready for licensing and playlists.',
    action: 'Hear',
    items: [{ label: 'Example: add a released recording here' }],
  },
  {
    id: 'films',
    title: 'AI-Generated Films',
    spec: 'Runtime · Scenes · 4K',
    color: NEON.purple,
    blurb: 'Short films and visual stories made with AI tools and a director’s eye.',
    action: 'Watch',
    items: [{ label: 'Play one of your films on the gallery screen', kind: 'video' }],
  },
  {
    id: 'audiobooks',
    title: 'Audiobooks',
    spec: 'Chapters · Narration',
    color: NEON.teal,
    blurb: 'Stories you can press play on, narrated and produced in-house.',
    action: 'Play',
    items: [{ label: 'Load an audiobook chapter from this device', kind: 'track' }],
  },
  {
    id: 'ebooks',
    title: 'Ebooks',
    spec: 'EPUB · PDF · Pages',
    color: NEON.yellow,
    blurb: 'Written work published digitally, for reading on any screen.',
    action: 'Read',
    items: [{ label: 'Example: add an ebook title and store link here' }],
  },
  {
    id: 'websites',
    title: 'Websites',
    spec: 'Design · Build · Launch',
    color: NEON.pink,
    blurb: 'Sites built for personal brands and businesses, including this world.',
    action: 'Visit',
    items: [{ label: 'Example: add a website you built here' }],
  },
]

export const LATEST = {
  id: 'latest',
  title: 'New project title',
  spec: 'Latest drop',
  color: NEON.pink,
  blurb: 'Spotlight your newest release here: an album, a film or a book, with a short line on what it’s about.',
  tracks: [
    ['01', 'Opening track', '3:12'],
    ['02', 'Lead single', '2:58'],
    ['03', 'Interlude', '1:24'],
    ['04', 'Closing track', '4:05'],
  ],
  note: 'Example tracklist. Swap in your real titles and run times.',
}

export const CONNECT = {
  id: 'connect',
  title: 'Let’s make something loud.',
  spec: 'Connect',
  color: NEON.yellow,
  blurb: 'Collaborations, features, licensing and commissions. Find me on any channel and reach out.',
  socials: [
    ['Instagram', '@your-handle'],
    ['YouTube', '@your-channel'],
    ['TikTok', '@your-handle'],
    ['Business', 'your email here'],
  ],
}

export function findContent(id) {
  if (id === 'latest') return LATEST
  if (id === 'connect') return CONNECT
  return CRAFTS.find((c) => c.id === id)
}
