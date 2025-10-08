<template>
  <div class="morph-header">
    <button type="button" class="action" @click="reloadMorphs">
      <Icon icon="mdi:refresh" />
      <span>更新</span>
    </button>
  </div>
  <MorphEditor :mesh="mesh" ref="morphEditorRef" />
</template>

<script setup>
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import MorphEditor from './MorphEditor.vue'

const props = defineProps({
  mesh: Object
})
const morphEditorRef = ref(null)

function reloadMorphs() {
  morphEditorRef.value?.reloadMorphs?.()
}
</script>

<style scoped>
.morph-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.action {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.1);
  color: inherit;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
}

.action:hover,
.action:focus-visible {
  background: color-mix(in srgb, var(--accent, #2d8cff) 25%, rgba(255, 255, 255, 0.1));
  outline: none;
}
</style>
