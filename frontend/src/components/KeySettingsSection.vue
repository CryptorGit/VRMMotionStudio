<template>
  <section class="key-settings">
    <header class="key-settings__header">
      <div class="key-settings__title">
        <h2>繧ｭ繝ｼ險ｭ螳・/h2>
        <p v-if="hasSelection" class="key-settings__subtitle">
          驕ｸ謚樔ｸｭ {{ selectionCount }} 莉ｶ<span v-if="hasMultiple">・郁､・焚・・/span>
        </p>
        <p v-else class="key-settings__subtitle">
          繧ｿ繧､繝繝ｩ繧､繝ｳ縺ｧ繧ｭ繝ｼ繧帝∈謚槭☆繧九→隧ｳ邏ｰ縺瑚｡ｨ遉ｺ縺輔ｌ縺ｾ縺吶・
        </p>
      </div>
      <div v-if="hasSelection && rangeLabel" class="key-settings__range">
        <span>{{ rangeLabel }}</span>
      </div>
    </header>

    <div class="key-settings__controls">
      <label class="key-settings__toggle">
        <input type="checkbox" :checked="snap" @change="onSnapChange" />
        <span>繝輔Ξ繝ｼ繝縺ｫ繧ｹ繝翫ャ繝・/span>
      </label>
      <label class="key-settings__toggle">
        <input type="checkbox" :checked="loop" @change="onLoopChange" />
        <span>繝ｫ繝ｼ繝怜・逕・/span>
      </label>
      <button
        type="button"
        class="key-settings__btn key-settings__btn--danger"
        :disabled="!hasSelection"
        @click="onRemoveSelected"
      >
        驕ｸ謚槭＠縺溘く繝ｼ繧貞炎髯､
      </button>
    </div>

    <div v-if="hasSelection" class="key-settings__list">
      <div v-for="frame in frameRows" :key="frame.id" class="key-settings__row">
        <span class="key-settings__frame">{{ frame.frameLabel }}</span>
        <span class="key-settings__time">{{ frame.timeLabel }}</span>
      </div>
    </div>
    <div v-else class="key-settings__empty">
      <p>驕ｸ謚槭＆繧後◆繧ｭ繝ｼ縺ｯ縺ゅｊ縺ｾ縺帙ｓ縲・/p>
    </div>

    <p v-if="hasSelection && !hasMultiple" class="key-settings__hint">
      隍・焚縺ｮ繧ｭ繝ｼ繧帝∈謚槭☆繧九→繧､繝ｼ繧ｸ繝ｳ繧ｰ繧ｫ繝ｼ繝悶ｒ邱ｨ髮・〒縺阪∪縺吶・
    </p>

    <div v-if="hasMultiple" class="key-settings__curve-editor">
      <TimelineCurveEditor :frames="selection.frames" @update="onCurvesUpdate" />
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import TimelineCurveEditor from './timeline/TimelineCurveEditor.vue'

const props = defineProps({
  selection: {
    type: Object,
    default: () => ({
      frames: [],
      selectedIds: [],
      hasSelection: false,
      hasMultiple: false,
      startTime: null,
      endTime: null,
      duration: 0
    })
  },
  snap: { type: Boolean, default: true },
  loop: { type: Boolean, default: false }
})

const emit = defineEmits(['update:snap', 'update:loop', 'remove-selected', 'update-curves'])

const selectionCount = computed(() => Number(props.selection?.frames?.length ?? 0))
const hasSelection = computed(() => selectionCount.value > 0)
const hasMultiple = computed(() => selectionCount.value > 1)

const rangeLabel = computed(() => {
  if (!hasSelection.value) return ''
  const start = props.selection?.startTime
  const end = props.selection?.endTime
  if (hasMultiple.value && Number.isFinite(start) && Number.isFinite(end)) {
    const span = Math.max(0, end - start)
    return `${formatSeconds(start)} 竊・${formatSeconds(end)} (ﾎ・${formatSeconds(span)})`
  }
  const single = props.selection?.frames?.[0]?.time
  return Number.isFinite(single) ? formatSeconds(single) : ''
})

const frameRows = computed(() => {
  if (!Array.isArray(props.selection?.frames)) return []
  return props.selection.frames.map(frame => ({
    id: frame.id,
    frameLabel: frame.frameLabel || `#${frame.id}`,
    timeLabel: frame.timeLabel || formatSeconds(frame.time)
  }))
})

function formatSeconds(seconds) {
  if (!Number.isFinite(seconds)) return '--'
  const sign = seconds < 0 ? '-' : ''
  const abs = Math.abs(seconds)
  if (abs >= 10) return `${sign}${abs.toFixed(2)}s`
  return `${sign}${abs.toFixed(3)}s`
}

function onSnapChange(event) {
  emit('update:snap', event.target.checked)
}

function onLoopChange(event) {
  emit('update:loop', event.target.checked)
}

function onRemoveSelected() {
  emit('remove-selected')
}

function onCurvesUpdate(payload) {
  emit('update-curves', payload)
}
</script>

<style scoped>
.key-settings {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  color: var(--text-strong, #f4f8ff);
}

.key-settings__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.key-settings__title h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.key-settings__subtitle {
  margin: 0.2rem 0 0;
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.65);
}

.key-settings__range {
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  background: rgba(90, 140, 255, 0.12);
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.78rem;
  font-weight: 500;
  box-shadow: inset 0 0 0 1px rgba(120, 160, 255, 0.2);
}

.key-settings__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
}

.key-settings__toggle {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.65rem;
  border-radius: 10px;
  background: rgba(32, 36, 48, 0.65);
  color: rgba(240, 244, 255, 0.8);
  font-size: 0.85rem;
  box-shadow: inset 0 0 0 1px rgba(90, 120, 180, 0.22);
}

.key-settings__toggle input {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 6px;
  border: 1px solid rgba(140, 168, 235, 0.55);
  background: rgba(12, 16, 28, 0.4);
  position: relative;
  cursor: pointer;
}

.key-settings__toggle input:checked {
  background: color-mix(in srgb, var(--accent, #5c8cff) 85%, rgba(255, 255, 255, 0.2));
  border-color: color-mix(in srgb, var(--accent, #5c8cff) 70%, rgba(255, 255, 255, 0.4));
}

.key-settings__toggle input:checked::after {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.9);
}

.key-settings__btn {
  padding: 0.5rem 0.9rem;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
  color: rgba(12, 16, 24, 0.92);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(220, 230, 255, 0.55));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.45), 0 10px 24px rgba(18, 22, 36, 0.35);
}

.key-settings__btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
}

.key-settings__btn:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55), 0 14px 32px rgba(18, 22, 36, 0.45);
}

.key-settings__btn--danger {
  background: linear-gradient(180deg, rgba(255, 112, 128, 0.92), rgba(255, 80, 112, 0.82));
  color: #fff;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.3), 0 12px 24px rgba(255, 68, 102, 0.35);
}

.key-settings__list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.75rem 0.9rem;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(26, 30, 44, 0.85), rgba(18, 20, 30, 0.92));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.key-settings__row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.85rem;
  color: rgba(240, 244, 255, 0.78);
}

.key-settings__frame {
  font-weight: 600;
}

.key-settings__time {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
}

.key-settings__empty {
  padding: 0.8rem 1rem;
  border-radius: 12px;
  background: rgba(24, 28, 40, 0.7);
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.82rem;
}

.key-settings__hint {
  margin: 0;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.55);
}

.key-settings__curve-editor {
  padding: 0.75rem;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(25, 28, 40, 0.92), rgba(20, 22, 32, 0.92));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05), 0 12px 32px rgba(12, 15, 24, 0.35);
}

.key-settings__curve-editor :deep(.curve-editor) {
  width: 100%;
}
</style>


