<template>
  <ul class="model-list">
    <li v-for="(m, i) in models" :key="m.id">
      <label>
        <input type="checkbox" :checked="m.visible" @change="onToggle(i, $event.target.checked)" />
        {{ m.name }}
      </label>
      <span class="status">SB: {{ springBoneStatus(m) }}</span>
      <button @click="$emit('remove', i)">削除</button>
    </li>
  </ul>
  </template>

<script setup>
const props = defineProps({
  models: { type: Array, required: true }
})
const emit = defineEmits([
  'toggle',
  'remove'
])
function onToggle(index, visible) {
  emit('toggle', index, visible)
}

function springBoneStatus(m) {
  try {
    const mgr = m?.vrm?.springBoneManager
    if (!mgr) return 'なし'
    if (typeof mgr.enabled === 'boolean') return mgr.enabled ? '有効' : '無効'
    if (typeof mgr.getEnabled === 'function') return mgr.getEnabled() ? '有効' : '無効'
  } catch {}
  return '不明'
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
.model-list .status {
  margin: 0 8px;
  font-size: 0.85em;
  color: #555;
}
.model-list button {
  margin-left: auto;
}
</style>
