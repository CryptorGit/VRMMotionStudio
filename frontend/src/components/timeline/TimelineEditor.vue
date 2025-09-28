<template>
  <section class="timeline" :style="timelineStyle" ref="timelineRef">
    <header class="timeline__toolbar">
      <div class="toolbar__group toolbar__group--left">
        <button
          type="button"
          class="toolbar__button"
          :aria-pressed="props.loop"
          @click="emit('toggle-loop')"
          :title="tooltip('ループ再生を切り替えます')"
        >
          <Icon icon="mdi:repeat" />
          <span>Loop</span>
        </button>
        <button
          type="button"
          class="toolbar__button"
          :aria-pressed="snapToFrame"
          @click="toggleSnap"
          :title="tooltip('フレームにスナップします')"
        >
          <Icon icon="mdi:ruler" />
          <span>Snap</span>
        </button>
        <button
          type="button"
          class="toolbar__button"
          @click="fitRange"
          :title="tooltip('タイムラインの全範囲を表示します')"
        >
          <Icon icon="mdi:magnify-scan" />
          <span>範囲フィット</span>
        </button>
        <button
          type="button"
          class="toolbar__button"
          @click="zoomToSelection"
          :disabled="!selectionRange"
          :title="tooltip('選択範囲をズームします')"
        >
          <Icon icon="mdi:target" />
          <span>選択ズーム</span>
        </button>
        <button
          type="button"
          class="toolbar__button"
          @click="emit('add-keyframe', { time: props.currentTime })"
          :title="tooltip('現在のフレームにキーを追加します')"
        >
          <Icon icon="mdi:animation" />
          <span>キー追加</span>
        </button>
      </div>

      <div class="toolbar__group toolbar__group--center">
        <button
          type="button"
          class="toolbar__button"
          @click="emit('jump-start')"
          :title="tooltip('開始フレームに移動します')"
        >
          <Icon icon="mdi:skip-backward" />
          <span>Start</span>
        </button>
        <button
          type="button"
          class="toolbar__button"
          @click="stepFrames(-1)"
          :title="tooltip('1フレーム戻ります')"
        >
          <Icon icon="mdi:step-backward" />
          <span>-1</span>
        </button>
        <button
          type="button"
          class="toolbar__button"
          @click="emit('play')"
          :title="tooltip('再生します')"
        >
          <Icon icon="mdi:play" />
          <span>Play</span>
        </button>
        <button
          type="button"
          class="toolbar__button"
          @click="emit('pause')"
          :title="tooltip('一時停止します')"
        >
          <Icon icon="mdi:pause" />
          <span>Pause</span>
        </button>
        <button
          type="button"
          class="toolbar__button"
          @click="emit('stop')"
          :title="tooltip('停止して開始位置へ戻ります')"
        >
          <Icon icon="mdi:stop" />
          <span>Stop</span>
        </button>
        <button
          type="button"
          class="toolbar__button"
          @click="stepFrames(1)"
          :title="tooltip('1フレーム進みます')"
        >
          <Icon icon="mdi:step-forward" />
          <span>+1</span>
        </button>
        <button
          type="button"
          class="toolbar__button"
          @click="emit('jump-end')"
          :title="tooltip('終了フレームに移動します')"
        >
          <Icon icon="mdi:skip-forward" />
          <span>End</span>
        </button>
      </div>

      <div class="toolbar__group toolbar__group--right">
        <button
          type="button"
          class="toolbar__button"
          @click="toggleMode"
          :title="tooltip(mode.value === 'time' ? 'フレーム表示に切り替えます' : '時間表示に切り替えます')"
        >
          <Icon :icon="modeIcon" />
          <span>{{ modeLabel }}</span>
        </button>
        <label class="toolbar__field">
          <span>Start</span>
          <input
            type="number"
            v-model.number="startFrameInput"
            @change="commitRange"
            @keydown.enter.prevent="commitRange"
          />
        </label>
        <label class="toolbar__field">
          <span>End</span>
          <input
            type="number"
            v-model.number="endFrameInput"
            @change="commitRange"
            @keydown.enter.prevent="commitRange"
          />
        </label>
        <button
          type="button"
          class="toolbar__button toolbar__button--secondary"
          @click="emit('request-import')"
          :title="tooltip('タイムラインをインポートします')"
        >
          <Icon icon="mdi:file-upload-outline" />
          <span>インポート</span>
        </button>
        <button
          type="button"
          class="toolbar__button toolbar__button--secondary"
          :disabled="!hasTimelineContent"
          @click="emit('export-timeline')"
          :title="tooltip('タイムラインをエクスポートします')"
        >
          <Icon icon="mdi:file-download-outline" />
          <span>エクスポート</span>
        </button>
        <button
          type="button"
          class="toolbar__button toolbar__button--alert"
          :disabled="!hasTimelineContent"
          @click="emit('clear-timeline')"
          :title="tooltip('タイムラインをクリアします')"
        >
          <Icon icon="mdi:trash-can-outline" />
          <span>クリア</span>
        </button>
      </div>
    </header>

    <div class="timeline__header">
      <div
        class="timeline__ticks-wrapper"
        ref="ticksWrapperRef"
        @scroll="handleTicksScroll"
        @wheel="handleHeaderWheel"
      >
        <div class="timeline__ticks" :style="ticksStyle">
          <div
            v-for="tick in ticks"
            :key="tick.id"
            class="timeline__tick"
            :class="{ 'timeline__tick--major': tick.major }"
            :style="{ left: `${tick.x}px` }"
            :title="tick.label"
          >
            <div v-if="tick.showLabel" class="timeline__tick-label">
              <span class="timeline__tick-label-time">{{ tick.timeLabel }}</span>
              <span class="timeline__tick-label-frame">{{ tick.frameLabel }}</span>
            </div>
          </div>
          <div class="timeline__playhead timeline__playhead--header" :style="playheadStyle" aria-hidden="true"></div>
          <div class="timeline__current-frame" :style="playheadStyle">
            <div class="timeline__current-frame-indicator">
              <span>{{ currentFrameLabel }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="timeline__body">
      <div
        class="timeline__scroll-area"
        ref="tracksWrapperRef"
        @scroll="handleTracksScroll"
        @pointerdown="handlePointerDown"
        @wheel="handleWheel"
      >
        <div class="timeline__content" :style="contentStyle">
          <div class="timeline__gridlines" aria-hidden="true">
            <div
              v-for="tick in ticks"
              :key="`grid-${tick.id}`"
              class="timeline__gridline"
              :class="{ 'timeline__gridline--major': tick.major }"
              :style="{ left: `${tick.x}px` }"
            ></div>
          </div>

          <div class="timeline__memory" :style="memoryStyle"></div>

          <div v-if="!hasTimelineContent" class="timeline__empty">
            <Icon icon="mdi:timeline-clock-outline" class="timeline__empty-icon" />
            <p class="timeline__empty-title">まだキーがありません</p>
            <p class="timeline__empty-sub">時間軸上をダブルクリックするか「キー追加」で現在のポーズを保存できます。</p>
          </div>

          <div class="timeline__keys">
            <div
              v-for="frame in visibleFrames"
              :key="frame.id"
              class="timeline__keyframe"
              :class="{ 'is-selected': selectedKeyframes.has(frame.id) }"
              :style="{ left: `${timeToX(frame.time)}px` }"
              @pointerdown.stop.prevent="startKeyframeDrag($event, frame)"
              @contextmenu.prevent="emit('remove-keyframe', { keyframeId: frame.id })"
              :title="tooltip(keyTitle(frame))"
            ></div>
          </div>

          <div class="timeline__playhead timeline__playhead--body" :style="playheadStyle" aria-hidden="true"></div>
          <div v-if="selectionRange" class="timeline__selection" :style="selectionStyle"></div>
        </div>
      </div>
    </div>

    <div class="timeline__scrollbar">
      <div
        class="timeline__scrollbar-track"
        ref="scrollbarWrapperRef"
        @scroll="handleScrollbarScroll"
      >
        <div class="timeline__scrollbar-spacer" :style="{ width: `${contentWidth}px` }"></div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useCaptions } from '../../composables/useCaptions.js'

const MIN_VIEW_DURATION_EPSILON = 1e-6
const EDGE_MARGIN_RATIO = 0.05

const props = defineProps({
  keyframes: { type: Array, default: () => [] },
  currentTime: { type: Number, required: true },
  startTime: { type: Number, required: true },
  endTime: { type: Number, required: true },
  frameRate: { type: Number, required: true },
  isPlaying: { type: Boolean, required: true },
  loop: { type: Boolean, default: false },
  snap: { type: Boolean, default: true },
  height: { type: [Number, String], default: null }
})

const emit = defineEmits([
  'seek',
  'play',
  'pause',
  'stop',
  'step-frames',
  'jump-start',
  'jump-end',
  'toggle-loop',
  'add-keyframe',
  'remove-keyframe',
  'move-keyframe',
  'update-range',
  'update:snap',
  'request-import',
  'export-timeline',
  'clear-timeline'
])

const { tooltip } = useCaptions()

const timelineRef = ref(null)
const tracksWrapperRef = ref(null)
const ticksWrapperRef = ref(null)
const scrollbarWrapperRef = ref(null)

const widthPx = ref(1)
const mode = ref('time')
const viewStart = ref(0)
const visibleDuration = ref(1)
const snapToFrame = ref(props.snap !== false)
const selectionRange = ref(null)
const selectedKeyframes = ref(new Set())
const startFrameInput = ref(0)
const endFrameInput = ref(0)

const STORAGE_KEY_VIEW = 'timeline.view.v2'
const STORAGE_KEY_MODE = 'timeline.view.mode'

const keyframesList = computed(() => (Array.isArray(props.keyframes) ? props.keyframes : []))
const hasTimelineContent = computed(() => keyframesList.value.length > 0)

const frameDuration = computed(() => 1 / Math.max(props.frameRate || 60, 1))
const minViewDuration = computed(() => Math.max(frameDuration.value, MIN_VIEW_DURATION_EPSILON))

const baseDuration = computed(() => Math.max(props.endTime - props.startTime, minViewDuration.value))
const marginSpan = computed(() => baseDuration.value * EDGE_MARGIN_RATIO)
const extendedStart = computed(() => props.startTime - marginSpan.value)
const extendedEnd = computed(() => props.endTime + marginSpan.value)
const extendedDuration = computed(() => Math.max(extendedEnd.value - extendedStart.value, minViewDuration.value))
const viewEnd = computed(() => viewStart.value + visibleDuration.value)
const pixelsPerSecond = computed(() => widthPx.value / Math.max(visibleDuration.value, minViewDuration.value))
const contentExtent = computed(() => Math.max(extendedDuration.value, visibleDuration.value))
const contentWidth = computed(() => Math.max(contentExtent.value * pixelsPerSecond.value, widthPx.value + 1))

const timelineStyle = computed(() => {
  const style = {}
  if (props.height === null || props.height === undefined) {
    style.height = '100%'
  } else if (typeof props.height === 'number') {
    style.height = `${props.height}px`
  } else {
    style.height = props.height
  }
  return style
})

const ticksStyle = computed(() => ({
  width: `${contentWidth.value}px`,
  minWidth: `${Math.max(widthPx.value + 1, 1)}px`
}))

const contentStyle = computed(() => ({
  width: `${contentWidth.value}px`
}))

const playheadStyle = computed(() => ({
  left: `${timeToX(props.currentTime)}px`
}))

const currentFrameLabel = computed(() => {
  const fps = props.frameRate || 60
  const startFrame = Math.round(props.startTime * fps)
  const frameNumber = startFrame + Math.round((props.currentTime - props.startTime) * fps)
  return Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(frameNumber)
})

const selectionStyle = computed(() => {
  if (!selectionRange.value) return {}
  const start = Math.min(selectionRange.value.start, selectionRange.value.end)
  const end = Math.max(selectionRange.value.start, selectionRange.value.end)
  return {
    left: `${timeToX(start)}px`,
    width: `${Math.max(1, timeToX(end) - timeToX(start))}px`
  }
})

const memoryStyle = computed(() => {
  const clamped = clampTime(props.currentTime)
  const startX = timeToX(props.startTime)
  const endX = timeToX(clamped)
  return {
    left: `${startX}px`,
    width: `${Math.max(0, endX - startX)}px`
  }
})

const visibleFrames = computed(() => {
  const items = keyframesList.value
  if (!items.length) return []
  const margin = Math.max(minViewDuration.value, visibleDuration.value * 0.1)
  return items.filter(frame => frame.time >= viewStart.value - margin && frame.time <= viewEnd.value + margin)
})

const ticks = computed(() => {
  const approxTickPx = 60
  const pxPerSecond = pixelsPerSecond.value || 1
  const approxStep = approxTickPx / pxPerSecond
  const fps = props.frameRate || 60
  const startFrame = Math.round(props.startTime * fps)
  const stepCandidates = [
    1 / fps,
    2 / fps,
    5 / fps,
    10 / fps,
    1 / 2,
    1,
    2,
    5,
    10,
    20,
    30,
    60,
    120,
    300,
    600,
    1200,
    3600
  ]
  let step = stepCandidates.find(s => s >= approxStep) || stepCandidates[stepCandidates.length - 1]
  if (mode.value === 'frames' && step < 1 / fps) step = 1 / fps

  const timeMajorSteps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1200, 3600]
  const frameMajorSteps = [1, 2, 5, 10, 20, 30, 60, 120, 240]

  let majorStep
  if (mode.value === 'frames') {
    const frameStep = Math.max(1, Math.round(step * fps))
    const chosenFrames = frameMajorSteps.find(opt => opt >= frameStep) || frameMajorSteps[frameMajorSteps.length - 1]
    majorStep = chosenFrames / fps
  } else {
    const target = step * 4
    const chosenSeconds = timeMajorSteps.find(opt => opt >= target) || timeMajorSteps[timeMajorSteps.length - 1]
    majorStep = chosenSeconds
  }
  majorStep = Math.max(majorStep, step)

  const first = Math.floor(viewStart.value / step) * step
  const firstMajor = Math.floor(viewStart.value / majorStep) * majorStep

  const arr = []
  for (let t = first; t <= viewEnd.value + step; t += step) {
    const snapped = Math.round((t - firstMajor) / majorStep)
    const nearestMajor = firstMajor + snapped * majorStep
    const isMajor = Math.abs(nearestMajor - t) < step * 0.6
    const frameNumber = startFrame + Math.round((t - props.startTime) * fps)
    const timeLabel = formatTimeLabel(t)
    const frameLabel = formatFrameLabel(frameNumber)
    arr.push({
      id: `tick-${t.toFixed(6)}`,
      x: timeToX(t),
      label: `${timeLabel} | ${frameLabel}`,
      timeLabel,
      frameLabel,
      major: isMajor,
      showLabel: isMajor
    })
  }
  return arr
})

const modeLabel = computed(() => (mode.value === 'time' ? 'Time' : 'Frames'))
const modeIcon = computed(() => (mode.value === 'time' ? 'mdi:timeline-clock-outline' : 'mdi:filmstrip'))

watch(
  () => props.snap,
  value => {
    snapToFrame.value = value !== false
  }
)

watch(
  () => props.startTime,
  value => {
    startFrameInput.value = Math.round(value * props.frameRate)
    clampView()
    syncScrollPositions()
  },
  { immediate: true }
)

watch(
  () => props.endTime,
  value => {
    endFrameInput.value = Math.round(value * props.frameRate)
    clampView()
    syncScrollPositions()
  },
  { immediate: true }
)

watch([viewStart, visibleDuration], () => {
  clampView()
  saveViewState()
  nextTick(() => syncScrollPositions())
})

watch(mode, value => {
  try {
    localStorage.setItem(STORAGE_KEY_MODE, value)
  } catch {}
})

watch(minViewDuration, () => {
  clampView()
  syncScrollPositions()
})

onMounted(() => {
  restoreViewState()
  try {
    const savedMode = localStorage.getItem(STORAGE_KEY_MODE)
    if (savedMode === 'time' || savedMode === 'frames') mode.value = savedMode
  } catch {}
  if (!snapToFrame.value) {
    snapToFrame.value = true
    emit('update:snap', true)
  }
  nextTick(() => syncScrollPositions())
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  if (resizeRaf !== null) cancelAnimationFrame(resizeRaf)
})

let resizeObserver
let resizeRaf = null
let syncingScroll = false
let dragState = null

function clampView() {
  visibleDuration.value = Math.min(
    Math.max(visibleDuration.value, minViewDuration.value),
    extendedDuration.value
  )
  const minStart = extendedStart.value
  const maxStart = Math.max(minStart, extendedEnd.value - visibleDuration.value)
  viewStart.value = Math.min(Math.max(viewStart.value, minStart), maxStart)
}

function saveViewState() {
  try {
    localStorage.setItem(
      STORAGE_KEY_VIEW,
      JSON.stringify({ start: viewStart.value, duration: visibleDuration.value })
    )
  } catch {}
}

function restoreViewState() {
  viewStart.value = extendedStart.value
  visibleDuration.value = extendedDuration.value
  try {
    const saved = localStorage.getItem(STORAGE_KEY_VIEW)
    if (!saved) return
    const parsed = JSON.parse(saved)
    if (
      Number.isFinite(parsed.start) &&
      Number.isFinite(parsed.duration) &&
      parsed.duration > 0
    ) {
      viewStart.value = parsed.start
      visibleDuration.value = parsed.duration
      clampView()
    }
  } catch {}
}

function observeSize() {
  resizeObserver?.disconnect()
  const target = tracksWrapperRef.value
  if (!target) return
  resizeObserver = new ResizeObserver(entries => {
    const entry = entries[0]
    if (!entry) return
    const availableWidth = Math.max(entry.contentRect.width, 1)
    if (Math.abs(availableWidth - widthPx.value) < 0.5) return
    if (resizeRaf !== null) cancelAnimationFrame(resizeRaf)
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = null
      widthPx.value = availableWidth
      syncScrollPositions()
    })
  })
  resizeObserver.observe(target)
}

watch(
  () => tracksWrapperRef.value,
  () => nextTick(() => observeSize()),
  { immediate: true }
)

function syncScrollPositions(source) {
  if (!tracksWrapperRef.value) return
  const offset = Math.max(0, (viewStart.value - extendedStart.value) * pixelsPerSecond.value)
  const assignScroll = el => {
    if (!el) return
    if (Math.abs(el.scrollLeft - offset) > 0.5) {
      el.scrollLeft = offset
    }
  }
  syncingScroll = true
  if (source !== 'tracks') assignScroll(tracksWrapperRef.value)
  if (ticksWrapperRef.value && source !== 'ticks') assignScroll(ticksWrapperRef.value)
  if (scrollbarWrapperRef.value && source !== 'scrollbar') assignScroll(scrollbarWrapperRef.value)
  requestAnimationFrame(() => {
    syncingScroll = false
  })
}

function handleTracksScroll(event) {
  if (syncingScroll) return
  const target = event.target
  const newStart = extendedStart.value + target.scrollLeft / pixelsPerSecond.value
  if (Math.abs(newStart - viewStart.value) < 1e-4) return
  viewStart.value = newStart
  clampView()
  syncScrollPositions('tracks')
}

function handleScrollbarScroll(event) {
  if (syncingScroll) return
  const target = event.target
  const newStart = extendedStart.value + target.scrollLeft / pixelsPerSecond.value
  if (Math.abs(newStart - viewStart.value) < 1e-4) return
  viewStart.value = newStart
  clampView()
  syncScrollPositions('scrollbar')
}

function handleTicksScroll(event) {
  if (syncingScroll) return
  const target = event.target
  const newStart = extendedStart.value + target.scrollLeft / pixelsPerSecond.value
  if (Math.abs(newStart - viewStart.value) < 1e-4) return
  viewStart.value = newStart
  clampView()
  syncScrollPositions('ticks')
}

function handleHeaderWheel(event) {
  event.preventDefault()
  const factor = event.deltaY > 0 ? 1.1 : 0.9
  const rect = ticksWrapperRef.value?.getBoundingClientRect()
  const scrollLeft = tracksWrapperRef.value?.scrollLeft || 0
  const x = rect ? Math.max(0, event.clientX - rect.left) : widthPx.value / 2
  const pivot = clampViewTime(extendedStart.value + (scrollLeft + x) / pixelsPerSecond.value)
  zoomAt(pivot, factor)
}

function handleWheel(event) {
  if (!tracksWrapperRef.value) return
  const rect = tracksWrapperRef.value.getBoundingClientRect()
  const scrollLeft = tracksWrapperRef.value.scrollLeft
  const x = Math.max(0, event.clientX - rect.left)

  if (Math.abs(event.deltaX) > Math.abs(event.deltaY) && Math.abs(event.deltaX) > 0) {
    tracksWrapperRef.value.scrollLeft += event.deltaX
    event.preventDefault()
    return
  }

  const pivot = clampViewTime(extendedStart.value + (scrollLeft + x) / pixelsPerSecond.value)
  const baseFactor = event.deltaY > 0 ? 1.1 : 0.9
  const factor = event.shiftKey ? Math.pow(baseFactor, 2) : baseFactor
  zoomAt(pivot, factor)
  event.preventDefault()
}

function zoomAt(pivot, factor) {
  const nextDuration = Math.min(
    Math.max(visibleDuration.value * factor, minViewDuration.value),
    extendedDuration.value
  )
  const ratio = (pivot - viewStart.value) / visibleDuration.value || 0
  visibleDuration.value = nextDuration
  viewStart.value = pivot - nextDuration * ratio
  clampView()
  syncScrollPositions()
}

function stepFrames(delta) {
  emit('step-frames', delta)
}

function fitRange() {
  visibleDuration.value = extendedDuration.value
  viewStart.value = extendedStart.value
  clampView()
  syncScrollPositions()
}

function zoomToSelection() {
  if (!selectionRange.value) return
  const start = Math.min(selectionRange.value.start, selectionRange.value.end)
  const end = Math.max(selectionRange.value.start, selectionRange.value.end)
  if (end <= start) return
  viewStart.value = start
  visibleDuration.value = Math.max(end - start, minViewDuration.value)
  clampView()
  syncScrollPositions()
}

function toggleSnap() {
  snapToFrame.value = !snapToFrame.value
  emit('update:snap', snapToFrame.value)
}

function toggleMode() {
  mode.value = mode.value === 'time' ? 'frames' : 'time'
}

function commitRange() {
  const startF = Math.min(startFrameInput.value, endFrameInput.value - 1)
  const endF = Math.max(endFrameInput.value, startFrameInput.value + 1)
  emit('update-range', { startFrame: startF, endFrame: endF })
}

function timeToX(time) {
  return (time - extendedStart.value) * pixelsPerSecond.value
}

function clampViewTime(time) {
  return Math.min(Math.max(time, extendedStart.value), extendedEnd.value)
}

function clampTime(time) {
  return Math.min(Math.max(time, props.startTime), props.endTime)
}

function snapTimeToFrame(time) {
  const duration = frameDuration.value
  if (duration <= 0) return time
  return Math.round(time / duration) * duration
}

function snapIfNeeded(time) {
  if (!snapToFrame.value) return time
  return snapTimeToFrame(time)
}

function formatTimeLabel(time) {
  if (!Number.isFinite(time)) return ''
  const relative = time - props.startTime
  const sign = relative < 0 ? '-' : ''
  const abs = Math.abs(relative)
  let decimals = 2
  if (abs >= 10) decimals = 1
  if (abs >= 60) decimals = 0
  return `${sign}${abs.toFixed(decimals)}s`
}

function formatFrameLabel(frameNumber) {
  return `F${frameNumber}`
}

function getPointerInfo(event) {
  if (!tracksWrapperRef.value) {
    return { time: props.startTime, x: 0 }
  }
  const rect = tracksWrapperRef.value.getBoundingClientRect()
  const scrollLeft = tracksWrapperRef.value.scrollLeft
  let x = event.clientX - rect.left
  x = Math.max(0, x)
  const absoluteTime = extendedStart.value + (scrollLeft + x) / pixelsPerSecond.value
  const time = clampTime(absoluteTime)
  return { time, x }
}

function handlePointerDown(event) {
  if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
    startPan(event)
    return
  }
  if (event.button !== 0) return

  if (event.ctrlKey || event.metaKey || event.altKey) {
    startSelection(event)
    return
  }

  if (!event.shiftKey) clearSelection()

  const { time } = getPointerInfo(event)
  emit('seek', snapIfNeeded(time))
  dragState = { type: 'scrub' }
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
}

function handlePointerMove(event) {
  if (!dragState) return
  if (dragState.type === 'scrub') {
    const { time } = getPointerInfo(event)
    emit('seek', snapIfNeeded(time))
  } else if (dragState.type === 'select') {
    const { time } = getPointerInfo(event)
    selectionRange.value = { start: dragState.anchorTime, end: time }
  } else if (dragState.type === 'pan') {
    const deltaSeconds = event.movementX / pixelsPerSecond.value
    viewStart.value = clampViewTime(viewStart.value - deltaSeconds)
    clampView()
    syncScrollPositions()
  } else if (dragState.type === 'keyframe') {
    const { time } = getPointerInfo(event)
    const targetTime = clampTime(time - dragState.offset)
    const snapped = snapIfNeeded(targetTime)
    if (Math.abs(snapped - dragState.lastTime) > 1e-5) {
      dragState.lastTime = snapped
      emit('move-keyframe', {
        keyframeId: dragState.keyId,
        time: snapped
      })
    }
  }
}

function handlePointerUp() {
  if (dragState?.type === 'select') {
    finalizeSelection()
  }
  dragState = null
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
}

function startPan(event) {
  dragState = { type: 'pan' }
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
  event.preventDefault()
}

function startSelection(event) {
  const { time } = getPointerInfo(event)
  selectionRange.value = { start: time, end: time }
  dragState = { type: 'select', anchorTime: time }
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
  event.preventDefault()
}

function finalizeSelection() {
  if (!selectionRange.value) return
  const start = Math.min(selectionRange.value.start, selectionRange.value.end)
  const end = Math.max(selectionRange.value.start, selectionRange.value.end)
  if (end - start < 1 / (props.frameRate * 10)) {
    selectionRange.value = null
    selectedKeyframes.value = new Set()
    return
  }
  const collected = new Set()
  keyframesList.value.forEach(frame => {
    if (frame.time >= start && frame.time <= end) {
      collected.add(frame.id)
    }
  })
  selectedKeyframes.value = collected
}

function clearSelection() {
  if (!selectionRange.value && selectedKeyframes.value.size === 0) return
  selectionRange.value = null
  selectedKeyframes.value = new Set()
}

function startKeyframeDrag(event, frame) {
  const { time } = getPointerInfo(event)
  const offset = time - frame.time
  if (!event.shiftKey && !selectedKeyframes.value.has(frame.id)) {
    selectedKeyframes.value = new Set([frame.id])
  }
  dragState = {
    type: 'keyframe',
    keyId: frame.id,
    offset,
    lastTime: frame.time
  }
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
  event.preventDefault()
}

function keyTitle(frame) {
  return `t=${frame.time.toFixed(3)}s`
}
</script>

<style scoped>
.timeline {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  background: radial-gradient(circle at top, rgba(32, 38, 52, 0.85), rgba(12, 15, 24, 0.96));
  color: var(--text-strong, #ffffff);
  border-top: 1px solid var(--border-soft, rgba(255, 255, 255, 0.08));
  user-select: none;
  -webkit-user-select: none;
  --timeline-ruler-height: 46px;
  --timeline-key-lane-height: 36px;
  --timeline-playhead-color: #ff615a;
}

.timeline input,
.timeline button,
.timeline textarea,
.timeline select {
  user-select: text;
  -webkit-user-select: text;
}

.timeline__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.45rem 0.75rem;
  gap: 0.5rem;
  border-bottom: 1px solid var(--border-soft, rgba(255, 255, 255, 0.1));
  background: var(--surface, rgba(24, 28, 38, 0.95));
  position: sticky;
  top: 0;
  z-index: 6;
}

.toolbar__group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.toolbar__group--center {
  flex: 1 1 auto;
  justify-content: center;
}

.toolbar__group--right {
  justify-content: flex-end;
}

.toolbar__button {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: inherit;
  border-radius: 6px;
  padding: 0.3rem 0.55rem;
  min-width: 44px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  font-size: 0.82rem;
  cursor: pointer;
  transition: background 120ms ease, border 120ms ease, transform 120ms ease;
}

.toolbar__button:hover,
.toolbar__button:focus-visible,
.toolbar__button[aria-pressed='true'] {
  outline: none;
  background: color-mix(in srgb, var(--accent, #2d8cff) 35%, rgba(255, 255, 255, 0.08));
  border-color: color-mix(in srgb, var(--accent, #2d8cff) 55%, rgba(255, 255, 255, 0.08));
  transform: translateY(-1px);
}

.toolbar__button:disabled {
  opacity: 0.5;
  pointer-events: none;
}

.toolbar__button--secondary {
  background: rgba(255, 255, 255, 0.04);
}

.toolbar__button--alert {
  background: rgba(255, 94, 94, 0.12);
  border-color: rgba(255, 94, 94, 0.25);
}

.toolbar__button--alert:hover,
.toolbar__button--alert:focus-visible {
  background: rgba(255, 94, 94, 0.18);
}

.toolbar__field {
  display: flex;
  flex-direction: column;
  font-size: 0.7rem;
  color: var(--text-muted, rgba(255, 255, 255, 0.72));
}

.toolbar__field input {
  margin-top: 0.15rem;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  padding: 0.2rem 0.4rem;
  color: inherit;
  width: 88px;
}
.timeline__header {
  position: relative;
  height: var(--timeline-ruler-height);
  border-bottom: none;
  background: linear-gradient(180deg, rgba(47, 54, 70, 0.92), rgba(20, 24, 33, 0.98));
  box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.08);
  z-index: 5;
  display: flex;
  align-items: stretch;
}

.timeline__ticks-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  background: var(--surface-strong, rgba(15, 19, 28, 0.96));
}

.timeline__ticks-wrapper::-webkit-scrollbar {
  height: 0;
}

.timeline__ticks-wrapper {
  scrollbar-width: none;
}

.timeline__ticks {
  position: relative;
  height: 100%;
  padding: 10px 0 0;
}

.timeline__ticks::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: linear-gradient(90deg, rgba(90, 146, 255, 0.32), rgba(255, 255, 255, 0.1));
  pointer-events: none;
}



.timeline__tick {
  position: absolute;
  top: 8px;
  bottom: 6px;
  width: 1px;
  background: rgba(255, 255, 255, 0.16);
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  flex-direction: column;
  pointer-events: none;
}

.timeline__tick-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-left: 6px;
  margin-top: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(17, 21, 31, 0.88);
  color: rgba(240, 244, 255, 0.96);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  min-width: 48px;
}

.timeline__tick-label-time {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.timeline__tick-label-frame {
  font-size: 0.62rem;
  font-weight: 500;
  opacity: 0.8;
  letter-spacing: 0.01em;
}

.timeline__tick::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 0;
  width: 100%;
  height: 12px;
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-100%);
  opacity: 0.6;
}

.timeline__tick--major {
  width: 2px;
  background: rgba(255, 255, 255, 0.34);
}

.timeline__tick--major::before {
  height: 18px;
  background: rgba(255, 255, 255, 0.45);
  opacity: 0.9;
}

.timeline__current-frame {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 6;
}

.timeline__current-frame-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--timeline-playhead-color);
  color: #0e1018;
  font-weight: 700;
  font-size: 0.72rem;
  box-shadow: 0 0 18px rgba(255, 97, 90, 0.45);
  border: 2px solid rgba(255, 255, 255, 0.85);
}

.timeline__current-frame-indicator span {
  transform: translateY(1px);
}

.timeline__body {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(12, 16, 24, 0.92), rgba(8, 11, 18, 0.96));
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.timeline__scroll-area {
  position: relative;
  width: 100%;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}

.timeline__content {
  position: relative;
  min-height: 100%;
  padding: 0 0 10px;
}

.timeline__gridlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}


.timeline__gridline {
  position: absolute;
  top: 0;
  bottom: 10px;
  width: 1px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(0.5px);
}

.timeline__gridline--major {
  width: 2px;
  background: rgba(255, 255, 255, 0.18);
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.32);
}

.timeline__memory {
  position: absolute;
  top: 0;
  bottom: 10px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--accent, #2d8cff) 20%, transparent), transparent 80%);
  opacity: 0.35;
  pointer-events: none;
  z-index: 1;
  border-radius: 4px 0 0 4px;
}


 
.timeline__keys {
  position: relative;
  min-height: var(--timeline-key-lane-height);
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 10px 0;
  z-index: 3;
  pointer-events: none;
}

.timeline__keys::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 1px;
  background: rgba(255, 255, 255, 0.18);
  pointer-events: none;
}

.timeline__keyframe {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%) rotate(45deg);
  width: 12px;
  height: 12px;
  border-radius: 2px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  background: color-mix(in srgb, var(--accent, #2d8cff) 82%, rgba(255, 255, 255, 0.08));
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
  pointer-events: auto;
}

.timeline__keyframe:hover,
.timeline__keyframe.is-selected {
  transform: translate(-50%, -50%) rotate(45deg) scale(1.15);
  box-shadow: 0 0 12px rgba(45, 140, 255, 0.85);
  background: color-mix(in srgb, var(--accent, #2d8cff) 90%, rgba(255, 255, 255, 0.3));
}

.timeline__playhead {
  position: absolute;
  top: 0;
  bottom: 10px;
  width: 2px;
  background: var(--timeline-playhead-color);
  pointer-events: none;
  box-shadow: 0 0 18px rgba(255, 97, 90, 0.55);
  z-index: 5;
  transform: translateX(-50%);
}

.timeline__playhead--header {
  top: 0;
  bottom: 0;
  box-shadow: 0 0 12px rgba(255, 97, 90, 0.4);
}

.timeline__playhead--header::after {
  content: '';
  position: absolute;
  top: -6px;
  left: 50%;
  width: 10px;
  height: 10px;
  background: var(--timeline-playhead-color);
  border-radius: 2px;
  transform: translate(-50%, -50%) rotate(45deg);
  box-shadow: 0 0 12px rgba(255, 97, 90, 0.45);
}

.timeline__playhead--body {
  top: 2px;
  bottom: 12px;
  box-shadow: 0 0 18px rgba(255, 97, 90, 0.55);
}

.timeline__selection {
  position: absolute;
  top: 6px;
  bottom: 12px;
  background: color-mix(in srgb, var(--accent, #2d8cff) 20%, transparent);
  border: 1px dashed color-mix(in srgb, var(--accent, #2d8cff) 45%, transparent);
  border-radius: 4px;
  pointer-events: none;
  z-index: 2;
}

.timeline__scrollbar {
  position: relative;
  height: 14px;
  background: rgba(10, 12, 20, 0.25);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(6px);
}

.timeline__scrollbar-track {
  width: 100%;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  background: rgba(12, 16, 24, 0.18);
  scrollbar-color: rgba(255, 255, 255, 0.25) transparent;
}

.timeline__scrollbar-track::-webkit-scrollbar-track {
  background: transparent;
}

.timeline__scrollbar-track::-webkit-scrollbar {
  height: 8px;
}

.timeline__scrollbar-track::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.24);
  border-radius: 100px;
}

.timeline__scrollbar-track::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.34);
}

.timeline__scrollbar-spacer {
  height: 100%;
}

@media (max-width: 960px) {
  .toolbar__group--center {
    justify-content: flex-start;
  }

  .toolbar__button {
    min-width: 38px;
  }
}
</style>
