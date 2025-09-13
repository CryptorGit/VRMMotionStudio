import { ref, markRaw } from 'vue'
import * as THREE from 'three'
import { createLoader } from '../utils/createLoader.js'

export function useModelOperations({
  scene,
  camera,
  renderer,
  helper,
  controls,
  showPhysicalBones,
  showOtherBones,
  boneDotSize,
  boneLabelScale,
  currentMeshRef,
  menuOpen,
  logToServer,
  viewer,
  loader,
  cache,
  poses,
  selectedPose
}) {
  const models = ref([])
  let nextModelId = 1

  const LOCAL_MODELS_KEY = 'importedModels'

  // =============== Camera framing ===============
  
  function frameObject(object3D, vrm, parser) {
    try {
      const container = renderer?.value?.domElement?.parentElement
      const width = container?.clientWidth || 1
      const height = container?.clientHeight || 1
      const aspect = width / height

      const box = new THREE.Box3().setFromObject(object3D)
      if (!isFinite(box.min.x) || !isFinite(box.max.x)) return
      const size = new THREE.Vector3()
      box.getSize(size)
      const center = new THREE.Vector3(); box.getCenter(center)

      // Robust target/forward determination
      const { target, forward } = computeTargetAndForward(vrm, center)

      const maxSize = Math.max(size.x, size.y, size.z) || 1
      const fov = THREE.MathUtils.degToRad(camera.value.fov)
      const fovH = 2 * Math.atan(Math.tan(fov / 2) * aspect)
      const fitHeightDistance = (maxSize / 2) / Math.tan(fov / 2)
      const fitWidthDistance = (maxSize / 2) / Math.tan(fovH / 2)
      const distance = Math.max(fitHeightDistance, fitWidthDistance)

      // Place camera in front of the face: head position + forward * distance
      const newPos = target.clone().add(forward.clone().multiplyScalar(distance * 1.2))
      camera.value.position.copy(newPos)

      // Near/Far tuned to model scale
      const near = Math.max(0.01, distance * 0.01)
      const far = Math.max(near + 10, distance * 50)
      camera.value.near = near
      camera.value.far = far
      camera.value.updateProjectionMatrix()

      if (controls?.value) {
        controls.value.target.copy(target)
        // Prevent getting too close (avoid interior slicing)
        const minDist = Math.max(0.05, maxSize * 0.6)
        const maxDist = Math.max(10, distance * 10)
        controls.value.minDistance = minDist
        controls.value.maxDistance = maxDist
        controls.value.update()
      } else {
        camera.value.lookAt(target)
      }
    } catch (e) {
      console.warn('frameObject error:', e)
    }
  }

  function computeTargetAndForward(vrm, fallbackCenter) {
    // Target prefers spine; forward prefers eyes/head
    const target = new THREE.Vector3()
    let forward = new THREE.Vector3(0, 0, -1)
    try {
      const spine = getHumanoidNode(vrm, 'spine') || getHumanoidNode(vrm, 'chest') || getHumanoidNode(vrm, 'upperChest') || getHumanoidNode(vrm, 'hips')
      const head = getHumanoidHead(vrm)
      const leftEye = getHumanoidNode(vrm, 'leftEye')
      const rightEye = getHumanoidNode(vrm, 'rightEye')
      const neck = getHumanoidNode(vrm, 'neck')

      // Choose target
      if (spine) spine.getWorldPosition(target)
      else target.copy(fallbackCenter || new THREE.Vector3())

      // Choose forward
      if (leftEye && rightEye) {
        const lp = leftEye.getWorldPosition(new THREE.Vector3())
        const rp = rightEye.getWorldPosition(new THREE.Vector3())
        // Build axes: X from left->right, Y from neck->head or world up
        const x = rp.clone().sub(lp)
        if (x.lengthSq() > 1e-6) x.normalize(); else x.set(1, 0, 0)
        let y = new THREE.Vector3(0, 1, 0)
        if (neck && head) {
          const np = neck.getWorldPosition(new THREE.Vector3())
          const hp = head.getWorldPosition(new THREE.Vector3())
          y = hp.clone().sub(np)
          if (y.lengthSq() > 1e-6) y.normalize(); else y.set(0, 1, 0)
        }
        let z = new THREE.Vector3().crossVectors(x, y)
        if (z.lengthSq() < 1e-6) z.set(0, 0, -1)
        z.normalize()
        // Align with head forward if available
        let headFwd = new THREE.Vector3(0, 0, -1)
        try { head && head.getWorldDirection(headFwd) } catch {}
        if (headFwd.lengthSq() < 1e-6) headFwd.set(0, 0, -1)
        forward = z.dot(headFwd) >= (-z).dot(headFwd) ? z : z.multiplyScalar(-1)
      } else if (head) {
        head.getWorldDirection(forward)
      } else if (spine) {
        spine.getWorldDirection(forward)
      }
    } catch {}
    if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1)
    return { target, forward: forward.normalize() }
  }

  function getHumanoidHead(vrm) {
    if (!vrm?.humanoid) return null
    try {
      // Try enum API
      const maybeEnum = vrm?.humanoid?.constructor?.VRMHumanBoneName || vrm?.VRMHumanBoneName
      // Prefer raw/normalized accessors (v2)
      const getter = vrm.humanoid.getRawBoneNode?.bind(vrm.humanoid) || vrm.humanoid.getNormalizedBoneNode?.bind(vrm.humanoid) || vrm.humanoid.getBoneNode?.bind(vrm.humanoid)
      if (maybeEnum && getter) return getter(maybeEnum.Head) || null
    } catch {}
    try {
      // Common string keys
      const getter = vrm.humanoid.getRawBoneNode?.bind(vrm.humanoid) || vrm.humanoid.getNormalizedBoneNode?.bind(vrm.humanoid) || vrm.humanoid.getBoneNode?.bind(vrm.humanoid)
      return getter?.('head') || getter?.('Head') || getter?.('HEAD') || null
    } catch {}
    try {
      // Fallback: search humanBones mapping
      const bones = enumerateHumanoidBones(vrm)
      const head = bones.find(b => /head/i.test(b?.name || ''))
      return head || null
    } catch {}
    return null
  }

  function getHumanoidNode(vrm, name) {
    if (!vrm?.humanoid) return null
    try {
      const getter = vrm.humanoid.getRawBoneNode?.bind(vrm.humanoid) || vrm.humanoid.getNormalizedBoneNode?.bind(vrm.humanoid) || vrm.humanoid.getBoneNode?.bind(vrm.humanoid)
      const n = getter?.(name) || getter?.(capitalizeFirst(name))
      return n && n.isObject3D ? n : null
    } catch {}
    return null
  }

  // =============== Bone helpers ===============

  function enumerateHumanoidBones(vrm) {
    if (!vrm?.humanoid) return []
    // Prefer an explicit mapping if present
    try {
      const hb = vrm.humanoid.humanBones
      // Map or array-like of nodes
      if (hb && typeof hb.forEach === 'function') {
        const arr = []
        hb.forEach(v => {
          const node = v?.node || v?.bones?.node || v
          if (node?.isObject3D) arr.push(node)
        })
        if (arr.length) return arr
      }
    } catch {}
    // Try known bone names via getBoneNode
    const names = [
      'hips','spine','chest','upperChest','neck','head',
      'leftEye','rightEye','jaw',
      'leftShoulder','leftUpperArm','leftLowerArm','leftHand',
      'rightShoulder','rightUpperArm','rightLowerArm','rightHand',
      'leftUpperLeg','leftLowerLeg','leftFoot','leftToes',
      'rightUpperLeg','rightLowerLeg','rightFoot','rightToes'
    ]
    const list = []
    try {
      for (const n of names) {
        const getter = vrm.humanoid.getRawBoneNode?.bind(vrm.humanoid) || vrm.humanoid.getNormalizedBoneNode?.bind(vrm.humanoid) || vrm.humanoid.getBoneNode?.bind(vrm.humanoid)
        const node = getter?.(n) || getter?.(capitalizeFirst(n))
        if (node && node.isObject3D) list.push(node)
      }
    } catch {}
    return list
  }

  function enumerateAllBones(root) {
    const bones = []
    try {
      root.traverse(obj => {
        if (obj && obj.isBone) bones.push(obj)
      })
    } catch {}
    return bones
  }

  function capitalizeFirst(s) { return s ? s[0].toUpperCase() + s.slice(1) : s }

  // =============== Node index mapping helpers ===============
  function getParserFromModel(model) {
    return model?.gltf?.parser || null
  }

  function getObjectNodeIndex(obj, parser) {
    if (!obj || !parser || !parser.associations) return undefined
    try {
      const a = parser.associations.get(obj)
      const index = a && (a.index ?? a.i ?? a.node)
      return typeof index === 'number' ? index : undefined
    } catch {}
    return undefined
  }

  function buildIndexToObjectMap(root, parser) {
    const map = new Map()
    if (!root || !parser?.associations) return map
    try {
      root.traverse(o => {
        const idx = getObjectNodeIndex(o, parser)
        if (typeof idx === 'number') map.set(idx, o)
      })
    } catch {}
    return map
  }

  // Try to obtain runtime spring joints across library variants
  function getRuntimeSpringJoints(vrm) {
    const out = []
    const mgr = vrm?.springBoneManager
    if (!mgr) return out
    const direct = [mgr.joints, mgr._joints, mgr.springJoints, mgr._springJoints, mgr._jointList]
    for (const a of direct) if (Array.isArray(a)) a.forEach(j => out.push(j))
    if (out.length === 0) {
      const visited = new Set()
      function scan(obj, depth = 0) {
        if (!obj || typeof obj !== 'object' || visited.has(obj) || depth > 5) return
        visited.add(obj)
        if (Array.isArray(obj)) {
          for (const v of obj) {
            if (v && (v.node || v.bone || v.target || v.joint)) out.push(v)
            else scan(v, depth + 1)
          }
          return
        }
        for (const k in obj) scan(obj[k], depth + 1)
      }
      try { scan(mgr) } catch {}
    }
    return out
  }

  function collectHumanoidIndexSet(model) {
    const set = new Set()
    const parser = getParserFromModel(model)
    const json = parser?.json || null
    try {
      // Prefer JSON humanoid maps
      const ext1 = json?.extensions?.VRMC_vrm
      const ext0 = json?.extensions?.VRM
      if (ext1?.humanoid?.humanBones) {
        const hb = ext1.humanoid.humanBones
        if (Array.isArray(hb)) hb.forEach(b => typeof b?.node === 'number' && set.add(b.node))
        else if (hb && typeof hb === 'object') {
          Object.values(hb).forEach(v => typeof v?.node === 'number' && set.add(v.node))
        }
      } else if (ext0?.humanoid?.humanBones) {
        const hb0 = ext0.humanoid.humanBones
        if (Array.isArray(hb0)) hb0.forEach(b => typeof b?.node === 'number' && set.add(b.node))
        else if (hb0 && typeof hb0 === 'object') {
          Object.values(hb0).forEach(v => typeof v?.node === 'number' && set.add(v.node))
        }
      }
    } catch {}
    // Fallback: runtime humanoid nodes mapped to indices
    if (set.size === 0 && model?.vrm?.humanoid && parser) {
      const names = [
        'hips','spine','chest','upperChest','neck','head',
        'leftEye','rightEye','jaw',
        'leftShoulder','leftUpperArm','leftLowerArm','leftHand',
        'rightShoulder','rightUpperArm','rightLowerArm','rightHand',
        'leftUpperLeg','leftLowerLeg','leftFoot','leftToes',
        'rightUpperLeg','rightLowerLeg','rightFoot','rightToes'
      ]
      try {
        for (const n of names) {
          const obj = getHumanoidNode(model.vrm, n)
          const idx = getObjectNodeIndex(obj, parser)
          if (typeof idx === 'number') set.add(idx)
        }
      } catch {}
    }
    return set
  }

  function collectColliderIndexSet(json) {
    const set = new Set()
    try {
      const ext0 = json?.extensions?.VRM
      const ext1 = json?.extensions?.VRMC_springBone
      if (ext0?.secondaryAnimation?.colliderGroups) {
        for (const cg of ext0.secondaryAnimation.colliderGroups) {
          const idx = cg?.node
          if (typeof idx === 'number') set.add(idx)
        }
      }
      if (ext1 && Array.isArray(ext1.colliders)) {
        // VRM1.0: Only colliders[].node are physical collider attachments
        for (const c of ext1.colliders) {
          const idx = c?.node
          if (typeof idx === 'number') set.add(idx)
        }
      }
    } catch {}
    return set
  }

  function collectPhysicalBoneIndexSet(model) {
    const indices = new Set()
    const parser = getParserFromModel(model)
    const json = parser?.json || null
    const vrm = model?.vrm
    const indexToObj = buildIndexToObjectMap(vrm?.scene, parser)
    // VRM1.0: prefer runtime
    let usedRuntime = false
    try {
      const joints = getRuntimeSpringJoints(vrm)
      if (Array.isArray(joints) && joints.length && parser) {
        function resolveIdx(obj) {
          let idx = getObjectNodeIndex(obj, parser)
          if (typeof idx === 'number') return idx
          if (!obj) return undefined
          for (const [i, o] of indexToObj) if (o === obj) return i
          if (obj.name) {
            const matches = []
            for (const [i, o] of indexToObj) if (o.name === obj.name) matches.push(i)
            if (matches.length === 1) return matches[0]
          }
          return undefined
        }
        for (const j of joints) {
          const obj = j?.node || j?.bone || j?.target || j?.joint
          const idx = resolveIdx(obj)
          if (typeof idx === 'number') indices.add(idx)
        }
        usedRuntime = indices.size > 0
      }
    } catch {}
    // Fallback to JSON
    if (!usedRuntime && json?.extensions?.VRMC_springBone?.joints) {
      try {
        for (const j of json.extensions.VRMC_springBone.joints) {
          const n = j?.node
          if (typeof n === 'number') indices.add(n)
        }
      } catch {}
    }
    // VRM0.x: expand single chains from boneGroups[].bones[] roots
    if (indices.size === 0 && json?.extensions?.VRM?.secondaryAnimation?.boneGroups) {
      try {
        const bg = json.extensions.VRM.secondaryAnimation.boneGroups
        function walkChain(rootIndex) {
          const rootObj = indexToObj.get(rootIndex)
          if (!rootObj) return
          const stack = [rootObj]
          while (stack.length) {
            const obj = stack.pop()
            const idx = getObjectNodeIndex(obj, parser)
            if (typeof idx === 'number' && !indices.has(idx)) indices.add(idx)
            // Follow bone children only (single chains; branches handled as parallel chains)
            for (const c of obj.children || []) {
              if (c && c.isBone) stack.push(c)
            }
          }
        }
        for (const g of bg) {
          const arr = g?.bones || []
          for (const b of arr) {
            const r = typeof b === 'number' ? b : (typeof b?.node === 'number' ? b.node : undefined)
            if (typeof r === 'number') walkChain(r)
          }
        }
      } catch {}
    }
    // Exclude explicit collider attachment nodes by schema path
    if (json) {
      try {
        const colliders = collectColliderIndexSet(json)
        for (const c of colliders) indices.delete(c)
      } catch {}
    }
    return indices
  }

  function createTextSprite(text) {
    const canvas = document.createElement('canvas')
    const ctx2d = canvas.getContext('2d')
    const fontSize = 28
    const padding = 8
    ctx2d.font = `${fontSize}px sans-serif`
    const metrics = ctx2d.measureText(text)
    const w = Math.ceil(metrics.width + padding * 2)
    const h = Math.ceil(fontSize + padding * 2)
    canvas.width = w
    canvas.height = h
    // redraw with proper size
    const ctx = canvas.getContext('2d')
    ctx.font = `${fontSize}px sans-serif`
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#fff'
    ctx.textBaseline = 'top'
    ctx.fillText(text, padding, padding)
    const texture = new THREE.CanvasTexture(canvas)
    texture.minFilter = THREE.LinearFilter
    texture.generateMipmaps = false
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false, transparent: true })
    const sprite = new THREE.Sprite(material)
    const base = 0.005
    sprite.scale.set(w * base, h * base, 1)
    sprite.userData.baseScale = { x: w * base, y: h * base }
    sprite.renderOrder = 999
    return sprite
  }

  function ensureBoneGizmos(model) {
    // Debug ON by default. Turn OFF with localStorage.setItem('boneDebug','0')
    const debugOn = (typeof localStorage === 'undefined') ? true : (localStorage.getItem('boneDebug') !== '0')
    if (model.boneGizmos) {
      if (debugOn) {
        try {
          const vrm = model.vrm
          const parser = getParserFromModel(model)
          const indexToObj = buildIndexToObjectMap(vrm.scene, parser)
          const json = parser?.json
          const colliderIdxSet = json ? collectColliderIndexSet(json) : new Set()
          const allBoneObjs = enumerateAllBones(vrm.scene)
          const totalBones = allBoneObjs.length
          const humanoidIdxSet = collectHumanoidIndexSet(model)
          const physicalIdxSet = collectPhysicalBoneIndexSet(model)
          const unmappedPhysicalIndices = Array.from(physicalIdxSet).filter(i => !indexToObj.has(i))
          const otherButPhysical = []
          const humanoidObjSet = new Set()
          const physicalObjSet = new Set()
          for (const i of humanoidIdxSet) { const o = indexToObj.get(i); if (o) humanoidObjSet.add(o) }
          for (const i of physicalIdxSet) { const o = indexToObj.get(i); if (o) physicalObjSet.add(o) }
          try {
            const joints = getRuntimeSpringJoints(model?.vrm)
            if (Array.isArray(joints)) joints.forEach(j => { const o = j?.node || j?.bone || j?.target || j?.joint; if (o) physicalObjSet.add(o) })
          } catch {}
          for (const b of allBoneObjs) {
            const idx = getObjectNodeIndex(b, parser)
            if (typeof idx === 'number' && physicalIdxSet.has(idx) && !physicalObjSet.has(b) && !humanoidObjSet.has(b)) {
              otherButPhysical.push({ name: b.name || '(no-name)', idx })
            }
          }
          for (const o of humanoidObjSet) physicalObjSet.delete(o)
          const overlapHumPhys = []
          const rawPhysObjs = new Set()
          for (const i of physicalIdxSet) { const o = indexToObj.get(i); if (o) rawPhysObjs.add(o) }
          try {
            const joints = getRuntimeSpringJoints(model?.vrm)
            if (Array.isArray(joints)) joints.forEach(j => { const o = j?.node || j?.bone || j?.target || j?.joint; if (o) rawPhysObjs.add(o) })
          } catch {}
          for (const o of rawPhysObjs) if (humanoidObjSet.has(o)) overlapHumPhys.push(o.name || '(no-name)')
          const payload = {
            event: 'bone-debug',
            model: model.name,
            totals: {
              totalBones,
              humanoidIndexCount: humanoidIdxSet.size,
              physicalIndexCount: physicalIdxSet.size,
              colliderIndexCount: colliderIdxSet.size,
              humanoidObjectCount: humanoidObjSet.size,
              physicalObjectCount: physicalObjSet.size,
              runtimeJointCount: getRuntimeSpringJoints(model?.vrm)?.length || 0
            },
            reasons: {
              unmappedPhysicalIndices,
              otherButPhysical,
              overlapHumanoidPhysical: overlapHumPhys.slice(0, 20)
            },
            toggles: {
              modelVisible: !!model.visible,
              bonesVisible: !!model.bonesVisible,
              boneNameVisible: !!model.boneNameVisible
            }
          }
          console.debug('BoneClassification', payload)
        } catch {}
      }
      return model.boneGizmos
    }
    const vrm = model.vrm
    const parser = getParserFromModel(model)
    const indexToObj = buildIndexToObjectMap(vrm.scene, parser)
    const physicalIndexSet = collectPhysicalBoneIndexSet(model)
    const humanoidIndexSet = collectHumanoidIndexSet(model)

    // Build object sets from indices
    const humanoidObjSet = new Set()
    const physicalObjSet = new Set()
    for (const idx of humanoidIndexSet) {
      const o = indexToObj.get(idx)
      if (o) humanoidObjSet.add(o)
    }
    for (const idx of physicalIndexSet) {
      const o = indexToObj.get(idx)
      if (o) physicalObjSet.add(o)
    }

    // Runtime fallback enrichment
    // - Humanoid: add runtime nodes if mapping failed
    try { enumerateHumanoidBones(vrm).forEach(o => o && humanoidObjSet.add(o)) } catch {}
    // - Physical: add runtime spring joints' nodes directly (may be non-Bone)
    try {
      const joints = getRuntimeSpringJoints(vrm)
      if (Array.isArray(joints)) {
        for (const j of joints) {
          const o = j?.node || j?.bone || j?.target || j?.joint
          if (o) physicalObjSet.add(o)
        }
      }
    } catch {}

    // Priority: Humanoid > Physical. Remove overlaps from physical.
    for (const o of humanoidObjSet) physicalObjSet.delete(o)

    // Debug logging to investigate classification issues
    try {
      if (debugOn) {
        const json = parser?.json
        const colliderIdxSet = json ? collectColliderIndexSet(json) : new Set()
        const allBoneObjs = enumerateAllBones(vrm.scene)
        const totalBones = allBoneObjs.length
        const humanoidIdxSet = collectHumanoidIndexSet(model)
        const physicalIdxSet = collectPhysicalBoneIndexSet(model)
        const indexToObjKeys = indexToObj ? Array.from(indexToObj.keys()) : []
        const unmappedPhysicalIndices = Array.from(physicalIdxSet).filter(i => !indexToObj.has(i))
        // Other that should have been physical (index implies physical but object not recognized as such)
        const otherButPhysical = []
        for (const b of allBoneObjs) {
          const idx = getObjectNodeIndex(b, parser)
          if (typeof idx === 'number' && physicalIdxSet.has(idx) && !physicalObjSet.has(b) && !humanoidObjSet.has(b)) {
            otherButPhysical.push({ name: b.name || '(no-name)', idx })
          }
        }
        const overlapHumPhys = []
        // Overlaps removed (names)
        // Recompute raw physical objs before overlap removal for reporting
        // We approximate by mapping indices
        const rawPhysObjs = new Set()
        for (const i of physicalIdxSet) {
          const o = indexToObj.get(i)
          if (o) rawPhysObjs.add(o)
        }
        try {
          const joints = getRuntimeSpringJoints(vrm)
          if (Array.isArray(joints)) {
            for (const j of joints) {
              const o = j?.node || j?.bone || j?.target || j?.joint
              if (o) rawPhysObjs.add(o)
            }
          }
        } catch {}
        for (const o of rawPhysObjs) if (humanoidObjSet.has(o)) overlapHumPhys.push(o.name || '(no-name)')

        const payload = {
          event: 'bone-debug',
          model: model.name,
          totals: {
            totalBones,
            humanoidIndexCount: humanoidIdxSet.size,
            physicalIndexCount: physicalIdxSet.size,
            colliderIndexCount: colliderIdxSet.size,
            humanoidObjectCount: humanoidObjSet.size,
            physicalObjectCount: physicalObjSet.size,
            runtimeJointCount: getRuntimeSpringJoints(vrm)?.length || 0
          },
          reasons: {
            unmappedPhysicalIndices,
            otherButPhysical,
            overlapHumanoidPhysical: overlapHumPhys.slice(0, 20)
          },
          toggles: {
            modelVisible: !!model.visible,
            bonesVisible: !!model.bonesVisible,
            boneNameVisible: !!model.boneNameVisible
          }
        }
        console.debug('BoneClassification', payload)
      }
    } catch {}

    // Prepare arrays for gizmo creation
    const humanoidBones = Array.from(humanoidObjSet)
    const physicalBones = Array.from(physicalObjSet)
    // Other bones: everything not recognized as humanoid or physical
    const otherBones = []
    for (const b of enumerateAllBones(vrm.scene)) {
      if (humanoidObjSet.has(b)) continue
      if (physicalObjSet.has(b)) continue
      otherBones.push(b)
    }
    const geom = new THREE.SphereGeometry(0.02, 8, 8)
    const matHuman = new THREE.MeshBasicMaterial({ color: 0x00aaff, depthTest: false, depthWrite: false })
    const matPhys = new THREE.MeshBasicMaterial({ color: 0xff8800, depthTest: false, depthWrite: false })
    const matOther = new THREE.MeshBasicMaterial({ color: 0x888888, depthTest: false, depthWrite: false })
    const humanoidMeshes = []
    const humanoidLabels = []
    const physicalMeshes = []
    const physicalLabels = []
    const otherMeshes = []
    const otherLabels = []
    const added = new Set()
    const pushNode = (node, mat, arrMeshes, arrLabels) => {
      if (!node || added.has(node)) return
      added.add(node)
      const dot = new THREE.Mesh(geom, mat)
      dot.name = `bone-dot:${node.name || ''}`
      dot.renderOrder = 998
      dot.userData.__helper = true
      node.add(dot)
      arrMeshes.push(dot)
      const label = createTextSprite(node.name || 'bone')
      label.position.set(0, 0.05, 0)
      node.add(label)
      arrLabels.push(label)
    }
    humanoidBones.forEach(node => pushNode(node, matHuman, humanoidMeshes, humanoidLabels))
    physicalBones.forEach(node => pushNode(node, matPhys, physicalMeshes, physicalLabels))
    otherBones.forEach(node => pushNode(node, matOther, otherMeshes, otherLabels))
    model.boneGizmos = {
      humanoidMeshes,
      humanoidLabels,
      physicalMeshes,
      physicalLabels,
      otherMeshes,
      otherLabels,
      geom,
      matHuman,
      matPhys,
      matOther
    }
    return model.boneGizmos
  }

  function applyBoneSettingsToModel(model) {
    const g = ensureBoneGizmos(model)
    const size = Math.max(0.001, Math.min(0.2, Number(boneDotSize?.value ?? 0.02)))
    const labelScale = Math.max(0.1, Math.min(5, Number(boneLabelScale?.value ?? 1.0)))
    const vis = !!model.visible
    const showPhys = !!(showPhysicalBones?.value)
    const showOther = !!(showOtherBones?.value)
    try {
      const scaleS = size / 0.02
      ;[...g.humanoidMeshes, ...g.physicalMeshes, ...g.otherMeshes].forEach(m => m.scale.setScalar(scaleS))
      g.humanoidLabels.forEach(s => {
        const b = s.userData.baseScale || { x: s.scale.x, y: s.scale.y }
        s.scale.set(b.x * labelScale, b.y * labelScale, 1)
      })
      g.physicalLabels.forEach(s => {
        const b = s.userData.baseScale || { x: s.scale.x, y: s.scale.y }
        s.scale.set(b.x * labelScale, b.y * labelScale, 1)
      })
      g.otherLabels.forEach(s => {
        const b = s.userData.baseScale || { x: s.scale.x, y: s.scale.y }
        s.scale.set(b.x * labelScale, b.y * labelScale, 1)
      })
      // Parallel category visibility
      g.humanoidMeshes.forEach(m => (m.visible = vis && !!model.bonesVisible))
      g.humanoidLabels.forEach(s => (s.visible = vis && !!model.bonesVisible && !!model.boneNameVisible))
      g.physicalMeshes.forEach(m => (m.visible = vis && showPhys))
      g.physicalLabels.forEach(s => (s.visible = vis && !!model.boneNameVisible && showPhys))
      g.otherMeshes.forEach(m => (m.visible = vis && showOther))
      g.otherLabels.forEach(s => (s.visible = vis && !!model.boneNameVisible && showOther))
    } catch {}
  }

  function applyBoneSettingsAll() {
    try { models.value.forEach(m => applyBoneSettingsToModel(m)) } catch {}
  }

  function saveModelState() {
    try {
      const data = models.value.map(m => ({
        name: m.name,
        visible: !!m.visible,
        bonesVisible: !!m.bonesVisible,
        boneNameVisible: !!m.boneNameVisible
      }))
      if (data.length) localStorage.setItem(LOCAL_MODELS_KEY, JSON.stringify(data))
      else localStorage.removeItem(LOCAL_MODELS_KEY)
    } catch (e) {
      console.warn('Failed to save model state', e)
    }
  }

  function loadModelState() {
    try {
      const raw = localStorage.getItem(LOCAL_MODELS_KEY)
      return raw ? JSON.parse(raw) : []
    } catch (e) {
      console.warn('Failed to load model state', e)
      return []
    }
  }

  function onFileChange(e) {
    const list = Array.from(e.target.files || [])
    e.target.value = ''
    handleFiles(list)
  }

  function toggleModelVisibility(index, visible) {
    const model = models.value[index]
    if (model) {
      model.visible = !!visible
      model.mesh.visible = !!visible
      try {
        applyBoneSettingsToModel(model)
      } catch {}
    }
    saveModelState()
  }

  function toggleBoneVisibility(index, visible) {
    const model = models.value[index]
    if (model) {
      model.bonesVisible = !!visible
      ensureBoneGizmos(model)
      try { model.skeletonHelper && (model.skeletonHelper.visible = false) } catch {}
      applyBoneSettingsToModel(model)
    }
    saveModelState()
  }

  function toggleBoneNameVisibility(index, visible) {
    const model = models.value[index]
    if (model) {
      model.boneNameVisible = !!visible
      ensureBoneGizmos(model)
      applyBoneSettingsToModel(model)
    }
    saveModelState()
  }

  function disposeModelResources(model) {
    if (!model) return
    const { mesh, vrm, skeletonHelper, boneGizmos } = model
    try {
      mesh.traverse(child => {
        if (!child.isMesh) return
        child.geometry?.dispose?.()
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        materials.forEach(m => {
          if (!m) return
          Object.values(m).forEach(v => v?.isTexture && v.dispose?.())
          m.dispose?.()
        })
      })
      scene.value.remove(mesh)
      mesh.removeFromParent?.()
      if (skeletonHelper) {
        try {
          scene.value.remove(skeletonHelper)
          skeletonHelper.removeFromParent?.()
          skeletonHelper.geometry?.dispose?.()
          skeletonHelper.material?.dispose?.()
        } catch {}
      }
      if (boneGizmos) {
        try {
          ;[...boneGizmos.humanoidMeshes, ...boneGizmos.physicalMeshes, ...boneGizmos.otherMeshes].forEach(x => x.parent?.remove(x))
          ;[...boneGizmos.humanoidLabels, ...boneGizmos.physicalLabels, ...boneGizmos.otherLabels].forEach(s => {
            try { s.material?.map?.dispose?.() } catch {}
            try { s.material?.dispose?.() } catch {}
            s.parent?.remove(s)
          })
          boneGizmos.geom?.dispose?.()
          boneGizmos.matHuman?.dispose?.()
          boneGizmos.matPhys?.dispose?.()
          boneGizmos.matOther?.dispose?.()
        } catch {}
      }
      try { vrm?.dispose?.() } catch {}
    } catch (e) {
      console.error('Failed to dispose model resources:', e)
    }
  }

  async function removeModel(index) {
    const model = models.value[index]
    if (!model) return
    const { mesh } = model
    renderer.value?.renderLists?.dispose?.()
    renderer.value?.info?.reset?.()
    try {
      disposeModelResources(model)
      models.value.splice(index, 1)
      if (currentMeshRef.value === mesh) {
        currentMeshRef.value = models.value[0]?.mesh || null
      }
      if (models.value.length === 0) {
        await cache.deleteCachedFiles()
      } else {
        await cache.deleteCachedFiles(index)
        await cache.cacheFiles(models.value.map(m => m.files || []))
      }
    } catch (e) {
      console.error('Failed to remove model:', e)
    } finally {
      saveModelState()
      requestAnimationFrame(() => renderer.value?.render?.(scene.value, camera.value))
    }
  }

  async function clearCache() {
    logToServer?.({ event: 'clear-cache' })
    renderer.value?.renderLists?.dispose?.()
    await cache.deleteCachedFiles()
    poses.value.forEach(p => URL.revokeObjectURL(p.url))
    poses.value = []
    selectedPose.value = null
    models.value.forEach(m => disposeModelResources(m))
    models.value = []
    nextModelId = 1
    currentMeshRef.value = null
    menuOpen.value = false
    saveModelState()
  }

  async function handleFiles(files) {
    try { logToServer?.({ event: 'handleFiles:start', count: files?.length || 0 }) } catch {}
    poses.value.forEach(p => URL.revokeObjectURL(p.url))
    poses.value = []
    selectedPose.value = null

    const modelEntries = []
    for (const file of files) {
      if (/\.vrm$/i.test(file.name)) {
        modelEntries.push({ file, url: URL.createObjectURL(file) })
      }
    }
    if (modelEntries.length === 0) {
      try { logToServer?.({ event: 'handleFiles:no-model-entries' }) } catch {}
      return
    }
    try { logToServer?.({ event: 'handleFiles:entries', count: modelEntries.length, names: modelEntries.map(e => e.file.name) }) } catch {}
    const names = Array.from(files).map(f => f.name)
    logToServer?.({ event: 'select', files: names })

    const manager = new THREE.LoadingManager()
    manager.onError = url => {
      console.error('Resource load failed:', url)
      logToServer?.({ event: 'resource-error', url })
    }

    loader.value = createLoader(manager)
    for (const { file: modelFile, url } of modelEntries) {
      await new Promise(resolve => {
        loader.value.load(
          url,
          gltf => {
            try {
              const vrm = gltf?.userData?.vrm
              if (!vrm) {
                console.error('VRM not found in GLTF', modelFile.name)
                return resolve()
              }
              vrm.scene.userData.vrm = vrm
              vrm.scene.name = modelFile.name.replace(/\.(vrm)$/i, '')
              scene.value.add(vrm.scene)
              // Minimal skeleton helper for bone visibility UI
              let skeletonHelper = null
              try {
                skeletonHelper = new THREE.SkeletonHelper(vrm.scene)
                skeletonHelper.visible = false
                scene.value.add(skeletonHelper)
              } catch {}
              models.value.push({
                id: nextModelId++,
                mesh: markRaw(vrm.scene),
                vrm: markRaw(vrm),
                gltf: markRaw(gltf),
                name: modelFile.name,
                visible: true,
                bonesVisible: false,
                boneNameVisible: false,
                skeletonHelper: skeletonHelper ? markRaw(skeletonHelper) : null,
                boneGizmos: null,
                files: [modelFile]
              })
              currentMeshRef.value = vrm.scene
              logToServer?.({ event: 'loaded', model: modelFile.name })

              // Auto frame camera to the newly loaded model
              try { frameObject(vrm.scene, vrm, gltf?.parser) } catch (e) { console.warn('frameObject failed', e) }
              try { applyBoneSettingsToModel(models.value[models.value.length - 1]) } catch {}
            } finally {
              resolve()
            }
          },
          undefined,
          error => {
            const status = error && error.target && error.target.status
            console.error('Load error:', status, error)
            logToServer?.({ event: 'error', message: error?.message, status })
            resolve()
          }
        )
      })
    }
    let cached = false
    try { logToServer?.({ event: 'handleFiles:cache-input', counts: models.value.map(m => (m.files ? m.files.length : 0)) }) } catch {}
    try {
      cached = await cache.cacheFiles(models.value.map(m => m.files))
    } catch (e) {
      console.error('Failed to cache model files', e)
    }
    if (!cached) {
      console.error('Failed to cache model files')
      alert('モデルのキャッシュに失敗しました')
    }
    try { logToServer?.({ event: 'handleFiles:cached', ok: !!cached, models: models.value.length }) } catch {}
    saveModelState()
  }

  async function restoreCachedModel(savedState = loadModelState()) {
    console.debug('restoreCachedModel: start')
    try { logToServer?.({ event: 'restore:start' }) } catch {}
    let saved
    try {
      saved = await cache.loadCachedFiles()
      console.debug('restoreCachedModel: load result', saved)
      try { logToServer?.({ event: 'restore:loaded', groups: saved.length }) } catch {}
    } catch (e) {
      console.warn('Failed to load cached files')
      console.debug(e)
      alert('モデルの復元に失敗しました')
      return false
    }
    if (!saved.length) {
      console.info('No cached model to restore')
      try { logToServer?.({ event: 'restore:empty' }) } catch {}
      alert('復元するモデルがありません')
      return false
    }
    const files = []
    for (const model of saved) {
      for (const f of model) {
        try {
          const part = f?.data && f.data.byteLength !== undefined ? new Uint8Array(f.data) : f?.data
          const file = new File([part], f.name, { type: f.type })
          if (f.path) {
            try { file.restoredPath = f.path } catch {}
          }
          files.push(file)
        } catch (err) {
          console.error('Failed to reconstruct file from cache', err)
          try { logToServer?.({ event: 'restore:reconstruct-error', name: f?.name, haveData: !!f?.data, dataType: Object.prototype.toString.call(f?.data), message: err?.message }) } catch {}
        }
      }
    }
    try {
      try { logToServer?.({ event: 'restore:reconstructed', count: files.length }) } catch {}
      await handleFiles(files)
      currentMeshRef.value = models.value[0]?.mesh || null
      savedState.forEach(s => {
        const index = models.value.findIndex(m => m.name === s.name)
        if (index !== -1) {
          toggleModelVisibility(index, s.visible)
          toggleBoneVisibility(index, s.bonesVisible)
          toggleBoneNameVisibility(index, s.boneNameVisible)
        }
      })
      saveModelState()
      console.info(`restoreCachedModel: restored ${models.value.length} model(s)`)
      try { logToServer?.({ event: 'restore:done', models: models.value.length }) } catch {}
      return true
    } catch (e) {
      console.error('Failed to restore cached model files', e)
      alert('モデルの復元中にエラーが発生しました')
      return false
    }
  }

  function onDragOver() {
    viewer.value.classList.add('dragover')
  }
  function onDragLeave() {
    viewer.value.classList.remove('dragover')
  }
  function onDrop(e) {
    viewer.value.classList.remove('dragover')
    const list = Array.from(e.dataTransfer?.files || [])
    handleFiles(list)
  }

  return {
    models,
    onFileChange,
    handleFiles,
    toggleModelVisibility,
    toggleBoneVisibility,
    toggleBoneNameVisibility,
    applyBoneSettingsAll,
    removeModel,
    clearCache,
    restoreCachedModel,
    onDragOver,
    onDragLeave,
    onDrop
  }
}
