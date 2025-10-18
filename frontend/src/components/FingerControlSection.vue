<template>
  <div class="hand-group">
    <h4>左手</h4>
    <div class="finger-control" v-for="finger in leftFingers" :key="finger.key">
      <div class="finger-control__header">
        <span class="finger-name">{{ finger.label }}</span>
        <select
          class="axis-select"
          :value="getAxisValue('left', finger.key)"
          @change="setAxisValue('left', finger.key, $event.target.value)"
        >
          <option
            v-for="option in axisOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>
      <div class="finger-control__slider">
        <input
          type="range"
          min="-90"
          max="90"
          step="1"
          :value="getFingerValue('left', finger.key)"
          @input="setFingerValue('left', finger.key, $event.target.value)"
        />
        <span class="finger-value">{{ formatDegrees(getFingerValue('left', finger.key)) }}</span>
      </div>
    </div>
  </div>

  <div class="hand-group">
    <h4>右手</h4>
    <div class="finger-control" v-for="finger in rightFingers" :key="finger.key">
      <div class="finger-control__header">
        <span class="finger-name">{{ finger.label }}</span>
        <select
          class="axis-select"
          :value="getAxisValue('right', finger.key)"
          @change="setAxisValue('right', finger.key, $event.target.value)"
        >
          <option
            v-for="option in axisOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>
      <div class="finger-control__slider">
        <input
          type="range"
          min="-90"
          max="90"
          step="1"
          :value="getFingerValue('right', finger.key)"
          @input="setFingerValue('right', finger.key, $event.target.value)"
        />
        <span class="finger-value">{{ formatDegrees(getFingerValue('right', finger.key)) }}</span>
      </div>
    </div>
  </div>

  <div class="actions">
    <button type="button" class="btn btn--secondary" @click="resetAllFingers">
      すべてリセット
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  fingerStates: { type: Object, default: () => ({}) },
  axisOverrides: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:fingerStates', 'update:axisOverrides'])

const axisOptions = [
  { value: 'auto', label: '自動' },
  { value: 'x+', label: 'X+' },
  { value: 'x-', label: 'X-' },
  { value: 'y+', label: 'Y+' },
  { value: 'y-', label: 'Y-' },
  { value: 'z+', label: 'Z+' },
  { value: 'z-', label: 'Z-' }
]

const allowedAxisValues = new Set(axisOptions.map(option => option.value))

const fingers = [
  { key: 'thumb', label: '親指' },
  { key: 'index', label: '人差し指' },
  { key: 'middle', label: '中指' },
  { key: 'ring', label: '薬指' },
  { key: 'little', label: '小指' }
]

const leftFingers = computed(() => fingers)
const rightFingers = computed(() => fingers)

const clampDegrees = (value, fallback = 0) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.max(-90, Math.min(90, num))
}

const normalizeAxis = (value) => {
  if (typeof value !== 'string') return 'auto'
  const normalized = value.trim().toLowerCase()
  return allowedAxisValues.has(normalized) ? normalized : 'auto'
}

const getKey = (hand, finger) => `${hand}_${finger}`

function getFingerValue(hand, finger) {
  const key = getKey(hand, finger)
  return clampDegrees(props.fingerStates?.[key] ?? 0, 0)
}

function setFingerValue(hand, finger, value) {
  const key = getKey(hand, finger)
  const current = getFingerValue(hand, finger)
  const next = clampDegrees(value, current)
  if (next === current) return
  const updated = { ...props.fingerStates, [key]: next }
  console.log(`[FingerControl] Setting angle ${key} -> ${next.toFixed(0)}°`)
  emit('update:fingerStates', updated)
}

function getAxisValue(hand, finger) {
  const key = getKey(hand, finger)
  return normalizeAxis(props.axisOverrides?.[key])
}

function setAxisValue(hand, finger, value) {
  const key = getKey(hand, finger)
  const current = getAxisValue(hand, finger)
  const next = normalizeAxis(value)
  if (next === current) return
  const updated = { ...props.axisOverrides, [key]: next }
  console.log(`[FingerControl] Setting axis ${key} -> ${next}`)
  emit('update:axisOverrides', updated)
}

function formatDegrees(value) {
  const deg = clampDegrees(value, 0)
  const rounded = Math.round(deg)
  const sign = rounded > 0 ? '+' : ''
  return `${sign}${rounded}°`
}

function resetAllFingers() {
  const resetStates = {}
  fingers.forEach(finger => {
    resetStates[`left_${finger.key}`] = 0
    resetStates[`right_${finger.key}`] = 0
  })
  console.log('[FingerControl] Resetting all finger angles')
  emit('update:fingerStates', resetStates)
}
</script>

<style scoped>
.section {
  background: var(--panel-surface, rgba(24, 26, 32, 0.95));
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
  padding: 1rem 0.85rem;
  max-height: 70vh;
  overflow-y: auto;
}

.section__content::-webkit-scrollbar {
  width: 8px;
}

.section__content::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--accent, #2d8cff) 40%, rgba(255, 255, 255, 0.18));
  border-radius: 6px;
}

.section__content::-webkit-scrollbar-track {
  background: transparent;
}

.hand-group {
  margin-bottom: 1.5rem;
}

.hand-group:last-of-type {
  margin-bottom: 1rem;
}

.hand-group h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.85rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.finger-control {
  margin-bottom: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.finger-control__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.finger-name {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
}

.axis-select {
  flex: 0 0 6rem;
  padding: 0.25rem 0.5rem;
  background: var(--control-surface, rgba(48, 54, 70, 0.85));
  color: rgba(255, 255, 255, 0.85);
  border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.12));
  border-radius: 6px;
  font-size: 0.8rem;
}

.finger-control__slider {
  display: grid;
  grid-template-columns: 1fr 3rem;
  align-items: center;
  gap: 0.5rem;
}

.finger-value {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

input[type="range"] {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  transition: background 0.2s ease;
}

input[type="range"]:hover {
  background: rgba(255, 255, 255, 0.16);
}

input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background: var(--accent, #42a5f5);
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;
  box-shadow: none;
}

input[type="range"]::-webkit-slider-thumb:hover {
  background: color-mix(in srgb, var(--accent, #42a5f5) 100%, white 20%);
  transform: scale(1.15);
  box-shadow: none;
}

input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: var(--accent, #42a5f5);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;
  box-shadow: none;
}

input[type="range"]::-moz-range-thumb:hover {
  background: color-mix(in srgb, var(--accent, #42a5f5) 100%, white 20%);
  transform: scale(1.15);
  box-shadow: none;
}

.actions {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.45rem 1rem;
  font-size: 0.8rem;
  border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.12));
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  font-weight: 500;
}

.btn--secondary {
  background: var(--control-surface, rgba(48, 54, 70, 0.85));
  color: rgba(255, 255, 255, 0.8);
}

.btn--secondary:hover {
  background: var(--control-surface-hover, rgba(58, 64, 81, 0.95));
  border-color: var(--panel-border-strong, rgba(255, 255, 255, 0.18));
  color: rgba(255, 255, 255, 0.95);
}

@media (max-width: 520px) {
  .finger-control__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .axis-select {
    width: 100%;
  }

  .finger-control__slider {
    grid-template-columns: 1fr;
    gap: 0.4rem;
  }

  .finger-value {
    text-align: left;
  }
}
</style>
