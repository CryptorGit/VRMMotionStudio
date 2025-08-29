import * as THREE from 'three'

export default class BoneManipulator {
  constructor(camera, domElement, scene) {
    this.camera = camera
    this.domElement = domElement
    this.scene = scene

    this.raycaster = new THREE.Raycaster()
    this.plane = new THREE.Plane()
    this.pointer = new THREE.Vector2()
    this.offset = new THREE.Vector3()
    this.intersection = new THREE.Vector3()

    this.bone = null
    this.dragging = false

    this.helper = new THREE.AxesHelper(0.5)

    this._onPointerDown = this.onPointerDown.bind(this)
    this._onPointerMove = this.onPointerMove.bind(this)
    this._onPointerUp = this.onPointerUp.bind(this)
  }

  activate() {
    this.domElement.addEventListener('pointerdown', this._onPointerDown)
    this.domElement.addEventListener('pointermove', this._onPointerMove)
    this.domElement.addEventListener('pointerup', this._onPointerUp)
  }

  deactivate() {
    this.domElement.removeEventListener('pointerdown', this._onPointerDown)
    this.domElement.removeEventListener('pointermove', this._onPointerMove)
    this.domElement.removeEventListener('pointerup', this._onPointerUp)
    this.detach()
  }

  selectBone(bone) {
    this.bone = bone
    const pos = new THREE.Vector3()
    bone.getWorldPosition(pos)
    this.helper.position.copy(pos)
    this.scene.add(this.helper)
  }

  detach() {
    if (this.helper.parent) this.helper.parent.remove(this.helper)
    this.bone = null
  }

  getMouse(event) {
    const rect = this.domElement.getBoundingClientRect()
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  onPointerDown(event) {
    if (!this.bone) return
    this.getMouse(event)
    const boneWorldPos = new THREE.Vector3()
    this.bone.getWorldPosition(boneWorldPos)
    const normal = boneWorldPos.clone().sub(this.camera.position).normalize()
    this.plane.setFromNormalAndCoplanarPoint(normal, boneWorldPos)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    if (this.raycaster.ray.intersectPlane(this.plane, this.intersection)) {
      this.offset.copy(this.intersection).sub(boneWorldPos)
    }
    this.dragging = true
  }

  onPointerMove(event) {
    if (!this.dragging || !this.bone) return
    this.getMouse(event)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    if (this.raycaster.ray.intersectPlane(this.plane, this.intersection)) {
      const target = this.intersection.sub(this.offset)
      const parent = this.bone.parent
      if (parent) {
        const local = parent.worldToLocal(target.clone())
        this.bone.position.copy(local)
      } else {
        this.bone.position.copy(target)
      }
      const parentPos = new THREE.Vector3()
      if (parent) parent.getWorldPosition(parentPos)
      const dir = target.clone().sub(parentPos).normalize()
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir)
      this.bone.quaternion.copy(quat)
      this.helper.position.copy(target)
    }
  }

  onPointerUp() {
    this.dragging = false
  }
}

