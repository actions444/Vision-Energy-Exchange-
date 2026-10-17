import { useEffect, useRef } from 'react'
import { playerState } from '../state/runtime.js'
import { input } from '../input/input.js'

/**
 * Breath meter and swim controls hint, shown only in deep water. One div, one rAF (no React renders).
 * On touch screens it also offers Up and Dive buttons.
 */
export default function BreathBar() {
  const wrap = useRef(), fill = useRef(), label = useRef()
  const touch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  useEffect(() => {
    let raf
    const tick = () => {
      const on = playerState.swim === 'swim' && !playerState.climb
      if (wrap.current) {
        wrap.current.style.display = on ? 'flex' : 'none'
        if (on) {
          const b = playerState.breath
          fill.current.style.width = Math.round(b * 100) + '%'
          fill.current.style.background = b < 0.25 ? '#ff2e9a' : b < 0.55 ? '#ffe83d' : '#00e5d0'
          wrap.current.style.opacity = playerState.headUnder || b < 0.99 ? '1' : '0.7'
          label.current.textContent = b < 0.25 ? 'Out of breath: come up!' : playerState.headUnder ? 'Holding breath' : 'Swimming'
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  const hold = (prop) => ({
    onPointerDown: (e) => { e.stopPropagation(); input[prop] = true },
    onPointerUp: () => { input[prop] = false },
    onPointerCancel: () => { input[prop] = false },
    onPointerLeave: () => { input[prop] = false },
  })
  return (
    <div ref={wrap} style={{ display: 'none', position: 'fixed', left: '50%', bottom: touch ? 150 : 92, transform: 'translateX(-50%)', zIndex: 6, flexDirection: 'column', alignItems: 'center', gap: 6, pointerEvents: 'none', transition: 'opacity .3s' }}>
      <div style={{ width: 220, height: 10, borderRadius: 6, background: 'rgba(8,20,40,0.65)', border: '1px solid rgba(255,255,255,0.25)', overflow: 'hidden' }}>
        <div ref={fill} style={{ height: '100%', width: '100%', borderRadius: 6, transition: 'width .15s linear' }} />
      </div>
      <div ref={label} style={{ fontSize: 12, color: '#eaf9ff', textShadow: '0 1px 4px rgba(0,0,0,.6)', letterSpacing: '.04em' }} />
      <div style={{ fontSize: 11, color: 'rgba(234,249,255,.8)', textShadow: '0 1px 4px rgba(0,0,0,.6)' }}>{touch ? '' : 'Space: swim up · C: dive · Shift: swim fast'}</div>
      {touch && (
        <div style={{ display: 'flex', gap: 10, pointerEvents: 'auto' }}>
          <button className="tb" {...hold('up')}>Up</button>
          <button className="tb" {...hold('dive')}>Dive</button>
        </div>
      )}
    </div>
  )
}
