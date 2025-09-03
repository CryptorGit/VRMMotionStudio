import { onUnmounted, watch } from 'vue'
import { selectedIK } from '../utils/ik.js'
import { useIkDrag } from './useIkDrag.js'
import { useIkPhysics } from './useIkPhysics.js'
import { useIkSolver } from './useIkSolver.js'

export default function useIkControls(options) {
  const physics = useIkPhysics(options)
  const solver = useIkSolver({ ...options, ensureFloorRigidBody: physics.ensureFloorRigidBody })
  const drag = useIkDrag({
    ...options,
    scheduleIKUpdate: solver.scheduleIKUpdate,
    updateIKMarkersBound: solver.updateIKMarkersBound
  })

  function handlePointerMove(event) {
    if (!selectedIK.value && !drag.isRotating.value) return
    drag.onPointerMove(event)
  }

  function handlePointerUp(event) {
    if (!selectedIK.value && !drag.isRotating.value) return
    drag.onPointerUp(event)
  }

  let dom

  watch(
    () => options.renderer.value,
    renderer => {
      const newDom = renderer?.domElement
      if (dom) {
        dom.removeEventListener('pointermove', handlePointerMove)
        dom.removeEventListener('pointerup', handlePointerUp)
        window.removeEventListener('pointerup', handlePointerUp)
      }
      dom = newDom
      if (dom) {
        dom.addEventListener('pointermove', handlePointerMove)
        dom.addEventListener('pointerup', handlePointerUp)
        window.addEventListener('pointerup', handlePointerUp)
      }
    },
    { immediate: true }
  )

  onUnmounted(() => {
    if (dom) {
      dom.removeEventListener('pointermove', handlePointerMove)
      dom.removeEventListener('pointerup', handlePointerUp)
    }
    window.removeEventListener('pointerup', handlePointerUp)
    dom = null
  })
  return {
    ...drag,
    ...physics,
    applyIKUpdate: solver.applyIKUpdate,
    updateIKMarkersBound: solver.updateIKMarkersBound,
    initUpdateIKMarkers: solver.initUpdateIKMarkers
  }
}
export { useIkDrag, useIkPhysics, useIkSolver }
