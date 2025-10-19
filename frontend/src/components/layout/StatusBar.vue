<template>
  <footer class="status-bar" role="status">
    <div class="status-bar__left">
      <slot name="message">
        {{ message }}
      </slot>
    </div>
    <div class="status-bar__right">
      <slot name="shortcuts">
        <span class="status-bar__placeholder">{{ statusTexts.placeholder }}</span>
      </slot>
    </div>
  </footer>
</template>

<script setup>
import { useI18n } from '../../locales/index.js'
import { computed } from 'vue'

const props = defineProps({
  message: {
    type: String,
    default: ''
  }
})

const { t } = useI18n()
const statusTexts = computed(() => t.value?.statusBar ?? {})
</script>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  min-height: 32px;
  background: var(--surface, rgba(20, 22, 28, 0.9));
  color: var(--text-muted, rgba(255, 255, 255, 0.7));
  border-top: 1px solid var(--border-soft, rgba(255, 255, 255, 0.08));
  backdrop-filter: blur(6px);
}

.status-bar__left {
  font-size: 0.85rem;
}

.status-bar__placeholder {
  font-size: 0.78rem;
  opacity: 0.65;
}

@media (max-width: 840px) {
  .status-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }
}
</style>
