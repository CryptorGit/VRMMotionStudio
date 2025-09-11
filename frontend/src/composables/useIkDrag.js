import * as THREE from 'three'
import { ref } from 'vue'
import { adjustAxis, applyLocalAxisRotation } from '../utils/bones.js'
import { selectedIK, ikTargets, normalizeBoneName, resetIkTrackerPositions, isDraggingIk } from '../utils/ik.js'

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

  function resolveDraggableBone(selectedBone) {
    const mesh = currentMeshRef.value
    const bones = mesh?.skeleton?.bones || []
    const iks = mesh?.geometry?.userData?.MMD?.iks || []
    // IK繝医Λ繝・き繝ｼ・・bject3D・峨・縺昴・縺ｾ縺ｾ霑斐☆
    if (!selectedBone?.isBone) {
      return { bone: selectedBone, index: -1 }
    }
    // Prefer stored chainIndex
    const stored = selectedIK.value?.chainIndex
    if (typeof stored === 'number' && stored >= 0 && stored < iks.length) {
      return { bone: bones[iks[stored].target], index: stored }
    }
    // Try by name heuristic: IK髫包ｽｪ -> IK
    const norm = normalizeBoneName(selectedBone?.name)
    if (typeof norm === 'string' && /ik髫包ｽｪ$/.test(norm)) {
      const targetName = norm.replace(/ik髫包ｽｪ$/, 'ik')
      const targetIdx = bones.findIndex(b => normalizeBoneName(b.name) === targetName)
      if (targetIdx !== -1) {
        const chainIdx = iks.findIndex(ik => bones[ik.target] === bones[targetIdx])
        // Drag IK髫包ｽｪ邵ｺ譏ｴ繝ｻ郢ｧ繧・・郢ｧ雋櫁劒邵ｺ荵昶・邵ｲ・､hainIdx 邵ｺ・ｯ陷ｿ繧峨・邵ｺ・ｫ闖ｫ譎・亜
        if (chainIdx !== -1) return { bone: selectedBone, index: chainIdx }
      }
      // IK髫包ｽｪ邵ｺ・ｮ陷ｷ讎顔√邵ｺ・ｰ邵ｺ謔滂ｽｯ・ｾ陟｢蟒ｬK邵ｺ迹夲ｽｦ荵昶命邵ｺ荵晢ｽ臥ｸｺ・ｪ邵ｺ繝ｻ・ｰ・ｴ陷ｷ蛹ｻ・らｸｲ竏ｬ・ｦ・ｪ髢ｾ・ｪ闖ｴ阮呻ｽ定恪霈板ｰ邵ｺ繝ｻ
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
    // Start IK dragging on left button
    isDraggingIk.value = true
    const pos = new THREE.Vector3()
    const { bone: targetBone } = resolveDraggableBone(selectedIK.value.target)
    targetBone.getWorldPosition(pos)
    // 繧ｫ繝｡繝ｩ荳ｭ蠢・・IK繝医Λ繝・き繝ｼ逶ｴ邱壹ｒ豕慕ｷ壹→縺吶ｋ蟷ｳ髱｢
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
      const targetObj = selectedIK.value.target
      if (!targetObj) return
      if (targetObj.isBone) {
        const bone = targetObj
        let rotationAxis = bone.userData?.localAxes?.xAxis
        if (rotationAxis) {
          rotationAxis = adjustAxis(rotationAxis, [0, 1, 2], [1, 1, -1]).normalize()
        } else {
          console.warn(`localAxes missing for bone "${bone.name}", using Y axis`)
          rotationAxis = new THREE.Vector3(0, 1, 0)
        }
        const angle = event.movementX * 0.01
        quat.setFromAxisAngle(rotationAxis, angle)
        applyLocalAxisRotation(bone, quat)
        scheduleIKUpdate()
        return
      }
      if (targetObj.isObject3D) {
        const parent = targetObj.parent
        const pwq = parent ? parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion()
        const pwqInv = parent ? pwq.clone().invert() : new THREE.Quaternion()
        const worldUp = new THREE.Vector3(0, 1, 0).applyQuaternion(pwq).normalize()
        const worldRight = new THREE.Vector3(1, 0, 0).applyQuaternion(pwq).normalize()
        const axisYLocal = worldUp.clone().applyQuaternion(pwqInv).normalize()
        const axisXLocal = worldRight.clone().applyQuaternion(pwqInv).normalize()
        const ax = (event.movementY || 0) * 0.01
        const ay = (event.movementX || 0) * 0.01
        const qx = new THREE.Quaternion().setFromAxisAngle(axisXLocal, ax)
        const qy = new THREE.Quaternion().setFromAxisAngle(axisYLocal, ay)
        targetObj.quaternion.premultiply(qy)
        targetObj.quaternion.premultiply(qx)
        targetObj.updateMatrixWorld(true)
        scheduleIKUpdate()
        return
      }
      return
    }
    // 豈弱ヵ繝ｬ繝ｼ繝縲∫峩邱壹′蝙らｷ壹・蟷ｳ髱｢繧貞・讒狗ｯ・
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
    
    // End dragging state on any pointer up
    isDraggingIk.value = false
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
      // 譖ｴ譁ｰ縺輔ｌ縺滄未遽菴咲ｽｮ縺ｫ繝医Λ繝・き繝ｼ繧呈綾縺・
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
