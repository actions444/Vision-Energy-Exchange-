import { useMemo, useState } from 'react'
import { useMedia } from '../media/media.js'
import { backend } from '../backend/backend.js'

const uid = () => 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

// Build a full movie from uploaded clips: pick the clips, put them in order, name the movie, and save.
// The movie plays the clips back to back in the cinema (see movie.parts in cinema/cinema.js).
export default function MovieBuilder() {
  const items = useMedia((s) => s.items)
  const clips = useMemo(() => items.filter((x) => (x.kind === 'video' || x.kind === 'movie') && x.file && !x.parts), [items])
  const [order, setOrder] = useState([]) // clip ids, in play order
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const byId = (id) => clips.find((c) => c.id === id)
  const total = order.reduce((a, id) => a + (byId(id)?.duration || 0), 0)
  const toggle = (id) => setOrder((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]))
  const move = (i, d) => setOrder((o) => { const n = [...o]; const j = i + d; if (j < 0 || j >= n.length) return o; [n[i], n[j]] = [n[j], n[i]]; return n })

  const save = async () => {
    if (!title.trim() || order.length < 1) { setMsg('Name the movie and pick at least one clip.'); return }
    setBusy(true); setMsg('')
    try {
      const first = byId(order[0])
      const item = {
        id: uid(),
        kind: 'movie',
        title: title.trim(),
        file: first.file,
        parts: order,
        duration: Math.round(total) || null,
        size: order.reduce((a, id) => a + (byId(id)?.size || 0), 0),
        published: true,
        createdAt: new Date().toISOString(),
      }
      const { published, ...doc } = item
      await backend().set(`media/${item.id}`, doc)
      setMsg(`Saved "${item.title}" (${order.length} clips, ${Math.round(total / 60)} min).`)
      setOrder([]); setTitle('')
    } catch (e) {
      setMsg('Could not save the movie: ' + (e?.message || e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-list" style={{ marginBottom: 14 }}>
      <strong>Build a movie from clips</strong>
      <small className="hint">Pick your uploaded clips, put them in order, and save. The cinema plays them back to back as one movie. Total so far: {Math.round(total / 60)} min.</small>
      {clips.length === 0 && <small className="hint">Upload some video clips first.</small>}
      <ul>
        {clips.map((c) => (
          <li key={c.id}>
            <label><input type="checkbox" checked={order.includes(c.id)} onChange={() => toggle(c.id)} /> {c.title} {c.duration ? `· ${Math.round(c.duration)} s` : ''}</label>
          </li>
        ))}
      </ul>
      {order.length > 0 && (
        <ol>
          {order.map((id, i) => (
            <li key={id}>
              {i + 1}. {byId(id)?.title}{' '}
              <button className="btn small" onClick={() => move(i, -1)} aria-label="Move up">↑</button>{' '}
              <button className="btn small" onClick={() => move(i, 1)} aria-label="Move down">↓</button>
            </li>
          ))}
        </ol>
      )}
      <input placeholder="Movie title" value={title} onChange={(e) => setTitle(e.target.value)} />{' '}
      <button className="btn primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save movie'}</button>
      {msg && <small className="hint">{msg}</small>}
    </div>
  )
}
