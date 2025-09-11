// Bone display policy configurable in one place.
// Types follow MMD conventions used in this app:
// 0: Rotation, 1: Rotation+Translation, 2: IK, 3: Unknown,
// 4: Under-IK, 5: Rotation-Influenced (Grant), 6: IK-Link Target,
// 7: Non-display (Dummy), 8: Twist, 9: Rotation-Link

export const boneDisplayConfig = {
  // Visible types for all views (skeleton lines, labels, markers)
  showTypes: new Set([0, 1, 3, 4, 5, 6]),
  // Hidden types for all views
  hideTypes: new Set([2, 7, 8, 9])
}

export function isDisplayableBoneTypeNumber(typeNumber) {
  // If explicitly hidden, hide regardless of showTypes
  if (boneDisplayConfig.hideTypes.has(typeNumber)) return false
  return boneDisplayConfig.showTypes.has(typeNumber)
}

