<template>
  <div class="section">
    <h3 @click="expanded = !expanded">
      <i
        class="toggle-icon"
        :class="expanded ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right'"
      ></i>
      ライト設定
      <span class="spacer"></span>
      <i class="fa-solid fa-times close-icon" @click.stop="$emit('hide')"></i>
    </h3>
    <div v-show="expanded" class="section-content">
      <LightingPanel
        :ambient="ambient"
        :directional="directional"
        v-model:directional-intensity="directionalIntensity"
        v-model:show-light-marker="showLightMarker"
        v-model:marker-color="markerColor"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import LightingPanel from './LightingPanel.vue'

const props = defineProps({
  ambient: Object,
  directional: Object,
  showLightMarker: Boolean,
  markerColor: String,
  directionalIntensity: Number
})

const emit = defineEmits([
  'hide',
  'update:showLightMarker',
  'update:markerColor',
  'update:directionalIntensity'
])

const expanded = ref(false)

const showLightMarker = computed({
  get: () => props.showLightMarker,
  set: v => emit('update:showLightMarker', v)
})
const markerColor = computed({
  get: () => props.markerColor,
  set: v => emit('update:markerColor', v)
})
const directionalIntensity = computed({
  get: () => props.directionalIntensity,
  set: v => emit('update:directionalIntensity', v)
})
</script>

<style scoped>
.section h3 {
  margin: 0;
  padding: 0.5rem;
  background: #ddd;
  cursor: pointer;
  display: flex;
  align-items: center;
}
.section h3 .toggle-icon {
  margin-right: 0.5rem;
}
.section h3 .spacer {
  flex: 1;
}
.section h3 .close-icon {
  margin-left: 0.5rem;
  cursor: pointer;
}
.section-content {
  padding: 0.5rem;
}
</style>
