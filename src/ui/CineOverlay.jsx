import { useCine, stopCine } from '../state/cine.js'

// Letterbox bars, fade to black, lyric captions and the title card for the cinematic.
const COLOR = { t: '#f0b6ff', z: '#ffe29a', b: '#ffffff' }
export default function CineOverlay() {
  const { active, caption, fade, title } = useCine()
  if (!active) return null
  return (
    <div className="cine" role="presentation">
      <div className="cine-bar top" />
      <div className="cine-bar bottom" />
      {caption && (
        <div className="cine-cap" key={caption.text} style={{ color: COLOR[caption.who] }}>
          <small>{caption.who === 't' ? 'Trinity' : caption.who === 'z' ? 'Zion' : 'Trinity & Zion'}</small>
          <span>{caption.text}</span>
        </div>
      )}
      {title > 0 && (
        <div className="cine-title" style={{ opacity: title }}>
          <b>STAY</b>
          <span>Trinity &amp; Zion · Reign Estate</span>
        </div>
      )}
      <div className="cine-fade" style={{ opacity: fade }} />
      <button className="cine-skip" onClick={stopCine}>Skip ✕ <kbd>Esc</kbd></button>
    </div>
  )
}
