<template>
  <header class="top-menu" role="menubar">
    <div class="top-menu__brand">
      <span class="top-menu__title">
        {{ brand.title || 'VRM Motion Studio' }}
        <span class="top-menu__beta" :aria-label="brand.betaAria || brand.beta || 'Beta version'">
          {{ brand.beta || 'BETA' }}
        </span>
      </span>
    </div>
    <nav class="top-menu__nav" :aria-label="aria.mainMenu || 'Main menu'">
      <button
        type="button"
        class="top-menu__item"
        role="menuitem"
        @click="$emit('import')"
        :title="tooltip(menuTooltips.import)"
      >
        <Icon icon="mdi:file-import" />
        <span>{{ menu.import }}</span>
      </button>
      <button
        type="button"
        class="top-menu__item"
        role="menuitem"
        @click="$emit('import-audio')"
        :title="tooltip(menuTooltips.importAudio)"
      >
        <Icon icon="mdi:music" />
        <span>{{ menu.importAudio }}</span>
      </button>
      <button
        type="button"
        class="top-menu__item"
        role="menuitem"
        @click="$emit('export')"
        :title="tooltip(menuTooltips.export)"
      >
        <Icon icon="mdi:file-export" />
        <span>{{ menu.export }}</span>
      </button>
      <button
        type="button"
        class="top-menu__item"
        role="menuitem"
        @click="$emit('capture-image')"
        :title="tooltip(menuTooltips.captureImage)"
      >
        <Icon icon="mdi:image" />
        <span>{{ menu.captureImage }}</span>
      </button>
      <button
        type="button"
        class="top-menu__item"
        role="menuitem"
        @click="$emit('capture-video')"
        :title="tooltip(menuTooltips.captureVideo)"
      >
        <Icon icon="mdi:video" />
        <span>{{ menu.captureVideo }}</span>
      </button>
      <button
        type="button"
        class="top-menu__item"
        role="menuitem"
        @click="$emit('timeline-import')"
        :title="tooltip(menuTooltips.timelineImport)"
      >
        <Icon icon="mdi:timeline-clock-outline" />
        <span>{{ menu.timelineImport }}</span>
      </button>
      <button
        type="button"
        class="top-menu__item"
        role="menuitem"
        :disabled="!timelineExportEnabled"
        :aria-disabled="!timelineExportEnabled"
        @click="$emit('timeline-export')"
        :title="tooltip(timelineExportEnabled ? menuTooltips.timelineExport : menuTooltips.timelineExportDisabled)"
      >
        <Icon icon="mdi:timeline-text-outline" />
        <span>{{ menu.timelineExport }}</span>
      </button>
      <button
        type="button"
        class="top-menu__item"
        role="menuitem"
        @click="$emit('clear-cache')"
        :title="tooltip(menuTooltips.clearCache)"
      >
        <Icon icon="mdi:trash-can-outline" />
        <span>{{ menu.clearCache }}</span>
      </button>
      <button
        type="button"
        class="top-menu__item"
        role="menuitem"
        @click="handleExportProject"
        :title="tooltip(menuTooltips.exportProject)"
      >
        <Icon icon="mdi:package-down" />
        <span>{{ menu.exportProject || 'Export Project' }}</span>
      </button>
      <button
        type="button"
        class="top-menu__item"
        role="menuitem"
        @click="handleImportProject"
        :title="tooltip(menuTooltips.importProject)"
      >
        <Icon icon="mdi:package-up" />
        <span>{{ menu.importProject || 'Import Project' }}</span>
      </button>
      <button
        type="button"
        class="top-menu__item"
        role="switch"
        :aria-checked="showCaptions"
        @click="$emit('toggle-captions')"
        :title="tooltip(showCaptions ? menuTooltips.captionsOn : menuTooltips.captionsOff)"
      >
        <Icon :icon="showCaptions ? 'mdi:tooltip-text-outline' : 'mdi:tooltip-outline'" />
        <span>{{ menu.captions }} {{ showCaptions ? common.on : common.off }}</span>
      </button>
    </nav>
    <div class="top-menu__actions">
      <LanguageSelector />
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import LanguageSelector from '../LanguageSelector.vue'
import { useI18n } from '../../locales/index.js'

const props = defineProps({
  showCaptions: {
    type: Boolean,
    default: true
  },
  timelineExportEnabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'import',
  'import-audio',
  'export',
  'capture-image',
  'capture-video',
  'clear-cache',
  'export-project',
  'import-project',
  'toggle-captions',
  'timeline-import',
  'timeline-export'
])

const { t } = useI18n()
const menu = computed(() => t.value?.menu ?? {})
const menuTooltips = computed(() => t.value?.menuTooltips ?? {})
const common = computed(() => t.value?.common ?? {})
const brand = computed(() => t.value?.brand ?? {})
const aria = computed(() => t.value?.aria ?? {})

const tooltip = message => {
  if (!props.showCaptions) return ''
  return message || ''
}

const handleExportProject = () => {
  console.log('[TopMenuBar] Export project button clicked')
  console.log('[TopMenuBar] Emitting export-project event')
  try {
    emit('export-project')
    console.log('[TopMenuBar] Event emitted successfully')
  } catch (error) {
    console.error('[TopMenuBar] Failed to emit event:', error)
  }
}

const handleImportProject = () => {
  console.log('[TopMenuBar] Import project button clicked')
  console.log('[TopMenuBar] Emitting import-project event')
  try {
    emit('import-project')
    console.log('[TopMenuBar] Event emitted successfully')
  } catch (error) {
    console.error('[TopMenuBar] Failed to emit event:', error)
  }
}
</script>

<style scoped>
.top-menu {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: stretch;
  gap: 0.5rem;
  padding: 0 1rem;
  height: var(--menubar-height, 48px);
  background: var(--surface-strong, rgba(24, 26, 32, 0.95));
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
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
  font-size: 0.95rem;
}

.top-menu__beta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-on-accent, #ffffff);
  background: color-mix(in srgb, var(--accent, #2d8cff) 75%, rgba(255, 255, 255, 0.12));
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.18);
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
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  -webkit-app-region: no-drag;
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
