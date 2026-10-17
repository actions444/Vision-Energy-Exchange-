import { useState } from 'react'
import { Panel } from './UI.jsx'
import { useAssets, KINDS } from '../assets/assetStore.js'
import { playerState } from '../state/runtime.js'
import { useStore } from '../state/store.js'

// Asset library: import GLB/GLTF from Tripo 3D / Meshy AI, place models in the world,
// move/rotate/resize them, pick collision, or use a character as your avatar.
export default function AssetPanel() {
  const a = useAssets()
  const [kind, setKind] = useState('building')
  const [drag, setDrag] = useState(false)
  const [copied, setCopied] = useState(false)
  const sel = a.placed.find((p) => p.iid === a.selected)

  const doImport = async (files) => {
    if (!files?.length) return
    const added = await a.importFiles(files, kind)
    if (added.length) useStore.getState().showToast(`Imported ${added.map((x) => x.name).join(', ')}. Choose Place to put it in the world.`)
  }
  const placeHere = (assetId) => {
    const asset = a.library.find((x) => x.id === assetId)
    const yaw = playerState.yaw
    const dist = asset ? Math.max(3, (Math.max(asset.size[0], asset.size[2]) * (KINDS[asset.kind].height / (asset.size[1] || 1))) / 2 + 2.5) : 3
    const p = playerState.position
    const facing = ((yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
    a.place(assetId, [p.x + Math.sin(yaw) * dist, p.y, p.z + Math.cos(yaw) * dist], +facing.toFixed(3))
  }
  const copyLayout = async () => {
    try { await navigator.clipboard.writeText(JSON.stringify(a.exportLayout(), null, 2)); setCopied(true) } catch { setCopied(false) }
  }

  return (
    <Panel title="Asset library" eyebrow="3D model import · any common format" wide>
      <div className="assets">
        <div
          className={'drop' + (drag ? ' over' : '')}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); doImport(e.dataTransfer.files) }}
        >
          <div>
            <b>Drop your Tripo 3D or Meshy AI models here</b>
            <small>GLB, or GLTF with its .bin and textures; OBJ (+ MTL and textures), FBX, STL, PLY, DAE, 3MF and WRL are converted to GLB automatically. Select a model's texture files together with it.</small>
          </div>
          <div className="drop-actions">
            <label className="field inline">
              <span>Import as</span>
              <select id="import-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
                {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v.label} (~{v.height} m)</option>)}
              </select>
            </label>
            <label className="btn primary file">
              Choose files
              <input id="import-files" type="file" multiple accept=".glb,.gltf,.bin,.obj,.mtl,.fbx,.stl,.ply,.dae,.3mf,.wrl,.vrml,image/*" onChange={(e) => { doImport(e.target.files); e.target.value = '' }} />
            </label>
          </div>
        </div>
        {a.busy && <p className="hint">{a.busy}</p>}
        {a.error && <p className="error">{a.error}</p>}

        <h3>Library <small>{a.library.length} model{a.library.length === 1 ? '' : 's'}</small></h3>
        {a.library.length === 0 ? (
          <p className="hint">No models yet. Imported models are saved in this browser so they're here next visit.</p>
        ) : (
          <ul className="lib">
            {a.library.map((m) => (
              <li key={m.id}>
                <div className="lib-info">
                  <b>{m.name}</b>
                  <small>
                    {m.tris.toLocaleString()} triangles · {(m.bytes / 1048576).toFixed(1)} MB
                    {m.animations.length ? ` · ${m.animations.length} animation${m.animations.length > 1 ? 's' : ''}` : ''}
                    {m.source === 'manifest' ? ' · shipped with site' : ''}
                  </small>
                </div>
                <select aria-label="Type" value={m.kind} onChange={(e) => a.setKind(m.id, e.target.value)}>
                  {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <div className="lib-actions">
                  <button className="btn primary" onClick={() => placeHere(m.id)}>Place</button>
                  {a.avatar?.assetId === m.id ? (
                    <button className="btn on" onClick={() => a.setAvatar(null)}>Avatar ✓</button>
                  ) : (
                    <button className="btn" onClick={() => a.setAvatar(m.id, 0)}>Use as avatar</button>
                  )}
                  <button className="btn ghost" onClick={() => a.removeAsset(m.id)}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {a.avatar && (
          <div className="row">
            <span><b>Avatar facing</b><small>Flip if your character walks backwards.</small></span>
            <div className="seg small">
              <button className={a.avatar.facing === 0 ? 'on' : ''} onClick={() => a.setAvatar(a.avatar.assetId, 0)}>Forward</button>
              <button className={a.avatar.facing === 180 ? 'on' : ''} onClick={() => a.setAvatar(a.avatar.assetId, 180)}>Flipped</button>
            </div>
          </div>
        )}

        <h3>In the world <small>{a.placed.length} placed</small></h3>
        {a.placed.length > 0 && (
          <ul className="placed">
            {a.placed.map((p) => {
              const m = a.library.find((x) => x.id === p.assetId)
              return (
                <li key={p.iid}>
                  <button className={'pick' + (p.iid === a.selected ? ' on' : '')} onClick={() => a.select(p.iid === a.selected ? null : p.iid)}>
                    {m?.name || 'Model'} <small>{p.position.map((v) => v.toFixed(1)).join(', ')}</small>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {sel && <Editor inst={sel} />}

        <div className="row">
          <span><b>Ship this layout with the site</b><small>Copies a manifest.json for public/assets (see README).</small></span>
          <button className="btn" onClick={copyLayout} disabled={!a.library.length}>{copied ? 'Copied' : 'Copy layout'}</button>
        </div>
        {!a.persistent && <p className="hint">This browser is blocking storage, so imports last until you close the page.</p>}
      </div>
    </Panel>
  )
}

function Editor({ inst }) {
  const a = useAssets()
  const asset = a.library.find((x) => x.id === inst.assetId)
  const height = asset ? asset.size[1] * inst.scale : 1
  const [draftH, setDraftH] = useState(null)
  const shown = draftH ?? height
  const move = (dx, dy, dz) => {
    // move relative to world axes
    a.updatePlaced(inst.iid, { position: [inst.position[0] + dx, inst.position[1] + dy, inst.position[2] + dz].map((v) => +v.toFixed(2)) })
  }
  const commitHeight = (h) => {
    if (!asset) return
    a.updatePlaced(inst.iid, { scale: +(h / asset.size[1]).toFixed(4) })
    setDraftH(null)
  }
  const step = height > 6 ? 2 : 0.5
  return (
    <div className="editor">
      <div className="pad">
        <span className="lbl">Move ({step} m)</span>
        <div className="dpad">
          <button onClick={() => move(0, 0, -step)}>North</button>
          <button onClick={() => move(-step, 0, 0)}>West</button>
          <button onClick={() => move(step, 0, 0)}>East</button>
          <button onClick={() => move(0, 0, step)}>South</button>
          <button onClick={() => move(0, 0.25, 0)}>Up</button>
          <button onClick={() => move(0, -0.25, 0)}>Down</button>
        </div>
      </div>
      <div className="pad">
        <span className="lbl">Rotate</span>
        <div className="dpad two">
          <button onClick={() => a.updatePlaced(inst.iid, { rotationY: +(inst.rotationY + Math.PI / 12).toFixed(4) })}>Left 15°</button>
          <button onClick={() => a.updatePlaced(inst.iid, { rotationY: +(inst.rotationY - Math.PI / 12).toFixed(4) })}>Right 15°</button>
        </div>
      </div>
      <label className="pad">
        <span className="lbl">Height {shown.toFixed(1)} m</span>
        <input
          id="asset-height"
          type="range"
          min={0.2}
          max={60}
          step={0.1}
          value={shown}
          onChange={(e) => setDraftH(+e.target.value)}
          onPointerUp={(e) => commitHeight(+e.currentTarget.value)}
          onKeyUp={(e) => commitHeight(+e.currentTarget.value)}
        />
      </label>
      <div className="pad">
        <span className="lbl">Collision</span>
        <div className="seg small">
          {[['trimesh', 'Exact'], ['box', 'Box'], ['seat', 'Seating'], ['none', 'None']].map(([k, l]) => (
            <button key={k} className={inst.collider === k ? 'on' : ''} onClick={() => a.updatePlaced(inst.iid, { collider: k })}>{l}</button>
          ))}
        </div>
        <small className="hint">Exact lets you walk inside buildings and up stairs. Seating fits sofas and chairs: solid up to the seat, plus the backrest.</small>
      </div>
      <SeatEditor inst={inst} update={(patch) => a.updatePlaced(inst.iid, { seats: { count: 0, height: 0.45, depth: 0.1, flip: false, ...(inst.seats || {}), ...patch } })} />
      <div className="pad">
        <button className="btn ghost small" onClick={() => a.setFurnitureDefaults(inst.assetId, { collider: inst.collider, seats: inst.seats || null })}>Save collision &amp; seats as this model's defaults</button>
        <small className="hint">Every new copy you place starts with these settings. A wireframe shows the collision while the model is selected.</small>
      </div>
      <div className="pad actions">
        <button className="btn" onClick={() => {
          const p = playerState.position, yaw = playerState.yaw
          a.updatePlaced(inst.iid, { position: [p.x + Math.sin(yaw) * 3, p.y, p.z + Math.cos(yaw) * 3].map((v) => +v.toFixed(2)) })
        }}>Bring in front of me</button>
        <button className="btn" onClick={() => {
          const offset = Math.max(2, (asset ? Math.max(asset.size[0], asset.size[2]) * inst.scale : 2) * 0.7)
          const copy = a.place(inst.assetId, [inst.position[0] + offset, inst.position[1], inst.position[2]], inst.rotationY)
          if (copy) a.updatePlaced(copy.iid, { scale: inst.scale, collider: inst.collider, ...(inst.seats ? { seats: { ...inst.seats } } : {}) })
        }}>Duplicate</button>
        <button className="btn ghost" onClick={() => a.removePlaced(inst.iid)}>Delete</button>
      </div>
    </div>
  )
}

/** Seat points for imported furniture: how many, how high, how far forward, which way they face. */
function SeatEditor({ inst, update }) {
  const c = { count: 0, height: 0.45, depth: 0.1, flip: false, ...(inst.seats || {}) }
  return (
    <div className="pad">
      <span className="lbl">Seats {c.count ? '(shown as teal dots)' : ''}</span>
      <div className="seg small">
        {[0, 1, 2, 3, 4].map((n) => <button key={n} className={c.count === n ? 'on' : ''} onClick={() => update({ count: n })}>{n === 0 ? 'None' : n}</button>)}
      </div>
      {c.count > 0 && (
        <>
          <label className="field"><span>Seat height {c.height.toFixed(2)} m</span><input type="range" min={0.2} max={1.1} step={0.01} value={c.height} onChange={(e) => update({ height: +e.target.value })} /></label>
          <label className="field"><span>Seat position front/back</span><input type="range" min={-0.45} max={0.45} step={0.01} value={c.depth} onChange={(e) => update({ depth: +e.target.value })} /></label>
          <button className="btn ghost small" onClick={() => update({ flip: !c.flip })}>Seats face {c.flip ? 'the back' : 'the front'} · flip</button>
        </>
      )}
    </div>
  )
}
