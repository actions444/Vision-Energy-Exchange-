import Objective, { restartObjective } from './Objective.jsx'
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../state/store.js'
import { usePeers, net } from '../net/netManager.js'
import { input, setJoystick, setRunToggle } from '../input/input.js'
import { AVATAR_ACCENTS, SKIN_TONES } from '../config/theme.js'
import { ARTIST } from '../config/portfolio.js'
import { playerState, cameraState } from '../state/runtime.js'
import ContentPanel from './ContentPanel.jsx'
import AssetPanel from './AssetPanel.jsx'
import { stopAudio } from '../audio/audio.js'
import MusicPlayer from './MusicPlayer.jsx'
import MusicAdmin from './MusicAdmin.jsx'
import RentPanel from './RentPanel.jsx'
import RentalAdmin from './RentalAdmin.jsx'
import { AdminHub, WorldAdmin, ElevatorPanel, Clock } from './WorldPanels.jsx'
import { useRentals } from '../rentals/client.js'
import { musicEngine } from '../music/engine.js'
import { prewarmDemoTracks } from '../music/library.js'
import { useBackend, ownerSignIn } from '../backend/backend.js'
import MediaAdmin from './MediaAdmin.jsx'
import RecordsPanel from './RecordsPanel.jsx'
import CinemaPanel from './CinemaPanel.jsx'
import AdminAccess from './AdminAccess.jsx'
import DecorPanel from './DecorPanel.jsx'
import { useDecor, openDecorator } from '../decor/decor.js'
import { spaceAt } from '../decor/spaces.js'
import { usePreview, endTour } from '../rentals/preview.js'
import { screenForZone, unlockCinema } from '../cinema/cinema.js'
import { useMusic } from '../music/engine.js'
import { useDriving, vehicleActions } from '../vehicles/vehicles.js'

const ADMIN_PANELS = new Set(['music', 'admin', 'world', 'rentals', 'media', 'access'])

export default function UI() {
  const phase = useStore((s) => s.phase)
  const ready = useStore((s) => s.ready)
  const panel = useStore((s) => s.panel)
  const admin = useBackend((s) => s.admin)
  // owner panels never render for visitors (the backend also refuses their writes)
  const ok = !ADMIN_PANELS.has(panel?.type) || admin
  return (
    <>
      {!ready && <Loading />}
      {ready && phase === 'start' && <StartScreen />}
      {phase === 'playing' && <HUD />}
      {phase === 'playing' && <TouchControls />}
      {phase === 'playing' && <MusicPlayer />}
      {phase === 'playing' && <DecorPanel />}
      {ok && panel?.type === 'music' && <MusicAdmin />}
      {ok && panel?.type === 'admin' && <AdminHub />}
      {ok && panel?.type === 'world' && <WorldAdmin />}
      {ok && panel?.type === 'media' && <MediaAdmin />}
      {ok && panel?.type === 'access' && <AdminAccess />}
      {panel?.type === 'records' && <RecordsPanel />}
      {panel?.type === 'cinema' && <CinemaPanel screenId={panel.screenId} />}
      {panel?.type === 'elevator' && <ElevatorPanel />}
      {panel?.type === 'rent' && <RentPanel roomId={panel.roomId} />}
      {ok && panel?.type === 'rentals' && <RentalAdmin />}
      {panel?.type === 'content' && <ContentPanel id={panel.id} />}
      {panel?.type === 'assets' && <AssetPanel />}
      {panel?.type === 'settings' && <SettingsPanel />}
      {panel?.type === 'help' && <HelpPanel />}
      <Toast />
    </>
  )
}

function Loading() {
  return (
    <div className="loading">
      <div className="loading-mark">VISION STORMS<br />ENERGY EXCHANGES</div>
      <div className="loading-bar"><i /></div>
      <p>Building the city…</p>
    </div>
  )
}

// ---------- Title screen ----------
function StartScreen() {
  const profile = useStore((s) => s.profile)
  const setProfile = useStore((s) => s.setProfile)
  const enterWorld = useStore((s) => s.enterWorld)
  const [mode, setMode] = useState('single')
  const [transport, setTransport] = useState('tabs')
  const [url, setUrl] = useState(() => { try { return localStorage.getItem('vsw-server') || 'ws://localhost:8787' } catch { return 'ws://localhost:8787' } })
  const [room, setRoom] = useState('lobby')
  const [busy, setBusy] = useState(false)
  const status = usePeers((s) => s.status)
  const error = usePeers((s) => s.error)

  const enter = async (e) => {
    e.preventDefault()
    musicEngine.unlock() // inside the click, so mobile browsers allow sound
    unlockCinema()
    setTimeout(prewarmDemoTracks, 2500)
    const info = { name: profile.name.trim().slice(0, 20) || 'Guest', accent: profile.accent, skin: profile.skin }
    if (mode === 'single') {
      net.disconnect()
      enterWorld('single')
      return
    }
    setBusy(true)
    try { localStorage.setItem('vsw-server', url) } catch {}
    const ok = await net.connect(transport, { room: room.trim() || 'lobby', url, info, adminToken: useRentals.getState().adminToken || undefined })
    setBusy(false)
    if (ok) enterWorld('multi')
  }

  return (
    <div className="start">
      <header className="start-top">
        <span className="mark"><i />VISION STORMS ENERGY EXCHANGES</span>
        <span className="mono dim">{ARTIST.roles}</span>
      </header>
      <div className="start-body">
        <div className="start-title">
          <p className="eyebrow">{ARTIST.name} presents</p>
          <h1>Vision Storms<br /><span>Energy</span><br />Exchanges</h1>
          <p className="lede">{ARTIST.tagline} Now it's a city you can walk through.</p>
        </div>
        <form className="start-card" onSubmit={enter}>
          <label className="field">
            <span>Your name</span>
            <input id="player-name" value={profile.name} maxLength={20} onChange={(e) => setProfile({ name: e.target.value })} />
          </label>
          <div className="field">
            <span>Accent color</span>
            <div className="swatches">
              {AVATAR_ACCENTS.map((c) => (
                <button type="button" key={c} className={'sw' + (profile.accent === c ? ' on' : '')} style={{ '--c': c }} onClick={() => setProfile({ accent: c })} aria-label={'Accent ' + c} />
              ))}
            </div>
          </div>
          <div className="field">
            <span>Skin tone</span>
            <div className="swatches">
              {SKIN_TONES.map((c) => (
                <button type="button" key={c} className={'sw' + (profile.skin === c ? ' on' : '')} style={{ '--c': c }} onClick={() => setProfile({ skin: c })} aria-label={'Skin ' + c} />
              ))}
            </div>
          </div>
          <div className="field">
            <span>Mode</span>
            <div className="seg">
              <button type="button" className={mode === 'single' ? 'on' : ''} onClick={() => setMode('single')}>Single-player</button>
              <button type="button" className={mode === 'multi' ? 'on' : ''} onClick={() => setMode('multi')}>Multiplayer</button>
            </div>
          </div>
          {mode === 'multi' && (
            <div className="multi">
              <div className="seg small">
                <button type="button" className={transport === 'tabs' ? 'on' : ''} onClick={() => setTransport('tabs')}>Tabs on this device</button>
                <button type="button" className={transport === 'server' ? 'on' : ''} onClick={() => setTransport('server')}>Relay server</button>
              </div>
              {transport === 'tabs' ? (
                <p className="hint">Open this world in a second tab or window and pick the same room to see each other.</p>
              ) : (
                <label className="field">
                  <span>Server address</span>
                  <input id="server-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="wss://your-server.example" />
                </label>
              )}
              <label className="field">
                <span>Room</span>
                <input id="room" value={room} onChange={(e) => setRoom(e.target.value)} maxLength={32} />
              </label>
              {status === 'error' && <p className="error">{error}</p>}
            </div>
          )}
          <button className="cta" type="submit" disabled={busy}>{busy ? 'Connecting…' : 'Enter the world'}</button>
          <p className="hint center">WASD or arrows to walk · Shift to run · Space to jump · E to interact · drag to look</p>
        </form>
      </div>
    </div>
  )
}

// ---------- In-game HUD ----------
function HUD() {
  const mode = useStore((s) => s.mode)
  const prompt = useStore((s) => s.prompt)
  const isTouch = useStore((s) => s.isTouch)
  const openPanel = useStore((s) => s.openPanel)
  const panel = useStore((s) => s.panel)
  const media = useStore((s) => s.media)
  const peers = usePeers((s) => s.peers)
  const status = usePeers((s) => s.status)
  const transport = usePeers((s) => s.transport)
  const admin = useBackend((s) => s.admin)
  const zoneId = useMusic((s) => s.zoneId)
  const [menu, setMenu] = useState(false)
  const [spaceId, setSpaceId] = useState(null)
  const decorOpen = useDecor((s) => s.open)
  const tour = usePreview((s) => s.tour)
  useEffect(() => { const t = setInterval(() => setSpaceId(spaceAt(playerState.position)?.id || null), 500); return () => clearInterval(t) }, [])

  const exit = () => {
    net.disconnect()
    stopAudio()
    musicEngine.stopAll()
    useStore.getState().exitWorld()
  }
  const buttons = [
    admin && ['owner', 'Owner tools', () => openPanel({ type: 'admin' }), 'Media library, music, rentals, time & weather'],
    spaceId && !decorOpen && !tour && ['decorate', 'Decorate', () => openDecorator(spaceId), 'Furniture, lighting, flooring, walls and doors for this room'],
    zoneId === 'records' && ['albums', 'Browse albums', () => openPanel({ type: 'records' })],
    screenForZone(zoneId) && ['screen', 'Screen & sound', () => { unlockCinema(); openPanel({ type: 'cinema', screenId: screenForZone(zoneId).id }) }],
    ['rent', 'Rent a space', () => openPanel({ type: 'rent' })],
    ['assets', 'My avatar', () => openPanel({ type: 'assets' }), 'Import your own 3D avatar (stays on this device)'],
    ['settings', 'Settings', () => openPanel({ type: 'settings' })],
    ['help', 'Help', () => openPanel({ type: 'help' })],
    ['unstuck', 'Unstuck', () => { playerState.unstuck = true }, 'Stuck in something? Moves you to the nearest clear spot'],
    ['respawn', 'Respawn', () => { playerState.respawn = true; cameraState.yaw = 0 }, 'Return to the start of the avenue'],
    ['exit', 'Exit', exit],
  ].filter(Boolean)

  return (
    <>
      <div className="hud-top">
        <div className="hud-left">
          <span className="mark small"><i />VISION STORMS ENERGY EXCHANGES</span>
          <span className={'chip ' + (mode === 'multi' ? 'chip-live' : '')}>
            {mode === 'single' ? 'Single-player' : status === 'online' ? `Multiplayer · ${peers.length + 1} here` : `Multiplayer · ${status}`}
            {mode === 'multi' && <em>{transport === 'tabs' ? 'tabs' : 'server'}</em>}
          </span>
          <Clock />
        </div>
        {isTouch ? (
          <nav className="hud-right hud-menu">
            <button id="hud-menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? 'Close' : 'Menu'}</button>
            {menu && (
              <div className="hud-menu-list" onClick={() => setMenu(false)}>
                {buttons.map(([id, label, fn]) => <button key={id} id={'hud-' + id} onClick={fn}>{label}</button>)}
              </div>
            )}
          </nav>
        ) : (
          <nav className="hud-right">
            {buttons.map(([id, label, fn, title]) => <button key={id} id={'hud-' + id} onClick={fn} title={title}>{label}</button>)}
          </nav>
        )}
        {!tour && <div className="hud-objective"><Objective /></div>}
      </div>

      {media.audio && (
        <div className="now-playing">
          <span className="eq-dot" />
          <span>{media.audio.title}</span>
          <button onClick={stopAudio}>Stop</button>
        </div>
      )}

      {prompt && !panel && (
        <button className="prompt" onClick={() => { input.interact = true }}>
          <kbd>{isTouch ? 'Tap' : 'E'}</kbd>{prompt.label}
        </button>
      )}

      {mode === 'multi' && <Chat />}
      <DriveHud />
      {tour && (
        <div className="tour-bar" role="status">
          <span><b>Virtual tour</b> · {tour.name} ({tour.roomId}) · look around freely; nothing here can be changed</span>
          <button className="btn primary small" id="tour-return" onClick={endTour}>Return to listing</button>
        </div>
      )}
    </>
  )
}

function Chat() {
  const chat = usePeers((s) => s.chat)
  const [text, setText] = useState('')
  const ref = useRef()
  const send = (e) => {
    e.preventDefault()
    net.sendChat(text)
    setText('')
    ref.current?.blur()
  }
  return (
    <div className="chat">
      <ul>
        {chat.slice(-6).map((m) => (
          <li key={m.at + m.id} className={m.self ? 'self' : ''}><b>{m.name}</b> {m.text}</li>
        ))}
      </ul>
      <form onSubmit={send}>
        <input id="chat-input" ref={ref} value={text} maxLength={140} placeholder="Press T to chat" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') e.currentTarget.blur() }} />
      </form>
    </div>
  )
}

function DriveHud() {
  const driving = useStore((s) => s.driving)
  const speed = useDriving((s) => s.speed)
  const gear = useDriving((s) => s.gear)
  if (!driving) return null
  const act = (k) => { const a = vehicleActions.get(useDriving.getState().vehicleId); a?.[k]() }
  return (
    <div className="drive-hud" aria-live="off">
      <b>{Math.round(speed * 2.237)}</b><small>mph</small>
      <span className="gear">{gear}</span>
      <em>{driving}</em>
      <button className="btn small" id="veh-flip" onClick={() => act('flip')} title="Turn the vehicle upright (F)">Flip vehicle</button>
      <button className="btn ghost small" id="veh-reset" onClick={() => act('reset')} title="Move the vehicle to the nearest road (R)">Reset vehicle</button>
    </div>
  )
}

// ---------- Mobile controls ----------
function TouchControls() {
  const isTouch = useStore((s) => s.isTouch)
  const driving = useStore((s) => s.driving)
  const [run, setRun] = useState(false)
  const base = useRef()
  const knob = useRef()
  const active = useRef(null)
  if (!isTouch) return null

  const R = 56
  const update = (e) => {
    const rect = base.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    let dx = e.clientX - cx
    let dy = e.clientY - cy
    const len = Math.hypot(dx, dy)
    if (len > R) { dx = (dx / len) * R; dy = (dy / len) * R }
    knob.current.style.transform = `translate(${dx}px, ${dy}px)`
    setJoystick(dx / R, -dy / R, true)
  }
  const down = (e) => {
    e.stopPropagation()
    active.current = e.pointerId
    try { base.current.setPointerCapture(e.pointerId) } catch {}
    update(e)
  }
  const move = (e) => { if (active.current === e.pointerId) update(e) }
  const up = (e) => {
    if (active.current !== e.pointerId) return
    active.current = null
    knob.current.style.transform = 'translate(0,0)'
    setJoystick(0, 0, false)
  }
  const hold = (prop) => ({
    onPointerDown: (e) => { e.stopPropagation(); input[prop] = true },
    onPointerUp: () => { input[prop] = false },
    onPointerCancel: () => { input[prop] = false },
    onPointerLeave: () => { input[prop] = false },
  })

  return (
    <div className="touch">
      <div className="stick" ref={base} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <div className="knob" ref={knob} />
      </div>
      {driving ? (
        <div className="touch-buttons">
          <button className="tb" {...hold('brake')}>Brake</button>
          <button className="tb" onPointerDown={(e) => { e.stopPropagation(); vehicleActions.get(useDriving.getState().vehicleId)?.flip() }}>Flip</button>
          <button className="tb" onPointerDown={(e) => { e.stopPropagation(); vehicleActions.get(useDriving.getState().vehicleId)?.reset() }}>Reset</button>
        </div>
      ) : (
      <div className="touch-buttons">
        <button className="tb" {...hold('jump')}>Jump</button>
        <button className={'tb' + (run ? ' on' : '')} onPointerDown={(e) => { e.stopPropagation(); setRun(!run); setRunToggle(!run) }}>Run</button>
        <button className="tb" onPointerDown={(e) => { e.stopPropagation(); input.emote = 'wave' }}>Wave</button>
      </div>
      )}
    </div>
  )
}

// ---------- Panels ----------
export function Panel({ title, eyebrow, children, wide }) {
  const close = useStore((s) => s.closePanel)
  useEffect(() => {
    input.move.x = input.move.y = 0
  }, [])
  return (
    <div className="panel-wrap" onPointerDown={(e) => { if (e.target === e.currentTarget) close() }}>
      <section className={'panel' + (wide ? ' wide' : '')} role="dialog" aria-label={title}>
        <header>
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2>{title}</h2>
          </div>
          <button className="close" onClick={close} aria-label="Close">Close</button>
        </header>
        <div className="panel-body">{children}</div>
      </section>
    </div>
  )
}

function SettingsPanel() {
  const settings = useStore((s) => s.settings)
  const setSetting = useStore((s) => s.setSetting)
  const profile = useStore((s) => s.profile)
  const setProfile = useStore((s) => s.setProfile)
  const outdoor = useMusic((s) => s.outdoor)
  const Toggle = ({ k, label, desc }) => (
    <label className="row toggle">
      <span><b>{label}</b><small>{desc}</small></span>
      <input id={'set-' + k} type="checkbox" checked={settings[k]} onChange={(e) => setSetting(k, e.target.checked)} />
    </label>
  )
  return (
    <Panel title="Settings" eyebrow="World">
      <div className="row">
        <span><b>Graphics quality</b><small>High adds shadows and sharper rendering. Low runs better on phones.</small></span>
        <div className="seg small">
          <button className={settings.quality === 'high' ? 'on' : ''} onClick={() => setSetting('quality', 'high')}>High</button>
          <button className={settings.quality === 'low' ? 'on' : ''} onClick={() => setSetting('quality', 'low')}>Low</button>
        </div>
      </div>
      <Toggle k="bloom" label="Light glow" desc="Soft bloom around lamps, signs and screens." />
      <Toggle k="rain" label="Rain effects" desc="Show falling rain when the weather is rainy." />
      <div className="row">
        <span><b>Accent color</b><small>Your avatar's accent lights.</small></span>
        <div className="swatches">
          {AVATAR_ACCENTS.map((c) => (
            <button key={c} className={'sw' + (profile.accent === c ? ' on' : '')} style={{ '--c': c }} onClick={() => setProfile({ accent: c })} aria-label={'Accent ' + c} />
          ))}
        </div>
      </div>
      <div className="row">
        <span><b>Skin tone</b></span>
        <div className="swatches">
          {SKIN_TONES.map((c) => (
            <button key={c} className={'sw' + (profile.skin === c ? ' on' : '')} style={{ '--c': c }} onClick={() => setProfile({ skin: c })} aria-label={'Skin ' + c} />
          ))}
        </div>
      </div>
      <label className="row toggle">
        <span><b>Outdoor music</b><small>Ambient music on the streets. Rooms keep their own music either way.</small></span>
        <input id="set-outdoor" type="checkbox" checked={outdoor} onChange={(e) => musicEngine.setOutdoor(e.target.checked)} />
      </label>
      <OwnerAccess />
      <p className="hint">To play as one of your own 3D characters, import it in Assets and choose “Use as avatar”.</p>
    </Panel>
  )
}

/** Who can change shared content, and owner sign-in for a self-hosted server. */
function OwnerAccess() {
  const b = useBackend()
  const [url, setUrl] = useState(() => b.serverUrl || (location.protocol.startsWith('http') ? location.origin : ''))
  const [token, setToken] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  if (b.kind === 'hosted') {
    return <p className="hint">{b.admin ? 'You are signed in as an editor of this page, so the Owner tools (media uploads, music, rentals, time & weather) are on.' : 'Owner tools are only shown to the owner and editors of this page.'}</p>
  }
  if (b.kind === 'local') return <p className="hint">Development mode: the Owner tools are on and uploads are saved in this browser only.</p>
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    try { await ownerSignIn(url.trim(), token.trim()); setToken(''); location.reload() } catch (x) { setErr(x.message || 'Could not reach that server.') }
    setBusy(false)
  }
  if (b.admin) return <p className="hint">Signed in as the owner on {b.serverUrl}. <button className="btn ghost small" onClick={() => { try { localStorage.removeItem('vsw-owner-token') } catch {}; location.reload() }}>Sign out</button></p>
  return (
    <form className="fields owner-signin" onSubmit={submit}>
      <b>Owner sign-in</b>
      <small className="hint">For a self-hosted Vision Storms Energy Exchanges server. Visitors don't need this.</small>
      <label className="field"><span>Server address</span><input id="owner-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-server.example" /></label>
      <label className="field"><span>Owner token</span><input id="owner-token" type="password" autoComplete="current-password" value={token} onChange={(e) => setToken(e.target.value)} /></label>
      {err && <p className="error">{err}</p>}
      <button className="btn" type="submit" disabled={busy || !url || !token}>{busy ? 'Checking…' : 'Sign in'}</button>
    </form>
  )
}

function HelpPanel() {
  return (
    <Panel title="How to explore" eyebrow="Controls">
      <div className="keys">
        <div><kbd>W A S D</kbd><span>Walk (arrow keys work too)</span></div>
        <div><kbd>Shift</kbd><span>Run</span></div>
        <div><kbd>Space</kbd><span>Jump</span></div>
        <div><kbd>E</kbd><span>Open doors, sit, stand, call the elevator, use kiosks</span></div>
        <div><kbd>1</kbd><span>Wave</span></div>
        <div><kbd>Drag</kbd><span>Look around · mouse wheel zooms</span></div>
        <div><kbd>B</kbd><span>Asset library</span></div>
        <div><kbd>T</kbd><span>Chat (multiplayer)</span></div>
        <div><kbd>Esc</kbd><span>Close a panel</span></div>
      </div>
      <p className="hint">On a phone: left thumb on the joystick (push to the edge to run), drag anywhere else to look, tap the prompt to interact.</p>
      <p className="hint">Driving: walk up to the driver's door of the black SUV on the lot behind the Plaza and press E (or tap). W/S or the joystick to drive and reverse, A/D to steer, Space (Brake on phones) to brake, E to get out.</p>
      <p className="hint"><button className="btn ghost small" id="objective-restart" onClick={restartObjective}>Start the cinema guide again</button></p>
      <p className="hint">The Vision Cinema is on the left of the avenue: walk into an auditorium, take a recliner, and open Screen &amp; sound.</p>
      <p className="hint">The Reign Gallery is at the end of the avenue, straight ahead from where you start. Vision Storms Energy Exchanges Plaza is behind you on the left, past the crossroads: take the stairs or the elevator to its three floors.</p>
    </Panel>
  )
}

function Toast() {
  const toast = useStore((s) => s.toast)
  if (!toast) return null
  return <div className="toast" key={toast.id}>{toast.text}</div>
}
