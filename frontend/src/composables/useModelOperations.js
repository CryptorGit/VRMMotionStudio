import { ref, markRaw, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { createLoader } from '../utils/createLoader.js'
import { ensureShapeKeyOverrides, clearShapeKeyCache } from '../utils/shapekeys.js'

export function useModelOperations({
  scene,
  camera,
  renderer,
  helper,
  controls,
  showPhysicalBones,
  showOtherBones,
  showExtendedBones,
  showColliderNodes,
  showNonDeformingBones,
  highlightConstraint,
  boneDotSize,
  boneLabelScale,
  currentMeshRef,
  menuOpen,
  logToServer,
  viewer,
  loader,
  cache,
  poses,
  selectedPose,
  onCachePersisted
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

  function buildIndexToObjectMap(root, parser, extraRoot) {
    const map = new Map()
    if (!parser) return map
    const visited = new Set()
    // Track primary (root) separately from secondary (extraRoot)
    const uuidPrimary = new Map()
    const uuidAll = new Map()
    const nameToPrimary = new Map()
    const nameToAll = new Map()
    function traverse(o, primary) {
      if (!o || visited.has(o)) return
      visited.add(o)
      try {
        const idx = getObjectNodeIndex(o, parser)
        if (typeof idx === 'number' && !map.has(idx)) map.set(idx, o)
      } catch {}
      uuidAll.set(o.uuid, o)
      if (primary) uuidPrimary.set(o.uuid, o)
      if (o.name) {
        if (!nameToAll.has(o.name)) nameToAll.set(o.name, [])
        nameToAll.get(o.name).push(o)
        if (primary) {
          if (!nameToPrimary.has(o.name)) nameToPrimary.set(o.name, [])
          nameToPrimary.get(o.name).push(o)
        }
      }
      for (const c of o.children || []) traverse(c, primary)
    }
    if (root) traverse(root, true)
    if (extraRoot && extraRoot !== root) traverse(extraRoot, false)
    try {
      const nodes = parser?.json?.nodes
      if (Array.isArray(nodes)) {
        nodes.forEach((n, idx) => {
          if (map.has(idx)) return
          const u = n?.extras?.uuid
          if (u && uuidPrimary.has(u)) map.set(idx, uuidPrimary.get(u))
          else if (u && uuidAll.has(u)) map.set(idx, uuidAll.get(u))
          else if (typeof n?.name === 'string') {
            const prim = nameToPrimary.get(n.name) || []
            if (prim.length === 1) return map.set(idx, prim[0])
            const all = nameToAll.get(n.name) || []
            if (all.length === 1) return map.set(idx, all[0])
          }
        })
      }
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
    // Common container structures across variants
    const maybeGroups = [mgr.boneGroups, mgr._boneGroups, mgr.groups, mgr._groups]
    for (const gArr of maybeGroups) {
      if (!Array.isArray(gArr)) continue
      for (const g of gArr) {
        try {
          const roots = [g?.root, g?.rootBone]
          for (const r of roots) if (r) out.push({ node: r })
          const arr = g?.joints || g?.bones || g?.links
          if (Array.isArray(arr)) arr.forEach(j => out.push(j))
        } catch {}
      }
    }
    if (Array.isArray(mgr.springs)) {
      for (const s of mgr.springs) {
        const arr = s?.joints || s?.bones || s?.links
        if (Array.isArray(arr)) arr.forEach(j => out.push(j))
      }
    }
    if (out.length === 0) {
      const visited = new Set()
      function scan(obj, depth = 0) {
        if (!obj || typeof obj !== 'object' || visited.has(obj) || depth > 50) return
        visited.add(obj)
        if (obj.node || obj.bone || obj.target || obj.joint) out.push(obj)
        if (Array.isArray(obj)) {
          for (const v of obj) scan(v, depth + 1)
        } else {
          for (const k in obj) scan(obj[k], depth + 1)
        }
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

  function collectConstraintIndexSet(json) {
    const set = new Set()
    try {
      const nodes = json?.nodes || []
      for (let i = 0; i < nodes.length; i++) {
        const ex = nodes[i]?.extensions
        if (ex && (ex.VRMC_node_constraint || ex['VRMC_node_constraint'])) set.add(i)
      }
    } catch {}
    return set
  }

  function collectSkinJointIndexSet(json) {
    const set = new Set()
    try {
      const skins = json?.skins || []
      for (const s of skins) {
        const joints = s?.joints || []
        for (const j of joints) if (typeof j === 'number') set.add(j)
      }
    } catch {}
    return set
  }

  function collectPhysicalBoneIndexSet(model) {
    const indices = new Set()
    const parser = getParserFromModel(model)
    const json = parser?.json || null
    const vrm = model?.vrm
    const indexToObj = buildIndexToObjectMap(model?.gltf?.scene, parser, vrm?.scene)
    function addIndexMaybe(v) {
      if (typeof v === 'number' && v >= 0) { indices.add(v); return true }
      return false
    }
    function indexFromUnknownBoneRef(ref) {
      if (typeof ref === 'number') return ref
      if (!ref) return undefined
      // common property names
      const n = ref.node ?? ref.bone ?? ref.index ?? ref.id
      if (typeof n === 'number') return n
      // resolve by name if possible
      try {
        const name = (typeof ref === 'string') ? ref : (ref.name || ref.boneName || ref.nodeName)
        if (name && parser?.json?.nodes) {
          const idx = parser.json.nodes.findIndex(nd => nd?.name === name)
          if (idx >= 0) return idx
        }
      } catch {}
      return undefined
    }
    // VRM1.0: runtime joints
    const unresolved = []
    try {
      const joints = getRuntimeSpringJoints(vrm)
      if (Array.isArray(joints) && parser) {
        function pathOf(o) {
          const names = []
          let cur = o
          while (cur) {
            names.unshift(cur.name || cur.uuid)
            cur = cur.parent
          }
          return names.join('/')
        }
        function getIndexForObject(obj) {
          let idx = getObjectNodeIndex(obj, parser)
          if (typeof idx === 'number') return idx
          if (!obj) return undefined
          for (const [i, o] of indexToObj) {
            if (o === obj || o.uuid === obj.uuid) return i
          }
          if (obj.name) {
            const matches = []
            for (const [i, o] of indexToObj) if (o.name === obj.name) matches.push([i, o])
            if (matches.length === 1) return matches[0][0]
            if (matches.length > 1) {
              const p = pathOf(obj)
              const pm = matches.filter(([i, o]) => pathOf(o) === p)
              if (pm.length === 1) return pm[0][0]
            }
          }
          return undefined
        }
        for (const j of joints) {
          const obj = j?.node || j?.bone || j?.target || j?.joint
          const idx = getIndexForObject(obj)
          if (typeof idx === 'number') indices.add(idx)
          else unresolved.push(obj?.name || obj?.uuid || 'unknown')
        }
      }
    } catch {}
    // JSON: union with VRMC_springBone definitions
    if (json?.extensions?.VRMC_springBone) {
      try {
        const ext1 = json.extensions.VRMC_springBone
        for (const s of ext1.springs || []) {
          if (typeof s?.root === 'number') indices.add(s.root)
          for (const j of s?.joints || []) {
            const n = j?.node
            if (typeof n === 'number') indices.add(n)
          }
        }
        // Note: colliders are NOT physical bones; do not add ext1.colliders[].node here
      } catch {}
    }
    // VRM0.x: expand single chains from boneGroups[].bones[] roots
    // Note: Always union VRM0 definitions; do not gate on indices.size.
    // Some loaders expose runtime spring joints that don't map back to bone nodes,
    // which would otherwise block VRM0 JSON-based detection.
    // Handle key variations: boneGroups/bonegroups/bone_groups, or object map
    const sa = json?.extensions?.VRM?.secondaryAnimation
    const rawGroups = sa?.boneGroups || sa?.bonegroups || sa?.bone_groups || sa?.BoneGroups || sa?.BONEGROUPS || null
    if (rawGroups) {
      try {
        const bg = Array.isArray(rawGroups) ? rawGroups : (typeof rawGroups === 'object' ? Object.values(rawGroups) : [])
        try { logToServer?.({ event: 'vrm0-boneGroups', groups: Array.isArray(bg) ? bg.length : 0 }) } catch {}
        function walkChain(rootIndex) {
          const rootObj = indexToObj.get(rootIndex)
          if (!rootObj) {
            // Fallback: at least include the root index itself
            if (!indices.has(rootIndex) && rootIndex >= 0) indices.add(rootIndex)
            try { logToServer?.({ event: 'vrm0-root-unresolved', rootIndex }) } catch {}
            return
          }
          const stack = [rootObj]
          while (stack.length) {
            const obj = stack.pop()
            // Robust index resolution for gltf/vrm nodes
            let idx = getObjectNodeIndex(obj, parser)
            if (typeof idx !== 'number') {
              // try to find by identity in indexToObj
              for (const [i, o] of indexToObj) { if (o === obj || o?.uuid === obj?.uuid) { idx = i; break } }
            }
            if (typeof idx !== 'number' && obj?.name) {
              // last resort: name-only unique match in json.nodes
              try {
                const cand = parser?.json?.nodes?.map((nd, i) => [i, nd?.name]).filter(([i, nm]) => nm === obj.name) || []
                if (cand.length === 1) idx = cand[0][0]
              } catch {}
            }
            if (typeof idx === 'number' && !indices.has(idx)) indices.add(idx)
            // Follow bone children only (single chains; branches handled as parallel chains)
            for (const c of obj.children || []) {
              if (c && c.isBone) stack.push(c)
            }
          }
        }
        for (const g of bg) {
          const center = g?.center
          if (typeof center === 'number' && center >= 0) indices.add(center)
          const arr = g?.bones || []
          for (const b of arr) {
            const r = indexFromUnknownBoneRef(b)
            if (typeof r === 'number' && r >= 0) walkChain(r)
          }
          // Some VRM0 files use explicit bone list without parent expansion; include them directly
          const explicit = g?.explicitBones || g?.boneIndices
          if (Array.isArray(explicit)) {
            for (const e of explicit) addIndexMaybe(indexFromUnknownBoneRef(e))
          }
        }
      } catch {}
    }
    if (unresolved.length) {
      
      try { logToServer?.({ event: 'spring-joints-unresolved', unresolved }) } catch {}
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
          const indexToObj = buildIndexToObjectMap(model?.gltf?.scene, parser, vrm.scene)
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

          try { logToServer?.({ event: 'bone-debug', payload }) } catch {}
        } catch {}
      }
      return model.boneGizmos
    }
  const vrm = model.vrm
    const parser = getParserFromModel(model)
    const indexToObj = buildIndexToObjectMap(model?.gltf?.scene, parser, vrm.scene)

    // Build JSON parent map to reconstruct name paths for fallback mapping
    const jsonNodes = parser?.json?.nodes || []
    const parentOf = (() => {
      try {
        const p = new Array(jsonNodes.length).fill(-1)
        jsonNodes.forEach((n, i) => {
          const ch = n?.children || []
          ch.forEach(ci => { if (typeof ci === 'number' && p[ci] === -1) p[ci] = i })
        })
        return p
      } catch { return [] }
    })()
    function jsonNamePath(idx) {
      const path = []
      let cur = idx
      let guard = 0
      while (typeof cur === 'number' && cur >= 0 && guard++ < 256) {
        const name = jsonNodes[cur]?.name || `#${cur}`
        path.unshift(name)
        cur = parentOf[cur]
      }
      return path
    }
    // Helper: map objects coming from gltf.scene to their counterparts under vrm.scene
    function isDescendantOf(node, root) {
      let cur = node
      while (cur) { if (cur === root) return true; cur = cur.parent }
      return false
    }
    function namePath(node) {
      const parts = []
      let cur = node
      while (cur) { parts.unshift(cur.name || '') ; cur = cur.parent }
      return parts
    }
    function findInTreeByName(root, name) {
      const matches = []
      try { root.traverse(o => { if (o && o.name === name) matches.push(o) }) } catch {}
      return matches
    }
    function bestPathMatch(target, candidates, root) {
      if (!candidates || candidates.length === 0) return null
      if (candidates.length === 1) return candidates[0]
      try {
        const t = namePath(target)
        let best = null
        let bestScore = -1
        for (const c of candidates) {
          const p = namePath(c)
          // Compare from leaf upward (suffix match)
          const n = Math.min(t.length, p.length)
          let score = 0
          for (let i = 1; i <= n; i++) {
            if (t[t.length - i] === p[p.length - i]) score++
            else break
          }
          // Prefer deeper matches
          if (score > bestScore) { best = c; bestScore = score }
        }
        return best || candidates[0]
      } catch { return candidates[0] }
    }
    function bestMatchByJsonPath(candidates, targetPath) {
      if (!candidates || candidates.length === 0) return null
      if (candidates.length === 1) return candidates[0]
      try {
        let best = null
        let bestScore = -1
        for (const c of candidates) {
          const p = namePath(c)
          const n = Math.min(targetPath.length, p.length)
          let score = 0
          for (let i = 1; i <= n; i++) {
            if (targetPath[targetPath.length - i] === p[p.length - i]) score++
            else break
          }
          if (score > bestScore) { best = c; bestScore = score }
        }
        return best || candidates[0]
      } catch { return candidates[0] }
    }
    function resolveIndexToVrmObject(idx) {
      let o = indexToObj.get(idx)
      if (o) return remapToVrmScene(o)
      try {
        const name = jsonNodes[idx]?.name
        if (!name) return null
        const cands = findInTreeByName(vrm.scene, name)
        if (cands.length === 0) return null
        const targetPath = jsonNamePath(idx)
        const chosen = bestMatchByJsonPath(cands, targetPath)
        if (chosen) {
          try { indexToObj.set(idx, chosen) } catch {}
          return chosen
        }
      } catch {}
      return null
    }
    function remapToVrmScene(obj) {
      if (!obj) return obj
      if (isDescendantOf(obj, vrm.scene)) return obj
      const name = obj.name || ''
      if (!name) return obj
      const matches = findInTreeByName(vrm.scene, name)
      return bestPathMatch(obj, matches, vrm.scene) || obj
    }
    // Heuristics: detect extended bones by name patterns
    function isExtendedName(name) {
      if (!name) return false
      const n = String(name)
      const patterns = [
        /(Twist|Roll)\d*$/i,
        /(Thumb|Index|Middle|Ring|Pinky)(?:[4-9]|\d{2,})$/i,
        /(Skirt|Hair|Ribbon|Braid|Cloth|Tail|Fringe|Bang|Cape)/i,
        /(IK|Pole|Target|Hint|Effector|Ctrl|Control)$/i,
        /(Attach|Prop|Weapon|Backpack|Sheath|Accessory|Bag|Belt)/i,
        /(Helper|NonDeform|NonDeformBone|Guide)/i
      ]
      return patterns.some(rx => rx.test(n))
    }
    function detectExtendedBones(humanoidSet, physicalSet, colliderSet) {
      const out = new Set()
      const allBones = enumerateAllBones(vrm.scene)
      for (const b of allBones) {
        if (humanoidSet.has(b)) continue
        if (physicalSet.has(b)) continue
        if (colliderSet.has(b)) continue
        if (isExtendedName(b.name)) out.add(b)
      }
      return out
    }
    const physicalIndexSet = collectPhysicalBoneIndexSet(model)
    try {
      const dbg = {
        event: 'phys-index-snapshot',
        model: model.name,
        counts: { physicalIndexCount: physicalIndexSet.size },
      }
      logToServer?.(dbg)
    } catch {}
    const humanoidIndexSet = collectHumanoidIndexSet(model)
    const colliderIndexSet = parser?.json ? collectColliderIndexSet(parser.json) : new Set()
    const constraintIndexSet = parser?.json ? collectConstraintIndexSet(parser.json) : new Set()

    // Build object sets from indices
    const humanoidObjSet = new Set()
    const physicalObjSet = new Set()
    const colliderObjSet = new Set()
    const constraintObjSet = new Set()
    for (const idx of humanoidIndexSet) {
      const v = resolveIndexToVrmObject(idx)
      if (v) humanoidObjSet.add(v)
    }
    for (const idx of physicalIndexSet) {
      const v = resolveIndexToVrmObject(idx)
      if (v) physicalObjSet.add(v)
    }
    for (const idx of colliderIndexSet) {
      const v = resolveIndexToVrmObject(idx)
      if (v) colliderObjSet.add(v)
    }
    for (const idx of constraintIndexSet) {
      const v = resolveIndexToVrmObject(idx)
      if (v) constraintObjSet.add(v)
    }


  // Colliders are separate; don't treat collider attachments as physical
  for (const o of colliderObjSet) physicalObjSet.delete(o)
  // Priority: Humanoid/Physical over Collider category (display)
  for (const o of humanoidObjSet) colliderObjSet.delete(o)
  for (const o of physicalObjSet) colliderObjSet.delete(o)
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

        try { logToServer?.({ event: 'bone-debug', payload }) } catch {}
        try {
          function computeIndex(o) {
            let idx = getObjectNodeIndex(o, parser)
            if (typeof idx === 'number') return idx
            try {
              for (const [i, obj] of indexToObj) if (obj === o || obj?.uuid === o?.uuid) return i
            } catch {}
            try {
              const name = o?.name
              if (!name) return null
              const candidates = []
              for (let i = 0; i < (parser?.json?.nodes?.length || 0); i++) {
                if (parser.json.nodes[i]?.name === name) candidates.push(i)
              }
              if (candidates.length === 1) return candidates[0]
              if (candidates.length > 1) {
                const pObj = namePath(o)
                let best = candidates[0]
                let bestScore = -1
                for (const ci of candidates) {
                  const pIdx = jsonNamePath(ci)
                  const n = Math.min(pObj.length, pIdx.length)
                  let score = 0
                  for (let k = 1; k <= n; k++) {
                    if (pObj[pObj.length - k] === pIdx[pIdx.length - k]) score++
                    else break
                  }
                  if (score > bestScore) { best = ci; bestScore = score }
                }
                return best
              }
            } catch {}
            return null
          }
          const listPayload = {
            event: 'bone-debug-list',
            model: model.name,
            physical: Array.from(physicalObjSet).map(o => ({ name: o?.name || '(no-name)', idx: computeIndex(o) })).slice(0, 200),
            humanoid: Array.from(humanoidObjSet).map(o => ({ name: o?.name || '(no-name)', idx: computeIndex(o) })).slice(0, 200),
            unmappedPhysicalIndices
          }
          logToServer?.(listPayload)
        } catch {}
      }
    } catch {}

    // Prepare arrays for gizmo creation
    const humanoidBones = Array.from(humanoidObjSet)
    const physicalBones = Array.from(physicalObjSet)
    // Extended bones via heuristics, after removing humanoid/physical/collider
    const extendedObjSet = detectExtendedBones(humanoidObjSet, physicalObjSet, colliderObjSet)
    const extendedBones = Array.from(extendedObjSet)
    // Non-deforming: JSON-first via skins[joints] plus runtime weight analysis
    const skinJointIdxSet = parser?.json ? collectSkinJointIndexSet(parser.json) : new Set()
    // Compute max skin weight per glTF node index
    const weightMaxByNode = new Map()
    const NONDEF_EPS = 0.02
    try {
      vrm.scene.traverse(obj => {
        if (!obj || !obj.isSkinnedMesh) return
        const skel = obj.skeleton
        const geom = obj.geometry
        if (!skel || !geom) return
        const si = geom.attributes?.skinIndex
        const sw = geom.attributes?.skinWeight
        if (!si || !sw) return
        const aI = si.array
        const aW = sw.array
        const strideI = si.itemSize || 4
        const strideW = sw.itemSize || 4
        const count = Math.min(si.count || (aI.length / strideI), sw.count || (aW.length / strideW))
        for (let v = 0; v < count; v++) {
          const baseI = v * strideI
          const baseW = v * strideW
          for (let k = 0; k < 4; k++) {
            const boneIdx = aI[baseI + k] | 0
            const w = aW[baseW + k] || 0
            if (w <= 1e-6) continue
            const boneObj = skel.bones[boneIdx]
            if (!boneObj) continue
            const nodeIdx = getObjectNodeIndex(boneObj, parser)
            if (typeof nodeIdx !== 'number') continue
            const prev = weightMaxByNode.get(nodeIdx) || 0
            if (w > prev) weightMaxByNode.set(nodeIdx, w)
          }
        }
      })
    } catch {}
    const nonDeformingBones = []
    for (const b of enumerateAllBones(vrm.scene)) {
      if (humanoidObjSet.has(b)) continue
      if (physicalObjSet.has(b)) continue
      if (extendedObjSet.has(b)) continue
      // colliderObjSet may include non-bones; skip bone categorization impact
      const idx = getObjectNodeIndex(b, parser)
      const inSkin = typeof idx === 'number' && skinJointIdxSet.has(idx)
      const maxW = (typeof idx === 'number') ? (weightMaxByNode.get(idx) || 0) : 0
      if (!inSkin || maxW < NONDEF_EPS) nonDeformingBones.push(b)
    }
    // Other bones: everything not recognized as above
    const otherBones = []
    for (const b of enumerateAllBones(vrm.scene)) {
      if (humanoidObjSet.has(b)) continue
      if (physicalObjSet.has(b)) continue
      if (extendedObjSet.has(b)) continue
      if (nonDeformingBones.includes(b)) continue
      otherBones.push(b)
    }
    // Collider nodes: object set may include non-bones; list directly
    const colliderNodes = Array.from(colliderObjSet)

    const geom = new THREE.SphereGeometry(0.02, 8, 8)
    const matHuman = new THREE.MeshBasicMaterial({ color: 0x00aaff, depthTest: false, depthWrite: false })
    const matPhys = new THREE.MeshBasicMaterial({ color: 0xff8800, depthTest: false, depthWrite: false })
    const matExt = new THREE.MeshBasicMaterial({ color: 0x22cc88, depthTest: false, depthWrite: false })
    const matCollider = new THREE.MeshBasicMaterial({ color: 0xaa44ff, depthTest: false, depthWrite: false })
    const matNonDef = new THREE.MeshBasicMaterial({ color: 0xffcc00, depthTest: false, depthWrite: false })
    const matOther = new THREE.MeshBasicMaterial({ color: 0x888888, depthTest: false, depthWrite: false })
    const humanoidMeshes = []
    const humanoidLabels = []
    const physicalMeshes = []
    const physicalLabels = []
    const extendedMeshes = []
    const extendedLabels = []
    const colliderMeshes = []
    const colliderLabels = []
    const nonDefMeshes = []
    const nonDefLabels = []
    const otherMeshes = []
    const otherLabels = []
    const constraintBadges = []
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
      // Constraint badge attachment (tag)
      if (constraintObjSet.has(node)) {
        const badge = createTextSprite('C')
        badge.position.set(0.05, 0.08, 0)
        badge.scale.multiplyScalar(0.6)
        badge.userData.__constraintBadge = true
        node.add(badge)
        constraintBadges.push(badge)
      }
    }
    humanoidBones.forEach(node => pushNode(node, matHuman, humanoidMeshes, humanoidLabels))
    physicalBones.forEach(node => pushNode(node, matPhys, physicalMeshes, physicalLabels))
    extendedBones.forEach(node => pushNode(node, matExt, extendedMeshes, extendedLabels))
    nonDeformingBones.forEach(node => pushNode(node, matNonDef, nonDefMeshes, nonDefLabels))
    otherBones.forEach(node => pushNode(node, matOther, otherMeshes, otherLabels))
    // Collider nodes (may be non-bone)
    const pushAnyNode = (node) => {
      if (!node || added.has(node)) return
      added.add(node)
      const dot = new THREE.Mesh(geom, matCollider)
      dot.name = `collider-dot:${node.name || ''}`
      dot.renderOrder = 998
      dot.userData.__helper = true
      node.add(dot)
      colliderMeshes.push(dot)
      const label = createTextSprite(node.name || 'collider')
      label.position.set(0, 0.05, 0)
      node.add(label)
      colliderLabels.push(label)
      if (constraintObjSet.has(node)) {
        const badge = createTextSprite('C')
        badge.position.set(0.05, 0.08, 0)
        badge.scale.multiplyScalar(0.6)
        badge.userData.__constraintBadge = true
        node.add(badge)
        constraintBadges.push(badge)
      }
    }
    colliderNodes.forEach(node => pushAnyNode(node))
    model.boneGizmos = {
      humanoidMeshes,
      humanoidLabels,
      physicalMeshes,
      physicalLabels,
      extendedMeshes,
      extendedLabels,
      colliderMeshes,
      colliderLabels,
      nonDefMeshes,
      nonDefLabels,
      otherMeshes,
      otherLabels,
      geom,
      matHuman,
      matPhys,
      matExt,
      matCollider,
      matNonDef,
  matOther,
  constraintBadges
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
    const showExt = !!(showExtendedBones?.value)
    const showCol = !!(showColliderNodes?.value)
    const showNonDef = !!(showNonDeformingBones?.value)
    const showCtag = !!(highlightConstraint?.value)
    try {
      const scaleS = size / 0.02
      ;[
        ...g.humanoidMeshes,
        ...g.physicalMeshes,
        ...g.extendedMeshes || [],
        ...g.colliderMeshes || [],
        ...g.nonDefMeshes || [],
        ...g.otherMeshes
      ].forEach(m => m.scale.setScalar(scaleS))
      g.humanoidLabels.forEach(s => {
        const b = s.userData.baseScale || { x: s.scale.x, y: s.scale.y }
        s.scale.set(b.x * labelScale, b.y * labelScale, 1)
      })
      g.physicalLabels.forEach(s => {
        const b = s.userData.baseScale || { x: s.scale.x, y: s.scale.y }
        s.scale.set(b.x * labelScale, b.y * labelScale, 1)
      })
      ;(g.extendedLabels || []).forEach(s => {
        const b = s.userData.baseScale || { x: s.scale.x, y: s.scale.y }
        s.scale.set(b.x * labelScale, b.y * labelScale, 1)
      })
      ;(g.colliderLabels || []).forEach(s => {
        const b = s.userData.baseScale || { x: s.scale.x, y: s.scale.y }
        s.scale.set(b.x * labelScale, b.y * labelScale, 1)
      })
      ;(g.nonDefLabels || []).forEach(s => {
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
      ;(g.extendedMeshes || []).forEach(m => (m.visible = vis && showExt))
      ;(g.extendedLabels || []).forEach(s => (s.visible = vis && !!model.boneNameVisible && showExt))
      ;(g.colliderMeshes || []).forEach(m => (m.visible = vis && showCol))
      ;(g.colliderLabels || []).forEach(s => (s.visible = vis && !!model.boneNameVisible && showCol))
      ;(g.nonDefMeshes || []).forEach(m => (m.visible = vis && showNonDef))
      ;(g.nonDefLabels || []).forEach(s => (s.visible = vis && !!model.boneNameVisible && showNonDef))
      g.otherMeshes.forEach(m => (m.visible = vis && showOther))
      g.otherLabels.forEach(s => (s.visible = vis && !!model.boneNameVisible && showOther))
      // Constraint badges visibility
      const badges = g.constraintBadges || []
      badges.forEach(s => (s.visible = vis && showCtag))
      try {
        const counts = {
          humanoidDots: g.humanoidMeshes.filter(x => x.visible).length,
          physicalDots: g.physicalMeshes.filter(x => x.visible).length,
          extendedDots: (g.extendedMeshes || []).filter(x => x.visible).length,
          colliderDots: (g.colliderMeshes || []).filter(x => x.visible).length,
          nonDefDots: (g.nonDefMeshes || []).filter(x => x.visible).length,
          otherDots: g.otherMeshes.filter(x => x.visible).length
        }
        logToServer?.({ event: 'bone-visibility-update', model: model.name, counts, toggles: { vis, showPhys, showOther, showExt, showCol, showNonDef, showCtag, bonesVisible: !!model.bonesVisible, boneNameVisible: !!model.boneNameVisible } })
      } catch {}
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

    }
  }

  function loadModelState() {
    try {
      const raw = localStorage.getItem(LOCAL_MODELS_KEY)
      return raw ? JSON.parse(raw) : []
    } catch (e) {

      return []
    }
  }

  function reportCacheResult(ok, reason, error) {
    if (!onCachePersisted) return
    try {
      onCachePersisted({ ok, reason, error: error || null })
    } catch (notifyError) {

    }
  }

  async function persistModels(reason, targetModels = models.value) {
    if (!cache?.cacheFiles) {
      reportCacheResult(false, reason, new Error('cacheFiles unavailable'))
      return false
    }
    const snapshot = (targetModels || [])
      .map(model => model?.files || [])
      .filter(list => Array.isArray(list) && list.length)
    if (!snapshot.length) {
      reportCacheResult(true, reason, null)
      return true
    }
    let ok = false
    let error = null
    try {
      ok = await cache.cacheFiles(snapshot)
      if (!ok) error = new Error('cacheFiles returned false')
    } catch (e) {
      error = e
    }
    const summary = {
      event: ok ? 'cache:persist' : 'cache:persist:error',
      reason,
      groups: snapshot.length,
      counts: snapshot.map(list => list.length),
      message: error ? String(error?.message || error) : undefined
    }
    try { logToServer?.(summary) } catch {}
    reportCacheResult(ok, reason, error)
    if (!ok && error) console.warn('Failed to persist model cache:', reason, error)
    return ok
  }

  function fireAndForgetPersist(reason, targetModels = models.value) {
    if (!cache?.cacheFiles) return
    const snapshot = (targetModels || [])
      .map(model => model?.files || [])
      .filter(list => Array.isArray(list) && list.length)
    if (!snapshot.length) return
    try {
      const promise = cache.cacheFiles(snapshot)
      if (promise && typeof promise.then === 'function') {
        promise
          .then(ok => {
            if (!ok) throw new Error('cacheFiles returned false')
            reportCacheResult(true, reason, null)
            logToServer?.({ event: 'cache:persist', reason, groups: snapshot.length, counts: snapshot.map(list => list.length) })
          })
          .catch(error => {
            reportCacheResult(false, reason, error)
            logToServer?.({ event: 'cache:persist:error', reason, groups: snapshot.length, counts: snapshot.map(list => list.length), message: String(error?.message || error) })
          })
      }
    } catch (error) {
      reportCacheResult(false, reason, error)
      try {
        logToServer?.({ event: 'cache:persist:error', reason, message: String(error?.message || error) })
      } catch {}

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
          ;[
            ...boneGizmos.humanoidMeshes,
            ...boneGizmos.physicalMeshes,
            ...boneGizmos.extendedMeshes || [],
            ...boneGizmos.colliderMeshes || [],
            ...boneGizmos.nonDefMeshes || [],
            ...boneGizmos.otherMeshes
          ].forEach(x => x.parent?.remove(x))
          ;[
            ...boneGizmos.humanoidLabels,
            ...boneGizmos.physicalLabels,
            ...boneGizmos.extendedLabels || [],
            ...boneGizmos.colliderLabels || [],
            ...boneGizmos.nonDefLabels || [],
            ...boneGizmos.otherLabels,
            ...boneGizmos.constraintBadges || []
          ].forEach(s => {
            try { s.material?.map?.dispose?.() } catch {}
            try { s.material?.dispose?.() } catch {}
            s.parent?.remove(s)
          })
          boneGizmos.geom?.dispose?.()
          boneGizmos.matHuman?.dispose?.()
          boneGizmos.matPhys?.dispose?.()
          boneGizmos.matExt?.dispose?.()
          boneGizmos.matCollider?.dispose?.()
          boneGizmos.matNonDef?.dispose?.()
          boneGizmos.matOther?.dispose?.()
        } catch {}
      }
      try { vrm?.dispose?.() } catch {}
    } catch (e) {

    }
  }

  async function removeModel(index) {
    const model = models.value[index]
    if (!model) return
    const { mesh } = model
    renderer.value?.renderLists?.dispose?.()
    renderer.value?.info?.reset?.()
    let persistenceHandled = false
    try {
      disposeModelResources(model)
      models.value.splice(index, 1)
      if (currentMeshRef.value === mesh) {
        currentMeshRef.value = models.value[0]?.mesh || null
      }
      if (models.value.length === 0) {
        await cache.deleteCachedFiles()
        reportCacheResult(true, 'remove', null)
        persistenceHandled = true
      } else {
        await cache.deleteCachedFiles(index)
        await persistModels('remove')
        persistenceHandled = true
      }
    } catch (e) {

      if (!persistenceHandled) reportCacheResult(false, 'remove', e)
    } finally {
      saveModelState()
      requestAnimationFrame(() => renderer.value?.render?.(scene.value, camera.value))
    }
  }

  async function clearCache() {
    logToServer?.({ event: 'clear-cache' })
    renderer.value?.renderLists?.dispose?.()
    try {
      await cache.deleteCachedFiles()
      reportCacheResult(true, 'clear', null)
    } catch (error) {

      reportCacheResult(false, 'clear', error)
    }
    // Also clear persisted UI/cache states so "繧ｭ繝｣繝・す繝･蜑企勁" manages them too
    try {
      // Imported models visibility/state snapshot
      localStorage.removeItem('importedModels')
      // Settings sidebar (includes virtual tracker toggles & sizes)
      localStorage.removeItem('settingsSidebar')
      // Virtual tracker saved positions per model
      localStorage.removeItem('vtPositions:v1')
    } catch {}
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

                return resolve()
              }
              vrm.scene.userData.vrm = vrm
              try {
                ensureShapeKeyOverrides(vrm.scene)
                clearShapeKeyCache(vrm.scene)
              } catch {}
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

            logToServer?.({ event: 'error', message: error?.message, status })
            resolve()
          }
        )
      })
    }
    try { logToServer?.({ event: 'handleFiles:cache-input', counts: models.value.map(m => (m.files ? m.files.length : 0)) }) } catch {}
    const cached = await persistModels('load')
    if (!cached) {

      alert('繝｢繝・Ν縺ｮ繧ｭ繝｣繝・す繝･縺ｫ螟ｱ謨励＠縺ｾ縺励◆')
    }
    try { logToServer?.({ event: 'handleFiles:cached', ok: !!cached, models: models.value.length }) } catch {}
    saveModelState()
  }

  async function restoreCachedModel(savedState = loadModelState()) {

    try { logToServer?.({ event: 'restore:start' }) } catch {}
    let saved
    try {
      saved = await cache.loadCachedFiles()

      try { logToServer?.({ event: 'restore:loaded', groups: saved.length }) } catch {}
    } catch (e) {


      alert('繝｢繝・Ν縺ｮ蠕ｩ蜈・↓螟ｱ謨励＠縺ｾ縺励◆')
      return false
    }
    if (!saved.length) {

      try { logToServer?.({ event: 'restore:empty' }) } catch {}
      alert('蠕ｩ蜈・☆繧九Δ繝・Ν縺後≠繧翫∪縺帙ｓ')
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
      try { logToServer?.({ event: 'restore:done', models: models.value.length }) } catch {}
      return true
    } catch (e) {

      alert('繝｢繝・Ν縺ｮ蠕ｩ蜈・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆')
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

  function handleVisibilityChange() {
    if (typeof document === 'undefined') return
    if (document.visibilityState !== 'hidden') return
    Promise.resolve(persistModels('visibilitychange')).catch(error => {

    })
  }

  function handlePageHide() {
    Promise.resolve(persistModels('pagehide')).catch(error => {

    })
  }

  function handleBeforeUnload() {
    try {
      fireAndForgetPersist('beforeunload')
    } catch (error) {

    }
  }

  onMounted(() => {
    if (typeof window === 'undefined') return
    window.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('beforeunload', handleBeforeUnload)
  })

  onUnmounted(() => {
    if (typeof window === 'undefined') return
    window.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('pagehide', handlePageHide)
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })

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


