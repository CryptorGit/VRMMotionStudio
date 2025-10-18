<template>
  <div class="curve-editor">
    <div class="curve-editor__header">
      <h3>イージングカーブ</h3>
      <button
        type="button"
        class="curve-editor__reset"
        :disabled="!canReset"
        @click="resetCurves"
      >
        リセット
      </button>
    </div>

    <div v-if="normalizedFrames.length < 2" class="curve-editor__empty">
      <p>曲線を編集するには、2つ以上のキーを選択してください。</p>
    </div>

    <svg
      v-else
      ref="svgRef"
      class="curve-editor__canvas"
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
    >
      <rect class="curve-editor__background" x="0" y="0" width="1" height="1" rx="0.02" ry="0.02" />

      <g class="curve-editor__grid" aria-hidden="true">
        <line v-for="tick in 5" :key="`grid-h-${tick}`" :x1="0" :x2="1" :y1="tick / 6" :y2="tick / 6" />
        <line v-for="tick in 5" :key="`grid-v-${tick}`" :y1="0" :y2="1" :x1="tick / 6" :x2="tick / 6" />
      </g>

      <g class="curve-editor__paths">
        <path
          v-for="segment in segments"
          :key="segment.id"
          :d="segment.path"
          :class="{ 'is-modified': segment.modified }"
          :style="{ stroke: curveColor }"
        />
      </g>

      <g class="curve-editor__handles">
        <g v-for="handle in handles" :key="`${handle.type}-${handle.frameId}-${handle.segmentIndex}`">
          <line
            class="curve-editor__handle-line"
            :x1="handle.startPoint.x"
            :y1="handle.startPoint.y"
            :x2="handle.x"
            :y2="handle.y"
          />
          <circle
            class="curve-editor__handle"
            :class="{
              'is-active': dragState?.frameId === handle.frameId && dragState?.type === handle.type,
              'is-out': handle.type === 'out',
              'is-in': handle.type === 'in'
            }"
            :cx="handle.x"
            :cy="handle.y"
            r="0.018"
            tabindex="0"
            role="slider"
            aria-label="カーブ制御点"
            @pointerdown.prevent="startHandleDrag($event, handle)"
          />
        </g>
      </g>

      <g class="curve-editor__points">
        <circle
          v-for="point in keyPoints"
          :key="point.id"
          class="curve-editor__point"
          :cx="point.x"
          :cy="point.y"
          r="0.02"
        />
      </g>
    </svg>

    <div v-if="normalizedFrames.length >= 2" class="curve-editor__details">
      <div
        v-for="frame in normalizedFrames"
        :key="`detail-${frame.id}`"
        class="curve-editor__detail"
      >
        <div class="curve-editor__detail-header">
          <span class="curve-editor__label">{{ frame.frameLabel }}</span>
          <span class="curve-editor__sublabel">{{ frame.timeLabel }}</span>
        </div>
        <div class="curve-editor__control-group" v-if="!frame.isFirst">
          <span class="curve-editor__control-title">In</span>
          <label>
            X
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              :value="frame.curve.in.x.toFixed(2)"
              @change="onInput(frame.id, 'in', 'x', $event.target.value)"
            />
          </label>
          <label>
            Y
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              :value="frame.curve.in.y.toFixed(2)"
              @change="onInput(frame.id, 'in', 'y', $event.target.value)"
            />
          </label>
        </div>
        <div class="curve-editor__control-group" v-if="!frame.isLast">
          <span class="curve-editor__control-title">Out</span>
          <label>
            X
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              :value="frame.curve.out.x.toFixed(2)"
              @change="onInput(frame.id, 'out', 'x', $event.target.value)"
            />
          </label>
          <label>
            Y
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              :value="frame.curve.out.y.toFixed(2)"
              @change="onInput(frame.id, 'out', 'y', $event.target.value)"
            />
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue'

const DEFAULT_CURVE = Object.freeze({
  in: { x: 2 / 3, y: 2 / 3 },
  out: { x: 1 / 3, y: 1 / 3 }
})
const EPSILON = 1e-4

const props = defineProps({
  frames: { type: Array, default: () => [] },
  trackerKey: { type: String, default: 'default' },
  curveColor: { type: String, default: '#5c8cff' }
})

const emit = defineEmits(['update', 'reset'])

const svgRef = ref(null)
const dragState = ref(null)
const curvesState = ref(new Map())
const liveUpdateQueue = new Map()
let liveUpdateRaf = null

const clamp01 = value => {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  if (num <= 0) return 0
  if (num >= 1) return 1
  return num
}

const cloneCurve = curve => ({
  in: {
    x: clamp01(curve?.in?.x ?? DEFAULT_CURVE.in.x),
    y: clamp01(curve?.in?.y ?? DEFAULT_CURVE.in.y)
  },
  out: {
    x: clamp01(curve?.out?.x ?? DEFAULT_CURVE.out.x),
    y: clamp01(curve?.out?.y ?? DEFAULT_CURVE.out.y)
  }
})

const isCurveModified = curve => {
  if (!curve) return false
  return (
    Math.abs(curve.in.x - DEFAULT_CURVE.in.x) > EPSILON ||
    Math.abs(curve.in.y - DEFAULT_CURVE.in.y) > EPSILON ||
    Math.abs(curve.out.x - DEFAULT_CURVE.out.x) > EPSILON ||
    Math.abs(curve.out.y - DEFAULT_CURVE.out.y) > EPSILON
  )
}

const FALLBACK_CURVE_COLOR = '#5c8cff'
const trackerColorCache = new Map()

const normalizeColor = (color, fallback = FALLBACK_CURVE_COLOR) => {
  if (typeof color !== 'string') return fallback
  const trimmed = color.trim()
  if (!trimmed) return fallback
  const prefixed = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  const lower = prefixed.toLowerCase()
  if (/^#[0-9a-f]{3}$/.test(lower)) {
    const expanded = lower
      .slice(1)
      .split('')
      .map(char => `${char}${char}`)
      .join('')
    return `#${expanded}`
  }
  if (/^#[0-9a-f]{6}$/.test(lower)) return lower
  if (/^#[0-9a-f]{8}$/.test(lower)) return `#${lower.slice(1, 7)}`
  return fallback
}

const rememberTrackerColor = (trackerKey, color) => {
  if (!trackerKey) return
  const normalized = normalizeColor(color)
  trackerColorCache.set(trackerKey, normalized)
}

const captureColorsFromFrames = (frames) => {
  if (!Array.isArray(frames)) return
  frames.forEach(frame => {
    if (!frame) return
    const defaultColor = frame.curves?.default?.color || frame.curve?.color
    if (defaultColor) rememberTrackerColor('default', defaultColor)
    const curveEntries = frame.curves
    if (curveEntries && typeof curveEntries === 'object') {
      Object.entries(curveEntries).forEach(([key, entry]) => {
        if (!key || !entry) return
        if (entry.color) rememberTrackerColor(key, entry.color)
      })
    }
  })
}

const findColorInFrames = (trackerKey) => {
  if (!trackerKey) return null
  const frames = Array.isArray(props.frames) ? props.frames : []
  if (!frames.length) return null
  if (trackerKey === 'default') {
    for (const frame of frames) {
      if (!frame) continue
      const color = frame.curves?.default?.color || frame.curve?.color
      if (color) return normalizeColor(color)
    }
    return null
  }
  for (const frame of frames) {
    if (!frame) continue
    const color = frame.curves?.[trackerKey]?.color
    if (color) return normalizeColor(color)
  }
  return null
}

const resolveTrackerColor = (trackerKey) => {
  if (!trackerKey) return normalizeColor(props.curveColor)
  const colorFromFrames = findColorInFrames(trackerKey)
  if (colorFromFrames) {
    rememberTrackerColor(trackerKey, colorFromFrames)
    return colorFromFrames
  }
  if (trackerColorCache.has(trackerKey)) {
    return trackerColorCache.get(trackerKey)
  }
  if (trackerKey === 'default') {
    const normalized = normalizeColor(props.curveColor)
    rememberTrackerColor(trackerKey, normalized)
    return normalized
  }
  return FALLBACK_CURVE_COLOR
}

const flushLiveUpdates = (trackerKeyOverride = props.trackerKey) => {
  if (liveUpdateRaf != null && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(liveUpdateRaf)
    liveUpdateRaf = null
  }
  if (!liveUpdateQueue.size) return
  const updates = []
  liveUpdateQueue.forEach((curve, frameId) => {
    updates.push({ keyframeId: frameId, curve: cloneCurve(curve) })
  })
  liveUpdateQueue.clear()
  if (!updates.length) return
  try {
    const color = resolveTrackerColor(trackerKeyOverride)
    emit('update', {
      updates,
      trackerKey: trackerKeyOverride,
      curveColor: color
    })
    rememberTrackerColor(trackerKeyOverride, color)
  } catch (error) {
    console.warn('[CurveEditor] Failed to emit live curve updates', error)
  }
}

const queueLiveCurveUpdate = (frameId, curve) => {
  liveUpdateQueue.set(frameId, cloneCurve(curve))
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    if (liveUpdateRaf != null) return
    liveUpdateRaf = window.requestAnimationFrame(() => {
      liveUpdateRaf = null
      flushLiveUpdates()
    })
  } else {
    flushLiveUpdates()
  }
}

// トラチE��ー刁E��替え時にカーブを保存！E��允E��完�E修正版！E
watch(() => props.trackerKey, (newTrackerKey, oldTrackerKey) => {
  captureColorsFromFrames(props.frames)
  flushLiveUpdates(oldTrackerKey)
  console.log(`[CurveEditor] Tracker changed from ${oldTrackerKey} to ${newTrackerKey}`)

  // 旧トラチE��ーのカーブをタイムラインへ即時保存（トラチE��ー刁E��替え前の編雁E�E容を確実に保存！E
  if (oldTrackerKey && curvesState.value.size > 0) {
    const updatesToEmit = []
    
    curvesState.value.forEach((curve, frameId) => {
      // タイムラインへ反映するための更新リストに追加
      updatesToEmit.push({ keyframeId: frameId, curve: cloneCurve(curve) })
    })

    // 旧トラチE��ー側のカーブをタイムラインへ即時反映
    if (updatesToEmit.length > 0) {
      const color = resolveTrackerColor(oldTrackerKey)
      try {
        emit('update', {
          updates: updatesToEmit,
          trackerKey: oldTrackerKey,
          curveColor: color
        })
        console.log(`[CurveEditor] Emitted ${updatesToEmit.length} curve updates for tracker ${oldTrackerKey}`)
        rememberTrackerColor(oldTrackerKey, color)
      } catch (e) {
        console.warn('[CurveEditor] Failed to emit updates for previous tracker on switch', e)
      }
    }
  }
  
  // 新しいトラチE��ーのカーブを復允E��タイムラインから直接取得！E
  const next = new Map()
  props.frames.forEach(frame => {
    // タイムラインから該当トラチE��ーのカーブを取征E
    const trackerCurve = frame.curves?.[newTrackerKey]?.curve
    
    if (trackerCurve) {
      // トラチE��ー専用のカーブが存在する場合�Eそれを使用
      const cloned = cloneCurve(trackerCurve)
      next.set(frame.id, cloned)
      console.log(`[CurveEditor] Loaded curve from timeline for frame ${frame.id}, tracker ${newTrackerKey}`)
    } else if (newTrackerKey !== 'default') {
      // トラチE��ー専用カーブがなぁE��合�Edefaultカーブをコピ�E�E�新規トラチE��ーの場合！E
      const defaultCurve = frame.curves?.default?.curve || frame.curve || DEFAULT_CURVE
      const copiedCurve = cloneCurve(defaultCurve)
      next.set(frame.id, copiedCurve)
      console.log(`[CurveEditor] Copied default curve to ${newTrackerKey} for frame ${frame.id}`)
    } else {
      // defaultトラチE��ー自身の場合�Edefaultカーブまた�Eフレームのカーブを使用
      const baseCurve = frame.curves?.default?.curve || frame.curve || DEFAULT_CURVE
      next.set(frame.id, cloneCurve(baseCurve))
      console.log(`[CurveEditor] Loaded default curve for default tracker, frame ${frame.id}`)
    }
  })
  curvesState.value = next

  console.log(`[CurveEditor] Loaded ${next.size} curves for tracker ${newTrackerKey}`)
  if (newTrackerKey) {
    const color = resolveTrackerColor(newTrackerKey)
    rememberTrackerColor(newTrackerKey, color)
  }
}, { immediate: true })

watch(
  () => props.frames,
  frames => {
    captureColorsFromFrames(frames)
    flushLiveUpdates()
    // ドラチE��中は更新しなぁE
    if (dragState.value?.active) {
      console.log('[CurveEditor] Skipping frame update during drag')
      return
    }
    
    const next = new Map(curvesState.value)
    frames.forEach(frame => {
      // 既存�E状態を優先的に使用�E�編雁E��態を保持�E�E
      if (next.has(frame.id)) {
        return
      }
      
      // タイムラインから該当トラチE��ーのカーブを取征E
      const trackerCurve = frame.curves?.[props.trackerKey]?.curve
      
      if (trackerCurve) {
        // トラチE��ー専用のカーブが存在する場合�Eそれを使用
        const cloned = cloneCurve(trackerCurve)
        next.set(frame.id, cloned)
        console.log(`[CurveEditor] Loaded curve from timeline for frame ${frame.id}, tracker ${props.trackerKey}`)
      } else if (props.trackerKey !== 'default') {
        // トラチE��ー専用カーブがなぁE��合�Edefaultカーブをコピ�E
        const defaultCurve = frame.curves?.default?.curve || frame.curve || DEFAULT_CURVE
        const copiedCurve = cloneCurve(defaultCurve)
        next.set(frame.id, copiedCurve)
        console.log(`[CurveEditor] Copied default curve to ${props.trackerKey} for frame ${frame.id}`)
      } else {
        // defaultトラチE��ー自身の場吁E
        const baseCurve = frame.curves?.default?.curve || frame.curve || DEFAULT_CURVE
        next.set(frame.id, cloneCurve(baseCurve))
        console.log(`[CurveEditor] Loaded default curve for default tracker, frame ${frame.id}`)
      }
    })
    curvesState.value = next
    if (props.trackerKey) {
      const color = resolveTrackerColor(props.trackerKey)
      rememberTrackerColor(props.trackerKey, color)
    }
  },
  { immediate: true }
)

// カーブ色の変更を監視し、最新色をキャッシュ
watch(
  () => props.curveColor,
  value => {
    if (!props.trackerKey) return
    rememberTrackerColor(props.trackerKey, value)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  flushLiveUpdates()
  liveUpdateQueue.clear()
  if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function' && liveUpdateRaf != null) {
    window.cancelAnimationFrame(liveUpdateRaf)
  }
  liveUpdateRaf = null
})

const normalizedFrames = computed(() => {
  const frames = Array.isArray(props.frames) ? [...props.frames].sort((a, b) => a.time - b.time) : []
  if (!frames.length) return []
  const minTime = frames[0].time
  const maxTime = frames[frames.length - 1].time
  const span = Math.max(maxTime - minTime, 1e-6)
  const count = frames.length
  return frames.map((frame, index) => {
    const normalizedTime = span <= 1e-6 ? index / Math.max(count - 1, 1) : (frame.time - minTime) / span
    const anchor = count <= 1 ? 0.5 : 1 - index / (count - 1)
    const curve = curvesState.value.get(frame.id) ?? cloneCurve(frame.curve)
    return {
      ...frame,
      index,
      normalizedTime,
      anchor,
      curve,
      isFirst: index === 0,
      isLast: index === count - 1
    }
  })
})

const segments = computed(() => {
  const list = normalizedFrames.value
  const result = []
  if (list.length < 2) return result
  for (let i = 0; i < list.length - 1; i++) {
    const current = list[i]
    const next = list[i + 1]
    const spanX = Math.max(next.normalizedTime - current.normalizedTime, 1e-6)
    const startCurve = current.curve
    const endCurve = next.curve
    const ctrl1X = current.normalizedTime + spanX * startCurve.out.x
    const ctrl2X = current.normalizedTime + spanX * endCurve.in.x
    const ctrl1Y = current.anchor + (next.anchor - current.anchor) * startCurve.out.y
    const ctrl2Y = current.anchor + (next.anchor - current.anchor) * endCurve.in.y

    result.push({
      id: `${current.id}-${next.id}`,
      from: current,
      to: next,
      path: `M ${current.normalizedTime} ${current.anchor} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${next.normalizedTime} ${next.anchor}`,
      modified: isCurveModified(startCurve) || isCurveModified(endCurve),
      controlOut: {
        type: 'out',
        frameId: current.id,
        x: ctrl1X,
        y: ctrl1Y,
        startPoint: { x: current.normalizedTime, y: current.anchor },
        anchorStart: current.anchor,
        anchorEnd: next.anchor,
        startNorm: current.normalizedTime,
        spanX,
        segmentIndex: i
      },
      controlIn: {
        type: 'in',
        frameId: next.id,
        x: ctrl2X,
        y: ctrl2Y,
        startPoint: { x: next.normalizedTime, y: next.anchor },
        anchorStart: current.anchor,
        anchorEnd: next.anchor,
        startNorm: current.normalizedTime,
        spanX,
        segmentIndex: i
      }
    })
  }
  return result
})

const handles = computed(() => {
  const result = []
  segments.value.forEach(segment => {
    result.push(segment.controlOut)
    result.push(segment.controlIn)
  })
  return result
})

const keyPoints = computed(() => normalizedFrames.value.map(frame => ({
  id: frame.id,
  x: frame.normalizedTime,
  y: frame.anchor
})))

const canReset = computed(() => normalizedFrames.value.some(frame => isCurveModified(frame.curve)))

function updateCurve(frameId, handleType, handleValue, { silent = false } = {}) {
  const nextMap = new Map(curvesState.value)
  const existing = nextMap.get(frameId) ?? cloneCurve(DEFAULT_CURVE)
  const currentCurve = cloneCurve(existing)
  currentCurve[handleType] = {
    x: clamp01(handleValue.x),
    y: clamp01(handleValue.y)
  }
  nextMap.set(frameId, currentCurve)
  curvesState.value = nextMap

  const payloadCurve = cloneCurve(currentCurve)
  if (silent) {
    queueLiveCurveUpdate(frameId, payloadCurve)
    return
  }

  const color = resolveTrackerColor(props.trackerKey)
  emit('update', {
    updates: [
      {
        keyframeId: frameId,
        curve: payloadCurve
      }
    ],
    trackerKey: props.trackerKey,
    curveColor: color
  })
  rememberTrackerColor(props.trackerKey, color)
}

function onInput(frameId, handleType, axis, value) {
  const numeric = clamp01(Number(value))
  const existing = curvesState.value.get(frameId) ?? cloneCurve(DEFAULT_CURVE)
  const nextCurve = cloneCurve(existing)
  nextCurve[handleType][axis] = numeric
  const nextMap = new Map(curvesState.value)
  nextMap.set(frameId, nextCurve)
  curvesState.value = nextMap

  const color = resolveTrackerColor(props.trackerKey)
  emit('update', {
    updates: [
      {
        keyframeId: frameId,
        curve: cloneCurve(nextCurve)
      }
    ],
    trackerKey: props.trackerKey,
    curveColor: color
  })
  rememberTrackerColor(props.trackerKey, color)
}

function resetCurves() {
  if (!normalizedFrames.value.length) return
  const next = new Map(curvesState.value)
  const updates = []
  normalizedFrames.value.forEach(frame => {
    const curve = cloneCurve(DEFAULT_CURVE)
    next.set(frame.id, curve)
    updates.push({ keyframeId: frame.id, curve: cloneCurve(curve) })
    // リセチE��時�E永続ストレージもクリア
    const storageKey = `${frame.id}-${props.trackerKey}`
    persistentCurveStorage.delete(storageKey)
  })
  curvesState.value = next
  if (updates.length) {
    const color = resolveTrackerColor(props.trackerKey)
    emit('update', {
      updates,
      trackerKey: props.trackerKey,
      curveColor: color
    })
    rememberTrackerColor(props.trackerKey, color)
    emit('reset')
  }
}

function startHandleDrag(event, handle) {
  if (!handle) return
  const svg = svgRef.value
  if (!svg) return
  dragState.value = {
    active: true,
    frameId: handle.frameId,
    type: handle.type,
    anchorStart: handle.anchorStart,
    anchorEnd: handle.anchorEnd,
    startNorm: handle.type === 'in' ? handle.startNorm : handle.startNorm,
    spanX: handle.spanX,
    segmentIndex: handle.segmentIndex,
    pointerId: event.pointerId
  }
  window.addEventListener('pointermove', onHandlePointerMove)
  window.addEventListener('pointerup', endHandleDrag)
  window.addEventListener('pointercancel', endHandleDrag)
  svg.setPointerCapture?.(event.pointerId)
}

function onHandlePointerMove(event) {
  const state = dragState.value
  const svg = svgRef.value
  if (!state || !svg) return
  const rect = svg.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return
  let normX = clamp01((event.clientX - rect.left) / rect.width)
  let normY = clamp01((event.clientY - rect.top) / rect.height)

  const span = Math.max(state.spanX, 1e-6)
  const relativeX = clamp01((normX - state.startNorm) / span)
  const delta = state.anchorEnd - state.anchorStart
  let relativeY
  if (Math.abs(delta) < 1e-6) {
    relativeY = clamp01(normY)
  } else {
    relativeY = clamp01((normY - state.anchorStart) / delta)
  }

  updateCurve(state.frameId, state.type, { x: relativeX, y: relativeY }, { silent: true })
}

function endHandleDrag() {
  const state = dragState.value
  const svg = svgRef.value
  if (!state) return
  window.removeEventListener('pointermove', onHandlePointerMove)
  window.removeEventListener('pointerup', endHandleDrag)
  window.removeEventListener('pointercancel', endHandleDrag)
  if (svg && state.pointerId != null) {
    try { svg.releasePointerCapture?.(state.pointerId) } catch {}
  }
  flushLiveUpdates()
  const curve = curvesState.value.get(state.frameId)
  if (curve) {
    // 永続ストレージに保孁E
    saveCurveToStorage(state.frameId, props.trackerKey, curve, props.curveColor)

    emit('update', {
      updates: [
        {
          keyframeId: state.frameId,
          curve: cloneCurve(curve)
        }
      ],
      trackerKey: props.trackerKey,
      curveColor: props.curveColor
    })
  }
  dragState.value = null
}

</script>

<style scoped>
.curve-editor {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.curve-editor__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.curve-editor__header h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.curve-editor__reset {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  border-radius: 6px;
  padding: 0.25rem 0.55rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.16s ease, border 0.16s ease;
}

.curve-editor__reset:disabled {
  opacity: 0.45;
  cursor: default;
}

.curve-editor__reset:not(:disabled):hover,
.curve-editor__reset:not(:disabled):focus-visible {
  background: color-mix(in srgb, var(--accent, #2d8cff) 30%, rgba(255, 255, 255, 0.1));
  border-color: color-mix(in srgb, var(--accent, #2d8cff) 45%, rgba(255, 255, 255, 0.18));
  outline: none;
}

.curve-editor__empty {
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  padding: 1rem;
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(15, 20, 30, 0.45);
}

.curve-editor__canvas {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: none;
  cursor: crosshair;
}

.curve-editor__background {
  fill: linear-gradient(180deg, rgba(18, 24, 36, 0.92), rgba(11, 15, 26, 0.94));
}

.curve-editor__grid line {
  stroke: rgba(255, 255, 255, 0.08);
  stroke-width: 0.0015;
}

.curve-editor__paths path {
  fill: none;
  stroke-width: 0.01;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 0.03px rgba(12, 150, 255, 0.35));
}

.curve-editor__paths path.is-modified {
  stroke-width: 0.014;
}

.curve-editor__handle-line {
  stroke: rgba(255, 255, 255, 0.25);
  stroke-width: 0.006;
  stroke-dasharray: 0.02 0.02;
}

.curve-editor__handle {
  fill: rgba(255, 255, 255, 0.9);
  stroke: rgba(0, 0, 0, 0.45);
  stroke-width: 0.004;
  cursor: grab;
  transition: transform 0.12s ease, fill 0.12s ease, stroke 0.12s ease;
}

.curve-editor__handle.is-out {
  fill: rgba(130, 200, 255, 0.9);
}

.curve-editor__handle.is-in {
  fill: rgba(255, 180, 120, 0.9);
}

.curve-editor__handle.is-active,
.curve-editor__handle:focus-visible {
  outline: none;
  stroke: rgba(255, 255, 255, 0.9);
  stroke-width: 0.006;
  cursor: grabbing;
}

.curve-editor__point {
  fill: rgba(255, 255, 255, 0.78);
  stroke: rgba(0, 0, 0, 0.6);
  stroke-width: 0.005;
  transition: transform 0.12s ease;
}

.curve-editor__details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.curve-editor__detail {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 0.55rem 0.65rem;
  border-radius: 10px;
  background: rgba(18, 22, 30, 0.66);
  box-shadow: none;
}

.curve-editor__detail-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.4rem;
}

.curve-editor__label {
  font-weight: 600;
  letter-spacing: 0.015em;
}

.curve-editor__sublabel {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.6);
}

.curve-editor__control-group {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.curve-editor__control-title {
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.curve-editor__control-group label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.78rem;
}

.curve-editor__control-group input[type='number'] {
  width: 64px;
  padding: 0.2rem 0.35rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(12, 16, 24, 0.8);
  color: inherit;
}

.curve-editor__control-group input[type='number']:focus-visible {
  border-color: color-mix(in srgb, var(--accent, #2d8cff) 65%, rgba(255, 255, 255, 0.6));
  outline: none;
  box-shadow: none;
}
</style>

