<template>
  <section class="section">
    <header class="section__header">
      <h3>照明設宁E/h3>
    </header>
    <div class="section__content">
      <LightingPanel
        :ambient="ambient"
        :directional="directional"
        v-model:directional-intensity="directionalIntensity"
      />
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import LightingPanel from './LightingPanel.vue'

const props = defineProps({
  ambient: Object,
  directional: Object,
  directionalIntensity: Number
})

const emit = defineEmits([
  'update:directionalIntensity'
])

const directionalIntensity = computed({
  get: () => props.directionalIntensity,
  set: v => emit('update:directionalIntensity', v)
})
</script>

<style scoped>
.section {
  background: rgba(36, 40, 52, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  overflow: hidden;
}

.section__header {
  padding: 0.75rem 0.85rem 0.4rem;
}

.section__header h3 {
  margin: 0;
  font-size: 0.95rem;
  letter-spacing: 0.04em;
}

.section__content {
  padding: 0 0.85rem 0.85rem;
}
</style>


