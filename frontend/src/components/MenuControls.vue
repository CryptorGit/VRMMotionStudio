<template>
  <div id="menu" ref="menuRef">
    <button id="menu-button" @click="toggleMenu"><i class="fa-solid fa-bars"></i></button>
    <ul id="menu-list" :class="{ hidden: !menuOpen }">
      <li id="import-option" @click="openFile"><i class="fa-solid fa-file-import"></i> {{ menuTexts.import }}</li>
      <li id="export-option" @click="exportPose"><i class="fa-solid fa-file-export"></i> {{ menuTexts.export }}</li>
      <li id="light-option" @click="openSidebarSection('lighting')"><i class="fa-solid fa-lightbulb"></i> {{ menuControlsTexts.lighting }}</li>
      <li id="display-option" @click="openSidebarSection('display')"><i class="fa-solid fa-eye"></i> {{ menuControlsTexts.display }}</li>
      <li id="physics-option" @click="openSidebarSection('physics')"><i class="fa-solid fa-atom"></i> {{ menuControlsTexts.physics }}</li>
      <li id="morph-option" @click="openSidebarSection('morph')"><i class="fa-solid fa-face-smile"></i> {{ tabsTexts.morph }}</li>
      <li id="models-option" @click="openSidebarSection('models')"><i class="fa-solid fa-list"></i> {{ menuControlsTexts.models }}</li>
      <li id="clear-cache-option" @click="clearCache"><i class="fa-solid fa-trash"></i> {{ menuTexts.clearCache }}</li>
  <li id="toggle-restore" @click="toggleAutoRestore"><i class="fa-solid fa-rotate"></i> {{ menuControlsTexts.autoRestore }}: {{ autoRestore ? commonTexts.on : commonTexts.off }}</li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from '../locales/index.js'

const props = defineProps({
  menuOpen: { type: Boolean, required: true },
  toggleMenu: { type: Function, required: true },
  openFile: { type: Function, required: true },
  exportPose: { type: Function, required: true },
  openSidebarSection: { type: Function, required: true },
  clearCache: { type: Function, required: true }
})

const menuRef = ref(null)
const autoRestore = ref(true)
const { t } = useI18n()
const menuTexts = computed(() => t.value?.menu ?? {})
const menuControlsTexts = computed(() => t.value?.menuControls ?? {})
const tabsTexts = computed(() => t.value?.tabs ?? {})
const commonTexts = computed(() => t.value?.common ?? {})

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

defineExpose({ menu: menuRef })
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
