<template>
  <section class="audio-section">
    <header class="audio-section__header">
      <h3>MP3</h3>
    </header>

    <div v-if="!hasAudio" class="audio-section__empty">
      <p>MP3ファイルを読み込んでください</p>
    </div>

    <div v-else class="audio-section__content">
      <div class="audio-info">
        <div class="info-row">
          <span class="info-label">ファイル名:</span>
          <span class="info-value info-value--filename" :title="audioFileName">{{ audioFileName }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">長さ:</span>
          <span class="info-value">{{ formatDuration(audioDuration) }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">サンプルレート:</span>
          <span class="info-value">{{ audioSampleRate }} Hz</span>
        </div>
        <div class="info-row">
          <span class="info-label">チャンネル:</span>
          <span class="info-value">{{ audioChannels === 1 ? 'モノラル' : audioChannels === 2 ? 'ステレオ' : `${audioChannels}ch` }}</span>
        </div>
      </div>

      <div class="audio-controls">
        <button 
          type="button" 
          class="btn btn--danger"
          @click="$emit('remove-audio')"
          title="MP3を削除"
        >
          <i class="fa-solid fa-trash"></i>
          <span>削除</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  audioDuration: { type: Number, default: 0 },
  audioBuffer: { type: Object, default: null },
  audioFileName: { type: String, default: '' },
  audioSampleRate: { type: Number, default: 0 },
  audioChannels: { type: Number, default: 0 }
})

const emit = defineEmits(['remove-audio'])

const hasAudio = computed(() => props.audioBuffer !== null && props.audioDuration > 0)

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
