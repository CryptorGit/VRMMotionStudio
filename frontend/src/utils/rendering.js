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
  const updateTimes = []
  const renderTimes = []
  let lastPerfLogTime = 0

  function animate(time) {
    requestAnimationFrame(animate)
    const delta = clock.getDelta()
    if (time - lastFrameTime < 1000 / targetFps) return
    lastFrameTime = time

    const updateStart = performance.now()
    helper?.update(delta)
    updateTimes.push(performance.now() - updateStart)

    updateIKMarkers()

    const renderStart = performance.now()
    effect.render(scene, camera)
    renderTimes.push(performance.now() - renderStart)

    directionalLightHelper.update()

    if (time - lastPerfLogTime >= 1000) {
      const avgUpdate =
        updateTimes.reduce((a, b) => a + b, 0) / (updateTimes.length || 1)
      const avgRender =
        renderTimes.reduce((a, b) => a + b, 0) / (renderTimes.length || 1)
      console.log(
        `avg helper.update: ${avgUpdate.toFixed(2)}ms, avg effect.render: ${avgRender.toFixed(2)}ms`
      )
      updateTimes.length = 0
      renderTimes.length = 0
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
