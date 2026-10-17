import { useFrame, useThree } from '@react-three/fiber'

// three.js ignores material.envMapIntensity for the scene-wide environment (scene.environment uses scene.environmentIntensity
// for every material). To make one surface reflect less (or more) of the sky than the rest, give it the environment map
// explicitly and scale the intensity ourselves, following the scene's day/night intensity.
export function useEnvTune(getList) {
  const scene = useThree((s) => s.scene)
  useFrame(() => {
    const env = scene.environment
    if (!env) return
    const k = scene.environmentIntensity ?? 1
    for (const [m, f] of getList()) {
      if (m.envMap !== env) { m.envMap = env; m.needsUpdate = true }
      m.envMapIntensity = k * f
    }
  })
}
