<template>
  <div class="morph-header">
    <select v-if="models.length > 0" v-model="selectedModelIndex" class="model-select">
      <option v-for="(model, index) in models" :key="model.id" :value="index">
        {{ model.name }}
      </option>
    </select>
    <button type="button" class="action" @click="reloadMorphs">
      <Icon icon="mdi:refresh" />
      <span>{{ morphTexts.reload }}</span>
    </button>
  </div>
  <MorphEditor :mesh="currentMesh" ref="morphEditorRef" />
</template>

<script setup>
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import MorphEditor from './MorphEditor.vue'
import { useI18n } from '../locales/index.js'

const props = defineProps({
  mesh: Object,
  models: { type: Array, default: () => [] }
})

const morphEditorRef = ref(null)
const selectedModelIndex = ref(0)
const { t } = useI18n()
const morphTexts = computed(() => t.value?.morph ?? {})

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
  appearance: none;
  padding: 0.45rem 2.25rem 0.45rem 0.75rem;
  border-radius: 6px;
  border: 1px solid rgba(140, 168, 235, 0.35);
  background: var(--control-surface, rgba(48, 54, 70, 0.9));
  color: rgba(240, 244, 255, 0.9);
  font-size: 0.85rem;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
  background-image: linear-gradient(45deg, transparent 50%, rgba(140, 168, 235, 0.9) 50%),
    linear-gradient(135deg, rgba(140, 168, 235, 0.9) 50%, transparent 50%);
  background-position: calc(100% - 18px) calc(50% - 3px), calc(100% - 13px) calc(50% - 3px);
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;
}

.model-select:hover,
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
