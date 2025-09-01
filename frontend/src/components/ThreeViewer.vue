<template>
  <div
    id="viewer"
    ref="viewer"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  ></div>
  <div id="menu" ref="menu">
    <button id="menu-button" @click="toggleMenu"><i class="fa-solid fa-bars"></i></button>
    <ul id="menu-list" :class="{ hidden: !menuOpen }">
      <li id="import-option" @click="openFile"><i class="fa-solid fa-file-import"></i> インポート</li>
      <li id="export-option" @click="exportPose"><i class="fa-solid fa-file-export"></i> エクスポート</li>
      <li id="light-option" @click="openSidebarSection('lighting')"><i class="fa-solid fa-lightbulb"></i> ライト設定</li>
      <li id="morph-option" @click="openSidebarSection('morph')"><i class="fa-solid fa-face-smile"></i> モーフ編集</li>
      <li id="models-option" @click="openSidebarSection('models')"><i class="fa-solid fa-list"></i> モデル一覧</li>
      <li id="clear-cache-option" @click="clearCache"><i class="fa-solid fa-trash"></i> キャッシュ削除</li>
    </ul>
  </div>
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
import { ref, shallowRef, markRaw, onMounted, onUnmounted } from 'vue'
import SettingsSidebar from './SettingsSidebar.vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MMDAnimationHelper } from 'three/examples/jsm/animation/MMDAnimationHelper.js'
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js'
// Use Three.js-provided Ammo WASM wrapper which exposes global Ammo when awaited
import * as AmmoModule from 'three/examples/jsm/libs/ammo.wasm.js'
// Ensure Vite serves the WASM binary correctly
import ammoWasmUrl from 'three/examples/jsm/libs/ammo.wasm.wasm?url'
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
import { showIkMarkers, ikWarning, ikConfigPromise, ikTargets, selectedIK } from '../utils/ik.js'
import { useIkControls } from '../composables/useIkControls.js'
import { useModelLoader } from '../composables/useModelLoader.js'
import { useMenu } from '../composables/useMenu.js'
import { useRenderLoop } from '../composables/useRenderLoop.js'

const viewer = ref(null)
const fileInput = ref(null)
const menu = ref(null)
const settingsSidebar = ref(null)
const currentMeshRef = ref(null)
const enablePhysics = ref(true)

const scene = shallowRef(null)
const camera = shallowRef(null)
const renderer = shallowRef(null)
const effect = shallowRef(null)
const controls = shallowRef(null)
const helper = shallowRef(null)

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

const { menuOpen, toggleMenu, openFile, openSidebarSection } = useMenu({
  fileInput,
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
  onPointerMove,
  onPointerUp,
  onControlStart,
  onControlEnd,
  ensureFloorRigidBody,
  updateIKMarkersBound,
  setAmmo,
  initUpdateIKMarkers
} = ikControls

const modelLoader = useModelLoader({
  scene,
  camera,
  renderer,
  effect,
  helper,
  currentMeshRef,
  menuOpen,
  logToServer,
  updateIKMarkersBound,
  viewer
})
const {
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
  onDragOver,
  onDragLeave,
  onDrop,
  restoreCachedModel
} = modelLoader

const { animate, onWindowResize } = useRenderLoop({
  clock,
  targetFps: TARGET_FPS,
  helper,
  effect,
  scene,
  camera,
  updateIKMarkers: () => updateIKMarkersBound.value?.(),
  directionalLightHelper,
  renderer,
  viewer
})

function handleDocumentClick(e) {
  if (menuOpen.value && menu.value && !menu.value.contains(e.target)) {
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

onMounted(async () => {
  loadLightingSettings({ showIkMarkers, enablePhysics })
  await ikConfigPromise
  window.addEventListener('error', handleError)
  window.addEventListener('unhandledrejection', handleUnhandledRejection)

  const container = viewer.value

  renderer.value = markRaw(new THREE.WebGLRenderer({ antialias: true }))
  renderer.value.setPixelRatio(window.devicePixelRatio)
  renderer.value.setSize(container.clientWidth, container.clientHeight)
  container.appendChild(renderer.value.domElement)

  effect.value = markRaw(new OutlineEffect(renderer.value))

  scene.value = markRaw(new THREE.Scene())
  scene.value.background = new THREE.Color(0xeeeeee)

  const grid = new THREE.GridHelper(40, 40)
  scene.value.add(grid)

  const floorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(40, 1, 40),
    new THREE.MeshBasicMaterial({ color: 0xcccccc })
  )
  floorMesh.position.set(0, -0.5, 0)
  floorMesh.visible = false
  scene.value.add(floorMesh)

  camera.value = markRaw(new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    1,
    2000
  ))
  camera.value.position.set(0, 10, 30)

  controls.value = markRaw(new OrbitControls(camera.value, renderer.value.domElement))
  controls.value.mouseButtons = {
    LEFT: THREE.MOUSE.PAN,
    RIGHT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY
  }
  controls.value.enabled = true
  controls.value.addEventListener('start', onControlStart)
  controls.value.addEventListener('end', onControlEnd)

  scene.value.add(ambientLight.value)
  scene.value.add(directionalLight.value.target)
  scene.value.add(directionalLight.value)
  scene.value.add(directionalLightHelper)

  const AmmoLib = await AmmoModule.default({
    locateFile: file => (file.endsWith('.wasm') ? ammoWasmUrl : file)
  })
  setAmmo(AmmoLib)
  if (typeof window !== 'undefined') {
    window.Ammo = AmmoLib
  } else {
    globalThis.Ammo = AmmoLib
  }
  helper.value = markRaw(new MMDAnimationHelper())
  helper.value.enable('physics', enablePhysics.value)
  helper.value.enabled.ik = false
  ensureFloorRigidBody()
  renderer.value.domElement.addEventListener('pointerdown', onPointerDown)

  initUpdateIKMarkers()

  window.addEventListener('resize', onWindowResize)
  document.addEventListener('click', handleDocumentClick)

  logToServer({ event: 'init' })

  await restoreCachedModel()
  ensureFloorRigidBody()

  animate(0)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  window.removeEventListener('error', handleError)
  window.removeEventListener('unhandledrejection', handleUnhandledRejection)
  window.removeEventListener('resize', onWindowResize)
  renderer.value?.domElement?.removeEventListener('pointerdown', onPointerDown)
  renderer.value?.domElement?.removeEventListener('pointermove', onPointerMove)
  renderer.value?.domElement?.removeEventListener('pointerup', onPointerUp)
  renderer.value?.domElement?.removeEventListener('pointercancel', onPointerUp)
  renderer.value?.domElement?.removeEventListener('pointerleave', onPointerUp)
  controls.value?.removeEventListener('start', onControlStart)
  controls.value?.removeEventListener('end', onControlEnd)
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
