import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { getMaterials, surface, signatureMarble } from './materials.js'
import { env, registerLightAnchor, useEnv, WEATHER, formatTime } from '../state/environment.js'
import { registerLoad, switchedMaterial, zoneLit, useLights, zoneName, ZONES } from '../state/power.js'
import { registerScreen, guideSurface, programFor } from '../guide/guide.js'
import { registerInteractable } from '../state/runtime.js'
import { useStore } from '../state/store.js'
import { useSeats } from '../state/seats.js'
import { useMusic } from '../music/engine.js'
import { screenVideo } from '../audio/audio.js'
import { FONTS } from '../config/theme.js'

// Room fittings: glazed windows that look out onto the real world outside, wall TVs that play
// actual channels, light switches by the door, and full bathrooms (toilet, vanity, mirror,
// walk-in shower, jacuzzi). Everything switchable is wired to the power meter.

const GOLD = '#c9a96a'
const mc = new Map()
const solid = (color, roughness = 0.6, metalness = 0) => {
  const k = `${color}|${roughness}|${metalness}`
  if (!mc.has(k)) mc.set(k, new THREE.MeshStandardMaterial({ color, roughness, metalness }))
  return mc.get(k)
}
const shared = (k, make) => { if (!mc.has(k)) mc.set(k, make()); return mc.get(k) }
const chromeM = () => shared('i-chrome', () => new THREE.MeshStandardMaterial({ color: '#dcdfe3', roughness: 0.1, metalness: 1, envMapIntensity: 1.6 }))
const porcelain = () => shared('i-porcelain', () => new THREE.MeshPhysicalMaterial({ color: '#f7f8f8', roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.1 }))
const clearGlass = () => shared('i-glass', () => new THREE.MeshPhysicalMaterial({ color: '#dfeaf2', roughness: 0.02, metalness: 0, transparent: true, opacity: 0.17, envMapIntensity: 2, depthWrite: false }))
const mirrorM = () => shared('i-mirror', () => new THREE.MeshStandardMaterial({ color: '#eef3f7', roughness: 0.02, metalness: 1, envMapIntensity: 2.4 }))
const waterM = () => shared('i-water', () => new THREE.MeshPhysicalMaterial({ color: '#9fd8e4', roughness: 0.06, metalness: 0, transparent: true, opacity: 0.74, envMapIntensity: 1.6 }))
const bronze = () => shared('i-bronze', () => new THREE.MeshStandardMaterial({ color: '#4a4036', roughness: 0.42, metalness: 0.85 }))

function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }
function cv(w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  draw(c.getContext('2d'), w, h)
  return c
}

// ============================================================ windows

// The view through a window: a day plate and a night plate, cross-faded by the day/night cycle.
// Drawn once per kind, shared by every window that looks the same way.
function viewPlate(kind, night) {
  return cv(512, 384, (ctx, w, h) => {
    const hz = h * 0.56 // horizon
    const sky = ctx.createLinearGradient(0, 0, 0, hz)
    if (night) { sky.addColorStop(0, '#060a14'); sky.addColorStop(0.7, '#101c33'); sky.addColorStop(1, '#2b3048') }
    else if (kind === 'ocean') { sky.addColorStop(0, '#5d9fd4'); sky.addColorStop(0.75, '#bcd9ea'); sky.addColorStop(1, '#e4eef3') }
    else { sky.addColorStop(0, '#6ea4d8'); sky.addColorStop(0.72, '#bdd6e8'); sky.addColorStop(1, '#e6eef2') }
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, hz)
    if (night) {
      for (let i = 0; i < 220; i++) {
        const v = hash(i * 3.3)
        ctx.fillStyle = `rgba(255,255,255,${0.15 + v * 0.6})`
        ctx.fillRect(hash(i) * w, hash(i + 77) * hz * 0.8, 1 + (v > 0.93 ? 1 : 0), 1 + (v > 0.93 ? 1 : 0))
      }
      // moon
      const g = ctx.createRadialGradient(w * 0.78, hz * 0.22, 2, w * 0.78, hz * 0.22, 46)
      g.addColorStop(0, 'rgba(255,255,245,0.95)'); g.addColorStop(0.18, 'rgba(226,235,255,0.5)'); g.addColorStop(1, 'rgba(180,200,255,0)')
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(w * 0.78, hz * 0.22, 46, 0, 7); ctx.fill()
      ctx.fillStyle = '#f2f4ea'; ctx.beginPath(); ctx.arc(w * 0.78, hz * 0.22, 9, 0, 7); ctx.fill()
    } else {
      // soft clouds
      for (let i = 0; i < 26; i++) {
        const x = hash(i * 7.1) * w, y = hash(i * 3.7) * hz * 0.7, r = 16 + hash(i * 11) * 40
        const g = ctx.createRadialGradient(x, y, 1, x, y, r)
        g.addColorStop(0, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill()
      }
    }

    if (kind === 'ocean') {
      const sea = ctx.createLinearGradient(0, hz, 0, h)
      if (night) { sea.addColorStop(0, '#0d1a2a'); sea.addColorStop(1, '#05101c') }
      else { sea.addColorStop(0, '#2f7f9b'); sea.addColorStop(1, '#17576f') }
      ctx.fillStyle = sea; ctx.fillRect(0, hz, w, h - hz)
      ctx.strokeStyle = night ? 'rgba(170,200,255,0.3)' : 'rgba(255,255,255,0.45)'
      for (let i = 0; i < 90; i++) {
        const y = hz + hash(i * 5) * (h - hz), len = 6 + hash(i * 9) * 26
        ctx.lineWidth = 1 + hash(i * 2) * 1.2
        ctx.beginPath(); ctx.moveTo(hash(i * 13) * w, y); ctx.lineTo(hash(i * 13) * w + len, y); ctx.stroke()
      }
      // green headland + palms
      ctx.fillStyle = night ? '#09150e' : '#2f5b2a'
      ctx.beginPath(); ctx.moveTo(0, hz)
      ctx.bezierCurveTo(w * 0.1, hz - 54, w * 0.2, hz - 30, w * 0.3, hz); ctx.lineTo(0, hz); ctx.fill()
      if (night) { const g2 = ctx.createRadialGradient(w * 0.15, hz, 2, w * 0.15, hz, 70); g2.addColorStop(0, 'rgba(255,200,120,0.5)'); g2.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = g2; ctx.fillRect(0, hz - 70, w * 0.4, 90) }
    } else {
      // distant skyline
      const towers = 22
      for (let i = 0; i < towers; i++) {
        const tw = 16 + hash(i * 17) * 34
        const x = (i / towers) * (w + 40) - 20 + hash(i) * 8
        const th = 30 + hash(i * 5.5) * (kind === 'garden' ? 70 : 150)
        const far = hash(i * 3) > 0.55
        ctx.fillStyle = night ? (far ? '#0c1322' : '#131b2c') : (far ? '#9db6cc' : '#7e99b2')
        ctx.fillRect(x, hz - th, tw, th)
        if (night) {
          for (let r = 0; r < Math.floor(th / 9); r++) for (let c = 0; c < Math.floor(tw / 7); c++) {
            if (hash(i * 31 + r * 7 + c) < 0.45) continue
            ctx.fillStyle = hash(i + r * 3 + c) > 0.82 ? 'rgba(190,225,255,0.95)' : 'rgba(255,214,140,0.9)'
            ctx.fillRect(x + 2 + c * 7, hz - th + 3 + r * 9, 3.4, 4.6)
          }
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.14)'
          ctx.fillRect(x, hz - th, tw * 0.35, th)
        }
      }
      // ground: lawn and treeline
      ctx.fillStyle = night ? '#0a1410' : '#4e7230'
      ctx.fillRect(0, hz, w, h - hz)
      for (let i = 0; i < 34; i++) {
        const x = hash(i * 23) * w, r = 18 + hash(i * 7) * 24
        ctx.fillStyle = night ? '#07100b' : `hsl(${96 + hash(i) * 20}, 34%, ${16 + hash(i * 3) * 12}%)`
        ctx.beginPath(); ctx.arc(x, hz + 6 + hash(i * 5) * 10, r, Math.PI, 0); ctx.fill()
        ctx.fillStyle = night ? '#060c08' : '#4a3a28'
        ctx.fillRect(x - 2, hz + 6, 4, 16)
      }
      // flower drifts in the beds below
      for (let i = 0; i < 160; i++) {
        const y = hz + 26 + hash(i * 3.1) * (h - hz - 26)
        ctx.fillStyle = night ? 'rgba(60,80,60,0.5)' : ['#e0559f', '#9b4fe0', '#2fd0c4', '#f2c230', '#fbfbf5'][Math.floor(hash(i * 9) * 5)]
        ctx.beginPath(); ctx.arc(hash(i * 5.7) * w, y, 1.6 + hash(i) * 2.2, 0, 7); ctx.fill()
      }
      if (night) {
        // lamp pools along the path
        for (const px of [0.18, 0.46, 0.74]) {
          const g = ctx.createRadialGradient(px * w, hz + 46, 2, px * w, hz + 46, 64)
          g.addColorStop(0, 'rgba(255,206,140,0.55)'); g.addColorStop(1, 'rgba(255,206,140,0)')
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px * w, hz + 46, 64, 0, 7); ctx.fill()
        }
      }
    }
    // haze at the horizon ties the plates together
    const hazeC = night ? '43,54,84' : '214,230,240'
    const haze = ctx.createLinearGradient(0, hz - 40, 0, hz + 16)
    haze.addColorStop(0, `rgba(${hazeC},0)`); haze.addColorStop(0.72, `rgba(${hazeC},0.55)`); haze.addColorStop(1, `rgba(${hazeC},0)`)
    ctx.fillStyle = haze; ctx.fillRect(0, hz - 40, w, 56)
  })
}

const viewMats = new Set()
const viewCache = new Map()
function viewMaterial(kind) {
  if (viewCache.has(kind)) return viewCache.get(kind)
  const mk = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t }
  const m = new THREE.ShaderMaterial({
    uniforms: { uDay: { value: mk(viewPlate(kind, false)) }, uNight: { value: mk(viewPlate(kind, true)) }, uN: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform sampler2D uDay; uniform sampler2D uNight; uniform float uN; varying vec2 vUv; void main(){ gl_FragColor = mix(texture2D(uDay,vUv), texture2D(uNight,vUv), uN); }',
  })
  viewMats.add(m)
  viewCache.set(kind, m)
  return m
}
/** Cross-fade every window view with the sky. Called once per frame from Atmosphere. */
export function updateWindowViews() {
  for (const m of viewMats) m.uniforms.uN.value = env.night
}

/**
 * A glazed window set into the inner face of an exterior wall, with a stone sill, bronze
 * mullions and a real view outside (city skyline, gardens or the ocean) that turns to city
 * lights after dark. `position` is the point on the wall; local +z faces into the room.
 */
export function Window({ position, yaw = 0, width = 3.2, height = 2.1, sill = 0.95, view = 'city', drapes = false, drapeColor = '#4a2f52' }) {
  const panes = Math.max(1, Math.round(width / 1.1))
  const cy = sill + height / 2
  const frame = bronze()
  const stone = getMaterials().marbleWall(0.6, 0.2)
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* the view, then glass, then the frame, stacked just inside the wall */}
      <mesh position={[0, cy, 0.012]} material={viewMaterial(view)}><planeGeometry args={[width, height]} /></mesh>
      <mesh position={[0, cy, 0.05]} material={clearGlass()}><planeGeometry args={[width, height]} /></mesh>
      {/* mullions */}
      {Array.from({ length: panes - 1 }, (_, i) => (
        <mesh key={i} position={[-width / 2 + (i + 1) * (width / panes), cy, 0.06]} material={frame}><boxGeometry args={[0.05, height, 0.07]} /></mesh>
      ))}
      <mesh position={[0, cy, 0.06]} material={frame}><boxGeometry args={[width, 0.06, 0.07]} /></mesh>
      {/* outer frame */}
      {[[0, cy + height / 2 + 0.05, width + 0.2, 0.1], [0, cy - height / 2 - 0.05, width + 0.2, 0.1]].map(([x, y, sx, sy], i) => (
        <mesh key={'h' + i} position={[x, y, 0.06]} material={frame}><boxGeometry args={[sx, sy, 0.09]} /></mesh>
      ))}
      {[-1, 1].map((k) => <mesh key={k} position={[k * (width / 2 + 0.05), cy, 0.06]} material={frame}><boxGeometry args={[0.1, height + 0.2, 0.09]} /></mesh>)}
      {/* stone sill */}
      <mesh position={[0, sill - 0.08, 0.14]} material={stone} castShadow receiveShadow><boxGeometry args={[width + 0.34, 0.09, 0.3]} /></mesh>
      {drapes && (
        <>
          <mesh position={[0, cy + height / 2 + 0.22, 0.16]} material={solid(drapeColor, 0.95)} castShadow><boxGeometry args={[width + 0.5, 0.26, 0.12]} /></mesh>
          {[-1, 1].map((k) => (
            <mesh key={k} position={[k * (width / 2 + 0.02), cy - 0.1, 0.17]} material={solid(drapeColor, 0.95)} castShadow>
              <boxGeometry args={[0.52, height + 0.5, 0.1]} />
            </mesh>
          ))}
        </>
      )}
    </group>
  )
}

// ============================================================ working TVs

const TICKER = [
  'VSE CREDITS 100 = US$1.00', 'PLAZA OCCUPANCY 82%', 'STUDIO 202 BOOKED THROUGH FRIDAY',
  'NEW ON RECORDS: 14 UNRELEASED TRACKS', 'CINEMA: DOORS OPEN 6PM', 'SKYLINE SUITE AVAILABLE NIGHTLY',
  'ENERGY EXCHANGE OPENS 09:00', 'TROPICAL PARADISE ROUTE IN TESTING',
]
const CH_W = 640, CH_H = 360

function chanBase(ctx, w, h, top, bottom) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, top); g.addColorStop(1, bottom)
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
}
function chanBrand(ctx, w, h, label, accent = GOLD) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, h - 46, w, 46)
  ctx.fillStyle = accent; ctx.fillRect(0, h - 46, 6, 46)
  ctx.fillStyle = accent; ctx.font = `700 15px ${FONTS.mono}`; ctx.textAlign = 'left'
  ctx.fillText(label.toUpperCase(), 18, h - 26)
}

const CHANNELS = [
  {
    id: 'news', name: 'VSE News',
    draw(ctx, w, h, t) {
      chanBase(ctx, w, h, '#101728', '#1d2740')
      ctx.fillStyle = '#e0559f'; ctx.fillRect(0, 0, w, 5)
      ctx.textAlign = 'left'
      ctx.fillStyle = '#f4f1ea'; ctx.font = `800 40px ${FONTS.display}`
      ctx.fillText('VISION STORMS', 26, 74)
      ctx.fillStyle = GOLD; ctx.font = `600 20px ${FONTS.mono}`
      ctx.fillText('ENERGY EXCHANGES · LIVE', 26, 104)
      // anchor desk silhouette
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(w * 0.58, 120, w * 0.38, 150)
      ctx.fillStyle = '#2f3a52'; ctx.beginPath(); ctx.arc(w * 0.77, 210, 34, 0, 7); ctx.fill()
      ctx.fillRect(w * 0.77 - 46, 244, 92, 60)
      ctx.fillStyle = '#9fb0bf'; ctx.font = `500 17px ${FONTS.body || FONTS.mono}`
      const lines = ['Plaza rentals steady this quarter', 'Studio 202 fully booked', 'Cinema adds a late screening']
      lines.forEach((s, i) => ctx.fillText('— ' + s, 26, 160 + i * 30))
      // ticker
      const txt = TICKER.join('   ·   ') + '   ·   '
      ctx.fillStyle = '#0b0e16'; ctx.fillRect(0, h - 46, w, 46)
      ctx.fillStyle = '#e0559f'; ctx.fillRect(0, h - 46, w, 3)
      ctx.font = `600 18px ${FONTS.mono}`; ctx.fillStyle = '#f4f1ea'
      ctx.save(); ctx.beginPath(); ctx.rect(0, h - 44, w, 44); ctx.clip()
      const tw = ctx.measureText(txt).width
      const off = -((t * 70) % tw)
      ctx.fillText(txt, off, h - 16); ctx.fillText(txt, off + tw, h - 16)
      ctx.restore()
    },
  },
  {
    id: 'records', name: 'Storms Records',
    draw(ctx, w, h, t) {
      chanBase(ctx, w, h, '#1a0f22', '#2b1636')
      const m = useMusic.getState()
      const title = m.track?.title || 'Vision Storms Records'
      const artist = m.track?.artist || (m.playlistName ? m.playlistName : 'Select a track in the Records Room')
      // sleeve
      const s = 150, sx = 40, sy = h / 2 - s / 2 - 10
      const g = ctx.createLinearGradient(sx, sy, sx + s, sy + s)
      g.addColorStop(0, '#e0559f'); g.addColorStop(0.5, '#9b4fe0'); g.addColorStop(1, '#2fd0c4')
      ctx.fillStyle = g; ctx.fillRect(sx, sy, s, s)
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.arc(sx + s / 2, sy + s / 2, 44, 0, 7); ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1
      for (let r = 12; r < 44; r += 5) { ctx.beginPath(); ctx.arc(sx + s / 2, sy + s / 2, r, 0, 7); ctx.stroke() }
      ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(sx + s / 2, sy + s / 2, 7, 0, 7); ctx.fill()
      ctx.textAlign = 'left'
      ctx.fillStyle = '#f4f1ea'; ctx.font = `800 30px ${FONTS.display}`
      ctx.fillText(title.slice(0, 22), sx + s + 28, sy + 56)
      ctx.fillStyle = '#c9b6d8'; ctx.font = `500 19px ${FONTS.mono}`
      ctx.fillText(artist.slice(0, 28), sx + s + 28, sy + 86)
      // VU bars react to the clock when something is playing
      const live = m.status === 'playing'
      for (let i = 0; i < 24; i++) {
        const a = live ? (0.3 + 0.7 * Math.abs(Math.sin(t * 3.1 + i * 0.7) * Math.cos(t * 1.7 + i))) : 0.06
        const bh = 6 + a * 64
        ctx.fillStyle = ['#e0559f', '#9b4fe0', '#2fd0c4'][i % 3]
        ctx.fillRect(sx + s + 28 + i * 13, sy + 150 - bh, 8, bh)
      }
      chanBrand(ctx, w, h, live ? 'Now playing · Storms Records' : 'Storms Records · idle', '#e0559f')
    },
  },
  {
    id: 'exchange', name: 'Energy Exchange',
    draw(ctx, w, h, t) {
      chanBase(ctx, w, h, '#06131a', '#0b2029')
      ctx.textAlign = 'left'
      ctx.fillStyle = '#2fd0c4'; ctx.font = `700 17px ${FONTS.mono}`
      ctx.fillText('ENERGY EXCHANGE · SPOT', 24, 36)
      // moving line chart
      const x0 = 24, y0 = 60, cw = w - 48, ch = 190
      ctx.strokeStyle = 'rgba(47,208,196,0.16)'; ctx.lineWidth = 1
      for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(x0, y0 + (i / 4) * ch); ctx.lineTo(x0 + cw, y0 + (i / 4) * ch); ctx.stroke() }
      const val = (i) => 0.5 + 0.28 * Math.sin(i * 0.21 + t * 0.5) + 0.14 * Math.sin(i * 0.77 + t * 0.9) + 0.07 * Math.sin(i * 2.3)
      ctx.beginPath()
      for (let i = 0; i <= 60; i++) ctx[i ? 'lineTo' : 'moveTo'](x0 + (i / 60) * cw, y0 + ch - val(i) * ch)
      ctx.strokeStyle = '#2fd0c4'; ctx.lineWidth = 2.5; ctx.stroke()
      ctx.lineTo(x0 + cw, y0 + ch); ctx.lineTo(x0, y0 + ch); ctx.closePath()
      ctx.fillStyle = 'rgba(47,208,196,0.14)'; ctx.fill()
      const last = val(60)
      ctx.fillStyle = '#f4f1ea'; ctx.font = `800 34px ${FONTS.display}`
      ctx.fillText('$' + (0.14 + last * 0.12).toFixed(4) + ' /kWh', 24, y0 + ch + 48)
      ctx.fillStyle = last > 0.5 ? '#5fd38a' : '#e06a6a'; ctx.font = `600 18px ${FONTS.mono}`
      ctx.fillText((last > 0.5 ? '▲ ' : '▼ ') + ((last - 0.5) * 24).toFixed(2) + '%', 300, y0 + ch + 48)
      chanBrand(ctx, w, h, 'Vision Storms Energy Exchange', '#2fd0c4')
    },
  },
  {
    id: 'weather', name: 'Vision Weather',
    draw(ctx, w, h, t) {
      const E = useEnv.getState()
      const night = env.night > 0.5
      chanBase(ctx, w, h, night ? '#0a1020' : '#2d6ea8', night ? '#16233c' : '#8fc0dd')
      ctx.textAlign = 'left'
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = `700 17px ${FONTS.mono}`
      ctx.fillText('VISION WEATHER · DOWNTOWN', 24, 36)
      ctx.font = `800 76px ${FONTS.display}`
      ctx.fillStyle = '#ffffff'
      const temp = Math.round(13 + 12 * Math.max(0, Math.sin(((E.time - 6) / 12) * Math.PI)) + (WEATHER[E.weather]?.tempOffset || 0))
      ctx.fillText(temp + '°', 24, 130)
      ctx.font = `600 26px ${FONTS.display}`
      ctx.fillText(WEATHER[E.weather]?.label || 'Clear', 24, 172)
      ctx.font = `500 20px ${FONTS.mono}`
      ctx.fillText(formatTime(E.time), 24, 206)
      // animated glyph
      const gx = w - 150, gy = 120
      const clearLike = E.weather === 'clear' || E.weather === 'cold'
      if (clearLike && !night) {
        const r = 44 + Math.sin(t * 1.5) * 2
        const g = ctx.createRadialGradient(gx, gy, 4, gx, gy, r * 1.7)
        if (E.weather === 'cold') { g.addColorStop(0, '#eaf6ff'); g.addColorStop(0.4, 'rgba(170,210,255,0.6)'); g.addColorStop(1, 'rgba(170,210,255,0)') }
        else { g.addColorStop(0, '#fff6c0'); g.addColorStop(0.4, 'rgba(255,214,120,0.7)'); g.addColorStop(1, 'rgba(255,214,120,0)') }
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, r * 1.7, 0, 7); ctx.fill()
      } else if (night && clearLike) {
        ctx.fillStyle = '#e8ecf6'; ctx.beginPath(); ctx.arc(gx, gy, 38, 0, 7); ctx.fill()
        ctx.fillStyle = night ? '#16233c' : '#8fc0dd'; ctx.beginPath(); ctx.arc(gx + 16, gy - 10, 34, 0, 7); ctx.fill()
      } else if (E.weather === 'snow') {
        ctx.fillStyle = 'rgba(236,242,248,0.95)'
        for (const [ox, oy, r] of [[-26, 0, 26], [4, -10, 32], [30, 4, 22]]) { ctx.beginPath(); ctx.arc(gx + ox, gy + oy, r, 0, 7); ctx.fill() }
        ctx.fillStyle = 'rgba(255,255,255,0.95)'
        for (let i = 0; i < 10; i++) {
          const x = gx - 34 + i * 7.2, y = gy + 32 + ((t * 60 + i * 41) % 66)
          ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill()
        }
      } else {
        ctx.fillStyle = 'rgba(230,236,244,0.95)'
        for (const [ox, oy, r] of [[-26, 0, 26], [4, -10, 32], [30, 4, 22]]) { ctx.beginPath(); ctx.arc(gx + ox, gy + oy, r, 0, 7); ctx.fill() }
        if (WEATHER[E.weather]?.rain) {
          ctx.strokeStyle = 'rgba(190,220,255,0.9)'; ctx.lineWidth = 2
          for (let i = 0; i < 14; i++) {
            const x = gx - 34 + i * 5.4, y = gy + 34 + ((t * 170 + i * 37) % 70)
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 12); ctx.stroke()
          }
        }
      }
      chanBrand(ctx, w, h, 'Live from the Plaza roof', '#9b4fe0')
    },
  },
]

for (const c of CHANNELS) {
  c.canvas = null
  c.last = -1
}
function channelTexture(ch) {
  if (!ch.canvas) {
    ch.canvas = cv(CH_W, CH_H, () => {})
    ch.ctx = ch.canvas.getContext('2d')
    ch.tex = new THREE.CanvasTexture(ch.canvas)
    ch.tex.colorSpace = THREE.SRGBColorSpace
  }
  return ch.tex
}
/** Redraw a channel at ~11fps, shared by every TV tuned to it. */
function drawChannel(ch, t) {
  channelTexture(ch)
  if (t - ch.last < 0.09) return
  ch.last = t
  ch.draw(ch.ctx, CH_W, CH_H, t)
  ch.tex.needsUpdate = true
}

/**
 * A wall-mounted TV that really plays something: four built-in channels (news with a live
 * ticker, Storms Records with the track that is actually playing, the Energy Exchange spot
 * price, and live weather from the day/night cycle) plus the visitor's own video when one is
 * open in the media library. Walk up to it to switch it on and change channel; it draws 140W
 * while it is on, and goes dark when the room's lights are switched off at the wall.
 */
export function TV({ position, yaw = 0, size = [1.9, 1.07], id, zone, channel = 0, on: on0 = true, soundbar = true, name, venue }) {
  const [on, setOn] = useState(on0)
  const [ch, setCh] = useState(channel)
  const [guideOn, setGuideOn] = useState(true) // follow the TV guide while a scheduled programme is airing
  const grp = useRef()
  const [vid, setVid] = useState(() => !!screenVideo.el)
  const screen = useRef()
  const key = id || `${position[0].toFixed(1)}:${position[2].toFixed(1)}`
  const sid = key.startsWith('tv-') ? key : 'tv-' + key
  const live = useRef({})
  live.current = { on, guideOn }
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), [])
  const offMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0a0b0d', roughness: 0.12, metalness: 0.5 }), [])
  const standby = useMemo(() => switchedMaterial(new THREE.MeshStandardMaterial({ color: '#111', emissive: '#ff5a4a', emissiveIntensity: 1.4 }), zone, 1.4, 1.4), [zone])

  // the visitor's video (from the media library) takes over channel 0 when one is playing
  useEffect(() => {
    let vt = null
    const sync = (v) => {
      vt?.dispose(); vt = null
      setVid(!!v)
      if (v) { vt = new THREE.VideoTexture(v); vt.colorSpace = THREE.SRGBColorSpace }
      mat.userData.video = vt
    }
    screenVideo.listeners.add(sync)
    if (screenVideo.el) sync(screenVideo.el)
    return () => { screenVideo.listeners.delete(sync); vt?.dispose() }
  }, [mat])

  const lit = () => on && zoneLit(zone)
  // every TV is on the guide: the owner can schedule music videos and movies onto it
  useEffect(() => {
    const z = ZONES.find((x) => x.id === zone)
    return registerScreen({ id: sid, name: name || `${zoneName(zone)} TV`, venue: venue || z?.group || 'World', obj: grp.current, active: () => live.current.on && live.current.guideOn && zoneLit(zone) })
  }, [sid, zone, name, venue])
  useEffect(() => registerLoad({ zone, watts: () => (on ? 140 : 0.5) }), [zone, on])
  useEffect(() => registerInteractable('tv-' + key, {
    position: new THREE.Vector3(position[0] - Math.sin(yaw) * 0.9, position[1], position[2] - Math.cos(yaw) * 0.9),
    radius: 2,
    label: () => {
      if (!zoneLit(zone)) return `TV · ${zoneName(zone)} lights are off`
      if (!on) return 'Turn on the TV'
      const prog = guideOn ? programFor(sid) : null
      if (prog) return `TV · ${prog.media.title} (TV guide) — change channel`
      return `TV · ${mat.userData.video ? 'Your video' : CHANNELS[ch].name} — next channel`
    },
    onInteract: () => {
      if (!zoneLit(zone)) { useStore.getState().showToast('No power in this room — switch the lights on first'); return }
      if (!on) { setOn(true); setGuideOn(true); useStore.getState().showToast(programFor(sid) ? `TV on · ${programFor(sid).media.title}` : `TV on · ${CHANNELS[ch].name}`); return }
      if (guideOn && programFor(sid)) { setGuideOn(false); useStore.getState().showToast(CHANNELS[ch].name); return }
      const next = (ch + 1) % (CHANNELS.length + 1)
      if (next === CHANNELS.length) { setOn(false); useStore.getState().showToast('TV off'); setCh(0) }
      else { setCh(next); useStore.getState().showToast(CHANNELS[next].name) }
    },
  }), [key, sid, position[0], position[1], position[2], yaw, on, ch, zone, mat, guideOn])

  useFrame((st) => {
    const m = screen.current
    if (!m) return
    if (!lit()) { m.material = offMat; return }
    const gs = live.current.guideOn ? guideSurface(sid) : null
    if (gs) { m.material = gs; return }
    m.material = mat
    const v = mat.userData.video
    if (v) { if (mat.map !== v) { mat.map = v; mat.needsUpdate = true } return }
    const c = CHANNELS[ch]
    drawChannel(c, st.clock.elapsedTime)
    if (mat.map !== c.tex) { mat.map = c.tex; mat.needsUpdate = true }
  })

  const [w, h] = size
  return (
    <group ref={grp} position={position} rotation={[0, yaw, 0]} userData={{ noBatch: true }}>
      {/* bracket + bezel */}
      <mesh position={[0, 0, 0.02]} material={solid('#15161a', 0.5, 0.3)}><boxGeometry args={[w + 0.06, h + 0.06, 0.05]} /></mesh>
      <mesh position={[0, 0, 0.001]} material={solid('#0c0d10', 0.6, 0.2)}><boxGeometry args={[0.5, 0.3, 0.04]} /></mesh>
      <mesh ref={screen} position={[0, 0, 0.049]} material={offMat}><planeGeometry args={[w - 0.04, h - 0.04]} /></mesh>
      <mesh position={[w / 2 - 0.1, -h / 2 - 0.045, 0.045]} material={standby}><boxGeometry args={[0.035, 0.012, 0.01]} /></mesh>
      {soundbar && (
        <group position={[0, -h / 2 - 0.22, 0.06]}>
          <mesh material={solid('#1a1b1f', 0.7)} castShadow><boxGeometry args={[w * 0.8, 0.1, 0.09]} /></mesh>
          <mesh position={[0, 0, 0.05]} material={solid('#2a2c31', 0.9)}><boxGeometry args={[w * 0.78, 0.07, 0.01]} /></mesh>
        </group>
      )}
    </group>
  )
}

// ============================================================ light switch

/**
 * A wall switch. Flips its zone's lights and tells you what the room is drawing; this is what
 * keeps the power bill down overnight.
 */
export function LightSwitch({ position, yaw = 0, zone }) {
  const off = useLights((s) => s.off.includes(zone) || !s.master)
  const plate = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e9e6e0', roughness: 0.4 }), [])
  const pip = useMemo(() => switchedMaterial(new THREE.MeshStandardMaterial({ color: '#2a2a2a', emissive: '#7ef0b0', emissiveIntensity: 1.6 }), zone, 1.6, 0.05), [zone])
  useEffect(() => registerInteractable('sw-' + zone + position[1].toFixed(1), {
    position: new THREE.Vector3(position[0] - Math.sin(yaw) * 0.7, position[1], position[2] - Math.cos(yaw) * 0.7),
    radius: 1.5,
    label: () => (useLights.getState().isOn(zone) ? `Turn off the lights · ${zoneName(zone)}` : `Turn on the lights · ${zoneName(zone)}`),
    onInteract: () => {
      const nowOn = useLights.getState().toggle(zone)
      useStore.getState().showToast(nowOn ? `Lights on · ${zoneName(zone)}` : `Lights off · ${zoneName(zone)} — saving power`)
    },
  }), [zone, position[0], position[1], position[2], yaw])
  return (
    <group position={position} rotation={[0, yaw, 0]} userData={{ noBatch: true }}>
      <mesh position={[0, 0, 0.012]} material={plate}><boxGeometry args={[0.09, 0.14, 0.025]} /></mesh>
      <mesh position={[0, off ? -0.022 : 0.022, 0.027]} rotation={[off ? 0.25 : -0.25, 0, 0]} material={plate}><boxGeometry args={[0.055, 0.055, 0.016]} /></mesh>
      <mesh position={[0, -0.05, 0.027]} material={pip}><boxGeometry args={[0.02, 0.006, 0.006]} /></mesh>
    </group>
  )
}

// ============================================================ bathroom fixtures

export function Toilet({ position, yaw = 0 }) {
  const p = porcelain()
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[0.2, 0.4, 0.33]} position={[0, 0.4, 0]} />
      {/* pedestal + bowl */}
      <mesh position={[0, 0.18, 0.02]} material={p} castShadow><cylinderGeometry args={[0.13, 0.17, 0.36, 18]} /></mesh>
      <mesh position={[0, 0.39, 0.03]} material={p} castShadow><cylinderGeometry args={[0.19, 0.15, 0.12, 22]} /></mesh>
      <mesh position={[0, 0.4, 0.03]} rotation={[Math.PI / 2, 0, 0]} material={p}><torusGeometry args={[0.175, 0.025, 8, 24]} /></mesh>
      <mesh position={[0, 0.37, 0.03]} rotation={[-Math.PI / 2, 0, 0]} material={waterM()}><circleGeometry args={[0.14, 20]} /></mesh>
      {/* seat lid, raised against the cistern */}
      <mesh position={[0, 0.56, -0.16]} rotation={[-0.18, 0, 0]} material={p} castShadow><boxGeometry args={[0.33, 0.03, 0.4]} /></mesh>
      {/* cistern + flush plate */}
      <mesh position={[0, 0.5, -0.24]} material={p} castShadow><boxGeometry args={[0.38, 0.72, 0.17]} /></mesh>
      <mesh position={[0, 0.78, -0.145]} material={chromeM()}><boxGeometry args={[0.13, 0.08, 0.012]} /></mesh>
      {/* paper holder */}
      <mesh position={[0.3, 0.62, -0.1]} material={chromeM()}><cylinderGeometry args={[0.012, 0.012, 0.14, 8]} /></mesh>
      <mesh position={[0.3, 0.62, -0.03]} rotation={[Math.PI / 2, 0, 0]} material={solid('#f6f4ef', 0.95)}><cylinderGeometry args={[0.055, 0.055, 0.1, 14]} /></mesh>
    </RigidBody>
  )
}

/** Vanity: stone top, basin, mixer tap, drawers, and a framed mirror with an LED halo. */
export function Vanity({ position, yaw = 0, width = 1.4, zone }) {
  const stone = signatureMarble(0.6, 0.3)
  const cab = surface('wood', 0.8, 0.4, { color: '#6b513c' })
  const halo = useMemo(() => switchedMaterial(new THREE.MeshStandardMaterial({ color: '#fff8ec', emissive: '#fff1d8', emissiveIntensity: 1.8, toneMapped: false }), zone, 1.8, 0), [zone])
  useEffect(() => registerLoad({ zone, watts: 18 }), [zone])
  useEffect(() => registerLightAnchor({ position: new THREE.Vector3(position[0] + Math.sin(yaw) * 0.5, position[1] + 1.7, position[2] + Math.cos(yaw) * 0.5), color: '#fff0dc', intensity: 6, distance: 4.5, range: 18, zone }), [position[0], position[1], position[2], yaw, zone]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
      <CuboidCollider args={[width / 2, 0.44, 0.28]} position={[0, 0.44, 0]} />
      <mesh position={[0, 0.42, 0]} material={cab} castShadow receiveShadow><boxGeometry args={[width, 0.84, 0.52]} /></mesh>
      {[-1, 1].map((k) => <mesh key={k} position={[k * width * 0.24, 0.52, 0.27]} material={chromeM()}><boxGeometry args={[width * 0.34, 0.016, 0.02]} /></mesh>)}
      <mesh position={[0, 0.86, 0]} material={stone} castShadow><boxGeometry args={[width + 0.06, 0.05, 0.56]} /></mesh>
      {/* vessel basin + tap */}
      <mesh position={[0, 0.95, 0.02]} material={porcelain()} castShadow><cylinderGeometry args={[0.19, 0.14, 0.13, 26]} /></mesh>
      <mesh position={[0, 0.99, 0.02]} rotation={[-Math.PI / 2, 0, 0]} material={waterM()}><circleGeometry args={[0.17, 20]} /></mesh>
      <mesh position={[0, 1.02, -0.2]} material={chromeM()}><cylinderGeometry args={[0.018, 0.022, 0.26, 10]} /></mesh>
      <mesh position={[0, 1.14, -0.13]} rotation={[Math.PI / 2, 0, 0]} material={chromeM()}><cylinderGeometry args={[0.014, 0.014, 0.16, 8]} /></mesh>
      {/* soap + tumbler */}
      <mesh position={[width / 2 - 0.16, 0.93, -0.02]} material={solid('#2a2f3a', 0.3)}><cylinderGeometry args={[0.035, 0.04, 0.1, 12]} /></mesh>
      {/* mirror with LED halo */}
      <mesh position={[0, 1.72, -0.25]} material={bronze()}><boxGeometry args={[width * 0.82 + 0.08, 1.02, 0.03]} /></mesh>
      <mesh position={[0, 1.72, -0.233]} material={mirrorM()}><planeGeometry args={[width * 0.82, 0.96]} /></mesh>
      <mesh position={[0, 1.72, -0.255]} material={halo}><boxGeometry args={[width * 0.82 + 0.16, 1.1, 0.012]} /></mesh>
    </RigidBody>
  )
}

/** A flat mirror panel for bedrooms and dressing areas. */
export function Mirror({ position, yaw = 0, size = [1.1, 1.9], zone }) {
  const halo = useMemo(() => switchedMaterial(new THREE.MeshStandardMaterial({ color: '#fff8ec', emissive: '#ffeed4', emissiveIntensity: 1.3, toneMapped: false }), zone, 1.3, 0), [zone])
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0, 0.01]} material={bronze()}><boxGeometry args={[size[0] + 0.09, size[1] + 0.09, 0.04]} /></mesh>
      <mesh position={[0, 0, 0.032]} material={mirrorM()}><planeGeometry args={size} /></mesh>
      <mesh position={[0, 0, 0.004]} material={halo}><boxGeometry args={[size[0] + 0.2, size[1] + 0.2, 0.01]} /></mesh>
    </group>
  )
}

/** Soft rising steam, used by the shower and the jacuzzi. */
function Steam({ position, radius = 0.5, count = 14, on }) {
  const ref = useRef()
  const mat = useMemo(() => {
    const t = new THREE.CanvasTexture(cv(64, 64, (ctx, w) => {
      const g = ctx.createRadialGradient(w / 2, w / 2, 1, w / 2, w / 2, w / 2)
      g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, w)
    }))
    return new THREE.PointsMaterial({ map: t, size: radius * 1.5, transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending, sizeAttenuation: true })
  }, [radius])
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    g.userData.t = Float32Array.from({ length: count }, (_, i) => hash(i * 3) * 3)
    return g
  }, [count])
  useFrame((_, dt) => {
    mat.opacity += ((on ? 0.5 : 0) - mat.opacity) * Math.min(1, dt * 2)
    if (mat.opacity < 0.01) return
    const p = geo.attributes.position.array, life = geo.userData.t
    for (let i = 0; i < count; i++) {
      life[i] += dt * 0.35
      if (life[i] > 3) life[i] -= 3
      const k = life[i] / 3
      p[i * 3] = Math.cos(i * 2.3 + k * 2) * radius * (0.3 + k * 0.8)
      p[i * 3 + 1] = k * 1.6
      p[i * 3 + 2] = Math.sin(i * 1.7 + k * 2) * radius * (0.3 + k * 0.8)
    }
    geo.attributes.position.needsUpdate = true
  })
  return <points ref={ref} position={position} geometry={geo} material={mat} frustumCulled={false} userData={{ noBatch: true }} />
}

/** Walk-in shower: stone tray, frameless glass, rain head and a handset. Interactive. */
export function Shower({ position, yaw = 0, w = 1.1, d = 1.1, h = 2.2, zone, glassAt = 'x' }) {
  const [on, setOn] = useState(false)
  const tray = surface('limestone', 1, 1, { color: '#cfcac0' })
  const tile = signatureMarble(1.2, 2)
  const stream = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#cfe9f2', roughness: 0.1, transparent: true, opacity: 0, depthWrite: false }), [])
  useEffect(() => registerLoad({ zone, watts: () => (on ? 1200 : 0) }), [zone, on])
  useEffect(() => registerInteractable('shower-' + position[0].toFixed(1) + position[2].toFixed(1), {
    position: new THREE.Vector3(position[0], position[1], position[2]),
    radius: 1.4,
    label: () => (on ? 'Turn off the shower' : 'Turn on the shower'),
    onInteract: () => { setOn((v) => !v); useStore.getState().showToast(on ? 'Shower off' : 'Shower running · hot water heater on') },
  }), [position[0], position[1], position[2], on])
  useFrame((_, dt) => { stream.opacity += ((on ? 0.3 : 0) - stream.opacity) * Math.min(1, dt * 3) })
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[w / 2, 0.03, d / 2]} position={[0, 0.03, 0]} />
        {glassAt === 'x'
          ? <CuboidCollider args={[0.02, h / 2, d / 2]} position={[w / 2, h / 2, 0]} />
          : <CuboidCollider args={[w / 2, h / 2, 0.02]} position={[0, h / 2, d / 2]} />}
      </RigidBody>
      <mesh position={[0, 0.03, 0]} material={tray} receiveShadow><boxGeometry args={[w, 0.06, d]} /></mesh>
      <mesh position={[0, 0.062, 0]} rotation={[-Math.PI / 2, 0, 0]} material={chromeM()}><circleGeometry args={[0.055, 16]} /></mesh>
      {/* tiled back wall inside the enclosure */}
      <mesh position={[0, h / 2, -d / 2 + 0.01]} material={tile}><planeGeometry args={[w, h]} /></mesh>
      {/* glass screen + chrome post, on whichever face is open to the room */}
      {glassAt === 'x' ? (
        <>
          <mesh position={[w / 2 - 0.01, h / 2, 0]} rotation={[0, -Math.PI / 2, 0]} material={clearGlass()}><planeGeometry args={[d, h]} /></mesh>
          <mesh position={[w / 2 - 0.01, h / 2, d / 2]} material={chromeM()}><boxGeometry args={[0.035, h, 0.035]} /></mesh>
          <mesh position={[w / 2 - 0.01, h - 0.02, 0]} material={chromeM()}><boxGeometry args={[0.03, 0.04, d]} /></mesh>
        </>
      ) : (
        <>
          <mesh position={[0, h / 2, d / 2 - 0.01]} material={clearGlass()}><planeGeometry args={[w, h]} /></mesh>
          <mesh position={[-w / 2, h / 2, d / 2 - 0.01]} material={chromeM()}><boxGeometry args={[0.035, h, 0.035]} /></mesh>
          <mesh position={[0, h - 0.02, d / 2 - 0.01]} material={chromeM()}><boxGeometry args={[w, 0.04, 0.03]} /></mesh>
        </>
      )}
      {/* rain head, riser, handset, mixer */}
      <mesh position={[0, h - 0.28, -d / 2 + 0.22]} material={chromeM()}><cylinderGeometry args={[0.018, 0.018, 0.36, 10]} /></mesh>
      <mesh position={[0, h - 0.46, -d / 2 + 0.3]} rotation={[Math.PI / 2, 0, 0]} material={chromeM()}><cylinderGeometry args={[0.016, 0.016, 0.22, 8]} /></mesh>
      <mesh position={[0, h - 0.5, -d / 2 + 0.42]} material={chromeM()} castShadow><cylinderGeometry args={[0.13, 0.13, 0.025, 24]} /></mesh>
      <mesh position={[-w / 2 + 0.16, 1.45, -d / 2 + 0.06]} material={chromeM()}><boxGeometry args={[0.1, 0.16, 0.05]} /></mesh>
      <mesh position={[-w / 2 + 0.16, 1.1, -d / 2 + 0.07]} material={chromeM()}><cylinderGeometry args={[0.022, 0.022, 0.16, 10]} /></mesh>
      {/* shelf niche */}
      <mesh position={[0, 1.25, -d / 2 + 0.05]} material={solid('#efece6', 0.5)}><boxGeometry args={[0.42, 0.02, 0.1]} /></mesh>
      <mesh position={[-0.1, 1.33, -d / 2 + 0.05]} material={solid('#2fd0c4', 0.4)}><boxGeometry args={[0.06, 0.15, 0.05]} /></mesh>
      <mesh position={[0.02, 1.31, -d / 2 + 0.05]} material={solid('#e0559f', 0.4)}><boxGeometry args={[0.055, 0.12, 0.05]} /></mesh>
      {/* water */}
      <mesh position={[0, (h - 0.5) / 2 + 0.05, -d / 2 + 0.42]} material={stream}><cylinderGeometry args={[0.12, 0.14, h - 0.6, 14, 1, true]} /></mesh>
      <Steam position={[0, 0.3, -d / 2 + 0.42]} radius={0.4} on={on} />
    </group>
  )
}

/**
 * Jacuzzi: a stone-surround spa bath with jets, a moving water surface and bubbles. Sit in it
 * from the deck; the heater draws 1.5kW while the jets are running, which shows up on the bill.
 */
export function Jacuzzi({ position, yaw = 0, w = 2.1, d = 1.6, zone, label = 'Get in the jacuzzi' }) {
  const [on, setOn] = useState(false)
  const stone = signatureMarble(1.4, 1)
  const inner = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#f2f3f2', roughness: 0.1, clearcoat: 1 }), [])
  const water = useRef()
  const bubbles = useRef()
  const h = 0.62
  const [x, y, z] = position
  useSeats([
    { position: [x + Math.cos(yaw) * w * 0.22, y + 0.3, z - Math.sin(yaw) * w * 0.22], yaw: yaw + Math.PI, height: 0.3, label },
    { position: [x - Math.cos(yaw) * w * 0.22, y + 0.3, z + Math.sin(yaw) * w * 0.22], yaw, height: 0.3, label },
  ], [x, y, z, yaw, w])
  useEffect(() => registerLoad({ zone, watts: () => (on ? 1500 : 60) }), [zone, on])
  useEffect(() => registerInteractable('jets-' + x.toFixed(1) + z.toFixed(1), {
    position: new THREE.Vector3(x + Math.cos(yaw) * (w / 2 + 0.3), y, z - Math.sin(yaw) * (w / 2 + 0.3)),
    radius: 1.3,
    label: () => (on ? 'Turn the jets off' : 'Turn the jets on'),
    onInteract: () => { setOn((v) => !v); useStore.getState().showToast(on ? 'Jets off' : 'Jets on · heater running (1.5 kW)') },
  }), [x, y, z, yaw, w, on])
  const drops = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(90 * 3), 3))
    g.userData.t = Float32Array.from({ length: 90 }, (_, i) => hash(i) * 1.2)
    return g
  }, [])
  const bubMat = useMemo(() => new THREE.PointsMaterial({ color: '#eaffff', size: 0.045, transparent: true, opacity: 0, depthWrite: false }), [])
  useFrame((st, dt) => {
    if (water.current) {
      water.current.position.y = h - 0.1 + Math.sin(st.clock.elapsedTime * (on ? 7 : 1.6)) * (on ? 0.012 : 0.004)
      water.current.material.roughness = on ? 0.3 : 0.06
    }
    bubMat.opacity += ((on ? 0.75 : 0) - bubMat.opacity) * Math.min(1, dt * 2.5)
    if (bubMat.opacity < 0.02) return
    const p = drops.attributes.position.array, life = drops.userData.t
    for (let i = 0; i < 90; i++) {
      life[i] += dt * 1.6
      if (life[i] > 1.2) life[i] -= 1.2
      const k = life[i] / 1.2
      p[i * 3] = (hash(i * 7) - 0.5) * (w - 0.5)
      p[i * 3 + 1] = 0.16 + k * (h - 0.28)
      p[i * 3 + 2] = (hash(i * 13) - 0.5) * (d - 0.5)
    }
    drops.attributes.position.needsUpdate = true
  })
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <RigidBody type="fixed" colliders={false}>
        {[[0, -d / 2 + 0.11, w, 0.22], [0, d / 2 - 0.11, w, 0.22], [-w / 2 + 0.11, 0, 0.22, d], [w / 2 - 0.11, 0, 0.22, d]].map(([ox, oz, sx, sz], i) => (
          <CuboidCollider key={i} args={[sx / 2, h / 2, sz / 2]} position={[ox, h / 2, oz]} />
        ))}
        <CuboidCollider args={[w / 2, 0.04, d / 2]} position={[0, 0.08, 0]} />
      </RigidBody>
      {/* stone surround */}
      {[[0, -d / 2 + 0.11, w, 0.22], [0, d / 2 - 0.11, w, 0.22], [-w / 2 + 0.11, 0, 0.22, d - 0.44], [w / 2 - 0.11, 0, 0.22, d - 0.44]].map(([ox, oz, sx, sz], i) => (
        <mesh key={i} position={[ox, h / 2, oz]} material={stone} castShadow receiveShadow><boxGeometry args={[sx, h, sz]} /></mesh>
      ))}
      {/* tub shell */}
      <mesh position={[0, 0.1, 0]} material={inner} receiveShadow><boxGeometry args={[w - 0.42, 0.06, d - 0.42]} /></mesh>
      {[[0, -d / 2 + 0.23, w - 0.42, 0.03], [0, d / 2 - 0.23, w - 0.42, 0.03], [-w / 2 + 0.23, 0, 0.03, d - 0.42], [w / 2 - 0.23, 0, 0.03, d - 0.42]].map(([ox, oz, sx, sz], i) => (
        <mesh key={'s' + i} position={[ox, h / 2 + 0.05, oz]} material={inner}><boxGeometry args={[sx, h - 0.1, sz]} /></mesh>
      ))}
      {/* jets */}
      {[-1, 1].flatMap((kx) => [-1, 1].map((kz) => (
        <mesh key={`${kx}${kz}`} position={[kx * (w / 2 - 0.26), 0.34, kz * (d / 2 - 0.26)]} rotation={[0, 0, Math.PI / 2]} material={chromeM()}>
          <cylinderGeometry args={[0.035, 0.035, 0.02, 12]} />
        </mesh>
      )))}
      <mesh position={[0, 0.46, -d / 2 + 0.24]} material={chromeM()}><cylinderGeometry args={[0.02, 0.02, 0.1, 8]} /></mesh>
      {/* control pad on the deck */}
      <mesh position={[w / 2 - 0.11, h + 0.015, d / 2 - 0.35]} material={solid('#1b1d21', 0.3, 0.4)}><boxGeometry args={[0.14, 0.02, 0.2]} /></mesh>
      {/* water */}
      <mesh ref={water} position={[0, h - 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} material={waterM()} userData={{ noBatch: true }}>
        <planeGeometry args={[w - 0.46, d - 0.46]} />
      </mesh>
      <points geometry={drops} material={bubMat} frustumCulled={false} userData={{ noBatch: true }} />
      <Steam position={[0, h, 0]} radius={w * 0.3} count={18} on={on} />
      {/* folded towels on the deck */}
      <mesh position={[-w / 2 + 0.4, h + 0.05, d / 2 - 0.12]} material={solid('#efe9df', 0.95)} castShadow><boxGeometry args={[0.3, 0.08, 0.2]} /></mesh>
      <mesh position={[-w / 2 + 0.4, h + 0.13, d / 2 - 0.12]} material={solid('#e7dfd2', 0.95)} castShadow><boxGeometry args={[0.28, 0.07, 0.19]} /></mesh>
    </group>
  )
}

export function TowelRail({ position, yaw = 0 }) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {[0, 1].map((i) => <mesh key={i} position={[(i ? 1 : -1) * 0.3, 0, 0.06]} material={chromeM()}><boxGeometry args={[0.03, 0.03, 0.1]} /></mesh>)}
      <mesh position={[0, 0, 0.1]} rotation={[0, 0, Math.PI / 2]} material={chromeM()}><cylinderGeometry args={[0.015, 0.015, 0.64, 10]} /></mesh>
      {[-0.17, 0.17].map((x) => (
        <mesh key={x} position={[x, -0.25, 0.1]} material={solid('#efe9df', 0.95)} castShadow><boxGeometry args={[0.26, 0.5, 0.05]} /></mesh>
      ))}
    </group>
  )
}

/**
 * A complete bathroom: tiled walls with a doorway, marble floor, vanity with a lit mirror,
 * toilet, walk-in shower and (in the suites) a jacuzzi. `center` is the middle of the room and
 * local +z is the doorway side, so `yaw` turns the whole suite to face into whatever room it
 * serves. Fixtures line the back wall and the doorway wall is left as a clear walkway.
 */
export function Bathroom({ center, yaw = 0, w = 4.5, d = 3.0, h = 3.9, zone, jacuzzi = false }) {
  const tile = signatureMarble(2, 2.4)
  const floor = signatureMarble(2.2, 1.9)
  const t = 0.12, doorW = 1.0
  const gx = w / 2 - 0.9 // doorway centre, tucked into the +x corner
  const g0 = gx - doorW / 2, g1 = gx + doorW / 2
  const segs = [
    [-w / 2 - t, w / 2 + t, -d / 2 - t, -d / 2],          // back
    [-w / 2 - t, -w / 2, -d / 2 - t, d / 2 + t],          // -x
    [w / 2, w / 2 + t, -d / 2 - t, d / 2 + t],            // +x
    [-w / 2 - t, g0, d / 2, d / 2 + t],                   // door wall, left of the opening
    [g1, w / 2 + t, d / 2, d / 2 + t],                    // door wall, right of the opening
  ]
  const back = -d / 2
  // fixtures register interactables, seats and lights in world space, so they are placed with
  // world coordinates rather than parented to the rotated shell
  const W = (lx, lz, dy = 0) => [center[0] + lx * Math.cos(yaw) + lz * Math.sin(yaw), center[1] + dy, center[2] - lx * Math.sin(yaw) + lz * Math.cos(yaw)]
  return (
    <>
      <group position={center} rotation={[0, yaw, 0]}>
        <RigidBody type="fixed" colliders={false}>
          {segs.map(([x0, x1, z0, z1], i) => (
            <CuboidCollider key={i} args={[(x1 - x0) / 2, h / 2, (z1 - z0) / 2]} position={[(x0 + x1) / 2, h / 2, (z0 + z1) / 2]} />
          ))}
        </RigidBody>
        {segs.map(([x0, x1, z0, z1], i) => (
          <mesh key={i} position={[(x0 + x1) / 2, h / 2, (z0 + z1) / 2]} material={tile} castShadow receiveShadow>
            <boxGeometry args={[x1 - x0, h, z1 - z0]} />
          </mesh>
        ))}
        {/* head of the doorway */}
        <mesh position={[gx, 2.1 + (h - 2.1) / 2, d / 2 + t / 2]} material={tile}><boxGeometry args={[doorW, h - 2.1, t]} /></mesh>
        <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]} material={floor} receiveShadow><planeGeometry args={[w, d]} /></mesh>
        <mesh position={[-w / 2 + 0.95, 0.012, back + 0.95]} rotation={[-Math.PI / 2, 0, 0]} material={solid('#cfd8d4', 1)} receiveShadow><planeGeometry args={[0.9, 0.55]} /></mesh>
      </group>
      {/* fittings along the back wall; the doorway side stays clear as a walkway */}
      <Vanity position={W(-w / 2 + 0.95, back + 0.32)} yaw={yaw} width={1.5} zone={zone} />
      <Toilet position={W(-w / 2 + 2.35, back + 0.42)} yaw={yaw} />
      <Shower position={W(w / 2 - 0.78, back + 0.78)} yaw={yaw} w={1.4} d={1.4} zone={zone} glassAt="z" />
      {jacuzzi && <Jacuzzi position={W(-w / 2 + 4.3, back + 0.9)} yaw={yaw} w={1.9} d={1.6} zone={zone} />}
      <TowelRail position={W(-w / 2 + 0.06, d / 2 - 0.75, 1.5)} yaw={yaw + Math.PI / 2} />
      <BathLights center={center} h={h} w={w} yaw={yaw} zone={zone} />
    </>
  )
}

function BathLights({ center, h, w, yaw = 0, zone }) {
  const mat = useMemo(() => switchedMaterial(new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff3e2', emissiveIntensity: 1.4 }), zone, 1.4, 0.02), [zone])
  useEffect(() => registerLoad({ zone, watts: 26 }), [zone])
  useEffect(() => registerLightAnchor({ position: new THREE.Vector3(center[0], center[1] + h - 1, center[2]), color: '#fff2e0', intensity: 9, distance: 6, range: 20, zone }), [center[0], center[1], center[2], h, zone]) // eslint-disable-line react-hooks/exhaustive-deps
  return [-1, 1].map((k) => (
    <mesh key={k} position={[center[0] + k * w * 0.26 * Math.cos(yaw), center[1] + h - 0.06, center[2] - k * w * 0.26 * Math.sin(yaw)]} rotation={[Math.PI / 2, 0, 0]} material={mat}>
      <circleGeometry args={[0.1, 16]} />
    </mesh>
  ))
}
