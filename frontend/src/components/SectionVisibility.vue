<template>
  <div class="sections">
    <LightingSection
      v-if="active === 'lighting'"
      :ambient="ambient"
      :directional="directional"
      :directional-intensity="directionalIntensity"
      @update:directional-intensity="v => emit('update:directionalIntensity', v)"
    />
    <DisplaySection
      v-else-if="active === 'display'"
      :models="models"
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
    />
    <TrackerSection
      v-else-if="active === 'trackers'"
      :virtual-trackers-enabled="virtualTrackersEnabled"
      :virtual-tracker-display-visible="virtualTrackerDisplayVisible"
      :show-virtual-tracker-labels="showVirtualTrackerLabels"
      :virtual-tracker-size="virtualTrackerSize"
      :virtual-tracker-label-scale="virtualTrackerLabelScale"
      :has-models-loaded="hasModelsLoaded"
      @update:virtualTrackersEnabled="v => emit('update:virtualTrackersEnabled', v)"
      @update:virtualTrackerDisplayVisible="v => emit('update:virtualTrackerDisplayVisible', v)"
      @update:showVirtualTrackerLabels="v => emit('update:showVirtualTrackerLabels', v)"
      @update:virtualTrackerSize="v => emit('update:virtualTrackerSize', v)"
      @update:virtualTrackerLabelScale="v => emit('update:virtualTrackerLabelScale', v)"
      @reset-virtual-trackers="() => emit('reset-virtual-trackers')"
    />
    <FingerControlSection
      v-else-if="active === 'bones'"
      :finger-states="fingerStates"
      @update:finger="handleFingerUpdate"
    />
    <KeySettingsSection
      v-else-if="active === 'keys'"
      :selection="timelineSelection"
      :snap="timelineSnap"
      :loop="timelineLoop"
      @update:snap="v => emit('update:timelineSnap', v)"
      @update:loop="v => emit('update:timelineLoop', v)"
      @remove-selected="() => emit('remove-selected-keyframes')"
      @update-curves="payload => emit('update-keyframe-curves', payload)"
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
    <MorphSection v-else-if="active === 'morph'" :mesh="mesh" />
    <ModelSection
      v-else-if="active === 'model'"
      :models="models"
      :look-at-enabled="lookAtEnabled"
      @update:look-at-enabled="v => emit('update:lookAtEnabled', v)"
      @toggle-model="(...args) => emit('toggle-model', ...args)"
      @remove-model="(...args) => emit('remove-model', ...args)"
    />
    <PhysicsSection
      v-else-if="active === 'physics'"
      :spring-bone-enabled="springBoneEnabled"
      @update:spring-bone-enabled="v => emit('update:springBoneEnabled', v)"
    />
  </div>
</template>

<script setup>
import LightingSection from './LightingSection.vue'
import MorphSection from './MorphSection.vue'
import ModelSection from './ModelSection.vue'
import DisplaySection from './DisplaySection.vue'
import PhysicsSection from './PhysicsSection.vue'
import CameraSection from './CameraSection.vue'
import KeySettingsSection from './KeySettingsSection.vue'
import TrackerSection from './TrackerSection.vue'
import FingerControlSection from './FingerControlSection.vue'

const props = defineProps({
  ambient: Object,
  directional: Object,
  mesh: Object,
  models: { type: Array, required: true },
  showLightMarker: { type: Boolean, required: true },
  markerColor: { type: String, required: true },
  directionalIntensity: { type: Number, required: true },
  springBoneEnabled: { type: Boolean, required: true },
  lookAtEnabled: { type: Boolean, required: true },
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
  hasModelsLoaded: { type: Boolean, default: false },
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
  timelineLoop: { type: Boolean, default: false }
})

const emit = defineEmits([
  'update:showLightMarker',
  'update:markerColor',
  'update:directionalIntensity',
  'update:springBoneEnabled',
  'update:lookAtEnabled',
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
  'update:fingerStates',
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
  'toggle-model',
  'toggle-bone',
  'toggle-bone-names',
  'toggle-all-bones',
  'toggle-all-bone-names',
  'remove-model',
  'reset-virtual-trackers',
  'update:timelineSnap',
  'update:timelineLoop',
  'remove-selected-keyframes',
  'update-keyframe-curves'
])

function handleFingerUpdate({ hand, finger, value }) {
  const key = `${hand}_${finger}`
  const updated = { ...props.fingerStates, [key]: value }
  emit('update:fingerStates', updated)
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
