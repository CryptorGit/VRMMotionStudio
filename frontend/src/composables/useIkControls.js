import { useIkDrag } from './useIkDrag.js'
import { useIkPhysics } from './useIkPhysics.js'
import { useIkSolver } from './useIkSolver.js'

export default function useIkControls(options) {
  const physics = useIkPhysics(options)
  const solver = useIkSolver({ ...options, ensureFloorRigidBody: physics.ensureFloorRigidBody })
  const drag = useIkDrag({ ...options, scheduleIKUpdate: solver.scheduleIKUpdate, applyIKUpdate: solver.applyIKUpdate })
  return {
    ...drag,
    ...physics,
    updateIKMarkersBound: solver.updateIKMarkersBound,
    initUpdateIKMarkers: solver.initUpdateIKMarkers
  }
}
export { useIkDrag, useIkPhysics, useIkSolver }
