import { useEffect, useMemo, useState } from 'react'
import { Panel } from './UI.jsx'
import { useMusicLibrary, resolveArt } from '../music/library.js'
import { useMusic, musicEngine } from '../music/engine.js'

// Storms Records listening station: browse published albums and playlists, pick songs, keep
// your own list. What you pick plays while you stay in the store (only you hear it).
const MY = 'vsw-mylist'
const readMine = () => { try { return JSON.parse(localStorage.getItem(MY) || '[]') } catch { return [] } }
const writeMine = (ids) => { try { localStorage.setItem(MY, JSON.stringify(ids)) } catch {} }

function Cover({ item, size = 120 }) {
  const [url, setUrl] = useState(null)
  useEffect(() => { let live = true; resolveArt(item).then((u) => live && setUrl(u)); return () => { live = false } }, [item?.cover, item?.id, item?.artKey])
  return url ? <img className="cover" src={url} alt="" width={size} height={size} /> : <span className="cover fallback" style={{ width: size, height: size }} />
}

export default function RecordsPanel() {
  const { tracks, playlists } = useMusicLibrary()
  const [tab, setTab] = useState('albums')
  const [open, setOpen] = useState(null) // playlist id
  const [mine, setMine] = useState(readMine)
  const save = (ids) => { setMine(ids); writeMine(ids) }

  const albums = playlists.filter((p) => p.auto && p.album)
  const catalog = playlists.find((p) => p.id === 'pl-catalog')
  const published = catalog && !catalog.fallback && catalog.trackIds.length > 0
  const lists = playlists.filter((p) => p.kind === 'tracks' && !p.album && p.trackIds.length && !(p.id === 'pl-catalog' && p.fallback))
  const byId = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks])
  const myList = { id: 'pl-mine', name: 'My list', kind: 'tracks', trackIds: mine.filter((id) => byId.has(id)) }

  const selected = open === 'pl-mine' ? myList : playlists.find((p) => p.id === open)
  return (
    <Panel title="Storms Records" eyebrow="Listening station" wide>
      {selected ? (
        <ListView list={selected} byId={byId} mine={mine} onMine={save} onBack={() => setOpen(null)} />
      ) : (
        <>
          <div className="seg tabs small" role="tablist">
            {[['albums', 'Albums'], ['playlists', 'Playlists'], ['mine', `My list${mine.length ? ' ' + myList.trackIds.length : ''}`]].map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => (k === 'mine' ? setOpen('pl-mine') : setTab(k))}>{l}</button>
            ))}
          </div>
          {tab === 'albums' && (
            <>
              {published ? (
                <div className="album-grid">
                  <button className="album-card" onClick={() => setOpen('pl-catalog')}><Cover item={catalog} /><b>Full catalog</b><small>{catalog.trackIds.length} songs</small></button>
                  {albums.map((a) => (
                    <button key={a.id} className="album-card" onClick={() => setOpen(a.id)}>
                      <Cover item={a} />
                      <b>{a.name}</b>
                      <small>{byId.get(a.trackIds[0])?.artist || ''} · {a.trackIds.length} song{a.trackIds.length === 1 ? '' : 's'}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="hint">No albums have been published yet. When the owner publishes songs in the Media library they appear here, grouped by album. Meanwhile, the store's playlists have demo music.</p>
              )}
            </>
          )}
          {tab === 'playlists' && (
            <div className="album-grid">
              {lists.map((p) => (
                <button key={p.id} className="album-card" onClick={() => setOpen(p.id)}>
                  <Cover item={p.cover || p.artKey ? p : byId.get(p.trackIds[0])} />
                  <b>{p.name}</b>
                  <small>{p.trackIds.length} tracks{p.demo ? ' · demo' : ''}</small>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </Panel>
  )
}

function ListView({ list, byId, mine, onMine, onBack }) {
  const playing = useMusic((s) => s.track?.id)
  const queue = useMusic((s) => s.queue)
  const items = list.trackIds.map((id) => byId.get(id)).filter(Boolean)
  const ids = items.map((t) => t.id)
  const play = (start = 0, shuffle = false) => musicEngine.playQueue(ids, { name: list.name, start, shuffle })
  const isMine = list.id === 'pl-mine'
  const toggleMine = (id) => onMine(mine.includes(id) ? mine.filter((x) => x !== id) : [...mine, id])
  const move = (i, d) => { const a = [...ids]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; onMine(a) }
  return (
    <div className="list-view">
      <button className="btn ghost small" onClick={onBack}>← All music</button>
      <div className="list-head">
        <Cover item={list.cover || list.artKey ? list : items[0]} size={140} />
        <div>
          <p className="eyebrow">{isMine ? 'Saved on this device' : list.album ? 'Album' : 'Playlist'}</p>
          <h3>{list.name}</h3>
          <small>{items[0]?.artist || ''}{items.length ? ` · ${items.length} song${items.length === 1 ? '' : 's'}` : ''}</small>
          <div className="row-actions">
            <button className="btn primary" id="records-play" onClick={() => play(0)} disabled={!items.length}>Play</button>
            <button className="btn" onClick={() => play(Math.floor(Math.random() * items.length), true)} disabled={items.length < 2}>Shuffle</button>
            {queue && <button className="btn ghost" onClick={() => musicEngine.clearQueue()}>Back to store music</button>}
          </div>
        </div>
      </div>
      {!items.length && <p className="hint">{isMine ? 'Your list is empty. Add songs with “+ My list” on any album or playlist.' : 'No songs here yet.'}</p>}
      <ol className="pl-tracks songs">
        {items.map((t, i) => (
          <li key={t.id + i} className={playing === t.id ? 'now' : ''}>
            <button className="icon-play" onClick={() => play(i)} aria-label={'Play ' + t.title}>{playing === t.id ? '♪' : i + 1}</button>
            <span className="grow"><b>{t.title}</b><small>{t.artist}{t.duration ? ` · ${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, '0')}` : ''}</small></span>
            {isMine ? (
              <>
                <button className="btn ghost small" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">Up</button>
                <button className="btn ghost small" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down">Down</button>
                <button className="btn ghost small" onClick={() => toggleMine(t.id)}>Remove</button>
              </>
            ) : (
              <button className={'btn small' + (mine.includes(t.id) ? ' on' : ' ghost')} onClick={() => toggleMine(t.id)}>{mine.includes(t.id) ? '✓ My list' : '+ My list'}</button>
            )}
          </li>
        ))}
      </ol>
      <p className="hint">Your pick plays while you're in the store and only you hear it. Use the player for pause, skip, shuffle, repeat and volume.</p>
    </div>
  )
}
