<template>
  <div class="section">
    <h3 @click="expanded = !expanded">
      <i
        class="toggle-icon"
        :class="expanded ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right'"
      ></i>
      物理設定
      <span class="spacer"></span>
      <i class="fa-solid fa-times close-icon" @click.stop="$emit('hide')"></i>
    </h3>
    <div v-show="expanded" class="section-content">
      <label>
        <input type="checkbox" v-model="springBoneEnabledLocal" /> SpringBone 有効
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  springBoneEnabled: { type: Boolean, required: true }
})
const emit = defineEmits(['hide', 'update:spring-bone-enabled'])

const expanded = ref(false)

const springBoneEnabledLocal = computed({
  get: () => props.springBoneEnabled,
  set: v => emit('update:spring-bone-enabled', v)
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
.section h3 .toggle-icon { margin-right: 0.5rem; }
.section h3 .spacer { flex: 1; }
.section h3 .close-icon { margin-left: 0.5rem; cursor: pointer; }
.section-content { padding: 0.5rem; }
</style>
