import { ref, markRaw } from 'vue'
import * as THREE from 'three'
import {
  applyMmdRotationOrder,
  initBoneOriginalQuaternions,
  ensureLocalAxes,
  createBoneTypeMarkers
} from '../utils/bones.js'
import { setupIKTargets, ikTargets, ikConfigPromise } from '../utils/ik.js'
import { createLoader } from '../utils/createLoader.js'

export function useModelOperations({
  scene,
  camera,
  renderer,
  effect,
  helper,
  currentMeshRef,
  menuOpen,
  logToServer,
  viewer,
  loader,
  cache,
  poses,
  selectedPose
}) {
  const models = ref([])
  let nextModelId = 1
  const debugSkinning = import.meta.env.VITE_DEBUG_SKINNING === 'true'

  const LOCAL_MODELS_KEY = 'importedModels'

  function saveModelState() {
    try {
      const data = models.value.map(m => ({
        name: m.name,
        visible: m.visible,
        bonesVisible: m.bonesVisible,
        boneNameVisible: m.boneNameVisible
      }))
      if (data.length) {
        localStorage.setItem(LOCAL_MODELS_KEY, JSON.stringify(data))
      } else {
        localStorage.removeItem(LOCAL_MODELS_KEY)
      }
    } catch (e) {
      console.warn('Failed to save model state', e)
    }
  }

  function loadModelState() {
    try {
      const raw = localStorage.getItem(LOCAL_MODELS_KEY)
      return raw ? JSON.parse(raw) : []
    } catch (e) {
      console.warn('Failed to load model state', e)
      return []
    }
  }

  function createIsPhysicsBone(skinnedMesh) {
    const bones = skinnedMesh.skeleton?.bones || []
    const boneToIndex = new Map(bones.map((bone, index) => [bone, index]))
    const physicsIndices = new Set()
    const rigidBodies = skinnedMesh.geometry?.userData?.MMD?.rigidBodies || []
    rigidBodies.forEach(rb => {
      const index = rb.boneIndex
      if (typeof index === 'number' && index >= 0 && index < bones.length) {
        physicsIndices.add(index)
      }
    })
    return bone => {
      const index = boneToIndex.get(bone)
      return index !== undefined && physicsIndices.has(index)
    }
  }

  function warnMissingLocalAxes(bones) {
    bones.forEach(bone => {
      if (!bone.userData?.localAxes) {
        console.warn(`localAxes missing for bone "${bone.name}"`)
      }
    })
  }

  function createBoneNameHelpers(skinnedMesh, isPhysicsBone) {
    const helpers = []
    const bones = skinnedMesh.skeleton?.bones || []
    const boneDatas = skinnedMesh.geometry?.userData?.MMD?.bones || []
    const IK_FLAG = 0x20
    const isIkBone = (bone) => {
      try {
        const idx = bones.indexOf(bone)
        const data = idx >= 0 ? boneDatas[idx] : null
        return ((data?.flag || 0) & IK_FLAG) !== 0 || !!data?.ik
      } catch { return false }
    }
    bones.forEach(bone => {
      if (isIkBone(bone)) return
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
      texture.needsUpdate = true
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.generateMipmaps = false
      const material = new THREE.SpriteMaterial({
        map: texture,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        toneMapped: false
      })
      const sprite = new THREE.Sprite(material)
      const scaleFactor = 0.01
      sprite.scale.set(canvas.width * scaleFactor, canvas.height * scaleFactor, 1)
      sprite.position.set(0, 0.1, 0)
      sprite.visible = false
      sprite.userData.isPhysicsBone = isPhysicsBone(bone)
      bone.add(sprite)
      helpers.push(sprite)
    })
    return helpers
  }

  function onFileChange(e) {
    // Snapshot FileList before clearing input to avoid live collection becoming empty
    const list = Array.from(e.target.files || [])
    e.target.value = ''
    handleFiles(list)
  }

  function toggleModelVisibility(index, visible) {
    const model = models.value[index]
    if (model) {
      model.visible = visible
      model.mesh.visible = visible
      if (model.skeletonHelper) {
        model.skeletonHelper.visible = visible && model.bonesVisible
      }
      if (Array.isArray(model.boneNameHelpers)) {
        model.boneNameHelpers.forEach(h => {
          if (h)
            h.visible = visible && model.boneNameVisible
        })
      }
    }
    saveModelState()
  }

  function toggleBoneVisibility(index, visible) {
    const model = models.value[index]
    if (model?.skeletonHelper) {
      model.bonesVisible = visible
      model.skeletonHelper.visible = visible && model.visible
    }
    if (Array.isArray(model?.boneTypeHelpers)) {
      model.boneTypeHelpers.forEach(h => {
        if (h) h.visible = visible && model.visible
      })
    }
    saveModelState()
  }

  function toggleBoneNameVisibility(index, visible) {
    const model = models.value[index]
    if (Array.isArray(model?.boneNameHelpers)) {
      model.boneNameVisible = visible
      model.boneNameHelpers.forEach(h => {
        if (h)
          h.visible = visible && model.visible
      })
    }
    saveModelState()
  }

  function disposeModelResources(model) {
    if (!model) return
    const { mesh, skeletonHelper, boneNameHelpers, boneTypeHelpers } = model
    const objects = helper.value?.objects
    if (objects?.has?.(mesh) || objects?.get?.(mesh)) {
      helper.value?.remove?.(mesh)
    }
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
      if (boneTypeHelpers) {
        boneTypeHelpers.forEach(h => {
          h.parent?.remove(h)
          h.geometry?.dispose?.()
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
        await ikConfigPromise
        setupIKTargets(scene.value, currentMeshRef.value)
      }
      if (models.value.length === 0) {
        await cache.deleteCachedFiles()
      } else {
        await cache.deleteCachedFiles(index)
        await cache.cacheFiles(models.value.map(m => m.files || []))
      }
    } catch (e) {
      console.error('Failed to remove model:', e)
    } finally {
      saveModelState()
      requestAnimationFrame(() => effect.value.render(scene.value, camera.value))
    }
  }

  async function clearCache() {
    logToServer({ event: 'clear-cache' })
    effect.value?.clearCache?.()
    renderer.value?.renderLists?.dispose?.()
    await cache.deleteCachedFiles()
    poses.value.forEach(p => URL.revokeObjectURL(p.url))
    poses.value = []
    selectedPose.value = null
    models.value.forEach(m => {
      disposeModelResources(m)
    })
    models.value = []
    nextModelId = 1
    currentMeshRef.value = null
    await ikConfigPromise
    setupIKTargets(scene.value, currentMeshRef.value)
    menuOpen.value = false
    saveModelState()
  }

  async function handleFiles(files) {
    try { logToServer?.({ event: 'handleFiles:start', count: files?.length || 0 }) } catch {}
    poses.value.forEach(p => URL.revokeObjectURL(p.url))
    poses.value = []
    selectedPose.value = null

    const fileMap = {}
    const modelEntries = []
    const poseFiles = []
    for (const file of files) {
      const path = file.restoredPath || file.webkitRelativePath || file.name
      const shortPath = (
        file.restoredPath ? path : path.replace(/^[^/]*\//, '')
      ).replace(/\\/g, '/')
      const dir = shortPath.includes('/') ? shortPath.substring(0, shortPath.lastIndexOf('/')) : ''
      const url = URL.createObjectURL(file)
      fileMap[shortPath] = url
      if (/\.(pmx|pmd)$/i.test(file.name)) modelEntries.push({ file, dir })
      if (/\.vpd$/i.test(file.name)) poseFiles.push({ name: file.name, url })
    }
    if (modelEntries.length === 0) {
      try { logToServer?.({ event: 'handleFiles:no-model-entries' }) } catch {}
      for (const key in fileMap) URL.revokeObjectURL(fileMap[key])
      return
    }
    try { logToServer?.({ event: 'handleFiles:entries', count: modelEntries.length, names: modelEntries.map(e => e.file.name) }) } catch {}
    poses.value = poseFiles
    const poseFile = poseFiles[0]
    const posePath = poseFile && poseFile.url
    const names = Array.from(files).map(f => f.name)
    logToServer({ event: 'select', files: names })

    await ikConfigPromise
    const manager = new THREE.LoadingManager()
    manager.setURLModifier(url => {
      const normalized = url.replace(/\\/g, '/').replace(/^\.\//, '')
      // Fallback: try basename in case cached entries lack directory prefixes
      const basename = normalized.includes('/')
        ? normalized.substring(normalized.lastIndexOf('/') + 1)
        : normalized
      return fileMap[normalized] || fileMap[basename] || url
    })
    manager.onError = url => {
      console.error('Resource load failed:', url)
      logToServer({ event: 'resource-error', url })
    }

    loader.value = createLoader(manager)
    for (const { file: modelFile, dir } of modelEntries) {
      const rawModelPath = (modelFile.restoredPath || modelFile.webkitRelativePath || modelFile.name)
        .replace(/\\/g, '/')
      const modelPath = modelFile.restoredPath
        ? rawModelPath
        : rawModelPath.replace(/^[^/]*\//, '')
      const modelRoot = rawModelPath.includes('/') ? rawModelPath.split('/')[0] : ''
      const dirPrefix = dir ? dir + '/' : ''
      const modelSpecificFiles = Array.from(files).filter(f => {
        const raw = (f.restoredPath || f.webkitRelativePath || f.name).replace(/\\/g, '/')
        const root = raw.includes('/') ? raw.split('/')[0] : ''
        const p = f.restoredPath ? raw : raw.replace(/^[^/]*\//, '')
        const isTexture = /\.(png|jpe?g|bmp|tga|gif|tiff|dds|svg|sph|spa)$/i.test(f.name)
        // Prefer same top-level root as the model; always include textures
        if (root === modelRoot) return true
        if (isTexture) return true
        // Fallback to previous heuristic
        return dir ? p.startsWith(dirPrefix) : !p.includes('/')
      })
      try {
        const allPaths = Array.from(files).map(f => (f.restoredPath || f.webkitRelativePath || f.name))
        logToServer?.({ event: 'model:specific-files', model: modelFile.name, dir, dirPrefix, modelPath, modelRoot, selected: modelSpecificFiles.length, total: allPaths.length, sample: allPaths.slice(0, 10) })
      } catch {}
      await new Promise(resolve => {
        // Ensure relative resources resolve under the model's directory
        try { loader.value.setResourcePath(dirPrefix) } catch {}
        try { logToServer?.({ event: 'load-model', modelPath, dir }) } catch {}
        loader.value.load(
          modelPath,
          mesh => {
            const skinnedMesh = mesh.isSkinnedMesh ? mesh : mesh.getObjectByProperty('type', 'SkinnedMesh')
            if (!skinnedMesh) {
              console.error('SkinnedMesh not found in model', modelFile.name)
              return resolve()
            }
            const isPhysicsBone = createIsPhysicsBone(skinnedMesh)
            applyMmdRotationOrder(skinnedMesh.skeleton.bones)
            initBoneOriginalQuaternions(skinnedMesh.skeleton.bones)
            ensureLocalAxes(skinnedMesh)
            warnMissingLocalAxes(skinnedMesh.skeleton.bones)
            skinnedMesh.skeleton.calculateInverses()
            const metaName =
              skinnedMesh.geometry?.userData?.MMD?.meta?.name
            skinnedMesh.name =
              (typeof metaName === 'string' && metaName.trim()) ||
              modelFile.name.replace(/\.(pmx|pmd)$/i, '')
            scene.value.add(skinnedMesh)
            const skeletonHelper = new THREE.SkeletonHelper(skinnedMesh)
            skeletonHelper.visible = debugSkinning
            scene.value.add(skeletonHelper)
            const boneNameHelpers = createBoneNameHelpers(
              skinnedMesh,
              isPhysicsBone
            )
            const boneTypeHelpers = createBoneTypeMarkers(
              skinnedMesh,
              isPhysicsBone
            )
            models.value.push({
              id: nextModelId++,
              mesh: markRaw(skinnedMesh),
              name: modelFile.name,
              visible: true,
              skeletonHelper: markRaw(skeletonHelper),
              bonesVisible: debugSkinning,
              boneNameHelpers: boneNameHelpers.map(h => markRaw(h)),
              boneNameVisible: false,
              boneTypeHelpers: boneTypeHelpers.map(h => markRaw(h)),
              isPhysicsBone,
              files: modelSpecificFiles
            })
            currentMeshRef.value = skinnedMesh
            setupIKTargets(scene.value, skinnedMesh)
            logToServer({ event: 'loaded', model: modelFile.name })
            if (poseFile) {
              loader.value.loadVPD(posePath, true, pose => {
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
    let cached = false
    try { logToServer?.({ event: 'handleFiles:cache-input', counts: models.value.map(m => (m.files ? m.files.length : 0)) }) } catch {}
    try {
      cached = await cache.cacheFiles(models.value.map(m => m.files))
    } catch (e) {
      console.error('Failed to cache model files', e)
    }
    if (!cached) {
      console.error('Failed to cache model files')
      alert('モデルのキャッシュに失敗しました')
    }
    try { logToServer?.({ event: 'handleFiles:cached', ok: !!cached, models: models.value.length }) } catch {}
    for (const key in fileMap) URL.revokeObjectURL(fileMap[key])
    saveModelState()
  }

  async function restoreCachedModel(savedState = loadModelState()) {
    console.debug('restoreCachedModel: start')
    try { logToServer?.({ event: 'restore:start' }) } catch {}
    let saved
    try {
      saved = await cache.loadCachedFiles()
      console.debug('restoreCachedModel: load result', saved)
      try { logToServer?.({ event: 'restore:loaded', groups: saved.length }) } catch {}
    } catch (e) {
      console.warn('Failed to load cached files')
      console.debug(e)
      alert('モデルの復元に失敗しました')
      return false
    }
    if (!saved.length) {
      console.info('No cached model to restore')
      try { logToServer?.({ event: 'restore:empty' }) } catch {}
      alert('復元するモデルがありません')
      return false
    }
    const files = []
    for (const model of saved) {
      for (const f of model) {
        try {
          const part = f?.data && f.data.byteLength !== undefined ? new Uint8Array(f.data) : f?.data
          const file = new File([part], f.name, { type: f.type })
          // Preserve original relative path for restored files without relying on webkitRelativePath
          if (f.path) {
            try {
              file.restoredPath = f.path
            } catch (_) {
              // If assignment fails for any reason, proceed without it
            }
          }
          files.push(file)
        } catch (err) {
          console.error('Failed to reconstruct file from cache', err)
          try { logToServer?.({ event: 'restore:reconstruct-error', name: f?.name, haveData: !!f?.data, dataType: Object.prototype.toString.call(f?.data), message: err?.message }) } catch {}
        }
      }
    }
    try {
      try { logToServer?.({ event: 'restore:reconstructed', count: files.length }) } catch {}
      await handleFiles(files)
      currentMeshRef.value = models.value[0]?.mesh || null
      setupIKTargets(scene.value, currentMeshRef.value)
      savedState.forEach(s => {
        const index = models.value.findIndex(m => m.name === s.name)
        if (index !== -1) {
          toggleModelVisibility(index, s.visible)
          toggleBoneVisibility(index, s.bonesVisible)
          toggleBoneNameVisibility(index, s.boneNameVisible)
        }
      })
      saveModelState()
      console.info(`restoreCachedModel: restored ${models.value.length} model(s)`)
      try { logToServer?.({ event: 'restore:done', models: models.value.length }) } catch {}
      return true
    } catch (e) {
      console.error('Failed to restore cached model files', e)
      alert('モデルの復元中にエラーが発生しました')
      return false
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
    const list = Array.from(e.dataTransfer?.files || [])
    handleFiles(list)
  }

  return {
    models,
    onFileChange,
    handleFiles,
    toggleModelVisibility,
    toggleBoneVisibility,
    toggleBoneNameVisibility,
    removeModel,
    clearCache,
    restoreCachedModel,
    onDragOver,
    onDragLeave,
    onDrop
  }
}
