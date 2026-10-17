import * as THREE from 'three'
import { texUtil } from '../materials.js'
import { facadeMats } from '../facade/materials.js'
import { nightLit } from '../../state/environment.js'

// Shared generated materials for the reusable asset kits (apartments, parks, sports grounds, landfill).
// Everything is drawn once from canvas (no downloads), cached, and addressed in METRES: each texture's repeat is
// 1 / (metres per tile), so one material fits any piece. Pieces built with facade/kit.js's Builder carry
// world-metre UVs, so these line up across walls, slabs and paths without per-mesh repeat settings.
//
// Roughness is varied through roughnessMaps, bump through bumpMaps. Nothing here is a flat colour.

const { hash, canvas, mottle, grain } = texUtil

function tex(c, { srgb = true, tile = 1, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(1 / tile, 1 / tile)
  t.anisotropy = aniso
  return t
}

/** Decomposed-granite path: tan fines with pale and dark chips and a few embedded pebbles. 2 m tile. */
function gravelMaps() {
  const S = 512
  const color = canvas(S, (ctx, s) => {
    ctx.fillStyle = '#b8a98c'; ctx.fillRect(0, 0, s, s)
    mottle(ctx, s, 40, 0.3, '#cdbf9f', '#9b8d72', 5)
    for (let i = 0; i < 5200; i++) {
      const x = hash(i, 1, 41) * s, y = hash(i, 2, 41) * s, r = 0.7 + hash(i, 3, 41) * 1.9
      const v = hash(i, 4, 41)
      ctx.fillStyle = v < 0.3 ? 'rgba(236,226,204,0.75)' : v < 0.6 ? 'rgba(120,106,84,0.7)' : v < 0.85 ? 'rgba(168,150,122,0.7)' : 'rgba(92,84,72,0.7)'
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill()
    }
    grain(ctx, s, 20, 8)
  })
  const bump = canvas(S, (ctx, s) => {
    ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, s, s)
    for (let i = 0; i < 4000; i++) {
      const g = 90 + hash(i, 6, 43) * 150
      ctx.fillStyle = `rgb(${g},${g},${g})`
      ctx.beginPath(); ctx.arc(hash(i, 7, 43) * s, hash(i, 8, 43) * s, 0.8 + hash(i, 9, 43) * 1.6, 0, 7); ctx.fill()
    }
  })
  const rough = canvas(256, (ctx, s) => { ctx.fillStyle = '#e4e4e4'; ctx.fillRect(0, 0, s, s); mottle(ctx, s, 30, 0.35, '#ffffff', '#9a9a9a', 12); grain(ctx, s, 30, 4) })
  return { map: tex(color, { tile: 2 }), bump: tex(bump, { srgb: false, tile: 2 }), rough: tex(rough, { srgb: false, tile: 2 }) }
}

/** Shredded-bark mulch for planting beds: overlapping short strands in browns. 1.6 m tile. */
function mulchMaps() {
  const S = 512
  const color = canvas(S, (ctx, s) => {
    ctx.fillStyle = '#3b2819'; ctx.fillRect(0, 0, s, s)
    for (let i = 0; i < 4200; i++) {
      const x = hash(i, 11, 51) * s, y = hash(i, 12, 51) * s, a = hash(i, 13, 51) * 6.28, l = 6 + hash(i, 14, 51) * 16
      const k = hash(i, 15, 51)
      ctx.strokeStyle = `hsl(${22 + k * 10}, ${34 + k * 18}%, ${14 + k * 22}%)`
      ctx.lineWidth = 1.2 + hash(i, 16, 51) * 2.2
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke()
    }
  })
  const bump = canvas(S, (ctx, s) => {
    ctx.fillStyle = '#707070'; ctx.fillRect(0, 0, s, s)
    for (let i = 0; i < 2500; i++) {
      const g = 60 + hash(i, 17, 53) * 180
      ctx.strokeStyle = `rgb(${g},${g},${g})`; ctx.lineWidth = 2
      const x = hash(i, 18, 53) * s, y = hash(i, 19, 53) * s, a = hash(i, 20, 53) * 6.28
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12); ctx.stroke()
    }
  })
  return { map: tex(color, { tile: 1.6 }), bump: tex(bump, { srgb: false, tile: 1.6 }) }
}

/** Poured-in-place playground rubber: speckled EPDM granules in a muted brick red. 1.5 m tile. */
function rubberMaps() {
  const S = 512
  const color = canvas(S, (ctx, s) => {
    ctx.fillStyle = '#7b3f37'; ctx.fillRect(0, 0, s, s)
    mottle(ctx, s, 30, 0.2, '#8e4d43', '#66332d', 9)
    for (let i = 0; i < 6000; i++) {
      const v = hash(i, 21, 61)
      ctx.fillStyle = v < 0.18 ? 'rgba(40,40,44,0.85)' : v < 0.3 ? 'rgba(210,190,160,0.75)' : v < 0.4 ? 'rgba(58,110,114,0.7)' : v < 0.7 ? 'rgba(150,76,64,0.8)' : 'rgba(96,46,40,0.8)'
      ctx.fillRect(hash(i, 22, 61) * s, hash(i, 23, 61) * s, 1.6 + hash(i, 24, 61) * 2.4, 1.6 + hash(i, 25, 61) * 2.4)
    }
  })
  const bump = canvas(256, (ctx, s) => { ctx.fillStyle = '#7a7a7a'; ctx.fillRect(0, 0, s, s); grain(ctx, s, 90, 6) })
  return { map: tex(color, { tile: 1.5 }), bump: tex(bump, { srgb: false, tile: 1.5 }) }
}

/** Parking-lot asphalt: coarse aggregate, patched seams, oil stains. 6 m tile. */
function lotMaps() {
  const S = 1024
  const color = canvas(S, (ctx, s) => {
    ctx.fillStyle = '#3a3c3f'; ctx.fillRect(0, 0, s, s)
    mottle(ctx, s, 60, 0.35, '#4a4c50', '#2b2c2f', 77)
    for (let i = 0; i < 9000; i++) {
      const v = hash(i, 31, 71)
      ctx.fillStyle = v < 0.5 ? 'rgba(150,150,154,0.28)' : v < 0.8 ? 'rgba(18,18,20,0.4)' : 'rgba(185,175,160,0.3)'
      ctx.fillRect(hash(i, 32, 71) * s, hash(i, 33, 71) * s, 1 + hash(i, 34, 71) * 2.2, 1 + hash(i, 35, 71) * 2.2)
    }
    // patched seam and a few dark stains where cars idle
    ctx.fillStyle = 'rgba(14,14,16,0.5)'; ctx.fillRect(0, s * 0.62, s, 5)
    for (let k = 0; k < 7; k++) { const g = ctx.createRadialGradient(hash(k, 36, 73) * s, hash(k, 37, 73) * s, 2, hash(k, 36, 73) * s, hash(k, 37, 73) * s, 34 + hash(k, 38, 73) * 40); g.addColorStop(0, 'rgba(8,8,10,0.4)'); g.addColorStop(1, 'rgba(8,8,10,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, s, s) }
    grain(ctx, s, 22, 5)
  })
  const bump = canvas(512, (ctx, s) => { ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, s, s); grain(ctx, s, 120, 15); mottle(ctx, s, 40, 0.6, '#fff', '#000', 6) })
  const rough = canvas(256, (ctx, s) => { ctx.fillStyle = '#d8d8d8'; ctx.fillRect(0, 0, s, s); mottle(ctx, s, 40, 0.4, '#fff', '#7a7a7a', 17); grain(ctx, s, 40, 4) })
  return { map: tex(color, { tile: 6 }), bump: tex(bump, { srgb: false, tile: 6 }), rough: tex(rough, { srgb: false, tile: 6 }) }
}

/** Brushed painted-metal normal-free map for railings and equipment: faint vertical streaks. 1 m tile. */
function paintRough() {
  return tex(canvas(128, (ctx, s) => { ctx.fillStyle = '#9a9a9a'; ctx.fillRect(0, 0, s, s); for (let i = 0; i < 300; i++) { const g = 120 + hash(i, 41, 3) * 100; ctx.fillStyle = `rgb(${g},${g},${g})`; ctx.fillRect(hash(i, 42, 3) * s, 0, 1, s) } }), { srgb: false, tile: 1 })
}

let cache
export function assetMats() {
  if (cache) return cache
  const f = facadeMats()
  const gravel = gravelMaps(), mulch = mulchMaps(), rubber = rubberMaps(), lot = lotMaps()
  const std = (o) => new THREE.MeshStandardMaterial(o)
  const prough = paintRough()
  cache = {
    f, // the facade kit's own materials (brick, render, concrete, stone, roof, glass, glazing, bronze ...)
    gravel: std({ map: gravel.map, bumpMap: gravel.bump, bumpScale: 1.1, roughnessMap: gravel.rough, roughness: 1 }),
    mulch: std({ map: mulch.map, bumpMap: mulch.bump, bumpScale: 1.4, roughness: 1 }),
    rubber: std({ map: rubber.map, bumpMap: rubber.bump, bumpScale: 0.8, roughness: 0.92 }),
    lot: std({ map: lot.map, bumpMap: lot.bump, bumpScale: 1.2, roughnessMap: lot.rough, roughness: 1 }),
    paintWhite: std({ color: '#e9e8e2', roughness: 0.72, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    paintYellow: std({ color: '#d9ad2b', roughness: 0.72, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    paintBlue: std({ color: '#2a6fc0', roughness: 0.72, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    // window frames: powder-coated aluminium, slightly satin
    frame: std({ color: '#34383d', roughness: 0.5, metalness: 0.55, roughnessMap: prough, envMapIntensity: 0.9 }),
    frameLight: std({ color: '#d8d9d6', roughness: 0.55, metalness: 0.35, roughnessMap: prough }),
    // railings and posts: dark galvanised steel
    rail: std({ color: '#2c2f33', roughness: 0.55, metalness: 0.7, roughnessMap: prough }),
    // play equipment paints in the brand accents, used selectively (teal, yellow, pink, violet)
    teal: std({ color: '#1fa89e', roughness: 0.45, metalness: 0.15, roughnessMap: prough }),
    yellow: std({ color: '#e0b020', roughness: 0.45, metalness: 0.1, roughnessMap: prough }),
    pink: std({ color: '#d4488f', roughness: 0.45, metalness: 0.1, roughnessMap: prough }),
    violet: std({ color: '#7647c9', roughness: 0.45, metalness: 0.1, roughnessMap: prough }),
    galv: std({ color: '#a7acb0', roughness: 0.38, metalness: 0.9, roughnessMap: prough }),
    rubberBlack: std({ color: '#1b1c1e', roughness: 0.85 }),
    // warm exterior fixtures (night only)
    sconce: nightLit(new THREE.MeshStandardMaterial({ color: '#f2ede2', emissive: '#ffd49a', roughness: 0.5 }), 4, 0),
    accentStrip: nightLit(new THREE.MeshStandardMaterial({ color: '#103a38', emissive: '#2fd0c4', roughness: 0.6 }), 2.2, 0),
  }
  return cache
}
