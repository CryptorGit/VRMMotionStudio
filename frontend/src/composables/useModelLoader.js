import { useModelCache } from './useModelCache.js'
import { useModelOperations } from './useModelOperations.js'
import { usePoseControls } from './usePoseControls.js'

export default function useModelLoader(options) {
  const cache = useModelCache()
  const operations = useModelOperations({ ...options, cache })
  const poseControls = usePoseControls({
    poses: operations.poses,
    selectedPose: operations.selectedPose,
    loader: operations.loader,
    helper: options.helper,
    currentMeshRef: options.currentMeshRef,
    updateIKMarkersBound: options.updateIKMarkersBound,
    menuOpen: options.menuOpen,
    logToServer: options.logToServer
  })

  async function restoreCachedModel() {
    const saved = await cache.loadCachedFiles()
    if (!saved.length) return
    const files = []
    for (const list of saved) {
      for (const f of list) {
        const file = new File([f.data], f.name, { type: f.type })
        if (f.path) Object.defineProperty(file, 'webkitRelativePath', { value: f.path })
        files.push(file)
      }
    }
    await operations.handleFiles(files)
  }

  return {
    poses: operations.poses,
    selectedPose: operations.selectedPose,
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
    restoreCachedModel
  }
}

export { useModelCache, useModelOperations, usePoseControls }
