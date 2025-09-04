// Dev logging helper (dev server captures at /__dev__/log)
const devLog = data => {
  try {
    if (typeof fetch === 'function' && typeof window !== 'undefined') {
      fetch('/__dev__/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'render', ...data })
      }).catch(() => {})
    }
  } catch {}
}

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

  function animate(time) {
    requestAnimationFrame(animate)
    const delta = clock.getDelta()
    if (time - lastFrameTime < 1000 / targetFps) return
    lastFrameTime = time

    const updateStart = performance.now()
    if (helper.value) {
      helper.value.update(delta)
    }
    const updateDuration = performance.now() - updateStart
    avgUpdate =
      avgUpdate === 0
        ? updateDuration
        : avgUpdate * (1 - smoothing) + updateDuration * smoothing

    updateIKMarkers()

    const renderStart = performance.now()
    if (effect.value && scene.value && camera.value) {
      effect.value.render(scene.value, camera.value)
    }
    const renderDuration = performance.now() - renderStart
    avgRender =
      avgRender === 0
        ? renderDuration
        : avgRender * (1 - smoothing) + renderDuration * smoothing

    directionalLightHelper.update()

    if (time - lastPerfLogTime >= 1000) {
      if (import.meta.env.DEV) {
        try {
          devLog({
            event: 'render:perf',
            avgUpdate: +avgUpdate.toFixed(2),
            avgRender: +avgRender.toFixed(2)
          })
        } catch {}
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
