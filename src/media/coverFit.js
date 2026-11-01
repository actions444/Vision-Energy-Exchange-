import * as THREE from 'three'

/**
 * Crop a video texture so it fills a screen of the given aspect (width / height) without bars or
 * stretching: the picture is scaled to cover the screen and the overflow is cut from the edges.
 * Works on a clone of the texture (clones share the same video source).
 */
export function applyCover(texture, videoW, videoH, screenAspect) {
  if (!texture || !videoW || !videoH || !screenAspect) return
  const videoAspect = videoW / videoH
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
  if (videoAspect > screenAspect) {
    // video is wider than the screen: keep the middle part of its width
    const keep = screenAspect / videoAspect
    texture.repeat.set(keep, 1)
    texture.offset.set((1 - keep) / 2, 0)
  } else {
    // video is taller than the screen: keep the middle part of its height
    const keep = videoAspect / screenAspect
    texture.repeat.set(1, keep)
    texture.offset.set(0, (1 - keep) / 2)
  }
  texture.needsUpdate = true
}
