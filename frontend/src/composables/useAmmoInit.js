import { markRaw } from 'vue'
import { MMDAnimationHelper } from 'three/examples/jsm/animation/MMDAnimationHelper.js'
// Use Three.js-provided Ammo WASM wrapper
import * as AmmoModule from 'three/examples/jsm/libs/ammo.wasm.js'
// Ensure Vite serves the WASM binary correctly
import ammoWasmUrl from 'three/examples/jsm/libs/ammo.wasm.wasm?url'

export function useAmmoInit({ helper, enablePhysics, setAmmo, ensureFloorRigidBody }) {
  async function init() {
    const AmmoLib = await AmmoModule.default({
      locateFile: file => (file.endsWith('.wasm') ? ammoWasmUrl : file)
    })
    setAmmo(AmmoLib)
    helper.value = markRaw(new MMDAnimationHelper())
    helper.value.enable('physics', enablePhysics.value)
    helper.value.enabled.ik = false
    ensureFloorRigidBody()
  }

  function cleanup() {
    helper.value = null
  }

  return { init, cleanup }
}

