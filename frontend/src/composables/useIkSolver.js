import { ref, watch } from 'vue'
import * as THREE from 'three'
import { showIkMarkers, ikConfigPromise, setupIKTargets, updateIKMarkers, initIKSolver } from '../utils/ik.js'

export function useIkSolver({ scene, camera, renderer, helper, currentMeshRef, ensureFloorRigidBody, getAmmo }) {
  let ikUpdateScheduled = false
  const ikInitializedMeshes = new WeakSet()
  const updateIKMarkersBound = ref(null)
  const raycaster = new THREE.Raycaster()
  const devLog = data => {
    try {
      if (typeof fetch === 'function' && typeof window !== 'undefined') {
        fetch('/__dev__/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'ik-solver', ...data })
        }).catch(() => {})
      }
    } catch {}
  }

  watch(showIkMarkers, () => {
    try {
      updateIKMarkersBound.value?.()
    } catch (e) {
      console.error('Failed to toggle IK markers:', e)
    }
  })

  watch(currentMeshRef, async mesh => {
    try {
      await ikConfigPromise
      if (currentMeshRef.value === mesh) {
        devLog({ event: 'mesh:change', name: mesh?.name, hasHelper: !!helper.value, ammo: !!getAmmo?.() })
        setupIKTargets(scene.value, mesh)
        if (mesh && !ikInitializedMeshes.has(mesh)) {
          await initIKSolver(helper.value, mesh, ensureFloorRigidBody, getAmmo?.())
          ikInitializedMeshes.add(mesh)
        }
      }
    } catch (e) {
      console.error('Failed to setup IK targets:', e)
      devLog({ event: 'mesh:ik-setup:error', message: String(e && e.message) })
    }
  })

  function applyIKUpdate() {
    const mesh = currentMeshRef.value
    if (import.meta.env.DEV && !(mesh instanceof THREE.SkinnedMesh)) {
      console.warn('currentMeshRef should point to a SkinnedMesh', mesh)
    }
    if (!mesh || !(mesh instanceof THREE.SkinnedMesh) || !helper.value) return
    mesh.updateMatrixWorld(true)
    mesh.skeleton.update()
    mesh.skeleton.needsUpdate = true
    mesh.skeleton.update()
    mesh.updateMatrixWorld(true)
    // IK 繧・solve 縺励◆逶ｴ蠕後↓ helper 繧呈峩譁ｰ縺吶ｋ蠢・ｦ√′縺ゅｋ縺溘ａ縺薙・鬆・分繧堤ｶｭ謖√☆繧九％縺ｨ
    const __ik = helper.value.objects.get(mesh)?.ikSolver; __ik?.update()
    helper.value.update(0)
    if (import.meta.env.DEV) {
      try {
        const chains = Array.isArray(mesh.geometry?.userData?.MMD?.iks)
          ? mesh.geometry.userData.MMD.iks.length
          : 0
        fetch('/__dev__/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'ik-solver', event: 'ik:solve', hasIk: !!__ik, chains })
        }).catch(() => {})
      } catch {}
    }
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



