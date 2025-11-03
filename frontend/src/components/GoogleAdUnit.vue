<template>
  <div class="ad-container" :class="{ 'ad-container--square': variant === 'square' }">
    <div class="ad-placeholder">
      <span class="ad-label">Advertisement</span>
      <!-- Google AdSense広告ユニット -->
      <ins class="adsbygoogle"
           :style="adStyle"
           data-ad-client="ca-pub-5056897746119361"
           :data-ad-slot="adSlot"></ins>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'

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

const adStyle = computed(() => {
  switch (props.variant) {
    case 'square':
      return 'display:block; width:250px; height:250px;'
    case 'banner':
      return 'display:inline-block; width:728px; height:90px;'
    case 'vertical':
      return 'display:inline-block; width:120px; height:600px;'
    default:
      return 'display:block; width:250px; height:250px;'
  }
})

onMounted(() => {
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({})
  } catch (err) {
    console.error('AdSense error:', err)
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
  padding-top: 1.5rem;
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
