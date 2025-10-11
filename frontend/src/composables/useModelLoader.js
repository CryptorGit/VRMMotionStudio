import { ref } from 'vue'
import { useModelCache } from './useModelCache.js'
import { useModelOperations } from './useModelOperations.js'
import { usePoseControls } from './usePoseControls.js'

export default function useModelLoader(ctx) {
  const loader = ref(null)
  const cache = useModelCache()
  
  // useModelOperations must be called first to get models
  const ops = useModelOperations({
    ...ctx,
    loader,
    cache,
    poses: ref([]),
    selectedPose: ref(null),
    onCachePersisted: ctx.onCachePersisted
  })
  
  // Now create pose controls with a getter for models
  const pose = usePoseControls({
    loader,
    helper: ctx.helper,
    currentMeshRef: ctx.currentMeshRef,
    menuOpen: ctx.menuOpen,
    logToServer: ctx.logToServer,
    updateIKMarkersBound: undefined,
    transformControls: ctx.transformControls,
    applyIKUpdate: undefined,
    getModels: () => ops.models,
    timelineController: ctx.timelineController,
    trackerController: ctx.trackerController
  })
  
  // Update ops with pose data
  ops.poses = pose.poses
  ops.selectedPose = pose.selectedPose
  
  return { ...cache, ...pose, ...ops, getLoader: () => loader.value }
}
