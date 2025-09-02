import { ref } from 'vue'
import { useModelCache } from './useModelCache.js'
import { useModelOperations } from './useModelOperations.js'
import { usePoseControls } from './usePoseControls.js'

export default function useModelLoader(ctx) {
  const loader = ref(null)
  const cache = useModelCache()
  const pose = usePoseControls({
    loader,
    helper: ctx.helper,
    currentMeshRef: ctx.currentMeshRef,
    menuOpen: ctx.menuOpen,
    logToServer: ctx.logToServer,
    updateIKMarkersBound: ctx.updateIKMarkersBound,
    transformControls: ctx.transformControls,
    applyIKUpdate: ctx.applyIKUpdate
  })
  const ops = useModelOperations({
    ...ctx,
    loader,
    cache,
    poses: pose.poses,
    selectedPose: pose.selectedPose
  })
  return { ...cache, ...pose, ...ops, getLoader: () => loader.value }
}
