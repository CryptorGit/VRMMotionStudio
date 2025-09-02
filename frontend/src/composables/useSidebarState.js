import { ref, reactive, onMounted, watchEffect, computed } from 'vue'
import { STORAGE_KEY } from '../config.js'

export function useSidebarState({
  width,
  showLightMarker,
  showIkMarkers,
  enablePhysics,
  markerColor,
  directionalIntensity,
  directional
}) {
  const collapsed = ref(false)
  const visibleSections = reactive({
    lighting: false,
    morph: false,
    models: false
  })

  function hideSection(section) {
    visibleSections[section] = false
  }

  const hasSections = computed(() =>
    Object.values(visibleSections).some(Boolean)
  )

  function saveState() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        collapsed: collapsed.value,
        width: width?.value,
        visibleSections: { ...visibleSections },
        showLightMarker: showLightMarker?.value,
        showIkMarkers: showIkMarkers?.value,
        enablePhysics: enablePhysics?.value,
        markerColor: markerColor?.value,
        directionalIntensity: directionalIntensity?.value,
        directional: directional
          ? {
              position: {
                x: directional.value.position.x,
                y: directional.value.position.y,
                z: directional.value.position.z
              },
              target: {
                x: directional.value.target.position.x,
                y: directional.value.target.position.y,
                z: directional.value.target.position.z
              }
            }
          : undefined
      })
    )
  }

  let saveStateTimeout
  function scheduleSaveState() {
    clearTimeout(saveStateTimeout)
    saveStateTimeout = setTimeout(saveState, 200)
  }

  onMounted(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const {
          collapsed: savedCollapsed,
          width: savedWidth,
          visibleSections: savedVisible,
          showLightMarker: savedShowMarker,
          showIkMarkers: savedShowIk,
          enablePhysics: savedEnablePhysics,
          markerColor: savedMarkerColor,
          directionalIntensity: savedDirectionalIntensity,
          directional: savedDirectional
        } = JSON.parse(saved)

        collapsed.value = savedCollapsed ?? false
        if (width) width.value = savedWidth ?? width.value
        if (savedVisible) {
          visibleSections.lighting = savedVisible.lighting ?? false
          visibleSections.morph = savedVisible.morph ?? false
          visibleSections.models = savedVisible.models ?? false
        }
        if (showLightMarker && savedShowMarker !== undefined)
          showLightMarker.value = savedShowMarker
        if (showIkMarkers && savedShowIk !== undefined)
          showIkMarkers.value = savedShowIk
        if (enablePhysics && savedEnablePhysics !== undefined)
          enablePhysics.value = savedEnablePhysics
        if (markerColor && savedMarkerColor !== undefined)
          markerColor.value = savedMarkerColor
        if (directionalIntensity && savedDirectionalIntensity !== undefined)
          directionalIntensity.value = savedDirectionalIntensity
        if (directional && savedDirectional?.position) {
          const p = savedDirectional.position
          directional.value.position.set(
            p.x ?? directional.value.position.x,
            p.y ?? directional.value.position.y,
            p.z ?? directional.value.position.z
          )
        }
        if (directional && savedDirectional?.target) {
          const t = savedDirectional.target
          directional.value.target.position.set(
            t.x ?? directional.value.target.position.x,
            t.y ?? directional.value.target.position.y,
            t.z ?? directional.value.target.position.z
          )
        }
      } catch (_) {
        // ignore parse errors
      }
    }
  })

  watchEffect(() => {
    collapsed.value
    width && width.value
    showLightMarker && showLightMarker.value
    showIkMarkers && showIkMarkers.value
    enablePhysics && enablePhysics.value
    markerColor && markerColor.value
    directionalIntensity && directionalIntensity.value
    JSON.stringify(visibleSections)
    if (directional) {
      directional.value.position.x
      directional.value.position.y
      directional.value.position.z
      directional.value.target.position.x
      directional.value.target.position.y
      directional.value.target.position.z
    }
    scheduleSaveState()
  })

  return { collapsed, visibleSections, hideSection, hasSections }
}
