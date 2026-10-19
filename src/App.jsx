import Traffic, { signalState, trafficState } from './vehicles/Traffic.jsx'
import Taxis from './vehicles/Taxi.jsx'
import AirTraffic, { airState } from './world/AirTraffic.jsx'
import { Suspense, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { EffectComposer, Bloom, Vignette, DepthOfField, ToneMapping, Noise, HueSaturation, BrightnessContrast, ChromaticAberration, N8AO } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { Exposure } from './world/exposureEffect.js'
import * as THREE from 'three'
import City from './world/City.jsx'
import Gallery from './world/Gallery.jsx'
import Atmosphere from './world/Atmosphere.jsx'
import WeatherDirector from './world/WeatherDirector.jsx'
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
import Jets from './vehicles/Jet.jsx'
import CineStage, { CineFocus } from './world/CineStage.jsx'
import { useCine, cine, startCine, stopCine } from './state/cine.js'
import DecorLayer from './decor/DecorLayer.jsx'
import PhotoBooth from './rentals/PhotoBooth.jsx'
import { usePreview, useRentDraft, startTour } from './rentals/preview.js'
import { startDecor, useDecor } from './decor/decor.js'
import { useDriving, vehicleBodies, vehicleActions } from './vehicles/vehicles.js'
import { elevator, useElevatorUI } from './world/elevator.js'
import MusicZones from './music/MusicZones.jsx'
import { useMusicLibrary, resolveTrackSource } from './music/library.js'
import { musicEngine, useMusic } from './music/engine.js'
import { useLights, power } from './state/power.js'
import { useEnv } from './state/environment.js'
import { getCar, allCars } from './world/cars.js'
import { useJobs, washes, startWash } from './state/jobs.js'
import { useRentals, rentalAccess } from './rentals/client.js'
import { detectBackend, useBackend, backend } from './backend/backend.js'
import { startMedia, useMedia } from './media/media.js'
import { startCinema, runCinema, useCinema, cinemaVideo } from './cinema/cinema.js'
import { startGuide, useGuide, programFor, registry as guideRegistry } from './guide/guide.js'
import { runGuide } from './guide/guidePlayer.js'
import { useSocial, FOLLOWER_GATE } from './state/social.js'

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
      startGuide()
      startDecor()
      runCinema()
      runGuide()
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
  const cineOn = useCine((s) => s.active)
  const dofRef = useRef()
  return (
    <div className="app">
      <Canvas
        className="world"
        shadows={high ? 'soft' : false}
        dpr={high ? [1, 2] : [0.75, 1.25]}
        gl={{ antialias: !settings.bloom, powerPreference: 'high-performance' }}
        camera={{ fov: 55, near: 0.1, far: 1200, position: [20, 12, 10] }}
        onCreated={({ gl, scene, camera }) => {
          window.__vswScene = scene; window.__vswCam = camera
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
            <Jets />
            <CineStage />
            <Traffic />
            <Taxis />
            <DecorLayer />
            <CameraRig />
          </Physics>
          <Atmosphere />
          <WeatherDirector />
          {settings.aircraft !== false && <AirTraffic />}
          <MusicZones />
          <PhotoBooth />
          {(settings.bloom || cineOn) && (
            <EffectComposer multisampling={high ? 4 : 0}>
              <Exposure />
              {/* a punchier, more saturated "night-drive" grade is on by default (not just in
                  cinema mode) - richer neon, deeper blacks, a tighter vignette, closer to the
                  look of the city's own signage than a flat, literal render */}
              {high ? <N8AO aoRadius={2.4} intensity={2.4} distanceFalloff={1} quality="performance" halfRes /> : null}
              <Bloom mipmapBlur intensity={cineOn ? 0.75 : high ? 0.62 : 0.52} luminanceThreshold={cineOn ? 0.86 : 0.86} luminanceSmoothing={0.2} />
              <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
              {cineOn && high ? <DepthOfField ref={dofRef} worldFocusDistance={3} worldFocusRange={1.6} bokehScale={3.2} /> : null}
              <HueSaturation saturation={cineOn ? 0.08 : 0.13} />
              <BrightnessContrast brightness={cineOn ? -0.02 : -0.012} contrast={cineOn ? 0.18 : 0.15} />
              {cineOn ? <ChromaticAberration offset={[0.0006, 0.0006]} radialModulation modulationOffset={0.4} /> : null}
              {cineOn ? <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.14} /> : null}
              <Vignette offset={cineOn ? 0.15 : 0.24} darkness={cineOn ? 0.75 : 0.52} />
            </EffectComposer>
          )}
          <CineFocus dofRef={dofRef} />
          <Ready />
        </Suspense>
      </Canvas>
      <UI />
    </div>
  )
}

// expose for debugging in the console
if (typeof window !== 'undefined') window.__vsw = { input, useStore, useAssets, playerState, cameraState, musicEngine, useMusic, useMusicLibrary, resolveTrackSource, useEnv, useRentals, rentalAccess, useBackend, backend, useMedia, useCinema, cinemaVideo, useDriving, vehicleBodies, vehicleActions, signalState, trafficState, airState, useElevatorUI, elevatorCall: (f) => elevator.call(f), useDecor, usePreview, useRentDraft, startTour, useLights, power, getCar, allCars, useJobs, washes, startWash, useCine, cine, startCine, stopCine, useGuide, programFor, guideRegistry, useSocial, FOLLOWER_GATE }
