<template>
  <header class="top-menu" role="menubar">
    <div class="top-menu__brand">
      <Icon icon="mdi:arm-flex" class="top-menu__logo" aria-hidden="true" />
      <span class="top-menu__title">MokuMokuDance Web</span>
    </div>
    <nav class="top-menu__nav" aria-label="繝｡繧､繝ｳ繝｡繝九Η繝ｼ">
      <button
        type="button"
        class="top-menu__item"
        role="menuitem"
        @click="$emit('import')"
        :title="tooltip('繝｢繝・Ν繧定ｪｭ縺ｿ霎ｼ縺ｿ縺ｾ縺・)"
      >
        <Icon icon="mdi:file-import" />
        <span>繧､繝ｳ繝昴・繝・/span>
      </button>
      <button
        type="button"
        class="top-menu__item"
        role="menuitem"
        @click="$emit('export')"
        :title="tooltip('迴ｾ蝨ｨ縺ｮ繝昴・繧ｺ繧偵お繧ｯ繧ｹ繝昴・繝医＠縺ｾ縺・)"
      >
        <Icon icon="mdi:file-export" />
        <span>繧ｨ繧ｯ繧ｹ繝昴・繝・/span>
      </button>
      <button
        type="button"
        class="top-menu__item"
        role="menuitem"
        @click="$emit('timeline-import')"
        :title="tooltip('繧ｿ繧､繝繝ｩ繧､繝ｳ繧定ｪｭ縺ｿ霎ｼ縺ｿ縺ｾ縺・)"
      >
        <Icon icon="mdi:timeline-clock-outline" />
        <span>TL 隱ｭ霎ｼ</span>
      </button>
      <button
        type="button"
        class="top-menu__item"
        role="menuitem"
        :disabled="!timelineExportEnabled"
        :aria-disabled="!timelineExportEnabled"
        @click="$emit('timeline-export')"
        :title="tooltip(timelineExportEnabled ? '繧ｿ繧､繝繝ｩ繧､繝ｳ繧剃ｿ晏ｭ倥＠縺ｾ縺・ : '菫晏ｭ倥〒縺阪ｋ繧ｿ繧､繝繝ｩ繧､繝ｳ縺後≠繧翫∪縺帙ｓ')"
      >
        <Icon icon="mdi:timeline-text-outline" />
        <span>TL 菫晏ｭ・/span>
      </button>
      <button
        type="button"
        class="top-menu__item"
        role="menuitem"
        @click="$emit('clear-cache')"
        :title="tooltip('隱ｭ縺ｿ霎ｼ繧薙□繝｢繝・Ν繧・ｨｭ螳壹ｒ繝ｪ繧ｻ繝・ヨ縺励∪縺・)"
      >
        <Icon icon="mdi:trash-can-outline" />
        <span>繧ｭ繝｣繝・す繝･蜑企勁</span>
      </button>
      <button
        type="button"
        class="top-menu__item"
        role="menuitemcheckbox"
        :aria-checked="autoRestore"
        @click="$emit('toggle-auto-restore')"
        :title="tooltip(`襍ｷ蜍墓凾縺ｫ蜑榊屓縺ｮ繝｢繝・Ν繧・{autoRestore ? '蠕ｩ蜈・＠縺ｾ縺・ : '蠕ｩ蜈・＠縺ｾ縺帙ｓ'}`)"
      >
        <Icon :icon="autoRestore ? 'mdi:backup-restore' : 'mdi:backup-restore'" />
        <span>閾ｪ蜍募ｾｩ蜈・{{ autoRestore ? 'ON' : 'OFF' }}</span>
      </button>
      <button
        type="button"
        class="top-menu__item"
        role="switch"
        :aria-checked="showCaptions"
        @click="$emit('toggle-captions')"
        :title="tooltip(showCaptions ? '繧ｭ繝｣繝励す繝ｧ繝ｳ陦ｨ遉ｺ繧丹FF縺ｫ縺励∪縺・ : '繧ｭ繝｣繝励す繝ｧ繝ｳ陦ｨ遉ｺ繧丹N縺ｫ縺励∪縺・)"
      >
  <Icon :icon="showCaptions ? 'mdi:tooltip-text-outline' : 'mdi:tooltip-outline'" />
        <span>繧ｭ繝｣繝励す繝ｧ繝ｳ {{ showCaptions ? 'ON' : 'OFF' }}</span>
      </button>
    </nav>
    <div class="top-menu__actions">
      <button
        type="button"
        class="top-menu__item top-menu__item--icon"
        :aria-label="theme === 'dark' ? '繝ｩ繧､繝医ユ繝ｼ繝槭↓蛻・崛' : '繝繝ｼ繧ｯ繝・・繝槭↓蛻・崛'"
        role="switch"
        :aria-checked="theme === 'dark'"
        @click="$emit('toggle-theme')"
        :title="tooltip(theme === 'dark' ? '繝ｩ繧､繝医ユ繝ｼ繝槭↓蛻・ｊ譖ｿ縺医∪縺・ : '繝繝ｼ繧ｯ繝・・繝槭↓蛻・ｊ譖ｿ縺医∪縺・)"
      >
        <Icon :icon="theme === 'dark' ? 'mdi:weather-night' : 'mdi:white-balance-sunny'" />
      </button>
    </div>
  </header>
</template>

<script setup>
import { Icon } from '@iconify/vue'

const props = defineProps({
  theme: {
    type: String,
    default: 'dark'
  },
  autoRestore: {
    type: Boolean,
    default: true
  },
  showCaptions: {
    type: Boolean,
    default: true
  },
  timelineExportEnabled: {
    type: Boolean,
    default: false
  }
})

const tooltip = message => (props.showCaptions ? message : '')
</script>

<style scoped>
.top-menu {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: stretch;
  gap: 0.5rem;
  padding: 0 1rem;
  height: var(--menubar-height, 48px);
  background: var(--surface-strong, #1f2330);
  color: var(--text-strong, #fdfcff);
  border-bottom: 1px solid var(--border-soft, rgba(255, 255, 255, 0.08));
  user-select: none;
  -webkit-app-region: drag;
}

.top-menu__brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  -webkit-app-region: no-drag;
  cursor: default;
}

.top-menu__logo {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--accent, #2d8cff);
  display: grid;
  place-items: center;
  font-size: 1.1rem;
  color: var(--text-on-accent, #ffffff);
}

.top-menu__title {
  font-size: 0.95rem;
}

.top-menu__nav {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  -webkit-app-region: no-drag;
  gap: 0.35rem;
}

.top-menu__actions {
  display: flex;
  -webkit-app-region: no-drag;
  align-items: center;
  gap: 0.25rem;
}

.top-menu__item {
  background: transparent;
  border: none;
  color: inherit;
  padding: 0.45rem 0.85rem;
  border-radius: 8px;
  font-size: 0.92rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}

.top-menu__item:hover,
.top-menu__item:focus-visible {
  outline: none;
  background: color-mix(in srgb, var(--accent, #2d8cff) 18%, transparent);
  color: var(--text-strong, #fdfcff);
}

.top-menu__item--icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  font-size: 1.1rem;
}

.top-menu__item--icon span {
  font-size: 1rem;
}

.top-menu__item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.top-menu__divider {
  width: 1px;
  height: 24px;
  background: var(--border-soft, rgba(255, 255, 255, 0.18));
  margin: 0 0.5rem;
}

@media (max-width: 960px) {
  .top-menu {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
    height: auto;
    padding-top: 0.4rem;
    padding-bottom: 0.4rem;
  }

  .top-menu__nav {
    flex-wrap: wrap;
    justify-content: center;
  }

  .top-menu__item {
    flex-direction: row;
    gap: 0.4rem;
  }

  .top-menu__item small {
    display: none;
  }
}
</style>


