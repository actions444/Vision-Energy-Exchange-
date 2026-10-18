import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import * as THREE from 'three'
import { input } from '../input/input.js'
import { cameraState, playerState } from '../state/runtime.js'
import { useStore } from '../state/store.js'
import { waterAt, waterFx } from '../state/water.js'

const MIN_D = 1.6
const MAX_D = 10

// Orbit-style third-person camera with collision: a ray from the head toward the camera
// pulls the camera in front of any wall so it never clips into buildings.
// On the title screen it flies a slow cinematic orbit over the gallery plaza instead.
/** Flag whether the camera is below a water surface (the UI tints the screen). */
const checkUnder = (cam) => { const w = waterAt(cam.position.x, cam.position.z); waterFx.under = !!w && cam.position.y < w.surf }

export default function CameraRig() {
  const { camera } = useThree()
  const { world, rapier } = useRapier()
  const smoothD = useRef(cameraState.distance)
  const target = useRef(new THREE.Vector3())
  const tmp = useRef(new THREE.Vector3())

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const phase = useStore.getState().phase

    if (phase !== 'playing') {
      const t = state.clock.elapsedTime * 0.06
      const cx = Math.sin(t) * 26
      const cz = -8 + Math.cos(t) * 26
      camera.position.lerp(tmp.current.set(cx, 9 + Math.sin(t * 2) * 2, cz), 1 - Math.exp(-2 * dt))
      camera.lookAt(0, 4, -26)
      input.look.dx = input.look.dy = 0
      return
    }

    // a scripted viewpoint (room photos) takes over the camera
    if (cameraState.override) {
      const o = cameraState.override
      camera.position.set(...o.pos)
      camera.lookAt(...o.look)
      checkUnder(camera)
      input.look.dx = input.look.dy = 0
      return
    }

    // apply drag / wheel
    const touchScale = useStore.getState().isTouch ? 0.007 : 0.005
    cameraState.yaw -= input.look.dx * touchScale
    cameraState.pitch = THREE.MathUtils.clamp(cameraState.pitch + input.look.dy * touchScale * 0.8, -0.35, 1.25)
    input.look.dx = input.look.dy = 0
    cameraState.distance = THREE.MathUtils.clamp(cameraState.distance + input.zoom * 0.004, MIN_D, MAX_D)
    input.zoom = 0

    const p = playerState.position
    target.current.lerp(tmp.current.set(p.x, p.y + 1.55, p.z), 1 - Math.exp(-18 * dt))
    const origin = target.current

    const cp = Math.cos(cameraState.pitch)
    const dir = new THREE.Vector3(Math.sin(cameraState.yaw) * cp, Math.sin(cameraState.pitch), Math.cos(cameraState.yaw) * cp)

    // camera collision: pull the camera to just in front of whatever the ray hits. The margin and
    // floor below must never exceed the hit distance itself - a fixed 0.4 m floor used to let the
    // camera clip straight through a wall or chair back whenever it sat closer than that (e.g.
    // sitting with your back against a wall), hiding the avatar inside the geometry.
    let allowed = cameraState.distance
    const ray = new rapier.Ray(origin, dir)
    const hit = world.castRay(ray, cameraState.distance + 0.3, true, undefined, undefined, undefined, undefined, (col) => col.handle !== playerState.colliderHandle && !col.isSensor() && !cameraState.ignore?.has(col.handle))
    if (hit) allowed = Math.max(0.08, hit.timeOfImpact - 0.08)
    // pull in fast, ease out slowly
    const rate = allowed < smoothD.current ? 25 : 4
    smoothD.current += (allowed - smoothD.current) * (1 - Math.exp(-rate * dt))

    camera.position.copy(origin).addScaledVector(dir, smoothD.current)
    camera.lookAt(origin)
    checkUnder(camera)
  })
  return null
}
