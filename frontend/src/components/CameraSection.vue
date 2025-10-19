<template>
  <fieldset class="group">
    <legend>{{ cameraTexts.resolution }}</legend>
    <div class="resolution">
      <div class="resolution__field">
        <label for="camera-resolution-width">{{ cameraTexts.width }}</label>
        <input
          id="camera-resolution-width"
          type="number"
          min="64"
          max="16384"
          step="1"
          v-model.number="widthLocal"
          :aria-label="cameraTexts.width"
        />
      </div>
      <div class="resolution__field">
        <label for="camera-resolution-height">{{ cameraTexts.height }}</label>
        <input
          id="camera-resolution-height"
          type="number"
          min="64"
          max="16384"
          step="1"
          v-model.number="heightLocal"
          :aria-label="cameraTexts.height"
        />
      </div>
      <div class="resolution__presets">
        <label>{{ cameraTexts.presets }}</label>
        <select v-model="presetLocal">
          <option value="custom">{{ cameraTexts.customPreset }}</option>
          <option
            v-for="option in presetOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>
    </div>
  </fieldset>

  <fieldset class="group">
    <legend>{{ cameraTexts.parameters }}</legend>
    <div class="field">
      <label class="stretch">
        {{ cameraTexts.fovVertical }}
        <input
          type="range"
          min="20"
          max="120"
          step="1"
          v-model.number="fovLocal"
        />
      </label>
      <div class="field__value">{{ fovLocal.toFixed(0) }}°</div>
    </div>
    <div class="field">
      <label>
        {{ cameraTexts.near }}
        <input type="number" min="0.001" max="10" step="0.001" v-model.number="nearLocal" />
      </label>
      <label>
        {{ cameraTexts.far }}
        <input type="number" min="1" max="10000" step="1" v-model.number="farLocal" />
      </label>
    </div>
    <div class="field">
      <label class="stretch">
        {{ cameraTexts.wheelSensitivity }}
        <input type="range" min="0" max="2" step="0.05" v-model.number="wheelSensLocal" />
      </label>
      <div class="field__value">×{{ wheelSensLocal.toFixed(1) }}</div>
    </div>
    <div class="field">
      <label class="stretch">
        {{ cameraTexts.translateSensitivity }}
        <input type="range" min="0" max="2" step="0.05" v-model.number="translateSensLocal" />
      </label>
      <div class="field__value">×{{ translateSensLocal.toFixed(1) }}</div>
    </div>
    <div class="field">
      <label class="stretch">
        {{ cameraTexts.rotateSensitivity }}
        <input type="range" min="0" max="2" step="0.05" v-model.number="rotateSensLocal" />
      </label>
      <div class="field__value">×{{ rotateSensLocal.toFixed(1) }}</div>
    </div>
    <label class="checkbox">
      <input type="checkbox" v-model="showHelperLocal" />
      <span>{{ cameraTexts.showHelper }}</span>
    </label>
  </fieldset>
  
  <!-- Google AdSense広告 -->
  <GoogleAdUnit variant="square" ad-slot="camera-section" />
</template>

<script setup>
import { computed, watch } from 'vue'
import { useI18n } from '../locales/index.js'
import GoogleAdUnit from './GoogleAdUnit.vue'

const props = defineProps({
  cameraFov: { type: Number, required: true },
  cameraNear: { type: Number, required: true },
  cameraFar: { type: Number, required: true },
  cameraResolutionWidth: { type: Number, required: true },
  cameraResolutionHeight: { type: Number, required: true },
  showCameraHelper: { type: Boolean, default: false },
  cameraWheelSensitivity: { type: Number, default: 1.0 },
  cameraTranslateSensitivity: { type: Number, default: 1.0 },
  cameraRotateSensitivity: { type: Number, default: 1.0 }
})

const emit = defineEmits([
  'update:cameraFov',
  'update:cameraNear',
  'update:cameraFar',
  'update:cameraResolutionWidth',
  'update:cameraResolutionHeight',
  'update:showCameraHelper',
  'update:cameraWheelSensitivity',
  'update:cameraTranslateSensitivity',
  'update:cameraRotateSensitivity'
])

const { t } = useI18n()
const cameraTexts = computed(() => t.value?.camera ?? {})

const presetOptions = computed(() => [
  { value: '1920x1080', label: cameraTexts.value.presetFhd || '1920 × 1080 (FHD)' },
  { value: '2560x1440', label: cameraTexts.value.presetQhd || '2560 × 1440 (QHD)' },
  { value: '3840x2160', label: cameraTexts.value.presetUhd || '3840 × 2160 (4K UHD)' },
  { value: '1080x1080', label: cameraTexts.value.presetSquare || '1080 × 1080 (Square)' },
  { value: '1280x720', label: cameraTexts.value.presetHd || '1280 × 720 (HD)' }
])

const fovLocal = computed({
  get: () => props.cameraFov,
  set: v => emit('update:cameraFov', clampNumber(v, 20, 120))
})
const nearLocal = computed({
  get: () => props.cameraNear,
  set: v => emit('update:cameraNear', clampNumber(v, 0.001, 10))
})
const farLocal = computed({
  get: () => props.cameraFar,
  set: v => emit('update:cameraFar', clampNumber(v, 1, 10000))
})
const widthLocal = computed({
  get: () => props.cameraResolutionWidth,
  set: v => emit('update:cameraResolutionWidth', clampNumber(Math.round(v || 0), 64, 16384))
})
const heightLocal = computed({
  get: () => props.cameraResolutionHeight,
  set: v => emit('update:cameraResolutionHeight', clampNumber(Math.round(v || 0), 64, 16384))
})
const showHelperLocal = computed({
  get: () => props.showCameraHelper,
  set: v => emit('update:showCameraHelper', !!v)
})

const wheelSensLocal = computed({
  get: () => props.cameraWheelSensitivity,
  set: v => emit('update:cameraWheelSensitivity', clampNumber(v, 0, 2))
})
const translateSensLocal = computed({
  get: () => props.cameraTranslateSensitivity,
  set: v => emit('update:cameraTranslateSensitivity', clampNumber(v, 0, 2))
})
const rotateSensLocal = computed({
  get: () => props.cameraRotateSensitivity,
  set: v => emit('update:cameraRotateSensitivity', clampNumber(v, 0, 2))
})

const presetLocal = computed({
  get() {
    const width = widthLocal.value
    const height = heightLocal.value
    const presets = presetOptions.value.map(option => option.value)
    const key = `${width}x${height}`
    return presets.includes(key) ? key : 'custom'
  },
  set(value) {
    if (!value || value === 'custom') return
    const [w, h] = value.split('x').map(v => Number.parseInt(v, 10) || 0)
    if (!w || !h) return
    widthLocal.value = w
    heightLocal.value = h
  }
})

watch([widthLocal, heightLocal], () => {
  if (!Number.isFinite(widthLocal.value)) widthLocal.value = 1920
  if (!Number.isFinite(heightLocal.value)) heightLocal.value = 1080
})

function clampNumber(value, min, max) {
  const num = Number(value)
  if (!Number.isFinite(num)) return min
  return Math.min(Math.max(num, min), max)
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

.section__caption {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: rgba(216, 224, 248, 0.7);
}

.section__content {
  padding: 0 0.85rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.group {
  border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.12));
  border-radius: 8px;
  padding: 0.75rem 0.75rem 0.65rem;
  background: var(--control-surface, rgba(48, 54, 70, 0.85));
}

.group legend {
  padding: 0 0.35rem;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  color: rgba(220, 228, 248, 0.9);
}

.resolution {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem 0.75rem;
  align-items: end;
}

.resolution__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.8rem;
}

.resolution__field input {
  width: 100%;
  padding: 0.45rem 0.6rem;
  border-radius: 8px;
  border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.12));
  background: var(--panel-surface-alt, rgba(52, 58, 72, 0.85));
  color: inherit;
  text-align: right;
  font-size: 0.95rem;
  letter-spacing: 0.02em;
}

.resolution__presets {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
}

.resolution__presets select {
  flex: 1 1 auto;
  padding: 0.4rem 0.5rem;
  border-radius: 6px;
  border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.12));
  background: var(--panel-surface-alt, rgba(52, 58, 72, 0.85));
  color: inherit;
}

.field {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.6rem;
}

.field:last-child {
  margin-bottom: 0;
}

.field label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.8rem;
}

.field label input[type='number'] {
  padding: 0.32rem 0.45rem;
  border-radius: 6px;
  border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.12));
  background: var(--panel-surface-alt, rgba(52, 58, 72, 0.85));
  color: inherit;
}

.field__value {
  font-size: 0.82rem;
  opacity: 0.75;
  min-width: 3.5rem;
  text-align: right;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.8rem;
}

.checkbox input {
  width: 1.1rem;
  height: 1.1rem;
}

.stretch {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1 1 auto;
}

.stretch input[type='range'] {
  width: 100%;
}

.actions {
  margin-top: 0.8rem;
  display: flex;
  justify-content: flex-end;
}

.action-button {
  appearance: none;
  border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.12));
  border-radius: 999px;
  padding: 0.55rem 1.2rem;
  font-size: 0.82rem;
  letter-spacing: 0.04em;
  cursor: pointer;
  color: var(--text-strong, rgba(245, 249, 255, 0.95));
  background: var(--control-surface, rgba(48, 54, 70, 0.85));
  box-shadow: none;
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease, opacity 0.18s ease;
}

.action-button:hover:not(:disabled),
.action-button:focus-visible:not(:disabled) {
  transform: translateY(-1px);
  background: var(--control-surface-hover, rgba(58, 64, 81, 0.95));
  border-color: var(--panel-border-strong, rgba(255, 255, 255, 0.18));
  outline: none;
}

.action-button:disabled {
  cursor: default;
  opacity: 0.65;
  box-shadow: none;
}
</style>
