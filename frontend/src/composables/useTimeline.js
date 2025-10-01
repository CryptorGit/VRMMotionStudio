/* legacy timeline implementation retained for reference.
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

const tempQuatA = new THREE.Quaternion()
const tempQuatB = new THREE.Quaternion()
const tempQuatSlerp = new THREE.Quaternion()

function cloneQuaternion(rot) {
  if (!rot) return [0, 0, 0, 1]
  if (Array.isArray(rot)) {
    const [x = 0, y = 0, z = 0, w = 1] = rot
    tempQuatA.set(x, y, z, w).normalize()
    return [tempQuatA.x, tempQuatA.y, tempQuatA.z, tempQuatA.w]
  }
  if (rot.isQuaternion || rot instanceof THREE.Quaternion) {
    tempQuatA.copy(rot).normalize()
    return [tempQuatA.x, tempQuatA.y, tempQuatA.z, tempQuatA.w]
  }
  const x = Number(rot?.x) || 0
  const y = Number(rot?.y) || 0
  const z = Number(rot?.z) || 0
  const w = Number(rot?.w) || 1
  tempQuatA.set(x, y, z, w).normalize()
  return [tempQuatA.x, tempQuatA.y, tempQuatA.z, tempQuatA.w]
}

function normalizeTransform(value, { positionFallback, rotationFallback } = {}) {
  let position = null
  let rotation = null

  if (value !== undefined && value !== null) {
    if (Array.isArray(value)) {
      position = clonePosition(value)
    } else if (typeof value === 'object') {
      if (Array.isArray(value.position) || value.position?.isVector3) {
        position = clonePosition(value.position)
      } else if (Array.isArray(value.value) || value.value?.isVector3) {
        position = clonePosition(value.value)
      }

      if (Array.isArray(value.rotation) || value.rotation?.isQuaternion) {
        rotation = cloneQuaternion(value.rotation)
      } else if (Array.isArray(value.quaternion) || value.quaternion?.isQuaternion) {
        rotation = cloneQuaternion(value.quaternion)
      }
    }
  }

  if (!position && positionFallback) {
    position = clonePosition(positionFallback)
  }
  if (!rotation && rotationFallback) {
    rotation = cloneQuaternion(rotationFallback)
  }

  if (!position) position = [0, 0, 0]
  if (!rotation) rotation = [0, 0, 0, 1]

  return { position, rotation }
}

function cloneSnapshotEntry(entry, options) {
  return normalizeTransform(entry, options)
}

function transformsEqual(a, b, epsilon = 1e-5) {
  if (!a || !b) return false
  for (let i = 0; i < 3; i++) {
    const av = a.position?.[i] ?? 0
    const bv = b.position?.[i] ?? 0
    if (Math.abs(av - bv) > epsilon) return false
  }
  for (let i = 0; i < 4; i++) {
    const av = a.rotation?.[i] ?? (i === 3 ? 1 : 0)
    const bv = b.rotation?.[i] ?? (i === 3 ? 1 : 0)
    if (Math.abs(av - bv) > epsilon) return false
  }
  return true
}

function slerpQuaternionArrays(a, b, t) {
  const alpha = THREE.MathUtils.clamp(t ?? 0, 0, 1)
  const qa = cloneQuaternion(a)
  const qb = cloneQuaternion(b)
  tempQuatA.set(qa[0], qa[1], qa[2], qa[3])
  tempQuatB.set(qb[0], qb[1], qb[2], qb[3])
  // Use instance slerp to avoid relying on static THREE.Quaternion.slerp
  tempQuatSlerp.copy(tempQuatA).slerp(tempQuatB, alpha)
  return [tempQuatSlerp.x, tempQuatSlerp.y, tempQuatSlerp.z, tempQuatSlerp.w]
}

const tempQuatA = new THREE.Quaternion()
const tempQuatB = new THREE.Quaternion()
const tempQuatSlerp = new THREE.Quaternion()

function cloneQuaternion(rot) {
  if (!rot) return [0, 0, 0, 1]
  if (Array.isArray(rot)) {
    const [x = 0, y = 0, z = 0, w = 1] = rot
    tempQuatA.set(x, y, z, w).normalize()
    return [tempQuatA.x, tempQuatA.y, tempQuatA.z, tempQuatA.w]
  }
  if (rot.isQuaternion || rot instanceof THREE.Quaternion) {
    tempQuatA.copy(rot).normalize()
    return [tempQuatA.x, tempQuatA.y, tempQuatA.z, tempQuatA.w]
  }
  const x = Number(rot?.x) || 0
  const y = Number(rot?.y) || 0
  const z = Number(rot?.z) || 0
  const w = Number(rot?.w) || 1
  tempQuatA.set(x, y, z, w).normalize()
  return [tempQuatA.x, tempQuatA.y, tempQuatA.z, tempQuatA.w]
}

function normalizeTransform(value, { positionFallback, rotationFallback } = {}) {
  let position = null
  let rotation = null

  if (value !== undefined && value !== null) {
    if (Array.isArray(value)) {
      position = clonePosition(value)
    } else if (typeof value === 'object') {
      if (Array.isArray(value.position) || value.position?.isVector3) {
        position = clonePosition(value.position)
      } else if (Array.isArray(value.value) || value.value?.isVector3) {
        position = clonePosition(value.value)
      }

      if (Array.isArray(value.rotation) || value.rotation?.isQuaternion) {
        rotation = cloneQuaternion(value.rotation)
      } else if (Array.isArray(value.quaternion) || value.quaternion?.isQuaternion) {
        rotation = cloneQuaternion(value.quaternion)
      }
    }
  }

  if (!position && positionFallback) {
    position = clonePosition(positionFallback)
  }
  if (!rotation && rotationFallback) {
    rotation = cloneQuaternion(rotationFallback)
  }

  if (!position) position = [0, 0, 0]
  if (!rotation) rotation = [0, 0, 0, 1]

  return { position, rotation }
}

function cloneSnapshotEntry(entry, options) {
  return normalizeTransform(entry, options)
}

function transformsEqual(a, b, epsilon = 1e-5) {
  if (!a || !b) return false
  for (let i = 0; i < 3; i++) {
    const av = a.position?.[i] ?? 0
    const bv = b.position?.[i] ?? 0
    if (Math.abs(av - bv) > epsilon) return false
  }
  for (let i = 0; i < 4; i++) {
    const av = a.rotation?.[i] ?? (i === 3 ? 1 : 0)
    const bv = b.rotation?.[i] ?? (i === 3 ? 1 : 0)
    if (Math.abs(av - bv) > epsilon) return false
  }
  return true
}

function slerpQuaternionArrays(a, b, t) {
  const alpha = THREE.MathUtils.clamp(t ?? 0, 0, 1)
  const qa = cloneQuaternion(a)
  const qb = cloneQuaternion(b)
  tempQuatA.set(qa[0], qa[1], qa[2], qa[3])
  tempQuatB.set(qb[0], qb[1], qb[2], qb[3])
  tempQuatSlerp.copy(tempQuatA).slerp(tempQuatB, alpha)
  return [tempQuatSlerp.x, tempQuatSlerp.y, tempQuatSlerp.z, tempQuatSlerp.w]
}

export function useTimeline({ trackers, renderCamera }) {
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
    scheduleSave()
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
  removeKeyframes,
    updateKeyframe,
  moveKeyframes,
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

*/

import { computed, reactive, ref, watch } from 'vue'
import * as THREE from 'three'

let nextKeyframeId = 1
let nextMarkerId = 1
const TIMELINE_SERIAL_VERSION = 2
const STORAGE_KEY_STATE = 'timeline.state.v2'
const LEGACY_STORAGE_KEYS = ['timeline.state.v1']

let saveTimer = null
let restoringState = false

function clonePosition(pos) {
  if (!pos) return [0, 0, 0]
  if (Array.isArray(pos)) return pos.slice(0, 3)
  if (pos.isVector3) return [pos.x, pos.y, pos.z]
  if (pos instanceof THREE.Vector3) return [pos.x, pos.y, pos.z]
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

// Quaternion/transform helpers for active implementation
const tempQuatA = new THREE.Quaternion()
const tempQuatB = new THREE.Quaternion()
const tempQuatSlerp = new THREE.Quaternion()

function cloneQuaternion(rot) {
  if (!rot) return [0, 0, 0, 1]
  if (Array.isArray(rot)) {
    const [x = 0, y = 0, z = 0, w = 1] = rot
    tempQuatA.set(x, y, z, w).normalize()
    return [tempQuatA.x, tempQuatA.y, tempQuatA.z, tempQuatA.w]
  }
  if (rot.isQuaternion || rot instanceof THREE.Quaternion) {
    tempQuatA.copy(rot).normalize()
    return [tempQuatA.x, tempQuatA.y, tempQuatA.z, tempQuatA.w]
  }
  const x = Number(rot?.x) || 0
  const y = Number(rot?.y) || 0
  const z = Number(rot?.z) || 0
  const w = Number(rot?.w) || 1
  tempQuatA.set(x, y, z, w).normalize()
  return [tempQuatA.x, tempQuatA.y, tempQuatA.z, tempQuatA.w]
}

function normalizeTransform(value, { positionFallback, rotationFallback } = {}) {
  let position = null
  let rotation = null

  if (value !== undefined && value !== null) {
    if (Array.isArray(value)) {
      position = clonePosition(value)
    } else if (typeof value === 'object') {
      if (Array.isArray(value.position) || value.position?.isVector3) {
        position = clonePosition(value.position)
      } else if (Array.isArray(value.value) || value.value?.isVector3) {
        position = clonePosition(value.value)
      }

      if (Array.isArray(value.rotation) || value.rotation?.isQuaternion) {
        rotation = cloneQuaternion(value.rotation)
      } else if (Array.isArray(value.quaternion) || value.quaternion?.isQuaternion) {
        rotation = cloneQuaternion(value.quaternion)
      }
    }
  }

  if (!position && positionFallback) {
    position = clonePosition(positionFallback)
  }
  if (!rotation && rotationFallback) {
    rotation = cloneQuaternion(rotationFallback)
  }

  if (!position) position = [0, 0, 0]
  if (!rotation) rotation = [0, 0, 0, 1]

  return { position, rotation }
}

function cloneSnapshotEntry(entry, options) {
  return normalizeTransform(entry, options)
}

function transformsEqual(a, b, epsilon = 1e-5) {
  if (!a || !b) return false
  for (let i = 0; i < 3; i++) {
    const av = a.position?.[i] ?? 0
    const bv = b.position?.[i] ?? 0
    if (Math.abs(av - bv) > epsilon) return false
  }
  for (let i = 0; i < 4; i++) {
    const av = a.rotation?.[i] ?? (i === 3 ? 1 : 0)
    const bv = b.rotation?.[i] ?? (i === 3 ? 1 : 0)
    if (Math.abs(av - bv) > epsilon) return false
  }
  return true
}

function slerpQuaternionArrays(a, b, t) {
  const alpha = THREE.MathUtils.clamp(t ?? 0, 0, 1)
  const qa = cloneQuaternion(a)
  const qb = cloneQuaternion(b)
  tempQuatA.set(qa[0], qa[1], qa[2], qa[3])
  tempQuatB.set(qb[0], qb[1], qb[2], qb[3])
  tempQuatSlerp.copy(tempQuatA).slerp(tempQuatB, alpha)
  return [tempQuatSlerp.x, tempQuatSlerp.y, tempQuatSlerp.z, tempQuatSlerp.w]
}

function sanitizeSnapshotValues(values, trackers, lastAppliedValues, renderCamera) {
  const result = {}
  const source = values && typeof values === 'object' ? values : {}
  const trackerList = trackers?.value || []
  const knownKeys = new Set()

  for (const tracker of trackerList) {
    if (!tracker?.key) continue
    const key = tracker.key
    knownKeys.add(key)
    const fallback = lastAppliedValues?.[key]
    result[key] = normalizeTransform(source[key], {
      positionFallback: fallback?.position ?? tracker.mesh?.position,
      rotationFallback: fallback?.rotation ?? tracker.mesh?.quaternion
    })
  }

  for (const [key, raw] of Object.entries(source)) {
    if (knownKeys.has(key)) continue
    const fallback = lastAppliedValues?.[key]
    result[key] = normalizeTransform(raw, {
      positionFallback: fallback?.position,
      rotationFallback: fallback?.rotation
    })
  }

  // Ensure camera track is normalized if present in source but not in trackers
  if (source?.camera && !result.camera) {
    const cam = renderCamera?.value
    const fallbackPos = cam?.position
    const fallbackRot = cam?.quaternion
    result.camera = normalizeTransform(source.camera, {
      positionFallback: fallbackPos,
      rotationFallback: fallbackRot
    })
  }

  return result
}

function interpolateSnapshots(aValues, bValues, t, trackers) {
  const result = {}
  const trackerList = trackers?.value || []
  const keys = new Set([
    ...Object.keys(aValues || {}),
    ...Object.keys(bValues || {}),
    ...trackerList.map(item => item.key).filter(Boolean)
  ])

  for (const key of keys) {
    const start = aValues?.[key]
    const end = bValues?.[key]
    if (!start && !end) continue
    if (!start) {
      result[key] = normalizeTransform(end)
      continue
    }
    if (!end) {
      result[key] = normalizeTransform(start)
      continue
    }
    const startT = normalizeTransform(start)
    const endT = normalizeTransform(end, {
      positionFallback: startT.position,
      rotationFallback: startT.rotation
    })
    result[key] = {
      position: lerpVector(startT.position, endT.position, t),
      rotation: slerpQuaternionArrays(startT.rotation, endT.rotation, t)
    }
  }

  return result
}

function sampleLegacyTrack(frames, time) {
  if (!Array.isArray(frames) || frames.length === 0) return null
  const sorted = [...frames].sort((a, b) => (a.time || 0) - (b.time || 0))
  if (time <= sorted[0].time) return clonePosition(sorted[0].value)
  const last = sorted[sorted.length - 1]
  if (time >= last.time) return clonePosition(last.value)
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    if (time >= a.time && time <= b.time) {
      const span = b.time - a.time || 1
      const alpha = (time - a.time) / span
      return lerpVector(a.value, b.value, alpha)
    }
  }
  return clonePosition(last.value)
}

function convertLegacySnapshot(snapshot, trackers, lastAppliedValues, renderCamera) {
  const tracks = snapshot?.tracks
  if (!tracks || typeof tracks !== 'object') return []
  const timelineKeys = new Set()
  for (const list of Object.values(tracks)) {
    if (!Array.isArray(list)) continue
    for (const frame of list) {
      if (!Number.isFinite(frame?.time)) continue
      timelineKeys.add(Number(frame.time))
    }
  }
  const times = Array.from(timelineKeys).sort((a, b) => a - b)
  return times.map(time => {
    const values = {}
    for (const [key, frames] of Object.entries(tracks)) {
      const sampled = sampleLegacyTrack(frames, time)
      if (sampled) values[key] = sampled
    }
    return {
      id: nextKeyframeId++,
      time,
      values: sanitizeSnapshotValues(values, trackers, lastAppliedValues, renderCamera)
    }
  })
}

export function useTimeline({ trackers, renderCamera }) {
  const startTime = ref(0)
  const endTime = ref(30)
  const currentTime = ref(0)
  const isPlaying = ref(false)
  const loopPlayback = ref(false)
  const frameRate = ref(60)
  const keyframes = ref([])
  const lastAppliedValues = reactive({})
  const markers = ref([])

  let lastStepTime = performance.now()

  function clampTime(time) {
    if (!Number.isFinite(time)) return startTime.value
    return Math.min(Math.max(time, startTime.value), endTime.value)
  }

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
    const keys = [STORAGE_KEY_STATE, ...LEGACY_STORAGE_KEYS]
    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key)
        if (!raw) continue
        const parsed = JSON.parse(raw)
        const ok = deserialize(parsed, { skipSave: true })
        if (ok) {
          if (key !== STORAGE_KEY_STATE) scheduleSave()
          return true
        }
      } catch (error) {
        if (import.meta?.env?.DEV) {
          console.warn('Failed to restore timeline state', error)
        }
      }
    }
    return false
  }

  const duration = computed(() => Math.max(0, endTime.value - startTime.value))

  const CAMERA_TRACK_KEY = 'camera'

  function captureCurrentSnapshot() {
    const values = {}
    const trackerList = trackers?.value || []
    for (const tracker of trackerList) {
      if (!tracker?.key) continue
      values[tracker.key] = {
        position: clonePosition(tracker.mesh?.position),
        rotation: cloneQuaternion(tracker.mesh?.quaternion)
      }
    }
    // Also capture render camera transform if available
    try {
      const cam = renderCamera?.value
      if (cam && cam.position && cam.quaternion) {
        values[CAMERA_TRACK_KEY] = {
          position: clonePosition(cam.position),
          rotation: cloneQuaternion(cam.quaternion)
        }
      }
    } catch {}
  return sanitizeSnapshotValues(values, trackers, lastAppliedValues, renderCamera)
  }

  function storeLastApplied(values) {
    for (const [key, transform] of Object.entries(values || {})) {
      const normalized = normalizeTransform(transform)
      lastAppliedValues[key] = {
        position: clonePosition(normalized.position),
        rotation: cloneQuaternion(normalized.rotation)
      }
    }
  }

  function timeToFrame(time) {
    const fps = frameRate.value || 60
    return Math.round(clampTime(time) * fps)
  }

  function addKeyframe({ time, values }) {
    const clampedTime = clampTime(time)
    const targetFrame = timeToFrame(clampedTime)
  const sanitizedValues = sanitizeSnapshotValues(values, trackers, lastAppliedValues, renderCamera)

    let updatedEntry = null
    const nextFrames = keyframes.value.map(frame => {
      if (timeToFrame(frame.time) !== targetFrame) return frame
      updatedEntry = { ...frame, time: clampedTime, values: sanitizedValues }
      return updatedEntry
    })

    if (updatedEntry) {
      keyframes.value = nextFrames.sort((a, b) => a.time - b.time)
      storeLastApplied(updatedEntry.values)
      scheduleSave()
      applyCurrentPose()
      return updatedEntry
    }

    const entry = {
      id: nextKeyframeId++,
      time: clampedTime,
      values: sanitizedValues
    }
    keyframes.value = [...nextFrames, entry].sort((a, b) => a.time - b.time)
    storeLastApplied(entry.values)
    scheduleSave()
    return entry
  }

  function addSnapshotAtTime(time) {
    const snapshot = captureCurrentSnapshot()
    return addKeyframe({ time, values: snapshot })
  }

  function removeKeyframe(id) {
    const next = keyframes.value.filter(frame => frame.id !== id)
    if (next.length === keyframes.value.length) return
    keyframes.value = next
    scheduleSave()
    applyCurrentPose()
  }

  function removeKeyframes(ids) {
    if (!Array.isArray(ids) || !ids.length) return
    const targets = new Set(ids.map(id => Number(id)).filter(Number.isFinite))
    if (!targets.size) return
    const next = keyframes.value.filter(frame => !targets.has(frame.id))
    if (next.length === keyframes.value.length) return
    keyframes.value = next
    scheduleSave()
    applyCurrentPose()
  }

  function updateKeyframe(id, payload = {}) {
    let changed = false
    const nextFrames = keyframes.value.map(frame => {
      if (frame.id !== id) return frame
      const updated = { ...frame }
      if (payload.time !== undefined && Number.isFinite(payload.time)) {
        const clamped = clampTime(payload.time)
        if (Math.abs(clamped - updated.time) > 1e-6) {
          updated.time = clamped
          changed = true
        }
      }
      if (payload.values && typeof payload.values === 'object') {
        updated.values = sanitizeSnapshotValues(payload.values, trackers, lastAppliedValues)
        changed = true
      }
      return updated
    })
    if (!changed) return keyframes.value.find(frame => frame.id === id) || null
    keyframes.value = nextFrames.sort((a, b) => a.time - b.time)
    const updatedEntry = keyframes.value.find(frame => frame.id === id)
    if (updatedEntry) storeLastApplied(updatedEntry.values)
    scheduleSave()
    applyCurrentPose()
    return updatedEntry || null
  }

  function moveKeyframes(updates) {
    if (!Array.isArray(updates) || !updates.length) return
    const map = new Map()
    updates.forEach(update => {
      const id = Number(update?.keyframeId ?? update?.id)
      const time = Number(update?.time)
      if (!Number.isFinite(id) || !Number.isFinite(time)) return
      map.set(id, clampTime(time))
    })
    if (!map.size) return
    let changed = false
    const nextFrames = keyframes.value.map(frame => {
      if (!map.has(frame.id)) return frame
      const nextTime = map.get(frame.id)
      if (Math.abs(nextTime - frame.time) <= 1e-6) return frame
      changed = true
      return { ...frame, time: nextTime }
    })
    if (!changed) return
    keyframes.value = nextFrames.sort((a, b) => a.time - b.time)
    scheduleSave()
    applyCurrentPose()
  }

  function updateKeyframeTime(id, nextTime) {
    if (!Number.isFinite(nextTime)) return
    updateKeyframe(id, { time: nextTime })
  }

  function clearAll() {
    keyframes.value = []
    markers.value = []
    scheduleSave()
    applyCurrentPose()
  }

  function findFrameRange(time) {
    const frames = keyframes.value
    if (!frames.length) return { previous: null, next: null }
    if (frames.length === 1) return { previous: frames[0], next: frames[0] }
    const clamped = clampTime(time)
    if (clamped <= frames[0].time) return { previous: frames[0], next: frames[0] }
    const last = frames[frames.length - 1]
    if (clamped >= last.time) return { previous: last, next: last }
    for (let i = 1; i < frames.length; i++) {
      const current = frames[i]
      const previous = frames[i - 1]
      if (clamped <= current.time) {
        return { previous, next: current }
      }
    }
    return { previous: last, next: last }
  }

  function cloneSnapshot(values) {
    const result = {}
    for (const [key, value] of Object.entries(values || {})) {
      result[key] = normalizeTransform(value)
    }
    return result
  }

  function getSnapshotAtTime(time) {
    const frames = keyframes.value
    if (!frames.length) return null
    const { previous, next } = findFrameRange(time)
    if (!previous && !next) return null
    if (!previous) return cloneSnapshot(next.values)
    if (!next) return cloneSnapshot(previous.values)
    if (previous === next || Math.abs(next.time - previous.time) < 1e-6) {
      return cloneSnapshot(previous.values)
    }
    const span = next.time - previous.time || 1
    const alpha = (clampTime(time) - previous.time) / span
    return interpolateSnapshots(previous.values, next.values, alpha, trackers)
  }

  function getTrackAtTime(trackerKey, time) {
    const snapshot = getSnapshotAtTime(time)
    const value = snapshot?.[trackerKey]
    if (!value) return null
    const normalized = normalizeTransform(value)
    return normalized.position
  }

  function applyPoseAt(time) {
    const snapshot = getSnapshotAtTime(time)
    if (!snapshot) return
    const trackerList = trackers?.value || []
    for (const tracker of trackerList) {
      if (!tracker?.key || !tracker?.mesh?.position || !tracker.mesh?.quaternion) continue
      const value = snapshot[tracker.key]
      if (!value) continue
      const transform = normalizeTransform(value, {
        positionFallback: tracker.mesh.position,
        rotationFallback: tracker.mesh.quaternion
      })
      const cached = lastAppliedValues[tracker.key]
      if (cached && transformsEqual(cached, transform)) continue
      tracker.mesh.position.set(transform.position[0], transform.position[1], transform.position[2])
      tracker.mesh.quaternion.set(
        transform.rotation[0],
        transform.rotation[1],
        transform.rotation[2],
        transform.rotation[3]
      ).normalize()
      lastAppliedValues[tracker.key] = {
        position: clonePosition(transform.position),
        rotation: cloneQuaternion(transform.rotation)
      }
    }

    // Apply camera if present
    try {
      const cam = renderCamera?.value
      const camValue = snapshot[CAMERA_TRACK_KEY]
      if (cam && camValue) {
        const t = normalizeTransform(camValue, {
          positionFallback: cam.position,
          rotationFallback: cam.quaternion
        })
        const cached = lastAppliedValues[CAMERA_TRACK_KEY]
        if (!cached || !transformsEqual(cached, t)) {
          cam.position.set(t.position[0], t.position[1], t.position[2])
          cam.quaternion.set(t.rotation[0], t.rotation[1], t.rotation[2], t.rotation[3]).normalize()
          try { cam.updateMatrixWorld(true) } catch {}
          lastAppliedValues[CAMERA_TRACK_KEY] = {
            position: clonePosition(t.position),
            rotation: cloneQuaternion(t.rotation)
          }
        }
      }
    } catch {}
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
      currentTime.value = clampTime(next)
    }
    applyCurrentPose()
  }

  function setCurrentTime(time) {
    currentTime.value = clampTime(time)
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
      time: clampTime(time),
      label: safeLabel
    }
    markers.value = [...markers.value, entry].sort((a, b) => a.time - b.time)
    scheduleSave()
    return entry
  }

  function updateMarker(id, payload) {
    let changed = false
    markers.value = markers.value
      .map(marker => {
        if (marker.id !== id) return marker
        const next = { ...marker }
        if (payload?.time !== undefined && Number.isFinite(payload.time)) {
          const clamped = clampTime(payload.time)
          if (clamped !== marker.time) {
            next.time = clamped
            changed = true
          }
        }
        if (payload?.label !== undefined) {
          const safe = typeof payload.label === 'string' ? payload.label.trim() : ''
          if (safe !== marker.label) {
            next.label = safe
            changed = true
          }
        }
        return next
      })
      .sort((a, b) => a.time - b.time)
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
    let entries = Array.isArray(snapshot.keyframes) ? snapshot.keyframes : null
    if (!entries && snapshot.tracks) {
      entries = convertLegacySnapshot(snapshot, trackers, lastAppliedValues, renderCamera)
    }
    if (!Array.isArray(entries)) return
    let maxId = 0
    keyframes.value = entries
      .map(entry => {
        let id = Number(entry.id)
        if (!Number.isFinite(id) || id <= 0) id = ++maxId
        else maxId = Math.max(maxId, id)
        const time = Number(entry.time)
        return {
          id,
          time: Number.isFinite(time) ? clampTime(time) : startTime.value,
          values: sanitizeSnapshotValues(entry.values, trackers, lastAppliedValues, renderCamera)
        }
      })
      .sort((a, b) => a.time - b.time)
    nextKeyframeId = Math.max(maxId + 1, Number(snapshot?.nextIds?.keyframe) || maxId + 1)
    scheduleSave()
    applyCurrentPose()
  }

  function exportKeyframes() {
    return keyframes.value.map(frame => ({
      id: frame.id,
      time: frame.time,
      values: cloneSnapshot(frame.values)
    }))
  }

  function serialize() {
    const frames = exportKeyframes()
    const markerList = markers.value.map(marker => ({
      id: marker.id,
      time: marker.time,
      label: marker.label
    }))

    return {
      version: TIMELINE_SERIAL_VERSION,
      frameRate: frameRate.value,
      startTime: startTime.value,
      endTime: endTime.value,
      currentTime: currentTime.value,
      loop: loopPlayback.value,
      nextIds: {
        keyframe: Math.max(nextKeyframeId, frames.reduce((max, frame) => Math.max(max, frame.id), 0) + 1),
        marker: Math.max(nextMarkerId, markerList.reduce((max, marker) => Math.max(max, marker.id), 0) + 1)
      },
      keyframes: frames,
      markers: markerList
    }
  }

  function deserialize(snapshot, { skipSave = false } = {}) {
    if (!snapshot || typeof snapshot !== 'object') return false
    restoringState = true
    try {
      const version = Number(snapshot.version) || TIMELINE_SERIAL_VERSION
      if (version > TIMELINE_SERIAL_VERSION && import.meta?.env?.DEV) {
        console.warn('Timeline snapshot version is newer than supported:', version)
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

      nextKeyframeId = Number(snapshot?.nextIds?.keyframe) || 1
      nextMarkerId = Number(snapshot?.nextIds?.marker) || 1

      if (Array.isArray(snapshot.keyframes) || snapshot.tracks) {
        importKeyframes(snapshot)
      } else {
        keyframes.value = []
      }

      if (Array.isArray(snapshot.markers)) {
        let maxMarkerId = 0
        markers.value = snapshot.markers
          .map(marker => {
            let id = Number(marker.id)
            if (!Number.isFinite(id) || id <= 0) id = ++maxMarkerId
            else maxMarkerId = Math.max(maxMarkerId, id)
            const rawTime = Number(marker.time)
            const time = Number.isFinite(rawTime) ? rawTime : startTime.value
            return {
              id,
              time: clampTime(time),
              label: typeof marker.label === 'string' ? marker.label : `Marker ${id}`
            }
          })
          .sort((a, b) => a.time - b.time)
        nextMarkerId = Math.max(maxMarkerId + 1, nextMarkerId)
      } else {
        markers.value = []
      }

      if (Number.isFinite(snapshot.currentTime)) {
        setCurrentTime(clampTime(snapshot.currentTime))
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
