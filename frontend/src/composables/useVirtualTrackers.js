import { ref, watch, markRaw } from 'vue'
import * as THREE from 'three'

// VRChat-like 11 trackers
// head, chest, hips, L/R hand, L/R elbow, L/R foot, L/R knee
const TRACKER_DEFS = [
  { key: 'head', label: 'Head', color: 0x3aa6ff },
  { key: 'chest', label: 'Chest', color: 0x00c853 },
  { key: 'hips', label: 'Hips', color: 0xff7043 },
  { key: 'leftHand', label: 'L Hand', color: 0x2979ff },
  { key: 'rightHand', label: 'R Hand', color: 0xff1744 },
  { key: 'leftElbow', label: 'L Elbow', color: 0x1565c0 },
  { key: 'rightElbow', label: 'R Elbow', color: 0xd50000 },
  { key: 'leftFoot', label: 'L Foot', color: 0x009688 },
  { key: 'rightFoot', label: 'R Foot', color: 0x8d6e63 },
  { key: 'leftKnee', label: 'L Knee', color: 0x26a69a },
  { key: 'rightKnee', label: 'R Knee', color: 0x6d4c41 }
]

export function useVirtualTrackers({ scene, camera, renderer, controls, models, logToServer, trackerDotSize, trackerLabelScale, showTrackerLabels }) {
  const enabled = ref(false)
  const trackers = ref([]) // { key, mesh, label, visible }
  const group = ref(null)
  const raycaster = new THREE.Raycaster()
  const mouseNdc = new THREE.Vector2()
  const dragState = {
    active: false,
    target: null,
    plane: new THREE.Plane(),
    planeOffset: new THREE.Vector3()
  }

  // IK caches
  const boneCache = new WeakMap() // model -> bone map

  // Saved positions per model (VRM root local-space), persisted in localStorage
  const STORAGE_KEY = 'vtPositions:v1'

  function modelKey(model) {
    return model?.name || model?.vrm?.scene?.name || 'model'
  }

  function loadAllSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch { return {} }
  }

  function saveAllSaved(obj) {
    try {
      if (obj && Object.keys(obj).length) localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }

  function getSavedPositions(model) {
    const all = loadAllSaved()
    return all[modelKey(model)] || null
  }

  function setSavedPositions(model, dataOrNull) {
    const all = loadAllSaved()
    const k = modelKey(model)
    if (!dataOrNull) delete all[k]
    else all[k] = dataOrNull
    saveAllSaved(all)
  }

  function pruneSavedForMissingModels() {
    try {
      const all = loadAllSaved()
      const present = new Set((models?.value || []).map(m => modelKey(m)))
      let changed = false
      for (const k of Object.keys(all)) {
        if (!present.has(k)) { delete all[k]; changed = true }
      }
      if (changed) saveAllSaved(all)
    } catch {}
  }

  function getActiveModel() {
    const arr = models?.value || []
    return arr.find(m => !!m.visible && m.vrm) || arr[0]
  }

  function currentDotSize() {
    const v = Number(trackerDotSize?.value ?? 0.08)
    return Math.max(0.01, Math.min(0.5, v))
  }
  function currentLabelScale() {
    const v = Number(trackerLabelScale?.value ?? 1.0)
  return Math.max(0.05, Math.min(5.0, v))
  }
  function labelsVisible() {
    return !!(showTrackerLabels?.value ?? true)
  }

  function createGizmos() {
    if (group.value) return
  group.value = markRaw(new THREE.Group())
    group.value.name = 'VirtualTrackers'
  scene.value.add(group.value)
  const sphere = markRaw(new THREE.SphereGeometry(currentDotSize(), 16, 16))
    for (const def of TRACKER_DEFS) {
      const mat = markRaw(new THREE.MeshBasicMaterial({ color: def.color }))
      // Always draw on top of the model
      mat.depthTest = false
      mat.depthWrite = false
      // Don't reuse geometry across meshes because we rebuild on size change and dispose safely
      const mesh = markRaw(new THREE.Mesh(markRaw(sphere.clone()), mat))
      mesh.renderOrder = 998 // labels use 999
      mesh.name = `vt:${def.key}`
      mesh.userData.__vt = true
      // start hidden
      mesh.visible = false
  const sprite = markRaw(createLabelSprite(def.label))
      sprite.position.set(0, 0.15, 0)
  sprite.visible = labelsVisible()
  // capture base size to allow absolute scaling later
  sprite.userData.baseScale = sprite.scale.clone()
  sprite.scale.copy(sprite.userData.baseScale.clone().multiplyScalar(currentLabelScale()))
      mesh.add(sprite)
      group.value.add(mesh)
    trackers.value.push({ key: def.key, mesh, label: sprite })
    }
  }

  function disposeGizmos() {
    if (!group.value) return
    try {
      for (const t of trackers.value) {
        try { t.label.material.map.dispose() } catch {}
        try { t.label.material.dispose() } catch {}
        try { t.mesh.geometry.dispose() } catch {}
        try { t.mesh.material.dispose() } catch {}
      }
    } catch {}
    group.value.parent && group.value.parent.remove(group.value)
    group.value = null
    trackers.value = []
  }

  function setEnabled(v) {
    enabled.value = !!v
    const modelPresent = !!getActiveModel()?.vrm
    if (enabled.value && modelPresent) {
      createGizmos()
      layoutDefaultPositions()
    }
    setVisibility(enabled.value && modelPresent)
  }

  function setVisibility(vis) {
    const show = !!vis && !!getActiveModel()?.vrm
    for (const t of trackers.value) {
      t.mesh.visible = show
      if (t.label) t.label.visible = show && labelsVisible()
    }
  }

  function reset() {
    try {
      const model = getActiveModel()
      if (model) setSavedPositions(model, null)
    } catch {}
    layoutDefaultPositions(true)
  }

  // Cache of initial humanoid bone world positions per model to use as baseline placement
  const initialWorldPose = new WeakMap() // model -> Map(key -> Vector3)
  // first-time layout should always use bone defaults instead of saved positions
  let didInitialLayout = false

  // Map tracker key to corresponding humanoid bone name used for initial placement
  const trackerToBones = {
    head: ['head', 'neck'],
    chest: ['chest', 'upperChest', 'spine'],
    hips: ['hips'],
    leftHand: ['leftHand'],
    rightHand: ['rightHand'],
    leftElbow: ['leftLowerArm', 'leftUpperArm'],
    rightElbow: ['rightLowerArm', 'rightUpperArm'],
    leftFoot: ['leftFoot', 'leftLowerLeg'],
    rightFoot: ['rightFoot', 'rightLowerLeg'],
    leftKnee: ['leftLowerLeg', 'leftUpperLeg'],
    rightKnee: ['rightLowerLeg', 'rightUpperLeg']
  }

  function captureInitialWorldPose(model) {
    if (!model?.vrm) return
    if (initialWorldPose.has(model)) return
    const vrm = model.vrm
    const map = new Map()
    for (const t of TRACKER_DEFS) {
      const names = trackerToBones[t.key] || []
      let b = null
      for (const n of names) { b = getBone(vrm, n); if (b) break }
      if (!b) continue
      try { b.updateWorldMatrix(true, false) } catch {}
      const p = b.getWorldPosition(new THREE.Vector3())
      map.set(t.key, p.clone())
    }
    initialWorldPose.set(model, map)
  }

  function layoutDefaultPositions(force = false) {
    if (!group.value) return
    const model = getActiveModel()
    if (!model || !model.vrm) return
    const vrm = model?.vrm
    const root = vrm?.scene || scene.value
    const basis = new THREE.Matrix4()
    root.updateWorldMatrix(true, false)
    basis.copy(root.matrixWorld)
    // Capture once per model so initial virtual trackers follow the imported pose, not current deformed state
    captureInitialWorldPose(model)
  // Prefer saved positions if available, but skip them on the very first layout
  const saved = (!didInitialLayout && !force) ? null : (vrm ? getSavedPositions(model) : null)
    const hips = getBone(vrm, 'hips')
    const head = getBone(vrm, 'head') || getBone(vrm, 'neck')
    const chest = getBone(vrm, 'chest') || getBone(vrm, 'spine')
    const lHand = getBone(vrm, 'leftHand')
    const rHand = getBone(vrm, 'rightHand')
    const lElbow = getBone(vrm, 'leftLowerArm')
    const rElbow = getBone(vrm, 'rightLowerArm')
    const lFoot = getBone(vrm, 'leftFoot')
    const rFoot = getBone(vrm, 'rightFoot')
    const lKnee = getBone(vrm, 'leftLowerLeg')
    const rKnee = getBone(vrm, 'rightLowerLeg')
    const m = new THREE.Vector3()
    const initMap = initialWorldPose.get(model)
    const setFrom = (key, obj, off = new THREE.Vector3()) => {
      const t = trackers.value.find(x => x.key === key)
      if (!t) return
      if (saved && saved[key] && Array.isArray(saved[key]) && saved[key].length === 3 && vrm) {
        const lp = new THREE.Vector3().fromArray(saved[key])
        const wp = vrm.scene.localToWorld(lp.clone())
        m.copy(wp)
      } else if (initMap && initMap.has(key)) {
        m.copy(initMap.get(key))
      } else if (obj) {
        obj.updateWorldMatrix(true, false)
        obj.getWorldPosition(m)
      } else {
        m.set(0, 1, 0).applyMatrix4(basis)
      }
      m.add(off)
      if (force || !t.mesh.position.lengthSq()) t.mesh.position.copy(m)
    }
    setFrom('hips', hips)
    setFrom('chest', chest)
    setFrom('head', head, new THREE.Vector3(0, 0.1, 0))
    setFrom('leftElbow', lElbow)
    setFrom('rightElbow', rElbow)
    setFrom('leftHand', lHand, new THREE.Vector3(0.05, 0, 0))
    setFrom('rightHand', rHand, new THREE.Vector3(-0.05, 0, 0))
    setFrom('leftKnee', lKnee)
    setFrom('rightKnee', rKnee)
    setFrom('leftFoot', lFoot)
    setFrom('rightFoot', rFoot)
  }
    // mark that we performed the first layout
    if (!didInitialLayout) didInitialLayout = true

  function onPointerDown(e) {
    if (!enabled.value || !getActiveModel()?.vrm) return
    const dom = renderer.value?.domElement
    if (!dom || e.button !== 0) return // left only
    computeMouseNdc(e, dom)
    raycaster.setFromCamera(mouseNdc, camera.value)
  // Only intersect the tracker meshes themselves (exclude child label sprites)
  const picks = raycaster.intersectObjects(trackers.value.map(t => t.mesh), false)
    if (picks.length) {
      const hit = picks[0].object.userData.__vt ? picks[0].object : picks[0].object.parent
      dragState.active = true
      dragState.target = hit
      // Drag plane parallel to screen through hit point
      const p = new THREE.Vector3().copy(hit.getWorldPosition(new THREE.Vector3()))
      dragState.plane.setFromNormalAndCoplanarPoint(camera.value.getWorldDirection(new THREE.Vector3()), p)
      const ray = raycaster.ray
      const ip = new THREE.Vector3()
      dragState.plane.intersectLine(new THREE.Line3(ray.origin, ray.origin.clone().add(ray.direction.clone().multiplyScalar(1000))), ip)
      dragState.planeOffset.copy(ip).sub(p)
      controls.value && (controls.value.enabled = false)
      dom.setPointerCapture?.(e.pointerId)
    }
  }
  function onPointerMove(e) {
    if (!enabled.value || !getActiveModel()?.vrm || !dragState.active || !dragState.target) return
    const dom = renderer.value?.domElement
    if (!dom) return
    computeMouseNdc(e, dom)
    raycaster.setFromCamera(mouseNdc, camera.value)
    const ray = raycaster.ray
    const ip = new THREE.Vector3()
    const line = new THREE.Line3(ray.origin, ray.origin.clone().add(ray.direction.clone().multiplyScalar(2000)))
    if (dragState.plane.intersectLine(line, ip)) {
      const wp = ip.sub(dragState.planeOffset)
      dragState.target.position.copy(wp)
    }
  }
  function onPointerUp(e) {
    if (!enabled.value || !getActiveModel()?.vrm) return
    if (dragState.active) {
      dragState.active = false
      dragState.target = null
      controls.value && (controls.value.enabled = true)
      try { renderer.value?.domElement?.releasePointerCapture?.(e.pointerId) } catch {}
      try {
        const model = getActiveModel()
        if (model?.vrm) {
          const data = {}
          for (const t of trackers.value) {
            const wp = t.mesh.getWorldPosition(new THREE.Vector3())
            const lp = model.vrm.scene.worldToLocal(wp.clone())
            data[t.key] = [lp.x, lp.y, lp.z]
          }
          setSavedPositions(model, data)
        }
      } catch {}
    }
  }

  function computeMouseNdc(e, dom) {
    const rect = dom.getBoundingClientRect()
    mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  }

  function attachEvents() {
    const dom = renderer.value?.domElement
    if (!dom) return
    dom.addEventListener('pointerdown', onPointerDown)
    dom.addEventListener('pointermove', onPointerMove)
    dom.addEventListener('pointerup', onPointerUp)
  }
  function detachEvents() {
    const dom = renderer.value?.domElement
    if (!dom) return
    dom.removeEventListener('pointerdown', onPointerDown)
    dom.removeEventListener('pointermove', onPointerMove)
    dom.removeEventListener('pointerup', onPointerUp)
  }

  function getBone(vrm, name) {
    if (!vrm?.humanoid) return null
    try {
      const getter = vrm.humanoid.getRawBoneNode?.bind(vrm.humanoid) || vrm.humanoid.getNormalizedBoneNode?.bind(vrm.humanoid) || vrm.humanoid.getBoneNode?.bind(vrm.humanoid)
      return getter?.(name)
    } catch {}
    return null
  }

  function ensureBoneMap(model) {
    let map = boneCache.get(model)
    if (map) return map
    const vrm = model?.vrm
    map = {
      hips: getBone(vrm, 'hips'),
      spine: getBone(vrm, 'spine') || getBone(vrm, 'chest') || getBone(vrm, 'upperChest'),
      neck: getBone(vrm, 'neck') || getBone(vrm, 'chest'),
      head: getBone(vrm, 'head'),
      leftUpperArm: getBone(vrm, 'leftUpperArm'),
      leftLowerArm: getBone(vrm, 'leftLowerArm'),
      leftHand: getBone(vrm, 'leftHand'),
      rightUpperArm: getBone(vrm, 'rightUpperArm'),
      rightLowerArm: getBone(vrm, 'rightLowerArm'),
      rightHand: getBone(vrm, 'rightHand'),
      leftUpperLeg: getBone(vrm, 'leftUpperLeg'),
      leftLowerLeg: getBone(vrm, 'leftLowerLeg'),
      leftFoot: getBone(vrm, 'leftFoot'),
      rightUpperLeg: getBone(vrm, 'rightUpperLeg'),
      rightLowerLeg: getBone(vrm, 'rightLowerLeg'),
      rightFoot: getBone(vrm, 'rightFoot')
    }
    boneCache.set(model, map)
    return map
  }

  // Helpers for world/local quaternion application
  const _vA = new THREE.Vector3()
  const _vB = new THREE.Vector3()
  const _qA = new THREE.Quaternion()
  const _qB = new THREE.Quaternion()
  const _mA = new THREE.Matrix4()

  function rotateBoneToward(bone, desiredDirWorld, weight = 1.0) {
    if (!bone || !bone.parent) return
    // current direction from bone to its first child (fallback: local Y)
    const child = bone.children.find(c => c.isBone) || null
    bone.updateWorldMatrix(true, false)
    const origin = bone.getWorldPosition(_vA)
    let curDir = _vB.set(0, 1, 0)
    if (child) {
      const cp = child.getWorldPosition(new THREE.Vector3())
      curDir.copy(cp).sub(origin)
    }
    if (curDir.lengthSq() < 1e-6) curDir.set(0, 1, 0)
    curDir.normalize()
    const toDir = desiredDirWorld.clone().normalize()
    const axis = new THREE.Vector3().crossVectors(curDir, toDir)
    const dot = THREE.MathUtils.clamp(curDir.dot(toDir), -1, 1)
    const angle = Math.acos(dot) * weight
    if (axis.lengthSq() < 1e-10 || angle < 1e-4) return
    axis.normalize()
    // world rotation delta
    const dq = new THREE.Quaternion().setFromAxisAngle(axis, angle)
    // apply in world space: newWorldQ = dq * worldQ
    const parentWorldQ = bone.parent.getWorldQuaternion(_qA)
    const parentWorldQInv = _qB.copy(parentWorldQ).invert()
    const worldQ = bone.getWorldQuaternion(new THREE.Quaternion())
    const newWorldQ = dq.multiply(worldQ)
    const newLocalQ = parentWorldQInv.multiply(newWorldQ)
    bone.quaternion.copy(newLocalQ)
    bone.updateMatrixWorld(true)
  }

  // Analytic elbow/knee placement with pole hint
  function computeElbowPos(shoulderPos, targetPos, polePos, upperLen, lowerLen) {
    const rootToTarget = targetPos.clone().sub(shoulderPos)
    let d = rootToTarget.length()
    if (d < 1e-4) d = 1e-4
    const maxD = Math.max(1e-4, upperLen + lowerLen - 1e-4)
    const minD = Math.max(1e-4, Math.abs(upperLen - lowerLen) + 1e-4)
    d = THREE.MathUtils.clamp(d, minD, maxD)
    const dir = rootToTarget.clone().normalize()
    let poleDir = polePos ? polePos.clone().sub(shoulderPos) : new THREE.Vector3(0, 1, 0)
    if (poleDir.lengthSq() < 1e-6) poleDir.set(0, 1, 0)
    poleDir.normalize()
    let n = new THREE.Vector3().crossVectors(dir, poleDir)
    if (n.lengthSq() < 1e-6) n = new THREE.Vector3(0, 0, 1)
    n.normalize()
    const y = new THREE.Vector3().crossVectors(n, dir).normalize()
    // angle at shoulder
    const cosAlpha = THREE.MathUtils.clamp((upperLen*upperLen + d*d - lowerLen*lowerLen) / (2*upperLen*d), -1, 1)
    const sinAlpha = Math.sqrt(Math.max(0, 1 - cosAlpha*cosAlpha))
    // position
    const elbow = shoulderPos.clone()
    elbow.add(dir.clone().multiplyScalar(cosAlpha * upperLen))
    elbow.add(y.clone().multiplyScalar(sinAlpha * upperLen))
    return elbow
  }

  function boneLength(a, b) {
    if (!a || !b) return 0.2
    a.updateWorldMatrix(true, false); b.updateWorldMatrix(true, false)
    return a.getWorldPosition(new THREE.Vector3()).distanceTo(b.getWorldPosition(new THREE.Vector3())) || 0.2
  }

  function update() {
    if (!enabled.value) return
    const model = getActiveModel()
    if (!model?.vrm) return
    const bones = ensureBoneMap(model)
    const vrmRoot = model.vrm.scene
    vrmRoot.updateWorldMatrix(true, true)

    // Move root so hips aligns with hips tracker
    try {
      if (bones.hips) {
        const tHips = trackers.value.find(t => t.key === 'hips').mesh.position
        const worldHips = bones.hips.getWorldPosition(new THREE.Vector3())
        const delta = tHips.clone().sub(worldHips)
        vrmRoot.position.add(delta)
        vrmRoot.updateMatrixWorld(true)
      }
    } catch {}

    // Chest/Head aim
    try {
      const chestT = trackers.value.find(t => t.key === 'chest')?.mesh.position
      if (bones.spine && chestT) {
        const p = bones.spine.getWorldPosition(new THREE.Vector3())
        const dir = chestT.clone().sub(p)
        rotateBoneToward(bones.spine, dir, 0.5)
      }
      const headT = trackers.value.find(t => t.key === 'head')?.mesh.position
      const neckBase = bones.neck || bones.head || bones.spine
      if (neckBase && headT) {
        const p = neckBase.getWorldPosition(new THREE.Vector3())
        const dir = headT.clone().sub(p)
        rotateBoneToward(neckBase, dir, 0.6)
      }
    } catch {}

    // Arms IK (2-bone approx)
    try {
      solveLimb(bones.leftUpperArm, bones.leftLowerArm, bones.leftHand, 'leftHand', 'leftElbow')
      solveLimb(bones.rightUpperArm, bones.rightLowerArm, bones.rightHand, 'rightHand', 'rightElbow')
    } catch {}
    // Legs IK
    try {
      solveLimb(bones.leftUpperLeg, bones.leftLowerLeg, bones.leftFoot, 'leftFoot', 'leftKnee')
      solveLimb(bones.rightUpperLeg, bones.rightLowerLeg, bones.rightFoot, 'rightFoot', 'rightKnee')
    } catch {}
  }

  function solveLimb(upper, lower, eff, effKey, poleKey) {
    if (!upper || !lower || !eff) return
    const target = trackers.value.find(t => t.key === effKey)?.mesh.position
    const pole = trackers.value.find(t => t.key === poleKey)?.mesh.position
    if (!target) return
    const p0 = upper.getWorldPosition(new THREE.Vector3())
    const l1 = boneLength(upper, lower)
    const l2 = boneLength(lower, eff)
    const elbowP = computeElbowPos(p0, target, pole, l1, l2)
    // Aim bones to approximate positions
    rotateBoneToward(upper, elbowP.clone().sub(p0), 0.9)
    const p1 = lower.getWorldPosition(new THREE.Vector3())
    rotateBoneToward(lower, target.clone().sub(p1), 0.9)
  }

  watch(models, () => {
    pruneSavedForMissingModels()
    const hasModel = !!getActiveModel()?.vrm
    if (!hasModel) {
      // hide and dispose gizmos when no models are loaded
      setVisibility(false)
      disposeGizmos()
      return
    }
    if (enabled.value) {
      createGizmos()
      layoutDefaultPositions(true)
      setVisibility(true)
    }
  })

  function init() {
    // Respect current enabled state and existing model on init
    attachEvents()
    const modelPresent = !!getActiveModel()?.vrm
    if (enabled.value && modelPresent) {
      createGizmos()
      layoutDefaultPositions(true)
      setVisibility(true)
    } else {
      setVisibility(false)
    }
  }

  function cleanup() {
    detachEvents()
    disposeGizmos()
  }

  function createLabelSprite(text) {
    const canvas = document.createElement('canvas')
    const ctx2d = canvas.getContext('2d')
    const fontSize = 36
    const padding = 10
    ctx2d.font = `${fontSize}px sans-serif`
    const w = Math.ceil(ctx2d.measureText(text).width + padding * 2)
    const h = Math.ceil(fontSize + padding * 2)
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.font = `${fontSize}px sans-serif`
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#fff'
    ctx.textBaseline = 'top'
    ctx.fillText(text, padding, padding)
    const tex = new THREE.CanvasTexture(canvas)
    tex.minFilter = THREE.LinearFilter
    tex.generateMipmaps = false
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, depthWrite: false, transparent: true })
    const sprite = new THREE.Sprite(mat)
    const base = 0.004
    sprite.scale.set(w * base, h * base, 1)
    sprite.renderOrder = 999
  // Make the label fully click-through for raycasting
  sprite.raycast = () => {}
  sprite.userData.vtNoHit = true
    return sprite
  }

  // react to external controls
  watch(trackerDotSize, () => {
    if (!group.value) return
    const s = currentDotSize()
    trackers.value.forEach(t => {
      try { t.mesh?.geometry?.dispose?.() } catch {}
  t.mesh.geometry = markRaw(new THREE.SphereGeometry(s, 16, 16))
      // keep top-most rendering params
      if (t.mesh.material) {
        t.mesh.material.depthTest = false
        t.mesh.material.depthWrite = false
      }
      t.mesh.renderOrder = 998
    })
  })
  watch(trackerLabelScale, () => {
    const sc = currentLabelScale()
    trackers.value.forEach(t => {
      if (!t?.label) return
      const l = t.label
      const base = l.userData.baseScale || l.scale.clone().divideScalar(currentLabelScale())
      l.userData.baseScale = base
      l.scale.copy(base.clone().multiplyScalar(sc))
    })
  })
  watch(showTrackerLabels, () => {
    const vis = labelsVisible()
    trackers.value.forEach(t => { if (t.label) t.label.visible = vis && enabled.value })
  })

  return {
    enabled,
    trackers,
    init,
    cleanup,
    setEnabled,
    reset,
    update
  }
}
