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

  function exportPose() { /* VRM遘ｻ陦後〒譛ｪ螳溯｣・*/ }

  // IK 騾｣蜍輔・螟画鋤繧､繝吶Φ繝医・ VRM 譛驕ｩ蛹悶・縺溘ａ蜑企勁

  return { poses, selectedPose, applyPose, exportPose }
}


