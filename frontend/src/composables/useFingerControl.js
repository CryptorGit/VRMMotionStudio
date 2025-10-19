import * as THREE from 'three'

// Finger bone mappings for VRM (using VRM humanoid bone names)
// 蜷・・ｽE・ｽ・ｽE・ｽ縺ｫ蟇ｾ縺励※隍・・ｽE・ｽ・ｽE・ｽ縺ｮ繝懶ｿｽE繝ｳ蜷榊呵｣懊ｒ逕ｨ諢擾ｼ・RM繝｢繝・・ｽE・ｽ・ｽE・ｽ縺ｫ繧医▲縺ｦ逡ｰ縺ｪ繧句錐蜑阪′菴ｿ繧上ｌ繧句ｴ蜷医′縺ゅｋ・ｽE・ｽE・ｽE・ｽE
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
  // 繝｢繝・・ｽE・ｽ・ｽE・ｽ縺斐→縺ｫ隗｣豎ｺ縺輔ｌ縺滂ｿｽE繝ｼ繝ｳ繝槭ャ繝斐Φ繧ｰ繧偵く繝｣繝・・ｽE・ｽ・ｽE・ｽ繝･
  const resolvedBoneMappings = new WeakMap()
  
  // 繝・・ｽE・ｽ・ｽE・ｽ繝・・ｽE・ｽ・ｽE・ｽ逕ｨ: 讀懶ｿｽE縺輔ｌ縺滂ｿｽE繝ｼ繝ｳ繧偵Ο繧ｰ蜃ｺ蜉幢ｼ井ｸ蠎ｦ縺縺托ｼ・
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
      // VRM 1.0 縺ｮ VRMHumanBoneLike 縺ｫ縺ｯ `node` 縺ｾ縺溘・ `bone` 繝励Ο繝代ユ繧｣縺悟ｭ伜惠縺吶ｋ
      for (const value of Object.values(candidate)) {
        const resolved = extractBoneNode(value)
        if (resolved) return resolved
      }
    }
    return null
  }

  function getHumanoidBone(humanoid, boneName) {
    if (!humanoid || !boneName) return null

    // VRM 1.0 縺ｮ蝣ｴ蜷・- getRawBoneNode
    if (typeof humanoid.getRawBoneNode === 'function') {
      try {
        const bone = humanoid.getRawBoneNode(boneName)
        const resolved = extractBoneNode(bone) || (isBoneLike(bone) ? bone : null)
        if (resolved) return resolved
      } catch (e) {
        console.debug(`[FingerControl] getRawBoneNode failed for ${boneName}:`, e)
      }
    }

    // VRM 0.x 縺ｮ蝣ｴ蜷・- getBoneNode
    if (typeof humanoid.getBoneNode === 'function') {
      try {
        const bone = humanoid.getBoneNode(boneName)
        const resolved = extractBoneNode(bone) || (isBoneLike(bone) ? bone : null)
        if (resolved) return resolved
      } catch (e) {
        console.debug(`[FingerControl] getBoneNode failed for ${boneName}:`, e)
      }
    }

    // getNormalizedBoneNode 繧りｩｦ縺・
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
  
  // 謖・・繝懊・繝ｳ繧貞宍蟇・↓迚ｹ螳壹☆繧・- 繧医ｊ遨肴･ｵ逧・↑讀懃ｴ｢
  function findFingerBones(model, humanoid, hand, finger, handBone) {
    const candidates = FINGER_BONES[hand][finger]
    
    console.log(`[FingerControl] Searching bones for ${hand} ${finger}...`)

    // 縺ｾ縺啖RM Humanoid縺九ｉ謗｢縺・
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
          console.log(`[FingerControl] 笨・Found ${hand} ${finger} via Humanoid: ${normalized.length} bones [${boneNamesList.join(', ')}]`)
          return normalized
        }
      }
    }

    console.log(`[FingerControl] Humanoid search failed for ${hand} ${finger}, trying hierarchy search...`)

    // Humanoid縺ｧ隕九▽縺九ｉ縺ｪ縺代ｌ縺ｰ縲∵焔縺ｮ繝懊・繝ｳ縺ｮ蟄仙ｭｫ縺九ｉ蜷榊燕縺ｧ讀懃ｴ｢
    if (isBoneLike(handBone)) {
      const result = searchFingerBonesInHierarchy(handBone, hand, finger, handBone)
      if (result && result.length >= 1) {
        console.log(`[FingerControl] 笨・Found ${hand} ${finger} via hand hierarchy: ${result.length} bones`)
        return result
      }
    }

    // 縺昴ｌ縺ｧ繧りｦ九▽縺九ｉ縺ｪ縺代ｌ縺ｰ繝ｫ繝ｼ繝亥・菴薙°繧画､懃ｴ｢
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
        console.log(`[FingerControl] 笨・Found ${hand} ${finger} via root search: ${result.length} bones`)
        return result
      }
    }

    console.warn(`[FingerControl] 笨・Could not find bones for ${hand} ${finger}`)
    return null
  }

  // 髫主ｱ､讒矩縺九ｉ謖・・ｽE・ｽE繝懶ｿｽE繝ｳ繧貞錐蜑阪〒讀懃ｴ｢
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

  // 繝｢繝・・ｽE・ｽ・ｽE・ｽ蜈ｨ菴難ｿｽE謖・・ｽE・ｽE繝ｼ繝ｳ繝槭ャ繝斐Φ繧ｰ繧定ｧ｣豎ｺ
  function resolveFingerBones(model, humanoid) {
    if (!model || !humanoid) return null
    
    // 繧ｭ繝｣繝・・ｽE・ｽ・ｽE・ｽ繝･繝√ぉ繝・・ｽE・ｽ・ｽE・ｽ
    let mapping = resolvedBoneMappings.get(model)
    if (mapping) return mapping
    
    mapping = { left: {}, right: {} }
    
    const leftHandBone = getHumanoidBone(humanoid, 'leftHand')
    const rightHandBone = getHumanoidBone(humanoid, 'rightHand')

    // 蟾ｦ謇具ｿｽE謖・
    for (const finger of Object.keys(FINGER_BONES.left)) {
      mapping.left[finger] = findFingerBones(model, humanoid, 'left', finger, leftHandBone)
    }
    
    // 蜿ｳ謇具ｿｽE謖・
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
    
    // 蟾ｦ謇・
    for (const finger of Object.keys(mapping.left)) {
      const bones = mapping.left[finger]
      if (bones) {
        bones.forEach((bone, index) => {
          const key = `left_${finger}_${index}`
          // 繝ｯ繝ｼ繝ｫ繝会ｿｽE繝医Μ繝・・ｽE・ｽ・ｽE・ｽ繧ｹ繧呈峩譁ｰ縺励※縺九ｉ蝗櫁ｻ｢繧剃ｿ晏ｭ・
          try { bone.updateWorldMatrix(true, false) } catch {}
          rotations[key] = bone.quaternion.clone()
          if (bone?.userData?.__fingerCurlAxis) {
            delete bone.userData.__fingerCurlAxis
          }
        })
      }
    }
    
    // 蜿ｳ謇・
    for (const finger of Object.keys(mapping.right)) {
      const bones = mapping.right[finger]
      if (bones) {
        bones.forEach((bone, index) => {
          const key = `right_${finger}_${index}`
          // 繝ｯ繝ｼ繝ｫ繝会ｿｽE繝医Μ繝・・ｽE・ｽ・ｽE・ｽ繧ｹ繧呈峩譁ｰ縺励※縺九ｉ蝗櫁ｻ｢繧剃ｿ晏ｭ・
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
      // 繝｢繝・・ｽE・ｽ・ｽE・ｽ縺後↑縺・・ｽE・ｽ・ｽE・ｽ蜷茨ｿｽE髱吶°縺ｫ邨ゆｺ・・ｽE・ｽ・ｽE・ｽ隴ｦ蜻奇ｿｽE蜃ｺ縺輔↑縺・・ｽE・ｽ・ｽE・ｽE
      return
    }
    
    const humanoid = model.vrm.humanoid
    const leftHandBone = getHumanoidBone(humanoid, 'leftHand')
    const rightHandBone = getHumanoidBone(humanoid, 'rightHand')

    // fingerStates繧貞叙蠕暦ｼ磯未謨ｰ邨檎罰縺ｧ譛譁ｰ縺ｮ蛟､繧貞叙蠕暦ｼ・
    const fingerStates = getFingerStates?.()
    if (!fingerStates) {
      console.warn('[FingerControl] fingerStates is not available')
      return
    }
    
    // 繝・・ｽE・ｽ・ｽE・ｽ繝・・ｽE・ｽ・ｽE・ｽ: fingerStates縺ｮ蜀・・ｽE・ｽ・ｽE・ｽ繧堤｢ｺ隱搾ｼ茨ｿｽE蝗橸ｿｽE縺ｿ・ｽE・ｽE・ｽE・ｽE
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
      if (!axisOverrides || typeof axisOverrides !== 'object') return 'z+'
      const raw = axisOverrides[key]
      if (typeof raw !== 'string') return 'z+'
      const normalized = raw.trim().toLowerCase()
      if (!normalized || normalized === 'auto') return 'z+'
      switch (normalized) {
        case 'x+':
        case 'x-':
        case 'y+':
        case 'y-':
        case 'z+':
        case 'z-':
          return normalized
        default:
          return 'z+'
      }
    }
    const trackedFingerKeys = [
      ...Object.keys(FINGER_BONES.left).map(finger => `left_${finger}`),
      ...Object.keys(FINGER_BONES.right).map(finger => `right_${finger}`)
    ]

    const hasActiveCurl = trackedFingerKeys.some(key => Math.abs(readFingerAngle(key)) > 0.1)

    // 繝・・ｽE・ｽ・ｽE・ｽ繝・・ｽE・ｽ・ｽE・ｽ: 蛻晏屓縺ｮ縺ｿ繝ｭ繧ｰ繧抵ｿｽE蜉・
    if (hasActiveCurl && !model.userData?.__fingerControlDebugLogged) {
      if (!model.userData) model.userData = {}
      model.userData.__fingerControlDebugLogged = true
      console.log('[FingerControl] applyFingerPose called with active curl values')
      
      // 繧｢繧ｯ繝・・ｽE・ｽ・ｽE・ｽ繝悶↑謖・・ｽE・ｽ・ｽE・ｽ繝ｭ繧ｰ蜃ｺ蜉・
      const activeFingers = trackedFingerKeys.filter(key => Math.abs(readFingerAngle(key)) > 0.1)
      console.log('[FingerControl] Active fingers:', activeFingers.map(key => `${key}: ${readFingerAngle(key).toFixed(1)}ﾂｰ`))
    }

    if (!hasActiveCurl) {
      // 繧ｫ繝ｼ繝ｫ縺鯉ｿｽE縺ｦ0縺ｮ蝣ｴ蜷茨ｿｽE蛻晄悄迥ｶ諷九↓繝ｪ繧ｻ繝・・ｽE・ｽ・ｽE・ｽ
      if (initialRotations.has(model)) {
        const rotations = initialRotations.get(model)
        const mapping = resolveFingerBones(model, humanoid)
        if (mapping) {
          // 蟾ｦ謇具ｿｽE謖・・ｽE・ｽ・ｽE・ｽ蛻晄悄迥ｶ諷九↓謌ｻ縺・
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
          // 蜿ｳ謇具ｿｽE謖・・ｽE・ｽ・ｽE・ｽ蛻晄悄迥ｶ諷九↓謌ｻ縺・
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
        // 繝・・ｽE・ｽ・ｽE・ｽ繝・・ｽE・ｽ・ｽE・ｽ繝輔Λ繧ｰ繧ゅΜ繧ｻ繝・・ｽE・ｽ・ｽE・ｽ
        if (model.userData) {
          delete model.userData.__fingerControlDebugLogged
          // 蜷・・ｽE・ｽ・ｽE・ｽ縺ｮ繝・・ｽE・ｽ・ｽE・ｽ繝・・ｽE・ｽ・ｽE・ｽ繝輔Λ繧ｰ繧ゅΜ繧ｻ繝・・ｽE・ｽ・ｽE・ｽ
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
    
    // 隗｣豎ｺ縺輔ｌ縺滂ｿｽE繝ｼ繝ｳ繝槭ャ繝斐Φ繧ｰ繧貞叙蠕・
    let mapping = resolveFingerBones(model, humanoid)
    // 繧ゅ＠譛ｪ讀懶ｿｽE謖・・ｽE・ｽ・ｽE・ｽ縺ゅｋ蝣ｴ蜷茨ｿｽE繧ｭ繝｣繝・・ｽE・ｽ・ｽE・ｽ繝･繧堤ｴ譽・・ｽE・ｽ・ｽE・ｽ縺ｦ蜀肴爾邏｢・ｽE・ｽE・ｽE・ｽ繝｢繝・・ｽE・ｽ・ｽE・ｽ繝ｭ繝ｼ繝牙ｾ碁≦蟒ｶ逕滂ｿｽE繧ｱ繝ｼ繧ｹ蟇ｾ遲厄ｼ・
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
    
    // 繝・・ｽE・ｽ・ｽE・ｽ繝・・ｽE・ｽ・ｽE・ｽ: 讀懶ｿｽE縺輔ｌ縺滂ｿｽE繝ｼ繝ｳ繧堤｢ｺ隱搾ｼ茨ｿｽE蝗橸ｿｽE縺ｿ・ｽE・ｽE・ｽE・ｽE
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

    // 蜷・・ｽE・ｽ・ｽE・ｽ遽縺ｫ譛螟ｧ90蠎ｦ縺ｾ縺ｧ譖ｲ縺偵ｋ・ｽE・ｽE・ｽE・ｽ隨ｬ荳縲懃ｬｬ荳蛾未遽繧貞插遲峨↓・ｽE・ｽE・ｽE・ｽE
    const clampedAngleDeg = THREE.MathUtils.clamp(angleDeg ?? 0, -90, 90)

    // 隨ｬ荳縲懃ｬｬ荳蛾未遽・ｽE・ｽE・ｽE・ｽ譛螟ｧ3髢｢遽・ｽE・ｽE・ｽE・ｽ繧呈峇縺偵ｋ
    const jointsToRotate = Math.min(MAX_FINGER_JOINTS, bones.length)
    
    // 繝・・ｽE・ｽ・ｽE・ｽ繝・・ｽE・ｽ・ｽE・ｽ: 繧ｫ繝ｼ繝ｫ縺ｮ驕ｩ逕ｨ繧偵Ο繧ｰ蜃ｺ蜉幢ｼ茨ｿｽE蝗橸ｿｽE縺ｿ・ｽE・ｽE・ｽE・ｽE
    const logKey = `${hand}_${finger}_curl_applied`
    if (Math.abs(clampedAngleDeg) > 0.5 && !model.userData?.[logKey]) {
      if (!model.userData) model.userData = {}
      model.userData[logKey] = true
      console.log(`[FingerControl] Applying curl to ${hand} ${finger}: ${clampedAngleDeg.toFixed(1)}ﾂｰ, ${jointsToRotate} joints, ${bones.length} bones total`)
      console.log(`[FingerControl] Bone names:`, bones.map((b, i) => `Joint${i + 1}:${b?.name || '(unnamed)'}`).join(', '))
    }

    if (Math.abs(clampedAngleDeg) < 0.001) {
      // 繧ｫ繝ｼ繝ｫ縺・縺ｮ蝣ｴ蜷茨ｿｽE蛻晄悄迥ｶ諷九↓謌ｻ縺・
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

    // 蜷・・ｽE・ｽ・ｽE・ｽ遽繧呈峇縺偵ｋ
    const overrideAxisVec = createAxisVectorFromOverride(axisOverride)

    for (let index = 0; index < jointsToRotate; index++) {
      const bone = bones[index]
      if (!isBoneLike(bone)) continue
      
      const rotKey = `${hand}_${finger}_${index}`
      let initialRot = savedRotations[rotKey]
      
      if (!initialRot) {
        // 蛻晄悄蝗櫁ｻ｢繧剃ｿ晏ｭ假ｼ育樟蝨ｨ縺ｮ迥ｶ諷九ｒ蝓ｺ貅悶→縺励※菫晏ｭ假ｼ・
        try {
          bone.updateWorldMatrix(true, false)
        } catch {}
        initialRot = bone.quaternion.clone()
        savedRotations[rotKey] = initialRot
        console.log(`[FingerControl] Saved initial rotation for ${hand} ${finger} joint ${index + 1}`)
      }
      
      // 蛻晄悄蝗櫁ｻ｢縺ｫ謌ｻ縺・
      bone.quaternion.copy(initialRot)
      
      // 蝮・・ｽE・ｽ・ｽE・ｽ・ｽE・ｽE蛻・ 蜷・・ｽE・ｽ・ｽE・ｽ遽縺悟酔縺倩ｧ貞ｺｦ縺ｧ譖ｲ縺後ｋ
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
      
      // 繝槭ヨ繝ｪ繝・・ｽE・ｽ・ｽE・ｽ繧ｹ繧呈峩譁ｰ
      bone.updateMatrix()
      
      // 繝・・ｽE・ｽ・ｽE・ｽ繝・・ｽE・ｽ・ｽE・ｽ: 蝗櫁ｻ｢縺ｮ驕ｩ逕ｨ繧偵Ο繧ｰ蜃ｺ蜉幢ｼ茨ｿｽE蝗橸ｿｽE縺ｿ・ｽE・ｽE・ｽE・ｽE
      const jointLogKey = `${hand}_${finger}_${index}_rotation_applied`
      if (Math.abs(clampedAngleDeg) > 0.5 && !model.userData?.[jointLogKey]) {
        if (!model.userData) model.userData = {}
        model.userData[jointLogKey] = true
        console.log(`[FingerControl] Applied ${THREE.MathUtils.radToDeg(angle).toFixed(1)}ﾂｰ rotation to ${hand} ${finger} joint ${index + 1} around local axis (${normalizedAxis.x.toFixed(2)}, ${normalizedAxis.y.toFixed(2)}, ${normalizedAxis.z.toFixed(2)})`)
      }
    }
    
    // 縺吶∋縺ｦ縺ｮ繝懶ｿｽE繝ｳ縺ｮ譖ｴ譁ｰ縺悟ｮ御ｺ・・ｽE・ｽ・ｽE・ｽ縺溷ｾ後√Ρ繝ｼ繝ｫ繝会ｿｽE繝医Μ繝・・ｽE・ｽ・ｽE・ｽ繧ｹ繧貞ｼｷ蛻ｶ逧・・ｽE・ｽ・ｽE・ｽ蜀崎ｨ育ｮ・
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
  
  // 繝懶ｿｽE繝ｳ縺ｮ螳滄圀縺ｮ讒矩縺ｫ蝓ｺ縺･縺・・ｽE・ｽ・ｽE・ｽ譛驕ｩ縺ｪ蝗櫁ｻ｢霆ｸ繧呈ｱｺ螳・
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
        // 隕ｪ謖・・莉倥￠譬ｹ縺ｯ謇九・蟷ｳ豕慕ｷ壹→謖・婿蜷代・螟也ｩ阪〒髢矩哩霆ｸ繧呈ｱｺ螳・
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





