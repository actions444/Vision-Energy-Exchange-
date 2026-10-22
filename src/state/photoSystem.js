import { create } from 'zustand'

export const usePhotoGallery = create((set, get) => {
  const storageName = 'vswPhotos'

  // Load from localStorage
  const loadPhotos = () => {
    try {
      const saved = localStorage.getItem(storageName)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  }

  const savePhotos = (photos) => {
    try {
      localStorage.setItem(storageName, JSON.stringify(photos.slice(-50))) // Keep last 50 photos
    } catch {
      console.warn('Could not save photos to localStorage')
    }
  }

  return {
    photos: loadPhotos(),

    takePhoto: (canvas) => {
      try {
        const dataUrl = canvas.toDataURL('image/png')
        const photo = {
          id: Date.now(),
          dataUrl,
          timestamp: new Date().toISOString(),
          location: 'In-game'
        }
        const updated = [...get().photos, photo]
        savePhotos(updated)
        set({ photos: updated })
        return photo
      } catch (e) {
        console.error('Failed to take photo:', e)
        return null
      }
    },

    deletePhoto: (id) => {
      const updated = get().photos.filter(p => p.id !== id)
      savePhotos(updated)
      set({ photos: updated })
    },

    clearPhotos: () => {
      localStorage.removeItem(storageName)
      set({ photos: [] })
    },

    downloadPhoto: (id) => {
      const photo = get().photos.find(p => p.id === id)
      if (!photo) return

      const a = document.createElement('a')
      a.href = photo.dataUrl
      a.download = `photo_${photo.id}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }
})

/**
 * Capture the current canvas view
 * Call this from the game's renderer or a hook that has access to gl
 */
export function captureScreenshot(gl) {
  try {
    const canvas = gl.domElement
    const newCanvas = document.createElement('canvas')
    newCanvas.width = canvas.width
    newCanvas.height = canvas.height

    const ctx = newCanvas.getContext('2d')
    ctx.drawImage(canvas, 0, 0)

    return newCanvas
  } catch (e) {
    console.error('Screenshot failed:', e)
    return null
  }
}
