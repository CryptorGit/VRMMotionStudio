import { markRaw } from 'vue'
import { MMDAnimationHelper } from 'three/examples/jsm/animation/MMDAnimationHelper.js'
// Use Three.js-provided Ammo WASM wrapper
import * as AmmoModule from 'three/examples/jsm/libs/ammo.wasm.js'
// Ensure Vite serves the WASM binary correctly
import ammoWasmUrl from 'three/examples/jsm/libs/ammo.wasm.wasm?url'

export function useAmmoInit({ helper, enablePhysics, setAmmo, ensureFloorRigidBody }) {
  async function init() {
    // Dev log helper
    const devLog = data => {
      try {
        if (typeof fetch === 'function' && typeof window !== 'undefined') {
          fetch('/__dev__/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: 'ammo', ...data })
          }).catch(() => {})
        }
      } catch {}
    }
    devLog({ event: 'ammo:init:start' })
    const AmmoLib = await AmmoModule.default({
      locateFile: file => (file.endsWith('.wasm') ? ammoWasmUrl : file)
    })
    // Set both app-level reference and global for THREE.MMDPhysics
    const ammo = setAmmo(AmmoLib)
    try {
      // THREE.MMDPhysics expects global Ammo symbol
      ;(globalThis || window).Ammo = AmmoLib
      devLog({ event: 'ammo:global-set', ok: !!(globalThis && globalThis.Ammo) })
    } catch (e) {
      devLog({ event: 'ammo:global-set:error', message: String(e && e.message) })
    }
    helper.value = markRaw(new MMDAnimationHelper())
    try {
      helper.value.enable('physics', enablePhysics.value)
      helper.value.enabled.ik = true
      devLog({ event: 'ammo:helper:enabled', physics: enablePhysics.value })
    } catch (e) {
      devLog({ event: 'ammo:helper:error', message: String(e && e.message) })
    }
    ensureFloorRigidBody()
    devLog({ event: 'ammo:init:ok' })
    return ammo
  }

  function cleanup() {
    helper.value = null
  }

  return { init, cleanup }
}

