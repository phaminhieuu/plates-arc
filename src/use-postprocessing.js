import { useMemo, useEffect } from 'react'
import { useFrame, useLoader, useThree } from 'react-three-fiber'
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BlurPass,
  BlendFunction,
  SMAAImageLoader,
  SavePass,
  SMAAEffect,
  HalfFloatType,
  NormalPass,
  PredicationMode,
  TextureEffect
} from 'postprocessing'

export default function usePostprocessing(targetScene, targetCamera) {
  const { gl, scene, size, camera } = useThree()
  const smaa = useLoader(SMAAImageLoader)

  const [composer, savePass, blurPass] = useMemo(() => {
    const composer = new EffectComposer(gl, { frameBufferType: HalfFloatType, multisampling: 0 })
    const renderPass = new RenderPass(scene, camera)
    const normalPass = new NormalPass(scene, camera)
    const targetRenderPass = new RenderPass(targetScene, targetCamera)
    const savePass = new SavePass()
    const savePassBlur = new SavePass()

    const SMAA = new SMAAEffect(...smaa)
    SMAA.edgeDetectionMaterial.setEdgeDetectionThreshold(0.05)
    SMAA.edgeDetectionMaterial.setPredicationMode(PredicationMode.DEPTH)
    SMAA.edgeDetectionMaterial.setPredicationThreshold(0.002)
    SMAA.edgeDetectionMaterial.setPredicationScale(1.0)
    const edgesTextureEffect = new TextureEffect({
      blendFunction: BlendFunction.SKIP,
      texture: SMAA.renderTargetEdges.texture
    })
    const weightsTextureEffect = new TextureEffect({
      blendFunction: BlendFunction.SKIP,
      texture: SMAA.renderTargetWeights.texture
    })
    const effectPass = new EffectPass(camera, SMAA, edgesTextureEffect, weightsTextureEffect)

    composer.addPass(targetRenderPass)
    composer.addPass(savePass)
    composer.addPass(
      new BlurPass({
        width: size.width,
        height: size.height
      })
    )
    composer.addPass(savePassBlur)
    composer.addPass(renderPass)
    composer.addPass(normalPass)
    composer.addPass(effectPass)
    return [composer, savePass, savePassBlur]
  }, [camera, gl, scene, targetCamera, targetScene, smaa, size])

  useEffect(() => composer.setSize(size.width, size.height), [composer, size])
  useFrame((_, delta) => void composer.render(delta), -1)

  return [savePass, blurPass]
}
