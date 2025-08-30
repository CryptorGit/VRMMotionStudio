<template>
  <div class="basic-settings-panel">
    <button @click="mode = mode === 'camera' ? 'pose' : 'camera'">
      {{ mode === 'camera' ? 'カメラモード' : 'ポーズモード' }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  mode: { type: String, default: 'camera' }
})

const emit = defineEmits(['update:mode'])

const mode = computed({
  get: () => props.mode,
  set: v => emit('update:mode', v)
})
</script>

<style scoped>
.basic-settings-panel {
  position: fixed;
  left: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  padding: 0.5rem;
  border-top-right-radius: 4px;
  box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.9rem;
}
</style>

