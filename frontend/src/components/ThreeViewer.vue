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
import { API_BASE_URL, STORAGE_KEY } from '../config.js'

const viewer = ref(null)
const fileInput = ref(null)
const menu = ref(null)
const menuOpen = ref(false)
const poses = ref([])
const selectedPose = ref(null)
const models = ref([])
let nextModelId = 1
const clock = new THREE.Clock()
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
const showIkMarkers = ref(true)
const planeMode = ref('view')
const currentMeshRef = ref(null)
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const IK_MARKER_PIXEL_SIZE = 16
let ikTargets = []
// 選択中のIKターゲット（effectorとターゲットボーンを保持）
const selectedIK = ref(null)
let dragPlane = null
const _dragPoint = new THREE.Vector3()
let isRotating = false
const rotationAxis = new THREE.Vector3()
const _quat = new THREE.Quaternion()
const extraIKBoneNames = []
const extraIKChains = []
let ikConfigLoaded = false
const ikConfigPromise = loadIKConfig()
let ikUpdateScheduled = false
// 物理演算の有効/無効を切り替えるためのフラグ
const enablePhysics = ref(true)
// スキニング関連のデバッグ用フラグ
const DEBUG_SKINNING = import.meta.env.VITE_DEBUG_SKINNING === 'true'
async function loadIKConfig() {
  try {
    const res = await fetch('/ik-config.json')
    if (!res.ok) throw new Error('Config not found')
    const data = await res.json()
    extraIKBoneNames.push(...(data.extraIKBoneNames || []))
    extraIKChains.push(...(data.extraIKChains || []))
  } catch (e) {
    console.warn('Failed to load IK config, applying defaults:', e)
    if (extraIKBoneNames.length === 0)
      extraIKBoneNames.push('左足ＩＫ', '右足ＩＫ')
  }
  ikConfigLoaded = true
}
function loadLightingSettings() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return
  try {
    const data = JSON.parse(saved)
    if (data.markerColor !== undefined)
      lightMarkerColor.value = data.markerColor
    if (data.showLightMarker !== undefined)
      showLightMarker.value = data.showLightMarker
    if (data.showIkMarkers !== undefined)
      showIkMarkers.value = data.showIkMarkers
    if (data.enablePhysics !== undefined)
      enablePhysics.value = data.enablePhysics
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

watch(showIkMarkers, v => {
  try {
    ikTargets.forEach(t => (t.marker.visible = v))
    updateIKMarkers()
  } catch (e) {
    console.error('Failed to toggle IK markers:', e)
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
  initIKSolver(mesh)
})
function getIKDefinitions(geometry, modelName = '') {
  console.log('getIKDefinitions geometry:', geometry)
  let iks =
    geometry?.userData?.MMD?.ik ||
    geometry?.userData?.MMD?.iks ||
    geometry?.userData?.mmd?.ik ||
    geometry?.userData?.mmd?.iks ||
    geometry?.ik ||
    geometry?.iks ||
    []
  if (!Array.isArray(iks) || iks.length === 0) {
    const ud = geometry?.userData
    if (ud) {
      const loaderGeom =
        ud.MMDLoader?.geometry ||
        ud.mmdLoader?.geometry ||
        ud.MMDLoader ||
        ud.mmdLoader
      if (loaderGeom?.userData) {
        iks =
          loaderGeom.userData?.MMD?.ik ||
          loaderGeom.userData?.MMD?.iks ||
          loaderGeom.userData?.mmd?.ik ||
          loaderGeom.userData?.mmd?.iks ||
          loaderGeom.userData?.ik ||
          loaderGeom.userData?.iks ||
          iks
      }
      if ((Array.isArray(ud.ik) || Array.isArray(ud.iks)) && iks.length === 0) {
        iks = ud.ik || ud.iks
      }
      if (iks.length === 0 && ud.metadata) {
        iks = ud.metadata.ik || ud.metadata.iks || iks
      }
    }
    if (!iks || iks.length === 0) {
      console.warn(
        `IK definitions not found for model ${modelName}`,
        geometry?.userData || geometry
      )
    } else {
      console.log(
        `IK definitions recovered for model ${modelName}`,
        iks
      )
    }
  }
  return (Array.isArray(iks) ? iks : []).concat(extraIKChains)
}
function setupIKTargets(mesh) {
  ikTargets.forEach(t => {
    scene.remove(t.marker)
    t.marker.material?.dispose()
  })
  ikTargets = []
  selectedIK.value = null
  if (!mesh) return
  const bones = mesh.skeleton?.bones || []

  const iks = getIKDefinitions(mesh.geometry, mesh.name)
  const targetMap = new Map()
  iks.forEach(ik => {
    if (typeof ik.effector === 'number') {
      const bone = bones[ik.effector]
      const target = bones[ik.target]
      if (bone && target && !isPhysicalBone(bone))
        targetMap.set(ik.effector, target)
    }
  })

  // Add extra IK bones specified by name
  bones.forEach((bone, idx) => {
    if (extraIKBoneNames.includes(bone.name) && !isPhysicalBone(bone))
      if (!targetMap.has(idx)) targetMap.set(idx, null)
  })

  // Group IK targets by bone name so that duplicates can be separated visually
  const nameGroups = new Map()
  targetMap.forEach((target, idx) => {
    const bone = bones[idx]
    if (!bone || isPhysicalBone(bone)) return
    const list = nameGroups.get(bone.name) || []
    list.push({ bone, target })
    nameGroups.set(bone.name, list)
  })

  // Calculate offsets independently for each bone name group
  nameGroups.forEach(entries => {
    const count = entries.length
    entries.forEach((entry, i) => {
      const marker = new THREE.Sprite(
        new THREE.SpriteMaterial({
          color: 0xff0000,
          opacity: 0.5,
          transparent: true,
          depthTest: false,
          depthWrite: false
        })
      )
      marker.renderOrder = 999
      marker.visible = showIkMarkers.value
      scene.add(marker)
      const offset = (i - (count - 1) / 2) * 0.02
      ikTargets.push({ bone: entry.bone, target: entry.target, marker, offset })
    })
  })

  updateIKMarkers()
}
function updateIKMarkers() {
  const visible = showIkMarkers.value
  const height = renderer.domElement.clientHeight
  const fov = THREE.MathUtils.degToRad(camera.fov)
  let maxScale = 0
  ikTargets.forEach(t => {
    t.bone.updateMatrixWorld(true)
    t.bone.getWorldPosition(t.marker.position)
    const dist = t.marker.position.distanceTo(camera.position)
    t.marker.position.x += t.offset || 0
    const scale =
      (2 * dist * Math.tan(fov / 2) * IK_MARKER_PIXEL_SIZE) / height
    t.marker.scale.set(scale, scale, scale)
    t.marker.visible = visible
    if (scale > maxScale) maxScale = scale
  })
  if (maxScale > 0) {
    const threshold = maxScale / 2
    raycaster.params.Sprite.threshold = threshold
    raycaster.params.Points.threshold = threshold
  }
}

function initIKSolver(mesh) {
  if (!mesh || !helper) return
  const skinnedMesh = mesh.isSkinnedMesh
    ? mesh
    : mesh.getObjectByProperty('type', 'SkinnedMesh')
  if (!skinnedMesh) {
    console.error('initIKSolver: SkinnedMesh not found for', mesh.name)
    return
  }
  const iks = getIKDefinitions(skinnedMesh.geometry, skinnedMesh.name)
  let obj = helper.objects.get(skinnedMesh)
  if (!obj) {
    skinnedMesh.geometry.userData.MMD =
      skinnedMesh.geometry.userData.MMD || {}
    skinnedMesh.geometry.userData.MMD.iks = iks
    helper.add(skinnedMesh, { physics: true, ik: true })
    obj = helper.objects.get(skinnedMesh)
  } else {
    obj.ikSolver = new CCDIKSolver(skinnedMesh, iks)
  }
  obj?.ikSolver?.update()
  skinnedMesh.skeleton?.update()
}
function onPointerDown(event) {
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(
    ikTargets.map(t => t.marker),
    false
  )
  if (intersects.length === 0) {
    selectedIK.value = null
    return
  }
  const target = ikTargets.find(t => t.marker === intersects[0].object)
  if (!target) return
  selectedIK.value = target
  if (event.button === 2) {
    event.preventDefault()
    isRotating = true
    selectedIK.value.bone.getWorldPosition(_dragPoint)
    rotationAxis.copy(_dragPoint).sub(camera.position).normalize()
    controls.enabled = false
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    return
  }
  if (event.button !== 0) return
  const pos = new THREE.Vector3()
  const boneOrTarget = selectedIK.value.target || selectedIK.value.bone
  boneOrTarget.getWorldPosition(pos)
  const normal = new THREE.Vector3()
  camera.getWorldDirection(normal)
  dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, pos)
  controls.enabled = false
  renderer.domElement.addEventListener('pointermove', onPointerMove)
  renderer.domElement.addEventListener('pointerup', onPointerUp)
}

function applyIKUpdate() {
  if (
    helper?.objects.get(currentMeshRef.value) === undefined &&
    currentMeshRef.value?.type !== 'SkinnedMesh'
  ) {
    currentMeshRef.value = currentMeshRef.value?.getObjectByProperty(
      'type',
      'SkinnedMesh'
    )
  }
  const mesh = currentMeshRef.value
  console.assert(
    mesh instanceof THREE.SkinnedMesh,
    'currentMeshRef should point to a SkinnedMesh',
    mesh
  )
  let obj = helper?.objects.get(mesh)
  if (mesh && (!obj || !obj.ikSolver)) {
    initIKSolver(mesh)
    obj = helper?.objects.get(mesh)
  }
  const solver = obj?.ikSolver
  const start = performance.now()
  solver?.update()
  if (enablePhysics.value) helper?.update(0)
  currentMeshRef.value?.skeleton?.bones?.forEach((b) =>
    b.updateMatrixWorld(true)
  )
  mesh?.skeleton?.update()
  mesh?.updateMatrixWorld(true)
  updateIKMarkers()
  console.debug(`applyIKUpdate: ${(performance.now() - start).toFixed(2)}ms`)
}

function scheduleIKUpdate() {
  if (ikUpdateScheduled) return
  ikUpdateScheduled = true
  requestAnimationFrame(() => {
    ikUpdateScheduled = false
    applyIKUpdate()
  })
}

function onPointerMove(event) {
  if (!selectedIK.value) return
  if (isRotating) {
    const angle = event.movementX * 0.01
    _quat.setFromAxisAngle(rotationAxis, angle)
    selectedIK.value.bone.quaternion.premultiply(_quat)
    selectedIK.value.bone.updateMatrixWorld(true)
    scheduleIKUpdate()
    return
  }
  if (!dragPlane) return
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  if (raycaster.ray.intersectPlane(dragPlane, _dragPoint)) {
    const target = selectedIK.value.target
    if (target) {
      target.parent.worldToLocal(_dragPoint)
      target.position.copy(_dragPoint)
      target.updateMatrixWorld(true)
      scheduleIKUpdate()
    }
  }
}

function onPointerUp() {
  renderer.domElement.removeEventListener('pointermove', onPointerMove)
  renderer.domElement.removeEventListener('pointerup', onPointerUp)
  controls.enabled = true
  if (isRotating) {
    isRotating = false
  }
  dragPlane = null
  applyIKUpdate()
  selectedIK.value = null
}
const settingsSidebar = ref(null)

let scene, camera, renderer, effect, controls, helper, loader

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
    const list = []
    for (const f of files) {
      list.push({
        name: f.name,
        path: f.webkitRelativePath || f.name,
        data: await f.arrayBuffer()
      })
    }

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
  e.target.value = ''
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

function openSidebarSection(section) {
  if (settingsSidebar.value) {
    const isVisible = settingsSidebar.value.visibleSections[section]
    if (isVisible) {
      settingsSidebar.value.visibleSections[section] = false
      settingsSidebar.value.expandedSections[section] = false
    } else {
      settingsSidebar.value.visibleSections[section] = true
      settingsSidebar.value.openSection(section)
    }
  }
  menuOpen.value = false
}

function toggleModelVisibility(index, visible) {
  const model = models.value[index]
  if (model) {
    model.visible = visible
    model.mesh.visible = visible
    if (model.skeletonHelper) {
      model.skeletonHelper.visible = visible && model.bonesVisible
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

async function removeModel(index) {
  const model = models.value[index]
  if (!model) return

  const { mesh, skeletonHelper } = model
  if (helper?.objects?.has(mesh)) helper.remove(mesh)

  effect?.clearCache?.()
  renderer?.renderLists?.dispose?.()

  try {
    mesh.traverse(child => {
      if (!child.isMesh) return
      if (child.geometry) child.geometry.dispose()
      const material = child.material
      if (Array.isArray(material)) {
        material.forEach(m => m?.dispose && m.dispose())
      } else if (material) {
        material.dispose()
      }
    })
    scene.remove(mesh)
    if (skeletonHelper) {
      scene.remove(skeletonHelper)
      skeletonHelper.geometry?.dispose?.()
      skeletonHelper.material?.dispose?.()
    }

    models.value.splice(index, 1)
    if (currentMeshRef.value === mesh) {
      ikTargets.forEach(t => {
        scene.remove(t.marker)
        t.marker.material?.dispose()
      })
      ikTargets = []
      currentMeshRef.value = models.value[0]?.mesh || null
      setupIKTargets(currentMeshRef.value)
    }
    if (models.value.length === 0) {
      await deleteCachedFiles()
    } else {
      const remainingFiles = models.value.flatMap(m => m.files || [])
      await cacheFiles(remainingFiles)
    }
  } catch (e) {
    console.error('Failed to remove model:', e)
  } finally {
    effect.render(scene, camera)
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
    const { mesh, skeletonHelper } = m
    if (helper?.objects?.has(mesh)) helper.remove(mesh)
    try {
      scene.remove(mesh)
      if (skeletonHelper) {
        scene.remove(skeletonHelper)
        skeletonHelper.geometry?.dispose?.()
        skeletonHelper.material?.dispose?.()
      }
    } catch (e) {
      console.error('Failed to remove mesh from scene:', e)
    }
  })
  models.value = []
  nextModelId = 1
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
  if (!modelFile) {
    for (const key in fileMap) URL.revokeObjectURL(fileMap[key])
    return
  }

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
      const skinnedMesh = mesh.isSkinnedMesh
        ? mesh
        : mesh.getObjectByProperty('type', 'SkinnedMesh')
      if (!skinnedMesh) {
        console.error('SkinnedMesh not found in model', modelFile.name)
        return
      }
      scene.add(skinnedMesh)
      initIKSolver(skinnedMesh)
      const skeletonHelper = new THREE.SkeletonHelper(skinnedMesh)
      skeletonHelper.visible = false
      scene.add(skeletonHelper)
      models.value.push({
        id: nextModelId++,
        mesh: skinnedMesh,
        name: modelFile.name,
        visible: true,
        skeletonHelper,
        bonesVisible: false,
        files: Array.from(files)
      })
      currentMeshRef.value = skinnedMesh
      setupIKTargets(skinnedMesh)
      if (!ikConfigLoaded) {
        ikConfigPromise.then(() => {
          if (currentMeshRef.value === skinnedMesh) {
            setupIKTargets(skinnedMesh)
            initIKSolver(skinnedMesh)
          }
        })
      }
      console.log('Model loaded:', modelFile.name)
      logToServer({ event: 'loaded', model: modelFile.name })
      if (poseFile) {
      loader.loadVPD(posePath, true, pose => {
        helper.pose(skinnedMesh, pose)
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
    const mesh = currentMeshRef.value
    helper.pose(mesh, pose)
    mesh.skeleton.update()
    mesh.updateMatrixWorld(true)
    updateIKMarkers()
    console.log('Pose applied:', selectedPose.value.name)
    logToServer({ event: 'pose', file: selectedPose.value.name })
  })
}

function exportPose() {
  const mesh = currentMeshRef.value
  if (!mesh) return
  const solver = helper?.objects.get(mesh)?.ikSolver
  selectedIK.value?.bone.updateMatrixWorld(true)
  solver?.update()
  mesh.skeleton.update()
  mesh.updateMatrixWorld(true)
  const exporter = new MMDExporter()
  const result = exporter.parseVpd(mesh, 'pose', {})
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
  helper?.update(delta)
  updateIKMarkers()
  effect.render(scene, camera)
  directionalLightHelper.update()
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
  loadLightingSettings()
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
  helper = new MMDAnimationHelper()
  renderer.domElement.addEventListener('pointerdown', onPointerDown)

  window.addEventListener('resize', onWindowResize)
  document.addEventListener('click', handleDocumentClick)

  console.log('API base URL:', API_BASE_URL)
  logToServer({ event: 'init' })

  await restoreCachedModel()

  animate()
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  window.removeEventListener('error', handleError)
  window.removeEventListener('unhandledrejection', handleUnhandledRejection)
  window.removeEventListener('resize', onWindowResize)
  renderer?.domElement?.removeEventListener('pointerdown', onPointerDown)
  renderer?.domElement?.removeEventListener('pointermove', onPointerMove)
  renderer?.domElement?.removeEventListener('pointerup', onPointerUp)
  ikTargets.forEach(t => (t.marker.visible = false))
  selectedIK.value = null
})
</script>
