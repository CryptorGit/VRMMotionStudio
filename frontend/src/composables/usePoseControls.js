import { ref } from 'vue'

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

  function applyPose() {}

  function exportPose() { /* VRM移行で未実装 */ }

  // IK 連動の変換イベントは VRM 最適化のため削除

  return { poses, selectedPose, applyPose, exportPose }
}
