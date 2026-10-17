import { useMemo } from 'react'
import * as THREE from 'three'
import { canvasTex, hash, mm, ledMat } from './kit.jsx'

// Original landscape paintings and a history timeline, drawn on canvas. Nothing here copies an existing artwork.

const W = 1024, H = 640
const grad = (g, y0, y1, stops) => { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(0, y0, W, y1 - y0) }
const ridge = (g, base, amp, seed, color, step = 16, f = 1) => {
  g.fillStyle = color; g.beginPath(); g.moveTo(0, H)
  for (let x = 0; x <= W + step; x += step) g.lineTo(x, base - (Math.sin(x * 0.011 * f + seed) * 0.5 + Math.sin(x * 0.029 * f + seed * 2.3) * 0.3 + hash(x + seed) * 0.2) * amp)
  g.lineTo(W, H); g.closePath(); g.fill()
}
const cloud = (g, x, y, s, a = 0.8) => { g.fillStyle = `rgba(255,255,255,${a})`; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(x + i * 26 * s - 60 * s, y + Math.sin(i * 1.7) * 7 * s, 42 * s, 17 * s, 0, 0, 7); g.fill() } }

export const PAINT = {
  canyon: () => canvasTex(W, H, (g) => {
    grad(g, 0, H, [[0, '#2c4a7a'], [0.35, '#e9a76b'], [0.55, '#f6d6a0']])
    g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(760, 190, 46, 0, 7); g.fill()
    cloud(g, 220, 120, 1.2, 0.5); cloud(g, 520, 90, 0.9, 0.4)
    const cols = ['#8e4a32', '#a85a38', '#c4693e', '#d98657', '#e8a06b']
    for (let k = 0; k < 5; k++) {
      ridge(g, 300 + k * 50, 70 - k * 6, k * 3.1, cols[k], 12, 1 + k * 0.3)
      g.strokeStyle = 'rgba(70,30,15,0.28)'; g.lineWidth = 1.5
      for (let s = 0; s < 4; s++) { g.beginPath(); g.moveTo(0, 330 + k * 50 + s * 14); for (let x = 0; x < W; x += 14) g.lineTo(x, 330 + k * 50 + s * 14 + Math.sin(x * 0.02 + k) * 3); g.stroke() }
    }
    grad(g, 545, H, [[0, '#2f5a6a'], [1, '#12313f']])
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(0, 570 + i * 9); g.bezierCurveTo(300, 560 + i * 9, 600, 590 + i * 9, W, 575 + i * 9); g.stroke() }
  }),
  prairie: () => canvasTex(W, H, (g) => {
    grad(g, 0, 380, [[0, '#4e86c4'], [1, '#cfe5f3']])
    cloud(g, 200, 110, 1.6); cloud(g, 640, 160, 1.3); cloud(g, 880, 80, 1)
    grad(g, 380, H, [[0, '#d8b04a'], [1, '#8f6b1e']])
    for (let r = 0; r < 14; r++) { g.strokeStyle = `rgba(${150 + r * 6},${110 + r * 4},40,0.5)`; g.lineWidth = 3 + r * 0.8; g.beginPath(); g.moveTo(0, 390 + r * 18 + (r * r) * 0.3); g.bezierCurveTo(300, 380 + r * 18, 700, 410 + r * 20, W, 390 + r * 18 + r * 2); g.stroke() }
    g.fillStyle = '#7b2f24'; g.fillRect(690, 318, 70, 52); g.fillStyle = '#4a1c16'; g.beginPath(); g.moveTo(682, 318); g.lineTo(725, 286); g.lineTo(768, 318); g.fill()
    g.strokeStyle = '#35291e'; g.lineWidth = 4; g.beginPath(); g.moveTo(300, 380); g.lineTo(300, 290); g.stroke(); g.fillStyle = '#35291e'
    for (let i = 0; i < 6; i++) { g.save(); g.translate(300, 290); g.rotate(i * 1.05 + 0.3); g.fillRect(-3, -48, 6, 48); g.restore() }
  }),
  lake: () => canvasTex(W, H, (g) => {
    grad(g, 0, 330, [[0, '#7aa6d6'], [1, '#e8d9c4']])
    ridge(g, 250, 150, 1.3, '#6c7f9c', 10, 1.4)
    g.fillStyle = 'rgba(255,255,255,0.9)'; for (let x = 120; x < 900; x += 140) { g.beginPath(); g.moveTo(x - 36, 180 + hash(x) * 40); g.lineTo(x, 120 + hash(x * 2) * 50); g.lineTo(x + 36, 180 + hash(x) * 40); g.fill() }
    ridge(g, 330, 70, 5, '#41604c', 10, 2)
    for (let x = 0; x < W; x += 20) { const h = 40 + hash(x) * 50; g.fillStyle = hash(x * 3) > 0.5 ? '#264735' : '#1f3b2c'; g.beginPath(); g.moveTo(x - 12, 340); g.lineTo(x, 340 - h); g.lineTo(x + 12, 340); g.fill() }
    grad(g, 340, H, [[0, '#3e6f8c'], [1, '#17384c']])
    g.save(); g.globalAlpha = 0.28; g.translate(0, 700); g.scale(1, -0.9); g.drawImage(g.canvas, 0, 40, W, 280, 0, 0, W, 280); g.restore()
    g.strokeStyle = 'rgba(255,255,255,0.18)'; for (let i = 0; i < 22; i++) { g.beginPath(); const y = 360 + i * 12; g.moveTo(40 + hash(i) * 200, y); g.lineTo(240 + hash(i * 2) * 600, y); g.stroke() }
  }),
  skyline: () => canvasTex(W, H, (g) => {
    grad(g, 0, H, [[0, '#14173d'], [0.45, '#b2487a'], [0.75, '#f4a259'], [1, '#f6d58e']])
    g.fillStyle = 'rgba(255,255,255,0.85)'; for (let i = 0; i < 60; i++) { g.fillRect(hash(i) * W, hash(i * 3) * 220, 2, 2) }
    for (let layer = 0; layer < 2; layer++) {
      let x = layer ? 10 : -20
      while (x < W) {
        const w = 40 + hash(x + layer) * 60, h = (layer ? 160 : 230) + hash(x * 2 + layer) * (layer ? 140 : 260)
        g.fillStyle = layer ? '#2a2a4a' : '#0f0f22'; g.fillRect(x, H - 90 - h, w, h + 90)
        g.fillStyle = layer ? 'rgba(255,226,140,0.5)' : 'rgba(255,210,120,0.85)'
        for (let wy = H - 80 - h; wy < H - 100; wy += 14) for (let wx = x + 5; wx < x + w - 8; wx += 11) if (hash(wx * 7 + wy) > 0.5) g.fillRect(wx, wy, 5, 7)
        x += w + 4
      }
    }
    g.fillStyle = '#0a0a16'; g.beginPath(); g.moveTo(480, H); g.lineTo(520, 150); g.lineTo(560, H); g.fill(); g.fillRect(515, 100, 10, 60)
    grad(g, H - 90, H, [[0, '#1a2650'], [1, '#0c1226']])
  }),
  coast: () => canvasTex(W, H, (g) => {
    grad(g, 0, 360, [[0, '#6a9ee0'], [1, '#f7efe0']])
    cloud(g, 700, 100, 1.5, 0.7); cloud(g, 180, 160, 1.1, 0.6)
    grad(g, 330, H, [[0, '#2c7fa0'], [1, '#0e3b52']])
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2
    for (let i = 0; i < 16; i++) { g.beginPath(); const y = 345 + i * 17; g.moveTo(0, y); for (let x = 0; x < W; x += 16) g.lineTo(x, y + Math.sin(x * 0.05 + i) * (3 + i * 0.4)); g.stroke() }
    g.fillStyle = '#4a4038'; g.beginPath(); g.moveTo(560, H); g.quadraticCurveTo(620, 330, 720, 340); g.quadraticCurveTo(840, 350, 880, H); g.fill()
    g.fillStyle = '#f4f1ea'; g.beginPath(); g.moveTo(690, 340); g.lineTo(710, 150); g.lineTo(750, 150); g.lineTo(770, 340); g.fill()
    g.fillStyle = '#c0392b'; for (const y of [190, 250, 310]) { g.beginPath(); g.moveTo(710 - (y - 150) * 0.12 + 20 * 0, y - 20); g.lineTo(750 + (y - 150) * 0.12, y - 20); g.lineTo(750 + (y - 120) * 0.12, y + 10); g.lineTo(710 - (y - 120) * 0.12, y + 10); g.fill() }
    g.fillStyle = '#2a2a2a'; g.fillRect(704, 128, 52, 26); g.fillStyle = '#ffe9a0'; g.fillRect(712, 134, 36, 14)
    g.strokeStyle = '#fff'; g.lineWidth = 3; for (const [x, y] of [[260, 120], [310, 90], [180, 190]]) { g.beginPath(); g.moveTo(x - 16, y); g.quadraticCurveTo(x - 8, y - 12, x, y); g.quadraticCurveTo(x + 8, y - 12, x + 16, y); g.stroke() }
  }),
}

/** A gilt-framed painting. Faces local +z. */
export function Painting({ kind, position, yaw = 0, size = [2.6, 1.625], light = true }) {
  const tex = useMemo(() => PAINT[kind](), [kind])
  const m = mm()
  const led = useMemo(() => ledMat('#fff0d0', 1.6), [])
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh material={m.brass}><boxGeometry args={[size[0] + 0.3, size[1] + 0.3, 0.09]} /></mesh>
      <mesh position={[0, 0, 0.046]} material={m.walnutSolid}><boxGeometry args={[size[0] + 0.1, size[1] + 0.1, 0.02]} /></mesh>
      <mesh position={[0, 0, 0.058]}><planeGeometry args={size} /><meshStandardMaterial map={tex} roughness={0.75} /></mesh>
      {light && <>
        <mesh position={[0, size[1] / 2 + 0.3, 0.2]} material={m.brass}><boxGeometry args={[Math.min(1.2, size[0] * 0.5), 0.05, 0.1]} /></mesh>
        <mesh position={[0, size[1] / 2 + 0.275, 0.2]} material={led}><boxGeometry args={[Math.min(1.1, size[0] * 0.46), 0.012, 0.06]} /></mesh>
        <mesh position={[0, size[1] / 2 + 0.2, 0.12]} material={m.brass}><boxGeometry args={[0.02, 0.2, 0.02]} /></mesh>
      </>}
    </group>
  )
}

const TIMELINE = [
  ['1776', 'Declaration of Independence'], ['1787', 'The Constitution is written'], ['1803', 'Louisiana Purchase'], ['1865', 'The 13th Amendment ends slavery'],
  ['1869', 'Transcontinental railroad completed'], ['1920', 'The 19th Amendment: women gain the vote'], ['1964', 'Civil Rights Act'], ['1969', 'Apollo 11 lands on the Moon'],
]
/** A long wall mural: eight dated milestones from American history. */
export function TimelineMural({ position, yaw = 0, width = 9, height = 1.7 }) {
  const tex = useMemo(() => canvasTex(2048, 380, (g, w, h) => {
    grad2(g, w, h)
    g.strokeStyle = '#cfa94e'; g.lineWidth = 6; g.beginPath(); g.moveTo(40, 150); g.lineTo(w - 40, 150); g.stroke()
    TIMELINE.forEach(([y, t], i) => {
      const x = 130 + i * ((w - 260) / (TIMELINE.length - 1))
      g.fillStyle = i % 2 ? '#a8322d' : '#1f2f5c'; g.beginPath(); g.arc(x, 150, 22, 0, 7); g.fill(); g.strokeStyle = '#cfa94e'; g.lineWidth = 4; g.stroke()
      g.fillStyle = '#1f2f5c'; g.textAlign = 'center'; g.font = '700 54px Georgia, serif'; g.fillText(y, x, i % 2 ? 250 : 100)
      g.fillStyle = '#3a3126'; g.font = '30px Georgia, serif'
      const words = t.split(' '); let line = '', yy = i % 2 ? 292 : 190
      const out = []; for (const wd of words) { const tt = line ? line + ' ' + wd : wd; if (g.measureText(tt).width > 230 && line) { out.push(line); line = wd } else line = tt } out.push(line)
      out.forEach((l, k) => g.fillText(l, x, yy + k * 34))
    })
    g.fillStyle = '#7a6a4a'; g.font = 'italic 26px Georgia, serif'; g.textAlign = 'left'; g.fillText('A TIMELINE OF AMERICA', 50, 358)
  }), [])
  const m = mm()
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh material={m.walnutSolid}><boxGeometry args={[width + 0.2, height + 0.2, 0.08]} /></mesh>
      <mesh position={[0, 0, 0.045]}><planeGeometry args={[width, height]} /><meshStandardMaterial map={tex} roughness={0.8} /></mesh>
    </group>
  )
}
function grad2(g, w, h) { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f6f0e0'); gr.addColorStop(1, '#e8dec5'); g.fillStyle = gr; g.fillRect(0, 0, w, h) }
