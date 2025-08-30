<template>
  <div class="lighting-panel">
    <h2>ライト設定</h2>
    <div class="marker-controls">
      <div>
        <label>
          マーカー表示
          <input type="checkbox" v-model="showLightMarker" />
        </label>
      </div>
      <div>
        <label>
          マーカー色
          <input type="color" v-model="markerColor" />
        </label>
      </div>
    </div>
    <section>
      <h3>Ambient Light</h3>
      <label>
        色
        <input type="color" v-model="ambientColor" />
      </label>
      <label>
        強度
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
        強度
        <input type="range" min="0" max="5" step="0.1" v-model.number="directionalIntensity" />
      </label>
      <p class="section-description">ライトの位置と方向を角度で指定</p>
      <div class="position-inputs">
        <label>
          ライト位置X
          <input type="number" v-model.number="directionalX" />
        </label>
        <label>
          ライト位置Y
          <input type="number" v-model.number="directionalY" />
        </label>
        <label>
          ライト位置Z
          <input type="number" v-model.number="directionalZ" />
        </label>
      </div>
      <div class="position-inputs">
        <label>
          方位角 (°)
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            v-model.number="directionalAzimuth"
          />
        </label>
        <label>
          仰角 (°)
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
  showLightMarker: { type: Boolean, required: true },
  markerColor: { type: String, required: true }
})
const emit = defineEmits(['update:showLightMarker', 'update:markerColor'])
const showLightMarker = computed({
  get: () => props.showLightMarker,
  set: v => emit('update:showLightMarker', v)
})
const markerColor = computed({
  get: () => props.markerColor,
  set: v => emit('update:markerColor', v)
})

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

const directionalIntensity = computed({
  get: () => props.directional.intensity,
  set: v => (props.directional.intensity = v)
})

const directionalX = computed({
  get: () => props.directional.position.x,
  set: v => (props.directional.position.x = v)
})
const directionalY = computed({
  get: () => props.directional.position.y,
  set: v => (props.directional.position.y = v)
})
const directionalZ = computed({
  get: () => props.directional.position.z,
  set: v => (props.directional.position.z = v)
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
    return THREE.MathUtils.radToDeg(s.theta)
  },
  set: v => setTargetFromAngles(v, directionalElevation.value)
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
.lighting-panel h2 {
  margin-top: 0;
}
.lighting-panel section {
  margin-bottom: 1rem;
}
.marker-controls {
  margin-bottom: 1rem;
}
.marker-controls label {
  display: block;
  margin: 0.5rem 0;
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
