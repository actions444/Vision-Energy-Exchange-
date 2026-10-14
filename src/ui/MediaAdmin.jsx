import { useEffect, useMemo, useRef, useState } from 'react'
import { Panel } from './UI.jsx'
import { useBackend, backend } from '../backend/backend.js'
import { useMedia, KINDS, uploadMedia, updateMedia, deleteMedia, fileUrl } from '../media/media.js'

// Owner-only media library: upload, describe, publish/unpublish and delete songs, album covers,
// music videos, movies, audiobook chapters and e-books. Files and catalog entries are stored by
// the backend, so they persist and every visitor sees what is published.
const FILTERS = [['all', 'All'], ['song', 'Songs'], ['cover', 'Covers'], ['video', 'Music videos'], ['movie', 'Movies'], ['audiobook', 'Audiobooks'], ['ebook', 'E-books'], ['drafts', 'Drafts']]
const mb = (n) => (n / 1048576).toFixed(n < 10 * 1048576 ? 1 : 0) + ' MB'
const dur = (s) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '')

export default function MediaAdmin() {
  const b = useBackend()
  const { items, jobs, loaded } = useMedia()
  const [filter, setFilter] = useState('all')
  const [usage, setUsage] = useState(null)
  const refreshUsage = () => backend()?.usage?.().then(setUsage).catch(() => {})
  useEffect(() => { refreshUsage() }, [items.length])

  const shown = items.filter((x) => (filter === 'all' ? true : filter === 'drafts' ? !x.published : x.kind === filter))
  const counts = useMemo(() => Object.fromEntries(FILTERS.map(([k]) => [k, items.filter((x) => (k === 'all' ? true : k === 'drafts' ? !x.published : x.kind === k)).length])), [items])

  return (
    <Panel title="Media library" eyebrow={b.kind === 'hosted' ? 'Stored with this page' : b.kind === 'server' ? 'Stored on your server' : 'Development · this browser only'} wide>
      <Uploader />
      {jobs.length > 0 && (
        <ul className="jobs" aria-live="polite">
          {jobs.map((j) => <li key={j.id} className={j.error ? 'bad' : j.done ? 'ok' : ''}><b>{j.name}</b><span>{j.error || j.status}</span></li>)}
        </ul>
      )}
      {usage && (
        <div className="usage">
          <div className="usage-bar"><i style={{ width: Math.min(100, (usage.bytes / usage.maxBytes) * 100) + '%' }} /></div>
          <small>{mb(usage.bytes)} of {mb(usage.maxBytes)} used · {usage.files} of {usage.maxFiles} files</small>
        </div>
      )}
      <div className="seg tabs small" role="tablist">
        {FILTERS.map(([k, l]) => <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}{counts[k] ? ` ${counts[k]}` : ''}</button>)}
      </div>
      {!loaded && <p className="hint">Loading the library…</p>}
      {loaded && !shown.length && <p className="hint">{items.length ? 'Nothing in this section yet.' : 'The library is empty. Upload your first files above.'}</p>}
      <div className="admin-list">
        {shown.map((x) => <MediaRow key={x.id + (x.published ? 'p' : 'd')} item={x} onChange={refreshUsage} />)}
      </div>
    </Panel>
  )
}

function Uploader() {
  const b = useBackend()
  const [kind, setKind] = useState('auto')
  const [album, setAlbum] = useState('')
  const [artist, setArtist] = useState('Trinity Reign')
  const [publish, setPublish] = useState(true)
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const input = useRef()
  const go = async (files) => {
    if (!files.length) return
    setBusy(true)
    try { await uploadMedia(files, { kind, album: album.trim(), artist: artist.trim(), book: kind === 'audiobook' ? album.trim() : '', publish }) } finally { setBusy(false) }
  }
  const accept = kind === 'auto' ? Object.values(KINDS).map((k) => k.accept).join(',') : KINDS[kind].accept
  const groupLabel = kind === 'audiobook' ? 'Book title' : kind === 'ebook' ? 'Series (optional)' : 'Album'
  return (
    <div
      className={'drop media-drop' + (over ? ' over' : '')}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); go([...e.dataTransfer.files]) }}
    >
      <div className="fields four">
        <label className="field"><span>Type</span>
          <select id="media-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="auto">Detect from file</option>
            {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        <label className="field"><span>{groupLabel}</span><input id="media-album" value={album} onChange={(e) => setAlbum(e.target.value)} placeholder={kind === 'audiobook' ? 'Book title' : 'From the file tags'} /></label>
        <label className="field"><span>{kind === 'ebook' || kind === 'audiobook' ? 'Author' : 'Artist'}</span><input id="media-artist" value={artist} onChange={(e) => setArtist(e.target.value)} /></label>
        <label className="row toggle compact"><span><b>Publish now</b><small>Off saves a draft only you see.</small></span><input id="media-publish" type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} /></label>
      </div>
      <div className="drop-actions">
        <label className={'btn primary file' + (busy ? ' disabled' : '')}>
          {busy ? 'Uploading…' : 'Choose files'}
          <input ref={input} id="media-upload" type="file" multiple accept={accept} disabled={busy} onChange={(e) => { go([...e.target.files]); e.target.value = '' }} />
        </label>
        <small className="hint">or drop files here · MP3/M4A songs and audiobook chapters, JPG/PNG/WebP covers, MP4/WebM videos, PDF/TXT e-books · up to {Math.round(b.maxFileBytes / 1048576)} MB per file{b.kind === 'hosted' ? ' on this page (use a self-hosted server for full-length movies)' : ''}</small>
      </div>
    </div>
  )
}

function Thumb({ item }) {
  const [url, setUrl] = useState(null)
  useEffect(() => { let live = true; item.cover ? fileUrl(item.cover).then((u) => live && setUrl(u)) : setUrl(null); return () => { live = false } }, [item.cover])
  return url ? <img className="thumb" src={url} alt="" width={48} height={48} /> : <span className={'thumb fallback kind-' + item.kind} style={{ width: 48, height: 48 }} />
}

function MediaRow({ item, onChange }) {
  const [draft, setDraft] = useState({ title: item.title, artist: item.artist, album: item.kind === 'audiobook' ? item.book : item.album })
  const [preview, setPreview] = useState(null)
  const [confirm, setConfirm] = useState(false)
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => { setDraft({ title: item.title, artist: item.artist, album: item.kind === 'audiobook' ? item.book : item.album }) }, [item.title, item.artist, item.album, item.book])
  const groupKey = item.kind === 'audiobook' ? 'book' : 'album'
  const dirty = draft.title !== item.title || draft.artist !== item.artist || draft.album !== (item[groupKey] || '')
  const run = async (fn) => { setSaving(true); setErr(null); try { await fn() } catch (e) { setErr(e.message || String(e)) } setSaving(false) }
  const save = () => run(() => updateMedia(item, { title: draft.title.trim() || item.title, artist: draft.artist.trim(), [groupKey]: draft.album.trim() }))
  const togglePub = () => run(() => updateMedia(item, { published: !item.published }))
  const remove = () => run(async () => { await deleteMedia(item); onChange?.() })
  const showPreview = async () => { if (preview) return setPreview(null); setPreview(await fileUrl(item.file)) }
  const meta = [KINDS[item.kind]?.label, dur(item.duration), item.pages ? `${item.pages} pages` : '', item.size ? mb(item.size) : ''].filter(Boolean).join(' · ')
  return (
    <div className={'admin-row media-row' + (item.published ? '' : ' is-draft')}>
      <Thumb item={item} />
      <div className="grow fields three">
        <input aria-label="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <input aria-label="Artist or author" placeholder={item.kind === 'ebook' || item.kind === 'audiobook' ? 'Author' : 'Artist'} value={draft.artist} onChange={(e) => setDraft({ ...draft, artist: e.target.value })} />
        <input aria-label="Album or book" placeholder={item.kind === 'audiobook' ? 'Book' : 'Album'} value={draft.album || ''} onChange={(e) => setDraft({ ...draft, album: e.target.value })} />
        <small>{meta}</small>
      </div>
      <span className={'badge ' + (item.published ? 'live' : '')}>{item.published ? 'Published' : 'Draft'}</span>
      <div className="row-actions">
        {dirty && <button className="btn primary small" onClick={save} disabled={saving}>Save</button>}
        <button className="btn small" onClick={togglePub} disabled={saving}>{item.published ? 'Unpublish' : 'Publish'}</button>
        {item.kind !== 'cover' && <button className="btn ghost small" onClick={showPreview}>{preview ? 'Close preview' : 'Preview'}</button>}
        {confirm ? (
          <>
            <button className="btn small danger" onClick={remove} disabled={saving}>Delete for good</button>
            <button className="btn ghost small" onClick={() => setConfirm(false)}>Keep</button>
          </>
        ) : <button className="btn ghost small" onClick={() => setConfirm(true)}>Delete</button>}
      </div>
      {err && <p className="error full">{err}</p>}
      {preview && <Preview item={item} url={preview} />}
    </div>
  )
}

function Preview({ item, url }) {
  if (item.kind === 'video' || item.kind === 'movie') return <video className="media-preview" src={url} controls playsInline preload="metadata" />
  if (item.kind === 'song' || item.kind === 'audiobook') return <audio className="media-preview" src={url} controls preload="metadata" />
  if (item.kind === 'ebook') return <a className="btn small" href={url} target="_blank" rel="noreferrer">Open the file</a>
  return null
}
