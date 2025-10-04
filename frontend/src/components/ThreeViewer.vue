<template>
  <div class="app-frame">
    <TopMenuBar
      :theme="theme"
      :auto-restore="autoRestore"
      :show-captions="showCaptions"
      :timeline-export-enabled="timelineHasContent"
      @import="openFile"
      @export="exportPose"
      @clear-cache="clearAllCache"
      @toggle-auto-restore="toggleAutoRestore"
      @toggle-theme="toggleTheme"
      @toggle-captions="toggleCaptions"
      @timeline-import="handleTimelineRequestImport"
      @timeline-export="handleTimelineExport"
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
                        左ドラッグ: 平行移動 ／ 右ドラッグ: パン・チルト ／ ホイール: 前後移動
                      </p>
                    </div>
                    <div v-else-if="virtualTrackersEnabled" class="viewport-overlay viewport-overlay--bottom-left">
                      <p class="tracker-hint">
                        左ドラッグ: 位置移動 ／ Shift: 微調整
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
                      @contextmenu.prevent
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
                    :can-paste="timelineClipboardReady"
                    @import-timeline="handleTimelineRequestImport"
                    @export-timeline="handleTimelineExport"
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
                    @clear-timeline="handleTimelineClear"
                    @copy-keyframes="handleTimelineCopyKeyframes"
                    @paste-keyframes="handleTimelinePasteKeyframes"
                    @update-keyframe-selection="handleTimelineSelectionChange"
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
                v-model:outline-width="outlineWidth"
                v-model:outline-color="outlineColor"
                v-model:virtual-trackers-enabled="virtualTrackersEnabled"
                v-model:virtual-tracker-display-visible="virtualTrackerDisplayVisible"
                v-model:show-virtual-tracker-labels="showVirtualTrackerLabels"
                v-model:virtual-tracker-size="virtualTrackerSize"
                v-model:virtual-tracker-label-scale="virtualTrackerLabelScale"
                :tracker-states="trackerStatesView"
                :tracker-rotation-orders="trackerRotationOrders"
                :active-tracker-key="lastTrackerKey"
                :tracker-adjust-state="trackerAdjustState"
                :tracker-axes="trackerAxes"
                :tracker-position-range="trackerPositionRange"
                :tracker-rotation-range="trackerRotationRange"
                :tracker-position-step="trackerPositionStep"
                :tracker-rotation-step="trackerRotationStep"
                v-model:camera-fov="renderCameraFov"
                v-model:camera-near="renderCameraNear"
                v-model:camera-far="renderCameraFar"
                v-model:camera-resolution-width="renderCameraWidth"
                v-model:camera-resolution-height="renderCameraHeight"
                v-model:show-camera-helper="showRenderCameraHelper"
                v-model:camera-wheel-sensitivity="cameraWheelSensitivity"
                v-model:camera-translate-sensitivity="cameraTranslateSensitivity"
                v-model:camera-rotate-sensitivity="cameraRotateSensitivity"
                :capture-busy="captureBusy"
                :timeline-selection="timelineSelection"
                :timeline-snap="timelineSnap"
                :timeline-loop="timelineLoop"
                @update-timeline-snap="handleTimelineSnapSetting"
                @update-timeline-loop="handleTimelineLoopSetting"
                @remove-selected-keyframes="handleSettingsRemoveSelectedKeyframes"
                @update-keyframe-curves="handleTimelineCurveUpdate"
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
import { ref, shallowRef, computed, onMounted, onUnmounted, watch, watchEffect, provide, reactive } from 'vue'
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
import { useVirtualTrackers, TRACKER_ROTATION_ORDERS } from '../composables/useVirtualTrackers.js'
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

// VRMアウトライン設定
const outlineWidth = ref(0.002)
const outlineColor = ref('#000000')

const virtualTrackersEnabled = ref(false)
const virtualTrackerDisplayVisible = ref(true)
const showVirtualTrackerLabels = ref(true)
const virtualTrackerSize = ref(0.08)
const virtualTrackerLabelScale = ref(1.0)

const trackerAxes = ['x', 'y', 'z']
const trackerPositionRange = { min: -2.5, max: 2.5 }
const trackerRotationRange = { min: -180, max: 180 }
const trackerPositionStep = 0.01
const trackerRotationStep = 0.5

const lastTrackerKey = ref(null)
const trackerAdjustState = reactive({
  label: '',
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  order: TRACKER_ROTATION_ORDERS[0] || 'XYZ'
})

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
// Camera sensitivities (UI adjustable)
const cameraWheelSensitivity = ref(1.0) // multiplier for wheel dolly
const cameraTranslateSensitivity = ref(1.0) // multiplier for left-drag pan
const cameraRotateSensitivity = ref(1.0) // multiplier for right-drag yaw/pitch

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
let pendingTrackerStateSnapshot = null
let pendingLastTrackerKey = null

const TIMELINE_SNAPSHOT_STORAGE_KEY = 'timeline.snapshot.v3'
let timelinePersistenceEnabled = false
let timelineSnapshotRestored = false
let timelineSnapshotRestoring = false
let timelineSnapshotTimer = null
let pendingTimelineSnapshotSerialized = ''
let lastPersistedTimelineSerialized = ''

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
    virtualTrackerDisplayVisible: virtualTrackerDisplayVisible.value,
    showVirtualTrackerLabels: showVirtualTrackerLabels.value,
    virtualTrackerSize: virtualTrackerSize.value,
    virtualTrackerLabelScale: virtualTrackerLabelScale.value,
    virtualTrackerStates: serializeTrackerStates(),
    lastTrackerKey: lastTrackerKey.value,
    cameraFov: renderCameraFov.value,
    cameraNear: renderCameraNear.value,
    cameraFar: renderCameraFar.value,
    cameraResolutionWidth: renderCameraWidth.value,
    cameraResolutionHeight: renderCameraHeight.value,
    showCameraHelper: showRenderCameraHelper.value,
    cameraWheelSensitivity: cameraWheelSensitivity.value,
    cameraTranslateSensitivity: cameraTranslateSensitivity.value,
    cameraRotateSensitivity: cameraRotateSensitivity.value
  }
}

function serializeTrackerStates() {
  const source = trackerController?.trackerStates || {}
  const snapshot = {}
  for (const [key, state] of Object.entries(source)) {
    if (!state) continue
    const angles = state.angles || {}
    snapshot[key] = {
      order: typeof state.order === 'string' ? state.order : undefined,
      angles: {
        x: Number(angles.x) || 0,
        y: Number(angles.y) || 0,
        z: Number(angles.z) || 0
      }
    }
    const tracker = trackerController?.trackers?.value?.find(t => t.key === key)
    if (tracker?.mesh) {
      try { tracker.mesh.updateMatrixWorld(true) } catch {}
      snapshot[key].position = tracker.mesh.position.toArray([])
      snapshot[key].rotation = tracker.mesh.quaternion.toArray([])
    }
  }
  return snapshot
}

function restoreTrackerStateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || !trackerController) return
  for (const [key, state] of Object.entries(snapshot)) {
    if (!state) continue
    if (state.order) {
      try { trackerController.setTrackerRotationOrder(key, state.order, { persist: false }) } catch {}
    }
    if (state.angles) {
      try { trackerController.setTrackerRotationDegrees(key, state.angles, { persist: false }) } catch {}
    }
    const tracker = trackerController?.trackers?.value?.find(t => t.key === key)
    if (tracker?.mesh) {
      if (Array.isArray(state.position) && state.position.length === 3) {
        tracker.mesh.position.fromArray(state.position)
      }
      if (Array.isArray(state.rotation) && state.rotation.length === 4) {
        tracker.mesh.quaternion.fromArray(state.rotation).normalize()
      }
      try { tracker.mesh.updateMatrixWorld(true) } catch {}
      try { trackerController.syncTrackerStateFromMesh?.(key) } catch {}
    }
  }
  try { trackerController.persistTrackerTransforms({ includeCamera: false }) } catch {}
  try { trackerController.setDisplayVisible(virtualTrackerDisplayVisible.value) } catch {}
  refreshTrackerAdjustState()
  applyPendingLastTrackerKey()
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

function persistTimelineSnapshot(serialized) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(TIMELINE_SNAPSHOT_STORAGE_KEY, serialized)
    lastPersistedTimelineSerialized = serialized
  } catch {
    // Timeline snapshot persist failed
  }
}

function scheduleTimelineSnapshotPersist(snapshot, reason = 'state') {
  if (!timelinePersistenceEnabled || timelineSnapshotRestoring) return
  if (!snapshot || typeof snapshot !== 'object') return
  if (typeof window === 'undefined') return
  let serialized
  try {
    serialized = JSON.stringify(snapshot)
  } catch {
    // Failed to stringify timeline snapshot
    return
  }
  if (serialized === lastPersistedTimelineSerialized) return
  pendingTimelineSnapshotSerialized = serialized
  if (timelineSnapshotTimer) return
  const delay = reason === 'immediate' ? 0 : 160
  timelineSnapshotTimer = window.setTimeout(() => {
    timelineSnapshotTimer = null
    if (!pendingTimelineSnapshotSerialized || timelineSnapshotRestoring || !timelinePersistenceEnabled) {
      pendingTimelineSnapshotSerialized = ''
      return
    }
    persistTimelineSnapshot(pendingTimelineSnapshotSerialized)
    pendingTimelineSnapshotSerialized = ''
    Promise.resolve(updateStorageEstimate()).catch(() => {})
  }, delay)
}

function markTimelineDirty(reason = 'state', snapshot = null) {
  if (!timelinePersistenceEnabled || timelineSnapshotRestoring) return
  if (!timelineController?.serialize) return
  let working = snapshot
  if (!working) {
    try {
      working = timelineController.serialize()
    } catch {
      // Failed to capture timeline snapshot
      return
    }
  }
  scheduleTimelineSnapshotPersist(working, reason)
}

function restoreTimelineSnapshot() {
  if (timelineSnapshotRestored || timelineSnapshotRestoring) return false
  if (!timelineController?.deserialize) {
    timelineSnapshotRestored = true
    return false
  }
  if (typeof localStorage === 'undefined') {
    timelineSnapshotRestored = true
    return false
  }
  let raw
  try {
    raw = localStorage.getItem(TIMELINE_SNAPSHOT_STORAGE_KEY)
  } catch (error) {
    timelineSnapshotRestored = true
    return false
  }
  if (!raw) {
    timelineSnapshotRestored = true
    return false
  }
  let snapshot
  try {
    snapshot = JSON.parse(raw)
  } catch {
    // Failed to parse timeline snapshot
    timelineSnapshotRestored = true
    return false
  }
  if (!snapshot || typeof snapshot !== 'object') {
    timelineSnapshotRestored = true
    return false
  }
  timelineSnapshotRestoring = true
  let success = false
  try {
    const ok = timelineController.deserialize(snapshot)
    if (ok) {
      ensureVirtualTrackers()
      applyTimelinePoseImmediate()
      lastPersistedTimelineSerialized = raw
      success = true
    }
  } catch {
    // Timeline snapshot restore failed
    success = false
  } finally {
    timelineSnapshotRestoring = false
    timelineSnapshotRestored = true
  }
  return success
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
    if (typeof data.virtualTrackerDisplayVisible === 'boolean') virtualTrackerDisplayVisible.value = data.virtualTrackerDisplayVisible
    if (typeof data.showVirtualTrackerLabels === 'boolean') showVirtualTrackerLabels.value = data.showVirtualTrackerLabels
    if (Number.isFinite(data.virtualTrackerSize)) virtualTrackerSize.value = data.virtualTrackerSize
    if (Number.isFinite(data.virtualTrackerLabelScale)) virtualTrackerLabelScale.value = data.virtualTrackerLabelScale
    if (data.virtualTrackerStates && typeof data.virtualTrackerStates === 'object') {
      pendingTrackerStateSnapshot = data.virtualTrackerStates
      if (trackerController) {
        restoreTrackerStateSnapshot(pendingTrackerStateSnapshot)
        pendingTrackerStateSnapshot = null
      }
    }
    if (typeof data.lastTrackerKey === 'string' && data.lastTrackerKey) {
      pendingLastTrackerKey = data.lastTrackerKey
      lastTrackerKey.value = data.lastTrackerKey
      applyPendingLastTrackerKey()
    }
    if (Number.isFinite(data.cameraFov)) renderCameraFov.value = data.cameraFov
    if (Number.isFinite(data.cameraNear)) renderCameraNear.value = data.cameraNear
    if (Number.isFinite(data.cameraFar)) renderCameraFar.value = data.cameraFar
    if (Number.isFinite(data.cameraResolutionWidth)) renderCameraWidth.value = data.cameraResolutionWidth
    if (Number.isFinite(data.cameraResolutionHeight)) renderCameraHeight.value = data.cameraResolutionHeight
    if (typeof data.showCameraHelper === 'boolean') showRenderCameraHelper.value = data.showCameraHelper
    if (Number.isFinite(data.cameraWheelSensitivity)) cameraWheelSensitivity.value = clamp0to2(data.cameraWheelSensitivity)
    if (Number.isFinite(data.cameraTranslateSensitivity)) cameraTranslateSensitivity.value = clamp0to2(data.cameraTranslateSensitivity)
    if (Number.isFinite(data.cameraRotateSensitivity)) cameraRotateSensitivity.value = clamp0to2(data.cameraRotateSensitivity)
  } catch {
    // Failed to load display settings
  } finally {
    restoringDisplaySettings = false
  }
}

function clamp0to2(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 1
  return Math.min(2, Math.max(0, n))
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

function roundTo(value, decimals = 3) {
  const factor = Math.pow(10, decimals)
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.round(num * factor) / factor
}

function clampValue(value, range) {
  const num = Number(value)
  if (!Number.isFinite(num)) return Number(range?.min ?? 0)
  let result = num
  if (range?.min !== undefined && result < range.min) result = range.min
  if (range?.max !== undefined && result > range.max) result = range.max
  return result
}

let trackerAdjustHistoryTimer = null
function ensureTrackerAdjustHistory() {
  if (!trackerAdjustHistoryTimer) {
    try { pushHistory('tracker-adjust') } catch {}
  }
  if (trackerAdjustHistoryTimer && typeof window !== 'undefined') {
    window.clearTimeout(trackerAdjustHistoryTimer)
  }
  if (typeof window !== 'undefined') {
    trackerAdjustHistoryTimer = window.setTimeout(() => {
      trackerAdjustHistoryTimer = null
    }, 420)
  }
}

function refreshTrackerAdjustState(targetKey = lastTrackerKey.value) {
  if (!trackerController?.getTrackerSnapshot) return
  let resolvedKey = targetKey
  if (!resolvedKey) {
    resolvedKey = trackerController?.lastActiveTrackerKey?.value
      || trackerController?.trackers?.value?.[0]?.key
      || Object.keys(trackerController?.trackerStates || {})[0]
  }
  if (!resolvedKey) return
  const snapshot = trackerController.getTrackerSnapshot(resolvedKey)
  if (!snapshot) return
  lastTrackerKey.value = snapshot.key
  if (trackerController?.lastActiveTrackerKey) {
    trackerController.lastActiveTrackerKey.value = snapshot.key
  }
  trackerAdjustState.label = snapshot.label || snapshot.key
  trackerAdjustState.order = snapshot.order || trackerAdjustState.order
  if (Array.isArray(snapshot.position)) {
    trackerAdjustState.position.x = roundTo(snapshot.position[0], 3)
    trackerAdjustState.position.y = roundTo(snapshot.position[1], 3)
    trackerAdjustState.position.z = roundTo(snapshot.position[2], 3)
  }
  if (snapshot.angles) {
    trackerAdjustState.rotation.x = roundTo(snapshot.angles.x ?? 0, 2)
    trackerAdjustState.rotation.y = roundTo(snapshot.angles.y ?? 0, 2)
    trackerAdjustState.rotation.z = roundTo(snapshot.angles.z ?? 0, 2)
  }
}

function applyPendingLastTrackerKey() {
  if (!pendingLastTrackerKey) return
  if (!trackerController?.getTrackerSnapshot) return
  const snapshot = trackerController.getTrackerSnapshot(pendingLastTrackerKey)
  if (!snapshot) return
  pendingLastTrackerKey = null
  lastTrackerKey.value = snapshot.key
  refreshTrackerAdjustState(snapshot.key)
}

function handleTrackerTransformEvent(event = {}) {
  if (event.persisted !== false) scheduleDisplaySettingsSave()
  if (event.key && event.key !== 'all') {
    lastTrackerKey.value = event.key
    refreshTrackerAdjustState(event.key)
  } else if (!event.key && lastTrackerKey.value) {
    refreshTrackerAdjustState(lastTrackerKey.value)
  }
}

const updateTrackers = () => {
  try {
    timelineController?.step()
    trackerController?.update()
  // tracker-based camera sync removed
    updateRenderCameraHelper()
  } catch {}
}

// camera tracker removed

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

function updateCameraTrackerFromCamera() {}

function syncCameraFromTracker() {}

// removed cameraTracker watcher

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
  renderCamera.value.up.set(0, 1, 0)
  // Initial placement from current view target or default
  const initialCameraState = null
  if (initialCameraState) {
    if (Array.isArray(initialCameraState.position) && initialCameraState.position.length >= 3) {
      renderCamera.value.position.set(
        initialCameraState.position[0],
        initialCameraState.position[1],
        initialCameraState.position[2]
      )
    }
    if (Array.isArray(initialCameraState.rotation) && initialCameraState.rotation.length >= 4) {
      renderCamera.value.quaternion.set(
        initialCameraState.rotation[0],
        initialCameraState.rotation[1],
        initialCameraState.rotation[2],
        initialCameraState.rotation[3]
      ).normalize()
    } else {
      renderCamera.value.lookAt(cameraTarget)
    }
  } else {
    renderCamera.value.position.set(0, 10, 30)
    renderCamera.value.lookAt(cameraTarget)
  }
  renderCamera.value.updateMatrixWorld(true)
  scene.value.add(renderCamera.value)
  updateCameraRollRef()
  // tracker-based sync removed
  if (showRenderCameraHelper.value) ensureRenderCameraHelper()
  // If a model is already present, frame the avatar front unless the timeline defines camera
  try { frameRenderCameraToAvatarFront({ respectTimeline: true }) } catch {}
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

// Place the render camera to frame the avatar front based on model bounds and current FOV.
function frameRenderCameraToAvatarFront({ force = false, respectTimeline = true } = {}) {
  try {
    if (!renderCamera.value || !scene.value) return
    // If timeline defines a camera track and we should respect it, do not override
    if (respectTimeline && timelineController) {
      try {
        const frames = timelineController.keyframes?.value || []
        const hasCameraTrack = frames.some(f => f?.values && f.values.camera)
        if (hasCameraTrack) return
      } catch {}
    }

    const arr = models?.value || []
    const active = arr.find(m => !!m?.vrm && m.visible !== false) || arr.find(m => !!m?.vrm)
    const vrmRoot = active?.vrm?.scene
    if (!vrmRoot) return

    // Compute bounds
    const bbox = new THREE.Box3().setFromObject(vrmRoot)
    const center = bbox.getCenter(new THREE.Vector3())
    const size = bbox.getSize(new THREE.Vector3())
    if (!Number.isFinite(size.x + size.y + size.z)) return

    // Distance to fit height with margin according to FOV
    const fovDeg = Number(renderCameraFov.value) || 45
    const fov = THREE.MathUtils.degToRad(fovDeg)
    const height = Math.max(1.0, size.y || size.length() || 2.0)
    const margin = 1.3
    const dist = (height * 0.5) / Math.tan(fov * 0.5) * margin

    // Model forward: world -Z
    const forward = new THREE.Vector3()
    try { vrmRoot.getWorldDirection(forward) } catch { forward.set(0, 0, -1) }
    if (forward.lengthSq() < 1e-8) forward.set(0, 0, -1)
    forward.normalize()

    // Choose front/back candidate closer to current view to avoid flips
    const posA = center.clone().add(forward.clone().multiplyScalar(dist))
    const posB = center.clone().sub(forward.clone().multiplyScalar(dist))
    let chosen = posA
    const refCam = viewCamera.value || camera.value
    if (refCam) {
      const sideDir = refCam.position.clone().sub(center).normalize()
      const aDir = posA.clone().sub(center).normalize()
      const bDir = posB.clone().sub(center).normalize()
      const dotA = aDir.dot(sideDir)
      const dotB = bDir.dot(sideDir)
      chosen = dotB > dotA ? posB : posA
    }

    renderCamera.value.position.copy(chosen)
    renderCamera.value.up.set(0, 1, 0)
    renderCamera.value.lookAt(center)
    try { renderCamera.value.updateMatrixWorld(true) } catch {}
    cameraTarget.copy(center)
    updateCameraRollRef()
    updateRenderCameraHelper()
  } catch {}
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
  // Prevent context menu from appearing after right-drag
  try { event.preventDefault() } catch {}
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
  const panSpeed = Math.max(distance * 0.0025, 0.02) * clamp0to2(cameraTranslateSensitivity.value)
    tempVec3A.set(1, 0, 0).applyQuaternion(cameraInteraction.startQuaternion).multiplyScalar(-deltaX * panSpeed)
    tempVec3B.set(0, 1, 0).applyQuaternion(cameraInteraction.startQuaternion).multiplyScalar(deltaY * panSpeed)
    tempVec3C.copy(cameraInteraction.startPosition).add(tempVec3A).add(tempVec3B)
    renderCamera.value.position.copy(tempVec3C)
  } else {
    const deltaX = event.clientX - cameraInteraction.startX
    const deltaY = event.clientY - cameraInteraction.startY
  const rotMul = 0.005 * clamp0to2(cameraRotateSensitivity.value)
    const yawDelta = deltaX * rotMul
    const pitchDelta = deltaY * rotMul
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
  // Suppress context menu after right-drag
  try { event.preventDefault() } catch {}
  updateCameraTrackerFromCamera()
  updateRenderCameraHelper()
}

function handleCameraWheel(event) {
  if (!isCameraMode.value || !renderCamera.value) return
  event.preventDefault()
  // Snapshot before applying dolly (forward/back) for undo support
  try { pushHistory('camera-wheel-dolly') } catch {}
  const delta = Math.sign(event.deltaY)
  const dist = Math.max(renderCamera.value.position.distanceTo(cameraTarget), 0.5)
  // Distance-aware dolly speed with clamping to avoid large jumps
  const baseSpeed = THREE.MathUtils.clamp(dist * 0.035, 0.02, 1.2) * clamp0to2(cameraWheelSensitivity.value)
  // Invert so that wheel up (deltaY < 0) moves forward, wheel down moves backward
  const amount = baseSpeed * -delta
  // Move along camera forward/backward (negative Z in camera space)
  tempVec3A.set(0, 0, -1).applyQuaternion(renderCamera.value.quaternion).multiplyScalar(amount)
  renderCamera.value.position.add(tempVec3A)
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
  dom.addEventListener('contextmenu', e => { if (isCameraMode.value) e.preventDefault() })
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
  dom.removeEventListener('contextmenu', e => { if (isCameraMode.value) e.preventDefault() })
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
const timelineClipboard = ref(null)
const timelineDuration = ref(0)
const timelineCurrentTime = ref(0)
const timelinePlaying = ref(false)
const timelineStartTime = ref(0)
const timelineEndTime = ref(0)
const timelineFrameRate = ref(60)
const timelineLoop = ref(false)
const timelineSelection = reactive({
  frames: [],
  selectedIds: [],
  hasSelection: false,
  hasMultiple: false,
  startTime: null,
  endTime: null,
  duration: 0
})

const timelineClipboardReady = computed(() => {
  const frames = timelineClipboard.value?.frames
  return Array.isArray(frames) && frames.length > 0
})

const timelineHasContent = computed(() => Array.isArray(timelineKeyframes.value) && timelineKeyframes.value.length > 0)

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
      try { controls.value.enableZoom = false } catch {}
      cameraTarget.copy(controls.value.target)
    }
    if (renderCamera.value) {
      camera.value = renderCamera.value
      renderCamera.value.updateProjectionMatrix()
      updateCameraRollRef()
      // When entering camera mode, ensure we're framing the avatar front unless timeline camera exists
      try { frameRenderCameraToAvatarFront({ respectTimeline: true }) } catch {}
    }
  } else {
    if (controls.value) {
      controls.value.enabled = true
      try { controls.value.enableZoom = true } catch {}
    }
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
  onManipulateStart: payload => {
    if (payload?.key) {
      lastTrackerKey.value = payload.key
      refreshTrackerAdjustState(payload.key)
    }
    pushHistory('tracker-drag')
  },
  onManipulateEnd: () => {
    refreshTrackerAdjustState()
  },
  onTrackerTransform: handleTrackerTransformEvent
})

refreshTrackerAdjustState()

const trackerStatesView = computed(() => trackerController?.trackerStates || {})
const trackerRotationOrders = computed(() => trackerController?.rotationOrders || TRACKER_ROTATION_ORDERS)

timelineController = useTimeline({ trackers: trackerController.trackers, renderCamera })
let syncTimelineRefs = () => {}
const DEFAULT_TIMELINE_CURVE = Object.freeze({
  in: { x: 2 / 3, y: 2 / 3 },
  out: { x: 1 / 3, y: 1 / 3 }
})

const TIMELINE_CLIPBOARD_VERSION = 1

const clampCurveUnit = value => {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  if (num <= 0) return 0
  if (num >= 1) return 1
  return num
}

const cloneTimelineCurve = curve => ({
  in: {
    x: clampCurveUnit(curve?.in?.x ?? DEFAULT_TIMELINE_CURVE.in.x),
    y: clampCurveUnit(curve?.in?.y ?? DEFAULT_TIMELINE_CURVE.in.y)
  },
  out: {
    x: clampCurveUnit(curve?.out?.x ?? DEFAULT_TIMELINE_CURVE.out.x),
    y: clampCurveUnit(curve?.out?.y ?? DEFAULT_TIMELINE_CURVE.out.y)
  }
})

const normalizeTimelineTransform = source => {
  if (!source || typeof source !== 'object') {
    return { position: [0, 0, 0], rotation: [0, 0, 0, 1] }
  }
  const clampPosition = (posArray = []) => [0, 1, 2].map(i => Number(posArray[i]) || 0)
  const clampRotation = (rotArray = []) => {
    const raw = [0, 1, 2, 3].map(i => Number(rotArray[i]) || (i === 3 ? 1 : 0))
    const len = Math.hypot(raw[0], raw[1], raw[2], raw[3]) || 1
    return raw.map(value => value / len)
  }

  const extractPosition = () => {
    if (Array.isArray(source.position)) return source.position
    if (Array.isArray(source.value)) return source.value
    if (Array.isArray(source) && source.length >= 3) return source
    if (source.position?.isVector3) return source.position.toArray([])
    if (source.value?.isVector3) return source.value.toArray([])
    if (source.isVector3) return source.toArray([])
    return [source?.x, source?.y, source?.z]
  }

  const extractRotation = () => {
    if (Array.isArray(source.rotation)) return source.rotation
    if (Array.isArray(source.quaternion)) return source.quaternion
    if (source.rotation?.isQuaternion) return source.rotation.toArray([])
    if (source.quaternion?.isQuaternion) return source.quaternion.toArray([])
    if (source.isQuaternion) return source.toArray([])
    return [source?.qx, source?.qy, source?.qz, source?.qw]
  }

  return {
    position: clampPosition(extractPosition()),
    rotation: clampRotation(extractRotation())
  }
}

const normalizeClipboardPayload = (clipboard, fallbackFps = 60) => {
  const frames = Array.isArray(clipboard?.frames) ? clipboard.frames : []
  if (!frames.length) return null
  const normalizedFrames = frames
    .map(frame => {
      const offset = Number(frame?.timeOffset ?? frame?.offset ?? frame?.time)
      if (!Number.isFinite(offset)) return null
      const values = {}
      if (frame?.values && typeof frame.values === 'object') {
        for (const [key, value] of Object.entries(frame.values)) {
          values[key] = normalizeTimelineTransform(value)
        }
      }
      return {
        timeOffset: offset,
        values,
        curve: cloneTimelineCurve(frame?.curve)
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.timeOffset - b.timeOffset)

  if (!normalizedFrames.length) return null

  return {
    version: Number(clipboard?.version) || TIMELINE_CLIPBOARD_VERSION,
    frameRate: Number(clipboard?.frameRate) || fallbackFps,
    createdAt: Date.now(),
    frames: normalizedFrames
  }
}
// Bridge timeline controller state into local refs for reliable reactivity
if (timelineController) {
  const cloneKeyframes = frames => {
    if (!Array.isArray(frames)) return []
    return frames.map(frame => {
      const values = {}
      if (frame?.values && typeof frame.values === 'object') {
        for (const [key, value] of Object.entries(frame.values)) {
          values[key] = normalizeTimelineTransform(value)
        }
      }
      return {
        id: Number(frame?.id) || 0,
        time: Number(frame?.time) || 0,
        values,
        curve: cloneTimelineCurve(frame?.curve)
      }
    })
  }

  const asNumber = (value, fallback = 0) => {
    const num = Number(value)
    return Number.isFinite(num) ? num : fallback
  }

  syncTimelineRefs = (snapshot = null) => {
    const framesSource = snapshot?.keyframes ?? timelineController.keyframes?.value ?? []
    timelineKeyframes.value = cloneKeyframes(framesSource)

    const startRaw = snapshot?.startTime ?? timelineController.startTime?.value
    const start = asNumber(startRaw, 0)
    timelineStartTime.value = start

    const endRaw = snapshot?.endTime ?? timelineController.endTime?.value
    const safeEnd = Math.max(start, asNumber(endRaw, start))
    timelineEndTime.value = safeEnd
    timelineDuration.value = Math.max(0, safeEnd - start)

    const currentRaw = snapshot?.currentTime ?? timelineController.currentTime?.value
    timelineCurrentTime.value = asNumber(currentRaw, start)

    const frameRateRaw = snapshot?.frameRate ?? timelineController.frameRate?.value
    const fps = asNumber(frameRateRaw, 60)
    timelineFrameRate.value = fps > 0 ? fps : 60

    const loopRaw = snapshot?.loop
    timelineLoop.value = loopRaw != null ? !!loopRaw : !!timelineController.loopPlayback?.value

    const playing = timelineController.isPlaying?.value
    timelinePlaying.value = !!playing
  }

  watchEffect(() => {
    if (!timelineController?.serialize) return
    const snapshot = timelineController.serialize()
    syncTimelineRefs(snapshot)
    markTimelineDirty('reactive', snapshot)
  })
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
  refreshTrackerAdjustState()
  scheduleDisplaySettingsSave()
})

watch(virtualTrackerDisplayVisible, v => {
  try { trackerController.setDisplayVisible(v) } catch {}
  scheduleDisplaySettingsSave()
})

watch(
  () => trackerController?.lastActiveTrackerKey?.value,
  key => {
    if (key && key !== lastTrackerKey.value) {
      lastTrackerKey.value = key
      refreshTrackerAdjustState(key)
    }
  }
)

watch(lastTrackerKey, key => {
  if (key) refreshTrackerAdjustState(key)
})

function resetVirtualTrackers() {
  try {
    trackerController.reset()
    pushToast('バーチャルトラッカーをリセットしました', 'トラッカー')
    refreshTrackerAdjustState()
    scheduleDisplaySettingsSave()
  } catch {}
}

function ensureVirtualTrackers() {
  // Always force-enable controller to recover from any desync between UI flag and controller state
  try { trackerController.setEnabled(true) } catch {}
  if (!virtualTrackersEnabled.value) virtualTrackersEnabled.value = true
}

function applyTimelinePoseImmediate() {
  try { timelineController?.applyCurrentPose() } catch {}
  // Camera is applied by timeline when present; no tracker syncing
}

function handleTimelineAddKey(payload) {
  if (!timelineController) {
    pushToast('タイムラインが初期化されていません', 'タイムライン', 4200)
    return
  }
  ensureVirtualTrackers()
  try {
    pushHistory('add-key')
    const targetTime = payload && Number.isFinite(payload.time)
      ? payload.time
      : timelineController.currentTime.value
    if (Number.isFinite(payload?.time)) timelineController.setCurrentTime(payload.time)
    const entry = timelineController.addSnapshotAtTime(targetTime)
    if (!entry) {
      pushToast('キーの追加に失敗しました', 'タイムライン', 4200)
      return
    }
    applyTimelinePoseImmediate()
    if (typeof syncTimelineRefs === 'function') syncTimelineRefs()
    markTimelineDirty('add-key')
    pushToast('現在のポーズをキーに追加しました', 'タイムライン', 2200)
  } catch (error) {
    pushToast('キーの追加に失敗しました', 'タイムライン', 4200)
  }
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
    if (typeof syncTimelineRefs === 'function') syncTimelineRefs()
    markTimelineDirty('remove-keys')
  } catch {
    // Timeline remove keys failed
  }
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
  let applied = false
  try {
    pushHistory('move-keys')
    if (normalized.length === 1) {
      const { keyframeId, time } = normalized[0]
      timelineController.updateKeyframe(keyframeId, { time })
      applied = true
    } else if (timelineController.moveKeyframes) {
      timelineController.moveKeyframes(normalized)
      applied = true
    } else {
      normalized.forEach(({ keyframeId, time }) => timelineController.updateKeyframe(keyframeId, { time }))
      applied = true
    }
  } catch {
    // Timeline move keys failed
  }
  if (applied) {
    applyTimelinePoseImmediate()
    if (typeof syncTimelineRefs === 'function') syncTimelineRefs()
    markTimelineDirty('move-keys')
  }
}

function buildClipboardFromSerialize(ids) {
  if (!timelineController?.serialize) return null
  try {
    const snapshot = timelineController.serialize()
    const frames = Array.isArray(snapshot?.keyframes) ? snapshot.keyframes : []
    const idSet = new Set(ids.map(value => Number(value)).filter(Number.isFinite))
    if (!idSet.size) return null
    const selected = frames
      .filter(frame => idSet.has(Number(frame?.id)))
      .map(frame => ({
        id: Number(frame?.id) || 0,
        time: Number(frame?.time) || 0,
        values: frame?.values || {},
        curve: frame?.curve || DEFAULT_TIMELINE_CURVE
      }))
      .sort((a, b) => a.time - b.time)
    if (!selected.length) return null
    const baseTime = selected[0].time || 0
    const framesPayload = selected.map(frame => ({
      timeOffset: frame.time - baseTime,
      values: frame.values,
      curve: frame.curve
    }))
    return {
      version: TIMELINE_CLIPBOARD_VERSION,
      frameRate: Number(snapshot?.frameRate) || timelineFrameRate.value || 60,
      frames: framesPayload
    }
  } catch {
    return null
  }
}

function captureTimelineClipboard(ids) {
  if (!Array.isArray(ids) || !ids.length) return null
  let raw = null
  if (timelineController?.copyKeyframes) {
    try {
      raw = timelineController.copyKeyframes(ids)
    } catch {
      // Timeline copyKeyframes failed, falling back
    }
  }
  if (!raw) raw = buildClipboardFromSerialize(ids)
  if (!raw) return null
  return normalizeClipboardPayload(raw, timelineFrameRate.value || 60)
}

function pasteClipboardFallback(clipboard, anchorTime) {
  const frames = Array.isArray(clipboard?.frames) ? clipboard.frames : []
  if (!frames.length) return []
  const firstOffset = Number(frames[0]?.timeOffset) || 0
  const baseTime = (Number(anchorTime) || 0) - firstOffset
  const created = []
  frames.forEach(entry => {
    const offset = Number(entry?.timeOffset)
    if (!Number.isFinite(offset)) return
    const targetTime = baseTime + offset
    const values = {}
    if (entry?.values && typeof entry.values === 'object') {
      for (const [key, value] of Object.entries(entry.values)) {
        values[key] = normalizeTimelineTransform(value)
      }
    }
    const curve = cloneTimelineCurve(entry?.curve)
    const keyframe = timelineController.addKeyframe({ time: targetTime, values, curve })
    if (keyframe) created.push(keyframe)
  })
  return created
}

function handleTimelineCopyKeyframes() {
  if (!timelineController) {
    pushToast('タイムラインが初期化されていません', 'タイムライン', 4200)
    return
  }
  const ids = Array.isArray(timelineSelection.selectedIds) && timelineSelection.selectedIds.length
    ? timelineSelection.selectedIds
    : timelineSelection.frames.map(frame => frame.id)
  if (!ids.length) {
    pushToast('コピーするキーを選択してください', 'タイムライン', 3200)
    return
  }
  try {
    const clipboardPayload = captureTimelineClipboard(ids)
    if (!clipboardPayload) {
      pushToast('キーのコピーに失敗しました', 'タイムライン', 4200)
      return
    }
    timelineClipboard.value = clipboardPayload
    pushToast(`${clipboardPayload.frames.length}個のキーをコピーしました`, 'タイムライン', 2200)
  } catch {
    pushToast('キーのコピーに失敗しました', 'タイムライン', 4200)
  }
}

function handleTimelinePasteKeyframes() {
  if (!timelineController) {
    pushToast('タイムラインが初期化されていません', 'タイムライン', 4200)
    return
  }
  const normalizedClipboard = normalizeClipboardPayload(timelineClipboard.value, timelineFrameRate.value || 60)
  if (!normalizedClipboard) {
    pushToast('貼り付けるキーがありません', 'タイムライン', 3200)
    return
  }
  timelineClipboard.value = normalizedClipboard
  ensureVirtualTrackers()
  try {
    pushHistory('paste-keys')
    const anchorTime = timelineController.currentTime?.value ?? timelineCurrentTime.value ?? 0
    const pasted = timelineController.pasteKeyframes
      ? timelineController.pasteKeyframes(normalizedClipboard, { time: anchorTime })
      : pasteClipboardFallback(normalizedClipboard, anchorTime)
    if (!Array.isArray(pasted) || !pasted.length) {
      pushToast('キーの貼り付けに失敗しました', 'タイムライン', 4200)
      return
    }
    applyTimelinePoseImmediate()
    if (typeof syncTimelineRefs === 'function') syncTimelineRefs()
    markTimelineDirty('paste-keys')
    pushToast(`${pasted.length}個のキーを貼り付けました`, 'タイムライン', 2200)
  } catch {
    pushToast('キーの貼り付けに失敗しました', 'タイムライン', 4200)
  }
}

function handleTimelineSelectionChange(payload) {
  const framesSource = Array.isArray(payload?.frames) ? payload.frames : []
  const sanitizedFrames = framesSource
    .map(frame => {
      const id = Number(frame?.id ?? frame?.keyframeId)
      if (!Number.isFinite(id)) return null
      const time = Number(frame?.time)
      const frameLabel = typeof frame?.frameLabel === 'string' ? frame.frameLabel : ''
      const timeLabel = typeof frame?.timeLabel === 'string' ? frame.timeLabel : ''
      return {
        id,
        time: Number.isFinite(time) ? time : 0,
        frameLabel,
        timeLabel,
        curve: cloneTimelineCurve(frame?.curve),
        isFirst: !!frame?.isFirst,
        isLast: !!frame?.isLast
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.time - b.time)

  const idsSource = Array.isArray(payload?.selectedIds) ? payload.selectedIds : sanitizedFrames.map(entry => entry.id)
  const normalizedIds = Array.from(
    new Set(idsSource.map(value => Number(value)).filter(Number.isFinite))
  )

  timelineSelection.frames = sanitizedFrames
  timelineSelection.selectedIds = normalizedIds
  timelineSelection.hasSelection = sanitizedFrames.length > 0
  timelineSelection.hasMultiple = sanitizedFrames.length > 1
  const first = sanitizedFrames[0]
  const last = sanitizedFrames[sanitizedFrames.length - 1]
  timelineSelection.startTime = first ? first.time : null
  timelineSelection.endTime = last ? last.time : null
  timelineSelection.duration =
    sanitizedFrames.length >= 2 && Number.isFinite(timelineSelection.startTime) && Number.isFinite(timelineSelection.endTime)
      ? timelineSelection.endTime - timelineSelection.startTime
      : 0
}

function handleTimelineCurveUpdate(payload) {
  const updatesSource = Array.isArray(payload?.updates) ? payload.updates : []
  if (!updatesSource.length || !timelineController) return
  const updates = updatesSource
    .map(entry => {
      const keyframeId = Number(entry?.keyframeId ?? entry?.id)
      if (!Number.isFinite(keyframeId)) return null
      const curve = cloneTimelineCurve(entry?.curve)
      return { keyframeId, curve }
    })
    .filter(Boolean)
  if (!updates.length) return
  try {
    pushHistory('curve')
    updates.forEach(({ keyframeId, curve }) => {
      timelineController.updateKeyframe(keyframeId, { curve })
    })
    applyTimelinePoseImmediate()
    if (typeof syncTimelineRefs === 'function') syncTimelineRefs()
    markTimelineDirty('curve')
  } catch {
    // Timeline curve update failed
  }
}

function handleTimelineSnapSetting(value) {
  timelineSnap.value = value !== false
}

function handleTimelineLoopSetting(value) {
  const next = !!value
  timelineLoop.value = next
  if (!timelineController) return
  try {
    timelineController.loopPlayback.value = next
    markTimelineDirty('loop-setting')
  } catch {
    // Timeline loop toggle failed
  }
}

function handleSettingsRemoveSelectedKeyframes() {
  const targets = Array.isArray(timelineSelection.selectedIds)
    ? timelineSelection.selectedIds
    : timelineSelection.frames.map(frame => frame.id)
  if (!targets.length) return
  handleTimelineRemoveKeys({ keyframeIds: targets })
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
  if (!timelineController) return
  try {
    timelineController.loopPlayback.value = !timelineController.loopPlayback.value
    markTimelineDirty('toggle-loop')
  } catch {
    // Timeline toggle loop failed
  }
}

function handleTimelineRange({ startFrame, endFrame }) {
  if (!timelineController) return
  try {
    pushHistory('range')
    timelineController.setRangeFromFrames(startFrame, endFrame)
    if (typeof syncTimelineRefs === 'function') syncTimelineRefs()
    markTimelineDirty('range')
  } catch {
    // Timeline range update failed
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
    if (typeof syncTimelineRefs === 'function') syncTimelineRefs()
    markTimelineDirty('import')
    Promise.resolve(updateStorageEstimate()).catch(() => {})
  } catch {
    pushToast('タイムラインJSONの解析に失敗しました', 'タイムライン', 5200)
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
  } catch {
    pushToast('タイムラインのエクスポートに失敗しました', 'タイムライン', 4800)
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
    timelineClipboard.value = null
    pushToast('タイムラインをリセットしました', 'タイムライン', 2600)
    if (typeof syncTimelineRefs === 'function') syncTimelineRefs()
    markTimelineDirty('clear')
    Promise.resolve(updateStorageEstimate()).catch(() => {})
  } catch {
    pushToast('タイムラインのリセットに失敗しました', 'タイムライン', 4800)
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
  } catch {
    pushToast('レンダー画像の書き出しに失敗しました', 'カメラ', 5200)
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
    if (typeof syncTimelineRefs === 'function') syncTimelineRefs()
    markTimelineDirty('clear-cache')
    Promise.resolve(updateStorageEstimate()).catch(() => {})
  } catch {}
}

function handleError(e) {
  const msg = e?.error?.message || e?.message || '不明なエラーが発生しました'
  pushToast(msg, 'エラー', 5200)
}

function handleUnhandledRejection(e) {
  const msg = e?.reason?.message || e?.reason || '未処理のPromise拒否が発生しました'
  pushToast(msg, 'エラー', 5200)
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
  try { trackerController.init?.() } catch {}
  // Sync controller enabled state with current UI flag after init
  try { trackerController.setEnabled(!!virtualTrackersEnabled.value) } catch {}
  if (pendingTrackerStateSnapshot) {
    restoreTrackerStateSnapshot(pendingTrackerStateSnapshot)
    pendingTrackerStateSnapshot = null
  } else {
    try { trackerController.setDisplayVisible(virtualTrackerDisplayVisible.value) } catch {}
  }
  applyPendingLastTrackerKey()
  // If enabled but no tracker meshes exist (edge case), force rebuild once
  try {
    const none = !Array.isArray(trackerController?.trackers?.value) || trackerController.trackers.value.length === 0
    if (virtualTrackersEnabled.value && none && typeof trackerController.rebuild === 'function') {
      trackerController.rebuild()
    }
  } catch {}
  // Force relayout of camera tracker from the current view camera, ignoring saved state
  try { trackerController.rebuild?.() } catch {}
  // After trackers are initialized/enabled, snap camera to the camera tracker
  try { syncCameraFromTracker(true) } catch {}

  let timelineRestored = false
  try {
    timelineRestored = restoreTimelineSnapshot()
  } catch {
    timelineRestored = false
  }
  timelinePersistenceEnabled = true
  try {
    if (timelineRestored && typeof syncTimelineRefs === 'function') {
      syncTimelineRefs()
    }
  } catch {}
  if (timelineRestored) {
    markTimelineDirty('restore')
  } else {
    markTimelineDirty('initial')
  }

  let shouldRestore = autoRestore.value
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('restore') === '0') shouldRestore = false
  } catch {}

  if (shouldRestore) {
    await restoreCachedModel(raw ? JSON.parse(raw) : undefined)
    // Ensure virtual trackers are enabled and visible once a model is present
    try { ensureVirtualTrackers() } catch {}
    // After models are restored, rebuild trackers and frame camera to avatar front (unless timeline defines camera)
    try { trackerController.rebuild?.() } catch {}
    try { frameRenderCameraToAvatarFront({ respectTimeline: true }) } catch {}
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

// If models list becomes non-empty later, auto-enable virtual trackers so they appear
watch(models, (arr) => {
  try {
    const hasModel = Array.isArray(arr) && arr.some(m => !!m?.vrm)
    if (hasModel && !virtualTrackersEnabled.value) ensureVirtualTrackers()
    // Whenever models appear or change, rebuild trackers to place camera in front of the model
    if (hasModel) {
      try { trackerController.rebuild?.() } catch {}
      // Frame avatar front unless overridden by timeline camera track
      try { frameRenderCameraToAvatarFront({ respectTimeline: true }) } catch {}
    }
    // アウトライン設定を適用
    updateOutlineSettings()
  } catch {}
})

// アウトライン設定の変更を監視
watch([outlineWidth, outlineColor], () => {
  updateOutlineSettings()
})

function updateOutlineSettings() {
  try {
    models.value.forEach(model => {
      if (!model?.vrm?.scene) return
      model.vrm.scene.traverse(obj => {
        if (obj.isMesh && obj.material) {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
          materials.forEach(mat => {
            // MToonMaterialの場合のみアウトライン設定を適用
            if (mat.isMToonMaterial || mat.type === 'MToonMaterial') {
              const color = new THREE.Color(outlineColor.value)
              if (typeof mat.outlineWidthFactor === 'number' || mat.uniforms?.outlineWidthFactor) {
                try { mat.outlineWidthFactor = outlineWidth.value } catch {}
              }
              if (mat.uniforms?.outlineColorFactor !== undefined) {
                try { mat.outlineColorFactor = color } catch {
                  mat.uniforms.outlineColorFactor.value.set(color.r, color.g, color.b)
                }
              }
              mat.uniformsNeedUpdate = true
              mat.needsUpdate = true
            }
          })
        }
      })
    })
  } catch {}
}

onUnmounted(() => {
  cleanupErrorHandlers()
  detachCameraModeEvents()
  if (typeof window !== 'undefined') {
    window.removeEventListener('pointermove', onRollRingPointerMove)
    window.removeEventListener('pointerup', onRollRingPointerUp)
  }
  cleanupRenderer()
  try { trackerController.cleanup?.() } catch {}
  if (typeof window !== 'undefined' && timelineSnapshotTimer) {
    window.clearTimeout(timelineSnapshotTimer)
    timelineSnapshotTimer = null
  }
  if (pendingTimelineSnapshotSerialized && timelinePersistenceEnabled && !timelineSnapshotRestoring) {
    persistTimelineSnapshot(pendingTimelineSnapshotSerialized)
    pendingTimelineSnapshotSerialized = ''
    Promise.resolve(updateStorageEstimate()).catch(() => {})
  }
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

.tracker-hint {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.5;
  color: rgba(216, 224, 248, 0.78);
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
}

.viewport-overlay--mid-right {
  top: 50%;
  right: 14px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
}

.tracker-adjust__container {
  display: flex;
  align-items: stretch;
  gap: 0.55rem;
}

.tracker-adjust__container.is-collapsed .tracker-adjust__panel {
  display: none;
}

.tracker-adjust__container.is-collapsed .tracker-adjust__toggle {
  border-radius: 18px;
}

.tracker-adjust__toggle {
  writing-mode: vertical-rl;
  padding: 0.65rem 0.4rem;
  border-radius: 18px 0 0 18px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(16, 20, 30, 0.9);
  color: rgba(226, 232, 255, 0.9);
  letter-spacing: 0.08em;
  font-size: 0.78rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  cursor: pointer;
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
}

.tracker-adjust__toggle:hover,
.tracker-adjust__toggle:focus-visible {
  outline: none;
  background: color-mix(in srgb, var(--accent, #5c8cff) 28%, rgba(16, 20, 30, 0.9));
  color: var(--text-strong, #fdfcff);
}

.tracker-adjust__toggle-icon {
  font-size: 0.9rem;
}

.tracker-adjust__panel {
  width: 280px;
  padding: 0.95rem;
  border-radius: 18px;
  background: rgba(18, 22, 32, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.48);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.tracker-adjust__header {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.tracker-adjust__title {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(235, 240, 255, 0.95);
}

.tracker-adjust__subtitle {
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  color: rgba(200, 210, 235, 0.75);
}

.tracker-adjust__body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.tracker-adjust__section {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.tracker-adjust__section h4 {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: rgba(205, 215, 240, 0.84);
}

.tracker-adjust__row {
  display: grid;
  grid-template-columns: 32px 1fr 70px;
  align-items: center;
  gap: 0.45rem;
}

.tracker-adjust__axis {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(195, 205, 235, 0.85);
}

.tracker-adjust__row input[type='range'] {
  width: 100%;
}

.tracker-adjust__number {
  width: 100%;
  padding: 0.25rem 0.35rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(12, 16, 24, 0.92);
  color: inherit;
  font-size: 0.75rem;
}

.tracker-adjust__section--order {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.tracker-adjust__section--order select {
  padding: 0.25rem 0.45rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(12, 16, 24, 0.92);
  color: inherit;
  font-size: 0.8rem;
}

.tracker-adjust__reset {
  border-radius: 8px;
  padding: 0.35rem 0.75rem;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: inherit;
  font-size: 0.75rem;
  cursor: pointer;
}

.tracker-adjust__reset:hover,
.tracker-adjust__reset:focus-visible {
  outline: none;
  background: color-mix(in srgb, var(--accent, #5c8cff) 32%, rgba(255, 255, 255, 0.12));
}

.tracker-adjust__empty {
  margin: 0;
  font-size: 0.75rem;
  color: rgba(200, 210, 235, 0.75);
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
