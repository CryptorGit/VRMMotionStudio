import { onMounted, onUnmounted, nextTick } from 'vue'
import { selectedIK } from '../utils/ik.js'
import { useIkDrag } from './useIkDrag.js'
import { useIkPhysics } from './useIkPhysics.js'
import { useIkSolver } from './useIkSolver.js'

export default function useIkControls(options) {
  const physics = useIkPhysics(options)
  const solver = useIkSolver(options)
  const drag = useIkDrag({ ...options, scheduleIKUpdate: solver.scheduleIKUpdate, applyIKUpdate: solver.applyIKUpdate })

  function handlePointerMove(event) {
    if (!selectedIK.value && !drag.isRotating.value) return
    drag.onPointerMove(event)
  }

  function handlePointerUp(event) {
    if (!selectedIK.value && !drag.isRotating.value) return
    drag.onPointerUp(event)
  }

  onMounted(() => {
    nextTick(() => {
      const dom = options.renderer.value?.domElement
      if (!dom) return
      dom.addEventListener('pointermove', handlePointerMove)
      dom.addEventListener('pointerup', handlePointerUp)
    })
  })

  onUnmounted(() => {
    const dom = options.renderer.value?.domElement
    if (!dom) return
    dom.removeEventListener('pointermove', handlePointerMove)
    dom.removeEventListener('pointerup', handlePointerUp)
  })
  return {
    ...drag,
    ...physics,
    updateIKMarkersBound: solver.updateIKMarkersBound,
    initUpdateIKMarkers: solver.initUpdateIKMarkers
  }
}
export { useIkDrag, useIkPhysics, useIkSolver }
