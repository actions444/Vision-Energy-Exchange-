import { useStore } from '../state/store.js'
import { useBackend } from '../backend/backend.js'
import { logAccess } from '../admin/audit.js'
// Rental client. Two backends with the same interface:
//  - 'server':  the Node rental API (server/rentalsApi.js). Access decisions, payments and
//               bookings are made on the server. This is the real system.
//  - 'preview': an in-browser sandbox that runs the same rules (shared/rentals.js) and stores
//               data in this browser only. For trying the flow; it is not secure and takes no money.
import { create } from 'zustand'
import * as R from '../../shared/rentals.js'
import { PLAZA_ROOMS } from '../config/plaza.js'

const LS = { mode: 'vsw-rental-mode', api: 'vsw-rental-api', customer: 'vsw-rental-customer', admin: 'vsw-rental-admin', preview: 'vsw-rentals-preview' }
const read = (k, d = null) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } }
const write = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)) } catch {} }

// ---------------- preview sandbox backend ----------------
function previewBackend() {
  let st = read(LS.preview) || R.emptyState()
  R.seedRooms(st, PLAZA_ROOMS)
  const save = () => write(LS.preview, st)
  save()
  const ok = (x) => Promise.resolve(JSON.parse(JSON.stringify(x)))
  const wrap = (fn) => (...a) => { try { const r = fn(...a); save(); return ok(r) } catch (e) { return Promise.reject(e) } }
  const me = (token) => st.customers.find((c) => c.previewToken && c.previewToken === token) || null
  return {
    kind: 'preview',
    info: () => { R.sweep(st); save(); return ok({ paymentMode: 'test', rooms: st.rooms.filter((r) => r.active).map((r) => R.publicRoom(st, r)) }) },
    session: wrap(({ name, email }) => {
      const c = R.findOrCreateCustomer(st, { name, email })
      c.previewToken = c.previewToken || Math.random().toString(36).slice(2)
      return { token: c.previewToken, customer: { id: c.id, name: c.name, email: c.email } }
    }),
    me: (token) => { const c = me(token); return c ? ok({ customer: { id: c.id, name: c.name, email: c.email }, bookings: st.bookings.filter((b) => b.customerId === c.id) }) : Promise.reject(new Error('Sign in first.')) },
    createBooking: wrap((token, input) => { const c = me(token); if (!c) throw new Error('Sign in first.'); return { booking: R.createBooking(st, { ...input, customerId: c.id }), paymentMode: 'test' } }),
    testPayment: wrap((token, id) => { const c = me(token); const b = st.bookings.find((x) => x.id === id); if (!c || !b || b.customerId !== c.id) throw new Error('Booking not found.'); return { booking: R.markPaid(st, id, { provider: 'test', ref: 'preview', amount: b.amount, currency: b.currency }) } }),
    cancel: wrap((token, id) => { const c = me(token); const b = st.bookings.find((x) => x.id === id); if (!c || !b || b.customerId !== c.id) throw new Error('Booking not found.'); return { booking: R.cancel(st, id, 'customer') } }),
    customize: wrap((token, id, patch) => { const c = me(token); if (!c) throw new Error('Sign in first.'); return { booking: R.customize(st, id, c.id, patch) } }),
    access: (token, roomId) => ok(R.accessCheck(st, roomId, me(token))),
    admin: {
      state: () => { R.sweep(st); save(); return ok({ paymentMode: 'test', rooms: st.rooms, bookings: st.bookings, customers: st.customers.map(({ previewToken, ...c }) => c), revenue: R.revenue(st), log: st.log.slice(-200) }) },
      createRoom: wrap((_, body) => ({ room: R.createRoom(st, body) })),
      updateRoom: wrap((_, id, body) => ({ room: R.updateRoom(st, id, body) })),
      decide: wrap((_, id, approve, reason) => ({ booking: R.decide(st, id, approve, reason) })),
      cancel: wrap((_, id) => ({ booking: R.cancel(st, id, 'owner') })),
      setTimes: wrap((_, id, start, end) => ({ booking: R.setTimes(st, id, start, end) })),
      assign: wrap((_, body) => ({ booking: R.assign(st, body) })),
      reset: () => { st = R.emptyState(); R.seedRooms(st, PLAZA_ROOMS); save(); return ok({}) },
    },
  }
}

// ---------------- server backend ----------------
function serverBackend(base) {
  const api = async (method, path, { token, body } = {}) => {
    let res
    try {
      res = await fetch(base.replace(/\/$/, '') + path, {
        method,
        headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: 'Bearer ' + token } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      })
    } catch {
      throw new Error(`Could not reach the rental server at ${base}.`)
    }
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || `Request failed (${res.status}).`)
    return json
  }
  return {
    kind: 'server',
    info: () => api('GET', '/api/rentals/info'),
    session: (b) => api('POST', '/api/session', { body: b }),
    me: (token) => api('GET', '/api/me', { token }),
    createBooking: (token, b) => api('POST', '/api/bookings', { token, body: b }),
    testPayment: (token, id) => api('POST', `/api/bookings/${id}/test-payment`, { token }),
    cancel: (token, id) => api('POST', `/api/bookings/${id}/cancel`, { token }),
    customize: (token, id, patch) => api('PATCH', `/api/bookings/${id}`, { token, body: patch }),
    access: (token, roomId) => api('GET', `/api/rooms/${encodeURIComponent(roomId)}/access`, { token }),
    admin: {
      state: (t) => api('GET', '/api/admin/state', { token: t }),
      createRoom: (t, b) => api('POST', '/api/admin/rooms', { token: t, body: b }),
      updateRoom: (t, id, b) => api('PATCH', `/api/admin/rooms/${id}`, { token: t, body: b }),
      decide: (t, id, approve, reason) => api('POST', `/api/admin/bookings/${id}/${approve ? 'approve' : 'reject'}`, { token: t, body: { reason } }),
      cancel: (t, id) => api('POST', `/api/admin/bookings/${id}/cancel`, { token: t }),
      setTimes: (t, id, start, end) => api('PATCH', `/api/admin/bookings/${id}`, { token: t, body: { start, end } }),
      assign: (t, b) => api('POST', '/api/admin/assign', { token: t, body: b }),
    },
  }
}

let backend = null
function getBackend() {
  if (backend) return backend
  const { mode, apiBase } = useRentals.getState()
  backend = mode === 'server' && apiBase ? serverBackend(apiBase) : previewBackend()
  return backend
}

export const useRentals = create((set, get) => ({
  mode: read(LS.mode, 'preview'),
  apiBase: read(LS.api, ''),
  paymentMode: 'test',
  rooms: [],
  customer: read(LS.customer),
  myBookings: [],
  adminToken: read(LS.admin, ''),
  adminState: null,
  error: null,
  loaded: false,

  async refresh() {
    try {
      const info = await getBackend().info()
      set({ rooms: info.rooms.map((r) => ({ ...r, customization: r.now?.customization || {} })), paymentMode: info.paymentMode, loaded: true, error: null })
    } catch (e) {
      set({ error: e.message, loaded: true })
    }
    const c = get().customer
    if (c) {
      try { const m = await getBackend().me(c.token); set({ myBookings: m.bookings }) } catch { /* token expired */ }
    }
  },
  setBackend(mode, apiBase = '') {
    write(LS.mode, mode)
    write(LS.api, apiBase)
    backend = null
    set({ mode, apiBase, rooms: [], myBookings: [], adminState: null, customer: mode === get().mode ? get().customer : null })
    if (mode !== get().mode) write(LS.customer, null)
    return get().refresh()
  },
  async signIn(name, email) {
    const r = await getBackend().session({ name, email })
    const customer = { ...r.customer, token: r.token }
    write(LS.customer, customer)
    set({ customer })
    await get().refresh()
    return customer
  },
  signOut() { write(LS.customer, null); set({ customer: null, myBookings: [] }) },
  async book(input) {
    const c = get().customer
    if (!c) throw new Error('Sign in first.')
    const r = await getBackend().createBooking(c.token, input)
    await get().refresh()
    return r
  },
  async testPay(id) { const r = await getBackend().testPayment(get().customer?.token, id); await get().refresh(); return r },
  async cancel(id) { const r = await getBackend().cancel(get().customer?.token, id); await get().refresh(); return r },
  async customize(id, patch) { const r = await getBackend().customize(get().customer?.token, id, patch); await get().refresh(); return r },

  // owner
  setAdminToken(t) { write(LS.admin, t); set({ adminToken: t }) },
  async loadAdmin() {
    const s = await getBackend().admin.state(get().adminToken)
    set({ adminState: s })
    return s
  },
  async adminDo(action, ...args) {
    const r = await getBackend().admin[action](get().adminToken, ...args)
    await Promise.all([get().loadAdmin(), get().refresh()])
    return r
  },
}))

/** Used by room doors. */
export const rentalAccess = {
  async check(roomId) {
    const room = useRentals.getState().rooms.find((r) => r.id === roomId)
    if (!room) return { ok: true }
    const r = await getBackend().access(useRentals.getState().customer?.token, roomId)
    if (r.ok && r.state === 'renter') return { ok: true }
    if (!r.ok && useBackend.getState().admin) {
      // the platform owner may enter any space; entering a customer's private booking is logged
      logAccess({ kind: 'entry', roomId, roomName: room.name, detail: r.reason || 'private booking' })
      useStore.getState().showToast(`Owner access: ${room.name}. This entry was added to the access log.`)
      return { ok: true, owner: true }
    }
    return r
  },
  label(roomId) {
    const room = useRentals.getState().rooms.find((r) => r.id === roomId)
    if (!room?.now || room.now.visibility === 'public') return null
    const base = `${room.name} · ${room.now.visibility === 'invite' ? 'invitation only' : 'private booking'}`
    return useBackend.getState().admin ? base + ' · owner access (logged)' : base
  },
  /** Is this visitor the renter of the room right now (checked by the rental backend)? */
  async isRenter(roomId) {
    const r = await getBackend().access(useRentals.getState().customer?.token, roomId)
    return !!(r.ok && r.state === 'renter')
  },
  /** Playlist the current renter picked for this room, if any. */
  playlist(roomId) {
    return useRentals.getState().rooms.find((r) => r.id === roomId)?.customization?.playlist || null
  },
}

if (typeof window !== 'undefined') {
  setTimeout(() => useRentals.getState().refresh(), 300)
  setInterval(() => useRentals.getState().refresh(), 30000)
}
