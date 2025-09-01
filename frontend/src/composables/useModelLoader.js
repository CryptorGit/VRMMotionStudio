import { ref } from 'vue'
import * as THREE from 'three'
import { MMDLoader } from 'three/examples/jsm/loaders/MMDLoader.js'
import { MMDExporter } from 'three/examples/jsm/exporters/MMDExporter.js'
import { applyMmdRotationOrder } from '../utils/bones.js'
import { setupIKTargets } from '../utils/ik.js'
import { selectedIK } from '../utils/ik.js'

export function useModelLoader({
  fileInput,
  models,
  currentMeshRef,
  getScene,
  getHelper,
  getEffect,
  getRenderer,
  getCamera,
  logToServer,
  menuOpen,
  updateIKMarkers,
  debugSkinning = false
}) {
  const poses = ref([])
  const selectedPose = ref(null)
  let loader
  let nextModelId = 1

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
      const shortPath = path.replace(/^[^/]*\//, '').replace(/\\/g, '/')
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
        return dir ? p.startsWith(dirPrefix) || isTexture : !p.includes('/') || isTexture
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
            const scene = getScene()
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
                const helper = getHelper()
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
    const helper = getHelper()
    if (!selectedPose.value || !loader || !currentMeshRef.value) return
    loader.loadVPD(selectedPose.value.url, true, pose => {
      const mesh = currentMeshRef.value
      helper.pose(mesh, pose)
      mesh.skeleton.update()
      mesh.updateMatrixWorld(true)
      updateIKMarkers?.()
      if (import.meta.env.DEV) console.log('Pose applied:', selectedPose.value.name)
      logToServer({ event: 'pose', file: selectedPose.value.name })
    })
  }

  function exportPose() {
    const mesh = currentMeshRef.value
    if (!mesh) return
    const helper = getHelper()
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

  function openFile() {
    if (import.meta.env.DEV) console.log('Import option clicked')
    logToServer({ event: 'import' })
    fileInput.value && fileInput.value.click()
    menuOpen.value = false
  }

  function onFileChange(e) {
    handleFiles(e.target.files)
    e.target.value = ''
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

  async function removeModel(index) {
    const scene = getScene()
    const helper = getHelper()
    const effect = getEffect()
    const renderer = getRenderer()
    const model = models.value[index]
    if (!model) return
    const { mesh, skeletonHelper, boneNameHelpers } = model
    helper?.remove?.(mesh)
    effect?.clearCache?.()
    renderer?.renderLists?.dispose?.()
    renderer?.info?.reset?.()
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
        const scene2 = getScene()
        setupIKTargets(scene2, null)
        currentMeshRef.value = models.value[0]?.mesh || null
        setupIKTargets(scene2, currentMeshRef.value)
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
      requestAnimationFrame(() => getEffect().render(getScene(), getCamera()))
    }
  }

  async function clearCache() {
    const scene = getScene()
    const helper = getHelper()
    const effect = getEffect()
    const renderer = getRenderer()
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

  return {
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
  }
}
