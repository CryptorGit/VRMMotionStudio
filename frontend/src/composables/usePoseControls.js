import { ref } from 'vue'

const TRACKER_TO_BONE = Object.freeze({
  head: 'head',
  chest: 'chest',
  hips: 'hips',
  leftUpperArm: 'leftUpperArm',
  rightUpperArm: 'rightUpperArm',
  leftHand: 'leftHand',
  rightHand: 'rightHand',
  leftElbow: 'leftLowerArm',
  rightElbow: 'rightLowerArm',
  leftKnee: 'leftLowerLeg',
  rightKnee: 'rightLowerLeg',
  leftFoot: 'leftFoot',
  rightFoot: 'rightFoot'
})

const CAMERA_TRACK_KEY = 'camera'
const GAZE_TRACK_KEY = 'gaze'
const DEFAULT_CURVE = Object.freeze({
  in: { x: 2 / 3, y: 2 / 3 },
  out: { x: 1 / 3, y: 1 / 3 }
})

function clamp01(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  if (num <= 0) return 0
  if (num >= 1) return 1
  return num
}

function sanitizeVector3(value) {
  if (Array.isArray(value) && value.length >= 3) {
    return [
      Number(value[0]) || 0,
      Number(value[1]) || 0,
      Number(value[2]) || 0
    ]
  }
  if (value && typeof value === 'object') {
    return ['x', 'y', 'z'].map(key => Number(value[key]) || 0)
  }
  return null
}

function sanitizeQuaternion(value) {
  let arr = null
  if (Array.isArray(value) && value.length >= 4) {
    arr = value.slice(0, 4)
  } else if (value && typeof value === 'object') {
    arr = ['x', 'y', 'z', 'w'].map(key => value[key])
  }
  if (!arr) return null
  const components = arr.map(component => Number(component) || 0)
  let magnitude = Math.hypot(components[0], components[1], components[2], components[3])
  if (!Number.isFinite(magnitude) || magnitude === 0) {
    components[0] = 0
    components[1] = 0
    components[2] = 0
    components[3] = 1
    magnitude = 1
  }
  return components.map(component => component / magnitude)
}

function sanitizeCurveEntry(curve) {
  const source = curve || {}
  return {
    in: {
      x: clamp01(source?.in?.x ?? DEFAULT_CURVE.in.x),
      y: clamp01(source?.in?.y ?? DEFAULT_CURVE.in.y)
    },
    out: {
      x: clamp01(source?.out?.x ?? DEFAULT_CURVE.out.x),
      y: clamp01(source?.out?.y ?? DEFAULT_CURVE.out.y)
    }
  }
}

function collectModelMetadata(modelList) {
  return (Array.isArray(modelList) ? modelList : []).map((model, index) => ({
    index,
    name: model?.name || `Model ${index + 1}`,
    visible: model?.visible !== false,
    url: model?.url || null
  }))
}

function pushFrame(store, name, frameIndex, time, transform) {
  if (!name || !transform) return
  const position = sanitizeVector3(transform.position ?? transform.value)
  const rotation = sanitizeQuaternion(transform.rotation ?? transform.quaternion)
  if (!position && !rotation) return
  if (!store[name]) store[name] = []
  const entry = { frame: frameIndex, time }
  if (position) entry.position = position
  if (rotation) entry.rotation = rotation
  store[name].push(entry)
}

function buildMotionPayload({ timelineData, trackerData, modelList, fps, fingerSnapshot }) {
  const bones = {}
  const cameraFrames = []
  const lookAtFrames = []
  const curveFrames = []
  const keyframes = Array.isArray(timelineData?.keyframes) ? timelineData.keyframes : []

  const startRaw = Number(timelineData?.startTime)
  const startTime = Number.isFinite(startRaw) ? startRaw : 0
  const durationRaw = Number(timelineData?.duration)
  const endRaw = Number(timelineData?.endTime)
  const inferredEnd = Number.isFinite(endRaw)
    ? endRaw
    : startTime + Math.max(0, Number.isFinite(durationRaw) ? durationRaw : 0)
  const endTime = Number.isFinite(inferredEnd) ? inferredEnd : startTime

  keyframes.forEach(keyframe => {
    const time = Number(keyframe?.time)
    if (!Number.isFinite(time)) return
    const frameIndex = Math.round(time * fps)

    const values = keyframe?.values && typeof keyframe.values === 'object'
      ? keyframe.values
      : {}

    for (const [key, value] of Object.entries(values)) {
      if (key === CAMERA_TRACK_KEY) {
        const position = sanitizeVector3(value?.position ?? value?.value)
        const rotation = sanitizeQuaternion(value?.rotation ?? value?.quaternion)
        if (position || rotation) {
          const entry = { frame: frameIndex, time }
          if (position) entry.position = position
          if (rotation) entry.rotation = rotation
          cameraFrames.push(entry)
        }
        continue
      }

      if (key === GAZE_TRACK_KEY) {
        const position = sanitizeVector3(value?.position ?? value?.value)
        if (position) {
          lookAtFrames.push({ frame: frameIndex, time, position })
        }
        continue
      }

      const boneName = TRACKER_TO_BONE[key]
      if (!boneName) continue
      pushFrame(bones, boneName, frameIndex, time, value)
    }

    const trackerCurves = {}
    const curveEntries = keyframe?.curves && typeof keyframe.curves === 'object'
      ? keyframe.curves
      : null

    if (curveEntries) {
      for (const [trackerKey, curveEntry] of Object.entries(curveEntries)) {
        trackerCurves[trackerKey] = {
          curve: sanitizeCurveEntry(curveEntry?.curve ?? curveEntry),
          color: typeof curveEntry?.color === 'string' ? curveEntry.color : '#5c8cff'
        }
      }
    } else if (keyframe?.curve) {
      trackerCurves.all = {
        curve: sanitizeCurveEntry(keyframe.curve),
        color: '#5c8cff'
      }
    }

    if (Object.keys(trackerCurves).length) {
      curveFrames.push({
        frame: frameIndex,
        time,
        trackers: trackerCurves
      })
    }
  })

  return {
    version: '1.0',
    type: 'vrm-motion',
    format: 'mmd-web',
    exporter: 'MokuMokuDanceWeb',
    exportDate: new Date().toISOString(),
    frameRate: fps,
    startTime,
    endTime,
    duration: Math.max(0, endTime - startTime),
    bones,
    camera: cameraFrames,
    lookAt: lookAtFrames,
    curves: curveFrames,
    trackers: trackerData || [],
    models: collectModelMetadata(modelList),
    fingers: fingerSnapshot
  }
}

async function saveFileBlob(blob, { suggestedName, description, extension, mimeType }) {
  if (window.showSaveFilePicker) {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [
        {
          description,
          accept: { [mimeType]: [extension] }
        }
      ]
    })
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
    return handle.name || suggestedName
  }

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = suggestedName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
  return suggestedName
}

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
  trackerController,
  showNotice,
  getFingerStates
}) {
  const poses = ref([])
  const selectedPose = ref(null)

  function applyPose() {}

  const resolveController = controller => {
    if (typeof controller === 'function') {
      try {
        return controller()
      } catch (error) {
        console.warn('[Export] Controller resolution failed', error)
        return null
      }
    }
    return controller || null
  }

  function captureFingerSnapshot() {
    if (typeof getFingerStates !== 'function') return {}
    try {
      const snapshot = getFingerStates()
      if (!snapshot || typeof snapshot !== 'object') return {}
      const result = {}
      for (const [key, value] of Object.entries(snapshot)) {
        const num = Number(value)
        result[key] = Number.isFinite(num) ? clamp01(num) : 0
      }
      return result
    } catch {
      return {}
    }
  }

  async function exportPose() {
    try {
      const timeline = resolveController(timelineController)
      const tracker = resolveController(trackerController)

      if (!timeline) {
        console.warn('[Export] Timeline controller unavailable')
        if (typeof showNotice === 'function') {
          showNotice('エクスポート: タイムラインが利用できません', 4200)
        }
        return
      }

      const models = typeof getModels === 'function' ? getModels() : (getModels?.value || [])
      const modelList = Array.isArray(models) ? models : []
      if (!modelList.length) {
        console.warn('[Export] No models loaded for export')
        if (typeof showNotice === 'function') {
          showNotice('エクスポート: 先にモデルを読み込んでください', 4200)
        }
        return
      }

      const fingerSnapshot = captureFingerSnapshot()
      const trackerData = tracker?.getAllTrackerStates ? tracker.getAllTrackerStates() : null
      const timelineData = timeline.serialize ? timeline.serialize() : null
      const fpsSource = timelineData?.frameRate ?? timeline?.frameRate?.value
      const fps = Math.max(1, Number(fpsSource) || 60)

      if (!timelineData || !Array.isArray(timelineData.keyframes) || timelineData.keyframes.length === 0) {
        const posePayload = exportCurrentPose(modelList, trackerData, fingerSnapshot)
        const json = JSON.stringify(posePayload, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        await saveFileBlob(blob, {
          suggestedName: `vrm-pose-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`,
          description: 'VRM Pose (JSON)',
          extension: '.json',
          mimeType: 'application/json'
        })
        if (typeof showNotice === 'function') {
          showNotice('エクスポート: 現在のポーズを保存しました', 3600)
        }
        return
      }

      const motionPayload = buildMotionPayload({
        timelineData,
        trackerData,
        modelList,
        fps,
        fingerSnapshot
      })
      const json = JSON.stringify(motionPayload, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      await saveFileBlob(blob, {
        suggestedName: `vrm-motion-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.vmc`,
        description: 'VRM Motion (VMC)',
        extension: '.vmc',
        mimeType: 'application/json'
      })
      if (typeof showNotice === 'function') {
        showNotice('エクスポート: VRMモーションを保存しました', 3600)
      }
    } catch (error) {
      console.error('[Export] Motion export failed', error)
      if (typeof showNotice === 'function') {
        showNotice('エクスポート: エラーが発生しました', 4800)
      }
    }
  }

  function exportCurrentPose(modelList, trackerData, fingerSnapshot) {
    return {
      version: '1.0',
      type: 'vrm-pose',
      format: 'mmd-web',
      exporter: 'MokuMokuDanceWeb',
      exportDate: new Date().toISOString(),
      trackers: trackerData || [],
      models: collectModelMetadata(modelList),
      fingers: fingerSnapshot
    }
  }

  // IK 連動の変換イベントは VRM 最適化のため削除

  return { poses, selectedPose, applyPose, exportPose }
}
