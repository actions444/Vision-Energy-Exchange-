import { useEffect, useRef } from 'react'
import { waterFx } from '../state/water.js'

/** A blue wash with a soft vignette while the camera is below a water surface (no React renders: one div, one rAF). */
export default function UnderwaterTint() {
  const ref = useRef()
  useEffect(() => {
    let raf, o = 0
    const tick = () => {
      o += ((waterFx.under ? 1 : 0) - o) * 0.2
      if (ref.current) { ref.current.style.opacity = o.toFixed(3); ref.current.style.display = o < 0.01 ? 'none' : 'block' }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div ref={ref} aria-hidden style={{ display: 'none', position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5, background: 'radial-gradient(ellipse at 50% 40%, rgba(20,150,170,0.30) 0%, rgba(8,90,130,0.55) 70%, rgba(4,50,90,0.72) 100%)', mixBlendMode: 'multiply' }} />
  )
}
