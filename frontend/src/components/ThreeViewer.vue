<template>
  <div
    id="viewer"
    ref="viewer"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  ></div>
  <MorphEditor
    v-if="morphOpen"
    :mesh="currentMeshRef"
    @close="morphOpen = false"
  />
  <div id="menu">
    <button id="menu-button" @click="toggleMenu"><i class="fa-solid fa-bars"></i></button>
    <ul id="menu-list" :class="{ hidden: !menuOpen }">
      <li id="import-option" @click="openFile"><i class="fa-solid fa-file-import"></i> インポート</li>
      <li id="export-option" @click="exportPose"><i class="fa-solid fa-file-export"></i> エクスポート</li>
      <li id="physics-option" @click="openPhysics"><i class="fa-solid fa-cog"></i> 物理設定</li>
      <li id="light-option" @click="openLighting"><i class="fa-solid fa-lightbulb"></i> ライト設定</li>
      <li id="morph-option" @click="openMorphEditor"><i class="fa-solid fa-face-smile"></i> モーフ編集</li>
      <li id="lighting-option" @click="openLightingSettings"><i class="fa-solid fa-lightbulb"></i> ライティング設定</li>
      <li id="physics-option" @click="openPhysicsSettings"><i class="fa-solid fa-atom"></i> 物理設定</li>
      <li id="bone-option" @click="openBoneManipulator"><i class="fa-solid fa-bone"></i> ボーン直接操作</li>
      <li id="pose-option" @click="openPoseManager"><i class="fa-solid fa-person-running"></i> ポーズ管理</li>
    </ul>
  </div>
  <div v-if="poses.length" id="pose-selector">
    <select v-model="selectedPose" @change="applyPose">
      <option disabled value="">ポーズを選択</option>
      <option v-for="p in poses" :key="p.name" :value="p">{{ p.name }}</option>
    </select>
  </div>
  <input
    type="file"
    ref="fileInput"
    accept=".pmx,.pmd,.vpd"
    multiple
    webkitdirectory
    style="display:none"
    @change="onFileChange"
  />
  <PhysicsPanel
    v-if="physicsPanelOpen"
    :helper="helper"
    @close="physicsPanelOpen = false"
  />
  <LightingPanel
    v-if="lightingPanelOpen"
    :ambient="ambientLight"
    :directional="directionalLight"
    @close="lightingPanelOpen = false"
  />
  <div v-if="activePanel" class="modal">
    <div class="modal-content">
      <h2>{{ panelTitles[activePanel] }}</h2>
      <button @click="closePanel">閉じる</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import LightingPanel from './LightingPanel.vue'
import MorphEditor from './MorphEditor.vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MMDLoader } from 'three/examples/jsm/loaders/MMDLoader.js'
import { MMDExporter } from 'three/examples/jsm/exporters/MMDExporter.js'
import { MMDAnimationHelper } from 'three/examples/jsm/animation/MMDAnimationHelper.js'
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js'
// Use Three.js-provided Ammo WASM wrapper which exposes global Ammo when awaited
import * as AmmoModule from 'three/examples/jsm/libs/ammo.wasm.js'
// Ensure Vite serves the WASM binary correctly
// three's ammo wrapper expects the .wasm file next to the js file.
// We import it as an asset URL and pass it via locateFile.
import ammoWasmUrl from 'three/examples/jsm/libs/ammo.wasm.wasm?url'
import { API_BASE_URL } from '../config.js'
import PhysicsPanel from './PhysicsPanel.vue'
import BoneManipulator from '../utils/BoneManipulator.js'

const viewer = ref(null)
const fileInput = ref(null)
const menuOpen = ref(false)
const poses = ref([])
const selectedPose = ref(null)
const physicsPanelOpen = ref(false)
const lightingPanelOpen = ref(false)
const ambientLight = ref(null)
const directionalLight = ref(null)
const morphOpen = ref(false)
const currentMeshRef = ref(null)
const activePanel = ref(null)
const boneMode = ref(false)

const panelTitles = {
  morph: 'モーフ編集',
  lighting: 'ライティング設定',
  physics: '物理設定',
  bone: 'ボーン直接操作',
  pose: 'ポーズ管理'
}

let scene, camera, renderer, effect, controls, helper, loader, currentMesh, boneManipulator
const clock = new THREE.Clock()

function logToServer(data) {
  if (import.meta.env.DEV) return
  fetch(`${API_BASE_URL}/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
    .then(response => {
      if (!response.ok) console.debug('log failed:', response.status)
    })
    .catch(err => console.debug('log error:', err))
}

function onFileChange(e) {
  handleFiles(e.target.files)
}

function toggleMenu() {
  console.log('Menu button clicked')
  logToServer({ event: 'menu' })
  menuOpen.value = !menuOpen.value
}

function openFile() {
  console.log('Import option clicked')
  logToServer({ event: 'import' })
  fileInput.value && fileInput.value.click()
  menuOpen.value = false
}

function openPhysics() {
  physicsPanelOpen.value = true
  menuOpen.value = false
}

function openLighting() {
  lightingPanelOpen.value = true
  menuOpen.value = false
}

function openMorphEditor() {
  morphOpen.value = true
  menuOpen.value = false
}

function openLightingSettings() {
  console.log('Lighting settings opened')
  activePanel.value = 'lighting'
  menuOpen.value = false
}

function openPhysicsSettings() {
  console.log('Physics settings opened')
  activePanel.value = 'physics'
  menuOpen.value = false
}

function openBoneManipulator() {
  if (!currentMesh) return
  boneMode.value = !boneMode.value
  if (boneMode.value) {
    if (!boneManipulator) {
      boneManipulator = new BoneManipulator(camera, renderer.domElement, scene)
    }
    boneManipulator.selectBone(currentMesh.skeleton.bones[0])
    boneManipulator.activate()
    activePanel.value = null
  } else if (boneManipulator) {
    boneManipulator.deactivate()
    boneManipulator = null
  }
  menuOpen.value = false
}

function openPoseManager() {
  console.log('Pose manager opened')
  activePanel.value = 'pose'
  menuOpen.value = false
}

function closePanel() {
  activePanel.value = null
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

function handleFiles(files) {
  poses.value.forEach(p => URL.revokeObjectURL(p.url))
  poses.value = []
  selectedPose.value = null

  const fileMap = {}
  let modelFile = null
  const poseFiles = []
  for (const file of files) {
    const path = file.webkitRelativePath || file.name
    const shortPath = path
      .replace(/^[^/]*\\\//, '')
      .replace(/\\/g, '/')
    const url = URL.createObjectURL(file)
    fileMap[shortPath] = url
    if (/\.(pmx|pmd)$/i.test(file.name)) modelFile = file
    if (/\.vpd$/i.test(file.name)) poseFiles.push({ name: file.name, url })
  }
  if (!modelFile) return

  poses.value = poseFiles

  const poseFile = poseFiles[0]
  const posePath = poseFile && poseFile.url

  const names = Array.from(files).map(f => f.name)
  console.log('Selected files:', names)
  logToServer({ event: 'select', files: names })

  const modelPath = (modelFile.webkitRelativePath || modelFile.name)
    .replace(/^[^/]*\\\//, '')
    .replace(/\\/g, '/')

  if (currentMesh) {
    helper.remove(currentMesh)
    scene.remove(currentMesh)
    currentMesh = null
    currentMeshRef.value = null
    if (boneManipulator) boneManipulator.detach()
  }

  const manager = new THREE.LoadingManager()
  manager.onLoad = () => {
    for (const key in fileMap) URL.revokeObjectURL(fileMap[key])
  }
  manager.setURLModifier(url => {
    const normalized = url.replace(/\\/g, '/').replace(/^\.\//, '')
    if (normalized === modelPath) return fileMap[modelPath]
    return fileMap[normalized] || url
  })
  manager.onError = url => {
    console.error('Resource load failed:', url)
    logToServer({ event: 'resource-error', url })
  }

  loader = new MMDLoader(manager)
  loader.load(
    modelPath,
    mesh => {
      scene.add(mesh)
      helper.add(mesh, { physics: true })
      currentMesh = mesh
      currentMeshRef.value = mesh
      console.log('Model loaded:', modelFile.name)
      logToServer({ event: 'loaded', model: modelFile.name })
      if (boneMode.value && boneManipulator) {
        boneManipulator.selectBone(currentMesh.skeleton.bones[0])
      }
      if (poseFile) {
        loader.loadVPD(posePath, true, pose => {
          helper.pose(mesh, pose)
          console.log('Pose applied:', poseFile.name)
          logToServer({ event: 'pose', file: poseFile.name })
        })
      }
    },
    undefined,
    error => {
      const status = error && error.target && error.target.status
      console.error('Load error:', status, error)
      logToServer({ event: 'error', message: error.message, status })
      for (const key in fileMap) URL.revokeObjectURL(fileMap[key])
    }
  )
}

function applyPose() {
  if (!selectedPose.value || !loader || !currentMesh) return
  loader.loadVPD(selectedPose.value.url, true, pose => {
    helper.pose(currentMesh, pose)
    console.log('Pose applied:', selectedPose.value.name)
    logToServer({ event: 'pose', file: selectedPose.value.name })
  })
}

function exportPose() {
  if (!currentMesh) return
  const exporter = new MMDExporter()
  const result = exporter.parseVpd(currentMesh, 'pose', {})
  const blob = new Blob([result], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'pose.vpd'
  a.click()
  URL.revokeObjectURL(url)
  console.log('Pose exported')
  logToServer({ event: 'export' })
  menuOpen.value = false
}

function onWindowResize() {
  const container = viewer.value
  camera.aspect = container.clientWidth / container.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.clientWidth, container.clientHeight)
}

function animate() {
  requestAnimationFrame(animate)
  const delta = clock.getDelta()
  if (helper) helper.update(delta)
  effect.render(scene, camera)
}

onMounted(async () => {
  window.addEventListener('error', e => {
    console.error('Unhandled error:', e.error || e.message)
  })
  window.addEventListener('unhandledrejection', e => {
    console.error('Unhandled rejection:', e.reason)
  })

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

  camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    1,
    2000
  )
  camera.position.set(0, 10, 30)

  controls = new OrbitControls(camera, renderer.domElement)

  const ambient = new THREE.AmbientLight(0x666666)
  scene.add(ambient)
  ambientLight.value = ambient

  const directional = new THREE.DirectionalLight(0xffffff)
  directional.position.set(1, 1, 1)
  scene.add(directional)
  directionalLight.value = directional

  const AmmoLib = await AmmoModule.default({
    // Ensure the WASM binary is loaded from the resolved asset URL
    locateFile: (file) => (file.endsWith('.wasm') ? ammoWasmUrl : file)
  })
  // Expose Ammo globally for three.js MMDAnimationHelper
  if (typeof window !== 'undefined') {
    window.Ammo = AmmoLib
  } else {
    globalThis.Ammo = AmmoLib
  }
  helper = new MMDAnimationHelper()

  window.addEventListener('resize', onWindowResize)

  console.log('API base URL:', API_BASE_URL)
  logToServer({ event: 'init' })

  animate()
})
</script>
