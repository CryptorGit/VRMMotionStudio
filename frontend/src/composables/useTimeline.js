import { computed, ref, reactive, watch } from 'vue'
import * as THREE from 'three'

let nextKeyframeId = 1
let nextMarkerId = 1
const TIMELINE_SERIAL_VERSION = 1
const STORAGE_KEY_STATE = 'timeline.state.v1'

let saveTimer = null
let restoringState = false

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

  function scheduleSave() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return
    if (restoringState) return
    if (saveTimer !== null) return
    saveTimer = window.setTimeout(() => {
      saveTimer = null
      persistState()
    }, 150)
  }

  function persistState() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(serialize()))
    } catch {}
  }

  function restoreState() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false
    try {
      const raw = localStorage.getItem(STORAGE_KEY_STATE)
      if (!raw) return false
      const parsed = JSON.parse(raw)
      return deserialize(parsed, { skipSave: true })
    } catch {
      return false
    }
  }

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
    scheduleSave()
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
    scheduleSave()
    applyCurrentPose()
  }

  function updateKeyframe(trackerKey, id, payload = {}) {
    const arr = keyframes[trackerKey]
    if (!arr?.length) return null
    const target = arr.find(k => k.id === id)
    if (!target) return null
    let changed = false

    if (payload.time !== undefined && Number.isFinite(payload.time)) {
      const next = Math.min(Math.max(payload.time, startTime.value), endTime.value)
      if (Math.abs(next - target.time) > 1e-6) {
        target.time = next
        changed = true
      }
    }

    if (payload.value && Array.isArray(payload.value)) {
      const nextValue = clonePosition(payload.value)
      if (
        !target.value ||
        target.value[0] !== nextValue[0] ||
        target.value[1] !== nextValue[1] ||
        target.value[2] !== nextValue[2]
      ) {
        target.value = nextValue
        lastAppliedValues[trackerKey] = nextValue
        changed = true
      }
    }

    if (changed) {
      arr.sort((a, b) => a.time - b.time)
      scheduleSave()
      applyCurrentPose()
    }

    return target
  }

  function updateKeyframeTime(trackerKey, id, nextTime) {
    if (!Number.isFinite(nextTime)) return
    updateKeyframe(trackerKey, id, { time: nextTime })
  }

  function clearTrack(trackerKey) {
    if (!keyframes[trackerKey]) return
    keyframes[trackerKey] = []
    scheduleSave()
    applyCurrentPose()
  }

  function clearAll() {
    for (const key of Object.keys(keyframes)) keyframes[key] = []
    markers.value = []
    scheduleSave()
    applyCurrentPose()
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
    scheduleSave()
  }

  function setFrameRate(fps) {
    if (!Number.isFinite(fps) || fps <= 0) return
    frameRate.value = fps
    scheduleSave()
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
    scheduleSave()
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
    const safeLabel = typeof label === 'string' ? label.trim() : ''
    const entry = {
      id: nextMarkerId++,
      time: Math.min(Math.max(time, startTime.value), endTime.value),
      label: safeLabel
    }
    markers.value = [...markers.value, entry].sort((a, b) => a.time - b.time)
    scheduleSave()
    return entry
  }

  function updateMarker(id, payload) {
    let changed = false
    markers.value = markers.value.map(marker => {
      if (marker.id !== id) return marker
      const next = { ...marker }
      if (payload?.time !== undefined && Number.isFinite(payload.time)) {
        next.time = Math.min(Math.max(payload.time, startTime.value), endTime.value)
        if (next.time !== marker.time) changed = true
      }
      if (payload?.label !== undefined) {
        next.label = typeof payload.label === 'string' ? payload.label.trim() : ''
      }
      if (next.label !== marker.label) changed = true
      return next
    }).sort((a, b) => a.time - b.time)
    if (changed) scheduleSave()
  }

  function removeMarker(id) {
    const next = markers.value.filter(marker => marker.id !== id)
    if (next.length === markers.value.length) return
    markers.value = next
    scheduleSave()
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
    scheduleSave()
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

  function serialize() {
    const tracks = {}
    let maxKeyId = 0
    for (const key of Object.keys(keyframes)) {
      const frames = keyframes[key] || []
      tracks[key] = frames.map(frame => {
        const id = Number(frame.id) || 0
        if (id > maxKeyId) maxKeyId = id
        return {
          id,
          time: frame.time,
          value: clonePosition(frame.value)
        }
      })
    }

    let maxMarkerId = 0
    const markerList = markers.value.map(marker => {
      const id = Number(marker.id) || 0
      if (id > maxMarkerId) maxMarkerId = id
      return {
        id,
        time: marker.time,
        label: marker.label
      }
    })

    return {
      version: TIMELINE_SERIAL_VERSION,
      frameRate: frameRate.value,
      startTime: startTime.value,
      endTime: endTime.value,
      currentTime: currentTime.value,
      loop: loopPlayback.value,
      nextIds: {
        keyframe: Math.max(nextKeyframeId, maxKeyId + 1),
        marker: Math.max(nextMarkerId, maxMarkerId + 1)
      },
      markers: markerList,
      tracks
    }
  }

  function deserialize(snapshot, { skipSave = false } = {}) {
    if (!snapshot || typeof snapshot !== 'object') return false
    restoringState = true
    try {
      const version = Number(snapshot.version) || TIMELINE_SERIAL_VERSION
      if (version > TIMELINE_SERIAL_VERSION) {
        // proceed but warn in dev
        if (import.meta?.env?.DEV) {
          console.warn('Timeline snapshot version is newer than supported:', version)
        }
      }

      if (Number.isFinite(snapshot.frameRate) && snapshot.frameRate > 0) {
        frameRate.value = snapshot.frameRate
      }

      let newStart = Number(snapshot.startTime)
      let newEnd = Number(snapshot.endTime)
      if (!Number.isFinite(newStart)) newStart = 0
      if (!Number.isFinite(newEnd)) newEnd = newStart + 30
      if (newEnd <= newStart) newEnd = newStart + 1
      startTime.value = newStart
      endTime.value = newEnd

      loopPlayback.value = !!snapshot.loop

      const trackEntries = snapshot.tracks && typeof snapshot.tracks === 'object' ? snapshot.tracks : {}
      for (const key of Object.keys(keyframes)) keyframes[key] = []

      let maxKeyId = 0
      for (const [key, frames] of Object.entries(trackEntries)) {
        if (!Array.isArray(frames)) continue
        keyframes[key] = frames
          .map(frame => {
            let assignedId = Number(frame.id)
            if (!Number.isFinite(assignedId) || assignedId <= 0) {
              assignedId = ++maxKeyId
            } else {
              maxKeyId = Math.max(maxKeyId, assignedId)
            }
            const rawTime = Number(frame.time)
            const time = Number.isFinite(rawTime) ? rawTime : startTime.value
            return {
              id: assignedId,
              time: Math.min(Math.max(time, startTime.value), endTime.value),
              value: clonePosition(frame.value)
            }
          })
          .sort((a, b) => a.time - b.time)
      }
      nextKeyframeId = Math.max(
        maxKeyId + 1,
        Number(snapshot?.nextIds?.keyframe) || 1
      )

      const markerInput = Array.isArray(snapshot.markers) ? snapshot.markers : []
      let maxMarkerId = 0
      markers.value = markerInput
        .map(marker => {
          let assignedId = Number(marker.id)
          if (!Number.isFinite(assignedId) || assignedId <= 0) {
            assignedId = ++maxMarkerId
          } else {
            maxMarkerId = Math.max(maxMarkerId, assignedId)
          }
          const rawTime = Number(marker.time)
          const time = Number.isFinite(rawTime) ? rawTime : startTime.value
          return {
            id: assignedId,
            time: Math.min(Math.max(time, startTime.value), endTime.value),
            label: typeof marker.label === 'string' ? marker.label : `Marker ${assignedId}`
          }
        })
        .sort((a, b) => a.time - b.time)
      nextMarkerId = Math.max(
        maxMarkerId + 1,
        Number(snapshot?.nextIds?.marker) || 1
      )

      if (Number.isFinite(snapshot.currentTime)) {
        setCurrentTime(Math.min(Math.max(snapshot.currentTime, startTime.value), endTime.value))
      } else {
        setCurrentTime(startTime.value)
      }
    } catch (error) {
      if (import.meta?.env?.DEV) {
        console.error('Failed to deserialize timeline snapshot', error)
      }
      return false
    } finally {
      restoringState = false
    }

    applyCurrentPose()
    if (!skipSave) scheduleSave()
    return true
  }

  watch(currentTime, () => {
    applyCurrentPose()
  })

  watch(loopPlayback, () => {
    scheduleSave()
  })

  restoreState()

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
    updateKeyframe,
    updateKeyframeTime,
    clearTrack,
    clearAll,
    getTrackAtTime,
    applyCurrentPose,
    importKeyframes,
    exportKeyframes,
    serialize,
    deserialize,
    restoreState
  }
}
