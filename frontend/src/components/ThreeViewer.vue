<template>
  <div
    id="viewer"
    ref="viewer"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  ></div>
  <MenuControls
    ref="menu"
    :menu-open="menuOpen"
    :toggle-menu="toggleMenu"
    :open-file="openFile"
    :export-pose="exportPose"
    :open-sidebar-section="openSidebarSection"
    :clear-cache="clearCache"
  />
  <div v-if="poses.length" id="pose-selector">
    <select v-model="selectedPose" @change="applyPose">
      <option disabled value="">ポーズを選択</option>
      <option v-for="p in poses" :key="p.name" :value="p">{{ p.name }}</option>
    </select>
  </div>
  <div v-if="ikWarning" id="ik-warning">{{ ikWarning }}</div>
  <input
    type="file"
    ref="fileInput"
    accept=".pmx,.pmd,.vpd"
    multiple
    webkitdirectory
    style="display:none"
    @change="onFileChange"
  />
  <SettingsSidebar
    ref="settingsSidebar"
    :ambient="ambientLight"
    :directional="directionalLight"
    :mesh="currentMeshRef"
    :models="models"
    v-model:directional-intensity="directionalIntensity"
    v-model:show-light-marker="showLightMarker"
    v-model:marker-color="lightMarkerColor"
    v-model:showIkMarkers="showIkMarkers"
    v-model:enable-physics="enablePhysics"
  @toggle-model="toggleModelVisibility"
  @toggle-bone="toggleBoneVisibility"
  @toggle-bone-names="toggleBoneNameVisibility"
  @remove-model="removeModel"
/>
</template>

<script setup>
import { ref, shallowRef, onMounted, onUnmounted } from 'vue'
import SettingsSidebar from './SettingsSidebar.vue'
import MenuControls from './MenuControls.vue'
import * as THREE from 'three'
import { API_BASE_URL } from '../config.js'
import {
  ambientLight,
  directionalLight,
  directionalLightHelper,
  lightMarkerColor,
  LIGHT_MARKER_LENGTH,
  directionalIntensity,
  showLightMarker,
  loadLightingSettings
} from '../utils/lighting.js'
import {
  showIkMarkers,
  ikWarning,
  ikConfigPromise,
  ikTargets,
  selectedIK
} from '../utils/ik.js'
import useIkControls from '../composables/useIkControls.js'
import { useMenu } from '../composables/useMenu.js'
import { useFileLoader } from '../composables/useFileLoader.js'
import { useRenderer } from '../composables/useRenderer.js'
import { useAmmoInit } from '../composables/useAmmoInit.js'
import { useErrorHandlers } from '../composables/useErrorHandlers.js'

const viewer = ref(null)
const menu = ref(null)
const settingsSidebar = ref(null)
const currentMeshRef = ref(null)
const enablePhysics = ref(true)
const ammo = shallowRef(null)

const scene = shallowRef(null)
const camera = shallowRef(null)
const renderer = shallowRef(null)
const effect = shallowRef(null)
const controls = shallowRef(null)
const helper = shallowRef(null)
const transformControls = shallowRef(null)

const clock = new THREE.Clock()
const TARGET_FPS = 30

function logToServer(data) {
  if (import.meta.env.DEV) return
  fetch(`${API_BASE_URL}/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).catch(() => {})
}

const { menuOpen, toggleMenu, openSidebarSection } = useMenu({
  settingsSidebar,
  logToServer
})

const ikControls = useIkControls({
  scene,
  camera,
  renderer,
  controls,
  helper,
  currentMeshRef,
  enablePhysics
})
const {
  onPointerDown,
  onControlStart,
  onControlEnd,
  ensureFloorRigidBody,
  updateIKMarkersBound,
  setAmmo,
  initUpdateIKMarkers,
  applyIKUpdate
} = ikControls

const fileLoader = useFileLoader({
  scene,
  camera,
  renderer,
  effect,
  helper,
  currentMeshRef,
  menuOpen,
  logToServer,
  updateIKMarkersBound,
  viewer,
  transformControls,
  applyIKUpdate
})
const {
  fileInput,
  poses,
  selectedPose,
  models,
  onFileChange,
  toggleModelVisibility,
  toggleBoneVisibility,
  toggleBoneNameVisibility,
  removeModel,
  clearCache,
  applyPose,
  exportPose,
  openFile,
  onDragOver,
  onDragLeave,
  onDrop,
  restoreCachedModel
} = fileLoader

const { animate, initRenderer, cleanupRenderer } = useRenderer({
  clock,
  targetFps: TARGET_FPS,
  helper,
  effect,
  scene,
  camera,
  updateIKMarkers: () => updateIKMarkersBound.value?.(),
  directionalLightHelper,
  renderer,
  viewer,
  controls,
  ambientLight,
  directionalLight,
  onControlStart,
  onControlEnd,
  onPointerDown
})

function handleDocumentClick(e) {
  if (menuOpen.value && menu.value?.menu && !menu.value.menu.contains(e.target)) {
    menuOpen.value = false
  }
}

function handleError(e) {
  try {
    console.error('Unhandled error:', e.error || e.message)
  } catch (err) {
    console.error('Error handler failed:', err)
  }
}

function handleUnhandledRejection(e) {
  try {
    console.error('Unhandled rejection:', e.reason)
  } catch (err) {
    console.error('Unhandledrejection handler failed:', err)
  }
}

const { init: initAmmo, cleanup: cleanupAmmo } = useAmmoInit({
  helper,
  enablePhysics,
  setAmmo,
  ensureFloorRigidBody
})

const { setup: setupErrorHandlers, cleanup: cleanupErrorHandlers } = useErrorHandlers({
  handleError,
  handleUnhandledRejection
})

onMounted(async () => {
  loadLightingSettings({ showIkMarkers, enablePhysics })
  await ikConfigPromise
  setupErrorHandlers()
  const raw = localStorage.getItem('importedModels')
  initRenderer()
  ammo.value = await initAmmo()
  if (raw) {
    await restoreCachedModel(JSON.parse(raw))
  }
  initUpdateIKMarkers()
  document.addEventListener('click', handleDocumentClick)
  logToServer({ event: 'init' })
  ensureFloorRigidBody()
  animate(0)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  cleanupErrorHandlers()
  cleanupAmmo()
  cleanupRenderer()
  ikTargets.forEach(t => (t.marker.visible = false))
  selectedIK.value = null
  enablePhysics.value = false
  ensureFloorRigidBody()
})
</script>


<style scoped>
#ik-warning {
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  z-index: 1000;
}
</style>
