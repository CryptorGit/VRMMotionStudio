<template>
  <label class="lookat-toggle">
    <input type="checkbox" v-model="lookAtEnabledLocal" />
    <span>{{ modelTexts.lookAtEnabled }}</span>
  </label>
  <ModelList
    :models="models"
    @toggle="(i, v) => emit('toggle-model', i, v)"
    @remove="i => emit('remove-model', i)"
  />
  
  <!-- Google AdSense広告 -->
  <GoogleAdUnit variant="square" ad-slot="model-section" />
</template>

<script setup>
import { computed } from 'vue'
import ModelList from './ModelList.vue'
import GoogleAdUnit from './GoogleAdUnit.vue'
import { useI18n } from '../locales/index.js'

const props = defineProps({
  models: { type: Array, required: true },
  lookAtEnabled: { type: Boolean, required: true }
})

const emit = defineEmits([
  'toggle-model',
  'remove-model',
  'update:lookAtEnabled'
])

const lookAtEnabledLocal = computed({
  get: () => props.lookAtEnabled,
  set: v => emit('update:lookAtEnabled', v)
})

const { t } = useI18n()
const modelTexts = computed(() => t.value?.model ?? {})
</script>

<style scoped>
.section {
  background: var(--panel-surface, rgba(24, 26, 32, 0.95));
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
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.lookat-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.82rem;
  color: var(--text-muted, rgba(240, 245, 255, 0.8));
}
</style>
