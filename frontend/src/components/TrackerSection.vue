<template>
  <!-- モデル選択（一番上） -->
  <div v-if="models && models.length > 0" class="row">
    <label class="stretch">
      <span>{{ trackerTexts.selectModel || 'Select Model' }}</span>
      <select
        :value="selectedModelIndex"
        @change="emit('update:selectedModelIndex', Number($event.target.value))"
      >
        <option :value="-1">{{ trackerTexts.allModels || 'All Models' }}</option>
        <option
          v-for="(model, idx) in models"
          :key="idx"
          :value="idx"
        >
          {{ model?.name || `${trackerTexts.modelLabel || 'Model'} ${idx + 1}` }}
        </option>
      </select>
    </label>
  </div>

  <div class="row row--header">
    <label class="checkbox" :class="{ disabled: !hasModelsLoaded }">
      <input 
        type="checkbox" 
        :checked="virtualTrackersEnabled" 
        :disabled="!hasModelsLoaded"
        @change="onEnabledChange($event.target.checked)"
        :title="!hasModelsLoaded ? trackerTexts.loadModelFirst : ''"
      >
      <span>{{ trackerTexts.enable }}</span>
    </label>
    <div class="actions">
      <button type="button" class="ghost" @click="$emit('reset-virtual-trackers')">{{ trackerTexts.resetPosition }}</button>
      <button type="button" class="ghost" @click="$emit('reset-virtual-tracker-rotations')">{{ trackerTexts.resetRotation }}</button>
    </div>
  </div>
      <div class="row row--toggles">
        <label class="checkbox">
          <input type="checkbox" :checked="virtualTrackerDisplayVisible" @change="onDisplayToggle($event.target.checked)">
          <span>{{ trackerTexts.display }}</span>
        </label>
        <label class="checkbox">
          <input type="checkbox" :checked="showVirtualTrackerLabels" @change="emit('update:showVirtualTrackerLabels', $event.target.checked)">
          <span>{{ trackerTexts.showLabels }}</span>
        </label>
      </div>
      <div class="row">
        <label class="stretch">
          {{ trackerTexts.trackerSize }}
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
          {{ trackerTexts.labelSize }}
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
      
      <!-- 回転軸表示設宁E-->
      <div class="row row--toggles">
        <label class="checkbox">
          <input type="checkbox" :checked="showTrackerAxes" @change="emit('update:showTrackerAxes', $event.target.checked)">
          <span>{{ trackerTexts.showAxes }}</span>
        </label>
      </div>
      <div v-if="showTrackerAxes" class="row">
        <label class="stretch">
          {{ trackerTexts.axesLength }}
          <input
            type="range"
            min="0.01"
            max="0.1"
            step="0.01"
            :value="trackerAxesLength"
            @input="emit('update:trackerAxesLength', toNumber($event.target.value, trackerAxesLength))"
          >
        </label>
      </div>

      <div class="row">
        <div class="axis-slider twist-slider">
          <span class="axis-label">{{ trackerTexts.forearmTwist }}</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="forearmTwistShare"
            @input="updateForearmTwistShare($event.target.value)"
          >
          <span class="axis-value">{{ forearmTwistSharePercent }}%</span>
        </div>
      </div>
      
      <!-- トラチE��ー個別設宁E-->
      <div v-if="virtualTrackersEnabled && selectedTracker" class="tracker-settings">
        <h4 class="settings-title">{{ trackerSettingsTitle }}</h4>

        <div class="tracker-angles">
          <div class="tracker-angles__header">
            <label class="tracker-angles__order">
              <span class="tracker-angles__label">{{ trackerTexts.rotationOrder }}</span>
              <select
                class="tracker-angles__select"
                :value="currentRotationOrder"
                @change="onRotationOrderChange($event.target.value)"
              >
                <option
                  v-for="option in rotationOrderOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>
            <button
              type="button"
              class="btn-reset-small tracker-angles__reset"
              @click="$emit('reset-tracker-rotation')"
              :title="trackerTexts.resetRotation"
            >
              <Icon icon="mdi:restore" />
              <span>{{ commonTexts.reset }}</span>
            </button>
          </div>

          <div
            v-for="axis in angleAxes"
            :key="axis.key"
            class="angle-axis"
          >
            <div class="angle-axis__header">
              <span class="angle-axis__label">{{ axis.label }}</span>
              <span class="angle-axis__value">{{ formatAngle(axis.key) }}°</span>
            </div>
            <input
              class="angle-axis__slider"
              type="range"
              min="-180"
              max="180"
              step="1"
              :value="trackerRotation[axis.key]"
              @input="updateTrackerRotationAngle(axis.key, $event.target.value)"
            >
          </div>
        </div>
      </div>

  <!-- Google AdSense広告 -->
  <GoogleAdUnit variant="square" ad-slot="tracker-section" />
</template>

<script setup>
import { toRefs, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useI18n } from '../locales/index.js'
import { ROTATION_AXIS_OPTIONS } from '../composables/useVirtualTrackers.js'
import GoogleAdUnit from './GoogleAdUnit.vue'

const props = defineProps({
  virtualTrackersEnabled: { type: Boolean, default: false },
  virtualTrackerDisplayVisible: { type: Boolean, default: true },
  showVirtualTrackerLabels: { type: Boolean, default: true },
  virtualTrackerSize: { type: Number, default: 0.08 },
  virtualTrackerLabelScale: { type: Number, default: 1.0 },
  forearmTwistShare: { type: Number, default: 0.7 },
  hasModelsLoaded: { type: Boolean, default: false },
  selectedTracker: { type: String, default: null },
  selectedTrackerLabel: { type: String, default: '' },
  trackerPosition: { type: Object, default: () => ({ x: 0, y: 0, z: 0 }) },
  trackerRotation: { type: Object, default: () => ({ x: 0, y: 0, z: 0 }) },
  trackerRotationOrder: { type: String, default: 'YXZ' },
  trackerRotationOrders: { type: Array, default: () => [] },
  showTrackerAxes: { type: Boolean, default: false },
  trackerAxesLength: { type: Number, default: 0.05 },
  models: { type: Array, default: () => [] },
  selectedModelIndex: { type: Number, default: -1 }
})

const emit = defineEmits([
  'update:virtualTrackersEnabled',
  'update:virtualTrackerDisplayVisible',
  'update:showVirtualTrackerLabels',
  'update:virtualTrackerSize',
  'update:virtualTrackerLabelScale',
  'update:showTrackerAxes',
  'update:trackerAxesLength',
  'update:forearmTwistShare',
  'update:tracker-rotation-order',
  'reset-virtual-trackers',
  'reset-virtual-tracker-rotations',
  'update:tracker-rotation',
  'reset-tracker-rotation',
  'update:selectedModelIndex'
])

const {
  virtualTrackersEnabled,
  virtualTrackerDisplayVisible,
  showVirtualTrackerLabels,
  virtualTrackerSize,
  virtualTrackerLabelScale,
  forearmTwistShare,
  showTrackerAxes,
  trackerAxesLength,
  selectedTrackerLabel
} = toRefs(props)

const { t } = useI18n()
const trackerTexts = computed(() => t.value?.tracker ?? {})
const commonTexts = computed(() => t.value?.common ?? {})
const trackerSettingsTitle = computed(() => {
  const label = selectedTrackerLabel.value?.trim()
  const suffix = trackerTexts.value.settings || 'Settings'
  return label ? `${label} ${suffix}` : suffix
})

const forearmTwistSharePercent = computed(() => {
  const value = Number(forearmTwistShare.value)
  if (!Number.isFinite(value)) return 70
  return Math.round(Math.min(1, Math.max(0, value)) * 100)
})

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

const updateTrackerRotationAngle = (axis, value) => {
  const numValue = toNumber(value, props.trackerRotation[axis])
  emit('update:tracker-rotation', { axis, value: numValue })
}

const onRotationAxisChange = value => {
  const raw = typeof value === 'string' ? value.trim().toUpperCase() : '+Z'
  const next = ROTATION_AXIS_OPTIONS.some(option => option.value === raw) ? raw : '+Z'
  emit('update:tracker-rotation-axis', next)
}
const updateForearmTwistShare = value => {
  const numValue = Math.min(1, Math.max(0, toNumber(value, props.forearmTwistShare)))
  emit('update:forearmTwistShare', numValue)
}

const angleAxes = [
  { key: 'x', label: 'X' },
  { key: 'y', label: 'Y' },
  { key: 'z', label: 'Z' }
]

const rotationAxisOptions = computed(() =>
  ROTATION_AXIS_OPTIONS.map(option => ({
    value: option.value,
    label: option.value === '+Z'
      ? (trackerTexts.value.rotationAxisAuto || 'Auto (+Z)')
      : option.label || option.value
  }))
)

const rotationAxisValue = computed(() => {
  const raw = typeof props.trackerRotationAxis === 'string'
    ? props.trackerRotationAxis.trim().toUpperCase()
    : '+Z'
  return ROTATION_AXIS_OPTIONS.some(option => option.value === raw) ? raw : '+Z'
})
const sanitizeOrder = value => {
  if (typeof value !== 'string') return 'XYZ'
  const upper = value.toUpperCase().replace(/[^XYZ]/g, '')
  return upper.length === 3 ? upper : 'XYZ'
}

const rotationOrderOptions = computed(() => {
  const base = Array.isArray(props.trackerRotationOrders) && props.trackerRotationOrders.length
    ? props.trackerRotationOrders
    : ['XYZ', 'XZY', 'YXZ', 'YZX', 'ZXY', 'ZYX']
  return base.map(order => {
    const value = sanitizeOrder(order)
    return {
      value,
      label: value.split('').join(' - ')
    }
  })
})

const currentRotationOrder = computed(() => sanitizeOrder(props.trackerRotationOrder || 'XYZ'))

const onRotationOrderChange = value => {
  const next = sanitizeOrder(value)
  if (!next) return
  emit('update:tracker-rotation-order', next)
}

const formatAngle = axis => {
  const raw = props.trackerRotation?.[axis]
  const num = Number(raw)
  return Number.isFinite(num) ? num.toFixed(1) : '0.0'
}
</script>

<style scoped>
/* ===== レイアウチE===== */
.row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 0.85rem;
  width: 100%;
  min-width: 0;
}

.row--header {
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 1rem;
}

.row--toggles {
  justify-content: flex-start;
  gap: 1.5rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

/* ===== ラベル・チE��スチE===== */
label {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.85rem;
  color: var(--text-muted, rgba(240, 245, 255, 0.82));
  font-weight: 400;
  transition: color 0.2s ease;
}

label:hover {
  color: var(--text-strong, #f4f6ff);
}

label.stretch {
  flex: 1 1 100%;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.6rem;
}

/* ===== ボタン ===== */
.ghost {
  background: var(--control-surface, rgba(48, 54, 70, 0.9));
  color: rgba(255, 255, 255, 0.85);
  border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.12));
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  box-shadow: none;
}

.ghost:hover {
  background: var(--control-surface-hover, rgba(58, 64, 81, 0.95));
  border-color: var(--panel-border-strong, rgba(255, 255, 255, 0.18));
  color: #fff;
  transform: translateY(-1px);
}

.ghost:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring, 0 0 0 2px rgba(79, 111, 184, 0.35));
}

.settings-title {
  margin: 0 0 1rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-strong, rgba(255, 255, 255, 0.95));
  letter-spacing: 0.02em;
  text-shadow: none;
}

/* ===== リセチE��ボタン ===== */
.btn-reset-small {
  background: var(--control-surface, rgba(48, 54, 70, 0.85));
  border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.12));
  color: rgba(255, 176, 120, 0.9);
  padding: 0.3rem 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  box-shadow: none;
}

.btn-reset-small:hover {
  background: var(--control-surface-hover, rgba(58, 64, 81, 0.95));
  border-color: rgba(255, 176, 120, 0.4);
  color: rgba(255, 196, 140, 1);
  transform: translateY(-1px);
}

/* ===== 入力フィールチE===== */
.tracker-settings {
  margin-top: 1.25rem;
  padding: 0;
  background: transparent;
  border-radius: 0;
  border: none;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ===== 角度スライダー ===== */
.angle-controls,
.axis-controls {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.angle-slider,
.axis-slider {
  display: grid;
  grid-template-columns: minmax(8.5rem, 0.6fr) minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
}

.twist-slider {
  grid-template-columns: minmax(9rem, 0.65fr) minmax(0, 1fr) auto;
}

.angle-label,
.axis-label {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
}

.angle-value,
.axis-value {
  font-size: 0.8rem;
  color: rgba(66, 165, 245, 0.9);
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  font-family: 'Consolas', 'Monaco', monospace;
}

.tracker-angles {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.25rem 0 0.5rem;
}

.tracker-angles__header {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.tracker-angles__order {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
  color: var(--text-muted, rgba(240, 245, 255, 0.78));
}

.tracker-angles__label {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.05em;
}

.tracker-angles__select {
  appearance: none;
  border-radius: 6px;
  border: 1px solid rgba(140, 168, 235, 0.35);
  background: var(--control-surface, rgba(48, 54, 70, 0.9));
  color: rgba(240, 244, 255, 0.9);
  padding: 0.35rem 2.25rem 0.35rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  font-family: 'Consolas', 'Monaco', monospace;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
  background-image: linear-gradient(45deg, transparent 50%, rgba(140, 168, 235, 0.9) 50%),
    linear-gradient(135deg, rgba(140, 168, 235, 0.9) 50%, transparent 50%);
  background-position: calc(100% - 18px) calc(50% - 3px), calc(100% - 13px) calc(50% - 3px);
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;
}

.tracker-angles__select:hover,
.tracker-angles__select:focus-visible {
  outline: none;
  border-color: rgba(140, 168, 235, 0.65);
  background: var(--control-surface-hover, rgba(58, 64, 81, 0.95));
}

.tracker-angles__reset {
  margin-left: auto;
}

.angle-axis {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.angle-axis__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
}

.angle-axis__value {
  font-family: 'Consolas', 'Monaco', monospace;
  font-weight: 600;
  color: rgba(92, 140, 255, 0.92);
}

.angle-axis__slider {
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
  transition: background 0.2s ease;
}

.angle-axis__slider:hover {
  background: rgba(255, 255, 255, 0.18);
}

.angle-axis__slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background: var(--accent, #42a5f5);
  border-radius: 50%;
  border: none;
  box-shadow: none;
  transition: transform 0.2s ease, background 0.2s ease;
}

.angle-axis__slider::-webkit-slider-thumb:hover {
  transform: scale(1.12);
  background: color-mix(in srgb, var(--accent, #42a5f5) 100%, white 18%);
}

.angle-axis__slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: var(--accent, #42a5f5);
  border: none;
  border-radius: 50%;
  transition: transform 0.2s ease, background 0.2s ease;
}

.angle-axis__slider::-moz-range-thumb:hover {
  transform: scale(1.12);
  background: color-mix(in srgb, var(--accent, #42a5f5) 100%, white 18%);
}

@media (max-width: 520px) {
  .angle-slider,
  .axis-slider,
  .twist-slider {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .angle-label,
  .axis-label,
  .axis-value,
  .angle-value {
    text-align: left;
  }

  .angle-value,
  .axis-value {
    order: 3;
  }
}

/* ===== 色選抁E===== */
.color-control {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.color-label {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.85rem;
  padding: 0.5rem;
  background: var(--control-surface, rgba(48, 54, 70, 0.85));
  border-radius: 6px;
  border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.12));
}

.color-label span {
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
}

.color-label input[type="color"] {
  width: 3.5rem;
  height: 2.5rem;
  border: 2px solid var(--panel-border, rgba(255, 255, 255, 0.12));
  border-radius: 6px;
  cursor: pointer;
  background: transparent;
  transition: transform 0.2s ease, border-color 0.2s ease;
  box-shadow: none;
}

.color-label input[type="color"]:hover {
  border-color: rgba(92, 140, 255, 0.45);
  transform: scale(1.05);
  box-shadow: none;
}

.color-label input[type="color"]::-webkit-color-swatch-wrapper {
  padding: 3px;
}

.color-label input[type="color"]::-webkit-color-swatch {
  border: none;
  border-radius: 3px;
}

/* ===== セレクトボックス統一スタイル ===== */
select {
  appearance: none;
  width: 100%;
  padding: 0.45rem 2.25rem 0.45rem 0.75rem;
  border-radius: 6px;
  border: 1px solid rgba(140, 168, 235, 0.35);
  background: var(--control-surface, rgba(48, 54, 70, 0.9));
  color: rgba(240, 244, 255, 0.9);
  font-size: 0.85rem;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
  background-image: linear-gradient(45deg, transparent 50%, rgba(140, 168, 235, 0.9) 50%),
    linear-gradient(135deg, rgba(140, 168, 235, 0.9) 50%, transparent 50%);
  background-position: calc(100% - 18px) calc(50% - 3px), calc(100% - 13px) calc(50% - 3px);
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;
}

select:hover,
select:focus {
  outline: none;
  border-color: rgba(140, 168, 235, 0.65);
  background-color: var(--control-surface-hover, rgba(58, 64, 81, 0.95));
}

</style>






