import * as THREE from 'three'

// Finger bone mappings for VRM (using VRM humanoid bone names)
// 吁E�E��E�に対して褁E�E��E�のボ�Eン名候補を用意！ERMモチE�E��E�によって異なる名前が使われる場合がある�E�E�E�E
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

export function useFingerControl(getFingerStates, getActiveModel) {
  // Store initial bone rotations per model
  const initialRotations = new WeakMap()
  // モチE�E��E�ごとに解決された�EーンマッピングをキャチE�E��E�ュ
  const resolvedBoneMappings = new WeakMap()
  
  // チE�E��E�チE�E��E�用: 検�Eされた�Eーンをログ出力（一度だけ！E
  let detectionLogged = false

  function getHumanoidBone(humanoid, boneName) {
    if (!humanoid || !boneName) return null
    
    // VRM 1.0 の場合 - getRawBoneNode
    if (typeof humanoid.getRawBoneNode === 'function') {
      try {
        const bone = humanoid.getRawBoneNode(boneName)
        if (bone && bone.isBone) return bone
      } catch (e) {
        console.debug(`[FingerControl] getRawBoneNode failed for ${boneName}:`, e)
      }
    }
    
    // VRM 0.x の場合 - getBoneNode
    if (typeof humanoid.getBoneNode === 'function') {
      try {
        const bone = humanoid.getBoneNode(boneName)
        if (bone && bone.isBone) return bone
      } catch (e) {
        console.debug(`[FingerControl] getBoneNode failed for ${boneName}:`, e)
      }
    }
    
    // getNormalizedBoneNode も試す
    if (typeof humanoid.getNormalizedBoneNode === 'function') {
      try {
        const bone = humanoid.getNormalizedBoneNode(boneName)
        if (bone && bone.isBone) return bone
      } catch (e) {
        console.debug(`[FingerControl] getNormalizedBoneNode failed for ${boneName}:`, e)
      }
    }
    
    // humanBones経由で直接アクセス
    if (humanoid.humanBones && humanoid.humanBones[boneName]) {
      const boneRef = humanoid.humanBones[boneName]
      if (boneRef && boneRef.node && boneRef.node.isBone) return boneRef.node
    }
    
    // rawHumanBones経由で直接アクセス
    if (humanoid.rawHumanBones && humanoid.rawHumanBones[boneName]) {
      const boneRef = humanoid.rawHumanBones[boneName]
      if (boneRef && boneRef.node && boneRef.node.isBone) return boneRef.node
    }
    
    // normalizedHumanBones経由でもアクセス試行
    if (humanoid.normalizedHumanBones && humanoid.normalizedHumanBones[boneName]) {
      const boneRef = humanoid.normalizedHumanBones[boneName]
      if (boneRef && boneRef.node && boneRef.node.isBone) return boneRef.node
    }
    
    return null
  }
  
  // 指のボーンを厳密に特定する - より積極的な検索
  function findFingerBones(humanoid, hand, finger, handBone) {
    const candidates = FINGER_BONES[hand][finger]
    
    console.log(`[FingerControl] Searching bones for ${hand} ${finger}...`)

    // まずVRM Humanoidから探す
    for (const boneNames of candidates) {
      if (!Array.isArray(boneNames) || !boneNames.length) continue
      const bones = []
      for (const boneName of boneNames) {
        const bone = getHumanoidBone(humanoid, boneName)
        if (bone && bone.isBone) {
          bones.push(bone)
        }
      }
      if (bones.length >= 2) {
        // 少なくとも2つのボーンが見つかれば成功
        console.log(`[FingerControl] ✓ Found ${hand} ${finger} via Humanoid: ${bones.length} bones [${boneNames.slice(0, bones.length).join(', ')}]`)
        return bones
      }
    }

    console.log(`[FingerControl] Humanoid search failed for ${hand} ${finger}, trying hierarchy search...`)

    // Humanoidで見つからなければ、手のボーンの子孫から名前で検索
    if (handBone && handBone.isBone) {
      const result = searchFingerBonesInHierarchy(handBone, hand, finger, handBone)
      if (result && result.length >= 2) {
        console.log(`[FingerControl] ✓ Found ${hand} ${finger} via hand hierarchy: ${result.length} bones`)
        return result
      }
    }

    // それでも見つからなければルート全体から検索
    const root = humanoid?.vrm?.scene || humanoid?.scene || null
    if (root && root !== handBone) {
      const result = searchFingerBonesInHierarchy(root, hand, finger, handBone)
      if (result && result.length >= 2) {
        console.log(`[FingerControl] ✓ Found ${hand} ${finger} via root search: ${result.length} bones`)
        return result
      }
    }

    console.warn(`[FingerControl] ✗ Could not find bones for ${hand} ${finger}`)
    return null
  }

  // 階層構造から持E�E�Eボ�Eンを名前で検索
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

  // モチE�E��E�全体�E持E�E�Eーンマッピングを解決
  function resolveFingerBones(model, humanoid) {
    if (!model || !humanoid) return null
    
    // キャチE�E��E�ュチェチE�E��E�
    let mapping = resolvedBoneMappings.get(model)
    if (mapping) return mapping
    
    mapping = { left: {}, right: {} }
    
    const leftHandBone = getHumanoidBone(humanoid, 'leftHand')
    const rightHandBone = getHumanoidBone(humanoid, 'rightHand')

    // 左手�E持E
    for (const finger of Object.keys(FINGER_BONES.left)) {
      mapping.left[finger] = findFingerBones(humanoid, 'left', finger, leftHandBone)
    }
    
    // 右手�E持E
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
    
    console.log('[FingerControl] Capturing initial finger rotations...')
    
    // 左扁E
    for (const finger of Object.keys(mapping.left)) {
      const bones = mapping.left[finger]
      if (bones) {
        bones.forEach((bone, index) => {
          const key = `left_${finger}_${index}`
          // ワールド�EトリチE�E��E�スを更新してから回転を保孁E
          try { bone.updateWorldMatrix(true, false) } catch {}
          rotations[key] = bone.quaternion.clone()
          if (bone?.userData?.__fingerCurlAxis) {
            delete bone.userData.__fingerCurlAxis
          }
        })
      }
    }
    
    // 右扁E
    for (const finger of Object.keys(mapping.right)) {
      const bones = mapping.right[finger]
      if (bones) {
        bones.forEach((bone, index) => {
          const key = `right_${finger}_${index}`
          // ワールド�EトリチE�E��E�スを更新してから回転を保孁E
          try { bone.updateWorldMatrix(true, false) } catch {}
          rotations[key] = bone.quaternion.clone()
          if (bone?.userData?.__fingerCurlAxis) {
            delete bone.userData.__fingerCurlAxis
          }
        })
      }
    }
    
    initialRotations.set(model, rotations)
    console.log(`[FingerControl] Captured ${Object.keys(rotations).length} initial rotations`)
  }
  
  function applyFingerPose() {
    const model = getActiveModel?.()
    if (!model?.vrm?.humanoid) {
      // モチE�E��E�がなぁE�E��E�合�E静かに終亁E�E��E�警告�E出さなぁE�E��E�E
      return
    }
    
    const humanoid = model.vrm.humanoid
    const leftHandBone = getHumanoidBone(humanoid, 'leftHand')
    const rightHandBone = getHumanoidBone(humanoid, 'rightHand')

    // fingerStatesを取得（関数経由で最新の値を取得！E
    const fingerStates = getFingerStates?.()
    if (!fingerStates) {
      console.warn('[FingerControl] fingerStates is not available')
      return
    }
    
    // チE�E��E�チE�E��E�: fingerStatesの冁E�E��E�を確認（�E回�Eみ�E�E�E�E
    if (!model.userData?.__fingerStatesLoggedOnce) {
      if (!model.userData) model.userData = {}
      model.userData.__fingerStatesLoggedOnce = true
      console.log('[FingerControl] fingerStates type:', typeof fingerStates)
      console.log('[FingerControl] fingerStates content:', JSON.stringify(fingerStates, null, 2))
    }

    const readFingerValue = key => {
      if (!fingerStates || typeof fingerStates !== 'object') return 0
      const raw = fingerStates[key]
      const num = Number(raw)
      if (!Number.isFinite(num)) return 0
      return THREE.MathUtils.clamp(num, 0, 1)
    }

    const trackedFingerKeys = [
      ...Object.keys(FINGER_BONES.left).map(finger => `left_${finger}`),
      ...Object.keys(FINGER_BONES.right).map(finger => `right_${finger}`)
    ]

    const hasActiveCurl = trackedFingerKeys.some(key => Math.abs(readFingerValue(key)) > 1e-3)

    // チE�E��E�チE�E��E�: 初回のみログを�E劁E
    if (hasActiveCurl && !model.userData?.__fingerControlDebugLogged) {
      if (!model.userData) model.userData = {}
      model.userData.__fingerControlDebugLogged = true
      console.log('[FingerControl] applyFingerPose called with active curl values')
      
      // アクチE�E��E�ブな持E�E��E�ログ出劁E
      const activeFingers = trackedFingerKeys.filter(key => Math.abs(readFingerValue(key)) > 1e-3)
      console.log('[FingerControl] Active fingers:', activeFingers.map(key => `${key}: ${(readFingerValue(key) * 100).toFixed(0)}%`))
    }

    if (!hasActiveCurl) {
      // カールが�Eて0の場合�E初期状態にリセチE�E��E�
      if (initialRotations.has(model)) {
        const rotations = initialRotations.get(model)
        const mapping = resolveFingerBones(model, humanoid)
        if (mapping) {
          // 左手�E持E�E��E�初期状態に戻ぁE
          Object.keys(FINGER_BONES.left).forEach(finger => {
            const bones = mapping.left[finger]
            if (bones) {
              bones.forEach((bone, index) => {
                const key = `left_${finger}_${index}`
                const initialRot = rotations[key]
                if (initialRot && bone) {
                  bone.quaternion.copy(initialRot)
                  try { bone.updateMatrixWorld?.(true) } catch {}
                }
              })
            }
          })
          // 右手�E持E�E��E�初期状態に戻ぁE
          Object.keys(FINGER_BONES.right).forEach(finger => {
            const bones = mapping.right[finger]
            if (bones) {
              bones.forEach((bone, index) => {
                const key = `right_${finger}_${index}`
                const initialRot = rotations[key]
                if (initialRot && bone) {
                  bone.quaternion.copy(initialRot)
                  try { bone.updateMatrixWorld?.(true) } catch {}
                }
              })
            }
          })
        }
        initialRotations.delete(model)
        // チE�E��E�チE�E��E�フラグもリセチE�E��E�
        if (model.userData) {
          delete model.userData.__fingerControlDebugLogged
          // 吁E�E��E�のチE�E��E�チE�E��E�フラグもリセチE�E��E�
          Object.keys(model.userData).forEach(key => {
            if (key.includes('_curl_debug') || key.includes('_no_bones') || key.includes('_applied')) {
              delete model.userData[key]
            }
          })
        }
      }
      return
    }

    // Capture initial rotations using current pose as baseline
    captureInitialRotations(model, humanoid)
    
    // 解決された�Eーンマッピングを取征E
    let mapping = resolveFingerBones(model, humanoid)
    // もし未検�E持E�E��E�ある場合�EキャチE�E��E�ュを破棁E�E��E�て再探索�E�E�E�モチE�E��E�ロード後遅延生�Eケース対策！E
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
    
    // チE�E��E�チE�E��E�: 検�Eされた�Eーンを確認（�E回�Eみ�E�E�E�E
    if (!model.userData?.__fingerBonesDetected) {
      if (!model.userData) model.userData = {}
      model.userData.__fingerBonesDetected = true
      
      let detectedCount = 0
      const detectedDetails = []
      Object.keys(FINGER_BONES.left).forEach(finger => {
        if (mapping.left[finger]) {
          detectedCount++
          detectedDetails.push(`left_${finger}(${mapping.left[finger].length})`)
        }
      })
      Object.keys(FINGER_BONES.right).forEach(finger => {
        if (mapping.right[finger]) {
          detectedCount++
          detectedDetails.push(`right_${finger}(${mapping.right[finger].length})`)
        }
      })
      if (detectedCount > 0) {
        console.log(`[FingerControl] Detected ${detectedCount}/10 finger groups: ${detectedDetails.join(', ')}`)
      } else {
        console.warn('[FingerControl] No finger bones detected - bone manipulation may not work')
      }
    }
    
    // Apply left hand fingers
    Object.keys(FINGER_BONES.left).forEach(finger => {
      const key = `left_${finger}`
      const value = readFingerValue(key)
      if (mapping.left[finger]) {
        applyFingerCurl(model, 'left', finger, value, mapping.left[finger], leftHandBone)
      }
    })

    // Apply right hand fingers
    Object.keys(FINGER_BONES.right).forEach(finger => {
      const key = `right_${finger}`
      const value = readFingerValue(key)
      if (mapping.right[finger]) {
        applyFingerCurl(model, 'right', finger, value, mapping.right[finger], rightHandBone)
      }
    })
  }

  function applyFingerCurl(model, hand, finger, amount, bones, handBone) {
    if (!bones || bones.length === 0) {
      return
    }

    let savedRotations = initialRotations.get(model)
    if (!savedRotations) {
      savedRotations = {}
      initialRotations.set(model, savedRotations)
    }

    // 吁E�E��E�節に最大90度まで曲げる�E�E�E�第一〜第三関節を均等に�E�E�E�E
    const maxAngleDegPerJoint = 90
    const normalizedAmount = THREE.MathUtils.clamp(amount ?? 0, 0, 1)

    // 第一〜第三関節�E�E�E�最大3関節�E�E�E�を曲げる
    const jointsToRotate = Math.min(3, bones.length)
    
    // チE�E��E�チE�E��E�: カールの適用をログ出力（�E回�Eみ�E�E�E�E
    const logKey = `${hand}_${finger}_curl_applied`
    if (normalizedAmount > 0.01 && !model.userData?.[logKey]) {
      if (!model.userData) model.userData = {}
      model.userData[logKey] = true
      console.log(`[FingerControl] Applying curl to ${hand} ${finger}: ${(normalizedAmount * 100).toFixed(0)}%, ${jointsToRotate} joints, ${bones.length} bones total`)
      console.log(`[FingerControl] Bone names:`, bones.map((b, i) => `Joint${i + 1}:${b.name}`).join(', '))
    }
    
    if (normalizedAmount < 0.001) {
      // カールぁEの場合�E初期状態に戻ぁE
      for (let index = 0; index < jointsToRotate; index++) {
        const bone = bones[index]
        if (!bone) continue
        
        const rotKey = `${hand}_${finger}_${index}`
        const initialRot = savedRotations[rotKey]
        if (initialRot) {
          bone.quaternion.copy(initialRot)
          bone.updateMatrix()
          try { bone.updateMatrixWorld?.(true) } catch {}
        }
      }
      return
    }

    // 吁E�E��E�節を曲げる
    for (let index = 0; index < jointsToRotate; index++) {
      const bone = bones[index]
      if (!bone) continue
      
      const rotKey = `${hand}_${finger}_${index}`
      let initialRot = savedRotations[rotKey]
      
      if (!initialRot) {
        // 初期回転を保存（現在の状態を基準として保存！E
        try {
          bone.updateWorldMatrix(true, false)
        } catch {}
        initialRot = bone.quaternion.clone()
        savedRotations[rotKey] = initialRot
        console.log(`[FingerControl] Saved initial rotation for ${hand} ${finger} joint ${index + 1}`)
      }
      
      // 初期回転に戻ぁE
      bone.quaternion.copy(initialRot)
      
      // 坁E�E��E��E�E刁E 吁E�E��E�節が同じ角度で曲がる
      const angle = THREE.MathUtils.degToRad(maxAngleDegPerJoint * normalizedAmount)
      
      // ボ�Eンのローカル座標系での回転軸を決宁E
      // 実際のボ�Eンの向きを老E�E�Eした動的な回転軸決宁E
      let curlAxis = determineCurlAxis(bone, hand, finger, index, handBone)
      if (!curlAxis || typeof curlAxis.clone !== "function") {
        curlAxis = new THREE.Vector3(0, 0, hand === "left" ? -1 : 1)
      }
      const normalizedAxis = curlAxis.clone().normalize()
      const rotationQuat = new THREE.Quaternion().setFromAxisAngle(normalizedAxis, angle)
      bone.quaternion.multiply(rotationQuat)
      
      // マトリチE�E��E�スを更新
      bone.updateMatrix()
      
      // チE�E��E�チE�E��E�: 回転の適用をログ出力（�E回�Eみ�E�E�E�E
      const jointLogKey = `${hand}_${finger}_${index}_rotation_applied`
      if (normalizedAmount > 0.01 && !model.userData?.[jointLogKey]) {
        if (!model.userData) model.userData = {}
        model.userData[jointLogKey] = true
        console.log(`[FingerControl] Applied ${THREE.MathUtils.radToDeg(angle).toFixed(1)}° rotation to ${hand} ${finger} joint ${index + 1} around local axis (${normalizedAxis.x.toFixed(2)}, ${normalizedAxis.y.toFixed(2)}, ${normalizedAxis.z.toFixed(2)})`)
      }
    }
    
    // すべてのボ�Eンの更新が完亁E�E��E�た後、ワールド�EトリチE�E��E�スを強制皁E�E��E�再計箁E
    for (let index = 0; index < jointsToRotate; index++) {
      const bone = bones[index]
      if (!bone) continue
      try {
        bone.updateMatrixWorld(true)
      } catch (e) {
        console.warn(`[FingerControl] Failed to update matrix for ${hand} ${finger} joint ${index}:`, e)
      }
    }
  }
  
  // ボ�Eンの実際の構造に基づぁE�E��E�最適な回転軸を決宁E
  function determineCurlAxis(bone, hand, finger, jointIndex, handBone) {
    // チE�E��E�ォルト�E回転軸: VRM標準ではZ軸周り�E回転が最も一般皁E
    // 左手と右手で符号が送E�E��E�なめE
    const defaultAxisZ = new THREE.Vector3(0, 0, hand === 'left' ? -1 : 1)
    
    // 親持E�E�E場合�E特殊な処琁E
    if (finger === 'thumb') {
      // 親持E�E�E第一関節�E�E�E�中手骨�E�E�E��E�E通常Y軸周りで開閉
      if (jointIndex === 0) {
        return new THREE.Vector3(0, hand === 'left' ? 1 : -1, 0)
      } else {
        // 第二関節以降�EZ軸回転を基本とするが、Y軸成�Eも加える
        return new THREE.Vector3(0, hand === 'left' ? 0.3 : -0.3, hand === 'left' ? -1 : 1).normalize()
      }
    }
    
    // 子�Eーンの方向から回転軸を推宁E
    if (bone.children && bone.children.length > 0) {
      const child = bone.children[0]
      if (child && child.position) {
        // 子�Eーンへのローカル方向�Eクトルを取征E
        const childDir = new THREE.Vector3().copy(child.position).normalize()
        
        // 持E�E�E長軸�E�E�E�子�Eーンへの方向）に垂直な軸で回転する
        // childDirに最も近い主軸を見つけて、それに垂直な軸を選抁E
        const absX = Math.abs(childDir.x)
        const absY = Math.abs(childDir.y)
        const absZ = Math.abs(childDir.z)
        
        let axis
        if (absZ > absX && absZ > absY) {
          // Z軸が主方向（最も一般皁E�E��E�EↁEX軸また�EY軸周りで回転
          // 手�E左右で異なる軸を選抁E
          if (hand === 'left') {
            // 左扁E 通常X軸正方向周りで曲がる
            axis = new THREE.Vector3(1, 0, 0)
          } else {
            // 右扁E 通常X軸負方向周りで曲がる
            axis = new THREE.Vector3(-1, 0, 0)
          }
        } else if (absX > absY && absX > absZ) {
          // X軸が主方吁EↁEZ軸周りで回転
          axis = defaultAxisZ.clone()
        } else {
          // Y軸が主方吁EↁEZ軸周りで回転�E�E�E�Eallback�E�E�E�E
          axis = defaultAxisZ.clone()
        }
        
        return axis
      }
    }
    
    // 子�EーンがなぁE�E��E�合�EチE�E��E�ォルト�EZ軸回転を使用
    return defaultAxisZ
  }
  
  return {
    applyFingerPose
  }
}



