import { useEffect, useState } from 'react'
import { useSocial } from '../state/social.js'

// On-screen "you are live" badge, shown for as long as a Vision Live stream is running. It shows a red LIVE
// tag, where you are streaming from, the stream timer, followers gained so far, and an End button.
export default function LiveBadge() {
  const liveSpaceId = useSocial((s) => s.liveSpaceId)
  const liveSpaceName = useSocial((s) => s.liveSpaceName)
  const liveSince = useSocial((s) => s.liveSince)
  const sessionFollowers = useSocial((s) => s.sessionFollowers)
  const sessionEarnings = useSocial((s) => s.sessionEarnings)
  const followers = useSocial((s) => s.followers)
  const endLive = useSocial((s) => s.endLive)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!liveSpaceId) return
    const i = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(i)
  }, [liveSpaceId])
  if (!liveSpaceId) return null

  const secs = Math.max(0, Math.floor((now - liveSince) / 1000))
  const clock = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`
  return (
    <div id="live-badge" role="status" aria-live="polite" style={{ position: 'fixed', top: 14, left: 14, zIndex: 60, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(12,12,16,0.82)', border: '1px solid rgba(255,70,90,0.6)', color: '#fff', fontFamily: 'system-ui, sans-serif', fontSize: 14, boxShadow: '0 4px 18px rgba(0,0,0,0.35)' }}>
      <span style={{ background: '#e5394b', color: '#fff', fontWeight: 800, letterSpacing: 1, padding: '3px 8px', borderRadius: 6, fontSize: 12 }}>● LIVE</span>
      <span>{liveSpaceName || 'Your space'}</span>
      <span style={{ opacity: 0.8 }}>{clock}</span>
      <span style={{ opacity: 0.8 }}>{followers.toLocaleString('en-US')} followers (+{sessionFollowers})</span>
      {sessionEarnings > 0 && <span style={{ opacity: 0.8 }}>+{sessionEarnings} cr</span>}
      <button id="live-end" onClick={() => endLive()} style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}>End</button>
    </div>
  )
}
