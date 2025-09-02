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
      :show-ik-markers="showIkMarkers"
      :enable-physics="enablePhysics"
      @update:show-ik-markers="v => emit('update:showIkMarkers', v)"
      @update:enable-physics="v => emit('update:enablePhysics', v)"
      @toggle-model="(...args) => emit('toggle-model', ...args)"
      @toggle-bone="(...args) => emit('toggle-bone', ...args)"
      @toggle-bone-names="(...args) => emit('toggle-bone-names', ...args)"
      @toggle-physics-bones="(...args) => emit('toggle-physics-bones', ...args)"
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
  showIkMarkers: { type: Boolean, required: true },
  enablePhysics: { type: Boolean, required: true }
})

const emit = defineEmits([
  'update:showLightMarker',
  'update:markerColor',
  'update:directionalIntensity',
  'update:showIkMarkers',
  'update:enablePhysics',
  'toggle-model',
  'toggle-bone',
  'toggle-bone-names',
  'toggle-physics-bones',
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
