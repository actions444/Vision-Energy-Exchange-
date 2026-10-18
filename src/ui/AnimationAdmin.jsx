import { useEffect, useState } from 'react'
import { Panel } from './UI.jsx'
import { useAssets, registry } from '../assets/assetStore.js'
import { ANIM_CATEGORIES, CATEGORY_LABELS } from '../anim/categories.js'
import { allEntries, assignOverride, clearOverride, subscribe } from '../anim/library.js'

/** Owner tool for the shared, cross-rig Animation Gallery library (anim/library.js): see which
 * category every uploaded skinned avatar's clips have filled so far (auto-matched by name, or
 * assigned here by hand), and assign a specific clip to a category when its name doesn't say
 * what pose it is. To preview a model, use "Use as avatar" in the 3D assets panel, then open the
 * Animation Gallery (the action-menu button) - this panel manages the library, it doesn't render
 * a separate 3D preview. */
export default function AnimationAdmin() {
  const library = useAssets((s) => s.library)
  const [, bump] = useState(0)
  useEffect(() => subscribe(() => bump((n) => n + 1)), [])

  const rigged = library.filter((a) => a.skinned && a.animations?.length)
  const filled = Object.fromEntries(allEntries().map((e) => [e.category, e]))
  const categories = Object.keys(ANIM_CATEGORIES)

  const [pickAsset, setPickAsset] = useState('')
  const [pickClip, setPickClip] = useState('')
  const [pickCategory, setPickCategory] = useState(categories[0])
  const assetOptions = rigged
  const clipOptions = pickAsset ? registry.get(pickAsset)?.animations.map((a) => a.name) || [] : []

  const assign = () => {
    if (!pickAsset || !pickClip || !pickCategory) return
    assignOverride(registry, pickAsset, pickClip, pickCategory)
  }

  return (
    <Panel title="Animations" eyebrow="Owner tools · shared library">
      <div className="admin-list">
        <p className="hint">
          Every skinned character you upload joins this pool automatically - its clips fill
          whichever categories their names match, and any other uploaded avatar can borrow a
          category it's missing, retargeted onto its own skeleton. Assign a clip by hand below
          when its name doesn't say what pose it is.
        </p>

        <p className="hint">Assign a clip to a category</p>
        <div className="fields">
          <label className="field"><span>Model</span>
            <select value={pickAsset} onChange={(e) => { setPickAsset(e.target.value); setPickClip('') }}>
              <option value="">Choose a rigged model…</option>
              {assetOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <label className="field"><span>Clip</span>
            <select value={pickClip} onChange={(e) => setPickClip(e.target.value)} disabled={!pickAsset}>
              <option value="">Choose a clip…</option>
              {clipOptions.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="field"><span>Category</span>
            <select value={pickCategory} onChange={(e) => setPickCategory(e.target.value)}>
              {categories.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </label>
          <button className="btn small primary" disabled={!pickAsset || !pickClip} onClick={assign}>Assign</button>
        </div>

        <p className="hint">Library ({Object.keys(filled).length}/{categories.length} categories filled)</p>
        <ul className="admin-list jobs-list">
          {categories.map((c) => {
            const e = filled[c]
            return (
              <li key={c} className="admin-row">
                <span style={{ flex: 1, minWidth: 180 }}>
                  <b>{CATEGORY_LABELS[c]}</b><br />
                  <small>{e ? `${e.clipName} — ${e.sourceName}${e.manual ? ' (assigned)' : ''}` : 'Not filled yet'}</small>
                </span>
                {e?.manual && <button className="btn small danger" onClick={() => clearOverride(c)}>Clear</button>}
              </li>
            )
          })}
        </ul>

        {rigged.length === 0 && <p className="note">No skinned, animated models uploaded yet - import one in the 3D assets panel to start building the library.</p>}
      </div>
    </Panel>
  )
}
