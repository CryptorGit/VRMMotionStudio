import { ref, watch, onUnmounted } from 'vue'
import { MMDExporter } from 'three/examples/jsm/exporters/MMDExporter.js'
import { selectedIK, normalizeBoneName } from '../utils/ik.js'

export function usePoseControls({
  loader,
  helper,
  currentMeshRef,
  menuOpen,
  logToServer,
  updateIKMarkersBound,
  transformControls,
  applyIKUpdate
}) {
  const poses = ref([])
  const selectedPose = ref(null)

  function applyPose() {
    if (!selectedPose.value || !loader.value || !currentMeshRef.value) return
    loader.value.loadVPD(selectedPose.value.url, true, pose => {
      const mesh = currentMeshRef.value
      helper.value.pose(mesh, pose)
      mesh.updateMatrixWorld(true)
      mesh.skeleton.update()
      helper.value?.update(0)
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
    mesh.updateMatrixWorld(true)
    mesh.skeleton.update()
    helper.value?.update(0)
    mesh.skeleton.update()
    mesh.updateMatrixWorld(true)
    updateIKMarkersBound.value?.(true)
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

  function handleTransformEvent() {
    const name = transformControls?.value?.object?.name
    if (name && /ik$/i.test(normalizeBoneName(name))) {
      applyIKUpdate()
    }
  }

  watch(
    () => transformControls?.value,
    tc => {
      if (!tc) return
      tc.addEventListener('dragging-changed', handleTransformEvent)
      tc.addEventListener('objectChange', handleTransformEvent)
    },
    { immediate: true }
  )

  onUnmounted(() => {
    const tc = transformControls?.value
    tc?.removeEventListener('dragging-changed', handleTransformEvent)
    tc?.removeEventListener('objectChange', handleTransformEvent)
  })

  return { poses, selectedPose, applyPose, exportPose }
}
