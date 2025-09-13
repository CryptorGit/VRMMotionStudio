<template>
  <div class="sections">
    <LightingSection
      v-if="visibleSections.lighting"
      :ambient="ambient"
      :directional="directional"
      :directional-intensity="directionalIntensity"
      :show-light-marker="showLightMarker"
      :marker-color="markerColor"
      @update:directional-intensity="v => emit('update:directionalIntensity', v)"
      @update:show-light-marker="v => emit('update:showLightMarker', v)"
      @update:marker-color="v => emit('update:markerColor', v)"
      @hide="emit('hide', 'lighting')"
    />
    <MorphSection
      v-if="visibleSections.morph"
      :mesh="mesh"
      @hide="emit('hide', 'morph')"
    />
    <ModelSection
      v-if="visibleSections.models"
      :models="models"
      :spring-bone-enabled="springBoneEnabled"
      :look-at-enabled="lookAtEnabled"
      @update:spring-bone-enabled="v => emit('update:springBoneEnabled', v)"
      @update:look-at-enabled="v => emit('update:lookAtEnabled', v)"
      @toggle-model="(...args) => emit('toggle-model', ...args)"
      @toggle-bone="(...args) => emit('toggle-bone', ...args)"
      @toggle-bone-names="(...args) => emit('toggle-bone-names', ...args)"
      @remove-model="(...args) => emit('remove-model', ...args)"
      @hide="emit('hide', 'models')"
    />
  </div>
</template>

<script setup>
import LightingSection from './LightingSection.vue'
import MorphSection from './MorphSection.vue'
import ModelSection from './ModelSection.vue'

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
  lookAtEnabled: { type: Boolean, required: true }
})

const emit = defineEmits([
  'update:showLightMarker',
  'update:markerColor',
  'update:directionalIntensity',
  'update:springBoneEnabled',
  'update:lookAtEnabled',
  'toggle-model',
  'toggle-bone',
  'toggle-bone-names',
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
