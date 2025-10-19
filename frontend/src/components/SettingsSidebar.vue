<template>
  <aside class="properties-panel">
    <div class="properties-body">
      <nav class="tab-strip" role="tablist" :aria-label="aria.settingsTabs || 'Settings tabs'">
        <button
          v-for="tab in displayTabs"
          :key="tab.id"
          type="button"
          class="tab-button"
          :class="{ active: tab.id === activeTab }"
          :aria-selected="tab.id === activeTab"
          :aria-controls="`settings-pane-${tab.id}`"
          role="tab"
          @click="activeTab = tab.id"
          :title="tooltip(`${tab.label} - ${tab.description}`)"
        >
          <Icon :icon="tab.icon" class="tab-icon" aria-hidden="true" />
          <span class="tab-label">{{ tab.label }}</span>
        </button>
      </nav>
      <div class="properties-scroll" :id="`settings-pane-${activeTab}`" role="tabpanel">
        <SectionVisibility
          :active="activeTab"
          :ambient="ambient"
          :directional="directional"
          :mesh="mesh"
          :models="models"
          :look-at-enabled="lookAtEnabled"
          :show-grid="showGrid"
          :show-light-marker="showLightMarker"
          :marker-color="markerColor"
          :directional-intensity="directionalIntensity"
          :show-extended-bones="showExtendedBones"
          :show-collider-nodes="showColliderNodes"
          :show-non-deforming-bones="showNonDeformingBones"
          :highlight-constraint="highlightConstraint"
          :show-physical-bones="showPhysicalBones"
          :show-other-bones="showOtherBones"
          :bone-dot-size="boneDotSize"
          :bone-label-scale="boneLabelScale"
          :outline-width="outlineWidth"
          :outline-color="outlineColor"
          :virtual-trackers-enabled="virtualTrackersEnabled"
          :virtual-tracker-display-visible="virtualTrackerDisplayVisible"
          :show-virtual-tracker-labels="showVirtualTrackerLabels"
          :virtual-tracker-size="virtualTrackerSize"
          :virtual-tracker-label-scale="virtualTrackerLabelScale"
          :forearm-twist-share="forearmTwistShare"
          :has-models-loaded="hasModelsLoaded"
          :selected-tracker-key="selectedTrackerKey"
          :selected-tracker-label="selectedTrackerLabel"
          :tracker-position="trackerPosition"
          :tracker-rotation="trackerRotation"
          :tracker-rotation-order="trackerRotationOrder"
          :tracker-rotation-orders="trackerRotationOrders"
          :show-tracker-axes="showTrackerAxes"
          :tracker-axes-length="trackerAxesLength"
          :finger-states="fingerStates"
          :finger-axis-overrides="fingerAxisOverrides"
          :camera-fov="cameraFov"
          :camera-near="cameraNear"
          :camera-far="cameraFar"
          :camera-resolution-width="cameraResolutionWidth"
          :camera-resolution-height="cameraResolutionHeight"
          :show-camera-helper="showCameraHelper"
          :camera-wheel-sensitivity="cameraWheelSensitivity"
          :camera-translate-sensitivity="cameraTranslateSensitivity"
          :camera-rotate-sensitivity="cameraRotateSensitivity"
          :capture-busy="captureBusy"
          :timeline-selection="timelineSelection"
          :timeline-snap="timelineSnap"
          :timeline-loop="timelineLoop"
          :available-trackers="availableTrackers"
          :audio-duration="audioDuration"
          :audio-buffer="audioBuffer"
          @update:showGrid="v => emit('update:showGrid', v)"
          @update:showLightMarker="v => emit('update:showLightMarker', v)"
          @update:markerColor="v => emit('update:markerColor', v)"
          @update:directionalIntensity="v => emit('update:directionalIntensity', v)"
          @update:lookAtEnabled="v => emit('update:lookAtEnabled', v)"
          @toggle-model="(i, v) => emit('toggle-model', i, v)"
          @remove-model="i => emit('remove-model', i)"
          @update:showExtendedBones="v => emit('update:showExtendedBones', v)"
          @update:showColliderNodes="v => emit('update:showColliderNodes', v)"
          @update:showNonDeformingBones="v => emit('update:showNonDeformingBones', v)"
          @update:highlightConstraint="v => emit('update:highlightConstraint', v)"
          @update:showPhysicalBones="v => emit('update:showPhysicalBones', v)"
          @update:showOtherBones="v => emit('update:showOtherBones', v)"
          @update:boneDotSize="v => emit('update:boneDotSize', v)"
          @update:boneLabelScale="v => emit('update:boneLabelScale', v)"
          @update:outlineWidth="v => emit('update:outlineWidth', v)"
          @update:outlineColor="v => emit('update:outlineColor', v)"
          @update:virtualTrackersEnabled="v => emit('update:virtualTrackersEnabled', v)"
          @update:virtualTrackerDisplayVisible="v => emit('update:virtualTrackerDisplayVisible', v)"
          @update:showVirtualTrackerLabels="v => emit('update:showVirtualTrackerLabels', v)"
          @update:virtualTrackerSize="v => emit('update:virtualTrackerSize', v)"
          @update:virtualTrackerLabelScale="v => emit('update:virtualTrackerLabelScale', v)"
          @update:showTrackerAxes="v => emit('update:showTrackerAxes', v)"
          @update:trackerAxesLength="v => emit('update:trackerAxesLength', v)"
          @update:forearm-twist-share="v => emit('update:forearmTwistShare', v)"
          @update:tracker-position="v => emit('update:tracker-position', v)"
          @update:tracker-rotation="v => emit('update:tracker-rotation', v)"
          @update:tracker-rotation-order="v => emit('update:tracker-rotation-order', v)"
          @reset-tracker-position="() => emit('reset-tracker-position')"
          @reset-tracker-rotation="() => emit('reset-tracker-rotation')"
          @update:cameraFov="v => emit('update:cameraFov', v)"
          @update:cameraNear="v => emit('update:cameraNear', v)"
          @update:cameraFar="v => emit('update:cameraFar', v)"
          @update:cameraResolutionWidth="v => emit('update:cameraResolutionWidth', v)"
          @update:cameraResolutionHeight="v => emit('update:cameraResolutionHeight', v)"
          @update:showCameraHelper="v => emit('update:showCameraHelper', v)"
          @update:cameraWheelSensitivity="v => emit('update:cameraWheelSensitivity', v)"
          @update:cameraTranslateSensitivity="v => emit('update:cameraTranslateSensitivity', v)"
          @update:cameraRotateSensitivity="v => emit('update:cameraRotateSensitivity', v)"
          @capture-camera="() => emit('capture-render')"
          @update:timelineSnap="v => emit('update-timeline-snap', v)"
          @update:timelineLoop="v => emit('update-timeline-loop', v)"
          @remove-selected-keyframes="() => emit('remove-selected-keyframes')"
          @update-keyframe-curves="payload => emit('update-keyframe-curves', payload)"
          @toggle-bone="(...args) => emit('toggle-bone', ...args)"
          @toggle-bone-names="(...args) => emit('toggle-bone-names', ...args)"
          @toggle-all-bones="(...args) => emit('toggle-all-bones', ...args)"
          @toggle-all-bone-names="(...args) => emit('toggle-all-bone-names', ...args)"
          @reset-virtual-trackers="() => emit('reset-virtual-trackers')"
          @reset-all-tracker-orientations="() => emit('reset-all-tracker-orientations')"
          @reset-outline="(i) => emit('reset-outline', i)"
          @load-model-outline="(i) => emit('load-model-outline', i)"
          @update:fingerStates="v => emit('update:fingerStates', v)"
          @update:fingerAxisOverrides="v => emit('update:fingerAxisOverrides', v)"
          @remove-audio="() => emit('remove-audio')"
        />
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, toRefs, computed } from 'vue'
import { Icon } from '@iconify/vue'
import SectionVisibility from './SectionVisibility.vue'
import { SECTION_TABS } from './settingsTabs.js'
import { useCaptions } from '../composables/useCaptions.js'
import { useI18n } from '../locales/index.js'

const props = defineProps({
  ambient: Object,
  directional: Object,
  mesh: Object,
  models: { type: Array, required: true },
  lookAtEnabled: { type: Boolean, default: true },
  showGrid: { type: Boolean, default: true },
  showLightMarker: { type: Boolean, required: true },
  markerColor: { type: String, required: true },
  directionalIntensity: { type: Number, required: true },
  showExtendedBones: { type: Boolean, required: true },
  showColliderNodes: { type: Boolean, required: true },
  showNonDeformingBones: { type: Boolean, required: true },
  highlightConstraint: { type: Boolean, required: true },
  showPhysicalBones: { type: Boolean, required: true },
  showOtherBones: { type: Boolean, required: true },
  boneDotSize: { type: Number, required: true },
  boneLabelScale: { type: Number, required: true },
  outlineWidth: { type: Number, default: 0.002 },
  outlineColor: { type: String, default: '#000000' },
  virtualTrackersEnabled: { type: Boolean, default: false },
  virtualTrackerDisplayVisible: { type: Boolean, default: true },
  showVirtualTrackerLabels: { type: Boolean, default: true },
  virtualTrackerSize: { type: Number, default: 0.08 },
  virtualTrackerLabelScale: { type: Number, default: 1.0 },
  forearmTwistShare: { type: Number, default: 0.7 },
  hasModelsLoaded: { type: Boolean, default: false },
  selectedTrackerKey: { type: String, default: null },
  selectedTrackerLabel: { type: String, default: '' },
  trackerPosition: { type: Object, default: () => ({ x: 0, y: 0, z: 0 }) },
  trackerRotation: { type: Object, default: () => ({ x: 0, y: 0, z: 0 }) },
  trackerRotationOrder: { type: String, default: 'YXZ' },
  trackerRotationOrders: { type: Array, default: () => [] },
  showTrackerAxes: { type: Boolean, default: false },
  trackerAxesLength: { type: Number, default: 0.05 },
  fingerStates: { type: Object, default: () => ({}) },
  fingerAxisOverrides: { type: Object, default: () => ({}) },
  cameraFov: { type: Number, required: true },
  cameraNear: { type: Number, required: true },
  cameraFar: { type: Number, required: true },
  cameraResolutionWidth: { type: Number, required: true },
  cameraResolutionHeight: { type: Number, required: true },
  showCameraHelper: { type: Boolean, default: false },
  cameraWheelSensitivity: { type: Number, default: 1.0 },
  cameraTranslateSensitivity: { type: Number, default: 1.0 },
  cameraRotateSensitivity: { type: Number, default: 1.0 },
  captureBusy: { type: Boolean, default: false },
  timelineSelection: { type: Object, default: () => ({}) },
  timelineSnap: { type: Boolean, default: true },
  timelineLoop: { type: Boolean, default: false },
  availableTrackers: { type: Array, default: () => [] },
  audioDuration: { type: Number, default: 0 },
  audioBuffer: { type: Object, default: null }
})

const emit = defineEmits([
  'update:showGrid',
  'update:showLightMarker',
  'update:markerColor',
  'update:directionalIntensity',
  'update:lookAtEnabled',
  'toggle-model',
  'remove-model',
  'update:showExtendedBones',
  'update:showColliderNodes',
  'update:showNonDeformingBones',
  'update:highlightConstraint',
  'update:showPhysicalBones',
  'update:showOtherBones',
  'update:boneDotSize',
  'update:boneLabelScale',
  'update:outlineWidth',
  'update:outlineColor',
  'update:virtualTrackersEnabled',
  'update:virtualTrackerDisplayVisible',
  'update:showVirtualTrackerLabels',
  'update:virtualTrackerSize',
  'update:virtualTrackerLabelScale',
  'update:forearmTwistShare',
  'update:showTrackerAxes',
  'update:trackerAxesLength',
  'update:fingerStates',
  'update:fingerAxisOverrides',
  'update:tracker-position',
  'update:tracker-rotation',
  'update:tracker-rotation-order',
  'reset-tracker-position',
  'reset-tracker-rotation',
  'update:cameraFov',
  'update:cameraNear',
  'update:cameraFar',
  'update:cameraResolutionWidth',
  'update:cameraResolutionHeight',
  'update:showCameraHelper',
  'update:cameraWheelSensitivity',
  'update:cameraTranslateSensitivity',
  'update:cameraRotateSensitivity',
  'capture-render',
  'toggle-bone',
  'toggle-bone-names',
  'toggle-all-bones',
  'toggle-all-bone-names',
  'reset-virtual-trackers',
  'reset-all-tracker-orientations',
  'reset-outline',
  'load-model-outline',
  'update-timeline-snap',
  'update-timeline-loop',
  'remove-selected-keyframes',
  'update-keyframe-curves',
  'remove-audio'
])

const { t } = useI18n()
const { tooltip } = useCaptions()
const aria = computed(() => t.value?.aria ?? {})

const getNested = (source, path) => {
  if (!source || typeof path !== 'string') return null
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : null), source)
}

const displayTabs = computed(() => {
  const locale = t.value || {}
  return SECTION_TABS.map(tab => ({
    ...tab,
    label: getNested(locale, tab.labelKey) || tab.labelKey,
    description: getNested(locale, tab.descriptionKey) || tab.descriptionKey
  }))
})

const activeTab = ref(SECTION_TABS[0]?.id ?? 'lighting')

const {
  ambient,
  directional,
  mesh,
  models,
  showLightMarker,
  markerColor,
  directionalIntensity,
  showExtendedBones,
  showColliderNodes,
  showNonDeformingBones,
  highlightConstraint,
  showPhysicalBones,
  showOtherBones,
  boneDotSize,
  boneLabelScale,
  virtualTrackersEnabled,
  virtualTrackerDisplayVisible,
  showVirtualTrackerLabels,
  virtualTrackerSize,
  virtualTrackerLabelScale,
  forearmTwistShare,
  cameraFov,
  cameraNear,
  cameraFar,
  cameraResolutionWidth,
  cameraResolutionHeight,
  showCameraHelper,
  cameraWheelSensitivity,
  cameraTranslateSensitivity,
  cameraRotateSensitivity,
  captureBusy,
  timelineSelection,
  timelineSnap,
  timelineLoop
} = toRefs(props)
</script>

<style scoped>

.properties-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  color: var(--text-strong, #f4f6ff);
  background: var(--panel-surface);
  border-radius: inherit;
  border: 1px solid var(--panel-border);
  box-shadow: var(--panel-shadow);
  overflow: hidden;
}

.properties-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: row;
  position: relative;
  overflow: hidden;
}

.tab-strip {
  width: 64px;
  min-width: 64px;
  padding: 0.95rem 0.45rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  background: var(--panel-surface-alt);
  border-right: 1px solid var(--panel-border);
}

.tab-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.48rem 0.25rem;
  border: 1px solid transparent;
  border-radius: 14px;
  color: rgba(220, 228, 248, 0.6);
  background: transparent;
  font-size: 0.64rem;
  line-height: 1;
  cursor: pointer;
  transition: color 0.16s ease, background 0.18s ease, border-color 0.18s ease;
  box-shadow: none;
}

.tab-button:hover,
.tab-button:focus-visible {
  color: rgba(245, 249, 255, 0.92);
  background: var(--control-surface);
  border-color: var(--panel-border);
  outline: none;
}

.tab-button.active {
  color: var(--text-strong, #ffffff);
  background: rgba(79, 111, 184, 0.32);
  border-color: rgba(79, 111, 184, 0.55);
  box-shadow: none;
}

.tab-icon {
  font-size: 1.3rem;
}

.tab-label {
  pointer-events: none;
}

.properties-scroll {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.75rem 1.1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: var(--panel-surface);
}

.properties-scroll::-webkit-scrollbar {
  width: 8px;
}

.properties-scroll::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--accent, #5c8cff) 45%, rgba(255, 255, 255, 0.16));
  border-radius: 4px;
}

.properties-scroll::-webkit-scrollbar-track {
  background: transparent;
}

/* Unify inner section cards and controls */
:deep(.section) {
  background: var(--control-surface);
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  box-shadow: none;
}
:deep(.section__header) {
  padding: 0.7rem 0.9rem 0.35rem;
}
:deep(.section__content) {
  padding: 0 0.9rem 0.9rem;
}
:deep(select),
:deep(input[type="number"]),
:deep(input[type="text"]) {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: var(--text-strong, #f4f6ff);
  padding: 0.35rem 0.6rem;
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

:deep(select:focus),
:deep(input[type="number"]:focus),
:deep(input[type="text"]:focus) {
  outline: none;
  border-color: color-mix(in srgb, var(--accent, #5c8cff) 55%, transparent);
  background: rgba(255, 255, 255, 0.08);
  box-shadow: var(--focus-ring, 0 0 0 2px rgba(79, 111, 184, 0.35));
}

:deep(.checkbox) {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.85rem;
  color: var(--text-muted, rgba(228, 233, 247, 0.78));
  cursor: pointer;
  user-select: none;
  transition: color 0.18s ease;
}

:deep(.checkbox:hover) {
  color: var(--text-strong, #f4f6ff);
}

:deep(.checkbox input[type="checkbox"]) {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.04);
  position: relative;
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
  cursor: pointer;
}

:deep(.checkbox input[type="checkbox"]:hover) {
  border-color: color-mix(in srgb, var(--accent, #5c8cff) 55%, transparent);
}

:deep(.checkbox input[type="checkbox"]:checked) {
  background: color-mix(in srgb, var(--accent, #5c8cff) 75%, rgba(255, 255, 255, 0.1));
  border-color: color-mix(in srgb, var(--accent, #5c8cff) 65%, rgba(255, 255, 255, 0.25));
  box-shadow: 0 0 0 2px rgba(45, 125, 210, 0.25);
}

:deep(.checkbox input[type="checkbox"]:checked::after) {
  content: '';
  position: absolute;
  inset: 4px 3px 3px 4px;
  border-right: 2px solid rgba(255, 255, 255, 0.92);
  border-bottom: 2px solid rgba(255, 255, 255, 0.92);
  transform: rotate(45deg);
}

:deep(.checkbox input[type="checkbox"]:focus-visible) {
  outline: none;
  box-shadow: var(--focus-ring, 0 0 0 2px rgba(79, 111, 184, 0.35));
  border-color: color-mix(in srgb, var(--accent, #5c8cff) 65%, rgba(255, 255, 255, 0.28));
}

:deep(.checkbox input[type="checkbox"]:disabled) {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

:deep(.checkbox.disabled) {
  opacity: 0.45;
  cursor: not-allowed;
}

:deep(.checkbox.disabled input[type="checkbox"]) {
  cursor: not-allowed;
}

:deep(input[type="range"]) {
  width: 100%;
  appearance: none;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(92, 140, 255, 0.35), rgba(92, 140, 255, 0.08));
  border: 1px solid rgba(255, 255, 255, 0.12);
  transition: border-color 0.18s ease, background 0.18s ease;
}

:deep(input[type="range"]:hover) {
  border-color: color-mix(in srgb, var(--accent, #5c8cff) 55%, transparent);
  background: linear-gradient(90deg, rgba(92, 140, 255, 0.55), rgba(92, 140, 255, 0.12));
}

:deep(input[type="range"]:focus-visible) {
  outline: none;
  border-color: color-mix(in srgb, var(--accent, #5c8cff) 65%, rgba(255, 255, 255, 0.2));
  box-shadow: var(--focus-ring, 0 0 0 2px rgba(79, 111, 184, 0.35));
}

:deep(input[type="range"]::-webkit-slider-thumb) {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.35);
  background: var(--accent, #5c8cff);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}

:deep(input[type="range"]::-webkit-slider-thumb:hover) {
  transform: scale(1.12);
  background: color-mix(in srgb, var(--accent, #5c8cff) 85%, rgba(255, 255, 255, 0.12));
  border-color: rgba(255, 255, 255, 0.5);
}

:deep(input[type="range"]::-moz-range-thumb) {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.35);
  background: var(--accent, #5c8cff);
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}

:deep(input[type="range"]::-moz-range-thumb:hover) {
  transform: scale(1.12);
  background: color-mix(in srgb, var(--accent, #5c8cff) 85%, rgba(255, 255, 255, 0.12));
  border-color: rgba(255, 255, 255, 0.5);
}

:deep(fieldset.group) {
  border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.12));
  border-radius: 12px;
  padding: 0.85rem 1rem 1rem;
  background: var(--control-surface, rgba(48, 54, 70, 0.88));
  min-width: 0;
}

:deep(fieldset.group legend) {
  padding: 0 0.35rem;
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  color: rgba(240, 244, 255, 0.85);
}
</style>
