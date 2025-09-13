export function createAnimator({
  clock,
  targetFps,
  helper,
  renderer,
  scene,
  camera,
  updateIKMarkers,
  directionalLightHelper,
  vrmGetter
}) {
  let lastFrameTime = 0
  let avgUpdate = 0
  let avgRender = 0
  let lastPerfLogTime = 0
  const smoothing = 0.1

  function animate(time) {
    requestAnimationFrame(animate)
    const delta = clock.getDelta()
    if (time - lastFrameTime < 1000 / targetFps) return
    lastFrameTime = time

    const updateStart = performance.now()
    if (helper.value) helper.value.update(delta)
    // Update VRM spring bones, lookAt, etc.
    try {
      const list = typeof vrmGetter === 'function' ? vrmGetter() : []
      if (Array.isArray(list)) {
        for (const v of list) v?.update?.(delta)
      }
    } catch {}
    const updateDuration = performance.now() - updateStart
    avgUpdate =
      avgUpdate === 0
        ? updateDuration
        : avgUpdate * (1 - smoothing) + updateDuration * smoothing

    updateIKMarkers()

    const renderStart = performance.now()
    if (scene.value && camera.value && renderer?.value?.render) {
      renderer.value.render(scene.value, camera.value)
    }
    const renderDuration = performance.now() - renderStart
    avgRender =
      avgRender === 0
        ? renderDuration
        : avgRender * (1 - smoothing) + renderDuration * smoothing

    directionalLightHelper.update()

    if (time - lastPerfLogTime >= 1000) {
      if (import.meta.env.DEV) {
        console.debug(
          `avg helper.update: ${avgUpdate.toFixed(2)}ms, avg render: ${avgRender.toFixed(2)}ms`
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
