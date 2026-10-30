import { useEffect, useRef } from 'react'
import { playerState } from '../state/runtime.js'

/** Sprint stamina bar. Reads playerState every animation frame and hides itself when full. */
export default function StaminaBar() {
  const fill = useRef(null)
  const wrap = useRef(null)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const s = playerState.stamina ?? 100
      if (fill.current) fill.current.style.width = `${Math.round(s)}%`
      if (wrap.current) wrap.current.style.opacity = s >= 99.5 && !playerState.sprinting ? '0' : '1'
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div ref={wrap} id="stamina-bar" aria-label="Sprint stamina" style={{ position: 'fixed', left: '50%', bottom: 26, transform: 'translateX(-50%)', width: 180, height: 6, background: 'rgba(0,0,0,0.5)', borderRadius: 3, pointerEvents: 'none', transition: 'opacity 0.3s' }}>
      <div ref={fill} style={{ height: '100%', width: '100%', background: '#7fe3ff', borderRadius: 3 }} />
    </div>
  )
}
