import * as THREE from 'three'
import { ref } from 'vue'
import { adjustAxis, applyLocalAxisRotation } from '../utils/bones.js'
import { selectedIK, ikTargets } from '../utils/ik.js'

export function useIkDrag({ camera, renderer, controls, helper, currentMeshRef, enablePhysics, scheduleIKUpdate, applyIKUpdate }) {
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()
  let dragPlane = null
  const dragPoint = new THREE.Vector3()
  const isRotating = ref(false)
  const quat = new THREE.Quaternion()
  let physicsWasEnabled = false

  function onPointerDown(event) {
    renderer.value?.domElement?.setPointerCapture(event.pointerId)
    const rect = renderer.value.domElement.getBoundingClientRect()
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
    if (physicsWasEnabled) {
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
    const targetBone = selectedIK.value.target
    targetBone.getWorldPosition(pos)
    const normal = new THREE.Vector3()
    camera.value.getWorldDirection(normal)
    dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, pos)
    controls.value.enabled = false
  }

  function onPointerMove(event) {
    if (!selectedIK.value) {
      onPointerUp()
      return
    }
    if (isRotating.value) {
      const bone = selectedIK.value.target
      let rotationAxis = bone.userData?.localAxes?.xAxis
      if (rotationAxis) {
        rotationAxis = adjustAxis(rotationAxis, [0, 1, 2], [1, 1, -1]).normalize()
        const angle = event.movementX * 0.01
        quat.setFromAxisAngle(rotationAxis, angle)
        applyLocalAxisRotation(bone, quat)
        bone.updateMatrixWorld(true)
        const mesh = currentMeshRef.value
        mesh?.skeleton?.update()
        scheduleIKUpdate()
      }
      return
    }
    if (!dragPlane) return
    const rect = renderer.value.domElement.getBoundingClientRect()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(mouse, camera.value)
    if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
      const target = selectedIK.value.target
      if (target) {
        const parent = target.parent
        if (parent && typeof parent.worldToLocal === 'function') {
          parent.worldToLocal(dragPoint)
          target.position.copy(dragPoint)
          target.updateMatrixWorld(true)
          const mesh = currentMeshRef.value
          mesh?.skeleton?.update()
          scheduleIKUpdate()
        } else {
          console.warn('IK target parent missing worldToLocal method')
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
    selectedIK.value = null
    applyIKUpdate()
  }

  function onControlStart() {
    physicsWasEnabled = enablePhysics.value
    if (physicsWasEnabled) {
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
