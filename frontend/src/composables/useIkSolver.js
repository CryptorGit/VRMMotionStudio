import { ref, watch } from 'vue'
import * as THREE from 'three'
import { showIkMarkers, ikConfigPromise, setupIKTargets, updateIKMarkers, initIKSolver, normalizeBoneName } from '../utils/ik.js'

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
    try { updateIKMarkersBound.value?.() } catch (e) { console.error('Failed to toggle IK markers:', e) }
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
        try {
          const grants = mesh.geometry?.userData?.MMD?.grants || []
          const bones = mesh.skeleton?.bones || []
          const isKnee = (n) => {
            const nn = normalizeBoneName(n)
            return typeof nn === 'string' && (nn.includes('ひざ') || /knee/.test(nn))
          }
          const related = grants.filter(g => isKnee(bones[g.index]?.name) || isKnee(bones[g.parentIndex]?.name))
          devLog({ event: 'grant:stats', count: grants.length, related: related.map(g => ({ index: g.index, parentIndex: g.parentIndex, ratio: g.ratio, rot: g.affectRotation, pos: g.affectPosition, local: g.isLocal, after: g.isAfterPhysics, indexName: bones[g.index]?.name, parentName: bones[g.parentIndex]?.name })) })
        } catch {}
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
    // Ensure matrices are up-to-date before solving
    mesh.updateMatrixWorld(true)
    mesh.skeleton.update(); mesh.skeleton.needsUpdate = true; mesh.skeleton.update()
    const obj = helper.value.objects.get(mesh)
    const solver = obj?.ikSolver || obj?.ik
    solver?.update?.()
    // Try applying grants explicitly if present
    try { obj?.grantSolver?.update?.() } catch {}
    helper.value.update(0)
    // Clamp excessive knee rotations to avoid flipping/jitter
    try {
      const bones = mesh.skeleton?.bones || []
      let clamped = 0
      for (const b of bones) {
        const n = normalizeBoneName(b.name)
        if (typeof n !== 'string') continue
        const isKnee = n.includes('ひざ') || /knee/.test(n)
        if (!isKnee) continue
        const order = b.rotation.order || 'XYZ'
        const e = new THREE.Euler().setFromQuaternion(b.quaternion, order)
        // Typical MMD膝は一方向の曲げのみ。X（前後）を主に使用し、Y/Zはごく小さく抑える。
        const maxBend = 2.2 // ~126 degrees
        const minBend = -0.2 // small negative to allow slight recovery
        const eps = 0.05
        const nx = THREE.MathUtils.clamp(e.x, minBend, maxBend)
        const ny = THREE.MathUtils.clamp(e.y, -eps, eps)
        const nz = THREE.MathUtils.clamp(e.z, -eps, eps)
        if (nx !== e.x || ny !== e.y || nz !== e.z) {
          e.set(nx, ny, nz, order)
          b.quaternion.setFromEuler(e)
          clamped++
        }
      }
      if (import.meta.env.DEV && clamped) {
        fetch('/__dev__/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: 'ik-solver', event: 'knee:clamp', count: clamped }) }).catch(() => {})
      }
    } catch {}
    try { mesh.skeleton.update(); mesh.skeleton.boneMatricesNeedUpdate = true } catch {}
    if (import.meta.env.DEV) {
      try {
        const chains = Array.isArray(mesh.geometry?.userData?.MMD?.iks) ? mesh.geometry.userData.MMD.iks.length : 0
        fetch('/__dev__/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: 'ik-solver', event: 'ik:solve', hasIk: !!solver, chains }) }).catch(() => {})
      } catch {}
    }
    updateIKMarkersBound.value?.(true)
  }

  function scheduleIKUpdate() {
    if (ikUpdateScheduled) return
    ikUpdateScheduled = true
    requestAnimationFrame(() => { ikUpdateScheduled = false; applyIKUpdate() })
  }

  function initUpdateIKMarkers() {
    updateIKMarkersBound.value = skip => updateIKMarkers(camera.value, renderer.value, raycaster, skip)
    updateIKMarkersBound.value()
    return updateIKMarkersBound.value
  }

  return { applyIKUpdate, scheduleIKUpdate, updateIKMarkersBound, initUpdateIKMarkers }
}
