<template>
  <LightingPanel
    :ambient="ambient"
    :directional="directional"
    v-model:directional-intensity="directionalIntensity"
  />
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
/* Styles removed - direct component rendering */
</style>
