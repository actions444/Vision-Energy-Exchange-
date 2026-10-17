// Time of day + weather. One store drives the sky, sun, clouds, rain, fog and every light
// that should switch on at dusk. Admins can change it (World admin panel); in multiplayer the
// server relays an admin's change to everyone in the room.
import { create } from 'zustand'
import * as THREE from 'three'

export const WEATHER = {
  clear: { label: 'Sunny', cloud: 0.18, rain: 0, storm: 0, snow: 0, fog: 0.0018, tempOffset: 0 },
  cloudy: { label: 'Cloudy', cloud: 0.62, rain: 0, storm: 0, snow: 0, fog: 0.0028, tempOffset: -2 },
  rain: { label: 'Rain', cloud: 0.85, rain: 1, storm: 0, snow: 0, fog: 0.0055, tempOffset: -3 },
  storm: { label: 'Thunderstorm', cloud: 0.97, rain: 1.4, storm: 1, snow: 0, fog: 0.0075, tempOffset: -4 },
  snow: { label: 'Snow', cloud: 0.8, rain: 0, storm: 0, snow: 1, fog: 0.0048, tempOffset: -18, cold: true },
  cold: { label: 'Cold', cloud: 0.3, rain: 0, storm: 0, snow: 0, fog: 0.0026, tempOffset: -14, cold: true },
}

export const useEnv = create((set) => ({
  time: 16.5, // hours, 0..24
  running: true,
  speed: 1, // in-world minutes per real second (1 = a full day every 24 minutes)
  weather: 'clear',
  set: (patch) => set(patch),
}))

// Smoothed per-frame values (not React state)
export const env = {
  sunDir: new THREE.Vector3(0, 1, 0),
  moonDir: new THREE.Vector3(0, -1, 0),
  elevation: 0, // sun elevation in radians
  day: 1, // 0 night .. 1 full day
  night: 0, // 0 day .. 1 full night (lights on)
  golden: 0, // sunrise/sunset warmth
  cloud: 0.2,
  rain: 0,
  storm: 0,
  snow: 0,
  wet: 0,
  cold: 0, // 0..1: eases toward 1 on 'snow'/'cold' weather, drives frost tint + breath vapor
  fog: 0.002,
  flash: 0,
}

export function formatTime(h) {
  const hh = Math.floor(h) % 24
  const mm = Math.floor((h - Math.floor(h)) * 60)
  const ampm = hh < 12 ? 'AM' : 'PM'
  return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${ampm}`
}

/** Sun position for an hour of the day: rises in the east (+x) around 6:15, sets in the west around 18:45. */
export function sunDirection(hours, out = new THREE.Vector3()) {
  const t = ((hours - 6.25) / 12.5) * Math.PI
  return out.set(Math.cos(t), Math.sin(t) * 0.87, Math.sin(t) * 0.45 + 0.15).normalize()
}
export function moonDirection(hours, out = new THREE.Vector3()) {
  const t = ((hours - 6.25) / 12.5) * Math.PI
  return out.set(-Math.cos(t) * 0.8, Math.max(0.25, -Math.sin(t) * 0.75), -0.35).normalize()
}

// ---- lights that react to darkness ----
// Emissive materials (windows, lamp heads, signs) scale with `env.night`.
const nightMats = new Map() // material -> { day, night }
export function nightLit(material, nightIntensity, dayIntensity = 0) {
  nightMats.set(material, { day: dayIntensity, night: nightIntensity })
  material.emissiveIntensity = dayIntensity
  return material
}
export function updateNightMaterials() {
  const n = env.night
  for (const [m, v] of nightMats) m.emissiveIntensity = v.day + (v.night - v.day) * n
}

// Surfaces that get glossier in the rain.
const wetMats = new Map()
export function wettable(material) {
  wetMats.set(material, material.roughness)
  return material
}
export function updateWetMaterials() {
  const w = env.wet
  for (const [m, r] of wetMats) m.roughness = r * (1 - 0.55 * w)
}

// ---- light anchors ----
// Instead of hundreds of real lights, places that need light register an anchor. A fixed pool of
// point lights follows the anchors closest to the camera (constant light count = no shader
// recompiles, steady frame rate on phones).
export const lightAnchors = []
export function registerLightAnchor(a) {
  // a = { position: Vector3, color, intensity, distance, night: bool (only at night) }
  lightAnchors.push(a)
  return () => {
    const i = lightAnchors.indexOf(a)
    if (i >= 0) lightAnchors.splice(i, 1)
  }
}
