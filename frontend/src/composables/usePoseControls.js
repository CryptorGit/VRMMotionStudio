import { ref } from 'vue'
import { MMDExporter } from 'three/examples/jsm/exporters/MMDExporter.js'
import { selectedIK } from '../utils/ik.js'

export function usePoseControls({ loader, helper, currentMeshRef, menuOpen, logToServer, updateIKMarkersBound }) {
  const poses = ref([])
  const selectedPose = ref(null)

  function applyPose() {
    if (!selectedPose.value || !loader.value || !currentMeshRef.value) return
    loader.value.loadVPD(selectedPose.value.url, true, pose => {
      const mesh = currentMeshRef.value
      helper.value.pose(mesh, pose)
      mesh.skeleton.update()
      mesh.updateMatrixWorld(true)
      updateIKMarkersBound.value?.(true)
      logToServer({ event: 'pose', file: selectedPose.value.name })
    })
  }

  function exportPose() {
    const mesh = currentMeshRef.value
    if (!mesh) return
    selectedIK.value?.target.updateMatrixWorld(true)
    helper.value?.update(0)
    helper.value?.objects.get(mesh)?.ikSolver?.update()
    mesh.skeleton.update()
    mesh.updateMatrixWorld(true)
    const exporter = new MMDExporter()
    const result = exporter.parseVpd(mesh, 'pose', {})
    const blob = new Blob([result], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pose.vpd'
    a.click()
    URL.revokeObjectURL(url)
    logToServer({ event: 'export' })
    menuOpen.value = false
  }

  return { poses, selectedPose, applyPose, exportPose }
}
