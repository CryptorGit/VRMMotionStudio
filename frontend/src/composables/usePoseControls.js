import { ref } from 'vue'

export function usePoseControls({
  loader,
  helper,
  currentMeshRef,
  menuOpen,
  logToServer,
  updateIKMarkersBound,
  transformControls,
  applyIKUpdate,
  getModels,
  timelineController,
  trackerController
}) {
  const poses = ref([])
  const selectedPose = ref(null)

  function applyPose() {}

  function exportPose() {
    try {
      // Resolve controllers - they might be getters or direct values
      let timeline = null
      let tracker = null
      
      if (typeof timelineController === 'function') {
        timeline = timelineController()
      } else if (timelineController) {
        timeline = timelineController
      }
      
      if (typeof trackerController === 'function') {
        tracker = trackerController()
      } else if (trackerController) {
        tracker = trackerController
      }
      
      // Get models
      const models = typeof getModels === 'function' ? getModels() : (getModels?.value || [])
      const modelList = Array.isArray(models) ? models : []
      
      if (!timeline) {
        console.warn('[Export] エクスポート失敗: タイムラインコントローラーが利用できません')
        if (typeof logToServer === 'function') {
          logToServer('エクスポート: タイムラインコントローラーが見つかりません', 'error')
        }
        return
      }
      
      if (!modelList || modelList.length === 0) {
        console.warn('[Export] エクスポート失敗: モデルが読み込まれていません')
        if (typeof logToServer === 'function') {
          logToServer('エクスポート: モデルを先に読み込んでください', 'warn')
        }
        return
      }

      // Get timeline data
      const timelineData = timeline.serialize()
      
      if (!timelineData || !timelineData.keyframes || timelineData.keyframes.length === 0) {
        console.warn('[Export] エクスポート失敗: タイムラインにキーフレームがありません')
        if (typeof logToServer === 'function') {
          logToServer('エクスポート: キーフレームを追加してください', 'warn')
        }
        return
      }
      
      // Get tracker states
      let trackerData = null
      if (tracker && tracker.getAllTrackerStates) {
        trackerData = tracker.getAllTrackerStates()
      }

      // Create VRM motion data structure (VMC protocol compatible)
      const motionData = {
        version: '1.0',
        type: 'vrm-motion',
        format: 'mmd-web', // アプリケーション識別子
        exportDate: new Date().toISOString(),
        frameRate: timelineData.frameRate || 60,
        startTime: timelineData.startTime || 0,
        endTime: timelineData.endTime || 0,
        duration: (timelineData.endTime || 0) - (timelineData.startTime || 0),
        keyframes: timelineData.keyframes.map(kf => ({
          id: kf.id,
          time: kf.time,
          frame: Math.round(kf.time * (timelineData.frameRate || 60)),
          values: kf.values || {},
          curves: kf.curves || kf.curve ? { all: { curve: kf.curve, color: '#5c8cff' } } : {}
        })),
        trackers: trackerData || [],
        models: modelList.map((m, index) => ({
          index,
          name: m.name || `Model ${index + 1}`,
          visible: m.visible !== false,
          url: m.url || null
        }))
      }

      // Export as JSON
      const json = JSON.stringify(motionData, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
      const filename = `vrm-motion-${timestamp}.json`
      
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
      
      console.log('[Export] モーションエクスポート成功:', filename)
      if (typeof logToServer === 'function') {
        logToServer(`モーションをエクスポートしました: ${filename}`, 'success')
      }
    } catch (error) {
      console.error('[Export] エクスポート失敗:', error)
      if (typeof logToServer === 'function') {
        logToServer('エクスポート: エラーが発生しました', 'error')
      }
    }
  }

  // IK 連動の変換イベントは VRM 最適化のため削除

  return { poses, selectedPose, applyPose, exportPose }
}
