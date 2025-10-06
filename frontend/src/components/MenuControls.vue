<template>
  <div id="menu" ref="menu">
    <button id="menu-button" @click="toggleMenu"><i class="fa-solid fa-bars"></i></button>
    <ul id="menu-list" :class="{ hidden: !menuOpen }">
      <li id="import-option" @click="openFile"><i class="fa-solid fa-file-import"></i> インポート</li>
      <li id="export-option" @click="exportPose"><i class="fa-solid fa-file-export"></i> エクスポート</li>
      <li id="light-option" @click="openSidebarSection('lighting')"><i class="fa-solid fa-lightbulb"></i> 照明設定</li>
      <li id="display-option" @click="openSidebarSection('display')"><i class="fa-solid fa-eye"></i> 表示管理</li>
      <li id="physics-option" @click="openSidebarSection('physics')"><i class="fa-solid fa-atom"></i> 物理設定</li>
      <li id="morph-option" @click="openSidebarSection('morph')"><i class="fa-solid fa-face-smile"></i> モーフ</li>
      <li id="models-option" @click="openSidebarSection('models')"><i class="fa-solid fa-list"></i> モデル管理</li>
      <li id="clear-cache-option" @click="clearCache"><i class="fa-solid fa-trash"></i> キャッシュ削除</li>
  <li id="toggle-restore" @click="toggleAutoRestore"><i class="fa-solid fa-rotate"></i> モデル自動復元: {{ autoRestore ? 'ON' : 'OFF' }}</li>
    </ul>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  menuOpen: { type: Boolean, required: true },
  toggleMenu: { type: Function, required: true },
  openFile: { type: Function, required: true },
  exportPose: { type: Function, required: true },
  openSidebarSection: { type: Function, required: true },
  clearCache: { type: Function, required: true }
})

const menu = ref(null)
const autoRestore = ref(true)

function loadAutoRestore() {
  try {
    const v = localStorage.getItem('autoRestore')
    // default ON when key missing; store '0' to disable
    autoRestore.value = v !== '0'
  } catch {
    autoRestore.value = true
  }
}

function toggleAutoRestore() {
  autoRestore.value = !autoRestore.value
  try {
    if (autoRestore.value) {
      // Remove or set to non-'0' to enable default ON
      localStorage.removeItem('autoRestore')
    } else {
      localStorage.setItem('autoRestore', '0')
    }
  } catch {}
}

defineExpose({ menu })
  loadAutoRestore()
</script>

<style scoped>
#menu { position: fixed; top: 10px; left: 10px; z-index: 1000; }
#menu-button { padding: 6px 10px; }
#menu-list { list-style: none; padding: 6px; margin: 6px 0 0; background: #fff; border: 1px solid #ccc; }
#menu-list.hidden { display: none; }
#menu-list li { cursor: pointer; padding: 4px 8px; }
#menu-list li:hover { background: #f0f0f0; }
</style>
