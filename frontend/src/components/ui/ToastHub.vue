<template>
  <div class="toast-stack" role="status" aria-live="polite">
    <article
      v-for="toast in items"
      :key="toast.id"
      class="toast-item"
    >
      <header class="toast-item__header">
        <span class="toast-item__title">{{ toast.title }}</span>
        <button type="button" class="toast-item__dismiss" @click="$emit('dismiss', toast.id)">ÁE/button>
      </header>
      <p class="toast-item__body">{{ toast.message }}</p>
    </article>
  </div>
</template>

<script setup>
defineProps({
  items: {
    type: Array,
    default: () => []
  }
})

defineEmits(['dismiss'])
</script>

<style scoped>
.toast-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.toast-item__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.toast-item__title {
  font-weight: 600;
  font-size: 0.85rem;
}

.toast-item__dismiss {
  background: transparent;
  border: none;
  color: inherit;
  font-size: 1rem;
  cursor: pointer;
}

.toast-item__body {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.4;
}
</style>


