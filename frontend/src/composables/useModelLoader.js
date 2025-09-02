import { ref, markRaw } from 'vue'
import * as THREE from 'three'
import { MMDExporter } from 'three/examples/jsm/exporters/MMDExporter.js'
import { applyMmdRotationOrder } from '../utils/bones.js'
import { setupIKTargets, ikTargets, selectedIK } from '../utils/ik.js'
import { createLoader } from '../utils/createLoader.js'
import { openDB } from '../utils/openDB.js'

export function useModelLoader({
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
}) {
  const poses = ref([])
  const selectedPose = ref(null)
  const models = ref([])
  let nextModelId = 1
  const debugSkinning = import.meta.env.VITE_DEBUG_SKINNING === 'true'
  let loader = null

  const DB_NAME = 'mmd-viewer'
  const DB_STORE = 'model'
  let dbPromise

  function getLoader() {
    return loader
  }

  function getDB() {
    if (!dbPromise) {
      dbPromise = openDB(DB_NAME, DB_STORE)
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
        if (f.path) Object.defineProperty(file, 'webkitRelativePath', { value: f.path })
        files.push(file)
      }
    }
    await handleFiles(files)
  }

  function onFileChange(e) {
    handleFiles(e.target.files)
    e.target.value = ''
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

  function disposeModelResources(model) {
    if (!model) return
    const { mesh, skeletonHelper, boneNameHelpers } = model
    helper.value?.remove?.(mesh)
    try {
      mesh.traverse(child => {
        if (!child.isMesh) return
        child.geometry?.dispose?.()
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        materials.forEach(m => {
          if (!m) return
          Object.values(m).forEach(v => v?.isTexture && v.dispose?.())
          m.dispose?.()
        })
      })
      scene.value.remove(mesh)
      mesh.removeFromParent?.()
      if (skeletonHelper) {
        scene.value.remove(skeletonHelper)
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
    } catch (e) {
      console.error('Failed to dispose model resources:', e)
    }
  }

  async function removeModel(index) {
    const model = models.value[index]
    if (!model) return
    const { mesh } = model
    effect.value?.clearCache?.()
    renderer.value?.renderLists?.dispose?.()
    renderer.value?.info?.reset?.()
    try {
      disposeModelResources(model)
      models.value.splice(index, 1)
      if (currentMeshRef.value === mesh) {
        ikTargets.forEach(t => {
          scene.value.remove(t.marker)
          t.marker.material?.dispose()
        })
        ikTargets.length = 0
        currentMeshRef.value = models.value[0]?.mesh || null
        setupIKTargets(scene.value, currentMeshRef.value)
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
      requestAnimationFrame(() => effect.value.render(scene.value, camera.value))
    }
  }

  async function clearCache() {
    logToServer({ event: 'clear-cache' })
    effect.value?.clearCache?.()
    renderer.value?.renderLists?.dispose?.()
    await deleteCachedFiles()
    poses.value.forEach(p => URL.revokeObjectURL(p.url))
    poses.value = []
    selectedPose.value = null
    models.value.forEach(m => {
      disposeModelResources(m)
    })
    models.value = []
    nextModelId = 1
    currentMeshRef.value = null
    setupIKTargets(scene.value, currentMeshRef.value)
    menuOpen.value = false
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
      ctx.font = '40px sans-serif'
      const textWidth = ctx.measureText(name).width
      canvas.width = textWidth + 20
      canvas.height = 60
      ctx.font = '40px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#000'
      ctx.fillText(name, canvas.width / 2, canvas.height / 2)
      const texture = new THREE.CanvasTexture(canvas)
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
      const shortPath = path.replace(/^[^/]*\//, '').replace(/\\/g, '/')
      const dir = shortPath.includes('/') ? shortPath.substring(0, shortPath.lastIndexOf('/')) : ''
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

      loader = createLoader(manager)
    for (const { file: modelFile, dir } of modelEntries) {
      const modelPath = (modelFile.webkitRelativePath || modelFile.name)
        .replace(/^[^/]*\//, '')
        .replace(/\\/g, '/')
      const dirPrefix = dir ? dir + '/' : ''
      const modelSpecificFiles = Array.from(files).filter(f => {
        const p = (f.webkitRelativePath || f.name)
          .replace(/^[^/]*\//, '')
          .replace(/\\/g, '/')
        const isTexture = /\.(png|jpe?g|bmp|tga|gif|tiff|dds|svg|sph|spa)$/i.test(f.name)
        return dir ? p.startsWith(dirPrefix) || isTexture : !p.includes('/') || isTexture
      })
      await new Promise(resolve => {
        loader.load(
          modelPath,
          mesh => {
            const skinnedMesh = mesh.isSkinnedMesh ? mesh : mesh.getObjectByProperty('type', 'SkinnedMesh')
            if (!skinnedMesh) {
              console.error('SkinnedMesh not found in model', modelFile.name)
              return resolve()
            }
            applyMmdRotationOrder(skinnedMesh.skeleton.bones)
            skinnedMesh.skeleton.calculateInverses()
            scene.value.add(skinnedMesh)
            const skeletonHelper = new THREE.SkeletonHelper(skinnedMesh)
            skeletonHelper.visible = debugSkinning
            scene.value.add(skeletonHelper)
            const boneNameHelpers = createBoneNameHelpers(skinnedMesh)
            models.value.push({
              id: nextModelId++,
              mesh: markRaw(skinnedMesh),
              name: modelFile.name,
              visible: true,
              skeletonHelper: markRaw(skeletonHelper),
              bonesVisible: debugSkinning,
              boneNameHelpers: boneNameHelpers.map(h => markRaw(h)),
              boneNameVisible: false,
              files: modelSpecificFiles
            })
            currentMeshRef.value = skinnedMesh
            setupIKTargets(scene.value, skinnedMesh)
            logToServer({ event: 'loaded', model: modelFile.name })
            if (poseFile) {
              loader.loadVPD(posePath, true, pose => {
                helper.value.pose(skinnedMesh, pose)
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
      helper.value.pose(mesh, pose)
      mesh.skeleton.update()
      mesh.updateMatrixWorld(true)
      updateIKMarkersBound.value?.()
      logToServer({ event: 'pose', file: selectedPose.value.name })
    })
  }

  function exportPose() {
    const mesh = currentMeshRef.value
    if (!mesh) return
    selectedIK.value?.target.updateMatrixWorld(true)
    helper.value?.update(0)
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
    logToServer({ event: 'export' })
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

  return {
    poses,
    selectedPose,
    models,
    onFileChange,
    toggleModelVisibility,
    toggleBoneVisibility,
    toggleBoneNameVisibility,
    removeModel,
    clearCache,
    handleFiles,
    applyPose,
    exportPose,
    onDragOver,
    onDragLeave,
    onDrop,
    restoreCachedModel,
    getLoader,
    getDB
  }
}
