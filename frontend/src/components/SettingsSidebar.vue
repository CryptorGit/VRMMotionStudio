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
              v-model:show-light-marker="showLightMarker"
            />
            <MorphEditor v-else-if="section === 'morph'" :mesh="mesh" />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed, nextTick } from 'vue'
import LightingPanel from './LightingPanel.vue'
import MorphEditor from './MorphEditor.vue'

const props = defineProps({
  ambient: Object,
  directional: Object,
  mesh: Object,
  showLightMarker: { type: Boolean, required: true }
})
const { ambient, directional, mesh } = props
const emit = defineEmits(['update:showLightMarker'])
const showLightMarker = computed({
  get: () => props.showLightMarker,
  set: v => emit('update:showLightMarker', v)
})

const collapsed = ref(false)
const expandedSections = reactive({
  lighting: false,
  morph: false
})
const width = ref(300)
const isResizing = ref(false)
const headerRef = ref(null)
const headerHeight = ref(0)

// セクションの表示状態
const visibleSections = reactive({
  lighting: false,
  morph: false
})

// 固定された表示順
const sectionOrder = ['lighting', 'morph']

const sectionTitles = {
  lighting: 'ライト設定',
  morph: 'モーフ編集'
}

// ローカルストレージに状態を保持するキー
const STORAGE_KEY = 'settingsSidebar'

// 状態を保存
function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      collapsed: collapsed.value,
      width: width.value,
      visibleSections: { ...visibleSections },
      expandedSections: { ...expandedSections }
    })
  )
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
        expandedSections: savedExpanded
      } = JSON.parse(saved)
      collapsed.value = savedCollapsed ?? false
      width.value = savedWidth ?? 300
      if (savedVisible) {
        visibleSections.lighting = savedVisible.lighting ?? false
        visibleSections.morph = savedVisible.morph ?? false
      }
      if (savedExpanded) {
        expandedSections.lighting = savedExpanded.lighting ?? false
        expandedSections.morph = savedExpanded.morph ?? false
      }
    } catch (_) {
      // JSON パース失敗時は何もしない
    }
  }
})

// 変更があれば状態を保存
watch(collapsed, saveState)
watch(visibleSections, saveState, { deep: true })
watch(expandedSections, saveState, { deep: true })

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
    saveState()
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
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

defineExpose({ openSection, visibleSections, expandedSections, showLightMarker })
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
.section h3 .close-icon {
  margin-left: auto;
  cursor: pointer;
}
.section-content {
  padding: 0.5rem;
}
</style>
