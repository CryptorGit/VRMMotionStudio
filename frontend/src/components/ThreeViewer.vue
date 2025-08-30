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
      <li id="light-option" @click="openLighting"><i class="fa-solid fa-lightbulb"></i> ライト設定</li>
      <li id="morph-option" @click="openMorphEditor"><i class="fa-solid fa-face-smile"></i> モーフ編集</li>
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
  <SettingsSidebar
    ref="settingsSidebar"
    :ambient="ambientLight"
    :directional="directionalLight"
    :mesh="currentMeshRef"
  />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import SettingsSidebar from './SettingsSidebar.vue'
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

const viewer = ref(null)
const fileInput = ref(null)
const menu = ref(null)
const menuOpen = ref(false)
const poses = ref([])
const selectedPose = ref(null)
const ambientLight = ref(new THREE.AmbientLight(0x666666))
const directionalLight = ref(new THREE.DirectionalLight(0xffffff))
directionalLight.value.position.set(1, 1, 1)
const currentMeshRef = ref(null)
const settingsSidebar = ref(null)

let scene, camera, renderer, effect, controls, helper, loader, currentMesh
const clock = new THREE.Clock()

function handleDocumentClick(e) {
  if (menuOpen.value && menu.value && !menu.value.contains(e.target)) {
    menuOpen.value = false
  }
}

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

function openLighting() {
  settingsSidebar.value && settingsSidebar.value.openSection('lighting')
  menuOpen.value = false
}

function openMorphEditor() {
  settingsSidebar.value && settingsSidebar.value.openSection('morph')
  menuOpen.value = false
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

  scene.add(ambientLight.value)
  scene.add(directionalLight.value)

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
  document.addEventListener('click', handleDocumentClick)

  console.log('API base URL:', API_BASE_URL)
  logToServer({ event: 'init' })

  animate()
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>
