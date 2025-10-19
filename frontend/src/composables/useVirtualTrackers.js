import { ref, watch, markRaw, reactive } from 'vue'
import * as THREE from 'three'

// VRChat-like trackers + upper arms and gaze
// head, chest, hips, L/R upperArm, L/R hand, L/R elbow, L/R foot, L/R knee, gaze
// すべて異なる色に変更し、四足は似た色グループに
export const TRACKER_DEFS = [
  { key: 'head', label: 'Head', color: 0x3aa6ff },           // 青
  { key: 'chest', label: 'Chest', color: 0x00c853 },         // 緑
  { key: 'hips', label: 'Hips', color: 0xff7043 },           // オレンジ
  { key: 'leftUpperArm', label: 'L Upper Arm', color: 0x1e88e5 },  // 濃い青
  { key: 'rightUpperArm', label: 'R Upper Arm', color: 0xe53935 }, // 濃い赤
  { key: 'leftHand', label: 'L Hand', color: 0x2979ff },     // 明るい青
  { key: 'rightHand', label: 'R Hand', color: 0xff1744 },    // 明るい赤
  { key: 'leftElbow', label: 'L Elbow', color: 0x1565c0 },   // 中間青
  { key: 'rightElbow', label: 'R Elbow', color: 0xd50000 },  // 中間赤
  // 四足グループ - 似た色（緑青系）
  { key: 'leftFoot', label: 'L Foot', color: 0x009688 },     // ティール
  { key: 'rightFoot', label: 'R Foot', color: 0x00796b },    // ダークティール
  { key: 'leftKnee', label: 'L Knee', color: 0x26a69a },     // ライトティール
  { key: 'rightKnee', label: 'R Knee', color: 0x004d40 },    // 最濃ティール
  { key: 'gaze', label: 'Gaze Target', color: 0xffeb3b }     // 黄色
]

export const TRACKER_ROTATION_ORDERS = ['XYZ', 'XZY', 'YXZ', 'YZX', 'ZXY', 'ZYX']

// 回転軸の設定（デフォルトは+Z）
export const ROTATION_AXIS_OPTIONS = [
  { value: '+X', label: '+X' },
  { value: '-X', label: '-X' },
  { value: '+Y', label: '+Y' },
  { value: '-Y', label: '-Y' },
  { value: '+Z', label: '+Z' },
  { value: '-Z', label: '-Z' }
]

export const DEFAULT_ROTATION_AXIS = '+Z'

export const TRACKER_ROTATION_AXES = ROTATION_AXIS_OPTIONS.map(option => option.value)

function toColorHex(value, fallback = '#5c8cff') {
  if (typeof value === 'string' && value.trim()) {
    return value.trim().startsWith('#') ? value.trim() : `#${value.trim()}`
  }
  if (Number.isFinite(value)) {
    const clamped = Math.max(0, Math.min(0xffffff, Math.floor(value)))
    return `#${clamped.toString(16).padStart(6, '0')}`
  }
  return fallback
}

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

const TRACKER_KEY_SEPARATOR = '@'

function makeTrackerKey(baseKey, modelIndex) {
  if (!baseKey) return baseKey
  const idx = Number(modelIndex) || 1
  return idx <= 1 ? baseKey : `${baseKey}${TRACKER_KEY_SEPARATOR}${idx}`
}

function parseTrackerKey(key) {
  if (typeof key !== 'string') {
    return { baseKey: key, modelIndex: 1 }
  }
  const sepIndex = key.lastIndexOf(TRACKER_KEY_SEPARATOR)
  if (sepIndex > 0) {
    const baseKey = key.slice(0, sepIndex)
    const suffix = Number(key.slice(sepIndex + 1))
    if (Number.isFinite(suffix) && suffix >= 1) {
      return { baseKey, modelIndex: suffix }
    }
  }
  return { baseKey: key, modelIndex: 1 }
}

function trackerBaseKey(key) {
  return parseTrackerKey(key).baseKey
}

function trackerModelIndex(key) {
  return parseTrackerKey(key).modelIndex
}

function formatTrackerLabel(baseLabel, modelIndex, modelCount) {
  const idx = Number(modelIndex) || 1
  const count = Number(modelCount) || 1
  // モデルが1体だけの場合は番号なし、複数の場合は番号を表示
  if (count <= 1) {
    return baseLabel
  }
  return `${baseLabel} ${idx}`
}

/**
 * 角度を-180~180度の範囲に正規化
 */
function normalizeAngle(degrees) {
  let angle = degrees % 360
  if (angle > 180) angle -= 360
  if (angle < -180) angle += 360
  return angle
}

/**
 * Quaternionからオイラー角（度）を取得し、-180~180に正規化
 */
function getEulerAnglesFromQuaternion(quaternion, order = 'YXZ') {
  const euler = new THREE.Euler().setFromQuaternion(quaternion, order)
  return {
    x: normalizeAngle(euler.x * RAD2DEG),
    y: normalizeAngle(euler.y * RAD2DEG),
    z: normalizeAngle(euler.z * RAD2DEG)
  }
}

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

  const handTranslationLocks = {
    leftHand: { active: false, relative: new THREE.Quaternion() },
    rightHand: { active: false, relative: new THREE.Quaternion() }
  }
  const lockTmpQuatA = new THREE.Quaternion()
  const lockTmpQuatB = new THREE.Quaternion()
  // Forearm (lower arm) vs wrist roll (twist) share. Default: 70% forearm, 30% wrist.
  let forearmTwistShareRatio = 0.7
  let rotationAxesGlobalVisible = false
  let trackerAxesLengthState = 0.05

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
    startPosition: new THREE.Vector3(),
    startAngles: { x: 0, y: 0, z: 0 },
    rotationRing: null,
  didMove: false,
  translationLockKey: null,
    // ビューポート固定軸での回転用
    viewBasisX: new THREE.Vector3(),
    viewBasisY: new THREE.Vector3(),
    viewBasisZ: new THREE.Vector3()
  }

  const lastActiveKey = ref(null)
  const selectedTrackerKey = ref(null)
  let draggingKey = null

  

  function handLockForKey(trackerKey) {
    if (trackerKey === 'leftHand') return handTranslationLocks.leftHand
    if (trackerKey === 'rightHand') return handTranslationLocks.rightHand
    return null
  }

  function activateHandTranslationLock(trackerKey) {
    const lock = handLockForKey(trackerKey)
    if (!lock) return
    const model = getActiveModel()
    if (!model) {
      lock.active = false
      return
    }
    const bones = ensureBoneMap(model)
    const shoulder = trackerKey === 'leftHand' ? bones.leftShoulder : bones.rightShoulder
    const upper = trackerKey === 'leftHand' ? bones.leftUpperArm : bones.rightUpperArm
    const lower = trackerKey === 'leftHand' ? bones.leftLowerArm : bones.rightLowerArm
    const hand = trackerKey === 'leftHand' ? bones.leftHand : bones.rightHand
    
    if (!shoulder || !upper || !lower || !hand) {
      lock.active = false
      return
    }
    
    try {
      // 全ての関節のワールド変換を更新
      shoulder.updateMatrixWorld(true, true)
      upper.updateMatrixWorld(true, true)
      lower.updateMatrixWorld(true, true)
      hand.updateMatrixWorld(true, true)
      
      // 前腕から手首への相対回転を保存
      const lowerWorldQ = lower.getWorldQuaternion(lockTmpQuatA)
      const handWorldQ = hand.getWorldQuaternion(lockTmpQuatB)
      lock.relative.copy(lowerWorldQ.clone().invert().multiply(handWorldQ))
      
      // 肩から見た手首の方向ベクトルも保存（手首の姿勢を保持するため）
      const shoulderPos = shoulder.getWorldPosition(new THREE.Vector3())
      const handPos = hand.getWorldPosition(new THREE.Vector3())
      const shoulderToHand = handPos.clone().sub(shoulderPos).normalize()
      
      // 手首のワールド向き（Forward方向）を保存
      const handForward = new THREE.Vector3(0, 0, 1).applyQuaternion(handWorldQ)
      
      // 追加情報を保存
      lock.shoulderToHandDirection = shoulderToHand
      lock.handForwardDirection = handForward
      
      lock.active = true
    } catch {
      lock.active = false
    }
  }

  function releaseHandTranslationLock(trackerKey) {
    const lock = handLockForKey(trackerKey)
    if (!lock) return
    lock.active = false
  }

  function markActiveKey(key) {
    if (!key) return
    lastActiveKey.value = key
    selectedTrackerKey.value = key
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
      angles: { x: 0, y: 0, z: 0 },
      axisScale: { x: 1, y: 1, z: 1 },
      rotationAxis: DEFAULT_ROTATION_AXIS
    }
  }

  function ensureTrackerState(key) {
    if (!key) return null
    let state = trackerStates[key]
    if (!state) {
      const { baseKey, modelIndex } = parseTrackerKey(key)
      const def = TRACKER_DEFS.find(d => d.key === baseKey)
      if (!def) return null
      const modelCount = Math.max(1, Array.isArray(models?.value) ? models.value.length : 1)
      const defaults = createDefaultTrackerState(def)
      state = {
        ...defaults,
        key,
        label: formatTrackerLabel(def.label, modelIndex, modelCount)
      }
      trackerStates[key] = state
    } else {
      state.key = key
      if (typeof state.label !== 'string') {
        const { baseKey, modelIndex } = parseTrackerKey(key)
        const def = TRACKER_DEFS.find(d => d.key === baseKey)
        const modelCount = Math.max(1, Array.isArray(models?.value) ? models.value.length : 1)
        state.label = formatTrackerLabel(def?.label || baseKey, modelIndex, modelCount)
      }
    }
    if (!state.angles) state.angles = { x: 0, y: 0, z: 0 }
    if (!state.axisScale) state.axisScale = { x: 1, y: 1, z: 1 }
    state.order = normalizeOrder(state.order)
    return state
  }

  for (const def of TRACKER_DEFS) {
    const defaults = createDefaultTrackerState(def)
    const modelCount = Math.max(1, Array.isArray(models?.value) ? models.value.length : 1)
    defaults.label = formatTrackerLabel(def.label, 1, modelCount)
    trackerStates[def.key] = defaults
  }

  // Track previous model state for proper enable/disable management
  let previousModelCount = 0
  let userWantsTrackers = false

  // Watch models: manage tracker enable/disable based on model loading
  watch(models, (newModels, oldModels) => {
    const currentCount = Array.isArray(newModels) ? newModels.length : 0
    const previousCount = Array.isArray(oldModels) ? oldModels.length : 0
    
    console.log(`[watch(models)] Model count changed: ${previousCount} -> ${currentCount}, enabled=${enabled.value}`)
    console.log(`[watch(models)] Models state:`, {
      currentCount,
      previousCount,
      enabled: enabled.value,
      trackersCount: trackers.value.length,
      hasGroup: !!group.value,
      hasScene: !!scene.value
    })
    
    // Models were removed (went to 0)
    if (currentCount === 0 && previousCount > 0) {
      // Force disable when all models removed
      if (enabled.value) {
        userWantsTrackers = true // Remember user wanted trackers
        enabled.value = false
      }
    }
    // Models were added (went from 0 to some)
    else if (currentCount > 0 && previousCount === 0) {
      // Re-enable if user wanted trackers before
      if (userWantsTrackers) {
        enabled.value = true
        userWantsTrackers = false
      }
    }
    // Model reload (count changed but not to/from 0)
    else if (currentCount !== previousCount) {
      // 2つ目以降のモデルが追加された場合、トラッカーを再作成
      if (enabled.value && currentCount > previousCount) {
        console.log(`[watch(models)] Model added (${previousCount} -> ${currentCount}), recreating trackers...`)
        console.log(`[watch(models)] Before createGizmos: trackers.value.length=${trackers.value.length}`)
        // モデルが追加されたので、トラッカーを再作成
        createGizmos()
        console.log(`[watch(models)] After createGizmos: trackers.value.length=${trackers.value.length}`)
        // force: false を使用して保存された位置を優先
        setTimeout(() => {
          layoutDefaultPositions({ force: false })
          console.log(`[watch(models)] After layoutDefaultPositions: trackers.value.length=${trackers.value.length}`)
        }, 100)
      } else if (enabled.value && currentCount > 0) {
        console.log(`[watch(models)] Model count changed (${previousCount} -> ${currentCount}), updating positions...`)
        // Just update tracker positions, don't change enabled state
        // Reinitialize tracker positions for new models
        // force: false を使用して保存された位置を優先
        setTimeout(() => {
          layoutDefaultPositions({ force: false })
        }, 100)
      } else if (!enabled.value) {
        console.log(`[watch(models)] Model count changed but trackers are disabled. enabled=${enabled.value}`)
        console.log(`[watch(models)] User needs to manually enable trackers for multi-model support`)
      }
    }
    
    previousModelCount = currentCount
  }, { immediate: false })

  // Initial check: disable trackers if no models on mount
  watch(() => models?.value?.length || 0, (count) => {
    if (count === 0 && enabled.value) {
      enabled.value = false
    }
  }, { immediate: true })

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
    
    // Quaternionからオイラー角を取得し、-180~180度に正規化
    const normalizedAngles = getEulerAnglesFromQuaternion(tracker.mesh.quaternion, order)
    
    const angles = state.angles || (state.angles = { x: 0, y: 0, z: 0 })
    angles.x = normalizedAngles.x
    angles.y = normalizedAngles.y
    angles.z = normalizedAngles.z
  }

  function trackerIsIndividuallyEnabled(key) {
    if (key === CAMERA_TRACKER_KEY) return false
    const state = trackerStates[key]
    if (!state) return true // デフォルトは有効
    return state.enabled !== false
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
      const def = TRACKER_DEFS.find(d => d.key === tracker.key)
      // 保存時は UI で変更された現在のマテリアル色を優先して保存する
      let colorHex = (def?.color ?? 0xffffff)
      try { if (mesh?.material?.color) colorHex = mesh.material.color.getHex() } catch {}
      const entry = {
        space: 'local',
        position: trackerLocalPos.toArray([]),
        rotation: mesh.quaternion.toArray([]),
        order: state?.order || DEFAULT_ROTATION_ORDER,
        rotationAxis: state?.rotationAxis || DEFAULT_ROTATION_AXIS,
        enabled: state?.enabled !== false,
        color: colorHex // トラッカーの色を保存
      }
      if (state?.angles) {
        entry.angles = {
          x: sanitizeAngleInput(state.angles.x),
          y: sanitizeAngleInput(state.angles.y),
          z: sanitizeAngleInput(state.angles.z)
        }
      }
      if (state?.axisScale) {
        entry.axisScale = {
          x: toFiniteNumber(state.axisScale.x, 1),
          y: toFiniteNumber(state.axisScale.y, 1),
          z: toFiniteNumber(state.axisScale.z, 1)
        }
      }
      payload[tracker.key] = entry
    }
    
    // ボーンの姿勢（回転オフセット）も保存
    const offsetMap = trackerRotationOffsets.get(model)
    if (offsetMap && offsetMap.size > 0) {
      const boneOffsetsData = {}
      offsetMap.forEach((quat, key) => {
        boneOffsetsData[key] = quat.toArray([])
      })
      payload.__boneRotationOffsets = boneOffsetsData
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
    if (!model) return 'model'
    if (model.id != null) return `id:${model.id}`
    const uuid = model?.vrm?.scene?.uuid || model?.vrm?.scene?.id
    if (uuid) return `uuid:${uuid}`
    return model.name || model?.vrm?.scene?.name || 'model'
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
    console.log(`[createGizmos] START - models.value:`, models?.value?.length, 'enabled:', enabled.value, 'scene:', !!scene.value)
    
    // If a group exists but isn't in the scene or trackers list is incomplete, rebuild
    if (group.value) {
      const inScene = !!scene.value && scene.value.children.includes(group.value)
      // モデル数に応じてトラッカー数を計算
      const modelCount = Math.max(1, Array.isArray(models?.value) ? models.value.length : 1)
      const expectedTrackerCount = TRACKER_DEFS.length * modelCount
      const complete = trackers.value.length === expectedTrackerCount
      console.log(`[createGizmos] Check: models.value.length=${models?.value?.length}, modelCount=${modelCount}, expectedTrackerCount=${expectedTrackerCount}, actual=${trackers.value.length}, complete=${complete}, inScene=${inScene}`)
      if (inScene && complete) {
        console.log(`[createGizmos] Already complete and in scene, skipping`)
        return
      }
      // stale or incomplete -> dispose and recreate
      console.log(`[createGizmos] Disposing existing trackers - inScene:${inScene}, complete:${complete}`)
      disposeGizmos()
    }
    
    if (!scene.value) {
      console.error(`[createGizmos] ERROR: scene is not available`)
      return
    }
    
    group.value = markRaw(new THREE.Group())
    group.value.name = 'VirtualTrackers'
    scene.value.add(group.value)
    const sphere = markRaw(new THREE.SphereGeometry(currentDotSize(), 16, 16))
    
    // モデル数に応じてトラッカーを作成
    const modelCount = Math.max(1, Array.isArray(models?.value) ? models.value.length : 1)
    console.log(`[createGizmos] Creating trackers: models.value=${Array.isArray(models?.value) ? models.value.length : 'not-array'}, modelCount=${modelCount}, TRACKER_DEFS.length=${TRACKER_DEFS.length}`)
    console.log(`[createGizmos] Will create ${modelCount * TRACKER_DEFS.length} trackers (${modelCount} models × ${TRACKER_DEFS.length} tracker types)`)
    
    for (let modelIdx = 1; modelIdx <= modelCount; modelIdx++) {
      console.log(`[createGizmos] Creating trackers for model ${modelIdx}/${modelCount}...`)
      for (const def of TRACKER_DEFS) {
        const isCamera = def.key === CAMERA_TRACKER_KEY
        const trackerKey = makeTrackerKey(def.key, modelIdx)
        const trackerLabel = formatTrackerLabel(def.label, modelIdx, modelCount)
        
        console.log(`[createGizmos] Model ${modelIdx}/${modelCount}: Creating tracker "${trackerKey}" with label "${trackerLabel}"`)
        
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
        mesh.name = `vt:${trackerKey}`
        mesh.userData.__vt = true
        mesh.userData.isCamera = isCamera
        // start hidden
        mesh.visible = false
        const sprite = markRaw(createLabelSprite(trackerLabel))
        sprite.position.set(0, isCamera ? 0.45 : 0.15, 0)
        sprite.visible = labelsVisible()
        // capture base size to allow absolute scaling later
        sprite.userData.baseScale = sprite.scale.clone()
        sprite.scale.copy(sprite.userData.baseScale.clone().multiplyScalar(currentLabelScale()))
        let rotationRing = null
        let rotationAxes = null
        if (!isCamera) {
          rotationRing = markRaw(createRotationRing(def.color))
          if (rotationRing) mesh.add(rotationRing)
          rotationAxes = markRaw(createRotationAxesHelper(trackerAxesLengthState || 0.05))
          if (rotationAxes) {
            rotationAxes.visible = rotationAxesGlobalVisible
            mesh.add(rotationAxes)
          }
        }
        mesh.add(sprite)
        group.value.add(mesh)
        // camera tracker disabled
        const initialColor = toColorHex(def.color)
        trackers.value.push({
          key: trackerKey,
          name: trackerLabel,
          mesh,
          labelSprite: sprite,
          rotationRing,
          rotationAxes,
          color: initialColor
        })
        ensureTrackerState(trackerKey)
        applyTrackerStateToMesh(trackerKey)
      }
    }
    
    console.log(`[createGizmos] COMPLETE - Created ${trackers.value.length} trackers`)
    console.log(`[createGizmos] Tracker keys:`, trackers.value.map(t => t.key))
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
    const newValue = !!v
    console.log(`[setEnabled] Setting enabled from ${enabled.value} to ${newValue}`)
    console.log(`[setEnabled] Current state:`, {
      modelsCount: Array.isArray(models?.value) ? models.value.length : 0,
      trackersCount: trackers.value.length,
      hasGroup: !!group.value,
      hasScene: !!scene.value
    })
    
    enabled.value = newValue
    if (enabled.value) {
      console.log(`[setEnabled] Enabling trackers - calling createGizmos()`)
      createGizmos()
      console.log(`[setEnabled] After createGizmos: trackers.value.length=${trackers.value.length}`)
      layoutDefaultPositions()
      console.log(`[setEnabled] After layoutDefaultPositions: trackers.value.length=${trackers.value.length}`)
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
      if (t.rotationAxes) {
        t.rotationAxes.visible = rotationAxesGlobalVisible && meshVisible
      }
    }
  }

  function reset() {
    try {
      const model = getActiveModel()
      if (model) {
        setSavedPositions(model, null)
        // トラッカー回転オフセットもクリア
        trackerRotationOffsets.delete(model)
        // 初期ポーズキャッシュは保持して、初期位置に戻れるようにする
        // initialWorldPose.delete(model) は削除しない
      }
    } catch {}
    setSavedCameraTransform(null)
    for (const def of TRACKER_DEFS) resetTrackerStateToDefault(def.key)
    // 初期ポーズを再キャプチャしてから、初期位置にレイアウト
    const model = getActiveModel()
    if (model) {
      initialWorldPose.delete(model)
      captureInitialWorldPose(model)
    }
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
      const lUpperArm = getBone(vrm, 'leftUpperArm')
      const rUpperArm = getBone(vrm, 'rightUpperArm')
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
            
            // 有効/無効状態の復元
            if (typeof savedEntry.enabled === 'boolean' && state) {
              state.enabled = savedEntry.enabled
            }
            
            // 色の復元（メッシュのマテリアルカラーを更新）
            if (typeof savedEntry.color === 'number' && t.mesh?.material) {
              try {
                t.mesh.material.color.setHex(savedEntry.color)
                t.color = toColorHex(savedEntry.color, t.color)
              } catch {}
            } else if (typeof savedEntry.color === 'string') {
              t.color = toColorHex(savedEntry.color, t.color)
              try { t.mesh?.material?.color?.setStyle?.(t.color) } catch {}
            }
            
            // 軸スケールの復元
            if (savedEntry.axisScale && typeof savedEntry.axisScale === 'object' && state) {
              if (!state.axisScale) state.axisScale = { x: 1, y: 1, z: 1 }
              if (typeof savedEntry.axisScale.x === 'number') state.axisScale.x = savedEntry.axisScale.x
              if (typeof savedEntry.axisScale.y === 'number') state.axisScale.y = savedEntry.axisScale.y
              if (typeof savedEntry.axisScale.z === 'number') state.axisScale.z = savedEntry.axisScale.z
            }
            
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
        if (force || !usedSaved) t.mesh.position.copy(m)
        syncTrackerStateFromMesh(key)
      }
      
      // ボーンの回転オフセットを復元
      if (saved?.__boneRotationOffsets && typeof saved.__boneRotationOffsets === 'object') {
        const offsetMap = new Map()
        Object.entries(saved.__boneRotationOffsets).forEach(([key, quatArray]) => {
          if (Array.isArray(quatArray) && quatArray.length === 4) {
            const quat = new THREE.Quaternion().fromArray(quatArray)
            offsetMap.set(key, quat)
          }
        })
        if (offsetMap.size > 0) {
          trackerRotationOffsets.set(model, offsetMap)
        }
      }

      setFrom('hips', hips)
      setFrom('chest', chest)
      // 頭のトラッカーはボーン位置そのままに設定（オフセットなし）
      setFrom('head', head, new THREE.Vector3(0, 0, 0))
      setFrom('leftUpperArm', lUpperArm)
      setFrom('rightUpperArm', rUpperArm)
      setFrom('leftElbow', lElbow)
      setFrom('rightElbow', rElbow)
      setFrom('leftHand', lHand, new THREE.Vector3(0.05, 0, 0))
      setFrom('rightHand', rHand, new THREE.Vector3(-0.05, 0, 0))
      setFrom('leftKnee', lKnee)
      setFrom('rightKnee', rKnee)
      setFrom('leftFoot', lFoot)
      setFrom('rightFoot', rFoot)
      // Gaze target: positioned in front of the head
      const gazeTracker = trackers.value.find(x => x.key === 'gaze')
      if (gazeTracker && head) {
        const savedGaze = saved?.['gaze']
        if (!savedGaze || force) {
          head.updateWorldMatrix(true, false)
          const gazePos = new THREE.Vector3()
          head.getWorldPosition(gazePos)
          gazePos.z -= 2.0 // 2 meters in front of head
          gazeTracker.mesh.position.copy(gazePos)
          syncTrackerStateFromMesh('gaze')
        }
      }
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
      dragState.startPosition.copy(hit.position)
      dragState.didMove = false
      draggingKey = trackerKey
      
      if (trackerKey) {
        markActiveKey(trackerKey)
        notifyTrackerTransform(trackerKey, { type: 'select', source: 'drag-start', persisted: false })
      }
      try { typeof onManipulateStart === 'function' && onManipulateStart({ type: 'tracker', key: trackerKey }) } catch {}
      
      dragState.rotationRing = null
      
      if (mode === 'translate') {
        // VRChat準拠: トランスレーションロックは不要
        // 手首トラッカーの位置を直接移動するだけ
        // ビューポート基準の平行移動: カメラの right / up ベクトルを基底とし、スクリーン移動を直接位置へ反映
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

        // 回転開始時にトラッカーのローカル基底をビュー基準に整列させる
        try {
          const basisX = dragState.viewBasisX.clone().normalize()
          const basisY = new THREE.Vector3(0, 1, 0) // 世界Y固定
          const basisZ = dragState.viewBasisZ.clone().normalize()
          // Orthonormal correction: 再直交化
          basisX.sub(basisY.clone().multiplyScalar(basisX.dot(basisY))).normalize()
          const recomputedZ = new THREE.Vector3().crossVectors(basisX, basisY).normalize()
          const blendedZ = recomputedZ.clone().lerp(basisZ, 0.5).normalize()
          const fixedX = new THREE.Vector3().crossVectors(basisY, blendedZ).normalize()
          const finalZ = new THREE.Vector3().crossVectors(fixedX, basisY).normalize()
          const m = new THREE.Matrix4().makeBasis(fixedX, basisY, finalZ)
          const viewAlignedQ = new THREE.Quaternion().setFromRotationMatrix(m)
          const blended = dragState.startQuaternion.clone().slerp(viewAlignedQ, 0.65)
          hit.quaternion.copy(blended)
          hit.updateMatrixWorld(true)
          syncTrackerStateFromMesh(trackerKey)
        } catch {}
        
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
      // VRChat準拠: カメラ→トラッカーの視線ベクトルに垂直な平面上で移動
      const deltaX = dragState.pointerDelta.x
      const deltaY = dragState.pointerDelta.y
      camera.value.updateMatrixWorld(true)
      
      // カメラからトラッカーへの視線ベクトル（法線）
      const viewDirection = new THREE.Vector3()
        .subVectors(dragState.startPosition, camera.value.position)
        .normalize()
      
      // カメラの右方向（ビューポートX軸）
      const cameraRight = new THREE.Vector3(1, 0, 0)
        .applyQuaternion(camera.value.quaternion)
        .normalize()
      
      // カメラの上方向（ビューポートY軸の基準）
      const cameraUp = new THREE.Vector3(0, 1, 0)
        .applyQuaternion(camera.value.quaternion)
        .normalize()
      
      // 移動平面上のX軸 = カメラ右方向を視線ベクトルに垂直な平面へ投影
      const moveRight = cameraRight.clone()
        .sub(viewDirection.clone().multiplyScalar(cameraRight.dot(viewDirection)))
        .normalize()
      
      // 移動平面上のY軸 = カメラ上方向を視線ベクトルに垂直な平面へ投影
      const moveUp = cameraUp.clone()
        .sub(viewDirection.clone().multiplyScalar(cameraUp.dot(viewDirection)))
        .normalize()
      
      // スケール: 垂直FOV から 1 pixel あたりのワールド長 = 2 * dist * tan(fov/2) / viewportHeight
      let scale = 0.0025
      try {
        const dist = camera.value.position.distanceTo(dragState.startPosition) || 1
        const fovRad = THREE.MathUtils.degToRad(camera.value.fov || 45)
        const domRect = dom.getBoundingClientRect()
        const perPixel = (2 * dist * Math.tan(fovRad / 2)) / (domRect.height || 1)
        scale = perPixel
      } catch {}
      
      const movement = new THREE.Vector3()
        .add(moveRight.multiplyScalar(deltaX * scale))
        .add(moveUp.multiplyScalar(-deltaY * scale))
      dragState.target.position.copy(dragState.startPosition.clone().add(movement))
      dragState.didMove = true
      if (dragState.target.userData?.isCamera && camera?.value) {
        try {
          camera.value.position.copy(dragState.target.position)
          camera.value.updateMatrixWorld(true)
        } catch {}
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
      // ロール回転: トラッカー自身のローカルZ軸で回転（仕様に合わせる）
      const sensitivity = 0.5
      const deltaX = dragState.pointerDelta.x * sensitivity
      // ビュー奥行き軸（開始時 viewBasisZ）を使用し、Z軸が常に視線方向に一致する前提維持
      const worldZAxis = dragState.viewBasisZ && dragState.viewBasisZ.lengthSq() > 0
        ? dragState.viewBasisZ.clone().normalize()
        : new THREE.Vector3(0, 0, -1).applyQuaternion(camera.value.quaternion).normalize()
      const rollAngle = deltaX * DEG2RAD
      const rollQuat = new THREE.Quaternion().setFromAxisAngle(worldZAxis, rollAngle)
      const newQuat = dragState.startQuaternion.clone().premultiply(rollQuat)
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

  // トラッカー移動時のホイールによる奥行き移動 (ビューポート前後=カメラ前方方向)
  function onWheel(e) {
    if (!enabled.value) return
    if (!dragState.active || dragState.mode !== 'translate' || !dragState.target) return
    if (!camera?.value) return
    e.preventDefault()
    const delta = Math.sign(e.deltaY)
    const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.value.quaternion).normalize()
    const dist = camera.value.position.distanceTo(dragState.target.position) || 1
    const speed = Math.max(dist * 0.05, 0.02)
    dragState.target.position.add(camForward.multiplyScalar(speed * -delta))
    dragState.startPosition.copy(dragState.target.position)
    dragState.didMove = true
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
    dom.addEventListener('wheel', onWheel, { passive: false })
  }
  function detachEvents() {
    const dom = renderer.value?.domElement
    if (!dom) return
    dom.removeEventListener('pointerdown', onPointerDown)
    dom.removeEventListener('pointermove', onPointerMove)
    dom.removeEventListener('pointerup', onPointerUp)
    dom.removeEventListener('contextmenu', onContextMenu)
    dom.removeEventListener('wheel', onWheel)
  }

  function setDisplayVisible(value) {
    displayVisible.value = !!value
    setVisibility(enabled.value)
  }

  function setTrackerEnabled(key, value, { persist = true } = {}) {
    if (key === CAMERA_TRACKER_KEY) return
    const state = ensureTrackerState(key)
    if (!state) return
    state.enabled = !!value
    updateTrackerVisibility(key)
    markActiveKey(key)
    if (persist) persistTrackerTransforms()
    notifyTrackerTransform(key, {
      type: 'enabled',
      value: state.enabled,
      persisted: persist !== false
    })
  }

  function setTrackerRotationDegrees(key, angles, rotationOrder, { persist = true } = {}) {
    // Support old signature: setTrackerRotationDegrees(key, angles, { persist })
    // and new signature: setTrackerRotationDegrees(key, angles, rotationOrder, { persist })
    let options = { persist: true }
    let order = 'YXZ'
    
    if (typeof rotationOrder === 'object' && rotationOrder !== null && !Array.isArray(rotationOrder)) {
      // Old signature: third argument is options
      options = rotationOrder
      order = 'YXZ'
    } else if (typeof rotationOrder === 'string') {
      // New signature: third argument is rotation order
      order = rotationOrder
      options = arguments[3] || { persist: true }
    }
    
    if (key === CAMERA_TRACKER_KEY) return
    const state = ensureTrackerState(key)
    if (!state) return
    
    // Update rotation order
    state.order = order
    
    const target = state.angles || (state.angles = { x: 0, y: 0, z: 0 })
    if (angles && typeof angles === 'object') {
      if (angles.x !== undefined) target.x = sanitizeAngleInput(angles.x)
      if (angles.y !== undefined) target.y = sanitizeAngleInput(angles.y)
      if (angles.z !== undefined) target.z = sanitizeAngleInput(angles.z)
    }
    applyTrackerStateToMesh(key)
    markActiveKey(key)
    if (options.persist) persistTrackerTransforms()
    const snapshotAngles = {
      x: sanitizeAngleInput(state.angles?.x),
      y: sanitizeAngleInput(state.angles?.y),
      z: sanitizeAngleInput(state.angles?.z)
    }
    notifyTrackerTransform(key, {
      type: 'rotation',
      angles: snapshotAngles,
      persisted: options.persist !== false,
      source: options.persist === false ? 'transient' : 'user'
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

function setTrackerRotationAxis(key, axis) {
  if (key === CAMERA_TRACKER_KEY) return
  const state = ensureTrackerState(key)
  if (!state) return
  const normalized = typeof axis === 'string' ? axis.trim().toUpperCase() : DEFAULT_ROTATION_AXIS
  const next = ROTATION_AXIS_OPTIONS.some(option => option.value === normalized)
    ? normalized
    : DEFAULT_ROTATION_AXIS
  if (state.rotationAxis !== next) {
    state.rotationAxis = next
    markActiveKey(key)
    persistTrackerTransforms()
    notifyTrackerTransform(key, {
      type: 'rotationAxis',
      axis: next
    })
  }
}

  function setTrackerAxisScale(key, axisScale, { persist = true } = {}) {
    if (key === CAMERA_TRACKER_KEY) return
    const state = ensureTrackerState(key)
    if (!state) return
    const target = state.axisScale || (state.axisScale = { x: 1, y: 1, z: 1 })
    if (axisScale && typeof axisScale === 'object') {
      if (axisScale.x !== undefined) target.x = Math.max(0.1, Math.min(3.0, toFiniteNumber(axisScale.x, 1)))
      if (axisScale.y !== undefined) target.y = Math.max(0.1, Math.min(3.0, toFiniteNumber(axisScale.y, 1)))
      if (axisScale.z !== undefined) target.z = Math.max(0.1, Math.min(3.0, toFiniteNumber(axisScale.z, 1)))
    }
    markActiveKey(key)
    if (persist) persistTrackerTransforms()
    notifyTrackerTransform(key, {
      type: 'axisScale',
      axisScale: { ...target },
      persisted: persist !== false,
      source: persist === false ? 'transient' : 'user'
    })
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

  function resetTrackerPosition(key, { persist = true } = {}) {
    if (key === CAMERA_TRACKER_KEY) return
    const tracker = trackers.value.find(t => t.key === key)
    if (!tracker?.mesh) return
    
    // 初期位置を取得（初期ポーズから）
    const model = getActiveModel()
    const initMap = initialWorldPose.get(model)
    const { baseKey } = parseTrackerKey(key)
    
    // 初期ポーズが記録されている場合のみ、その位置に戻る
    if (initMap && initMap.has(baseKey)) {
      const entry = initMap.get(baseKey)
      if (entry?.position) {
        // 初期位置を適用
        tracker.mesh.position.copy(entry.position)
        tracker.mesh.updateMatrixWorld(true)
        syncTrackerStateFromMesh(key)
        
        markActiveKey(key)
        if (persist) persistTrackerTransforms()
        notifyTrackerTransform(key, {
          type: 'position',
          position: [tracker.mesh.position.x, tracker.mesh.position.y, tracker.mesh.position.z],
          persisted: persist !== false,
          source: 'reset'
        })
      }
    } else {
      console.warn(`[resetTrackerPosition] No initial pose recorded for tracker "${key}". Reset skipped.`)
    }
  }

  function resetTrackerRotation(key, { keepEnabled = true, persist = true } = {}) {
    if (key === CAMERA_TRACKER_KEY) return
    const tracker = trackers.value.find(t => t.key === key)
    const state = ensureTrackerState(key)
    if (!tracker?.mesh || !state) return
    
    // 初期回転を取得（初期ポーズから）
    const model = getActiveModel()
    const initMap = initialWorldPose.get(model)
    const { baseKey } = parseTrackerKey(key)
    
    // 初期ポーズが記録されている場合のみ、その回転に戻る
    if (initMap && initMap.has(baseKey)) {
      const entry = initMap.get(baseKey)
      if (entry?.quaternion) {
        // 初期回転を適用
        tracker.mesh.quaternion.copy(entry.quaternion)
        tracker.mesh.updateMatrixWorld(true)
        syncTrackerStateFromMesh(key)
      } else {
        // フォールバック: ゼロ回転
        resetTrackerStateToDefault(key, { keepEnabled })
      }
    } else {
      // 初期ポーズがない場合はゼロ回転
      console.warn(`[resetTrackerRotation] No initial pose recorded for tracker "${key}". Using zero rotation.`)
      resetTrackerStateToDefault(key, { keepEnabled })
    }
    
    markActiveKey(key)
    if (persist) persistTrackerTransforms()
    const snapshotAngles = {
      x: sanitizeAngleInput(state.angles?.x || 0),
      y: sanitizeAngleInput(state.angles?.y || 0),
      z: sanitizeAngleInput(state.angles?.z || 0)
    }
    notifyTrackerTransform(key, {
      type: 'rotation',
      angles: snapshotAngles,
      persisted: persist !== false,
      source: 'reset'
    })
  }

  function resetAllTrackerRotations({ keepEnabled = true, persist = true } = {}) {
    // すべてのトラッカーを初期回転に戻す（初期ポーズは再キャプチャしない）
    for (const def of TRACKER_DEFS) {
      resetTrackerRotation(def.key, { keepEnabled, persist: false })
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
      leftShoulder: getBone(vrm, 'leftShoulder'),
      rightShoulder: getBone(vrm, 'rightShoulder'),
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
      rightFoot: getBone(vrm, 'rightFoot'),
      leftEye: getBone(vrm, 'leftEye'),
      rightEye: getBone(vrm, 'rightEye')
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

  function applyHandTranslationConstraint(lower, hand, lockState, trackerKey) {
    if (!lockState?.active || !lockState.relative || !lower || !hand) return false
    
    try {
      lower.updateWorldMatrix(true, false)
      hand.updateWorldMatrix(true, false)
      
      // 基本: 前腕から手首への相対回転を保持
      const lowerWorldQ = lower.getWorldQuaternion(lockTmpQuatA)
      const desiredHandWorldQ = lowerWorldQ.clone().multiply(lockState.relative)
      
      // 追加: 保存された手首の向きを使って、腕全体の向きを調整
      if (lockState.shoulderToHandDirection && lockState.handForwardDirection) {
        const model = getActiveModel()
        const bones = ensureBoneMap(model)
        const shoulder = trackerKey === 'leftHand' ? bones.leftShoulder : bones.rightShoulder
        
        if (shoulder) {
          shoulder.updateWorldMatrix(true, false)
          const shoulderPos = shoulder.getWorldPosition(new THREE.Vector3())
          const handPos = hand.getWorldPosition(new THREE.Vector3())
          const currentShoulderToHand = handPos.clone().sub(shoulderPos)
          
          if (currentShoulderToHand.lengthSq() > 1e-8) {
            currentShoulderToHand.normalize()
            
            // 肩から手首への方向が変わった場合、手首の向きも同じように回転させる
            const savedDir = lockState.shoulderToHandDirection
            const currentDir = currentShoulderToHand
            
            // 保存された方向から現在の方向への回転を計算
            const rotationAxis = new THREE.Vector3().crossVectors(savedDir, currentDir)
            
            if (rotationAxis.lengthSq() > 1e-8) {
              rotationAxis.normalize()
              const dotProduct = THREE.MathUtils.clamp(savedDir.dot(currentDir), -1, 1)
              const angle = Math.acos(dotProduct)
              
              // 手首の向きを同じ回転量だけ回転
              const armRotation = new THREE.Quaternion().setFromAxisAngle(rotationAxis, angle)
              const rotatedHandForward = lockState.handForwardDirection.clone().applyQuaternion(armRotation)
              
              // 手首の新しいワールド回転を計算（Z軸がrotatedHandForwardを向くように）
              const currentHandForward = new THREE.Vector3(0, 0, 1).applyQuaternion(desiredHandWorldQ)
              const handRotationAxis = new THREE.Vector3().crossVectors(currentHandForward, rotatedHandForward)
              
              if (handRotationAxis.lengthSq() > 1e-8) {
                handRotationAxis.normalize()
                const handDotProduct = THREE.MathUtils.clamp(currentHandForward.dot(rotatedHandForward), -1, 1)
                const handAngle = Math.acos(handDotProduct)
                const handAdjustment = new THREE.Quaternion().setFromAxisAngle(handRotationAxis, handAngle)
                
                desiredHandWorldQ.premultiply(handAdjustment)
              }
            }
          }
        }
      }
      
      // ローカル回転に変換して適用
      const parentWorldQ = hand.parent ? hand.parent.getWorldQuaternion(lockTmpQuatB) : lockTmpQuatB.identity()
      const invParentWorldQ = parentWorldQ.clone().invert()
      const newHandLocalQ = invParentWorldQ.multiply(desiredHandWorldQ)
      hand.quaternion.copy(newHandLocalQ)
      hand.updateMatrixWorld(true)
      
      return true
    } catch (err) {
      console.warn('[applyHandTranslationConstraint] Error:', err)
      return false
    }
  }

  // ================= Hand relative orientation preservation & roll distribution helpers =================
  const initialHandRelativeQuats = new WeakMap() // model -> { left: Quaternion, right: Quaternion }

  function ensureInitialHandRelQuats(model, bones) {
    if (!model || !bones) return
    if (initialHandRelativeQuats.has(model)) return
    const record = {}
    if (bones.leftLowerArm && bones.leftHand) {
      record.left = captureLowerToHandRelative(bones.leftLowerArm, bones.leftHand)
    }
    if (bones.rightLowerArm && bones.rightHand) {
      record.right = captureLowerToHandRelative(bones.rightLowerArm, bones.rightHand)
    }
    initialHandRelativeQuats.set(model, record)
  }

  function captureLowerToHandRelative(lower, hand) {
    try {
      lower.updateWorldMatrix(true, false); hand.updateWorldMatrix(true, false)
      const lowerWorldQ = lower.getWorldQuaternion(new THREE.Quaternion())
      const handWorldQ = hand.getWorldQuaternion(new THREE.Quaternion())
      return lowerWorldQ.clone().invert().multiply(handWorldQ)
    } catch { return new THREE.Quaternion() }
  }

  function applyStoredHandRelative(lower, hand, relQ) {
    if (!relQ) return
    try {
      lower.updateWorldMatrix(true, false)
      const lowerWorldQ = lower.getWorldQuaternion(new THREE.Quaternion())
      const desiredHandWorldQ = lowerWorldQ.clone().multiply(relQ)
      const parentWorldQ = hand.parent ? hand.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion()
      const invParentWorldQ = parentWorldQ.clone().invert()
      const newLocal = invParentWorldQ.multiply(desiredHandWorldQ)
      hand.quaternion.copy(newLocal)
      hand.updateMatrixWorld(true)
    } catch {}
  }

  function extractRollAroundAxis(q, axisWorld) {
    // Extract roll component approximated by projecting axis-angle
    const normAxis = axisWorld.clone().normalize()
    // convert quaternion to axis-angle
    const qw = THREE.MathUtils.clamp(q.w, -1, 1)
    let angle = 2 * Math.acos(qw)
    let s = Math.sqrt(Math.max(0, 1 - qw * qw))
    let axis = new THREE.Vector3(1,0,0)
    if (s >= 1e-6) {
      axis.set(q.x / s, q.y / s, q.z / s)
    } else {
      angle = 0
    }
    axis.normalize()
    const sign = Math.sign(axis.dot(normAxis)) || 1
    const rollAngle = angle * Math.abs(axis.dot(normAxis)) * sign
    return { rollAngle }
  }

  // ===== VRChat-style Arm IK Implementation =====
  
  /**
   * VRChat準拠の腕IK実装
   * 手首トラッカーの位置と回転を直接使用し、2ボーンIKで肘を計算
   * 前腕のツイストは手首の回転から自動的に分配
   */
  function solveVRChatArmIK(shoulder, upperArm, lowerArm, hand, handTrackerKey, elbowTrackerKey) {
    if (!shoulder || !upperArm || !lowerArm || !hand) return
    if (!trackerIsIndividuallyEnabled(handTrackerKey)) return
    
    const handTracker = trackers.value.find(t => t.key === handTrackerKey)
    if (!handTracker?.mesh) return
    
    try {
      // 全ボーンのワールド行列を更新
      shoulder.updateWorldMatrix(true, false)
      upperArm.updateWorldMatrix(true, false)
      lowerArm.updateWorldMatrix(true, false)
      hand.updateWorldMatrix(true, false)
      handTracker.mesh.updateWorldMatrix(true, false)
      
      // 1. 基本的な位置とボーン長を取得
      const shoulderPos = shoulder.getWorldPosition(new THREE.Vector3())
      const handTargetPos = handTracker.mesh.position.clone()
      const handTargetRot = handTracker.mesh.getWorldQuaternion(new THREE.Quaternion())
      
      const upperLength = boneLength(upperArm, lowerArm)
      const lowerLength = boneLength(lowerArm, hand)
      
      // 手首トラッカーの位置を手首ボーンの末端位置に合わせるため、
      // 手首ボーンの長さを考慮して調整
      const handLength = hand.children.length > 0 
        ? hand.getWorldPosition(new THREE.Vector3()).distanceTo(
            hand.children[0].getWorldPosition(new THREE.Vector3())
          )
        : 0.05 // デフォルトの手首の長さ
      
      // 手首ボーンの開始位置（前腕の末端）がトラッカー位置になるよう調整
      // トラッカー位置から手首の方向に少し戻った位置をターゲットにする
      const handBoneDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(handTargetRot)
      const adjustedHandTargetPos = handTargetPos.clone().sub(handBoneDirection.multiplyScalar(handLength * 0.5))
      
      // 2. 肘ヒント（ポールベクトル）の位置を取得
      let elbowHintPos = null
      if (elbowTrackerKey && trackerIsIndividuallyEnabled(elbowTrackerKey)) {
        const elbowTracker = trackers.value.find(t => t.key === elbowTrackerKey)
        if (elbowTracker?.mesh) {
          elbowHintPos = elbowTracker.mesh.position.clone()
        }
      }
      
      // 肘ヒントがない場合はデフォルト方向を使用
      if (!elbowHintPos) {
        // VRChatのデフォルト: 前方やや下方向
        const isLeft = handTrackerKey === 'leftHand'
        const sideDir = isLeft ? -1 : 1
        elbowHintPos = shoulderPos.clone().add(new THREE.Vector3(sideDir * 0.3, -0.2, 0.5))
      }
      
      // 3. 2ボーンIKで肘の位置を計算（調整後の手首位置を使用）
      const elbowPos = computeElbowPos(shoulderPos, adjustedHandTargetPos, elbowHintPos, upperLength, lowerLength)
      
      // 4. 上腕ボーンの回転を計算（肩から肘への方向）
      // VRChatのIKでは、shoulderボーンは回転させず、upperArmボーンだけを回転させる
      const shoulderToElbow = elbowPos.clone().sub(shoulderPos)
      if (shoulderToElbow.lengthSq() > 1e-8) {
        shoulderToElbow.normalize()
        upperArm.updateWorldMatrix(true, false)
        rotateBoneToward(upperArm, shoulderToElbow, 1.0)
        upperArm.updateMatrixWorld(true)
      }
      
      // 5. 前腕の基本回転を計算（肘から手首への方向）
      const elbowToHand = adjustedHandTargetPos.clone().sub(elbowPos)
      if (elbowToHand.lengthSq() > 1e-8) {
        elbowToHand.normalize()
        rotateBoneToward(lowerArm, elbowToHand, 1.0)
        lowerArm.updateMatrixWorld(true)
      }
      
      // 6. 前腕のツイスト（Roll）を手首トラッカーの回転から計算
      const forearmAxis = elbowToHand.clone()
      const handTrackerUp = new THREE.Vector3(0, 1, 0).applyQuaternion(handTargetRot)
      
      // 前腕軸に垂直な平面でのUp方向を計算
      const projectedTrackerUp = handTrackerUp.clone().projectOnPlane(forearmAxis)
      
      if (projectedTrackerUp.lengthSq() > 1e-6) {
        projectedTrackerUp.normalize()
        
        // 現在の前腕のUp方向
        const currentLowerArmQ = lowerArm.getWorldQuaternion(new THREE.Quaternion())
        const currentUp = new THREE.Vector3(0, 1, 0).applyQuaternion(currentLowerArmQ)
        const projectedCurrentUp = currentUp.clone().projectOnPlane(forearmAxis)
        
        if (projectedCurrentUp.lengthSq() > 1e-6) {
          projectedCurrentUp.normalize()
          
          // ツイスト角度を計算
          const twistDot = THREE.MathUtils.clamp(projectedCurrentUp.dot(projectedTrackerUp), -1, 1)
          let twistAngle = Math.acos(twistDot)
          
          // 符号を決定
          const twistCross = new THREE.Vector3().crossVectors(projectedCurrentUp, projectedTrackerUp)
          if (twistCross.dot(forearmAxis) < 0) twistAngle = -twistAngle
          
          // ツイストを前腕と手首に分配
          const forearmTwistAngle = twistAngle * forearmTwistShareRatio
          const handTwistAngle = twistAngle * (1 - forearmTwistShareRatio)
          
          // 前腕にツイストを適用
          const forearmTwistQ = new THREE.Quaternion().setFromAxisAngle(forearmAxis, forearmTwistAngle)
          const lowerArmWorldQ = lowerArm.getWorldQuaternion(new THREE.Quaternion())
          const newLowerArmWorldQ = forearmTwistQ.clone().multiply(lowerArmWorldQ)
          
          const lowerArmParentQ = lowerArm.parent
            ? lowerArm.parent.getWorldQuaternion(new THREE.Quaternion())
            : new THREE.Quaternion()
          const invLowerArmParentQ = lowerArmParentQ.clone().invert()
          const newLowerArmLocalQ = invLowerArmParentQ.multiply(newLowerArmWorldQ)
          
          lowerArm.quaternion.copy(newLowerArmLocalQ)
          lowerArm.updateMatrixWorld(true)
          
          // 7. 手首の回転を計算（トラッカーの回転 + 手首分のツイスト）
          hand.updateWorldMatrix(true, false)
          const handParentQ = hand.parent
            ? hand.parent.getWorldQuaternion(new THREE.Quaternion())
            : new THREE.Quaternion()
          const invHandParentQ = handParentQ.clone().invert()
          
          // 手首分のツイストを追加
          const handTwistQ = new THREE.Quaternion().setFromAxisAngle(forearmAxis, handTwistAngle)
          const handWorldQ = handTwistQ.clone().multiply(handTargetRot)
          
          const handLocalQ = invHandParentQ.multiply(handWorldQ)
          hand.quaternion.copy(handLocalQ)
          hand.updateMatrixWorld(true)
          
          return
        }
      }
      
      // ツイスト計算に失敗した場合は、トラッカーの回転をそのまま適用
      hand.updateWorldMatrix(true, false)
      const handParentQ = hand.parent
        ? hand.parent.getWorldQuaternion(new THREE.Quaternion())
        : new THREE.Quaternion()
      const invHandParentQ = handParentQ.clone().invert()
      const handLocalQ = invHandParentQ.multiply(handTargetRot)
      
      hand.quaternion.copy(handLocalQ)
      hand.updateMatrixWorld(true)
      
    } catch (err) {
      console.warn('[solveVRChatArmIK] Error:', err)
    }
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
        if (trackerIsIndividuallyEnabled('head')) {
          applyTrackerRotationToBone(headBone, 'head', { weight: 0.85 })
        }
        
        // ===== UpperArm位置反映（回転は反映しない） =====
        // UpperArmトラッカーの位置をボーンに反映（ボーンの制約に従って）
        // 肩ボーンの角度を変更してUpperArmボーンの位置を変更する
        if (bones.leftShoulder && bones.leftUpperArm) {
          const leftUpperArmTracker = trackers.value.find(t => t.key === 'leftUpperArm')
          if (leftUpperArmTracker?.mesh && trackerIsIndividuallyEnabled('leftUpperArm')) {
            try {
              // UpperArmボーンの現在位置を取得
              bones.leftUpperArm.updateWorldMatrix(true, false)
              const currentUpperArmPos = bones.leftUpperArm.getWorldPosition(new THREE.Vector3())
              
              // トラッカーの目標位置
              const targetPos = leftUpperArmTracker.mesh.position.clone()
              
              // 肩ボーンから目標位置への方向を計算
              bones.leftShoulder.updateWorldMatrix(true, false)
              const shoulderPos = bones.leftShoulder.getWorldPosition(new THREE.Vector3())
              const direction = targetPos.clone().sub(shoulderPos)
              
              if (direction.lengthSq() > 1e-8) {
                direction.normalize()
                // 肩ボーンをUpperArmトラッカーの位置に向ける
                // これによりUpperArmボーンの位置が変わる
                rotateBoneToward(bones.leftShoulder, direction, 1.0)
                bones.leftShoulder.updateMatrixWorld(true)
                
                // UpperArmボーンの位置を更新
                bones.leftUpperArm.updateMatrixWorld(true)
              }
            } catch (err) {
              console.warn('[VirtualTrackers] Left UpperArm positioning error:', err)
            }
          }
        }
        
        if (bones.rightShoulder && bones.rightUpperArm) {
          const rightUpperArmTracker = trackers.value.find(t => t.key === 'rightUpperArm')
          if (rightUpperArmTracker?.mesh && trackerIsIndividuallyEnabled('rightUpperArm')) {
            try {
              // UpperArmボーンの現在位置を取得
              bones.rightUpperArm.updateWorldMatrix(true, false)
              const currentUpperArmPos = bones.rightUpperArm.getWorldPosition(new THREE.Vector3())
              
              // トラッカーの目標位置
              const targetPos = rightUpperArmTracker.mesh.position.clone()
              
              // 肩ボーンから目標位置への方向を計算
              bones.rightShoulder.updateWorldMatrix(true, false)
              const shoulderPos = bones.rightShoulder.getWorldPosition(new THREE.Vector3())
              const direction = targetPos.clone().sub(shoulderPos)
              
              if (direction.lengthSq() > 1e-8) {
                direction.normalize()
                // 肩ボーンをUpperArmトラッカーの位置に向ける
                // これによりUpperArmボーンの位置が変わる
                rotateBoneToward(bones.rightShoulder, direction, 1.0)
                bones.rightShoulder.updateMatrixWorld(true)
                
                // UpperArmボーンの位置を更新
                bones.rightUpperArm.updateMatrixWorld(true)
              }
            } catch (err) {
              console.warn('[VirtualTrackers] Right UpperArm positioning error:', err)
            }
          }
        }
        
        // ===== VRChat準拠の腕IK =====
        // 手首トラッカーの位置と回転を直接使用
        // 前腕のツイストは自動計算で分配
        
        // 左腕
        solveVRChatArmIK(
          bones.leftShoulder,
          bones.leftUpperArm,
          bones.leftLowerArm,
          bones.leftHand,
          'leftHand',
          'leftElbow'
        )
        
        // 右腕
        solveVRChatArmIK(
          bones.rightShoulder,
          bones.rightUpperArm,
          bones.rightLowerArm,
          bones.rightHand,
          'rightHand',
          'rightElbow'
        )
      }
    } catch (err) {
      console.warn('[VirtualTrackers] Arm IK error:', err)
    }
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
    // Gaze tracking: make eyes look at gaze tracker
    try {
      const gazeTracker = trackers.value.find(t => t.key === 'gaze')
      if (gazeTracker?.mesh && trackerIsIndividuallyEnabled('gaze')) {
        const gazePos = gazeTracker.mesh.position
        
        // まず VRM lookAt を使いターゲット設定 (一部モデルでまぶたコントロールを含むため)
        if (model.vrm.lookAt) {
          model.vrm.lookAt.target = gazePos.clone()
        }
        // 追加で左右の目ボーンを直接ターゲット方向へ微調整（lookAt精度不足補正）
        const bones = ensureBoneMap(model)
        const eyes = [bones.leftEye, bones.rightEye].filter(Boolean)
        eyes.forEach(eye => {
          try {
            const parentQ = eye.parent ? eye.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion()
            const parentQInv = parentQ.clone().invert()
            const eyePos = eye.getWorldPosition(new THREE.Vector3())
            const dir = gazePos.clone().sub(eyePos).normalize()
            // 基準: eye forward を (0,0,1) と仮定し lookAt 行列生成
            const m = new THREE.Matrix4().lookAt(eyePos, gazePos, new THREE.Vector3(0, 1, 0))
            const worldQ = new THREE.Quaternion().setFromRotationMatrix(m)
            const localQ = parentQInv.multiply(worldQ)
            // 過度な揺れを避けるため補間
            eye.quaternion.slerp(localQ, 0.85)
            eye.updateMatrixWorld(true)
          } catch {}
        })
      } else {
        // Gaze trackerが無効な場合、lookAtをリセット
        if (model.vrm.lookAt) {
          model.vrm.lookAt.target = null
        }
      }
    } catch (err) {
      console.warn('[VirtualTrackers] Gaze tracking error:', err)
    }

    vrmRoot.updateMatrixWorld(true, true)
  } // end update()

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
    // 保存された位置を優先するため force: false を使用
    layoutDefaultPositions({ force: false })
    setVisibility(true)
  })

  function init() {
    // Respect current enabled state and existing model on init
    attachEvents()
    const modelPresent = !!getActiveModel()?.vrm
    if (enabled.value && modelPresent) {
      createGizmos()
      // 初期化時は保存された位置を使用
      layoutDefaultPositions({ force: false })
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

  // 回転軸ヘルパーを作成
  function createRotationAxesHelper(length = trackerAxesLengthState || 0.05) {
    let appliedLength = Number(length)
    if (!Number.isFinite(appliedLength) || appliedLength <= 0) {
      appliedLength = trackerAxesLengthState || 0.05
    }
    const group = new THREE.Group()
    group.name = 'vt:rotationAxes'
    group.renderOrder = 998
    group.visible = false
    group.userData.__vtAxes = true

    // X軸（赤）
    const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(appliedLength, 0, 0)
    ])
    const xAxisMaterial = new THREE.LineBasicMaterial({ 
      color: 0xff0000, 
      depthTest: false, 
      depthWrite: false,
      linewidth: 2
    })
    const xAxis = new THREE.Line(xAxisGeometry, xAxisMaterial)
    xAxis.renderOrder = 998
    group.add(xAxis)

    // Y軸（緑）
    const yAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, appliedLength, 0)
    ])
    const yAxisMaterial = new THREE.LineBasicMaterial({ 
      color: 0x00ff00, 
      depthTest: false, 
      depthWrite: false,
      linewidth: 2
    })
    const yAxis = new THREE.Line(yAxisGeometry, yAxisMaterial)
    yAxis.renderOrder = 998
    group.add(yAxis)

    // Z軸（青）
    const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, appliedLength)
    ])
    const zAxisMaterial = new THREE.LineBasicMaterial({ 
      color: 0x0000ff, 
      depthTest: false, 
      depthWrite: false,
      linewidth: 2
    })
    const zAxis = new THREE.Line(zAxisGeometry, zAxisMaterial)
    zAxis.renderOrder = 998
    group.add(zAxis)

    return group
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
      rotationAxis: state?.rotationAxis || DEFAULT_ROTATION_AXIS,
      enabled: state?.enabled !== false
    }
  }

  function getAllTrackerStates() {
    return trackers.value
      .filter(tracker => tracker.key !== CAMERA_TRACKER_KEY)
      .map(tracker => getTrackerSnapshot(tracker.key))
      .filter(Boolean)
  }

  // 回転軸の可視性を設定
  function setRotationAxesVisible(visible) {
    rotationAxesGlobalVisible = !!visible
    trackers.value.forEach(t => {
      if (t?.rotationAxes) {
        t.rotationAxes.visible = visible && t.mesh.visible
      }
    })
  }

  // 回転軸の長さを更新
  function updateRotationAxesLength(length) {
    const len = Number(length)
    if (!Number.isFinite(len) || len <= 0) return
    trackerAxesLengthState = len
    trackers.value.forEach(t => {
      if (!t?.rotationAxes) return
      
      // 既存の軸を削除
      while (t.rotationAxes.children.length > 0) {
        const child = t.rotationAxes.children[0]
        child.geometry?.dispose()
        child.material?.dispose()
        t.rotationAxes.remove(child)
      }

      // 新しい長さで軸を再作成
      // X軸（赤）
      const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(length, 0, 0)
      ])
      const xAxisMaterial = new THREE.LineBasicMaterial({ 
        color: 0xff0000, 
        depthTest: false, 
        depthWrite: false,
        linewidth: 2
      })
      const xAxis = new THREE.Line(xAxisGeometry, xAxisMaterial)
      xAxis.renderOrder = 998
      t.rotationAxes.add(xAxis)

      // Y軸（緑）
      const yAxisGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, length, 0)
      ])
      const yAxisMaterial = new THREE.LineBasicMaterial({ 
        color: 0x00ff00, 
        depthTest: false, 
        depthWrite: false,
        linewidth: 2
      })
      const yAxis = new THREE.Line(yAxisGeometry, yAxisMaterial)
      yAxis.renderOrder = 998
      t.rotationAxes.add(yAxis)

      // Z軸（青）
      const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, length)
      ])
      const zAxisMaterial = new THREE.LineBasicMaterial({ 
        color: 0x0000ff, 
        depthTest: false, 
        depthWrite: false,
        linewidth: 2
      })
      const zAxis = new THREE.Line(zAxisGeometry, zAxisMaterial)
      zAxis.renderOrder = 998
      t.rotationAxes.add(zAxis)
    })
  }

  function setForearmTwistShareRatio(value) {
    const ratio = THREE.MathUtils.clamp(Number(value), 0, 1)
    if (!Number.isFinite(ratio)) return
    forearmTwistShareRatio = ratio
  }

  function resetAllTrackerPositions({ persist = true } = {}) {
    // すべてのトラッカーを初期位置に戻す（初期ポーズは再キャプチャしない）
    for (const def of TRACKER_DEFS) {
      resetTrackerPosition(def.key, { persist: false })
    }
    if (persist) {
      persistTrackerTransforms()
      notifyTrackerTransform('all', { type: 'resetAllPositions', persisted: true })
    }
  }

  return {
    enabled,
    displayVisible,
    trackerStates,
    trackers,
    lastActiveTrackerKey: lastActiveKey,
    selectedTrackerKey,
    init,
    cleanup,
    setEnabled,
    setDisplayVisible,
    setTrackerEnabled,
    setTrackerRotationDegrees,
    setTrackerRotationOrder,
    setTrackerAxisScale,
    setTrackerPosition,
    syncTrackerStateFromMesh,
    resetTrackerPosition,
    resetTrackerRotation,
    resetAllTrackerPositions,
    resetAllTrackerRotations,
    reset,
    update,
    getCameraState,
    saveCameraState,
    saveCameraStateFromObject,
  getTrackerSnapshot,
  getAllTrackerStates,
  setTrackerRotationAxis,
  setRotationAxesVisible,
  updateRotationAxesLength,
  setForearmTwistShareRatio,
  rotationOrders: TRACKER_ROTATION_ORDERS,
  persistTrackerTransforms,
    // Force rebuild API for resilience
    rebuild: () => { createGizmos(); layoutDefaultPositions({ force: true }); setVisibility(enabled.value) }
  }
}
