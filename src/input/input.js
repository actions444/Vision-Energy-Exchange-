// Unified input state. Keyboard, touch joystick and pointer-drag camera all write here;
// the player controller and camera rig read it every frame. Kept outside React on purpose.
import * as THREE from 'three'

export const input = {
  move: { x: 0, y: 0 }, // x = strafe right, y = forward. Magnitude 0..1
  run: false,
  runToggle: false, // mobile run lock
  jump: false,
  up: false, // held: swim up / surface (Space or the Up button)
  dive: false, // held: dive deeper (C, Ctrl or the Dive button)
  brake: false, // held (Space while driving, Brake button on touch)
  interact: false, // edge-triggered; consumer clears it
  emote: null, // 'wave' edge-triggered
  look: { dx: 0, dy: 0 }, // accumulated camera drag in pixels; consumer clears it
  zoom: 0, // accumulated wheel delta; consumer clears it
  joystick: { x: 0, y: 0, active: false },
  // Tap-to-move: tap open ground (a quick tap on the canvas, not a drag) and the player walks
  // there on their own, same as holding a direction - no new movement code, this just feeds the
  // same input.move the joystick/WASD already feed, computed fresh every frame in Player.jsx
  // toward { x, z }. Any manual move input (a key, or the joystick) cancels it, in recompute()
  // below, so there's no fight between "walk where I tapped" and "walk where I'm pushing".
  nav: { x: 0, z: 0, active: false },
}

const keys = new Set()

function isTyping(e) {
  const t = e.target
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
}

function recompute() {
  let x = 0
  let y = 0
  if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1
  if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1
  const j = input.joystick
  if (j.active) {
    x = j.x
    y = j.y
  } else {
    const len = Math.hypot(x, y)
    if (len > 1) { x /= len; y /= len }
  }
  input.move.x = x
  input.move.y = y
  input.run = keys.has('ShiftLeft') || keys.has('ShiftRight') || input.runToggle || (j.active && Math.hypot(j.x, j.y) > 0.92)
  // a key or the joystick is a manual override - whatever tap-to-move was doing, this wins
  if (x !== 0 || y !== 0) input.nav.active = false
}

export function setJoystick(x, y, active) {
  input.joystick.x = x
  input.joystick.y = y
  input.joystick.active = active
  recompute()
}

export function setRunToggle(v) {
  input.runToggle = v
  recompute()
}

/** Tap-to-move: head toward this ground point (world x/z) until arrival or a manual move cancels it. */
export function setNavTarget(x, z) {
  input.nav.x = x
  input.nav.z = z
  input.nav.active = true
}

export function clearNavTarget() {
  input.nav.active = false
}

let installed = false
export function installKeyboard(handlers = {}) {
  if (installed) return () => {}
  installed = true
  const down = (e) => {
    if (e.code === 'Escape' && handlers.onKey) { handlers.onKey(e); return }
    if (isTyping(e)) return
    if (e.code === 'Space') { input.jump = true; input.up = true; input.brake = true; e.preventDefault() }
    if (e.code === 'KeyC' || e.code === 'ControlLeft') input.dive = true
    if (e.code === 'KeyE' && !e.repeat) input.interact = true
    if (e.code === 'Digit1' && !e.repeat) input.emote = 'wave'
    if (handlers.onKey) handlers.onKey(e)
    keys.add(e.code)
    recompute()
  }
  const up = (e) => {
    keys.delete(e.code)
    if (e.code === 'Space') { input.jump = false; input.up = false; input.brake = false }
    if (e.code === 'KeyC' || e.code === 'ControlLeft') input.dive = false
    recompute()
  }
  const blur = () => { keys.clear(); input.jump = false; input.up = false; input.dive = false; input.brake = false; recompute() }
  window.addEventListener('keydown', down)
  window.addEventListener('keyup', up)
  window.addEventListener('blur', blur)
  return () => {
    installed = false
    window.removeEventListener('keydown', down)
    window.removeEventListener('keyup', up)
    window.removeEventListener('blur', blur)
  }
}

// A quick tap (not a drag) on open ground sets a tap-to-move target: cast a ray from the camera
// through the tap point out to the ground plane (y = 0). Only x/z are used - the player's own
// ground-snapping in Player.jsx already handles actual floor height - so this stays a plain math
// ray against an infinite plane, never a scene raycast, which keeps it cheap and side-effect-free
// (no new colliders, no per-frame physics query, nothing that touches the world).
let _raycaster = null
function tapToGround(clientX, clientY, el) {
  const cam = window.__vswCam
  if (!cam) return
  if (!_raycaster) _raycaster = new THREE.Raycaster()
  const rect = el.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1
  const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1
  _raycaster.setFromCamera({ x: ndcX, y: ndcY }, cam)
  const dir = _raycaster.ray.direction, origin = _raycaster.ray.origin
  if (Math.abs(dir.y) < 1e-4) return // looking at (or above) the horizon - no ground point
  const t = -origin.y / dir.y
  if (!(t > 0) || !isFinite(t) || t > 2000) return // behind the camera, or absurdly far off
  setNavTarget(origin.x + dir.x * t, origin.z + dir.z * t)
}

// Drag-to-look on the 3D canvas (mouse or any touch that isn't on the joystick/buttons). A
// press that barely moves and releases quickly is a tap instead of a drag, and sets a
// tap-to-move target rather than nudging the camera.
export function attachLook(el) {
  const pointers = new Map()
  const onDown = (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, startT: performance.now() })
    try { el.setPointerCapture(e.pointerId) } catch {}
  }
  const onMove = (e) => {
    const p = pointers.get(e.pointerId)
    if (!p) return
    input.look.dx += e.clientX - p.x
    input.look.dy += e.clientY - p.y
    p.x = e.clientX
    p.y = e.clientY
  }
  const onUp = (e) => {
    const p = pointers.get(e.pointerId)
    pointers.delete(e.pointerId)
    if (!p) return
    const dist = Math.hypot(e.clientX - p.startX, e.clientY - p.startY)
    if (dist < 8 && performance.now() - p.startT < 350) tapToGround(e.clientX, e.clientY, el)
  }
  const onCancel = (e) => { pointers.delete(e.pointerId) } // interrupted (e.g. a scroll took over) - not a tap
  const onWheel = (e) => { input.zoom += e.deltaY; e.preventDefault() }
  el.addEventListener('pointerdown', onDown)
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', onUp)
  el.addEventListener('pointercancel', onCancel)
  el.addEventListener('wheel', onWheel, { passive: false })
  return () => {
    el.removeEventListener('pointerdown', onDown)
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerup', onUp)
    el.removeEventListener('pointercancel', onCancel)
    el.removeEventListener('wheel', onWheel)
  }
}
