// Unified input state. Keyboard, touch joystick and pointer-drag camera all write here;
// the player controller and camera rig read it every frame. Kept outside React on purpose.
export const input = {
  move: { x: 0, y: 0 }, // x = strafe right, y = forward. Magnitude 0..1
  run: false,
  runToggle: false, // mobile run lock
  jump: false,
  brake: false, // held (Space while driving, Brake button on touch)
  interact: false, // edge-triggered; consumer clears it
  emote: null, // 'wave' edge-triggered
  look: { dx: 0, dy: 0 }, // accumulated camera drag in pixels; consumer clears it
  zoom: 0, // accumulated wheel delta; consumer clears it
  joystick: { x: 0, y: 0, active: false },
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

let installed = false
export function installKeyboard(handlers = {}) {
  if (installed) return () => {}
  installed = true
  const down = (e) => {
    if (e.code === 'Escape' && handlers.onKey) { handlers.onKey(e); return }
    if (isTyping(e)) return
    if (e.code === 'Space') { input.jump = true; input.brake = true; e.preventDefault() }
    if (e.code === 'KeyE' && !e.repeat) input.interact = true
    if (e.code === 'Digit1' && !e.repeat) input.emote = 'wave'
    if (handlers.onKey) handlers.onKey(e)
    keys.add(e.code)
    recompute()
  }
  const up = (e) => {
    keys.delete(e.code)
    if (e.code === 'Space') { input.jump = false; input.brake = false }
    recompute()
  }
  const blur = () => { keys.clear(); input.jump = false; input.brake = false; recompute() }
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

// Drag-to-look on the 3D canvas (mouse or any touch that isn't on the joystick/buttons).
export function attachLook(el) {
  const pointers = new Map()
  const onDown = (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
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
  const onUp = (e) => { pointers.delete(e.pointerId) }
  const onWheel = (e) => { input.zoom += e.deltaY; e.preventDefault() }
  el.addEventListener('pointerdown', onDown)
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', onUp)
  el.addEventListener('pointercancel', onUp)
  el.addEventListener('wheel', onWheel, { passive: false })
  return () => {
    el.removeEventListener('pointerdown', onDown)
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerup', onUp)
    el.removeEventListener('pointercancel', onUp)
    el.removeEventListener('wheel', onWheel)
  }
}
