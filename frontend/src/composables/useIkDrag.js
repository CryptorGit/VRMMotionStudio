import * as THREE from 'three'
import { ref } from 'vue'
import { adjustAxis, applyLocalAxisRotation } from '../utils/bones.js'
import {
  selectedIK,
  ikTargets,
  normalizeBoneName,
  resetIkTrackerPositions,
  armIkTrackersByMesh,
  legIkTrackersByMesh,
  bodyTrackersByMesh
} from '../utils/ik.js'

export function useIkDrag({
  camera,
  renderer,
  controls,
  helper,
  currentMeshRef,
  enablePhysics,
  scheduleIKUpdate,
  applyIKUpdate, // Pass applyIKUpdate directly
  updateIKMarkersBound
}) {
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()
  let dragPlane = null
  const dragPoint = new THREE.Vector3()
  const isRotating = ref(false)
  const quat = new THREE.Quaternion()
  let physicsWasEnabled = false
  function hasAfterPhysicsGrants(mesh) {
    try {
      const grants = mesh?.geometry?.userData?.MMD?.grants || []
      return grants.some(g => g?.isAfterPhysics)
    } catch { return false }
  }

  function findBoneForTracker(obj, mesh) {
    if (!obj || !mesh) return null
    const arms = armIkTrackersByMesh.get(mesh) || []
    for (const t of arms) {
      if (obj === t.handTracker) return t.wrist || t.effector || null
      if (obj === t.armTracker) return t.elbow || t.arm || null
      if (obj === t.elbowTracker) return t.arm || null
      if (obj === t.shoulderTracker) return t.shoulder || null
    }
    const legs = legIkTrackersByMesh.get(mesh) || []
    for (const t of legs) {
      if (obj === t.footTracker) return t.ankle || null
      if (obj === t.legTracker) return t.knee || null
      if (obj === t.kneeTracker) return t.upper || null
    }
    const body = bodyTrackersByMesh.get(mesh)
    if (body) {
      if (obj === body.head) return body.headBone || null
      if (obj === body.chest) return body.chestBone || null
    }
    return null
  }

  function resolveDraggableBone(selectedBone) {
    const mesh = currentMeshRef.value
    const bones = mesh?.skeleton?.bones || []
    const iks = mesh?.geometry?.userData?.MMD?.iks || []
    // IKトラッカー（Object3D）はそのまま返す
    if (!selectedBone?.isBone) {
      return { bone: selectedBone, index: -1 }
    }
    // Prefer stored chainIndex
    const stored = selectedIK.value?.chainIndex
    if (typeof stored === 'number' && stored >= 0 && stored < iks.length) {
      return { bone: bones[iks[stored].target], index: stored }
    }
    // Try by name heuristic: IK隕ｪ -> IK
    const norm = normalizeBoneName(selectedBone?.name)
    if (typeof norm === 'string' && /ik隕ｪ$/.test(norm)) {
      const targetName = norm.replace(/ik隕ｪ$/, 'ik')
      const targetIdx = bones.findIndex(b => normalizeBoneName(b.name) === targetName)
      if (targetIdx !== -1) {
        const chainIdx = iks.findIndex(ik => bones[ik.target] === bones[targetIdx])
        // Drag IK隕ｪ縺昴・繧ゅ・繧貞虚縺九☆縲ＤhainIdx 縺ｯ蜿ら・縺ｫ菫晄戟
        if (chainIdx !== -1) return { bone: selectedBone, index: chainIdx }
      }
      // IK隕ｪ縺ｮ蜷榊燕縺縺悟ｯｾ蠢廬K縺瑚ｦ九▽縺九ｉ縺ｪ縺・ｴ蜷医ｂ縲∬ｦｪ閾ｪ菴薙ｒ蜍輔°縺・
      return { bone: selectedBone, index: -1 }
    }
    // Fallback: same bone or chain containing this bone as link
    const byTarget = iks.findIndex(ik => bones[ik.target] === selectedBone)
    if (byTarget !== -1) return { bone: bones[iks[byTarget].target], index: byTarget }
    const byLink = iks.findIndex(ik => (ik.links || []).some(l => bones[l.index] === selectedBone))
    if (byLink !== -1) return { bone: bones[iks[byLink].target], index: byLink }
    return { bone: selectedBone, index: -1 }
  }

  function onPointerDown(event) {
    if (!renderer.value) {
      console.error('renderer is not initialized')
      return
    }
    const element = renderer.value.domElement
    if (!element) {
      console.error('renderer domElement is not initialized')
      return
    }
    element.setPointerCapture(event.pointerId)
    const rect = element.getBoundingClientRect()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(mouse, camera.value)
    const intersects = raycaster.intersectObjects(ikTargets.map(t => t.marker), false)
    if (intersects.length === 0) {
      selectedIK.value = null
      return
    }
    const target = ikTargets.find(t => t.marker === intersects[0].object)
    if (!target) return
    selectedIK.value = target
    physicsWasEnabled = enablePhysics.value
    const mesh = currentMeshRef.value
    // Keep physics enabled if model uses after-physics grants (so grant propagation runs during drag)
    if (physicsWasEnabled && mesh && !hasAfterPhysicsGrants(mesh)) {
      helper.value?.enable('physics', false)
      helper.value?.update(0)
    }
    if (event.button === 2) {
      event.preventDefault()
      isRotating.value = true
      controls.value.enabled = false
      return
    }
    if (event.button !== 0) return
    const pos = new THREE.Vector3()
    const { bone: targetBone } = resolveDraggableBone(selectedIK.value.target)
    targetBone.getWorldPosition(pos)
    // カメラ中心→IKトラッカー直線を法線とする平面
    const normal = new THREE.Vector3().subVectors(pos, camera.value.position).normalize()
    dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, pos)
    controls.value.enabled = false
  }

  function onPointerMove(event) {
    if (!selectedIK.value) {
      return
    }
    if (!renderer.value) {
      console.error('renderer is not initialized')
      return
    }
    const element = renderer.value.domElement
    if (!element) {
      console.error('renderer domElement is not initialized')
      return
    }
    if (isRotating.value) {
      const mesh = currentMeshRef.value
      const obj = selectedIK.value.target
      const bone = obj?.isBone ? obj : findBoneForTracker(obj, mesh)
      if (!bone) return
      let rotationAxis = bone.userData?.localAxes?.xAxis
      if (rotationAxis) {
        rotationAxis = adjustAxis(rotationAxis, [0, 1, 2], [1, 1, -1]).normalize()
      } else {
        console.warn(`localAxes missing for bone "${bone.name}", using Y axis`)
        rotationAxis = new THREE.Vector3(0, 1, 0)
      }
      const angle = (event.movementX || 0) * 0.01
      quat.setFromAxisAngle(rotationAxis, angle)
      applyLocalAxisRotation(bone, quat)
      scheduleIKUpdate()
      resetIkTrackerPositions(mesh)
      return
    }
    // 毎フレーム、直線が垂線の平面を再構築
    const rect = element.getBoundingClientRect()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(mouse, camera.value)
    const curWorld = new THREE.Vector3()
    const { bone: target } = resolveDraggableBone(selectedIK.value.target)
    target.getWorldPosition(curWorld)
    const normal = new THREE.Vector3().subVectors(curWorld, camera.value.position).normalize()
    dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, curWorld)
    if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
      if (target) {
        const parent = target.parent
        // dragPoint is in world space
        if (parent && typeof parent.worldToLocal === 'function') {
          parent.updateMatrixWorld(true)
          parent.worldToLocal(dragPoint)
          target.position.copy(dragPoint)
          target.updateMatrixWorld(true)
          scheduleIKUpdate()
        } else if (!parent) {
          // Root-level object: position is already in world space
          target.position.copy(dragPoint)
          target.updateMatrixWorld(true)
          scheduleIKUpdate()
        } else {
          // Fallback: compute local via parent.matrixWorld inverse
          try {
            parent.updateMatrixWorld(true)
            const inv = new THREE.Matrix4().copy(parent.matrixWorld).invert()
            const local = dragPoint.clone().applyMatrix4(inv)
            target.position.copy(local)
            target.updateMatrixWorld(true)
            scheduleIKUpdate()
          } catch (e) {
            console.warn('IK target parent missing worldToLocal method')
          }
        }
      }
    }
  }

      function onPointerUp(event) {
    renderer.value?.domElement?.releasePointerCapture(event?.pointerId)
    controls.value.enabled = true
    if (isRotating.value) {
      isRotating.value = false
    }
    dragPlane = null
    if (physicsWasEnabled) {
      const mesh = currentMeshRef.value
      helper.value?.enable('physics', true)
      helper.value?.objects.get(mesh)?.physics?.reset()
      helper.value?.update(0)
      physicsWasEnabled = false
    }
    if (selectedIK.value) {
      applyIKUpdate(true) // Force a final, full, synchronous update
      // 更新された関節位置にトラッカーを戻す
      resetIkTrackerPositions(currentMeshRef.value)
      updateIKMarkersBound.value?.(true)
    }
    selectedIK.value = null
  }

  function onControlStart() {
    physicsWasEnabled = enablePhysics.value
    const mesh = currentMeshRef.value
    if (physicsWasEnabled && mesh && !hasAfterPhysicsGrants(mesh)) {
      helper.value?.enable('physics', false)
    }
  }

  function onControlEnd() {
    if (physicsWasEnabled) {
      const mesh = currentMeshRef.value
      helper.value?.enable('physics', true)
      helper.value?.objects.get(mesh)?.physics?.reset()
      physicsWasEnabled = false
    }
  }

  return { onPointerDown, onPointerMove, onPointerUp, onControlStart, onControlEnd, isRotating }
}
