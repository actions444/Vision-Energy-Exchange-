import { useAccount } from '../state/profileSync.js'

// One line on the start screen saying where the player's avatar is saved.
export default function AccountStatus() {
  const { status, reason } = useAccount()
  const text = status === 'account'
    ? 'Your avatar is saved to your account and follows you to any device.'
    : status === 'checking'
      ? 'Checking your account…'
      : reason || 'Your avatar is saved on this device.'
  return <small id="account-status" className="hint" role="status" aria-live="polite">{text}</small>
}
