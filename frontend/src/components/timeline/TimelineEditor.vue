<template>
  <section class="timeline" :style="timelineStyle" ref="timelineRef">
    <div class="timeline__primary">
      <header class="timeline__toolbar">
        <div class="toolbar__group toolbar__group--left">
          <button
            type="button"
            class="toolbar__button"
            :aria-pressed="props.loop"
            @click="emit('toggle-loop')"
            :title="tooltip(timelineEditorTexts.loopTooltip || '')"
          >
            <Icon icon="mdi:repeat" />
            <span>{{ timelineEditorTexts.loop }}</span>
          </button>
          <button
            type="button"
            class="toolbar__button"
            @click="fitRange"
            :title="tooltip(timelineEditorTexts.fitTooltip || '')"
          >
            <Icon icon="mdi:magnify-scan" />
            <span>{{ timelineEditorTexts.fit }}</span>
          </button>
          <button
            type="button"
            class="toolbar__button"
            @click="emit('add-keyframe', { time: props.currentTime })"
            :title="tooltip(timelineEditorTexts.addKeyTooltip || '')"
          >
            <Icon icon="mdi:animation" />
            <span>{{ timelineEditorTexts.addKey }}</span>
          </button>
          <button
            type="button"
            class="toolbar__button toolbar__button--secondary"
            :disabled="!hasSelection"
            @click="emit('copy-keyframes')"
            :title="tooltip(timelineEditorTexts.copyTooltip || '')"
          >
            <Icon icon="mdi:content-copy" />
            <span>{{ timelineEditorTexts.copy }}</span>
          </button>
          <button
            type="button"
            class="toolbar__button toolbar__button--secondary"
            :disabled="!canPaste"
            @click="emit('paste-keyframes')"
            :title="tooltip(timelineEditorTexts.pasteTooltip || '')"
          >
            <Icon icon="mdi:content-paste" />
            <span>{{ timelineEditorTexts.paste }}</span>
          </button>
          <button
            type="button"
            class="toolbar__button toolbar__button--alert"
            @click="removeSelectedKeyframes"
            :disabled="!hasSelection"
            :title="tooltip(timelineEditorTexts.deleteTooltip || '')"
          >
            <Icon icon="mdi:delete-forever" />
            <span>{{ timelineEditorTexts.delete }}</span>
          </button>
        </div>

        <div class="toolbar__group toolbar__group--center">
          <button
            type="button"
            class="toolbar__button"
            @click="emit('jump-start')"
            :title="tooltip(timelineEditorTexts.jumpStartTooltip || '')"
          >
            <Icon icon="mdi:skip-backward" />
            <span>{{ timelineEditorTexts.jumpStartLabel }}</span>
          </button>
          <button
            type="button"
            class="toolbar__button"
            @click="togglePlayPause"
            :title="tooltip((props.isPlaying ? timelineEditorTexts.pauseTooltip : timelineEditorTexts.playTooltip) || '')"
          >
            <Icon :icon="props.isPlaying ? 'mdi:pause' : 'mdi:play'" />
            <span>{{ props.isPlaying ? timelineEditorTexts.pause : timelineEditorTexts.play }}</span>
          </button>
          <button
            type="button"
            class="toolbar__button"
            @click="emit('jump-end')"
            :title="tooltip(timelineEditorTexts.jumpEndTooltip || '')"
          >
            <Icon icon="mdi:skip-forward" />
            <span>{{ timelineEditorTexts.jumpEndLabel }}</span>
          </button>
        </div>

        <div class="toolbar__group toolbar__group--right">
          <label class="toolbar__field">
            <span>{{ timelineEditorTexts.rangeStartLabel }}</span>
            <input
              type="number"
              v-model.number="startFrameInput"
              @change="commitRange"
              @keydown.enter.prevent="commitRange"
            />
          </label>
          <label class="toolbar__field">
            <span>{{ timelineEditorTexts.rangeEndLabel }}</span>
            <input
              type="number"
              v-model.number="endFrameInput"
              @change="commitRange"
              @keydown.enter.prevent="commitRange"
            />
          </label>
          <button
            type="button"
            class="toolbar__button toolbar__button--alert"
            :disabled="!hasTimelineContent"
            @click="emit('clear-timeline')"
            :title="tooltip(timelineEditorTexts.clearTooltip || '')"
          >
            <Icon icon="mdi:trash-can-outline" />
            <span>{{ timelineEditorTexts.clear }}</span>
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
          <div
            class="timeline__ticks"
            :style="ticksStyle"
            @pointerdown="handleHeaderPointerDown"
          >
            <div
              v-for="tick in ticks"
              :key="tick.id"
              class="timeline__tick"
              :class="{ 'timeline__tick--major': tick.major }"
              :style="{ left: `${tick.x}px` }"
              :title="tick.frameLabel"
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

            <!-- イージングカーブの表示（修正版） -->
            <div class="timeline__curves" aria-hidden="true">
              <svg
                class="timeline__curves-canvas"
                :viewBox="`0 0 ${Math.max(contentWidth, 1)} ${CURVE_VIEWBOX_HEIGHT}`"
                preserveAspectRatio="none"
              >
                <path
                  v-for="segment in timelineCurvePaths"
                  :key="segment.id"
                  :d="segment.path"
                  class="timeline__curve-path"
                  :class="{ 'is-modified': segment.modified }"
                  :style="{ stroke: segment.color || DEFAULT_CURVE_COLOR }"
                />
              </svg>
            </div>

            <div class="timeline__keys">
              <div
                v-for="frame in visibleFrames"
                :key="frame.id"
                class="timeline__keyframe"
                :class="{
                  'is-selected': selectedKeyframes.has(frame.id),
                  'has-curve': easedKeyframeIds.has(frame.id)
                }"
                :style="{ left: `${timeToX(frame.time)}px`, '--keyframe-color': keyframeColorMap.get(frame.id) || TIMELINE_KEY_COLOR }"
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
    </div>
  </section>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useCaptions } from '../../composables/useCaptions.js'
import { useI18n } from '../../locales/index.js'

const MIN_VIEW_DURATION_EPSILON = 1e-6
const EDGE_MARGIN_RATIO = 0.05
const CURVE_VIEWBOX_HEIGHT = 64
const DEFAULT_CURVE_COLOR = '#5c8cff'
const TIMELINE_KEY_COLOR = 'var(--accent, #2d8cff)'

const DEFAULT_CURVE = Object.freeze({
  in: { x: 2 / 3, y: 2 / 3 },
  out: { x: 1 / 3, y: 1 / 3 }
})

function clamp01(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  if (num <= 0) return 0
  if (num >= 1) return 1
  return num
}

function sanitizeCurve(curve, fallback = DEFAULT_CURVE) {
  const fb = fallback || DEFAULT_CURVE
  return {
    in: {
      x: clamp01(curve?.in?.x ?? fb.in.x),
      y: clamp01(curve?.in?.y ?? fb.in.y)
    },
    out: {
      x: clamp01(curve?.out?.x ?? fb.out.x),
      y: clamp01(curve?.out?.y ?? fb.out.y)
    }
  }
}

function cloneCurve(curve) {
  return sanitizeCurve(curve, DEFAULT_CURVE)
}

function cloneCurves(curves) {
  if (!curves || typeof curves !== 'object') return {}
  const result = {}
  for (const [key, entry] of Object.entries(curves)) {
    result[key] = {
      curve: cloneCurve(entry?.curve),
      color: typeof entry?.color === 'string' ? entry.color : DEFAULT_CURVE_COLOR,
      modified: !!entry?.modified
    }
  }
  // 'default' キーがない場合は追加（以前の'all'は'default'に変換）
  if (!result.default) {
    if (result.all) {
      result.default = {
        curve: cloneCurve(result.all.curve || DEFAULT_CURVE),
        color: result.all.color || DEFAULT_CURVE_COLOR,
        modified: !!result.all.modified
      }
      delete result.all
    } else {
      result.default = {
        curve: cloneCurve(DEFAULT_CURVE),
        color: DEFAULT_CURVE_COLOR,
        modified: false
      }
    }
  }
  return result
}

function isCurveModified(curve) {
  if (!curve) return false
  const sanitized = sanitizeCurve(curve)
  return (
    Math.abs(sanitized.in.x - DEFAULT_CURVE.in.x) > 1e-4 ||
    Math.abs(sanitized.in.y - DEFAULT_CURVE.in.y) > 1e-4 ||
    Math.abs(sanitized.out.x - DEFAULT_CURVE.out.x) > 1e-4 ||
    Math.abs(sanitized.out.y - DEFAULT_CURVE.out.y) > 1e-4
  )
}

const props = defineProps({
  keyframes: { type: Array, default: () => [] },
  currentTime: { type: Number, required: true },
  startTime: { type: Number, required: true },
  endTime: { type: Number, required: true },
  frameRate: { type: Number, required: true },
  isPlaying: { type: Boolean, required: true },
  loop: { type: Boolean, default: false },
  snap: { type: Boolean, default: true },
  height: { type: [Number, String], default: null },
  canPaste: { type: Boolean, default: false },
  audioWaveformData: { type: [Array, Object], default: null },
  audioDuration: { type: Number, default: 0 },
  availableTrackers: { type: Array, default: () => [] }  // 追加：利用可能なトラッカーのリスト
})

const emit = defineEmits([
  'seek',
  'play',
  'pause',
  'step-frames',
  'jump-start',
  'jump-end',
  'toggle-loop',
  'add-keyframe',
  'remove-keyframe',
  'remove-keyframes',
  'move-keyframe',
  'move-keyframes',
  'update-range',
  'update:snap',
  'import-timeline',
  'export-timeline',
  'copy-keyframes',
  'paste-keyframes',
  'clear-timeline',
  'update-keyframe-selection'
])

const { tooltip } = useCaptions()
const { t } = useI18n()
const timelineEditorTexts = computed(() => t.value?.timelineEditor ?? {})

const timelineRef = ref(null)
const tracksWrapperRef = ref(null)
const ticksWrapperRef = ref(null)
const scrollbarWrapperRef = ref(null)
const waveformCanvasRef = ref(null)

const waveformSamples = computed(() => {
  const data = props.audioWaveformData
  if (!data) return null
  if (Array.isArray(data)) return data
  if (Array.isArray(data.samples)) return data.samples
  return null
})

const waveformDurationSeconds = computed(() => {
  if (typeof props.audioDuration === 'number' && props.audioDuration > 0) {
    return props.audioDuration
  }
  const duration = props.audioWaveformData && typeof props.audioWaveformData.duration === 'number'
    ? props.audioWaveformData.duration
    : 0
  return duration > 0 ? duration : 0
})

const hasWaveform = computed(() => {
  const samples = waveformSamples.value
  return !!samples && samples.length > 0 && waveformDurationSeconds.value > 0
})

const widthPx = ref(1)
// Force frames mode
const mode = ref('frames')
const viewStart = ref(0)
const visibleDuration = ref(1)
const snapToFrame = ref(props.snap !== false)
const selectionRange = ref(null)
const selectedKeyframes = ref(new Set())
const hasSelection = computed(() => selectedKeyframes.value.size > 0)
const startFrameInput = ref(0)
const endFrameInput = ref(0)

const STORAGE_KEY_VIEW = 'timeline.view.v2'
const STORAGE_KEY_MODE = 'timeline.view.mode'

const keyframesList = computed(() => (Array.isArray(props.keyframes) ? props.keyframes : []))
const hasTimelineContent = computed(() => keyframesList.value.length > 0)

const keyframeMap = computed(() => {
  const map = new Map()
  keyframesList.value.forEach(frame => {
    if (!frame || frame.id == null) return
    map.set(frame.id, frame)
  })
  return map
})

const selectedFrameIds = computed(() => Array.from(selectedKeyframes.value))

const inspectorFrames = computed(() => {
  const frames = selectedFrameIds.value
    .map(id => keyframeMap.value.get(id))
    .filter(Boolean)
    .sort((a, b) => a.time - b.time)
  return frames.map((frame, index) => {
    const curves = cloneCurves(frame.curves || {})
    const curve = cloneCurve(frame.curve || curves.all?.curve)
    return {
      id: frame.id,
      time: frame.time,
      frameLabel: formatFrameLabelFromTime(frame.time),
      timeLabel: formatTimeLabel(frame.time),
      curve,
      curves,
      isFirst: index === 0,
      isLast: index === frames.length - 1
    }
  })
})

watch(
  keyframesList,
  () => {
    const map = keyframeMap.value
    if (!map) return
    const next = new Set()
    selectedKeyframes.value.forEach(id => {
      if (map.has(id)) next.add(id)
    })
    if (next.size !== selectedKeyframes.value.size) {
      selectedKeyframes.value = next
    }
  },
  { immediate: true, deep: true }
)

watch(
  [inspectorFrames, selectedFrameIds],
  ([frames, ids]) => {
    const normalizedFrames = Array.isArray(frames)
      ? frames.map(frame => ({
          ...frame,
          curve: cloneCurve(frame.curve)
        }))
      : []
    emit('update-keyframe-selection', {
      frames: normalizedFrames,
      selectedIds: Array.isArray(ids) ? [...ids] : [],
      hasSelection: normalizedFrames.length > 0,
      hasMultiple: normalizedFrames.length > 1,
      startTime: normalizedFrames[0]?.time ?? null,
      endTime: normalizedFrames[normalizedFrames.length - 1]?.time ?? null
    })
  },
  { immediate: true }
)

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

const timelineCurvePaths = computed(() => {
  const frames = [...keyframesList.value].sort((a, b) => a.time - b.time)
  if (frames.length < 2) return []
  const total = frames.length
  const anchorForIndex = index => {
    if (total <= 1) return 0.5
    return 1 - index / (total - 1)
  }
  const result = []

  for (let i = 0; i < frames.length - 1; i++) {
    const current = frames[i]
    const next = frames[i + 1]
    const startX = timeToX(current.time)
    const endX = timeToX(next.time)
    const width = endX - startX
    if (!Number.isFinite(width) || width <= 0.5) continue

    const startAnchor = anchorForIndex(i)
    const endAnchor = anchorForIndex(i + 1)
    const startY = startAnchor * CURVE_VIEWBOX_HEIGHT
    const endY = endAnchor * CURVE_VIEWBOX_HEIGHT
    const baselineMid = CURVE_VIEWBOX_HEIGHT / 2

    const flattenPoint = (px, py) => {
      if (!Number.isFinite(width) || width <= 0) {
        return { x: px, y: baselineMid }
      }
      const ratio = (px - startX) / width
      const t = Math.min(1, Math.max(0, ratio))
      const baseline = startY + (endY - startY) * t
      const deviation = py - baseline
      const adjusted = baselineMid + deviation
      return { x: px, y: Math.min(Math.max(adjusted, 0), CURVE_VIEWBOX_HEIGHT) }
    }

    // 各トラッカーのカーブを取得
    const buildCurveMap = (frame) => {
      const map = { ...(frame.curves || {}) }
      
      // デバッグ：元のカーブデータを確認
      if (frame.curves) {
        console.log(`[TimelineEditor] buildCurveMap for frame ${frame.id}:`, JSON.stringify(frame.curves, null, 2))
      }
      
      // トラッカーごとのデフォルト色を定義
      const getDefaultColorForTracker = (trackerKey) => {
        const defaultColors = {
          default: '#5c8cff',
          head: '#3aa6ff',
          chest: '#00c853',
          hips: '#ff7043',
          leftUpperArm: '#1e88e5',
          rightUpperArm: '#e53935',
          leftHand: '#2979ff',
          rightHand: '#ff1744',
          leftElbow: '#1565c0',
          rightElbow: '#d50000',
          leftFoot: '#009688',
          rightFoot: '#00796b',
          leftKnee: '#26a69a',
          rightKnee: '#004d40',
          gaze: '#ffeb3b'
        }
        return defaultColors[trackerKey] || '#5c8cff'
      }
      
      const normalizeEntry = (entry, fallbackCurve, trackerKey = 'default') => {
        const curve = sanitizeCurve(entry?.curve || fallbackCurve)
        const color = entry?.color || getDefaultColorForTracker(trackerKey)
        
        // デバッグ：色の決定プロセス
        console.log(`[TimelineEditor] normalizeEntry for ${trackerKey}: entry.color=${entry?.color}, resolved=${color}`)
        
        return {
          curve,
          color,
          modified: !!entry?.modified || isCurveModified(curve)
        }
      }

      const baseCurve = sanitizeCurve(frame.curve || {})
      map.default = normalizeEntry(map.default, baseCurve, 'default')

      Object.keys(map).forEach(key => {
        if (key === 'default') return
        if (!map[key]) return
        map[key] = normalizeEntry(map[key], map.default.curve, key)
      })

      return map
    }

    const currentCurves = buildCurveMap(current)
    const nextCurves = buildCurveMap(next)

    const drawCurve = (trackerKey, startEntry, endEntry) => {
      const startCurve = sanitizeCurve(startEntry?.curve)
      const endCurve = sanitizeCurve(endEntry?.curve)
      // トラッカーごとの色を個別に管理：startEntryとendEntryの両方をチェック
      // startEntryの色を優先するが、存在しない場合はendEntryの色を使う
      const startColor = startEntry?.color
      const endColor = endEntry?.color
      const curveColor = startColor || endColor || DEFAULT_CURVE_COLOR

      const ctrl1X = startX + width * startCurve.out.x
      const ctrl2X = startX + width * endCurve.in.x
      const ctrl1Y = (startAnchor + (endAnchor - startAnchor) * startCurve.out.y) * CURVE_VIEWBOX_HEIGHT
      const ctrl2Y = (startAnchor + (endAnchor - startAnchor) * endCurve.in.y) * CURVE_VIEWBOX_HEIGHT
      const startPoint = { x: startX, y: baselineMid }
      const endPoint = { x: endX, y: baselineMid }
      const ctrl1 = flattenPoint(ctrl1X, ctrl1Y)
      const ctrl2 = flattenPoint(ctrl2X, ctrl2Y)
      const path = `M ${startPoint.x} ${startPoint.y} C ${ctrl1.x} ${ctrl1.y}, ${ctrl2.x} ${ctrl2.y}, ${endPoint.x} ${endPoint.y}`

      result.push({
        id: `${current.id}-${next.id}-${trackerKey}`,
        path,
        color: curveColor,
        trackerKey,
        modified: !!startEntry?.modified || !!endEntry?.modified || isCurveModified(startCurve) || isCurveModified(endCurve)
      })
    }

    // まずデフォルトカーブを描画
    drawCurve('default', currentCurves.default, nextCurves.default)

    // すべての利用可能なトラッカーのカーブを描画（キーフレームに存在しない場合でも）
    const allTrackerKeys = new Set()
    
    // キーフレームに既に存在するトラッカー
    Object.keys(currentCurves).filter(key => key !== 'default').forEach(key => allTrackerKeys.add(key))
    Object.keys(nextCurves).filter(key => key !== 'default').forEach(key => allTrackerKeys.add(key))
    
    // 利用可能なすべてのトラッカー（props.availableTrackersから）
    if (Array.isArray(props.availableTrackers)) {
      props.availableTrackers.forEach(tracker => {
        if (tracker?.key && tracker.key !== 'default') {
          allTrackerKeys.add(tracker.key)
        }
      })
    }

    allTrackerKeys.forEach(trackerKey => {
      const startEntry = currentCurves[trackerKey] || currentCurves.default
      const endEntry = nextCurves[trackerKey] || nextCurves.default
      if (!startEntry || !endEntry) return
      drawCurve(trackerKey, startEntry, endEntry)
    })
  }
  return result
})

function resolveKeyframeColor() {
  return TIMELINE_KEY_COLOR
}

const keyframeColorMap = computed(() => {
  const map = new Map()
  keyframesList.value.forEach(frame => {
    if (!frame || frame.id == null) return
    const color = resolveKeyframeColor(frame)
    map.set(frame.id, color)
  })
  return map
})

const easedKeyframeIds = computed(() => {
  const result = new Set()
  const frames = [...keyframesList.value].sort((a, b) => a.time - b.time)
  for (let i = 0; i < frames.length - 1; i++) {
    const current = frames[i]
    const next = frames[i + 1]
    if (!current || !next) continue
    // consider base curve first
    let modified = isCurveModified(current.curve) || isCurveModified(next.curve)
    // also consider per-tracker curves when present
    const currentCurves = current.curves || {}
    const nextCurves = next.curves || {}
    const keys = new Set([...Object.keys(currentCurves), ...Object.keys(nextCurves)])
    for (const key of keys) {
      const c = currentCurves[key]?.curve
      const n = nextCurves[key]?.curve
      if (c && isCurveModified(c)) modified = true
      if (n && isCurveModified(n)) modified = true
      if (modified) break
    }
    if (modified) {
      result.add(current.id)
      result.add(next.id)
    }
  }
  return result
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
      label: frameLabel,
      timeLabel,
      frameLabel,
      major: isMajor,
      showLabel: isMajor
    })
  }
  return arr
})

const modeLabel = computed(() => 'Frames')
const modeIcon = computed(() => 'mdi:filmstrip')

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
  nextTick(() => {
    syncScrollPositions()
    drawWaveform()
  })
})

// lock mode; no-op persistence

watch(minViewDuration, () => {
  clampView()
  syncScrollPositions()
})

onMounted(() => {
  restoreViewState()
  mode.value = 'frames'
  if (!snapToFrame.value) {
    snapToFrame.value = true
    emit('update:snap', true)
  }
  nextTick(() => {
    syncScrollPositions()
    drawWaveform()
  })
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  if (resizeRaf !== null) cancelAnimationFrame(resizeRaf)
})

// 波形描画関数
function drawWaveform() {
  const canvas = waveformCanvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = Math.max(canvas.width, 1)
  const height = Math.max(canvas.height, 1)
  ctx.clearRect(0, 0, width, height)

  const samples = waveformSamples.value
  const duration = waveformDurationSeconds.value
  if (!samples || samples.length === 0 || duration <= 0) {
    return
  }

  const sampleCount = samples.length
  const lastIndex = sampleCount - 1
  const viewStartTime = viewStart.value
  const viewDuration = visibleDuration.value
  const timelineStart = props.startTime || 0
  const audioStart = timelineStart
  const audioEnd = audioStart + duration

  if (viewDuration <= 0) return

  ctx.fillStyle = 'rgba(100, 180, 255, 0.15)'
  ctx.beginPath()
  ctx.moveTo(0, height / 2)

  for (let x = 0; x < width; x++) {
    const ratio = width <= 1 ? 0 : x / (width - 1)
    const time = viewStartTime + ratio * viewDuration
    let amplitude = 0

    if (time >= audioStart && time <= audioEnd) {
      const relativeTime = time - audioStart
      const index = Math.min(lastIndex, Math.max(0, Math.round((relativeTime / duration) * lastIndex)))
      amplitude = samples[index] ?? 0
    }

    const y = height / 2 - (amplitude * height / 2)
    ctx.lineTo(x, y)
  }

  for (let x = width - 1; x >= 0; x--) {
    const ratio = width <= 1 ? 0 : x / (width - 1)
    const time = viewStartTime + ratio * viewDuration
    let amplitude = 0

    if (time >= audioStart && time <= audioEnd) {
      const relativeTime = time - audioStart
      const index = Math.min(lastIndex, Math.max(0, Math.round((relativeTime / duration) * lastIndex)))
      amplitude = samples[index] ?? 0
    }

    const y = height / 2 + (amplitude * height / 2)
    ctx.lineTo(x, y)
  }

  ctx.closePath()
  ctx.fill()
}

// 波形チE�Eタが変更されたら再描画
watch(() => props.audioWaveformData, () => {
  nextTick(() => drawWaveform())
}, { deep: true })

// コンチE��チE��E��変更されたら再描画
watch(() => contentWidth.value, () => {
  nextTick(() => drawWaveform())
})

watch(() => props.audioDuration, () => {
  nextTick(() => drawWaveform())
})

watch(() => props.startTime, () => {
  nextTick(() => drawWaveform())
})

watch(() => props.endTime, () => {
  nextTick(() => drawWaveform())
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

function fitRange() {
  visibleDuration.value = extendedDuration.value
  viewStart.value = extendedStart.value
  clampView()
  syncScrollPositions()
}

// removed toggle (frames only)

function togglePlayPause() {
  if (props.isPlaying) {
    emit('pause')
  } else {
    emit('play')
  }
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

function handleHeaderPointerDown(event) {
  if (event.button !== 0) return
  startScrub(event, 'ticks')
}

function startScrub(event, source = 'tracks') {
  const { time } = getPointerInfo(event, source)
  emit('seek', snapIfNeeded(time))
  dragState = { type: 'scrub', source }
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
  event.preventDefault()
}

function removeSelectedKeyframes() {
  if (!hasSelection.value) return
  const ids = Array.from(selectedKeyframes.value)
  if (ids.length === 1) {
    emit('remove-keyframe', { keyframeId: ids[0] })
  } else if (ids.length > 1) {
    emit('remove-keyframes', { keyframeIds: ids })
  }
  selectionRange.value = null
  selectedKeyframes.value = new Set()
}

function mergeSelection(newSelection, originalSelection, mode = 'replace') {
  if (mode === 'add') {
    const combined = new Set(originalSelection)
    newSelection.forEach(id => combined.add(id))
    return combined
  }
  if (mode === 'subtract') {
    const reduced = new Set(originalSelection)
    newSelection.forEach(id => reduced.delete(id))
    return reduced
  }
  return newSelection
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

function formatFrameLabelFromTime(time) {
  const fps = props.frameRate || 60
  const startFrame = Math.round(props.startTime * fps)
  const frameNumber = startFrame + Math.round((time - props.startTime) * fps)
  return formatFrameLabel(frameNumber)
}

function getPointerInfo(event, source = 'tracks') {
  const container = source === 'ticks' ? ticksWrapperRef.value : tracksWrapperRef.value
  if (!container) {
    return { time: props.startTime, x: 0 }
  }
  const rect = container.getBoundingClientRect()
  const scrollLeft = container.scrollLeft
  let x = event.clientX - rect.left
  x = Math.max(0, x)
  const absoluteTime = extendedStart.value + (scrollLeft + x) / pixelsPerSecond.value
  const time = clampTime(absoluteTime)
  return { time, x }
}

function handlePointerDown(event) {
  const shouldPan = event.button === 1 || (event.button === 0 && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey)
  if (shouldPan) {
    startPan(event)
    return
  }
  if (event.button !== 0) return

  const mode = event.altKey ? 'subtract' : (event.ctrlKey || event.metaKey ? 'add' : 'replace')
  startSelection(event, mode)
}

function handlePointerMove(event) {
  if (!dragState) return
  if (dragState.type === 'scrub') {
    const { time } = getPointerInfo(event, dragState.source || 'tracks')
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
    const snappedAnchor = snapTimeToFrame(targetTime)
    const delta = snappedAnchor - dragState.anchorOriginalTime
    if (Math.abs(delta - (dragState.lastDelta ?? 0)) <= 1e-5) return
    dragState.lastDelta = delta
    if (!dragState.keyIds || dragState.keyIds.length <= 1) {
      emit('move-keyframe', {
        keyframeId: dragState.anchorId,
        time: snappedAnchor
      })
      return
    }
    const updates = []
    dragState.keyIds.forEach(id => {
      const original = dragState.originalTimes?.get(id)
      if (original === undefined) return
      const nextTime = clampTime(snapTimeToFrame(original + delta))
      updates.push({ keyframeId: id, time: nextTime })
    })
    if (!updates.length) return
    if (updates.length === 1) emit('move-keyframe', updates[0])
    else emit('move-keyframes', { updates })
  }
}

function handlePointerUp() {
  if (dragState?.type === 'select') {
    finalizeSelection(dragState)
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

function startSelection(event, mode = 'replace') {
  const { time } = getPointerInfo(event)
  selectionRange.value = { start: time, end: time }
  dragState = {
    type: 'select',
    anchorTime: time,
    mode,
    originalSelection: new Set(selectedKeyframes.value)
  }
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
  event.preventDefault()
}

function finalizeSelection(state) {
  const range = selectionRange.value
  const original = state?.originalSelection || new Set(selectedKeyframes.value)
  if (!range) {
    if (state?.mode === 'replace') selectedKeyframes.value = new Set()
    return
  }
  const start = Math.min(range.start, range.end)
  const end = Math.max(range.start, range.end)
  const minSpan = Math.max(frameDuration.value * 0.25, minViewDuration.value / 200)
  const isClick = Math.abs(end - start) < minSpan
  let result
  if (isClick) {
    result = state?.mode === 'replace' ? new Set() : new Set(original)
  } else {
    const collected = new Set()
    keyframesList.value.forEach(frame => {
      if (frame.time >= start && frame.time <= end) {
        collected.add(frame.id)
      }
    })
    result = mergeSelection(collected, original, state?.mode || 'replace')
  }
  selectionRange.value = null
  selectedKeyframes.value = result
}

function startKeyframeDrag(event, frame) {
  const { time } = getPointerInfo(event)
  const offset = time - frame.time

  if (event.ctrlKey || event.metaKey) {
    const updated = new Set(selectedKeyframes.value)
    if (updated.has(frame.id)) {
      updated.delete(frame.id)
      selectedKeyframes.value = updated
      return
    }
    updated.add(frame.id)
    selectedKeyframes.value = updated
  } else {
    if (!selectedKeyframes.value.has(frame.id)) {
      selectedKeyframes.value = new Set([frame.id])
    }
  }

  const activeSelection = new Set(selectedKeyframes.value)
  if (!activeSelection.size) {
    activeSelection.add(frame.id)
    selectedKeyframes.value = activeSelection
  }

  const originalTimes = new Map()
  keyframesList.value.forEach(item => {
    if (activeSelection.has(item.id)) {
      originalTimes.set(item.id, item.time)
    }
  })

  dragState = {
    type: 'keyframe',
    keyIds: Array.from(activeSelection),
    anchorId: frame.id,
    offset,
    anchorOriginalTime: frame.time,
    originalTimes,
    lastDelta: 0
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
  flex-direction: row;
  width: 100%;
  min-height: 0;
  background: radial-gradient(circle at top, rgba(32, 38, 52, 0.85), rgba(12, 15, 24, 0.96));
  color: var(--text-strong, #ffffff);
  border-top: 1px solid var(--border-soft, rgba(255, 255, 255, 0.08));
  user-select: none;
  -webkit-user-select: none;
  --timeline-ruler-height: 46px;
  --timeline-key-lane-height: 44px;
  --timeline-playhead-color: #ff615a;
  --timeline-key-padding-y: 6px;
  --timeline-curves-height: calc(var(--timeline-key-lane-height) - var(--timeline-key-padding-y) * 2);
}

.timeline__primary {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-width: 0;
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
  box-shadow: none;
  min-width: 48px;
}

.timeline__tick-label-time {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.timeline__tick-label-frame {
  font-size: 0.66rem;
  font-weight: 500;
  opacity: 0.85;
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
  box-shadow: none;
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

.timeline__waveform {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.8;
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
  box-shadow: none;
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

.timeline__curves {
  position: absolute;
  top: var(--timeline-key-padding-y);
  height: var(--timeline-curves-height);
  left: 0;
  right: 0;
  pointer-events: none;
  z-index: 2;
}

.timeline__curves-canvas {
  width: 100%;
  height: 100%;
}

.timeline__curve-path {
  fill: none;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.5;
  transition: opacity 0.2s ease, stroke-width 0.2s ease;
}

.timeline__curve-path.is-modified {
  opacity: 0.75;
  stroke-width: 2.2;
}


 
.timeline__keys {
  position: relative;
  min-height: var(--timeline-key-lane-height);
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: var(--timeline-key-padding-y) 0;
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
  --key-color: var(--keyframe-color, var(--accent, #2d8cff));
  border: 2px solid color-mix(in srgb, var(--key-color) 75%, rgba(255, 255, 255, 0.92));
  background: color-mix(in srgb, var(--key-color) 82%, rgba(255, 255, 255, 0.08));
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
  pointer-events: auto;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--key-color) 25%, rgba(0, 0, 0, 0.45));
}

.timeline__keyframe:hover,
.timeline__keyframe.is-selected {
  transform: translate(-50%, -50%) rotate(45deg) scale(1.15);
  box-shadow: 0 0 0 1.2px color-mix(in srgb, var(--key-color) 45%, rgba(0, 0, 0, 0.4));
  background: color-mix(in srgb, var(--key-color) 90%, rgba(255, 255, 255, 0.3));
}

.timeline__keyframe.has-curve {
  background: color-mix(in srgb, var(--key-color) 85%, rgba(255, 255, 255, 0.35));
  border-color: color-mix(in srgb, var(--key-color) 70%, rgba(255, 255, 255, 0.95));
  box-shadow: 0 0 0 1.2px color-mix(in srgb, var(--key-color) 38%, rgba(0, 0, 0, 0.5));
}

.timeline__playhead {
  position: absolute;
  top: 0;
  bottom: 10px;
  width: 2px;
  background: var(--timeline-playhead-color);
  pointer-events: none;
  box-shadow: none;
  z-index: 5;
  transform: translateX(-50%);
}

.timeline__playhead--header {
  top: 0;
  bottom: 0;
  box-shadow: none;
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
  box-shadow: none;
}

.timeline__playhead--body {
  top: 2px;
  bottom: 12px;
  box-shadow: none;
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

@media (max-width: 1280px) {
  .timeline {
    flex-direction: column;
  }

  .timeline__inspector {
    flex: 0 0 auto;
    width: 100%;
    max-width: none;
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 0.85rem;
  }
}
</style>

