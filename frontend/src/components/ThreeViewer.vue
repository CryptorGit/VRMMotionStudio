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
  updateIKMarkers,
  initIKSolver
} from '../utils/ik.js'
import { createAnimator, handleWindowResize } from '../utils/rendering.js'
import {
  adjustAxis,
  applyMmdRotationOrder,
  applyLocalAxisRotation
} from '../utils/bones.js'

const viewer = ref(null)
const fileInput = ref(null)
const menu = ref(null)
const menuOpen = ref(false)
const poses = ref([])
const selectedPose = ref(null)
const models = ref([])
let nextModelId = 1
const clock = new THREE.Clock()
const TARGET_FPS = 30
const planeMode = ref('view')
const currentMeshRef = ref(null)
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
// IKターゲットは外部モジュールで管理
let dragPlane = null
const _dragPoint = new THREE.Vector3()
let isRotating = false
const _quat = new THREE.Quaternion()
let physicsWasEnabled = false
let ikUpdateScheduled = false
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
let updateIKMarkersBound = null
const ikInitializedMeshes = new WeakSet()
watch(showIkMarkers, () => {
  try {
    updateIKMarkersBound?.()
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
  physicsWasEnabled = enablePhysics.value
  if (physicsWasEnabled) {
    helper?.enable('physics', false)
    helper?.update(0)
  }
  if (event.button === 2) {
    event.preventDefault()
    isRotating = true
    controls.enabled = false
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('pointercancel', onPointerUp)
    renderer.domElement.addEventListener('pointerleave', onPointerUp)
    return
  }
  if (event.button !== 0) return
  const pos = new THREE.Vector3()
  const targetBone = selectedIK.value.target
  targetBone.getWorldPosition(pos)
  const normal = new THREE.Vector3()
  camera.getWorldDirection(normal)
  dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, pos)
  controls.enabled = false
  renderer.domElement.addEventListener('pointermove', onPointerMove)
  renderer.domElement.addEventListener('pointerup', onPointerUp)
  renderer.domElement.addEventListener('pointercancel', onPointerUp)
  renderer.domElement.addEventListener('pointerleave', onPointerUp)
}

function applyIKUpdate() {
  const mesh = currentMeshRef.value
  if (import.meta.env.DEV && !(mesh instanceof THREE.SkinnedMesh)) {
    console.warn('currentMeshRef should point to a SkinnedMesh', mesh)
  }
  if (!mesh || !(mesh instanceof THREE.SkinnedMesh) || !helper) return
  const start = performance.now()
  const prevIK = helper.enabled.ik
  helper.enabled.ik = true
  helper.update(0)
  helper.enabled.ik = prevIK
  mesh.skeleton.update()
  mesh.updateMatrixWorld(true)
  updateIKMarkersBound?.()
  if (import.meta.env.DEV) {
    console.debug(
      `applyIKUpdate: ${(performance.now() - start).toFixed(2)}ms`
    )
  }
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
  if (!selectedIK.value) {
    onPointerUp()
    return
  }
  if (isRotating) {
    const bone = selectedIK.value.target
    let rotationAxis = bone.userData?.localAxes?.xAxis
    if (rotationAxis) {
      rotationAxis = adjustAxis(rotationAxis, [0, 1, 2], [1, 1, -1]).normalize()
      const angle = event.movementX * 0.01
      _quat.setFromAxisAngle(rotationAxis, angle)
      applyLocalAxisRotation(bone, _quat)
      bone.updateMatrixWorld(true)
      currentMeshRef.value?.skeleton?.update()
      currentMeshRef.value?.updateMatrixWorld(true)
      scheduleIKUpdate()
    }
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
      currentMeshRef.value?.skeleton?.update()
      currentMeshRef.value?.updateMatrixWorld(true)
      scheduleIKUpdate()
    }
  }
}

function onPointerUp() {
  const dom = renderer.domElement
  dom.removeEventListener('pointermove', onPointerMove)
  dom.removeEventListener('pointerup', onPointerUp)
  dom.removeEventListener('pointercancel', onPointerUp)
  dom.removeEventListener('pointerleave', onPointerUp)
  controls.enabled = true
  if (isRotating) {
    isRotating = false
  }
  dragPlane = null
  if (physicsWasEnabled) {
    const mesh = currentMeshRef.value
    helper?.enable('physics', true)
    helper?.objects.get(mesh)?.physics?.reset()
    helper?.update(0)
    physicsWasEnabled = false
  }
  selectedIK.value = null
  applyIKUpdate()
}

function onControlStart() {
  physicsWasEnabled = enablePhysics.value
  if (physicsWasEnabled) {
    helper?.enable('physics', false)
  }
}

function onControlEnd() {
  if (physicsWasEnabled) {
    const mesh = currentMeshRef.value
    helper?.enable('physics', true)
    helper?.objects.get(mesh)?.physics?.reset()
    physicsWasEnabled = false
  }
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
  }).catch(() => {})
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

function promisifyRequest(req, handler) {
  return new Promise((resolve, reject) => {
    const successEvent = 'onsuccess' in req ? 'onsuccess' : 'oncomplete'
    req[successEvent] = () => {
      if (handler) handler(resolve)
      else resolve(req.result)
    }
    req.onerror = () => reject(req.error)
  })
}
async function cacheFiles(modelFiles) {
  try {
    const dataLists = []
    for (const files of modelFiles) {
      const list = await Promise.all(
        files.map(async f => ({
          name: f.name,
          path: f.webkitRelativePath || f.name,
          type: f.type,
          data: await f.arrayBuffer()
        }))
      )
      dataLists.push(list)
    }

    const db = await getDB()
    const tx = db.transaction(DB_STORE, 'readwrite')
    const store = tx.objectStore(DB_STORE)
    await promisifyRequest(store.clear())
    for (let i = 0; i < dataLists.length; i++) {
      await promisifyRequest(store.put(dataLists[i], i))
    }
    await promisifyRequest(tx)
    if (import.meta.env.DEV) console.log('Model cached')
  } catch (e) {
    console.error('Failed to cache model:', e)
  }
}
async function loadCachedFiles() {
  try {
    const db = await getDB()
    const tx = db.transaction(DB_STORE)
    const store = tx.objectStore(DB_STORE)
    const result = []
    const req = store.openCursor()
    await promisifyRequest(req, resolve => {
      const cursor = req.result
      if (cursor) {
        result.push(cursor.value)
        cursor.continue()
      } else {
        resolve()
      }
    })
    return result
  } catch (e) {
    console.error('Failed to load cached model:', e)
    return []
  }
}
async function deleteCachedFiles(index) {
  try {
    const db = await getDB()
    const tx = db.transaction(DB_STORE, 'readwrite')
    const store = tx.objectStore(DB_STORE)
    if (index === undefined) {
      store.clear()
    } else {
      store.delete(index)
    }
    await promisifyRequest(tx)
    if (import.meta.env.DEV) console.log('Model cache cleared')
  } catch (e) {
    console.error('Failed to clear model cache:', e)
  }
}

async function restoreCachedModel() {
  const saved = await loadCachedFiles()
  if (!saved.length) return
  const files = []
  for (const model of saved) {
    for (const f of model) {
      const file = new File([f.data], f.name, { type: f.type })
      if (f.path)
        Object.defineProperty(file, 'webkitRelativePath', { value: f.path })
      files.push(file)
    }
  }
  await handleFiles(files)
}

function onFileChange(e) {
  handleFiles(e.target.files)
  e.target.value = ''
}

function toggleMenu() {
  if (import.meta.env.DEV) console.log('Menu button clicked')
  logToServer({ event: 'menu' })
  menuOpen.value = !menuOpen.value
}

function openFile() {
  if (import.meta.env.DEV) console.log('Import option clicked')
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

async function removeModel(index) {
  const model = models.value[index]
  if (!model) return

  const { mesh, skeletonHelper, boneNameHelpers } = model
  // helper から確実に解除
  helper?.remove?.(mesh)

  // レンダラー関連のキャッシュを解放
  effect?.clearCache?.()
  renderer?.renderLists?.dispose?.()
  renderer?.info?.reset?.()

  try {
    mesh.traverse(child => {
      if (!child.isMesh) return
      child.geometry?.dispose?.()
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material]
      materials.forEach(m => {
        if (!m) return
        // テクスチャなどの参照をまとめて破棄
        Object.values(m).forEach(v => v?.isTexture && v.dispose?.())
        m.dispose?.()
      })
    })
    scene.remove(mesh)
    mesh.removeFromParent?.()
    if (skeletonHelper) {
      scene.remove(skeletonHelper)
      skeletonHelper.removeFromParent?.()
      skeletonHelper.geometry?.dispose?.()
      skeletonHelper.material?.dispose?.()
    }
    if (boneNameHelpers) {
      boneNameHelpers.forEach(h => {
        h.parent?.remove(h)
        h.material.map?.dispose?.()
        h.material?.dispose?.()
      })
    }

    models.value.splice(index, 1)
    if (currentMeshRef.value === mesh) {
      ikTargets.forEach(t => {
        scene.remove(t.marker)
        t.marker.material?.dispose()
      })
      ikTargets.length = 0
      currentMeshRef.value = models.value[0]?.mesh || null
      setupIKTargets(scene, currentMeshRef.value)
    }
    if (models.value.length === 0) {
      await deleteCachedFiles()
    } else {
      await deleteCachedFiles(index)
      await cacheFiles(models.value.map(m => m.files || []))
    }
  } catch (e) {
    console.error('Failed to remove model:', e)
  } finally {
    requestAnimationFrame(() => effect.render(scene, camera))
  }
}

async function clearCache() {
  if (import.meta.env.DEV) console.log('Clear cache clicked')
  logToServer({ event: 'clear-cache' })
  effect?.clearCache?.()
  renderer?.renderLists?.dispose?.()
  await deleteCachedFiles()
  poses.value.forEach(p => URL.revokeObjectURL(p.url))
  poses.value = []
  selectedPose.value = null
  models.value.forEach(m => {
    const { mesh, skeletonHelper, boneNameHelpers } = m
    if (helper?.objects?.has(mesh)) helper.remove(mesh)
    try {
      scene.remove(mesh)
      if (skeletonHelper) {
        scene.remove(skeletonHelper)
        skeletonHelper.geometry?.dispose?.()
        skeletonHelper.material?.dispose?.()
      }
      if (boneNameHelpers) {
        boneNameHelpers.forEach(h => {
          h.parent?.remove(h)
          h.material.map?.dispose?.()
          h.material?.dispose?.()
        })
      }
    } catch (e) {
      console.error('Failed to remove mesh from scene:', e)
    }
  })
  models.value = []
  nextModelId = 1
  currentMeshRef.value = null
  setupIKTargets(scene, currentMeshRef.value)
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

function createBoneNameHelpers(skinnedMesh) {
  const helpers = []
  skinnedMesh.skeleton.bones.forEach(bone => {
    const name = bone.name
    if (!name) return
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.warn('2D context not available, skipping bone name helper for', name)
      return
    }
    ctx.font = '24px sans-serif'
    const width = ctx.measureText(name).width + 20
    canvas.width = width
    canvas.height = 40
    ctx.font = '24px sans-serif'
    ctx.fillStyle = '#fff'
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 4
    ctx.strokeText(name, 10, 30)
    ctx.fillText(name, 10, 30)
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    const material = new THREE.SpriteMaterial({
      map: texture,
      depthTest: false,
      depthWrite: false,
      transparent: true
    })
    const sprite = new THREE.Sprite(material)
    const scaleFactor = 0.01
    sprite.scale.set(canvas.width * scaleFactor, canvas.height * scaleFactor, 1)
    sprite.position.set(0, 0.1, 0)
    sprite.visible = false
    bone.add(sprite)
    helpers.push(sprite)
  })
  return helpers
}

async function handleFiles(files) {
  poses.value.forEach(p => URL.revokeObjectURL(p.url))
  poses.value = []
  selectedPose.value = null

  const fileMap = {}
  const modelEntries = []
  const poseFiles = []
  for (const file of files) {
    const path = file.webkitRelativePath || file.name
    const shortPath = path
      .replace(/^[^/]*\//, '')
      .replace(/\\/g, '/')
    const dir = shortPath.includes('/')
      ? shortPath.substring(0, shortPath.lastIndexOf('/'))
      : ''
    const url = URL.createObjectURL(file)
    fileMap[shortPath] = url
    if (/\.(pmx|pmd)$/i.test(file.name)) modelEntries.push({ file, dir })
    if (/\.vpd$/i.test(file.name)) poseFiles.push({ name: file.name, url })
  }
  if (modelEntries.length === 0) {
    for (const key in fileMap) URL.revokeObjectURL(fileMap[key])
    return
  }

  poses.value = poseFiles

  const poseFile = poseFiles[0]
  const posePath = poseFile && poseFile.url

  const names = Array.from(files).map(f => f.name)
  if (import.meta.env.DEV) console.log('Selected files:', names)
  logToServer({ event: 'select', files: names })

  const manager = new THREE.LoadingManager()
  manager.setURLModifier(url => {
    const normalized = url.replace(/\\/g, '/').replace(/^\.\//, '')
    return fileMap[normalized] || url
  })
  manager.onError = url => {
    console.error('Resource load failed:', url)
    logToServer({ event: 'resource-error', url })
  }

  loader = new MMDLoader(manager)
  for (const { file: modelFile, dir } of modelEntries) {
    const modelPath = (modelFile.webkitRelativePath || modelFile.name)
      .replace(/^[^/]*\//, '')
      .replace(/\\/g, '/')
    const dirPrefix = dir ? dir + '/' : ''
    const modelSpecificFiles = Array.from(files).filter(f => {
      const p = (f.webkitRelativePath || f.name)
        .replace(/^[^/]*\//, '')
        .replace(/\\/g, '/')
      const isTexture = /\.(png|jpe?g|bmp|tga|gif|tiff|dds|svg|sph|spa)$/i.test(
        f.name
      )
      return dir
        ? p.startsWith(dirPrefix) || isTexture
        : !p.includes('/') || isTexture
    })
    await new Promise(resolve => {
      loader.load(
        modelPath,
        mesh => {
          const skinnedMesh = mesh.isSkinnedMesh
            ? mesh
            : mesh.getObjectByProperty('type', 'SkinnedMesh')
          if (!skinnedMesh) {
            console.error('SkinnedMesh not found in model', modelFile.name)
            return resolve()
          }
          applyMmdRotationOrder(skinnedMesh.skeleton.bones)
          skinnedMesh.skeleton.calculateInverses()
          scene.add(skinnedMesh)
          const skeletonHelper = new THREE.SkeletonHelper(skinnedMesh)
          skeletonHelper.visible = debugSkinning
          scene.add(skeletonHelper)
          const boneNameHelpers = createBoneNameHelpers(skinnedMesh)
          models.value.push({
            id: nextModelId++,
            mesh: skinnedMesh,
            name: modelFile.name,
            visible: true,
            skeletonHelper,
            bonesVisible: debugSkinning,
            boneNameHelpers,
            boneNameVisible: false,
            files: modelSpecificFiles
          })
          if (debugSkinning) {
            const boneNames = skinnedMesh.skeleton.bones.map(b => b.name)
            if (import.meta.env.DEV) console.log('Skinning bones:', boneNames)
          }
          currentMeshRef.value = skinnedMesh
          setupIKTargets(scene, skinnedMesh)
          if (import.meta.env.DEV) console.log('Model loaded:', modelFile.name)
          logToServer({ event: 'loaded', model: modelFile.name })
          if (poseFile) {
            loader.loadVPD(posePath, true, pose => {
              helper.pose(skinnedMesh, pose)
              if (import.meta.env.DEV) console.log('Pose applied:', poseFile.name)
              logToServer({ event: 'pose', file: poseFile.name })
            })
          }
          resolve()
        },
        undefined,
        error => {
          const status = error && error.target && error.target.status
          console.error('Load error:', status, error)
          logToServer({ event: 'error', message: error.message, status })
          resolve()
        }
      )
    })
  }
  await cacheFiles(models.value.map(m => m.files))
  for (const key in fileMap) URL.revokeObjectURL(fileMap[key])
}
function applyPose() {
  if (!selectedPose.value || !loader || !currentMeshRef.value) return
  loader.loadVPD(selectedPose.value.url, true, pose => {
    const mesh = currentMeshRef.value
    helper.pose(mesh, pose)
    mesh.skeleton.update()
    mesh.updateMatrixWorld(true)
    updateIKMarkersBound?.()
    if (import.meta.env.DEV) console.log('Pose applied:', selectedPose.value.name)
    logToServer({ event: 'pose', file: selectedPose.value.name })
  })
}

function exportPose() {
  const mesh = currentMeshRef.value
  if (!mesh) return
  selectedIK.value?.target.updateMatrixWorld(true)
  helper?.update(0)
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
  if (import.meta.env.DEV) console.log('Pose exported')
  logToServer({ event: 'export' })
  menuOpen.value = false
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
  controls.addEventListener('start', onControlStart)
  controls.addEventListener('end', onControlEnd)

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
  ensureFloorRigidBody()
  renderer.domElement.addEventListener('pointerdown', onPointerDown)

  updateIKMarkersBound = () => updateIKMarkers(camera, renderer, raycaster)
  const animate = createAnimator({
    clock,
    targetFps: TARGET_FPS,
    helper,
    effect,
    scene,
    camera,
    updateIKMarkers: updateIKMarkersBound,
    directionalLightHelper
  })

  window.addEventListener('resize', onWindowResize)
  document.addEventListener('click', handleDocumentClick)

  if (import.meta.env.DEV) console.log('API base URL:', API_BASE_URL)
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
  renderer?.domElement?.removeEventListener('pointerdown', onPointerDown)
  renderer?.domElement?.removeEventListener('pointermove', onPointerMove)
  renderer?.domElement?.removeEventListener('pointerup', onPointerUp)
  renderer?.domElement?.removeEventListener('pointercancel', onPointerUp)
  renderer?.domElement?.removeEventListener('pointerleave', onPointerUp)
  controls?.removeEventListener('start', onControlStart)
  controls?.removeEventListener('end', onControlEnd)
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
