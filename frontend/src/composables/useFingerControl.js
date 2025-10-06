import { watch } from 'vue'
import * as THREE from 'three'

// Finger bone mappings for VRM (using VRM humanoid bone names)
const FINGER_BONES = {
  left: {
    thumb: ['leftThumbMetacarpal', 'leftThumbProximal', 'leftThumbDistal'],
    index: ['leftIndexProximal', 'leftIndexIntermediate', 'leftIndexDistal'],
    middle: ['leftMiddleProximal', 'leftMiddleIntermediate', 'leftMiddleDistal'],
    ring: ['leftRingProximal', 'leftRingIntermediate', 'leftRingDistal'],
    little: ['leftLittleProximal', 'leftLittleIntermediate', 'leftLittleDistal']
  },
  right: {
    thumb: ['rightThumbMetacarpal', 'rightThumbProximal', 'rightThumbDistal'],
    index: ['rightIndexProximal', 'rightIndexIntermediate', 'rightIndexDistal'],
    middle: ['rightMiddleProximal', 'rightMiddleIntermediate', 'rightMiddleDistal'],
    ring: ['rightRingProximal', 'rightRingIntermediate', 'rightRingDistal'],
    little: ['rightLittleProximal', 'rightLittleIntermediate', 'rightLittleDistal']
  }
}

export function useFingerControl(fingerStates, getActiveModel) {
  // Store initial bone rotations per model
  const initialRotations = new WeakMap()
  
  function captureInitialRotations(model, humanoid) {
    if (!humanoid || !model) return
    if (initialRotations.has(model)) return // Already captured for this model
    
    const rotations = {}
    const allBones = [...Object.values(FINGER_BONES.left), ...Object.values(FINGER_BONES.right)].flat()
    
    allBones.forEach(boneName => {
      const bone = humanoid.getRawBoneNode(boneName)
      if (bone) {
        rotations[boneName] = bone.quaternion.clone()
      }
    })
    
    initialRotations.set(model, rotations)
  }
  
  function applyFingerPose() {
    const model = getActiveModel?.()
    if (!model?.vrm?.humanoid) {
      console.log('[FingerControl] No active model or humanoid')
      return
    }
    
    const humanoid = model.vrm.humanoid
    console.log('[FingerControl] Applying finger pose to model:', model)
    
    // Capture initial rotations on first call for this model
    captureInitialRotations(model, humanoid)
    
    // Apply left hand fingers
    Object.keys(FINGER_BONES.left).forEach(finger => {
      const key = `left_${finger}`
      const value = fingerStates[key] || 0
      if (value > 0) console.log(`[FingerControl] ${key}: ${value}`)
      applyFingerCurl(model, 'left', finger, value, humanoid)
    })
    
    // Apply right hand fingers
    Object.keys(FINGER_BONES.right).forEach(finger => {
      const key = `right_${finger}`
      const value = fingerStates[key] || 0
      if (value > 0) console.log(`[FingerControl] ${key}: ${value}`)
      applyFingerCurl(model, 'right', finger, value, humanoid)
    })
  }
  
  function applyFingerCurl(model, hand, finger, amount, humanoid) {
    const boneNames = FINGER_BONES[hand][finger]
    if (!boneNames) return
    
    const savedRotations = initialRotations.get(model) || {}
    
    // Apply to each bone in the finger (3 bones per finger)
    boneNames.forEach((boneName, index) => {
      const bone = humanoid.getRawBoneNode(boneName)
      if (!bone) return
      
      // Restore initial rotation
      const initialRot = savedRotations[boneName]
      if (initialRot) {
        bone.quaternion.copy(initialRot)
      } else {
        bone.quaternion.identity()
      }
      
      // 0〜90度の範囲で均等に回転 (amount: 0-1)
      const maxAngleDeg = 90
      const targetAngleDeg = maxAngleDeg * amount
      const targetAngleRad = THREE.MathUtils.degToRad(targetAngleDeg)
      
      // Create rotation quaternion
      // Z軸で回転（指を曲げる）
      const rotationQuat = new THREE.Quaternion()
      rotationQuat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -targetAngleRad)
      
      // Apply rotation
      bone.quaternion.multiply(rotationQuat)
    })
  }
  
  // Watch for changes in finger states
  if (fingerStates) {
    watch(() => fingerStates, () => {
      applyFingerPose()
    }, { deep: true })
  }
  
  return {
    applyFingerPose
  }
}
