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

const MAX_FINGER_JOINTS = 3

const tempWorldVecA = new THREE.Vector3()
const tempWorldVecB = new THREE.Vector3()
const tempWorldVecC = new THREE.Vector3()

const isBoneLike = node => {
  if (!node) return false
  return !!(node.isBone || node.isObject3D)
}

function normalizeFingerChain(bones, handBone) {
  const filtered = Array.isArray(bones)
    ? bones.filter(bone => isBoneLike(bone))
    : []
  if (!filtered.length) return null

  const unique = []
  const seen = new Set()
  for (const bone of filtered) {
    const key = bone.uuid || bone.id || bone.name
    if (!key || seen.has(key)) continue
    seen.add(key)
    unique.push(bone)
  }
  if (!unique.length) return null

  let palmPosition = null
  if (isBoneLike(handBone)) {
    try { handBone.updateWorldMatrix(true, false) } catch {}
    palmPosition = handBone.getWorldPosition(new THREE.Vector3())
  }

  const distanceToPalm = (bone) => {
    if (!bone || !palmPosition) return Number.POSITIVE_INFINITY
    try { bone.updateWorldMatrix(true, false) } catch {}
    const pos = bone.getWorldPosition(new THREE.Vector3())
    return pos.distanceTo(palmPosition)
  }

  const candidateSet = new Set(unique)
  const rootCandidates = unique
    .filter(bone => {
      const parent = bone.parent
      if (!parent) return true
      if (parent === handBone) return true
      return !candidateSet.has(parent)
    })
    .sort((a, b) => distanceToPalm(a) - distanceToPalm(b))

  let bestChain = []

  const buildChainFromRoot = (rootBone) => {
    if (!rootBone) return
    const chain = []
    const visitedLocal = new Set()
    let current = rootBone
    while (current && candidateSet.has(current) && !visitedLocal.has(current)) {
      chain.push(current)
      visitedLocal.add(current)
      const children = (current.children || [])
        .filter(child => candidateSet.has(child) && !visitedLocal.has(child))
        .sort((a, b) => distanceToPalm(a) - distanceToPalm(b))
      current = children[0] || null
    }
    if (chain.length > bestChain.length) {
      bestChain = chain
    }
  }

  if (rootCandidates.length) {
    rootCandidates.forEach(buildChainFromRoot)
  }

  if (!bestChain.length) {
    bestChain = unique.slice().sort((a, b) => distanceToPalm(a) - distanceToPalm(b))
  }

  const ordered = []
  const appended = new Set()
  const pushBone = bone => {
    if (!bone) return
    const key = bone.uuid || bone.id || bone.name
    if (!key || appended.has(key)) return
    appended.add(key)
    ordered.push(bone)
  }

  bestChain.forEach(pushBone)
  unique.forEach(pushBone)

  let chain = ordered.filter(Boolean)

  if (palmPosition) {
    chain.sort((a, b) => distanceToPalm(a) - distanceToPalm(b))
  }

  const dropClosestToPalm = () => {
    if (chain.length <= MAX_FINGER_JOINTS) return
    let dropIndex = 0
    let minDistance = Number.POSITIVE_INFINITY
    chain.forEach((bone, index) => {
      const dist = distanceToPalm(bone)
      if (dist < minDistance) {
        minDistance = dist
        dropIndex = index
      }
    })
    chain.splice(dropIndex, 1)
  }

  const dropMetacarpalIfPresent = () => {
    if (chain.length < 2) return false
    const first = chain[0]
    const second = chain[1]
    if (!first || !second) return false
    if (second.parent === first) {
      const name = (first.name || '').toLowerCase()
      if (name.includes('metacarpal')) {
        chain = chain.slice(1)
        return true
      }
    }
    return false
  }

  while (chain.length > MAX_FINGER_JOINTS) {
    if (dropMetacarpalIfPresent()) continue
    dropClosestToPalm()
  }

  return chain
}

export function useFingerControl(getFingerStates, getActiveModel, getFingerAxisOverrides) {
  // Store initial bone rotations per model
  const initialRotations = new WeakMap()
  // モチE�E��E�ごとに解決された�EーンマッピングをキャチE�E��E�ュ
  const resolvedBoneMappings = new WeakMap()
  
  // チE�E��E�チE�E��E�用: 検�Eされた�Eーンをログ出力（一度だけ！E
  let detectionLogged = false

  function extractBoneNode(candidate) {
    if (!candidate) return null
    if (isBoneLike(candidate)) return candidate
    if (candidate.node && isBoneLike(candidate.node)) return candidate.node
    if (candidate.bone && isBoneLike(candidate.bone)) return candidate.bone
    if (Array.isArray(candidate)) {
      for (const entry of candidate) {
        const resolved = extractBoneNode(entry)
        if (resolved) return resolved
      }
    } else if (typeof candidate === 'object') {
      // VRM 1.0 の VRMHumanBoneLike には `node` または `bone` プロパティが存在する
      for (const value of Object.values(candidate)) {
        const resolved = extractBoneNode(value)
        if (resolved) return resolved
      }
    }
    return null
  }

  function getHumanoidBone(humanoid, boneName) {
    if (!humanoid || !boneName) return null

    // VRM 1.0 の場合 - getRawBoneNode
    if (typeof humanoid.getRawBoneNode === 'function') {
      try {
        const bone = humanoid.getRawBoneNode(boneName)
        const resolved = extractBoneNode(bone) || (isBoneLike(bone) ? bone : null)
        if (resolved) return resolved
      } catch (e) {
        console.debug(`[FingerControl] getRawBoneNode failed for ${boneName}:`, e)
      }
    }

    // VRM 0.x の場合 - getBoneNode
    if (typeof humanoid.getBoneNode === 'function') {
      try {
        const bone = humanoid.getBoneNode(boneName)
        const resolved = extractBoneNode(bone) || (isBoneLike(bone) ? bone : null)
        if (resolved) return resolved
      } catch (e) {
        console.debug(`[FingerControl] getBoneNode failed for ${boneName}:`, e)
      }
    }

    // getNormalizedBoneNode も試す
    if (typeof humanoid.getNormalizedBoneNode === 'function') {
      try {
        const bone = humanoid.getNormalizedBoneNode(boneName)
        const resolved = extractBoneNode(bone) || (isBoneLike(bone) ? bone : null)
        if (resolved) return resolved
      } catch (e) {
        console.debug(`[FingerControl] getNormalizedBoneNode failed for ${boneName}:`, e)
      }
    }

    const fromCollection = (collection) => {
      if (!collection) return null
      if (typeof collection.get === 'function') {
        const entry = collection.get(boneName)
        const resolved = extractBoneNode(entry)
        if (resolved) return resolved
      }
      if (collection[boneName]) {
        const resolved = extractBoneNode(collection[boneName])
        if (resolved) return resolved
      }
      return null
    }

    const direct =
      fromCollection(humanoid.humanBones) ||
      fromCollection(humanoid.rawHumanBones) ||
      fromCollection(humanoid.normalizedHumanBones)
    if (direct) return direct

    if (humanoid.humanBonesMap && typeof humanoid.humanBonesMap.get === 'function') {
      const mapped = humanoid.humanBonesMap.get(boneName)
      const resolved = extractBoneNode(mapped)
      if (resolved) return resolved
    }

    return null
  }
  
  // 指のボーンを厳密に特定する - より積極的な検索
  function findFingerBones(model, humanoid, hand, finger, handBone) {
    const candidates = FINGER_BONES[hand][finger]
    
    console.log(`[FingerControl] Searching bones for ${hand} ${finger}...`)

    // まずVRM Humanoidから探す
    for (const boneNames of candidates) {
      if (!Array.isArray(boneNames) || !boneNames.length) continue
      const bones = []
      for (const boneName of boneNames) {
        const bone = getHumanoidBone(humanoid, boneName)
        const resolved = extractBoneNode(bone) || (isBoneLike(bone) ? bone : null)
        if (resolved) {
          bones.push(resolved)
        }
      }
      if (bones.length >= 2) {
        const normalized = normalizeFingerChain(bones, handBone)
        if (normalized?.length >= 2) {
          const boneNamesList = normalized.map(b => b.name || '(unnamed)')
          console.log(`[FingerControl] ✓ Found ${hand} ${finger} via Humanoid: ${normalized.length} bones [${boneNamesList.join(', ')}]`)
          return normalized
        }
      }
    }

    console.log(`[FingerControl] Humanoid search failed for ${hand} ${finger}, trying hierarchy search...`)

    // Humanoidで見つからなければ、手のボーンの子孫から名前で検索
    if (isBoneLike(handBone)) {
      const result = searchFingerBonesInHierarchy(handBone, hand, finger, handBone)
      if (result && result.length >= 1) {
        console.log(`[FingerControl] ✓ Found ${hand} ${finger} via hand hierarchy: ${result.length} bones`)
        return result
      }
    }

    // それでも見つからなければルート全体から検索
    const root =
      model?.scene ||
      model?.originalScene ||
      model?.vrm?.scene ||
      humanoid?.vrm?.scene ||
      humanoid?.scene ||
      null
    if (root && root !== handBone) {
      const result = searchFingerBonesInHierarchy(root, hand, finger, handBone)
      if (result && result.length >= 1) {
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
      if (!isBoneLike(node) || !node.name) return
      const lower = node.name.toLowerCase()
      const matchesHand = handAliases.some(alias => lower.includes(alias))
      const matchesFinger = Array.from(fingerAliases).some(alias => lower.includes(alias))
      if (matchesHand && matchesFinger) {
        collected.push(node)
      }
    })

    if (collected.length < 1) {
      return null
    }

    try { handBone?.updateWorldMatrix(true, false) } catch {}
    const palmPos = isBoneLike(handBone)
      ? handBone.getWorldPosition(new THREE.Vector3())
      : null

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

    const normalized = normalizeFingerChain(unique, handBone)
    return normalized && normalized.length >= 1 ? normalized : null
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
      mapping.left[finger] = findFingerBones(model, humanoid, 'left', finger, leftHandBone)
    }
    
    // 右手�E持E
    for (const finger of Object.keys(FINGER_BONES.right)) {
      mapping.right[finger] = findFingerBones(model, humanoid, 'right', finger, rightHandBone)
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

    const axisOverrides = typeof getFingerAxisOverrides === 'function'
      ? getFingerAxisOverrides?.()
      : null

    const readFingerAngle = key => {
      if (!fingerStates || typeof fingerStates !== 'object') return 0
      const raw = fingerStates[key]
      const num = Number(raw)
      if (!Number.isFinite(num)) return 0
      return THREE.MathUtils.clamp(num, -90, 90)
    }

    const readAxisOverride = key => {
      if (!axisOverrides || typeof axisOverrides !== 'object') return 'auto'
      const raw = axisOverrides[key]
      return typeof raw === 'string' ? raw : 'auto'
    }

    const trackedFingerKeys = [
      ...Object.keys(FINGER_BONES.left).map(finger => `left_${finger}`),
      ...Object.keys(FINGER_BONES.right).map(finger => `right_${finger}`)
    ]

    const hasActiveCurl = trackedFingerKeys.some(key => Math.abs(readFingerAngle(key)) > 0.1)

    // チE�E��E�チE�E��E�: 初回のみログを�E劁E
    if (hasActiveCurl && !model.userData?.__fingerControlDebugLogged) {
      if (!model.userData) model.userData = {}
      model.userData.__fingerControlDebugLogged = true
      console.log('[FingerControl] applyFingerPose called with active curl values')
      
      // アクチE�E��E�ブな持E�E��E�ログ出劁E
      const activeFingers = trackedFingerKeys.filter(key => Math.abs(readFingerAngle(key)) > 0.1)
      console.log('[FingerControl] Active fingers:', activeFingers.map(key => `${key}: ${readFingerAngle(key).toFixed(1)}°`))
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
      const angleDeg = readFingerAngle(key)
      if (mapping.left[finger]) {
        applyFingerCurl(model, 'left', finger, angleDeg, mapping.left[finger], leftHandBone, readAxisOverride(key))
      }
    })

    // Apply right hand fingers
    Object.keys(FINGER_BONES.right).forEach(finger => {
      const key = `right_${finger}`
      const angleDeg = readFingerAngle(key)
      if (mapping.right[finger]) {
        applyFingerCurl(model, 'right', finger, angleDeg, mapping.right[finger], rightHandBone, readAxisOverride(key))
      }
    })
  }

  function createAxisVectorFromOverride(override) {
    if (typeof override !== 'string') return null
    const value = override.trim().toLowerCase()
    switch (value) {
      case 'x+': return new THREE.Vector3(1, 0, 0)
      case 'x-': return new THREE.Vector3(-1, 0, 0)
      case 'y+': return new THREE.Vector3(0, 1, 0)
      case 'y-': return new THREE.Vector3(0, -1, 0)
      case 'z+': return new THREE.Vector3(0, 0, 1)
      case 'z-': return new THREE.Vector3(0, 0, -1)
      default: return null
    }
  }

  function applyFingerCurl(model, hand, finger, angleDeg, bones, handBone, axisOverride) {
    if (!bones || bones.length === 0) {
      return
    }

    let savedRotations = initialRotations.get(model)
    if (!savedRotations) {
      savedRotations = {}
      initialRotations.set(model, savedRotations)
    }

    // 吁E�E��E�節に最大90度まで曲げる�E�E�E�第一〜第三関節を均等に�E�E�E�E
    const clampedAngleDeg = THREE.MathUtils.clamp(angleDeg ?? 0, -90, 90)

    // 第一〜第三関節�E�E�E�最大3関節�E�E�E�を曲げる
    const jointsToRotate = Math.min(MAX_FINGER_JOINTS, bones.length)
    
    // チE�E��E�チE�E��E�: カールの適用をログ出力（�E回�Eみ�E�E�E�E
    const logKey = `${hand}_${finger}_curl_applied`
    if (Math.abs(clampedAngleDeg) > 0.5 && !model.userData?.[logKey]) {
      if (!model.userData) model.userData = {}
      model.userData[logKey] = true
      console.log(`[FingerControl] Applying curl to ${hand} ${finger}: ${clampedAngleDeg.toFixed(1)}°, ${jointsToRotate} joints, ${bones.length} bones total`)
      console.log(`[FingerControl] Bone names:`, bones.map((b, i) => `Joint${i + 1}:${b?.name || '(unnamed)'}`).join(', '))
    }

    if (Math.abs(clampedAngleDeg) < 0.001) {
      // カールぁEの場合�E初期状態に戻ぁE
      for (let index = 0; index < jointsToRotate; index++) {
        const bone = bones[index]
        if (!isBoneLike(bone)) continue

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
    const overrideAxisVec = createAxisVectorFromOverride(axisOverride)

    for (let index = 0; index < jointsToRotate; index++) {
      const bone = bones[index]
      if (!isBoneLike(bone)) continue
      
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
      const angle = THREE.MathUtils.degToRad(clampedAngleDeg)
      
      let curlAxis = null
      if (overrideAxisVec) {
        curlAxis = overrideAxisVec.clone()
      } else {
        const storedAxis = bone?.userData?.__fingerCurlAxis
        if (storedAxis && typeof storedAxis.clone === 'function') {
          curlAxis = storedAxis.clone()
        } else {
          curlAxis = determineCurlAxis(bone, hand, finger, index, handBone, bones)
          if (curlAxis && curlAxis.lengthSq() > 1e-8) {
            if (!bone.userData) bone.userData = {}
            bone.userData.__fingerCurlAxis = curlAxis.clone()
          }
        }
      }
      if (!curlAxis || typeof curlAxis.clone !== 'function' || curlAxis.lengthSq() < 1e-8) {
        curlAxis = new THREE.Vector3(0, 0, hand === 'left' ? -1 : 1)
      }
      const normalizedAxis = curlAxis.clone().normalize()
      const rotationQuat = new THREE.Quaternion().setFromAxisAngle(normalizedAxis, angle)
      bone.quaternion.multiply(rotationQuat)
      
      // マトリチE�E��E�スを更新
      bone.updateMatrix()
      
      // チE�E��E�チE�E��E�: 回転の適用をログ出力（�E回�Eみ�E�E�E�E
      const jointLogKey = `${hand}_${finger}_${index}_rotation_applied`
      if (Math.abs(clampedAngleDeg) > 0.5 && !model.userData?.[jointLogKey]) {
        if (!model.userData) model.userData = {}
        model.userData[jointLogKey] = true
        console.log(`[FingerControl] Applied ${THREE.MathUtils.radToDeg(angle).toFixed(1)}° rotation to ${hand} ${finger} joint ${index + 1} around local axis (${normalizedAxis.x.toFixed(2)}, ${normalizedAxis.y.toFixed(2)}, ${normalizedAxis.z.toFixed(2)})`)
      }
    }
    
    // すべてのボ�Eンの更新が完亁E�E��E�た後、ワールド�EトリチE�E��E�スを強制皁E�E��E�再計箁E
    for (let index = 0; index < jointsToRotate; index++) {
      const bone = bones[index]
      if (!isBoneLike(bone)) continue
      try {
        bone.updateMatrixWorld(true)
      } catch (e) {
        console.warn(`[FingerControl] Failed to update matrix for ${hand} ${finger} joint ${index}:`, e)
      }
    }
  }
  
  // ボ�Eンの実際の構造に基づぁE�E��E�最適な回転軸を決宁E
  function determineCurlAxis(bone, hand, finger, jointIndex, handBone, chain) {
    if (!bone) return null

    const defaultLocalAxis = new THREE.Vector3(0, 0, hand === 'left' ? -1 : 1)

    try { bone.updateWorldMatrix(true, false) } catch {}
    if (isBoneLike(handBone)) {
      try { handBone.updateWorldMatrix(true, false) } catch {}
    }

    const boneWorldPos = bone.getWorldPosition(tempWorldVecA.set(0, 0, 0))

    let furthestChild = null
    let furthestDistance = 0

    const chainNext = Array.isArray(chain) ? chain[jointIndex + 1] : null
    if (isBoneLike(chainNext)) {
      furthestChild = chainNext
      try {
        furthestChild.updateWorldMatrix(true, false)
        const childPos = furthestChild.getWorldPosition(tempWorldVecB.set(0, 0, 0))
        furthestDistance = childPos.distanceTo(boneWorldPos)
      } catch {}
    }

    if (!furthestChild && bone.children && bone.children.length > 0) {
      for (const child of bone.children) {
        if (!isBoneLike(child)) continue
        const childPos = child.getWorldPosition(tempWorldVecB.set(0, 0, 0))
        const distance = childPos.distanceTo(boneWorldPos)
        if (distance > furthestDistance) {
          furthestDistance = distance
          furthestChild = child
        }
      }
    }

    let childDirection = null
    if (furthestChild && furthestDistance > 1e-5) {
      const childWorld = furthestChild.getWorldPosition(tempWorldVecB.set(0, 0, 0))
      childDirection = childWorld.sub(boneWorldPos).normalize()
    }

    if (!childDirection && isBoneLike(bone.parent)) {
      try { bone.parent.updateWorldMatrix(true, false) } catch {}
      const parentWorld = bone.parent.getWorldPosition(tempWorldVecB.set(0, 0, 0))
      const fallbackDir = boneWorldPos.clone().sub(parentWorld)
      if (fallbackDir.lengthSq() > 1e-6) {
        childDirection = fallbackDir.normalize()
      }
    }

    let palmDirection = null
    if (isBoneLike(handBone)) {
      const palmWorld = handBone.getWorldPosition(tempWorldVecC.set(0, 0, 0))
      palmDirection = palmWorld.sub(boneWorldPos).normalize()
    } else if (isBoneLike(bone.parent)) {
      const parentWorld = bone.parent.getWorldPosition(tempWorldVecC.set(0, 0, 0))
      palmDirection = parentWorld.sub(boneWorldPos).normalize()
    }

    const defaultWorldAxis = convertLocalAxisToWorld(bone, defaultLocalAxis) || new THREE.Vector3(0, 0, hand === 'left' ? -1 : 1)

    if (finger === 'thumb') {
      if (jointIndex === 0 && palmDirection) {
        // 親指の付け根は手の平法線と指方向の外積で開閉軸を決定
        const referenceDirection = childDirection || defaultWorldAxis
        const palmNormal = palmDirection.clone().cross(referenceDirection)
        if (palmNormal.lengthSq() > 1e-6) {
          const axisWorld = palmDirection.clone().cross(palmNormal).normalize()
          const converted = convertWorldAxisToLocal(bone, boneWorldPos, axisWorld)
          if (converted) return alignAxisWithDefault(converted, defaultLocalAxis)
        }
        return new THREE.Vector3(0, hand === 'left' ? 1 : -1, 0)
      }
      if (!childDirection && palmDirection) {
        childDirection = palmDirection.clone().cross(defaultWorldAxis).normalize()
      }
    }

    let axisWorld = null
    if (childDirection && palmDirection) {
      axisWorld = palmDirection.clone().cross(childDirection)
      if (axisWorld.lengthSq() < 1e-6) {
        axisWorld = childDirection.clone().cross(palmDirection)
      }
    }

    if (!axisWorld || axisWorld.lengthSq() < 1e-6) {
      const fallbackPalm = palmDirection || new THREE.Vector3(hand === 'left' ? -1 : 1, 0, 0)
      if (childDirection) {
        axisWorld = fallbackPalm.clone().cross(childDirection)
      }
    }

    if (!axisWorld || axisWorld.lengthSq() < 1e-6) {
      return defaultLocalAxis.clone()
    }

    axisWorld.normalize()
    const converted = convertWorldAxisToLocal(bone, boneWorldPos, axisWorld)
    if (!converted || converted.lengthSq() < 1e-6) {
      return defaultLocalAxis.clone()
    }

    return alignAxisWithDefault(converted, defaultLocalAxis)
  }

  function convertWorldAxisToLocal(bone, boneWorldPos, axisWorld) {
    if (!bone || !axisWorld) return null
    const originLocal = bone.worldToLocal(boneWorldPos.clone())
    const endWorld = boneWorldPos.clone().add(axisWorld.clone().multiplyScalar(0.1))
    const endLocal = bone.worldToLocal(endWorld)
    const localAxis = endLocal.sub(originLocal).normalize()
    return localAxis.lengthSq() > 1e-6 ? localAxis : null
  }

  function alignAxisWithDefault(axis, defaultAxis) {
    if (!axis || !defaultAxis) return axis
    const dot = axis.dot(defaultAxis)
    if (dot < 0) {
      axis.multiplyScalar(-1)
    }
    return axis.normalize()
  }

  function convertLocalAxisToWorld(bone, localAxis) {
    if (!bone || !localAxis) return null
    const origin = new THREE.Vector3(0, 0, 0)
    const originWorld = bone.localToWorld(origin.clone())
    const endLocal = localAxis.clone().normalize().multiplyScalar(0.1)
    const endWorld = bone.localToWorld(endLocal)
    const worldAxis = endWorld.sub(originWorld).normalize()
    return worldAxis.lengthSq() > 1e-6 ? worldAxis : null
  }
  
  return {
    applyFingerPose
  }
}



