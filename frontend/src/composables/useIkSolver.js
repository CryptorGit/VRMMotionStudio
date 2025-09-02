import { ref, watch } from 'vue'
import * as THREE from 'three'
import { showIkMarkers, ikConfigPromise, setupIKTargets, updateIKMarkers } from '../utils/ik.js'

export function useIkSolver({ scene, camera, renderer, currentMeshRef }) {
  let ikUpdateScheduled = false
  const updateIKMarkersBound = ref(null)
  const raycaster = new THREE.Raycaster()
  const worker = new Worker(new URL('../workers/ikWorker.js', import.meta.url), { type: 'module' })
  let bones = null

  worker.onmessage = e => {
    const { type, bones: updated } = e.data
    if (type !== 'updated' || !bones || !currentMeshRef.value) return
    updated.forEach((b, i) => {
      bones[i].position.fromArray(b.pos)
      bones[i].quaternion.fromArray(b.quat)
      bones[i].scale.fromArray(b.scl)
    })
    const mesh = currentMeshRef.value
    mesh.skeleton.update()
    mesh.updateMatrixWorld(true)
    updateIKMarkersBound.value?.()
  }

  watch(showIkMarkers, () => {
    try {
      updateIKMarkersBound.value?.()
    } catch (e) {
      console.error('Failed to toggle IK markers:', e)
    }
  })

  watch(currentMeshRef, mesh => {
    ikConfigPromise
      .then(() => {
        if (currentMeshRef.value === mesh) {
          const iks = setupIKTargets(scene.value, mesh)
          if (mesh) {
            bones = mesh.skeleton?.bones || []
            const boneDefs = bones.map(b => ({
              name: b.name,
              parent: bones.indexOf(b.parent)
            }))
            worker.postMessage({ type: 'init', bones: boneDefs, iks })
          } else {
            bones = null
          }
        }
      })
      .catch(e => {
        console.error('Failed to setup IK targets:', e)
      })
  })

  function applyIKUpdate() {
    const mesh = currentMeshRef.value
    if (import.meta.env.DEV && !(mesh instanceof THREE.SkinnedMesh)) {
      console.warn('currentMeshRef should point to a SkinnedMesh', mesh)
    }
    if (!mesh || !(mesh instanceof THREE.SkinnedMesh) || !bones) return
    const matrices = bones.map(b => {
      b.updateMatrixWorld(true)
      return b.matrix.toArray()
    })
    worker.postMessage({ type: 'update', matrices })
  }

  function scheduleIKUpdate() {
    if (ikUpdateScheduled) return
    ikUpdateScheduled = true
    requestAnimationFrame(() => {
      ikUpdateScheduled = false
      applyIKUpdate()
    })
  }

  function initUpdateIKMarkers() {
    updateIKMarkersBound.value = () => updateIKMarkers(camera.value, renderer.value, raycaster)
  }

  return { applyIKUpdate, scheduleIKUpdate, updateIKMarkersBound, initUpdateIKMarkers }
}
