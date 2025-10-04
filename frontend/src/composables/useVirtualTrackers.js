import { ref, watch, markRaw, reactive } from 'vue'
import * as THREE from 'three'

// VRChat-like 11 trackers
// head, chest, hips, L/R hand, L/R elbow, L/R foot, L/R knee
export const TRACKER_DEFS = [
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

export const TRACKER_ROTATION_ORDERS = ['XYZ', 'XZY', 'YXZ', 'YZX', 'ZXY', 'ZYX']

const DEFAULT_TRACKER_ROTATION_ORDER = 'YXZ'

const CAMERA_TRACKER_KEY = '__disabled_renderCamera'
const CAMERA_DEFAULT_POSITION = new THREE.Vector3(0, 10, 30)
const CAMERA_DEFAULT_TARGET = new THREE.Vector3(0, 1.2, 0)
const CAMERA_DEFAULT_QUATERNION = new THREE.Quaternion()
const CAMERA_DEFAULT_UP = new THREE.Vector3(0, 1, 0)
const __lookAtMatrix = new THREE.Matrix4().lookAt(
  CAMERA_DEFAULT_POSITION,
  CAMERA_DEFAULT_TARGET,
  CAMERA_DEFAULT_UP
)
CAMERA_DEFAULT_QUATERNION.setFromRotationMatrix(__lookAtMatrix)
const GLOBAL_CAMERA_STORAGE_KEY = '__renderCamera__'

function defaultCameraPositionArray() {
  return CAMERA_DEFAULT_POSITION.toArray([])
}

function defaultCameraRotationArray() {
  return CAMERA_DEFAULT_QUATERNION.toArray([])
}

const DEG2RAD = Math.PI / 180
const RAD2DEG = 180 / Math.PI

function defaultCameraState() {
  return {
    space: 'world',
    position: defaultCameraPositionArray(),
    rotation: defaultCameraRotationArray()
  }
}

function sanitizeNumericArray(source, length, fallback = 0) {
  const result = new Array(length)
  const fallbackIsArray = Array.isArray(fallback)
  for (let i = 0; i < length; i++) {
    const raw = Number(source?.[i])
    const defaultValue = fallbackIsArray ? Number(fallback[i] ?? 0) : fallback
    result[i] = Number.isFinite(raw) ? raw : defaultValue
  }
  return result
}

function toArrayLike(value, length) {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') {
    const keys = length === 3 ? ['x', 'y', 'z'] : ['x', 'y', 'z', 'w']
    return keys.map(key => value?.[key])
  }
  return null
}

function normalizeCameraRecord(entry) {
  if (!entry) return null
  if (Array.isArray(entry)) {
    if (entry.length < 3) return null
    return {
      space: 'world',
      position: sanitizeNumericArray(entry, 3, 0),
      rotation: defaultCameraRotationArray()
    }
  }
  if (typeof entry === 'object') {
    const rawPosition = toArrayLike(entry.position ?? entry.value, 3)
    if (!rawPosition || rawPosition.length < 3) return null
    const position = sanitizeNumericArray(rawPosition, 3, 0)
    const rawRotation = toArrayLike(entry.rotation ?? entry.quaternion, 4)
    let rotation
    if (rawRotation && rawRotation.length >= 4) {
      rotation = sanitizeNumericArray(rawRotation, 4, [0, 0, 0, 1])
      const magnitude = Math.hypot(rotation[0], rotation[1], rotation[2], rotation[3])
      if (magnitude > 0) {
        rotation = rotation.map(component => component / magnitude)
      } else {
        rotation = defaultCameraRotationArray()
      }
    } else {
      rotation = defaultCameraRotationArray()
    }
    return { space: 'world', position, rotation }
  }
  return null
}

function applyCameraStateToMesh(mesh, state) {
  if (!mesh || !state) return
  if (Array.isArray(state.position) && state.position.length >= 3) {
    mesh.position.set(state.position[0], state.position[1], state.position[2])
  }
  if (Array.isArray(state.rotation) && state.rotation.length >= 4) {
    mesh.quaternion.set(state.rotation[0], state.rotation[1], state.rotation[2], state.rotation[3]).normalize()
  }
}

export function useVirtualTrackers({
  scene,
  camera,
  renderer,
  controls,
  models,
  logToServer,
  trackerDotSize,
  trackerLabelScale,
  showTrackerLabels,
  onManipulateStart,
  onManipulateEnd,
  onTrackerTransform
}) {
  const DEFAULT_ROTATION_ORDER = DEFAULT_TRACKER_ROTATION_ORDER

  const enabled = ref(false)
  const trackers = ref([]) // { key, mesh, label, visible }
  const displayVisible = ref(true)
  const group = ref(null)
  const raycaster = new THREE.Raycaster()
  const mouseNdc = new THREE.Vector2()
  const trackerStates = reactive({})
  const trackerEuler = new THREE.Euler(0, 0, 0, DEFAULT_ROTATION_ORDER)
  const trackerQuaternion = new THREE.Quaternion()
  const trackerWorldPos = new THREE.Vector3()
  const trackerLocalPos = new THREE.Vector3()
  const rotationRingBaseQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)
  const rotationRingTmpQuatA = new THREE.Quaternion()
  const rotationRingTmpQuatB = new THREE.Quaternion()
  const rotationRingTmpVec = new THREE.Vector3()
  const rotationRingTmpVec2 = new THREE.Vector3()
  const trackerTmpVecA = new THREE.Vector3()
  const trackerTmpVecB = new THREE.Vector3()
  const cameraBasisRight = new THREE.Vector3()
  const cameraBasisUp = new THREE.Vector3()
  const cameraBasisForward = new THREE.Vector3()
  const dragTmpQuatA = new THREE.Quaternion()
  const dragTmpQuatB = new THREE.Quaternion()
  const dragTmpQuatC = new THREE.Quaternion()

  const dragState = {
    active: false,
    mode: 'translate', // 'translate' | 'rotate-pan-tilt' | 'rotate-roll'
    button: 0, // which mouse button initiated drag
    target: null,
    trackerKey: null,
    plane: new THREE.Plane(),
    planeOffset: new THREE.Vector3(),
    pointerStart: new THREE.Vector2(),
    pointerDelta: new THREE.Vector2(),
    startQuaternion: new THREE.Quaternion(),
    startAngles: { x: 0, y: 0, z: 0 },
    rotationRing: null,
    didMove: false,
    // ビューポート固定軸での回転用
    viewBasisX: new THREE.Vector3(),
    viewBasisY: new THREE.Vector3(),
    viewBasisZ: new THREE.Vector3()
  }

  const lastActiveKey = ref(null)
  let draggingKey = null

  function markActiveKey(key) {
    if (!key) return
    lastActiveKey.value = key
  }

  function notifyTrackerTransform(key, meta = {}) {
    if (!key) return
    try {
      typeof onTrackerTransform === 'function' && onTrackerTransform({ key, ...meta })
    } catch {}
  }

  function toFiniteNumber(value, fallback = 0) {
    const num = Number(value)
    return Number.isFinite(num) ? num : fallback
  }

  function normalizeOrder(order) {
    const upper = typeof order === 'string' ? order.toUpperCase() : DEFAULT_ROTATION_ORDER
    return TRACKER_ROTATION_ORDERS.includes(upper) ? upper : DEFAULT_ROTATION_ORDER
  }

  function createDefaultTrackerState(def) {
    return {
      key: def.key,
      label: def.label,
      enabled: true,
      order: DEFAULT_ROTATION_ORDER,
      angles: { x: 0, y: 0, z: 0 }
    }
  }

  function ensureTrackerState(key) {
    let state = trackerStates[key]
    if (!state) {
      const def = TRACKER_DEFS.find(d => d.key === key)
      if (!def) return null
      state = createDefaultTrackerState(def)
      trackerStates[key] = state
    }
    if (!state.angles) state.angles = { x: 0, y: 0, z: 0 }
    state.order = normalizeOrder(state.order)
    return state
  }

  for (const def of TRACKER_DEFS) {
    trackerStates[def.key] = createDefaultTrackerState(def)
  }

  function toDegrees(radians) {
    return Math.round(radians * RAD2DEG * 1000) / 1000
  }

  function toRadians(degrees) {
    const num = Number(degrees)
    return Number.isFinite(num) ? num * DEG2RAD : 0
  }

  function sanitizeAngleInput(value) {
    const num = Number(value)
    return Number.isFinite(num) ? Math.round(num * 1000) / 1000 : 0
  }

  function normalizePositionUpdate(tracker, update) {
    if (!tracker?.mesh) return null
    if (update == null) return null
    const meshPos = tracker.mesh.position
    const next = {
      x: meshPos.x,
      y: meshPos.y,
      z: meshPos.z
    }
    const assignFromArray = (arr = []) => {
      if (arr.length > 0) next.x = toFiniteNumber(arr[0], next.x)
      if (arr.length > 1) next.y = toFiniteNumber(arr[1], next.y)
      if (arr.length > 2) next.z = toFiniteNumber(arr[2], next.z)
    }
    if (Array.isArray(update)) {
      assignFromArray(update)
    } else if (typeof update === 'object') {
      if (update.space === 'array' && Array.isArray(update.position)) {
        assignFromArray(update.position)
      } else {
        if (update.x !== undefined) next.x = toFiniteNumber(update.x, next.x)
        if (update.y !== undefined) next.y = toFiniteNumber(update.y, next.y)
        if (update.z !== undefined) next.z = toFiniteNumber(update.z, next.z)
      }
    }
    return next
  }

  function applyTrackerStateToMesh(key) {
    if (key === CAMERA_TRACKER_KEY) return
    const tracker = trackers.value.find(t => t.key === key)
    const state = ensureTrackerState(key)
    if (!tracker?.mesh || !state) return
    const order = normalizeOrder(state.order)
    const angles = state.angles || { x: 0, y: 0, z: 0 }
    trackerEuler.set(toRadians(angles.x), toRadians(angles.y), toRadians(angles.z), order)
    trackerQuaternion.setFromEuler(trackerEuler)
    tracker.mesh.quaternion.copy(trackerQuaternion)
    tracker.mesh.updateMatrixWorld(true)
  }

  function syncTrackerStateFromMesh(key) {
    if (key === CAMERA_TRACKER_KEY) return
    const tracker = trackers.value.find(t => t.key === key)
    const state = ensureTrackerState(key)
    if (!tracker?.mesh || !state) return
    const order = normalizeOrder(state.order)
    trackerEuler.setFromQuaternion(tracker.mesh.quaternion, order)
    const angles = state.angles || (state.angles = { x: 0, y: 0, z: 0 })
    angles.x = toDegrees(trackerEuler.x)
    angles.y = toDegrees(trackerEuler.y)
    angles.z = toDegrees(trackerEuler.z)
  }

  function trackerIsIndividuallyEnabled(key) {
    if (key === CAMERA_TRACKER_KEY) return false
    return true
  }

  function getTrackerEntry(key) {
    if (!key) return null
    return trackers.value.find(t => t.key === key) || null
  }

  function buildBodyTrackerSaveData(model) {
    const vrm = model?.vrm
    if (!vrm?.scene) return null
    const payload = {}
    for (const tracker of trackers.value) {
      if (tracker.key === CAMERA_TRACKER_KEY) continue
      const mesh = tracker.mesh
      if (!mesh) continue
      mesh.updateMatrixWorld(true)
      mesh.getWorldPosition(trackerWorldPos)
      trackerLocalPos.copy(trackerWorldPos)
      vrm.scene.worldToLocal(trackerLocalPos)
      const state = ensureTrackerState(tracker.key)
      const entry = {
        space: 'local',
        position: trackerLocalPos.toArray([]),
        rotation: mesh.quaternion.toArray([]),
        order: state?.order || DEFAULT_ROTATION_ORDER,
        enabled: state?.enabled !== false
      }
      if (state?.angles) {
        entry.angles = {
          x: sanitizeAngleInput(state.angles.x),
          y: sanitizeAngleInput(state.angles.y),
          z: sanitizeAngleInput(state.angles.z)
        }
      }
      payload[tracker.key] = entry
    }
    return payload
  }

  function persistTrackerTransforms({ includeCamera = false } = {}) {
    const model = getActiveModel()
    if (model?.vrm) {
      const data = buildBodyTrackerSaveData(model)
      if (data) setSavedPositions(model, data)
    }
    if (includeCamera) {
      const cameraTracker = trackers.value.find(t => t.key === CAMERA_TRACKER_KEY)
      if (cameraTracker?.mesh) saveCameraState(serializeCameraState(cameraTracker.mesh), { syncTracker: false })
    }
  }

  function updateTrackerVisibility(key) {
    const tracker = trackers.value.find(t => t.key === key)
    if (!tracker) return
    const hasModel = Array.isArray(models?.value) && models.value.some(m => !!m?.vrm)
    const meshVisible = tracker.key === CAMERA_TRACKER_KEY
      ? false
      : (enabled.value && displayVisible.value && hasModel && trackerIsIndividuallyEnabled(tracker.key))
    tracker.mesh.visible = meshVisible
    if (tracker.labelSprite) tracker.labelSprite.visible = meshVisible && labelsVisible()
  }

  function resetTrackerStateToDefault(key, { keepEnabled = false } = {}) {
    if (key === CAMERA_TRACKER_KEY) return
    const def = TRACKER_DEFS.find(d => d.key === key)
    const state = ensureTrackerState(key)
    if (!state || !def) return
    if (!keepEnabled) state.enabled = def.defaultEnabled !== false
    state.order = DEFAULT_ROTATION_ORDER
    state.angles.x = 0
    state.angles.y = 0
    state.angles.z = 0
    applyTrackerStateToMesh(key)
    updateTrackerVisibility(key)
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

  function getSavedCameraTransform() {
    const all = loadAllSaved()
    return all[GLOBAL_CAMERA_STORAGE_KEY] || null
  }

  function setSavedCameraTransform(dataOrNull) {
    const all = loadAllSaved()
    if (!dataOrNull) delete all[GLOBAL_CAMERA_STORAGE_KEY]
    else all[GLOBAL_CAMERA_STORAGE_KEY] = dataOrNull
    saveAllSaved(all)
  }

  function saveCameraState(state, { syncTracker = true } = {}) {
    const normalized = normalizeCameraRecord(state)
    if (!normalized) return null
    setSavedCameraTransform(normalized)
    if (syncTracker) {
      const tracker = trackers.value.find(t => t.key === CAMERA_TRACKER_KEY)
      if (tracker?.mesh) applyCameraStateToMesh(tracker.mesh, normalized)
    }
    return normalized
  }

  function saveCameraStateFromObject(object, options = {}) {
    if (!object?.position || !object?.quaternion) return null
    return saveCameraState(serializeCameraState(object), options)
  }

  function getCameraState({ preferTracker = true, preferSaved = true, fallbackToCamera = true, fallbackToDefault = true } = {}) {
    if (preferTracker) {
      const tracker = trackers.value.find(t => t.key === CAMERA_TRACKER_KEY)
      if (tracker?.mesh) return serializeCameraState(tracker.mesh)
    }
    if (preferSaved) {
      const saved = normalizeCameraRecord(getSavedCameraTransform())
      if (saved) return saved
    }
    if (fallbackToCamera && camera?.value) {
      return serializeCameraState(camera.value)
    }
    if (fallbackToDefault) {
      return defaultCameraState()
    }
    return null
  }

  function pruneSavedForMissingModels() {
    try {
      const all = loadAllSaved()
      const present = new Set((models?.value || []).map(m => modelKey(m)))
      let changed = false
      for (const k of Object.keys(all)) {
        if (k === GLOBAL_CAMERA_STORAGE_KEY) continue
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
    // If a group exists but isn't in the scene or trackers list is incomplete, rebuild
    if (group.value) {
      const inScene = !!scene.value && scene.value.children.includes(group.value)
      const complete = trackers.value.length === TRACKER_DEFS.length
      if (inScene && complete) return
      // stale or incomplete -> dispose and recreate
      disposeGizmos()
    }
    group.value = markRaw(new THREE.Group())
    group.value.name = 'VirtualTrackers'
    scene.value.add(group.value)
  const sphere = markRaw(new THREE.SphereGeometry(currentDotSize(), 16, 16))
    for (const def of TRACKER_DEFS) {
  const isCamera = def.key === CAMERA_TRACKER_KEY
      const mat = markRaw(new THREE.MeshBasicMaterial({ color: def.color }))
      // Always draw on top of the model
      mat.depthTest = false
      mat.depthWrite = false
      let geometry
      if (isCamera) {
        const baseSize = currentDotSize()
        geometry = markRaw(new THREE.ConeGeometry(baseSize * 1.6, baseSize * 3.2, 24))
        geometry.rotateX(Math.PI / 2)
      } else {
        // Don't reuse geometry across meshes because we rebuild on size change and dispose safely
        geometry = markRaw(sphere.clone())
      }
      const mesh = markRaw(new THREE.Mesh(geometry, mat))
      mesh.renderOrder = 998 // labels use 999
      mesh.name = `vt:${def.key}`
      mesh.userData.__vt = true
      mesh.userData.isCamera = isCamera
      // start hidden
      mesh.visible = false
  const sprite = markRaw(createLabelSprite(def.label))
      sprite.position.set(0, isCamera ? 0.45 : 0.15, 0)
  sprite.visible = labelsVisible()
  // capture base size to allow absolute scaling later
  sprite.userData.baseScale = sprite.scale.clone()
  sprite.scale.copy(sprite.userData.baseScale.clone().multiplyScalar(currentLabelScale()))
      let rotationRing = null
      if (!isCamera) {
        rotationRing = markRaw(createRotationRing(def.color))
        if (rotationRing) mesh.add(rotationRing)
      }
      mesh.add(sprite)
      group.value.add(mesh)
      // camera tracker disabled
      trackers.value.push({ key: def.key, name: def.label, mesh, labelSprite: sprite, rotationRing })
      ensureTrackerState(def.key)
      applyTrackerStateToMesh(def.key)
    }
  }

  function disposeGizmos() {
    if (!group.value) return
    try {
      for (const t of trackers.value) {
        try { t.labelSprite?.material?.map?.dispose() } catch {}
        try { t.labelSprite?.material?.dispose() } catch {}
        try { t.mesh?.geometry?.dispose?.() } catch {}
        try { t.mesh?.material?.dispose?.() } catch {}
        if (t.rotationRing) {
          try { t.rotationRing.geometry?.dispose?.() } catch {}
          try { t.rotationRing.material?.dispose?.() } catch {}
        }
      }
    } catch {}
    group.value.parent && group.value.parent.remove(group.value)
    group.value = null
    trackers.value = []
  }

  function setEnabled(v) {
    enabled.value = !!v
    if (enabled.value) {
      createGizmos()
      layoutDefaultPositions()
    }
    setVisibility(enabled.value)
  }

  function setVisibility(vis) {
    const hasModel = Array.isArray(models?.value) && (models.value.some(m => !!m?.vrm))
    const enabledVis = !!vis
    for (const t of trackers.value) {
      const meshVisible = t.key === CAMERA_TRACKER_KEY
        ? false
        : (enabledVis && displayVisible.value && hasModel && trackerIsIndividuallyEnabled(t.key))
      t.mesh.visible = meshVisible
      if (t.labelSprite) t.labelSprite.visible = meshVisible && labelsVisible()
    }
  }

  function reset() {
    try {
      const model = getActiveModel()
      if (model) {
        setSavedPositions(model, null)
        // トラッカー回転オフセットもクリア
        trackerRotationOffsets.delete(model)
      }
    } catch {}
    setSavedCameraTransform(null)
    for (const def of TRACKER_DEFS) resetTrackerStateToDefault(def.key)
    layoutDefaultPositions({ force: true, ignoreSaved: true })
  }

  // Cache of initial humanoid bone world positions per model to use as baseline placement
  const initialWorldPose = new WeakMap() // model -> Map(key -> { position: Vector3, quaternion: Quaternion })
  const trackerRotationOffsets = new WeakMap() // model -> Map(key -> Quaternion)
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
    const poseMap = new Map()
    const offsetMap = new Map()
    for (const t of TRACKER_DEFS) {
      const names = trackerToBones[t.key] || []
      let b = null
      for (const n of names) { b = getBone(vrm, n); if (b) break }
      if (!b) continue
      try { b.updateWorldMatrix(true, false) } catch {}
      const position = b.getWorldPosition(new THREE.Vector3())
      const rotation = b.getWorldQuaternion(new THREE.Quaternion())
      poseMap.set(t.key, { position: position.clone(), quaternion: rotation.clone() })
      const trackerEntry = trackers.value.find(x => x.key === t.key)
      if (trackerEntry?.mesh) {
        try { trackerEntry.mesh.updateMatrixWorld(true) } catch {}
        const trackerWorldQ = trackerEntry.mesh.getWorldQuaternion(new THREE.Quaternion())
        const offset = rotation.clone().multiply(trackerWorldQ.clone().invert())
        offsetMap.set(t.key, offset)
      }
    }
    initialWorldPose.set(model, poseMap)
    trackerRotationOffsets.set(model, offsetMap)
  }

  function layoutDefaultPositions(options = {}) {
    const normalized = typeof options === 'boolean' ? { force: options } : (options || {})
    const force = normalized.force === true
    const ignoreSaved = normalized.ignoreSaved === true
    if (!group.value) return
    const model = getActiveModel()
    const vrm = model?.vrm || null
    const rawSavedAll = (!ignoreSaved && vrm) ? getSavedPositions(model) : null
    const hasSavedEntries = rawSavedAll && Object.keys(rawSavedAll).length > 0
    const saved = hasSavedEntries ? rawSavedAll : null

    if (vrm) {
      const root = vrm.scene || scene.value
      const basis = new THREE.Matrix4()
      root.updateWorldMatrix(true, false)
      basis.copy(root.matrixWorld)
      // Capture once per model so initial virtual trackers follow the imported pose, not current deformed state
      captureInitialWorldPose(model)
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
        const savedEntry = saved?.[key]
        const state = ensureTrackerState(key)
        let usedSaved = false
        if (savedEntry && vrm) {
          if (Array.isArray(savedEntry) && savedEntry.length === 3) {
            const lp = new THREE.Vector3().fromArray(savedEntry)
            const wp = vrm.scene.localToWorld(lp.clone())
            m.copy(wp)
            usedSaved = true
          } else if (typeof savedEntry === 'object' && Array.isArray(savedEntry.position)) {
            const pos = savedEntry.position
            if (savedEntry.space === 'world') {
              m.set(pos[0], pos[1], pos[2])
            } else {
              const lp = new THREE.Vector3().fromArray(pos)
              m.copy(vrm.scene.localToWorld(lp.clone()))
            }
            if (typeof savedEntry.order === 'string' && state) state.order = normalizeOrder(savedEntry.order)
            if (Array.isArray(savedEntry.rotation) && savedEntry.rotation.length === 4) {
              const [qx, qy, qz, qw] = savedEntry.rotation
              t.mesh.quaternion.set(qx, qy, qz, qw).normalize()
            } else if (state && savedEntry.angles && typeof savedEntry.angles === 'object') {
              state.angles.x = sanitizeAngleInput(savedEntry.angles.x)
              state.angles.y = sanitizeAngleInput(savedEntry.angles.y)
              state.angles.z = sanitizeAngleInput(savedEntry.angles.z)
              applyTrackerStateToMesh(key)
            } else {
              t.mesh.quaternion.identity()
            }
            usedSaved = true
          }
        }

        if (!usedSaved) {
          if (initMap && initMap.has(key)) {
            const entry = initMap.get(key)
            if (entry?.position) m.copy(entry.position)
            else if (entry) m.copy(entry)
          } else if (obj) {
            obj.updateWorldMatrix(true, false)
            obj.getWorldPosition(m)
          } else {
            m.set(0, 1, 0).applyMatrix4(basis)
          }
          t.mesh.quaternion.identity()
          if (state) state.enabled = true
        }

        m.add(off)
        if (force || !t.mesh.position.lengthSq()) t.mesh.position.copy(m)
        syncTrackerStateFromMesh(key)
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

    layoutCameraTracker({ savedAll: saved, force })
    if (vrm && !didInitialLayout) didInitialLayout = true
    
    // トラッカー位置が変更された場合、回転オフセットをクリア
    if (force && model) {
      trackerRotationOffsets.delete(model)
    }
  }

  function layoutCameraTracker({ savedAll, force = false }) {
  const tracker = trackers.value.find(t => t.key === CAMERA_TRACKER_KEY)
    if (!tracker?.mesh) return
    const stored = normalizeCameraRecord(savedAll?.[CAMERA_TRACKER_KEY] ?? getSavedCameraTransform())
    let applied = false
    if (stored && !force) {
      applyCameraStateToMesh(tracker.mesh, stored)
      saveCameraState(stored, { syncTracker: false })
      applied = true
    }

    if (!applied) {
      // If a model is present, place camera tracker to show the model's front
      const model = getActiveModel()
      const vrmRoot = model?.vrm?.scene
      if (vrmRoot) {
        try {
          // Compute model bounds
          const bbox = new THREE.Box3().setFromObject(vrmRoot)
          const center = bbox.getCenter(new THREE.Vector3())
          const size = bbox.getSize(new THREE.Vector3())
          // Estimate distance from vertical FOV to fit height with margin
          const fovDeg = Number(camera?.value?.fov) || 45
          const fov = THREE.MathUtils.degToRad(fovDeg)
          const height = Math.max(1.0, size.y || size.length() || 2.0)
          const margin = 1.25
          const dist = (height * 0.5) / Math.tan(fov * 0.5) * margin
          // Model forward: world-space -Z of vrm root
          const forward = vrmRoot.getWorldDirection(new THREE.Vector3()).normalize()
          // Two candidate positions: in front of the model (face side) and the opposite side.
          const posA = center.clone().add(forward.clone().multiplyScalar(dist))
          const posB = center.clone().sub(forward.clone().multiplyScalar(dist))
          // Prefer the side closer to the current camera viewpoint to avoid flipping to the back.
          let chosen = posA
          const refCam = camera?.value
          if (refCam) {
            const sideDir = refCam.position.clone().sub(center).normalize()
            const aDir = posA.clone().sub(center).normalize()
            const bDir = posB.clone().sub(center).normalize()
            const dotA = aDir.dot(sideDir)
            const dotB = bDir.dot(sideDir)
            chosen = dotB > dotA ? posB : posA
          }
          tracker.mesh.position.copy(chosen)
          // Orient to look at the model center
          const m = new THREE.Matrix4().lookAt(tracker.mesh.position, center, CAMERA_DEFAULT_UP)
          const q = new THREE.Quaternion().setFromRotationMatrix(m)
          tracker.mesh.quaternion.copy(q)
        } catch {
          // Fallback to default if bounds failed
          tracker.mesh.position.copy(CAMERA_DEFAULT_POSITION)
          tracker.mesh.quaternion.copy(CAMERA_DEFAULT_QUATERNION)
        }
      } else {
        const activeCamera = camera?.value
        if (activeCamera) {
          const forward = new THREE.Vector3()
          try { activeCamera.getWorldDirection(forward) } catch { forward.set(0, 0, -1) }
          const offsetDist = 0.8
          const pos = new THREE.Vector3().copy(activeCamera.position).add(forward.multiplyScalar(offsetDist))
          tracker.mesh.position.copy(pos)
          tracker.mesh.quaternion.copy(activeCamera.quaternion)
        } else {
          tracker.mesh.position.copy(CAMERA_DEFAULT_POSITION)
          tracker.mesh.quaternion.copy(CAMERA_DEFAULT_QUATERNION)
        }
      }
      applied = true
      saveCameraState(serializeCameraState(tracker.mesh), { syncTracker: false })
    }
  }

  function serializeCameraState(mesh) {
    return {
      space: 'world',
      position: mesh.position.toArray([]),
      rotation: mesh.quaternion.toArray([])
    }
  }

  function resolveTrackerKeyFromObject(object) {
    if (!object) return null
    const candidates = [object]
    if (object.parent) candidates.push(object.parent)
    for (const candidate of candidates) {
      if (!candidate) continue
      const entry = trackers.value.find(t => t.mesh === candidate || t.labelSprite === candidate)
      if (entry?.key) return entry.key
      if (typeof candidate.name === 'string' && candidate.name.length) {
        return candidate.name.startsWith('vt:') ? candidate.name.slice(3) : candidate.name
      }
    }
    return null
  }

  function onPointerDown(e) {
    if (!enabled.value) return
    const dom = renderer.value?.domElement
    if (!dom) return
    const isSupportedButton = e.button === 0 || e.button === 1 || e.button === 2
    if (!isSupportedButton) return
    if (e.button !== 0) e.preventDefault()
    computeMouseNdc(e, dom)
    raycaster.setFromCamera(mouseNdc, camera.value)
    // Only intersect the tracker meshes themselves (exclude child label sprites)
    const picks = raycaster.intersectObjects(trackers.value.map(t => t.mesh), false)
    if (picks.length) {
      const hit = picks[0].object.userData.__vt ? picks[0].object : picks[0].object.parent
      const trackerKey = resolveTrackerKeyFromObject(hit)
      
      // 操作モード決定: 左クリック=移動, 右クリック=パン/チルト, 中クリック=ロール
      let mode = 'translate'
      if (e.button === 2) mode = 'rotate-pan-tilt'
      else if (e.button === 1) mode = 'rotate-roll'
      
      dragState.active = true
      dragState.mode = mode
      dragState.button = e.button
      dragState.target = hit
      dragState.trackerKey = trackerKey
      dragState.pointerStart.set(e.clientX, e.clientY)
      dragState.pointerDelta.set(0, 0)
      dragState.startQuaternion.copy(hit.quaternion)
      dragState.didMove = false
      draggingKey = trackerKey
      
      if (trackerKey) {
        markActiveKey(trackerKey)
        notifyTrackerTransform(trackerKey, { type: 'select', source: 'drag-start', persisted: false })
      }
      try { typeof onManipulateStart === 'function' && onManipulateStart({ type: 'tracker', key: trackerKey }) } catch {}
      
      dragState.rotationRing = null
      
      if (mode === 'translate') {
        // Drag plane parallel to screen through hit point
        const p = new THREE.Vector3().copy(hit.getWorldPosition(new THREE.Vector3()))
        dragState.plane.setFromNormalAndCoplanarPoint(camera.value.getWorldDirection(new THREE.Vector3()), p)
        const ray = raycaster.ray
        const ip = new THREE.Vector3()
        dragState.plane.intersectLine(new THREE.Line3(ray.origin, ray.origin.clone().add(ray.direction.clone().multiplyScalar(1000))), ip)
        dragState.planeOffset.copy(ip).sub(p)
      } else {
        // 回転モード: ビューポート固定軸を保存
        const state = ensureTrackerState(trackerKey)
        if (state?.angles) {
          dragState.startAngles = {
            x: sanitizeAngleInput(state.angles.x),
            y: sanitizeAngleInput(state.angles.y),
            z: sanitizeAngleInput(state.angles.z)
          }
        } else {
          dragState.startAngles = { x: 0, y: 0, z: 0 }
        }
        
        // ビューポート基準軸を計算（カメラのワールド空間での向き）
        const camWorldMat = new THREE.Matrix4()
        camera.value.updateMatrixWorld(true)
        camWorldMat.copy(camera.value.matrixWorld)
        
        // カメラ右方向 (X), 上方向 (Y), 奥方向 (-Z)
        dragState.viewBasisX.set(1, 0, 0).applyMatrix4(camWorldMat).sub(camera.value.position).normalize()
        dragState.viewBasisY.set(0, 1, 0).applyMatrix4(camWorldMat).sub(camera.value.position).normalize()
        dragState.viewBasisZ.set(0, 0, -1).applyMatrix4(camWorldMat).sub(camera.value.position).normalize()
        
        const entry = trackers.value.find(t => t.key === trackerKey)
        dragState.rotationRing = entry?.rotationRing || null
        updateViewAlignedIndicators(entry)
      }
      controls.value && (controls.value.enabled = false)
      dom.setPointerCapture?.(e.pointerId)
    }
  }
  function onPointerMove(e) {
    if (!enabled.value || !dragState.active || !dragState.target) return
    const dom = renderer.value?.domElement
    if (!dom) return
    dragState.pointerDelta.set(e.clientX - dragState.pointerStart.x, e.clientY - dragState.pointerStart.y)
    
    if (dragState.mode === 'translate') {
      // 平行移動処理
      computeMouseNdc(e, dom)
      raycaster.setFromCamera(mouseNdc, camera.value)
      const ray = raycaster.ray
      const ip = new THREE.Vector3()
      const line = new THREE.Line3(ray.origin, ray.origin.clone().add(ray.direction.clone().multiplyScalar(2000)))
      if (dragState.plane.intersectLine(line, ip)) {
        const wp = ip.sub(dragState.planeOffset)
        dragState.target.position.copy(wp)
        dragState.didMove = true
        // If dragging the camera tracker, also move the active camera immediately (in camera mode this is the render camera)
        if (dragState.target.userData?.isCamera && camera?.value) {
          try {
            camera.value.position.copy(dragState.target.position)
            // Keep current orientation of the tracker (rotation may be adjusted elsewhere)
            camera.value.quaternion.copy(dragState.target.quaternion)
            camera.value.updateMatrixWorld(true)
          } catch {}
        }
      }
    } else if (dragState.mode === 'rotate-pan-tilt') {
      // パン/チルト回転: ビューポート固定軸で回転
      const sensitivity = 0.5 // 感度調整
      const deltaX = dragState.pointerDelta.x * sensitivity
      const deltaY = dragState.pointerDelta.y * sensitivity

      // 横ドラッグ: ワールドY軸（上方向）で回転（パン）
      const panAngle = deltaX * DEG2RAD
  cameraBasisUp.set(0, 1, 0)
  const panQuat = dragTmpQuatA.setFromAxisAngle(cameraBasisUp, panAngle)

      // 縦ドラッグ: ビューポートのX軸（左右方向）で回転（チルト）
  const tiltAngle = deltaY * DEG2RAD
      const tiltQuat = dragTmpQuatB.setFromAxisAngle(dragState.viewBasisX, tiltAngle)

      // 回転を適用: 最初の姿勢から相対的に回転
      const newQuat = dragTmpQuatC.copy(dragState.startQuaternion)
      newQuat.premultiply(panQuat) // パンを先に適用
      newQuat.premultiply(tiltQuat) // チルトを後に適用

      dragState.target.quaternion.copy(newQuat)
      dragState.target.updateMatrixWorld(true)
      
      // 状態を同期
      if (dragState.trackerKey) {
        syncTrackerStateFromMesh(dragState.trackerKey)
      }
      
      dragState.didMove = true
    } else if (dragState.mode === 'rotate-roll') {
      // ロール回転: カメラからトラッカーへの視線をZ軸としてロール
      const sensitivity = 0.5
      const deltaX = dragState.pointerDelta.x * sensitivity
      
      // カメラからトラッカーへの方向をロール軸とする
      const trackerPos = dragState.target.getWorldPosition(new THREE.Vector3())
      const camPos = camera.value.position.clone()
      const rollAxis = trackerPos.clone().sub(camPos).normalize()
      
      const rollAngle = deltaX * DEG2RAD
      const rollQuat = new THREE.Quaternion().setFromAxisAngle(rollAxis, rollAngle)
      
      const newQuat = new THREE.Quaternion()
      newQuat.copy(dragState.startQuaternion)
      newQuat.premultiply(rollQuat)
      
      dragState.target.quaternion.copy(newQuat)
      dragState.target.updateMatrixWorld(true)
      
      // 状態を同期
      if (dragState.trackerKey) {
        syncTrackerStateFromMesh(dragState.trackerKey)
      }
      
      dragState.didMove = true
    }
  }
  function onPointerUp(e) {
    if (!enabled.value) return
    if (dragState.active) {
      const releasedTarget = dragState.target
      const releasedKey = draggingKey || resolveTrackerKeyFromObject(releasedTarget) || null
      const moved = dragState.didMove
      dragState.active = false
      dragState.target = null
      dragState.trackerKey = null
      dragState.mode = 'translate'
      dragState.didMove = false
      dragState.rotationRing = null
      draggingKey = null
      controls.value && (controls.value.enabled = true)
      try { renderer.value?.domElement?.releasePointerCapture?.(e.pointerId) } catch {}
      try { typeof onManipulateEnd === 'function' && onManipulateEnd({ type: 'tracker' }) } catch {}
      try {
        const cameraTracker = trackers.value.find(t => t.key === CAMERA_TRACKER_KEY)
        if (cameraTracker) {
          const cameraState = serializeCameraState(cameraTracker.mesh)
          saveCameraState(cameraState, { syncTracker: false })
          if (camera?.value && cameraTracker.mesh?.userData?.isCamera) {
            try {
              camera.value.position.copy(cameraTracker.mesh.position)
              camera.value.quaternion.copy(cameraTracker.mesh.quaternion)
              camera.value.updateMatrixWorld(true)
            } catch {}
          }
        }
        persistTrackerTransforms({ includeCamera: true })
        if (releasedKey && moved) {
          const pos = releasedTarget?.position
          notifyTrackerTransform(releasedKey, {
            type: 'position',
            source: 'drag',
            persisted: true,
            position: pos ? [pos.x, pos.y, pos.z] : undefined
          })
        }
      } catch {}
    }
  }

  function onContextMenu(e) {
    if (!enabled.value) return
    e.preventDefault()
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
    dom.addEventListener('contextmenu', onContextMenu)
  }
  function detachEvents() {
    const dom = renderer.value?.domElement
    if (!dom) return
    dom.removeEventListener('pointerdown', onPointerDown)
    dom.removeEventListener('pointermove', onPointerMove)
    dom.removeEventListener('pointerup', onPointerUp)
    dom.removeEventListener('contextmenu', onContextMenu)
  }

  function setDisplayVisible(value) {
    displayVisible.value = !!value
    setVisibility(enabled.value)
  }

  function setTrackerEnabled(key, value, { persist = true } = {}) {
    if (key === CAMERA_TRACKER_KEY) return
    const state = ensureTrackerState(key)
    if (!state) return
    state.enabled = true
    updateTrackerVisibility(key)
    markActiveKey(key)
    if (persist) persistTrackerTransforms()
    notifyTrackerTransform(key, {
      type: 'enabled',
      value: true,
      persisted: persist !== false
    })
  }

  function setTrackerRotationDegrees(key, angles, { persist = true } = {}) {
    if (key === CAMERA_TRACKER_KEY) return
    const state = ensureTrackerState(key)
    if (!state) return
    const target = state.angles || (state.angles = { x: 0, y: 0, z: 0 })
    if (angles && typeof angles === 'object') {
      if (angles.x !== undefined) target.x = sanitizeAngleInput(angles.x)
      if (angles.y !== undefined) target.y = sanitizeAngleInput(angles.y)
      if (angles.z !== undefined) target.z = sanitizeAngleInput(angles.z)
    }
    applyTrackerStateToMesh(key)
    markActiveKey(key)
    if (persist) persistTrackerTransforms()
    const snapshotAngles = {
      x: sanitizeAngleInput(state.angles?.x),
      y: sanitizeAngleInput(state.angles?.y),
      z: sanitizeAngleInput(state.angles?.z)
    }
    notifyTrackerTransform(key, {
      type: 'rotation',
      angles: snapshotAngles,
      persisted: persist !== false,
      source: persist === false ? 'transient' : 'user'
    })
  }

  function setTrackerRotationOrder(key, order, { persist = true } = {}) {
    if (key === CAMERA_TRACKER_KEY) return
    const state = ensureTrackerState(key)
    if (!state) return
    const normalized = normalizeOrder(order)
    if (state.order !== normalized) {
      state.order = normalized
      syncTrackerStateFromMesh(key)
      markActiveKey(key)
      if (persist) persistTrackerTransforms()
      notifyTrackerTransform(key, {
        type: 'rotationOrder',
        order: normalized,
        persisted: persist !== false,
        source: persist === false ? 'transient' : 'user'
      })
    }
  }

  function setTrackerPosition(key, position, { persist = true } = {}) {
    if (key === CAMERA_TRACKER_KEY) return
    const tracker = trackers.value.find(t => t.key === key)
    if (!tracker?.mesh) return
    const next = normalizePositionUpdate(tracker, position)
    if (!next) return
    tracker.mesh.position.set(next.x, next.y, next.z)
    tracker.mesh.updateMatrixWorld(true)
    syncTrackerStateFromMesh(key)
    markActiveKey(key)
    if (persist) persistTrackerTransforms()
    notifyTrackerTransform(key, {
      type: 'position',
      position: [next.x, next.y, next.z],
      persisted: persist !== false,
      source: dragState.active ? 'drag' : 'manual'
    })
  }

  function resetTrackerRotation(key, { keepEnabled = true, persist = true } = {}) {
    if (key === CAMERA_TRACKER_KEY) return
    resetTrackerStateToDefault(key, { keepEnabled })
    markActiveKey(key)
    if (persist) persistTrackerTransforms()
    notifyTrackerTransform(key, { type: 'reset', persisted: persist !== false })
  }

  function resetAllTrackerRotations({ keepEnabled = true, persist = true } = {}) {
    for (const def of TRACKER_DEFS) {
      resetTrackerStateToDefault(def.key, { keepEnabled })
      notifyTrackerTransform(def.key, { type: 'reset', bulk: true, persisted: false })
    }
    if (persist) {
      persistTrackerTransforms()
      notifyTrackerTransform('all', { type: 'resetAll', persisted: true })
    }
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

  function applyTrackerRotationToBone(bone, key, { weight = 1.0 } = {}) {
    if (!bone || key === CAMERA_TRACKER_KEY) return
    if (!trackerIsIndividuallyEnabled(key)) return
    const trackerEntry = trackers.value.find(t => t.key === key)
    if (!trackerEntry?.mesh) return
    const model = getActiveModel()
    if (!model) return
    
    try { 
      trackerEntry.mesh.updateMatrixWorld(true) 
      bone.updateWorldMatrix(true, false)
    } catch {}
    
    const trackerWorldQ = trackerEntry.mesh.getWorldQuaternion(new THREE.Quaternion())
    
    // オフセットマップの初期化
    let offsetMap = trackerRotationOffsets.get(model)
    if (!offsetMap) {
      offsetMap = new Map()
      trackerRotationOffsets.set(model, offsetMap)
    }
    
    // オフセットの計算（初回のみ）
    let offset = offsetMap.get(key)
    if (!offset) {
      const boneWorldQ = bone.getWorldQuaternion(new THREE.Quaternion())
      const invTracker = trackerWorldQ.clone().invert()
      offset = boneWorldQ.clone().multiply(invTracker)
      offsetMap.set(key, offset)
    }
    
    // ターゲット回転を計算（トラッカー回転 × オフセット）
    const targetWorldQ = offset.clone().multiply(trackerWorldQ)
    
    // 親のワールド回転を取得
    const parentWorldQ = bone.parent
      ? bone.parent.getWorldQuaternion(new THREE.Quaternion())
      : new THREE.Quaternion()
    
    // ローカル回転に変換
    const targetLocalQ = parentWorldQ.clone().invert().multiply(targetWorldQ)
    
    // ウェイトを適用
    if (weight >= 1) {
      bone.quaternion.copy(targetLocalQ)
    } else if (weight > 0) {
      bone.quaternion.slerp(targetLocalQ, weight)
    }
    
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
    if (camera?.value) {
      trackers.value.forEach(entry => {
        if (entry.key !== CAMERA_TRACKER_KEY) updateViewAlignedIndicators(entry)
      })
    }
    const bones = ensureBoneMap(model)
    const vrmRoot = model.vrm.scene
    vrmRoot.updateWorldMatrix(true, true)

    // Move root so hips aligns with hips tracker
    try {
      if (bones.hips) {
        const hipsTracker = trackers.value.find(t => t.key === 'hips')
        const tHips = hipsTracker?.mesh?.position
        if (tHips) {
          const worldHips = bones.hips.getWorldPosition(new THREE.Vector3())
          const delta = tHips.clone().sub(worldHips)
          vrmRoot.position.add(delta)
          vrmRoot.updateMatrixWorld(true)
        }
      }
    } catch {}

    // Apply hips tracker rotation directly to hips bone (drives whole body orientation)
    try {
      if (bones.hips) {
        applyTrackerRotationToBone(bones.hips, 'hips', { weight: 0.9 })
      }
    } catch {}

    // Chest/Head aim
    try {
      const chestTrackerEnabled = trackerIsIndividuallyEnabled('chest')
      const chestT = chestTrackerEnabled ? trackers.value.find(t => t.key === 'chest')?.mesh.position : null
      if (bones.spine && chestT) {
        const p = bones.spine.getWorldPosition(new THREE.Vector3())
        const dir = chestT.clone().sub(p)
        rotateBoneToward(bones.spine, dir, 0.5)
      }
      const headTrackerEnabled = trackerIsIndividuallyEnabled('head')
      const headT = headTrackerEnabled ? trackers.value.find(t => t.key === 'head')?.mesh.position : null
      const neckBase = bones.neck || bones.head || bones.spine
      if (neckBase && headT) {
        const p = neckBase.getWorldPosition(new THREE.Vector3())
        const dir = headT.clone().sub(p)
        rotateBoneToward(neckBase, dir, 0.6)
      }
    } catch {}

    try {
      if (bones.spine) {
        applyTrackerRotationToBone(bones.spine, 'chest', { weight: 0.6 })
      }
      const headBone = bones.head || bones.neck
      if (headBone) {
        applyTrackerRotationToBone(headBone, 'head', { weight: 0.85 })
      }
    } catch {}

    // Arms IK (2-bone approx)
    try {
      solveLimb(bones.leftUpperArm, bones.leftLowerArm, bones.leftHand, 'leftHand', 'leftElbow')
      solveLimb(bones.rightUpperArm, bones.rightLowerArm, bones.rightHand, 'rightHand', 'rightElbow')
      // 手首の回転を適用
      if (bones.leftHand) {
        applyTrackerRotationToBone(bones.leftHand, 'leftHand', { weight: 0.85 })
      }
      if (bones.rightHand) {
        applyTrackerRotationToBone(bones.rightHand, 'rightHand', { weight: 0.85 })
      }
    } catch {}
    // Legs IK
    try {
      solveLimb(bones.leftUpperLeg, bones.leftLowerLeg, bones.leftFoot, 'leftFoot', 'leftKnee')
      solveLimb(bones.rightUpperLeg, bones.rightLowerLeg, bones.rightFoot, 'rightFoot', 'rightKnee')
      // 足首の回転を適用
      if (bones.leftFoot) {
        applyTrackerRotationToBone(bones.leftFoot, 'leftFoot', { weight: 0.85 })
      }
      if (bones.rightFoot) {
        applyTrackerRotationToBone(bones.rightFoot, 'rightFoot', { weight: 0.85 })
      }
    } catch {}

    vrmRoot.updateMatrixWorld(true, true)
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
    // モデル変更時にトラッカー回転オフセットをクリア
    const model = getActiveModel()
    if (model) {
      trackerRotationOffsets.delete(model)
    }
    if (!enabled.value) return
    createGizmos()
    layoutDefaultPositions({ force: true })
    setVisibility(true)
  })

  function init() {
    // Respect current enabled state and existing model on init
    attachEvents()
    const modelPresent = !!getActiveModel()?.vrm
    if (enabled.value && modelPresent) {
      createGizmos()
      layoutDefaultPositions({ force: true })
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

  function updateRotationRingGeometry(ring) {
    if (!ring) return
    try { ring.geometry?.dispose?.() } catch {}
    const radius = currentDotSize() * 2.4
    const inner = Math.max(radius * 0.82, radius - 0.01)
    ring.geometry = markRaw(new THREE.RingGeometry(inner, radius, 48))
  }

  function createRotationRing(color) {
    const material = new THREE.MeshBasicMaterial({
      color,
      opacity: 0.35,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false
    })
    const mesh = new THREE.Mesh(undefined, material)
    mesh.name = 'vt:rotationRing'
    mesh.renderOrder = 997
    mesh.visible = false
    mesh.userData.__vtRing = true
    updateRotationRingGeometry(mesh)
    mesh.quaternion.copy(rotationRingBaseQuat)
    return mesh
  }

  function updateViewAlignedIndicators(entry) {
    const mesh = entry?.mesh
    const cam = camera?.value
    if (!mesh || !cam) return
    try {
      mesh.getWorldQuaternion(rotationRingTmpQuatA)
      cam.getWorldQuaternion(rotationRingTmpQuatB)
      dragTmpQuatA.copy(rotationRingTmpQuatA).invert()
      dragTmpQuatA.multiply(rotationRingTmpQuatB)
      dragTmpQuatB.copy(rotationRingBaseQuat)
      dragTmpQuatA.multiply(dragTmpQuatB)
      const ring = entry.rotationRing
      if (ring) {
        ring.quaternion.copy(dragTmpQuatA)
        cam.getWorldPosition(rotationRingTmpVec)
        mesh.getWorldPosition(rotationRingTmpVec2)
        const dist = rotationRingTmpVec.distanceTo(rotationRingTmpVec2) || 1
        const ringScale = Math.max(0.5, Math.min(4, dist * 0.04))
        ring.scale.setScalar(ringScale)
      }
    } catch {}
  }

  // react to external controls
  watch(trackerDotSize, () => {
    if (!group.value) return
    const s = currentDotSize()
    trackers.value.forEach(t => {
      const mesh = t.mesh
      if (!mesh) return
      if (mesh.userData?.isCamera) {
        try { mesh.geometry?.dispose?.() } catch {}
        const baseSize = s
        const cone = new THREE.ConeGeometry(baseSize * 1.6, baseSize * 3.2, 24)
        cone.rotateX(Math.PI / 2)
        mesh.geometry = markRaw(cone)
      } else {
        try { mesh.geometry?.dispose?.() } catch {}
        mesh.geometry = markRaw(new THREE.SphereGeometry(s, 16, 16))
        mesh.renderOrder = 998
      }
      if (mesh.material) {
        mesh.material.depthTest = false
        mesh.material.depthWrite = false
      }
      if (t.rotationRing) {
        updateRotationRingGeometry(t.rotationRing)
      }
    })
  })
  watch(trackerLabelScale, () => {
    const sc = currentLabelScale()
    trackers.value.forEach(t => {
      if (!t?.labelSprite) return
      const l = t.labelSprite
      const base = l.userData.baseScale || l.scale.clone().divideScalar(currentLabelScale())
      l.userData.baseScale = base
      l.scale.copy(base.clone().multiplyScalar(sc))
    })
  })
  watch(showTrackerLabels, () => {
    const vis = labelsVisible()
    trackers.value.forEach(t => { if (t.labelSprite) t.labelSprite.visible = vis && t.mesh.visible })
  })
  watch(displayVisible, () => {
    setVisibility(enabled.value)
  })

  function getTrackerSnapshot(key) {
    if (key === CAMERA_TRACKER_KEY) return null
    const tracker = trackers.value.find(t => t.key === key)
    if (!tracker?.mesh) return null
    const state = ensureTrackerState(key)
    const position = tracker.mesh.position.toArray([])
    const rotation = tracker.mesh.quaternion.toArray([])
    const angles = state?.angles
      ? { x: sanitizeAngleInput(state.angles.x), y: sanitizeAngleInput(state.angles.y), z: sanitizeAngleInput(state.angles.z) }
      : { x: 0, y: 0, z: 0 }
    return {
      key,
      label: tracker.name || key,
      position,
      rotation,
      angles,
      order: state?.order || DEFAULT_ROTATION_ORDER,
      enabled: state?.enabled !== false
    }
  }

  return {
    enabled,
    displayVisible,
    trackerStates,
    trackers,
    lastActiveTrackerKey: lastActiveKey,
    init,
    cleanup,
    setEnabled,
    setDisplayVisible,
    setTrackerEnabled,
    setTrackerRotationDegrees,
    setTrackerRotationOrder,
    setTrackerPosition,
    syncTrackerStateFromMesh,
    resetTrackerRotation,
    resetAllTrackerRotations,
    reset,
    update,
    getCameraState,
    saveCameraState,
    saveCameraStateFromObject,
    getTrackerSnapshot,
  rotationOrders: TRACKER_ROTATION_ORDERS,
  persistTrackerTransforms,
    // Force rebuild API for resilience
    rebuild: () => { createGizmos(); layoutDefaultPositions({ force: true }); setVisibility(enabled.value) }
  }
}
