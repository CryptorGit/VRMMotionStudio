<template>
  <div class="ad-container" :class="{ 'ad-container--square': variant === 'square' }">
    <div class="ad-placeholder">
      <span class="ad-label">Advertisement</span>
      <!-- 実際のGoogle AdSenseコードはここに挿入します -->
      <!-- 開発中はプレースホルダーを表示 -->
      <div class="ad-mock" v-if="isDevelopment">
        <p>AdSense {{ variant }}</p>
        <p class="ad-mock-size">{{ adSize }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'square', // 'square', 'banner', 'vertical'
    validator: (value) => ['square', 'banner', 'vertical'].includes(value)
  },
  adSlot: {
    type: String,
    default: ''
  }
})

const isDevelopment = computed(() => {
  return import.meta.env.MODE === 'development' || !props.adSlot
})

const adSize = computed(() => {
  switch (props.variant) {
    case 'square':
      return '250x250'
    case 'banner':
      return '728x90'
    case 'vertical':
      return '120x600'
    default:
      return '250x250'
  }
})
</script>

<style scoped>
.ad-container {
  width: 100%;
  padding: 0.8rem;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0.85;
  transition: opacity 0.3s ease;
}

.ad-container:hover {
  opacity: 1;
}

.ad-container--square {
  min-height: 250px;
}

.ad-placeholder {
  position: relative;
  width: 100%;
  max-width: 250px;
  background: rgba(45, 51, 65, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.ad-label {
  position: absolute;
  top: 0.35rem;
  left: 0.5rem;
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
  z-index: 1;
}

.ad-mock {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 250px;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.35);
}

.ad-mock p {
  margin: 0.3rem 0;
  font-size: 0.85rem;
  font-weight: 500;
}

.ad-mock-size {
  font-size: 0.7rem !important;
  color: rgba(255, 255, 255, 0.25) !important;
  font-family: 'Consolas', 'Monaco', monospace;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .ad-container {
    padding: 0.5rem;
  }
  
  .ad-placeholder {
    max-width: 100%;
  }
}
</style>
