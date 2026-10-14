// Rental API: the server is the only place that grants room access, records payments and
// changes bookings. State persists to server/data/rentals.json.
//
// Auth
//   Owner/admin: `Authorization: Bearer <ADMIN_TOKEN>` (env var; printed at startup if unset).
//   Customers:   POST /api/session { name, email } -> { token }. This development sign-in has no
//                password or email verification. Replace it with a real identity provider
//                (magic links, OAuth, Clerk/Auth0/Supabase Auth) before taking real bookings.
// Payments
//   STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET -> Stripe Checkout; a booking is marked paid only
//   by a signature-verified webhook. DEV_PAYMENTS=1 enables a clearly labelled test payment.
//   With neither, checkout is refused.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import * as R from '../shared/rentals.js'
import { PLAZA_ROOMS } from '../src/config/plaza.js'

const FILE = process.env.RENTALS_FILE || path.join(path.dirname(new URL(import.meta.url).pathname), 'data', 'rentals.json')
const DATA_DIR = path.dirname(FILE)

export function createRentalsApi(env = process.env) {
  const ADMIN_TOKEN = env.ADMIN_TOKEN || crypto.randomBytes(18).toString('hex')
  if (!env.ADMIN_TOKEN) console.log(`[rentals] ADMIN_TOKEN not set. Owner token for this run: ${ADMIN_TOKEN}`)
  const STRIPE_KEY = env.STRIPE_SECRET_KEY || ''
  const STRIPE_WHSEC = env.STRIPE_WEBHOOK_SECRET || ''
  const DEV_PAYMENTS = env.DEV_PAYMENTS === '1'
  const PUBLIC_URL = env.PUBLIC_URL || 'http://localhost:5173'
  const paymentMode = STRIPE_KEY && STRIPE_WHSEC ? 'stripe' : DEV_PAYMENTS ? 'test' : 'none'

  // ---------- persistence ----------
  let state = R.emptyState()
  try { state = JSON.parse(fs.readFileSync(FILE, 'utf8')) } catch {}
  R.seedRooms(state, PLAZA_ROOMS)
  const save = () => {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    const tmp = FILE + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(state, null, 1))
    fs.renameSync(tmp, FILE)
  }
  if (state.log?.some((e) => e.type === 'room.repriced') && !state._repricedSaved) { state._repricedSaved = true; try { save() } catch {} }
  save()
  setInterval(() => { if (R.sweep(state)) save() }, 30e3)

  // ---------- helpers ----------
  const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')
  const safeEq = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
  const bearer = (req) => (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const isAdmin = (req) => { const t = bearer(req); return !!t && safeEq(sha(t), sha(ADMIN_TOKEN)) }
  const customerOf = (req) => {
    const t = bearer(req) || req.headers['x-customer-token'] || ''
    if (!t) return null
    const h = sha(String(t))
    return state.customers.find((c) => (c.tokens || []).includes(h)) || null
  }
  const hits = new Map()
  const limited = (req, key, max, windowMs) => {
    const k = key + ':' + (req.socket.remoteAddress || '?')
    const now = Date.now()
    const list = (hits.get(k) || []).filter((t) => now - t < windowMs)
    list.push(now)
    hits.set(k, list)
    return list.length > max
  }
  const strip = (c) => c && { id: c.id, name: c.name, email: c.email }

  async function stripeCheckout(b, room, customer) {
    const p = new URLSearchParams()
    p.set('mode', 'payment')
    p.set('success_url', `${PUBLIC_URL}/?rental=success&booking=${b.id}`)
    p.set('cancel_url', `${PUBLIC_URL}/?rental=cancelled&booking=${b.id}`)
    p.set('client_reference_id', b.id)
    p.set('customer_email', customer.email)
    p.set('metadata[bookingId]', b.id)
    p.set('line_items[0][quantity]', '1')
    p.set('line_items[0][price_data][currency]', b.currency)
    p.set('line_items[0][price_data][unit_amount]', String(b.amount))
    p.set('line_items[0][price_data][product_data][name]', `${room.name} (${room.id}) · ${b.quantity} ${b.plan}${b.quantity > 1 ? 's' : ''}`)
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: p,
    })
    const json = await res.json()
    if (!res.ok) throw new R.RentalError(json.error?.message || 'Stripe could not start checkout.', 502)
    b.payment.sessionId = json.id
    return json.url
  }

  function verifyStripe(raw, header) {
    const parts = Object.fromEntries(String(header || '').split(',').map((kv) => kv.split('=')).filter((x) => x.length === 2).map(([k, v]) => [k.trim(), v.trim()]))
    const sigs = String(header || '').split(',').filter((s) => s.trim().startsWith('v1=')).map((s) => s.trim().slice(3))
    const t = Number(parts.t)
    if (!t || !sigs.length) return false
    if (Math.abs(Date.now() / 1000 - t) > 300) return false
    const expected = crypto.createHmac('sha256', STRIPE_WHSEC).update(`${t}.${raw}`).digest('hex')
    return sigs.some((s) => s.length === expected.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected)))
  }

  // ---------- routes ----------
  // returns true if handled
  const api = async function handle(req, res, url, raw) {
    if (!url.pathname.startsWith('/api/')) return false
    const send = (status, body) => {
      res.writeHead(status, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
      return true
    }
    let body = {}
    if (raw && req.headers['content-type']?.includes('application/json')) {
      try { body = JSON.parse(raw) } catch { return send(400, { error: 'Invalid JSON.' }) }
    }
    const m = (method, re) => req.method === method && url.pathname.match(re)
    let p
    try {
      // ----- public -----
      if (m('GET', /^\/api\/rentals\/info$/)) return send(200, { paymentMode, categories: state.categories, rooms: state.rooms.filter((r) => r.active).map((r) => R.publicRoom(state, r)) })
      if ((p = m('GET', /^\/api\/rooms\/([\w-]+)\/access$/))) return send(200, R.accessCheck(state, p[1], customerOf(req)))

      // ----- customers -----
      if (m('POST', /^\/api\/session$/)) {
        if (limited(req, 'session', 20, 60e3)) return send(429, { error: 'Too many sign-ins. Try again in a minute.' })
        const c = R.findOrCreateCustomer(state, body)
        const token = crypto.randomBytes(24).toString('hex')
        c.tokens = [...(c.tokens || []), sha(token)].slice(-5)
        save()
        return send(200, { token, customer: strip(c) })
      }
      const me = customerOf(req)
      if (m('GET', /^\/api\/me$/)) {
        if (!me) return send(401, { error: 'Sign in first.' })
        return send(200, { customer: strip(me), bookings: state.bookings.filter((b) => b.customerId === me.id) })
      }
      if (m('POST', /^\/api\/bookings$/)) {
        if (!me) return send(401, { error: 'Sign in first.' })
        if (limited(req, 'book', 30, 60e3)) return send(429, { error: 'Too many requests.' })
        if (paymentMode === 'none') return send(503, { error: 'Checkout is not available yet: no payment provider is configured on this server.' })
        const b = R.createBooking(state, { ...body, customerId: me.id })
        const room = state.rooms.find((r) => r.id === b.roomId)
        let checkoutUrl = null
        if (paymentMode === 'stripe') checkoutUrl = await stripeCheckout(b, room, me)
        save()
        return send(201, { booking: b, checkoutUrl, paymentMode })
      }
      if ((p = m('POST', /^\/api\/bookings\/(B\d+)\/test-payment$/))) {
        if (paymentMode !== 'test') return send(403, { error: 'Test payments are turned off on this server.' })
        const b = state.bookings.find((x) => x.id === p[1])
        if (!me || !b || b.customerId !== me.id) return send(404, { error: 'Booking not found.' })
        R.markPaid(state, b.id, { provider: 'test', ref: 'test-' + Date.now(), amount: b.amount, currency: b.currency })
        save()
        return send(200, { booking: b })
      }
      if ((p = m('POST', /^\/api\/bookings\/(B\d+)\/cancel$/))) {
        const b = state.bookings.find((x) => x.id === p[1])
        if (!me || !b || b.customerId !== me.id) return send(404, { error: 'Booking not found.' })
        R.cancel(state, b.id, 'customer')
        save()
        return send(200, { booking: b })
      }
      if ((p = m('PATCH', /^\/api\/bookings\/(B\d+)$/))) {
        if (!me) return send(401, { error: 'Sign in first.' })
        const b = R.customize(state, p[1], me.id, body)
        save()
        return send(200, { booking: b })
      }
      if (m('POST', /^\/api\/stripe\/webhook$/)) {
        if (paymentMode !== 'stripe') return send(404, { error: 'Not configured.' })
        if (!verifyStripe(raw || '', req.headers['stripe-signature'])) return send(400, { error: 'Bad signature.' })
        const ev = JSON.parse(raw)
        const s = ev.data?.object
        if ((ev.type === 'checkout.session.completed' || ev.type === 'checkout.session.async_payment_succeeded') && s?.payment_status === 'paid') {
          const id = s.metadata?.bookingId || s.client_reference_id
          try { R.markPaid(state, id, { provider: 'stripe', ref: s.id, amount: s.amount_total, currency: s.currency }) } catch (e) { console.error('[stripe] could not apply payment', id, e.message) }
          save()
        }
        return send(200, { received: true })
      }

      // ----- owner -----
      if (url.pathname.startsWith('/api/admin/')) {
        if (!isAdmin(req)) return send(401, { error: 'Owner sign-in required.' })
        if (m('GET', /^\/api\/admin\/state$/)) {
          R.sweep(state)
          return send(200, { paymentMode, categories: state.categories, rooms: state.rooms, bookings: state.bookings, customers: state.customers.map(strip), revenue: R.revenue(state), log: state.log.slice(-200) })
        }
        if (m('PUT', /^\/api\/admin\/categories$/)) { const c = R.setCategories(state, body.categories); save(); return send(200, { categories: c }) }
        if ((p = m('POST', /^\/api\/admin\/categories\/([\w-]+)\/apply$/))) { const rooms = R.applyCategory(state, p[1]); save(); return send(200, { rooms }) }
        if (m('POST', /^\/api\/admin\/rooms$/)) { const r = R.createRoom(state, body); save(); return send(201, { room: r }) }
        if ((p = m('PATCH', /^\/api\/admin\/rooms\/([\w-]+)$/))) { const r = R.updateRoom(state, p[1], body); save(); return send(200, { room: r }) }
        if ((p = m('POST', /^\/api\/admin\/bookings\/(B\d+)\/(approve|reject)$/))) { const b = R.decide(state, p[1], p[2] === 'approve', body.reason); save(); return send(200, { booking: b }) }
        if ((p = m('POST', /^\/api\/admin\/bookings\/(B\d+)\/cancel$/))) { const b = R.cancel(state, p[1], 'owner'); save(); return send(200, { booking: b }) }
        if ((p = m('PATCH', /^\/api\/admin\/bookings\/(B\d+)$/))) { const b = R.setTimes(state, p[1], body.start, body.end); save(); return send(200, { booking: b }) }
        if (m('POST', /^\/api\/admin\/assign$/)) { const b = R.assign(state, body); save(); return send(201, { booking: b }) }
      }
      return send(404, { error: 'Not found.' })
    } catch (e) {
      if (e instanceof R.RentalError) return send(e.status, { error: e.message })
      console.error(e)
      return send(500, { error: 'Server error.' })
    }
  }
  /** Is the caller (customer token header) the renter of `roomId` right now? */
  api.isRenter = (req, roomId) => R.accessCheck(state, roomId, customerOf(req)).state === 'renter'
  api.isAdminToken = (t) => !!t && typeof t === 'string' && safeEq(sha(t), sha(ADMIN_TOKEN))
  api.paymentMode = paymentMode
  return api
}
