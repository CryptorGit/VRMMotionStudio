<template>
  <section class="key-settings">
    <header class="key-settings__header">
      <div class="key-settings__title">
        <p v-if="hasSelection" class="key-settings__subtitle">
          選択中 {{ selectionCount }} 件<span v-if="hasMultiple">（複数）</span>
        </p>
        <p v-else class="key-settings__subtitle">
          タイムラインでキーを選択すると詳細が表示されます。
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
      <p>選択されたキーはありません。</p>
    </div>

    <p v-if="hasSelection && !hasMultiple" class="key-settings__hint">
      複数のキーを選択するとイージングカーブを編集できます。
    </p>

    <div v-if="hasMultiple" class="key-settings__curve-editor">
      <!-- トラッカー選択 -->
      <div class="curve-tracker-selector">
        <label class="tracker-label">
          <span>対象トラッカー</span>
          <select v-model="selectedTracker" class="tracker-select">
            <option value="all">すべて（イージングカーブ未設定）</option>
            <option v-for="tracker in availableTrackers" :key="tracker.key" :value="tracker.key">
              {{ tracker.label }}
            </option>
          </select>
        </label>
        <label class="color-label">
          <span>カーブ色</span>
          <input type="color" v-model="curveColor" class="color-input" />
        </label>
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

const selectedTracker = ref('all')
// トラッカーごとのカーブ色を保持
const trackerCurveColors = ref(new Map())

// デフォルトカラー（バーチャルトラッカーの色と一致）
const getDefaultColor = (trackerKey) => {
  const defaultColors = {
    'all': '#5c8cff',
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

// 現在選択されているトラッカーのカーブ色
const curveColor = computed({
  get() {
    if (!trackerCurveColors.value.has(selectedTracker.value)) {
      // 初回取得時はフレームデータから色を取得、なければデフォルト色
      const firstFrame = props.selection?.frames?.[0]
      if (firstFrame?.curves?.[selectedTracker.value]?.color) {
        return firstFrame.curves[selectedTracker.value].color
      }
      return getDefaultColor(selectedTracker.value)
    }
    return trackerCurveColors.value.get(selectedTracker.value)
  },
  set(newColor) {
    trackerCurveColors.value.set(selectedTracker.value, newColor)
  }
})

// トラッカー切り替え時にカーブ色を更新
watch(selectedTracker, (newTracker) => {
  if (!trackerCurveColors.value.has(newTracker)) {
    // フレームデータから色を取得
    const firstFrame = props.selection?.frames?.[0]
    if (firstFrame?.curves?.[newTracker]?.color) {
      trackerCurveColors.value.set(newTracker, firstFrame.curves[newTracker].color)
    } else {
      trackerCurveColors.value.set(newTracker, getDefaultColor(newTracker))
    }
  }
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
    return `${formatSeconds(start)} → ${formatSeconds(end)} (Δ ${formatSeconds(span)})`
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
  emit('update-curves', {
    ...payload,
    trackerKey: selectedTracker.value,
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
  background: rgba(12, 16, 28, 0.6);
  color: rgba(240, 244, 255, 0.9);
  font-size: 0.85rem;
  cursor: pointer;
}

.tracker-select:focus {
  outline: none;
  border-color: rgba(140, 168, 235, 0.65);
  background: rgba(12, 16, 28, 0.8);
}

.color-input {
  width: 80px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid rgba(140, 168, 235, 0.35);
  background: rgba(12, 16, 28, 0.6);
  cursor: pointer;
}

.color-input:focus {
  outline: none;
  border-color: rgba(140, 168, 235, 0.65);
}

.key-settings__curve-editor :deep(.curve-editor) {
  width: 100%;
}
</style>
