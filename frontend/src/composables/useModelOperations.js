import { ref, markRaw } from 'vue'
import * as THREE from 'three'
import { applyMmdRotationOrder } from '../utils/bones.js'
import { setupIKTargets, ikTargets } from '../utils/ik.js'
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

  function createIsPhysicsBone(skinnedMesh) {
    const indices = new Set(
      skinnedMesh.geometry?.userData?.MMD?.rigidBodies?.map(rb => rb.boneIndex) || []
    )
    const bones = skinnedMesh.skeleton?.bones || []
    return bone => indices.has(bones.indexOf(bone))
  }

  function createBoneNameHelpers(skinnedMesh, isPhysicsBone, showPhysicsBones) {
    const helpers = []
    skinnedMesh.skeleton.bones.forEach(bone => {
      if (!showPhysicsBones && isPhysicsBone(bone)) return
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
      bone.add(sprite)
      helpers.push(sprite)
    })
    return helpers
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
      if (Array.isArray(model.boneNameHelpers)) {
        model.boneNameHelpers.forEach(h => {
          if (h) h.visible = visible && model.boneNameVisible
        })
      }
    }
  }

  function toggleBoneVisibility(index, visible) {
    const model = models.value[index]
    if (model?.skeletonHelper) {
      model.bonesVisible = visible
      model.skeletonHelper.visible = visible && model.visible
    }
  }

  function toggleBoneNameVisibility(index, visible) {
    const model = models.value[index]
    if (Array.isArray(model?.boneNameHelpers)) {
      model.boneNameVisible = visible
      model.boneNameHelpers.forEach(h => {
        if (h) h.visible = visible && model.visible
      })
    }
  }

  function togglePhysicsBones(index, visible) {
    const model = models.value[index]
    if (!model) return
    model.showPhysicsBones = visible
    const { skeletonHelper, isPhysicsBone, mesh } = model
    if (skeletonHelper) {
      const bones = skeletonHelper.allBones || skeletonHelper.bones
      skeletonHelper.allBones = bones
      skeletonHelper.bones = visible
        ? bones
        : bones.filter(b => !isPhysicsBone(b))
      skeletonHelper.updateMatrixWorld(true)
      skeletonHelper.visible = model.bonesVisible && model.visible
    }
    if (Array.isArray(model.boneNameHelpers)) {
      model.boneNameHelpers.forEach(h => {
        h.parent?.remove(h)
        h.material.map?.dispose?.()
        h.material?.dispose?.()
      })
    }
    const helpers = createBoneNameHelpers(mesh, isPhysicsBone, visible)
    model.boneNameHelpers = helpers.map(h => markRaw(h))
    model.boneNameHelpers.forEach(h => {
      h.visible = model.boneNameVisible && model.visible
    })
  }

  function disposeModelResources(model) {
    if (!model) return
    const { mesh, skeletonHelper, boneNameHelpers } = model
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
        await cache.deleteCachedFiles()
      } else {
        await cache.deleteCachedFiles(index)
        await cache.cacheFiles(models.value.map(m => m.files || []))
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
    setupIKTargets(scene.value, currentMeshRef.value)
    menuOpen.value = false
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

    loader.value = createLoader(manager)
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
        loader.value.load(
          modelPath,
          mesh => {
            const skinnedMesh = mesh.isSkinnedMesh ? mesh : mesh.getObjectByProperty('type', 'SkinnedMesh')
            if (!skinnedMesh) {
              console.error('SkinnedMesh not found in model', modelFile.name)
              return resolve()
            }
            const isPhysicsBone = createIsPhysicsBone(skinnedMesh)
            const showPhysicsBones = false
            applyMmdRotationOrder(skinnedMesh.skeleton.bones)
            skinnedMesh.skeleton.calculateInverses()
            scene.value.add(skinnedMesh)
            const skeletonHelper = new THREE.SkeletonHelper(skinnedMesh)
            skeletonHelper.allBones = [...skeletonHelper.bones]
            skeletonHelper.bones = showPhysicsBones
              ? skeletonHelper.bones
              : skeletonHelper.bones.filter(b => !isPhysicsBone(b))
            skeletonHelper.visible = debugSkinning
            scene.value.add(skeletonHelper)
            const boneNameHelpers = createBoneNameHelpers(
              skinnedMesh,
              isPhysicsBone,
              showPhysicsBones
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
              showPhysicsBones,
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
    await cache.cacheFiles(models.value.map(m => m.files))
    for (const key in fileMap) URL.revokeObjectURL(fileMap[key])
  }

  async function restoreCachedModel() {
    const saved = await cache.loadCachedFiles()
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
    models,
    onFileChange,
    handleFiles,
    toggleModelVisibility,
    toggleBoneVisibility,
    togglePhysicsBones,
    toggleBoneNameVisibility,
    removeModel,
    clearCache,
    restoreCachedModel,
    onDragOver,
    onDragLeave,
    onDrop
  }
}
