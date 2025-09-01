import { ref, watch } from 'vue'
import * as THREE from 'three'
import { adjustAxis, applyLocalAxisRotation } from '../utils/bones.js'
import {
  showIkMarkers,
  selectedIK,
  ikTargets,
  ikConfigPromise,
  setupIKTargets,
  updateIKMarkers,
  initIKSolver
} from '../utils/ik.js'

export function useIkControls({ scene, camera, renderer, controls, helper, currentMeshRef, enablePhysics }) {
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()
  let dragPlane = null
  const dragPoint = new THREE.Vector3()
  let isRotating = false
  const quat = new THREE.Quaternion()
  let physicsWasEnabled = false
  let ikUpdateScheduled = false
  const ikInitializedMeshes = new WeakSet()
  const updateIKMarkersBound = ref(null)

  let Ammo = null
  let floorRigidBody = null
  let floorBodyAdded = false
  let floorTransform = null
  let floorShape = null
  let floorMotionState = null
  let floorRbInfo = null

  watch(showIkMarkers, () => {
    try {
      updateIKMarkersBound.value?.()
    } catch (e) {
      console.error('Failed to toggle IK markers:', e)
    }
  })

  watch(enablePhysics, v => {
    try {
      helper.value?.enable('physics', v)
      ensureFloorRigidBody()
    } catch (e) {
      console.error('Failed to toggle physics:', e)
    }
  })

  watch(currentMeshRef, mesh => {
    setupIKTargets(scene.value, mesh)
    ikConfigPromise.then(() => {
      if (currentMeshRef.value === mesh) setupIKTargets(scene.value, mesh)
      if (mesh && !ikInitializedMeshes.has(mesh)) {
        initIKSolver(helper.value, mesh, ensureFloorRigidBody)
        ikInitializedMeshes.add(mesh)
      }
    })
  })

  function ensureFloorRigidBody() {
    if (!enablePhysics.value || !helper.value?.physics?.world || !Ammo) {
      if (floorBodyAdded) {
        helper.value.physics.world.removeRigidBody(floorRigidBody)
        Ammo.destroy(floorRigidBody)
        Ammo.destroy(floorRbInfo)
        Ammo.destroy(floorMotionState)
        Ammo.destroy(floorShape)
        Ammo.destroy(floorTransform)
        floorRigidBody = null
        floorRbInfo = null
        floorMotionState = null
        floorShape = null
        floorTransform = null
        floorBodyAdded = false
      }
      return
    }
    if (floorBodyAdded) return
    const halfSize = 20
    const halfHeight = 0.5
    floorTransform = new Ammo.btTransform()
    floorTransform.setIdentity()
    const origin = new Ammo.btVector3(0, -halfHeight, 0)
    floorTransform.setOrigin(origin)
    Ammo.destroy(origin)
    const halfExtents = new Ammo.btVector3(halfSize, halfHeight, halfSize)
    floorShape = new Ammo.btBoxShape(halfExtents)
    Ammo.destroy(halfExtents)
    floorMotionState = new Ammo.btDefaultMotionState(floorTransform)
    const inertia = new Ammo.btVector3(0, 0, 0)
    floorRbInfo = new Ammo.btRigidBodyConstructionInfo(0, floorMotionState, floorShape, inertia)
    Ammo.destroy(inertia)
    floorRigidBody = new Ammo.btRigidBody(floorRbInfo)
    helper.value.physics.world.addRigidBody(floorRigidBody)
    floorBodyAdded = true
  }

  function applyIKUpdate() {
    const mesh = currentMeshRef.value
    if (import.meta.env.DEV && !(mesh instanceof THREE.SkinnedMesh)) {
      console.warn('currentMeshRef should point to a SkinnedMesh', mesh)
    }
    if (!mesh || !(mesh instanceof THREE.SkinnedMesh) || !helper.value) return
    const prevIK = helper.value.enabled.ik
    helper.value.enabled.ik = true
    helper.value.update(0)
    helper.value.enabled.ik = prevIK
    mesh.skeleton.update()
    mesh.updateMatrixWorld(true)
    updateIKMarkersBound.value?.()
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
      isRotating = true
      controls.value.enabled = false
      renderer.value.domElement.addEventListener('pointermove', onPointerMove)
      renderer.value.domElement.addEventListener('pointerup', onPointerUp)
      renderer.value.domElement.addEventListener('pointercancel', onPointerUp)
      renderer.value.domElement.addEventListener('pointerleave', onPointerUp)
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
    renderer.value.domElement.addEventListener('pointermove', onPointerMove)
    renderer.value.domElement.addEventListener('pointerup', onPointerUp)
    renderer.value.domElement.addEventListener('pointercancel', onPointerUp)
    renderer.value.domElement.addEventListener('pointerleave', onPointerUp)
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
        quat.setFromAxisAngle(rotationAxis, angle)
        applyLocalAxisRotation(bone, quat)
        bone.updateMatrixWorld(true)
        currentMeshRef.value?.skeleton?.update()
        currentMeshRef.value?.updateMatrixWorld(true)
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
        target.parent.worldToLocal(dragPoint)
        target.position.copy(dragPoint)
        target.updateMatrixWorld(true)
        currentMeshRef.value?.skeleton?.update()
        currentMeshRef.value?.updateMatrixWorld(true)
        scheduleIKUpdate()
      }
    }
  }

  function onPointerUp() {
    const dom = renderer.value.domElement
    dom.removeEventListener('pointermove', onPointerMove)
    dom.removeEventListener('pointerup', onPointerUp)
    dom.removeEventListener('pointercancel', onPointerUp)
    dom.removeEventListener('pointerleave', onPointerUp)
    controls.value.enabled = true
    if (isRotating) {
      isRotating = false
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

  function setAmmo(lib) {
    Ammo = lib
  }

  function initUpdateIKMarkers() {
    updateIKMarkersBound.value = () => updateIKMarkers(camera.value, renderer.value, raycaster)
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onControlStart,
    onControlEnd,
    ensureFloorRigidBody,
    updateIKMarkersBound,
    setAmmo,
    initUpdateIKMarkers
  }
}
