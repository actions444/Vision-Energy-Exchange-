import { create } from 'zustand'
import { useJobs } from './jobs.js'
import { useStore } from './store.js'

// Casino game logic for The Jackpot Exchange. All three games spend/earn real VSE credits from
// the player's wallet (state/jobs.js) — nothing here is persisted on its own; wallet changes are
// the only lasting effect, exactly like the ATM or the car wash.

const toast = (t) => useStore.getState().showToast(t)
const fmt = (n) => Math.round(n).toLocaleString('en-US')

// ---------------------------------------------------------------------------
// Slots
// ---------------------------------------------------------------------------
export const SLOT_BET = 10
const SYMBOLS = [
  { id: 'cherry', glyph: '🍒', weight: 34, pay3: 3, pay2: 1 },
  { id: 'lemon', glyph: '🍋', weight: 26, pay3: 4 },
  { id: 'bell', glyph: '🔔', weight: 18, pay3: 8 },
  { id: 'star', glyph: '⭐', weight: 12, pay3: 15 },
  { id: 'diamond', glyph: '💎', weight: 7, pay3: 30 },
  { id: 'seven', glyph: '7️⃣', weight: 3, pay3: 80 },
]
const TOTAL_WEIGHT = SYMBOLS.reduce((a, s) => a + s.weight, 0)
function spinReel() {
  let r = Math.random() * TOTAL_WEIGHT
  for (const s of SYMBOLS) { if ((r -= s.weight) < 0) return s }
  return SYMBOLS[0]
}

/** Spin one slot machine. Returns { reels: [glyph,glyph,glyph], win, payout } synchronously —
 *  the panel animates the reveal itself, this just resolves the outcome and moves the money. */
export function spinSlots(bet = SLOT_BET) {
  if (!useJobs.getState().spend(bet, 'casino', `Slots · ${bet} cr bet`)) return null
  const reels = [spinReel(), spinReel(), spinReel()]
  let payout = 0
  if (reels[0].id === reels[1].id && reels[1].id === reels[2].id) {
    payout = bet * reels[0].pay3
  } else if (reels[0].id === 'cherry' && reels[1].id === 'cherry') {
    payout = bet * (reels[0].pay2 || 0)
  } else if (reels[1].id === 'cherry' && reels[2].id === 'cherry') {
    payout = bet * (reels[1].pay2 || 0)
  }
  if (payout > 0) useJobs.getState().earn(payout, 'casino', `Slots win · ${reels.map((s) => s.glyph).join(' ')}`)
  return { reels: reels.map((s) => s.glyph), win: payout > 0, payout }
}

// ---------------------------------------------------------------------------
// Roulette (European, single zero)
// ---------------------------------------------------------------------------
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])
export const colorOf = (n) => (n === 0 ? 'green' : RED_NUMBERS.has(n) ? 'red' : 'black')

/** bet: { kind: 'number'|'color'|'parity'|'range', value } , amount in credits.
 *  Returns { number, color, win, payout } or null if the wallet can't cover the bet. */
export function spinRoulette(bet, amount) {
  if (!useJobs.getState().spend(amount, 'casino', `Roulette · ${amount} cr on ${describeBet(bet)}`)) return null
  const number = Math.floor(Math.random() * 37) // 0..36
  const color = colorOf(number)
  let win = false
  let mult = 0
  if (bet.kind === 'number' && bet.value === number) { win = true; mult = 35 }
  else if (bet.kind === 'color' && number !== 0 && bet.value === color) { win = true; mult = 1 }
  else if (bet.kind === 'parity' && number !== 0 && bet.value === (number % 2 === 0 ? 'even' : 'odd')) { win = true; mult = 1 }
  else if (bet.kind === 'range' && number !== 0 && bet.value === (number <= 18 ? 'low' : 'high')) { win = true; mult = 1 }
  const payout = win ? amount * (mult + 1) : 0 // mult+1 returns the stake plus winnings
  if (payout > 0) useJobs.getState().earn(payout, 'casino', `Roulette win · ${number} ${color}`)
  return { number, color, win, payout }
}
function describeBet(bet) {
  if (bet.kind === 'number') return `#${bet.value}`
  return bet.value
}

// ---------------------------------------------------------------------------
// Blackjack (single hand vs dealer, hit/stand, blackjack pays 3:2)
// ---------------------------------------------------------------------------
const SUITS = ['♠', '♥', '♦', '♣']
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
function freshShoe() {
  const deck = []
  for (const s of SUITS) for (const r of RANKS) deck.push({ r, s })
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[deck[i], deck[j]] = [deck[j], deck[i]] }
  return deck
}
function cardValue(card) { return card.r === 'A' ? 11 : ['J', 'Q', 'K'].includes(card.r) ? 10 : Number(card.r) }
export function handTotal(cards) {
  let total = cards.reduce((a, c) => a + cardValue(c), 0)
  let aces = cards.filter((c) => c.r === 'A').length
  while (total > 21 && aces > 0) { total -= 10; aces-- }
  return total
}

export const useBlackjack = create((set, get) => ({
  active: false, bet: 0, shoe: [], player: [], dealer: [], status: null, // null | 'player' | 'dealer-reveal' | 'done'
  result: null, // { outcome: 'win'|'lose'|'push'|'blackjack', payout }

  start: (amount) => {
    if (get().active) return
    if (!useJobs.getState().spend(amount, 'casino', `Blackjack · ${amount} cr bet`)) return
    const shoe = freshShoe()
    const player = [shoe.pop(), shoe.pop()]
    const dealer = [shoe.pop(), shoe.pop()]
    const playerBJ = handTotal(player) === 21
    set({ active: true, bet: amount, shoe, player, dealer, status: playerBJ ? 'dealer-reveal' : 'player', result: null })
    if (playerBJ) get()._resolve()
  },

  hit: () => {
    const s = get()
    if (s.status !== 'player') return
    const shoe = s.shoe.slice()
    const player = [...s.player, shoe.pop()]
    if (handTotal(player) > 21) { set({ shoe, player, status: 'dealer-reveal' }); get()._resolve(); return }
    set({ shoe, player })
  },

  stand: () => {
    const s = get()
    if (s.status !== 'player') return
    set({ status: 'dealer-reveal' })
    get()._resolve()
  },

  _resolve: () => {
    const s = get()
    let dealer = s.dealer.slice()
    let shoe = s.shoe.slice()
    const playerTotal = handTotal(s.player)
    if (playerTotal <= 21) {
      while (handTotal(dealer) < 17) dealer = [...dealer, shoe.pop()]
    }
    const dealerTotal = handTotal(dealer)
    const playerBJ = s.player.length === 2 && playerTotal === 21
    const dealerBJ = dealer.length === 2 && dealerTotal === 21
    let outcome, payout = 0
    if (playerTotal > 21) outcome = 'lose'
    else if (playerBJ && !dealerBJ) { outcome = 'blackjack'; payout = s.bet * 2.5 }
    else if (dealerBJ && !playerBJ) outcome = 'lose'
    else if (dealerTotal > 21) { outcome = 'win'; payout = s.bet * 2 }
    else if (playerTotal > dealerTotal) { outcome = 'win'; payout = s.bet * 2 }
    else if (playerTotal < dealerTotal) outcome = 'lose'
    else { outcome = 'push'; payout = s.bet }
    if (payout > 0) useJobs.getState().earn(payout, 'casino', `Blackjack ${outcome} · +${fmt(payout)}`)
    set({ dealer, shoe, status: 'done', result: { outcome, payout } })
  },

  reset: () => set({ active: false, bet: 0, shoe: [], player: [], dealer: [], status: null, result: null }),
}))
