<template>
  <ul class="model-list">
    <li v-for="(m, i) in models" :key="i">
      <label>
        <input type="checkbox" :checked="m.visible" @change="onToggle(i, $event.target.checked)" />
        {{ m.name }}
      </label>
      <button @click="$emit('remove', i)">削除</button>
    </li>
  </ul>
</template>

<script setup>
const props = defineProps({
  models: { type: Array, required: true }
})
const emit = defineEmits(['toggle', 'remove'])
function onToggle(index, visible) {
  emit('toggle', index, visible)
}
</script>

<style scoped>
.model-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.model-list li {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}
.model-list button {
  margin-left: auto;
}
</style>
