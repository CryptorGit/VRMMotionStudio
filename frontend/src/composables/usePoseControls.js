import { ref } from 'vue'
import { MMDExporter } from 'three/examples/jsm/exporters/MMDExporter.js'
import { selectedIK } from '../utils/ik.js'

export function usePoseControls({ helper, currentMeshRef, menuOpen, logToServer, updateIKMarkersBound }) {
  const poses = ref([])
  const selectedPose = ref(null)
  let loader = null

  function setLoader(l) {
    loader = l
  }

  function applyPose() {
    if (!selectedPose.value || !loader || !currentMeshRef.value) return
    loader.loadVPD(selectedPose.value.url, true, pose => {
      const mesh = currentMeshRef.value
      helper.value.pose(mesh, pose)
      mesh.skeleton.update()
      mesh.updateMatrixWorld(true)
      updateIKMarkersBound.value?.()
      logToServer({ event: 'pose', file: selectedPose.value.name })
    })
  }

  function exportPose() {
    const mesh = currentMeshRef.value
    if (!mesh) return
    selectedIK.value?.target.updateMatrixWorld(true)
    helper.value?.update(0)
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

  return { poses, selectedPose, applyPose, exportPose, setLoader }
}
