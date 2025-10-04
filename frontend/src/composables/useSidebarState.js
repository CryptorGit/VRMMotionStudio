import { ref, reactive, onMounted, watchEffect, computed } from 'vue'
import { STORAGE_KEY } from '../config.js'

export function useSidebarState({
  width,
  showLightMarker,
  springBoneEnabled,
  lookAtEnabled,
  showExtendedBones,
  showColliderNodes,
  showNonDeformingBones,
  highlightConstraint,
  showPhysicalBones,
  showOtherBones,
  boneDotSize,
  boneLabelScale,
  markerColor,
  directionalIntensity,
  directional,
  // optional virtual tracker bindings
  virtualTrackersEnabled,
  showVirtualTrackerLabels,
  virtualTrackerSize,
  virtualTrackerLabelScale
}) {
  const collapsed = ref(false)
  const visibleSections = reactive({
    lighting: false,
    morph: false,
    models: false,
    display: false,
    physics: false
  })

  // Optional global master toggles for bone visibility state across models.
  // These are UI-level preferences to keep the checkboxes sticky across reloads
  // when models are restored.
  const masterBonesVisible = ref(undefined) // undefined = derive from models
  const masterBoneNamesVisible = ref(undefined)

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
  masterBonesVisible: masterBonesVisible.value,
  masterBoneNamesVisible: masterBoneNamesVisible.value,
        showLightMarker: showLightMarker?.value,
        springBoneEnabled: springBoneEnabled?.value,
  lookAtEnabled: lookAtEnabled?.value,
  showExtendedBones: showExtendedBones?.value,
  showColliderNodes: showColliderNodes?.value,
  showNonDeformingBones: showNonDeformingBones?.value,
  highlightConstraint: highlightConstraint?.value,
        showPhysicalBones: showPhysicalBones?.value,
        showOtherBones: showOtherBones?.value,
        boneDotSize: boneDotSize?.value,
        boneLabelScale: boneLabelScale?.value,
  virtualTrackersEnabled: virtualTrackersEnabled?.value,
  showVirtualTrackerLabels: showVirtualTrackerLabels?.value,
  virtualTrackerSize: virtualTrackerSize?.value,
  virtualTrackerLabelScale: virtualTrackerLabelScale?.value,
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
          masterBonesVisible: savedMasterBonesVisible,
          masterBoneNamesVisible: savedMasterBoneNamesVisible,
          showLightMarker: savedShowMarker,
          springBoneEnabled: savedSpringBoneEnabled,
          lookAtEnabled: savedLookAtEnabled,
          showExtendedBones: savedShowExtendedBones,
          showColliderNodes: savedShowColliderNodes,
          showNonDeformingBones: savedShowNonDeformingBones,
          highlightConstraint: savedHighlightConstraint,
          // virtual tracker UI state
          virtualTrackersEnabled: savedVirtualTrackersEnabled,
          showVirtualTrackerLabels: savedShowVirtualTrackerLabels,
          virtualTrackerSize: savedVirtualTrackerSize,
          virtualTrackerLabelScale: savedVirtualTrackerLabelScale,
          showPhysicalBones: savedShowPhysicalBones,
          showOtherBones: savedShowOtherBones,
          boneDotSize: savedBoneDotSize,
          boneLabelScale: savedBoneLabelScale,
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
          visibleSections.display = savedVisible.display ?? false
          visibleSections.physics = savedVisible.physics ?? false
        }
  masterBonesVisible.value = savedMasterBonesVisible
  masterBoneNamesVisible.value = savedMasterBoneNamesVisible
        if (showLightMarker && savedShowMarker !== undefined)
          showLightMarker.value = savedShowMarker
        if (springBoneEnabled && savedSpringBoneEnabled !== undefined)
          springBoneEnabled.value = savedSpringBoneEnabled
        if (lookAtEnabled && savedLookAtEnabled !== undefined)
          lookAtEnabled.value = savedLookAtEnabled
        if (showExtendedBones && savedShowExtendedBones !== undefined)
          showExtendedBones.value = savedShowExtendedBones
        if (showColliderNodes && savedShowColliderNodes !== undefined)
          showColliderNodes.value = savedShowColliderNodes
        if (showNonDeformingBones && savedShowNonDeformingBones !== undefined)
          showNonDeformingBones.value = savedShowNonDeformingBones
        if (highlightConstraint && savedHighlightConstraint !== undefined)
          highlightConstraint.value = savedHighlightConstraint
        if (virtualTrackersEnabled && savedVirtualTrackersEnabled !== undefined)
          virtualTrackersEnabled.value = savedVirtualTrackersEnabled
        if (showVirtualTrackerLabels && savedShowVirtualTrackerLabels !== undefined)
          showVirtualTrackerLabels.value = savedShowVirtualTrackerLabels
        if (virtualTrackerSize && savedVirtualTrackerSize !== undefined)
          virtualTrackerSize.value = savedVirtualTrackerSize
        if (virtualTrackerLabelScale && savedVirtualTrackerLabelScale !== undefined)
          virtualTrackerLabelScale.value = savedVirtualTrackerLabelScale
        if (showPhysicalBones && savedShowPhysicalBones !== undefined)
          showPhysicalBones.value = savedShowPhysicalBones
        if (showOtherBones && savedShowOtherBones !== undefined)
          showOtherBones.value = savedShowOtherBones
        if (boneDotSize && savedBoneDotSize !== undefined)
          boneDotSize.value = savedBoneDotSize
        if (boneLabelScale && savedBoneLabelScale !== undefined)
          boneLabelScale.value = savedBoneLabelScale
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
    springBoneEnabled && springBoneEnabled.value
    lookAtEnabled && lookAtEnabled.value
  showExtendedBones && showExtendedBones.value
  showColliderNodes && showColliderNodes.value
  showNonDeformingBones && showNonDeformingBones.value
  highlightConstraint && highlightConstraint.value
  virtualTrackersEnabled && virtualTrackersEnabled.value
  showVirtualTrackerLabels && showVirtualTrackerLabels.value
  virtualTrackerSize && virtualTrackerSize.value
  virtualTrackerLabelScale && virtualTrackerLabelScale.value
    showPhysicalBones && showPhysicalBones.value
    showOtherBones && showOtherBones.value
    boneDotSize && boneDotSize.value
    boneLabelScale && boneLabelScale.value
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


