import { useEffect, useState } from 'react'
import { useMusic, musicEngine } from '../music/engine.js'
import { useStore } from '../state/store.js'

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d={d} fill="currentColor" /></svg>
)
const ICONS = {
  vol: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z',
  mute: 'M16.5 12A4.5 4.5 0 0 0 14 8v2.2l2.4 2.4c.1-.2.1-.4.1-.6zM19 12c0 .9-.2 1.8-.5 2.6l1.5 1.5A8.9 8.9 0 0 0 21 12a9 9 0 0 0-7-8.8v2.1A7 7 0 0 1 19 12zM4.3 3 3 4.3 7.7 9H3v6h4l5 5v-6.7l4.3 4.2c-.7.5-1.4.9-2.3 1.2v2.1a9 9 0 0 0 3.7-1.8l2 2 1.3-1.3L4.3 3zM12 4 9.9 6.1 12 8.2V4z',
  next: 'M6 18l8.5-6L6 6v12zm10-12v12h2V6h-2z',
  prev: 'M6 6h2v12H6zm3.5 6 8.5 6V6z',
  play: 'M8 5v14l11-7z',
  pause: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
  shuffle: 'M10.6 9.2 5.4 4 4 5.4l5.2 5.2 1.4-1.4zM14.5 4l2 2L4 18.6 5.4 20 18 7.5l2 2V4h-5.5zm.3 9.4-1.4 1.4 3.1 3.1L14.5 20H20v-5.5l-2 2-3.2-3.1z',
  repeat: 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z',
  repeatOne: 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z',
}
const fmt = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '')

// Persistent music player: artwork, title, artist, room, play/pause, previous/next, shuffle,
// repeat, progress, volume and mute. Every visitor controls only what they hear.
export default function MusicPlayer() {
  const m = useMusic()
  const isTouch = useStore((s) => s.isTouch)
  const [open, setOpen] = useState(!isTouch)
  const needsTap = !m.enabled || m.status === 'blocked'
  const tracks = m.kind === 'tracks' && !!m.track
  const canPlay = m.status !== 'silent' && m.status !== 'idle'

  const status = {
    loading: 'Loading…',
    silent: 'No music assigned here',
    error: m.error,
    embed: 'Live radio player',
    paused: 'Paused',
    ended: 'Playlist finished · press play to start again',
    idle: '',
  }[m.status]

  return (
    <aside className={'player' + (open ? ' open' : '') + (isTouch ? ' touch' : '')} aria-label="Music player">
      <button className="player-art" onClick={() => setOpen(!open)} aria-label={open ? 'Collapse player' : 'Expand player'}>
        {m.art ? <img src={m.art} alt="" /> : <span className="art-fallback" />}
        {m.status === 'playing' && !m.muted && <i className="live-dot" />}
      </button>
      <div className="player-meta">
        <span className="player-room">{m.queue ? `Your pick · ${m.queue.name}` : `${m.zoneName || 'Music'}${m.playlistName ? ` · ${m.playlistName}` : ''}`}</span>
        <b className="player-title">{m.track?.title || (m.status === 'silent' ? 'Silence' : '—')}</b>
        <span className="player-artist">{status || [m.track?.artist, m.track?.album].filter(Boolean).join(' · ')}</span>
      </div>
      <button className="icon-btn" id="music-play" onClick={() => musicEngine.togglePause()} disabled={!canPlay && !m.paused} aria-label={m.paused || m.status === 'ended' ? 'Play' : 'Pause'} title={m.paused ? 'Play' : 'Pause'}>
        <Icon d={m.paused || m.status === 'ended' ? ICONS.play : ICONS.pause} />
      </button>
      {open && (
        <>
          {tracks && m.status !== 'paused' && <Progress />}
          <div className="player-transport">
            <button className={'icon-btn' + (m.shuffle ? ' on' : '')} id="music-shuffle" onClick={() => musicEngine.toggleShuffle()} disabled={m.kind !== 'tracks'} aria-pressed={m.shuffle} aria-label="Shuffle" title={m.shuffle ? 'Shuffle on' : 'Shuffle off'}><Icon d={ICONS.shuffle} /></button>
            <button className="icon-btn" id="music-prev" onClick={() => musicEngine.previous()} disabled={!tracks} aria-label="Previous track" title="Previous"><Icon d={ICONS.prev} /></button>
            <button className="icon-btn" id="music-next" onClick={() => musicEngine.next()} disabled={!tracks} aria-label="Next track" title="Next"><Icon d={ICONS.next} /></button>
            <button className={'icon-btn' + (m.repeat !== 'off' ? ' on' : '')} id="music-repeat" onClick={() => musicEngine.cycleRepeat()} aria-label={`Repeat: ${m.repeat}`} title={{ all: 'Repeat playlist', one: 'Repeat this song', off: 'Repeat off' }[m.repeat]}><Icon d={m.repeat === 'one' ? ICONS.repeatOne : ICONS.repeat} /></button>
            <span className="grow" />
            <button className="icon-btn" onClick={() => musicEngine.setMuted(!m.muted)} aria-label={m.muted ? 'Unmute' : 'Mute'} title={m.muted ? 'Unmute' : 'Mute'}>
              <Icon d={m.muted ? ICONS.mute : ICONS.vol} />
            </button>
          </div>
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
          </div>
          {m.queue && <button className="btn ghost small player-back" onClick={() => musicEngine.clearQueue()}>Back to the room's music</button>}
          {m.zoneId === 'records' && !m.queue && <button className="btn small player-back" onClick={() => useStore.getState().openPanel({ type: 'records' })}>Browse albums</button>}
        </>
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

function Progress() {
  const [t, setT] = useState(null)
  const trackId = useMusic((s) => s.track?.id)
  useEffect(() => {
    const tick = () => setT(musicEngine.timing())
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [trackId])
  if (!t || !Number.isFinite(t.duration) || t.duration <= 0) return null
  return (
    <div className="player-progress">
      <span>{fmt(t.position)}</span>
      <input id="music-seek" type="range" min={0} max={t.duration} step={0.5} value={Math.min(t.position, t.duration)} onChange={(e) => { musicEngine.seek(+e.target.value); setT({ ...t, position: +e.target.value }) }} aria-label="Song position" />
      <span>{fmt(t.duration)}</span>
    </div>
  )
}
