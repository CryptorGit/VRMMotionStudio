import { watch } from 'vue'

export function useIkPhysics({ helper, enablePhysics }) {
  let Ammo = null
  let floorRigidBody = null
  let floorBodyAdded = false
  let floorTransform = null
  let floorShape = null
  let floorMotionState = null
  let floorRbInfo = null

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

  function setAmmo(lib) {
    Ammo = lib
    globalThis.Ammo = lib
    return Ammo
  }

  watch(enablePhysics, v => {
    try {
      helper.value?.enable('physics', v)
      ensureFloorRigidBody()
    } catch (e) {
      console.error('Failed to toggle physics:', e)
    }
  })

  return { ensureFloorRigidBody, setAmmo }
}
