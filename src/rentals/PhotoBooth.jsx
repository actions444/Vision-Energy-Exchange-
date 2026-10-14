import { useFrame } from '@react-three/fiber'
import { cameraState } from '../state/runtime.js'
import { photoJob, finishPhotos } from './preview.js'

// Takes the room photos: moves the camera to each viewpoint, waits a few frames so the room's
// interior is shown and lit, renders once and keeps a small JPEG of the actual scene.
export default function PhotoBooth() {
  useFrame(({ gl, scene, camera }) => {
    const job = photoJob()
    if (!job) return
    if (job.wait > 0) { job.wait--; return }
    try {
      gl.render(scene, camera)
      const src = gl.domElement
      const w = 720, h = Math.round((w * src.height) / Math.max(1, src.width))
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      c.getContext('2d').drawImage(src, 0, 0, w, h)
      job.images.push({ label: job.views[job.i].label, url: c.toDataURL('image/jpeg', 0.82) })
    } catch (e) { console.warn('room photo failed', e) }
    job.i++
    if (job.i >= job.views.length) { finishPhotos(); return }
    cameraState.override = job.views[job.i]
    job.wait = 4
  })
  return null
}
