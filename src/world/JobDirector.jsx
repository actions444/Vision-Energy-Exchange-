import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { registerInteractable, playerState } from '../state/runtime.js'
import { registerLightAnchor, useEnv } from '../state/environment.js'
import { useStore } from '../state/store.js'
import { useJobs, currentStop } from '../state/jobs.js'
import { SITES, CURB, jobById } from '../config/jobs.js'

// Runs the jobs system inside the 3D world: time clocks, the gold beacon over the next stop, the
// task timer, and the payroll calendar (a world day passes each time the day/night clock wraps).

const FAR = new THREE.Vector3(0, -1000, 0)

export default function JobDirector() {
  const beacon = useRef()
  const ring = useRef()
  const last = useRef(null)
  const anchor = useMemo(() => ({ position: new THREE.Vector3(), color: '#ffd36b', intensity: 0, distance: 12, range: 90 }), [])
  const beamMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd36b', transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide }), [])
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd36b', transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), [])

  useEffect(() => {
    const toast = (t) => useStore.getState().showToast(t)
    const offs = [registerLightAnchor(anchor)]
    for (const s of Object.values(SITES)) {
      offs.push(registerInteractable('clock-' + s.id, {
        position: new THREE.Vector3(s.pos[0], CURB + 1, s.pos[1]),
        radius: 2.2,
        label: () => {
          const st = useJobs.getState()
          if (!st.shift) return `Time clock · clock in (${s.name})`
          return st.shift.siteId === s.id ? 'Time clock · clock out' : 'Time clock (you are clocked in elsewhere)'
        },
        onInteract: () => {
          const st = useJobs.getState()
          if (st.shift) { if (st.shift.siteId === s.id) st.clockOut(); else toast(`You are clocked in at ${SITES[st.shift.siteId].name}. Finish there or clock out first.`) } else st.clockIn(s.id)
        },
      }))
    }
    const v = new THREE.Vector3()
    offs.push(registerInteractable('work-stop', {
      position: () => { const st = currentStop(); return st ? v.set(st.x, CURB + 1, st.z) : FAR },
      radius: 2.6,
      label: () => { const st = currentStop(); const t = useJobs.getState().task; return !st ? 'Work' : t ? `${st.verb}…` : st.verb },
      onInteract: () => {
        const s = useJobs.getState()
        if (!s.shift) return
        if (s.task) { s.tagTask(); return }
        s.startTask()
      },
    }))
    return () => offs.forEach((o) => o())
  }, [anchor])

  useFrame((st) => {
    // payroll calendar: a day has passed when the clock wraps past midnight
    const time = useEnv.getState().time
    if (last.current != null && time < last.current - 12) useJobs.getState().advanceDay()
    last.current = time

    const s = useJobs.getState()
    const stop = currentStop()
    const on = !!(s.shift && stop)
    if (beacon.current) beacon.current.visible = on
    if (on) {
      beacon.current.position.set(stop.x, CURB, stop.z)
      const pulse = 0.5 + 0.5 * Math.sin(st.clock.elapsedTime * 3)
      beamMat.opacity = 0.22 + pulse * 0.2
      ring.current.scale.setScalar(1 + pulse * 0.15)
      anchor.position.set(stop.x, CURB + 2.5, stop.z)
      anchor.intensity = 14
    } else anchor.intensity = 0

    if (s.task) {
      const p = playerState.position
      const stp = currentStop()
      const dist = stp ? Math.hypot(stp.x - p.x, stp.z - p.z) : 99
      if (dist > 3.8) s.cancelTask('You walked away, so the task was cancelled. Go back and press E again.')
      else if (performance.now() - s.task.start >= s.task.secs * 1000) s.completeStop()
    }
  })

  return (
    <group ref={beacon} visible={false} userData={{ noBatch: true }}>
      <mesh position={[0, 9, 0]} material={beamMat}><cylinderGeometry args={[0.28, 0.28, 18, 16, 1, true]} /></mesh>
      <mesh ref={ring} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} material={ringMat}><ringGeometry args={[0.9, 1.2, 40]} /></mesh>
    </group>
  )
}
