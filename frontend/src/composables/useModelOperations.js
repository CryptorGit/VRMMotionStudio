import { ref, markRaw } from 'vue'
import * as THREE from 'three'
import { createLoader } from '../utils/createLoader.js'

export function useModelOperations({
  scene,
  camera,
  renderer,
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

  const LOCAL_MODELS_KEY = 'importedModels'

  function saveModelState() {
    try {
      const data = models.value.map(m => ({
        name: m.name,
        visible: !!m.visible,
        bonesVisible: !!m.bonesVisible,
        boneNameVisible: !!m.boneNameVisible
      }))
      if (data.length) localStorage.setItem(LOCAL_MODELS_KEY, JSON.stringify(data))
      else localStorage.removeItem(LOCAL_MODELS_KEY)
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

  function onFileChange(e) {
    const list = Array.from(e.target.files || [])
    e.target.value = ''
    handleFiles(list)
  }

  function toggleModelVisibility(index, visible) {
    const model = models.value[index]
    if (model) {
      model.visible = !!visible
      model.mesh.visible = !!visible
    }
    saveModelState()
  }

  function toggleBoneVisibility(index, visible) {
    const model = models.value[index]
    if (model) {
      model.bonesVisible = !!visible
      try { model.skeletonHelper && (model.skeletonHelper.visible = !!visible && !!model.visible) } catch {}
    }
    saveModelState()
  }

  function toggleBoneNameVisibility(index, visible) {
    const model = models.value[index]
    if (model) model.boneNameVisible = !!visible
    saveModelState()
  }

  function disposeModelResources(model) {
    if (!model) return
    const { mesh, vrm, skeletonHelper } = model
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
        try {
          scene.value.remove(skeletonHelper)
          skeletonHelper.removeFromParent?.()
          skeletonHelper.geometry?.dispose?.()
          skeletonHelper.material?.dispose?.()
        } catch {}
      }
      try { vrm?.dispose?.() } catch {}
    } catch (e) {
      console.error('Failed to dispose model resources:', e)
    }
  }

  async function removeModel(index) {
    const model = models.value[index]
    if (!model) return
    const { mesh } = model
    renderer.value?.renderLists?.dispose?.()
    renderer.value?.info?.reset?.()
    try {
      disposeModelResources(model)
      models.value.splice(index, 1)
      if (currentMeshRef.value === mesh) {
        currentMeshRef.value = models.value[0]?.mesh || null
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
      requestAnimationFrame(() => renderer.value?.render?.(scene.value, camera.value))
    }
  }

  async function clearCache() {
    logToServer?.({ event: 'clear-cache' })
    renderer.value?.renderLists?.dispose?.()
    await cache.deleteCachedFiles()
    poses.value.forEach(p => URL.revokeObjectURL(p.url))
    poses.value = []
    selectedPose.value = null
    models.value.forEach(m => disposeModelResources(m))
    models.value = []
    nextModelId = 1
    currentMeshRef.value = null
    menuOpen.value = false
    saveModelState()
  }

  async function handleFiles(files) {
    try { logToServer?.({ event: 'handleFiles:start', count: files?.length || 0 }) } catch {}
    poses.value.forEach(p => URL.revokeObjectURL(p.url))
    poses.value = []
    selectedPose.value = null

    const modelEntries = []
    for (const file of files) {
      if (/\.vrm$/i.test(file.name)) {
        modelEntries.push({ file, url: URL.createObjectURL(file) })
      }
    }
    if (modelEntries.length === 0) {
      try { logToServer?.({ event: 'handleFiles:no-model-entries' }) } catch {}
      return
    }
    try { logToServer?.({ event: 'handleFiles:entries', count: modelEntries.length, names: modelEntries.map(e => e.file.name) }) } catch {}
    const names = Array.from(files).map(f => f.name)
    logToServer?.({ event: 'select', files: names })

    const manager = new THREE.LoadingManager()
    manager.onError = url => {
      console.error('Resource load failed:', url)
      logToServer?.({ event: 'resource-error', url })
    }

    loader.value = createLoader(manager)
    for (const { file: modelFile, url } of modelEntries) {
      await new Promise(resolve => {
        loader.value.load(
          url,
          gltf => {
            try {
              const vrm = gltf?.userData?.vrm
              if (!vrm) {
                console.error('VRM not found in GLTF', modelFile.name)
                return resolve()
              }
              vrm.scene.userData.vrm = vrm
              vrm.scene.name = modelFile.name.replace(/\.(vrm)$/i, '')
              scene.value.add(vrm.scene)
              // Minimal skeleton helper for bone visibility UI
              let skeletonHelper = null
              try {
                skeletonHelper = new THREE.SkeletonHelper(vrm.scene)
                skeletonHelper.visible = false
                scene.value.add(skeletonHelper)
              } catch {}
              models.value.push({
                id: nextModelId++,
                mesh: markRaw(vrm.scene),
                vrm: markRaw(vrm),
                name: modelFile.name,
                visible: true,
                bonesVisible: false,
                boneNameVisible: false,
                skeletonHelper: skeletonHelper ? markRaw(skeletonHelper) : null,
                files: [modelFile]
              })
              currentMeshRef.value = vrm.scene
              logToServer?.({ event: 'loaded', model: modelFile.name })
            } finally {
              resolve()
            }
          },
          undefined,
          error => {
            const status = error && error.target && error.target.status
            console.error('Load error:', status, error)
            logToServer?.({ event: 'error', message: error?.message, status })
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
          if (f.path) {
            try { file.restoredPath = f.path } catch {}
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
