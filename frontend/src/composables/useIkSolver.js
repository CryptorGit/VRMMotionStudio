import { ref, watch } from 'vue'
import * as THREE from 'three'
import { showIkMarkers, ikConfigPromise, setupIKTargets, updateIKMarkers, initIKSolver } from '../utils/ik.js'

export function useIkSolver({ scene, camera, renderer, helper, currentMeshRef, ensureFloorRigidBody }) {
  let ikUpdateScheduled = false
  const ikInitializedMeshes = new WeakSet()
  const updateIKMarkersBound = ref(null)
  const raycaster = new THREE.Raycaster()

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
          setupIKTargets(scene.value, mesh)
          if (mesh && !ikInitializedMeshes.has(mesh)) {
            initIKSolver(helper.value, mesh, ensureFloorRigidBody)
            ikInitializedMeshes.add(mesh)
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
    if (!mesh || !(mesh instanceof THREE.SkinnedMesh) || !helper.value) return
    mesh.updateMatrixWorld(true)
    mesh.skeleton.update()
    helper.value.update(0)
    mesh.skeleton.update()
    mesh.updateMatrixWorld(true)
    updateIKMarkersBound.value?.(true)
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
    updateIKMarkersBound.value = skip =>
      updateIKMarkers(camera.value, renderer.value, raycaster, skip)
    updateIKMarkersBound.value()
    return updateIKMarkersBound.value
  }

  return { applyIKUpdate, scheduleIKUpdate, updateIKMarkersBound, initUpdateIKMarkers }
}
