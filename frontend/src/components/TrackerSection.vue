<template>
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
      <button type="button" class="ghost" @click="$emit('reset-virtual-tracker-rotations')">角度リセット</button>
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
      
      <!-- 回転軸表示設定 -->
      <div class="row row--toggles">
        <label class="checkbox">
          <input type="checkbox" :checked="showTrackerAxes" @change="emit('update:showTrackerAxes', $event.target.checked)">
          <span>回転軸表示</span>
        </label>
      </div>
      <div v-if="showTrackerAxes" class="row">
        <label class="stretch">
          回転軸の長さ
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
          <span class="axis-label">前腕ツイスト配分</span>
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
      <!-- トラッカー個別設定 -->
      <div v-if="virtualTrackersEnabled && selectedTracker" class="tracker-settings">
        <h4 class="settings-title">{{ selectedTrackerLabel }} 設定</h4>
        
        <!-- 位置設定 (直接入力) -->
        <div class="setting-group">
          <div class="setting-group__header">
            <h5>位置</h5>
            <button type="button" class="btn-reset-small" @click="$emit('reset-tracker-position')" title="位置リセット">
              <Icon icon="mdi:restore" />
              <span>リセット</span>
            </button>
          </div>
          <div class="xyz-controls">
            <label class="xyz-item">
              <span class="xyz-label">X:</span>
              <input type="number" step="0.01" :value="trackerPosition.x" @input="updateTrackerPositionAxis('x', $event.target.value)">
            </label>
            <label class="xyz-item">
              <span class="xyz-label">Y:</span>
              <input type="number" step="0.01" :value="trackerPosition.y" @input="updateTrackerPositionAxis('y', $event.target.value)">
            </label>
            <label class="xyz-item">
              <span class="xyz-label">Z:</span>
              <input type="number" step="0.01" :value="trackerPosition.z" @input="updateTrackerPositionAxis('z', $event.target.value)">
            </label>
          </div>
        </div>
        
        <!-- 角度設定 (バー) -->
        <div class="setting-group">
          <div class="setting-group__header">
            <h5>角度</h5>
            <button type="button" class="btn-reset-small" @click="$emit('reset-tracker-rotation')" title="角度リセット">
              <Icon icon="mdi:restore" />
              <span>リセット</span>
            </button>
          </div>
          <!-- オイラー角の回転順序選択 -->
          <div class="euler-order-row">
            <label class="euler-order-label">
              回転順序:
              <select 
                class="euler-order-select"
                :value="trackerRotationOrder"
                @change="$emit('update:tracker-rotation-order', $event.target.value)"
              >
                <option value="XYZ">XYZ</option>
                <option value="XZY">XZY</option>
                <option value="YXZ">YXZ</option>
                <option value="YZX">YZX</option>
                <option value="ZXY">ZXY</option>
                <option value="ZYX">ZYX</option>
              </select>
            </label>
          </div>
          <div class="angle-controls">
            <label class="angle-slider">
              <span class="angle-label">X軸 (Pitch):</span>
              <input 
                type="range" 
                min="-180" 
                max="180" 
                step="1" 
                :value="trackerRotation.x"
                @input="updateTrackerRotationAxis('x', $event.target.value)"
              >
              <span class="angle-value">{{ trackerRotation.x.toFixed(1) }}°</span>
            </label>
            <label class="angle-slider">
              <span class="angle-label">Y軸 (Yaw):</span>
              <input 
                type="range" 
                min="-180" 
                max="180" 
                step="1" 
                :value="trackerRotation.y"
                @input="updateTrackerRotationAxis('y', $event.target.value)"
              >
              <span class="angle-value">{{ trackerRotation.y.toFixed(1) }}°</span>
            </label>
            <label class="angle-slider">
              <span class="angle-label">Z軸 (Roll):</span>
              <input 
                type="range" 
                min="-180" 
                max="180" 
                step="1" 
                :value="trackerRotation.z"
                @input="updateTrackerRotationAxis('z', $event.target.value)"
              >
              <span class="angle-value">{{ trackerRotation.z.toFixed(1) }}°</span>
            </label>
          </div>
        </div>
        
      </div>
</template>

<script setup>
import { toRefs, computed } from 'vue'
import { Icon } from '@iconify/vue'

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
  showTrackerAxes: { type: Boolean, default: false },
  trackerAxesLength: { type: Number, default: 0.05 }
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
  'update:tracker-position',
  'update:tracker-rotation',
  'reset-tracker-position',
  'reset-tracker-rotation'
])

const {
  virtualTrackersEnabled,
  virtualTrackerDisplayVisible,
  showVirtualTrackerLabels,
  virtualTrackerSize,
  virtualTrackerLabelScale,
  forearmTwistShare,
  showTrackerAxes,
  trackerAxesLength
} = toRefs(props)

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

const updateTrackerPositionAxis = (axis, value) => {
  const numValue = toNumber(value, props.trackerPosition[axis])
  emit('update:tracker-position', { axis, value: numValue })
}

const updateTrackerRotationAxis = (axis, value) => {
  const numValue = toNumber(value, props.trackerRotation[axis])
  emit('update:tracker-rotation', { axis, value: numValue })
}

const updateForearmTwistShare = value => {
  const numValue = Math.min(1, Math.max(0, toNumber(value, props.forearmTwistShare)))
  emit('update:forearmTwistShare', numValue)
}
</script>

<style scoped>
/* ===== レイアウト ===== */
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

/* ===== ラベル・テキスト ===== */
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
  margin: 0 0 1.25rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-strong, rgba(255, 255, 255, 0.95));
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--panel-border, rgba(255, 255, 255, 0.12));
  letter-spacing: 0.02em;
  text-shadow: none;
}

.setting-group {
  margin-bottom: 1.25rem;
  padding: 0.75rem;
  background: var(--control-surface, rgba(48, 54, 70, 0.85));
  border-radius: 8px;
  border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.12));
}

.setting-group__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.setting-group h5 {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* ===== リセットボタン ===== */
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

/* ===== 入力フィールド ===== */
.xyz-controls {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.xyz-item {
  display: grid;
  grid-template-columns: 2.5rem 1fr;
  align-items: center;
  gap: 0.6rem;
}

.xyz-label {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
}

.xyz-item input[type="number"] {
  padding: 0.4rem 0.6rem;
  background: var(--panel-surface-alt, rgba(52, 58, 72, 0.85));
  border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.12));
  border-radius: 6px;
  color: #fff;
  box-shadow: none;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.xyz-item input[type="number"]:focus {
  outline: none;
  border-color: rgba(92, 140, 255, 0.45);
  background: var(--control-surface-hover, rgba(58, 64, 81, 0.95));
}

.tracker-settings {
  margin-top: 1.5rem;
  padding: 1.25rem;
  background: var(--control-surface, rgba(48, 54, 70, 0.85));
  border-radius: 12px;
  border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.12));
  box-shadow: none;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.input-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 0.65rem;
}

.input-row label {
  display: flex;
  flex-direction: column;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
}

.input-row input[type="number"] {
  margin-top: 0.25rem;
  padding: 0.3rem 0.5rem;
  background: var(--panel-surface-alt, rgba(52, 58, 72, 0.85));
  border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.12));
  border-radius: 4px;
  color: #fff;
  font-size: 0.8rem;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.input-row input[type="number"]:focus {
  outline: none;
  border-color: rgba(92, 140, 255, 0.6);
  background: var(--control-surface-hover, rgba(58, 64, 81, 0.95));
}

/* ===== オイラー角回転順序選択 ===== */
.euler-order-row {
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  background: var(--control-surface, rgba(48, 54, 70, 0.85));
  border-radius: 6px;
  border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.12));
}

.euler-order-label {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
}

.euler-order-select {
  padding: 0.4rem 0.6rem;
  background: var(--panel-surface-alt, rgba(52, 58, 72, 0.85));
  border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.12));
  border-radius: 6px;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
  box-shadow: none;
}

.euler-order-select:hover {
  border-color: rgba(92, 140, 255, 0.4);
  background: var(--control-surface-hover, rgba(58, 64, 81, 0.95));
}

.euler-order-select:focus {
  outline: none;
  border-color: rgba(66, 165, 245, 0.6);
  box-shadow: var(--focus-ring, 0 0 0 2px rgba(79, 111, 184, 0.35));
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

/* ===== 色選択 ===== */
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

</style>
