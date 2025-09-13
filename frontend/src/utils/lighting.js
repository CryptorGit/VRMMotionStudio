import { ref, watch } from 'vue'
import * as THREE from 'three'
import { STORAGE_KEY } from '../config.js'

export const ambientLight = ref(new THREE.AmbientLight(0x666666))
export const directionalLight = ref(new THREE.DirectionalLight(0xffffff))
directionalLight.value.position.set(0, 0, 0)
directionalLight.value.target.position.set(1, 0, 0)

export const lightMarkerColor = ref('#ff0000')
export const LIGHT_MARKER_LENGTH = 0.2
export const directionalLightHelper = new THREE.DirectionalLightHelper(
  directionalLight.value,
  LIGHT_MARKER_LENGTH,
  lightMarkerColor.value
)
directionalLightHelper.visible = false

export const directionalIntensity = ref(directionalLight.value.intensity)
export const showLightMarker = ref(false)

function safeWatch(handler, message) {
  return (...args) => {
    try {
      handler(...args)
    } catch (e) {
      console.error(message, e)
    }
  }
}

export function loadLightingSettings(opts = {}) {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return
  try {
    const data = JSON.parse(saved)
    if (data.markerColor !== undefined) lightMarkerColor.value = data.markerColor
    if (data.showLightMarker !== undefined) showLightMarker.value = data.showLightMarker
    if (data.directionalIntensity !== undefined)
      directionalIntensity.value = data.directionalIntensity
    if (data.directional?.position) {
      const p = data.directional.position
      directionalLight.value.position.set(
        p.x ?? directionalLight.value.position.x,
        p.y ?? directionalLight.value.position.y,
        p.z ?? directionalLight.value.position.z
      )
    }
    if (data.directional?.target) {
      const t = data.directional.target
      directionalLight.value.target.position.set(
        t.x ?? directionalLight.value.target.position.x,
        t.y ?? directionalLight.value.target.position.y,
        t.z ?? directionalLight.value.target.position.z
      )
    }
  } catch (e) {
    console.error('Failed to load lighting settings:', e)
  }
}

watch(
  showLightMarker,
  safeWatch(
    v => {
      directionalLightHelper.visible = v
    },
    'Failed to toggle light marker:'
  )
)

watch(
  lightMarkerColor,
  safeWatch(
    c => {
      directionalLightHelper.color = new THREE.Color(c)
      directionalLightHelper.update()
    },
    'Failed to set light marker color:'
  )
)

watch(
  () => [
    directionalLight.value.position.x,
    directionalLight.value.position.y,
    directionalLight.value.position.z,
    directionalLight.value.target.position.x,
    directionalLight.value.target.position.y,
    directionalLight.value.target.position.z
  ],
  safeWatch(
    () => {
      directionalLightHelper.update()
    },
    'Failed to update light marker position:'
  )
)

watch(
  directionalIntensity,
  safeWatch(
    i => {
      directionalLight.value.intensity = i
      directionalLightHelper.scale.setScalar(LIGHT_MARKER_LENGTH * i)
      directionalLightHelper.update()
    },
    'Failed to update light marker intensity:'
  )
)
