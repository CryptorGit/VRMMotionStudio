import { createAnimator, handleWindowResize } from '../utils/rendering.js'

export function useRenderLoop({
  clock,
  targetFps,
  helper,
  effect,
  scene,
  camera,
  updateIKMarkers,
  directionalLightHelper,
  renderer,
  viewer
}) {
  const animate = createAnimator({
    clock,
    targetFps,
    helper: helper.value,
    effect: effect.value,
    scene: scene.value,
    camera: camera.value,
    updateIKMarkers,
    directionalLightHelper
  })

  function onWindowResize() {
    handleWindowResize(camera.value, renderer.value, viewer.value)
  }

  return { animate, onWindowResize }
}
