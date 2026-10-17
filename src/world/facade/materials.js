import * as THREE from 'three'
import { texUtil, getMaterials } from '../materials.js'
import { nightLit } from '../../state/environment.js'

// Materials for renovated buildings. Everything is generated once from canvas (no downloads) and
// shared, so renovated walls still merge into a handful of draw calls under StaticBatch.
// Textures are addressed in METRES: geometry built by facade/kit.js carries world-metre UVs, and
// each texture's repeat is 1 / (metres per tile), so one material fits every wall piece.

const { hash, canvas, mottle, grain } = texUtil

function tex(c, { srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = aniso
  return t
}
const tiled = (t, tile) => { t.repeat.set(1 / tile, 1 / tile); return t }

/** 2.4 m tile: 32 courses of running-bond brick with mortar, per-brick colour, burnt headers and soot. */
function brickMaps() {
  const S = 1024, H = 512
  const COURSES = 32, PER = 10
  const color = canvas(S, (ctx, s) => {
    ctx.fillStyle = '#9e978b'; ctx.fillRect(0, 0, s, s)
    mottle(ctx, s, 24, 0.22, '#bcb5a8', '#7e786e', 41)
    const w = s / PER, h = s / COURSES
    for (let y = 0; y < COURSES; y++) for (let x = -1; x < PER + 1; x++) {
      const off = y % 2 ? w / 2 : 0
      const v = hash(x + 10, y + 3, 977), v2 = hash(x + 77, y + 19, 991)
      const burnt = v2 > 0.93, pale = v2 < 0.07
      const hue = burnt ? 8 : pale ? 18 : 7 + v * 13
      const sat = burnt ? 26 : pale ? 30 : 33 + v * 15
      const lit = burnt ? 19 + v * 6 : pale ? 42 + v * 6 : 28 + v * 13
      const bx = x * w + off + 1.5, by = y * h + 1.5, bw = w - 3, bh = h - 3
      ctx.fillStyle = `hsl(${hue}, ${sat}%, ${lit}%)`
      ctx.fillRect(bx, by, bw, bh)
      // face shading: slightly lighter top edge, darker underside, so each brick reads as a block
      ctx.fillStyle = 'rgba(255,235,210,0.10)'; ctx.fillRect(bx, by, bw, 2)
      ctx.fillStyle = 'rgba(30,10,0,0.16)'; ctx.fillRect(bx, by + bh - 2, bw, 2)
      // pits and flecks
      for (let k = 0; k < 7; k++) {
        const px = bx + hash(x * 7 + k, y * 3, 5003) * bw, py = by + hash(x * 5, y * 11 + k, 5003) * bh
        ctx.fillStyle = hash(k, x + y, 313) > 0.5 ? 'rgba(20,8,0,0.28)' : 'rgba(255,225,190,0.16)'
        ctx.fillRect(px, py, 2 + hash(k, y, 17) * 3, 1.5)
      }
    }
    grain(ctx, s, 22, 9)
  })
  const bump = canvas(H, (ctx, s) => {
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(0, 0, s, s)
    const w = s / PER, h = s / COURSES
    for (let y = 0; y < COURSES; y++) for (let x = -1; x < PER + 1; x++) {
      const off = y % 2 ? w / 2 : 0
      const v = hash(x + 30, y + 8, 977)
      const g = 190 + v * 50
      ctx.fillStyle = `rgb(${g},${g},${g})`
      ctx.fillRect(x * w + off + 1, y * h + 1, w - 2, h - 2)
    }
    grain(ctx, s, 34, 4)
  })
  const rough = canvas(H, (ctx, s) => {
    ctx.fillStyle = '#f2f2f2'; ctx.fillRect(0, 0, s, s)
    const w = s / PER, h = s / COURSES
    for (let y = 0; y < COURSES; y++) for (let x = -1; x < PER + 1; x++) {
      const off = y % 2 ? w / 2 : 0
      const g = 205 + hash(x, y, 977) * 30
      ctx.fillStyle = `rgb(${g},${g},${g})`
      ctx.fillRect(x * w + off + 1, y * h + 1, w - 2, h - 2)
    }
  })
  return { map: tiled(tex(color), 2.4), bump: tiled(tex(bump, { srgb: false }), 2.4), rough: tiled(tex(rough, { srgb: false }), 2.4) }
}

/** 1.2 m tile: honed limestone ashlar, blocks 0.6 x 0.3, fine pitting and joints. */
function stoneMaps() {
  const S = 512
  const draw = (ctx, s, mode) => {
    const w = s / 2, h = s / 4
    ctx.fillStyle = mode === 'bump' ? '#303030' : mode === 'rough' ? '#ffffff' : '#9d9482'
    ctx.fillRect(0, 0, s, s)
    for (let y = 0; y < 4; y++) for (let x = -1; x < 3; x++) {
      const off = y % 2 ? w / 2 : 0
      const v = hash(x + 4, y + 2, 523)
      const bx = x * w + off + 1.5, by = y * h + 1.5, bw = w - 3, bh = h - 3
      if (mode === 'color') ctx.fillStyle = `hsl(${38 + v * 6}, ${14 + v * 8}%, ${68 + v * 8}%)`
      else if (mode === 'bump') { const g = 200 + v * 30; ctx.fillStyle = `rgb(${g},${g},${g})` }
      else { const g = 190 + v * 40; ctx.fillStyle = `rgb(${g},${g},${g})` }
      ctx.fillRect(bx, by, bw, bh)
      if (mode === 'color') {
        // fossil flecks and pitting
        for (let k = 0; k < 18; k++) {
          ctx.fillStyle = hash(k, x * 3 + y, 71) > 0.4 ? 'rgba(110,98,78,0.30)' : 'rgba(255,250,236,0.25)'
          ctx.fillRect(bx + hash(k, y + 3, 71) * bw, by + hash(x + 9, k, 71) * bh, 1.5 + hash(k, x, 13) * 3, 1.2)
        }
      }
    }
    if (mode === 'color') { mottle(ctx, s, 10, 0.18, '#d6ceba', '#9a907a', 11); grain(ctx, s, 14, 12) }
    else grain(ctx, s, mode === 'bump' ? 26 : 10, 6)
  }
  return {
    map: tiled(tex(canvas(S, (c, s) => draw(c, s, 'color'))), 1.2),
    bump: tiled(tex(canvas(S, (c, s) => draw(c, s, 'bump')), { srgb: false }), 1.2),
    rough: tiled(tex(canvas(S, (c, s) => draw(c, s, 'rough')), { srgb: false }), 1.2),
  }
}

/** 1.2 m tile: flamed dark granite plinth with crystalline flecks. */
function graniteMaps() {
  const S = 256
  const color = canvas(S, (ctx, s) => {
    ctx.fillStyle = '#4a4a4e'; ctx.fillRect(0, 0, s, s)
    mottle(ctx, s, 18, 0.35, '#6a6a70', '#2c2c30', 55)
    for (let i = 0; i < 900; i++) {
      const v = hash(i, 4, 8191)
      ctx.fillStyle = v > 0.6 ? 'rgba(230,228,224,0.55)' : v > 0.3 ? 'rgba(20,20,22,0.6)' : 'rgba(150,120,110,0.45)'
      ctx.fillRect(hash(i, 1, 8191) * s, hash(i, 2, 8191) * s, 1 + hash(i, 3, 8191) * 2, 1 + hash(i, 5, 8191) * 2)
    }
    grain(ctx, s, 14, 21)
  })
  const bump = canvas(S, (ctx, s) => { ctx.fillStyle = '#888'; ctx.fillRect(0, 0, s, s); grain(ctx, s, 60, 7) })
  return { map: tiled(tex(color), 1.2), bump: tiled(tex(bump, { srgb: false }), 1.2) }
}

/** 3 m tile: painted plaster with trowel marks, for the inner face of renovated walls. */
function plasterMaps() {
  const S = 256
  const color = canvas(S, (ctx, s) => {
    ctx.fillStyle = '#dcd7cd'; ctx.fillRect(0, 0, s, s)
    mottle(ctx, s, 8, 0.10, '#ebe7de', '#bdb7aa', 21)
    grain(ctx, s, 10, 22)
  })
  const bump = canvas(S, (ctx, s) => { ctx.fillStyle = '#888'; ctx.fillRect(0, 0, s, s); mottle(ctx, s, 24, 0.5, '#fff', '#000', 9); grain(ctx, s, 30, 3) })
  return { map: tiled(tex(color), 3), bump: tiled(tex(bump, { srgb: false }), 3) }
}


/** 2.4 m tile: cast concrete panels (1.2 x 2.4 m) with form-tie holes, joints and weathering streaks. */
function concreteMaps() {
  const S = 512
  const draw = (ctx, s, mode) => {
    ctx.fillStyle = mode === 'bump' ? '#9a9a9a' : mode === 'rough' ? '#ececec' : '#a4a29c'
    ctx.fillRect(0, 0, s, s)
    if (mode === 'color') { mottle(ctx, s, 14, 0.24, '#c4c2bb', '#85837d', 71); mottle(ctx, s, 40, 0.12, '#d0cec8', '#76746e', 73) }
    // vertical weathering streaks
    if (mode === 'color') for (let i = 0; i < 40; i++) { const x = hash(i, 1, 4441) * s, len = s * (0.2 + hash(i, 2, 4441) * 0.6); const g = ctx.createLinearGradient(0, 0, 0, len); g.addColorStop(0, `rgba(60,58,54,${0.05 + hash(i, 3, 4441) * 0.1})`); g.addColorStop(1, 'rgba(60,58,54,0)'); ctx.fillStyle = g; ctx.fillRect(x, hash(i, 4, 4441) * s * 0.5, 2 + hash(i, 5, 4441) * 6, len) }
    // panel joints: 2 columns x 1 row of 1.2 m panels, each 2.4 m tall
    const dark = mode === 'color' ? 'rgba(40,38,36,0.7)' : mode === 'bump' ? '#202020' : '#ffffff'
    ctx.fillStyle = dark
    ctx.fillRect(0, 0, 3, s); ctx.fillRect(s / 2 - 1.5, 0, 3, s); ctx.fillRect(0, 0, s, 3); ctx.fillRect(0, s - 3, s, 3)
    // form-tie holes on a 0.6 m grid
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const px = x * (s / 4) + s / 8, py = y * (s / 4) + s / 8
      ctx.fillStyle = mode === 'bump' ? '#303030' : mode === 'rough' ? '#ffffff' : 'rgba(50,48,45,0.65)'
      ctx.beginPath(); ctx.arc(px, py, 3.2, 0, Math.PI * 2); ctx.fill()
    }
    // fine pores
    for (let i = 0; i < 500; i++) { ctx.fillStyle = mode === 'color' ? 'rgba(60,58,54,0.35)' : mode === 'bump' ? '#555' : '#ffffff'; ctx.fillRect(hash(i, 6, 4441) * s, hash(i, 7, 4441) * s, 1.4, 1.4) }
    grain(ctx, s, mode === 'bump' ? 24 : 14, 8)
  }
  return {
    map: tiled(tex(canvas(S, (c, s) => draw(c, s, 'color'))), 2.4),
    bump: tiled(tex(canvas(S, (c, s) => draw(c, s, 'bump')), { srgb: false }), 2.4),
    rough: tiled(tex(canvas(S, (c, s) => draw(c, s, 'rough')), { srgb: false }), 2.4),
  }
}

/** 3 m tile: painted cement render with a fine sand texture and faint trowel marks. */
function renderMaps() {
  const S = 512
  const color = canvas(S, (ctx, s) => {
    ctx.fillStyle = '#ddd8cc'; ctx.fillRect(0, 0, s, s)
    mottle(ctx, s, 10, 0.12, '#ece8de', '#c2bcae', 91)
    for (let i = 0; i < 24; i++) { ctx.strokeStyle = `rgba(150,142,128,${0.05 + hash(i, 1, 6011) * 0.06})`; ctx.lineWidth = 4 + hash(i, 2, 6011) * 10; ctx.beginPath(); const x = hash(i, 3, 6011) * s, y = hash(i, 4, 6011) * s; ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 40, y + (hash(i, 5, 6011) - 0.5) * 60, x + 90, y); ctx.stroke() }
    grain(ctx, s, 26, 6)
  })
  const bump = canvas(S, (ctx, s) => { ctx.fillStyle = '#8a8a8a'; ctx.fillRect(0, 0, s, s); mottle(ctx, s, 60, 0.7, '#ffffff', '#000000', 7); grain(ctx, s, 70, 9) })
  return { map: tiled(tex(color), 3), bump: tiled(tex(bump, { srgb: false }), 3) }
}

/** Roof membrane: dark bitumen with gravel ballast. 2 m tile. */
function roofMaps() {
  const S = 256
  const color = canvas(S, (ctx, s) => {
    ctx.fillStyle = '#4b4c4f'; ctx.fillRect(0, 0, s, s)
    mottle(ctx, s, 14, 0.3, '#74757a', '#2b2c2f', 61)
    for (let i = 0; i < 1800; i++) { const g = 80 + hash(i, 3, 9973) * 110; ctx.fillStyle = `rgba(${g},${g},${g},0.7)`; ctx.fillRect(hash(i, 1, 9973) * s, hash(i, 2, 9973) * s, 1.5, 1.5) }
    grain(ctx, s, 14, 5)
  })
  const bump = canvas(S, (ctx, s) => { ctx.fillStyle = '#777'; ctx.fillRect(0, 0, s, s); grain(ctx, s, 120, 15) })
  return { map: tiled(tex(color), 2), bump: tiled(tex(bump, { srgb: false }), 2) }
}

/** Atlas (4 x 4 cells) for upper-storey glazing seen from outside: dark glass, blinds, lit rooms. */
function glazingAtlas() {
  const S = 512, C = 128
  const cellBase = (ctx, i, j, kind) => {
    const x = i * C, y = j * C
    const g = ctx.createLinearGradient(0, y, 0, y + C)
    if (kind === 0) { g.addColorStop(0, '#26323d'); g.addColorStop(1, '#11171d') }          // dark glass reflecting sky
    else if (kind === 1) { g.addColorStop(0, '#6d7377'); g.addColorStop(1, '#3d4348') }      // mid room, daylight
    else if (kind === 2) { g.addColorStop(0, '#c8b894'); g.addColorStop(1, '#8a7c5e') }      // lit warm room
    else { g.addColorStop(0, '#9fb4c4'); g.addColorStop(1, '#5e7384') }                     // lit cool room
    ctx.fillStyle = g; ctx.fillRect(x, y, C, C)
  }
  const color = canvas(S, (ctx) => {
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      cellBase(ctx, i, j, j)
      const x = i * C, y = j * C
      if (j === 1) { // half-drawn blinds
        const drop = 30 + hash(i, j, 83) * 60
        ctx.fillStyle = '#cfc7b6'; ctx.fillRect(x, y, C, drop)
        ctx.fillStyle = 'rgba(80,70,55,0.25)'
        for (let k = 0; k < drop; k += 5) ctx.fillRect(x, y + k, C, 1.2)
      }
      if (j >= 2) { // ceiling panel lights
        ctx.fillStyle = 'rgba(255,250,230,0.35)'; ctx.fillRect(x + 20, y + 10, 40, 6); ctx.fillRect(x + 70, y + 10, 40, 6)
      }
      if (j === 0) { ctx.fillStyle = 'rgba(180,205,225,0.10)'; ctx.beginPath(); ctx.moveTo(x, y + C); ctx.lineTo(x + 70, y); ctx.lineTo(x + 100, y); ctx.lineTo(x + 30, y + C); ctx.fill() }
    }
  })
  const lit = canvas(S, (ctx, s) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, s, s)
    for (let j = 2; j < 4; j++) for (let i = 0; i < 4; i++) {
      const g = ctx.createLinearGradient(0, j * C, 0, j * C + C)
      g.addColorStop(0, j === 2 ? '#ffd9a0' : '#cfe4ff'); g.addColorStop(1, j === 2 ? '#c98f4c' : '#7fa0c4')
      ctx.fillStyle = g; ctx.fillRect(i * C, j * C, C, C)
    }
  })
  return { map: tex(color), lit: tex(lit) }
}

/** vertical rain-streak alpha, and a ground-level grime gradient (both used as soft decals). */
function decalMaps() {
  const streak = canvas(128, (ctx, s) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, s, s)
    for (let i = 0; i < 26; i++) {
      const x = hash(i, 1, 331) * s, w = 1 + hash(i, 2, 331) * 4, len = s * (0.4 + hash(i, 3, 331) * 0.6)
      const g = ctx.createLinearGradient(0, 0, 0, len)
      g.addColorStop(0, `rgba(255,255,255,${0.5 + hash(i, 4, 331) * 0.5})`); g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g; ctx.fillRect(x, 0, w, len)
    }
    const top = ctx.createLinearGradient(0, 0, 0, 14); top.addColorStop(0, 'rgba(255,255,255,0.7)'); top.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = top; ctx.fillRect(0, 0, s, 14)
  })
  const grime = canvas(128, (ctx, s) => {
    const g = ctx.createLinearGradient(0, s, 0, 0)
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#7a7a7a'); g.addColorStop(1, '#000000')
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s)
    mottle(ctx, s, 10, 0.5, '#ffffff', '#000000', 5)
  })
  return { streak: tex(streak, { srgb: false }), grime: tex(grime, { srgb: false }) }
}

let cache
export function facadeMats() {
  if (cache) return cache
  const concrete = concreteMaps(), rend = renderMaps()
  const brick = brickMaps(), stone = stoneMaps(), granite = graniteMaps(), plaster = plasterMaps(), roof = roofMaps(), atlas = glazingAtlas(), decal = decalMaps()
  const std = (o) => new THREE.MeshStandardMaterial(o)
  const glazing = std({ map: atlas.map, emissive: '#ffffff', emissiveMap: atlas.lit, roughness: 0.14, metalness: 0.2, envMapIntensity: 0.9 })
  nightLit(glazing, 1.25, 0)
  cache = {
    brick: std({ map: brick.map, bumpMap: brick.bump, bumpScale: 2.2, roughnessMap: brick.rough, roughness: 1, metalness: 0 }),
    stone: std({ map: stone.map, bumpMap: stone.bump, bumpScale: 1.4, roughnessMap: stone.rough, roughness: 0.92, metalness: 0 }),
    stoneWall: std({ map: stone.map, bumpMap: stone.bump, bumpScale: 1.4, roughnessMap: stone.rough, roughness: 0.92, color: '#d6ccb8' }),
    concrete: std({ map: concrete.map, bumpMap: concrete.bump, bumpScale: 1.8, roughnessMap: concrete.rough, roughness: 1 }),
    render: std({ map: rend.map, bumpMap: rend.bump, bumpScale: 0.9, roughness: 0.95 }),
    granite: std({ map: granite.map, bumpMap: granite.bump, bumpScale: 0.8, roughness: 0.38, metalness: 0.05 }),
    plaster: std({ map: plaster.map, bumpMap: plaster.bump, bumpScale: 0.6, roughness: 0.92 }),
    roof: std({ map: roof.map, bumpMap: roof.bump, bumpScale: 1.6, roughness: 0.96 }),
    bronze: std({ color: '#2d2823', roughness: 0.42, metalness: 0.82, envMapIntensity: 1.1 }),
    marble: getMaterials().marbleWall(0.2, 0.2), // polished black marble cladding, 5 m tile
    brass: std({ color: '#b8935a', roughness: 0.3, metalness: 1, envMapIntensity: 1.2 }),
    steel: std({ color: '#7d8186', roughness: 0.45, metalness: 0.9, envMapIntensity: 1 }),
    glazing,
    /** clear shopfront glass: mostly transparent, reflective at grazing angles */
    glass: new THREE.MeshPhysicalMaterial({ color: '#cfe0ea', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, envMapIntensity: 2.4, depthWrite: false, reflectivity: 0.7, side: THREE.FrontSide }),
    /** glow of wall lamps and downlights (night only) */
    lamp: nightLit(std({ color: '#f4eee2', emissive: '#ffd9a0', roughness: 0.5 }), 5, 0),
    soffitStrip: nightLit(std({ color: '#2a1a28', emissive: '#e0559f', roughness: 0.6 }), 2.2, 0),
    streak: new THREE.MeshBasicMaterial({ color: '#2a251f', alphaMap: decal.streak, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    grime: new THREE.MeshBasicMaterial({ color: '#1f1c18', alphaMap: decal.grime, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  }
  const tints = new Map()
  /** a colour-tinted copy of a wall material (shares its textures), cached */
  cache.tint = (key, color) => {
    const k = key + color
    if (!tints.has(k)) { const m = cache[key].clone(); m.color = new THREE.Color(color); tints.set(k, m) }
    return tints.get(k)
  }
  return cache
}
