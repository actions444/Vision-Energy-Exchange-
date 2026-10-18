// VISION STORMS EXCHANGES — mall Phase 1 (per the Master Build Prompt's own phase plan).
// Footprint checked against every box in City.jsx's RESERVED list - clear of all existing buildings.
export const MALL = { x0: 40, x1: 100, z0: 76, z1: 110 }
export const GROUND = 0.15
export const T = 0.4 // wall thickness, matches the rest of the city's institutional shells
export const H = 7.5 // atrium clear height (tall, per the spec's "high ceilings")

// Four Phase-1 storefronts, each a shallow bay opening onto the atrium. Mock/placeholder catalog
// only - there is no real Shopify Storefront API token yet. Swap `products` for live Shopify data
// once the user provides one; nothing here should be read as a real, tested integration until then.
export const STORES = [
  {
    id: 'womens', name: "Women's Clothing", accent: '#ff2fa0', tagline: 'Dresses, outerwear & more',
    products: [
      { id: 'w-dress-1', name: 'Midnight Slip Dress', price: 68 },
      { id: 'w-coat-1', name: 'Wool Trench Coat', price: 145 },
      { id: 'w-top-1', name: 'Silk Camisole', price: 42 },
      { id: 'w-jean-1', name: 'High-Rise Denim', price: 58 },
    ],
  },
  {
    id: 'mens', name: "Men's Clothing", accent: '#2fd0c4', tagline: 'Everyday staples & suiting',
    products: [
      { id: 'm-shirt-1', name: 'Oxford Button-Down', price: 54 },
      { id: 'm-jacket-1', name: 'Bomber Jacket', price: 128 },
      { id: 'm-chino-1', name: 'Tailored Chinos', price: 62 },
      { id: 'm-suit-1', name: 'Two-Piece Suit', price: 240 },
    ],
  },
  {
    id: 'electronics', name: 'Electronics', accent: '#9b4fe0', tagline: 'Audio, phones & accessories',
    products: [
      { id: 'e-buds-1', name: 'Wireless Earbuds', price: 89 },
      { id: 'e-watch-1', name: 'Smart Watch', price: 199 },
      { id: 'e-speaker-1', name: 'Bluetooth Speaker', price: 59 },
      { id: 'e-phone-1', name: 'Vision Phone 5', price: 699 },
    ],
  },
  {
    id: 'beauty', name: 'Beauty & Cosmetics', accent: '#e8c35a', tagline: 'Skincare, makeup & fragrance',
    products: [
      { id: 'b-serum-1', name: 'Vitamin C Serum', price: 32 },
      { id: 'b-palette-1', name: 'Eyeshadow Palette', price: 28 },
      { id: 'b-perfume-1', name: 'Signature Eau de Parfum', price: 76 },
      { id: 'b-kit-1', name: 'Skincare Starter Kit', price: 49 },
    ],
  },
]

export const storeById = (id) => STORES.find((s) => s.id === id)
export const productById = (storeId, productId) => storeById(storeId)?.products.find((p) => p.id === productId)
