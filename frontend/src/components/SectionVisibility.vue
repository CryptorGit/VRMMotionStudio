<template>
  <LightingSection
    v-if="active === 'lighting'"
    :ambient="ambient"
    :directional="directional"
    :directional-intensity="directionalIntensity"
    @update:directional-intensity="v => emit('update:directionalIntensity', v)"
  />
  <ModelSection
    v-else-if="active === 'model'"
    :models="models"
    :look-at-enabled="lookAtEnabled"
    @toggle-model="(i, v) => emit('toggle-model', i, v)"
    @remove-model="i => emit('remove-model', i)"
    @update:lookAtEnabled="v => emit('update:lookAtEnabled', v)"
  />
  <DisplaySection
    v-else-if="active === 'display'"
    :models="models"
    :show-grid="showGrid"
    :show-light-marker="showLightMarker"
    :marker-color="markerColor"
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
    @update:show-grid="v => emit('update:showGrid', v)"
    @update:show-light-marker="v => emit('update:showLightMarker', v)"
    @update:marker-color="v => emit('update:markerColor', v)"
    @update:show-extended-bones="v => emit('update:showExtendedBones', v)"
    @update:show-collider-nodes="v => emit('update:showColliderNodes', v)"
    @update:show-non-deforming-bones="v => emit('update:showNonDeformingBones', v)"
    @update:highlight-constraint="v => emit('update:highlightConstraint', v)"
    @update:show-physical-bones="v => emit('update:showPhysicalBones', v)"
    @update:show-other-bones="v => emit('update:showOtherBones', v)"
    @update:bone-dot-size="v => emit('update:boneDotSize', v)"
    @update:bone-label-scale="v => emit('update:boneLabelScale', v)"
    @update:outline-width="v => emit('update:outlineWidth', v)"
    @update:outline-color="v => emit('update:outlineColor', v)"
    @toggle-all-bones="v => emit('toggle-all-bones', v)"
    @toggle-all-bone-names="v => emit('toggle-all-bone-names', v)"
    @reset-outline="(i) => emit('reset-outline', i)"
    @load-model-outline="(i) => emit('load-model-outline', i)"
  />
  <TrackerSection
    v-else-if="active === 'trackers'"
    :virtual-trackers-enabled="virtualTrackersEnabled"
    :virtual-tracker-display-visible="virtualTrackerDisplayVisible"
    :show-virtual-tracker-labels="showVirtualTrackerLabels"
    :virtual-tracker-size="virtualTrackerSize"
    :virtual-tracker-label-scale="virtualTrackerLabelScale"
    :forearm-twist-share="forearmTwistShare"
    :has-models-loaded="hasModelsLoaded"
    :selected-tracker="selectedTrackerKey"
    :selected-tracker-label="selectedTrackerLabel"
    :tracker-position="trackerPosition"
    :tracker-rotation="trackerRotation"
    :tracker-rotation-order="trackerRotationOrder"
    :tracker-rotation-orders="trackerRotationOrders"
    :show-tracker-axes="showTrackerAxes"
    :tracker-axes-length="trackerAxesLength"
    @update:virtualTrackersEnabled="v => emit('update:virtualTrackersEnabled', v)"
    @update:virtualTrackerDisplayVisible="v => emit('update:virtualTrackerDisplayVisible', v)"
    @update:showVirtualTrackerLabels="v => emit('update:showVirtualTrackerLabels', v)"
    @update:virtualTrackerSize="v => emit('update:virtualTrackerSize', v)"
    @update:virtualTrackerLabelScale="v => emit('update:virtualTrackerLabelScale', v)"
    @update:showTrackerAxes="v => emit('update:showTrackerAxes', v)"
    @update:trackerAxesLength="v => emit('update:trackerAxesLength', v)"
  @update:forearm-twist-share="v => emit('update:forearmTwistShare', v)"
    @update:tracker-rotation-order="v => emit('update:tracker-rotation-order', v)"
  @reset-virtual-trackers="() => emit('reset-virtual-trackers')"
  @reset-virtual-tracker-rotations="() => emit('reset-all-tracker-orientations')"
    @update:tracker-position="v => emit('update:tracker-position', v)"
    @update:tracker-rotation="v => emit('update:tracker-rotation', v)"
    @reset-tracker-position="() => emit('reset-tracker-position')"
    @reset-tracker-rotation="() => emit('reset-tracker-rotation')"
    @reset-outline="() => emit('reset-outline')"
  />
  <FingerControlSection
    v-else-if="active === 'bones'"
    :finger-states="fingerStates"
    @update:fingerStates="handleFingerUpdate"
  />
  <KeySettingsSection
    v-else-if="active === 'keys'"
    :selection="timelineSelection"
    :snap="timelineSnap"
    :loop="timelineLoop"
    :available-trackers="availableTrackers"
    @update:snap="v => emit('update:timelineSnap', v)"
    @update:loop="v => emit('update:timelineLoop', v)"
    @remove-selected="() => emit('remove-selected-keyframes')"
    @update-curves="payload => emit('update-keyframe-curves', payload)"
  />
  <AudioSection
    v-else-if="active === 'audio'"
    :audio-duration="audioDuration"
    :audio-buffer="audioBuffer"
    @remove-audio="() => emit('remove-audio')"
  />
  <CameraSection
    v-else-if="active === 'camera'"
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
    @update:cameraFov="v => emit('update:cameraFov', v)"
    @update:cameraNear="v => emit('update:cameraNear', v)"
    @update:cameraFar="v => emit('update:cameraFar', v)"
    @update:cameraResolutionWidth="v => emit('update:cameraResolutionWidth', v)"
    @update:cameraResolutionHeight="v => emit('update:cameraResolutionHeight', v)"
  @update:showCameraHelper="v => emit('update:showCameraHelper', v)"
  @update:cameraWheelSensitivity="v => emit('update:cameraWheelSensitivity', v)"
  @update:cameraTranslateSensitivity="v => emit('update:cameraTranslateSensitivity', v)"
  @update:cameraRotateSensitivity="v => emit('update:cameraRotateSensitivity', v)"
    @capture="() => emit('capture-camera')"
  />
  <MorphSection v-else-if="active === 'morph'" :mesh="mesh" :models="models" />
</template>

<script setup>
import LightingSection from './LightingSection.vue'
import MorphSection from './MorphSection.vue'
import ModelSection from './ModelSection.vue'
import DisplaySection from './DisplaySection.vue'
import CameraSection from './CameraSection.vue'
import KeySettingsSection from './KeySettingsSection.vue'
import AudioSection from './AudioSection.vue'
import TrackerSection from './TrackerSection.vue'
import FingerControlSection from './FingerControlSection.vue'

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
  active: { type: String, default: 'lighting' },
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
  'update:tracker-position',
  'update:tracker-rotation',
  'update:tracker-rotation-order',
  'reset-tracker-position',
  'reset-tracker-rotation',
  'reset-all-tracker-orientations',
  'reset-outline',
  'update:cameraFov',
  'update:cameraNear',
  'update:cameraFar',
  'update:cameraResolutionWidth',
  'update:cameraResolutionHeight',
  'update:showCameraHelper',
  'update:cameraWheelSensitivity',
  'update:cameraTranslateSensitivity',
  'update:cameraRotateSensitivity',
  'capture-camera',
  'toggle-bone',
  'toggle-bone-names',
  'toggle-all-bones',
  'toggle-all-bone-names',
  'reset-virtual-trackers',
  'update:timelineSnap',
  'update:timelineLoop',
  'remove-selected-keyframes',
  'update-keyframe-curves',
  'load-model-outline',
  'remove-audio'
])

function handleFingerUpdate(updated) {
  // FingerControlSectionから全体のfingerStatesオブジェクトを受け取る
  if (updated && typeof updated === 'object') {
    emit('update:fingerStates', updated)
  }
}
</script>

<style scoped>
.sections {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem 0;
}

.sections::-webkit-scrollbar {
  width: 10px;
}

.sections::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--accent, #2d8cff) 40%, rgba(255, 255, 255, 0.18));
  border-radius: 6px;
}

.sections::-webkit-scrollbar-track {
  background: transparent;
}
</style>
