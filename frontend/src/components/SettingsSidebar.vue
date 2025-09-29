<template>
  <aside class="properties-panel">
    <div class="properties-body">
      <nav class="tab-strip" role="tablist" aria-label="設定のカテゴリ">
        <button
          v-for="tab in SECTION_TABS"
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
          :show-light-marker="showLightMarker"
          :marker-color="markerColor"
          :directional-intensity="directionalIntensity"
          :spring-bone-enabled="springBoneEnabled"
          :look-at-enabled="lookAtEnabled"
          :show-extended-bones="showExtendedBones"
          :show-collider-nodes="showColliderNodes"
          :show-non-deforming-bones="showNonDeformingBones"
          :highlight-constraint="highlightConstraint"
          :show-physical-bones="showPhysicalBones"
          :show-other-bones="showOtherBones"
          :bone-dot-size="boneDotSize"
          :bone-label-scale="boneLabelScale"
          :virtual-trackers-enabled="virtualTrackersEnabled"
          :show-virtual-tracker-labels="showVirtualTrackerLabels"
          :virtual-tracker-size="virtualTrackerSize"
          :virtual-tracker-label-scale="virtualTrackerLabelScale"
          :camera-fov="cameraFov"
          :camera-near="cameraNear"
          :camera-far="cameraFar"
          :camera-resolution-width="cameraResolutionWidth"
          :camera-resolution-height="cameraResolutionHeight"
          :show-camera-helper="showCameraHelper"
          :capture-busy="captureBusy"
          @update:showLightMarker="v => emit('update:showLightMarker', v)"
          @update:markerColor="v => emit('update:markerColor', v)"
          @update:directionalIntensity="v => emit('update:directionalIntensity', v)"
          @update:springBoneEnabled="v => emit('update:springBoneEnabled', v)"
          @update:lookAtEnabled="v => emit('update:lookAtEnabled', v)"
          @update:showExtendedBones="v => emit('update:showExtendedBones', v)"
          @update:showColliderNodes="v => emit('update:showColliderNodes', v)"
          @update:showNonDeformingBones="v => emit('update:showNonDeformingBones', v)"
          @update:highlightConstraint="v => emit('update:highlightConstraint', v)"
          @update:showPhysicalBones="v => emit('update:showPhysicalBones', v)"
          @update:showOtherBones="v => emit('update:showOtherBones', v)"
          @update:boneDotSize="v => emit('update:boneDotSize', v)"
          @update:boneLabelScale="v => emit('update:boneLabelScale', v)"
          @update:virtualTrackersEnabled="v => emit('update:virtualTrackersEnabled', v)"
          @update:showVirtualTrackerLabels="v => emit('update:showVirtualTrackerLabels', v)"
          @update:virtualTrackerSize="v => emit('update:virtualTrackerSize', v)"
          @update:cameraFov="v => emit('update:cameraFov', v)"
          @update:cameraNear="v => emit('update:cameraNear', v)"
          @update:cameraFar="v => emit('update:cameraFar', v)"
          @update:cameraResolutionWidth="v => emit('update:cameraResolutionWidth', v)"
          @update:cameraResolutionHeight="v => emit('update:cameraResolutionHeight', v)"
          @update:showCameraHelper="v => emit('update:showCameraHelper', v)"
          @capture-camera="() => emit('capture-render')"
          @update:virtualTrackerLabelScale="v => emit('update:virtualTrackerLabelScale', v)"
          @toggle-model="(...args) => emit('toggle-model', ...args)"
          @toggle-bone="(...args) => emit('toggle-bone', ...args)"
          @toggle-bone-names="(...args) => emit('toggle-bone-names', ...args)"
          @toggle-all-bones="(...args) => emit('toggle-all-bones', ...args)"
          @toggle-all-bone-names="(...args) => emit('toggle-all-bone-names', ...args)"
          @remove-model="(...args) => emit('remove-model', ...args)"
          @reset-virtual-trackers="() => emit('reset-virtual-trackers')"
        />
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, toRefs } from 'vue'
import { Icon } from '@iconify/vue'
import SectionVisibility from './SectionVisibility.vue'
import { SECTION_TABS } from './settingsTabs.js'
import { useCaptions } from '../composables/useCaptions.js'

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
  virtualTrackersEnabled: { type: Boolean, default: false },
  showVirtualTrackerLabels: { type: Boolean, default: true },
  virtualTrackerSize: { type: Number, default: 0.08 },
  virtualTrackerLabelScale: { type: Number, default: 1.0 },
  cameraFov: { type: Number, required: true },
  cameraNear: { type: Number, required: true },
  cameraFar: { type: Number, required: true },
  cameraResolutionWidth: { type: Number, required: true },
  cameraResolutionHeight: { type: Number, required: true },
  showCameraHelper: { type: Boolean, default: false },
  captureBusy: { type: Boolean, default: false }
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
  'update:virtualTrackersEnabled',
  'update:showVirtualTrackerLabels',
  'update:virtualTrackerSize',
  'update:virtualTrackerLabelScale',
  'update:cameraFov',
  'update:cameraNear',
  'update:cameraFar',
  'update:cameraResolutionWidth',
  'update:cameraResolutionHeight',
  'update:showCameraHelper',
  'capture-render',
  'toggle-model',
  'toggle-bone',
  'toggle-bone-names',
  'toggle-all-bones',
  'toggle-all-bone-names',
  'remove-model',
  'reset-virtual-trackers'
])

const activeTab = ref(SECTION_TABS[0]?.id ?? 'lighting')

const { tooltip } = useCaptions()

const {
  ambient,
  directional,
  mesh,
  models,
  showLightMarker,
  markerColor,
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
  cameraFov,
  cameraNear,
  cameraFar,
  cameraResolutionWidth,
  cameraResolutionHeight,
  showCameraHelper,
  captureBusy
} = toRefs(props)
</script>

<style scoped>

.properties-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  color: var(--text-strong, #f4f6ff);
  background: linear-gradient(180deg, rgba(37, 41, 52, 0.98) 0%, rgba(28, 31, 40, 0.98) 100%);
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.45), inset 0 18px 36px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  backdrop-filter: blur(6px);
}

.properties-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  position: relative;
}

.tab-strip {
  width: 64px;
  min-width: 64px;
  padding: 0.95rem 0.45rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  background: linear-gradient(180deg, rgba(22, 25, 32, 0.95) 0%, rgba(16, 19, 26, 0.98) 100%);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
}

.tab-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.48rem 0.25rem;
  border: none;
  border-radius: 14px;
  color: rgba(220, 228, 248, 0.6);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01));
  font-size: 0.64rem;
  line-height: 1;
  cursor: pointer;
  transition: color 0.16s ease, transform 0.18s ease, box-shadow 0.18s ease;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
}

.tab-button:hover,
.tab-button:focus-visible {
  color: rgba(245, 249, 255, 0.92);
  transform: translateY(-1px);
  box-shadow: inset 0 0 0 1px rgba(120, 160, 255, 0.4), 0 12px 24px rgba(18, 24, 40, 0.35);
  outline: none;
}

.tab-button.active {
  color: #ffffff;
  background: linear-gradient(180deg, rgba(110, 160, 255, 0.9) 0%, rgba(70, 120, 235, 0.95) 100%);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35), 0 14px 28px rgba(42, 72, 140, 0.45);
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
  overflow-y: auto;
  padding: 0.75rem 1.1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: linear-gradient(180deg, rgba(24, 26, 33, 0.92), rgba(20, 21, 28, 0.96));
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
</style>
