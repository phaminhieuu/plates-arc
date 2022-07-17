import React, { useState } from 'react'
import { MeshPhysicalMaterial } from 'three'

class MaterialImpl extends MeshPhysicalMaterial {
  _flowMapScale
  _flowMapOffset
  _tDiffuse
  _tDiffuseBlur
  constructor(parameters = {}) {
    super(parameters)
    this.setValues(parameters)
    this._flowMapScale = { value: null }
    this._flowMapOffset = { value: null }
    this._tDiffuse = { value: null }
    this._tDiffuseBlur = { value: null }
  }

  onBeforeCompile(shader) {
    shader.uniforms.flowMapOffset = this._flowMapOffset
    shader.uniforms.flowMapScale = this._flowMapScale
    shader.uniforms.tDiffuse = this._tDiffuse
    shader.uniforms.tDiffuseBlur = this._tDiffuseBlur
    shader.vertexShader = `
        varying vec2 my_vUv;
     
      ${shader.vertexShader}
    `
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `
        #include <project_vertex>
        my_vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        `
    )
    shader.fragmentShader = `
        uniform sampler2D tDiffuse;
        uniform sampler2D tDiffuseBlur;
        uniform vec2 flowMapOffset;
        uniform vec2 flowMapScale;
        varying vec2 my_vUv;
        ${shader.fragmentShader}
    `
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
        #include <dithering_fragment>
        vec2 uv = fract(my_vUv * flowMapScale);
        vec2 aaa = uv - flowMapOffset;
        vec4 textureMap = texture2D(tDiffuse, aaa);
        vec4 textureBlur = texture2D(tDiffuseBlur, aaa);
        vec2 bbb = abs(aaa - 0.5);
        bbb *= bbb;
        gl_FragColor.rgb += smoothstep(0.0, 1.0, mix(textureMap.rgb, textureBlur.rgb, smoothstep(0.1, 0.3, bbb.x + bbb.y)));
      `
    )
  }

  get flowMapScale() {
    return this._flowMapScale.value
  }
  set flowMapScale(v) {
    this._flowMapScale.value = v
  }
  get flowMapOffset() {
    return this._flowMapOffset.value
  }
  set flowMapOffset(v) {
    this._flowMapOffset.value = v
  }
  get tDiffuse() {
    return this._tDiffuse.value
  }
  set tDiffuse(v) {
    this._tDiffuse.value = v
  }
  get tDiffuseBlur() {
    return this._tDiffuseBlur.value
  }
  set tDiffuseBlur(v) {
    this._tDiffuseBlur.value = v
  }
}

export const CustomMaterial = React.forwardRef((props, ref) => {
  const [material] = useState(() => new MaterialImpl())
  return <primitive object={material} ref={ref} attachArray="material" flowMapOffset={[0, 0]} flowMapScale={[1 / 3, 1 / 3]} {...props} />
})
