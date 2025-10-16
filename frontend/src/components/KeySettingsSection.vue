<template>
  <section class="key-settings">
    <header class="key-settings__header">
      <div class="key-settings__title">
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
      <!-- 繝医Λ繝・き繝ｼ驕ｸ謚・-->
      <div class="curve-tracker-selector">
        <label class="tracker-label">
          <span>蟇ｾ雎｡繝医Λ繝・き繝ｼ</span>
          <select v-model="selectedTracker" class="tracker-select">
            <option value="default">縺ｾ縺ｨ繧√※・域悴險ｭ螳壹ヨ繝ｩ繝・き繝ｼ・・/option>
            <option v-for="tracker in availableTrackers" :key="tracker.key" :value="tracker.key">
              {{ tracker.label }}
            </option>
          </select>
        </label>
        <div class="color-display">
          <span class="color-display__label">繧ｫ繝ｼ繝冶牡</span>
          <div class="color-display__swatch" :style="{ backgroundColor: curveColor }" :title="`繝医Λ繝・き繝ｼ濶ｲ: ${curveColor} (閾ｪ蜍募酔譛・`"></div>
        </div>
      </div>
      <TimelineCurveEditor 
        :frames="selection.frames" 
        :tracker-key="selectedTracker"
        :curve-color="curveColor"
        @update="onCurvesUpdate" 
      />
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
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
  loop: { type: Boolean, default: false },
  availableTrackers: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:snap', 'update:loop', 'remove-selected', 'update-curves'])

const selectedTracker = ref('default')
// 繝医Λ繝・き繝ｼ縺斐→縺ｮ繧ｫ繝ｼ繝冶牡繧剃ｿ晄戟・医ヨ繝ｩ繝・き繝ｼ濶ｲ縺ｨ蜷梧悄・・
const trackerCurveColors = ref(new Map())

// 繝・ヵ繧ｩ繝ｫ繝医き繝ｩ繝ｼ・医ヰ繝ｼ繝√Ε繝ｫ繝医Λ繝・き繝ｼ縺ｮ濶ｲ縺ｨ荳閾ｴ・・
const getDefaultColor = (trackerKey) => {
  const defaultColors = {
    default: '#5c8cff',
    'head': '#3aa6ff',
    'chest': '#00c853',
    'hips': '#ff7043',
    'leftUpperArm': '#1e88e5',
    'rightUpperArm': '#e53935',
    'leftHand': '#2979ff',
    'rightHand': '#ff1744',
    'leftElbow': '#1565c0',
    'rightElbow': '#d50000',
    'leftFoot': '#009688',
    'rightFoot': '#00796b',
    'leftKnee': '#26a69a',
    'rightKnee': '#004d40',
    'gaze': '#ffeb3b'
  }
  return defaultColors[trackerKey] || '#5c8cff'
}

// 迴ｾ蝨ｨ驕ｸ謚槭＆繧後※縺・ｋ繝医Λ繝・き繝ｼ縺ｮ繧ｫ繝ｼ繝冶牡・郁ｪｭ縺ｿ蜿悶ｊ蟆ら畑 - 繝医Λ繝・き繝ｼ濶ｲ縺ｨ蜷梧悄・・
const curveColor = computed(() => {
  // availableTrackers縺九ｉ隧ｲ蠖薙ヨ繝ｩ繝・き繝ｼ縺ｮ濶ｲ繧貞叙蠕・
  const tracker = props.availableTrackers?.find(t => t.key === selectedTracker.value)
  if (tracker?.color) {
    return tracker.color
  }
  // 隕九▽縺九ｉ縺ｪ縺・ｴ蜷医・繝・ヵ繧ｩ繝ｫ繝郁牡繧剃ｽｿ逕ｨ
  return getDefaultColor(selectedTracker.value)
})

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

function onCurvesUpdate(payload) {
  // 蟄舌さ繝ｳ繝昴・繝阪Φ繝医°繧液rackerKey縺梧・遉ｺ縺輔ｌ縺溷ｴ蜷医・縺昴ｌ繧貞ｰ企㍾・医ヨ繝ｩ繝・き繝ｼ蛻・崛譎ゅ・譌ｧ繝医Λ繝・き繝ｼ菫晏ｭ倡畑・・
  const effectiveTrackerKey = payload?.trackerKey || selectedTracker.value
  emit('update-curves', {
    ...payload,
    trackerKey: effectiveTrackerKey,
    curveColor: curveColor.value
  })
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
  background: var(--control-surface, rgba(48, 54, 70, 0.85));
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.78rem;
  font-weight: 500;
  box-shadow: none;
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
  background: var(--control-surface, rgba(48, 54, 70, 0.85));
  color: rgba(240, 244, 255, 0.8);
  font-size: 0.85rem;
  box-shadow: none;
}

.key-settings__toggle input {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 6px;
  border: 1px solid rgba(140, 168, 235, 0.55);
  background: var(--panel-surface-alt, rgba(52, 58, 72, 0.85));
  position: relative;
  cursor: pointer;
}

.key-settings__toggle input:checked {
  background: rgba(79, 111, 184, 0.32);
  border-color: color-mix(in srgb, var(--accent, #5c8cff) 70%, rgba(255, 255, 255, 0.4));
}

.key-settings__toggle input:checked::after {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
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
  background: rgba(255, 255, 255, 0.08);
  box-shadow: none;
}

.key-settings__btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  box-shadow: none;
}

.key-settings__btn:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: none;
}

.key-settings__btn--danger {
  background: rgba(200, 80, 110, 0.85);
  color: #fff;
  box-shadow: none;
}

.key-settings__list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.75rem 0.9rem;
  border-radius: 14px;
  background: var(--control-surface, rgba(48, 54, 70, 0.85));
  box-shadow: none;
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
  background: var(--panel-surface-alt, rgba(52, 58, 72, 0.85));
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
  background: var(--control-surface, rgba(48, 54, 70, 0.85));
  box-shadow: none;
}

.curve-tracker-selector {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  align-items: flex-end;
}

.tracker-label,
.color-label {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: rgba(240, 244, 255, 0.85);
}

.tracker-label {
  flex: 1;
}

.tracker-select {
  padding: 0.5rem 0.65rem;
  border-radius: 8px;
  border: 1px solid rgba(140, 168, 235, 0.35);
  background: var(--panel-surface-alt, rgba(52, 58, 72, 0.85));
  color: rgba(240, 244, 255, 0.9);
  font-size: 0.85rem;
  cursor: pointer;
}

.tracker-select:focus {
  outline: none;
  border-color: rgba(140, 168, 235, 0.65);
  background: var(--panel-surface-alt, rgba(52, 58, 72, 0.85));
}

.color-display {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  align-items: flex-start;
}

.color-display__label {
  font-size: 0.85rem;
  color: rgba(240, 244, 255, 0.85);
}

.color-display__swatch {
  width: 80px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid rgba(140, 168, 235, 0.35);
  box-shadow: none;
  cursor: default;
}

.key-settings__curve-editor :deep(.curve-editor) {
  width: 100%;
}
</style>



