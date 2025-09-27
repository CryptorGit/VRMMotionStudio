<template>
  <section class="timeline" :style="timelineStyle" ref="timelineRef">
    <header class="timeline__toolbar">
      <div class="toolbar__group toolbar__group--left">
        <button
          type="button"
          class="toolbar__button"
          :aria-pressed="props.loop"
          @click="emit('toggle-loop')"
        >
          <Icon icon="mdi:repeat" />
          <span>Loop</span>
        </button>
        <button
          type="button"
          class="toolbar__button"
          :aria-pressed="snapToFrame"
          @click="toggleSnap"
        >
          <Icon icon="mdi:ruler" />
          <span>Snap</span>
        </button>
        <button type="button" class="toolbar__button" @click="fitRange">
          <Icon icon="mdi:magnify-scan" />
          <span>範囲フィット</span>
        </button>
        <button
          type="button"
          class="toolbar__button"
          @click="zoomToSelection"
          :disabled="!selectionRange"
        >
          <Icon icon="mdi:target" />
          <span>選択ズーム</span>
        </button>
        <button type="button" class="toolbar__button" @click="emit('add-all-keyframes')">
          <Icon icon="mdi:animation" />
          <span>全キー</span>
        </button>
      </div>

      <div class="toolbar__group toolbar__group--center">
        <button type="button" class="toolbar__button" @click="emit('jump-start')">
          <Icon icon="mdi:skip-backward" />
          <span>Start</span>
        </button>
        <button type="button" class="toolbar__button" @click="stepFrames(-1)">
          <Icon icon="mdi:step-backward" />
          <span>-1</span>
        </button>
        <button type="button" class="toolbar__button" @click="emit('play')">
          <Icon icon="mdi:play" />
          <span>Play</span>
        </button>
        <button type="button" class="toolbar__button" @click="emit('pause')">
          <Icon icon="mdi:pause" />
          <span>Pause</span>
        </button>
        <button type="button" class="toolbar__button" @click="emit('stop')">
          <Icon icon="mdi:stop" />
          <span>Stop</span>
        </button>
        <button type="button" class="toolbar__button" @click="stepFrames(1)">
          <Icon icon="mdi:step-forward" />
          <span>+1</span>
        </button>
        <button type="button" class="toolbar__button" @click="emit('jump-end')">
          <Icon icon="mdi:skip-forward" />
          <span>End</span>
        </button>
      </div>

      <div class="toolbar__group toolbar__group--right">
        <button type="button" class="toolbar__button" @click="toggleMode">
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
      </div>
    </header>

    <div class="timeline__header">
      <div class="timeline__label-placeholder"></div>
      <div
        class="timeline__ticks-wrapper"
        ref="ticksWrapperRef"
        @wheel="handleHeaderWheel"
      >
        <div class="timeline__ticks" :style="ticksStyle">
          <div
            v-for="tick in ticks"
            :key="tick.id"
            class="timeline__tick"
            :style="{ left: `${tick.x}px` }"
          >
            <span>{{ tick.label }}</span>
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
        @wheel="handleTrackWheel"
      >
        <div class="timeline__tracks" :style="tracksStyle">
          <div class="timeline__grid" :style="gridStyle">
            <div class="timeline__channel timeline__channel--markers">
              <div class="timeline__channel-header">Markers</div>
              <div class="timeline__channel-body" @dblclick.stop="addMarkerFromEvent">
                <div
                  v-for="marker in visibleMarkers"
                  :key="marker.id"
                  class="timeline__marker"
                  :style="{ left: `${timeToX(marker.time)}px` }"
                  @pointerdown.stop.prevent="startMarkerDrag($event, marker)"
                  :title="marker.label"
                >
                  <span>{{ marker.label }}</span>
                </div>
              </div>
            </div>

            <div
              v-for="tracker in props.trackers"
              :key="tracker.key"
              class="timeline__channel"
            >
              <div class="timeline__channel-header">
                <span>{{ tracker.label || tracker.key }}</span>
                <button
                  type="button"
                  class="channel__add"
                  @click.stop="emit('add-keyframe', { trackerKey: tracker.key, time: props.currentTime })"
                >
                  ＋
                </button>
              </div>
              <div class="timeline__channel-body">
                <template v-for="frame in visibleKeyframes(tracker.key)" :key="frame.id">
                  <div
                    class="timeline__keyframe"
                    :class="{ 'is-selected': selectedKeyframes.has(`${tracker.key}:${frame.id}`) }"
                    :style="{ left: `${timeToX(frame.time)}px`, background: keyColor(tracker.key) }"
                    @pointerdown.stop.prevent="startKeyframeDrag($event, tracker.key, frame)"
                    @dblclick.stop.prevent="emit('remove-keyframe', { trackerKey: tracker.key, keyframeId: frame.id })"
                    :title="keyTitle(frame)"
                  ></div>
                </template>
              </div>
            </div>
          </div>
          <div class="timeline__playhead" :style="playheadStyle"></div>
          <div v-if="selectionRange" class="timeline__selection" :style="selectionStyle"></div>
        </div>
      </div>
    </div>

    <div class="timeline__scrollbar">
      <div class="timeline__label-placeholder"></div>
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

const LABEL_WIDTH = 180
const MIN_VIEW_DURATION = 0.1

const props = defineProps({
  trackers: { type: Array, default: () => [] },
  keyframes: { type: Object, required: true },
  markers: { type: Array, default: () => [] },
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
  'add-marker',
  'update-marker',
  'remove-marker',
  'add-keyframe',
  'remove-keyframe',
  'move-keyframe',
  'add-all-keyframes',
  'update-range',
  'update:snap',
  'select-keyframes'
])

const STORAGE_KEY_VIEW = 'timeline.view'
const STORAGE_KEY_MODE = 'timeline.view.mode'

const timelineRef = ref(null)
const tracksWrapperRef = ref(null)
const ticksWrapperRef = ref(null)
const scrollbarWrapperRef = ref(null)
const widthPx = ref(1)
const mode = ref('time')
const viewStart = ref(0)
const visibleDuration = ref(MIN_VIEW_DURATION)
const snapToFrame = ref(props.snap)
const selectionRange = ref(null)
const selectedKeyframes = ref(new Set())
const startFrameInput = ref(0)
const endFrameInput = ref(0)

let resizeObserver
let resizeRaf = null
let syncingScroll = false
let dragState = null

const totalDuration = computed(() => Math.max(props.endTime - props.startTime, MIN_VIEW_DURATION))
const viewEnd = computed(() => Math.min(viewStart.value + visibleDuration.value, props.endTime))
const pixelsPerSecond = computed(() => widthPx.value / visibleDuration.value)
const contentWidth = computed(() => Math.max(totalDuration.value * pixelsPerSecond.value, widthPx.value))

const timelineStyle = computed(() => {
  const style = {
    '--timeline-label-width': `${LABEL_WIDTH}px`
  }
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
  width: `${contentWidth.value}px`
}))

const tracksStyle = computed(() => ({
  width: `${LABEL_WIDTH + contentWidth.value}px`
}))

const gridStyle = computed(() => ({
  width: `${LABEL_WIDTH + contentWidth.value}px`
}))

const playheadStyle = computed(() => ({
  left: `${LABEL_WIDTH + timeToX(props.currentTime)}px`
}))

const selectionStyle = computed(() => {
  if (!selectionRange.value) return {}
  const start = Math.min(selectionRange.value.start, selectionRange.value.end)
  const end = Math.max(selectionRange.value.start, selectionRange.value.end)
  return {
    left: `${LABEL_WIDTH + timeToX(start)}px`,
    width: `${Math.max(1, timeToX(end) - timeToX(start))}px`
  }
})

const visibleMarkers = computed(() => {
  const margin = Math.max(0.05, visibleDuration.value * 0.05)
  return props.markers.filter(
    marker => marker.time >= viewStart.value - margin && marker.time <= viewEnd.value + margin
  )
})

const ticks = computed(() => {
  const approxTickPx = 80
  const approxStep = approxTickPx / pixelsPerSecond.value
  const fps = props.frameRate || 60
  const steps = [
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
    50,
    100,
    150,
    300,
    600,
    1200,
    3600
  ]
  let step = steps.find(s => s >= approxStep) || steps[steps.length - 1]
  if (mode.value === 'frames' && step < 1 / fps) step = 1 / fps
  const first = Math.floor(viewStart.value / step) * step
  const arr = []
  for (let t = first; t <= viewEnd.value + step; t += step) {
    arr.push({
      id: `tick-${t.toFixed(6)}`,
      x: timeToX(t),
      label: formatTick(t)
    })
  }
  return arr
})

const modeLabel = computed(() => (mode.value === 'time' ? 'Time' : 'Frames'))
const modeIcon = computed(() => (mode.value === 'time' ? 'mdi:timeline-clock-outline' : 'mdi:filmstrip'))

watch(
  () => props.snap,
  value => {
    snapToFrame.value = value
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

watch(
  [viewStart, visibleDuration],
  () => {
    clampView()
    saveViewState()
    nextTick(() => syncScrollPositions())
  },
  { flush: 'post' }
)

watch(mode, value => {
  try {
    localStorage.setItem(STORAGE_KEY_MODE, value)
  } catch {}
})

onMounted(() => {
  restoreViewState()
  try {
    const savedMode = localStorage.getItem(STORAGE_KEY_MODE)
    if (savedMode === 'time' || savedMode === 'frames') mode.value = savedMode
  } catch {}
  window.addEventListener('keydown', handleKeydown)
  nextTick(() => syncScrollPositions())
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  if (resizeRaf !== null) cancelAnimationFrame(resizeRaf)
  window.removeEventListener('keydown', handleKeydown)
})

function clampView() {
  const total = totalDuration.value
  visibleDuration.value = Math.min(Math.max(visibleDuration.value, MIN_VIEW_DURATION), total)
  const maxStart = props.endTime - visibleDuration.value
  viewStart.value = Math.min(Math.max(viewStart.value, props.startTime), maxStart)
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
  viewStart.value = props.startTime
  visibleDuration.value = Math.max(props.endTime - props.startTime, MIN_VIEW_DURATION)
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
  const offset = Math.max(0, (viewStart.value - props.startTime) * pixelsPerSecond.value)
  const assignScroll = el => {
    if (!el) return
    if (Math.abs(el.scrollLeft - offset) > 0.5) {
      el.scrollLeft = offset
    }
  }
  syncingScroll = true
  if (source !== 'tracks') {
    assignScroll(tracksWrapperRef.value)
  }
  if (ticksWrapperRef.value && source !== 'ticks') {
    assignScroll(ticksWrapperRef.value)
  }
  if (scrollbarWrapperRef.value && source !== 'scrollbar') {
    assignScroll(scrollbarWrapperRef.value)
  }
  requestAnimationFrame(() => {
    syncingScroll = false
  })
}

function handleTracksScroll(event) {
  if (syncingScroll) return
  const target = event.target
  const newStart = props.startTime + target.scrollLeft / pixelsPerSecond.value
  if (Math.abs(newStart - viewStart.value) < 1e-4) return
  viewStart.value = newStart
  clampView()
  syncScrollPositions('tracks')
}

function handleScrollbarScroll(event) {
  if (syncingScroll) return
  const target = event.target
  const newStart = props.startTime + target.scrollLeft / pixelsPerSecond.value
  if (Math.abs(newStart - viewStart.value) < 1e-4) return
  viewStart.value = newStart
  clampView()
  syncScrollPositions('scrollbar')
}

function handleHeaderWheel(event) {
  event.preventDefault()
  const factor = event.deltaY > 0 ? 1.1 : 0.9
  const rect = ticksWrapperRef.value?.getBoundingClientRect()
  const scrollLeft = tracksWrapperRef.value?.scrollLeft || 0
  const x = rect ? Math.max(0, event.clientX - rect.left) : widthPx.value / 2
  const pivot = clampTime(props.startTime + (scrollLeft + x) / pixelsPerSecond.value)
  zoomAt(pivot, factor)
}

function handleTrackWheel(event) {
  if (event.ctrlKey || event.metaKey) {
    const rect = tracksWrapperRef.value?.getBoundingClientRect()
    const scrollLeft = tracksWrapperRef.value?.scrollLeft || 0
    const x = rect ? Math.max(0, event.clientX - rect.left - LABEL_WIDTH) : widthPx.value / 2
    const pivot = clampTime(props.startTime + (scrollLeft + x) / pixelsPerSecond.value)
    const factor = event.deltaY > 0 ? 1.1 : 0.9
    zoomAt(pivot, factor)
    event.preventDefault()
    return
  }
  if (!tracksWrapperRef.value) return
  const horizontalIntent = event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)
  if (horizontalIntent) {
    const delta = Math.abs(event.deltaX) > 0 ? event.deltaX : event.deltaY
    tracksWrapperRef.value.scrollLeft += delta
    event.preventDefault()
  }
}

function zoomAt(pivot, factor) {
  const total = totalDuration.value
  const nextDuration = Math.min(Math.max(visibleDuration.value * factor, MIN_VIEW_DURATION), total)
  const ratio = (pivot - viewStart.value) / visibleDuration.value || 0
  visibleDuration.value = nextDuration
  viewStart.value = pivot - nextDuration * ratio
  clampView()
  syncScrollPositions()
}

function togglePlay() {
  if (props.isPlaying) emit('pause')
  else emit('play')
}

function stepFrames(delta) {
  emit('step-frames', delta)
}

function fitRange() {
  visibleDuration.value = totalDuration.value
  viewStart.value = props.startTime
  clampView()
  syncScrollPositions()
}

function zoomToSelection() {
  if (!selectionRange.value) return
  const start = Math.min(selectionRange.value.start, selectionRange.value.end)
  const end = Math.max(selectionRange.value.start, selectionRange.value.end)
  if (end <= start) return
  viewStart.value = start
  visibleDuration.value = Math.max(end - start, MIN_VIEW_DURATION)
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
  return (time - props.startTime) * pixelsPerSecond.value
}

function clampTime(time) {
  return Math.min(Math.max(time, props.startTime), props.endTime)
}

function snapIfNeeded(time) {
  if (!snapToFrame.value) return time
  const fps = props.frameRate || 60
  const frame = Math.round(time * fps)
  return frame / fps
}

function visibleKeyframes(trackerKey) {
  const items = props.keyframes?.[trackerKey] || []
  const margin = Math.max(0.05, visibleDuration.value * 0.1)
  return items.filter(
    frame => frame.time >= viewStart.value - margin && frame.time <= viewEnd.value + margin
  )
}

function formatTick(time) {
  if (mode.value === 'frames') {
    const relative = time - props.startTime
    return Math.round(relative * props.frameRate)
  }
  const totalSeconds = Math.max(time - props.startTime, 0)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const frames = Math.round((totalSeconds - Math.floor(totalSeconds)) * props.frameRate)
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`
}

function getPointerInfo(event) {
  if (!tracksWrapperRef.value) {
    return { time: props.startTime, x: 0 }
  }
  const rect = tracksWrapperRef.value.getBoundingClientRect()
  const scrollLeft = tracksWrapperRef.value.scrollLeft
  let x = event.clientX - rect.left - LABEL_WIDTH
  x = Math.max(0, x)
  const time = clampTime(props.startTime + (scrollLeft + x) / pixelsPerSecond.value)
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
    viewStart.value = clampTime(viewStart.value - deltaSeconds)
    clampView()
    syncScrollPositions()
  } else if (dragState.type === 'marker') {
    const { time } = getPointerInfo(event)
    emit('update-marker', { id: dragState.marker.id, time: snapIfNeeded(time) })
  } else if (dragState.type === 'keyframe') {
    const { time } = getPointerInfo(event)
    const targetTime = clampTime(time - dragState.offset)
    const snapped = snapIfNeeded(targetTime)
    if (Math.abs(snapped - dragState.lastTime) > 1e-5) {
      dragState.lastTime = snapped
      emit('move-keyframe', {
        trackerKey: dragState.trackerKey,
        keyframeId: dragState.frameId,
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
    emit('select-keyframes', [])
    return
  }
  const collected = new Set()
  for (const tracker of props.trackers) {
    const frames = props.keyframes?.[tracker.key] || []
    frames.forEach(frame => {
      if (frame.time >= start && frame.time <= end) {
        collected.add(`${tracker.key}:${frame.id}`)
      }
    })
  }
  selectedKeyframes.value = collected
  emit('select-keyframes', Array.from(collected))
}

function clearSelection() {
  if (!selectionRange.value && selectedKeyframes.value.size === 0) return
  selectionRange.value = null
  selectedKeyframes.value = new Set()
  emit('select-keyframes', [])
}

function addMarkerFromEvent(event) {
  const { time } = getPointerInfo(event)
  emit('add-marker', snapIfNeeded(time))
}

function startMarkerDrag(event, marker) {
  dragState = { type: 'marker', marker }
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
  event.preventDefault()
}

function startKeyframeDrag(event, trackerKey, frame) {
  const { time } = getPointerInfo(event)
  const offset = time - frame.time
  const id = `${trackerKey}:${frame.id}`
  if (!event.shiftKey && !selectedKeyframes.value.has(id)) {
    selectedKeyframes.value = new Set([id])
    emit('select-keyframes', [id])
  }
  dragState = {
    type: 'keyframe',
    trackerKey,
    frameId: frame.id,
    offset,
    lastTime: frame.time
  }
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
  event.preventDefault()
}

function handleKeydown(event) {
  if (event.target && ['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return
  switch (event.key) {
    case ' ': {
      event.preventDefault()
      togglePlay()
      break
    }
    case 'Home': {
      event.preventDefault()
      fitRange()
      break
    }
    case 'End': {
      event.preventDefault()
      emit('jump-end')
      break
    }
    case 'ArrowRight': {
      event.preventDefault()
      stepFrames(event.shiftKey ? 10 : 1)
      break
    }
    case 'ArrowLeft': {
      event.preventDefault()
      stepFrames(event.shiftKey ? -10 : -1)
      break
    }
    case 'Delete':
    case 'Backspace': {
      if (selectedKeyframes.value.size === 0) return
      selectedKeyframes.value.forEach(id => {
        const [trackerKey, frameId] = id.split(':')
        emit('remove-keyframe', { trackerKey, keyframeId: Number(frameId) })
      })
      selectedKeyframes.value = new Set()
      break
    }
    case 'm':
    case 'M': {
      emit('add-marker', snapIfNeeded(props.currentTime))
      break
    }
    default:
      break
  }
}

function keyColor(key) {
  const palette = ['#70A2FF', '#5AD8A6', '#FFD666', '#FF7A45', '#9A7AFF']
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  }
  return palette[hash % palette.length]
}

function keyTitle(frame) {
  return `t=${frame.time.toFixed(3)}s`
}
</script>

<style scoped>
.timeline {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  background: var(--surface-strong, rgba(20, 24, 33, 0.98));
  color: var(--text-strong, #ffffff);
  border-top: 1px solid var(--border-soft, rgba(255, 255, 255, 0.08));
}

.timeline__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 0.75rem;
  gap: 0.5rem;
  border-bottom: 1px solid var(--border-soft, rgba(255, 255, 255, 0.1));
  background: var(--surface, rgba(24, 28, 38, 0.95));
}

.toolbar__group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.toolbar__group--left {
  flex-wrap: wrap;
}

.toolbar__group--center {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

.toolbar__group--right {
  gap: 0.5rem;
}

.toolbar__button {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: inherit;
  border-radius: 6px;
  padding: 0.3rem 0.55rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.82rem;
  cursor: pointer;
  gap: 0.15rem;
  min-width: 44px;
  transition: background 120ms ease, border 120ms ease;
}

.toolbar__button:hover,
.toolbar__button:focus-visible,
.toolbar__button[aria-pressed='true'] {
  outline: none;
  background: color-mix(in srgb, var(--accent, #2d8cff) 35%, rgba(255, 255, 255, 0.08));
  border-color: color-mix(in srgb, var(--accent, #2d8cff) 50%, rgba(255, 255, 255, 0.08));
}

.toolbar__button:disabled {
  opacity: 0.5;
  pointer-events: none;
}

.toolbar__field {
  display: flex;
  flex-direction: column;
  font-size: 0.7rem;
  color: var(--text-muted, rgba(255, 255, 255, 0.65));
}

.toolbar__field input {
  margin-top: 0.15rem;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  padding: 0.2rem 0.4rem;
  color: inherit;
  width: 90px;
}

.timeline__header {
  display: grid;
  grid-template-columns: var(--timeline-label-width) 1fr;
  position: relative;
  height: 48px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
}

.timeline__label-placeholder {
  position: sticky;
  left: 0;
  z-index: 2;
  background: rgba(20, 24, 33, 0.95);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.timeline__ticks-wrapper {
  position: relative;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}

.timeline__ticks {
  position: relative;
  height: 100%;
}

.timeline__tick {
  position: absolute;
  bottom: 0;
  width: 1px;
  height: 100%;
  background: rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
}

.timeline__tick span {
  transform: translateY(100%);
  font-size: 0.68rem;
  margin-left: 4px;
  color: rgba(255, 255, 255, 0.85);
  pointer-events: none;
}

.timeline__body {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.timeline__scroll-area {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

.timeline__tracks {
  position: relative;
  min-height: 100%;
}

.timeline__grid {
  position: relative;
  display: grid;
  grid-template-columns: var(--timeline-label-width) 1fr;
  grid-auto-rows: minmax(48px, auto);
}

.timeline__channel {
  display: contents;
}

.timeline__channel-header {
  position: sticky;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.6rem;
  font-size: 0.85rem;
  background: rgba(0, 0, 0, 0.5);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  z-index: 2;
}

.timeline__channel-body {
  position: relative;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.timeline__channel--markers .timeline__channel-header {
  background: rgba(34, 36, 48, 0.85);
  font-weight: 600;
}

.channel__add {
  background: transparent;
  border: none;
  color: var(--accent, #2d8cff);
  cursor: pointer;
  font-size: 1rem;
}

.timeline__marker {
  position: absolute;
  top: 8px;
  width: 12px;
  height: 24px;
  transform: translateX(-50%);
  background: var(--accent, #2d8cff);
  border-radius: 3px 3px 0 0;
  cursor: pointer;
  box-shadow: 0 0 8px rgba(45, 140, 255, 0.6);
}

.timeline__marker span {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.7rem;
  background: rgba(0, 0, 0, 0.6);
  padding: 0 6px;
  border-radius: 4px;
  white-space: nowrap;
}

.timeline__keyframe {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%) rotate(45deg);
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.9);
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.timeline__keyframe:hover,
.timeline__keyframe.is-selected {
  transform: translate(-50%, -50%) rotate(45deg) scale(1.15);
  box-shadow: 0 0 8px var(--accent, #2d8cff);
}

.timeline__playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--accent, #2d8cff);
  pointer-events: none;
  box-shadow: 0 0 12px rgba(45, 140, 255, 0.8);
}

.timeline__selection {
  position: absolute;
  top: 0;
  bottom: 0;
  background: color-mix(in srgb, var(--accent, #2d8cff) 25%, transparent);
  border: 1px dashed color-mix(in srgb, var(--accent, #2d8cff) 40%, transparent);
  pointer-events: none;
}

.timeline__scrollbar {
  display: grid;
  grid-template-columns: var(--timeline-label-width) 1fr;
  position: relative;
  height: 10px;
  background: rgba(255, 255, 255, 0.1);
}

.timeline__scrollbar-track {
  position: relative;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}

.timeline__scrollbar-spacer {
  height: 100%;
}
</style>
