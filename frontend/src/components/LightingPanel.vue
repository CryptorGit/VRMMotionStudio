<template>
  <div class="lighting-panel">
    <div class="lighting-panel__ambient">
      <label class="lighting-field">
        <span>Ambient 色</span>
        <input type="color" v-model="ambientColor" />
      </label>
      <label class="lighting-field lighting-field--range">
        <span>Ambient 強さ</span>
        <input type="range" min="0" max="5" step="0.1" v-model.number="ambientIntensity" />
      </label>
    </div>
    <div class="lighting-panel__directional">
      <div class="lighting-panel__heading">
        <span class="lighting-panel__title">Directional Light</span>
        <span class="lighting-panel__description">位置と向きを角度で調整できます</span>
      </div>
      <div class="lighting-panel__fields">
        <label class="lighting-field">
          <span>色</span>
          <input type="color" v-model="directionalColor" />
        </label>
        <label class="lighting-field lighting-field--range">
          <span>強さ</span>
          <input type="range" min="0" max="5" step="0.1" v-model.number="directionalIntensityProxy" />
        </label>
      </div>
      <div class="position-inputs">
        <label class="lighting-field">
          <span>位置X</span>
          <input type="number" v-model.number="directionalX" />
        </label>
        <label class="lighting-field">
          <span>位置Y</span>
          <input type="number" v-model.number="directionalY" />
        </label>
        <label class="lighting-field">
          <span>位置Z</span>
          <input type="number" v-model.number="directionalZ" />
        </label>
      </div>
      <div class="position-inputs">
        <label class="lighting-field lighting-field--range">
          <span>方位角(°)</span>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            v-model.number="directionalAzimuth"
          />
        </label>
        <label class="lighting-field lighting-field--range">
          <span>仰角(°)</span>
          <input
            type="range"
            min="-90"
            max="90"
            step="1"
            v-model.number="directionalElevation"
          />
        </label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import * as THREE from 'three'

const props = defineProps({
  ambient: { type: Object, required: true },
  directional: { type: Object, required: true },
  directionalIntensity: { type: Number, required: true }
})
const emit = defineEmits(['update:directionalIntensity'])

const ambientColor = computed({
  get: () => '#' + props.ambient.color.getHexString(),
  set: v => props.ambient.color.set(v)
})

const ambientIntensity = computed({
  get: () => props.ambient.intensity,
  set: v => (props.ambient.intensity = v)
})

const directionalColor = computed({
  get: () => '#' + props.directional.color.getHexString(),
  set: v => props.directional.color.set(v)
})

const directionalIntensityProxy = computed({
  get: () => props.directionalIntensity,
  set: v => emit('update:directionalIntensity', v)
})

const directionalX = computed({
  get: () => props.directional.position.x,
  set: v => {
    const delta = v - props.directional.position.x
    props.directional.position.x = v
    props.directional.target.position.x += delta
  }
})
const directionalY = computed({
  get: () => props.directional.position.y,
  set: v => {
    const delta = v - props.directional.position.y
    props.directional.position.y = v
    props.directional.target.position.y += delta
  }
})
const directionalZ = computed({
  get: () => props.directional.position.z,
  set: v => {
    const delta = v - props.directional.position.z
    props.directional.position.z = v
    props.directional.target.position.z += delta
  }
})

function setTargetFromAngles(azimuthDeg, elevationDeg) {
  const dir = props.directional.target.position
    .clone()
    .sub(props.directional.position)
  const r = dir.length() || 1
  const theta = THREE.MathUtils.degToRad(azimuthDeg)
  const phi = THREE.MathUtils.degToRad(90 - elevationDeg)
  const vec = new THREE.Vector3().setFromSphericalCoords(r, phi, theta)
  props.directional.target.position.copy(
    props.directional.position.clone().add(vec)
  )
}

const directionalAzimuth = computed({
  get: () => {
    const dir = props.directional.target.position
      .clone()
      .sub(props.directional.position)
    const s = new THREE.Spherical().setFromVector3(dir)
    const deg = THREE.MathUtils.radToDeg(s.theta)
    return ((deg % 360) + 360) % 360
  },
  set: v => {
    const normalized = ((v % 360) + 360) % 360
    setTargetFromAngles(normalized, directionalElevation.value)
  }
})

const directionalElevation = computed({
  get: () => {
    const dir = props.directional.target.position
      .clone()
      .sub(props.directional.position)
    const s = new THREE.Spherical().setFromVector3(dir)
    return 90 - THREE.MathUtils.radToDeg(s.phi)
  },
  set: v => setTargetFromAngles(directionalAzimuth.value, v)
})
</script>

<style scoped>
.lighting-panel {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  background: linear-gradient(155deg, rgba(38, 44, 62, 0.85), rgba(28, 32, 46, 0.92));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1rem 1.15rem;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
}

.lighting-panel__ambient {
  display: grid;
  gap: 0.7rem;
}

.lighting-panel__directional {
  display: grid;
  gap: 0.85rem;
}

.lighting-panel__heading {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.lighting-panel__title {
  font-size: 0.95rem;
  letter-spacing: 0.04em;
  color: rgba(240, 245, 255, 0.9);
}

.lighting-panel__description {
  font-size: 0.78rem;
  color: rgba(210, 220, 245, 0.65);
}

.lighting-panel__fields {
  display: grid;
  gap: 0.75rem;
}

.lighting-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: var(--text-muted, rgba(220, 230, 255, 0.72));
}

.lighting-field span {
  font-size: 0.8rem;
  letter-spacing: 0.02em;
}

.lighting-field--range input[type='range'] {
  margin-top: 0.1rem;
}

input[type='color'] {
  height: 36px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(0, 0, 0, 0.2);
  cursor: pointer;
}

input[type='range'] {
  accent-color: var(--accent, #2d8cff);
}

input[type='number'] {
  background: rgba(12, 16, 26, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  padding: 0.45rem 0.65rem;
  color: inherit;
}

.position-inputs {
  display: grid;
  gap: 0.6rem;
}

.position-inputs .lighting-field {
  gap: 0.3rem;
}

@media (min-width: 840px) {
  .lighting-panel__ambient {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  }

  .lighting-panel__fields {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  }

  .position-inputs {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
