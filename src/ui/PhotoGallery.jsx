import { useState, useRef } from 'react'
import { usePhotoGallery, captureScreenshot } from '../state/photoSystem.js'
import { useStore } from '../state/store.js'
import '../style/photoGallery.css'

export default function PhotoGallery() {
  const { photos, deletePhoto, downloadPhoto } = usePhotoGallery()
  const [showGallery, setShowGallery] = useState(false)
  const gl = window.__vswGl

  const handleScreenshot = () => {
    if (!gl) {
      useStore.getState().showToast('Camera not ready')
      return
    }

    const canvas = captureScreenshot(gl)
    if (canvas) {
      usePhotoGallery.getState().takePhoto(canvas)
      useStore.getState().showToast(`📸 Photo saved! (${photos.length + 1} total)`)
    }
  }

  return (
    <div className="photo-ui">
      <button
        className="photo-button"
        title="Take a screenshot (P)"
        onClick={handleScreenshot}
      >
        📷
      </button>

      {showGallery && (
        <div className="photo-gallery-panel">
          <div className="gallery-header">
            <h3>Photo Gallery ({photos.length})</h3>
            <button
              className="close-btn"
              onClick={() => setShowGallery(false)}
            >
              ✕
            </button>
          </div>

          {photos.length === 0 ? (
            <p className="empty-gallery">No photos yet. Press P to take a screenshot!</p>
          ) : (
            <div className="photos-grid">
              {photos
                .slice()
                .reverse()
                .map((photo) => (
                  <div key={photo.id} className="photo-card">
                    <img src={photo.dataUrl} alt="Photo" />
                    <div className="photo-info">
                      <small>{new Date(photo.timestamp).toLocaleString()}</small>
                    </div>
                    <div className="photo-actions">
                      <button
                        className="action-btn"
                        title="Download"
                        onClick={() => downloadPhoto(photo.id)}
                      >
                        ⬇
                      </button>
                      <button
                        className="action-btn delete"
                        title="Delete"
                        onClick={() => deletePhoto(photo.id)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      <button
        className="gallery-button"
        title="View photo gallery"
        onClick={() => setShowGallery(!showGallery)}
      >
        🖼 {photos.length}
      </button>
    </div>
  )
}
