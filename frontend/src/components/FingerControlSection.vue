<template>
  <div class="hand-group">
    <h4>左手</h4>
    <div class="finger-control" v-for="finger in leftFingers" :key="finger.key">
      <label>
        <span class="finger-name">{{ finger.label }}</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="getFingerValue('left', finger.key)"
          @input="setFingerValue('left', finger.key, $event.target.value)"
        />
        <span class="finger-value">{{ (getFingerValue('left', finger.key) * 100).toFixed(0) }}%</span>
      </label>
    </div>
  </div>

  <div class="hand-group">
    <h4>右手</h4>
    <div class="finger-control" v-for="finger in rightFingers" :key="finger.key">
      <label>
        <span class="finger-name">{{ finger.label }}</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="getFingerValue('right', finger.key)"
          @input="setFingerValue('right', finger.key, $event.target.value)"
        />
        <span class="finger-value">{{ (getFingerValue('right', finger.key) * 100).toFixed(0) }}%</span>
      </label>
    </div>
  </div>

  <div class="actions">
    <button type="button" class="btn btn--secondary" @click="resetAllFingers">すべてリセット</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  fingerStates: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:finger'])

const fingers = [
  { key: 'thumb', label: '親指' },
  { key: 'index', label: '人差し指' },
  { key: 'middle', label: '中指' },
  { key: 'ring', label: '薬指' },
  { key: 'little', label: '小指' }
]

const leftFingers = computed(() => fingers)
const rightFingers = computed(() => fingers)

function getFingerValue(hand, finger) {
  const key = `${hand}_${finger}`
  return props.fingerStates?.[key] ?? 0
}

function setFingerValue(hand, finger, value) {
  const key = `${hand}_${finger}`
  const numValue = Math.max(0, Math.min(1, Number(value) || 0))
  emit('update:finger', { hand, finger, value: numValue })
}

function resetAllFingers() {
  fingers.forEach(f => {
    setFingerValue('left', f.key, 0)
    setFingerValue('right', f.key, 0)
  })
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
  margin-bottom: 0.75rem;
}

.finger-control label {
  display: grid;
  grid-template-columns: 5rem 1fr 3rem;
  align-items: center;
  gap: 0.5rem;
}

.finger-name {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
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
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

input[type="range"]::-webkit-slider-thumb:hover {
  background: color-mix(in srgb, var(--accent, #42a5f5) 100%, white 20%);
  transform: scale(1.15);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.4);
}

input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: var(--accent, #42a5f5);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

input[type="range"]::-moz-range-thumb:hover {
  background: color-mix(in srgb, var(--accent, #42a5f5) 100%, white 20%);
  transform: scale(1.15);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.4);
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
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.btn--secondary {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.8);
}

.btn--secondary:hover {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.95);
}
</style>
