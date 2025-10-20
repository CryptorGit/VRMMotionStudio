<template>
  <div class="app-frame">
    <TopMenuBar
      :show-captions="showCaptions"
      :timeline-export-enabled="timelineHasContent"
      @import="openFile"
      @import-audio="openAudioFile"
      @export="exportPose"
      @capture-image="captureImage"
      @capture-video="captureVideo"
      @clear-cache="clearAllCache"
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
            direction="vertical"
            storage-key="layout.split.column"
            :initial-primary-ratio="0.68"
            :min-primary-ratio="0.2"
            :max-primary-ratio="0.95"
            :primary-min-pixels="220"
            :secondary-min-pixels="TIMELINE_MIN_HEIGHT"
          >
            <template #primary>
              <section class="workspace-panel workspace-panel--viewport" :aria-label="viewportTexts.area || 'Viewport area'">
                <div class="workspace-panel__body workspace-panel__body--viewport">
                  <div class="viewport-frame">
                    <div class="viewport-overlay viewport-overlay--top-left top-left-controls">
                      <label class="mode-switch" :aria-label="viewportTexts.modeToggle || 'Switch view mode'">
                        <span>{{ viewportTexts.mode }}</span>
                        <select v-model="viewportMode">
                          <option v-for="mode in viewportModes" :key="mode.value" :value="mode.value">
                            {{ mode.label }}
                          </option>
                        </select>
                      </label>
                      <div class="round-buttons">
                        <button class="round-btn" :disabled="!history.canUndo" @click="onUndo" :title="tooltip(viewportTexts.undo || '')">⟲</button>
                        <button class="round-btn" :disabled="!history.canRedo" @click="onRedo" :title="tooltip(viewportTexts.redo || '')">⟳</button>
                      </div>
                    </div>
                    <div v-if="isCameraMode" class="viewport-overlay viewport-overlay--top-right">
                      <div class="camera-status">
                        <span class="camera-status__label">{{ viewportTexts.renderCam }}</span>
                        <span class="camera-status__resolution">{{ renderCameraWidth }} ×{{ renderCameraHeight }}</span>
                      </div>
                    </div>
                    <div v-if="isCameraMode" class="viewport-overlay viewport-overlay--bottom-left">
                      <p class="camera-hint">
                        {{ viewportTexts.cameraHint }}
                      </p>
                    </div>
                    <div v-else-if="virtualTrackersEnabled" class="viewport-overlay viewport-overlay--bottom-left">
                      <p class="tracker-hint">
                        {{ viewportTexts.trackerHint }}
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
                        <div class="yaw-ring__label">{{ viewportTexts.roll }} {{ renderCameraRollDeg.toFixed(0) }}°</div>
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
              <section class="workspace-panel workspace-panel--timeline" :aria-label="timelineTexts.area || 'Timeline area'">
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
                    :audio-waveform-data="audioWaveformData"
                    :available-trackers="availableTrackers"
                    @import-timeline="handleTimelineRequestImport"
                    @export-timeline="handleTimelineExport"
                    @seek="handleTimelineSeek"
                    @play="handleTimelinePlay"
                    @pause="handleTimelinePause"
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
              <aside class="workspace-panel workspace-panel--settings" :aria-label="ariaTexts.settingsArea || 'Settings area'">
            <div class="workspace-panel__body workspace-panel__body--settings">
              <SettingsSidebar
                :ambient="ambientLight"
                :directional="directionalLight"
                :mesh="currentMeshRef"
                :models="models"
                v-model:show-grid="showGrid"
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
                v-model:outline-model-index="currentOutlineModelIndex"
                v-model:outline-width="outlineWidth"
                v-model:outline-color="outlineColor"
                v-model:virtual-trackers-enabled="virtualTrackersEnabled"
                v-model:virtual-tracker-display-visible="virtualTrackerDisplayVisible"
                v-model:show-virtual-tracker-labels="showVirtualTrackerLabels"
                v-model:virtual-tracker-size="virtualTrackerSize"
                v-model:virtual-tracker-label-scale="virtualTrackerLabelScale"
                v-model:forearm-twist-share="forearmTwistShare"
                :has-models-loaded="hasModelsLoaded"
                :selected-tracker-key="selectedTrackerKey"
                :selected-tracker-label="selectedTrackerLabel"
                :tracker-position="selectedTrackerPosition"
                :tracker-rotation="selectedTrackerRotation"
                :tracker-rotation-order="selectedTrackerRotationOrder"
                :tracker-rotation-axis="selectedTrackerRotationAxis"
                v-model:show-tracker-axes="showTrackerAxes"
                v-model:tracker-axes-length="trackerAxesLength"
                :finger-states="fingerStates"
                :finger-axis-overrides="activeFingerAxisOverrides"
                @update:fingerStates="updateFingerStates"
                @update:fingerAxisOverrides="updateFingerAxisOverrides"
                @update:tracker-position="handleTrackerPositionUpdate"
                @update:tracker-rotation="handleTrackerRotationUpdate"
                @update:tracker-rotation-order="handleTrackerRotationOrderUpdate"
                @update:tracker-rotation-axis="handleTrackerRotationAxisUpdate"
                @reset-tracker-position="handleResetTrackerPosition"
                @reset-tracker-rotation="handleResetTrackerRotation"
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
                :available-trackers="availableTrackers"
                :audio-duration="audioDuration"
                :audio-buffer="audioBuffer"
                @update-timeline-snap="handleTimelineSnapSetting"
                @update-timeline-loop="handleTimelineLoopSetting"
                @remove-selected-keyframes="handleSettingsRemoveSelectedKeyframes"
                @update-keyframe-curves="handleTimelineCurveUpdate"
                @reset-virtual-trackers="resetVirtualTrackers"
                @reset-all-tracker-orientations="handleResetAllTrackerRotations"
                @toggle-bone="toggleBoneVisibility"
                @toggle-bone-names="toggleBoneNameVisibility"
                @toggle-all-bones="toggleAllBones"
                @toggle-all-bone-names="toggleAllBoneNames"
                @toggle-model="toggleModelVisibility"
                @remove-model="removeModel"
                @reset-outline="handleResetOutlineDefaults"
                @load-model-outline="handleLoadModelOutline"
                @capture-render="captureRenderImageToFile"
                @remove-audio="removeAudio"
                @update:selected-tracker-model-index="selectedTrackerModelIndex = $event"
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
    <!-- ToastHub removed per user request -->
    <input
      type="file"
      ref="fileInput"
      accept=".vrm"
      style="display:none"
      @change="onFileChange"
    />
    <input
      type="file"
      ref="audioFileInput"
      accept="audio/mp3,audio/mpeg,.mp3"
      style="display:none"
      @change="onAudioFileChange"
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
import { ref, shallowRef, computed, onMounted, onUnmounted, onBeforeUnmount, watch, watchEffect, provide, reactive } from 'vue'
import SettingsSidebar from './SettingsSidebar.vue'
import TimelineEditor from './timeline/TimelineEditor.vue'
import TopMenuBar from './layout/TopMenuBar.vue'
import StatusBar from './layout/StatusBar.vue'
// ToastHub removed per user request
import SplitPane from './layout/SplitPane.vue'
import * as THREE from 'three'
import { API_BASE_URL } from '../config.js'
import { useI18n } from '../locales/index.js'
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
import { useVirtualTrackers, TRACKER_ROTATION_ORDERS, TRACKER_ROTATION_AXES, TRACKER_DEFS } from '../composables/useVirtualTrackers.js'
import { useTimeline } from '../composables/useTimeline.js'
import { useHistory } from '../composables/useHistory.js'
import { captionInjectionKey } from '../composables/useCaptions.js'
import { useStoragePersistence } from '../composables/useStoragePersistence.js'
import { useFingerControl } from '../composables/useFingerControl.js'
import { usePoseControls } from '../composables/usePoseControls.js'

const viewer = ref(null)
const currentMeshRef = ref(null)
const springBoneEnabled = ref(true)
const lookAtEnabled = ref(true)

const { t } = useI18n()
const viewportTexts = computed(() => t.value?.viewport ?? {})
const notificationsTexts = computed(() => t.value?.notifications ?? {})
const timelineTexts = computed(() => t.value?.timeline ?? {})
const ariaTexts = computed(() => t.value?.aria ?? {})
const commonTexts = computed(() => t.value?.common ?? {})
const statusTexts = computed(() => t.value?.statusBar ?? {})

const scene = shallowRef(null)
const camera = shallowRef(null)
const viewCamera = shallowRef(null)
const renderCamera = shallowRef(null)
const renderCameraHelper = shallowRef(null)
const renderer = shallowRef(null)
const controls = shallowRef(null)
const helper = shallowRef(null)
const transformControls = shallowRef(null)
const gridHelper = shallowRef(null)

const showPhysicalBones = ref(false)
const showOtherBones = ref(false)
const showExtendedBones = ref(false)
const showColliderNodes = ref(false)
const showNonDeformingBones = ref(false)
const highlightConstraint = ref(false)
const boneDotSize = ref(0.02)
const boneLabelScale = ref(1.0)
const showGrid = ref(true)

// VRMアウトライン設定
const outlineWidth = ref(0.002)
const outlineColor = ref('#000000')
const outlineDefaultWidth = ref(0.002)
const outlineDefaultColor = ref('#000000')
const outlineDefaultsCache = new WeakMap()
const outlineAutoResetModels = new WeakSet()

// モデルごとのアウトライン設定キャッシュ
const modelOutlineCache = new WeakMap()
// モデルごとのデフォルト値キャッシュ (マテリアルからキャプチャした初期値)
const modelDefaultsCache = new WeakMap()
const currentOutlineModelIndex = ref(0)

const virtualTrackersEnabled = ref(false)
const virtualTrackerDisplayVisible = ref(true)
const showVirtualTrackerLabels = ref(true)
const virtualTrackerSize = ref(0.08)
const virtualTrackerLabelScale = ref(1.0)
const selectedTrackerModelIndex = ref(-1) // -1 means "All Models"

// 選択されたトラッカーの状態
const selectedTrackerKey = ref(null)
const selectedTrackerPosition = ref({ x: 0, y: 0, z: 0 })
const selectedTrackerRotation = ref({ x: 0, y: 0, z: 0 })
const fallbackRotationOrder = TRACKER_ROTATION_ORDERS[0] || 'XYZ'
const sanitizeTrackerRotationOrder = order => {
  if (typeof order !== 'string') return fallbackRotationOrder
  const normalized = order.toUpperCase().replace(/[^XYZ]/g, '')
  if (normalized.length !== 3) return fallbackRotationOrder
  return TRACKER_ROTATION_ORDERS.includes(normalized) ? normalized : normalized
}
const selectedTrackerRotationOrder = ref(sanitizeTrackerRotationOrder('YXZ'))

// トラッカー回転軸の設定
const selectedTrackerRotationAxis = ref('+Z')

// トラッカー回転軸の表示設定
const showTrackerAxes = ref(false)
const trackerAxesLength = ref(0.05)
const forearmTwistShare = ref(0.7)

// 選択されたトラッカーのラベル
const selectedTrackerLabel = computed(() => {
  const key = selectedTrackerKey.value
  if (!key) return ''
  if (key === 'default') return 'Default'
  const match = availableTrackers.value.find(tracker => tracker.key === key)
  if (match?.label) return match.label
  const { baseKey, modelIndex } = parseTrackerKeyModelInfo(key)
  const def = TRACKER_DEFS.find(d => d.key === baseKey)
  if (!def) return key
  return modelIndex > 0 ? `${def.label} ${modelIndex + 1}` : def.label
})

// Check if models are loaded (for disabling tracker toggle)
const hasModelsLoaded = computed(() => {
  return Array.isArray(models.value) && models.value.length > 0
})

// Available trackers for dropdown selection in Key Settings
const DEFAULT_TRACKER_COLOR = '#5c8cff'

function toHexColor(value, fallback = DEFAULT_TRACKER_COLOR) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim().startsWith('#') ? value.trim() : `#${value.trim()}`
  }
  if (Number.isFinite(value)) {
    const clamped = Math.max(0, Math.min(0xffffff, Math.floor(value)))
    return `#${clamped.toString(16).padStart(6, '0')}`
  }
  return fallback
}

function parseTrackerKeyModelInfo(key) {
  if (typeof key !== 'string') {
    return { baseKey: key, modelIndex: 0 }
  }
  const sepIndex = key.lastIndexOf('@')
  if (sepIndex > 0) {
    const baseKey = key.slice(0, sepIndex)
    const suffix = Number(key.slice(sepIndex + 1))
    if (Number.isFinite(suffix) && suffix >= 1) {
      return { baseKey, modelIndex: suffix - 1 }
    }
  }
  return { baseKey: key, modelIndex: 0 }
}

const availableTrackers = computed(() => {
  const trackerList = trackerController?.trackers?.value
  const orderedKeys = new Map(TRACKER_DEFS.map((def, index) => [def.key, index]))
  const entries = []

  if (Array.isArray(trackerList) && trackerList.length) {
    trackerList.forEach(tracker => {
      const key = tracker?.key
      if (!key) return
      const { baseKey, modelIndex } = parseTrackerKeyModelInfo(key)
      const def = TRACKER_DEFS.find(d => d.key === baseKey)
      const fallbackColor = def ? toHexColor(def.color, DEFAULT_TRACKER_COLOR) : DEFAULT_TRACKER_COLOR
      let resolved = fallbackColor
      try {
        const matColor = tracker.mesh?.material?.color
        if (matColor && typeof matColor.getHexString === 'function') {
          resolved = `#${matColor.getHexString()}`
        } else if (typeof tracker.color === 'string' || Number.isFinite(tracker.color)) {
          resolved = toHexColor(tracker.color, fallbackColor)
        }
      } catch {}
      entries.push({
        key,
        baseKey,
        modelIndex,
        label: tracker.name || def?.label || key,
        color: resolved
      })
    })

    entries.sort((a, b) => {
      if (a.modelIndex !== b.modelIndex) return a.modelIndex - b.modelIndex
      const orderA = orderedKeys.get(a.baseKey) ?? Number.MAX_SAFE_INTEGER
      const orderB = orderedKeys.get(b.baseKey) ?? Number.MAX_SAFE_INTEGER
      if (orderA !== orderB) return orderA - orderB
      return a.label.localeCompare(b.label)
    })

    return entries
  }

  return TRACKER_DEFS.map(def => ({
    key: def.key,
    baseKey: def.key,
    modelIndex: 0,
    label: def.label,
    color: toHexColor(def.color, DEFAULT_TRACKER_COLOR)
  }))
})

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

// Audio playback
const audioFileInput = ref(null)
const audioContext = ref(null)
const audioBuffer = ref(null)
const audioSource = ref(null)
const audioStartTime = ref(0)
const audioDuration = ref(0)
const audioPlaying = ref(false)
const audioWaveformData = ref(null)
const audioFileName = ref('')
const audioSampleRate = ref(0)
const audioChannels = ref(0)

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
const viewportModes = computed(() => [
  { value: 'view', label: viewportTexts.value.viewMode || 'View Mode' },
  { value: 'camera', label: viewportTexts.value.cameraMode || 'Camera Mode' }
])

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
const TIMELINE_MIN_HEIGHT = 160
const DEFAULT_CURVE_COLOR = '#5c8cff'

function normalizeCurveColor(color, fallback = DEFAULT_CURVE_COLOR) {
  if (typeof color !== 'string') return fallback
  let trimmed = color.trim()
  if (!trimmed) return fallback
  if (!trimmed.startsWith('#')) {
    trimmed = `#${trimmed}`
  }
  const match = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i)
  if (!match) return fallback
  const hex = match[1]
  if (hex.length === 3) {
    return `#${hex.split('').map(ch => ch + ch).join('').toLowerCase()}`
  }
  if (hex.length === 8) {
    return `#${hex.slice(0, 6).toLowerCase()}`
  }
  return `#${hex.toLowerCase()}`
}


// Finger control states
// Finger control state (cached in localStorage)
const FINGER_STATES_STORAGE_KEY = 'fingerStates:v1'
const FINGER_AXIS_OVERRIDES_STORAGE_KEY = 'fingerAxisOverrides:v1'

const FINGER_STATE_KEYS = Object.freeze([
  'left_thumb',
  'left_index',
  'left_middle',
  'left_ring',
  'left_little',
  'right_thumb',
  'right_index',
  'right_middle',
  'right_ring',
  'right_little'
])

// Load finger states from localStorage
function loadFingerStatesFromCache() {
  try {
    const raw = localStorage.getItem(FINGER_STATES_STORAGE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (typeof cached !== 'object') return null
    return cached
  } catch {
    return null
  }
}

// Save finger states to localStorage
function saveFingerStatesToCache(states) {
  try {
    if (!states || typeof states !== 'object') {
      localStorage.removeItem(FINGER_STATES_STORAGE_KEY)
      return
    }
    localStorage.setItem(FINGER_STATES_STORAGE_KEY, JSON.stringify(states))
  } catch {}
}

// Load finger axis overrides from localStorage
function loadFingerAxisOverridesFromCache() {
  try {
    const raw = localStorage.getItem(FINGER_AXIS_OVERRIDES_STORAGE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (typeof cached !== 'object') return null
    return cached
  } catch {
    return null
  }
}

// Save finger axis overrides to localStorage
function saveFingerAxisOverridesToCache(overrides) {
  try {
    if (!overrides || typeof overrides !== 'object') {
      localStorage.removeItem(FINGER_AXIS_OVERRIDES_STORAGE_KEY)
      return
    }
    localStorage.setItem(FINGER_AXIS_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides))
  } catch {}
}

const fingerStates = reactive({
  left_thumb: 0,
  left_index: 0,
  left_middle: 0,
  left_ring: 0,
  left_little: 0,
  right_thumb: 0,
  right_index: 0,
  right_middle: 0,
  right_ring: 0,
  right_little: 0
})

// Initialize finger states from cache
const cachedFingerStates = loadFingerStatesFromCache()
if (cachedFingerStates) {
  for (const key of FINGER_STATE_KEYS) {
    if (key in cachedFingerStates && typeof cachedFingerStates[key] === 'number') {
      fingerStates[key] = cachedFingerStates[key]
    }
  }
}

const ALLOWED_FINGER_AXIS_VALUES = new Set(['x+', 'x-', 'y+', 'y-', 'z+', 'z-'])
const fingerAxisOverridesByModel = reactive({})
let pendingFingerAxisOverridesByName = null
const fallbackFingerAxisOverrides = Object.freeze(createDefaultFingerAxisOverrides())

// Initialize finger axis overrides from cache
const cachedFingerAxisOverrides = loadFingerAxisOverridesFromCache()
if (cachedFingerAxisOverrides && typeof cachedFingerAxisOverrides === 'object') {
  for (const [modelKey, overrides] of Object.entries(cachedFingerAxisOverrides)) {
    if (typeof overrides === 'object') {
      fingerAxisOverridesByModel[modelKey] = overrides
    }
  }
}

function createDefaultFingerAxisOverrides() {
  const defaults = {}
  for (const key of FINGER_STATE_KEYS) {
    // Thumbはy+、それ以外はz+
    defaults[key] = key.includes('thumb') ? 'y+' : 'z+'
  }
  return defaults
}

function normalizeFingerAxisValue(value) {
  if (typeof value !== 'string') return 'z+'
  const normalized = value.trim().toLowerCase()
  return ALLOWED_FINGER_AXIS_VALUES.has(normalized) ? normalized : 'z+'
}

function ensureFingerAxisOverridesEntry(modelId) {
  if (modelId == null) return null
  const key = String(modelId)
  if (!fingerAxisOverridesByModel[key]) {
    fingerAxisOverridesByModel[key] = createDefaultFingerAxisOverrides()
  }
  return fingerAxisOverridesByModel[key]
}

function updateFingerStates(updated) {
  if (!updated || typeof updated !== 'object') return

  const clampFingerAngle = (value, fallback = 0) => {
    const num = Number(value)
    if (!Number.isFinite(num)) return fallback
    return Math.min(90, Math.max(-90, num))
  }

  // 更新されたデータでfingerStatesを完全に置き換え
  let changed = false
  for (const key of FINGER_STATE_KEYS) {
    if (!(key in fingerStates)) continue
    const next = clampFingerAngle(updated[key], fingerStates[key])
    if (fingerStates[key] !== next) {
      fingerStates[key] = next
      changed = true
    }
  }
  
  if (changed) {
    const snapshot = {}
    FINGER_STATE_KEYS.forEach(key => { snapshot[key] = fingerStates[key] })
    console.log('[FingerControl] Updated finger states (deg):', snapshot)
    
    // Save to localStorage
    saveFingerStatesToCache(snapshot)
  }
  
  // 持Eの状態が更新されたら、すぐにポーズを適用
  // applyFingerPoseは毎フレーム呼ばれるが、即座に反映させるため明示的に呼ぶ
  if (typeof applyFingerPose === 'function') {
    try {
      applyFingerPose()
    } catch (error) {
      console.warn('[FingerControl] Failed to apply finger pose:', error)
    }
  }
}

const CAPTION_STORAGE_KEY = 'ui.captions.enabled'
const showCaptions = ref(true)
const tooltip = message => (showCaptions.value && typeof message === 'string' ? message : '')

provide(captionInjectionKey, {
  showCaptions,
  tooltip
})

const autoRestore = ref(true)
const STORAGE_PERSIST_TOAST_KEY = 'cache.persist.toast'
const CACHE_SAVED_TOAST_KEY = 'cache.saved.toast'
let cacheSavedToastShown = false
let storagePersistToastState = 'unknown'
let lastCacheErrorToastAt = 0
const uiNotice = ref('')
let uiNoticeTimer = null

function showNotice(message, duration = 5000) {
  uiNotice.value = message || ''
  if (typeof window !== 'undefined' && uiNoticeTimer) {
    window.clearTimeout(uiNoticeTimer)
    uiNoticeTimer = null
  }
  if (!message) return
  if (typeof window !== 'undefined' && duration > 0) {
    uiNoticeTimer = window.setTimeout(() => {
      uiNotice.value = ''
      uiNoticeTimer = null
    }, duration)
  }
}

const notify = (key, fallback, duration = 3200) => {
  const message = notificationsTexts.value[key] || fallback
  if (message) showNotice(message, duration)
}

const notifyWithVars = (key, fallback, vars = {}, duration = 3200) => {
  const template = notificationsTexts.value[key] || fallback
  const message = typeof template === 'string'
    ? template.replace(/\{(\w+)\}/g, (_, token) => (vars[token] != null ? String(vars[token]) : ''))
    : fallback
  if (message) showNotice(message, duration)
}

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
    showGrid: showGrid.value,
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
  outlineWidth: outlineWidth.value,
  outlineColor: outlineColor.value,
    virtualTrackersEnabled: virtualTrackersEnabled.value,
    virtualTrackerDisplayVisible: virtualTrackerDisplayVisible.value,
    showVirtualTrackerLabels: showVirtualTrackerLabels.value,
    virtualTrackerSize: virtualTrackerSize.value,
    virtualTrackerLabelScale: virtualTrackerLabelScale.value,
    showTrackerAxes: showTrackerAxes.value,
    trackerAxesLength: trackerAxesLength.value,
  forearmTwistShare: forearmTwistShare.value,
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
    cameraRotateSensitivity: cameraRotateSensitivity.value,
    fingerStates: { ...fingerStates },
    fingerAxisOverrides: exportFingerAxisOverridesByName()
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
    if (typeof data.showGrid === 'boolean') showGrid.value = data.showGrid
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
    if (Number.isFinite(data.outlineWidth)) outlineWidth.value = Math.min(0.005, Math.max(0, data.outlineWidth))
    if (typeof data.outlineColor === 'string') outlineColor.value = data.outlineColor
    if (typeof data.virtualTrackersEnabled === 'boolean') virtualTrackersEnabled.value = data.virtualTrackersEnabled
    if (typeof data.virtualTrackerDisplayVisible === 'boolean') virtualTrackerDisplayVisible.value = data.virtualTrackerDisplayVisible
    if (typeof data.showVirtualTrackerLabels === 'boolean') showVirtualTrackerLabels.value = data.showVirtualTrackerLabels
    if (Number.isFinite(data.virtualTrackerSize)) virtualTrackerSize.value = data.virtualTrackerSize
    if (Number.isFinite(data.virtualTrackerLabelScale)) virtualTrackerLabelScale.value = data.virtualTrackerLabelScale
    if (typeof data.showTrackerAxes === 'boolean') showTrackerAxes.value = data.showTrackerAxes
    if (Number.isFinite(data.trackerAxesLength)) trackerAxesLength.value = data.trackerAxesLength
    if (Number.isFinite(data.forearmTwistShare)) {
      const clamped = Math.min(1, Math.max(0, data.forearmTwistShare))
      forearmTwistShare.value = clamped
      try { trackerController?.setForearmTwistShareRatio?.(clamped) } catch {}
    }
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
    // 指の状態の復元
    if (data.fingerStates && typeof data.fingerStates === 'object') {
      try { Object.assign(fingerStates, data.fingerStates) } catch {}
    }
    if (data.fingerAxisOverrides && typeof data.fingerAxisOverrides === 'object') {
      pendingFingerAxisOverridesByName = data.fingerAxisOverrides
      applyPendingFingerAxisOverrides()
    }
    // アウトライン太さ値をスライダー範囲へ正規化
    outlineWidth.value = Math.min(0.005, Math.max(0, Number(outlineWidth.value) || 0.002))
    // 回転軸表示再適用（コントローラ生成済みの場合）
    try {
      if (trackerController) {
        trackerController.setRotationAxesVisible?.(showTrackerAxes.value)
        trackerController.updateRotationAxesLength?.(trackerAxesLength.value)
      }
    } catch {}
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

function loadAutoRestore() {
  autoRestore.value = true
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
  showNotice(`設定 ボタンキャプション ${showCaptions.value ? '表示' : '非表示'}`, 3200)
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
      notify('cacheSaved', 'Cache: Saved', 2800)
      cacheSavedToastShown = true
      try { sessionStorage.setItem(CACHE_SAVED_TOAST_KEY, '1') } catch {}
    }
  } else if (event.ok === false && event.reason !== 'clear') {
    const now = Date.now()
    if (!lastCacheErrorToastAt || now - lastCacheErrorToastAt > 10000) {
      notify('cacheFailed', 'Cache: Failed to save. Please check browser storage settings.', 5600)
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
  onCachePersisted: handleCachePersisted,
  showNotice,
  timelineController: () => timelineController,
  trackerController: () => trackerController
})

const {
  fileInput,
  poses: _poses,
  selectedPose: _selectedPose,
  models,
  onFileChange,
  toggleModelVisibility,
  toggleBoneVisibility,
  toggleBoneNameVisibility,
  removeModel,
  clearCache,
  applyPose: _applyPose,
  openFile,
  onDragOver,
  onDragLeave,
  onDrop,
  restoreCachedModel,
  applyBoneSettingsAll
} = fileLoader

// Initialize finger control
const getActiveModel = () => {
  const active = models.value.find(m => m.visible)
  return active || models.value[0] || null
}

const activeFingerAxisOverrides = computed(() => {
  const model = getActiveModel()
  if (!model?.id) return fallbackFingerAxisOverrides
  return ensureFingerAxisOverridesEntry(model.id) || fallbackFingerAxisOverrides
})

// fingerStatesを関数として渡すことで、常に最新の値を参照できるようにする
const getFingerStates = () => fingerStates
const getActiveFingerAxisOverrides = () => activeFingerAxisOverrides.value
const { applyFingerPose } = useFingerControl(getFingerStates, getActiveModel, getActiveFingerAxisOverrides)

function updateFingerAxisOverrides(updated) {
  if (!updated || typeof updated !== 'object') return
  const model = getActiveModel()
  if (!model?.id) return

  const entry = ensureFingerAxisOverridesEntry(model.id)
  if (!entry) return

  let changed = false
  for (const key of FINGER_STATE_KEYS) {
    const next = normalizeFingerAxisValue(updated[key] ?? entry[key])
    if (entry[key] !== next) {
      entry[key] = next
      changed = true
    }
  }

  if (changed) {
    const label = model.name || `model-${model.id}`
    console.log('[FingerControl] Updated axis overrides for', label, { ...entry })
    
    // Save to localStorage
    saveFingerAxisOverridesToCache(fingerAxisOverridesByModel)
    
    scheduleApplyFingerPose()
  }
}

let pendingFingerPoseRaf = null
const scheduleApplyFingerPose = () => {
  if (typeof applyFingerPose !== 'function') return
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    if (pendingFingerPoseRaf != null) return
    pendingFingerPoseRaf = window.requestAnimationFrame(() => {
      pendingFingerPoseRaf = null
      try {
        applyFingerPose()
      } catch (error) {
        console.warn('[FingerControl] Failed to apply finger pose (scheduled):', error)
      }
    })
  } else {
    try {
      applyFingerPose()
    } catch (error) {
      console.warn('[FingerControl] Failed to apply finger pose (scheduled):', error)
    }
  }
}

function exportFingerAxisOverridesByName() {
  const snapshot = {}
  if (!Array.isArray(models?.value)) return snapshot
  for (const model of models.value) {
    if (!model?.id || !model?.name) continue
    const entry = fingerAxisOverridesByModel[String(model.id)]
    if (!entry) continue
    snapshot[model.name] = { ...entry }
  }
  return snapshot
}

function applyPendingFingerAxisOverrides() {
  if (!pendingFingerAxisOverridesByName || typeof pendingFingerAxisOverridesByName !== 'object') return
  if (!Array.isArray(models?.value) || models.value.length === 0) return

  let applied = false
  const remaining = {}

  for (const [name, overrides] of Object.entries(pendingFingerAxisOverridesByName)) {
    const model = models.value.find(m => m?.name === name)
    if (!model?.id) {
      remaining[name] = overrides
      continue
    }
    const entry = ensureFingerAxisOverridesEntry(model.id)
    if (!entry) continue
    for (const key of FINGER_STATE_KEYS) {
      const next = normalizeFingerAxisValue(overrides?.[key] ?? entry[key])
      if (entry[key] !== next) {
        entry[key] = next
        applied = true
      }
    }
  }

  pendingFingerAxisOverridesByName = Object.keys(remaining).length ? remaining : null
  if (applied) {
    scheduleApplyFingerPose()
  }
}

watch(
  fingerStates,
  () => scheduleApplyFingerPose(),
  { deep: true }
)

watch(
  () => activeFingerAxisOverrides.value,
  () => scheduleApplyFingerPose(),
  { deep: true }
)

watch(
  () => models.value.map(model => ({ id: model?.id, name: model?.name })),
  (entries) => {
    const idSet = new Set(entries.filter(entry => entry?.id != null).map(entry => String(entry.id)))
    Object.keys(fingerAxisOverridesByModel).forEach(id => {
      if (!idSet.has(id)) {
        delete fingerAxisOverridesByModel[id]
      }
    })
    entries.forEach(entry => {
      if (entry.id == null) return
      ensureFingerAxisOverridesEntry(entry.id)
    })
    applyPendingFingerAxisOverrides()
    scheduleApplyFingerPose()
  },
  { deep: true }
)

onBeforeUnmount(() => {
  if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function' && pendingFingerPoseRaf != null) {
    window.cancelAnimationFrame(pendingFingerPoseRaf)
  }
  pendingFingerPoseRaf = null
})

// Initialize pose controls for export
const { exportPose } = usePoseControls({
  getModels: () => models.value,
  timelineController: () => timelineController,
  trackerController: () => trackerController,
  showNotice,
  getFingerStates
})

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
  trackerAdjustState.order = sanitizeTrackerRotationOrder(snapshot.order || trackerAdjustState.order)
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
    selectedTrackerKey.value = event.key
    refreshTrackerAdjustState(event.key)
    updateSelectedTrackerState(event.key)
  } else if (!event.key && lastTrackerKey.value) {
    refreshTrackerAdjustState(lastTrackerKey.value)
  }
}

// 選択されたトラッカーの状態を更新
function updateSelectedTrackerState(key) {
  if (!key || !trackerController) return
  
  const snapshot = trackerController.getTrackerSnapshot(key)
  if (!snapshot) return
  
  // 位置を更新
  if (snapshot.position && Array.isArray(snapshot.position)) {
    selectedTrackerPosition.value = {
      x: snapshot.position[0] || 0,
      y: snapshot.position[1] || 0,
      z: snapshot.position[2] || 0
    }
  }
  
  // 角度を更新
  if (snapshot.angles) {
    selectedTrackerRotation.value = {
      x: snapshot.angles.x || 0,
      y: snapshot.angles.y || 0,
      z: snapshot.angles.z || 0
    }
  }
  
  // 回転軸を更新
  if (snapshot.order) {
    selectedTrackerRotationOrder.value = sanitizeTrackerRotationOrder(snapshot.order)
  }
  
  // 回転軸（デフォルト）を更新
  selectedTrackerRotationAxis.value = snapshot.rotationAxis || '+Z'
}

// トラッカー位置を更新
function handleTrackerPositionUpdate({ axis, value }) {
  if (!selectedTrackerKey.value || !trackerController) return
  
  const newPosition = { ...selectedTrackerPosition.value }
  newPosition[axis] = value
  selectedTrackerPosition.value = newPosition
  
  trackerController.setTrackerPosition(selectedTrackerKey.value, newPosition)
}

// トラッカー角度を更新
function handleTrackerRotationUpdate({ axis, value }) {
  if (!selectedTrackerKey.value || !trackerController) return
  
  const newRotation = { ...selectedTrackerRotation.value }
  newRotation[axis] = value
  selectedTrackerRotation.value = newRotation
  
  trackerController.setTrackerRotationDegrees(selectedTrackerKey.value, newRotation, selectedTrackerRotationOrder.value)
}

// トラッカー回転軸を更新
function handleTrackerRotationOrderUpdate(order) {
  const next = sanitizeTrackerRotationOrder(order)
  if (selectedTrackerRotationOrder.value === next) return
  selectedTrackerRotationOrder.value = next
  // 現在の回転角度で新しい軸を適用
  if (selectedTrackerKey.value && trackerController) {
    trackerController.setTrackerRotationDegrees(selectedTrackerKey.value, selectedTrackerRotation.value, next)
  }
}

// トラッカー回転軸（デフォルト）を更新
function handleTrackerRotationAxisUpdate(axis) {
  if (!TRACKER_ROTATION_AXES.includes(axis)) return
  selectedTrackerRotationAxis.value = axis
  // trackerControllerに反映（将来のIK実装用）
  if (selectedTrackerKey.value && trackerController && trackerController.setTrackerRotationAxis) {
    trackerController.setTrackerRotationAxis(selectedTrackerKey.value, axis)
  }
}

// トラッカー位置をリセット
function handleResetTrackerPosition() {
  if (!selectedTrackerKey.value || !trackerController) return
  
  const defaultPosition = { x: 0, y: 0, z: 0 }
  selectedTrackerPosition.value = defaultPosition
  trackerController.setTrackerPosition(selectedTrackerKey.value, defaultPosition)
}

// トラッカー角度をリセット
function handleResetTrackerRotation() {
  if (!selectedTrackerKey.value || !trackerController) return
  
  const defaultRotation = { x: 0, y: 0, z: 0 }
  selectedTrackerRotation.value = defaultRotation
  trackerController.setTrackerRotationDegrees(selectedTrackerKey.value, defaultRotation, selectedTrackerRotationOrder.value)
}

function handleResetAllTrackerRotations() {
  if (!trackerController) return
  try {
    trackerController.resetAllTrackerRotations({ keepEnabled: true, persist: true })
  } catch {}
  refreshTrackerAdjustState()
  if (selectedTrackerKey.value) {
    updateSelectedTrackerState(selectedTrackerKey.value)
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
  const template = statusTexts.value.frame || 'Frame {current}/{end} ({fps}fps)'
  return template
    .replace('{current}', String(currentFrame))
    .replace('{end}', String(endFrame))
    .replace('{fps}', String(fps))
})

const storageStatus = computed(() => {
  if (!storageSupported.value) {
    return statusTexts.value.cacheStandard || 'Cache: Standard storage'
  }
  const usageBytes = storageUsage.value || 0
  const quotaBytes = storageQuota.value || 0
  const guard = storagePersisted.value
    ? statusTexts.value.cacheGuardPersisted || 'Persisted'
    : statusTexts.value.cacheGuardVolatile || 'Not persisted'
  if (!quotaBytes) {
    const template = statusTexts.value.cacheUsage || 'Cache {usage} ({guard})'
    return template
      .replace('{usage}', formatStorage(usageBytes))
      .replace('{guard}', guard)
  }
  const percent = quotaBytes > 0 ? Math.min(100, Math.max(0, Math.round((usageBytes / quotaBytes) * 100))) : 0
  const template = statusTexts.value.cacheUsageDetailed || 'Cache {usage} / {quota} ({guard} {percent}%)'
  return template
    .replace('{usage}', formatStorage(usageBytes))
    .replace('{quota}', formatStorage(quotaBytes))
    .replace('{guard}', guard)
    .replace('{percent}', String(percent))
})

const statusMessage = computed(() => {
  const parts = []
  if (uiNotice.value) parts.push(uiNotice.value)
  if (frameStatus.value) parts.push(frameStatus.value)
  if (storageStatus.value) parts.push(storageStatus.value)
  return parts.join(' | ')
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
  gridHelper,
  onControlStart,
  onControlEnd,
  onPointerDown,
  vrmGetter: () => (models?.value || []).map(m => m.vrm).filter(Boolean),
  postRender: () => {
    // Apply finger poses every frame
    applyFingerPose()
  }
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
      selectedTrackerKey.value = payload.key
      refreshTrackerAdjustState(payload.key)
      updateSelectedTrackerState(payload.key)
    }
    pushHistory('tracker-drag')
  },
  onManipulateEnd: () => {
    refreshTrackerAdjustState()
    if (selectedTrackerKey.value) {
      updateSelectedTrackerState(selectedTrackerKey.value)
    }
  },
  onTrackerTransform: handleTrackerTransformEvent
})

// 復元��み設定から回転軸表示/長さを適用
try {
  trackerController.setRotationAxesVisible?.(showTrackerAxes.value)
  trackerController.updateRotationAxesLength?.(trackerAxesLength.value)
} catch {}

refreshTrackerAdjustState()

const trackerStatesView = computed(() => trackerController?.trackerStates || {})
const trackerRotationOrders = computed(() => trackerController?.rotationOrders || TRACKER_ROTATION_ORDERS)

// selectedTrackerKeyの変更を監視してUIを更新
watch(selectedTrackerKey, (newKey) => {
  if (newKey) {
    updateSelectedTrackerState(newKey)
  }
})

// trackerControllerのselectedTrackerKeyと同期
watch(() => trackerController?.selectedTrackerKey?.value, (newKey) => {
  if (newKey && newKey !== selectedTrackerKey.value) {
    selectedTrackerKey.value = newKey
  }
})

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
      // clone per-tracker curves if present
      const curves = {}
      if (frame?.curves && typeof frame.curves === 'object') {
        for (const [tKey, entry] of Object.entries(frame.curves)) {
          curves[tKey] = {
            curve: cloneTimelineCurve(entry?.curve),
            color: normalizeCurveColor(entry?.color, DEFAULT_CURVE_COLOR),
            modified: !!entry?.modified
          }
        }
      }
      return {
        id: Number(frame?.id) || 0,
        time: Number(frame?.time) || 0,
        values,
        curve: cloneTimelineCurve(frame?.curve),
        curves
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
  // Prevent enabling trackers when no models loaded
  if (v && !hasModelsLoaded.value) {
    virtualTrackersEnabled.value = false
    return
  }
  try { trackerController.setEnabled(v) } catch {}
  if (v) {
    applyTimelinePoseImmediate()
  }
  refreshTrackerAdjustState()
  scheduleDisplaySettingsSave()
})

// 回転軸の可視性を監視
watch(showTrackerAxes, (visible) => {
  if (trackerController) {
    try {
      trackerController.setRotationAxesVisible(visible)
    } catch {}
  }
  scheduleDisplaySettingsSave()
})

// 回転軸の長さを監視
watch(trackerAxesLength, (length) => {
  if (trackerController) {
    try {
      trackerController.updateRotationAxesLength(length)
    } catch {}
  }
  scheduleDisplaySettingsSave()
})

watch(forearmTwistShare, (ratio) => {
  if (trackerController?.setForearmTwistShareRatio) {
    try {
      trackerController.setForearmTwistShareRatio(ratio)
    } catch {}
  }
  scheduleDisplaySettingsSave()
})

// Force disable trackers when all models removed
watch(hasModelsLoaded, (loaded) => {
  if (!loaded && virtualTrackersEnabled.value) {
    virtualTrackersEnabled.value = false
  }
})

watch(virtualTrackerDisplayVisible, v => {
  try { trackerController.setDisplayVisible(v) } catch {}
  scheduleDisplaySettingsSave()
})

// グリッド表示の監要E
watch(showGrid, (visible) => {
  if (gridHelper.value) {
    gridHelper.value.visible = visible
  }
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

// タイムライン再生状態とMP3オーディオを同期
watch(timelinePlaying, (isPlaying, wasPlaying) => {
  if (isPlaying === wasPlaying) return
  
  if (isPlaying) {
    // タイムライン再生開始時、MP3を現在時刻から再生
    if (audioBuffer.value && audioContext.value) {
      const currentTime = timelineCurrentTime.value || 0
      playAudio(currentTime)
    }
  } else {
    // タイムライン停止時、MP3も停止
    stopAudio()
  }
})

// タイムライン時刻変更時、MP3もシーク
watch(timelineCurrentTime, (newTime, oldTime) => {
  // タイムライン再生中で、時刻が大きく変わった場合（シーク操作）
  if (timelinePlaying.value && audioBuffer.value && audioContext.value) {
    const delta = Math.abs(newTime - oldTime)
    // 0.1秒以上の変化があったらシークとみなす
    if (delta > 0.1) {
      stopAudio()
      playAudio(newTime)
    }
  }
})

function resetVirtualTrackers() {
  try {
    const modelIdx = selectedTrackerModelIndex.value
    
    // -1 (All Models) の場合はすべてリセット
    if (modelIdx === -1) {
      if (trackerController?.resetAllTrackerPositions) {
        trackerController.resetAllTrackerPositions({ persist: true })
      }
      notify('trackersReset', 'Trackers: All virtual trackers reset.', 3200)
    } else {
      // 特定のモデルのトラッカーのみリセット
      if (trackerController?.resetTrackerPositionsForModel) {
        trackerController.resetTrackerPositionsForModel(modelIdx + 1, { persist: true })
      }
      const modelName = models.value[modelIdx]?.name || `Model ${modelIdx + 1}`
      notify('trackersReset', `Trackers: ${modelName} trackers reset.`, 3200)
    }
    
    refreshTrackerAdjustState()
    scheduleDisplaySettingsSave()
  } catch (err) {
    console.error('[resetVirtualTrackers]', err)
  }
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
    notify('timelineNotReady', 'Timeline: Not initialized.', 4200)
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
      notify('timelineAddFailed', 'Timeline: Failed to add keyframe.', 4200)
      return
    }
    applyTimelinePoseImmediate()
    if (typeof syncTimelineRefs === 'function') syncTimelineRefs()
    markTimelineDirty('add-key')
    notify('timelineKeyAdded', 'Timeline: Added current pose as keyframe.', 2200)
  } catch (error) {
    notify('timelineAddFailed', 'Timeline: Failed to add keyframe.', 4200)
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
    notify('timelineNotReady', 'Timeline: Not initialized.', 4200)
    return
  }
  const ids = Array.isArray(timelineSelection.selectedIds) && timelineSelection.selectedIds.length
    ? timelineSelection.selectedIds
    : timelineSelection.frames.map(frame => frame.id)
  if (!ids.length) {
    notify('timelineCopySelect', 'Timeline: Select keys to copy.', 3200)
    return
  }
  try {
    const clipboardPayload = captureTimelineClipboard(ids)
    if (!clipboardPayload) {
      notify('timelineCopyFailed', 'Timeline: Failed to copy keyframes.', 4200)
      return
    }
    timelineClipboard.value = clipboardPayload
    notifyWithVars('timelineCopySuccess', 'Timeline: Copied {count} keyframe(s).', { count: clipboardPayload.frames.length }, 2200)
  } catch {
    notify('timelineCopyFailed', 'Timeline: Failed to copy keyframes.', 4200)
  }
}

function handleTimelinePasteKeyframes() {
  if (!timelineController) {
    notify('timelineNotReady', 'Timeline: Not initialized.', 4200)
    return
  }
  const normalizedClipboard = normalizeClipboardPayload(timelineClipboard.value, timelineFrameRate.value || 60)
  if (!normalizedClipboard) {
    notify('timelinePasteEmpty', 'Timeline: No keyframes to paste.', 3200)
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
      notify('timelinePasteFailed', 'Timeline: Failed to paste keyframes.', 4200)
      return
    }
    applyTimelinePoseImmediate()
    if (typeof syncTimelineRefs === 'function') syncTimelineRefs()
    markTimelineDirty('paste-keys')
    notifyWithVars('timelinePasteSuccess', 'Timeline: Pasted {count} keyframe(s).', { count: pasted.length }, 2200)
  } catch {
    notify('timelinePasteFailed', 'Timeline: Failed to paste keyframes.', 4200)
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
      const curves = {}
      if (frame?.curves && typeof frame.curves === 'object') {
        for (const [trackerKey, entry] of Object.entries(frame.curves)) {
          curves[trackerKey] = {
            curve: cloneTimelineCurve(entry?.curve),
            color: normalizeCurveColor(entry?.color, DEFAULT_CURVE_COLOR),
            modified: !!entry?.modified
          }
        }
      }

      // Ensure default curve entry exists
      if (!curves.default) {
        const defaultCurve = cloneTimelineCurve(frame?.curve)
        const isModified =
          Math.abs(defaultCurve.in.x - DEFAULT_TIMELINE_CURVE.in.x) > 1e-4 ||
          Math.abs(defaultCurve.in.y - DEFAULT_TIMELINE_CURVE.in.y) > 1e-4 ||
          Math.abs(defaultCurve.out.x - DEFAULT_TIMELINE_CURVE.out.x) > 1e-4 ||
          Math.abs(defaultCurve.out.y - DEFAULT_TIMELINE_CURVE.out.y) > 1e-4
        curves.default = {
          curve: defaultCurve,
          color: normalizeCurveColor(frame?.curve?.color, DEFAULT_CURVE_COLOR),
          modified: isModified
        }
      }

      // Pre-populate per-tracker curves using available tracker definitions
      const available = Array.isArray(availableTrackers.value) ? availableTrackers.value : []
      const defaultCurveSource = curves.default?.curve || cloneTimelineCurve(frame?.curve)
      available.forEach(tracker => {
        const key = tracker?.key
        if (!key || key === 'default' || curves[key]) return
        curves[key] = {
          curve: cloneTimelineCurve(defaultCurveSource),
          color: normalizeCurveColor(tracker?.color, DEFAULT_CURVE_COLOR),
          modified: false
        }
      })

      return {
        id,
        time: Number.isFinite(time) ? time : 0,
        frameLabel,
        timeLabel,
        curve: cloneTimelineCurve(frame?.curve),
        curves,
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
  
  const trackerKey = payload?.trackerKey || 'default'
  const curveColor = normalizeCurveColor(payload?.curveColor, DEFAULT_CURVE_COLOR)
  
  const updates = updatesSource
    .map(entry => {
      const keyframeId = Number(entry?.keyframeId ?? entry?.id)
      if (!Number.isFinite(keyframeId)) return null
      const curve = cloneTimelineCurve(entry?.curve)
      return { keyframeId, curve, trackerKey, curveColor }
    })
    .filter(Boolean)
  if (!updates.length) return
  
  try {
    pushHistory('curve')
    updates.forEach(({ keyframeId, curve, trackerKey, curveColor }) => {
      // 既存のmodifiedフラグを確認（一度trueになったらtrueのまま）
      const isCurveModified = 
        Math.abs(curve.in.x - DEFAULT_TIMELINE_CURVE.in.x) > 1e-4 ||
        Math.abs(curve.in.y - DEFAULT_TIMELINE_CURVE.in.y) > 1e-4 ||
        Math.abs(curve.out.x - DEFAULT_TIMELINE_CURVE.out.x) > 1e-4 ||
        Math.abs(curve.out.y - DEFAULT_TIMELINE_CURVE.out.y) > 1e-4
      
      // updateKeyframeに直接curvesとcurveを渡して更新
      timelineController.updateKeyframe(keyframeId, { 
        trackerKey,
        curve: cloneTimelineCurve(curve),
        curveColor
      })
      
      console.log(`[TimelineCurve] Updated curve for tracker ${trackerKey} on keyframe ${keyframeId}, modified: ${isCurveModified}`)
    })
    applyTimelinePoseImmediate()
    if (typeof syncTimelineRefs === 'function') syncTimelineRefs()
    markTimelineDirty('curve')
  } catch (error) {
    console.error('[TimelineCurve] Update failed:', error)
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
    // Sync audio to timeline position
    if (audioBuffer.value) {
      stopAudio()
    }
  } catch {}
}

function handleTimelinePlay() {
  try { 
    timelineController.play()
    // Play audio from current timeline position
    if (audioBuffer.value) {
      const currentTime = timelineController.currentTime.value || 0
      playAudio(currentTime)
    }
  } catch {}
}

function handleTimelinePause() {
  try { 
    timelineController.pause()
    // Pause audio
    pauseAudio()
  } catch {}
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
    notify('timelineLoadMissing', 'Timeline: Failed to load (input not found).', 4200)
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
      notify('timelineLoadFailed', 'Timeline: Failed to load.', 4800)
      return
    }
    ensureVirtualTrackers()
    try { timelineController.pause() } catch {}
    applyTimelinePoseImmediate()
    notifyWithVars('timelineFileLoaded', 'Timeline: Loaded {name}.', { name: file.name }, 3200)
    if (typeof syncTimelineRefs === 'function') syncTimelineRefs()
    markTimelineDirty('import')
    Promise.resolve(updateStorageEstimate()).catch(() => {})
  } catch {
    notify('timelineParseFailed', 'Timeline: Failed to parse JSON.', 5200)
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
    notify('timelineExported', 'Timeline: Exported.', 2600)
  } catch {
    notify('timelineExportFailed', 'Timeline: Export failed.', 4800)
  }
}

function handleTimelineClear() {
  if (!timelineController) return
  try {
    pushHistory('clear')
    timelineController.clearAll()
    timelineController.stop()
    timelineClipboard.value = null
    notify('timelineReset', 'Timeline: Reset.', 2600)
    if (typeof syncTimelineRefs === 'function') syncTimelineRefs()
    markTimelineDirty('clear')
    Promise.resolve(updateStorageEstimate()).catch(() => {})
  } catch {
    notify('timelineResetFailed', 'Timeline: Reset failed.', 4800)
  }
}

async function captureRenderImageToFile() {
  console.log('[CaptureImage] Starting image capture...')
  
  if (!renderer?.value || !scene.value || !renderCamera.value) {
    console.error('[CaptureImage] Missing required components:', {
      renderer: !!renderer?.value,
      scene: !!scene.value,
      camera: !!renderCamera.value
    })
    notify('imageExportNoRenderer', 'Image export: Renderer not initialized.', 3000)
    return
  }

  if (captureBusy.value) {
    console.warn('[CaptureImage] Capture already in progress')
    notify('imageExportInProgress', 'Image export: Processing…', 2000)
    return
  }
  
  captureBusy.value = true

  // 現在の背景色を保存
  const originalBackground = scene.value.background
  
  // バーチャルトラッカーの表示状態を保存
  const wasTrackersVisible = virtualTrackerDisplayVisible.value
  
  // グリッドの表示状態を保存
  const wasGridVisible = showGrid.value
  
  // バーチャルトラッカーとグリッドを即座に非表示にする
  if (wasTrackersVisible) {
    virtualTrackerDisplayVisible.value = false
  }
  if (wasGridVisible) {
    showGrid.value = false
  }
  
  // グリッドヘルパのを直接非表示にする（念のため）
  if (gridHelper.value) {
    gridHelper.value.visible = false
  }
  
  // すべてのグリッド、ヘルパー、トラッカーを探して非表示にする
  const hiddenObjects = []
  scene.value.traverse((obj) => {
    // グリッド、ヘルパー、トラッカー、ラベルなど、モデル以外のすべてを非表示
    if (obj.isGridHelper || 
        obj.isAxesHelper || 
        obj.isArrowHelper ||
        obj.isBoxHelper ||
        obj.isSkeletonHelper ||
        obj.userData?.isVirtualTracker || 
        obj.userData?.isTrackerLabel ||
        obj.name?.includes('VirtualTracker') ||
        obj.name?.includes('Grid') ||
        obj.name?.includes('FloorGrid') ||
        obj.name?.includes('Helper')) {
      if (obj.visible) {
        obj.visible = false
        hiddenObjects.push(obj)
        console.log('[CaptureImage] Hiding object:', obj.name || obj.type)
      }
    }
  })
  
  try {
    // 完全な緑背景（グリーンバック（に設定
    scene.value.background = new THREE.Color(0x00ff00)
    console.log('[CaptureImage] Background set to chroma key green (0x00ff00)')

    // 非表示が反映されるまで待機し、実際にレンダリングを実衁E
    // renderer.value で通常のレンダリングを行うことで、変更を確実に反映
    await new Promise(resolve => requestAnimationFrame(resolve))
    if (renderer.value && scene.value && renderCamera.value) {
      renderer.value.render(scene.value, renderCamera.value)
    }
    await new Promise(resolve => requestAnimationFrame(resolve))
    if (renderer.value && scene.value && renderCamera.value) {
      renderer.value.render(scene.value, renderCamera.value)
    }
    await new Promise(resolve => requestAnimationFrame(resolve))
    
    // オフスクリーンキャンバスを作のしてバックグラウンドでレンダリング
    const captureWidth = renderCameraWidth.value
    const captureHeight = renderCameraHeight.value
    console.log('[CaptureImage] Capture size:', captureWidth, 'x', captureHeight)
    
    // 一時的なレンダラーを作）�バックグラウンドの理）
    const offscreenCanvas = document.createElement('canvas')
    offscreenCanvas.width = captureWidth
    offscreenCanvas.height = captureHeight
    
    const offscreenRenderer = new THREE.WebGLRenderer({
      canvas: offscreenCanvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true
    })
    offscreenRenderer.setSize(captureWidth, captureHeight)
    offscreenRenderer.setClearColor(0x00ff00, 1.0)
    
    // レンダリング
    offscreenRenderer.render(scene.value, renderCamera.value)
    console.log('[CaptureImage] Rendered to offscreen canvas')
    
    // Blobに変換
    const blob = await new Promise((resolve) => {
      offscreenCanvas.toBlob(resolve, 'image/png')
    })
    
    // オフスクリーンレンダラーを破棁E
    offscreenRenderer.dispose()
    
    if (!blob) {
      throw new Error('Failed to create blob from canvas')
    }
    
    console.log('[CaptureImage] Blob created, size:', blob.size)
    
    // ファイル名を生の
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const suggestedName = `capture_${timestamp}.png`
    
    // File System Access APIを使ってファイル保存ダイアログを表示
    try {
      if (window.showSaveFilePicker) {
        console.log('[CaptureImage] Using File System Access API')
        const handle = await window.showSaveFilePicker({
          suggestedName,
          types: [
            {
              description: 'PNG画像',
              accept: { 'image/png': ['.png'] }
            }
          ]
        })
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
        console.log('[CaptureImage] File saved via File System Access API:', handle.name)
        showNotice(`画像書き出し ${handle.name || suggestedName}`, 3000)
      } else {
        console.log('[CaptureImage] Falling back to download link')
        // フォールバック: 従来のダウンロード方弁E
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = suggestedName
        link.href = url
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        console.log('[CaptureImage] File downloaded:', suggestedName)
        showNotice(`画像書き出し ${suggestedName}`, 3000)
      }
    } catch (saveError) {
      if (saveError.name === 'AbortError') {
        console.log('[CaptureImage] User cancelled save dialog')
        notify('imageExportCancelled', 'Image export: Cancelled.', 2000)
      } else {
        console.error('[CaptureImage] Save failed:', saveError)
        notify('imageExportSaveFailed', 'Image export: Failed to save.', 3000)
      }
    }
    
  } catch (error) {
    console.error('[CaptureImage] Capture failed:', error)
    notify('imageExportFailed', 'Image export: Failed.', 3000)
  } finally {
    // 元の背景色に戻す
    scene.value.background = originalBackground
    
    // 非表示にしたオブジェクトを元に戻す
    hiddenObjects.forEach(obj => {
      obj.visible = true
    })
    
    // グリッドヘルパのをのに戻す
    if (gridHelper.value && wasGridVisible) {
      gridHelper.value.visible = true
    }
    
    // トラッカーとグリッドをのに戻す
    if (wasTrackersVisible) {
      virtualTrackerDisplayVisible.value = true
    }
    if (wasGridVisible) {
      showGrid.value = true
    }
    
    captureBusy.value = false
    console.log('[CaptureImage] Capture completed, state restored')
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
    
    // Clear finger states and axis overrides
    for (const key of FINGER_STATE_KEYS) {
      fingerStates[key] = 0
    }
    for (const key in fingerAxisOverridesByModel) {
      delete fingerAxisOverridesByModel[key]
    }
    localStorage.removeItem(FINGER_STATES_STORAGE_KEY)
    localStorage.removeItem(FINGER_AXIS_OVERRIDES_STORAGE_KEY)
    console.log('[ClearCache] Cleared finger states and axis overrides from localStorage')
    
    timelineController.clearAll()
    timelineController.stop()
    // タイムラインのEnd＝3分（180秒、60FPS=10800フレーム）に初期設定
    if (timelineController) {
      timelineController.setRangeFromFrames(0, 10800) // 3分= 180私E* 60FPS
    }
    // Clear audio
    stopAudio()
    audioBuffer.value = null
    audioDuration.value = 0
    notify('cacheReset', 'Cache: Reset cache and timeline.', 3600)
    if (typeof syncTimelineRefs === 'function') syncTimelineRefs()
    markTimelineDirty('clear-cache')
    Promise.resolve(updateStorageEstimate()).catch(() => {})
  } catch {}
}

function openAudioFile() {
  const input = audioFileInput.value
  if (!input) return
  input.value = ''
  input.click()
}

async function onAudioFileChange(event) {
  const input = event?.target
  const file = input?.files?.[0]
  if (!file) return
  
  try {
    notify('audioLoading', 'Audio: Loading…', 2000)
    
    // Initialize AudioContext if needed
    if (!audioContext.value) {
      audioContext.value = new (window.AudioContext || window.webkitAudioContext)()
    }
    
    // Load audio file
    const arrayBuffer = await file.arrayBuffer()
    const decodedBuffer = await audioContext.value.decodeAudioData(arrayBuffer)
    
    audioBuffer.value = decodedBuffer
    audioDuration.value = decodedBuffer.duration
    audioFileName.value = file.name
    audioSampleRate.value = decodedBuffer.sampleRate
    audioChannels.value = decodedBuffer.numberOfChannels
    
    // 波形データを生成（デシベル）
    const channelData = decodedBuffer.getChannelData(0) // モノラルまたは左チャンネル
    const samples = 2000 // 2000サンプルに間引き
    const blockSize = Math.floor(channelData.length / samples)
    const waveform = []
    
    for (let i = 0; i < samples; i++) {
      const start = i * blockSize
      const end = start + blockSize
      let sum = 0
      
      for (let j = start; j < end && j < channelData.length; j++) {
        sum += channelData[j] * channelData[j]
      }
      
      const rms = Math.sqrt(sum / blockSize)
      // RMSをデシベルに変換 (-60dB to 0dB)
      const db = rms > 0 ? 20 * Math.log10(rms) : -60
      // -60dBから0dBまでに正規化
      const normalized = Math.max(0, Math.min(1, (db + 60) / 60))
      waveform.push(normalized)
    }
    
    audioWaveformData.value = waveform
    
    // Auto-adjust timeline end to match audio duration (60 FPS)
    if (timelineController && audioDuration.value > 0) {
      const endFrame = Math.ceil(audioDuration.value * 60) // 60 FPS
      timelineController.setRangeFromFrames(0, endFrame)
      if (typeof syncTimelineRefs === 'function') syncTimelineRefs()
      markTimelineDirty('audio-import')
    }
    
    showNotice(`オーディオ: ${file.name} を読み込みました （${audioDuration.value.toFixed(2)}秒）`, 3200)
  } catch (error) {
    console.error('Audio load failed:', error)
    notify('audioLoadFailed', 'Audio: Failed to load.', 4800)
  } finally {
    if (input) input.value = ''
  }
}

function removeAudio() {
  stopAudio()
  audioBuffer.value = null
  audioDuration.value = 0
  audioWaveformData.value = null
  audioFileName.value = ''
  audioSampleRate.value = 0
  audioChannels.value = 0
  notify('audioRemoved', 'Audio: Removed MP3.', 2600)
}

async function captureImage() {
  console.log('[CaptureImage] Starting image capture...')
  
  if (!renderer?.value || !scene.value || !renderCamera.value) {
    console.error('[CaptureImage] Missing required components:', {
      renderer: !!renderer?.value,
      scene: !!scene.value,
      camera: !!renderCamera.value
    })
    notify('imageExportNoRenderer', 'Image export: Renderer not initialized.', 3000)
    return
  }

  if (captureBusy.value) {
    console.warn('[CaptureImage] Capture already in progress')
    notify('imageExportInProgress', 'Image export: Processing…', 2000)
    return
  }

  captureBusy.value = true
  notify('imageExportPreparing', 'Image export: Preparing…', 1000)

  // 現在の背景色を保存
  const originalBackground = scene.value.background
  
  // バーチャルトラッカーの表示状態を保存
  const wasTrackersVisible = virtualTrackerDisplayVisible.value
  
  // グリッドの表示状態を保存
  const wasGridVisible = showGrid.value
  
  // すべてのグリッド、ヘルパー、トラッカーを探して非表示にする（画像書き出力中は完全に隠す）
  const hiddenObjects = []
  scene.value.traverse((obj) => {
    if (
      obj.isGridHelper ||
      obj.isAxesHelper ||
      obj.isArrowHelper ||
      obj.isBoxHelper ||
      obj.isSkeletonHelper ||
      obj.userData?.isVirtualTracker ||
      obj.userData?.isTrackerLabel ||
      obj.name?.includes('VirtualTracker') ||
      obj.name?.includes('Grid') ||
      obj.name?.includes('Helper')
    ) {
      if (obj.visible) {
        obj.visible = false
        hiddenObjects.push(obj)
      }
    }
  })
  // バーチャルトラッカーとグリッドのUIフラグもオフ
  if (wasTrackersVisible) virtualTrackerDisplayVisible.value = false
  if (wasGridVisible) showGrid.value = false
  
  try {
    // 完全な緑背景（グリーンバック（に設定
    scene.value.background = new THREE.Color(0x00ff00)
    console.log('[CaptureImage] Background set to chroma key green (0x00ff00)')

    // 非表示が反映されるまで征E�の
    await new Promise(resolve => requestAnimationFrame(resolve))
    
    // オフスクリーンキャンバスを作のしてバックグラウンドでレンダリング
    const captureWidth = renderCameraWidth.value
    const captureHeight = renderCameraHeight.value
    console.log('[CaptureImage] Capture size:', captureWidth, 'x', captureHeight)
    
    // 一時的なレンダラーを作）�バックグラウンドの理）
    const offscreenCanvas = document.createElement('canvas')
    offscreenCanvas.width = captureWidth
    offscreenCanvas.height = captureHeight
    
    const offscreenRenderer = new THREE.WebGLRenderer({
      canvas: offscreenCanvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true
    })
    offscreenRenderer.setSize(captureWidth, captureHeight)
    offscreenRenderer.setClearColor(0x00ff00, 1.0)
    
    // レンダリング
    offscreenRenderer.render(scene.value, renderCamera.value)
    console.log('[CaptureImage] Rendered to offscreen canvas')
    
    // Blobに変換
    const blob = await new Promise((resolve) => {
      offscreenCanvas.toBlob(resolve, 'image/png')
    })
    
    // オフスクリーンレンダラーを破棁E
    offscreenRenderer.dispose()
    
    if (!blob) {
      throw new Error('Failed to create blob from canvas')
    }
    
    console.log('[CaptureImage] Blob created, size:', blob.size)
    
    // ファイル名を生の
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const suggestedName = `capture_${timestamp}.png`
    
    // File System Access APIを使ってファイル保存ダイアログを表示
    try {
      if (window.showSaveFilePicker) {
        console.log('[CaptureImage] Using File System Access API')
        const handle = await window.showSaveFilePicker({
          suggestedName,
          types: [
            {
              description: 'PNG画像',
              accept: { 'image/png': ['.png'] }
            }
          ]
        })
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
        console.log('[CaptureImage] File saved via File System Access API:', handle.name)
        showNotice(`画像書き出し ${handle.name || suggestedName}`, 3000)
      } else {
        console.log('[CaptureImage] Falling back to download link')
        // フォールバック: 従来のダウンロード方弁E
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = suggestedName
        link.href = url
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        console.log('[CaptureImage] File downloaded:', suggestedName)
        showNotice(`画像書き出し ${suggestedName}`, 3000)
      }
    } catch (saveError) {
      if (saveError.name === 'AbortError') {
        console.log('[CaptureImage] User cancelled save dialog')
        notify('imageExportCancelled', 'Image export: Cancelled.', 2000)
      } else {
        console.error('[CaptureImage] Save failed:', saveError)
        notify('imageExportSaveFailed', 'Image export: Failed to save.', 3000)
      }
    }
    
  } catch (error) {
    console.error('[CaptureImage] Capture failed:', error)
    notify('imageExportFailed', 'Image export: Failed.', 3000)
  } finally {
    // 元の背景色に戻す
    scene.value.background = originalBackground
    
    // トラッカーとグリッドをのに戻す
    if (wasTrackersVisible) {
      virtualTrackerDisplayVisible.value = true
    }
    if (wasGridVisible) {
      showGrid.value = true
    }
    // 非表示にしたヘルパー/トラッカー等を元に戻す
    hiddenObjects.forEach(obj => { obj.visible = true })
    
    captureBusy.value = false
    console.log('[CaptureImage] Capture completed, state restored')
  }
}

async function captureVideo() {
  console.log('[CaptureVideo] Starting video capture...')
  
  if (!renderer?.value || !scene.value || !renderCamera.value) {
    console.error('[CaptureVideo] Missing required components:', {
      renderer: !!renderer?.value,
      scene: !!scene.value,
      camera: !!renderCamera.value
    })
    notify('videoExportNoRenderer', 'Video export: Renderer not initialized.', 3000)
    return
  }
  
  if (!timelineController || !timelineController.getKeyframes || timelineController.getKeyframes().length === 0) {
    console.warn('[CaptureVideo] No keyframes in timeline')
    notify('videoExportNoKeyframes', 'Video export: Timeline has no keyframes.', 3000)
    return
  }

  if (captureBusy.value) {
    console.warn('[CaptureVideo] Capture already in progress')
    notify('videoExportInProgress', 'Video export: Processing…', 2000)
    return
  }
  
  captureBusy.value = true
  
  // 状態を保存
  const originalBackground = scene.value.background
  const wasTrackersVisible = virtualTrackerDisplayVisible.value
  
  // すべてのグリッド、ヘルパー、トラッカーを探して非表示にする
  const hiddenObjects = []
  scene.value.traverse((obj) => {
    // グリッド、ヘルパー、トラッカー、ラベルなど、モデル以外のすべてを非表示
    if (obj.isGridHelper || 
        obj.isAxesHelper || 
        obj.isArrowHelper ||
        obj.isBoxHelper ||
        obj.isSkeletonHelper ||
        obj.userData?.isVirtualTracker || 
        obj.userData?.isTrackerLabel ||
        obj.name?.includes('VirtualTracker') ||
        obj.name?.includes('Grid') ||
        obj.name?.includes('Helper')) {
      if (obj.visible) {
        obj.visible = false
        hiddenObjects.push(obj)
        console.log('[CaptureVideo] Hiding object:', obj.name || obj.type)
      }
    }
  })
  
  const wasPlaying = timelineController.isPlaying()
  
  console.log('[CaptureVideo] Saving state:', {
    wasTrackersVisible,
    wasPlaying
  })
  
  // 状態復元��数
  const restoreVideoState = () => {
    console.log('[CaptureVideo] Restoring state')
    scene.value.background = originalBackground
    if (wasTrackersVisible) virtualTrackerDisplayVisible.value = true
    hiddenObjects.forEach(obj => {
      obj.visible = true
    })
    if (!wasPlaying) timelineController.stop()
    captureBusy.value = false
  }
  
  try {
    notify('videoExportPreparing', 'Video export: Preparing…', 2000)
    console.log('[CaptureVideo] Preparing frame-by-frame rendering')
    
    // 完全な緑背景（グリーンバック（に設定
    scene.value.background = new THREE.Color(0x00ff00)
    if (wasTrackersVisible) virtualTrackerDisplayVisible.value = false
    
    // 非表示が反映されるまで征E�の
    await new Promise(resolve => requestAnimationFrame(resolve))
    await new Promise(resolve => requestAnimationFrame(resolve))
    
    // タイムライン情報を取得
    const startTime = timelineController.getStartTime()
    const endTime = timelineController.getEndTime()
    const fps = 60 // 60 FPS
    const frameDuration = 1 / fps
    const totalFrames = Math.ceil((endTime - startTime) / frameDuration)
    
    console.log('[CaptureVideo] Timeline info:', {
      startTime,
      endTime,
      duration: endTime - startTime,
      fps,
      totalFrames
    })
    
    // オフスクリーンキャンバスでレンダリング
    const captureWidth = renderCameraWidth.value
    const captureHeight = renderCameraHeight.value
    
    const offscreenCanvas = document.createElement('canvas')
    offscreenCanvas.width = captureWidth
    offscreenCanvas.height = captureHeight
    
    const offscreenRenderer = new THREE.WebGLRenderer({
      canvas: offscreenCanvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true
    })
    offscreenRenderer.setSize(captureWidth, captureHeight)
    offscreenRenderer.setClearColor(0x00ff00, 1.0)
    
    // MediaRecorder を使用して動画をキャプチャ
    const stream = offscreenCanvas.captureStream(fps)
    
    // サポートされているMIMEタイプを確認
    let mimeType = 'video/webm;codecs=vp9'
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      console.warn('[CaptureVideo] VP9 not supported, trying VP8')
      mimeType = 'video/webm;codecs=vp8'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        console.warn('[CaptureVideo] VP8 not supported, using default')
        mimeType = 'video/webm'
      }
    }
    console.log('[CaptureVideo] Using MIME type:', mimeType)
    
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 8000000 // 8 Mbps
    })
    
    const chunks = []
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data)
      }
    }
    
    const recordingComplete = new Promise((resolve, reject) => {
      mediaRecorder.onstop = () => {
        console.log('[CaptureVideo] Recording stopped, total chunks:', chunks.length)
        resolve()
      }
      mediaRecorder.onerror = (e) => {
        console.error('[CaptureVideo] MediaRecorder error:', e)
        reject(e)
      }
    })
    
    // 録画開姁E
    mediaRecorder.start()
    console.log('[CaptureVideo] Recording started')
    
    // タイムラインを停止してフレームごとにレンダリング
    timelineController.stop()
    
    // 1フレームずつレンダリング
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      const currentTime = startTime + frameIndex * frameDuration
      
      // タイムラインを指定時刻に移動
      timelineController.jumpToTime(currentTime)
      
      // シーンを更新（トラッカー位置など）
      timelineController.applyCurrentPose?.()
      
      // レンダリング
      offscreenRenderer.render(scene.value, renderCamera.value)
      
      // 進捗表示）0%ごと）
      const progress = Math.floor((frameIndex / totalFrames) * 100)
      if (frameIndex % Math.floor(totalFrames / 10) === 0 || frameIndex === totalFrames - 1) {
        showNotice(`動画書き出し ${progress}% (${frameIndex + 1}/${totalFrames} フレーム)`, 1000)
        console.log(`[CaptureVideo] Progress: ${progress}% (frame ${frameIndex + 1}/${totalFrames})`)
      }
      
      // フレーム間の待機）ediaRecorderが追いつくように）
      await new Promise(resolve => setTimeout(resolve, 1000 / fps))
    }
    
    // 録画停止
    mediaRecorder.stop()
    console.log('[CaptureVideo] All frames rendered, stopping recording')
    notify('videoExportSaving', 'Video export: Recording finished, saving…', 2000)
    
    // 録画完了、待機
    await recordingComplete
    
    // オフスクリーンレンダラーを破棁E
    offscreenRenderer.dispose()
    
    // Blobを作の
    const blob = new Blob(chunks, { type: mimeType })
    console.log('[CaptureVideo] Blob created, size:', blob.size)
    
    // ファイル保存
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const suggestedName = `video_${timestamp}.webm`
      
      if (window.showSaveFilePicker) {
        console.log('[CaptureVideo] Using File System Access API')
        const handle = await window.showSaveFilePicker({
          suggestedName,
          types: [
            {
              description: 'WebM動画',
              accept: { 'video/webm': ['.webm'] }
            }
          ]
        })
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
        console.log('[CaptureVideo] File saved via File System Access API:', handle.name)
        notifyWithVars('videoExportSaved', 'Video export: Saved as {name}.', { name: handle.name || suggestedName }, 3000)
      } else {
        console.log('[CaptureVideo] Falling back to download link')
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = suggestedName
        link.href = url
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        console.log('[CaptureVideo] File downloaded:', suggestedName)
        notifyWithVars('videoExportSaved', 'Video export: Saved as {name}.', { name: suggestedName }, 3000)
      }
    } catch (saveError) {
      if (saveError.name === 'AbortError') {
        console.log('[CaptureVideo] User cancelled save dialog')
        notify('videoExportCancelled', 'Video export: Cancelled.', 2000)
      } else {
        console.error('[CaptureVideo] Save failed:', saveError)
        notify('videoExportSaveFailed', 'Video export: Failed to save.', 3000)
      }
    }
    
    // 元の状態に戻す
    restoreVideoState()
    
  } catch (error) {
    console.error('[CaptureVideo] Capture failed:', error)
    notify('videoExportFailed', 'Video export: Failed.', 3000)
    restoreVideoState()
  }
}

function playAudio(startTime = 0) {
  if (!audioContext.value || !audioBuffer.value) return
  
  stopAudio()
  
  try {
    audioSource.value = audioContext.value.createBufferSource()
    audioSource.value.buffer = audioBuffer.value
    audioSource.value.connect(audioContext.value.destination)
    audioSource.value.start(0, startTime)
    audioStartTime.value = audioContext.value.currentTime - startTime
    audioPlaying.value = true
  } catch (error) {
    console.error('Audio playback failed:', error)
  }
}

function stopAudio() {
  if (audioSource.value) {
    try {
      audioSource.value.stop()
      audioSource.value.disconnect()
    } catch {}
    audioSource.value = null
  }
  audioPlaying.value = false
}

function pauseAudio() {
  stopAudio()
}

function handleError(e) {
  const fallback = notificationsTexts.value.errorUnknown || 'Unknown error occurred.'
  const msg = e?.error?.message || e?.message || fallback
  notifyWithVars('errorRaised', 'Error: {message}', { message: msg }, 5200)
}

function handleUnhandledRejection(e) {
  const fallback = notificationsTexts.value.unhandledRejection || 'Unhandled promise rejection.'
  const msg = e?.reason?.message || e?.reason || fallback
  notifyWithVars('errorRaised', 'Error: {message}', { message: msg }, 5200)
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

watch(models, (newModels, oldModels) => {
  const newCount = Array.isArray(newModels) ? newModels.length : 0
  const oldCount = Array.isArray(oldModels) ? oldModels.length : 0
  
  // モデルが追加された場合、トラッカーが有効なら自動で再構築
  if (virtualTrackersEnabled.value && newCount > oldCount) {
    console.log(`[ThreeViewer] Models increased from ${oldCount} to ${newCount}, rebuilding trackers`)
    try { 
      trackerController.rebuild?.() 
      applyTimelinePoseImmediate()
    } catch (err) {
      console.error('[ThreeViewer] Failed to rebuild trackers:', err)
    }
  } else if (virtualTrackersEnabled.value && newCount !== oldCount) {
    // モデル数が変化した場合は再構築
    try { trackerController.rebuild?.() } catch {}
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
        notify('cachePersistenceEnabled', 'Cache: Persistence enabled.', 3600)
        storagePersistToastState = 'granted'
        try { sessionStorage.setItem(STORAGE_PERSIST_TOAST_KEY, 'granted') } catch {}
      }
    } else if (storagePersistToastState !== 'denied') {
      notify('cachePersistenceFailed', 'Cache: Persistence unavailable. Please check browser storage settings.', 5600)
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

  notify('uiLayoutLoaded', 'UI: Loaded Blender-style layout.', 2400)
  logToServer({ event: 'init' })
  animate(0)
})

// If models list becomes non-empty later, auto-enable virtual trackers so they appear
function captureOutlineDefaults(material) {
  if (!material || outlineDefaultsCache.has(material)) return
  if (!(material.isMToonMaterial || material.type === 'MToonMaterial')) return
  let width = 0.002
  try {
    if (typeof material.outlineWidthFactor === 'number') {
      width = material.outlineWidthFactor
    } else if (material.uniforms?.outlineWidthFactor?.value != null) {
      width = material.uniforms.outlineWidthFactor.value
    }
  } catch {}
  width = Math.min(0.005, Math.max(0, Number(width) || 0.002))

  let colorHex = '#000000'
  try {
    let baseColor = null
    if (material.outlineColorFactor?.isColor) {
      baseColor = material.outlineColorFactor
    } else if (material.uniforms?.outlineColorFactor?.value) {
      baseColor = material.uniforms.outlineColorFactor.value
    }
    if (baseColor) {
      const tempColor = baseColor.isColor
        ? baseColor.clone()
        : new THREE.Color(baseColor.r ?? baseColor.x ?? 0, baseColor.g ?? baseColor.y ?? 0, baseColor.b ?? baseColor.z ?? 0)
      colorHex = `#${tempColor.getHexString()}`
    }
  } catch {}

  outlineDefaultsCache.set(material, { width, color: colorHex })
}

function applyOutlineToMaterial(material, width, colorHex) {
  if (!material || !(material.isMToonMaterial || material.type === 'MToonMaterial')) return
  const clampedWidth = Math.min(0.005, Math.max(0, Number(width) || 0.002))
  const color = new THREE.Color(colorHex || '#000000')
  try {
    if (typeof material.outlineWidthFactor === 'number') {
      material.outlineWidthFactor = clampedWidth
    } else if (material.uniforms?.outlineWidthFactor) {
      material.uniforms.outlineWidthFactor.value = clampedWidth
    }
  } catch {}
  try {
    if (material.outlineColorFactor?.isColor) {
      material.outlineColorFactor.copy(color)
    } else if (material.uniforms?.outlineColorFactor?.value) {
      const target = material.uniforms.outlineColorFactor.value
      if (target.isColor) {
        target.copy(color)
      } else if (Array.isArray(target)) {
        material.uniforms.outlineColorFactor.value = [color.r, color.g, color.b]
      } else if (typeof target === 'object' && target) {
        target.r = color.r
        target.g = color.g
        target.b = color.b
      } else {
        material.uniforms.outlineColorFactor.value = color.clone()
      }
    }
  } catch {}
  material.uniformsNeedUpdate = true
  material.needsUpdate = true
}

function resetOutlineToDefaults(modelIndex = null) {
  let fallbackWidth = 0.002
  let fallbackColor = '#000000'
  
  const modelsToReset = modelIndex !== null && Number.isFinite(modelIndex)
    ? [models.value[modelIndex]].filter(Boolean)
    : models.value || []
  
  try {
    modelsToReset.forEach(model => {
      let firstWidth = null
      let firstColor = null
      
      model?.vrm?.scene?.traverse(obj => {
        if (!obj.isMesh || !obj.material) return
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
        materials.forEach(mat => {
          if (!(mat.isMToonMaterial || mat.type === 'MToonMaterial')) return
          captureOutlineDefaults(mat)
          const defaults = outlineDefaultsCache.get(mat) || {}
          applyOutlineToMaterial(mat, defaults.width ?? fallbackWidth, defaults.color ?? fallbackColor)
          if (firstWidth == null && Number.isFinite(defaults.width)) firstWidth = defaults.width
          if (!firstColor && typeof defaults.color === 'string') firstColor = defaults.color
        })
      })
      
      // モデルごとのデフォルト値を保存
      const modelDefaults = {
        width: Number.isFinite(firstWidth) ? Math.min(0.005, Math.max(0, firstWidth)) : fallbackWidth,
        color: firstColor || fallbackColor
      }
      modelDefaultsCache.set(model, modelDefaults)
      
      // 現在のモデルインデックスと一致する場合、UI表示を更新
      if (modelIndex !== null && modelIndex === currentOutlineModelIndex.value) {
        outlineWidth.value = modelDefaults.width
        outlineColor.value = modelDefaults.color
        outlineDefaultWidth.value = modelDefaults.width
        outlineDefaultColor.value = modelDefaults.color
      }
    })
  } catch {}
  
  updateOutlineSettings()
  scheduleDisplaySettingsSave()
}

watch(models, (arr) => {
  try {
    const hasModel = Array.isArray(arr) && arr.some(m => !!m?.vrm)
    if (hasModel && !virtualTrackersEnabled.value) ensureVirtualTrackers()
    // Whenever models appear or change, rebuild trackers to place camera in front of the model
    if (hasModel) {
      let shouldAutoResetOutline = false
      for (let i = 0; i < arr.length; i++) {
        const model = arr[i]
        if (model?.vrm && !outlineAutoResetModels.has(model)) {
          outlineAutoResetModels.add(model)
          // モデルごとにデフォルト値をキャプチャして保存
          resetOutlineToDefaults(i)
          shouldAutoResetOutline = true
        }
      }
      // 初回モデル読み込み時の最初のモデルの設定をUIに反映
      if (shouldAutoResetOutline && arr.length > 0) {
        const firstModel = arr[0]
        const defaults = modelDefaultsCache.get(firstModel)
        if (defaults) {
          outlineWidth.value = defaults.width
          outlineColor.value = defaults.color
          outlineDefaultWidth.value = defaults.width
          outlineDefaultColor.value = defaults.color
        }
      }
      try { trackerController.rebuild?.() } catch {}
      // Frame avatar front unless overridden by timeline camera track
      try { frameRenderCameraToAvatarFront({ respectTimeline: true }) } catch {}
      // カメラモードの場合、viewCameraもrenderCameraと同じ位置に設定
      if (isCameraMode.value && renderCamera.value && viewCamera.value) {
        try {
          viewCamera.value.position.copy(renderCamera.value.position)
          viewCamera.value.rotation.copy(renderCamera.value.rotation)
          viewCamera.value.updateMatrixWorld(true)
          if (orbitControls.value) {
            orbitControls.value.target.copy(cameraTarget)
            orbitControls.value.update()
          }
        } catch {}
      }
      // 初期アウトライン値をVRMマテリアルから取得（ユーザーがまだ変更していない場合のみ）
      try { initOutlineWidthFromModel() } catch {}
    }
    // アウトライン設定を適用
    updateOutlineSettings()
  } catch {}
})

// アウトライン設定の変更を監視
watch([outlineWidth, outlineColor], () => {
  updateOutlineSettings()
  scheduleDisplaySettingsSave()
})

function handleResetOutlineDefaults(modelIndex = 0) {
  resetOutlineToDefaults(modelIndex)
}

function handleLoadModelOutline(modelIndex) {
  // モデル選択時に、そのモデルのアウトライン設定を読み込む
  if (!Array.isArray(models.value) || models.value.length === 0) return
  const targetModel = models.value[modelIndex]
  if (!targetModel) return

  // 現在選択されているモデルインデックスを更新
  currentOutlineModelIndex.value = modelIndex

  // まずモデルごとのデフォルト値を確認
  const modelDefaults = modelDefaultsCache.get(targetModel)
  if (modelDefaults) {
    // デフォルト値をUIのデフォルトに設定
    outlineDefaultWidth.value = modelDefaults.width
    outlineDefaultColor.value = modelDefaults.color
  }

  // WeakMapからモデル固有の設定を取得（ユーザーが変更した値）
  const cached = modelOutlineCache.get(targetModel)
  if (cached) {
    outlineWidth.value = cached.width
    outlineColor.value = cached.color
  } else {
    // キャッシュがない場合の、デフォルト値を使用
    if (modelDefaults) {
      outlineWidth.value = modelDefaults.width
      outlineColor.value = modelDefaults.color
    } else {
      // デフォルト値もない場合の、モデルから最初のマテリアルの設定を読み取る
      let foundWidth = null
      let foundColor = null
      
      try {
        targetModel?.vrm?.scene?.traverse(obj => {
          if (foundWidth !== null) return
          if (!obj.isMesh || !obj.material) return
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
          for (const mat of materials) {
            if (!(mat.isMToonMaterial || mat.type === 'MToonMaterial')) continue
            
            captureOutlineDefaults(mat)
            const defaults = outlineDefaultsCache.get(mat)
            if (defaults) {
              foundWidth = defaults.width
              foundColor = defaults.color
              break
            }
          }
        })
      } catch {}
      
      const width = foundWidth !== null ? Math.min(0.005, Math.max(0, foundWidth)) : 0.002
      const color = foundColor || '#000000'
      
      outlineWidth.value = width
      outlineColor.value = color
      outlineDefaultWidth.value = width
      outlineDefaultColor.value = color
      
      // デフォルト値として保存
      modelDefaultsCache.set(targetModel, { width, color })
    }
  }
}

function updateOutlineSettingsForModel(model, width, colorHex) {
  if (!model?.vrm?.scene) return
  
  try {
    // モデルごとに現在の設定をキャッシュ
    modelOutlineCache.set(model, { width, color: colorHex })
    
    model.vrm.scene.traverse(obj => {
      if (!obj.isMesh || !obj.material) return
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
      materials.forEach(mat => {
        if (!(mat.isMToonMaterial || mat.type === 'MToonMaterial')) return
        captureOutlineDefaults(mat)
        applyOutlineToMaterial(mat, width, colorHex)
      })
    })
  } catch {}
}


function updateOutlineSettings() {
  try {
    const width = outlineWidth.value
    const colorHex = outlineColor.value
    // 現在選択されているモデルのみ更新
    // DisplaySectionで選択されているモデルインデックスを取得する必要がある
    // ここでは全モデルではなく、選択されたモデルのみを更新するように修正
    const selectedModelIndex = currentOutlineModelIndex.value || 0
    const targetModel = models.value[selectedModelIndex]
    if (targetModel) {
      updateOutlineSettingsForModel(targetModel, width, colorHex)
    }
  } catch {}
}

// VRMの最初のMToonマテリアルからoutlineWidthFactor/outlineColorFactorを取得し初期値に反映
// すでにユーザーが値を動かしている(= default 0.002 以外or persisted でロードされた場合の上書きしない
const outlineInitializedFromModel = new WeakSet()
function initOutlineWidthFromModel() {
  // 許容誤差内なら初期デフォルトなら取得を試みる
  const current = Number(outlineWidth.value)
  if (Math.abs(current - 0.002) > 1e-6) {
    return
  }
  for (const model of models.value) {
    if (outlineInitializedFromModel.has(model)) continue
    
    try {
      let foundWidth = null
      let foundColor = null
      
      model?.vrm?.scene?.traverse(obj => {
        if (foundWidth !== null) return
        if (obj.isMesh && obj.material) {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
          for (const mat of materials) {
            if ((mat.isMToonMaterial || mat.type === 'MToonMaterial')) {
              let ow = null
              try {
                if (typeof mat.outlineWidthFactor === 'number') ow = mat.outlineWidthFactor
                else if (mat.uniforms?.outlineWidthFactor) ow = mat.uniforms.outlineWidthFactor.value
              } catch {}
              if (typeof ow === 'number' && isFinite(ow)) {
                foundWidth = Math.min(0.005, Math.max(0, ow))
              }
              
              // カラーも取征E
              let c = null
              try {
                if (mat.outlineColorFactor) c = mat.outlineColorFactor
                else if (mat.uniforms?.outlineColorFactor) c = mat.uniforms.outlineColorFactor.value
              } catch {}
              if (c && typeof c.r === 'number') {
                const hex = new THREE.Color(c.r, c.g, c.b).getHexString()
                foundColor = '#' + hex
              }
              
              if (foundWidth !== null) break
            }
          }
        }
      })
      
      if (foundWidth !== null) {
        outlineWidth.value = foundWidth
        outlineDefaultWidth.value = foundWidth
        if (foundColor) {
          outlineColor.value = foundColor
          outlineDefaultColor.value = foundColor
        }
        outlineInitializedFromModel.add(model)
        break
      }
    } catch {}
  }
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
    var(--surface-strong, rgba(24, 26, 32, 0.95));
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
  box-shadow: none;
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
  box-shadow: none;
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
  appearance: none;
  padding: 0.35rem 1.75rem 0.35rem 0.6rem;
  border-radius: 6px;
  border: 1px solid rgba(140, 168, 235, 0.35);
  background: var(--control-surface, rgba(48, 54, 70, 0.9));
  color: rgba(240, 244, 255, 0.9);
  font-size: 0.8rem;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
  background-image: linear-gradient(45deg, transparent 50%, rgba(140, 168, 235, 0.9) 50%),
    linear-gradient(135deg, rgba(140, 168, 235, 0.9) 50%, transparent 50%);
  background-position: calc(100% - 14px) calc(50% - 2px), calc(100% - 10px) calc(50% - 2px);
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
}

.tracker-adjust__section--order select:hover,
.tracker-adjust__section--order select:focus {
  outline: none;
  border-color: rgba(140, 168, 235, 0.65);
  background-color: var(--control-surface-hover, rgba(58, 64, 81, 0.95));
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
  box-shadow: none;
  font-size: 0.8rem;
  color: rgba(226, 230, 245, 0.9);
  backdrop-filter: blur(6px);
}

.mode-switch span {
  font-weight: 600;
}

.mode-switch select {
  appearance: none;
  border: 1px solid rgba(140, 168, 235, 0.35);
  border-radius: 14px;
  padding: 0.35rem 2rem 0.35rem 0.8rem;
  background: var(--control-surface, rgba(48, 54, 70, 0.9));
  color: rgba(240, 244, 255, 0.9);
  font-size: 0.82rem;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
  background-image: linear-gradient(45deg, transparent 50%, rgba(140, 168, 235, 0.9) 50%),
    linear-gradient(135deg, rgba(140, 168, 235, 0.9) 50%, transparent 50%);
  background-position: calc(100% - 14px) calc(50% - 2px), calc(100% - 10px) calc(50% - 2px);
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
}

.mode-switch select:hover,
.mode-switch select:focus {
  outline: none;
  border-color: rgba(140, 168, 235, 0.65);
  background-color: var(--control-surface-hover, rgba(58, 64, 81, 0.95));
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
  box-shadow: none;
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
  box-shadow: none;
  backdrop-filter: blur(6px);
}

.yaw-ring {
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.28);
  background: radial-gradient(circle, rgba(226, 235, 255, 0.08) 0%, rgba(8, 11, 18, 0.78) 68%);
  box-shadow: none;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  user-select: none;
}

.yaw-ring.is-active {
  border-color: rgba(124, 171, 255, 0.9);
  box-shadow: none;
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
  box-shadow: none;
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
  box-shadow: none;
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

