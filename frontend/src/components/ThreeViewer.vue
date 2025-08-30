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
      <li id="models-option" @click="openModelManager"><i class="fa-solid fa-list"></i> モデル一覧</li>
      <li id="clear-cache-option" @click="clearCache"><i class="fa-solid fa-trash"></i> キャッシュ削除</li>
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
    :models="models"
    v-model:directional-intensity="directionalIntensity"
    v-model:show-light-marker="showLightMarker"
    v-model:marker-color="lightMarkerColor"
  @toggle-model="toggleModelVisibility"
  @remove-model="removeModel"
/>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import SettingsSidebar from './SettingsSidebar.vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MMDLoader } from 'three/examples/jsm/loaders/MMDLoader.js'
import { MMDExporter } from 'three/examples/jsm/exporters/MMDExporter.js'
import { MMDAnimationHelper } from 'three/examples/jsm/animation/MMDAnimationHelper.js'
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js'
import { CCDIKSolver } from 'three/examples/jsm/animation/CCDIKSolver.js'
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
const models = ref([])
const ambientLight = ref(new THREE.AmbientLight(0x666666))
const directionalLight = ref(new THREE.DirectionalLight(0xffffff))
directionalLight.value.position.set(0, 0, 0)
directionalLight.value.target.position.set(1, 0, 0)
const lightMarkerColor = ref('#ff0000')
const LIGHT_MARKER_LENGTH = 0.2
const directionalLightHelper = new THREE.DirectionalLightHelper(
  directionalLight.value,
  LIGHT_MARKER_LENGTH,
  lightMarkerColor.value
)
directionalLightHelper.visible = false
const directionalIntensity = ref(directionalLight.value.intensity)
const showLightMarker = ref(false)
const currentMeshRef = ref(null)
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let ikTargets = []
let selectedIKBone = null
let dragPlane = null
let draggingIK = false
let draggingRot = false
const extraIKBoneNames = []
const extraIKChains = []
const startPointer = new THREE.Vector2()
const startEuler = new THREE.Euler()
const _q = new THREE.Quaternion()
const STORAGE_KEY = 'settingsSidebar'
function loadLightingSettings() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return
  try {
    const data = JSON.parse(saved)
    if (data.markerColor !== undefined)
      lightMarkerColor.value = data.markerColor
    if (data.showLightMarker !== undefined)
      showLightMarker.value = data.showLightMarker
    if (data.directionalIntensity !== undefined)
      directionalIntensity.value = data.directionalIntensity
    if (data.directional?.position) {
      const p = data.directional.position
      directionalLight.value.position.set(
        p.x ?? directionalLight.value.position.x,
        p.y ?? directionalLight.value.position.y,
        p.z ?? directionalLight.value.position.z
      )
    }
    if (data.directional?.target) {
      const t = data.directional.target
      directionalLight.value.target.position.set(
        t.x ?? directionalLight.value.target.position.x,
        t.y ?? directionalLight.value.target.position.y,
        t.z ?? directionalLight.value.target.position.z
      )
    }
  } catch (e) {
    console.error('Failed to load lighting settings:', e)
  }
}
watch(showLightMarker, v => {
  try {
    directionalLightHelper.visible = v
  } catch (e) {
    console.error('Failed to toggle light marker:', e)
  }
})
watch(lightMarkerColor, c => {
  try {
    if (directionalLightHelper) {
      directionalLightHelper.color = new THREE.Color(c)
      directionalLightHelper.update()
    }
  } catch (e) {
    console.error('Failed to set light marker color:', e)
  }
})
watch(
  () => [
    directionalLight.value.position.x,
    directionalLight.value.position.y,
    directionalLight.value.position.z,
    directionalLight.value.target.position.x,
    directionalLight.value.target.position.y,
    directionalLight.value.target.position.z
  ],
  () => {
    try {
      directionalLightHelper.update()
    } catch (e) {
      console.error('Failed to update light marker position:', e)
    }
  }
)
watch(directionalIntensity, i => {
  try {
    directionalLight.value.intensity = i
    directionalLightHelper.scale.setScalar(LIGHT_MARKER_LENGTH * i)
    directionalLightHelper.update()
  } catch (e) {
    console.error('Failed to update light marker intensity:', e)
  }
})

function isPhysicalBone(bone) {
  if (bone.userData && bone.userData.rigidBodyType !== undefined) return true
  const name = bone.name || ''
  return /(?:physics|rigid|rb_|col|collision|dummy)/i.test(name) || name.includes('ダミー')
}
// モデル切り替え時にIKマーカーを再生成
watch(currentMeshRef, mesh => {
  setupIKTargets(mesh)
})
function setupIKTargets(mesh) {
  ikTargets.forEach(t => scene.remove(t.marker))
  ikTargets = []
  selectedIKBone = null
  if (!mesh) return
  const bones = mesh.skeleton?.bones || []

  // Collect unique target bone indices from IK chains
  const iks = (mesh.geometry?.iks || []).concat(extraIKChains)
  const targetIndices = new Set()
  iks.forEach(ik => {
    if (typeof ik.target === 'number') targetIndices.add(ik.target)
  })

  // Add extra IK bones specified by name
  bones.forEach((bone, idx) => {
    if (extraIKBoneNames.includes(bone.name)) targetIndices.add(idx)
  })

  targetIndices.forEach(idx => {
    const bone = bones[idx]
    if (!bone) return
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 0.4),
      new THREE.MeshBasicMaterial({
        color: 0xff0000,
        depthTest: false,
        depthWrite: false,
        transparent: true
      })
    )
    marker.renderOrder = 999
    marker.visible = true
    scene.add(marker)
    ikTargets.push({ bone, marker })
  })

  updateIKMarkers()
}
function updateIKMarkers() {
  ikTargets.forEach(t => {
    t.bone.getWorldPosition(t.marker.position)
    t.bone.getWorldQuaternion(_q)
    t.marker.quaternion.copy(_q)
  })
}

function initIKSolver(mesh) {
  if (!mesh || !helper) return
  const base = mesh.geometry.iks || []
  const iks = base.concat(extraIKChains)
  const solver = new CCDIKSolver(mesh, iks)
  const obj = helper.objects.get(mesh)
  if (obj) {
    obj.ikSolver = solver
  }
  solver.update()
}
function onPointerDown(event) {
  if (event.button === 1) return
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(
    ikTargets.map(t => t.marker),
    false
  )
  if (intersects.length === 0) return
  const target = ikTargets.find(t => t.marker === intersects[0].object)
  if (!target) return
  selectedIKBone = target.bone
  if (event.button === 2) {
    draggingRot = true
    startPointer.set(event.clientX, event.clientY)
    startEuler.copy(selectedIKBone.rotation)
  } else {
    const bonePos = new THREE.Vector3()
    selectedIKBone.getWorldPosition(bonePos)
    const normal = bonePos.clone().sub(camera.position).normalize()
    dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, bonePos)
    draggingIK = true
  }
  controls.enabled = false
  renderer.domElement.addEventListener('pointermove', onPointerMove)
  renderer.domElement.addEventListener('pointerup', onPointerUp)
}
function onPointerMove(event) {
  const mesh = currentMeshRef.value
  if (draggingRot && selectedIKBone) {
    const dx = (event.clientX - startPointer.x) * 0.01
    const dy = (event.clientY - startPointer.y) * 0.01
    selectedIKBone.rotation.y = startEuler.y + dx
    selectedIKBone.rotation.x = startEuler.x + dy
    const solver = helper?.objects.get(mesh)?.ikSolver
    mesh?.updateMatrixWorld(true)
    solver?.update()
    mesh?.skeleton?.update()
    mesh?.updateMatrixWorld(true)
    updateIKMarkers()
    return
  }
  if (!draggingIK || !dragPlane || !selectedIKBone) return
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const point = new THREE.Vector3()
  if (raycaster.ray.intersectPlane(dragPlane, point)) {
    const local = selectedIKBone.parent.worldToLocal(point.clone())
    selectedIKBone.position.copy(local)
    const solver = helper?.objects.get(mesh)?.ikSolver
    mesh?.updateMatrixWorld(true)
    solver?.update()
    mesh?.skeleton?.update()
    mesh?.updateMatrixWorld(true)
    updateIKMarkers()
  }
}
function onPointerUp() {
  draggingIK = false
  draggingRot = false
  dragPlane = null
  controls.enabled = true
  renderer.domElement.removeEventListener('pointermove', onPointerMove)
  renderer.domElement.removeEventListener('pointerup', onPointerUp)
  const mesh = currentMeshRef.value
  const solver = helper?.objects.get(mesh)?.ikSolver
  mesh?.updateMatrixWorld(true)
  solver?.update()
  mesh?.skeleton?.update()
  mesh?.updateMatrixWorld(true)
  selectedIKBone = null
}
function initTransformControls() {
  if (!renderer || !camera) return
  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  renderer.domElement.addEventListener('contextmenu', preventContextMenu)
}
function disposeTransformControls() {
  ikTargets.forEach(t => (t.marker.visible = false))
  renderer?.domElement?.removeEventListener('pointerdown', onPointerDown)
  renderer?.domElement?.removeEventListener('pointermove', onPointerMove)
  renderer?.domElement?.removeEventListener('pointerup', onPointerUp)
  renderer?.domElement?.removeEventListener('contextmenu', preventContextMenu)
  dragPlane = null
  draggingIK = false
  draggingRot = false
  selectedIKBone = null
}
function preventContextMenu(e) {
  e.preventDefault()
}
const settingsSidebar = ref(null)

let scene, camera, renderer, effect, controls, helper, loader
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

const DB_NAME = 'mmd-viewer'
const DB_STORE = 'model'
let dbPromise
function getDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        req.result.createObjectStore(DB_STORE)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}
async function cacheFiles(files) {
  try {
    const list = await Promise.all(
      [...files].map(async f => ({
        name: f.name,
        path: f.webkitRelativePath || f.name,
        data: await f.arrayBuffer()
      }))
    )

    const db = await getDB()
    const tx = db.transaction(DB_STORE, 'readwrite')
    const store = tx.objectStore(DB_STORE)
    store.put(list, 'current')
    await new Promise((res, rej) => {
      tx.oncomplete = res
      tx.onerror = () => rej(tx.error)
    })
    console.log('Model cached')
  } catch (e) {
    console.error('Failed to cache model:', e)
  }
}
async function loadCachedFiles() {
  try {
    const db = await getDB()
    const tx = db.transaction(DB_STORE)
    const store = tx.objectStore(DB_STORE)
    const files = await new Promise((res, rej) => {
      const req = store.get('current')
      req.onsuccess = () => res(req.result)
      req.onerror = () => rej(req.error)
    })
    return files || null
  } catch (e) {
    console.error('Failed to load cached model:', e)
    return null
  }
}
async function deleteCachedFiles() {
  try {
    const db = await getDB()
    const tx = db.transaction(DB_STORE, 'readwrite')
    tx.objectStore(DB_STORE).delete('current')
    await new Promise((res, rej) => {
      tx.oncomplete = res
      tx.onerror = () => rej(tx.error)
    })
    console.log('Model cache cleared')
  } catch (e) {
    console.error('Failed to clear model cache:', e)
  }
}

async function restoreCachedModel() {
  const saved = await loadCachedFiles()
  if (!saved) return
  const files = saved.map(f => {
    const file = new File([f.data], f.name)
    if (f.path) Object.defineProperty(file, 'webkitRelativePath', { value: f.path })
    return file
  })
  await handleFiles(files)
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
  if (settingsSidebar.value) {
    if (!settingsSidebar.value.visibleSections.lighting) {
      settingsSidebar.value.visibleSections.lighting = true
    }
    settingsSidebar.value.expandedSections.lighting = true
  }
  menuOpen.value = false
}

function openMorphEditor() {
  if (settingsSidebar.value) {
    if (!settingsSidebar.value.visibleSections.morph) {
      settingsSidebar.value.visibleSections.morph = true
    }
    settingsSidebar.value.expandedSections.morph = true
  }
  menuOpen.value = false
}

function openModelManager() {
  if (settingsSidebar.value) {
    if (!settingsSidebar.value.visibleSections.models) {
      settingsSidebar.value.visibleSections.models = true
    }
    settingsSidebar.value.expandedSections.models = true
  }
  menuOpen.value = false
}

function toggleModelVisibility(index, visible) {
  const model = models.value[index]
  if (model) {
    model.visible = visible
    model.mesh.visible = visible
  }
}

function removeModel(index) {
  const model = models.value[index]
  if (model) {
    const mesh = model.mesh
    if (helper?.objects?.has(mesh)) {
      helper.remove(mesh)
    }
    try {
      scene.remove(mesh)
    } catch (e) {
      console.error('Failed to remove mesh from scene:', e)
      return
    }
    models.value.splice(index, 1)
    if (currentMeshRef.value === mesh) {
      currentMeshRef.value = models.value[0]?.mesh || null
      setupIKTargets(currentMeshRef.value)
    }
  }
}

async function clearCache() {
  console.log('Clear cache clicked')
  logToServer({ event: 'clear-cache' })
  await deleteCachedFiles()
  poses.value.forEach(p => URL.revokeObjectURL(p.url))
  poses.value = []
  selectedPose.value = null
  models.value.forEach(m => {
    const mesh = m.mesh
    if (helper?.objects?.has(mesh)) {
      helper.remove(mesh)
    }
    try {
      scene.remove(mesh)
    } catch (e) {
      console.error('Failed to remove mesh from scene:', e)
    }
  })
  models.value = []
  currentMeshRef.value = null
  setupIKTargets(currentMeshRef.value)
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

async function handleFiles(files) {
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

  // save files to IndexedDB for restoration
  await cacheFiles(Array.from(files))

  const poseFile = poseFiles[0]
  const posePath = poseFile && poseFile.url

  const names = Array.from(files).map(f => f.name)
  console.log('Selected files:', names)
  logToServer({ event: 'select', files: names })

  const modelPath = (modelFile.webkitRelativePath || modelFile.name)
    .replace(/^[^/]*\\\//, '')
    .replace(/\\/g, '/')

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
      helper.add(mesh, { physics: false })
      initIKSolver(mesh)
      models.value.push({ mesh, name: modelFile.name, visible: true })
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
  if (!selectedPose.value || !loader || !currentMeshRef.value) return
    loader.loadVPD(selectedPose.value.url, true, pose => {
      helper.pose(currentMeshRef.value, pose)
      console.log('Pose applied:', selectedPose.value.name)
      logToServer({ event: 'pose', file: selectedPose.value.name })
    })
  }

function exportPose() {
  if (!currentMeshRef.value) return
  const exporter = new MMDExporter()
  const result = exporter.parseVpd(currentMeshRef.value, 'pose', {})
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
  if (helper) {
    helper.update(delta)
  }
  updateIKMarkers()
  effect.render(scene, camera)
  directionalLightHelper.update()
}

onMounted(async () => {
  loadLightingSettings()
  window.addEventListener('error', e => {
    try {
      console.error('Unhandled error:', e.error || e.message)
    } catch (err) {
      console.error('Error handler failed:', err)
    }
  })
  window.addEventListener('unhandledrejection', e => {
    try {
      console.error('Unhandled rejection:', e.reason)
    } catch (err) {
      console.error('Unhandledrejection handler failed:', err)
    }
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
    controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY }
    controls.enabled = true

  scene.add(ambientLight.value)
  scene.add(directionalLight.value.target)
  scene.add(directionalLight.value)
  scene.add(directionalLightHelper)

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
  initTransformControls()
  helper = new MMDAnimationHelper()

  window.addEventListener('resize', onWindowResize)
  document.addEventListener('click', handleDocumentClick)

  console.log('API base URL:', API_BASE_URL)
  logToServer({ event: 'init' })

  await restoreCachedModel()

  animate()
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  disposeTransformControls()
})
</script>
