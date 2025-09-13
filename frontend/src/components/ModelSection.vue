<template>
  <div class="section">
    <h3 @click="expanded = !expanded">
      <i
        class="toggle-icon"
        :class="expanded ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right'"
      ></i>
      モデル管理
      <span class="spacer"></span>
      <i class="fa-solid fa-times close-icon" @click.stop="$emit('hide')"></i>
    </h3>
    <div v-show="expanded" class="section-content">
      <label>
        <input type="checkbox" v-model="lookAtEnabledLocal" /> LookAt 有効
      </label>
      <ModelList
        :models="models"
        @toggle="(i, v) => emit('toggle-model', i, v)"
        @remove="i => emit('remove-model', i)"
      />
    </div>
  </div>
  </template>

<script setup>
import { ref, computed } from 'vue'
import ModelList from './ModelList.vue'

const props = defineProps({
  models: { type: Array, required: true },
  lookAtEnabled: { type: Boolean, required: true }
})

const emit = defineEmits([
  'hide',
  'toggle-model',
  'remove-model',
  'update:lookAtEnabled'
])

const expanded = ref(false)

const lookAtEnabledLocal = computed({
  get: () => props.lookAtEnabled,
  set: v => emit('update:lookAtEnabled', v)
})
</script>

<style scoped>
.section h3 {
  margin: 0;
  padding: 0.5rem;
  background: #ddd;
  cursor: pointer;
  display: flex;
  align-items: center;
}
.section h3 .toggle-icon {
  margin-right: 0.5rem;
}
.section h3 .spacer {
  flex: 1;
}
.section h3 .close-icon {
  margin-left: 0.5rem;
  cursor: pointer;
}
.section-content {
  padding: 0.5rem;
}
</style>
