import { useModelCache } from './useModelCache.js'
import { useModelOperations } from './useModelOperations.js'
import { usePoseControls } from './usePoseControls.js'

export function useModelLoader(options) {
  const cache = useModelCache()
  const poseControls = usePoseControls(options)
  const operations = useModelOperations({
    ...options,
    poses: poseControls.poses,
    selectedPose: poseControls.selectedPose,
    modelCache: cache
  })
  poseControls.setLoader(operations.loader)
  return {
    poses: poseControls.poses,
    selectedPose: poseControls.selectedPose,
    models: operations.models,
    onFileChange: operations.onFileChange,
    toggleModelVisibility: operations.toggleModelVisibility,
    toggleBoneVisibility: operations.toggleBoneVisibility,
    toggleBoneNameVisibility: operations.toggleBoneNameVisibility,
    removeModel: operations.removeModel,
    clearCache: operations.clearCache,
    handleFiles: operations.handleFiles,
    applyPose: poseControls.applyPose,
    exportPose: poseControls.exportPose,
    onDragOver: operations.onDragOver,
    onDragLeave: operations.onDragLeave,
    onDrop: operations.onDrop,
    restoreCachedModel: operations.restoreCachedModel
  }
}
