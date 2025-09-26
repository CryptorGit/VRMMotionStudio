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
      v-model:spring-bone-enabled="springBoneEnabled"
      v-model:look-at-enabled="lookAtEnabled"
      v-model:show-extended-bones="showExtendedBones"
      v-model:show-collider-nodes="showColliderNodes"
      v-model:show-non-deforming-bones="showNonDeformingBones"
      v-model:highlight-constraint="highlightConstraint"
      v-model:show-physical-bones="showPhysicalBones"
      v-model:show-other-bones="showOtherBones"
      v-model:bone-dot-size="boneDotSize"
      v-model:bone-label-scale="boneLabelScale"
  v-model:virtual-trackers-enabled="virtualTrackersEnabled"
  v-model:show-virtual-tracker-labels="showVirtualTrackerLabels"
  v-model:virtual-tracker-size="virtualTrackerSize"
  v-model:virtual-tracker-label-scale="virtualTrackerLabelScale"
  @reset-virtual-trackers="$emit('reset-virtual-trackers')"
      @toggle-model="toggleModel"
      @toggle-bone="toggleBone"
      @toggle-bone-names="toggleBoneNames"
      @toggle-all-bones="toggleAllBones"
      @toggle-all-bone-names="toggleAllBoneNames"
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
  springBoneEnabled: { type: Boolean, required: true },
  lookAtEnabled: { type: Boolean, required: true },
  showExtendedBones: { type: Boolean, required: true },
  showColliderNodes: { type: Boolean, required: true },
  showNonDeformingBones: { type: Boolean, required: true },
  highlightConstraint: { type: Boolean, required: true },
  showPhysicalBones: { type: Boolean, required: true },
  showOtherBones: { type: Boolean, required: true },
  boneDotSize: { type: Number, required: true },
  boneLabelScale: { type: Number, required: true }
  , virtualTrackersEnabled: { type: Boolean, default: false }
  , showVirtualTrackerLabels: { type: Boolean, default: true }
  , virtualTrackerSize: { type: Number, default: 0.08 }
  , virtualTrackerLabelScale: { type: Number, default: 1.0 }
})
const { ambient, directional, mesh, models } = toRefs(props)
const emit = defineEmits([
  'update:showLightMarker',
  'update:markerColor',
  'update:directionalIntensity',
  'update:springBoneEnabled',
  'update:lookAtEnabled',
  'update:showExtendedBones',
  'update:showColliderNodes',
  'update:showNonDeformingBones',
  'update:highlightConstraint',
  'update:showPhysicalBones',
  'update:showOtherBones',
  'update:boneDotSize',
  'update:boneLabelScale',
  'update:virtualTrackersEnabled',
  'update:showVirtualTrackerLabels',
  'update:virtualTrackerSize',
  'update:virtualTrackerLabelScale',
  'toggle-model',
  'toggle-bone',
  'toggle-bone-names',
  'toggle-all-bones',
  'toggle-all-bone-names',
  'remove-model',
  'reset-virtual-trackers'
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
const springBoneEnabled = computed({
  get: () => props.springBoneEnabled,
  set: v => emit('update:springBoneEnabled', v)
})
const lookAtEnabled = computed({
  get: () => props.lookAtEnabled,
  set: v => emit('update:lookAtEnabled', v)
})
const showPhysicalBones = computed({
  get: () => props.showPhysicalBones,
  set: v => emit('update:showPhysicalBones', v)
})
const showOtherBones = computed({
  get: () => props.showOtherBones,
  set: v => emit('update:showOtherBones', v)
})
const showExtendedBones = computed({
  get: () => props.showExtendedBones,
  set: v => emit('update:showExtendedBones', v)
})
const showColliderNodes = computed({
  get: () => props.showColliderNodes,
  set: v => emit('update:showColliderNodes', v)
})
const showNonDeformingBones = computed({
  get: () => props.showNonDeformingBones,
  set: v => emit('update:showNonDeformingBones', v)
})
const highlightConstraint = computed({
  get: () => props.highlightConstraint,
  set: v => emit('update:highlightConstraint', v)
})
const boneDotSize = computed({
  get: () => props.boneDotSize,
  set: v => emit('update:boneDotSize', v)
})
const boneLabelScale = computed({
  get: () => props.boneLabelScale,
  set: v => emit('update:boneLabelScale', v)
})
const virtualTrackersEnabled = computed({
  get: () => props.virtualTrackersEnabled,
  set: v => emit('update:virtualTrackersEnabled', v)
})
const showVirtualTrackerLabels = computed({
  get: () => props.showVirtualTrackerLabels,
  set: v => emit('update:showVirtualTrackerLabels', v)
})
const virtualTrackerSize = computed({
  get: () => props.virtualTrackerSize,
  set: v => emit('update:virtualTrackerSize', v)
})
const virtualTrackerLabelScale = computed({
  get: () => props.virtualTrackerLabelScale,
  set: v => emit('update:virtualTrackerLabelScale', v)
})
// IK/SpringBone UI は VRM最適化のため削除

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

function toggleAllBones(v) {
  emit('toggle-all-bones', v)
}
function toggleAllBoneNames(v) {
  emit('toggle-all-bone-names', v)
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
  springBoneEnabled,
  lookAtEnabled,
  showExtendedBones,
  showColliderNodes,
  showNonDeformingBones,
  highlightConstraint,
  showPhysicalBones,
  showOtherBones,
  boneDotSize,
  boneLabelScale,
  markerColor,
  directionalIntensity,
  directional,
  // Persist virtual tracker UI settings as well
  virtualTrackersEnabled,
  showVirtualTrackerLabels,
  virtualTrackerSize,
  virtualTrackerLabelScale
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
  springBoneEnabled,
  lookAtEnabled,
  markerColor,
  showPhysicalBones,
  showOtherBones,
  boneDotSize,
  boneLabelScale,
  virtualTrackersEnabled,
  showVirtualTrackerLabels,
  virtualTrackerSize,
  virtualTrackerLabelScale
})
</script>

<style scoped>
.settings-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  bottom: var(--timeline-height, 0px);
  width: 300px;
  background: #f9f9f9;
  box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
  max-height: calc(100vh - var(--timeline-height, 0px));
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
.header button {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  outline: none;
  display: flex;
  align-items: center;
  justify-content: center;
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
