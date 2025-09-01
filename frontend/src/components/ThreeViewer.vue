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
import { ref, onMounted, onUnmounted, watch } from 'vue'
import SettingsSidebar from './SettingsSidebar.vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MMDAnimationHelper } from 'three/examples/jsm/animation/MMDAnimationHelper.js'
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js'
// Use Three.js-provided Ammo WASM wrapper which exposes global Ammo when awaited
import * as AmmoModule from 'three/examples/jsm/libs/ammo.wasm.js'
// Ensure Vite serves the WASM binary correctly
// three's ammo wrapper expects the .wasm file next to the js file.
// We import it as an asset URL and pass it via locateFile.
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
import {
  showIkMarkers,
  ikWarning,
  selectedIK,
  ikTargets,
  ikConfigPromise,
  setupIKTargets,
  initIKSolver
} from '../utils/ik.js'
import { handleWindowResize } from '../utils/rendering.js'
import { useIkControls } from '../composables/useIkControls.js'
import { useModelLoader } from '../composables/useModelLoader.js'
import { useMenu } from '../composables/useMenu.js'
import { useRenderLoop } from '../composables/useRenderLoop.js'

const viewer = ref(null)
const fileInput = ref(null)
const settingsSidebar = ref(null)
const models = ref([])
const clock = new THREE.Clock()
const TARGET_FPS = 30
const planeMode = ref('view')
const currentMeshRef = ref(null)
let floorMesh = null
let floorRigidBody = null
let floorBodyAdded = false
let floorTransform = null
let floorShape = null
let floorMotionState = null
let floorRbInfo = null
let Ammo
// 物理演算の有効/無効を切り替えるためのフラグ
const enablePhysics = ref(true)
// スキニング関連のデバッグ用フラグ
const debugSkinning = import.meta.env.VITE_DEBUG_SKINNING === 'true'
const ikInitializedMeshes = new WeakSet()
let scene, camera, renderer, effect, controls, helper, loader
let ikControls
watch(showIkMarkers, () => {
  try {
    ikControls?.updateMarkers()
  } catch (e) {
    console.error('Failed to toggle IK markers:', e)
  }
})

watch(enablePhysics, v => {
  try {
    helper?.enable('physics', v)
    ensureFloorRigidBody()
  } catch (e) {
    console.error('Failed to toggle physics:', e)
  }
})

function ensureFloorRigidBody() {
  if (!enablePhysics.value || !helper?.physics?.world || !Ammo) {
    if (floorBodyAdded) {
      helper.physics.world.removeRigidBody(floorRigidBody)
      Ammo.destroy(floorRigidBody)
      Ammo.destroy(floorRbInfo)
      Ammo.destroy(floorMotionState)
      Ammo.destroy(floorShape)
      Ammo.destroy(floorTransform)
      floorRigidBody = null
      floorRbInfo = null
      floorMotionState = null
      floorShape = null
      floorTransform = null
      floorBodyAdded = false
    }
    return
  }
  if (floorBodyAdded) return
  const halfSize = 20
  const halfHeight = 0.5
  floorTransform = new Ammo.btTransform()
  floorTransform.setIdentity()
  const origin = new Ammo.btVector3(0, -halfHeight, 0)
  floorTransform.setOrigin(origin)
  Ammo.destroy(origin)
  const halfExtents = new Ammo.btVector3(halfSize, halfHeight, halfSize)
  floorShape = new Ammo.btBoxShape(halfExtents)
  Ammo.destroy(halfExtents)
  floorMotionState = new Ammo.btDefaultMotionState(floorTransform)
  const inertia = new Ammo.btVector3(0, 0, 0)
  floorRbInfo = new Ammo.btRigidBodyConstructionInfo(
    0,
    floorMotionState,
    floorShape,
    inertia
  )
  Ammo.destroy(inertia)
  floorRigidBody = new Ammo.btRigidBody(floorRbInfo)
  helper.physics.world.addRigidBody(floorRigidBody)
  floorBodyAdded = true
}

function isPhysicalBone(bone) {
  if (bone.userData && bone.userData.rigidBodyType !== undefined) return true
  const name = bone.name || ''
  const physicalBoneRegex = /\b(?:physics|rigid(?:body)?|col(?:lision)?\d*|dummy)\b|rb_/i
  return physicalBoneRegex.test(name) || name.includes('ダミー')
}
// モデル切り替え時にIKマーカーを再生成
watch(currentMeshRef, mesh => {
  setupIKTargets(scene, mesh)
  ikConfigPromise.then(() => {
    if (currentMeshRef.value === mesh) setupIKTargets(scene, mesh)
    if (mesh && !ikInitializedMeshes.has(mesh)) {
      initIKSolver(helper, mesh, ensureFloorRigidBody)
      ikInitializedMeshes.add(mesh)
    }
  })
})

function logToServer(data) {
  if (import.meta.env.DEV) return
  fetch(`${API_BASE_URL}/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).catch(() => {})
}
const { menu, menuOpen, toggleMenu, openSidebarSection, handleDocumentClick } = useMenu({ settingsSidebar, logToServer })
const {
  poses,
  selectedPose,
  openFile,
  onFileChange,
  applyPose,
  exportPose,
  handleFiles,
  restoreCachedModel,
  clearCache,
  removeModel
} = useModelLoader({
  fileInput,
  models,
  currentMeshRef,
  getScene: () => scene,
  getHelper: () => helper,
  getEffect: () => effect,
  getRenderer: () => renderer,
  getCamera: () => camera,
  logToServer,
  menuOpen,
  updateIKMarkers: () => ikControls?.updateMarkers(),
  debugSkinning
})

function toggleModelVisibility(index, visible) {
  const model = models.value[index]
  if (model) {
    model.visible = visible
    model.mesh.visible = visible
    if (model.skeletonHelper) {
      model.skeletonHelper.visible = visible && model.bonesVisible
    }
    if (model.boneNameHelpers) {
      model.boneNameHelpers.forEach(h => (h.visible = visible && model.boneNameVisible))
    }
  }
}

function toggleBoneVisibility(index, visible) {
  const model = models.value[index]
  if (model && model.skeletonHelper) {
    model.bonesVisible = visible
    model.skeletonHelper.visible = visible && model.visible
  }
}

function toggleBoneNameVisibility(index, visible) {
  const model = models.value[index]
  if (model && model.boneNameHelpers) {
    model.boneNameVisible = visible
    model.boneNameHelpers.forEach(h => (h.visible = visible && model.visible))
  }
}

function onDragOver() {
  viewer.value.classList.add('dragover')
}
function onDragLeave() {
  viewer.value.classList.remove('dragover')
}
function onDrop(e) {
  viewer.value.classList.remove('dragover')
  handleFiles(e.dataTransfer.files)
}

function onWindowResize() {
  handleWindowResize(camera, renderer, viewer.value)
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

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(container.clientWidth, container.clientHeight)
  container.appendChild(renderer.domElement)

  effect = new OutlineEffect(renderer)

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xeeeeee)

  const grid = new THREE.GridHelper(40, 40)
  scene.add(grid)
  floorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(40, 1, 40),
    new THREE.MeshBasicMaterial({ color: 0xcccccc })
  )
  floorMesh.position.set(0, -0.5, 0)
  floorMesh.visible = false
  scene.add(floorMesh)

  camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    1,
    2000
  )
  camera.position.set(0, 10, 30)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY }
  controls.enabled = true
  ikControls = useIkControls({ camera, renderer, controls, helper, enablePhysics, currentMeshRef })
  controls.addEventListener('start', ikControls.onControlStart)
  controls.addEventListener('end', ikControls.onControlEnd)

  scene.add(ambientLight.value)
  scene.add(directionalLight.value.target)
  scene.add(directionalLight.value)
  scene.add(directionalLightHelper)

  const AmmoLib = await AmmoModule.default({
    // Ensure the WASM binary is loaded from the resolved asset URL
    locateFile: (file) => (file.endsWith('.wasm') ? ammoWasmUrl : file)
  })
  Ammo = AmmoLib
  // Expose Ammo globally for three.js MMDAnimationHelper
  if (typeof window !== 'undefined') {
    window.Ammo = AmmoLib
  } else {
    globalThis.Ammo = AmmoLib
  }
  helper = new MMDAnimationHelper()
  helper.enable('physics', enablePhysics.value)
  helper.enabled.ik = false
  ensureFloorRigidBody()
  renderer.domElement.addEventListener('pointerdown', ikControls.onPointerDown)
  const { start } = useRenderLoop({
    clock,
    helper,
    effect,
    scene,
    camera,
    updateIKMarkers: () => ikControls.updateMarkers(),
    directionalLightHelper,
    targetFps: TARGET_FPS
  })

  window.addEventListener('resize', onWindowResize)
  document.addEventListener('click', handleDocumentClick)

  if (import.meta.env.DEV) console.log('API base URL:', API_BASE_URL)
  logToServer({ event: 'init' })

  await restoreCachedModel()
  ensureFloorRigidBody()

  start()
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  window.removeEventListener('error', handleError)
  window.removeEventListener('unhandledrejection', handleUnhandledRejection)
  window.removeEventListener('resize', onWindowResize)
  renderer?.domElement?.removeEventListener('pointerdown', ikControls?.onPointerDown)
  renderer?.domElement?.removeEventListener('pointermove', ikControls?.onPointerMove)
  renderer?.domElement?.removeEventListener('pointerup', ikControls?.onPointerUp)
  renderer?.domElement?.removeEventListener('pointercancel', ikControls?.onPointerUp)
  renderer?.domElement?.removeEventListener('pointerleave', ikControls?.onPointerUp)
  controls?.removeEventListener('start', ikControls?.onControlStart)
  controls?.removeEventListener('end', ikControls?.onControlEnd)
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
