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
  virtualTrackerLabelScale,
  // 新規追加: トラッカー関連設定
  showTrackerAxes,
  trackerAxesLength,
  forearmTwistShare,
  // カメラ設定
  renderCameraFov,
  renderCameraNear,
  renderCameraFar,
  renderCameraWidth,
  renderCameraHeight,
  // 指の状態
  fingerStates
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
    const state = {
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
      // 新規追加項目
      showTrackerAxes: showTrackerAxes?.value,
      trackerAxesLength: trackerAxesLength?.value,
      forearmTwistShare: forearmTwistShare?.value,
      // カメラ設定
      renderCameraFov: renderCameraFov?.value,
      renderCameraNear: renderCameraNear?.value,
      renderCameraFar: renderCameraFar?.value,
      renderCameraWidth: renderCameraWidth?.value,
      renderCameraHeight: renderCameraHeight?.value,
      // 指の状態
      fingerStates: fingerStates ? { ...fingerStates } : undefined,
      markerColor: markerColor?.value,
      directionalIntensity: directionalIntensity?.value
    }
    
    if (directional?.value) {
      state.directional = {
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
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
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
          virtualTrackersEnabled: savedVirtualTrackersEnabled,
          showVirtualTrackerLabels: savedShowVirtualTrackerLabels,
          virtualTrackerSize: savedVirtualTrackerSize,
          virtualTrackerLabelScale: savedVirtualTrackerLabelScale,
          // 新規追加項目
          showTrackerAxes: savedShowTrackerAxes,
          trackerAxesLength: savedTrackerAxesLength,
          forearmTwistShare: savedForearmTwistShare,
          // カメラ設定
          renderCameraFov: savedRenderCameraFov,
          renderCameraNear: savedRenderCameraNear,
          renderCameraFar: savedRenderCameraFar,
          renderCameraWidth: savedRenderCameraWidth,
          renderCameraHeight: savedRenderCameraHeight,
          // 指の状態
          fingerStates: savedFingerStates,
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
        
        // 既存の設定復元
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
        
        // 新規追加項目の復元
        if (showTrackerAxes && savedShowTrackerAxes !== undefined)
          showTrackerAxes.value = savedShowTrackerAxes
        if (trackerAxesLength && savedTrackerAxesLength !== undefined)
          trackerAxesLength.value = savedTrackerAxesLength
        if (forearmTwistShare && savedForearmTwistShare !== undefined)
          forearmTwistShare.value = savedForearmTwistShare
        
        // カメラ設定の復元
        if (renderCameraFov && savedRenderCameraFov !== undefined)
          renderCameraFov.value = savedRenderCameraFov
        if (renderCameraNear && savedRenderCameraNear !== undefined)
          renderCameraNear.value = savedRenderCameraNear
        if (renderCameraFar && savedRenderCameraFar !== undefined)
          renderCameraFar.value = savedRenderCameraFar
        if (renderCameraWidth && savedRenderCameraWidth !== undefined)
          renderCameraWidth.value = savedRenderCameraWidth
        if (renderCameraHeight && savedRenderCameraHeight !== undefined)
          renderCameraHeight.value = savedRenderCameraHeight
        
        // 指の状態の復元
        if (fingerStates && savedFingerStates) {
          Object.assign(fingerStates, savedFingerStates)
        }
        
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
    // 新規追加項目
    showTrackerAxes && showTrackerAxes.value
    trackerAxesLength && trackerAxesLength.value
    forearmTwistShare && forearmTwistShare.value
    // カメラ設定
    renderCameraFov && renderCameraFov.value
    renderCameraNear && renderCameraNear.value
    renderCameraFar && renderCameraFar.value
    renderCameraWidth && renderCameraWidth.value
    renderCameraHeight && renderCameraHeight.value
    // 指の状態（reactiveオブジェクトなのでJSON文字列化して変更検知）
    fingerStates && JSON.stringify(fingerStates)
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
