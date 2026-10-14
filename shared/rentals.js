// Virtual commercial property rentals: the rules, shared by the server (authoritative) and the
// in-browser preview sandbox. Pure functions over a plain state object, no I/O.
//
// Money is stored in integer cents. Times are ISO-8601 strings (UTC).

export const PLANS = {
  hour: { label: 'Hourly', ms: 3600e3 },
  day: { label: 'Daily', ms: 86400e3 },
  week: { label: 'Weekly', ms: 7 * 86400e3 },
  month: { label: 'Monthly', ms: 30 * 86400e3 },
}

/** Features a renter may be allowed to customise, with validation. */
export const FEATURES = {
  signText: { label: 'Wall sign text', validate: (v) => typeof v === 'string' && v.length <= 40 },
  welcome: { label: 'Screen welcome message', validate: (v) => typeof v === 'string' && v.length <= 60 },
  wallColor: { label: 'Accent wall colour', validate: (v) => /^#[0-9a-f]{6}$/i.test(v) },
  playlist: { label: 'Room playlist', validate: (v) => typeof v === 'string' && v.length <= 64 },
}

/**
 * Introductory monthly price categories (cents). The owner can change every price and add
 * categories; these are only the starting values. Changing a category never touches bookings
 * that already exist: each booking keeps the price it was made at.
 */
export const DEFAULT_CATEGORIES = [
  { id: 'small-room', name: 'Small personal room', month: 499 },
  { id: 'standard-room', name: 'Standard furnished room', month: 999 },
  { id: 'luxury-room', name: 'Luxury furnished room', month: 1499 },
  { id: 'vip-suite', name: 'VIP luxury suite', month: 2499 },
  { id: 'studio-apt', name: 'Studio apartment', month: 1999 },
  { id: 'apt-1br', name: 'One-bedroom apartment', month: 2999 },
  { id: 'apt-2br', name: 'Two-bedroom apartment', month: 3999 },
  { id: 'apt-3br', name: 'Three-bedroom apartment', month: 4999 },
  { id: 'luxury-house', name: 'Luxury virtual house', month: 5999 },
  { id: 'waterfront-house', name: 'Waterfront luxury house', month: 7999 },
  { id: 'storefront-small', name: 'Small commercial storefront', month: 1999 },
  { id: 'storefront-large', name: 'Large commercial storefront', month: 4999 },
  { id: 'commercial-premium', name: 'Premium commercial building', month: 9999 },
  // Official standard rates for furnished commercial rooms (offices, boardroom, studios, event rooms)
  { id: 'commercial-standard', name: 'Standard furnished commercial room', hour: 900, day: 3000, week: 6500, month: 20000 },
]
/** VSE Credits: in-game display currency. Prices are stored in USD cents; credits are shown alongside. */
export const DEFAULT_CREDITS_PER_USD = 100
export const credits = (cents, perUsd = DEFAULT_CREDITS_PER_USD) => Math.round(((cents || 0) / 100) * perUsd)
export const creditsLabel = (cents, perUsd) => `${credits(cents, perUsd).toLocaleString('en-US')} VSE Credits`
/** Default hourly rate for rooms marked as event venues (owner-configurable per room). */
export const DEFAULT_EVENT_HOURLY = 499

export const VISIBILITY = { public: 'Public (anyone can enter)', private: 'Private (only me)', invite: 'Invitation only' }

// Bookings in these states hold the room's calendar
const HOLDS = new Set(['pending_payment', 'pending_approval', 'approved'])
const PENDING_PAYMENT_TTL = 30 * 60e3 // unpaid holds lapse after 30 minutes

export function emptyState() {
  return { rooms: [], bookings: [], customers: [], log: [], seq: 1000, categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })), pricingVersion: 3, creditsPerUsd: DEFAULT_CREDITS_PER_USD }
}

export class RentalError extends Error {
  constructor(message, status = 400) { super(message); this.status = status }
}
const fail = (msg, status) => { throw new RentalError(msg, status) }
const nowIso = (now) => new Date(now ?? Date.now()).toISOString()
const overlap = (a0, a1, b0, b1) => a0 < b1 && b0 < a1

function log(state, type, data, now) {
  state.log.push({ at: nowIso(now), type, ...data })
  if (state.log.length > 2000) state.log.splice(0, state.log.length - 2000)
}

// ---------------- rooms ----------------
export function createRoom(state, input, now) {
  const id = String(input.id || '').trim().toUpperCase()
  if (!/^[A-Z0-9][A-Z0-9-]{2,15}$/.test(id)) fail('Room ID must be 3-16 letters, numbers or dashes, like VSP-302.')
  if (state.rooms.some((r) => r.id === id)) fail(`Room ID ${id} is already in use.`, 409)
  const room = normaliseRoom({ ...input, id })
  state.rooms.push(room)
  log(state, 'room.created', { roomId: id }, now)
  return room
}

function normaliseRoom(r) {
  const cents = (v) => Math.max(0, Math.round(Number(v) || 0))
  return {
    id: r.id,
    name: String(r.name || r.id).slice(0, 60),
    kind: String(r.kind || 'Rental space').slice(0, 60),
    building: String(r.building || 'Vision Storms Energy Exchanges Plaza').slice(0, 60),
    floor: Number.isFinite(+r.floor) ? +r.floor : 0,
    occupancy: Math.max(1, Math.min(500, Math.round(+r.occupancy || 1))),
    prices: { hour: cents(r.prices?.hour), day: cents(r.prices?.day), week: cents(r.prices?.week), month: cents(r.prices?.month) },
    // listing details the owner edits (photos are image URLs from the media store)
    description: r.description ? String(r.description).slice(0, 600) : '',
    amenities: (Array.isArray(r.amenities) ? r.amenities : []).map((x) => String(x).slice(0, 80)).filter(Boolean).slice(0, 20),
    furniture: (Array.isArray(r.furniture) ? r.furniture : []).map((x) => String(x).slice(0, 80)).filter(Boolean).slice(0, 30),
    photos: (Array.isArray(r.photos) ? r.photos : []).filter((p) => p && typeof p.url === 'string' && /^(https?:\/\/|\/)/.test(p.url) && p.url.length < 500).map((p) => ({ url: p.url, caption: String(p.caption || '').slice(0, 80) })).slice(0, 12),
    tourStart: Array.isArray(r.tourStart) && r.tourStart.length === 4 && r.tourStart.every(Number.isFinite) ? r.tourStart : null,
    category: r.category ? String(r.category).slice(0, 40) : null,
    eventVenue: !!r.eventVenue, // eligible for hourly event rentals
    currency: r.currency || 'usd',
    active: r.active !== false,
    autoApprove: !!r.autoApprove,
    openWhenVacant: r.openWhenVacant !== false,
    features: (r.features || []).filter((f) => FEATURES[f]),
    blackouts: (r.blackouts || []).map((b) => ({ start: new Date(b.start).toISOString(), end: new Date(b.end).toISOString(), reason: String(b.reason || '').slice(0, 80) })),
  }
}

export function updateRoom(state, id, patch, now) {
  const i = state.rooms.findIndex((r) => r.id === id)
  if (i < 0) fail('Room not found.', 404)
  state.rooms[i] = normaliseRoom({ ...state.rooms[i], ...patch, id, prices: { ...state.rooms[i].prices, ...(patch.prices || {}) } })
  log(state, 'room.updated', { roomId: id }, now)
  return state.rooms[i]
}

// ---------------- pricing & availability ----------------
export function quote(room, plan, quantity) {
  if (!PLANS[plan]) fail('Choose hourly, daily, weekly or monthly.')
  const q = Math.round(+quantity)
  if (!(q >= 1 && q <= 365)) fail('Quantity must be between 1 and 365.')
  const unit = room.prices[plan]
  if (!unit) fail(`${room.name} is not offered ${PLANS[plan].label.toLowerCase()}.`)
  return { unit, quantity: q, amount: unit * q, currency: room.currency }
}

export function endFor(start, plan, quantity) {
  return new Date(new Date(start).getTime() + PLANS[plan].ms * quantity).toISOString()
}

/** Bookings and blackouts that overlap [start, end). */
export function conflicts(state, roomId, start, end, ignoreId, now) {
  const s = new Date(start).getTime(), e = new Date(end).getTime()
  const t = now ?? Date.now()
  const room = state.rooms.find((r) => r.id === roomId)
  const out = []
  for (const b of state.bookings) {
    if (b.roomId !== roomId || b.id === ignoreId || !HOLDS.has(b.status)) continue
    if (b.status === 'pending_payment' && t - new Date(b.createdAt).getTime() > PENDING_PAYMENT_TTL) continue
    if (overlap(s, e, new Date(b.start).getTime(), new Date(b.end).getTime())) out.push({ type: 'booking', id: b.id, start: b.start, end: b.end })
  }
  for (const bo of room?.blackouts || []) {
    if (overlap(s, e, new Date(bo.start).getTime(), new Date(bo.end).getTime())) out.push({ type: 'blackout', start: bo.start, end: bo.end, reason: bo.reason })
  }
  return out
}

/** Public calendar: busy ranges for the next `days` days (no customer details). */
export function busyRanges(state, roomId, now, days = 120) {
  const t = now ?? Date.now()
  return conflicts(state, roomId, new Date(t).toISOString(), new Date(t + days * 86400e3).toISOString(), null, t).map(({ start, end, type }) => ({ start, end, type }))
}

// ---------------- customers ----------------
export function findOrCreateCustomer(state, { name, email }, now) {
  const em = String(email || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) fail('Enter a valid email address.')
  const nm = String(name || '').trim().slice(0, 40) || em.split('@')[0]
  let c = state.customers.find((x) => x.email === em)
  if (!c) {
    c = { id: 'C' + ++state.seq, name: nm, email: em, createdAt: nowIso(now) }
    state.customers.push(c)
    log(state, 'customer.created', { customerId: c.id }, now)
  } else if (name) c.name = nm
  return c
}

// ---------------- bookings ----------------
export function createBooking(state, { roomId, customerId, plan, quantity, start, guests = 1, visibility = 'private', invites = [] }, now) {
  const room = state.rooms.find((r) => r.id === roomId)
  if (!room) fail('Room not found.', 404)
  if (!room.active) fail(`${room.name} is not available for rent right now.`)
  const customer = state.customers.find((c) => c.id === customerId)
  if (!customer) fail('Sign in before booking.', 401)
  const st = new Date(start)
  if (isNaN(st)) fail('Choose a start date and time.')
  if (st.getTime() < (now ?? Date.now()) - 5 * 60e3) fail('The start time is in the past.')
  const g = Math.round(+guests)
  if (!(g >= 1)) fail('Guests must be at least 1.')
  if (g > room.occupancy) fail(`${room.name} holds up to ${room.occupancy} people.`)
  if (!VISIBILITY[visibility]) fail('Choose public, private or invitation only.')
  const q = quote(room, plan, quantity)
  const end = endFor(st, plan, q.quantity)
  const clash = conflicts(state, roomId, st.toISOString(), end, null, now)
  if (clash.length) fail(`${room.name} is already booked or blocked for part of that time.`, 409)
  const b = {
    id: 'B' + ++state.seq,
    roomId,
    customerId,
    customerName: customer.name,
    plan,
    quantity: q.quantity,
    unit: q.unit,
    amount: q.amount,
    currency: q.currency,
    guests: g,
    start: st.toISOString(),
    end,
    visibility,
    invites: cleanInvites(invites),
    customization: {},
    status: 'pending_payment',
    payment: { status: 'unpaid' },
    createdAt: nowIso(now),
  }
  state.bookings.push(b)
  log(state, 'booking.created', { bookingId: b.id, roomId }, now)
  return b
}

const cleanInvites = (list) => [...new Set((list || []).map((s) => String(s).trim().toLowerCase()).filter(Boolean))].slice(0, 50)

/**
 * Record a verified payment. Only the server calls this after verifying with the payment
 * provider (or the explicit test-payment mode). The amount must match the booking.
 */
export function markPaid(state, bookingId, { provider, ref, amount, currency }, now) {
  const b = state.bookings.find((x) => x.id === bookingId)
  if (!b) fail('Booking not found.', 404)
  if (b.payment.status === 'paid') return b // idempotent (webhooks retry)
  if (b.status !== 'pending_payment') fail('This booking is not waiting for payment.', 409)
  if (amount !== b.amount || (currency && currency.toLowerCase() !== b.currency)) fail('Paid amount does not match the booking.', 402)
  const room = state.rooms.find((r) => r.id === b.roomId)
  b.payment = { status: 'paid', provider, ref, amount, paidAt: nowIso(now), test: provider === 'test' }
  b.status = room?.autoApprove ? 'approved' : 'pending_approval'
  if (b.status === 'approved') b.decidedAt = nowIso(now)
  log(state, 'booking.paid', { bookingId, provider }, now)
  return b
}

export function decide(state, bookingId, approve, reason, now) {
  const b = state.bookings.find((x) => x.id === bookingId)
  if (!b) fail('Booking not found.', 404)
  if (b.status !== 'pending_approval') fail('Only paid requests waiting for approval can be approved or rejected.', 409)
  if (approve) {
    const clash = conflicts(state, b.roomId, b.start, b.end, b.id, now).filter((c) => c.type === 'blackout' || state.bookings.find((x) => x.id === c.id)?.status === 'approved')
    if (clash.length) fail('Another approved booking or a blackout overlaps this time.', 409)
  }
  b.status = approve ? 'approved' : 'rejected'
  b.decidedAt = nowIso(now)
  if (!approve) { b.rejectReason = String(reason || '').slice(0, 200); if (b.payment.status === 'paid') b.payment.refundDue = true }
  log(state, approve ? 'booking.approved' : 'booking.rejected', { bookingId }, now)
  return b
}

/** Owner assigns a room directly (e.g. an offline payment or a comp). */
export function assign(state, { roomId, customer, start, end, visibility = 'private', note = '', amount = 0 }, now) {
  const room = state.rooms.find((r) => r.id === roomId)
  if (!room) fail('Room not found.', 404)
  const c = findOrCreateCustomer(state, customer, now)
  const s = new Date(start), e = new Date(end)
  if (isNaN(s) || isNaN(e) || e <= s) fail('Choose a start and an end after it.')
  if (conflicts(state, roomId, s.toISOString(), e.toISOString(), null, now).length) fail('That time overlaps another booking or blackout.', 409)
  const b = {
    id: 'B' + ++state.seq, roomId, customerId: c.id, customerName: c.name, plan: 'custom', quantity: 1,
    unit: Math.round(+amount || 0), amount: Math.round(+amount || 0), currency: room.currency, guests: 1,
    start: s.toISOString(), end: e.toISOString(), visibility, invites: [], customization: {},
    status: 'approved', payment: { status: amount > 0 ? 'paid' : 'comp', provider: 'owner', note: String(note).slice(0, 120) },
    createdAt: nowIso(now), decidedAt: nowIso(now), assigned: true,
  }
  state.bookings.push(b)
  log(state, 'booking.assigned', { bookingId: b.id, roomId }, now)
  return b
}

export function setTimes(state, bookingId, start, end, now) {
  const b = state.bookings.find((x) => x.id === bookingId)
  if (!b) fail('Booking not found.', 404)
  const s = new Date(start), e = new Date(end)
  if (isNaN(s) || isNaN(e) || e <= s) fail('Choose a start and an end after it.')
  if (conflicts(state, b.roomId, s.toISOString(), e.toISOString(), b.id, now).length) fail('That time overlaps another booking or blackout.', 409)
  b.start = s.toISOString()
  b.end = e.toISOString()
  log(state, 'booking.rescheduled', { bookingId }, now)
  return b
}

export function cancel(state, bookingId, by, now) {
  const b = state.bookings.find((x) => x.id === bookingId)
  if (!b) fail('Booking not found.', 404)
  if (!HOLDS.has(b.status)) fail('This booking can no longer be cancelled.', 409)
  b.status = 'cancelled'
  b.cancelledBy = by
  if (b.payment.status === 'paid') b.payment.refundDue = true
  log(state, 'booking.cancelled', { bookingId, by }, now)
  return b
}

/** Renter changes what the owner allows them to change. */
export function customize(state, bookingId, customerId, patch, now) {
  const b = state.bookings.find((x) => x.id === bookingId)
  if (!b) fail('Booking not found.', 404)
  if (b.customerId !== customerId) fail('Only the renter can customise this room.', 403)
  if (b.status !== 'approved') fail('Customise the room once the booking is approved.', 409)
  const room = state.rooms.find((r) => r.id === b.roomId)
  const next = { ...b.customization }
  for (const [k, v] of Object.entries(patch || {})) {
    if (k === 'visibility') { if (!VISIBILITY[v]) fail('Unknown privacy setting.'); b.visibility = v; continue }
    if (k === 'invites') { b.invites = cleanInvites(v); continue }
    if (!room.features.includes(k)) fail(`The owner has not allowed changing "${FEATURES[k]?.label || k}".`, 403)
    if (v === '' || v === null) { delete next[k]; continue }
    if (!FEATURES[k].validate(v)) fail(`That ${FEATURES[k].label.toLowerCase()} is not valid.`)
    next[k] = v
  }
  b.customization = next
  log(state, 'booking.customized', { bookingId }, now)
  return b
}

/** The booking in effect for a room right now, if any. */
export function currentBooking(state, roomId, now) {
  const t = now ?? Date.now()
  return state.bookings.find((b) => b.roomId === roomId && b.status === 'approved' && new Date(b.start).getTime() <= t && t < new Date(b.end).getTime()) || null
}

/**
 * Can this visitor go into the room? The server answers this; doors ask before opening.
 * @param customer { id, email } or null for an anonymous visitor
 */
export function accessCheck(state, roomId, customer, now) {
  const room = state.rooms.find((r) => r.id === roomId)
  if (!room) return { ok: true, reason: null, state: 'not-rentable' }
  const b = currentBooking(state, roomId, now)
  if (!b) return room.openWhenVacant ? { ok: true, state: 'vacant' } : { ok: false, state: 'closed', reason: `${room.name} is closed while it is not rented.` }
  if (b.visibility === 'public') return { ok: true, state: 'public' }
  if (customer && b.customerId === customer.id) return { ok: true, state: 'renter' }
  if (b.visibility === 'invite' && customer && (b.invites.includes(customer.email) || b.invites.includes((customer.name || '').toLowerCase()))) return { ok: true, state: 'invited' }
  return { ok: false, state: b.visibility, reason: b.visibility === 'invite' ? `${room.name} is booked for an invitation-only event.` : `${room.name} is booked privately right now.` }
}

/** Mark finished bookings as completed. */
export function sweep(state, now) {
  const t = now ?? Date.now()
  let changed = false
  for (const b of state.bookings) {
    if (b.status === 'approved' && new Date(b.end).getTime() <= t) { b.status = 'completed'; changed = true }
    if (b.status === 'pending_payment' && t - new Date(b.createdAt).getTime() > PENDING_PAYMENT_TTL) { b.status = 'expired'; changed = true }
  }
  return changed
}

/** Revenue from verified payments (test payments reported separately). */
export function revenue(state) {
  const paid = state.bookings.filter((b) => b.payment.status === 'paid' && b.status !== 'rejected' && b.status !== 'cancelled')
  const live = paid.filter((b) => !b.payment.test)
  const test = paid.filter((b) => b.payment.test)
  const byRoom = {}, byMonth = {}
  for (const b of live) {
    byRoom[b.roomId] = (byRoom[b.roomId] || 0) + b.amount
    const m = (b.payment.paidAt || b.createdAt).slice(0, 7)
    byMonth[m] = (byMonth[m] || 0) + b.amount
  }
  return {
    total: live.reduce((a, b) => a + b.amount, 0),
    testTotal: test.reduce((a, b) => a + b.amount, 0),
    refundsDue: state.bookings.filter((b) => b.payment.refundDue).reduce((a, b) => a + b.amount, 0),
    byRoom,
    byMonth,
    count: live.length,
  }
}

/** What anyone may see about a room (no customer data). */
export function publicRoom(state, room, now) {
  const b = currentBooking(state, room.id, now)
  return {
    id: room.id, name: room.name, kind: room.kind, building: room.building, floor: room.floor,
    occupancy: room.occupancy, prices: room.prices, currency: room.currency, active: room.active,
    category: room.category, categoryName: categoryOf(state, room.category)?.name || null, eventVenue: room.eventVenue,
    description: room.description, amenities: room.amenities, furniture: room.furniture, photos: room.photos, tourStart: room.tourStart,
    features: room.features, openWhenVacant: room.openWhenVacant,
    busy: busyRanges(state, room.id, now),
    now: b ? { visibility: b.visibility, until: b.end, customization: b.customization } : null,
  }
}

export const money = (cents, currency = 'usd') => new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format((cents || 0) / 100)

// ---------------- price categories ----------------
// Which category each Plaza room starts in, and whether it can be booked by the hour for events.
const PLAZA_DEFAULTS = {
  'VSP-201': { category: 'commercial-standard', eventVenue: true }, // screening room
  'VSP-202': { category: 'commercial-standard', eventVenue: true }, // recording studio
  'VSP-301': { category: 'commercial-standard', eventVenue: true }, // boardroom
  'VSP-302': { category: 'vip-suite', eventVenue: false },
}
// the old seed prices (cents) – rooms still on exactly these get the new introductory prices
const OLD_SEED = {
  'VSP-201': { hour: 4000, day: 25000, week: 120000, month: 380000 },
  'VSP-202': { hour: 2500, day: 15000, week: 80000, month: 260000 },
  'VSP-301': { hour: 3000, day: 18000, week: 90000, month: 300000 },
  'VSP-302': { hour: 2000, day: 12000, week: 65000, month: 220000 },
  _generic: { hour: 2000, day: 12000, week: 60000, month: 200000 },
}
const samePrices = (a, b) => a && b && ['hour', 'day', 'week', 'month'].every((k) => (a[k] || 0) === (b[k] || 0))

export const categoryOf = (state, id) => (state.categories || DEFAULT_CATEGORIES).find((c) => c.id === id) || null

/**
 * Prices a room gets from its category. A category may set hourly, daily, weekly and monthly rates
 * (0 = not offered). Rooms marked as event venues in a monthly-only category keep a separate hourly rate.
 */
export function pricesFor(state, room, hourly) {
  const c = categoryOf(state, room.category)
  if (!c) return { hour: 0, day: 0, week: 0, month: room.prices?.month || 0, ...(room.prices || {}) }
  const eventHour = room.eventVenue ? (hourly ?? (room.prices?.hour || DEFAULT_EVENT_HOURLY)) : 0
  return { hour: c.hour || eventHour, day: c.day || 0, week: c.week || 0, month: c.month || 0 }
}

/**
 * One-time move from the original (far too high) example prices to the introductory categories.
 * Only rooms still on the untouched old example prices are re-priced; anything the owner set by
 * hand is kept. Existing bookings are never changed (they store their own price).
 */
export function migratePricing(state, now) {
  if ((state.pricingVersion || 0) >= 2 && state.categories) return migratePricingV3(state, now)
  state.categories ||= DEFAULT_CATEGORIES.map((c) => ({ ...c }))
  for (const room of state.rooms) {
    const d = PLAZA_DEFAULTS[room.id]
    if (!room.category && d) { room.category = d.category; room.eventVenue = d.eventVenue }
    if (samePrices(room.prices, OLD_SEED[room.id]) || samePrices(room.prices, OLD_SEED._generic)) {
      if (!room.category) room.category = 'standard-room'
      room.prices = pricesFor(state, room, DEFAULT_EVENT_HOURLY)
      log(state, 'room.repriced', { roomId: room.id, reason: 'introductory pricing' }, now)
    }
  }
  state.pricingVersion = 2
  migratePricingV3(state, now)
  return true
}

// Version 3: official standard commercial rates ($9 hour / $30 day / $65 week / $200 month).
// Rooms still on the untouched version-2 introductory prices move to the new category. Rooms the
// owner priced by hand, and every existing booking, keep their prices.
const V2_COMMERCIAL = { 'VSP-201': 'luxury-room', 'VSP-202': 'standard-room', 'VSP-301': 'standard-room' }
function migratePricingV3(state, now) {
  if ((state.pricingVersion || 0) >= 3) return false
  state.categories ||= DEFAULT_CATEGORIES.map((c) => ({ ...c }))
  const std = DEFAULT_CATEGORIES.find((c) => c.id === 'commercial-standard')
  if (!state.categories.some((c) => c.id === std.id)) state.categories.push({ ...std })
  for (const room of state.rooms) {
    const old = V2_COMMERCIAL[room.id]
    if (!old || room.category !== old) continue
    const v2 = { hour: room.eventVenue ? DEFAULT_EVENT_HOURLY : 0, day: 0, week: 0, month: DEFAULT_CATEGORIES.find((c) => c.id === old).month }
    if (!samePrices(room.prices, v2)) continue
    room.category = std.id
    room.prices = pricesFor(state, room)
    log(state, 'room.repriced', { roomId: room.id, reason: 'standard commercial rates' }, now)
  }
  state.creditsPerUsd ||= DEFAULT_CREDITS_PER_USD
  state.pricingVersion = 3
  return true
}

/** Owner: change how many VSE Credits are shown per US dollar (display conversion). */
export function setCreditRate(state, perUsd, now) {
  const n = Math.round(Number(perUsd))
  if (!(n >= 1 && n <= 100000)) fail('Credits per dollar must be between 1 and 100,000.')
  state.creditsPerUsd = n
  log(state, 'credits.rate', { perUsd: n }, now)
  return n
}

/** Owner: replace the category list (validated). */
export function setCategories(state, list, now) {
  if (!Array.isArray(list) || !list.length || list.length > 60) fail('Send between 1 and 60 categories.')
  const seen = new Set()
  state.categories = list.map((c) => {
    const id = String(c.id || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 40)
    if (!id || seen.has(id)) fail('Each category needs its own ID.')
    seen.add(id)
    const out = { id, name: String(c.name || id).slice(0, 60) }
    for (const k of ['hour', 'day', 'week', 'month']) {
      const v = Math.round(Number(c[k] || 0))
      if (!Number.isFinite(v) || v < 0 || v > 10_000_000) fail(`Check the ${PLANS[k].label.toLowerCase()} price for ${c.name || id}.`)
      out[k] = v
    }
    if (!out.hour && !out.day && !out.week && !out.month) fail(`${out.name} needs at least one price.`)
    return out
  })
  log(state, 'categories.updated', { count: state.categories.length }, now)
  return state.categories
}

/** Owner: give every room in a category the category's current rates. Bookings keep theirs. */
export function applyCategory(state, categoryId, now) {
  const c = categoryOf(state, categoryId)
  if (!c) fail('Category not found.', 404)
  const changed = []
  for (const room of state.rooms) if (room.category === c.id) { room.prices = pricesFor(state, room); changed.push(room.id) }
  log(state, 'category.applied', { categoryId, rooms: changed }, now)
  return changed
}

/** Default rentable rooms for the Plaza (introductory prices). */
// Default room names that were renamed; stored rooms still on an old default name get the new one.
export const RENAMED_ROOMS = { 'Studio 202': 'Vision Recording Studio' }
export function seedRooms(state, rooms, now) {
  migratePricing(state, now)
  for (const room of state.rooms) {
    if (room.building === 'Vision Storms Plaza') room.building = 'Vision Storms Energy Exchanges Plaza'
    const cfg = rooms.find((r) => r.id === room.id)
    if (cfg && RENAMED_ROOMS[room.name] === cfg.name) { log(state, 'room.renamed', { roomId: room.id, from: room.name, to: cfg.name }, now); room.name = cfg.name }
  }
  for (const r of rooms) {
    if (!r.rentable || state.rooms.some((x) => x.id === r.id)) continue
    const d = PLAZA_DEFAULTS[r.id] || { category: 'standard-room', eventVenue: false }
    const base = { category: d.category, eventVenue: d.eventVenue }
    createRoom(state, {
      id: r.id, name: r.name, kind: r.kind, floor: r.floor + 1, occupancy: r.occupancy,
      ...base,
      prices: pricesFor(state, base, DEFAULT_EVENT_HOURLY),
      features: r.id === 'VSP-302' ? ['signText', 'welcome', 'wallColor', 'playlist'] : ['welcome', 'playlist'],
      autoApprove: false,
    }, now)
  }
  return state
}
