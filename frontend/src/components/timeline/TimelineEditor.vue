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
        <button type="button" class="toolbar__button" @click="fitRange" :title="tooltip('タイムラインの全範囲を表示します')">
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
          @click="emit('add-all-keyframes')"
          :title="tooltip('現在のフレームに全トラッカーのキーを追加します')"
        >
          <Icon icon="mdi:animation" />
          <span>全キー</span>
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
        <button type="button" class="toolbar__button" @click="emit('play')" :title="tooltip('再生します')">
          <Icon icon="mdi:play" />
          <span>Play</span>
        </button>
        <button type="button" class="toolbar__button" @click="emit('pause')" :title="tooltip('一時停止します')">
          <Icon icon="mdi:pause" />
          <span>Pause</span>
        </button>
        <button type="button" class="toolbar__button" @click="emit('stop')" :title="tooltip('停止して開始位置へ戻ります')">
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
          <div
            v-if="(props.trackers?.length || 0) === 0"
            class="timeline__empty-state"
          >
            <Icon icon="mdi:account-location-outline" class="timeline__empty-icon" />
            <div>
              <p>バーチャルトラッカーを有効にするとキーを編集できます。</p>
              <p class="timeline__empty-sub">設定サイドバーの「バーチャルトラッカー」をONにしてください。</p>
            </div>
          </div>
          <div
            v-else-if="!hasTimelineContent"
            class="timeline__empty-state"
          >
            <Icon icon="mdi:timeline-clock-outline" class="timeline__empty-icon" />
            <div>
              <p>まだキーがありません。</p>
              <p class="timeline__empty-sub">タイムライン上をダブルクリックするか「全キー」ボタンでポーズを保存できます。</p>
            </div>
          </div>
          <div class="timeline__memory" :style="memoryStyle"></div>
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
                  @dblclick.stop.prevent="editMarker(marker)"
                  :title="tooltip(marker.label || markerTitle(marker))"
                >
                  <span>{{ marker.label || markerTitle(marker) }}</span>
                </div>
                <div v-if="visibleMarkers.length === 0" class="timeline__markers-empty">
                  <span>ダブルクリックでマーカーを追加</span>
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
                  :title="tooltip('現在のフレームにキーを追加します')"
                >
                  ＋
                </button>
              </div>
              <div class="timeline__channel-body" :data-tracker="tracker.key">
                <template v-for="frame in visibleKeyframes(tracker.key)" :key="frame.id">
                  <div
                    class="timeline__keyframe"
                    :class="{ 'is-selected': selectedKeyframes.has(`${tracker.key}:${frame.id}`) }"
                    :style="{ left: `${timeToX(frame.time)}px`, background: keyColor(tracker.key) }"
                    @pointerdown.stop.prevent="startKeyframeDrag($event, tracker.key, frame)"
                    @dblclick.stop.prevent="openInspector($event, tracker.key, frame)"
                    :title="tooltip(keyTitle(frame))"
                  ></div>
                </template>
              </div>
            </div>
          </div>
          <div class="timeline__playhead" :style="playheadStyle"></div>
          <div v-if="selectionRange" class="timeline__selection" :style="selectionStyle"></div>
        </div>
        <transition name="inspector-pop">
          <div
            v-if="inspectorVisible"
            ref="inspectorRef"
            class="timeline__inspector-popover"
            :class="`timeline__inspector-popover--${inspectorPosition.placement}`"
            :style="inspectorStyle"
            role="dialog"
            aria-label="キーインスペクター"
            @pointerdown.stop
          >
            <div class="inspector__header">
              <div class="inspector__title">
                <strong>{{ inspectorTrackerLabel }}</strong>
                <span v-if="inspectorState.keyframeId">#{{ inspectorState.keyframeId }}</span>
              </div>
              <button type="button" class="inspector__close" @click="closeInspector" aria-label="インスペクターを閉じる">
                <Icon icon="mdi:close" />
              </button>
            </div>
            <div class="inspector__grid">
              <label class="inspector__field">
                <span>Frame</span>
                <input
                  type="number"
                  v-model.number="inspectorState.frame"
                  @change="commitInspectorFrame"
                  @keydown.enter.prevent="commitInspectorFrame"
                  @blur="commitInspectorFrame"
                />
              </label>
              <label class="inspector__field">
                <span>秒</span>
                <input
                  type="number"
                  step="0.001"
                  v-model.number="inspectorState.time"
                  @change="commitInspectorTime"
                  @keydown.enter.prevent="commitInspectorTime"
                  @blur="commitInspectorTime"
                />
              </label>
              <label class="inspector__field">
                <span>X</span>
                <input
                  type="number"
                  step="0.001"
                  v-model.number="inspectorState.x"
                  @change="commitInspectorValues"
                  @keydown.enter.prevent="commitInspectorValues"
                  @blur="commitInspectorValues"
                />
              </label>
              <label class="inspector__field">
                <span>Y</span>
                <input
                  type="number"
                  step="0.001"
                  v-model.number="inspectorState.y"
                  @change="commitInspectorValues"
                  @keydown.enter.prevent="commitInspectorValues"
                  @blur="commitInspectorValues"
                />
              </label>
              <label class="inspector__field">
                <span>Z</span>
                <input
                  type="number"
                  step="0.001"
                  v-model.number="inspectorState.z"
                  @change="commitInspectorValues"
                  @keydown.enter.prevent="commitInspectorValues"
                  @blur="commitInspectorValues"
                />
              </label>
              <button type="button" class="inspector__delete" @click="deleteInspectorKeyframe">
                <Icon icon="mdi:delete" />
                <span>削除</span>
              </button>
            </div>
          </div>
        </transition>
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
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useCaptions } from '../../composables/useCaptions.js'

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
  'select-keyframes',
  'update-keyframe',
  'request-import',
  'export-timeline',
  'clear-timeline'
])

const { tooltip } = useCaptions()

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

const inspectorVisible = ref(false)
const inspectorState = reactive({
  trackerKey: '',
  keyframeId: null,
  time: 0,
  frame: 0,
  x: 0,
  y: 0,
  z: 0
})

const inspectorRef = ref(null)
const inspectorAnchorTime = ref(0)
const inspectorPosition = reactive({
  left: 0,
  top: 0,
  placement: 'above'
})

const trackerLabelMap = computed(() => {
  const map = {}
  for (const tracker of props.trackers || []) {
    if (!tracker?.key) continue
    map[tracker.key] = tracker.label || tracker.key
  }
  return map
})

const inspectorFrame = computed(() => {
  if (!inspectorVisible.value || !inspectorState.trackerKey || inspectorState.keyframeId == null) {
    return null
  }
  const frames = props.keyframes?.[inspectorState.trackerKey] || []
  return frames.find(item => item.id === inspectorState.keyframeId) || null
})

const inspectorTrackerLabel = computed(() => {
  if (!inspectorVisible.value) return ''
  return trackerLabelMap.value[inspectorState.trackerKey] || inspectorState.trackerKey
})

const inspectorStyle = computed(() => ({
  left: `${inspectorPosition.left}px`,
  top: `${inspectorPosition.top}px`
}))

const hasTimelineContent = computed(() => {
  const tracks = props.keyframes || {}
  const hasFrames = Object.values(tracks).some(list => Array.isArray(list) && list.length > 0)
  const hasMarkers = Array.isArray(props.markers) && props.markers.length > 0
  return hasFrames || hasMarkers
})

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

const memoryStyle = computed(() => {
  const clamped = clampTime(props.currentTime)
  const width = Math.max(0, timeToX(clamped))
  return {
    left: `${LABEL_WIDTH}px`,
    width: `${width}px`
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

watch(inspectorFrame, frame => {
  if (!inspectorVisible.value) return
  if (!frame) {
    closeInspector()
    return
  }
  setInspectorFromFrame(inspectorState.trackerKey, frame)
  scheduleInspectorLayout()
})

watch(
  () => inspectorState.time,
  value => {
    const numeric = Number(value)
    if (Number.isFinite(numeric)) {
      inspectorAnchorTime.value = clampTime(numeric)
    }
    scheduleInspectorLayout()
  }
)

watch(selectedKeyframes, set => {
  if (!inspectorVisible.value) return
  if (!set || typeof set.has !== 'function') return
  const currentId = `${inspectorState.trackerKey}:${inspectorState.keyframeId}`
  if (!set.has(currentId)) closeInspector()
})

watch(
  () => inspectorVisible.value,
  value => {
    if (value) scheduleInspectorLayout()
  }
)

watch(() => visibleDuration.value, scheduleInspectorLayout)
watch(() => viewStart.value, scheduleInspectorLayout)
watch(() => widthPx.value, scheduleInspectorLayout)
watch(() => props.startTime, scheduleInspectorLayout)
watch(() => props.endTime, scheduleInspectorLayout)

onMounted(() => {
  restoreViewState()
  try {
    const savedMode = localStorage.getItem(STORAGE_KEY_MODE)
    if (savedMode === 'time' || savedMode === 'frames') mode.value = savedMode
  } catch {}
  nextTick(() => syncScrollPositions())
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  if (resizeRaf !== null) cancelAnimationFrame(resizeRaf)
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
  scheduleInspectorLayout()
  requestAnimationFrame(() => {
    syncingScroll = false
  })
}

function handleTracksScroll(event) {
  scheduleInspectorLayout()
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
  if (inspectorVisible.value) {
    const keyHit = event.target?.closest?.('.timeline__keyframe')
    const markerHit = event.target?.closest?.('.timeline__marker')
    if (!keyHit && !markerHit) closeInspector()
  }
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
  if (inspectorVisible.value) closeInspector()
}

function closeInspector() {
  inspectorVisible.value = false
  inspectorState.trackerKey = ''
  inspectorState.keyframeId = null
}

function setInspectorFromFrame(trackerKey, frame) {
  inspectorState.trackerKey = trackerKey
  inspectorState.keyframeId = frame.id
  const time = clampTime(Number(frame.time) || props.startTime)
  inspectorState.time = time
  inspectorState.frame = Math.round(time * (props.frameRate || 60))
  const value = Array.isArray(frame.value) ? frame.value : [0, 0, 0]
  inspectorState.x = Number(value[0]) || 0
  inspectorState.y = Number(value[1]) || 0
  inspectorState.z = Number(value[2]) || 0
  inspectorAnchorTime.value = time
}

function openInspector(event, trackerKey, frame) {
  if (!frame) return
  const id = `${trackerKey}:${frame.id}`
  if (!selectedKeyframes.value.has(id)) {
    selectedKeyframes.value = new Set([id])
    emit('select-keyframes', [id])
  }
  setInspectorFromFrame(trackerKey, frame)
  inspectorVisible.value = true
  const anchorEl = event?.currentTarget || null
  nextTick(() => {
    updateInspectorPosition(anchorEl)
    const firstField = inspectorRef.value?.querySelector('input')
    if (firstField && typeof firstField.focus === 'function') {
      try {
        firstField.focus({ preventScroll: true })
      } catch {
        firstField.focus()
      }
    }
  })
}

function scheduleInspectorLayout() {
  if (!inspectorVisible.value) return
  nextTick(() => updateInspectorPosition())
}

function updateInspectorPosition(anchorSource) {
  if (!inspectorVisible.value) return
  const scrollArea = tracksWrapperRef.value
  if (!scrollArea) return

  const inspectorEl = inspectorRef.value
  const viewportWidth = scrollArea.clientWidth || 0
  const viewportHeight = scrollArea.clientHeight || 0
  const scrollLeft = scrollArea.scrollLeft || 0
  const scrollTop = scrollArea.scrollTop || 0
  const inspectorWidth = inspectorEl?.offsetWidth || 280
  const inspectorHeight = inspectorEl?.offsetHeight || 200

  const anchorTime = inspectorAnchorTime.value
  const anchorX = LABEL_WIDTH + (anchorTime - props.startTime) * pixelsPerSecond.value
  let left = anchorX - scrollLeft - inspectorWidth / 2
  const minLeft = 12
  const maxLeft = Math.max(minLeft, viewportWidth - inspectorWidth - 12)
  if (left < minLeft) left = minLeft
  if (left > maxLeft) left = maxLeft

  const scrollRect = scrollArea.getBoundingClientRect()
  let targetRect = null
  if (anchorSource) {
    if (typeof anchorSource.getBoundingClientRect === 'function') {
      targetRect = anchorSource.getBoundingClientRect()
    } else if (anchorSource?.currentTarget && typeof anchorSource.currentTarget.getBoundingClientRect === 'function') {
      targetRect = anchorSource.currentTarget.getBoundingClientRect()
    }
  }
  if (!targetRect && typeof window !== 'undefined') {
    const trackerKey = inspectorState.trackerKey || ''
    if (trackerKey) {
      const escape = window.CSS?.escape || (value => String(value).replace(/(["\\])/g, '\\$1'))
      const selector = `.timeline__channel-body[data-tracker="${escape(trackerKey)}"]`
      const rowEl = scrollArea.querySelector(selector)
      if (rowEl) targetRect = rowEl.getBoundingClientRect()
    }
  }

  let rowCenter = viewportHeight / 2 + scrollTop
  if (targetRect) {
    rowCenter = targetRect.top - scrollRect.top + scrollTop + targetRect.height / 2
  }

  let top = rowCenter - scrollTop - inspectorHeight - 16
  let placement = 'above'
  if (top < 12) {
    top = rowCenter - scrollTop + 16
    placement = 'below'
  }
  const maxTop = Math.max(12, viewportHeight - inspectorHeight - 12)
  if (top > maxTop) top = maxTop
  if (top < 12) top = 12

  inspectorPosition.left = left
  inspectorPosition.top = top
  inspectorPosition.placement = placement
}

function commitInspectorFrame() {
  if (!inspectorVisible.value) return
  const fps = props.frameRate || 60
  const numeric = Number(inspectorState.frame)
  const clampedFrame = Math.max(0, Math.round(Number.isFinite(numeric) ? numeric : 0))
  inspectorState.frame = clampedFrame
  const time = clampTime(clampedFrame / fps)
  inspectorState.time = time
  emit('update-keyframe', {
    trackerKey: inspectorState.trackerKey,
    keyframeId: inspectorState.keyframeId,
    time
  })
}

function commitInspectorTime() {
  if (!inspectorVisible.value) return
  const numeric = Number(inspectorState.time)
  const time = clampTime(Number.isFinite(numeric) ? numeric : props.startTime)
  inspectorState.time = time
  inspectorState.frame = Math.round(time * (props.frameRate || 60))
  emit('update-keyframe', {
    trackerKey: inspectorState.trackerKey,
    keyframeId: inspectorState.keyframeId,
    time
  })
}

function commitInspectorValues() {
  if (!inspectorVisible.value) return
  const x = Number.isFinite(inspectorState.x) ? inspectorState.x : 0
  const y = Number.isFinite(inspectorState.y) ? inspectorState.y : 0
  const z = Number.isFinite(inspectorState.z) ? inspectorState.z : 0
  inspectorState.x = x
  inspectorState.y = y
  inspectorState.z = z
  emit('update-keyframe', {
    trackerKey: inspectorState.trackerKey,
    keyframeId: inspectorState.keyframeId,
    value: [x, y, z]
  })
}

function commitInspector(event) {
  if (event?.preventDefault) event.preventDefault()
  if (!inspectorVisible.value) return
  const trackerKey = inspectorState.trackerKey
  const keyframeId = inspectorState.keyframeId
  if (!trackerKey || keyframeId == null) return

  const fps = props.frameRate || 60
  const frameNumeric = Number(inspectorState.frame)
  const timeFromFrame = Number.isFinite(frameNumeric) ? clampTime(Math.max(0, frameNumeric) / fps) : null
  const timeNumeric = Number(inspectorState.time)
  let finalTime = Number.isFinite(timeNumeric) ? clampTime(timeNumeric) : null
  if (finalTime == null && timeFromFrame != null) {
    finalTime = timeFromFrame
  } else if (finalTime != null && timeFromFrame != null && Math.abs(timeFromFrame - finalTime) > 1e-4) {
    finalTime = timeFromFrame
  }
  if (finalTime == null) finalTime = clampTime(inspectorAnchorTime.value || props.startTime)

  inspectorState.time = finalTime
  inspectorState.frame = Math.round(finalTime * fps)
  inspectorAnchorTime.value = finalTime

  const x = Number.isFinite(inspectorState.x) ? inspectorState.x : 0
  const y = Number.isFinite(inspectorState.y) ? inspectorState.y : 0
  const z = Number.isFinite(inspectorState.z) ? inspectorState.z : 0
  inspectorState.x = x
  inspectorState.y = y
  inspectorState.z = z

  emit('update-keyframe', {
    trackerKey,
    keyframeId,
    time: finalTime,
    value: [x, y, z]
  })
}

function deleteInspectorKeyframe() {
  if (!inspectorVisible.value) return
  emit('remove-keyframe', {
    trackerKey: inspectorState.trackerKey,
    keyframeId: inspectorState.keyframeId
  })
  clearSelection()
}

function addMarkerFromEvent(event) {
  const { time } = getPointerInfo(event)
  emit('add-marker', snapIfNeeded(time))
}

function editMarker(marker) {
  const current = marker?.label ?? ''
  const result = window.prompt('マーカー名を入力', current)
  if (result === null) return
  const next = result.trim()
  emit('update-marker', { id: marker.id, label: next === '' ? current : next })
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

function keyColor(key) {
  const palette = ['#70A2FF', '#5AD8A6', '#FFD666', '#FF7A45', '#9A7AFF']
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  }
  return palette[hash % palette.length]
}

function keyTitle(frame) {
  const value = Array.isArray(frame.value) ? frame.value : []
  const [x, y, z] = [
    Number(value[0]) || 0,
    Number(value[1]) || 0,
    Number(value[2]) || 0
  ]
  return `t=${frame.time.toFixed(3)}s\n(${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)})`
}

function markerTitle(marker) {
  if (!marker) return ''
  const time = Number(marker.time) || 0
  const fps = props.frameRate || 60
  const frame = Math.round((time - props.startTime) * fps)
  return `t=${time.toFixed(3)}s • frame ${frame}`
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

.toolbar__button--secondary {
  background: rgba(255, 255, 255, 0.03);
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

.timeline__empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: rgba(255, 255, 255, 0.78);
  background: linear-gradient(180deg, rgba(18, 20, 28, 0.9), rgba(18, 20, 28, 0.95));
  text-align: left;
  padding: 1.5rem;
  pointer-events: none;
}

.timeline__empty-icon {
  font-size: 2rem;
  opacity: 0.75;
}

.timeline__empty-sub {
  font-size: 0.82rem;
  opacity: 0.78;
  margin-top: 0.2rem;
}

.timeline__grid {
  position: relative;
  display: grid;
  grid-template-columns: var(--timeline-label-width) 1fr;
  grid-auto-rows: minmax(48px, auto);
  z-index: 1;
}

.timeline__memory {
  position: absolute;
  top: 0;
  bottom: 0;
  background: linear-gradient(90deg, color-mix(in srgb, var(--accent, #2d8cff) 14%, transparent), transparent 85%);
  opacity: 0.35;
  pointer-events: none;
  z-index: 0;
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

.timeline__markers-empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
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

.timeline__inspector-popover {
  position: absolute;
  z-index: 8;
  min-width: 260px;
  max-width: 320px;
  background: rgba(12, 16, 24, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 0.85rem 1rem 1rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(14px);
  pointer-events: auto;
}

.timeline__inspector-popover::before {
  content: '';
  position: absolute;
  width: 14px;
  height: 14px;
  background: inherit;
  border: 1px solid rgba(255, 255, 255, 0.12);
  transform: rotate(45deg);
  left: 50%;
  margin-left: -7px;
  box-shadow: inherit;
}

.timeline__inspector-popover--above::before {
  bottom: -7px;
}

.timeline__inspector-popover--below::before {
  top: -7px;
}

.inspector__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.88);
  margin-bottom: 0.6rem;
}

.inspector__title {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.inspector__title span {
  font-size: 0.74rem;
  opacity: 0.65;
}

.inspector__close {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.inspector__close:hover,
.inspector__close:focus-visible {
  background: rgba(255, 255, 255, 0.12);
}

.inspector__grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr)) auto;
  gap: 0.65rem;
  align-items: end;
}

.inspector__field {
  display: flex;
  flex-direction: column;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.78);
}

.inspector__field input {
  margin-top: 0.2rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 0.34rem 0.5rem;
  color: inherit;
}

.inspector__field input:focus-visible {
  outline: none;
  border-color: rgba(45, 140, 255, 0.55);
  box-shadow: 0 0 0 1px rgba(45, 140, 255, 0.35);
}

.inspector__delete {
  align-self: stretch;
  background: rgba(255, 90, 90, 0.18);
  border: 1px solid rgba(255, 90, 90, 0.3);
  color: rgba(255, 210, 210, 0.94);
  border-radius: 8px;
  padding: 0.48rem 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
  transition: background 0.15s ease, border 0.15s ease;
}

.inspector__delete:hover,
.inspector__delete:focus-visible {
  background: rgba(255, 90, 90, 0.3);
  border-color: rgba(255, 90, 90, 0.45);
}

.inspector-pop-enter-active,
.inspector-pop-leave-active {
  transition: opacity 0.15s ease, transform 0.18s ease;
}

.inspector-pop-enter-from,
.inspector-pop-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@media (max-width: 1280px) {
  .inspector__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
