<template>
  <footer class="status-bar" role="status">
    <div class="status-bar__left">
      <slot name="message">
        {{ message }}
      </slot>
    </div>
    <div class="status-bar__right">
      <slot name="shortcuts">
        <ul class="shortcut-list">
          <li><kbd>Space</kbd> 再生/停止</li>
          <li><kbd>Home</kbd> 範囲フィット</li>
          <li><kbd>←</kbd>/<kbd>→</kbd> フレーム移動</li>
          <li><kbd>M</kbd> マーカー追加</li>
        </ul>
      </slot>
    </div>
  </footer>
</template>

<script setup>
const props = defineProps({
  message: {
    type: String,
    default: 'Blenderスタイルレイアウトが有効です。'
  }
})
</script>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  min-height: 32px;
  background: var(--surface, rgba(32, 36, 46, 0.9));
  color: var(--text-muted, rgba(255, 255, 255, 0.7));
  border-top: 1px solid var(--border-soft, rgba(255, 255, 255, 0.08));
  backdrop-filter: blur(6px);
}

.status-bar__left {
  font-size: 0.85rem;
}

.shortcut-list {
  display: flex;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.78rem;
}

kbd {
  background: color-mix(in srgb, var(--accent, #2d8cff) 15%, transparent);
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--accent, #2d8cff) 40%, transparent);
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

@media (max-width: 840px) {
  .status-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }

  .shortcut-list {
    flex-wrap: wrap;
  }
}
</style>
