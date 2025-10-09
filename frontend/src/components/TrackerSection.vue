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

      <p class="tracker-note">ビューポート上で直接ドラッグして調整してください。</p>
      <p class="tracker-note">ツイスト配分は手首と前腕のねじりをどの程度共有するかを制御します。</p>
      
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
        
        <!-- 有効/無効設定 -->
        <div class="setting-group" v-if="selectedTracker !== 'gaze'">
          <div class="setting-group__header">
            <h5>表示</h5>
          </div>
          <div class="row row--toggles">
            <label class="checkbox">
              <input 
                type="checkbox" 
                :checked="trackerEnabled"
                @change="$emit('update:tracker-enabled', $event.target.checked)"
              >
              <span>このトラッカーを有効化</span>
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
  trackerEnabled: { type: Boolean, default: true },
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
  'update:tracker-enabled',
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
  gap: 0.5rem;
  margin-bottom: 0.75rem;
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
  gap: 0.5rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 400;
  transition: color 0.2s ease;
}

label:hover {
  color: rgba(255, 255, 255, 0.95);
}

label.checkbox {
  flex: 0 0 auto;
  cursor: pointer;
  user-select: none;
}

label.stretch {
  flex: 1 1 100%;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.6rem;
}

/* ===== チェックボックス ===== */
input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--accent, #42a5f5);
  transition: transform 0.15s ease;
}

input[type="checkbox"]:hover {
  transform: scale(1.1);
}

label.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

label.disabled input {
  cursor: not-allowed;
}

/* ===== レンジスライダー ===== */
input[type="range"] {
  width: 100%;
  height: 6px;
  background: linear-gradient(90deg, rgba(66, 165, 245, 0.15) 0%, rgba(66, 165, 245, 0.08) 100%);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

input[type="range"]:hover {
  background: linear-gradient(90deg, rgba(66, 165, 245, 0.25) 0%, rgba(66, 165, 245, 0.12) 100%);
  border-color: rgba(255, 255, 255, 0.12);
}

input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, #42a5f5 0%, #1e88e5 100%);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(66, 165, 245, 0.4), 0 0 0 0 rgba(66, 165, 245, 0);
  border: 2px solid rgba(255, 255, 255, 0.2);
}

input[type="range"]::-webkit-slider-thumb:hover {
  background: linear-gradient(135deg, #64b5f6 0%, #42a5f5 100%);
  transform: scale(1.2);
  box-shadow: 0 4px 12px rgba(66, 165, 245, 0.6), 0 0 0 4px rgba(66, 165, 245, 0.1);
  border-color: rgba(255, 255, 255, 0.4);
}

input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, #42a5f5 0%, #1e88e5 100%);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(66, 165, 245, 0.4);
}

input[type="range"]::-moz-range-thumb:hover {
  background: linear-gradient(135deg, #64b5f6 0%, #42a5f5 100%);
  transform: scale(1.2);
  box-shadow: 0 4px 12px rgba(66, 165, 245, 0.6);
  border-color: rgba(255, 255, 255, 0.4);
}

/* ===== ボタン ===== */
.ghost {
  background: linear-gradient(135deg, rgba(66, 165, 245, 0.08) 0%, rgba(30, 136, 229, 0.06) 100%);
  color: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(66, 165, 245, 0.25);
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.ghost:hover {
  background: linear-gradient(135deg, rgba(66, 165, 245, 0.18) 0%, rgba(30, 136, 229, 0.12) 100%);
  border-color: rgba(100, 181, 246, 0.4);
  color: #fff;
  box-shadow: 0 2px 8px rgba(66, 165, 245, 0.3);
  transform: translateY(-1px);
}

.ghost:active {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.ghost:focus-visible {
  outline: 2px solid rgba(66, 165, 245, 0.5);
  outline-offset: 2px;
}

/* ===== トラッカー設定エリア ===== */
.tracker-note {
  margin: 0.5rem 0;
  font-size: 0.75rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.6);
  padding: 0.5rem;
  background: rgba(66, 165, 245, 0.05);
  border-left: 3px solid rgba(66, 165, 245, 0.3);
  border-radius: 4px;
}

.tracker-settings {
  margin-top: 1.5rem;
  padding: 1.25rem;
  background: linear-gradient(135deg, rgba(36, 40, 52, 0.6) 0%, rgba(30, 34, 45, 0.6) 100%);
  border-radius: 12px;
  border: 1px solid rgba(66, 165, 245, 0.15);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.settings-title {
  margin: 0 0 1.25rem;
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  padding-bottom: 0.75rem;
  border-bottom: 2px solid rgba(66, 165, 245, 0.2);
  letter-spacing: 0.02em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.setting-group {
  margin-bottom: 1.25rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.04);
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
  background: linear-gradient(135deg, rgba(255, 87, 34, 0.08) 0%, rgba(244, 67, 54, 0.06) 100%);
  border: 1px solid rgba(255, 87, 34, 0.25);
  color: rgba(255, 152, 0, 0.9);
  padding: 0.3rem 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.btn-reset-small:hover {
  background: linear-gradient(135deg, rgba(255, 87, 34, 0.15) 0%, rgba(244, 67, 54, 0.12) 100%);
  border-color: rgba(255, 152, 0, 0.4);
  color: rgba(255, 193, 7, 1);
  box-shadow: 0 2px 6px rgba(255, 87, 34, 0.3);
  transform: translateY(-1px);
}

.btn-reset-small:active {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
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
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.25) 100%);
  border: 1px solid rgba(66, 165, 245, 0.2);
  border-radius: 6px;
  color: #fff;
  font-size: 0.85rem;
  font-family: 'Consolas', 'Monaco', monospace;
  transition: all 0.2s ease;
}

.xyz-item input[type="number"]:hover {
  border-color: rgba(66, 165, 245, 0.35);
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 0.3) 100%);
}

.xyz-item input[type="number"]:focus {
  outline: none;
  border-color: rgba(66, 165, 245, 0.6);
  box-shadow: 0 0 0 3px rgba(66, 165, 245, 0.1);
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.35) 100%);
}

.input-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
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
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: #fff;
  font-size: 0.8rem;
}

.input-row input[type="number"]:focus {
  outline: none;
  border-color: rgba(66, 165, 245, 0.6);
}

/* ===== オイラー角回転順序選択 ===== */
.euler-order-row {
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  background: rgba(66, 165, 245, 0.05);
  border-radius: 6px;
  border: 1px solid rgba(66, 165, 245, 0.15);
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
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 0.3) 100%);
  border: 1px solid rgba(66, 165, 245, 0.25);
  border-radius: 6px;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.euler-order-select:hover {
  border-color: rgba(66, 165, 245, 0.4);
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.35) 100%);
}

.euler-order-select:focus {
  outline: none;
  border-color: rgba(66, 165, 245, 0.6);
  box-shadow: 0 0 0 3px rgba(66, 165, 245, 0.1), 0 1px 3px rgba(0, 0, 0, 0.2);
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
  grid-template-columns: 7rem 1fr 4rem;
  align-items: center;
  gap: 0.75rem;
}

.twist-slider {
  grid-template-columns: 9rem 1fr 4rem;
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
  background: rgba(66, 165, 245, 0.05);
  border-radius: 6px;
  border: 1px solid rgba(66, 165, 245, 0.15);
}

.color-label span {
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
}

.color-label input[type="color"] {
  width: 3.5rem;
  height: 2.5rem;
  border: 2px solid rgba(255, 255, 255, 0.25);
  border-radius: 6px;
  cursor: pointer;
  background: transparent;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.color-label input[type="color"]:hover {
  border-color: rgba(66, 165, 245, 0.5);
  transform: scale(1.05);
  box-shadow: 0 3px 10px rgba(66, 165, 245, 0.3);
}

.color-label input[type="color"]::-webkit-color-swatch-wrapper {
  padding: 3px;
}

.color-label input[type="color"]::-webkit-color-swatch {
  border: none;
  border-radius: 3px;
}

</style>
