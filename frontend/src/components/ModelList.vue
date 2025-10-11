<template>
  <ul class="model-list">
    <li v-for="(m, i) in models" :key="m.id" class="model-item">
      <label class="model-label">
        <input 
          type="checkbox" 
          :checked="m.visible" 
          @change="onToggle(i, $event.target.checked)" 
          class="model-checkbox"
        />
        <span class="model-name">{{ m.name }}</span>
      </label>
      <button 
        @click="$emit('remove', i)" 
        class="btn-remove"
        title="削除"
      >
        削除
      </button>
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
</script>

<style scoped>
.model-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.model-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  background: rgba(12, 16, 28, 0.5);
  border: 1px solid rgba(140, 168, 235, 0.25);
  transition: background 0.2s ease, border-color 0.2s ease;
}

.model-item:hover {
  background: rgba(12, 16, 28, 0.7);
  border-color: rgba(140, 168, 235, 0.4);
}

.model-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  cursor: pointer;
  font-size: 0.85rem;
  color: rgba(240, 244, 255, 0.9);
}

.model-checkbox {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid rgba(140, 168, 235, 0.5);
  background: rgba(12, 16, 28, 0.4);
  cursor: pointer;
  position: relative;
}

.model-checkbox:checked {
  background: color-mix(in srgb, var(--accent, #5c8cff) 85%, rgba(255, 255, 255, 0.2));
  border-color: color-mix(in srgb, var(--accent, #5c8cff) 70%, rgba(255, 255, 255, 0.4));
}

.model-checkbox:checked::after {
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.9);
}

.model-name {
  flex: 1;
}

.btn-remove {
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 112, 128, 0.4);
  background: rgba(255, 112, 128, 0.15);
  color: rgba(255, 220, 225, 0.9);
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.btn-remove:hover {
  background: rgba(255, 112, 128, 0.3);
  border-color: rgba(255, 112, 128, 0.6);
  color: #fff;
}
</style>
