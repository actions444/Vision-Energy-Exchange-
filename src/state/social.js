// Vision Live: TikTok-Live-style streaming from a space you own or rent (reuses the same
// owner/renter check as decorating that space). Followers grow slowly for as long as you're
// live; once your all-time follower count clears FOLLOWER_GATE, a live session also earns
// sponsorship credits into the same VSE-credits wallet as the rest of the economy. Followers and
// total-streams are saved on this device - a single-player stat, like everything else in
// state/jobs.js, not a real social platform.
import { create } from 'zustand'
import { checkAllowed } from '../decor/decor.js'
import { useJobs } from './jobs.js'
import { useStore } from './store.js'

export const FOLLOWER_GATE = 900
const SPONSOR_PER_MIN = 6 // credits/min once the gate is cleared
const TICK_MS = 4000

const KEY = 'vsw-social'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null } }
const saved = load()
const toast = (t) => useStore.getState().showToast(t)

export const useSocial = create((set, get) => {
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify({ followers: get().followers, totalStreams: get().totalStreams })) } catch {} }
  return {
    followers: saved?.followers ?? 40, // a small following to start with, like a new creator account
    totalStreams: saved?.totalStreams ?? 0,
    liveSpaceId: null, // spaceId currently streaming from, or null
    liveSpaceName: null,
    liveSince: null, // ms timestamp
    sessionFollowers: 0, // gained so far this stream
    sessionEarnings: 0, // sponsorship credits so far this stream
    _owedCredits: 0, // fractional sponsorship credits accrued since the last whole-credit payout (not persisted)
    checking: false,

    /** Start streaming from `spaceId` (must be a space this visitor owns or currently rents). */
    goLive: async (spaceId, spaceName) => {
      if (get().liveSpaceId) return
      set({ checking: true })
      const allowed = await checkAllowed(spaceId).catch(() => ({ ok: false, reason: 'Could not check access to this space.' }))
      set({ checking: false })
      if (!allowed.ok) { toast(allowed.reason || "You can't go live from here."); return false }
      set({ liveSpaceId: spaceId, liveSpaceName: spaceName, liveSince: Date.now(), sessionFollowers: 0, sessionEarnings: 0 })
      toast(`You're live from ${spaceName}! Followers trickle in while you stay live.`)
      startTicking()
      return true
    },
    /** Stop the current stream. Followers/credits already earned this session stay earned. */
    endLive: () => {
      const s = get()
      if (!s.liveSpaceId) return
      stopTicking()
      set({ totalStreams: s.totalStreams + 1 })
      persist()
      const mins = Math.max(1, Math.round((Date.now() - s.liveSince) / 60000))
      toast(`Stream ended: +${s.sessionFollowers} followers${s.sessionEarnings ? `, +${s.sessionEarnings} cr sponsorship` : ''} over ${mins} min.`)
      set({ liveSpaceId: null, liveSpaceName: null, liveSince: null })
    },
    _tick: () => {
      const s = get()
      if (!s.liveSpaceId) return
      // diminishing returns as the account grows, so it settles rather than running away
      const scale = Math.max(0.25, 1 - s.followers / 6000)
      const gained = Math.max(1, Math.round((2 + Math.random() * 3) * scale))
      const followers = s.followers + gained
      let earnings = s.sessionEarnings
      let owed = s._owedCredits
      if (followers >= FOLLOWER_GATE) {
        // SPONSOR_PER_MIN is a rate, not a whole credit every tick (a 4s tick earns well under 1
        // credit), so fractional credits accrue here and pay out in whole credits once they add up.
        owed += SPONSOR_PER_MIN * (TICK_MS / 60000)
        const credits = Math.floor(owed)
        if (credits > 0) { useJobs.getState().earn(credits, 'stream', 'Vision Live sponsorship'); earnings += credits; owed -= credits }
      }
      set({ followers, sessionFollowers: s.sessionFollowers + gained, sessionEarnings: earnings, _owedCredits: owed })
      persist()
    },
  }
})

let timer = null
function startTicking() { if (timer) return; timer = setInterval(() => useSocial.getState()._tick(), TICK_MS) }
function stopTicking() { if (timer) { clearInterval(timer); timer = null } }
