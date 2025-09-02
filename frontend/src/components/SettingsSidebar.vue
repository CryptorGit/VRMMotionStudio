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
    <SectionVisibility
      v-if="!collapsed && hasSections"
      :ambient="ambient"
      :directional="directional"
      :mesh="mesh"
      :models="models"
      :visible-sections="visibleSections"
      v-model:show-light-marker="showLightMarker"
      v-model:marker-color="markerColor"
      v-model:directional-intensity="directionalIntensity"
      v-model:show-ik-markers="showIkMarkers"
      v-model:enable-physics="enablePhysics"
      @toggle-model="toggleModel"
      @toggle-bone="toggleBone"
      @toggle-bone-names="toggleBoneNames"
      @remove-model="removeModel"
      @hide="hideSection"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick, toRefs } from 'vue'
import SectionVisibility from './SectionVisibility.vue'
import { useResizableSidebar } from '../composables/useResizableSidebar.js'
import { useSidebarState } from '../composables/useSidebarState.js'

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

function toggleModel(i, v) {
  emit('toggle-model', i, v)
}
function toggleBone(i, v) {
  emit('toggle-bone', i, v)
}
function toggleBoneNames(i, v) {
  emit('toggle-bone-names', i, v)
}
function removeModel(i) {
  emit('remove-model', i)
}

const { width, isResizing, startResize } = useResizableSidebar(300)
const {
  collapsed,
  visibleSections,
  hideSection,
  hasSections
} = useSidebarState({
  width,
  showLightMarker,
  showIkMarkers,
  enablePhysics,
  markerColor,
  directionalIntensity,
  directional
})

const headerRef = ref(null)
const headerHeight = ref(0)

onMounted(() => {
  nextTick(() => {
    headerHeight.value = headerRef.value?.offsetHeight ?? 0
  })
})

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
</style>
