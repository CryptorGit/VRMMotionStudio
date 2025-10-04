import { useRenderLoop } from './useRenderLoop.js'
import { useThreeViewerInit } from './useThreeViewerInit.js'

export function useRenderer(ctx) {
  const { animate, onWindowResize } = useRenderLoop(ctx)
  const { init, cleanup } = useThreeViewerInit({ ...ctx, onWindowResize })
  return { animate, initRenderer: init, cleanupRenderer: cleanup }
}


