<template>
  <div
    class="timeline-panel"
    :class="{ collapsed }"
    :style="panelStyle"
  >
    <div class="timeline-header" ref="headerRef">
      <div class="header-left">
        <span class="title">タイムライン</span>
        <span class="time-indicator">
          <span>{{ formatTime(currentTime) }}</span>
          <span class="separator">/</span>
          <span>{{ formatTime(duration) }}</span>
        </span>
      </div>
      <div class="header-controls">
        <button type="button" @click="handleJumpStart" title="最初に戻る">
          <i class="fa-solid fa-backward-step"></i>
        </button>
        <button type="button" @click="handlePlayPause" :title="isPlaying ? '一時停止' : '再生'">
          <i :class="isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play'"></i>
        </button>
        <button type="button" @click="handleJumpEnd" title="最後に移動">
          <i class="fa-solid fa-forward-step"></i>
        </button>
        <button type="button" @click="handleAddAll" title="全トラッカーのキーを追加">
          <i class="fa-solid fa-circle-plus"></i>
        </button>
        <button
          type="button"
          class="collapse-toggle"
          @click="toggleCollapse"
        >
          <i :class="collapsed ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
        </button>
      </div>
    </div>
    <div
      v-show="!collapsed"
      class="timeline-body"
      :style="bodyStyle"
      ref="bodyRef"
      @scroll="onScroll"
    >
      <canvas
        v-if="audioWaveformData"
        ref="waveformCanvas"
        class="waveform-canvas"
        :style="waveformCanvasStyle"
      ></canvas>
      <div
        class="timeline-grid"
        :style="gridStyle"
      >
        <div class="name-header">トラッカー</div>
        <div class="time-header" @mousedown="startSeek">
          <div class="time-scale" :style="timeScaleStyle">
            <div
              v-for="tick in timeTicks"
              :key="`tick-${tick}`"
              class="time-tick"
              :style="tickStyle(tick)"
            >
              <span>{{ formatTime(tick) }}</span>
            </div>
          </div>
        </div>
        <template v-for="tracker in trackers" :key="tracker.key">
          <div class="name-cell">
            <div class="name-content">
              <span>{{ tracker.label || tracker.key }}</span>
              <button
                type="button"
                class="row-add"
                title="現在時刻にキーを追加"
                @click.stop="emitRowKey(tracker.key)"
              >
                <i class="fa-solid fa-plus"></i>
              </button>
            </div>
          </div>
          <div class="track-cell">
            <div
              class="track-content"
              :style="trackContentStyle"
              @mousedown="startSeek"
              @dblclick="onTrackDoubleClick($event, tracker.key)"
            >
              <div
                v-for="frame in keyframesFor(tracker.key)"
                :key="frame.id"
                class="keyframe"
                :style="keyframeStyle(frame)"
                @mousedown.stop
                @click.stop="handleKeyframeClick($event, tracker.key, frame.id)"
                @contextmenu.prevent="handleKeyframeClick($event, tracker.key, frame.id)"
                :title="`t=${formatTime(frame.time)}`"
              ></div>
            </div>
          </div>
        </template>
      </div>
      <div class="playhead" :style="playheadStyle" @mousedown="startSeek"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'

const PIXELS_PER_SECOND = 120
const NAME_COLUMN_WIDTH = 200
const MIN_DURATION_FOR_DISPLAY = 10
const ROW_HEIGHT = 56
const MIN_BODY_HEIGHT = 224

const props = defineProps({
  collapsed: { type: Boolean, default: false },
  height: { type: Number, default: 260 },
  trackers: { type: Array, default: () => [] },
  keyframes: { type: Object, required: true },
  duration: { type: Number, required: true },
  currentTime: { type: Number, required: true },
  isPlaying: { type: Boolean, required: true },
  audioWaveformData: { type: Array, default: null }
})

const emit = defineEmits([
  'update:collapsed',
  'height-change',
  'seek',
  'play',
  'pause',
  'add-all-keyframes',
  'add-keyframe',
  'remove-keyframe'
])

const headerRef = ref(null)
const bodyRef = ref(null)
const waveformCanvas = ref(null)
const headerHeight = ref(48)
const scrollLeft = ref(0)

onMounted(() => {
  nextTick(() => {
    headerHeight.value = headerRef.value?.offsetHeight || 48
    notifyHeight()
    drawWaveform()
  })
})

onUnmounted(() => {
  teardownDrag()
})

// 波形が変わったら再描画
watch(() => props.audioWaveformData, () => {
  nextTick(() => drawWaveform())
}, { deep: true })

// タイムライン幅が変わったら再描画
watch(timelineWidth, () => {
  nextTick(() => drawWaveform())
})

const displayDuration = computed(() => Math.max(props.duration, MIN_DURATION_FOR_DISPLAY))
const timelineWidth = computed(() => displayDuration.value * PIXELS_PER_SECOND)
const panelStyle = computed(() => ({ height: `${actualHeight.value}px` }))
const visibleTrackCount = computed(() => props.trackers?.length ?? 0)
const naturalBodyHeight = computed(() => visibleTrackCount.value * ROW_HEIGHT)
const requestedBodyHeight = computed(() => Math.max(props.height - headerHeight.value, 0))
const bodyHeight = computed(() => {
  if (props.collapsed) return 0
  const minimum = Math.max(MIN_BODY_HEIGHT, naturalBodyHeight.value)
  const requested = Math.max(0, requestedBodyHeight.value)
  return Math.max(minimum, requested)
})
const bodyStyle = computed(() => ({ height: `${bodyHeight.value}px` }))
const gridStyle = computed(() => ({ gridTemplateColumns: `${NAME_COLUMN_WIDTH}px ${timelineWidth.value}px` }))
const timeScaleStyle = computed(() => ({ width: `${timelineWidth.value}px` }))
const trackContentStyle = computed(() => ({ width: `${timelineWidth.value}px` }))

const waveformCanvasStyle = computed(() => ({
  width: `${timelineWidth.value}px`,
  height: `${bodyHeight.value}px`,
  left: `${NAME_COLUMN_WIDTH}px`
}))

const actualHeight = computed(() => (props.collapsed ? headerHeight.value : headerHeight.value + bodyHeight.value))

function notifyHeight() {
  emit('height-change', actualHeight.value)
}

watch(() => props.collapsed, () => nextTick(() => notifyHeight()))
watch(() => props.height, () => nextTick(() => notifyHeight()))
watch(headerHeight, () => notifyHeight())
watch(visibleTrackCount, () => nextTick(() => notifyHeight()))

const timeTicks = computed(() => {
  const ticks = []
  const total = displayDuration.value
  if (total <= 0) return ticks
  let step = 1
  if (total > 240) step = 30
  else if (total > 120) step = 10
  else if (total > 60) step = 5
  else if (total > 30) step = 2
  for (let t = 0; t <= total; t += step) {
    ticks.push(Number(t.toFixed(6)))
  }
  if (ticks[ticks.length - 1] !== total) ticks.push(Number(total.toFixed(6)))
  return ticks
})

const playheadLeft = computed(() => NAME_COLUMN_WIDTH - scrollLeft.value + props.currentTime * PIXELS_PER_SECOND)
const playheadStyle = computed(() => ({ transform: `translateX(${playheadLeft.value}px)` }))

function onScroll() {
  if (!bodyRef.value) return
  scrollLeft.value = bodyRef.value.scrollLeft
}

function clampTime(value) {
  if (!Number.isFinite(value)) return 0
  return Math.min(Math.max(value, 0), props.duration)
}

function computeTimeFromEvent(event) {
  if (!bodyRef.value) return props.currentTime
  const rect = bodyRef.value.getBoundingClientRect()
  const scroll = bodyRef.value.scrollLeft
  let x = event.clientX - rect.left + scroll - NAME_COLUMN_WIDTH
  const maxX = displayDuration.value * PIXELS_PER_SECOND
  x = Math.max(0, Math.min(maxX, x))
  const time = x / PIXELS_PER_SECOND
  return clampTime(time)
}

const dragging = ref(false)

function startSeek(event) {
  if (props.collapsed) return
  dragging.value = true
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  emit('seek', computeTimeFromEvent(event))
  event.preventDefault()
}

function onDrag(event) {
  if (!dragging.value) return
  emit('seek', computeTimeFromEvent(event))
  event.preventDefault()
}

function stopDrag(event) {
  if (!dragging.value) return
  dragging.value = false
  teardownDrag()
  if (event) event.preventDefault()
}

function teardownDrag() {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

function onTrackDoubleClick(event, trackerKey) {
  if (props.collapsed) return
  event.preventDefault()
  const time = computeTimeFromEvent(event)
  emit('seek', time)
  emit('add-keyframe', { trackerKey, time })
}

function emitRowKey(trackerKey) {
  emit('add-keyframe', { trackerKey, time: props.currentTime })
}

function handleAddAll() {
  emit('add-all-keyframes')
}

function handlePlayPause() {
  emit(props.isPlaying ? 'pause' : 'play')
}

function handleJumpStart() {
  emit('seek', 0)
}

function handleJumpEnd() {
  emit('seek', props.duration)
}

function toggleCollapse() {
  emit('update:collapsed', !props.collapsed)
}

function keyframesFor(key) {
  return props.keyframes?.[key] || []
}

function keyframeStyle(frame) {
  return { transform: `translateX(${frame.time * PIXELS_PER_SECOND}px)` }
}

function handleKeyframeClick(event, trackerKey, frameId) {
  event.preventDefault()
  emit('remove-keyframe', { trackerKey, keyframeId: frameId })
}

function formatTime(value) {
  if (!Number.isFinite(value)) return '0:00'
  const total = Math.max(0, value)
  const minutes = Math.floor(total / 60)
  const seconds = Math.floor(total % 60)
  const fractional = total - Math.floor(total)
  const ms = Math.round(fractional * 1000)
  if (ms > 0) {
    const hundredths = Math.floor(ms / 10)
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function tickStyle(time) {
  return { transform: `translateX(${time * PIXELS_PER_SECOND}px)` }
}

function drawWaveform() {
  const canvas = waveformCanvas.value
  if (!canvas || !props.audioWaveformData || props.audioWaveformData.length === 0) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = timelineWidth.value
  const height = bodyHeight.value
  
  // デバイスピクセル比を考慮
  const dpr = window.devicePixelRatio || 1
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  ctx.scale(dpr, dpr)

  // 背景をクリア（透明）
  ctx.clearRect(0, 0, width, height)

  // 波形を描画
  const waveData = props.audioWaveformData
  const centerY = height / 2

  // 実際のduration（オーディオの長さ）に対して波形を正確に配置
  const audioDuration = props.duration
  const displayDur = displayDuration.value
  
  // 波形の各サンプルを正確な時間位置に配置
  ctx.beginPath()
  ctx.strokeStyle = 'rgba(92, 140, 255, 0.25)'
  ctx.lineWidth = 1

  for (let i = 0; i < waveData.length; i++) {
    // サンプルの時間位置を計算（0〜audioDuration）
    const sampleTime = (i / (waveData.length - 1)) * audioDuration
    
    // その時間位置を画面上のX座標に変換
    const x = (sampleTime / displayDur) * width
    
    if (x < 0 || x > width) continue
    
    const amplitude = waveData[i]
    const y = centerY + (amplitude * centerY * 0.8)
    
    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }

  ctx.stroke()
}

function tickStyle(time) {
  return { transform: `translateX(${time * PIXELS_PER_SECOND}px)` }
}
</script>

<style scoped>
.waveform-canvas {
  position: absolute;
  top: 0;
  pointer-events: none;
  z-index: 1;
}

.timeline-panel {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(24, 26, 32, 0.95);
  color: #f0f0f0;
  display: flex;
  flex-direction: column;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  transition: height 0.2s ease;
  box-sizing: border-box;
  backdrop-filter: blur(6px);
}
.timeline-panel.collapsed {
  pointer-events: auto;
}
.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0.8rem;
  background: rgba(0, 0, 0, 0.35);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  box-sizing: border-box;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}
.title {
  font-weight: 600;
  letter-spacing: 0.04em;
}
.time-indicator {
  display: flex;
  align-items: baseline;
  gap: 0.3rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
}
.separator {
  opacity: 0.6;
}
.header-controls {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.header-controls button {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: inherit;
  padding: 0.35rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s ease, border 0.15s ease;
  min-width: 32px;
}
.header-controls button:hover {
  background: rgba(255, 255, 255, 0.16);
  border-color: rgba(255, 255, 255, 0.2);
}
.header-controls button:active {
  background: rgba(255, 255, 255, 0.25);
}
.collapse-toggle {
  margin-left: 0.6rem;
}
.timeline-body {
  position: relative;
  overflow-x: auto;
  overflow-y: auto;
  box-sizing: border-box;
}
.timeline-grid {
  position: relative;
  display: grid;
  grid-auto-rows: 42px;
  box-sizing: border-box;
}
.name-header,
.name-cell {
  position: sticky;
  left: 0;
  background: rgba(24, 26, 32, 0.95);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  padding: 0 0.75rem;
  box-sizing: border-box;
  z-index: 4;
}
.name-header {
  top: 0;
  height: 42px;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 5;
}
.time-header {
  position: sticky;
  top: 0;
  background: rgba(15, 17, 22, 0.92);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  height: 42px;
  box-sizing: border-box;
  z-index: 3;
  cursor: col-resize;
}
.time-scale {
  position: relative;
  height: 100%;
}
.time-tick {
  position: absolute;
  bottom: 0;
  width: 1px;
  height: 100%;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
}
.time-tick span {
  position: absolute;
  top: 4px;
  left: 4px;
  font-size: 0.75rem;
  background: rgba(0, 0, 0, 0.4);
  padding: 2px 6px;
  border-radius: 4px;
}
.name-cell {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.name-content {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.row-add {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: inherit;
  border-radius: 3px;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.row-add:hover {
  background: rgba(255, 255, 255, 0.2);
}
.track-cell {
  position: relative;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(10, 12, 18, 0.75);
  cursor: pointer;
}
.track-content {
  position: relative;
  height: 100%;
  background-image:
    repeating-linear-gradient(
      to right,
      rgba(255, 255, 255, 0.06) 0,
      rgba(255, 255, 255, 0.06) 1px,
      transparent 1px,
      transparent 20px
    );
}
.keyframe {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  margin-top: -6px;
  margin-left: -6px;
  background: #ff6b6b;
  transform: rotate(45deg);
  border: 2px solid #ffecec;
  cursor: pointer;
  transition: transform 0.1s ease, background 0.1s ease;
  z-index: 6;
}
.keyframe:hover {
  background: #ffd166;
  transform: rotate(45deg) scale(1.1);
}
.playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #ff3838;
  pointer-events: auto; /* make the playhead draggable */
  z-index: 7;
}
</style>
