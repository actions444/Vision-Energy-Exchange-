import { Uniform } from 'three'
import { Effect } from 'postprocessing'
import { wrapEffect } from '@react-three/postprocessing'

// The post-processing chain renders the scene in linear HDR, so the sky/sun exposure that the
// atmosphere sets on the renderer has to be applied here, ahead of the tone-mapping pass.
class ExposureEffectImpl extends Effect {
  constructor() {
    super('ExposureEffect', 'uniform float exposure;\nvoid mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) { outputColor = vec4(inputColor.rgb * exposure, inputColor.a); }', { uniforms: new Map([['exposure', new Uniform(1)]]) })
    this.renderer = null
  }
  update(renderer) { this.uniforms.get('exposure').value = renderer.toneMappingExposure * 2.0 }
}
export const Exposure = wrapEffect(ExposureEffectImpl)
