<template>
  <div class="app-frame">
    <TopMenuBar
      :theme="theme"
      :auto-restore="autoRestore"
      :show-captions="showCaptions"
      @import="openFile"
      @export="exportPose"
      @clear-cache="clearAllCache"
      @toggle-auto-restore="toggleAutoRestore"
      @toggle-theme="toggleTheme"
      @toggle-captions="toggleCaptions"
    />
    <div class="workspace-grid" role="presentation">
      <SplitPane
        class="workspace-split workspace-split--main"
        direction="horizontal"
        storage-key="layout.split.main"
        :initial-primary-ratio="0.68"
        :min-primary-ratio="0.35"
        :max-primary-ratio="0.9"
        :primary-min-pixels="560"
        :secondary-min-pixels="320"
      >
        <template #primary>
          <SplitPane
            class="workspace-split workspace-split--column"
            direction="vertical"
            storage-key="layout.split.column"
            :initial-primary-ratio="0.68"
            :min-primary-ratio="0.4"
            :max-primary-ratio="0.92"
            :primary-min-pixels="320"
            :secondary-min-pixels="220"
          >
            <template #primary>
              <section class="workspace-panel workspace-panel--viewport" aria-label="ビューポート領域">
                <div class="workspace-panel__body workspace-panel__body--viewport">
                  <div class="viewport-frame">
                    <div
                      id="viewer"
                      ref="viewer"
                      class="viewport-frame__canvas"
                      @dragover.prevent="onDragOver"
                      @dragleave="onDragLeave"
                      @drop.prevent="onDrop"
                    ></div>
                  </div>
                </div>
              </section>
            </template>
            <template #secondary>
              <section class="workspace-panel workspace-panel--timeline" aria-label="タイムライン領域">
                <div class="workspace-panel__body workspace-panel__body--timeline">
                  <TimelineEditor
                    height="100%"
                    :trackers="trackerList"
                    :keyframes="timelineKeyframes"
                    :markers="timelineMarkers"
                    :current-time="timelineCurrentTime"
                    :start-time="timelineStartTime"
                    :end-time="timelineEndTime"
                    :frame-rate="timelineFrameRate"
                    :is-playing="timelinePlaying"
                    :loop="timelineLoop"
                    :snap="timelineSnap"
                    @seek="handleTimelineSeek"
                    @play="handleTimelinePlay"
                    @pause="handleTimelinePause"
                    @stop="handleTimelineStop"
                    @step-frames="handleTimelineStepFrames"
                    @jump-start="handleTimelineJumpStart"
                    @jump-end="handleTimelineJumpEnd"
                    @toggle-loop="handleTimelineToggleLoop"
                    @add-all-keyframes="handleTimelineAddAll"
                    @add-keyframe="handleTimelineAddKey"
                    @remove-keyframe="handleTimelineRemoveKey"
                    @move-keyframe="handleTimelineMoveKey"
                    @update-keyframe="handleTimelineUpdateKey"
                    @add-marker="handleAddMarker"
                    @update-marker="handleUpdateMarker"
                    @remove-marker="handleRemoveMarker"
                    @update-range="handleTimelineRange"
                    @update:snap="timelineSnap = $event"
                    @select-keyframes="handleSelectKeyframes"
                    @request-import="handleTimelineRequestImport"
                    @export-timeline="handleTimelineExport"
                    @clear-timeline="handleTimelineClear"
                  />
                </div>
              </section>
            </template>
          </SplitPane>
        </template>
        <template #secondary>
          <aside class="workspace-panel workspace-panel--settings" aria-label="設定領域">
            <div class="workspace-panel__body workspace-panel__body--settings">
              <SettingsSidebar
                :ambient="ambientLight"
                :directional="directionalLight"
                :mesh="currentMeshRef"
                :models="models"
                v-model:show-light-marker="showLightMarker"
                v-model:marker-color="lightMarkerColor"
                v-model:directional-intensity="directionalIntensity"
                v-model:spring-bone-enabled="springBoneEnabled"
                v-model:look-at-enabled="lookAtEnabled"
                v-model:show-extended-bones="showExtendedBones"
                v-model:show-collider-nodes="showColliderNodes"
                v-model:show-non-deforming-bones="showNonDeformingBones"
                v-model:highlight-constraint="highlightConstraint"
                v-model:show-physical-bones="showPhysicalBones"
                v-model:show-other-bones="showOtherBones"
                v-model:bone-dot-size="boneDotSize"
                v-model:bone-label-scale="boneLabelScale"
                v-model:virtual-trackers-enabled="virtualTrackersEnabled"
                v-model:show-virtual-tracker-labels="showVirtualTrackerLabels"
                v-model:virtual-tracker-size="virtualTrackerSize"
                v-model:virtual-tracker-label-scale="virtualTrackerLabelScale"
                @reset-virtual-trackers="resetVirtualTrackers"
                @toggle-model="toggleModelVisibility"
                @toggle-bone="toggleBoneVisibility"
                @toggle-bone-names="toggleBoneNameVisibility"
                @toggle-all-bones="toggleAllBones"
                @toggle-all-bone-names="toggleAllBoneNames"
                @remove-model="removeModel"
              />
            </div>
          </aside>
        </template>
      </SplitPane>
    </div>
    <StatusBar>
      <template #message>
        {{ statusMessage }}
      </template>
    </StatusBar>
    <ToastHub :items="toasts" @dismiss="dismissToast" />
    <input
      type="file"
      ref="fileInput"
      accept=".vrm"
      multiple
      style="display:none"
      @change="onFileChange"
    />
    <input
      type="file"
      ref="timelineFileInput"
      accept="application/json"
      style="display:none"
      @change="handleTimelineImportFile"
    />
  </div>
</template>

<script setup>
import { ref, shallowRef, computed, onMounted, onUnmounted, watch, provide } from 'vue'
import SettingsSidebar from './SettingsSidebar.vue'
import TimelineEditor from './timeline/TimelineEditor.vue'
import TopMenuBar from './layout/TopMenuBar.vue'
import StatusBar from './layout/StatusBar.vue'
import ToastHub from './ui/ToastHub.vue'
import SplitPane from './layout/SplitPane.vue'
import * as THREE from 'three'
import { API_BASE_URL } from '../config.js'
import {
  ambientLight,
  directionalLight,
  directionalLightHelper,
  lightMarkerColor,
  directionalIntensity,
  showLightMarker,
  loadLightingSettings
} from '../utils/lighting.js'
import { useFileLoader } from '../composables/useFileLoader.js'
import { useRenderer } from '../composables/useRenderer.js'
import { useErrorHandlers } from '../composables/useErrorHandlers.js'
import { useVirtualTrackers } from '../composables/useVirtualTrackers.js'
import { useTimeline } from '../composables/useTimeline.js'
import { useTheme } from '../composables/useTheme.js'
import { captionInjectionKey } from '../composables/useCaptions.js'

const viewer = ref(null)
const currentMeshRef = ref(null)
const springBoneEnabled = ref(true)
const lookAtEnabled = ref(true)

const scene = shallowRef(null)
const camera = shallowRef(null)
const renderer = shallowRef(null)
const controls = shallowRef(null)
const helper = shallowRef(null)
const transformControls = shallowRef(null)

const showPhysicalBones = ref(false)
const showOtherBones = ref(false)
const showExtendedBones = ref(false)
const showColliderNodes = ref(false)
const showNonDeformingBones = ref(false)
const highlightConstraint = ref(false)
const boneDotSize = ref(0.02)
const boneLabelScale = ref(1.0)

const virtualTrackersEnabled = ref(false)
const showVirtualTrackerLabels = ref(true)
const virtualTrackerSize = ref(0.08)
const virtualTrackerLabelScale = ref(1.0)

const clock = new THREE.Clock()
const TARGET_FPS = 30

const { theme, toggleTheme } = useTheme()

const CAPTION_STORAGE_KEY = 'ui.captions.enabled'
const showCaptions = ref(true)
const tooltip = message => (showCaptions.value && typeof message === 'string' ? message : '')

provide(captionInjectionKey, {
  showCaptions,
  tooltip
})

const autoRestore = ref(true)
const toasts = ref([])
let toastSeed = 0

function pushToast(message, title = '通知', timeout = 3200) {
  const id = ++toastSeed
  const toast = { id, title, message }
  toasts.value = [...toasts.value, toast]
  if (timeout > 0) {
    toast._timer = window.setTimeout(() => dismissToast(id), timeout)
  }
  return id
}

function dismissToast(id) {
  toasts.value = toasts.value.filter(item => {
    if (item.id === id && item._timer) window.clearTimeout(item._timer)
    return item.id !== id
  })
}

function loadAutoRestore() {
  try {
    autoRestore.value = localStorage.getItem('autoRestore') !== '0'
  } catch {
    autoRestore.value = true
  }
}

function toggleAutoRestore() {
  autoRestore.value = !autoRestore.value
  try {
    if (autoRestore.value) {
      localStorage.removeItem('autoRestore')
    } else {
      localStorage.setItem('autoRestore', '0')
    }
  } catch {}
  pushToast(`モデル自動復元: ${autoRestore.value ? 'ON' : 'OFF'}`, '設定')
}

function loadCaptionPreference() {
  try {
    const stored = localStorage.getItem(CAPTION_STORAGE_KEY)
    if (stored === null) return
    showCaptions.value = stored !== '0'
  } catch {
    showCaptions.value = true
  }
}

function toggleCaptions() {
  showCaptions.value = !showCaptions.value
  try {
    if (showCaptions.value) {
      localStorage.removeItem(CAPTION_STORAGE_KEY)
    } else {
      localStorage.setItem(CAPTION_STORAGE_KEY, '0')
    }
  } catch {}
  pushToast(`ボタンキャプション: ${showCaptions.value ? '表示' : '非表示'}`, '設定')
}

async function logToServer(data) {
  const payload = { ts: Date.now(), ...data }
  if (import.meta.env.DEV) {
    try {
      const r = await fetch('/__dev__/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (r.ok) return
    } catch {}
  }
  try {
    const r2 = await fetch(`${API_BASE_URL}/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!r2.ok && import.meta.env.DEV) {
      try {
        await fetch('/__dev__/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } catch {}
    }
  } catch {}
}

function onPointerDown() {}
function onControlStart() {}
function onControlEnd() {}

const fileLoader = useFileLoader({
  scene,
  camera,
  renderer,
  helper,
  currentMeshRef,
  logToServer,
  viewer,
  transformControls,
  controls,
  showPhysicalBones,
  showOtherBones,
  showExtendedBones,
  showColliderNodes,
  showNonDeformingBones,
  highlightConstraint,
  boneDotSize,
  boneLabelScale
})

const {
  fileInput,
  poses,
  selectedPose,
  models,
  onFileChange,
  toggleModelVisibility,
  toggleBoneVisibility,
  toggleBoneNameVisibility,
  removeModel,
  clearCache,
  applyPose,
  exportPose,
  openFile,
  onDragOver,
  onDragLeave,
  onDrop,
  restoreCachedModel,
  applyBoneSettingsAll
} = fileLoader

const timelineFileInput = ref(null)

let trackerController = null
let timelineController = null

const updateTrackers = () => {
  try {
    timelineController?.step()
    trackerController?.update()
  } catch {}
}

const trackerList = computed(() => {
  const source = trackerController?.trackers?.value || []
  return source.map(item => ({
    key: item.key,
    label: item.name || item.key
  }))
})

const timelineSnap = ref(true)
const selectedTimelineKeys = ref([])

const timelineKeyframes = computed(() => (timelineController ? timelineController.keyframes : {}))
const timelineMarkers = computed(() => (timelineController ? timelineController.markers.value : []))
const timelineDuration = computed(() => (timelineController ? timelineController.duration.value : 0))
const timelineCurrentTime = computed(() => (timelineController ? timelineController.currentTime.value : 0))
const timelinePlaying = computed(() => (timelineController ? timelineController.isPlaying.value : false))
const timelineStartTime = computed(() => (timelineController ? timelineController.startTime.value : 0))
const timelineEndTime = computed(() => (timelineController ? timelineController.endTime.value : 0))
const timelineFrameRate = computed(() => (timelineController ? timelineController.frameRate.value : 60))
const timelineLoop = computed(() => (timelineController ? timelineController.loopPlayback.value : false))

const statusMessage = computed(() => {
  const fps = timelineFrameRate.value || 60
  const currentFrame = Math.round(timelineCurrentTime.value * fps)
  const endFrame = Math.max(Math.round(timelineEndTime.value * fps), 0)
  const markerCount = timelineMarkers.value.length
  const selectionCount = selectedTimelineKeys.value.length
  const selectionLabel = selectionCount ? ` • 選択 ${selectionCount}` : ''
  return `フレーム ${currentFrame}/${endFrame} (${fps}fps) • マーカー ${markerCount}${selectionLabel}`
})

try {
  const savedSnap = localStorage.getItem('timeline.snap')
  if (savedSnap !== null) timelineSnap.value = savedSnap !== '0'
} catch {}

watch(timelineSnap, value => {
  try {
    localStorage.setItem('timeline.snap', value ? '1' : '0')
  } catch {}
})

const { animate, initRenderer, cleanupRenderer } = useRenderer({
  clock,
  targetFps: TARGET_FPS,
  helper,
  scene,
  camera,
  updateIKMarkers: updateTrackers,
  directionalLightHelper,
  renderer,
  viewer,
  controls,
  ambientLight,
  directionalLight,
  onControlStart,
  onControlEnd,
  onPointerDown,
  vrmGetter: () => (models?.value || []).map(m => m.vrm).filter(Boolean)
})

trackerController = useVirtualTrackers({
  scene,
  camera,
  renderer,
  controls,
  models,
  logToServer,
  trackerDotSize: virtualTrackerSize,
  trackerLabelScale: virtualTrackerLabelScale,
  showTrackerLabels: showVirtualTrackerLabels
})

timelineController = useTimeline({ trackers: trackerController.trackers })

if (timelineController) {
  const tracks = timelineController.keyframes || {}
  const hasExistingKeys = Object.values(tracks).some(list => Array.isArray(list) && list.length > 0)
  if (hasExistingKeys) ensureVirtualTrackers()
}

watch(virtualTrackersEnabled, v => {
  try { trackerController.setEnabled(v) } catch {}
  if (v) {
    try { timelineController.applyCurrentPose() } catch {}
  }
})

function resetVirtualTrackers() {
  try {
    trackerController.reset()
    pushToast('バーチャルトラッカーをリセットしました', 'トラッカー')
  } catch {}
}

function handleTimelineAddAll() {
  ensureVirtualTrackers()
  try {
    const time = timelineController.currentTime.value
    timelineController.addSnapshotAtTime(time)
    timelineController.applyCurrentPose()
  } catch {}
}

function ensureVirtualTrackers() {
  if (virtualTrackersEnabled.value) return
  virtualTrackersEnabled.value = true
  try { trackerController.setEnabled(true) } catch {}
}

function getTrackerByKey(key) {
  return trackerController?.trackers?.value?.find(t => t.key === key)
}

function handleTimelineAddKey(payload) {
  if (!payload?.trackerKey) return
  ensureVirtualTrackers()
  try {
    const targetTime = Number.isFinite(payload.time) ? payload.time : timelineController.currentTime.value
    if (Number.isFinite(payload.time)) timelineController.setCurrentTime(payload.time)
    const tracker = getTrackerByKey(payload.trackerKey)
    if (!tracker?.mesh) return
    timelineController.addKeyframe({
      trackerKey: payload.trackerKey,
      time: targetTime,
      position: tracker.mesh.position
    })
    timelineController.applyCurrentPose()
  } catch {}
}

function handleTimelineRemoveKey(payload) {
  if (!payload?.trackerKey || !payload?.keyframeId) return
  try {
    timelineController.removeKeyframe(payload.trackerKey, payload.keyframeId)
    timelineController.applyCurrentPose()
  } catch {}
}

function handleTimelineMoveKey({ trackerKey, keyframeId, time }) {
  try {
    timelineController.updateKeyframe(trackerKey, keyframeId, { time })
  } catch {}
}

function handleTimelineSeek(time) {
  try {
    timelineController.pause()
    timelineController.setCurrentTime(time)
  } catch {}
}

function handleTimelinePlay() {
  try { timelineController.play() } catch {}
}

function handleTimelinePause() {
  try { timelineController.pause() } catch {}
}

function handleTimelineStop() {
  try { timelineController.stop() } catch {}
}

function handleTimelineStepFrames(delta) {
  try { timelineController.stepByFrames(delta) } catch {}
}

function handleTimelineJumpStart() {
  try { timelineController.setCurrentTime(timelineStartTime.value) } catch {}
}

function handleTimelineJumpEnd() {
  try { timelineController.setCurrentTime(timelineEndTime.value) } catch {}
}

function handleTimelineToggleLoop() {
  try { timelineController.loopPlayback.value = !timelineController.loopPlayback.value } catch {}
}

function handleTimelineRange({ startFrame, endFrame }) {
  try { timelineController.setRangeFromFrames(startFrame, endFrame) } catch {}
}

function handleAddMarker(time) {
  try {
    const marker = timelineController.addMarker({ time })
    if (!marker) return
    const fps = timelineFrameRate.value || 60
    const frame = Math.round((marker.time - timelineStartTime.value) * fps)
    const displayLabel = marker.label && marker.label.length > 0 ? marker.label : `t=${marker.time.toFixed(3)}s`
    pushToast(`マーカーを追加: ${displayLabel} (frame ${frame})`, 'タイムライン', 2600)
  } catch {}
}

function handleUpdateMarker({ id, time, label }) {
  try { timelineController.updateMarker(id, { time, label }) } catch {}
}

function handleRemoveMarker(id) {
  try { timelineController.removeMarker(id) } catch {}
}

function handleSelectKeyframes(ids) {
  selectedTimelineKeys.value = ids
}

function handleTimelineUpdateKey(payload) {
  if (!payload || !payload.trackerKey || !payload.keyframeId) return
  try {
    const { trackerKey, keyframeId } = payload
    const updatePayload = {}
    if (Number.isFinite(payload.time)) updatePayload.time = payload.time
    if (Array.isArray(payload.value)) updatePayload.value = payload.value
    timelineController.updateKeyframe(trackerKey, keyframeId, updatePayload)
  } catch (error) {
    if (import.meta.env.DEV) console.error('Failed to update keyframe', error)
  }
}

function handleTimelineRequestImport() {
  const input = timelineFileInput.value
  if (!input) {
    pushToast('タイムラインの読み込みに失敗しました (input missing)', 'タイムライン', 4200)
    return
  }
  input.value = ''
  input.click()
}

async function handleTimelineImportFile(event) {
  const input = event?.target
  const file = input?.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    const ok = timelineController.deserialize(data)
    if (!ok) {
      pushToast('タイムラインの読み込みに失敗しました', 'タイムライン', 4800)
      return
    }
    ensureVirtualTrackers()
    try { timelineController.pause() } catch {}
    try { timelineController.applyCurrentPose() } catch {}
    pushToast(`${file.name} を読み込みました`, 'タイムライン', 3200)
  } catch (error) {
    pushToast('タイムラインJSONの解析に失敗しました', 'タイムライン', 5200)
    if (import.meta.env.DEV) console.error('Timeline import failed', error)
  } finally {
    if (input) input.value = ''
  }
}

function handleTimelineExport() {
  try {
    const snapshot = timelineController.serialize()
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const filename = `timeline-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
    pushToast('タイムラインをエクスポートしました', 'タイムライン', 2600)
  } catch (error) {
    pushToast('タイムラインのエクスポートに失敗しました', 'タイムライン', 4800)
    if (import.meta.env.DEV) console.error('Timeline export failed', error)
  }
}

function handleTimelineClear() {
  if (!timelineController) return
  const confirmed = window.confirm('タイムラインをすべて削除しますか？')
  if (!confirmed) return
  try {
    timelineController.clearAll()
    timelineController.stop()
    pushToast('タイムラインをリセットしました', 'タイムライン', 2600)
  } catch (error) {
    pushToast('タイムラインのリセットに失敗しました', 'タイムライン', 4800)
    if (import.meta.env.DEV) console.error('Timeline clear failed', error)
  }
}

async function clearAllCache() {
  try { await clearCache() } catch {}
  try {
    showLightMarker.value = false
    lightMarkerColor.value = '#ff0000'
    directionalIntensity.value = 1
    showPhysicalBones.value = false
    showOtherBones.value = false
    showExtendedBones.value = false
    showColliderNodes.value = false
    showNonDeformingBones.value = false
    highlightConstraint.value = false
    boneDotSize.value = 0.02
    boneLabelScale.value = 1.0
    virtualTrackersEnabled.value = false
    showVirtualTrackerLabels.value = true
    virtualTrackerSize.value = 0.08
    virtualTrackerLabelScale.value = 1.0
    timelineController.clearAll()
    timelineController.stop()
    pushToast('キャッシュとタイムラインをリセットしました', 'キャッシュ')
  } catch {}
}

function handleError(e) {
  const msg = e?.error?.message || e?.message || '不明なエラーが発生しました'
  pushToast(msg, 'エラー', 5200)
  try {
    console.error('Unhandled error:', e.error || e.message)
  } catch (err) {
    console.error('Error handler failed:', err)
  }
}

function handleUnhandledRejection(e) {
  const msg = e?.reason?.message || e?.reason || '未処理のPromise拒否が発生しました'
  pushToast(msg, 'エラー', 5200)
  try {
    console.error('Unhandled rejection:', e.reason)
  } catch (err) {
    console.error('Unhandledrejection handler failed:', err)
  }
}

const { setup: setupErrorHandlers, cleanup: cleanupErrorHandlers } = useErrorHandlers({
  handleError,
  handleUnhandledRejection
})

watch([springBoneEnabled, lookAtEnabled], ([s, l]) => {
  try {
    const list = (models?.value || []).map(m => m.vrm).filter(Boolean)
    list.forEach(vrm => {
      try { vrm.springBoneManager?.setEnabled?.(s) } catch {}
      try { vrm.springBoneManager && (vrm.springBoneManager.enabled = s) } catch {}
      try { vrm.lookAt && (vrm.lookAt.enabled = l) } catch {}
    })
  } catch {}
})

watch([
  boneDotSize,
  boneLabelScale,
  showPhysicalBones,
  showOtherBones,
  showExtendedBones,
  showColliderNodes,
  showNonDeformingBones,
  highlightConstraint
], () => {
  try { applyBoneSettingsAll?.() } catch {}
})

watch(models, () => {
  if (virtualTrackersEnabled.value) {
    try { trackerController.reset() } catch {}
    try { timelineController.applyCurrentPose() } catch {}
  }
})

function toggleAllBones(v) {
  try {
    const len = models?.value?.length || 0
    for (let i = 0; i < len; i++) fileLoader.toggleBoneVisibility?.(i, v)
    applyBoneSettingsAll?.()
  } catch {}
}

function toggleAllBoneNames(v) {
  try {
    const len = models?.value?.length || 0
    for (let i = 0; i < len; i++) fileLoader.toggleBoneNameVisibility?.(i, v)
    applyBoneSettingsAll?.()
  } catch {}
}

onMounted(async () => {
  loadAutoRestore()
  loadCaptionPreference()
  loadLightingSettings({})
  setupErrorHandlers()
  const raw = localStorage.getItem('importedModels')
  initRenderer()
  try { trackerController.init?.() } catch {}

  let shouldRestore = autoRestore.value
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('restore') === '0') shouldRestore = false
  } catch {}

  if (shouldRestore) {
    await restoreCachedModel(raw ? JSON.parse(raw) : undefined)
  } else {
    try { await logToServer({ event: 'restore:skipped' }) } catch {}
  }

  try {
    const list = (models?.value || []).map(m => m.vrm).filter(Boolean)
    list.forEach(vrm => {
      try { vrm.springBoneManager?.setEnabled?.(springBoneEnabled.value) } catch {}
      try { vrm.springBoneManager && (vrm.springBoneManager.enabled = springBoneEnabled.value) } catch {}
      try { vrm.lookAt && (vrm.lookAt.enabled = lookAtEnabled.value) } catch {}
    })
    if (virtualTrackersEnabled.value) {
      try { trackerController.setEnabled(true) } catch {}
    }
  } catch {}

  pushToast('Blender風レイアウトを読み込みました', 'UI', 2400)
  logToServer({ event: 'init' })
  animate(0)
})

onUnmounted(() => {
  cleanupErrorHandlers()
  cleanupRenderer()
  try { trackerController.cleanup?.() } catch {}
})
</script>


<style scoped>
.workspace-grid {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  padding: 0;
  overflow: hidden;
  background: radial-gradient(circle at top left, rgba(120, 150, 255, 0.08), transparent 60%),
    radial-gradient(circle at bottom right, rgba(40, 60, 120, 0.1), transparent 62%);
}

.workspace-grid > .split-pane {
  flex: 1 1 auto;
}

.workspace-split {
  width: 100%;
  height: 100%;
}

.workspace-panel {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  border-radius: 0;
  background: var(--workspace-panel-bg, rgba(36, 40, 52, 0.96));
  border: none;
  box-shadow: none;
  overflow: hidden;
}

.workspace-panel__body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  padding: 0;
  background: none;
}

.workspace-panel__body--viewport,
.workspace-panel__body--timeline {
  padding: 0;
}

.workspace-panel__body--settings {
  padding: 0;
}

.workspace-panel__body--settings > * {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
}

.viewport-frame {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  background:
    radial-gradient(circle at top, rgba(120, 160, 255, 0.18), transparent 60%),
    radial-gradient(circle at bottom, rgba(40, 70, 140, 0.12), transparent 65%),
    var(--surface-strong, #232730);
  border: none;
  box-shadow: none;
  overflow: hidden;
}

.viewport-frame__canvas {
  flex: 1 1 auto;
  min-height: 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.viewport-frame__canvas canvas {
  width: 100% !important;
  height: 100% !important;
  display: block;
  margin: 0;
}

.workspace-panel__body--timeline :deep(.timeline) {
  flex: 1 1 auto;
  border-radius: 0;
  overflow: hidden;
  box-shadow: none;
  background: linear-gradient(180deg, rgba(32, 36, 48, 0.95) 0%, rgba(24, 26, 34, 0.98) 100%);
}

.workspace-panel__body--timeline :deep(.timeline__scroll-area) {
  background: linear-gradient(180deg, rgba(20, 24, 32, 0.92), rgba(16, 18, 24, 0.94));
}

.workspace-panel__body--timeline :deep(.timeline__channel-header) {
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.workspace-panel__body--timeline :deep(.timeline__channel-body) {
  background: rgba(0, 0, 0, 0.18);
}

.workspace-panel__body--timeline :deep(.timeline__playhead) {
  background: linear-gradient(180deg, rgba(255, 96, 54, 0.95), rgba(255, 176, 98, 0.85));
}

.workspace-panel__body--timeline :deep(.timeline__marker) {
  background: linear-gradient(180deg, rgba(90, 150, 255, 0.9), rgba(58, 110, 220, 0.95));
}

.workspace-panel__body--timeline :deep(.timeline__selection) {
  background: rgba(90, 140, 250, 0.22);
  border: 1px solid rgba(120, 170, 255, 0.45);
}

.workspace-panel--settings {
  padding: 0;
}

@media (max-width: 1280px) {
  .workspace-grid {
    padding: 0.85rem;
  }
}

@media (max-width: 960px) {
  .workspace-grid {
    padding: 0.6rem;
  }

  .workspace-panel__body--viewport {
    padding: var(--viewport-padding, 0.75rem);
  }
}
</style>
