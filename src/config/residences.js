// Central character registry for Vision Storms Energy Exchanges: every major character gets an
// entry here (name, id, signature colors, residence assignment, clothing/animation/voice/access
// settings), whether or not their residence has been built yet. This does NOT touch any existing
// avatar-appearance config (src/config/outfits.js, the Avatar rig, NPC files) - it only adds new
// data for the Residence Tower (see src/world/assets/residence/). `built: true` entries have a
// `floor` in RESIDENCE_TOWER and a furnished unit; `built: false` entries are registered (name,
// colors, room wishlist) but have no residence yet - see the "what remains" note in the PR/commit
// message for next steps.
//
// `outfitPreset` points at an id in src/config/outfits.js (the existing Settings > Appearance
// outfit picker) where a reasonable match exists; it's a suggestion for the player's own avatar
// when visiting in that character's "look", not a change to any NPC's appearance.

export const RESIDENTS = [
  {
    id: 'trinity-reign',
    name: 'Trinity Reign',
    build: 'f',
    colors: { primary: '#5b1f8f', accent: '#ff2e9a', dark: '#0b0b0e', teal: '#00c2b8', gold: '#c9a96a' },
    rooms: ['lounge', 'recording studio', 'designer bedroom', 'walk-in closet', 'bathroom'],
    signature: 'studio',
    style: 'Luxury estate · black marble',
    outfitPreset: 'leopard',
    floor: 1,
    built: true,
  },
  {
    id: 'zion-reign',
    name: 'Zion Reign',
    build: 'm',
    colors: { primary: '#0b0b0e', accent: '#2d5fe0', dark: '#111318', teal: '#9aa4b2', gold: '#c9a96a' },
    rooms: ['luxury bedroom', 'entertainment area', 'private office', 'closet', 'bathroom'],
    signature: 'office',
    style: 'Masculine executive residence',
    outfitPreset: 'ceo',
    floor: 2,
    built: true,
  },
  {
    id: 'sage-green',
    name: 'Sage Green',
    build: 'f',
    colors: { primary: '#0f6b4f', accent: '#14b894', dark: '#0d1f1a', teal: '#2fd0c4', gold: '#c9a96a' },
    rooms: ['fashion displays', 'bedroom', 'gaming area', 'design studio', 'closet', 'bathroom'],
    signature: 'design',
    style: 'Modern creative residence',
    outfitPreset: 'tank',
    floor: 3,
    built: true,
  },
  {
    id: 'jade-green',
    name: 'Jade Green',
    build: 'f',
    colors: { primary: '#d46bb3', accent: '#b98fe0', dark: '#241a2e', teal: '#2fd0c4', gold: '#f4efff' },
    rooms: ['fashion studio', 'art room', 'bedroom', 'creative workspace', 'closet', 'bathroom'],
    signature: 'art',
    style: 'Artistic residence',
    outfitPreset: 'default',
    floor: 4,
    built: true,
  },
  {
    id: 'soleia-monroe',
    name: 'Soleia Monroe',
    brand: 'The Pink Standard',
    build: 'f',
    colors: { primary: '#ff2e9a', accent: '#8f1d3a', dark: '#2a0f16', teal: '#c9a96a', gold: '#c9a96a' },
    rooms: ['travel decor', 'beauty room', 'designer closet', 'lounge', 'bedroom', 'bathroom'],
    signature: 'beauty',
    style: 'Glamorous luxury suite',
    outfitPreset: 'default',
    floor: 5,
    built: true,
  },

  // --- registered, not yet built: next phase of the Residence Tower (floors 6+) ---
  { id: 'zaviont-everaux', name: 'Zaviont Everaux', build: 'm', colors: { primary: '#0b0b0e', accent: '#1fae8e', dark: '#0e1412', teal: '#1fd8c6', gold: '#f4efff' }, rooms: ['bedroom', 'lounge', 'botanical surround'], signature: 'tropical', style: 'Luxury tropical residence', built: false },
  { id: 'lira-everaux', name: 'Lira Everaux', build: 'f', colors: { primary: '#8a6fd1', accent: '#1fae8e', dark: '#20152e', teal: '#f3b3cf', gold: '#f4efff' }, rooms: ['bedroom', 'lounge', 'botanical surround'], signature: 'botanical', style: 'Botanical luxury residence', built: false },
  { id: 'malik-carter', name: 'Malik Carter', brand: 'Huge Vision', build: 'm', colors: { primary: '#14234f', accent: '#2d5fe0', dark: '#0b0b0e', teal: '#c9ced6', gold: '#c9a96a' }, rooms: ['business office', 'podcast studio', 'blueprint displays', 'bedroom', 'bathroom'], signature: 'podcast', style: 'Executive penthouse', built: false },
  { id: 'makai-freeman', name: 'Dr. Makai Freeman', build: 'm', colors: { primary: '#0b0b0e', accent: '#a97a3a', dark: '#1a1510', teal: '#c9a96a', gold: '#e9d8ab' }, rooms: ['library', 'study', 'historical displays', 'bedroom', 'bathroom'], signature: 'library', style: 'Research residence', built: false },
  { id: 'dr-sacred', name: 'Dr. Sacred', build: 'f', colors: { primary: '#5b1f8f', accent: '#2fd0c4', dark: '#1a1026', teal: '#2fd0c4', gold: '#f4efff' }, rooms: ['private consultation rooms', 'lounge', 'bedroom', 'bathroom'], signature: 'consult', style: 'Healing residence', built: false },
  { id: 'dr-scared', name: 'Dr. Scared', build: 'm', colors: { primary: '#2b2f36', accent: '#14234f', dark: '#101216', teal: '#9aa4b2', gold: '#c9ced6' }, rooms: ['bedroom', 'study', 'lounge'], signature: 'study', style: 'Contemporary residence', built: false },
  { id: 'dreylan-knox', name: 'Dreylan Knox', build: 'm', colors: { primary: '#0b0b0e', accent: '#6e1f2e', dark: '#141014', teal: '#3a3a3e', gold: '#c9a96a' }, rooms: ['loft living', 'bedroom', 'bathroom'], signature: 'loft', style: 'Luxury loft', built: false },
  { id: 'seraphina-reign', name: 'Seraphina Reign', build: 'f', colors: { primary: '#5b1f8f', accent: '#e9d8ab', dark: '#241a2e', teal: '#f4efff', gold: '#c9a96a' }, rooms: ['lounge', 'bedroom', 'bathroom'], signature: 'elegant', style: 'Elegant luxury residence', built: false },
  { id: 'tiana-renee', name: 'Tiana Renee', build: 'f', colors: { primary: '#e0399c', accent: '#f4efff', dark: '#2a0f16', teal: '#e8b4cf', gold: '#c9a96a' }, rooms: ['beauty room', 'bedroom', 'bathroom'], signature: 'beauty', style: 'Glamorous beauty residence', built: false },
  { id: 'elijah-storms', name: 'Elijah Storms', build: 'm', colors: { primary: '#14234f', accent: '#1f6b4a', dark: '#0b0b0e', teal: '#2fd0c4', gold: '#c9ced6' }, rooms: ['bedroom', 'lounge', 'bathroom'], signature: 'modern', style: 'Modern residence', built: false },
  { id: 'leo-vision', name: 'Leo Vision', build: 'm', colors: { primary: '#ffe83d', accent: '#2d5fe0', dark: '#1a1510', teal: '#ff8a3d', gold: '#ffe83d' }, rooms: ['interactive adventure bedroom', 'lounge'], signature: 'adventure', style: 'Interactive adventure bedroom', built: false },

  // --- family, prepared per the brief but not detailed yet ---
  { id: 'ruth-storms', name: 'Ruth Storms', build: 'f', colors: { primary: '#5b1f8f', accent: '#c9a96a', dark: '#1a1026', teal: '#f4efff', gold: '#c9a96a' }, rooms: ['bedroom', 'lounge', 'bathroom'], signature: 'family', style: 'Family residence', built: false },
  { id: 'marcus-storms', name: 'Marcus Storms', build: 'm', colors: { primary: '#14234f', accent: '#9aa4b2', dark: '#0b0b0e', teal: '#c9ced6', gold: '#c9a96a' }, rooms: ['bedroom', 'lounge', 'bathroom'], signature: 'family', style: 'Family residence', built: false },
  { id: 'denise-storms', name: 'Denise Storms', build: 'f', colors: { primary: '#8f1d3a', accent: '#e9d8ab', dark: '#241a2e', teal: '#f4efff', gold: '#c9a96a' }, rooms: ['bedroom', 'lounge', 'bathroom'], signature: 'family', style: 'Family residence', built: false },
  { id: 'toledo-monroe', name: 'Toledo Monroe', build: 'm', colors: { primary: '#ff2e9a', accent: '#c9a96a', dark: '#2a0f16', teal: '#f4efff', gold: '#c9a96a' }, rooms: ['bedroom', 'lounge', 'bathroom'], signature: 'family', style: 'Family residence', built: false },
]

export const residentById = (id) => RESIDENTS.find((r) => r.id === id)
export const BUILT_RESIDENTS = RESIDENTS.filter((r) => r.built)
