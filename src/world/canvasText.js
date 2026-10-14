import * as THREE from 'three'
import { FONTS } from '../config/theme.js'

// Text rendered to canvas textures (no font downloads at runtime beyond Google Fonts CSS).
// Textures redraw once the web fonts finish loading so signs never stay in a fallback face.

const fontsReady = typeof document !== 'undefined' && document.fonts
  ? Promise.all([
      document.fonts.load(`800 64px ${FONTS.display}`),
      document.fonts.load(`700 32px ${FONTS.body}`),
      document.fonts.load(`500 24px ${FONTS.mono}`),
    ]).catch(() => {})
  : Promise.resolve()

export function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  const render = () => {
    ctx.clearRect(0, 0, width, height)
    draw(ctx, width, height)
    tex.needsUpdate = true
  }
  render()
  fontsReady.then(render)
  tex.redraw = render
  return tex
}

export function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ')
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y)
      line = w
      y += lineHeight
    } else line = test
  }
  if (line) ctx.fillText(line, x, y)
  return y + lineHeight
}

/** Glowing neon word sign. */
export function neonSignTexture(text, color, { width = 1024, height = 256, size = 150, font = FONTS.display, weight = 800 } = {}) {
  return canvasTexture(width, height, (ctx, w, h) => {
    ctx.font = `${weight} ${size}px ${font}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // auto-fit
    let s = size
    while (ctx.measureText(text).width > w * 0.92 && s > 20) { s -= 4; ctx.font = `${weight} ${s}px ${font}` }
    ctx.shadowColor = color
    ctx.shadowBlur = 28
    ctx.fillStyle = color
    ctx.fillText(text, w / 2, h / 2)
    ctx.shadowBlur = 8
    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = 0.55
    ctx.fillText(text, w / 2, h / 2)
    ctx.globalAlpha = 1
  })
}

/** Name tag for avatars. */
export function nameTagTexture(name, color) {
  return canvasTexture(512, 128, (ctx, w, h) => {
    ctx.font = `700 54px ${FONTS.body}`
    const tw = Math.min(ctx.measureText(name).width + 60, w - 8)
    ctx.fillStyle = 'rgba(10,9,16,0.78)'
    roundRect(ctx, (w - tw) / 2, 22, tw, 84, 42)
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = 4
    ctx.stroke()
    ctx.fillStyle = '#f4efff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(name, w / 2, 66, w - 70)
  })
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Clean architectural lettering (channel-letter style) on a transparent background. */
export function signTexture(text, { color = '#f4f1ea', width = 1024, height = 256, size = 150, font = FONTS.display, weight = 700, spacing = 0.06, sub = null, subColor = null } = {}) {
  return canvasTexture(width, height, (ctx, w, h) => {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    let s = size
    const fit = () => {
      ctx.font = `${weight} ${s}px ${font}`
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(s * spacing)}px`
    }
    fit()
    while (ctx.measureText(text).width > w * 0.92 && s > 20) { s -= 4; fit() }
    const y = sub ? h * 0.4 : h / 2
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = 6
    ctx.fillStyle = color
    ctx.fillText(text, w / 2, y)
    if (sub) {
      ctx.font = `500 ${Math.round(s * 0.28)}px ${FONTS.mono}`
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(s * 0.06)}px`
      ctx.fillStyle = subColor || color
      ctx.fillText(sub, w / 2, h * 0.8)
    }
  })
}

/** Small plaque: room number + name, for doors and directories. */
export function plaqueTexture(lines, { width = 512, height = 256, bg = '#1d1f23', fg = '#f1ede4', accent = '#c9a96a' } = {}) {
  return canvasTexture(width, height, (ctx, w, h) => {
    ctx.fillStyle = bg
    roundRect(ctx, 0, 0, w, h, 18)
    ctx.fill()
    ctx.fillStyle = accent
    ctx.fillRect(28, 28, 6, h - 56)
    ctx.textBaseline = 'alphabetic'
    let y = 0
    lines.forEach((l, i) => {
      const big = i === 0
      ctx.font = big ? `700 ${Math.round(h * 0.2)}px ${FONTS.mono}` : `700 ${Math.round(h * 0.17)}px ${FONTS.body}`
      ctx.fillStyle = big ? accent : fg
      y += big ? h * 0.3 : h * 0.23
      ctx.fillText(l, 56, y, w - 80)
    })
  })
}
