import { create } from 'zustand'
import { useStore } from './store.js'
import { PAY, START_WALLET, ROUTE_BONUS, STOPS, jobById, uniformById, routeFor, stopPay, routeBonus, SITES, WASH_PRICE, WASH_SECONDS, IRON_PRICE, RATING_START, ratingMultiplier, ratingTier } from '../config/jobs.js'
import { BUSINESSES, businessById } from '../config/businesses.js'

// Jobs, uniforms, shifts and payroll.
//
// Money here is "VSE credits" (whole numbers). Everything is saved on this device (localStorage), the
// same as the power meter. There is no server-side wallet, so credits are not shared between players
// and cannot be spent in other players' rentals; this is a single-player economy for now.
//
// Time: the payroll calendar counts world days. A world day passes each time the day/night clock
// wraps past midnight (JobDirector watches it). "Rest until tomorrow" in the Jobs panel skips ahead.

const KEY = 'vsw-jobs'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null } }
const saved = load()

const BASE = {
  // `wallet` is cash on hand — spent in person at registers, kiosks and vendors, exactly as before.
  // `bank` is a separate, safe balance moved to/from cash only at an ATM (deposit/withdraw below).
  wallet: START_WALLET, bank: 0, day: 1, owned: [], wearing: null,
  jobId: null, schedule: 'weekly', accrued: 0, periodStart: 1, hiredDay: null,
  lifetime: 0, shifts: 0, ledger: [],
  rating: RATING_START, // 0..100 job-performance rating; see config/jobs.js ratingMultiplier/ratingTier
  vehicles: [], // owned vehicle ids (config/vehicleShop.js)
  businesses: {}, // businessId -> { boughtDay, lastPayout: day of last passive-income payout }
  ownedDecor: [], // purchased decor/catalog item ids (decor/catalog.jsx) — separate from `owned` (uniforms)
}
const PERSIST = Object.keys(BASE)

/** The local player's current outfit, read by the Avatar every frame (no React renders). */
export const outfit = { version: 0, id: null, suit: null, pants: null, trim: null, hat: null, vest: null }
function applyOutfit(id) {
  const u = id && uniformById(id)
  outfit.id = u ? u.id : null
  outfit.suit = u ? u.suit : null
  outfit.pants = u ? u.pants : null
  outfit.trim = u ? u.trim : null
  outfit.hat = u ? u.hat : null
  outfit.vest = u ? u.vest : null
  outfit.version++
}

const toast = (t) => useStore.getState().showToast(t)
const fmt = (n) => Math.round(n).toLocaleString('en-US')

export const useJobs = create((set, get) => {
  const persist = () => {
    const s = get()
    try { localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(PERSIST.map((k) => [k, s[k]])))) } catch {}
  }
  const log = (kind, text, amount) => {
    const s = get()
    set({ ledger: [{ day: s.day, kind, text, amount }, ...s.ledger].slice(0, 80) })
  }
  const add = (amount, kind, text) => { set({ wallet: get().wallet + amount }); log(kind, text, amount) }
  const bumpRating = (delta) => set({ rating: Math.max(0, Math.min(100, get().rating + delta)) })
  /** Pay out every owned business stake for each day since its last payout. Called once per
   * world-day advance, right after `day` increments. */
  const payBusinesses = () => {
    const s = get()
    const ids = Object.keys(s.businesses)
    if (!ids.length) return
    let total = 0
    const next = { ...s.businesses }
    for (const id of ids) {
      const b = businessById(id)
      const rec = s.businesses[id]
      if (!b || !rec) continue
      const days = Math.max(0, s.day - rec.lastPayout)
      if (days <= 0) continue
      total += b.dailyIncome * days
      next[id] = { ...rec, lastPayout: s.day }
    }
    if (total > 0) { set({ businesses: next }); add(total, 'business', `Daily income from ${ids.length} business stake${ids.length === 1 ? '' : 's'}`) }
  }

  return {
    ...BASE,
    ...(saved ? Object.fromEntries(PERSIST.filter((k) => saved[k] !== undefined).map((k) => [k, saved[k]])) : {}),
    shift: null, // { siteId, route: [stopId], idx, earned } while clocked in
    task: null, // { stopId, start (ms), secs } while a task runs

    nextPayDay: () => get().periodStart + PAY[get().schedule].days,
    daysToPay: () => Math.max(0, get().periodStart + PAY[get().schedule].days - get().day),

    spend: (amount, kind, text) => {
      if (get().wallet < amount) { toast(`Not enough credits: ${fmt(amount)} needed, you have ${fmt(get().wallet)}.`); return false }
      set({ wallet: get().wallet - amount }); log(kind, text, -amount); persist()
      return true
    },
    /** Credit the wallet from outside the payroll/shift system (e.g. live-stream sponsorships).
     * Public counterpart to the internal `add` helper, for other systems to use. */
    earn: (amount, kind, text) => {
      amount = Math.max(0, Math.round(amount))
      if (!amount) return
      add(amount, kind, text); persist()
    },

    // ---- ATM: move credits between cash (wallet, spendable in person) and bank (safe) ----
    deposit: (amount) => {
      amount = Math.max(0, Math.round(amount))
      if (!amount) return false
      if (get().wallet < amount) { toast(`Not enough cash: ${fmt(amount)} needed, you have ${fmt(get().wallet)}.`); return false }
      set({ wallet: get().wallet - amount, bank: get().bank + amount }); log('bank', `ATM deposit`, -amount); persist()
      return true
    },
    withdraw: (amount) => {
      amount = Math.max(0, Math.round(amount))
      if (!amount) return false
      if (get().bank < amount) { toast(`Not enough in the bank: ${fmt(amount)} needed, you have ${fmt(get().bank)}.`); return false }
      set({ bank: get().bank - amount, wallet: get().wallet + amount }); log('bank', `ATM withdrawal`, amount); persist()
      return true
    },

    hire: (jobId) => {
      const job = jobById(jobId)
      if (!job) return
      const s = get()
      if (s.jobId === jobId) { toast(`You already work as ${job.title}.`); return }
      if (s.jobId) get().quit(true)
      set({ jobId, accrued: 0, periodStart: get().day, hiredDay: get().day })
      log('hire', `Hired: ${job.title}`, 0); persist()
      toast(`Hired as ${job.title}. Buy the ${uniformById(job.uniform).name} in the uniform shop, then clock in at the ${SITES[job.site[0]].name}.`)
    },

    quit: (silent) => {
      const s = get()
      if (!s.jobId) return
      const job = jobById(s.jobId)
      if (s.shift) get().clockOut(true)
      if (get().accrued > 0) {
        add(get().accrued, 'pay', `Final pay, ${job.title} (no period bonus)`)
        if (!silent) toast(`You left ${job.title}. Final pay of ${fmt(get().accrued)} credits was added to your wallet.`)
      } else if (!silent) toast(`You left ${job.title}.`)
      set({ jobId: null, accrued: 0 }); persist()
    },

    setSchedule: (id) => {
      if (!PAY[id]) return
      set({ schedule: id }); persist()
    },

    buyUniform: (id) => {
      const u = uniformById(id)
      if (!u || get().owned.includes(id)) return
      if (!get().spend(u.price, 'uniform', `Uniform: ${u.name}`)) return
      set({ owned: [...get().owned, id] }); persist()
      toast(`Bought ${u.name}.`)
    },

    /** Buy a priced decor/catalog item once, so it can be placed in any space the player may
     * decorate. Free (unpriced) items never need this. */
    buyDecorItem: (item) => {
      if (!item || !item.price) return true // free items don't need owning
      if (get().ownedDecor.includes(item.id)) return true
      if (!get().spend(item.price, 'decor', `Bought: ${item.name}`)) return false
      set({ ownedDecor: [...get().ownedDecor, item.id] }); persist()
      toast(`Bought ${item.name}.`)
      return true
    },

    /** Buy a priced vehicle (config/vehicleShop.js) once, so it's yours to drive any time after -
     * the free starter fleet (price 0) never needs this. */
    buyVehicle: (spawnId, price, name) => {
      if (!price) return true
      if (get().vehicles.includes(spawnId)) return true
      if (!get().spend(price, 'vehicle', `Bought: ${name}`)) return false
      set({ vehicles: [...get().vehicles, spawnId] }); persist()
      toast(`Bought the ${name}. It's yours now.`)
      return true
    },

    wear: (id) => {
      if (id && !get().owned.includes(id)) return
      if (get().shift && id !== jobById(get().jobId)?.uniform) { toast('Clock out to change out of your work uniform.'); return }
      set({ wearing: id }); applyOutfit(id); persist()
    },

    /** Clock in at a site's time clock. Returns an explanation when it can't. */
    clockIn: (siteId) => {
      const s = get()
      const job = s.jobId && jobById(s.jobId)
      if (!job) { toast('You need a job first. Pick one at the Job Center job board.'); return false }
      if (s.shift) { toast('You are already on shift.'); return false }
      if (!job.site.includes(siteId)) { toast(`${job.title}s clock in at the ${job.site.map((x) => SITES[x].name).join(' or ')}.`); return false }
      if (!s.owned.includes(job.uniform)) { toast(`You need the ${uniformById(job.uniform).name} first. The uniform shop is in the Job Center.`); return false }
      const route = routeFor(job, siteId).map((x) => x.id)
      set({ shift: { siteId, route, idx: 0, earned: 0 }, task: null, wearing: job.uniform })
      applyOutfit(job.uniform); persist()
      toast(`Clocked in as ${job.title}. Follow the gold beacon; stand at each stop and press E.`)
      return true
    },

    clockOut: (silent) => {
      if (!get().shift) { if (!silent) toast('You are not on shift.'); return }
      const e = get().shift.earned
      set({ shift: null, task: null }); persist()
      if (!silent) toast(e ? `Clocked out. ${fmt(e)} credits added to this pay period.` : 'Clocked out.')
    },

    startTask: () => {
      const s = get()
      if (!s.shift || s.task) return
      const stop = s.shift.route[s.shift.idx]
      if (!stop) return
      set({ task: { stopId: stop, start: performance.now(), secs: STOPS[stop]?.secs ?? 3, tapped: false } })
    },
    /** Walking away mid-task cancels it and costs a little performance rating (see ShiftHud's bar
     * for the visible timer that would have kept it running). */
    cancelTask: (why) => {
      if (get().task) {
        set({ task: null })
        bumpRating(-4)
        if (why) toast(why)
      }
    },
    /** The quality tap: press E again while a task is running (the shift card's progress bar shows
     * where you are in it). Landing it in the last stretch, right as the bar fills, is a "quality"
     * finish and raises your rating; jabbing it right at the start is a rushed finish and costs a
     * little. The middle of the bar is a no-op so there's no penalty for an imprecise tap. Only the
     * first tap per task counts, so mashing E doesn't let you re-roll it. */
    tagTask: () => {
      const s = get()
      if (!s.task || s.task.tapped) return
      const frac = (performance.now() - s.task.start) / (s.task.secs * 1000)
      set({ task: { ...s.task, tapped: true } })
      if (frac < 0.3) { bumpRating(-2); toast('Rushed it - wait for the task to finish next time.') }
      else if (frac >= 0.75) { bumpRating(3); toast('Nice timing! Performance rating up.') }
    },

    /** The current stop's task finished: pay it (scaled by the performance rating) and move to the
     * next stop. Completing a stop steadily (without being tagged as rushed) nudges the rating up. */
    completeStop: () => {
      const s = get()
      const job = jobById(s.jobId)
      if (!s.shift || !job) return
      const mult = ratingMultiplier(s.rating)
      const pay = Math.round(stopPay(job) * mult)
      let earned = s.shift.earned + pay
      let idx = s.shift.idx + 1
      set({ accrued: s.accrued + pay, lifetime: s.lifetime + pay, task: null })
      bumpRating(0.4)
      if (idx >= s.shift.route.length) {
        const bonus = Math.round(routeBonus(job) * mult)
        set({ accrued: get().accrued + bonus, lifetime: get().lifetime + bonus, shifts: get().shifts + 1, shift: null })
        bumpRating(1)
        log('shift', `Shift complete: ${job.title}`, earned + bonus)
        toast(`Shift complete! +${fmt(earned + bonus)} credits this pay period (includes a ${Math.round(ROUTE_BONUS * 100)}% route bonus). Performance: ${ratingTier(get().rating)}.`)
      } else {
        set({ shift: { ...s.shift, idx, earned } })
        toast(`+${fmt(pay)} credits · stop ${idx + 1} of ${s.shift.route.length}`)
      }
      persist()
    },

    /** Buy a stake in a business (config/businesses.js) once, so it pays you daily from here on. */
    buyBusiness: (id) => {
      const b = businessById(id)
      if (!b || get().businesses[id]) return false
      if (!get().spend(b.price, 'business', `Bought a stake: ${b.name}`)) return false
      set({ businesses: { ...get().businesses, [id]: { boughtDay: get().day, lastPayout: get().day } } }); persist()
      toast(`Bought a stake in ${b.name}. It pays out daily from now on.`)
      return true
    },

    /** A world day has passed: pay out if the pay period has ended. */
    advanceDay: () => {
      set({ day: get().day + 1 })
      payBusinesses()
      const s = get()
      if (s.jobId && s.day >= s.periodStart + PAY[s.schedule].days) {
        const p = PAY[s.schedule]
        const gross = s.accrued
        const bonus = Math.round(gross * p.bonus)
        const job = jobById(s.jobId)
        if (gross > 0) {
          add(gross + bonus, 'pay', `${p.label} pay, ${job.title}${bonus ? ` (includes +${Math.round(p.bonus * 100)}% bonus)` : ''}`)
          toast(`Payday! ${fmt(gross + bonus)} credits (${p.label.toLowerCase()} pay) were added to your wallet.`)
        } else {
          log('pay', `${p.label} pay day: nothing earned this period`, 0)
          toast(`Payday, but you didn't work any stops this ${p.label.toLowerCase()} period.`)
        }
        set({ accrued: 0, periodStart: s.day })
      }
      persist()
    },
    skipDays: (n = 1) => { for (let i = 0; i < n; i++) get().advanceDay() },

    resetAll: () => { set({ ...BASE, shift: null, task: null }); applyOutfit(null); persist() },
  }
})

// restore the saved outfit on load
applyOutfit(useJobs.getState().wearing)

export function currentStop() {
  const s = useJobs.getState().shift
  return s ? STOPS[s.route[s.idx]] : null
}

// ---- car washes ----
// Each wash has a machine cycle (foam, brushes, rinse, dryers). The kiosk starts one for the player's
// credits; NPC customers also run it on their own. Cosmetic: nothing in this build gets dirty.
export const washes = {
  carwashA: { t: -1, by: null, lastNpc: 0 },
  carwashB: { t: -1, by: null, lastNpc: 0 },
}
export function startWash(siteId, by) {
  const w = washes[siteId]
  if (!w || w.t >= 0) return false
  w.t = 0; w.by = by; w.start = performance.now()
  return true
}
export function payForWash(siteId) {
  const w = washes[siteId]
  if (!w) return
  if (w.t >= 0) { toast('A wash is already running. Wait for the green light.'); return }
  if (!useJobs.getState().spend(WASH_PRICE, 'wash', `Car wash: ${SITES[siteId].name}`)) return
  startWash(siteId, 'player')
  toast(`Wash started (${WASH_PRICE} credits). Stay in the tunnel until the light turns green.`)
}
export { WASH_SECONDS }

// ---- ironing station registers ----
// A flat, same-visit "pressing" charge at a working register — real credits leave the player's
// wallet and a receipt line is added to the ledger. There's no laundry-basket minigame behind it
// (nothing in this build gets wrinkled), the same honest scope as the car wash above.
const lastIron = {} // registerId -> last charge time (ms), to stop a held key from spamming charges
export function payForIroning(registerId) {
  const now = performance.now()
  if (now - (lastIron[registerId] || 0) < 1500) return
  lastIron[registerId] = now
  if (!useJobs.getState().spend(IRON_PRICE, 'iron', 'The Purple Ironing Station: pressing')) return
  toast(`Pressed and ready — ${IRON_PRICE} credits. Thanks from The Purple Ironing Station!`)
}
export { IRON_PRICE }
