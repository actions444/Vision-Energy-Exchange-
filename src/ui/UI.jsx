import { SPAWNS, BLOCKS, PARK, PARADE } from '../config/westend.js'
import { TOWER as RESIDENCE_TOWER } from '../config/residenceTower.js'
import { HOUSE as MANSION1_HOUSE, LOT as MANSION1_LOT } from '../config/mansion1.js'
import { MALL as MALL_B } from '../config/mall.js'
import { LOT as APTS1_LOT, WALK as APTS1_WALK } from '../config/apts1.js'
import { LOT as CLUB_LOT, CX as CLUB_CX } from '../config/bikerMeetup.js'
import Objective, { restartObjective } from './Objective.jsx'
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../state/store.js'
import { usePeers, net } from '../net/netManager.js'
import { input, setJoystick, setRunToggle } from '../input/input.js'
import { AVATAR_ACCENTS, SKIN_TONES } from '../config/theme.js'
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
import { useDevAdmin } from '../state/devAdmin.js'
import MediaAdmin from './MediaAdmin.jsx'
import RecordsPanel from './RecordsPanel.jsx'
import CinemaPanel from './CinemaPanel.jsx'
import AdminAccess from './AdminAccess.jsx'
import NpcShiftsAdmin from './NpcShiftsAdmin.jsx'
import DecorPanel from './DecorPanel.jsx'
import LightsPanel from './LightsPanel.jsx'
import DeparturesPanel from './DeparturesPanel.jsx'
import PerformancePanel from './PerformancePanel.jsx'
import GuidePanel from './GuidePanel.jsx'
import { ttsSupported } from '../audio/tts.js'
import { useLocale, LOCALES } from '../state/locale.js'
import JusticePanel from './JusticePanel.jsx'
import CarPanel from './CarPanel.jsx'
import TaxiPanel from './TaxiPanel.jsx'
import { PowerChip } from './PowerChip.jsx'
import JobsPanel from './JobsPanel.jsx'
import AtmPanel from './AtmPanel.jsx'
import { SlotsPanel, RoulettePanel, BlackjackPanel } from './CasinoPanel.jsx'
import LibraryPanel from './LibraryPanel.jsx'
import ExhibitPanel from './ExhibitPanel.jsx'
import WorkoutHud from './WorkoutHud.jsx'
import UnderwaterTint from './UnderwaterTint.jsx'
import BreathBar from './BreathBar.jsx'
import { JobsChip, ShiftHud } from './JobHud.jsx'
import { useDecor, openDecorator } from '../decor/decor.js'
import { spaceAt } from '../decor/spaces.js'
import { useSocial } from '../state/social.js'
import LivePanel from './LivePanel.jsx'
import { usePreview, endTour } from '../rentals/preview.js'
import { screenForZone, unlockCinema } from '../cinema/cinema.js'
import { useMusic } from '../music/engine.js'
import { useDriving, vehicleActions } from '../vehicles/vehicles.js'
import { putDownCarried, throwAwayCarried } from '../assets/PlacedAssets.jsx'
import { OUTFITS } from '../config/outfits.js'
import CineOverlay from './CineOverlay.jsx'
import { useCine } from '../state/cine.js'
import ActionsPanel from './ActionsPanel.jsx'
import MallPanel from './MallPanel.jsx'

const ADMIN_PANELS = new Set(['music', 'admin', 'world', 'rentals', 'media', 'access', 'npcs'])

export default function UI() {
  const phase = useStore((s) => s.phase)
  const ready = useStore((s) => s.ready)
  const panel = useStore((s) => s.panel)
  const backendAdmin = useBackend((s) => s.admin)
  const devAdmin = useDevAdmin((s) => s.on)
  const admin = backendAdmin || devAdmin
  // owner panels never render for visitors (the backend also refuses their writes)
  const ok = !ADMIN_PANELS.has(panel?.type) || admin
  const film = useCine((s) => s.active)
  return (
    <>
      <CineOverlay />
      <UnderwaterTint />
      <BreathBar />
      {!ready && <Loading />}
      {ready && phase === 'start' && <StartScreen />}
      {phase === 'playing' && !film && <HUD />}
      {phase === 'playing' && !film && <TouchControls />}
      {phase === 'playing' && !film && <MusicPlayer />}
      {phase === 'playing' && <DecorPanel />}
      {ok && panel?.type === 'music' && <MusicAdmin />}
      {ok && panel?.type === 'admin' && <AdminHub />}
      {ok && panel?.type === 'world' && <WorldAdmin />}
      {ok && panel?.type === 'media' && <MediaAdmin />}
      {ok && panel?.type === 'access' && <AdminAccess />}
      {ok && panel?.type === 'npcs' && <NpcShiftsAdmin />}
      {panel?.type === 'records' && <RecordsPanel />}
      {panel?.type === 'cinema' && <CinemaPanel screenId={panel.screenId} />}
      {panel?.type === 'elevator' && <ElevatorPanel />}
      {panel?.type === 'rent' && <RentPanel roomId={panel.roomId} />}
      {ok && panel?.type === 'rentals' && <RentalAdmin />}
      {panel?.type === 'content' && <ContentPanel id={panel.id} />}
      {panel?.type === 'assets' && <AssetPanel />}
      {panel?.type === 'lights' && <LightsPanel />}
      {panel?.type === 'guide' && <GuidePanel />}
      {panel?.type === 'justice' && <JusticePanel />}
      {panel?.type === 'jobs' && <JobsPanel tab={panel.tab} />}
      {panel?.type === 'atm' && <AtmPanel />}
      {panel?.type === 'slots' && <SlotsPanel />}
      {panel?.type === 'roulette' && <RoulettePanel />}
      {panel?.type === 'blackjack' && <BlackjackPanel />}
      {panel?.type === 'live' && <LivePanel spaceId={panel.spaceId} spaceName={panel.spaceName} />}
      {panel?.type === 'library' && <LibraryPanel />}
      {panel?.type === 'exhibit' && <ExhibitPanel />}
      {panel?.type === 'departures' && <DeparturesPanel />}
      {panel?.type === 'performance' && <PerformancePanel />}
      {panel?.type === 'actions' && <ActionsPanel />}
      {panel?.type === 'mall' && <MallPanel storeId={panel.storeId} />}
      <WorkoutHud />
      {panel?.type === 'car' && <CarPanel id={panel.id} />}
      {panel?.type === 'taxi' && <TaxiPanel standId={panel.standId} />}
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
/** Builds a joinable invite link for the current multiplayer setup (mirrors what StartScreen
 *  reads back out below) and offers real ways to send it: copy, the device's native share sheet
 *  (texting, Messages, WhatsApp, email, whatever the person picks), a direct SMS compose link, or
 *  (where the browser supports it) picking a number straight out of the phone's own contacts via
 *  the Contact Picker API. Nothing here can send a text by itself or read someone's contacts on
 *  its own — a browser game has no access to either without the person's own phone taking the
 *  next step, so this hands off to their phone's real apps instead of faking either one. */
function InvitePanel({ transport, url, room }) {
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState('')
  const [copied, setCopied] = useState(false)
  const [picking, setPicking] = useState(false)
  const canPick = typeof navigator !== 'undefined' && navigator.contacts && typeof navigator.contacts.select === 'function'
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const inviteUrl = () => {
    const u = new URL(window.location.href)
    u.search = ''
    u.searchParams.set('invite', '1')
    u.searchParams.set('transport', transport)
    u.searchParams.set('room', room || 'lobby')
    if (transport === 'server' && url) u.searchParams.set('url', url)
    return u.toString()
  }
  const message = () => `Come play Vision Storms Energy Exchanges with me — tap this to join my room ("${room || 'lobby'}"): ${inviteUrl()}`

  const copy = async () => {
    try { await navigator.clipboard.writeText(inviteUrl()); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }
  const share = async () => {
    try { await navigator.share({ title: 'Vision Storms Energy Exchanges', text: message(), url: inviteUrl() }) } catch {}
  }
  const textPhone = (number) => {
    const n = (number || '').replace(/[^\d+]/g, '')
    if (!n) return
    // sms: with a body works on iOS/Android; the ?/& separator differs slightly by platform, but
    // browsers tolerate either, so this opens the person's own Messages app with the text ready to send.
    window.location.href = `sms:${n}?&body=${encodeURIComponent(message())}`
  }
  const pickContact = async () => {
    if (!canPick) return
    setPicking(true)
    try {
      const [c] = await navigator.contacts.select(['tel', 'name'], { multiple: false })
      const num = c?.tel?.[0]
      if (num) textPhone(num)
    } catch { /* user cancelled or the browser refused - nothing to show for it */ }
    setPicking(false)
  }

  if (!open) return <button type="button" className="btn ghost small" onClick={() => setOpen(true)}>Invite someone</button>
  return (
    <div className="field invite-box">
      <span>Invite someone to this room</span>
      {canPick && <button type="button" className="btn small primary" disabled={picking} onClick={pickContact}>{picking ? 'Choosing…' : 'Choose from your phone contacts'}</button>}
      <div className="row-actions">
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" style={{ flex: 1 }} aria-label="Phone number" />
        <button type="button" className="btn small" disabled={!phone.trim()} onClick={() => textPhone(phone)}>Text invite</button>
      </div>
      <div className="row-actions">
        {canShare && <button type="button" className="btn small" onClick={share}>Share…</button>}
        <button type="button" className="btn small" onClick={copy}>{copied ? 'Link copied!' : 'Copy invite link'}</button>
      </div>
      <p className="hint">
        {canPick ? '' : "This browser won't let a web page read your contacts directly, so type the number or use Share to pick one from your phone's own apps. "}
        Texting opens your phone's own Messages app with the invite ready — nothing is sent automatically. Whoever taps the link lands here with this room and server already filled in.
      </p>
    </div>
  )
}

function StartScreen() {
  const profile = useStore((s) => s.profile)
  const setProfile = useStore((s) => s.setProfile)
  const enterWorld = useStore((s) => s.enterWorld)
  // An invite link (built by InvitePanel below) lands here as ?invite=1&transport=&room=&url= -
  // read it once on load so tapping someone's text drops you straight into their room, with the
  // multiplayer form already filled in and ready for "Enter World".
  const invite = useRef(null)
  if (invite.current === null) {
    try {
      const p = new URLSearchParams(window.location.search)
      invite.current = p.get('invite') === '1' ? { transport: p.get('transport') || 'tabs', room: p.get('room') || 'lobby', url: p.get('url') || '' } : false
    } catch { invite.current = false }
  }
  const [mode, setMode] = useState(invite.current ? 'multi' : 'single')
  const [transport, setTransport] = useState(invite.current ? invite.current.transport : 'tabs')
  const [url, setUrl] = useState(() => {
    if (invite.current && invite.current.url) return invite.current.url
    try { return localStorage.getItem('vsw-server') || 'ws://localhost:8787' } catch { return 'ws://localhost:8787' }
  })
  const [room, setRoom] = useState(invite.current ? invite.current.room : 'lobby')
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

  const enterCreatorStudio = () => {
    musicEngine.unlock()
    unlockCinema()
    setTimeout(prewarmDemoTracks, 2500)
    net.disconnect()
    if (!useDevAdmin.getState().on) useDevAdmin.getState().toggle()
    enterWorld('single')
    useStore.getState().openPanel({ type: 'admin' })
  }

  return (
    <div className="start">
      <div className="start-wordmark" aria-label="Vision Storms Energy Exchanges">
        <span className="vs-line1">VISION STORMS</span>
        <span className="vs-line2">ENERGY EXCHANGES</span>
      </div>
      <div className="start-body compact">
        <form className="start-card compact" onSubmit={enter}>
          <div className="guest-row">
            <span className="avatar-preview" style={{ '--c': profile.accent, '--s': profile.skin }} aria-hidden />
            <label className="field grow">
              <span>Guest name</span>
              <input id="player-name" value={profile.name} maxLength={20} onChange={(e) => setProfile({ name: e.target.value })} />
            </label>
          </div>
          <div className="field">
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
              {invite.current && <p className="hint">You're joining from an invite link - the room{invite.current.url ? ' and server' : ''} above is already set up for you.</p>}
              <InvitePanel transport={transport} url={url} room={room} />
              {status === 'error' && <p className="error">{error}</p>}
            </div>
          )}
          <button className="cta" type="submit" disabled={busy}>{busy ? 'Connecting…' : 'Enter World'}</button>
          <button type="button" className="cta ghost" onClick={enterCreatorStudio}>Creator Studio</button>
          <p className="hint center">Full appearance editor (hair, outfit, skin) is in Settings once you're in · WASD to walk · Shift to run · E to interact</p>
        </form>
      </div>
    </div>
  )
}


/** Small district map for the Places panel: the original map on the right, the West End on the left, you as a dot. */
function PlacesMap() {
  const [pos, setPos] = useState([playerState.position.x, playerState.position.z])
  useEffect(() => { const t = setInterval(() => setPos([playerState.position.x, playerState.position.z]), 400); return () => clearInterval(t) }, [])
  const L = (x, z, t, size = 7, anchor = 'middle', fill = '#e9e6f2') => <text x={x} y={z} fontSize={size} textAnchor={anchor} fill={fill} fontWeight="700">{t}</text>
  const names = { ne: 'MEADOWBROOK', se: 'MAPLE COURT (P4)', nm: 'FOOTBALL', sm: 'REC COURTS', nw: 'CEDAR WORKS', sw: 'LANDFILL + RECYCLING' }
  const built = { ne: true, nm: true, sm: true, nw: true, sw: true }
  return (
    <svg viewBox="-405 -135 540 270" className="places-map" role="img" aria-label="District map">
      <rect x="-400" y="-130" width="530" height="260" fill="#26262e" />
      <rect x="-130" y="-130" width="260" height="260" fill="#2e2e38" />
      <rect x="-120" y="-120" width="240" height="134" fill="#4b4b57" /><rect x="-120" y="26" width="240" height="94" fill="#4b4b57" />
      {Object.entries(BLOCKS).map(([id, [x0, x1, z0, z1]]) => <rect key={id} x={x0} y={z0} width={x1 - x0} height={z1 - z0} fill={built[id] ? '#496b57' : '#5b5560'} stroke={built[id] ? '#7bd1a0' : '#8a8494'} strokeWidth="1" strokeDasharray={built[id] ? '' : '4 3'} />)}
      <rect x={PARK.x0} y={PARK.z0} width={PARK.x1 - PARK.x0} height={PARK.z1 - PARK.z0} fill="#3f8a55" opacity=".9" />
      {Object.entries(BLOCKS).map(([id, [x0, x1, z0, z1]]) => <g key={id}>{L((x0 + x1) / 2, (z0 + z1) / 2 + (id === 'ne' ? -62 : 0), names[id], 9)}</g>)}
      {[[PARADE.laundromat, '#ff3fae'], [PARADE.cleaners, '#25e6d3']].map(([r, c], i) => <rect key={i} x={r.x0} y={r.z0} width={r.x1 - r.x0} height={r.z1 - r.z0} fill={c} opacity=".85" />)}
      {L((PARADE.laundromat.x0 + PARADE.cleaners.x1) / 2, 52, 'HARBOR PARADE', 6, 'middle', '#ffb3dc')}
      {L((PARK.x0 + PARK.x1) / 2, (PARK.z0 + PARK.z1) / 2, 'PARK', 9)}
      {L(-265, 24, 'HARBOR BLVD', 8, 'middle', '#ffd66b')}
      {L(-208, -122, 'MAPLE AVE', 6, 'middle', '#ffd66b')}
      {L(-312, -122, 'CEDAR AVE', 6, 'middle', '#ffd66b')}
      {L(0, 24, 'DOWNTOWN', 14, 'middle', '#ffffff')}
      <circle cx={pos[0]} cy={pos[1]} r="5" fill="#ff4fa3" stroke="#fff" strokeWidth="1.5" />
    </svg>
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
  const backendAdmin2 = useBackend((s) => s.admin)
  const devAdmin2 = useDevAdmin((s) => s.on)
  const admin = backendAdmin2 || devAdmin2
  const zoneId = useMusic((s) => s.zoneId)
  const [menu, setMenu] = useState(false)
  const [places, setPlaces] = useState(false)
  const [spaceId, setSpaceId] = useState(null)
  const [spaceName, setSpaceName] = useState(null)
  const decorOpen = useDecor((s) => s.open)
  const tour = usePreview((s) => s.tour)
  const liveSpaceId = useSocial((s) => s.liveSpaceId)
  useEffect(() => { const t = setInterval(() => { const sp = spaceAt(playerState.position); setSpaceId(sp?.id || null); setSpaceName(sp?.name || null) }, 500); return () => clearInterval(t) }, [])

  const exit = () => {
    net.disconnect()
    stopAudio()
    musicEngine.stopAll()
    useStore.getState().exitWorld()
  }
  const buttons = [
    admin && ['owner', 'Owner tools', () => openPanel({ type: 'admin' }), 'Media library, music, rentals, time & weather'],
    spaceId && !decorOpen && !tour && ['decorate', 'Decorate', () => openDecorator(spaceId), 'Furniture, lighting, flooring, walls and doors for this room'],
    (spaceId || liveSpaceId) && !tour && ['live', liveSpaceId ? 'Vision Live · on air' : 'Go Live', () => openPanel({ type: 'live', spaceId, spaceName }), 'Stream from a space you own or rent; grow followers and unlock sponsorships'],
    zoneId === 'records' && ['albums', 'Browse albums', () => openPanel({ type: 'records' })],
    screenForZone(zoneId) && ['screen', 'Screen & sound', () => { unlockCinema(); openPanel({ type: 'cinema', screenId: screenForZone(zoneId).id }) }],
    ['rent', 'Rent a space', () => openPanel({ type: 'rent' })],
    ['assets', 'My avatar', () => openPanel({ type: 'assets' }), 'Import your own 3D avatar (stays on this device)'],
    ['lights', 'Lights', () => openPanel({ type: 'lights' }), 'Switch rooms off and see what the lights are costing'],
    ['guide', 'TV guide', () => openPanel({ type: 'guide' }), 'What every screen shows, and when; the owner schedules music videos and movies'],
    ['performance', 'Perform', () => openPanel({ type: 'performance' }), 'Sing, dance and work the crowd on the Grand Concert Stage'],
    ['actions', 'Actions', () => openPanel({ type: 'actions' }), 'Wave, clap, bow, point, dance or exercise - anywhere, anytime'],
    ['places', 'Places', () => setPlaces((v) => !v), 'Travel to a district: downtown, Meadowbrook Park, the West End'],
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
          <PowerChip />
          <JobsChip />
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
      {places && (
        <div className="places-list" role="menu" aria-label="Places">
          <b>Places</b>
          <PlacesMap />
          {[
            ['downtown', 'Downtown avenue (start)', [0, 0.3, 10]],
            ['residences', 'Reign Residences', [(RESIDENCE_TOWER.x0 + RESIDENCE_TOWER.x1) / 2, 0.3, RESIDENCE_TOWER.z1 + 3]],
            ['mansion1', '4821 Skyline Ridge (mansion)', [(MANSION1_HOUSE.x0 + MANSION1_HOUSE.x1) / 2 + 6, 0.3, MANSION1_LOT.z0]],
            ['mall', 'Vision Storms Exchanges (mall)', [(MALL_B.x0 + MALL_B.x1) / 2, 0.3, MALL_B.z0]],
            ['apts1', 'Maple Garden Apartments', [(APTS1_WALK.x0 + APTS1_WALK.x1) / 2, 0.3, APTS1_LOT.z0]],
            ['club1', 'Iron Horse M.C. (biker meetup)', [CLUB_CX, 0.3, CLUB_LOT.z1 - 2]],
            ...SPAWNS.map(([id, name, pos]) => [id, name, pos]),
          ].map(([id, name, pos]) => (
            <button key={id} id={'place-' + id} role="menuitem" onClick={() => { playerState.teleport = pos; setPlaces(false); setMenu(false) }}>{name}</button>
          ))}
          <small>Phases 1 to 3 of the West End are built (apartments and park, football and recreation grounds, landfill, recycling and industrial row). Harbor Parade (Velvet Suds Laundromat and The Ironing Station) is built on the boulevard frontage of the south-east block. Phase 4, Maple Court, is not built yet and sits behind it.</small>
        </div>
      )}

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
      <ShiftHud />
      <DriveHud />
      <CarryHud />
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
  const alt = useDriving((s) => s.alt)
  if (!driving) return null
  const act = (k) => { const a = vehicleActions.get(useDriving.getState().vehicleId); a?.[k]() }
  return (
    <div className="drive-hud" aria-live="off">
      <b>{Math.round(speed * 2.237)}</b><small>mph</small>
      <span className="gear">{gear}</span>
      {alt != null && <span className="gear" id="veh-alt">ALT {alt} m</span>}
      <em>{driving}</em>
      <button className="btn small" id="veh-flip" onClick={() => act('flip')} title={alt != null ? 'Level the jet (F)' : 'Turn the vehicle upright (F)'}>{alt != null ? 'Level jet' : 'Flip vehicle'}</button>
      <button className="btn ghost small" id="veh-reset" onClick={() => act('reset')} title={alt != null ? 'Return the jet to its pad (R)' : 'Move the vehicle to the nearest road (R)'}>{alt != null ? 'Return to pad' : 'Reset vehicle'}</button>
    </div>
  )
}

function CarryHud() {
  const carrying = useStore((s) => s.carrying)
  if (!carrying) return null
  return (
    <div className="drive-hud" aria-live="off">
      <em>Carrying: {carrying.name}</em>
      <button className="btn small" onClick={putDownCarried} title="Set it back down nearby">Put down</button>
      <button className="btn ghost small" onClick={throwAwayCarried} title="Discard it for good">Throw away</button>
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
  const locale = useLocale((s) => s.locale)
  const localeAuto = useLocale((s) => s.auto)
  const setLocale = useLocale((s) => s.setLocale)
  const useAutoDetectLocale = useLocale((s) => s.useAutoDetect)
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
      <div className="row">
        <span><b>Draw distance</b><small>Near hides far-off streets in a thicker haze, which cuts the work a lot on phones and in long straight views.</small></span>
        <div className="seg small">
          <button className={settings.drawDist !== 'near' ? 'on' : ''} onClick={() => setSetting('drawDist', 'far')}>Far</button>
          <button className={settings.drawDist === 'near' ? 'on' : ''} onClick={() => setSetting('drawDist', 'near')}>Near</button>
        </div>
      </div>
      <Toggle k="bloom" label="Light glow" desc="Soft bloom around lamps, signs and screens." />
      <Toggle k="rain" label="Weather effects" desc="Show falling rain or snow when the weather calls for it." />
      {ttsSupported
        ? <Toggle k="npcVoice" label="NPC voices" desc="Read townspeople and staff dialogue aloud with your browser's built-in voice when you talk to them." />
        : <p className="hint">NPC voices: not supported in this browser.</p>}
      <div className="row">
        <span>
          <b>Language</b>
          <small>
            {localeAuto ? 'Auto-detected from your browser. ' : ''}
            Spoken NPC dialogue is translated when a translation is on file (currently the Residence Tower's
            greetings); the rest of the game's text stays in English for now.
          </small>
        </span>
        <div className="seg small" style={{ flexWrap: 'wrap' }}>
          {LOCALES.map((l) => <button key={l.code} id={'lang-' + l.code} className={locale === l.code ? 'on' : ''} onClick={() => setLocale(l.code)}>{l.label}</button>)}
          {!localeAuto && <button id="lang-auto" onClick={useAutoDetectLocale}>Auto</button>}
        </div>
      </div>
      <div className="row">
        <span><b>Street traffic</b><small>Cars driving on the cross street. Heavy adds a rush-hour jam; Light or Off runs better on phones.</small></span>
        <div className="seg small">
          {[['off', 'Off'], ['light', 'Light'], ['normal', 'Normal'], ['heavy', 'Heavy']].map(([k, l]) => <button key={k} id={'traffic-' + k} className={settings.traffic === k ? 'on' : ''} onClick={() => setSetting('traffic', k)}>{l}</button>)}
        </div>
      </div>
      <Toggle k="aircraft" label="Air traffic" desc="Airliners, private jets and a helicopter crossing the sky." />
      <Toggle k="aircraftSound" label="Aircraft sound" desc="Engine sound that gets louder as aircraft pass overhead." />
      <div className="row">
        <span><b>Avatar style</b><small>Classic is the neon robot look. Social has human proportions, a styled face, hair and fashion.</small></span>
        <div className="seg small">
          <button id="avatar-classic" className={settings.avatarStyle !== 'social' ? 'on' : ''} onClick={() => setSetting('avatarStyle', 'classic')}>Classic</button>
          <button id="avatar-social" className={settings.avatarStyle === 'social' ? 'on' : ''} onClick={() => setSetting('avatarStyle', 'social')}>Social</button>
        </div>
      </div>
      {settings.avatarStyle === 'social' && (
        <div className="row">
          <span><b>Body &amp; hair</b><small>Feminine adds a gown-ready figure and long hair; masculine adds a broader frame and short hair.</small></span>
          <div className="seg small">
            <button id="build-f" className={profile.build === 'f' ? 'on' : ''} onClick={() => setProfile({ build: 'f' })}>Feminine</button>
            <button id="build-m" className={profile.build !== 'f' ? 'on' : ''} onClick={() => setProfile({ build: 'm' })}>Masculine</button>
          </div>
        </div>
      )}
      {settings.avatarStyle === 'social' && (
        <div className="row">
          <span><b>Outfit</b><small>Doctor, CEO suit, animal-print top, tank and leggings, or a camel overcoat.</small></span>
          <div className="seg small" style={{ flexWrap: 'wrap' }}>
            {OUTFITS.map((o) => <button key={o.id} id={'outfit-' + o.id} className={(profile.preset || 'default') === o.id ? 'on' : ''} onClick={() => setProfile({ preset: o.id })}>{o.label}</button>)}
          </div>
        </div>
      )}
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
      <DevAdminToggle />
      <p className="hint">To play as one of your own 3D characters, import it in Assets and choose “Use as avatar”.</p>
    </Panel>
  )
}

/** A local-only admin switch for this device, independent of the hosted/self-hosted owner-token
 *  system above. Turn it on to open every door and paid/private room as the owner (owner entries
 *  into a customer's private booking are still logged), without needing a server or a token —
 *  useful while building and testing your own world. It never leaves this browser. */
function DevAdminToggle() {
  const on = useDevAdmin((s) => s.on)
  const toggle = useDevAdmin((s) => s.toggle)
  return (
    <label className="row toggle">
      <span><b>Admin mode (this device)</b><small>Enter every room and paid/private space as the owner, free, on this device — no server or token needed. Private entries are still logged.</small></span>
      <input id="set-dev-admin" type="checkbox" checked={on} onChange={toggle} />
    </label>
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
      <p className="hint">Reign Estate: the mansion north of Vision Motors. Walk up and the front doors open. Press E in the foyer or at the gate to watch the “Stay” duet (cinematic; Esc or Skip ends it).</p>
      <p className="hint">Vision Motors &amp; Skyport: on the east side past the Employment District (drive in from the cross street, or walk). Seven cars, two three-wheel roadsters and four motorcycles stand in the bays; press E at any of them. Bikes lean into turns. The two VTOL jets are on the beach pads: W/S thrust, A/D turn, Space climb, Shift descend, land and stop to press E. F levels the jet, R returns it to its pad.</p>
      <p className="hint">Jobs: the Employment District is on the cross street, east of the avenue past the Vision Music Lounge (look for the banner). Hire on at the Job Center, buy your uniform in its shop, clock in at the time clock, then follow the gold beacon and press E at each stop. Pay arrives on your pay schedule; the credits chip at the top shows your wallet. The two car washes charge 12 credits.</p>
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
