// Jobs & payroll data: the Employment District layout, every job, every uniform, every work stop.
// Pure data (no three.js), so the store, the panel and the 3D world all read the same facts.
//
// How a job works:
//   1. Hire on at the Job Center (job board kiosk).
//   2. Buy that job's uniform at the Job Center uniform shop.
//   3. Clock in at the job's time clock (Post Office, a car wash, or the Job Center).
//   4. Walk the route: each stop is a short task, paid per stop into your pay period.
//   5. Pay lands in your wallet on payday, set by your pay schedule (weekly / bi-weekly / monthly / yearly).

export const CURB = 0.15

// ---- the Employment District (east of the avenue, south of Justice, west of the concert stage) ----
export const JC = { x0: 54, x1: 76, z0: 30, z1: 48 } // Job Center, door on the south face
export const PO = { x0: 40, x1: 62, z0: 54, z1: 66 } // Post Office, door on the south face
export const WASH_A = { id: 'carwashA', name: 'Storm Shine Express Wash', x0: 36, z0: 30, w: 14, l: 22 }
export const WASH_B = { id: 'carwashB', name: 'Quick Bay Wash', x0: -122, z0: 30, w: 14, l: 22 }
export const COURTYARD = { x0: 50, x1: 82, z0: 48, z1: 54 }
export const DISTRICT = { x0: 34, x1: 83, z0: 28, z1: 68 }

/** Car wash local (u across, v along the tunnel) to world. */
export const cwWorld = (w, u, v) => [w.x0 + u, w.z0 + v]
// Local layout of a car wash (see CarWash.jsx): tunnel u 4.6..9.0, v 3..19; office u 0..3.9, v 3.4..11.4;
// vacuum bays u 10.8..14.
export const WASH_LANE = { u0: 4.6, u1: 9.0, v0: 3, v1: 19, roof: 4.4 }
export const WASH_PRICE = 12 // credits for a tunnel wash
export const WASH_SECONDS = 16

export const IRON_PRICE = 8 // credits for a same-visit pressing at a Purple Ironing Station register

// ---- pay schedules ----
// Longer periods pay a loyalty bonus on that period's earnings.
export const PAY = {
  weekly: { id: 'weekly', label: 'Weekly', days: 7, bonus: 0, note: 'Paid every 7 days.' },
  biweekly: { id: 'biweekly', label: 'Bi-weekly', days: 14, bonus: 0.02, note: 'Paid every 14 days, +2% bonus.' },
  monthly: { id: 'monthly', label: 'Monthly', days: 30, bonus: 0.05, note: 'Paid every 30 days, +5% bonus.' },
  yearly: { id: 'yearly', label: 'Yearly', days: 365, bonus: 0.12, note: 'Paid every 365 days, +12% bonus.' },
}
export const PAY_ORDER = ['weekly', 'biweekly', 'monthly', 'yearly']
export const START_WALLET = 250
export const ROUTE_BONUS = 0.1 // finishing a whole route adds 10% of the shift wage

// ---- uniforms (the player must buy the one their job requires) ----
export const UNIFORMS = {
  postal: { id: 'postal', name: 'Postal blue jacket', price: 38, suit: '#1d3f8f', pants: '#2a2d3a', trim: '#e6322f', hat: '#1d3f8f', vest: null },
  carrier: { id: 'carrier', name: 'Carrier route kit', price: 45, suit: '#2c6fd0', pants: '#3a4156', trim: '#f2c230', hat: '#274c9e', vest: null },
  sorter: { id: 'sorter', name: 'Sorting-floor apron', price: 26, suit: '#8a8f99', pants: '#2a2d3a', trim: '#e3b52c', hat: null, vest: '#e3b52c' },
  pclerk: { id: 'pclerk', name: 'Counter clerk shirt', price: 34, suit: '#cfd8ea', pants: '#1f2a44', trim: '#1d3f8f', hat: null, vest: null },
  wash: { id: 'wash', name: 'Wash crew polo & cap', price: 25, suit: '#12a7e0', pants: '#202533', trim: '#ffffff', hat: '#12a7e0', vest: null },
  detail: { id: 'detail', name: 'Detailer coveralls', price: 40, suit: '#2b2f38', pants: '#2b2f38', trim: '#ff6a1f', hat: '#2b2f38', vest: null },
  office: { id: 'office', name: 'Office shirt & slacks', price: 40, suit: '#e9edf2', pants: '#242a3a', trim: '#c9a96a', hat: null, vest: null },
  reception: { id: 'reception', name: 'Reception blazer', price: 55, suit: '#5b2a62', pants: '#1b1624', trim: '#e0c97a', hat: null, vest: null },
  retail: { id: 'retail', name: 'Retail vest', price: 30, suit: '#2a2a2f', pants: '#1b1e26', trim: '#ffffff', hat: null, vest: '#d6433b' },
  janitor: { id: 'janitor', name: 'Facilities overalls', price: 28, suit: '#6a7a8a', pants: '#4b5663', trim: '#e3b52c', hat: null, vest: null },
  guard: { id: 'guard', name: 'Security uniform', price: 65, suit: '#14243f', pants: '#101826', trim: '#d8d8d8', hat: '#14243f', vest: null },
  hivis: { id: 'hivis', name: 'Hi-vis crew gear', price: 32, suit: '#3b4350', pants: '#2a313c', trim: '#d7f03c', hat: '#f2c230', vest: '#d7f03c' },
  garden: { id: 'garden', name: 'Groundskeeper greens', price: 32, suit: '#3d7a4a', pants: '#4a4033', trim: '#d9c9a0', hat: '#c9b38a', vest: null },
  crew: { id: 'crew', name: 'Stage crew blacks', price: 36, suit: '#101012', pants: '#101012', trim: '#e0559f', hat: null, vest: null },
  courier: { id: 'courier', name: 'Courier jacket', price: 48, suit: '#e0782a', pants: '#1b1e26', trim: '#ffffff', hat: '#1b1e26', vest: null },
  gate: { id: 'gate', name: 'Gate agent uniform', price: 52, suit: '#1b3a6e', pants: '#15223a', trim: '#f2c230', hat: null, vest: null },
  tsa: { id: 'tsa', name: 'Airport security uniform', price: 60, suit: '#2a3344', pants: '#1a202c', trim: '#6fb8ff', hat: '#2a3344', vest: null },
  ramp: { id: 'ramp', name: 'Ramp crew hi-vis', price: 34, suit: '#ff8a1f', pants: '#2a2d3a', trim: '#f2f2f2', hat: '#2a2d3a', vest: '#f2f2f2' },
}

// ---- sites: where you clock in ----
export const SITES = {
  postoffice: { id: 'postoffice', name: 'Post Office', pos: [43.0, 62.6] },
  jobcenter: { id: 'jobcenter', name: 'Job Center', pos: [65.3, 32.3] },
  carwashA: { id: 'carwashA', name: WASH_A.name, pos: cwWorld(WASH_A, 1.4, 6.4) },
  carwashB: { id: 'carwashB', name: WASH_B.name, pos: cwWorld(WASH_B, 1.4, 6.4) },
  airport: { id: 'airport', name: 'Vision Storms International Airport', pos: [-460, 5] },
}

// ---- work stops ----
// secs = how long the task takes (stand near it while it runs). Car wash stops are written once with
// an '@' prefix and expanded for each wash.
const S = (id, label, verb, x, z, secs = 3) => ({ id, label, verb, x, z, secs })

const LOCAL_WASH_STOPS = [
  ['prerinse', 'Pre-rinse station', 'Pre-rinse the car', 10.1, 2.2, 3.5],
  ['foam', 'Foam booth', 'Run the foam wand', 10.1, 6.0, 3.5],
  ['towel', 'Exit towel-dry', 'Towel-dry the car', 9.9, 20.6, 4],
  ['vac1', 'Vacuum bay 1', 'Vacuum the interior', 11.4, 6.0, 4],
  ['vac2', 'Vacuum bay 2', 'Vacuum the interior', 11.4, 11.0, 4],
  ['polish', 'Polish bay', 'Polish the paint', 11.4, 16.0, 4.5],
  ['kiosk', 'Pay kiosk', 'Help a customer at the kiosk', 3.0, 2.4, 3],
  ['desk', 'Wash office desk', 'Log the day\'s tickets', 2.0, 8.0, 3.5],
  ['supplies', 'Supply shelf', 'Restock soap and towels', 0.9, 10.2, 3],
]

const STOP_LIST = [
  // Post Office
  S('po-window', 'Counter window', 'Serve a customer at the window', 50, 62.0, 3.5),
  S('po-scale', 'Parcel scale', 'Weigh and stamp a parcel', 45, 62.0, 3.5),
  S('po-boxes', 'P.O. box wall', 'Fill the P.O. boxes', 41.7, 57.5, 3),
  S('po-sortA', 'Sorting table A', 'Sort letters by route', 45.2, 63.4, 4),
  S('po-sortB', 'Sorting table B', 'Sort parcels by route', 49.2, 63.4, 4),
  S('po-sortC', 'Sorting table C', 'Bundle outgoing mail', 53.4, 63.4, 4),
  S('po-cage', 'Mail cage', 'Load the mail cage', 58.0, 63.8, 3),
  S('po-dock', 'Loading dock', 'Load or unload the mail truck', 60.4, 62.6, 3),
  // street mailboxes
  S('mb-lounge', 'Street mailbox (Lounge)', 'Empty the mailbox', 7.0, 44, 2.5),
  S('mb-north', 'Street mailbox (Avenue North)', 'Empty the mailbox', 7.0, 62, 2.5),
  S('mb-far', 'Street mailbox (Justice Gate)', 'Empty the mailbox', 7.0, 92, 2.5),
  S('mb-plazaN', 'Street mailbox (Plaza North)', 'Empty the mailbox', -7.0, 62, 2.5),
  S('mb-plazaS', 'Street mailbox (Plaza)', 'Empty the mailbox', -7.0, 40, 2.5),
  // delivery addresses
  S('ad-lounge', 'Vision Music Lounge', 'Deliver the mail', 8.7, 44, 2.5),
  S('ad-plaza', 'Energy Exchanges Plaza', 'Deliver the mail', -8.4, 48, 2.5),
  S('ad-records', 'Storms Records', 'Deliver the mail', 8.7, -7, 2.5),
  S('ad-cinema', 'Vision Cinema', 'Deliver the mail', -8.4, -7, 2.5),
  S('ad-gallery', 'Reign Gallery', 'Deliver the mail', -1.3, -29.2, 2.5),
  S('ad-jobs', 'Job Center', 'Deliver the mail', 66.4, 29.2, 2.5),
  // Job Center
  S('jc-front', 'Front desk', 'Greet and sign in visitors', 60, 35.4, 3.5),
  S('jc-phones', 'Phone desk', 'Answer the phones', 62.6, 35.4, 3.5),
  S('jc-signin', 'Sign-in podium', 'Check the visitor log', 58.2, 33.0, 3),
  S('jc-files', 'File cabinets', 'File the paperwork', 57.4, 46.3, 3.5),
  S('jc-copier', 'Copier', 'Copy and collate forms', 61.2, 46.3, 3.5),
  S('jc-desk', 'Back-office desk', 'Process applications', 63.6, 44.6, 4),
  S('jc-rackA', 'Uniform rack A', 'Fold and hang uniforms', 68.2, 45.0, 3.5),
  S('jc-rackB', 'Uniform rack B', 'Restock the sizes', 72.2, 45.0, 3.5),
  S('jc-register', 'Shop register', 'Ring up a sale', 72.0, 35.6, 3),
  S('jc-mop', 'Hall floor', 'Mop the marble floor', 60.0, 40.0, 4.5),
  S('jc-bins', 'Waste bins', 'Empty the bins', 63.6, 38.6, 3),
  S('jc-window', 'Front windows', 'Clean the windows', 58.4, 31.4, 4),
  // courtyard + district
  S('gd-jc', 'Job Center entrance', 'Check the entrance', 63.0, 29.2, 3),
  S('gd-cw', 'Car wash entrance', 'Check the car wash', 47.4, 29.2, 3),
  S('gd-po', 'Post Office entrance', 'Check the entrance', 51.0, 52.8, 3),
  S('gd-court', 'Courtyard', 'Walk the courtyard', 66.0, 52.4, 3),
  S('gd-lot', 'Mail truck lot', 'Check the truck lot', 72.0, 58.0, 3),
  S('gr-1', 'Planter 1', 'Water and trim the planter', 56.5, 50.2, 4),
  S('gr-2', 'Planter 2', 'Water and trim the planter', 66.5, 50.2, 4),
  S('gr-3', 'Planter 3', 'Water and trim the planter', 72.5, 50.2, 4),
  S('gr-4', 'Planter 4', 'Water and trim the planter', 78.0, 50.2, 4),
  // street sweeping (avenue sidewalks)
  S('sw-1', 'Avenue sidewalk (east, south)', 'Sweep the sidewalk', 7.6, -2, 4),
  S('sw-2', 'Avenue sidewalk (east, mid)', 'Sweep the sidewalk', 7.6, 30.5, 4),
  S('sw-3', 'Avenue sidewalk (east, north)', 'Sweep the sidewalk', 7.6, 56, 4),
  S('sw-4', 'Avenue sidewalk (west, north)', 'Sweep the sidewalk', -7.6, 52, 4),
  S('sw-5', 'Avenue sidewalk (west, south)', 'Sweep the sidewalk', -7.6, -2, 4),
  // concert stage crew
  S('sh-west', 'Stage left', 'Coil the cables', 80.8, 41, 4),
  S('sh-back', 'Backstage', 'Check the lighting rig', 96, 48.6, 4),
  S('sh-east', 'Stage right', 'Move the road cases', 111.2, 41, 4),
  // Vision Storms International Airport
  S('ap-checkin', 'Check-in counter', 'Check in a passenger', -460, 5, 4),
  S('ap-boardingA', 'Gate A boarding desk', 'Scan boarding passes', -430, -6, 4),
  S('ap-boardingB', 'Gate B boarding desk', 'Scan boarding passes', -420, -6, 4),
  S('ap-security', 'Security scanner', 'Screen a passenger', -450, -2, 4),
  S('ap-bagcheck', 'Bag X-ray', 'Check a bag', -452, -4, 3.5),
  S('ap-baggage', 'Baggage carousel', 'Load the carousel', -440, 2, 4),
  S('ap-cart', 'Baggage cart', 'Load the cart', -436, 4.5, 3.5),
  S('ap-ramp', 'Apron ramp', 'Marshal the aircraft', -405, 22, 4.5),
  S('ap-tow', 'Tow tractor', 'Tow the baggage train', -405, 32, 4),
]

// expand the car wash stops for both washes
for (const w of [WASH_A, WASH_B]) {
  for (const [k, label, verb, u, v, secs] of LOCAL_WASH_STOPS) {
    const [x, z] = cwWorld(w, u, v)
    STOP_LIST.push(S(`${w.id}:${k}`, label, verb, x, z, secs))
  }
}

export const STOPS = Object.fromEntries(STOP_LIST.map((s) => [s.id, s]))

// ---- jobs ----
// `site` lists where the job's time clock is. '@' in a route is replaced by the wash you clocked in at.
const CW = ['carwashA', 'carwashB']
export const JOBS = [
  // Mail
  { id: 'mail-collector', title: 'Mail Collector', cat: 'Mail', site: ['postoffice'], uniform: 'postal', wage: 58, shirt: '#1d3f8f', pants: '#2a2d3a',
    desc: 'Empty the street mailboxes along the avenue and bring the bags back to the loading dock.',
    route: ['mb-lounge', 'mb-north', 'mb-far', 'mb-plazaN', 'mb-plazaS', 'po-dock'] },
  { id: 'mail-carrier', title: 'Mail Carrier', cat: 'Mail', site: ['postoffice'], uniform: 'carrier', wage: 84, shirt: '#2c6fd0', pants: '#3a4156',
    desc: 'Pick up your route bag and deliver mail to the shops and venues on the avenue.',
    route: ['po-dock', 'ad-lounge', 'ad-plaza', 'ad-records', 'ad-cinema', 'ad-gallery', 'ad-jobs'] },
  { id: 'postal-clerk', title: 'Postal Clerk', cat: 'Mail', site: ['postoffice'], uniform: 'pclerk', wage: 52, shirt: '#cfd8ea', pants: '#1f2a44',
    desc: 'Work the counter: serve customers, weigh parcels and keep the P.O. boxes filled.',
    route: ['po-window', 'po-scale', 'po-boxes'] },
  { id: 'mail-sorter', title: 'Mail Sorter', cat: 'Mail', site: ['postoffice'], uniform: 'sorter', wage: 50, shirt: '#8a8f99', pants: '#2a2d3a',
    desc: 'Sort letters and parcels by route in the back room.',
    route: ['po-sortA', 'po-sortB', 'po-sortC', 'po-cage'] },
  { id: 'courier', title: 'Express Courier', cat: 'Mail', site: ['postoffice'], uniform: 'courier', wage: 78, shirt: '#e0782a', pants: '#1b1e26',
    desc: 'Rush envelopes to the lounge, the plaza and the cinema, then back to the dock.',
    route: ['po-dock', 'ad-plaza', 'ad-lounge', 'ad-cinema', 'po-dock'] },
  // Car wash
  { id: 'wash-attendant', title: 'Car Wash Attendant', cat: 'Car wash', site: CW, uniform: 'wash', wage: 50, shirt: '#12a7e0', pants: '#202533',
    desc: 'Pre-rinse and foam the cars at the tunnel mouth, then towel-dry them at the exit.',
    route: ['@:prerinse', '@:foam', '@:towel'] },
  { id: 'detailer', title: 'Detailer', cat: 'Car wash', site: CW, uniform: 'detail', wage: 66, shirt: '#2b2f38', pants: '#2b2f38',
    desc: 'Vacuum interiors and polish paint in the detail bays.',
    route: ['@:vac1', '@:vac2', '@:polish'] },
  { id: 'wash-host', title: 'Wash Host', cat: 'Car wash', site: CW, uniform: 'wash', wage: 46, shirt: '#12a7e0', pants: '#202533',
    desc: 'Help customers at the pay kiosk, log tickets in the office and restock supplies.',
    route: ['@:kiosk', '@:desk', '@:supplies'] },
  // Office and retail
  { id: 'office-clerk', title: 'Office Clerk', cat: 'Office', site: ['jobcenter'], uniform: 'office', wage: 58, shirt: '#e9edf2', pants: '#242a3a',
    desc: 'File paperwork, run the copier and process job applications.',
    route: ['jc-files', 'jc-copier', 'jc-desk'] },
  { id: 'receptionist', title: 'Receptionist', cat: 'Office', site: ['jobcenter'], uniform: 'reception', wage: 56, shirt: '#5b2a62', pants: '#1b1624',
    desc: 'Greet visitors, answer the phones and keep the sign-in log.',
    route: ['jc-front', 'jc-phones', 'jc-signin'] },
  { id: 'retail-clerk', title: 'Uniform Shop Clerk', cat: 'Retail', site: ['jobcenter'], uniform: 'retail', wage: 50, shirt: '#2a2a2f', pants: '#1b1e26',
    desc: 'Stock the uniform racks and ring up sales at the register.',
    route: ['jc-rackA', 'jc-rackB', 'jc-register'] },
  { id: 'janitor', title: 'Janitor', cat: 'Facilities', site: ['jobcenter'], uniform: 'janitor', wage: 46, shirt: '#6a7a8a', pants: '#4b5663',
    desc: 'Mop the marble, empty the bins and clean the front windows.',
    route: ['jc-mop', 'jc-bins', 'jc-window'] },
  // Outdoors, security, events
  { id: 'security-guard', title: 'Security Guard', cat: 'Security', site: ['jobcenter'], uniform: 'guard', wage: 68, shirt: '#14243f', pants: '#101826',
    desc: 'Patrol the district: entrances, the courtyard and the truck lot.',
    route: ['gd-jc', 'gd-cw', 'gd-po', 'gd-court', 'gd-lot'] },
  { id: 'street-sweeper', title: 'Street Sweeper', cat: 'City services', site: ['jobcenter'], uniform: 'hivis', wage: 54, shirt: '#3b4350', pants: '#2a313c',
    desc: 'Sweep the avenue sidewalks, north to south.',
    route: ['sw-2', 'sw-3', 'sw-4', 'sw-5', 'sw-1'] },
  { id: 'gardener', title: 'Groundskeeper', cat: 'City services', site: ['jobcenter'], uniform: 'garden', wage: 56, shirt: '#3d7a4a', pants: '#4a4033',
    desc: 'Water and trim the courtyard planters.',
    route: ['gr-1', 'gr-2', 'gr-3', 'gr-4'] },
  { id: 'stagehand', title: 'Stagehand', cat: 'Events', site: ['jobcenter'], uniform: 'crew', wage: 64, shirt: '#101012', pants: '#101012',
    desc: 'Work the Grand Concert Stage: cables, rigging and road cases.',
    route: ['sh-west', 'sh-back', 'sh-east'] },
  // Vision Storms International Airport
  { id: 'gate-agent', title: 'Gate Agent', cat: 'Airport', site: ['airport'], uniform: 'gate', wage: 76, shirt: '#1b3a6e', pants: '#15223a',
    desc: 'Check passengers in at the counter, then scan boarding passes at both gates.',
    route: ['ap-checkin', 'ap-boardingA', 'ap-boardingB'] },
  { id: 'tsa-officer', title: 'TSA Officer', cat: 'Airport', site: ['airport'], uniform: 'tsa', wage: 82, shirt: '#2a3344', pants: '#1a202c',
    desc: 'Screen passengers at the walkthrough scanner and check bags on the X-ray belt.',
    route: ['ap-security', 'ap-bagcheck'] },
  { id: 'baggage-handler', title: 'Baggage Handler', cat: 'Airport', site: ['airport'], uniform: 'ramp', wage: 64, shirt: '#ff8a1f', pants: '#2a2d3a',
    desc: 'Load the carousel and run the baggage cart out to the apron.',
    route: ['ap-baggage', 'ap-cart'] },
  { id: 'ramp-agent', title: 'Ramp Agent', cat: 'Airport', site: ['airport'], uniform: 'ramp', wage: 70, shirt: '#ff8a1f', pants: '#2a2d3a',
    desc: 'Marshal aircraft on the apron and tow the baggage train.',
    route: ['ap-ramp', 'ap-tow'] },
]

export const jobById = (id) => JOBS.find((j) => j.id === id)
export const uniformById = (id) => UNIFORMS[id]
export const JOB_CATS = [...new Set(JOBS.map((j) => j.cat))]

/** The stop objects for a job's route, with '@' resolved for the wash the player clocked in at. */
export function routeFor(job, siteId) {
  return job.route.map((id) => STOPS[id.startsWith('@:') ? siteId + id.slice(1) : id]).filter(Boolean)
}
export const stopsPerShift = (job) => job.route.length
export const stopPay = (job) => Math.round(job.wage / job.route.length)
export const routeBonus = (job) => Math.round(job.wage * ROUTE_BONUS)
