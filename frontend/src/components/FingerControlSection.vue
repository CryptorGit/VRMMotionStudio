<template>
  <section class="hand-axis">
    <h4 class="hand-axis__title">{{ fingerTexts.handAxisTitle }}</h4>
    <div class="hand-axis__controls">
      <label class="hand-axis__control">
        <span>{{ fingerTexts.handAxisLeft }}</span>
        <select
          class="axis-select axis-select--hand"
          :value="handAxis.left"
          @change="setHandAxis('left', $event.target.value)"
        >
          <option value="__mixed" disabled v-if="handAxis.left === '__mixed'">
            {{ fingerTexts.axisMixed }}
          </option>
          <option
            v-for="option in axisOptions"
            :key="`left-${option.value}`"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </label>
      <label class="hand-axis__control">
        <span>{{ fingerTexts.handAxisRight }}</span>
        <select
          class="axis-select axis-select--hand"
          :value="handAxis.right"
          @change="setHandAxis('right', $event.target.value)"
        >
          <option value="__mixed" disabled v-if="handAxis.right === '__mixed'">
            {{ fingerTexts.axisMixed }}
          </option>
          <option
            v-for="option in axisOptions"
            :key="`right-${option.value}`"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </label>
    </div>
  </section>

  <div class="hand-group">
    <h4>{{ leftHandLabel }}</h4>
    <div class="finger-control" v-for="finger in leftFingers" :key="finger.key">
      <div class="finger-control__header">
        <span class="finger-name">{{ finger.label }}</span>
        <select
          class="axis-select"
          :value="getAxisValue('left', finger.key)"
          @change="setAxisValue('left', finger.key, $event.target.value)"
        >
          <option
            v-for="option in (finger.isThumb ? thumbAxisOptions : axisOptions)"
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
    <h4>{{ rightHandLabel }}</h4>
    <div class="finger-control" v-for="finger in rightFingers" :key="finger.key">
      <div class="finger-control__header">
        <span class="finger-name">{{ finger.label }}</span>
        <select
          class="axis-select"
          :value="getAxisValue('right', finger.key)"
          @change="setAxisValue('right', finger.key, $event.target.value)"
        >
          <option
            v-for="option in (finger.isThumb ? thumbAxisOptions : axisOptions)"
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
      {{ resetAllLabel }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../locales/index.js'

const props = defineProps({
  fingerStates: { type: Object, default: () => ({}) },
  axisOverrides: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:fingerStates', 'update:axisOverrides'])

const { t } = useI18n()
const fingerTexts = computed(() => t.value?.finger ?? {})

const leftHandLabel = computed(() => fingerTexts.value.leftHand || 'Left Hand')
const rightHandLabel = computed(() => fingerTexts.value.rightHand || 'Right Hand')
const resetAllLabel = computed(() => fingerTexts.value.resetAll || 'Reset All')

const AXIS_VALUES = ['x+', 'x-', 'y+', 'y-', 'z+', 'z-']

const axisOptions = computed(() => [
  { value: 'z+', label: fingerTexts.value.axisZPlusAuto || 'Z+ (auto)' },
  { value: 'z-', label: fingerTexts.value.axisZMinus || 'Z-' },
  { value: 'x+', label: fingerTexts.value.axisXPlus || 'X+' },
  { value: 'x-', label: fingerTexts.value.axisXMinus || 'X-' },
  { value: 'y+', label: fingerTexts.value.axisYPlus || 'Y+' },
  { value: 'y-', label: fingerTexts.value.axisYMinus || 'Y-' }
])

const thumbAxisOptions = computed(() => [
  { value: 'y+', label: fingerTexts.value.axisThumbAuto || 'Y+ (auto)' },
  { value: 'y-', label: fingerTexts.value.axisYMinus || 'Y-' },
  { value: 'z+', label: fingerTexts.value.axisZPlus || 'Z+' },
  { value: 'z-', label: fingerTexts.value.axisZMinus || 'Z-' },
  { value: 'x+', label: fingerTexts.value.axisXPlus || 'X+' },
  { value: 'x-', label: fingerTexts.value.axisXMinus || 'X-' }
])

const allowedAxisValues = new Set(AXIS_VALUES)
const HAND_SIDES = ['left', 'right']

const FINGER_KEYS = ['thumb', 'index', 'middle', 'ring', 'little']

const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1)
const buildFingerList = (prefix) => {
  return FINGER_KEYS.map(key => {
    const translationKey = `${prefix}${capitalize(key)}`
    return {
      key,
      label: fingerTexts.value[translationKey] || key,
      isThumb: key === 'thumb'
    }
  })
}

const leftFingers = computed(() => buildFingerList('left'))
const rightFingers = computed(() => buildFingerList('right'))

const MIXED_AXIS_VALUE = '__mixed'

const handAxis = computed(() => ({
  left: computeHandAxisValue('left'),
  right: computeHandAxisValue('right')
}))

function computeHandAxisValue(hand) {
  if (!HAND_SIDES.includes(hand)) return 'z+'
  const keys = FINGER_KEYS.map(finger => getKey(hand, finger))
  const values = keys.map(key => normalizeAxis(props.axisOverrides?.[key]))
  const first = values[0] ?? 'z+'
  return values.every(value => value === first) ? first : MIXED_AXIS_VALUE
}

const clampDegrees = (value, fallback = 0) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.max(-90, Math.min(90, num))
}

const normalizeAxis = (value, isThumb = false) => {
  if (typeof value !== 'string') return isThumb ? 'y+' : 'z+'
  const normalized = value.trim().toLowerCase()
  return allowedAxisValues.has(normalized) ? normalized : (isThumb ? 'y+' : 'z+')
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
  const isThumb = finger === 'thumb'
  return normalizeAxis(props.axisOverrides?.[key], isThumb)
}

function setAxisValue(hand, finger, value) {
  const key = getKey(hand, finger)
  const current = getAxisValue(hand, finger)
  const isThumb = finger === 'thumb'
  const next = normalizeAxis(value, isThumb)
  if (next === current) return
  const updated = { ...props.axisOverrides, [key]: next }
  console.log(`[FingerControl] Setting axis ${key} -> ${next}`)
  emit('update:axisOverrides', updated)
}

function setHandAxis(hand, value) {
  if (!HAND_SIDES.includes(hand)) return
  if (value === MIXED_AXIS_VALUE) return
  const next = normalizeAxis(value)
  const updated = { ...props.axisOverrides }
  FINGER_KEYS.forEach(finger => {
    const key = getKey(hand, finger)
    const isThumb = finger === 'thumb'
    // 親指は個別に設定されている場合はそのまま、なければy+
    if (isThumb && !props.axisOverrides?.[key]) {
      updated[key] = 'y+'
    } else {
      updated[key] = next
    }
  })
  console.log(`[FingerControl] Applying axis ${next} to ${hand} hand`)
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
  FINGER_KEYS.forEach(key => {
    resetStates[`left_${key}`] = 0
    resetStates[`right_${key}`] = 0
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

.hand-axis {
  margin-bottom: 1.5rem;
  padding: 0.75rem 0.85rem 1rem;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(58, 66, 90, 0.85), rgba(44, 52, 74, 0.85));
  border: 1px solid rgba(136, 160, 220, 0.25);
  box-shadow: inset 0 0 0 1px rgba(20, 24, 34, 0.35);
}

.hand-axis__title {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: rgba(230, 238, 255, 0.92);
  text-transform: uppercase;
}

.hand-axis__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
}

.hand-axis__control {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.82rem;
  color: rgba(220, 230, 255, 0.82);
  min-width: 160px;
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
  padding: 0.3rem 0.6rem;
  background: linear-gradient(180deg, rgba(80, 104, 146, 0.92), rgba(58, 72, 102, 0.92));
  color: rgba(235, 240, 255, 0.92);
  border: 1px solid rgba(140, 170, 240, 0.35);
  border-radius: 6px;
  font-size: 0.8rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
  box-shadow: inset 0 0 0 1px rgba(18, 22, 34, 0.35);
}

.axis-select:hover,
.axis-select:focus-visible {
  border-color: rgba(160, 190, 255, 0.6);
  box-shadow: 0 0 0 2px rgba(92, 140, 255, 0.2);
  outline: none;
}

.axis-select--hand {
  flex: 1 1 180px;
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
  background: linear-gradient(90deg, rgba(120, 160, 255, 0.35), rgba(70, 90, 150, 0.2));
  border-radius: 999px;
  border: 1px solid rgba(150, 180, 255, 0.25);
  outline: none;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

input[type="range"]:hover {
  border-color: rgba(160, 200, 255, 0.45);
  background: linear-gradient(90deg, rgba(140, 180, 255, 0.45), rgba(90, 120, 190, 0.28));
  box-shadow: 0 0 0 2px rgba(92, 140, 255, 0.18);
}

input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background: color-mix(in srgb, var(--accent, #42a5f5) 85%, rgba(255, 255, 255, 0.25));
  border-radius: 50%;
  cursor: pointer;
  border: 1px solid rgba(230, 240, 255, 0.6);
  transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
  box-shadow: none;
}

input[type="range"]::-webkit-slider-thumb:hover {
  background: color-mix(in srgb, var(--accent, #42a5f5) 95%, rgba(255, 255, 255, 0.35));
  transform: scale(1.15);
  border-color: rgba(255, 255, 255, 0.8);
  box-shadow: none;
}

input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: color-mix(in srgb, var(--accent, #42a5f5) 85%, rgba(255, 255, 255, 0.25));
  border: 1px solid rgba(230, 240, 255, 0.6);
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
  box-shadow: none;
}

input[type="range"]::-moz-range-thumb:hover {
  background: color-mix(in srgb, var(--accent, #42a5f5) 95%, rgba(255, 255, 255, 0.35));
  transform: scale(1.15);
  border-color: rgba(255, 255, 255, 0.8);
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
  .hand-axis__controls {
    flex-direction: column;
  }

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
