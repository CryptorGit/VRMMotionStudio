<template>
  <section class="section">
    <header class="section__header">
      <h3>モーフ編集</h3>
      <button type="button" class="action" @click="reloadMorphs">
        <Icon icon="mdi:refresh" />
        <span>更新</span>
      </button>
    </header>
    <div class="section__content">
      <MorphEditor :mesh="mesh" ref="morphEditorRef" />
    </div>
  </section>
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
.section {
  background: rgba(36, 40, 52, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  overflow: hidden;
}

.section__header {
  padding: 0.75rem 0.85rem 0.4rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.section__header h3 {
  margin: 0;
  font-size: 0.95rem;
  letter-spacing: 0.04em;
}

.section__content {
  padding: 0 0.85rem 0.85rem;
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
