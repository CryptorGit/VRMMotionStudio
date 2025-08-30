<template>
  <div class="settings-sidebar" :class="{ collapsed }">
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
import { ref } from 'vue'
import LightingPanel from './LightingPanel.vue'
import MorphEditor from './MorphEditor.vue'

const props = defineProps({
  ambient: Object,
  directional: Object,
  mesh: Object
})

const collapsed = ref(false)
const activeSection = ref(null)

function toggleSection(section) {
  activeSection.value = activeSection.value === section ? null : section
}

function openSection(section) {
  collapsed.value = false
  activeSection.value = section
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
