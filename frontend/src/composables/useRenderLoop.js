import { createAnimator } from '../utils/rendering.js'

export function useRenderLoop({ clock, helper, effect, scene, camera, updateIKMarkers, directionalLightHelper, targetFps }) {
  const animate = createAnimator({
    clock,
    targetFps,
    helper,
    effect,
    scene,
    camera,
    updateIKMarkers,
    directionalLightHelper
  })

  function start() {
    animate(0)
  }

  return { start }
}
