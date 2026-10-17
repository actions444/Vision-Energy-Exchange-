// Outfit presets for the Social avatar. Each returns extra `look` fields for the given build ('f' | 'm').
// Looks are original wardrobe combinations (scrubs and coat, boardroom suit, animal-print top, tank and
// leggings, camel overcoat); nothing here copies a real person.
export const OUTFITS = [
  { id: 'default', label: 'Everyday', make: () => ({}) },
  {
    id: 'doctor', label: 'Doctor',
    make: (b) => ({ top: b === 'f' ? '#7a1c2e' : '#14234f', bottom: b === 'f' ? '#7a1c2e' : '#14234f', coat: '#f6f7f9', stethoscope: true, badge: true, shoe: '#f2f2f4', hoops: b === 'f' }),
  },
  {
    id: 'ceo', label: 'CEO suit',
    make: (b) => ({ top: '#0b0b0e', bottom: '#0b0b0e', blazer: true, shirt: b === 'f' ? '#0b0b0e' : '#f6f4f1', tie: '#5b2a8c', pendant: '#9b4fe0', shoe: '#08080b' }),
  },
  {
    id: 'leopard', label: 'Leopard top',
    make: () => ({ top: '#b07a2e', pattern: 'leopard', sleeveless: true, bottom: '#0b0b0e', barefoot: true, chain: 'gold', hoops: true }),
  },
  {
    id: 'tank', label: 'Tank & leggings',
    make: (b) => ({ top: '#f4f4f2', sleeveless: true, bottom: '#0c0c0f', barefoot: true, chain: 'silver', braids: b === 'f', hoops: b === 'f' }),
  },
  {
    id: 'camel', label: 'Camel coat',
    make: () => ({ top: '#0c0c0f', bottom: '#0d0d10', coat: '#b9783d', turtleneck: true, shoe: '#9a5e2e', chain: 'gold', pendant: '#d4af5a' }),
  },
]
export const outfitLook = (id, build) => (OUTFITS.find((o) => o.id === id) || OUTFITS[0]).make(build || 'm')
