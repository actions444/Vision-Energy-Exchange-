// The eight Texas destinations from the tested world map (Vision Reign Exchanges worldConfig).
// `map` is the position on the schematic map, taken from those cities' gameWorldCenter divided by 1000.
// Only Houston and Galveston are built in this world; the rest are shown but not yet travelable.
export const CITIES = [
  { id: 'houston', name: 'Houston', area: 'downtown', description: 'Major metropolitan center', map: [0, 0], built: true },
  { id: 'pearland', name: 'Pearland', area: 'suburban', description: 'Suburban town center', map: [-4, 5], built: false },
  { id: 'webster', name: 'Webster', area: 'commercial', description: 'NASA area commercial district', map: [4, 2], built: false },
  { id: 'lufkin', name: 'Lufkin', area: 'east_texas', description: 'East Texas regional center', map: [8, -12], built: false },
  { id: 'baytown', name: 'Baytown', area: 'industrial', description: 'Industrial and waterfront area', map: [6, 1], built: false },
  { id: 'conroe', name: 'Conroe', area: 'lake_recreation', description: 'Lake Conroe recreation area', map: [2, -12], built: false },
  { id: 'pasadena', name: 'Pasadena', area: 'suburban_residential', description: 'Residential and industrial mix', map: [5, 3], built: false },
  { id: 'galveston', name: 'Galveston', area: 'beach_waterfront', description: 'Beach and seawall, over the I-45 bridge', map: [-2, 12], built: true },
]
