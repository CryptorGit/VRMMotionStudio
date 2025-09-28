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
            :min-primary-ratio="0.2"
            :max-primary-ratio="0.95"
            :primary-min-pixels="220"
            :secondary-min-pixels="160"
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
                    :keyframes="timelineKeyframes"
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
                    @add-keyframe="handleTimelineAddKey"
                    @remove-keyframe="handleTimelineRemoveKey"
                    @remove-keyframes="handleTimelineRemoveKeys"
                    @move-keyframe="handleTimelineMoveKey"
                    @move-keyframes="handleTimelineMoveKeys"
                    @update-range="handleTimelineRange"
                    @update:snap="timelineSnap = $event"
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
import { useStoragePersistence } from '../composables/useStoragePersistence.js'

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
const STORAGE_PERSIST_TOAST_KEY = 'cache.persist.toast'
const CACHE_SAVED_TOAST_KEY = 'cache.saved.toast'
let cacheSavedToastShown = false
let storagePersistToastState = 'unknown'
let lastCacheErrorToastAt = 0

try {
  cacheSavedToastShown = sessionStorage.getItem(CACHE_SAVED_TOAST_KEY) === '1'
} catch {}
try {
  storagePersistToastState = sessionStorage.getItem(STORAGE_PERSIST_TOAST_KEY) || 'unknown'
} catch {}

const storagePersistence = useStoragePersistence()
const storageSupported = storagePersistence.supported
const storagePersisted = storagePersistence.persisted
const storageQuota = storagePersistence.quota
const storageUsage = storagePersistence.usage
const ensurePersistentStorage = storagePersistence.ensurePersistentStorage
const updateStorageEstimate = storagePersistence.updateEstimate
const DISPLAY_SETTINGS_KEY = 'ui.display.state.v1'
let displaySettingsSaveTimer = null
let restoringDisplaySettings = false

function getDisplaySettingsSnapshot() {
  return {
    showLightMarker: showLightMarker.value,
    lightMarkerColor: lightMarkerColor.value,
    directionalIntensity: directionalIntensity.value,
    springBoneEnabled: springBoneEnabled.value,
    lookAtEnabled: lookAtEnabled.value,
    showExtendedBones: showExtendedBones.value,
    showColliderNodes: showColliderNodes.value,
    showNonDeformingBones: showNonDeformingBones.value,
    highlightConstraint: highlightConstraint.value,
    showPhysicalBones: showPhysicalBones.value,
    showOtherBones: showOtherBones.value,
    boneDotSize: boneDotSize.value,
    boneLabelScale: boneLabelScale.value,
    virtualTrackersEnabled: virtualTrackersEnabled.value,
    showVirtualTrackerLabels: showVirtualTrackerLabels.value,
    virtualTrackerSize: virtualTrackerSize.value,
    virtualTrackerLabelScale: virtualTrackerLabelScale.value
  }
}

function saveDisplaySettings() {
  if (restoringDisplaySettings || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(DISPLAY_SETTINGS_KEY, JSON.stringify(getDisplaySettingsSnapshot()))
  } catch {}
}

function scheduleDisplaySettingsSave() {
  if (restoringDisplaySettings || typeof window === 'undefined') return
  if (displaySettingsSaveTimer) window.clearTimeout(displaySettingsSaveTimer)
  displaySettingsSaveTimer = window.setTimeout(() => {
    displaySettingsSaveTimer = null
    saveDisplaySettings()
  }, 180)
}

function loadDisplaySettings() {
  if (typeof localStorage === 'undefined') return
  let raw
  try {
    raw = localStorage.getItem(DISPLAY_SETTINGS_KEY)
  } catch {
    return
  }
  if (!raw) return
  try {
    const data = JSON.parse(raw)
    restoringDisplaySettings = true
    if (typeof data.showLightMarker === 'boolean') showLightMarker.value = data.showLightMarker
    if (typeof data.lightMarkerColor === 'string') lightMarkerColor.value = data.lightMarkerColor
    if (Number.isFinite(data.directionalIntensity)) directionalIntensity.value = data.directionalIntensity
    if (typeof data.springBoneEnabled === 'boolean') springBoneEnabled.value = data.springBoneEnabled
    if (typeof data.lookAtEnabled === 'boolean') lookAtEnabled.value = data.lookAtEnabled
    if (typeof data.showExtendedBones === 'boolean') showExtendedBones.value = data.showExtendedBones
    if (typeof data.showColliderNodes === 'boolean') showColliderNodes.value = data.showColliderNodes
    if (typeof data.showNonDeformingBones === 'boolean') showNonDeformingBones.value = data.showNonDeformingBones
    if (typeof data.highlightConstraint === 'boolean') highlightConstraint.value = data.highlightConstraint
    if (typeof data.showPhysicalBones === 'boolean') showPhysicalBones.value = data.showPhysicalBones
    if (typeof data.showOtherBones === 'boolean') showOtherBones.value = data.showOtherBones
    if (Number.isFinite(data.boneDotSize)) boneDotSize.value = data.boneDotSize
    if (Number.isFinite(data.boneLabelScale)) boneLabelScale.value = data.boneLabelScale
    if (typeof data.virtualTrackersEnabled === 'boolean') virtualTrackersEnabled.value = data.virtualTrackersEnabled
    if (typeof data.showVirtualTrackerLabels === 'boolean') showVirtualTrackerLabels.value = data.showVirtualTrackerLabels
    if (Number.isFinite(data.virtualTrackerSize)) virtualTrackerSize.value = data.virtualTrackerSize
    if (Number.isFinite(data.virtualTrackerLabelScale)) virtualTrackerLabelScale.value = data.virtualTrackerLabelScale
  } catch (error) {
    if (import.meta?.env?.DEV) {
      console.warn('Failed to load display settings', error)
    }
  } finally {
    restoringDisplaySettings = false
  }
}

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

function handleCachePersisted(event = {}) {
  Promise.resolve(updateStorageEstimate()).catch(() => {})
  try {
    logToServer?.({
      event: event.ok ? 'cache:persist:reported' : 'cache:persist:failed-client',
      reason: event.reason,
      ok: !!event.ok,
      persisted: storagePersisted.value,
      supported: storageSupported.value,
      message: event.error ? String(event.error?.message || event.error) : undefined
    })
  } catch {}

  if (event.ok) {
    const successReasons = ['load', 'restore', 'visibilitychange', 'pagehide', 'remove']
    if (!cacheSavedToastShown && successReasons.includes(event.reason)) {
      pushToast('キャッシュを保存しました', 'キャッシュ', 2800)
      cacheSavedToastShown = true
      try { sessionStorage.setItem(CACHE_SAVED_TOAST_KEY, '1') } catch {}
    }
  } else if (event.ok === false && event.reason !== 'clear') {
    const now = Date.now()
    if (!lastCacheErrorToastAt || now - lastCacheErrorToastAt > 10000) {
      pushToast('キャッシュの保存に失敗しました。ブラウザのストレージ設定をご確認ください。', 'キャッシュ', 5600)
      lastCacheErrorToastAt = now
    }
    if (import.meta.env.DEV && event.error) {
      console.warn('Cache persistence failure', event.reason, event.error)
    }
  }
}

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
  boneLabelScale,
  onCachePersisted: handleCachePersisted
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

const timelineSnap = ref(true)

const timelineKeyframes = computed(() => (timelineController ? timelineController.keyframes.value : []))
const timelineDuration = computed(() => (timelineController ? timelineController.duration.value : 0))
const timelineCurrentTime = computed(() => (timelineController ? timelineController.currentTime.value : 0))
const timelinePlaying = computed(() => (timelineController ? timelineController.isPlaying.value : false))
const timelineStartTime = computed(() => (timelineController ? timelineController.startTime.value : 0))
const timelineEndTime = computed(() => (timelineController ? timelineController.endTime.value : 0))
const timelineFrameRate = computed(() => (timelineController ? timelineController.frameRate.value : 60))
const timelineLoop = computed(() => (timelineController ? timelineController.loopPlayback.value : false))

function formatStorage(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB'
  const mb = bytes / (1024 * 1024)
  if (mb >= 100) return `${mb.toFixed(0)} MB`
  if (mb >= 10) return `${mb.toFixed(1)} MB`
  return `${mb.toFixed(2)} MB`
}

const frameStatus = computed(() => {
  const fps = timelineFrameRate.value || 60
  const currentFrame = Math.round(timelineCurrentTime.value * fps)
  const endFrame = Math.max(Math.round(timelineEndTime.value * fps), 0)
  return `フレーム ${currentFrame}/${endFrame} (${fps}fps)`
})

const storageStatus = computed(() => {
  if (!storageSupported.value) return 'キャッシュ: 標準保存'
  const usageBytes = storageUsage.value || 0
  const quotaBytes = storageQuota.value || 0
  const guard = storagePersisted.value ? '保護' : '未保護'
  if (!quotaBytes) {
    return `キャッシュ ${formatStorage(usageBytes)} (${guard})`
  }
  const percent = quotaBytes > 0 ? Math.min(100, Math.max(0, Math.round((usageBytes / quotaBytes) * 100))) : 0
  return `キャッシュ ${formatStorage(usageBytes)} / ${formatStorage(quotaBytes)} (${guard} ${percent}%)`
})

const statusMessage = computed(() => `${frameStatus.value} | ${storageStatus.value}`)

try {
  const savedSnap = localStorage.getItem('timeline.snap')
  if (savedSnap !== null) timelineSnap.value = savedSnap !== '0'
} catch {}

watch(timelineSnap, value => {
  try {
    localStorage.setItem('timeline.snap', value ? '1' : '0')
  } catch {}
})

watch([
  showLightMarker,
  lightMarkerColor,
  directionalIntensity,
  springBoneEnabled,
  lookAtEnabled,
  showExtendedBones,
  showColliderNodes,
  showNonDeformingBones,
  highlightConstraint,
  showPhysicalBones,
  showOtherBones,
  boneDotSize,
  boneLabelScale,
  virtualTrackersEnabled,
  showVirtualTrackerLabels,
  virtualTrackerSize,
  virtualTrackerLabelScale
], () => {
  if (restoringDisplaySettings) return
  scheduleDisplaySettingsSave()
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
  const existing = timelineController.keyframes?.value || []
  if (Array.isArray(existing) && existing.length > 0) ensureVirtualTrackers()
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

function ensureVirtualTrackers() {
  if (virtualTrackersEnabled.value) return
  virtualTrackersEnabled.value = true
  try { trackerController.setEnabled(true) } catch {}
}

function handleTimelineAddKey(payload) {
  ensureVirtualTrackers()
  try {
    const targetTime = payload && Number.isFinite(payload.time)
      ? payload.time
      : timelineController.currentTime.value
    if (Number.isFinite(payload?.time)) timelineController.setCurrentTime(payload.time)
    timelineController.addSnapshotAtTime(targetTime)
    timelineController.applyCurrentPose()
  } catch {}
}

function handleTimelineRemoveKey(payload) {
  const keyId = payload && Number.isFinite(payload.keyframeId) ? payload.keyframeId : payload
  handleTimelineRemoveKeys({ keyframeIds: [keyId] })
}

function handleTimelineRemoveKeys(payload) {
  const raw = Array.isArray(payload?.keyframeIds) ? payload.keyframeIds : payload
  const ids = (Array.isArray(raw) ? raw : [raw]).map(value => Number(value)).filter(Number.isFinite)
  if (!ids.length || !timelineController) return
  try {
    if (ids.length === 1) {
      timelineController.removeKeyframe(ids[0])
    } else if (timelineController.removeKeyframes) {
      timelineController.removeKeyframes(ids)
    } else {
      ids.forEach(id => timelineController.removeKeyframe(id))
    }
    timelineController.applyCurrentPose()
  } catch {}
}

function handleTimelineMoveKey({ keyframeId, time }) {
  if (!Number.isFinite(keyframeId)) return
  handleTimelineMoveKeys({ updates: [{ keyframeId, time }] })
}

function handleTimelineMoveKeys(payload) {
  const updates = Array.isArray(payload?.updates) ? payload.updates : []
  const normalized = updates
    .map(update => ({
      keyframeId: Number(update.keyframeId ?? update.id),
      time: Number(update.time)
    }))
    .filter(update => Number.isFinite(update.keyframeId) && Number.isFinite(update.time))
  if (!normalized.length || !timelineController) return
  try {
    if (normalized.length === 1) {
      const { keyframeId, time } = normalized[0]
      timelineController.updateKeyframe(keyframeId, { time })
    } else if (timelineController.moveKeyframes) {
      timelineController.moveKeyframes(normalized)
    } else {
      normalized.forEach(({ keyframeId, time }) => timelineController.updateKeyframe(keyframeId, { time }))
    }
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
    Promise.resolve(updateStorageEstimate()).catch(() => {})
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
    Promise.resolve(updateStorageEstimate()).catch(() => {})
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
    Promise.resolve(updateStorageEstimate()).catch(() => {})
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
  let persistedGranted = false
  try {
    persistedGranted = await ensurePersistentStorage()
  } catch {
    persistedGranted = false
  }

  if (storageSupported.value) {
    if (persistedGranted) {
      if (storagePersistToastState !== 'granted') {
        pushToast('キャッシュの永続化が有効になりました', 'キャッシュ', 3600)
        storagePersistToastState = 'granted'
        try { sessionStorage.setItem(STORAGE_PERSIST_TOAST_KEY, 'granted') } catch {}
      }
    } else if (storagePersistToastState !== 'denied') {
      pushToast('キャッシュの永続化を利用できませんでした。ブラウザのストレージ設定をご確認ください。', 'キャッシュ', 5600)
      storagePersistToastState = 'denied'
      try { sessionStorage.setItem(STORAGE_PERSIST_TOAST_KEY, 'denied') } catch {}
    }
  } else if (storagePersistToastState !== 'unsupported') {
    storagePersistToastState = 'unsupported'
    try { sessionStorage.setItem(STORAGE_PERSIST_TOAST_KEY, 'unsupported') } catch {}
  }

  Promise.resolve(updateStorageEstimate()).catch(() => {})

  loadAutoRestore()
  loadCaptionPreference()
  loadLightingSettings({})
  loadDisplaySettings()
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
  if (typeof window !== 'undefined' && displaySettingsSaveTimer) {
    window.clearTimeout(displaySettingsSaveTimer)
    displaySettingsSaveTimer = null
  }
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

.workspace-panel__body--timeline :deep(.timeline__playhead) {
  background: linear-gradient(180deg, rgba(255, 96, 54, 0.95), rgba(255, 176, 98, 0.85));
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
