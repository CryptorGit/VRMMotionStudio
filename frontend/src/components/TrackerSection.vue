<template>
  <section class="section">
    <header class="section__header">
      <h3>バーチャルトラッカー</h3>
    </header>
    <div class="section__content">
      <div class="row row--header">
        <label class="checkbox" :class="{ disabled: !hasModelsLoaded }">
          <input 
            type="checkbox" 
            :checked="virtualTrackersEnabled" 
            :disabled="!hasModelsLoaded"
            @change="onEnabledChange($event.target.checked)"
            :title="!hasModelsLoaded ? 'モデルを読み込んでください' : ''"
          >
          <span>トラッカーを有効化</span>
        </label>
        <div class="actions">
          <button type="button" class="ghost" @click="$emit('reset-virtual-trackers')">位置リセット</button>
        </div>
      </div>
      <div class="row row--toggles">
        <label class="checkbox">
          <input type="checkbox" :checked="virtualTrackerDisplayVisible" @change="onDisplayToggle($event.target.checked)">
          <span>トラッカー表示</span>
        </label>
        <label class="checkbox">
          <input type="checkbox" :checked="showVirtualTrackerLabels" @change="emit('update:showVirtualTrackerLabels', $event.target.checked)">
          <span>ラベル表示</span>
        </label>
      </div>
      <div class="row">
        <label class="stretch">
          トラッカー表示サイズ
          <input
            type="range"
            min="0.005"
            max="0.06"
            step="0.001"
            :value="virtualTrackerSize"
            @input="emit('update:virtualTrackerSize', toNumber($event.target.value, virtualTrackerSize))"
          >
        </label>
      </div>
      <div class="row">
        <label class="stretch">
          ラベル表示サイズ
          <input
            type="range"
            min="0.05"
            max="2.0"
            step="0.05"
            :value="virtualTrackerLabelScale"
            @input="emit('update:virtualTrackerLabelScale', toNumber($event.target.value, virtualTrackerLabelScale))"
          >
        </label>
      </div>
      <p class="tracker-note">ビューポート上で直接ドラッグして調整してください。</p>
    </div>
  </section>
</template>

<script setup>
import { toRefs } from 'vue'

const props = defineProps({
  virtualTrackersEnabled: { type: Boolean, default: false },
  virtualTrackerDisplayVisible: { type: Boolean, default: true },
  showVirtualTrackerLabels: { type: Boolean, default: true },
  virtualTrackerSize: { type: Number, default: 0.08 },
  virtualTrackerLabelScale: { type: Number, default: 1.0 },
  hasModelsLoaded: { type: Boolean, default: false }
})

const emit = defineEmits([
  'update:virtualTrackersEnabled',
  'update:virtualTrackerDisplayVisible',
  'update:showVirtualTrackerLabels',
  'update:virtualTrackerSize',
  'update:virtualTrackerLabelScale',
  'reset-virtual-trackers'
])

const {
  virtualTrackersEnabled,
  virtualTrackerDisplayVisible,
  showVirtualTrackerLabels,
  virtualTrackerSize,
  virtualTrackerLabelScale
} = toRefs(props)

const toNumber = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

const onEnabledChange = value => {
  emit('update:virtualTrackersEnabled', !!value)
}

const onDisplayToggle = value => {
  emit('update:virtualTrackerDisplayVisible', !!value)
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

.row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.row--header {
  justify-content: space-between;
  align-items: center;
}

.row--toggles {
  justify-content: flex-start;
  gap: 1.5rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

label {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.82rem;
  color: var(--text-muted, rgba(240, 245, 255, 0.8));
}

label.checkbox {
  flex: 0 0 auto;
}

label.stretch {
  flex: 1 1 100%;
  flex-direction: column;
  align-items: flex-start;
}

.ghost {
  background: transparent;
  color: inherit;
  border: 1px solid rgba(255, 255, 255, 0.24);
  padding: 0.3rem 0.65rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.ghost:hover,
.ghost:focus-visible {
  background: rgba(80, 120, 200, 0.18);
  border-color: rgba(120, 170, 255, 0.45);
  color: #fff;
  outline: none;
}

.tracker-note {
  margin: 0.2rem 0 0;
  font-size: 0.75rem;
  opacity: 0.7;
}
</style>
