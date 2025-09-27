import { computed, ref, reactive, watch } from 'vue'
import * as THREE from 'three'

let nextKeyframeId = 1
let nextMarkerId = 1

function clonePosition(pos) {
  if (!pos) return [0, 0, 0]
  if (Array.isArray(pos)) return pos.slice(0, 3)
  if (pos.isVector3) return [pos.x, pos.y, pos.z]
  return [Number(pos?.x) || 0, Number(pos?.y) || 0, Number(pos?.z) || 0]
}

function lerpVector(a, b, t) {
  const out = [0, 0, 0]
  for (let i = 0; i < 3; i++) {
    const av = Array.isArray(a) ? a[i] : a?.[i]
    const bv = Array.isArray(b) ? b[i] : b?.[i]
    out[i] = (av ?? 0) + ((bv ?? 0) - (av ?? 0)) * t
  }
  return out
}

export function useTimeline({ trackers }) {
  const startTime = ref(0)
  const endTime = ref(30)
  const currentTime = ref(0)
  const isPlaying = ref(false)
  const loopPlayback = ref(false)
  const frameRate = ref(60)
  const keyframes = reactive({})
  const lastAppliedValues = reactive({})
  const markers = ref([])

  let lastStepTime = performance.now()

  const duration = computed(() => Math.max(0, endTime.value - startTime.value))

  function ensureTrackKey(key) {
    if (!keyframes[key]) keyframes[key] = []
    return keyframes[key]
  }

  function addKeyframe({ trackerKey, time, position }) {
    if (!trackerKey || typeof time !== 'number') return null
    const arr = ensureTrackKey(trackerKey)
    const safePos = clonePosition(position)
    const clampedTime = Math.min(Math.max(time, startTime.value), endTime.value)
    const entry = { id: nextKeyframeId++, time: clampedTime, value: safePos }
    arr.push(entry)
    arr.sort((a, b) => a.time - b.time)
    lastAppliedValues[trackerKey] = safePos
    return entry
  }

  function addSnapshotAtTime(time) {
    const result = []
    const list = trackers?.value || []
    for (const t of list) {
      if (!t?.key || !t?.mesh) continue
      const position = clonePosition(t.mesh.position)
      const entry = addKeyframe({ trackerKey: t.key, time, position })
      if (entry) result.push(entry)
    }
    return result
  }

  function removeKeyframe(trackerKey, id) {
    const arr = keyframes[trackerKey]
    if (!arr?.length) return
    const idx = arr.findIndex(k => k.id === id)
    if (idx === -1) return
    arr.splice(idx, 1)
  }

  function updateKeyframeTime(trackerKey, id, nextTime) {
    const arr = keyframes[trackerKey]
    if (!arr?.length) return
    const target = arr.find(k => k.id === id)
    if (!target) return
    if (!Number.isFinite(nextTime)) return
    target.time = Math.min(Math.max(nextTime, startTime.value), endTime.value)
    arr.sort((a, b) => a.time - b.time)
  }

  function clearTrack(trackerKey) {
    if (keyframes[trackerKey]) keyframes[trackerKey] = []
  }

  function clearAll() {
    for (const key of Object.keys(keyframes)) keyframes[key] = []
    markers.value = []
  }

  function getTrackAtTime(trackerKey, time) {
    const arr = keyframes[trackerKey]
    if (!arr?.length) return null
    if (time <= arr[0].time) return arr[0].value
    const last = arr[arr.length - 1]
    if (time >= last.time) return last.value
    for (let i = 0; i < arr.length - 1; i++) {
      const a = arr[i]
      const b = arr[i + 1]
      if (time >= a.time && time <= b.time) {
        const span = b.time - a.time || 1
        const alpha = (time - a.time) / span
        return lerpVector(a.value, b.value, alpha)
      }
    }
    return last.value
  }

  function applyPoseAt(time) {
    const list = trackers?.value || []
    for (const t of list) {
      if (!t?.key || !t?.mesh) continue
      const pos = getTrackAtTime(t.key, time)
      if (!pos) continue
      const cached = lastAppliedValues[t.key]
      if (cached && cached[0] === pos[0] && cached[1] === pos[1] && cached[2] === pos[2]) continue
      t.mesh.position.set(pos[0], pos[1], pos[2])
      lastAppliedValues[t.key] = pos
    }
  }

  function applyCurrentPose() {
    applyPoseAt(currentTime.value)
  }

  function step() {
    const now = performance.now()
    const delta = (now - lastStepTime) / 1000
    lastStepTime = now
    if (isPlaying.value) {
      let next = currentTime.value + delta
      const rangeEnd = endTime.value
      const rangeStart = startTime.value
      if (loopPlayback.value && duration.value > 0) {
        if (next > rangeEnd) {
          const span = duration.value
          const overflow = (next - rangeStart) % span
          next = rangeStart + overflow
        }
      } else if (next >= rangeEnd) {
        next = rangeEnd
        isPlaying.value = false
      }
      currentTime.value = Math.min(Math.max(next, rangeStart), rangeEnd)
    }
    applyCurrentPose()
  }

  function setCurrentTime(time) {
    const clamped = Math.min(Math.max(time, startTime.value), endTime.value)
    currentTime.value = clamped
    applyCurrentPose()
    lastStepTime = performance.now()
  }

  function play() {
    if (currentTime.value >= endTime.value) currentTime.value = startTime.value
    isPlaying.value = true
    lastStepTime = performance.now()
  }

  function pause() {
    isPlaying.value = false
  }

  function stop() {
    isPlaying.value = false
    setCurrentTime(startTime.value)
  }

  function setDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return
    endTime.value = startTime.value + seconds
    if (currentTime.value > endTime.value) currentTime.value = endTime.value
  }

  function setFrameRate(fps) {
    if (!Number.isFinite(fps) || fps <= 0) return
    frameRate.value = fps
  }

  function setRange(start, end) {
    if (!Number.isFinite(start) || !Number.isFinite(end)) return
    const s = Math.min(start, end)
    const e = Math.max(start, end)
    if (e === s) return
    startTime.value = s
    endTime.value = e
    if (currentTime.value < s) currentTime.value = s
    if (currentTime.value > e) currentTime.value = e
  }

  function setRangeFromFrames(startFrame, endFrame) {
    if (!Number.isFinite(startFrame) || !Number.isFinite(endFrame)) return
    const s = Math.min(startFrame, endFrame)
    const e = Math.max(startFrame, endFrame)
    if (e === s) return
    const fps = frameRate.value || 60
    setRange(s / fps, e / fps)
  }

  function stepByFrames(deltaFrames) {
    if (!Number.isFinite(deltaFrames)) return
    const fps = frameRate.value || 60
    const offset = deltaFrames / fps
    setCurrentTime(currentTime.value + offset)
  }

  function jumpToFrame(frame) {
    if (!Number.isFinite(frame)) return
    const fps = frameRate.value || 60
    const time = frame / fps
    setCurrentTime(time)
  }

  function addMarker({ time, label }) {
    if (!Number.isFinite(time)) return null
    const entry = {
      id: nextMarkerId++,
      time: Math.min(Math.max(time, startTime.value), endTime.value),
      label: label || `Marker ${nextMarkerId - 1}`
    }
    markers.value = [...markers.value, entry].sort((a, b) => a.time - b.time)
    return entry
  }

  function updateMarker(id, payload) {
    markers.value = markers.value.map(marker => {
      if (marker.id !== id) return marker
      const next = { ...marker }
      if (payload?.time !== undefined && Number.isFinite(payload.time)) {
        next.time = Math.min(Math.max(payload.time, startTime.value), endTime.value)
      }
      if (payload?.label !== undefined) next.label = payload.label
      return next
    }).sort((a, b) => a.time - b.time)
  }

  function removeMarker(id) {
    markers.value = markers.value.filter(marker => marker.id !== id)
  }

  function importKeyframes(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return
    for (const key of Object.keys(snapshot)) {
      const frames = Array.isArray(snapshot[key]) ? snapshot[key] : []
      keyframes[key] = frames.map(frame => ({
        id: nextKeyframeId++,
        time: Math.max(0, Number(frame.time) || 0),
        value: clonePosition(frame.value)
      })).sort((a, b) => a.time - b.time)
    }
    applyCurrentPose()
  }

  function exportKeyframes() {
    const out = {}
    for (const key of Object.keys(keyframes)) {
      out[key] = keyframes[key].map(frame => ({
        time: frame.time,
        value: clonePosition(frame.value)
      }))
    }
    return out
  }

  watch(currentTime, () => {
    applyCurrentPose()
  })

  return {
    startTime,
    endTime,
    duration,
    frameRate,
    currentTime,
    isPlaying,
    loopPlayback,
    keyframes,
    markers,
    step,
    play,
    pause,
    stop,
    setCurrentTime,
    setDuration,
    setFrameRate,
    setRange,
    setRangeFromFrames,
    stepByFrames,
    jumpToFrame,
    addMarker,
    updateMarker,
    removeMarker,
    addKeyframe,
    addSnapshotAtTime,
    removeKeyframe,
  updateKeyframeTime,
    clearTrack,
    clearAll,
    getTrackAtTime,
    applyCurrentPose,
    importKeyframes,
    exportKeyframes
  }
}
