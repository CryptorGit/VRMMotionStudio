<template>
  <label class="toggle">
    <input type="checkbox" v-model="springBoneEnabledLocal" />
    <span>{{ physicsTexts.springBoneEnabled }}</span>
  </label>

  <!-- Google AdSense広告 -->
  <GoogleAdUnit variant="square" ad-slot="physics-section" />
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../locales/index.js'
import GoogleAdUnit from './GoogleAdUnit.vue'

const props = defineProps({
  springBoneEnabled: { type: Boolean, required: true }
})
const emit = defineEmits(['update:spring-bone-enabled'])

const springBoneEnabledLocal = computed({
  get: () => props.springBoneEnabled,
  set: v => emit('update:spring-bone-enabled', v)
})

const { t } = useI18n()
const physicsTexts = computed(() => t.value?.physics ?? {})
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
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.82rem;
  color: var(--text-muted, rgba(240, 245, 255, 0.8));
}
</style>
