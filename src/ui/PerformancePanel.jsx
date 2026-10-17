import { useState } from 'react'
import { Panel } from './UI.jsx'
import { useStore } from '../state/store.js'
import { playerState } from '../state/runtime.js'
import { useMusic, musicEngine } from '../music/engine.js'
import { useMusicLibrary } from '../music/library.js'

// The Performance panel: Phase 1 of the concert system. Pick one of your tracks (demo or
// uploaded through Owner tools -> Music) and perform it on the Grand Concert Stage - sing with
// real audio-reactive lip sync, dance, and work the crowd with a few gestures. See the chat
// reply for the full development checklist of what's built here versus still a placeholder.
export default function PerformancePanel() {
  const track = useMusic((s) => s.track)
  const status = useMusic((s) => s.status)
  const tracks = useMusicLibrary((s) => s.tracks)
  const toast = useStore((s) => s.showToast)
  const [tab, setTab] = useState(track ? 'perform' : 'pick')
  const performing = !!playerState.performing

  const startSong = (t) => {
    musicEngine.unlock()
    musicEngine.playQueue([t.id], { name: 'Live performance' })
    playerState.performing = { trackId: t.id }
    playerState.sing = 1
    setTab('perform')
  }
  const gesture = (g, secs) => {
    playerState.gesture = g
    playerState.gestureUntil = performance.now() / 1000 + secs
  }
  const speak = () => {
    toast("You: \"Thank you, Vision Storms - this next one's for you!\"")
    // Scripted line only for now; real NPC conversations with audible speech and facial sync
    // are a later phase (see the development checklist).
  }
  const end = () => {
    playerState.performing = null
    playerState.sing = 0
    playerState.dancing = false
    playerState.gesture = null
    musicEngine.pause()
  }

  return (
    <Panel title="Performance" eyebrow="Grand Concert Stage">
      {tab === 'pick' || !performing ? (
        <>
          <p className="hint">Pick a track - one of yours, uploaded under Owner tools → Music, or a demo track - and perform it live on the stage. The crowd out front reacts to the music automatically.</p>
          <ul className="jobs">
            {tracks.map((t) => (
              <li key={t.id}>
                <b>{t.title}</b><span>{t.artist || 'Vision Storms Records'}</span>
                <button className="btn small" onClick={() => startSong(t)} style={{ marginLeft: 8 }}>Perform</button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p className="hint">Now performing <b>{track?.title}</b>{track?.artist ? ' · ' + track.artist : ''} · {status === 'playing' ? 'live' : status}. Walk, dance and gesture freely - your mouth is synced to the real audio.</p>
          <div className="admin-list">
            <div className="admin-row">
              <div className="grow"><b>Dance</b><small>Toggles a dance sway layered on top of singing/walking</small></div>
              <button className={'btn small' + (playerState.dancing ? ' on' : '')} onClick={() => { playerState.dancing = !playerState.dancing }}>{playerState.dancing ? 'Stop dancing' : 'Dance'}</button>
            </div>
            <div className="admin-row">
              <div className="grow"><b>Crowd gestures</b><small>Clap, bow or point toward the audience</small></div>
              <div className="row-actions">
                <button className="btn small" onClick={() => gesture('clap', 2.2)}>Clap</button>
                <button className="btn small" onClick={() => gesture('bow', 2)}>Bow</button>
                <button className="btn small" onClick={() => gesture('point', 1.6)}>Point</button>
              </div>
            </div>
            <div className="admin-row">
              <div className="grow"><b>Speak</b><small>A scripted line between songs (placeholder for real audience conversations)</small></div>
              <button className="btn small" onClick={speak}>Speak</button>
            </div>
            <div className="admin-row">
              <div className="grow"><b>Set</b><small>Skip to the next track, or choose a different song</small></div>
              <div className="row-actions">
                <button className="btn small" onClick={() => musicEngine.next()}>Next song</button>
                <button className="btn ghost small" onClick={() => setTab('pick')}>Change song</button>
              </div>
            </div>
          </div>
          <p className="hint center"><button className="btn ghost small" onClick={end}>End performance</button></p>
        </>
      )}
    </Panel>
  )
}
