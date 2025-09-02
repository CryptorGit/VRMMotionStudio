<template>
  <div id="morph-editor">
    <div v-if="morphs.length">
      <div
        v-for="[name, index] in morphs"
        :key="name"
        class="morph-row"
      >
        <label :for="name">{{ getMorphDisplayName(name) }}</label>
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
import { ref, watch } from 'vue'
import { isVowelMorphName, getMorphDisplayName } from '../utils/morphNameMapping.js'

const props = defineProps({
  mesh: Object
})

const morphs = ref([])

function computeMorphs() {
  if (!props.mesh || !props.mesh.morphTargetDictionary) {
    morphs.value = []
  } else {
    morphs.value = Object.entries(props.mesh.morphTargetDictionary).filter(([name]) =>
      isVowelMorphName(name)
    )
  }
}

watch(
  () => props.mesh,
  () => computeMorphs(),
  { immediate: true }
)

function reloadMorphs() {
  computeMorphs()
}

function update(index, event) {
  const value = parseFloat(event.target.value)
  if (props.mesh && props.mesh.morphTargetInfluences) {
    props.mesh.morphTargetInfluences[index] = value
  }
}

// SettingsSidebar から呼び出すためにメソッドを公開
defineExpose({ reloadMorphs })
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

