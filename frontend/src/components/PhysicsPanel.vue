<template>
  <div class="physics-panel">
    <h3>物理設定</h3>
    <label>
      <input type="checkbox" v-model="enabled" /> 物理演算を有効化
    </label>
    <div class="row">
      <span>重力</span>
      <input type="number" v-model.number="gravityX" step="0.1" />
      <input type="number" v-model.number="gravityY" step="0.1" />
      <input type="number" v-model.number="gravityZ" step="0.1" />
    </div>
    <div class="row">
      <span>ステップ</span>
      <input type="number" v-model.number="timeStep" step="0.001" />
    </div>
    <button @click="$emit('close')">閉じる</button>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import * as THREE from 'three'

const props = defineProps({
  helper: { type: Object, required: true }
})

const enabled = ref(true)
const gravityX = ref(0)
const gravityY = ref(-9.8)
const gravityZ = ref(0)
const timeStep = ref(1 / 65)

watch(enabled, val => {
  props.helper?.enable?.('physics', val)
}, { immediate: true })

watch([gravityX, gravityY, gravityZ], () => {
  props.helper?.setPhysicsGravity?.(
    new THREE.Vector3(gravityX.value, gravityY.value, gravityZ.value)
  )
}, { immediate: true })

watch(timeStep, val => {
  if (props.helper?.physics?.setTimeStep) {
    props.helper.physics.setTimeStep(val)
  }
}, { immediate: true })
</script>

<style scoped>
.physics-panel {
  position: absolute;
  top: 50px;
  left: 10px;
  background: #fff;
  padding: 10px;
  border: 1px solid #ccc;
  z-index: 10;
}
.row {
  margin-top: 5px;
}
.row input {
  width: 60px;
  margin-left: 4px;
}
</style>

