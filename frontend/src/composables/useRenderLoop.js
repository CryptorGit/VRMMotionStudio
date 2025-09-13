import { createAnimator, handleWindowResize } from '../utils/rendering.js'

export function useRenderLoop({
  clock,
  targetFps,
  helper,
  renderer,
  scene,
  camera,
  updateIKMarkers,
  directionalLightHelper,
  viewer,
  vrmGetter
}) {
  const animate = createAnimator({
    clock,
    targetFps,
    helper,
    renderer,
    scene,
    camera,
    updateIKMarkers,
    directionalLightHelper,
    vrmGetter
  })

  function onWindowResize() {
    handleWindowResize(camera.value, renderer.value, viewer.value)
  }

  return { animate, onWindowResize }
}
