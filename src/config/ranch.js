// Vision Storms Ranch: buyable land plots in Maple Court (West End Phase 4, the block reserved
// behind Harbor Parade). Six fenced lots along a dirt access road - walk up to a lot's sign to buy
// it for real credits out of the wallet (state/jobs.js buyPlot), then once it's yours, buy horses,
// cattle, sheep or pigs to stock it with (buyAnimal/sellAnimal), up to a small cap per lot. This is
// an honest economy feature like the hotel and the bank: real spend, real ownership record, no
// farming sim underneath - the animals are a herd you own and look at, not creatures to raise.
export const RANCH = { x0: -202, x1: -132, z0: 53, z1: 97 }
export const GROUND = 0.15 // matches the raised Maple Court block slab (westend.js BLOCKS.se)
export const ROAD_Z = 51.6 // the access road frontage, just south of the lot row (off the Harbor Parade plaza)

export const PLOT_ANIMAL_CAP = 6

export const PLOTS = [
  { id: 'ranch-a1', name: 'Ranch Lot A1', x0: -200, x1: -180, z0: 54, z1: 73, price: 2600 },
  { id: 'ranch-a2', name: 'Ranch Lot A2', x0: -177, x1: -157, z0: 54, z1: 73, price: 2600 },
  { id: 'ranch-a3', name: 'Ranch Lot A3', x0: -154, x1: -134, z0: 54, z1: 73, price: 2600 },
  { id: 'ranch-b1', name: 'Ranch Lot B1', x0: -200, x1: -180, z0: 77, z1: 96, price: 2200 },
  { id: 'ranch-b2', name: 'Ranch Lot B2', x0: -177, x1: -157, z0: 77, z1: 96, price: 2200 },
  { id: 'ranch-b3', name: 'Ranch Lot B3', x0: -154, x1: -134, z0: 77, z1: 96, price: 2200 },
]
export const plotById = (id) => PLOTS.find((p) => p.id === id)

export const ANIMALS = [
  { id: 'horse', name: 'Horse', price: 950, color: '#5a3b26', accent: '#2a1c12' },
  { id: 'cattle', name: 'Cow', price: 700, color: '#efe6d4', accent: '#2a2420' },
  { id: 'sheep', name: 'Sheep', price: 240, color: '#f4f1e8', accent: '#4a4a4a' },
  { id: 'pig', name: 'Pig', price: 280, color: '#e7a9a1', accent: '#c47d73' },
]
export const animalById = (id) => ANIMALS.find((a) => a.id === id)

// Houses you can build on an owned plot - three real, walkable, furnished tiers, back of the lot
// so the yard in front stays free for a herd. Replacing a built house with a different tier trades
// the old one in at half price, same as selling an animal back.
export const HOUSE_TIERS = [
  { id: 'cabin', name: 'Starter Cabin', price: 1800, w: 6, d: 6, h: 2.7, wall: '#8a6a4a', roof: '#3a2c20', desc: 'A simple one-room cabin - a bed, a table, a roof over your head.' },
  { id: 'farmhouse', name: 'Ranch Farmhouse', price: 4200, w: 8, d: 7.5, h: 3.1, wall: '#e8e0cf', roof: '#5a3b2a', desc: 'A proper farmhouse with a sitting room and a real bedroom.' },
  { id: 'estate', name: 'Ranch Estate', price: 8200, w: 10, d: 8.5, h: 3.5, wall: '#f4efe4', roof: '#2a2a2d', desc: 'The big house on the lot - more room, nicer finish, room to entertain.' },
]
export const houseTierById = (id) => HOUSE_TIERS.find((t) => t.id === id)
