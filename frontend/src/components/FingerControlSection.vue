<template>
  <section class="section">
    <header class="section__header">
      <h3>指の設定</h3>
    </header>
    <div class="section__content">
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
    </div>
  </section>
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
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.section__header h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
}

.section__content {
  padding: 1rem 0.85rem;
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
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
  color: rgba(255, 255, 255, 0.5);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

input[type="range"] {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  background: #42a5f5;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.15s ease;
}

input[type="range"]::-webkit-slider-thumb:hover {
  background: #64b5f6;
  transform: scale(1.1);
}

input[type="range"]::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: #42a5f5;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.15s ease;
}

input[type="range"]::-moz-range-thumb:hover {
  background: #64b5f6;
  transform: scale(1.1);
}

.actions {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.4rem 0.85rem;
  font-size: 0.75rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.btn--secondary {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.8);
}

.btn--secondary:hover {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.95);
}
</style>
