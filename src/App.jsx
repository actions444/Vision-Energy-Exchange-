import Traffic, { signalState, trafficState } from './vehicles/Traffic.jsx'
import AirTraffic, { airState } from './world/AirTraffic.jsx'
import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import City from './world/City.jsx'
import Gallery from './world/Gallery.jsx'
import Atmosphere from './world/Atmosphere.jsx'
import Player from './player/Player.jsx'
import CameraRig from './player/CameraRig.jsx'
import PlacedAssets from './assets/PlacedAssets.jsx'
import RemotePlayers from './net/RemotePlayers.jsx'
import { useStore } from './state/store.js'
import { useAssets } from './assets/assetStore.js'
import { installKeyboard, attachLook, input } from './input/input.js'
import { playerState, cameraState } from './state/runtime.js'
import UI from './ui/UI.jsx'
import Vehicles from './vehicles/Vehicle.jsx'
import DecorLayer from './decor/DecorLayer.jsx'
import PhotoBooth from './rentals/PhotoBooth.jsx'
import { usePreview, useRentDraft, startTour } from './rentals/preview.js'
import { startDecor, useDecor } from './decor/decor.js'
import { useDriving, vehicleBodies, vehicleActions } from './vehicles/vehicles.js'
import { elevator, useElevatorUI } from './world/elevator.js'
import MusicZones from './music/MusicZones.jsx'
import { useMusicLibrary, resolveTrackSource } from './music/library.js'
import { musicEngine, useMusic } from './music/engine.js'
import { useEnv } from './state/environment.js'
import { useRentals, rentalAccess } from './rentals/client.js'
import { detectBackend, useBackend, backend } from './backend/backend.js'
import { startMedia, useMedia } from './media/media.js'
import { startCinema, runCinema, useCinema, cinemaVideo } from './cinema/cinema.js'

function Ready() {
  useEffect(() => { useStore.setState({ ready: true }) }, [])
  return null
}

export default function App() {
  const settings = useStore((s) => s.settings)

  useEffect(() => {
    useAssets.getState().restore()
    // find the backend (hosted page, self-hosted server, or dev), then load the shared media
    // library and music setup from it
    detectBackend().finally(() => {
      startMedia()
      useMusicLibrary.getState().init()
      startCinema()
      startDecor()
      runCinema()
    })
    return installKeyboard({
      onKey: (e) => {
        const st = useStore.getState()
        if (e.code === 'Escape' && st.panel) st.closePanel()
        if (st.phase !== 'playing') return
        const drivingId = useDriving.getState().vehicleId
        if (drivingId && !e.repeat && (e.code === 'KeyF' || e.code === 'KeyR')) { const a = vehicleActions.get(drivingId); if (a) (e.code === 'KeyF' ? a.flip : a.reset)(); return }
        if (e.code === 'KeyB') st.panel?.type === 'assets' ? st.closePanel() : st.openPanel({ type: 'assets' })
        if (e.code === 'KeyT' || e.code === 'Enter') {
          const el = document.getElementById('chat-input')
          if (el) { e.preventDefault(); el.focus() }
        }
      },
    })
  }, [])

  const high = settings.quality === 'high'
  return (
    <div className="app">
      <Canvas
        className="world"
        shadows={high ? 'soft' : false}
        dpr={high ? [1, 2] : [0.75, 1.25]}
        gl={{ antialias: !settings.bloom, powerPreference: 'high-performance' }}
        camera={{ fov: 55, near: 0.1, far: 1200, position: [20, 12, 10] }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.05
          attachLook(gl.domElement)
          window.__vswGl = gl
          gl.domElement.addEventListener('contextmenu', (e) => e.preventDefault())
        }}
      >
        <color attach="background" args={['#07050c']} />
        <Suspense fallback={null}>
          <Physics timeStep={1 / 60} gravity={[0, -9.81, 0]}>
            <City />
            <Gallery />
            <PlacedAssets />
            <Player />
            <RemotePlayers />
            <Vehicles />
            <Traffic />
            <DecorLayer />
            <CameraRig />
          </Physics>
          <Atmosphere />
          {settings.aircraft !== false && <AirTraffic />}
          <MusicZones />
          <PhotoBooth />
          {settings.bloom && (
            <EffectComposer multisampling={high ? 4 : 0}>
              <Bloom mipmapBlur intensity={high ? 0.55 : 0.45} luminanceThreshold={0.92} luminanceSmoothing={0.15} />
              <Vignette offset={0.3} darkness={0.45} />
            </EffectComposer>
          )}
          <Ready />
        </Suspense>
      </Canvas>
      <UI />
    </div>
  )
}

// expose for debugging in the console
if (typeof window !== 'undefined') window.__vsw = { input, useStore, useAssets, playerState, cameraState, musicEngine, useMusic, useMusicLibrary, resolveTrackSource, useEnv, useRentals, rentalAccess, useBackend, backend, useMedia, useCinema, cinemaVideo, useDriving, vehicleBodies, vehicleActions, signalState, trafficState, airState, useElevatorUI, elevatorCall: (f) => elevator.call(f), useDecor, usePreview, useRentDraft, startTour }
