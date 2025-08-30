<template>
  <div
    class="settings-sidebar"
    :class="{ collapsed, resizing: isResizing }"
    :style="collapsed ? {} : { width: width + 'px' }"
  >
    <div
      class="resize-handle"
      v-if="!collapsed"
      @mousedown="startResize"
    ></div>
    <div class="header">
      <span>設定</span>
      <button @click="collapsed = !collapsed">
        <i :class="collapsed ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-down'"></i>
      </button>
    </div>
    <div class="sections" v-if="!collapsed">
      <div class="section">
        <h3 @click="toggleSection('lighting')">
          <i :class="activeSection === 'lighting' ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right'" class="toggle-icon"></i>
          ライト設定
        </h3>
        <div v-show="activeSection === 'lighting'" class="section-content">
          <LightingPanel
            v-if="ambient && directional"
            :ambient="ambient"
            :directional="directional"
          />
        </div>
      </div>
      <div class="section">
        <h3 @click="toggleSection('morph')">
          <i :class="activeSection === 'morph' ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right'" class="toggle-icon"></i>
          モーフ編集
        </h3>
        <div v-show="activeSection === 'morph'" class="section-content">
          <MorphEditor :mesh="mesh" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import LightingPanel from './LightingPanel.vue'
import MorphEditor from './MorphEditor.vue'

const props = defineProps({
  ambient: Object,
  directional: Object,
  mesh: Object
})

const collapsed = ref(false)
const activeSection = ref(null)
const width = ref(300)
const isResizing = ref(false)

// ローカルストレージに状態を保持するキー
const STORAGE_KEY = 'settingsSidebar'

// 状態を保存
function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      collapsed: collapsed.value,
      activeSection: activeSection.value,
      width: width.value
    })
  )
}

// 初期化時に保存された状態を読み込む
onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const {
        collapsed: savedCollapsed,
        activeSection: savedSection,
        width: savedWidth
      } = JSON.parse(saved)
      collapsed.value = savedCollapsed ?? false
      activeSection.value = savedSection ?? null
      width.value = savedWidth ?? 300
    } catch (_) {
      // JSON パース失敗時は何もしない
    }
  }
})

// 変更があれば状態を保存
watch([collapsed, activeSection, width], saveState)

function toggleSection(section) {
  activeSection.value = activeSection.value === section ? null : section
}

function openSection(section) {
  collapsed.value = false
  activeSection.value = section
}

function startResize(e) {
  e.preventDefault()
  const startX = e.clientX
  const startWidth = width.value
  isResizing.value = true
  document.body.style.userSelect = 'none'

  function onMouseMove(ev) {
    const delta = startX - ev.clientX
    width.value = Math.max(150, startWidth + delta)
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    document.body.style.userSelect = ''
    isResizing.value = false
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

defineExpose({ openSection })
</script>

<style scoped>
.settings-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
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
  flex: 1;
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
.section-content {
  padding: 0.5rem;
}
</style>
