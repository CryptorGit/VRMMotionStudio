export function createAnimator({
  clock,
  targetFps,
  helper,
  effect,
  scene,
  camera,
  updateIKMarkers,
  directionalLightHelper
}) {
  let lastFrameTime = 0
  let avgUpdate = 0
  let avgRender = 0
  let lastPerfLogTime = 0
  const smoothing = 0.1

  if (helper) {
    helper.enabled.ik = false
  }

  function animate(time) {
    requestAnimationFrame(animate)
    const delta = clock.getDelta()
    if (time - lastFrameTime < 1000 / targetFps) return
    lastFrameTime = time

    const updateStart = performance.now()
    if (helper) {
      helper.enabled.ik = false
      helper.update(delta)
    }
    const updateDuration = performance.now() - updateStart
    avgUpdate =
      avgUpdate === 0
        ? updateDuration
        : avgUpdate * (1 - smoothing) + updateDuration * smoothing

    updateIKMarkers()

    const renderStart = performance.now()
    effect.render(scene, camera)
    const renderDuration = performance.now() - renderStart
    avgRender =
      avgRender === 0
        ? renderDuration
        : avgRender * (1 - smoothing) + renderDuration * smoothing

    directionalLightHelper.update()

    if (time - lastPerfLogTime >= 1000) {
      if (import.meta.env.DEV) {
        console.log(
          `avg helper.update: ${avgUpdate.toFixed(2)}ms, avg effect.render: ${avgRender.toFixed(2)}ms`
        )
      }
      lastPerfLogTime = time
    }
  }

  return animate
}

export function handleWindowResize(camera, renderer, container) {
  camera.aspect = container.clientWidth / container.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.clientWidth, container.clientHeight)
}
