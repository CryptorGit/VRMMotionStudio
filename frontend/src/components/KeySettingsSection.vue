<template>
  <section class="key-settings">
    <header class="key-settings__header">
      <div class="key-settings__title">
        <p v-if="hasSelection" class="key-settings__subtitle">
          {{ keysTexts.selected }} {{ selectionCount }} {{ keysTexts.items }}<span v-if="hasMultiple"> ({{ keysTexts.multiSelect }})</span>
        </p>
        <p v-else class="key-settings__subtitle">
          {{ keysTexts.selectPrompt }}
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
      <p>{{ keysTexts.noSelection }}</p>
    </div>

    <p v-if="hasSelection && !hasMultiple" class="key-settings__hint">
      {{ keysTexts.multiSelectHint }}
    </p>

    <div v-if="hasMultiple" class="key-settings__curve-editor">
      <!-- トラチE��ー選抁E-->
      <div class="curve-tracker-selector">
        <label class="tracker-label">
          <span>{{ keysTexts.targetTracker }}</span>
          <select v-model="selectedTracker" class="tracker-select">
            <option value="default">{{ keysTexts.allDefault }}</option>
            <option v-for="tracker in availableTrackers" :key="tracker.key" :value="tracker.key">
              {{ tracker.label }}
            </option>
          </select>
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
import { computed, ref, watch, onMounted } from 'vue'
import { useI18n } from '../locales/index.js'
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

const { t } = useI18n()
const keysTexts = computed(() => t.value?.keys ?? {})

const selectedTracker = ref('default')
// トラチE��ーごとのカーブ色を保持�E�トラチE��ー色と同期�E�E
const trackerCurveColors = ref(new Map())

// ========================================
// Utility functions (must be defined before use)
// ========================================

// チE��ォルトカラー�E�バーチャルトラチE��ーの色と一致�E�E
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

const normalizeColor = (color, fallback = '#5c8cff') => {
  if (typeof color === 'string' && color.trim()) {
    const trimmed = color.trim()
    return trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  }
  return fallback
}

const areIdArraysEqual = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b)) return false
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false
  }
  return true
}

function resetTrackerColorCache() {
  if (trackerCurveColors.value.size === 0) return
  trackerCurveColors.value = new Map()
}

function rememberTrackerColor(key, color) {
  if (!key) return
  const normalized = normalizeColor(color, getDefaultColor(key))
  const current = trackerCurveColors.value.get(key)
  if (current === normalized) return
  const next = new Map(trackerCurveColors.value)
  next.set(key, normalized)
  trackerCurveColors.value = next
}

// Helper function to update tracker color cache from frames
function updateTrackerColorCache() {
  const frames = props.selection?.frames
  selectedTracker.value = 'default'
  resetTrackerColorCache()
  
  if (Array.isArray(frames) && frames.length > 0) {
    frames.forEach(frame => {
      const curves = frame?.curves || {}
      Object.keys(curves).forEach(key => {
        if (curves[key]?.color) {
          rememberTrackerColor(key, curves[key].color)
        }
      })
    })
  }
}

// ========================================
// Computed properties and watches
// ========================================

const trackerKeySet = computed(() => {
  const keys = new Set(['default'])
  if (Array.isArray(props.availableTrackers)) {
    for (const tracker of props.availableTrackers) {
      if (tracker?.key) keys.add(tracker.key)
    }
  }
  if (Array.isArray(props.selection?.frames)) {
    for (const frame of props.selection.frames) {
      if (frame?.curves && typeof frame.curves === 'object') {
        Object.keys(frame.curves).forEach(key => {
          if (key) keys.add(key)
        })
      }
    }
  }
  return keys
})

watch(trackerKeySet, keys => {
  if (!keys.has(selectedTracker.value)) {
    selectedTracker.value = 'default'
  }
})

// キーフレーム選択が変更された時にデータを適切に更新
// 重要: このwatchは、別の設定タブに移動しても実行される可能性があるため、
// selection自体がnullになった場合も適切に処理する必要がある
watch(
  () => {
    // selection が存在し、かつ selectedIds が配列の場合のみ監視
    if (props.selection && Array.isArray(props.selection.selectedIds)) {
      return props.selection.selectedIds.slice() // 配列のコピーを返して変更を追跡
    }
    return null
  },
  (newValue, oldValue) => {
    // selectionがnullの場合はデフォルトにリセット
    if (!props.selection) {
      selectedTracker.value = 'default'
      resetTrackerColorCache()
      return
    }

    // 配列が空の場合もデフォルトにリセット
    if (!Array.isArray(newValue) || newValue.length === 0) {
      selectedTracker.value = 'default'
      resetTrackerColorCache()
      return
    }

    // 配列の内容が同じ場合は処理をスキップ
    if (areIdArraysEqual(newValue, oldValue)) {
      return
    }

    // フレームデータを収集してカラーキャッシュを更新
    updateTrackerColorCache()
  }
)

// コンポーネントマウント時に初期化
onMounted(() => {
  // マウント時にselectionが存在する場合、カラーキャッシュを初期化
  if (props.selection && Array.isArray(props.selection.selectedIds) && props.selection.selectedIds.length > 0) {
    selectedTracker.value = 'default'
    updateTrackerColorCache()
  }
})

// フレームチE�Eタが変わった時もキャチE��ュを更新
watch(
  () => props.selection?.frames,
  (frames) => {
    if (!Array.isArray(frames)) return
    // 吁E��レームから吁E��ラチE��ーのカーブ色を収雁E��てキャチE��ュを更新
    frames.forEach(frame => {
      const curves = frame?.curves || {}
      Object.keys(curves).forEach(key => {
        if (curves[key]?.color) {
          rememberTrackerColor(key, curves[key].color)
        }
      })
    })
  },
  { deep: true, immediate: true }
)

// 現在選択されてぁE��トラチE��ーのカーブ色�E�読み取り専用 - トラチE��ー色と同期�E�E
const curveColor = computed(() => {
  const trackerKey = selectedTracker.value
  
  // トラチE��ーごとのカーブ色をキャチE��ュから取得（優先！E
  if (trackerCurveColors.value.has(trackerKey)) {
    return trackerCurveColors.value.get(trackerKey)
  }
  
  const frames = Array.isArray(props.selection?.frames) ? props.selection.frames : []
  if (frames.length) {
    for (const frame of frames) {
      const curves = frame?.curves || {}
      if (trackerKey === 'default') {
        const color = curves.default?.color || frame?.curve?.color
        if (color) {
          const normalized = normalizeColor(color, getDefaultColor(trackerKey))
          rememberTrackerColor(trackerKey, normalized)
          return normalized
        }
      } else {
        const color = curves[trackerKey]?.color
        if (color) {
          const normalized = normalizeColor(color, getDefaultColor(trackerKey))
          rememberTrackerColor(trackerKey, normalized)
          return normalized
        }
      }
    }
  }
  // availableTrackersから該当トラチE��ーの色を取征E
  const tracker = props.availableTrackers?.find(t => t.key === trackerKey)
  if (tracker?.color) {
    const normalized = normalizeColor(tracker.color, getDefaultColor(trackerKey))
    rememberTrackerColor(trackerKey, normalized)
    return normalized
  }
  // 見つからなぁE��合�EチE��ォルト色を使用
  const defaultColor = getDefaultColor(trackerKey)
  rememberTrackerColor(trackerKey, defaultColor)
  return defaultColor
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
    return `${formatSeconds(start)} ↁE${formatSeconds(end)} (΁E${formatSeconds(span)})`
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
  // 子コンポ�EネントからtrackerKeyが�E示された場合�Eそれを尊重�E�E�E�トラチE�E��E�ー刁E�E��E�時�E旧トラチE�E��E�ー保存用�E�E�E�E
  const effectiveTrackerKey = payload?.trackerKey || selectedTracker.value
  const providedColor = typeof payload?.curveColor === 'string' ? payload.curveColor : null
  const normalizedProvided = providedColor ? normalizeColor(providedColor, getDefaultColor(effectiveTrackerKey)) : null
  const finalColor = normalizedProvided ?? curveColor.value
  rememberTrackerColor(effectiveTrackerKey, finalColor)
  emit('update-curves', {
    ...payload,
    trackerKey: effectiveTrackerKey,
    curveColor: finalColor
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

.key-settings__curve-editor :deep(.curve-editor) {
  width: 100%;
}
</style>




