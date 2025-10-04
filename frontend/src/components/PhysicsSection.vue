<template>
  <section class="section">
    <header class="section__header">
      <h3>物琁E��宁E/h3>
    </header>
    <div class="section__content">
      <label class="toggle">
        <input type="checkbox" v-model="springBoneEnabledLocal" /> SpringBone 有効
      </label>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  springBoneEnabled: { type: Boolean, required: true }
})
const emit = defineEmits(['update:spring-bone-enabled'])

const springBoneEnabledLocal = computed({
  get: () => props.springBoneEnabled,
  set: v => emit('update:spring-bone-enabled', v)
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

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.82rem;
  color: var(--text-muted, rgba(240, 245, 255, 0.8));
}
</style>


