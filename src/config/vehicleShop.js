// Which vehicles cost VSE credits vs. are already free to drive, and their prices.
// The Plaza's original SUV/sedan/pickup/4x4 (suv-1, sedan-1, pickup-1, 4x4-1) stay free — they
// were the starter fleet before this economy existed, and nothing about them changes.
// Everything in the Vision Motors & Skyport showroom, the beach fleet on Isla Serena, and the
// Skyport jets is priced: buy it once (useJobs.buyVehicle, same wallet as everything else) and
// it's yours to drive any time after, GTA/dealership style. A vehicle with no entry here is free.
export const VEHICLE_PRICES = {
  'regent-1': 2200,
  'volt-1': 1400,
  'meridian-1': 1300,
  'highland-1': 1500,
  'pioneer-1': 950,
  'estate-limo': 2400,
  'estate-monarch': 2100,
  'estate-volt': 1450,
  'sling-1': 1100,
  'sling-2': 1100,
  'cruiser-1': 450,
  'cruiser-2': 450,
  'razor-1': 520,
  'razor-2': 520,
  'bastion-1': 1600,
  'jetski-1': 650,
  'jetski-2': 650,
  'jetski-3': 650,
  'jetski-4': 650,
  'jet-1': 5200,
  'jet-2': 6400,
}
export const priceOf = (spawnId) => VEHICLE_PRICES[spawnId] || 0
