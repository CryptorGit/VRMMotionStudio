import * as THREE from 'three'

// Finger bone mappings for VRM (using VRM humanoid bone names)
// 各指に対して複数のボーン名候補を用意（VRMモデルによって異なる名前が使われる場合がある）
const FINGER_BONES = {
  left: {
    thumb: [
      ['leftThumbProximal', 'leftThumbIntermediate', 'leftThumbDistal'],
      ['leftThumbMetacarpal', 'leftThumbProximal', 'leftThumbDistal'],
      ['LeftHandThumb1', 'LeftHandThumb2', 'LeftHandThumb3'],
      ['J_Bip_L_ThumbMetacarpal', 'J_Bip_L_Thumb1', 'J_Bip_L_Thumb2', 'J_Bip_L_Thumb3'],
      ['J_Bip_L_Thumb1', 'J_Bip_L_Thumb2', 'J_Bip_L_Thumb3']
    ],
    index: [
      ['leftIndexProximal', 'leftIndexIntermediate', 'leftIndexDistal'],
      ['LeftHandIndex1', 'LeftHandIndex2', 'LeftHandIndex3'],
      ['J_Bip_L_IndexMetacarpal', 'J_Bip_L_Index1', 'J_Bip_L_Index2', 'J_Bip_L_Index3'],
      ['J_Bip_L_Index1', 'J_Bip_L_Index2', 'J_Bip_L_Index3']
    ],
    middle: [
      ['leftMiddleProximal', 'leftMiddleIntermediate', 'leftMiddleDistal'],
      ['LeftHandMiddle1', 'LeftHandMiddle2', 'LeftHandMiddle3'],
      ['J_Bip_L_MiddleMetacarpal', 'J_Bip_L_Middle1', 'J_Bip_L_Middle2', 'J_Bip_L_Middle3'],
      ['J_Bip_L_Middle1', 'J_Bip_L_Middle2', 'J_Bip_L_Middle3']
    ],
    ring: [
      ['leftRingProximal', 'leftRingIntermediate', 'leftRingDistal'],
      ['LeftHandRing1', 'LeftHandRing2', 'LeftHandRing3'],
      ['J_Bip_L_RingMetacarpal', 'J_Bip_L_Ring1', 'J_Bip_L_Ring2', 'J_Bip_L_Ring3'],
      ['J_Bip_L_Ring1', 'J_Bip_L_Ring2', 'J_Bip_L_Ring3']
    ],
    little: [
      ['leftLittleProximal', 'leftLittleIntermediate', 'leftLittleDistal'],
      ['LeftHandPinky1', 'LeftHandPinky2', 'LeftHandPinky3'],
      ['J_Bip_L_LittleMetacarpal', 'J_Bip_L_Little1', 'J_Bip_L_Little2', 'J_Bip_L_Little3'],
      ['J_Bip_L_Little1', 'J_Bip_L_Little2', 'J_Bip_L_Little3'],
      ['J_Bip_L_Pinky1', 'J_Bip_L_Pinky2', 'J_Bip_L_Pinky3']
    ]
  },
  right: {
    thumb: [
      ['rightThumbProximal', 'rightThumbIntermediate', 'rightThumbDistal'],
      ['rightThumbMetacarpal', 'rightThumbProximal', 'rightThumbDistal'],
      ['RightHandThumb1', 'RightHandThumb2', 'RightHandThumb3'],
      ['J_Bip_R_ThumbMetacarpal', 'J_Bip_R_Thumb1', 'J_Bip_R_Thumb2', 'J_Bip_R_Thumb3'],
      ['J_Bip_R_Thumb1', 'J_Bip_R_Thumb2', 'J_Bip_R_Thumb3']
    ],
    index: [
      ['rightIndexProximal', 'rightIndexIntermediate', 'rightIndexDistal'],
      ['RightHandIndex1', 'RightHandIndex2', 'RightHandIndex3'],
      ['J_Bip_R_IndexMetacarpal', 'J_Bip_R_Index1', 'J_Bip_R_Index2', 'J_Bip_R_Index3'],
      ['J_Bip_R_Index1', 'J_Bip_R_Index2', 'J_Bip_R_Index3']
    ],
    middle: [
      ['rightMiddleProximal', 'rightMiddleIntermediate', 'rightMiddleDistal'],
      ['RightHandMiddle1', 'RightHandMiddle2', 'RightHandMiddle3'],
      ['J_Bip_R_MiddleMetacarpal', 'J_Bip_R_Middle1', 'J_Bip_R_Middle2', 'J_Bip_R_Middle3'],
      ['J_Bip_R_Middle1', 'J_Bip_R_Middle2', 'J_Bip_R_Middle3']
    ],
    ring: [
      ['rightRingProximal', 'rightRingIntermediate', 'rightRingDistal'],
      ['RightHandRing1', 'RightHandRing2', 'RightHandRing3'],
      ['J_Bip_R_RingMetacarpal', 'J_Bip_R_Ring1', 'J_Bip_R_Ring2', 'J_Bip_R_Ring3'],
      ['J_Bip_R_Ring1', 'J_Bip_R_Ring2', 'J_Bip_R_Ring3']
    ],
    little: [
      ['rightLittleProximal', 'rightLittleIntermediate', 'rightLittleDistal'],
      ['RightHandPinky1', 'RightHandPinky2', 'RightHandPinky3'],
      ['J_Bip_R_LittleMetacarpal', 'J_Bip_R_Little1', 'J_Bip_R_Little2', 'J_Bip_R_Little3'],
      ['J_Bip_R_Little1', 'J_Bip_R_Little2', 'J_Bip_R_Little3'],
      ['J_Bip_R_Pinky1', 'J_Bip_R_Pinky2', 'J_Bip_R_Pinky3']
    ]
  }
}

export function useFingerControl(fingerStates, getActiveModel) {
  // Store initial bone rotations per model
  const initialRotations = new WeakMap()
  // モデルごとに解決されたボーンマッピングをキャッシュ
  const resolvedBoneMappings = new WeakMap()

  function getHumanoidBone(humanoid, boneName) {
    if (!humanoid || !boneName) return null
    return humanoid.getRawBoneNode?.(boneName)
      || humanoid.getBoneNode?.(boneName)
      || humanoid.getNormalizedBoneNode?.(boneName)
      || null
  }
  
  // 指のボーンを厳密に特定する
  function findFingerBones(humanoid, hand, finger, handBone) {
    const candidates = FINGER_BONES[hand][finger]

    // まずVRM Humanoidから探す
    for (const boneNames of candidates) {
      if (!Array.isArray(boneNames) || !boneNames.length) continue
      const bones = []
      let allFound = true
      for (const boneName of boneNames) {
        const bone = getHumanoidBone(humanoid, boneName)
        if (bone) {
          bones.push(bone)
        } else {
          allFound = false
          break
        }
      }
      if (allFound && bones.length >= 2) {
        return bones
      }
    }

    // Humanoidで見つからなければ、手のボーンの子孫から名前で検索
    if (!handBone) {
      // 手のボーンが無ければルートから検索
      const root = humanoid?.vrm?.scene || humanoid?.scene || null
      if (!root) return null
      return searchFingerBonesInHierarchy(root, hand, finger, null)
    }

    // 手のボーンの子孫から検索
    const result = searchFingerBonesInHierarchy(handBone, hand, finger, handBone)
    if (result && result.length >= 2) {
      return result
    }

    // それでも見つからなければルート全体から検索
    const root = humanoid?.vrm?.scene || humanoid?.scene || null
    if (root && root !== handBone) {
      return searchFingerBonesInHierarchy(root, hand, finger, handBone)
    }

    return null
  }

  // 階層構造から指のボーンを名前で検索
  function searchFingerBonesInHierarchy(rootNode, hand, finger, handBone) {
    const fingerKey = finger.toLowerCase()
    const fingerAliases = new Set([fingerKey])
    if (fingerKey === 'little') fingerAliases.add('pinky')
    if (fingerKey === 'thumb') fingerAliases.add('pollex')
    const handAliases = hand === 'left'
      ? ['left', 'l_', 'lhand', 'l-', 'l.']
      : ['right', 'r_', 'rhand', 'r-', 'r.']

    const collected = []
    rootNode.traverse(node => {
      if (!node?.isBone || !node.name) return
      const lower = node.name.toLowerCase()
      const matchesHand = handAliases.some(alias => lower.includes(alias))
      const matchesFinger = Array.from(fingerAliases).some(alias => lower.includes(alias))
      if (matchesHand && matchesFinger) {
        collected.push(node)
      }
    })

    if (collected.length < 2) {
      return null
    }

    try { handBone?.updateWorldMatrix(true, false) } catch {}
    const palmPos = handBone ? handBone.getWorldPosition(new THREE.Vector3()) : null

    const ordered = collected
      .map(node => {
        try { node.updateWorldMatrix(true, false) } catch {}
        const dist = palmPos
          ? node.getWorldPosition(new THREE.Vector3()).distanceTo(palmPos)
          : 0
        return { node, dist }
      })
      .sort((a, b) => {
        if (a.dist !== b.dist) return a.dist - b.dist
        const nameA = a.node.name.toLowerCase()
        const nameB = b.node.name.toLowerCase()
        const hint = ['metacarpal', 'proximal', '1', 'intermediate', '2', 'distal', '3']
        const idxA = hint.findIndex(h => nameA.includes(h))
        const idxB = hint.findIndex(h => nameB.includes(h))
        if (idxA !== idxB) return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB)
        return nameA.localeCompare(nameB)
      })
      .map(entry => entry.node)

    const unique = []
    const seen = new Set()
    for (const bone of ordered) {
      const key = bone.uuid || bone.id || bone.name
      if (seen.has(key)) continue
      seen.add(key)
      unique.push(bone)
      if (unique.length >= 4) break
    }

    return unique.length >= 2 ? unique : null
  }

  // モデル全体の指ボーンマッピングを解決
  function resolveFingerBones(model, humanoid) {
    if (!model || !humanoid) return null
    
    // キャッシュチェック
    let mapping = resolvedBoneMappings.get(model)
    if (mapping) return mapping
    
    mapping = { left: {}, right: {} }
    
    const leftHandBone = getHumanoidBone(humanoid, 'leftHand')
    const rightHandBone = getHumanoidBone(humanoid, 'rightHand')

    // 左手の指
    for (const finger of Object.keys(FINGER_BONES.left)) {
      mapping.left[finger] = findFingerBones(humanoid, 'left', finger, leftHandBone)
    }
    
    // 右手の指
    for (const finger of Object.keys(FINGER_BONES.right)) {
      mapping.right[finger] = findFingerBones(humanoid, 'right', finger, rightHandBone)
    }
    
    resolvedBoneMappings.set(model, mapping)
    return mapping
  }
  
  function captureInitialRotations(model, humanoid) {
    if (!humanoid || !model) return
    if (initialRotations.has(model)) return // Already captured for this model
    
    const rotations = {}
    const mapping = resolveFingerBones(model, humanoid)
    if (!mapping) return
    
    // 左手
    for (const finger of Object.keys(mapping.left)) {
      const bones = mapping.left[finger]
      if (bones) {
        bones.forEach((bone, index) => {
          const key = `left_${finger}_${index}`
          rotations[key] = bone.quaternion.clone()
          if (bone?.userData?.__fingerCurlAxis) {
            delete bone.userData.__fingerCurlAxis
          }
        })
      }
    }
    
    // 右手
    for (const finger of Object.keys(mapping.right)) {
      const bones = mapping.right[finger]
      if (bones) {
        bones.forEach((bone, index) => {
          const key = `right_${finger}_${index}`
          rotations[key] = bone.quaternion.clone()
          if (bone?.userData?.__fingerCurlAxis) {
            delete bone.userData.__fingerCurlAxis
          }
        })
      }
    }
    
    initialRotations.set(model, rotations)
  }
  
  function applyFingerPose() {
    const model = getActiveModel?.()
    if (!model?.vrm?.humanoid) {
      console.warn('[FingerControl] No model or humanoid available')
      return
    }
    
    const humanoid = model.vrm.humanoid
    const leftHandBone = humanoid.getRawBoneNode?.('leftHand') || humanoid.getBoneNode?.('leftHand') || humanoid.getNormalizedBoneNode?.('leftHand')
    const rightHandBone = humanoid.getRawBoneNode?.('rightHand') || humanoid.getBoneNode?.('rightHand') || humanoid.getNormalizedBoneNode?.('rightHand')
    
    // Capture initial rotations on first call for this model
    captureInitialRotations(model, humanoid)
    
    // 解決されたボーンマッピングを取得
    let mapping = resolveFingerBones(model, humanoid)
    // もし未検出指がある場合はキャッシュを破棄して再探索（モデルロード後遅延生成ケース対策）
    const missing = mapping && (
      Object.values(mapping.left).some(v => !v) ||
      Object.values(mapping.right).some(v => !v)
    )
    if (missing) {
      console.log('[FingerControl] Some finger bones missing, re-resolving...')
      resolvedBoneMappings.delete(model)
      mapping = resolveFingerBones(model, humanoid)
    }
    if (!mapping) {
      console.warn('[FingerControl] Failed to resolve finger bone mapping')
      return
    }
    
    // デバッグ: 検出されたボーンを確認
    let detectedCount = 0
    Object.keys(FINGER_BONES.left).forEach(finger => {
      if (mapping.left[finger]) detectedCount++
    })
    Object.keys(FINGER_BONES.right).forEach(finger => {
      if (mapping.right[finger]) detectedCount++
    })
    if (detectedCount > 0) {
      console.log(`[FingerControl] Detected ${detectedCount}/10 finger groups`)
    }
    
    // Apply left hand fingers
    Object.keys(FINGER_BONES.left).forEach(finger => {
      const key = `left_${finger}`
      const value = fingerStates.value?.[key] || fingerStates[key] || 0
      if (value > 0.01) {
        applyFingerCurl(model, 'left', finger, value, mapping.left[finger], leftHandBone)
      }
    })
    
    // Apply right hand fingers
    Object.keys(FINGER_BONES.right).forEach(finger => {
      const key = `right_${finger}`
      const value = fingerStates.value?.[key] || fingerStates[key] || 0
      if (value > 0.01) {
        applyFingerCurl(model, 'right', finger, value, mapping.right[finger], rightHandBone)
      }
    })
  }

  function determineFingerCurlAxis(bones, index, handBone, hand) {
    const bone = bones?.[index]
    if (!bone) {
      return new THREE.Vector3(hand === 'left' ? 1 : -1, 0, 0)
    }

    const cached = bone.userData?.__fingerCurlAxis
    if (cached?.isVector3) {
      return cached.clone().normalize()
    }

    const child = index < bones.length - 1 ? bones[index + 1] : null
    try { bone.updateWorldMatrix(true, false) } catch {}
    if (child) { try { child.updateWorldMatrix(true, false) } catch {} }

    const boneWorldQuat = bone.getWorldQuaternion(new THREE.Quaternion())
    const invBoneWorldQuat = boneWorldQuat.clone().invert()

    const bonePos = bone.getWorldPosition(new THREE.Vector3())
    let forwardWorld
    if (child) {
      const childPos = child.getWorldPosition(new THREE.Vector3())
      forwardWorld = childPos.sub(bonePos)
    } else if (bone.parent?.isBone) {
      const parentPos = bone.parent.getWorldPosition(new THREE.Vector3())
      forwardWorld = bonePos.clone().sub(parentPos)
    } else {
      forwardWorld = new THREE.Vector3(0, 0, 1).applyQuaternion(boneWorldQuat)
    }

    if (!forwardWorld || forwardWorld.lengthSq() < 1e-8) {
      forwardWorld = new THREE.Vector3(0, 0, 1).applyQuaternion(boneWorldQuat)
    }
    forwardWorld.normalize()

    // 手のひらの法線を取得（手首から手のひら方向）
    const palmNormalWorld = (() => {
      const fallback = new THREE.Vector3(0, 0, hand === 'left' ? -1 : 1)
      if (!handBone) return fallback.normalize()
      try {
        handBone.updateWorldMatrix(true, false)
        const handWorldQuat = handBone.getWorldQuaternion(new THREE.Quaternion())
        return fallback.applyQuaternion(handWorldQuat).normalize()
      } catch {
        return fallback.normalize()
      }
    })()

    const forwardLocal = forwardWorld.clone().applyQuaternion(invBoneWorldQuat)

    // より直接的なアプローチ: 指の曲げ方向はforward x palmNormalに垂直な軸
    // この軸周りの回転で指が手のひら方向に曲がる
    const curlAxisWorld = new THREE.Vector3().crossVectors(forwardWorld, palmNormalWorld)
    if (curlAxisWorld.lengthSq() < 1e-6) {
      // フォールバック: 手の左右軸を使用
      const sideAxis = new THREE.Vector3(hand === 'left' ? 1 : -1, 0, 0)
      if (handBone) {
        try {
          handBone.updateWorldMatrix(true, false)
          const handWorldQuat = handBone.getWorldQuaternion(new THREE.Quaternion())
          sideAxis.applyQuaternion(handWorldQuat)
        } catch {}
      }
      curlAxisWorld.copy(sideAxis).normalize()
    } else {
      curlAxisWorld.normalize()
    }

    // ワールド空間の曲げ軸をローカル空間に変換
    const curlAxisLocal = curlAxisWorld.clone().applyQuaternion(invBoneWorldQuat).normalize()

    // テスト: この軸で回転すると指が手のひら側に曲がるか確認
    const testAngle = THREE.MathUtils.degToRad(15)
    const testQuat = new THREE.Quaternion().setFromAxisAngle(curlAxisLocal, testAngle)
    const rotatedForwardLocal = forwardLocal.clone().applyQuaternion(testQuat)
    const rotatedForwardWorld = rotatedForwardLocal.clone().applyQuaternion(boneWorldQuat)
    
    // 回転後のforward方向が手のひら法線に近づいているかチェック
    const beforeDot = forwardWorld.dot(palmNormalWorld)
    const afterDot = rotatedForwardWorld.dot(palmNormalWorld)
    
    let finalAxis = curlAxisLocal.clone()
    if (afterDot < beforeDot) {
      // 逆方向だったので軸を反転
      finalAxis.multiplyScalar(-1)
    }

    bone.userData = bone.userData || {}
    bone.userData.__fingerCurlAxis = finalAxis.clone()
    return finalAxis
  }
  
  function computeCurlWeights(count) {
    if (!count || count <= 0) return []
    const weights = []
    const decay = 0.7
    for (let i = 0; i < count; i++) {
      weights.push(Math.pow(decay, i))
    }
    const sum = weights.reduce((acc, v) => acc + v, 0) || 1
    return weights.map(v => v / sum)
  }

  function applyFingerCurl(model, hand, finger, amount, bones, handBone) {
    if (!bones || bones.length === 0) {
      console.warn(`[FingerControl] No bones found for ${hand} ${finger}`)
      return
    }

    let savedRotations = initialRotations.get(model)
    if (!savedRotations) {
      savedRotations = {}
      initialRotations.set(model, savedRotations)
    }

    const weights = computeCurlWeights(bones.length)

    const maxAngleDeg = 90
    const normalizedAmount = THREE.MathUtils.clamp(amount ?? 0, 0, 1)
    const targetAngleRad = THREE.MathUtils.degToRad(maxAngleDeg * normalizedAmount)

    bones.forEach((bone, index) => {
      if (!bone) return
      try { bone.updateWorldMatrix?.(false, false) } catch {}

      const rotKey = `${hand}_${finger}_${index}`
      let initialRot = savedRotations[rotKey]
      if (!initialRot) {
        initialRot = bone.quaternion.clone()
        savedRotations[rotKey] = initialRot
      }
      bone.quaternion.copy(initialRot)

      const axisLocal = determineFingerCurlAxis(bones, index, handBone, hand)
      const weight = weights[index] ?? 0
      const angle = targetAngleRad * weight
      if (Math.abs(angle) < 1e-5) {
        bone.updateMatrixWorld(true)
        return
      }

      const rotationQuat = new THREE.Quaternion().setFromAxisAngle(axisLocal, angle)
      bone.quaternion.multiply(rotationQuat)
      bone.updateMatrixWorld(true)
    })
  }
  
  return {
    applyFingerPose
  }
}
