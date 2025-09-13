<template>
  <div class="sections">
    <LightingSection
      v-if="visibleSections.lighting"
      :ambient="ambient"
      :directional="directional"
      :directional-intensity="directionalIntensity"
      @update:directional-intensity="v => emit('update:directionalIntensity', v)"
      @hide="emit('hide', 'lighting')"
    />
    <DisplaySection
      v-if="visibleSections.display"
      :models="models"
      :show-light-marker="showLightMarker"
      :marker-color="markerColor"
      :show-physical-bones="showPhysicalBones"
      :show-other-bones="showOtherBones"
      :bone-dot-size="boneDotSize"
      :bone-label-scale="boneLabelScale"
      @update:show-light-marker="v => emit('update:showLightMarker', v)"
      @update:marker-color="v => emit('update:markerColor', v)"
      @update:show-physical-bones="v => emit('update:showPhysicalBones', v)"
      @update:show-other-bones="v => emit('update:showOtherBones', v)"
      @update:bone-dot-size="v => emit('update:boneDotSize', v)"
      @update:bone-label-scale="v => emit('update:boneLabelScale', v)"
      @toggle-all-bones="v => emit('toggle-all-bones', v)"
      @toggle-all-bone-names="v => emit('toggle-all-bone-names', v)"
      @hide="emit('hide', 'display')"
    />
    <MorphSection
      v-if="visibleSections.morph"
      :mesh="mesh"
      @hide="emit('hide', 'morph')"
    />
    <ModelSection
      v-if="visibleSections.models"
      :models="models"
      :look-at-enabled="lookAtEnabled"
      @update:look-at-enabled="v => emit('update:lookAtEnabled', v)"
      @toggle-model="(...args) => emit('toggle-model', ...args)"
      @remove-model="(...args) => emit('remove-model', ...args)"
      @hide="emit('hide', 'models')"
    />
    <PhysicsSection
      v-if="visibleSections.physics"
      :spring-bone-enabled="springBoneEnabled"
      @update:spring-bone-enabled="v => emit('update:springBoneEnabled', v)"
      @hide="emit('hide', 'physics')"
    />
  </div>
</template>

<script setup>
import LightingSection from './LightingSection.vue'
import MorphSection from './MorphSection.vue'
import ModelSection from './ModelSection.vue'
import DisplaySection from './DisplaySection.vue'
import PhysicsSection from './PhysicsSection.vue'

defineProps({
  ambient: Object,
  directional: Object,
  mesh: Object,
  models: { type: Array, required: true },
  visibleSections: { type: Object, required: true },
  showLightMarker: { type: Boolean, required: true },
  markerColor: { type: String, required: true },
  directionalIntensity: { type: Number, required: true },
  springBoneEnabled: { type: Boolean, required: true },
  lookAtEnabled: { type: Boolean, required: true },
  showPhysicalBones: { type: Boolean, required: true },
  showOtherBones: { type: Boolean, required: true },
  boneDotSize: { type: Number, required: true },
  boneLabelScale: { type: Number, required: true }
})

const emit = defineEmits([
  'update:showLightMarker',
  'update:markerColor',
  'update:directionalIntensity',
  'update:springBoneEnabled',
  'update:lookAtEnabled',
  'update:showPhysicalBones',
  'update:showOtherBones',
  'update:boneDotSize',
  'update:boneLabelScale',
  'toggle-model',
  'toggle-bone',
  'toggle-bone-names',
  'toggle-all-bones',
  'toggle-all-bone-names',
  'remove-model',
  'hide'
])
</script>

<style scoped>
.sections {
  max-height: calc(100vh - var(--header-height));
  overflow-y: auto;
}
</style>
