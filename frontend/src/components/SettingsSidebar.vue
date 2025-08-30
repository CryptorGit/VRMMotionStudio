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
    <template v-for="section in sectionOrder" :key="section">
      <div v-if="visibleSections[section]" class="section">
        <h3 @click="toggleSection(section)">
            <i
              :class="
                expandedSections[section]
                  ? 'fa-solid fa-chevron-down'
                  : 'fa-solid fa-chevron-right'
              "
              class="toggle-icon"
            ></i>
            {{ sectionTitles[section] }}
            <span class="spacer"></span>
            <i
              v-if="section === 'morph'"
              class="fa-solid fa-rotate-right reload-icon"
              @click.stop="reloadMorphs"
            ></i>
            <i
              class="fa-solid fa-times close-icon"
              @click.stop="hideSection(section)"
            ></i>
          </h3>
          <div v-show="expandedSections[section]" class="section-content">
            <LightingPanel
              v-if="section === 'lighting' && ambient && directional"
              :ambient="ambient"
              :directional="directional"
              v-model:directional-intensity="directionalIntensity"
              v-model:show-light-marker="showLightMarker"
              v-model:marker-color="markerColor"
            />
            <MorphEditor
              v-else-if="section === 'morph'"
              :mesh="mesh"
              ref="morphEditorRef"
            />
            <div v-else-if="section === 'models'">
              <label>
                <input type="checkbox" v-model="showIkMarkers" /> IKボーン表示
              </label>
              <ModelList
                :models="models"
                @toggle="toggleModel"
                @toggle-bone="toggleBoneVisibility"
                @remove="removeModel"
              />
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watchEffect, computed, nextTick, toRefs } from 'vue'
import LightingPanel from './LightingPanel.vue'
import MorphEditor from './MorphEditor.vue'
import ModelList from './ModelList.vue'
import { STORAGE_KEY } from '../config.js'

const props = defineProps({
  ambient: Object,
  directional: Object,
  mesh: Object,
  models: { type: Array, required: true },
  showLightMarker: { type: Boolean, required: true },
  markerColor: { type: String, required: true },
  directionalIntensity: { type: Number, required: true },
  showIkMarkers: { type: Boolean, required: true }
})
const { ambient, directional, mesh, models } = toRefs(props)
const emit = defineEmits([
  'update:showLightMarker',
  'update:markerColor',
  'update:directionalIntensity',
  'update:showIkMarkers',
  'toggle-model',
  'toggle-bone',
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

const collapsed = ref(false)
const expandedSections = reactive({
  lighting: false,
  morph: false,
  models: false
})
const width = ref(300)
const isResizing = ref(false)
const headerRef = ref(null)
const headerHeight = ref(0)
const morphEditorRef = ref(null)

// セクションの表示状態
const visibleSections = reactive({
  lighting: false,
  morph: false,
  models: false
})

// 固定された表示順
const sectionOrder = ['lighting', 'morph', 'models']

const sectionTitles = {
  lighting: 'ライト設定',
  morph: 'モーフ編集',
  models: 'モデル管理'
}

// 状態を保存
function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      collapsed: collapsed.value,
      width: width.value,
      visibleSections: { ...visibleSections },
      expandedSections: { ...expandedSections },
      showLightMarker: showLightMarker.value,
      showIkMarkers: showIkMarkers.value,
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

// 初期化時に保存された状態を読み込む
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
        expandedSections: savedExpanded,
        showLightMarker: savedShowMarker,
        showIkMarkers: savedShowIk,
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
      if (savedExpanded) {
        expandedSections.lighting = savedExpanded.lighting ?? false
        expandedSections.morph = savedExpanded.morph ?? false
        expandedSections.models = savedExpanded.models ?? false
      }
      if (savedShowMarker !== undefined)
        emit('update:showLightMarker', savedShowMarker)
      if (savedShowIk !== undefined)
        emit('update:showIkMarkers', savedShowIk)
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

// 変更があれば状態を保存
watchEffect(() => {
  collapsed.value
  width.value
  visibleSections.lighting
  visibleSections.morph
  visibleSections.models
  expandedSections.lighting
  expandedSections.morph
  expandedSections.models
  showLightMarker.value
  showIkMarkers.value
  markerColor.value
  directionalIntensity.value
  directional.value.position.x
  directional.value.position.y
  directional.value.position.z
  directional.value.target.position.x
  directional.value.target.position.y
  directional.value.target.position.z

  scheduleSaveState()
})

function toggleSection(section) {
  expandedSections[section] = !expandedSections[section]
}

function openSection(section) {
  collapsed.value = false
  expandedSections[section] = true
}

function hideSection(section) {
  visibleSections[section] = false
  expandedSections[section] = false
}

function startResize(e) {
  e.preventDefault()
  const startX = e.clientX
  const startWidth = width.value
  isResizing.value = true
  document.body.style.userSelect = 'none'

  let frameId
  function onMouseMove(ev) {
    if (frameId) cancelAnimationFrame(frameId)
    frameId = requestAnimationFrame(() => {
      const delta = startX - ev.clientX
      width.value = Math.max(150, startWidth + delta)
    })
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    if (frameId) cancelAnimationFrame(frameId)
    document.body.style.userSelect = ''
    isResizing.value = false
    scheduleSaveState()
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function reloadMorphs() {
  morphEditorRef.value?.reloadMorphs?.()
}

function toggleModel(index, visible) {
  emit('toggle-model', index, visible)
}

function toggleBoneVisibility(index, visible) {
  emit('toggle-bone', index, visible)
}

function removeModel(index) {
  emit('remove-model', index)
}

const hasSections = computed(() =>
  sectionOrder.some(section => visibleSections[section])
)

const sidebarStyle = computed(() => {
  const style = { '--header-height': headerHeight.value + 'px' }
  if (!collapsed.value) {
    style.width = width.value + 'px'
  }
  return style
})

defineExpose({
  openSection,
  visibleSections,
  expandedSections,
  showLightMarker,
  showIkMarkers,
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: #eee;
}
.header button {
  background: none;
  border: none;
  cursor: pointer;
}
.resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  width: 5px;
  height: 100%;
  cursor: ew-resize;
  user-select: none;
}
.sections {
  max-height: calc(100vh - var(--header-height));
  overflow-y: auto;
}
.section h3 {
  margin: 0;
  padding: 0.5rem;
  background: #ddd;
  cursor: pointer;
  display: flex;
  align-items: center;
}
.section h3 .toggle-icon {
  margin-right: 0.5rem;
}
.section h3 .spacer {
  flex: 1;
}
.section h3 .reload-icon {
  margin-left: 0.5rem;
  cursor: pointer;
}
.section h3 .close-icon {
  margin-left: 0.5rem;
  cursor: pointer;
}
.section-content {
  padding: 0.5rem;
}
</style>
