import { useState, useEffect } from 'react'
import { useDailyBonus } from '../state/dailyBonus.js'
import { useStore } from '../state/store.js'
import { useJobs } from '../state/jobs.js'

export default function DailyBonusChip() {
  const [available, setAvailable] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const { checkBonus, claimBonus } = useDailyBonus()
  const { spend } = useJobs()

  useEffect(() => {
    const hasBonus = checkBonus()
    setAvailable(hasBonus)
  }, [checkBonus])

  const handleClaim = async () => {
    setClaiming(true)
    const amount = claimBonus()
    if (amount) {
      spend(-amount, 'daily-bonus', 'Daily login bonus')
      useStore.getState().showToast(`Daily Bonus: +${amount} credits! 🎁`)
      setAvailable(false)
    }
    setClaiming(false)
  }

  if (!available) return null

  return (
    <div className="daily-bonus-chip">
      <button
        className="btn small primary"
        onClick={handleClaim}
        disabled={claiming}
        title="Claim your daily login bonus!"
      >
        {claiming ? 'Claiming...' : '🎁 Daily Bonus'}
      </button>
    </div>
  )
}
