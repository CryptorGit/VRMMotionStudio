<template>
  <div
    id="viewer"
    ref="viewer"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  ></div>
  <div id="menu">
    <button id="menu-button" @click="toggleMenu"><i class="fa-solid fa-bars"></i></button>
    <ul id="menu-list" :class="{ hidden: !menuOpen }">
      <li id="import-option" @click="openFile"><i class="fa-solid fa-file-import"></i> インポート</li>
    </ul>
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
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MMDLoader } from 'three/examples/jsm/loaders/MMDLoader.js'
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
const menuOpen = ref(false)

let scene, camera, renderer, effect, controls, helper
const clock = new THREE.Clock()

function logToServer(data) {
  fetch(`${API_BASE_URL}/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).catch(err => console.error('log error:', err))
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
  const fileMap = {}
  let modelFile = null
  let poseFile = null
  for (const file of files) {
    const path = file.webkitRelativePath || file.name
    const shortPath = path.replace(/^[^/]*\\\//, '')
    fileMap[shortPath] = URL.createObjectURL(file)
    if (/\.(pmx|pmd)$/i.test(file.name)) modelFile = file
    if (/\.vpd$/i.test(file.name)) poseFile = file
  }
  if (!modelFile) return

  const names = Array.from(files).map(f => f.name)
  console.log('Selected files:', names)
  logToServer({ event: 'select', files: names })

  const manager = new THREE.LoadingManager()
  manager.setURLModifier(url => {
    const normalized = url.replace(/^\.\//, '')
    return fileMap[normalized] || url
  })
  manager.onError = url => {
    console.error('Resource load failed:', url)
    logToServer({ event: 'resource-error', url })
  }

  const loader = new MMDLoader(manager)
  const modelPath = (modelFile.webkitRelativePath || modelFile.name).replace(/^[^/]*\\\//, '')
  const url = fileMap[modelPath]
  loader.load(
    url,
    mesh => {
      scene.add(mesh)
      helper.add(mesh, { physics: true })
      console.log('Model loaded:', modelFile.name)
      logToServer({ event: 'loaded', model: modelFile.name })

      if (poseFile) {
        const posePath = (poseFile.webkitRelativePath || poseFile.name).replace(/^[^/]*\\\//, '')
        const poseUrl = fileMap[posePath]
        loader.loadVPD(poseUrl, true, pose => {
          helper.pose(mesh, pose)
          console.log('Pose applied:', poseFile.name)
          logToServer({ event: 'pose', file: poseFile.name })
        })
      }

      for (const key in fileMap) URL.revokeObjectURL(fileMap[key])
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

  const directional = new THREE.DirectionalLight(0xffffff)
  directional.position.set(1, 1, 1)
  scene.add(directional)

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
