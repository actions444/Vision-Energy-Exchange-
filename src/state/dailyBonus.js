import { create } from 'zustand'

const BONUS_KEY = 'vsw-daily-bonus'
const BONUS_AMOUNT = 1000 // credits
const BONUS_OUTFIT_CHANCE = 0.3 // 30% chance to get a random outfit

function getLastBonusDate() {
  try {
    const stored = localStorage.getItem(BONUS_KEY)
    return stored ? new Date(stored) : null
  } catch {
    return null
  }
}

function setLastBonusDate() {
  try {
    localStorage.setItem(BONUS_KEY, new Date().toISOString())
  } catch {}
}

function isBonusAvailable() {
  const lastBonus = getLastBonusDate()
  if (!lastBonus) return true

  const now = new Date()
  const last = new Date(lastBonus)

  // Check if it's a new day (UTC)
  return (
    now.getUTCDate() !== last.getUTCDate() ||
    now.getUTCMonth() !== last.getUTCMonth() ||
    now.getUTCFullYear() !== last.getUTCFullYear()
  )
}

export const useDailyBonus = create(() => ({
  claimed: false,

  checkBonus() {
    return isBonusAvailable()
  },

  claimBonus() {
    if (!isBonusAvailable()) {
      return null
    }
    setLastBonusDate()
    useDailyBonus.setState({ claimed: true })
    return BONUS_AMOUNT
  },

  reset() {
    useDailyBonus.setState({ claimed: false })
  },
}))
