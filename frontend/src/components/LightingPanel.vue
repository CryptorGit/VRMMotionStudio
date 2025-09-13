<template>
  <div class="lighting-panel">
    <section>
      <h3>Ambient Light</h3>
      <label>
        色
        <input type="color" v-model="ambientColor" />
      </label>
      <label>
        強さ
        <input type="range" min="0" max="5" step="0.1" v-model.number="ambientIntensity" />
      </label>
    </section>
    <section>
      <h3>Directional Light</h3>
      <label>
        色
        <input type="color" v-model="directionalColor" />
      </label>
      <label>
        強さ
        <input type="range" min="0" max="5" step="0.1" v-model.number="directionalIntensityProxy" />
      </label>
      <p class="section-description">位置と向きを角度で調整できます</p>
      <div class="position-inputs">
        <label>
          位置X
          <input type="number" v-model.number="directionalX" />
        </label>
        <label>
          位置Y
          <input type="number" v-model.number="directionalY" />
        </label>
        <label>
          位置Z
          <input type="number" v-model.number="directionalZ" />
        </label>
      </div>
      <div class="position-inputs">
        <label>
          方位角(°)
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            v-model.number="directionalAzimuth"
          />
        </label>
        <label>
          仰角(°)
          <input
            type="range"
            min="-90"
            max="90"
            step="1"
            v-model.number="directionalElevation"
          />
        </label>
      </div>
    </section>
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
  background: #fff;
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.lighting-panel section {
  margin-bottom: 1rem;
}
.position-inputs {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.position-inputs label {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.section-description {
  font-size: 0.9rem;
  color: #555;
  margin: 0.5rem 0;
}
</style>
