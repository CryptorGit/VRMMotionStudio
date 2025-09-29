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
                    <div class="viewport-overlay viewport-overlay--top-left top-left-controls">
                      <label class="mode-switch" aria-label="ビューモード切替">
                        <span>モード</span>
                        <select v-model="viewportMode">
                          <option v-for="mode in viewportModes" :key="mode.value" :value="mode.value">
                            {{ mode.label }}
                          </option>
                        </select>
                      </label>
                      <div class="round-buttons">
                        <button class="round-btn" :disabled="!history.canUndo" @click="onUndo" :title="tooltip('元に戻す (Undo)')">⟲</button>
                        <button class="round-btn" :disabled="!history.canRedo" @click="onRedo" :title="tooltip('やり直し (Redo)')">⟳</button>
                      </div>
                    </div>
                    <div v-if="isCameraMode" class="viewport-overlay viewport-overlay--top-right">
                      <div class="camera-status">
                        <span class="camera-status__label">RenderCam</span>
                        <span class="camera-status__resolution">{{ renderCameraWidth }} × {{ renderCameraHeight }}</span>
                      </div>
                    </div>
                    <div v-if="isCameraMode" class="viewport-overlay viewport-overlay--bottom-left">
                      <p class="camera-hint">
                        左ドラッグ: 平行移動 ／ 右ドラッグ: パン・チルト ／ ホイール: ズーム
                      </p>
                    </div>
                    <div class="viewport-overlay viewport-overlay--bottom-right">
                      <div
                        class="yaw-ring"
                        ref="rollRingRef"
                        :class="{ 'is-active': rollDragState.active }"
                        @pointerdown.prevent="onRollRingPointerDown"
                        @contextmenu.prevent
                      >
                        <div class="yaw-ring__indicator" :style="rollIndicatorStyle"></div>
                        <div class="yaw-ring__label">Roll {{ renderCameraRollDeg.toFixed(0) }}°</div>
                      </div>
                    </div>
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
                v-model:camera-fov="renderCameraFov"
                v-model:camera-near="renderCameraNear"
                v-model:camera-far="renderCameraFar"
                v-model:camera-resolution-width="renderCameraWidth"
                v-model:camera-resolution-height="renderCameraHeight"
                v-model:show-camera-helper="showRenderCameraHelper"
                :capture-busy="captureBusy"
                @reset-virtual-trackers="resetVirtualTrackers"
                @toggle-model="toggleModelVisibility"
                @toggle-bone="toggleBoneVisibility"
                @toggle-bone-names="toggleBoneNameVisibility"
                @toggle-all-bones="toggleAllBones"
                @toggle-all-bone-names="toggleAllBoneNames"
                @remove-model="removeModel"
                @capture-render="captureRenderImage"
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
import { ref, shallowRef, computed, onMounted, onUnmounted, watch, provide, reactive } from 'vue'
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
import { useHistory } from '../composables/useHistory.js'
import { useTheme } from '../composables/useTheme.js'
import { captionInjectionKey } from '../composables/useCaptions.js'
import { useStoragePersistence } from '../composables/useStoragePersistence.js'

const viewer = ref(null)
const currentMeshRef = ref(null)
const springBoneEnabled = ref(true)
const lookAtEnabled = ref(true)

const scene = shallowRef(null)
const camera = shallowRef(null)
const viewCamera = shallowRef(null)
const renderCamera = shallowRef(null)
const renderCameraHelper = shallowRef(null)
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

const viewportMode = ref('view')
const isCameraMode = computed(() => viewportMode.value === 'camera')

const renderCameraFov = ref(45)
const renderCameraNear = ref(0.1)
const renderCameraFar = ref(2000)
const renderCameraWidth = ref(1920)
const renderCameraHeight = ref(1080)
const showRenderCameraHelper = ref(false)
const captureBusy = ref(false)

const renderCameraRollDeg = ref(0)
const cameraManipulating = ref(false)

const rollRingRef = ref(null)
const viewportModes = [
  { value: 'view', label: 'ビューモード' },
  { value: 'camera', label: 'カメラモード' }
]

const cameraInteraction = reactive({
  pointerId: null,
  type: null,
  startX: 0,
  startY: 0,
  startPosition: new THREE.Vector3(),
  startQuaternion: new THREE.Quaternion()
})

const rollDragState = reactive({
  active: false,
  startAngle: 0,
  startRoll: 0
})

let cameraEventsAttached = false

const clock = new THREE.Clock()
const TARGET_FPS = 30
const cameraTarget = new THREE.Vector3(0, 1.2, 0)
const pointerRaycaster = new THREE.Raycaster()
const pointerNdc = new THREE.Vector2()
const tempVec3A = new THREE.Vector3()
const tempVec3B = new THREE.Vector3()
const tempVec3C = new THREE.Vector3()
const tempEuler = new THREE.Euler()
const MIN_RENDER_RESOLUTION = 64
const MAX_RENDER_RESOLUTION = 16384

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
    virtualTrackerLabelScale: virtualTrackerLabelScale.value,
    cameraFov: renderCameraFov.value,
    cameraNear: renderCameraNear.value,
    cameraFar: renderCameraFar.value,
    cameraResolutionWidth: renderCameraWidth.value,
    cameraResolutionHeight: renderCameraHeight.value,
    showCameraHelper: showRenderCameraHelper.value
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
    if (Number.isFinite(data.cameraFov)) renderCameraFov.value = data.cameraFov
    if (Number.isFinite(data.cameraNear)) renderCameraNear.value = data.cameraNear
    if (Number.isFinite(data.cameraFar)) renderCameraFar.value = data.cameraFar
    if (Number.isFinite(data.cameraResolutionWidth)) renderCameraWidth.value = data.cameraResolutionWidth
    if (Number.isFinite(data.cameraResolutionHeight)) renderCameraHeight.value = data.cameraResolutionHeight
    if (typeof data.showCameraHelper === 'boolean') showRenderCameraHelper.value = data.showCameraHelper
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
    syncCameraFromTracker()
    updateRenderCameraHelper()
  } catch {}
}

const cameraTracker = computed(() => {
  const list = trackerController?.trackers?.value || []
  return list.find(item => item?.key === 'renderCamera') || null
})

function updateCameraRollRef() {
  if (!renderCamera.value) return
  tempEuler.setFromQuaternion(renderCamera.value.quaternion, 'YXZ')
  renderCameraRollDeg.value = THREE.MathUtils.radToDeg(tempEuler.z)
}

function clampRenderResolution(value, fallback) {
  const num = Math.round(Number(value) || 0)
  if (!Number.isFinite(num) || num <= 0) return fallback
  return Math.min(MAX_RENDER_RESOLUTION, Math.max(MIN_RENDER_RESOLUTION, num))
}

function updateRenderCameraHelper() {
  if (!renderCameraHelper.value || !renderCamera.value) return
  try { renderCameraHelper.value.update() } catch {}
}

function updateCameraTrackerFromCamera() {
  const tracker = cameraTracker.value
  if (!tracker?.mesh || !renderCamera.value) return
  tracker.mesh.position.copy(renderCamera.value.position)
  tracker.mesh.quaternion.copy(renderCamera.value.quaternion)
}

function syncCameraFromTracker(force = false) {
  const tracker = cameraTracker.value
  if (!tracker?.mesh || !renderCamera.value) return
  if (cameraManipulating.value && !force) {
    updateCameraTrackerFromCamera()
    return
  }
  renderCamera.value.position.copy(tracker.mesh.position)
  renderCamera.value.quaternion.copy(tracker.mesh.quaternion)
  renderCamera.value.updateMatrixWorld(true)
  updateCameraRollRef()
}

watch(cameraTracker, tracker => {
  if (!tracker?.mesh || !renderCamera.value) return
  // When the camera tracker becomes available/changes, snap the render camera to it
  // to ensure camera aligns with the orange virtual tracker.
  try { syncCameraFromTracker(true) } catch {}
})

function ensureRenderCameraHelper() {
  if (!scene.value || !renderCamera.value) return
  if (!renderCameraHelper.value) {
    renderCameraHelper.value = new THREE.CameraHelper(renderCamera.value)
  }
  if (!scene.value.children.includes(renderCameraHelper.value)) {
    scene.value.add(renderCameraHelper.value)
  }
  renderCameraHelper.value.visible = true
  updateRenderCameraHelper()
}

function disposeRenderCameraHelper() {
  if (!renderCameraHelper.value) return
  try {
    renderCameraHelper.value.visible = false
    scene.value?.remove(renderCameraHelper.value)
  } catch {}
}

function setupRenderCamera() {
  if (!scene.value || !viewer.value) return
  const container = viewer.value
  const width = Math.max(container.clientWidth || 1, 1)
  const height = Math.max(container.clientHeight || 1, 1)
  const aspect = width / height
  renderCamera.value = new THREE.PerspectiveCamera(
    renderCameraFov.value,
    aspect,
    renderCameraNear.value,
    renderCameraFar.value
  )
  renderCamera.value.name = 'RenderCamera'
  if (controls.value?.target) {
    cameraTarget.copy(controls.value.target)
  }
  // If camera tracker exists, prefer its transform; else fall back to current view camera
  const tracker = cameraTracker.value
  if (tracker?.mesh) {
    renderCamera.value.position.copy(tracker.mesh.position)
    renderCamera.value.quaternion.copy(tracker.mesh.quaternion)
    renderCamera.value.up.set(0, 1, 0)
  } else {
    const referenceCamera = viewCamera.value || camera.value
    if (referenceCamera) {
      renderCamera.value.position.copy(referenceCamera.position)
      renderCamera.value.quaternion.copy(referenceCamera.quaternion)
      renderCamera.value.up.copy(referenceCamera.up)
    } else {
      renderCamera.value.position.set(0, 10, 30)
      renderCamera.value.up.set(0, 1, 0)
      renderCamera.value.lookAt(cameraTarget)
    }
  }
  renderCamera.value.updateMatrixWorld(true)
  scene.value.add(renderCamera.value)
  updateCameraRollRef()
  // Ensure final alignment prefers tracker -> camera if tracker is present later as well
  syncCameraFromTracker(true)
  if (showRenderCameraHelper.value) ensureRenderCameraHelper()
}

function refreshCameraAspect() {
  if (!viewer.value || !renderer.value) return
  const width = Math.max(viewer.value.clientWidth || 1, 1)
  const height = Math.max(viewer.value.clientHeight || 1, 1)
  const aspect = width / height
  if (viewCamera.value) {
    viewCamera.value.aspect = aspect
    viewCamera.value.updateProjectionMatrix()
  }
  if (renderCamera.value) {
    renderCamera.value.aspect = aspect
    renderCamera.value.updateProjectionMatrix()
    updateRenderCameraHelper()
  }
  renderer.value.setSize(width, height, false)
  renderer.value.setViewport(0, 0, width, height)
  renderer.value.setScissor(0, 0, width, height)
  renderer.value.setScissorTest(false)
}

function pointerHitsTracker(event) {
  if (!trackerController?.trackers?.value?.length || !camera.value) return false
  const dom = renderer.value?.domElement
  if (!dom) return false
  const rect = dom.getBoundingClientRect()
  pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  pointerRaycaster.setFromCamera(pointerNdc, camera.value)
  const meshes = trackerController.trackers.value.map(t => t.mesh).filter(Boolean)
  return pointerRaycaster.intersectObjects(meshes, false).length > 0
}

function handleCameraPointerDown(event) {
  if (!isCameraMode.value || !renderCamera.value) return
  if (event.button !== 0 && event.button !== 2) return
  if (pointerHitsTracker(event)) return
  // Take a history snapshot at the beginning of camera manipulation
  try { pushHistory('camera-manipulate') } catch {}
  cameraManipulating.value = true
  cameraInteraction.pointerId = event.pointerId
  cameraInteraction.type = event.button === 2 ? 'rotate' : 'translate'
  cameraInteraction.startX = event.clientX
  cameraInteraction.startY = event.clientY
  cameraInteraction.startPosition.copy(renderCamera.value.position)
  cameraInteraction.startQuaternion.copy(renderCamera.value.quaternion)
  renderer.value?.domElement?.setPointerCapture?.(event.pointerId)
  event.preventDefault()
}

function handleCameraPointerMove(event) {
  if (!cameraManipulating.value || event.pointerId !== cameraInteraction.pointerId || !renderCamera.value) return
  event.preventDefault()
  if (cameraInteraction.type === 'translate') {
    const deltaX = event.clientX - cameraInteraction.startX
    const deltaY = event.clientY - cameraInteraction.startY
    const distance = cameraInteraction.startPosition.distanceTo(cameraTarget)
    const panSpeed = Math.max(distance * 0.0025, 0.02)
    tempVec3A.set(1, 0, 0).applyQuaternion(cameraInteraction.startQuaternion).multiplyScalar(-deltaX * panSpeed)
    tempVec3B.set(0, 1, 0).applyQuaternion(cameraInteraction.startQuaternion).multiplyScalar(deltaY * panSpeed)
    tempVec3C.copy(cameraInteraction.startPosition).add(tempVec3A).add(tempVec3B)
    renderCamera.value.position.copy(tempVec3C)
  } else {
    const deltaX = event.clientX - cameraInteraction.startX
    const deltaY = event.clientY - cameraInteraction.startY
    const yawDelta = deltaX * 0.005
    const pitchDelta = deltaY * 0.005
    const startEuler = tempEuler.setFromQuaternion(cameraInteraction.startQuaternion, 'YXZ')
    const nextPitch = THREE.MathUtils.clamp(startEuler.x - pitchDelta, THREE.MathUtils.degToRad(-89), THREE.MathUtils.degToRad(89))
    const nextYaw = startEuler.y - yawDelta
    tempEuler.set(nextPitch, nextYaw, startEuler.z, 'YXZ')
    renderCamera.value.quaternion.setFromEuler(tempEuler)
  }
  renderCamera.value.updateMatrixWorld(true)
  updateCameraRollRef()
  updateCameraTrackerFromCamera()
  updateRenderCameraHelper()
}

function handleCameraPointerUp(event) {
  if (event.pointerId !== cameraInteraction.pointerId) return
  renderer.value?.domElement?.releasePointerCapture?.(event.pointerId)
  cameraManipulating.value = false
  cameraInteraction.pointerId = null
  updateCameraTrackerFromCamera()
  updateRenderCameraHelper()
}

function handleCameraWheel(event) {
  if (!isCameraMode.value || !renderCamera.value) return
  event.preventDefault()
  // Snapshot before applying zoom for undo support
  try { pushHistory('camera-zoom') } catch {}
  const delta = Math.sign(event.deltaY)
  tempVec3A.copy(renderCamera.value.position).sub(cameraTarget)
  const length = tempVec3A.length()
  const zoomSpeed = Math.max(length * 0.12, 0.5)
  const nextLength = THREE.MathUtils.clamp(length + delta * zoomSpeed * 0.05, 0.5, 400)
  tempVec3A.normalize().multiplyScalar(nextLength)
  renderCamera.value.position.copy(cameraTarget).add(tempVec3A)
  renderCamera.value.updateMatrixWorld(true)
  updateCameraRollRef()
  updateCameraTrackerFromCamera()
  updateRenderCameraHelper()
}

function attachCameraModeEvents() {
  const dom = renderer.value?.domElement
  if (!dom || cameraEventsAttached) return
  dom.addEventListener('pointerdown', handleCameraPointerDown)
  dom.addEventListener('pointermove', handleCameraPointerMove)
  dom.addEventListener('pointerup', handleCameraPointerUp)
  dom.addEventListener('pointercancel', handleCameraPointerUp)
  dom.addEventListener('wheel', handleCameraWheel, { passive: false })
  cameraEventsAttached = true
}

function detachCameraModeEvents() {
  const dom = renderer.value?.domElement
  if (!dom || !cameraEventsAttached) return
  dom.removeEventListener('pointerdown', handleCameraPointerDown)
  dom.removeEventListener('pointermove', handleCameraPointerMove)
  dom.removeEventListener('pointerup', handleCameraPointerUp)
  dom.removeEventListener('pointercancel', handleCameraPointerUp)
  dom.removeEventListener('wheel', handleCameraWheel)
  cameraEventsAttached = false
}

function computeRollRingAngle(event) {
  const el = rollRingRef.value
  if (!el) return 0
  const rect = el.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const dx = event.clientX - cx
  const dy = cy - event.clientY
  return Math.atan2(dx, dy)
}

function setRenderCameraRoll(radians) {
  if (!renderCamera.value) return
  const current = tempEuler.setFromQuaternion(renderCamera.value.quaternion, 'YXZ')
  tempEuler.set(current.x, current.y, radians, 'YXZ')
  renderCamera.value.quaternion.setFromEuler(tempEuler)
  renderCamera.value.updateMatrixWorld(true)
  updateCameraRollRef()
  updateRenderCameraHelper()
  updateCameraTrackerFromCamera()
}

function onRollRingPointerDown(event) {
  if (!renderCamera.value) return
  event.preventDefault()
  // Snapshot before starting roll manipulation
  try { pushHistory('camera-roll') } catch {}
  rollDragState.active = true
  rollDragState.startAngle = computeRollRingAngle(event)
  rollDragState.startRoll = THREE.MathUtils.degToRad(renderCameraRollDeg.value)
  cameraManipulating.value = true
  window.addEventListener('pointermove', onRollRingPointerMove)
  window.addEventListener('pointerup', onRollRingPointerUp)
}

function onRollRingPointerMove(event) {
  if (!rollDragState.active) return
  event.preventDefault()
  const angle = computeRollRingAngle(event)
  const delta = angle - rollDragState.startAngle
  const wrapped = THREE.MathUtils.euclideanModulo(delta + Math.PI, Math.PI * 2) - Math.PI
  setRenderCameraRoll(rollDragState.startRoll + wrapped)
}

function onRollRingPointerUp() {
  if (!rollDragState.active) return
  rollDragState.active = false
  cameraManipulating.value = false
  window.removeEventListener('pointermove', onRollRingPointerMove)
  window.removeEventListener('pointerup', onRollRingPointerUp)
  updateCameraTrackerFromCamera()
}

const rollIndicatorStyle = computed(() => ({
  // Keep the indicator base at the ring center and rotate around it
  transform: `translateX(-50%) rotate(${renderCameraRollDeg.value}deg)`
}))

const timelineSnap = ref(true)

// Mirror timeline state into refs to avoid stale computed dependencies before controller is created
const timelineKeyframes = ref([])
const timelineDuration = ref(0)
const timelineCurrentTime = ref(0)
const timelinePlaying = ref(false)
const timelineStartTime = ref(0)
const timelineEndTime = ref(0)
const timelineFrameRate = ref(60)
const timelineLoop = ref(false)

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
  virtualTrackerLabelScale,
  renderCameraFov,
  renderCameraNear,
  renderCameraFar,
  renderCameraWidth,
  renderCameraHeight,
  showRenderCameraHelper
], () => {
  if (restoringDisplaySettings) return
  scheduleDisplaySettingsSave()
})

watch(renderCameraFov, value => {
  if (!renderCamera.value) return
  renderCamera.value.fov = value
  renderCamera.value.updateProjectionMatrix()
  updateRenderCameraHelper()
})

watch([renderCameraNear, renderCameraFar], ([near, far]) => {
  if (!renderCamera.value) return
  const safeNear = Math.max(0.001, near)
  const safeFar = Math.max(safeNear + 0.1, far)
  renderCamera.value.near = safeNear
  renderCamera.value.far = safeFar
  renderCamera.value.updateProjectionMatrix()
  updateRenderCameraHelper()
})

watch(showRenderCameraHelper, visible => {
  if (visible) ensureRenderCameraHelper()
  else disposeRenderCameraHelper()
})

watch(viewportMode, mode => {
  if (mode === 'camera') {
    if (controls.value) {
      controls.value.enabled = false
      cameraTarget.copy(controls.value.target)
    }
    if (renderCamera.value) {
      camera.value = renderCamera.value
      renderCamera.value.updateProjectionMatrix()
      syncCameraFromTracker(true)
      updateCameraRollRef()
    }
  } else {
    if (controls.value) controls.value.enabled = true
    if (viewCamera.value) camera.value = viewCamera.value
  }
  refreshCameraAspect()
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
  showTrackerLabels: showVirtualTrackerLabels,
  onManipulateStart: () => pushHistory('tracker-drag')
})

timelineController = useTimeline({ trackers: trackerController.trackers })
// Bridge timeline controller state into local refs for reliable reactivity
if (timelineController) {
  const syncTimelineRefs = () => {
    try {
      timelineKeyframes.value = Array.isArray(timelineController.keyframes?.value) ? timelineController.keyframes.value : []
      timelineDuration.value = Number(timelineController.duration?.value ?? 0)
      timelineCurrentTime.value = Number(timelineController.currentTime?.value ?? 0)
      timelinePlaying.value = !!(timelineController.isPlaying?.value)
      timelineStartTime.value = Number(timelineController.startTime?.value ?? 0)
      timelineEndTime.value = Number(timelineController.endTime?.value ?? 0)
      timelineFrameRate.value = Number(timelineController.frameRate?.value ?? 60)
      timelineLoop.value = !!(timelineController.loopPlayback?.value)
    } catch {}
  }
  syncTimelineRefs()
  watch(
    [
      () => timelineController.keyframes?.value,
      () => timelineController.duration?.value,
      () => timelineController.currentTime?.value,
      () => timelineController.isPlaying?.value,
      () => timelineController.startTime?.value,
      () => timelineController.endTime?.value,
      () => timelineController.frameRate?.value,
      () => timelineController.loopPlayback?.value
    ],
    () => syncTimelineRefs(),
    { immediate: false }
  )
}
// History (undo/redo)
const history = useHistory({
  read: () => {
    try {
      const timeline = timelineController?.serialize?.()
      const trackersSnap = (() => {
        const list = trackerController?.trackers?.value || []
        return list.map(t => ({ key: t.key, p: t.mesh.position.toArray([]), q: t.mesh.quaternion.toArray([]) }))
      })()
      const cameraSnap = renderCamera.value
        ? { p: renderCamera.value.position.toArray([]), q: renderCamera.value.quaternion.toArray([]), fov: renderCameraFov.value, near: renderCameraNear.value, far: renderCameraFar.value }
        : null
      const ui = {
        viewportMode: viewportMode.value,
        virtualTrackersEnabled: virtualTrackersEnabled.value
      }
      return { timeline, trackersSnap, cameraSnap, ui }
    } catch { return null }
  },
  apply: state => {
    try {
      if (!state) return
      if (state.timeline) timelineController?.deserialize?.(state.timeline)
      if (Array.isArray(state.trackersSnap)) {
        const map = new Map(state.trackersSnap.map(s => [s.key, s]))
        const list = trackerController?.trackers?.value || []
        list.forEach(t => {
          const s = map.get(t.key)
          if (!s) return
          if (Array.isArray(s.p) && s.p.length === 3) t.mesh.position.fromArray(s.p)
          if (Array.isArray(s.q) && s.q.length === 4) t.mesh.quaternion.fromArray(s.q)
        })
      }
      if (state.cameraSnap && renderCamera.value) {
        const s = state.cameraSnap
        if (Array.isArray(s.p) && s.p.length === 3) renderCamera.value.position.fromArray(s.p)
        if (Array.isArray(s.q) && s.q.length === 4) renderCamera.value.quaternion.fromArray(s.q)
        if (Number.isFinite(s.fov)) renderCameraFov.value = s.fov
        if (Number.isFinite(s.near)) renderCameraNear.value = s.near
        if (Number.isFinite(s.far)) renderCameraFar.value = s.far
        renderCamera.value.updateMatrixWorld(true)
        updateRenderCameraHelper()
        updateCameraRollRef()
      }
      if (state.ui) {
        viewportMode.value = state.ui.viewportMode || viewportMode.value
        virtualTrackersEnabled.value = !!state.ui.virtualTrackersEnabled
        try { trackerController.setEnabled(virtualTrackersEnabled.value) } catch {}
      }
      applyTimelinePoseImmediate()
    } catch {}
  },
  limit: 200
})

function onUndo() { history.undo() }
function onRedo() { history.redo() }

function pushHistory(label) {
  try { history.push(label) } catch {}
}

if (timelineController) {
  const existing = timelineController.keyframes?.value || []
  if (Array.isArray(existing) && existing.length > 0) ensureVirtualTrackers()
}

watch(virtualTrackersEnabled, v => {
  try { trackerController.setEnabled(v) } catch {}
  if (v) {
    applyTimelinePoseImmediate()
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

function applyTimelinePoseImmediate() {
  try { timelineController?.applyCurrentPose() } catch {}
  syncCameraFromTracker(true)
}

function handleTimelineAddKey(payload) {
  ensureVirtualTrackers()
  try {
    pushHistory('add-key')
    const targetTime = payload && Number.isFinite(payload.time)
      ? payload.time
      : timelineController.currentTime.value
    if (Number.isFinite(payload?.time)) timelineController.setCurrentTime(payload.time)
    timelineController.addSnapshotAtTime(targetTime)
    applyTimelinePoseImmediate()
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
    pushHistory('remove-keys')
    if (ids.length === 1) {
      timelineController.removeKeyframe(ids[0])
    } else if (timelineController.removeKeyframes) {
      timelineController.removeKeyframes(ids)
    } else {
      ids.forEach(id => timelineController.removeKeyframe(id))
    }
    applyTimelinePoseImmediate()
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
    pushHistory('move-keys')
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
  try { pushHistory('range'); timelineController.setRangeFromFrames(startFrame, endFrame) } catch {}
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
  pushHistory('import')
  const ok = timelineController.deserialize(data)
    if (!ok) {
      pushToast('タイムラインの読み込みに失敗しました', 'タイムライン', 4800)
      return
    }
    ensureVirtualTrackers()
    try { timelineController.pause() } catch {}
  applyTimelinePoseImmediate()
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
    pushHistory('clear')
    timelineController.clearAll()
    timelineController.stop()
    pushToast('タイムラインをリセットしました', 'タイムライン', 2600)
    Promise.resolve(updateStorageEstimate()).catch(() => {})
  } catch (error) {
    pushToast('タイムラインのリセットに失敗しました', 'タイムライン', 4800)
    if (import.meta.env.DEV) console.error('Timeline clear failed', error)
  }
}

function captureRenderImage() {
  if (captureBusy.value) return
  if (!renderer.value || !scene.value || !renderCamera.value) {
    pushToast('レンダーカメラがまだ準備できていません', 'カメラ', 4200)
    return
  }

  captureBusy.value = true
  const width = clampRenderResolution(renderCameraWidth.value, 1920)
  const height = clampRenderResolution(renderCameraHeight.value, 1080)
  let prevPixelRatio = 1
  const prevViewport = new THREE.Vector4()
  const prevScissor = new THREE.Vector4()
  let prevScissorTest = false
  let prevAspect = renderCamera.value.aspect

  try {
    prevPixelRatio = renderer.value.getPixelRatio?.() ?? 1
    renderer.value.getViewport(prevViewport)
    renderer.value.getScissor(prevScissor)
    prevScissorTest = renderer.value.getScissorTest?.() ?? false
    prevAspect = renderCamera.value.aspect

    renderCamera.value.aspect = width / height
    renderCamera.value.updateProjectionMatrix()
    updateRenderCameraHelper()

    renderer.value.setPixelRatio(1)
    renderer.value.setSize(width, height, false)
    renderer.value.setViewport(0, 0, width, height)
    renderer.value.setScissor(0, 0, width, height)
    renderer.value.setScissorTest(true)
    renderer.value.render(scene.value, renderCamera.value)

    const canvas = renderer.value.domElement
    if (!canvas) throw new Error('Renderer canvas unavailable')
    const dataUrl = canvas.toDataURL('image/png')
    const filename = `render-${new Date().toISOString().replace(/[:.]/g, '-')}.png`
    const anchor = document.createElement('a')
    anchor.href = dataUrl
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    pushToast(`${filename} を保存しました`, 'カメラ', 2800)
  } catch (error) {
    pushToast('レンダー画像の書き出しに失敗しました', 'カメラ', 5200)
    if (import.meta.env.DEV) console.error('Render capture failed', error)
  } finally {
    try {
      if (renderCamera.value) {
        renderCamera.value.aspect = prevAspect
        renderCamera.value.updateProjectionMatrix()
        updateRenderCameraHelper()
      }
    } catch {}

    try {
      if (renderer.value) {
        renderer.value.setPixelRatio?.(prevPixelRatio)
        renderer.value.setViewport?.(prevViewport.x, prevViewport.y, prevViewport.z, prevViewport.w)
        renderer.value.setScissor?.(prevScissor.x, prevScissor.y, prevScissor.z, prevScissor.w)
        renderer.value.setScissorTest?.(prevScissorTest)
      }
    } catch {}

    try {
      refreshCameraAspect()
    } catch {}

    captureBusy.value = false
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
    applyTimelinePoseImmediate()
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
  viewCamera.value = camera.value
  setupRenderCamera()
  refreshCameraAspect()
  attachCameraModeEvents()
  updateCameraTrackerFromCamera()
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
  detachCameraModeEvents()
  if (typeof window !== 'undefined') {
    window.removeEventListener('pointermove', onRollRingPointerMove)
    window.removeEventListener('pointerup', onRollRingPointerUp)
  }
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
  position: relative;
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

.viewport-overlay {
  position: absolute;
  pointer-events: none;
  z-index: 12;
}

.viewport-overlay > * {
  pointer-events: auto;
}

.viewport-overlay--top-right {
  top: 14px;
  right: 14px;
}

.viewport-overlay--top-left {
  top: 14px;
  left: 14px;
}

.viewport-overlay--bottom-left {
  bottom: 14px;
  left: 14px;
  max-width: 320px;
}

.viewport-overlay--bottom-right {
  bottom: 14px;
  right: 14px;
}

.mode-switch {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  background: rgba(18, 22, 32, 0.85);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.45);
  font-size: 0.8rem;
  color: rgba(226, 230, 245, 0.9);
  backdrop-filter: blur(6px);
}

.mode-switch span {
  font-weight: 600;
}

.mode-switch select {
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 14px;
  padding: 0.35rem 0.8rem;
  background: rgba(24, 28, 38, 0.85);
  color: inherit;
  font-size: 0.82rem;
}

.camera-status {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.4rem 0.75rem;
  border-radius: 999px;
  background: rgba(18, 21, 30, 0.82);
  color: rgba(225, 230, 246, 0.88);
  font-size: 0.78rem;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.38);
  backdrop-filter: blur(6px);
}

.camera-status__label {
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.camera-status__resolution {
  opacity: 0.8;
}

.camera-hint {
  margin: 0;
  padding: 0.5rem 0.75rem;
  border-radius: 10px;
  background: rgba(17, 20, 28, 0.78);
  color: rgba(220, 230, 250, 0.85);
  font-size: 0.72rem;
  line-height: 1.4;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
}

.yaw-ring {
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.28);
  background: radial-gradient(circle, rgba(226, 235, 255, 0.08) 0%, rgba(8, 11, 18, 0.78) 68%);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  user-select: none;
}

.yaw-ring.is-active {
  border-color: rgba(124, 171, 255, 0.9);
  box-shadow: 0 0 24px rgba(99, 156, 255, 0.5);
}

.yaw-ring__indicator {
  position: absolute;
  left: 50%;
  bottom: 50%;
  width: 2px;
  height: 38%;
  background: color-mix(in srgb, var(--accent, #5c8cff) 80%, rgba(255, 255, 255, 0.4));
  transform-origin: center bottom;
  /* Y is anchored via bottom:50%; only X needs centering */
  transform: translateX(-50%);
  border-radius: 999px;
  box-shadow: 0 0 12px rgba(96, 150, 255, 0.65);
}

.top-left-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.round-buttons {
  display: flex;
  gap: 8px;
}

.round-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(24, 28, 38, 0.85);
  color: rgba(230, 236, 255, 0.95);
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 10px 20px rgba(0,0,0,0.35);
}

.round-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.yaw-ring__label {
  position: absolute;
  left: 50%;
  bottom: 10px;
  transform: translateX(-50%);
  font-size: 0.75rem;
  color: rgba(228, 234, 255, 0.85);
  font-weight: 600;
  letter-spacing: 0.04em;
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
