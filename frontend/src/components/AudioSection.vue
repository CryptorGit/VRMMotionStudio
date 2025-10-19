<template>
  <section class="audio-section">
    <header class="audio-section__header">
      <h3>{{ audioTexts.title }}</h3>
    </header>

    <div v-if="!hasAudio" class="audio-section__empty">
      <p>{{ audioTexts.noDuration }}</p>
    </div>

    <div v-else class="audio-section__content">
      <div class="audio-info">
        <div class="info-row">
          <span class="info-label">{{ audioTexts.filename }}</span>
          <span class="info-value info-value--filename" :title="audioFileName">{{ audioFileName }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">{{ audioTexts.duration }}</span>
          <span class="info-value">{{ formatDuration(audioDuration) }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">{{ audioTexts.sampleRate }}</span>
          <span class="info-value">{{ audioSampleRate }} Hz</span>
        </div>
        <div class="info-row">
          <span class="info-label">{{ audioTexts.channels }}</span>
          <span class="info-value">{{ channelLabel }}</span>
        </div>
      </div>

      <div class="audio-controls">
        <button 
          type="button" 
          class="btn btn--danger"
          @click="$emit('remove-audio')"
          :title="audioTexts.remove"
        >
          <i class="fa-solid fa-trash"></i>
          <span>{{ audioTexts.remove }}</span>
        </button>
      </div>
    </div>
  </section>
  
  <!-- Google AdSense広告（Audioセクションの外） -->
  <GoogleAdUnit variant="square" ad-slot="audio-section" />
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../locales/index.js'
import GoogleAdUnit from './GoogleAdUnit.vue'

const props = defineProps({
  audioDuration: { type: Number, default: 0 },
  audioBuffer: { type: Object, default: null },
  audioFileName: { type: String, default: '' },
  audioSampleRate: { type: Number, default: 0 },
  audioChannels: { type: Number, default: 0 }
})


const { t } = useI18n()
const audioTexts = computed(() => t.value?.audio ?? {})

const emit = defineEmits(['remove-audio'])

const hasAudio = computed(() => props.audioBuffer !== null && props.audioDuration > 0)

const channelLabel = computed(() => {
  const count = props.audioChannels
  if (count === 1) return audioTexts.value.mono || 'Mono'
  if (count === 2) return audioTexts.value.stereo || 'Stereo'
  return `${count}ch`
})

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.round((seconds % 1) * 100)
  if (ms > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.audio-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 12px;
  background: var(--control-surface, rgba(48, 54, 70, 0.85));
  border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.12));
  box-shadow: none;
}

.audio-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.audio-section__header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--text-strong, #f4f8ff);
}

.audio-section__empty {
  padding: 1rem;
  border-radius: 8px;
  background: var(--panel-surface-alt, rgba(52, 58, 72, 0.8));
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.82rem;
  text-align: center;
}

.audio-section__empty p {
  margin: 0;
}

.audio-section__content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.audio-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 10px;
  background: var(--panel-surface-alt, rgba(52, 58, 72, 0.85));
  border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.12));
  box-shadow: none;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.85rem;
}

.info-label {
  font-weight: 600;
  color: rgba(240, 244, 255, 0.78);
}

.info-value {
  color: rgba(255, 255, 255, 0.9);
  font-variant-numeric: tabular-nums;
}

.info-value--filename {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.audio-controls {
  display: flex;
  gap: 0.5rem;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 0.9rem;
  border-radius: 10px;
  border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.12));
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: background 0.16s ease, border-color 0.16s ease, transform 0.16s ease;
  flex: 1;
}

.btn--danger {
  color: #fff;
  background: rgba(198, 77, 98, 0.85);
  border-color: rgba(198, 77, 98, 0.45);
  box-shadow: none;
}

.btn--danger:hover {
  transform: translateY(-1px);
  background: rgba(210, 90, 110, 0.9);
  border-color: rgba(210, 90, 110, 0.55);
}

.btn i {
  font-size: 0.9rem;
}
</style>
