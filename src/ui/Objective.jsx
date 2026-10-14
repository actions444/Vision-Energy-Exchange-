// A short guided objective for new visitors: reach the Vision Cinema entrance, go inside, take a
// recliner. Each step checks the avatar's real position (twice a second), so it can't get stuck
// on a step the player has already done, and it skips ahead if the player is already further on.
// Progress is remembered per browser; Help has a button to start it again.
import { useEffect, useState } from 'react'
import { playerState } from '../state/runtime.js'
import { useMusic } from '../music/engine.js'
import { CINEMA } from '../world/Cinema.jsx'
import { CINEMA_FRONT } from '../world/CinemaExterior.jsx'

const KEY = 'vsee.objective'
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null } catch { return null } }
const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* private mode */ } }

export const OBJECTIVE_ENTRANCE = { x: CINEMA_FRONT.x + 1.6, z: CINEMA_FRONT.cz }
const inCinema = (p) => p.x > CINEMA.x0 && p.x < CINEMA.x1 && p.z > CINEMA.z0 && p.z < CINEMA.z1
const atEntrance = (p) => p.x > CINEMA_FRONT.x - 0.5 && p.x < CINEMA_FRONT.x + CINEMA_FRONT.depth + 2.5 && Math.abs(p.z - CINEMA_FRONT.cz) < CINEMA_FRONT.half + 1

export const STEPS = [
  { id: 'arrive', text: 'Arrive at the Cinema', hint: 'The Vision Cinema is on the left side of the avenue, under the gold marquee.', done: (p) => atEntrance(p) || inCinema(p) },
  { id: 'enter', text: 'Go inside the Vision Cinema', hint: 'Open the glass doors under the marquee.', done: (p, zone) => inCinema(p) || zone === 'cinema' || zone?.startsWith('cinema-') },
  { id: 'seat', text: 'Take a recliner in Auditorium 1 or 2', hint: 'Walk up to a recliner and press E (or tap) to sit.', done: (p, zone) => !!playerState.seated && !!zone?.startsWith('cinema-') },
]

/** Restart the guide (Help panel). */
export function restartObjective() { write({ step: 0 }); window.dispatchEvent(new Event('vsee-objective')) }

export default function Objective() {
  const [state, setState] = useState(() => read() || { step: 0 })
  const [flash, setFlash] = useState(null)
  const [, tick] = useState(0)
  useEffect(() => {
    const reload = () => setState(read() || { step: 0 })
    window.addEventListener('vsee-objective', reload)
    return () => window.removeEventListener('vsee-objective', reload)
  }, [])
  useEffect(() => {
    if (state.hidden || state.step >= STEPS.length) return
    const t = setInterval(() => {
      const p = playerState.position, zone = useMusic.getState().zoneId
      // advance past every step that is already satisfied (e.g. the player drove straight inside)
      let s = state.step
      while (s < STEPS.length && STEPS[s].done(p, zone)) s++
      // a later step being true also completes the earlier ones
      for (let k = STEPS.length - 1; k > s; k--) if (STEPS[k].done(p, zone)) { s = k + 1; break }
      if (s === 0) tick((n) => n + 1) // keep the distance readout fresh
      if (s !== state.step) {
        const next = { ...state, step: s }
        write(next); setState(next)
        setFlash(STEPS[s - 1].text)
        setTimeout(() => setFlash(null), 3500)
      }
    }, 500)
    return () => clearInterval(t)
  }, [state])

  if (state.hidden) return null
  const done = state.step >= STEPS.length
  if (done && !flash) return null
  const step = STEPS[Math.min(state.step, STEPS.length - 1)]
  const dist = !done && step.id === 'arrive' ? Math.round(Math.hypot(playerState.position.x - OBJECTIVE_ENTRANCE.x, playerState.position.z - OBJECTIVE_ENTRANCE.z)) : null
  return (
    <div className="objective" role="status" aria-live="polite" id="objective">
      <small>Objective {done ? 'complete' : `${state.step + 1} of ${STEPS.length}`}</small>
      {flash && <b className="objective-done">✓ {flash}</b>}
      {!done && <b id="objective-text">{step.text}</b>}
      {!done && <span>{step.hint}{dist != null ? ` About ${dist} m away.` : ''}</span>}
      {done && <span>Enjoy the show. Open “Screen &amp; sound” to start a movie.</span>}
      {!done && <button className="linkish" onClick={() => { const n = { ...state, hidden: true }; write(n); setState(n) }}>Hide</button>}
    </div>
  )
}
