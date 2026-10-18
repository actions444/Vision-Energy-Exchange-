import { useEffect, useState } from 'react'
import { Panel } from './UI.jsx'
import { playerState } from '../state/runtime.js'
import { useAssets, registry } from '../assets/assetStore.js'
import { CLIP_PATTERNS } from '../assets/PlacedAssets.jsx'
import { getLibraryClip, subscribe as subscribeAnimLibrary } from '../anim/library.js'
import { useStore } from '../state/store.js'

// The Animation Gallery: every expressive animation your avatar can perform, in one searchable
// panel, with favorites and a speed control. Two renderers share it:
//  - The default procedural avatar (player/Avatar.jsx) implements every pose below directly -
//    no imported assets needed, always available.
//  - A custom avatar you imported and set as yours (Asset Library -> "Use as avatar") plays real
//    AnimationMixer clips instead (assets/PlacedAssets.jsx, ImportedAvatar): from that model's own
//    file if it has a matching clip, otherwise borrowed and retargeted onto its skeleton from the
//    shared cross-rig library (anim/library.js, fed by every skinned avatar anyone's uploaded - see
//    anim/categories.js). A model without a skeleton to retarget onto, or for which no uploaded
//    avatar has ever contributed that category, simply doesn't offer that entry (disabled, with
//    the reason why - never a button that does nothing silently). ui/AnimationAdmin.jsx is where
//    an admin can assign a clip to a category by hand when its name doesn't say what it is.
const FAV_KEY = 'vsw-anim-favorites'
const loadFavs = () => { try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]')) } catch { return new Set() } }
const saveFavs = (s) => { try { localStorage.setItem(FAV_KEY, JSON.stringify([...s])) } catch { /* best effort */ } }

const GESTURE_SECS = { clap: 2.2, bow: 2.2, point: 1.8 }

// id: used for favorites/search. procId: the gesture name player/Avatar.jsx understands.
// clipKey: the assets/PlacedAssets.jsx CLIP_PATTERNS category an imported avatar needs a clip for.
const CATALOG = [
  { id: 'wave', label: 'Wave', group: 'Everyday', kind: 'oneshot', procId: 'wave', clipKey: 'wave' },
  { id: 'clap', label: 'Clap', group: 'Everyday', kind: 'oneshot', procId: 'clap', clipKey: 'clap' },
  { id: 'bow', label: 'Bow', group: 'Everyday', kind: 'oneshot', procId: 'bow', clipKey: 'bow' },
  { id: 'point', label: 'Point', group: 'Everyday', kind: 'oneshot', procId: 'point', clipKey: 'point' },
  { id: 'chest', label: 'Hand to chest', group: 'Poses', kind: 'hold', procId: 'chest', clipKey: 'chest' },
  { id: 'open', label: 'Arms open', group: 'Poses', kind: 'hold', procId: 'open', clipKey: 'open', hint: 'Welcoming, both arms out' },
  { id: 'reach', label: 'Reach', group: 'Poses', kind: 'hold', procId: 'reach', clipKey: 'reach', hint: 'Reach out with one hand' },
  { id: 'hold', label: 'Hold hands', group: 'Poses', kind: 'hold', procId: 'hold', clipKey: 'hold', hint: 'Both hands out, waist height' },
  { id: 'read', label: 'Read', group: 'Poses', kind: 'hold', procId: 'read', clipKey: 'read', hint: 'Hold something up to read, like a book or sign' },
  { id: 'write', label: 'Write', group: 'Poses', kind: 'hold', procId: 'write', clipKey: 'write', hint: 'Work at a desk or table' },
  { id: 'tray', label: 'Carry a tray', group: 'Poses', kind: 'hold', procId: 'tray', clipKey: 'tray', hint: 'Both forearms level, like carrying something' },
  { id: 'shake', label: 'Shake', group: 'Poses', kind: 'hold', procId: 'shake', clipKey: 'shake', hint: 'Shaking something hard, like a cocktail shaker' },
  { id: 'cook', label: 'Cook', group: 'Poses', kind: 'hold', procId: 'stir', clipKey: 'cook', hint: 'Stirring a pot' },
  { id: 'clean', label: 'Clean', group: 'Poses', kind: 'hold', procId: 'wipe', clipKey: 'clean', hint: 'Wiping a counter' },
  { id: 'brow', label: 'Shield eyes', group: 'Poses', kind: 'hold', procId: 'brow', clipKey: 'brow', hint: 'Hand to the brow, scanning the distance' },
  { id: 'blow', label: 'Whistle', group: 'Poses', kind: 'hold', procId: 'blow', clipKey: 'blow', hint: 'Hand to the mouth' },
  { id: 'laugh', label: 'Laugh', group: 'Poses', kind: 'hold', procId: 'laugh', clipKey: 'laugh' },
  { id: 'cry', label: 'Cry', group: 'Poses', kind: 'hold', procId: 'cry', clipKey: 'cry' },
  { id: 'talk', label: 'Talk', group: 'Poses', kind: 'hold', procId: 'talk', clipKey: 'talk', hint: 'An idle conversational gesture' },
  { id: 'dance', label: 'Dance', group: 'Performance', kind: 'dance', clipKey: 'dance', hint: 'Loops a dance sway until you turn it off' },
  { id: 'exercise', label: 'Exercise', group: 'Performance', kind: 'exercise', clipKey: 'exercise', hint: 'A standing workout pose - no gym machine needed' },
  { id: 'sing', label: 'Sing', group: 'Performance', kind: 'sing', clipKey: 'sing', hint: 'Mouth and posture respond to whatever music is playing' },
  { id: 'perform', label: 'Performing concerts', group: 'Performance', kind: 'shortcut', hint: 'Opens the full stage tools: pick a track, sing, dance and work the crowd' },
]
const GROUPS = ['Everyday', 'Poses', 'Performance']

export default function ActionsPanel() {
  const openPanel = useStore((s) => s.openPanel)
  const avatarCfg = useAssets((s) => s.avatar)
  const info = avatarCfg?.assetId ? registry.get(avatarCfg.assetId) : null
  const imported = !!info

  const [query, setQuery] = useState('')
  const [favOnly, setFavOnly] = useState(false)
  const [favs, setFavs] = useState(loadFavs)
  const [pose, setPose] = useState(playerState.gesture)
  const [speed, setSpeed] = useState(playerState.animSpeed || 1)
  const [, bumpLibrary] = useState(0) // re-render if the shared animation library gains an entry while this is open
  useEffect(() => subscribeAnimLibrary(() => bumpLibrary((n) => n + 1)), [])
  const dancing = playerState.dancing
  const working = playerState.workout === 'squat'
  const singing = !!playerState.sing

  const toggleFav = (id) => {
    const next = new Set(favs)
    if (next.has(id)) next.delete(id); else next.add(id)
    setFavs(next); saveFavs(next)
  }

  const available = (c) => {
    if (c.kind === 'shortcut') return true
    if (!imported) return true // the procedural avatar implements every entry below for real
    if (!c.clipKey) return false // no imported-avatar equivalent for this one - see header note
    const re = CLIP_PATTERNS[c.clipKey]
    if (re && info.animations.some((a) => re.test(a.name))) return true
    // no clip of its own - but the shared, cross-rig library might have one to retarget on, as
    // long as this model actually has a skeleton to retarget onto
    return !!(info.skinned && getLibraryClip(c.clipKey))
  }
  const unavailableReason = (c) => {
    if (!imported) return ''
    if (!c.clipKey) return 'Only on the default avatar'
    if (!info.skinned) return 'This model has no skeleton to animate'
    return 'No clip for this yet - your model and the shared library both lack one'
  }

  const oneshot = (c) => {
    if (c.id === 'wave') { playerState.emote = 'wave'; playerState.emoteUntil = performance.now() / 1000 + 1.5; return }
    playerState.gesture = imported ? c.clipKey : c.procId
    playerState.gestureUntil = performance.now() / 1000 + (GESTURE_SECS[c.id] || 2)
  }
  const togglePose = (c) => {
    const next = pose === c.id ? null : c.id
    setPose(next)
    playerState.gesture = next ? (imported ? c.clipKey : c.procId) : null
    playerState.gestureUntil = Infinity // held, not timed - cleared by picking another pose or this one again
  }
  const setSpeedVal = (v) => { setSpeed(v); playerState.animSpeed = v }

  const q = query.trim().toLowerCase()
  const items = CATALOG.filter((c) => (!favOnly || favs.has(c.id)) && (!q || c.label.toLowerCase().includes(q)))

  return (
    <Panel title="Animation Gallery" eyebrow="Your avatar" wide>
      <div className="fields">
        <p className="hint">
          {imported
            ? `Playing real animation clips from your imported avatar ("${info.name || avatarCfg.assetId}"). Only categories that model actually has a clip for are enabled.`
            : 'Procedural poses on the default avatar - every entry below is live, not a placeholder.'}
        </p>
        <div className="row-actions" style={{ gap: 8 }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search animations…" style={{ flex: 1 }} aria-label="Search animations" />
          <label className="row toggle" style={{ width: 'auto' }}>
            <span>★ Favorites only</span>
            <input type="checkbox" checked={favOnly} onChange={(e) => setFavOnly(e.target.checked)} />
          </label>
        </div>

        {GROUPS.map((group) => {
          const groupItems = items.filter((c) => c.group === group)
          if (!groupItems.length) return null
          return (
            <div key={group}>
              <p className="eyebrow" style={{ marginTop: 10 }}>{group}</p>
              <div className="chips" style={{ flexWrap: 'wrap', overflow: 'visible' }}>
                {groupItems.map((c) => {
                  const ok = available(c)
                  const on = c.kind === 'hold' ? pose === c.id
                    : c.kind === 'dance' ? dancing
                    : c.kind === 'exercise' ? working
                    : c.kind === 'sing' ? singing
                    : false
                  const onClick = () => {
                    if (!ok) return
                    if (c.kind === 'oneshot') oneshot(c)
                    else if (c.kind === 'hold') togglePose(c)
                    else if (c.kind === 'dance') playerState.dancing = !playerState.dancing
                    else if (c.kind === 'exercise') playerState.workout = working ? null : 'squat'
                    else if (c.kind === 'sing') playerState.sing = singing ? 0 : 1
                  }
                  return (
                    <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                      <button
                        className={'chip-btn' + (on ? ' on' : '')}
                        disabled={!ok}
                        title={ok ? c.hint : unavailableReason(c)}
                        onClick={c.kind === 'shortcut' ? () => openPanel({ type: 'performance' }) : onClick}
                      >{c.label}</button>
                      <button className={'chip-btn small' + (favs.has(c.id) ? ' on' : '')} title={favs.has(c.id) ? 'Remove favorite' : 'Add favorite'} onClick={() => toggleFav(c.id)}>★</button>
                    </span>
                  )
                })}
              </div>
              {group === 'Performance' && (
                <label className="field" style={{ marginTop: 6 }}>
                  <span>Dance speed {speed.toFixed(1)}×</span>
                  <input type="range" min={0.5} max={2} step={0.1} value={speed} onChange={(e) => setSpeedVal(+e.target.value)} />
                </label>
              )}
            </div>
          )
        })}
        {!items.length && <p className="hint">No animations match "{query}".</p>}

        <p className="note">
          Wave, Clap, Bow and Point play once and stop on their own; everything else in Poses holds
          until you pick it again. Hug and Kiss need a second person's avatar to pose against, which
          isn't built yet; Driving uses your pose automatically once you're in a vehicle seat; Acting
          and Modeling are the expressive poses above, not a separate animation.
        </p>
      </div>
    </Panel>
  )
}
