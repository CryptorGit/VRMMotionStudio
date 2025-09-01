import * as THREE from 'three'
import { adjustAxis, applyLocalAxisRotation } from '../utils/bones.js'
import { selectedIK, ikTargets, updateIKMarkers } from '../utils/ik.js'

export function useIkControls({ camera, renderer, controls, helper, enablePhysics, currentMeshRef }) {
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()
  let dragPlane = null
  const _dragPoint = new THREE.Vector3()
  let isRotating = false
  const _quat = new THREE.Quaternion()
  let physicsWasEnabled = false
  let ikUpdateScheduled = false

  function updateMarkers() {
    updateIKMarkers(camera, renderer, raycaster)
  }

  function applyIKUpdate() {
    const mesh = currentMeshRef.value
    if (!mesh || !(mesh instanceof THREE.SkinnedMesh) || !helper) return
    const start = performance.now()
    const prevIK = helper.enabled.ik
    helper.enabled.ik = true
    helper.update(0)
    helper.enabled.ik = prevIK
    mesh.skeleton.update()
    mesh.updateMatrixWorld(true)
    updateMarkers()
    if (import.meta.env.DEV) {
      console.debug(`applyIKUpdate: ${(performance.now() - start).toFixed(2)}ms`)
    }
  }

  function scheduleIKUpdate() {
    if (ikUpdateScheduled) return
    ikUpdateScheduled = true
    requestAnimationFrame(() => {
      ikUpdateScheduled = false
      applyIKUpdate()
    })
  }

  function onPointerDown(event) {
    const rect = renderer.domElement.getBoundingClientRect()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects(
      ikTargets.map(t => t.marker),
      false
    )
    if (intersects.length === 0) {
      selectedIK.value = null
      return
    }
    const target = ikTargets.find(t => t.marker === intersects[0].object)
    if (!target) return
    selectedIK.value = target
    physicsWasEnabled = enablePhysics.value
    if (physicsWasEnabled) {
      helper?.enable('physics', false)
      helper?.update(0)
    }
    if (event.button === 2) {
      event.preventDefault()
      isRotating = true
      controls.enabled = false
      renderer.domElement.addEventListener('pointermove', onPointerMove)
      renderer.domElement.addEventListener('pointerup', onPointerUp)
      renderer.domElement.addEventListener('pointercancel', onPointerUp)
      renderer.domElement.addEventListener('pointerleave', onPointerUp)
      return
    }
    if (event.button !== 0) return
    const pos = new THREE.Vector3()
    const targetBone = selectedIK.value.target
    targetBone.getWorldPosition(pos)
    const normal = new THREE.Vector3()
    camera.getWorldDirection(normal)
    dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, pos)
    controls.enabled = false
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('pointercancel', onPointerUp)
    renderer.domElement.addEventListener('pointerleave', onPointerUp)
  }

  function onPointerMove(event) {
    if (!selectedIK.value) {
      onPointerUp()
      return
    }
    if (isRotating) {
      const bone = selectedIK.value.target
      let rotationAxis = bone.userData?.localAxes?.xAxis
      if (rotationAxis) {
        rotationAxis = adjustAxis(rotationAxis, [0, 1, 2], [1, 1, -1]).normalize()
        const angle = event.movementX * 0.01
        _quat.setFromAxisAngle(rotationAxis, angle)
        applyLocalAxisRotation(bone, _quat)
        bone.updateMatrixWorld(true)
        currentMeshRef.value?.skeleton?.update()
        currentMeshRef.value?.updateMatrixWorld(true)
        scheduleIKUpdate()
      }
      return
    }
    if (!dragPlane) return
    const rect = renderer.domElement.getBoundingClientRect()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
    if (raycaster.ray.intersectPlane(dragPlane, _dragPoint)) {
      const target = selectedIK.value.target
      if (target) {
        target.parent.worldToLocal(_dragPoint)
        target.position.copy(_dragPoint)
        target.updateMatrixWorld(true)
        currentMeshRef.value?.skeleton?.update()
        currentMeshRef.value?.updateMatrixWorld(true)
        scheduleIKUpdate()
      }
    }
  }

  function onPointerUp() {
    const dom = renderer.domElement
    dom.removeEventListener('pointermove', onPointerMove)
    dom.removeEventListener('pointerup', onPointerUp)
    dom.removeEventListener('pointercancel', onPointerUp)
    dom.removeEventListener('pointerleave', onPointerUp)
    controls.enabled = true
    if (isRotating) {
      isRotating = false
    }
    dragPlane = null
    if (physicsWasEnabled) {
      const mesh = currentMeshRef.value
      helper?.enable('physics', true)
      helper?.objects.get(mesh)?.physics?.reset()
      helper?.update(0)
      physicsWasEnabled = false
    }
    selectedIK.value = null
    applyIKUpdate()
  }

  function onControlStart() {
    physicsWasEnabled = enablePhysics.value
    if (physicsWasEnabled) {
      helper?.enable('physics', false)
    }
  }

  function onControlEnd() {
    if (physicsWasEnabled) {
      const mesh = currentMeshRef.value
      helper?.enable('physics', true)
      helper?.objects.get(mesh)?.physics?.reset()
      physicsWasEnabled = false
    }
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onControlStart,
    onControlEnd,
    applyIKUpdate,
    scheduleIKUpdate,
    updateMarkers
  }
}
