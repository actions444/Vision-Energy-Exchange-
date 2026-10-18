import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../state/store.js'
import { useEnv } from '../state/environment.js'

// Lets the weather change on its own over time instead of staying on whatever an admin set it
// to - a real (if simplified) weather system: it drifts between states with realistic odds
// (mostly clear/cloudy, rain sometimes, storms and snow rarer) and never repeats the same state
// twice in a row. Single-player only: in multiplayer, weather is the room owner's call (see
// WorldPanels.jsx/net.sendEnv), so this director stands down there rather than fighting the
// owner's or server's broadcasts.
const WEIGHTS = { clear: 34, cloudy: 26, rain: 16, cold: 12, storm: 7, snow: 5 }
const KEYS = Object.keys(WEIGHTS)
const TOTAL = KEYS.reduce((a, k) => a + WEIGHTS[k], 0)

function pickNext(current) {
  for (let tries = 0; tries < 6; tries++) {
    let r = Math.random() * TOTAL
    let pick = KEYS[0]
    for (const k of KEYS) { if (r < WEIGHTS[k]) { pick = k; break }; r -= WEIGHTS[k] }
    if (pick !== current) return pick
  }
  return current
}

export default function WeatherDirector() {
  const timer = useRef(8 * 60 + Math.random() * 6 * 60) // first change after 8-14 real minutes
  useFrame((_, dt) => {
    if (useStore.getState().mode === 'multi') return // the room owner/server drives weather there
    timer.current -= Math.min(dt, 0.25)
    if (timer.current > 0) return
    const current = useEnv.getState().weather
    useEnv.getState().set({ weather: pickNext(current) })
    timer.current = 10 * 60 + Math.random() * 10 * 60 // next change in 10-20 real minutes
  })
  return null
}
