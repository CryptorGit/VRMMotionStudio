<template>
  <div
    ref="container"
    :class="[
      'split-pane',
      direction === 'horizontal' ? 'is-horizontal' : 'is-vertical',
      { 'is-dragging': isDragging }
    ]"
  >
    <div
      class="split-pane__primary"
      :style="primaryStyle"
    >
      <slot name="primary" />
    </div>
    <div
      class="split-pane__divider"
      role="separator"
      :aria-orientation="direction === 'horizontal' ? 'vertical' : 'horizontal'"
      :aria-valuemin="computedMinRatio"
      :aria-valuemax="computedMaxRatio"
      :aria-valuenow="ratio"
      tabindex="0"
      @pointerdown="onPointerDown"
      @keydown="onDividerKeydown"
      @dblclick.prevent="resetRatio"
    >
      <span class="split-pane__grip" aria-hidden="true"></span>
    </div>
    <div
      class="split-pane__secondary"
      :style="secondaryStyle"
    >
      <slot name="secondary" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  direction: {
    type: String,
    default: 'horizontal',
    validator: value => ['horizontal', 'vertical'].includes(value)
  },
  initialPrimaryRatio: {
    type: Number,
    default: 0.7
  },
  storageKey: {
    type: String,
    default: ''
  },
  minPrimaryRatio: {
    type: Number,
    default: 0.2
  },
  maxPrimaryRatio: {
    type: Number,
    default: 0.85
  },
  primaryMinPixels: {
    type: Number,
    default: 200
  },
  secondaryMinPixels: {
    type: Number,
    default: 200
  }
})

const container = ref(null)
const ratio = ref(props.initialPrimaryRatio)
const isDragging = ref(false)
const startPointerPos = ref(0)
const startRatio = ref(ratio.value)
const sizePx = ref(0)
let resizeObserver = null
let resizeRaf = null
let activeDividerEl = null

const computedMinRatio = computed(() => Math.max(0, Math.min(1, props.minPrimaryRatio)))
const computedMaxRatio = computed(() => Math.max(computedMinRatio.value, Math.min(1, props.maxPrimaryRatio)))

function clampRatio(value) {
  const min = computedMinRatio.value
  const max = computedMaxRatio.value
  const clamped = Math.min(Math.max(value, min), max)
  if (!container.value) return clamped
  const { width, height } = container.value.getBoundingClientRect()
  const total = props.direction === 'horizontal' ? width : height
  if (total <= 0) return clamped
  const primarySize = total * clamped
  const secondarySize = total - primarySize
  if (primarySize < props.primaryMinPixels) {
    return Math.max(min, props.primaryMinPixels / total)
  }
  if (secondarySize < props.secondaryMinPixels) {
    return Math.min(max, 1 - props.secondaryMinPixels / total)
  }
  return clamped
}

function loadRatio() {
  if (!props.storageKey) return
  try {
    const saved = localStorage.getItem(props.storageKey)
    if (saved !== null) {
      const parsed = Number(saved)
      if (!Number.isNaN(parsed)) {
        ratio.value = clampRatio(parsed)
      }
    }
  } catch {}
}

function persistRatio() {
  if (!props.storageKey) return
  try {
    localStorage.setItem(props.storageKey, String(ratio.value))
  } catch {}
}

function updateSize() {
  if (!container.value) return
  const { width, height } = container.value.getBoundingClientRect()
  const nextSize = props.direction === 'horizontal' ? width : height
  if (Math.abs(nextSize - sizePx.value) < 0.5) return
  sizePx.value = nextSize
}

function onPointerDown(event) {
  if (event.button !== 0) return
  updateSize()
  startPointerPos.value = props.direction === 'horizontal' ? event.clientX : event.clientY
  startRatio.value = ratio.value
  isDragging.value = true
  activeDividerEl = event.currentTarget
  activeDividerEl?.setPointerCapture?.(event.pointerId)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onPointerMove(event) {
  if (!isDragging.value) return
  const current = props.direction === 'horizontal' ? event.clientX : event.clientY
  const deltaPx = current - startPointerPos.value
  if (sizePx.value <= 0) updateSize()
  if (sizePx.value <= 0) return
  const deltaRatio = deltaPx / sizePx.value
  const nextRatio = startRatio.value + deltaRatio
  ratio.value = clampRatio(nextRatio)
}

function onPointerUp(event) {
  if (!isDragging.value) return
  activeDividerEl?.releasePointerCapture?.(event.pointerId)
  activeDividerEl = null
  isDragging.value = false
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  persistRatio()
}

function resetRatio() {
  ratio.value = clampRatio(props.initialPrimaryRatio)
  persistRatio()
}

function onDividerKeydown(event) {
  const step = event.metaKey || event.ctrlKey ? 0.05 : 0.01
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    ratio.value = clampRatio(ratio.value - step)
    persistRatio()
    event.preventDefault()
  } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    ratio.value = clampRatio(ratio.value + step)
    persistRatio()
    event.preventDefault()
  } else if (event.key === 'Home') {
    ratio.value = clampRatio(props.minPrimaryRatio)
    persistRatio()
    event.preventDefault()
  } else if (event.key === 'End') {
    ratio.value = clampRatio(props.maxPrimaryRatio)
    persistRatio()
    event.preventDefault()
  } else if (event.key === 'Enter') {
    resetRatio()
    event.preventDefault()
  }
}

const primaryStyle = computed(() => {
  const percent = ratio.value * 100
  return props.direction === 'horizontal'
    ? { flexBasis: `${percent}%` }
    : { flexBasis: `${percent}%` }
})

const secondaryStyle = computed(() => {
  const percent = (1 - ratio.value) * 100
  return props.direction === 'horizontal'
    ? { flexBasis: `${percent}%` }
    : { flexBasis: `${percent}%` }
})

watch(() => props.initialPrimaryRatio, value => {
  if (!props.storageKey) {
    ratio.value = clampRatio(value)
  }
})

if (props.storageKey) {
  watch(ratio, () => persistRatio(), { flush: 'post' })
}

onMounted(() => {
  loadRatio()
  updateSize()
  resizeObserver = new ResizeObserver(() => {
    if (resizeRaf !== null) cancelAnimationFrame(resizeRaf)
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = null
      updateSize()
    })
  })
  if (container.value) resizeObserver.observe(container.value)
})

onUnmounted(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  resizeObserver?.disconnect()
  if (resizeRaf !== null) cancelAnimationFrame(resizeRaf)
  resizeObserver = null
})

defineExpose({
  resetRatio,
  ratio
})
</script>

<style scoped>
.split-pane {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  min-width: 0;
  position: relative;
}

.split-pane.is-horizontal {
  flex-direction: row;
}

.split-pane.is-vertical {
  flex-direction: column;
}

.split-pane__primary,
.split-pane__secondary {
  position: relative;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.split-pane__divider {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  flex: 0 0 auto;
  cursor: col-resize;
  touch-action: none;
  width: 6px;
  position: relative;
}

.split-pane.is-vertical .split-pane__divider {
  height: 6px;
  width: 100%;
  cursor: row-resize;
}

.split-pane__divider:focus-visible {
  outline: 2px solid var(--accent-focus, #2d8cff);
  outline-offset: 2px;
}

.split-pane__divider::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--divider-hover-bg, transparent);
  transition: background 120ms ease;
}

.split-pane__divider:hover::before,
.split-pane.is-dragging .split-pane__divider::before {
  background: color-mix(in srgb, var(--accent-weak, #2d8cff) 15%, transparent);
}

.split-pane__grip {
  width: 2px;
  height: 40px;
  border-radius: 999px;
  background: var(--divider-color, rgba(128, 138, 148, 0.5));
}

.split-pane.is-vertical .split-pane__grip {
  width: 40px;
  height: 2px;
}
</style>


