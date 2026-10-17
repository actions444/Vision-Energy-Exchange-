import { useEffect, useState } from 'react'
import { Panel } from './UI.jsx'
import { useSocial, FOLLOWER_GATE } from '../state/social.js'

const fmt = (n) => Math.round(n).toLocaleString('en-US')

/** Vision Live: go live from a space you own or rent, watch followers trickle in, and once you
 * clear the follower gate, sponsorship credits too. */
export default function LivePanel({ spaceId, spaceName }) {
  const s = useSocial()
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i) }, [])
  const live = !!s.liveSpaceId
  const gated = s.followers < FOLLOWER_GATE
  const mins = live ? Math.floor((now - s.liveSince) / 60000) : 0
  const secs = live ? Math.floor(((now - s.liveSince) % 60000) / 1000) : 0

  return (
    <Panel title="Vision Live" eyebrow="Stream from a space you own or rent">
      <div className="admin-list">
        <div className="meter-row">
          <div className="meter accent"><span className="meter-label">Followers</span><strong id="live-followers">{fmt(s.followers)}</strong><em>{gated ? `${FOLLOWER_GATE - s.followers} to sponsorships` : 'sponsorships unlocked'}</em></div>
          <div className="meter"><span className="meter-label">Streams</span><strong>{fmt(s.totalStreams)}</strong></div>
        </div>

        {gated && (
          <div className="field">
            <div className="progress"><div className="progress-bar" style={{ width: `${Math.min(100, (s.followers / FOLLOWER_GATE) * 100)}%` }} /></div>
            <small className="hint">At {FOLLOWER_GATE} followers, Vision Live starts paying sponsorship credits for every minute you're live, straight into your wallet.</small>
          </div>
        )}

        {live ? (
          <>
            <div className="now-showing">
              <div className="grow">
                <small className="eyebrow">Live now · {s.liveSpaceName}</small>
                <b>{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</b>
                <small>+{fmt(s.sessionFollowers)} followers this stream{s.sessionEarnings ? ` · +${fmt(s.sessionEarnings)} cr sponsorship` : ''}</small>
              </div>
            </div>
            <button className="btn primary" id="live-end" onClick={s.endLive}>End stream</button>
          </>
        ) : spaceId ? (
          <button className="btn primary" id="live-start" disabled={s.checking} onClick={() => s.goLive(spaceId, spaceName)}>{s.checking ? 'Checking access…' : `Go live from ${spaceName}`}</button>
        ) : (
          <p className="hint">Walk into a space you own or rent, then open Vision Live from there to go live.</p>
        )}
        <p className="note">Followers and streams are saved on this device - a single-player stat, not a real social platform.</p>
      </div>
    </Panel>
  )
}
