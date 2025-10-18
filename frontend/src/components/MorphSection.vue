<template>
  <div class="morph-header">
    <select v-if="models.length > 0" v-model="selectedModelIndex" class="model-select">
      <option v-for="(model, index) in models" :key="model.id" :value="index">
        {{ model.name }}
      </option>
    </select>
    <button type="button" class="action" @click="reloadMorphs">
      <Icon icon="mdi:refresh" />
      <span>更新</span>
    </button>
  </div>
  <MorphEditor :mesh="currentMesh" ref="morphEditorRef" />
</template>

<script setup>
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import MorphEditor from './MorphEditor.vue'

const props = defineProps({
  mesh: Object,
  models: { type: Array, default: () => [] }
})

const morphEditorRef = ref(null)
const selectedModelIndex = ref(0)

const currentMesh = computed(() => {
  if (props.models.length === 0) return props.mesh
  const model = props.models[selectedModelIndex.value]
  return model?.mesh || props.mesh
})

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

.model-select {
  flex: 1;
  padding: 0.35rem 0.65rem;
  border-radius: 6px;
  border: 1px solid rgba(140, 168, 235, 0.35);
  background: var(--control-surface, rgba(48, 54, 70, 0.9));
  color: rgba(240, 244, 255, 0.9);
  font-size: 0.85rem;
  cursor: pointer;
}

.model-select:focus {
  outline: none;
  border-color: rgba(140, 168, 235, 0.65);
  background: var(--control-surface-hover, rgba(58, 64, 81, 0.95));
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
