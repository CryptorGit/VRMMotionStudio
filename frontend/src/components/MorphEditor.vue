<template>
  <div id="morph-editor">
    <div v-if="morphs.length">
      <div
        v-for="[name, index] in morphs"
        :key="name"
        class="morph-row"
      >
        <label :for="name">{{ name }}</label>
        <input
          type="range"
          :id="name"
          min="0"
          max="1"
          step="0.01"
          :value="mesh.morphTargetInfluences[index] || 0"
          @input="update(index, $event)"
        />
      </div>
    </div>
    <div v-else>モーフがありません</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  mesh: Object
})

const morphs = computed(() => {
  if (!props.mesh || !props.mesh.morphTargetDictionary) return []
  return Object.entries(props.mesh.morphTargetDictionary)
})

function update(index, event) {
  const value = parseFloat(event.target.value)
  if (props.mesh && props.mesh.morphTargetInfluences) {
    props.mesh.morphTargetInfluences[index] = value
  }
}
</script>

<style scoped>
#morph-editor {
  width: 100%;
  padding: 10px;
}
.morph-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
.morph-row label {
  width: 80px;
  font-size: 0.9em;
}
.morph-row input {
  flex: 1;
}
</style>

