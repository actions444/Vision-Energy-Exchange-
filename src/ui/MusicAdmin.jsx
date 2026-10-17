import { useEffect, useState } from 'react'
import { Panel } from './UI.jsx'
import { useMusicLibrary, resolveArt } from '../music/library.js'
import { useMusic, musicEngine } from '../music/engine.js'
import { useMusicAdmin } from '../music/adminState.js'
import { ZONES } from '../config/rooms.js'
import { playerState, cameraState } from '../state/runtime.js'
import { useStore } from '../state/store.js'

// Music admin dashboard: upload tracks and artwork, build playlists, add licensed radio,
// and choose what every room plays.
export default function MusicAdmin() {
  const [tab, setTab] = useState('rooms')
  const tabs = [['rooms', 'Rooms'], ['playlists', 'Playlists'], ['tracks', 'Tracks'], ['radio', 'Radio'], ['publish', 'Publish']]
  const lib = useMusicLibrary()
  return (
    <Panel title="Music admin" eyebrow="Rooms · playlists · radio" wide>
      <div className="seg tabs" role="tablist">
        {tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {lib.busy && <p className="hint">{lib.busy}</p>}
      {lib.error && <p className="error">{lib.error}</p>}
      {tab === 'rooms' && <RoomsTab />}
      {tab === 'playlists' && <PlaylistsTab />}
      {tab === 'tracks' && <TracksTab />}
      {tab === 'radio' && <RadioTab onDone={() => setTab('rooms')} />}
      {tab === 'publish' && <PublishTab />}
    </Panel>
  )
}

function Art({ item, size = 44 }) {
  const [url, setUrl] = useState(null)
  useEffect(() => { let live = true; resolveArt(item).then((u) => live && setUrl(u)); return () => { live = false } }, [item?.art, item?.artKey, item?.id])
  return url ? <img className="thumb" src={url} alt="" width={size} height={size} /> : <span className="thumb fallback" style={{ width: size, height: size }} />
}

const kindLabel = (p) => (p.kind === 'stream' ? 'Radio stream' : p.kind === 'embed' ? 'Radio player' : `${p.trackIds.length} track${p.trackIds.length === 1 ? '' : 's'}${p.shuffle ? ' · shuffle' : ''}`)

function RoomsTab() {
  const { playlists, assignments, assign } = useMusicLibrary()
  const here = useMusic((s) => s.zoneId)
  const { showZones, setShowZones } = useMusicAdmin()
  const go = (z) => {
    playerState.teleport = z.spawn
    cameraState.yaw = z.yaw
    useStore.getState().closePanel()
  }
  return (
    <div className="admin-list">
      <p className="hint">Each room is a 3D trigger zone. Walking in crossfades to its playlist. Inside nested zones, the smallest one wins.</p>
      {ZONES.map((z) => (
        <div className="admin-row" key={z.id}>
          <div className="grow">
            <b>{z.name}</b>
            <small>{z.kind}{here === z.id ? ' · you are here' : ''}</small>
          </div>
          <select id={'assign-' + z.id} aria-label={'Playlist for ' + z.name} value={assignments[z.id] || ''} onChange={(e) => assign(z.id, e.target.value || null)}>
            <option value="">No music</option>
            {playlists.map((p) => <option key={p.id} value={p.id}>{p.name} ({kindLabel(p)})</option>)}
          </select>
          <button className="btn" onClick={() => go(z)}>Go there</button>
        </div>
      ))}
      <label className="row toggle">
        <span><b>Show trigger zones</b><small>Draws each room's music zone as a yellow box in the world.</small></span>
        <input id="show-zones" type="checkbox" checked={showZones} onChange={(e) => setShowZones(e.target.checked)} />
      </label>
      <p className="hint">To add a room, add it to <code>src/config/rooms.js</code>. It shows up here automatically.</p>
    </div>
  )
}

function PlaylistsTab() {
  const lib = useMusicLibrary()
  const [sel, setSel] = useState(lib.playlists[0]?.id)
  const p = lib.playlists.find((x) => x.id === sel)
  const [addId, setAddId] = useState('')
  return (
    <div className="admin-split">
      <div className="admin-side">
        {lib.playlists.map((x) => (
          <button key={x.id} className={'pick' + (x.id === sel ? ' on' : '')} onClick={() => setSel(x.id)}>
            {x.name}<small>{kindLabel(x)}</small>
          </button>
        ))}
        <button className="btn primary" onClick={() => setSel(lib.createPlaylist('New playlist'))}>New playlist</button>
      </div>
      {p && (
        <div className="admin-main">
          <div className="admin-row">
            <Art item={p} size={64} />
            <div className="grow fields">
              <input id="pl-name" aria-label="Playlist name" value={p.name} onChange={(e) => lib.updatePlaylist(p.id, { name: e.target.value })} />
              <label className="btn file">Change cover<input id="pl-art" type="file" accept="image/*,.heic,.heif,.avif,.tif,.tiff,.bmp,.svg" onChange={(e) => { const f = e.target.files?.[0]; if (f) lib.setArt('playlist', p.id, f); e.target.value = '' }} /></label>
            </div>
          </div>
          {p.kind === 'tracks' ? (
            <>
              <label className="row toggle">
                <span><b>Shuffle</b><small>Random order, reshuffled each time the playlist loops.</small></span>
                <input id="pl-shuffle" type="checkbox" checked={!!p.shuffle} onChange={(e) => lib.updatePlaylist(p.id, { shuffle: e.target.checked })} />
              </label>
              <ol className="pl-tracks">
                {p.trackIds.map((tid, i) => {
                  const t = lib.tracks.find((x) => x.id === tid)
                  if (!t) return null
                  return (
                    <li key={tid + i}>
                      <Art item={t} size={36} />
                      <span className="grow"><b>{t.title}</b><small>{t.artist}</small></span>
                      <button className="btn ghost" onClick={() => lib.moveInPlaylist(p.id, i, -1)} disabled={i === 0} aria-label="Move up">Up</button>
                      <button className="btn ghost" onClick={() => lib.moveInPlaylist(p.id, i, 1)} disabled={i === p.trackIds.length - 1} aria-label="Move down">Down</button>
                      <button className="btn ghost" onClick={() => lib.removeFromPlaylist(p.id, i)}>Remove</button>
                    </li>
                  )
                })}
              </ol>
              {!p.trackIds.length && <p className="hint">This playlist is empty. Add tracks from your library or upload new ones.</p>}
              <div className="admin-row">
                <select id="pl-add" className="grow" value={addId} onChange={(e) => setAddId(e.target.value)} aria-label="Track to add">
                  <option value="">Add a track from the library…</option>
                  {lib.tracks.filter((t) => !p.trackIds.includes(t.id)).map((t) => <option key={t.id} value={t.id}>{t.title} · {t.artist}</option>)}
                </select>
                <button className="btn" disabled={!addId} onClick={() => { lib.addToPlaylist(p.id, [addId]); setAddId('') }}>Add</button>
                <label className="btn primary file">Upload MP3s here<input id="pl-upload" type="file" multiple accept="audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.oga,.opus,.aif,.aiff,.weba,.amr,.wma" onChange={(e) => { lib.uploadTracks([...e.target.files], p.id); e.target.value = '' }} /></label>
              </div>
            </>
          ) : (
            <RadioFields p={p} />
          )}
          <div className="row">
            <span><small>{p.demo ? 'Built-in demo playlist.' : p.fromManifest ? 'Shipped with the site.' : 'Saved on this device.'}</small></span>
            <button className="btn ghost" onClick={() => { lib.removePlaylist(p.id); setSel(lib.playlists[0]?.id) }}>Delete playlist</button>
          </div>
        </div>
      )}
    </div>
  )
}

function RadioFields({ p }) {
  const lib = useMusicLibrary()
  return (
    <div className="fields">
      <label className="field"><span>Stream address</span><input id="radio-edit-url" value={p.streamUrl || ''} onChange={(e) => lib.updatePlaylist(p.id, { streamUrl: e.target.value, kind: e.target.value ? 'stream' : 'embed' })} /></label>
      <label className="field"><span>Embedded player address</span><input id="radio-edit-embed" value={p.embedUrl || ''} onChange={(e) => lib.updatePlaylist(p.id, { embedUrl: e.target.value })} /></label>
      <p className="hint">License: {p.licenseNote || 'not recorded'}</p>
    </div>
  )
}

function TracksTab() {
  const lib = useMusicLibrary()
  const [target, setTarget] = useState('')
  return (
    <div className="admin-list">
      <div className="drop">
        <div>
          <b>Upload your music</b>
          <small>Any common audio format works (MP3, WAV, FLAC, M4A, AAC, OGG, and more) — anything that isn't already MP3 or M4A is converted automatically. Title, artist and embedded cover art are read from the file's tags where available. Edit them below.</small>
        </div>
        <div className="drop-actions">
          <select id="upload-target" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Add uploads to playlist">
            <option value="">Library only</option>
            {lib.playlists.filter((p) => p.kind === 'tracks').map((p) => <option key={p.id} value={p.id}>Add to {p.name}</option>)}
          </select>
          <label className="btn primary file">Choose audio<input id="track-upload" type="file" multiple accept="audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.oga,.opus,.aif,.aiff,.weba,.amr,.wma" onChange={(e) => { lib.uploadTracks([...e.target.files], target || null); e.target.value = '' }} /></label>
        </div>
      </div>
      {lib.tracks.map((t) => (
        <div className="admin-row" key={t.id}>
          <Art item={t} />
          <div className="grow fields two">
            <input aria-label="Title" value={t.title} onChange={(e) => lib.updateTrack(t.id, { title: e.target.value })} />
            <input aria-label="Artist" value={t.artist} onChange={(e) => lib.updateTrack(t.id, { artist: e.target.value })} />
          </div>
          <span className="badge">{t.source === 'generated' ? 'Demo' : t.source === 'local' ? 'Uploaded' : 'Site'}</span>
          <label className="btn file">Art<input type="file" accept="image/*,.heic,.heif,.avif,.tif,.tiff,.bmp,.svg" onChange={(e) => { const f = e.target.files?.[0]; if (f) lib.setArt('track', t.id, f); e.target.value = '' }} /></label>
          <button className="btn ghost" onClick={() => lib.removeTrack(t.id)}>Delete</button>
        </div>
      ))}
    </div>
  )
}

function RadioTab({ onDone }) {
  const lib = useMusicLibrary()
  const [f, setF] = useState({ name: '', streamUrl: '', embedUrl: '', licenseNote: '', ok: false })
  const [err, setErr] = useState(null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const submit = (e) => {
    e.preventDefault()
    const isUrl = (u) => /^https:\/\/\S+$/i.test(u)
    if (!f.name.trim()) return setErr('Give the station a name.')
    if (!f.streamUrl && !f.embedUrl) return setErr('Add a stream address or an embedded player address.')
    if (f.streamUrl && !isUrl(f.streamUrl)) return setErr('The stream address must start with https://')
    if (f.embedUrl && !isUrl(f.embedUrl)) return setErr('The player address must start with https://')
    if (!f.licenseNote.trim() || !f.ok) return setErr('Record your license or permission and confirm it before adding the station.')
    lib.addStation({ name: f.name.trim(), streamUrl: f.streamUrl.trim(), embedUrl: f.embedUrl.trim(), licenseNote: f.licenseNote.trim() })
    setErr(null)
    onDone()
  }
  const stations = lib.playlists.filter((p) => p.kind !== 'tracks')
  return (
    <form className="fields" onSubmit={submit}>
      <p className="hint">Add internet radio you are licensed or permitted to play publicly. A direct stream (an Icecast/Shoutcast MP3 or AAC address) fades and follows volume like any playlist. An embedded player shows the station's own official player when someone is in that room.</p>
      <label className="field"><span>Station name</span><input id="radio-name" value={f.name} onChange={set('name')} placeholder="Example: Storms FM" /></label>
      <label className="field"><span>Stream address</span><input id="radio-url" value={f.streamUrl} onChange={set('streamUrl')} placeholder="https://stream.example.com/live.mp3" /></label>
      <label className="field"><span>Embedded player address (optional)</span><input id="radio-embed" value={f.embedUrl} onChange={set('embedUrl')} placeholder="https://player.example.com/embed/…" /></label>
      <label className="field"><span>License or permission</span><input id="radio-license" value={f.licenseNote} onChange={set('licenseNote')} placeholder="Example: station's embed terms, or your PRO license number" /></label>
      <label className="row toggle">
        <span><b>I'm licensed or permitted to stream this station in my world</b></span>
        <input id="radio-ok" type="checkbox" checked={f.ok} onChange={set('ok')} />
      </label>
      {err && <p className="error">{err}</p>}
      <button className="btn primary" type="submit">Add station</button>
      {stations.length > 0 && (
        <>
          <h3>Your stations</h3>
          {stations.map((p) => <div className="admin-row" key={p.id}><b className="grow">{p.name}</b><small>{kindLabel(p)}</small></div>)}
          <p className="hint">Assign a station to a room in the Rooms tab.</p>
        </>
      )}
    </form>
  )
}

function PublishTab() {
  const lib = useMusicLibrary()
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(JSON.stringify(lib.exportManifest(), null, 2)); setCopied(true) } catch { setCopied(false) }
  }
  return (
    <div className="fields">
      <p>Changes you make here are saved on this device right away, so you can try them while you walk around.</p>
      <p>To make them what every visitor hears, put your MP3s in <code>public/music/</code> and this manifest in <code>public/music/manifest.json</code>, then redeploy. The README walks through it.</p>
      <div className="admin-row">
        <button className="btn primary" onClick={copy}>{copied ? 'Copied' : 'Copy music manifest'}</button>
        <button className="btn ghost" onClick={() => { lib.resetDemo(); musicEngine.retry() }}>Reset to the demo setup</button>
      </div>
    </div>
  )
}
