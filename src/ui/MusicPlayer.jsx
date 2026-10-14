import { useState } from 'react'
import { useMusic, musicEngine } from '../music/engine.js'
import { useStore } from '../state/store.js'

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d={d} fill="currentColor" /></svg>
)
const ICONS = {
  vol: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z',
  mute: 'M16.5 12A4.5 4.5 0 0 0 14 8v2.2l2.4 2.4c.1-.2.1-.4.1-.6zM19 12c0 .9-.2 1.8-.5 2.6l1.5 1.5A8.9 8.9 0 0 0 21 12a9 9 0 0 0-7-8.8v2.1A7 7 0 0 1 19 12zM4.3 3 3 4.3 7.7 9H3v6h4l5 5v-6.7l4.3 4.2c-.7.5-1.4.9-2.3 1.2v2.1a9 9 0 0 0 3.7-1.8l2 2 1.3-1.3L4.3 3zM12 4 9.9 6.1 12 8.2V4z',
  next: 'M6 18l8.5-6L6 6v12zm10-12v12h2V6h-2z',
}

// Persistent music player: artwork, title, artist, room, volume, mute, skip.
export default function MusicPlayer() {
  const m = useMusic()
  const isTouch = useStore((s) => s.isTouch)
  const [open, setOpen] = useState(!isTouch)
  const needsTap = !m.enabled || m.status === 'blocked'

  const status = {
    loading: 'Loading…',
    silent: 'No music assigned here',
    error: m.error,
    embed: 'Live radio player',
    idle: '',
  }[m.status]

  return (
    <aside className={'player' + (open ? ' open' : '') + (isTouch ? ' touch' : '')} aria-label="Music player">
      <button className="player-art" onClick={() => setOpen(!open)} aria-label={open ? 'Collapse player' : 'Expand player'}>
        {m.art ? <img src={m.art} alt="" /> : <span className="art-fallback" />}
        {m.status === 'playing' && !m.muted && <i className="live-dot" />}
      </button>
      <div className="player-meta">
        <span className="player-room">{m.zoneName || 'Music'}{m.playlistName ? ` · ${m.playlistName}` : ''}</span>
        <b className="player-title">{m.track?.title || (m.status === 'silent' ? 'Silence' : '—')}</b>
        <span className="player-artist">{status || m.track?.artist || ''}</span>
      </div>
      <button className="icon-btn" onClick={() => musicEngine.setMuted(!m.muted)} aria-label={m.muted ? 'Unmute' : 'Mute'} title={m.muted ? 'Unmute' : 'Mute'}>
        <Icon d={m.muted ? ICONS.mute : ICONS.vol} />
      </button>
      {open && (
        <div className="player-controls">
          <input
            id="music-volume"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={m.volume}
            onChange={(e) => { musicEngine.setVolume(+e.target.value); if (m.muted) musicEngine.setMuted(false) }}
            aria-label="Volume"
          />
          <span className="vol-num">{Math.round(m.volume * 100)}</span>
          <button className="icon-btn" onClick={() => musicEngine.next()} disabled={m.kind !== 'tracks' || !m.track} aria-label="Next track" title="Next track">
            <Icon d={ICONS.next} />
          </button>
        </div>
      )}
      {needsTap && (
        <button className="player-unlock" onClick={() => musicEngine.unlock()}>Tap to turn on music</button>
      )}
      {open && m.status === 'embed' && m.embedUrl && (
        <div className="player-embed">
          <iframe src={m.embedUrl} title={m.playlistName} allow="autoplay; encrypted-media" loading="lazy" />
          <small>Volume for this station is set in its own player.</small>
        </div>
      )}
    </aside>
  )
}
