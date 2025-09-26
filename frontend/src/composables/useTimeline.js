import { ref, reactive, watch } from 'vue'
import * as THREE from 'three'

let nextKeyframeId = 1

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
  const duration = ref(30) // seconds
  const currentTime = ref(0)
  const isPlaying = ref(false)
  const keyframes = reactive({})
  const lastAppliedValues = reactive({})

  let lastStepTime = performance.now()

  function ensureTrackKey(key) {
    if (!keyframes[key]) keyframes[key] = []
    return keyframes[key]
  }

  function addKeyframe({ trackerKey, time, position }) {
    if (!trackerKey || typeof time !== 'number') return null
    const arr = ensureTrackKey(trackerKey)
    const safePos = clonePosition(position)
    const entry = { id: nextKeyframeId++, time: Math.max(0, time), value: safePos }
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

  function clearTrack(trackerKey) {
    if (keyframes[trackerKey]) keyframes[trackerKey] = []
  }

  function clearAll() {
    for (const key of Object.keys(keyframes)) keyframes[key] = []
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
      const next = currentTime.value + delta
      if (next >= duration.value) {
        currentTime.value = duration.value
        isPlaying.value = false
      } else {
        currentTime.value = next
      }
    }
    applyCurrentPose()
  }

  function setCurrentTime(time) {
    const clamped = Math.min(Math.max(time, 0), duration.value)
    currentTime.value = clamped
    applyCurrentPose()
    lastStepTime = performance.now()
  }

  function play() {
    if (currentTime.value >= duration.value) currentTime.value = 0
    isPlaying.value = true
    lastStepTime = performance.now()
  }

  function pause() {
    isPlaying.value = false
  }

  function stop() {
    isPlaying.value = false
    setCurrentTime(0)
  }

  function setDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return
    duration.value = seconds
    if (currentTime.value > duration.value) currentTime.value = duration.value
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
    duration,
    currentTime,
    isPlaying,
    keyframes,
    step,
    play,
    pause,
    stop,
    setCurrentTime,
    setDuration,
    addKeyframe,
    addSnapshotAtTime,
    removeKeyframe,
    clearTrack,
    clearAll,
    getTrackAtTime,
    applyCurrentPose,
    importKeyframes,
    exportKeyframes
  }
}
