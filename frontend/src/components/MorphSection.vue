<template>
  <div class="section">
    <h3 @click="expanded = !expanded">
      <i
        class="toggle-icon"
        :class="expanded ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right'"
      ></i>
      モーフ編集
      <span class="spacer"></span>
      <i class="fa-solid fa-rotate-right reload-icon" @click.stop="reloadMorphs"></i>
      <i class="fa-solid fa-times close-icon" @click.stop="$emit('hide')"></i>
    </h3>
    <div v-show="expanded" class="section-content">
      <MorphEditor :mesh="mesh" ref="morphEditorRef" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MorphEditor from './MorphEditor.vue'

const props = defineProps({
  mesh: Object
})

const emit = defineEmits(['hide'])

const expanded = ref(false)
const morphEditorRef = ref(null)

function reloadMorphs() {
  morphEditorRef.value?.reloadMorphs?.()
}
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
.section h3 .reload-icon {
  margin-left: 0.5rem;
  cursor: pointer;
}
.section h3 .close-icon {
  margin-left: 0.5rem;
  cursor: pointer;
}
.section-content {
  padding: 0.5rem;
}
</style>
