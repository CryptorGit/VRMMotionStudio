<template>
  <ul class="model-list">
    <li v-for="(m, i) in models" :key="m.id">
      <label>
        <input type="checkbox" :checked="m.visible" @change="onToggle(i, $event.target.checked)" />
        {{ m.name }}
      </label>
      <label>
        <input
          type="checkbox"
          :checked="m.bonesVisible"
          @change="onToggleBone(i, $event.target.checked)"
        />
        ボーン表示
      </label>
      <label>
        <input
          type="checkbox"
          :checked="m.boneNameVisible"
          @change="onToggleBoneName(i, $event.target.checked)"
        />
        ボーン名表示
      </label>
      <button @click="$emit('remove', i)">削除</button>
    </li>
  </ul>
</template>

<script setup>
const props = defineProps({
  models: { type: Array, required: true }
})
const emit = defineEmits(['toggle', 'toggle-bone', 'toggle-bone-names', 'remove'])
function onToggle(index, visible) {
  emit('toggle', index, visible)
}
function onToggleBone(index, visible) {
  emit('toggle-bone', index, visible)
}
function onToggleBoneName(index, visible) {
  emit('toggle-bone-names', index, visible)
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
.model-list label + label {
  margin-left: 8px;
}
.model-list button {
  margin-left: auto;
}
</style>
