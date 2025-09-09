import { ref, watch } from 'vue'
import * as THREE from 'three'
import { showIkMarkers, ikConfigPromise, setupIKTargets, updateIKMarkers, initIKSolver, normalizeBoneName, solveArmIKTrackers, solveLegIKTrackers, solveBodyTrackers } from '../utils/ik.js'
import { initBoneOriginalQuaternions } from '../utils/bones.js'

export function useIkSolver({ scene, camera, renderer, helper, currentMeshRef, ensureFloorRigidBody, getAmmo }) {
  let ikUpdateScheduled = false
  const ikInitializedMeshes = new WeakSet()
  const updateIKMarkersBound = ref(null)
  const raycaster = new THREE.Raycaster()

  watch(showIkMarkers, () => {
    try { updateIKMarkersBound.value?.() } catch (e) { console.error('Failed to toggle IK markers:', e) }
  })

  watch(currentMeshRef, async mesh => {
    try {
      await ikConfigPromise
      if (currentMeshRef.value === mesh) {
        setupIKTargets(scene.value, mesh)
        if (mesh && !ikInitializedMeshes.has(mesh)) {
          initBoneOriginalQuaternions(mesh.skeleton.bones)
          await initIKSolver(helper.value, mesh, ensureFloorRigidBody, getAmmo?.())
          ikInitializedMeshes.add(mesh)
        }
        try {
          const grants = mesh.geometry?.userData?.MMD?.grants || []
          const bones = mesh.skeleton?.bones || []
          const isKnee = (n) => {
            const nn = normalizeBoneName(n)
            // Robust knee detection: English 'knee' or common Japanese '膝'
            return typeof nn === 'string' && (/knee/.test(nn) || nn.includes('膝'))
          }
          const related = grants.filter(g => isKnee(bones[g.index]?.name) || isKnee(bones[g.parentIndex]?.name))
        } catch {}
      }
    } catch (e) {
      console.error('Failed to setup IK targets:', e)
    }
  })

  function applyIKUpdate(force = false) {
    const mesh = currentMeshRef.value
    if (import.meta.env.DEV && !(mesh instanceof THREE.SkinnedMesh)) {
      console.warn('currentMeshRef should point to a SkinnedMesh', mesh)
    }
    if (!mesh || !(mesh instanceof THREE.SkinnedMesh) || !helper.value) return
    // Ensure matrices are up-to-date before solving
    mesh.updateMatrixWorld(true)
    mesh.skeleton.update(); mesh.skeleton.needsUpdate = true; mesh.skeleton.update()
    const obj = helper.value.objects.get(mesh)
    const solver = obj?.ikSolver || obj?.ik
    solver?.update?.()

    mesh.skeleton.update() // Update skeleton after IK solver to prevent lag in grants

    // Reset grant bones before grant solver runs to prevent cumulative rotation
    const grants = mesh.geometry?.userData?.MMD?.grants || []
    const bones = mesh.skeleton.bones
    for (const grant of grants) {
      const bone = bones[grant.index]
      if (bone && bone.userData._origQuat) {
        bone.quaternion.copy(bone.userData._origQuat)
      }
    }

    // Try applying grants explicitly if present
    try { obj?.grantSolver?.update?.() } catch {}

    helper.value.update(0)
    // ランタイム腕IK・脚IKトラッカーを解決
    try { solveArmIKTrackers(mesh, undefined, undefined, force) } catch {}
    try { solveLegIKTrackers(mesh, undefined, undefined, force) } catch {}
    try { solveBodyTrackers(mesh) } catch {}
    // No PMX min/max clamp; match MMD behavior
    try { mesh.skeleton.update(); mesh.skeleton.boneMatricesNeedUpdate = true } catch {}
    updateIKMarkersBound.value?.(true)
  }

  function scheduleIKUpdate(force = false) {
    if (ikUpdateScheduled && !force) return
    ikUpdateScheduled = true
    requestAnimationFrame(() => {
      ikUpdateScheduled = false
      applyIKUpdate(force)
    })
  }

  function initUpdateIKMarkers() {
    updateIKMarkersBound.value = skip => updateIKMarkers(camera.value, renderer.value, raycaster, skip)
    updateIKMarkersBound.value()
    return updateIKMarkersBound.value
  }

  return { applyIKUpdate, scheduleIKUpdate, updateIKMarkersBound, initUpdateIKMarkers }
}