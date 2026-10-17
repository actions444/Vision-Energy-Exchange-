import { useEffect, useState } from 'react'
import { Panel } from './UI.jsx'
import { useBackend } from '../backend/backend.js'
import { useMedia, fileUrl } from '../media/media.js'
import { useMusic } from '../music/engine.js'
import { useStore } from '../state/store.js'
import { useJobs } from '../state/jobs.js'
import {
  SCREENS, useCinema, sessionFor, positionOf, watchable, shared, privateView, unlockCinema,
  setMovieVolume, setMovieMuted, cinemaTiming, screenForZone, now,
} from '../cinema/cinema.js'

const fmt = (s) => {
  if (!Number.isFinite(s)) return '–:––'
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60)
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0')
}

// Screen & sound controls for a theater (or the cinema's showtimes when screenId is null).
export default function CinemaPanel({ screenId }) {
  const zone = useMusic((s) => s.zoneId)
  const id = screenId || screenForZone(zone)?.id || null
  return id ? <ScreenControls screenId={id} /> : <Showtimes />
}

function Showtimes() {
  const st = useCinema()
  const movies = watchable(useMedia((s) => s.items))
  return (
    <Panel title="Showtimes" eyebrow="Vision Cinema">
      <div className="admin-list">
        {Object.values(SCREENS).map((s) => {
          const sess = sessionFor(s.id, st)
          const shown = sess?.shared ? sess : null
          return (
            <div className="admin-row" key={s.id}>
              <div className="grow"><b>{s.name}</b><small>{s.venue}{s.price ? ` · premium · ${s.price} cr a ticket` : ''}</small></div>
              <span className={'badge' + (shown ? ' live' : '')}>{shown ? (shown.state === 'paused' ? 'Paused · ' : positionOf(shown) <= 0 ? 'Starting · ' : 'Now showing · ') + shown.title : 'No screening'}</span>
            </div>
          )
        })}
        <p className="hint">{movies.length ? `${movies.length} movie${movies.length === 1 ? '' : 's'} in the library. Walk into an auditorium and use its screen controls to watch.` : 'No movies have been published yet.'}</p>
      </div>
    </Panel>
  )
}

function ScreenControls({ screenId }) {
  const screen = SCREENS[screenId]
  const admin = useBackend((s) => s.admin)
  const st = useCinema()
  const items = useMedia((s) => s.items)
  const movies = watchable(items)
  const sess = sessionFor(screenId, st)
  const here = st.active === screenId
  const [pick, setPick] = useState('')
  const [err, setErr] = useState(null)
  const [t, setT] = useState(null)
  useEffect(() => { const i = setInterval(() => setT(cinemaTiming()), 500); setT(cinemaTiming()); return () => clearInterval(i) }, [])
  useEffect(() => { if (!pick && movies[0]) setPick(movies[0].id) }, [movies.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = movies.find((m) => m.id === pick)
  const run = async (fn) => { setErr(null); try { unlockCinema(); await fn() } catch (e) { setErr(e.message || String(e)) } }
  const ctl = sess?.shared ? shared : privateView
  const canControl = sess ? !sess.scheduled && (!sess.shared || admin) : false
  const pos = sess ? positionOf(sess) : 0
  const dur = t?.duration || sess?.duration || null

  return (
    <Panel title={screen.name} eyebrow={`${screen.venue} · screen & sound`}>
      <div className="fields">
        {!here && <p className="hint">Walk into {screen.name} to watch. You can still set up a screening from here.</p>}
        {screen.price && !sess && <p className="hint">{screen.name} is a premium room: starting your own private showing here costs {screen.price} cr a ticket. A screening the owner starts for everyone is always free to watch.</p>}
        {sess ? (
          <div className="now-showing">
            <Poster id={sess.movieId} />
            <div className="grow">
              <small className="eyebrow">{sess.scheduled ? 'Scheduled · TV guide' : sess.shared ? 'Screening for everyone' : 'Private viewing · only you'}</small>
              <b>{sess.title}</b>
              <small>{pos <= 0 && sess.state === 'playing' ? `Starts in ${Math.max(1, Math.ceil((sess.startedAt - now()) / 1000))} s` : `${fmt(pos)} / ${fmt(dur)}`}{' · '}{{ playing: 'playing', paused: 'paused' }[sess.state]}{here && st.status === 'loading' ? ' · buffering' : ''}{here && st.status === 'ended' ? ' · finished' : ''}</small>
            </div>
          </div>
        ) : (
          <p className="hint">{movies.length ? 'Nothing is playing on this screen.' : 'No movies have been published yet. The owner adds them in Owner tools → Media library.'}</p>
        )}
        {here && st.status === 'blocked' && <button className="btn primary" onClick={() => unlockCinema()}>Tap to start the movie with sound</button>}
        {here && st.status === 'error' && <p className="error">{st.error}</p>}

        {sess && canControl && (
          <>
            {dur && <input id="cinema-seek" type="range" min={0} max={dur} step={1} value={Math.min(Math.max(0, pos), dur)} onChange={(e) => run(() => ctl.seek(screenId, +e.target.value))} aria-label="Movie position" />}
            <div className="row-actions">
              {sess.state === 'playing'
                ? <button className="btn" id="cinema-pause" onClick={() => run(() => ctl.pause(screenId))}>Pause</button>
                : <button className="btn primary" id="cinema-resume" onClick={() => run(() => ctl.resume(screenId))}>Resume</button>}
              <button className="btn ghost" onClick={() => run(() => ctl.seek(screenId, Math.max(0, pos - 10)))}>−10 s</button>
              <button className="btn ghost" onClick={() => run(() => ctl.seek(screenId, pos + 30))}>+30 s</button>
              <button className="btn ghost" id="cinema-stop" onClick={() => run(() => ctl.stop(screenId))}>{sess.shared ? 'End screening' : 'Stop'}</button>
            </div>
          </>
        )}
        {sess?.scheduled && <p className="hint">This showing is on the TV guide, so it starts and ends on schedule for everyone. {admin ? 'Change it in the TV guide.' : ''}</p>}
        {sess?.shared && !sess.scheduled && !admin && <p className="hint">The owner runs this screening. Everyone in the theater sees the same moment of the movie.</p>}

        {movies.length > 0 && (!sess || (admin && !sess.shared)) && (
          <div className="field">
            <span>Movie</span>
            <select id="cinema-movie" value={pick} onChange={(e) => setPick(e.target.value)}>
              {movies.map((m) => <option key={m.id} value={m.id}>{m.title}{m.kind === 'video' ? ' (music video)' : ''}{m.duration ? ` · ${fmt(m.duration)}` : ''}</option>)}
            </select>
          </div>
        )}
        {movies.length > 0 && !sess && (
          <div className="row-actions">
            <button className="btn primary" id="cinema-watch" disabled={!chosen} onClick={() => run(() => {
              if (screen.price && !useJobs.getState().spend(screen.price, 'ticket', `Ticket: ${screen.name}`)) return
              return privateView.start(screenId, chosen)
            })}>Watch privately{screen.price ? ` · ${screen.price} cr` : ''}</button>
            {admin && <button className="btn" id="cinema-share" disabled={!chosen} onClick={() => run(() => shared.start(screenId, chosen))}>Start screening for everyone</button>}
          </div>
        )}
        {admin && sess && !sess.shared && movies.length > 0 && (
          <button className="btn" onClick={() => run(async () => { privateView.stop(screenId); await shared.start(screenId, chosen || movies[0]) })}>Show {(chosen || movies[0]).title} to everyone instead</button>
        )}
        {err && <p className="error">{err}</p>}

        <div className="row">
          <span><b>Movie sound</b><small>Only changes what you hear.</small></span>
          <div className="row-actions">
            <button className="btn ghost small" onClick={() => setMovieMuted(!st.muted)}>{st.muted ? 'Unmute' : 'Mute'}</button>
            <input id="cinema-volume" type="range" min={0} max={1} step={0.01} value={st.muted ? 0 : st.volume} onChange={(e) => setMovieVolume(+e.target.value)} aria-label="Movie volume" />
          </div>
        </div>
        <p className="hint">Take a seat in a recliner (walk up to one and press {useStore.getState().isTouch ? 'the Sit button' : 'E'}); you stay seated until you choose Stand up.</p>
      </div>
    </Panel>
  )
}

function Poster({ id }) {
  const item = useMedia((s) => s.items.find((m) => m.id === id))
  const [url, setUrl] = useState(null)
  useEffect(() => { let live = true; item?.cover ? fileUrl(item.cover).then((u) => live && setUrl(u)) : setUrl(null); return () => { live = false } }, [item?.cover])
  return url ? <img className="thumb" src={url} alt="" width={64} height={64} /> : <span className="thumb fallback kind-movie" style={{ width: 64, height: 64 }} />
}
