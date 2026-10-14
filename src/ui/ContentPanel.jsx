import { useState } from 'react'
import { Panel } from './UI.jsx'
import { findContent } from '../config/portfolio.js'
import { useStore } from '../state/store.js'
import { playDemoBeat, playFile, stopAudio, playVideoFile, stopVideo } from '../audio/audio.js'

// What a visitor sees after using a gallery kiosk. Content comes from config/portfolio.js.
export default function ContentPanel({ id }) {
  const c = findContent(id)
  const media = useStore((s) => s.media)
  const [err, setErr] = useState(null)
  const [copied, setCopied] = useState(null)
  if (!c) return null

  const onAudio = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setErr(null)
    try { await playFile(f) } catch { setErr('That file could not be played. Try an MP3, WAV or M4A.') }
    e.target.value = ''
  }
  const onVideo = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setErr(null)
    try {
      await playVideoFile(f)
      useStore.getState().showToast('Now playing on the big screen at the back of the gallery.')
    } catch (x) { setErr(x.message) }
    e.target.value = ''
  }
  const copy = async (text, i) => {
    try { await navigator.clipboard.writeText(text); setCopied(i) } catch { setCopied(null) }
  }

  return (
    <Panel title={c.title} eyebrow={c.spec}>
      <div className="content" style={{ '--c': c.color }}>
        <p className="lede-sm">{c.blurb}</p>

        {c.items && (
          <ul className="items">
            {c.items.map((it, i) => (
              <li key={i}>
                {it.kind === 'beat' && (
                  media.audio ? (
                    <><span>{media.audio.title}</span><button className="btn" onClick={stopAudio}>Stop</button></>
                  ) : (
                    <><span>{it.label}</span><button className="btn primary" onClick={playDemoBeat}>Play</button></>
                  )
                )}
                {it.kind === 'track' && (
                  <><span>{it.label}</span><label className="btn primary file">Choose audio<input id={'audio-' + id + i} type="file" accept="audio/*" onChange={onAudio} /></label></>
                )}
                {it.kind === 'video' && (
                  media.video ? (
                    <><span>Playing: {media.video.title}</span><button className="btn" onClick={stopVideo}>Stop</button></>
                  ) : (
                    <><span>{it.label}</span><label className="btn primary file">Choose video<input id={'video-' + id} type="file" accept="video/*" onChange={onVideo} /></label></>
                  )
                )}
                {!it.kind && <span className="example">{it.label}</span>}
              </li>
            ))}
          </ul>
        )}

        {c.tracks && (
          <>
            <ol className="tracks">
              {c.tracks.map(([n, t, d]) => (<li key={n}><span>{n}</span><b>{t}</b><span>{d}</span></li>))}
            </ol>
            <p className="hint">{c.note}</p>
          </>
        )}

        {c.socials && (
          <ul className="socials">
            {c.socials.map(([k, v], i) => (
              <li key={k}><b>{k}</b><span className="sel">{v}</span><button className="btn" onClick={() => copy(v, i)}>{copied === i ? 'Copied' : 'Copy'}</button></li>
            ))}
          </ul>
        )}
        {err && <p className="error">{err}</p>}
        <p className="hint">Files you play here stay on your device. Nothing is uploaded.</p>
      </div>
    </Panel>
  )
}
