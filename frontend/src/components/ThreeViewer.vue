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
  
  
  <input
    type="file"
    ref="fileInput"
    accept=".vrm"
    multiple
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
  @toggle-model="toggleModelVisibility"
  @toggle-bone="toggleBoneVisibility"
  @toggle-bone-names="toggleBoneNameVisibility"
  @toggle-all-bones="toggleAllBones"
  @toggle-all-bone-names="toggleAllBoneNames"
  @remove-model="removeModel"
/>
</template>

<script setup>
import { ref, shallowRef, onMounted, onUnmounted, watch } from 'vue'
import SettingsSidebar from './SettingsSidebar.vue'
import MenuControls from './MenuControls.vue'
import * as THREE from 'three'
import { API_BASE_URL } from '../config.js'
import {
  ambientLight,
  directionalLight,
  directionalLightHelper,
  lightMarkerColor,
  directionalIntensity,
  showLightMarker,
  loadLightingSettings
} from '../utils/lighting.js'
import { useMenu } from '../composables/useMenu.js'
import { useFileLoader } from '../composables/useFileLoader.js'
import { useRenderer } from '../composables/useRenderer.js'
import { useErrorHandlers } from '../composables/useErrorHandlers.js'

const viewer = ref(null)
const menu = ref(null)
const settingsSidebar = ref(null)
const currentMeshRef = ref(null)
// VRM runtime feature toggles
const springBoneEnabled = ref(true)
const lookAtEnabled = ref(true)
//

const scene = shallowRef(null)
const camera = shallowRef(null)
const renderer = shallowRef(null)
const controls = shallowRef(null)
const helper = shallowRef(null)
const transformControls = shallowRef(null)
// Display settings
const showPhysicalBones = ref(false)
const showOtherBones = ref(false)
const showExtendedBones = ref(false)
const showColliderNodes = ref(false)
const showNonDeformingBones = ref(false)
const highlightConstraint = ref(false)
const boneDotSize = ref(0.02)
const boneLabelScale = ref(1.0)

const clock = new THREE.Clock()
const TARGET_FPS = 30

async function logToServer(data) {
  const payload = { ts: Date.now(), ...data }
  // In dev, prefer Vite's terminal log endpoint so logs appear in FE terminal
  if (import.meta.env.DEV) {
    try {
      const r = await fetch('/__dev__/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (r.ok) return
    } catch {}
  }
  // Fallback to backend endpoint; if not available or 404, ignore silently
  try {
    const r2 = await fetch(`${API_BASE_URL}/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!r2.ok && import.meta.env.DEV) {
      // Ensure FE terminal receives logs if BE endpoint missing
      try { await fetch('/__dev__/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }) } catch {}
    }
  } catch {}
}

const { menuOpen, toggleMenu, openSidebarSection } = useMenu({
  settingsSidebar,
  logToServer
})

function onPointerDown() {}
function onControlStart() {}
function onControlEnd() {}

const fileLoader = useFileLoader({
  scene,
  camera,
  renderer,
  helper,
  currentMeshRef,
  menuOpen,
  logToServer,
  viewer,
  transformControls,
  controls,
  showPhysicalBones,
  showOtherBones,
  showExtendedBones,
  showColliderNodes,
  showNonDeformingBones,
  highlightConstraint,
  boneDotSize,
  boneLabelScale
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
  restoreCachedModel,
  applyBoneSettingsAll
} = fileLoader

const { animate, initRenderer, cleanupRenderer } = useRenderer({
  clock,
  targetFps: TARGET_FPS,
  helper,
  scene,
  camera,
  updateIKMarkers: () => {},
  directionalLightHelper,
  renderer,
  viewer,
  controls,
  ambientLight,
  directionalLight,
  onControlStart,
  onControlEnd,
  onPointerDown,
  vrmGetter: () => (models?.value || []).map(m => m.vrm).filter(Boolean)
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

const { setup: setupErrorHandlers, cleanup: cleanupErrorHandlers } = useErrorHandlers({
  handleError,
  handleUnhandledRejection
})

onMounted(async () => {
  loadLightingSettings({})
  setupErrorHandlers()
  const raw = localStorage.getItem('importedModels')
  initRenderer()
  // Always try restoring from cache; if saved UI state exists, pass it
  await restoreCachedModel(raw ? JSON.parse(raw) : undefined)
  // Apply initial toggles to restored VRMs
  try {
    const list = (models?.value || []).map(m => m.vrm).filter(Boolean)
    list.forEach(vrm => {
      try { vrm.springBoneManager?.setEnabled?.(springBoneEnabled.value) } catch {}
      try { vrm.springBoneManager && (vrm.springBoneManager.enabled = springBoneEnabled.value) } catch {}
      try { vrm.lookAt && (vrm.lookAt.enabled = lookAtEnabled.value) } catch {}
    })
  } catch {}
  document.addEventListener('click', handleDocumentClick)
  logToServer({ event: 'init' })
  animate(0)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  cleanupErrorHandlers()
  cleanupRenderer()
})

// Sync VRM feature toggles to loaded models
watch([springBoneEnabled, lookAtEnabled], ([s, l]) => {
  try {
    const list = (models?.value || []).map(m => m.vrm).filter(Boolean)
    list.forEach(vrm => {
      try { vrm.springBoneManager?.setEnabled?.(s) } catch {}
      try { vrm.springBoneManager && (vrm.springBoneManager.enabled = s) } catch {}
      try { vrm.lookAt && (vrm.lookAt.enabled = l) } catch {}
    })
  } catch {}
})

// Apply display settings to all models
watch([boneDotSize, boneLabelScale, showPhysicalBones, showOtherBones, showExtendedBones, showColliderNodes, showNonDeformingBones, highlightConstraint], () => {
  try { applyBoneSettingsAll?.() } catch {}
})

function toggleAllBones(v) {
  try {
    const len = models?.value?.length || 0
    for (let i = 0; i < len; i++) fileLoader.toggleBoneVisibility?.(i, v)
    applyBoneSettingsAll?.()
  } catch {}
}
function toggleAllBoneNames(v) {
  try {
    const len = models?.value?.length || 0
    for (let i = 0; i < len; i++) fileLoader.toggleBoneNameVisibility?.(i, v)
    applyBoneSettingsAll?.()
  } catch {}
}
</script>


<style scoped>
/* warning overlay removed */
</style>
