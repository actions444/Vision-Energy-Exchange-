// Business stakes: buy into an existing Vision Storms business once, and it pays you a share of
// its daily takings automatically, every world day, win or lose — a passive-income layer on top
// of the wage jobs (config/jobs.js). This is credits (useJobs), never the real-money rentals
// system (rentals/client.js) — a stake here does not touch anyone's rental bookings or payouts.
export const BUSINESSES = [
  { id: 'ironing-station', name: 'The Purple Ironing Station', desc: 'A stake in the Harbor Parade pressing shop — a cut of every pay-at-the-register visit.', price: 1200, dailyIncome: 40 },
  { id: 'car-wash', name: 'Vision Car Wash', desc: "A stake in the city's car wash — steady traffic, steady returns.", price: 900, dailyIncome: 30 },
  { id: 'vision-cinema', name: 'Vision Cinema', desc: 'A stake in the 22-screen cinema tower — box office and concessions.', price: 2600, dailyIncome: 75 },
  { id: 'vision-motors', name: 'Vision Motors & Skyport', desc: "A stake in the city's vehicle dealership and jet skyport.", price: 3400, dailyIncome: 95 },
]
export const businessById = (id) => BUSINESSES.find((x) => x.id === id)
