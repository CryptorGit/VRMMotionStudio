<template>
  <header class="top-menu" role="menubar">
    <div class="top-menu__brand">
      <Icon icon="mdi:arm-flex" class="top-menu__logo" aria-hidden="true" />
      <span class="top-menu__title">MokuMokuDance Web</span>
    </div>
    <nav class="top-menu__nav" aria-label="メインメニュー">
      <button
        type="button"
        class="top-menu__item"
        role="menuitem"
        @click="$emit('import')"
        :title="tooltip('モデルを読み込みます')"
      >
        <Icon icon="mdi:file-import" />
        <span>インポート</span>
      </button>
      <button
        type="button"
        class="top-menu__item"
        role="menuitem"
        @click="$emit('import-audio')"
        :title="tooltip('MP3音声ファイルを読み込みます')"
      >
        <Icon icon="mdi:music" />
        <span>MP3 読込</span>
      </button>
      <button
        type="button"
        class="top-menu__item"
        role="menuitem"
        @click="$emit('export')"
        :title="tooltip('現在のポーズをエクスポートします')"
      >
        <Icon icon="mdi:file-export" />
        <span>エクスポート</span>
      </button>
      <button
        type="button"
        class="top-menu__item"
        role="menuitem"
        @click="$emit('capture-image')"
        :title="tooltip('レンダー画像を書き出します')"
      >
        <Icon icon="mdi:image" />
        <span>画像書き出し</span>
      </button>
      <button
        type="button"
        class="top-menu__item"
        role="menuitem"
        @click="$emit('capture-video')"
        :title="tooltip('レンダー動画を書き出します')"
      >
        <Icon icon="mdi:video" />
        <span>動画書き出し</span>
      </button>
      <button
        type="button"
        class="top-menu__item"
        role="menuitem"
        @click="$emit('timeline-import')"
        :title="tooltip('タイムラインを読み込みます')"
      >
        <Icon icon="mdi:timeline-clock-outline" />
        <span>TL 読込</span>
      </button>
      <button
        type="button"
        class="top-menu__item"
        role="menuitem"
        :disabled="!timelineExportEnabled"
        :aria-disabled="!timelineExportEnabled"
        @click="$emit('timeline-export')"
        :title="tooltip(timelineExportEnabled ? 'タイムラインを保存します' : '保存できるタイムラインがありません')"
      >
        <Icon icon="mdi:timeline-text-outline" />
        <span>TL 保存</span>
      </button>
      <button
        type="button"
        class="top-menu__item"
        role="menuitem"
        @click="$emit('clear-cache')"
        :title="tooltip('読み込んだモデルや設定をリセットします')"
      >
        <Icon icon="mdi:trash-can-outline" />
        <span>キャッシュ削除</span>
      </button>
      <button
        type="button"
        class="top-menu__item"
        role="switch"
        :aria-checked="showCaptions"
        @click="$emit('toggle-captions')"
        :title="tooltip(showCaptions ? 'キャプション表示をOFFにします' : 'キャプション表示をONにします')"
      >
  <Icon :icon="showCaptions ? 'mdi:tooltip-text-outline' : 'mdi:tooltip-outline'" />
        <span>キャプション {{ showCaptions ? 'ON' : 'OFF' }}</span>
      </button>
    </nav>
    <div class="top-menu__actions"></div>
  </header>
</template>

<script setup>
import { Icon } from '@iconify/vue'

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
