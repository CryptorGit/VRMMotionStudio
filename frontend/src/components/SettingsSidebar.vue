<template>
  <div
    class="settings-sidebar"
    :class="{ collapsed, resizing: isResizing }"
    :style="sidebarStyle"
  >
    <div
      class="resize-handle"
      v-if="!collapsed"
      @mousedown="startResize"
    ></div>
    <div class="header" ref="headerRef">
      <span>設定</span>
      <button @click="collapsed = !collapsed">
        <i :class="collapsed ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-down'"></i>
      </button>
    </div>
    <div class="sections" v-if="!collapsed && hasSections">
      <LightingSection
        v-if="visibleSections.lighting"
        :ambient="ambient"
        :directional="directional"
        v-model:directional-intensity="directionalIntensity"
        v-model:show-light-marker="showLightMarker"
        v-model:marker-color="markerColor"
        @hide="hideSection('lighting')"
      />
      <MorphSection
        v-if="visibleSections.morph"
        :mesh="mesh"
        @hide="hideSection('morph')"
      />
      <ModelSection
        v-if="visibleSections.models"
        :models="models"
        v-model:show-ik-markers="showIkMarkers"
        v-model:enable-physics="enablePhysics"
        @toggle-model="toggleModel"
        @toggle-bone="toggleBoneVisibility"
        @toggle-bone-names="toggleBoneNameVisibility"
        @remove-model="removeModel"
        @hide="hideSection('models')"
      />
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  reactive,
  onMounted,
  watchEffect,
  computed,
  nextTick,
  toRefs
} from 'vue'
import LightingSection from './LightingSection.vue'
import MorphSection from './MorphSection.vue'
import ModelSection from './ModelSection.vue'
import { STORAGE_KEY } from '../config.js'
import { useResizableSidebar } from '../composables/useResizableSidebar.js'

const props = defineProps({
  ambient: Object,
  directional: Object,
  mesh: Object,
  models: { type: Array, required: true },
  showLightMarker: { type: Boolean, required: true },
  markerColor: { type: String, required: true },
  directionalIntensity: { type: Number, required: true },
  showIkMarkers: { type: Boolean, required: true },
  enablePhysics: { type: Boolean, required: true }
})
const { ambient, directional, mesh, models } = toRefs(props)
const emit = defineEmits([
  'update:showLightMarker',
  'update:markerColor',
  'update:directionalIntensity',
  'update:showIkMarkers',
  'update:enablePhysics',
  'toggle-model',
  'toggle-bone',
  'toggle-bone-names',
  'remove-model'
])
const showLightMarker = computed({
  get: () => props.showLightMarker,
  set: v => emit('update:showLightMarker', v)
})
const markerColor = computed({
  get: () => props.markerColor,
  set: v => emit('update:markerColor', v)
})
const directionalIntensity = computed({
  get: () => props.directionalIntensity,
  set: v => emit('update:directionalIntensity', v)
})
const showIkMarkers = computed({
  get: () => props.showIkMarkers,
  set: v => emit('update:showIkMarkers', v)
})
const enablePhysics = computed({
  get: () => props.enablePhysics,
  set: v => emit('update:enablePhysics', v)
})

const collapsed = ref(false)
const { width, isResizing, startResize } = useResizableSidebar(300)
const headerRef = ref(null)
const headerHeight = ref(0)

const visibleSections = reactive({
  lighting: false,
  morph: false,
  models: false
})

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      collapsed: collapsed.value,
      width: width.value,
      visibleSections: { ...visibleSections },
      showLightMarker: showLightMarker.value,
      showIkMarkers: showIkMarkers.value,
      enablePhysics: enablePhysics.value,
      markerColor: markerColor.value,
      directionalIntensity: directionalIntensity.value,
      directional: {
        position: {
          x: directional.value.position.x,
          y: directional.value.position.y,
          z: directional.value.position.z
        },
        target: {
          x: directional.value.target.position.x,
          y: directional.value.target.position.y,
          z: directional.value.target.position.z
        }
      }
    })
  )
}

let saveStateTimeout
function scheduleSaveState() {
  clearTimeout(saveStateTimeout)
  saveStateTimeout = setTimeout(saveState, 200)
}

onMounted(() => {
  nextTick(() => {
    headerHeight.value = headerRef.value?.offsetHeight ?? 0
  })
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const {
        collapsed: savedCollapsed,
        width: savedWidth,
        visibleSections: savedVisible,
        showLightMarker: savedShowMarker,
        showIkMarkers: savedShowIk,
        enablePhysics: savedEnablePhysics,
        markerColor: savedMarkerColor,
        directionalIntensity: savedDirectionalIntensity,
        directional: savedDirectional
      } = JSON.parse(saved)
      collapsed.value = savedCollapsed ?? false
      width.value = savedWidth ?? 300
      if (savedVisible) {
        visibleSections.lighting = savedVisible.lighting ?? false
        visibleSections.morph = savedVisible.morph ?? false
        visibleSections.models = savedVisible.models ?? false
      }
      if (savedShowMarker !== undefined)
        emit('update:showLightMarker', savedShowMarker)
      if (savedShowIk !== undefined)
        emit('update:showIkMarkers', savedShowIk)
      if (savedEnablePhysics !== undefined)
        emit('update:enablePhysics', savedEnablePhysics)
      if (savedMarkerColor !== undefined)
        emit('update:markerColor', savedMarkerColor)
      if (savedDirectionalIntensity !== undefined)
        emit('update:directionalIntensity', savedDirectionalIntensity)
      if (savedDirectional?.position) {
        const p = savedDirectional.position
        directional.value.position.set(
          p.x ?? directional.value.position.x,
          p.y ?? directional.value.position.y,
          p.z ?? directional.value.position.z
        )
      }
      if (savedDirectional?.target) {
        const t = savedDirectional.target
        directional.value.target.position.set(
          t.x ?? directional.value.target.position.x,
          t.y ?? directional.value.target.position.y,
          t.z ?? directional.value.target.position.z
        )
      }
    } catch (_) {
      // JSON パース失敗時は何もしない
    }
  }
})

watchEffect(() => {
  collapsed.value
  width.value
  showLightMarker.value
  showIkMarkers.value
  enablePhysics.value
  markerColor.value
  directionalIntensity.value
  JSON.stringify(visibleSections)
  directional.value.position.x
  directional.value.position.y
  directional.value.position.z
  directional.value.target.position.x
  directional.value.target.position.y
  directional.value.target.position.z
  scheduleSaveState()
})

function hideSection(section) {
  visibleSections[section] = false
}

function toggleModel(index, visible) {
  emit('toggle-model', index, visible)
}

function toggleBoneVisibility(index, visible) {
  emit('toggle-bone', index, visible)
}
function toggleBoneNameVisibility(index, visible) {
  emit('toggle-bone-names', index, visible)
}

function removeModel(index) {
  emit('remove-model', index)
}

const hasSections = computed(() =>
  Object.values(visibleSections).some(Boolean)
)

const sidebarStyle = computed(() => {
  const style = { '--header-height': headerHeight.value + 'px' }
  if (!collapsed.value) {
    style.width = width.value + 'px'
  }
  return style
})

defineExpose({
  visibleSections,
  showLightMarker,
  showIkMarkers,
  enablePhysics,
  markerColor
})
</script>

<style scoped>
.settings-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  height: auto;
  max-height: 100vh;
  width: 300px;
  background: #f9f9f9;
  box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
}
.settings-sidebar.resizing {
  user-select: none;
}
.settings-sidebar.collapsed {
  width: 40px;
}
.settings-sidebar.collapsed .sections {
  display: none;
}
.settings-sidebar.collapsed .header span {
  display: none;
}
.header {
  padding: 0.5rem;
  background: #ccc;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  cursor: ew-resize;
  background: transparent;
}
.sections {
  max-height: calc(100vh - var(--header-height));
  overflow-y: auto;
}
</style>
