import { useEffect, useState } from 'react'
import { useDecor, closeDecorator, beginPlace, rotatePlacing, nudgePlacing, confirmPlace, cancelPlace, removeItem, rotateItem, undo, saveDesign, discardChanges, setFloor, setWall, setLight, setDoor } from '../decor/decor.js'
import { spaceById } from '../decor/spaces.js'
import { CATEGORIES, ITEMS, itemById, FLOORS, WALL_COLORS, WALLPAPERS, LIGHT_PRESETS, DOOR_STYLES } from '../decor/catalog.jsx'
import { useStore } from '../state/store.js'
import { playerState } from '../state/runtime.js'

const Q = Math.PI / 4

// The DECORATE menu: a side sheet (the world stays visible and you can keep walking).
export default function DecorPanel() {
  const st = useDecor()
  const [cat, setCat] = useState('furniture')
  const space = spaceById(st.spaceId)
  useEffect(() => {
    const key = (e) => {
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return
      const s = useDecor.getState()
      if (e.code === 'Escape') { if (s.placing) cancelPlace(); else closeDecorator(); e.stopPropagation() }
      if (!s.placing) { if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { undo(); e.preventDefault() } return }
      if (e.code === 'KeyR') rotatePlacing(e.shiftKey ? -Q : Q)
      if (e.code === 'Enter') { confirmPlace(); e.preventDefault() }
    }
    window.addEventListener('keydown', key, true)
    return () => window.removeEventListener('keydown', key, true)
  }, [])
  if (!st.open || !space) return null
  const ok = st.allowed?.ok
  const start = () => ({ x: playerState.position.x + Math.sin(playerState.yaw) * 2.2, z: playerState.position.z + Math.cos(playerState.yaw) * 2.2, yaw: playerState.yaw + Math.PI })

  return (
    <aside className="decor-sheet" aria-label="Decorate">
      <header>
        <div>
          <p className="eyebrow">Decorate {st.allowed?.how === 'owner' ? '· owner' : st.allowed?.how === 'renter' ? '· your rental' : ''}</p>
          <h2>{space.name}</h2>
        </div>
        <button className="close" onClick={() => closeDecorator()} aria-label="Close decorating">Close</button>
      </header>

      {st.allowed === null && <p className="hint">Checking your access…</p>}
      {st.allowed && !ok && (
        <div className="fields">
          <p className="hint">{st.allowed.reason}</p>
          <button className="btn primary" onClick={() => { closeDecorator(true); useStore.getState().openPanel({ type: 'rent', roomId: st.spaceId }) }}>Rent this room</button>
        </div>
      )}

      {ok && st.placing && <PlacingBar />}

      {ok && !st.placing && (
        <>
          <div className="chips" role="tablist">
            {CATEGORIES.map(([k, l]) => <button key={k} role="tab" aria-selected={cat === k} className={'chip-btn' + (cat === k ? ' on' : '')} onClick={() => setCat(k)}>{l}</button>)}
          </div>
          <div className="decor-body">
            {['furniture', 'lighting', 'decorations', 'outdoor'].includes(cat) && (
              <>
                {cat === 'lighting' && (
                  <div className="swatch-list">
                    <b>Room lighting</b>
                    <div className="swatches wrap">
                      <button className={'sw-pill' + (!st.draft.light ? ' on' : '')} onClick={() => setLight(null)}>Original</button>
                      {LIGHT_PRESETS.map((p) => <button key={p.id} className={'sw-pill' + (st.draft.light === p.id ? ' on' : '')} onClick={() => setLight(p.id)}><i style={{ background: p.color }} />{p.name}</button>)}
                    </div>
                  </div>
                )}
                <p className="hint small">Starter collection · included for owners and renters</p>
                <div className="item-grid">
                  {ITEMS.filter((i) => i.cat === cat).map((i) => (
                    <button key={i.id} className="item-card" id={'decor-' + i.id} onClick={() => beginPlace(i.id, null, start())}>
                      <b>{i.name}</b><small>{i.size[0]} × {i.size[2]} m</small>
                    </button>
                  ))}
                </div>
              </>
            )}
            {cat === 'flooring' && (
              <div className="swatches wrap">
                <button className={'sw-pill' + (!st.draft.floor ? ' on' : '')} onClick={() => setFloor(null)}>Original</button>
                {FLOORS.map((f) => <button key={f.id} id={'floor-' + f.id} className={'sw-pill' + (st.draft.floor === f.id ? ' on' : '')} onClick={() => setFloor(f.id)}>{f.name}</button>)}
              </div>
            )}
            {cat === 'walls' && (
              <div className="swatches wrap">
                <button className={'sw-pill' + (!st.draft.wall ? ' on' : '')} onClick={() => setWall('paint', null)}>Original</button>
                {WALL_COLORS.map((c) => <button key={c.id} id={'wall-' + c.id} className={'sw-pill' + (st.draft.wall?.kind === 'paint' && st.draft.wall.id === c.id ? ' on' : '')} onClick={() => setWall('paint', c.id)}><i style={{ background: c.color }} />{c.name}</button>)}
              </div>
            )}
            {cat === 'wallpaper' && (
              <div className="swatches wrap">
                <button className={'sw-pill' + (!st.draft.wall ? ' on' : '')} onClick={() => setWall('paper', null)}>No wallpaper</button>
                {WALLPAPERS.map((w) => <button key={w.id} className={'sw-pill' + (st.draft.wall?.kind === 'paper' && st.draft.wall.id === w.id ? ' on' : '')} onClick={() => setWall('paper', w.id)}><i style={{ background: `repeating-linear-gradient(90deg, ${w.bg} 0 6px, ${w.fg} 6px 8px)` }} />{w.name}</button>)}
              </div>
            )}
            {cat === 'doors' && (
              <div className="swatches wrap">
                {DOOR_STYLES.map((d) => <button key={d.id} className={'sw-pill' + ((st.draft.door || 'wood') === d.id ? ' on' : '')} onClick={() => setDoor(d.id === 'wood' ? null : d.id)}>{d.name}</button>)}
              </div>
            )}
            {cat === 'windows' && <p className="hint">This building's windows are part of its glass facade, so they can't be swapped. Window packs will work in homes built for them.</p>}
            {cat === 'npcs' && <p className="hint">You don't own any NPC packs yet. NPC packs will appear here after you buy them, once the marketplace opens.</p>}
            {cat === 'pets' && <p className="hint">You don't own any pet packs yet. Pet packs will appear here after you buy them, once the marketplace opens.</p>}
            <p className="hint small">Walls: paint and wallpaper cover the room's inner walls (glass facades stay glass).</p>
          </div>
          <PlacedList />
        </>
      )}

      {ok && (
        <footer>
          {st.message && <p className={st.message.startsWith('Could not') ? 'error' : 'hint'}>{st.message}</p>}
          <div className="row-actions">
            <button className="btn ghost small" onClick={undo} disabled={!st.undo.length}>Undo{st.undo.length ? ` (${st.undo.length})` : ''}</button>
            <button className="btn ghost small" onClick={discardChanges} disabled={!st.dirty}>Discard</button>
            <span className="grow" />
            <button className="btn primary" id="decor-save" onClick={saveDesign} disabled={!st.dirty || st.saving}>{st.saving ? 'Saving…' : st.dirty ? 'Save changes' : 'Saved'}</button>
          </div>
        </footer>
      )}
    </aside>
  )
}

function PlacingBar() {
  const p = useDecor((s) => s.placing)
  const item = itemById(p.itemId)
  const step = 0.25
  return (
    <div className="placing">
      <b>{p.uid ? 'Moving' : 'Placing'}: {item?.name}</b>
      <small className={p.valid ? 'ok' : 'bad'}>{p.valid ? 'Fits here.' : 'Not here: outside the room or in the doorway.'} {p.follow ? 'The preview follows you; walk to the spot or use the arrows.' : ''}</small>
      <div className="placing-grid">
        <button className="btn small" onClick={() => rotatePlacing(Q)} aria-label="Rotate left">⟲ Rotate</button>
        <button className="btn small" onClick={() => nudgePlacing(0, -step)} aria-label="Move north">↑</button>
        <button className="btn small" onClick={() => rotatePlacing(-Q)} aria-label="Rotate right">Rotate ⟳</button>
        <button className="btn small" onClick={() => nudgePlacing(-step, 0)} aria-label="Move west">←</button>
        <button className="btn small" onClick={() => nudgePlacing(0, step)} aria-label="Move south">↓</button>
        <button className="btn small" onClick={() => nudgePlacing(step, 0)} aria-label="Move east">→</button>
      </div>
      <div className="row-actions">
        <button className="btn ghost" onClick={cancelPlace}>Cancel</button>
        <button className="btn primary" id="decor-place" onClick={confirmPlace} disabled={!p.valid}>Place here</button>
      </div>
      <small className="hint">Keys: R rotate · Enter place · Esc cancel</small>
    </div>
  )
}

function PlacedList() {
  const items = useDecor((s) => s.draft?.items || [])
  const selected = useDecor((s) => s.selected)
  if (!items.length) return <p className="hint small">Nothing placed yet.</p>
  return (
    <div className="placed">
      <b>In this room ({items.length})</b>
      <ul>
        {items.map((it) => (
          <li key={it.uid} className={selected === it.uid ? 'on' : ''}>
            <button className="linkish" onClick={() => useDecor.setState({ selected: selected === it.uid ? null : it.uid })}>{itemById(it.itemId)?.name || it.itemId}</button>
            <span className="row-actions">
              <button className="btn ghost small" onClick={() => beginPlace(it.itemId, it.uid)}>Move</button>
              <button className="btn ghost small" onClick={() => rotateItem(it.uid, Q)} aria-label="Rotate">⟳</button>
              <button className="btn ghost small" onClick={() => removeItem(it.uid)}>Remove</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
